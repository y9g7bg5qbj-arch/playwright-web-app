import {
    ProgramNode, PageNode, FeatureNode, ScenarioNode,
    FieldNode, ActionDefinitionNode, HookNode, StatementNode,
    SelectorNode, TargetNode, ExpressionNode, VerifyCondition,
    LoadStatement, ForEachStatement, WhereClause,
    DataQueryStatement, DataQuery, TableQuery, AggregationQuery,
    DataCondition, DataComparison,
    FixtureNode,
    UploadStatement, VerifyUrlStatement, VerifyTitleStatement, VerifyHasStatement,
    // New ROW/ROWS syntax types
    RowStatement, RowsStatement, ColumnAccessStatement, CountStatement, SimpleTableReference,
    // Utility function types
    UtilityAssignmentStatement, UtilityExpressionNode,
    TrimExpression, ConvertExpression, ExtractExpression, ReplaceExpression,
    SplitExpression, JoinExpression, LengthExpression, PadExpression,
    TodayExpression, NowExpression, AddDateExpression, SubtractDateExpression,
    FormatExpression, DatePartExpression, RoundExpression, AbsoluteExpression,
    GenerateExpression, RandomNumberExpression, ChainedExpression
} from '../parser/ast.js';

export interface TranspileOptions {
    baseUrl?: string;
    outputDir?: string;
    pageObjectDir?: string;
    testDir?: string;
    debugMode?: boolean;  // Enable debug step markers for line-by-line debugging
}

export interface TranspileResult {
    pages: Map<string, string>;     // pageName -> TypeScript code
    tests: Map<string, string>;     // featureName -> TypeScript code
    fixtures: Map<string, string>;  // fixtureName -> TypeScript code
    fixturesIndex?: string;         // Combined fixtures export file
}

export class Transpiler {
    private options: TranspileOptions;
    private indent = 0;
    private usedTables: Set<string> = new Set();  // Track tables used in VDQL

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
        let hasEnvVars = false;

        const checkExpression = (expr: ExpressionNode): void => {
            if (expr.type === 'EnvVarReference') {
                hasEnvVars = true;
            }
        };

        const checkStatements = (statements: StatementNode[]): void => {
            for (const stmt of statements) {
                if ('value' in stmt && stmt.value) {
                    checkExpression(stmt.value as ExpressionNode);
                }
                if ('url' in stmt && stmt.url) {
                    checkExpression(stmt.url as ExpressionNode);
                }
                if ('message' in stmt && stmt.message) {
                    checkExpression(stmt.message as ExpressionNode);
                }
                if (stmt.type === 'ForEach') {
                    checkStatements((stmt as ForEachStatement).statements);
                }
            }
        };

        // Check hooks
        for (const hook of feature.hooks) {
            checkStatements(hook.statements);
        }

        // Check scenarios
        for (const scenario of feature.scenarios) {
            checkStatements(scenario.statements);
        }

        return hasEnvVars;
    }

    /**
     * Collect all table names used in VDQL queries within a feature
     */
    private collectUsedTables(feature: FeatureNode): string[] {
        this.usedTables.clear();

        const collectFromStatements = (statements: StatementNode[]) => {
            for (const stmt of statements) {
                if (stmt.type === 'DataQuery') {
                    const query = (stmt as DataQueryStatement).query;
                    this.usedTables.add(query.tableRef.tableName);
                } else if (stmt.type === 'Load') {
                    this.usedTables.add((stmt as LoadStatement).tableName);
                } else if (stmt.type === 'ForEach') {
                    collectFromStatements((stmt as ForEachStatement).statements);
                }
                // New ROW/ROWS syntax
                else if (stmt.type === 'Row') {
                    this.usedTables.add((stmt as RowStatement).tableRef.tableName);
                } else if (stmt.type === 'Rows') {
                    this.usedTables.add((stmt as RowsStatement).tableRef.tableName);
                } else if (stmt.type === 'ColumnAccess') {
                    this.usedTables.add((stmt as ColumnAccessStatement).tableRef.tableName);
                } else if (stmt.type === 'Count') {
                    this.usedTables.add((stmt as CountStatement).tableRef.tableName);
                }
            }
        };

        // Collect from hooks
        for (const hook of feature.hooks) {
            collectFromStatements(hook.statements);
        }

        // Collect from scenarios
        for (const scenario of feature.scenarios) {
            collectFromStatements(scenario.statements);
        }

        return [...this.usedTables];
    }

    transpile(ast: ProgramNode): TranspileResult {
        const pages = new Map<string, string>();
        const tests = new Map<string, string>();
        const fixtures = new Map<string, string>();

        for (const page of ast.pages) {
            pages.set(page.name, this.transpilePage(page));
        }

        // Transpile fixtures
        for (const fixture of ast.fixtures || []) {
            fixtures.set(fixture.name, this.transpileFixture(fixture));
        }

        // Generate fixtures index file if there are fixtures
        let fixturesIndex: string | undefined;
        if ((ast.fixtures || []).length > 0) {
            fixturesIndex = this.generateFixturesIndex(ast.fixtures || []);
        }

        for (const feature of ast.features) {
            tests.set(feature.name, this.transpileFeature(feature, ast.fixtures || []));
        }

        return { pages, tests, fixtures, fixturesIndex };
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
        const deps = dependencies.length > 0 ? dependencies.join(', ') : 'page';

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
                if (code) lines.push(this.line(code));
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
                if (code) lines.push(this.line(code));
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
        let hasUtils = false;

        const checkStatements = (statements: StatementNode[]): void => {
            for (const stmt of statements) {
                if (stmt.type === 'UtilityAssignment') {
                    hasUtils = true;
                    return;
                }
                if (stmt.type === 'ForEach') {
                    checkStatements((stmt as ForEachStatement).statements);
                }
            }
        };

        // Check hooks
        for (const hook of feature.hooks) {
            checkStatements(hook.statements);
            if (hasUtils) return true;
        }

        // Check scenarios
        for (const scenario of feature.scenarios) {
            checkStatements(scenario.statements);
            if (hasUtils) return true;
        }

        return hasUtils;
    }

    private transpileFeature(feature: FeatureNode, allFixtures: FixtureNode[] = []): string {
        const lines: string[] = [];

        // Collect all tables used in VDQL queries
        const usedTables = this.collectUsedTables(feature);
        const hasVDQL = usedTables.length > 0;

        // Check if feature uses any environment variables
        const hasEnvVars = this.usesEnvVars(feature);

        // Check if feature uses any fixtures
        const usesFixtures = (feature.fixtures || []).length > 0;

        // Check if feature uses utility functions
        const hasUtilityFunctions = this.usesUtilityFunctions(feature);

        // Imports - use fixtures test if fixtures are used
        if (usesFixtures) {
            lines.push("import { test, expect } from '../fixtures';");
        } else {
            lines.push("import { test, expect } from '@playwright/test';");
        }
        for (const usedPage of feature.uses) {
            lines.push(`import { ${usedPage} } from '../${this.options.pageObjectDir}/${usedPage}';`);
        }

        // Add VeroUtils imports if utility functions are used
        if (hasUtilityFunctions) {
            lines.push("import { veroString, veroDate, veroNumber, veroConvert, veroGenerate } from '../runtime/VeroUtils';");
        }

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
        const hasSerial = (feature.annotations || []).includes('serial');
        const hasSkip = (feature.annotations || []).includes('skip');
        const hasOnly = (feature.annotations || []).includes('only');

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

        // Page object variables
        if (feature.uses.length > 0) {
            for (const usedPage of feature.uses) {
                const varName = this.camelCase(usedPage);
                lines.push(this.line(`let ${varName}: ${usedPage};`));
            }
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

            // Generate beforeAll to preload tables
            lines.push(this.line('// Preload all test data tables ONCE before tests run'));
            lines.push(this.line('// This is the ONLY time database calls are made'));
            lines.push(this.line('test.beforeAll(async () => {'));
            this.indent++;
            const tableList = usedTables.map(t => `'${t}'`).join(', ');
            lines.push(this.line(`await dataManager.preloadTables([${tableList}]);`));
            this.indent--;
            lines.push(this.line('});'));
            lines.push('');
        }

        // User-defined hooks
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
        const readableName = this.toReadableTestName(scenario.name);
        const testName = tags ? `${readableName} ${tags}` : readableName;

        // Determine test modifier based on annotations
        const annotations = scenario.annotations || [];
        const hasSkip = annotations.includes('skip');
        const hasOnly = annotations.includes('only');
        const hasSlow = annotations.includes('slow');
        const hasFixme = annotations.includes('fixme');

        // Determine test call: test.skip, test.only, test.fixme, or test
        let testCall = 'test';
        if (hasSkip) {
            testCall = 'test.skip';
        } else if (hasOnly) {
            testCall = 'test.only';
        } else if (hasFixme) {
            testCall = 'test.fixme';
        }

        lines.push(this.line(`${testCall}('${testName}', async ({ page }, testInfo) => {`));
        this.indent++;

        // Add test.slow() inside test body if @slow annotation is present
        if (hasSlow) {
            lines.push(this.line('test.slow(); // Triple the timeout'));
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

            case 'TakeScreenshot':
                if (statement.target) {
                    // Element screenshot
                    const locator = this.transpileTarget(statement.target, uses, currentPage);
                    const opts = statement.filename ? `{ path: '${statement.filename}' }` : '';
                    const stepName = statement.filename ? `Take screenshot of element as ${statement.filename}` : 'Take screenshot of element';
                    return `await test.step('${stepName}', async () => { await ${locator}.screenshot(${opts}); });`;
                } else {
                    // Full page screenshot
                    if (statement.filename) {
                        return `await test.step('Take screenshot as ${statement.filename}', async () => { await page.screenshot({ path: '${statement.filename}' }); });`;
                    }
                    return `await test.step('Take screenshot', async () => { await page.screenshot(); });`;
                }

            case 'Log':
                return `await test.step('Log: ' + ${this.transpileExpression(statement.message)}, async () => { console.log(${this.transpileExpression(statement.message)}); });`;

            case 'Load':
                return this.transpileLoadStatement(statement as LoadStatement);

            case 'ForEach':
                return this.transpileForEachStatement(statement as ForEachStatement, uses, currentPage);

            case 'DataQuery':
                return this.transpileDataQueryStatement(statement as DataQueryStatement);

            case 'Upload':
                return this.transpileUploadStatement(statement as UploadStatement, uses, currentPage);

            case 'VerifyUrl':
                return this.transpileVerifyUrlStatement(statement as VerifyUrlStatement);

            case 'VerifyTitle':
                return this.transpileVerifyTitleStatement(statement as VerifyTitleStatement);

            case 'VerifyHas':
                return this.transpileVerifyHasStatement(statement as VerifyHasStatement, uses, currentPage);

            // New ROW/ROWS syntax
            case 'Row':
                return this.transpileRowStatement(statement as RowStatement);

            case 'Rows':
                return this.transpileRowsStatement(statement as RowsStatement);

            case 'ColumnAccess':
                return this.transpileColumnAccessStatement(statement as ColumnAccessStatement);

            case 'Count':
                return this.transpileCountStatement(statement as CountStatement);

            case 'UtilityAssignment':
                return this.transpileUtilityAssignment(statement as UtilityAssignmentStatement);

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
     * Transpile a utility expression to JavaScript
     */
    private transpileUtilityExpression(expr: UtilityExpressionNode): string {
        // Check the expression type
        if (!expr || typeof expr !== 'object') {
            return 'null';
        }

        switch (expr.type) {
            case 'Trim':
                return this.transpileTrimExpression(expr as TrimExpression);

            case 'Convert':
                return this.transpileConvertExpression(expr as ConvertExpression);

            case 'Extract':
                return this.transpileExtractExpression(expr as ExtractExpression);

            case 'Replace':
                return this.transpileReplaceExpression(expr as ReplaceExpression);

            case 'Split':
                return this.transpileSplitExpression(expr as SplitExpression);

            case 'Join':
                return this.transpileJoinExpression(expr as JoinExpression);

            case 'Length':
                return this.transpileLengthExpression(expr as LengthExpression);

            case 'Pad':
                return this.transpilePadExpression(expr as PadExpression);

            case 'Today':
                return 'veroDate.today()';

            case 'Now':
                return 'veroDate.now()';

            case 'AddDate':
                return this.transpileAddDateExpression(expr as AddDateExpression);

            case 'SubtractDate':
                return this.transpileSubtractDateExpression(expr as SubtractDateExpression);

            case 'Format':
                return this.transpileFormatExpression(expr as FormatExpression);

            case 'DatePart':
                return this.transpileDatePartExpression(expr as DatePartExpression);

            case 'Round':
                return this.transpileRoundExpression(expr as RoundExpression);

            case 'Absolute':
                return this.transpileAbsoluteExpression(expr as AbsoluteExpression);

            case 'Generate':
                return this.transpileGenerateExpression(expr as GenerateExpression);

            case 'RandomNumber':
                return this.transpileRandomNumberExpression(expr as RandomNumberExpression);

            case 'Chained':
                return this.transpileChainedExpression(expr as ChainedExpression);

            // Fallback to regular expression types
            case 'StringLiteral':
            case 'NumberLiteral':
            case 'BooleanLiteral':
            case 'VariableReference':
            case 'EnvVarReference':
                return this.transpileExpression(expr as ExpressionNode);

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
                const filterCode = this.transpileDataConditionForFilter(where, filterVar);
                lines.push(`const _filtered = ${tableName}.filter(${filterVar} => ${filterCode});`);
                lines.push(`const ${rawVar} = _filtered[Math.floor(Math.random() * _filtered.length)];`);
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
                const sortCode = this.generateSortCode(orderBy);
                lines.push(`const _sorted = [...${tableName}].sort(${sortCode});`);
                sortedRef = '_sorted';
            }

            if (where) {
                const filterCode = this.transpileDataConditionForFilter(where, filterVar);
                lines.push(`const _filtered = ${sortedRef}.filter(${filterVar} => ${filterCode});`);
                if (modifier === 'FIRST') {
                    lines.push(`const ${rawVar} = _filtered[0];`);
                } else {
                    lines.push(`const ${rawVar} = _filtered[_filtered.length - 1];`);
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

    private transpileDataQueryStatement(statement: DataQueryStatement): string {
        const { resultType, variableName, query } = statement;
        const tsType = this.getVDQLResultType(resultType);
        const queryCode = this.transpileDataQuery(query);
        return `const ${variableName}: ${tsType} = ${queryCode};`;
    }

    private getVDQLResultType(resultType: DataQueryStatement['resultType']): string {
        const typeMap: Record<string, string> = {
            'DATA': 'Record<string, unknown>',
            'LIST': 'unknown[]',
            'TEXT': 'string',
            'NUMBER': 'number',
            'FLAG': 'boolean'
        };
        return typeMap[resultType] || 'unknown';
    }

    private transpileDataQuery(query: DataQuery): string {
        if (query.type === 'TableQuery') {
            return this.transpileTableQuery(query);
        } else {
            return this.transpileAggregationQuery(query);
        }
    }

    private transpileTableQuery(query: TableQuery): string {
        const parts: string[] = [];

        // Build the query chain
        parts.push(`await dataManager.query('${query.tableRef.tableName}')`);

        // Add column selection if specified (single column)
        if (query.tableRef.column) {
            parts.push(`.select('${query.tableRef.column}')`);
        }

        // Add multi-column selection: .(email, name)
        if (query.columns && query.columns.length > 0) {
            const columnList = query.columns.map(c => `'${c}'`).join(', ');
            parts.push(`.select([${columnList}])`);
        }

        // Add row index access if specified
        if (query.tableRef.rowIndex !== undefined) {
            parts.push(`.row(${this.transpileExpression(query.tableRef.rowIndex)})`);
        }

        // Add row range access: [5..10]
        if (query.tableRef.rangeStart !== undefined && query.tableRef.rangeEnd !== undefined) {
            parts.push(`.range(${this.transpileExpression(query.tableRef.rangeStart)}, ${this.transpileExpression(query.tableRef.rangeEnd)})`);
        }

        // Add cell access if specified
        if (query.tableRef.cellRow !== undefined && query.tableRef.cellCol !== undefined) {
            parts.push(`.cell(${this.transpileExpression(query.tableRef.cellRow)}, ${this.transpileExpression(query.tableRef.cellCol)})`);
        }

        // Add WHERE clause
        if (query.where) {
            const whereCode = this.transpileDataCondition(query.where);
            parts.push(`.where(${whereCode})`);
        }

        // Add ORDER BY
        if (query.orderBy && query.orderBy.length > 0) {
            const orderFields = query.orderBy.map(o =>
                `{ column: '${o.column}', direction: '${o.direction}' }`
            ).join(', ');
            parts.push(`.orderBy([${orderFields}])`);
        }

        // Add LIMIT
        if (query.limit !== undefined) {
            parts.push(`.limit(${query.limit})`);
        }

        // Add OFFSET
        if (query.offset !== undefined) {
            parts.push(`.offset(${query.offset})`);
        }

        // Add position modifier (first/last/random)
        if (query.position === 'first') {
            parts.push('.first()');
        } else if (query.position === 'last') {
            parts.push('.last()');
        } else if (query.position === 'random') {
            parts.push('.random()');
        }

        // Add default value
        if (query.defaultValue) {
            parts.push(`.default(${this.transpileExpression(query.defaultValue)})`);
        }

        return parts.join('');
    }

    private transpileAggregationQuery(query: AggregationQuery): string {
        const funcMap: Record<string, string> = {
            'COUNT': 'count',
            'SUM': 'sum',
            'AVERAGE': 'average',
            'MIN': 'min',
            'MAX': 'max',
            'DISTINCT': 'distinct',
            'ROWS': 'rowCount',
            'COLUMNS': 'columnCount',
            'HEADERS': 'headers'
        };

        const funcName = funcMap[query.function] || 'count';
        const parts: string[] = [];

        parts.push(`await dataManager.query('${query.tableRef.tableName}')`);

        // Add WHERE clause before aggregation
        if (query.where) {
            const whereCode = this.transpileDataCondition(query.where);
            parts.push(`.where(${whereCode})`);
        }

        // Add aggregation function
        if (query.column) {
            parts.push(`.${funcName}('${query.column}')`);
        } else {
            parts.push(`.${funcName}()`);
        }

        // Handle distinct modifier
        if (query.distinct && query.function === 'COUNT') {
            // Rewrite for count distinct
            return `await dataManager.query('${query.tableRef.tableName}')${query.where ? `.where(${this.transpileDataCondition(query.where)})` : ''}.countDistinct('${query.column || '*'}')`;
        }

        return parts.join('');
    }

    private transpileDataCondition(condition: DataCondition): string {
        switch (condition.type) {
            case 'And':
                return `and(${this.transpileDataCondition(condition.left)}, ${this.transpileDataCondition(condition.right)})`;
            case 'Or':
                return `or(${this.transpileDataCondition(condition.left)}, ${this.transpileDataCondition(condition.right)})`;
            case 'Not':
                return `not(${this.transpileDataCondition(condition.condition)})`;
            case 'Comparison':
                return this.transpileDataComparison(condition);
            default:
                return 'true';
        }
    }

    private transpileDataComparison(comparison: DataComparison): string {
        const { column, operator, value, values } = comparison;

        // Handle null/empty checks
        if (operator === 'IS_NULL') {
            return `isNull('${column}')`;
        }
        if (operator === 'IS_EMPTY') {
            return `isEmpty('${column}')`;
        }
        if (operator === 'IS_NOT_EMPTY') {
            return `isNotEmpty('${column}')`;
        }

        // Handle IN/NOT IN
        if (operator === 'IN' && values) {
            const valuesCode = values.map(v => this.transpileExpression(v)).join(', ');
            return `isIn('${column}', [${valuesCode}])`;
        }
        if (operator === 'NOT_IN' && values) {
            const valuesCode = values.map(v => this.transpileExpression(v)).join(', ');
            return `notIn('${column}', [${valuesCode}])`;
        }

        // Handle standard comparisons
        const valueCode = value ? this.transpileExpression(value) : 'null';

        const opMap: Record<string, string> = {
            '==': 'eq',
            '!=': 'neq',
            '>': 'gt',
            '<': 'lt',
            '>=': 'gte',
            '<=': 'lte',
            'CONTAINS': 'contains',
            'STARTS_WITH': 'startsWith',
            'ENDS_WITH': 'endsWith',
            'MATCHES': 'matches'
        };

        const funcName = opMap[operator] || 'eq';
        return `${funcName}('${column}', ${valueCode})`;
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

    private transpileSelector(selector: SelectorNode): string {
        // All selectors now use auto-detection
        return this.transpileAutoSelector(selector.value);
    }

    /**
     * Smart selector detection for 'auto' type.
     * Analyzes the string to determine the best Playwright locator method.
     */
    private transpileAutoSelector(value: string): string {
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

        if (isCssOrXPath) {
            return `page.locator('${value}')`;
        }

        // Default: treat as human-readable text
        return `page.getByText('${value}')`;
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
        if (target.text) return `page.getByText('${target.text}')`;
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

    private camelCase(str: string): string {
        return str.charAt(0).toLowerCase() + str.slice(1);
    }

    private pascalCase(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    private inferTypeFromValue(value: string): string {
        // Infer TypeScript type from transpiled value string
        if (value.startsWith("'") || value.startsWith('"')) {
            return 'string';
        }
        if (value === 'true' || value === 'false') {
            return 'boolean';
        }
        if (!isNaN(Number(value))) {
            return 'number';
        }
        return 'unknown';
    }

    private line(content: string): string {
        return '  '.repeat(this.indent) + content;
    }

    /**
     * Convert PascalCase/camelCase identifier to readable test name.
     * e.g., "LoginWithValidCredentials" → "Login With Valid Credentials"
     */
    private toReadableTestName(identifier: string): string {
        return identifier
            .replace(/([a-z])([A-Z])/g, '$1 $2')  // Insert space before uppercase letters
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')  // Handle acronyms
            .replace(/_/g, ' ')  // Replace underscores with spaces
            .trim();
    }

    // ==================== DEBUG MODE ====================

    /**
     * Generate the debug helper object that enables line-by-line debugging.
     * This helper communicates with the parent process via IPC.
     */
    private generateDebugHelper(): string {
        return `
// Debug helper for line-by-line debugging
const __debug__ = {
    breakpoints: new Set<number>(process.env.VERO_BREAKPOINTS?.split(',').map(Number).filter(n => !isNaN(n)) || []),
    currentLine: 0,
    isPaused: false,
    stepMode: false,

    async beforeStep(line: number, action: string, target?: string): Promise<void> {
        this.currentLine = line;
        // Notify parent process of step start
        if (process.send) {
            process.send({ type: 'step:before', line, action, target, timestamp: Date.now() });
        }

        // Check if we should pause (breakpoint hit or step mode)
        if (this.breakpoints.has(line) || this.stepMode) {
            this.isPaused = true;
            if (process.send) {
                process.send({ type: 'execution:paused', line, action, target });
            }
            await this.waitForResume();
        }
    },

    async afterStep(line: number, action: string, success: boolean = true, duration?: number): Promise<void> {
        // Notify parent process of step completion
        if (process.send) {
            process.send({ type: 'step:after', line, action, success, duration, timestamp: Date.now() });
        }
    },

    async waitForResume(): Promise<void> {
        return new Promise<void>((resolve) => {
            const handler = (msg: any) => {
                if (msg.type === 'resume') {
                    this.isPaused = false;
                    this.stepMode = false;
                    process.removeListener('message', handler);
                    resolve();
                } else if (msg.type === 'step') {
                    this.stepMode = true;
                    this.isPaused = false;
                    process.removeListener('message', handler);
                    resolve();
                } else if (msg.type === 'stop') {
                    process.exit(0);
                } else if (msg.type === 'set-breakpoints') {
                    this.breakpoints = new Set(msg.lines || []);
                }
            };
            process.on('message', handler);
        });
    },

    logVariable(name: string, value: unknown): void {
        if (process.send) {
            process.send({
                type: 'variable',
                name,
                value: JSON.stringify(value),
                valueType: typeof value
            });
        }
    }
};
`;
    }

    /**
     * Wrap a statement with debug markers for line-by-line debugging.
     * Returns the original statement if debug mode is disabled.
     */
    private wrapWithDebug(statement: StatementNode, code: string): string {
        if (!this.options.debugMode) {
            return code;
        }

        const line = statement.line;
        const action = statement.type;
        const target = this.getStatementTarget(statement);
        const targetStr = target ? `, '${this.escapeString(target)}'` : '';

        const lines: string[] = [];
        lines.push(`const __start_${line}__ = Date.now();`);
        lines.push(`await __debug__.beforeStep(${line}, '${action}'${targetStr});`);
        lines.push(`try {`);
        lines.push(`  ${code}`);
        lines.push(`  await __debug__.afterStep(${line}, '${action}', true, Date.now() - __start_${line}__);`);
        lines.push(`} catch (e) {`);
        lines.push(`  await __debug__.afterStep(${line}, '${action}', false, Date.now() - __start_${line}__);`);
        lines.push(`  throw e;`);
        lines.push(`}`);

        return lines.join('\n' + '  '.repeat(this.indent));
    }

    /**
     * Extract target information from a statement for debug logging.
     */
    private getStatementTarget(statement: StatementNode): string | undefined {
        switch (statement.type) {
            case 'Click':
            case 'RightClick':
            case 'DoubleClick':
            case 'ForceClick':
            case 'Fill':
            case 'Check':
            case 'Hover':
            case 'Upload':
            case 'VerifyHas':
                if ('target' in statement && statement.target) {
                    const t = statement.target as TargetNode;
                    return t.text || t.field || (t.selector?.value) || undefined;
                }
                return undefined;
            case 'Drag':
                if ('source' in statement && statement.source) {
                    const t = statement.source as TargetNode;
                    return t.text || t.field || (t.selector?.value) || undefined;
                }
                return undefined;
            case 'Open':
                if ('url' in statement) {
                    const url = statement.url as ExpressionNode;
                    return url.type === 'StringLiteral' ? url.value : undefined;
                }
                return undefined;
            case 'Press':
                return (statement as any).key;
            case 'VerifyUrl':
            case 'VerifyTitle':
                if ('value' in statement) {
                    const val = (statement as any).value as ExpressionNode;
                    return val.type === 'StringLiteral' ? val.value : undefined;
                }
                return undefined;
            default:
                return undefined;
        }
    }

    /**
     * Escape a string for use in generated code.
     */
    private escapeString(str: string): string {
        return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
    }
}

export function transpile(ast: ProgramNode, options?: TranspileOptions): TranspileResult {
    const transpiler = new Transpiler(options);
    return transpiler.transpile(ast);
}
