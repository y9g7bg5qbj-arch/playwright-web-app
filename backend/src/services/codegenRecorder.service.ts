import { spawn, ChildProcess } from 'child_process';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { EventEmitter } from 'events';
import {
    PageObjectRegistry,
    initPageObjectRegistry,
    ElementInfo
} from './pageObjectRegistry';
import { recordingPersistenceService, CreateStepDTO } from './recordingPersistence.service';
import { generateResilientSelector, CapturedElement } from './selectorHealing';

interface CodegenSession {
    sessionId: string;
    dbSessionId?: string;
    codegenProcess: ChildProcess;
    outputFile: string;
    lastCode: string;
    lastLineCount: number;
    url: string;
    registry: PageObjectRegistry;
    scenarioName?: string;
    stepCount: number;
}

interface ParsedAction {
    type: 'click' | 'fill' | 'check' | 'select' | 'goto' | 'press' | 'hover' | 'expect' | 'unknown';
    selector?: string;
    value?: string;
    originalLine: string;
}

interface DuplicateWarning {
    newSelector: string;
    existingField: string;
    similarity: number;
    matchType: string;
    recommendation: 'reuse' | 'create' | 'review';
    reason: string;
}

export class CodegenRecorderService extends EventEmitter {
    private sessions: Map<string, CodegenSession> = new Map();
    private projectPath: string;

    constructor(projectPath: string = process.cwd()) {
        super();
        this.projectPath = projectPath;
    }

    /**
     * Start Playwright codegen for recording
     */
    async startRecording(
        url: string,
        sessionId: string,
        onAction: (
            veroCode: string,
            pagePath?: string,
            pageCode?: string,
            fieldCreated?: { pageName: string; fieldName: string },
            duplicateWarning?: DuplicateWarning
        ) => void,
        onError: (error: string) => void,
        onComplete?: () => void,
        scenarioName?: string,
        userId?: string,
        testFlowId?: string
    ): Promise<void> {
        try {
            // Initialize page object registry
            const registry = initPageObjectRegistry(this.projectPath);
            await registry.loadFromDisk();

            // Create database session for persistence
            let dbSessionId: string | undefined;
            if (userId) {
                try {
                    const dbSession = await recordingPersistenceService.createSession({
                        userId,
                        testFlowId,
                        startUrl: url,
                        scenarioName,
                        pageName: registry.suggestPageName(url),
                    });
                    dbSessionId = dbSession.id;
                    console.log(`[CodegenRecorder] Created DB session: ${dbSessionId}`);
                } catch (dbError) {
                    console.warn('[CodegenRecorder] Failed to create DB session, continuing without persistence:', dbError);
                }
            }

            // Create temp file for codegen output
            const tempDir = join(tmpdir(), 'vero-codegen');
            await mkdir(tempDir, { recursive: true });
            const outputFile = join(tempDir, `${sessionId}.js`);

            // Initialize empty file
            await writeFile(outputFile, '');

            console.log(`[CodegenRecorder] Starting codegen for session ${sessionId}`);
            console.log(`[CodegenRecorder] URL: ${url}`);
            console.log(`[CodegenRecorder] Output file: ${outputFile}`);

            // Launch Playwright codegen
            const codegenProcess = spawn('npx', [
                'playwright',
                'codegen',
                '--target', 'javascript',
                '--output', outputFile,
                url
            ], {
                shell: true,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env, PWDEBUG: '0' }
            });

            codegenProcess.stdout?.on('data', (data) => {
                console.log(`[CodegenRecorder] stdout: ${data.toString().trim()}`);
            });

            codegenProcess.stderr?.on('data', (data) => {
                const msg = data.toString().trim();
                if (msg && !msg.includes('DevTools listening')) {
                    console.log(`[CodegenRecorder] stderr: ${msg}`);
                }
            });

            codegenProcess.on('error', (error) => {
                console.error(`[CodegenRecorder] Process error:`, error);
                onError(`Codegen error: ${error.message}`);
            });

            codegenProcess.on('exit', async (code) => {
                console.log(`[CodegenRecorder] Process exited with code ${code}`);

                // Read the final output file before cleaning up
                try {
                    const finalCode = await readFile(outputFile, 'utf-8');
                    console.log(`[CodegenRecorder] Final code length: ${finalCode.length}`);

                    if (finalCode && finalCode.trim()) {
                        // Process any remaining actions
                        const currentSession = this.sessions.get(sessionId);
                        if (currentSession) {
                            console.log(`[CodegenRecorder] Processing final code on exit...`);
                            await this.processCodeChanges(currentSession, finalCode, onAction);
                        }
                    }
                } catch (e) {
                    console.error(`[CodegenRecorder] Error reading final output:`, e);
                }

                this.sessions.delete(sessionId);

                // Emit completion event
                this.emit('recording:complete', { sessionId });

                // Call onComplete callback
                if (onComplete) {
                    console.log(`[CodegenRecorder] Calling onComplete callback`);
                    onComplete();
                }
            });

            // Store session
            const session: CodegenSession = {
                sessionId,
                dbSessionId,
                codegenProcess,
                outputFile,
                lastCode: '',
                lastLineCount: 0,
                url,
                registry,
                scenarioName,
                stepCount: 0
            };
            this.sessions.set(sessionId, session);

            // Note: Playwright codegen opens its own inspector window showing TypeScript
            // We can't hide it, but that's OK - the Vero code appears in the IDE

            // Watch the output file for changes
            // Use polling because file watching can be unreliable
            let pollCount = 0;
            const pollInterval = setInterval(async () => {
                if (!this.sessions.has(sessionId)) {
                    console.log(`[CodegenRecorder] Session ${sessionId} ended, stopping poll`);
                    clearInterval(pollInterval);
                    return;
                }

                pollCount++;
                try {
                    const currentCode = await readFile(outputFile, 'utf-8');
                    const currentSession = this.sessions.get(sessionId);

                    if (currentSession && currentCode !== currentSession.lastCode) {
                        console.log(`[CodegenRecorder] Code changed! Length: ${currentCode.length}, Poll #${pollCount}`);
                        console.log(`[CodegenRecorder] New code preview: ${currentCode.substring(0, 200)}...`);
                        // Code changed - process new actions
                        await this.processCodeChanges(
                            currentSession,
                            currentCode,
                            onAction
                        );
                        currentSession.lastCode = currentCode;
                    }
                } catch (e: any) {
                    // File might not exist yet - log occasionally
                    if (pollCount % 20 === 1) {
                        console.log(`[CodegenRecorder] Poll #${pollCount}: File not ready yet (${e.code || e.message})`);
                    }
                }
            }, 500); // Poll every 500ms

            // Store interval for cleanup
            (session as any)._pollInterval = pollInterval;

            console.log(`[CodegenRecorder] Recording started for session ${sessionId}`);

        } catch (error: any) {
            console.error('[CodegenRecorder] Error starting recording:', error);
            onError(error.message);
        }
    }

    /**
     * Process code changes and emit new actions
     */
    private async processCodeChanges(
        session: CodegenSession,
        newCode: string,
        onAction: (
            veroCode: string,
            pagePath?: string,
            pageCode?: string,
            fieldCreated?: { pageName: string; fieldName: string },
            duplicateWarning?: DuplicateWarning
        ) => void
    ): Promise<void> {
        // Parse all actions from new code
        const actions = this.parsePlaywrightCode(newCode);
        console.log(`[CodegenRecorder] Parsed ${actions.length} total actions from code`);

        // Find new actions (compare line counts)
        const newActions = actions.slice(session.lastLineCount);
        session.lastLineCount = actions.length;

        console.log(`[CodegenRecorder] Processing ${newActions.length} new actions (lastLineCount was ${session.lastLineCount - newActions.length})`);

        // Convert each new action to Vero DSL
        for (const action of newActions) {
            const result = await this.convertToVero(action, session);
            if (result) {
                console.log(`[CodegenRecorder] Emitting: ${result.veroCode}`);

                // Log duplicate warning if present
                if (result.duplicateWarning) {
                    console.log(`[CodegenRecorder] Duplicate warning: ${result.duplicateWarning.reason}`);
                    // Emit duplicate detection event
                    this.emit('duplicate-detected', {
                        sessionId: session.sessionId,
                        warning: result.duplicateWarning
                    });
                }

                // Persist step to database if session is tracked
                if (session.dbSessionId) {
                    try {
                        // Generate resilient selector with fallbacks
                        const capturedElement = this.selectorToCapturedElement(action.selector || '');
                        const resilientSelector = generateResilientSelector(capturedElement);

                        const stepData: CreateStepDTO = {
                            sessionId: session.dbSessionId,
                            stepNumber: session.stepCount,
                            actionType: action.type,
                            veroCode: result.veroCode,
                            primarySelector: resilientSelector.primary.selector,
                            selectorType: resilientSelector.primary.strategy,
                            fallbackSelectors: resilientSelector.fallbacks.map(f => f.selector),
                            confidence: resilientSelector.overallConfidence,
                            isStable: resilientSelector.isReliable,
                            value: action.value,
                            url: session.url,
                            pageName: result.fieldCreated?.pageName,
                            fieldName: result.fieldCreated?.fieldName,
                            elementTag: capturedElement.tagName,
                            elementText: capturedElement.innerText,
                        };
                        await recordingPersistenceService.addStep(stepData);
                        console.log(`[CodegenRecorder] Persisted step ${session.stepCount} with ${resilientSelector.fallbacks.length} fallbacks`);
                    } catch (dbError) {
                        console.warn('[CodegenRecorder] Failed to persist step:', dbError);
                    }
                }

                session.stepCount++;

                onAction(
                    result.veroCode,
                    result.pagePath,
                    result.pageCode,
                    result.fieldCreated,
                    result.duplicateWarning
                );
            }
        }
    }

    /**
     * Convert a Vero selector string to a CapturedElement for resilient selector generation
     */
    private selectorToCapturedElement(selector: string): CapturedElement {
        const element: CapturedElement = {
            tagName: 'div', // Default tag
        };

        // testId "login-btn"
        let match = selector.match(/testId "(.+?)"/);
        if (match) {
            element.testId = match[1];
            return element;
        }

        // button "Submit" or role "button"
        match = selector.match(/^(\w+) "(.+?)"/);
        if (match) {
            element.role = match[1];
            element.innerText = match[2];
            // Infer tag from role
            if (match[1] === 'button') element.tagName = 'button';
            else if (match[1] === 'link') element.tagName = 'a';
            else if (match[1] === 'textbox') element.tagName = 'input';
            return element;
        }

        // label "Email"
        match = selector.match(/label "(.+?)"/);
        if (match) {
            element.ariaLabel = match[1];
            element.tagName = 'input';
            return element;
        }

        // placeholder "Enter email"
        match = selector.match(/placeholder "(.+?)"/);
        if (match) {
            element.placeholder = match[1];
            element.tagName = 'input';
            return element;
        }

        // text "Click me"
        match = selector.match(/text "(.+?)"/);
        if (match) {
            element.innerText = match[1];
            return element;
        }

        // alt "Logo"
        match = selector.match(/alt "(.+?)"/);
        if (match) {
            element.alt = match[1];
            element.tagName = 'img';
            return element;
        }

        // title "Tooltip"
        match = selector.match(/title "(.+?)"/);
        if (match) {
            element.title = match[1];
            return element;
        }

        // #id
        match = selector.match(/^#([\w-]+)/);
        if (match) {
            element.id = match[1];
            return element;
        }

        // .class
        match = selector.match(/^\.([\w-]+)/);
        if (match) {
            element.className = match[1];
            return element;
        }

        // CSS selector with tag: input[type="text"]
        match = selector.match(/^(\w+)/);
        if (match) {
            element.tagName = match[1];
        }

        // Extract type from selector
        match = selector.match(/\[type="(\w+)"\]/);
        if (match) {
            element.type = match[1];
        }

        // Extract name from selector
        match = selector.match(/\[name="(\w+)"\]/);
        if (match) {
            element.name = match[1];
        }

        return element;
    }

    /**
     * Parse Playwright code to extract actions
     */
    private parsePlaywrightCode(code: string): ParsedAction[] {
        const actions: ParsedAction[] = [];
        const lines = code.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('await')) continue;

            let action: ParsedAction | null = null;

            // page.goto('url')
            const gotoMatch = trimmed.match(/await page\.goto\(['"](.+?)['"]\)/);
            if (gotoMatch) {
                action = {
                    type: 'goto',
                    value: gotoMatch[1],
                    originalLine: trimmed
                };
            }

            // click with various locators
            const clickMatch = trimmed.match(/await page\.(getBy\w+|locator)\((.+?)\)\.click\(\)/);
            if (clickMatch) {
                action = {
                    type: 'click',
                    selector: this.extractSelector(clickMatch[1], clickMatch[2]),
                    originalLine: trimmed
                };
            }

            // fill with various locators
            const fillMatch = trimmed.match(/await page\.(getBy\w+|locator)\((.+?)\)\.fill\(['"](.+?)['"]\)/);
            if (fillMatch) {
                action = {
                    type: 'fill',
                    selector: this.extractSelector(fillMatch[1], fillMatch[2]),
                    value: fillMatch[3],
                    originalLine: trimmed
                };
            }

            // press key
            const pressMatch = trimmed.match(/await page\.(getBy\w+|locator)\((.+?)\)\.press\(['"](.+?)['"]\)/);
            if (pressMatch) {
                action = {
                    type: 'press',
                    selector: this.extractSelector(pressMatch[1], pressMatch[2]),
                    value: pressMatch[3],
                    originalLine: trimmed
                };
            }

            // keyboard press
            const keyboardMatch = trimmed.match(/await page\.keyboard\.press\(['"](.+?)['"]\)/);
            if (keyboardMatch) {
                action = {
                    type: 'press',
                    value: keyboardMatch[1],
                    originalLine: trimmed
                };
            }

            // check
            const checkMatch = trimmed.match(/await page\.(getBy\w+|locator)\((.+?)\)\.check\(\)/);
            if (checkMatch) {
                action = {
                    type: 'check',
                    selector: this.extractSelector(checkMatch[1], checkMatch[2]),
                    originalLine: trimmed
                };
            }

            // selectOption
            const selectMatch = trimmed.match(/await page\.(getBy\w+|locator)\((.+?)\)\.selectOption\(['"](.+?)['"]\)/);
            if (selectMatch) {
                action = {
                    type: 'select',
                    selector: this.extractSelector(selectMatch[1], selectMatch[2]),
                    value: selectMatch[3],
                    originalLine: trimmed
                };
            }

            // hover
            const hoverMatch = trimmed.match(/await page\.(getBy\w+|locator)\((.+?)\)\.hover\(\)/);
            if (hoverMatch) {
                action = {
                    type: 'hover',
                    selector: this.extractSelector(hoverMatch[1], hoverMatch[2]),
                    originalLine: trimmed
                };
            }

            // expect visible
            const expectVisibleMatch = trimmed.match(/await expect\(page\.(getBy\w+|locator)\((.+?)\)\)\.toBeVisible\(\)/);
            if (expectVisibleMatch) {
                action = {
                    type: 'expect',
                    selector: this.extractSelector(expectVisibleMatch[1], expectVisibleMatch[2]),
                    value: 'visible',
                    originalLine: trimmed
                };
            }

            // expect text
            const expectTextMatch = trimmed.match(/await expect\(page\.(getBy\w+|locator)\((.+?)\)\)\.toHaveText\(['"](.+?)['"]\)/);
            if (expectTextMatch) {
                action = {
                    type: 'expect',
                    selector: this.extractSelector(expectTextMatch[1], expectTextMatch[2]),
                    value: expectTextMatch[3],
                    originalLine: trimmed
                };
            }

            if (action) {
                actions.push(action);
            }
        }

        return actions;
    }

    /**
     * Extract selector from Playwright locator
     */
    private extractSelector(method: string, args: string): string {
        // Remove outer quotes
        args = args.trim();

        if (method === 'getByRole') {
            // getByRole('button', { name: 'Submit' })
            const roleMatch = args.match(/['"](\w+)['"](?:,\s*\{\s*name:\s*['"](.+?)['"]\s*\})?/);
            if (roleMatch) {
                return roleMatch[2]
                    ? `${roleMatch[1]} "${roleMatch[2]}"`
                    : `role "${roleMatch[1]}"`;
            }
        }

        if (method === 'getByTestId') {
            const match = args.match(/['"](.+?)['"]/);
            return match ? `testId "${match[1]}"` : args;
        }

        if (method === 'getByLabel') {
            const match = args.match(/['"](.+?)['"]/);
            return match ? `label "${match[1]}"` : args;
        }

        if (method === 'getByPlaceholder') {
            const match = args.match(/['"](.+?)['"]/);
            return match ? `placeholder "${match[1]}"` : args;
        }

        if (method === 'getByText') {
            const match = args.match(/['"](.+?)['"]/);
            return match ? `text "${match[1]}"` : args;
        }

        if (method === 'getByAltText') {
            const match = args.match(/['"](.+?)['"]/);
            return match ? `alt "${match[1]}"` : args;
        }

        if (method === 'getByTitle') {
            const match = args.match(/['"](.+?)['"]/);
            return match ? `title "${match[1]}"` : args;
        }

        if (method === 'locator') {
            const match = args.match(/['"](.+?)['"]/);
            return match ? match[1] : args;
        }

        return args;
    }

    /**
     * Convert parsed action to Vero DSL with page object awareness
     */
    private async convertToVero(
        action: ParsedAction,
        session: CodegenSession
    ): Promise<{
        veroCode: string;
        pagePath?: string;
        pageCode?: string;
        fieldCreated?: { pageName: string; fieldName: string };
        duplicateWarning?: DuplicateWarning;
    } | null> {
        const registry = session.registry;

        // Handle goto
        if (action.type === 'goto') {
            return { veroCode: `open "${action.value}"` };
        }

        // Handle keyboard press without selector
        if (action.type === 'press' && !action.selector) {
            return { veroCode: `press "${action.value}"` };
        }

        // For actions with selectors, check page object registry
        if (action.selector) {
            // Check if selector exists in registry
            let fieldRef = registry.findBySelector(action.selector);

            let pagePath: string | undefined;
            let pageCode: string | undefined;
            let fieldCreated: { pageName: string; fieldName: string } | undefined;
            let duplicateWarning: DuplicateWarning | undefined;

            if (!fieldRef) {
                // Get target page name
                const pageName = registry.suggestPageName(session.url);

                // Convert selector to ElementInfo for duplicate detection
                const elementInfo = this.selectorToElementInfo(action.selector);

                // Check for duplicates using fuzzy matching
                const duplicateCheck = registry.checkForDuplicate(elementInfo, action.selector, pageName);

                if (duplicateCheck.isDuplicate && duplicateCheck.existingRef) {
                    // Reuse existing field instead of creating duplicate
                    fieldRef = duplicateCheck.existingRef;

                    duplicateWarning = {
                        newSelector: action.selector,
                        existingField: `${duplicateCheck.existingRef.pageName}.${duplicateCheck.existingRef.fieldName}`,
                        similarity: duplicateCheck.similarity,
                        matchType: duplicateCheck.matchType,
                        recommendation: duplicateCheck.recommendation,
                        reason: duplicateCheck.reason || 'Duplicate detected'
                    };

                    console.log(`[CodegenRecorder] Duplicate detected: reusing ${fieldRef.pageName}.${fieldRef.fieldName} (${Math.round(duplicateCheck.similarity * 100)}% match)`);
                } else if (duplicateCheck.recommendation === 'review' && duplicateCheck.existingRef) {
                    // Create new field but emit warning for review
                    const fieldName = this.generateFieldName(action);
                    registry.getOrCreatePage(session.url);
                    fieldRef = registry.addField(pageName, fieldName, action.selector);
                    pagePath = await registry.persist(pageName);
                    pageCode = registry.getPageContent(pageName) || undefined;

                    fieldCreated = {
                        pageName: fieldRef.pageName,
                        fieldName: fieldRef.fieldName
                    };

                    duplicateWarning = {
                        newSelector: action.selector,
                        existingField: `${duplicateCheck.existingRef.pageName}.${duplicateCheck.existingRef.fieldName}`,
                        similarity: duplicateCheck.similarity,
                        matchType: duplicateCheck.matchType,
                        recommendation: duplicateCheck.recommendation,
                        reason: duplicateCheck.reason || 'Similar field exists - please review'
                    };

                    console.log(`[CodegenRecorder] Created field with warning: ${fieldRef.pageName}.${fieldRef.fieldName} (similar to ${duplicateCheck.existingRef.pageName}.${duplicateCheck.existingRef.fieldName})`);
                } else {
                    // No duplicate - create new page object field
                    const fieldName = this.generateFieldName(action);

                    // Get or create the page
                    registry.getOrCreatePage(session.url);

                    // Add the field
                    fieldRef = registry.addField(pageName, fieldName, action.selector);

                    // Persist to disk
                    pagePath = await registry.persist(pageName);
                    pageCode = registry.getPageContent(pageName) || undefined;

                    fieldCreated = {
                        pageName: fieldRef.pageName,
                        fieldName: fieldRef.fieldName
                    };

                    console.log(`[CodegenRecorder] Created field ${fieldRef.pageName}.${fieldRef.fieldName} = ${action.selector}`);
                }
            }

            // Build Vero action with page object reference
            const ref = `${fieldRef.pageName}.${fieldRef.fieldName}`;
            let veroCode: string;

            switch (action.type) {
                case 'click':
                    veroCode = `click ${ref}`;
                    break;
                case 'fill':
                    veroCode = `fill ${ref} with "${action.value || ''}"`;
                    break;
                case 'check':
                    veroCode = `check ${ref}`;
                    break;
                case 'select':
                    veroCode = `select "${action.value || ''}" from ${ref}`;
                    break;
                case 'hover':
                    veroCode = `hover ${ref}`;
                    break;
                case 'press':
                    veroCode = `press "${action.value}" on ${ref}`;
                    break;
                case 'expect':
                    if (action.value === 'visible') {
                        veroCode = `verify ${ref} is visible`;
                    } else {
                        veroCode = `verify ${ref} has text "${action.value}"`;
                    }
                    break;
                default:
                    veroCode = `# ${action.originalLine}`;
            }

            return { veroCode, pagePath, pageCode, fieldCreated, duplicateWarning };
        }

        return null;
    }

    /**
     * Convert a Vero selector to ElementInfo for duplicate detection
     */
    private selectorToElementInfo(selector: string): ElementInfo {
        const element: ElementInfo = {
            tagName: 'div', // Default tag
        };

        // testId "login-btn"
        let match = selector.match(/testId "(.+?)"/);
        if (match) {
            element.testId = match[1];
            return element;
        }

        // button "Submit" or link "Click here"
        match = selector.match(/^(\w+) "(.+?)"/);
        if (match) {
            element.role = match[1];
            element.ariaLabel = match[2];
            element.text = match[2];
            if (match[1] === 'button') element.tagName = 'button';
            else if (match[1] === 'link') element.tagName = 'a';
            else if (match[1] === 'textbox') element.tagName = 'input';
            return element;
        }

        // label "Email"
        match = selector.match(/label "(.+?)"/);
        if (match) {
            element.ariaLabel = match[1];
            element.tagName = 'input';
            return element;
        }

        // placeholder "Enter email"
        match = selector.match(/placeholder "(.+?)"/);
        if (match) {
            element.placeholder = match[1];
            element.tagName = 'input';
            return element;
        }

        // text "Click me"
        match = selector.match(/text "(.+?)"/);
        if (match) {
            element.text = match[1];
            return element;
        }

        // #id
        match = selector.match(/^#([\w-]+)/);
        if (match) {
            element.id = match[1];
            return element;
        }

        // .class
        match = selector.match(/^\.([\w-]+)/);
        if (match) {
            element.className = match[1];
            return element;
        }

        return element;
    }

    /**
     * Generate a field name from action
     */
    private generateFieldName(action: ParsedAction): string {
        const selector = action.selector || '';

        // Extract meaningful name from selector
        let baseName = '';

        // testId "login-btn" -> loginBtn
        const testIdMatch = selector.match(/testId "(.+?)"/);
        if (testIdMatch) {
            baseName = testIdMatch[1];
        }

        // button "Submit" -> submitButton
        const roleMatch = selector.match(/(\w+) "(.+?)"/);
        if (roleMatch && !baseName) {
            baseName = `${roleMatch[2]}${roleMatch[1].charAt(0).toUpperCase() + roleMatch[1].slice(1)}`;
        }

        // label "Email" -> emailField
        const labelMatch = selector.match(/label "(.+?)"/);
        if (labelMatch && !baseName) {
            baseName = `${labelMatch[1]}Field`;
        }

        // placeholder "Enter email" -> enterEmailInput
        const placeholderMatch = selector.match(/placeholder "(.+?)"/);
        if (placeholderMatch && !baseName) {
            baseName = `${placeholderMatch[1]}Input`;
        }

        // text "Click me" -> clickMeText
        const textMatch = selector.match(/text "(.+?)"/);
        if (textMatch && !baseName) {
            baseName = `${textMatch[1]}Text`;
        }

        // CSS selector #id or .class
        const idMatch = selector.match(/#([\w-]+)/);
        if (idMatch && !baseName) {
            baseName = idMatch[1];
        }

        if (!baseName) {
            baseName = `${action.type}Element`;
        }

        // Convert to camelCase
        return baseName
            .replace(/[^a-zA-Z0-9]/g, ' ')
            .trim()
            .split(/\s+/)
            .map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
    }

    /**
     * Stop recording and clean up
     */
    async stopRecording(sessionId: string): Promise<string> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return '';
        }

        // Clear poll interval
        const pollInterval = (session as any)._pollInterval;
        if (pollInterval) {
            clearInterval(pollInterval);
        }

        // Kill codegen process
        if (!session.codegenProcess.killed) {
            session.codegenProcess.kill('SIGTERM');
        }

        // Wait for process to exit
        await new Promise(r => setTimeout(r, 500));

        // Read final code
        let finalCode = '';
        try {
            finalCode = await readFile(session.outputFile, 'utf-8');
        } catch (e) {
            // No code generated
        }

        // Complete the database session
        if (session.dbSessionId) {
            try {
                // Generate final Vero code from all persisted steps
                const veroCode = await recordingPersistenceService.generateVeroFromSteps(session.dbSessionId);
                await recordingPersistenceService.completeSession(session.dbSessionId, veroCode);
                console.log(`[CodegenRecorder] Completed DB session: ${session.dbSessionId}`);
            } catch (dbError) {
                console.warn('[CodegenRecorder] Failed to complete DB session:', dbError);
                // Try to mark as failed
                try {
                    await recordingPersistenceService.failSession(session.dbSessionId, 'Recording stopped unexpectedly');
                } catch (e) {
                    // Ignore
                }
            }
        }

        // Clean up
        this.sessions.delete(sessionId);

        return finalCode;
    }

    /**
     * Get the database session ID for a recording session
     */
    getDbSessionId(sessionId: string): string | undefined {
        return this.sessions.get(sessionId)?.dbSessionId;
    }

    /**
     * Recover a recording session from the database
     */
    async recoverSession(dbSessionId: string): Promise<{
        veroCode: string;
        steps: any[];
        status: string;
    } | null> {
        try {
            const session = await recordingPersistenceService.getSessionWithSteps(dbSessionId);
            if (!session) return null;

            const veroCode = await recordingPersistenceService.generateVeroFromSteps(dbSessionId);
            return {
                veroCode,
                steps: session.steps,
                status: session.status
            };
        } catch (e) {
            console.error('[CodegenRecorder] Failed to recover session:', e);
            return null;
        }
    }

    /**
     * Check if session exists
     */
    hasSession(sessionId: string): boolean {
        return this.sessions.has(sessionId);
    }
}

export const codegenRecorderService = new CodegenRecorderService(
    process.env.VERO_PROJECT_PATH || join(process.cwd(), '..', 'vero-lang', 'test-project')
);
