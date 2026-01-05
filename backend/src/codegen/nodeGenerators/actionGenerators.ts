/**
 * Action Node Generators
 * Generate Playwright code for mouse/click actions
 */

import type { FlowNode, GeneratorContext, NodeGenerator } from '@playwright-web-app/shared';
import { buildLocatorCode, buildClickOptions } from '../locatorBuilder';

/**
 * Click
 * { type: "click", data: { locatorStrategy: "role", selector: "button", name: "Submit" } }
 * → await page.getByRole('button', { name: 'Submit' }).click();
 */
export class ClickGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const opts = buildClickOptions(node.data);
        return [`await ${locator}.click(${opts});`];
    }
}

/**
 * Double Click
 * { type: "double-click", data: { locatorStrategy: "css", selector: ".item" } }
 * → await page.locator('.item').dblclick();
 */
export class DoubleClickGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const opts: string[] = [];

        if (node.data.force) opts.push('force: true');
        if (node.data.timeout) opts.push(`timeout: ${node.data.timeout}`);

        const optsCode = opts.length ? `{ ${opts.join(', ')} }` : '';
        return [`await ${locator}.dblclick(${optsCode});`];
    }
}

/**
 * Right Click
 * { type: "right-click", data: { locatorStrategy: "css", selector: ".item" } }
 * → await page.locator('.item').click({ button: 'right' });
 */
export class RightClickGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const opts: string[] = ["button: 'right'"];

        if (node.data.force) opts.push('force: true');
        if (node.data.timeout) opts.push(`timeout: ${node.data.timeout}`);

        return [`await ${locator}.click({ ${opts.join(', ')} });`];
    }
}

/**
 * Hover
 * { type: "hover", data: { locatorStrategy: "css", selector: ".menu" } }
 * → await page.locator('.menu').hover();
 */
export class HoverGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const opts: string[] = [];

        if (node.data.force) opts.push('force: true');
        if (node.data.timeout) opts.push(`timeout: ${node.data.timeout}`);
        if (node.data.position?.x !== undefined) {
            opts.push(`position: { x: ${node.data.position.x}, y: ${node.data.position.y} }`);
        }

        const optsCode = opts.length ? `{ ${opts.join(', ')} }` : '';
        return [`await ${locator}.hover(${optsCode});`];
    }
}

/**
 * Drag and Drop
 * { type: "drag-and-drop", data: { sourceSelector: ".drag", targetSelector: ".drop" } }
 * → await page.locator('.drag').dragTo(page.locator('.drop'));
 */
export class DragAndDropGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const {
            sourceLocatorStrategy, sourceSelector,
            targetLocatorStrategy, targetSelector,
            force, timeout
        } = node.data;

        const source = buildLocatorCode({
            locatorStrategy: sourceLocatorStrategy,
            selector: sourceSelector
        });
        const target = buildLocatorCode({
            locatorStrategy: targetLocatorStrategy,
            selector: targetSelector
        });

        const opts: string[] = [];
        if (force) opts.push('force: true');
        if (timeout) opts.push(`timeout: ${timeout}`);

        const optsCode = opts.length ? `, { ${opts.join(', ')} }` : '';
        return [`await ${source}.dragTo(${target}${optsCode});`];
    }
}

/**
 * Scroll
 * { type: "scroll", data: { scrollType: "element", selector: ".footer" } }
 * → await page.locator('.footer').scrollIntoViewIfNeeded();
 */
export class ScrollGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { scrollType, x, y, deltaX, deltaY } = node.data;

        switch (scrollType) {
            case 'element':
                const locator = buildLocatorCode(node.data);
                return [`await ${locator}.scrollIntoViewIfNeeded();`];
            case 'position':
                return [`await page.evaluate(() => window.scrollTo(${x || 0}, ${y || 0}));`];
            case 'delta':
                return [`await page.mouse.wheel(${deltaX || 0}, ${deltaY || 0});`];
            default:
                // Default to scroll to element
                if (node.data.selector) {
                    const loc = buildLocatorCode(node.data);
                    return [`await ${loc}.scrollIntoViewIfNeeded();`];
                }
                return [];
        }
    }
}

/**
 * Mouse Move
 * { type: "mouse-move", data: { x: 100, y: 200, steps: 5 } }
 * → await page.mouse.move(100, 200, { steps: 5 });
 */
export class MouseMoveGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { x, y, steps } = node.data;
        const opts = steps && steps > 1 ? `, { steps: ${steps} }` : '';
        return [`await page.mouse.move(${x || 0}, ${y || 0}${opts});`];
    }
}

/**
 * Mouse Down
 * { type: "mouse-down", data: { button: "left" } }
 * → await page.mouse.down({ button: 'left' });
 */
export class MouseDownGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { button } = node.data;
        const opts = button && button !== 'left' ? `{ button: '${button}' }` : '';
        return [`await page.mouse.down(${opts});`];
    }
}

/**
 * Mouse Up
 * { type: "mouse-up", data: { button: "left" } }
 * → await page.mouse.up({ button: 'left' });
 */
export class MouseUpGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { button } = node.data;
        const opts = button && button !== 'left' ? `{ button: '${button}' }` : '';
        return [`await page.mouse.up(${opts});`];
    }
}
