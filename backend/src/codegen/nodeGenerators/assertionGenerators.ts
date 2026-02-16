/**
 * Assertion Node Generators
 * Generate Playwright expect() assertions
 */

import type { FlowNode, GeneratorContext, NodeGenerator } from '@playwright-web-app/shared';
import { buildLocatorCode, buildOptsCode } from '../locatorBuilder';
import { interpolateVariables } from '../variableInterpolation';

/**
 * Assert Visible
 * { type: "assert-visible", data: { locatorStrategy: "text", selector: "Welcome" } }
 * → await expect(page.getByText('Welcome')).toBeVisible();
 */
export class AssertVisibleGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const not = node.data.not ? '.not' : '';
        const opts = buildOptsCode(node.data, ['timeout']);
        return [`await expect(${locator})${not}.toBeVisible(${opts});`];
    }
}

/**
 * Assert Hidden
 * { type: "assert-hidden", data: { locatorStrategy: "css", selector: ".loading" } }
 * → await expect(page.locator('.loading')).toBeHidden();
 */
export class AssertHiddenGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const opts = buildOptsCode(node.data, ['timeout']);
        return [`await expect(${locator}).toBeHidden(${opts});`];
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
        const optsCode = buildOptsCode(node.data, ['ignoreCase', 'timeout'], true);

        let assertion: string;
        switch (matchType) {
            case 'exact':
                assertion = `toHaveText(${text}${optsCode})`;
                break;
            case 'regex':
                const flags = ignoreCase ? 'i' : '';
                const regexOpts = buildOptsCode(node.data, ['timeout'], true);
                assertion = `toHaveText(/${expectedText}/${flags}${regexOpts})`;
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
        const notStr = node.data.not ? '.not' : '';
        const value = interpolateVariables(node.data.expectedValue || '', ctx);
        const opts = buildOptsCode(node.data, ['timeout'], true);
        return [`await expect(${locator})${notStr}.toHaveValue(${value}${opts});`];
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
        const notStr = node.data.not ? '.not' : '';
        const value = interpolateVariables(node.data.expectedValue || '', ctx);
        const opts = buildOptsCode(node.data, ['timeout'], true);
        return [`await expect(${locator})${notStr}.toHaveAttribute('${node.data.attribute}', ${value}${opts});`];
    }
}

/**
 * Assert Enabled
 * { type: "assert-enabled", data: { locatorStrategy: "role", selector: "button", name: "Submit" } }
 * → await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();
 */
export class AssertEnabledGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const assertion = node.data.not ? 'toBeDisabled' : 'toBeEnabled';
        const opts = buildOptsCode(node.data, ['timeout']);
        return [`await expect(${locator}).${assertion}(${opts});`];
    }
}

/**
 * Assert Checked
 * { type: "assert-checked", data: { locatorStrategy: "label", selector: "Remember me" } }
 * → await expect(page.getByLabel('Remember me')).toBeChecked();
 */
export class AssertCheckedGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const notStr = node.data.not ? '.not' : '';
        const opts = buildOptsCode(node.data, ['timeout']);
        return [`await expect(${locator})${notStr}.toBeChecked(${opts});`];
    }
}

/**
 * Assert Count
 * { type: "assert-count", data: { locatorStrategy: "css", selector: ".item", expectedCount: 5 } }
 * → await expect(page.locator('.item')).toHaveCount(5);
 */
export class AssertCountGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const opts = buildOptsCode(node.data, ['timeout'], true);
        return [`await expect(${locator}).toHaveCount(${node.data.expectedCount}${opts});`];
    }
}

/**
 * Assert URL
 * { type: "assert-url", data: { matchType: "contains", expectedUrl: "/dashboard" } }
 * → await expect(page).toHaveURL(/\/dashboard/);
 */
export class AssertUrlGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { matchType, expectedUrl } = node.data;
        const opts = buildOptsCode(node.data, ['timeout'], true);

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
                const escaped = (expectedUrl || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                urlArg = `/${escaped}/`;
                break;
        }

        return [`await expect(page).toHaveURL(${urlArg}${opts});`];
    }
}

/**
 * Assert Title
 * { type: "assert-title", data: { matchType: "exact", expectedTitle: "Home Page" } }
 * → await expect(page).toHaveTitle('Home Page');
 */
export class AssertTitleGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { matchType, expectedTitle } = node.data;
        const opts = buildOptsCode(node.data, ['timeout'], true);

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

        return [`await expect(page).toHaveTitle(${titleArg}${opts});`];
    }
}
