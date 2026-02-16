/**
 * Variable Interpolation Utilities
 * Handles {{variable}} syntax and expression interpolation in generated code
 */

import type { GeneratorContext } from '@playwright-web-app/shared';

/**
 * Pattern to match variable placeholders: {{variableName}} or {{user.email}}
 */
const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

/**
 * Interpolate variables in a string and return the code representation
 * 
 * Examples:
 * - "Hello {{name}}" -> `Hello ${name}`
 * - "{{baseUrl}}/login" -> `${baseUrl}/login`
 * - "Static text" -> 'Static text'
 * - "{{user.email}}" -> user.email
 */
export function interpolateVariables(value: string, _ctx?: GeneratorContext): string {
    if (!value) return "''";

    // Check if the entire string is a single variable reference
    const singleVarMatch = value.match(/^\{\{([^}]+)\}\}$/);
    if (singleVarMatch) {
        // Return the variable reference directly (without quotes)
        return singleVarMatch[1].trim();
    }

    // Check if string contains any variable placeholders
    if (!VARIABLE_PATTERN.test(value)) {
        // No variables, return as quoted string
        return `'${escapeString(value)}'`;
    }

    // Reset regex state
    VARIABLE_PATTERN.lastIndex = 0;

    // Replace all variable placeholders with template literal syntax
    const interpolated = value.replace(VARIABLE_PATTERN, (_, varPath) => {
        return `\${${varPath.trim()}}`;
    });

    // Return as template literal
    return `\`${escapeTemplateString(interpolated)}\``;
}

/**
 * Check if a value contains variable placeholders
 */
export function hasVariables(value: string): boolean {
    if (!value) return false;
    VARIABLE_PATTERN.lastIndex = 0;
    return VARIABLE_PATTERN.test(value);
}

/**
 * Extract variable names from a string
 */
export function extractVariables(value: string): string[] {
    if (!value) return [];

    const variables: string[] = [];
    VARIABLE_PATTERN.lastIndex = 0;

    let match;
    while ((match = VARIABLE_PATTERN.exec(value)) !== null) {
        variables.push(match[1].trim());
    }

    return variables;
}

/**
 * Format a value for code generation based on its type
 */
export function formatValue(value: any, valueType?: string): string {
    if (value === null || value === undefined) {
        return 'undefined';
    }

    switch (valueType) {
        case 'string':
            return hasVariables(String(value))
                ? interpolateVariables(String(value))
                : `'${escapeString(String(value))}'`;
        case 'number':
            return String(Number(value));
        case 'boolean':
            return value ? 'true' : 'false';
        case 'json':
            return JSON.stringify(value);
        case 'expression':
            return String(value);
        default:
            // Auto-detect type
            if (typeof value === 'number') return String(value);
            if (typeof value === 'boolean') return value ? 'true' : 'false';
            if (typeof value === 'object') return JSON.stringify(value);
            return hasVariables(String(value))
                ? interpolateVariables(String(value))
                : `'${escapeString(String(value))}'`;
    }
}

/**
 * Escape special characters in regular strings
 */
function escapeString(str: string): string {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
}

/**
 * Escape special characters in template literal strings
 */
function escapeTemplateString(str: string): string {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}

/**
 * Generate indentation string
 */
export function indent(level: number): string {
    return '  '.repeat(level);
}

/**
 * Add indentation to each line of code
 */
export function indentLines(lines: string[], level: number): string[] {
    const ind = indent(level);
    return lines.map(line => `${ind}${line}`);
}
