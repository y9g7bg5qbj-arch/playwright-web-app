export enum TokenType {
    // Structural
    PAGE = 'PAGE',
    PAGEACTIONS = 'PAGEACTIONS',
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
    PERFORM = 'PERFORM',
    REFRESH = 'REFRESH',
    CLEAR = 'CLEAR',
    UPLOAD = 'UPLOAD',
    RIGHT = 'RIGHT',
    DOUBLE = 'DOUBLE',
    FORCE = 'FORCE',
    DRAG = 'DRAG',
    SWITCH = 'SWITCH',
    NEW = 'NEW',
    TAB = 'TAB',
    CLOSE = 'CLOSE',

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
    STRICT = 'STRICT',
    BALANCED = 'BALANCED',
    RELAXED = 'RELAXED',
    THRESHOLD = 'THRESHOLD',
    MAX_DIFF_PIXELS = 'MAX_DIFF_PIXELS',
    MAX_DIFF_RATIO = 'MAX_DIFF_RATIO',

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
    CHECKBOX_SEL = 'CHECKBOX_SEL',
    HEADING = 'HEADING',
    COMBOBOX = 'COMBOBOX',
    RADIO = 'RADIO',
    TESTID = 'TESTID',
    ROLE = 'ROLE',
    LABEL = 'LABEL',
    PLACEHOLDER = 'PLACEHOLDER',
    ALT = 'ALT',
    CSS = 'CSS',
    XPATH = 'XPATH',
    NAME = 'NAME',

    // Control Flow
    IF = 'IF',
    ELSE = 'ELSE',
    REPEAT = 'REPEAT',
    TIMES = 'TIMES',
    FOR = 'FOR',

    // Data Query (VDQL)
    LOAD = 'LOAD',
    WHERE = 'WHERE',
    AS = 'AS',
    ROW = 'ROW',
    ROWS = 'ROWS',
    ORDER = 'ORDER',
    BY = 'BY',
    ASC = 'ASC',
    DESC = 'DESC',
    LIMIT = 'LIMIT',
    OFFSET = 'OFFSET',
    FIRST = 'FIRST',
    LAST = 'LAST',
    RANDOM = 'RANDOM',
    DISTINCT = 'DISTINCT',
    OR = 'OR',
    STARTS = 'STARTS',
    ENDS = 'ENDS',

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

    // String Operations
    TRIM = 'TRIM',
    CONVERT = 'CONVERT',
    UPPERCASE = 'UPPERCASE',
    LOWERCASE = 'LOWERCASE',
    EXTRACT = 'EXTRACT',
    REPLACE = 'REPLACE',
    SPLIT = 'SPLIT',
    JOIN = 'JOIN',
    LENGTH = 'LENGTH',
    PAD = 'PAD',
    THEN = 'THEN',

    // Date Operations
    TODAY = 'TODAY',
    NOW = 'NOW',
    ADD = 'ADD',
    SUBTRACT = 'SUBTRACT',
    DAY = 'DAY',
    DAYS_UNIT = 'DAYS_UNIT',
    MONTH = 'MONTH',
    MONTHS_UNIT = 'MONTHS_UNIT',
    YEAR = 'YEAR',
    YEARS_UNIT = 'YEARS_UNIT',
    FORMAT = 'FORMAT',

    // Number Operations
    ROUND = 'ROUND',
    DECIMALS = 'DECIMALS',
    UP = 'UP',
    DOWN = 'DOWN',
    ABSOLUTE = 'ABSOLUTE',
    CURRENCY = 'CURRENCY',
    PERCENT = 'PERCENT',

    // Generate Operations
    GENERATE = 'GENERATE',
    UUID = 'UUID',

    // Boolean Values
    TRUE = 'TRUE',
    FALSE = 'FALSE',
    NULL = 'NULL',

    // Literals
    STRING = 'STRING',
    NUMBER_LITERAL = 'NUMBER_LITERAL',
    IDENTIFIER = 'IDENTIFIER',
    ENV_VAR_REF = 'ENV_VAR_REF',

    // Punctuation
    LBRACE = 'LBRACE',
    RBRACE = 'RBRACE',
    LPAREN = 'LPAREN',
    RPAREN = 'RPAREN',
    LBRACKET = 'LBRACKET',
    RBRACKET = 'RBRACKET',
    EQUALS_SIGN = 'EQUALS_SIGN',
    DOT = 'DOT',
    COMMA = 'COMMA',
    AT_SIGN = 'AT_SIGN',

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
