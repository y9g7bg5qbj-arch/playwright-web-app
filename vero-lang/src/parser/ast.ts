// Program is the root node
export interface ProgramNode {
    type: 'Program';
    pages: PageNode[];
    features: FeatureNode[];
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

// FEATURE Login { ... }
export interface FeatureNode {
    type: 'Feature';
    name: string;
    uses: string[];           // USE statements
    hooks: HookNode[];        // BEFORE/AFTER hooks
    scenarios: ScenarioNode[];
    line: number;
}

// SCENARIO "test name" @tag { ... }
export interface ScenarioNode {
    type: 'Scenario';
    name: string;
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
    | DoStatement
    | WaitStatement
    | RefreshStatement
    | CheckStatement
    | HoverStatement
    | PressStatement
    | LogStatement
    | TakeScreenshotStatement;

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
