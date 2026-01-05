import {
    ProgramNode, PageNode, FeatureNode, ScenarioNode,
    FieldNode, ActionDefinitionNode, HookNode, StatementNode,
    SelectorNode, TargetNode, ExpressionNode, VerifyCondition
} from '../parser/ast.js';

export interface TranspileOptions {
    baseUrl?: string;
    outputDir?: string;
    pageObjectDir?: string;
    testDir?: string;
}

export interface TranspileResult {
    pages: Map<string, string>;  // pageName -> TypeScript code
    tests: Map<string, string>;  // featureName -> TypeScript code
}

export class Transpiler {
    private options: TranspileOptions;
    private indent = 0;

    constructor(options: TranspileOptions = {}) {
        this.options = {
            outputDir: './generated',
            pageObjectDir: 'pages',
            testDir: 'tests',
            ...options
        };
    }

    transpile(ast: ProgramNode): TranspileResult {
        const pages = new Map<string, string>();
        const tests = new Map<string, string>();

        for (const page of ast.pages) {
            pages.set(page.name, this.transpilePage(page));
        }

        for (const feature of ast.features) {
            tests.set(feature.name, this.transpileFeature(feature));
        }

        return { pages, tests };
    }

    // ==================== PAGE TRANSPILATION ====================

    private transpilePage(page: PageNode): string {
        const lines: string[] = [];

        lines.push("import { Page, Locator } from '@playwright/test';");
        lines.push('');
        lines.push(`export class ${page.name} {`);
        this.indent++;

        // Properties
        lines.push(this.line('readonly page: Page;'));
        for (const field of page.fields) {
            lines.push(this.line(`readonly ${field.name}: Locator;`));
        }
        for (const variable of page.variables) {
            const tsType = this.getTypeScriptType(variable.varType);
            lines.push(this.line(`${variable.name}: ${tsType};`));
        }

        lines.push('');

        // Constructor
        lines.push(this.line('constructor(page: Page) {'));
        this.indent++;
        lines.push(this.line('this.page = page;'));

        for (const field of page.fields) {
            const locator = this.transpileSelector(field.selector);
            lines.push(this.line(`this.${field.name} = ${locator};`));
        }

        for (const variable of page.variables) {
            const value = this.transpileLiteralValue(variable.value);
            lines.push(this.line(`this.${variable.name} = ${value};`));
        }

        this.indent--;
        lines.push(this.line('}'));

        // Actions
        for (const action of page.actions) {
            lines.push('');
            lines.push(this.transpileActionDefinition(action));
        }

        this.indent--;
        lines.push('}');

        return lines.join('\n');
    }

    private transpileActionDefinition(action: ActionDefinitionNode): string {
        const lines: string[] = [];
        const params = action.parameters.map(p => `${p}: string`).join(', ');
        const returnType = action.returnType
            ? `: Promise<${this.getTypeScriptType(action.returnType)}>`
            : '';

        lines.push(this.line(`async ${action.name}(${params})${returnType} {`));
        this.indent++;

        for (const statement of action.statements) {
            const code = this.transpileStatement(statement);
            if (code) lines.push(this.line(code));
        }

        this.indent--;
        lines.push(this.line('}'));

        return lines.join('\n');
    }

    // ==================== FEATURE TRANSPILATION ====================

    private transpileFeature(feature: FeatureNode): string {
        const lines: string[] = [];

        // Imports
        lines.push("import { test, expect } from '@playwright/test';");
        for (const usedPage of feature.uses) {
            lines.push(`import { ${usedPage} } from '../${this.options.pageObjectDir}/${usedPage}';`);
        }

        lines.push('');
        lines.push(`test.describe('${feature.name}', () => {`);
        this.indent++;

        // Page object variables
        if (feature.uses.length > 0) {
            for (const usedPage of feature.uses) {
                const varName = this.camelCase(usedPage);
                lines.push(this.line(`let ${varName}: ${usedPage};`));
            }
            lines.push('');
        }

        // Hooks
        for (const hook of feature.hooks) {
            lines.push(this.transpileHook(hook, feature.uses));
            lines.push('');
        }

        // Add default beforeEach if none exists but pages are used
        const hasBeforeEach = feature.hooks.some(h => h.hookType === 'BEFORE_EACH');
        if (!hasBeforeEach && feature.uses.length > 0) {
            lines.push(this.line('test.beforeEach(async ({ page }) => {'));
            this.indent++;
            for (const usedPage of feature.uses) {
                const varName = this.camelCase(usedPage);
                lines.push(this.line(`${varName} = new ${usedPage}(page);`));
            }
            this.indent--;
            lines.push(this.line('});'));
            lines.push('');
        }

        // Scenarios
        for (const scenario of feature.scenarios) {
            lines.push(this.transpileScenario(scenario, feature.uses));
            lines.push('');
        }

        this.indent--;
        lines.push('});');

        return lines.join('\n');
    }

    private transpileHook(hook: HookNode, uses: string[]): string {
        const lines: string[] = [];

        const hookMap: Record<string, string> = {
            'BEFORE_ALL': 'test.beforeAll',
            'BEFORE_EACH': 'test.beforeEach',
            'AFTER_ALL': 'test.afterAll',
            'AFTER_EACH': 'test.afterEach'
        };

        lines.push(this.line(`${hookMap[hook.hookType]}(async ({ page }) => {`));
        this.indent++;

        // Initialize page objects in beforeEach
        if (hook.hookType === 'BEFORE_EACH') {
            for (const usedPage of uses) {
                const varName = this.camelCase(usedPage);
                lines.push(this.line(`${varName} = new ${usedPage}(page);`));
            }
        }

        for (const statement of hook.statements) {
            const code = this.transpileStatement(statement, uses);
            if (code) lines.push(this.line(code));
        }

        this.indent--;
        lines.push(this.line('});'));

        return lines.join('\n');
    }

    private transpileScenario(scenario: ScenarioNode, uses: string[]): string {
        const lines: string[] = [];

        const tags = scenario.tags.map(t => `@${t}`).join(' ');
        const testName = tags ? `${scenario.name} ${tags}` : scenario.name;

        lines.push(this.line(`test('${testName}', async ({ page }) => {`));
        this.indent++;

        for (const statement of scenario.statements) {
            const code = this.transpileStatement(statement, uses);
            if (code) lines.push(this.line(code));
        }

        this.indent--;
        lines.push(this.line('});'));

        return lines.join('\n');
    }

    // ==================== STATEMENT TRANSPILATION ====================

    private transpileStatement(statement: StatementNode, uses: string[] = []): string {
        switch (statement.type) {
            case 'Click':
                return `await ${this.transpileTarget(statement.target, uses)}.click();`;

            case 'Fill':
                return `await ${this.transpileTarget(statement.target, uses)}.fill(${this.transpileExpression(statement.value)});`;

            case 'Open':
                return `await page.goto(${this.transpileExpression(statement.url)});`;

            case 'Check':
                return `await ${this.transpileTarget(statement.target, uses)}.check();`;

            case 'Hover':
                return `await ${this.transpileTarget(statement.target, uses)}.hover();`;

            case 'Press':
                return `await page.keyboard.press('${statement.key}');`;

            case 'Wait':
                if (statement.duration) {
                    const ms = statement.unit === 'milliseconds'
                        ? statement.duration
                        : statement.duration * 1000;
                    return `await page.waitForTimeout(${ms});`;
                }
                return `await page.waitForLoadState('networkidle');`;

            case 'Verify':
                return this.transpileVerify(statement.target, statement.condition, uses);

            case 'Do':
                return this.transpileDoAction(statement.action, uses);

            case 'Refresh':
                return 'await page.reload();';

            case 'TakeScreenshot':
                if (statement.filename) {
                    return `await page.screenshot({ path: '${statement.filename}' });`;
                }
                return `await page.screenshot();`;

            case 'Log':
                return `console.log(${this.transpileExpression(statement.message)});`;

            default:
                return `// Unknown statement type`;
        }
    }

    private transpileVerify(
        target: TargetNode | ExpressionNode,
        condition: VerifyCondition,
        uses: string[]
    ): string {
        const isNegated = condition.operator === 'IS_NOT';
        let locator: string;

        if ('type' in target && target.type === 'Target') {
            locator = this.transpileTarget(target, uses);
        } else {
            const expr = this.transpileExpression(target as ExpressionNode);
            locator = `page.getByText(${expr})`;
        }

        const assertions: Record<string, string> = {
            'VISIBLE': isNegated ? 'not.toBeVisible()' : 'toBeVisible()',
            'HIDDEN': isNegated ? 'toBeVisible()' : 'toBeHidden()',
            'ENABLED': isNegated ? 'toBeDisabled()' : 'toBeEnabled()',
            'DISABLED': isNegated ? 'toBeEnabled()' : 'toBeDisabled()',
            'CHECKED': isNegated ? 'not.toBeChecked()' : 'toBeChecked()',
            'EMPTY': isNegated ? 'not.toBeEmpty()' : 'toBeEmpty()',
        };

        const assertion = assertions[condition.value as string] || 'toBeVisible()';
        return `await expect(${locator}).${assertion};`;
    }

    private transpileDoAction(
        action: { page?: string; action: string; arguments: ExpressionNode[] },
        uses: string[]
    ): string {
        const args = action.arguments.map(a => this.transpileExpression(a)).join(', ');

        if (action.page) {
            const varName = this.camelCase(action.page);
            return `await ${varName}.${action.action}(${args});`;
        }

        return `await ${action.action}(${args});`;
    }

    // ==================== HELPER METHODS ====================

    private transpileSelector(selector: SelectorNode): string {
        // All selectors now use auto-detection
        return this.transpileAutoSelector(selector.value);
    }

    /**
     * Smart selector detection for 'auto' type.
     * Analyzes the string to determine the best Playwright locator method.
     */
    private transpileAutoSelector(value: string): string {
        // CSS ID selector: #myId
        if (value.startsWith('#')) {
            return `page.locator('${value}')`;
        }
        // CSS class selector: .myClass
        if (value.startsWith('.')) {
            return `page.locator('${value}')`;
        }
        // CSS attribute selector: [data-testid="foo"]
        if (value.startsWith('[') && value.includes(']')) {
            return `page.locator('${value}')`;
        }
        // XPath selector: //div or /html
        if (value.startsWith('//') || value.startsWith('/html')) {
            return `page.locator('${value}')`;
        }
        // CSS child/descendant selectors: div > span, div span (look for HTML tag pattern)
        if (value.includes('>') || value.includes('~') || value.includes('+')) {
            return `page.locator('${value}')`;
        }
        // CSS pseudo-selectors: :nth-child, :first-child, etc.
        if (value.includes(':') && /:[a-z-]+(\(|$)/i.test(value)) {
            return `page.locator('${value}')`;
        }
        // Looks like CSS if it starts with a tag name followed by a selector: div.class, input#id
        if (/^[a-z]+[.#\[]/i.test(value)) {
            return `page.locator('${value}')`;
        }
        // Default: treat as human-readable text - use getByText for broad matching
        return `page.getByText('${value}')`;
    }

    private transpileTarget(target: TargetNode, uses: string[] = []): string {
        if (target.text) {
            return `page.getByText('${target.text}')`;
        }

        if (target.selector) {
            return this.transpileSelector(target.selector);
        }

        if (target.page && target.field) {
            const varName = this.camelCase(target.page);
            return `${varName}.${target.field}`;
        }

        if (target.field) {
            return `this.${target.field}`;
        }

        return 'page';
    }

    private transpileExpression(expr: ExpressionNode): string {
        switch (expr.type) {
            case 'StringLiteral':
                return `'${expr.value.replace(/'/g, "\\'")}'`;
            case 'NumberLiteral':
                return expr.value.toString();
            case 'BooleanLiteral':
                return expr.value.toString();
            case 'VariableReference':
                if (expr.page) {
                    return `${this.camelCase(expr.page)}.${expr.name}`;
                }
                return expr.name;
            default:
                return 'null';
        }
    }

    private transpileLiteralValue(value: unknown): string {
        if (typeof value === 'string') return `'${value.replace(/'/g, "\\'")}'`;
        if (typeof value === 'number' || typeof value === 'boolean') return value.toString();
        return 'null';
    }

    private getTypeScriptType(veroType: string): string {
        const typeMap: Record<string, string> = {
            'TEXT': 'string',
            'NUMBER': 'number',
            'FLAG': 'boolean',
            'LIST': 'string[]'
        };
        return typeMap[veroType.toUpperCase()] || 'unknown';
    }

    private camelCase(str: string): string {
        return str.charAt(0).toLowerCase() + str.slice(1);
    }

    private line(content: string): string {
        return '  '.repeat(this.indent) + content;
    }
}

export function transpile(ast: ProgramNode, options?: TranspileOptions): TranspileResult {
    const transpiler = new Transpiler(options);
    return transpiler.transpile(ast);
}
