/**
 * Locator Builder
 * Converts locator configuration to Playwright locator code strings
 */

/**
 * Build a Playwright locator code string from configuration
 */
export function buildLocatorCode(config: Record<string, any>, pageVar = 'page'): string {
    const { locatorStrategy, selector, hasText, nth, role, name, text } = config;

    let locator: string;

    switch (locatorStrategy) {
        case 'css':
            locator = `${pageVar}.locator('${escapeString(selector)}')`;
            break;
        case 'xpath':
            locator = `${pageVar}.locator('xpath=${escapeString(selector)}')`;
            break;
        case 'text':
            locator = `${pageVar}.getByText('${escapeString(text || selector)}')`;
            break;
        case 'text-exact':
            locator = `${pageVar}.getByText('${escapeString(text || selector)}', { exact: true })`;
            break;
        case 'role':
            const roleName = name ? `, { name: '${escapeString(name)}' }` : '';
            locator = `${pageVar}.getByRole('${role || selector}'${roleName})`;
            break;
        case 'test-id':
            locator = `${pageVar}.getByTestId('${escapeString(config.testId || selector)}')`;
            break;
        case 'label':
            locator = `${pageVar}.getByLabel('${escapeString(config.label || selector)}')`;
            break;
        case 'placeholder':
            locator = `${pageVar}.getByPlaceholder('${escapeString(config.placeholder || selector)}')`;
            break;
        case 'alt-text':
            locator = `${pageVar}.getByAltText('${escapeString(config.altText || selector)}')`;
            break;
        case 'title':
            locator = `${pageVar}.getByTitle('${escapeString(config.title || selector)}')`;
            break;
        default:
            // Default to CSS selector
            locator = `${pageVar}.locator('${escapeString(selector || '')}')`;
    }

    // Apply filters
    if (hasText) {
        locator = `${locator}.filter({ hasText: '${escapeString(hasText)}' })`;
    }
    if (nth !== undefined && nth > 0) {
        locator = `${locator}.nth(${nth})`;
    }

    return locator;
}

/**
 * Generate a human-readable locator name for POM properties
 */
export function generateLocatorName(config: Record<string, any>): string {
    const { locatorStrategy, selector, role, name, testId, label, placeholder } = config;

    let baseName = '';

    switch (locatorStrategy) {
        case 'role':
            baseName = name || role || 'element';
            break;
        case 'test-id':
            baseName = testId || selector || 'element';
            break;
        case 'label':
            baseName = label || selector || 'element';
            break;
        case 'placeholder':
            baseName = placeholder || selector || 'input';
            break;
        case 'css':
        case 'xpath':
        default:
            // Try to extract meaningful name from selector
            baseName = extractNameFromSelector(selector || '') || 'element';
    }

    // Convert to camelCase
    return toCamelCase(baseName);
}

/**
 * Extract a meaningful name from a CSS/XPath selector
 */
function extractNameFromSelector(selector: string): string {
    // Try common patterns

    // data-testid="something"
    const testIdMatch = selector.match(/data-testid=["']([^"']+)["']/);
    if (testIdMatch) return testIdMatch[1];

    // id="something"
    const idMatch = selector.match(/id=["']([^"']+)["']/);
    if (idMatch) return idMatch[1];

    // #id
    const hashMatch = selector.match(/#([a-zA-Z][a-zA-Z0-9_-]*)/);
    if (hashMatch) return hashMatch[1];

    // .class-name (take first class)
    const classMatch = selector.match(/\.([a-zA-Z][a-zA-Z0-9_-]*)/);
    if (classMatch) return classMatch[1];

    // [name="something"]
    const nameMatch = selector.match(/name=["']([^"']+)["']/);
    if (nameMatch) return nameMatch[1];

    // Just take alphanumeric chars
    const alphaMatch = selector.match(/[a-zA-Z][a-zA-Z0-9]*/);
    if (alphaMatch) return alphaMatch[0];

    return 'element';
}

/**
 * Convert a string to camelCase
 */
function toCamelCase(str: string): string {
    return str
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
        .replace(/^[A-Z]/, char => char.toLowerCase())
        .replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Escape special characters in strings for code generation
 */
export function escapeString(str: string): string {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
}

/**
 * Build click options code string
 */
export function buildClickOptions(config: Record<string, any>): string {
    const opts: string[] = [];

    const { button, clickCount, delay, force, modifiers, timeout, position } = config;

    if (button && button !== 'left') opts.push(`button: '${button}'`);
    if (clickCount && clickCount > 1) opts.push(`clickCount: ${clickCount}`);
    if (delay) opts.push(`delay: ${delay}`);
    if (force) opts.push(`force: true`);
    if (modifiers) opts.push(`modifiers: ['${modifiers}']`);
    if (timeout) opts.push(`timeout: ${timeout}`);
    if (position?.x !== undefined && position?.y !== undefined) {
        opts.push(`position: { x: ${position.x}, y: ${position.y} }`);
    }

    return opts.length ? `{ ${opts.join(', ')} }` : '';
}

/**
 * Build common options for actions (timeout, force, etc.)
 */
export function buildCommonOptions(config: Record<string, any>): string {
    const opts: string[] = [];

    if (config.force) opts.push(`force: true`);
    if (config.timeout) opts.push(`timeout: ${config.timeout}`);
    if (config.noWaitAfter) opts.push(`noWaitAfter: true`);

    return opts.length ? `{ ${opts.join(', ')} }` : '';
}
