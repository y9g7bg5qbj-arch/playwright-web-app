/**
 * Navigation Node Generators
 * Generate Playwright code for navigation actions
 */

import type { FlowNode, GeneratorContext, NodeGenerator } from '@playwright-web-app/shared';
import { interpolateVariables } from '../variableInterpolation';

/**
 * Navigate to URL
 * { type: "navigate", data: { url: "https://example.com", waitUntil: "load" } }
 * → await page.goto('https://example.com', { waitUntil: 'load' });
 */
export class NavigateGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { url, waitUntil, timeout, referer } = node.data;
        const opts: string[] = [];

        if (waitUntil && waitUntil !== 'load') {
            opts.push(`waitUntil: '${waitUntil}'`);
        }
        if (timeout) {
            opts.push(`timeout: ${timeout}`);
        }
        if (referer) {
            opts.push(`referer: '${referer}'`);
        }

        const urlCode = interpolateVariables(url || '', ctx);
        const optsCode = opts.length ? `, { ${opts.join(', ')} }` : '';

        return [`await page.goto(${urlCode}${optsCode});`];
    }
}

/**
 * Go Back
 * { type: "go-back", data: { waitUntil: "load" } }
 * → await page.goBack({ waitUntil: 'load' });
 */
export class GoBackGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const { waitUntil, timeout } = node.data;
        const opts: string[] = [];

        if (waitUntil) {
            opts.push(`waitUntil: '${waitUntil}'`);
        }
        if (timeout) {
            opts.push(`timeout: ${timeout}`);
        }

        const optsCode = opts.length ? `{ ${opts.join(', ')} }` : '';
        return [`await page.goBack(${optsCode});`];
    }
}

/**
 * Go Forward
 * { type: "go-forward", data: { waitUntil: "load" } }
 * → await page.goForward({ waitUntil: 'load' });
 */
export class GoForwardGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const { waitUntil, timeout } = node.data;
        const opts: string[] = [];

        if (waitUntil) {
            opts.push(`waitUntil: '${waitUntil}'`);
        }
        if (timeout) {
            opts.push(`timeout: ${timeout}`);
        }

        const optsCode = opts.length ? `{ ${opts.join(', ')} }` : '';
        return [`await page.goForward(${optsCode});`];
    }
}

/**
 * Reload Page
 * { type: "reload", data: { waitUntil: "load" } }
 * → await page.reload({ waitUntil: 'load' });
 */
export class ReloadGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const { waitUntil, timeout } = node.data;
        const opts: string[] = [];

        if (waitUntil) {
            opts.push(`waitUntil: '${waitUntil}'`);
        }
        if (timeout) {
            opts.push(`timeout: ${timeout}`);
        }

        const optsCode = opts.length ? `{ ${opts.join(', ')} }` : '';
        return [`await page.reload(${optsCode});`];
    }
}

/**
 * New Page/Tab
 * { type: "new-page", data: { url: "https://example.com" } }
 * → const newPage = await context.newPage();
 * → await newPage.goto('https://example.com');
 */
export class NewPageGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { url } = node.data;
        const lines: string[] = [];

        lines.push('const newPage = await context.newPage();');

        if (url) {
            const urlCode = interpolateVariables(url || '', ctx);
            lines.push(`await newPage.goto(${urlCode});`);
        }

        return lines;
    }
}

/**
 * Close Page
 * { type: "close-page", data: {} }
 * → await page.close();
 */
export class ClosePageGenerator implements NodeGenerator {
    generate(_node: FlowNode, _ctx: GeneratorContext): string[] {
        return ['await page.close();'];
    }
}

/**
 * Switch Tab
 * { type: "switch-tab", data: { tabIndex: 1 } }
 * → page = context.pages()[1];
 *
 * NOTE: This generator is for visual-flow codegen, not Vero DSL transpilation.
 * Canonical Vero tab semantics live in vero-lang transpiler/validator.
 */
export class SwitchTabGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const { tabIndex } = node.data;
        return [`page = context.pages()[${tabIndex || 0}];`];
    }
}

/**
 * Wait for New Tab
 * { type: "wait-for-new-tab", data: { switchToNewTab: true } }
 * → const [newPage] = await Promise.all([
 *     context.waitForEvent('page'),
 *     // trigger action that opens new tab (previous node should handle this)
 *   ]);
 *
 * NOTE: This generator is for visual-flow codegen, not Vero DSL transpilation.
 * Canonical Vero tab semantics live in vero-lang transpiler/validator.
 */
export class WaitForNewTabGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const { switchToNewTab, waitForLoad } = node.data;
        const lines: string[] = [];

        lines.push('const newPage = await context.waitForEvent(\'page\');');

        if (waitForLoad !== false) {
            lines.push('await newPage.waitForLoadState();');
        }

        if (switchToNewTab !== false) {
            lines.push('page = newPage;');
        }

        return lines;
    }
}

/**
 * Switch to Frame
 * { type: "switch-frame", data: { selector: "iframe#myFrame" } }
 * → const frame = page.frameLocator('iframe#myFrame');
 */
export class SwitchFrameGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const { selector, frameName } = node.data;

        if (frameName) {
            return [`const frame = page.frame({ name: '${frameName}' });`];
        }

        return [`const frame = page.frameLocator('${selector}');`];
    }
}

/**
 * Switch to Main Frame
 * { type: "switch-main-frame", data: {} }
 * → // Switch back to main frame (use page directly)
 */
export class SwitchMainFrameGenerator implements NodeGenerator {
    generate(_node: FlowNode, _ctx: GeneratorContext): string[] {
        return ['// Switched back to main frame - use page directly'];
    }
}
