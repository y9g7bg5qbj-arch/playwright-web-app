import { Token, TokenType } from '../lexer/tokens.js';
import {
    ProgramNode, PageNode, FeatureNode, ScenarioNode, FieldNode,
    VariableNode, ActionDefinitionNode, HookNode, StatementNode,
    SelectorNode, TargetNode, ExpressionNode, VerifyCondition,
    ParseError, LoadStatement, ForEachStatement, WhereClause,
    FixtureNode, FixtureUseNode, FixtureOptionNode, FixtureOptionValue,
    FeatureAnnotation, ScenarioAnnotation,
    VerifyUrlStatement, VerifyTitleStatement, VerifyHasStatement, UploadStatement,
    HasCondition, HasCountCondition, HasValueCondition, HasAttributeCondition
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
        const fixtures: FixtureNode[] = [];

        while (!this.isAtEnd()) {
            try {
                if (this.check(TokenType.PAGE)) {
                    pages.push(this.parsePage());
                } else if (this.check(TokenType.FEATURE) || this.isFeatureAnnotation()) {
                    features.push(this.parseFeature());
                } else if (this.check(TokenType.FIXTURE)) {
                    fixtures.push(this.parseFixture());
                } else {
                    this.error(`Unexpected token: ${this.peek().value}`);
                    this.advance();
                }
            } catch (e) {
                this.synchronize();
            }
        }

        return {
            ast: { type: 'Program', pages, features, fixtures },
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

    // Check if current position is at a feature annotation
    private isFeatureAnnotation(): boolean {
        if (!this.check(TokenType.AT_SIGN)) return false;
        const nextToken = this.tokens[this.pos + 1];
        if (!nextToken) return false;
        return nextToken.type === TokenType.SERIAL ||
               nextToken.type === TokenType.SKIP ||
               nextToken.type === TokenType.ONLY;
    }

    // Check if current position is at a scenario annotation
    private isScenarioAnnotation(): boolean {
        if (!this.check(TokenType.AT_SIGN)) return false;
        const nextToken = this.tokens[this.pos + 1];
        if (!nextToken) return false;
        return nextToken.type === TokenType.SKIP ||
               nextToken.type === TokenType.ONLY ||
               nextToken.type === TokenType.SLOW ||
               nextToken.type === TokenType.FIXME;
    }

    private parseFeature(): FeatureNode {
        const line = this.peek().line;

        // Parse feature annotations: @serial @skip @only
        const annotations: FeatureAnnotation[] = [];
        while (this.isFeatureAnnotation()) {
            this.consume(TokenType.AT_SIGN, "Expected '@'");
            if (this.match(TokenType.SERIAL)) {
                annotations.push('serial');
            } else if (this.match(TokenType.SKIP)) {
                annotations.push('skip');
            } else if (this.match(TokenType.ONLY)) {
                annotations.push('only');
            }
        }

        this.consume(TokenType.FEATURE, "Expected 'FEATURE'");
        const name = this.consume(TokenType.IDENTIFIER, "Expected feature name").value;
        this.consume(TokenType.LBRACE, "Expected '{'");

        const uses: string[] = [];
        const fixtures: FixtureUseNode[] = [];
        const hooks: HookNode[] = [];
        const scenarios: ScenarioNode[] = [];

        while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
            if (this.check(TokenType.USE)) {
                uses.push(this.parseUse());
            } else if (this.check(TokenType.WITH)) {
                fixtures.push(this.parseWithFixture());
            } else if (this.check(TokenType.BEFORE) || this.check(TokenType.AFTER)) {
                hooks.push(this.parseHook());
            } else if (this.check(TokenType.SCENARIO) || this.isScenarioAnnotation()) {
                scenarios.push(this.parseScenario());
            } else {
                this.error(`Unexpected token in feature: ${this.peek().value}`);
                this.advance();
            }
        }

        this.consume(TokenType.RBRACE, "Expected '}'");

        return { type: 'Feature', name, annotations, uses, fixtures, hooks, scenarios, line };
    }

    private parseUse(): string {
        this.consume(TokenType.USE, "Expected 'USE'");
        return this.consume(TokenType.IDENTIFIER, "Expected page name").value;
    }

    // WITH FIXTURE authenticatedUser { role = "admin" }
    private parseWithFixture(): FixtureUseNode {
        const line = this.peek().line;
        this.consume(TokenType.WITH, "Expected 'WITH'");
        this.consume(TokenType.FIXTURE, "Expected 'FIXTURE'");
        const fixtureName = this.consume(TokenType.IDENTIFIER, "Expected fixture name").value;

        // Optional: { role = "admin", count = 5 }
        const options: FixtureOptionValue[] = [];
        if (this.match(TokenType.LBRACE)) {
            // Parse first option
            if (!this.check(TokenType.RBRACE)) {
                options.push(this.parseFixtureOptionValue());
                // Parse additional options
                while (this.match(TokenType.COMMA)) {
                    options.push(this.parseFixtureOptionValue());
                }
            }
            this.consume(TokenType.RBRACE, "Expected '}'");
        }

        return { type: 'FixtureUse', fixtureName, options, line };
    }

    private parseFixtureOptionValue(): FixtureOptionValue {
        const name = this.consume(TokenType.IDENTIFIER, "Expected option name").value;
        this.consume(TokenType.EQUALS_SIGN, "Expected '='");
        const value = this.parseExpression();
        return { name, value };
    }

    // ==================== FIXTURE PARSING ====================

    // FIXTURE authenticatedUser WITH role { SCOPE test ... }
    private parseFixture(): FixtureNode {
        const line = this.peek().line;
        this.consume(TokenType.FIXTURE, "Expected 'FIXTURE'");
        const name = this.consume(TokenType.IDENTIFIER, "Expected fixture name").value;

        // Optional parameters: WITH param1, param2
        const parameters: string[] = [];
        if (this.match(TokenType.WITH)) {
            parameters.push(this.consume(TokenType.IDENTIFIER, "Expected parameter").value);
            while (this.match(TokenType.COMMA)) {
                parameters.push(this.consume(TokenType.IDENTIFIER, "Expected parameter").value);
            }
        }

        this.consume(TokenType.LBRACE, "Expected '{'");

        // Parse fixture body: SCOPE, DEPENDS, AUTO, OPTION, SETUP, TEARDOWN
        let scope: 'test' | 'worker' = 'test';
        const dependencies: string[] = [];
        let auto = false;
        const options: FixtureOptionNode[] = [];
        let setup: StatementNode[] = [];
        let teardown: StatementNode[] = [];

        while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
            if (this.match(TokenType.SCOPE)) {
                if (this.match(TokenType.TEST)) {
                    scope = 'test';
                } else if (this.match(TokenType.WORKER)) {
                    scope = 'worker';
                } else {
                    this.error("Expected 'TEST' or 'WORKER' after 'SCOPE'");
                }
            } else if (this.match(TokenType.DEPENDS)) {
                this.consume(TokenType.ON, "Expected 'ON' after 'DEPENDS'");
                dependencies.push(this.consumeIdentifierOrKeyword("Expected dependency name"));
                while (this.match(TokenType.COMMA)) {
                    dependencies.push(this.consumeIdentifierOrKeyword("Expected dependency name"));
                }
            } else if (this.match(TokenType.AUTO)) {
                auto = true;
            } else if (this.match(TokenType.OPTION)) {
                const optionLine = this.previous().line;
                const optionName = this.consume(TokenType.IDENTIFIER, "Expected option name").value;
                this.consume(TokenType.DEFAULT, "Expected 'DEFAULT'");
                const defaultValue = this.parseExpression();
                options.push({ type: 'FixtureOption', name: optionName, defaultValue, line: optionLine });
            } else if (this.match(TokenType.SETUP)) {
                this.consume(TokenType.LBRACE, "Expected '{'");
                setup = this.parseStatementBlock();
                this.consume(TokenType.RBRACE, "Expected '}'");
            } else if (this.match(TokenType.TEARDOWN)) {
                this.consume(TokenType.LBRACE, "Expected '{'");
                teardown = this.parseStatementBlock();
                this.consume(TokenType.RBRACE, "Expected '}'");
            } else {
                this.error(`Unexpected token in fixture: ${this.peek().value}`);
                this.advance();
            }
        }

        this.consume(TokenType.RBRACE, "Expected '}'");

        return {
            type: 'Fixture',
            name,
            parameters,
            scope,
            dependencies,
            auto,
            options,
            setup,
            teardown,
            line
        };
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

        // Parse scenario annotations: @skip @only @slow @fixme
        const annotations: ScenarioAnnotation[] = [];
        while (this.isScenarioAnnotation()) {
            this.consume(TokenType.AT_SIGN, "Expected '@'");
            if (this.match(TokenType.SKIP)) {
                annotations.push('skip');
            } else if (this.match(TokenType.ONLY)) {
                annotations.push('only');
            } else if (this.match(TokenType.SLOW)) {
                annotations.push('slow');
            } else if (this.match(TokenType.FIXME)) {
                annotations.push('fixme');
            }
        }

        this.consume(TokenType.SCENARIO, "Expected 'SCENARIO'");
        const name = this.consume(TokenType.STRING, "Expected scenario name").value;

        // Parse tags: @smoke @regression (user-defined tags)
        const tags: string[] = [];
        while (this.check(TokenType.AT_SIGN) && !this.isScenarioAnnotation()) {
            this.consume(TokenType.AT_SIGN, "Expected '@'");
            tags.push(this.consume(TokenType.IDENTIFIER, "Expected tag name").value);
        }

        this.consume(TokenType.LBRACE, "Expected '{'");
        const statements = this.parseStatementBlock();
        this.consume(TokenType.RBRACE, "Expected '}'");

        return { type: 'Scenario', name, annotations, tags, statements, line };
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
            // Check for URL assertion: verify url contains/equals/matches "value"
            if (this.match(TokenType.URL)) {
                const condition = this.parseUrlCondition();
                const value = this.parseExpression();
                return { type: 'VerifyUrl', condition, value, line };
            }

            // Check for TITLE assertion: verify title contains/equals "value"
            if (this.match(TokenType.TITLE)) {
                const condition = this.parseTitleCondition();
                const value = this.parseExpression();
                return { type: 'VerifyTitle', condition, value, line };
            }

            // Parse target for element assertions
            const target = this.parseTarget();

            // Check for HAS assertion: verify selector has count/value/attribute
            if (this.match(TokenType.HAS)) {
                const hasCondition = this.parseHasCondition();
                return { type: 'VerifyHas', target, hasCondition, line };
            }

            // Standard element assertion: verify element is visible/etc.
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

        // upload "file.pdf" to "#fileInput" | upload "file1.jpg", "file2.jpg" to "#multiUpload"
        if (this.match(TokenType.UPLOAD)) {
            const files: ExpressionNode[] = [];
            files.push(this.parseExpression());
            while (this.match(TokenType.COMMA)) {
                files.push(this.parseExpression());
            }
            this.consume(TokenType.TO, "Expected 'TO'");
            const target = this.parseTarget();
            return { type: 'Upload', files, target, line };
        }

        // LOAD $variable FROM "tableName" WHERE field = value
        if (this.match(TokenType.LOAD)) {
            return this.parseLoadStatement(line);
        }

        // FOR EACH $item IN $collection { ... }
        if (this.match(TokenType.FOR)) {
            return this.parseForEachStatement(line);
        }

        this.error(`Unexpected statement: ${this.peek().value}`);
        this.advance();
        return null;
    }

    private parseLoadStatement(line: number): LoadStatement {
        // Expect: $variable
        let variable: string;
        if (this.check(TokenType.IDENTIFIER)) {
            variable = this.advance().value;
        } else {
            this.error("Expected variable name after LOAD");
            variable = 'data';
        }

        // Expect: FROM
        this.consume(TokenType.FROM, "Expected 'FROM'");

        // Expect: "tableName" or "ProjectName.TableName"
        const tableRef = this.consume(TokenType.STRING, "Expected table name").value;

        // Parse qualified reference (Project.Table) vs simple reference (Table)
        let tableName: string;
        let projectName: string | undefined;

        if (tableRef.includes('.')) {
            const parts = tableRef.split('.');
            if (parts.length === 2) {
                projectName = parts[0];
                tableName = parts[1];
            } else {
                this.error(`Invalid table reference: ${tableRef}. Use "TableName" or "ProjectName.TableName"`);
                tableName = tableRef;
            }
        } else {
            tableName = tableRef;
        }

        // Optional: WHERE clause
        let whereClause: WhereClause | undefined;
        if (this.match(TokenType.WHERE)) {
            whereClause = this.parseWhereClause();
        }

        return {
            type: 'Load',
            variable,
            tableName,
            projectName,
            whereClause,
            line
        };
    }

    private parseWhereClause(): WhereClause {
        // Expect: field
        const field = this.consume(TokenType.IDENTIFIER, "Expected field name").value;

        // Expect: operator - for now we only support = with EQUALS_SIGN token
        // In the future, add !=, >, <, >=, <= tokens to the lexer
        let operator: WhereClause['operator'] = '=';
        if (this.check(TokenType.EQUALS_SIGN)) {
            this.advance();
            operator = '=';
        } else if (this.check(TokenType.IS)) {
            // Support "WHERE enabled IS true" syntax
            this.advance();
            operator = '=';
        } else {
            this.error("Expected '=' or 'IS' after field name");
        }

        // Expect: value
        const value = this.parseExpression();

        return { field, operator, value };
    }

    private parseForEachStatement(line: number): ForEachStatement {
        // Expect: EACH
        this.consume(TokenType.EACH, "Expected 'EACH' after 'FOR'");

        // Expect: $itemVariable
        let itemVariable: string;
        if (this.check(TokenType.IDENTIFIER)) {
            itemVariable = this.advance().value;
        } else {
            this.error("Expected variable name after 'FOR EACH'");
            itemVariable = 'item';
        }

        // Expect: IN
        this.consume(TokenType.IN, "Expected 'IN'");

        // Expect: $collectionVariable
        let collectionVariable: string;
        if (this.check(TokenType.IDENTIFIER)) {
            collectionVariable = this.advance().value;
        } else {
            this.error("Expected collection variable after 'IN'");
            collectionVariable = 'data';
        }

        // Expect: { ... }
        this.consume(TokenType.LBRACE, "Expected '{'");
        const statements = this.parseStatementBlock();
        this.consume(TokenType.RBRACE, "Expected '}'");

        return {
            type: 'ForEach',
            itemVariable,
            collectionVariable,
            statements,
            line
        };
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

    // Parse URL condition: contains | equals | matches
    private parseUrlCondition(): 'contains' | 'equals' | 'matches' {
        if (this.match(TokenType.CONTAINS)) {
            return 'contains';
        }
        if (this.match(TokenType.EQUAL)) {
            return 'equals';
        }
        if (this.match(TokenType.MATCHES)) {
            return 'matches';
        }
        this.error("Expected 'CONTAINS', 'EQUALS', or 'MATCHES'");
        return 'contains';
    }

    // Parse TITLE condition: contains | equals
    private parseTitleCondition(): 'contains' | 'equals' {
        if (this.match(TokenType.CONTAINS)) {
            return 'contains';
        }
        if (this.match(TokenType.EQUAL)) {
            return 'equals';
        }
        this.error("Expected 'CONTAINS' or 'EQUALS'");
        return 'contains';
    }

    // Parse HAS condition: count N | value "text" | attribute "name" equal "value"
    private parseHasCondition(): HasCondition {
        if (this.match(TokenType.COUNT)) {
            const count = this.parseExpression();
            return { type: 'HasCount', count };
        }
        if (this.match(TokenType.VALUE)) {
            const value = this.parseExpression();
            return { type: 'HasValue', value };
        }
        if (this.match(TokenType.ATTRIBUTE)) {
            const attribute = this.parseExpression();
            this.consume(TokenType.EQUAL, "Expected 'EQUAL'");
            const value = this.parseExpression();
            return { type: 'HasAttribute', attribute, value };
        }
        this.error("Expected 'COUNT', 'VALUE', or 'ATTRIBUTE'");
        return { type: 'HasCount', count: { type: 'NumberLiteral', value: 0 } };
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

    /**
     * Consume an identifier or keyword token (for contexts where keywords can be used as names)
     * This is needed for things like DEPENDS ON page, context where page/context are keywords
     */
    private consumeIdentifierOrKeyword(message: string): string {
        const token = this.peek();
        // Accept IDENTIFIER or common keywords that might be used as dependency/parameter names
        if (this.check(TokenType.IDENTIFIER) ||
            this.check(TokenType.PAGE) ||
            this.check(TokenType.FEATURE) ||
            this.check(TokenType.TEXT) ||
            this.check(TokenType.NUMBER) ||
            this.check(TokenType.FLAG) ||
            this.check(TokenType.LIST) ||
            this.check(TokenType.TEST)) {
            return this.advance().value;
        }
        this.error(message);
        return '';
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
                this.check(TokenType.FIXTURE) || this.check(TokenType.SCENARIO) ||
                this.check(TokenType.RBRACE)) {
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
