/**
 * Locator Builder
 * Utility to build Playwright locators from node configuration
 */

import { Page, Locator, FrameLocator } from 'playwright';
import { FlowNodeData } from '@playwright-web-app/shared';
import { VariableContext } from '../variableContext';

export interface LocatorConfig {
    locatorStrategy: string;
    selector?: string;
    text?: string;
    role?: string;
    testId?: string;
    placeholder?: string;
    ariaLabel?: string;
    altText?: string;
    title?: string;
    name?: string;
    exact?: boolean;
    hasText?: string;
    hasNotText?: string;
    nth?: number;
    first?: boolean;
    last?: boolean;
    filter?: {
        hasText?: string;
        hasNotText?: string;
        has?: LocatorConfig;
        hasNot?: LocatorConfig;
    };
    // Frame support
    frameSelector?: string;
    // Chaining
    chain?: LocatorConfig[];
}

export type LocatorStrategy =
    | 'role'
    | 'text'
    | 'testId'
    | 'label'
    | 'placeholder'
    | 'altText'
    | 'title'
    | 'css'
    | 'xpath'
    | 'id'
    | 'name'
    | 'custom';

/**
 * Build a Playwright locator from configuration
 */
export function buildLocator(
    page: Page,
    config: FlowNodeData | LocatorConfig,
    variables: VariableContext
): Locator {
    const resolvedConfig = resolveLocatorConfig(config, variables);
    let locator = createBaseLocator(page, resolvedConfig);

    // Apply filters
    if (resolvedConfig.filter) {
        locator = applyFilter(locator, resolvedConfig.filter, variables);
    }

    // Apply nth/first/last
    if (resolvedConfig.first) {
        locator = locator.first();
    } else if (resolvedConfig.last) {
        locator = locator.last();
    } else if (resolvedConfig.nth !== undefined) {
        locator = locator.nth(resolvedConfig.nth);
    }

    return locator;
}

/**
 * Build a locator within a frame
 */
export function buildFrameLocator(
    page: Page,
    frameSelector: string,
    config: FlowNodeData | LocatorConfig,
    variables: VariableContext
): Locator {
    const frame = page.frameLocator(variables.resolve(frameSelector));
    const resolvedConfig = resolveLocatorConfig(config, variables);

    return createBaseLocatorInFrame(frame, resolvedConfig);
}

/**
 * Resolve variable placeholders in locator config
 */
function resolveLocatorConfig(
    config: FlowNodeData | LocatorConfig,
    variables: VariableContext
): LocatorConfig {
    const resolved: LocatorConfig = {
        locatorStrategy: config.locatorStrategy || 'css',
        selector: config.selector ? variables.resolve(config.selector) : undefined,
        text: config.text ? variables.resolve(config.text) : undefined,
        role: config.role,
        testId: config.testId ? variables.resolve(config.testId) : undefined,
        placeholder: config.placeholder ? variables.resolve(config.placeholder) : undefined,
        ariaLabel: config.ariaLabel ? variables.resolve(config.ariaLabel) : undefined,
        altText: config.altText ? variables.resolve(config.altText) : undefined,
        title: config.title ? variables.resolve(config.title) : undefined,
        name: config.name ? variables.resolve(config.name) : undefined,
        exact: config.exact,
        hasText: config.hasText ? variables.resolve(config.hasText) : undefined,
        hasNotText: config.hasNotText ? variables.resolve(config.hasNotText) : undefined,
        nth: config.nth,
        first: config.first,
        last: config.last,
    };

    return resolved;
}

/**
 * Create base locator from strategy
 */
function createBaseLocator(page: Page, config: LocatorConfig): Locator {
    const strategy = config.locatorStrategy as LocatorStrategy;

    switch (strategy) {
        case 'role':
            return createRoleLocator(page, config);

        case 'text':
            return page.getByText(config.text || '', { exact: config.exact });

        case 'testId':
            return page.getByTestId(config.testId || config.selector || '');

        case 'label':
            return page.getByLabel(config.ariaLabel || config.text || '', { exact: config.exact });

        case 'placeholder':
            return page.getByPlaceholder(config.placeholder || '', { exact: config.exact });

        case 'altText':
            return page.getByAltText(config.altText || '', { exact: config.exact });

        case 'title':
            return page.getByTitle(config.title || '', { exact: config.exact });

        case 'css':
            return page.locator(config.selector || '');

        case 'xpath':
            return page.locator(`xpath=${config.selector}`);

        case 'id':
            return page.locator(`#${config.selector}`);

        case 'name':
            return page.locator(`[name="${config.name || config.selector}"]`);

        case 'custom':
            // Custom allows any Playwright locator string
            return page.locator(config.selector || '');

        default:
            // Default to CSS selector
            return page.locator(config.selector || '');
    }
}

/**
 * Create role-based locator with options
 */
function createRoleLocator(page: Page, config: LocatorConfig): Locator {
    const role = config.role as any;
    const options: any = {};

    if (config.name) {
        options.name = config.name;
    }
    if (config.ariaLabel) {
        options.name = config.ariaLabel;
    }
    if (config.exact !== undefined) {
        options.exact = config.exact;
    }

    return page.getByRole(role, Object.keys(options).length > 0 ? options : undefined);
}

/**
 * Create base locator within a frame
 */
function createBaseLocatorInFrame(frame: FrameLocator, config: LocatorConfig): Locator {
    const strategy = config.locatorStrategy as LocatorStrategy;

    switch (strategy) {
        case 'role':
            const role = config.role as any;
            const options: any = {};
            if (config.name) options.name = config.name;
            if (config.ariaLabel) options.name = config.ariaLabel;
            if (config.exact !== undefined) options.exact = config.exact;
            return frame.getByRole(role, Object.keys(options).length > 0 ? options : undefined);

        case 'text':
            return frame.getByText(config.text || '', { exact: config.exact });

        case 'testId':
            return frame.getByTestId(config.testId || config.selector || '');

        case 'label':
            return frame.getByLabel(config.ariaLabel || config.text || '', { exact: config.exact });

        case 'placeholder':
            return frame.getByPlaceholder(config.placeholder || '', { exact: config.exact });

        default:
            return frame.locator(config.selector || '');
    }
}

/**
 * Apply filter to locator
 */
function applyFilter(
    locator: Locator,
    filter: LocatorConfig['filter'],
    variables: VariableContext
): Locator {
    if (!filter) return locator;

    const filterOptions: any = {};

    if (filter.hasText) {
        filterOptions.hasText = variables.resolve(filter.hasText);
    }
    if (filter.hasNotText) {
        filterOptions.hasNotText = variables.resolve(filter.hasNotText);
    }

    return locator.filter(filterOptions);
}

/**
 * Get locator description for logging
 */
export function getLocatorDescription(config: FlowNodeData | LocatorConfig): string {
    const strategy = config.locatorStrategy || 'css';

    switch (strategy) {
        case 'role':
            return `role=${config.role}${config.name ? `[name="${config.name}"]` : ''}`;
        case 'text':
            return `text="${config.text}"`;
        case 'testId':
            return `testId="${config.testId}"`;
        case 'label':
            return `label="${config.ariaLabel || config.text}"`;
        case 'placeholder':
            return `placeholder="${config.placeholder}"`;
        case 'altText':
            return `altText="${config.altText}"`;
        case 'title':
            return `title="${config.title}"`;
        case 'css':
        case 'xpath':
        case 'id':
        case 'name':
        default:
            return config.selector || 'unknown';
    }
}

/**
 * Wait for locator with configurable timeout
 */
export async function waitForLocator(
    locator: Locator,
    state: 'attached' | 'detached' | 'visible' | 'hidden' = 'visible',
    timeout: number = 30000
): Promise<void> {
    await locator.waitFor({ state, timeout });
}

/**
 * Check if element exists
 */
export async function elementExists(
    locator: Locator,
    timeout: number = 5000
): Promise<boolean> {
    try {
        await locator.waitFor({ state: 'attached', timeout });
        return true;
    } catch {
        return false;
    }
}

/**
 * Highlight element for debugging/screenshots
 */
export async function highlightElement(
    locator: Locator,
    duration: number = 500
): Promise<void> {
    try {
        await locator.evaluate((el: any) => {
            el.style.outline = '4px solid #ef4444';
            el.style.outlineOffset = '2px';
        });

        await new Promise(resolve => setTimeout(resolve, duration));

        await locator.evaluate((el: any) => {
            el.style.outline = '';
            el.style.outlineOffset = '';
        });
    } catch {
        // Ignore highlight errors
    }
}
