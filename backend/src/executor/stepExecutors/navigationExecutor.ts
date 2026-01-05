/**
 * Navigation Executor
 * Handles navigation-related actions: navigate, goBack, goForward, reload, newPage, closePage
 */

import { Page, BrowserContext } from 'playwright';
import { FlowNodeData } from '@playwright-web-app/shared';
import { VariableContext } from '../variableContext';

export interface NavigationContext {
    page: Page;
    context: BrowserContext;
    variables: VariableContext;
    pages: Page[];
    setPage: (page: Page) => void;
}

/**
 * Execute navigation action
 */
export async function executeNavigate(
    data: FlowNodeData,
    ctx: NavigationContext
): Promise<void> {
    const url = ctx.variables.resolve(data.url || '');
    const waitUntil = data.waitUntil || 'load';
    const timeout = data.timeout || 30000;

    await ctx.page.goto(url, {
        waitUntil: waitUntil as 'load' | 'domcontentloaded' | 'networkidle' | 'commit',
        timeout,
    });
}

/**
 * Execute go back action
 */
export async function executeGoBack(
    data: FlowNodeData,
    ctx: NavigationContext
): Promise<void> {
    const waitUntil = data.waitUntil || 'load';
    const timeout = data.timeout || 30000;

    await ctx.page.goBack({
        waitUntil: waitUntil as 'load' | 'domcontentloaded' | 'networkidle' | 'commit',
        timeout,
    });
}

/**
 * Execute go forward action
 */
export async function executeGoForward(
    data: FlowNodeData,
    ctx: NavigationContext
): Promise<void> {
    const waitUntil = data.waitUntil || 'load';
    const timeout = data.timeout || 30000;

    await ctx.page.goForward({
        waitUntil: waitUntil as 'load' | 'domcontentloaded' | 'networkidle' | 'commit',
        timeout,
    });
}

/**
 * Execute reload action
 */
export async function executeReload(
    data: FlowNodeData,
    ctx: NavigationContext
): Promise<void> {
    const waitUntil = data.waitUntil || 'load';
    const timeout = data.timeout || 30000;

    await ctx.page.reload({
        waitUntil: waitUntil as 'load' | 'domcontentloaded' | 'networkidle' | 'commit',
        timeout,
    });
}

/**
 * Execute new page/tab action
 */
export async function executeNewPage(
    data: FlowNodeData,
    ctx: NavigationContext
): Promise<void> {
    const newPage = await ctx.context.newPage();
    ctx.pages.push(newPage);
    ctx.setPage(newPage);

    if (data.url) {
        const url = ctx.variables.resolve(data.url);
        await newPage.goto(url);
    }
}

/**
 * Execute close page action
 */
export async function executeClosePage(
    data: FlowNodeData,
    ctx: NavigationContext
): Promise<void> {
    const currentPage = ctx.page;
    await currentPage.close();

    // Remove from pages array
    const index = ctx.pages.indexOf(currentPage);
    if (index > -1) {
        ctx.pages.splice(index, 1);
    }

    // Switch to last available page
    if (ctx.pages.length > 0) {
        ctx.setPage(ctx.pages[ctx.pages.length - 1]);
    }
}

/**
 * Execute switch tab action
 */
export async function executeSwitchTab(
    data: FlowNodeData,
    ctx: NavigationContext
): Promise<void> {
    const tabIndex = data.tabIndex ?? 0;

    if (tabIndex >= 0 && tabIndex < ctx.pages.length) {
        ctx.setPage(ctx.pages[tabIndex]);
        await ctx.page.bringToFront();
    } else {
        throw new Error(`Tab index ${tabIndex} is out of range (0-${ctx.pages.length - 1})`);
    }
}

/**
 * Execute wait for popup action
 */
export async function executeWaitForPopup(
    data: FlowNodeData,
    ctx: NavigationContext
): Promise<void> {
    const timeout = data.timeout || 30000;

    const popup = await ctx.context.waitForEvent('page', { timeout });
    ctx.pages.push(popup);

    if (data.switchTo !== false) {
        ctx.setPage(popup);
    }
}

/**
 * Execute close browser action
 */
export async function executeCloseBrowser(
    data: FlowNodeData,
    ctx: NavigationContext
): Promise<void> {
    await ctx.context.close();
}

/**
 * Navigation executor registry
 */
export const navigationExecutors: Record<string, (data: FlowNodeData, ctx: NavigationContext) => Promise<void>> = {
    'navigate': executeNavigate,
    'go-back': executeGoBack,
    'go-forward': executeGoForward,
    'reload': executeReload,
    'new-page': executeNewPage,
    'close-page': executeClosePage,
    'switch-tab': executeSwitchTab,
    'wait-for-popup': executeWaitForPopup,
    'close-browser': executeCloseBrowser,
};
