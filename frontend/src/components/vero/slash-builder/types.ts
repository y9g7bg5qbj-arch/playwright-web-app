/**
 * Slash Builder Type System
 *
 * Defines the slot/action schema that drives the fill-in-the-blank
 * step authoring flow in the Vero editor.
 */

// ---------------------------------------------------------------------------
// Slot Kinds — what type of input each blank expects
// ---------------------------------------------------------------------------

export type SlotKind =
    | 'page-field'     // cascading dropdown: page → field (or direct selector)
    | 'page-action'    // cascading dropdown: page → action (for PERFORM)
    | 'text'           // free text input (values, URLs)
    | 'select'         // fixed options dropdown (IS VISIBLE, CONTAINS, etc.)
    | 'number'         // numeric input (wait duration)
    | 'key';           // keyboard key picker (for PRESS)

export interface SlotDef {
    /** Unique id within the action, e.g. 'target', 'value', 'condition' */
    id: string;
    kind: SlotKind;
    /** Placeholder label shown inside the pill, e.g. "field", "value" */
    label: string;
    /** Fixed options for 'select' kind */
    options?: string[];
    /** Whether this slot can be left empty */
    optional?: boolean;
}

// ---------------------------------------------------------------------------
// Action Definitions
// ---------------------------------------------------------------------------

export interface ActionDef {
    /** Machine id, e.g. 'fill', 'click', 'verify-state' */
    id: string;
    /** Display label in palette, e.g. 'FILL target WITH value' */
    label: string;
    /** Search keywords for palette filtering */
    keywords: string[];
    /**
     * Template string with {slotId} markers.
     * Used by buildSnippet to compose the final Vero line.
     * Example: 'FILL {target} WITH "{value}"'
     */
    template: string;
    /**
     * Monaco snippet template for initial insertion.
     * Example: 'FILL ${1:‹target›} WITH "${2:‹value›}"'
     */
    snippetTemplate: string;
    /** Ordered slot definitions for the fill-in-the-blank form */
    slots: SlotDef[];
    /** Category for palette grouping */
    category: 'interact' | 'navigate' | 'assert' | 'wait' | 'tab' | 'dialog' | 'storage' | 'api' | 'control' | 'variable' | 'data' | 'other';
    /** Short description shown in palette */
    description?: string;
}

// ---------------------------------------------------------------------------
// Resolved Values — output of popup interactions
// ---------------------------------------------------------------------------

/** A resolved element target (from page reference or direct selector) */
export type TargetValue =
    | { kind: 'page-ref'; page: string; field: string }
    | { kind: 'selector'; type: string; value: string };

/** All possible resolved slot values */
export type SlotValue = string | TargetValue;

// ---------------------------------------------------------------------------
// Page Field Data — rich registry for dropdown population
// ---------------------------------------------------------------------------

export interface PageFieldInfo {
    name: string;
    selectorType: string;   // e.g. 'BUTTON', 'TEXTBOX', 'CSS', 'XPATH'
    selectorValue: string;  // e.g. 'Submit', '.my-class'
}

export interface PageActionInfo {
    name: string;
    parameters: string[];
}

export interface PageFieldData {
    name: string;
    filePath: string;
    fields: PageFieldInfo[];
    actions: PageActionInfo[];
}

// ---------------------------------------------------------------------------
// Slash Builder State
// ---------------------------------------------------------------------------

export interface PlaceholderRange {
    slotId: string;
    /** Monaco decoration ID for the pill styling */
    decorationId: string;
    /** Line and column range of the placeholder text */
    lineNumber: number;
    startColumn: number;
    endColumn: number;
    /** Whether this slot has been filled */
    filled: boolean;
}

export type SlashBuilderState =
    | { phase: 'closed' }
    | {
        phase: 'palette';
        position: { x: number; y: number };
        lineNumber: number;
    }
    | {
        phase: 'filling';
        action: ActionDef;
        lineNumber: number;
        placeholders: PlaceholderRange[];
        activeSlotId: string | null;
        popupPosition: { x: number; y: number } | null;
    };

// ---------------------------------------------------------------------------
// Direct Selector Types (for the "Direct Selector" tab)
// ---------------------------------------------------------------------------

export const SELECTOR_TYPES = [
    'BUTTON',
    'TEXTBOX',
    'LINK',
    'CHECKBOX',
    'HEADING',
    'COMBOBOX',
    'RADIO',
    'CSS',
    'XPATH',
    'TESTID',
    'LABEL',
    'PLACEHOLDER',
    'TEXT',
] as const;

export type SelectorType = typeof SELECTOR_TYPES[number];

// ---------------------------------------------------------------------------
// Common keyboard keys (for PRESS action)
// ---------------------------------------------------------------------------

export const COMMON_KEYS = [
    'Enter',
    'Tab',
    'Escape',
    'Backspace',
    'Delete',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Space',
    'Home',
    'End',
    'PageUp',
    'PageDown',
] as const;
