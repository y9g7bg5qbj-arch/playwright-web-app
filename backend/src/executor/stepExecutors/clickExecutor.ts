/**
 * Click Executor
 * Handles click-related actions: click, dblclick, right-click, hover, drag-and-drop
 */

import { Page } from 'playwright';
import { FlowNodeData } from '@playwright-web-app/shared';
import { VariableContext } from '../variableContext';
import { buildLocator, getLocatorDescription, highlightElement } from './locatorBuilder';

export interface ClickContext {
    page: Page;
    variables: VariableContext;
    highlightElements?: boolean;
}

/**
 * Execute click action
 */
export async function executeClick(
    data: FlowNodeData,
    ctx: ClickContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);

    if (ctx.highlightElements) {
        await highlightElement(locator, 200);
    }

    const options: any = {};

    if (data.button) {
        options.button = data.button;
    }
    if (data.clickCount) {
        options.clickCount = data.clickCount;
    }
    if (data.delay) {
        options.delay = data.delay;
    }
    if (data.force) {
        options.force = data.force;
    }
    if (data.modifiers && data.modifiers.length > 0) {
        options.modifiers = data.modifiers;
    }
    if (data.position) {
        options.position = data.position;
    }
    if (data.timeout) {
        options.timeout = data.timeout;
    }
    if (data.trial) {
        options.trial = data.trial;
    }
    if (data.noWaitAfter) {
        options.noWaitAfter = data.noWaitAfter;
    }

    await locator.click(options);
}

/**
 * Execute double-click action
 */
export async function executeDblClick(
    data: FlowNodeData,
    ctx: ClickContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);

    if (ctx.highlightElements) {
        await highlightElement(locator, 200);
    }

    const options: any = {};

    if (data.button) {
        options.button = data.button;
    }
    if (data.delay) {
        options.delay = data.delay;
    }
    if (data.force) {
        options.force = data.force;
    }
    if (data.modifiers && data.modifiers.length > 0) {
        options.modifiers = data.modifiers;
    }
    if (data.timeout) {
        options.timeout = data.timeout;
    }

    await locator.dblclick(options);
}

/**
 * Execute right-click action
 */
export async function executeRightClick(
    data: FlowNodeData,
    ctx: ClickContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);

    if (ctx.highlightElements) {
        await highlightElement(locator, 200);
    }

    const options: any = {};

    if (data.force) {
        options.force = data.force;
    }
    if (data.modifiers && data.modifiers.length > 0) {
        options.modifiers = data.modifiers;
    }
    if (data.timeout) {
        options.timeout = data.timeout;
    }

    await locator.click({ ...options, button: 'right' });
}

/**
 * Execute hover action
 */
export async function executeHover(
    data: FlowNodeData,
    ctx: ClickContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);

    if (ctx.highlightElements) {
        await highlightElement(locator, 200);
    }

    const options: any = {};

    if (data.force) {
        options.force = data.force;
    }
    if (data.modifiers && data.modifiers.length > 0) {
        options.modifiers = data.modifiers;
    }
    if (data.position) {
        options.position = data.position;
    }
    if (data.timeout) {
        options.timeout = data.timeout;
    }

    await locator.hover(options);
}

/**
 * Execute focus action
 */
export async function executeFocus(
    data: FlowNodeData,
    ctx: ClickContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);

    if (ctx.highlightElements) {
        await highlightElement(locator, 200);
    }

    await locator.focus({ timeout: data.timeout });
}

/**
 * Execute blur action
 */
export async function executeBlur(
    data: FlowNodeData,
    ctx: ClickContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);

    await locator.blur({ timeout: data.timeout });
}

/**
 * Execute drag-and-drop action
 */
export async function executeDragAndDrop(
    data: FlowNodeData,
    ctx: ClickContext
): Promise<void> {
    // Build source locator
    const sourceConfig = {
        locatorStrategy: data.sourceLocatorStrategy || 'css',
        selector: data.sourceSelector,
        ...data,
    };
    const sourceLocator = buildLocator(ctx.page, sourceConfig, ctx.variables);

    // Build target locator
    const targetConfig = {
        locatorStrategy: data.targetLocatorStrategy || 'css',
        selector: data.targetSelector,
        ...data,
    };
    const targetLocator = buildLocator(ctx.page, targetConfig, ctx.variables);

    if (ctx.highlightElements) {
        await highlightElement(sourceLocator, 200);
        await highlightElement(targetLocator, 200);
    }

    const options: any = {};

    if (data.force) {
        options.force = data.force;
    }
    if (data.timeout) {
        options.timeout = data.timeout;
    }

    await sourceLocator.dragTo(targetLocator, options);
}

/**
 * Execute mouse move action
 */
export async function executeMouseMove(
    data: FlowNodeData,
    ctx: ClickContext
): Promise<void> {
    const x = data.x ?? 0;
    const y = data.y ?? 0;
    const steps = data.steps ?? 1;

    await ctx.page.mouse.move(x, y, { steps });
}

/**
 * Execute mouse down action
 */
export async function executeMouseDown(
    data: FlowNodeData,
    ctx: ClickContext
): Promise<void> {
    const button = (data.button as 'left' | 'right' | 'middle') || 'left';

    await ctx.page.mouse.down({ button });
}

/**
 * Execute mouse up action
 */
export async function executeMouseUp(
    data: FlowNodeData,
    ctx: ClickContext
): Promise<void> {
    const button = (data.button as 'left' | 'right' | 'middle') || 'left';

    await ctx.page.mouse.up({ button });
}

/**
 * Execute scroll action
 */
export async function executeScroll(
    data: FlowNodeData,
    ctx: ClickContext
): Promise<void> {
    if (data.locatorStrategy || data.selector) {
        // Scroll to element
        const locator = buildLocator(ctx.page, data, ctx.variables);
        await locator.scrollIntoViewIfNeeded({ timeout: data.timeout });
    } else {
        // Scroll by amount
        const deltaX = data.deltaX ?? 0;
        const deltaY = data.deltaY ?? 0;

        await ctx.page.mouse.wheel(deltaX, deltaY);
    }
}

/**
 * Click executor registry
 */
export const clickExecutors: Record<string, (data: FlowNodeData, ctx: ClickContext) => Promise<void>> = {
    'click': executeClick,
    'dblclick': executeDblClick,
    'double-click': executeDblClick,
    'right-click': executeRightClick,
    'hover': executeHover,
    'focus': executeFocus,
    'blur': executeBlur,
    'drag-and-drop': executeDragAndDrop,
    'mouse-move': executeMouseMove,
    'mouse-down': executeMouseDown,
    'mouse-up': executeMouseUp,
    'scroll': executeScroll,
    'scroll-into-view': executeScroll,
};
