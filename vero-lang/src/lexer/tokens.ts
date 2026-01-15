export enum TokenType {
    // Structural Keywords
    PAGE = 'PAGE',
    FEATURE = 'FEATURE',
    SCENARIO = 'SCENARIO',
    FIELD = 'FIELD',
    USE = 'USE',

    // Test Annotations
    SKIP = 'SKIP',
    ONLY = 'ONLY',
    SLOW = 'SLOW',
    FIXME = 'FIXME',
    SERIAL = 'SERIAL',

    // Variable Types
    TEXT = 'TEXT',
    NUMBER = 'NUMBER',
    FLAG = 'FLAG',
    LIST = 'LIST',

    // Hooks
    BEFORE = 'BEFORE',
    AFTER = 'AFTER',
    ALL = 'ALL',
    EACH = 'EACH',

    // Fixtures
    FIXTURE = 'FIXTURE',
    SCOPE = 'SCOPE',
    TEST = 'TEST',
    WORKER = 'WORKER',
    SETUP = 'SETUP',
    TEARDOWN = 'TEARDOWN',
    DEPENDS = 'DEPENDS',
    ON = 'ON',
    AUTO = 'AUTO',
    OPTION = 'OPTION',
    DEFAULT = 'DEFAULT',

    // Actions
    CLICK = 'CLICK',
    FILL = 'FILL',
    OPEN = 'OPEN',
    CHECK = 'CHECK',
    UNCHECK = 'UNCHECK',
    SELECT = 'SELECT',
    HOVER = 'HOVER',
    PRESS = 'PRESS',
    SCROLL = 'SCROLL',
    WAIT = 'WAIT',
    DO = 'DO',
    REFRESH = 'REFRESH',
    CLEAR = 'CLEAR',
    UPLOAD = 'UPLOAD',

    // Extended Actions (Phase 1)
    RIGHT = 'RIGHT',
    DOUBLE = 'DOUBLE',
    FORCE = 'FORCE',
    DRAG = 'DRAG',

    // Assertions
    VERIFY = 'VERIFY',
    URL = 'URL',
    TITLE = 'TITLE',
    EQUAL = 'EQUAL',
    HAS = 'HAS',
    VALUE = 'VALUE',
    ATTRIBUTE = 'ATTRIBUTE',
    COUNT = 'COUNT',
    ELEMENT = 'ELEMENT',
    OF = 'OF',
    CLASS = 'CLASS',

    // Conditions
    IS = 'IS',
    NOT = 'NOT',
    VISIBLE = 'VISIBLE',
    HIDDEN = 'HIDDEN',
    ENABLED = 'ENABLED',
    DISABLED = 'DISABLED',
    CHECKED = 'CHECKED',
    FOCUSED = 'FOCUSED',
    CONTAINS = 'CONTAINS',
    MATCHES = 'MATCHES',
    EMPTY = 'EMPTY',

    // Selectors
    BUTTON = 'BUTTON',
    TEXTBOX = 'TEXTBOX',
    LINK = 'LINK',
    TESTID = 'TESTID',
    ROLE = 'ROLE',
    LABEL = 'LABEL',
    PLACEHOLDER = 'PLACEHOLDER',

    // Control Flow
    IF = 'IF',
    ELSE = 'ELSE',
    REPEAT = 'REPEAT',
    TIMES = 'TIMES',
    FOR = 'FOR',

    // Data Management
    LOAD = 'LOAD',
    WHERE = 'WHERE',
    AS = 'AS',

    // Utilities
    TAKE = 'TAKE',
    SCREENSHOT = 'SCREENSHOT',
    LOG = 'LOG',
    RETURN = 'RETURN',
    RETURNS = 'RETURNS',

    // Connectors
    WITH = 'WITH',
    AND = 'AND',
    FROM = 'FROM',
    TO = 'TO',
    IN = 'IN',
    SECONDS = 'SECONDS',
    MILLISECONDS = 'MILLISECONDS',

    // Values
    TRUE = 'TRUE',
    FALSE = 'FALSE',
    NULL = 'NULL',

    // Literals
    STRING = 'STRING',
    NUMBER_LITERAL = 'NUMBER_LITERAL',
    IDENTIFIER = 'IDENTIFIER',
    ENV_VAR_REF = 'ENV_VAR_REF',  // {{variableName}} - Postman-style env var reference

    // Punctuation
    LBRACE = 'LBRACE',         // {
    RBRACE = 'RBRACE',         // }
    LPAREN = 'LPAREN',         // (
    RPAREN = 'RPAREN',         // )
    LBRACKET = 'LBRACKET',     // [
    RBRACKET = 'RBRACKET',     // ]
    EQUALS_SIGN = 'EQUALS_SIGN', // =
    DOT = 'DOT',               // .
    COMMA = 'COMMA',           // ,
    AT_SIGN = 'AT_SIGN',       // @

    // Special
    COMMENT = 'COMMENT',
    EOF = 'EOF',
    UNKNOWN = 'UNKNOWN'
}

export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column: number;
}

export interface LexerError {
    message: string;
    line: number;
    column: number;
}
