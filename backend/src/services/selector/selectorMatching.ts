/**
 * Selector Matching - Fuzzy matching algorithms for selector comparison
 *
 * Provides Levenshtein distance calculation, similarity scoring,
 * selector text extraction, and semantic relationship detection
 * between selectors. Used by PageObjectRegistry for duplicate detection.
 */

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];

    // Initialize first column
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Initialize first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
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

    return matrix[b.length][a.length];
}

/**
 * Calculate similarity score between two strings (0-1)
 */
export function calculateSimilarity(a: string, b: string): number {
    const normalizedA = a.toLowerCase().trim();
    const normalizedB = b.toLowerCase().trim();

    if (normalizedA === normalizedB) return 1.0;
    if (normalizedA.length === 0 || normalizedB.length === 0) return 0;

    const distance = levenshteinDistance(normalizedA, normalizedB);
    const maxLength = Math.max(normalizedA.length, normalizedB.length);
    return 1 - distance / maxLength;
}

/**
 * Extract the text value from a selector for comparison
 */
export function extractSelectorText(selector: string): string | null {
    // role "button" name "Submit" -> Submit
    const roleWithName = selector.match(/^role\s+"[^"]+"\s+name\s+"([^"]+)"$/i);
    if (roleWithName) return roleWithName[1];

    // button "Submit" / link "Forgot" / label "Email" / text "Welcome"
    const typedValue = selector.match(/^(?:button|link|label|placeholder|text|alt|title|testid|testId)\s+"([^"]+)"$/i);
    if (typedValue) return typedValue[1];

    // Fallback: first quoted value
    const match = selector.match(/"([^"]+)"/);
    return match ? match[1] : null;
}

/**
 * Extract the selector type from a selector string
 */
export function extractSelectorType(selector: string): string {
    if (selector.startsWith('testId') || selector.startsWith('testid')) return 'testid';
    if (selector.startsWith('button')) return 'button';
    if (selector.startsWith('link')) return 'link';
    if (selector.startsWith('label')) return 'label';
    if (selector.startsWith('placeholder')) return 'placeholder';
    if (selector.startsWith('text')) return 'text';
    if (selector.startsWith('role')) return 'role';
    if (selector.startsWith('#')) return 'id';
    if (selector.startsWith('.') || selector.includes('[')) return 'css';
    return 'unknown';
}

/**
 * Check if two selectors target semantically similar elements
 */
export function areSemanticallyRelated(selector1: string, selector2: string): boolean {
    // Extract selector types
    const type1 = extractSelectorType(selector1);
    const type2 = extractSelectorType(selector2);

    // Related types that might select the same element
    const relatedGroups = [
        ['button', 'role', 'text'],       // Interactive elements
        ['label', 'placeholder', 'text'], // Form field identifiers
        ['link', 'text'],                 // Navigation elements
    ];

    for (const group of relatedGroups) {
        if (group.includes(type1) && group.includes(type2)) {
            return true;
        }
    }

    return type1 === type2;
}
