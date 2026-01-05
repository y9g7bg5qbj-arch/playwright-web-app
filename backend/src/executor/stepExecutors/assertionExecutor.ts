/**
 * Assertion Executor
 * Handles all assertion actions using Playwright's expect library
 */

import { Page } from 'playwright';
import { expect } from '@playwright/test';
import { FlowNodeData } from '@playwright-web-app/shared';
import { VariableContext } from '../variableContext';
import { buildLocator } from './locatorBuilder';

export interface AssertionContext {
    page: Page;
    variables: VariableContext;
}

/**
 * Execute assert visible action
 */
export async function executeAssertVisible(
    data: FlowNodeData,
    ctx: AssertionContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const timeout = data.timeout || 5000;

    if (data.not) {
        await expect(locator).not.toBeVisible({ timeout });
    } else {
        await expect(locator).toBeVisible({ timeout });
    }
}

/**
 * Execute assert hidden action
 */
export async function executeAssertHidden(
    data: FlowNodeData,
    ctx: AssertionContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const timeout = data.timeout || 5000;

    if (data.not) {
        await expect(locator).not.toBeHidden({ timeout });
    } else {
        await expect(locator).toBeHidden({ timeout });
    }
}

/**
 * Execute assert text action
 */
export async function executeAssertText(
    data: FlowNodeData,
    ctx: AssertionContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const expectedText = ctx.variables.resolve(data.expectedText || data.text || '');
    const timeout = data.timeout || 5000;
    const matchType = data.matchType || 'contains';

    const assertion = data.not ? expect(locator).not : expect(locator);

    switch (matchType) {
        case 'exact':
            await assertion.toHaveText(expectedText, { timeout });
            break;
        case 'contains':
            await assertion.toContainText(expectedText, { timeout });
            break;
        case 'regex':
            await assertion.toHaveText(new RegExp(expectedText), { timeout });
            break;
        default:
            await assertion.toContainText(expectedText, { timeout });
    }
}

/**
 * Execute assert value action
 */
export async function executeAssertValue(
    data: FlowNodeData,
    ctx: AssertionContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const expectedValue = ctx.variables.resolve(data.expectedValue || data.value || '');
    const timeout = data.timeout || 5000;
    const matchType = data.matchType || 'exact';

    const assertion = data.not ? expect(locator).not : expect(locator);

    switch (matchType) {
        case 'exact':
            await assertion.toHaveValue(expectedValue, { timeout });
            break;
        case 'regex':
            await assertion.toHaveValue(new RegExp(expectedValue), { timeout });
            break;
        default:
            await assertion.toHaveValue(expectedValue, { timeout });
    }
}

/**
 * Execute assert attribute action
 */
export async function executeAssertAttribute(
    data: FlowNodeData,
    ctx: AssertionContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const attribute = data.attribute || 'class';
    const expectedValue = ctx.variables.resolve(data.expectedValue || data.value || '');
    const timeout = data.timeout || 5000;

    const assertion = data.not ? expect(locator).not : expect(locator);

    if (data.matchType === 'regex') {
        await assertion.toHaveAttribute(attribute, new RegExp(expectedValue), { timeout });
    } else {
        await assertion.toHaveAttribute(attribute, expectedValue, { timeout });
    }
}

/**
 * Execute assert enabled action
 */
export async function executeAssertEnabled(
    data: FlowNodeData,
    ctx: AssertionContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const timeout = data.timeout || 5000;

    if (data.not) {
        await expect(locator).toBeDisabled({ timeout });
    } else {
        await expect(locator).toBeEnabled({ timeout });
    }
}

/**
 * Execute assert disabled action
 */
export async function executeAssertDisabled(
    data: FlowNodeData,
    ctx: AssertionContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const timeout = data.timeout || 5000;

    if (data.not) {
        await expect(locator).toBeEnabled({ timeout });
    } else {
        await expect(locator).toBeDisabled({ timeout });
    }
}

/**
 * Execute assert checked action
 */
export async function executeAssertChecked(
    data: FlowNodeData,
    ctx: AssertionContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const timeout = data.timeout || 5000;

    if (data.not) {
        await expect(locator).not.toBeChecked({ timeout });
    } else {
        await expect(locator).toBeChecked({ timeout });
    }
}

/**
 * Execute assert count action
 */
export async function executeAssertCount(
    data: FlowNodeData,
    ctx: AssertionContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const expectedCount = data.expectedCount ?? 0;
    const timeout = data.timeout || 5000;

    if (data.not) {
        await expect(locator).not.toHaveCount(expectedCount, { timeout });
    } else {
        await expect(locator).toHaveCount(expectedCount, { timeout });
    }
}

/**
 * Execute assert URL action
 */
export async function executeAssertUrl(
    data: FlowNodeData,
    ctx: AssertionContext
): Promise<void> {
    const expectedUrl = ctx.variables.resolve(data.expectedUrl || data.url || '');
    const timeout = data.timeout || 5000;
    const matchType = data.matchType || 'exact';

    const assertion = data.not ? expect(ctx.page).not : expect(ctx.page);

    switch (matchType) {
        case 'exact':
            await assertion.toHaveURL(expectedUrl, { timeout });
            break;
        case 'contains':
            await assertion.toHaveURL(new RegExp(expectedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), { timeout });
            break;
        case 'regex':
            await assertion.toHaveURL(new RegExp(expectedUrl), { timeout });
            break;
        default:
            await assertion.toHaveURL(expectedUrl, { timeout });
    }
}

/**
 * Execute assert title action
 */
export async function executeAssertTitle(
    data: FlowNodeData,
    ctx: AssertionContext
): Promise<void> {
    const expectedTitle = ctx.variables.resolve(data.expectedTitle || data.title || '');
    const timeout = data.timeout || 5000;
    const matchType = data.matchType || 'exact';

    const assertion = data.not ? expect(ctx.page).not : expect(ctx.page);

    switch (matchType) {
        case 'exact':
            await assertion.toHaveTitle(expectedTitle, { timeout });
            break;
        case 'contains':
            await assertion.toHaveTitle(new RegExp(expectedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), { timeout });
            break;
        case 'regex':
            await assertion.toHaveTitle(new RegExp(expectedTitle), { timeout });
            break;
        default:
            await assertion.toHaveTitle(expectedTitle, { timeout });
    }
}

/**
 * Execute assert element exists action
 */
export async function executeAssertExists(
    data: FlowNodeData,
    ctx: AssertionContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const timeout = data.timeout || 5000;

    if (data.not) {
        await expect(locator).toHaveCount(0, { timeout });
    } else {
        // At least one element should exist
        const count = await locator.count();
        if (count === 0) {
            // Try waiting for the element to appear
            await locator.waitFor({ state: 'attached', timeout });
        }
    }
}

/**
 * Execute assert CSS property action
 */
export async function executeAssertCss(
    data: FlowNodeData,
    ctx: AssertionContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const property = data.cssProperty || data.property || '';
    const expectedValue = ctx.variables.resolve(data.expectedValue || data.value || '');
    const timeout = data.timeout || 5000;

    const assertion = data.not ? expect(locator).not : expect(locator);

    await assertion.toHaveCSS(property, expectedValue, { timeout });
}

/**
 * Execute assert editable action
 */
export async function executeAssertEditable(
    data: FlowNodeData,
    ctx: AssertionContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const timeout = data.timeout || 5000;

    if (data.not) {
        await expect(locator).not.toBeEditable({ timeout });
    } else {
        await expect(locator).toBeEditable({ timeout });
    }
}

/**
 * Execute assert focused action
 */
export async function executeAssertFocused(
    data: FlowNodeData,
    ctx: AssertionContext
): Promise<void> {
    const locator = buildLocator(ctx.page, data, ctx.variables);
    const timeout = data.timeout || 5000;

    if (data.not) {
        await expect(locator).not.toBeFocused({ timeout });
    } else {
        await expect(locator).toBeFocused({ timeout });
    }
}

/**
 * Execute custom assertion (JavaScript expression)
 */
export async function executeAssertCustom(
    data: FlowNodeData,
    ctx: AssertionContext
): Promise<void> {
    const expression = data.expression || '';

    // Evaluate expression in page context
    const result = await ctx.page.evaluate((expr) => {
        return eval(expr);
    }, expression);

    if (data.not) {
        if (result) {
            throw new Error(`Custom assertion failed: expected expression to be falsy, got ${result}`);
        }
    } else {
        if (!result) {
            throw new Error(`Custom assertion failed: expected expression to be truthy, got ${result}`);
        }
    }
}

/**
 * Assertion executor registry
 */
export const assertionExecutors: Record<string, (data: FlowNodeData, ctx: AssertionContext) => Promise<void>> = {
    'assert-visible': executeAssertVisible,
    'assert-hidden': executeAssertHidden,
    'assert-text': executeAssertText,
    'assert-value': executeAssertValue,
    'assert-attribute': executeAssertAttribute,
    'assert-enabled': executeAssertEnabled,
    'assert-disabled': executeAssertDisabled,
    'assert-checked': executeAssertChecked,
    'assert-count': executeAssertCount,
    'assert-url': executeAssertUrl,
    'assert-title': executeAssertTitle,
    'assert-exists': executeAssertExists,
    'assert-css': executeAssertCss,
    'assert-editable': executeAssertEditable,
    'assert-focused': executeAssertFocused,
    'assert-custom': executeAssertCustom,
};
