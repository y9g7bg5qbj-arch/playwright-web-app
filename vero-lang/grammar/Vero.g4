/**
 * ANTLR4 Grammar for Vero DSL
 * A human-readable test automation language that transpiles to Playwright
 */

grammar Vero;

// ==================== PARSER RULES ====================

// Entry point
program
    : declaration* EOF
    ;

declaration
    : pageDeclaration
    | featureDeclaration
    | fixtureDeclaration
    ;

// ==================== PAGE DECLARATION ====================

pageDeclaration
    : PAGE IDENTIFIER LBRACE pageBody RBRACE
    ;

pageBody
    : pageMember*
    ;

pageMember
    : fieldDeclaration
    | actionDeclaration
    ;

// Field: field name = "selector"
fieldDeclaration
    : FIELD IDENTIFIER EQUALS STRING_LITERAL
    ;

// Action: actionName with param1, param2 { ... }
actionDeclaration
    : IDENTIFIER (WITH parameterList)? LBRACE statement* RBRACE
    ;

parameterList
    : IDENTIFIER (COMMA IDENTIFIER)*
    ;

// ==================== FEATURE DECLARATION ====================

featureDeclaration
    : featureAnnotation* FEATURE IDENTIFIER LBRACE featureBody RBRACE
    ;

// Feature-level annotations
featureAnnotation
    : SERIAL_ANNOTATION    // @serial - run tests sequentially
    | SKIP_ANNOTATION      // @skip - skip entire feature
    | ONLY_ANNOTATION      // @only - run only this feature
    ;

featureBody
    : featureMember*
    ;

featureMember
    : useStatement
    | withFixtureStatement
    | hookDeclaration
    | scenarioDeclaration
    ;

// Use statement: use PageName
useStatement
    : USE IDENTIFIER
    ;

// Hooks: before each { ... }, after all { ... }
hookDeclaration
    : (BEFORE | AFTER) (EACH | ALL) LBRACE statement* RBRACE
    ;

// Scenario: @skip scenario "name" @tag1 @tag2 { ... }
scenarioDeclaration
    : scenarioAnnotation* SCENARIO STRING_LITERAL tag* LBRACE statement* RBRACE
    ;

// Special test annotations that affect test behavior
scenarioAnnotation
    : SKIP_ANNOTATION      // @skip - skip this test
    | ONLY_ANNOTATION      // @only - run only this test
    | SLOW_ANNOTATION      // @slow - triple timeout
    | FIXME_ANNOTATION     // @fixme - mark as known issue
    ;

tag
    : AT IDENTIFIER
    ;

// ==================== FIXTURE DECLARATION ====================

// FIXTURE authenticatedUser { SCOPE test DEPENDS ON page SETUP { ... } TEARDOWN { ... } }
fixtureDeclaration
    : FIXTURE IDENTIFIER fixtureParams? LBRACE fixtureBody RBRACE
    ;

// WITH parameters for parameterized fixtures: FIXTURE userWithRole WITH role
fixtureParams
    : WITH parameterList
    ;

fixtureBody
    : fixtureMember*
    ;

fixtureMember
    : fixtureScopeStatement
    | fixtureDependsStatement
    | fixtureAutoStatement
    | fixtureOptionStatement
    | fixtureSetupBlock
    | fixtureTeardownBlock
    ;

// SCOPE test | SCOPE worker
fixtureScopeStatement
    : SCOPE (TEST_SCOPE | WORKER_SCOPE)
    ;

// DEPENDS ON page, context
fixtureDependsStatement
    : DEPENDS ON identifierList
    ;

// AUTO (marks fixture as auto-run)
fixtureAutoStatement
    : AUTO
    ;

// OPTION name DEFAULT "value"
fixtureOptionStatement
    : OPTION IDENTIFIER DEFAULT expression
    ;

// SETUP { ... }
fixtureSetupBlock
    : SETUP LBRACE statement* RBRACE
    ;

// TEARDOWN { ... }
fixtureTeardownBlock
    : TEARDOWN LBRACE statement* RBRACE
    ;

// WITH FIXTURE statement in features
withFixtureStatement
    : WITH FIXTURE IDENTIFIER fixtureOptionsBlock?
    ;

// { role = "admin", count = 5 }
fixtureOptionsBlock
    : LBRACE fixtureOption (COMMA fixtureOption)* RBRACE
    ;

fixtureOption
    : IDENTIFIER EQUALS expression
    ;

// ==================== STATEMENTS ====================

statement
    : actionStatement
    | assertionStatement
    | controlFlowStatement
    | variableDeclaration
    | dataQueryStatement
    | returnStatement
    ;

// ==================== ACTIONS ====================

actionStatement
    : clickAction
    | fillAction
    | openAction
    | checkAction
    | uncheckAction
    | selectAction
    | hoverAction
    | pressAction
    | scrollAction
    | waitAction
    | doAction
    | refreshAction
    | clearAction
    | screenshotAction
    | logAction
    | uploadAction
    ;

// click element
clickAction
    : CLICK selectorExpression
    ;

// fill element with "value"
fillAction
    : FILL selectorExpression WITH expression
    ;

// open "url"
openAction
    : OPEN expression
    ;

// check element
checkAction
    : CHECK selectorExpression
    ;

// uncheck element
uncheckAction
    : UNCHECK selectorExpression
    ;

// select "option" from element
selectAction
    : SELECT expression FROM selectorExpression
    ;

// hover element
hoverAction
    : HOVER selectorExpression
    ;

// press "key"
pressAction
    : PRESS expression
    ;

// scroll to element | scroll down/up
scrollAction
    : SCROLL (TO selectorExpression | direction)
    ;

direction
    : UP | DOWN | LEFT | RIGHT
    ;

// wait N seconds | wait N milliseconds | wait for element
waitAction
    : WAIT (expression (SECONDS | MILLISECONDS) | FOR selectorExpression)
    ;

// do PageName.actionName with arg1, arg2
doAction
    : DO pageMethodReference (WITH argumentList)?
    ;

// refresh
refreshAction
    : REFRESH
    ;

// clear element
clearAction
    : CLEAR selectorExpression
    ;

// take screenshot "name"
screenshotAction
    : TAKE SCREENSHOT expression?
    ;

// log "message"
logAction
    : LOG expression
    ;

// upload "file.pdf" to "#fileInput" | upload "file1.jpg", "file2.jpg" to "#multiUpload"
uploadAction
    : UPLOAD fileList TO selectorExpression
    ;

fileList
    : expression (COMMA expression)*
    ;

// ==================== ASSERTIONS ====================

assertionStatement
    : VERIFY selectorOrText (IS | ISNOT) condition    // verify element is visible
    | VERIFY URL urlCondition                          // verify url contains "/dashboard"
    | VERIFY TITLE titleCondition                      // verify title equals "Dashboard"
    | VERIFY selectorExpression HAS hasCondition       // verify element has count 5
    ;

selectorOrText
    : selectorExpression
    | expression
    ;

condition
    : VISIBLE
    | HIDDEN_STATE
    | ENABLED
    | DISABLED
    | CHECKED
    | EMPTY
    | containsCondition
    ;

containsCondition
    : CONTAINS expression
    ;

// URL assertions: verify url contains/equals/matches "value"
urlCondition
    : CONTAINS expression
    | EQUAL expression
    | MATCHES expression
    ;

// Title assertions: verify title contains/equals "value"
titleCondition
    : CONTAINS expression
    | EQUAL expression
    ;

// Has conditions for element properties
hasCondition
    : COUNT expression                             // verify ".items" has count 5
    | VALUE expression                             // verify "#email" has value "test@example.com"
    | ATTRIBUTE expression EQUAL expression        // verify "#link" has attribute "href" equal "/home"
    ;

// ==================== CONTROL FLOW ====================

controlFlowStatement
    : ifStatement
    | repeatStatement
    ;

// if condition { ... } else { ... }
ifStatement
    : IF booleanExpression LBRACE statement* RBRACE (ELSE LBRACE statement* RBRACE)?
    ;

// repeat N times { ... }
repeatStatement
    : REPEAT expression TIMES LBRACE statement* RBRACE
    ;

booleanExpression
    : selectorExpression IS condition                     // element is visible
    | selectorExpression ISNOT condition                  // element is not visible
    | expression comparisonOperator expression            // count > 5, price == 100
    | expression                                          // truthy check
    ;

comparisonOperator
    : GT        // >
    | LT        // <
    | GTE       // >=
    | LTE       // <=
    | EQEQ      // ==
    | NEQ       // !=
    ;

// ==================== VARIABLES ====================

variableDeclaration
    : variableType IDENTIFIER EQUALS expression
    ;

variableType
    : TEXT
    | NUMBER
    | FLAG
    | LIST
    | DATA
    ;

returnStatement
    : RETURN expression?
    ;

// ==================== DATA QUERIES (VDQL) ====================

dataQueryStatement
    : dataResultType IDENTIFIER EQUALS dataQuery
    ;

dataResultType
    : DATA      // Single row object
    | LIST      // Multiple rows or column values
    | TEXT      // Single text value
    | NUMBER    // Single number value
    | FLAG      // Single boolean value
    ;

dataQuery
    : aggregationQuery
    | tableQuery
    ;

// Aggregation queries: count, sum, average, min, max
aggregationQuery
    : COUNT tableReference (dataWhereClause)?
    | COUNT DISTINCT columnReference (dataWhereClause)?
    | SUM columnReference (dataWhereClause)?
    | AVERAGE columnReference (dataWhereClause)?
    | MIN columnReference (dataWhereClause)?
    | MAX columnReference (dataWhereClause)?
    | DISTINCT columnReference (dataWhereClause)?
    | ROWS IN tableReference
    | COLUMNS IN tableReference
    | HEADERS OF tableReference
    ;

// Table queries with optional modifiers
tableQuery
    : (FIRST | LAST | RANDOM)? tableReference queryModifier*
    | (FIRST | LAST | RANDOM)? tableReference columnSelector queryModifier*
    ;

tableReference
    : TESTDATA DOT IDENTIFIER                                           // TestData.Users
    | TESTDATA DOT IDENTIFIER DOT IDENTIFIER                            // TestData.Users.email
    | TESTDATA DOT IDENTIFIER LBRACK expression RBRACK                  // TestData.Users[1]
    | TESTDATA DOT IDENTIFIER LBRACK expression RBRACK DOT IDENTIFIER   // TestData.Users[1].email
    | TESTDATA DOT IDENTIFIER LBRACK expression DOTDOT expression RBRACK // TestData.Users[5..10] (row range)
    | TESTDATA DOT IDENTIFIER CELL LBRACK expression COMMA expression RBRACK  // TestData.Users cell [1, 2]
    ;

// Multiple column selector: .(email, name, status)
columnSelector
    : DOT LPAREN identifierList RPAREN
    ;

identifierList
    : IDENTIFIER (COMMA IDENTIFIER)*
    ;

columnReference
    : TESTDATA DOT IDENTIFIER DOT IDENTIFIER   // TestData.Users.email
    ;

queryModifier
    : dataWhereClause
    | orderByClause
    | limitClause
    | offsetClause
    | defaultClause
    ;

// WHERE clause with conditions
dataWhereClause
    : WHERE dataCondition
    ;

dataCondition
    : dataCondition AND dataCondition
    | dataCondition OR dataCondition
    | NOT dataCondition
    | LPAREN dataCondition RPAREN
    | dataComparison
    ;

dataComparison
    : IDENTIFIER comparisonOperator expression                    // column == "value"
    | IDENTIFIER textOperator expression                          // column contains "text"
    | IDENTIFIER IN LBRACK expressionList RBRACK                 // column in ["a", "b"]
    | IDENTIFIER NOT IN LBRACK expressionList RBRACK             // column not in ["a", "b"]
    | IDENTIFIER IS EMPTY                                         // column is empty
    | IDENTIFIER ISNOT EMPTY                                      // column is not empty
    | IDENTIFIER IS NULL_                                         // column is null
    | IDENTIFIER dateComparison                                   // column >= days ago 7
    ;

textOperator
    : CONTAINS
    | STARTS WITH
    | ENDS WITH
    | MATCHES
    ;

dateComparison
    : comparisonOperator TODAY
    | comparisonOperator DAYS AGO expression
    | comparisonOperator MONTHS AGO expression
    | comparisonOperator YEARS AGO expression
    ;

expressionList
    : expression (COMMA expression)*
    ;

// ORDER BY clause
orderByClause
    : ORDER BY orderColumn (COMMA orderColumn)*
    ;

orderColumn
    : IDENTIFIER (ASC | DESC)?
    ;

// LIMIT and OFFSET
limitClause
    : LIMIT expression
    ;

offsetClause
    : OFFSET expression
    ;

// DEFAULT value for no match
defaultClause
    : DEFAULT expression
    ;

// ==================== EXPRESSIONS ====================

expression
    : STRING_LITERAL
    | NUMBER_LITERAL
    | IDENTIFIER
    | pageMethodReference
    | LPAREN expression RPAREN
    ;

selectorExpression
    : pageFieldReference      // PageName.fieldName
    | STRING_LITERAL          // "css selector" or "text"
    | IDENTIFIER              // bare field name (within same page context)
    ;

pageMethodReference
    : IDENTIFIER DOT IDENTIFIER
    ;

pageFieldReference
    : IDENTIFIER DOT IDENTIFIER
    ;

argumentList
    : expression (COMMA expression)*
    ;

// ==================== LEXER RULES ====================

// Test Annotations (must be before general AT token)
SKIP_ANNOTATION   : '@' S K I P ;
ONLY_ANNOTATION   : '@' O N L Y ;
SLOW_ANNOTATION   : '@' S L O W ;
FIXME_ANNOTATION  : '@' F I X M E ;
SERIAL_ANNOTATION : '@' S E R I A L ;

// Keywords (case-insensitive handled by lexer mode or semantic check)
PAGE        : P A G E ;
FEATURE     : F E A T U R E ;
SCENARIO    : S C E N A R I O ;
FIELD       : F I E L D ;
USE         : U S E ;
BEFORE      : B E F O R E ;
AFTER       : A F T E R ;
EACH        : E A C H ;
ALL         : A L L ;
WITH        : W I T H ;
FROM        : F R O M ;
TO          : T O ;
IN          : I N ;
RETURNS     : R E T U R N S ;
RETURN      : R E T U R N ;

// Fixtures
FIXTURE     : F I X T U R E ;
SCOPE       : S C O P E ;
TEST_SCOPE  : T E S T ;
WORKER_SCOPE: W O R K E R ;
SETUP       : S E T U P ;
TEARDOWN    : T E A R D O W N ;
DEPENDS     : D E P E N D S ;
AUTO        : A U T O ;
OPTION      : O P T I O N ;

// Control flow
IF          : I F ;
ELSE        : E L S E ;
REPEAT      : R E P E A T ;
TIMES       : T I M E S ;

// Actions
CLICK       : C L I C K ;
FILL        : F I L L ;
OPEN        : O P E N ;
CHECK       : C H E C K ;
UNCHECK     : U N C H E C K ;
SELECT      : S E L E C T ;
HOVER       : H O V E R ;
PRESS       : P R E S S ;
SCROLL      : S C R O L L ;
WAIT        : W A I T ;
DO          : D O ;
REFRESH     : R E F R E S H ;
CLEAR       : C L E A R ;
TAKE        : T A K E ;
SCREENSHOT  : S C R E E N S H O T ;
LOG         : L O G ;
UPLOAD      : U P L O A D ;
FOR         : F O R ;

// Assertions
VERIFY      : V E R I F Y ;
IS          : I S ;
ISNOT       : I S WS+ N O T ;
VISIBLE     : V I S I B L E ;
HIDDEN_STATE: H I D D E N ;
ENABLED     : E N A B L E D ;
DISABLED    : D I S A B L E D ;
CHECKED     : C H E C K E D ;
EMPTY       : E M P T Y ;
CONTAINS    : C O N T A I N S ;
NOT         : N O T ;
URL         : U R L ;
TITLE       : T I T L E ;
EQUAL       : E Q U A L ;
HAS         : H A S ;
VALUE       : V A L U E ;
ATTRIBUTE   : A T T R I B U T E ;

// Types
TEXT        : T E X T ;
NUMBER      : N U M B E R ;
FLAG        : F L A G ;
LIST        : L I S T ;
DATA        : D A T A ;

// VDQL (Data Query) keywords
TESTDATA    : T E S T D A T A ;
WHERE       : W H E R E ;
ORDER       : O R D E R ;
BY          : B Y ;
ASC         : A S C ;
DESC        : D E S C ;
LIMIT       : L I M I T ;
OFFSET      : O F F S E T ;
FIRST       : F I R S T ;
LAST        : L A S T ;
RANDOM      : R A N D O M ;
DEFAULT     : D E F A U L T ;
AND         : A N D ;
OR          : O R ;
COUNT       : C O U N T ;
SUM         : S U M ;
AVERAGE     : A V E R A G E ;
MIN         : M I N ;
MAX         : M A X ;
DISTINCT    : D I S T I N C T ;
ROWS        : R O W S ;
COLUMNS     : C O L U M N S ;
HEADERS     : H E A D E R S ;
OF          : O F ;
CELL        : C E L L ;
STARTS      : S T A R T S ;
ENDS        : E N D S ;
MATCHES     : M A T C H E S ;
NULL_       : N U L L ;
TODAY       : T O D A Y ;
DAYS        : D A Y S ;
MONTHS      : M O N T H S ;
YEARS       : Y E A R S ;
AGO         : A G O ;

// Time units
SECONDS     : S E C O N D S ;
MILLISECONDS: M I L L I S E C O N D S ;

// Directions
UP          : U P ;
DOWN        : D O W N ;
LEFT        : L E F T ;
RIGHT       : R I G H T ;

// Symbols
LBRACE      : '{' ;
RBRACE      : '}' ;
LPAREN      : '(' ;
RPAREN      : ')' ;
LBRACK      : '[' ;
RBRACK      : ']' ;
COMMA       : ',' ;
DOTDOT      : '..' ;  // Range operator (must be before DOT)
DOT         : '.' ;
EQUALS      : '=' ;
AT          : '@' ;

// Comparison operators
GT          : '>' ;
LT          : '<' ;
GTE         : '>=' ;
LTE         : '<=' ;
EQEQ        : '==' ;
NEQ         : '!=' ;

// Literals
STRING_LITERAL
    : '"' (~["\r\n\\] | '\\' .)* '"'
    ;

NUMBER_LITERAL
    : [0-9]+ ('.' [0-9]+)?
    ;

IDENTIFIER
    : [a-zA-Z_] [a-zA-Z0-9_]*
    ;

// Comments
COMMENT
    : '#' ~[\r\n]* -> skip
    ;

// Whitespace
WS
    : [ \t\r\n]+ -> skip
    ;

// Case-insensitive letter fragments
fragment A : [aA] ;
fragment B : [bB] ;
fragment C : [cC] ;
fragment D : [dD] ;
fragment E : [eE] ;
fragment F : [fF] ;
fragment G : [gG] ;
fragment H : [hH] ;
fragment I : [iI] ;
fragment J : [jJ] ;
fragment K : [kK] ;
fragment L : [lL] ;
fragment M : [mM] ;
fragment N : [nN] ;
fragment O : [oO] ;
fragment P : [pP] ;
fragment Q : [qQ] ;
fragment R : [rR] ;
fragment S : [sS] ;
fragment T : [tT] ;
fragment U : [uU] ;
fragment V : [vV] ;
fragment W : [wW] ;
fragment X : [xX] ;
fragment Y : [yY] ;
fragment Z : [zZ] ;
