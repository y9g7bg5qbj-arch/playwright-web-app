import {
    ProgramNode, PageNode, FeatureNode, ScenarioNode,
    FieldNode, ActionDefinitionNode, HookNode, StatementNode,
    SelectorNode, TargetNode, ExpressionNode, VerifyCondition,
    LoadStatement, ForEachStatement, WhereClause,
    DataQueryStatement, DataQuery, TableQuery, AggregationQuery,
    DataCondition, DataComparison, TableReference, OrderByClause,
    FixtureNode, FixtureUseNode, FixtureOptionNode,
    UploadStatement, VerifyUrlStatement, VerifyTitleStatement, VerifyHasStatement,
    FeatureAnnotation, ScenarioAnnotation
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

    private transpileFeature(feature: FeatureNode, allFixtures: FixtureNode[] = []): string {
        const lines: string[] = [];

        // Collect all tables used in VDQL queries
        const usedTables = this.collectUsedTables(feature);
        const hasVDQL = usedTables.length > 0;

        // Check if feature uses any fixtures
        const usesFixtures = (feature.fixtures || []).length > 0;

        // Imports - use fixtures test if fixtures are used
        if (usesFixtures) {
            lines.push("import { test, expect } from '../fixtures';");
        } else {
            lines.push("import { test, expect } from '@playwright/test';");
        }
        for (const usedPage of feature.uses) {
            lines.push(`import { ${usedPage} } from '../${this.options.pageObjectDir}/${usedPage}';`);
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
        const testName = tags ? `${scenario.name} ${tags}` : scenario.name;

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

        lines.push(this.line(`${testCall}('${testName}', async ({ page }) => {`));
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

            case 'Load':
                return this.transpileLoadStatement(statement as LoadStatement);

            case 'ForEach':
                return this.transpileForEachStatement(statement as ForEachStatement, uses);

            case 'DataQuery':
                return this.transpileDataQueryStatement(statement as DataQueryStatement);

            case 'Upload':
                return this.transpileUploadStatement(statement as UploadStatement, uses);

            case 'VerifyUrl':
                return this.transpileVerifyUrlStatement(statement as VerifyUrlStatement);

            case 'VerifyTitle':
                return this.transpileVerifyTitleStatement(statement as VerifyTitleStatement);

            case 'VerifyHas':
                return this.transpileVerifyHasStatement(statement as VerifyHasStatement, uses);

            default:
                return `// Unknown statement type`;
        }
    }

    private transpileUploadStatement(statement: UploadStatement, uses: string[]): string {
        const target = this.transpileTarget(statement.target, uses);
        const files = statement.files.map(f => this.transpileExpression(f));

        if (files.length === 1) {
            return `await ${target}.setInputFiles(${files[0]});`;
        } else {
            return `await ${target}.setInputFiles([${files.join(', ')}]);`;
        }
    }

    private transpileVerifyUrlStatement(statement: VerifyUrlStatement): string {
        const value = this.transpileExpression(statement.value);

        switch (statement.condition) {
            case 'contains':
                // Use regex for contains
                return `await expect(page).toHaveURL(new RegExp(${value}));`;
            case 'equals':
                return `await expect(page).toHaveURL(${value});`;
            case 'matches':
                return `await expect(page).toHaveURL(new RegExp(${value}));`;
            default:
                return `await expect(page).toHaveURL(${value});`;
        }
    }

    private transpileVerifyTitleStatement(statement: VerifyTitleStatement): string {
        const value = this.transpileExpression(statement.value);

        switch (statement.condition) {
            case 'contains':
                // Use regex for contains
                return `await expect(page).toHaveTitle(new RegExp(${value}));`;
            case 'equals':
                return `await expect(page).toHaveTitle(${value});`;
            default:
                return `await expect(page).toHaveTitle(${value});`;
        }
    }

    private transpileVerifyHasStatement(statement: VerifyHasStatement, uses: string[]): string {
        const target = this.transpileTarget(statement.target, uses);
        const { hasCondition } = statement;

        switch (hasCondition.type) {
            case 'HasCount':
                return `await expect(${target}).toHaveCount(${this.transpileExpression(hasCondition.count)});`;
            case 'HasValue':
                return `await expect(${target}).toHaveValue(${this.transpileExpression(hasCondition.value)});`;
            case 'HasAttribute':
                return `await expect(${target}).toHaveAttribute(${this.transpileExpression(hasCondition.attribute)}, ${this.transpileExpression(hasCondition.value)});`;
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

    private transpileForEachStatement(statement: ForEachStatement, uses: string[]): string {
        const { itemVariable, collectionVariable, statements } = statement;

        const lines: string[] = [];
        lines.push(`for (const ${itemVariable} of ${collectionVariable}) {`);
        this.indent++;

        for (const stmt of statements) {
            const code = this.transpileStatement(stmt, uses);
            if (code) lines.push(this.line(code));
        }

        this.indent--;
        lines.push(this.line('}'));

        return lines.join('\n');
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

    private transpileTableReference(ref: TableReference): string {
        let result = ref.tableName;
        if (ref.column) {
            result += `.${ref.column}`;
        }
        return result;
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
