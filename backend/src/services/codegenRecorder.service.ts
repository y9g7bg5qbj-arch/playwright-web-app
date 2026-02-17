import { spawn, ChildProcess } from 'child_process';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { EventEmitter } from 'events';
import { PageObjectRegistry } from './pageObjectRegistry';
import { recordingPersistenceService, CreateStepDTO } from './recordingPersistence.service';
import { generateVeroAction, generateVeroAssertion } from './veroSyntaxReference';
import { logger } from '../utils/logger';
import { ParsedAction, splitMethodChain, extractQuotedValue, chainToModifier, parseChainedSelector, parseLocatorAndAction, parseExpect, parsePlaywrightCode, extractSelector, generateFieldName } from './codegenRecorder.parser';

// Re-export types and parser functions so existing consumers and tests continue to work
export type { ParsedAction };
export {
    splitMethodChain,
    extractQuotedValue,
    chainToModifier,
    parseChainedSelector,
    parseLocatorAndAction,
    parseExpect,
    parsePlaywrightCode,
    extractSelector,
    generateFieldName,
};

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

export class CodegenRecorderService extends EventEmitter {
    private sessions: Map<string, CodegenSession> = new Map();
    private projectPath: string;

    constructor(projectPath: string = process.cwd()) {
        super();
        this.projectPath = projectPath;
    }

    // Expose parser functions as instance methods so tests using bracket notation
    // (e.g. service.splitMethodChain(...)) continue to work unchanged.
    splitMethodChain = splitMethodChain;
    extractQuotedValue = extractQuotedValue;
    chainToModifier = chainToModifier;
    parseChainedSelector = parseChainedSelector;
    parseLocatorAndAction = parseLocatorAndAction;
    parseExpect = parseExpect;
    parsePlaywrightCode = parsePlaywrightCode;
    extractSelector = extractSelector;
    generateFieldName = generateFieldName;

    private parseSelectorType(selector?: string): string {
        if (!selector) return '';
        const trimmed = selector.trim();
        const tokenMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_-]*)/);
        const token = tokenMatch ? tokenMatch[1].toLowerCase() : '';
        if (token === 'testid' || token === 'role' || token === 'label' || token === 'placeholder' ||
            token === 'text' || token === 'alt' || token === 'title' || token === 'css' || token === 'xpath') {
            return token;
        }
        if (trimmed.startsWith('#') || trimmed.startsWith('.') || trimmed.startsWith('[')) {
            return 'css';
        }
        return token;
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
            fieldCreated?: { pageName: string; fieldName: string }
        ) => void,
        onError: (error: string) => void,
        onComplete?: () => void,
        scenarioName?: string,
        userId?: string,
        testFlowId?: string,
        projectPath?: string
    ): Promise<void> {
        try {
            // Initialize page object registry (per-session path overrides default)
            const effectivePath = projectPath || this.projectPath;
            const registry = new PageObjectRegistry(effectivePath);
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
                    logger.info(`[CodegenRecorder] Created DB session: ${dbSessionId}`);
                } catch (dbError) {
                    logger.warn('[CodegenRecorder] Failed to create DB session, continuing without persistence:', dbError);
                }
            }

            // Create temp file for codegen output
            const tempDir = join(tmpdir(), 'vero-codegen');
            await mkdir(tempDir, { recursive: true });
            const outputFile = join(tempDir, `${sessionId}.js`);

            // Initialize empty file
            await writeFile(outputFile, '');

            logger.info(`[CodegenRecorder] Starting codegen for session ${sessionId}, URL: ${url}`);

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
                logger.debug(`[CodegenRecorder] stdout: ${data.toString().trim()}`);
            });

            codegenProcess.stderr?.on('data', (data) => {
                const msg = data.toString().trim();
                if (msg && !msg.includes('DevTools listening')) {
                    logger.debug(`[CodegenRecorder] stderr: ${msg}`);
                }
            });

            codegenProcess.on('error', (error) => {
                logger.error(`[CodegenRecorder] Process error:`, error);
                onError(`Codegen error: ${error.message}`);
            });

            codegenProcess.on('exit', async (code) => {
                logger.info(`[CodegenRecorder] Process exited with code ${code}`);

                // Read the final output file before cleaning up
                try {
                    const finalCode = await readFile(outputFile, 'utf-8');
                    logger.debug(`[CodegenRecorder] Final code length: ${finalCode.length}`);

                    if (finalCode && finalCode.trim()) {
                        // Process any remaining actions
                        const currentSession = this.sessions.get(sessionId);
                        if (currentSession) {
                            logger.debug(`[CodegenRecorder] Processing final code on exit...`);
                            await this.processCodeChanges(currentSession, finalCode, onAction);
                        }
                    }
                } catch (e) {
                    logger.error(`[CodegenRecorder] Error reading final output:`, e);
                }

                this.sessions.delete(sessionId);

                // Emit completion event
                this.emit('recording:complete', { sessionId });

                // Call onComplete callback
                if (onComplete) {
                    logger.debug(`[CodegenRecorder] Calling onComplete callback`);
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
                    logger.debug(`[CodegenRecorder] Session ${sessionId} ended, stopping poll`);
                    clearInterval(pollInterval);
                    return;
                }

                pollCount++;
                try {
                    const currentCode = await readFile(outputFile, 'utf-8');
                    const currentSession = this.sessions.get(sessionId);

                    if (currentSession && currentCode !== currentSession.lastCode) {
                        logger.debug(`[CodegenRecorder] Code changed. Length: ${currentCode.length}, Poll #${pollCount}`);
                        // Code changed - process new actions
                        await this.processCodeChanges(
                            currentSession,
                            currentCode,
                            onAction
                        );
                        currentSession.lastCode = currentCode;
                    }
                } catch (e: any) {
                    if (e.code === 'ENOENT') {
                        // File doesn't exist yet -- expected during startup
                        if (pollCount % 20 === 1) {
                            logger.debug(`[CodegenRecorder] Poll #${pollCount}: File not ready yet`);
                        }
                    } else {
                        // Real error -- log it so we can debug dropped steps
                        logger.error(`[CodegenRecorder] Error processing code changes (poll #${pollCount}):`, e);
                    }
                }
            }, 500); // Poll every 500ms

            // Store interval for cleanup
            (session as any)._pollInterval = pollInterval;

            logger.info(`[CodegenRecorder] Recording started for session ${sessionId}`);

        } catch (error: any) {
            logger.error('[CodegenRecorder] Error starting recording:', error);
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
            fieldCreated?: { pageName: string; fieldName: string }
        ) => void
    ): Promise<void> {
        // Parse all actions from new code
        const actions = parsePlaywrightCode(newCode);
        logger.debug(`[CodegenRecorder] Parsed ${actions.length} total actions from code`);

        // Find new actions (compare line counts)
        const newActions = actions.slice(session.lastLineCount);
        // NOTE: Don't update lastLineCount here -- update AFTER processing
        // so that if an error interrupts the loop, we can retry on next poll.

        logger.debug(`[CodegenRecorder] Processing ${newActions.length} new actions`);

        // Convert each new action to Vero DSL
        let processedCount = 0;
        for (let i = 0; i < newActions.length; i++) {
            const action = newActions[i];
            try {
                // When a switchTab or openInNewTab is immediately followed by a goto, merge them:
                // the goto URL becomes the tab action's URL, and goto is skipped.
                if ((action.type === 'switchTab' || action.type === 'openInNewTab') && i + 1 < newActions.length && newActions[i + 1].type === 'goto') {
                    const gotoAction = newActions[i + 1];
                    if (gotoAction.value) {
                        action.value = gotoAction.value;
                        session.url = gotoAction.value; // update session URL for page object mapping
                    }
                    // Skip the next goto action
                    i++;
                    processedCount++; // count the skipped goto
                }

                const result = await this.convertToVero(action, session);
                if (result) {
                    // Comment out VERIFY lines that came from commented-out Playwright assertions
                    if (action.isCommented) {
                        result.veroCode = `# ${result.veroCode}`;
                    }
                    logger.debug(`[CodegenRecorder] Emitting: ${result.veroCode}`);

                    // Persist step to database if session is tracked
                    if (session.dbSessionId) {
                        try {
                            const stepData: CreateStepDTO = {
                                sessionId: session.dbSessionId,
                                stepNumber: session.stepCount,
                                actionType: action.type,
                                veroCode: result.veroCode,
                                primarySelector: action.selector || '',
                                selectorType: this.parseSelectorType(action.selector),
                                fallbackSelectors: [],
                                value: action.value,
                                url: session.url,
                                pageName: result.fieldCreated?.pageName,
                                fieldName: result.fieldCreated?.fieldName,
                            };
                            await recordingPersistenceService.addStep(stepData);
                            logger.debug(`[CodegenRecorder] Persisted step ${session.stepCount} with strict selector conversion`);
                        } catch (dbError) {
                            logger.warn('[CodegenRecorder] Failed to persist step:', dbError);
                        }
                    }

                    session.stepCount++;

                    onAction(
                        result.veroCode,
                        result.pagePath,
                        result.pageCode,
                        result.fieldCreated
                    );
                }
                processedCount++;
            } catch (actionError) {
                logger.warn(`[CodegenRecorder] Failed to convert action "${action.type}" (selector: ${action.selector || 'none'}):`, actionError);
                processedCount++; // Count it so we don't retry the same failed action forever
            }
        }

        // Update lastLineCount AFTER successful processing
        session.lastLineCount += processedCount;
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

        // Handle goto -- also update session URL so page objects map to the new page
        if (action.type === 'goto') {
            if (action.value) {
                session.url = action.value;
            }
            return { veroCode: generateVeroAction('open', undefined, action.value) };
        }

        // Handle refresh
        if (action.type === 'refresh') {
            return { veroCode: generateVeroAction('refresh') };
        }

        // Handle tab switch -- value is either a merged URL (from goto) or the tab variable name
        if (action.type === 'switchTab') {
            // If value looks like a URL (merged from a following goto), use it directly
            // Otherwise it's just the Playwright variable name (e.g. "page1") -- pass empty
            const url = action.value?.startsWith('http') ? action.value : '';
            return { veroCode: generateVeroAction('switchTab', undefined, url) };
        }

        // Handle switch to specific tab by index
        if (action.type === 'switchToTab') {
            return { veroCode: generateVeroAction('switchToTab', undefined, action.value) };
        }

        // Handle open in new tab -- may be merged with a following goto
        if (action.type === 'openInNewTab') {
            const url = action.value?.startsWith('http') ? action.value : '';
            if (url) {
                return { veroCode: generateVeroAction('openInNewTab', undefined, url) };
            }
            // If no URL yet (will be merged with goto), just emit SWITCH TO NEW TAB
            return { veroCode: generateVeroAction('switchTab', undefined, '') };
        }

        // Handle close tab
        if (action.type === 'closeTab') {
            return { veroCode: generateVeroAction('closeTab') };
        }

        // Handle page-level assertions (URL/title)
        if (action.type === 'expect' && !action.selector && (action.assertionType === 'url' || action.assertionType === 'title')) {
            return { veroCode: generateVeroAssertion('', action.assertionType, action.value) };
        }

        // Handle keyboard press without selector
        if (action.type === 'press' && !action.selector) {
            return { veroCode: generateVeroAction('press', undefined, action.value) };
        }

        // For actions with selectors, check page object registry
        if (action.selector) {
            // Get or create the page FIRST so we can scope lookups to this page only
            const pageObj = registry.getOrCreatePage(session.url);
            const pageName = pageObj.name;

            // Check if selector exists in registry -- scoped to current page only
            let fieldRef = registry.findBySelector(action.selector, pageName);

            let pagePath: string | undefined;
            let pageCode: string | undefined;
            let fieldCreated: { pageName: string; fieldName: string } | undefined;

            if (!fieldRef) {
                // Strict conversion: do not optimize selector shape, persist exactly what codegen produced.
                const fieldName = generateFieldName(action);
                fieldRef = registry.addField(pageName, fieldName, action.selector);
                pagePath = await registry.persist(pageName);
                pageCode = registry.getPageContent(pageName) || undefined;

                fieldCreated = {
                    pageName: fieldRef.pageName,
                    fieldName: fieldRef.fieldName
                };

                logger.info(`[CodegenRecorder] Created field ${fieldRef.pageName}.${fieldRef.fieldName} = ${action.selector}`);
            }

            // Build Vero action with page object reference using single source of truth
            const ref = `${fieldRef.pageName}.${fieldRef.fieldName}`;
            let veroCode: string;

            if (action.type === 'expect') {
                veroCode = generateVeroAssertion(ref, action.assertionType || 'visible', action.value);
            } else {
                veroCode = generateVeroAction(action.type, ref, action.value);
            }

            return { veroCode, pagePath, pageCode, fieldCreated };
        }

        return null;
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
                logger.info(`[CodegenRecorder] Completed DB session: ${session.dbSessionId}`);
            } catch (dbError) {
                logger.warn('[CodegenRecorder] Failed to complete DB session:', dbError);
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
            logger.error('[CodegenRecorder] Failed to recover session:', e);
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
