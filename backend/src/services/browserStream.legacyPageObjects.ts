/**
 * Legacy page object helpers for the Browser Streaming Service.
 *
 * These functions manage the in-memory page object map used before
 * the PageObjectRegistry was introduced. They are kept for backward
 * compatibility with the codegen file-watcher recording path.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { PageObjectEntry } from './browserStream.types';
import { convertPlaywrightLocatorToVero } from './browserStream.selectorConverter';
import { generateVeroAction, generateVeroAssertion } from './veroSyntaxReference';

/**
 * Find existing selector in loaded page objects.
 */
export function findExistingSelector(
    pageObjects: Map<string, PageObjectEntry[]>,
    rawSelector: string,
    playwrightLocator: string
): PageObjectEntry | null {
    for (const [_pageName, entries] of pageObjects) {
        for (const entry of entries) {
            if (entry.rawSelector === rawSelector || entry.playwrightLocator === playwrightLocator) {
                return entry;
            }
        }
    }
    return null;
}

/**
 * Suggest page name based on URL.
 */
export function suggestPageName(url: string): string {
    try {
        const urlObj = new URL(url);
        const path = urlObj.pathname.replace(/^\/|\/$/g, '');

        if (!path || path === '') return 'HomePage';

        const parts = path.split(/[\/\-_]/);
        const name = parts
            .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
            .join('');

        return name + 'Page';
    } catch {
        return 'MainPage';
    }
}

/**
 * Generate a readable selector name.
 */
export function generateSelectorName(rawSelector: string, actionType: string): string {
    const nameMatch = rawSelector.match(/name="([^"]+)"/);
    const textMatch = rawSelector.match(/text="([^"]+)"/);
    const roleMatch = rawSelector.match(/role=(\w+)/);
    const idMatch = rawSelector.match(/#([\w-]+)/);
    const testIdMatch = rawSelector.match(/data-testid="([^"]+)"/);

    let baseName = '';

    if (testIdMatch) {
        baseName = testIdMatch[1];
    } else if (nameMatch) {
        baseName = nameMatch[1];
    } else if (textMatch) {
        baseName = textMatch[1];
    } else if (idMatch) {
        baseName = idMatch[1];
    } else if (roleMatch) {
        baseName = roleMatch[1];
    } else {
        baseName = actionType + 'Element';
    }

    return baseName
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .trim()
        .split(/\s+/)
        .map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}

/**
 * Add page object entry to the in-memory map.
 */
export function addPageObject(
    pageObjects: Map<string, PageObjectEntry[]>,
    pageName: string,
    selectorName: string,
    rawSelector: string,
    playwrightLocator: string
): void {
    if (!pageObjects.has(pageName)) {
        pageObjects.set(pageName, []);
    }

    pageObjects.get(pageName)!.push({
        pageName,
        selectorName,
        rawSelector,
        playwrightLocator
    });
}

/**
 * Generate page file update.
 */
export async function generatePageFileUpdate(
    projectPath: string,
    pageName: string,
    selectorName: string,
    playwrightLocator: string
): Promise<{ pagePath: string; pageCode: string }> {
    const pagePath = join(projectPath, 'Pages', `${pageName}.vero`);

    const veroSelector = convertPlaywrightLocatorToVero(playwrightLocator);
    const newEntry = `    ${selectorName} = ${veroSelector}`;

    let existingContent = '';
    try {
        existingContent = await readFile(pagePath, 'utf-8');
    } catch {
        existingContent = `page ${pageName} {\n}\n`;
    }

    const lastBrace = existingContent.lastIndexOf('}');
    const pageCode = existingContent.slice(0, lastBrace) + newEntry + '\n' + existingContent.slice(lastBrace);

    return { pagePath, pageCode };
}

/**
 * Load existing page objects from .vero files.
 */
export async function loadPageObjects(
    projectPath: string,
    pageObjects: Map<string, PageObjectEntry[]>
): Promise<void> {
    const pagesDir = join(projectPath, 'Pages');

    try {
        const { readdir } = await import('fs/promises');
        const files = await readdir(pagesDir);

        for (const file of files) {
            if (!file.endsWith('.vero')) continue;

            const content = await readFile(join(pagesDir, file), 'utf-8');
            const pageName = file.replace('.vero', '');

            const selectorRegex = /(\w+)\s*=\s*(.+)/g;
            let match;

            while ((match = selectorRegex.exec(content)) !== null) {
                const selectorName = match[1];
                const selectorValue = match[2].trim();

                addPageObject(pageObjects, pageName, selectorName, selectorValue, selectorValue);
            }
        }
    } catch (e) {
        // No pages directory yet
    }
}

/**
 * Build Vero action code using single source of truth.
 */
export function buildVeroAction(type: string, selector: string, value?: string): string {
    if (type === 'expect') {
        const assertType = value ? 'contains' : 'visible';
        return generateVeroAssertion(selector, assertType, value);
    }
    return generateVeroAction(type, selector, value);
}

/**
 * Convert captured action data to Vero DSL (inline selector, no page object).
 */
export function convertActionToVero(action: any, _currentUrl: string): string | null {
    let selector = '';

    if (action.testId) {
        selector = `testid "${action.testId}"`;
    } else if (action.ariaLabel) {
        selector = `label "${action.ariaLabel}"`;
    } else if (action.role && action.text) {
        selector = `role "${action.role}" name "${action.text}"`;
    } else if (action.placeholder) {
        selector = `placeholder "${action.placeholder}"`;
    } else if (action.id) {
        selector = `#${action.id}`;
    } else if (action.name) {
        selector = `[name="${action.name}"]`;
    } else if (action.text && action.text.length < 30) {
        selector = `text "${action.text}"`;
    } else {
        return null;
    }

    if (action.type === 'fill' && !action.value) return null;
    const veroCode = generateVeroAction(action.type, selector, action.value);
    return veroCode.startsWith('#') ? null : veroCode;
}
