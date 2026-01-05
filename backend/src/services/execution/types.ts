/**
 * Execution Engine Types
 * Core types for the Vero test automation backend execution engine
 */

// Browser types supported by Playwright
export type BrowserType = 'chromium' | 'firefox' | 'webkit';

// Screenshot modes
export type ScreenshotMode = 'off' | 'on' | 'only-on-failure';

// Tracing modes
export type TracingMode = 'off' | 'on' | 'on-first-retry' | 'retain-on-failure';

// Video modes
export type VideoMode = 'off' | 'on' | 'retain-on-failure';

// Test status
export type TestStatus = 'passed' | 'failed' | 'skipped' | 'flaky' | 'pending' | 'running' | 'cancelled';

/**
 * Execution Options - configuration for running tests
 */
export interface ExecutionOptions {
    browser: BrowserType;
    headless: boolean;
    viewport: { width: number; height: number };
    timeout: number;
    retries: number;
    tracing: boolean;
    video: boolean;
    screenshot: ScreenshotMode;

    // Additional options
    device?: string;  // Device emulation name
    locale?: string;
    timezone?: string;
    geolocation?: { latitude: number; longitude: number };
    permissions?: string[];
    colorScheme?: 'light' | 'dark' | 'no-preference';

    // Parallel execution
    workers?: number;

    // Environment
    baseUrl?: string;
    extraHTTPHeaders?: Record<string, string>;

    // Storage state
    storageState?: string;  // Path to storage state JSON

    // Slow motion for debugging
    slowMo?: number;
}

/**
 * Default execution options
 */
export const DEFAULT_EXECUTION_OPTIONS: ExecutionOptions = {
    browser: 'chromium',
    headless: false,
    viewport: { width: 1280, height: 720 },
    timeout: 30000,
    retries: 0,
    tracing: true,
    video: false,
    screenshot: 'only-on-failure',
    workers: 1,
};

/**
 * Browser context options
 */
export interface BrowserOptions {
    headless?: boolean;
    slowMo?: number;
    viewport?: { width: number; height: number };
    device?: string;
    locale?: string;
    timezone?: string;
    geolocation?: { latitude: number; longitude: number };
    permissions?: string[];
    colorScheme?: 'light' | 'dark' | 'no-preference';
    storageState?: string;
    extraHTTPHeaders?: Record<string, string>;
    recordVideo?: {
        dir: string;
        size?: { width: number; height: number };
    };
}

/**
 * Artifact reference - pointer to stored artifact
 */
export interface ArtifactRef {
    id: string;
    testId: string;
    runId?: string;
    type: 'trace' | 'screenshot' | 'video' | 'html' | 'json' | 'log';
    name: string;
    path: string;
    size: number;
    mimeType: string;
    createdAt: Date;
    metadata?: Record<string, any>;
}

/**
 * Test result - outcome of a single test execution
 */
export interface TestResult {
    id: string;
    runId: string;
    testFile: string;
    testName: string;
    status: TestStatus;
    duration: number;
    startedAt: Date;
    completedAt: Date;
    error?: {
        message: string;
        stack?: string;
        screenshot?: string;
        diff?: string;  // For visual comparison failures
    };
    artifacts: ArtifactRef[];
    retries: number;
    browser: BrowserType;
    workerId?: string;

    // Step-level details
    steps?: TestStepResult[];

    // Tags and metadata
    tags?: string[];
    metadata?: Record<string, any>;

    // Retry information
    retryOf?: string;  // ID of original test if this is a retry
    retriedBy?: string;  // ID of retry test if this was retried
}

/**
 * Test step result - outcome of a single step within a test
 */
export interface TestStepResult {
    id: string;
    testId: string;
    stepNumber: number;
    name: string;
    action: string;
    selector?: string;
    value?: string;
    status: TestStatus;
    duration: number;
    startedAt: Date;
    completedAt: Date;
    error?: {
        message: string;
        stack?: string;
    };
    screenshot?: string;
    beforeScreenshot?: string;
    afterScreenshot?: string;
}

/**
 * Test run - collection of test results for a single execution run
 */
export interface TestRun {
    id: string;
    status: TestStatus;
    startedAt: Date;
    completedAt?: Date;
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
    duration: number;
    config: ExecutionOptions;
    artifacts: ArtifactRef[];
    tests: string[];  // Test IDs

    // Metadata
    name?: string;
    description?: string;
    tags?: string[];
    environment?: string;

    // CI/CD info
    branch?: string;
    commit?: string;
    buildId?: string;
}

/**
 * Run summary - aggregated statistics for a test run
 */
export interface RunSummary {
    runId: string;
    status: TestStatus;
    duration: number;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
    passRate: number;  // 0-100
    startedAt: Date;
    completedAt?: Date;

    // Failures breakdown
    failedTests: Array<{
        testFile: string;
        testName: string;
        error: string;
    }>;

    // Flaky tests
    flakyTests: Array<{
        testFile: string;
        testName: string;
        retriesNeeded: number;
    }>;
}

/**
 * Flaky test info - test that passes after retries
 */
export interface FlakyTest {
    testFile: string;
    testName: string;
    flakyCount: number;
    totalRuns: number;
    flakyRate: number;  // 0-100
    lastOccurrence: Date;
    recentErrors: string[];
}

/**
 * Trend data - historical test data
 */
export interface TrendData {
    testFile: string;
    testName: string;
    dataPoints: Array<{
        date: Date;
        status: TestStatus;
        duration: number;
        runId: string;
    }>;
    averageDuration: number;
    passRate: number;
    trendDirection: 'improving' | 'stable' | 'degrading';
}

/**
 * Date range for queries
 */
export interface DateRange {
    from: Date;
    to: Date;
}

/**
 * Execution status - real-time execution state
 */
export interface ExecutionStatus {
    runId: string;
    status: 'queued' | 'running' | 'completed' | 'cancelled' | 'failed';
    progress: {
        completed: number;
        total: number;
        percentage: number;
    };
    currentTest?: {
        testFile: string;
        testName: string;
        startedAt: Date;
    };
    workerStates?: Record<string, {
        workerId: string;
        status: 'idle' | 'running';
        currentTest?: string;
    }>;
    startedAt: Date;
    estimatedCompletion?: Date;
}

/**
 * Trace data - parsed trace file contents
 */
export interface TraceData {
    traceId: string;
    testId: string;
    actions: TraceAction[];
    screenshots: TraceScreenshot[];
    networkRequests: TraceNetworkRequest[];
    consoleMessages: TraceConsoleMessage[];
    errors: TraceError[];
    metadata: {
        title: string;
        startTime: number;
        endTime: number;
        browserName: string;
        browserVersion: string;
        platform: string;
        viewport: { width: number; height: number };
    };
}

/**
 * Trace action - single action recorded in trace
 */
export interface TraceAction {
    id: string;
    type: string;  // 'click', 'fill', 'navigate', etc.
    selector?: string;
    value?: string;
    url?: string;
    startTime: number;
    endTime: number;
    duration: number;
    status: 'passed' | 'failed';
    error?: string;
    screenshotIndex?: number;
    beforeSnapshotIndex?: number;
    afterSnapshotIndex?: number;
}

/**
 * Trace screenshot
 */
export interface TraceScreenshot {
    index: number;
    timestamp: number;
    sha1: string;
    width: number;
    height: number;
}

/**
 * Trace network request
 */
export interface TraceNetworkRequest {
    requestId: string;
    url: string;
    method: string;
    status?: number;
    statusText?: string;
    headers: Record<string, string>;
    responseHeaders?: Record<string, string>;
    startTime: number;
    endTime?: number;
    duration?: number;
    resourceType: string;
    size?: number;
    transferSize?: number;
    failure?: string;
}

/**
 * Trace console message
 */
export interface TraceConsoleMessage {
    type: 'log' | 'info' | 'warn' | 'error' | 'debug';
    text: string;
    location?: {
        url: string;
        lineNumber: number;
        columnNumber: number;
    };
    timestamp: number;
}

/**
 * Trace error
 */
export interface TraceError {
    message: string;
    stack?: string;
    timestamp: number;
    actionId?: string;
}

/**
 * Slow action info
 */
export interface SlowAction {
    actionId: string;
    type: string;
    selector?: string;
    duration: number;
    threshold: number;
    percentileRank?: number;
}

/**
 * Network stats
 */
export interface NetworkStats {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalSize: number;
    totalTransferSize: number;
    averageResponseTime: number;
    slowestRequests: Array<{
        url: string;
        duration: number;
        status?: number;
    }>;
    requestsByType: Record<string, number>;
    requestsByStatus: Record<string, number>;
}

/**
 * Trace diff - comparison between two traces
 */
export interface TraceDiff {
    trace1Id: string;
    trace2Id: string;
    actionDiffs: Array<{
        type: 'added' | 'removed' | 'modified';
        action1?: TraceAction;
        action2?: TraceAction;
        changes?: string[];
    }>;
    timingDiffs: Array<{
        actionType: string;
        duration1: number;
        duration2: number;
        percentChange: number;
    }>;
    networkDiffs: {
        addedRequests: string[];
        removedRequests: string[];
        changedResponses: Array<{
            url: string;
            oldStatus: number;
            newStatus: number;
        }>;
    };
}

/**
 * Failure info - detailed failure analysis from trace
 */
export interface FailureInfo {
    actionId: string;
    actionType: string;
    selector?: string;
    error: string;
    timestamp: number;
    screenshotPath?: string;
    domSnapshot?: string;
    suggestion?: string;  // AI-generated fix suggestion
}

/**
 * Execution events - WebSocket event types
 */
export interface ExecutionEvents {
    'execution:started': { runId: string; testCount: number };
    'test:started': { runId: string; testId: string; testName: string };
    'test:step': { runId: string; testId: string; step: string; screenshot?: string };
    'test:completed': { runId: string; testId: string; result: TestResult };
    'execution:completed': { runId: string; summary: RunSummary };
    'execution:error': { runId: string; error: string };
    'execution:cancelled': { runId: string };
    'execution:progress': { runId: string; completed: number; total: number };
}
