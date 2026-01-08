/**
 * ParserError - Errors during syntax parsing
 *
 * These errors occur when the parser encounters a sequence of tokens
 * that doesn't match the expected grammar structure.
 */

import { VeroError, VeroErrorData, ErrorLocation } from '../VeroError.js';

export class ParserError extends VeroError {
    constructor(data: Omit<VeroErrorData, 'category'>) {
        super({ ...data, category: 'parser' });
        this.name = 'ParserError';
    }

    /**
     * Expected a specific keyword
     */
    static missingKeyword(
        expected: string,
        found: string,
        location: ErrorLocation
    ): ParserError {
        return new ParserError({
            code: 'VERO-201',
            severity: 'error',
            location,
            title: 'Missing Keyword',
            whatWentWrong: `Expected "${expected}" but found "${found}" instead.`,
            howToFix: `Add the keyword "${expected}" at this position. Check the Vero syntax guide for proper statement structure.`,
            flakiness: 'permanent',
            retryable: false,
            suggestions: [
                { text: `Add "${expected}" here`, action: 'fix' },
                { text: 'Check the statement syntax in the documentation', action: 'investigate' },
            ],
        });
    }

    /**
     * Missing opening or closing brace
     */
    static missingBrace(
        braceType: '{' | '}',
        context: string,
        location: ErrorLocation
    ): ParserError {
        const isOpening = braceType === '{';

        return new ParserError({
            code: 'VERO-202',
            severity: 'error',
            location,
            title: isOpening ? 'Missing Opening Brace' : 'Missing Closing Brace',
            whatWentWrong: isOpening
                ? `Expected an opening brace { after "${context}".`
                : `Expected a closing brace } to end the "${context}" block.`,
            howToFix: isOpening
                ? `Add { after "${context}" to start the block. Example: ${context} { ... }`
                : `Add } to close the "${context}" block. Make sure every { has a matching }.`,
            flakiness: 'permanent',
            retryable: false,
            suggestions: [
                { text: `Add ${braceType} to ${isOpening ? 'start' : 'close'} the block`, action: 'fix' },
                { text: 'Check that all braces are properly matched', action: 'investigate' },
            ],
        });
    }

    /**
     * Invalid or unrecognized statement
     */
    static invalidStatement(
        found: string,
        location: ErrorLocation,
        nearContext?: string
    ): ParserError {
        const contextHint = nearContext ? ` near "${nearContext}"` : '';

        return new ParserError({
            code: 'VERO-203',
            severity: 'error',
            location,
            title: 'Invalid Statement',
            whatWentWrong: `"${found}"${contextHint} is not a valid Vero statement.`,
            howToFix: `Valid statements include:
- Actions: CLICK, FILL, HOVER, PRESS, CHECK, SCROLL
- Navigation: OPEN, REFRESH
- Assertions: VERIFY ... IS VISIBLE/HIDDEN/ENABLED
- Data: LOAD, FOR EACH
- Control: IF/ELSE, REPEAT`,
            flakiness: 'permanent',
            retryable: false,
            suggestions: [
                { text: 'Check the spelling of the command', action: 'fix' },
                { text: 'See the Vero reference guide for valid statements', action: 'investigate' },
            ],
        });
    }

    /**
     * Expected a string value
     */
    static missingString(
        context: string,
        location: ErrorLocation
    ): ParserError {
        return new ParserError({
            code: 'VERO-204',
            severity: 'error',
            location,
            title: 'Missing String',
            whatWentWrong: `Expected a quoted string value for "${context}".`,
            howToFix: `Add a string in double quotes. Example: ${context} "your value here"`,
            flakiness: 'permanent',
            retryable: false,
            suggestions: [
                { text: 'Wrap the value in double quotes "..."', action: 'fix' },
            ],
        });
    }

    /**
     * Expected a name/identifier
     */
    static missingName(
        context: string,
        location: ErrorLocation,
        example?: string
    ): ParserError {
        const exampleHint = example ? ` Example: ${example}` : '';

        return new ParserError({
            code: 'VERO-205',
            severity: 'error',
            location,
            title: 'Missing Name',
            whatWentWrong: `Expected a name after "${context}".`,
            howToFix: `Add a name (letters and numbers, no spaces).${exampleHint}`,
            flakiness: 'permanent',
            retryable: false,
            suggestions: [
                { text: 'Add a name using letters and numbers only', action: 'fix' },
                { text: 'Names cannot contain spaces - use camelCase or PascalCase', action: 'fix' },
            ],
        });
    }

    /**
     * Unexpected token at this position
     */
    static unexpectedToken(
        token: string,
        expected?: string,
        location?: ErrorLocation
    ): ParserError {
        const expectedHint = expected ? ` Expected: ${expected}` : '';

        return new ParserError({
            code: 'VERO-206',
            severity: 'error',
            location,
            title: 'Unexpected Token',
            whatWentWrong: `Found "${token}" which is not expected here.${expectedHint}`,
            howToFix: expected
                ? `Replace "${token}" with ${expected}, or remove it if it's not needed.`
                : `Remove "${token}" or check if something is missing before it.`,
            flakiness: 'permanent',
            retryable: false,
            suggestions: expected
                ? [{ text: `Replace with ${expected}`, action: 'fix' }]
                : [{ text: 'Check for typos or missing keywords', action: 'investigate' }],
        });
    }

    /**
     * Statement is incomplete
     */
    static incompleteStatement(
        statementType: string,
        missing: string,
        location: ErrorLocation
    ): ParserError {
        return new ParserError({
            code: 'VERO-207',
            severity: 'error',
            location,
            title: 'Incomplete Statement',
            whatWentWrong: `The "${statementType}" statement is incomplete. Missing: ${missing}`,
            howToFix: `Complete the statement by adding ${missing}.`,
            flakiness: 'permanent',
            retryable: false,
            suggestions: [
                { text: `Add ${missing} to complete the statement`, action: 'fix' },
            ],
        });
    }

    /**
     * Convert from legacy ParseError format
     */
    static fromLegacy(legacy: { message: string; line: number; column: number }): ParserError {
        const msg = legacy.message.toLowerCase();
        const loc = { line: legacy.line, column: legacy.column };

        // Try to categorize based on message content
        if (msg.includes('expected') && msg.includes('{')) {
            return ParserError.missingBrace('{', 'block', loc);
        }

        if (msg.includes('expected') && msg.includes('}')) {
            return ParserError.missingBrace('}', 'block', loc);
        }

        if (msg.includes('expected') && (msg.includes('string') || msg.includes('"'))) {
            return ParserError.missingString('value', loc);
        }

        if (msg.includes('expected') && (msg.includes('name') || msg.includes('identifier'))) {
            return ParserError.missingName('keyword', loc);
        }

        if (msg.includes('unexpected')) {
            const tokenMatch = legacy.message.match(/['"]([^'"]+)['"]/);
            const token = tokenMatch ? tokenMatch[1] : 'token';
            return ParserError.unexpectedToken(token, undefined, loc);
        }

        // Default: invalid statement
        return ParserError.invalidStatement(legacy.message, loc);
    }
}
