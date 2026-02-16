/**
 * Recording Field Preservation Tests
 *
 * Validates that existing page fields are preserved when merging new fields
 * during recording. This was a bug where existing selectors were lost because
 * they were stored as empty strings, then filtered out.
 *
 * Tests the exact regex + merge logic used in
 * RecordingPersistenceService.saveVeroFilesToSandbox().
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { generateVeroPage } from '../services/veroSyntaxReference';

let tempDir: string;

beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'vero-persist-test-'));
});

afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
});

/**
 * Helper: infer selector type from a field name.
 * Mirrors RecordingPersistenceService.inferSelectorType().
 */
function inferSelectorType(fieldName: string): string {
    const name = fieldName.toLowerCase();
    if (name.includes('button') || name.includes('btn')) return 'button';
    if (name.includes('textbox') || name.includes('input') || name.includes('field')) return 'textbox';
    if (name.includes('link')) return 'link';
    if (name.includes('checkbox') || name.includes('check')) return 'checkbox';
    if (name.includes('text') || name.includes('label')) return 'text';
    return 'text';
}

/**
 * Helper: simulates the fixed field-merging logic from saveVeroFilesToSandbox.
 * Reads existing page, parses fields WITH selectors, merges new fields, writes back.
 */
async function mergeFieldsIntoPage(
    pageFilePath: string,
    pageName: string,
    newFields: Array<{ name: string; selectorType: string; selector: string }>
): Promise<string> {
    let existingFields: Array<{ name: string; selectorType: string; selector: string }> = [];

    if (existsSync(pageFilePath)) {
        const existingContent = await readFile(pageFilePath, 'utf-8');
        // FIXED regex: captures the full selector value
        const fieldMatches = existingContent.matchAll(/FIELD\s+(\w+)\s*=\s*(.+?)(?=\n|$)/g);
        for (const match of fieldMatches) {
            existingFields.push({
                name: match[1],
                selectorType: inferSelectorType(match[1]),
                selector: match[2].trim()
            });
        }
    }

    const existingFieldNames = new Set(existingFields.map(f => f.name));
    const onlyNewFields = newFields.filter(f => !existingFieldNames.has(f.name));

    // FIXED: use existingFields (with selectors) + only genuinely new fields
    const allFields = [...existingFields, ...onlyNewFields];
    const pageContent = generateVeroPage(pageName, allFields);
    await writeFile(pageFilePath, pageContent, 'utf-8');
    return pageContent;
}

/**
 * Helper: simulates the OLD buggy logic for comparison.
 */
async function mergeFieldsIntoPage_BUGGY(
    pageFilePath: string,
    pageName: string,
    newFields: Array<{ name: string; selectorType: string; selector: string }>
): Promise<string> {
    let existingFields: Array<{ name: string; selectorType: string; selector: string }> = [];

    if (existsSync(pageFilePath)) {
        const existingContent = await readFile(pageFilePath, 'utf-8');
        // OLD buggy regex: does NOT capture the selector
        const fieldMatches = existingContent.matchAll(/FIELD\s+(\w+)\s*=/g);
        for (const match of fieldMatches) {
            existingFields.push({ name: match[1], selectorType: 'text', selector: '' });
        }
    }

    const existingFieldNames = new Set(existingFields.map(f => f.name));
    const onlyNewFields = newFields.filter(f => !existingFieldNames.has(f.name));

    // OLD: existingFields.filter(f => f.selector) filters out ALL existing because selector = ''
    const allFields = [...existingFields.filter(f => f.selector), ...newFields];
    const pageContent = generateVeroPage(pageName, allFields);
    await writeFile(pageFilePath, pageContent, 'utf-8');
    return pageContent;
}

// ──────────────────────────────────────────────
// Field Regex Parsing
// ──────────────────────────────────────────────

describe('Field regex captures full selector value', () => {
    it('parses FIELD name = selectorType "value" correctly', () => {
        const content = `PAGE HomePage ("/") {
    FIELD loginButton = button "Log In"
    FIELD usernameInput = textbox "Username"
    FIELD forgotLink = link "Forgot password?"
}`;

        const fields: Array<{ name: string; selector: string }> = [];
        const fieldMatches = content.matchAll(/FIELD\s+(\w+)\s*=\s*(.+?)(?=\n|$)/g);
        for (const match of fieldMatches) {
            fields.push({ name: match[1], selector: match[2].trim() });
        }

        expect(fields).toHaveLength(3);
        expect(fields[0]).toEqual({ name: 'loginButton', selector: 'button "Log In"' });
        expect(fields[1]).toEqual({ name: 'usernameInput', selector: 'textbox "Username"' });
        expect(fields[2]).toEqual({ name: 'forgotLink', selector: 'link "Forgot password?"' });
    });

    it('handles selectors with special characters', () => {
        const content = `PAGE SearchPage {
    FIELD searchBox = textbox "Search..."
    FIELD goButton = button "Go!"
}`;

        const fields: Array<{ name: string; selector: string }> = [];
        const fieldMatches = content.matchAll(/FIELD\s+(\w+)\s*=\s*(.+?)(?=\n|$)/g);
        for (const match of fieldMatches) {
            fields.push({ name: match[1], selector: match[2].trim() });
        }

        expect(fields).toHaveLength(2);
        expect(fields[0].selector).toBe('textbox "Search..."');
        expect(fields[1].selector).toBe('button "Go!"');
    });
});

// ──────────────────────────────────────────────
// Field Preservation (the actual bug fix)
// ──────────────────────────────────────────────

describe('Field preservation when merging new fields', () => {
    it('preserves all existing fields and adds new ones', async () => {
        const pagesDir = join(tempDir, 'Pages');
        await mkdir(pagesDir, { recursive: true });
        const pageFilePath = join(pagesDir, 'HomePage.vero');

        // Existing page with 3 fields
        await writeFile(pageFilePath, `PAGE HomePage ("/") {
    FIELD usernameInput = textbox "Username"
    FIELD passwordInput = textbox "Password"
    FIELD loginButton = button "Log In"
}`);

        // New field to add during recording — selector is the complete Vero string
        const newFields = [
            { name: 'nextButton', selectorType: '', selector: 'role "button" name "Next"' }
        ];

        const result = await mergeFieldsIntoPage(pageFilePath, 'HomePage', newFields);

        // All 4 fields should be present
        expect(result).toContain('usernameInput');
        expect(result).toContain('textbox "Username"');
        expect(result).toContain('passwordInput');
        expect(result).toContain('textbox "Password"');
        expect(result).toContain('loginButton');
        expect(result).toContain('button "Log In"');
        expect(result).toContain('nextButton');
        expect(result).toContain('role "button" name "Next"');
    });

    it('does not duplicate fields that already exist', async () => {
        const pagesDir = join(tempDir, 'Pages');
        await mkdir(pagesDir, { recursive: true });
        const pageFilePath = join(pagesDir, 'HomePage.vero');

        await writeFile(pageFilePath, `PAGE HomePage ("/") {
    FIELD loginButton = button "Log In"
}`);

        // Try to add a field with the same name — selector is the complete Vero string
        const newFields = [
            { name: 'loginButton', selectorType: '', selector: 'role "button" name "Log In"' }
        ];

        const result = await mergeFieldsIntoPage(pageFilePath, 'HomePage', newFields);

        // Should appear exactly once
        const count = (result.match(/loginButton/g) || []).length;
        expect(count).toBe(1);
    });

    it('[BUG REPRODUCTION] old logic loses existing fields', async () => {
        const pagesDir = join(tempDir, 'Pages');
        await mkdir(pagesDir, { recursive: true });
        const pageFilePath = join(pagesDir, 'HomePage.vero');

        await writeFile(pageFilePath, `PAGE HomePage ("/") {
    FIELD usernameInput = textbox "Username"
    FIELD loginButton = button "Log In"
}`);

        const newFields = [
            { name: 'nextButton', selectorType: '', selector: 'role "button" name "Next"' }
        ];

        const result = await mergeFieldsIntoPage_BUGGY(pageFilePath, 'HomePage', newFields);

        // Bug: existing fields get lost because existingFields.filter(f => f.selector)
        // removes them (selector is '') — so only newFields remain
        // The buggy version would NOT have usernameInput or loginButton
        // (they had selector: '' and got filtered out)
        expect(result).not.toContain('textbox "Username"');
        expect(result).not.toContain('button "Log In"');
        // New field is there
        expect(result).toContain('nextButton');
    });

    it('preserves fields across multiple recording sessions', async () => {
        const pagesDir = join(tempDir, 'Pages');
        await mkdir(pagesDir, { recursive: true });
        const pageFilePath = join(pagesDir, 'HomePage.vero');

        // Session 1: page starts with 2 fields
        await writeFile(pageFilePath, `PAGE HomePage ("/") {
    FIELD usernameInput = textbox "Username"
    FIELD loginButton = button "Log In"
}`);

        // Session 1 adds a field — selector is the complete Vero string
        await mergeFieldsIntoPage(pageFilePath, 'HomePage', [
            { name: 'nextButton', selectorType: '', selector: 'role "button" name "Next"' }
        ]);

        // Session 2 adds another field
        await mergeFieldsIntoPage(pageFilePath, 'HomePage', [
            { name: 'backButton', selectorType: '', selector: 'role "button" name "Back"' }
        ]);

        // Read final state from disk
        const finalContent = await readFile(pageFilePath, 'utf-8');

        // All 4 fields should be present
        expect(finalContent).toContain('usernameInput');
        expect(finalContent).toContain('loginButton');
        expect(finalContent).toContain('nextButton');
        expect(finalContent).toContain('backButton');
    });

    it('creates page file from scratch when no existing file', async () => {
        const pagesDir = join(tempDir, 'Pages');
        await mkdir(pagesDir, { recursive: true });
        const pageFilePath = join(pagesDir, 'NewPage.vero');

        // No existing file — selector is the complete Vero string
        const newFields = [
            { name: 'submitButton', selectorType: '', selector: 'role "button" name "Submit"' },
            { name: 'emailInput', selectorType: '', selector: 'role "textbox" name "Email"' }
        ];

        const result = await mergeFieldsIntoPage(pageFilePath, 'NewPage', newFields);

        expect(result).toContain('submitButton');
        expect(result).toContain('emailInput');
        expect(result).toContain('role "button" name "Submit"');
        expect(result).toContain('role "textbox" name "Email"');
    });
});

// ──────────────────────────────────────────────
// generateVeroPage output format
// ──────────────────────────────────────────────

describe('generateVeroPage', () => {
    it('generates correct PAGE block with fields', () => {
        // Note: toPascalCase("Login Page") → "LoginPage" but
        // toPascalCase("LoginPage") → "Loginpage" (treats it as one word)
        // So pass a two-word name to get the expected PascalCase output.
        // selector is the complete Vero selector string
        const result = generateVeroPage('Login Page', [
            { name: 'emailField', selectorType: '', selector: 'role "textbox" name "Email"' },
            { name: 'submitBtn', selectorType: '', selector: 'role "button" name "Submit"' }
        ], '/login');

        expect(result).toContain('PAGE LoginPage ("/login")');
        expect(result).toContain('FIELD emailField = role "textbox" name "Email"');
        expect(result).toContain('FIELD submitBtn = role "button" name "Submit"');
    });

    it('extracts pathname from full URL', () => {
        const result = generateVeroPage('HomePage', [], 'https://example.com/dashboard?tab=1');
        expect(result).toContain('"/dashboard"');
        expect(result).not.toContain('example.com');
    });
});
