/**
 * Flow Executor
 * Main execution engine for Playwright Visual IDE flows
 */

import { chromium, firefox, webkit, Browser, BrowserContext, Page, devices } from 'playwright';
import { Server as SocketIOServer } from 'socket.io';
import {
    ExecutionConfig,
    ExecutionResult,
    StepResult,
    FlowNode,
    FlowEdge,
    ParsedFlow,
    LoopContext,
    DEFAULT_EXECUTION_CONFIG,
    ExecutionError,
} from '@playwright-web-app/shared';
import { VariableContext } from './variableContext';
import { ArtifactCollector } from './artifactCollector';
import { ProgressReporter } from './progressReporter';
import {
    getStepExecutor,
    isControlFlowNode,
    isLoopNode,
    isConditionalNode,
    StepExecutionContext,
    evaluateCondition,
    createForLoopContext,
    createForEachLoopContext,
    createWhileLoopContext,
    shouldContinueLoop,
    advanceLoop,
    initializeLoopVariables,
    executeBreak,
    executeContinue,
    executePass,
    executeFail,
    shouldSkipRemainingSteps,
} from './stepExecutors';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Flow Executor Class
 * Executes flow graphs using Playwright
 */
export class FlowExecutor {
    private io: SocketIOServer | null;
    private browser: Browser | null = null;
    private cancelled: boolean = false;
    private pauseRequested: boolean = false;
    private executionId: string = '';

    constructor(io: SocketIOServer | null = null) {
        this.io = io;
    }

    /**
     * Execute a flow with the given configuration
     */
    async execute(
        flow: ParsedFlow,
        config: ExecutionConfig
    ): Promise<ExecutionResult> {
        this.executionId = uuidv4();
        this.cancelled = false;
        this.pauseRequested = false;

        const startTime = Date.now();
        const mergedConfig = { ...DEFAULT_EXECUTION_CONFIG, ...config } as ExecutionConfig;

        // Initialize components
        const variables = new VariableContext(
            config.variables || {},
            config.environmentVariables || {}
        );
        const artifactCollector = new ArtifactCollector(this.executionId, mergedConfig);
        const progressReporter = new ProgressReporter(this.executionId, flow.id, this.io);

        // Initialize storage
        await artifactCollector.initialize();

        // Find start node
        const startNode = this.findStartNode(flow);
        if (!startNode) {
            return this.createFailedResult(flow, mergedConfig, startTime, 1, 1, {
                message: 'No start node found in flow',
            });
        }

        // Count approximate steps for progress
        const totalSteps = flow.nodes.filter(n => !['start', 'end'].includes(n.type)).length;
        progressReporter.setTotalSteps(totalSteps);

        try {
            // Launch browser
            this.browser = await this.launchBrowser(mergedConfig);
            const context = await this.createContext(this.browser, mergedConfig);
            const page = await context.newPage();

            // Start tracing
            await artifactCollector.startTracing(context);

            // Create execution context
            const execContext: StepExecutionContext = {
                page,
                context,
                variables,
                pages: [page],
                loopStack: [],
                logs: [],
                highlightElements: mergedConfig.debugMode,
                setPage: (newPage: Page) => {
                    execContext.page = newPage;
                },
            };

            // Execute from start node
            const stepResults: StepResult[] = [];
            progressReporter.reportProgress('running');

            await this.executeFromNode(
                startNode,
                flow,
                execContext,
                stepResults,
                artifactCollector,
                progressReporter,
                mergedConfig
            );

            // Collect artifacts
            const artifacts = await artifactCollector.collectExecutionArtifacts(context, false);

            // Create successful result
            const result: ExecutionResult = {
                executionId: this.executionId,
                flowId: flow.id,
                flowName: flow.name,
                status: 'passed',
                steps: stepResults,
                duration: Date.now() - startTime,
                startTime,
                endTime: Date.now(),
                artifacts,
                config: mergedConfig,
                attempt: 1,
                totalAttempts: 1,
            };

            progressReporter.reportComplete(result);

            return result;

        } catch (error: any) {
            logger.error(`Flow execution failed: ${error.message}`);

            // Check if it's a pass (not really an error)
            if (error.isPass) {
                return this.createPassedResult(flow, mergedConfig, startTime, 1, 1, []);
            }

            // Create error result
            const executionError: ExecutionError = {
                message: error.message,
                stack: error.stack,
            };

            // Try to get artifacts even on failure
            let artifacts = { screenshots: [] as string[] };
            try {
                if (this.browser) {
                    const contexts = this.browser.contexts();
                    if (contexts.length > 0) {
                        artifacts = await artifactCollector.collectExecutionArtifacts(contexts[0], true);
                    }
                }
            } catch {
                // Ignore artifact collection errors
            }

            const result = this.createFailedResult(
                flow,
                mergedConfig,
                startTime,
                1,
                1,
                executionError,
                artifacts
            );

            progressReporter.reportComplete(result);

            return result;

        } finally {
            // Clean up
            if (this.browser) {
                await this.browser.close().catch(() => { });
                this.browser = null;
            }
        }
    }

    /**
     * Execute with retry logic
     */
    async executeWithRetry(
        flow: ParsedFlow,
        config: ExecutionConfig
    ): Promise<ExecutionResult> {
        const retries = config.retries ?? 0;
        let lastResult: ExecutionResult | null = null;

        for (let attempt = 1; attempt <= retries + 1; attempt++) {
            logger.info(`Execution attempt ${attempt}/${retries + 1}`);

            // Enable trace on retries
            const attemptConfig = {
                ...config,
                trace: attempt > 1 && config.trace === 'on-first-retry' ? 'on' : config.trace,
            };

            lastResult = await this.execute(flow, attemptConfig as ExecutionConfig);
            lastResult.attempt = attempt;
            lastResult.totalAttempts = retries + 1;

            if (lastResult.status === 'passed') {
                return lastResult;
            }

            if (attempt < retries + 1) {
                logger.info(`Attempt ${attempt} failed, retrying...`);

                // Report retry
                const progressReporter = new ProgressReporter(this.executionId, flow.id, this.io);
                progressReporter.reportRetry(attempt + 1, retries + 1, lastResult.error?.message || 'Unknown error');

                // Small delay between retries
                await this.delay(1000);
            }
        }

        return lastResult!;
    }

    /**
     * Cancel the current execution
     */
    cancel(): void {
        this.cancelled = true;
        if (this.browser) {
            this.browser.close().catch(() => { });
            this.browser = null;
        }
    }

    /**
     * Request pause at next step (for debug mode)
     */
    requestPause(): void {
        this.pauseRequested = true;
    }

    /**
     * Resume from pause
     */
    resume(): void {
        this.pauseRequested = false;
    }

    /**
     * Execute from a specific node following the graph
     */
    private async executeFromNode(
        node: FlowNode,
        flow: ParsedFlow,
        ctx: StepExecutionContext,
        results: StepResult[],
        artifactCollector: ArtifactCollector,
        progressReporter: ProgressReporter,
        config: ExecutionConfig
    ): Promise<void> {
        // Check for cancellation
        if (this.cancelled) {
            throw new Error('Execution cancelled');
        }

        // Check for loop break/continue
        if (shouldSkipRemainingSteps(ctx)) {
            return;
        }

        // Handle debug pause
        if (this.pauseRequested && config.debugMode) {
            progressReporter.reportDebugPause(node.id, node.data.label || node.type, ctx.variables.toObject());
            await this.waitForResume();
        }

        // Check breakpoints
        if (config.breakpoints?.includes(node.id) && config.debugMode) {
            progressReporter.reportDebugPause(node.id, node.data.label || node.type, ctx.variables.toObject());
            await this.waitForResume();
        }

        const nodeType = node.data.actionType || node.type;
        const nodeName = node.data.label || node.data.name || nodeType;
        const startTime = Date.now();

        logger.info(`Executing node: ${nodeName} (${nodeType})`);

        // Report step start
        progressReporter.reportStepStart(node.id, nodeName, nodeType, results.length);

        try {
            // Handle different node types
            if (nodeType === 'start') {
                // Start node - just continue to next
                const nextNodes = this.getNextNodes(node.id, flow, 'default');
                for (const nextNode of nextNodes) {
                    await this.executeFromNode(nextNode, flow, ctx, results, artifactCollector, progressReporter, config);
                }
                return;
            }

            if (nodeType === 'end') {
                // End node - execution complete
                results.push(this.createStepResult(node, 'passed', startTime, ctx.logs.splice(0)));
                return;
            }

            if (nodeType === 'if') {
                // Conditional branching
                await this.executeCondition(node, flow, ctx, results, artifactCollector, progressReporter, config);
                return;
            }

            if (isLoopNode(nodeType)) {
                // Loop execution
                await this.executeLoop(node, flow, ctx, results, artifactCollector, progressReporter, config);
                return;
            }

            if (nodeType === 'break') {
                executeBreak(ctx as any);
                results.push(this.createStepResult(node, 'passed', startTime, ctx.logs.splice(0)));
                return;
            }

            if (nodeType === 'continue') {
                executeContinue(ctx as any);
                results.push(this.createStepResult(node, 'passed', startTime, ctx.logs.splice(0)));
                return;
            }

            if (nodeType === 'pass') {
                executePass(node.data, ctx as any);
            }

            if (nodeType === 'fail') {
                executeFail(node.data, ctx as any);
            }

            if (nodeType === 'group') {
                // Group node - just continue to children
                const nextNodes = this.getNextNodes(node.id, flow, 'default');
                for (const nextNode of nextNodes) {
                    await this.executeFromNode(nextNode, flow, ctx, results, artifactCollector, progressReporter, config);
                }
                return;
            }

            // Regular step execution
            const executor = getStepExecutor(nodeType);
            if (!executor) {
                throw new Error(`Unsupported node type: ${nodeType}`);
            }

            // Capture before screenshot if enabled
            if (config.screenshot === 'on') {
                await artifactCollector.captureBeforeScreenshot(ctx.page, node.id);
            }

            // Execute the step
            await executor(node.data, ctx);

            // Capture after screenshot if enabled
            if (config.screenshot === 'on') {
                await artifactCollector.captureAfterScreenshot(ctx.page, node.id);
            }

            // Record success
            const stepResult = this.createStepResult(node, 'passed', startTime, ctx.logs.splice(0));
            results.push(stepResult);

            progressReporter.reportStepComplete(node.id, nodeName, nodeType, 'passed', stepResult.duration);

            // Continue to next nodes
            const nextNodes = this.getNextNodes(node.id, flow, 'default');
            for (const nextNode of nextNodes) {
                await this.executeFromNode(nextNode, flow, ctx, results, artifactCollector, progressReporter, config);
            }

        } catch (error: any) {
            // Check if it's a pass (not really an error)
            if (error.isPass) {
                throw error;
            }

            // Capture failure screenshot
            let screenshotPath: string | undefined;
            let screenshotBase64: string | undefined;

            if (config.screenshot !== 'off') {
                screenshotPath = await artifactCollector.captureFailureScreenshot(ctx.page, node.id);
                screenshotBase64 = await artifactCollector.captureScreenshotBase64(ctx.page);
            }

            // Record failure
            const executionError: ExecutionError = {
                message: error.message,
                stack: error.stack,
                screenshot: screenshotBase64,
                nodeId: node.id,
                nodeName,
            };

            const stepResult: StepResult = {
                nodeId: node.id,
                nodeName,
                nodeType,
                status: 'failed',
                duration: Date.now() - startTime,
                startTime,
                endTime: Date.now(),
                error: executionError,
                logs: ctx.logs.splice(0),
                artifacts: screenshotPath ? { screenshot: screenshotPath } : undefined,
            };

            results.push(stepResult);

            progressReporter.reportStepComplete(
                node.id,
                nodeName,
                nodeType,
                'failed',
                stepResult.duration,
                executionError,
                screenshotBase64
            );

            throw error;
        }
    }

    /**
     * Execute conditional (if/else) node
     */
    private async executeCondition(
        node: FlowNode,
        flow: ParsedFlow,
        ctx: StepExecutionContext,
        results: StepResult[],
        artifactCollector: ArtifactCollector,
        progressReporter: ProgressReporter,
        config: ExecutionConfig
    ): Promise<void> {
        const startTime = Date.now();
        const nodeName = node.data.label || 'If Condition';

        // Evaluate condition
        const condition = await evaluateCondition(node.data, ctx as any);
        ctx.logs.push(`Condition: ${condition.description}`);

        // Record result
        results.push(this.createStepResult(node, 'passed', startTime, ctx.logs.splice(0)));

        progressReporter.reportStepComplete(node.id, nodeName, 'if', 'passed', Date.now() - startTime);

        // Get branch to follow
        const branch = condition.result ? 'true' : 'false';
        const nextNodes = this.getNextNodes(node.id, flow, branch);

        // Execute branch
        for (const nextNode of nextNodes) {
            await this.executeFromNode(nextNode, flow, ctx, results, artifactCollector, progressReporter, config);
        }
    }

    /**
     * Execute loop node
     */
    private async executeLoop(
        node: FlowNode,
        flow: ParsedFlow,
        ctx: StepExecutionContext,
        results: StepResult[],
        artifactCollector: ArtifactCollector,
        progressReporter: ProgressReporter,
        config: ExecutionConfig
    ): Promise<void> {
        const nodeType = node.data.actionType || node.type;
        const nodeName = node.data.label || nodeType;
        const startTime = Date.now();

        // Create loop context
        let loopCtx: LoopContext;

        switch (nodeType) {
            case 'for-loop':
                loopCtx = createForLoopContext(node.id, node.data);
                break;
            case 'for-each':
                loopCtx = createForEachLoopContext(node.id, node.data, ctx.variables);
                break;
            case 'while-loop':
                loopCtx = createWhileLoopContext(node.id, node.data);
                break;
            default:
                throw new Error(`Unknown loop type: ${nodeType}`);
        }

        // Push loop context
        ctx.loopStack.push(loopCtx);

        // Push variable scope for loop
        ctx.variables.pushScope();
        initializeLoopVariables(loopCtx, node.data, ctx.variables);

        try {
            // Execute loop iterations
            while (await shouldContinueLoop(loopCtx, node.data, ctx as any)) {
                if (this.cancelled) {
                    throw new Error('Execution cancelled');
                }

                if (loopCtx.shouldBreak) {
                    break;
                }

                ctx.logs.push(`Loop iteration ${loopCtx.currentIndex + 1}`);

                // Reset continue flag
                loopCtx.shouldContinue = false;

                // Get loop body nodes
                const bodyNodes = this.getNextNodes(node.id, flow, 'loop-body');

                // Execute body
                for (const bodyNode of bodyNodes) {
                    if (loopCtx.shouldBreak || loopCtx.shouldContinue) {
                        break;
                    }
                    await this.executeFromNode(bodyNode, flow, ctx, results, artifactCollector, progressReporter, config);
                }

                // Advance to next iteration
                advanceLoop(loopCtx, node.data, ctx.variables);
            }

            // Record loop completion
            results.push(this.createStepResult(node, 'passed', startTime, ctx.logs.splice(0)));

            progressReporter.reportStepComplete(node.id, nodeName, nodeType, 'passed', Date.now() - startTime);

        } finally {
            // Pop variable scope
            ctx.variables.popScope();

            // Pop loop context
            ctx.loopStack.pop();
        }

        // Continue to exit nodes
        const exitNodes = this.getNextNodes(node.id, flow, 'loop-exit');
        for (const exitNode of exitNodes) {
            await this.executeFromNode(exitNode, flow, ctx, results, artifactCollector, progressReporter, config);
        }
    }

    /**
     * Find the start node in a flow
     */
    private findStartNode(flow: ParsedFlow): FlowNode | null {
        // Check if startNodeId is specified
        if (flow.startNodeId) {
            return flow.nodes.find(n => n.id === flow.startNodeId) || null;
        }

        // Find node of type 'start'
        const startNode = flow.nodes.find(n => n.type === 'start');
        if (startNode) {
            return startNode;
        }

        // Find node with no incoming edges (root node)
        const nodesWithIncoming = new Set(flow.edges.map(e => e.target));
        const rootNode = flow.nodes.find(n => !nodesWithIncoming.has(n.id));

        return rootNode || null;
    }

    /**
     * Get next nodes following edges from a node
     */
    private getNextNodes(nodeId: string, flow: ParsedFlow, handleType: string = 'default'): FlowNode[] {
        // Find edges from this node
        const edges = flow.edges.filter(e => {
            if (e.source !== nodeId) return false;

            // Match handle type
            if (handleType === 'default') {
                // Default matches edges with no sourceHandle or sourceHandle === 'default'
                return !e.sourceHandle || e.sourceHandle === 'default' || e.sourceHandle === 'source';
            }

            return e.sourceHandle === handleType;
        });

        // Get target nodes
        const nodes: FlowNode[] = [];
        for (const edge of edges) {
            const node = flow.nodes.find(n => n.id === edge.target);
            if (node) {
                nodes.push(node);
            }
        }

        return nodes;
    }

    /**
     * Launch browser based on config
     */
    private async launchBrowser(config: ExecutionConfig): Promise<Browser> {
        const browserType = {
            chromium,
            firefox,
            webkit,
        }[config.browser] || chromium;

        return browserType.launch({
            headless: config.headless,
        });
    }

    /**
     * Create browser context with config
     */
    private async createContext(browser: Browser, config: ExecutionConfig): Promise<BrowserContext> {
        const options: any = {
            viewport: config.viewport,
        };

        // Apply device emulation
        if (config.device && devices[config.device]) {
            Object.assign(options, devices[config.device]);
        }

        // Video recording
        if (config.video !== 'off') {
            options.recordVideo = {
                dir: `./storage/${this.executionId}/videos`,
            };
        }

        return browser.newContext(options);
    }

    /**
     * Create a step result
     */
    private createStepResult(
        node: FlowNode,
        status: 'passed' | 'failed' | 'skipped',
        startTime: number,
        logs: string[]
    ): StepResult {
        const nodeType = node.data.actionType || node.type;

        return {
            nodeId: node.id,
            nodeName: node.data.label || node.data.name || nodeType,
            nodeType,
            status,
            duration: Date.now() - startTime,
            startTime,
            endTime: Date.now(),
            logs,
        };
    }

    /**
     * Create a failed execution result
     */
    private createFailedResult(
        flow: ParsedFlow,
        config: ExecutionConfig,
        startTime: number,
        attempt: number,
        totalAttempts: number,
        error: ExecutionError,
        artifacts: any = { screenshots: [] }
    ): ExecutionResult {
        return {
            executionId: this.executionId,
            flowId: flow.id,
            flowName: flow.name,
            status: 'failed',
            steps: [],
            duration: Date.now() - startTime,
            startTime,
            endTime: Date.now(),
            error,
            artifacts,
            config,
            attempt,
            totalAttempts,
        };
    }

    /**
     * Create a passed execution result
     */
    private createPassedResult(
        flow: ParsedFlow,
        config: ExecutionConfig,
        startTime: number,
        attempt: number,
        totalAttempts: number,
        steps: StepResult[]
    ): ExecutionResult {
        return {
            executionId: this.executionId,
            flowId: flow.id,
            flowName: flow.name,
            status: 'passed',
            steps,
            duration: Date.now() - startTime,
            startTime,
            endTime: Date.now(),
            artifacts: { screenshots: [] },
            config,
            attempt,
            totalAttempts,
        };
    }

    /**
     * Delay utility
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Wait for resume signal (debug mode)
     */
    private async waitForResume(): Promise<void> {
        while (this.pauseRequested && !this.cancelled) {
            await this.delay(100);
        }
    }
}

/**
 * Parse a test flow from database format to ParsedFlow
 */
export function parseFlow(testFlow: { id: string; name: string; nodes?: string; edges?: string }): ParsedFlow {
    let nodes: FlowNode[] = [];
    let edges: FlowEdge[] = [];

    if (testFlow.nodes) {
        try {
            nodes = JSON.parse(testFlow.nodes);
        } catch {
            logger.warn('Failed to parse flow nodes');
        }
    }

    if (testFlow.edges) {
        try {
            edges = JSON.parse(testFlow.edges);
        } catch {
            logger.warn('Failed to parse flow edges');
        }
    }

    return {
        id: testFlow.id,
        name: testFlow.name,
        nodes,
        edges,
    };
}
