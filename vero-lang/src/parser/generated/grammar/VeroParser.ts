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
    public static readonly PAGEACTIONS = 7;
    public static readonly FEATURE = 8;
    public static readonly SCENARIO = 9;
    public static readonly FIELD = 10;
    public static readonly USE = 11;
    public static readonly BEFORE = 12;
    public static readonly AFTER = 13;
    public static readonly EACH = 14;
    public static readonly ALL = 15;
    public static readonly WITH = 16;
    public static readonly FROM = 17;
    public static readonly TO = 18;
    public static readonly IN = 19;
    public static readonly RETURNS = 20;
    public static readonly RETURN = 21;
    public static readonly FIXTURE = 22;
    public static readonly SCOPE = 23;
    public static readonly TEST_SCOPE = 24;
    public static readonly WORKER_SCOPE = 25;
    public static readonly SETUP = 26;
    public static readonly TEARDOWN = 27;
    public static readonly DEPENDS = 28;
    public static readonly AUTO = 29;
    public static readonly OPTION = 30;
    public static readonly IF = 31;
    public static readonly ELSE = 32;
    public static readonly REPEAT = 33;
    public static readonly TIMES = 34;
    public static readonly CLICK = 35;
    public static readonly FILL = 36;
    public static readonly OPEN = 37;
    public static readonly CHECK = 38;
    public static readonly UNCHECK = 39;
    public static readonly SELECT = 40;
    public static readonly HOVER = 41;
    public static readonly PRESS = 42;
    public static readonly SCROLL = 43;
    public static readonly WAIT = 44;
    public static readonly PERFORM = 45;
    public static readonly REFRESH = 46;
    public static readonly CLEAR = 47;
    public static readonly TAKE = 48;
    public static readonly SCREENSHOT = 49;
    public static readonly LOG = 50;
    public static readonly UPLOAD = 51;
    public static readonly SWITCH = 52;
    public static readonly NEW = 53;
    public static readonly TAB = 54;
    public static readonly CLOSE = 55;
    public static readonly FOR = 56;
    public static readonly VERIFY = 57;
    public static readonly IS = 58;
    public static readonly ISNOT = 59;
    public static readonly VISIBLE = 60;
    public static readonly HIDDEN_STATE = 61;
    public static readonly ENABLED = 62;
    public static readonly DISABLED = 63;
    public static readonly CHECKED = 64;
    public static readonly EMPTY = 65;
    public static readonly CONTAINS = 66;
    public static readonly NOT = 67;
    public static readonly URL = 68;
    public static readonly TITLE = 69;
    public static readonly EQUAL = 70;
    public static readonly HAS = 71;
    public static readonly VALUE = 72;
    public static readonly ATTRIBUTE = 73;
    public static readonly TEXT = 74;
    public static readonly NUMBER = 75;
    public static readonly FLAG = 76;
    public static readonly LIST = 77;
    public static readonly DATA = 78;
    public static readonly TESTDATA = 79;
    public static readonly WHERE = 80;
    public static readonly ORDER = 81;
    public static readonly BY = 82;
    public static readonly ASC = 83;
    public static readonly DESC = 84;
    public static readonly LIMIT = 85;
    public static readonly OFFSET = 86;
    public static readonly FIRST = 87;
    public static readonly LAST = 88;
    public static readonly RANDOM = 89;
    public static readonly DEFAULT = 90;
    public static readonly AND = 91;
    public static readonly OR = 92;
    public static readonly COUNT = 93;
    public static readonly SUM = 94;
    public static readonly AVERAGE = 95;
    public static readonly MIN = 96;
    public static readonly MAX = 97;
    public static readonly DISTINCT = 98;
    public static readonly ROWS = 99;
    public static readonly ROW = 100;
    public static readonly COLUMNS = 101;
    public static readonly HEADERS = 102;
    public static readonly OF = 103;
    public static readonly CELL = 104;
    public static readonly STARTS = 105;
    public static readonly ENDS = 106;
    public static readonly MATCHES = 107;
    public static readonly NULL_ = 108;
    public static readonly TODAY = 109;
    public static readonly DAYS = 110;
    public static readonly MONTHS = 111;
    public static readonly YEARS = 112;
    public static readonly AGO = 113;
    public static readonly SECONDS = 114;
    public static readonly MILLISECONDS = 115;
    public static readonly TRIM = 116;
    public static readonly CONVERT = 117;
    public static readonly UPPERCASE = 118;
    public static readonly LOWERCASE = 119;
    public static readonly EXTRACT = 120;
    public static readonly REPLACE_ = 121;
    public static readonly SPLIT = 122;
    public static readonly JOIN_ = 123;
    public static readonly LENGTH = 124;
    public static readonly PAD = 125;
    public static readonly THEN = 126;
    public static readonly NOW = 127;
    public static readonly ADD = 128;
    public static readonly SUBTRACT = 129;
    public static readonly DAY = 130;
    public static readonly MONTH = 131;
    public static readonly YEAR = 132;
    public static readonly FORMAT = 133;
    public static readonly ROUND = 134;
    public static readonly DECIMALS = 135;
    public static readonly ABSOLUTE = 136;
    public static readonly CURRENCY = 137;
    public static readonly PERCENT = 138;
    public static readonly GENERATE = 139;
    public static readonly UUID = 140;
    public static readonly ON = 141;
    public static readonly AS = 142;
    public static readonly TESTID = 143;
    public static readonly ROLE = 144;
    public static readonly LABEL = 145;
    public static readonly PLACEHOLDER = 146;
    public static readonly ALT = 147;
    public static readonly CSS = 148;
    public static readonly XPATH = 149;
    public static readonly BUTTON = 150;
    public static readonly LINK = 151;
    public static readonly CHECKBOX = 152;
    public static readonly NAME = 153;
    public static readonly UP = 154;
    public static readonly DOWN = 155;
    public static readonly LEFT = 156;
    public static readonly RIGHT = 157;
    public static readonly LBRACE = 158;
    public static readonly RBRACE = 159;
    public static readonly LPAREN = 160;
    public static readonly RPAREN = 161;
    public static readonly LBRACK = 162;
    public static readonly RBRACK = 163;
    public static readonly COMMA = 164;
    public static readonly DOTDOT = 165;
    public static readonly DOT = 166;
    public static readonly EQUALS = 167;
    public static readonly AT = 168;
    public static readonly GT = 169;
    public static readonly LT = 170;
    public static readonly GTE = 171;
    public static readonly LTE = 172;
    public static readonly EQEQ = 173;
    public static readonly NEQ = 174;
    public static readonly STRING_LITERAL = 175;
    public static readonly NUMBER_LITERAL = 176;
    public static readonly IDENTIFIER = 177;
    public static readonly COMMENT = 178;
    public static readonly WS = 179;
    public static readonly RULE_program = 0;
    public static readonly RULE_declaration = 1;
    public static readonly RULE_pageDeclaration = 2;
    public static readonly RULE_urlPatterns = 3;
    public static readonly RULE_pageBody = 4;
    public static readonly RULE_pageMember = 5;
    public static readonly RULE_fieldDeclaration = 6;
    public static readonly RULE_selectorType = 7;
    public static readonly RULE_actionDeclaration = 8;
    public static readonly RULE_parameterList = 9;
    public static readonly RULE_returnType = 10;
    public static readonly RULE_pageActionsDeclaration = 11;
    public static readonly RULE_pageActionsBody = 12;
    public static readonly RULE_pageActionsMember = 13;
    public static readonly RULE_pageActionsActionDeclaration = 14;
    public static readonly RULE_featureDeclaration = 15;
    public static readonly RULE_featureAnnotation = 16;
    public static readonly RULE_featureBody = 17;
    public static readonly RULE_featureMember = 18;
    public static readonly RULE_useStatement = 19;
    public static readonly RULE_hookDeclaration = 20;
    public static readonly RULE_scenarioDeclaration = 21;
    public static readonly RULE_scenarioAnnotation = 22;
    public static readonly RULE_tag = 23;
    public static readonly RULE_fixtureDeclaration = 24;
    public static readonly RULE_fixtureParams = 25;
    public static readonly RULE_fixtureBody = 26;
    public static readonly RULE_fixtureMember = 27;
    public static readonly RULE_fixtureScopeStatement = 28;
    public static readonly RULE_fixtureDependsStatement = 29;
    public static readonly RULE_fixtureAutoStatement = 30;
    public static readonly RULE_fixtureOptionStatement = 31;
    public static readonly RULE_fixtureSetupBlock = 32;
    public static readonly RULE_fixtureTeardownBlock = 33;
    public static readonly RULE_withFixtureStatement = 34;
    public static readonly RULE_fixtureOptionsBlock = 35;
    public static readonly RULE_fixtureOption = 36;
    public static readonly RULE_statement = 37;
    public static readonly RULE_utilityStatement = 38;
    public static readonly RULE_utilityAssignment = 39;
    public static readonly RULE_utilityExpression = 40;
    public static readonly RULE_trimExpression = 41;
    public static readonly RULE_convertExpression = 42;
    public static readonly RULE_extractExpression = 43;
    public static readonly RULE_replaceExpression = 44;
    public static readonly RULE_splitExpression = 45;
    public static readonly RULE_joinExpression = 46;
    public static readonly RULE_lengthExpression = 47;
    public static readonly RULE_padExpression = 48;
    public static readonly RULE_todayExpression = 49;
    public static readonly RULE_nowExpression = 50;
    public static readonly RULE_addDateExpression = 51;
    public static readonly RULE_subtractDateExpression = 52;
    public static readonly RULE_dateUnit = 53;
    public static readonly RULE_formatExpression = 54;
    public static readonly RULE_datePartExpression = 55;
    public static readonly RULE_roundExpression = 56;
    public static readonly RULE_absoluteExpression = 57;
    public static readonly RULE_generateExpression = 58;
    public static readonly RULE_randomExpression = 59;
    public static readonly RULE_actionStatement = 60;
    public static readonly RULE_clickAction = 61;
    public static readonly RULE_fillAction = 62;
    public static readonly RULE_openAction = 63;
    public static readonly RULE_checkAction = 64;
    public static readonly RULE_uncheckAction = 65;
    public static readonly RULE_selectAction = 66;
    public static readonly RULE_hoverAction = 67;
    public static readonly RULE_pressAction = 68;
    public static readonly RULE_scrollAction = 69;
    public static readonly RULE_direction = 70;
    public static readonly RULE_waitAction = 71;
    public static readonly RULE_performAction = 72;
    public static readonly RULE_refreshAction = 73;
    public static readonly RULE_clearAction = 74;
    public static readonly RULE_screenshotAction = 75;
    public static readonly RULE_logAction = 76;
    public static readonly RULE_uploadAction = 77;
    public static readonly RULE_fileList = 78;
    public static readonly RULE_switchToNewTabAction = 79;
    public static readonly RULE_switchToTabAction = 80;
    public static readonly RULE_openInNewTabAction = 81;
    public static readonly RULE_closeTabAction = 82;
    public static readonly RULE_assertionStatement = 83;
    public static readonly RULE_selectorOrText = 84;
    public static readonly RULE_condition = 85;
    public static readonly RULE_containsCondition = 86;
    public static readonly RULE_urlCondition = 87;
    public static readonly RULE_titleCondition = 88;
    public static readonly RULE_hasCondition = 89;
    public static readonly RULE_controlFlowStatement = 90;
    public static readonly RULE_ifStatement = 91;
    public static readonly RULE_repeatStatement = 92;
    public static readonly RULE_booleanExpression = 93;
    public static readonly RULE_comparisonOperator = 94;
    public static readonly RULE_variableDeclaration = 95;
    public static readonly RULE_variableType = 96;
    public static readonly RULE_returnStatement = 97;
    public static readonly RULE_dataQueryStatement = 98;
    public static readonly RULE_rowStatement = 99;
    public static readonly RULE_rowModifier = 100;
    public static readonly RULE_rowsStatement = 101;
    public static readonly RULE_columnAccessStatement = 102;
    public static readonly RULE_countStatement = 103;
    public static readonly RULE_simpleTableReference = 104;
    public static readonly RULE_legacyDataQueryStatement = 105;
    public static readonly RULE_dataResultType = 106;
    public static readonly RULE_dataQuery = 107;
    public static readonly RULE_aggregationQuery = 108;
    public static readonly RULE_tableQuery = 109;
    public static readonly RULE_tableReference = 110;
    public static readonly RULE_columnSelector = 111;
    public static readonly RULE_identifierList = 112;
    public static readonly RULE_columnReference = 113;
    public static readonly RULE_queryModifier = 114;
    public static readonly RULE_dataWhereClause = 115;
    public static readonly RULE_dataCondition = 116;
    public static readonly RULE_dataComparison = 117;
    public static readonly RULE_textOperator = 118;
    public static readonly RULE_dateComparison = 119;
    public static readonly RULE_expressionList = 120;
    public static readonly RULE_orderByClause = 121;
    public static readonly RULE_orderColumn = 122;
    public static readonly RULE_limitClause = 123;
    public static readonly RULE_offsetClause = 124;
    public static readonly RULE_defaultClause = 125;
    public static readonly RULE_expression = 126;
    public static readonly RULE_selectorExpression = 127;
    public static readonly RULE_pageMethodReference = 128;
    public static readonly RULE_pageFieldReference = 129;
    public static readonly RULE_argumentList = 130;

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
        "SERIAL_ANNOTATION", "PAGE", "PAGEACTIONS", "FEATURE", "SCENARIO", 
        "FIELD", "USE", "BEFORE", "AFTER", "EACH", "ALL", "WITH", "FROM", 
        "TO", "IN", "RETURNS", "RETURN", "FIXTURE", "SCOPE", "TEST_SCOPE", 
        "WORKER_SCOPE", "SETUP", "TEARDOWN", "DEPENDS", "AUTO", "OPTION", 
        "IF", "ELSE", "REPEAT", "TIMES", "CLICK", "FILL", "OPEN", "CHECK", 
        "UNCHECK", "SELECT", "HOVER", "PRESS", "SCROLL", "WAIT", "PERFORM", 
        "REFRESH", "CLEAR", "TAKE", "SCREENSHOT", "LOG", "UPLOAD", "SWITCH", 
        "NEW", "TAB", "CLOSE", "FOR", "VERIFY", "IS", "ISNOT", "VISIBLE", 
        "HIDDEN_STATE", "ENABLED", "DISABLED", "CHECKED", "EMPTY", "CONTAINS", 
        "NOT", "URL", "TITLE", "EQUAL", "HAS", "VALUE", "ATTRIBUTE", "TEXT", 
        "NUMBER", "FLAG", "LIST", "DATA", "TESTDATA", "WHERE", "ORDER", 
        "BY", "ASC", "DESC", "LIMIT", "OFFSET", "FIRST", "LAST", "RANDOM", 
        "DEFAULT", "AND", "OR", "COUNT", "SUM", "AVERAGE", "MIN", "MAX", 
        "DISTINCT", "ROWS", "ROW", "COLUMNS", "HEADERS", "OF", "CELL", "STARTS", 
        "ENDS", "MATCHES", "NULL_", "TODAY", "DAYS", "MONTHS", "YEARS", 
        "AGO", "SECONDS", "MILLISECONDS", "TRIM", "CONVERT", "UPPERCASE", 
        "LOWERCASE", "EXTRACT", "REPLACE_", "SPLIT", "JOIN_", "LENGTH", 
        "PAD", "THEN", "NOW", "ADD", "SUBTRACT", "DAY", "MONTH", "YEAR", 
        "FORMAT", "ROUND", "DECIMALS", "ABSOLUTE", "CURRENCY", "PERCENT", 
        "GENERATE", "UUID", "ON", "AS", "TESTID", "ROLE", "LABEL", "PLACEHOLDER", 
        "ALT", "CSS", "XPATH", "BUTTON", "LINK", "CHECKBOX", "NAME", "UP", 
        "DOWN", "LEFT", "RIGHT", "LBRACE", "RBRACE", "LPAREN", "RPAREN", 
        "LBRACK", "RBRACK", "COMMA", "DOTDOT", "DOT", "EQUALS", "AT", "GT", 
        "LT", "GTE", "LTE", "EQEQ", "NEQ", "STRING_LITERAL", "NUMBER_LITERAL", 
        "IDENTIFIER", "COMMENT", "WS"
    ];
    public static readonly ruleNames = [
        "program", "declaration", "pageDeclaration", "urlPatterns", "pageBody", 
        "pageMember", "fieldDeclaration", "selectorType", "actionDeclaration", 
        "parameterList", "returnType", "pageActionsDeclaration", "pageActionsBody", 
        "pageActionsMember", "pageActionsActionDeclaration", "featureDeclaration", 
        "featureAnnotation", "featureBody", "featureMember", "useStatement", 
        "hookDeclaration", "scenarioDeclaration", "scenarioAnnotation", 
        "tag", "fixtureDeclaration", "fixtureParams", "fixtureBody", "fixtureMember", 
        "fixtureScopeStatement", "fixtureDependsStatement", "fixtureAutoStatement", 
        "fixtureOptionStatement", "fixtureSetupBlock", "fixtureTeardownBlock", 
        "withFixtureStatement", "fixtureOptionsBlock", "fixtureOption", 
        "statement", "utilityStatement", "utilityAssignment", "utilityExpression", 
        "trimExpression", "convertExpression", "extractExpression", "replaceExpression", 
        "splitExpression", "joinExpression", "lengthExpression", "padExpression", 
        "todayExpression", "nowExpression", "addDateExpression", "subtractDateExpression", 
        "dateUnit", "formatExpression", "datePartExpression", "roundExpression", 
        "absoluteExpression", "generateExpression", "randomExpression", 
        "actionStatement", "clickAction", "fillAction", "openAction", "checkAction", 
        "uncheckAction", "selectAction", "hoverAction", "pressAction", "scrollAction", 
        "direction", "waitAction", "performAction", "refreshAction", "clearAction", 
        "screenshotAction", "logAction", "uploadAction", "fileList", "switchToNewTabAction", 
        "switchToTabAction", "openInNewTabAction", "closeTabAction", "assertionStatement", 
        "selectorOrText", "condition", "containsCondition", "urlCondition", 
        "titleCondition", "hasCondition", "controlFlowStatement", "ifStatement", 
        "repeatStatement", "booleanExpression", "comparisonOperator", "variableDeclaration", 
        "variableType", "returnStatement", "dataQueryStatement", "rowStatement", 
        "rowModifier", "rowsStatement", "columnAccessStatement", "countStatement", 
        "simpleTableReference", "legacyDataQueryStatement", "dataResultType", 
        "dataQuery", "aggregationQuery", "tableQuery", "tableReference", 
        "columnSelector", "identifierList", "columnReference", "queryModifier", 
        "dataWhereClause", "dataCondition", "dataComparison", "textOperator", 
        "dateComparison", "expressionList", "orderByClause", "orderColumn", 
        "limitClause", "offsetClause", "defaultClause", "expression", "selectorExpression", 
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
            this.state = 265;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 4194790) !== 0)) {
                {
                {
                this.state = 262;
                this.declaration();
                }
                }
                this.state = 267;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 268;
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
            this.state = 274;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.PAGE:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 270;
                this.pageDeclaration();
                }
                break;
            case VeroParser.PAGEACTIONS:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 271;
                this.pageActionsDeclaration();
                }
                break;
            case VeroParser.SKIP_ANNOTATION:
            case VeroParser.ONLY_ANNOTATION:
            case VeroParser.SERIAL_ANNOTATION:
            case VeroParser.FEATURE:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 272;
                this.featureDeclaration();
                }
                break;
            case VeroParser.FIXTURE:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 273;
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
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 276;
            this.match(VeroParser.PAGE);
            this.state = 277;
            this.match(VeroParser.IDENTIFIER);
            this.state = 279;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 160) {
                {
                this.state = 278;
                this.urlPatterns();
                }
            }

            this.state = 281;
            this.match(VeroParser.LBRACE);
            this.state = 282;
            this.pageBody();
            this.state = 283;
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
    public urlPatterns(): UrlPatternsContext {
        let localContext = new UrlPatternsContext(this.context, this.state);
        this.enterRule(localContext, 6, VeroParser.RULE_urlPatterns);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 285;
            this.match(VeroParser.LPAREN);
            this.state = 286;
            this.match(VeroParser.STRING_LITERAL);
            this.state = 291;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 164) {
                {
                {
                this.state = 287;
                this.match(VeroParser.COMMA);
                this.state = 288;
                this.match(VeroParser.STRING_LITERAL);
                }
                }
                this.state = 293;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 294;
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
    public pageBody(): PageBodyContext {
        let localContext = new PageBodyContext(this.context, this.state);
        this.enterRule(localContext, 8, VeroParser.RULE_pageBody);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 299;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 10 || _la === 177) {
                {
                {
                this.state = 296;
                this.pageMember();
                }
                }
                this.state = 301;
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
        this.enterRule(localContext, 10, VeroParser.RULE_pageMember);
        try {
            this.state = 304;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.FIELD:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 302;
                this.fieldDeclaration();
                }
                break;
            case VeroParser.IDENTIFIER:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 303;
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
        this.enterRule(localContext, 12, VeroParser.RULE_fieldDeclaration);
        let _la: number;
        try {
            this.state = 319;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 7, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 306;
                this.match(VeroParser.FIELD);
                this.state = 307;
                this.match(VeroParser.IDENTIFIER);
                this.state = 308;
                this.match(VeroParser.EQUALS);
                this.state = 309;
                this.selectorType();
                this.state = 310;
                this.match(VeroParser.STRING_LITERAL);
                this.state = 313;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 153) {
                    {
                    this.state = 311;
                    this.match(VeroParser.NAME);
                    this.state = 312;
                    this.match(VeroParser.STRING_LITERAL);
                    }
                }

                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 315;
                this.match(VeroParser.FIELD);
                this.state = 316;
                this.match(VeroParser.IDENTIFIER);
                this.state = 317;
                this.match(VeroParser.EQUALS);
                this.state = 318;
                this.match(VeroParser.STRING_LITERAL);
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
    public selectorType(): SelectorTypeContext {
        let localContext = new SelectorTypeContext(this.context, this.state);
        this.enterRule(localContext, 14, VeroParser.RULE_selectorType);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 321;
            _la = this.tokenStream.LA(1);
            if(!(_la === 69 || _la === 74 || ((((_la - 143)) & ~0x1F) === 0 && ((1 << (_la - 143)) & 1023) !== 0))) {
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
    public actionDeclaration(): ActionDeclarationContext {
        let localContext = new ActionDeclarationContext(this.context, this.state);
        this.enterRule(localContext, 16, VeroParser.RULE_actionDeclaration);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 323;
            this.match(VeroParser.IDENTIFIER);
            this.state = 326;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 16) {
                {
                this.state = 324;
                this.match(VeroParser.WITH);
                this.state = 325;
                this.parameterList();
                }
            }

            this.state = 330;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 20) {
                {
                this.state = 328;
                this.match(VeroParser.RETURNS);
                this.state = 329;
                this.returnType();
                }
            }

            this.state = 332;
            this.match(VeroParser.LBRACE);
            this.state = 336;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 21 || _la === 31 || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 21954557) !== 0) || ((((_la - 74)) & ~0x1F) === 0 && ((1 << (_la - 74)) & 100663327) !== 0) || _la === 177) {
                {
                {
                this.state = 333;
                this.statement();
                }
                }
                this.state = 338;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 339;
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
        this.enterRule(localContext, 18, VeroParser.RULE_parameterList);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 341;
            this.match(VeroParser.IDENTIFIER);
            this.state = 346;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 164) {
                {
                {
                this.state = 342;
                this.match(VeroParser.COMMA);
                this.state = 343;
                this.match(VeroParser.IDENTIFIER);
                }
                }
                this.state = 348;
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
    public returnType(): ReturnTypeContext {
        let localContext = new ReturnTypeContext(this.context, this.state);
        this.enterRule(localContext, 20, VeroParser.RULE_returnType);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 349;
            _la = this.tokenStream.LA(1);
            if(!(((((_la - 74)) & ~0x1F) === 0 && ((1 << (_la - 74)) & 15) !== 0))) {
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
    public pageActionsDeclaration(): PageActionsDeclarationContext {
        let localContext = new PageActionsDeclarationContext(this.context, this.state);
        this.enterRule(localContext, 22, VeroParser.RULE_pageActionsDeclaration);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 351;
            this.match(VeroParser.PAGEACTIONS);
            this.state = 352;
            this.match(VeroParser.IDENTIFIER);
            this.state = 353;
            this.match(VeroParser.FOR);
            this.state = 354;
            this.match(VeroParser.IDENTIFIER);
            this.state = 355;
            this.match(VeroParser.LBRACE);
            this.state = 356;
            this.pageActionsBody();
            this.state = 357;
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
    public pageActionsBody(): PageActionsBodyContext {
        let localContext = new PageActionsBodyContext(this.context, this.state);
        this.enterRule(localContext, 24, VeroParser.RULE_pageActionsBody);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 362;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 177) {
                {
                {
                this.state = 359;
                this.pageActionsMember();
                }
                }
                this.state = 364;
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
    public pageActionsMember(): PageActionsMemberContext {
        let localContext = new PageActionsMemberContext(this.context, this.state);
        this.enterRule(localContext, 26, VeroParser.RULE_pageActionsMember);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 365;
            this.pageActionsActionDeclaration();
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
    public pageActionsActionDeclaration(): PageActionsActionDeclarationContext {
        let localContext = new PageActionsActionDeclarationContext(this.context, this.state);
        this.enterRule(localContext, 28, VeroParser.RULE_pageActionsActionDeclaration);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 367;
            this.match(VeroParser.IDENTIFIER);
            this.state = 370;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 16) {
                {
                this.state = 368;
                this.match(VeroParser.WITH);
                this.state = 369;
                this.parameterList();
                }
            }

            this.state = 374;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 20) {
                {
                this.state = 372;
                this.match(VeroParser.RETURNS);
                this.state = 373;
                this.returnType();
                }
            }

            this.state = 376;
            this.match(VeroParser.LBRACE);
            this.state = 380;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 21 || _la === 31 || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 21954557) !== 0) || ((((_la - 74)) & ~0x1F) === 0 && ((1 << (_la - 74)) & 100663327) !== 0) || _la === 177) {
                {
                {
                this.state = 377;
                this.statement();
                }
                }
                this.state = 382;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 383;
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
    public featureDeclaration(): FeatureDeclarationContext {
        let localContext = new FeatureDeclarationContext(this.context, this.state);
        this.enterRule(localContext, 30, VeroParser.RULE_featureDeclaration);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 388;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 38) !== 0)) {
                {
                {
                this.state = 385;
                this.featureAnnotation();
                }
                }
                this.state = 390;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 391;
            this.match(VeroParser.FEATURE);
            this.state = 392;
            this.match(VeroParser.IDENTIFIER);
            this.state = 393;
            this.match(VeroParser.LBRACE);
            this.state = 394;
            this.featureBody();
            this.state = 395;
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
        this.enterRule(localContext, 32, VeroParser.RULE_featureAnnotation);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 397;
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
        this.enterRule(localContext, 34, VeroParser.RULE_featureBody);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 402;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 80414) !== 0)) {
                {
                {
                this.state = 399;
                this.featureMember();
                }
                }
                this.state = 404;
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
        this.enterRule(localContext, 36, VeroParser.RULE_featureMember);
        try {
            this.state = 409;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.USE:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 405;
                this.useStatement();
                }
                break;
            case VeroParser.WITH:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 406;
                this.withFixtureStatement();
                }
                break;
            case VeroParser.BEFORE:
            case VeroParser.AFTER:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 407;
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
                this.state = 408;
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
        this.enterRule(localContext, 38, VeroParser.RULE_useStatement);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 411;
            this.match(VeroParser.USE);
            this.state = 412;
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
        this.enterRule(localContext, 40, VeroParser.RULE_hookDeclaration);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 414;
            _la = this.tokenStream.LA(1);
            if(!(_la === 12 || _la === 13)) {
            this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            this.state = 415;
            _la = this.tokenStream.LA(1);
            if(!(_la === 14 || _la === 15)) {
            this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            this.state = 416;
            this.match(VeroParser.LBRACE);
            this.state = 420;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 21 || _la === 31 || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 21954557) !== 0) || ((((_la - 74)) & ~0x1F) === 0 && ((1 << (_la - 74)) & 100663327) !== 0) || _la === 177) {
                {
                {
                this.state = 417;
                this.statement();
                }
                }
                this.state = 422;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 423;
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
        this.enterRule(localContext, 42, VeroParser.RULE_scenarioDeclaration);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 428;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 30) !== 0)) {
                {
                {
                this.state = 425;
                this.scenarioAnnotation();
                }
                }
                this.state = 430;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 431;
            this.match(VeroParser.SCENARIO);
            this.state = 432;
            this.match(VeroParser.IDENTIFIER);
            this.state = 436;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 168) {
                {
                {
                this.state = 433;
                this.tag();
                }
                }
                this.state = 438;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 439;
            this.match(VeroParser.LBRACE);
            this.state = 443;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 21 || _la === 31 || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 21954557) !== 0) || ((((_la - 74)) & ~0x1F) === 0 && ((1 << (_la - 74)) & 100663327) !== 0) || _la === 177) {
                {
                {
                this.state = 440;
                this.statement();
                }
                }
                this.state = 445;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 446;
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
        this.enterRule(localContext, 44, VeroParser.RULE_scenarioAnnotation);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 448;
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
        this.enterRule(localContext, 46, VeroParser.RULE_tag);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 450;
            this.match(VeroParser.AT);
            this.state = 451;
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
        this.enterRule(localContext, 48, VeroParser.RULE_fixtureDeclaration);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 453;
            this.match(VeroParser.FIXTURE);
            this.state = 454;
            this.match(VeroParser.IDENTIFIER);
            this.state = 456;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 16) {
                {
                this.state = 455;
                this.fixtureParams();
                }
            }

            this.state = 458;
            this.match(VeroParser.LBRACE);
            this.state = 459;
            this.fixtureBody();
            this.state = 460;
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
        this.enterRule(localContext, 50, VeroParser.RULE_fixtureParams);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 462;
            this.match(VeroParser.WITH);
            this.state = 463;
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
        this.enterRule(localContext, 52, VeroParser.RULE_fixtureBody);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 468;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 2088763392) !== 0)) {
                {
                {
                this.state = 465;
                this.fixtureMember();
                }
                }
                this.state = 470;
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
        this.enterRule(localContext, 54, VeroParser.RULE_fixtureMember);
        try {
            this.state = 477;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.SCOPE:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 471;
                this.fixtureScopeStatement();
                }
                break;
            case VeroParser.DEPENDS:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 472;
                this.fixtureDependsStatement();
                }
                break;
            case VeroParser.AUTO:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 473;
                this.fixtureAutoStatement();
                }
                break;
            case VeroParser.OPTION:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 474;
                this.fixtureOptionStatement();
                }
                break;
            case VeroParser.SETUP:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 475;
                this.fixtureSetupBlock();
                }
                break;
            case VeroParser.TEARDOWN:
                this.enterOuterAlt(localContext, 6);
                {
                this.state = 476;
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
        this.enterRule(localContext, 56, VeroParser.RULE_fixtureScopeStatement);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 479;
            this.match(VeroParser.SCOPE);
            this.state = 480;
            _la = this.tokenStream.LA(1);
            if(!(_la === 24 || _la === 25)) {
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
        this.enterRule(localContext, 58, VeroParser.RULE_fixtureDependsStatement);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 482;
            this.match(VeroParser.DEPENDS);
            this.state = 483;
            this.match(VeroParser.ON);
            this.state = 484;
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
        this.enterRule(localContext, 60, VeroParser.RULE_fixtureAutoStatement);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 486;
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
        this.enterRule(localContext, 62, VeroParser.RULE_fixtureOptionStatement);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 488;
            this.match(VeroParser.OPTION);
            this.state = 489;
            this.match(VeroParser.IDENTIFIER);
            this.state = 490;
            this.match(VeroParser.DEFAULT);
            this.state = 491;
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
        this.enterRule(localContext, 64, VeroParser.RULE_fixtureSetupBlock);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 493;
            this.match(VeroParser.SETUP);
            this.state = 494;
            this.match(VeroParser.LBRACE);
            this.state = 498;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 21 || _la === 31 || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 21954557) !== 0) || ((((_la - 74)) & ~0x1F) === 0 && ((1 << (_la - 74)) & 100663327) !== 0) || _la === 177) {
                {
                {
                this.state = 495;
                this.statement();
                }
                }
                this.state = 500;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 501;
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
        this.enterRule(localContext, 66, VeroParser.RULE_fixtureTeardownBlock);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 503;
            this.match(VeroParser.TEARDOWN);
            this.state = 504;
            this.match(VeroParser.LBRACE);
            this.state = 508;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 21 || _la === 31 || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 21954557) !== 0) || ((((_la - 74)) & ~0x1F) === 0 && ((1 << (_la - 74)) & 100663327) !== 0) || _la === 177) {
                {
                {
                this.state = 505;
                this.statement();
                }
                }
                this.state = 510;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 511;
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
        this.enterRule(localContext, 68, VeroParser.RULE_withFixtureStatement);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 513;
            this.match(VeroParser.WITH);
            this.state = 514;
            this.match(VeroParser.FIXTURE);
            this.state = 515;
            this.match(VeroParser.IDENTIFIER);
            this.state = 517;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 158) {
                {
                this.state = 516;
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
        this.enterRule(localContext, 70, VeroParser.RULE_fixtureOptionsBlock);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 519;
            this.match(VeroParser.LBRACE);
            this.state = 520;
            this.fixtureOption();
            this.state = 525;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 164) {
                {
                {
                this.state = 521;
                this.match(VeroParser.COMMA);
                this.state = 522;
                this.fixtureOption();
                }
                }
                this.state = 527;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 528;
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
        this.enterRule(localContext, 72, VeroParser.RULE_fixtureOption);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 530;
            this.match(VeroParser.IDENTIFIER);
            this.state = 531;
            this.match(VeroParser.EQUALS);
            this.state = 532;
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
        this.enterRule(localContext, 74, VeroParser.RULE_statement);
        try {
            this.state = 541;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 30, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 534;
                this.actionStatement();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 535;
                this.assertionStatement();
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 536;
                this.controlFlowStatement();
                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 537;
                this.variableDeclaration();
                }
                break;
            case 5:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 538;
                this.dataQueryStatement();
                }
                break;
            case 6:
                this.enterOuterAlt(localContext, 6);
                {
                this.state = 539;
                this.utilityStatement();
                }
                break;
            case 7:
                this.enterOuterAlt(localContext, 7);
                {
                this.state = 540;
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
    public utilityStatement(): UtilityStatementContext {
        let localContext = new UtilityStatementContext(this.context, this.state);
        this.enterRule(localContext, 76, VeroParser.RULE_utilityStatement);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 543;
            this.utilityAssignment();
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
    public utilityAssignment(): UtilityAssignmentContext {
        let localContext = new UtilityAssignmentContext(this.context, this.state);
        this.enterRule(localContext, 78, VeroParser.RULE_utilityAssignment);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 545;
            this.variableType();
            this.state = 546;
            this.match(VeroParser.IDENTIFIER);
            this.state = 547;
            this.match(VeroParser.EQUALS);
            this.state = 548;
            this.utilityExpression(0);
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

    public utilityExpression(): UtilityExpressionContext;
    public utilityExpression(_p: number): UtilityExpressionContext;
    public utilityExpression(_p?: number): UtilityExpressionContext {
        if (_p === undefined) {
            _p = 0;
        }

        let parentContext = this.context;
        let parentState = this.state;
        let localContext = new UtilityExpressionContext(this.context, parentState);
        let previousContext = localContext;
        let _startState = 80;
        this.enterRecursionRule(localContext, 80, VeroParser.RULE_utilityExpression, _p);
        try {
            let alternative: number;
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 570;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.TRIM:
                {
                this.state = 551;
                this.trimExpression();
                }
                break;
            case VeroParser.CONVERT:
                {
                this.state = 552;
                this.convertExpression();
                }
                break;
            case VeroParser.EXTRACT:
                {
                this.state = 553;
                this.extractExpression();
                }
                break;
            case VeroParser.REPLACE_:
                {
                this.state = 554;
                this.replaceExpression();
                }
                break;
            case VeroParser.SPLIT:
                {
                this.state = 555;
                this.splitExpression();
                }
                break;
            case VeroParser.JOIN_:
                {
                this.state = 556;
                this.joinExpression();
                }
                break;
            case VeroParser.LENGTH:
                {
                this.state = 557;
                this.lengthExpression();
                }
                break;
            case VeroParser.PAD:
                {
                this.state = 558;
                this.padExpression();
                }
                break;
            case VeroParser.ADD:
                {
                this.state = 559;
                this.addDateExpression();
                }
                break;
            case VeroParser.SUBTRACT:
                {
                this.state = 560;
                this.subtractDateExpression();
                }
                break;
            case VeroParser.FORMAT:
                {
                this.state = 561;
                this.formatExpression();
                }
                break;
            case VeroParser.DAY:
            case VeroParser.MONTH:
            case VeroParser.YEAR:
                {
                this.state = 562;
                this.datePartExpression();
                }
                break;
            case VeroParser.ROUND:
                {
                this.state = 563;
                this.roundExpression();
                }
                break;
            case VeroParser.ABSOLUTE:
                {
                this.state = 564;
                this.absoluteExpression();
                }
                break;
            case VeroParser.GENERATE:
                {
                this.state = 565;
                this.generateExpression();
                }
                break;
            case VeroParser.RANDOM:
                {
                this.state = 566;
                this.randomExpression();
                }
                break;
            case VeroParser.TODAY:
                {
                this.state = 567;
                this.todayExpression();
                }
                break;
            case VeroParser.NOW:
                {
                this.state = 568;
                this.nowExpression();
                }
                break;
            case VeroParser.LPAREN:
            case VeroParser.STRING_LITERAL:
            case VeroParser.NUMBER_LITERAL:
            case VeroParser.IDENTIFIER:
                {
                this.state = 569;
                this.expression();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
            this.context!.stop = this.tokenStream.LT(-1);
            this.state = 577;
            this.errorHandler.sync(this);
            alternative = this.interpreter.adaptivePredict(this.tokenStream, 32, this.context);
            while (alternative !== 2 && alternative !== antlr.ATN.INVALID_ALT_NUMBER) {
                if (alternative === 1) {
                    if (this.parseListeners != null) {
                        this.triggerExitRuleEvent();
                    }
                    previousContext = localContext;
                    {
                    {
                    localContext = new UtilityExpressionContext(parentContext, parentState);
                    this.pushNewRecursionContext(localContext, _startState, VeroParser.RULE_utilityExpression);
                    this.state = 572;
                    if (!(this.precpred(this.context, 20))) {
                        throw this.createFailedPredicateException("this.precpred(this.context, 20)");
                    }
                    this.state = 573;
                    this.match(VeroParser.THEN);
                    this.state = 574;
                    this.utilityExpression(21);
                    }
                    }
                }
                this.state = 579;
                this.errorHandler.sync(this);
                alternative = this.interpreter.adaptivePredict(this.tokenStream, 32, this.context);
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
    public trimExpression(): TrimExpressionContext {
        let localContext = new TrimExpressionContext(this.context, this.state);
        this.enterRule(localContext, 82, VeroParser.RULE_trimExpression);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 580;
            this.match(VeroParser.TRIM);
            this.state = 581;
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
    public convertExpression(): ConvertExpressionContext {
        let localContext = new ConvertExpressionContext(this.context, this.state);
        this.enterRule(localContext, 84, VeroParser.RULE_convertExpression);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 583;
            this.match(VeroParser.CONVERT);
            this.state = 584;
            this.expression();
            this.state = 585;
            this.match(VeroParser.TO);
            this.state = 586;
            _la = this.tokenStream.LA(1);
            if(!(_la === 74 || _la === 75 || _la === 118 || _la === 119)) {
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
    public extractExpression(): ExtractExpressionContext {
        let localContext = new ExtractExpressionContext(this.context, this.state);
        this.enterRule(localContext, 86, VeroParser.RULE_extractExpression);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 588;
            this.match(VeroParser.EXTRACT);
            this.state = 589;
            this.expression();
            this.state = 590;
            this.match(VeroParser.FROM);
            this.state = 591;
            this.expression();
            this.state = 592;
            this.match(VeroParser.TO);
            this.state = 593;
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
    public replaceExpression(): ReplaceExpressionContext {
        let localContext = new ReplaceExpressionContext(this.context, this.state);
        this.enterRule(localContext, 88, VeroParser.RULE_replaceExpression);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 595;
            this.match(VeroParser.REPLACE_);
            this.state = 596;
            this.expression();
            this.state = 597;
            this.match(VeroParser.STRING_LITERAL);
            this.state = 598;
            this.match(VeroParser.WITH);
            this.state = 599;
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
    public splitExpression(): SplitExpressionContext {
        let localContext = new SplitExpressionContext(this.context, this.state);
        this.enterRule(localContext, 90, VeroParser.RULE_splitExpression);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 601;
            this.match(VeroParser.SPLIT);
            this.state = 602;
            this.expression();
            this.state = 603;
            this.match(VeroParser.BY);
            this.state = 604;
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
    public joinExpression(): JoinExpressionContext {
        let localContext = new JoinExpressionContext(this.context, this.state);
        this.enterRule(localContext, 92, VeroParser.RULE_joinExpression);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 606;
            this.match(VeroParser.JOIN_);
            this.state = 607;
            this.expression();
            this.state = 608;
            this.match(VeroParser.WITH);
            this.state = 609;
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
    public lengthExpression(): LengthExpressionContext {
        let localContext = new LengthExpressionContext(this.context, this.state);
        this.enterRule(localContext, 94, VeroParser.RULE_lengthExpression);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 611;
            this.match(VeroParser.LENGTH);
            this.state = 612;
            this.match(VeroParser.OF);
            this.state = 613;
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
    public padExpression(): PadExpressionContext {
        let localContext = new PadExpressionContext(this.context, this.state);
        this.enterRule(localContext, 96, VeroParser.RULE_padExpression);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 615;
            this.match(VeroParser.PAD);
            this.state = 616;
            this.expression();
            this.state = 617;
            this.match(VeroParser.TO);
            this.state = 618;
            this.expression();
            this.state = 619;
            this.match(VeroParser.WITH);
            this.state = 620;
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
    public todayExpression(): TodayExpressionContext {
        let localContext = new TodayExpressionContext(this.context, this.state);
        this.enterRule(localContext, 98, VeroParser.RULE_todayExpression);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 622;
            this.match(VeroParser.TODAY);
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
    public nowExpression(): NowExpressionContext {
        let localContext = new NowExpressionContext(this.context, this.state);
        this.enterRule(localContext, 100, VeroParser.RULE_nowExpression);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 624;
            this.match(VeroParser.NOW);
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
    public addDateExpression(): AddDateExpressionContext {
        let localContext = new AddDateExpressionContext(this.context, this.state);
        this.enterRule(localContext, 102, VeroParser.RULE_addDateExpression);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 626;
            this.match(VeroParser.ADD);
            this.state = 627;
            this.expression();
            this.state = 628;
            this.dateUnit();
            this.state = 629;
            this.match(VeroParser.TO);
            this.state = 630;
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
    public subtractDateExpression(): SubtractDateExpressionContext {
        let localContext = new SubtractDateExpressionContext(this.context, this.state);
        this.enterRule(localContext, 104, VeroParser.RULE_subtractDateExpression);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 632;
            this.match(VeroParser.SUBTRACT);
            this.state = 633;
            this.expression();
            this.state = 634;
            this.dateUnit();
            this.state = 635;
            this.match(VeroParser.FROM);
            this.state = 636;
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
    public dateUnit(): DateUnitContext {
        let localContext = new DateUnitContext(this.context, this.state);
        this.enterRule(localContext, 106, VeroParser.RULE_dateUnit);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 638;
            _la = this.tokenStream.LA(1);
            if(!(((((_la - 110)) & ~0x1F) === 0 && ((1 << (_la - 110)) & 7340039) !== 0))) {
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
    public formatExpression(): FormatExpressionContext {
        let localContext = new FormatExpressionContext(this.context, this.state);
        this.enterRule(localContext, 108, VeroParser.RULE_formatExpression);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 640;
            this.match(VeroParser.FORMAT);
            this.state = 641;
            this.expression();
            this.state = 642;
            this.match(VeroParser.AS);
            this.state = 649;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.STRING_LITERAL:
                {
                this.state = 643;
                this.match(VeroParser.STRING_LITERAL);
                }
                break;
            case VeroParser.CURRENCY:
                {
                this.state = 644;
                this.match(VeroParser.CURRENCY);
                this.state = 646;
                this.errorHandler.sync(this);
                switch (this.interpreter.adaptivePredict(this.tokenStream, 33, this.context) ) {
                case 1:
                    {
                    this.state = 645;
                    this.match(VeroParser.STRING_LITERAL);
                    }
                    break;
                }
                }
                break;
            case VeroParser.PERCENT:
                {
                this.state = 648;
                this.match(VeroParser.PERCENT);
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
    public datePartExpression(): DatePartExpressionContext {
        let localContext = new DatePartExpressionContext(this.context, this.state);
        this.enterRule(localContext, 110, VeroParser.RULE_datePartExpression);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 651;
            _la = this.tokenStream.LA(1);
            if(!(((((_la - 130)) & ~0x1F) === 0 && ((1 << (_la - 130)) & 7) !== 0))) {
            this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            this.state = 652;
            this.match(VeroParser.OF);
            this.state = 653;
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
    public roundExpression(): RoundExpressionContext {
        let localContext = new RoundExpressionContext(this.context, this.state);
        this.enterRule(localContext, 112, VeroParser.RULE_roundExpression);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 655;
            this.match(VeroParser.ROUND);
            this.state = 656;
            this.expression();
            this.state = 663;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 35, this.context) ) {
            case 1:
                {
                this.state = 657;
                this.match(VeroParser.TO);
                this.state = 658;
                this.expression();
                this.state = 659;
                this.match(VeroParser.DECIMALS);
                }
                break;
            case 2:
                {
                this.state = 661;
                this.match(VeroParser.UP);
                }
                break;
            case 3:
                {
                this.state = 662;
                this.match(VeroParser.DOWN);
                }
                break;
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
    public absoluteExpression(): AbsoluteExpressionContext {
        let localContext = new AbsoluteExpressionContext(this.context, this.state);
        this.enterRule(localContext, 114, VeroParser.RULE_absoluteExpression);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 665;
            this.match(VeroParser.ABSOLUTE);
            this.state = 666;
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
    public generateExpression(): GenerateExpressionContext {
        let localContext = new GenerateExpressionContext(this.context, this.state);
        this.enterRule(localContext, 116, VeroParser.RULE_generateExpression);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 668;
            this.match(VeroParser.GENERATE);
            this.state = 669;
            _la = this.tokenStream.LA(1);
            if(!(_la === 140 || _la === 175)) {
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
    public randomExpression(): RandomExpressionContext {
        let localContext = new RandomExpressionContext(this.context, this.state);
        this.enterRule(localContext, 118, VeroParser.RULE_randomExpression);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 671;
            this.match(VeroParser.RANDOM);
            this.state = 672;
            this.match(VeroParser.NUMBER);
            this.state = 673;
            this.match(VeroParser.FROM);
            this.state = 674;
            this.expression();
            this.state = 675;
            this.match(VeroParser.TO);
            this.state = 676;
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
    public actionStatement(): ActionStatementContext {
        let localContext = new ActionStatementContext(this.context, this.state);
        this.enterRule(localContext, 120, VeroParser.RULE_actionStatement);
        try {
            this.state = 698;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 36, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 678;
                this.clickAction();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 679;
                this.fillAction();
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 680;
                this.openAction();
                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 681;
                this.checkAction();
                }
                break;
            case 5:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 682;
                this.uncheckAction();
                }
                break;
            case 6:
                this.enterOuterAlt(localContext, 6);
                {
                this.state = 683;
                this.selectAction();
                }
                break;
            case 7:
                this.enterOuterAlt(localContext, 7);
                {
                this.state = 684;
                this.hoverAction();
                }
                break;
            case 8:
                this.enterOuterAlt(localContext, 8);
                {
                this.state = 685;
                this.pressAction();
                }
                break;
            case 9:
                this.enterOuterAlt(localContext, 9);
                {
                this.state = 686;
                this.scrollAction();
                }
                break;
            case 10:
                this.enterOuterAlt(localContext, 10);
                {
                this.state = 687;
                this.waitAction();
                }
                break;
            case 11:
                this.enterOuterAlt(localContext, 11);
                {
                this.state = 688;
                this.performAction();
                }
                break;
            case 12:
                this.enterOuterAlt(localContext, 12);
                {
                this.state = 689;
                this.refreshAction();
                }
                break;
            case 13:
                this.enterOuterAlt(localContext, 13);
                {
                this.state = 690;
                this.clearAction();
                }
                break;
            case 14:
                this.enterOuterAlt(localContext, 14);
                {
                this.state = 691;
                this.screenshotAction();
                }
                break;
            case 15:
                this.enterOuterAlt(localContext, 15);
                {
                this.state = 692;
                this.logAction();
                }
                break;
            case 16:
                this.enterOuterAlt(localContext, 16);
                {
                this.state = 693;
                this.uploadAction();
                }
                break;
            case 17:
                this.enterOuterAlt(localContext, 17);
                {
                this.state = 694;
                this.switchToNewTabAction();
                }
                break;
            case 18:
                this.enterOuterAlt(localContext, 18);
                {
                this.state = 695;
                this.switchToTabAction();
                }
                break;
            case 19:
                this.enterOuterAlt(localContext, 19);
                {
                this.state = 696;
                this.openInNewTabAction();
                }
                break;
            case 20:
                this.enterOuterAlt(localContext, 20);
                {
                this.state = 697;
                this.closeTabAction();
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
    public clickAction(): ClickActionContext {
        let localContext = new ClickActionContext(this.context, this.state);
        this.enterRule(localContext, 122, VeroParser.RULE_clickAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 700;
            this.match(VeroParser.CLICK);
            this.state = 701;
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
        this.enterRule(localContext, 124, VeroParser.RULE_fillAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 703;
            this.match(VeroParser.FILL);
            this.state = 704;
            this.selectorExpression();
            this.state = 705;
            this.match(VeroParser.WITH);
            this.state = 706;
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
        this.enterRule(localContext, 126, VeroParser.RULE_openAction);
        try {
            this.state = 716;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 37, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 708;
                this.match(VeroParser.OPEN);
                this.state = 709;
                this.expression();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 710;
                this.match(VeroParser.OPEN);
                this.state = 711;
                this.expression();
                this.state = 712;
                this.match(VeroParser.IN);
                this.state = 713;
                this.match(VeroParser.NEW);
                this.state = 714;
                this.match(VeroParser.TAB);
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
    public checkAction(): CheckActionContext {
        let localContext = new CheckActionContext(this.context, this.state);
        this.enterRule(localContext, 128, VeroParser.RULE_checkAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 718;
            this.match(VeroParser.CHECK);
            this.state = 719;
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
        this.enterRule(localContext, 130, VeroParser.RULE_uncheckAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 721;
            this.match(VeroParser.UNCHECK);
            this.state = 722;
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
        this.enterRule(localContext, 132, VeroParser.RULE_selectAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 724;
            this.match(VeroParser.SELECT);
            this.state = 725;
            this.expression();
            this.state = 726;
            this.match(VeroParser.FROM);
            this.state = 727;
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
        this.enterRule(localContext, 134, VeroParser.RULE_hoverAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 729;
            this.match(VeroParser.HOVER);
            this.state = 730;
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
        this.enterRule(localContext, 136, VeroParser.RULE_pressAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 732;
            this.match(VeroParser.PRESS);
            this.state = 733;
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
        this.enterRule(localContext, 138, VeroParser.RULE_scrollAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 735;
            this.match(VeroParser.SCROLL);
            this.state = 739;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.TO:
                {
                this.state = 736;
                this.match(VeroParser.TO);
                this.state = 737;
                this.selectorExpression();
                }
                break;
            case VeroParser.UP:
            case VeroParser.DOWN:
            case VeroParser.LEFT:
            case VeroParser.RIGHT:
                {
                this.state = 738;
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
        this.enterRule(localContext, 140, VeroParser.RULE_direction);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 741;
            _la = this.tokenStream.LA(1);
            if(!(((((_la - 154)) & ~0x1F) === 0 && ((1 << (_la - 154)) & 15) !== 0))) {
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
        this.enterRule(localContext, 142, VeroParser.RULE_waitAction);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 743;
            this.match(VeroParser.WAIT);
            this.state = 749;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.LPAREN:
            case VeroParser.STRING_LITERAL:
            case VeroParser.NUMBER_LITERAL:
            case VeroParser.IDENTIFIER:
                {
                this.state = 744;
                this.expression();
                this.state = 745;
                _la = this.tokenStream.LA(1);
                if(!(_la === 114 || _la === 115)) {
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
                this.state = 747;
                this.match(VeroParser.FOR);
                this.state = 748;
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
    public performAction(): PerformActionContext {
        let localContext = new PerformActionContext(this.context, this.state);
        this.enterRule(localContext, 144, VeroParser.RULE_performAction);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 751;
            this.match(VeroParser.PERFORM);
            this.state = 752;
            this.pageMethodReference();
            this.state = 755;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 16) {
                {
                this.state = 753;
                this.match(VeroParser.WITH);
                this.state = 754;
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
        this.enterRule(localContext, 146, VeroParser.RULE_refreshAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 757;
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
        this.enterRule(localContext, 148, VeroParser.RULE_clearAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 759;
            this.match(VeroParser.CLEAR);
            this.state = 760;
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
        this.enterRule(localContext, 150, VeroParser.RULE_screenshotAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 762;
            this.match(VeroParser.TAKE);
            this.state = 763;
            this.match(VeroParser.SCREENSHOT);
            this.state = 765;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 41, this.context) ) {
            case 1:
                {
                this.state = 764;
                this.expression();
                }
                break;
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
        this.enterRule(localContext, 152, VeroParser.RULE_logAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 767;
            this.match(VeroParser.LOG);
            this.state = 768;
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
        this.enterRule(localContext, 154, VeroParser.RULE_uploadAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 770;
            this.match(VeroParser.UPLOAD);
            this.state = 771;
            this.fileList();
            this.state = 772;
            this.match(VeroParser.TO);
            this.state = 773;
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
        this.enterRule(localContext, 156, VeroParser.RULE_fileList);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 775;
            this.expression();
            this.state = 780;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 164) {
                {
                {
                this.state = 776;
                this.match(VeroParser.COMMA);
                this.state = 777;
                this.expression();
                }
                }
                this.state = 782;
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
    public switchToNewTabAction(): SwitchToNewTabActionContext {
        let localContext = new SwitchToNewTabActionContext(this.context, this.state);
        this.enterRule(localContext, 158, VeroParser.RULE_switchToNewTabAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 783;
            this.match(VeroParser.SWITCH);
            this.state = 784;
            this.match(VeroParser.TO);
            this.state = 785;
            this.match(VeroParser.NEW);
            this.state = 786;
            this.match(VeroParser.TAB);
            this.state = 788;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 43, this.context) ) {
            case 1:
                {
                this.state = 787;
                this.expression();
                }
                break;
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
    public switchToTabAction(): SwitchToTabActionContext {
        let localContext = new SwitchToTabActionContext(this.context, this.state);
        this.enterRule(localContext, 160, VeroParser.RULE_switchToTabAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 790;
            this.match(VeroParser.SWITCH);
            this.state = 791;
            this.match(VeroParser.TO);
            this.state = 792;
            this.match(VeroParser.TAB);
            this.state = 793;
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
    public openInNewTabAction(): OpenInNewTabActionContext {
        let localContext = new OpenInNewTabActionContext(this.context, this.state);
        this.enterRule(localContext, 162, VeroParser.RULE_openInNewTabAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 795;
            this.match(VeroParser.OPEN);
            this.state = 796;
            this.expression();
            this.state = 797;
            this.match(VeroParser.IN);
            this.state = 798;
            this.match(VeroParser.NEW);
            this.state = 799;
            this.match(VeroParser.TAB);
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
    public closeTabAction(): CloseTabActionContext {
        let localContext = new CloseTabActionContext(this.context, this.state);
        this.enterRule(localContext, 164, VeroParser.RULE_closeTabAction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 801;
            this.match(VeroParser.CLOSE);
            this.state = 802;
            this.match(VeroParser.TAB);
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
        this.enterRule(localContext, 166, VeroParser.RULE_assertionStatement);
        let _la: number;
        try {
            this.state = 820;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 44, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 804;
                this.match(VeroParser.VERIFY);
                this.state = 805;
                this.selectorOrText();
                this.state = 806;
                _la = this.tokenStream.LA(1);
                if(!(_la === 58 || _la === 59)) {
                this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                this.state = 807;
                this.condition();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 809;
                this.match(VeroParser.VERIFY);
                this.state = 810;
                this.match(VeroParser.URL);
                this.state = 811;
                this.urlCondition();
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 812;
                this.match(VeroParser.VERIFY);
                this.state = 813;
                this.match(VeroParser.TITLE);
                this.state = 814;
                this.titleCondition();
                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 815;
                this.match(VeroParser.VERIFY);
                this.state = 816;
                this.selectorExpression();
                this.state = 817;
                this.match(VeroParser.HAS);
                this.state = 818;
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
        this.enterRule(localContext, 168, VeroParser.RULE_selectorOrText);
        try {
            this.state = 824;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 45, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 822;
                this.selectorExpression();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 823;
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
        this.enterRule(localContext, 170, VeroParser.RULE_condition);
        try {
            this.state = 833;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.VISIBLE:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 826;
                this.match(VeroParser.VISIBLE);
                }
                break;
            case VeroParser.HIDDEN_STATE:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 827;
                this.match(VeroParser.HIDDEN_STATE);
                }
                break;
            case VeroParser.ENABLED:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 828;
                this.match(VeroParser.ENABLED);
                }
                break;
            case VeroParser.DISABLED:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 829;
                this.match(VeroParser.DISABLED);
                }
                break;
            case VeroParser.CHECKED:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 830;
                this.match(VeroParser.CHECKED);
                }
                break;
            case VeroParser.EMPTY:
                this.enterOuterAlt(localContext, 6);
                {
                this.state = 831;
                this.match(VeroParser.EMPTY);
                }
                break;
            case VeroParser.CONTAINS:
                this.enterOuterAlt(localContext, 7);
                {
                this.state = 832;
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
        this.enterRule(localContext, 172, VeroParser.RULE_containsCondition);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 835;
            this.match(VeroParser.CONTAINS);
            this.state = 836;
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
        this.enterRule(localContext, 174, VeroParser.RULE_urlCondition);
        try {
            this.state = 844;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.CONTAINS:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 838;
                this.match(VeroParser.CONTAINS);
                this.state = 839;
                this.expression();
                }
                break;
            case VeroParser.EQUAL:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 840;
                this.match(VeroParser.EQUAL);
                this.state = 841;
                this.expression();
                }
                break;
            case VeroParser.MATCHES:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 842;
                this.match(VeroParser.MATCHES);
                this.state = 843;
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
        this.enterRule(localContext, 176, VeroParser.RULE_titleCondition);
        try {
            this.state = 850;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.CONTAINS:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 846;
                this.match(VeroParser.CONTAINS);
                this.state = 847;
                this.expression();
                }
                break;
            case VeroParser.EQUAL:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 848;
                this.match(VeroParser.EQUAL);
                this.state = 849;
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
        this.enterRule(localContext, 178, VeroParser.RULE_hasCondition);
        try {
            this.state = 861;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.COUNT:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 852;
                this.match(VeroParser.COUNT);
                this.state = 853;
                this.expression();
                }
                break;
            case VeroParser.VALUE:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 854;
                this.match(VeroParser.VALUE);
                this.state = 855;
                this.expression();
                }
                break;
            case VeroParser.ATTRIBUTE:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 856;
                this.match(VeroParser.ATTRIBUTE);
                this.state = 857;
                this.expression();
                this.state = 858;
                this.match(VeroParser.EQUAL);
                this.state = 859;
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
        this.enterRule(localContext, 180, VeroParser.RULE_controlFlowStatement);
        try {
            this.state = 865;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.IF:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 863;
                this.ifStatement();
                }
                break;
            case VeroParser.REPEAT:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 864;
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
        this.enterRule(localContext, 182, VeroParser.RULE_ifStatement);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 867;
            this.match(VeroParser.IF);
            this.state = 868;
            this.booleanExpression();
            this.state = 869;
            this.match(VeroParser.LBRACE);
            this.state = 873;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 21 || _la === 31 || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 21954557) !== 0) || ((((_la - 74)) & ~0x1F) === 0 && ((1 << (_la - 74)) & 100663327) !== 0) || _la === 177) {
                {
                {
                this.state = 870;
                this.statement();
                }
                }
                this.state = 875;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 876;
            this.match(VeroParser.RBRACE);
            this.state = 886;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 32) {
                {
                this.state = 877;
                this.match(VeroParser.ELSE);
                this.state = 878;
                this.match(VeroParser.LBRACE);
                this.state = 882;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                while (_la === 21 || _la === 31 || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 21954557) !== 0) || ((((_la - 74)) & ~0x1F) === 0 && ((1 << (_la - 74)) & 100663327) !== 0) || _la === 177) {
                    {
                    {
                    this.state = 879;
                    this.statement();
                    }
                    }
                    this.state = 884;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                }
                this.state = 885;
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
        this.enterRule(localContext, 184, VeroParser.RULE_repeatStatement);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 888;
            this.match(VeroParser.REPEAT);
            this.state = 889;
            this.expression();
            this.state = 890;
            this.match(VeroParser.TIMES);
            this.state = 891;
            this.match(VeroParser.LBRACE);
            this.state = 895;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 21 || _la === 31 || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 21954557) !== 0) || ((((_la - 74)) & ~0x1F) === 0 && ((1 << (_la - 74)) & 100663327) !== 0) || _la === 177) {
                {
                {
                this.state = 892;
                this.statement();
                }
                }
                this.state = 897;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 898;
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
        this.enterRule(localContext, 186, VeroParser.RULE_booleanExpression);
        try {
            this.state = 913;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 55, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 900;
                this.selectorExpression();
                this.state = 901;
                this.match(VeroParser.IS);
                this.state = 902;
                this.condition();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 904;
                this.selectorExpression();
                this.state = 905;
                this.match(VeroParser.ISNOT);
                this.state = 906;
                this.condition();
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 908;
                this.expression();
                this.state = 909;
                this.comparisonOperator();
                this.state = 910;
                this.expression();
                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 912;
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
        this.enterRule(localContext, 188, VeroParser.RULE_comparisonOperator);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 915;
            _la = this.tokenStream.LA(1);
            if(!(((((_la - 169)) & ~0x1F) === 0 && ((1 << (_la - 169)) & 63) !== 0))) {
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
        this.enterRule(localContext, 190, VeroParser.RULE_variableDeclaration);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 917;
            this.variableType();
            this.state = 918;
            this.match(VeroParser.IDENTIFIER);
            this.state = 919;
            this.match(VeroParser.EQUALS);
            this.state = 920;
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
        this.enterRule(localContext, 192, VeroParser.RULE_variableType);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 922;
            _la = this.tokenStream.LA(1);
            if(!(((((_la - 74)) & ~0x1F) === 0 && ((1 << (_la - 74)) & 31) !== 0))) {
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
        this.enterRule(localContext, 194, VeroParser.RULE_returnStatement);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 924;
            this.match(VeroParser.RETURN);
            this.state = 926;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 56, this.context) ) {
            case 1:
                {
                this.state = 925;
                this.expression();
                }
                break;
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
        this.enterRule(localContext, 196, VeroParser.RULE_dataQueryStatement);
        try {
            this.state = 933;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 57, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 928;
                this.rowStatement();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 929;
                this.rowsStatement();
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 930;
                this.columnAccessStatement();
                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 931;
                this.countStatement();
                }
                break;
            case 5:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 932;
                this.legacyDataQueryStatement();
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
    public rowStatement(): RowStatementContext {
        let localContext = new RowStatementContext(this.context, this.state);
        this.enterRule(localContext, 198, VeroParser.RULE_rowStatement);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 935;
            this.match(VeroParser.ROW);
            this.state = 936;
            this.match(VeroParser.IDENTIFIER);
            this.state = 937;
            this.match(VeroParser.EQUALS);
            this.state = 939;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (((((_la - 87)) & ~0x1F) === 0 && ((1 << (_la - 87)) & 7) !== 0)) {
                {
                this.state = 938;
                this.rowModifier();
                }
            }

            this.state = 941;
            this.simpleTableReference();
            this.state = 943;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 80) {
                {
                this.state = 942;
                this.dataWhereClause();
                }
            }

            this.state = 946;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 81) {
                {
                this.state = 945;
                this.orderByClause();
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
    public rowModifier(): RowModifierContext {
        let localContext = new RowModifierContext(this.context, this.state);
        this.enterRule(localContext, 200, VeroParser.RULE_rowModifier);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 948;
            _la = this.tokenStream.LA(1);
            if(!(((((_la - 87)) & ~0x1F) === 0 && ((1 << (_la - 87)) & 7) !== 0))) {
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
    public rowsStatement(): RowsStatementContext {
        let localContext = new RowsStatementContext(this.context, this.state);
        this.enterRule(localContext, 202, VeroParser.RULE_rowsStatement);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 950;
            this.match(VeroParser.ROWS);
            this.state = 951;
            this.match(VeroParser.IDENTIFIER);
            this.state = 952;
            this.match(VeroParser.EQUALS);
            this.state = 953;
            this.simpleTableReference();
            this.state = 955;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 80) {
                {
                this.state = 954;
                this.dataWhereClause();
                }
            }

            this.state = 958;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 81) {
                {
                this.state = 957;
                this.orderByClause();
                }
            }

            this.state = 961;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 85) {
                {
                this.state = 960;
                this.limitClause();
                }
            }

            this.state = 964;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 86) {
                {
                this.state = 963;
                this.offsetClause();
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
    public columnAccessStatement(): ColumnAccessStatementContext {
        let localContext = new ColumnAccessStatementContext(this.context, this.state);
        this.enterRule(localContext, 204, VeroParser.RULE_columnAccessStatement);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 966;
            this.match(VeroParser.IDENTIFIER);
            this.state = 967;
            this.match(VeroParser.EQUALS);
            this.state = 969;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 98) {
                {
                this.state = 968;
                this.match(VeroParser.DISTINCT);
                }
            }

            this.state = 971;
            this.simpleTableReference();
            this.state = 972;
            this.match(VeroParser.DOT);
            this.state = 973;
            this.match(VeroParser.IDENTIFIER);
            this.state = 975;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 80) {
                {
                this.state = 974;
                this.dataWhereClause();
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
    public countStatement(): CountStatementContext {
        let localContext = new CountStatementContext(this.context, this.state);
        this.enterRule(localContext, 206, VeroParser.RULE_countStatement);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 977;
            this.match(VeroParser.NUMBER);
            this.state = 978;
            this.match(VeroParser.IDENTIFIER);
            this.state = 979;
            this.match(VeroParser.EQUALS);
            this.state = 980;
            this.match(VeroParser.COUNT);
            this.state = 981;
            this.simpleTableReference();
            this.state = 983;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 80) {
                {
                this.state = 982;
                this.dataWhereClause();
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
    public simpleTableReference(): SimpleTableReferenceContext {
        let localContext = new SimpleTableReferenceContext(this.context, this.state);
        this.enterRule(localContext, 208, VeroParser.RULE_simpleTableReference);
        try {
            this.state = 989;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 68, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 985;
                this.match(VeroParser.IDENTIFIER);
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 986;
                this.match(VeroParser.IDENTIFIER);
                this.state = 987;
                this.match(VeroParser.DOT);
                this.state = 988;
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
    public legacyDataQueryStatement(): LegacyDataQueryStatementContext {
        let localContext = new LegacyDataQueryStatementContext(this.context, this.state);
        this.enterRule(localContext, 210, VeroParser.RULE_legacyDataQueryStatement);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 991;
            this.dataResultType();
            this.state = 992;
            this.match(VeroParser.IDENTIFIER);
            this.state = 993;
            this.match(VeroParser.EQUALS);
            this.state = 994;
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
        this.enterRule(localContext, 212, VeroParser.RULE_dataResultType);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 996;
            _la = this.tokenStream.LA(1);
            if(!(((((_la - 74)) & ~0x1F) === 0 && ((1 << (_la - 74)) & 31) !== 0))) {
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
        this.enterRule(localContext, 214, VeroParser.RULE_dataQuery);
        try {
            this.state = 1000;
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
                this.state = 998;
                this.aggregationQuery();
                }
                break;
            case VeroParser.TESTDATA:
            case VeroParser.FIRST:
            case VeroParser.LAST:
            case VeroParser.RANDOM:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 999;
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
        this.enterRule(localContext, 216, VeroParser.RULE_aggregationQuery);
        let _la: number;
        try {
            this.state = 1047;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 77, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 1002;
                this.match(VeroParser.COUNT);
                this.state = 1003;
                this.tableReference();
                this.state = 1005;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 80) {
                    {
                    this.state = 1004;
                    this.dataWhereClause();
                    }
                }

                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 1007;
                this.match(VeroParser.COUNT);
                this.state = 1008;
                this.match(VeroParser.DISTINCT);
                this.state = 1009;
                this.columnReference();
                this.state = 1011;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 80) {
                    {
                    this.state = 1010;
                    this.dataWhereClause();
                    }
                }

                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 1013;
                this.match(VeroParser.SUM);
                this.state = 1014;
                this.columnReference();
                this.state = 1016;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 80) {
                    {
                    this.state = 1015;
                    this.dataWhereClause();
                    }
                }

                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 1018;
                this.match(VeroParser.AVERAGE);
                this.state = 1019;
                this.columnReference();
                this.state = 1021;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 80) {
                    {
                    this.state = 1020;
                    this.dataWhereClause();
                    }
                }

                }
                break;
            case 5:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 1023;
                this.match(VeroParser.MIN);
                this.state = 1024;
                this.columnReference();
                this.state = 1026;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 80) {
                    {
                    this.state = 1025;
                    this.dataWhereClause();
                    }
                }

                }
                break;
            case 6:
                this.enterOuterAlt(localContext, 6);
                {
                this.state = 1028;
                this.match(VeroParser.MAX);
                this.state = 1029;
                this.columnReference();
                this.state = 1031;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 80) {
                    {
                    this.state = 1030;
                    this.dataWhereClause();
                    }
                }

                }
                break;
            case 7:
                this.enterOuterAlt(localContext, 7);
                {
                this.state = 1033;
                this.match(VeroParser.DISTINCT);
                this.state = 1034;
                this.columnReference();
                this.state = 1036;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 80) {
                    {
                    this.state = 1035;
                    this.dataWhereClause();
                    }
                }

                }
                break;
            case 8:
                this.enterOuterAlt(localContext, 8);
                {
                this.state = 1038;
                this.match(VeroParser.ROWS);
                this.state = 1039;
                this.match(VeroParser.IN);
                this.state = 1040;
                this.tableReference();
                }
                break;
            case 9:
                this.enterOuterAlt(localContext, 9);
                {
                this.state = 1041;
                this.match(VeroParser.COLUMNS);
                this.state = 1042;
                this.match(VeroParser.IN);
                this.state = 1043;
                this.tableReference();
                }
                break;
            case 10:
                this.enterOuterAlt(localContext, 10);
                {
                this.state = 1044;
                this.match(VeroParser.HEADERS);
                this.state = 1045;
                this.match(VeroParser.OF);
                this.state = 1046;
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
        this.enterRule(localContext, 218, VeroParser.RULE_tableQuery);
        let _la: number;
        try {
            this.state = 1070;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 82, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 1050;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (((((_la - 87)) & ~0x1F) === 0 && ((1 << (_la - 87)) & 7) !== 0)) {
                    {
                    this.state = 1049;
                    _la = this.tokenStream.LA(1);
                    if(!(((((_la - 87)) & ~0x1F) === 0 && ((1 << (_la - 87)) & 7) !== 0))) {
                    this.errorHandler.recoverInline(this);
                    }
                    else {
                        this.errorHandler.reportMatch(this);
                        this.consume();
                    }
                    }
                }

                this.state = 1052;
                this.tableReference();
                this.state = 1056;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                while (((((_la - 80)) & ~0x1F) === 0 && ((1 << (_la - 80)) & 1123) !== 0)) {
                    {
                    {
                    this.state = 1053;
                    this.queryModifier();
                    }
                    }
                    this.state = 1058;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                }
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 1060;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (((((_la - 87)) & ~0x1F) === 0 && ((1 << (_la - 87)) & 7) !== 0)) {
                    {
                    this.state = 1059;
                    _la = this.tokenStream.LA(1);
                    if(!(((((_la - 87)) & ~0x1F) === 0 && ((1 << (_la - 87)) & 7) !== 0))) {
                    this.errorHandler.recoverInline(this);
                    }
                    else {
                        this.errorHandler.reportMatch(this);
                        this.consume();
                    }
                    }
                }

                this.state = 1062;
                this.tableReference();
                this.state = 1063;
                this.columnSelector();
                this.state = 1067;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                while (((((_la - 80)) & ~0x1F) === 0 && ((1 << (_la - 80)) & 1123) !== 0)) {
                    {
                    {
                    this.state = 1064;
                    this.queryModifier();
                    }
                    }
                    this.state = 1069;
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
        this.enterRule(localContext, 220, VeroParser.RULE_tableReference);
        try {
            this.state = 1115;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 83, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 1072;
                this.match(VeroParser.TESTDATA);
                this.state = 1073;
                this.match(VeroParser.DOT);
                this.state = 1074;
                this.match(VeroParser.IDENTIFIER);
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 1075;
                this.match(VeroParser.TESTDATA);
                this.state = 1076;
                this.match(VeroParser.DOT);
                this.state = 1077;
                this.match(VeroParser.IDENTIFIER);
                this.state = 1078;
                this.match(VeroParser.DOT);
                this.state = 1079;
                this.match(VeroParser.IDENTIFIER);
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 1080;
                this.match(VeroParser.TESTDATA);
                this.state = 1081;
                this.match(VeroParser.DOT);
                this.state = 1082;
                this.match(VeroParser.IDENTIFIER);
                this.state = 1083;
                this.match(VeroParser.LBRACK);
                this.state = 1084;
                this.expression();
                this.state = 1085;
                this.match(VeroParser.RBRACK);
                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 1087;
                this.match(VeroParser.TESTDATA);
                this.state = 1088;
                this.match(VeroParser.DOT);
                this.state = 1089;
                this.match(VeroParser.IDENTIFIER);
                this.state = 1090;
                this.match(VeroParser.LBRACK);
                this.state = 1091;
                this.expression();
                this.state = 1092;
                this.match(VeroParser.RBRACK);
                this.state = 1093;
                this.match(VeroParser.DOT);
                this.state = 1094;
                this.match(VeroParser.IDENTIFIER);
                }
                break;
            case 5:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 1096;
                this.match(VeroParser.TESTDATA);
                this.state = 1097;
                this.match(VeroParser.DOT);
                this.state = 1098;
                this.match(VeroParser.IDENTIFIER);
                this.state = 1099;
                this.match(VeroParser.LBRACK);
                this.state = 1100;
                this.expression();
                this.state = 1101;
                this.match(VeroParser.DOTDOT);
                this.state = 1102;
                this.expression();
                this.state = 1103;
                this.match(VeroParser.RBRACK);
                }
                break;
            case 6:
                this.enterOuterAlt(localContext, 6);
                {
                this.state = 1105;
                this.match(VeroParser.TESTDATA);
                this.state = 1106;
                this.match(VeroParser.DOT);
                this.state = 1107;
                this.match(VeroParser.IDENTIFIER);
                this.state = 1108;
                this.match(VeroParser.CELL);
                this.state = 1109;
                this.match(VeroParser.LBRACK);
                this.state = 1110;
                this.expression();
                this.state = 1111;
                this.match(VeroParser.COMMA);
                this.state = 1112;
                this.expression();
                this.state = 1113;
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
        this.enterRule(localContext, 222, VeroParser.RULE_columnSelector);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 1117;
            this.match(VeroParser.DOT);
            this.state = 1118;
            this.match(VeroParser.LPAREN);
            this.state = 1119;
            this.identifierList();
            this.state = 1120;
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
        this.enterRule(localContext, 224, VeroParser.RULE_identifierList);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 1122;
            this.match(VeroParser.IDENTIFIER);
            this.state = 1127;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 164) {
                {
                {
                this.state = 1123;
                this.match(VeroParser.COMMA);
                this.state = 1124;
                this.match(VeroParser.IDENTIFIER);
                }
                }
                this.state = 1129;
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
        this.enterRule(localContext, 226, VeroParser.RULE_columnReference);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 1130;
            this.match(VeroParser.TESTDATA);
            this.state = 1131;
            this.match(VeroParser.DOT);
            this.state = 1132;
            this.match(VeroParser.IDENTIFIER);
            this.state = 1133;
            this.match(VeroParser.DOT);
            this.state = 1134;
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
        this.enterRule(localContext, 228, VeroParser.RULE_queryModifier);
        try {
            this.state = 1141;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.WHERE:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 1136;
                this.dataWhereClause();
                }
                break;
            case VeroParser.ORDER:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 1137;
                this.orderByClause();
                }
                break;
            case VeroParser.LIMIT:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 1138;
                this.limitClause();
                }
                break;
            case VeroParser.OFFSET:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 1139;
                this.offsetClause();
                }
                break;
            case VeroParser.DEFAULT:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 1140;
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
        this.enterRule(localContext, 230, VeroParser.RULE_dataWhereClause);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 1143;
            this.match(VeroParser.WHERE);
            this.state = 1144;
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
        let _startState = 232;
        this.enterRecursionRule(localContext, 232, VeroParser.RULE_dataCondition, _p);
        try {
            let alternative: number;
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 1154;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.NOT:
                {
                this.state = 1147;
                this.match(VeroParser.NOT);
                this.state = 1148;
                this.dataCondition(3);
                }
                break;
            case VeroParser.LPAREN:
                {
                this.state = 1149;
                this.match(VeroParser.LPAREN);
                this.state = 1150;
                this.dataCondition(0);
                this.state = 1151;
                this.match(VeroParser.RPAREN);
                }
                break;
            case VeroParser.IDENTIFIER:
                {
                this.state = 1153;
                this.dataComparison();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
            this.context!.stop = this.tokenStream.LT(-1);
            this.state = 1164;
            this.errorHandler.sync(this);
            alternative = this.interpreter.adaptivePredict(this.tokenStream, 88, this.context);
            while (alternative !== 2 && alternative !== antlr.ATN.INVALID_ALT_NUMBER) {
                if (alternative === 1) {
                    if (this.parseListeners != null) {
                        this.triggerExitRuleEvent();
                    }
                    previousContext = localContext;
                    {
                    this.state = 1162;
                    this.errorHandler.sync(this);
                    switch (this.interpreter.adaptivePredict(this.tokenStream, 87, this.context) ) {
                    case 1:
                        {
                        localContext = new DataConditionContext(parentContext, parentState);
                        this.pushNewRecursionContext(localContext, _startState, VeroParser.RULE_dataCondition);
                        this.state = 1156;
                        if (!(this.precpred(this.context, 5))) {
                            throw this.createFailedPredicateException("this.precpred(this.context, 5)");
                        }
                        this.state = 1157;
                        this.match(VeroParser.AND);
                        this.state = 1158;
                        this.dataCondition(6);
                        }
                        break;
                    case 2:
                        {
                        localContext = new DataConditionContext(parentContext, parentState);
                        this.pushNewRecursionContext(localContext, _startState, VeroParser.RULE_dataCondition);
                        this.state = 1159;
                        if (!(this.precpred(this.context, 4))) {
                            throw this.createFailedPredicateException("this.precpred(this.context, 4)");
                        }
                        this.state = 1160;
                        this.match(VeroParser.OR);
                        this.state = 1161;
                        this.dataCondition(5);
                        }
                        break;
                    }
                    }
                }
                this.state = 1166;
                this.errorHandler.sync(this);
                alternative = this.interpreter.adaptivePredict(this.tokenStream, 88, this.context);
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
        this.enterRule(localContext, 234, VeroParser.RULE_dataComparison);
        try {
            this.state = 1199;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 89, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 1167;
                this.match(VeroParser.IDENTIFIER);
                this.state = 1168;
                this.comparisonOperator();
                this.state = 1169;
                this.expression();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 1171;
                this.match(VeroParser.IDENTIFIER);
                this.state = 1172;
                this.textOperator();
                this.state = 1173;
                this.expression();
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 1175;
                this.match(VeroParser.IDENTIFIER);
                this.state = 1176;
                this.match(VeroParser.IN);
                this.state = 1177;
                this.match(VeroParser.LBRACK);
                this.state = 1178;
                this.expressionList();
                this.state = 1179;
                this.match(VeroParser.RBRACK);
                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 1181;
                this.match(VeroParser.IDENTIFIER);
                this.state = 1182;
                this.match(VeroParser.NOT);
                this.state = 1183;
                this.match(VeroParser.IN);
                this.state = 1184;
                this.match(VeroParser.LBRACK);
                this.state = 1185;
                this.expressionList();
                this.state = 1186;
                this.match(VeroParser.RBRACK);
                }
                break;
            case 5:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 1188;
                this.match(VeroParser.IDENTIFIER);
                this.state = 1189;
                this.match(VeroParser.IS);
                this.state = 1190;
                this.match(VeroParser.EMPTY);
                }
                break;
            case 6:
                this.enterOuterAlt(localContext, 6);
                {
                this.state = 1191;
                this.match(VeroParser.IDENTIFIER);
                this.state = 1192;
                this.match(VeroParser.ISNOT);
                this.state = 1193;
                this.match(VeroParser.EMPTY);
                }
                break;
            case 7:
                this.enterOuterAlt(localContext, 7);
                {
                this.state = 1194;
                this.match(VeroParser.IDENTIFIER);
                this.state = 1195;
                this.match(VeroParser.IS);
                this.state = 1196;
                this.match(VeroParser.NULL_);
                }
                break;
            case 8:
                this.enterOuterAlt(localContext, 8);
                {
                this.state = 1197;
                this.match(VeroParser.IDENTIFIER);
                this.state = 1198;
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
        this.enterRule(localContext, 236, VeroParser.RULE_textOperator);
        try {
            this.state = 1207;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case VeroParser.CONTAINS:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 1201;
                this.match(VeroParser.CONTAINS);
                }
                break;
            case VeroParser.STARTS:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 1202;
                this.match(VeroParser.STARTS);
                this.state = 1203;
                this.match(VeroParser.WITH);
                }
                break;
            case VeroParser.ENDS:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 1204;
                this.match(VeroParser.ENDS);
                this.state = 1205;
                this.match(VeroParser.WITH);
                }
                break;
            case VeroParser.MATCHES:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 1206;
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
        this.enterRule(localContext, 238, VeroParser.RULE_dateComparison);
        try {
            this.state = 1227;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 91, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 1209;
                this.comparisonOperator();
                this.state = 1210;
                this.match(VeroParser.TODAY);
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 1212;
                this.comparisonOperator();
                this.state = 1213;
                this.match(VeroParser.DAYS);
                this.state = 1214;
                this.match(VeroParser.AGO);
                this.state = 1215;
                this.expression();
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 1217;
                this.comparisonOperator();
                this.state = 1218;
                this.match(VeroParser.MONTHS);
                this.state = 1219;
                this.match(VeroParser.AGO);
                this.state = 1220;
                this.expression();
                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 1222;
                this.comparisonOperator();
                this.state = 1223;
                this.match(VeroParser.YEARS);
                this.state = 1224;
                this.match(VeroParser.AGO);
                this.state = 1225;
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
        this.enterRule(localContext, 240, VeroParser.RULE_expressionList);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 1229;
            this.expression();
            this.state = 1234;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 164) {
                {
                {
                this.state = 1230;
                this.match(VeroParser.COMMA);
                this.state = 1231;
                this.expression();
                }
                }
                this.state = 1236;
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
        this.enterRule(localContext, 242, VeroParser.RULE_orderByClause);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 1237;
            this.match(VeroParser.ORDER);
            this.state = 1238;
            this.match(VeroParser.BY);
            this.state = 1239;
            this.orderColumn();
            this.state = 1244;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 164) {
                {
                {
                this.state = 1240;
                this.match(VeroParser.COMMA);
                this.state = 1241;
                this.orderColumn();
                }
                }
                this.state = 1246;
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
        this.enterRule(localContext, 244, VeroParser.RULE_orderColumn);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 1247;
            this.match(VeroParser.IDENTIFIER);
            this.state = 1249;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 83 || _la === 84) {
                {
                this.state = 1248;
                _la = this.tokenStream.LA(1);
                if(!(_la === 83 || _la === 84)) {
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
        this.enterRule(localContext, 246, VeroParser.RULE_limitClause);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 1251;
            this.match(VeroParser.LIMIT);
            this.state = 1252;
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
        this.enterRule(localContext, 248, VeroParser.RULE_offsetClause);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 1254;
            this.match(VeroParser.OFFSET);
            this.state = 1255;
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
        this.enterRule(localContext, 250, VeroParser.RULE_defaultClause);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 1257;
            this.match(VeroParser.DEFAULT);
            this.state = 1258;
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
        this.enterRule(localContext, 252, VeroParser.RULE_expression);
        try {
            this.state = 1268;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 95, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 1260;
                this.match(VeroParser.STRING_LITERAL);
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 1261;
                this.match(VeroParser.NUMBER_LITERAL);
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 1262;
                this.match(VeroParser.IDENTIFIER);
                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 1263;
                this.pageMethodReference();
                }
                break;
            case 5:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 1264;
                this.match(VeroParser.LPAREN);
                this.state = 1265;
                this.expression();
                this.state = 1266;
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
        this.enterRule(localContext, 254, VeroParser.RULE_selectorExpression);
        try {
            this.state = 1273;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 96, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 1270;
                this.pageFieldReference();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 1271;
                this.match(VeroParser.STRING_LITERAL);
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 1272;
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
        this.enterRule(localContext, 256, VeroParser.RULE_pageMethodReference);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 1275;
            this.match(VeroParser.IDENTIFIER);
            this.state = 1276;
            this.match(VeroParser.DOT);
            this.state = 1277;
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
        this.enterRule(localContext, 258, VeroParser.RULE_pageFieldReference);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 1279;
            this.match(VeroParser.IDENTIFIER);
            this.state = 1280;
            this.match(VeroParser.DOT);
            this.state = 1281;
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
        this.enterRule(localContext, 260, VeroParser.RULE_argumentList);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 1283;
            this.expression();
            this.state = 1288;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 164) {
                {
                {
                this.state = 1284;
                this.match(VeroParser.COMMA);
                this.state = 1285;
                this.expression();
                }
                }
                this.state = 1290;
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
        case 40:
            return this.utilityExpression_sempred(localContext as UtilityExpressionContext, predIndex);
        case 116:
            return this.dataCondition_sempred(localContext as DataConditionContext, predIndex);
        }
        return true;
    }
    private utilityExpression_sempred(localContext: UtilityExpressionContext | null, predIndex: number): boolean {
        switch (predIndex) {
        case 0:
            return this.precpred(this.context, 20);
        }
        return true;
    }
    private dataCondition_sempred(localContext: DataConditionContext | null, predIndex: number): boolean {
        switch (predIndex) {
        case 1:
            return this.precpred(this.context, 5);
        case 2:
            return this.precpred(this.context, 4);
        }
        return true;
    }

    public static readonly _serializedATN: number[] = [
        4,1,179,1292,2,0,7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,
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
        85,7,85,2,86,7,86,2,87,7,87,2,88,7,88,2,89,7,89,2,90,7,90,2,91,7,
        91,2,92,7,92,2,93,7,93,2,94,7,94,2,95,7,95,2,96,7,96,2,97,7,97,2,
        98,7,98,2,99,7,99,2,100,7,100,2,101,7,101,2,102,7,102,2,103,7,103,
        2,104,7,104,2,105,7,105,2,106,7,106,2,107,7,107,2,108,7,108,2,109,
        7,109,2,110,7,110,2,111,7,111,2,112,7,112,2,113,7,113,2,114,7,114,
        2,115,7,115,2,116,7,116,2,117,7,117,2,118,7,118,2,119,7,119,2,120,
        7,120,2,121,7,121,2,122,7,122,2,123,7,123,2,124,7,124,2,125,7,125,
        2,126,7,126,2,127,7,127,2,128,7,128,2,129,7,129,2,130,7,130,1,0,
        5,0,264,8,0,10,0,12,0,267,9,0,1,0,1,0,1,1,1,1,1,1,1,1,3,1,275,8,
        1,1,2,1,2,1,2,3,2,280,8,2,1,2,1,2,1,2,1,2,1,3,1,3,1,3,1,3,5,3,290,
        8,3,10,3,12,3,293,9,3,1,3,1,3,1,4,5,4,298,8,4,10,4,12,4,301,9,4,
        1,5,1,5,3,5,305,8,5,1,6,1,6,1,6,1,6,1,6,1,6,1,6,3,6,314,8,6,1,6,
        1,6,1,6,1,6,3,6,320,8,6,1,7,1,7,1,8,1,8,1,8,3,8,327,8,8,1,8,1,8,
        3,8,331,8,8,1,8,1,8,5,8,335,8,8,10,8,12,8,338,9,8,1,8,1,8,1,9,1,
        9,1,9,5,9,345,8,9,10,9,12,9,348,9,9,1,10,1,10,1,11,1,11,1,11,1,11,
        1,11,1,11,1,11,1,11,1,12,5,12,361,8,12,10,12,12,12,364,9,12,1,13,
        1,13,1,14,1,14,1,14,3,14,371,8,14,1,14,1,14,3,14,375,8,14,1,14,1,
        14,5,14,379,8,14,10,14,12,14,382,9,14,1,14,1,14,1,15,5,15,387,8,
        15,10,15,12,15,390,9,15,1,15,1,15,1,15,1,15,1,15,1,15,1,16,1,16,
        1,17,5,17,401,8,17,10,17,12,17,404,9,17,1,18,1,18,1,18,1,18,3,18,
        410,8,18,1,19,1,19,1,19,1,20,1,20,1,20,1,20,5,20,419,8,20,10,20,
        12,20,422,9,20,1,20,1,20,1,21,5,21,427,8,21,10,21,12,21,430,9,21,
        1,21,1,21,1,21,5,21,435,8,21,10,21,12,21,438,9,21,1,21,1,21,5,21,
        442,8,21,10,21,12,21,445,9,21,1,21,1,21,1,22,1,22,1,23,1,23,1,23,
        1,24,1,24,1,24,3,24,457,8,24,1,24,1,24,1,24,1,24,1,25,1,25,1,25,
        1,26,5,26,467,8,26,10,26,12,26,470,9,26,1,27,1,27,1,27,1,27,1,27,
        1,27,3,27,478,8,27,1,28,1,28,1,28,1,29,1,29,1,29,1,29,1,30,1,30,
        1,31,1,31,1,31,1,31,1,31,1,32,1,32,1,32,5,32,497,8,32,10,32,12,32,
        500,9,32,1,32,1,32,1,33,1,33,1,33,5,33,507,8,33,10,33,12,33,510,
        9,33,1,33,1,33,1,34,1,34,1,34,1,34,3,34,518,8,34,1,35,1,35,1,35,
        1,35,5,35,524,8,35,10,35,12,35,527,9,35,1,35,1,35,1,36,1,36,1,36,
        1,36,1,37,1,37,1,37,1,37,1,37,1,37,1,37,3,37,542,8,37,1,38,1,38,
        1,39,1,39,1,39,1,39,1,39,1,40,1,40,1,40,1,40,1,40,1,40,1,40,1,40,
        1,40,1,40,1,40,1,40,1,40,1,40,1,40,1,40,1,40,1,40,1,40,1,40,3,40,
        571,8,40,1,40,1,40,1,40,5,40,576,8,40,10,40,12,40,579,9,40,1,41,
        1,41,1,41,1,42,1,42,1,42,1,42,1,42,1,43,1,43,1,43,1,43,1,43,1,43,
        1,43,1,44,1,44,1,44,1,44,1,44,1,44,1,45,1,45,1,45,1,45,1,45,1,46,
        1,46,1,46,1,46,1,46,1,47,1,47,1,47,1,47,1,48,1,48,1,48,1,48,1,48,
        1,48,1,48,1,49,1,49,1,50,1,50,1,51,1,51,1,51,1,51,1,51,1,51,1,52,
        1,52,1,52,1,52,1,52,1,52,1,53,1,53,1,54,1,54,1,54,1,54,1,54,1,54,
        3,54,647,8,54,1,54,3,54,650,8,54,1,55,1,55,1,55,1,55,1,56,1,56,1,
        56,1,56,1,56,1,56,1,56,1,56,3,56,664,8,56,1,57,1,57,1,57,1,58,1,
        58,1,58,1,59,1,59,1,59,1,59,1,59,1,59,1,59,1,60,1,60,1,60,1,60,1,
        60,1,60,1,60,1,60,1,60,1,60,1,60,1,60,1,60,1,60,1,60,1,60,1,60,1,
        60,1,60,1,60,3,60,699,8,60,1,61,1,61,1,61,1,62,1,62,1,62,1,62,1,
        62,1,63,1,63,1,63,1,63,1,63,1,63,1,63,1,63,3,63,717,8,63,1,64,1,
        64,1,64,1,65,1,65,1,65,1,66,1,66,1,66,1,66,1,66,1,67,1,67,1,67,1,
        68,1,68,1,68,1,69,1,69,1,69,1,69,3,69,740,8,69,1,70,1,70,1,71,1,
        71,1,71,1,71,1,71,1,71,3,71,750,8,71,1,72,1,72,1,72,1,72,3,72,756,
        8,72,1,73,1,73,1,74,1,74,1,74,1,75,1,75,1,75,3,75,766,8,75,1,76,
        1,76,1,76,1,77,1,77,1,77,1,77,1,77,1,78,1,78,1,78,5,78,779,8,78,
        10,78,12,78,782,9,78,1,79,1,79,1,79,1,79,1,79,3,79,789,8,79,1,80,
        1,80,1,80,1,80,1,80,1,81,1,81,1,81,1,81,1,81,1,81,1,82,1,82,1,82,
        1,83,1,83,1,83,1,83,1,83,1,83,1,83,1,83,1,83,1,83,1,83,1,83,1,83,
        1,83,1,83,1,83,3,83,821,8,83,1,84,1,84,3,84,825,8,84,1,85,1,85,1,
        85,1,85,1,85,1,85,1,85,3,85,834,8,85,1,86,1,86,1,86,1,87,1,87,1,
        87,1,87,1,87,1,87,3,87,845,8,87,1,88,1,88,1,88,1,88,3,88,851,8,88,
        1,89,1,89,1,89,1,89,1,89,1,89,1,89,1,89,1,89,3,89,862,8,89,1,90,
        1,90,3,90,866,8,90,1,91,1,91,1,91,1,91,5,91,872,8,91,10,91,12,91,
        875,9,91,1,91,1,91,1,91,1,91,5,91,881,8,91,10,91,12,91,884,9,91,
        1,91,3,91,887,8,91,1,92,1,92,1,92,1,92,1,92,5,92,894,8,92,10,92,
        12,92,897,9,92,1,92,1,92,1,93,1,93,1,93,1,93,1,93,1,93,1,93,1,93,
        1,93,1,93,1,93,1,93,1,93,3,93,914,8,93,1,94,1,94,1,95,1,95,1,95,
        1,95,1,95,1,96,1,96,1,97,1,97,3,97,927,8,97,1,98,1,98,1,98,1,98,
        1,98,3,98,934,8,98,1,99,1,99,1,99,1,99,3,99,940,8,99,1,99,1,99,3,
        99,944,8,99,1,99,3,99,947,8,99,1,100,1,100,1,101,1,101,1,101,1,101,
        1,101,3,101,956,8,101,1,101,3,101,959,8,101,1,101,3,101,962,8,101,
        1,101,3,101,965,8,101,1,102,1,102,1,102,3,102,970,8,102,1,102,1,
        102,1,102,1,102,3,102,976,8,102,1,103,1,103,1,103,1,103,1,103,1,
        103,3,103,984,8,103,1,104,1,104,1,104,1,104,3,104,990,8,104,1,105,
        1,105,1,105,1,105,1,105,1,106,1,106,1,107,1,107,3,107,1001,8,107,
        1,108,1,108,1,108,3,108,1006,8,108,1,108,1,108,1,108,1,108,3,108,
        1012,8,108,1,108,1,108,1,108,3,108,1017,8,108,1,108,1,108,1,108,
        3,108,1022,8,108,1,108,1,108,1,108,3,108,1027,8,108,1,108,1,108,
        1,108,3,108,1032,8,108,1,108,1,108,1,108,3,108,1037,8,108,1,108,
        1,108,1,108,1,108,1,108,1,108,1,108,1,108,1,108,3,108,1048,8,108,
        1,109,3,109,1051,8,109,1,109,1,109,5,109,1055,8,109,10,109,12,109,
        1058,9,109,1,109,3,109,1061,8,109,1,109,1,109,1,109,5,109,1066,8,
        109,10,109,12,109,1069,9,109,3,109,1071,8,109,1,110,1,110,1,110,
        1,110,1,110,1,110,1,110,1,110,1,110,1,110,1,110,1,110,1,110,1,110,
        1,110,1,110,1,110,1,110,1,110,1,110,1,110,1,110,1,110,1,110,1,110,
        1,110,1,110,1,110,1,110,1,110,1,110,1,110,1,110,1,110,1,110,1,110,
        1,110,1,110,1,110,1,110,1,110,1,110,1,110,3,110,1116,8,110,1,111,
        1,111,1,111,1,111,1,111,1,112,1,112,1,112,5,112,1126,8,112,10,112,
        12,112,1129,9,112,1,113,1,113,1,113,1,113,1,113,1,113,1,114,1,114,
        1,114,1,114,1,114,3,114,1142,8,114,1,115,1,115,1,115,1,116,1,116,
        1,116,1,116,1,116,1,116,1,116,1,116,3,116,1155,8,116,1,116,1,116,
        1,116,1,116,1,116,1,116,5,116,1163,8,116,10,116,12,116,1166,9,116,
        1,117,1,117,1,117,1,117,1,117,1,117,1,117,1,117,1,117,1,117,1,117,
        1,117,1,117,1,117,1,117,1,117,1,117,1,117,1,117,1,117,1,117,1,117,
        1,117,1,117,1,117,1,117,1,117,1,117,1,117,1,117,1,117,1,117,3,117,
        1200,8,117,1,118,1,118,1,118,1,118,1,118,1,118,3,118,1208,8,118,
        1,119,1,119,1,119,1,119,1,119,1,119,1,119,1,119,1,119,1,119,1,119,
        1,119,1,119,1,119,1,119,1,119,1,119,1,119,3,119,1228,8,119,1,120,
        1,120,1,120,5,120,1233,8,120,10,120,12,120,1236,9,120,1,121,1,121,
        1,121,1,121,1,121,5,121,1243,8,121,10,121,12,121,1246,9,121,1,122,
        1,122,3,122,1250,8,122,1,123,1,123,1,123,1,124,1,124,1,124,1,125,
        1,125,1,125,1,126,1,126,1,126,1,126,1,126,1,126,1,126,1,126,3,126,
        1269,8,126,1,127,1,127,1,127,3,127,1274,8,127,1,128,1,128,1,128,
        1,128,1,129,1,129,1,129,1,129,1,130,1,130,1,130,5,130,1287,8,130,
        10,130,12,130,1290,9,130,1,130,0,2,80,232,131,0,2,4,6,8,10,12,14,
        16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52,54,56,58,
        60,62,64,66,68,70,72,74,76,78,80,82,84,86,88,90,92,94,96,98,100,
        102,104,106,108,110,112,114,116,118,120,122,124,126,128,130,132,
        134,136,138,140,142,144,146,148,150,152,154,156,158,160,162,164,
        166,168,170,172,174,176,178,180,182,184,186,188,190,192,194,196,
        198,200,202,204,206,208,210,212,214,216,218,220,222,224,226,228,
        230,232,234,236,238,240,242,244,246,248,250,252,254,256,258,260,
        0,18,3,0,69,69,74,74,143,152,1,0,74,77,2,0,1,2,5,5,1,0,12,13,1,0,
        14,15,1,0,1,4,1,0,24,25,2,0,74,75,118,119,2,0,110,112,130,132,1,
        0,130,132,2,0,140,140,175,175,1,0,154,157,1,0,114,115,1,0,58,59,
        1,0,169,174,1,0,74,78,1,0,87,89,1,0,83,84,1353,0,265,1,0,0,0,2,274,
        1,0,0,0,4,276,1,0,0,0,6,285,1,0,0,0,8,299,1,0,0,0,10,304,1,0,0,0,
        12,319,1,0,0,0,14,321,1,0,0,0,16,323,1,0,0,0,18,341,1,0,0,0,20,349,
        1,0,0,0,22,351,1,0,0,0,24,362,1,0,0,0,26,365,1,0,0,0,28,367,1,0,
        0,0,30,388,1,0,0,0,32,397,1,0,0,0,34,402,1,0,0,0,36,409,1,0,0,0,
        38,411,1,0,0,0,40,414,1,0,0,0,42,428,1,0,0,0,44,448,1,0,0,0,46,450,
        1,0,0,0,48,453,1,0,0,0,50,462,1,0,0,0,52,468,1,0,0,0,54,477,1,0,
        0,0,56,479,1,0,0,0,58,482,1,0,0,0,60,486,1,0,0,0,62,488,1,0,0,0,
        64,493,1,0,0,0,66,503,1,0,0,0,68,513,1,0,0,0,70,519,1,0,0,0,72,530,
        1,0,0,0,74,541,1,0,0,0,76,543,1,0,0,0,78,545,1,0,0,0,80,570,1,0,
        0,0,82,580,1,0,0,0,84,583,1,0,0,0,86,588,1,0,0,0,88,595,1,0,0,0,
        90,601,1,0,0,0,92,606,1,0,0,0,94,611,1,0,0,0,96,615,1,0,0,0,98,622,
        1,0,0,0,100,624,1,0,0,0,102,626,1,0,0,0,104,632,1,0,0,0,106,638,
        1,0,0,0,108,640,1,0,0,0,110,651,1,0,0,0,112,655,1,0,0,0,114,665,
        1,0,0,0,116,668,1,0,0,0,118,671,1,0,0,0,120,698,1,0,0,0,122,700,
        1,0,0,0,124,703,1,0,0,0,126,716,1,0,0,0,128,718,1,0,0,0,130,721,
        1,0,0,0,132,724,1,0,0,0,134,729,1,0,0,0,136,732,1,0,0,0,138,735,
        1,0,0,0,140,741,1,0,0,0,142,743,1,0,0,0,144,751,1,0,0,0,146,757,
        1,0,0,0,148,759,1,0,0,0,150,762,1,0,0,0,152,767,1,0,0,0,154,770,
        1,0,0,0,156,775,1,0,0,0,158,783,1,0,0,0,160,790,1,0,0,0,162,795,
        1,0,0,0,164,801,1,0,0,0,166,820,1,0,0,0,168,824,1,0,0,0,170,833,
        1,0,0,0,172,835,1,0,0,0,174,844,1,0,0,0,176,850,1,0,0,0,178,861,
        1,0,0,0,180,865,1,0,0,0,182,867,1,0,0,0,184,888,1,0,0,0,186,913,
        1,0,0,0,188,915,1,0,0,0,190,917,1,0,0,0,192,922,1,0,0,0,194,924,
        1,0,0,0,196,933,1,0,0,0,198,935,1,0,0,0,200,948,1,0,0,0,202,950,
        1,0,0,0,204,966,1,0,0,0,206,977,1,0,0,0,208,989,1,0,0,0,210,991,
        1,0,0,0,212,996,1,0,0,0,214,1000,1,0,0,0,216,1047,1,0,0,0,218,1070,
        1,0,0,0,220,1115,1,0,0,0,222,1117,1,0,0,0,224,1122,1,0,0,0,226,1130,
        1,0,0,0,228,1141,1,0,0,0,230,1143,1,0,0,0,232,1154,1,0,0,0,234,1199,
        1,0,0,0,236,1207,1,0,0,0,238,1227,1,0,0,0,240,1229,1,0,0,0,242,1237,
        1,0,0,0,244,1247,1,0,0,0,246,1251,1,0,0,0,248,1254,1,0,0,0,250,1257,
        1,0,0,0,252,1268,1,0,0,0,254,1273,1,0,0,0,256,1275,1,0,0,0,258,1279,
        1,0,0,0,260,1283,1,0,0,0,262,264,3,2,1,0,263,262,1,0,0,0,264,267,
        1,0,0,0,265,263,1,0,0,0,265,266,1,0,0,0,266,268,1,0,0,0,267,265,
        1,0,0,0,268,269,5,0,0,1,269,1,1,0,0,0,270,275,3,4,2,0,271,275,3,
        22,11,0,272,275,3,30,15,0,273,275,3,48,24,0,274,270,1,0,0,0,274,
        271,1,0,0,0,274,272,1,0,0,0,274,273,1,0,0,0,275,3,1,0,0,0,276,277,
        5,6,0,0,277,279,5,177,0,0,278,280,3,6,3,0,279,278,1,0,0,0,279,280,
        1,0,0,0,280,281,1,0,0,0,281,282,5,158,0,0,282,283,3,8,4,0,283,284,
        5,159,0,0,284,5,1,0,0,0,285,286,5,160,0,0,286,291,5,175,0,0,287,
        288,5,164,0,0,288,290,5,175,0,0,289,287,1,0,0,0,290,293,1,0,0,0,
        291,289,1,0,0,0,291,292,1,0,0,0,292,294,1,0,0,0,293,291,1,0,0,0,
        294,295,5,161,0,0,295,7,1,0,0,0,296,298,3,10,5,0,297,296,1,0,0,0,
        298,301,1,0,0,0,299,297,1,0,0,0,299,300,1,0,0,0,300,9,1,0,0,0,301,
        299,1,0,0,0,302,305,3,12,6,0,303,305,3,16,8,0,304,302,1,0,0,0,304,
        303,1,0,0,0,305,11,1,0,0,0,306,307,5,10,0,0,307,308,5,177,0,0,308,
        309,5,167,0,0,309,310,3,14,7,0,310,313,5,175,0,0,311,312,5,153,0,
        0,312,314,5,175,0,0,313,311,1,0,0,0,313,314,1,0,0,0,314,320,1,0,
        0,0,315,316,5,10,0,0,316,317,5,177,0,0,317,318,5,167,0,0,318,320,
        5,175,0,0,319,306,1,0,0,0,319,315,1,0,0,0,320,13,1,0,0,0,321,322,
        7,0,0,0,322,15,1,0,0,0,323,326,5,177,0,0,324,325,5,16,0,0,325,327,
        3,18,9,0,326,324,1,0,0,0,326,327,1,0,0,0,327,330,1,0,0,0,328,329,
        5,20,0,0,329,331,3,20,10,0,330,328,1,0,0,0,330,331,1,0,0,0,331,332,
        1,0,0,0,332,336,5,158,0,0,333,335,3,74,37,0,334,333,1,0,0,0,335,
        338,1,0,0,0,336,334,1,0,0,0,336,337,1,0,0,0,337,339,1,0,0,0,338,
        336,1,0,0,0,339,340,5,159,0,0,340,17,1,0,0,0,341,346,5,177,0,0,342,
        343,5,164,0,0,343,345,5,177,0,0,344,342,1,0,0,0,345,348,1,0,0,0,
        346,344,1,0,0,0,346,347,1,0,0,0,347,19,1,0,0,0,348,346,1,0,0,0,349,
        350,7,1,0,0,350,21,1,0,0,0,351,352,5,7,0,0,352,353,5,177,0,0,353,
        354,5,56,0,0,354,355,5,177,0,0,355,356,5,158,0,0,356,357,3,24,12,
        0,357,358,5,159,0,0,358,23,1,0,0,0,359,361,3,26,13,0,360,359,1,0,
        0,0,361,364,1,0,0,0,362,360,1,0,0,0,362,363,1,0,0,0,363,25,1,0,0,
        0,364,362,1,0,0,0,365,366,3,28,14,0,366,27,1,0,0,0,367,370,5,177,
        0,0,368,369,5,16,0,0,369,371,3,18,9,0,370,368,1,0,0,0,370,371,1,
        0,0,0,371,374,1,0,0,0,372,373,5,20,0,0,373,375,3,20,10,0,374,372,
        1,0,0,0,374,375,1,0,0,0,375,376,1,0,0,0,376,380,5,158,0,0,377,379,
        3,74,37,0,378,377,1,0,0,0,379,382,1,0,0,0,380,378,1,0,0,0,380,381,
        1,0,0,0,381,383,1,0,0,0,382,380,1,0,0,0,383,384,5,159,0,0,384,29,
        1,0,0,0,385,387,3,32,16,0,386,385,1,0,0,0,387,390,1,0,0,0,388,386,
        1,0,0,0,388,389,1,0,0,0,389,391,1,0,0,0,390,388,1,0,0,0,391,392,
        5,8,0,0,392,393,5,177,0,0,393,394,5,158,0,0,394,395,3,34,17,0,395,
        396,5,159,0,0,396,31,1,0,0,0,397,398,7,2,0,0,398,33,1,0,0,0,399,
        401,3,36,18,0,400,399,1,0,0,0,401,404,1,0,0,0,402,400,1,0,0,0,402,
        403,1,0,0,0,403,35,1,0,0,0,404,402,1,0,0,0,405,410,3,38,19,0,406,
        410,3,68,34,0,407,410,3,40,20,0,408,410,3,42,21,0,409,405,1,0,0,
        0,409,406,1,0,0,0,409,407,1,0,0,0,409,408,1,0,0,0,410,37,1,0,0,0,
        411,412,5,11,0,0,412,413,5,177,0,0,413,39,1,0,0,0,414,415,7,3,0,
        0,415,416,7,4,0,0,416,420,5,158,0,0,417,419,3,74,37,0,418,417,1,
        0,0,0,419,422,1,0,0,0,420,418,1,0,0,0,420,421,1,0,0,0,421,423,1,
        0,0,0,422,420,1,0,0,0,423,424,5,159,0,0,424,41,1,0,0,0,425,427,3,
        44,22,0,426,425,1,0,0,0,427,430,1,0,0,0,428,426,1,0,0,0,428,429,
        1,0,0,0,429,431,1,0,0,0,430,428,1,0,0,0,431,432,5,9,0,0,432,436,
        5,177,0,0,433,435,3,46,23,0,434,433,1,0,0,0,435,438,1,0,0,0,436,
        434,1,0,0,0,436,437,1,0,0,0,437,439,1,0,0,0,438,436,1,0,0,0,439,
        443,5,158,0,0,440,442,3,74,37,0,441,440,1,0,0,0,442,445,1,0,0,0,
        443,441,1,0,0,0,443,444,1,0,0,0,444,446,1,0,0,0,445,443,1,0,0,0,
        446,447,5,159,0,0,447,43,1,0,0,0,448,449,7,5,0,0,449,45,1,0,0,0,
        450,451,5,168,0,0,451,452,5,177,0,0,452,47,1,0,0,0,453,454,5,22,
        0,0,454,456,5,177,0,0,455,457,3,50,25,0,456,455,1,0,0,0,456,457,
        1,0,0,0,457,458,1,0,0,0,458,459,5,158,0,0,459,460,3,52,26,0,460,
        461,5,159,0,0,461,49,1,0,0,0,462,463,5,16,0,0,463,464,3,18,9,0,464,
        51,1,0,0,0,465,467,3,54,27,0,466,465,1,0,0,0,467,470,1,0,0,0,468,
        466,1,0,0,0,468,469,1,0,0,0,469,53,1,0,0,0,470,468,1,0,0,0,471,478,
        3,56,28,0,472,478,3,58,29,0,473,478,3,60,30,0,474,478,3,62,31,0,
        475,478,3,64,32,0,476,478,3,66,33,0,477,471,1,0,0,0,477,472,1,0,
        0,0,477,473,1,0,0,0,477,474,1,0,0,0,477,475,1,0,0,0,477,476,1,0,
        0,0,478,55,1,0,0,0,479,480,5,23,0,0,480,481,7,6,0,0,481,57,1,0,0,
        0,482,483,5,28,0,0,483,484,5,141,0,0,484,485,3,224,112,0,485,59,
        1,0,0,0,486,487,5,29,0,0,487,61,1,0,0,0,488,489,5,30,0,0,489,490,
        5,177,0,0,490,491,5,90,0,0,491,492,3,252,126,0,492,63,1,0,0,0,493,
        494,5,26,0,0,494,498,5,158,0,0,495,497,3,74,37,0,496,495,1,0,0,0,
        497,500,1,0,0,0,498,496,1,0,0,0,498,499,1,0,0,0,499,501,1,0,0,0,
        500,498,1,0,0,0,501,502,5,159,0,0,502,65,1,0,0,0,503,504,5,27,0,
        0,504,508,5,158,0,0,505,507,3,74,37,0,506,505,1,0,0,0,507,510,1,
        0,0,0,508,506,1,0,0,0,508,509,1,0,0,0,509,511,1,0,0,0,510,508,1,
        0,0,0,511,512,5,159,0,0,512,67,1,0,0,0,513,514,5,16,0,0,514,515,
        5,22,0,0,515,517,5,177,0,0,516,518,3,70,35,0,517,516,1,0,0,0,517,
        518,1,0,0,0,518,69,1,0,0,0,519,520,5,158,0,0,520,525,3,72,36,0,521,
        522,5,164,0,0,522,524,3,72,36,0,523,521,1,0,0,0,524,527,1,0,0,0,
        525,523,1,0,0,0,525,526,1,0,0,0,526,528,1,0,0,0,527,525,1,0,0,0,
        528,529,5,159,0,0,529,71,1,0,0,0,530,531,5,177,0,0,531,532,5,167,
        0,0,532,533,3,252,126,0,533,73,1,0,0,0,534,542,3,120,60,0,535,542,
        3,166,83,0,536,542,3,180,90,0,537,542,3,190,95,0,538,542,3,196,98,
        0,539,542,3,76,38,0,540,542,3,194,97,0,541,534,1,0,0,0,541,535,1,
        0,0,0,541,536,1,0,0,0,541,537,1,0,0,0,541,538,1,0,0,0,541,539,1,
        0,0,0,541,540,1,0,0,0,542,75,1,0,0,0,543,544,3,78,39,0,544,77,1,
        0,0,0,545,546,3,192,96,0,546,547,5,177,0,0,547,548,5,167,0,0,548,
        549,3,80,40,0,549,79,1,0,0,0,550,551,6,40,-1,0,551,571,3,82,41,0,
        552,571,3,84,42,0,553,571,3,86,43,0,554,571,3,88,44,0,555,571,3,
        90,45,0,556,571,3,92,46,0,557,571,3,94,47,0,558,571,3,96,48,0,559,
        571,3,102,51,0,560,571,3,104,52,0,561,571,3,108,54,0,562,571,3,110,
        55,0,563,571,3,112,56,0,564,571,3,114,57,0,565,571,3,116,58,0,566,
        571,3,118,59,0,567,571,3,98,49,0,568,571,3,100,50,0,569,571,3,252,
        126,0,570,550,1,0,0,0,570,552,1,0,0,0,570,553,1,0,0,0,570,554,1,
        0,0,0,570,555,1,0,0,0,570,556,1,0,0,0,570,557,1,0,0,0,570,558,1,
        0,0,0,570,559,1,0,0,0,570,560,1,0,0,0,570,561,1,0,0,0,570,562,1,
        0,0,0,570,563,1,0,0,0,570,564,1,0,0,0,570,565,1,0,0,0,570,566,1,
        0,0,0,570,567,1,0,0,0,570,568,1,0,0,0,570,569,1,0,0,0,571,577,1,
        0,0,0,572,573,10,20,0,0,573,574,5,126,0,0,574,576,3,80,40,21,575,
        572,1,0,0,0,576,579,1,0,0,0,577,575,1,0,0,0,577,578,1,0,0,0,578,
        81,1,0,0,0,579,577,1,0,0,0,580,581,5,116,0,0,581,582,3,252,126,0,
        582,83,1,0,0,0,583,584,5,117,0,0,584,585,3,252,126,0,585,586,5,18,
        0,0,586,587,7,7,0,0,587,85,1,0,0,0,588,589,5,120,0,0,589,590,3,252,
        126,0,590,591,5,17,0,0,591,592,3,252,126,0,592,593,5,18,0,0,593,
        594,3,252,126,0,594,87,1,0,0,0,595,596,5,121,0,0,596,597,3,252,126,
        0,597,598,5,175,0,0,598,599,5,16,0,0,599,600,5,175,0,0,600,89,1,
        0,0,0,601,602,5,122,0,0,602,603,3,252,126,0,603,604,5,82,0,0,604,
        605,5,175,0,0,605,91,1,0,0,0,606,607,5,123,0,0,607,608,3,252,126,
        0,608,609,5,16,0,0,609,610,5,175,0,0,610,93,1,0,0,0,611,612,5,124,
        0,0,612,613,5,103,0,0,613,614,3,252,126,0,614,95,1,0,0,0,615,616,
        5,125,0,0,616,617,3,252,126,0,617,618,5,18,0,0,618,619,3,252,126,
        0,619,620,5,16,0,0,620,621,5,175,0,0,621,97,1,0,0,0,622,623,5,109,
        0,0,623,99,1,0,0,0,624,625,5,127,0,0,625,101,1,0,0,0,626,627,5,128,
        0,0,627,628,3,252,126,0,628,629,3,106,53,0,629,630,5,18,0,0,630,
        631,3,252,126,0,631,103,1,0,0,0,632,633,5,129,0,0,633,634,3,252,
        126,0,634,635,3,106,53,0,635,636,5,17,0,0,636,637,3,252,126,0,637,
        105,1,0,0,0,638,639,7,8,0,0,639,107,1,0,0,0,640,641,5,133,0,0,641,
        642,3,252,126,0,642,649,5,142,0,0,643,650,5,175,0,0,644,646,5,137,
        0,0,645,647,5,175,0,0,646,645,1,0,0,0,646,647,1,0,0,0,647,650,1,
        0,0,0,648,650,5,138,0,0,649,643,1,0,0,0,649,644,1,0,0,0,649,648,
        1,0,0,0,650,109,1,0,0,0,651,652,7,9,0,0,652,653,5,103,0,0,653,654,
        3,252,126,0,654,111,1,0,0,0,655,656,5,134,0,0,656,663,3,252,126,
        0,657,658,5,18,0,0,658,659,3,252,126,0,659,660,5,135,0,0,660,664,
        1,0,0,0,661,664,5,154,0,0,662,664,5,155,0,0,663,657,1,0,0,0,663,
        661,1,0,0,0,663,662,1,0,0,0,663,664,1,0,0,0,664,113,1,0,0,0,665,
        666,5,136,0,0,666,667,3,252,126,0,667,115,1,0,0,0,668,669,5,139,
        0,0,669,670,7,10,0,0,670,117,1,0,0,0,671,672,5,89,0,0,672,673,5,
        75,0,0,673,674,5,17,0,0,674,675,3,252,126,0,675,676,5,18,0,0,676,
        677,3,252,126,0,677,119,1,0,0,0,678,699,3,122,61,0,679,699,3,124,
        62,0,680,699,3,126,63,0,681,699,3,128,64,0,682,699,3,130,65,0,683,
        699,3,132,66,0,684,699,3,134,67,0,685,699,3,136,68,0,686,699,3,138,
        69,0,687,699,3,142,71,0,688,699,3,144,72,0,689,699,3,146,73,0,690,
        699,3,148,74,0,691,699,3,150,75,0,692,699,3,152,76,0,693,699,3,154,
        77,0,694,699,3,158,79,0,695,699,3,160,80,0,696,699,3,162,81,0,697,
        699,3,164,82,0,698,678,1,0,0,0,698,679,1,0,0,0,698,680,1,0,0,0,698,
        681,1,0,0,0,698,682,1,0,0,0,698,683,1,0,0,0,698,684,1,0,0,0,698,
        685,1,0,0,0,698,686,1,0,0,0,698,687,1,0,0,0,698,688,1,0,0,0,698,
        689,1,0,0,0,698,690,1,0,0,0,698,691,1,0,0,0,698,692,1,0,0,0,698,
        693,1,0,0,0,698,694,1,0,0,0,698,695,1,0,0,0,698,696,1,0,0,0,698,
        697,1,0,0,0,699,121,1,0,0,0,700,701,5,35,0,0,701,702,3,254,127,0,
        702,123,1,0,0,0,703,704,5,36,0,0,704,705,3,254,127,0,705,706,5,16,
        0,0,706,707,3,252,126,0,707,125,1,0,0,0,708,709,5,37,0,0,709,717,
        3,252,126,0,710,711,5,37,0,0,711,712,3,252,126,0,712,713,5,19,0,
        0,713,714,5,53,0,0,714,715,5,54,0,0,715,717,1,0,0,0,716,708,1,0,
        0,0,716,710,1,0,0,0,717,127,1,0,0,0,718,719,5,38,0,0,719,720,3,254,
        127,0,720,129,1,0,0,0,721,722,5,39,0,0,722,723,3,254,127,0,723,131,
        1,0,0,0,724,725,5,40,0,0,725,726,3,252,126,0,726,727,5,17,0,0,727,
        728,3,254,127,0,728,133,1,0,0,0,729,730,5,41,0,0,730,731,3,254,127,
        0,731,135,1,0,0,0,732,733,5,42,0,0,733,734,3,252,126,0,734,137,1,
        0,0,0,735,739,5,43,0,0,736,737,5,18,0,0,737,740,3,254,127,0,738,
        740,3,140,70,0,739,736,1,0,0,0,739,738,1,0,0,0,740,139,1,0,0,0,741,
        742,7,11,0,0,742,141,1,0,0,0,743,749,5,44,0,0,744,745,3,252,126,
        0,745,746,7,12,0,0,746,750,1,0,0,0,747,748,5,56,0,0,748,750,3,254,
        127,0,749,744,1,0,0,0,749,747,1,0,0,0,750,143,1,0,0,0,751,752,5,
        45,0,0,752,755,3,256,128,0,753,754,5,16,0,0,754,756,3,260,130,0,
        755,753,1,0,0,0,755,756,1,0,0,0,756,145,1,0,0,0,757,758,5,46,0,0,
        758,147,1,0,0,0,759,760,5,47,0,0,760,761,3,254,127,0,761,149,1,0,
        0,0,762,763,5,48,0,0,763,765,5,49,0,0,764,766,3,252,126,0,765,764,
        1,0,0,0,765,766,1,0,0,0,766,151,1,0,0,0,767,768,5,50,0,0,768,769,
        3,252,126,0,769,153,1,0,0,0,770,771,5,51,0,0,771,772,3,156,78,0,
        772,773,5,18,0,0,773,774,3,254,127,0,774,155,1,0,0,0,775,780,3,252,
        126,0,776,777,5,164,0,0,777,779,3,252,126,0,778,776,1,0,0,0,779,
        782,1,0,0,0,780,778,1,0,0,0,780,781,1,0,0,0,781,157,1,0,0,0,782,
        780,1,0,0,0,783,784,5,52,0,0,784,785,5,18,0,0,785,786,5,53,0,0,786,
        788,5,54,0,0,787,789,3,252,126,0,788,787,1,0,0,0,788,789,1,0,0,0,
        789,159,1,0,0,0,790,791,5,52,0,0,791,792,5,18,0,0,792,793,5,54,0,
        0,793,794,3,252,126,0,794,161,1,0,0,0,795,796,5,37,0,0,796,797,3,
        252,126,0,797,798,5,19,0,0,798,799,5,53,0,0,799,800,5,54,0,0,800,
        163,1,0,0,0,801,802,5,55,0,0,802,803,5,54,0,0,803,165,1,0,0,0,804,
        805,5,57,0,0,805,806,3,168,84,0,806,807,7,13,0,0,807,808,3,170,85,
        0,808,821,1,0,0,0,809,810,5,57,0,0,810,811,5,68,0,0,811,821,3,174,
        87,0,812,813,5,57,0,0,813,814,5,69,0,0,814,821,3,176,88,0,815,816,
        5,57,0,0,816,817,3,254,127,0,817,818,5,71,0,0,818,819,3,178,89,0,
        819,821,1,0,0,0,820,804,1,0,0,0,820,809,1,0,0,0,820,812,1,0,0,0,
        820,815,1,0,0,0,821,167,1,0,0,0,822,825,3,254,127,0,823,825,3,252,
        126,0,824,822,1,0,0,0,824,823,1,0,0,0,825,169,1,0,0,0,826,834,5,
        60,0,0,827,834,5,61,0,0,828,834,5,62,0,0,829,834,5,63,0,0,830,834,
        5,64,0,0,831,834,5,65,0,0,832,834,3,172,86,0,833,826,1,0,0,0,833,
        827,1,0,0,0,833,828,1,0,0,0,833,829,1,0,0,0,833,830,1,0,0,0,833,
        831,1,0,0,0,833,832,1,0,0,0,834,171,1,0,0,0,835,836,5,66,0,0,836,
        837,3,252,126,0,837,173,1,0,0,0,838,839,5,66,0,0,839,845,3,252,126,
        0,840,841,5,70,0,0,841,845,3,252,126,0,842,843,5,107,0,0,843,845,
        3,252,126,0,844,838,1,0,0,0,844,840,1,0,0,0,844,842,1,0,0,0,845,
        175,1,0,0,0,846,847,5,66,0,0,847,851,3,252,126,0,848,849,5,70,0,
        0,849,851,3,252,126,0,850,846,1,0,0,0,850,848,1,0,0,0,851,177,1,
        0,0,0,852,853,5,93,0,0,853,862,3,252,126,0,854,855,5,72,0,0,855,
        862,3,252,126,0,856,857,5,73,0,0,857,858,3,252,126,0,858,859,5,70,
        0,0,859,860,3,252,126,0,860,862,1,0,0,0,861,852,1,0,0,0,861,854,
        1,0,0,0,861,856,1,0,0,0,862,179,1,0,0,0,863,866,3,182,91,0,864,866,
        3,184,92,0,865,863,1,0,0,0,865,864,1,0,0,0,866,181,1,0,0,0,867,868,
        5,31,0,0,868,869,3,186,93,0,869,873,5,158,0,0,870,872,3,74,37,0,
        871,870,1,0,0,0,872,875,1,0,0,0,873,871,1,0,0,0,873,874,1,0,0,0,
        874,876,1,0,0,0,875,873,1,0,0,0,876,886,5,159,0,0,877,878,5,32,0,
        0,878,882,5,158,0,0,879,881,3,74,37,0,880,879,1,0,0,0,881,884,1,
        0,0,0,882,880,1,0,0,0,882,883,1,0,0,0,883,885,1,0,0,0,884,882,1,
        0,0,0,885,887,5,159,0,0,886,877,1,0,0,0,886,887,1,0,0,0,887,183,
        1,0,0,0,888,889,5,33,0,0,889,890,3,252,126,0,890,891,5,34,0,0,891,
        895,5,158,0,0,892,894,3,74,37,0,893,892,1,0,0,0,894,897,1,0,0,0,
        895,893,1,0,0,0,895,896,1,0,0,0,896,898,1,0,0,0,897,895,1,0,0,0,
        898,899,5,159,0,0,899,185,1,0,0,0,900,901,3,254,127,0,901,902,5,
        58,0,0,902,903,3,170,85,0,903,914,1,0,0,0,904,905,3,254,127,0,905,
        906,5,59,0,0,906,907,3,170,85,0,907,914,1,0,0,0,908,909,3,252,126,
        0,909,910,3,188,94,0,910,911,3,252,126,0,911,914,1,0,0,0,912,914,
        3,252,126,0,913,900,1,0,0,0,913,904,1,0,0,0,913,908,1,0,0,0,913,
        912,1,0,0,0,914,187,1,0,0,0,915,916,7,14,0,0,916,189,1,0,0,0,917,
        918,3,192,96,0,918,919,5,177,0,0,919,920,5,167,0,0,920,921,3,252,
        126,0,921,191,1,0,0,0,922,923,7,15,0,0,923,193,1,0,0,0,924,926,5,
        21,0,0,925,927,3,252,126,0,926,925,1,0,0,0,926,927,1,0,0,0,927,195,
        1,0,0,0,928,934,3,198,99,0,929,934,3,202,101,0,930,934,3,204,102,
        0,931,934,3,206,103,0,932,934,3,210,105,0,933,928,1,0,0,0,933,929,
        1,0,0,0,933,930,1,0,0,0,933,931,1,0,0,0,933,932,1,0,0,0,934,197,
        1,0,0,0,935,936,5,100,0,0,936,937,5,177,0,0,937,939,5,167,0,0,938,
        940,3,200,100,0,939,938,1,0,0,0,939,940,1,0,0,0,940,941,1,0,0,0,
        941,943,3,208,104,0,942,944,3,230,115,0,943,942,1,0,0,0,943,944,
        1,0,0,0,944,946,1,0,0,0,945,947,3,242,121,0,946,945,1,0,0,0,946,
        947,1,0,0,0,947,199,1,0,0,0,948,949,7,16,0,0,949,201,1,0,0,0,950,
        951,5,99,0,0,951,952,5,177,0,0,952,953,5,167,0,0,953,955,3,208,104,
        0,954,956,3,230,115,0,955,954,1,0,0,0,955,956,1,0,0,0,956,958,1,
        0,0,0,957,959,3,242,121,0,958,957,1,0,0,0,958,959,1,0,0,0,959,961,
        1,0,0,0,960,962,3,246,123,0,961,960,1,0,0,0,961,962,1,0,0,0,962,
        964,1,0,0,0,963,965,3,248,124,0,964,963,1,0,0,0,964,965,1,0,0,0,
        965,203,1,0,0,0,966,967,5,177,0,0,967,969,5,167,0,0,968,970,5,98,
        0,0,969,968,1,0,0,0,969,970,1,0,0,0,970,971,1,0,0,0,971,972,3,208,
        104,0,972,973,5,166,0,0,973,975,5,177,0,0,974,976,3,230,115,0,975,
        974,1,0,0,0,975,976,1,0,0,0,976,205,1,0,0,0,977,978,5,75,0,0,978,
        979,5,177,0,0,979,980,5,167,0,0,980,981,5,93,0,0,981,983,3,208,104,
        0,982,984,3,230,115,0,983,982,1,0,0,0,983,984,1,0,0,0,984,207,1,
        0,0,0,985,990,5,177,0,0,986,987,5,177,0,0,987,988,5,166,0,0,988,
        990,5,177,0,0,989,985,1,0,0,0,989,986,1,0,0,0,990,209,1,0,0,0,991,
        992,3,212,106,0,992,993,5,177,0,0,993,994,5,167,0,0,994,995,3,214,
        107,0,995,211,1,0,0,0,996,997,7,15,0,0,997,213,1,0,0,0,998,1001,
        3,216,108,0,999,1001,3,218,109,0,1000,998,1,0,0,0,1000,999,1,0,0,
        0,1001,215,1,0,0,0,1002,1003,5,93,0,0,1003,1005,3,220,110,0,1004,
        1006,3,230,115,0,1005,1004,1,0,0,0,1005,1006,1,0,0,0,1006,1048,1,
        0,0,0,1007,1008,5,93,0,0,1008,1009,5,98,0,0,1009,1011,3,226,113,
        0,1010,1012,3,230,115,0,1011,1010,1,0,0,0,1011,1012,1,0,0,0,1012,
        1048,1,0,0,0,1013,1014,5,94,0,0,1014,1016,3,226,113,0,1015,1017,
        3,230,115,0,1016,1015,1,0,0,0,1016,1017,1,0,0,0,1017,1048,1,0,0,
        0,1018,1019,5,95,0,0,1019,1021,3,226,113,0,1020,1022,3,230,115,0,
        1021,1020,1,0,0,0,1021,1022,1,0,0,0,1022,1048,1,0,0,0,1023,1024,
        5,96,0,0,1024,1026,3,226,113,0,1025,1027,3,230,115,0,1026,1025,1,
        0,0,0,1026,1027,1,0,0,0,1027,1048,1,0,0,0,1028,1029,5,97,0,0,1029,
        1031,3,226,113,0,1030,1032,3,230,115,0,1031,1030,1,0,0,0,1031,1032,
        1,0,0,0,1032,1048,1,0,0,0,1033,1034,5,98,0,0,1034,1036,3,226,113,
        0,1035,1037,3,230,115,0,1036,1035,1,0,0,0,1036,1037,1,0,0,0,1037,
        1048,1,0,0,0,1038,1039,5,99,0,0,1039,1040,5,19,0,0,1040,1048,3,220,
        110,0,1041,1042,5,101,0,0,1042,1043,5,19,0,0,1043,1048,3,220,110,
        0,1044,1045,5,102,0,0,1045,1046,5,103,0,0,1046,1048,3,220,110,0,
        1047,1002,1,0,0,0,1047,1007,1,0,0,0,1047,1013,1,0,0,0,1047,1018,
        1,0,0,0,1047,1023,1,0,0,0,1047,1028,1,0,0,0,1047,1033,1,0,0,0,1047,
        1038,1,0,0,0,1047,1041,1,0,0,0,1047,1044,1,0,0,0,1048,217,1,0,0,
        0,1049,1051,7,16,0,0,1050,1049,1,0,0,0,1050,1051,1,0,0,0,1051,1052,
        1,0,0,0,1052,1056,3,220,110,0,1053,1055,3,228,114,0,1054,1053,1,
        0,0,0,1055,1058,1,0,0,0,1056,1054,1,0,0,0,1056,1057,1,0,0,0,1057,
        1071,1,0,0,0,1058,1056,1,0,0,0,1059,1061,7,16,0,0,1060,1059,1,0,
        0,0,1060,1061,1,0,0,0,1061,1062,1,0,0,0,1062,1063,3,220,110,0,1063,
        1067,3,222,111,0,1064,1066,3,228,114,0,1065,1064,1,0,0,0,1066,1069,
        1,0,0,0,1067,1065,1,0,0,0,1067,1068,1,0,0,0,1068,1071,1,0,0,0,1069,
        1067,1,0,0,0,1070,1050,1,0,0,0,1070,1060,1,0,0,0,1071,219,1,0,0,
        0,1072,1073,5,79,0,0,1073,1074,5,166,0,0,1074,1116,5,177,0,0,1075,
        1076,5,79,0,0,1076,1077,5,166,0,0,1077,1078,5,177,0,0,1078,1079,
        5,166,0,0,1079,1116,5,177,0,0,1080,1081,5,79,0,0,1081,1082,5,166,
        0,0,1082,1083,5,177,0,0,1083,1084,5,162,0,0,1084,1085,3,252,126,
        0,1085,1086,5,163,0,0,1086,1116,1,0,0,0,1087,1088,5,79,0,0,1088,
        1089,5,166,0,0,1089,1090,5,177,0,0,1090,1091,5,162,0,0,1091,1092,
        3,252,126,0,1092,1093,5,163,0,0,1093,1094,5,166,0,0,1094,1095,5,
        177,0,0,1095,1116,1,0,0,0,1096,1097,5,79,0,0,1097,1098,5,166,0,0,
        1098,1099,5,177,0,0,1099,1100,5,162,0,0,1100,1101,3,252,126,0,1101,
        1102,5,165,0,0,1102,1103,3,252,126,0,1103,1104,5,163,0,0,1104,1116,
        1,0,0,0,1105,1106,5,79,0,0,1106,1107,5,166,0,0,1107,1108,5,177,0,
        0,1108,1109,5,104,0,0,1109,1110,5,162,0,0,1110,1111,3,252,126,0,
        1111,1112,5,164,0,0,1112,1113,3,252,126,0,1113,1114,5,163,0,0,1114,
        1116,1,0,0,0,1115,1072,1,0,0,0,1115,1075,1,0,0,0,1115,1080,1,0,0,
        0,1115,1087,1,0,0,0,1115,1096,1,0,0,0,1115,1105,1,0,0,0,1116,221,
        1,0,0,0,1117,1118,5,166,0,0,1118,1119,5,160,0,0,1119,1120,3,224,
        112,0,1120,1121,5,161,0,0,1121,223,1,0,0,0,1122,1127,5,177,0,0,1123,
        1124,5,164,0,0,1124,1126,5,177,0,0,1125,1123,1,0,0,0,1126,1129,1,
        0,0,0,1127,1125,1,0,0,0,1127,1128,1,0,0,0,1128,225,1,0,0,0,1129,
        1127,1,0,0,0,1130,1131,5,79,0,0,1131,1132,5,166,0,0,1132,1133,5,
        177,0,0,1133,1134,5,166,0,0,1134,1135,5,177,0,0,1135,227,1,0,0,0,
        1136,1142,3,230,115,0,1137,1142,3,242,121,0,1138,1142,3,246,123,
        0,1139,1142,3,248,124,0,1140,1142,3,250,125,0,1141,1136,1,0,0,0,
        1141,1137,1,0,0,0,1141,1138,1,0,0,0,1141,1139,1,0,0,0,1141,1140,
        1,0,0,0,1142,229,1,0,0,0,1143,1144,5,80,0,0,1144,1145,3,232,116,
        0,1145,231,1,0,0,0,1146,1147,6,116,-1,0,1147,1148,5,67,0,0,1148,
        1155,3,232,116,3,1149,1150,5,160,0,0,1150,1151,3,232,116,0,1151,
        1152,5,161,0,0,1152,1155,1,0,0,0,1153,1155,3,234,117,0,1154,1146,
        1,0,0,0,1154,1149,1,0,0,0,1154,1153,1,0,0,0,1155,1164,1,0,0,0,1156,
        1157,10,5,0,0,1157,1158,5,91,0,0,1158,1163,3,232,116,6,1159,1160,
        10,4,0,0,1160,1161,5,92,0,0,1161,1163,3,232,116,5,1162,1156,1,0,
        0,0,1162,1159,1,0,0,0,1163,1166,1,0,0,0,1164,1162,1,0,0,0,1164,1165,
        1,0,0,0,1165,233,1,0,0,0,1166,1164,1,0,0,0,1167,1168,5,177,0,0,1168,
        1169,3,188,94,0,1169,1170,3,252,126,0,1170,1200,1,0,0,0,1171,1172,
        5,177,0,0,1172,1173,3,236,118,0,1173,1174,3,252,126,0,1174,1200,
        1,0,0,0,1175,1176,5,177,0,0,1176,1177,5,19,0,0,1177,1178,5,162,0,
        0,1178,1179,3,240,120,0,1179,1180,5,163,0,0,1180,1200,1,0,0,0,1181,
        1182,5,177,0,0,1182,1183,5,67,0,0,1183,1184,5,19,0,0,1184,1185,5,
        162,0,0,1185,1186,3,240,120,0,1186,1187,5,163,0,0,1187,1200,1,0,
        0,0,1188,1189,5,177,0,0,1189,1190,5,58,0,0,1190,1200,5,65,0,0,1191,
        1192,5,177,0,0,1192,1193,5,59,0,0,1193,1200,5,65,0,0,1194,1195,5,
        177,0,0,1195,1196,5,58,0,0,1196,1200,5,108,0,0,1197,1198,5,177,0,
        0,1198,1200,3,238,119,0,1199,1167,1,0,0,0,1199,1171,1,0,0,0,1199,
        1175,1,0,0,0,1199,1181,1,0,0,0,1199,1188,1,0,0,0,1199,1191,1,0,0,
        0,1199,1194,1,0,0,0,1199,1197,1,0,0,0,1200,235,1,0,0,0,1201,1208,
        5,66,0,0,1202,1203,5,105,0,0,1203,1208,5,16,0,0,1204,1205,5,106,
        0,0,1205,1208,5,16,0,0,1206,1208,5,107,0,0,1207,1201,1,0,0,0,1207,
        1202,1,0,0,0,1207,1204,1,0,0,0,1207,1206,1,0,0,0,1208,237,1,0,0,
        0,1209,1210,3,188,94,0,1210,1211,5,109,0,0,1211,1228,1,0,0,0,1212,
        1213,3,188,94,0,1213,1214,5,110,0,0,1214,1215,5,113,0,0,1215,1216,
        3,252,126,0,1216,1228,1,0,0,0,1217,1218,3,188,94,0,1218,1219,5,111,
        0,0,1219,1220,5,113,0,0,1220,1221,3,252,126,0,1221,1228,1,0,0,0,
        1222,1223,3,188,94,0,1223,1224,5,112,0,0,1224,1225,5,113,0,0,1225,
        1226,3,252,126,0,1226,1228,1,0,0,0,1227,1209,1,0,0,0,1227,1212,1,
        0,0,0,1227,1217,1,0,0,0,1227,1222,1,0,0,0,1228,239,1,0,0,0,1229,
        1234,3,252,126,0,1230,1231,5,164,0,0,1231,1233,3,252,126,0,1232,
        1230,1,0,0,0,1233,1236,1,0,0,0,1234,1232,1,0,0,0,1234,1235,1,0,0,
        0,1235,241,1,0,0,0,1236,1234,1,0,0,0,1237,1238,5,81,0,0,1238,1239,
        5,82,0,0,1239,1244,3,244,122,0,1240,1241,5,164,0,0,1241,1243,3,244,
        122,0,1242,1240,1,0,0,0,1243,1246,1,0,0,0,1244,1242,1,0,0,0,1244,
        1245,1,0,0,0,1245,243,1,0,0,0,1246,1244,1,0,0,0,1247,1249,5,177,
        0,0,1248,1250,7,17,0,0,1249,1248,1,0,0,0,1249,1250,1,0,0,0,1250,
        245,1,0,0,0,1251,1252,5,85,0,0,1252,1253,3,252,126,0,1253,247,1,
        0,0,0,1254,1255,5,86,0,0,1255,1256,3,252,126,0,1256,249,1,0,0,0,
        1257,1258,5,90,0,0,1258,1259,3,252,126,0,1259,251,1,0,0,0,1260,1269,
        5,175,0,0,1261,1269,5,176,0,0,1262,1269,5,177,0,0,1263,1269,3,256,
        128,0,1264,1265,5,160,0,0,1265,1266,3,252,126,0,1266,1267,5,161,
        0,0,1267,1269,1,0,0,0,1268,1260,1,0,0,0,1268,1261,1,0,0,0,1268,1262,
        1,0,0,0,1268,1263,1,0,0,0,1268,1264,1,0,0,0,1269,253,1,0,0,0,1270,
        1274,3,258,129,0,1271,1274,5,175,0,0,1272,1274,5,177,0,0,1273,1270,
        1,0,0,0,1273,1271,1,0,0,0,1273,1272,1,0,0,0,1274,255,1,0,0,0,1275,
        1276,5,177,0,0,1276,1277,5,166,0,0,1277,1278,5,177,0,0,1278,257,
        1,0,0,0,1279,1280,5,177,0,0,1280,1281,5,166,0,0,1281,1282,5,177,
        0,0,1282,259,1,0,0,0,1283,1288,3,252,126,0,1284,1285,5,164,0,0,1285,
        1287,3,252,126,0,1286,1284,1,0,0,0,1287,1290,1,0,0,0,1288,1286,1,
        0,0,0,1288,1289,1,0,0,0,1289,261,1,0,0,0,1290,1288,1,0,0,0,98,265,
        274,279,291,299,304,313,319,326,330,336,346,362,370,374,380,388,
        402,409,420,428,436,443,456,468,477,498,508,517,525,541,570,577,
        646,649,663,698,716,739,749,755,765,780,788,820,824,833,844,850,
        861,865,873,882,886,895,913,926,933,939,943,946,955,958,961,964,
        969,975,983,989,1000,1005,1011,1016,1021,1026,1031,1036,1047,1050,
        1056,1060,1067,1070,1115,1127,1141,1154,1162,1164,1199,1207,1227,
        1234,1244,1249,1268,1273,1288
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
    public pageActionsDeclaration(): PageActionsDeclarationContext | null {
        return this.getRuleContext(0, PageActionsDeclarationContext);
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
    public urlPatterns(): UrlPatternsContext | null {
        return this.getRuleContext(0, UrlPatternsContext);
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


export class UrlPatternsContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public LPAREN(): antlr.TerminalNode {
        return this.getToken(VeroParser.LPAREN, 0)!;
    }
    public STRING_LITERAL(): antlr.TerminalNode[];
    public STRING_LITERAL(i: number): antlr.TerminalNode | null;
    public STRING_LITERAL(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(VeroParser.STRING_LITERAL);
    	} else {
    		return this.getToken(VeroParser.STRING_LITERAL, i);
    	}
    }
    public RPAREN(): antlr.TerminalNode {
        return this.getToken(VeroParser.RPAREN, 0)!;
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
        return VeroParser.RULE_urlPatterns;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterUrlPatterns) {
             listener.enterUrlPatterns(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitUrlPatterns) {
             listener.exitUrlPatterns(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitUrlPatterns) {
            return visitor.visitUrlPatterns(this);
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
    public selectorType(): SelectorTypeContext | null {
        return this.getRuleContext(0, SelectorTypeContext);
    }
    public STRING_LITERAL(): antlr.TerminalNode[];
    public STRING_LITERAL(i: number): antlr.TerminalNode | null;
    public STRING_LITERAL(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(VeroParser.STRING_LITERAL);
    	} else {
    		return this.getToken(VeroParser.STRING_LITERAL, i);
    	}
    }
    public NAME(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.NAME, 0);
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


export class SelectorTypeContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public TESTID(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.TESTID, 0);
    }
    public ROLE(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.ROLE, 0);
    }
    public LABEL(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.LABEL, 0);
    }
    public PLACEHOLDER(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.PLACEHOLDER, 0);
    }
    public TEXT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.TEXT, 0);
    }
    public ALT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.ALT, 0);
    }
    public TITLE(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.TITLE, 0);
    }
    public CSS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.CSS, 0);
    }
    public XPATH(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.XPATH, 0);
    }
    public BUTTON(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.BUTTON, 0);
    }
    public LINK(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.LINK, 0);
    }
    public CHECKBOX(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.CHECKBOX, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_selectorType;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterSelectorType) {
             listener.enterSelectorType(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitSelectorType) {
             listener.exitSelectorType(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitSelectorType) {
            return visitor.visitSelectorType(this);
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
    public RETURNS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.RETURNS, 0);
    }
    public returnType(): ReturnTypeContext | null {
        return this.getRuleContext(0, ReturnTypeContext);
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


export class ReturnTypeContext extends antlr.ParserRuleContext {
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
        return VeroParser.RULE_returnType;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterReturnType) {
             listener.enterReturnType(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitReturnType) {
             listener.exitReturnType(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitReturnType) {
            return visitor.visitReturnType(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class PageActionsDeclarationContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public PAGEACTIONS(): antlr.TerminalNode {
        return this.getToken(VeroParser.PAGEACTIONS, 0)!;
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
    public FOR(): antlr.TerminalNode {
        return this.getToken(VeroParser.FOR, 0)!;
    }
    public LBRACE(): antlr.TerminalNode {
        return this.getToken(VeroParser.LBRACE, 0)!;
    }
    public pageActionsBody(): PageActionsBodyContext {
        return this.getRuleContext(0, PageActionsBodyContext)!;
    }
    public RBRACE(): antlr.TerminalNode {
        return this.getToken(VeroParser.RBRACE, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_pageActionsDeclaration;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterPageActionsDeclaration) {
             listener.enterPageActionsDeclaration(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitPageActionsDeclaration) {
             listener.exitPageActionsDeclaration(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitPageActionsDeclaration) {
            return visitor.visitPageActionsDeclaration(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class PageActionsBodyContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public pageActionsMember(): PageActionsMemberContext[];
    public pageActionsMember(i: number): PageActionsMemberContext | null;
    public pageActionsMember(i?: number): PageActionsMemberContext[] | PageActionsMemberContext | null {
        if (i === undefined) {
            return this.getRuleContexts(PageActionsMemberContext);
        }

        return this.getRuleContext(i, PageActionsMemberContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_pageActionsBody;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterPageActionsBody) {
             listener.enterPageActionsBody(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitPageActionsBody) {
             listener.exitPageActionsBody(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitPageActionsBody) {
            return visitor.visitPageActionsBody(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class PageActionsMemberContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public pageActionsActionDeclaration(): PageActionsActionDeclarationContext {
        return this.getRuleContext(0, PageActionsActionDeclarationContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_pageActionsMember;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterPageActionsMember) {
             listener.enterPageActionsMember(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitPageActionsMember) {
             listener.exitPageActionsMember(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitPageActionsMember) {
            return visitor.visitPageActionsMember(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class PageActionsActionDeclarationContext extends antlr.ParserRuleContext {
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
    public RETURNS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.RETURNS, 0);
    }
    public returnType(): ReturnTypeContext | null {
        return this.getRuleContext(0, ReturnTypeContext);
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
        return VeroParser.RULE_pageActionsActionDeclaration;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterPageActionsActionDeclaration) {
             listener.enterPageActionsActionDeclaration(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitPageActionsActionDeclaration) {
             listener.exitPageActionsActionDeclaration(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitPageActionsActionDeclaration) {
            return visitor.visitPageActionsActionDeclaration(this);
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
    public IDENTIFIER(): antlr.TerminalNode {
        return this.getToken(VeroParser.IDENTIFIER, 0)!;
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
    public utilityStatement(): UtilityStatementContext | null {
        return this.getRuleContext(0, UtilityStatementContext);
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


export class UtilityStatementContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public utilityAssignment(): UtilityAssignmentContext {
        return this.getRuleContext(0, UtilityAssignmentContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_utilityStatement;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterUtilityStatement) {
             listener.enterUtilityStatement(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitUtilityStatement) {
             listener.exitUtilityStatement(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitUtilityStatement) {
            return visitor.visitUtilityStatement(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class UtilityAssignmentContext extends antlr.ParserRuleContext {
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
    public utilityExpression(): UtilityExpressionContext {
        return this.getRuleContext(0, UtilityExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_utilityAssignment;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterUtilityAssignment) {
             listener.enterUtilityAssignment(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitUtilityAssignment) {
             listener.exitUtilityAssignment(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitUtilityAssignment) {
            return visitor.visitUtilityAssignment(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class UtilityExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public trimExpression(): TrimExpressionContext | null {
        return this.getRuleContext(0, TrimExpressionContext);
    }
    public convertExpression(): ConvertExpressionContext | null {
        return this.getRuleContext(0, ConvertExpressionContext);
    }
    public extractExpression(): ExtractExpressionContext | null {
        return this.getRuleContext(0, ExtractExpressionContext);
    }
    public replaceExpression(): ReplaceExpressionContext | null {
        return this.getRuleContext(0, ReplaceExpressionContext);
    }
    public splitExpression(): SplitExpressionContext | null {
        return this.getRuleContext(0, SplitExpressionContext);
    }
    public joinExpression(): JoinExpressionContext | null {
        return this.getRuleContext(0, JoinExpressionContext);
    }
    public lengthExpression(): LengthExpressionContext | null {
        return this.getRuleContext(0, LengthExpressionContext);
    }
    public padExpression(): PadExpressionContext | null {
        return this.getRuleContext(0, PadExpressionContext);
    }
    public addDateExpression(): AddDateExpressionContext | null {
        return this.getRuleContext(0, AddDateExpressionContext);
    }
    public subtractDateExpression(): SubtractDateExpressionContext | null {
        return this.getRuleContext(0, SubtractDateExpressionContext);
    }
    public formatExpression(): FormatExpressionContext | null {
        return this.getRuleContext(0, FormatExpressionContext);
    }
    public datePartExpression(): DatePartExpressionContext | null {
        return this.getRuleContext(0, DatePartExpressionContext);
    }
    public roundExpression(): RoundExpressionContext | null {
        return this.getRuleContext(0, RoundExpressionContext);
    }
    public absoluteExpression(): AbsoluteExpressionContext | null {
        return this.getRuleContext(0, AbsoluteExpressionContext);
    }
    public generateExpression(): GenerateExpressionContext | null {
        return this.getRuleContext(0, GenerateExpressionContext);
    }
    public randomExpression(): RandomExpressionContext | null {
        return this.getRuleContext(0, RandomExpressionContext);
    }
    public todayExpression(): TodayExpressionContext | null {
        return this.getRuleContext(0, TodayExpressionContext);
    }
    public nowExpression(): NowExpressionContext | null {
        return this.getRuleContext(0, NowExpressionContext);
    }
    public expression(): ExpressionContext | null {
        return this.getRuleContext(0, ExpressionContext);
    }
    public utilityExpression(): UtilityExpressionContext[];
    public utilityExpression(i: number): UtilityExpressionContext | null;
    public utilityExpression(i?: number): UtilityExpressionContext[] | UtilityExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(UtilityExpressionContext);
        }

        return this.getRuleContext(i, UtilityExpressionContext);
    }
    public THEN(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.THEN, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_utilityExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterUtilityExpression) {
             listener.enterUtilityExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitUtilityExpression) {
             listener.exitUtilityExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitUtilityExpression) {
            return visitor.visitUtilityExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class TrimExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public TRIM(): antlr.TerminalNode {
        return this.getToken(VeroParser.TRIM, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_trimExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterTrimExpression) {
             listener.enterTrimExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitTrimExpression) {
             listener.exitTrimExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitTrimExpression) {
            return visitor.visitTrimExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ConvertExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public CONVERT(): antlr.TerminalNode {
        return this.getToken(VeroParser.CONVERT, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public TO(): antlr.TerminalNode {
        return this.getToken(VeroParser.TO, 0)!;
    }
    public UPPERCASE(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.UPPERCASE, 0);
    }
    public LOWERCASE(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.LOWERCASE, 0);
    }
    public NUMBER(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.NUMBER, 0);
    }
    public TEXT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.TEXT, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_convertExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterConvertExpression) {
             listener.enterConvertExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitConvertExpression) {
             listener.exitConvertExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitConvertExpression) {
            return visitor.visitConvertExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ExtractExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public EXTRACT(): antlr.TerminalNode {
        return this.getToken(VeroParser.EXTRACT, 0)!;
    }
    public expression(): ExpressionContext[];
    public expression(i: number): ExpressionContext | null;
    public expression(i?: number): ExpressionContext[] | ExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ExpressionContext);
        }

        return this.getRuleContext(i, ExpressionContext);
    }
    public FROM(): antlr.TerminalNode {
        return this.getToken(VeroParser.FROM, 0)!;
    }
    public TO(): antlr.TerminalNode {
        return this.getToken(VeroParser.TO, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_extractExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterExtractExpression) {
             listener.enterExtractExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitExtractExpression) {
             listener.exitExtractExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitExtractExpression) {
            return visitor.visitExtractExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ReplaceExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public REPLACE_(): antlr.TerminalNode {
        return this.getToken(VeroParser.REPLACE_, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public STRING_LITERAL(): antlr.TerminalNode[];
    public STRING_LITERAL(i: number): antlr.TerminalNode | null;
    public STRING_LITERAL(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(VeroParser.STRING_LITERAL);
    	} else {
    		return this.getToken(VeroParser.STRING_LITERAL, i);
    	}
    }
    public WITH(): antlr.TerminalNode {
        return this.getToken(VeroParser.WITH, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_replaceExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterReplaceExpression) {
             listener.enterReplaceExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitReplaceExpression) {
             listener.exitReplaceExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitReplaceExpression) {
            return visitor.visitReplaceExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class SplitExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public SPLIT(): antlr.TerminalNode {
        return this.getToken(VeroParser.SPLIT, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public BY(): antlr.TerminalNode {
        return this.getToken(VeroParser.BY, 0)!;
    }
    public STRING_LITERAL(): antlr.TerminalNode {
        return this.getToken(VeroParser.STRING_LITERAL, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_splitExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterSplitExpression) {
             listener.enterSplitExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitSplitExpression) {
             listener.exitSplitExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitSplitExpression) {
            return visitor.visitSplitExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class JoinExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public JOIN_(): antlr.TerminalNode {
        return this.getToken(VeroParser.JOIN_, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public WITH(): antlr.TerminalNode {
        return this.getToken(VeroParser.WITH, 0)!;
    }
    public STRING_LITERAL(): antlr.TerminalNode {
        return this.getToken(VeroParser.STRING_LITERAL, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_joinExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterJoinExpression) {
             listener.enterJoinExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitJoinExpression) {
             listener.exitJoinExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitJoinExpression) {
            return visitor.visitJoinExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class LengthExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public LENGTH(): antlr.TerminalNode {
        return this.getToken(VeroParser.LENGTH, 0)!;
    }
    public OF(): antlr.TerminalNode {
        return this.getToken(VeroParser.OF, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_lengthExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterLengthExpression) {
             listener.enterLengthExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitLengthExpression) {
             listener.exitLengthExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitLengthExpression) {
            return visitor.visitLengthExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class PadExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public PAD(): antlr.TerminalNode {
        return this.getToken(VeroParser.PAD, 0)!;
    }
    public expression(): ExpressionContext[];
    public expression(i: number): ExpressionContext | null;
    public expression(i?: number): ExpressionContext[] | ExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ExpressionContext);
        }

        return this.getRuleContext(i, ExpressionContext);
    }
    public TO(): antlr.TerminalNode {
        return this.getToken(VeroParser.TO, 0)!;
    }
    public WITH(): antlr.TerminalNode {
        return this.getToken(VeroParser.WITH, 0)!;
    }
    public STRING_LITERAL(): antlr.TerminalNode {
        return this.getToken(VeroParser.STRING_LITERAL, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_padExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterPadExpression) {
             listener.enterPadExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitPadExpression) {
             listener.exitPadExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitPadExpression) {
            return visitor.visitPadExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class TodayExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public TODAY(): antlr.TerminalNode {
        return this.getToken(VeroParser.TODAY, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_todayExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterTodayExpression) {
             listener.enterTodayExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitTodayExpression) {
             listener.exitTodayExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitTodayExpression) {
            return visitor.visitTodayExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class NowExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public NOW(): antlr.TerminalNode {
        return this.getToken(VeroParser.NOW, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_nowExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterNowExpression) {
             listener.enterNowExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitNowExpression) {
             listener.exitNowExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitNowExpression) {
            return visitor.visitNowExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class AddDateExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public ADD(): antlr.TerminalNode {
        return this.getToken(VeroParser.ADD, 0)!;
    }
    public expression(): ExpressionContext[];
    public expression(i: number): ExpressionContext | null;
    public expression(i?: number): ExpressionContext[] | ExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ExpressionContext);
        }

        return this.getRuleContext(i, ExpressionContext);
    }
    public dateUnit(): DateUnitContext {
        return this.getRuleContext(0, DateUnitContext)!;
    }
    public TO(): antlr.TerminalNode {
        return this.getToken(VeroParser.TO, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_addDateExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterAddDateExpression) {
             listener.enterAddDateExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitAddDateExpression) {
             listener.exitAddDateExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitAddDateExpression) {
            return visitor.visitAddDateExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class SubtractDateExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public SUBTRACT(): antlr.TerminalNode {
        return this.getToken(VeroParser.SUBTRACT, 0)!;
    }
    public expression(): ExpressionContext[];
    public expression(i: number): ExpressionContext | null;
    public expression(i?: number): ExpressionContext[] | ExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ExpressionContext);
        }

        return this.getRuleContext(i, ExpressionContext);
    }
    public dateUnit(): DateUnitContext {
        return this.getRuleContext(0, DateUnitContext)!;
    }
    public FROM(): antlr.TerminalNode {
        return this.getToken(VeroParser.FROM, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_subtractDateExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterSubtractDateExpression) {
             listener.enterSubtractDateExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitSubtractDateExpression) {
             listener.exitSubtractDateExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitSubtractDateExpression) {
            return visitor.visitSubtractDateExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class DateUnitContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public DAY(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.DAY, 0);
    }
    public DAYS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.DAYS, 0);
    }
    public MONTH(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.MONTH, 0);
    }
    public MONTHS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.MONTHS, 0);
    }
    public YEAR(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.YEAR, 0);
    }
    public YEARS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.YEARS, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_dateUnit;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterDateUnit) {
             listener.enterDateUnit(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitDateUnit) {
             listener.exitDateUnit(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitDateUnit) {
            return visitor.visitDateUnit(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class FormatExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public FORMAT(): antlr.TerminalNode {
        return this.getToken(VeroParser.FORMAT, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public AS(): antlr.TerminalNode {
        return this.getToken(VeroParser.AS, 0)!;
    }
    public STRING_LITERAL(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.STRING_LITERAL, 0);
    }
    public CURRENCY(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.CURRENCY, 0);
    }
    public PERCENT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.PERCENT, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_formatExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterFormatExpression) {
             listener.enterFormatExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitFormatExpression) {
             listener.exitFormatExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitFormatExpression) {
            return visitor.visitFormatExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class DatePartExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public OF(): antlr.TerminalNode {
        return this.getToken(VeroParser.OF, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public YEAR(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.YEAR, 0);
    }
    public MONTH(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.MONTH, 0);
    }
    public DAY(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.DAY, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_datePartExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterDatePartExpression) {
             listener.enterDatePartExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitDatePartExpression) {
             listener.exitDatePartExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitDatePartExpression) {
            return visitor.visitDatePartExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class RoundExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public ROUND(): antlr.TerminalNode {
        return this.getToken(VeroParser.ROUND, 0)!;
    }
    public expression(): ExpressionContext[];
    public expression(i: number): ExpressionContext | null;
    public expression(i?: number): ExpressionContext[] | ExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ExpressionContext);
        }

        return this.getRuleContext(i, ExpressionContext);
    }
    public TO(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.TO, 0);
    }
    public DECIMALS(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.DECIMALS, 0);
    }
    public UP(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.UP, 0);
    }
    public DOWN(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.DOWN, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_roundExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterRoundExpression) {
             listener.enterRoundExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitRoundExpression) {
             listener.exitRoundExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitRoundExpression) {
            return visitor.visitRoundExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class AbsoluteExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public ABSOLUTE(): antlr.TerminalNode {
        return this.getToken(VeroParser.ABSOLUTE, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_absoluteExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterAbsoluteExpression) {
             listener.enterAbsoluteExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitAbsoluteExpression) {
             listener.exitAbsoluteExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitAbsoluteExpression) {
            return visitor.visitAbsoluteExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class GenerateExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public GENERATE(): antlr.TerminalNode {
        return this.getToken(VeroParser.GENERATE, 0)!;
    }
    public STRING_LITERAL(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.STRING_LITERAL, 0);
    }
    public UUID(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.UUID, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_generateExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterGenerateExpression) {
             listener.enterGenerateExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitGenerateExpression) {
             listener.exitGenerateExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitGenerateExpression) {
            return visitor.visitGenerateExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class RandomExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public RANDOM(): antlr.TerminalNode {
        return this.getToken(VeroParser.RANDOM, 0)!;
    }
    public NUMBER(): antlr.TerminalNode {
        return this.getToken(VeroParser.NUMBER, 0)!;
    }
    public FROM(): antlr.TerminalNode {
        return this.getToken(VeroParser.FROM, 0)!;
    }
    public expression(): ExpressionContext[];
    public expression(i: number): ExpressionContext | null;
    public expression(i?: number): ExpressionContext[] | ExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ExpressionContext);
        }

        return this.getRuleContext(i, ExpressionContext);
    }
    public TO(): antlr.TerminalNode {
        return this.getToken(VeroParser.TO, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_randomExpression;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterRandomExpression) {
             listener.enterRandomExpression(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitRandomExpression) {
             listener.exitRandomExpression(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitRandomExpression) {
            return visitor.visitRandomExpression(this);
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
    public performAction(): PerformActionContext | null {
        return this.getRuleContext(0, PerformActionContext);
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
    public switchToNewTabAction(): SwitchToNewTabActionContext | null {
        return this.getRuleContext(0, SwitchToNewTabActionContext);
    }
    public switchToTabAction(): SwitchToTabActionContext | null {
        return this.getRuleContext(0, SwitchToTabActionContext);
    }
    public openInNewTabAction(): OpenInNewTabActionContext | null {
        return this.getRuleContext(0, OpenInNewTabActionContext);
    }
    public closeTabAction(): CloseTabActionContext | null {
        return this.getRuleContext(0, CloseTabActionContext);
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
    public IN(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.IN, 0);
    }
    public NEW(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.NEW, 0);
    }
    public TAB(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.TAB, 0);
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


export class PerformActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public PERFORM(): antlr.TerminalNode {
        return this.getToken(VeroParser.PERFORM, 0)!;
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
        return VeroParser.RULE_performAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterPerformAction) {
             listener.enterPerformAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitPerformAction) {
             listener.exitPerformAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitPerformAction) {
            return visitor.visitPerformAction(this);
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


export class SwitchToNewTabActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public SWITCH(): antlr.TerminalNode {
        return this.getToken(VeroParser.SWITCH, 0)!;
    }
    public TO(): antlr.TerminalNode {
        return this.getToken(VeroParser.TO, 0)!;
    }
    public NEW(): antlr.TerminalNode {
        return this.getToken(VeroParser.NEW, 0)!;
    }
    public TAB(): antlr.TerminalNode {
        return this.getToken(VeroParser.TAB, 0)!;
    }
    public expression(): ExpressionContext | null {
        return this.getRuleContext(0, ExpressionContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_switchToNewTabAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterSwitchToNewTabAction) {
             listener.enterSwitchToNewTabAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitSwitchToNewTabAction) {
             listener.exitSwitchToNewTabAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitSwitchToNewTabAction) {
            return visitor.visitSwitchToNewTabAction(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class SwitchToTabActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public SWITCH(): antlr.TerminalNode {
        return this.getToken(VeroParser.SWITCH, 0)!;
    }
    public TO(): antlr.TerminalNode {
        return this.getToken(VeroParser.TO, 0)!;
    }
    public TAB(): antlr.TerminalNode {
        return this.getToken(VeroParser.TAB, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_switchToTabAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterSwitchToTabAction) {
             listener.enterSwitchToTabAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitSwitchToTabAction) {
             listener.exitSwitchToTabAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitSwitchToTabAction) {
            return visitor.visitSwitchToTabAction(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class OpenInNewTabActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public OPEN(): antlr.TerminalNode {
        return this.getToken(VeroParser.OPEN, 0)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public IN(): antlr.TerminalNode {
        return this.getToken(VeroParser.IN, 0)!;
    }
    public NEW(): antlr.TerminalNode {
        return this.getToken(VeroParser.NEW, 0)!;
    }
    public TAB(): antlr.TerminalNode {
        return this.getToken(VeroParser.TAB, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_openInNewTabAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterOpenInNewTabAction) {
             listener.enterOpenInNewTabAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitOpenInNewTabAction) {
             listener.exitOpenInNewTabAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitOpenInNewTabAction) {
            return visitor.visitOpenInNewTabAction(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class CloseTabActionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public CLOSE(): antlr.TerminalNode {
        return this.getToken(VeroParser.CLOSE, 0)!;
    }
    public TAB(): antlr.TerminalNode {
        return this.getToken(VeroParser.TAB, 0)!;
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_closeTabAction;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterCloseTabAction) {
             listener.enterCloseTabAction(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitCloseTabAction) {
             listener.exitCloseTabAction(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitCloseTabAction) {
            return visitor.visitCloseTabAction(this);
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
    public rowStatement(): RowStatementContext | null {
        return this.getRuleContext(0, RowStatementContext);
    }
    public rowsStatement(): RowsStatementContext | null {
        return this.getRuleContext(0, RowsStatementContext);
    }
    public columnAccessStatement(): ColumnAccessStatementContext | null {
        return this.getRuleContext(0, ColumnAccessStatementContext);
    }
    public countStatement(): CountStatementContext | null {
        return this.getRuleContext(0, CountStatementContext);
    }
    public legacyDataQueryStatement(): LegacyDataQueryStatementContext | null {
        return this.getRuleContext(0, LegacyDataQueryStatementContext);
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


export class RowStatementContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public ROW(): antlr.TerminalNode {
        return this.getToken(VeroParser.ROW, 0)!;
    }
    public IDENTIFIER(): antlr.TerminalNode {
        return this.getToken(VeroParser.IDENTIFIER, 0)!;
    }
    public EQUALS(): antlr.TerminalNode {
        return this.getToken(VeroParser.EQUALS, 0)!;
    }
    public simpleTableReference(): SimpleTableReferenceContext {
        return this.getRuleContext(0, SimpleTableReferenceContext)!;
    }
    public rowModifier(): RowModifierContext | null {
        return this.getRuleContext(0, RowModifierContext);
    }
    public dataWhereClause(): DataWhereClauseContext | null {
        return this.getRuleContext(0, DataWhereClauseContext);
    }
    public orderByClause(): OrderByClauseContext | null {
        return this.getRuleContext(0, OrderByClauseContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_rowStatement;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterRowStatement) {
             listener.enterRowStatement(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitRowStatement) {
             listener.exitRowStatement(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitRowStatement) {
            return visitor.visitRowStatement(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class RowModifierContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public RANDOM(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.RANDOM, 0);
    }
    public FIRST(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.FIRST, 0);
    }
    public LAST(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.LAST, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_rowModifier;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterRowModifier) {
             listener.enterRowModifier(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitRowModifier) {
             listener.exitRowModifier(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitRowModifier) {
            return visitor.visitRowModifier(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class RowsStatementContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public ROWS(): antlr.TerminalNode {
        return this.getToken(VeroParser.ROWS, 0)!;
    }
    public IDENTIFIER(): antlr.TerminalNode {
        return this.getToken(VeroParser.IDENTIFIER, 0)!;
    }
    public EQUALS(): antlr.TerminalNode {
        return this.getToken(VeroParser.EQUALS, 0)!;
    }
    public simpleTableReference(): SimpleTableReferenceContext {
        return this.getRuleContext(0, SimpleTableReferenceContext)!;
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
    public override get ruleIndex(): number {
        return VeroParser.RULE_rowsStatement;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterRowsStatement) {
             listener.enterRowsStatement(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitRowsStatement) {
             listener.exitRowsStatement(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitRowsStatement) {
            return visitor.visitRowsStatement(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ColumnAccessStatementContext extends antlr.ParserRuleContext {
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
    public EQUALS(): antlr.TerminalNode {
        return this.getToken(VeroParser.EQUALS, 0)!;
    }
    public simpleTableReference(): SimpleTableReferenceContext {
        return this.getRuleContext(0, SimpleTableReferenceContext)!;
    }
    public DOT(): antlr.TerminalNode {
        return this.getToken(VeroParser.DOT, 0)!;
    }
    public DISTINCT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.DISTINCT, 0);
    }
    public dataWhereClause(): DataWhereClauseContext | null {
        return this.getRuleContext(0, DataWhereClauseContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_columnAccessStatement;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterColumnAccessStatement) {
             listener.enterColumnAccessStatement(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitColumnAccessStatement) {
             listener.exitColumnAccessStatement(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitColumnAccessStatement) {
            return visitor.visitColumnAccessStatement(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class CountStatementContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public NUMBER(): antlr.TerminalNode {
        return this.getToken(VeroParser.NUMBER, 0)!;
    }
    public IDENTIFIER(): antlr.TerminalNode {
        return this.getToken(VeroParser.IDENTIFIER, 0)!;
    }
    public EQUALS(): antlr.TerminalNode {
        return this.getToken(VeroParser.EQUALS, 0)!;
    }
    public COUNT(): antlr.TerminalNode {
        return this.getToken(VeroParser.COUNT, 0)!;
    }
    public simpleTableReference(): SimpleTableReferenceContext {
        return this.getRuleContext(0, SimpleTableReferenceContext)!;
    }
    public dataWhereClause(): DataWhereClauseContext | null {
        return this.getRuleContext(0, DataWhereClauseContext);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_countStatement;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterCountStatement) {
             listener.enterCountStatement(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitCountStatement) {
             listener.exitCountStatement(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitCountStatement) {
            return visitor.visitCountStatement(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class SimpleTableReferenceContext extends antlr.ParserRuleContext {
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
    public DOT(): antlr.TerminalNode | null {
        return this.getToken(VeroParser.DOT, 0);
    }
    public override get ruleIndex(): number {
        return VeroParser.RULE_simpleTableReference;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterSimpleTableReference) {
             listener.enterSimpleTableReference(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitSimpleTableReference) {
             listener.exitSimpleTableReference(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitSimpleTableReference) {
            return visitor.visitSimpleTableReference(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class LegacyDataQueryStatementContext extends antlr.ParserRuleContext {
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
        return VeroParser.RULE_legacyDataQueryStatement;
    }
    public override enterRule(listener: VeroListener): void {
        if(listener.enterLegacyDataQueryStatement) {
             listener.enterLegacyDataQueryStatement(this);
        }
    }
    public override exitRule(listener: VeroListener): void {
        if(listener.exitLegacyDataQueryStatement) {
             listener.exitLegacyDataQueryStatement(this);
        }
    }
    public override accept<Result>(visitor: VeroVisitor<Result>): Result | null {
        if (visitor.visitLegacyDataQueryStatement) {
            return visitor.visitLegacyDataQueryStatement(this);
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
