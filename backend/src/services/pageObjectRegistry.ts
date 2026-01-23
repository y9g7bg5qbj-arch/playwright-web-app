/**
 * Page Object Registry Service
 *
 * Central registry for managing page objects during recording.
 * Handles:
 * - Loading existing page objects from .vero files
 * - Looking up selectors to find existing fields
 * - Creating new fields with auto-generated names
 * - Persisting page object changes to disk
 */

import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';

// Element information captured from browser
export interface ElementInfo {
    tagName: string;
    role?: string;
    testId?: string;
    ariaLabel?: string;
    placeholder?: string;
    id?: string;
    name?: string;
    className?: string;
    text?: string;
    inputType?: string;
    href?: string;
}

// A field in a page object
export interface PageField {
    name: string;
    selector: string;
    selectorType: 'testid' | 'role' | 'label' | 'placeholder' | 'text' | 'id' | 'css';
    rawValue: string;
}

// A page object with its fields and URL patterns
export interface PageObject {
    name: string;
    filePath: string;
    urlPatterns: string[];  // URL patterns like "/login", "/signin", "/auth/*"
    fields: Map<string, PageField>;
    actions: string[]; // Raw action block content
    rawContent: string;
}

// Reference to a page field
export interface PageFieldRef {
    pageName: string;
    fieldName: string;
    selector: string;
}

// Result of duplicate detection
export interface DuplicateCheckResult {
    isDuplicate: boolean;
    existingRef: PageFieldRef | null;
    similarity: number;           // 0-1 score
    matchType: 'exact' | 'fuzzy' | 'semantic' | 'none';
    recommendation: 'reuse' | 'create' | 'review';
    reason?: string;
}

// Result of selector generation
export interface SelectorResult {
    veroSelector: string;
    selectorType: string;
    confidence: number;
    rawValue: string;
}

export class PageObjectRegistry {
    private pages: Map<string, PageObject> = new Map();
    private selectorIndex: Map<string, PageFieldRef> = new Map();
    private projectPath: string;

    constructor(projectPath: string) {
        this.projectPath = projectPath;
    }

    /**
     * Load all page objects from the pages directory
     */
    async loadFromDisk(): Promise<void> {
        const pagesDir = join(this.projectPath, 'pages');

        if (!existsSync(pagesDir)) {
            console.log('[PageObjectRegistry] No pages directory found');
            return;
        }

        try {
            const files = await readdir(pagesDir);

            for (const file of files) {
                if (!file.endsWith('.vero')) continue;

                const filePath = join(pagesDir, file);
                const content = await readFile(filePath, 'utf-8');
                const pageName = file.replace('.vero', '');

                const pageObject = this.parsePage(pageName, filePath, content);
                this.pages.set(pageName, pageObject);

                // Index all selectors
                for (const [fieldName, field] of pageObject.fields) {
                    this.indexSelector(field.selector, {
                        pageName,
                        fieldName,
                        selector: field.selector
                    });
                }
            }

            console.log(`[PageObjectRegistry] Loaded ${this.pages.size} pages with ${this.selectorIndex.size} indexed selectors`);
        } catch (error) {
            console.error('[PageObjectRegistry] Error loading pages:', error);
        }
    }

    /**
     * Parse a page file content into a PageObject
     */
    private parsePage(pageName: string, filePath: string, content: string): PageObject {
        const fields = new Map<string, PageField>();
        const actions: string[] = [];
        const urlPatterns: string[] = [];

        // Parse URL patterns from PAGE declaration
        // Supports: PAGE LoginPage ("/login", "/signin", "/auth/*") {
        const pageUrlPatternMatch = content.match(/PAGE\s+\w+\s*\(([^)]+)\)/i);
        if (pageUrlPatternMatch) {
            const patternsStr = pageUrlPatternMatch[1];
            // Extract all quoted strings
            const patternMatches = patternsStr.matchAll(/"([^"]+)"/g);
            for (const m of patternMatches) {
                urlPatterns.push(m[1]);
            }
        }

        // Parse field declarations: field name = selector
        // Supports: field emailInput = testId "email"
        //           field submitBtn = button "Submit"
        //           field loginLink = "#login-link"
        //           FIELD emailInput = TEXTBOX "Email" (legacy uppercase)
        const fieldRegex = /field\s+(\w+)\s*=\s*(.+?)(?=\n|$)/gi;
        let match;

        while ((match = fieldRegex.exec(content)) !== null) {
            const fieldName = match[1];
            const selectorValue = match[2].trim();

            const { type, rawValue } = this.parseSelectorValue(selectorValue);

            fields.set(fieldName, {
                name: fieldName,
                selector: selectorValue,
                selectorType: type,
                rawValue
            });
        }

        // Parse alternative format: just name = selector (without "field" keyword)
        const altFieldRegex = /^\s{2,}(\w+)\s*=\s*(.+?)(?=\n|$)/gm;
        while ((match = altFieldRegex.exec(content)) !== null) {
            const fieldName = match[1];
            if (fields.has(fieldName)) continue; // Skip if already parsed

            const selectorValue = match[2].trim();
            const { type, rawValue } = this.parseSelectorValue(selectorValue);

            fields.set(fieldName, {
                name: fieldName,
                selector: selectorValue,
                selectorType: type,
                rawValue
            });
        }

        return {
            name: pageName,
            filePath,
            urlPatterns,
            fields,
            actions,
            rawContent: content
        };
    }

    /**
     * Parse a selector value to determine its type and extract raw value
     */
    private parseSelectorValue(value: string): { type: PageField['selectorType']; rawValue: string } {
        // testId "value"
        const testIdMatch = value.match(/^testId\s+"([^"]+)"$/i);
        if (testIdMatch) return { type: 'testid', rawValue: testIdMatch[1] };

        // role "button" name "Submit" or just button "Submit"
        const roleMatch = value.match(/^(?:role\s+")?(\w+)"\s+(?:name\s+)?"([^"]+)"$/i);
        if (roleMatch) return { type: 'role', rawValue: `${roleMatch[1]}:${roleMatch[2]}` };

        // button "Submit" (shorthand)
        const buttonMatch = value.match(/^button\s+"([^"]+)"$/i);
        if (buttonMatch) return { type: 'role', rawValue: `button:${buttonMatch[1]}` };

        // link "Click here"
        const linkMatch = value.match(/^link\s+"([^"]+)"$/i);
        if (linkMatch) return { type: 'role', rawValue: `link:${linkMatch[1]}` };

        // TEXTBOX "Email" (legacy format - maps to label)
        const textboxMatch = value.match(/^textbox\s+"([^"]+)"$/i);
        if (textboxMatch) return { type: 'label', rawValue: textboxMatch[1] };

        // label "Username"
        const labelMatch = value.match(/^label\s+"([^"]+)"$/i);
        if (labelMatch) return { type: 'label', rawValue: labelMatch[1] };

        // placeholder "Enter email"
        const placeholderMatch = value.match(/^placeholder\s+"([^"]+)"$/i);
        if (placeholderMatch) return { type: 'placeholder', rawValue: placeholderMatch[1] };

        // text "Click me"
        const textMatch = value.match(/^text\s+"([^"]+)"$/i);
        if (textMatch) return { type: 'text', rawValue: textMatch[1] };

        // "Simple text selector"
        const simpleTextMatch = value.match(/^"([^"]+)"$/);
        if (simpleTextMatch) return { type: 'text', rawValue: simpleTextMatch[1] };

        // #id or .class or complex CSS
        if (value.startsWith('#')) return { type: 'id', rawValue: value.slice(1) };
        if (value.startsWith('.') || value.includes('[')) return { type: 'css', rawValue: value };

        return { type: 'css', rawValue: value };
    }

    /**
     * Index a selector for quick lookup
     */
    private indexSelector(selector: string, ref: PageFieldRef): void {
        // Normalize selector for comparison
        const normalized = this.normalizeSelector(selector);
        this.selectorIndex.set(normalized, ref);
    }

    /**
     * Normalize a selector for comparison
     */
    private normalizeSelector(selector: string): string {
        return selector
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Find an existing page field by selector
     */
    findBySelector(selector: string): PageFieldRef | null {
        const normalized = this.normalizeSelector(selector);
        return this.selectorIndex.get(normalized) || null;
    }

    /**
     * Find a similar selector that might match the same element
     * Useful for detecting duplicate selectors with different syntax
     */
    findSimilarSelector(element: ElementInfo): PageFieldRef | null {
        // Try different selector variations
        const variations: string[] = [];

        if (element.testId) {
            variations.push(`testid "${element.testId}"`);
            variations.push(`testId "${element.testId}"`);
        }

        if (element.ariaLabel && element.role) {
            variations.push(`${element.role} "${element.ariaLabel}"`);
            variations.push(`role "${element.role}" name "${element.ariaLabel}"`);
        }

        if (element.placeholder) {
            variations.push(`placeholder "${element.placeholder}"`);
        }

        if (element.id) {
            variations.push(`#${element.id}`);
        }

        if (element.text && element.text.length < 50) {
            variations.push(`text "${element.text}"`);
            variations.push(`"${element.text}"`);
        }

        for (const variation of variations) {
            const ref = this.findBySelector(variation);
            if (ref) return ref;
        }

        return null;
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    private levenshteinDistance(a: string, b: string): number {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix: number[][] = [];

        // Initialize first column
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        // Initialize first row
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        // Fill in the rest of the matrix
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * Calculate similarity score between two strings (0-1)
     */
    private calculateSimilarity(a: string, b: string): number {
        const normalizedA = a.toLowerCase().trim();
        const normalizedB = b.toLowerCase().trim();

        if (normalizedA === normalizedB) return 1.0;
        if (normalizedA.length === 0 || normalizedB.length === 0) return 0;

        const distance = this.levenshteinDistance(normalizedA, normalizedB);
        const maxLength = Math.max(normalizedA.length, normalizedB.length);
        return 1 - distance / maxLength;
    }

    /**
     * Extract the text value from a selector for comparison
     */
    private extractSelectorText(selector: string): string | null {
        // Extract quoted values from selectors
        const match = selector.match(/"([^"]+)"/);
        return match ? match[1] : null;
    }

    /**
     * Check if two selectors target semantically similar elements
     */
    private areSemanticallyRelated(selector1: string, selector2: string): boolean {
        // Extract selector types
        const type1 = this.extractSelectorType(selector1);
        const type2 = this.extractSelectorType(selector2);

        // Related types that might select the same element
        const relatedGroups = [
            ['button', 'role', 'text'],       // Interactive elements
            ['label', 'placeholder', 'text'], // Form field identifiers
            ['link', 'text'],                 // Navigation elements
        ];

        for (const group of relatedGroups) {
            if (group.includes(type1) && group.includes(type2)) {
                return true;
            }
        }

        return type1 === type2;
    }

    /**
     * Extract the selector type from a selector string
     */
    private extractSelectorType(selector: string): string {
        if (selector.startsWith('testId') || selector.startsWith('testid')) return 'testid';
        if (selector.startsWith('button')) return 'button';
        if (selector.startsWith('link')) return 'link';
        if (selector.startsWith('label')) return 'label';
        if (selector.startsWith('placeholder')) return 'placeholder';
        if (selector.startsWith('text')) return 'text';
        if (selector.startsWith('role')) return 'role';
        if (selector.startsWith('#')) return 'id';
        if (selector.startsWith('.') || selector.includes('[')) return 'css';
        return 'unknown';
    }

    /**
     * Comprehensive duplicate detection with fuzzy matching
     * Returns details about potential duplicates
     */
    checkForDuplicate(element: ElementInfo, newSelector: string, pageName?: string): DuplicateCheckResult {
        // 1. Check for exact match first
        const exactRef = this.findBySelector(newSelector);
        if (exactRef) {
            return {
                isDuplicate: true,
                existingRef: exactRef,
                similarity: 1.0,
                matchType: 'exact',
                recommendation: 'reuse',
                reason: `Exact selector already exists as ${exactRef.pageName}.${exactRef.fieldName}`
            };
        }

        // 2. Check for similar selector (exact variations)
        const similarRef = this.findSimilarSelector(element);
        if (similarRef) {
            return {
                isDuplicate: true,
                existingRef: similarRef,
                similarity: 1.0,
                matchType: 'exact',
                recommendation: 'reuse',
                reason: `Same element already exists as ${similarRef.pageName}.${similarRef.fieldName}`
            };
        }

        // 3. Fuzzy matching against all existing selectors
        const newText = this.extractSelectorText(newSelector);
        let bestMatch: { ref: PageFieldRef; similarity: number; matchType: 'fuzzy' | 'semantic' } | null = null;

        // Search in specified page first, then all pages
        const pagesToSearch = pageName
            ? [this.pages.get(pageName), ...Array.from(this.pages.values()).filter(p => p.name !== pageName)]
            : Array.from(this.pages.values());

        for (const page of pagesToSearch) {
            if (!page) continue;

            for (const [, field] of page.fields) {
                const existingText = this.extractSelectorText(field.selector);

                if (newText && existingText) {
                    const similarity = this.calculateSimilarity(newText, existingText);

                    // Check for high text similarity
                    if (similarity >= 0.8) {
                        const ref: PageFieldRef = {
                            pageName: page.name,
                            fieldName: field.name,
                            selector: field.selector
                        };

                        if (!bestMatch || similarity > bestMatch.similarity) {
                            bestMatch = { ref, similarity, matchType: 'fuzzy' };
                        }
                    }
                    // Check for semantic relationship with lower threshold
                    else if (similarity >= 0.6 && this.areSemanticallyRelated(newSelector, field.selector)) {
                        const ref: PageFieldRef = {
                            pageName: page.name,
                            fieldName: field.name,
                            selector: field.selector
                        };

                        if (!bestMatch || similarity > bestMatch.similarity) {
                            bestMatch = { ref, similarity, matchType: 'semantic' };
                        }
                    }
                }

                // Also check for substring matches (e.g., "Submit" matches "Submit Button")
                if (newText && existingText) {
                    const lowerNew = newText.toLowerCase();
                    const lowerExisting = existingText.toLowerCase();

                    if (lowerNew.includes(lowerExisting) || lowerExisting.includes(lowerNew)) {
                        const similarity = Math.min(lowerNew.length, lowerExisting.length) /
                                          Math.max(lowerNew.length, lowerExisting.length);

                        if (similarity >= 0.7) {
                            const ref: PageFieldRef = {
                                pageName: page.name,
                                fieldName: field.name,
                                selector: field.selector
                            };

                            if (!bestMatch || similarity > bestMatch.similarity) {
                                bestMatch = { ref, similarity, matchType: 'semantic' };
                            }
                        }
                    }
                }
            }
        }

        // Return best fuzzy match if found
        if (bestMatch) {
            const { ref, similarity, matchType } = bestMatch;

            // High similarity = likely duplicate
            if (similarity >= 0.9) {
                return {
                    isDuplicate: true,
                    existingRef: ref,
                    similarity,
                    matchType,
                    recommendation: 'reuse',
                    reason: `Very similar to ${ref.pageName}.${ref.fieldName} (${Math.round(similarity * 100)}% match)`
                };
            }

            // Medium similarity = needs review
            if (similarity >= 0.7) {
                return {
                    isDuplicate: false,
                    existingRef: ref,
                    similarity,
                    matchType,
                    recommendation: 'review',
                    reason: `Similar to ${ref.pageName}.${ref.fieldName} (${Math.round(similarity * 100)}% match) - review if targeting same element`
                };
            }
        }

        // No duplicate found
        return {
            isDuplicate: false,
            existingRef: null,
            similarity: 0,
            matchType: 'none',
            recommendation: 'create',
            reason: 'No similar selector found'
        };
    }

    /**
     * Find all fields in a page that might be duplicates of each other
     * Useful for cleanup and deduplication
     */
    findDuplicatesInPage(pageName: string): Array<{
        field1: PageField;
        field2: PageField;
        similarity: number;
        recommendation: string;
    }> {
        const page = this.pages.get(pageName);
        if (!page) return [];

        const duplicates: Array<{
            field1: PageField;
            field2: PageField;
            similarity: number;
            recommendation: string;
        }> = [];

        const fields = Array.from(page.fields.values());

        for (let i = 0; i < fields.length; i++) {
            for (let j = i + 1; j < fields.length; j++) {
                const text1 = this.extractSelectorText(fields[i].selector);
                const text2 = this.extractSelectorText(fields[j].selector);

                if (text1 && text2) {
                    const similarity = this.calculateSimilarity(text1, text2);

                    if (similarity >= 0.7) {
                        duplicates.push({
                            field1: fields[i],
                            field2: fields[j],
                            similarity,
                            recommendation: similarity >= 0.9
                                ? 'Remove one field - likely duplicates'
                                : 'Review - might target same element'
                        });
                    }
                }
            }
        }

        return duplicates;
    }

    /**
     * Generate the best selector for an element (Playwright codegen style)
     */
    generateSelector(element: ElementInfo): SelectorResult {
        // Priority order: testId > role+name > label > placeholder > text > id > css

        // 1. data-testid (highest priority)
        if (element.testId) {
            return {
                veroSelector: `testId "${element.testId}"`,
                selectorType: 'testid',
                confidence: 1.0,
                rawValue: element.testId
            };
        }

        // 2. Role with name (semantic)
        if (element.role && element.ariaLabel) {
            return {
                veroSelector: `${element.role} "${element.ariaLabel}"`,
                selectorType: 'role',
                confidence: 0.95,
                rawValue: `${element.role}:${element.ariaLabel}`
            };
        }

        // 2b. Button/link by text content
        if (element.role === 'button' && element.text && element.text.length < 30) {
            return {
                veroSelector: `button "${element.text}"`,
                selectorType: 'role',
                confidence: 0.9,
                rawValue: `button:${element.text}`
            };
        }

        if (element.role === 'link' && element.text && element.text.length < 30) {
            return {
                veroSelector: `link "${element.text}"`,
                selectorType: 'role',
                confidence: 0.9,
                rawValue: `link:${element.text}`
            };
        }

        // 3. Label (for form elements)
        if (element.ariaLabel) {
            return {
                veroSelector: `label "${element.ariaLabel}"`,
                selectorType: 'label',
                confidence: 0.85,
                rawValue: element.ariaLabel
            };
        }

        // 4. Placeholder (for inputs)
        if (element.placeholder) {
            return {
                veroSelector: `placeholder "${element.placeholder}"`,
                selectorType: 'placeholder',
                confidence: 0.8,
                rawValue: element.placeholder
            };
        }

        // 5. Text content (for buttons, links, etc.)
        if (element.text && element.text.length < 30 && !this.isAutoGenerated(element.text)) {
            return {
                veroSelector: `text "${element.text}"`,
                selectorType: 'text',
                confidence: 0.7,
                rawValue: element.text
            };
        }

        // 6. ID (if not auto-generated)
        if (element.id && !this.isAutoGenerated(element.id)) {
            return {
                veroSelector: `#${element.id}`,
                selectorType: 'id',
                confidence: 0.6,
                rawValue: element.id
            };
        }

        // 7. Name attribute
        if (element.name) {
            return {
                veroSelector: `[name="${element.name}"]`,
                selectorType: 'css',
                confidence: 0.5,
                rawValue: element.name
            };
        }

        // 8. Fallback to CSS selector
        const cssSelector = this.buildCssSelector(element);
        return {
            veroSelector: cssSelector,
            selectorType: 'css',
            confidence: 0.3,
            rawValue: cssSelector
        };
    }

    /**
     * Check if a value looks auto-generated (random/hash-like)
     */
    private isAutoGenerated(value: string): boolean {
        // Check for common auto-generated patterns
        const autoGenPatterns = [
            /^[a-f0-9]{8,}$/i,           // Hex hashes
            /^[a-z]{1,3}[0-9a-f]{6,}$/i, // Prefixed hashes (e.g., "r1a2b3c4")
            /^:r[0-9a-z]+:$/,            // React IDs
            /^sc-[a-z]+$/i,              // Styled-components
            /^css-[a-z0-9]+$/i,          // CSS modules
            /^ember\d+$/,                // Ember
            /^ng-[a-z]+-\d+$/,           // Angular
            /__[a-z]+_\d+$/i,            // BEM-like generated
        ];

        return autoGenPatterns.some(pattern => pattern.test(value));
    }

    /**
     * Build a CSS selector from element info
     */
    private buildCssSelector(element: ElementInfo): string {
        const parts: string[] = [element.tagName.toLowerCase()];

        if (element.className) {
            const classes = element.className.split(/\s+/).filter(c => !this.isAutoGenerated(c));
            if (classes.length > 0) {
                parts.push(`.${classes[0]}`);
            }
        }

        if (element.inputType) {
            parts.push(`[type="${element.inputType}"]`);
        }

        return parts.join('');
    }

    /**
     * Generate a field name from element info
     */
    generateFieldName(element: ElementInfo, action: string = 'click'): string {
        let baseName = '';

        // Try to extract a meaningful name
        if (element.testId) {
            baseName = element.testId;
        } else if (element.ariaLabel) {
            baseName = element.ariaLabel;
        } else if (element.placeholder) {
            baseName = element.placeholder;
        } else if (element.text && element.text.length < 20) {
            baseName = element.text;
        } else if (element.name) {
            baseName = element.name;
        } else if (element.id && !this.isAutoGenerated(element.id)) {
            baseName = element.id;
        } else {
            // Fallback: use tag + action
            baseName = `${element.tagName}${action.charAt(0).toUpperCase() + action.slice(1)}`;
        }

        // Convert to camelCase
        return this.toCamelCase(baseName);
    }

    /**
     * Convert a string to camelCase
     */
    private toCamelCase(str: string): string {
        return str
            .replace(/[^a-zA-Z0-9\s]/g, ' ')
            .trim()
            .split(/\s+/)
            .map((word, i) => {
                if (i === 0) return word.toLowerCase();
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join('');
    }

    /**
     * Suggest a page name based on URL
     */
    suggestPageName(url: string): string {
        try {
            const urlObj = new URL(url);
            const path = urlObj.pathname.replace(/^\/|\/$/g, '');

            if (!path || path === '') return 'HomePage';

            // Convert path to PascalCase page name
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
     * Find a page that matches the given URL based on URL patterns
     */
    findPageByUrl(url: string): PageObject | null {
        const urlPath = this.extractUrlPath(url);

        for (const [, page] of this.pages) {
            if (page.urlPatterns.length > 0) {
                for (const pattern of page.urlPatterns) {
                    if (this.matchUrlPattern(urlPath, pattern)) {
                        return page;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Extract the path from a URL (without domain and query params for matching)
     */
    private extractUrlPath(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.pathname;
        } catch {
            // If not a valid URL, treat as path
            return url.split('?')[0];
        }
    }

    /**
     * Match a URL path against a pattern
     * Supports:
     *   - Exact match: "/login" matches "/login"
     *   - Wildcard suffix: "/login*" matches "/login", "/login/forgot", "/login?x=1"
     *   - Wildcard prefix: "*\/login" matches any domain + "/login"
     *   - Contains: "*\/auth\/*" matches any URL containing "/auth/"
     */
    private matchUrlPattern(urlPath: string, pattern: string): boolean {
        // Remove leading/trailing whitespace
        pattern = pattern.trim();
        urlPath = urlPath.trim();

        // Handle wildcard patterns
        if (pattern.startsWith('*') && pattern.endsWith('*')) {
            // Contains pattern: *\/auth\/*
            const inner = pattern.slice(1, -1);
            return urlPath.includes(inner);
        }

        if (pattern.startsWith('*/')) {
            // Wildcard prefix: */login matches any path ending with /login
            const suffix = pattern.slice(1); // Remove leading *
            return urlPath === suffix || urlPath.endsWith(suffix);
        }

        if (pattern.endsWith('*')) {
            // Wildcard suffix: /login* matches /login, /login/x, /login?y
            const prefix = pattern.slice(0, -1);
            return urlPath.startsWith(prefix);
        }

        // Exact match (ignoring query params)
        return urlPath === pattern || urlPath.startsWith(pattern + '?');
    }

    /**
     * Get or create a page for the given URL
     * First tries to find an existing page by URL pattern match
     */
    getOrCreatePage(url: string): PageObject {
        // First, try to find an existing page by URL pattern
        const existingPage = this.findPageByUrl(url);
        if (existingPage) {
            return existingPage;
        }

        // Next, check if page exists by suggested name
        const suggestedName = this.suggestPageName(url);
        if (this.pages.has(suggestedName)) {
            return this.pages.get(suggestedName)!;
        }

        // Create new page object with the URL pattern
        const urlPath = this.extractUrlPath(url);
        const filePath = join(this.projectPath, 'pages', `${suggestedName}.vero`);
        const newPage: PageObject = {
            name: suggestedName,
            filePath,
            urlPatterns: [urlPath],  // Initialize with current URL path
            fields: new Map(),
            actions: [],
            rawContent: ''  // Will be generated by updatePageContent
        };

        this.updatePageContent(newPage);
        this.pages.set(suggestedName, newPage);
        return newPage;
    }

    /**
     * Add a URL pattern to an existing page
     */
    addUrlPattern(pageName: string, pattern: string): void {
        const page = this.pages.get(pageName);
        if (!page) {
            throw new Error(`Page not found: ${pageName}`);
        }

        // Avoid duplicates
        if (!page.urlPatterns.includes(pattern)) {
            page.urlPatterns.push(pattern);
            this.updatePageContent(page);
        }
    }

    /**
     * Get URL patterns for a page
     */
    getUrlPatterns(pageName: string): string[] {
        const page = this.pages.get(pageName);
        return page?.urlPatterns || [];
    }

    /**
     * Add a new field to a page
     */
    addField(pageName: string, fieldName: string, selector: string): PageFieldRef {
        const page = this.pages.get(pageName);
        if (!page) {
            throw new Error(`Page not found: ${pageName}`);
        }

        // Ensure unique field name
        let uniqueName = fieldName;
        let counter = 1;
        while (page.fields.has(uniqueName)) {
            uniqueName = `${fieldName}${counter}`;
            counter++;
        }

        const { type, rawValue } = this.parseSelectorValue(selector);

        const field: PageField = {
            name: uniqueName,
            selector,
            selectorType: type,
            rawValue
        };

        page.fields.set(uniqueName, field);

        // Index the new selector
        const ref: PageFieldRef = {
            pageName,
            fieldName: uniqueName,
            selector
        };
        this.indexSelector(selector, ref);

        // Update raw content
        this.updatePageContent(page);

        return ref;
    }

    /**
     * Update the raw content of a page after adding fields
     */
    private updatePageContent(page: PageObject): void {
        // Rebuild the page content with URL patterns and fields
        const lines: string[] = [
            `# ${page.name}`,
            ''
        ];

        // Build PAGE declaration with URL patterns
        if (page.urlPatterns.length > 0) {
            const patternsStr = page.urlPatterns.map(p => `"${p}"`).join(', ');
            lines.push(`PAGE ${page.name} (${patternsStr}) {`);
        } else {
            lines.push(`PAGE ${page.name} {`);
        }

        // Add all fields
        for (const [, field] of page.fields) {
            lines.push(`    FIELD ${field.name} = ${field.selector}`);
        }

        // Add actions if any
        for (const action of page.actions) {
            lines.push('');
            lines.push(action);
        }

        lines.push('}');
        lines.push('');

        page.rawContent = lines.join('\n');
    }

    /**
     * Persist a page object to disk
     */
    async persist(pageName: string): Promise<string> {
        const page = this.pages.get(pageName);
        if (!page) {
            throw new Error(`Page not found: ${pageName}`);
        }

        // Ensure pages directory exists
        const pagesDir = join(this.projectPath, 'pages');
        if (!existsSync(pagesDir)) {
            await mkdir(pagesDir, { recursive: true });
        }

        // Write the page file
        await writeFile(page.filePath, page.rawContent, 'utf-8');

        console.log(`[PageObjectRegistry] Persisted ${pageName} to ${page.filePath}`);

        return page.filePath;
    }

    /**
     * Get the content of a page
     */
    getPageContent(pageName: string): string | null {
        const page = this.pages.get(pageName);
        return page ? page.rawContent : null;
    }

    /**
     * Check if a page exists
     */
    hasPage(pageName: string): boolean {
        return this.pages.has(pageName);
    }

    /**
     * Get all page names
     */
    getPageNames(): string[] {
        return Array.from(this.pages.keys());
    }

    /**
     * Get a page by name
     */
    getPage(pageName: string): PageObject | null {
        return this.pages.get(pageName) || null;
    }
}

// Singleton instance
let registryInstance: PageObjectRegistry | null = null;

export function getPageObjectRegistry(projectPath?: string): PageObjectRegistry {
    if (!registryInstance && projectPath) {
        registryInstance = new PageObjectRegistry(projectPath);
    }
    if (!registryInstance) {
        throw new Error('PageObjectRegistry not initialized');
    }
    return registryInstance;
}

export function initPageObjectRegistry(projectPath: string): PageObjectRegistry {
    registryInstance = new PageObjectRegistry(projectPath);
    return registryInstance;
}
