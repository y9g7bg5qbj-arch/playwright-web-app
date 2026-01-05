/**
 * Input Node Generators
 * Generate Playwright code for keyboard and input actions
 */

import type { FlowNode, GeneratorContext, NodeGenerator } from '@playwright-web-app/shared';
import { buildLocatorCode } from '../locatorBuilder';
import { interpolateVariables } from '../variableInterpolation';

/**
 * Fill
 * { type: "fill", data: { locatorStrategy: "test-id", selector: "email", value: "test@example.com" } }
 * → await page.getByTestId('email').fill('test@example.com');
 */
export class FillGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const value = interpolateVariables(node.data.value || '', ctx);

        const opts: string[] = [];
        if (node.data.force) opts.push('force: true');
        if (node.data.timeout) opts.push(`timeout: ${node.data.timeout}`);

        const optsCode = opts.length ? `, { ${opts.join(', ')} }` : '';
        return [`await ${locator}.fill(${value}${optsCode});`];
    }
}

/**
 * Type (pressSequentially)
 * { type: "type", data: { locatorStrategy: "css", selector: "#search", text: "hello", delay: 100 } }
 * → await page.locator('#search').pressSequentially('hello', { delay: 100 });
 */
export class TypeGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const text = interpolateVariables(node.data.text || '', ctx);

        const opts: string[] = [];
        if (node.data.delay) opts.push(`delay: ${node.data.delay}`);
        if (node.data.timeout) opts.push(`timeout: ${node.data.timeout}`);

        const optsCode = opts.length ? `, { ${opts.join(', ')} }` : '';
        return [`await ${locator}.pressSequentially(${text}${optsCode});`];
    }
}

/**
 * Clear
 * { type: "clear", data: { locatorStrategy: "css", selector: "#input" } }
 * → await page.locator('#input').clear();
 */
export class ClearGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);

        const opts: string[] = [];
        if (node.data.timeout) opts.push(`timeout: ${node.data.timeout}`);

        const optsCode = opts.length ? `{ ${opts.join(', ')} }` : '';
        return [`await ${locator}.clear(${optsCode});`];
    }
}

/**
 * Press Key
 * { type: "press-key", data: { key: "Enter" } }
 * → await page.keyboard.press('Enter');
 * 
 * OR on element:
 * { type: "press-key", data: { useElement: true, selector: "#input", key: "Tab" } }
 * → await page.locator('#input').press('Tab');
 */
export class PressKeyGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { useElement, key, customKey, delay } = node.data;
        const actualKey = key === 'custom' ? customKey : key;

        const opts: string[] = [];
        if (delay) opts.push(`delay: ${delay}`);
        const optsCode = opts.length ? `, { ${opts.join(', ')} }` : '';

        if (useElement && node.data.selector) {
            const locator = buildLocatorCode(node.data);
            return [`await ${locator}.press('${actualKey}'${optsCode});`];
        }

        return [`await page.keyboard.press('${actualKey}'${optsCode});`];
    }
}

/**
 * Select Option
 * { type: "select-option", data: { locatorStrategy: "css", selector: "select#country", selectBy: "label", optionValue: "United States" } }
 * → await page.locator('select#country').selectOption({ label: 'United States' });
 */
export class SelectOptionGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const { selectBy, optionValue } = node.data;
        const value = interpolateVariables(optionValue || '', ctx);

        let selectArg: string;
        switch (selectBy) {
            case 'value':
                selectArg = `{ value: ${value} }`;
                break;
            case 'label':
                selectArg = `{ label: ${value} }`;
                break;
            case 'index':
                selectArg = `{ index: ${value} }`;
                break;
            default:
                selectArg = value;
        }

        const opts: string[] = [];
        if (node.data.timeout) opts.push(`timeout: ${node.data.timeout}`);
        const optsCode = opts.length ? `, { ${opts.join(', ')} }` : '';

        return [`await ${locator}.selectOption(${selectArg}${optsCode});`];
    }
}

/**
 * Check
 * { type: "check", data: { locatorStrategy: "label", selector: "Remember me" } }
 * → await page.getByLabel('Remember me').check();
 */
export class CheckGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);

        const opts: string[] = [];
        if (node.data.force) opts.push('force: true');
        if (node.data.timeout) opts.push(`timeout: ${node.data.timeout}`);

        const optsCode = opts.length ? `{ ${opts.join(', ')} }` : '';
        return [`await ${locator}.check(${optsCode});`];
    }
}

/**
 * Uncheck
 * { type: "uncheck", data: { locatorStrategy: "label", selector: "Subscribe" } }
 * → await page.getByLabel('Subscribe').uncheck();
 */
export class UncheckGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);

        const opts: string[] = [];
        if (node.data.force) opts.push('force: true');
        if (node.data.timeout) opts.push(`timeout: ${node.data.timeout}`);

        const optsCode = opts.length ? `{ ${opts.join(', ')} }` : '';
        return [`await ${locator}.uncheck(${optsCode});`];
    }
}

/**
 * Set Checked
 * { type: "set-checked", data: { locatorStrategy: "css", selector: "#agree", checked: true } }
 * → await page.locator('#agree').setChecked(true);
 */
export class SetCheckedGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const checked = node.data.checked !== false;

        const opts: string[] = [];
        if (node.data.force) opts.push('force: true');
        if (node.data.timeout) opts.push(`timeout: ${node.data.timeout}`);

        const optsCode = opts.length ? `, { ${opts.join(', ')} }` : '';
        return [`await ${locator}.setChecked(${checked}${optsCode});`];
    }
}

/**
 * Upload File
 * { type: "upload-file", data: { locatorStrategy: "css", selector: "input[type=file]", filePath: "./files/doc.pdf" } }
 * → await page.locator('input[type=file]').setInputFiles('./files/doc.pdf');
 */
export class UploadFileGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const filePath = interpolateVariables(node.data.filePath || '', ctx);

        const opts: string[] = [];
        if (node.data.timeout) opts.push(`timeout: ${node.data.timeout}`);

        const optsCode = opts.length ? `, { ${opts.join(', ')} }` : '';
        return [`await ${locator}.setInputFiles(${filePath}${optsCode});`];
    }
}

/**
 * Focus
 * { type: "focus", data: { locatorStrategy: "css", selector: "#input" } }
 * → await page.locator('#input').focus();
 */
export class FocusGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);

        const opts: string[] = [];
        if (node.data.timeout) opts.push(`timeout: ${node.data.timeout}`);

        const optsCode = opts.length ? `{ ${opts.join(', ')} }` : '';
        return [`await ${locator}.focus(${optsCode});`];
    }
}

/**
 * Blur
 * { type: "blur", data: { locatorStrategy: "css", selector: "#input" } }
 * → await page.locator('#input').blur();
 */
export class BlurGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        return [`await ${locator}.blur();`];
    }
}
