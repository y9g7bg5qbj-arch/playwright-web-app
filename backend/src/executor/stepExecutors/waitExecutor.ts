/**
 * Wait Executor
 * Handles wait-related actions: wait-time, wait-for-element, wait-for-url, etc.
 */

import { Page } from 'playwright';
import { FlowNodeData } from '@playwright-web-app/shared';
import { VariableContext } from '../variableContext';
import { buildLocator } from './locatorBuilder';

export interface WaitContext {
    page: Page;
    variables: VariableContext;
}

/**
 * Execute wait for fixed time action
 */
export async function executeWaitTime(
    data: FlowNodeData,
    ctx: WaitContext
): Promise<void> {
    const duration = data.duration ?? 1000;

    await ctx.page.waitForTimeout(duration);
}

/**
 * Execute wait for element action
 */
export async function executeWaitForElement(
    data: FlowNodeData,
    ctx: WaitContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const state = (data.state || 'visible') as 'attached' | 'detached' | 'visible' | 'hidden';
    const timeout = data.timeout || 30000;

    await locator.waitFor({ state, timeout });
}

/**
 * Execute wait for URL action
 */
export async function executeWaitForUrl(
    data: FlowNodeData,
    ctx: WaitContext
): Promise<void> {
    const urlPattern = ctx.variables.resolve(data.url || data.urlPattern || '');
    const timeout = data.timeout || 30000;
    const matchType = data.matchType || 'contains';

    let urlMatcher: string | RegExp;

    switch (matchType) {
        case 'exact':
            urlMatcher = urlPattern;
            break;
        case 'contains':
            // Create regex that matches if URL contains the pattern
            urlMatcher = new RegExp(urlPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            break;
        case 'regex':
            urlMatcher = new RegExp(urlPattern);
            break;
        default:
            urlMatcher = urlPattern;
    }

    await ctx.page.waitForURL(urlMatcher, { timeout });
}

/**
 * Execute wait for load state action
 */
export async function executeWaitForLoadState(
    data: FlowNodeData,
    ctx: WaitContext
): Promise<void> {
    const state = (data.state || 'load') as 'load' | 'domcontentloaded' | 'networkidle';
    const timeout = data.timeout || 30000;

    await ctx.page.waitForLoadState(state, { timeout });
}

/**
 * Execute wait for network response action
 */
export async function executeWaitForResponse(
    data: FlowNodeData,
    ctx: WaitContext
): Promise<void> {
    const urlPattern = ctx.variables.resolve(data.urlPattern || data.url || '');
    const timeout = data.timeout || 30000;

    await ctx.page.waitForResponse(
        (response) => response.url().includes(urlPattern),
        { timeout }
    );
}

/**
 * Execute wait for network request action
 */
export async function executeWaitForRequest(
    data: FlowNodeData,
    ctx: WaitContext
): Promise<void> {
    const urlPattern = ctx.variables.resolve(data.urlPattern || data.url || '');
    const timeout = data.timeout || 30000;

    await ctx.page.waitForRequest(
        (request) => request.url().includes(urlPattern),
        { timeout }
    );
}

/**
 * Execute wait for function (custom condition) action
 */
export async function executeWaitForFunction(
    data: FlowNodeData,
    ctx: WaitContext
): Promise<void> {
    const expression = data.expression || data.condition || 'true';
    const timeout = data.timeout || 30000;

    // Parse polling interval
    let polling: 'raf' | number = 'raf';
    if (data.polling) {
        if (data.polling === 'raf') {
            polling = 'raf';
        } else {
            polling = parseInt(data.polling, 10) || 100;
        }
    }

    await ctx.page.waitForFunction(expression, { timeout, polling });
}

/**
 * Execute wait for navigation action
 */
export async function executeWaitForNavigation(
    data: FlowNodeData,
    ctx: WaitContext
): Promise<void> {
    const timeout = data.timeout || 30000;
    const waitUntil = (data.waitUntil || 'load') as 'load' | 'domcontentloaded' | 'networkidle' | 'commit';

    await ctx.page.waitForNavigation({ timeout, waitUntil });
}

/**
 * Execute wait for event action
 */
export async function executeWaitForEvent(
    data: FlowNodeData,
    ctx: WaitContext
): Promise<void> {
    const eventName = data.eventName || data.event || 'load';
    const timeout = data.timeout || 30000;

    await ctx.page.waitForEvent(eventName as any, { timeout });
}

/**
 * Execute wait for selector (legacy, maps to wait-for-element)
 */
export async function executeWaitForSelector(
    data: FlowNodeData,
    ctx: WaitContext
): Promise<void> {
    await executeWaitForElement(data, ctx);
}

/**
 * Execute wait until hidden action
 */
export async function executeWaitUntilHidden(
    data: FlowNodeData,
    ctx: WaitContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const timeout = data.timeout || 30000;

    await locator.waitFor({ state: 'hidden', timeout });
}

/**
 * Execute wait until detached action
 */
export async function executeWaitUntilDetached(
    data: FlowNodeData,
    ctx: WaitContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const timeout = data.timeout || 30000;

    await locator.waitFor({ state: 'detached', timeout });
}

/**
 * Execute network idle wait
 */
export async function executeWaitForNetworkIdle(
    data: FlowNodeData,
    ctx: WaitContext
): Promise<void> {
    const timeout = data.timeout || 30000;

    await ctx.page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait executor registry
 */
export const waitExecutors: Record<string, (data: FlowNodeData, ctx: WaitContext) => Promise<void>> = {
    'wait-time': executeWaitTime,
    'wait': executeWaitTime,
    'wait-for-element': executeWaitForElement,
    'wait-for-selector': executeWaitForSelector,
    'wait-for-url': executeWaitForUrl,
    'wait-for-load-state': executeWaitForLoadState,
    'wait-for-response': executeWaitForResponse,
    'wait-for-request': executeWaitForRequest,
    'wait-for-function': executeWaitForFunction,
    'wait-for-navigation': executeWaitForNavigation,
    'wait-for-event': executeWaitForEvent,
    'wait-until-hidden': executeWaitUntilHidden,
    'wait-until-detached': executeWaitUntilDetached,
    'wait-for-network-idle': executeWaitForNetworkIdle,
};
