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
import { screenshotService } from './screenshotService';
import {
    validateSelector,
    findFirstValidSelector,
    isElementInteractable,
    SelectorValidationResult
} from './selectorHealing';
import { generateVeroAction, generateVeroAssertion } from './veroSyntaxReference';
import { logger } from '../utils/logger';

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
    stepCount: number; // Track step count for screenshots
    captureScreenshots: boolean; // Whether to capture screenshots (user configurable)
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
            logger.info('[BrowserStream] Launched headed Chrome browser for recording');

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
                scenarioName,
                stepCount: 0,
                captureScreenshots: false // Off by default - user can enable via API
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
                    logger.debug('[BrowserStream] Captured action from browser:', text.substring(0, 200));
                    try {
                        const jsonStr = text.replace('__VERO_ACTION__', '').trim();
                        const actionData: CapturedAction = JSON.parse(jsonStr);
                        logger.debug('[BrowserStream] Parsed action:', JSON.stringify(actionData, null, 2).substring(0, 500));

                        const result = await this.processAction(actionData, url, sessionId);

                        if (result) {
                            logger.debug('[BrowserStream] Emitting veroCode:', result.veroCode);
                            onAction(
                                result.veroCode,
                                result.pagePath,
                                result.pageCode,
                                result.fieldCreated
                            );
                        } else {
                            logger.debug('[BrowserStream] No result from processAction - action not recorded');
                        }
                    } catch (e) {
                        logger.error('[BrowserStream] Error parsing action:', e);
                    }
                }
            });

            // Detect when user closes the browser
            browser.on('disconnected', () => {
                logger.info(`[BrowserStream] Browser closed for session ${sessionId}`);
                this.sessions.delete(sessionId);
                onError('Browser closed');
            });

            // Navigate to URL AFTER setting up the init script
            // This ensures the action capture script runs on the initial page load
            await page.goto(url);

            logger.info(`[BrowserStream] Recording started for session ${sessionId} - Chrome browser opened`);

        } catch (error: any) {
            logger.error('[BrowserStream] Error starting recording:', error);
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
        screenshot?: string; // Base64 screenshot data URL
        stepNumber?: number;
    } | null> {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        // Capture current step number
        const stepNumber = session.stepCount++;
        let screenshotDataUrl: string | undefined;

        const registry = session.registry;

        // Capture screenshot after action (only if enabled)
        const captureScreenshot = async () => {
            if (!session.captureScreenshots) return undefined;
            try {
                const buffer = await session.page.screenshot({
                    type: 'png',
                    fullPage: false
                });
                // Save to file and get data URL
                await screenshotService.saveStepScreenshot(sessionId, stepNumber, buffer);
                return screenshotService.bufferToDataUrl(buffer);
            } catch (e) {
                logger.warn('[BrowserStream] Failed to capture screenshot:', e);
                return undefined;
            }
        };

        // Handle keypress actions
        if (action.type === 'keypress' && action.key) {
            screenshotDataUrl = await captureScreenshot();
            return { veroCode: generateVeroAction('press', undefined, action.key), screenshot: screenshotDataUrl, stepNumber };
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
            logger.debug('[BrowserStream] Could not generate locator for element');
            return null;
        }

        // Convert Playwright selector to Vero DSL format
        const veroSelector = this.playwrightToVeroSelector(bestLocator.selector);

        logger.debug(`[BrowserStream] Playwright: ${bestLocator.selector} -> Vero: ${veroSelector}`);

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

            logger.debug(`[BrowserStream] Created field ${fieldRef.pageName}.${fieldRef.fieldName} = ${veroSelector}`);
        }

        // Capture screenshot after action
        screenshotDataUrl = await captureScreenshot();

        return { veroCode, pagePath, pageCode, fieldCreated, screenshot: screenshotDataUrl, stepNumber };
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

        // Use single source of truth for Vero syntax
        return generateVeroAction(type, ref, value);
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

        // Generate Vero code using single source of truth
        if (action.type === 'fill' && !action.value) return null;
        const veroCode = generateVeroAction(action.type, selector, action.value);
        return veroCode.startsWith('#') ? null : veroCode;
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
            return { veroCode: generateVeroAction('open', undefined, action.value) };
        }

        // Handle press separately (no selector)
        if (action.type === 'press') {
            return { veroCode: generateVeroAction('press', undefined, action.value) };
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
     * Build Vero action code using single source of truth
     */
    private buildVeroAction(type: string, selector: string, value?: string): string {
        if (type === 'expect') {
            const assertType = value ? 'contains' : 'visible';
            return generateVeroAssertion(selector, assertType, value);
        }
        return generateVeroAction(type, selector, value);
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
        const pagePath = join(this.projectPath, 'Pages', `${pageName}.vero`);

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
        const pagesDir = join(this.projectPath, 'Pages');

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
     * Enable or disable screenshot capture for a session
     */
    setScreenshotCapture(sessionId: string, enabled: boolean): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) return false;
        session.captureScreenshots = enabled;
        logger.info(`[BrowserStream] Screenshot capture ${enabled ? 'enabled' : 'disabled'} for session ${sessionId}`);
        return true;
    }

    /**
     * Take an on-demand screenshot for reporting
     */
    async takeScreenshot(sessionId: string): Promise<string | null> {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        try {
            const buffer = await session.page.screenshot({
                type: 'png',
                fullPage: false
            });
            const metadata = await screenshotService.saveStepScreenshot(
                sessionId,
                session.stepCount,
                buffer
            );
            return screenshotService.bufferToDataUrl(buffer);
        } catch (e) {
            logger.warn('[BrowserStream] Failed to take screenshot:', e);
            return null;
        }
    }

    /**
     * Validate a selector against the live page
     */
    async validateSelector(sessionId: string, selector: string): Promise<SelectorValidationResult | null> {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        return validateSelector(session.page, selector);
    }

    /**
     * Validate multiple selectors and find the first valid one
     */
    async findValidSelector(
        sessionId: string,
        selectors: string[]
    ): Promise<{ selector: string; result: SelectorValidationResult } | null> {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        return findFirstValidSelector(session.page, selectors);
    }

    /**
     * Check if an element is interactable (visible and enabled)
     */
    async checkElementInteractable(
        sessionId: string,
        selector: string
    ): Promise<{
        exists: boolean;
        visible: boolean;
        enabled: boolean;
        interactable: boolean;
    } | null> {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        return isElementInteractable(session.page, selector);
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
            logger.warn(`[BrowserStream] dispatchClick: Session not found: ${sessionId}`);
            return { success: false, error: 'Session not found' };
        }

        logger.debug(`[BrowserStream] Dispatching click at (${x}, ${y}) for session ${sessionId}`);

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

            logger.debug(`[BrowserStream] Element at (${x}, ${y}):`, elementInfo);

            const urlBefore = session.page.url();

            await session.page.mouse.click(x, y);
            logger.debug(`[BrowserStream] Click dispatched successfully`);

            // Wait for potential navigation (with timeout)
            try {
                await session.page.waitForLoadState('domcontentloaded', { timeout: 2000 });
            } catch (e) {
                // No navigation happened, that's fine
            }

            // Check URL after click (for navigation)
            const urlAfter = session.page.url();
            logger.debug(`[BrowserStream] URL: ${urlBefore} -> ${urlAfter}`);

            return {
                success: true,
                elementInfo: elementInfo || undefined,
                urlAfter
            };
        } catch (error: any) {
            logger.error(`[BrowserStream] Error dispatching click:`, error);
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
            logger.error(`[BrowserStream] Error dispatching keyboard:`, error);
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
            return { veroCode: generateVeroAction('press', undefined, action.key) };
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
            logger.debug('[BrowserStream] Could not generate locator for iframe element');
            return null;
        }

        // Convert Playwright selector to Vero DSL format
        const veroSelector = this.playwrightToVeroSelector(bestLocator.selector);

        logger.debug(`[BrowserStream] Iframe action - Playwright: ${bestLocator.selector} -> Vero: ${veroSelector}`);

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

            logger.debug(`[BrowserStream] Created iframe field ${fieldRef.pageName}.${fieldRef.fieldName} = ${veroSelector}`);
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
        logger.info(`[BrowserStream] Created iframe session: ${sessionId} for URL: ${url}`);
    }

    /**
     * Highlight an element on the page using CDP Overlay
     * @param sessionId - The recording session ID
     * @param selector - Vero selector to highlight
     * @param options - Highlight options (color, duration)
     */
    async highlightElement(
        sessionId: string,
        selector: string,
        options: {
            color?: { r: number; g: number; b: number; a: number };
            borderColor?: { r: number; g: number; b: number; a: number };
            showInfo?: boolean;
            durationMs?: number;
        } = {}
    ): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        const {
            color = { r: 66, g: 133, b: 244, a: 0.3 },        // Blue fill
            borderColor = { r: 66, g: 133, b: 244, a: 1 },    // Blue border
            showInfo = true,
            durationMs = 2000
        } = options;

        try {
            // Enable overlay
            await session.cdp.send('Overlay.enable');

            // Find the element using Playwright and get its node ID
            const element = await this.findElementByVeroSelector(session.page, selector);
            if (!element) {
                logger.debug(`[BrowserStream] Element not found for highlight: ${selector}`);
                return false;
            }

            // Get the element's bounding box for highlight
            const box = await element.boundingBox();
            if (!box) {
                logger.debug(`[BrowserStream] Element has no bounding box: ${selector}`);
                return false;
            }

            // Use highlightRect for the bounding box highlight
            await session.cdp.send('Overlay.highlightRect', {
                x: Math.round(box.x),
                y: Math.round(box.y),
                width: Math.round(box.width),
                height: Math.round(box.height),
                color,
                outlineColor: borderColor
            });

            // Auto-hide after duration
            if (durationMs > 0) {
                setTimeout(async () => {
                    try {
                        await session.cdp.send('Overlay.hideHighlight');
                    } catch {
                        // Session may have ended
                    }
                }, durationMs);
            }

            return true;
        } catch (e) {
            logger.warn(`[BrowserStream] Failed to highlight element:`, e);
            return false;
        }
    }

    /**
     * Highlight an element by its coordinates (for immediate feedback during recording)
     */
    async highlightAtPoint(
        sessionId: string,
        x: number,
        y: number,
        options: {
            color?: { r: number; g: number; b: number; a: number };
            borderColor?: { r: number; g: number; b: number; a: number };
            durationMs?: number;
        } = {}
    ): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        const {
            color = { r: 76, g: 175, b: 80, a: 0.3 },         // Green fill for click
            borderColor = { r: 76, g: 175, b: 80, a: 1 },      // Green border
            durationMs = 1000
        } = options;

        try {
            await session.cdp.send('Overlay.enable');

            // Get element at point using CDP
            const { nodeId } = await session.cdp.send('DOM.getNodeForLocation', {
                x: Math.round(x),
                y: Math.round(y)
            });

            if (nodeId) {
                await session.cdp.send('Overlay.highlightNode', {
                    nodeId,
                    highlightConfig: {
                        contentColor: color,
                        borderColor,
                        showInfo: true,
                        showExtensionLines: false
                    }
                });

                // Auto-hide
                if (durationMs > 0) {
                    setTimeout(async () => {
                        try {
                            await session.cdp.send('Overlay.hideHighlight');
                        } catch {
                            // Session may have ended
                        }
                    }, durationMs);
                }

                return true;
            }

            return false;
        } catch (e) {
            logger.warn(`[BrowserStream] Failed to highlight at point:`, e);
            return false;
        }
    }

    /**
     * Hide all highlights
     */
    async hideHighlight(sessionId: string): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        try {
            await session.cdp.send('Overlay.hideHighlight');
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Enable hover highlight (shows element info on hover)
     */
    async enableHoverHighlight(sessionId: string, enabled: boolean = true): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        try {
            if (enabled) {
                await session.cdp.send('Overlay.enable');
                await session.cdp.send('Overlay.setInspectMode', {
                    mode: 'searchForNode',
                    highlightConfig: {
                        contentColor: { r: 111, g: 168, b: 220, a: 0.66 },
                        paddingColor: { r: 147, g: 196, b: 125, a: 0.55 },
                        borderColor: { r: 255, g: 229, b: 153, a: 0.66 },
                        marginColor: { r: 246, g: 178, b: 107, a: 0.66 },
                        showInfo: true,
                        showExtensionLines: true
                    }
                });
            } else {
                await session.cdp.send('Overlay.setInspectMode', {
                    mode: 'none',
                    highlightConfig: {}
                });
            }
            return true;
        } catch (e) {
            logger.warn(`[BrowserStream] Failed to toggle hover highlight:`, e);
            return false;
        }
    }

    /**
     * Highlight with selector validation feedback
     * Shows green for valid, red for invalid, yellow for non-unique
     */
    async highlightWithValidation(
        sessionId: string,
        selector: string,
        durationMs: number = 2000
    ): Promise<{
        highlighted: boolean;
        validation: SelectorValidationResult | null;
    }> {
        const session = this.sessions.get(sessionId);
        if (!session) return { highlighted: false, validation: null };

        // First validate the selector
        const validation = await validateSelector(session.page, selector);

        // Choose color based on validation result
        let color: { r: number; g: number; b: number; a: number };
        let borderColor: { r: number; g: number; b: number; a: number };

        if (!validation.isValid) {
            // Red for invalid/not found
            color = { r: 244, g: 67, b: 54, a: 0.3 };
            borderColor = { r: 244, g: 67, b: 54, a: 1 };
        } else if (!validation.isUnique) {
            // Yellow for multiple matches
            color = { r: 255, g: 193, b: 7, a: 0.3 };
            borderColor = { r: 255, g: 193, b: 7, a: 1 };
        } else {
            // Green for valid and unique
            color = { r: 76, g: 175, b: 80, a: 0.3 };
            borderColor = { r: 76, g: 175, b: 80, a: 1 };
        }

        // Highlight with appropriate color
        const highlighted = await this.highlightElement(sessionId, selector, {
            color,
            borderColor,
            durationMs
        });

        return { highlighted, validation };
    }

    /**
     * Find an element by Vero selector
     */
    private async findElementByVeroSelector(page: Page, selector: string) {
        // testId "login-btn"
        let match = selector.match(/testId "(.+?)"/);
        if (match) {
            return page.getByTestId(match[1]).first();
        }

        // button "Submit" (role with name)
        match = selector.match(/^(\w+) "(.+?)"/);
        if (match) {
            const role = match[1] as any;
            const name = match[2];
            return page.getByRole(role, { name }).first();
        }

        // role "button" (role without name)
        match = selector.match(/role "(\w+)"/);
        if (match) {
            return page.getByRole(match[1] as any).first();
        }

        // label "Email"
        match = selector.match(/label "(.+?)"/);
        if (match) {
            return page.getByLabel(match[1]).first();
        }

        // placeholder "Enter email"
        match = selector.match(/placeholder "(.+?)"/);
        if (match) {
            return page.getByPlaceholder(match[1]).first();
        }

        // text "Click me"
        match = selector.match(/text "(.+?)"/);
        if (match) {
            return page.getByText(match[1]).first();
        }

        // alt "Logo"
        match = selector.match(/alt "(.+?)"/);
        if (match) {
            return page.getByAltText(match[1]).first();
        }

        // title "Tooltip"
        match = selector.match(/title "(.+?)"/);
        if (match) {
            return page.getByTitle(match[1]).first();
        }

        // CSS selector (#id, .class, tag)
        return page.locator(selector).first();
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
