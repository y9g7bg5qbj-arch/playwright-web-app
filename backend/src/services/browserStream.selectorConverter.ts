/**
 * Selector conversion utilities for the Browser Streaming Service.
 *
 * Converts between Playwright locator syntax, Vero DSL selector syntax,
 * and resolves Vero selectors to Playwright page locators.
 */

import { Page } from 'playwright';

/**
 * Convert Playwright selector syntax to Vero DSL selector syntax.
 *
 * Examples:
 *   getByTestId('email') -> testId "email"
 *   getByRole('button', { name: 'Submit' }) -> button "Submit"
 *   getByLabel('Email') -> label "Email"
 *   getByPlaceholder('Enter email') -> placeholder "Enter email"
 *   getByText('Click me') -> text "Click me"
 *   locator('#id') -> "#id"
 */
export function playwrightToVeroSelector(playwrightSelector: string): string {
    const testIdMatch = playwrightSelector.match(/getByTestId\(['"]([^'"]+)['"]\)/);
    if (testIdMatch) {
        return `testId "${testIdMatch[1]}"`;
    }

    const roleWithNameMatch = playwrightSelector.match(/getByRole\(['"](\w+)['"](?:,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\})?\)/);
    if (roleWithNameMatch) {
        const role = roleWithNameMatch[1];
        const name = roleWithNameMatch[2];
        if (name) {
            return `${role} "${name}"`;
        }
        return `role "${role}"`;
    }

    const labelMatch = playwrightSelector.match(/getByLabel\(['"]([^'"]+)['"]\)/);
    if (labelMatch) {
        return `label "${labelMatch[1]}"`;
    }

    const placeholderMatch = playwrightSelector.match(/getByPlaceholder\(['"]([^'"]+)['"]\)/);
    if (placeholderMatch) {
        return `placeholder "${placeholderMatch[1]}"`;
    }

    const altMatch = playwrightSelector.match(/getByAltText\(['"]([^'"]+)['"]\)/);
    if (altMatch) {
        return `alt "${altMatch[1]}"`;
    }

    const titleMatch = playwrightSelector.match(/getByTitle\(['"]([^'"]+)['"]\)/);
    if (titleMatch) {
        return `title "${titleMatch[1]}"`;
    }

    const textMatch = playwrightSelector.match(/getByText\(['"]([^'"]+)['"]\)/);
    if (textMatch) {
        return `text "${textMatch[1]}"`;
    }

    const locatorMatch = playwrightSelector.match(/locator\(['"]([^'"]+)['"]\)/);
    if (locatorMatch) {
        return locatorMatch[1];
    }

    return playwrightSelector;
}

/**
 * Convert Playwright locator string to Vero selector syntax.
 * Handles full locator expressions like `page.getByRole('button', { name: 'Login' })`.
 */
export function convertPlaywrightLocatorToVero(playwrightLocator: string): string {
    const roleMatch = playwrightLocator.match(/getByRole\(['"](\w+)['"],\s*\{\s*name:\s*['"](.+?)['"]/);
    if (roleMatch) {
        return `role "${roleMatch[1]}" name "${roleMatch[2]}"`;
    }

    const textMatch = playwrightLocator.match(/getByText\(['"](.+?)['"]\)/);
    if (textMatch) {
        return `text "${textMatch[1]}"`;
    }

    const labelMatch = playwrightLocator.match(/getByLabel\(['"](.+?)['"]\)/);
    if (labelMatch) {
        return `label "${labelMatch[1]}"`;
    }

    const placeholderMatch = playwrightLocator.match(/getByPlaceholder\(['"](.+?)['"]\)/);
    if (placeholderMatch) {
        return `placeholder "${placeholderMatch[1]}"`;
    }

    const testIdMatch = playwrightLocator.match(/getByTestId\(['"](.+?)['"]\)/);
    if (testIdMatch) {
        return `testid "${testIdMatch[1]}"`;
    }

    const locatorMatch = playwrightLocator.match(/locator\(['"](.+?)['"]\)/);
    if (locatorMatch) {
        return `css "${locatorMatch[1]}"`;
    }

    return `css "${playwrightLocator}"`;
}

/**
 * Find a Playwright element locator from a Vero selector string.
 */
export async function findElementByVeroSelector(page: Page, selector: string) {
    let match = selector.match(/testId "(.+?)"/);
    if (match) {
        return page.getByTestId(match[1]).first();
    }

    match = selector.match(/^(\w+) "(.+?)"/);
    if (match) {
        const role = match[1] as any;
        const name = match[2];
        return page.getByRole(role, { name }).first();
    }

    match = selector.match(/role "(\w+)"/);
    if (match) {
        return page.getByRole(match[1] as any).first();
    }

    match = selector.match(/label "(.+?)"/);
    if (match) {
        return page.getByLabel(match[1]).first();
    }

    match = selector.match(/placeholder "(.+?)"/);
    if (match) {
        return page.getByPlaceholder(match[1]).first();
    }

    match = selector.match(/text "(.+?)"/);
    if (match) {
        return page.getByText(match[1]).first();
    }

    match = selector.match(/alt "(.+?)"/);
    if (match) {
        return page.getByAltText(match[1]).first();
    }

    match = selector.match(/title "(.+?)"/);
    if (match) {
        return page.getByTitle(match[1]).first();
    }

    return page.locator(selector).first();
}
