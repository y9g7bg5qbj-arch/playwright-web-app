/**
 * Action Node Generators
 * Generate Playwright code for mouse/click actions
 */

import type { FlowNode, GeneratorContext, NodeGenerator } from '@playwright-web-app/shared';
import { buildLocatorCode, buildClickOptions, buildOptsCode } from '../locatorBuilder';

export class ClickGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const opts = buildClickOptions(node.data);
        return [`await ${locator}.click(${opts});`];
    }
}

export class DoubleClickGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const opts = buildOptsCode(node.data, ['force', 'timeout']);
        return [`await ${locator}.dblclick(${opts});`];
    }
}

export class RightClickGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const extra = buildOptsCode(node.data, ['force', 'timeout']);
        const inner = `button: 'right'${extra ? ', ' + extra.slice(2, -2) : ''}`;
        return [`await ${locator}.click({ ${inner} });`];
    }
}

export class HoverGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
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

export class DragAndDropGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const { sourceLocatorStrategy, sourceSelector, targetLocatorStrategy, targetSelector } = node.data;
        const source = buildLocatorCode({ locatorStrategy: sourceLocatorStrategy, selector: sourceSelector });
        const target = buildLocatorCode({ locatorStrategy: targetLocatorStrategy, selector: targetSelector });
        const opts = buildOptsCode(node.data, ['force', 'timeout'], true);
        return [`await ${source}.dragTo(${target}${opts});`];
    }
}

export class ScrollGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const { scrollType, x, y, deltaX, deltaY } = node.data;

        switch (scrollType) {
            case 'element': {
                const locator = buildLocatorCode(node.data);
                return [`await ${locator}.scrollIntoViewIfNeeded();`];
            }
            case 'position':
                return [`await page.evaluate(() => window.scrollTo(${x || 0}, ${y || 0}));`];
            case 'delta':
                return [`await page.mouse.wheel(${deltaX || 0}, ${deltaY || 0});`];
            default:
                if (node.data.selector) {
                    const loc = buildLocatorCode(node.data);
                    return [`await ${loc}.scrollIntoViewIfNeeded();`];
                }
                return [];
        }
    }
}

export class MouseMoveGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const { x, y, steps } = node.data;
        const opts = steps && steps > 1 ? `, { steps: ${steps} }` : '';
        return [`await page.mouse.move(${x || 0}, ${y || 0}${opts});`];
    }
}

export class MouseDownGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const { button } = node.data;
        const opts = button && button !== 'left' ? `{ button: '${button}' }` : '';
        return [`await page.mouse.down(${opts});`];
    }
}

export class MouseUpGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const { button } = node.data;
        const opts = button && button !== 'left' ? `{ button: '${button}' }` : '';
        return [`await page.mouse.up(${opts});`];
    }
}
