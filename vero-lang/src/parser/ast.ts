// ==================== PROGRAM STRUCTURE ====================

export interface ProgramNode {
    type: 'Program';
    pages: PageNode[];
    features: FeatureNode[];
    fixtures: FixtureNode[];
}

export interface PageNode {
    type: 'Page';
    name: string;
    fields: FieldNode[];
    variables: VariableNode[];
    actions: ActionDefinitionNode[];
    line: number;
}

export interface FieldNode {
    type: 'Field';
    name: string;
    selector: SelectorNode;
    line: number;
}

export interface SelectorNode {
    type: 'Selector';
    selectorType: 'auto';
    value: string;
}

export interface VariableNode {
    type: 'Variable';
    varType: 'TEXT' | 'NUMBER' | 'FLAG' | 'LIST';
    name: string;
    value: string | number | boolean | null;
    line: number;
}

export interface ActionDefinitionNode {
    type: 'ActionDefinition';
    name: string;
    parameters: string[];
    returnType?: 'TEXT' | 'NUMBER' | 'FLAG' | 'LIST';
    statements: StatementNode[];
    line: number;
}

// ==================== FEATURES AND SCENARIOS ====================

export type FeatureAnnotation = 'serial' | 'skip' | 'only';
export type ScenarioAnnotation = 'skip' | 'only' | 'slow' | 'fixme';

export interface FeatureNode {
    type: 'Feature';
    name: string;
    annotations: FeatureAnnotation[];
    uses: string[];
    fixtures: FixtureUseNode[];
    hooks: HookNode[];
    scenarios: ScenarioNode[];
    line: number;
}

export interface ScenarioNode {
    type: 'Scenario';
    name: string;
    annotations: ScenarioAnnotation[];
    tags: string[];
    statements: StatementNode[];
    line: number;
}

export interface HookNode {
    type: 'Hook';
    hookType: 'BEFORE_ALL' | 'BEFORE_EACH' | 'AFTER_ALL' | 'AFTER_EACH';
    statements: StatementNode[];
    line: number;
}

// ==================== FIXTURES ====================

export interface FixtureNode {
    type: 'Fixture';
    name: string;
    parameters: string[];
    scope: 'test' | 'worker';
    dependencies: string[];
    auto: boolean;
    options: FixtureOptionNode[];
    setup: StatementNode[];
    teardown: StatementNode[];
    line: number;
}

export interface FixtureOptionNode {
    type: 'FixtureOption';
    name: string;
    defaultValue: ExpressionNode;
    line: number;
}

export interface FixtureUseNode {
    type: 'FixtureUse';
    fixtureName: string;
    options: FixtureOptionValue[];
    line: number;
}

export interface FixtureOptionValue {
    name: string;
    value: ExpressionNode;
}

// ==================== STATEMENTS ====================

export type StatementNode =
    | ClickStatement
    | RightClickStatement
    | DoubleClickStatement
    | ForceClickStatement
    | DragStatement
    | FillStatement
    | OpenStatement
    | VerifyStatement
    | VerifyUrlStatement
    | VerifyTitleStatement
    | VerifyHasStatement
    | PerformStatement
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
    | DataQueryStatement
    | RowStatement
    | RowsStatement
    | ColumnAccessStatement
    | CountStatement
    | UtilityAssignmentStatement;

// Action Statements

export interface ClickStatement {
    type: 'Click';
    target: TargetNode;
    line: number;
}

export interface RightClickStatement {
    type: 'RightClick';
    target: TargetNode;
    line: number;
}

export interface DoubleClickStatement {
    type: 'DoubleClick';
    target: TargetNode;
    line: number;
}

export interface ForceClickStatement {
    type: 'ForceClick';
    target: TargetNode;
    line: number;
}

export interface CoordinateTarget {
    type: 'Coordinate';
    x: number;
    y: number;
}

export interface DragStatement {
    type: 'Drag';
    source: TargetNode;
    destination: TargetNode | CoordinateTarget;
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

export interface LogStatement {
    type: 'Log';
    message: ExpressionNode;
    line: number;
}

export interface TakeScreenshotStatement {
    type: 'TakeScreenshot';
    target?: TargetNode;
    filename?: string;
    line: number;
}

export interface UploadStatement {
    type: 'Upload';
    files: ExpressionNode[];
    target: TargetNode;
    line: number;
}

export interface PerformStatement {
    type: 'Perform';
    action: ActionCallNode;
    line: number;
}

export interface ActionCallNode {
    type: 'ActionCall';
    page?: string;
    action: string;
    arguments: ExpressionNode[];
}

// ==================== ASSERTIONS ====================

export interface VerifyStatement {
    type: 'Verify';
    target: TargetNode | ExpressionNode;
    condition: VerifyCondition;
    line: number;
}

export interface VerifyCondition {
    type: 'Condition';
    operator: 'IS' | 'IS_NOT' | 'CONTAINS' | 'NOT_CONTAINS';
    value?: 'VISIBLE' | 'HIDDEN' | 'ENABLED' | 'DISABLED' | 'CHECKED' | 'FOCUSED' | 'EMPTY' | ExpressionNode;
}

export interface VerifyUrlStatement {
    type: 'VerifyUrl';
    condition: 'contains' | 'equals' | 'matches';
    value: ExpressionNode;
    line: number;
}

export interface VerifyTitleStatement {
    type: 'VerifyTitle';
    condition: 'contains' | 'equals';
    value: ExpressionNode;
    line: number;
}

export interface VerifyHasStatement {
    type: 'VerifyHas';
    target: TargetNode;
    hasCondition: HasCondition;
    line: number;
}

export type HasCondition =
    | HasCountCondition
    | HasValueCondition
    | HasAttributeCondition
    | HasTextCondition
    | ContainsTextCondition
    | HasClassCondition;

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

export interface HasTextCondition {
    type: 'HasText';
    text: ExpressionNode;
}

export interface ContainsTextCondition {
    type: 'ContainsText';
    text: ExpressionNode;
}

export interface HasClassCondition {
    type: 'HasClass';
    className: ExpressionNode;
}

// ==================== DATA QUERIES ====================

export interface LoadStatement {
    type: 'Load';
    variable: string;
    tableName: string;
    projectName?: string;
    whereClause?: WhereClause;
    line: number;
}

export interface ForEachStatement {
    type: 'ForEach';
    itemVariable: string;
    collectionVariable: string;
    statements: StatementNode[];
    line: number;
}

export interface RowStatement {
    type: 'Row';
    variableName: string;
    modifier?: 'FIRST' | 'LAST' | 'RANDOM';
    tableRef: SimpleTableReference;
    where?: DataCondition;
    orderBy?: OrderByClause[];
    line: number;
}

export interface RowsStatement {
    type: 'Rows';
    variableName: string;
    tableRef: SimpleTableReference;
    where?: DataCondition;
    orderBy?: OrderByClause[];
    limit?: number;
    offset?: number;
    line: number;
}

export interface ColumnAccessStatement {
    type: 'ColumnAccess';
    variableName: string;
    distinct?: boolean;
    tableRef: SimpleTableReference;
    column: string;
    where?: DataCondition;
    line: number;
}

export interface CountStatement {
    type: 'Count';
    variableName: string;
    tableRef: SimpleTableReference;
    where?: DataCondition;
    line: number;
}

export interface SimpleTableReference {
    type: 'SimpleTableReference';
    tableName: string;
    projectName?: string;
}

// Legacy VDQL types

export interface DataQueryStatement {
    type: 'DataQuery';
    resultType: 'DATA' | 'LIST' | 'TEXT' | 'NUMBER' | 'FLAG';
    variableName: string;
    query: DataQuery;
    line: number;
}

export type DataQuery = TableQuery | AggregationQuery;

export interface TableQuery {
    type: 'TableQuery';
    position?: 'first' | 'last' | 'random';
    tableRef: TableReference;
    columns?: string[];
    where?: DataCondition;
    orderBy?: OrderByClause[];
    limit?: number;
    offset?: number;
    defaultValue?: ExpressionNode;
}

export interface TableReference {
    type: 'TableReference';
    tableName: string;
    column?: string;
    rowIndex?: ExpressionNode;
    rangeStart?: ExpressionNode;
    rangeEnd?: ExpressionNode;
    cellRow?: ExpressionNode;
    cellCol?: ExpressionNode;
}

export interface AggregationQuery {
    type: 'AggregationQuery';
    function: 'COUNT' | 'SUM' | 'AVERAGE' | 'MIN' | 'MAX' | 'DISTINCT' | 'ROWS' | 'COLUMNS' | 'HEADERS';
    tableRef: TableReference;
    column?: string;
    distinct?: boolean;
    where?: DataCondition;
}

// Data Conditions

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

export interface DataComparison {
    type: 'Comparison';
    column: string;
    operator: ComparisonOperator | TextOperator | 'IN' | 'NOT_IN' | 'IS_EMPTY' | 'IS_NOT_EMPTY' | 'IS_NULL';
    value?: ExpressionNode;
    values?: ExpressionNode[];
}

export type ComparisonOperator = '==' | '!=' | '>' | '<' | '>=' | '<=';
export type TextOperator = 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'MATCHES';

export interface OrderByClause {
    column: string;
    direction: 'ASC' | 'DESC';
}

export interface WhereClause {
    field: string;
    operator: '=' | '!=' | '>' | '<' | '>=' | '<=';
    value: ExpressionNode;
}

// ==================== TARGETS AND EXPRESSIONS ====================

export interface TargetNode {
    type: 'Target';
    page?: string;
    field?: string;
    selector?: SelectorNode;
    text?: string;
}

export type ExpressionNode =
    | StringLiteral
    | NumberLiteral
    | BooleanLiteral
    | VariableReference
    | EnvVarReference;

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

export interface EnvVarReference {
    type: 'EnvVarReference';
    name: string;
}

// ==================== UTILITY FUNCTIONS ====================

export interface UtilityAssignmentStatement {
    type: 'UtilityAssignment';
    varType: 'TEXT' | 'NUMBER' | 'FLAG' | 'LIST';
    variableName: string;
    expression: UtilityExpressionNode;
    line: number;
}

export type UtilityExpressionNode =
    | TrimExpression
    | ConvertExpression
    | ExtractExpression
    | ReplaceExpression
    | SplitExpression
    | JoinExpression
    | LengthExpression
    | PadExpression
    | TodayExpression
    | NowExpression
    | AddDateExpression
    | SubtractDateExpression
    | FormatExpression
    | DatePartExpression
    | RoundExpression
    | AbsoluteExpression
    | GenerateExpression
    | RandomNumberExpression
    | ChainedExpression
    | ExpressionNode;

// String Utilities

export interface TrimExpression {
    type: 'Trim';
    value: ExpressionNode;
}

export interface ConvertExpression {
    type: 'Convert';
    value: ExpressionNode;
    targetType: 'UPPERCASE' | 'LOWERCASE' | 'NUMBER' | 'TEXT';
}

export interface ExtractExpression {
    type: 'Extract';
    value: ExpressionNode;
    start: ExpressionNode;
    end: ExpressionNode;
}

export interface ReplaceExpression {
    type: 'Replace';
    value: ExpressionNode;
    search: string;
    replacement: string;
}

export interface SplitExpression {
    type: 'Split';
    value: ExpressionNode;
    delimiter: string;
}

export interface JoinExpression {
    type: 'Join';
    value: ExpressionNode;
    delimiter: string;
}

export interface LengthExpression {
    type: 'Length';
    value: ExpressionNode;
}

export interface PadExpression {
    type: 'Pad';
    value: ExpressionNode;
    length: ExpressionNode;
    padChar: string;
}

// Date Utilities

export interface TodayExpression {
    type: 'Today';
}

export interface NowExpression {
    type: 'Now';
}

export interface AddDateExpression {
    type: 'AddDate';
    amount: ExpressionNode;
    unit: DateUnit;
    date: ExpressionNode | TodayExpression | NowExpression;
}

export interface SubtractDateExpression {
    type: 'SubtractDate';
    amount: ExpressionNode;
    unit: DateUnit;
    date: ExpressionNode | TodayExpression | NowExpression;
}

export type DateUnit = 'DAY' | 'DAYS' | 'MONTH' | 'MONTHS' | 'YEAR' | 'YEARS';

export interface FormatExpression {
    type: 'Format';
    value: ExpressionNode;
    formatType: 'pattern' | 'currency' | 'percent';
    pattern?: string;
    currency?: string;
}

export interface DatePartExpression {
    type: 'DatePart';
    part: 'YEAR' | 'MONTH' | 'DAY';
    date: ExpressionNode;
}

// Number Utilities

export interface RoundExpression {
    type: 'Round';
    value: ExpressionNode;
    decimals?: ExpressionNode;
    direction?: 'UP' | 'DOWN';
}

export interface AbsoluteExpression {
    type: 'Absolute';
    value: ExpressionNode;
}

// Generate Utilities

export interface GenerateExpression {
    type: 'Generate';
    pattern: string | 'UUID';
}

export interface RandomNumberExpression {
    type: 'RandomNumber';
    min: ExpressionNode;
    max: ExpressionNode;
}

// Chained Expression

export interface ChainedExpression {
    type: 'Chained';
    first: UtilityExpressionNode;
    second: UtilityExpressionNode;
}

// ==================== ERRORS ====================

export interface ParseError {
    message: string;
    line: number;
    column: number;
}
