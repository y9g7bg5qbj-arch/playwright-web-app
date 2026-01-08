// Program is the root node
export interface ProgramNode {
    type: 'Program';
    pages: PageNode[];
    features: FeatureNode[];
    fixtures: FixtureNode[];
}

// PAGE LoginPage { ... }
export interface PageNode {
    type: 'Page';
    name: string;
    fields: FieldNode[];
    variables: VariableNode[];
    actions: ActionDefinitionNode[];
    line: number;
}

// Feature annotations
export type FeatureAnnotation = 'serial' | 'skip' | 'only';

// FEATURE Login { ... }
export interface FeatureNode {
    type: 'Feature';
    name: string;
    annotations: FeatureAnnotation[];  // @serial, @skip, @only
    uses: string[];           // USE statements
    fixtures: FixtureUseNode[];  // WITH FIXTURE statements
    hooks: HookNode[];        // BEFORE/AFTER hooks
    scenarios: ScenarioNode[];
    line: number;
}

// ==================== FIXTURE TYPES ====================

// FIXTURE authenticatedUser { ... }
export interface FixtureNode {
    type: 'Fixture';
    name: string;
    parameters: string[];     // Parameters for parameterized fixtures
    scope: 'test' | 'worker'; // test = per-test, worker = shared across tests
    dependencies: string[];   // DEPENDS ON page, context
    auto: boolean;            // AUTO flag - runs for all tests
    options: FixtureOptionNode[];  // OPTION name DEFAULT value
    setup: StatementNode[];   // SETUP block
    teardown: StatementNode[]; // TEARDOWN block
    line: number;
}

// OPTION name DEFAULT "value"
export interface FixtureOptionNode {
    type: 'FixtureOption';
    name: string;
    defaultValue: ExpressionNode;
    line: number;
}

// WITH FIXTURE authenticatedUser { role = "admin" }
export interface FixtureUseNode {
    type: 'FixtureUse';
    fixtureName: string;
    options: FixtureOptionValue[];  // { role = "admin", count = 5 }
    line: number;
}

// Option value in fixture use: role = "admin"
export interface FixtureOptionValue {
    name: string;
    value: ExpressionNode;
}

// Scenario annotations that affect test behavior
export type ScenarioAnnotation = 'skip' | 'only' | 'slow' | 'fixme';

// SCENARIO "test name" @tag { ... }
export interface ScenarioNode {
    type: 'Scenario';
    name: string;
    annotations: ScenarioAnnotation[];  // @skip, @only, @slow, @fixme
    tags: string[];
    statements: StatementNode[];
    line: number;
}

// FIELD emailInput = TEXTBOX "Email"
export interface FieldNode {
    type: 'Field';
    name: string;
    selector: SelectorNode;
    line: number;
}

export interface SelectorNode {
    type: 'Selector';
    selectorType: 'auto';  // Transpiler auto-detects based on string content
    value: string;
}

// TEXT defaultEmail = "test@example.com"
export interface VariableNode {
    type: 'Variable';
    varType: 'TEXT' | 'NUMBER' | 'FLAG' | 'LIST';
    name: string;
    value: string | number | boolean | null;
    line: number;
}

// login WITH email, password { ... }
export interface ActionDefinitionNode {
    type: 'ActionDefinition';
    name: string;
    parameters: string[];
    returnType?: 'TEXT' | 'NUMBER' | 'FLAG' | 'LIST';
    statements: StatementNode[];
    line: number;
}

// BEFORE EACH { ... }
export interface HookNode {
    type: 'Hook';
    hookType: 'BEFORE_ALL' | 'BEFORE_EACH' | 'AFTER_ALL' | 'AFTER_EACH';
    statements: StatementNode[];
    line: number;
}

// All possible statement types
export type StatementNode =
    | ClickStatement
    | FillStatement
    | OpenStatement
    | VerifyStatement
    | VerifyUrlStatement
    | VerifyTitleStatement
    | VerifyHasStatement
    | DoStatement
    | WaitStatement
    | RefreshStatement
    | CheckStatement
    | HoverStatement
    | PressStatement
    | LogStatement
    | TakeScreenshotStatement
    | UploadStatement
    | LoadStatement
    | ForEachStatement
    | DataQueryStatement;

export interface ClickStatement {
    type: 'Click';
    target: TargetNode;
    line: number;
}

export interface FillStatement {
    type: 'Fill';
    target: TargetNode;
    value: ExpressionNode;
    line: number;
}

export interface OpenStatement {
    type: 'Open';
    url: ExpressionNode;
    line: number;
}

export interface VerifyStatement {
    type: 'Verify';
    target: TargetNode | ExpressionNode;
    condition: VerifyCondition;
    line: number;
}

export interface VerifyCondition {
    type: 'Condition';
    operator: 'IS' | 'IS_NOT' | 'CONTAINS' | 'NOT_CONTAINS';
    value?: 'VISIBLE' | 'HIDDEN' | 'ENABLED' | 'DISABLED' | 'CHECKED' | 'EMPTY' | ExpressionNode;
}

export interface DoStatement {
    type: 'Do';
    action: ActionCallNode;
    line: number;
}

export interface ActionCallNode {
    type: 'ActionCall';
    page?: string;        // LoginPage
    action: string;       // login
    arguments: ExpressionNode[];
}

export interface WaitStatement {
    type: 'Wait';
    duration?: number;
    unit?: 'seconds' | 'milliseconds';
    line: number;
}

export interface RefreshStatement {
    type: 'Refresh';
    line: number;
}

export interface CheckStatement {
    type: 'Check';
    target: TargetNode;
    line: number;
}

export interface HoverStatement {
    type: 'Hover';
    target: TargetNode;
    line: number;
}

export interface PressStatement {
    type: 'Press';
    key: string;
    line: number;
}

export interface LogStatement {
    type: 'Log';
    message: ExpressionNode;
    line: number;
}

export interface TakeScreenshotStatement {
    type: 'TakeScreenshot';
    filename?: string;
    line: number;
}

// upload "file.pdf" to "#fileInput"
export interface UploadStatement {
    type: 'Upload';
    files: ExpressionNode[];   // Array of file paths
    target: TargetNode;
    line: number;
}

// verify url contains "/dashboard"
export interface VerifyUrlStatement {
    type: 'VerifyUrl';
    condition: 'contains' | 'equals' | 'matches';
    value: ExpressionNode;
    line: number;
}

// verify title equals "Dashboard"
export interface VerifyTitleStatement {
    type: 'VerifyTitle';
    condition: 'contains' | 'equals';
    value: ExpressionNode;
    line: number;
}

// verify "#items" has count 5
export interface VerifyHasStatement {
    type: 'VerifyHas';
    target: TargetNode;
    hasCondition: HasCondition;
    line: number;
}

export type HasCondition =
    | HasCountCondition
    | HasValueCondition
    | HasAttributeCondition;

export interface HasCountCondition {
    type: 'HasCount';
    count: ExpressionNode;
}

export interface HasValueCondition {
    type: 'HasValue';
    value: ExpressionNode;
}

export interface HasAttributeCondition {
    type: 'HasAttribute';
    attribute: ExpressionNode;
    value: ExpressionNode;
}

// LOAD $users FROM "users" WHERE enabled = true
export interface LoadStatement {
    type: 'Load';
    variable: string;         // The variable name (without $)
    tableName: string;        // The data table name
    projectName?: string;     // Optional project name for cross-project references (ProjectName.TableName)
    whereClause?: WhereClause;
    line: number;
}

// FOR EACH $user IN $users { ... }
export interface ForEachStatement {
    type: 'ForEach';
    itemVariable: string;     // The iteration variable (without $)
    collectionVariable: string; // The collection to iterate (without $)
    statements: StatementNode[];
    line: number;
}

// ==================== VDQL (Data Query) Types ====================

// data admin = TestData.Users where role == "admin"
// list emails = TestData.Users.email
// number count = count TestData.Users
export interface DataQueryStatement {
    type: 'DataQuery';
    resultType: 'DATA' | 'LIST' | 'TEXT' | 'NUMBER' | 'FLAG';
    variableName: string;
    query: DataQuery;
    line: number;
}

export type DataQuery = TableQuery | AggregationQuery;

// Table queries: TestData.Users where role == "admin" order by name limit 10
export interface TableQuery {
    type: 'TableQuery';
    position?: 'first' | 'last' | 'random';      // first/last/random TestData.Users
    tableRef: TableReference;
    columns?: string[];           // For multi-column selection .(email, name)
    where?: DataCondition;
    orderBy?: OrderByClause[];
    limit?: number;
    offset?: number;
    defaultValue?: ExpressionNode;
}

// Table reference: TestData.Users, TestData.Users.email, TestData.Users[1].email, TestData.Users[5..10]
export interface TableReference {
    type: 'TableReference';
    tableName: string;            // "Users"
    column?: string;              // "email" (for column access)
    rowIndex?: ExpressionNode;    // For TestData.Users[1]
    rangeStart?: ExpressionNode;  // For TestData.Users[5..10]
    rangeEnd?: ExpressionNode;    // For TestData.Users[5..10]
    cellRow?: ExpressionNode;     // For cell [row, col]
    cellCol?: ExpressionNode;
}

// Aggregation queries: count, sum, average, min, max, distinct
export interface AggregationQuery {
    type: 'AggregationQuery';
    function: 'COUNT' | 'SUM' | 'AVERAGE' | 'MIN' | 'MAX' | 'DISTINCT' | 'ROWS' | 'COLUMNS' | 'HEADERS';
    tableRef: TableReference;
    column?: string;              // For sum/avg/min/max on specific column
    distinct?: boolean;           // count distinct
    where?: DataCondition;
}

// WHERE clause conditions (supports AND, OR, NOT, parentheses)
export type DataCondition =
    | AndCondition
    | OrCondition
    | NotCondition
    | DataComparison;

export interface AndCondition {
    type: 'And';
    left: DataCondition;
    right: DataCondition;
}

export interface OrCondition {
    type: 'Or';
    left: DataCondition;
    right: DataCondition;
}

export interface NotCondition {
    type: 'Not';
    condition: DataCondition;
}

// Individual comparisons: email == "admin@test.com", status != "deleted"
export interface DataComparison {
    type: 'Comparison';
    column: string;
    operator: ComparisonOperator | TextOperator | 'IN' | 'NOT_IN' | 'IS_EMPTY' | 'IS_NOT_EMPTY' | 'IS_NULL';
    value?: ExpressionNode;
    values?: ExpressionNode[];    // For IN/NOT IN clauses
}

export type ComparisonOperator = '==' | '!=' | '>' | '<' | '>=' | '<=';
export type TextOperator = 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'MATCHES';

// ORDER BY clause
export interface OrderByClause {
    column: string;
    direction: 'ASC' | 'DESC';
}

// ==================== Legacy WHERE clause (for LoadStatement) ====================

// WHERE clause for filtering data
export interface WhereClause {
    field: string;            // Column name
    operator: '=' | '!=' | '>' | '<' | '>=' | '<=';
    value: ExpressionNode;    // The value to compare against
}

// Target can be PageName.fieldName or just fieldName
export interface TargetNode {
    type: 'Target';
    page?: string;
    field?: string;
    selector?: SelectorNode;
    text?: string;  // For "Dashboard" IS VISIBLE
}

// Expression types
export type ExpressionNode =
    | StringLiteral
    | NumberLiteral
    | BooleanLiteral
    | VariableReference;

export interface StringLiteral {
    type: 'StringLiteral';
    value: string;
}

export interface NumberLiteral {
    type: 'NumberLiteral';
    value: number;
}

export interface BooleanLiteral {
    type: 'BooleanLiteral';
    value: boolean;
}

export interface VariableReference {
    type: 'VariableReference';
    page?: string;
    name: string;
}

export interface ParseError {
    message: string;
    line: number;
    column: number;
}
