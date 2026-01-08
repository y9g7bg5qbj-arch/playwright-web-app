/**
 * LexerError - Errors during tokenization
 *
 * These errors occur when the lexer encounters characters or sequences
 * it cannot recognize as valid tokens.
 */

import { VeroError, VeroErrorData, ErrorLocation } from '../VeroError.js';

export class LexerError extends VeroError {
    constructor(data: Omit<VeroErrorData, 'category'>) {
        super({ ...data, category: 'lexer' });
        this.name = 'LexerError';
    }

    /**
     * Unexpected character in source code
     */
    static unexpectedCharacter(
        char: string,
        location: ErrorLocation,
        context?: string
    ): LexerError {
        return new LexerError({
            code: 'VERO-101',
            severity: 'error',
            location,
            title: 'Unexpected Character',
            whatWentWrong: `Found an unexpected character "${char}" that is not allowed in Vero scripts.`,
            howToFix: context
                ? `Remove or replace the character "${char}". ${context}`
                : `Remove or replace the character "${char}". Vero scripts use standard letters, numbers, and punctuation like quotes and braces.`,
            flakiness: 'permanent',
            retryable: false,
            suggestions: [
                { text: `Remove the character "${char}"`, action: 'fix' },
                { text: 'Check for copy-paste errors from other sources', action: 'investigate' },
            ],
        });
    }

    /**
     * String literal not closed
     */
    static unterminatedString(
        startLine: number,
        startColumn: number,
        partialString?: string
    ): LexerError {
        const preview = partialString
            ? partialString.length > 20
                ? `"${partialString.substring(0, 20)}...`
                : `"${partialString}...`
            : '"...';

        return new LexerError({
            code: 'VERO-102',
            severity: 'error',
            location: { line: startLine, column: startColumn },
            title: 'Unterminated String',
            whatWentWrong: `A string starting with ${preview} was never closed with a matching quote.`,
            howToFix: 'Add a closing quote " at the end of your string. Make sure quotes are balanced.',
            flakiness: 'permanent',
            retryable: false,
            suggestions: [
                { text: 'Add a closing " at the end of the string', action: 'fix' },
                { text: 'Check if you accidentally deleted the closing quote', action: 'investigate' },
            ],
        });
    }

    /**
     * Invalid number format
     */
    static invalidNumber(
        value: string,
        location: ErrorLocation
    ): LexerError {
        return new LexerError({
            code: 'VERO-103',
            severity: 'error',
            location,
            title: 'Invalid Number',
            whatWentWrong: `"${value}" is not a valid number format.`,
            howToFix: 'Numbers should be written as whole numbers (like 42) or decimals (like 3.14). Do not include commas or currency symbols.',
            flakiness: 'permanent',
            retryable: false,
            suggestions: [
                { text: 'Use digits only (0-9) and optionally one decimal point', action: 'fix' },
                { text: 'Remove any commas, spaces, or currency symbols', action: 'fix' },
            ],
        });
    }

    /**
     * Unrecognized token
     */
    static unknownToken(
        value: string,
        location: ErrorLocation
    ): LexerError {
        // Check for common misspellings
        const suggestions: Array<{ text: string; action: 'fix' | 'investigate' }> = [];
        const lowered = value.toLowerCase();

        const keywords: Record<string, string> = {
            'clik': 'click',
            'clck': 'click',
            'fil': 'fill',
            'fll': 'fill',
            'verifiy': 'verify',
            'verfy': 'verify',
            'opn': 'open',
            'pge': 'page',
            'feture': 'feature',
            'scnario': 'scenario',
            'scenaro': 'scenario',
        };

        if (keywords[lowered]) {
            suggestions.push({
                text: `Did you mean "${keywords[lowered]}"?`,
                action: 'fix',
            });
        }

        suggestions.push({ text: 'Check the spelling of keywords', action: 'fix' });

        return new LexerError({
            code: 'VERO-104',
            severity: 'error',
            location,
            title: 'Unknown Token',
            whatWentWrong: `Could not recognize "${value}".`,
            howToFix: keywords[lowered]
                ? `This might be a misspelling. Did you mean "${keywords[lowered]}"?`
                : 'Check that you are using valid Vero keywords like PAGE, FEATURE, SCENARIO, CLICK, FILL, VERIFY, etc.',
            flakiness: 'permanent',
            retryable: false,
            suggestions,
        });
    }

    /**
     * Convert from legacy LexerError format
     */
    static fromLegacy(legacy: { message: string; line: number; column: number }): LexerError {
        const msg = legacy.message.toLowerCase();

        // Try to categorize based on message content
        if (msg.includes('unterminated') || msg.includes('string')) {
            return LexerError.unterminatedString(legacy.line, legacy.column);
        }

        if (msg.includes('number') || msg.includes('invalid')) {
            return LexerError.invalidNumber(
                legacy.message,
                { line: legacy.line, column: legacy.column }
            );
        }

        if (msg.includes('unexpected')) {
            const charMatch = legacy.message.match(/['"](.)['"]/);
            const char = charMatch ? charMatch[1] : '?';
            return LexerError.unexpectedCharacter(
                char,
                { line: legacy.line, column: legacy.column }
            );
        }

        // Default: unknown token
        return LexerError.unknownToken(
            legacy.message,
            { line: legacy.line, column: legacy.column }
        );
    }
}
