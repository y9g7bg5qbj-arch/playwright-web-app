import { Token, TokenType, LexerError } from './tokens.js';

const KEYWORDS: Record<string, TokenType> = {
    // Structural
    'PAGE': TokenType.PAGE,
    'PAGEACTIONS': TokenType.PAGEACTIONS,
    'FEATURE': TokenType.FEATURE,
    'SCENARIO': TokenType.SCENARIO,
    'FIELD': TokenType.FIELD,
    'USE': TokenType.USE,

    // Test Annotations
    'SKIP': TokenType.SKIP,
    'ONLY': TokenType.ONLY,
    'SLOW': TokenType.SLOW,
    'FIXME': TokenType.FIXME,
    'SERIAL': TokenType.SERIAL,

    // Variable Types
    'TEXT': TokenType.TEXT,
    'NUMBER': TokenType.NUMBER,
    'FLAG': TokenType.FLAG,
    'LIST': TokenType.LIST,

    // Hooks
    'BEFORE': TokenType.BEFORE,
    'AFTER': TokenType.AFTER,
    'ALL': TokenType.ALL,
    'EACH': TokenType.EACH,

    // Fixtures
    'FIXTURE': TokenType.FIXTURE,
    'SCOPE': TokenType.SCOPE,
    'TEST': TokenType.TEST,
    'WORKER': TokenType.WORKER,
    'SETUP': TokenType.SETUP,
    'TEARDOWN': TokenType.TEARDOWN,
    'DEPENDS': TokenType.DEPENDS,
    'ON': TokenType.ON,
    'AUTO': TokenType.AUTO,
    'OPTION': TokenType.OPTION,
    'DEFAULT': TokenType.DEFAULT,

    // Actions
    'CLICK': TokenType.CLICK,
    'FILL': TokenType.FILL,
    'OPEN': TokenType.OPEN,
    'CHECK': TokenType.CHECK,
    'UNCHECK': TokenType.UNCHECK,
    'SELECT': TokenType.SELECT,
    'HOVER': TokenType.HOVER,
    'PRESS': TokenType.PRESS,
    'SCROLL': TokenType.SCROLL,
    'WAIT': TokenType.WAIT,
    'VERIFY': TokenType.VERIFY,
    'UPLOAD': TokenType.UPLOAD,
    'PERFORM': TokenType.PERFORM,
    'RIGHT': TokenType.RIGHT,
    'DOUBLE': TokenType.DOUBLE,
    'FORCE': TokenType.FORCE,
    'DRAG': TokenType.DRAG,
    'REFRESH': TokenType.REFRESH,
    'CLEAR': TokenType.CLEAR,
    'SWITCH': TokenType.SWITCH,
    'NEW': TokenType.NEW,
    'TAB': TokenType.TAB,
    'CLOSE': TokenType.CLOSE,
    'ACCEPT': TokenType.ACCEPT,
    'DISMISS': TokenType.DISMISS,
    'DIALOG': TokenType.DIALOG,
    'FRAME': TokenType.FRAME,
    'MAIN': TokenType.MAIN,
    'DOWNLOAD': TokenType.DOWNLOAD,
    'COOKIE': TokenType.COOKIE,
    'COOKIES': TokenType.COOKIES,
    'STORAGE': TokenType.STORAGE,
    'GET': TokenType.GET,
    'INTO': TokenType.INTO,
    'SET': TokenType.SET,
    'NAVIGATION': TokenType.NAVIGATION,
    'NETWORK': TokenType.NETWORK,
    'IDLE': TokenType.IDLE,

    // Assertions
    'URL': TokenType.URL,
    'TITLE': TokenType.TITLE,
    'EQUAL': TokenType.EQUAL,
    'EQUALS': TokenType.EQUAL,
    'HAS': TokenType.HAS,
    'VALUE': TokenType.VALUE,
    'ATTRIBUTE': TokenType.ATTRIBUTE,
    'COUNT': TokenType.COUNT,
    'ELEMENT': TokenType.ELEMENT,
    'OF': TokenType.OF,
    'CLASS': TokenType.CLASS,
    'STRICT': TokenType.STRICT,
    'BALANCED': TokenType.BALANCED,
    'RELAXED': TokenType.RELAXED,
    'THRESHOLD': TokenType.THRESHOLD,
    'MAX_DIFF_PIXELS': TokenType.MAX_DIFF_PIXELS,
    'MAX_DIFF_RATIO': TokenType.MAX_DIFF_RATIO,
    'MATCHES': TokenType.MATCHES,

    // Conditions
    'IS': TokenType.IS,
    'NOT': TokenType.NOT,
    'VISIBLE': TokenType.VISIBLE,
    'HIDDEN': TokenType.HIDDEN,
    'ENABLED': TokenType.ENABLED,
    'DISABLED': TokenType.DISABLED,
    'CHECKED': TokenType.CHECKED,
    'FOCUSED': TokenType.FOCUSED,
    'CONTAINS': TokenType.CONTAINS,
    'EMPTY': TokenType.EMPTY,

    // Selectors — handled contextually in parseSelector(), not as global keywords.
    // This prevents conflicts with field names like: FIELD button = "Submit"

    // Connectors
    'WITH': TokenType.WITH,
    'AND': TokenType.AND,
    'FROM': TokenType.FROM,
    'TO': TokenType.TO,
    'IN': TokenType.IN,
    'RETURNS': TokenType.RETURNS,
    'RETURN': TokenType.RETURN,

    // Boolean Values
    'TRUE': TokenType.TRUE,
    'FALSE': TokenType.FALSE,
    'NULL': TokenType.NULL,

    // Control Flow
    'IF': TokenType.IF,
    'ELSE': TokenType.ELSE,
    'REPEAT': TokenType.REPEAT,
    'TIMES': TokenType.TIMES,
    'FOR': TokenType.FOR,

    // Data Query (VDQL)
    'LOAD': TokenType.LOAD,
    'WHERE': TokenType.WHERE,
    'AS': TokenType.AS,
    'ROW': TokenType.ROW,
    'ROWS': TokenType.ROWS,
    'ORDER': TokenType.ORDER,
    'BY': TokenType.BY,
    'ASC': TokenType.ASC,
    'DESC': TokenType.DESC,
    'LIMIT': TokenType.LIMIT,
    'OFFSET': TokenType.OFFSET,
    'FIRST': TokenType.FIRST,
    'LAST': TokenType.LAST,
    'RANDOM': TokenType.RANDOM,
    'DISTINCT': TokenType.DISTINCT,
    'OR': TokenType.OR,
    'STARTS': TokenType.STARTS,
    'ENDS': TokenType.ENDS,

    // Utilities
    'TAKE': TokenType.TAKE,
    'SCREENSHOT': TokenType.SCREENSHOT,
    'LOG': TokenType.LOG,
    'SECONDS': TokenType.SECONDS,
    'MILLISECONDS': TokenType.MILLISECONDS,

    // String Operations
    'TRIM': TokenType.TRIM,
    'CONVERT': TokenType.CONVERT,
    'UPPERCASE': TokenType.UPPERCASE,
    'LOWERCASE': TokenType.LOWERCASE,
    'EXTRACT': TokenType.EXTRACT,
    'REPLACE': TokenType.REPLACE,
    'SPLIT': TokenType.SPLIT,
    'JOIN': TokenType.JOIN,
    'LENGTH': TokenType.LENGTH,
    'PAD': TokenType.PAD,
    'THEN': TokenType.THEN,

    // Date Operations
    'TODAY': TokenType.TODAY,
    'NOW': TokenType.NOW,
    'ADD': TokenType.ADD,
    'SUBTRACT': TokenType.SUBTRACT,
    'DAY': TokenType.DAY,
    'DAYS': TokenType.DAYS_UNIT,
    'MONTH': TokenType.MONTH,
    'MONTHS': TokenType.MONTHS_UNIT,
    'YEAR': TokenType.YEAR,
    'YEARS': TokenType.YEARS_UNIT,
    'FORMAT': TokenType.FORMAT,

    // Number Operations
    'ROUND': TokenType.ROUND,
    'DECIMALS': TokenType.DECIMALS,
    'UP': TokenType.UP,
    'DOWN': TokenType.DOWN,
    'ABSOLUTE': TokenType.ABSOLUTE,
    'CURRENCY': TokenType.CURRENCY,
    'PERCENT': TokenType.PERCENT,

    // Generate Operations
    'GENERATE': TokenType.GENERATE,
    'UUID': TokenType.UUID,
};

const SINGLE_CHAR_TOKENS: Record<string, TokenType> = {
    '{': TokenType.LBRACE,
    '}': TokenType.RBRACE,
    '(': TokenType.LPAREN,
    ')': TokenType.RPAREN,
    '[': TokenType.LBRACKET,
    ']': TokenType.RBRACKET,
    '=': TokenType.EQUALS_SIGN,
    '.': TokenType.DOT,
    ',': TokenType.COMMA,
    '@': TokenType.AT_SIGN,
};

export class Lexer {
    private source: string;
    private tokens: Token[] = [];
    private errors: LexerError[] = [];
    private pos = 0;
    private line = 1;
    private column = 1;

    constructor(source: string) {
        this.source = source;
    }

    tokenize(): { tokens: Token[]; errors: LexerError[] } {
        while (!this.isAtEnd()) {
            this.skipWhitespace();
            if (!this.isAtEnd()) {
                this.scanToken();
            }
        }

        this.tokens.push({
            type: TokenType.EOF,
            value: '',
            line: this.line,
            column: this.column
        });

        return { tokens: this.tokens, errors: this.errors };
    }

    private isAtEnd(): boolean {
        return this.pos >= this.source.length;
    }

    private peek(): string {
        return this.source[this.pos] || '\0';
    }

    private advance(): string {
        const char = this.source[this.pos];
        this.pos++;
        if (char === '\n') {
            this.line++;
            this.column = 1;
        } else {
            this.column++;
        }
        return char;
    }

    private skipWhitespace(): void {
        while (!this.isAtEnd()) {
            const char = this.peek();
            if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
                this.advance();
            } else if (char === '#') {
                this.skipComment();
            } else if (char === '/' && this.source[this.pos + 1] === '/') {
                this.skipSlashComment();
            } else {
                break;
            }
        }
    }

    private skipComment(): void {
        const startLine = this.line;
        const startColumn = this.column;
        let comment = '';

        this.advance();
        while (!this.isAtEnd() && this.peek() !== '\n') {
            comment += this.advance();
        }

        this.tokens.push({
            type: TokenType.COMMENT,
            value: comment.trim(),
            line: startLine,
            column: startColumn
        });
    }

    private skipSlashComment(): void {
        const startLine = this.line;
        const startColumn = this.column;
        let comment = '';

        this.advance(); // skip first /
        this.advance(); // skip second /
        while (!this.isAtEnd() && this.peek() !== '\n') {
            comment += this.advance();
        }

        this.tokens.push({
            type: TokenType.COMMENT,
            value: comment.trim(),
            line: startLine,
            column: startColumn
        });
    }

    private scanToken(): void {
        const char = this.peek();
        const startLine = this.line;
        const startColumn = this.column;

        if (char === '{' && this.source[this.pos + 1] === '{') {
            this.scanEnvVarReference();
            return;
        }

        if (SINGLE_CHAR_TOKENS[char]) {
            this.advance();
            this.addToken(SINGLE_CHAR_TOKENS[char], char, startLine, startColumn);
            return;
        }

        if (char === '"' || char === "'") {
            this.scanString(char);
            return;
        }

        if (this.isDigit(char) || (char === '-' && this.isDigit(this.source[this.pos + 1]))) {
            this.scanNumber();
            return;
        }

        if (this.isAlpha(char)) {
            this.scanIdentifier();
            return;
        }

        this.advance();
        this.errors.push({
            message: `Unexpected character: '${char}'`,
            line: startLine,
            column: startColumn
        });
    }

    private scanString(quote: string): void {
        const startLine = this.line;
        const startColumn = this.column;
        let value = '';

        this.advance();

        while (!this.isAtEnd() && this.peek() !== quote) {
            if (this.peek() === '\\') {
                this.advance();
                const escaped = this.advance();
                switch (escaped) {
                    case 'n': value += '\n'; break;
                    case 't': value += '\t'; break;
                    case '\\': value += '\\'; break;
                    case '"': value += '"'; break;
                    case "'": value += "'"; break;
                    default: value += escaped;
                }
            } else if (this.peek() === '\n') {
                this.errors.push({
                    message: 'Unterminated string',
                    line: this.line,
                    column: this.column
                });
                break;
            } else {
                value += this.advance();
            }
        }

        if (!this.isAtEnd()) {
            this.advance();
        }

        this.addToken(TokenType.STRING, value, startLine, startColumn);
    }

    private scanNumber(): void {
        const startLine = this.line;
        const startColumn = this.column;
        let value = '';

        if (this.peek() === '-') {
            value += this.advance();
        }

        while (this.isDigit(this.peek())) {
            value += this.advance();
        }

        if (this.peek() === '.' && this.isDigit(this.source[this.pos + 1])) {
            value += this.advance();
            while (this.isDigit(this.peek())) {
                value += this.advance();
            }
        }

        this.addToken(TokenType.NUMBER_LITERAL, value, startLine, startColumn);
    }

    private scanIdentifier(): void {
        const startLine = this.line;
        const startColumn = this.column;
        let value = '';

        while (this.isAlphaNumeric(this.peek())) {
            value += this.advance();
        }

        const upperValue = value.toUpperCase();
        const tokenType = KEYWORDS[upperValue] || TokenType.IDENTIFIER;

        this.addToken(tokenType, value, startLine, startColumn);
    }

    private scanEnvVarReference(): void {
        const startLine = this.line;
        const startColumn = this.column;

        this.advance();
        this.advance();

        let varName = '';

        while (!this.isAtEnd()) {
            if (this.peek() === '}' && this.source[this.pos + 1] === '}') {
                break;
            }
            if (this.peek() === '\n') {
                this.errors.push({
                    message: 'Unterminated environment variable reference',
                    line: startLine,
                    column: startColumn
                });
                return;
            }
            varName += this.advance();
        }

        if (this.isAtEnd()) {
            this.errors.push({
                message: 'Unterminated environment variable reference - expected }}',
                line: startLine,
                column: startColumn
            });
            return;
        }

        this.advance();
        this.advance();

        const trimmedName = varName.trim();
        if (!trimmedName) {
            this.errors.push({
                message: 'Empty environment variable reference',
                line: startLine,
                column: startColumn
            });
            return;
        }

        this.addToken(TokenType.ENV_VAR_REF, trimmedName, startLine, startColumn);
    }

    private isDigit(char: string): boolean {
        return char >= '0' && char <= '9';
    }

    private isAlpha(char: string): boolean {
        return (char >= 'a' && char <= 'z') ||
            (char >= 'A' && char <= 'Z') ||
            char === '_';
    }

    private isAlphaNumeric(char: string): boolean {
        return this.isAlpha(char) || this.isDigit(char);
    }

    private addToken(type: TokenType, value: string, line: number, column: number): void {
        this.tokens.push({ type, value, line, column });
    }
}

export function tokenize(source: string): { tokens: Token[]; errors: LexerError[] } {
    const lexer = new Lexer(source);
    return lexer.tokenize();
}
