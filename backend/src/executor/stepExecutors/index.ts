/**
 * Step Executors Index
 * Registry mapping node types to their executor functions
 */

import { Page, BrowserContext } from 'playwright';
import { FlowNodeData, LoopContext } from '@playwright-web-app/shared';
import { VariableContext } from '../variableContext';

// Import executors
import { navigationExecutors, NavigationContext } from './navigationExecutor';
import { clickExecutors, ClickContext } from './clickExecutor';
import { inputExecutors, InputContext } from './inputExecutor';
import { assertionExecutors, AssertionContext } from './assertionExecutor';
import { waitExecutors, WaitContext } from './waitExecutor';
import { dataExecutors, DataContext } from './dataExecutor';

// Re-export control flow utilities
export * from './controlFlowExecutor';
export * from './locatorBuilder';

/**
 * Unified execution context
 */
export interface StepExecutionContext {
    page: Page;
    context: BrowserContext;
    variables: VariableContext;
    pages: Page[];
    loopStack: LoopContext[];
    logs: string[];
    highlightElements?: boolean;
    setPage: (page: Page) => void;
}

/**
 * Step executor function type
 */
export type StepExecutor = (
    data: FlowNodeData,
    ctx: StepExecutionContext
) => Promise<void>;

/**
 * Check if a node type is a control flow node
 */
export function isControlFlowNode(nodeType: string): boolean {
    return [
        'if',
        'else',
        'for-loop',
        'for-each',
        'while-loop',
        'break',
        'continue',
        'try-catch',
        'pass',
        'fail',
        'start',
        'end',
        'group',
    ].includes(nodeType);
}

/**
 * Check if a node type is a loop node
 */
export function isLoopNode(nodeType: string): boolean {
    return ['for-loop', 'for-each', 'while-loop'].includes(nodeType);
}

/**
 * Check if a node type is a conditional node
 */
export function isConditionalNode(nodeType: string): boolean {
    return ['if'].includes(nodeType);
}

/**
 * Get step executor for a node type
 */
export function getStepExecutor(nodeType: string): StepExecutor | null {
    // Map node type to appropriate executor
    const actionType = normalizeNodeType(nodeType);

    // Check navigation executors
    if (navigationExecutors[actionType]) {
        return async (data, ctx) => {
            const navCtx: NavigationContext = {
                page: ctx.page,
                context: ctx.context,
                variables: ctx.variables,
                pages: ctx.pages,
                setPage: ctx.setPage,
            };
            await navigationExecutors[actionType](data, navCtx);
        };
    }

    // Check click executors
    if (clickExecutors[actionType]) {
        return async (data, ctx) => {
            const clickCtx: ClickContext = {
                page: ctx.page,
                variables: ctx.variables,
                highlightElements: ctx.highlightElements,
            };
            await clickExecutors[actionType](data, clickCtx);
        };
    }

    // Check input executors
    if (inputExecutors[actionType]) {
        return async (data, ctx) => {
            const inputCtx: InputContext = {
                page: ctx.page,
                variables: ctx.variables,
                highlightElements: ctx.highlightElements,
            };
            await inputExecutors[actionType](data, inputCtx);
        };
    }

    // Check assertion executors
    if (assertionExecutors[actionType]) {
        return async (data, ctx) => {
            const assertCtx: AssertionContext = {
                page: ctx.page,
                variables: ctx.variables,
            };
            await assertionExecutors[actionType](data, assertCtx);
        };
    }

    // Check wait executors
    if (waitExecutors[actionType]) {
        return async (data, ctx) => {
            const waitCtx: WaitContext = {
                page: ctx.page,
                variables: ctx.variables,
            };
            await waitExecutors[actionType](data, waitCtx);
        };
    }

    // Check data executors
    if (dataExecutors[actionType]) {
        return async (data, ctx) => {
            const dataCtx: DataContext = {
                page: ctx.page,
                variables: ctx.variables,
                logs: ctx.logs,
            };
            await dataExecutors[actionType](data, dataCtx);
        };
    }

    return null;
}

/**
 * Normalize node type to match executor registry
 * Handles variations like actionType vs type
 */
function normalizeNodeType(nodeType: string): string {
    // Common normalizations
    const normalizations: Record<string, string> = {
        'goto': 'navigate',
        'navigation': 'navigate',
        'doubleClick': 'dblclick',
        'doubleclick': 'dblclick',
        'rightClick': 'right-click',
        'rightclick': 'right-click',
        'setVariable': 'set-variable',
        'getUrl': 'get-url',
        'getTitle': 'get-title',
        'waitForElement': 'wait-for-element',
        'waitTime': 'wait-time',
        'pressKey': 'press-key',
        'uploadFile': 'upload-file',
        'selectOption': 'select-option',
        'extractText': 'extract-text',
        'extractAttribute': 'extract-attribute',
        'evaluateJs': 'evaluate-js',
        'assertVisible': 'assert-visible',
        'assertHidden': 'assert-hidden',
        'assertText': 'assert-text',
        'assertValue': 'assert-value',
        'assertUrl': 'assert-url',
        'assertTitle': 'assert-title',
        'assertCount': 'assert-count',
        'assertEnabled': 'assert-enabled',
        'assertDisabled': 'assert-disabled',
        'assertChecked': 'assert-checked',
        'forLoop': 'for-loop',
        'forEach': 'for-each',
        'whileLoop': 'while-loop',
    };

    return normalizations[nodeType] || nodeType;
}

/**
 * Get all supported node types
 */
export function getSupportedNodeTypes(): string[] {
    return [
        // Navigation
        'navigate', 'go-back', 'go-forward', 'reload', 'new-page', 'close-page', 'switch-tab',
        // Click/Mouse
        'click', 'dblclick', 'right-click', 'hover', 'focus', 'blur', 'drag-and-drop',
        'mouse-move', 'mouse-down', 'mouse-up', 'scroll',
        // Input
        'fill', 'type', 'clear', 'press-key', 'check', 'uncheck', 'set-checked',
        'select-option', 'upload-file',
        // Assertions
        'assert-visible', 'assert-hidden', 'assert-text', 'assert-value', 'assert-attribute',
        'assert-enabled', 'assert-disabled', 'assert-checked', 'assert-count',
        'assert-url', 'assert-title', 'assert-exists',
        // Wait
        'wait-time', 'wait-for-element', 'wait-for-url', 'wait-for-load-state',
        'wait-for-response', 'wait-for-function',
        // Data
        'set-variable', 'extract-text', 'extract-attribute', 'extract-value',
        'get-url', 'get-title', 'get-element-count', 'log', 'evaluate-js',
        // Control Flow
        'if', 'else', 'for-loop', 'for-each', 'while-loop', 'break', 'continue',
        'pass', 'fail', 'try-catch', 'group',
        // Special
        'start', 'end', 'subflow',
    ];
}

/**
 * Check if a node type is supported
 */
export function isNodeTypeSupported(nodeType: string): boolean {
    const normalized = normalizeNodeType(nodeType);
    return getSupportedNodeTypes().includes(normalized) ||
        getStepExecutor(normalized) !== null ||
        isControlFlowNode(normalized);
}
