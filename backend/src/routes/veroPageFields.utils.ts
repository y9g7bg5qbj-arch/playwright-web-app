/**
 * Utilities for extracting page/field/action metadata from .vero files.
 *
 * Scans a project directory for all .vero files and parses them to extract
 * PAGE definitions with their fields (including selector type/value) and
 * action signatures.
 */

import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';

export interface PageFieldInfo {
    name: string;
    selectorType: string;
    selectorValue: string;
}

export interface PageActionInfo {
    name: string;
    parameters: string[];
}

export interface PageFieldData {
    name: string;
    filePath: string;
    fields: PageFieldInfo[];
    actions: PageActionInfo[];
}

// Keywords that should not be treated as action names
const RESERVED_WORDS = new Set([
    'page', 'pageactions', 'feature', 'scenario', 'field',
    'if', 'for', 'repeat', 'before', 'after', 'use',
    'text', 'number', 'flag', 'list', 'fixture',
    'setup', 'teardown', 'with', 'returns',
]);

// Known selector type keywords (case-insensitive matching)
const SELECTOR_KEYWORDS = new Set([
    'button', 'textbox', 'link', 'checkbox', 'heading',
    'combobox', 'radio', 'role', 'label', 'placeholder',
    'testid', 'css', 'xpath', 'alt', 'title', 'text', 'name',
]);

/**
 * Parse a field definition line to extract selector type and value.
 *
 * Supports:
 *   FIELD submit = BUTTON "Submit"
 *   FIELD email = TEXTBOX "Email"
 *   FIELD el = CSS ".my-class"
 *   FIELD el = ROLE "button" NAME "Submit"
 *   FIELD el = "#css-selector"   (shorthand, no type keyword)
 */
function parseFieldSelector(rightSide: string): { selectorType: string; selectorValue: string } {
    const trimmed = rightSide.trim();

    // Check if it starts with a known selector keyword: BUTTON "text"
    const keywordMatch = trimmed.match(/^(\w+)\s+"([^"]*)"/i);
    if (keywordMatch && SELECTOR_KEYWORDS.has(keywordMatch[1].toLowerCase())) {
        return {
            selectorType: keywordMatch[1].toUpperCase(),
            selectorValue: keywordMatch[2],
        };
    }

    // Shorthand: just a quoted string → treat as CSS/text selector
    const quotedMatch = trimmed.match(/^"([^"]*)"$/);
    if (quotedMatch) {
        const val = quotedMatch[1];
        // Heuristic: if it starts with . # [ or contains CSS-like chars, it's CSS
        if (/^[.#\[]/.test(val) || val.includes('::') || val.includes('>')) {
            return { selectorType: 'CSS', selectorValue: val };
        }
        return { selectorType: 'TEXT', selectorValue: val };
    }

    // Fallback
    return { selectorType: 'UNKNOWN', selectorValue: trimmed };
}

/**
 * Parse a single .vero file and extract all PAGE definitions.
 */
function parseVeroFileForPages(code: string, filePath: string): PageFieldData[] {
    const pages: PageFieldData[] = [];
    const lines = code.split('\n');

    let currentPageName: string | null = null;
    let currentPageActions: string | null = null; // tracks PAGEACTIONS FOR <page>
    let fields: PageFieldInfo[] = [];
    let actions: PageActionInfo[] = [];
    let braceDepth = 0;
    let insideBlock = false;

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Match PAGE declaration
        const pageMatch = trimmedLine.match(/^PAGE\s+(\w+)(?:\s*\([^)]*\))?\s*\{/i);
        if (pageMatch && !insideBlock) {
            currentPageName = pageMatch[1];
            currentPageActions = null;
            fields = [];
            actions = [];
            braceDepth = 1;
            insideBlock = true;
            continue;
        }

        // Match PAGEACTIONS declaration
        const pageActionsMatch = trimmedLine.match(/^PAGEACTIONS\s+(\w+)\s+FOR\s+(\w+)\s*\{/i);
        if (pageActionsMatch && !insideBlock) {
            currentPageActions = pageActionsMatch[2]; // the page name it's FOR
            currentPageName = null;
            fields = [];
            actions = [];
            braceDepth = 1;
            insideBlock = true;
            continue;
        }

        if (!insideBlock) continue;

        // Track brace depth
        for (const ch of trimmedLine) {
            if (ch === '{') braceDepth++;
            else if (ch === '}') braceDepth--;
        }

        // Field definition: FIELD name = ...
        if (currentPageName) {
            const fieldMatch = trimmedLine.match(/^FIELD\s+(\w+)\s*=\s*(.+)/i);
            if (fieldMatch) {
                const { selectorType, selectorValue } = parseFieldSelector(fieldMatch[2]);
                fields.push({
                    name: fieldMatch[1],
                    selectorType,
                    selectorValue,
                });
                continue;
            }
        }

        // Action definition: actionName WITH params { or actionName {
        // Only at depth 1 (top-level within page/pageactions block)
        if (braceDepth === 2) {
            const actionMatch = trimmedLine.match(/^(\w+)(?:\s+WITH\s+([\w,\s]+))?\s*\{/i);
            if (actionMatch && !RESERVED_WORDS.has(actionMatch[1].toLowerCase())) {
                const params = actionMatch[2]
                    ? actionMatch[2].split(',').map(p => p.trim()).filter(Boolean)
                    : [];
                actions.push({ name: actionMatch[1], parameters: params });
            }
        }

        // Check if we've closed the top-level block
        if (braceDepth <= 0) {
            if (currentPageName) {
                pages.push({
                    name: currentPageName,
                    filePath,
                    fields: [...fields],
                    actions: [...actions],
                });
            } else if (currentPageActions) {
                // Merge actions into existing page or create a new entry
                const existing = pages.find(p => p.name === currentPageActions);
                if (existing) {
                    existing.actions.push(...actions);
                } else {
                    pages.push({
                        name: currentPageActions,
                        filePath,
                        fields: [],
                        actions: [...actions],
                    });
                }
            }
            currentPageName = null;
            currentPageActions = null;
            fields = [];
            actions = [];
            braceDepth = 0;
            insideBlock = false;
        }
    }

    // Handle unclosed block at end of file
    if (currentPageName) {
        pages.push({
            name: currentPageName,
            filePath,
            fields: [...fields],
            actions: [...actions],
        });
    }

    return pages;
}

/**
 * Recursively find all .vero files in a directory.
 */
async function findVeroFiles(dir: string): Promise<string[]> {
    const results: string[] = [];

    try {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                // Skip node_modules, .git, etc.
                if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
                const subFiles = await findVeroFiles(fullPath);
                results.push(...subFiles);
            } else if (entry.name.endsWith('.vero')) {
                results.push(fullPath);
            }
        }
    } catch {
        // Directory doesn't exist or can't be read — return empty
    }

    return results;
}

/**
 * Scan a project directory and extract all page/field metadata.
 *
 * Returns deduplicated PageFieldData entries. If the same page name
 * appears in multiple files, fields and actions are merged.
 */
export async function scanProjectPageFields(projectPath: string): Promise<PageFieldData[]> {
    const veroFiles = await findVeroFiles(projectPath);
    const pageMap = new Map<string, PageFieldData>();

    for (const filePath of veroFiles) {
        try {
            const content = await readFile(filePath, 'utf-8');
            const relativePath = relative(projectPath, filePath);
            const pages = parseVeroFileForPages(content, relativePath);

            for (const page of pages) {
                const existing = pageMap.get(page.name);
                if (existing) {
                    // Merge fields (dedupe by name)
                    const existingFieldNames = new Set(existing.fields.map(f => f.name));
                    for (const field of page.fields) {
                        if (!existingFieldNames.has(field.name)) {
                            existing.fields.push(field);
                        }
                    }
                    // Merge actions (dedupe by name)
                    const existingActionNames = new Set(existing.actions.map(a => a.name));
                    for (const action of page.actions) {
                        if (!existingActionNames.has(action.name)) {
                            existing.actions.push(action);
                        }
                    }
                } else {
                    pageMap.set(page.name, { ...page });
                }
            }
        } catch {
            // Skip files that can't be read
        }
    }

    return Array.from(pageMap.values());
}
