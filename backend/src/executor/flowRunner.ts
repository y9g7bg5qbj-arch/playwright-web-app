/**
 * Flow Runner
 * Main orchestrator for executing visual flows with Playwright
 */

import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';
import { ControlFlowExecutor, createExecutionContext } from './controlFlow';
import { ActionExecutor } from './actionExecutor';
import {
    FlowNode,
    FlowEdge,
    FlowExecutionContext,
    FlowData,
    ExecutionLogEntry,
} from '@playwright-web-app/shared';

/**
 * Flow execution options
 */
export interface FlowRunnerOptions {
    /** Browser type to use */
    browser?: 'chromium' | 'firefox' | 'webkit';
    /** Run headless */
    headless?: boolean;
    /** Viewport size */
    viewport?: { width: number; height: number };
    /** Default timeout in ms */
    timeout?: number;
    /** Initial variables */
    variables?: Record<string, any>;
    /** Enable trace collection */
    trace?: boolean;
    /** Enable screenshots on each step */
    screenshots?: boolean;
    /** Storage path for artifacts */
    storagePath?: string;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: FlowRunnerOptions = {
    browser: 'chromium',
    headless: false,
    viewport: { width: 1280, height: 720 },
    timeout: 30000,
    variables: {},
    trace: false,
    screenshots: false,
    storagePath: './storage',
};

/**
 * Flow execution result
 */
export interface FlowRunnerResult {
    success: boolean;
    duration: number;
    stepsExecuted: number;
    error?: string;
    logs: ExecutionLogEntry[];
    traceFile?: string;
    screenshots?: string[];
    variables: Record<string, any>;
}

/**
 * Log callback type
 */
export type LogCallback = (message: string, level: 'info' | 'warn' | 'error') => void;

/**
 * Flow Runner class
 */
export class FlowRunner {
    private browser: Browser | null = null;
    private browserContext: BrowserContext | null = null;
    private page: Page | null = null;
    private options: FlowRunnerOptions;
    private logs: ExecutionLogEntry[] = [];
    private stepsExecuted: number = 0;

    constructor(options: Partial<FlowRunnerOptions> = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Execute a flow from JSON data
     */
    async execute(
        flow: FlowData,
        onLog?: LogCallback
    ): Promise<FlowRunnerResult> {
        const startTime = Date.now();
        this.logs = [];
        this.stepsExecuted = 0;

        const log = (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
            const entry: ExecutionLogEntry = {
                timestamp: new Date(),
                nodeId: '',
                action: '',
                message,
                level,
            };
            this.logs.push(entry);
            onLog?.(message, level);
        };

        try {
            log(`Starting flow execution with ${flow.nodes.length} nodes`, 'info');

            // Initialize browser
            await this.initBrowser();
            log('Browser initialized', 'info');

            // Create execution context
            const context = createExecutionContext();
            context.variables = { ...this.options.variables };
            context.page = this.page;
            context.context = this.browserContext;

            // Create action executor
            const actionExecutor = new ActionExecutor(this.page!, context);

            // Create control flow executor
            const executor = new ControlFlowExecutor(
                this.page!,
                flow.nodes,
                flow.edges,
                context,
                async (node) => {
                    this.stepsExecuted++;
                    const result = await actionExecutor.execute(node);
                    if (!result.success) {
                        throw new Error(`Step failed: ${result.error}`);
                    }
                },
                log
            );

            // Execute from start
            await executor.executeFromStart();

            const duration = Date.now() - startTime;
            log(`Flow completed successfully in ${duration}ms`, 'info');

            return {
                success: true,
                duration,
                stepsExecuted: this.stepsExecuted,
                logs: this.logs,
                variables: context.variables,
            };
        } catch (error: any) {
            const duration = Date.now() - startTime;
            log(`Flow execution failed: ${error.message}`, 'error');

            return {
                success: false,
                duration,
                stepsExecuted: this.stepsExecuted,
                error: error.message,
                logs: this.logs,
                variables: {},
            };
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Execute flow from JSON strings
     */
    async executeFromJson(
        nodesJson: string,
        edgesJson: string,
        onLog?: LogCallback
    ): Promise<FlowRunnerResult> {
        const nodes: FlowNode[] = JSON.parse(nodesJson);
        const edges: FlowEdge[] = JSON.parse(edgesJson);
        return this.execute({ nodes, edges }, onLog);
    }

    /**
     * Initialize browser
     */
    private async initBrowser(): Promise<void> {
        const browserType = this.options.browser || 'chromium';

        switch (browserType) {
            case 'firefox':
                this.browser = await firefox.launch({ headless: this.options.headless });
                break;
            case 'webkit':
                this.browser = await webkit.launch({ headless: this.options.headless });
                break;
            case 'chromium':
            default:
                this.browser = await chromium.launch({ headless: this.options.headless });
        }

        this.browserContext = await this.browser.newContext({
            viewport: this.options.viewport,
        });

        // Enable trace if requested
        if (this.options.trace) {
            await this.browserContext.tracing.start({
                screenshots: true,
                snapshots: true,
            });
        }

        this.page = await this.browserContext.newPage();

        // Set default timeout
        this.page.setDefaultTimeout(this.options.timeout || 30000);
    }

    /**
     * Cleanup resources
     */
    private async cleanup(): Promise<void> {
        try {
            if (this.options.trace && this.browserContext) {
                await this.browserContext.tracing.stop({
                    path: `${this.options.storagePath}/trace.zip`,
                });
            }

            if (this.browser) {
                await this.browser.close();
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }

        this.browser = null;
        this.browserContext = null;
        this.page = null;
    }

    /**
     * Get the current page (for external use)
     */
    getPage(): Page | null {
        return this.page;
    }
}

/**
 * Execute a flow with default options
 */
export async function runFlow(
    flow: FlowData,
    options?: Partial<FlowRunnerOptions>,
    onLog?: LogCallback
): Promise<FlowRunnerResult> {
    const runner = new FlowRunner(options);
    return runner.execute(flow, onLog);
}

/**
 * Parse flow from database-stored JSON strings
 */
export function parseFlowFromDatabase(
    nodesJson: string | null | undefined,
    edgesJson: string | null | undefined
): FlowData {
    return {
        nodes: nodesJson ? JSON.parse(nodesJson) : [],
        edges: edgesJson ? JSON.parse(edgesJson) : [],
    };
}
