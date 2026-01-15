import { Token, TokenType, LexerError } from './tokens.js';

// Map of keywords to their token types
const KEYWORDS: Record<string, TokenType> = {
    'PAGE': TokenType.PAGE,
    'FEATURE': TokenType.FEATURE,
    'SCENARIO': TokenType.SCENARIO,
    'FIELD': TokenType.FIELD,
    'USE': TokenType.USE,
    // Test annotations
    'SKIP': TokenType.SKIP,
    'ONLY': TokenType.ONLY,
    'SLOW': TokenType.SLOW,
    'FIXME': TokenType.FIXME,
    'SERIAL': TokenType.SERIAL,
    'TEXT': TokenType.TEXT,
    'NUMBER': TokenType.NUMBER,
    'FLAG': TokenType.FLAG,
    'LIST': TokenType.LIST,
    'BEFORE': TokenType.BEFORE,
    'AFTER': TokenType.AFTER,
    'ALL': TokenType.ALL,
    'EACH': TokenType.EACH,
    // Fixture keywords
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
    'DO': TokenType.DO,
    // Extended Actions (Phase 1)
    'RIGHT': TokenType.RIGHT,
    'DOUBLE': TokenType.DOUBLE,
    'FORCE': TokenType.FORCE,
    'DRAG': TokenType.DRAG,
    // Assertion keywords
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
    'MATCHES': TokenType.MATCHES,
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
    'BUTTON': TokenType.BUTTON,
    'TEXTBOX': TokenType.TEXTBOX,
    'LINK': TokenType.LINK,
    'TESTID': TokenType.TESTID,
    'ROLE': TokenType.ROLE,
    'LABEL': TokenType.LABEL,
    'PLACEHOLDER': TokenType.PLACEHOLDER,
    'WITH': TokenType.WITH,
    'AND': TokenType.AND,
    'FROM': TokenType.FROM,
    'TO': TokenType.TO,
    'IN': TokenType.IN,
    'RETURNS': TokenType.RETURNS,
    'RETURN': TokenType.RETURN,
    'TRUE': TokenType.TRUE,
    'FALSE': TokenType.FALSE,
    'NULL': TokenType.NULL,
    'IF': TokenType.IF,
    'ELSE': TokenType.ELSE,
    'REPEAT': TokenType.REPEAT,
    'TIMES': TokenType.TIMES,
    'FOR': TokenType.FOR,
    'LOAD': TokenType.LOAD,
    'WHERE': TokenType.WHERE,
    'AS': TokenType.AS,
    'REFRESH': TokenType.REFRESH,
    'TAKE': TokenType.TAKE,
    'SCREENSHOT': TokenType.SCREENSHOT,
    'LOG': TokenType.LOG,
    'CLEAR': TokenType.CLEAR,
    'SECONDS': TokenType.SECONDS,
    'MILLISECONDS': TokenType.MILLISECONDS,
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

        // Add EOF token
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
                // Skip comments
                this.skipComment();
            } else {
                break;
            }
        }
    }

    private skipComment(): void {
        const startLine = this.line;
        const startColumn = this.column;
        let comment = '';

        this.advance(); // skip #
        while (!this.isAtEnd() && this.peek() !== '\n') {
            comment += this.advance();
        }

        // Optionally store comment as token
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

        // Check for environment variable reference {{varName}}
        if (char === '{' && this.source[this.pos + 1] === '{') {
            this.scanEnvVarReference();
            return;
        }

        // Single character tokens
        const singleCharTokens: Record<string, TokenType> = {
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

        if (singleCharTokens[char]) {
            this.advance();
            this.addToken(singleCharTokens[char], char, startLine, startColumn);
            return;
        }

        // Strings
        if (char === '"' || char === "'") {
            this.scanString(char);
            return;
        }

        // Numbers
        if (this.isDigit(char) || (char === '-' && this.isDigit(this.source[this.pos + 1]))) {
            this.scanNumber();
            return;
        }

        // Identifiers and keywords
        if (this.isAlpha(char)) {
            this.scanIdentifier();
            return;
        }

        // Unknown character
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

        this.advance(); // skip opening quote

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
            this.advance(); // skip closing quote
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

        // Handle decimals
        if (this.peek() === '.' && this.isDigit(this.source[this.pos + 1])) {
            value += this.advance(); // .
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

        // Check if it's a keyword (case-insensitive)
        const upperValue = value.toUpperCase();
        const tokenType = KEYWORDS[upperValue] || TokenType.IDENTIFIER;

        this.addToken(tokenType, value, startLine, startColumn);
    }

    /**
     * Scan environment variable reference: {{variableName}}
     * Postman-style syntax for referencing environment variables
     */
    private scanEnvVarReference(): void {
        const startLine = this.line;
        const startColumn = this.column;

        this.advance(); // skip first {
        this.advance(); // skip second {

        let varName = '';

        // Scan until we find }} or reach end
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

        this.advance(); // skip first }
        this.advance(); // skip second }

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
