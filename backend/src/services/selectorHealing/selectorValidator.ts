/**
 * Selector Validator Service
 *
 * Validates selectors against the live page to ensure they work correctly.
 */

import { Page } from 'playwright';
import { SelectorValidationResult } from './types';

/**
 * Validate a selector against a live page
 */
export async function validateSelector(
    page: Page,
    selector: string
): Promise<SelectorValidationResult> {
    try {
        // Convert Vero selector to Playwright locator
        const locator = veroToPlaywrightLocator(page, selector);

        // Count matches
        const count = await locator.count();

        if (count === 0) {
            return {
                isValid: false,
                matchCount: 0,
                isUnique: false,
                error: 'Selector matches no elements',
                suggestedFix: await suggestAlternative(page, selector)
            };
        }

        if (count > 1) {
            return {
                isValid: true,
                matchCount: count,
                isUnique: false,
                error: `Selector matches ${count} elements (not unique)`,
                suggestedFix: await suggestMoreSpecific(page, selector, locator)
            };
        }

        return {
            isValid: true,
            matchCount: 1,
            isUnique: true
        };
    } catch (e: any) {
        return {
            isValid: false,
            matchCount: 0,
            isUnique: false,
            error: `Validation error: ${e.message}`
        };
    }
}

/**
 * Validate multiple selectors and return all results
 */
export async function validateSelectors(
    page: Page,
    selectors: string[]
): Promise<Map<string, SelectorValidationResult>> {
    const results = new Map<string, SelectorValidationResult>();

    for (const selector of selectors) {
        results.set(selector, await validateSelector(page, selector));
    }

    return results;
}

/**
 * Find the first valid selector from a list of fallbacks
 */
export async function findFirstValidSelector(
    page: Page,
    selectors: string[]
): Promise<{ selector: string; result: SelectorValidationResult } | null> {
    for (const selector of selectors) {
        const result = await validateSelector(page, selector);
        if (result.isValid && result.isUnique) {
            return { selector, result };
        }
    }

    // If no unique selector found, return first valid one
    for (const selector of selectors) {
        const result = await validateSelector(page, selector);
        if (result.isValid) {
            return { selector, result };
        }
    }

    return null;
}

/**
 * Convert a Vero selector to a Playwright locator
 */
function veroToPlaywrightLocator(page: Page, selector: string): ReturnType<Page['locator']> {
    // testId "login-btn"
    let match = selector.match(/testId "(.+?)"/);
    if (match) {
        return page.getByTestId(match[1]);
    }

    // button "Submit" (role with name)
    match = selector.match(/^(\w+) "(.+?)"/);
    if (match) {
        const role = match[1] as any;
        const name = match[2];
        return page.getByRole(role, { name });
    }

    // role "button" (role without name)
    match = selector.match(/role "(\w+)"/);
    if (match) {
        return page.getByRole(match[1] as any);
    }

    // label "Email"
    match = selector.match(/label "(.+?)"/);
    if (match) {
        return page.getByLabel(match[1]);
    }

    // placeholder "Enter email"
    match = selector.match(/placeholder "(.+?)"/);
    if (match) {
        return page.getByPlaceholder(match[1]);
    }

    // text "Click me"
    match = selector.match(/text "(.+?)"/);
    if (match) {
        return page.getByText(match[1]);
    }

    // alt "Logo"
    match = selector.match(/alt "(.+?)"/);
    if (match) {
        return page.getByAltText(match[1]);
    }

    // title "Tooltip"
    match = selector.match(/title "(.+?)"/);
    if (match) {
        return page.getByTitle(match[1]);
    }

    // CSS selector (#id, .class, tag)
    return page.locator(selector);
}

/**
 * Suggest an alternative selector when the primary fails
 */
async function suggestAlternative(page: Page, failedSelector: string): Promise<string | undefined> {
    // Extract the text/value from the selector
    const textMatch = failedSelector.match(/"(.+?)"/);
    if (!textMatch) return undefined;

    const searchText = textMatch[1];

    // Try different strategies
    const strategies = [
        { fn: () => page.getByText(searchText, { exact: false }), format: `text "${searchText}"` },
        { fn: () => page.getByRole('button', { name: searchText }), format: `button "${searchText}"` },
        { fn: () => page.getByRole('link', { name: searchText }), format: `link "${searchText}"` },
        { fn: () => page.getByLabel(searchText), format: `label "${searchText}"` },
    ];

    for (const { fn, format } of strategies) {
        try {
            const count = await fn().count();
            if (count > 0) {
                return format;
            }
        } catch {
            // Try next strategy
        }
    }

    return undefined;
}

/**
 * Suggest a more specific selector when multiple elements match
 */
async function suggestMoreSpecific(
    _page: Page,
    selector: string,
    locator: ReturnType<Page['locator']>
): Promise<string | undefined> {
    try {
        // Get the first matching element
        const first = locator.first();

        // Try to get more specific attributes
        const testId = await first.getAttribute('data-testid');
        if (testId) {
            return `testId "${testId}"`;
        }

        const id = await first.getAttribute('id');
        if (id && !id.match(/^[a-f0-9]{8,}/i)) {
            return `#${id}`;
        }

        // Add ".first" hint
        return `${selector} (use .first or add more context)`;
    } catch {
        return undefined;
    }
}

/**
 * Check if an element is visible and interactable
 */
export async function isElementInteractable(
    page: Page,
    selector: string
): Promise<{
    exists: boolean;
    visible: boolean;
    enabled: boolean;
    interactable: boolean;
}> {
    try {
        const locator = veroToPlaywrightLocator(page, selector);
        const element = locator.first();

        const exists = await locator.count() > 0;
        if (!exists) {
            return { exists: false, visible: false, enabled: false, interactable: false };
        }

        const visible = await element.isVisible();
        const enabled = await element.isEnabled();

        return {
            exists,
            visible,
            enabled,
            interactable: visible && enabled
        };
    } catch {
        return { exists: false, visible: false, enabled: false, interactable: false };
    }
}

/**
 * Wait for a selector to become valid (with timeout)
 */
export async function waitForSelector(
    page: Page,
    selector: string,
    timeoutMs: number = 5000
): Promise<SelectorValidationResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        const result = await validateSelector(page, selector);
        if (result.isValid) {
            return result;
        }

        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
        isValid: false,
        matchCount: 0,
        isUnique: false,
        error: `Selector not found within ${timeoutMs}ms`
    };
}
