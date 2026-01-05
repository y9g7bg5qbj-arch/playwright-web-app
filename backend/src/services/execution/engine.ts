/**
 * Execution Engine Core
 * Main execution engine for Vero test automation IDE
 * Handles test execution, browser management, artifact collection, and result management
 */

import {
    chromium,
    firefox,
    webkit,
    Browser,
    BrowserContext,
    Page,
    devices,
    BrowserType as PlaywrightBrowserType,
} from 'playwright';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import {
    BrowserType,
    ExecutionOptions,
    BrowserOptions,
    TestResult,
    TestRun,
    RunSummary,
    ExecutionStatus,
    ArtifactRef,
    DEFAULT_EXECUTION_OPTIONS,
    TestStatus,
    TestStepResult,
} from './types';
import { ArtifactManager } from '../artifacts/ArtifactManager';
import { logger } from '../../utils/logger';
import { transpileVero } from '../veroTranspiler';

// Storage path for test execution
const STORAGE_PATH = path.resolve(process.env.STORAGE_PATH || './storage');

/**
 * Browser context info
 */
interface BrowserContextInfo {
    id: string;
    browser: Browser;
    context: BrowserContext;
    page: Page;
    browserType: BrowserType;
    options: BrowserOptions;
    createdAt: Date;
    lastUsed: Date;
}

/**
 * Execution state for tracking running tests
 */
interface ExecutionState {
    runId: string;
    status: ExecutionStatus;
    results: Map<string, TestResult>;
    startTime: Date;
    cancelled: boolean;
    workers: Map<string, { testId: string | null; context: BrowserContextInfo | null }>;
}

/**
 * Execution Engine
 * Core engine for running Playwright tests with artifact collection
 */
export class ExecutionEngine extends EventEmitter {
    private browsers: Map<BrowserType, Browser> = new Map();
    private contexts: Map<string, BrowserContextInfo> = new Map();
    private executions: Map<string, ExecutionState> = new Map();
    private artifactManager: ArtifactManager;
    private initialized: boolean = false;

    constructor(artifactManager?: ArtifactManager) {
        super();
        this.artifactManager = artifactManager || new ArtifactManager();
    }

    /**
     * Initialize the execution engine
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        logger.info('Initializing Execution Engine');

        // Ensure storage directory exists
        await fs.mkdir(STORAGE_PATH, { recursive: true });

        // Initialize artifact manager
        await this.artifactManager.initialize();

        this.initialized = true;
        logger.info('Execution Engine initialized');
    }

    /**
     * Shutdown the execution engine
     */
    async shutdown(): Promise<void> {
        logger.info('Shutting down Execution Engine');

        // Cancel all running executions
        for (const [runId, state] of this.executions) {
            if (state.status.status === 'running') {
                await this.cancelExecution(runId);
            }
        }

        // Close all contexts
        for (const [contextId, contextInfo] of this.contexts) {
            await this.releaseBrowserContext(contextId);
        }

        // Close all browsers
        for (const [browserType, browser] of this.browsers) {
            await browser.close();
        }

        this.browsers.clear();
        this.contexts.clear();
        this.executions.clear();
        this.initialized = false;

        logger.info('Execution Engine shutdown complete');
    }

    /**
     * Get or create a browser instance
     */
    private async getBrowser(browserType: BrowserType, headless: boolean = false): Promise<Browser> {
        const key = browserType;

        if (this.browsers.has(key)) {
            const browser = this.browsers.get(key)!;
            if (browser.isConnected()) {
                return browser;
            }
            // Browser disconnected, remove it
            this.browsers.delete(key);
        }

        // Launch new browser
        const browserTypes: Record<BrowserType, PlaywrightBrowserType<any>> = {
            chromium,
            firefox,
            webkit,
        };

        const browser = await browserTypes[browserType].launch({
            headless,
        });

        this.browsers.set(key, browser);

        browser.on('disconnected', () => {
            this.browsers.delete(key);
        });

        return browser;
    }

    /**
     * Get a browser context with specified options
     */
    async getBrowserContext(
        browserType: BrowserType,
        options: BrowserOptions
    ): Promise<BrowserContext> {
        const contextId = uuidv4();
        const browser = await this.getBrowser(browserType, options.headless);

        // Build context options
        const contextOptions: any = {
            viewport: options.viewport,
            locale: options.locale,
            timezoneId: options.timezone,
            geolocation: options.geolocation,
            permissions: options.permissions,
            colorScheme: options.colorScheme,
            extraHTTPHeaders: options.extraHTTPHeaders,
        };

        // Apply device emulation
        if (options.device && devices[options.device]) {
            Object.assign(contextOptions, devices[options.device]);
        }

        // Video recording
        if (options.recordVideo) {
            contextOptions.recordVideo = options.recordVideo;
        }

        // Storage state
        if (options.storageState) {
            try {
                const state = await fs.readFile(options.storageState, 'utf-8');
                contextOptions.storageState = JSON.parse(state);
            } catch (error) {
                logger.warn(`Failed to load storage state: ${options.storageState}`);
            }
        }

        const context = await browser.newContext(contextOptions);
        const page = await context.newPage();

        const contextInfo: BrowserContextInfo = {
            id: contextId,
            browser,
            context,
            page,
            browserType,
            options,
            createdAt: new Date(),
            lastUsed: new Date(),
        };

        this.contexts.set(contextId, contextInfo);

        return context;
    }

    /**
     * Release a browser context
     */
    releaseBrowserContext(contextId: string): void {
        const contextInfo = this.contexts.get(contextId);
        if (contextInfo) {
            contextInfo.context.close().catch((err) => {
                logger.warn(`Error closing context ${contextId}:`, err);
            });
            this.contexts.delete(contextId);
        }
    }

    /**
     * Run a single test
     */
    async runTest(testFile: string, options: ExecutionOptions): Promise<TestResult> {
        const testId = uuidv4();
        const runId = uuidv4();
        const startTime = new Date();

        logger.info(`Running test: ${testFile}`);

        // Create execution state
        const state: ExecutionState = {
            runId,
            status: {
                runId,
                status: 'running',
                progress: { completed: 0, total: 1, percentage: 0 },
                startedAt: startTime,
            },
            results: new Map(),
            startTime,
            cancelled: false,
            workers: new Map(),
        };

        this.executions.set(runId, state);

        try {
            // Emit started event
            this.emit('execution:started', { runId, testCount: 1 });
            this.emit('test:started', { runId, testId, testName: testFile });

            // Create storage directory for this test
            const storageDir = path.join(STORAGE_PATH, runId);
            await fs.mkdir(storageDir, { recursive: true });

            // Get browser context
            const contextOptions: BrowserOptions = {
                headless: options.headless,
                viewport: options.viewport,
                device: options.device,
                locale: options.locale,
                timezone: options.timezone,
            };

            if (options.video) {
                contextOptions.recordVideo = {
                    dir: path.join(storageDir, 'videos'),
                };
                await fs.mkdir(path.join(storageDir, 'videos'), { recursive: true });
            }

            const context = await this.getBrowserContext(options.browser, contextOptions);
            const page = context.pages()[0] || await context.newPage();

            // Start tracing if enabled
            if (options.tracing) {
                await context.tracing.start({
                    screenshots: true,
                    snapshots: true,
                    sources: true,
                });
            }

            // Execute the test
            const result = await this.executeTestFile(
                testFile,
                page,
                context,
                options,
                testId,
                runId,
                storageDir
            );

            // Stop tracing
            if (options.tracing) {
                const tracePath = path.join(storageDir, 'trace.zip');
                await context.tracing.stop({ path: tracePath });

                // Save trace as artifact
                const traceBuffer = await fs.readFile(tracePath);
                await this.artifactManager.saveTrace(testId, traceBuffer);
            }

            // Close context
            await context.close();

            // Update state
            state.results.set(testId, result);
            state.status.status = 'completed';
            state.status.progress = { completed: 1, total: 1, percentage: 100 };

            // Emit events
            this.emit('test:completed', { runId, testId, result });
            this.emit('execution:completed', {
                runId,
                summary: this.createRunSummary(runId, [result]),
            });

            return result;

        } catch (error: any) {
            logger.error(`Test execution error: ${error.message}`);

            const result: TestResult = {
                id: testId,
                runId,
                testFile,
                testName: path.basename(testFile),
                status: 'failed',
                duration: Date.now() - startTime.getTime(),
                startedAt: startTime,
                completedAt: new Date(),
                error: {
                    message: error.message,
                    stack: error.stack,
                },
                artifacts: [],
                retries: 0,
                browser: options.browser,
            };

            state.results.set(testId, result);
            state.status.status = 'failed';

            this.emit('test:completed', { runId, testId, result });
            this.emit('execution:error', { runId, error: error.message });

            return result;

        } finally {
            this.executions.delete(runId);
        }
    }

    /**
     * Run a suite of tests
     */
    async *runSuite(
        tests: string[],
        options: ExecutionOptions
    ): AsyncGenerator<TestResult> {
        const runId = uuidv4();
        const startTime = new Date();

        logger.info(`Running test suite with ${tests.length} tests`);

        // Create execution state
        const state: ExecutionState = {
            runId,
            status: {
                runId,
                status: 'running',
                progress: { completed: 0, total: tests.length, percentage: 0 },
                startedAt: startTime,
            },
            results: new Map(),
            startTime,
            cancelled: false,
            workers: new Map(),
        };

        this.executions.set(runId, state);

        // Emit started event
        this.emit('execution:started', { runId, testCount: tests.length });

        const storageDir = path.join(STORAGE_PATH, runId);
        await fs.mkdir(storageDir, { recursive: true });

        let completedCount = 0;
        const allResults: TestResult[] = [];

        try {
            // Run tests sequentially (parallel execution can be added later)
            for (const testFile of tests) {
                if (state.cancelled) {
                    logger.info(`Execution cancelled, skipping remaining tests`);
                    break;
                }

                const testId = uuidv4();
                const testStartTime = new Date();

                // Emit test started
                this.emit('test:started', { runId, testId, testName: testFile });

                try {
                    // Create context for this test
                    const contextOptions: BrowserOptions = {
                        headless: options.headless,
                        viewport: options.viewport,
                        device: options.device,
                    };

                    if (options.video) {
                        contextOptions.recordVideo = {
                            dir: path.join(storageDir, testId, 'videos'),
                        };
                        await fs.mkdir(path.join(storageDir, testId, 'videos'), { recursive: true });
                    }

                    const context = await this.getBrowserContext(options.browser, contextOptions);
                    const page = context.pages()[0] || await context.newPage();

                    // Start tracing
                    if (options.tracing) {
                        await context.tracing.start({
                            screenshots: true,
                            snapshots: true,
                            sources: true,
                        });
                    }

                    // Execute test
                    const result = await this.executeTestFile(
                        testFile,
                        page,
                        context,
                        options,
                        testId,
                        runId,
                        path.join(storageDir, testId)
                    );

                    // Stop tracing
                    if (options.tracing) {
                        const tracePath = path.join(storageDir, testId, 'trace.zip');
                        await fs.mkdir(path.dirname(tracePath), { recursive: true });
                        await context.tracing.stop({ path: tracePath });

                        const traceBuffer = await fs.readFile(tracePath);
                        await this.artifactManager.saveTrace(testId, traceBuffer);
                    }

                    await context.close();

                    state.results.set(testId, result);
                    allResults.push(result);

                    this.emit('test:completed', { runId, testId, result });
                    yield result;

                } catch (error: any) {
                    const result: TestResult = {
                        id: testId,
                        runId,
                        testFile,
                        testName: path.basename(testFile),
                        status: 'failed',
                        duration: Date.now() - testStartTime.getTime(),
                        startedAt: testStartTime,
                        completedAt: new Date(),
                        error: {
                            message: error.message,
                            stack: error.stack,
                        },
                        artifacts: [],
                        retries: 0,
                        browser: options.browser,
                    };

                    state.results.set(testId, result);
                    allResults.push(result);

                    this.emit('test:completed', { runId, testId, result });
                    yield result;
                }

                completedCount++;
                state.status.progress = {
                    completed: completedCount,
                    total: tests.length,
                    percentage: Math.round((completedCount / tests.length) * 100),
                };

                this.emit('execution:progress', {
                    runId,
                    completed: completedCount,
                    total: tests.length,
                });
            }

            // Final status
            state.status.status = state.cancelled ? 'cancelled' : 'completed';

            // Emit completion
            this.emit('execution:completed', {
                runId,
                summary: this.createRunSummary(runId, allResults),
            });

        } finally {
            this.executions.delete(runId);
        }
    }

    /**
     * Execute a test file
     */
    private async executeTestFile(
        testFile: string,
        page: Page,
        context: BrowserContext,
        options: ExecutionOptions,
        testId: string,
        runId: string,
        storageDir: string
    ): Promise<TestResult> {
        const startTime = new Date();
        const steps: TestStepResult[] = [];
        const artifacts: ArtifactRef[] = [];

        try {
            // Ensure storage directory exists
            await fs.mkdir(storageDir, { recursive: true });

            // Read the test file content
            let testCode: string;
            try {
                testCode = await fs.readFile(testFile, 'utf-8');
            } catch (error) {
                // If file doesn't exist, treat it as inline code (for Vero DSL)
                testCode = testFile;
            }

            // Check if it's Vero DSL and transpile if needed
            if (testCode.includes('page ') && testCode.includes('feature ')) {
                testCode = transpileVero(testCode);
            }

            // Create a test runner function
            const testRunner = new Function(
                'page',
                'context',
                'expect',
                'test',
                `
                return (async () => {
                    const { expect: pwExpect } = await import('@playwright/test');
                    const expect = pwExpect;
                    ${testCode}
                })();
                `
            );

            // Execute the test
            await testRunner(page, context, null, null);

            // Take final screenshot on success (if configured)
            if (options.screenshot === 'on') {
                const screenshotPath = path.join(storageDir, 'final.png');
                await page.screenshot({ path: screenshotPath });

                const screenshotBuffer = await fs.readFile(screenshotPath);
                const screenshotRef = await this.artifactManager.saveScreenshot(
                    testId,
                    'final',
                    screenshotBuffer
                );
                artifacts.push(screenshotRef);
            }

            return {
                id: testId,
                runId,
                testFile,
                testName: path.basename(testFile),
                status: 'passed',
                duration: Date.now() - startTime.getTime(),
                startedAt: startTime,
                completedAt: new Date(),
                artifacts,
                retries: 0,
                browser: options.browser,
                steps,
            };

        } catch (error: any) {
            // Capture failure screenshot
            let screenshotPath: string | undefined;

            if (options.screenshot !== 'off') {
                try {
                    screenshotPath = path.join(storageDir, 'failure.png');
                    await page.screenshot({ path: screenshotPath, fullPage: true });

                    const screenshotBuffer = await fs.readFile(screenshotPath);
                    const screenshotRef = await this.artifactManager.saveScreenshot(
                        testId,
                        'failure',
                        screenshotBuffer
                    );
                    artifacts.push(screenshotRef);
                } catch (ssError) {
                    logger.warn('Failed to capture failure screenshot:', ssError);
                }
            }

            return {
                id: testId,
                runId,
                testFile,
                testName: path.basename(testFile),
                status: 'failed',
                duration: Date.now() - startTime.getTime(),
                startedAt: startTime,
                completedAt: new Date(),
                error: {
                    message: error.message,
                    stack: error.stack,
                    screenshot: screenshotPath,
                },
                artifacts,
                retries: 0,
                browser: options.browser,
                steps,
            };
        }
    }

    /**
     * Cancel a running execution
     */
    async cancelExecution(runId: string): Promise<void> {
        const state = this.executions.get(runId);
        if (!state) {
            logger.warn(`No execution found with runId: ${runId}`);
            return;
        }

        logger.info(`Cancelling execution: ${runId}`);
        state.cancelled = true;
        state.status.status = 'cancelled';

        this.emit('execution:cancelled', { runId });
    }

    /**
     * Get execution status
     */
    getExecutionStatus(runId: string): ExecutionStatus | null {
        const state = this.executions.get(runId);
        return state?.status || null;
    }

    /**
     * Enable tracing for a test
     */
    enableTracing(testId: string): void {
        // Tracing is managed per-context, this is a placeholder for future enhancement
        logger.info(`Tracing enabled for test: ${testId}`);
    }

    /**
     * Capture a screenshot
     */
    async captureScreenshot(testId: string, name: string): Promise<string> {
        // Find the context for this test (if running)
        for (const [contextId, contextInfo] of this.contexts) {
            if (contextInfo.context.pages().length > 0) {
                const page = contextInfo.page;
                const buffer = await page.screenshot();
                const ref = await this.artifactManager.saveScreenshot(testId, name, buffer);
                return ref.path;
            }
        }

        throw new Error(`No active page found for test: ${testId}`);
    }

    /**
     * Save video for a test
     */
    async saveVideo(testId: string): Promise<string> {
        // Video is handled by Playwright context options
        // This would save any recorded video
        const videoDir = path.join(STORAGE_PATH, testId, 'videos');
        try {
            const files = await fs.readdir(videoDir);
            const videoFile = files.find((f) => f.endsWith('.webm') || f.endsWith('.mp4'));
            if (videoFile) {
                const videoPath = path.join(videoDir, videoFile);
                const videoBuffer = await fs.readFile(videoPath);
                const ref = await this.artifactManager.saveVideo(testId, videoBuffer);
                return ref.path;
            }
        } catch (error) {
            logger.warn(`No video found for test: ${testId}`);
        }

        throw new Error(`No video found for test: ${testId}`);
    }

    /**
     * Get trace for a test
     */
    async getTrace(testId: string): Promise<string> {
        const artifacts = await this.artifactManager.getArtifactsForTest(testId);
        const trace = artifacts.find((a) => a.type === 'trace');
        if (trace) {
            return trace.path;
        }

        throw new Error(`No trace found for test: ${testId}`);
    }

    /**
     * Create a run summary from results
     */
    private createRunSummary(runId: string, results: TestResult[]): RunSummary {
        const passed = results.filter((r) => r.status === 'passed').length;
        const failed = results.filter((r) => r.status === 'failed').length;
        const skipped = results.filter((r) => r.status === 'skipped').length;
        const flaky = results.filter((r) => r.status === 'flaky').length;
        const total = results.length;

        const startTime = results.reduce(
            (min, r) => (r.startedAt < min ? r.startedAt : min),
            results[0]?.startedAt || new Date()
        );
        const endTime = results.reduce(
            (max, r) => (r.completedAt > max ? r.completedAt : max),
            results[0]?.completedAt || new Date()
        );

        const duration = endTime.getTime() - startTime.getTime();

        const failedTests = results
            .filter((r) => r.status === 'failed')
            .map((r) => ({
                testFile: r.testFile,
                testName: r.testName,
                error: r.error?.message || 'Unknown error',
            }));

        const flakyTests = results
            .filter((r) => r.status === 'flaky')
            .map((r) => ({
                testFile: r.testFile,
                testName: r.testName,
                retriesNeeded: r.retries,
            }));

        const status: TestStatus =
            failed > 0 ? 'failed' : skipped === total ? 'skipped' : 'passed';

        return {
            runId,
            status,
            duration,
            total,
            passed,
            failed,
            skipped,
            flaky,
            passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
            startedAt: startTime,
            completedAt: endTime,
            failedTests,
            flakyTests,
        };
    }

    /**
     * Get artifact manager instance
     */
    getArtifactManager(): ArtifactManager {
        return this.artifactManager;
    }
}

// Export singleton instance
export const executionEngine = new ExecutionEngine();
