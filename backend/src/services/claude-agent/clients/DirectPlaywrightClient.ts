/**
 * Direct Playwright Client
 *
 * Implements PlaywrightClient interface with direct Playwright calls.
 * This is the recommended mode for local execution.
 */

import type { Page, Locator, BrowserContext } from 'playwright';
import type { PlaywrightClient, PlaywrightActionResult, ElementInfo, ClickOptions, FillOptions, SelectOptions, ScreenshotOptions } from '../interfaces/PlaywrightClient';
import { toLocatorString } from '../interfaces/PlaywrightClient';
import type { ResolvedSelector } from '../interfaces/Skill';

/**
 * Direct implementation of PlaywrightClient using Playwright APIs.
 */
export class DirectPlaywrightClient implements PlaywrightClient {
  constructor(
    private page: Page,
    private context: BrowserContext
  ) {}

  getPage(): Page {
    return this.page;
  }

  getContext(): BrowserContext {
    return this.context;
  }

  // Navigation

  async goto(
    url: string,
    options?: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }
  ): Promise<PlaywrightActionResult> {
    const start = Date.now();
    try {
      await this.page.goto(url, options);
      return { success: true, durationMs: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }

  async goBack(options?: { timeout?: number }): Promise<PlaywrightActionResult> {
    const start = Date.now();
    try {
      await this.page.goBack(options);
      return { success: true, durationMs: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }

  async goForward(options?: { timeout?: number }): Promise<PlaywrightActionResult> {
    const start = Date.now();
    try {
      await this.page.goForward(options);
      return { success: true, durationMs: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }

  async reload(options?: { timeout?: number }): Promise<PlaywrightActionResult> {
    const start = Date.now();
    try {
      await this.page.reload(options);
      return { success: true, durationMs: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }

  url(): string {
    return this.page.url();
  }

  // Element Actions

  async click(
    selector: ResolvedSelector | string,
    options?: ClickOptions
  ): Promise<PlaywrightActionResult> {
    const start = Date.now();
    try {
      const locatorStr = toLocatorString(selector);
      await this.page.locator(locatorStr).click(options);
      return { success: true, durationMs: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }

  async dblclick(
    selector: ResolvedSelector | string,
    options?: ClickOptions
  ): Promise<PlaywrightActionResult> {
    const start = Date.now();
    try {
      const locatorStr = toLocatorString(selector);
      await this.page.locator(locatorStr).dblclick(options);
      return { success: true, durationMs: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }

  async fill(
    selector: ResolvedSelector | string,
    value: string,
    options?: FillOptions
  ): Promise<PlaywrightActionResult> {
    const start = Date.now();
    try {
      const locatorStr = toLocatorString(selector);
      await this.page.locator(locatorStr).fill(value, options);
      return { success: true, durationMs: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }

  async clear(
    selector: ResolvedSelector | string,
    options?: FillOptions
  ): Promise<PlaywrightActionResult> {
    const start = Date.now();
    try {
      const locatorStr = toLocatorString(selector);
      await this.page.locator(locatorStr).clear(options);
      return { success: true, durationMs: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }

  async selectOption(
    selector: ResolvedSelector | string,
    value: string | string[],
    options?: SelectOptions
  ): Promise<PlaywrightActionResult> {
    const start = Date.now();
    try {
      const locatorStr = toLocatorString(selector);
      await this.page.locator(locatorStr).selectOption(value, options);
      return { success: true, durationMs: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }

  async check(
    selector: ResolvedSelector | string,
    options?: { timeout?: number }
  ): Promise<PlaywrightActionResult> {
    const start = Date.now();
    try {
      const locatorStr = toLocatorString(selector);
      await this.page.locator(locatorStr).check(options);
      return { success: true, durationMs: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }

  async uncheck(
    selector: ResolvedSelector | string,
    options?: { timeout?: number }
  ): Promise<PlaywrightActionResult> {
    const start = Date.now();
    try {
      const locatorStr = toLocatorString(selector);
      await this.page.locator(locatorStr).uncheck(options);
      return { success: true, durationMs: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }

  async hover(
    selector: ResolvedSelector | string,
    options?: { timeout?: number }
  ): Promise<PlaywrightActionResult> {
    const start = Date.now();
    try {
      const locatorStr = toLocatorString(selector);
      await this.page.locator(locatorStr).hover(options);
      return { success: true, durationMs: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }

  async press(
    selector: ResolvedSelector | string,
    key: string,
    options?: { timeout?: number }
  ): Promise<PlaywrightActionResult> {
    const start = Date.now();
    try {
      const locatorStr = toLocatorString(selector);
      await this.page.locator(locatorStr).press(key, options);
      return { success: true, durationMs: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }

  async type(
    selector: ResolvedSelector | string,
    text: string,
    options?: { delay?: number; timeout?: number }
  ): Promise<PlaywrightActionResult> {
    const start = Date.now();
    try {
      const locatorStr = toLocatorString(selector);
      await this.page.locator(locatorStr).pressSequentially(text, { delay: options?.delay });
      return { success: true, durationMs: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }

  // Element Queries

  locator(selector: ResolvedSelector | string): Locator {
    const locatorStr = toLocatorString(selector);
    return this.page.locator(locatorStr);
  }

  async getElementInfo(selector: ResolvedSelector | string): Promise<ElementInfo | null> {
    try {
      const locatorStr = toLocatorString(selector);
      const loc = this.page.locator(locatorStr).first();

      const exists = (await loc.count()) > 0;
      if (!exists) return null;

      const [tagName, isVisible, isEnabled, isEditable, boundingBox, text] = await Promise.all([
        loc.evaluate((el) => el.tagName.toLowerCase()),
        loc.isVisible(),
        loc.isEnabled(),
        loc.isEditable(),
        loc.boundingBox(),
        loc.textContent(),
      ]);

      const attributes = await loc.evaluate((el) => ({
        role: el.getAttribute('role'),
        testId: el.getAttribute('data-testid'),
        ariaLabel: el.getAttribute('aria-label'),
        placeholder: el.getAttribute('placeholder'),
        id: el.id,
        name: el.getAttribute('name'),
        className: el.className,
        inputType: (el as HTMLInputElement).type || undefined,
        href: (el as HTMLAnchorElement).href || undefined,
      }));

      return {
        tagName,
        role: attributes.role || undefined,
        testId: attributes.testId || undefined,
        ariaLabel: attributes.ariaLabel || undefined,
        placeholder: attributes.placeholder || undefined,
        id: attributes.id || undefined,
        name: attributes.name || undefined,
        className: attributes.className || undefined,
        inputType: attributes.inputType,
        href: attributes.href,
        text: text || undefined,
        isVisible,
        isEnabled,
        isEditable,
        boundingBox: boundingBox || undefined,
      };
    } catch {
      return null;
    }
  }

  async elementExists(selector: ResolvedSelector | string): Promise<boolean> {
    const locatorStr = toLocatorString(selector);
    return (await this.page.locator(locatorStr).count()) > 0;
  }

  async isVisible(selector: ResolvedSelector | string): Promise<boolean> {
    try {
      const locatorStr = toLocatorString(selector);
      return await this.page.locator(locatorStr).first().isVisible();
    } catch {
      return false;
    }
  }

  async isEnabled(selector: ResolvedSelector | string): Promise<boolean> {
    try {
      const locatorStr = toLocatorString(selector);
      return await this.page.locator(locatorStr).first().isEnabled();
    } catch {
      return false;
    }
  }

  async textContent(selector: ResolvedSelector | string): Promise<string | null> {
    const locatorStr = toLocatorString(selector);
    return await this.page.locator(locatorStr).first().textContent();
  }

  async getAttribute(selector: ResolvedSelector | string, attribute: string): Promise<string | null> {
    const locatorStr = toLocatorString(selector);
    return await this.page.locator(locatorStr).first().getAttribute(attribute);
  }

  async inputValue(selector: ResolvedSelector | string): Promise<string> {
    const locatorStr = toLocatorString(selector);
    return await this.page.locator(locatorStr).first().inputValue();
  }

  // Waiting

  async waitForSelector(
    selector: ResolvedSelector | string,
    options?: { state?: 'visible' | 'hidden' | 'attached' | 'detached'; timeout?: number }
  ): Promise<PlaywrightActionResult> {
    const start = Date.now();
    try {
      const locatorStr = toLocatorString(selector);
      await this.page.locator(locatorStr).waitFor(options);
      return { success: true, durationMs: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }

  async waitForNavigation(
    options?: { url?: string | RegExp; timeout?: number }
  ): Promise<PlaywrightActionResult> {
    const start = Date.now();
    try {
      await this.page.waitForURL(options?.url || /.*/, { timeout: options?.timeout });
      return { success: true, durationMs: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }

  async waitForLoadState(
    state?: 'load' | 'domcontentloaded' | 'networkidle',
    options?: { timeout?: number }
  ): Promise<PlaywrightActionResult> {
    const start = Date.now();
    try {
      await this.page.waitForLoadState(state, options);
      return { success: true, durationMs: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }

  async waitForTimeout(timeout: number): Promise<void> {
    await this.page.waitForTimeout(timeout);
  }

  // Screenshots & Debugging

  async screenshot(options?: ScreenshotOptions): Promise<Buffer> {
    return await this.page.screenshot(options);
  }

  async screenshotElement(
    selector: ResolvedSelector | string,
    options?: ScreenshotOptions
  ): Promise<Buffer> {
    const locatorStr = toLocatorString(selector);
    return await this.page.locator(locatorStr).first().screenshot(options);
  }

  async evaluate<T>(
    script: string | ((...args: unknown[]) => T),
    ...args: unknown[]
  ): Promise<T> {
    return await this.page.evaluate(script as any, ...args);
  }

  // Frame handling

  frame(nameOrUrl: string): PlaywrightClient | null {
    const frame = this.page.frame(nameOrUrl);
    if (!frame) return null;
    // Create a pseudo-client for the frame
    // Note: This is a simplified implementation
    return new DirectPlaywrightClient(frame as unknown as Page, this.context);
  }

  frames(): PlaywrightClient[] {
    return this.page.frames().map(
      (f) => new DirectPlaywrightClient(f as unknown as Page, this.context)
    );
  }
}
