import { Token, TokenType } from '../lexer/tokens.js';
import {
    ProgramNode, PageNode, PageActionsNode, FeatureNode, ScenarioNode, FieldNode, UseNode,
    VariableNode, ActionDefinitionNode, HookNode, StatementNode,
    SelectorNode, SelectorType, SelectorModifier, TargetNode, ExpressionNode, VerifyCondition,
    ParseError, LoadStatement, ForEachStatement, WhereClause,
    FixtureNode, FixtureUseNode, FixtureOptionNode, FixtureOptionValue,
    FeatureAnnotation, ScenarioAnnotation,
    VerifyUrlStatement, VerifyTitleStatement, VerifyHasStatement, UploadStatement,
    VerifyScreenshotStatement, VerifyScreenshotOptions,
    HasCondition, VariableCondition, VariableReference,
    PerformAssignmentStatement, ActionCallNode, ReturnStatement,
    CoordinateTarget,
    RowStatement, RowsStatement, ColumnAccessStatement, CountStatement,
    SimpleTableReference, DataCondition, OrderByClause,
    AndCondition, OrCondition, NotCondition, DataComparison, ComparisonOperator, TextOperator,
    UtilityAssignmentStatement, UtilityExpressionNode, DateUnit,
    TrimExpression, ConvertExpression, ExtractExpression, ReplaceExpression,
    SplitExpression, JoinExpression, LengthExpression, PadExpression,
    TodayExpression, NowExpression, AddDateExpression, SubtractDateExpression,
    FormatExpression, DatePartExpression, RoundExpression, AbsoluteExpression,
    GenerateExpression, RandomNumberExpression, ChainedExpression,
    SwitchToNewTabStatement,
    SwitchToTabStatement,
    OpenInNewTabStatement,
    CloseTabStatement,
    TryCatchStatement,
    SelectStatement,
    IfElseStatement, BooleanExpression, ElementStateCondition,
    RepeatStatement,
    ApiRequestStatement, HttpMethod,
    VerifyResponseStatement, ResponseCondition,
    MockApiStatement
} from './ast.js';

const UTILITY_KEYWORDS = new Set([
    TokenType.TRIM, TokenType.CONVERT, TokenType.EXTRACT, TokenType.REPLACE,
    TokenType.SPLIT, TokenType.JOIN, TokenType.LENGTH, TokenType.PAD,
    TokenType.TODAY, TokenType.NOW, TokenType.ADD, TokenType.SUBTRACT,
    TokenType.FORMAT, TokenType.YEAR, TokenType.MONTH, TokenType.DAY,
    TokenType.ROUND, TokenType.ABSOLUTE, TokenType.GENERATE, TokenType.RANDOM,
]);

const VARIABLE_TYPES = new Set([
    TokenType.TEXT, TokenType.NUMBER, TokenType.FLAG, TokenType.LIST,
]);

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
        const pageActions: PageActionsNode[] = [];
        const features: FeatureNode[] = [];
        const fixtures: FixtureNode[] = [];

        while (!this.isAtEnd()) {
            try {
                if (this.check(TokenType.PAGEACTIONS)) {
                    pageActions.push(this.parsePageActions());
                } else if (this.check(TokenType.PAGE)) {
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
            ast: { type: 'Program', pages, pageActions, features, fixtures },
            errors: this.errors
        };
    }

    // ==================== PAGE PARSING ====================

    private parsePage(): PageNode {
        const line = this.peek().line;
        this.consume(TokenType.PAGE, "Expected 'PAGE'");
        const name = this.consume(TokenType.IDENTIFIER, "Expected page name").value;

        // Optionally consume URL pattern(s): PAGE Name ("/url") { or PAGE Name ("/url1", "/url2") {
        if (this.check(TokenType.LPAREN)) {
            this.advance(); // skip (
            if (this.check(TokenType.STRING)) {
                this.advance(); // skip the URL string
                while (this.check(TokenType.COMMA)) {
                    this.advance(); // skip comma
                    if (this.check(TokenType.STRING)) this.advance();
                }
            }
            this.consume(TokenType.RPAREN, "Expected ')'");
        }

        this.consume(TokenType.LBRACE, "Expected '{'");

        const fields: FieldNode[] = [];
        const variables: VariableNode[] = [];
        const actions: ActionDefinitionNode[] = [];

        while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
            if (this.check(TokenType.FIELD)) {
                fields.push(this.parseField());
            } else if (this.isVariableType()) {
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

    // ==================== PAGEACTIONS PARSING ====================

    private parsePageActions(): PageActionsNode {
        const line = this.peek().line;
        this.consume(TokenType.PAGEACTIONS, "Expected 'PAGEACTIONS'");
        const name = this.consume(TokenType.IDENTIFIER, "Expected PageActions name").value;
        this.consume(TokenType.FOR, "Expected 'FOR'");
        const forPage = this.consume(TokenType.IDENTIFIER, "Expected page name").value;
        this.consume(TokenType.LBRACE, "Expected '{'");

        const actions: ActionDefinitionNode[] = [];

        while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
            if (this.check(TokenType.IDENTIFIER)) {
                actions.push(this.parseActionDefinition());
            } else {
                this.error(`Unexpected token in PageActions: ${this.peek().value}`);
                this.advance();
            }
        }

        this.consume(TokenType.RBRACE, "Expected '}'");

        return { type: 'PageActions', name, forPage, actions, line };
    }

    private parseField(): FieldNode {
        const line = this.peek().line;
        this.consume(TokenType.FIELD, "Expected 'FIELD'");
        const name = this.consume(TokenType.IDENTIFIER, "Expected field name").value;
        this.consume(TokenType.EQUALS_SIGN, "Expected '='");
        const selector = this.parseSelector();

        return { type: 'Field', name, selector, line };
    }

    /** Maps uppercase identifier values to SelectorType (contextual keywords). */
    private static readonly SELECTOR_KEYWORD_MAP: ReadonlyMap<string, SelectorType> = new Map([
        ['BUTTON', 'button'],
        ['TEXTBOX', 'textbox'],
        ['LINK', 'link'],
        ['CHECKBOX', 'checkbox'],
        ['HEADING', 'heading'],
        ['COMBOBOX', 'combobox'],
        ['RADIO', 'radio'],
        ['ROLE', 'role'],
        ['LABEL', 'label'],
        ['PLACEHOLDER', 'placeholder'],
        ['TESTID', 'testid'],
        ['TEXT', 'text'],
        ['ALT', 'alt'],
        ['TITLE', 'title'],
        ['CSS', 'css'],
        ['XPATH', 'xpath'],
    ]);

    private parseSelector(): SelectorNode {
        // Check for typed selector keyword: BUTTON "Submit", TESTID "cart-icon", etc.
        // Selector keywords are contextual — they are normal identifiers everywhere else,
        // so we match by value (case-insensitive) rather than by token type.
        const token = this.peek();
        const selectorType = (token.type === TokenType.IDENTIFIER || token.type === TokenType.TEXT || token.type === TokenType.TITLE)
            ? Parser.SELECTOR_KEYWORD_MAP.get(token.value.toUpperCase())
            : undefined;

        if (selectorType !== undefined) {
            this.advance(); // consume the keyword
            const value = this.consume(TokenType.STRING, `Expected string after ${selectorType.toUpperCase()}`).value;

            // For ROLE, optionally accept NAME "string" for: ROLE "button" NAME "Submit"
            let nameParam: string | undefined;
            if (selectorType === 'role' && this.peek().type === TokenType.IDENTIFIER && this.peek().value.toUpperCase() === 'NAME') {
                this.advance(); // consume NAME
                nameParam = this.consume(TokenType.STRING, "Expected string after NAME").value;
            }

            // Parse optional trailing modifiers: WITH TEXT "...", FIRST, LAST, NTH n, HAS ...
            const modifiers = this.parseSelectorModifiers();

            return { type: 'Selector', selectorType, value, nameParam, ...(modifiers.length > 0 ? { modifiers } : {}) };
        }

        // Legacy: plain string selector with auto-detection
        if (this.check(TokenType.STRING)) {
            const value = this.advance().value;
            return { type: 'Selector', selectorType: 'auto', value };
        }

        this.error("Expected selector (e.g., BUTTON \"Submit\" or \"#myId\")");
        return { type: 'Selector', selectorType: 'auto', value: '' };
    }

    /**
     * Parse optional selector modifiers that may appear after a base selector
     * in FIELD definitions: WITH TEXT "...", WITHOUT TEXT "...", FIRST, LAST,
     * NTH <number>, HAS <selector>, HAS NOT <selector>.
     */
    private parseSelectorModifiers(): SelectorModifier[] {
        const modifiers: SelectorModifier[] = [];
        let safety = 20; // Prevent infinite loops
        while (safety-- > 0) {
            const tok = this.peek();

            // FIRST / LAST
            if (tok.type === TokenType.FIRST) {
                this.advance();
                modifiers.push({ type: 'first' });
                continue;
            }
            if (tok.type === TokenType.LAST) {
                this.advance();
                modifiers.push({ type: 'last' });
                continue;
            }

            // NTH <number>
            if (tok.type === TokenType.IDENTIFIER && tok.value.toUpperCase() === 'NTH') {
                this.advance(); // consume NTH
                if (this.check(TokenType.NUMBER_LITERAL)) {
                    const index = parseInt(this.advance().value, 10);
                    modifiers.push({ type: 'nth', index });
                }
                continue;
            }

            // WITH TEXT "..." or WITHOUT TEXT "..."
            // Only consume WITH if followed by TEXT to avoid stealing WITH from parent statements (e.g., FILL ... WITH value)
            if (tok.type === TokenType.WITH && this.lookahead(1)?.type === TokenType.TEXT) {
                this.advance(); // consume WITH
                this.advance(); // consume TEXT
                if (this.check(TokenType.STRING)) {
                    const text = this.advance().value;
                    modifiers.push({ type: 'withText', text });
                }
                continue;
            }
            if (tok.type === TokenType.IDENTIFIER && tok.value.toUpperCase() === 'WITHOUT') {
                this.advance(); // consume WITHOUT
                if (this.check(TokenType.TEXT)) {
                    this.advance(); // consume TEXT
                    if (this.check(TokenType.STRING)) {
                        const text = this.advance().value;
                        modifiers.push({ type: 'withoutText', text });
                    }
                }
                continue;
            }

            // HAS <selector> or HAS NOT <selector>
            if (tok.type === TokenType.HAS) {
                this.advance(); // consume HAS
                const isNot = this.check(TokenType.NOT);
                if (isNot) {
                    this.advance(); // consume NOT
                }
                // Parse the nested selector
                const nestedTok = this.peek();
                const nestedType = (nestedTok.type === TokenType.IDENTIFIER || nestedTok.type === TokenType.TEXT || nestedTok.type === TokenType.TITLE)
                    ? Parser.SELECTOR_KEYWORD_MAP.get(nestedTok.value.toUpperCase())
                    : undefined;
                if (nestedType !== undefined) {
                    this.advance(); // consume selector keyword
                    if (this.check(TokenType.STRING)) {
                        const value = this.advance().value;
                        let nameParam: string | undefined;
                        if (nestedType === 'role' && this.peek().type === TokenType.IDENTIFIER && this.peek().value.toUpperCase() === 'NAME') {
                            this.advance(); // consume NAME
                            if (this.check(TokenType.STRING)) {
                                nameParam = this.advance().value;
                            }
                        }
                        const selector: SelectorNode = { type: 'Selector', selectorType: nestedType, value, nameParam };
                        modifiers.push(isNot ? { type: 'hasNot', selector } : { type: 'has', selector });
                    }
                }
                continue;
            }

            // No more modifiers
            break;
        }
        return modifiers;
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
        // Note: Allow keywords like 'value' to be used as parameter names
        if (this.match(TokenType.WITH)) {
            parameters.push(this.consumeIdentifierOrKeyword("Expected parameter"));
            while (this.match(TokenType.COMMA)) {
                parameters.push(this.consumeIdentifierOrKeyword("Expected parameter"));
            }
        }

        // Return type: RETURNS TEXT
        if (this.match(TokenType.RETURNS)) {
            if (this.isVariableType()) {
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

        const uses: UseNode[] = [];
        const fixtures: FixtureUseNode[] = [];
        const hooks: HookNode[] = [];
        const scenarios: ScenarioNode[] = [];

        while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
            if (this.check(TokenType.USE)) {
                // USE has been removed – emit migration error and skip
                const useTok = this.advance();
                const pageName = this.check(TokenType.IDENTIFIER) ? this.advance().value : '?';
                this.error(`USE ${pageName} is no longer needed — page and pageActions dependencies are now auto-resolved. Remove this line.`);
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
        const name = this.consume(TokenType.IDENTIFIER, "Expected scenario name").value;

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

        // RIGHT CLICK "Element"
        if (this.match(TokenType.RIGHT)) {
            this.consume(TokenType.CLICK, "Expected 'CLICK' after 'RIGHT'");
            const target = this.parseTarget();
            return { type: 'RightClick', target, line };
        }

        // DOUBLE CLICK "Element"
        if (this.match(TokenType.DOUBLE)) {
            this.consume(TokenType.CLICK, "Expected 'CLICK' after 'DOUBLE'");
            const target = this.parseTarget();
            return { type: 'DoubleClick', target, line };
        }

        // FORCE CLICK "Element"
        if (this.match(TokenType.FORCE)) {
            this.consume(TokenType.CLICK, "Expected 'CLICK' after 'FORCE'");
            const target = this.parseTarget();
            return { type: 'ForceClick', target, line };
        }

        // DRAG "Source" TO "Target" or DRAG "Element" TO x=100 y=200
        if (this.match(TokenType.DRAG)) {
            const source = this.parseTarget();
            this.consume(TokenType.TO, "Expected 'TO' after source element");

            // Check if destination is coordinates (x=... y=...)
            const isCoordinate = this.check(TokenType.IDENTIFIER) && this.peek().value.toLowerCase() === 'x';
            const destination = isCoordinate ? this.parseCoordinateTarget() : this.parseTarget();
            return { type: 'Drag', source, destination, line };
        }

        if (this.match(TokenType.FILL)) {
            const target = this.parseTarget();
            this.consume(TokenType.WITH, "Expected 'WITH'");
            const value = this.parseExpression();
            return { type: 'Fill', target, value, line };
        }

        if (this.match(TokenType.OPEN)) {
            const url = this.parseExpression();
            // OPEN "url" IN NEW TAB
            if (this.match(TokenType.IN)) {
                this.consume(TokenType.NEW, "Expected 'NEW' after 'IN'");
                this.consume(TokenType.TAB, "Expected 'TAB' after 'IN NEW'");
                return { type: 'OpenInNewTab', url, line } as OpenInNewTabStatement;
            }
            return { type: 'Open', url, line };
        }

        // VERIFY keyword for assertions
        if (this.match(TokenType.VERIFY)) {
            // VERIFY RESPONSE STATUS/BODY/HEADERS
            if (this.match(TokenType.RESPONSE)) {
                return this.parseVerifyResponseStatement(line);
            }

            // VERIFY SCREENSHOT [AS "name"] [WITH ...]
            if (this.match(TokenType.SCREENSHOT)) {
                const { name, options } = this.parseVerifyScreenshotTail();
                return { type: 'VerifyScreenshot', name, options, line };
            }

            // Check for URL assertion: verify url contains/equals/matches "value"
            if (this.match(TokenType.URL)) {
                const condition = this.parseUrlCondition();
                const value = this.parseExpression();
                return { type: 'VerifyUrl', condition, value, line };
            }

            // Check for PAGE TITLE assertion: assert page title is "value"
            if (this.match(TokenType.PAGE)) {
                this.consume(TokenType.TITLE, "Expected 'TITLE' after 'PAGE'");
                const condition = this.parseTitleCondition();
                const value = this.parseExpression();
                return { type: 'VerifyTitle', condition, value, line };
            }

            // Check for TITLE assertion: verify title contains/equals "value"
            if (this.match(TokenType.TITLE)) {
                const condition = this.parseTitleCondition();
                const value = this.parseExpression();
                return { type: 'VerifyTitle', condition, value, line };
            }

            // Check for ELEMENT COUNT assertion: assert element count of "selector" is N
            if (this.match(TokenType.ELEMENT)) {
                this.consume(TokenType.COUNT, "Expected 'COUNT' after 'ELEMENT'");
                this.consume(TokenType.OF, "Expected 'OF' after 'COUNT'");
                const target = this.parseTarget();
                this.consume(TokenType.IS, "Expected 'IS'");
                const count = this.parseExpression();
                return { type: 'VerifyHas', target, hasCondition: { type: 'HasCount', count }, line };
            }

            // VERIFY <target> MATCHES SCREENSHOT [AS "name"] [WITH ...]
            if (this.isVerifyTargetScreenshotAssertion()) {
                const target = this.parseTarget();
                this.consume(TokenType.MATCHES, "Expected 'MATCHES' in screenshot assertion");
                this.consume(TokenType.SCREENSHOT, "Expected 'SCREENSHOT' after 'MATCHES'");
                const { name, options } = this.parseVerifyScreenshotTail();
                return { type: 'VerifyScreenshot', target, name, options, line };
            }

            // Check for variable assertion: VERIFY variableName IS TRUE/FALSE or VERIFY variableName CONTAINS "text"
            // This must be checked BEFORE parseTarget() because variable names look like identifiers
            if (this.check(TokenType.IDENTIFIER) && !this.checkVariableIsPageField()) {
                const variableName = this.advance().value;
                const variable: VariableReference = { type: 'VariableReference', name: variableName };

                // Check for IS TRUE/FALSE
                if (this.match(TokenType.IS)) {
                    const negated = this.match(TokenType.NOT);
                    if (this.match(TokenType.TRUE)) {
                        const condition: VariableCondition = negated ? { type: 'IsNotTrue' } : { type: 'IsTrue' };
                        return { type: 'VerifyVariable', variable, condition, line };
                    }
                    if (this.match(TokenType.FALSE)) {
                        const condition: VariableCondition = negated ? { type: 'IsNotFalse' } : { type: 'IsFalse' };
                        return { type: 'VerifyVariable', variable, condition, line };
                    }
                    this.error("Expected 'TRUE' or 'FALSE' after 'IS'");
                }

                // Check for CONTAINS "text"
                if (this.match(TokenType.CONTAINS)) {
                    const value = this.parseExpression();
                    const condition: VariableCondition = { type: 'Contains', value };
                    return { type: 'VerifyVariable', variable, condition, line };
                }

                // Check for EQUALS "text"
                if (this.match(TokenType.EQUAL)) {
                    const value = this.parseExpression();
                    const condition: VariableCondition = { type: 'Equals', value };
                    return { type: 'VerifyVariable', variable, condition, line };
                }

                // Not a variable assertion, treat as a field reference (put back the identifier)
                this.pos--; // Go back to re-parse as target
            }

            // Parse target for element assertions
            const target = this.parseTarget();

            // Check for HAS assertion: verify selector has count/value/attribute/text/class
            if (this.match(TokenType.HAS)) {
                const hasCondition = this.parseHasCondition();
                return { type: 'VerifyHas', target, hasCondition, line };
            }

            // Check for CONTAINS TEXT assertion: assert "element" contains text "value"
            if (this.match(TokenType.CONTAINS)) {
                this.consume(TokenType.TEXT, "Expected 'TEXT' after 'CONTAINS'");
                const text = this.parseExpression();
                return { type: 'VerifyHas', target, hasCondition: { type: 'ContainsText', text }, line };
            }

            // Standard element assertion: verify element is visible/etc.
            const condition = this.parseVerifyCondition();
            return { type: 'Verify', target, condition, line };
        }

        if (this.match(TokenType.PERFORM)) {
            const action = this.parseActionCall();
            return { type: 'Perform', action, line };
        }

        if (this.match(TokenType.WAIT)) {
            // WAIT FOR NAVIGATION | WAIT FOR NETWORK IDLE | WAIT FOR URL CONTAINS "..." | WAIT FOR target
            if (this.match(TokenType.FOR)) {
                // WAIT FOR NAVIGATION
                if (this.match(TokenType.NAVIGATION)) {
                    return { type: 'WaitForNavigation', line };
                }
                // WAIT FOR NETWORK IDLE
                if (this.match(TokenType.NETWORK)) {
                    this.consume(TokenType.IDLE, "Expected 'IDLE' after 'WAIT FOR NETWORK'");
                    return { type: 'WaitForNetworkIdle', line };
                }
                // WAIT FOR URL CONTAINS "..."
                if (this.match(TokenType.URL)) {
                    let condition: 'contains' | 'equals' = 'contains';
                    if (this.match(TokenType.CONTAINS)) {
                        condition = 'contains';
                    } else if (this.match(TokenType.EQUAL)) {
                        condition = 'equals';
                    }
                    const value = this.parseExpression();
                    return { type: 'WaitForUrl', condition, value, line };
                }
                // WAIT FOR target - wait until element is visible
                const target = this.parseTarget();
                return { type: 'WaitFor', target, line };
            }
            // WAIT N SECONDS/MILLISECONDS
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

        // SWITCH TO NEW TAB "url" | SWITCH TO TAB N | SWITCH TO FRAME selector | SWITCH TO MAIN FRAME
        if (this.match(TokenType.SWITCH)) {
            this.consume(TokenType.TO, "Expected 'TO' after 'SWITCH'");
            // SWITCH TO NEW TAB "url"
            if (this.match(TokenType.NEW)) {
                this.consume(TokenType.TAB, "Expected 'TAB' after 'SWITCH TO NEW'");
                let url: ExpressionNode | undefined;
                if (this.check(TokenType.STRING) || this.check(TokenType.IDENTIFIER) || this.check(TokenType.ENV_VAR_REF)) {
                    url = this.parseExpression();
                }
                return { type: 'SwitchToNewTab', url, line } as SwitchToNewTabStatement;
            }
            // SWITCH TO TAB N (1-based index)
            if (this.match(TokenType.TAB)) {
                const tabIndex = this.parseExpression();
                return { type: 'SwitchToTab', tabIndex, line } as SwitchToTabStatement;
            }
            // SWITCH TO MAIN FRAME
            if (this.match(TokenType.MAIN)) {
                this.consume(TokenType.FRAME, "Expected 'FRAME' after 'SWITCH TO MAIN'");
                return { type: 'SwitchToMainFrame', line };
            }
            // SWITCH TO FRAME selector
            if (this.match(TokenType.FRAME)) {
                const selector = this.parseSelector();
                return { type: 'SwitchToFrame', selector, line };
            }
            this.error("Expected 'NEW TAB', 'TAB', 'FRAME', or 'MAIN FRAME' after 'SWITCH TO'");
            return { type: 'SwitchToNewTab', line } as SwitchToNewTabStatement;
        }

        // CLOSE TAB
        if (this.match(TokenType.CLOSE)) {
            this.consume(TokenType.TAB, "Expected 'TAB' after 'CLOSE'");
            return { type: 'CloseTab', line } as CloseTabStatement;
        }

        // ACCEPT DIALOG [WITH "text"]
        if (this.match(TokenType.ACCEPT)) {
            this.consume(TokenType.DIALOG, "Expected 'DIALOG' after 'ACCEPT'");
            let responseText: ExpressionNode | undefined;
            if (this.match(TokenType.WITH)) {
                responseText = this.parseExpression();
            }
            return { type: 'AcceptDialog', responseText, line };
        }

        // DISMISS DIALOG
        if (this.match(TokenType.DISMISS)) {
            this.consume(TokenType.DIALOG, "Expected 'DIALOG' after 'DISMISS'");
            return { type: 'DismissDialog', line };
        }

        // DOWNLOAD FROM PageName.field [AS "filename"]
        if (this.match(TokenType.DOWNLOAD)) {
            this.consume(TokenType.FROM, "Expected 'FROM' after 'DOWNLOAD'");
            const target = this.parseTarget();
            let saveAs: ExpressionNode | undefined;
            if (this.match(TokenType.AS)) {
                saveAs = this.parseExpression();
            }
            return { type: 'Download', target, saveAs, line };
        }

        // SET COOKIE "name" TO "value" | SET STORAGE "key" TO "value"
        if (this.match(TokenType.SET)) {
            if (this.match(TokenType.COOKIE)) {
                const name = this.parseExpression();
                this.consume(TokenType.TO, "Expected 'TO' after cookie name");
                const value = this.parseExpression();
                return { type: 'SetCookie', name, value, line };
            }
            if (this.match(TokenType.STORAGE)) {
                const key = this.parseExpression();
                this.consume(TokenType.TO, "Expected 'TO' after storage key");
                const value = this.parseExpression();
                return { type: 'SetStorage', key, value, line };
            }
            this.error("Expected 'COOKIE' or 'STORAGE' after 'SET'");
        }

        // GET STORAGE "key" INTO variable
        if (this.match(TokenType.GET)) {
            this.consume(TokenType.STORAGE, "Expected 'STORAGE' after 'GET'");
            const key = this.parseExpression();
            this.consume(TokenType.INTO, "Expected 'INTO' after storage key");
            const variable = this.consume(TokenType.IDENTIFIER, "Expected variable name after 'INTO'").value;
            return { type: 'GetStorage', key, variable, line };
        }

        // CLEAR COOKIES | CLEAR STORAGE | CLEAR target
        if (this.match(TokenType.CLEAR)) {
            if (this.match(TokenType.COOKIES)) {
                return { type: 'ClearCookies', line };
            }
            if (this.match(TokenType.STORAGE)) {
                return { type: 'ClearStorage', line };
            }
            // CLEAR target — clears an input field via .fill('')
            const target = this.parseTarget();
            return { type: 'ClearField', target, line };
        }

        // SCROLL DOWN | SCROLL UP | SCROLL TO target
        if (this.match(TokenType.SCROLL)) {
            if (this.match(TokenType.DOWN)) {
                return { type: 'Scroll', direction: 'down', line };
            }
            if (this.match(TokenType.UP)) {
                return { type: 'Scroll', direction: 'up', line };
            }
            if (this.match(TokenType.TO)) {
                const target = this.parseTarget();
                return { type: 'Scroll', target, line };
            }
            return { type: 'Scroll', direction: 'down', line };
        }

        if (this.match(TokenType.CHECK)) {
            const target = this.parseTarget();
            return { type: 'Check', target, line };
        }

        if (this.match(TokenType.UNCHECK)) {
            const target = this.parseTarget();
            return { type: 'Uncheck', target, line };
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

        // take screenshot | take screenshot as "name" | take screenshot of Page.field | take screenshot of Page.field as "name"
        if (this.match(TokenType.TAKE)) {
            this.consume(TokenType.SCREENSHOT, "Expected 'SCREENSHOT'");
            let target: TargetNode | undefined;
            let filename: string | undefined;

            // Check for "of" - element screenshot (must use Page.field reference)
            if (this.match(TokenType.OF)) {
                // Direct string selectors are NOT allowed - must use Page.field
                if (this.check(TokenType.STRING)) {
                    this.error("Direct selectors not allowed in 'take screenshot of'. Use Page.field reference instead (e.g., LoginPage.submitButton)");
                    this.advance(); // consume the string to continue parsing
                } else {
                    target = this.parsePageFieldTarget();
                }
            }

            // Check for "as" or direct string for filename
            if (this.match(TokenType.AS)) {
                if (this.check(TokenType.STRING)) {
                    filename = this.advance().value;
                } else {
                    this.error("Expected filename after 'as'");
                }
            } else if (this.check(TokenType.STRING)) {
                // Allow direct string without 'as' for backwards compatibility
                filename = this.advance().value;
            }

            return { type: 'TakeScreenshot', target, filename, line };
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

        // TRY { ... } CATCH { ... }
        if (this.match(TokenType.TRY)) {
            return this.parseTryCatchStatement(line);
        }

        // SELECT "option" FROM target
        if (this.match(TokenType.SELECT)) {
            const option = this.parseExpression();
            this.consume(TokenType.FROM, "Expected 'FROM' after option in SELECT");
            const target = this.parseTarget();
            return { type: 'Select', option, target, line } as SelectStatement;
        }

        // IF condition { ... } [ELSE { ... }]
        if (this.match(TokenType.IF)) {
            return this.parseIfElseStatement(line);
        }

        // REPEAT N TIMES { ... }
        if (this.match(TokenType.REPEAT)) {
            return this.parseRepeatStatement(line);
        }

        // MOCK API "url" WITH STATUS n [AND BODY "..."]
        if (this.match(TokenType.MOCK)) {
            this.consume(TokenType.API, "Expected 'API' after 'MOCK'");
            return this.parseMockApiStatement(line);
        }

        // API GET "url" | API POST "url" WITH BODY expression
        if (this.match(TokenType.API)) {
            return this.parseApiRequestStatement(line);
        }

        // ROW user = Users WHERE state = "CA"
        // ROW user = FIRST/LAST/RANDOM Users WHERE ...
        if (this.match(TokenType.ROW)) {
            return this.parseRowStatement(line);
        }

        // ROWS users = Users WHERE state = "CA" ORDER BY name LIMIT 10
        if (this.match(TokenType.ROWS)) {
            return this.parseRowsStatement(line);
        }

        // NUMBER count = COUNT Users WHERE state = "CA"
        if (this.check(TokenType.NUMBER) && this.lookahead(3)?.type === TokenType.COUNT) {
            return this.parseCountStatement(line);
        }

        // Utility function assignments: TEXT result = TRIM $input
        // Check for variable type followed by identifier and equals, then utility keyword
        if (this.isUtilityAssignment()) {
            return this.parseUtilityAssignment(line);
        }

        // PERFORM assignments: FLAG isWelcome = PERFORM DashboardActions.isWelcomeVisible
        if (this.isPerformAssignment()) {
            return this.parsePerformAssignment(line);
        }

        // RETURN VISIBLE OF field | RETURN TEXT OF field | RETURN expression
        if (this.match(TokenType.RETURN)) {
            return this.parseReturnStatement(line);
        }

        this.error(`Unexpected statement: ${this.peek().value}`);
        this.advance();
        return null;
    }

    /** Check pattern: TYPE identifier = UTILITY_KEYWORD ... */
    private isUtilityAssignment(): boolean {
        return this.isVariableAssignmentFollowedBy(token => UTILITY_KEYWORDS.has(token.type));
    }

    /** Check pattern: TYPE identifier = PERFORM ... */
    private isPerformAssignment(): boolean {
        return this.isVariableAssignmentFollowedBy(token => token.type === TokenType.PERFORM);
    }

    /** Shared lookahead check: variableType IDENTIFIER = <predicate on 4th token> */
    private isVariableAssignmentFollowedBy(predicate: (token: Token) => boolean): boolean {
        if (!this.isVariableType()) return false;

        const identifierToken = this.lookahead(1);
        const equalsToken = this.lookahead(2);
        const nextToken = this.lookahead(3);

        return !!identifierToken && identifierToken.type === TokenType.IDENTIFIER
            && !!equalsToken && equalsToken.type === TokenType.EQUALS_SIGN
            && !!nextToken && predicate(nextToken);
    }

    // Parse: FLAG isWelcome = PERFORM DashboardActions.isWelcomeVisible WITH arg1, arg2
    private parsePerformAssignment(line: number): PerformAssignmentStatement {
        const varType = this.advance().type as 'TEXT' | 'NUMBER' | 'FLAG' | 'LIST';
        const variableName = this.consume(TokenType.IDENTIFIER, "Expected variable name").value;
        this.consume(TokenType.EQUALS_SIGN, "Expected '='");
        this.consume(TokenType.PERFORM, "Expected 'PERFORM'");

        const action = this.parseActionCall();

        return { type: 'PerformAssignment', varType, variableName, action, line };
    }

    // RETURN VISIBLE OF field | RETURN TEXT OF field | RETURN VALUE OF field | RETURN expression
    private static readonly RETURN_TYPE_TOKENS: ReadonlyMap<TokenType, ReturnStatement['returnType']> = new Map([
        [TokenType.VISIBLE, 'VISIBLE'],
        [TokenType.TEXT, 'TEXT'],
        [TokenType.VALUE, 'VALUE'],
    ]);

    private parseReturnStatement(line: number): ReturnStatement {
        // RETURN VISIBLE/TEXT/VALUE OF target
        for (const [tokenType, returnType] of Parser.RETURN_TYPE_TOKENS) {
            if (this.match(tokenType)) {
                this.consume(TokenType.OF, `Expected 'OF' after '${returnType}'`);
                const target = this.parseTarget();
                return { type: 'Return', returnType, target, line };
            }
        }

        // RETURN expression (direct value)
        const expression = this.parseExpression();
        return { type: 'Return', returnType: 'EXPRESSION', expression, line };
    }

    private parseUtilityAssignment(line: number): UtilityAssignmentStatement {
        const varType = this.advance().type as 'TEXT' | 'NUMBER' | 'FLAG' | 'LIST';
        const variableName = this.consume(TokenType.IDENTIFIER, "Expected variable name").value;
        this.consume(TokenType.EQUALS_SIGN, "Expected '='");

        const expression = this.parseUtilityExpression();

        return { type: 'UtilityAssignment', varType, variableName, expression, line };
    }

    private parseUtilityExpression(): UtilityExpressionNode {
        let expr = this.parsePrimaryUtilityExpression();

        while (this.match(TokenType.THEN)) {
            const second = this.parsePrimaryUtilityExpression();
            expr = { type: 'Chained', first: expr, second } as ChainedExpression;
        }

        return expr;
    }

    private parsePrimaryUtilityExpression(): UtilityExpressionNode {
        if (this.match(TokenType.TRIM)) {
            return { type: 'Trim', value: this.parseExpression() } as TrimExpression;
        }

        if (this.match(TokenType.CONVERT)) {
            const value = this.parseExpression();
            this.consume(TokenType.TO, "Expected 'TO'");

            let targetType: ConvertExpression['targetType'] = 'TEXT';
            if (this.match(TokenType.UPPERCASE)) targetType = 'UPPERCASE';
            else if (this.match(TokenType.LOWERCASE)) targetType = 'LOWERCASE';
            else if (this.match(TokenType.NUMBER)) targetType = 'NUMBER';
            else if (this.match(TokenType.TEXT)) targetType = 'TEXT';
            else this.error("Expected 'UPPERCASE', 'LOWERCASE', 'NUMBER', or 'TEXT'");

            return { type: 'Convert', value, targetType } as ConvertExpression;
        }

        if (this.match(TokenType.EXTRACT)) {
            const value = this.parseExpression();
            this.consume(TokenType.FROM, "Expected 'FROM'");
            const start = this.parseExpression();
            this.consume(TokenType.TO, "Expected 'TO'");
            const end = this.parseExpression();
            return { type: 'Extract', value, start, end } as ExtractExpression;
        }

        if (this.match(TokenType.REPLACE)) {
            const value = this.parseExpression();
            const search = this.consume(TokenType.STRING, "Expected search string").value;
            this.consume(TokenType.WITH, "Expected 'WITH'");
            const replacement = this.consume(TokenType.STRING, "Expected replacement string").value;
            return { type: 'Replace', value, search, replacement } as ReplaceExpression;
        }

        if (this.match(TokenType.SPLIT)) {
            const value = this.parseExpression();
            this.consume(TokenType.BY, "Expected 'BY'");
            const delimiter = this.consume(TokenType.STRING, "Expected delimiter string").value;
            return { type: 'Split', value, delimiter } as SplitExpression;
        }

        if (this.match(TokenType.JOIN)) {
            const value = this.parseExpression();
            this.consume(TokenType.WITH, "Expected 'WITH'");
            const delimiter = this.consume(TokenType.STRING, "Expected delimiter string").value;
            return { type: 'Join', value, delimiter } as JoinExpression;
        }

        if (this.match(TokenType.LENGTH)) {
            this.consume(TokenType.OF, "Expected 'OF'");
            return { type: 'Length', value: this.parseExpression() } as LengthExpression;
        }

        if (this.match(TokenType.PAD)) {
            const value = this.parseExpression();
            this.consume(TokenType.TO, "Expected 'TO'");
            const length = this.parseExpression();
            this.consume(TokenType.WITH, "Expected 'WITH'");
            const padChar = this.consume(TokenType.STRING, "Expected pad character").value;
            return { type: 'Pad', value, length, padChar } as PadExpression;
        }

        if (this.match(TokenType.TODAY)) {
            return { type: 'Today' } as TodayExpression;
        }

        if (this.match(TokenType.NOW)) {
            return { type: 'Now' } as NowExpression;
        }

        if (this.match(TokenType.ADD)) {
            const amount = this.parseExpression();
            const unit = this.parseDateUnit();
            this.consume(TokenType.TO, "Expected 'TO'");
            const date = this.parseDateOrExpression();
            return { type: 'AddDate', amount, unit, date } as AddDateExpression;
        }

        if (this.match(TokenType.SUBTRACT)) {
            const amount = this.parseExpression();
            const unit = this.parseDateUnit();
            this.consume(TokenType.FROM, "Expected 'FROM'");
            const date = this.parseDateOrExpression();
            return { type: 'SubtractDate', amount, unit, date } as SubtractDateExpression;
        }

        if (this.match(TokenType.FORMAT)) {
            const value = this.parseExpression();
            this.consume(TokenType.AS, "Expected 'AS'");

            if (this.match(TokenType.CURRENCY)) {
                const currency = this.check(TokenType.STRING) ? this.advance().value : 'USD';
                return { type: 'Format', value, formatType: 'currency', currency } as FormatExpression;
            }

            if (this.match(TokenType.PERCENT)) {
                return { type: 'Format', value, formatType: 'percent' } as FormatExpression;
            }

            const pattern = this.consume(TokenType.STRING, "Expected format pattern").value;
            return { type: 'Format', value, formatType: 'pattern', pattern } as FormatExpression;
        }

        if (this.check(TokenType.YEAR) || this.check(TokenType.MONTH) || this.check(TokenType.DAY)) {
            const partToken = this.advance();
            let part: DatePartExpression['part'];
            if (partToken.type === TokenType.YEAR) part = 'YEAR';
            else if (partToken.type === TokenType.MONTH) part = 'MONTH';
            else part = 'DAY';

            this.consume(TokenType.OF, "Expected 'OF'");
            return { type: 'DatePart', part, date: this.parseExpression() } as DatePartExpression;
        }

        if (this.match(TokenType.ROUND)) {
            const value = this.parseExpression();

            if (this.match(TokenType.UP)) {
                return { type: 'Round', value, direction: 'UP' } as RoundExpression;
            }
            if (this.match(TokenType.DOWN)) {
                return { type: 'Round', value, direction: 'DOWN' } as RoundExpression;
            }
            if (this.match(TokenType.TO)) {
                const decimals = this.parseExpression();
                this.consume(TokenType.DECIMALS, "Expected 'DECIMALS'");
                return { type: 'Round', value, decimals } as RoundExpression;
            }
            return { type: 'Round', value } as RoundExpression;
        }

        if (this.match(TokenType.ABSOLUTE)) {
            return { type: 'Absolute', value: this.parseExpression() } as AbsoluteExpression;
        }

        if (this.match(TokenType.GENERATE)) {
            if (this.match(TokenType.UUID)) {
                return { type: 'Generate', pattern: 'UUID' } as GenerateExpression;
            }
            const pattern = this.consume(TokenType.STRING, "Expected regex pattern or UUID").value;
            return { type: 'Generate', pattern } as GenerateExpression;
        }

        if (this.match(TokenType.RANDOM)) {
            this.consume(TokenType.NUMBER, "Expected 'NUMBER'");
            this.consume(TokenType.FROM, "Expected 'FROM'");
            const min = this.parseExpression();
            this.consume(TokenType.TO, "Expected 'TO'");
            const max = this.parseExpression();
            return { type: 'RandomNumber', min, max } as RandomNumberExpression;
        }

        return this.parseExpression();
    }

    private parseDateUnit(): DateUnit {
        if (this.match(TokenType.DAY)) return 'DAY';
        if (this.match(TokenType.DAYS_UNIT)) return 'DAYS';
        if (this.match(TokenType.MONTH)) return 'MONTH';
        if (this.match(TokenType.MONTHS_UNIT)) return 'MONTHS';
        if (this.match(TokenType.YEAR)) return 'YEAR';
        if (this.match(TokenType.YEARS_UNIT)) return 'YEARS';

        this.error("Expected date unit (DAY, DAYS, MONTH, MONTHS, YEAR, YEARS)");
        return 'DAYS';
    }

    private parseDateOrExpression(): ExpressionNode | TodayExpression | NowExpression {
        if (this.match(TokenType.TODAY)) {
            return { type: 'Today' } as TodayExpression;
        }
        if (this.match(TokenType.NOW)) {
            return { type: 'Now' } as NowExpression;
        }
        return this.parseExpression();
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

    // ==================== TRY/CATCH PARSING ====================

    private parseTryCatchStatement(line: number): TryCatchStatement {
        this.consume(TokenType.LBRACE, "Expected '{' after 'TRY'");
        const tryStatements = this.parseStatementBlock();
        this.consume(TokenType.RBRACE, "Expected '}'");

        this.consume(TokenType.CATCH, "Expected 'CATCH' after TRY block");
        this.consume(TokenType.LBRACE, "Expected '{' after 'CATCH'");
        const catchStatements = this.parseStatementBlock();
        this.consume(TokenType.RBRACE, "Expected '}'");

        return { type: 'TryCatch', tryStatements, catchStatements, line };
    }

    // ==================== IF/ELSE PARSING ====================

    private parseIfElseStatement(line: number): IfElseStatement {
        const condition = this.parseBooleanExpression();

        this.consume(TokenType.LBRACE, "Expected '{' after IF condition");
        const ifStatements = this.parseStatementBlock();
        this.consume(TokenType.RBRACE, "Expected '}'");

        let elseStatements: StatementNode[] = [];
        if (this.match(TokenType.ELSE)) {
            this.consume(TokenType.LBRACE, "Expected '{' after 'ELSE'");
            elseStatements = this.parseStatementBlock();
            this.consume(TokenType.RBRACE, "Expected '}'");
        }

        return { type: 'IfElse', condition, ifStatements, elseStatements, line };
    }

    private parseBooleanExpression(): BooleanExpression {
        // Two forms:
        // 1. target IS [NOT] VISIBLE/HIDDEN/ENABLED/DISABLED/CHECKED
        // 2. variableName (truthy check - just an identifier before '{')

        // Check if this is a simple variable truthy check:
        // An identifier immediately followed by '{' means it's a variable truthy
        if (this.check(TokenType.IDENTIFIER) && this.lookahead(1)?.type === TokenType.LBRACE) {
            const variableName = this.advance().value;
            return { type: 'VariableTruthy', variableName };
        }

        // Otherwise parse as element state condition: target IS [NOT] state
        const target = this.parseTarget();
        this.consume(TokenType.IS, "Expected 'IS' after target in IF condition");
        const negated = this.match(TokenType.NOT);
        const stateTokens = [TokenType.VISIBLE, TokenType.HIDDEN, TokenType.ENABLED, TokenType.DISABLED, TokenType.CHECKED];
        for (const tokenType of stateTokens) {
            if (this.match(tokenType)) {
                return {
                    type: 'ElementState',
                    target,
                    negated,
                    state: tokenType as ElementStateCondition['state'],
                };
            }
        }

        this.error("Expected state keyword (VISIBLE, HIDDEN, ENABLED, DISABLED, CHECKED) after 'IS'");
        return { type: 'VariableTruthy', variableName: '' };
    }

    // ==================== REPEAT PARSING ====================

    private parseRepeatStatement(line: number): RepeatStatement {
        const count = this.parseExpression();
        this.consume(TokenType.TIMES, "Expected 'TIMES' after count in REPEAT");
        this.consume(TokenType.LBRACE, "Expected '{' after 'REPEAT N TIMES'");
        const statements = this.parseStatementBlock();
        this.consume(TokenType.RBRACE, "Expected '}'");

        return { type: 'Repeat', count, statements, line };
    }

    // ==================== API REQUEST PARSING ====================

    private parseApiRequestStatement(line: number): ApiRequestStatement {
        const method = this.parseHttpMethod();
        const url = this.parseExpression();

        let body: ExpressionNode | undefined;
        let headers: ExpressionNode | undefined;

        // WITH BODY expression
        if (this.match(TokenType.WITH)) {
            if (this.match(TokenType.BODY)) {
                body = this.parseExpression();
            } else if (this.match(TokenType.HEADERS_KW)) {
                headers = this.parseExpression();
            } else {
                this.error("Expected 'BODY' or 'HEADERS' after 'WITH' in API statement");
            }

            // Optional second WITH clause: WITH HEADERS expression
            if (this.match(TokenType.WITH)) {
                if (this.match(TokenType.HEADERS_KW)) {
                    headers = this.parseExpression();
                } else if (this.match(TokenType.BODY)) {
                    body = this.parseExpression();
                } else {
                    this.error("Expected 'BODY' or 'HEADERS' after 'WITH' in API statement");
                }
            }
        }

        return { type: 'ApiRequest', method, url, body, headers, line };
    }

    // ==================== MOCK API PARSING ====================

    private parseMockApiStatement(line: number): MockApiStatement {
        const url = this.parseExpression();

        this.consume(TokenType.WITH, "Expected 'WITH' after URL in MOCK API statement");
        this.consume(TokenType.STATUS, "Expected 'STATUS' after 'WITH' in MOCK API statement");
        const status = this.parseExpression();

        let body: ExpressionNode | undefined;

        // Optional: AND BODY "..."
        if (this.match(TokenType.AND)) {
            this.consume(TokenType.BODY, "Expected 'BODY' after 'AND' in MOCK API statement");
            body = this.parseExpression();
        }

        return { type: 'MockApi', url, status, body, line };
    }

    private parseHttpMethod(): HttpMethod {
        if (this.match(TokenType.GET)) return 'GET';
        if (this.match(TokenType.POST)) return 'POST';
        if (this.match(TokenType.PUT)) return 'PUT';
        if (this.match(TokenType.DELETE)) return 'DELETE';
        if (this.match(TokenType.PATCH)) return 'PATCH';

        this.error("Expected HTTP method (GET, POST, PUT, DELETE, PATCH)");
        return 'GET';
    }

    // ==================== VERIFY RESPONSE PARSING ====================

    private parseVerifyResponseStatement(line: number): VerifyResponseStatement {
        let condition: ResponseCondition;

        if (this.match(TokenType.STATUS)) {
            const operator = this.parseResponseOperator();
            const value = this.parseExpression();
            condition = { type: 'Status', operator, value };
        } else if (this.match(TokenType.BODY)) {
            const operator = this.parseBodyOperator();
            const value = this.parseExpression();
            condition = { type: 'Body', operator, value };
        } else if (this.match(TokenType.HEADERS_KW)) {
            this.consume(TokenType.CONTAINS, "Expected 'CONTAINS' after 'HEADERS'");
            const value = this.parseExpression();
            condition = { type: 'Headers', operator: 'contains', value };
        } else {
            this.error("Expected 'STATUS', 'BODY', or 'HEADERS' after 'VERIFY RESPONSE'");
            condition = { type: 'Status', operator: 'equals', value: { type: 'NumberLiteral', value: 200 } };
        }

        return { type: 'VerifyResponse', condition, line };
    }

    private parseResponseOperator(): 'equals' | 'contains' | '>' | '<' | '>=' | '<=' | '==' | '!=' {
        if (this.match(TokenType.EQUAL)) return 'equals';
        if (this.match(TokenType.CONTAINS)) return 'contains';
        if (this.match(TokenType.IS)) return 'equals';
        // Comparison operators for numeric status codes.
        // These don't have dedicated TokenTypes — we match on the raw token value.
        // If the lexer changes how operators are tokenized, this needs updating.
        const tok = this.peek();
        if (tok.value === '>') { this.advance(); return '>'; }
        if (tok.value === '<') { this.advance(); return '<'; }
        if (tok.value === '>=') { this.advance(); return '>='; }
        if (tok.value === '<=') { this.advance(); return '<='; }
        if (tok.value === '==') { this.advance(); return '=='; }
        if (tok.value === '!=') { this.advance(); return '!='; }

        this.error("Expected comparison operator after 'STATUS'");
        return 'equals';
    }

    private parseBodyOperator(): 'contains' | 'equals' {
        if (this.match(TokenType.CONTAINS)) return 'contains';
        if (this.match(TokenType.EQUAL)) return 'equals';
        if (this.match(TokenType.IS)) return 'equals';

        this.error("Expected 'CONTAINS' or 'EQUALS' after 'BODY'");
        return 'contains';
    }

    // ==================== ROW/ROWS STATEMENT PARSING ====================

    private parseRowStatement(line: number): RowStatement {
        const variableName = this.consume(TokenType.IDENTIFIER, "Expected variable name after 'ROW'").value;
        this.consumeAssignmentOrFrom();

        // Check for optional modifier: FIRST, LAST, RANDOM
        let modifier: RowStatement['modifier'];
        if (this.match(TokenType.FIRST)) {
            modifier = 'FIRST';
        } else if (this.match(TokenType.LAST)) {
            modifier = 'LAST';
        } else if (this.match(TokenType.RANDOM)) {
            modifier = 'RANDOM';
        }

        // Parse table reference
        const tableRef = this.parseSimpleTableReference();

        // Optional WHERE clause
        let where: DataCondition | undefined;
        if (this.match(TokenType.WHERE)) {
            where = this.parseDataCondition();
        }

        // Optional ORDER BY clause
        let orderBy: OrderByClause[] | undefined;
        if (this.match(TokenType.ORDER)) {
            orderBy = this.parseOrderByClause();
        }

        return { type: 'Row', variableName, modifier, tableRef, where, orderBy, line };
    }

    private parseRowsStatement(line: number): RowsStatement {
        const variableName = this.consume(TokenType.IDENTIFIER, "Expected variable name after 'ROWS'").value;
        this.consumeAssignmentOrFrom();

        // Parse table reference
        const tableRef = this.parseSimpleTableReference();

        // Optional WHERE clause
        let where: DataCondition | undefined;
        if (this.match(TokenType.WHERE)) {
            where = this.parseDataCondition();
        }

        // Optional ORDER BY clause
        let orderBy: OrderByClause[] | undefined;
        if (this.match(TokenType.ORDER)) {
            orderBy = this.parseOrderByClause();
        }

        // Optional LIMIT
        let limit: number | undefined;
        if (this.match(TokenType.LIMIT)) {
            limit = parseInt(this.consume(TokenType.NUMBER_LITERAL, "Expected number after 'LIMIT'").value, 10);
        }

        // Optional OFFSET
        let offset: number | undefined;
        if (this.match(TokenType.OFFSET)) {
            offset = parseInt(this.consume(TokenType.NUMBER_LITERAL, "Expected number after 'OFFSET'").value, 10);
        }

        return { type: 'Rows', variableName, tableRef, where, orderBy, limit, offset, line };
    }

    private parseCountStatement(line: number): CountStatement {
        this.consume(TokenType.NUMBER, "Expected 'NUMBER'");
        const variableName = this.consume(TokenType.IDENTIFIER, "Expected variable name").value;
        this.consume(TokenType.EQUALS_SIGN, "Expected '='");  // NUMBER count = COUNT — always uses =
        this.consume(TokenType.COUNT, "Expected 'COUNT'");

        // Parse table reference
        const tableRef = this.parseSimpleTableReference();

        // Optional WHERE clause
        let where: DataCondition | undefined;
        if (this.match(TokenType.WHERE)) {
            where = this.parseDataCondition();
        }

        return { type: 'Count', variableName, tableRef, where, line };
    }

    private parseSimpleTableReference(): SimpleTableReference {
        const first = this.consume(TokenType.IDENTIFIER, "Expected table name").value;

        // Check for cross-project reference: ProjectName.TableName
        if (this.check(TokenType.DOT) && this.lookahead(1)?.type === TokenType.IDENTIFIER) {
            this.advance();
            const tableName = this.consume(TokenType.IDENTIFIER, "Expected table name after '.'").value;
            return { type: 'SimpleTableReference', tableName, projectName: first };
        }

        return { type: 'SimpleTableReference', tableName: first };
    }

    private parseOrderByClause(): OrderByClause[] {
        this.consume(TokenType.BY, "Expected 'BY' after 'ORDER'");

        const clauses: OrderByClause[] = [];

        do {
            const column = this.consumeColumnName();
            let direction: 'ASC' | 'DESC' = 'ASC'; // default to ASC

            if (this.match(TokenType.ASC)) {
                direction = 'ASC';
            } else if (this.match(TokenType.DESC)) {
                direction = 'DESC';
            }

            clauses.push({ column, direction });
        } while (this.match(TokenType.COMMA));

        return clauses;
    }

    private parseDataCondition(): DataCondition {
        return this.parseOrCondition();
    }

    private parseOrCondition(): DataCondition {
        let left = this.parseAndCondition();

        while (this.match(TokenType.OR)) {
            const right = this.parseAndCondition();
            left = { type: 'Or', left, right } as OrCondition;
        }

        return left;
    }

    private parseAndCondition(): DataCondition {
        let left = this.parseNotCondition();

        while (this.match(TokenType.AND)) {
            const right = this.parseNotCondition();
            left = { type: 'And', left, right } as AndCondition;
        }

        return left;
    }

    private parseNotCondition(): DataCondition {
        if (this.match(TokenType.NOT)) {
            const condition = this.parseNotCondition();
            return { type: 'Not', condition } as NotCondition;
        }

        return this.parsePrimaryCondition();
    }

    private parsePrimaryCondition(): DataCondition {
        // Parenthesized condition
        if (this.match(TokenType.LPAREN)) {
            const condition = this.parseDataCondition();
            this.consume(TokenType.RPAREN, "Expected ')'");
            return condition;
        }

        // Simple comparison: column operator value
        const column = this.consumeColumnName();

        // Check for IN operator
        if (this.match(TokenType.IN)) {
            this.consume(TokenType.LBRACKET, "Expected '['");
            const values: ExpressionNode[] = [];
            values.push(this.parseExpression());
            while (this.match(TokenType.COMMA)) {
                values.push(this.parseExpression());
            }
            this.consume(TokenType.RBRACKET, "Expected ']'");
            return { type: 'Comparison', column, operator: 'IN', values } as DataComparison;
        }

        // Check for NOT IN operator (handled separately since NOT is consumed in parseNotCondition)
        // This case handles: column NOT IN [...]
        // The NOT before column is handled by parseNotCondition

        // Check for IS (EMPTY/NULL)
        if (this.match(TokenType.IS)) {
            if (this.match(TokenType.NOT)) {
                if (this.match(TokenType.EMPTY)) {
                    return { type: 'Comparison', column, operator: 'IS_NOT_EMPTY' } as DataComparison;
                }
            }
            if (this.match(TokenType.EMPTY)) {
                return { type: 'Comparison', column, operator: 'IS_EMPTY' } as DataComparison;
            }
            if (this.match(TokenType.NULL)) {
                return { type: 'Comparison', column, operator: 'IS_NULL' } as DataComparison;
            }
            this.error("Expected 'EMPTY' or 'NULL' after 'IS'");
        }

        // Check for text operators: CONTAINS, STARTS WITH, ENDS WITH, MATCHES
        if (this.match(TokenType.CONTAINS)) {
            const value = this.parseExpression();
            return { type: 'Comparison', column, operator: 'CONTAINS' as TextOperator, value } as DataComparison;
        }

        if (this.match(TokenType.STARTS)) {
            this.consume(TokenType.WITH, "Expected 'WITH' after 'STARTS'");
            const value = this.parseExpression();
            return { type: 'Comparison', column, operator: 'STARTS_WITH' as TextOperator, value } as DataComparison;
        }

        if (this.match(TokenType.ENDS)) {
            this.consume(TokenType.WITH, "Expected 'WITH' after 'ENDS'");
            const value = this.parseExpression();
            return { type: 'Comparison', column, operator: 'ENDS_WITH' as TextOperator, value } as DataComparison;
        }

        if (this.match(TokenType.MATCHES)) {
            const value = this.parseExpression();
            return { type: 'Comparison', column, operator: 'MATCHES' as TextOperator, value } as DataComparison;
        }

        // Comparison operators: =, !=, >, <, >=, <=
        let operator: ComparisonOperator;
        if (this.match(TokenType.EQUALS_SIGN)) {
            operator = '==';
        } else if (this.check(TokenType.IDENTIFIER) && this.isComparisonOperatorValue()) {
            operator = this.advance().value as ComparisonOperator;
        } else {
            this.error("Expected comparison operator");
            operator = '==';
        }

        const value = this.parseExpression();
        return { type: 'Comparison', column, operator, value } as DataComparison;
    }

    private isVerifyTargetScreenshotAssertion(): boolean {
        if (this.check(TokenType.STRING)) {
            return this.lookahead(1)?.type === TokenType.MATCHES
                && this.lookahead(2)?.type === TokenType.SCREENSHOT;
        }

        if (!this.check(TokenType.IDENTIFIER)) {
            return false;
        }

        const second = this.lookahead(1);
        if (!second) {
            return false;
        }

        if (second.type === TokenType.MATCHES) {
            return this.lookahead(2)?.type === TokenType.SCREENSHOT;
        }

        if (second.type === TokenType.DOT) {
            return this.lookahead(3)?.type === TokenType.MATCHES
                && this.lookahead(4)?.type === TokenType.SCREENSHOT;
        }

        return false;
    }

    private parseVerifyScreenshotTail(): Pick<VerifyScreenshotStatement, 'name' | 'options'> {
        let name: string | undefined;
        let options: VerifyScreenshotOptions | undefined;

        let advanced = true;
        while (advanced) {
            advanced = false;

            if (this.match(TokenType.AS)) {
                name = this.consume(TokenType.STRING, "Expected screenshot name after 'AS'").value;
                advanced = true;
            }

            if (this.match(TokenType.WITH)) {
                options = this.parseVerifyScreenshotOptions();
                advanced = true;
            }
        }

        return { name, options };
    }

    private parseVerifyScreenshotOptions(): VerifyScreenshotOptions {
        const options: VerifyScreenshotOptions = {};

        while (!this.isAtEnd()) {
            if (this.match(TokenType.STRICT)) {
                options.preset = 'STRICT';
            } else if (this.match(TokenType.BALANCED)) {
                options.preset = 'BALANCED';
            } else if (this.match(TokenType.RELAXED)) {
                options.preset = 'RELAXED';
            } else if (this.match(TokenType.THRESHOLD)) {
                const value = parseFloat(this.consume(TokenType.NUMBER_LITERAL, "Expected number after 'THRESHOLD'").value);
                options.threshold = value;
            } else if (this.match(TokenType.MAX_DIFF_PIXELS)) {
                const value = parseFloat(this.consume(TokenType.NUMBER_LITERAL, "Expected number after 'MAX_DIFF_PIXELS'").value);
                options.maxDiffPixels = value;
            } else if (this.match(TokenType.MAX_DIFF_RATIO)) {
                const value = parseFloat(this.consume(TokenType.NUMBER_LITERAL, "Expected number after 'MAX_DIFF_RATIO'").value);
                options.maxDiffPixelRatio = value;
            } else {
                break;
            }

            if (this.match(TokenType.COMMA) || this.match(TokenType.AND)) {
                continue;
            }

            if (this.check(TokenType.AS) || this.check(TokenType.WITH)) {
                break;
            }
        }

        if (!options.preset &&
            options.threshold === undefined &&
            options.maxDiffPixels === undefined &&
            options.maxDiffPixelRatio === undefined) {
            this.error("Expected screenshot option after 'WITH'");
        }

        return options;
    }

    private parseVerifyCondition(): VerifyCondition {
        this.consume(TokenType.IS, "Expected 'IS'");
        const negated = this.match(TokenType.NOT);

        const stateTokens: TokenType[] = [
            TokenType.VISIBLE,
            TokenType.HIDDEN,
            TokenType.ENABLED,
            TokenType.DISABLED,
            TokenType.CHECKED,
            TokenType.FOCUSED,
            TokenType.EMPTY,
        ];

        for (const tokenType of stateTokens) {
            if (this.match(tokenType)) {
                return {
                    type: 'Condition',
                    operator: negated ? 'IS_NOT' : 'IS',
                    value: tokenType as 'VISIBLE' | 'HIDDEN' | 'ENABLED' | 'DISABLED' | 'CHECKED' | 'FOCUSED' | 'EMPTY'
                };
            }
        }

        this.error("Expected condition");
        return { type: 'Condition', operator: 'IS', value: 'VISIBLE' };
    }

    private parseUrlCondition(): 'contains' | 'equals' | 'matches' {
        if (this.match(TokenType.CONTAINS)) return 'contains';
        if (this.match(TokenType.EQUAL)) return 'equals';
        if (this.match(TokenType.MATCHES)) return 'matches';

        this.error("Expected 'CONTAINS', 'EQUALS', or 'MATCHES'");
        return 'contains';
    }

    private parseTitleCondition(): 'contains' | 'equals' {
        if (this.match(TokenType.CONTAINS)) return 'contains';
        if (this.match(TokenType.EQUAL) || this.match(TokenType.IS)) return 'equals';

        this.error("Expected 'CONTAINS', 'EQUALS', or 'IS'");
        return 'contains';
    }

    private parseHasCondition(): HasCondition {
        if (this.match(TokenType.COUNT)) {
            return { type: 'HasCount', count: this.parseExpression() };
        }
        if (this.match(TokenType.VALUE)) {
            return { type: 'HasValue', value: this.parseExpression() };
        }
        if (this.match(TokenType.ATTRIBUTE)) {
            const attribute = this.parseExpression();
            this.consume(TokenType.EQUAL, "Expected 'EQUAL'");
            return { type: 'HasAttribute', attribute, value: this.parseExpression() };
        }
        if (this.match(TokenType.TEXT)) {
            return { type: 'HasText', text: this.parseExpression() };
        }
        if (this.match(TokenType.CLASS)) {
            return { type: 'HasClass', className: this.parseExpression() };
        }

        this.error("Expected 'COUNT', 'VALUE', 'ATTRIBUTE', 'TEXT', or 'CLASS'");
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

        // Check if this is a selector keyword (BUTTON, TEXTBOX, etc.) followed by a string.
        // Selector keywords are identifiers, so we must check before the generic identifier branch.
        if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.TEXT) || this.check(TokenType.TITLE)) {
            const selectorType = Parser.SELECTOR_KEYWORD_MAP.get(this.peek().value.toUpperCase());
            if (selectorType !== undefined && this.lookahead(1)?.type === TokenType.STRING) {
                const selector = this.parseSelector();
                return { type: 'Target', selector };
            }
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

    // Parse Page.field target only (no direct strings allowed)
    private parsePageFieldTarget(): TargetNode {
        if (!this.check(TokenType.IDENTIFIER)) {
            this.error("Expected Page.field reference (e.g., LoginPage.submitButton)");
            return { type: 'Target', field: 'unknown' };
        }

        const first = this.advance().value;
        if (this.match(TokenType.DOT)) {
            const field = this.consume(TokenType.IDENTIFIER, "Expected field name after '.'").value;
            return { type: 'Target', page: first, field };
        }

        // Just a field name without page prefix is allowed
        return { type: 'Target', field: first };
    }

    // Parse coordinate target: x=100 y=200
    private parseCoordinateTarget(): CoordinateTarget {
        // Expect: x=NUMBER y=NUMBER
        this.consume(TokenType.IDENTIFIER, "Expected 'x'"); // consume 'x'
        this.consume(TokenType.EQUALS_SIGN, "Expected '='");
        const x = parseFloat(this.consume(TokenType.NUMBER_LITERAL, "Expected x coordinate").value);

        this.consume(TokenType.IDENTIFIER, "Expected 'y'"); // consume 'y'
        this.consume(TokenType.EQUALS_SIGN, "Expected '='");
        const y = parseFloat(this.consume(TokenType.NUMBER_LITERAL, "Expected y coordinate").value);

        return { type: 'Coordinate', x, y };
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
        if (this.check(TokenType.ENV_VAR_REF)) {
            return { type: 'EnvVarReference', name: this.advance().value };
        }
        // Check for IDENTIFIER or keywords that can be used as variable names
        if (this.check(TokenType.IDENTIFIER) || this.isKeywordUsableAsVariable()) {
            const first = this.advance().value;
            if (this.match(TokenType.DOT)) {
                return {
                    type: 'VariableReference',
                    page: first,
                    name: this.consumeIdentifierOrKeyword("Expected variable name")
                };
            }
            return { type: 'VariableReference', name: first };
        }

        this.error("Expected expression");
        return { type: 'StringLiteral', value: '' };
    }

    // Check if current token is a keyword that can be used as a variable name
    private isKeywordUsableAsVariable(): boolean {
        return this.check(TokenType.VALUE) ||
               this.check(TokenType.TEXT) ||
               this.check(TokenType.NUMBER) ||
               this.check(TokenType.FLAG) ||
               this.check(TokenType.LIST);
    }

    // ==================== HELPER METHODS ====================

    /** Accept either `=` or `FROM` for ROW/ROWS table assignment. */
    private consumeAssignmentOrFrom(): void {
        if (this.match(TokenType.FROM) || this.match(TokenType.EQUALS_SIGN)) {
            return;
        }
        this.error("Expected '=' or 'FROM'");
    }

    private isVariableType(): boolean {
        return VARIABLE_TYPES.has(this.peek().type);
    }

    private static readonly COMPARISON_OPERATORS = new Set(['!=', '>', '<', '>=', '<=']);

    private isComparisonOperatorValue(): boolean {
        return Parser.COMPARISON_OPERATORS.has(this.peek().value);
    }

    private isAtEnd(): boolean {
        return this.peek().type === TokenType.EOF;
    }

    private peek(): Token {
        return this.tokens[this.pos];
    }

    private previous(): Token {
        return this.tokens[this.pos - 1];
    }

    private lookahead(n: number): Token | undefined {
        return this.tokens[this.pos + n];
    }

    // Check if current IDENTIFIER is followed by DOT (Page.field pattern)
    private checkVariableIsPageField(): boolean {
        const nextToken = this.lookahead(1);
        return nextToken?.type === TokenType.DOT;
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
        // Accept IDENTIFIER or common keywords that might be used as dependency/parameter names
        if (this.check(TokenType.IDENTIFIER) ||
            this.check(TokenType.PAGE) ||
            this.check(TokenType.FEATURE) ||
            this.check(TokenType.TEXT) ||
            this.check(TokenType.NUMBER) ||
            this.check(TokenType.FLAG) ||
            this.check(TokenType.LIST) ||
            this.check(TokenType.TEST) ||
            this.check(TokenType.VALUE)) {
            return this.advance().value;
        }
        this.error(message);
        return '';
    }

    /**
     * Tokens that are structurally significant in WHERE / ORDER BY clauses
     * and therefore cannot be used as column names.
     */
    private static readonly DATA_CLAUSE_RESERVED = new Set<TokenType>([
        // Clause structure
        TokenType.WHERE, TokenType.ORDER, TokenType.BY,
        TokenType.LIMIT, TokenType.OFFSET,
        TokenType.ASC, TokenType.DESC,
        // Logical operators
        TokenType.AND, TokenType.OR, TokenType.NOT,
        // Comparison / filter operators
        TokenType.IN, TokenType.IS, TokenType.CONTAINS,
        TokenType.STARTS, TokenType.ENDS, TokenType.MATCHES,
        TokenType.EQUALS_SIGN,
        // Literals & values that should not be column names
        TokenType.TRUE, TokenType.FALSE, TokenType.NULL,
        TokenType.EMPTY,
        TokenType.STRING, TokenType.NUMBER_LITERAL,
        // Grouping
        TokenType.LPAREN, TokenType.RPAREN,
        TokenType.LBRACKET, TokenType.RBRACKET,
        TokenType.COMMA,
        // End-of-file
        TokenType.EOF,
    ]);

    /**
     * Consume a column name in data-query context (WHERE conditions, ORDER BY).
     * Accepts IDENTIFIER or any keyword token that is NOT structurally reserved
     * in WHERE / ORDER BY clauses. This allows database column names like
     * "status", "name", "value", etc. that happen to collide with Vero keywords.
     */
    private consumeColumnName(): string {
        const token = this.peek();
        if (token.type === TokenType.IDENTIFIER ||
            (!Parser.DATA_CLAUSE_RESERVED.has(token.type) && token.type !== TokenType.EOF)) {
            return this.advance().value;
        }
        this.error("Expected column name");
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
