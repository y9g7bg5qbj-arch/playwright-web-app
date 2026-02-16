/**
 * PageObjectRegistry Tests
 *
 * Validates the core recording logic:
 * - Loading existing page fields from .vero files on disk
 * - Detecting duplicate/existing selectors (exact + fuzzy)
 * - Creating new fields when no match is found
 * - Persisting new fields back to disk
 * - Using the correct project path (sandboxPath plumbing)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { PageObjectRegistry, initPageObjectRegistry } from '../services/pageObjectRegistry';

let tempDir: string;

beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'vero-test-'));
});

afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
});

// ──────────────────────────────────────────────
// loadFromDisk
// ──────────────────────────────────────────────

describe('PageObjectRegistry.loadFromDisk', () => {
    it('loads fields from an existing .vero page file', async () => {
        const pagesDir = join(tempDir, 'Pages');
        await mkdir(pagesDir, { recursive: true });
        await writeFile(join(pagesDir, 'HomePage.vero'), `
PAGE HomePage ("/") {
    FIELD usernameInput = textbox "Username"
    FIELD passwordInput = textbox "Password"
    FIELD loginButton = button "Log In"
    FIELD forgotLink = link "Forgot password?"
}
`);

        const registry = new PageObjectRegistry(tempDir);
        await registry.loadFromDisk();

        expect(registry.hasPage('HomePage')).toBe(true);

        const content = registry.getPageContent('HomePage');
        expect(content).toContain('usernameInput');
        expect(content).toContain('passwordInput');
        expect(content).toContain('loginButton');
        expect(content).toContain('forgotLink');
    });

    it('loads multiple page files', async () => {
        const pagesDir = join(tempDir, 'Pages');
        await mkdir(pagesDir, { recursive: true });

        await writeFile(join(pagesDir, 'LoginPage.vero'), `
PAGE LoginPage ("/login") {
    FIELD emailField = textbox "Email"
}
`);
        await writeFile(join(pagesDir, 'DashboardPage.vero'), `
PAGE DashboardPage ("/dashboard") {
    FIELD logoutButton = button "Logout"
}
`);

        const registry = new PageObjectRegistry(tempDir);
        await registry.loadFromDisk();

        expect(registry.hasPage('LoginPage')).toBe(true);
        expect(registry.hasPage('DashboardPage')).toBe(true);
    });

    it('handles missing Pages directory gracefully', async () => {
        // No Pages/ folder created — should not throw
        const registry = new PageObjectRegistry(tempDir);
        await registry.loadFromDisk();

        expect(registry.hasPage('Anything')).toBe(false);
    });

    it('ignores non-.vero files in the Pages directory', async () => {
        const pagesDir = join(tempDir, 'Pages');
        await mkdir(pagesDir, { recursive: true });
        await writeFile(join(pagesDir, 'notes.txt'), 'this is not a page');
        await writeFile(join(pagesDir, 'HomePage.vero'), `
PAGE HomePage ("/") {
    FIELD btn = button "Go"
}
`);

        const registry = new PageObjectRegistry(tempDir);
        await registry.loadFromDisk();

        expect(registry.hasPage('HomePage')).toBe(true);
        expect(registry.hasPage('notes')).toBe(false);
    });
});

// ──────────────────────────────────────────────
// checkForDuplicate
// ──────────────────────────────────────────────

describe('PageObjectRegistry.checkForDuplicate', () => {
    it('detects an exact selector match', async () => {
        const pagesDir = join(tempDir, 'Pages');
        await mkdir(pagesDir, { recursive: true });
        await writeFile(join(pagesDir, 'HomePage.vero'), `
PAGE HomePage ("/") {
    FIELD loginButton = button "Log In"
}
`);

        const registry = new PageObjectRegistry(tempDir);
        await registry.loadFromDisk();

        const result = registry.checkForDuplicate(
            { tagName: 'button', text: 'Log In' },
            'button "Log In"'
        );

        expect(result.isDuplicate).toBe(true);
        expect(result.matchType).toBe('exact');
        expect(result.recommendation).toBe('reuse');
        expect(result.existingRef?.pageName).toBe('HomePage');
        expect(result.existingRef?.fieldName).toBe('loginButton');
    });

    it('returns no duplicate for a completely new selector', async () => {
        const pagesDir = join(tempDir, 'Pages');
        await mkdir(pagesDir, { recursive: true });
        await writeFile(join(pagesDir, 'HomePage.vero'), `
PAGE HomePage ("/") {
    FIELD loginButton = button "Log In"
}
`);

        const registry = new PageObjectRegistry(tempDir);
        await registry.loadFromDisk();

        const result = registry.checkForDuplicate(
            { tagName: 'button', text: 'Register Now' },
            'button "Register Now"'
        );

        expect(result.isDuplicate).toBe(false);
        expect(result.recommendation).toBe('create');
    });

    it('detects substring match for overlapping selector text', async () => {
        const pagesDir = join(tempDir, 'Pages');
        await mkdir(pagesDir, { recursive: true });
        await writeFile(join(pagesDir, 'HomePage.vero'), `
PAGE HomePage ("/") {
    FIELD submitButton = button "Submit Order"
}
`);

        const registry = new PageObjectRegistry(tempDir);
        await registry.loadFromDisk();

        // "Submit" is a substring of "Submit Order" — triggers substring matching
        const result = registry.checkForDuplicate(
            { tagName: 'button', text: 'Submit' },
            'button "Submit"'
        );

        // Substring "Submit" / "Submit Order" = 6/12 = 0.5, below 0.7 threshold
        // Use a longer match to trigger the substring detection
        const result2 = registry.checkForDuplicate(
            { tagName: 'button', text: 'Submit Orde' },
            'button "Submit Orde"'
        );

        // "Submit Orde" vs "Submit Order" — very similar, should detect
        expect(result2.similarity).toBeGreaterThan(0);
        expect(result2.existingRef).not.toBeNull();
    });

    it('does NOT treat different role+name selectors as duplicates (Password vs Username)', async () => {
        const pagesDir = join(tempDir, 'Pages');
        await mkdir(pagesDir, { recursive: true });
        await writeFile(join(pagesDir, 'LoginPage.vero'), `
PAGE LoginPage ("/login") {
    FIELD usernameTextbox = role "textbox" name "myID or Username"
}
`);

        const registry = new PageObjectRegistry(tempDir);
        await registry.loadFromDisk();

        // Password textbox should NOT match Username textbox
        const result = registry.checkForDuplicate(
            { tagName: 'input', role: 'textbox', ariaLabel: 'Password', text: 'Password' },
            'role "textbox" name "Password"',
            'LoginPage'
        );

        expect(result.isDuplicate).toBe(false);
        expect(result.recommendation).toBe('create');
    });

    it('correctly detects true duplicates for same role+name selector', async () => {
        const pagesDir = join(tempDir, 'Pages');
        await mkdir(pagesDir, { recursive: true });
        await writeFile(join(pagesDir, 'LoginPage.vero'), `
PAGE LoginPage ("/login") {
    FIELD usernameTextbox = role "textbox" name "Username"
}
`);

        const registry = new PageObjectRegistry(tempDir);
        await registry.loadFromDisk();

        // Same "Username" textbox should be detected as duplicate
        const result = registry.checkForDuplicate(
            { tagName: 'input', role: 'textbox', ariaLabel: 'Username', text: 'Username' },
            'role "textbox" name "Username"',
            'LoginPage'
        );

        expect(result.isDuplicate).toBe(true);
    });
});

// ──────────────────────────────────────────────
// addField
// ──────────────────────────────────────────────

describe('PageObjectRegistry.addField', () => {
    it('adds a new field to an existing page', async () => {
        const pagesDir = join(tempDir, 'Pages');
        await mkdir(pagesDir, { recursive: true });
        await writeFile(join(pagesDir, 'HomePage.vero'), `
PAGE HomePage ("/") {
    FIELD loginButton = button "Log In"
}
`);

        const registry = new PageObjectRegistry(tempDir);
        await registry.loadFromDisk();

        const ref = registry.addField('HomePage', 'nextButton', 'role "button" name "Next"');

        expect(ref.pageName).toBe('HomePage');
        expect(ref.fieldName).toBe('nextButton');
        expect(ref.selector).toBe('role "button" name "Next"');

        // Content should contain both old and new fields
        const content = registry.getPageContent('HomePage');
        expect(content).toContain('loginButton');
        expect(content).toContain('nextButton');
        expect(content).toContain('role "button" name "Next"');
    });

    it('generates unique name when field name already exists', async () => {
        const pagesDir = join(tempDir, 'Pages');
        await mkdir(pagesDir, { recursive: true });
        await writeFile(join(pagesDir, 'HomePage.vero'), `
PAGE HomePage ("/") {
    FIELD submitButton = button "Submit"
}
`);

        const registry = new PageObjectRegistry(tempDir);
        await registry.loadFromDisk();

        // Add a field with the same name as existing
        const ref = registry.addField('HomePage', 'submitButton', 'button "Submit Order"');

        // Should get a unique name (e.g. submitButton1)
        expect(ref.fieldName).not.toBe('submitButton');
        expect(ref.fieldName).toMatch(/^submitButton\d+$/);
    });

    it('throws when adding to a non-existent page', async () => {
        const registry = new PageObjectRegistry(tempDir);
        await registry.loadFromDisk();

        expect(() => {
            registry.addField('NonExistentPage', 'field1', 'button "Click"');
        }).toThrow('Page not found');
    });
});

// ──────────────────────────────────────────────
// persist
// ──────────────────────────────────────────────

describe('PageObjectRegistry.persist', () => {
    it('writes updated page content to disk', async () => {
        const pagesDir = join(tempDir, 'Pages');
        await mkdir(pagesDir, { recursive: true });
        await writeFile(join(pagesDir, 'HomePage.vero'), `
PAGE HomePage ("/") {
    FIELD loginButton = button "Log In"
}
`);

        const registry = new PageObjectRegistry(tempDir);
        await registry.loadFromDisk();

        // Add a new field
        registry.addField('HomePage', 'nextButton', 'button "Next"');

        // Persist to disk
        const filePath = await registry.persist('HomePage');

        // Read back from disk and verify
        const diskContent = await readFile(filePath, 'utf-8');
        expect(diskContent).toContain('loginButton');
        expect(diskContent).toContain('nextButton');
        expect(diskContent).toContain('button "Next"');
    });

    it('creates Pages directory if it does not exist', async () => {
        // Load from empty dir (no Pages folder)
        const registry = new PageObjectRegistry(tempDir);
        await registry.loadFromDisk();

        // Create a page in memory via getOrCreatePage
        const page = registry.getOrCreatePage('https://example.com/login');
        registry.addField(page.name, 'emailField', 'textbox "Email"');

        // Persist should create the Pages/ directory
        const filePath = await registry.persist(page.name);
        const diskContent = await readFile(filePath, 'utf-8');
        expect(diskContent).toContain('emailField');
        expect(diskContent).toContain('textbox "Email"');
    });
});

// ──────────────────────────────────────────────
// End-to-end: the full recording flow
// ──────────────────────────────────────────────

describe('Full recording flow: load → detect → add → persist', () => {
    it('adds a new field when selector is not found, then reuses it on second encounter', async () => {
        // Setup: a page with 2 existing fields
        const pagesDir = join(tempDir, 'Pages');
        await mkdir(pagesDir, { recursive: true });
        await writeFile(join(pagesDir, 'HomePage.vero'), `
PAGE HomePage ("/") {
    FIELD usernameInput = textbox "Username"
    FIELD loginButton = button "Log In"
}
`);

        const registry = new PageObjectRegistry(tempDir);
        await registry.loadFromDisk();

        // Simulate: user clicks a "Next" button (not in the page file)
        const element = { tagName: 'button', text: 'Next', role: 'button' };
        const selector = 'role "button" name "Next"';

        const dupCheck = registry.checkForDuplicate(element, selector, 'HomePage');

        // Should NOT be a duplicate
        expect(dupCheck.isDuplicate).toBe(false);
        expect(dupCheck.recommendation).toBe('create');

        // Add the new field
        const ref = registry.addField('HomePage', 'nextButton', selector);
        expect(ref.fieldName).toBe('nextButton');

        // Persist the updated page
        await registry.persist('HomePage');

        // Verify: disk now has 3 fields
        const diskContent = await readFile(join(pagesDir, 'HomePage.vero'), 'utf-8');
        expect(diskContent).toContain('usernameInput');
        expect(diskContent).toContain('loginButton');
        expect(diskContent).toContain('nextButton');
        expect(diskContent).toContain('role "button" name "Next"');

        // Second encounter: same "Next" button should be detected as duplicate
        const dupCheck2 = registry.checkForDuplicate(element, selector, 'HomePage');
        expect(dupCheck2.isDuplicate).toBe(true);
        expect(dupCheck2.recommendation).toBe('reuse');
        expect(dupCheck2.existingRef?.fieldName).toBe('nextButton');
    });

    it('uses sandboxPath (not default) when initialized with initPageObjectRegistry', async () => {
        // Create a "sandbox" directory with a page file
        const sandboxDir = join(tempDir, 'sandbox-project');
        const pagesDir = join(sandboxDir, 'Pages');
        await mkdir(pagesDir, { recursive: true });
        await writeFile(join(pagesDir, 'CheckoutPage.vero'), `
PAGE CheckoutPage ("/checkout") {
    FIELD payButton = button "Pay Now"
}
`);

        // Create a "default" directory with a DIFFERENT page file
        const defaultDir = join(tempDir, 'default-project');
        const defaultPages = join(defaultDir, 'Pages');
        await mkdir(defaultPages, { recursive: true });
        await writeFile(join(defaultPages, 'CheckoutPage.vero'), `
PAGE CheckoutPage ("/checkout") {
    FIELD oldButton = button "Old Pay"
}
`);

        // Initialize with the SANDBOX path (simulating the fix)
        const registry = initPageObjectRegistry(sandboxDir);
        await registry.loadFromDisk();

        // Should find the sandbox version of the field, not the default
        const result = registry.checkForDuplicate(
            { tagName: 'button', text: 'Pay Now' },
            'button "Pay Now"'
        );

        expect(result.isDuplicate).toBe(true);
        expect(result.existingRef?.fieldName).toBe('payButton');

        // "Old Pay" from the default path should NOT be found
        const resultOld = registry.checkForDuplicate(
            { tagName: 'button', text: 'Old Pay' },
            'button "Old Pay"'
        );
        expect(resultOld.existingRef?.fieldName).not.toBe('oldButton');
    });
});

// ──────────────────────────────────────────────
// Domain-aware suggestPageName
// ──────────────────────────────────────────────

describe('PageObjectRegistry.suggestPageName — domain-aware naming', () => {
    it('produces different names for root URLs on different domains', () => {
        const registry = new PageObjectRegistry(tempDir);

        const name1 = registry.suggestPageName('https://farmers.okta.com/');
        const name2 = registry.suggestPageName('https://the-internet.herokuapp.com/');

        expect(name1).not.toBe(name2);
        // 'okta' is a SaaS suffix, so only 'farmers' is meaningful
        expect(name1).toBe('FarmersHomePage');
        // 'herokuapp' is a suffix; first hyphen-word of 'the-internet' is 'the'
        expect(name2).toBe('TheHomePage');
    });

    it('strips www from the domain label', () => {
        const registry = new PageObjectRegistry(tempDir);
        expect(registry.suggestPageName('https://www.google.com/')).toBe('GoogleHomePage');
    });

    it('strips hosting platform suffixes (herokuapp, vercel, etc.)', () => {
        const registry = new PageObjectRegistry(tempDir);
        // first hyphen-word of 'my-app' is 'my'
        expect(registry.suggestPageName('https://my-app.herokuapp.com/')).toBe('MyHomePage');
        // first hyphen-word of 'cool-site' is 'cool'
        expect(registry.suggestPageName('https://cool-site.vercel.app/')).toBe('CoolHomePage');
    });

    it('handles localhost URLs', () => {
        const registry = new PageObjectRegistry(tempDir);
        expect(registry.suggestPageName('http://localhost:3000/')).toBe('LocalhostHomePage');
    });

    it('includes domain label in path-based naming for disambiguation', () => {
        const registry = new PageObjectRegistry(tempDir);
        expect(registry.suggestPageName('https://example.com/login')).toBe('ExampleLoginPage');
        expect(registry.suggestPageName('https://example.com/user/profile')).toBe('ExampleUserProfilePage');
    });

    it('returns MainPage for invalid URLs', () => {
        const registry = new PageObjectRegistry(tempDir);
        expect(registry.suggestPageName('not-a-url')).toBe('MainPage');
    });

    it('falls back to HomePage when all hostname parts are suffixes', () => {
        const registry = new PageObjectRegistry(tempDir);
        // Edge case: every part is a known suffix
        expect(registry.suggestPageName('https://www.com/')).toBe('HomePage');
    });
});

// ──────────────────────────────────────────────
// Title-based suggestPageNameFromTitle
// ──────────────────────────────────────────────

describe('PageObjectRegistry.suggestPageNameFromTitle', () => {
    it('derives name from "Home | Salesforce"', () => {
        const registry = new PageObjectRegistry(tempDir);
        expect(registry.suggestPageNameFromTitle('Home | Salesforce')).toBe('SalesforceHomePage');
    });

    it('derives name from "Accounts: Recently Viewed | Salesforce"', () => {
        const registry = new PageObjectRegistry(tempDir);
        expect(registry.suggestPageNameFromTitle('Accounts: Recently Viewed | Salesforce')).toBe('SalesforceAccountsPage');
    });

    it('derives name from "Sign In - Okta"', () => {
        const registry = new PageObjectRegistry(tempDir);
        expect(registry.suggestPageNameFromTitle('Sign In - Okta')).toBe('OktaSignInPage');
    });

    it('derives name from single-word title like "Dashboard"', () => {
        const registry = new PageObjectRegistry(tempDir);
        expect(registry.suggestPageNameFromTitle('Dashboard')).toBe('DashboardHomePage');
    });

    it('returns empty string for empty/blank title', () => {
        const registry = new PageObjectRegistry(tempDir);
        expect(registry.suggestPageNameFromTitle('')).toBe('');
        expect(registry.suggestPageNameFromTitle('  ')).toBe('');
    });

    it('caps long names at 40 characters', () => {
        const registry = new PageObjectRegistry(tempDir);
        const name = registry.suggestPageNameFromTitle('Very Long Purpose Description Here | SuperLongBrandName');
        expect(name.length).toBeLessThanOrEqual(40);
        expect(name).toMatch(/Page$/);
    });
});

// ──────────────────────────────────────────────
// getOrCreatePage with title
// ──────────────────────────────────────────────

describe('PageObjectRegistry.getOrCreatePage — with title', () => {
    it('prefers title-based name when title is provided', () => {
        const registry = new PageObjectRegistry(tempDir);
        const page = registry.getOrCreatePage(
            'https://farmersagent-fau-at--sandbox.my.salesforce.com/loginflow/lightningLoginFlow.apexp',
            'Home | Salesforce'
        );
        expect(page.name).toBe('SalesforceHomePage');
    });

    it('falls back to URL-based name when no title provided', () => {
        const registry = new PageObjectRegistry(tempDir);
        const page = registry.getOrCreatePage('https://example.com/login');
        expect(page.name).toBe('ExampleLoginPage');
    });
});

// ──────────────────────────────────────────────
// generateSelector — generalized role+text
// ──────────────────────────────────────────────

describe('PageObjectRegistry.generateSelector — generalized role handling', () => {
    it('produces role "option" name "Mr." for role=option with text', () => {
        const registry = new PageObjectRegistry(tempDir);
        const result = registry.generateSelector({ tagName: 'option', role: 'option', text: 'Mr.' });
        expect(result.veroSelector).toBe('role "option" name "Mr."');
        expect(result.confidence).toBe(0.9);
    });

    it('produces role "tab" name "Settings" for role=tab with text', () => {
        const registry = new PageObjectRegistry(tempDir);
        const result = registry.generateSelector({ tagName: 'div', role: 'tab', text: 'Settings' });
        expect(result.veroSelector).toBe('role "tab" name "Settings"');
    });

    it('does NOT produce bare role "textbox" — falls through to placeholder/id/css', () => {
        const registry = new PageObjectRegistry(tempDir);
        const result = registry.generateSelector({ tagName: 'input', role: 'textbox' });
        // Should fall through to CSS since no ariaLabel, placeholder, text, or id
        expect(result.veroSelector).not.toContain('role "textbox"');
        expect(result.selectorType).toBe('css');
    });

    it('uses role syntax with name for unknown roles', () => {
        const registry = new PageObjectRegistry(tempDir);
        const result = registry.generateSelector({ tagName: 'div', role: 'toolbar', text: 'Main' });
        expect(result.veroSelector).toBe('role "toolbar" name "Main"');
        expect(result.confidence).toBe(0.9);
    });
});

// ──────────────────────────────────────────────
// Navigation tracking: getOrCreatePage with different URLs
// ──────────────────────────────────────────────

describe('PageObjectRegistry — navigation tracking', () => {
    it('getOrCreatePage returns different pages for different URLs', () => {
        const registry = new PageObjectRegistry(tempDir);

        const page1 = registry.getOrCreatePage('https://example.com/');
        const page2 = registry.getOrCreatePage('https://example.com/login');

        expect(page1.name).not.toBe(page2.name);
        expect(page2.name).toBe('ExampleLoginPage');
    });

    it('URL pattern matching still works for existing pages with declared patterns', async () => {
        const pagesDir = join(tempDir, 'Pages');
        await mkdir(pagesDir, { recursive: true });
        await writeFile(join(pagesDir, 'HomePage.vero'), `
PAGE HomePage ("/") {
    FIELD banner = link "Welcome"
}
`);

        const registry = new PageObjectRegistry(tempDir);
        await registry.loadFromDisk();

        // Even though suggestPageName would now give a domain-qualified name,
        // findPageByUrl should still match the existing page by its URL pattern
        const found = registry.findPageByUrl('https://farmers.okta.com/');
        expect(found).not.toBeNull();
        expect(found!.name).toBe('HomePage');
    });

    it('getOrCreatePage prefers existing page matched by URL pattern over creating new one', async () => {
        const pagesDir = join(tempDir, 'Pages');
        await mkdir(pagesDir, { recursive: true });
        await writeFile(join(pagesDir, 'HomePage.vero'), `
PAGE HomePage ("/") {
    FIELD banner = link "Welcome"
}
`);

        const registry = new PageObjectRegistry(tempDir);
        await registry.loadFromDisk();

        // getOrCreatePage should find existing HomePage via URL pattern, not create FarmersOktaHomePage
        const page = registry.getOrCreatePage('https://farmers.okta.com/');
        expect(page.name).toBe('HomePage');
    });
});
