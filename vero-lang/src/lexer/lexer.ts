import { Token, TokenType, LexerError } from './tokens.js';

// Map of keywords to their token types
const KEYWORDS: Record<string, TokenType> = {
    'PAGE': TokenType.PAGE,
    'FEATURE': TokenType.FEATURE,
    'SCENARIO': TokenType.SCENARIO,
    'FIELD': TokenType.FIELD,
    'USE': TokenType.USE,
    'TEXT': TokenType.TEXT,
    'NUMBER': TokenType.NUMBER,
    'FLAG': TokenType.FLAG,
    'BEFORE': TokenType.BEFORE,
    'AFTER': TokenType.AFTER,
    'ALL': TokenType.ALL,
    'EACH': TokenType.EACH,
    'CLICK': TokenType.CLICK,
    'FILL': TokenType.FILL,
    'OPEN': TokenType.OPEN,
    'CHECK': TokenType.CHECK,
    'UNCHECK': TokenType.UNCHECK,
    'SELECT': TokenType.SELECT,
    'HOVER': TokenType.HOVER,
    'PRESS': TokenType.PRESS,
    'WAIT': TokenType.WAIT,
    'VERIFY': TokenType.VERIFY,
    'DO': TokenType.DO,
    'IS': TokenType.IS,
    'NOT': TokenType.NOT,
    'VISIBLE': TokenType.VISIBLE,
    'HIDDEN': TokenType.HIDDEN,
    'ENABLED': TokenType.ENABLED,
    'DISABLED': TokenType.DISABLED,
    'CHECKED': TokenType.CHECKED,
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
