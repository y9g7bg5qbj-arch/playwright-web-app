/**
 * Monaco Editor Adapter
 *
 * Converts VeroError instances to Monaco editor markers for
 * displaying squiggly underlines and hover tooltips.
 */

import { VeroError, ErrorSeverity, ErrorLocation } from './VeroError.js';
import { LexerError } from './categories/LexerError.js';
import { ParserError } from './categories/ParserError.js';
import { ValidationError } from './categories/ValidationError.js';

// Import types from legacy Vero modules
import type { LexerError as LegacyLexerError } from '../lexer/tokens.js';
import type { ParseError as LegacyParseError } from '../parser/ast.js';
import type { ValidationError as LegacyValidationError } from '../validator/validator.js';

/**
 * Monaco marker data interface
 * (Matches monaco.editor.IMarkerData)
 */
export interface MonacoMarkerData {
    severity: number; // monaco.MarkerSeverity
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
    message: string;
    code?: string;
    source?: string;
    relatedInformation?: Array<{
        resource: any; // monaco.Uri
        message: string;
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
    }>;
}

/**
 * Monaco MarkerSeverity enum values
 * (Matching monaco.MarkerSeverity)
 */
export const MonacoSeverity = {
    Hint: 1,
    Info: 2,
    Warning: 4,
    Error: 8,
} as const;

/**
 * Convert ErrorSeverity to Monaco MarkerSeverity
 */
function severityToMonaco(severity: ErrorSeverity): number {
    switch (severity) {
        case 'error':
            return MonacoSeverity.Error;
        case 'warning':
            return MonacoSeverity.Warning;
        case 'info':
            return MonacoSeverity.Info;
        case 'hint':
            return MonacoSeverity.Hint;
        default:
            return MonacoSeverity.Error;
    }
}

/**
 * Get end column for a marker
 * If endColumn is not specified, use end of line
 */
function getEndColumn(
    location: ErrorLocation | undefined,
    model: { getLineLength: (line: number) => number } | undefined
): number {
    if (location?.endColumn) {
        return location.endColumn;
    }

    if (location?.column && model) {
        // Highlight from column to end of line
        const line = location.endLine || location.line;
        return model.getLineLength(line) + 1;
    }

    // Default: highlight first character
    return (location?.column || 1) + 1;
}

/**
 * Convert a single VeroError to a Monaco marker
 */
export function veroErrorToMonacoMarker(
    error: VeroError,
    model?: { getLineLength: (line: number) => number; uri?: any }
): MonacoMarkerData {
    const location = error.location || { line: 1, column: 1 };
    const endColumn = getEndColumn(error.location, model);

    // Build the message with "What went wrong" and "How to fix"
    let message = `${error.title}\n\n`;
    message += `${error.whatWentWrong}\n\n`;
    message += `How to fix: ${error.howToFix}`;

    // Add suggestions if any
    if (error.suggestions.length > 0) {
        message += '\n\nSuggestions:';
        for (const s of error.suggestions) {
            message += `\n• ${s.text}`;
        }
    }

    return {
        severity: severityToMonaco(error.severity),
        startLineNumber: location.line,
        startColumn: location.column || 1,
        endLineNumber: location.endLine || location.line,
        endColumn,
        message,
        code: error.code,
        source: 'vero',
    };
}

/**
 * Convert multiple VeroErrors to Monaco markers
 */
export function veroErrorsToMonacoMarkers(
    errors: VeroError[],
    model?: { getLineLength: (line: number) => number; uri?: any }
): MonacoMarkerData[] {
    return errors.map((error) => veroErrorToMonacoMarker(error, model));
}

/**
 * Convert legacy LexerError array to VeroError array
 */
export function convertLexerErrors(errors: LegacyLexerError[]): VeroError[] {
    return errors.map((err) => LexerError.fromLegacy(err));
}

/**
 * Convert legacy ParseError array to VeroError array
 */
export function convertParseErrors(errors: LegacyParseError[]): VeroError[] {
    return errors.map((err) => ParserError.fromLegacy(err));
}

/**
 * Convert legacy ValidationError array to VeroError array
 */
export function convertValidationErrors(errors: LegacyValidationError[]): VeroError[] {
    return errors.map((err) => ValidationError.fromLegacy(err));
}

/**
 * All-in-one converter for the compilation pipeline
 * Takes results from lexer, parser, and validator and returns Monaco markers
 */
export function compileResultsToMonacoMarkers(
    lexerErrors: LegacyLexerError[],
    parseErrors: LegacyParseError[],
    validationErrors: LegacyValidationError[],
    validationWarnings: LegacyValidationError[],
    model?: { getLineLength: (line: number) => number; uri?: any }
): MonacoMarkerData[] {
    const allErrors: VeroError[] = [];

    // Convert and collect all errors
    allErrors.push(...convertLexerErrors(lexerErrors));
    allErrors.push(...convertParseErrors(parseErrors));
    allErrors.push(...convertValidationErrors(validationErrors));
    allErrors.push(...convertValidationErrors(validationWarnings));

    // Convert to Monaco markers
    return veroErrorsToMonacoMarkers(allErrors, model);
}

/**
 * Utility: Create a quick marker for a simple error
 * (For use when you don't need the full VeroError class)
 */
export function createQuickMarker(
    line: number,
    column: number,
    message: string,
    severity: ErrorSeverity = 'error',
    code?: string
): MonacoMarkerData {
    return {
        severity: severityToMonaco(severity),
        startLineNumber: line,
        startColumn: column,
        endLineNumber: line,
        endColumn: column + 1,
        message,
        code,
        source: 'vero',
    };
}

/**
 * Get error statistics from markers
 */
export function getMarkerStats(markers: MonacoMarkerData[]): {
    errors: number;
    warnings: number;
    infos: number;
    hints: number;
    total: number;
} {
    const stats = { errors: 0, warnings: 0, infos: 0, hints: 0, total: markers.length };

    for (const marker of markers) {
        switch (marker.severity) {
            case MonacoSeverity.Error:
                stats.errors++;
                break;
            case MonacoSeverity.Warning:
                stats.warnings++;
                break;
            case MonacoSeverity.Info:
                stats.infos++;
                break;
            case MonacoSeverity.Hint:
                stats.hints++;
                break;
        }
    }

    return stats;
}
