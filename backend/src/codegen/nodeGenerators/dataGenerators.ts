/**
 * Data Node Generators
 * Generate Playwright code for data extraction, variables, logging, screenshots
 */

import type { FlowNode, GeneratorContext, NodeGenerator } from '@playwright-web-app/shared';
import { buildLocatorCode } from '../locatorBuilder';
import { interpolateVariables, formatValue } from '../variableInterpolation';

/**
 * Set Variable
 * { type: "set-variable", data: { name: "count", valueType: "number", value: "10" } }
 * → const count = 10;
 */
export class SetVariableGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { name, valueType, value, boolValue, jsonValue, expression } = node.data;

        let varValue: string;
        switch (valueType) {
            case 'string':
                varValue = formatValue(value, 'string');
                break;
            case 'number':
                varValue = String(Number(value));
                break;
            case 'boolean':
                varValue = boolValue ? 'true' : 'false';
                break;
            case 'json':
                varValue = JSON.stringify(jsonValue, null, 2);
                break;
            case 'expression':
                varValue = expression || 'undefined';
                break;
            default:
                varValue = formatValue(value);
        }

        const varName = name || '_var';

        // Check if variable exists (reassignment vs declaration)
        if (ctx.variables.has(varName)) {
            return [`${varName} = ${varValue};`];
        }

        ctx.variables.set(varName, valueType || 'any');
        return [`let ${varName} = ${varValue};`];
    }
}

/**
 * Get Text
 * { type: "get-text", data: { locatorStrategy: "css", selector: "h1", variable: "title", trim: true } }
 * → const title = (await page.locator('h1').textContent())?.trim() ?? '';
 */
export class GetTextGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const { variable, trim } = node.data;

        ctx.variables.set(variable, 'string');

        if (trim !== false) {
            return [`const ${variable} = (await ${locator}.textContent())?.trim() ?? '';`];
        }
        return [`const ${variable} = await ${locator}.textContent() ?? '';`];
    }
}

/**
 * Get Attribute
 * { type: "get-attribute", data: { locatorStrategy: "css", selector: "a", attribute: "href", variable: "link" } }
 * → const link = await page.locator('a').getAttribute('href');
 */
export class GetAttributeGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const { attribute, variable } = node.data;

        ctx.variables.set(variable, 'string | null');
        return [`const ${variable} = await ${locator}.getAttribute('${attribute}');`];
    }
}

/**
 * Get Value (Input value)
 * { type: "get-value", data: { locatorStrategy: "css", selector: "#email", variable: "emailValue" } }
 * → const emailValue = await page.locator('#email').inputValue();
 */
export class GetValueGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const { variable } = node.data;

        ctx.variables.set(variable, 'string');
        return [`const ${variable} = await ${locator}.inputValue();`];
    }
}

/**
 * Get URL
 * { type: "get-url", data: { variable: "currentUrl" } }
 * → const currentUrl = page.url();
 */
export class GetUrlGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { variable } = node.data;

        ctx.variables.set(variable, 'string');
        return [`const ${variable} = page.url();`];
    }
}

/**
 * Get Title
 * { type: "get-title", data: { variable: "pageTitle" } }
 * → const pageTitle = await page.title();
 */
export class GetTitleGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { variable } = node.data;

        ctx.variables.set(variable, 'string');
        return [`const ${variable} = await page.title();`];
    }
}

/**
 * Get Element Count
 * { type: "get-element-count", data: { locatorStrategy: "css", selector: ".item", variable: "itemCount" } }
 * → const itemCount = await page.locator('.item').count();
 */
export class GetElementCountGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const locator = buildLocatorCode(node.data);
        const { variable } = node.data;

        ctx.variables.set(variable, 'number');
        return [`const ${variable} = await ${locator}.count();`];
    }
}

/**
 * Log
 * { type: "log", data: { message: "User logged in: {{username}}", level: "info" } }
 * → console.log(`User logged in: ${username}`);
 */
export class LogGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { message, level } = node.data;
        const msg = interpolateVariables(message || '', ctx);

        return [`console.${level || 'log'}(${msg});`];
    }
}

/**
 * Screenshot
 * { type: "screenshot", data: { type: "page", name: "homepage", fullPage: true } }
 * → await page.screenshot({ path: 'homepage.png', fullPage: true });
 */
export class ScreenshotGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { type, name, fullPage } = node.data;
        const opts: string[] = [];

        if (name) {
            opts.push(`path: '${name}.png'`);
        }

        if (type === 'element') {
            const locator = buildLocatorCode(node.data);
            return [`await ${locator}.screenshot({ ${opts.join(', ')} });`];
        }

        if (fullPage || type === 'page') {
            opts.push('fullPage: true');
        }

        const optsCode = opts.length ? `{ ${opts.join(', ')} }` : '';
        return [`await page.screenshot(${optsCode});`];
    }
}

/**
 * Evaluate Expression
 * { type: "evaluate-expression", data: { expression: "${count} + 1", variable: "newCount" } }
 * → const newCount = count + 1;
 */
export class EvaluateExpressionGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { expression, variable } = node.data;

        // Replace ${variable} with just variable
        const expr = (expression || '').replace(/\$\{([^}]+)\}/g, '$1');

        ctx.variables.set(variable, 'any');
        return [`const ${variable} = ${expr};`];
    }
}

/**
 * Data Source (Load external data)
 * { type: "data", data: { sourceType: "json", sourcePath: "./data/users.json" } }
 * → const testData = require('./data/users.json');
 */
export class DataSourceGenerator implements NodeGenerator {
    generate(node: FlowNode, ctx: GeneratorContext): string[] {
        const { sourceType, sourcePath, variableName } = node.data;
        const varName = variableName || 'testData';

        ctx.variables.set(varName, 'any[]');

        switch (sourceType) {
            case 'json':
                return [`const ${varName} = require('${sourcePath}');`];
            case 'csv':
                // For CSV, we'd need a CSV parser - simplified version
                return [
                    `// Note: CSV parsing requires additional setup`,
                    `const ${varName}: any[] = []; // Load from ${sourcePath}`
                ];
            case 'variable':
                return [`const ${varName} = ${sourcePath};`];
            default:
                return [`const ${varName} = require('${sourcePath}');`];
        }
    }
}
