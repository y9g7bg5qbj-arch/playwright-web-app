/**
 * Browser Streaming Service
 *
 * Combines Playwright's codegen (for quality selectors) with CDP screencast
 * for embedded browser recording in the Vero IDE.
 *
 * Features:
 * - CDP screencast for browser streaming to frontend
 * - Real-time action detection with optimized selectors
 * - Framework-aware conversion to Vero DSL (uses page objects)
 * - Automatic page object creation and persistence
 */

import { chromium, Browser, Page, CDPSession, BrowserContext } from 'playwright';
import { spawn, ChildProcess } from 'child_process';
import { watch, FSWatcher } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { EventEmitter } from 'events';
import {
    PageObjectRegistry,
    initPageObjectRegistry,
    ElementInfo as RegistryElementInfo,
    PageFieldRef,
    SelectorResult
} from './pageObjectRegistry';
import {
    rankLocators,
    getBestLocator,
    ElementInfo as LocatorElementInfo
} from '../locators/locatorRanker';

interface RecordingSession {
    sessionId: string;
    browser: Browser;
    context: BrowserContext;
    page: Page;
    cdp: CDPSession;
    codegenProcess: ChildProcess;
    outputFile: string;
    fileWatcher?: FSWatcher;
    lastCodeLength: number;
    url: string;
    registry: PageObjectRegistry;
    scenarioName?: string;
}

interface PageObjectEntry {
    pageName: string;
    selectorName: string;
    rawSelector: string;
    playwrightLocator: string;
}

interface ParsedAction {
    type: 'click' | 'fill' | 'check' | 'select' | 'goto' | 'press' | 'expect' | 'unknown';
    playwrightLocator: string;
    rawSelector: string;
    value?: string;
    originalLine: string;
}

// Element info captured from action events
interface ElementInfo {
    tagName: string;
    id?: string;
    className?: string;
    name?: string;
    text?: string;
    role?: string;
    ariaLabel?: string;
    testId?: string;
    placeholder?: string;
    inputType?: string;
    href?: string;
    title?: string;
    value?: string;
}

// Enhanced action data from browser
interface CapturedAction {
    type: 'click' | 'fill' | 'check' | 'select' | 'keypress';
    element: ElementInfo;
    value?: string;
    key?: string;
    timestamp: number;
}

export class BrowserStreamService extends EventEmitter {
    private sessions: Map<string, RecordingSession> = new Map();
    private pageObjects: Map<string, PageObjectEntry[]> = new Map(); // pageName -> entries
    private projectPath: string;

    constructor(projectPath: string = process.cwd()) {
        super();
        this.projectPath = projectPath;
    }

    /**
     * Start recording with embedded browser streaming
     * Uses a SINGLE browser with CDP for both streaming and action capture
     */
    async startRecording(
        url: string,
        sessionId: string,
        onFrame: (base64: string) => void,
        onAction: (veroCode: string, pagePath?: string, pageCode?: string, fieldCreated?: { pageName: string; fieldName: string }) => void,
        onError: (error: string) => void,
        scenarioName?: string
    ): Promise<void> {
        try {
            // Initialize page object registry
            const registry = initPageObjectRegistry(this.projectPath);
            await registry.loadFromDisk();

            // Load existing page objects (legacy support)
            await this.loadPageObjects();

            // Launch browser in HEADED mode - user interacts with real Chrome window
            const browser = await chromium.launch({
                headless: false,
                args: [
                    '--disable-blink-features=AutomationControlled',
                    '--start-maximized'
                ]
            });

            const context = await browser.newContext({
                viewport: null // Use full window size
            });
            const page = await context.newPage();

            // Get CDP session for action capture (not screencast)
            const cdp = await context.newCDPSession(page);

            // No screencast - user interacts with real browser
            // Just notify frontend that browser is ready
            console.log('[BrowserStream] Launched headed Chrome browser for recording');

            // Store session BEFORE navigation
            this.sessions.set(sessionId, {
                sessionId,
                browser,
                context,
                page,
                cdp,
                codegenProcess: null as any, // Not used in CDP-only mode
                outputFile: '',
                lastCodeLength: 0,
                url,
                registry,
                scenarioName
            });

            // Note: We don't track framenavigated events because:
            // 1. Click actions already capture link clicks
            // 2. The click generates the proper Vero code with selectors
            // 3. Adding open commands for navigations would be redundant

            // Inject action listeners via CDP
            await cdp.send('Runtime.enable');
            await cdp.send('DOM.enable');

            // Use addInitScript to inject on EVERY page load (including navigation)
            // This ensures the action capture script persists across page navigations
            await context.addInitScript(`
                    (function() {
                        // Role map for implicit roles
                        var roleMap = {
                            'button': 'button',
                            'a': 'link',
                            'select': 'combobox',
                            'textarea': 'textbox',
                            'img': 'img',
                            'nav': 'navigation',
                            'main': 'main',
                            'header': 'banner',
                            'footer': 'contentinfo'
                        };

                        // Get implicit ARIA role
                        function getImplicitRole(el) {
                            var tag = el.tagName.toLowerCase();
                            var type = el.type;

                            if (tag === 'input') {
                                if (type === 'checkbox') return 'checkbox';
                                if (type === 'radio') return 'radio';
                                if (type === 'submit' || type === 'button') return 'button';
                                return 'textbox';
                            }

                            return roleMap[tag];
                        }

                        // Helper to get comprehensive element info
                        function getElementInfo(el) {
                            if (!el) return null;
                            var computedRole = el.getAttribute('role') || getImplicitRole(el);

                            return {
                                tagName: el.tagName.toLowerCase(),
                                id: el.id || undefined,
                                className: typeof el.className === 'string' ? el.className : undefined,
                                name: el.getAttribute('name') || undefined,
                                text: el.textContent ? el.textContent.trim().slice(0, 50) : undefined,
                                role: computedRole || undefined,
                                ariaLabel: el.getAttribute('aria-label') || undefined,
                                testId: el.getAttribute('data-testid') || el.getAttribute('data-test-id') || undefined,
                                placeholder: el.getAttribute('placeholder') || undefined,
                                inputType: el.type || undefined,
                                href: el.href || undefined,
                                title: el.getAttribute('title') || undefined,
                                value: el.value || undefined
                            };
                        }

                        // Debounce for fill actions
                        var fillTimeout = null;
                        var lastFillElement = null;
                        var lastFillValue = '';

                        // Track clicks
                        document.addEventListener('click', function(e) {
                            var target = e.target;
                            if (!target) return;

                            var info = {
                                type: 'click',
                                element: getElementInfo(target),
                                timestamp: Date.now()
                            };

                            console.log('__VERO_ACTION__', JSON.stringify(info));
                        }, true);

                        // Track input/fill with debouncing
                        document.addEventListener('input', function(e) {
                            var target = e.target;
                            if (!target) return;

                            // Clear previous timeout
                            if (fillTimeout) {
                                clearTimeout(fillTimeout);
                            }

                            lastFillElement = target;
                            lastFillValue = target.value;

                            // Debounce to capture final value
                            fillTimeout = setTimeout(function() {
                                if (!lastFillElement) return;

                                var info = {
                                    type: 'fill',
                                    element: getElementInfo(lastFillElement),
                                    value: lastFillValue,
                                    timestamp: Date.now()
                                };

                                console.log('__VERO_ACTION__', JSON.stringify(info));
                                lastFillElement = null;
                                lastFillValue = '';
                            }, 500);
                        }, true);

                        // Track checkbox/radio changes
                        document.addEventListener('change', function(e) {
                            var target = e.target;
                            if (!target) return;

                            if (target.type === 'checkbox' || target.type === 'radio') {
                                var info = {
                                    type: 'check',
                                    element: getElementInfo(target),
                                    value: target.checked ? 'true' : 'false',
                                    timestamp: Date.now()
                                };

                                console.log('__VERO_ACTION__', JSON.stringify(info));
                            } else if (target.tagName.toLowerCase() === 'select') {
                                var info = {
                                    type: 'select',
                                    element: getElementInfo(target),
                                    value: target.options[target.selectedIndex] ? target.options[target.selectedIndex].text : target.value,
                                    timestamp: Date.now()
                                };

                                console.log('__VERO_ACTION__', JSON.stringify(info));
                            }
                        }, true);

                        // Track key presses for special keys
                        document.addEventListener('keydown', function(e) {
                            if (['Enter', 'Escape', 'Tab'].indexOf(e.key) >= 0) {
                                var target = e.target;
                                var info = {
                                    type: 'keypress',
                                    element: target ? getElementInfo(target) : null,
                                    key: e.key,
                                    timestamp: Date.now()
                                };

                                console.log('__VERO_ACTION__', JSON.stringify(info));
                            }
                        }, true);

                        console.log('[Vero] Action capture script injected');
                    })();
            `);

            // Listen for console messages to capture actions
            page.on('console', async (msg) => {
                const text = msg.text();
                if (text.startsWith('__VERO_ACTION__')) {
                    console.log('[BrowserStream] Captured action from browser:', text.substring(0, 200));
                    try {
                        const jsonStr = text.replace('__VERO_ACTION__', '').trim();
                        console.log('[BrowserStream] Parsing JSON:', jsonStr.substring(0, 200));
                        const actionData: CapturedAction = JSON.parse(jsonStr);
                        console.log('[BrowserStream] Parsed action:', JSON.stringify(actionData, null, 2).substring(0, 500));

                        const result = await this.processAction(actionData, url, sessionId);
                        console.log('[BrowserStream] Process result:', result ? JSON.stringify(result, null, 2).substring(0, 300) : 'null');

                        if (result) {
                            console.log('[BrowserStream] Emitting veroCode:', result.veroCode);
                            onAction(
                                result.veroCode,
                                result.pagePath,
                                result.pageCode,
                                result.fieldCreated
                            );
                        } else {
                            console.log('[BrowserStream] No result from processAction - action not recorded');
                        }
                    } catch (e) {
                        console.error('[BrowserStream] Error parsing action:', e);
                        console.error('[BrowserStream] Raw text was:', text);
                    }
                }
            });

            // Detect when user closes the browser
            browser.on('disconnected', () => {
                console.log(`[BrowserStream] Browser closed for session ${sessionId}`);
                this.sessions.delete(sessionId);
                onError('Browser closed');
            });

            // Navigate to URL AFTER setting up the init script
            // This ensures the action capture script runs on the initial page load
            await page.goto(url);

            console.log(`[BrowserStream] Recording started for session ${sessionId} - Chrome browser opened`);

        } catch (error: any) {
            console.error('[BrowserStream] Error starting recording:', error);
            onError(error.message);
        }
    }

    /**
     * Process a captured action and convert to Vero DSL with page object support
     * Uses Playwright's locator ranking algorithm for optimal selectors
     */
    private async processAction(
        action: CapturedAction,
        currentUrl: string,
        sessionId: string
    ): Promise<{
        veroCode: string;
        pagePath?: string;
        pageCode?: string;
        fieldCreated?: { pageName: string; fieldName: string };
    } | null> {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        const registry = session.registry;

        // Handle keypress actions
        if (action.type === 'keypress' && action.key) {
            return { veroCode: `press "${action.key}"` };
        }

        // Skip if no element info
        if (!action.element) return null;

        // Convert to locator ranker format and get best Playwright-style selector
        const locatorElement: LocatorElementInfo = {
            tagName: action.element.tagName,
            id: action.element.id,
            testId: action.element.testId,
            role: action.element.role,
            ariaLabel: action.element.ariaLabel,
            innerText: action.element.text,
            placeholder: action.element.placeholder,
            title: action.element.title,
            className: action.element.className,
            name: action.element.name,
            type: action.element.inputType,
            href: action.element.href
        };

        // Use Playwright's locator ranking to get the best selector
        const bestLocator = getBestLocator(locatorElement);
        if (!bestLocator) {
            console.log('[BrowserStream] Could not generate locator for element');
            return null;
        }

        // Convert Playwright selector to Vero DSL format
        const veroSelector = this.playwrightToVeroSelector(bestLocator.selector);

        console.log(`[BrowserStream] Playwright: ${bestLocator.selector} -> Vero: ${veroSelector}`);

        // Check if this selector already exists in a page object
        let fieldRef = registry.findBySelector(veroSelector);

        // Also check for similar selectors
        if (!fieldRef) {
            fieldRef = registry.findSimilarSelector(action.element);
        }

        let veroCode: string;
        let pagePath: string | undefined;
        let pageCode: string | undefined;
        let fieldCreated: { pageName: string; fieldName: string } | undefined;

        if (fieldRef) {
            // Use existing page object field
            veroCode = this.buildVeroActionWithRef(action.type, fieldRef, action.value);
        } else {
            // Create new page object field
            const pageName = registry.suggestPageName(currentUrl);
            const fieldName = registry.generateFieldName(action.element, action.type);

            // Get or create the page
            registry.getOrCreatePage(currentUrl);

            // Add the field with the Vero-formatted selector
            fieldRef = registry.addField(pageName, fieldName, veroSelector);

            // Persist the page to disk
            pagePath = await registry.persist(pageName);
            pageCode = registry.getPageContent(pageName) || undefined;

            fieldCreated = {
                pageName: fieldRef.pageName,
                fieldName: fieldRef.fieldName
            };

            veroCode = this.buildVeroActionWithRef(action.type, fieldRef, action.value);

            console.log(`[BrowserStream] Created field ${fieldRef.pageName}.${fieldRef.fieldName} = ${veroSelector}`);
        }

        return { veroCode, pagePath, pageCode, fieldCreated };
    }

    /**
     * Convert Playwright selector syntax to Vero DSL selector syntax
     * Examples:
     *   getByTestId('email') -> testId "email"
     *   getByRole('button', { name: 'Submit' }) -> button "Submit"
     *   getByLabel('Email') -> label "Email"
     *   getByPlaceholder('Enter email') -> placeholder "Enter email"
     *   getByText('Click me') -> text "Click me"
     *   locator('#id') -> "#id"
     */
    private playwrightToVeroSelector(playwrightSelector: string): string {
        // getByTestId('value')
        const testIdMatch = playwrightSelector.match(/getByTestId\(['"]([^'"]+)['"]\)/);
        if (testIdMatch) {
            return `testId "${testIdMatch[1]}"`;
        }

        // getByRole('role', { name: 'value' }) or getByRole('role')
        const roleWithNameMatch = playwrightSelector.match(/getByRole\(['"](\w+)['"](?:,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\})?\)/);
        if (roleWithNameMatch) {
            const role = roleWithNameMatch[1];
            const name = roleWithNameMatch[2];
            if (name) {
                return `${role} "${name}"`;
            }
            return `role "${role}"`;
        }

        // getByLabel('value')
        const labelMatch = playwrightSelector.match(/getByLabel\(['"]([^'"]+)['"]\)/);
        if (labelMatch) {
            return `label "${labelMatch[1]}"`;
        }

        // getByPlaceholder('value')
        const placeholderMatch = playwrightSelector.match(/getByPlaceholder\(['"]([^'"]+)['"]\)/);
        if (placeholderMatch) {
            return `placeholder "${placeholderMatch[1]}"`;
        }

        // getByAltText('value')
        const altMatch = playwrightSelector.match(/getByAltText\(['"]([^'"]+)['"]\)/);
        if (altMatch) {
            return `alt "${altMatch[1]}"`;
        }

        // getByTitle('value')
        const titleMatch = playwrightSelector.match(/getByTitle\(['"]([^'"]+)['"]\)/);
        if (titleMatch) {
            return `title "${titleMatch[1]}"`;
        }

        // getByText('value')
        const textMatch = playwrightSelector.match(/getByText\(['"]([^'"]+)['"]\)/);
        if (textMatch) {
            return `text "${textMatch[1]}"`;
        }

        // locator('#id') or locator('.class') or locator('css')
        const locatorMatch = playwrightSelector.match(/locator\(['"]([^'"]+)['"]\)/);
        if (locatorMatch) {
            return locatorMatch[1]; // Return raw CSS selector
        }

        // Fallback: return as-is
        return playwrightSelector;
    }

    /**
     * Build Vero action code using page object reference
     */
    private buildVeroActionWithRef(
        type: string,
        fieldRef: PageFieldRef,
        value?: string
    ): string {
        const ref = `${fieldRef.pageName}.${fieldRef.fieldName}`;

        switch (type) {
            case 'click':
                return `click ${ref}`;
            case 'fill':
                return `fill ${ref} with "${value || ''}"`;
            case 'check':
                return `check ${ref}`;
            case 'select':
                return `select "${value || ''}" from ${ref}`;
            default:
                return `# ${type}: ${ref}`;
        }
    }

    /**
     * Convert captured action data to Vero DSL
     */
    private convertActionToVero(action: any, currentUrl: string): string | null {
        // Build selector from available attributes
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
            return null; // Can't build a reliable selector
        }

        // Generate Vero code based on action type
        switch (action.type) {
            case 'click':
                return `click ${selector}`;
            case 'fill':
                if (!action.value) return null;
                return `fill ${selector} with "${action.value}"`;
            default:
                return null;
        }
    }

    /**
     * Stop recording and clean up
     */
    async stopRecording(sessionId: string): Promise<string> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return '';
        }

        // Stop file watcher
        session.fileWatcher?.close();

        // Stop CDP screencast
        try {
            await session.cdp.send('Page.stopScreencast');
        } catch (e) {
            // Already stopped
        }

        // Kill codegen process
        if (!session.codegenProcess.killed) {
            session.codegenProcess.kill('SIGTERM');
        }

        // Wait for file to be written
        await new Promise(r => setTimeout(r, 1000));

        // Read final code
        let finalCode = '';
        try {
            finalCode = await readFile(session.outputFile, 'utf-8');
        } catch (e) {
            // No code generated
        }

        // Close browser
        await session.browser.close();

        // Clean up
        this.sessions.delete(sessionId);

        return finalCode;
    }

    /**
     * Parse Playwright code to extract actions
     */
    private parsePlaywrightCode(code: string): ParsedAction[] {
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
                    rawSelector: this.extractRawSelector(clickMatch[2]),
                    originalLine: trimmed
                };
            }

            // fill with various locators
            const fillMatch = trimmed.match(/await page\.(getBy\w+|locator)\((.+?)\)\.fill\(['"](.+?)['"]\)/);
            if (fillMatch) {
                action = {
                    type: 'fill',
                    playwrightLocator: `page.${fillMatch[1]}(${fillMatch[2]})`,
                    rawSelector: this.extractRawSelector(fillMatch[2]),
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
                    rawSelector: this.extractRawSelector(checkMatch[2]),
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
                    rawSelector: this.extractRawSelector(selectMatch[2]),
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
                    rawSelector: this.extractRawSelector(expectMatch[2]),
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
     * Extract raw selector string from Playwright locator
     */
    private extractRawSelector(locatorArg: string): string {
        // Remove outer quotes
        let selector = locatorArg.replace(/^['"]|['"]$/g, '').trim();

        // Handle getByRole patterns like: 'button', { name: 'Login' }
        const roleMatch = locatorArg.match(/['"](\w+)['"],\s*\{\s*name:\s*['"](.+?)['"]/);
        if (roleMatch) {
            return `role=${roleMatch[1]}[name="${roleMatch[2]}"]`;
        }

        return selector;
    }

    /**
     * Convert action to framework-aware Vero DSL
     * Uses existing page objects or creates new ones
     */
    private async convertToFrameworkAwareVero(
        action: ParsedAction,
        currentUrl: string
    ): Promise<{ veroCode: string; newPagePath?: string; newPageCode?: string }> {

        // Handle goto separately
        if (action.type === 'goto') {
            return { veroCode: `open "${action.value}"` };
        }

        // Handle press separately (no selector)
        if (action.type === 'press') {
            return { veroCode: `press "${action.value}"` };
        }

        // Try to find existing page object for this selector
        const existing = this.findExistingSelector(action.rawSelector, action.playwrightLocator);

        if (existing) {
            // Use existing page object: PageName.selectorName
            const veroCode = this.buildVeroAction(action.type, `${existing.pageName}.${existing.selectorName}`, action.value);
            return { veroCode };
        }

        // No existing page object - create one
        const pageName = this.suggestPageName(currentUrl);
        const selectorName = this.generateSelectorName(action.rawSelector, action.type);

        // Add to page objects
        this.addPageObject(pageName, selectorName, action.rawSelector, action.playwrightLocator);

        // Generate page file update
        const { pagePath, pageCode } = await this.generatePageFileUpdate(pageName, selectorName, action.playwrightLocator);

        const veroCode = this.buildVeroAction(action.type, `${pageName}.${selectorName}`, action.value);

        return { veroCode, newPagePath: pagePath, newPageCode: pageCode };
    }

    /**
     * Build Vero action code
     */
    private buildVeroAction(type: string, selector: string, value?: string): string {
        switch (type) {
            case 'click':
                return `click "${selector}"`;
            case 'fill':
                return `fill "${selector}" with "${value}"`;
            case 'check':
                return `check "${selector}"`;
            case 'select':
                return `select "${value}" from "${selector}"`;
            case 'expect':
                if (value) {
                    return `expect "${selector}" contains "${value}"`;
                }
                return `expect "${selector}" visible`;
            default:
                return `# ${type}: ${selector}`;
        }
    }

    /**
     * Find existing selector in loaded page objects
     */
    private findExistingSelector(rawSelector: string, playwrightLocator: string): PageObjectEntry | null {
        for (const [pageName, entries] of this.pageObjects) {
            for (const entry of entries) {
                if (entry.rawSelector === rawSelector || entry.playwrightLocator === playwrightLocator) {
                    return entry;
                }
            }
        }
        return null;
    }

    /**
     * Suggest page name based on URL
     */
    private suggestPageName(url: string): string {
        try {
            const urlObj = new URL(url);
            const path = urlObj.pathname.replace(/^\/|\/$/g, '');

            if (!path || path === '') return 'HomePage';

            // Convert path to PascalCase
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
     * Generate a readable selector name
     */
    private generateSelectorName(rawSelector: string, actionType: string): string {
        // Extract meaningful part from selector
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

        // Convert to camelCase
        return baseName
            .replace(/[^a-zA-Z0-9]/g, ' ')
            .trim()
            .split(/\s+/)
            .map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
    }

    /**
     * Add page object entry
     */
    private addPageObject(pageName: string, selectorName: string, rawSelector: string, playwrightLocator: string): void {
        if (!this.pageObjects.has(pageName)) {
            this.pageObjects.set(pageName, []);
        }

        this.pageObjects.get(pageName)!.push({
            pageName,
            selectorName,
            rawSelector,
            playwrightLocator
        });
    }

    /**
     * Generate page file update
     */
    private async generatePageFileUpdate(
        pageName: string,
        selectorName: string,
        playwrightLocator: string
    ): Promise<{ pagePath: string; pageCode: string }> {
        const pagePath = join(this.projectPath, 'pages', `${pageName}.vero`);

        // Convert Playwright locator to Vero selector syntax
        const veroSelector = this.convertPlaywrightLocatorToVero(playwrightLocator);

        const newEntry = `    ${selectorName} = ${veroSelector}`;

        // Try to read existing page file
        let existingContent = '';
        try {
            existingContent = await readFile(pagePath, 'utf-8');
        } catch {
            // Create new page file
            existingContent = `page ${pageName} {\n}\n`;
        }

        // Insert new selector before closing brace
        const lastBrace = existingContent.lastIndexOf('}');
        const pageCode = existingContent.slice(0, lastBrace) + newEntry + '\n' + existingContent.slice(lastBrace);

        return { pagePath, pageCode };
    }

    /**
     * Convert Playwright locator to Vero selector syntax
     */
    private convertPlaywrightLocatorToVero(playwrightLocator: string): string {
        // getByRole('button', { name: 'Login' }) -> role "button" name "Login"
        const roleMatch = playwrightLocator.match(/getByRole\(['"](\w+)['"],\s*\{\s*name:\s*['"](.+?)['"]/);
        if (roleMatch) {
            return `role "${roleMatch[1]}" name "${roleMatch[2]}"`;
        }

        // getByText('Click me') -> text "Click me"
        const textMatch = playwrightLocator.match(/getByText\(['"](.+?)['"]\)/);
        if (textMatch) {
            return `text "${textMatch[1]}"`;
        }

        // getByLabel('Username') -> label "Username"
        const labelMatch = playwrightLocator.match(/getByLabel\(['"](.+?)['"]\)/);
        if (labelMatch) {
            return `label "${labelMatch[1]}"`;
        }

        // getByPlaceholder('Enter email') -> placeholder "Enter email"
        const placeholderMatch = playwrightLocator.match(/getByPlaceholder\(['"](.+?)['"]\)/);
        if (placeholderMatch) {
            return `placeholder "${placeholderMatch[1]}"`;
        }

        // getByTestId('login-btn') -> testid "login-btn"
        const testIdMatch = playwrightLocator.match(/getByTestId\(['"](.+?)['"]\)/);
        if (testIdMatch) {
            return `testid "${testIdMatch[1]}"`;
        }

        // locator('css-selector') -> css "css-selector"
        const locatorMatch = playwrightLocator.match(/locator\(['"](.+?)['"]\)/);
        if (locatorMatch) {
            return `css "${locatorMatch[1]}"`;
        }

        return `css "${playwrightLocator}"`;
    }

    /**
     * Load existing page objects from .vero files
     */
    private async loadPageObjects(): Promise<void> {
        const pagesDir = join(this.projectPath, 'pages');

        try {
            const { readdir } = await import('fs/promises');
            const files = await readdir(pagesDir);

            for (const file of files) {
                if (!file.endsWith('.vero')) continue;

                const content = await readFile(join(pagesDir, file), 'utf-8');
                const pageName = file.replace('.vero', '');

                // Parse page file for selectors
                const selectorRegex = /(\w+)\s*=\s*(.+)/g;
                let match;

                while ((match = selectorRegex.exec(content)) !== null) {
                    const selectorName = match[1];
                    const selectorValue = match[2].trim();

                    this.addPageObject(pageName, selectorName, selectorValue, selectorValue);
                }
            }
        } catch (e) {
            // No pages directory yet
        }
    }

    /**
     * Check if a session exists
     */
    hasSession(sessionId: string): boolean {
        return this.sessions.has(sessionId);
    }

    /**
     * Dispatch mouse click to browser via Playwright's mouse API
     * This is more reliable than raw CDP events for triggering actual DOM clicks
     * Returns detailed info about the click for debugging
     */
    async dispatchClickWithInfo(sessionId: string, x: number, y: number): Promise<{
        success: boolean;
        error?: string;
        elementInfo?: { tag: string; id?: string; text?: string; href?: string };
        urlAfter?: string;
    }> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            console.log(`[BrowserStream] dispatchClick: Session not found: ${sessionId}`);
            console.log(`[BrowserStream] Available sessions: ${Array.from(this.sessions.keys()).join(', ') || '(none)'}`);
            return { success: false, error: 'Session not found' };
        }

        console.log(`[BrowserStream] Dispatching click at (${x}, ${y}) for session ${sessionId}`);

        try {
            // Get element at position before clicking for debugging
            const elementInfo = await session.page.evaluate(({ x, y }) => {
                const el = document.elementFromPoint(x, y);
                if (!el) return null;
                return {
                    tag: el.tagName,
                    id: el.id || undefined,
                    text: el.textContent?.trim().slice(0, 50) || undefined,
                    href: (el as HTMLAnchorElement).href || undefined
                };
            }, { x, y });

            console.log(`[BrowserStream] Element at (${x}, ${y}):`, elementInfo);

            const urlBefore = session.page.url();

            // Use Playwright's mouse API which properly triggers DOM events
            await session.page.mouse.click(x, y);
            console.log(`[BrowserStream] Click dispatched successfully`);

            // Wait for potential navigation (with timeout)
            try {
                await session.page.waitForLoadState('domcontentloaded', { timeout: 2000 });
            } catch (e) {
                // No navigation happened, that's fine
            }

            // Check URL after click (for navigation)
            const urlAfter = session.page.url();
            console.log(`[BrowserStream] URL: ${urlBefore} -> ${urlAfter}`);

            return {
                success: true,
                elementInfo: elementInfo || undefined,
                urlAfter
            };
        } catch (error: any) {
            console.error(`[BrowserStream] Error dispatching click:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Legacy dispatchClick for backwards compatibility
     */
    async dispatchClick(sessionId: string, x: number, y: number): Promise<boolean> {
        const result = await this.dispatchClickWithInfo(sessionId, x, y);
        return result.success;
    }

    /**
     * Dispatch mouse move to browser via Playwright's mouse API
     */
    async dispatchMouseMove(sessionId: string, x: number, y: number): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        try {
            await session.page.mouse.move(x, y);
        } catch (error) {
            // Ignore move errors
        }
    }

    /**
     * Dispatch keyboard input to browser via Playwright's keyboard API
     */
    async dispatchKeyboard(sessionId: string, text: string, key?: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        try {
            // Handle special keys
            const specialKeys = ['Backspace', 'Tab', 'Enter', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Delete'];

            if (key && specialKeys.includes(key)) {
                await session.page.keyboard.press(key);
                return;
            }

            // Handle regular text input
            if (text && text.length > 0) {
                await session.page.keyboard.type(text);
            }
        } catch (error) {
            console.error(`[BrowserStream] Error dispatching keyboard:`, error);
        }
    }

    /**
     * Dispatch scroll to browser via Playwright's mouse API
     */
    async dispatchScroll(sessionId: string, x: number, y: number, deltaX: number, deltaY: number): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        try {
            // Move mouse to position first, then scroll
            await session.page.mouse.move(x, y);
            await session.page.mouse.wheel(deltaX, deltaY);
        } catch (error) {
            // Ignore scroll errors
        }
    }

    /**
     * Process an action from the iframe proxy (without requiring a browser session)
     * Used when embedding websites via the proxy approach
     */
    async processIframeAction(
        action: CapturedAction,
        currentUrl: string,
        scenarioName?: string
    ): Promise<{
        veroCode: string;
        pagePath?: string;
        pageCode?: string;
        fieldCreated?: { pageName: string; fieldName: string };
    } | null> {
        // Initialize registry if needed
        const registry = initPageObjectRegistry(this.projectPath);
        await registry.loadFromDisk();

        // Handle keypress actions
        if (action.type === 'keypress' && action.key) {
            return { veroCode: `press "${action.key}"` };
        }

        // Skip if no element info
        if (!action.element) return null;

        // Convert to locator ranker format and get best Playwright-style selector
        const locatorElement: LocatorElementInfo = {
            tagName: action.element.tagName,
            id: action.element.id,
            testId: action.element.testId,
            role: action.element.role,
            ariaLabel: action.element.ariaLabel,
            innerText: action.element.text,
            placeholder: action.element.placeholder,
            title: action.element.title,
            className: action.element.className,
            name: action.element.name,
            type: action.element.inputType,
            href: action.element.href
        };

        // Use Playwright's locator ranking to get the best selector
        const bestLocator = getBestLocator(locatorElement);
        if (!bestLocator) {
            console.log('[BrowserStream] Could not generate locator for iframe element');
            return null;
        }

        // Convert Playwright selector to Vero DSL format
        const veroSelector = this.playwrightToVeroSelector(bestLocator.selector);

        console.log(`[BrowserStream] Iframe action - Playwright: ${bestLocator.selector} -> Vero: ${veroSelector}`);

        // Check if this selector already exists in a page object
        let fieldRef = registry.findBySelector(veroSelector);

        // Also check for similar selectors
        if (!fieldRef) {
            fieldRef = registry.findSimilarSelector(action.element);
        }

        let veroCode: string;
        let pagePath: string | undefined;
        let pageCode: string | undefined;
        let fieldCreated: { pageName: string; fieldName: string } | undefined;

        if (fieldRef) {
            // Use existing page object field
            veroCode = this.buildVeroActionWithRef(action.type, fieldRef, action.value);
        } else {
            // Create new page object field
            const pageName = registry.suggestPageName(currentUrl);
            const fieldName = registry.generateFieldName(action.element, action.type);

            // Get or create the page
            registry.getOrCreatePage(currentUrl);

            // Add the field with the Vero-formatted selector
            fieldRef = registry.addField(pageName, fieldName, veroSelector);

            // Persist the page to disk
            pagePath = await registry.persist(pageName);
            pageCode = registry.getPageContent(pageName) || undefined;

            fieldCreated = {
                pageName: fieldRef.pageName,
                fieldName: fieldRef.fieldName
            };

            veroCode = this.buildVeroActionWithRef(action.type, fieldRef, action.value);

            console.log(`[BrowserStream] Created iframe field ${fieldRef.pageName}.${fieldRef.fieldName} = ${veroSelector}`);
        }

        return { veroCode, pagePath, pageCode, fieldCreated };
    }

    /**
     * Create an iframe proxy session (no browser, just for action processing)
     */
    createIframeSession(sessionId: string, url: string, scenarioName?: string): void {
        const registry = initPageObjectRegistry(this.projectPath);

        // Store a lightweight session for iframe proxy mode
        // We don't have a browser, just registry state
        console.log(`[BrowserStream] Created iframe session: ${sessionId} for URL: ${url}`);
    }

    /**
     * Get or create page object registry
     */
    getRegistry(): PageObjectRegistry {
        return initPageObjectRegistry(this.projectPath);
    }
}

export const browserStreamService = new BrowserStreamService(
    process.env.VERO_PROJECT_PATH || join(process.cwd(), '..', 'vero-lang', 'test-project')
);
