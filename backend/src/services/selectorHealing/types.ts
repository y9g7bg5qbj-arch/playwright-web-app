/**
 * Selector Healing Types
 *
 * Types for selector validation.
 */

/**
 * Selector validation result
 */
export interface SelectorValidationResult {
    /** Whether the selector is valid */
    isValid: boolean;

    /** Number of elements matched */
    matchCount: number;

    /** Whether the selector uniquely identifies one element */
    isUnique: boolean;

    /** Suggested alternative if not valid/unique */
    suggestedFix?: string;

    /** Error message if validation failed */
    error?: string;
}
