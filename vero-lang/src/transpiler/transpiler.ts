import {
    ProgramNode, PageNode, PageActionsNode, FeatureNode, ScenarioNode,
    FieldNode, ActionDefinitionNode, HookNode, StatementNode,
    SelectorNode, SelectorModifier, TargetNode, ExpressionNode, VerifyCondition,
    LoadStatement, ForEachStatement, WhereClause,
    DataQueryStatement,
    DataCondition, DataComparison,
    FixtureNode,
    UploadStatement, VerifyUrlStatement, VerifyTitleStatement, VerifyHasStatement,
    VerifyScreenshotStatement, VerifyScreenshotOptions,
    // Variable verification types
    VerifyVariableStatement, VariableCondition, PerformAssignmentStatement,
    // Wait and Return statements
    WaitForStatement, ReturnStatement,
    // New ROW/ROWS syntax types
    RowStatement, RowsStatement, ColumnAccessStatement, CountStatement, SimpleTableReference,
    // Utility function types
    UtilityAssignmentStatement, UtilityExpressionNode,
    TrimExpression, ConvertExpression, ExtractExpression, ReplaceExpression,
    SplitExpression, JoinExpression, LengthExpression, PadExpression,
    TodayExpression, NowExpression, AddDateExpression, SubtractDateExpression,
    FormatExpression, DatePartExpression, RoundExpression, AbsoluteExpression,
    GenerateExpression, RandomNumberExpression, ChainedExpression,
    SwitchToNewTabStatement,
    SwitchToTabStatement,
    OpenInNewTabStatement,
    CloseTabStatement,
    // TRY/CATCH and API
    TryCatchStatement,
    SelectStatement, IfElseStatement, BooleanExpression, RepeatStatement,
    ApiRequestStatement, VerifyResponseStatement,
    MockApiStatement
} from '../parser/ast.js';
import {
    camelCase, pascalCase, inferTypeFromValue, toReadableTestName, escapeString
} from './transpilerUtils.js';
import {
    generateDebugHelper as generateDebugHelperFn,
    wrapWithDebug as wrapWithDebugFn,
    getStatementTarget as getStatementTargetFn
} from './transpilerDebug.js';
import {
    transpileDataQueryStatement as transpileDataQueryStatementFn,
    type TranspilerHelpers
} from './transpilerVdql.js';
import {
    transpileTabOperation as transpileTabOperationFn,
    generatePageObjectReInit as generatePageObjectReInitFn,
    type TabTranspilerHelpers
} from './transpilerTabs.js';
import { collectFeatureReferences } from './featureReferenceCollector.js';

export interface TranspileOptions {
    baseUrl?: string;
    outputDir?: string;
    pageObjectDir?: string;
    testDir?: string;
    debugMode?: boolean;  // Enable debug step markers for line-by-line debugging
}

export interface TranspileResult {
    pages: Map<string, string>;        // pageName -> TypeScript code
    pageActions: Map<string, string>;  // pageActionsName -> TypeScript code
    tests: Map<string, string>;        // featureName -> TypeScript code
    fixtures: Map<string, string>;     // fixtureName -> TypeScript code
    fixturesIndex?: string;            // Combined fixtures export file
}

export class Transpiler {
    private options: TranspileOptions;
    private indent = 0;
    private usedTables: Set<string> = new Set();  // Track tables used in VDQL
    private tempVarCounter = 0;
    private _useFrameContext = false;  // True when inside a scenario with frame operations

    constructor(options: TranspileOptions = {}) {
        this.options = {
            outputDir: './generated',
            pageObjectDir: 'pages',
            testDir: 'tests',
            ...options
        };
    }

    /**
     * Check if a feature uses any environment variable references
     */
    private usesEnvVars(feature: FeatureNode): boolean {
        return this.nodeHasEnvVarReference(feature);
    }

    /**
     * Recursively scan an AST node for EnvVarReference expressions.
     * This covers ROW/ROWS WHERE clauses and other nested expression positions.
     */
    private nodeHasEnvVarReference(node: unknown): boolean {
        if (node === null || node === undefined) return false;
        if (Array.isArray(node)) {
            return node.some((item) => this.nodeHasEnvVarReference(item));
        }
        if (typeof node !== 'object') return false;

        const nodeRecord = node as Record<string, unknown>;
        if (nodeRecord.type === 'EnvVarReference') {
            return true;
        }

        return Object.values(nodeRecord).some((value) => this.nodeHasEnvVarReference(value));
    }

    /**
     * Collect all table names used in VDQL queries within a feature
     */
    private collectUsedTablesFromStatements(statements: StatementNode[], target: Set<string>): void {
        for (const stmt of statements) {
            switch (stmt.type) {
                case 'DataQuery':
                    target.add(stmt.query.tableRef.tableName);
                    break;
                case 'Load':
                    target.add(stmt.tableName);
                    break;
                case 'ForEach':
                    this.collectUsedTablesFromStatements(stmt.statements, target);
                    break;
                case 'TryCatch':
                    this.collectUsedTablesFromStatements(stmt.tryStatements, target);
                    this.collectUsedTablesFromStatements(stmt.catchStatements, target);
                    break;
                case 'IfElse':
                    this.collectUsedTablesFromStatements(stmt.ifStatements, target);
                    this.collectUsedTablesFromStatements(stmt.elseStatements, target);
                    break;
                case 'Repeat':
                    this.collectUsedTablesFromStatements(stmt.statements, target);
                    break;
                case 'Row':
                    target.add(stmt.tableRef.tableName);
                    break;
                case 'Rows':
                    target.add(stmt.tableRef.tableName);
                    break;
                case 'ColumnAccess':
                    target.add(stmt.tableRef.tableName);
                    break;
                case 'Count':
                    target.add(stmt.tableRef.tableName);
                    break;
            }
        }
    }

    private collectUsedTables(feature: FeatureNode): string[] {
        this.usedTables.clear();

        // Collect from hooks
        for (const hook of feature.hooks) {
            this.collectUsedTablesFromStatements(hook.statements, this.usedTables);
        }

        // Collect from scenarios
        for (const scenario of feature.scenarios) {
            this.collectUsedTablesFromStatements(scenario.statements, this.usedTables);
        }

        return [...this.usedTables];
    }

    private collectUsedTablesFromPageActions(pa: PageActionsNode): string[] {
        this.usedTables.clear();
        for (const action of pa.actions) {
            this.collectUsedTablesFromStatements(action.statements, this.usedTables);
        }

        return [...this.usedTables];
    }

    transpile(ast: ProgramNode): TranspileResult {
        this.tempVarCounter = 0;
        const pages = new Map<string, string>();
        const pageActions = new Map<string, string>();
        const tests = new Map<string, string>();
        const fixtures = new Map<string, string>();

        for (const page of ast.pages) {
            pages.set(page.name, this.transpilePage(page));
        }

        for (const pa of ast.pageActions) {
            pageActions.set(pa.name, this.transpilePageActions(pa, ast.pages));
        }

        for (const fixture of ast.fixtures) {
            fixtures.set(fixture.name, this.transpileFixture(fixture));
        }

        // Generate fixtures index file if there are fixtures
        let fixturesIndex: string | undefined;
        if (ast.fixtures.length > 0) {
            fixturesIndex = this.generateFixturesIndex(ast.fixtures);
        }

        for (const feature of ast.features) {
            tests.set(feature.name, this.transpileFeature(feature, ast.fixtures));
        }

        return { pages, pageActions, tests, fixtures, fixturesIndex };
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
            lines.push(this.transpileActionDefinition(action, page.name));
        }

        this.indent--;
        lines.push('}');

        return lines.join('\n');
    }

    // ==================== PAGEACTIONS TRANSPILATION ====================

    private transpilePageActions(pa: PageActionsNode, pages: PageNode[]): string {
        const lines: string[] = [];
        const boundPage = pages.find(p => p.name === pa.forPage);
        const usedTables = this.collectUsedTablesFromPageActions(pa);
        const hasVDQL = usedTables.length > 0;

        lines.push("import { Page, Locator } from '@playwright/test';");
        lines.push(`import { ${pa.forPage} } from './${pa.forPage}';`);
        if (hasVDQL) {
            lines.push("import { createDataManager } from '../runtime/DataManager';");
            lines.push("import { testDataApi } from '../api/testDataApi';");
        }
        lines.push('');

        if (hasVDQL) {
            lines.push("const __env__: Record<string, string> = JSON.parse(process.env.VERO_ENV_VARS || '{}');");
            lines.push('');
            lines.push('const dataManager = createDataManager({');
            lines.push('    fetchTable: (tableName) => testDataApi.getTableData(tableName)');
            lines.push('});');
            lines.push('');
            lines.push('const Data: Record<string, any> & {');
            lines.push('    resolveReferences: (table: string, row: any) => any;');
            lines.push('    resolveReferencesMany: (table: string, rows: any[]) => any[];');
            lines.push('} = {');
            lines.push('    resolveReferences: (_table, row) => row,');
            lines.push('    resolveReferencesMany: (_table, rows) => rows,');
            lines.push('};');
            lines.push('');
        }

        lines.push(`export class ${pa.name} {`);
        this.indent++;

        // Properties
        lines.push(this.line('readonly page: Page;'));
        lines.push(this.line(`private readonly ${this.camelCase(pa.forPage)}: ${pa.forPage};`));
        lines.push('');

        // Constructor
        lines.push(this.line('constructor(page: Page) {'));
        this.indent++;
        lines.push(this.line('this.page = page;'));
        lines.push(this.line(`this.${this.camelCase(pa.forPage)} = new ${pa.forPage}(page);`));
        this.indent--;
        lines.push(this.line('}'));

        if (hasVDQL) {
            lines.push('');
            lines.push(this.line('private static __dataReady = false;'));
            lines.push('');
            lines.push(this.line('private static async __ensureDataLoaded(): Promise<void> {'));
            this.indent++;
            lines.push(this.line(`if (${pa.name}.__dataReady) return;`));
            const tableList = usedTables.map((t) => `'${t}'`).join(', ');
            lines.push(this.line(`await dataManager.preloadTables([${tableList}]);`));
            for (const table of usedTables) {
                lines.push(this.line(`Data['${table}'] = dataManager.query('${table}').execute();`));
            }
            lines.push(this.line(`${pa.name}.__dataReady = true;`));
            this.indent--;
            lines.push(this.line('}'));
        }

        // Actions - these can access the bound page's fields.
        // Group by action name so we can transpile same-name methods as overload dispatch.
        const actionGroups = new Map<string, ActionDefinitionNode[]>();
        const orderedActionNames: string[] = [];
        for (const action of pa.actions) {
            const existing = actionGroups.get(action.name);
            if (!existing) {
                actionGroups.set(action.name, [action]);
                orderedActionNames.push(action.name);
            } else {
                existing.push(action);
            }
        }

        for (const actionName of orderedActionNames) {
            const overloads = actionGroups.get(actionName) || [];
            lines.push('');
            if (overloads.length === 1) {
                lines.push(this.transpilePageActionsMethod(overloads[0], pa.name, pa.forPage, boundPage, hasVDQL));
            } else {
                lines.push(this.transpileOverloadedPageActionsMethod(actionName, overloads, pa.name, pa.forPage, boundPage, hasVDQL));
            }
        }

        this.indent--;
        lines.push('}');

        return lines.join('\n');
    }

    private getOverloadedPageActionsReturnType(overloads: ActionDefinitionNode[]): string {
        const signatureTypes = new Set(overloads.map((ov) => ov.returnType ?? 'void'));
        if (signatureTypes.size === 1) {
            const onlyType = overloads[0].returnType;
            return onlyType
                ? `: Promise<${this.getTypeScriptType(onlyType)}>`
                : ': Promise<void>';
        }
        return ': Promise<any>';
    }

    private transpileOverloadedPageActionsMethod(
        actionName: string,
        overloads: ActionDefinitionNode[],
        pageActionsName: string,
        forPage: string,
        boundPage?: PageNode,
        hasVDQL = false
    ): string {
        const lines: string[] = [];
        const returnType = this.getOverloadedPageActionsReturnType(overloads);
        const overloadByArity = new Map<number, ActionDefinitionNode>();

        // If duplicate arity exists, keep the latest declaration (same as JS last-write semantics).
        for (const overload of overloads) {
            overloadByArity.set(overload.parameters.length, overload);
        }
        const arities = Array.from(overloadByArity.keys()).sort((a, b) => a - b);

        lines.push(this.line(`async ${actionName}(...__args: string[])${returnType} {`));
        this.indent++;

        if (hasVDQL) {
            lines.push(this.line(`await ${pageActionsName}.__ensureDataLoaded();`));
        }

        for (const arity of arities) {
            const overload = overloadByArity.get(arity)!;
            lines.push(this.line(`if (__args.length === ${arity}) {`));
            this.indent++;

            if (arity > 0) {
                lines.push(this.line(`const [${overload.parameters.join(', ')}] = __args;`));
            }

            for (const statement of overload.statements) {
                const code = this.transpilePageActionsStatement(statement, forPage, boundPage);
                if (code) lines.push(this.line(code));
            }

            if (!overload.returnType) {
                lines.push(this.line('return;'));
            }

            this.indent--;
            lines.push(this.line('}'));
        }

        lines.push(this.line(`throw new Error('No overload for ${actionName} with ' + __args.length + ' argument(s)');`));
        this.indent--;
        lines.push(this.line('}'));

        return lines.join('\n');
    }

    private transpilePageActionsMethod(
        action: ActionDefinitionNode,
        pageActionsName: string,
        forPage: string,
        boundPage?: PageNode,
        hasVDQL = false
    ): string {
        const lines: string[] = [];
        const params = action.parameters.map(p => `${p}: string`).join(', ');
        const returnType = action.returnType
            ? `: Promise<${this.getTypeScriptType(action.returnType)}>`
            : ': Promise<void>';

        lines.push(this.line(`async ${action.name}(${params})${returnType} {`));
        this.indent++;

        if (hasVDQL) {
            lines.push(this.line(`await ${pageActionsName}.__ensureDataLoaded();`));
        }

        for (const statement of action.statements) {
            // Pass the bound page name as context so fields resolve correctly
            const code = this.transpilePageActionsStatement(statement, forPage, boundPage);
            if (code) lines.push(this.line(code));
        }

        this.indent--;
        lines.push(this.line('}'));

        return lines.join('\n');
    }

    private transpilePageActionsStatement(statement: StatementNode, forPage: string, boundPage?: PageNode): string {
        // PageActions methods should NOT use test.step - they're reusable helpers
        // Generate simple Playwright calls without test.step wrapping
        const boundPageVar = this.camelCase(forPage);

        const resolveField = (field: string): string => {
            if (boundPage && boundPage.fields.some(f => f.name === field)) {
                return `this.${boundPageVar}.${field}`;
            }
            return `this.${field}`;
        };

        switch (statement.type) {
            case 'Click': {
                if (statement.target.field) {
                    return `await ${resolveField(statement.target.field)}.click();`;
                }
                if (statement.target.text) {
                    return `await this.page.getByText('${statement.target.text}').click();`;
                }
                return '';
            }
            case 'Fill': {
                const value = this.transpileExpression(statement.value);
                if (statement.target.field) {
                    return `await ${resolveField(statement.target.field)}.fill(${value});`;
                }
                return '';
            }
            case 'WaitFor': {
                if (statement.target.field) {
                    return `await ${resolveField(statement.target.field)}.waitFor({ state: 'visible' });`;
                }
                return '';
            }
            case 'Return': {
                switch (statement.returnType) {
                    case 'VISIBLE': {
                        if (statement.target?.field) {
                            return `return await ${resolveField(statement.target.field)}.isVisible();`;
                        }
                        return '';
                    }
                    case 'TEXT': {
                        if (statement.target?.field) {
                            return `return await ${resolveField(statement.target.field)}.textContent() || '';`;
                        }
                        return '';
                    }
                    case 'VALUE': {
                        if (statement.target?.field) {
                            return `return await ${resolveField(statement.target.field)}.inputValue();`;
                        }
                        return '';
                    }
                    case 'EXPRESSION': {
                        return `return ${this.transpileExpression(statement.expression!)};`;
                    }
                }
                return '';
            }
            case 'Verify': {
                // Verifications in PageActions should just execute, not use expect
                const target = statement.target as TargetNode;
                if (target && target.field) {
                    const locator = resolveField(target.field);
                    if (statement.condition.value === 'VISIBLE') {
                        return `await ${locator}.waitFor({ state: 'visible' });`;
                    }
                }
                return '';
            }
            case 'Press': {
                return `await this.page.keyboard.press('${statement.key}');`;
            }
            case 'Open': {
                return `await this.page.goto(${this.transpileExpression(statement.url)});`;
            }
            default:
                // Fall back to regular transpilation for other statement types
                let code = this.transpileStatement(statement, [forPage], forPage);
                // Remove test.step wrappers
                code = code.replace(/await test\.step\([^)]+, async \(\) => \{ (.*) \}\);/g, '$1');
                // Ensure page-scoped operations are bound to the PageActions instance.
                code = code.replace(/\bpage\./g, 'this.page.');
                // Fix field references
                code = code.replace(/this\.(\w+)\./g, (match, fieldName) => {
                    if (boundPage && boundPage.fields.some(f => f.name === fieldName)) {
                        return `this.${boundPageVar}.${fieldName}.`;
                    }
                    return match;
                });
                return code;
        }
    }

    private transpileActionDefinition(action: ActionDefinitionNode, pageName?: string): string {
        const lines: string[] = [];
        const params = action.parameters.map(p => `${p}: string`).join(', ');
        const returnType = action.returnType
            ? `: Promise<${this.getTypeScriptType(action.returnType)}>`
            : '';

        lines.push(this.line(`async ${action.name}(${params})${returnType} {`));
        this.indent++;

        for (const statement of action.statements) {
            // Pass empty uses array and the current page name for context
            const code = this.transpileStatement(statement, [], pageName);
            if (code) lines.push(this.line(code));
        }

        this.indent--;
        lines.push(this.line('}'));

        return lines.join('\n');
    }

    private unwrapTestStepForFixture(code: string): string {
        const match = code.match(/^await test\.step\([^,]+,\s*async \(\) => \{ (.*) \}\);$/);
        return match ? match[1] : code;
    }

    // ==================== FIXTURE TRANSPILATION ====================

    /**
     * Transpile a single fixture to Playwright test.extend() pattern
     */
    private transpileFixture(fixture: FixtureNode): string {
        const lines: string[] = [];
        const { name, parameters, scope, dependencies, auto, options, setup, teardown } = fixture;

        lines.push("import { test as base } from '@playwright/test';");
        lines.push('');

        // Generate fixture type interface
        lines.push(`export interface ${this.pascalCase(name)}Fixture {`);
        this.indent++;
        // For parameterized fixtures, add option types
        for (const opt of options) {
            const defaultVal = this.transpileExpression(opt.defaultValue);
            const tsType = this.inferTypeFromValue(defaultVal);
            lines.push(this.line(`${opt.name}?: ${tsType};`));
        }
        if (options.length === 0) {
            lines.push(this.line('// No parameters'));
        }
        this.indent--;
        lines.push('}');
        lines.push('');

        // Generate the fixture extension
        lines.push(`export const ${name}Fixture = base.extend<{ ${name}: void }>({`);
        this.indent++;

        // Build dependencies string
        // Worker fixtures cannot depend on test-scoped fixtures like "page".
        const defaultDependency = scope === 'worker' ? 'browser' : 'page';
        const deps = dependencies.length > 0 ? dependencies.join(', ') : defaultDependency;

        // Auto fixture option
        const scopeAndAuto = [];
        if (scope === 'worker') {
            scopeAndAuto.push(`scope: 'worker'`);
        }
        if (auto) {
            scopeAndAuto.push(`auto: true`);
        }

        const fixtureOptions = scopeAndAuto.length > 0
            ? `[async ({ ${deps} }, use) => {\n`
            : `async ({ ${deps} }, use) => {`;

        lines.push(this.line(`${name}: ${fixtureOptions}`));
        this.indent++;

        // Setup code
        if (setup.length > 0) {
            lines.push(this.line('// Setup'));
            for (const stmt of setup) {
                const code = this.transpileStatement(stmt);
                if (code) lines.push(this.line(this.unwrapTestStepForFixture(code)));
            }
        }

        lines.push('');
        lines.push(this.line('await use(undefined);'));
        lines.push('');

        // Teardown code
        if (teardown.length > 0) {
            lines.push(this.line('// Teardown'));
            for (const stmt of teardown) {
                const code = this.transpileStatement(stmt);
                if (code) lines.push(this.line(this.unwrapTestStepForFixture(code)));
            }
        }

        this.indent--;

        if (scopeAndAuto.length > 0) {
            lines.push(this.line(`}, { ${scopeAndAuto.join(', ')} }],`));
        } else {
            lines.push(this.line('},'));
        }

        this.indent--;
        lines.push('});');
        lines.push('');

        // Export the test with fixture
        lines.push(`export const test = ${name}Fixture;`);

        return lines.join('\n');
    }

    /**
     * Generate a combined fixtures index file that exports all fixtures
     */
    private generateFixturesIndex(fixtures: FixtureNode[]): string {
        const lines: string[] = [];

        lines.push("import { test as base, mergeTests } from '@playwright/test';");
        lines.push('');

        // Import all individual fixtures
        for (const fixture of fixtures) {
            lines.push(`import { ${fixture.name}Fixture } from './${fixture.name}';`);
        }
        lines.push('');

        // Generate combined fixture type
        lines.push('// Combined fixture types');
        lines.push('export interface VeroFixtures {');
        this.indent++;
        for (const fixture of fixtures) {
            lines.push(this.line(`${fixture.name}: void;`));
        }
        this.indent--;
        lines.push('}');
        lines.push('');

        // Merge all fixtures
        if (fixtures.length === 1) {
            lines.push(`export const test = ${fixtures[0].name}Fixture;`);
        } else if (fixtures.length > 1) {
            const fixtureNames = fixtures.map(f => `${f.name}Fixture`).join(', ');
            lines.push(`export const test = mergeTests(${fixtureNames});`);
        }
        lines.push('');

        lines.push("export { expect } from '@playwright/test';");

        return lines.join('\n');
    }

    // ==================== FEATURE TRANSPILATION ====================

    /**
     * Check if a feature uses any utility functions
     */
    private usesUtilityFunctions(feature: FeatureNode): boolean {
        return this.featureHasStatement(feature, stmt => stmt.type === 'UtilityAssignment');
    }

    /**
     * Check if a feature uses API requests (needs `request` fixture and `__vero_apiResponse` variable)
     */
    private usesApiRequests(feature: FeatureNode): boolean {
        return this.featureHasStatement(feature, stmt =>
            stmt.type === 'ApiRequest' || stmt.type === 'VerifyResponse'
        );
    }

    private usesAllureTags(feature: FeatureNode): boolean {
        return feature.scenarios.some(s => s.tags.length > 0);
    }

    private transpileFeature(feature: FeatureNode, allFixtures: FixtureNode[] = []): string {
        const lines: string[] = [];

        // Infer page/pageActions dependencies from feature body (replaces USE)
        const useNames = collectFeatureReferences(feature);

        // Collect all tables used in VDQL queries
        const usedTables = this.collectUsedTables(feature);
        const hasVDQL = usedTables.length > 0;

        // Check if feature uses any environment variables
        const hasEnvVars = this.usesEnvVars(feature);

        // Check if feature uses any fixtures
        const usesFixtures = feature.fixtures.length > 0;

        // Check if feature uses utility functions
        const hasUtilityFunctions = this.usesUtilityFunctions(feature);

        // Check if feature uses API requests
        const hasApiRequests = this.usesApiRequests(feature);

        // Check if any scenarios have @tags for Allure labels
        const hasAllureTags = this.usesAllureTags(feature);

        // Imports - use fixtures test if fixtures are used
        if (usesFixtures) {
            lines.push("import { test, expect } from '../fixtures';");
        } else {
            lines.push("import { test, expect } from '@playwright/test';");
        }
        lines.push("import path from 'path';");
        lines.push("import fsPromises from 'fs/promises';");
        for (const name of useNames) {
            lines.push(`import { ${name} } from '../${this.options.pageObjectDir}/${name}';`);
        }

        // Add VeroUtils imports if utility functions are used
        if (hasUtilityFunctions) {
            lines.push("import { veroString, veroDate, veroNumber, veroConvert, veroGenerate } from '../runtime/VeroUtils';");
        }

        // Add allure-js-commons imports: always parentSuite/suite for breadcrumbs, tag if @tags used
        const allureImports = ['parentSuite', 'suite', 'subSuite', 'label as allureLabel'];
        if (hasAllureTags) {
            allureImports.push('tag as allureTag');
        }
        lines.push(`import { ${allureImports.join(', ')} } from 'allure-js-commons';`);

        // Add debug helper when debug mode is enabled
        if (this.options.debugMode) {
            lines.push('');
            lines.push(this.generateDebugHelper());
        }

        // Add DataManager imports if VDQL is used
        if (hasVDQL) {
            lines.push("import {");
            lines.push("    DataManager, createDataManager,");
            lines.push("    eq, neq, gt, lt, gte, lte,");
            lines.push("    contains, startsWith, endsWith, matches,");
            lines.push("    isIn, notIn, isEmpty, isNotEmpty, isNull,");
            lines.push("    and, or, not");
            lines.push("} from '../runtime/DataManager';");
            lines.push("import { testDataApi } from '../api/testDataApi';");
        }

        // Add environment variable loading if env vars are used
        // Variables are passed via VERO_ENV_VARS environment variable as JSON
        if (hasEnvVars) {
            lines.push('');
            lines.push('// Environment variables loaded from VERO_ENV_VARS');
            lines.push('// Set by Vero IDE when executing tests with an active environment');
            lines.push("const __env__: Record<string, string> = JSON.parse(process.env.VERO_ENV_VARS || '{}');");
        }

        lines.push('');

        // Determine describe modifier based on annotations
        const hasSerial = feature.annotations.includes('serial');
        const hasSkip = feature.annotations.includes('skip');
        const hasOnly = feature.annotations.includes('only');

        let describeCall = 'test.describe';
        if (hasSerial) {
            describeCall = 'test.describe.serial';
        }
        if (hasSkip) {
            describeCall = hasSerial ? 'test.describe.serial.skip' : 'test.describe.skip';
        } else if (hasOnly) {
            describeCall = hasSerial ? 'test.describe.serial.only' : 'test.describe.only';
        }

        lines.push(`${describeCall}('${feature.name}', () => {`);
        this.indent++;

        // Enable per-feature parallel execution unless the feature is explicitly serial.
        if (!hasSerial) {
            lines.push(this.line("test.describe.configure({ mode: 'parallel' });"));
            lines.push('');
        }

        // Page object variables
        if (useNames.length > 0) {
            for (const name of useNames) {
                const varName = this.camelCase(name);
                lines.push(this.line(`let ${varName}: ${name};`));
            }
            lines.push('');
        }

        // API response variable for API testing
        if (hasApiRequests) {
            lines.push(this.line('let __vero_apiResponse: any;'));
            lines.push('');
        }

        // DataManager instance if VDQL is used
        if (hasVDQL) {
            lines.push(this.line('// DataManager with in-memory POJO cache'));
            lines.push(this.line('const dataManager = createDataManager({'));
            this.indent++;
            lines.push(this.line('fetchTable: (tableName) => testDataApi.getTableData(tableName)'));
            this.indent--;
            lines.push(this.line('});'));
            lines.push('');

            // Data proxy object — populated in beforeAll after preloading
            lines.push(this.line('const Data: Record<string, any> & {'));
            this.indent++;
            lines.push(this.line('resolveReferences: (table: string, row: any) => any;'));
            lines.push(this.line('resolveReferencesMany: (table: string, rows: any[]) => any[];'));
            this.indent--;
            lines.push(this.line('} = {'));
            this.indent++;
            lines.push(this.line('resolveReferences: (_table, row) => row,'));
            lines.push(this.line('resolveReferencesMany: (_table, rows) => rows,'));
            this.indent--;
            lines.push(this.line('};'));
            lines.push('');

            // Generate beforeAll to preload tables
            lines.push(this.line('// Preload all test data tables ONCE before tests run'));
            lines.push(this.line('test.beforeAll(async () => {'));
            this.indent++;
            const tableList = usedTables.map(t => `'${t}'`).join(', ');
            lines.push(this.line(`await dataManager.preloadTables([${tableList}]);`));
            // Populate Data object with loaded table arrays
            for (const table of usedTables) {
                lines.push(this.line(`Data['${table}'] = dataManager.query('${table}').execute();`));
            }
            this.indent--;
            lines.push(this.line('});'));
            lines.push('');
        }

        // User-defined hooks
        for (const hook of feature.hooks) {
            const hookNeedsContext = this.hookNeedsContext(hook);
            lines.push(this.transpileHook(hook, useNames, hookNeedsContext));
            lines.push('');
        }

        // Add default beforeEach if none exists but pages are used
        const hasBeforeEach = feature.hooks.some(h => h.hookType === 'BEFORE_EACH');
        if (!hasBeforeEach && useNames.length > 0) {
            lines.push(this.line(`test.beforeEach(async ({ page }) => {`));
            this.indent++;
            for (const name of useNames) {
                const varName = this.camelCase(name);
                lines.push(this.line(`${varName} = new ${name}(page);`));
            }
            this.indent--;
            lines.push(this.line('});'));
            lines.push('');
        }

        // Scenarios
        for (const scenario of feature.scenarios) {
            lines.push(this.transpileScenario(scenario, useNames, feature.name));
            lines.push('');
        }

        this.indent--;
        lines.push('});');

        return lines.join('\n');
    }

    private transpileHook(hook: HookNode, uses: string[], needsContext = false): string {
        const lines: string[] = [];

        const hookMap: Record<string, string> = {
            'BEFORE_ALL': 'test.beforeAll',
            'BEFORE_EACH': 'test.beforeEach',
            'AFTER_ALL': 'test.afterAll',
            'AFTER_EACH': 'test.afterEach'
        };

        const isAllHook = hook.hookType === 'BEFORE_ALL' || hook.hookType === 'AFTER_ALL';
        if (isAllHook) {
            // Playwright does not allow page/context fixtures in beforeAll/afterAll.
            lines.push(this.line(`${hookMap[hook.hookType]}(async () => {`));
        } else {
            const params = needsContext ? '{ page: _page, context }' : '{ page }';
            lines.push(this.line(`${hookMap[hook.hookType]}(async (${params}, testInfo) => {`));
        }
        this.indent++;

        // When tab operations are used, declare page as a mutable let variable
        if (needsContext && !isAllHook) {
            lines.push(this.line('let page = _page;'));
        }

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

    private transpileScenario(scenario: ScenarioNode, uses: string[], featureName: string): string {
        const lines: string[] = [];
        const needsContext = this.scenarioNeedsContext(scenario);
        const needsFrame = this.scenarioNeedsFrame(scenario);
        const needsApiRequest = this.scenarioNeedsApiRequest(scenario);

        const tags = scenario.tags.map(t => `@${t}`).join(' ');
        const readableName = this.toReadableTestName(scenario.name);
        const testName = tags ? `${readableName} ${tags}` : readableName;

        // Determine test modifier based on annotations
        const hasSkip = scenario.annotations.includes('skip');
        const hasOnly = scenario.annotations.includes('only');
        const hasSlow = scenario.annotations.includes('slow');
        const hasFixme = scenario.annotations.includes('fixme');

        // Determine test call: test.skip, test.only, test.fixme, or test
        let testCall = 'test';
        if (hasSkip) {
            testCall = 'test.skip';
        } else if (hasOnly) {
            testCall = 'test.only';
        } else if (hasFixme) {
            testCall = 'test.fixme';
        }

        // Build destructured params
        const paramParts: string[] = [];
        if (needsContext) {
            paramParts.push('page: _page', 'context');
        } else {
            paramParts.push('page');
        }
        if (needsApiRequest) {
            paramParts.push('request');
        }
        const params = `{ ${paramParts.join(', ')} }`;
        lines.push(this.line(`${testCall}('${testName}', async (${params}, testInfo) => {`));
        this.indent++;

        // When tab operations are used, declare page as a mutable let variable
        // so that SWITCH TO NEW TAB / SWITCH TO TAB / etc. can reassign it
        if (needsContext) {
            lines.push(this.line('let page = _page;'));
        }

        // When frame operations are used, declare a frame locator variable
        if (needsFrame) {
            this._useFrameContext = true;
            lines.push(this.line('let __currentFrame: ReturnType<typeof page.frameLocator> | null = null;'));
        }

        try {
        // Add test.slow() inside test body if @slow annotation is present
        if (hasSlow) {
            lines.push(this.line('test.slow(); // Triple the timeout'));
        }

        // Set Allure 4-tier breadcrumb hierarchy from environment variables
        // Tiers: Application → Project Folder → Sandbox → Feature (describe block)
        lines.push(this.line('{'));
        this.indent++;
        lines.push(this.line(`const __projectName = process.env.VERO_PROJECT_NAME || 'Vero';`));
        lines.push(this.line(`const __nestedProjectName = process.env.VERO_NESTED_PROJECT_NAME || 'default';`));
        lines.push(this.line(`const __sandboxName = process.env.VERO_SANDBOX_NAME || 'default';`));
        lines.push(this.line(''));
        lines.push(this.line('// Standard Allure suite hierarchy (drives tree view)'));
        lines.push(this.line(`await parentSuite(__projectName);`));
        lines.push(this.line(`await suite(__nestedProjectName);`));
        lines.push(this.line(`await subSuite(__sandboxName);`));
        lines.push(this.line(''));
        lines.push(this.line('// Custom descriptive labels (appear in test detail)'));
        lines.push(this.line(`await allureLabel('Application', __projectName);`));
        lines.push(this.line(`await allureLabel('Project Folder', __nestedProjectName);`));
        lines.push(this.line(`await allureLabel('Sandbox', __sandboxName);`));
        lines.push(this.line(''));
        lines.push(this.line('// Package & titlePath for grouping views'));
        lines.push(this.line(`await allureLabel('package', __projectName + '.' + __nestedProjectName + '.' + __sandboxName);`));
        lines.push(this.line(`await allureLabel('titlePath', __projectName + ' > ' + __nestedProjectName + ' > ' + __sandboxName + ' > ${featureName}');`));
        this.indent--;
        lines.push(this.line('}'));

        // Emit Allure tag labels for each user-defined @tag
        if (scenario.tags.length > 0) {
            for (const tagName of scenario.tags) {
                lines.push(this.line(`await allureTag('${tagName}');`));
            }
            lines.push('');
        }

        for (const statement of scenario.statements) {
            const code = this.transpileStatement(statement, uses);
            if (code) {
                // Wrap with debug markers when debug mode is enabled
                const wrappedCode = this.wrapWithDebug(statement, code);
                lines.push(this.line(wrappedCode));
            }
        }

        // Auto-capture evidence screenshot at end of scenario
        lines.push('');
        lines.push(this.line("// Auto-capture evidence screenshot at scenario end"));
        lines.push(this.line("await test.step('Capture Evidence Screenshot', async () => {"));
        this.indent++;
        lines.push(this.line("const screenshotPath = testInfo.outputPath('evidence-screenshot.png');"));
        lines.push(this.line("await page.screenshot({ path: screenshotPath, fullPage: false });"));
        lines.push(this.line("await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });"));
        this.indent--;
        lines.push(this.line("});"));

        // Attach trace file if available (for Allure report trace viewer support)
        lines.push('');
        lines.push(this.line("// Attach trace file for Allure report"));
        lines.push(this.line("try {"));
        this.indent++;
        lines.push(this.line("const __traceFile = path.join(testInfo.outputDir, 'trace.zip');"));
        lines.push(this.line("await fsPromises.access(__traceFile);"));
        lines.push(this.line("await testInfo.attach('trace', { path: __traceFile, contentType: 'application/zip' });"));
        this.indent--;
        lines.push(this.line("} catch { /* trace not available */ }"));

        } finally {
            this._useFrameContext = false;
        }

        this.indent--;
        lines.push(this.line('});'));

        return lines.join('\n');
    }

    // ==================== STATEMENT TRANSPILATION ====================

    private transpileStatement(statement: StatementNode, uses: string[] = [], currentPage?: string): string {
        switch (statement.type) {
            case 'Click': {
                const targetDesc = this.getTargetDescription(statement.target);
                return `await test.step('Click ${targetDesc}', async () => { await ${this.transpileTarget(statement.target, uses, currentPage)}.click(); });`;
            }

            case 'RightClick': {
                const targetDesc = this.getTargetDescription(statement.target);
                return `await test.step('Right-click ${targetDesc}', async () => { await ${this.transpileTarget(statement.target, uses, currentPage)}.click({ button: 'right' }); });`;
            }

            case 'DoubleClick': {
                const targetDesc = this.getTargetDescription(statement.target);
                return `await test.step('Double-click ${targetDesc}', async () => { await ${this.transpileTarget(statement.target, uses, currentPage)}.dblclick(); });`;
            }

            case 'ForceClick': {
                const targetDesc = this.getTargetDescription(statement.target);
                return `await test.step('Force-click ${targetDesc}', async () => { await ${this.transpileTarget(statement.target, uses, currentPage)}.click({ force: true }); });`;
            }

            case 'Drag': {
                const sourceLocator = this.transpileTarget(statement.source, uses, currentPage);
                if (statement.destination.type === 'Coordinate') {
                    // Drag to coordinates
                    const { x, y } = statement.destination;
                    return `await test.step('Drag to (${x}, ${y})', async () => { await ${sourceLocator}.dragTo(page.locator('body'), { targetPosition: { x: ${x}, y: ${y} } }); });`;
                } else {
                    // Drag to another element
                    const destLocator = this.transpileTarget(statement.destination as any, uses, currentPage);
                    return `await test.step('Drag element', async () => { await ${sourceLocator}.dragTo(${destLocator}); });`;
                }
            }

            case 'Fill': {
                const targetDesc = this.getTargetDescription(statement.target);
                return `await test.step('Fill ${targetDesc}', async () => { await ${this.transpileTarget(statement.target, uses, currentPage)}.fill(${this.transpileExpression(statement.value)}); });`;
            }

            case 'Open': {
                const urlExpr = this.transpileExpression(statement.url);
                return `await test.step('Navigate to ' + ${urlExpr}, async () => { await page.goto(${urlExpr}); });`;
            }

            case 'Check': {
                const targetDesc = this.getTargetDescription(statement.target);
                return `await test.step('Check ${targetDesc}', async () => { await ${this.transpileTarget(statement.target, uses, currentPage)}.check(); });`;
            }

            case 'Uncheck': {
                const targetDesc = this.getTargetDescription(statement.target);
                return `await test.step('Uncheck ${targetDesc}', async () => { await ${this.transpileTarget(statement.target, uses, currentPage)}.uncheck(); });`;
            }

            case 'Hover': {
                const targetDesc = this.getTargetDescription(statement.target);
                return `await test.step('Hover ${targetDesc}', async () => { await ${this.transpileTarget(statement.target, uses, currentPage)}.hover(); });`;
            }

            case 'Press':
                return `await test.step('Press ${statement.key}', async () => { await page.keyboard.press('${statement.key}'); });`;

            case 'Wait':
                if (statement.duration) {
                    const ms = statement.unit === 'milliseconds'
                        ? statement.duration
                        : statement.duration * 1000;
                    return `await test.step('Wait ${statement.duration} ${statement.unit || 'seconds'}', async () => { await page.waitForTimeout(${ms}); });`;
                }
                return `await test.step('Wait for network idle', async () => { await page.waitForLoadState('networkidle'); });`;

            case 'Verify':
                return this.transpileVerify(statement.target, statement.condition, uses, currentPage);

            case 'Perform':
                return this.transpileDoAction(statement.action, uses, currentPage);

            case 'Refresh':
                return `await test.step('Refresh page', async () => { await page.reload(); });`;

            case 'SwitchToNewTab': {
                return this.transpileTabOperation(statement, uses);
            }

            case 'SwitchToTab': {
                return this.transpileTabOperation(statement, uses);
            }

            case 'OpenInNewTab': {
                return this.transpileTabOperation(statement, uses);
            }

            case 'CloseTab': {
                return this.transpileTabOperation(statement, uses);
            }

            case 'TakeScreenshot':
                if (statement.target) {
                    // Element screenshot — capture and attach to Allure step
                    const locator = this.transpileTarget(statement.target, uses, currentPage);
                    const elemDesc = statement.filename || 'Element screenshot';
                    return `await test.step('${elemDesc}', async () => { const __ssPath = testInfo.outputPath('screenshot-' + Date.now() + '.png'); await ${locator}.screenshot({ path: __ssPath }); await testInfo.attach('${elemDesc}', { path: __ssPath, contentType: 'image/png' }); });`;
                } else {
                    // Full page screenshot — capture and attach to Allure step
                    const fullDesc = statement.filename || 'Screenshot';
                    return `await test.step('${fullDesc}', async () => { const __ssPath = testInfo.outputPath('screenshot-' + Date.now() + '.png'); await page.screenshot({ path: __ssPath }); await testInfo.attach('${fullDesc}', { path: __ssPath, contentType: 'image/png' }); });`;
                }

            case 'Log':
                return `await test.step('Log: ' + ${this.transpileExpression(statement.message)}, async () => { console.log(${this.transpileExpression(statement.message)}); });`;

            case 'Load':
                return this.transpileLoadStatement(statement);

            case 'ForEach':
                return this.transpileForEachStatement(statement, uses, currentPage);

            case 'DataQuery':
                return this.transpileDataQueryStatement(statement);

            case 'Upload':
                return this.transpileUploadStatement(statement, uses, currentPage);

            case 'VerifyUrl':
                return this.transpileVerifyUrlStatement(statement);

            case 'VerifyTitle':
                return this.transpileVerifyTitleStatement(statement);

            case 'VerifyHas':
                return this.transpileVerifyHasStatement(statement, uses, currentPage);

            case 'VerifyScreenshot':
                return this.transpileVerifyScreenshotStatement(statement, uses, currentPage);

            case 'Row':
                return this.transpileRowStatement(statement);

            case 'Rows':
                return this.transpileRowsStatement(statement);

            case 'ColumnAccess':
                return this.transpileColumnAccessStatement(statement);

            case 'Count':
                return this.transpileCountStatement(statement);

            case 'UtilityAssignment':
                return this.transpileUtilityAssignment(statement);

            case 'PerformAssignment':
                return this.transpilePerformAssignment(statement, uses, currentPage);

            case 'VerifyVariable':
                return this.transpileVerifyVariable(statement);

            case 'WaitFor':
                return this.transpileWaitFor(statement, uses, currentPage);

            case 'Return':
                return this.transpileReturn(statement, uses, currentPage);

            // Dialog handling — handler must be registered BEFORE the action that triggers the dialog
            case 'AcceptDialog': {
                const text = statement.responseText ? this.transpileExpression(statement.responseText) : undefined;
                if (text) {
                    return `/* Register dialog handler before the triggering action */ await test.step('Accept dialog with text', async () => { page.once('dialog', async dialog => { await dialog.accept(${text}); }); });`;
                }
                return `/* Register dialog handler before the triggering action */ await test.step('Accept dialog', async () => { page.once('dialog', async dialog => { await dialog.accept(); }); });`;
            }

            case 'DismissDialog':
                return `/* Register dialog handler before the triggering action */ await test.step('Dismiss dialog', async () => { page.once('dialog', async dialog => { await dialog.dismiss(); }); });`;

            // Frame handling
            case 'SwitchToFrame': {
                const sel = statement.selector;
                const v = sel.value.replace(/'/g, "\\'");
                let frameSelectorStr: string;
                if (sel.selectorType === 'css' || sel.selectorType === 'xpath') {
                    frameSelectorStr = `'${v}'`;
                } else if (sel.selectorType === 'role') {
                    const nameParam = sel.nameParam ? `[name="${sel.nameParam}"]` : '';
                    frameSelectorStr = `'${v}${nameParam}'`;
                } else if (sel.selectorType === 'testid') {
                    frameSelectorStr = `'[data-testid="${v}"]'`;
                } else {
                    frameSelectorStr = `'${v}'`;
                }
                return `await test.step('Switch to frame', async () => { __currentFrame = page.frameLocator(${frameSelectorStr}); });`;
            }

            case 'SwitchToMainFrame':
                return `await test.step('Switch to main frame', async () => { __currentFrame = null; });`;

            // Download handling
            case 'Download': {
                const dlTarget = this.transpileTarget(statement.target, uses, currentPage);
                const dlDesc = this.getTargetDescription(statement.target);
                if (statement.saveAs) {
                    const saveAsExpr = this.transpileExpression(statement.saveAs);
                    return `await test.step('Download from ${dlDesc}', async () => { const downloadPromise = page.waitForEvent('download'); await ${dlTarget}.click(); const download = await downloadPromise; await download.saveAs(${saveAsExpr}); });`;
                }
                return `await test.step('Download from ${dlDesc}', async () => { const downloadPromise = page.waitForEvent('download'); await ${dlTarget}.click(); const download = await downloadPromise; await download.path(); });`;
            }

            // Cookie management
            case 'SetCookie': {
                const cookieName = this.transpileExpression(statement.name);
                const cookieValue = this.transpileExpression(statement.value);
                return `await test.step('Set cookie ' + ${cookieName}, async () => { await page.context().addCookies([{ name: ${cookieName}, value: ${cookieValue}, url: page.url() }]); });`;
            }

            case 'ClearCookies':
                return `await test.step('Clear cookies', async () => { await page.context().clearCookies(); });`;

            // Storage management
            case 'SetStorage': {
                const storageKey = this.transpileExpression(statement.key);
                const storageValue = this.transpileExpression(statement.value);
                return `await test.step('Set storage ' + ${storageKey}, async () => { await page.evaluate(([k, v]) => localStorage.setItem(k, v), [${storageKey}, ${storageValue}]); });`;
            }

            case 'GetStorage': {
                const gsKey = this.transpileExpression(statement.key);
                return `const ${statement.variable} = await test.step('Get storage ' + ${gsKey}, async () => { return await page.evaluate((k) => localStorage.getItem(k), ${gsKey}); });`;
            }

            case 'ClearStorage':
                return `await test.step('Clear storage', async () => { await page.evaluate(() => localStorage.clear()); });`;

            case 'ClearField': {
                const clearTarget = this.transpileTarget(statement.target, uses, currentPage);
                const clearDesc = this.getTargetDescription(statement.target);
                return `await test.step('Clear ${clearDesc}', async () => { await ${clearTarget}.fill(''); });`;
            }

            // Scroll
            case 'Scroll': {
                if (statement.target) {
                    const scrollTarget = this.transpileTarget(statement.target, uses, currentPage);
                    const scrollDesc = this.getTargetDescription(statement.target);
                    return `await test.step('Scroll to ${scrollDesc}', async () => { await ${scrollTarget}.scrollIntoViewIfNeeded(); });`;
                }
                const delta = statement.direction === 'up' ? -500 : 500;
                const dir = statement.direction || 'down';
                return `await test.step('Scroll ${dir}', async () => { await page.mouse.wheel(0, ${delta}); });`;
            }

            // Wait for network/navigation
            case 'WaitForNavigation':
                return `await test.step('Wait for navigation', async () => { await page.waitForLoadState('load'); });`;

            case 'WaitForNetworkIdle':
                return `await test.step('Wait for network idle', async () => { await page.waitForLoadState('networkidle'); });`;

            case 'WaitForUrl': {
                const urlVal = this.transpileExpression(statement.value);
                if (statement.condition === 'contains') {
                    return `await test.step('Wait for URL contains ' + ${urlVal}, async () => { await page.waitForURL(url => url.toString().includes(${urlVal})); });`;
                }
                return `await test.step('Wait for URL equals ' + ${urlVal}, async () => { await page.waitForURL(url => url.toString() === ${urlVal}); });`;
            }

            // SELECT
            case 'Select':
                return this.transpileSelectStatement(statement, uses, currentPage);

            // IF/ELSE
            case 'IfElse':
                return this.transpileIfElseStatement(statement, uses, currentPage);

            // REPEAT
            case 'Repeat':
                return this.transpileRepeatStatement(statement, uses, currentPage);

            // TRY/CATCH
            case 'TryCatch':
                return this.transpileTryCatchStatement(statement, uses, currentPage);

            // API Testing
            case 'ApiRequest':
                return this.transpileApiRequestStatement(statement);

            case 'VerifyResponse':
                return this.transpileVerifyResponseStatement(statement);

            case 'MockApi':
                return this.transpileMockApiStatement(statement);

            default:
                return `// Unknown statement type`;
        }
    }

    // ==================== UTILITY FUNCTION TRANSPILATION ====================

    /**
     * Transpile utility assignment: TEXT result = TRIM $input
     * Generates: const result = veroString.trim(input);
     */
    private transpileUtilityAssignment(stmt: UtilityAssignmentStatement): string {
        const exprCode = this.transpileUtilityExpression(stmt.expression);
        return `const ${stmt.variableName} = ${exprCode};`;
    }

    /**
     * Transpile perform assignment: FLAG isWelcome = PERFORM DashboardActions.isWelcomeVisible
     * Generates: const isWelcome = await dashboardActions.isWelcomeVisible();
     */
    private transpilePerformAssignment(stmt: PerformAssignmentStatement, uses: string[] = [], currentPage?: string): string {
        const actionCall = this.transpileDoAction(stmt.action, uses, currentPage);
        // transpileDoAction returns something like:
        // await test.step('Perform DashboardActions.isWelcomeVisible', async () => { await dashboardActions.isWelcomeVisible(); });
        // We need to extract the actual method call and assign it to a variable

        const pageLower = stmt.action.page ? this.camelCase(stmt.action.page) : '';
        const actionName = stmt.action.action;
        const args = stmt.action.arguments.map(arg => this.transpileExpression(arg)).join(', ');

        const methodCall = pageLower
            ? `await ${pageLower}.${actionName}(${args})`
            : `await ${actionName}(${args})`;

        const stepName = stmt.action.page
            ? `${stmt.action.page}.${actionName}`
            : actionName;

        return `const ${stmt.variableName} = await test.step('Get ${stepName}', async () => { return ${methodCall}; });`;
    }

    /**
     * Transpile verify variable: VERIFY isWelcome IS TRUE
     * Generates: expect(isWelcome).toBe(true);
     */
    private transpileVerifyVariable(stmt: VerifyVariableStatement): string {
        const varName = stmt.variable.name;
        const condition = stmt.condition;

        switch (condition.type) {
            case 'IsTrue':
                return `await test.step('Verify ${varName} is true', async () => { expect(${varName}).toBe(true); });`;
            case 'IsFalse':
                return `await test.step('Verify ${varName} is false', async () => { expect(${varName}).toBe(false); });`;
            case 'IsNotTrue':
                return `await test.step('Verify ${varName} is not true', async () => { expect(${varName}).not.toBe(true); });`;
            case 'IsNotFalse':
                return `await test.step('Verify ${varName} is not false', async () => { expect(${varName}).not.toBe(false); });`;
            case 'Contains': {
                const value = this.transpileExpression(condition.value);
                return `await test.step('Verify ${varName} contains ' + ${value}, async () => { expect(${varName}).toContain(${value}); });`;
            }
            case 'NotContains': {
                const value = this.transpileExpression(condition.value);
                return `await test.step('Verify ${varName} does not contain ' + ${value}, async () => { expect(${varName}).not.toContain(${value}); });`;
            }
            case 'Equals': {
                const value = this.transpileExpression(condition.value);
                return `await test.step('Verify ${varName} equals ' + ${value}, async () => { expect(${varName}).toBe(${value}); });`;
            }
            case 'NotEquals': {
                const value = this.transpileExpression(condition.value);
                return `await test.step('Verify ${varName} does not equal ' + ${value}, async () => { expect(${varName}).not.toBe(${value}); });`;
            }
            default:
                return `// Unknown variable condition type`;
        }
    }

    /**
     * Transpile WAIT FOR target - wait until element is visible
     */
    private transpileWaitFor(stmt: WaitForStatement, uses: string[] = [], currentPage?: string): string {
        const targetDesc = this.getTargetDescription(stmt.target);
        const locator = this.transpileTarget(stmt.target, uses, currentPage);
        return `await test.step('Wait for ${targetDesc}', async () => { await ${locator}.waitFor({ state: 'visible' }); });`;
    }

    private static readonly RETURN_TYPE_METHODS: Record<string, string> = {
        'VISIBLE': 'isVisible()',
        'TEXT': "textContent() || ''",
        'VALUE': 'inputValue()',
    };

    /**
     * Transpile RETURN statement - returns value from PageActions method
     */
    private transpileReturn(stmt: ReturnStatement, uses: string[] = [], currentPage?: string): string {
        const method = Transpiler.RETURN_TYPE_METHODS[stmt.returnType];
        if (method && stmt.target) {
            const locator = this.transpileTarget(stmt.target, uses, currentPage);
            return `return await ${locator}.${method};`;
        }
        if (stmt.returnType === 'EXPRESSION' && stmt.expression) {
            return `return ${this.transpileExpression(stmt.expression)};`;
        }
        return `return null;`;
    }

    /**
     * Transpile a utility expression to JavaScript
     */
    private transpileUtilityExpression(expr: UtilityExpressionNode): string {
        if (!expr || typeof expr !== 'object') {
            return 'null';
        }

        switch (expr.type) {
            case 'Trim':
                return this.transpileTrimExpression(expr);
            case 'Convert':
                return this.transpileConvertExpression(expr);
            case 'Extract':
                return this.transpileExtractExpression(expr);
            case 'Replace':
                return this.transpileReplaceExpression(expr);
            case 'Split':
                return this.transpileSplitExpression(expr);
            case 'Join':
                return this.transpileJoinExpression(expr);
            case 'Length':
                return this.transpileLengthExpression(expr);
            case 'Pad':
                return this.transpilePadExpression(expr);
            case 'Today':
                return 'veroDate.today()';
            case 'Now':
                return 'veroDate.now()';
            case 'AddDate':
                return this.transpileAddDateExpression(expr);
            case 'SubtractDate':
                return this.transpileSubtractDateExpression(expr);
            case 'Format':
                return this.transpileFormatExpression(expr);
            case 'DatePart':
                return this.transpileDatePartExpression(expr);
            case 'Round':
                return this.transpileRoundExpression(expr);
            case 'Absolute':
                return this.transpileAbsoluteExpression(expr);
            case 'Generate':
                return this.transpileGenerateExpression(expr);
            case 'RandomNumber':
                return this.transpileRandomNumberExpression(expr);
            case 'Chained':
                return this.transpileChainedExpression(expr);
            case 'StringLiteral':
            case 'NumberLiteral':
            case 'BooleanLiteral':
            case 'VariableReference':
            case 'EnvVarReference':
                return this.transpileExpression(expr);
            default:
                return 'null';
        }
    }

    private transpileTrimExpression(expr: TrimExpression): string {
        return `veroString.trim(${this.transpileExpression(expr.value)})`;
    }

    private transpileConvertExpression(expr: ConvertExpression): string {
        const value = this.transpileExpression(expr.value);
        switch (expr.targetType) {
            case 'UPPERCASE': return `veroString.uppercase(${value})`;
            case 'LOWERCASE': return `veroString.lowercase(${value})`;
            case 'NUMBER': return `veroConvert.toNumber(${value})`;
            case 'TEXT': return `veroConvert.toString(${value})`;
            default: return value;
        }
    }

    private transpileExtractExpression(expr: ExtractExpression): string {
        const value = this.transpileExpression(expr.value);
        const start = this.transpileExpression(expr.start);
        const end = this.transpileExpression(expr.end);
        return `veroString.substring(${value}, ${start}, ${end})`;
    }

    private transpileReplaceExpression(expr: ReplaceExpression): string {
        const value = this.transpileExpression(expr.value);
        return `veroString.replace(${value}, '${this.escapeString(expr.search)}', '${this.escapeString(expr.replacement)}')`;
    }

    private transpileSplitExpression(expr: SplitExpression): string {
        return `veroString.split(${this.transpileExpression(expr.value)}, '${this.escapeString(expr.delimiter)}')`;
    }

    private transpileJoinExpression(expr: JoinExpression): string {
        return `veroString.join(${this.transpileExpression(expr.value)}, '${this.escapeString(expr.delimiter)}')`;
    }

    private transpileLengthExpression(expr: LengthExpression): string {
        return `veroString.length(${this.transpileExpression(expr.value)})`;
    }

    private transpilePadExpression(expr: PadExpression): string {
        const value = this.transpileExpression(expr.value);
        const length = this.transpileExpression(expr.length);
        return `veroString.padStart(${value}, ${length}, '${this.escapeString(expr.padChar)}')`;
    }

    private static readonly DATE_UNIT_METHODS: Record<string, { add: string; subtract: string }> = {
        'DAY': { add: 'addDays', subtract: 'subtractDays' },
        'DAYS': { add: 'addDays', subtract: 'subtractDays' },
        'MONTH': { add: 'addMonths', subtract: 'subtractMonths' },
        'MONTHS': { add: 'addMonths', subtract: 'subtractMonths' },
        'YEAR': { add: 'addYears', subtract: 'subtractYears' },
        'YEARS': { add: 'addYears', subtract: 'subtractYears' }
    };

    private transpileAddDateExpression(expr: AddDateExpression): string {
        const amount = this.transpileExpression(expr.amount);
        const date = this.transpileDateOrExpression(expr.date);
        const method = Transpiler.DATE_UNIT_METHODS[expr.unit]?.add || 'addDays';
        return `veroDate.${method}(${date}, ${amount})`;
    }

    private transpileSubtractDateExpression(expr: SubtractDateExpression): string {
        const amount = this.transpileExpression(expr.amount);
        const date = this.transpileDateOrExpression(expr.date);
        const method = Transpiler.DATE_UNIT_METHODS[expr.unit]?.subtract || 'subtractDays';
        return `veroDate.${method}(${date}, ${amount})`;
    }

    private transpileDateOrExpression(expr: ExpressionNode | TodayExpression | NowExpression): string {
        if (expr.type === 'Today') return 'veroDate.today()';
        if (expr.type === 'Now') return 'veroDate.now()';
        return this.transpileExpression(expr as ExpressionNode);
    }

    private transpileFormatExpression(expr: FormatExpression): string {
        const value = this.transpileExpression(expr.value);
        switch (expr.formatType) {
            case 'pattern': return `veroDate.formatDate(${value}, '${this.escapeString(expr.pattern || '')}')`;
            case 'currency': return `veroNumber.formatCurrency(${value}, '${expr.currency || 'USD'}')`;
            case 'percent': return `veroNumber.formatPercent(${value})`;
            default: return value;
        }
    }

    private static readonly DATE_PART_METHODS: Record<string, string> = {
        'YEAR': 'year', 'MONTH': 'month', 'DAY': 'day'
    };

    private transpileDatePartExpression(expr: DatePartExpression): string {
        const method = Transpiler.DATE_PART_METHODS[expr.part] || 'year';
        return `veroDate.${method}(${this.transpileExpression(expr.date)})`;
    }

    private transpileRoundExpression(expr: RoundExpression): string {
        const value = this.transpileExpression(expr.value);
        if (expr.direction === 'UP') return `veroNumber.ceiling(${value})`;
        if (expr.direction === 'DOWN') return `veroNumber.floor(${value})`;
        if (expr.decimals) return `veroNumber.round(${value}, ${this.transpileExpression(expr.decimals)})`;
        return `veroNumber.round(${value})`;
    }

    private transpileAbsoluteExpression(expr: AbsoluteExpression): string {
        return `veroNumber.abs(${this.transpileExpression(expr.value)})`;
    }

    private transpileGenerateExpression(expr: GenerateExpression): string {
        if (expr.pattern === 'UUID') return 'veroGenerate.uuid()';
        return `veroGenerate.fromRegex('${this.escapeString(expr.pattern as string)}')`;
    }

    private transpileRandomNumberExpression(expr: RandomNumberExpression): string {
        const min = this.transpileExpression(expr.min);
        const max = this.transpileExpression(expr.max);
        return `veroGenerate.randomInt(${min}, ${max})`;
    }

    private transpileChainedExpression(expr: ChainedExpression): string {
        const first = this.transpileUtilityExpression(expr.first);
        return this.transpileChainedSecond(expr.second, first);
    }

    private transpileChainedSecond(expr: UtilityExpressionNode, input: string): string {
        switch (expr.type) {
            case 'Trim':
                return `veroString.trim(${input})`;

            case 'Convert': {
                const e = expr as ConvertExpression;
                switch (e.targetType) {
                    case 'UPPERCASE': return `veroString.uppercase(${input})`;
                    case 'LOWERCASE': return `veroString.lowercase(${input})`;
                    case 'NUMBER': return `veroConvert.toNumber(${input})`;
                    case 'TEXT': return `veroConvert.toString(${input})`;
                    default: return input;
                }
            }

            case 'Replace': {
                const e = expr as ReplaceExpression;
                return `veroString.replace(${input}, '${this.escapeString(e.search)}', '${this.escapeString(e.replacement)}')`;
            }

            case 'Split': {
                const e = expr as SplitExpression;
                return `veroString.split(${input}, '${this.escapeString(e.delimiter)}')`;
            }

            case 'Length':
                return `veroString.length(${input})`;

            case 'Round': {
                const e = expr as RoundExpression;
                if (e.direction === 'UP') return `veroNumber.ceiling(${input})`;
                if (e.direction === 'DOWN') return `veroNumber.floor(${input})`;
                if (e.decimals) return `veroNumber.round(${input}, ${this.transpileExpression(e.decimals)})`;
                return `veroNumber.round(${input})`;
            }

            case 'Absolute':
                return `veroNumber.abs(${input})`;

            case 'Format': {
                const e = expr as FormatExpression;
                switch (e.formatType) {
                    case 'pattern': return `veroDate.formatDate(${input}, '${this.escapeString(e.pattern || '')}')`;
                    case 'currency': return `veroNumber.formatCurrency(${input}, '${e.currency || 'USD'}')`;
                    case 'percent': return `veroNumber.formatPercent(${input})`;
                    default: return input;
                }
            }

            case 'Chained': {
                const e = expr as ChainedExpression;
                const firstResult = this.transpileChainedSecond(e.first, input);
                return this.transpileChainedSecond(e.second, firstResult);
            }

            default:
                return input;
        }
    }

    private transpileUploadStatement(statement: UploadStatement, uses: string[], currentPage?: string): string {
        const target = this.transpileTarget(statement.target, uses, currentPage);
        const files = statement.files.map(f => this.transpileExpression(f));

        if (files.length === 1) {
            return `await ${target}.setInputFiles(${files[0]});`;
        } else {
            return `await ${target}.setInputFiles([${files.join(', ')}]);`;
        }
    }

    private transpileVerifyUrlStatement(statement: VerifyUrlStatement): string {
        const value = this.transpileExpression(statement.value);
        const useRegex = statement.condition === 'contains' || statement.condition === 'matches';
        const expectValue = useRegex ? `new RegExp(${value})` : value;
        return `await expect(page).toHaveURL(${expectValue});`;
    }

    private transpileVerifyTitleStatement(statement: VerifyTitleStatement): string {
        const value = this.transpileExpression(statement.value);
        const useRegex = statement.condition === 'contains';
        const expectValue = useRegex ? `new RegExp(${value})` : value;
        return `await expect(page).toHaveTitle(${expectValue});`;
    }

    private transpileVerifyHasStatement(statement: VerifyHasStatement, uses: string[], currentPage?: string): string {
        const target = this.transpileTarget(statement.target, uses, currentPage);
        const cond = statement.hasCondition;

        switch (cond.type) {
            case 'HasCount':
                return `await expect(${target}).toHaveCount(${this.transpileExpression(cond.count)});`;
            case 'HasValue':
                return `await expect(${target}).toHaveValue(${this.transpileExpression(cond.value)});`;
            case 'HasAttribute':
                return `await expect(${target}).toHaveAttribute(${this.transpileExpression(cond.attribute)}, ${this.transpileExpression(cond.value)});`;
            case 'HasText':
                return `await expect(${target}).toHaveText(${this.transpileExpression(cond.text)});`;
            case 'ContainsText':
                return `await expect(${target}).toContainText(${this.transpileExpression(cond.text)});`;
            case 'HasClass':
                return `await expect(${target}).toHaveClass(new RegExp(${this.transpileExpression(cond.className)}));`;
            default:
                return `// Unknown has condition`;
        }
    }

    private static readonly VERIFY_SCREENSHOT_PRESETS: Record<'STRICT' | 'BALANCED' | 'RELAXED', VerifyScreenshotOptions> = {
        STRICT: { threshold: 0.1, maxDiffPixels: 0, maxDiffPixelRatio: 0 },
        BALANCED: { threshold: 0.2 },
        RELAXED: { threshold: 0.3, maxDiffPixelRatio: 0.01 },
    };

    private transpileVerifyScreenshotStatement(
        statement: VerifyScreenshotStatement,
        uses: string[],
        currentPage?: string
    ): string {
        const targetExpr = statement.target ? this.transpileTarget(statement.target, uses, currentPage) : 'page';
        const normalizedName = statement.name ? this.normalizeScreenshotName(statement.name) : undefined;
        const optionsCode = this.transpileVerifyScreenshotOptions(statement.options);
        const helperArgs = [`${targetExpr}`, 'testInfo'];
        if (normalizedName) {
            helperArgs.push(`'${this.escapeString(normalizedName)}'`);
        } else if (optionsCode) {
            helperArgs.push('undefined');
        }
        if (optionsCode) {
            helperArgs.push(optionsCode);
        }
        const methodCall = `await __veroExpectScreenshot(${helperArgs.join(', ')});`;

        const targetLabel = statement.target ? ` for ${this.getTargetDescription(statement.target)}` : '';
        const label = normalizedName
            ? `Verify screenshot ${normalizedName}${targetLabel}`
            : `Verify screenshot${targetLabel}`;

        return `await test.step('${this.escapeString(label)}', async () => { ${methodCall} });`;
    }

    private transpileVerifyScreenshotOptions(options?: VerifyScreenshotOptions): string | undefined {
        if (!options) {
            return undefined;
        }

        const preset = options.preset ? Transpiler.VERIFY_SCREENSHOT_PRESETS[options.preset] : undefined;
        const resolved: VerifyScreenshotOptions = { ...(preset || {}) };

        if (typeof options.threshold === 'number' && Number.isFinite(options.threshold)) {
            resolved.threshold = options.threshold;
        }

        if (typeof options.maxDiffPixels === 'number' && Number.isFinite(options.maxDiffPixels)) {
            resolved.maxDiffPixels = Math.max(0, Math.floor(options.maxDiffPixels));
        }

        if (typeof options.maxDiffPixelRatio === 'number' && Number.isFinite(options.maxDiffPixelRatio)) {
            resolved.maxDiffPixelRatio = Math.max(0, Math.min(1, options.maxDiffPixelRatio));
        }

        const entries: string[] = [];
        if (typeof resolved.threshold === 'number') {
            entries.push(`threshold: ${resolved.threshold}`);
        }
        if (typeof resolved.maxDiffPixels === 'number') {
            entries.push(`maxDiffPixels: ${resolved.maxDiffPixels}`);
        }
        if (typeof resolved.maxDiffPixelRatio === 'number') {
            entries.push(`maxDiffPixelRatio: ${resolved.maxDiffPixelRatio}`);
        }

        if (entries.length === 0) {
            return undefined;
        }

        return `{ ${entries.join(', ')} }`;
    }

    private normalizeScreenshotName(name: string): string {
        const trimmed = name.trim();
        if (!trimmed) {
            return 'screenshot.png';
        }
        if (/\.png$/i.test(trimmed)) {
            return trimmed;
        }
        return `${trimmed}.png`;
    }

    private transpileLoadStatement(statement: LoadStatement): string {
        const { variable, tableName, projectName, whereClause } = statement;

        // Generate the data loading code
        // This assumes a global dataManager is available at runtime
        // For cross-project references, use dataManager.load('tableName', { project: 'projectName' })
        const options: string[] = [];

        if (projectName) {
            options.push(`project: '${projectName}'`);
        }

        if (whereClause) {
            const filterValue = this.transpileExpression(whereClause.value);
            options.push(`where: { ${whereClause.field}: { ${this.getOperatorName(whereClause.operator)}: ${filterValue} } }`);
        }

        let code = `const ${variable} = await dataManager.load('${tableName}'`;
        if (options.length > 0) {
            code += `, { ${options.join(', ')} }`;
        }
        code += ');';
        return code;
    }

    private getOperatorName(op: WhereClause['operator']): string {
        const opMap: Record<string, string> = {
            '=': 'equals',
            '!=': 'not',
            '>': 'gt',
            '<': 'lt',
            '>=': 'gte',
            '<=': 'lte'
        };
        return opMap[op] || 'equals';
    }

    private transpileForEachStatement(statement: ForEachStatement, uses: string[], currentPage?: string): string {
        const { itemVariable, collectionVariable, statements } = statement;

        const lines: string[] = [];
        lines.push(`for (const ${itemVariable} of ${collectionVariable}) {`);
        this.indent++;

        for (const stmt of statements) {
            const code = this.transpileStatement(stmt, uses, currentPage);
            if (code) lines.push(this.line(code));
        }

        this.indent--;
        lines.push(this.line('}'));

        return lines.join('\n');
    }

    // ==================== SELECT TRANSPILATION ====================

    private transpileSelectStatement(statement: SelectStatement, uses: string[], currentPage?: string): string {
        const targetDesc = this.getTargetDescription(statement.target);
        const optionExpr = this.transpileExpression(statement.option);
        return `await test.step('Select ' + ${optionExpr} + ' from ${targetDesc}', async () => { await ${this.transpileTarget(statement.target, uses, currentPage)}.selectOption(${optionExpr}); });`;
    }

    // ==================== IF/ELSE TRANSPILATION ====================

    private transpileIfElseStatement(statement: IfElseStatement, uses: string[], currentPage?: string): string {
        const lines: string[] = [];
        const conditionCode = this.transpileBooleanExpression(statement.condition, uses, currentPage);

        lines.push(`if (${conditionCode}) {`);
        this.indent++;

        for (const stmt of statement.ifStatements) {
            const code = this.transpileStatement(stmt, uses, currentPage);
            if (code) lines.push(this.line(code));
        }

        this.indent--;

        if (statement.elseStatements.length > 0) {
            lines.push(this.line('} else {'));
            this.indent++;

            for (const stmt of statement.elseStatements) {
                const code = this.transpileStatement(stmt, uses, currentPage);
                if (code) lines.push(this.line(code));
            }

            this.indent--;
        }

        lines.push(this.line('}'));
        return lines.join('\n');
    }

    private transpileBooleanExpression(condition: BooleanExpression, uses: string[], currentPage?: string): string {
        switch (condition.type) {
            case 'ElementState': {
                const locator = this.transpileTarget(condition.target, uses, currentPage);
                const stateMethodMap: Record<string, string> = {
                    'VISIBLE': 'isVisible',
                    'HIDDEN': 'isHidden',
                    'ENABLED': 'isEnabled',
                    'DISABLED': 'isDisabled',
                    'CHECKED': 'isChecked',
                };
                const method = stateMethodMap[condition.state] || 'isVisible';
                const call = `await ${locator}.${method}()`;
                return condition.negated ? `!(${call})` : call;
            }
            case 'VariableTruthy':
                return condition.variableName;
        }
    }

    // ==================== REPEAT TRANSPILATION ====================

    private transpileRepeatStatement(statement: RepeatStatement, uses: string[], currentPage?: string): string {
        const lines: string[] = [];
        const countExpr = this.transpileExpression(statement.count);
        const loopVar = `__i${this.tempVarCounter++}`;

        lines.push(`for (let ${loopVar} = 0; ${loopVar} < ${countExpr}; ${loopVar}++) {`);
        this.indent++;

        for (const stmt of statement.statements) {
            const code = this.transpileStatement(stmt, uses, currentPage);
            if (code) lines.push(this.line(code));
        }

        this.indent--;
        lines.push(this.line('}'));
        return lines.join('\n');
    }

    // ==================== TRY/CATCH TRANSPILATION ====================

    private transpileTryCatchStatement(statement: TryCatchStatement, uses: string[], currentPage?: string): string {
        const lines: string[] = [];
        lines.push('try {');
        this.indent++;

        for (const stmt of statement.tryStatements) {
            const code = this.transpileStatement(stmt, uses, currentPage);
            if (code) lines.push(this.line(code));
        }

        this.indent--;
        lines.push(this.line('} catch (__error) {'));
        this.indent++;

        for (const stmt of statement.catchStatements) {
            const code = this.transpileStatement(stmt, uses, currentPage);
            if (code) lines.push(this.line(code));
        }

        this.indent--;
        lines.push(this.line('}'));

        return lines.join('\n');
    }

    // ==================== API REQUEST TRANSPILATION ====================

    private transpileApiRequestStatement(statement: ApiRequestStatement): string {
        const method = statement.method.toLowerCase();
        const urlExpr = this.transpileExpression(statement.url);

        const opts: string[] = [];
        if (statement.body) {
            const bodyExpr = this.transpileExpression(statement.body);
            opts.push(`data: ${bodyExpr}`);
        }
        if (statement.headers) {
            const headersExpr = this.transpileExpression(statement.headers);
            opts.push(`headers: ${headersExpr}`);
        }

        const optsStr = opts.length > 0 ? `, { ${opts.join(', ')} }` : '';
        return `await test.step('API ${statement.method} ' + ${urlExpr}, async () => { __vero_apiResponse = await request.${method}(${urlExpr}${optsStr}); });`;
    }

    private transpileVerifyResponseStatement(statement: VerifyResponseStatement): string {
        const cond = statement.condition;

        switch (cond.type) {
            case 'Status': {
                const val = this.transpileExpression(cond.value);
                if (cond.operator === 'equals' || cond.operator === '==') {
                    return `await test.step('Verify response status equals ' + ${val}, async () => { expect(__vero_apiResponse.status()).toBe(${val}); });`;
                }
                if (cond.operator === '!=') {
                    return `await test.step('Verify response status != ' + ${val}, async () => { expect(__vero_apiResponse.status()).not.toBe(${val}); });`;
                }
                if (cond.operator === '>' || cond.operator === '<' || cond.operator === '>=' || cond.operator === '<=') {
                    const opName = cond.operator === '>' ? 'greater than' : cond.operator === '<' ? 'less than' : cond.operator === '>=' ? 'at least' : 'at most';
                    const expectMethod = cond.operator === '>' ? 'toBeGreaterThan' : cond.operator === '<' ? 'toBeLessThan' : cond.operator === '>=' ? 'toBeGreaterThanOrEqual' : 'toBeLessThanOrEqual';
                    return `await test.step('Verify response status ${opName} ' + ${val}, async () => { expect(__vero_apiResponse.status()).${expectMethod}(${val}); });`;
                }
                return `await test.step('Verify response status', async () => { expect(__vero_apiResponse.status()).toBe(${val}); });`;
            }
            case 'Body': {
                const val = this.transpileExpression(cond.value);
                if (cond.operator === 'contains') {
                    return `await test.step('Verify response body contains ' + ${val}, async () => { const __body = await __vero_apiResponse.text(); expect(__body).toContain(${val}); });`;
                }
                return `await test.step('Verify response body equals ' + ${val}, async () => { const __body = await __vero_apiResponse.text(); expect(__body).toBe(${val}); });`;
            }
            case 'Headers': {
                const val = this.transpileExpression(cond.value);
                return `await test.step('Verify response headers contain ' + ${val}, async () => { const __headers = JSON.stringify(__vero_apiResponse.headers()); expect(__headers).toContain(${val}); });`;
            }
            default:
                return `// Unknown response condition type`;
        }
    }

    // ==================== MOCK API TRANSPILATION ====================

    private transpileMockApiStatement(statement: MockApiStatement): string {
        const urlExpr = this.transpileExpression(statement.url);
        const statusExpr = this.transpileExpression(statement.status);

        const fulfillOpts: string[] = [`status: ${statusExpr}`];
        if (statement.body) {
            const bodyExpr = this.transpileExpression(statement.body);
            fulfillOpts.push(`contentType: 'application/json'`);
            fulfillOpts.push(`body: ${bodyExpr}`);
        }

        return `await test.step('Mock API ' + ${urlExpr}, async () => { await page.route(${urlExpr}, async route => { await route.fulfill({ ${fulfillOpts.join(', ')} }); }); });`;
    }

    // ==================== ROW/ROWS TRANSPILATION ====================

    /**
     * Transpile ROW statement: ROW user = Users WHERE state = "CA"
     * Generates code that fetches the row and resolves any reference columns
     */
    private transpileRowStatement(statement: RowStatement): string {
        const { variableName, modifier, tableRef, where, orderBy } = statement;
        const tableName = this.getTableAccessor(tableRef);
        const dataClass = tableRef.projectName ? `${tableRef.projectName}Data` : 'Data';
        const filterVar = '_item';
        const rawVar = `_raw_${variableName}`;

        const lines: string[] = [];

        if (modifier === 'RANDOM') {
            // RANDOM: filter, then pick random
            if (where) {
                const filteredVar = this.nextTempVarName('filtered', variableName);
                const filterCode = this.transpileDataConditionForFilter(where, filterVar);
                lines.push(`const ${filteredVar} = ${tableName}.filter(${filterVar} => ${filterCode});`);
                lines.push(`const ${rawVar} = ${filteredVar}[Math.floor(Math.random() * ${filteredVar}.length)];`);
            } else {
                lines.push(`const ${rawVar} = ${tableName}[Math.floor(Math.random() * ${tableName}.length)];`);
            }
            lines.push(`if (!${rawVar}) throw new Error('No matching row found in ${tableRef.tableName}');`);
            // Resolve references
            lines.push(`const ${variableName} = ${dataClass}.resolveReferences('${tableRef.tableName}', ${rawVar});`);
            return lines.join('\n' + '  '.repeat(this.indent));
        }

        if (modifier === 'FIRST' || modifier === 'LAST') {
            // FIRST/LAST: sort (if orderBy), then pick first/last
            let sortedRef = tableName;
            if (orderBy && orderBy.length > 0) {
                const sortedVar = this.nextTempVarName('sorted', variableName);
                const sortCode = this.generateSortCode(orderBy);
                lines.push(`const ${sortedVar} = [...${tableName}].sort(${sortCode});`);
                sortedRef = sortedVar;
            }

            if (where) {
                const filteredVar = this.nextTempVarName('filtered', variableName);
                const filterCode = this.transpileDataConditionForFilter(where, filterVar);
                lines.push(`const ${filteredVar} = ${sortedRef}.filter(${filterVar} => ${filterCode});`);
                if (modifier === 'FIRST') {
                    lines.push(`const ${rawVar} = ${filteredVar}[0];`);
                } else {
                    lines.push(`const ${rawVar} = ${filteredVar}[${filteredVar}.length - 1];`);
                }
            } else {
                if (modifier === 'FIRST') {
                    lines.push(`const ${rawVar} = ${sortedRef}[0];`);
                } else {
                    lines.push(`const ${rawVar} = ${sortedRef}[${sortedRef}.length - 1];`);
                }
            }
            lines.push(`if (!${rawVar}) throw new Error('No matching row found in ${tableRef.tableName}');`);
            // Resolve references
            lines.push(`const ${variableName} = ${dataClass}.resolveReferences('${tableRef.tableName}', ${rawVar});`);
            return lines.join('\n' + '  '.repeat(this.indent));
        }

        // Default: find first matching
        if (where) {
            const filterCode = this.transpileDataConditionForFilter(where, filterVar);
            lines.push(`const ${rawVar} = ${tableName}.find(${filterVar} => ${filterCode});`);
        } else {
            lines.push(`const ${rawVar} = ${tableName}[0];`);
        }
        lines.push(`if (!${rawVar}) throw new Error('No matching row found in ${tableRef.tableName}');`);
        // Resolve references
        lines.push(`const ${variableName} = ${dataClass}.resolveReferences('${tableRef.tableName}', ${rawVar});`);
        return lines.join('\n' + '  '.repeat(this.indent));
    }

    private nextTempVarName(prefix: string, variableName: string): string {
        this.tempVarCounter += 1;
        const safeVariableName = variableName.replace(/[^A-Za-z0-9_$]/g, '_') || 'temp';
        return `_${prefix}_${safeVariableName}_${this.tempVarCounter}`;
    }

    /**
     * Transpile ROWS statement: ROWS users = Users WHERE state = "CA" ORDER BY name LIMIT 10
     * Generates code that fetches the rows and resolves any reference columns
     */
    private transpileRowsStatement(statement: RowsStatement): string {
        const { variableName, tableRef, where, orderBy, limit, offset } = statement;
        const tableName = this.getTableAccessor(tableRef);
        const dataClass = tableRef.projectName ? `${tableRef.projectName}Data` : 'Data';
        const filterVar = '_item';
        const rawVar = `_raw_${variableName}`;

        const parts: string[] = [tableName];

        // Add filter if WHERE clause exists
        if (where) {
            const filterCode = this.transpileDataConditionForFilter(where, filterVar);
            parts.push(`.filter(${filterVar} => ${filterCode})`);
        }

        // Add sort if ORDER BY clause exists
        if (orderBy && orderBy.length > 0) {
            const sortCode = this.generateSortCode(orderBy);
            parts.push(`.sort(${sortCode})`);
        }

        // Add slice for LIMIT/OFFSET
        if (limit !== undefined || offset !== undefined) {
            const start = offset ?? 0;
            if (limit !== undefined) {
                parts.push(`.slice(${start}, ${start + limit})`);
            } else {
                parts.push(`.slice(${start})`);
            }
        }

        const lines: string[] = [];
        lines.push(`const ${rawVar} = ${parts.join('')};`);
        // Resolve references for all rows
        lines.push(`const ${variableName} = ${dataClass}.resolveReferencesMany('${tableRef.tableName}', ${rawVar});`);
        return lines.join('\n' + '  '.repeat(this.indent));
    }

    /**
     * Transpile column access: emails = Users.email WHERE active = true
     * Generates: const emails = Data.Users.filter(...).map(u => u.email);
     */
    private transpileColumnAccessStatement(statement: ColumnAccessStatement): string {
        const { variableName, distinct, tableRef, column, where } = statement;
        const tableName = this.getTableAccessor(tableRef);
        const filterVar = '_item';

        const parts: string[] = [tableName];

        // Add filter if WHERE clause exists
        if (where) {
            const filterCode = this.transpileDataConditionForFilter(where, filterVar);
            parts.push(`.filter(${filterVar} => ${filterCode})`);
        }

        // Map to column
        parts.push(`.map(${filterVar} => ${filterVar}.${column})`);

        // Add distinct if specified
        if (distinct) {
            parts.push('.filter((v, i, a) => a.indexOf(v) === i)');
        }

        return `const ${variableName} = ${parts.join('')};`;
    }

    /**
     * Transpile COUNT statement: NUMBER count = COUNT Users WHERE state = "CA"
     * Generates: const count = Data.Users.filter(...).length;
     */
    private transpileCountStatement(statement: CountStatement): string {
        const { variableName, tableRef, where } = statement;
        const tableName = this.getTableAccessor(tableRef);
        const filterVar = '_item';

        if (where) {
            const filterCode = this.transpileDataConditionForFilter(where, filterVar);
            return `const ${variableName} = ${tableName}.filter(${filterVar} => ${filterCode}).length;`;
        }

        return `const ${variableName} = ${tableName}.length;`;
    }

    /**
     * Get the accessor string for a table reference (project-scoped)
     * Users -> Data.Users
     * ProjectB.Users -> ProjectBData.Users
     */
    private getTableAccessor(tableRef: SimpleTableReference): string {
        if (tableRef.projectName) {
            return `${tableRef.projectName}Data.${tableRef.tableName}`;
        }
        return `Data.${tableRef.tableName}`;
    }

    /**
     * Transpile a data condition to inline JavaScript filter expression
     */
    private transpileDataConditionForFilter(condition: DataCondition, itemVar: string): string {
        switch (condition.type) {
            case 'And':
                return `(${this.transpileDataConditionForFilter(condition.left, itemVar)} && ${this.transpileDataConditionForFilter(condition.right, itemVar)})`;
            case 'Or':
                return `(${this.transpileDataConditionForFilter(condition.left, itemVar)} || ${this.transpileDataConditionForFilter(condition.right, itemVar)})`;
            case 'Not':
                return `!(${this.transpileDataConditionForFilter(condition.condition, itemVar)})`;
            case 'Comparison':
                return this.transpileDataComparisonForFilter(condition, itemVar);
            default:
                return 'true';
        }
    }

    /**
     * Transpile a data comparison to inline JavaScript expression
     */
    private transpileDataComparisonForFilter(comparison: DataComparison, itemVar: string): string {
        const { column, operator, value, values } = comparison;
        const colAccess = `${itemVar}.${column}`;

        // Handle null/empty checks
        if (operator === 'IS_NULL') {
            return `${colAccess} === null || ${colAccess} === undefined`;
        }
        if (operator === 'IS_EMPTY') {
            return `${colAccess} === '' || ${colAccess} === null || ${colAccess} === undefined`;
        }
        if (operator === 'IS_NOT_EMPTY') {
            return `${colAccess} !== '' && ${colAccess} !== null && ${colAccess} !== undefined`;
        }

        // Handle IN/NOT IN
        if (operator === 'IN' && values) {
            const valuesCode = values.map(v => this.transpileExpression(v)).join(', ');
            return `[${valuesCode}].includes(${colAccess})`;
        }
        if (operator === 'NOT_IN' && values) {
            const valuesCode = values.map(v => this.transpileExpression(v)).join(', ');
            return `![${valuesCode}].includes(${colAccess})`;
        }

        // Handle text operators
        const valueCode = value ? this.transpileExpression(value) : 'null';

        switch (operator) {
            case 'CONTAINS':
                return `String(${colAccess}).includes(${valueCode})`;
            case 'STARTS_WITH':
                return `String(${colAccess}).startsWith(${valueCode})`;
            case 'ENDS_WITH':
                return `String(${colAccess}).endsWith(${valueCode})`;
            case 'MATCHES':
                return `new RegExp(${valueCode}).test(String(${colAccess}))`;
            case '==':
                return `${colAccess} === ${valueCode}`;
            case '!=':
                return `${colAccess} !== ${valueCode}`;
            case '>':
                return `${colAccess} > ${valueCode}`;
            case '<':
                return `${colAccess} < ${valueCode}`;
            case '>=':
                return `${colAccess} >= ${valueCode}`;
            case '<=':
                return `${colAccess} <= ${valueCode}`;
            default:
                return `${colAccess} === ${valueCode}`;
        }
    }

    /**
     * Generate a sort comparator function for ORDER BY clauses
     */
    private generateSortCode(orderBy: { column: string; direction: 'ASC' | 'DESC' }[]): string {
        const comparisons = orderBy.map(o => {
            const dir = o.direction === 'DESC' ? -1 : 1;
            return `((a.${o.column} < b.${o.column}) ? ${-dir} : ((a.${o.column} > b.${o.column}) ? ${dir} : 0))`;
        });

        if (comparisons.length === 1) {
            return `(a, b) => ${comparisons[0]}`;
        }

        // Chain multiple comparisons
        return `(a, b) => ${comparisons.join(' || ')}`;
    }

    // ==================== VDQL (Data Query) TRANSPILATION ====================
    // Delegated to transpilerVdql.ts

    private getVdqlHelpers(): TranspilerHelpers {
        return {
            indent: this.indent,
            line: (content: string) => this.line(content),
            transpileExpression: (expr: ExpressionNode) => this.transpileExpression(expr),
        };
    }

    private transpileDataQueryStatement(statement: DataQueryStatement): string {
        return transpileDataQueryStatementFn(statement, this.getVdqlHelpers());
    }

    private transpileVerify(
        target: TargetNode | ExpressionNode,
        condition: VerifyCondition,
        uses: string[],
        currentPage?: string
    ): string {
        const isNegated = condition.operator === 'IS_NOT';
        let locator: string;

        if ('type' in target && target.type === 'Target') {
            locator = this.transpileTarget(target, uses, currentPage);
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
            'FOCUSED': isNegated ? 'not.toBeFocused()' : 'toBeFocused()',
            'EMPTY': isNegated ? 'not.toBeEmpty()' : 'toBeEmpty()',
        };

        const assertion = assertions[condition.value as string] || 'toBeVisible()';
        return `await expect(${locator}).${assertion};`;
    }

    private transpileDoAction(
        action: { page?: string; action: string; arguments: ExpressionNode[] },
        _uses: string[],
        currentPage?: string
    ): string {
        const args = action.arguments.map(a => this.transpileExpression(a)).join(', ');
        const readableActionName = this.toReadableTestName(action.action);

        if (action.page) {
            const readablePageName = this.toReadableTestName(action.page);
            // If we're inside a page action and referencing the same page, use 'this'
            if (currentPage && action.page === currentPage) {
                return `await test.step('${readableActionName}', async () => { await this.${action.action}(${args}); });`;
            }
            const varName = this.camelCase(action.page);
            return `await test.step('${readablePageName}: ${readableActionName}', async () => { await ${varName}.${action.action}(${args}); });`;
        }

        // If no page specified but we're inside a page action, use 'this'
        if (currentPage) {
            return `await test.step('${readableActionName}', async () => { await this.${action.action}(${args}); });`;
        }

        return `await test.step('${readableActionName}', async () => { await ${action.action}(${args}); });`;
    }

    // ==================== HELPER METHODS ====================

    /**
     * Walk all statements in a feature (hooks + scenarios, including nested ForEach)
     * and return true if predicate matches any statement.
     */
    private featureHasStatement(feature: FeatureNode, predicate: (stmt: StatementNode) => boolean): boolean {
        const checkStatements = (statements: StatementNode[]): boolean => {
            for (const stmt of statements) {
                if (predicate(stmt)) return true;
                if (stmt.type === 'ForEach') {
                    if (checkStatements(stmt.statements)) return true;
                }
                if (stmt.type === 'TryCatch') {
                    if (checkStatements(stmt.tryStatements) || checkStatements(stmt.catchStatements)) return true;
                }
                if (stmt.type === 'IfElse') {
                    if (checkStatements(stmt.ifStatements) || checkStatements(stmt.elseStatements)) return true;
                }
                if (stmt.type === 'Repeat') {
                    if (checkStatements(stmt.statements)) return true;
                }
            }
            return false;
        };

        for (const hook of feature.hooks) {
            if (checkStatements(hook.statements)) return true;
        }
        for (const scenario of feature.scenarios) {
            if (checkStatements(scenario.statements)) return true;
        }
        return false;
    }

    private isTabOperationStatement(
        statement: StatementNode
    ): statement is SwitchToNewTabStatement | SwitchToTabStatement | OpenInNewTabStatement | CloseTabStatement {
        return statement.type === 'SwitchToNewTab'
            || statement.type === 'SwitchToTab'
            || statement.type === 'OpenInNewTab'
            || statement.type === 'CloseTab';
    }

    private statementsContainTabOperations(statements: StatementNode[]): boolean {
        for (const statement of statements) {
            if (this.isTabOperationStatement(statement)) {
                return true;
            }
            if (statement.type === 'ForEach' && this.statementsContainTabOperations(statement.statements)) {
                return true;
            }
            if (statement.type === 'TryCatch' &&
                (this.statementsContainTabOperations(statement.tryStatements) ||
                 this.statementsContainTabOperations(statement.catchStatements))) {
                return true;
            }
        }
        return false;
    }

    private hookNeedsContext(hook: HookNode): boolean {
        if (hook.hookType !== 'BEFORE_EACH' && hook.hookType !== 'AFTER_EACH') {
            return false;
        }
        return this.statementsContainTabOperations(hook.statements);
    }

    private scenarioNeedsContext(scenario: ScenarioNode): boolean {
        return this.statementsContainTabOperations(scenario.statements);
    }

    private isFrameOperationStatement(statement: StatementNode): boolean {
        return statement.type === 'SwitchToFrame' || statement.type === 'SwitchToMainFrame';
    }

    private statementsContainFrameOperations(statements: StatementNode[]): boolean {
        for (const statement of statements) {
            if (this.isFrameOperationStatement(statement)) {
                return true;
            }
            if (statement.type === 'ForEach' && this.statementsContainFrameOperations(statement.statements)) {
                return true;
            }
            if (statement.type === 'TryCatch' &&
                (this.statementsContainFrameOperations(statement.tryStatements) ||
                 this.statementsContainFrameOperations(statement.catchStatements))) {
                return true;
            }
        }
        return false;
    }

    private scenarioNeedsFrame(scenario: ScenarioNode): boolean {
        return this.statementsContainFrameOperations(scenario.statements);
    }

    private scenarioNeedsApiRequest(scenario: ScenarioNode): boolean {
        return this.statementsContainApiOperations(scenario.statements);
    }

    private statementsContainApiOperations(statements: StatementNode[]): boolean {
        for (const stmt of statements) {
            if (stmt.type === 'ApiRequest' || stmt.type === 'VerifyResponse') return true;
            if (stmt.type === 'TryCatch') {
                if (this.statementsContainApiOperations(stmt.tryStatements) ||
                    this.statementsContainApiOperations(stmt.catchStatements)) return true;
            }
            if (stmt.type === 'ForEach' && this.statementsContainApiOperations(stmt.statements)) return true;
        }
        return false;
    }

    private formatMultiline(lines: string[]): string {
        return lines.join('\n' + '  '.repeat(this.indent));
    }

    // Delegated to transpilerTabs.ts
    private transpileTabOperation(
        statement: SwitchToNewTabStatement | SwitchToTabStatement | OpenInNewTabStatement | CloseTabStatement,
        uses: string[]
    ): string {
        const helpers: TabTranspilerHelpers = {
            transpileExpression: (expr: ExpressionNode) => this.transpileExpression(expr),
            formatMultiline: (lines: string[]) => this.formatMultiline(lines),
        };
        return transpileTabOperationFn(statement, uses, helpers);
    }

    private transpileSelector(selector: SelectorNode): string {
        const v = selector.value.replace(/'/g, "\\'");
        const loc = this._useFrameContext ? '(__currentFrame || page)' : 'page';

        let base: string;
        switch (selector.selectorType) {
            // Role shorthands
            case 'button':    base = `${loc}.getByRole('button', { name: '${v}' })`; break;
            case 'textbox':   base = `${loc}.getByRole('textbox', { name: '${v}' })`; break;
            case 'link':      base = `${loc}.getByRole('link', { name: '${v}' })`; break;
            case 'checkbox':  base = `${loc}.getByRole('checkbox', { name: '${v}' })`; break;
            case 'heading':   base = `${loc}.getByRole('heading', { name: '${v}' })`; break;
            case 'combobox':  base = `${loc}.getByRole('combobox', { name: '${v}' })`; break;
            case 'radio':     base = `${loc}.getByRole('radio', { name: '${v}' })`; break;

            // Generic role
            case 'role':
                if (selector.nameParam) {
                    const nameEsc = selector.nameParam.replace(/'/g, "\\'");
                    base = `${loc}.getByRole('${v}', { name: '${nameEsc}', exact: true })`;
                } else {
                    base = `${loc}.getByRole('${v}')`;
                }
                break;

            // Other locator methods
            case 'label':       base = `${loc}.getByLabel('${v}')`; break;
            case 'placeholder': base = `${loc}.getByPlaceholder('${v}')`; break;
            case 'testid':      base = `${loc}.getByTestId('${v}')`; break;
            case 'text':        base = `${loc}.getByText('${v}')`; break;
            case 'alt':         base = `${loc}.getByAltText('${v}')`; break;
            case 'title':       base = `${loc}.getByTitle('${v}')`; break;

            // Raw CSS/XPath selectors
            case 'css':
            case 'xpath':
                base = `${loc}.locator('${v}')`; break;

            // Legacy auto-detection
            case 'auto':
            default:
                base = this.transpileAutoSelector(selector.value); break;
        }

        // Append modifier chains
        if (selector.modifiers && selector.modifiers.length > 0) {
            base = this.appendModifiers(base, selector.modifiers);
        }

        return base;
    }

    private appendModifiers(base: string, modifiers: SelectorModifier[]): string {
        let result = base;
        for (const mod of modifiers) {
            switch (mod.type) {
                case 'first':
                    result += '.first()';
                    break;
                case 'last':
                    result += '.last()';
                    break;
                case 'nth':
                    result += `.nth(${mod.index})`;
                    break;
                case 'withText': {
                    const text = mod.text.replace(/'/g, "\\'");
                    result += `.filter({ hasText: '${text}' })`;
                    break;
                }
                case 'withoutText': {
                    const text = mod.text.replace(/'/g, "\\'");
                    result += `.filter({ hasNotText: '${text}' })`;
                    break;
                }
                case 'has': {
                    const inner = this.transpileSelector(mod.selector);
                    result += `.filter({ has: ${inner} })`;
                    break;
                }
                case 'hasNot': {
                    const inner = this.transpileSelector(mod.selector);
                    result += `.filter({ hasNot: ${inner} })`;
                    break;
                }
            }
        }
        return result;
    }

    /**
     * Smart selector detection for 'auto' type.
     * Analyzes the string to determine the best Playwright locator method.
     */
    private transpileAutoSelector(value: string): string {
        // Escape single quotes in the value for JavaScript string literals
        const escapedValue = value.replace(/'/g, "\\'");

        // CSS/XPath patterns that should use page.locator()
        const isCssOrXPath =
            value.startsWith('#') ||                        // ID selector
            value.startsWith('.') ||                        // Class selector
            (value.startsWith('[') && value.includes(']')) || // Attribute selector
            value.startsWith('//') ||                       // XPath
            value.startsWith('/html') ||                    // XPath
            value.includes('>') ||                          // Child combinator
            value.includes('~') ||                          // Sibling combinator
            value.includes('+') ||                          // Adjacent sibling
            (/:[a-z-]+(\(|$)/i.test(value)) ||              // Pseudo-selectors
            /^[a-z]+[.#\[]/i.test(value);                   // Tag with selector

        const loc = this._useFrameContext ? '(__currentFrame || page)' : 'page';
        if (isCssOrXPath) {
            return `${loc}.locator('${escapedValue}')`;
        }

        // Default: treat as human-readable text
        return `${loc}.getByText('${escapedValue}')`;
    }

    private getTargetDescription(target: TargetNode): string {
        if (target.text) return `"${target.text}"`;

        if (target.selector) {
            const value = target.selector.value;
            const truncated = value.length > 30 ? `${value.substring(0, 27)}...` : value;
            return `"${truncated}"`;
        }

        if (target.page && target.field) return `${target.page}.${target.field}`;
        if (target.field) return target.field;

        return 'element';
    }

    private transpileTarget(target: TargetNode, _uses: string[] = [], currentPage?: string): string {
        if (target.text) {
            const loc = this._useFrameContext ? '(__currentFrame || page)' : 'page';
            return `${loc}.getByText('${target.text.replace(/'/g, "\\'")}')`;
        }
        if (target.selector) return this.transpileSelector(target.selector);
        if (target.page && target.field) {
            // If we're inside a page action and referencing the same page, use 'this'
            if (currentPage && target.page === currentPage) {
                return `this.${target.field}`;
            }
            return `${this.camelCase(target.page)}.${target.field}`;
        }
        if (target.field) return `this.${target.field}`;
        return 'page';
    }

    private transpileExpression(expr: ExpressionNode): string {
        switch (expr.type) {
            case 'StringLiteral':
                return `'${expr.value.replace(/'/g, "\\'")}'`;
            case 'NumberLiteral':
            case 'BooleanLiteral':
                return expr.value.toString();
            case 'VariableReference':
                return expr.page ? `${this.camelCase(expr.page)}.${expr.name}` : expr.name;
            case 'EnvVarReference':
                return `__env__['${expr.name}']`;
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

    // Delegated to transpilerUtils.ts

    private camelCase(str: string): string {
        return camelCase(str);
    }

    private generatePageObjectReInit(uses: string[]): string[] {
        return generatePageObjectReInitFn(uses);
    }

    private pascalCase(str: string): string {
        return pascalCase(str);
    }

    private inferTypeFromValue(value: string): string {
        return inferTypeFromValue(value);
    }

    private line(content: string): string {
        return '  '.repeat(this.indent) + content;
    }

    private toReadableTestName(identifier: string): string {
        return toReadableTestName(identifier);
    }

    // ==================== DEBUG MODE ====================
    // Delegated to transpilerDebug.ts

    private generateDebugHelper(): string {
        return generateDebugHelperFn();
    }

    private wrapWithDebug(statement: StatementNode, code: string): string {
        return wrapWithDebugFn(statement, code, this.options, this.indent, getStatementTargetFn);
    }

    private getStatementTarget(statement: StatementNode): string | undefined {
        return getStatementTargetFn(statement);
    }

    private escapeString(str: string): string {
        return escapeString(str);
    }
}

export function transpile(ast: ProgramNode, options?: TranspileOptions): TranspileResult {
    const transpiler = new Transpiler(options);
    return transpiler.transpile(ast);
}
