/**
 * Playwright Client Interface
 *
 * Abstraction over Playwright operations to support both:
 * 1. Direct Playwright usage (recommended)
 * 2. MCP subprocess mode (future)
 */

import type { Page, Locator, BrowserContext } from 'playwright';
import type { ResolvedSelector } from './Skill';

/** Result of a Playwright action */
export interface PlaywrightActionResult {
  success: boolean;
  error?: string;
  durationMs: number;
  screenshotPath?: string;
}

/** Element information from the page */
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
  isVisible: boolean;
  isEnabled: boolean;
  isEditable: boolean;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/** Options for click action */
export interface ClickOptions {
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  delay?: number;
  force?: boolean;
  modifiers?: ('Alt' | 'Control' | 'Meta' | 'Shift')[];
  position?: { x: number; y: number };
  timeout?: number;
}

/** Options for fill action */
export interface FillOptions {
  force?: boolean;
  timeout?: number;
}

/** Options for select action */
export interface SelectOptions {
  timeout?: number;
}

/** Options for screenshot */
export interface ScreenshotOptions {
  path?: string;
  fullPage?: boolean;
  type?: 'png' | 'jpeg';
  quality?: number;
}

/**
 * Playwright Client Interface
 *
 * Abstracts Playwright operations for testability and future MCP support.
 */
export interface PlaywrightClient {
  /** Get the underlying Playwright page */
  getPage(): Page;

  /** Get the browser context */
  getContext(): BrowserContext;

  // Navigation

  /** Navigate to a URL */
  goto(url: string, options?: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }): Promise<PlaywrightActionResult>;

  /** Go back in history */
  goBack(options?: { timeout?: number }): Promise<PlaywrightActionResult>;

  /** Go forward in history */
  goForward(options?: { timeout?: number }): Promise<PlaywrightActionResult>;

  /** Reload the page */
  reload(options?: { timeout?: number }): Promise<PlaywrightActionResult>;

  /** Get current URL */
  url(): string;

  // Element Actions

  /** Click an element */
  click(selector: ResolvedSelector | string, options?: ClickOptions): Promise<PlaywrightActionResult>;

  /** Double-click an element */
  dblclick(selector: ResolvedSelector | string, options?: ClickOptions): Promise<PlaywrightActionResult>;

  /** Fill an input field */
  fill(selector: ResolvedSelector | string, value: string, options?: FillOptions): Promise<PlaywrightActionResult>;

  /** Clear an input field */
  clear(selector: ResolvedSelector | string, options?: FillOptions): Promise<PlaywrightActionResult>;

  /** Select an option from a dropdown */
  selectOption(selector: ResolvedSelector | string, value: string | string[], options?: SelectOptions): Promise<PlaywrightActionResult>;

  /** Check a checkbox */
  check(selector: ResolvedSelector | string, options?: { timeout?: number }): Promise<PlaywrightActionResult>;

  /** Uncheck a checkbox */
  uncheck(selector: ResolvedSelector | string, options?: { timeout?: number }): Promise<PlaywrightActionResult>;

  /** Hover over an element */
  hover(selector: ResolvedSelector | string, options?: { timeout?: number }): Promise<PlaywrightActionResult>;

  /** Press a key */
  press(selector: ResolvedSelector | string, key: string, options?: { timeout?: number }): Promise<PlaywrightActionResult>;

  /** Type text with delays between keystrokes */
  type(selector: ResolvedSelector | string, text: string, options?: { delay?: number; timeout?: number }): Promise<PlaywrightActionResult>;

  // Element Queries

  /** Get a locator for a selector */
  locator(selector: ResolvedSelector | string): Locator;

  /** Get element info */
  getElementInfo(selector: ResolvedSelector | string): Promise<ElementInfo | null>;

  /** Check if element exists */
  elementExists(selector: ResolvedSelector | string): Promise<boolean>;

  /** Check if element is visible */
  isVisible(selector: ResolvedSelector | string): Promise<boolean>;

  /** Check if element is enabled */
  isEnabled(selector: ResolvedSelector | string): Promise<boolean>;

  /** Get element text content */
  textContent(selector: ResolvedSelector | string): Promise<string | null>;

  /** Get element attribute */
  getAttribute(selector: ResolvedSelector | string, attribute: string): Promise<string | null>;

  /** Get input value */
  inputValue(selector: ResolvedSelector | string): Promise<string>;

  // Waiting

  /** Wait for an element to be visible */
  waitForSelector(selector: ResolvedSelector | string, options?: { state?: 'visible' | 'hidden' | 'attached' | 'detached'; timeout?: number }): Promise<PlaywrightActionResult>;

  /** Wait for navigation */
  waitForNavigation(options?: { url?: string | RegExp; timeout?: number }): Promise<PlaywrightActionResult>;

  /** Wait for network idle */
  waitForLoadState(state?: 'load' | 'domcontentloaded' | 'networkidle', options?: { timeout?: number }): Promise<PlaywrightActionResult>;

  /** Wait for a specified time */
  waitForTimeout(timeout: number): Promise<void>;

  // Screenshots & Debugging

  /** Take a screenshot */
  screenshot(options?: ScreenshotOptions): Promise<Buffer>;

  /** Take a screenshot of an element */
  screenshotElement(selector: ResolvedSelector | string, options?: ScreenshotOptions): Promise<Buffer>;

  /** Evaluate JavaScript in the page */
  evaluate<T>(script: string | ((...args: unknown[]) => T), ...args: unknown[]): Promise<T>;

  // Frame handling

  /** Get a frame by name or URL */
  frame(nameOrUrl: string): PlaywrightClient | null;

  /** Get all frames */
  frames(): PlaywrightClient[];
}

/** Convert a ResolvedSelector or string to a locator string */
export function toLocatorString(selector: ResolvedSelector | string): string {
  if (typeof selector === 'string') {
    return selector;
  }

  // Convert based on selector type
  switch (selector.type) {
    case 'testId':
      return `[data-testid="${selector.selector}"]`;
    case 'role':
      // Assume format like "button:Submit" or just "button"
      if (selector.selector.includes(':')) {
        const [role, name] = selector.selector.split(':');
        return `role=${role}[name="${name}"]`;
      }
      return `role=${selector.selector}`;
    case 'label':
      return `label=${selector.selector}`;
    case 'placeholder':
      return `[placeholder="${selector.selector}"]`;
    case 'text':
      return `text=${selector.selector}`;
    case 'css':
    case 'xpath':
    default:
      return selector.selector;
  }
}
