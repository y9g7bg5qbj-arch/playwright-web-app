/**
 * Vero Error Listener
 * 
 * Custom ANTLR error listener that translates technical parse errors
 * into friendly, actionable error messages with suggestions.
 */

import {
    VeroError,
    VeroErrorCode,
    findSimilar,
    VERO_KEYWORDS
} from './VeroErrors.js';

export class VeroErrorListener {
    public errors: VeroError[] = [];
    private file?: string;

    constructor(file?: string) {
        this.file = file;
    }

    /**
     * Called by ANTLR when a syntax error is detected
     */
    syntaxError(
        recognizer: any,
        offendingSymbol: any,
        line: number,
        column: number,
        msg: string,
        e: any
    ): void {
        const offendingText = offendingSymbol?.text || '';
        const friendlyMsg = this.translateMessage(msg, offendingText);
        const suggestions = this.getSuggestions(offendingText);
        const code = this.categorizeError(msg, offendingText);

        this.errors.push({
            code,
            message: friendlyMsg,
            line,
            column,
            endColumn: column + (offendingText?.length || 1),
            severity: 'error',
            suggestions,
            offendingText,
            file: this.file,
        });
    }

    // Required by ANTLR but not used
    reportAmbiguity(): void { }
    reportAttemptingFullContext(): void { }
    reportContextSensitivity(): void { }

    /**
     * Translate ANTLR error messages to friendly, actionable messages
     */
    private translateMessage(msg: string, offendingText: string): string {
        const msgLower = msg.toLowerCase();

        // Missing closing brace
        if (msgLower.includes("missing '}'") ||
            (msgLower.includes('eof') && msgLower.includes('expecting'))) {
            return "Missing closing brace '}'. Check that all blocks are properly closed.";
        }

        // Missing opening brace
        if (msgLower.includes("missing '{'")) {
            return "Missing opening brace '{'. Expected block start.";
        }

        // Missing 'with' keyword
        if (msgLower.includes("'with'")) {
            return `Missing 'with' keyword. FILL requires: fill <selector> WITH <value>`;
        }

        // Missing 'from' keyword
        if (msgLower.includes("'from'")) {
            return `Missing 'from' keyword. SELECT requires: select <option> FROM <dropdown>`;
        }

        // Missing 'times' keyword
        if (msgLower.includes("'times'")) {
            return `Missing 'times' keyword. REPEAT requires: repeat <N> TIMES { ... }`;
        }

        // No viable alternative (usually unknown keyword)
        if (msgLower.includes('no viable alternative')) {
            const suggestions = findSimilar(offendingText, [...VERO_KEYWORDS]);
            if (suggestions.length > 0) {
                return `Unknown keyword '${offendingText}'. Did you mean '${suggestions[0]}'?`;
            }
            return `Unknown or unexpected token '${offendingText}'.`;
        }

        // Extraneous input
        if (msgLower.includes('extraneous input')) {
            return `Unexpected token '${offendingText}'. This token doesn't belong here.`;
        }

        // Mismatched input
        if (msgLower.includes('mismatched input')) {
            const match = msg.match(/expecting (.+)/);
            if (match) {
                return `Unexpected '${offendingText}'. Expected: ${match[1]}`;
            }
            return `Unexpected '${offendingText}'.`;
        }

        // Token recognition error (lexer level)
        if (msgLower.includes('token recognition error')) {
            return `Invalid character '${offendingText}'. This character is not allowed in Vero.`;
        }

        // Missing required token
        const missingMatch = msg.match(/missing (.+) at/);
        if (missingMatch) {
            return `Expected ${missingMatch[1]} but found '${offendingText}'.`;
        }

        // Default: use original message but clean it up
        return msg.replace(/'/g, "'").replace(/</g, '<').replace(/>/g, '>');
    }

    /**
     * Categorize error into VeroErrorCode
     */
    private categorizeError(msg: string, offendingText: string): VeroErrorCode {
        const msgLower = msg.toLowerCase();

        if (msgLower.includes("'}'") || msgLower.includes("'{'")) {
            return VeroErrorCode.MISSING_BRACE;
        }

        if (msgLower.includes("'with'")) {
            return VeroErrorCode.MISSING_WITH;
        }

        if (msgLower.includes("'from'")) {
            return VeroErrorCode.MISSING_FROM;
        }

        if (msgLower.includes("'times'")) {
            return VeroErrorCode.MISSING_TIMES;
        }

        if (msgLower.includes('no viable alternative')) {
            // Check if it looks like a typo of a known keyword
            const similar = findSimilar(offendingText, [...VERO_KEYWORDS], 2);
            if (similar.length > 0) {
                return VeroErrorCode.UNKNOWN_KEYWORD;
            }
            return VeroErrorCode.UNEXPECTED_TOKEN;
        }

        if (msgLower.includes('token recognition error')) {
            return VeroErrorCode.INVALID_TOKEN;
        }

        if (msgLower.includes('extraneous') || msgLower.includes('mismatched')) {
            return VeroErrorCode.UNEXPECTED_TOKEN;
        }

        if (msgLower.includes('eof')) {
            return VeroErrorCode.INCOMPLETE_STATEMENT;
        }

        return VeroErrorCode.UNEXPECTED_TOKEN;
    }

    /**
     * Generate "Did you mean?" suggestions for the offending token
     */
    private getSuggestions(offendingText: string): string[] | undefined {
        if (!offendingText || offendingText === '<EOF>') {
            return undefined;
        }

        const similar = findSimilar(offendingText, [...VERO_KEYWORDS], 3);
        return similar.length > 0 ? similar : undefined;
    }

    /**
     * Clear all errors
     */
    clear(): void {
        this.errors = [];
    }

    /**
     * Check if there are any errors
     */
    hasErrors(): boolean {
        return this.errors.length > 0;
    }

    /**
     * Format errors as human-readable string
     */
    format(): string {
        return this.errors.map(e => {
            const location = `Line ${e.line}:${e.column}`;
            const suggestion = e.suggestions?.length
                ? ` (Did you mean: ${e.suggestions.slice(0, 2).join(' or ')}?)`
                : '';
            return `[ERROR] ${location} - ${e.message}${suggestion}`;
        }).join('\n');
    }
}
