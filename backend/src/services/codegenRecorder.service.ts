/**
 * Codegen Recorder Service
 *
 * Uses Playwright's codegen tool for recording with real-time Vero DSL conversion.
 *
 * Features:
 * - Launches Playwright codegen for perfect action recording
 * - Watches output file for real-time code changes
 * - Converts Playwright code to Vero DSL
 * - Integrates with page object registry for codebase awareness
 * - Auto-creates page object fields for new selectors
 */

import { spawn, ChildProcess } from 'child_process';
import { FSWatcher } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { EventEmitter } from 'events';
import {
    PageObjectRegistry,
    initPageObjectRegistry
} from './pageObjectRegistry';

interface CodegenSession {
    sessionId: string;
    codegenProcess: ChildProcess;
    outputFile: string;
    fileWatcher?: FSWatcher;
    lastCode: string;
    lastLineCount: number;
    url: string;
    registry: PageObjectRegistry;
    scenarioName?: string;
}

interface ParsedAction {
    type: 'click' | 'fill' | 'check' | 'select' | 'goto' | 'press' | 'hover' | 'expect' | 'unknown';
    selector?: string;
    value?: string;
    originalLine: string;
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
        onAction: (veroCode: string, pagePath?: string, pageCode?: string, fieldCreated?: { pageName: string; fieldName: string }) => void,
        onError: (error: string) => void,
        scenarioName?: string
    ): Promise<void> {
        try {
            // Initialize page object registry
            const registry = initPageObjectRegistry(this.projectPath);
            await registry.loadFromDisk();

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

            codegenProcess.on('exit', (code) => {
                console.log(`[CodegenRecorder] Process exited with code ${code}`);
                this.sessions.delete(sessionId);
                if (code !== 0 && code !== null) {
                    onError('Recording ended');
                }
            });

            // Store session
            const session: CodegenSession = {
                sessionId,
                codegenProcess,
                outputFile,
                lastCode: '',
                lastLineCount: 0,
                url,
                registry,
                scenarioName
            };
            this.sessions.set(sessionId, session);

            // Note: Playwright codegen opens its own inspector window showing TypeScript
            // We can't hide it, but that's OK - the Vero code appears in the IDE

            // Watch the output file for changes
            // Use polling because file watching can be unreliable
            const pollInterval = setInterval(async () => {
                if (!this.sessions.has(sessionId)) {
                    clearInterval(pollInterval);
                    return;
                }

                try {
                    const currentCode = await readFile(outputFile, 'utf-8');
                    const currentSession = this.sessions.get(sessionId);

                    if (currentSession && currentCode !== currentSession.lastCode) {
                        // Code changed - process new actions
                        await this.processCodeChanges(
                            currentSession,
                            currentCode,
                            onAction
                        );
                        currentSession.lastCode = currentCode;
                    }
                } catch (e) {
                    // File might not exist yet, ignore
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
        onAction: (veroCode: string, pagePath?: string, pageCode?: string, fieldCreated?: { pageName: string; fieldName: string }) => void
    ): Promise<void> {
        // Parse all actions from new code
        const actions = this.parsePlaywrightCode(newCode);

        // Find new actions (compare line counts)
        const newActions = actions.slice(session.lastLineCount);
        session.lastLineCount = actions.length;

        console.log(`[CodegenRecorder] Processing ${newActions.length} new actions`);

        // Convert each new action to Vero DSL
        for (const action of newActions) {
            const result = await this.convertToVero(action, session);
            if (result) {
                console.log(`[CodegenRecorder] Emitting: ${result.veroCode}`);
                onAction(
                    result.veroCode,
                    result.pagePath,
                    result.pageCode,
                    result.fieldCreated
                );
            }
        }
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

            if (!fieldRef) {
                // Create new page object field
                const pageName = registry.suggestPageName(session.url);
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

            return { veroCode, pagePath, pageCode, fieldCreated };
        }

        return null;
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

        // Stop file watcher
        session.fileWatcher?.close();

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

        // Clean up
        this.sessions.delete(sessionId);

        return finalCode;
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
