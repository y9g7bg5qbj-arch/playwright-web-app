/**
 * Codegen Recorder Parsing Tests
 *
 * Tests for chain parsing, new action types, new assertion types, and
 * unified locator+action / expect parsing in CodegenRecorderService.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock modules that require MongoDB / external deps before importing the service
vi.mock('../services/recordingPersistence.service', () => ({
    recordingPersistenceService: {
        createSession: vi.fn(),
        addStep: vi.fn(),
        completeSession: vi.fn(),
        failSession: vi.fn(),
        getSessionWithSteps: vi.fn(),
        generateVeroFromSteps: vi.fn(),
    },
    CreateStepDTO: {},
}));

vi.mock('../services/selectorHealing', () => ({}));

import { CodegenRecorderService } from '../services/codegenRecorder.service';
import { generateVeroAction, generateVeroAssertion } from '../services/veroSyntaxReference';

// Access private methods via bracket notation for testing
let service: any;

beforeEach(() => {
    service = new CodegenRecorderService('/tmp/test-project');
});

// ──────────────────────────────────────────────
// splitMethodChain
// ──────────────────────────────────────────────

describe('splitMethodChain', () => {
    it('splits simple chain', () => {
        const result = service.splitMethodChain("getByRole('button').click()");
        expect(result).toEqual(["getByRole('button')", "click()"]);
    });

    it('preserves balanced parens', () => {
        const result = service.splitMethodChain("getByRole('row').filter({has: page.getByText('X')}).click()");
        expect(result).toEqual([
            "getByRole('row')",
            "filter({has: page.getByText('X')})",
            "click()"
        ]);
    });

    it('handles deeply nested parens', () => {
        const result = service.splitMethodChain("getByRole('button', { name: 'Submit' }).first()");
        expect(result).toEqual([
            "getByRole('button', { name: 'Submit' })",
            "first()"
        ]);
    });

    it('handles single segment', () => {
        const result = service.splitMethodChain("getByRole('button')");
        expect(result).toEqual(["getByRole('button')"]);
    });
});

// ──────────────────────────────────────────────
// chainToModifier
// ──────────────────────────────────────────────

describe('chainToModifier', () => {
    it('returns FIRST modifier', () => {
        expect(service.chainToModifier('first()')).toEqual({ modifier: 'FIRST' });
    });

    it('returns LAST modifier', () => {
        expect(service.chainToModifier('last()')).toEqual({ modifier: 'LAST' });
    });

    it('returns NTH modifier', () => {
        expect(service.chainToModifier('nth(2)')).toEqual({ modifier: 'NTH 2' });
    });

    it('returns WITH TEXT for getByText', () => {
        expect(service.chainToModifier("getByText('Personal')")).toEqual({ modifier: 'WITH TEXT "Personal"' });
    });

    it('returns WITH TEXT for filter hasText', () => {
        expect(service.chainToModifier("filter({ hasText: 'John' })")).toEqual({ modifier: 'WITH TEXT "John"' });
    });

    it('returns WITHOUT TEXT for filter hasNotText', () => {
        expect(service.chainToModifier("filter({ hasNotText: 'Draft' })")).toEqual({ modifier: 'WITHOUT TEXT "Draft"' });
    });

    it('returns HAS for filter with has locator', () => {
        const result = service.chainToModifier("filter({ has: page.getByText('Active') })");
        expect(result).toEqual({ modifier: 'HAS text "Active"' });
    });

    it('returns HAS NOT for filter with hasNot locator', () => {
        const result = service.chainToModifier("filter({ hasNot: page.getByRole('button') })");
        expect(result).toEqual({ modifier: 'HAS NOT role "button"' });
    });

    it('returns new base for getByRole', () => {
        const result = service.chainToModifier("getByRole('option', { name: 'Blue' })");
        expect(result).toEqual({ base: 'role "option" name "Blue"' });
    });

    it('returns new base for getByLabel', () => {
        const result = service.chainToModifier("getByLabel('Email')");
        expect(result).toEqual({ base: 'label "Email"' });
    });
});

// ──────────────────────────────────────────────
// parseChainedSelector
// ──────────────────────────────────────────────

describe('parseChainedSelector', () => {
    it('parses simple selector', () => {
        expect(service.parseChainedSelector("getByRole('button', { name: 'Submit' })"))
            .toBe('role "button" name "Submit"');
    });

    it('parses chain with first()', () => {
        expect(service.parseChainedSelector("getByRole('button').first()"))
            .toBe('role "button" FIRST');
    });

    it('parses chain with last()', () => {
        expect(service.parseChainedSelector("getByRole('button').last()"))
            .toBe('role "button" LAST');
    });

    it('parses chain with nth()', () => {
        expect(service.parseChainedSelector("getByRole('tab').nth(2)"))
            .toBe('role "tab" NTH 2');
    });

    it('parses chain with getByText modifier', () => {
        expect(service.parseChainedSelector("getByLabel('New Account').getByText('Personal Lines Prospect')"))
            .toBe('label "New Account" WITH TEXT "Personal Lines Prospect"');
    });

    it('parses chain with filter hasText', () => {
        expect(service.parseChainedSelector("getByRole('row').filter({hasText: 'John'})"))
            .toBe('role "row" WITH TEXT "John"');
    });

    it('parses chain where second getBy replaces base', () => {
        expect(service.parseChainedSelector("getByRole('listbox').getByRole('option', {name: 'Blue'})"))
            .toBe('role "option" name "Blue"');
    });

    it('parses chain with multiple modifiers', () => {
        expect(service.parseChainedSelector("getByRole('row').filter({hasText: 'John'}).first()"))
            .toBe('role "row" WITH TEXT "John" FIRST');
    });

    it('parses locator(css)', () => {
        expect(service.parseChainedSelector("locator('.my-class')"))
            .toBe('css ".my-class"');
    });
});

// ──────────────────────────────────────────────
// parseLocatorAndAction (via parsePlaywrightCode)
// ──────────────────────────────────────────────

describe('parseLocatorAndAction', () => {
    it('parses simple click', () => {
        const result = service.parseLocatorAndAction(
            "await page.getByRole('button', { name: 'Submit' }).click();",
            'page'
        );
        expect(result).toMatchObject({
            type: 'click',
            selector: 'role "button" name "Submit"',
        });
    });

    it('parses dblclick as doubleclick', () => {
        const result = service.parseLocatorAndAction(
            "await page.getByRole('cell').dblclick();",
            'page'
        );
        expect(result).toMatchObject({
            type: 'doubleclick',
            selector: 'role "cell"',
        });
    });

    it('parses right-click', () => {
        const result = service.parseLocatorAndAction(
            "await page.getByRole('row').click({ button: 'right' });",
            'page'
        );
        expect(result).toMatchObject({
            type: 'rightclick',
            selector: 'role "row"',
        });
    });

    it('parses fill', () => {
        const result = service.parseLocatorAndAction(
            "await page.getByLabel('Email').fill('user@test.com');",
            'page'
        );
        expect(result).toMatchObject({
            type: 'fill',
            selector: 'label "Email"',
            value: 'user@test.com',
        });
    });

    it('parses check', () => {
        const result = service.parseLocatorAndAction(
            "await page.getByRole('checkbox').check();",
            'page'
        );
        expect(result).toMatchObject({
            type: 'check',
            selector: 'role "checkbox"',
        });
    });

    it('parses uncheck', () => {
        const result = service.parseLocatorAndAction(
            "await page.getByRole('checkbox').uncheck();",
            'page'
        );
        expect(result).toMatchObject({
            type: 'uncheck',
            selector: 'role "checkbox"',
        });
    });

    it('parses hover', () => {
        const result = service.parseLocatorAndAction(
            "await page.getByRole('menuitem', { name: 'File' }).hover();",
            'page'
        );
        expect(result).toMatchObject({
            type: 'hover',
            selector: 'role "menuitem" name "File"',
        });
    });

    it('parses clear', () => {
        const result = service.parseLocatorAndAction(
            "await page.getByLabel('Search').clear();",
            'page'
        );
        expect(result).toMatchObject({
            type: 'clear',
            selector: 'label "Search"',
        });
    });

    it('parses setInputFiles as upload', () => {
        const result = service.parseLocatorAndAction(
            "await page.getByLabel('Upload').setInputFiles('file.pdf');",
            'page'
        );
        expect(result).toMatchObject({
            type: 'upload',
            selector: 'label "Upload"',
            value: 'file.pdf',
        });
    });

    it('parses selectOption', () => {
        const result = service.parseLocatorAndAction(
            "await page.getByRole('combobox').selectOption('option1');",
            'page'
        );
        expect(result).toMatchObject({
            type: 'select',
            selector: 'role "combobox"',
            value: 'option1',
        });
    });

    it('parses press', () => {
        const result = service.parseLocatorAndAction(
            "await page.getByRole('textbox').press('Enter');",
            'page'
        );
        expect(result).toMatchObject({
            type: 'press',
            selector: 'role "textbox"',
            value: 'Enter',
        });
    });

    it('parses chained locator click', () => {
        const result = service.parseLocatorAndAction(
            "await page.getByRole('button').first().click();",
            'page'
        );
        expect(result).toMatchObject({
            type: 'click',
            selector: 'role "button" FIRST',
        });
    });

    it('parses chained filter click', () => {
        const result = service.parseLocatorAndAction(
            "await page.getByRole('row').filter({hasText: 'John'}).click();",
            'page'
        );
        expect(result).toMatchObject({
            type: 'click',
            selector: 'role "row" WITH TEXT "John"',
        });
    });

    it('parses nth chain click', () => {
        const result = service.parseLocatorAndAction(
            "await page.getByRole('tab').nth(2).click();",
            'page'
        );
        expect(result).toMatchObject({
            type: 'click',
            selector: 'role "tab" NTH 2',
        });
    });

    it('returns null for non-matching lines', () => {
        expect(service.parseLocatorAndAction("const x = 1;", 'page')).toBeNull();
    });
});

// ──────────────────────────────────────────────
// parseExpect
// ──────────────────────────────────────────────

describe('parseExpect', () => {
    it('parses toBeVisible', () => {
        const result = service.parseExpect(
            "await expect(page.getByRole('heading')).toBeVisible();",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            selector: 'role "heading"',
            assertionType: 'visible',
        });
    });

    it('parses toBeHidden', () => {
        const result = service.parseExpect(
            "await expect(page.getByRole('dialog')).toBeHidden();",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            selector: 'role "dialog"',
            assertionType: 'hidden',
        });
    });

    it('parses toHaveText', () => {
        const result = service.parseExpect(
            "await expect(page.getByRole('heading')).toHaveText('Welcome');",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            selector: 'role "heading"',
            assertionType: 'hasText',
            value: 'Welcome',
        });
    });

    it('parses toContainText', () => {
        const result = service.parseExpect(
            "await expect(page.getByRole('paragraph')).toContainText('hello');",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            selector: 'role "paragraph"',
            assertionType: 'containsText',
            value: 'hello',
        });
    });

    it('parses toHaveValue', () => {
        const result = service.parseExpect(
            "await expect(page.getByRole('textbox')).toHaveValue('test');",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            selector: 'role "textbox"',
            assertionType: 'hasValue',
            value: 'test',
        });
    });

    it('parses toBeChecked', () => {
        const result = service.parseExpect(
            "await expect(page.getByRole('checkbox')).toBeChecked();",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            selector: 'role "checkbox"',
            assertionType: 'checked',
        });
    });

    it('parses toBeEnabled', () => {
        const result = service.parseExpect(
            "await expect(page.getByRole('button')).toBeEnabled();",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            selector: 'role "button"',
            assertionType: 'enabled',
        });
    });

    it('parses toBeDisabled', () => {
        const result = service.parseExpect(
            "await expect(page.getByRole('button')).toBeDisabled();",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            selector: 'role "button"',
            assertionType: 'disabled',
        });
    });

    it('parses toBeEmpty', () => {
        const result = service.parseExpect(
            "await expect(page.getByRole('textbox')).toBeEmpty();",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            selector: 'role "textbox"',
            assertionType: 'empty',
        });
    });

    it('parses toBeFocused', () => {
        const result = service.parseExpect(
            "await expect(page.getByRole('textbox')).toBeFocused();",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            selector: 'role "textbox"',
            assertionType: 'focused',
        });
    });

    it('parses toHaveCount', () => {
        const result = service.parseExpect(
            "await expect(page.getByRole('row')).toHaveCount(5);",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            selector: 'role "row"',
            assertionType: 'hasCount',
            value: '5',
        });
    });

    it('parses toHaveAttribute', () => {
        const result = service.parseExpect(
            "await expect(page.getByRole('link')).toHaveAttribute('href', '/home');",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            selector: 'role "link"',
            assertionType: 'hasAttribute',
            value: 'href=/home',
        });
    });

    it('parses toHaveClass', () => {
        const result = service.parseExpect(
            "await expect(page.getByRole('button')).toHaveClass('active');",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            selector: 'role "button"',
            assertionType: 'hasClass',
            value: 'active',
        });
    });

    it('parses page-level toHaveURL', () => {
        const result = service.parseExpect(
            "await expect(page).toHaveURL('http://example.com');",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            assertionType: 'url',
            value: 'http://example.com',
        });
    });

    it('parses page-level toHaveTitle', () => {
        const result = service.parseExpect(
            "await expect(page).toHaveTitle('My Page');",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            assertionType: 'title',
            value: 'My Page',
        });
    });

    it('parses chained selector in expect', () => {
        const result = service.parseExpect(
            "await expect(page.getByRole('row').filter({hasText: 'John'})).toBeVisible();",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            selector: 'role "row" WITH TEXT "John"',
            assertionType: 'visible',
        });
    });

    it('returns null for non-matching lines', () => {
        expect(service.parseExpect("const x = 1;", 'page')).toBeNull();
    });
});

// ──────────────────────────────────────────────
// parsePlaywrightCode (integration - full code blocks)
// ──────────────────────────────────────────────

describe('parsePlaywrightCode integration', () => {
    it('parses a full codegen output with mixed actions', () => {
        const code = `
const { test, expect } = require('@playwright/test');

test('test', async ({ page }) => {
  await page.goto('https://example.com');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByLabel('Email').fill('user@test.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByRole('heading')).toBeVisible();
});
`;
        const actions = service.parsePlaywrightCode(code);
        expect(actions).toHaveLength(6);
        expect(actions[0]).toMatchObject({ type: 'goto', value: 'https://example.com' });
        expect(actions[1]).toMatchObject({ type: 'click', selector: 'role "link" name "Login"' });
        expect(actions[2]).toMatchObject({ type: 'fill', selector: 'label "Email"', value: 'user@test.com' });
        expect(actions[3]).toMatchObject({ type: 'fill', selector: 'label "Password"', value: 'password' });
        expect(actions[4]).toMatchObject({ type: 'click', selector: 'role "button" name "Submit"' });
        expect(actions[5]).toMatchObject({ type: 'expect', selector: 'role "heading"', assertionType: 'visible' });
    });

    it('parses reload as refresh', () => {
        const code = `
test('test', async ({ page }) => {
  await page.goto('https://example.com');
  await page.reload();
});
`;
        const actions = service.parsePlaywrightCode(code);
        expect(actions).toHaveLength(2);
        expect(actions[1]).toMatchObject({ type: 'refresh' });
    });

    it('parses popup/tab detection', () => {
        const code = `
test('test', async ({ page }) => {
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Open' }).click();
  const page1 = await page1Promise;
  await page1.getByRole('button', { name: 'Close' }).click();
});
`;
        const actions = service.parsePlaywrightCode(code);
        expect(actions.some((a: any) => a.type === 'switchTab')).toBe(true);
        // After tab switch, actions should use page1 context
        const closeAction = actions.find((a: any) => a.selector?.includes('role "button" name "Close"'));
        expect(closeAction).toBeTruthy();
    });

    it('parses chained locators in full code', () => {
        const code = `
test('test', async ({ page }) => {
  await page.getByRole('button').first().click();
  await page.getByRole('tab').nth(2).click();
  await page.getByRole('row').filter({hasText: 'John'}).click();
});
`;
        const actions = service.parsePlaywrightCode(code);
        expect(actions).toHaveLength(3);
        expect(actions[0]).toMatchObject({ type: 'click', selector: 'role "button" FIRST' });
        expect(actions[1]).toMatchObject({ type: 'click', selector: 'role "tab" NTH 2' });
        expect(actions[2]).toMatchObject({ type: 'click', selector: 'role "row" WITH TEXT "John"' });
    });

    it('parses page-level assertions in full code', () => {
        const code = `
test('test', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveURL('https://example.com');
  await expect(page).toHaveTitle('Example');
});
`;
        const actions = service.parsePlaywrightCode(code);
        expect(actions).toHaveLength(3);
        expect(actions[1]).toMatchObject({ type: 'expect', assertionType: 'url', value: 'https://example.com' });
        expect(actions[2]).toMatchObject({ type: 'expect', assertionType: 'title', value: 'Example' });
    });

    it('parses keyboard press without locator', () => {
        const code = `
test('test', async ({ page }) => {
  await page.keyboard.press('Escape');
});
`;
        const actions = service.parsePlaywrightCode(code);
        expect(actions).toHaveLength(1);
        expect(actions[0]).toMatchObject({ type: 'press', value: 'Escape' });
    });

    it('parses dblclick and setInputFiles', () => {
        const code = `
test('test', async ({ page }) => {
  await page.getByRole('cell').dblclick();
  await page.getByLabel('File').setInputFiles('doc.pdf');
});
`;
        const actions = service.parsePlaywrightCode(code);
        expect(actions).toHaveLength(2);
        expect(actions[0]).toMatchObject({ type: 'doubleclick', selector: 'role "cell"' });
        expect(actions[1]).toMatchObject({ type: 'upload', selector: 'label "File"', value: 'doc.pdf' });
    });

    it('parses commented-out assertions from Playwright codegen', () => {
        const code = `
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://example.com');
  // await expect(page.getByRole('heading', { name: 'Connecting to Okta Dashboard' })).toBeVisible();
  await page.getByRole('textbox', { name: 'myID or Username' }).click();
  await page.getByRole('textbox', { name: 'myID or Username' }).fill('capp554_td');
  // await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  // await expect(page.locator('#form36')).toContainText('myID or Username');
  await context.close();
  await browser.close();
})();
`;
        const actions = service.parsePlaywrightCode(code);
        // Should have: goto, expect(heading visible), click, fill, expect(heading visible), expect(containsText)
        expect(actions).toHaveLength(6);
        expect(actions[0]).toMatchObject({ type: 'goto' });
        expect(actions[1]).toMatchObject({ type: 'expect', selector: expect.stringContaining('role "heading"'), assertionType: 'visible' });
        expect(actions[2]).toMatchObject({ type: 'click' });
        expect(actions[3]).toMatchObject({ type: 'fill' });
        expect(actions[4]).toMatchObject({ type: 'expect', selector: expect.stringContaining('role "heading"'), assertionType: 'visible' });
        expect(actions[5]).toMatchObject({ type: 'expect', selector: 'css "#form36"', assertionType: 'containsText', value: 'myID or Username' });
    });

    it('skips multi-line toMatchAriaSnapshot assertions', () => {
        const code = `
test('test', async ({ page }) => {
  await page.goto('https://example.com');
  // await expect(page.locator('#okta-sign-in')).toMatchAriaSnapshot(\`
  //   - heading "Sign In" [level=2]
  //   - alert
  //   \`);
  await page.getByRole('button', { name: 'Next' }).click();
});
`;
        const actions = service.parsePlaywrightCode(code);
        // Should have: goto, click (skipping the multi-line aria snapshot)
        expect(actions).toHaveLength(2);
        expect(actions[0]).toMatchObject({ type: 'goto' });
        expect(actions[1]).toMatchObject({ type: 'click' });
    });
});

// ──────────────────────────────────────────────
// extractSelector (testid casing fix)
// ──────────────────────────────────────────────

describe('extractSelector', () => {
    it('uses lowercase testid', () => {
        const result = service.extractSelector('getByTestId', "'login-btn'");
        expect(result).toBe('testid "login-btn"');
    });

    it('extracts role with name', () => {
        const result = service.extractSelector('getByRole', "'button', { name: 'Submit' }");
        expect(result).toBe('role "button" name "Submit"');
    });

    it('extracts label', () => {
        const result = service.extractSelector('getByLabel', "'Email'");
        expect(result).toBe('label "Email"');
    });

    it('extracts placeholder', () => {
        const result = service.extractSelector('getByPlaceholder', "'Enter email'");
        expect(result).toBe('placeholder "Enter email"');
    });

    it('extracts text', () => {
        const result = service.extractSelector('getByText', "'Click me'");
        expect(result).toBe('text "Click me"');
    });

    it('extracts alt text', () => {
        const result = service.extractSelector('getByAltText', "'Logo'");
        expect(result).toBe('alt "Logo"');
    });

    it('extracts title', () => {
        const result = service.extractSelector('getByTitle', "'Tooltip'");
        expect(result).toBe('title "Tooltip"');
    });

    it('extracts css from locator', () => {
        const result = service.extractSelector('locator', "'#my-id'");
        expect(result).toBe('css "#my-id"');
    });
});

// ──────────────────────────────────────────────
// generateVeroAction / generateVeroAssertion (via veroSyntaxReference)
// ──────────────────────────────────────────────

describe('Vero generation for new types', () => {

    it('generates DOUBLE CLICK', () => {
        expect(generateVeroAction('doubleclick', 'Page.field')).toBe('DOUBLE CLICK Page.field');
    });

    it('generates RIGHT CLICK', () => {
        expect(generateVeroAction('rightclick', 'Page.field')).toBe('RIGHT CLICK Page.field');
    });

    it('generates UPLOAD', () => {
        expect(generateVeroAction('upload', 'Page.field', 'file.pdf')).toBe('UPLOAD "file.pdf" TO Page.field');
    });

    it('generates REFRESH', () => {
        expect(generateVeroAction('refresh')).toBe('REFRESH');
    });

    it('generates VERIFY IS CHECKED', () => {
        expect(generateVeroAssertion('Page.field', 'checked')).toBe('VERIFY Page.field IS CHECKED');
    });

    it('generates VERIFY IS EMPTY', () => {
        expect(generateVeroAssertion('Page.field', 'empty')).toBe('VERIFY Page.field IS EMPTY');
    });

    it('generates VERIFY IS FOCUSED', () => {
        expect(generateVeroAssertion('Page.field', 'focused')).toBe('VERIFY Page.field IS FOCUSED');
    });

    it('generates VERIFY HAS TEXT', () => {
        expect(generateVeroAssertion('Page.field', 'hasText', 'Welcome')).toBe('VERIFY Page.field HAS TEXT "Welcome"');
    });

    it('generates VERIFY CONTAINS TEXT', () => {
        expect(generateVeroAssertion('Page.field', 'containsText', 'hello')).toBe('VERIFY Page.field CONTAINS TEXT "hello"');
    });

    it('generates VERIFY HAS COUNT', () => {
        expect(generateVeroAssertion('Page.field', 'hasCount', '5')).toBe('VERIFY Page.field HAS COUNT 5');
    });

    it('generates VERIFY HAS ATTRIBUTE', () => {
        expect(generateVeroAssertion('Page.field', 'hasAttribute', 'href=/home'))
            .toBe('VERIFY Page.field HAS ATTRIBUTE "href" EQUAL "/home"');
    });

    it('generates VERIFY HAS CLASS', () => {
        expect(generateVeroAssertion('Page.field', 'hasClass', 'active')).toBe('VERIFY Page.field HAS CLASS "active"');
    });

    it('generates VERIFY URL EQUAL', () => {
        expect(generateVeroAssertion('', 'url', 'http://example.com')).toBe('VERIFY URL EQUAL "http://example.com"');
    });

    it('generates VERIFY TITLE EQUAL', () => {
        expect(generateVeroAssertion('', 'title', 'My Page')).toBe('VERIFY TITLE EQUAL "My Page"');
    });

    it('generates DRAG', () => {
        expect(generateVeroAction('drag', 'Page.source', 'Page.dest')).toBe('DRAG Page.source TO Page.dest');
    });

    it('generates ACCEPT DIALOG', () => {
        expect(generateVeroAction('acceptdialog')).toBe('ACCEPT DIALOG');
    });

    it('generates ACCEPT DIALOG with text', () => {
        expect(generateVeroAction('acceptdialog', undefined, 'yes')).toBe('ACCEPT DIALOG WITH "yes"');
    });

    it('generates DISMISS DIALOG', () => {
        expect(generateVeroAction('dismissdialog')).toBe('DISMISS DIALOG');
    });

    it('generates SWITCH TO FRAME', () => {
        expect(generateVeroAction('switchframe', 'Page.iframe')).toBe('SWITCH TO FRAME Page.iframe');
    });

    it('generates SWITCH TO MAIN FRAME', () => {
        expect(generateVeroAction('switchmainframe')).toBe('SWITCH TO MAIN FRAME');
    });

    // Negative assertions
    it('generates VERIFY IS NOT VISIBLE', () => {
        expect(generateVeroAssertion('Page.field', 'visible', undefined, true)).toBe('VERIFY Page.field IS NOT VISIBLE');
    });

    it('generates VERIFY IS NOT CHECKED', () => {
        expect(generateVeroAssertion('Page.field', 'checked', undefined, true)).toBe('VERIFY Page.field IS NOT CHECKED');
    });

    it('generates VERIFY NOT CONTAINS TEXT', () => {
        expect(generateVeroAssertion('Page.field', 'containsText', 'hello', true)).toBe('VERIFY Page.field NOT CONTAINS TEXT "hello"');
    });

    it('generates VERIFY NOT HAS TEXT', () => {
        expect(generateVeroAssertion('Page.field', 'hasText', 'Welcome', true)).toBe('VERIFY Page.field NOT HAS TEXT "Welcome"');
    });

    it('generates VERIFY URL NOT EQUAL', () => {
        expect(generateVeroAssertion('', 'url', 'http://example.com', true)).toBe('VERIFY URL NOT EQUAL "http://example.com"');
    });
});

// ──────────────────────────────────────────────
// Negative assertions (.not) parsing
// ──────────────────────────────────────────────

describe('parseExpect with .not', () => {
    it('parses .not.toBeVisible()', () => {
        const result = service.parseExpect(
            "await expect(page.getByRole('button')).not.toBeVisible();",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            selector: 'role "button"',
            assertionType: 'visible',
            isNegative: true,
        });
    });

    it('parses .not.toContainText()', () => {
        const result = service.parseExpect(
            "await expect(page.getByRole('heading')).not.toContainText('Error');",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            selector: 'role "heading"',
            assertionType: 'containsText',
            value: 'Error',
            isNegative: true,
        });
    });

    it('parses .not.toBeChecked()', () => {
        const result = service.parseExpect(
            "await expect(page.getByRole('checkbox')).not.toBeChecked();",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            selector: 'role "checkbox"',
            assertionType: 'checked',
            isNegative: true,
        });
    });

    it('parses page-level .not.toHaveURL()', () => {
        const result = service.parseExpect(
            "await expect(page).not.toHaveURL('http://example.com/login');",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            assertionType: 'url',
            value: 'http://example.com/login',
            isNegative: true,
        });
    });

    it('does not set isNegative for normal assertions', () => {
        const result = service.parseExpect(
            "await expect(page.getByRole('button')).toBeVisible();",
            'page'
        );
        expect(result).toMatchObject({
            type: 'expect',
            selector: 'role "button"',
            assertionType: 'visible',
        });
        expect(result!.isNegative).toBeUndefined();
    });

    it('parses .not assertions in full parsePlaywrightCode', () => {
        const code = `
test('test', async ({ page }) => {
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit' })).not.toBeDisabled();
});
`;
        const actions = service.parsePlaywrightCode(code);
        expect(actions).toHaveLength(2);
        expect(actions[0]).toMatchObject({ type: 'expect', assertionType: 'visible', isNegative: true });
        expect(actions[1]).toMatchObject({ type: 'expect', assertionType: 'disabled', isNegative: true });
    });
});

// ──────────────────────────────────────────────
// dragTo parsing
// ──────────────────────────────────────────────

describe('dragTo parsing', () => {
    it('parses dragTo with destination locator', () => {
        const result = service.parseLocatorAndAction(
            "await page.getByRole('listitem', { name: 'Item 1' }).dragTo(page.getByRole('listitem', { name: 'Item 3' }));",
            'page'
        );
        expect(result).toMatchObject({
            type: 'drag',
            selector: 'role "listitem" name "Item 1"',
            destinationSelector: 'role "listitem" name "Item 3"',
        });
    });

    it('parses dragTo in full code block', () => {
        const code = `
test('test', async ({ page }) => {
  await page.getByTestId('source').dragTo(page.getByTestId('target'));
});
`;
        const actions = service.parsePlaywrightCode(code);
        expect(actions).toHaveLength(1);
        expect(actions[0]).toMatchObject({
            type: 'drag',
            selector: 'testid "source"',
            destinationSelector: 'testid "target"',
        });
    });

    it('parses dragTo with chained locator destination', () => {
        const result = service.parseLocatorAndAction(
            "await page.getByRole('button').first().dragTo(page.getByRole('region').last());",
            'page'
        );
        expect(result).toMatchObject({
            type: 'drag',
            selector: 'role "button" FIRST',
            destinationSelector: 'role "region" LAST',
        });
    });
});
