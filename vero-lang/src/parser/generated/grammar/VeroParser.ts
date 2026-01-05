// Generated from grammar/Vero.g4 by ANTLR 4.13.1

import * as antlr from "antlr4ng";
import { Token } from "antlr4ng";

import { VeroListener } from "./VeroListener.js";
import { VeroVisitor } from "./VeroVisitor.js";

// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;


export class VeroParser extends antlr.Parser {
    public static readonly PAGE = 1;
    public static readonly FEATURE = 2;
    public static readonly SCENARIO = 3;
    public static readonly FIELD = 4;
    public static readonly USE = 5;
    public static readonly BEFORE = 6;
    public static readonly AFTER = 7;
    public static readonly EACH = 8;
    public static readonly ALL = 9;
    public static readonly WITH = 10;
    public static readonly FROM = 11;
    public static readonly TO = 12;
    public static readonly IN = 13;
    public static readonly RETURNS = 14;
    public static readonly RETURN = 15;
    public static readonly IF = 16;
    public static readonly ELSE = 17;
    public static readonly REPEAT = 18;
    public static readonly TIMES = 19;
    public static readonly CLICK = 20;
    public static readonly FILL = 21;
    public static readonly OPEN = 22;
    public static readonly CHECK = 23;
    public static readonly UNCHECK = 24;
    public static readonly SELECT = 25;
    public static readonly HOVER = 26;
    public static readonly PRESS = 27;
    public static readonly SCROLL = 28;
    public static readonly WAIT = 29;
    public static readonly DO = 30;
    public static readonly REFRESH = 31;
    public static readonly CLEAR = 32;
    public static readonly TAKE = 33;
    public static readonly SCREENSHOT = 34;
    public static readonly LOG = 35;
    public static readonly FOR = 36;
    public static readonly VERIFY = 37;
    public static readonly IS = 38;
    public static readonly ISNOT = 39;
    public static readonly VISIBLE = 40;
    public static readonly HIDDEN_STATE = 41;
    public static readonly ENABLED = 42;
    public static readonly DISABLED = 43;
    public static readonly CHECKED = 44;
    public static readonly EMPTY = 45;
    public static readonly CONTAINS = 46;
    public static readonly NOT = 47;
    public static readonly TEXT = 48;
    public static readonly NUMBER = 49;
    public static readonly FLAG = 50;
    public static readonly LIST = 51;
    public static readonly SECONDS = 52;
    public static readonly MILLISECONDS = 53;
    public static readonly UP = 54;
    public static readonly DOWN = 55;
    public static readonly LEFT = 56;
    public static readonly RIGHT = 57;
    public static readonly LBRACE = 58;
    public static readonly RBRACE = 59;
    public static readonly LPAREN = 60;
    public static readonly RPAREN = 61;
    public static readonly LBRACK = 62;
    public static readonly RBRACK = 63;
    public static readonly COMMA = 64;
    public static readonly DOT = 65;
    public static readonly EQUALS = 66;
    public static readonly AT = 67;
    public static readonly GT = 68;
    public static readonly LT = 69;
    public static readonly GTE = 70;
    public static readonly LTE = 71;
    public static readonly EQEQ = 72;
    public static readonly NEQ = 73;
    public static readonly STRING_LITERAL = 74;
    public static readonly NUMBER_LITERAL = 75;
    public static readonly IDENTIFIER = 76;
    public static readonly COMMENT = 77;
    public static readonly WS = 78;
    public static readonly RULE_program = 0;
    public static readonly RULE_declaration = 1;
    public static readonly RULE_pageDeclaration = 2;
    public static readonly RULE_pageBody = 3;
    public static readonly RULE_pageMember = 4;
    public static readonly RULE_fieldDeclaration = 5;
    public static readonly RULE_actionDeclaration = 6;
    public static readonly RULE_parameterList = 7;
    public static readonly RULE_featureDeclaration = 8;
    public static readonly RULE_featureBody = 9;
    public static readonly RULE_featureMember = 10;
    public static readonly RULE_useStatement = 11;
    public static readonly RULE_hookDeclaration = 12;
    public static readonly RULE_scenarioDeclaration = 13;
    public static readonly RULE_tag = 14;
    public static readonly RULE_statement = 15;
    public static readonly RULE_actionStatement = 16;
    public static readonly RULE_clickAction = 17;
    public static readonly RULE_fillAction = 18;
    public static readonly RULE_openAction = 19;
    public static readonly RULE_checkAction = 20;
    public static readonly RULE_uncheckAction = 21;
    public static readonly RULE_selectAction = 22;
    public static readonly RULE_hoverAction = 23;
    public static readonly RULE_pressAction = 24;
    public static readonly RULE_scrollAction = 25;
    public static readonly RULE_direction = 26;
    public static readonly RULE_waitAction = 27;
    public static readonly RULE_doAction = 28;
    public static readonly RULE_refreshAction = 29;
    public static readonly RULE_clearAction = 30;
    public static readonly RULE_screenshotAction = 31;
    public static readonly RULE_logAction = 32;
    public static readonly RULE_assertionStatement = 33;
    public static readonly RULE_selectorOrText = 34;
    public static readonly RULE_condition = 35;
    public static readonly RULE_containsCondition = 36;
    public static readonly RULE_controlFlowStatement = 37;
    public static readonly RULE_ifStatement = 38;
    public static readonly RULE_repeatStatement = 39;
    public static readonly RULE_booleanExpression = 40;
    public static readonly RULE_comparisonOperator = 41;
    public static readonly RULE_variableDeclaration = 42;
    public static readonly RULE_variableType = 43;
    public static readonly RULE_returnStatement = 44;
    public static readonly RULE_expression = 45;
    public static readonly RULE_selectorExpression = 46;
    public static readonly RULE_pageMethodReference = 47;
    public static readonly RULE_pageFieldReference = 48;
    public static readonly RULE_argumentList = 49;

    public static readonly literalNames = [
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, "'{'", "'}'", "'('", "')'", "'['", "']'", "','", 
        "'.'", "'='", "'@'", "'>'", "'<'", "'>='", "'<='", "'=='", "'!='"
    ];

    public static readonly symbolicNames = [
        null, "PAGE", "FEATURE", "SCENARIO", "FIELD", "USE", "BEFORE", "AFTER", 
        "EACH", "ALL", "WITH", "FROM", "TO", "IN", "RETURNS", "RETURN", 
        "IF", "ELSE", "REPEAT", "TIMES", "CLICK", "FILL", "OPEN", "CHECK", 
        "UNCHECK", "SELECT", "HOVER", "PRESS", "SCROLL", "WAIT", "DO", "REFRESH", 
        "CLEAR", "TAKE", "SCREENSHOT", "LOG", "FOR", "VERIFY", "IS", "ISNOT", 
        "VISIBLE", "HIDDEN_STATE", "ENABLED", "DISABLED", "CHECKED", "EMPTY", 
        "CONTAINS", "NOT", "TEXT", "NUMBER", "FLAG", "LIST", "SECONDS", 
        "MILLISECONDS", "UP", "DOWN", "LEFT", "RIGHT", "LBRACE", "RBRACE", 
        "LPAREN", "RPAREN", "LBRACK", "RBRACK", "COMMA", "DOT", "EQUALS", 
        "AT", "GT", "LT", "GTE", "LTE", "EQEQ", "NEQ", "STRING_LITERAL", 
        "NUMBER_LITERAL", "IDENTIFIER", "COMMENT", "WS"
    ];
    public static readonly ruleNames = [
        "program", "declaration", "pageDeclaration", "pageBody", "pageMember", 
        "fieldDeclaration", "actionDeclaration", "parameterList", "featureDeclaration", 
        "featureBody", "featureMember", "useStatement", "hookDeclaration", 
        "scenarioDeclaration", "tag", "statement", "actionStatement", "clickAction", 
        "fillAction", "openAction", "checkAction", "uncheckAction", "selectAction", 
        "hoverAction", "pressAction", "scrollAction", "direction", "waitAction", 
        "doAction", "refreshAction", "clearAction", "screenshotAction", 
        "logAction", "assertionStatement", "selectorOrText", "condition", 
        "containsCondition", "controlFlowStatement", "ifStatement", "repeatStatement", 
        "booleanExpression", "comparisonOperator", "variableDeclaration", 
        "variableType", "returnStatement", "expression", "selectorExpression", 
        "pageMethodReference", "pageFieldReference", "argumentList",
    ];

    public get grammarFileName(): string { return "Vero.g4"; }
    public get literalNames(): (string | null)[] { return VeroParser.literalNames; }
    public get symbolicNames(): (string | null)[] { return VeroParser.symbolicNames; }
    public get ruleNames(): string[] { return VeroParser.ruleNames; }
    public get serializedATN(): number[] { return VeroParser._serializedATN; }

    protected createFailedPredicateException(predicate?: string, message?: string): antlr.FailedPredicateException {
        return new antlr.FailedPredicateException(this, predicate, message);
    }

    public constructor(input: antlr.TokenStream) {
        super(input);
        this.interpreter = new antlr.ParserATNSimulator(this, VeroParser._ATN, VeroParser.decisionsToDFA, new antlr.PredictionContextCache());
    }
    public program(): ProgramContext {
        let localContext = new ProgramContext(this.context, this.state);
        this.enterRule(localContext, 0, VeroParser.RULE_program);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 103;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 1 || _la === 2) {
                {
                {
                this.state = 100;
                this.declaration();
                }
                }
                this.state = 105;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 106;
            this.match(VeroParser.EOF);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public declaration(): DeclarationContext {
        let localContext = new DeclarationContext(this.context, this.state);
        this.enterRule(localContext, 2, VeroParser.RULE_declaration);
        try {
            this.state = 110;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.PAGE:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 108;
                this.pageDeclaration();
                }
                break;
            case VeroParser.FEATURE:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 109;
                this.featureDeclaration();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public pageDeclaration(): PageDeclarationContext {
        let localContext = new PageDeclarationContext(this.context, this.state);
        this.enterRule(localContext, 4, VeroParser.RULE_pageDeclaration);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 112;
            this.match(VeroParser.PAGE);
            this.state = 113;
            this.match(VeroParser.IDENTIFIER);
            this.state = 114;
            this.match(VeroParser.LBRACE);
            this.state = 115;
            this.pageBody();
            this.state = 116;
            this.match(VeroParser.RBRACE);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public pageBody(): PageBodyContext {
        let localContext = new PageBodyContext(this.context, this.state);
        this.enterRule(localContext, 6, VeroParser.RULE_pageBody);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 121;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 4 || _la === 76) {
                {
                {
                this.state = 118;
                this.pageMember();
                }
                }
                this.state = 123;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public pageMember(): PageMemberContext {
        let localContext = new PageMemberContext(this.context, this.state);
        this.enterRule(localContext, 8, VeroParser.RULE_pageMember);
        try {
            this.state = 126;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.FIELD:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 124;
                this.fieldDeclaration();
                }
                break;
            case VeroParser.IDENTIFIER:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 125;
                this.actionDeclaration();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public fieldDeclaration(): FieldDeclarationContext {
        let localContext = new FieldDeclarationContext(this.context, this.state);
        this.enterRule(localContext, 10, VeroParser.RULE_fieldDeclaration);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 128;
            this.match(VeroParser.FIELD);
            this.state = 129;
            this.match(VeroParser.IDENTIFIER);
            this.state = 130;
            this.match(VeroParser.EQUALS);
            this.state = 131;
            this.match(VeroParser.STRING_LITERAL);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public actionDeclaration(): ActionDeclarationContext {
        let localContext = new ActionDeclarationContext(this.context, this.state);
        this.enterRule(localContext, 12, VeroParser.RULE_actionDeclaration);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 133;
            this.match(VeroParser.IDENTIFIER);
            this.state = 136;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 10) {
                {
                this.state = 134;
                this.match(VeroParser.WITH);
                this.state = 135;
                this.parameterList();
                }
            }

            this.state = 138;
            this.match(VeroParser.LBRACE);
            this.state = 142;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 4294279168) !== 0) || ((((_la - 32)) & ~0x1F) === 0 && ((1 << (_la - 32)) & 983083) !== 0)) {
                {
                {
                this.state = 139;
                this.statement();
                }
                }
                this.state = 144;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 145;
            this.match(VeroParser.RBRACE);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public parameterList(): ParameterListContext {
        let localContext = new ParameterListContext(this.context, this.state);
        this.enterRule(localContext, 14, VeroParser.RULE_parameterList);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 147;
            this.match(VeroParser.IDENTIFIER);
            this.state = 152;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 64) {
                {
                {
                this.state = 148;
                this.match(VeroParser.COMMA);
                this.state = 149;
                this.match(VeroParser.IDENTIFIER);
                }
                }
                this.state = 154;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public featureDeclaration(): FeatureDeclarationContext {
        let localContext = new FeatureDeclarationContext(this.context, this.state);
        this.enterRule(localContext, 16, VeroParser.RULE_featureDeclaration);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 155;
            this.match(VeroParser.FEATURE);
            this.state = 156;
            this.match(VeroParser.IDENTIFIER);
            this.state = 157;
            this.match(VeroParser.LBRACE);
            this.state = 158;
            this.featureBody();
            this.state = 159;
            this.match(VeroParser.RBRACE);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public featureBody(): FeatureBodyContext {
        let localContext = new FeatureBodyContext(this.context, this.state);
        this.enterRule(localContext, 18, VeroParser.RULE_featureBody);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 164;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 232) !== 0)) {
                {
                {
                this.state = 161;
                this.featureMember();
                }
                }
                this.state = 166;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public featureMember(): FeatureMemberContext {
        let localContext = new FeatureMemberContext(this.context, this.state);
        this.enterRule(localContext, 20, VeroParser.RULE_featureMember);
        try {
            this.state = 170;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.USE:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 167;
                this.useStatement();
                }
                break;
            case VeroParser.BEFORE:
            case VeroParser.AFTER:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 168;
                this.hookDeclaration();
                }
                break;
            case VeroParser.SCENARIO:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 169;
                this.scenarioDeclaration();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public useStatement(): UseStatementContext {
        let localContext = new UseStatementContext(this.context, this.state);
        this.enterRule(localContext, 22, VeroParser.RULE_useStatement);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 172;
            this.match(VeroParser.USE);
            this.state = 173;
            this.match(VeroParser.IDENTIFIER);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public hookDeclaration(): HookDeclarationContext {
        let localContext = new HookDeclarationContext(this.context, this.state);
        this.enterRule(localContext, 24, VeroParser.RULE_hookDeclaration);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 175;
            _la = this.tokenStream.LA(1);
            if(!(_la === 6 || _la === 7)) {
            this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            this.state = 176;
            _la = this.tokenStream.LA(1);
            if(!(_la === 8 || _la === 9)) {
            this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            this.state = 177;
            this.match(VeroParser.LBRACE);
            this.state = 181;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 4294279168) !== 0) || ((((_la - 32)) & ~0x1F) === 0 && ((1 << (_la - 32)) & 983083) !== 0)) {
                {
                {
                this.state = 178;
                this.statement();
                }
                }
                this.state = 183;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 184;
            this.match(VeroParser.RBRACE);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public scenarioDeclaration(): ScenarioDeclarationContext {
        let localContext = new ScenarioDeclarationContext(this.context, this.state);
        this.enterRule(localContext, 26, VeroParser.RULE_scenarioDeclaration);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 186;
            this.match(VeroParser.SCENARIO);
            this.state = 187;
            this.match(VeroParser.STRING_LITERAL);
            this.state = 191;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 67) {
                {
                {
                this.state = 188;
                this.tag();
                }
                }
                this.state = 193;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 194;
            this.match(VeroParser.LBRACE);
            this.state = 198;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 4294279168) !== 0) || ((((_la - 32)) & ~0x1F) === 0 && ((1 << (_la - 32)) & 983083) !== 0)) {
                {
                {
                this.state = 195;
                this.statement();
                }
                }
                this.state = 200;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 201;
            this.match(VeroParser.RBRACE);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public tag(): TagContext {
        let localContext = new TagContext(this.context, this.state);
        this.enterRule(localContext, 28, VeroParser.RULE_tag);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 203;
            this.match(VeroParser.AT);
            this.state = 204;
            this.match(VeroParser.IDENTIFIER);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public statement(): StatementContext {
        let localContext = new StatementContext(this.context, this.state);
        this.enterRule(localContext, 30, VeroParser.RULE_statement);
        try {
            this.state = 211;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.CLICK:
            case VeroParser.FILL:
            case VeroParser.OPEN:
            case VeroParser.CHECK:
            case VeroParser.UNCHECK:
            case VeroParser.SELECT:
            case VeroParser.HOVER:
            case VeroParser.PRESS:
            case VeroParser.SCROLL:
            case VeroParser.WAIT:
            case VeroParser.DO:
            case VeroParser.REFRESH:
            case VeroParser.CLEAR:
            case VeroParser.TAKE:
            case VeroParser.LOG:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 206;
                this.actionStatement();
                }
                break;
            case VeroParser.VERIFY:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 207;
                this.assertionStatement();
                }
                break;
            case VeroParser.IF:
            case VeroParser.REPEAT:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 208;
                this.controlFlowStatement();
                }
                break;
            case VeroParser.TEXT:
            case VeroParser.NUMBER:
            case VeroParser.FLAG:
            case VeroParser.LIST:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 209;
                this.variableDeclaration();
                }
                break;
            case VeroParser.RETURN:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 210;
                this.returnStatement();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public actionStatement(): ActionStatementContext {
        let localContext = new ActionStatementContext(this.context, this.state);
        this.enterRule(localContext, 32, VeroParser.RULE_actionStatement);
        try {
            this.state = 228;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.CLICK:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 213;
                this.clickAction();
                }
                break;
            case VeroParser.FILL:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 214;
                this.fillAction();
                }
                break;
            case VeroParser.OPEN:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 215;
                this.openAction();
                }
                break;
            case VeroParser.CHECK:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 216;
                this.checkAction();
                }
                break;
            case VeroParser.UNCHECK:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 217;
                this.uncheckAction();
                }
                break;
            case VeroParser.SELECT:
                this.enterOuterAlt(localContext, 6);
                {
                this.state = 218;
                this.selectAction();
                }
                break;
            case VeroParser.HOVER:
                this.enterOuterAlt(localContext, 7);
                {
                this.state = 219;
                this.hoverAction();
                }
                break;
            case VeroParser.PRESS:
                this.enterOuterAlt(localContext, 8);
                {
                this.state = 220;
                this.pressAction();
                }
                break;
            case VeroParser.SCROLL:
                this.enterOuterAlt(localContext, 9);
                {
                this.state = 221;
                this.scrollAction();
                }
                break;
            case VeroParser.WAIT:
                this.enterOuterAlt(localContext, 10);
                {
                this.state = 222;
                this.waitAction();
                }
                break;
            case VeroParser.DO:
                this.enterOuterAlt(localContext, 11);
                {
                this.state = 223;
                this.doAction();
                }
                break;
            case VeroParser.REFRESH:
                this.enterOuterAlt(localContext, 12);
                {
                this.state = 224;
                this.refreshAction();
                }
                break;
            case VeroParser.CLEAR:
                this.enterOuterAlt(localContext, 13);
                {
                this.state = 225;
                this.clearAction();
                }
                break;
            case VeroParser.TAKE:
                this.enterOuterAlt(localContext, 14);
                {
                this.state = 226;
                this.screenshotAction();
                }
                break;
            case VeroParser.LOG:
                this.enterOuterAlt(localContext, 15);
                {
                this.state = 227;
                this.logAction();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public clickAction(): ClickActionContext {
        let localContext = new ClickActionContext(this.context, this.state);
        this.enterRule(localContext, 34, VeroParser.RULE_clickAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 230;
            this.match(VeroParser.CLICK);
            this.state = 231;
            this.selectorExpression();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public fillAction(): FillActionContext {
        let localContext = new FillActionContext(this.context, this.state);
        this.enterRule(localContext, 36, VeroParser.RULE_fillAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 233;
            this.match(VeroParser.FILL);
            this.state = 234;
            this.selectorExpression();
            this.state = 235;
            this.match(VeroParser.WITH);
            this.state = 236;
            this.expression();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public openAction(): OpenActionContext {
        let localContext = new OpenActionContext(this.context, this.state);
        this.enterRule(localContext, 38, VeroParser.RULE_openAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 238;
            this.match(VeroParser.OPEN);
            this.state = 239;
            this.expression();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public checkAction(): CheckActionContext {
        let localContext = new CheckActionContext(this.context, this.state);
        this.enterRule(localContext, 40, VeroParser.RULE_checkAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 241;
            this.match(VeroParser.CHECK);
            this.state = 242;
            this.selectorExpression();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public uncheckAction(): UncheckActionContext {
        let localContext = new UncheckActionContext(this.context, this.state);
        this.enterRule(localContext, 42, VeroParser.RULE_uncheckAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 244;
            this.match(VeroParser.UNCHECK);
            this.state = 245;
            this.selectorExpression();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public selectAction(): SelectActionContext {
        let localContext = new SelectActionContext(this.context, this.state);
        this.enterRule(localContext, 44, VeroParser.RULE_selectAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 247;
            this.match(VeroParser.SELECT);
            this.state = 248;
            this.expression();
            this.state = 249;
            this.match(VeroParser.FROM);
            this.state = 250;
            this.selectorExpression();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public hoverAction(): HoverActionContext {
        let localContext = new HoverActionContext(this.context, this.state);
        this.enterRule(localContext, 46, VeroParser.RULE_hoverAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 252;
            this.match(VeroParser.HOVER);
            this.state = 253;
            this.selectorExpression();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public pressAction(): PressActionContext {
        let localContext = new PressActionContext(this.context, this.state);
        this.enterRule(localContext, 48, VeroParser.RULE_pressAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 255;
            this.match(VeroParser.PRESS);
            this.state = 256;
            this.expression();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public scrollAction(): ScrollActionContext {
        let localContext = new ScrollActionContext(this.context, this.state);
        this.enterRule(localContext, 50, VeroParser.RULE_scrollAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 258;
            this.match(VeroParser.SCROLL);
            this.state = 262;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.TO:
                {
                this.state = 259;
                this.match(VeroParser.TO);
                this.state = 260;
                this.selectorExpression();
                }
                break;
            case VeroParser.UP:
            case VeroParser.DOWN:
            case VeroParser.LEFT:
            case VeroParser.RIGHT:
                {
                this.state = 261;
                this.direction();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public direction(): DirectionContext {
        let localContext = new DirectionContext(this.context, this.state);
        this.enterRule(localContext, 52, VeroParser.RULE_direction);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 264;
            _la = this.tokenStream.LA(1);
            if(!(((((_la - 54)) & ~0x1F) === 0 && ((1 << (_la - 54)) & 15) !== 0))) {
            this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public waitAction(): WaitActionContext {
        let localContext = new WaitActionContext(this.context, this.state);
        this.enterRule(localContext, 54, VeroParser.RULE_waitAction);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 266;
            this.match(VeroParser.WAIT);
            this.state = 272;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.LPAREN:
            case VeroParser.STRING_LITERAL:
            case VeroParser.NUMBER_LITERAL:
            case VeroParser.IDENTIFIER:
                {
                this.state = 267;
                this.expression();
                this.state = 268;
                _la = this.tokenStream.LA(1);
                if(!(_la === 52 || _la === 53)) {
                this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                }
                break;
            case VeroParser.FOR:
                {
                this.state = 270;
                this.match(VeroParser.FOR);
                this.state = 271;
                this.selectorExpression();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public doAction(): DoActionContext {
        let localContext = new DoActionContext(this.context, this.state);
        this.enterRule(localContext, 56, VeroParser.RULE_doAction);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 274;
            this.match(VeroParser.DO);
            this.state = 275;
            this.pageMethodReference();
            this.state = 278;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 10) {
                {
                this.state = 276;
                this.match(VeroParser.WITH);
                this.state = 277;
                this.argumentList();
                }
            }

            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public refreshAction(): RefreshActionContext {
        let localContext = new RefreshActionContext(this.context, this.state);
        this.enterRule(localContext, 58, VeroParser.RULE_refreshAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 280;
            this.match(VeroParser.REFRESH);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public clearAction(): ClearActionContext {
        let localContext = new ClearActionContext(this.context, this.state);
        this.enterRule(localContext, 60, VeroParser.RULE_clearAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 282;
            this.match(VeroParser.CLEAR);
            this.state = 283;
            this.selectorExpression();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public screenshotAction(): ScreenshotActionContext {
        let localContext = new ScreenshotActionContext(this.context, this.state);
        this.enterRule(localContext, 62, VeroParser.RULE_screenshotAction);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 285;
            this.match(VeroParser.TAKE);
            this.state = 286;
            this.match(VeroParser.SCREENSHOT);
            this.state = 288;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (((((_la - 60)) & ~0x1F) === 0 && ((1 << (_la - 60)) & 114689) !== 0)) {
                {
                this.state = 287;
                this.expression();
                }
            }

            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public logAction(): LogActionContext {
        let localContext = new LogActionContext(this.context, this.state);
        this.enterRule(localContext, 64, VeroParser.RULE_logAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 290;
            this.match(VeroParser.LOG);
            this.state = 291;
            this.expression();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public assertionStatement(): AssertionStatementContext {
        let localContext = new AssertionStatementContext(this.context, this.state);
        this.enterRule(localContext, 66, VeroParser.RULE_assertionStatement);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 293;
            this.match(VeroParser.VERIFY);
            this.state = 294;
            this.selectorOrText();
            this.state = 295;
            _la = this.tokenStream.LA(1);
            if(!(_la === 38 || _la === 39)) {
            this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            this.state = 296;
            this.condition();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public selectorOrText(): SelectorOrTextContext {
        let localContext = new SelectorOrTextContext(this.context, this.state);
        this.enterRule(localContext, 68, VeroParser.RULE_selectorOrText);
        try {
            this.state = 300;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 18, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 298;
                this.selectorExpression();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 299;
                this.expression();
                }
                break;
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public condition(): ConditionContext {
        let localContext = new ConditionContext(this.context, this.state);
        this.enterRule(localContext, 70, VeroParser.RULE_condition);
        try {
            this.state = 309;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.VISIBLE:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 302;
                this.match(VeroParser.VISIBLE);
                }
                break;
            case VeroParser.HIDDEN_STATE:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 303;
                this.match(VeroParser.HIDDEN_STATE);
                }
                break;
            case VeroParser.ENABLED:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 304;
                this.match(VeroParser.ENABLED);
                }
                break;
            case VeroParser.DISABLED:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 305;
                this.match(VeroParser.DISABLED);
                }
                break;
            case VeroParser.CHECKED:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 306;
                this.match(VeroParser.CHECKED);
                }
                break;
            case VeroParser.EMPTY:
                this.enterOuterAlt(localContext, 6);
                {
                this.state = 307;
                this.match(VeroParser.EMPTY);
                }
                break;
            case VeroParser.CONTAINS:
                this.enterOuterAlt(localContext, 7);
                {
                this.state = 308;
                this.containsCondition();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public containsCondition(): ContainsConditionContext {
        let localContext = new ContainsConditionContext(this.context, this.state);
        this.enterRule(localContext, 72, VeroParser.RULE_containsCondition);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 311;
            this.match(VeroParser.CONTAINS);
            this.state = 312;
            this.expression();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public controlFlowStatement(): ControlFlowStatementContext {
        let localContext = new ControlFlowStatementContext(this.context, this.state);
        this.enterRule(localContext, 74, VeroParser.RULE_controlFlowStatement);
        try {
            this.state = 316;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.IF:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 314;
                this.ifStatement();
                }
                break;
            case VeroParser.REPEAT:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 315;
                this.repeatStatement();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public ifStatement(): IfStatementContext {
        let localContext = new IfStatementContext(this.context, this.state);
        this.enterRule(localContext, 76, VeroParser.RULE_ifStatement);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 318;
            this.match(VeroParser.IF);
            this.state = 319;
            this.booleanExpression();
            this.state = 320;
            this.match(VeroParser.LBRACE);
            this.state = 324;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 4294279168) !== 0) || ((((_la - 32)) & ~0x1F) === 0 && ((1 << (_la - 32)) & 983083) !== 0)) {
                {
                {
                this.state = 321;
                this.statement();
                }
                }
                this.state = 326;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 327;
            this.match(VeroParser.RBRACE);
            this.state = 337;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 17) {
                {
                this.state = 328;
                this.match(VeroParser.ELSE);
                this.state = 329;
                this.match(VeroParser.LBRACE);
                this.state = 333;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 4294279168) !== 0) || ((((_la - 32)) & ~0x1F) === 0 && ((1 << (_la - 32)) & 983083) !== 0)) {
                    {
                    {
                    this.state = 330;
                    this.statement();
                    }
                    }
                    this.state = 335;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                }
                this.state = 336;
                this.match(VeroParser.RBRACE);
                }
            }

            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public repeatStatement(): RepeatStatementContext {
        let localContext = new RepeatStatementContext(this.context, this.state);
        this.enterRule(localContext, 78, VeroParser.RULE_repeatStatement);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 339;
            this.match(VeroParser.REPEAT);
            this.state = 340;
            this.expression();
            this.state = 341;
            this.match(VeroParser.TIMES);
            this.state = 342;
            this.match(VeroParser.LBRACE);
            this.state = 346;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 4294279168) !== 0) || ((((_la - 32)) & ~0x1F) === 0 && ((1 << (_la - 32)) & 983083) !== 0)) {
                {
                {
                this.state = 343;
                this.statement();
                }
                }
                this.state = 348;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 349;
            this.match(VeroParser.RBRACE);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public booleanExpression(): BooleanExpressionContext {
        let localContext = new BooleanExpressionContext(this.context, this.state);
        this.enterRule(localContext, 80, VeroParser.RULE_booleanExpression);
        try {
            this.state = 364;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 25, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 351;
                this.selectorExpression();
                this.state = 352;
                this.match(VeroParser.IS);
                this.state = 353;
                this.condition();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 355;
                this.selectorExpression();
                this.state = 356;
                this.match(VeroParser.ISNOT);
                this.state = 357;
                this.condition();
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 359;
                this.expression();
                this.state = 360;
                this.comparisonOperator();
                this.state = 361;
                this.expression();
                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 363;
                this.expression();
                }
                break;
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public comparisonOperator(): ComparisonOperatorContext {
        let localContext = new ComparisonOperatorContext(this.context, this.state);
        this.enterRule(localContext, 82, VeroParser.RULE_comparisonOperator);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 366;
            _la = this.tokenStream.LA(1);
            if(!(((((_la - 68)) & ~0x1F) === 0 && ((1 << (_la - 68)) & 63) !== 0))) {
            this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public variableDeclaration(): VariableDeclarationContext {
        let localContext = new VariableDeclarationContext(this.context, this.state);
        this.enterRule(localContext, 84, VeroParser.RULE_variableDeclaration);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 368;
            this.variableType();
            this.state = 369;
            this.match(VeroParser.IDENTIFIER);
            this.state = 370;
            this.match(VeroParser.EQUALS);
            this.state = 371;
            this.expression();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public variableType(): VariableTypeContext {
        let localContext = new VariableTypeContext(this.context, this.state);
        this.enterRule(localContext, 86, VeroParser.RULE_variableType);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 373;
            _la = this.tokenStream.LA(1);
            if(!(((((_la - 48)) & ~0x1F) === 0 && ((1 << (_la - 48)) & 15) !== 0))) {
            this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public returnStatement(): ReturnStatementContext {
        let localContext = new ReturnStatementContext(this.context, this.state);
        this.enterRule(localContext, 88, VeroParser.RULE_returnStatement);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 375;
            this.match(VeroParser.RETURN);
            this.state = 377;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (((((_la - 60)) & ~0x1F) === 0 && ((1 << (_la - 60)) & 114689) !== 0)) {
                {
                this.state = 376;
                this.expression();
                }
            }

            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public expression(): ExpressionContext {
        let localContext = new ExpressionContext(this.context, this.state);
        this.enterRule(localContext, 90, VeroParser.RULE_expression);
        try {
            this.state = 387;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 27, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 379;
                this.match(VeroParser.STRING_LITERAL);
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 380;
                this.match(VeroParser.NUMBER_LITERAL);
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 381;
                this.match(VeroParser.IDENTIFIER);
                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 382;
                this.pageMethodReference();
                }
                break;
            case 5:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 383;
                this.match(VeroParser.LPAREN);
                this.state = 384;
                this.expression();
                this.state = 385;
                this.match(VeroParser.RPAREN);
                }
                break;
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public selectorExpression(): SelectorExpressionContext {
        let localContext = new SelectorExpressionContext(this.context, this.state);
        this.enterRule(localContext, 92, VeroParser.RULE_selectorExpression);
        try {
            this.state = 392;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 28, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 389;
                this.pageFieldReference();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 390;
                this.match(VeroParser.STRING_LITERAL);
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 391;
                this.match(VeroParser.IDENTIFIER);
                }
                break;
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public pageMethodReference(): PageMethodReferenceContext {
        let localContext = new PageMethodReferenceContext(this.context, this.state);
        this.enterRule(localContext, 94, VeroParser.RULE_pageMethodReference);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 394;
            this.match(VeroParser.IDENTIFIER);
            this.state = 395;
            this.match(VeroParser.DOT);
            this.state = 396;
            this.match(VeroParser.IDENTIFIER);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public pageFieldReference(): PageFieldReferenceContext {
        let localContext = new PageFieldReferenceContext(this.context, this.state);
        this.enterRule(localContext, 96, VeroParser.RULE_pageFieldReference);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 398;
            this.match(VeroParser.IDENTIFIER);
            this.state = 399;
            this.match(VeroParser.DOT);
            this.state = 400;
            this.match(VeroParser.IDENTIFIER);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public argumentList(): ArgumentListContext {
        let localContext = new ArgumentListContext(this.context, this.state);
        this.enterRule(localContext, 98, VeroParser.RULE_argumentList);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 402;
            this.expression();
            this.state = 407;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 64) {
                {
                {
                this.state = 403;
                this.match(VeroParser.COMMA);
                this.state = 404;
                this.expression();
                }
                }
                this.state = 409;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }

    public static readonly _serializedATN: number[] = [
        4,1,78,411,2,0,7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,
        6,2,7,7,7,2,8,7,8,2,9,7,9,2,10,7,10,2,11,7,11,2,12,7,12,2,13,7,13,
        2,14,7,14,2,15,7,15,2,16,7,16,2,17,7,17,2,18,7,18,2,19,7,19,2,20,
        7,20,2,21,7,21,2,22,7,22,2,23,7,23,2,24,7,24,2,25,7,25,2,26,7,26,
        2,27,7,27,2,28,7,28,2,29,7,29,2,30,7,30,2,31,7,31,2,32,7,32,2,33,
        7,33,2,34,7,34,2,35,7,35,2,36,7,36,2,37,7,37,2,38,7,38,2,39,7,39,
        2,40,7,40,2,41,7,41,2,42,7,42,2,43,7,43,2,44,7,44,2,45,7,45,2,46,
        7,46,2,47,7,47,2,48,7,48,2,49,7,49,1,0,5,0,102,8,0,10,0,12,0,105,
        9,0,1,0,1,0,1,1,1,1,3,1,111,8,1,1,2,1,2,1,2,1,2,1,2,1,2,1,3,5,3,
        120,8,3,10,3,12,3,123,9,3,1,4,1,4,3,4,127,8,4,1,5,1,5,1,5,1,5,1,
        5,1,6,1,6,1,6,3,6,137,8,6,1,6,1,6,5,6,141,8,6,10,6,12,6,144,9,6,
        1,6,1,6,1,7,1,7,1,7,5,7,151,8,7,10,7,12,7,154,9,7,1,8,1,8,1,8,1,
        8,1,8,1,8,1,9,5,9,163,8,9,10,9,12,9,166,9,9,1,10,1,10,1,10,3,10,
        171,8,10,1,11,1,11,1,11,1,12,1,12,1,12,1,12,5,12,180,8,12,10,12,
        12,12,183,9,12,1,12,1,12,1,13,1,13,1,13,5,13,190,8,13,10,13,12,13,
        193,9,13,1,13,1,13,5,13,197,8,13,10,13,12,13,200,9,13,1,13,1,13,
        1,14,1,14,1,14,1,15,1,15,1,15,1,15,1,15,3,15,212,8,15,1,16,1,16,
        1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,
        3,16,229,8,16,1,17,1,17,1,17,1,18,1,18,1,18,1,18,1,18,1,19,1,19,
        1,19,1,20,1,20,1,20,1,21,1,21,1,21,1,22,1,22,1,22,1,22,1,22,1,23,
        1,23,1,23,1,24,1,24,1,24,1,25,1,25,1,25,1,25,3,25,263,8,25,1,26,
        1,26,1,27,1,27,1,27,1,27,1,27,1,27,3,27,273,8,27,1,28,1,28,1,28,
        1,28,3,28,279,8,28,1,29,1,29,1,30,1,30,1,30,1,31,1,31,1,31,3,31,
        289,8,31,1,32,1,32,1,32,1,33,1,33,1,33,1,33,1,33,1,34,1,34,3,34,
        301,8,34,1,35,1,35,1,35,1,35,1,35,1,35,1,35,3,35,310,8,35,1,36,1,
        36,1,36,1,37,1,37,3,37,317,8,37,1,38,1,38,1,38,1,38,5,38,323,8,38,
        10,38,12,38,326,9,38,1,38,1,38,1,38,1,38,5,38,332,8,38,10,38,12,
        38,335,9,38,1,38,3,38,338,8,38,1,39,1,39,1,39,1,39,1,39,5,39,345,
        8,39,10,39,12,39,348,9,39,1,39,1,39,1,40,1,40,1,40,1,40,1,40,1,40,
        1,40,1,40,1,40,1,40,1,40,1,40,1,40,3,40,365,8,40,1,41,1,41,1,42,
        1,42,1,42,1,42,1,42,1,43,1,43,1,44,1,44,3,44,378,8,44,1,45,1,45,
        1,45,1,45,1,45,1,45,1,45,1,45,3,45,388,8,45,1,46,1,46,1,46,3,46,
        393,8,46,1,47,1,47,1,47,1,47,1,48,1,48,1,48,1,48,1,49,1,49,1,49,
        5,49,406,8,49,10,49,12,49,409,9,49,1,49,0,0,50,0,2,4,6,8,10,12,14,
        16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52,54,56,58,
        60,62,64,66,68,70,72,74,76,78,80,82,84,86,88,90,92,94,96,98,0,7,
        1,0,6,7,1,0,8,9,1,0,54,57,1,0,52,53,1,0,38,39,1,0,68,73,1,0,48,51,
        418,0,103,1,0,0,0,2,110,1,0,0,0,4,112,1,0,0,0,6,121,1,0,0,0,8,126,
        1,0,0,0,10,128,1,0,0,0,12,133,1,0,0,0,14,147,1,0,0,0,16,155,1,0,
        0,0,18,164,1,0,0,0,20,170,1,0,0,0,22,172,1,0,0,0,24,175,1,0,0,0,
        26,186,1,0,0,0,28,203,1,0,0,0,30,211,1,0,0,0,32,228,1,0,0,0,34,230,
        1,0,0,0,36,233,1,0,0,0,38,238,1,0,0,0,40,241,1,0,0,0,42,244,1,0,
        0,0,44,247,1,0,0,0,46,252,1,0,0,0,48,255,1,0,0,0,50,258,1,0,0,0,
        52,264,1,0,0,0,54,266,1,0,0,0,56,274,1,0,0,0,58,280,1,0,0,0,60,282,
        1,0,0,0,62,285,1,0,0,0,64,290,1,0,0,0,66,293,1,0,0,0,68,300,1,0,
        0,0,70,309,1,0,0,0,72,311,1,0,0,0,74,316,1,0,0,0,76,318,1,0,0,0,
        78,339,1,0,0,0,80,364,1,0,0,0,82,366,1,0,0,0,84,368,1,0,0,0,86,373,
        1,0,0,0,88,375,1,0,0,0,90,387,1,0,0,0,92,392,1,0,0,0,94,394,1,0,
        0,0,96,398,1,0,0,0,98,402,1,0,0,0,100,102,3,2,1,0,101,100,1,0,0,
        0,102,105,1,0,0,0,103,101,1,0,0,0,103,104,1,0,0,0,104,106,1,0,0,
        0,105,103,1,0,0,0,106,107,5,0,0,1,107,1,1,0,0,0,108,111,3,4,2,0,
        109,111,3,16,8,0,110,108,1,0,0,0,110,109,1,0,0,0,111,3,1,0,0,0,112,
        113,5,1,0,0,113,114,5,76,0,0,114,115,5,58,0,0,115,116,3,6,3,0,116,
        117,5,59,0,0,117,5,1,0,0,0,118,120,3,8,4,0,119,118,1,0,0,0,120,123,
        1,0,0,0,121,119,1,0,0,0,121,122,1,0,0,0,122,7,1,0,0,0,123,121,1,
        0,0,0,124,127,3,10,5,0,125,127,3,12,6,0,126,124,1,0,0,0,126,125,
        1,0,0,0,127,9,1,0,0,0,128,129,5,4,0,0,129,130,5,76,0,0,130,131,5,
        66,0,0,131,132,5,74,0,0,132,11,1,0,0,0,133,136,5,76,0,0,134,135,
        5,10,0,0,135,137,3,14,7,0,136,134,1,0,0,0,136,137,1,0,0,0,137,138,
        1,0,0,0,138,142,5,58,0,0,139,141,3,30,15,0,140,139,1,0,0,0,141,144,
        1,0,0,0,142,140,1,0,0,0,142,143,1,0,0,0,143,145,1,0,0,0,144,142,
        1,0,0,0,145,146,5,59,0,0,146,13,1,0,0,0,147,152,5,76,0,0,148,149,
        5,64,0,0,149,151,5,76,0,0,150,148,1,0,0,0,151,154,1,0,0,0,152,150,
        1,0,0,0,152,153,1,0,0,0,153,15,1,0,0,0,154,152,1,0,0,0,155,156,5,
        2,0,0,156,157,5,76,0,0,157,158,5,58,0,0,158,159,3,18,9,0,159,160,
        5,59,0,0,160,17,1,0,0,0,161,163,3,20,10,0,162,161,1,0,0,0,163,166,
        1,0,0,0,164,162,1,0,0,0,164,165,1,0,0,0,165,19,1,0,0,0,166,164,1,
        0,0,0,167,171,3,22,11,0,168,171,3,24,12,0,169,171,3,26,13,0,170,
        167,1,0,0,0,170,168,1,0,0,0,170,169,1,0,0,0,171,21,1,0,0,0,172,173,
        5,5,0,0,173,174,5,76,0,0,174,23,1,0,0,0,175,176,7,0,0,0,176,177,
        7,1,0,0,177,181,5,58,0,0,178,180,3,30,15,0,179,178,1,0,0,0,180,183,
        1,0,0,0,181,179,1,0,0,0,181,182,1,0,0,0,182,184,1,0,0,0,183,181,
        1,0,0,0,184,185,5,59,0,0,185,25,1,0,0,0,186,187,5,3,0,0,187,191,
        5,74,0,0,188,190,3,28,14,0,189,188,1,0,0,0,190,193,1,0,0,0,191,189,
        1,0,0,0,191,192,1,0,0,0,192,194,1,0,0,0,193,191,1,0,0,0,194,198,
        5,58,0,0,195,197,3,30,15,0,196,195,1,0,0,0,197,200,1,0,0,0,198,196,
        1,0,0,0,198,199,1,0,0,0,199,201,1,0,0,0,200,198,1,0,0,0,201,202,
        5,59,0,0,202,27,1,0,0,0,203,204,5,67,0,0,204,205,5,76,0,0,205,29,
        1,0,0,0,206,212,3,32,16,0,207,212,3,66,33,0,208,212,3,74,37,0,209,
        212,3,84,42,0,210,212,3,88,44,0,211,206,1,0,0,0,211,207,1,0,0,0,
        211,208,1,0,0,0,211,209,1,0,0,0,211,210,1,0,0,0,212,31,1,0,0,0,213,
        229,3,34,17,0,214,229,3,36,18,0,215,229,3,38,19,0,216,229,3,40,20,
        0,217,229,3,42,21,0,218,229,3,44,22,0,219,229,3,46,23,0,220,229,
        3,48,24,0,221,229,3,50,25,0,222,229,3,54,27,0,223,229,3,56,28,0,
        224,229,3,58,29,0,225,229,3,60,30,0,226,229,3,62,31,0,227,229,3,
        64,32,0,228,213,1,0,0,0,228,214,1,0,0,0,228,215,1,0,0,0,228,216,
        1,0,0,0,228,217,1,0,0,0,228,218,1,0,0,0,228,219,1,0,0,0,228,220,
        1,0,0,0,228,221,1,0,0,0,228,222,1,0,0,0,228,223,1,0,0,0,228,224,
        1,0,0,0,228,225,1,0,0,0,228,226,1,0,0,0,228,227,1,0,0,0,229,33,1,
        0,0,0,230,231,5,20,0,0,231,232,3,92,46,0,232,35,1,0,0,0,233,234,
        5,21,0,0,234,235,3,92,46,0,235,236,5,10,0,0,236,237,3,90,45,0,237,
        37,1,0,0,0,238,239,5,22,0,0,239,240,3,90,45,0,240,39,1,0,0,0,241,
        242,5,23,0,0,242,243,3,92,46,0,243,41,1,0,0,0,244,245,5,24,0,0,245,
        246,3,92,46,0,246,43,1,0,0,0,247,248,5,25,0,0,248,249,3,90,45,0,
        249,250,5,11,0,0,250,251,3,92,46,0,251,45,1,0,0,0,252,253,5,26,0,
        0,253,254,3,92,46,0,254,47,1,0,0,0,255,256,5,27,0,0,256,257,3,90,
        45,0,257,49,1,0,0,0,258,262,5,28,0,0,259,260,5,12,0,0,260,263,3,
        92,46,0,261,263,3,52,26,0,262,259,1,0,0,0,262,261,1,0,0,0,263,51,
        1,0,0,0,264,265,7,2,0,0,265,53,1,0,0,0,266,272,5,29,0,0,267,268,
        3,90,45,0,268,269,7,3,0,0,269,273,1,0,0,0,270,271,5,36,0,0,271,273,
        3,92,46,0,272,267,1,0,0,0,272,270,1,0,0,0,273,55,1,0,0,0,274,275,
        5,30,0,0,275,278,3,94,47,0,276,277,5,10,0,0,277,279,3,98,49,0,278,
        276,1,0,0,0,278,279,1,0,0,0,279,57,1,0,0,0,280,281,5,31,0,0,281,
        59,1,0,0,0,282,283,5,32,0,0,283,284,3,92,46,0,284,61,1,0,0,0,285,
        286,5,33,0,0,286,288,5,34,0,0,287,289,3,90,45,0,288,287,1,0,0,0,
        288,289,1,0,0,0,289,63,1,0,0,0,290,291,5,35,0,0,291,292,3,90,45,
        0,292,65,1,0,0,0,293,294,5,37,0,0,294,295,3,68,34,0,295,296,7,4,
        0,0,296,297,3,70,35,0,297,67,1,0,0,0,298,301,3,92,46,0,299,301,3,
        90,45,0,300,298,1,0,0,0,300,299,1,0,0,0,301,69,1,0,0,0,302,310,5,
        40,0,0,303,310,5,41,0,0,304,310,5,42,0,0,305,310,5,43,0,0,306,310,
        5,44,0,0,307,310,5,45,0,0,308,310,3,72,36,0,309,302,1,0,0,0,309,
        303,1,0,0,0,309,304,1,0,0,0,309,305,1,0,0,0,309,306,1,0,0,0,309,
        307,1,0,0,0,309,308,1,0,0,0,310,71,1,0,0,0,311,312,5,46,0,0,312,
        313,3,90,45,0,313,73,1,0,0,0,314,317,3,76,38,0,315,317,3,78,39,0,
        316,314,1,0,0,0,316,315,1,0,0,0,317,75,1,0,0,0,318,319,5,16,0,0,
        319,320,3,80,40,0,320,324,5,58,0,0,321,323,3,30,15,0,322,321,1,0,
        0,0,323,326,1,0,0,0,324,322,1,0,0,0,324,325,1,0,0,0,325,327,1,0,
        0,0,326,324,1,0,0,0,327,337,5,59,0,0,328,329,5,17,0,0,329,333,5,
        58,0,0,330,332,3,30,15,0,331,330,1,0,0,0,332,335,1,0,0,0,333,331,
        1,0,0,0,333,334,1,0,0,0,334,336,1,0,0,0,335,333,1,0,0,0,336,338,
        5,59,0,0,337,328,1,0,0,0,337,338,1,0,0,0,338,77,1,0,0,0,339,340,
        5,18,0,0,340,341,3,90,45,0,341,342,5,19,0,0,342,346,5,58,0,0,343,
        345,3,30,15,0,344,343,1,0,0,0,345,348,1,0,0,0,346,344,1,0,0,0,346,
        347,1,0,0,0,347,349,1,0,0,0,348,346,1,0,0,0,349,350,5,59,0,0,350,
        79,1,0,0,0,351,352,3,92,46,0,352,353,5,38,0,0,353,354,3,70,35,0,
        354,365,1,0,0,0,355,356,3,92,46,0,356,357,5,39,0,0,357,358,3,70,
        35,0,358,365,1,0,0,0,359,360,3,90,45,0,360,361,3,82,41,0,361,362,
        3,90,45,0,362,365,1,0,0,0,363,365,3,90,45,0,364,351,1,0,0,0,364,
        355,1,0,0,0,364,359,1,0,0,0,364,363,1,0,0,0,365,81,1,0,0,0,366,367,
        7,5,0,0,367,83,1,0,0,0,368,369,3,86,43,0,369,370,5,76,0,0,370,371,
        5,66,0,0,371,372,3,90,45,0,372,85,1,0,0,0,373,374,7,6,0,0,374,87,
        1,0,0,0,375,377,5,15,0,0,376,378,3,90,45,0,377,376,1,0,0,0,377,378,
        1,0,0,0,378,89,1,0,0,0,379,388,5,74,0,0,380,388,5,75,0,0,381,388,
        5,76,0,0,382,388,3,94,47,0,383,384,5,60,0,0,384,385,3,90,45,0,385,
        386,5,61,0,0,386,388,1,0,0,0,387,379,1,0,0,0,387,380,1,0,0,0,387,
        381,1,0,0,0,387,382,1,0,0,0,387,383,1,0,0,0,388,91,1,0,0,0,389,393,
        3,96,48,0,390,393,5,74,0,0,391,393,5,76,0,0,392,389,1,0,0,0,392,
        390,1,0,0,0,392,391,1,0,0,0,393,93,1,0,0,0,394,395,5,76,0,0,395,
        396,5,65,0,0,396,397,5,76,0,0,397,95,1,0,0,0,398,399,5,76,0,0,399,
        400,5,65,0,0,400,401,5,76,0,0,401,97,1,0,0,0,402,407,3,90,45,0,403,
        404,5,64,0,0,404,406,3,90,45,0,405,403,1,0,0,0,406,409,1,0,0,0,407,
        405,1,0,0,0,407,408,1,0,0,0,408,99,1,0,0,0,409,407,1,0,0,0,30,103,
        110,121,126,136,142,152,164,170,181,191,198,211,228,262,272,278,
        288,300,309,316,324,333,337,346,364,377,387,392,407
    ];

    private static __ATN: antlr.ATN;
    public static get _ATN(): antlr.ATN {
        if (!VeroParser.__ATN) {
            VeroParser.__ATN = new antlr.ATNDeserializer().deserialize(VeroParser._serializedATN);
        }

        return VeroParser.__ATN;
    }


    private static readonly vocabulary = new antlr.Vocabulary(VeroParser.literalNames, VeroParser.symbolicNames, []);

    public override get vocabulary(): antlr.Vocabulary {
        return VeroParser.vocabulary;
    }

    private static readonly decisionsToDFA = VeroParser._ATN.decisionToState.map( (ds: antlr.DecisionState, index: number) => new antlr.DFA(ds, index) );
}

export class ProgramContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public EOF(): antlr.TerminalNode {
        return this.getToken(VeroParser.EOF, 0)!;
    }
    public declaration(): DeclarationContext[];
    public declaration(i: number): DeclarationContext | null;
    public declaration(i?: number): DeclarationContext[] | DeclarationContext | null {
        if (i === undefined) {
            return this.getRuleContexts(DeclarationContext);
        }

        return this.getRuleContext(i, DeclarationContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_program;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterProgram) {
             listener.enterProgram(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitProgram) {
             listener.exitProgram(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitProgram) {
            return visitor.visitProgram(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class DeclarationContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public pageDeclaration(): PageDeclarationContext | null {
        return this.getRuleContext(0, PageDeclarationContext);
    }
    public featureDeclaration(): FeatureDeclarationContext | null {
        return this.getRuleContext(0, FeatureDeclarationContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_declaration;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterDeclaration) {
             listener.enterDeclaration(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitDeclaration) {
             listener.exitDeclaration(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitDeclaration) {
            return visitor.visitDeclaration(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class PageDeclarationContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public PAGE(): antlr.TerminalNode {
        return this.getToken(VeroParser.PAGE, 0)!;
    }
    public IDENTIFIER(): antlr.TerminalNode {
        return this.getToken(VeroParser.IDENTIFIER, 0)!;
    }
    public LBRACE(): antlr.TerminalNode {
        return this.getToken(VeroParser.LBRACE, 0)!;
    }
    public pageBody(): PageBodyContext {
        return this.getRuleContext(0, PageBodyContext)!;
    }
    public RBRACE(): antlr.TerminalNode {
        return this.getToken(VeroParser.RBRACE, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_pageDeclaration;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterPageDeclaration) {
             listener.enterPageDeclaration(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitPageDeclaration) {
             listener.exitPageDeclaration(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitPageDeclaration) {
            return visitor.visitPageDeclaration(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class PageBodyContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public pageMember(): PageMemberContext[];
    public pageMember(i: number): PageMemberContext | null;
    public pageMember(i?: number): PageMemberContext[] | PageMemberContext | null {
        if (i === undefined) {
            return this.getRuleContexts(PageMemberContext);
        }

        return this.getRuleContext(i, PageMemberContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_pageBody;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterPageBody) {
             listener.enterPageBody(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitPageBody) {
             listener.exitPageBody(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitPageBody) {
            return visitor.visitPageBody(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class PageMemberContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public fieldDeclaration(): FieldDeclarationContext | null {
        return this.getRuleContext(0, FieldDeclarationContext);
    }
    public actionDeclaration(): ActionDeclarationContext | null {
        return this.getRuleContext(0, ActionDeclarationContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_pageMember;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterPageMember) {
             listener.enterPageMember(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitPageMember) {
             listener.exitPageMember(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitPageMember) {
            return visitor.visitPageMember(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class FieldDeclarationContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public FIELD(): antlr.TerminalNode {
        return this.getToken(VeroParser.FIELD, 0)!;
    }
    public IDENTIFIER(): antlr.TerminalNode {
        return this.getToken(VeroParser.IDENTIFIER, 0)!;
    }
    public EQUALS(): antlr.TerminalNode {
        return this.getToken(VeroParser.EQUALS, 0)!;
    }
    public STRING_LITERAL(): antlr.TerminalNode {
        return this.getToken(VeroParser.STRING_LITERAL, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_fieldDeclaration;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterFieldDeclaration) {
             listener.enterFieldDeclaration(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitFieldDeclaration) {
             listener.exitFieldDeclaration(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitFieldDeclaration) {
            return visitor.visitFieldDeclaration(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ActionDeclarationContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public IDENTIFIER(): antlr.TerminalNode {
        return this.getToken(VeroParser.IDENTIFIER, 0)!;
    }
    public LBRACE(): antlr.TerminalNode {
        return this.getToken(VeroParser.LBRACE, 0)!;
    }
    public RBRACE(): antlr.TerminalNode {
        return this.getToken(VeroParser.RBRACE, 0)!;
    }
    public WITH(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.WITH, 0);
    }
    public parameterList(): ParameterListContext | null {
        return this.getRuleContext(0, ParameterListContext);
    }
    public statement(): StatementContext[];
    public statement(i: number): StatementContext | null;
    public statement(i?: number): StatementContext[] | StatementContext | null {
        if (i === undefined) {
            return this.getRuleContexts(StatementContext);
        }

        return this.getRuleContext(i, StatementContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_actionDeclaration;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterActionDeclaration) {
             listener.enterActionDeclaration(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitActionDeclaration) {
             listener.exitActionDeclaration(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitActionDeclaration) {
            return visitor.visitActionDeclaration(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ParameterListContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public IDENTIFIER(): antlr.TerminalNode[];
    public IDENTIFIER(i: number): antlr.TerminalNode | null;
    public IDENTIFIER(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(VeroParser.IDENTIFIER);
    	} else {
    		return this.getToken(VeroParser.IDENTIFIER, i);
    	}
    }
    public COMMA(): antlr.TerminalNode[];
    public COMMA(i: number): antlr.TerminalNode | null;
    public COMMA(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(VeroParser.COMMA);
    	} else {
    		return this.getToken(VeroParser.COMMA, i);
    	}
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_parameterList;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterParameterList) {
             listener.enterParameterList(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitParameterList) {
             listener.exitParameterList(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitParameterList) {
            return visitor.visitParameterList(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class FeatureDeclarationContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public FEATURE(): antlr.TerminalNode {
        return this.getToken(VeroParser.FEATURE, 0)!;
    }
    public IDENTIFIER(): antlr.TerminalNode {
        return this.getToken(VeroParser.IDENTIFIER, 0)!;
    }
    public LBRACE(): antlr.TerminalNode {
        return this.getToken(VeroParser.LBRACE, 0)!;
    }
    public featureBody(): FeatureBodyContext {
        return this.getRuleContext(0, FeatureBodyContext)!;
    }
    public RBRACE(): antlr.TerminalNode {
        return this.getToken(VeroParser.RBRACE, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_featureDeclaration;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterFeatureDeclaration) {
             listener.enterFeatureDeclaration(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitFeatureDeclaration) {
             listener.exitFeatureDeclaration(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitFeatureDeclaration) {
            return visitor.visitFeatureDeclaration(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class FeatureBodyContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public featureMember(): FeatureMemberContext[];
    public featureMember(i: number): FeatureMemberContext | null;
    public featureMember(i?: number): FeatureMemberContext[] | FeatureMemberContext | null {
        if (i === undefined) {
            return this.getRuleContexts(FeatureMemberContext);
        }

        return this.getRuleContext(i, FeatureMemberContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_featureBody;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterFeatureBody) {
             listener.enterFeatureBody(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitFeatureBody) {
             listener.exitFeatureBody(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitFeatureBody) {
            return visitor.visitFeatureBody(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class FeatureMemberContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public useStatement(): UseStatementContext | null {
        return this.getRuleContext(0, UseStatementContext);
    }
    public hookDeclaration(): HookDeclarationContext | null {
        return this.getRuleContext(0, HookDeclarationContext);
    }
    public scenarioDeclaration(): ScenarioDeclarationContext | null {
        return this.getRuleContext(0, ScenarioDeclarationContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_featureMember;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterFeatureMember) {
             listener.enterFeatureMember(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitFeatureMember) {
             listener.exitFeatureMember(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitFeatureMember) {
            return visitor.visitFeatureMember(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class UseStatementContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public USE(): antlr.TerminalNode {
        return this.getToken(VeroParser.USE, 0)!;
    }
    public IDENTIFIER(): antlr.TerminalNode {
        return this.getToken(VeroParser.IDENTIFIER, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_useStatement;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterUseStatement) {
             listener.enterUseStatement(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitUseStatement) {
             listener.exitUseStatement(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitUseStatement) {
            return visitor.visitUseStatement(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class HookDeclarationContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public LBRACE(): antlr.TerminalNode {
        return this.getToken(VeroParser.LBRACE, 0)!;
    }
    public RBRACE(): antlr.TerminalNode {
        return this.getToken(VeroParser.RBRACE, 0)!;
    }
    public BEFORE(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.BEFORE, 0);
    }
    public AFTER(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.AFTER, 0);
    }
    public EACH(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.EACH, 0);
    }
    public ALL(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.ALL, 0);
    }
    public statement(): StatementContext[];
    public statement(i: number): StatementContext | null;
    public statement(i?: number): StatementContext[] | StatementContext | null {
        if (i === undefined) {
            return this.getRuleContexts(StatementContext);
        }

        return this.getRuleContext(i, StatementContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_hookDeclaration;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterHookDeclaration) {
             listener.enterHookDeclaration(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitHookDeclaration) {
             listener.exitHookDeclaration(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitHookDeclaration) {
            return visitor.visitHookDeclaration(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ScenarioDeclarationContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public SCENARIO(): antlr.TerminalNode {
        return this.getToken(VeroParser.SCENARIO, 0)!;
    }
    public STRING_LITERAL(): antlr.TerminalNode {
        return this.getToken(VeroParser.STRING_LITERAL, 0)!;
    }
    public LBRACE(): antlr.TerminalNode {
        return this.getToken(VeroParser.LBRACE, 0)!;
    }
    public RBRACE(): antlr.TerminalNode {
        return this.getToken(VeroParser.RBRACE, 0)!;
    }
    public tag(): TagContext[];
    public tag(i: number): TagContext | null;
    public tag(i?: number): TagContext[] | TagContext | null {
        if (i === undefined) {
            return this.getRuleContexts(TagContext);
        }

        return this.getRuleContext(i, TagContext);
    }
    public statement(): StatementContext[];
    public statement(i: number): StatementContext | null;
    public statement(i?: number): StatementContext[] | StatementContext | null {
        if (i === undefined) {
            return this.getRuleContexts(StatementContext);
        }

        return this.getRuleContext(i, StatementContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_scenarioDeclaration;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterScenarioDeclaration) {
             listener.enterScenarioDeclaration(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitScenarioDeclaration) {
             listener.exitScenarioDeclaration(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitScenarioDeclaration) {
            return visitor.visitScenarioDeclaration(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class TagContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public AT(): antlr.TerminalNode {
        return this.getToken(VeroParser.AT, 0)!;
    }
    public IDENTIFIER(): antlr.TerminalNode {
        return this.getToken(VeroParser.IDENTIFIER, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_tag;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterTag) {
             listener.enterTag(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitTag) {
             listener.exitTag(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitTag) {
            return visitor.visitTag(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class StatementContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public actionStatement(): ActionStatementContext | null {
        return this.getRuleContext(0, ActionStatementContext);
    }
    public assertionStatement(): AssertionStatementContext | null {
        return this.getRuleContext(0, AssertionStatementContext);
    }
    public controlFlowStatement(): ControlFlowStatementContext | null {
        return this.getRuleContext(0, ControlFlowStatementContext);
    }
    public variableDeclaration(): VariableDeclarationContext | null {
        return this.getRuleContext(0, VariableDeclarationContext);
    }
    public returnStatement(): ReturnStatementContext | null {
        return this.getRuleContext(0, ReturnStatementContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_statement;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterStatement) {
             listener.enterStatement(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitStatement) {
             listener.exitStatement(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitStatement) {
            return visitor.visitStatement(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ActionStatementContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public clickAction(): ClickActionContext | null {
        return this.getRuleContext(0, ClickActionContext);
    }
    public fillAction(): FillActionContext | null {
        return this.getRuleContext(0, FillActionContext);
    }
    public openAction(): OpenActionContext | null {
        return this.getRuleContext(0, OpenActionContext);
    }
    public checkAction(): CheckActionContext | null {
        return this.getRuleContext(0, CheckActionContext);
    }
    public uncheckAction(): UncheckActionContext | null {
        return this.getRuleContext(0, UncheckActionContext);
    }
    public selectAction(): SelectActionContext | null {
        return this.getRuleContext(0, SelectActionContext);
    }
    public hoverAction(): HoverActionContext | null {
        return this.getRuleContext(0, HoverActionContext);
    }
    public pressAction(): PressActionContext | null {
        return this.getRuleContext(0, PressActionContext);
    }
    public scrollAction(): ScrollActionContext | null {
        return this.getRuleContext(0, ScrollActionContext);
    }
    public waitAction(): WaitActionContext | null {
        return this.getRuleContext(0, WaitActionContext);
    }
    public doAction(): DoActionContext | null {
        return this.getRuleContext(0, DoActionContext);
    }
    public refreshAction(): RefreshActionContext | null {
        return this.getRuleContext(0, RefreshActionContext);
    }
    public clearAction(): ClearActionContext | null {
        return this.getRuleContext(0, ClearActionContext);
    }
    public screenshotAction(): ScreenshotActionContext | null {
        return this.getRuleContext(0, ScreenshotActionContext);
    }
    public logAction(): LogActionContext | null {
        return this.getRuleContext(0, LogActionContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_actionStatement;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterActionStatement) {
             listener.enterActionStatement(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitActionStatement) {
             listener.exitActionStatement(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitActionStatement) {
            return visitor.visitActionStatement(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ClickActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public CLICK(): antlr.TerminalNode {
        return this.getToken(VeroParser.CLICK, 0)!;
    }
    public selectorExpression(): SelectorExpressionContext {
        return this.getRuleContext(0, SelectorExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_clickAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterClickAction) {
             listener.enterClickAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitClickAction) {
             listener.exitClickAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitClickAction) {
            return visitor.visitClickAction(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class FillActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public FILL(): antlr.TerminalNode {
        return this.getToken(VeroParser.FILL, 0)!;
    }
    public selectorExpression(): SelectorExpressionContext {
        return this.getRuleContext(0, SelectorExpressionContext)!;
    }
    public WITH(): antlr.TerminalNode {
        return this.getToken(VeroParser.WITH, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_fillAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterFillAction) {
             listener.enterFillAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitFillAction) {
             listener.exitFillAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitFillAction) {
            return visitor.visitFillAction(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class OpenActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public OPEN(): antlr.TerminalNode {
        return this.getToken(VeroParser.OPEN, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_openAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterOpenAction) {
             listener.enterOpenAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitOpenAction) {
             listener.exitOpenAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitOpenAction) {
            return visitor.visitOpenAction(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class CheckActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public CHECK(): antlr.TerminalNode {
        return this.getToken(VeroParser.CHECK, 0)!;
    }
    public selectorExpression(): SelectorExpressionContext {
        return this.getRuleContext(0, SelectorExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_checkAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterCheckAction) {
             listener.enterCheckAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitCheckAction) {
             listener.exitCheckAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitCheckAction) {
            return visitor.visitCheckAction(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class UncheckActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public UNCHECK(): antlr.TerminalNode {
        return this.getToken(VeroParser.UNCHECK, 0)!;
    }
    public selectorExpression(): SelectorExpressionContext {
        return this.getRuleContext(0, SelectorExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_uncheckAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterUncheckAction) {
             listener.enterUncheckAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitUncheckAction) {
             listener.exitUncheckAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitUncheckAction) {
            return visitor.visitUncheckAction(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class SelectActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public SELECT(): antlr.TerminalNode {
        return this.getToken(VeroParser.SELECT, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public FROM(): antlr.TerminalNode {
        return this.getToken(VeroParser.FROM, 0)!;
    }
    public selectorExpression(): SelectorExpressionContext {
        return this.getRuleContext(0, SelectorExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_selectAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterSelectAction) {
             listener.enterSelectAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitSelectAction) {
             listener.exitSelectAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitSelectAction) {
            return visitor.visitSelectAction(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class HoverActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public HOVER(): antlr.TerminalNode {
        return this.getToken(VeroParser.HOVER, 0)!;
    }
    public selectorExpression(): SelectorExpressionContext {
        return this.getRuleContext(0, SelectorExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_hoverAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterHoverAction) {
             listener.enterHoverAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitHoverAction) {
             listener.exitHoverAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitHoverAction) {
            return visitor.visitHoverAction(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class PressActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public PRESS(): antlr.TerminalNode {
        return this.getToken(VeroParser.PRESS, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_pressAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterPressAction) {
             listener.enterPressAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitPressAction) {
             listener.exitPressAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitPressAction) {
            return visitor.visitPressAction(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ScrollActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public SCROLL(): antlr.TerminalNode {
        return this.getToken(VeroParser.SCROLL, 0)!;
    }
    public TO(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.TO, 0);
    }
    public selectorExpression(): SelectorExpressionContext | null {
        return this.getRuleContext(0, SelectorExpressionContext);
    }
    public direction(): DirectionContext | null {
        return this.getRuleContext(0, DirectionContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_scrollAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterScrollAction) {
             listener.enterScrollAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitScrollAction) {
             listener.exitScrollAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitScrollAction) {
            return visitor.visitScrollAction(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class DirectionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public UP(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.UP, 0);
    }
    public DOWN(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.DOWN, 0);
    }
    public LEFT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.LEFT, 0);
    }
    public RIGHT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.RIGHT, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_direction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterDirection) {
             listener.enterDirection(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitDirection) {
             listener.exitDirection(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitDirection) {
            return visitor.visitDirection(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class WaitActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public WAIT(): antlr.TerminalNode {
        return this.getToken(VeroParser.WAIT, 0)!;
    }
    public expression(): ExpressionContext | null {
        return this.getRuleContext(0, ExpressionContext);
    }
    public FOR(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.FOR, 0);
    }
    public selectorExpression(): SelectorExpressionContext | null {
        return this.getRuleContext(0, SelectorExpressionContext);
    }
    public SECONDS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.SECONDS, 0);
    }
    public MILLISECONDS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.MILLISECONDS, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_waitAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterWaitAction) {
             listener.enterWaitAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitWaitAction) {
             listener.exitWaitAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitWaitAction) {
            return visitor.visitWaitAction(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class DoActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public DO(): antlr.TerminalNode {
        return this.getToken(VeroParser.DO, 0)!;
    }
    public pageMethodReference(): PageMethodReferenceContext {
        return this.getRuleContext(0, PageMethodReferenceContext)!;
    }
    public WITH(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.WITH, 0);
    }
    public argumentList(): ArgumentListContext | null {
        return this.getRuleContext(0, ArgumentListContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_doAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterDoAction) {
             listener.enterDoAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitDoAction) {
             listener.exitDoAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitDoAction) {
            return visitor.visitDoAction(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class RefreshActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public REFRESH(): antlr.TerminalNode {
        return this.getToken(VeroParser.REFRESH, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_refreshAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterRefreshAction) {
             listener.enterRefreshAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitRefreshAction) {
             listener.exitRefreshAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitRefreshAction) {
            return visitor.visitRefreshAction(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ClearActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public CLEAR(): antlr.TerminalNode {
        return this.getToken(VeroParser.CLEAR, 0)!;
    }
    public selectorExpression(): SelectorExpressionContext {
        return this.getRuleContext(0, SelectorExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_clearAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterClearAction) {
             listener.enterClearAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitClearAction) {
             listener.exitClearAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitClearAction) {
            return visitor.visitClearAction(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ScreenshotActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public TAKE(): antlr.TerminalNode {
        return this.getToken(VeroParser.TAKE, 0)!;
    }
    public SCREENSHOT(): antlr.TerminalNode {
        return this.getToken(VeroParser.SCREENSHOT, 0)!;
    }
    public expression(): ExpressionContext | null {
        return this.getRuleContext(0, ExpressionContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_screenshotAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterScreenshotAction) {
             listener.enterScreenshotAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitScreenshotAction) {
             listener.exitScreenshotAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitScreenshotAction) {
            return visitor.visitScreenshotAction(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class LogActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public LOG(): antlr.TerminalNode {
        return this.getToken(VeroParser.LOG, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_logAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterLogAction) {
             listener.enterLogAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitLogAction) {
             listener.exitLogAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitLogAction) {
            return visitor.visitLogAction(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class AssertionStatementContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public VERIFY(): antlr.TerminalNode {
        return this.getToken(VeroParser.VERIFY, 0)!;
    }
    public selectorOrText(): SelectorOrTextContext {
        return this.getRuleContext(0, SelectorOrTextContext)!;
    }
    public condition(): ConditionContext {
        return this.getRuleContext(0, ConditionContext)!;
    }
    public IS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.IS, 0);
    }
    public ISNOT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.ISNOT, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_assertionStatement;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterAssertionStatement) {
             listener.enterAssertionStatement(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitAssertionStatement) {
             listener.exitAssertionStatement(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitAssertionStatement) {
            return visitor.visitAssertionStatement(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class SelectorOrTextContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public selectorExpression(): SelectorExpressionContext | null {
        return this.getRuleContext(0, SelectorExpressionContext);
    }
    public expression(): ExpressionContext | null {
        return this.getRuleContext(0, ExpressionContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_selectorOrText;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterSelectorOrText) {
             listener.enterSelectorOrText(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitSelectorOrText) {
             listener.exitSelectorOrText(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitSelectorOrText) {
            return visitor.visitSelectorOrText(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ConditionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public VISIBLE(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.VISIBLE, 0);
    }
    public HIDDEN_STATE(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.HIDDEN_STATE, 0);
    }
    public ENABLED(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.ENABLED, 0);
    }
    public DISABLED(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.DISABLED, 0);
    }
    public CHECKED(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.CHECKED, 0);
    }
    public EMPTY(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.EMPTY, 0);
    }
    public containsCondition(): ContainsConditionContext | null {
        return this.getRuleContext(0, ContainsConditionContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_condition;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterCondition) {
             listener.enterCondition(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitCondition) {
             listener.exitCondition(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitCondition) {
            return visitor.visitCondition(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ContainsConditionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public CONTAINS(): antlr.TerminalNode {
        return this.getToken(VeroParser.CONTAINS, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_containsCondition;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterContainsCondition) {
             listener.enterContainsCondition(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitContainsCondition) {
             listener.exitContainsCondition(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitContainsCondition) {
            return visitor.visitContainsCondition(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ControlFlowStatementContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public ifStatement(): IfStatementContext | null {
        return this.getRuleContext(0, IfStatementContext);
    }
    public repeatStatement(): RepeatStatementContext | null {
        return this.getRuleContext(0, RepeatStatementContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_controlFlowStatement;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterControlFlowStatement) {
             listener.enterControlFlowStatement(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitControlFlowStatement) {
             listener.exitControlFlowStatement(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitControlFlowStatement) {
            return visitor.visitControlFlowStatement(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class IfStatementContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public IF(): antlr.TerminalNode {
        return this.getToken(VeroParser.IF, 0)!;
    }
    public booleanExpression(): BooleanExpressionContext {
        return this.getRuleContext(0, BooleanExpressionContext)!;
    }
    public LBRACE(): antlr.TerminalNode[];
    public LBRACE(i: number): antlr.TerminalNode | null;
    public LBRACE(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(VeroParser.LBRACE);
    	} else {
    		return this.getToken(VeroParser.LBRACE, i);
    	}
    }
    public RBRACE(): antlr.TerminalNode[];
    public RBRACE(i: number): antlr.TerminalNode | null;
    public RBRACE(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(VeroParser.RBRACE);
    	} else {
    		return this.getToken(VeroParser.RBRACE, i);
    	}
    }
    public statement(): StatementContext[];
    public statement(i: number): StatementContext | null;
    public statement(i?: number): StatementContext[] | StatementContext | null {
        if (i === undefined) {
            return this.getRuleContexts(StatementContext);
        }

        return this.getRuleContext(i, StatementContext);
    }
    public ELSE(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.ELSE, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_ifStatement;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterIfStatement) {
             listener.enterIfStatement(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitIfStatement) {
             listener.exitIfStatement(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitIfStatement) {
            return visitor.visitIfStatement(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class RepeatStatementContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public REPEAT(): antlr.TerminalNode {
        return this.getToken(VeroParser.REPEAT, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public TIMES(): antlr.TerminalNode {
        return this.getToken(VeroParser.TIMES, 0)!;
    }
    public LBRACE(): antlr.TerminalNode {
        return this.getToken(VeroParser.LBRACE, 0)!;
    }
    public RBRACE(): antlr.TerminalNode {
        return this.getToken(VeroParser.RBRACE, 0)!;
    }
    public statement(): StatementContext[];
    public statement(i: number): StatementContext | null;
    public statement(i?: number): StatementContext[] | StatementContext | null {
        if (i === undefined) {
            return this.getRuleContexts(StatementContext);
        }

        return this.getRuleContext(i, StatementContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_repeatStatement;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterRepeatStatement) {
             listener.enterRepeatStatement(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitRepeatStatement) {
             listener.exitRepeatStatement(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitRepeatStatement) {
            return visitor.visitRepeatStatement(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class BooleanExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public selectorExpression(): SelectorExpressionContext | null {
        return this.getRuleContext(0, SelectorExpressionContext);
    }
    public IS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.IS, 0);
    }
    public condition(): ConditionContext | null {
        return this.getRuleContext(0, ConditionContext);
    }
    public ISNOT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.ISNOT, 0);
    }
    public expression(): ExpressionContext[];
    public expression(i: number): ExpressionContext | null;
    public expression(i?: number): ExpressionContext[] | ExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ExpressionContext);
        }

        return this.getRuleContext(i, ExpressionContext);
    }
    public comparisonOperator(): ComparisonOperatorContext | null {
        return this.getRuleContext(0, ComparisonOperatorContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_booleanExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterBooleanExpression) {
             listener.enterBooleanExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitBooleanExpression) {
             listener.exitBooleanExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitBooleanExpression) {
            return visitor.visitBooleanExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ComparisonOperatorContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public GT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.GT, 0);
    }
    public LT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.LT, 0);
    }
    public GTE(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.GTE, 0);
    }
    public LTE(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.LTE, 0);
    }
    public EQEQ(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.EQEQ, 0);
    }
    public NEQ(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.NEQ, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_comparisonOperator;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterComparisonOperator) {
             listener.enterComparisonOperator(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitComparisonOperator) {
             listener.exitComparisonOperator(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitComparisonOperator) {
            return visitor.visitComparisonOperator(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class VariableDeclarationContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public variableType(): VariableTypeContext {
        return this.getRuleContext(0, VariableTypeContext)!;
    }
    public IDENTIFIER(): antlr.TerminalNode {
        return this.getToken(VeroParser.IDENTIFIER, 0)!;
    }
    public EQUALS(): antlr.TerminalNode {
        return this.getToken(VeroParser.EQUALS, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_variableDeclaration;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterVariableDeclaration) {
             listener.enterVariableDeclaration(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitVariableDeclaration) {
             listener.exitVariableDeclaration(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitVariableDeclaration) {
            return visitor.visitVariableDeclaration(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class VariableTypeContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public TEXT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.TEXT, 0);
    }
    public NUMBER(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.NUMBER, 0);
    }
    public FLAG(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.FLAG, 0);
    }
    public LIST(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.LIST, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_variableType;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterVariableType) {
             listener.enterVariableType(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitVariableType) {
             listener.exitVariableType(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitVariableType) {
            return visitor.visitVariableType(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ReturnStatementContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public RETURN(): antlr.TerminalNode {
        return this.getToken(VeroParser.RETURN, 0)!;
    }
    public expression(): ExpressionContext | null {
        return this.getRuleContext(0, ExpressionContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_returnStatement;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterReturnStatement) {
             listener.enterReturnStatement(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitReturnStatement) {
             listener.exitReturnStatement(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitReturnStatement) {
            return visitor.visitReturnStatement(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public STRING_LITERAL(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.STRING_LITERAL, 0);
    }
    public NUMBER_LITERAL(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.NUMBER_LITERAL, 0);
    }
    public IDENTIFIER(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.IDENTIFIER, 0);
    }
    public pageMethodReference(): PageMethodReferenceContext | null {
        return this.getRuleContext(0, PageMethodReferenceContext);
    }
    public LPAREN(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.LPAREN, 0);
    }
    public expression(): ExpressionContext | null {
        return this.getRuleContext(0, ExpressionContext);
    }
    public RPAREN(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.RPAREN, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_expression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterExpression) {
             listener.enterExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitExpression) {
             listener.exitExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitExpression) {
            return visitor.visitExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class SelectorExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public pageFieldReference(): PageFieldReferenceContext | null {
        return this.getRuleContext(0, PageFieldReferenceContext);
    }
    public STRING_LITERAL(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.STRING_LITERAL, 0);
    }
    public IDENTIFIER(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.IDENTIFIER, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_selectorExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterSelectorExpression) {
             listener.enterSelectorExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitSelectorExpression) {
             listener.exitSelectorExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitSelectorExpression) {
            return visitor.visitSelectorExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class PageMethodReferenceContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public IDENTIFIER(): antlr.TerminalNode[];
    public IDENTIFIER(i: number): antlr.TerminalNode | null;
    public IDENTIFIER(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(VeroParser.IDENTIFIER);
    	} else {
    		return this.getToken(VeroParser.IDENTIFIER, i);
    	}
    }
    public DOT(): antlr.TerminalNode {
        return this.getToken(VeroParser.DOT, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_pageMethodReference;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterPageMethodReference) {
             listener.enterPageMethodReference(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitPageMethodReference) {
             listener.exitPageMethodReference(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitPageMethodReference) {
            return visitor.visitPageMethodReference(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class PageFieldReferenceContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public IDENTIFIER(): antlr.TerminalNode[];
    public IDENTIFIER(i: number): antlr.TerminalNode | null;
    public IDENTIFIER(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(VeroParser.IDENTIFIER);
    	} else {
    		return this.getToken(VeroParser.IDENTIFIER, i);
    	}
    }
    public DOT(): antlr.TerminalNode {
        return this.getToken(VeroParser.DOT, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_pageFieldReference;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterPageFieldReference) {
             listener.enterPageFieldReference(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitPageFieldReference) {
             listener.exitPageFieldReference(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitPageFieldReference) {
            return visitor.visitPageFieldReference(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ArgumentListContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public expression(): ExpressionContext[];
    public expression(i: number): ExpressionContext | null;
    public expression(i?: number): ExpressionContext[] | ExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ExpressionContext);
        }

        return this.getRuleContext(i, ExpressionContext);
    }
    public COMMA(): antlr.TerminalNode[];
    public COMMA(i: number): antlr.TerminalNode | null;
    public COMMA(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(VeroParser.COMMA);
    	} else {
    		return this.getToken(VeroParser.COMMA, i);
    	}
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_argumentList;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterArgumentList) {
             listener.enterArgumentList(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitArgumentList) {
             listener.exitArgumentList(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitArgumentList) {
            return visitor.visitArgumentList(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}
