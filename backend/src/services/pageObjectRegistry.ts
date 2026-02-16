/**
 * Page Object Registry Service
 *
 * Central registry for managing page objects during recording.
 * Handles:
 * - Loading existing page objects from .vero files
 * - Looking up selectors to find existing fields
 * - Creating new fields with auto-generated names
 * - Persisting page object changes to disk
 *
 * Fuzzy matching algorithms live in selector/selectorMatching.ts.
 * Selector parsing and utility helpers live in selector/selectorUtils.ts.
 */

import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { logger } from '../utils/logger';
import { calculateSimilarity, extractSelectorText, areSemanticallyRelated } from './selector/selectorMatching';
import { parseSelectorValue, normalizeSelector, toPascalCase } from './selector/selectorUtils';
import { generateSelector as generateSelectorFromElement, generateFieldName as generateFieldNameFromElement } from './selector/selectorGenerator';

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
        const pagesDir = join(this.projectPath, 'Pages');

        if (!existsSync(pagesDir)) {
            logger.debug('[PageObjectRegistry] No pages directory found');
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
                for (const [, field] of pageObject.fields) {
                    this.indexSelector(field.selector, {
                        pageName,
                        fieldName: field.name,
                        selector: field.selector
                    });
                }
            }

            logger.debug(`[PageObjectRegistry] Loaded ${this.pages.size} pages with ${this.selectorIndex.size} indexed selectors`);
        } catch (error) {
            logger.error('[PageObjectRegistry] Error loading pages:', error);
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
            const patternMatches = patternsStr.matchAll(/"([^"]+)"/g);
            for (const m of patternMatches) {
                urlPatterns.push(m[1]);
            }
        }

        // Parse field declarations: field name = selector
        const fieldRegex = /field\s+(\w+)\s*=\s*(.+?)(?=\n|$)/gi;
        let match;

        while ((match = fieldRegex.exec(content)) !== null) {
            const fieldName = match[1];
            const selectorValue = match[2].trim();
            const { type, rawValue } = parseSelectorValue(selectorValue);

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
            if (fields.has(fieldName)) continue;

            const selectorValue = match[2].trim();
            const { type, rawValue } = parseSelectorValue(selectorValue);

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
     * Index a selector for quick lookup
     */
    private indexSelector(selector: string, ref: PageFieldRef): void {
        const normalized = normalizeSelector(selector);
        this.selectorIndex.set(normalized, ref);
    }

    /**
     * Find an existing page field by selector
     */
    findBySelector(selector: string, pageName?: string): PageFieldRef | null {
        const normalized = normalizeSelector(selector);
        const ref = this.selectorIndex.get(normalized) || null;
        // When pageName is provided, only return matches from that specific page
        if (pageName && ref && ref.pageName !== pageName) {
            return null;
        }
        return ref;
    }

    /**
     * Find a similar selector that might match the same element
     * Useful for detecting duplicate selectors with different syntax
     */
    findSimilarSelector(element: ElementInfo, pageName?: string): PageFieldRef | null {
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
            const ref = this.findBySelector(variation, pageName);
            if (ref) return ref;
        }

        return null;
    }

    /**
     * Comprehensive duplicate detection with fuzzy matching
     * Returns details about potential duplicates
     */
    checkForDuplicate(element: ElementInfo, newSelector: string, pageName?: string): DuplicateCheckResult {
        // 1. Check for exact match on the CURRENT page only
        const exactRef = this.findBySelector(newSelector, pageName);
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

        // 2. Check for similar selector on the CURRENT page only
        const similarRef = this.findSimilarSelector(element, pageName);
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
        const bestMatch = this.findBestFuzzyMatch(newSelector, pageName);

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
     * Find the best fuzzy match for a selector across all pages
     */
    private findBestFuzzyMatch(
        newSelector: string,
        pageName?: string
    ): { ref: PageFieldRef; similarity: number; matchType: 'fuzzy' | 'semantic' } | null {
        const newText = extractSelectorText(newSelector);
        let bestMatch: { ref: PageFieldRef; similarity: number; matchType: 'fuzzy' | 'semantic' } | null = null;

        // Search in specified page first, then all pages
        const pagesToSearch = pageName
            ? [this.pages.get(pageName), ...Array.from(this.pages.values()).filter(p => p.name !== pageName)]
            : Array.from(this.pages.values());

        for (const page of pagesToSearch) {
            if (!page) continue;

            for (const [, field] of page.fields) {
                const existingText = extractSelectorText(field.selector);
                if (!newText || !existingText) continue;

                const ref: PageFieldRef = {
                    pageName: page.name,
                    fieldName: field.name,
                    selector: field.selector
                };

                // Check for high text similarity
                const similarity = calculateSimilarity(newText, existingText);

                if (similarity >= 0.8) {
                    if (!bestMatch || similarity > bestMatch.similarity) {
                        bestMatch = { ref, similarity, matchType: 'fuzzy' };
                    }
                } else if (similarity >= 0.6 && areSemanticallyRelated(newSelector, field.selector)) {
                    if (!bestMatch || similarity > bestMatch.similarity) {
                        bestMatch = { ref, similarity, matchType: 'semantic' };
                    }
                }

                // Also check for substring matches (e.g., "Submit" matches "Submit Button")
                const lowerNew = newText.toLowerCase();
                const lowerExisting = existingText.toLowerCase();

                if (lowerNew.includes(lowerExisting) || lowerExisting.includes(lowerNew)) {
                    const substringSimlarity = Math.min(lowerNew.length, lowerExisting.length) /
                        Math.max(lowerNew.length, lowerExisting.length);

                    if (substringSimlarity >= 0.7) {
                        if (!bestMatch || substringSimlarity > bestMatch.similarity) {
                            bestMatch = { ref, similarity: substringSimlarity, matchType: 'semantic' };
                        }
                    }
                }
            }
        }

        return bestMatch;
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
                const text1 = extractSelectorText(fields[i].selector);
                const text2 = extractSelectorText(fields[j].selector);

                if (text1 && text2) {
                    const similarity = calculateSimilarity(text1, text2);

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
        return generateSelectorFromElement(element);
    }

    /**
     * Generate a field name from element info
     */
    generateFieldName(element: ElementInfo, action: string = 'click'): string {
        return generateFieldNameFromElement(element, action);
    }

    private getDomainLabel(hostname: string): string {
        const suffixes = new Set([
            'www', 'com', 'org', 'net', 'co', 'uk', 'us', 'io', 'app', 'dev', 'edu', 'gov',
            'okta', 'herokuapp', 'vercel'
        ]);

        const parts = hostname.toLowerCase().split('.').filter(Boolean);
        const meaningful = parts.filter(part => !suffixes.has(part));
        if (meaningful.length === 0) return '';

        // Prefer the registrable/domain-like part over subdomains.
        const chosen = meaningful[meaningful.length - 1];
        // Keep only first hyphen chunk (the-internet -> the) for shorter deterministic names.
        const compact = chosen.split('-')[0];
        return toPascalCase(compact);
    }

    private getPathLabel(pathname: string): string {
        const cleanPath = pathname.replace(/^\/+|\/+$/g, '');
        if (!cleanPath) return 'Home';

        const parts = cleanPath
            .split(/[\/._-]+/)
            .filter(Boolean)
            .map(part => toPascalCase(part))
            .filter(Boolean);

        return parts.length > 0 ? parts.join('') : 'Home';
    }

    /**
     * Suggest a page name based on URL
     */
    suggestPageName(url: string): string {
        try {
            const urlObj = new URL(url);
            const domainLabel = this.getDomainLabel(urlObj.hostname);
            const pathLabel = this.getPathLabel(urlObj.pathname);

            if (pathLabel === 'Home') {
                return domainLabel ? `${domainLabel}HomePage` : 'HomePage';
            }

            const prefix = domainLabel ? `${domainLabel}` : '';
            return `${prefix}${pathLabel}Page`;
        } catch {
            return 'MainPage';
        }
    }

    /**
     * Suggest a page name from a browser tab title.
     * Examples:
     *   Home | Salesforce -> SalesforceHomePage
     *   Sign In - Okta -> OktaSignInPage
     */
    suggestPageNameFromTitle(title: string): string {
        const trimmed = title.trim();
        if (!trimmed) return '';

        let left = '';
        let right = '';

        if (trimmed.includes('|')) {
            const [lhs, rhs] = trimmed.split('|').map(s => s.trim());
            left = lhs || '';
            right = rhs || '';
        } else if (trimmed.includes(' - ')) {
            const [lhs, rhs] = trimmed.split(' - ').map(s => s.trim());
            left = lhs || '';
            right = rhs || '';
        }

        // For plain single-title pages (e.g. Dashboard), use "<Title>HomePage".
        const brand = toPascalCase((right || trimmed).replace(/:.+$/, '').trim());
        const page = toPascalCase((left || 'Home').replace(/:.+$/, '').trim()) || 'Home';

        let name = `${brand}${page}Page`;
        if (!right && !left) {
            name = `${toPascalCase(trimmed)}HomePage`;
        }

        // Keep names short and deterministic.
        if (name.length > 40) {
            const suffix = 'Page';
            const base = name.replace(/Page$/, '');
            name = `${base.slice(0, 40 - suffix.length)}${suffix}`;
        }

        return name;
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
        pattern = pattern.trim();
        urlPath = urlPath.trim();

        // Handle wildcard patterns
        if (pattern.startsWith('*') && pattern.endsWith('*')) {
            const inner = pattern.slice(1, -1);
            return urlPath.includes(inner);
        }

        if (pattern.startsWith('*/')) {
            const suffix = pattern.slice(1);
            return urlPath === suffix || urlPath.endsWith(suffix);
        }

        if (pattern.endsWith('*')) {
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
    getOrCreatePage(url: string, title?: string): PageObject {
        // First, try to find an existing page by URL pattern
        const existingPage = this.findPageByUrl(url);
        if (existingPage) {
            return existingPage;
        }

        // Next, check if page exists by suggested name
        const titleBasedName = title ? this.suggestPageNameFromTitle(title) : '';
        const suggestedName = titleBasedName || this.suggestPageName(url);
        if (this.pages.has(suggestedName)) {
            return this.pages.get(suggestedName)!;
        }

        // Create new page object with the URL pattern
        const urlPath = this.extractUrlPath(url);
        const filePath = join(this.projectPath, 'Pages', `${suggestedName}.vero`);
        const newPage: PageObject = {
            name: suggestedName,
            filePath,
            urlPatterns: [urlPath],
            fields: new Map(),
            actions: [],
            rawContent: ''
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

        const { type, rawValue } = parseSelectorValue(selector);

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
        const lines: string[] = [
            `# ${page.name}`,
            ''
        ];

        if (page.urlPatterns.length > 0) {
            const patternsStr = page.urlPatterns.map(p => `"${p}"`).join(', ');
            lines.push(`PAGE ${page.name} (${patternsStr}) {`);
        } else {
            lines.push(`PAGE ${page.name} {`);
        }

        for (const [, field] of page.fields) {
            lines.push(`    FIELD ${field.name} = ${field.selector}`);
        }

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

        const pagesDir = join(this.projectPath, 'Pages');
        if (!existsSync(pagesDir)) {
            await mkdir(pagesDir, { recursive: true });
        }

        await writeFile(page.filePath, page.rawContent, 'utf-8');

        logger.debug(`[PageObjectRegistry] Persisted ${pageName} to ${page.filePath}`);

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
