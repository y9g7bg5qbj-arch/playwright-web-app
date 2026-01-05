/**
 * Execution Engine Types
 * Production-grade types for flow execution with Playwright
 */

// ============================================
// DATA SOURCE CONFIGURATION
// ============================================

export interface DataSourceConfig {
    type: 'inline' | 'csv' | 'json' | 'excel' | 'api';
    /** Path or URL to data file */
    path?: string;
    /** Inline data array */
    data?: Record<string, any>[];
    /** Sheet name for Excel files */
    sheet?: string;
    /** Whether to iterate over data rows */
    iterate?: boolean;
}

// ============================================
// EXECUTION CONFIGURATION
// ============================================

export interface ExecutionConfig {
    flowId: string;

    // Browser configuration
    browser: 'chromium' | 'firefox' | 'webkit';
    headless: boolean;
    viewport?: { width: number; height: number };
    device?: string;  // 'iPhone 13', 'Pixel 5', etc.

    // Tracing configuration
    trace: 'on' | 'off' | 'on-first-retry' | 'retain-on-failure';
    screenshot: 'on' | 'off' | 'only-on-failure';
    video: 'on' | 'off' | 'retain-on-failure';

    // Execution settings
    timeout: number;
    retries: number;
    workers: number;  // For parallel execution (future)

    // Data injection
    dataSource?: DataSourceConfig;
    variables?: Record<string, any>;
    environment?: 'dev' | 'staging' | 'prod';
    environmentVariables?: Record<string, string>;

    // Debug mode
    debugMode?: boolean;
    breakpoints?: string[];  // Node IDs to pause at
}

export const DEFAULT_EXECUTION_CONFIG: Partial<ExecutionConfig> = {
    browser: 'chromium',
    headless: false,
    viewport: { width: 1280, height: 720 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    timeout: 30000,
    retries: 0,
    workers: 1,
    environment: 'dev',
};

// ============================================
// EXECUTION ERROR
// ============================================

export interface ExecutionError {
    message: string;
    stack?: string;
    code?: string;
    screenshot?: string;  // Base64 or path
    nodeId?: string;
    nodeName?: string;
}

// ============================================
// STEP ARTIFACTS
// ============================================

export interface StepArtifacts {
    screenshot?: string;  // Path to screenshot
    screenshotBase64?: string;
    beforeScreenshot?: string;
    afterScreenshot?: string;
}

// ============================================
// STEP RESULT
// ============================================

export type StepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface StepResult {
    nodeId: string;
    nodeName: string;
    nodeType: string;
    status: StepStatus;
    duration: number;
    startTime: number;
    endTime?: number;
    error?: ExecutionError;
    logs: string[];
    artifacts?: StepArtifacts;

    // For data-driven/loops
    iteration?: number;
    iterationData?: Record<string, any>;
}

// ============================================
// EXECUTION ARTIFACTS
// ============================================

export interface ExecutionArtifacts {
    trace?: string;  // Path to trace.zip
    video?: string;  // Path to video
    screenshots: string[];  // Paths to all screenshots
}

// ============================================
// EXECUTION RESULT
// ============================================

export type ExecutionResultStatus = 'passed' | 'failed' | 'cancelled' | 'running';

export interface ExecutionResult {
    executionId: string;
    flowId: string;
    flowName: string;
    status: ExecutionResultStatus;
    steps: StepResult[];
    duration: number;
    startTime: number;
    endTime?: number;
    error?: ExecutionError;
    artifacts: ExecutionArtifacts;
    config: ExecutionConfig;
    attempt: number;
    totalAttempts: number;

    // Data iteration info
    currentIteration?: number;
    totalIterations?: number;
}

// ============================================
// FLOW NODE & EDGE TYPES
// ============================================

export interface FlowNodePosition {
    x: number;
    y: number;
}

export interface FlowNode {
    id: string;
    type: string;
    data: FlowNodeData;
    position: FlowNodePosition;
}

export interface FlowNodeData {
    label?: string;
    name?: string;
    actionType?: string;

    // Navigation
    url?: string;
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';

    // Locator configuration
    locatorStrategy?: string;
    selector?: string;
    text?: string;
    role?: string;
    testId?: string;
    placeholder?: string;
    ariaLabel?: string;  // For getByLabel locator
    altText?: string;
    title?: string;

    // Action options
    value?: string;
    force?: boolean;
    timeout?: number;
    modifiers?: string[];
    button?: 'left' | 'right' | 'middle';
    clickCount?: number;
    delay?: number;

    // Control flow
    conditionType?: 'element' | 'variable' | 'expression';
    elementCondition?: 'visible' | 'hidden' | 'enabled' | 'disabled' | 'checked' | 'exists';
    variableName?: string;
    operator?: string;
    compareValue?: string;
    expression?: string;

    // Loop
    loopType?: 'count' | 'forEach' | 'while';
    count?: number;
    maxIterations?: number;
    collectionVariable?: string;
    itemVariable?: string;
    indexVariable?: string;

    // Data
    storeAs?: string;
    attribute?: string;

    // Assertion
    matchType?: 'exact' | 'contains' | 'regex';
    expectedValue?: string;
    expectedText?: string;
    expectedUrl?: string;
    expectedTitle?: string;
    expectedCount?: number;
    not?: boolean;

    // Generic key-value for flexibility
    [key: string]: any;
}

export interface FlowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;  // 'true', 'false', 'default', 'loop-body', 'loop-exit'
    targetHandle?: string;
    label?: string;
    type?: string;
}

// ============================================
// PARSED FLOW
// ============================================

export interface ParsedFlow {
    id: string;
    name: string;
    nodes: FlowNode[];
    edges: FlowEdge[];
    startNodeId?: string;
    endNodeId?: string;
    variables?: Record<string, any>;
}

// ============================================
// EXECUTION CONTEXT (Internal)
// ============================================

export interface LoopContext {
    nodeId: string;
    loopType: 'count' | 'forEach' | 'while';
    currentIndex: number;
    maxIterations: number;
    items?: any[];
    shouldBreak: boolean;
    shouldContinue: boolean;
}

// ============================================
// WEBSOCKET EVENTS
// ============================================

export interface StepStartEvent {
    executionId: string;
    nodeId: string;
    nodeName: string;
    nodeType: string;
    stepIndex: number;
    totalSteps?: number;
}

export interface StepCompleteEvent {
    executionId: string;
    nodeId: string;
    nodeName: string;
    nodeType: string;
    status: StepStatus;
    duration: number;
    error?: ExecutionError;
    screenshot?: string;
}

export interface ExecutionProgressEvent {
    executionId: string;
    flowId: string;
    status: ExecutionResultStatus;
    completedSteps: number;
    totalSteps: number;
    currentNode?: string;
    currentIteration?: number;
    totalIterations?: number;
}

export interface ExecutionCompleteEvent {
    executionId: string;
    result: ExecutionResult;
}

// ============================================
// API TYPES
// ============================================

export interface ExecuteFlowRequest {
    config?: Partial<ExecutionConfig>;
    variables?: Record<string, any>;
}

export interface ExecuteFlowResponse {
    executionId: string;
    status: 'started' | 'queued';
    message: string;
}
