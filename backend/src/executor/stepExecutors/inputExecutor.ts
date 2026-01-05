/**
 * Input Executor
 * Handles input-related actions: fill, type, clear, pressKey, check, uncheck, select, upload
 */

import { Page } from 'playwright';
import { FlowNodeData } from '@playwright-web-app/shared';
import { VariableContext } from '../variableContext';
import { buildLocator, highlightElement } from './locatorBuilder';

export interface InputContext {
    page: Page;
    variables: VariableContext;
    highlightElements?: boolean;
}

/**
 * Execute fill action (clears first, then fills)
 */
export async function executeFill(
    data: FlowNodeData,
    ctx: InputContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const value = ctx.variables.resolve(data.value || '');

    if (ctx.highlightElements) {
        await highlightElement(locator, 200);
    }

    const options: any = {};

    if (data.force) {
        options.force = data.force;
    }
    if (data.timeout) {
        options.timeout = data.timeout;
    }
    if (data.noWaitAfter) {
        options.noWaitAfter = data.noWaitAfter;
    }

    await locator.fill(value, options);
}

/**
 * Execute type action (types character by character)
 */
export async function executeType(
    data: FlowNodeData,
    ctx: InputContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const text = ctx.variables.resolve(data.value || data.text || '');

    if (ctx.highlightElements) {
        await highlightElement(locator, 200);
    }

    const options: any = {};

    if (data.delay) {
        options.delay = data.delay;
    }
    if (data.timeout) {
        options.timeout = data.timeout;
    }
    if (data.noWaitAfter) {
        options.noWaitAfter = data.noWaitAfter;
    }

    await locator.pressSequentially(text, options);
}

/**
 * Execute clear action
 */
export async function executeClear(
    data: FlowNodeData,
    ctx: InputContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);

    if (ctx.highlightElements) {
        await highlightElement(locator, 200);
    }

    await locator.clear({ timeout: data.timeout, force: data.force });
}

/**
 * Execute press key action
 */
export async function executePressKey(
    data: FlowNodeData,
    ctx: InputContext
): Promise<void> {
    let key = data.key || 'Enter';

    // Handle custom key
    if (key === 'custom' && data.customKey) {
        key = data.customKey;
    }

    const options: any = {};

    if (data.delay) {
        options.delay = data.delay;
    }
    if (data.timeout) {
        options.timeout = data.timeout;
    }
    if (data.noWaitAfter) {
        options.noWaitAfter = data.noWaitAfter;
    }

    // If element specified, press on element
    if (data.useElement && (data.locatorStrategy || data.selector)) {
        const locator = buildLocator(ctx.page, data, ctx.variables);

        if (ctx.highlightElements) {
            await highlightElement(locator, 200);
        }

        await locator.press(key, options);
    } else {
        // Press on page level
        await ctx.page.keyboard.press(key, { delay: data.delay });
    }
}

/**
 * Execute check action
 */
export async function executeCheck(
    data: FlowNodeData,
    ctx: InputContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);

    if (ctx.highlightElements) {
        await highlightElement(locator, 200);
    }

    const options: any = {};

    if (data.force) {
        options.force = data.force;
    }
    if (data.timeout) {
        options.timeout = data.timeout;
    }

    await locator.check(options);
}

/**
 * Execute uncheck action
 */
export async function executeUncheck(
    data: FlowNodeData,
    ctx: InputContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);

    if (ctx.highlightElements) {
        await highlightElement(locator, 200);
    }

    const options: any = {};

    if (data.force) {
        options.force = data.force;
    }
    if (data.timeout) {
        options.timeout = data.timeout;
    }

    await locator.uncheck(options);
}

/**
 * Execute set checked state action
 */
export async function executeSetChecked(
    data: FlowNodeData,
    ctx: InputContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const checked = data.checked ?? true;

    if (ctx.highlightElements) {
        await highlightElement(locator, 200);
    }

    const options: any = {};

    if (data.force) {
        options.force = data.force;
    }
    if (data.timeout) {
        options.timeout = data.timeout;
    }

    await locator.setChecked(checked, options);
}

/**
 * Execute select option action
 */
export async function executeSelectOption(
    data: FlowNodeData,
    ctx: InputContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);

    if (ctx.highlightElements) {
        await highlightElement(locator, 200);
    }

    // Determine selection type
    let selection: any;

    if (data.selectBy === 'value') {
        selection = { value: ctx.variables.resolve(data.selectValue || '') };
    } else if (data.selectBy === 'label') {
        selection = { label: ctx.variables.resolve(data.selectLabel || '') };
    } else if (data.selectBy === 'index') {
        selection = { index: data.selectIndex ?? 0 };
    } else {
        // Default to value
        selection = ctx.variables.resolve(data.value || data.selectValue || '');
    }

    const options: any = {};
    if (data.force) {
        options.force = data.force;
    }
    if (data.timeout) {
        options.timeout = data.timeout;
    }

    await locator.selectOption(selection, options);
}

/**
 * Execute upload file action
 */
export async function executeUploadFile(
    data: FlowNodeData,
    ctx: InputContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const filePath = ctx.variables.resolve(data.filePath || data.value || '');

    if (ctx.highlightElements) {
        await highlightElement(locator, 200);
    }

    // Handle multiple files
    const files = filePath.includes(',')
        ? filePath.split(',').map((f: string) => f.trim())
        : filePath;

    await locator.setInputFiles(files, { timeout: data.timeout });
}

/**
 * Execute keyboard type action (types on page level)
 */
export async function executeKeyboardType(
    data: FlowNodeData,
    ctx: InputContext
): Promise<void> {
    const text = ctx.variables.resolve(data.value || data.text || '');

    await ctx.page.keyboard.type(text, { delay: data.delay });
}

/**
 * Execute keyboard insert text action
 */
export async function executeInsertText(
    data: FlowNodeData,
    ctx: InputContext
): Promise<void> {
    const text = ctx.variables.resolve(data.value || data.text || '');

    await ctx.page.keyboard.insertText(text);
}

/**
 * Input executor registry
 */
export const inputExecutors: Record<string, (data: FlowNodeData, ctx: InputContext) => Promise<void>> = {
    'fill': executeFill,
    'type': executeType,
    'clear': executeClear,
    'press-key': executePressKey,
    'check': executeCheck,
    'uncheck': executeUncheck,
    'set-checked': executeSetChecked,
    'select-option': executeSelectOption,
    'upload-file': executeUploadFile,
    'keyboard-type': executeKeyboardType,
    'insert-text': executeInsertText,
};
