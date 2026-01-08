// Generated from grammar/Vero.g4 by ANTLR 4.13.1

import * as antlr from "antlr4ng";
import { Token } from "antlr4ng";

import { VeroListener } from "./VeroListener.js";
import { VeroVisitor } from "./VeroVisitor.js";

// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;


export class VeroParser extends antlr.Parser {
    public static readonly SKIP_ANNOTATION = 1;
    public static readonly ONLY_ANNOTATION = 2;
    public static readonly SLOW_ANNOTATION = 3;
    public static readonly FIXME_ANNOTATION = 4;
    public static readonly SERIAL_ANNOTATION = 5;
    public static readonly PAGE = 6;
    public static readonly FEATURE = 7;
    public static readonly SCENARIO = 8;
    public static readonly FIELD = 9;
    public static readonly USE = 10;
    public static readonly BEFORE = 11;
    public static readonly AFTER = 12;
    public static readonly EACH = 13;
    public static readonly ALL = 14;
    public static readonly WITH = 15;
    public static readonly FROM = 16;
    public static readonly TO = 17;
    public static readonly IN = 18;
    public static readonly RETURNS = 19;
    public static readonly RETURN = 20;
    public static readonly FIXTURE = 21;
    public static readonly SCOPE = 22;
    public static readonly TEST_SCOPE = 23;
    public static readonly WORKER_SCOPE = 24;
    public static readonly SETUP = 25;
    public static readonly TEARDOWN = 26;
    public static readonly DEPENDS = 27;
    public static readonly AUTO = 28;
    public static readonly OPTION = 29;
    public static readonly IF = 30;
    public static readonly ELSE = 31;
    public static readonly REPEAT = 32;
    public static readonly TIMES = 33;
    public static readonly CLICK = 34;
    public static readonly FILL = 35;
    public static readonly OPEN = 36;
    public static readonly CHECK = 37;
    public static readonly UNCHECK = 38;
    public static readonly SELECT = 39;
    public static readonly HOVER = 40;
    public static readonly PRESS = 41;
    public static readonly SCROLL = 42;
    public static readonly WAIT = 43;
    public static readonly DO = 44;
    public static readonly REFRESH = 45;
    public static readonly CLEAR = 46;
    public static readonly TAKE = 47;
    public static readonly SCREENSHOT = 48;
    public static readonly LOG = 49;
    public static readonly UPLOAD = 50;
    public static readonly FOR = 51;
    public static readonly VERIFY = 52;
    public static readonly IS = 53;
    public static readonly ISNOT = 54;
    public static readonly VISIBLE = 55;
    public static readonly HIDDEN_STATE = 56;
    public static readonly ENABLED = 57;
    public static readonly DISABLED = 58;
    public static readonly CHECKED = 59;
    public static readonly EMPTY = 60;
    public static readonly CONTAINS = 61;
    public static readonly NOT = 62;
    public static readonly URL = 63;
    public static readonly TITLE = 64;
    public static readonly EQUAL = 65;
    public static readonly HAS = 66;
    public static readonly VALUE = 67;
    public static readonly ATTRIBUTE = 68;
    public static readonly TEXT = 69;
    public static readonly NUMBER = 70;
    public static readonly FLAG = 71;
    public static readonly LIST = 72;
    public static readonly DATA = 73;
    public static readonly TESTDATA = 74;
    public static readonly WHERE = 75;
    public static readonly ORDER = 76;
    public static readonly BY = 77;
    public static readonly ASC = 78;
    public static readonly DESC = 79;
    public static readonly LIMIT = 80;
    public static readonly OFFSET = 81;
    public static readonly FIRST = 82;
    public static readonly LAST = 83;
    public static readonly RANDOM = 84;
    public static readonly DEFAULT = 85;
    public static readonly AND = 86;
    public static readonly OR = 87;
    public static readonly COUNT = 88;
    public static readonly SUM = 89;
    public static readonly AVERAGE = 90;
    public static readonly MIN = 91;
    public static readonly MAX = 92;
    public static readonly DISTINCT = 93;
    public static readonly ROWS = 94;
    public static readonly COLUMNS = 95;
    public static readonly HEADERS = 96;
    public static readonly OF = 97;
    public static readonly CELL = 98;
    public static readonly STARTS = 99;
    public static readonly ENDS = 100;
    public static readonly MATCHES = 101;
    public static readonly NULL_ = 102;
    public static readonly TODAY = 103;
    public static readonly DAYS = 104;
    public static readonly MONTHS = 105;
    public static readonly YEARS = 106;
    public static readonly AGO = 107;
    public static readonly SECONDS = 108;
    public static readonly MILLISECONDS = 109;
    public static readonly UP = 110;
    public static readonly DOWN = 111;
    public static readonly LEFT = 112;
    public static readonly RIGHT = 113;
    public static readonly LBRACE = 114;
    public static readonly RBRACE = 115;
    public static readonly LPAREN = 116;
    public static readonly RPAREN = 117;
    public static readonly LBRACK = 118;
    public static readonly RBRACK = 119;
    public static readonly COMMA = 120;
    public static readonly DOTDOT = 121;
    public static readonly DOT = 122;
    public static readonly EQUALS = 123;
    public static readonly AT = 124;
    public static readonly GT = 125;
    public static readonly LT = 126;
    public static readonly GTE = 127;
    public static readonly LTE = 128;
    public static readonly EQEQ = 129;
    public static readonly NEQ = 130;
    public static readonly STRING_LITERAL = 131;
    public static readonly NUMBER_LITERAL = 132;
    public static readonly IDENTIFIER = 133;
    public static readonly COMMENT = 134;
    public static readonly WS = 135;
    public static readonly ON = 136;
    public static readonly RULE_program = 0;
    public static readonly RULE_declaration = 1;
    public static readonly RULE_pageDeclaration = 2;
    public static readonly RULE_pageBody = 3;
    public static readonly RULE_pageMember = 4;
    public static readonly RULE_fieldDeclaration = 5;
    public static readonly RULE_actionDeclaration = 6;
    public static readonly RULE_parameterList = 7;
    public static readonly RULE_featureDeclaration = 8;
    public static readonly RULE_featureAnnotation = 9;
    public static readonly RULE_featureBody = 10;
    public static readonly RULE_featureMember = 11;
    public static readonly RULE_useStatement = 12;
    public static readonly RULE_hookDeclaration = 13;
    public static readonly RULE_scenarioDeclaration = 14;
    public static readonly RULE_scenarioAnnotation = 15;
    public static readonly RULE_tag = 16;
    public static readonly RULE_fixtureDeclaration = 17;
    public static readonly RULE_fixtureParams = 18;
    public static readonly RULE_fixtureBody = 19;
    public static readonly RULE_fixtureMember = 20;
    public static readonly RULE_fixtureScopeStatement = 21;
    public static readonly RULE_fixtureDependsStatement = 22;
    public static readonly RULE_fixtureAutoStatement = 23;
    public static readonly RULE_fixtureOptionStatement = 24;
    public static readonly RULE_fixtureSetupBlock = 25;
    public static readonly RULE_fixtureTeardownBlock = 26;
    public static readonly RULE_withFixtureStatement = 27;
    public static readonly RULE_fixtureOptionsBlock = 28;
    public static readonly RULE_fixtureOption = 29;
    public static readonly RULE_statement = 30;
    public static readonly RULE_actionStatement = 31;
    public static readonly RULE_clickAction = 32;
    public static readonly RULE_fillAction = 33;
    public static readonly RULE_openAction = 34;
    public static readonly RULE_checkAction = 35;
    public static readonly RULE_uncheckAction = 36;
    public static readonly RULE_selectAction = 37;
    public static readonly RULE_hoverAction = 38;
    public static readonly RULE_pressAction = 39;
    public static readonly RULE_scrollAction = 40;
    public static readonly RULE_direction = 41;
    public static readonly RULE_waitAction = 42;
    public static readonly RULE_doAction = 43;
    public static readonly RULE_refreshAction = 44;
    public static readonly RULE_clearAction = 45;
    public static readonly RULE_screenshotAction = 46;
    public static readonly RULE_logAction = 47;
    public static readonly RULE_uploadAction = 48;
    public static readonly RULE_fileList = 49;
    public static readonly RULE_assertionStatement = 50;
    public static readonly RULE_selectorOrText = 51;
    public static readonly RULE_condition = 52;
    public static readonly RULE_containsCondition = 53;
    public static readonly RULE_urlCondition = 54;
    public static readonly RULE_titleCondition = 55;
    public static readonly RULE_hasCondition = 56;
    public static readonly RULE_controlFlowStatement = 57;
    public static readonly RULE_ifStatement = 58;
    public static readonly RULE_repeatStatement = 59;
    public static readonly RULE_booleanExpression = 60;
    public static readonly RULE_comparisonOperator = 61;
    public static readonly RULE_variableDeclaration = 62;
    public static readonly RULE_variableType = 63;
    public static readonly RULE_returnStatement = 64;
    public static readonly RULE_dataQueryStatement = 65;
    public static readonly RULE_dataResultType = 66;
    public static readonly RULE_dataQuery = 67;
    public static readonly RULE_aggregationQuery = 68;
    public static readonly RULE_tableQuery = 69;
    public static readonly RULE_tableReference = 70;
    public static readonly RULE_columnSelector = 71;
    public static readonly RULE_identifierList = 72;
    public static readonly RULE_columnReference = 73;
    public static readonly RULE_queryModifier = 74;
    public static readonly RULE_dataWhereClause = 75;
    public static readonly RULE_dataCondition = 76;
    public static readonly RULE_dataComparison = 77;
    public static readonly RULE_textOperator = 78;
    public static readonly RULE_dateComparison = 79;
    public static readonly RULE_expressionList = 80;
    public static readonly RULE_orderByClause = 81;
    public static readonly RULE_orderColumn = 82;
    public static readonly RULE_limitClause = 83;
    public static readonly RULE_offsetClause = 84;
    public static readonly RULE_defaultClause = 85;
    public static readonly RULE_expression = 86;
    public static readonly RULE_selectorExpression = 87;
    public static readonly RULE_pageMethodReference = 88;
    public static readonly RULE_pageFieldReference = 89;
    public static readonly RULE_argumentList = 90;

    public static readonly literalNames = [
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, "'{'", "'}'", "'('", "')'", "'['", "']'", 
        "','", "'..'", "'.'", "'='", "'@'", "'>'", "'<'", "'>='", "'<='", 
        "'=='", "'!='"
    ];

    public static readonly symbolicNames = [
        null, "SKIP_ANNOTATION", "ONLY_ANNOTATION", "SLOW_ANNOTATION", "FIXME_ANNOTATION", 
        "SERIAL_ANNOTATION", "PAGE", "FEATURE", "SCENARIO", "FIELD", "USE", 
        "BEFORE", "AFTER", "EACH", "ALL", "WITH", "FROM", "TO", "IN", "RETURNS", 
        "RETURN", "FIXTURE", "SCOPE", "TEST_SCOPE", "WORKER_SCOPE", "SETUP", 
        "TEARDOWN", "DEPENDS", "AUTO", "OPTION", "IF", "ELSE", "REPEAT", 
        "TIMES", "CLICK", "FILL", "OPEN", "CHECK", "UNCHECK", "SELECT", 
        "HOVER", "PRESS", "SCROLL", "WAIT", "DO", "REFRESH", "CLEAR", "TAKE", 
        "SCREENSHOT", "LOG", "UPLOAD", "FOR", "VERIFY", "IS", "ISNOT", "VISIBLE", 
        "HIDDEN_STATE", "ENABLED", "DISABLED", "CHECKED", "EMPTY", "CONTAINS", 
        "NOT", "URL", "TITLE", "EQUAL", "HAS", "VALUE", "ATTRIBUTE", "TEXT", 
        "NUMBER", "FLAG", "LIST", "DATA", "TESTDATA", "WHERE", "ORDER", 
        "BY", "ASC", "DESC", "LIMIT", "OFFSET", "FIRST", "LAST", "RANDOM", 
        "DEFAULT", "AND", "OR", "COUNT", "SUM", "AVERAGE", "MIN", "MAX", 
        "DISTINCT", "ROWS", "COLUMNS", "HEADERS", "OF", "CELL", "STARTS", 
        "ENDS", "MATCHES", "NULL_", "TODAY", "DAYS", "MONTHS", "YEARS", 
        "AGO", "SECONDS", "MILLISECONDS", "UP", "DOWN", "LEFT", "RIGHT", 
        "LBRACE", "RBRACE", "LPAREN", "RPAREN", "LBRACK", "RBRACK", "COMMA", 
        "DOTDOT", "DOT", "EQUALS", "AT", "GT", "LT", "GTE", "LTE", "EQEQ", 
        "NEQ", "STRING_LITERAL", "NUMBER_LITERAL", "IDENTIFIER", "COMMENT", 
        "WS", "ON"
    ];
    public static readonly ruleNames = [
        "program", "declaration", "pageDeclaration", "pageBody", "pageMember", 
        "fieldDeclaration", "actionDeclaration", "parameterList", "featureDeclaration", 
        "featureAnnotation", "featureBody", "featureMember", "useStatement", 
        "hookDeclaration", "scenarioDeclaration", "scenarioAnnotation", 
        "tag", "fixtureDeclaration", "fixtureParams", "fixtureBody", "fixtureMember", 
        "fixtureScopeStatement", "fixtureDependsStatement", "fixtureAutoStatement", 
        "fixtureOptionStatement", "fixtureSetupBlock", "fixtureTeardownBlock", 
        "withFixtureStatement", "fixtureOptionsBlock", "fixtureOption", 
        "statement", "actionStatement", "clickAction", "fillAction", "openAction", 
        "checkAction", "uncheckAction", "selectAction", "hoverAction", "pressAction", 
        "scrollAction", "direction", "waitAction", "doAction", "refreshAction", 
        "clearAction", "screenshotAction", "logAction", "uploadAction", 
        "fileList", "assertionStatement", "selectorOrText", "condition", 
        "containsCondition", "urlCondition", "titleCondition", "hasCondition", 
        "controlFlowStatement", "ifStatement", "repeatStatement", "booleanExpression", 
        "comparisonOperator", "variableDeclaration", "variableType", "returnStatement", 
        "dataQueryStatement", "dataResultType", "dataQuery", "aggregationQuery", 
        "tableQuery", "tableReference", "columnSelector", "identifierList", 
        "columnReference", "queryModifier", "dataWhereClause", "dataCondition", 
        "dataComparison", "textOperator", "dateComparison", "expressionList", 
        "orderByClause", "orderColumn", "limitClause", "offsetClause", "defaultClause", 
        "expression", "selectorExpression", "pageMethodReference", "pageFieldReference", 
        "argumentList",
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
            this.state = 185;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 2097382) !== 0)) {
                {
                {
                this.state = 182;
                this.declaration();
                }
                }
                this.state = 187;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 188;
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
            this.state = 193;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.PAGE:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 190;
                this.pageDeclaration();
                }
                break;
            case VeroParser.SKIP_ANNOTATION:
            case VeroParser.ONLY_ANNOTATION:
            case VeroParser.SERIAL_ANNOTATION:
            case VeroParser.FEATURE:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 191;
                this.featureDeclaration();
                }
                break;
            case VeroParser.FIXTURE:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 192;
                this.fixtureDeclaration();
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
            this.state = 195;
            this.match(VeroParser.PAGE);
            this.state = 196;
            this.match(VeroParser.IDENTIFIER);
            this.state = 197;
            this.match(VeroParser.LBRACE);
            this.state = 198;
            this.pageBody();
            this.state = 199;
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
            this.state = 204;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 9 || _la === 133) {
                {
                {
                this.state = 201;
                this.pageMember();
                }
                }
                this.state = 206;
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
            this.state = 209;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.FIELD:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 207;
                this.fieldDeclaration();
                }
                break;
            case VeroParser.IDENTIFIER:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 208;
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
            this.state = 211;
            this.match(VeroParser.FIELD);
            this.state = 212;
            this.match(VeroParser.IDENTIFIER);
            this.state = 213;
            this.match(VeroParser.EQUALS);
            this.state = 214;
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
            this.state = 216;
            this.match(VeroParser.IDENTIFIER);
            this.state = 219;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 15) {
                {
                this.state = 217;
                this.match(VeroParser.WITH);
                this.state = 218;
                this.parameterList();
                }
            }

            this.state = 221;
            this.match(VeroParser.LBRACE);
            this.state = 225;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (((((_la - 20)) & ~0x1F) === 0 && ((1 << (_la - 20)) & 1879036929) !== 0) || ((((_la - 52)) & ~0x1F) === 0 && ((1 << (_la - 52)) & 4063233) !== 0)) {
                {
                {
                this.state = 222;
                this.statement();
                }
                }
                this.state = 227;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 228;
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
            this.state = 230;
            this.match(VeroParser.IDENTIFIER);
            this.state = 235;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 120) {
                {
                {
                this.state = 231;
                this.match(VeroParser.COMMA);
                this.state = 232;
                this.match(VeroParser.IDENTIFIER);
                }
                }
                this.state = 237;
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
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 241;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 38) !== 0)) {
                {
                {
                this.state = 238;
                this.featureAnnotation();
                }
                }
                this.state = 243;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 244;
            this.match(VeroParser.FEATURE);
            this.state = 245;
            this.match(VeroParser.IDENTIFIER);
            this.state = 246;
            this.match(VeroParser.LBRACE);
            this.state = 247;
            this.featureBody();
            this.state = 248;
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
    public featureAnnotation(): FeatureAnnotationContext {
        let localContext = new FeatureAnnotationContext(this.context, this.state);
        this.enterRule(localContext, 18, VeroParser.RULE_featureAnnotation);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 250;
            _la = this.tokenStream.LA(1);
            if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 38) !== 0))) {
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
    public featureBody(): FeatureBodyContext {
        let localContext = new FeatureBodyContext(this.context, this.state);
        this.enterRule(localContext, 20, VeroParser.RULE_featureBody);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 255;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 40222) !== 0)) {
                {
                {
                this.state = 252;
                this.featureMember();
                }
                }
                this.state = 257;
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
        this.enterRule(localContext, 22, VeroParser.RULE_featureMember);
        try {
            this.state = 262;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.USE:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 258;
                this.useStatement();
                }
                break;
            case VeroParser.WITH:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 259;
                this.withFixtureStatement();
                }
                break;
            case VeroParser.BEFORE:
            case VeroParser.AFTER:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 260;
                this.hookDeclaration();
                }
                break;
            case VeroParser.SKIP_ANNOTATION:
            case VeroParser.ONLY_ANNOTATION:
            case VeroParser.SLOW_ANNOTATION:
            case VeroParser.FIXME_ANNOTATION:
            case VeroParser.SCENARIO:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 261;
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
        this.enterRule(localContext, 24, VeroParser.RULE_useStatement);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 264;
            this.match(VeroParser.USE);
            this.state = 265;
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
        this.enterRule(localContext, 26, VeroParser.RULE_hookDeclaration);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 267;
            _la = this.tokenStream.LA(1);
            if(!(_la === 11 || _la === 12)) {
            this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            this.state = 268;
            _la = this.tokenStream.LA(1);
            if(!(_la === 13 || _la === 14)) {
            this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            this.state = 269;
            this.match(VeroParser.LBRACE);
            this.state = 273;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (((((_la - 20)) & ~0x1F) === 0 && ((1 << (_la - 20)) & 1879036929) !== 0) || ((((_la - 52)) & ~0x1F) === 0 && ((1 << (_la - 52)) & 4063233) !== 0)) {
                {
                {
                this.state = 270;
                this.statement();
                }
                }
                this.state = 275;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 276;
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
        this.enterRule(localContext, 28, VeroParser.RULE_scenarioDeclaration);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 281;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 30) !== 0)) {
                {
                {
                this.state = 278;
                this.scenarioAnnotation();
                }
                }
                this.state = 283;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 284;
            this.match(VeroParser.SCENARIO);
            this.state = 285;
            this.match(VeroParser.STRING_LITERAL);
            this.state = 289;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 124) {
                {
                {
                this.state = 286;
                this.tag();
                }
                }
                this.state = 291;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 292;
            this.match(VeroParser.LBRACE);
            this.state = 296;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (((((_la - 20)) & ~0x1F) === 0 && ((1 << (_la - 20)) & 1879036929) !== 0) || ((((_la - 52)) & ~0x1F) === 0 && ((1 << (_la - 52)) & 4063233) !== 0)) {
                {
                {
                this.state = 293;
                this.statement();
                }
                }
                this.state = 298;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 299;
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
    public scenarioAnnotation(): ScenarioAnnotationContext {
        let localContext = new ScenarioAnnotationContext(this.context, this.state);
        this.enterRule(localContext, 30, VeroParser.RULE_scenarioAnnotation);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 301;
            _la = this.tokenStream.LA(1);
            if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 30) !== 0))) {
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
    public tag(): TagContext {
        let localContext = new TagContext(this.context, this.state);
        this.enterRule(localContext, 32, VeroParser.RULE_tag);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 303;
            this.match(VeroParser.AT);
            this.state = 304;
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
    public fixtureDeclaration(): FixtureDeclarationContext {
        let localContext = new FixtureDeclarationContext(this.context, this.state);
        this.enterRule(localContext, 34, VeroParser.RULE_fixtureDeclaration);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 306;
            this.match(VeroParser.FIXTURE);
            this.state = 307;
            this.match(VeroParser.IDENTIFIER);
            this.state = 309;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 15) {
                {
                this.state = 308;
                this.fixtureParams();
                }
            }

            this.state = 311;
            this.match(VeroParser.LBRACE);
            this.state = 312;
            this.fixtureBody();
            this.state = 313;
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
    public fixtureParams(): FixtureParamsContext {
        let localContext = new FixtureParamsContext(this.context, this.state);
        this.enterRule(localContext, 36, VeroParser.RULE_fixtureParams);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 315;
            this.match(VeroParser.WITH);
            this.state = 316;
            this.parameterList();
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
    public fixtureBody(): FixtureBodyContext {
        let localContext = new FixtureBodyContext(this.context, this.state);
        this.enterRule(localContext, 38, VeroParser.RULE_fixtureBody);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 321;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 1044381696) !== 0)) {
                {
                {
                this.state = 318;
                this.fixtureMember();
                }
                }
                this.state = 323;
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
    public fixtureMember(): FixtureMemberContext {
        let localContext = new FixtureMemberContext(this.context, this.state);
        this.enterRule(localContext, 40, VeroParser.RULE_fixtureMember);
        try {
            this.state = 330;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.SCOPE:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 324;
                this.fixtureScopeStatement();
                }
                break;
            case VeroParser.DEPENDS:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 325;
                this.fixtureDependsStatement();
                }
                break;
            case VeroParser.AUTO:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 326;
                this.fixtureAutoStatement();
                }
                break;
            case VeroParser.OPTION:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 327;
                this.fixtureOptionStatement();
                }
                break;
            case VeroParser.SETUP:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 328;
                this.fixtureSetupBlock();
                }
                break;
            case VeroParser.TEARDOWN:
                this.enterOuterAlt(localContext, 6);
                {
                this.state = 329;
                this.fixtureTeardownBlock();
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
    public fixtureScopeStatement(): FixtureScopeStatementContext {
        let localContext = new FixtureScopeStatementContext(this.context, this.state);
        this.enterRule(localContext, 42, VeroParser.RULE_fixtureScopeStatement);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 332;
            this.match(VeroParser.SCOPE);
            this.state = 333;
            _la = this.tokenStream.LA(1);
            if(!(_la === 23 || _la === 24)) {
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
    public fixtureDependsStatement(): FixtureDependsStatementContext {
        let localContext = new FixtureDependsStatementContext(this.context, this.state);
        this.enterRule(localContext, 44, VeroParser.RULE_fixtureDependsStatement);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 335;
            this.match(VeroParser.DEPENDS);
            this.state = 336;
            this.match(VeroParser.ON);
            this.state = 337;
            this.identifierList();
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
    public fixtureAutoStatement(): FixtureAutoStatementContext {
        let localContext = new FixtureAutoStatementContext(this.context, this.state);
        this.enterRule(localContext, 46, VeroParser.RULE_fixtureAutoStatement);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 339;
            this.match(VeroParser.AUTO);
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
    public fixtureOptionStatement(): FixtureOptionStatementContext {
        let localContext = new FixtureOptionStatementContext(this.context, this.state);
        this.enterRule(localContext, 48, VeroParser.RULE_fixtureOptionStatement);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 341;
            this.match(VeroParser.OPTION);
            this.state = 342;
            this.match(VeroParser.IDENTIFIER);
            this.state = 343;
            this.match(VeroParser.DEFAULT);
            this.state = 344;
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
    public fixtureSetupBlock(): FixtureSetupBlockContext {
        let localContext = new FixtureSetupBlockContext(this.context, this.state);
        this.enterRule(localContext, 50, VeroParser.RULE_fixtureSetupBlock);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 346;
            this.match(VeroParser.SETUP);
            this.state = 347;
            this.match(VeroParser.LBRACE);
            this.state = 351;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (((((_la - 20)) & ~0x1F) === 0 && ((1 << (_la - 20)) & 1879036929) !== 0) || ((((_la - 52)) & ~0x1F) === 0 && ((1 << (_la - 52)) & 4063233) !== 0)) {
                {
                {
                this.state = 348;
                this.statement();
                }
                }
                this.state = 353;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 354;
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
    public fixtureTeardownBlock(): FixtureTeardownBlockContext {
        let localContext = new FixtureTeardownBlockContext(this.context, this.state);
        this.enterRule(localContext, 52, VeroParser.RULE_fixtureTeardownBlock);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 356;
            this.match(VeroParser.TEARDOWN);
            this.state = 357;
            this.match(VeroParser.LBRACE);
            this.state = 361;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (((((_la - 20)) & ~0x1F) === 0 && ((1 << (_la - 20)) & 1879036929) !== 0) || ((((_la - 52)) & ~0x1F) === 0 && ((1 << (_la - 52)) & 4063233) !== 0)) {
                {
                {
                this.state = 358;
                this.statement();
                }
                }
                this.state = 363;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 364;
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
    public withFixtureStatement(): WithFixtureStatementContext {
        let localContext = new WithFixtureStatementContext(this.context, this.state);
        this.enterRule(localContext, 54, VeroParser.RULE_withFixtureStatement);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 366;
            this.match(VeroParser.WITH);
            this.state = 367;
            this.match(VeroParser.FIXTURE);
            this.state = 368;
            this.match(VeroParser.IDENTIFIER);
            this.state = 370;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 114) {
                {
                this.state = 369;
                this.fixtureOptionsBlock();
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
    public fixtureOptionsBlock(): FixtureOptionsBlockContext {
        let localContext = new FixtureOptionsBlockContext(this.context, this.state);
        this.enterRule(localContext, 56, VeroParser.RULE_fixtureOptionsBlock);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 372;
            this.match(VeroParser.LBRACE);
            this.state = 373;
            this.fixtureOption();
            this.state = 378;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 120) {
                {
                {
                this.state = 374;
                this.match(VeroParser.COMMA);
                this.state = 375;
                this.fixtureOption();
                }
                }
                this.state = 380;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 381;
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
    public fixtureOption(): FixtureOptionContext {
        let localContext = new FixtureOptionContext(this.context, this.state);
        this.enterRule(localContext, 58, VeroParser.RULE_fixtureOption);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 383;
            this.match(VeroParser.IDENTIFIER);
            this.state = 384;
            this.match(VeroParser.EQUALS);
            this.state = 385;
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
    public statement(): StatementContext {
        let localContext = new StatementContext(this.context, this.state);
        this.enterRule(localContext, 60, VeroParser.RULE_statement);
        try {
            this.state = 393;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 21, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 387;
                this.actionStatement();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 388;
                this.assertionStatement();
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 389;
                this.controlFlowStatement();
                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 390;
                this.variableDeclaration();
                }
                break;
            case 5:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 391;
                this.dataQueryStatement();
                }
                break;
            case 6:
                this.enterOuterAlt(localContext, 6);
                {
                this.state = 392;
                this.returnStatement();
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
    public actionStatement(): ActionStatementContext {
        let localContext = new ActionStatementContext(this.context, this.state);
        this.enterRule(localContext, 62, VeroParser.RULE_actionStatement);
        try {
            this.state = 411;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.CLICK:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 395;
                this.clickAction();
                }
                break;
            case VeroParser.FILL:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 396;
                this.fillAction();
                }
                break;
            case VeroParser.OPEN:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 397;
                this.openAction();
                }
                break;
            case VeroParser.CHECK:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 398;
                this.checkAction();
                }
                break;
            case VeroParser.UNCHECK:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 399;
                this.uncheckAction();
                }
                break;
            case VeroParser.SELECT:
                this.enterOuterAlt(localContext, 6);
                {
                this.state = 400;
                this.selectAction();
                }
                break;
            case VeroParser.HOVER:
                this.enterOuterAlt(localContext, 7);
                {
                this.state = 401;
                this.hoverAction();
                }
                break;
            case VeroParser.PRESS:
                this.enterOuterAlt(localContext, 8);
                {
                this.state = 402;
                this.pressAction();
                }
                break;
            case VeroParser.SCROLL:
                this.enterOuterAlt(localContext, 9);
                {
                this.state = 403;
                this.scrollAction();
                }
                break;
            case VeroParser.WAIT:
                this.enterOuterAlt(localContext, 10);
                {
                this.state = 404;
                this.waitAction();
                }
                break;
            case VeroParser.DO:
                this.enterOuterAlt(localContext, 11);
                {
                this.state = 405;
                this.doAction();
                }
                break;
            case VeroParser.REFRESH:
                this.enterOuterAlt(localContext, 12);
                {
                this.state = 406;
                this.refreshAction();
                }
                break;
            case VeroParser.CLEAR:
                this.enterOuterAlt(localContext, 13);
                {
                this.state = 407;
                this.clearAction();
                }
                break;
            case VeroParser.TAKE:
                this.enterOuterAlt(localContext, 14);
                {
                this.state = 408;
                this.screenshotAction();
                }
                break;
            case VeroParser.LOG:
                this.enterOuterAlt(localContext, 15);
                {
                this.state = 409;
                this.logAction();
                }
                break;
            case VeroParser.UPLOAD:
                this.enterOuterAlt(localContext, 16);
                {
                this.state = 410;
                this.uploadAction();
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
        this.enterRule(localContext, 64, VeroParser.RULE_clickAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 413;
            this.match(VeroParser.CLICK);
            this.state = 414;
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
        this.enterRule(localContext, 66, VeroParser.RULE_fillAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 416;
            this.match(VeroParser.FILL);
            this.state = 417;
            this.selectorExpression();
            this.state = 418;
            this.match(VeroParser.WITH);
            this.state = 419;
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
        this.enterRule(localContext, 68, VeroParser.RULE_openAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 421;
            this.match(VeroParser.OPEN);
            this.state = 422;
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
        this.enterRule(localContext, 70, VeroParser.RULE_checkAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 424;
            this.match(VeroParser.CHECK);
            this.state = 425;
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
        this.enterRule(localContext, 72, VeroParser.RULE_uncheckAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 427;
            this.match(VeroParser.UNCHECK);
            this.state = 428;
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
        this.enterRule(localContext, 74, VeroParser.RULE_selectAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 430;
            this.match(VeroParser.SELECT);
            this.state = 431;
            this.expression();
            this.state = 432;
            this.match(VeroParser.FROM);
            this.state = 433;
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
        this.enterRule(localContext, 76, VeroParser.RULE_hoverAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 435;
            this.match(VeroParser.HOVER);
            this.state = 436;
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
        this.enterRule(localContext, 78, VeroParser.RULE_pressAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 438;
            this.match(VeroParser.PRESS);
            this.state = 439;
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
        this.enterRule(localContext, 80, VeroParser.RULE_scrollAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 441;
            this.match(VeroParser.SCROLL);
            this.state = 445;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.TO:
                {
                this.state = 442;
                this.match(VeroParser.TO);
                this.state = 443;
                this.selectorExpression();
                }
                break;
            case VeroParser.UP:
            case VeroParser.DOWN:
            case VeroParser.LEFT:
            case VeroParser.RIGHT:
                {
                this.state = 444;
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
        this.enterRule(localContext, 82, VeroParser.RULE_direction);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 447;
            _la = this.tokenStream.LA(1);
            if(!(((((_la - 110)) & ~0x1F) === 0 && ((1 << (_la - 110)) & 15) !== 0))) {
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
        this.enterRule(localContext, 84, VeroParser.RULE_waitAction);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 449;
            this.match(VeroParser.WAIT);
            this.state = 455;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.LPAREN:
            case VeroParser.STRING_LITERAL:
            case VeroParser.NUMBER_LITERAL:
            case VeroParser.IDENTIFIER:
                {
                this.state = 450;
                this.expression();
                this.state = 451;
                _la = this.tokenStream.LA(1);
                if(!(_la === 108 || _la === 109)) {
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
                this.state = 453;
                this.match(VeroParser.FOR);
                this.state = 454;
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
        this.enterRule(localContext, 86, VeroParser.RULE_doAction);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 457;
            this.match(VeroParser.DO);
            this.state = 458;
            this.pageMethodReference();
            this.state = 461;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 15) {
                {
                this.state = 459;
                this.match(VeroParser.WITH);
                this.state = 460;
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
        this.enterRule(localContext, 88, VeroParser.RULE_refreshAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 463;
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
        this.enterRule(localContext, 90, VeroParser.RULE_clearAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 465;
            this.match(VeroParser.CLEAR);
            this.state = 466;
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
        this.enterRule(localContext, 92, VeroParser.RULE_screenshotAction);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 468;
            this.match(VeroParser.TAKE);
            this.state = 469;
            this.match(VeroParser.SCREENSHOT);
            this.state = 471;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (((((_la - 116)) & ~0x1F) === 0 && ((1 << (_la - 116)) & 229377) !== 0)) {
                {
                this.state = 470;
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
        this.enterRule(localContext, 94, VeroParser.RULE_logAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 473;
            this.match(VeroParser.LOG);
            this.state = 474;
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
    public uploadAction(): UploadActionContext {
        let localContext = new UploadActionContext(this.context, this.state);
        this.enterRule(localContext, 96, VeroParser.RULE_uploadAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 476;
            this.match(VeroParser.UPLOAD);
            this.state = 477;
            this.fileList();
            this.state = 478;
            this.match(VeroParser.TO);
            this.state = 479;
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
    public fileList(): FileListContext {
        let localContext = new FileListContext(this.context, this.state);
        this.enterRule(localContext, 98, VeroParser.RULE_fileList);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 481;
            this.expression();
            this.state = 486;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 120) {
                {
                {
                this.state = 482;
                this.match(VeroParser.COMMA);
                this.state = 483;
                this.expression();
                }
                }
                this.state = 488;
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
    public assertionStatement(): AssertionStatementContext {
        let localContext = new AssertionStatementContext(this.context, this.state);
        this.enterRule(localContext, 100, VeroParser.RULE_assertionStatement);
        let _la: number;
        try {
            this.state = 505;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 28, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 489;
                this.match(VeroParser.VERIFY);
                this.state = 490;
                this.selectorOrText();
                this.state = 491;
                _la = this.tokenStream.LA(1);
                if(!(_la === 53 || _la === 54)) {
                this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                this.state = 492;
                this.condition();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 494;
                this.match(VeroParser.VERIFY);
                this.state = 495;
                this.match(VeroParser.URL);
                this.state = 496;
                this.urlCondition();
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 497;
                this.match(VeroParser.VERIFY);
                this.state = 498;
                this.match(VeroParser.TITLE);
                this.state = 499;
                this.titleCondition();
                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 500;
                this.match(VeroParser.VERIFY);
                this.state = 501;
                this.selectorExpression();
                this.state = 502;
                this.match(VeroParser.HAS);
                this.state = 503;
                this.hasCondition();
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
    public selectorOrText(): SelectorOrTextContext {
        let localContext = new SelectorOrTextContext(this.context, this.state);
        this.enterRule(localContext, 102, VeroParser.RULE_selectorOrText);
        try {
            this.state = 509;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 29, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 507;
                this.selectorExpression();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 508;
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
        this.enterRule(localContext, 104, VeroParser.RULE_condition);
        try {
            this.state = 518;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.VISIBLE:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 511;
                this.match(VeroParser.VISIBLE);
                }
                break;
            case VeroParser.HIDDEN_STATE:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 512;
                this.match(VeroParser.HIDDEN_STATE);
                }
                break;
            case VeroParser.ENABLED:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 513;
                this.match(VeroParser.ENABLED);
                }
                break;
            case VeroParser.DISABLED:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 514;
                this.match(VeroParser.DISABLED);
                }
                break;
            case VeroParser.CHECKED:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 515;
                this.match(VeroParser.CHECKED);
                }
                break;
            case VeroParser.EMPTY:
                this.enterOuterAlt(localContext, 6);
                {
                this.state = 516;
                this.match(VeroParser.EMPTY);
                }
                break;
            case VeroParser.CONTAINS:
                this.enterOuterAlt(localContext, 7);
                {
                this.state = 517;
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
        this.enterRule(localContext, 106, VeroParser.RULE_containsCondition);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 520;
            this.match(VeroParser.CONTAINS);
            this.state = 521;
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
    public urlCondition(): UrlConditionContext {
        let localContext = new UrlConditionContext(this.context, this.state);
        this.enterRule(localContext, 108, VeroParser.RULE_urlCondition);
        try {
            this.state = 529;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.CONTAINS:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 523;
                this.match(VeroParser.CONTAINS);
                this.state = 524;
                this.expression();
                }
                break;
            case VeroParser.EQUAL:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 525;
                this.match(VeroParser.EQUAL);
                this.state = 526;
                this.expression();
                }
                break;
            case VeroParser.MATCHES:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 527;
                this.match(VeroParser.MATCHES);
                this.state = 528;
                this.expression();
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
    public titleCondition(): TitleConditionContext {
        let localContext = new TitleConditionContext(this.context, this.state);
        this.enterRule(localContext, 110, VeroParser.RULE_titleCondition);
        try {
            this.state = 535;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.CONTAINS:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 531;
                this.match(VeroParser.CONTAINS);
                this.state = 532;
                this.expression();
                }
                break;
            case VeroParser.EQUAL:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 533;
                this.match(VeroParser.EQUAL);
                this.state = 534;
                this.expression();
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
    public hasCondition(): HasConditionContext {
        let localContext = new HasConditionContext(this.context, this.state);
        this.enterRule(localContext, 112, VeroParser.RULE_hasCondition);
        try {
            this.state = 546;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.COUNT:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 537;
                this.match(VeroParser.COUNT);
                this.state = 538;
                this.expression();
                }
                break;
            case VeroParser.VALUE:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 539;
                this.match(VeroParser.VALUE);
                this.state = 540;
                this.expression();
                }
                break;
            case VeroParser.ATTRIBUTE:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 541;
                this.match(VeroParser.ATTRIBUTE);
                this.state = 542;
                this.expression();
                this.state = 543;
                this.match(VeroParser.EQUAL);
                this.state = 544;
                this.expression();
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
    public controlFlowStatement(): ControlFlowStatementContext {
        let localContext = new ControlFlowStatementContext(this.context, this.state);
        this.enterRule(localContext, 114, VeroParser.RULE_controlFlowStatement);
        try {
            this.state = 550;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.IF:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 548;
                this.ifStatement();
                }
                break;
            case VeroParser.REPEAT:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 549;
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
        this.enterRule(localContext, 116, VeroParser.RULE_ifStatement);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 552;
            this.match(VeroParser.IF);
            this.state = 553;
            this.booleanExpression();
            this.state = 554;
            this.match(VeroParser.LBRACE);
            this.state = 558;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (((((_la - 20)) & ~0x1F) === 0 && ((1 << (_la - 20)) & 1879036929) !== 0) || ((((_la - 52)) & ~0x1F) === 0 && ((1 << (_la - 52)) & 4063233) !== 0)) {
                {
                {
                this.state = 555;
                this.statement();
                }
                }
                this.state = 560;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 561;
            this.match(VeroParser.RBRACE);
            this.state = 571;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 31) {
                {
                this.state = 562;
                this.match(VeroParser.ELSE);
                this.state = 563;
                this.match(VeroParser.LBRACE);
                this.state = 567;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                while (((((_la - 20)) & ~0x1F) === 0 && ((1 << (_la - 20)) & 1879036929) !== 0) || ((((_la - 52)) & ~0x1F) === 0 && ((1 << (_la - 52)) & 4063233) !== 0)) {
                    {
                    {
                    this.state = 564;
                    this.statement();
                    }
                    }
                    this.state = 569;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                }
                this.state = 570;
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
        this.enterRule(localContext, 118, VeroParser.RULE_repeatStatement);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 573;
            this.match(VeroParser.REPEAT);
            this.state = 574;
            this.expression();
            this.state = 575;
            this.match(VeroParser.TIMES);
            this.state = 576;
            this.match(VeroParser.LBRACE);
            this.state = 580;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (((((_la - 20)) & ~0x1F) === 0 && ((1 << (_la - 20)) & 1879036929) !== 0) || ((((_la - 52)) & ~0x1F) === 0 && ((1 << (_la - 52)) & 4063233) !== 0)) {
                {
                {
                this.state = 577;
                this.statement();
                }
                }
                this.state = 582;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 583;
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
        this.enterRule(localContext, 120, VeroParser.RULE_booleanExpression);
        try {
            this.state = 598;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 39, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 585;
                this.selectorExpression();
                this.state = 586;
                this.match(VeroParser.IS);
                this.state = 587;
                this.condition();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 589;
                this.selectorExpression();
                this.state = 590;
                this.match(VeroParser.ISNOT);
                this.state = 591;
                this.condition();
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 593;
                this.expression();
                this.state = 594;
                this.comparisonOperator();
                this.state = 595;
                this.expression();
                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 597;
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
        this.enterRule(localContext, 122, VeroParser.RULE_comparisonOperator);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 600;
            _la = this.tokenStream.LA(1);
            if(!(((((_la - 125)) & ~0x1F) === 0 && ((1 << (_la - 125)) & 63) !== 0))) {
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
        this.enterRule(localContext, 124, VeroParser.RULE_variableDeclaration);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 602;
            this.variableType();
            this.state = 603;
            this.match(VeroParser.IDENTIFIER);
            this.state = 604;
            this.match(VeroParser.EQUALS);
            this.state = 605;
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
        this.enterRule(localContext, 126, VeroParser.RULE_variableType);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 607;
            _la = this.tokenStream.LA(1);
            if(!(((((_la - 69)) & ~0x1F) === 0 && ((1 << (_la - 69)) & 31) !== 0))) {
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
        this.enterRule(localContext, 128, VeroParser.RULE_returnStatement);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 609;
            this.match(VeroParser.RETURN);
            this.state = 611;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (((((_la - 116)) & ~0x1F) === 0 && ((1 << (_la - 116)) & 229377) !== 0)) {
                {
                this.state = 610;
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
    public dataQueryStatement(): DataQueryStatementContext {
        let localContext = new DataQueryStatementContext(this.context, this.state);
        this.enterRule(localContext, 130, VeroParser.RULE_dataQueryStatement);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 613;
            this.dataResultType();
            this.state = 614;
            this.match(VeroParser.IDENTIFIER);
            this.state = 615;
            this.match(VeroParser.EQUALS);
            this.state = 616;
            this.dataQuery();
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
    public dataResultType(): DataResultTypeContext {
        let localContext = new DataResultTypeContext(this.context, this.state);
        this.enterRule(localContext, 132, VeroParser.RULE_dataResultType);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 618;
            _la = this.tokenStream.LA(1);
            if(!(((((_la - 69)) & ~0x1F) === 0 && ((1 << (_la - 69)) & 31) !== 0))) {
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
    public dataQuery(): DataQueryContext {
        let localContext = new DataQueryContext(this.context, this.state);
        this.enterRule(localContext, 134, VeroParser.RULE_dataQuery);
        try {
            this.state = 622;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.COUNT:
            case VeroParser.SUM:
            case VeroParser.AVERAGE:
            case VeroParser.MIN:
            case VeroParser.MAX:
            case VeroParser.DISTINCT:
            case VeroParser.ROWS:
            case VeroParser.COLUMNS:
            case VeroParser.HEADERS:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 620;
                this.aggregationQuery();
                }
                break;
            case VeroParser.TESTDATA:
            case VeroParser.FIRST:
            case VeroParser.LAST:
            case VeroParser.RANDOM:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 621;
                this.tableQuery();
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
    public aggregationQuery(): AggregationQueryContext {
        let localContext = new AggregationQueryContext(this.context, this.state);
        this.enterRule(localContext, 136, VeroParser.RULE_aggregationQuery);
        let _la: number;
        try {
            this.state = 669;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 49, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 624;
                this.match(VeroParser.COUNT);
                this.state = 625;
                this.tableReference();
                this.state = 627;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 75) {
                    {
                    this.state = 626;
                    this.dataWhereClause();
                    }
                }

                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 629;
                this.match(VeroParser.COUNT);
                this.state = 630;
                this.match(VeroParser.DISTINCT);
                this.state = 631;
                this.columnReference();
                this.state = 633;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 75) {
                    {
                    this.state = 632;
                    this.dataWhereClause();
                    }
                }

                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 635;
                this.match(VeroParser.SUM);
                this.state = 636;
                this.columnReference();
                this.state = 638;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 75) {
                    {
                    this.state = 637;
                    this.dataWhereClause();
                    }
                }

                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 640;
                this.match(VeroParser.AVERAGE);
                this.state = 641;
                this.columnReference();
                this.state = 643;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 75) {
                    {
                    this.state = 642;
                    this.dataWhereClause();
                    }
                }

                }
                break;
            case 5:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 645;
                this.match(VeroParser.MIN);
                this.state = 646;
                this.columnReference();
                this.state = 648;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 75) {
                    {
                    this.state = 647;
                    this.dataWhereClause();
                    }
                }

                }
                break;
            case 6:
                this.enterOuterAlt(localContext, 6);
                {
                this.state = 650;
                this.match(VeroParser.MAX);
                this.state = 651;
                this.columnReference();
                this.state = 653;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 75) {
                    {
                    this.state = 652;
                    this.dataWhereClause();
                    }
                }

                }
                break;
            case 7:
                this.enterOuterAlt(localContext, 7);
                {
                this.state = 655;
                this.match(VeroParser.DISTINCT);
                this.state = 656;
                this.columnReference();
                this.state = 658;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 75) {
                    {
                    this.state = 657;
                    this.dataWhereClause();
                    }
                }

                }
                break;
            case 8:
                this.enterOuterAlt(localContext, 8);
                {
                this.state = 660;
                this.match(VeroParser.ROWS);
                this.state = 661;
                this.match(VeroParser.IN);
                this.state = 662;
                this.tableReference();
                }
                break;
            case 9:
                this.enterOuterAlt(localContext, 9);
                {
                this.state = 663;
                this.match(VeroParser.COLUMNS);
                this.state = 664;
                this.match(VeroParser.IN);
                this.state = 665;
                this.tableReference();
                }
                break;
            case 10:
                this.enterOuterAlt(localContext, 10);
                {
                this.state = 666;
                this.match(VeroParser.HEADERS);
                this.state = 667;
                this.match(VeroParser.OF);
                this.state = 668;
                this.tableReference();
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
    public tableQuery(): TableQueryContext {
        let localContext = new TableQueryContext(this.context, this.state);
        this.enterRule(localContext, 138, VeroParser.RULE_tableQuery);
        let _la: number;
        try {
            this.state = 692;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 54, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 672;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (((((_la - 82)) & ~0x1F) === 0 && ((1 << (_la - 82)) & 7) !== 0)) {
                    {
                    this.state = 671;
                    _la = this.tokenStream.LA(1);
                    if(!(((((_la - 82)) & ~0x1F) === 0 && ((1 << (_la - 82)) & 7) !== 0))) {
                    this.errorHandler.recoverInline(this);
                    }
                    else {
                        this.errorHandler.reportMatch(this);
                        this.consume();
                    }
                    }
                }

                this.state = 674;
                this.tableReference();
                this.state = 678;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                while (((((_la - 75)) & ~0x1F) === 0 && ((1 << (_la - 75)) & 1123) !== 0)) {
                    {
                    {
                    this.state = 675;
                    this.queryModifier();
                    }
                    }
                    this.state = 680;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                }
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 682;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (((((_la - 82)) & ~0x1F) === 0 && ((1 << (_la - 82)) & 7) !== 0)) {
                    {
                    this.state = 681;
                    _la = this.tokenStream.LA(1);
                    if(!(((((_la - 82)) & ~0x1F) === 0 && ((1 << (_la - 82)) & 7) !== 0))) {
                    this.errorHandler.recoverInline(this);
                    }
                    else {
                        this.errorHandler.reportMatch(this);
                        this.consume();
                    }
                    }
                }

                this.state = 684;
                this.tableReference();
                this.state = 685;
                this.columnSelector();
                this.state = 689;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                while (((((_la - 75)) & ~0x1F) === 0 && ((1 << (_la - 75)) & 1123) !== 0)) {
                    {
                    {
                    this.state = 686;
                    this.queryModifier();
                    }
                    }
                    this.state = 691;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                }
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
    public tableReference(): TableReferenceContext {
        let localContext = new TableReferenceContext(this.context, this.state);
        this.enterRule(localContext, 140, VeroParser.RULE_tableReference);
        try {
            this.state = 737;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 55, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 694;
                this.match(VeroParser.TESTDATA);
                this.state = 695;
                this.match(VeroParser.DOT);
                this.state = 696;
                this.match(VeroParser.IDENTIFIER);
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 697;
                this.match(VeroParser.TESTDATA);
                this.state = 698;
                this.match(VeroParser.DOT);
                this.state = 699;
                this.match(VeroParser.IDENTIFIER);
                this.state = 700;
                this.match(VeroParser.DOT);
                this.state = 701;
                this.match(VeroParser.IDENTIFIER);
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 702;
                this.match(VeroParser.TESTDATA);
                this.state = 703;
                this.match(VeroParser.DOT);
                this.state = 704;
                this.match(VeroParser.IDENTIFIER);
                this.state = 705;
                this.match(VeroParser.LBRACK);
                this.state = 706;
                this.expression();
                this.state = 707;
                this.match(VeroParser.RBRACK);
                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 709;
                this.match(VeroParser.TESTDATA);
                this.state = 710;
                this.match(VeroParser.DOT);
                this.state = 711;
                this.match(VeroParser.IDENTIFIER);
                this.state = 712;
                this.match(VeroParser.LBRACK);
                this.state = 713;
                this.expression();
                this.state = 714;
                this.match(VeroParser.RBRACK);
                this.state = 715;
                this.match(VeroParser.DOT);
                this.state = 716;
                this.match(VeroParser.IDENTIFIER);
                }
                break;
            case 5:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 718;
                this.match(VeroParser.TESTDATA);
                this.state = 719;
                this.match(VeroParser.DOT);
                this.state = 720;
                this.match(VeroParser.IDENTIFIER);
                this.state = 721;
                this.match(VeroParser.LBRACK);
                this.state = 722;
                this.expression();
                this.state = 723;
                this.match(VeroParser.DOTDOT);
                this.state = 724;
                this.expression();
                this.state = 725;
                this.match(VeroParser.RBRACK);
                }
                break;
            case 6:
                this.enterOuterAlt(localContext, 6);
                {
                this.state = 727;
                this.match(VeroParser.TESTDATA);
                this.state = 728;
                this.match(VeroParser.DOT);
                this.state = 729;
                this.match(VeroParser.IDENTIFIER);
                this.state = 730;
                this.match(VeroParser.CELL);
                this.state = 731;
                this.match(VeroParser.LBRACK);
                this.state = 732;
                this.expression();
                this.state = 733;
                this.match(VeroParser.COMMA);
                this.state = 734;
                this.expression();
                this.state = 735;
                this.match(VeroParser.RBRACK);
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
    public columnSelector(): ColumnSelectorContext {
        let localContext = new ColumnSelectorContext(this.context, this.state);
        this.enterRule(localContext, 142, VeroParser.RULE_columnSelector);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 739;
            this.match(VeroParser.DOT);
            this.state = 740;
            this.match(VeroParser.LPAREN);
            this.state = 741;
            this.identifierList();
            this.state = 742;
            this.match(VeroParser.RPAREN);
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
    public identifierList(): IdentifierListContext {
        let localContext = new IdentifierListContext(this.context, this.state);
        this.enterRule(localContext, 144, VeroParser.RULE_identifierList);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 744;
            this.match(VeroParser.IDENTIFIER);
            this.state = 749;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 120) {
                {
                {
                this.state = 745;
                this.match(VeroParser.COMMA);
                this.state = 746;
                this.match(VeroParser.IDENTIFIER);
                }
                }
                this.state = 751;
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
    public columnReference(): ColumnReferenceContext {
        let localContext = new ColumnReferenceContext(this.context, this.state);
        this.enterRule(localContext, 146, VeroParser.RULE_columnReference);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 752;
            this.match(VeroParser.TESTDATA);
            this.state = 753;
            this.match(VeroParser.DOT);
            this.state = 754;
            this.match(VeroParser.IDENTIFIER);
            this.state = 755;
            this.match(VeroParser.DOT);
            this.state = 756;
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
    public queryModifier(): QueryModifierContext {
        let localContext = new QueryModifierContext(this.context, this.state);
        this.enterRule(localContext, 148, VeroParser.RULE_queryModifier);
        try {
            this.state = 763;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.WHERE:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 758;
                this.dataWhereClause();
                }
                break;
            case VeroParser.ORDER:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 759;
                this.orderByClause();
                }
                break;
            case VeroParser.LIMIT:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 760;
                this.limitClause();
                }
                break;
            case VeroParser.OFFSET:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 761;
                this.offsetClause();
                }
                break;
            case VeroParser.DEFAULT:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 762;
                this.defaultClause();
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
    public dataWhereClause(): DataWhereClauseContext {
        let localContext = new DataWhereClauseContext(this.context, this.state);
        this.enterRule(localContext, 150, VeroParser.RULE_dataWhereClause);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 765;
            this.match(VeroParser.WHERE);
            this.state = 766;
            this.dataCondition(0);
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

    public dataCondition(): DataConditionContext;
    public dataCondition(_p: number): DataConditionContext;
    public dataCondition(_p?: number): DataConditionContext {
        if (_p === undefined) {
            _p = 0;
        }

        let parentContext = this.context;
        let parentState = this.state;
        let localContext = new DataConditionContext(this.context, parentState);
        let previousContext = localContext;
        let _startState = 152;
        this.enterRecursionRule(localContext, 152, VeroParser.RULE_dataCondition, _p);
        try {
            let alternative: number;
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 776;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.NOT:
                {
                this.state = 769;
                this.match(VeroParser.NOT);
                this.state = 770;
                this.dataCondition(3);
                }
                break;
            case VeroParser.LPAREN:
                {
                this.state = 771;
                this.match(VeroParser.LPAREN);
                this.state = 772;
                this.dataCondition(0);
                this.state = 773;
                this.match(VeroParser.RPAREN);
                }
                break;
            case VeroParser.IDENTIFIER:
                {
                this.state = 775;
                this.dataComparison();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
            this.context!.stop = this.tokenStream.LT(-1);
            this.state = 786;
            this.errorHandler.sync(this);
            alternative = this.interpreter.adaptivePredict(this.tokenStream, 60, this.context);
            while (alternative !== 2 && alternative !== antlr.ATN.INVALID_ALT_NUMBER) {
                if (alternative === 1) {
                    if (this.parseListeners != null) {
                        this.triggerExitRuleEvent();
                    }
                    previousContext = localContext;
                    {
                    this.state = 784;
                    this.errorHandler.sync(this);
                    switch (this.interpreter.adaptivePredict(this.tokenStream, 59, this.context) ) {
                    case 1:
                        {
                        localContext = new DataConditionContext(parentContext, parentState);
                        this.pushNewRecursionContext(localContext, _startState, VeroParser.RULE_dataCondition);
                        this.state = 778;
                        if (!(this.precpred(this.context, 5))) {
                            throw this.createFailedPredicateException("this.precpred(this.context, 5)");
                        }
                        this.state = 779;
                        this.match(VeroParser.AND);
                        this.state = 780;
                        this.dataCondition(6);
                        }
                        break;
                    case 2:
                        {
                        localContext = new DataConditionContext(parentContext, parentState);
                        this.pushNewRecursionContext(localContext, _startState, VeroParser.RULE_dataCondition);
                        this.state = 781;
                        if (!(this.precpred(this.context, 4))) {
                            throw this.createFailedPredicateException("this.precpred(this.context, 4)");
                        }
                        this.state = 782;
                        this.match(VeroParser.OR);
                        this.state = 783;
                        this.dataCondition(5);
                        }
                        break;
                    }
                    }
                }
                this.state = 788;
                this.errorHandler.sync(this);
                alternative = this.interpreter.adaptivePredict(this.tokenStream, 60, this.context);
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
            this.unrollRecursionContexts(parentContext);
        }
        return localContext;
    }
    public dataComparison(): DataComparisonContext {
        let localContext = new DataComparisonContext(this.context, this.state);
        this.enterRule(localContext, 154, VeroParser.RULE_dataComparison);
        try {
            this.state = 821;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 61, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 789;
                this.match(VeroParser.IDENTIFIER);
                this.state = 790;
                this.comparisonOperator();
                this.state = 791;
                this.expression();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 793;
                this.match(VeroParser.IDENTIFIER);
                this.state = 794;
                this.textOperator();
                this.state = 795;
                this.expression();
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 797;
                this.match(VeroParser.IDENTIFIER);
                this.state = 798;
                this.match(VeroParser.IN);
                this.state = 799;
                this.match(VeroParser.LBRACK);
                this.state = 800;
                this.expressionList();
                this.state = 801;
                this.match(VeroParser.RBRACK);
                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 803;
                this.match(VeroParser.IDENTIFIER);
                this.state = 804;
                this.match(VeroParser.NOT);
                this.state = 805;
                this.match(VeroParser.IN);
                this.state = 806;
                this.match(VeroParser.LBRACK);
                this.state = 807;
                this.expressionList();
                this.state = 808;
                this.match(VeroParser.RBRACK);
                }
                break;
            case 5:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 810;
                this.match(VeroParser.IDENTIFIER);
                this.state = 811;
                this.match(VeroParser.IS);
                this.state = 812;
                this.match(VeroParser.EMPTY);
                }
                break;
            case 6:
                this.enterOuterAlt(localContext, 6);
                {
                this.state = 813;
                this.match(VeroParser.IDENTIFIER);
                this.state = 814;
                this.match(VeroParser.ISNOT);
                this.state = 815;
                this.match(VeroParser.EMPTY);
                }
                break;
            case 7:
                this.enterOuterAlt(localContext, 7);
                {
                this.state = 816;
                this.match(VeroParser.IDENTIFIER);
                this.state = 817;
                this.match(VeroParser.IS);
                this.state = 818;
                this.match(VeroParser.NULL_);
                }
                break;
            case 8:
                this.enterOuterAlt(localContext, 8);
                {
                this.state = 819;
                this.match(VeroParser.IDENTIFIER);
                this.state = 820;
                this.dateComparison();
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
    public textOperator(): TextOperatorContext {
        let localContext = new TextOperatorContext(this.context, this.state);
        this.enterRule(localContext, 156, VeroParser.RULE_textOperator);
        try {
            this.state = 829;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.CONTAINS:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 823;
                this.match(VeroParser.CONTAINS);
                }
                break;
            case VeroParser.STARTS:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 824;
                this.match(VeroParser.STARTS);
                this.state = 825;
                this.match(VeroParser.WITH);
                }
                break;
            case VeroParser.ENDS:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 826;
                this.match(VeroParser.ENDS);
                this.state = 827;
                this.match(VeroParser.WITH);
                }
                break;
            case VeroParser.MATCHES:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 828;
                this.match(VeroParser.MATCHES);
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
    public dateComparison(): DateComparisonContext {
        let localContext = new DateComparisonContext(this.context, this.state);
        this.enterRule(localContext, 158, VeroParser.RULE_dateComparison);
        try {
            this.state = 849;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 63, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 831;
                this.comparisonOperator();
                this.state = 832;
                this.match(VeroParser.TODAY);
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 834;
                this.comparisonOperator();
                this.state = 835;
                this.match(VeroParser.DAYS);
                this.state = 836;
                this.match(VeroParser.AGO);
                this.state = 837;
                this.expression();
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 839;
                this.comparisonOperator();
                this.state = 840;
                this.match(VeroParser.MONTHS);
                this.state = 841;
                this.match(VeroParser.AGO);
                this.state = 842;
                this.expression();
                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 844;
                this.comparisonOperator();
                this.state = 845;
                this.match(VeroParser.YEARS);
                this.state = 846;
                this.match(VeroParser.AGO);
                this.state = 847;
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
    public expressionList(): ExpressionListContext {
        let localContext = new ExpressionListContext(this.context, this.state);
        this.enterRule(localContext, 160, VeroParser.RULE_expressionList);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 851;
            this.expression();
            this.state = 856;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 120) {
                {
                {
                this.state = 852;
                this.match(VeroParser.COMMA);
                this.state = 853;
                this.expression();
                }
                }
                this.state = 858;
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
    public orderByClause(): OrderByClauseContext {
        let localContext = new OrderByClauseContext(this.context, this.state);
        this.enterRule(localContext, 162, VeroParser.RULE_orderByClause);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 859;
            this.match(VeroParser.ORDER);
            this.state = 860;
            this.match(VeroParser.BY);
            this.state = 861;
            this.orderColumn();
            this.state = 866;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 120) {
                {
                {
                this.state = 862;
                this.match(VeroParser.COMMA);
                this.state = 863;
                this.orderColumn();
                }
                }
                this.state = 868;
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
    public orderColumn(): OrderColumnContext {
        let localContext = new OrderColumnContext(this.context, this.state);
        this.enterRule(localContext, 164, VeroParser.RULE_orderColumn);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 869;
            this.match(VeroParser.IDENTIFIER);
            this.state = 871;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 78 || _la === 79) {
                {
                this.state = 870;
                _la = this.tokenStream.LA(1);
                if(!(_la === 78 || _la === 79)) {
                this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
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
    public limitClause(): LimitClauseContext {
        let localContext = new LimitClauseContext(this.context, this.state);
        this.enterRule(localContext, 166, VeroParser.RULE_limitClause);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 873;
            this.match(VeroParser.LIMIT);
            this.state = 874;
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
    public offsetClause(): OffsetClauseContext {
        let localContext = new OffsetClauseContext(this.context, this.state);
        this.enterRule(localContext, 168, VeroParser.RULE_offsetClause);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 876;
            this.match(VeroParser.OFFSET);
            this.state = 877;
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
    public defaultClause(): DefaultClauseContext {
        let localContext = new DefaultClauseContext(this.context, this.state);
        this.enterRule(localContext, 170, VeroParser.RULE_defaultClause);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 879;
            this.match(VeroParser.DEFAULT);
            this.state = 880;
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
    public expression(): ExpressionContext {
        let localContext = new ExpressionContext(this.context, this.state);
        this.enterRule(localContext, 172, VeroParser.RULE_expression);
        try {
            this.state = 890;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 67, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 882;
                this.match(VeroParser.STRING_LITERAL);
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 883;
                this.match(VeroParser.NUMBER_LITERAL);
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 884;
                this.match(VeroParser.IDENTIFIER);
                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 885;
                this.pageMethodReference();
                }
                break;
            case 5:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 886;
                this.match(VeroParser.LPAREN);
                this.state = 887;
                this.expression();
                this.state = 888;
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
        this.enterRule(localContext, 174, VeroParser.RULE_selectorExpression);
        try {
            this.state = 895;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 68, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 892;
                this.pageFieldReference();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 893;
                this.match(VeroParser.STRING_LITERAL);
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 894;
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
        this.enterRule(localContext, 176, VeroParser.RULE_pageMethodReference);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 897;
            this.match(VeroParser.IDENTIFIER);
            this.state = 898;
            this.match(VeroParser.DOT);
            this.state = 899;
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
        this.enterRule(localContext, 178, VeroParser.RULE_pageFieldReference);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 901;
            this.match(VeroParser.IDENTIFIER);
            this.state = 902;
            this.match(VeroParser.DOT);
            this.state = 903;
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
        this.enterRule(localContext, 180, VeroParser.RULE_argumentList);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 905;
            this.expression();
            this.state = 910;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 120) {
                {
                {
                this.state = 906;
                this.match(VeroParser.COMMA);
                this.state = 907;
                this.expression();
                }
                }
                this.state = 912;
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

    public override sempred(localContext: antlr.ParserRuleContext | null, ruleIndex: number, predIndex: number): boolean {
        switch (ruleIndex) {
        case 76:
            return this.dataCondition_sempred(localContext as DataConditionContext, predIndex);
        }
        return true;
    }
    private dataCondition_sempred(localContext: DataConditionContext | null, predIndex: number): boolean {
        switch (predIndex) {
        case 0:
            return this.precpred(this.context, 5);
        case 1:
            return this.precpred(this.context, 4);
        }
        return true;
    }

    public static readonly _serializedATN: number[] = [
        4,1,136,914,2,0,7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,
        7,6,2,7,7,7,2,8,7,8,2,9,7,9,2,10,7,10,2,11,7,11,2,12,7,12,2,13,7,
        13,2,14,7,14,2,15,7,15,2,16,7,16,2,17,7,17,2,18,7,18,2,19,7,19,2,
        20,7,20,2,21,7,21,2,22,7,22,2,23,7,23,2,24,7,24,2,25,7,25,2,26,7,
        26,2,27,7,27,2,28,7,28,2,29,7,29,2,30,7,30,2,31,7,31,2,32,7,32,2,
        33,7,33,2,34,7,34,2,35,7,35,2,36,7,36,2,37,7,37,2,38,7,38,2,39,7,
        39,2,40,7,40,2,41,7,41,2,42,7,42,2,43,7,43,2,44,7,44,2,45,7,45,2,
        46,7,46,2,47,7,47,2,48,7,48,2,49,7,49,2,50,7,50,2,51,7,51,2,52,7,
        52,2,53,7,53,2,54,7,54,2,55,7,55,2,56,7,56,2,57,7,57,2,58,7,58,2,
        59,7,59,2,60,7,60,2,61,7,61,2,62,7,62,2,63,7,63,2,64,7,64,2,65,7,
        65,2,66,7,66,2,67,7,67,2,68,7,68,2,69,7,69,2,70,7,70,2,71,7,71,2,
        72,7,72,2,73,7,73,2,74,7,74,2,75,7,75,2,76,7,76,2,77,7,77,2,78,7,
        78,2,79,7,79,2,80,7,80,2,81,7,81,2,82,7,82,2,83,7,83,2,84,7,84,2,
        85,7,85,2,86,7,86,2,87,7,87,2,88,7,88,2,89,7,89,2,90,7,90,1,0,5,
        0,184,8,0,10,0,12,0,187,9,0,1,0,1,0,1,1,1,1,1,1,3,1,194,8,1,1,2,
        1,2,1,2,1,2,1,2,1,2,1,3,5,3,203,8,3,10,3,12,3,206,9,3,1,4,1,4,3,
        4,210,8,4,1,5,1,5,1,5,1,5,1,5,1,6,1,6,1,6,3,6,220,8,6,1,6,1,6,5,
        6,224,8,6,10,6,12,6,227,9,6,1,6,1,6,1,7,1,7,1,7,5,7,234,8,7,10,7,
        12,7,237,9,7,1,8,5,8,240,8,8,10,8,12,8,243,9,8,1,8,1,8,1,8,1,8,1,
        8,1,8,1,9,1,9,1,10,5,10,254,8,10,10,10,12,10,257,9,10,1,11,1,11,
        1,11,1,11,3,11,263,8,11,1,12,1,12,1,12,1,13,1,13,1,13,1,13,5,13,
        272,8,13,10,13,12,13,275,9,13,1,13,1,13,1,14,5,14,280,8,14,10,14,
        12,14,283,9,14,1,14,1,14,1,14,5,14,288,8,14,10,14,12,14,291,9,14,
        1,14,1,14,5,14,295,8,14,10,14,12,14,298,9,14,1,14,1,14,1,15,1,15,
        1,16,1,16,1,16,1,17,1,17,1,17,3,17,310,8,17,1,17,1,17,1,17,1,17,
        1,18,1,18,1,18,1,19,5,19,320,8,19,10,19,12,19,323,9,19,1,20,1,20,
        1,20,1,20,1,20,1,20,3,20,331,8,20,1,21,1,21,1,21,1,22,1,22,1,22,
        1,22,1,23,1,23,1,24,1,24,1,24,1,24,1,24,1,25,1,25,1,25,5,25,350,
        8,25,10,25,12,25,353,9,25,1,25,1,25,1,26,1,26,1,26,5,26,360,8,26,
        10,26,12,26,363,9,26,1,26,1,26,1,27,1,27,1,27,1,27,3,27,371,8,27,
        1,28,1,28,1,28,1,28,5,28,377,8,28,10,28,12,28,380,9,28,1,28,1,28,
        1,29,1,29,1,29,1,29,1,30,1,30,1,30,1,30,1,30,1,30,3,30,394,8,30,
        1,31,1,31,1,31,1,31,1,31,1,31,1,31,1,31,1,31,1,31,1,31,1,31,1,31,
        1,31,1,31,1,31,3,31,412,8,31,1,32,1,32,1,32,1,33,1,33,1,33,1,33,
        1,33,1,34,1,34,1,34,1,35,1,35,1,35,1,36,1,36,1,36,1,37,1,37,1,37,
        1,37,1,37,1,38,1,38,1,38,1,39,1,39,1,39,1,40,1,40,1,40,1,40,3,40,
        446,8,40,1,41,1,41,1,42,1,42,1,42,1,42,1,42,1,42,3,42,456,8,42,1,
        43,1,43,1,43,1,43,3,43,462,8,43,1,44,1,44,1,45,1,45,1,45,1,46,1,
        46,1,46,3,46,472,8,46,1,47,1,47,1,47,1,48,1,48,1,48,1,48,1,48,1,
        49,1,49,1,49,5,49,485,8,49,10,49,12,49,488,9,49,1,50,1,50,1,50,1,
        50,1,50,1,50,1,50,1,50,1,50,1,50,1,50,1,50,1,50,1,50,1,50,1,50,3,
        50,506,8,50,1,51,1,51,3,51,510,8,51,1,52,1,52,1,52,1,52,1,52,1,52,
        1,52,3,52,519,8,52,1,53,1,53,1,53,1,54,1,54,1,54,1,54,1,54,1,54,
        3,54,530,8,54,1,55,1,55,1,55,1,55,3,55,536,8,55,1,56,1,56,1,56,1,
        56,1,56,1,56,1,56,1,56,1,56,3,56,547,8,56,1,57,1,57,3,57,551,8,57,
        1,58,1,58,1,58,1,58,5,58,557,8,58,10,58,12,58,560,9,58,1,58,1,58,
        1,58,1,58,5,58,566,8,58,10,58,12,58,569,9,58,1,58,3,58,572,8,58,
        1,59,1,59,1,59,1,59,1,59,5,59,579,8,59,10,59,12,59,582,9,59,1,59,
        1,59,1,60,1,60,1,60,1,60,1,60,1,60,1,60,1,60,1,60,1,60,1,60,1,60,
        1,60,3,60,599,8,60,1,61,1,61,1,62,1,62,1,62,1,62,1,62,1,63,1,63,
        1,64,1,64,3,64,612,8,64,1,65,1,65,1,65,1,65,1,65,1,66,1,66,1,67,
        1,67,3,67,623,8,67,1,68,1,68,1,68,3,68,628,8,68,1,68,1,68,1,68,1,
        68,3,68,634,8,68,1,68,1,68,1,68,3,68,639,8,68,1,68,1,68,1,68,3,68,
        644,8,68,1,68,1,68,1,68,3,68,649,8,68,1,68,1,68,1,68,3,68,654,8,
        68,1,68,1,68,1,68,3,68,659,8,68,1,68,1,68,1,68,1,68,1,68,1,68,1,
        68,1,68,1,68,3,68,670,8,68,1,69,3,69,673,8,69,1,69,1,69,5,69,677,
        8,69,10,69,12,69,680,9,69,1,69,3,69,683,8,69,1,69,1,69,1,69,5,69,
        688,8,69,10,69,12,69,691,9,69,3,69,693,8,69,1,70,1,70,1,70,1,70,
        1,70,1,70,1,70,1,70,1,70,1,70,1,70,1,70,1,70,1,70,1,70,1,70,1,70,
        1,70,1,70,1,70,1,70,1,70,1,70,1,70,1,70,1,70,1,70,1,70,1,70,1,70,
        1,70,1,70,1,70,1,70,1,70,1,70,1,70,1,70,1,70,1,70,1,70,1,70,1,70,
        3,70,738,8,70,1,71,1,71,1,71,1,71,1,71,1,72,1,72,1,72,5,72,748,8,
        72,10,72,12,72,751,9,72,1,73,1,73,1,73,1,73,1,73,1,73,1,74,1,74,
        1,74,1,74,1,74,3,74,764,8,74,1,75,1,75,1,75,1,76,1,76,1,76,1,76,
        1,76,1,76,1,76,1,76,3,76,777,8,76,1,76,1,76,1,76,1,76,1,76,1,76,
        5,76,785,8,76,10,76,12,76,788,9,76,1,77,1,77,1,77,1,77,1,77,1,77,
        1,77,1,77,1,77,1,77,1,77,1,77,1,77,1,77,1,77,1,77,1,77,1,77,1,77,
        1,77,1,77,1,77,1,77,1,77,1,77,1,77,1,77,1,77,1,77,1,77,1,77,1,77,
        3,77,822,8,77,1,78,1,78,1,78,1,78,1,78,1,78,3,78,830,8,78,1,79,1,
        79,1,79,1,79,1,79,1,79,1,79,1,79,1,79,1,79,1,79,1,79,1,79,1,79,1,
        79,1,79,1,79,1,79,3,79,850,8,79,1,80,1,80,1,80,5,80,855,8,80,10,
        80,12,80,858,9,80,1,81,1,81,1,81,1,81,1,81,5,81,865,8,81,10,81,12,
        81,868,9,81,1,82,1,82,3,82,872,8,82,1,83,1,83,1,83,1,84,1,84,1,84,
        1,85,1,85,1,85,1,86,1,86,1,86,1,86,1,86,1,86,1,86,1,86,3,86,891,
        8,86,1,87,1,87,1,87,3,87,896,8,87,1,88,1,88,1,88,1,88,1,89,1,89,
        1,89,1,89,1,90,1,90,1,90,5,90,909,8,90,10,90,12,90,912,9,90,1,90,
        0,1,152,91,0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,
        40,42,44,46,48,50,52,54,56,58,60,62,64,66,68,70,72,74,76,78,80,82,
        84,86,88,90,92,94,96,98,100,102,104,106,108,110,112,114,116,118,
        120,122,124,126,128,130,132,134,136,138,140,142,144,146,148,150,
        152,154,156,158,160,162,164,166,168,170,172,174,176,178,180,0,12,
        2,0,1,2,5,5,1,0,11,12,1,0,13,14,1,0,1,4,1,0,23,24,1,0,110,113,1,
        0,108,109,1,0,53,54,1,0,125,130,1,0,69,73,1,0,82,84,1,0,78,79,958,
        0,185,1,0,0,0,2,193,1,0,0,0,4,195,1,0,0,0,6,204,1,0,0,0,8,209,1,
        0,0,0,10,211,1,0,0,0,12,216,1,0,0,0,14,230,1,0,0,0,16,241,1,0,0,
        0,18,250,1,0,0,0,20,255,1,0,0,0,22,262,1,0,0,0,24,264,1,0,0,0,26,
        267,1,0,0,0,28,281,1,0,0,0,30,301,1,0,0,0,32,303,1,0,0,0,34,306,
        1,0,0,0,36,315,1,0,0,0,38,321,1,0,0,0,40,330,1,0,0,0,42,332,1,0,
        0,0,44,335,1,0,0,0,46,339,1,0,0,0,48,341,1,0,0,0,50,346,1,0,0,0,
        52,356,1,0,0,0,54,366,1,0,0,0,56,372,1,0,0,0,58,383,1,0,0,0,60,393,
        1,0,0,0,62,411,1,0,0,0,64,413,1,0,0,0,66,416,1,0,0,0,68,421,1,0,
        0,0,70,424,1,0,0,0,72,427,1,0,0,0,74,430,1,0,0,0,76,435,1,0,0,0,
        78,438,1,0,0,0,80,441,1,0,0,0,82,447,1,0,0,0,84,449,1,0,0,0,86,457,
        1,0,0,0,88,463,1,0,0,0,90,465,1,0,0,0,92,468,1,0,0,0,94,473,1,0,
        0,0,96,476,1,0,0,0,98,481,1,0,0,0,100,505,1,0,0,0,102,509,1,0,0,
        0,104,518,1,0,0,0,106,520,1,0,0,0,108,529,1,0,0,0,110,535,1,0,0,
        0,112,546,1,0,0,0,114,550,1,0,0,0,116,552,1,0,0,0,118,573,1,0,0,
        0,120,598,1,0,0,0,122,600,1,0,0,0,124,602,1,0,0,0,126,607,1,0,0,
        0,128,609,1,0,0,0,130,613,1,0,0,0,132,618,1,0,0,0,134,622,1,0,0,
        0,136,669,1,0,0,0,138,692,1,0,0,0,140,737,1,0,0,0,142,739,1,0,0,
        0,144,744,1,0,0,0,146,752,1,0,0,0,148,763,1,0,0,0,150,765,1,0,0,
        0,152,776,1,0,0,0,154,821,1,0,0,0,156,829,1,0,0,0,158,849,1,0,0,
        0,160,851,1,0,0,0,162,859,1,0,0,0,164,869,1,0,0,0,166,873,1,0,0,
        0,168,876,1,0,0,0,170,879,1,0,0,0,172,890,1,0,0,0,174,895,1,0,0,
        0,176,897,1,0,0,0,178,901,1,0,0,0,180,905,1,0,0,0,182,184,3,2,1,
        0,183,182,1,0,0,0,184,187,1,0,0,0,185,183,1,0,0,0,185,186,1,0,0,
        0,186,188,1,0,0,0,187,185,1,0,0,0,188,189,5,0,0,1,189,1,1,0,0,0,
        190,194,3,4,2,0,191,194,3,16,8,0,192,194,3,34,17,0,193,190,1,0,0,
        0,193,191,1,0,0,0,193,192,1,0,0,0,194,3,1,0,0,0,195,196,5,6,0,0,
        196,197,5,133,0,0,197,198,5,114,0,0,198,199,3,6,3,0,199,200,5,115,
        0,0,200,5,1,0,0,0,201,203,3,8,4,0,202,201,1,0,0,0,203,206,1,0,0,
        0,204,202,1,0,0,0,204,205,1,0,0,0,205,7,1,0,0,0,206,204,1,0,0,0,
        207,210,3,10,5,0,208,210,3,12,6,0,209,207,1,0,0,0,209,208,1,0,0,
        0,210,9,1,0,0,0,211,212,5,9,0,0,212,213,5,133,0,0,213,214,5,123,
        0,0,214,215,5,131,0,0,215,11,1,0,0,0,216,219,5,133,0,0,217,218,5,
        15,0,0,218,220,3,14,7,0,219,217,1,0,0,0,219,220,1,0,0,0,220,221,
        1,0,0,0,221,225,5,114,0,0,222,224,3,60,30,0,223,222,1,0,0,0,224,
        227,1,0,0,0,225,223,1,0,0,0,225,226,1,0,0,0,226,228,1,0,0,0,227,
        225,1,0,0,0,228,229,5,115,0,0,229,13,1,0,0,0,230,235,5,133,0,0,231,
        232,5,120,0,0,232,234,5,133,0,0,233,231,1,0,0,0,234,237,1,0,0,0,
        235,233,1,0,0,0,235,236,1,0,0,0,236,15,1,0,0,0,237,235,1,0,0,0,238,
        240,3,18,9,0,239,238,1,0,0,0,240,243,1,0,0,0,241,239,1,0,0,0,241,
        242,1,0,0,0,242,244,1,0,0,0,243,241,1,0,0,0,244,245,5,7,0,0,245,
        246,5,133,0,0,246,247,5,114,0,0,247,248,3,20,10,0,248,249,5,115,
        0,0,249,17,1,0,0,0,250,251,7,0,0,0,251,19,1,0,0,0,252,254,3,22,11,
        0,253,252,1,0,0,0,254,257,1,0,0,0,255,253,1,0,0,0,255,256,1,0,0,
        0,256,21,1,0,0,0,257,255,1,0,0,0,258,263,3,24,12,0,259,263,3,54,
        27,0,260,263,3,26,13,0,261,263,3,28,14,0,262,258,1,0,0,0,262,259,
        1,0,0,0,262,260,1,0,0,0,262,261,1,0,0,0,263,23,1,0,0,0,264,265,5,
        10,0,0,265,266,5,133,0,0,266,25,1,0,0,0,267,268,7,1,0,0,268,269,
        7,2,0,0,269,273,5,114,0,0,270,272,3,60,30,0,271,270,1,0,0,0,272,
        275,1,0,0,0,273,271,1,0,0,0,273,274,1,0,0,0,274,276,1,0,0,0,275,
        273,1,0,0,0,276,277,5,115,0,0,277,27,1,0,0,0,278,280,3,30,15,0,279,
        278,1,0,0,0,280,283,1,0,0,0,281,279,1,0,0,0,281,282,1,0,0,0,282,
        284,1,0,0,0,283,281,1,0,0,0,284,285,5,8,0,0,285,289,5,131,0,0,286,
        288,3,32,16,0,287,286,1,0,0,0,288,291,1,0,0,0,289,287,1,0,0,0,289,
        290,1,0,0,0,290,292,1,0,0,0,291,289,1,0,0,0,292,296,5,114,0,0,293,
        295,3,60,30,0,294,293,1,0,0,0,295,298,1,0,0,0,296,294,1,0,0,0,296,
        297,1,0,0,0,297,299,1,0,0,0,298,296,1,0,0,0,299,300,5,115,0,0,300,
        29,1,0,0,0,301,302,7,3,0,0,302,31,1,0,0,0,303,304,5,124,0,0,304,
        305,5,133,0,0,305,33,1,0,0,0,306,307,5,21,0,0,307,309,5,133,0,0,
        308,310,3,36,18,0,309,308,1,0,0,0,309,310,1,0,0,0,310,311,1,0,0,
        0,311,312,5,114,0,0,312,313,3,38,19,0,313,314,5,115,0,0,314,35,1,
        0,0,0,315,316,5,15,0,0,316,317,3,14,7,0,317,37,1,0,0,0,318,320,3,
        40,20,0,319,318,1,0,0,0,320,323,1,0,0,0,321,319,1,0,0,0,321,322,
        1,0,0,0,322,39,1,0,0,0,323,321,1,0,0,0,324,331,3,42,21,0,325,331,
        3,44,22,0,326,331,3,46,23,0,327,331,3,48,24,0,328,331,3,50,25,0,
        329,331,3,52,26,0,330,324,1,0,0,0,330,325,1,0,0,0,330,326,1,0,0,
        0,330,327,1,0,0,0,330,328,1,0,0,0,330,329,1,0,0,0,331,41,1,0,0,0,
        332,333,5,22,0,0,333,334,7,4,0,0,334,43,1,0,0,0,335,336,5,27,0,0,
        336,337,5,136,0,0,337,338,3,144,72,0,338,45,1,0,0,0,339,340,5,28,
        0,0,340,47,1,0,0,0,341,342,5,29,0,0,342,343,5,133,0,0,343,344,5,
        85,0,0,344,345,3,172,86,0,345,49,1,0,0,0,346,347,5,25,0,0,347,351,
        5,114,0,0,348,350,3,60,30,0,349,348,1,0,0,0,350,353,1,0,0,0,351,
        349,1,0,0,0,351,352,1,0,0,0,352,354,1,0,0,0,353,351,1,0,0,0,354,
        355,5,115,0,0,355,51,1,0,0,0,356,357,5,26,0,0,357,361,5,114,0,0,
        358,360,3,60,30,0,359,358,1,0,0,0,360,363,1,0,0,0,361,359,1,0,0,
        0,361,362,1,0,0,0,362,364,1,0,0,0,363,361,1,0,0,0,364,365,5,115,
        0,0,365,53,1,0,0,0,366,367,5,15,0,0,367,368,5,21,0,0,368,370,5,133,
        0,0,369,371,3,56,28,0,370,369,1,0,0,0,370,371,1,0,0,0,371,55,1,0,
        0,0,372,373,5,114,0,0,373,378,3,58,29,0,374,375,5,120,0,0,375,377,
        3,58,29,0,376,374,1,0,0,0,377,380,1,0,0,0,378,376,1,0,0,0,378,379,
        1,0,0,0,379,381,1,0,0,0,380,378,1,0,0,0,381,382,5,115,0,0,382,57,
        1,0,0,0,383,384,5,133,0,0,384,385,5,123,0,0,385,386,3,172,86,0,386,
        59,1,0,0,0,387,394,3,62,31,0,388,394,3,100,50,0,389,394,3,114,57,
        0,390,394,3,124,62,0,391,394,3,130,65,0,392,394,3,128,64,0,393,387,
        1,0,0,0,393,388,1,0,0,0,393,389,1,0,0,0,393,390,1,0,0,0,393,391,
        1,0,0,0,393,392,1,0,0,0,394,61,1,0,0,0,395,412,3,64,32,0,396,412,
        3,66,33,0,397,412,3,68,34,0,398,412,3,70,35,0,399,412,3,72,36,0,
        400,412,3,74,37,0,401,412,3,76,38,0,402,412,3,78,39,0,403,412,3,
        80,40,0,404,412,3,84,42,0,405,412,3,86,43,0,406,412,3,88,44,0,407,
        412,3,90,45,0,408,412,3,92,46,0,409,412,3,94,47,0,410,412,3,96,48,
        0,411,395,1,0,0,0,411,396,1,0,0,0,411,397,1,0,0,0,411,398,1,0,0,
        0,411,399,1,0,0,0,411,400,1,0,0,0,411,401,1,0,0,0,411,402,1,0,0,
        0,411,403,1,0,0,0,411,404,1,0,0,0,411,405,1,0,0,0,411,406,1,0,0,
        0,411,407,1,0,0,0,411,408,1,0,0,0,411,409,1,0,0,0,411,410,1,0,0,
        0,412,63,1,0,0,0,413,414,5,34,0,0,414,415,3,174,87,0,415,65,1,0,
        0,0,416,417,5,35,0,0,417,418,3,174,87,0,418,419,5,15,0,0,419,420,
        3,172,86,0,420,67,1,0,0,0,421,422,5,36,0,0,422,423,3,172,86,0,423,
        69,1,0,0,0,424,425,5,37,0,0,425,426,3,174,87,0,426,71,1,0,0,0,427,
        428,5,38,0,0,428,429,3,174,87,0,429,73,1,0,0,0,430,431,5,39,0,0,
        431,432,3,172,86,0,432,433,5,16,0,0,433,434,3,174,87,0,434,75,1,
        0,0,0,435,436,5,40,0,0,436,437,3,174,87,0,437,77,1,0,0,0,438,439,
        5,41,0,0,439,440,3,172,86,0,440,79,1,0,0,0,441,445,5,42,0,0,442,
        443,5,17,0,0,443,446,3,174,87,0,444,446,3,82,41,0,445,442,1,0,0,
        0,445,444,1,0,0,0,446,81,1,0,0,0,447,448,7,5,0,0,448,83,1,0,0,0,
        449,455,5,43,0,0,450,451,3,172,86,0,451,452,7,6,0,0,452,456,1,0,
        0,0,453,454,5,51,0,0,454,456,3,174,87,0,455,450,1,0,0,0,455,453,
        1,0,0,0,456,85,1,0,0,0,457,458,5,44,0,0,458,461,3,176,88,0,459,460,
        5,15,0,0,460,462,3,180,90,0,461,459,1,0,0,0,461,462,1,0,0,0,462,
        87,1,0,0,0,463,464,5,45,0,0,464,89,1,0,0,0,465,466,5,46,0,0,466,
        467,3,174,87,0,467,91,1,0,0,0,468,469,5,47,0,0,469,471,5,48,0,0,
        470,472,3,172,86,0,471,470,1,0,0,0,471,472,1,0,0,0,472,93,1,0,0,
        0,473,474,5,49,0,0,474,475,3,172,86,0,475,95,1,0,0,0,476,477,5,50,
        0,0,477,478,3,98,49,0,478,479,5,17,0,0,479,480,3,174,87,0,480,97,
        1,0,0,0,481,486,3,172,86,0,482,483,5,120,0,0,483,485,3,172,86,0,
        484,482,1,0,0,0,485,488,1,0,0,0,486,484,1,0,0,0,486,487,1,0,0,0,
        487,99,1,0,0,0,488,486,1,0,0,0,489,490,5,52,0,0,490,491,3,102,51,
        0,491,492,7,7,0,0,492,493,3,104,52,0,493,506,1,0,0,0,494,495,5,52,
        0,0,495,496,5,63,0,0,496,506,3,108,54,0,497,498,5,52,0,0,498,499,
        5,64,0,0,499,506,3,110,55,0,500,501,5,52,0,0,501,502,3,174,87,0,
        502,503,5,66,0,0,503,504,3,112,56,0,504,506,1,0,0,0,505,489,1,0,
        0,0,505,494,1,0,0,0,505,497,1,0,0,0,505,500,1,0,0,0,506,101,1,0,
        0,0,507,510,3,174,87,0,508,510,3,172,86,0,509,507,1,0,0,0,509,508,
        1,0,0,0,510,103,1,0,0,0,511,519,5,55,0,0,512,519,5,56,0,0,513,519,
        5,57,0,0,514,519,5,58,0,0,515,519,5,59,0,0,516,519,5,60,0,0,517,
        519,3,106,53,0,518,511,1,0,0,0,518,512,1,0,0,0,518,513,1,0,0,0,518,
        514,1,0,0,0,518,515,1,0,0,0,518,516,1,0,0,0,518,517,1,0,0,0,519,
        105,1,0,0,0,520,521,5,61,0,0,521,522,3,172,86,0,522,107,1,0,0,0,
        523,524,5,61,0,0,524,530,3,172,86,0,525,526,5,65,0,0,526,530,3,172,
        86,0,527,528,5,101,0,0,528,530,3,172,86,0,529,523,1,0,0,0,529,525,
        1,0,0,0,529,527,1,0,0,0,530,109,1,0,0,0,531,532,5,61,0,0,532,536,
        3,172,86,0,533,534,5,65,0,0,534,536,3,172,86,0,535,531,1,0,0,0,535,
        533,1,0,0,0,536,111,1,0,0,0,537,538,5,88,0,0,538,547,3,172,86,0,
        539,540,5,67,0,0,540,547,3,172,86,0,541,542,5,68,0,0,542,543,3,172,
        86,0,543,544,5,65,0,0,544,545,3,172,86,0,545,547,1,0,0,0,546,537,
        1,0,0,0,546,539,1,0,0,0,546,541,1,0,0,0,547,113,1,0,0,0,548,551,
        3,116,58,0,549,551,3,118,59,0,550,548,1,0,0,0,550,549,1,0,0,0,551,
        115,1,0,0,0,552,553,5,30,0,0,553,554,3,120,60,0,554,558,5,114,0,
        0,555,557,3,60,30,0,556,555,1,0,0,0,557,560,1,0,0,0,558,556,1,0,
        0,0,558,559,1,0,0,0,559,561,1,0,0,0,560,558,1,0,0,0,561,571,5,115,
        0,0,562,563,5,31,0,0,563,567,5,114,0,0,564,566,3,60,30,0,565,564,
        1,0,0,0,566,569,1,0,0,0,567,565,1,0,0,0,567,568,1,0,0,0,568,570,
        1,0,0,0,569,567,1,0,0,0,570,572,5,115,0,0,571,562,1,0,0,0,571,572,
        1,0,0,0,572,117,1,0,0,0,573,574,5,32,0,0,574,575,3,172,86,0,575,
        576,5,33,0,0,576,580,5,114,0,0,577,579,3,60,30,0,578,577,1,0,0,0,
        579,582,1,0,0,0,580,578,1,0,0,0,580,581,1,0,0,0,581,583,1,0,0,0,
        582,580,1,0,0,0,583,584,5,115,0,0,584,119,1,0,0,0,585,586,3,174,
        87,0,586,587,5,53,0,0,587,588,3,104,52,0,588,599,1,0,0,0,589,590,
        3,174,87,0,590,591,5,54,0,0,591,592,3,104,52,0,592,599,1,0,0,0,593,
        594,3,172,86,0,594,595,3,122,61,0,595,596,3,172,86,0,596,599,1,0,
        0,0,597,599,3,172,86,0,598,585,1,0,0,0,598,589,1,0,0,0,598,593,1,
        0,0,0,598,597,1,0,0,0,599,121,1,0,0,0,600,601,7,8,0,0,601,123,1,
        0,0,0,602,603,3,126,63,0,603,604,5,133,0,0,604,605,5,123,0,0,605,
        606,3,172,86,0,606,125,1,0,0,0,607,608,7,9,0,0,608,127,1,0,0,0,609,
        611,5,20,0,0,610,612,3,172,86,0,611,610,1,0,0,0,611,612,1,0,0,0,
        612,129,1,0,0,0,613,614,3,132,66,0,614,615,5,133,0,0,615,616,5,123,
        0,0,616,617,3,134,67,0,617,131,1,0,0,0,618,619,7,9,0,0,619,133,1,
        0,0,0,620,623,3,136,68,0,621,623,3,138,69,0,622,620,1,0,0,0,622,
        621,1,0,0,0,623,135,1,0,0,0,624,625,5,88,0,0,625,627,3,140,70,0,
        626,628,3,150,75,0,627,626,1,0,0,0,627,628,1,0,0,0,628,670,1,0,0,
        0,629,630,5,88,0,0,630,631,5,93,0,0,631,633,3,146,73,0,632,634,3,
        150,75,0,633,632,1,0,0,0,633,634,1,0,0,0,634,670,1,0,0,0,635,636,
        5,89,0,0,636,638,3,146,73,0,637,639,3,150,75,0,638,637,1,0,0,0,638,
        639,1,0,0,0,639,670,1,0,0,0,640,641,5,90,0,0,641,643,3,146,73,0,
        642,644,3,150,75,0,643,642,1,0,0,0,643,644,1,0,0,0,644,670,1,0,0,
        0,645,646,5,91,0,0,646,648,3,146,73,0,647,649,3,150,75,0,648,647,
        1,0,0,0,648,649,1,0,0,0,649,670,1,0,0,0,650,651,5,92,0,0,651,653,
        3,146,73,0,652,654,3,150,75,0,653,652,1,0,0,0,653,654,1,0,0,0,654,
        670,1,0,0,0,655,656,5,93,0,0,656,658,3,146,73,0,657,659,3,150,75,
        0,658,657,1,0,0,0,658,659,1,0,0,0,659,670,1,0,0,0,660,661,5,94,0,
        0,661,662,5,18,0,0,662,670,3,140,70,0,663,664,5,95,0,0,664,665,5,
        18,0,0,665,670,3,140,70,0,666,667,5,96,0,0,667,668,5,97,0,0,668,
        670,3,140,70,0,669,624,1,0,0,0,669,629,1,0,0,0,669,635,1,0,0,0,669,
        640,1,0,0,0,669,645,1,0,0,0,669,650,1,0,0,0,669,655,1,0,0,0,669,
        660,1,0,0,0,669,663,1,0,0,0,669,666,1,0,0,0,670,137,1,0,0,0,671,
        673,7,10,0,0,672,671,1,0,0,0,672,673,1,0,0,0,673,674,1,0,0,0,674,
        678,3,140,70,0,675,677,3,148,74,0,676,675,1,0,0,0,677,680,1,0,0,
        0,678,676,1,0,0,0,678,679,1,0,0,0,679,693,1,0,0,0,680,678,1,0,0,
        0,681,683,7,10,0,0,682,681,1,0,0,0,682,683,1,0,0,0,683,684,1,0,0,
        0,684,685,3,140,70,0,685,689,3,142,71,0,686,688,3,148,74,0,687,686,
        1,0,0,0,688,691,1,0,0,0,689,687,1,0,0,0,689,690,1,0,0,0,690,693,
        1,0,0,0,691,689,1,0,0,0,692,672,1,0,0,0,692,682,1,0,0,0,693,139,
        1,0,0,0,694,695,5,74,0,0,695,696,5,122,0,0,696,738,5,133,0,0,697,
        698,5,74,0,0,698,699,5,122,0,0,699,700,5,133,0,0,700,701,5,122,0,
        0,701,738,5,133,0,0,702,703,5,74,0,0,703,704,5,122,0,0,704,705,5,
        133,0,0,705,706,5,118,0,0,706,707,3,172,86,0,707,708,5,119,0,0,708,
        738,1,0,0,0,709,710,5,74,0,0,710,711,5,122,0,0,711,712,5,133,0,0,
        712,713,5,118,0,0,713,714,3,172,86,0,714,715,5,119,0,0,715,716,5,
        122,0,0,716,717,5,133,0,0,717,738,1,0,0,0,718,719,5,74,0,0,719,720,
        5,122,0,0,720,721,5,133,0,0,721,722,5,118,0,0,722,723,3,172,86,0,
        723,724,5,121,0,0,724,725,3,172,86,0,725,726,5,119,0,0,726,738,1,
        0,0,0,727,728,5,74,0,0,728,729,5,122,0,0,729,730,5,133,0,0,730,731,
        5,98,0,0,731,732,5,118,0,0,732,733,3,172,86,0,733,734,5,120,0,0,
        734,735,3,172,86,0,735,736,5,119,0,0,736,738,1,0,0,0,737,694,1,0,
        0,0,737,697,1,0,0,0,737,702,1,0,0,0,737,709,1,0,0,0,737,718,1,0,
        0,0,737,727,1,0,0,0,738,141,1,0,0,0,739,740,5,122,0,0,740,741,5,
        116,0,0,741,742,3,144,72,0,742,743,5,117,0,0,743,143,1,0,0,0,744,
        749,5,133,0,0,745,746,5,120,0,0,746,748,5,133,0,0,747,745,1,0,0,
        0,748,751,1,0,0,0,749,747,1,0,0,0,749,750,1,0,0,0,750,145,1,0,0,
        0,751,749,1,0,0,0,752,753,5,74,0,0,753,754,5,122,0,0,754,755,5,133,
        0,0,755,756,5,122,0,0,756,757,5,133,0,0,757,147,1,0,0,0,758,764,
        3,150,75,0,759,764,3,162,81,0,760,764,3,166,83,0,761,764,3,168,84,
        0,762,764,3,170,85,0,763,758,1,0,0,0,763,759,1,0,0,0,763,760,1,0,
        0,0,763,761,1,0,0,0,763,762,1,0,0,0,764,149,1,0,0,0,765,766,5,75,
        0,0,766,767,3,152,76,0,767,151,1,0,0,0,768,769,6,76,-1,0,769,770,
        5,62,0,0,770,777,3,152,76,3,771,772,5,116,0,0,772,773,3,152,76,0,
        773,774,5,117,0,0,774,777,1,0,0,0,775,777,3,154,77,0,776,768,1,0,
        0,0,776,771,1,0,0,0,776,775,1,0,0,0,777,786,1,0,0,0,778,779,10,5,
        0,0,779,780,5,86,0,0,780,785,3,152,76,6,781,782,10,4,0,0,782,783,
        5,87,0,0,783,785,3,152,76,5,784,778,1,0,0,0,784,781,1,0,0,0,785,
        788,1,0,0,0,786,784,1,0,0,0,786,787,1,0,0,0,787,153,1,0,0,0,788,
        786,1,0,0,0,789,790,5,133,0,0,790,791,3,122,61,0,791,792,3,172,86,
        0,792,822,1,0,0,0,793,794,5,133,0,0,794,795,3,156,78,0,795,796,3,
        172,86,0,796,822,1,0,0,0,797,798,5,133,0,0,798,799,5,18,0,0,799,
        800,5,118,0,0,800,801,3,160,80,0,801,802,5,119,0,0,802,822,1,0,0,
        0,803,804,5,133,0,0,804,805,5,62,0,0,805,806,5,18,0,0,806,807,5,
        118,0,0,807,808,3,160,80,0,808,809,5,119,0,0,809,822,1,0,0,0,810,
        811,5,133,0,0,811,812,5,53,0,0,812,822,5,60,0,0,813,814,5,133,0,
        0,814,815,5,54,0,0,815,822,5,60,0,0,816,817,5,133,0,0,817,818,5,
        53,0,0,818,822,5,102,0,0,819,820,5,133,0,0,820,822,3,158,79,0,821,
        789,1,0,0,0,821,793,1,0,0,0,821,797,1,0,0,0,821,803,1,0,0,0,821,
        810,1,0,0,0,821,813,1,0,0,0,821,816,1,0,0,0,821,819,1,0,0,0,822,
        155,1,0,0,0,823,830,5,61,0,0,824,825,5,99,0,0,825,830,5,15,0,0,826,
        827,5,100,0,0,827,830,5,15,0,0,828,830,5,101,0,0,829,823,1,0,0,0,
        829,824,1,0,0,0,829,826,1,0,0,0,829,828,1,0,0,0,830,157,1,0,0,0,
        831,832,3,122,61,0,832,833,5,103,0,0,833,850,1,0,0,0,834,835,3,122,
        61,0,835,836,5,104,0,0,836,837,5,107,0,0,837,838,3,172,86,0,838,
        850,1,0,0,0,839,840,3,122,61,0,840,841,5,105,0,0,841,842,5,107,0,
        0,842,843,3,172,86,0,843,850,1,0,0,0,844,845,3,122,61,0,845,846,
        5,106,0,0,846,847,5,107,0,0,847,848,3,172,86,0,848,850,1,0,0,0,849,
        831,1,0,0,0,849,834,1,0,0,0,849,839,1,0,0,0,849,844,1,0,0,0,850,
        159,1,0,0,0,851,856,3,172,86,0,852,853,5,120,0,0,853,855,3,172,86,
        0,854,852,1,0,0,0,855,858,1,0,0,0,856,854,1,0,0,0,856,857,1,0,0,
        0,857,161,1,0,0,0,858,856,1,0,0,0,859,860,5,76,0,0,860,861,5,77,
        0,0,861,866,3,164,82,0,862,863,5,120,0,0,863,865,3,164,82,0,864,
        862,1,0,0,0,865,868,1,0,0,0,866,864,1,0,0,0,866,867,1,0,0,0,867,
        163,1,0,0,0,868,866,1,0,0,0,869,871,5,133,0,0,870,872,7,11,0,0,871,
        870,1,0,0,0,871,872,1,0,0,0,872,165,1,0,0,0,873,874,5,80,0,0,874,
        875,3,172,86,0,875,167,1,0,0,0,876,877,5,81,0,0,877,878,3,172,86,
        0,878,169,1,0,0,0,879,880,5,85,0,0,880,881,3,172,86,0,881,171,1,
        0,0,0,882,891,5,131,0,0,883,891,5,132,0,0,884,891,5,133,0,0,885,
        891,3,176,88,0,886,887,5,116,0,0,887,888,3,172,86,0,888,889,5,117,
        0,0,889,891,1,0,0,0,890,882,1,0,0,0,890,883,1,0,0,0,890,884,1,0,
        0,0,890,885,1,0,0,0,890,886,1,0,0,0,891,173,1,0,0,0,892,896,3,178,
        89,0,893,896,5,131,0,0,894,896,5,133,0,0,895,892,1,0,0,0,895,893,
        1,0,0,0,895,894,1,0,0,0,896,175,1,0,0,0,897,898,5,133,0,0,898,899,
        5,122,0,0,899,900,5,133,0,0,900,177,1,0,0,0,901,902,5,133,0,0,902,
        903,5,122,0,0,903,904,5,133,0,0,904,179,1,0,0,0,905,910,3,172,86,
        0,906,907,5,120,0,0,907,909,3,172,86,0,908,906,1,0,0,0,909,912,1,
        0,0,0,910,908,1,0,0,0,910,911,1,0,0,0,911,181,1,0,0,0,912,910,1,
        0,0,0,70,185,193,204,209,219,225,235,241,255,262,273,281,289,296,
        309,321,330,351,361,370,378,393,411,445,455,461,471,486,505,509,
        518,529,535,546,550,558,567,571,580,598,611,622,627,633,638,643,
        648,653,658,669,672,678,682,689,692,737,749,763,776,784,786,821,
        829,849,856,866,871,890,895,910
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
    public fixtureDeclaration(): FixtureDeclarationContext | null {
        return this.getRuleContext(0, FixtureDeclarationContext);
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
    public featureAnnotation(): FeatureAnnotationContext[];
    public featureAnnotation(i: number): FeatureAnnotationContext | null;
    public featureAnnotation(i?: number): FeatureAnnotationContext[] | FeatureAnnotationContext | null {
        if (i === undefined) {
            return this.getRuleContexts(FeatureAnnotationContext);
        }

        return this.getRuleContext(i, FeatureAnnotationContext);
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


export class FeatureAnnotationContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public SERIAL_ANNOTATION(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.SERIAL_ANNOTATION, 0);
    }
    public SKIP_ANNOTATION(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.SKIP_ANNOTATION, 0);
    }
    public ONLY_ANNOTATION(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.ONLY_ANNOTATION, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_featureAnnotation;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterFeatureAnnotation) {
             listener.enterFeatureAnnotation(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitFeatureAnnotation) {
             listener.exitFeatureAnnotation(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitFeatureAnnotation) {
            return visitor.visitFeatureAnnotation(this);
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
    public withFixtureStatement(): WithFixtureStatementContext | null {
        return this.getRuleContext(0, WithFixtureStatementContext);
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
    public scenarioAnnotation(): ScenarioAnnotationContext[];
    public scenarioAnnotation(i: number): ScenarioAnnotationContext | null;
    public scenarioAnnotation(i?: number): ScenarioAnnotationContext[] | ScenarioAnnotationContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ScenarioAnnotationContext);
        }

        return this.getRuleContext(i, ScenarioAnnotationContext);
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


export class ScenarioAnnotationContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public SKIP_ANNOTATION(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.SKIP_ANNOTATION, 0);
    }
    public ONLY_ANNOTATION(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.ONLY_ANNOTATION, 0);
    }
    public SLOW_ANNOTATION(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.SLOW_ANNOTATION, 0);
    }
    public FIXME_ANNOTATION(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.FIXME_ANNOTATION, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_scenarioAnnotation;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterScenarioAnnotation) {
             listener.enterScenarioAnnotation(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitScenarioAnnotation) {
             listener.exitScenarioAnnotation(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitScenarioAnnotation) {
            return visitor.visitScenarioAnnotation(this);
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


export class FixtureDeclarationContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public FIXTURE(): antlr.TerminalNode {
        return this.getToken(VeroParser.FIXTURE, 0)!;
    }
    public IDENTIFIER(): antlr.TerminalNode {
        return this.getToken(VeroParser.IDENTIFIER, 0)!;
    }
    public LBRACE(): antlr.TerminalNode {
        return this.getToken(VeroParser.LBRACE, 0)!;
    }
    public fixtureBody(): FixtureBodyContext {
        return this.getRuleContext(0, FixtureBodyContext)!;
    }
    public RBRACE(): antlr.TerminalNode {
        return this.getToken(VeroParser.RBRACE, 0)!;
    }
    public fixtureParams(): FixtureParamsContext | null {
        return this.getRuleContext(0, FixtureParamsContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_fixtureDeclaration;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterFixtureDeclaration) {
             listener.enterFixtureDeclaration(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitFixtureDeclaration) {
             listener.exitFixtureDeclaration(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitFixtureDeclaration) {
            return visitor.visitFixtureDeclaration(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class FixtureParamsContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public WITH(): antlr.TerminalNode {
        return this.getToken(VeroParser.WITH, 0)!;
    }
    public parameterList(): ParameterListContext {
        return this.getRuleContext(0, ParameterListContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_fixtureParams;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterFixtureParams) {
             listener.enterFixtureParams(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitFixtureParams) {
             listener.exitFixtureParams(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitFixtureParams) {
            return visitor.visitFixtureParams(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class FixtureBodyContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public fixtureMember(): FixtureMemberContext[];
    public fixtureMember(i: number): FixtureMemberContext | null;
    public fixtureMember(i?: number): FixtureMemberContext[] | FixtureMemberContext | null {
        if (i === undefined) {
            return this.getRuleContexts(FixtureMemberContext);
        }

        return this.getRuleContext(i, FixtureMemberContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_fixtureBody;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterFixtureBody) {
             listener.enterFixtureBody(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitFixtureBody) {
             listener.exitFixtureBody(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitFixtureBody) {
            return visitor.visitFixtureBody(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class FixtureMemberContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public fixtureScopeStatement(): FixtureScopeStatementContext | null {
        return this.getRuleContext(0, FixtureScopeStatementContext);
    }
    public fixtureDependsStatement(): FixtureDependsStatementContext | null {
        return this.getRuleContext(0, FixtureDependsStatementContext);
    }
    public fixtureAutoStatement(): FixtureAutoStatementContext | null {
        return this.getRuleContext(0, FixtureAutoStatementContext);
    }
    public fixtureOptionStatement(): FixtureOptionStatementContext | null {
        return this.getRuleContext(0, FixtureOptionStatementContext);
    }
    public fixtureSetupBlock(): FixtureSetupBlockContext | null {
        return this.getRuleContext(0, FixtureSetupBlockContext);
    }
    public fixtureTeardownBlock(): FixtureTeardownBlockContext | null {
        return this.getRuleContext(0, FixtureTeardownBlockContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_fixtureMember;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterFixtureMember) {
             listener.enterFixtureMember(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitFixtureMember) {
             listener.exitFixtureMember(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitFixtureMember) {
            return visitor.visitFixtureMember(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class FixtureScopeStatementContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public SCOPE(): antlr.TerminalNode {
        return this.getToken(VeroParser.SCOPE, 0)!;
    }
    public TEST_SCOPE(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.TEST_SCOPE, 0);
    }
    public WORKER_SCOPE(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.WORKER_SCOPE, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_fixtureScopeStatement;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterFixtureScopeStatement) {
             listener.enterFixtureScopeStatement(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitFixtureScopeStatement) {
             listener.exitFixtureScopeStatement(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitFixtureScopeStatement) {
            return visitor.visitFixtureScopeStatement(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class FixtureDependsStatementContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public DEPENDS(): antlr.TerminalNode {
        return this.getToken(VeroParser.DEPENDS, 0)!;
    }
    public ON(): antlr.TerminalNode {
        return this.getToken(VeroParser.ON, 0)!;
    }
    public identifierList(): IdentifierListContext {
        return this.getRuleContext(0, IdentifierListContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_fixtureDependsStatement;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterFixtureDependsStatement) {
             listener.enterFixtureDependsStatement(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitFixtureDependsStatement) {
             listener.exitFixtureDependsStatement(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitFixtureDependsStatement) {
            return visitor.visitFixtureDependsStatement(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class FixtureAutoStatementContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public AUTO(): antlr.TerminalNode {
        return this.getToken(VeroParser.AUTO, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_fixtureAutoStatement;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterFixtureAutoStatement) {
             listener.enterFixtureAutoStatement(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitFixtureAutoStatement) {
             listener.exitFixtureAutoStatement(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitFixtureAutoStatement) {
            return visitor.visitFixtureAutoStatement(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class FixtureOptionStatementContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public OPTION(): antlr.TerminalNode {
        return this.getToken(VeroParser.OPTION, 0)!;
    }
    public IDENTIFIER(): antlr.TerminalNode {
        return this.getToken(VeroParser.IDENTIFIER, 0)!;
    }
    public DEFAULT(): antlr.TerminalNode {
        return this.getToken(VeroParser.DEFAULT, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_fixtureOptionStatement;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterFixtureOptionStatement) {
             listener.enterFixtureOptionStatement(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitFixtureOptionStatement) {
             listener.exitFixtureOptionStatement(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitFixtureOptionStatement) {
            return visitor.visitFixtureOptionStatement(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class FixtureSetupBlockContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public SETUP(): antlr.TerminalNode {
        return this.getToken(VeroParser.SETUP, 0)!;
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
        return VeroParser.RULE_fixtureSetupBlock;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterFixtureSetupBlock) {
             listener.enterFixtureSetupBlock(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitFixtureSetupBlock) {
             listener.exitFixtureSetupBlock(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitFixtureSetupBlock) {
            return visitor.visitFixtureSetupBlock(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class FixtureTeardownBlockContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public TEARDOWN(): antlr.TerminalNode {
        return this.getToken(VeroParser.TEARDOWN, 0)!;
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
        return VeroParser.RULE_fixtureTeardownBlock;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterFixtureTeardownBlock) {
             listener.enterFixtureTeardownBlock(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitFixtureTeardownBlock) {
             listener.exitFixtureTeardownBlock(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitFixtureTeardownBlock) {
            return visitor.visitFixtureTeardownBlock(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class WithFixtureStatementContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public WITH(): antlr.TerminalNode {
        return this.getToken(VeroParser.WITH, 0)!;
    }
    public FIXTURE(): antlr.TerminalNode {
        return this.getToken(VeroParser.FIXTURE, 0)!;
    }
    public IDENTIFIER(): antlr.TerminalNode {
        return this.getToken(VeroParser.IDENTIFIER, 0)!;
    }
    public fixtureOptionsBlock(): FixtureOptionsBlockContext | null {
        return this.getRuleContext(0, FixtureOptionsBlockContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_withFixtureStatement;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterWithFixtureStatement) {
             listener.enterWithFixtureStatement(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitWithFixtureStatement) {
             listener.exitWithFixtureStatement(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitWithFixtureStatement) {
            return visitor.visitWithFixtureStatement(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class FixtureOptionsBlockContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public LBRACE(): antlr.TerminalNode {
        return this.getToken(VeroParser.LBRACE, 0)!;
    }
    public fixtureOption(): FixtureOptionContext[];
    public fixtureOption(i: number): FixtureOptionContext | null;
    public fixtureOption(i?: number): FixtureOptionContext[] | FixtureOptionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(FixtureOptionContext);
        }

        return this.getRuleContext(i, FixtureOptionContext);
    }
    public RBRACE(): antlr.TerminalNode {
        return this.getToken(VeroParser.RBRACE, 0)!;
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
        return VeroParser.RULE_fixtureOptionsBlock;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterFixtureOptionsBlock) {
             listener.enterFixtureOptionsBlock(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitFixtureOptionsBlock) {
             listener.exitFixtureOptionsBlock(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitFixtureOptionsBlock) {
            return visitor.visitFixtureOptionsBlock(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class FixtureOptionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
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
        return VeroParser.RULE_fixtureOption;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterFixtureOption) {
             listener.enterFixtureOption(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitFixtureOption) {
             listener.exitFixtureOption(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitFixtureOption) {
            return visitor.visitFixtureOption(this);
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
    public dataQueryStatement(): DataQueryStatementContext | null {
        return this.getRuleContext(0, DataQueryStatementContext);
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
    public uploadAction(): UploadActionContext | null {
        return this.getRuleContext(0, UploadActionContext);
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


export class UploadActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public UPLOAD(): antlr.TerminalNode {
        return this.getToken(VeroParser.UPLOAD, 0)!;
    }
    public fileList(): FileListContext {
        return this.getRuleContext(0, FileListContext)!;
    }
    public TO(): antlr.TerminalNode {
        return this.getToken(VeroParser.TO, 0)!;
    }
    public selectorExpression(): SelectorExpressionContext {
        return this.getRuleContext(0, SelectorExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_uploadAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterUploadAction) {
             listener.enterUploadAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitUploadAction) {
             listener.exitUploadAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitUploadAction) {
            return visitor.visitUploadAction(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class FileListContext extends antlr.ParserRuleContext {
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
        return VeroParser.RULE_fileList;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterFileList) {
             listener.enterFileList(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitFileList) {
             listener.exitFileList(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitFileList) {
            return visitor.visitFileList(this);
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
    public selectorOrText(): SelectorOrTextContext | null {
        return this.getRuleContext(0, SelectorOrTextContext);
    }
    public condition(): ConditionContext | null {
        return this.getRuleContext(0, ConditionContext);
    }
    public IS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.IS, 0);
    }
    public ISNOT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.ISNOT, 0);
    }
    public URL(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.URL, 0);
    }
    public urlCondition(): UrlConditionContext | null {
        return this.getRuleContext(0, UrlConditionContext);
    }
    public TITLE(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.TITLE, 0);
    }
    public titleCondition(): TitleConditionContext | null {
        return this.getRuleContext(0, TitleConditionContext);
    }
    public selectorExpression(): SelectorExpressionContext | null {
        return this.getRuleContext(0, SelectorExpressionContext);
    }
    public HAS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.HAS, 0);
    }
    public hasCondition(): HasConditionContext | null {
        return this.getRuleContext(0, HasConditionContext);
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


export class UrlConditionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public CONTAINS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.CONTAINS, 0);
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public EQUAL(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.EQUAL, 0);
    }
    public MATCHES(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.MATCHES, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_urlCondition;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterUrlCondition) {
             listener.enterUrlCondition(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitUrlCondition) {
             listener.exitUrlCondition(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitUrlCondition) {
            return visitor.visitUrlCondition(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class TitleConditionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public CONTAINS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.CONTAINS, 0);
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public EQUAL(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.EQUAL, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_titleCondition;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterTitleCondition) {
             listener.enterTitleCondition(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitTitleCondition) {
             listener.exitTitleCondition(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitTitleCondition) {
            return visitor.visitTitleCondition(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class HasConditionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public COUNT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.COUNT, 0);
    }
    public expression(): ExpressionContext[];
    public expression(i: number): ExpressionContext | null;
    public expression(i?: number): ExpressionContext[] | ExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ExpressionContext);
        }

        return this.getRuleContext(i, ExpressionContext);
    }
    public VALUE(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.VALUE, 0);
    }
    public ATTRIBUTE(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.ATTRIBUTE, 0);
    }
    public EQUAL(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.EQUAL, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_hasCondition;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterHasCondition) {
             listener.enterHasCondition(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitHasCondition) {
             listener.exitHasCondition(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitHasCondition) {
            return visitor.visitHasCondition(this);
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
    public DATA(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.DATA, 0);
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


export class DataQueryStatementContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public dataResultType(): DataResultTypeContext {
        return this.getRuleContext(0, DataResultTypeContext)!;
    }
    public IDENTIFIER(): antlr.TerminalNode {
        return this.getToken(VeroParser.IDENTIFIER, 0)!;
    }
    public EQUALS(): antlr.TerminalNode {
        return this.getToken(VeroParser.EQUALS, 0)!;
    }
    public dataQuery(): DataQueryContext {
        return this.getRuleContext(0, DataQueryContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_dataQueryStatement;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterDataQueryStatement) {
             listener.enterDataQueryStatement(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitDataQueryStatement) {
             listener.exitDataQueryStatement(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitDataQueryStatement) {
            return visitor.visitDataQueryStatement(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class DataResultTypeContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public DATA(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.DATA, 0);
    }
    public LIST(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.LIST, 0);
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
    public override get ruleIndex(): number {
        return VeroParser.RULE_dataResultType;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterDataResultType) {
             listener.enterDataResultType(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitDataResultType) {
             listener.exitDataResultType(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitDataResultType) {
            return visitor.visitDataResultType(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class DataQueryContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public aggregationQuery(): AggregationQueryContext | null {
        return this.getRuleContext(0, AggregationQueryContext);
    }
    public tableQuery(): TableQueryContext | null {
        return this.getRuleContext(0, TableQueryContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_dataQuery;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterDataQuery) {
             listener.enterDataQuery(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitDataQuery) {
             listener.exitDataQuery(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitDataQuery) {
            return visitor.visitDataQuery(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class AggregationQueryContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public COUNT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.COUNT, 0);
    }
    public tableReference(): TableReferenceContext | null {
        return this.getRuleContext(0, TableReferenceContext);
    }
    public dataWhereClause(): DataWhereClauseContext | null {
        return this.getRuleContext(0, DataWhereClauseContext);
    }
    public DISTINCT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.DISTINCT, 0);
    }
    public columnReference(): ColumnReferenceContext | null {
        return this.getRuleContext(0, ColumnReferenceContext);
    }
    public SUM(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.SUM, 0);
    }
    public AVERAGE(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.AVERAGE, 0);
    }
    public MIN(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.MIN, 0);
    }
    public MAX(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.MAX, 0);
    }
    public ROWS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.ROWS, 0);
    }
    public IN(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.IN, 0);
    }
    public COLUMNS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.COLUMNS, 0);
    }
    public HEADERS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.HEADERS, 0);
    }
    public OF(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.OF, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_aggregationQuery;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterAggregationQuery) {
             listener.enterAggregationQuery(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitAggregationQuery) {
             listener.exitAggregationQuery(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitAggregationQuery) {
            return visitor.visitAggregationQuery(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class TableQueryContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public tableReference(): TableReferenceContext {
        return this.getRuleContext(0, TableReferenceContext)!;
    }
    public queryModifier(): QueryModifierContext[];
    public queryModifier(i: number): QueryModifierContext | null;
    public queryModifier(i?: number): QueryModifierContext[] | QueryModifierContext | null {
        if (i === undefined) {
            return this.getRuleContexts(QueryModifierContext);
        }

        return this.getRuleContext(i, QueryModifierContext);
    }
    public FIRST(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.FIRST, 0);
    }
    public LAST(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.LAST, 0);
    }
    public RANDOM(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.RANDOM, 0);
    }
    public columnSelector(): ColumnSelectorContext | null {
        return this.getRuleContext(0, ColumnSelectorContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_tableQuery;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterTableQuery) {
             listener.enterTableQuery(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitTableQuery) {
             listener.exitTableQuery(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitTableQuery) {
            return visitor.visitTableQuery(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class TableReferenceContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public TESTDATA(): antlr.TerminalNode {
        return this.getToken(VeroParser.TESTDATA, 0)!;
    }
    public DOT(): antlr.TerminalNode[];
    public DOT(i: number): antlr.TerminalNode | null;
    public DOT(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(VeroParser.DOT);
    	} else {
    		return this.getToken(VeroParser.DOT, i);
    	}
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
    public LBRACK(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.LBRACK, 0);
    }
    public expression(): ExpressionContext[];
    public expression(i: number): ExpressionContext | null;
    public expression(i?: number): ExpressionContext[] | ExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ExpressionContext);
        }

        return this.getRuleContext(i, ExpressionContext);
    }
    public RBRACK(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.RBRACK, 0);
    }
    public DOTDOT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.DOTDOT, 0);
    }
    public CELL(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.CELL, 0);
    }
    public COMMA(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.COMMA, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_tableReference;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterTableReference) {
             listener.enterTableReference(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitTableReference) {
             listener.exitTableReference(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitTableReference) {
            return visitor.visitTableReference(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ColumnSelectorContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public DOT(): antlr.TerminalNode {
        return this.getToken(VeroParser.DOT, 0)!;
    }
    public LPAREN(): antlr.TerminalNode {
        return this.getToken(VeroParser.LPAREN, 0)!;
    }
    public identifierList(): IdentifierListContext {
        return this.getRuleContext(0, IdentifierListContext)!;
    }
    public RPAREN(): antlr.TerminalNode {
        return this.getToken(VeroParser.RPAREN, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_columnSelector;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterColumnSelector) {
             listener.enterColumnSelector(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitColumnSelector) {
             listener.exitColumnSelector(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitColumnSelector) {
            return visitor.visitColumnSelector(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class IdentifierListContext extends antlr.ParserRuleContext {
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
        return VeroParser.RULE_identifierList;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterIdentifierList) {
             listener.enterIdentifierList(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitIdentifierList) {
             listener.exitIdentifierList(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitIdentifierList) {
            return visitor.visitIdentifierList(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ColumnReferenceContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public TESTDATA(): antlr.TerminalNode {
        return this.getToken(VeroParser.TESTDATA, 0)!;
    }
    public DOT(): antlr.TerminalNode[];
    public DOT(i: number): antlr.TerminalNode | null;
    public DOT(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(VeroParser.DOT);
    	} else {
    		return this.getToken(VeroParser.DOT, i);
    	}
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
    public override get ruleIndex(): number {
        return VeroParser.RULE_columnReference;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterColumnReference) {
             listener.enterColumnReference(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitColumnReference) {
             listener.exitColumnReference(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitColumnReference) {
            return visitor.visitColumnReference(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class QueryModifierContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public dataWhereClause(): DataWhereClauseContext | null {
        return this.getRuleContext(0, DataWhereClauseContext);
    }
    public orderByClause(): OrderByClauseContext | null {
        return this.getRuleContext(0, OrderByClauseContext);
    }
    public limitClause(): LimitClauseContext | null {
        return this.getRuleContext(0, LimitClauseContext);
    }
    public offsetClause(): OffsetClauseContext | null {
        return this.getRuleContext(0, OffsetClauseContext);
    }
    public defaultClause(): DefaultClauseContext | null {
        return this.getRuleContext(0, DefaultClauseContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_queryModifier;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterQueryModifier) {
             listener.enterQueryModifier(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitQueryModifier) {
             listener.exitQueryModifier(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitQueryModifier) {
            return visitor.visitQueryModifier(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class DataWhereClauseContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public WHERE(): antlr.TerminalNode {
        return this.getToken(VeroParser.WHERE, 0)!;
    }
    public dataCondition(): DataConditionContext {
        return this.getRuleContext(0, DataConditionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_dataWhereClause;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterDataWhereClause) {
             listener.enterDataWhereClause(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitDataWhereClause) {
             listener.exitDataWhereClause(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitDataWhereClause) {
            return visitor.visitDataWhereClause(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class DataConditionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public NOT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.NOT, 0);
    }
    public dataCondition(): DataConditionContext[];
    public dataCondition(i: number): DataConditionContext | null;
    public dataCondition(i?: number): DataConditionContext[] | DataConditionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(DataConditionContext);
        }

        return this.getRuleContext(i, DataConditionContext);
    }
    public LPAREN(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.LPAREN, 0);
    }
    public RPAREN(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.RPAREN, 0);
    }
    public dataComparison(): DataComparisonContext | null {
        return this.getRuleContext(0, DataComparisonContext);
    }
    public AND(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.AND, 0);
    }
    public OR(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.OR, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_dataCondition;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterDataCondition) {
             listener.enterDataCondition(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitDataCondition) {
             listener.exitDataCondition(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitDataCondition) {
            return visitor.visitDataCondition(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class DataComparisonContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public IDENTIFIER(): antlr.TerminalNode {
        return this.getToken(VeroParser.IDENTIFIER, 0)!;
    }
    public comparisonOperator(): ComparisonOperatorContext | null {
        return this.getRuleContext(0, ComparisonOperatorContext);
    }
    public expression(): ExpressionContext | null {
        return this.getRuleContext(0, ExpressionContext);
    }
    public textOperator(): TextOperatorContext | null {
        return this.getRuleContext(0, TextOperatorContext);
    }
    public IN(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.IN, 0);
    }
    public LBRACK(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.LBRACK, 0);
    }
    public expressionList(): ExpressionListContext | null {
        return this.getRuleContext(0, ExpressionListContext);
    }
    public RBRACK(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.RBRACK, 0);
    }
    public NOT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.NOT, 0);
    }
    public IS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.IS, 0);
    }
    public EMPTY(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.EMPTY, 0);
    }
    public ISNOT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.ISNOT, 0);
    }
    public NULL_(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.NULL_, 0);
    }
    public dateComparison(): DateComparisonContext | null {
        return this.getRuleContext(0, DateComparisonContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_dataComparison;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterDataComparison) {
             listener.enterDataComparison(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitDataComparison) {
             listener.exitDataComparison(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitDataComparison) {
            return visitor.visitDataComparison(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class TextOperatorContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public CONTAINS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.CONTAINS, 0);
    }
    public STARTS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.STARTS, 0);
    }
    public WITH(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.WITH, 0);
    }
    public ENDS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.ENDS, 0);
    }
    public MATCHES(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.MATCHES, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_textOperator;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterTextOperator) {
             listener.enterTextOperator(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitTextOperator) {
             listener.exitTextOperator(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitTextOperator) {
            return visitor.visitTextOperator(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class DateComparisonContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public comparisonOperator(): ComparisonOperatorContext {
        return this.getRuleContext(0, ComparisonOperatorContext)!;
    }
    public TODAY(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.TODAY, 0);
    }
    public DAYS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.DAYS, 0);
    }
    public AGO(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.AGO, 0);
    }
    public expression(): ExpressionContext | null {
        return this.getRuleContext(0, ExpressionContext);
    }
    public MONTHS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.MONTHS, 0);
    }
    public YEARS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.YEARS, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_dateComparison;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterDateComparison) {
             listener.enterDateComparison(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitDateComparison) {
             listener.exitDateComparison(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitDateComparison) {
            return visitor.visitDateComparison(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ExpressionListContext extends antlr.ParserRuleContext {
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
        return VeroParser.RULE_expressionList;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterExpressionList) {
             listener.enterExpressionList(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitExpressionList) {
             listener.exitExpressionList(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitExpressionList) {
            return visitor.visitExpressionList(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class OrderByClauseContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public ORDER(): antlr.TerminalNode {
        return this.getToken(VeroParser.ORDER, 0)!;
    }
    public BY(): antlr.TerminalNode {
        return this.getToken(VeroParser.BY, 0)!;
    }
    public orderColumn(): OrderColumnContext[];
    public orderColumn(i: number): OrderColumnContext | null;
    public orderColumn(i?: number): OrderColumnContext[] | OrderColumnContext | null {
        if (i === undefined) {
            return this.getRuleContexts(OrderColumnContext);
        }

        return this.getRuleContext(i, OrderColumnContext);
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
        return VeroParser.RULE_orderByClause;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterOrderByClause) {
             listener.enterOrderByClause(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitOrderByClause) {
             listener.exitOrderByClause(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitOrderByClause) {
            return visitor.visitOrderByClause(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class OrderColumnContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public IDENTIFIER(): antlr.TerminalNode {
        return this.getToken(VeroParser.IDENTIFIER, 0)!;
    }
    public ASC(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.ASC, 0);
    }
    public DESC(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.DESC, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_orderColumn;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterOrderColumn) {
             listener.enterOrderColumn(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitOrderColumn) {
             listener.exitOrderColumn(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitOrderColumn) {
            return visitor.visitOrderColumn(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class LimitClauseContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public LIMIT(): antlr.TerminalNode {
        return this.getToken(VeroParser.LIMIT, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_limitClause;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterLimitClause) {
             listener.enterLimitClause(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitLimitClause) {
             listener.exitLimitClause(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitLimitClause) {
            return visitor.visitLimitClause(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class OffsetClauseContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public OFFSET(): antlr.TerminalNode {
        return this.getToken(VeroParser.OFFSET, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_offsetClause;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterOffsetClause) {
             listener.enterOffsetClause(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitOffsetClause) {
             listener.exitOffsetClause(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitOffsetClause) {
            return visitor.visitOffsetClause(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class DefaultClauseContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public DEFAULT(): antlr.TerminalNode {
        return this.getToken(VeroParser.DEFAULT, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_defaultClause;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterDefaultClause) {
             listener.enterDefaultClause(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitDefaultClause) {
             listener.exitDefaultClause(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitDefaultClause) {
            return visitor.visitDefaultClause(this);
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
