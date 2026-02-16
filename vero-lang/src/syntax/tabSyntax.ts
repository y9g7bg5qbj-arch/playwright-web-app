/**
 * Canonical Vero DSL syntax templates for tab operations.
 * Used by external tooling (backend prompts/codegen) to avoid drift.
 */
export const VERO_TAB_SYNTAX = {
    switchToNewTab: 'SWITCH TO NEW TAB',
    switchToNewTabWithUrl: 'SWITCH TO NEW TAB "{url}"',
    switchToTab: 'SWITCH TO TAB {index}',
    openInNewTab: 'OPEN "{url}" IN NEW TAB',
    closeTab: 'CLOSE TAB',
} as const;

