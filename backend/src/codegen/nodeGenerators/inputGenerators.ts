/**
 * Input Node Generators
 * Generate Playwright code for keyboard and input actions
 */

import type { FlowNode, GeneratorContext, NodeGenerator } from '@playwright-web-app/shared';
import { buildLocatorCode, buildOptsCode } from '../locatorBuilder';
import { interpolateVariables } from '../variableInterpolation';

export class FillGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const value = interpolateVariables(node.data.value || '', ctx);
        const opts = buildOptsCode(node.data, ['force', 'timeout'], true);
        return [`await ${locator}.fill(${value}${opts});`];
    }
}

export class TypeGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const text = interpolateVariables(node.data.text || '', ctx);
        const opts = buildOptsCode(node.data, ['delay', 'timeout'], true);
        return [`await ${locator}.pressSequentially(${text}${opts});`];
    }
}

export class ClearGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const opts = buildOptsCode(node.data, ['timeout']);
        return [`await ${locator}.clear(${opts});`];
    }
}

export class PressKeyGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const { useElement, key, customKey, delay } = node.data;
        const actualKey = key === 'custom' ? customKey : key;
        const opts = delay ? `, { delay: ${delay} }` : '';

        if (useElement && node.data.selector) {
            const locator = buildLocatorCode(node.data);
            return [`await ${locator}.press('${actualKey}'${opts});`];
        }
        return [`await page.keyboard.press('${actualKey}'${opts});`];
    }
}

export class SelectOptionGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const { selectBy, optionValue } = node.data;
        const value = interpolateVariables(optionValue || '', ctx);

        let selectArg: string;
        switch (selectBy) {
            case 'value': selectArg = `{ value: ${value} }`; break;
            case 'label': selectArg = `{ label: ${value} }`; break;
            case 'index': selectArg = `{ index: ${value} }`; break;
            default: selectArg = value;
        }

        const opts = buildOptsCode(node.data, ['timeout'], true);
        return [`await ${locator}.selectOption(${selectArg}${opts});`];
    }
}

export class CheckGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const opts = buildOptsCode(node.data, ['force', 'timeout']);
        return [`await ${locator}.check(${opts});`];
    }
}

export class UncheckGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const opts = buildOptsCode(node.data, ['force', 'timeout']);
        return [`await ${locator}.uncheck(${opts});`];
    }
}

export class SetCheckedGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const checked = node.data.checked !== false;
        const opts = buildOptsCode(node.data, ['force', 'timeout'], true);
        return [`await ${locator}.setChecked(${checked}${opts});`];
    }
}

export class UploadFileGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const filePath = interpolateVariables(node.data.filePath || '', ctx);
        const opts = buildOptsCode(node.data, ['timeout'], true);
        return [`await ${locator}.setInputFiles(${filePath}${opts});`];
    }
}

export class FocusGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const opts = buildOptsCode(node.data, ['timeout']);
        return [`await ${locator}.focus(${opts});`];
    }
}

export class BlurGenerator implements NodeGenerator {
    generate(node: FlowNode, _ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        return [`await ${locator}.blur();`];
    }
}
