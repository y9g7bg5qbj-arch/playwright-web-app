/**
 * Data-Driven Code Generator
 * 
 * Generates Playwright test code with data iteration support,
 * variable interpolation, and environment variable handling.
 */

import {
    VariableScope,
    FlowVariableConfig,
    VariableDataSourceConfig,
    VariableContextState
} from '@playwright-web-app/shared';
import { VariableContext } from '../data/variableResolver';

// ============================================
// CODE GENERATION TYPES
// ============================================

export interface CodeGenOptions {
    testName?: string;
    includeImports?: boolean;
    includeVariableDeclarations?: boolean;
    useTestEach?: boolean;  // Use test.each for iteration
    indentSize?: number;
    screenshotDir?: string;
}

export interface GeneratedCode {
    imports: string[];
    setup: string[];
    testBody: string[];
    teardown: string[];
    fullCode: string;
}

// ============================================
// DATA DRIVEN CODE GENERATOR
// ============================================

export class DataDrivenCodeGenerator {
    private options: Required<CodeGenOptions>;

    constructor(options?: CodeGenOptions) {
        this.options = {
            testName: 'Generated Test',
            includeImports: true,
            includeVariableDeclarations: true,
            useTestEach: false,
            indentSize: 2,
            screenshotDir: './screenshots',
            ...options
        };
    }

    /**
     * Generate imports section
     */
    generateImports(config: FlowVariableConfig): string[] {
        const imports: string[] = [
            "import { test, expect } from '@playwright/test';",
        ];

        // Add fs import if data source is file-based
        if (config.dataSource && config.dataSource.type !== 'inline') {
            imports.push("import * as fs from 'fs';");

            if (config.dataSource.type === 'csv') {
                imports.push("import { parse as parseCsvSync } from 'csv-parse/sync';");
            } else if (config.dataSource.type === 'excel') {
                imports.push("import * as XLSX from 'xlsx';");
            }
        }

        return imports;
    }

    /**
     * Generate data loading code
     */
    generateDataLoading(config: VariableDataSourceConfig): string[] {
        const lines: string[] = [];
        const { type, path, data, iterateAs, sheet, hasHeaders = true } = config;

        switch (type) {
            case 'csv':
                lines.push(`// Load CSV test data`);
                lines.push(`const ${iterateAs}Data = parseCsvSync(`);
                lines.push(`  fs.readFileSync('${path}', 'utf-8'),`);
                lines.push(`  { columns: ${hasHeaders}, skip_empty_lines: true }`);
                lines.push(`);`);
                break;

            case 'json':
                lines.push(`// Load JSON test data`);
                lines.push(`const ${iterateAs}Data = JSON.parse(`);
                lines.push(`  fs.readFileSync('${path}', 'utf-8')`);
                lines.push(`);`);
                break;

            case 'excel':
                lines.push(`// Load Excel test data`);
                lines.push(`const workbook = XLSX.readFile('${path}');`);
                lines.push(`const sheet = workbook.Sheets['${sheet || 'Sheet1'}'];`);
                lines.push(`const ${iterateAs}Data = XLSX.utils.sheet_to_json(sheet);`);
                break;

            case 'inline':
                lines.push(`// Inline test data`);
                lines.push(`const ${iterateAs}Data = ${JSON.stringify(data, null, 2)};`);
                break;
        }

        lines.push('');
        return lines;
    }

    /**
     * Generate environment variable declarations
     */
    generateEnvVariables(env?: Record<string, string>): string[] {
        if (!env || Object.keys(env).length === 0) return [];

        const lines: string[] = ['// Environment variables'];

        for (const [key, value] of Object.entries(env)) {
            // Check if value references an env var
            if (value.startsWith('{{env.')) {
                const envKey = value.match(/\{\{env\.(\w+)\}\}/)?.[1] || key;
                lines.push(`const ${key} = process.env.${envKey} || '';`);
            } else {
                lines.push(`const ${key} = process.env.${key} || ${JSON.stringify(value)};`);
            }
        }

        lines.push('');
        return lines;
    }

    /**
     * Generate flow-level variable declarations
     */
    generateFlowVariables(variables?: Record<string, any>): string[] {
        if (!variables || Object.keys(variables).length === 0) return [];

        const lines: string[] = ['// Flow variables'];

        for (const [key, value] of Object.entries(variables)) {
            const jsValue = typeof value === 'string' ? `'${value}'` : JSON.stringify(value);
            lines.push(`const ${key} = ${jsValue};`);
        }

        lines.push('');
        return lines;
    }

    /**
     * Generate a data-driven test wrapper
     */
    generateDataDrivenWrapper(
        config: FlowVariableConfig,
        testBodyCode: string
    ): string {
        const lines: string[] = [];
        const indent = ' '.repeat(this.options.indentSize);

        // Imports
        if (this.options.includeImports) {
            lines.push(...this.generateImports(config));
            lines.push('');
        }

        // Data loading
        if (config.dataSource) {
            lines.push(...this.generateDataLoading(config.dataSource));
        }

        // Environment variables
        if (config.env) {
            lines.push(...this.generateEnvVariables(config.env));
        }

        // Flow variables
        if (config.variables) {
            lines.push(...this.generateFlowVariables(config.variables));
        }

        // Test structure
        if (config.dataSource) {
            const { iterateAs } = config.dataSource;

            // Use test.describe.parallel for data-driven tests
            lines.push(`test.describe('${this.options.testName}', () => {`);
            lines.push(`${indent}for (const ${iterateAs} of ${iterateAs}Data) {`);
            lines.push(`${indent}${indent}test(\`Test with \${JSON.stringify(${iterateAs})}\`, async ({ page }) => {`);

            // Indent the test body
            const indentedBody = testBodyCode
                .split('\n')
                .map(line => `${indent}${indent}${indent}${line}`)
                .join('\n');
            lines.push(indentedBody);

            lines.push(`${indent}${indent}});`);
            lines.push(`${indent}}`);
            lines.push(`});`);
        } else {
            // Single test
            lines.push(`test('${this.options.testName}', async ({ page }) => {`);

            const indentedBody = testBodyCode
                .split('\n')
                .map(line => `${indent}${line}`)
                .join('\n');
            lines.push(indentedBody);

            lines.push(`});`);
        }

        return lines.join('\n');
    }

    /**
     * Interpolate variables in a code string using context
     */
    interpolateCode(code: string, context: VariableContext): string {
        return context.resolve(code);
    }

    /**
     * Generate variable interpolation in template literals
     */
    generateTemplateString(template: string, context: VariableContext): string {
        // Replace {{var}} with ${var} for JavaScript template literals
        let result = template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const trimmedPath = path.trim();

            // Check scope prefixes
            if (trimmedPath.startsWith('env.')) {
                const envKey = trimmedPath.slice(4);
                return `\${process.env.${envKey} || ''}`;
            }

            // For data iteration variables
            if (trimmedPath.includes('.')) {
                return `\${${trimmedPath}}`;
            }

            // Simple variable
            return `\${${trimmedPath}}`;
        });

        // Wrap in backticks if it contains interpolations
        if (result !== template) {
            result = `\`${result}\``;
        } else {
            result = `'${result}'`;
        }

        return result;
    }

    /**
     * Convert a static URL to one with variable interpolation
     */
    generateDynamicUrl(url: string): string {
        if (!url.includes('{{')) {
            return `'${url}'`;
        }

        return this.generateTemplateString(url, new VariableContext());
    }
}

// ============================================
// CODE GENERATION HELPERS
// ============================================

/**
 * Generate a complete test file with data iteration
 */
export function generateDataDrivenTestFile(
    flowConfig: FlowVariableConfig,
    testCode: string,
    options?: CodeGenOptions
): string {
    const generator = new DataDrivenCodeGenerator(options);
    return generator.generateDataDrivenWrapper(flowConfig, testCode);
}

/**
 * Generate variable declaration code from context
 */
export function generateVariableDeclarations(
    state: VariableContextState
): string {
    const lines: string[] = [];

    // Add hoisted variable declarations
    const allVars = new Set<string>();

    for (const scope of [state.flow, state.workflow]) {
        if (scope) {
            Object.keys(scope).forEach(key => allVars.add(key));
        }
    }

    if (allVars.size > 0) {
        lines.push('// Variable declarations');
        lines.push(`let ${Array.from(allVars).join(', ')};`);
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Transform {{variable}} in code to JavaScript interpolation
 */
export function transformVariableReferences(code: string): string {
    return code.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const trimmedPath = path.trim();

        if (trimmedPath.startsWith('env.')) {
            return `\${process.env.${trimmedPath.slice(4)}}`;
        }

        return `\${${trimmedPath}}`;
    });
}
