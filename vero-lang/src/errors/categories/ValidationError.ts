/**
 * ValidationError - Semantic validation errors
 *
 * These errors occur when the code is syntactically correct but has
 * logical issues like undefined references or duplicate definitions.
 */

import { VeroError, VeroErrorData, ErrorLocation } from '../VeroError.js';

export class ValidationError extends VeroError {
    constructor(data: Omit<VeroErrorData, 'category'>) {
        super({ ...data, category: 'validation' });
        this.name = 'ValidationError';
    }

    /**
     * Page used but not defined
     */
    static undefinedPage(
        pageName: string,
        location: ErrorLocation
    ): ValidationError {
        return new ValidationError({
            code: 'VERO-301',
            severity: 'error',
            location,
            title: 'Undefined Page',
            whatWentWrong: `The page "${pageName}" is used but has not been defined.`,
            howToFix: `Create a file named "${pageName}.vero" with a PAGE definition, or check if you spelled the name correctly.`,
            flakiness: 'permanent',
            retryable: false,
            suggestions: [
                { text: `Create ${pageName}.vero with PAGE ${pageName} { ... }`, action: 'fix' },
                { text: 'Check the spelling of the page name', action: 'investigate' },
            ],
        });
    }

    /**
     * Field referenced but not defined on the page
     */
    static undefinedField(
        fieldName: string,
        pageName: string,
        location: ErrorLocation,
        availableFields?: string[]
    ): ValidationError {
        const suggestions: Array<{ text: string; action: 'fix' | 'investigate' }> = [];

        // Check for similar field names (simple Levenshtein-like matching)
        if (availableFields && availableFields.length > 0) {
            const similar = availableFields.find(f =>
                f.toLowerCase().includes(fieldName.toLowerCase()) ||
                fieldName.toLowerCase().includes(f.toLowerCase())
            );
            if (similar) {
                suggestions.push({ text: `Did you mean "${similar}"?`, action: 'fix' });
            }
            suggestions.push({
                text: `Available fields: ${availableFields.slice(0, 5).join(', ')}${availableFields.length > 5 ? '...' : ''}`,
                action: 'investigate',
            });
        }

        suggestions.push({ text: `Add FIELD ${fieldName} = ... to ${pageName}`, action: 'fix' });

        return new ValidationError({
            code: 'VERO-302',
            severity: 'error',
            location,
            title: 'Undefined Field',
            whatWentWrong: `The field "${fieldName}" does not exist on page "${pageName}".`,
            howToFix: `Add a FIELD definition to ${pageName}, or check if you spelled the field name correctly.`,
            flakiness: 'permanent',
            retryable: false,
            suggestions,
        });
    }

    /**
     * Duplicate definition (page, field, action, etc.)
     */
    static duplicateDefinition(
        type: 'page' | 'field' | 'action' | 'variable' | 'fixture',
        name: string,
        location: ErrorLocation,
        originalLine?: number
    ): ValidationError {
        const originalRef = originalLine
            ? ` (first defined at line ${originalLine})`
            : '';

        return new ValidationError({
            code: 'VERO-303',
            severity: 'error',
            location,
            title: 'Duplicate Definition',
            whatWentWrong: `The ${type} "${name}" is already defined${originalRef}.`,
            howToFix: `Rename one of the ${type}s to have a unique name, or remove the duplicate.`,
            flakiness: 'permanent',
            retryable: false,
            suggestions: [
                { text: `Rename this ${type} to something unique`, action: 'fix' },
                { text: 'Remove the duplicate definition', action: 'fix' },
            ],
        });
    }

    /**
     * Page referenced but not in USE list
     */
    static pageNotImported(
        pageName: string,
        location: ErrorLocation
    ): ValidationError {
        return new ValidationError({
            code: 'VERO-304',
            severity: 'error',
            location,
            title: 'Page Not Imported',
            whatWentWrong: `The page "${pageName}" is used but not imported with a USE statement.`,
            howToFix: `Add "USE ${pageName}" at the top of your feature file, after the FEATURE declaration.`,
            flakiness: 'permanent',
            retryable: false,
            suggestions: [
                { text: `Add USE ${pageName} at the top`, action: 'fix' },
            ],
        });
    }

    /**
     * Action referenced but not defined on the page
     */
    static undefinedAction(
        actionName: string,
        pageName: string,
        location: ErrorLocation,
        availableActions?: string[]
    ): ValidationError {
        const suggestions: Array<{ text: string; action: 'fix' | 'investigate' }> = [];

        if (availableActions && availableActions.length > 0) {
            const similar = availableActions.find(a =>
                a.toLowerCase().includes(actionName.toLowerCase()) ||
                actionName.toLowerCase().includes(a.toLowerCase())
            );
            if (similar) {
                suggestions.push({ text: `Did you mean "${similar}"?`, action: 'fix' });
            }
        }

        suggestions.push({
            text: `Define the action: ${actionName} { ... } in ${pageName}`,
            action: 'fix',
        });

        return new ValidationError({
            code: 'VERO-305',
            severity: 'error',
            location,
            title: 'Undefined Action',
            whatWentWrong: `The action "${actionName}" does not exist on page "${pageName}".`,
            howToFix: `Add an action definition to ${pageName}, or check if you spelled the action name correctly.`,
            flakiness: 'permanent',
            retryable: false,
            suggestions,
        });
    }

    /**
     * Wrong number of arguments passed to action
     */
    static wrongArgumentCount(
        actionName: string,
        expected: number,
        actual: number,
        location: ErrorLocation
    ): ValidationError {
        return new ValidationError({
            code: 'VERO-306',
            severity: 'error',
            location,
            title: 'Wrong Number of Arguments',
            whatWentWrong: `The action "${actionName}" expects ${expected} argument(s), but ${actual} were provided.`,
            howToFix: expected > actual
                ? `Add ${expected - actual} more argument(s) to the action call.`
                : `Remove ${actual - expected} argument(s) from the action call.`,
            flakiness: 'permanent',
            retryable: false,
            suggestions: [
                { text: `Check the action definition for required parameters`, action: 'investigate' },
            ],
        });
    }

    /**
     * Naming convention warning (not error)
     */
    static namingConvention(
        type: 'page' | 'field' | 'action' | 'variable',
        name: string,
        location: ErrorLocation,
        suggestion: string
    ): ValidationError {
        const conventions: Record<string, string> = {
            page: 'PascalCase (e.g., LoginPage, UserProfile)',
            field: 'camelCase (e.g., emailInput, submitButton)',
            action: 'camelCase (e.g., login, submitForm)',
            variable: 'camelCase with $ prefix (e.g., $userName)',
        };

        return new ValidationError({
            code: 'VERO-310',
            severity: 'warning',
            location,
            title: 'Naming Convention',
            whatWentWrong: `The ${type} name "${name}" doesn't follow the recommended naming style.`,
            howToFix: `${type.charAt(0).toUpperCase() + type.slice(1)} names should use ${conventions[type]}.`,
            flakiness: 'permanent',
            retryable: false,
            suggestions: [
                { text: suggestion, action: 'fix' },
            ],
        });
    }

    /**
     * Convert from legacy ValidationError format
     */
    static fromLegacy(legacy: {
        message: string;
        severity: 'error' | 'warning';
        line?: number;
        suggestion?: string;
    }): ValidationError {
        const msg = legacy.message.toLowerCase();
        const loc = legacy.line ? { line: legacy.line } : undefined;

        // Try to categorize based on message content
        if (msg.includes('duplicate')) {
            const nameMatch = legacy.message.match(/['"]([^'"]+)['"]/);
            const name = nameMatch ? nameMatch[1] : 'item';
            return ValidationError.duplicateDefinition('page', name, loc || { line: 1 });
        }

        if (msg.includes('not defined') || msg.includes('undefined')) {
            const nameMatch = legacy.message.match(/['"]([^'"]+)['"]/);
            const name = nameMatch ? nameMatch[1] : 'item';

            if (msg.includes('page')) {
                return ValidationError.undefinedPage(name, loc || { line: 1 });
            }
            if (msg.includes('field')) {
                return ValidationError.undefinedField(name, 'unknown', loc || { line: 1 });
            }
            if (msg.includes('action')) {
                return ValidationError.undefinedAction(name, 'unknown', loc || { line: 1 });
            }
        }

        if (msg.includes('not in use list') || msg.includes('not imported')) {
            const nameMatch = legacy.message.match(/['"]([^'"]+)['"]/);
            const name = nameMatch ? nameMatch[1] : 'Page';
            return ValidationError.pageNotImported(name, loc || { line: 1 });
        }

        if (msg.includes('should be') || msg.includes('convention') || msg.includes('case')) {
            const nameMatch = legacy.message.match(/['"]([^'"]+)['"]/);
            const name = nameMatch ? nameMatch[1] : 'item';
            return ValidationError.namingConvention(
                'field',
                name,
                loc || { line: 1 },
                legacy.suggestion || 'Rename to follow naming conventions'
            );
        }

        // Default: generic validation error
        return new ValidationError({
            code: 'VERO-301',
            severity: legacy.severity,
            location: loc,
            title: 'Validation Error',
            whatWentWrong: legacy.message,
            howToFix: legacy.suggestion || 'Fix the issue indicated in the error message.',
            flakiness: 'permanent',
            retryable: false,
            suggestions: legacy.suggestion
                ? [{ text: legacy.suggestion, action: 'fix' }]
                : [],
        });
    }
}
