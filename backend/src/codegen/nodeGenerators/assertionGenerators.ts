/**
 * Assertion Node Generators
 * Generate Playwright expect() assertions
 */

import type { FlowNode, GeneratorContext, NodeGenerator } from '@playwright-web-app/shared';
import { buildLocatorCode } from '../locatorBuilder';
import { interpolateVariables } from '../variableInterpolation';

/**
 * Assert Visible
 * { type: "assert-visible", data: { locatorStrategy: "text", selector: "Welcome" } }
 * → await expect(page.getByText('Welcome')).toBeVisible();
 */
export class AssertVisibleGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const not = node.data.not ? '.not' : '';

        const opts: string[] = [];
        if (node.data.timeout) opts.push(`timeout: ${node.data.timeout}`);
        const optsCode = opts.length ? `{ ${opts.join(', ')} }` : '';

        return [`await expect(${locator})${not}.toBeVisible(${optsCode});`];
    }
}

/**
 * Assert Hidden
 * { type: "assert-hidden", data: { locatorStrategy: "css", selector: ".loading" } }
 * → await expect(page.locator('.loading')).toBeHidden();
 */
export class AssertHiddenGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);

        const opts: string[] = [];
        if (node.data.timeout) opts.push(`timeout: ${node.data.timeout}`);
        const optsCode = opts.length ? `{ ${opts.join(', ')} }` : '';

        return [`await expect(${locator}).toBeHidden(${optsCode});`];
    }
}

/**
 * Assert Text
 * { type: "assert-text", data: { locatorStrategy: "css", selector: "h1", matchType: "contains", expectedText: "Welcome" } }
 * → await expect(page.locator('h1')).toContainText('Welcome');
 */
export class AssertTextGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const { matchType, expectedText, ignoreCase, not, timeout } = node.data;
        const notStr = not ? '.not' : '';
        const text = interpolateVariables(expectedText || '', ctx);

        const opts: string[] = [];
        if (ignoreCase) opts.push('ignoreCase: true');
        if (timeout) opts.push(`timeout: ${timeout}`);
        const optsCode = opts.length ? `, { ${opts.join(', ')} }` : '';

        let assertion: string;
        switch (matchType) {
            case 'exact':
                assertion = `toHaveText(${text}${optsCode})`;
                break;
            case 'regex':
                // For regex, we need to convert the string to a RegExp
                const flags = ignoreCase ? 'i' : '';
                assertion = `toHaveText(/${expectedText}/${flags}${timeout ? `, { timeout: ${timeout} }` : ''})`;
                break;
            case 'contains':
            default:
                assertion = `toContainText(${text}${optsCode})`;
                break;
        }

        return [`await expect(${locator})${notStr}.${assertion};`];
    }
}

/**
 * Assert Value
 * { type: "assert-value", data: { locatorStrategy: "css", selector: "#email", expectedValue: "test@test.com" } }
 * → await expect(page.locator('#email')).toHaveValue('test@test.com');
 */
export class AssertValueGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const { expectedValue, not, timeout } = node.data;
        const notStr = not ? '.not' : '';
        const value = interpolateVariables(expectedValue || '', ctx);

        const opts: string[] = [];
        if (timeout) opts.push(`timeout: ${timeout}`);
        const optsCode = opts.length ? `, { ${opts.join(', ')} }` : '';

        return [`await expect(${locator})${notStr}.toHaveValue(${value}${optsCode});`];
    }
}

/**
 * Assert Attribute
 * { type: "assert-attribute", data: { locatorStrategy: "css", selector: "a", attribute: "href", expectedValue: "/home" } }
 * → await expect(page.locator('a')).toHaveAttribute('href', '/home');
 */
export class AssertAttributeGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const { attribute, expectedValue, not, timeout } = node.data;
        const notStr = not ? '.not' : '';
        const value = interpolateVariables(expectedValue || '', ctx);

        const opts: string[] = [];
        if (timeout) opts.push(`timeout: ${timeout}`);
        const optsCode = opts.length ? `, { ${opts.join(', ')} }` : '';

        return [`await expect(${locator})${notStr}.toHaveAttribute('${attribute}', ${value}${optsCode});`];
    }
}

/**
 * Assert Enabled
 * { type: "assert-enabled", data: { locatorStrategy: "role", selector: "button", name: "Submit" } }
 * → await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();
 */
export class AssertEnabledGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const { not, timeout } = node.data;

        const opts: string[] = [];
        if (timeout) opts.push(`timeout: ${timeout}`);
        const optsCode = opts.length ? `{ ${opts.join(', ')} }` : '';

        const assertion = not ? 'toBeDisabled' : 'toBeEnabled';
        return [`await expect(${locator}).${assertion}(${optsCode});`];
    }
}

/**
 * Assert Checked
 * { type: "assert-checked", data: { locatorStrategy: "label", selector: "Remember me" } }
 * → await expect(page.getByLabel('Remember me')).toBeChecked();
 */
export class AssertCheckedGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const { not, timeout } = node.data;
        const notStr = not ? '.not' : '';

        const opts: string[] = [];
        if (timeout) opts.push(`timeout: ${timeout}`);
        const optsCode = opts.length ? `{ ${opts.join(', ')} }` : '';

        return [`await expect(${locator})${notStr}.toBeChecked(${optsCode});`];
    }
}

/**
 * Assert Count
 * { type: "assert-count", data: { locatorStrategy: "css", selector: ".item", expectedCount: 5 } }
 * → await expect(page.locator('.item')).toHaveCount(5);
 */
export class AssertCountGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const { expectedCount, timeout } = node.data;

        const opts: string[] = [];
        if (timeout) opts.push(`timeout: ${timeout}`);
        const optsCode = opts.length ? `, { ${opts.join(', ')} }` : '';

        return [`await expect(${locator}).toHaveCount(${expectedCount}${optsCode});`];
    }
}

/**
 * Assert URL
 * { type: "assert-url", data: { matchType: "contains", expectedUrl: "/dashboard" } }
 * → await expect(page).toHaveURL(/\/dashboard/);
 */
export class AssertUrlGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { matchType, expectedUrl, timeout } = node.data;

        const opts: string[] = [];
        if (timeout) opts.push(`timeout: ${timeout}`);
        const optsCode = opts.length ? `, { ${opts.join(', ')} }` : '';

        let urlArg: string;
        switch (matchType) {
            case 'exact':
                urlArg = interpolateVariables(expectedUrl || '', ctx);
                break;
            case 'regex':
                urlArg = `/${expectedUrl}/`;
                break;
            case 'contains':
            default:
                // Use regex for contains matching
                const escaped = (expectedUrl || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                urlArg = `/${escaped}/`;
                break;
        }

        return [`await expect(page).toHaveURL(${urlArg}${optsCode});`];
    }
}

/**
 * Assert Title
 * { type: "assert-title", data: { matchType: "exact", expectedTitle: "Home Page" } }
 * → await expect(page).toHaveTitle('Home Page');
 */
export class AssertTitleGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { matchType, expectedTitle, timeout } = node.data;

        const opts: string[] = [];
        if (timeout) opts.push(`timeout: ${timeout}`);
        const optsCode = opts.length ? `, { ${opts.join(', ')} }` : '';

        let titleArg: string;
        switch (matchType) {
            case 'exact':
                titleArg = interpolateVariables(expectedTitle || '', ctx);
                break;
            case 'regex':
            case 'contains':
            default:
                titleArg = `/${expectedTitle}/`;
                break;
        }

        return [`await expect(page).toHaveTitle(${titleArg}${optsCode});`];
    }
}
