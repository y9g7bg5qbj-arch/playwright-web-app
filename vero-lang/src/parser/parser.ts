import { Token, TokenType } from '../lexer/tokens.js';
import {
    ProgramNode, PageNode, FeatureNode, ScenarioNode, FieldNode,
    VariableNode, ActionDefinitionNode, HookNode, StatementNode,
    SelectorNode, TargetNode, ExpressionNode, VerifyCondition,
    ParseError
} from './ast.js';

export class Parser {
    private tokens: Token[];
    private pos = 0;
    private errors: ParseError[] = [];

    constructor(tokens: Token[]) {
        // Filter out comments
        this.tokens = tokens.filter(t => t.type !== TokenType.COMMENT);
    }

    parse(): { ast: ProgramNode; errors: ParseError[] } {
        const pages: PageNode[] = [];
        const features: FeatureNode[] = [];

        while (!this.isAtEnd()) {
            try {
                if (this.check(TokenType.PAGE)) {
                    pages.push(this.parsePage());
                } else if (this.check(TokenType.FEATURE)) {
                    features.push(this.parseFeature());
                } else {
                    this.error(`Unexpected token: ${this.peek().value}`);
                    this.advance();
                }
            } catch (e) {
                this.synchronize();
            }
        }

        return {
            ast: { type: 'Program', pages, features },
            errors: this.errors
        };
    }

    // ==================== PAGE PARSING ====================

    private parsePage(): PageNode {
        const line = this.peek().line;
        this.consume(TokenType.PAGE, "Expected 'PAGE'");
        const name = this.consume(TokenType.IDENTIFIER, "Expected page name").value;
        this.consume(TokenType.LBRACE, "Expected '{'");

        const fields: FieldNode[] = [];
        const variables: VariableNode[] = [];
        const actions: ActionDefinitionNode[] = [];

        while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
            if (this.check(TokenType.FIELD)) {
                fields.push(this.parseField());
            } else if (this.check(TokenType.TEXT) || this.check(TokenType.NUMBER) ||
                this.check(TokenType.FLAG) || this.check(TokenType.LIST)) {
                variables.push(this.parseVariable());
            } else if (this.check(TokenType.IDENTIFIER)) {
                actions.push(this.parseActionDefinition());
            } else {
                this.error(`Unexpected token in page: ${this.peek().value}`);
                this.advance();
            }
        }

        this.consume(TokenType.RBRACE, "Expected '}'");

        return { type: 'Page', name, fields, variables, actions, line };
    }

    private parseField(): FieldNode {
        const line = this.peek().line;
        this.consume(TokenType.FIELD, "Expected 'FIELD'");
        const name = this.consume(TokenType.IDENTIFIER, "Expected field name").value;
        this.consume(TokenType.EQUALS_SIGN, "Expected '='");
        const selector = this.parseSelector();

        return { type: 'Field', name, selector, line };
    }

    private parseSelector(): SelectorNode {
        // FIELD is now string-only: field email = "Email"
        if (this.check(TokenType.STRING)) {
            const value = this.advance().value;
            // Use 'auto' type - transpiler will decide based on string content
            return { type: 'Selector', selectorType: 'auto', value };
        }

        this.error("Expected string selector");
        return { type: 'Selector', selectorType: 'auto', value: '' };
    }

    private parseVariable(): VariableNode {
        const line = this.peek().line;
        const varType = this.advance().type as 'TEXT' | 'NUMBER' | 'FLAG' | 'LIST';
        const name = this.consume(TokenType.IDENTIFIER, "Expected variable name").value;
        this.consume(TokenType.EQUALS_SIGN, "Expected '='");
        const value = this.parseLiteralValue();

        return { type: 'Variable', varType, name, value, line };
    }

    private parseLiteralValue(): string | number | boolean | null {
        if (this.check(TokenType.STRING)) {
            return this.advance().value;
        }
        if (this.check(TokenType.NUMBER_LITERAL)) {
            return parseFloat(this.advance().value);
        }
        if (this.check(TokenType.TRUE)) {
            this.advance();
            return true;
        }
        if (this.check(TokenType.FALSE)) {
            this.advance();
            return false;
        }
        if (this.check(TokenType.NULL)) {
            this.advance();
            return null;
        }

        this.error("Expected literal value");
        return null;
    }

    private parseActionDefinition(): ActionDefinitionNode {
        const line = this.peek().line;
        const name = this.consume(TokenType.IDENTIFIER, "Expected action name").value;

        let parameters: string[] = [];
        let returnType: 'TEXT' | 'NUMBER' | 'FLAG' | 'LIST' | undefined;

        // Parameters: WITH param1, param2
        if (this.match(TokenType.WITH)) {
            parameters.push(this.consume(TokenType.IDENTIFIER, "Expected parameter").value);
            while (this.match(TokenType.COMMA)) {
                parameters.push(this.consume(TokenType.IDENTIFIER, "Expected parameter").value);
            }
        }

        // Return type: RETURNS TEXT
        if (this.match(TokenType.RETURNS)) {
            if (this.check(TokenType.TEXT) || this.check(TokenType.NUMBER) ||
                this.check(TokenType.FLAG) || this.check(TokenType.LIST)) {
                returnType = this.advance().type as 'TEXT' | 'NUMBER' | 'FLAG' | 'LIST';
            }
        }

        this.consume(TokenType.LBRACE, "Expected '{'");
        const statements = this.parseStatementBlock();
        this.consume(TokenType.RBRACE, "Expected '}'");

        return { type: 'ActionDefinition', name, parameters, returnType, statements, line };
    }

    // ==================== FEATURE PARSING ====================

    private parseFeature(): FeatureNode {
        const line = this.peek().line;
        this.consume(TokenType.FEATURE, "Expected 'FEATURE'");
        const name = this.consume(TokenType.IDENTIFIER, "Expected feature name").value;
        this.consume(TokenType.LBRACE, "Expected '{'");

        const uses: string[] = [];
        const hooks: HookNode[] = [];
        const scenarios: ScenarioNode[] = [];

        while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
            if (this.check(TokenType.USE)) {
                uses.push(this.parseUse());
            } else if (this.check(TokenType.BEFORE) || this.check(TokenType.AFTER)) {
                hooks.push(this.parseHook());
            } else if (this.check(TokenType.SCENARIO)) {
                scenarios.push(this.parseScenario());
            } else {
                this.error(`Unexpected token in feature: ${this.peek().value}`);
                this.advance();
            }
        }

        this.consume(TokenType.RBRACE, "Expected '}'");

        return { type: 'Feature', name, uses, hooks, scenarios, line };
    }

    private parseUse(): string {
        this.consume(TokenType.USE, "Expected 'USE'");
        return this.consume(TokenType.IDENTIFIER, "Expected page name").value;
    }

    private parseHook(): HookNode {
        const line = this.peek().line;
        let hookType: 'BEFORE_ALL' | 'BEFORE_EACH' | 'AFTER_ALL' | 'AFTER_EACH';

        if (this.match(TokenType.BEFORE)) {
            hookType = this.match(TokenType.ALL) ? 'BEFORE_ALL' : 'BEFORE_EACH';
            if (hookType === 'BEFORE_EACH') this.match(TokenType.EACH);
        } else {
            this.consume(TokenType.AFTER, "Expected 'BEFORE' or 'AFTER'");
            hookType = this.match(TokenType.ALL) ? 'AFTER_ALL' : 'AFTER_EACH';
            if (hookType === 'AFTER_EACH') this.match(TokenType.EACH);
        }

        this.consume(TokenType.LBRACE, "Expected '{'");
        const statements = this.parseStatementBlock();
        this.consume(TokenType.RBRACE, "Expected '}'");

        return { type: 'Hook', hookType, statements, line };
    }

    private parseScenario(): ScenarioNode {
        const line = this.peek().line;
        this.consume(TokenType.SCENARIO, "Expected 'SCENARIO'");
        const name = this.consume(TokenType.STRING, "Expected scenario name").value;

        // Parse tags: @smoke @regression
        const tags: string[] = [];
        while (this.match(TokenType.AT_SIGN)) {
            tags.push(this.consume(TokenType.IDENTIFIER, "Expected tag name").value);
        }

        this.consume(TokenType.LBRACE, "Expected '{'");
        const statements = this.parseStatementBlock();
        this.consume(TokenType.RBRACE, "Expected '}'");

        return { type: 'Scenario', name, tags, statements, line };
    }

    // ==================== STATEMENT PARSING ====================

    private parseStatementBlock(): StatementNode[] {
        const statements: StatementNode[] = [];

        while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
            const statement = this.parseStatement();
            if (statement) {
                statements.push(statement);
            }
        }

        return statements;
    }

    private parseStatement(): StatementNode | null {
        const line = this.peek().line;

        if (this.match(TokenType.CLICK)) {
            const target = this.parseTarget();
            return { type: 'Click', target, line };
        }

        if (this.match(TokenType.FILL)) {
            const target = this.parseTarget();
            this.consume(TokenType.WITH, "Expected 'WITH'");
            const value = this.parseExpression();
            return { type: 'Fill', target, value, line };
        }

        if (this.match(TokenType.OPEN)) {
            const url = this.parseExpression();
            return { type: 'Open', url, line };
        }

        if (this.match(TokenType.VERIFY)) {
            const target = this.parseTarget();
            const condition = this.parseVerifyCondition();
            return { type: 'Verify', target, condition, line };
        }

        if (this.match(TokenType.DO)) {
            const action = this.parseActionCall();
            return { type: 'Do', action, line };
        }

        if (this.match(TokenType.WAIT)) {
            if (this.check(TokenType.NUMBER_LITERAL)) {
                const duration = parseFloat(this.advance().value);
                let unit: 'seconds' | 'milliseconds' = 'seconds';
                if (this.match(TokenType.MILLISECONDS)) {
                    unit = 'milliseconds';
                } else {
                    this.match(TokenType.SECONDS);
                }
                return { type: 'Wait', duration, unit, line };
            }
            return { type: 'Wait', line };
        }

        if (this.match(TokenType.REFRESH)) {
            return { type: 'Refresh', line };
        }

        if (this.match(TokenType.CHECK)) {
            const target = this.parseTarget();
            return { type: 'Check', target, line };
        }

        if (this.match(TokenType.HOVER)) {
            const target = this.parseTarget();
            return { type: 'Hover', target, line };
        }

        if (this.match(TokenType.PRESS)) {
            const key = this.consume(TokenType.STRING, "Expected key name").value;
            return { type: 'Press', key, line };
        }

        if (this.match(TokenType.LOG)) {
            const message = this.parseExpression();
            return { type: 'Log', message, line };
        }

        if (this.match(TokenType.TAKE)) {
            this.consume(TokenType.SCREENSHOT, "Expected 'SCREENSHOT'");
            let filename: string | undefined;
            if (this.check(TokenType.STRING)) {
                filename = this.advance().value;
            }
            return { type: 'TakeScreenshot', filename, line };
        }

        this.error(`Unexpected statement: ${this.peek().value}`);
        this.advance();
        return null;
    }

    private parseVerifyCondition(): VerifyCondition {
        let negated = false;

        this.consume(TokenType.IS, "Expected 'IS'");
        if (this.match(TokenType.NOT)) {
            negated = true;
        }

        const stateKeywords: Record<string, string> = {
            [TokenType.VISIBLE]: 'VISIBLE',
            [TokenType.HIDDEN]: 'HIDDEN',
            [TokenType.ENABLED]: 'ENABLED',
            [TokenType.DISABLED]: 'DISABLED',
            [TokenType.CHECKED]: 'CHECKED',
            [TokenType.EMPTY]: 'EMPTY',
        };

        for (const [tokenType, value] of Object.entries(stateKeywords)) {
            if (this.match(tokenType as TokenType)) {
                return {
                    type: 'Condition',
                    operator: negated ? 'IS_NOT' : 'IS',
                    value: value as 'VISIBLE' | 'HIDDEN' | 'ENABLED' | 'DISABLED' | 'CHECKED' | 'EMPTY'
                };
            }
        }

        this.error("Expected condition");
        return { type: 'Condition', operator: 'IS', value: 'VISIBLE' };
    }

    private parseActionCall(): { type: 'ActionCall'; page?: string; action: string; arguments: ExpressionNode[] } {
        let page: string | undefined;
        let action: string;

        const first = this.consume(TokenType.IDENTIFIER, "Expected action name").value;

        if (this.match(TokenType.DOT)) {
            page = first;
            action = this.consume(TokenType.IDENTIFIER, "Expected action name").value;
        } else {
            action = first;
        }

        const args: ExpressionNode[] = [];
        if (this.match(TokenType.WITH)) {
            args.push(this.parseExpression());
            while (this.match(TokenType.COMMA) || this.match(TokenType.AND)) {
                args.push(this.parseExpression());
            }
        }

        return { type: 'ActionCall', page, action, arguments: args };
    }

    private parseTarget(): TargetNode {
        // String literal as text: "Dashboard" IS VISIBLE
        if (this.check(TokenType.STRING)) {
            const text = this.advance().value;
            return { type: 'Target', text };
        }

        // PageName.fieldName or just fieldName
        if (this.check(TokenType.IDENTIFIER)) {
            const first = this.advance().value;
            if (this.match(TokenType.DOT)) {
                const field = this.consume(TokenType.IDENTIFIER, "Expected field name").value;
                return { type: 'Target', page: first, field };
            }
            return { type: 'Target', field: first };
        }

        // Direct selector
        const selector = this.parseSelector();
        return { type: 'Target', selector };
    }

    private parseExpression(): ExpressionNode {
        if (this.check(TokenType.STRING)) {
            return { type: 'StringLiteral', value: this.advance().value };
        }
        if (this.check(TokenType.NUMBER_LITERAL)) {
            return { type: 'NumberLiteral', value: parseFloat(this.advance().value) };
        }
        if (this.match(TokenType.TRUE)) {
            return { type: 'BooleanLiteral', value: true };
        }
        if (this.match(TokenType.FALSE)) {
            return { type: 'BooleanLiteral', value: false };
        }

        // Variable reference
        if (this.check(TokenType.IDENTIFIER)) {
            const first = this.advance().value;
            if (this.match(TokenType.DOT)) {
                const name = this.consume(TokenType.IDENTIFIER, "Expected variable name").value;
                return { type: 'VariableReference', page: first, name };
            }
            return { type: 'VariableReference', name: first };
        }

        this.error("Expected expression");
        return { type: 'StringLiteral', value: '' };
    }

    // ==================== HELPER METHODS ====================

    private isAtEnd(): boolean {
        return this.peek().type === TokenType.EOF;
    }

    private peek(): Token {
        return this.tokens[this.pos];
    }

    private previous(): Token {
        return this.tokens[this.pos - 1];
    }

    private advance(): Token {
        if (!this.isAtEnd()) this.pos++;
        return this.previous();
    }

    private check(type: TokenType): boolean {
        if (this.isAtEnd()) return false;
        return this.peek().type === type;
    }

    private match(...types: TokenType[]): boolean {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    private consume(type: TokenType, message: string): Token {
        if (this.check(type)) return this.advance();

        this.error(message);
        return { type, value: '', line: this.peek().line, column: this.peek().column };
    }

    private error(message: string): void {
        const token = this.peek();
        this.errors.push({
            message: `${message} at '${token.value}'`,
            line: token.line,
            column: token.column
        });
    }

    private synchronize(): void {
        this.advance();
        while (!this.isAtEnd()) {
            if (this.check(TokenType.PAGE) || this.check(TokenType.FEATURE) ||
                this.check(TokenType.SCENARIO) || this.check(TokenType.RBRACE)) {
                return;
            }
            this.advance();
        }
    }
}

export function parse(tokens: Token[]): { ast: ProgramNode; errors: ParseError[] } {
    const parser = new Parser(tokens);
    return parser.parse();
}
