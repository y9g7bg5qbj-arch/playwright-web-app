/**
 * Pure utility functions extracted from the Transpiler class.
 * These have no dependencies on class state.
 */

export function camelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
}

export function pascalCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function inferTypeFromValue(value: string): string {
    if (value.startsWith("'") || value.startsWith('"')) {
        return 'string';
    }
    if (value === 'true' || value === 'false') {
        return 'boolean';
    }
    if (!isNaN(Number(value))) {
        return 'number';
    }
    return 'unknown';
}

/**
 * Convert PascalCase/camelCase identifier to readable test name.
 * e.g., "LoginWithValidCredentials" -> "Login With Valid Credentials"
 */
export function toReadableTestName(identifier: string): string {
    return identifier
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .trim();
}

/**
 * Escape a string for use in generated code.
 */
export function escapeString(str: string): string {
    return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
}
