/**
 * Custom hook for cell selection, VDQL query generation, and column summary.
 *
 * Manages multi-cell selection via Ctrl+click, generates VDQL queries from
 * selected cells, and calculates column summary statistics.
 */

import { useState, useCallback, useMemo } from 'react';
import type { CellClickedEvent } from 'ag-grid-community';
import type { DataColumn, DataRow } from './AGGridDataTable';
import { calculateColumnSummary, type ColumnSummary } from './agGridValidation';
import { buildCellExtractionQuery, type CellQueryPayload } from './canvas-v2/queryGeneratorUtils';
import type { GuidedColumn } from './canvas-v2/types';

export interface SelectedCell {
    rowIndex: number;
    column: string;
    value: unknown;
    columnType: DataColumn['type'];
}

interface UseCellSelectionParams {
    columns: DataColumn[];
    visibleRows: DataRow[];
    tableName: string;
    tableId?: string;
    onCellQueryGenerated?: (payload: CellQueryPayload | null) => void;
}

interface UseCellSelectionReturn {
    selectedCells: SelectedCell[];
    cellSelectionQuery: string;
    columnSummary: ColumnSummary | null;
    onCellClicked: (event: CellClickedEvent) => void;
    handleClearCellSelection: () => void;
    handleCopyCellQuery: () => Promise<void>;
    generateCellSelectionVDQL: (cells: SelectedCell[]) => void;
    updateColumnSummary: (cells: SelectedCell[]) => void;
    setCopied: (value: boolean) => void;
    copied: boolean;
}

export function useCellSelection({
    columns,
    visibleRows,
    tableName,
    tableId,
    onCellQueryGenerated,
}: UseCellSelectionParams): UseCellSelectionReturn {
    const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([]);
    const [cellSelectionQuery, setCellSelectionQuery] = useState<string>('');
    const [columnSummary, setColumnSummary] = useState<ColumnSummary | null>(null);
    const [copied, setCopied] = useState(false);

    const queryColumns = useMemo<GuidedColumn[]>(() => (
        columns.map((column) => ({
            name: column.name,
            type: column.type,
        }))
    ), [columns]);

    // Generate VDQL from selected cells
    const generateCellSelectionVDQL = useCallback((cells: SelectedCell[]) => {
        if (cells.length === 0) {
            setCellSelectionQuery('');
            return;
        }

        const pascalTableName = tableName
            .replace(/[^a-zA-Z0-9]/g, ' ')
            .split(' ')
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');

        // Group cells by what type of query makes sense
        const uniqueColumns = [...new Set(cells.map(c => c.column))];
        const uniqueRows = [...new Set(cells.map(c => c.rowIndex))];

        // If all cells are from same column - generate column filter
        if (uniqueColumns.length === 1 && cells.length > 1) {
            const col = uniqueColumns[0];
            const colType = cells[0].columnType;
            const values = cells.map(c => {
                if (colType === 'text' || colType === 'date') {
                    return `"${c.value}"`;
                }
                return c.value;
            });
            const query = `ROWS many FROM ${pascalTableName} WHERE ${col} IN [${values.join(', ')}]`;
            setCellSelectionQuery(query);
            return;
        }

        // If single cell - generate exact match query
        if (cells.length === 1) {
            const cell = cells[0];
            const formattedValue = (cell.columnType === 'text' || cell.columnType === 'date')
                ? `"${cell.value}"`
                : cell.value;

            // Also provide cell access syntax
            const queries = [
                `# Filter by value:`,
                `ROWS many FROM ${pascalTableName} WHERE ${cell.column} = ${formattedValue}`,
                ``,
                `# Extract a value from the first match:`,
                `ROW one FROM ${pascalTableName} WHERE ${cell.column} = ${formattedValue}`,
                `TEXT value = one.${cell.column}`,
            ];
            setCellSelectionQuery(queries.join('\n'));
            return;
        }

        // Multiple cells from different columns - generate AND conditions
        const conditions = cells.map(cell => {
            const formattedValue = (cell.columnType === 'text' || cell.columnType === 'date')
                ? `"${cell.value}"`
                : cell.value;
            return `${cell.column} = ${formattedValue}`;
        });

        // If same row, use AND; if different rows, show multiple queries
        if (uniqueRows.length === 1) {
            const query = `ROWS many FROM ${pascalTableName} WHERE ${conditions.join(' AND ')}`;
            setCellSelectionQuery(query);
        } else {
            // Multiple rows selected - use OR for each row's conditions
            const rowQueries = uniqueRows.map(rowIdx => {
                const rowCells = cells.filter(c => c.rowIndex === rowIdx);
                const rowConditions = rowCells.map(cell => {
                    const formattedValue = (cell.columnType === 'text' || cell.columnType === 'date')
                        ? `"${cell.value}"`
                        : cell.value;
                    return `${cell.column} = ${formattedValue}`;
                });
                return `(${rowConditions.join(' AND ')})`;
            });
            const query = `ROWS many FROM ${pascalTableName} WHERE ${rowQueries.join(' OR ')}`;
            setCellSelectionQuery(query);
        }
    }, [tableName]);

    // Calculate summary when cells in a column are selected
    const updateColumnSummary = useCallback((cells: SelectedCell[]) => {
        if (cells.length === 0) {
            setColumnSummary(null);
            return;
        }

        // Get the most recently selected column for summary
        const lastCell = cells[cells.length - 1];
        const colName = lastCell.column;
        const column = columns.find(c => c.name === colName);

        if (column) {
            const summary = calculateColumnSummary(colName, column.type, visibleRows);
            setColumnSummary(summary);
        }
    }, [columns, visibleRows]);

    // Handle cell click:
    // - regular click: edit/select cell
    // - Ctrl/Cmd+click: multi-select cells for summary/query bar
    // - Alt+click: open cell query generator
    const onCellClicked = useCallback((event: CellClickedEvent) => {
        const field = event.colDef.field;
        const mouseEvent = event.event as MouseEvent | undefined;

        // Ignore clicks on system columns
        if (!field || field.startsWith('_')) return;

        const column = columns.find(c => c.name === field);
        const cellData: SelectedCell = {
            rowIndex: event.rowIndex ?? 0,
            column: field,
            value: event.value,
            columnType: column?.type || 'text',
        };

        if (column && onCellQueryGenerated && Boolean(mouseEvent?.altKey)) {
            const rowPayload = (event.data || {}) as Record<string, unknown>;
            const sourceRowData: Record<string, unknown> = {};
            queryColumns.forEach((queryColumn) => {
                sourceRowData[queryColumn.name] = rowPayload[queryColumn.name];
            });

            const payload = buildCellExtractionQuery({
                tableId,
                tableName,
                rowId: String(rowPayload._id || ''),
                rowIndex: event.rowIndex ?? 0,
                rowData: sourceRowData,
                column: {
                    name: column.name,
                    type: column.type,
                },
                allColumns: queryColumns,
            });
            onCellQueryGenerated(payload);
        }

        if (mouseEvent && (mouseEvent.ctrlKey || mouseEvent.metaKey)) {
            // Ctrl+click: add to selection
            setSelectedCells(prev => {
                // Check if already selected (toggle off)
                const existingIndex = prev.findIndex(
                    c => c.rowIndex === cellData.rowIndex && c.column === cellData.column
                );
                if (existingIndex >= 0) {
                    const newCells = prev.filter((_, i) => i !== existingIndex);
                    generateCellSelectionVDQL(newCells);
                    updateColumnSummary(newCells);
                    return newCells;
                }
                const newCells = [...prev, cellData];
                generateCellSelectionVDQL(newCells);
                updateColumnSummary(newCells);
                return newCells;
            });
        } else {
            // Regular click: single selection
            setSelectedCells([cellData]);
            generateCellSelectionVDQL([cellData]);
            updateColumnSummary([cellData]);
        }
    }, [columns, generateCellSelectionVDQL, onCellQueryGenerated, queryColumns, tableId, tableName, updateColumnSummary]);

    // Clear cell selection
    const handleClearCellSelection = useCallback(() => {
        setSelectedCells([]);
        setCellSelectionQuery('');
        setColumnSummary(null);
    }, []);

    // Copy cell selection query
    const handleCopyCellQuery = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(cellSelectionQuery);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, [cellSelectionQuery]);

    return {
        selectedCells,
        cellSelectionQuery,
        columnSummary,
        onCellClicked,
        handleClearCellSelection,
        handleCopyCellQuery,
        generateCellSelectionVDQL,
        updateColumnSummary,
        setCopied,
        copied,
    };
}
