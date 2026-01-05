/**
 * Wait Node Generators
 * Generate Playwright wait/timing code
 */

import type { FlowNode, GeneratorContext, NodeGenerator } from '@playwright-web-app/shared';
import { buildLocatorCode } from '../locatorBuilder';
import { interpolateVariables } from '../variableInterpolation';

/**
 * Wait Time (Fixed Duration)
 * { type: "wait-time", data: { duration: 2000 } }
 * → await page.waitForTimeout(2000);
 */
export class WaitTimeGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const duration = node.data.duration || 1000;
        return [`await page.waitForTimeout(${duration});`];
    }
}

/**
 * Wait for Element
 * { type: "wait-for-element", data: { locatorStrategy: "css", selector: ".loaded", state: "visible" } }
 * → await page.locator('.loaded').waitFor({ state: 'visible' });
 */
export class WaitForElementGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const { state, timeout } = node.data;

        const opts: string[] = [];
        if (state) opts.push(`state: '${state}'`);
        if (timeout) opts.push(`timeout: ${timeout}`);

        const optsCode = opts.length ? `{ ${opts.join(', ')} }` : '';
        return [`await ${locator}.waitFor(${optsCode});`];
    }
}

/**
 * Wait for URL
 * { type: "wait-for-url", data: { matchType: "contains", url: "/dashboard", timeout: 30000 } }
 * → await page.waitForURL(/\/dashboard/, { timeout: 30000 });
 */
export class WaitForUrlGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { matchType, url, timeout } = node.data;

        const opts: string[] = [];
        if (timeout) opts.push(`timeout: ${timeout}`);
        const optsCode = opts.length ? `, { ${opts.join(', ')} }` : '';

        let urlArg: string;
        switch (matchType) {
            case 'exact':
                urlArg = interpolateVariables(url || '', ctx);
                break;
            case 'regex':
                urlArg = `/${url}/`;
                break;
            case 'contains':
            default:
                // Use glob pattern for contains
                urlArg = `'**${url}**'`;
                break;
        }

        return [`await page.waitForURL(${urlArg}${optsCode});`];
    }
}

/**
 * Wait for Load State
 * { type: "wait-for-load-state", data: { state: "networkidle" } }
 * → await page.waitForLoadState('networkidle');
 */
export class WaitForLoadStateGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { state, timeout } = node.data;

        const opts: string[] = [];
        if (timeout) opts.push(`timeout: ${timeout}`);
        const optsCode = opts.length ? `, { ${opts.join(', ')} }` : '';

        return [`await page.waitForLoadState('${state || 'load'}'${optsCode});`];
    }
}

/**
 * Wait for Response
 * Example: { type: "wait-for-response", data: { urlPattern: "/api/users", timeout: 30000 } }
 * Output: await page.waitForResponse(resp => resp.url().includes('/api/users'), { timeout: 30000 });
 */
export class WaitForResponseGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { urlPattern, timeout } = node.data;

        const opts: string[] = [];
        if (timeout) opts.push(`timeout: ${timeout}`);
        const optsCode = opts.length ? `, { ${opts.join(', ')} }` : '';

        // Convert glob pattern to includes check
        const pattern = (urlPattern || '').replace(/\*\*/g, '').replace(/\*/g, '');
        return [`await page.waitForResponse(resp => resp.url().includes('${pattern}')${optsCode});`];
    }
}

/**
 * Wait for Function
 * { type: "wait-for-function", data: { expression: "() => document.readyState === 'complete'", polling: "raf" } }
 * → await page.waitForFunction(() => document.readyState === 'complete', { polling: 'raf' });
 */
export class WaitForFunctionGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { expression, polling, timeout } = node.data;

        const opts: string[] = [];
        if (polling && polling !== 'raf') {
            opts.push(`polling: ${polling}`);
        } else if (polling === 'raf') {
            opts.push(`polling: 'raf'`);
        }
        if (timeout) opts.push(`timeout: ${timeout}`);

        const optsCode = opts.length ? `, { ${opts.join(', ')} }` : '';

        return [`await page.waitForFunction(${expression}${optsCode});`];
    }
}
