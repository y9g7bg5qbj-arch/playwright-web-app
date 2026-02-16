/**
 * Vero Error Types and Codes
 * 
 * Provides structured error types for syntax and semantic validation
 * with support for friendly messages and suggestions.
 */

export enum VeroErrorCode {
    // Syntax Errors (1xxx)
    MISSING_BRACE = 1001,
    MISSING_KEYWORD = 1002,
    INCOMPLETE_STATEMENT = 1003,
    UNTERMINATED_STRING = 1004,
    UNKNOWN_KEYWORD = 1005,
    INVALID_TOKEN = 1006,
    UNEXPECTED_TOKEN = 1007,
    MISSING_WITH = 1008,
    MISSING_FROM = 1009,
    MISSING_TIMES = 1010,

    // Semantic Errors (2xxx)
    UNDEFINED_PAGE = 2001,
    UNDEFINED_FIELD = 2002,
    UNDEFINED_ACTION = 2003,
    UNDEFINED_VARIABLE = 2004,
    DUPLICATE_IDENTIFIER = 2005,
    UNDEFINED_PAGEACTIONS = 2006,
    INVALID_PAGEACTIONS_FOR = 2007,
    INVALID_TAB_CONTEXT = 2008,
}

export type VeroErrorSeverity = 'error' | 'warning' | 'info' | 'hint';

export interface VeroError {
    /** Error code for categorization */
    code: VeroErrorCode;
    /** Human-friendly error message */
    message: string;
    /** Line number (1-indexed) */
    line: number;
    /** Start column (0-indexed) */
    column: number;
    /** End column for highlighting (0-indexed) */
    endColumn: number;
    /** Error severity level */
    severity: VeroErrorSeverity;
    /** "Did you mean?" suggestions for typos */
    suggestions?: string[];
    /** The offending token text */
    offendingText?: string;
    /** Source file path if available */
    file?: string;
}

export interface ValidationResult {
    /** Whether validation passed (no errors) */
    valid: boolean;
    /** All errors found */
    errors: VeroError[];
    /** Warning count */
    warningCount: number;
    /** Error count */
    errorCount: number;
}

export function createValidationResult(errors: VeroError[]): ValidationResult {
    let errorCount = 0;
    let warningCount = 0;
    for (const e of errors) {
        if (e.severity === 'error') errorCount++;
        else if (e.severity === 'warning') warningCount++;
    }
    return { valid: errorCount === 0, errors, warningCount, errorCount };
}

export class VeroValidationError extends Error {
    public readonly errors: VeroError[];

    constructor(errors: VeroError[]) {
        const { errorCount, warningCount } = createValidationResult(errors);
        super(`Vero validation failed: ${errorCount} error(s), ${warningCount} warning(s)`);

        this.name = 'VeroValidationError';
        this.errors = errors;
    }

    /**
     * Format errors as human-readable string
     */
    format(): string {
        return this.errors.map(e => {
            const severity = e.severity.toUpperCase();
            const location = `Line ${e.line}:${e.column}`;
            const suggestion = e.suggestions?.length
                ? ` Did you mean: ${e.suggestions.slice(0, 3).join(', ')}?`
                : '';
            return `[${severity}] ${location} - ${e.message}${suggestion}`;
        }).join('\n');
    }
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for "Did you mean?" suggestions
 */
export function levenshteinDistance(a: string, b: string): number {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();

    if (aLower === bLower) return 0;
    if (aLower.length === 0) return bLower.length;
    if (bLower.length === 0) return aLower.length;

    const matrix: number[][] = [];

    for (let i = 0; i <= bLower.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= aLower.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= bLower.length; i++) {
        for (let j = 1; j <= aLower.length; j++) {
            if (bLower.charAt(i - 1) === aLower.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[bLower.length][aLower.length];
}

/**
 * Find similar strings from a list (for suggestions)
 * Returns sorted by similarity (closest first)
 */
export function findSimilar(target: string, candidates: string[], maxDistance: number = 3): string[] {
    return candidates
        .map(c => ({ candidate: c, distance: levenshteinDistance(target, c) }))
        .filter(({ distance }) => distance <= maxDistance && distance > 0)
        .sort((a, b) => a.distance - b.distance)
        .map(({ candidate }) => candidate)
        .slice(0, 5);
}

export const VERO_KEYWORDS = [
    // Declarations
    'page', 'pageactions', 'feature', 'scenario', 'field', 'fixture',
    // Control
    'if', 'else', 'repeat', 'times', 'before', 'after', 'each', 'all',
    // Actions
    'click', 'fill', 'open', 'check', 'uncheck', 'select', 'hover', 'press',
    'scroll', 'wait', 'perform', 'refresh', 'clear', 'take', 'screenshot',
    'log', 'upload', 'verify',
    // Keywords
    'use', 'with', 'from', 'to', 'in', 'for', 'returns', 'return',
    // Conditions
    'is', 'visible', 'hidden', 'enabled', 'disabled', 'checked', 'empty', 'contains',
    // Types
    'text', 'number', 'flag', 'list', 'data',
    // VDQL
    'row', 'rows', 'where', 'order', 'by', 'asc', 'desc', 'limit', 'offset',
    'first', 'last', 'random', 'count', 'distinct',
] as const;

export type VeroKeyword = typeof VERO_KEYWORDS[number];
