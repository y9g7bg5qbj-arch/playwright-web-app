/**
 * Custom hook for sheet, row, and column CRUD operations.
 *
 * Extracted from TestDataPage to reduce component size.
 * Manages all data-fetching, mutation, import/export, and related modal state.
 */

import { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { apiUrl } from '@/config';
import type { DataColumn as AGDataColumn, AGGridDataTableHandle } from './AGGridDataTable';
import type { BulkUpdate } from './BulkUpdateModal';
import {
    testDataApi,
    isTestDataValidationError,
    type ImportResult,
} from '@/api/testData';
import type { DataSheet, DataColumn, DataRow, SheetOperations } from './testDataTypes';
import { formatValidationIssue, formatServerError } from './testDataUtils';

interface UseSheetOperationsParams {
    projectId: string;
    nestedProjectId?: string | null;
}

export function useSheetOperations({
    projectId,
    nestedProjectId,
}: UseSheetOperationsParams): SheetOperations {
    // State
    const [sheets, setSheets] = useState<DataSheet[]>([]);
    const sheetsRef = useRef<DataSheet[]>(sheets);
    sheetsRef.current = sheets;
    const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
    const [selectedSheet, setSelectedSheet] = useState<DataSheet | null>(null);
    const [rows, setRows] = useState<DataRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingRows, setLoadingRows] = useState(false);
    const gridHandleRef = useRef<AGGridDataTableHandle | null>(null);

    // Modals
    const [showSheetForm, setShowSheetForm] = useState(false);
    const [editingSheet, setEditingSheet] = useState<DataSheet | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showCSVImportModal, setShowCSVImportModal] = useState(false);
    const [showColumnEditor, setShowColumnEditor] = useState(false);
    const [editingColumn, setEditingColumn] = useState<AGDataColumn | null>(null);
    const [showQualityReport, setShowQualityReport] = useState(false);
    const [showEnvironments, setShowEnvironments] = useState(false);
    const [showDataStorageSettings, setShowDataStorageSettings] = useState(false);

    // Messages
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const showSuccess = (message: string) => {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const showError = (message: string) => {
        setErrorMessage(message);
        setTimeout(() => setErrorMessage(null), 5000);
    };

    // Fetch all sheets
    const fetchSheets = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('projectId', projectId);
            if (nestedProjectId) {
                params.set('nestedProjectId', nestedProjectId);
            }

            const res = await fetch(apiUrl(`/api/test-data/sheets?${params.toString()}`));
            const data = await res.json();
            if (data.success) {
                let nextSheets = data.sheets as DataSheet[];

                // If nested scope has no tables, fall back to app-level tables.
                if (nestedProjectId && nextSheets.length === 0) {
                    const fallbackRes = await fetch(apiUrl(`/api/test-data/sheets?projectId=${projectId}`));
                    const fallbackData = await fallbackRes.json();
                    if (fallbackData.success) {
                        nextSheets = fallbackData.sheets as DataSheet[];
                    }
                }

                setSheets(nextSheets);
                // Auto-select first sheet if none selected
                if (nextSheets.length > 0) {
                    setSelectedSheetId((prev) => prev ?? nextSheets[0].id);
                }
            }
        } catch (err) {
            console.error('Failed to fetch sheets:', err);
            showError('Failed to load test data sheets');
        } finally {
            setLoading(false);
        }
    }, [nestedProjectId, projectId]);

    // Fetch rows for selected sheet
    const fetchRows = useCallback(async (sheetId: string) => {
        setLoadingRows(true);
        try {
            const params = new URLSearchParams();
            params.set('projectId', projectId);
            const table = sheetsRef.current.find((entry) => entry.id === sheetId);
            const shouldUseNestedScope = Boolean(table?.projectId) && Boolean(nestedProjectId);
            if (shouldUseNestedScope && nestedProjectId) {
                params.set('nestedProjectId', nestedProjectId);
            }

            const res = await fetch(apiUrl(`/api/test-data/sheets/${sheetId}?${params.toString()}`));
            const data = await res.json();
            if (data.success) {
                setSelectedSheet(data.sheet);
                setRows(data.sheet.rows);
            }
        } catch (err) {
            console.error('Failed to fetch rows:', err);
            showError('Failed to load sheet data');
        } finally {
            setLoadingRows(false);
        }
    }, [nestedProjectId, projectId]);

    // Sheet handlers
    const handleCreateSheet = async (name: string, pageObject: string, description: string, columns: DataColumn[]) => {
        if (!projectId) {
            console.error('handleCreateSheet: projectId is missing or undefined');
            showError('Cannot create sheet: No project selected. Please select a project first.');
            return;
        }

        try {
            const res = await fetch(apiUrl('/api/test-data/sheets'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    nestedProjectId: nestedProjectId || undefined,
                    name,
                    pageObject,
                    description,
                    columns
                })
            });
            const data = await res.json();
            if (data.success) {
                showSuccess(`Sheet "${name}" created`);
                fetchSheets();
                setSelectedSheetId(data.sheet.id);
            } else {
                showError(data.error || 'Failed to create sheet');
            }
        } catch (err) {
            showError('Failed to create sheet');
        }
        setShowSheetForm(false);
        setEditingSheet(null);
    };

    const handleUpdateSheet = async (id: string, updates: Partial<DataSheet>) => {
        const existingSheet = sheets.find((entry) => entry.id === id);
        const shouldUseNestedScope = Boolean(existingSheet?.projectId) && Boolean(nestedProjectId);
        try {
            const res = await fetch(apiUrl(`/api/test-data/sheets/${id}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...updates,
                    projectId,
                    nestedProjectId: shouldUseNestedScope ? nestedProjectId : undefined,
                })
            });
            const data = await res.json();
            if (data.success) {
                showSuccess('Sheet updated');
                fetchSheets();
                if (selectedSheetId === id) {
                    fetchRows(id);
                }
            } else {
                showError(data.error || 'Failed to update sheet');
            }
        } catch (err) {
            showError('Failed to update sheet');
        }
        setShowSheetForm(false);
        setEditingSheet(null);
    };

    const handleDeleteSheet = async (id: string) => {
        if (!confirm('Delete this data table and all its rows? This cannot be undone.')) {
            return;
        }

        const existingSheet = sheets.find((entry) => entry.id === id);
        const shouldUseNestedScope = Boolean(existingSheet?.projectId) && Boolean(nestedProjectId);

        try {
            const params = new URLSearchParams();
            params.set('projectId', projectId);
            if (shouldUseNestedScope && nestedProjectId) {
                params.set('nestedProjectId', nestedProjectId);
            }
            const res = await fetch(apiUrl(`/api/test-data/sheets/${id}?${params.toString()}`), {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                showSuccess('Sheet deleted');
                if (selectedSheetId === id) {
                    setSelectedSheetId(null);
                }
                fetchSheets();
            }
        } catch (err) {
            showError('Failed to delete sheet');
        }
    };

    // Row handlers
    const handleAddRow = async () => {
        console.log('[handleAddRow] Called, selectedSheet:', selectedSheet?.id);
        if (!selectedSheet) {
            console.log('[handleAddRow] No sheet selected, returning');
            return;
        }

        const defaultData: Record<string, any> = {};
        selectedSheet.columns.forEach(col => {
            defaultData[col.name] = col.type === 'boolean' ? false : '';
        });

        // Find the maximum existing scenario ID number to avoid duplicates
        let maxIdNumber = 0;
        rows.forEach(row => {
            const match = row.scenarioId?.match(/^TC(\d+)$/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxIdNumber) {
                    maxIdNumber = num;
                }
            }
        });
        const nextScenarioId = `TC${String(maxIdNumber + 1).padStart(3, '0')}`;

        try {
            console.log('[handleAddRow] Making API request to add row with scenarioId:', nextScenarioId);
            const res = await fetch(apiUrl(`/api/test-data/sheets/${selectedSheet.id}/rows`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scenarioId: nextScenarioId,
                    data: defaultData,
                    enabled: true
                })
            });
            const data = await res.json();
            console.log('[handleAddRow] API response:', data);
            if (data.success) {
                console.log('[handleAddRow] Success! Adding row to state');
                setRows([...rows, data.row]);
            } else if (res.status === 409) {
                showError(data.error || 'A row with this Test ID already exists');
            } else if (res.status === 422) {
                showError(formatServerError(data, 'Invalid value for row creation.'));
            } else if (data.error || data.message) {
                showError(formatServerError(data, 'Failed to add row'));
            }
        } catch (err) {
            console.error('[handleAddRow] Error:', err);
            showError('Failed to add row');
        }
    };

    const handleUpdateRow = async (rowId: string, updates: Partial<DataRow>) => {
        try {
            const res = await fetch(apiUrl(`/api/test-data/rows/${rowId}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            const data = await res.json();
            if (data.success) {
                setRows(rows.map(r => r.id === rowId ? { ...r, ...data.row } : r));
            } else {
                showError(formatServerError(data, 'Failed to update row'));
            }
        } catch (err) {
            console.error('Failed to update row:', err);
            showError('Failed to update row');
        }
    };

    const handleDeleteRow = async (rowId: string) => {
        try {
            const res = await fetch(apiUrl(`/api/test-data/rows/${rowId}`), {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setRows(rows.filter(r => r.id !== rowId));
            }
        } catch (err) {
            showError('Failed to delete row');
        }
    };

    // Import handler
    const handleImportComplete = (result: ImportResult) => {
        const totalRows = (result.sheets || []).reduce((sum, sheet) => sum + (sheet.rows || 0), 0);
        showSuccess(`Imported ${result.sheets.length} sheet(s), ${totalRows} row(s)`);
        setShowImportModal(false);
        fetchSheets();
    };

    // Export CSV handler
    const handleExportCSV = () => {
        if (!selectedSheet || rows.length === 0) return;

        const csvData = rows.map(row => {
            const rowData: Record<string, any> = { TestID: row.scenarioId };
            selectedSheet.columns.forEach(col => {
                rowData[col.name] = row.data[col.name] ?? '';
            });
            rowData['enabled'] = row.enabled;
            return rowData;
        });

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedSheet.name}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // CSV Import handler
    const handleCSVImport = async (importedRows: Record<string, any>[], newColumns?: AGDataColumn[]) => {
        if (!selectedSheet) return;

        // Add new columns if any
        if (newColumns && newColumns.length > 0) {
            const updatedColumns: DataColumn[] = [
                ...selectedSheet.columns,
                ...newColumns.map(col => ({
                    name: col.name,
                    type: col.type === 'text' ? 'string' as const : col.type as DataColumn['type'],
                    required: false
                }))
            ];
            await handleUpdateSheet(selectedSheet.id, { columns: updatedColumns });
        }

        // Bulk add rows
        try {
            const res = await fetch(apiUrl(`/api/test-data/sheets/${selectedSheet.id}/rows/bulk`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rows: importedRows.map((rowData, idx) => ({
                        scenarioId: `TC${String(rows.length + idx + 1).padStart(3, '0')}`,
                        data: rowData,
                        enabled: true
                    }))
                })
            });
            const data = await res.json();
            if (data.success) {
                showSuccess(`Imported ${importedRows.length} rows`);
                fetchRows(selectedSheet.id);
            } else {
                showError(formatServerError(data, 'Failed to import rows'));
            }
        } catch (err) {
            showError('Failed to import rows');
        }
    };

    // Column handlers for AG Grid
    const handleAddColumn = () => {
        setEditingColumn(null);
        setShowColumnEditor(true);
    };

    const handleEditColumn = (columnName: string) => {
        if (!selectedSheet) return;
        const col = selectedSheet.columns.find(c => c.name === columnName);
        if (!col) return;

        const editColumn: AGDataColumn = {
            name: col.name,
            type: col.type === 'string' ? 'text' : col.type as AGDataColumn['type'],
            required: col.required,
            validation: col.validation,
            min: col.min,
            max: col.max,
            minLength: col.minLength,
            maxLength: col.maxLength,
            pattern: col.pattern,
            enum: col.enum,
            formula: (col as any).formula,
            referenceConfig: (col as any).referenceConfig,
        };
        setEditingColumn(editColumn);
        setShowColumnEditor(true);
    };

    const handleSaveColumn = async (column: AGDataColumn) => {
        if (!selectedSheet) return;

        const newColumn: DataColumn = {
            name: column.name,
            type: column.type === 'text' ? 'string' : column.type as DataColumn['type'],
            required: column.required || false,
            validation: column.validation,
            min: column.min,
            max: column.max,
            minLength: column.minLength,
            maxLength: column.maxLength,
            pattern: column.pattern,
            enum: column.enum,
            ...(column.formula && { formula: column.formula }),
            ...(column.referenceConfig && { referenceConfig: column.referenceConfig }),
        };

        if (editingColumn) {
            const oldName = editingColumn.name;
            const nameChanged = oldName !== column.name;

            const updatedColumns = selectedSheet.columns.map(c =>
                c.name === oldName ? newColumn : c
            );
            await handleUpdateSheet(selectedSheet.id, { columns: updatedColumns });

            // Migrate row data keys when column is renamed
            if (nameChanged) {
                const updatedRows = rows.map(r => {
                    if (!(oldName in r.data)) return r;
                    const newData = { ...r.data };
                    newData[column.name] = newData[oldName];
                    delete newData[oldName];
                    return { ...r, data: newData };
                });
                const changedRows = updatedRows.filter((r, i) => r !== rows[i]);
                for (const row of changedRows) {
                    await handleUpdateRow(row.id, { data: row.data });
                }
                setRows(updatedRows);
            }
        } else {
            await handleUpdateSheet(selectedSheet.id, {
                columns: [...selectedSheet.columns, newColumn]
            });
        }
        setEditingColumn(null);
    };

    const handleRemoveColumn = async (columnName: string) => {
        if (!selectedSheet) return;
        if (!confirm(`Remove column "${columnName}"? Data in this column will be lost.`)) return;

        const updatedColumns = selectedSheet.columns.filter(c => c.name !== columnName);
        await handleUpdateSheet(selectedSheet.id, { columns: updatedColumns });
    };

    const handleRenameColumn = async (oldName: string, newName: string) => {
        if (!selectedSheet) return;

        const updatedColumns = selectedSheet.columns.map(c =>
            c.name === oldName ? { ...c, name: newName } : c
        );

        const updatedRows = rows.map(r => {
            const newData = { ...r.data };
            if (oldName in newData) {
                newData[newName] = newData[oldName];
                delete newData[oldName];
            }
            return { ...r, data: newData };
        });

        await handleUpdateSheet(selectedSheet.id, { columns: updatedColumns });
        for (const row of updatedRows) {
            await handleUpdateRow(row.id, { data: row.data });
        }
    };

    const handleColumnTypeChange = async (columnName: string, newType: AGDataColumn['type']) => {
        if (!selectedSheet) return;

        const updatedColumns = selectedSheet.columns.map(c =>
            c.name === columnName ? { ...c, type: newType === 'text' ? 'string' as const : newType } : c
        );
        await handleUpdateSheet(selectedSheet.id, { columns: updatedColumns });
    };

    // Bulk operations for AG Grid
    const handleBulkDeleteRows = async (rowIds: string[]) => {
        if (!selectedSheet) return;
        try {
            const deleted = await testDataApi.bulkDeleteRows(selectedSheet.id, rowIds);
            setRows(rows.filter(r => !rowIds.includes(r.id)));
            showSuccess(`Deleted ${deleted} rows`);
        } catch (err) {
            if (isTestDataValidationError(err)) {
                showError(formatValidationIssue(err.validationErrors || [], err.message || 'Validation failed'));
            } else {
                showError('Failed to delete rows');
            }
        }
    };

    const handleDuplicateRows = async (rowIds: string[]) => {
        if (!selectedSheet) return;
        try {
            const newRows = await testDataApi.duplicateRows(selectedSheet.id, rowIds);
            const formattedRows: DataRow[] = newRows.map(r => ({
                id: r.id,
                sheetId: r.sheetId,
                scenarioId: r.scenarioId,
                data: r.data,
                enabled: r.enabled,
                createdAt: r.createdAt || new Date().toISOString(),
                updatedAt: r.updatedAt || new Date().toISOString(),
            }));
            setRows([...rows, ...formattedRows]);
            showSuccess(`Duplicated ${newRows.length} rows`);
        } catch (err) {
            if (isTestDataValidationError(err)) {
                showError(formatValidationIssue(err.validationErrors || [], err.message || 'Validation failed'));
            } else {
                showError('Failed to duplicate rows');
            }
        }
    };

    const handleFillSeries = async (
        rowIds: string[],
        columnId: string,
        fillType: 'value' | 'sequence' | 'pattern',
        options: { value?: string; startValue?: number; step?: number; pattern?: string }
    ) => {
        if (!selectedSheet) return;
        try {
            const updated = await testDataApi.fillSeries(selectedSheet.id, rowIds, columnId, fillType, options);
            fetchRows(selectedSheet.id);
            showSuccess(`Filled ${updated} cells`);
        } catch (err) {
            if (isTestDataValidationError(err)) {
                showError(formatValidationIssue(err.validationErrors || [], err.message || 'Validation failed'));
            } else {
                showError('Failed to fill series');
            }
        }
    };

    const handleBulkPaste = async (pastedRows: Record<string, any>[]) => {
        if (!selectedSheet) return;

        try {
            const res = await fetch(apiUrl(`/api/test-data/sheets/${selectedSheet.id}/rows/bulk`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rows: pastedRows.map((data, idx) => ({
                        scenarioId: `TC${String(rows.length + idx + 1).padStart(3, '0')}`,
                        data,
                        enabled: true
                    }))
                })
            });
            const data = await res.json();
            if (data.success) {
                showSuccess(`Added ${pastedRows.length} rows`);
                fetchRows(selectedSheet.id);
            } else {
                showError(formatServerError(data, 'Failed to paste rows'));
            }
        } catch (err) {
            showError('Failed to paste rows');
        }
    };

    const handleCellChange = async (rowId: string, columnName: string, value: any) => {
        const row = rows.find(r => r.id === rowId);
        if (!row) return;

        const updatedData = { ...row.data, [columnName]: value };
        await handleUpdateRow(rowId, { data: updatedData });
    };

    const handleGenerateColumnData = async (columnName: string, values: (string | number | boolean)[]) => {
        if (!selectedSheet) return;

        const updatedRows = rows.map((row, index) => ({
            ...row,
            data: {
                ...row.data,
                [columnName]: values[index] ?? row.data[columnName]
            }
        }));

        try {
            await Promise.all(
                updatedRows.map((row, index) => {
                    if (values[index] !== undefined) {
                        return handleUpdateRow(row.id, { data: row.data });
                    }
                    return Promise.resolve();
                })
            );
            setRows(updatedRows);
            showSuccess(`Generated ${values.length} values for "${columnName}"`);
        } catch (err) {
            showError('Failed to generate column data');
        }
    };

    const handleBulkUpdate = async (updates: BulkUpdate[]) => {
        if (!selectedSheet || updates.length === 0) return;

        try {
            const rowUpdates = new Map<string, Record<string, any>>();
            for (const update of updates) {
                const row = rows.find(r => r.id === update.rowId);
                if (row) {
                    const existing = rowUpdates.get(update.rowId) || { ...row.data };
                    existing[update.columnName] = update.newValue;
                    rowUpdates.set(update.rowId, existing);
                }
            }

            const res = await fetch(apiUrl(`/api/test-data/sheets/${selectedSheet.id}/rows/bulk-update`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    updates: Array.from(rowUpdates.entries()).map(([rowId, data]) => ({
                        rowId,
                        data
                    }))
                })
            });

            const data = await res.json();
            if (data.success) {
                setRows(rows.map(row => {
                    const newData = rowUpdates.get(row.id);
                    return newData ? { ...row, data: newData } : row;
                }));
                showSuccess(`Updated ${rowUpdates.size} rows`);
            } else {
                showError(formatServerError(data, 'Failed to update rows'));
            }
        } catch (err) {
            console.error('Bulk update error:', err);
            showError('Failed to update rows');
        }
    };

    return {
        sheets,
        selectedSheetId,
        setSelectedSheetId,
        selectedSheet,
        rows,
        setRows,
        loading,
        loadingRows,
        sheetsRef,
        gridHandleRef,

        successMessage,
        errorMessage,
        showSuccess,
        showError,

        fetchSheets,
        fetchRows,

        handleCreateSheet,
        handleUpdateSheet,
        handleDeleteSheet,

        handleAddRow,
        handleUpdateRow,
        handleDeleteRow,
        handleBulkDeleteRows,
        handleDuplicateRows,
        handleFillSeries,
        handleBulkPaste,
        handleCellChange,
        handleGenerateColumnData,
        handleBulkUpdate,

        handleAddColumn,
        handleEditColumn,
        handleSaveColumn,
        handleRemoveColumn,
        handleRenameColumn,
        handleColumnTypeChange,

        handleImportComplete,
        handleExportCSV,
        handleCSVImport,

        showSheetForm,
        setShowSheetForm,
        editingSheet,
        setEditingSheet,
        showImportModal,
        setShowImportModal,
        showCSVImportModal,
        setShowCSVImportModal,
        showColumnEditor,
        setShowColumnEditor,
        editingColumn,
        setEditingColumn,
        showQualityReport,
        setShowQualityReport,
        showEnvironments,
        setShowEnvironments,
        showDataStorageSettings,
        setShowDataStorageSettings,
    };
}
