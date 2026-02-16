/**
 * Utility functions for the Test Data module.
 *
 * Pure helper functions extracted from TestDataPage to reduce its size.
 */

import type { DataColumn as AGDataColumn } from './AGGridDataTable';
import type { TestDataValidationErrorItem } from '@/api/testData';

/**
 * Map backend column type strings to AGGridDataTable's type union.
 * Backend uses 'string' while the grid uses 'text'. This function
 * validates the type and defaults to 'text' for unknown values.
 */
export function mapColumnType(backendType: string): AGDataColumn['type'] {
    const typeMap: Record<string, AGDataColumn['type']> = {
        'string': 'text',
        'text': 'text',
        'number': 'number',
        'boolean': 'boolean',
        'date': 'date',
        'formula': 'formula',
        'reference': 'reference',
    };
    const mapped = typeMap[backendType];
    if (!mapped) {
        console.warn(`[TestData] Unknown column type "${backendType}", defaulting to "text"`);
    }
    return mapped || 'text';
}

/**
 * Format a validation error list into a human-readable message.
 */
export function formatValidationIssue(
    validationErrors: TestDataValidationErrorItem[],
    fallbackMessage: string
): string {
    if (!validationErrors || validationErrors.length === 0) {
        return fallbackMessage;
    }
    const first = validationErrors[0];
    const location = `${first.rowId}${first.column ? ` • ${first.column}` : ''}`;
    return `${fallbackMessage} ${location}: ${first.reason}`;
}

/**
 * Format a server error response payload into a user-facing message.
 */
export function formatServerError(payload: any, fallbackMessage: string): string {
    if (Array.isArray(payload?.validationErrors)) {
        const serverMessage = payload?.message || fallbackMessage;
        return formatValidationIssue(payload.validationErrors, serverMessage);
    }
    return payload?.error || payload?.message || fallbackMessage;
}
