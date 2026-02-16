/**
 * Custom hook for cell and conditional formatting state management.
 *
 * Manages per-cell formatting (background color, text color, font weight, alignment)
 * and conditional formatting rules applied across columns.
 */

import { useState, useCallback } from 'react';
import type { CellFormat } from './CellFormattingModal';
import type { ConditionalFormatRule } from './ConditionalFormattingModal';
import type { DataRow } from './AGGridDataTable';
import type { SelectedCell } from './useCellSelection';

interface UseCellFormattingParams {
    visibleRows: DataRow[];
}

interface UseCellFormattingReturn {
    // Cell formatting state
    cellFormats: Record<string, CellFormat>;
    showFormattingModal: boolean;
    setShowFormattingModal: (show: boolean) => void;
    formattingTarget: { rowId: string; column: string; value: string } | null;
    setFormattingTarget: (target: { rowId: string; column: string; value: string } | null) => void;
    handleOpenFormattingModal: (selectedCells: SelectedCell[]) => void;
    handleApplyCellFormat: (format: CellFormat, selectedCells: SelectedCell[]) => void;
    handleClearCellFormat: (selectedCells: SelectedCell[]) => void;
    // Conditional formatting state
    conditionalRules: ConditionalFormatRule[];
    setConditionalRules: (rules: ConditionalFormatRule[]) => void;
    showConditionalModal: boolean;
    setShowConditionalModal: (show: boolean) => void;
}

export function useCellFormatting({
    visibleRows,
}: UseCellFormattingParams): UseCellFormattingReturn {
    // Cell formatting state - key is "rowId:columnName"
    const [cellFormats, setCellFormats] = useState<Record<string, CellFormat>>({});
    const [showFormattingModal, setShowFormattingModal] = useState(false);
    const [formattingTarget, setFormattingTarget] = useState<{ rowId: string; column: string; value: string } | null>(null);

    // Conditional formatting state
    const [conditionalRules, setConditionalRules] = useState<ConditionalFormatRule[]>([]);
    const [showConditionalModal, setShowConditionalModal] = useState(false);

    const handleOpenFormattingModal = useCallback((selectedCells: SelectedCell[]) => {
        if (selectedCells.length > 0) {
            const firstCell = selectedCells[0];
            const row = visibleRows.find((_, idx) => idx === firstCell.rowIndex);
            if (row) {
                setFormattingTarget({
                    rowId: row.id,
                    column: firstCell.column,
                    value: String(firstCell.value ?? ''),
                });
                setShowFormattingModal(true);
            }
        }
    }, [visibleRows]);

    const handleApplyCellFormat = useCallback((format: CellFormat, selectedCells: SelectedCell[]) => {
        if (!formattingTarget) return;

        // Apply format to all selected cells
        const newFormats = { ...cellFormats };
        selectedCells.forEach(cell => {
            const row = visibleRows.find((_, idx) => idx === cell.rowIndex);
            if (row) {
                const key = `${row.id}:${cell.column}`;
                newFormats[key] = format;
            }
        });
        setCellFormats(newFormats);
        setShowFormattingModal(false);
        setFormattingTarget(null);
    }, [formattingTarget, visibleRows, cellFormats]);

    const handleClearCellFormat = useCallback((selectedCells: SelectedCell[]) => {
        if (!formattingTarget) return;

        // Clear format from all selected cells
        const newFormats = { ...cellFormats };
        selectedCells.forEach(cell => {
            const row = visibleRows.find((_, idx) => idx === cell.rowIndex);
            if (row) {
                const key = `${row.id}:${cell.column}`;
                delete newFormats[key];
            }
        });
        setCellFormats(newFormats);
        setShowFormattingModal(false);
        setFormattingTarget(null);
    }, [formattingTarget, visibleRows, cellFormats]);

    return {
        cellFormats,
        showFormattingModal,
        setShowFormattingModal,
        formattingTarget,
        setFormattingTarget,
        handleOpenFormattingModal,
        handleApplyCellFormat,
        handleClearCellFormat,
        conditionalRules,
        setConditionalRules,
        showConditionalModal,
        setShowConditionalModal,
    };
}
