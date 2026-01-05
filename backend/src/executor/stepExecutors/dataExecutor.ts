/**
 * Data Executor
 * Handles data-related actions: set-variable, extract-text, extract-attribute, get-url, etc.
 */

import { Page } from 'playwright';
import { FlowNodeData } from '@playwright-web-app/shared';
import { VariableContext } from '../variableContext';
import { buildLocator } from './locatorBuilder';
import { logger } from '../../utils/logger';

export interface DataContext {
    page: Page;
    variables: VariableContext;
    logs: string[];
}

/**
 * Execute set variable action
 */
export async function executeSetVariable(
    data: FlowNodeData,
    ctx: DataContext
): Promise<void> {
    const name = data.name || data.variableName || '';
    const valueType = data.valueType || 'string';

    let value: any;

    switch (valueType) {
        case 'string':
            value = ctx.variables.resolve(data.value || '');
            break;
        case 'number':
            value = parseFloat(ctx.variables.resolve(data.value || '0'));
            break;
        case 'boolean':
            // Handle boolValue being explicitly set, or parse from string/boolean value
            if (data.boolValue !== undefined) {
                value = Boolean(data.boolValue);
            } else {
                const rawValue = data.value as any;
                value = rawValue === 'true' || rawValue === true;
            }
            break;
        case 'json':
            const jsonStr = ctx.variables.resolve(data.jsonValue || data.value || '{}');
            value = JSON.parse(jsonStr);
            break;
        case 'expression':
            value = ctx.variables.evaluateExpression(data.expression || data.value || '');
            break;
        default:
            value = ctx.variables.resolve(data.value || '');
    }

    ctx.variables.set(name, value);
    ctx.logs.push(`Set variable "${name}" = ${JSON.stringify(value)}`);
}

/**
 * Execute extract text action
 */
export async function executeExtractText(
    data: FlowNodeData,
    ctx: DataContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const variableName = data.storeAs || data.variable || 'extractedText';

    const text = await locator.textContent({ timeout: data.timeout });
    const trimmedText = text?.trim() || '';

    ctx.variables.set(variableName, trimmedText);
    ctx.logs.push(`Extracted text: "${trimmedText}" -> ${variableName}`);
}

/**
 * Execute extract inner text action
 */
export async function executeExtractInnerText(
    data: FlowNodeData,
    ctx: DataContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const variableName = data.storeAs || data.variable || 'extractedText';

    const text = await locator.innerText({ timeout: data.timeout });

    ctx.variables.set(variableName, text);
    ctx.logs.push(`Extracted inner text: "${text}" -> ${variableName}`);
}

/**
 * Execute extract attribute action
 */
export async function executeExtractAttribute(
    data: FlowNodeData,
    ctx: DataContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const attribute = data.attribute || 'value';
    const variableName = data.storeAs || data.variable || 'extractedAttribute';

    const value = await locator.getAttribute(attribute, { timeout: data.timeout });

    ctx.variables.set(variableName, value || '');
    ctx.logs.push(`Extracted attribute "${attribute}": "${value}" -> ${variableName}`);
}

/**
 * Execute extract input value action
 */
export async function executeExtractValue(
    data: FlowNodeData,
    ctx: DataContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const variableName = data.storeAs || data.variable || 'extractedValue';

    const value = await locator.inputValue({ timeout: data.timeout });

    ctx.variables.set(variableName, value);
    ctx.logs.push(`Extracted input value: "${value}" -> ${variableName}`);
}

/**
 * Execute get URL action
 */
export async function executeGetUrl(
    data: FlowNodeData,
    ctx: DataContext
): Promise<void> {
    const variableName = data.variable || data.storeAs || 'currentUrl';

    const url = ctx.page.url();

    ctx.variables.set(variableName, url);
    ctx.logs.push(`Got URL: "${url}" -> ${variableName}`);
}

/**
 * Execute get title action
 */
export async function executeGetTitle(
    data: FlowNodeData,
    ctx: DataContext
): Promise<void> {
    const variableName = data.variable || data.storeAs || 'pageTitle';

    const title = await ctx.page.title();

    ctx.variables.set(variableName, title);
    ctx.logs.push(`Got title: "${title}" -> ${variableName}`);
}

/**
 * Execute get element count action
 */
export async function executeGetElementCount(
    data: FlowNodeData,
    ctx: DataContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const variableName = data.variable || data.storeAs || 'elementCount';

    const count = await locator.count();

    ctx.variables.set(variableName, count);
    ctx.logs.push(`Got element count: ${count} -> ${variableName}`);
}

/**
 * Execute log action
 */
export async function executeLog(
    data: FlowNodeData,
    ctx: DataContext
): Promise<void> {
    const message = ctx.variables.resolve(data.message || data.value || '');
    const level = data.level || 'info';

    ctx.logs.push(`[${level.toUpperCase()}] ${message}`);

    switch (level) {
        case 'error':
            logger.error(message);
            break;
        case 'warn':
            logger.warn(message);
            break;
        default:
            logger.info(message);
    }
}

/**
 * Execute evaluate JavaScript action
 */
export async function executeEvaluateJs(
    data: FlowNodeData,
    ctx: DataContext
): Promise<void> {
    const expression = data.expression || data.code || '';
    const variableName = data.storeAs || data.variable;

    // Build argument object with current variables
    const args = ctx.variables.toObject();

    const result = await ctx.page.evaluate((evalData) => {
        // Create a function with the variables in scope
        const fn = new Function(...Object.keys(evalData.args), evalData.expression);
        return fn(...Object.values(evalData.args));
    }, { expression: `return (${expression})`, args });

    if (variableName) {
        ctx.variables.set(variableName, result);
        ctx.logs.push(`Evaluated JS -> ${variableName} = ${JSON.stringify(result)}`);
    } else {
        ctx.logs.push(`Evaluated JS: ${JSON.stringify(result)}`);
    }
}

/**
 * Execute store value action (alias for set-variable)
 */
export async function executeStoreValue(
    data: FlowNodeData,
    ctx: DataContext
): Promise<void> {
    await executeSetVariable(data, ctx);
}

/**
 * Execute get all text from elements action
 */
export async function executeGetAllTexts(
    data: FlowNodeData,
    ctx: DataContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const variableName = data.variable || data.storeAs || 'allTexts';

    const texts = await locator.allTextContents();

    ctx.variables.set(variableName, texts);
    ctx.logs.push(`Got all texts: [${texts.length} items] -> ${variableName}`);
}

/**
 * Execute get bounding box action
 */
export async function executeGetBoundingBox(
    data: FlowNodeData,
    ctx: DataContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const variableName = data.variable || data.storeAs || 'boundingBox';

    const box = await locator.boundingBox({ timeout: data.timeout });

    ctx.variables.set(variableName, box);
    ctx.logs.push(`Got bounding box -> ${variableName}`);
}

/**
 * Execute screenshot to variable action
 */
export async function executeScreenshotToVariable(
    data: FlowNodeData,
    ctx: DataContext
): Promise<void> {
    const variableName = data.variable || data.storeAs || 'screenshotBase64';

    let buffer: Buffer;

    if (data.locatorStrategy || data.selector) {
        const locator = buildLocator(ctx.page, data, ctx.variables);
        buffer = await locator.screenshot({ timeout: data.timeout });
    } else {
        buffer = await ctx.page.screenshot({ fullPage: data.fullPage });
    }

    const base64 = buffer.toString('base64');
    ctx.variables.set(variableName, base64);
    ctx.logs.push(`Screenshot captured -> ${variableName}`);
}

/**
 * Execute increment variable action
 */
export async function executeIncrementVariable(
    data: FlowNodeData,
    ctx: DataContext
): Promise<void> {
    const name = data.variableName || data.name || '';
    const amount = data.amount ?? 1;

    const currentValue = ctx.variables.get(name) || 0;
    const newValue = Number(currentValue) + amount;

    ctx.variables.set(name, newValue);
    ctx.logs.push(`Incremented ${name}: ${currentValue} -> ${newValue}`);
}

/**
 * Execute decrement variable action
 */
export async function executeDecrementVariable(
    data: FlowNodeData,
    ctx: DataContext
): Promise<void> {
    const name = data.variableName || data.name || '';
    const amount = data.amount ?? 1;

    const currentValue = ctx.variables.get(name) || 0;
    const newValue = Number(currentValue) - amount;

    ctx.variables.set(name, newValue);
    ctx.logs.push(`Decremented ${name}: ${currentValue} -> ${newValue}`);
}

/**
 * Data executor registry
 */
export const dataExecutors: Record<string, (data: FlowNodeData, ctx: DataContext) => Promise<void>> = {
    'set-variable': executeSetVariable,
    'extract-text': executeExtractText,
    'extract-inner-text': executeExtractInnerText,
    'extract-attribute': executeExtractAttribute,
    'extract-value': executeExtractValue,
    'get-url': executeGetUrl,
    'get-title': executeGetTitle,
    'get-element-count': executeGetElementCount,
    'log': executeLog,
    'evaluate-js': executeEvaluateJs,
    'evaluate': executeEvaluateJs,
    'store-value': executeStoreValue,
    'get-all-texts': executeGetAllTexts,
    'get-bounding-box': executeGetBoundingBox,
    'screenshot-to-variable': executeScreenshotToVariable,
    'increment-variable': executeIncrementVariable,
    'decrement-variable': executeDecrementVariable,
};
