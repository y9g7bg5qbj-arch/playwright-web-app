/**
 * useSlashBuilder — State machine controller for the slash builder.
 *
 * Manages transitions between: closed → palette → filling → closed.
 * Provides all the callbacks needed by VeroEditor, SlashPalette,
 * TargetPopup, and SlotPopup.
 */

import { useCallback, useRef, useState } from 'react';
import type { ActionDef, SlashBuilderState, PlaceholderRange } from './types';

export interface UseSlashBuilderOptions {
    /** Called when user picks "Data Query" from palette */
    onInsertDataQuery?: () => void;
}

export function useSlashBuilder(options: UseSlashBuilderOptions = {}) {
    const [state, setState] = useState<SlashBuilderState>({ phase: 'closed' });
    const stateRef = useRef(state);
    stateRef.current = state;

    /**
     * Open the palette at the given position (called when "/" is typed on empty line).
     */
    const openPalette = useCallback((position: { x: number; y: number }, lineNumber: number) => {
        setState({
            phase: 'palette',
            position,
            lineNumber,
        });
    }, []);

    /**
     * Close everything and return to idle.
     */
    const close = useCallback(() => {
        setState({ phase: 'closed' });
    }, []);

    /**
     * User selected an action from the palette.
     * Transition to "filling" phase.
     */
    const selectAction = useCallback((action: ActionDef, lineNumber: number) => {
        // Data query is a handoff — don't enter filling phase
        if (action.id === 'data-query') {
            setState({ phase: 'closed' });
            options.onInsertDataQuery?.();
            return;
        }

        setState({
            phase: 'filling',
            action,
            lineNumber,
            placeholders: [],
            activeSlotId: null,
            popupPosition: null,
        });
    }, [options]);

    /**
     * Register placeholder ranges after snippet insertion.
     * Called by the editor integration after the snippet text is placed.
     */
    const setPlaceholders = useCallback((placeholders: PlaceholderRange[]) => {
        setState(prev => {
            if (prev.phase !== 'filling') return prev;
            return {
                ...prev,
                placeholders,
                activeSlotId: placeholders.length > 0 ? placeholders[0].slotId : null,
            };
        });
    }, []);

    /**
     * Open a popup for a specific slot (called on pill click or Tab).
     */
    const openSlotPopup = useCallback((slotId: string, position: { x: number; y: number }) => {
        setState(prev => {
            if (prev.phase !== 'filling') return prev;
            return {
                ...prev,
                activeSlotId: slotId,
                popupPosition: position,
            };
        });
    }, []);

    /**
     * Close the active slot popup without filling.
     */
    const closeSlotPopup = useCallback(() => {
        setState(prev => {
            if (prev.phase !== 'filling') return prev;
            return {
                ...prev,
                activeSlotId: null,
                popupPosition: null,
            };
        });
    }, []);

    /**
     * Mark a slot as filled and update its range.
     */
    const fillSlot = useCallback((slotId: string, newStartCol: number, newEndCol: number) => {
        setState(prev => {
            if (prev.phase !== 'filling') return prev;
            const placeholders = prev.placeholders.map(p =>
                p.slotId === slotId
                    ? { ...p, filled: true, startColumn: newStartCol, endColumn: newEndCol }
                    : p
            );

            // Check if all slots are filled
            const allFilled = placeholders.every(p => p.filled);

            if (allFilled) {
                // All done — close
                return { phase: 'closed' as const };
            }

            // Find next unfilled slot
            const nextUnfilled = placeholders.find(p => !p.filled);

            return {
                ...prev,
                placeholders,
                activeSlotId: nextUnfilled?.slotId ?? null,
                popupPosition: null, // popup will reposition when opened
            };
        });
    }, []);

    /**
     * Continuous mode: insert current line, open palette on next line.
     */
    const continueOnNextLine = useCallback((position: { x: number; y: number }, lineNumber: number) => {
        setState({
            phase: 'palette',
            position,
            lineNumber,
        });
    }, []);

    return {
        state,
        openPalette,
        close,
        selectAction,
        setPlaceholders,
        openSlotPopup,
        closeSlotPopup,
        fillSlot,
        continueOnNextLine,
    };
}
