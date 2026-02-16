/**
 * AG Grid Validation Utilities
 *
 * Pure functions for validating cell values against column type definitions
 * and calculating column summary statistics.
 */

import type { DataColumn } from './AGGridDataTable';

export interface CellValidationResult {
    valid: boolean;
    expectedType: string;
    reason?: string;
}

export interface ColumnSummary {
    columnName: string;
    columnType: DataColumn['type'];
    count: number;
    nonEmpty: number;
    empty: number;
    distinct: number;
    // Numeric only
    sum?: number;
    avg?: number;
    min?: number | string;
    max?: number | string;
}

export function normalizeValidationRules(column: DataColumn): {
    min: number | undefined;
    max: number | undefined;
    minLength: number | undefined;
    maxLength: number | undefined;
    pattern: string | undefined;
    enumValues: string[] | undefined;
} {
    return {
        min: column.validation?.min ?? column.min,
        max: column.validation?.max ?? column.max,
        minLength: column.validation?.minLength ?? column.minLength,
        maxLength: column.validation?.maxLength ?? column.maxLength,
        pattern: column.validation?.pattern ?? column.pattern,
        enumValues: column.validation?.enum ?? column.enum,
    };
}

export function isEmptyValue(value: unknown): boolean {
    return value === '' || value === null || value === undefined;
}

export function validateValueAgainstColumn(column: DataColumn, value: unknown): CellValidationResult {
    const rules = normalizeValidationRules(column);
    const expectedType = column.type === 'formula' || column.type === 'reference' ? 'text' : column.type;

    if (isEmptyValue(value)) {
        if (column.required) {
            return {
                valid: false,
                expectedType,
                reason: 'Required value is missing.',
            };
        }
        return { valid: true, expectedType };
    }

    if (column.type === 'number') {
        const numeric = typeof value === 'number' ? value : Number(String(value));
        if (!Number.isFinite(numeric)) {
            return {
                valid: false,
                expectedType: 'number',
                reason: 'Value must be numeric.',
            };
        }
        if (rules.min !== undefined && numeric < rules.min) {
            return {
                valid: false,
                expectedType: 'number',
                reason: `Value must be >= ${rules.min}.`,
            };
        }
        if (rules.max !== undefined && numeric > rules.max) {
            return {
                valid: false,
                expectedType: 'number',
                reason: `Value must be <= ${rules.max}.`,
            };
        }
        return { valid: true, expectedType: 'number' };
    }

    if (column.type === 'boolean') {
        const lower = typeof value === 'string' ? value.trim().toLowerCase() : '';
        const validBoolean = typeof value === 'boolean' || lower === 'true' || lower === 'false' || lower === '1' || lower === '0' || lower === 'yes' || lower === 'no' || value === 0 || value === 1;
        if (!validBoolean) {
            return {
                valid: false,
                expectedType: 'boolean',
                reason: 'Use true/false values.',
            };
        }
        return { valid: true, expectedType: 'boolean' };
    }

    if (column.type === 'date') {
        const parsed = value instanceof Date ? value.getTime() : Date.parse(String(value));
        if (Number.isNaN(parsed)) {
            return {
                valid: false,
                expectedType: 'date',
                reason: 'Use a valid date value.',
            };
        }
        return { valid: true, expectedType: 'date' };
    }

    const stringValue = String(value);
    if (rules.minLength !== undefined && stringValue.length < rules.minLength) {
        return {
            valid: false,
            expectedType: 'text',
            reason: `Value must be at least ${rules.minLength} characters.`,
        };
    }
    if (rules.maxLength !== undefined && stringValue.length > rules.maxLength) {
        return {
            valid: false,
            expectedType: 'text',
            reason: `Value must be at most ${rules.maxLength} characters.`,
        };
    }
    if (rules.pattern) {
        try {
            if (!new RegExp(rules.pattern).test(stringValue)) {
                return {
                    valid: false,
                    expectedType: 'text',
                    reason: 'Value does not match the required pattern.',
                };
            }
        } catch {
            return {
                valid: false,
                expectedType: 'text',
                reason: 'Column validation pattern is invalid.',
            };
        }
    }
    if (rules.enumValues && rules.enumValues.length > 0 && !rules.enumValues.includes(stringValue)) {
        return {
            valid: false,
            expectedType: 'text',
            reason: `Value must be one of: ${rules.enumValues.join(', ')}.`,
        };
    }
    return { valid: true, expectedType: 'text' };
}

/**
 * Calculate summary statistics for a column
 */
export function calculateColumnSummary(
    columnName: string,
    columnType: DataColumn['type'],
    rows: { data: Record<string, any> }[]
): ColumnSummary {
    const values = rows.map(r => r.data[columnName]);
    const count = values.length;
    const nonEmptyValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const nonEmpty = nonEmptyValues.length;
    const empty = count - nonEmpty;
    const distinct = new Set(nonEmptyValues.map(v => String(v))).size;

    const summary: ColumnSummary = {
        columnName,
        columnType,
        count,
        nonEmpty,
        empty,
        distinct,
    };

    // Calculate numeric stats for number columns
    if (columnType === 'number') {
        const numericValues = nonEmptyValues
            .map(v => parseFloat(v))
            .filter(v => !isNaN(v));

        if (numericValues.length > 0) {
            summary.sum = numericValues.reduce((a, b) => a + b, 0);
            summary.avg = summary.sum / numericValues.length;
            summary.min = Math.min(...numericValues);
            summary.max = Math.max(...numericValues);
        }
    }

    // Calculate min/max for text/date columns (alphabetical)
    if ((columnType === 'text' || columnType === 'date') && nonEmptyValues.length > 0) {
        const sortedValues = [...nonEmptyValues].sort();
        summary.min = String(sortedValues[0]);
        summary.max = String(sortedValues[sortedValues.length - 1]);
    }

    return summary;
}
