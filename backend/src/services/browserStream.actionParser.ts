/**
 * Playwright code action parser for the Browser Streaming Service.
 *
 * Parses raw Playwright codegen output into structured ParsedAction objects.
 */

import { ParsedAction } from './browserStream.types';

/**
 * Parse Playwright code to extract actions.
 */
export function parsePlaywrightCode(code: string): ParsedAction[] {
    const actions: ParsedAction[] = [];
    const lines = code.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('await')) continue;

        let action: ParsedAction | null = null;

        // goto
        const gotoMatch = trimmed.match(/await page\.goto\(['"](.+?)['"]\)/);
        if (gotoMatch) {
            action = {
                type: 'goto',
                playwrightLocator: '',
                rawSelector: '',
                value: gotoMatch[1],
                originalLine: trimmed
            };
        }

        // click with various locators
        const clickMatch = trimmed.match(/await page\.(getBy\w+|locator)\((.+?)\)\.click\(\)/);
        if (clickMatch) {
            action = {
                type: 'click',
                playwrightLocator: `page.${clickMatch[1]}(${clickMatch[2]})`,
                rawSelector: extractRawSelector(clickMatch[2]),
                originalLine: trimmed
            };
        }

        // fill with various locators
        const fillMatch = trimmed.match(/await page\.(getBy\w+|locator)\((.+?)\)\.fill\(['"](.+?)['"]\)/);
        if (fillMatch) {
            action = {
                type: 'fill',
                playwrightLocator: `page.${fillMatch[1]}(${fillMatch[2]})`,
                rawSelector: extractRawSelector(fillMatch[2]),
                value: fillMatch[3],
                originalLine: trimmed
            };
        }

        // check
        const checkMatch = trimmed.match(/await page\.(getBy\w+|locator)\((.+?)\)\.check\(\)/);
        if (checkMatch) {
            action = {
                type: 'check',
                playwrightLocator: `page.${checkMatch[1]}(${checkMatch[2]})`,
                rawSelector: extractRawSelector(checkMatch[2]),
                originalLine: trimmed
            };
        }

        // press
        const pressMatch = trimmed.match(/\.press\(['"](.+?)['"]\)/);
        if (pressMatch && !action) {
            action = {
                type: 'press',
                playwrightLocator: '',
                rawSelector: '',
                value: pressMatch[1],
                originalLine: trimmed
            };
        }

        // selectOption
        const selectMatch = trimmed.match(/await page\.(getBy\w+|locator)\((.+?)\)\.selectOption\(['"](.+?)['"]\)/);
        if (selectMatch) {
            action = {
                type: 'select',
                playwrightLocator: `page.${selectMatch[1]}(${selectMatch[2]})`,
                rawSelector: extractRawSelector(selectMatch[2]),
                value: selectMatch[3],
                originalLine: trimmed
            };
        }

        // expect assertions
        const expectMatch = trimmed.match(/await expect\(page\.(getBy\w+|locator)\((.+?)\)\)\.(toBeVisible|toContainText|toHaveText)\(([^)]*)\)/);
        if (expectMatch) {
            action = {
                type: 'expect',
                playwrightLocator: `page.${expectMatch[1]}(${expectMatch[2]})`,
                rawSelector: extractRawSelector(expectMatch[2]),
                value: expectMatch[4]?.replace(/['"]/g, '') || '',
                originalLine: trimmed
            };
        }

        if (action) {
            actions.push(action);
        }
    }

    return actions;
}

/**
 * Extract raw selector string from Playwright locator argument.
 */
export function extractRawSelector(locatorArg: string): string {
    let selector = locatorArg.replace(/^['"]|['"]$/g, '').trim();

    // Handle getByRole patterns like: 'button', { name: 'Login' }
    const roleMatch = locatorArg.match(/['"](\w+)['"],\s*\{\s*name:\s*['"](.+?)['"]/);
    if (roleMatch) {
        return `role=${roleMatch[1]}[name="${roleMatch[2]}"]`;
    }

    return selector;
}
