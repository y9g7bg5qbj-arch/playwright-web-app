/**
 * Control Flow Executor
 * Handles control flow actions: if/else, loops, break, continue, pass, fail
 */

import { Page } from 'playwright';
import { FlowNodeData, FlowNode, FlowEdge, LoopContext } from '@playwright-web-app/shared';
import { VariableContext } from '../variableContext';
import { buildLocator, elementExists } from './locatorBuilder';

export interface ControlFlowContext {
    page: Page;
    variables: VariableContext;
    loopStack: LoopContext[];
    logs: string[];
}

export interface ConditionResult {
    result: boolean;
    description: string;
}

/**
 * Evaluate an if/else condition
 */
export async function evaluateCondition(
    data: FlowNodeData,
    ctx: ControlFlowContext
): Promise<ConditionResult> {
    const conditionType = data.conditionType || 'element';

    switch (conditionType) {
        case 'element':
            return evaluateElementCondition(data, ctx);
        case 'variable':
            return evaluateVariableCondition(data, ctx);
        case 'expression':
            return evaluateExpressionCondition(data, ctx);
        default:
            return { result: false, description: `Unknown condition type: ${conditionType}` };
    }
}

/**
 * Evaluate element-based condition
 */
async function evaluateElementCondition(
    data: FlowNodeData,
    ctx: ControlFlowContext
): Promise<ConditionResult> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const elementCondition = data.elementCondition || 'visible';
    const timeout = data.timeout || 5000;

    let result = false;
    let description = '';

    try {
        switch (elementCondition) {
            case 'visible':
                await locator.waitFor({ state: 'visible', timeout });
                result = true;
                description = 'Element is visible';
                break;

            case 'hidden':
                await locator.waitFor({ state: 'hidden', timeout });
                result = true;
                description = 'Element is hidden';
                break;

            case 'enabled':
                result = await locator.isEnabled({ timeout });
                description = result ? 'Element is enabled' : 'Element is not enabled';
                break;

            case 'disabled':
                result = await locator.isDisabled({ timeout });
                description = result ? 'Element is disabled' : 'Element is not disabled';
                break;

            case 'checked':
                result = await locator.isChecked({ timeout });
                description = result ? 'Element is checked' : 'Element is not checked';
                break;

            case 'exists':
                result = await elementExists(locator, timeout);
                description = result ? 'Element exists in DOM' : 'Element does not exist';
                break;

            default:
                result = await locator.isVisible({ timeout });
                description = result ? 'Element is visible' : 'Element is not visible';
        }
    } catch (error) {
        result = false;
        description = `Condition check failed: ${error}`;
    }

    return { result, description };
}

/**
 * Evaluate variable-based condition
 */
async function evaluateVariableCondition(
    data: FlowNodeData,
    ctx: ControlFlowContext
): Promise<ConditionResult> {
    const variableName = data.variableName || '';
    const operator = data.operator || 'equals';
    const compareValue = ctx.variables.resolve(data.compareValue || '');

    const actualValue = ctx.variables.get(variableName);
    let result = false;
    let description = '';

    switch (operator) {
        case 'equals':
            result = String(actualValue) === String(compareValue);
            description = `${variableName} (${actualValue}) == ${compareValue}: ${result}`;
            break;

        case 'notEquals':
            result = String(actualValue) !== String(compareValue);
            description = `${variableName} (${actualValue}) != ${compareValue}: ${result}`;
            break;

        case 'contains':
            result = String(actualValue).includes(String(compareValue));
            description = `${variableName} contains "${compareValue}": ${result}`;
            break;

        case 'startsWith':
            result = String(actualValue).startsWith(String(compareValue));
            description = `${variableName} starts with "${compareValue}": ${result}`;
            break;

        case 'endsWith':
            result = String(actualValue).endsWith(String(compareValue));
            description = `${variableName} ends with "${compareValue}": ${result}`;
            break;

        case 'greaterThan':
            result = Number(actualValue) > Number(compareValue);
            description = `${variableName} (${actualValue}) > ${compareValue}: ${result}`;
            break;

        case 'lessThan':
            result = Number(actualValue) < Number(compareValue);
            description = `${variableName} (${actualValue}) < ${compareValue}: ${result}`;
            break;

        case 'greaterOrEqual':
            result = Number(actualValue) >= Number(compareValue);
            description = `${variableName} (${actualValue}) >= ${compareValue}: ${result}`;
            break;

        case 'lessOrEqual':
            result = Number(actualValue) <= Number(compareValue);
            description = `${variableName} (${actualValue}) <= ${compareValue}: ${result}`;
            break;

        case 'isEmpty':
            result = actualValue === undefined || actualValue === null || actualValue === '';
            description = `${variableName} is empty: ${result}`;
            break;

        case 'isNotEmpty':
            result = actualValue !== undefined && actualValue !== null && actualValue !== '';
            description = `${variableName} is not empty: ${result}`;
            break;

        case 'isTrue':
            result = actualValue === true || actualValue === 'true';
            description = `${variableName} is true: ${result}`;
            break;

        case 'isFalse':
            result = actualValue === false || actualValue === 'false';
            description = `${variableName} is false: ${result}`;
            break;

        default:
            result = String(actualValue) === String(compareValue);
            description = `${variableName} == ${compareValue}: ${result}`;
    }

    return { result, description };
}

/**
 * Evaluate JavaScript expression condition
 */
async function evaluateExpressionCondition(
    data: FlowNodeData,
    ctx: ControlFlowContext
): Promise<ConditionResult> {
    const expression = data.expression || 'false';

    try {
        const result = ctx.variables.evaluateExpression(expression);
        return {
            result: Boolean(result),
            description: `Expression "${expression}" = ${result}`,
        };
    } catch (error) {
        return {
            result: false,
            description: `Expression error: ${error}`,
        };
    }
}

/**
 * Create loop context for for-loop (count-based)
 */
export function createForLoopContext(
    nodeId: string,
    data: FlowNodeData
): LoopContext {
    const count = data.count ?? 5;

    return {
        nodeId,
        loopType: 'count',
        currentIndex: 0,
        maxIterations: count,
        shouldBreak: false,
        shouldContinue: false,
    };
}

/**
 * Create loop context for for-each loop
 */
export function createForEachLoopContext(
    nodeId: string,
    data: FlowNodeData,
    variables: VariableContext
): LoopContext {
    let items: any[] = [];

    if (data.collectionType === 'variable') {
        const collection = variables.get(data.collectionVariable || '');
        if (Array.isArray(collection)) {
            items = collection;
        }
    }
    // Note: For DOM elements, items will be set during execution

    return {
        nodeId,
        loopType: 'forEach',
        currentIndex: 0,
        maxIterations: items.length || data.maxIterations || 100,
        items,
        shouldBreak: false,
        shouldContinue: false,
    };
}

/**
 * Create loop context for while loop
 */
export function createWhileLoopContext(
    nodeId: string,
    data: FlowNodeData
): LoopContext {
    return {
        nodeId,
        loopType: 'while',
        currentIndex: 0,
        maxIterations: data.maxIterations || 100,
        shouldBreak: false,
        shouldContinue: false,
    };
}

/**
 * Check if loop should continue
 */
export async function shouldContinueLoop(
    loop: LoopContext,
    data: FlowNodeData,
    ctx: ControlFlowContext
): Promise<boolean> {
    // Check break flag
    if (loop.shouldBreak) {
        return false;
    }

    // Check max iterations (safety limit)
    if (loop.currentIndex >= loop.maxIterations) {
        ctx.logs.push(`Loop reached max iterations (${loop.maxIterations})`);
        return false;
    }

    switch (loop.loopType) {
        case 'count':
            return loop.currentIndex < (data.count ?? loop.maxIterations);

        case 'forEach':
            if (loop.items) {
                return loop.currentIndex < loop.items.length;
            }
            return false;

        case 'while':
            const condition = await evaluateCondition(data, ctx);
            ctx.logs.push(`While condition: ${condition.description}`);
            return condition.result;

        default:
            return false;
    }
}

/**
 * Advance loop to next iteration
 */
export function advanceLoop(
    loop: LoopContext,
    data: FlowNodeData,
    variables: VariableContext
): void {
    loop.currentIndex++;
    loop.shouldContinue = false;

    // Update loop variables
    const indexVar = data.indexVariable || 'index';
    variables.set(indexVar, loop.currentIndex);

    if (loop.loopType === 'forEach' && loop.items) {
        const itemVar = data.itemVariable || 'item';
        if (loop.currentIndex < loop.items.length) {
            variables.set(itemVar, loop.items[loop.currentIndex]);
        }
    }
}

/**
 * Initialize loop variables for first iteration
 */
export function initializeLoopVariables(
    loop: LoopContext,
    data: FlowNodeData,
    variables: VariableContext
): void {
    const indexVar = data.indexVariable || 'index';
    variables.set(indexVar, 0);

    if (loop.loopType === 'forEach' && loop.items && loop.items.length > 0) {
        const itemVar = data.itemVariable || 'item';
        variables.set(itemVar, loop.items[0]);
    }
}

/**
 * Execute break action
 */
export function executeBreak(ctx: ControlFlowContext): void {
    if (ctx.loopStack.length > 0) {
        const currentLoop = ctx.loopStack[ctx.loopStack.length - 1];
        currentLoop.shouldBreak = true;
        ctx.logs.push('Break: Exiting loop');
    } else {
        ctx.logs.push('Break: No active loop to break from');
    }
}

/**
 * Execute continue action
 */
export function executeContinue(ctx: ControlFlowContext): void {
    if (ctx.loopStack.length > 0) {
        const currentLoop = ctx.loopStack[ctx.loopStack.length - 1];
        currentLoop.shouldContinue = true;
        ctx.logs.push('Continue: Skipping to next iteration');
    } else {
        ctx.logs.push('Continue: No active loop');
    }
}

/**
 * Execute pass (mark test as passed) action
 */
export function executePass(data: FlowNodeData, ctx: ControlFlowContext): never {
    const message = ctx.variables.resolve(data.message || 'Test passed');
    ctx.logs.push(`PASS: ${message}`);

    const error: any = new Error(message);
    error.isPass = true;
    throw error;
}

/**
 * Execute fail (mark test as failed) action
 */
export function executeFail(data: FlowNodeData, ctx: ControlFlowContext): never {
    const message = ctx.variables.resolve(data.message || 'Test failed');
    ctx.logs.push(`FAIL: ${message}`);

    throw new Error(`Test failed: ${message}`);
}

/**
 * Get the branch to follow for a conditional node
 */
export function getConditionBranch(result: boolean): string {
    return result ? 'true' : 'false';
}

/**
 * Check if current loop should skip remaining steps (continue was called)
 */
export function shouldSkipRemainingSteps(ctx: ControlFlowContext): boolean {
    if (ctx.loopStack.length > 0) {
        const currentLoop = ctx.loopStack[ctx.loopStack.length - 1];
        return currentLoop.shouldContinue || currentLoop.shouldBreak;
    }
    return false;
}
