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
    : FEATURE IDENTIFIER LBRACE featureBody RBRACE
    ;

featureBody
    : featureMember*
    ;

featureMember
    : useStatement
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

// Scenario: scenario "name" @tag1 @tag2 { ... }
scenarioDeclaration
    : SCENARIO STRING_LITERAL tag* LBRACE statement* RBRACE
    ;

tag
    : AT IDENTIFIER
    ;

// ==================== STATEMENTS ====================

statement
    : actionStatement
    | assertionStatement
    | controlFlowStatement
    | variableDeclaration
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

// ==================== ASSERTIONS ====================

assertionStatement
    : VERIFY selectorOrText (IS | ISNOT) condition
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
    ;

returnStatement
    : RETURN expression?
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

// Types
TEXT        : T E X T ;
NUMBER      : N U M B E R ;
FLAG        : F L A G ;
LIST        : L I S T ;

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
