/**
 * Placeholder Decorations — manages pill-styled inline decorations for
 * unfilled slot markers (‹target›, ‹value›, etc.) in the Monaco editor.
 *
 * After a snippet is inserted, this module:
 * 1. Finds all ‹...› markers in the inserted line
 * 2. Creates Monaco inline decorations with pill styling
 * 3. Tracks their positions for click detection and Tab navigation
 */

import type * as MonacoEditor from 'monaco-editor';
import type { ActionDef, PlaceholderRange } from './types';

const PLACEHOLDER_REGEX = /‹([^›]+)›/g;
const PLACEHOLDER_CLASS = 'vero-slash-pill';
const PLACEHOLDER_FILLED_CLASS = 'vero-slash-pill-filled';

/**
 * Scan a line for ‹...› placeholder markers and create decorations.
 * Returns the PlaceholderRange[] for tracking.
 */
export function createPlaceholderDecorations(
    editor: MonacoEditor.editor.IStandaloneCodeEditor,
    monaco: typeof MonacoEditor,
    lineNumber: number,
    action: ActionDef,
): PlaceholderRange[] {
    const model = editor.getModel();
    if (!model) return [];

    const lineContent = model.getLineContent(lineNumber);
    const placeholders: PlaceholderRange[] = [];
    const decorations: MonacoEditor.editor.IModelDeltaDecoration[] = [];

    let match: RegExpExecArray | null;
    PLACEHOLDER_REGEX.lastIndex = 0;

    // Map ‹label› markers to slot IDs using the action's slot order
    const slotQueue = [...action.slots];

    while ((match = PLACEHOLDER_REGEX.exec(lineContent)) !== null) {
        const slot = slotQueue.shift();
        if (!slot) break;

        const startCol = match.index + 1; // Monaco columns are 1-based
        const endCol = startCol + match[0].length;

        decorations.push({
            range: new monaco.Range(lineNumber, startCol, lineNumber, endCol),
            options: {
                inlineClassName: PLACEHOLDER_CLASS,
                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            },
        });

        placeholders.push({
            slotId: slot.id,
            decorationId: '', // will be set after deltaDecorations
            lineNumber,
            startColumn: startCol,
            endColumn: endCol,
            filled: false,
        });
    }

    // Apply decorations and capture IDs
    const decorationIds = editor.deltaDecorations([], decorations);
    for (let i = 0; i < placeholders.length; i++) {
        placeholders[i].decorationId = decorationIds[i];
    }

    return placeholders;
}

/**
 * Remove all placeholder decorations.
 */
export function clearPlaceholderDecorations(
    editor: MonacoEditor.editor.IStandaloneCodeEditor,
    placeholders: PlaceholderRange[],
): void {
    const ids = placeholders.map(p => p.decorationId).filter(Boolean);
    if (ids.length > 0) {
        editor.deltaDecorations(ids, []);
    }
}

/**
 * Update a placeholder's decoration after it's been filled.
 * Changes the style from "unfilled pill" to "filled pill".
 */
export function markPlaceholderFilled(
    editor: MonacoEditor.editor.IStandaloneCodeEditor,
    monaco: typeof MonacoEditor,
    placeholder: PlaceholderRange,
    newStartCol: number,
    newEndCol: number,
): void {
    editor.deltaDecorations(
        [placeholder.decorationId],
        [{
            range: new monaco.Range(placeholder.lineNumber, newStartCol, placeholder.lineNumber, newEndCol),
            options: {
                inlineClassName: PLACEHOLDER_FILLED_CLASS,
                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            },
        }]
    );
}

/**
 * Find which placeholder (if any) was clicked at the given position.
 */
export function findPlaceholderAtPosition(
    placeholders: PlaceholderRange[],
    lineNumber: number,
    column: number,
): PlaceholderRange | null {
    return placeholders.find(p =>
        p.lineNumber === lineNumber &&
        column >= p.startColumn &&
        column <= p.endColumn &&
        !p.filled
    ) ?? null;
}

/**
 * Get the next unfilled placeholder after the given one.
 */
export function getNextUnfilledPlaceholder(
    placeholders: PlaceholderRange[],
    currentSlotId: string,
): PlaceholderRange | null {
    const currentIndex = placeholders.findIndex(p => p.slotId === currentSlotId);
    if (currentIndex === -1) return null;

    for (let i = currentIndex + 1; i < placeholders.length; i++) {
        if (!placeholders[i].filled) return placeholders[i];
    }
    // Wrap around
    for (let i = 0; i < currentIndex; i++) {
        if (!placeholders[i].filled) return placeholders[i];
    }
    return null;
}

/**
 * Get the previous unfilled placeholder.
 */
export function getPrevUnfilledPlaceholder(
    placeholders: PlaceholderRange[],
    currentSlotId: string,
): PlaceholderRange | null {
    const currentIndex = placeholders.findIndex(p => p.slotId === currentSlotId);
    if (currentIndex === -1) return null;

    for (let i = currentIndex - 1; i >= 0; i--) {
        if (!placeholders[i].filled) return placeholders[i];
    }
    // Wrap around
    for (let i = placeholders.length - 1; i > currentIndex; i--) {
        if (!placeholders[i].filled) return placeholders[i];
    }
    return null;
}

/**
 * CSS for placeholder pills — injected as a <style> tag.
 */
export const PLACEHOLDER_STYLES = `
    .${PLACEHOLDER_CLASS} {
        background-color: rgba(187, 134, 252, 0.2);
        border: 1px solid rgba(187, 134, 252, 0.4);
        border-radius: 3px;
        padding: 0 2px;
        cursor: pointer;
        color: #BB86FC;
    }
    .${PLACEHOLDER_CLASS}:hover {
        background-color: rgba(187, 134, 252, 0.35);
        border-color: rgba(187, 134, 252, 0.6);
    }
    .${PLACEHOLDER_FILLED_CLASS} {
        background-color: rgba(0, 255, 65, 0.1);
        border: 1px solid rgba(0, 255, 65, 0.2);
        border-radius: 3px;
        padding: 0 2px;
        color: #A5D6A7;
    }
`;
