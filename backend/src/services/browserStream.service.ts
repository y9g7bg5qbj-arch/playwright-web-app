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

import { chromium } from 'playwright';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { EventEmitter } from 'events';
import { PageObjectRegistry, initPageObjectRegistry, PageFieldRef } from './pageObjectRegistry';
import { getBestLocator, ElementInfo as LocatorElementInfo } from '../locators/locatorRanker';
import { screenshotService } from './screenshotService';
import { validateSelector, findFirstValidSelector, isElementInteractable, SelectorValidationResult } from './selectorHealing';
import { generateVeroAction } from './veroSyntaxReference';
import { logger } from '../utils/logger';

// Extracted modules
import { RecordingSession, PageObjectEntry, CapturedAction, RGBAColor } from './browserStream.types';
import { playwrightToVeroSelector } from './browserStream.selectorConverter';
import { highlightElement as cdpHighlightElement, highlightAtPoint as cdpHighlightAtPoint, hideHighlight as cdpHideHighlight, enableHoverHighlight as cdpEnableHoverHighlight, highlightWithValidation as cdpHighlightWithValidation } from './browserStream.cdpOverlay';
import { loadPageObjects } from './browserStream.legacyPageObjects';

// The injected browser script for action capture (extracted as a constant for clarity)
const ACTION_CAPTURE_SCRIPT = `
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
`;

export class BrowserStreamService extends EventEmitter {
    private sessions: Map<string, RecordingSession> = new Map();
    private pageObjects: Map<string, PageObjectEntry[]> = new Map();
    private projectPath: string;

    constructor(projectPath: string = process.cwd()) {
        super();
        this.projectPath = projectPath;
    }

    /**
     * Start recording with embedded browser streaming.
     * Uses a SINGLE browser with CDP for both streaming and action capture.
     */
    async startRecording(
        url: string,
        sessionId: string,
        _onFrame: (base64: string) => void,
        onAction: (veroCode: string, pagePath?: string, pageCode?: string, fieldCreated?: { pageName: string; fieldName: string }) => void,
        onError: (error: string) => void,
        scenarioName?: string
    ): Promise<void> {
        try {
            const registry = initPageObjectRegistry(this.projectPath);
            await registry.loadFromDisk();

            // Load existing page objects (legacy support)
            await loadPageObjects(this.projectPath, this.pageObjects);

            const browser = await chromium.launch({
                headless: false,
                args: [
                    '--disable-blink-features=AutomationControlled',
                    '--start-maximized'
                ]
            });

            const context = await browser.newContext({
                viewport: null
            });
            const page = await context.newPage();

            const cdp = await context.newCDPSession(page);

            logger.info('[BrowserStream] Launched headed Chrome browser for recording');

            this.sessions.set(sessionId, {
                sessionId,
                browser,
                context,
                page,
                cdp,
                codegenProcess: null as any,
                outputFile: '',
                lastCodeLength: 0,
                url,
                registry,
                scenarioName,
                stepCount: 0,
                captureScreenshots: false
            });

            await cdp.send('Runtime.enable');
            await cdp.send('DOM.enable');

            await context.addInitScript(ACTION_CAPTURE_SCRIPT);

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

            browser.on('disconnected', () => {
                logger.info(`[BrowserStream] Browser closed for session ${sessionId}`);
                this.sessions.delete(sessionId);
                onError('Browser closed');
            });

            await page.goto(url);

            logger.info(`[BrowserStream] Recording started for session ${sessionId} - Chrome browser opened`);

        } catch (error: any) {
            logger.error('[BrowserStream] Error starting recording:', error);
            onError(error.message);
        }
    }

    /**
     * Process a captured action and convert to Vero DSL with page object support.
     * Uses Playwright's locator ranking algorithm for optimal selectors.
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
        screenshot?: string;
        stepNumber?: number;
    } | null> {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        const stepNumber = session.stepCount++;
        let screenshotDataUrl: string | undefined;

        const registry = session.registry;

        const captureScreenshot = async () => {
            if (!session.captureScreenshots) return undefined;
            try {
                const buffer = await session.page.screenshot({
                    type: 'png',
                    fullPage: false
                });
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

        const bestLocator = getBestLocator(locatorElement);
        if (!bestLocator) {
            logger.debug('[BrowserStream] Could not generate locator for element');
            return null;
        }

        const veroSelector = playwrightToVeroSelector(bestLocator.selector);

        logger.debug(`[BrowserStream] Playwright: ${bestLocator.selector} -> Vero: ${veroSelector}`);

        // Check if this selector already exists in a page object
        let fieldRef = registry.findBySelector(veroSelector);

        if (!fieldRef) {
            fieldRef = registry.findSimilarSelector(action.element);
        }

        let veroCode: string;
        let pagePath: string | undefined;
        let pageCode: string | undefined;
        let fieldCreated: { pageName: string; fieldName: string } | undefined;

        if (fieldRef) {
            veroCode = this.buildVeroActionWithRef(action.type, fieldRef, action.value);
        } else {
            const pageName = registry.suggestPageName(currentUrl);
            const fieldName = registry.generateFieldName(action.element, action.type);

            registry.getOrCreatePage(currentUrl);

            fieldRef = registry.addField(pageName, fieldName, veroSelector);

            pagePath = await registry.persist(pageName);
            pageCode = registry.getPageContent(pageName) || undefined;

            fieldCreated = {
                pageName: fieldRef.pageName,
                fieldName: fieldRef.fieldName
            };

            veroCode = this.buildVeroActionWithRef(action.type, fieldRef, action.value);

            logger.debug(`[BrowserStream] Created field ${fieldRef.pageName}.${fieldRef.fieldName} = ${veroSelector}`);
        }

        screenshotDataUrl = await captureScreenshot();

        return { veroCode, pagePath, pageCode, fieldCreated, screenshot: screenshotDataUrl, stepNumber };
    }

    /**
     * Build Vero action code using page object reference.
     */
    private buildVeroActionWithRef(
        type: string,
        fieldRef: PageFieldRef,
        value?: string
    ): string {
        const ref = `${fieldRef.pageName}.${fieldRef.fieldName}`;
        return generateVeroAction(type, ref, value);
    }

    /**
     * Stop recording and clean up.
     */
    async stopRecording(sessionId: string): Promise<string> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return '';
        }

        session.fileWatcher?.close();

        try {
            await session.cdp.send('Page.stopScreencast');
        } catch (e) {
            // Already stopped
        }

        if (!session.codegenProcess.killed) {
            session.codegenProcess.kill('SIGTERM');
        }

        await new Promise(r => setTimeout(r, 1000));

        let finalCode = '';
        try {
            finalCode = await readFile(session.outputFile, 'utf-8');
        } catch (e) {
            // No code generated
        }

        await session.browser.close();

        this.sessions.delete(sessionId);

        return finalCode;
    }

    /**
     * Check if a session exists.
     */
    hasSession(sessionId: string): boolean {
        return this.sessions.has(sessionId);
    }

    /**
     * Enable or disable screenshot capture for a session.
     */
    setScreenshotCapture(sessionId: string, enabled: boolean): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) return false;
        session.captureScreenshots = enabled;
        logger.info(`[BrowserStream] Screenshot capture ${enabled ? 'enabled' : 'disabled'} for session ${sessionId}`);
        return true;
    }

    /**
     * Take an on-demand screenshot for reporting.
     */
    async takeScreenshot(sessionId: string): Promise<string | null> {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        try {
            const buffer = await session.page.screenshot({
                type: 'png',
                fullPage: false
            });
            await screenshotService.saveStepScreenshot(
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
     * Validate a selector against the live page.
     */
    async validateSelector(sessionId: string, selector: string): Promise<SelectorValidationResult | null> {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        return validateSelector(session.page, selector);
    }

    /**
     * Validate multiple selectors and find the first valid one.
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
     * Check if an element is interactable (visible and enabled).
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
     * Dispatch mouse click to browser via Playwright's mouse API.
     * Returns detailed info about the click for debugging.
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

            try {
                await session.page.waitForLoadState('domcontentloaded', { timeout: 2000 });
            } catch (e) {
                // No navigation happened, that's fine
            }

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
     * Legacy dispatchClick for backwards compatibility.
     */
    async dispatchClick(sessionId: string, x: number, y: number): Promise<boolean> {
        const result = await this.dispatchClickWithInfo(sessionId, x, y);
        return result.success;
    }

    /**
     * Dispatch mouse move to browser via Playwright's mouse API.
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
     * Dispatch keyboard input to browser via Playwright's keyboard API.
     */
    async dispatchKeyboard(sessionId: string, text: string, key?: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        try {
            const specialKeys = ['Backspace', 'Tab', 'Enter', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Delete'];

            if (key && specialKeys.includes(key)) {
                await session.page.keyboard.press(key);
                return;
            }

            if (text && text.length > 0) {
                await session.page.keyboard.type(text);
            }
        } catch (error) {
            logger.error(`[BrowserStream] Error dispatching keyboard:`, error);
        }
    }

    /**
     * Dispatch scroll to browser via Playwright's mouse API.
     */
    async dispatchScroll(sessionId: string, x: number, y: number, deltaX: number, deltaY: number): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        try {
            await session.page.mouse.move(x, y);
            await session.page.mouse.wheel(deltaX, deltaY);
        } catch (error) {
            // Ignore scroll errors
        }
    }

    /**
     * Process an action from the iframe proxy (without requiring a browser session).
     * Used when embedding websites via the proxy approach.
     */
    async processIframeAction(
        action: CapturedAction,
        currentUrl: string,
        _scenarioName?: string,
        sandboxPath?: string
    ): Promise<{
        veroCode: string;
        pagePath?: string;
        pageCode?: string;
        fieldCreated?: { pageName: string; fieldName: string };
    } | null> {
        const projectPath = sandboxPath || this.projectPath;
        logger.debug(`[BrowserStream] processIframeAction using projectPath: ${projectPath}`);
        const registry = initPageObjectRegistry(projectPath);
        await registry.loadFromDisk();

        if (action.type === 'keypress' && action.key) {
            return { veroCode: generateVeroAction('press', undefined, action.key) };
        }

        if (!action.element) return null;

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

        const bestLocator = getBestLocator(locatorElement);
        if (!bestLocator) {
            logger.debug('[BrowserStream] Could not generate locator for iframe element');
            return null;
        }

        const veroSelector = playwrightToVeroSelector(bestLocator.selector);

        logger.debug(`[BrowserStream] Iframe action - Playwright: ${bestLocator.selector} -> Vero: ${veroSelector}`);

        let fieldRef = registry.findBySelector(veroSelector);

        if (!fieldRef) {
            fieldRef = registry.findSimilarSelector(action.element);
        }

        let veroCode: string;
        let pagePath: string | undefined;
        let pageCode: string | undefined;
        let fieldCreated: { pageName: string; fieldName: string } | undefined;

        if (fieldRef) {
            veroCode = this.buildVeroActionWithRef(action.type, fieldRef, action.value);
        } else {
            const pageName = registry.suggestPageName(currentUrl);
            const fieldName = registry.generateFieldName(action.element, action.type);

            registry.getOrCreatePage(currentUrl);

            fieldRef = registry.addField(pageName, fieldName, veroSelector);

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
     * Create an iframe proxy session (no browser, just for action processing).
     */
    createIframeSession(sessionId: string, url: string, _scenarioName?: string): void {
        initPageObjectRegistry(this.projectPath);
        logger.info(`[BrowserStream] Created iframe session: ${sessionId} for URL: ${url}`);
    }

    // --- CDP Overlay methods (delegated to extracted module) ---

    async highlightElement(
        sessionId: string,
        selector: string,
        options: {
            color?: RGBAColor;
            borderColor?: RGBAColor;
            showInfo?: boolean;
            durationMs?: number;
        } = {}
    ): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (!session) return false;
        return cdpHighlightElement(session, selector, options);
    }

    async highlightAtPoint(
        sessionId: string,
        x: number,
        y: number,
        options: {
            color?: RGBAColor;
            borderColor?: RGBAColor;
            durationMs?: number;
        } = {}
    ): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (!session) return false;
        return cdpHighlightAtPoint(session, x, y, options);
    }

    async hideHighlight(sessionId: string): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (!session) return false;
        return cdpHideHighlight(session);
    }

    async enableHoverHighlight(sessionId: string, enabled: boolean = true): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (!session) return false;
        return cdpEnableHoverHighlight(session, enabled);
    }

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
        return cdpHighlightWithValidation(session, selector, durationMs);
    }

    /**
     * Get or create page object registry.
     */
    getRegistry(): PageObjectRegistry {
        return initPageObjectRegistry(this.projectPath);
    }
}

export const browserStreamService = new BrowserStreamService(
    process.env.VERO_PROJECT_PATH || join(process.cwd(), '..', 'vero-lang', 'test-project')
);
