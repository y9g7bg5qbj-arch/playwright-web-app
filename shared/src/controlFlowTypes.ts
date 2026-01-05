// Control Flow Types for Playwright Visual IDE
// Extends execution.ts types with control-flow specific functionality

import { FlowNode, FlowEdge, FlowNodeData } from './execution';

// Re-export base types for convenience
export type { FlowNode, FlowEdge, FlowNodeData };

/**
 * Condition types for IF/ELSE blocks
 */
export type ConditionType =
    | 'elementExists'
    | 'elementVisible'
    | 'elementHidden'
    | 'elementEnabled'
    | 'elementDisabled'
    | 'elementChecked'
    | 'textContains'
    | 'variableComparison'
    | 'customExpression';

/**
 * Variable comparison operators
 */
export type ComparisonOperator =
    | 'equals'
    | 'notEquals'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'greaterThan'
    | 'lessThan'
    | 'greaterOrEqual'
    | 'lessOrEqual'
    | 'isEmpty'
    | 'isNotEmpty'
    | 'isTrue'
    | 'isFalse';

/**
 * Condition configuration for IF/ELSE and WHILE blocks
 */
export interface ConditionConfig {
    conditionType: ConditionType;
    // Element conditions
    selector?: string;
    locatorStrategy?: string;
    elementCondition?: 'visible' | 'hidden' | 'enabled' | 'disabled' | 'checked' | 'exists';
    // Variable conditions
    variableName?: string;
    operator?: ComparisonOperator;
    compareValue?: string;
    // Custom expression
    expression?: string;
}

/**
 * Loop types for loop blocks
 */
export type LoopType =
    | 'forCount'      // for (let i = 0; i < n; i++)
    | 'forEach'       // for (const item of array)
    | 'forElements'   // for (const el of page.locator().all())
    | 'whileCondition'; // while (condition)

/**
 * Loop configuration
 */
export interface LoopConfig {
    loopType: LoopType;
    // For count loops
    count?: number;
    indexVariable?: string;
    // For each loops
    collectionType?: 'variable' | 'elements';
    collectionVariable?: string;
    itemVariable?: string;
    selector?: string;
    // While loops
    condition?: ConditionConfig;
    maxIterations?: number;
}

/**
 * Control flow node types
 */
export type ControlFlowNodeType =
    | 'if'
    | 'else'
    | 'for-loop'
    | 'for-each'
    | 'while-loop'
    | 'break'
    | 'continue'
    | 'try-catch'
    | 'group';

/**
 * Complete flow data structure
 */
export interface FlowData {
    nodes: FlowNode[];
    edges: FlowEdge[];
}

/**
 * Execution context maintained during flow runtime
 */
export interface FlowExecutionContext {
    /** Variables dictionary */
    variables: Record<string, any>;
    /** Active loop iterators */
    iterators: Map<string, LoopIterator>;
    /** Break flag for exiting loops */
    breakFlag: boolean;
    /** Continue flag for skipping to next iteration */
    continueFlag: boolean;
    /** Current page reference (set at runtime) */
    page?: any;
    /** Browser context (set at runtime) */
    context?: any;
}

/**
 * Loop iterator state
 */
export interface LoopIterator {
    index: number;
    items: any[];
    loopNodeId: string;
}

/**
 * Result of condition evaluation
 */
export interface ConditionResult {
    success: boolean;
    value: boolean;
    error?: string;
}

/**
 * Result of action execution
 */
export interface ActionResult {
    success: boolean;
    duration: number;
    error?: string;
    screenshot?: string;
}

/**
 * Flow execution result (extended)
 */
export interface FlowExecutionResultExtended {
    success: boolean;
    duration: number;
    stepsExecuted: number;
    stepsFailed: number;
    error?: string;
    logs: ExecutionLogEntry[];
}

/**
 * Execution log entry
 */
export interface ExecutionLogEntry {
    timestamp: Date;
    nodeId: string;
    action: string;
    message: string;
    level: 'info' | 'warn' | 'error';
    duration?: number;
}

/**
 * Helper type guard for control flow nodes
 */
export function isControlFlowNode(actionType: string): boolean {
    const controlTypes = ['if', 'for-loop', 'for-each', 'while-loop', 'try-catch', 'break', 'continue', 'group'];
    return controlTypes.includes(actionType);
}

/**
 * Helper to check if a node is a loop type
 */
export function isLoopNode(actionType: string): boolean {
    return ['for-loop', 'for-each', 'while-loop'].includes(actionType);
}

/**
 * Helper to check if a node has branching (If/Else, Try/Catch)
 */
export function isBranchingNode(actionType: string): boolean {
    return ['if', 'try-catch'].includes(actionType);
}
