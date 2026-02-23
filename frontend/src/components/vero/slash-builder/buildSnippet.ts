/**
 * Snippet Composer — turns filled slot values into valid Vero text.
 *
 * Pure function: takes an ActionDef + filled values, returns a string
 * that can be inserted into the editor.
 */

import type { ActionDef, SlotValue, TargetValue } from './types';

/**
 * Format a TargetValue into Vero syntax.
 *
 * - page-ref: "LoginPage.emailInput"
 * - selector: 'BUTTON "Submit"'
 */
export function formatTarget(target: TargetValue): string {
    if (target.kind === 'page-ref') {
        return `${target.page}.${target.field}`;
    }
    return `${target.type} "${escapeQuotes(target.value)}"`;
}

/**
 * Escape double quotes in a string value.
 */
function escapeQuotes(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Check whether a slot value looks like it was never filled
 * (still has the placeholder marker text).
 */
function isPlaceholder(value: string): boolean {
    return value.startsWith('‹') && value.endsWith('›');
}

/**
 * Build the final Vero line from an action definition and filled values.
 *
 * @param action  - The action definition from the catalog
 * @param values  - Map of slotId → resolved value
 * @param indent  - Leading whitespace to prepend (matches editor indentation)
 * @returns The composed Vero line, or null if required slots are unfilled
 */
export function buildSnippet(
    action: ActionDef,
    values: Record<string, SlotValue>,
    indent: string = ''
): string | null {
    let result = action.template;

    for (const slot of action.slots) {
        const value = values[slot.id];
        const placeholder = `{${slot.id}}`;

        if (value === undefined || value === '') {
            if (slot.optional) {
                // Remove the placeholder and any surrounding quotes
                result = result.replace(`"${placeholder}"`, '""');
                result = result.replace(placeholder, '');
                continue;
            }
            return null; // required slot unfilled
        }

        let formatted: string;

        if (typeof value === 'object' && 'kind' in value) {
            // TargetValue (page-ref or selector)
            formatted = formatTarget(value);
        } else if (typeof value === 'string') {
            if (isPlaceholder(value)) {
                return null; // still a placeholder, not filled
            }
            formatted = value;
        } else {
            formatted = String(value);
        }

        result = result.replace(placeholder, formatted);
    }

    return indent + result;
}

/**
 * Extract the leading whitespace from a line of text.
 */
export function getIndentation(lineContent: string): string {
    const match = lineContent.match(/^(\s*)/);
    return match ? match[1] : '';
}
