// ==================== PROGRAM STRUCTURE ====================

export interface ProgramNode {
    type: 'Program';
    pages: PageNode[];
    pageActions: PageActionsNode[];
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

export type SelectorType =
    | 'auto'       // legacy string-only
    | 'button' | 'textbox' | 'link' | 'checkbox' | 'heading' | 'combobox' | 'radio'  // role shorthands
    | 'role'       // generic role
    | 'label' | 'placeholder' | 'testid' | 'text' | 'alt' | 'title'  // other locators
    | 'css' | 'xpath';  // raw selectors

export type SelectorModifier =
    | { type: 'first' }
    | { type: 'last' }
    | { type: 'nth'; index: number }
    | { type: 'withText'; text: string }
    | { type: 'withoutText'; text: string }
    | { type: 'has'; selector: SelectorNode }
    | { type: 'hasNot'; selector: SelectorNode };

export interface SelectorNode {
    type: 'Selector';
    selectorType: SelectorType;
    value: string;
    nameParam?: string;  // For: ROLE "button" NAME "Submit"
    modifiers?: SelectorModifier[];
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

// ==================== PAGEACTIONS ====================

export interface PageActionsNode {
    type: 'PageActions';
    name: string;
    forPage: string;
    actions: ActionDefinitionNode[];
    line: number;
}

// ==================== FEATURES AND SCENARIOS ====================

export type FeatureAnnotation = 'serial' | 'skip' | 'only';
export type ScenarioAnnotation = 'skip' | 'only' | 'slow' | 'fixme';

export interface UseNode {
    name: string;
    line: number;
}

export interface FeatureNode {
    type: 'Feature';
    name: string;
    annotations: FeatureAnnotation[];
    uses: UseNode[];
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
    | VerifyScreenshotStatement
    | VerifyVariableStatement
    | PerformStatement
    | PerformAssignmentStatement
    | WaitStatement
    | WaitForStatement
    | RefreshStatement
    | CheckStatement
    | UncheckStatement
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
    | UtilityAssignmentStatement
    | ReturnStatement
    | SwitchToNewTabStatement
    | SwitchToTabStatement
    | OpenInNewTabStatement
    | CloseTabStatement
    | AcceptDialogStatement
    | DismissDialogStatement
    | SwitchToFrameStatement
    | SwitchToMainFrameStatement
    | DownloadStatement
    | SetCookieStatement
    | ClearCookiesStatement
    | SetStorageStatement
    | GetStorageStatement
    | ClearStorageStatement
    | ScrollStatement
    | WaitForNavigationStatement
    | WaitForNetworkIdleStatement
    | WaitForUrlStatement;

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

export interface UncheckStatement {
    type: 'Uncheck';
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

// WAIT FOR element - wait until element is visible
export interface WaitForStatement {
    type: 'WaitFor';
    target: TargetNode;
    line: number;
}

// RETURN VISIBLE OF field | RETURN TEXT OF field | RETURN expression
export interface ReturnStatement {
    type: 'Return';
    returnType: 'VISIBLE' | 'TEXT' | 'VALUE' | 'EXPRESSION';
    target?: TargetNode;      // For VISIBLE OF / TEXT OF / VALUE OF
    expression?: ExpressionNode;  // For direct expression return
    line: number;
}

export interface RefreshStatement {
    type: 'Refresh';
    line: number;
}

export interface SwitchToNewTabStatement {
    type: 'SwitchToNewTab';
    url?: ExpressionNode;
    line: number;
}

export interface SwitchToTabStatement {
    type: 'SwitchToTab';
    tabIndex: ExpressionNode;
    line: number;
}

export interface OpenInNewTabStatement {
    type: 'OpenInNewTab';
    url: ExpressionNode;
    line: number;
}

export interface CloseTabStatement {
    type: 'CloseTab';
    line: number;
}

// Dialog handling
export interface AcceptDialogStatement {
    type: 'AcceptDialog';
    responseText?: ExpressionNode;
    line: number;
}

export interface DismissDialogStatement {
    type: 'DismissDialog';
    line: number;
}

// Frame handling
export interface SwitchToFrameStatement {
    type: 'SwitchToFrame';
    selector: SelectorNode;
    line: number;
}

export interface SwitchToMainFrameStatement {
    type: 'SwitchToMainFrame';
    line: number;
}

// Download handling
export interface DownloadStatement {
    type: 'Download';
    target: TargetNode;
    saveAs?: ExpressionNode;
    line: number;
}

// Cookie management
export interface SetCookieStatement {
    type: 'SetCookie';
    name: ExpressionNode;
    value: ExpressionNode;
    line: number;
}

export interface ClearCookiesStatement {
    type: 'ClearCookies';
    line: number;
}

// Storage management
export interface SetStorageStatement {
    type: 'SetStorage';
    key: ExpressionNode;
    value: ExpressionNode;
    line: number;
}

export interface GetStorageStatement {
    type: 'GetStorage';
    key: ExpressionNode;
    variable: string;
    line: number;
}

export interface ClearStorageStatement {
    type: 'ClearStorage';
    line: number;
}

// Scroll
export interface ScrollStatement {
    type: 'Scroll';
    direction?: 'up' | 'down';
    target?: TargetNode;
    line: number;
}

// Wait for network/navigation
export interface WaitForNavigationStatement {
    type: 'WaitForNavigation';
    line: number;
}

export interface WaitForNetworkIdleStatement {
    type: 'WaitForNetworkIdle';
    line: number;
}

export interface WaitForUrlStatement {
    type: 'WaitForUrl';
    condition: 'contains' | 'equals';
    value: ExpressionNode;
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

// Assign result of PERFORM to a variable: FLAG isWelcome = PERFORM DashboardActions.isWelcomeVisible
export interface PerformAssignmentStatement {
    type: 'PerformAssignment';
    varType: 'TEXT' | 'NUMBER' | 'FLAG' | 'LIST';
    variableName: string;
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

export interface VerifyScreenshotStatement {
    type: 'VerifyScreenshot';
    target?: TargetNode;
    name?: string;
    options?: VerifyScreenshotOptions;
    line: number;
}

export interface VerifyScreenshotOptions {
    preset?: 'STRICT' | 'BALANCED' | 'RELAXED';
    threshold?: number;
    maxDiffPixels?: number;
    maxDiffPixelRatio?: number;
}

// VERIFY variable IS TRUE/FALSE or VERIFY variable CONTAINS "text"
export interface VerifyVariableStatement {
    type: 'VerifyVariable';
    variable: VariableReference;
    condition: VariableCondition;
    line: number;
}

export type VariableCondition =
    | { type: 'IsTrue' }
    | { type: 'IsFalse' }
    | { type: 'IsNotTrue' }
    | { type: 'IsNotFalse' }
    | { type: 'Contains'; value: ExpressionNode }
    | { type: 'NotContains'; value: ExpressionNode }
    | { type: 'Equals'; value: ExpressionNode }
    | { type: 'NotEquals'; value: ExpressionNode };

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
