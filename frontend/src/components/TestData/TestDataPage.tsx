/**
 * Test Data Management Page
 *
 * Main page for managing test data sheets, rows, and Excel import/export.
 * Provides Excel-like grid editing with AG Grid and CSV support.
 */

import { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import {
    Plus, Upload, Download, RefreshCw, Settings,
    Check, AlertTriangle, MoreHorizontal, Database
} from 'lucide-react';
import { apiUrl } from '@/config';
import { SheetList } from './SheetList';
import { AGGridDataTable, DataColumn as AGDataColumn } from './AGGridDataTable';
import type { SortLevel } from './MultiSortModal';
import type { BulkUpdate } from './BulkUpdateModal';
import { SheetForm } from './SheetForm';
import { ImportExcelModal } from './ImportExcelModal';
import { ImportCSVModal } from './ImportCSVModal';
import { ColumnEditorModal } from './ColumnEditorModal';
import { EnvironmentManager } from './EnvironmentManager';
import { SavedViewsDropdown } from './SavedViewsDropdown';
import { testDataApi } from '@/api/testData';
import type { SavedView } from '@/api/testData';
import { DataStorageSettingsModal } from '@/components/settings/DataStorageSettingsModal';
import { Modal } from '@/components/ui/Modal';

// ============================================
// TYPES
// ============================================

export interface ReferenceConfig {
    targetSheet: string;
    targetColumn: string;
    displayColumn: string;
    allowMultiple: boolean;
    separator?: string;
}

export interface DataColumn {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'formula' | 'reference';
    required: boolean;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    formula?: string; // For computed columns
    referenceConfig?: ReferenceConfig; // For reference columns
}

export interface DataSheet {
    id: string;
    name: string;
    pageObject?: string;
    description?: string;
    columns: DataColumn[];
    rowCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface DataRow {
    id: string;
    sheetId: string;
    scenarioId: string;
    data: Record<string, any>;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
}

interface TestDataPageProps {
    projectId: string;
}

// ============================================
// HELPERS
// ============================================

/**
 * Map backend column type strings to AGGridDataTable's type union.
 * Backend uses 'string' while the grid uses 'text'. This function
 * validates the type and defaults to 'text' for unknown values.
 */
function mapColumnType(backendType: string): AGDataColumn['type'] {
    const typeMap: Record<string, AGDataColumn['type']> = {
        'string': 'text',
        'text': 'text',
        'number': 'number',
        'boolean': 'boolean',
        'date': 'date',
        'formula': 'formula',
        'reference': 'reference',
    };
    const mapped = typeMap[backendType];
    if (!mapped) {
        console.warn(`[TestData] Unknown column type "${backendType}", defaulting to "text"`);
    }
    return mapped || 'text';
}

// ============================================
// COMPONENT
// ============================================

export function TestDataPage({ projectId }: TestDataPageProps) {
    // State
    const [sheets, setSheets] = useState<DataSheet[]>([]);
    const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
    const [selectedSheet, setSelectedSheet] = useState<DataSheet | null>(null);
    const [rows, setRows] = useState<DataRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingRows, setLoadingRows] = useState(false);

    // Modals
    const [showSheetForm, setShowSheetForm] = useState(false);
    const [editingSheet, setEditingSheet] = useState<DataSheet | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showCSVImportModal, setShowCSVImportModal] = useState(false);
    const [showColumnEditor, setShowColumnEditor] = useState(false);
    const [editingColumn, setEditingColumn] = useState<AGDataColumn | null>(null);
    const [showEnvironments, setShowEnvironments] = useState(false);
    const [showDataStorageSettings, setShowDataStorageSettings] = useState(false);

    // Saved views state - captured from grid for saving
    const [currentFilterState, setCurrentFilterState] = useState<Record<string, unknown>>({});
    const [currentSortState, setCurrentSortState] = useState<unknown[]>([]);
    const [currentColumnState, setCurrentColumnState] = useState<unknown[]>([]);

    // External view state - pushed to grid when loading a saved view
    const [externalSortState, setExternalSortState] = useState<SortLevel[] | undefined>(undefined);
    const [externalFilterState, setExternalFilterState] = useState<Record<string, unknown> | undefined>(undefined);

    // Sidebar dropdown
    const [showSidebarMenu, setShowSidebarMenu] = useState(false);

    // Messages
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Fetch all sheets
    const fetchSheets = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(apiUrl(`/api/test-data/sheets?projectId=${projectId}`));
            const data = await res.json();
            if (data.success) {
                setSheets(data.sheets);
                // Auto-select first sheet if none selected
                if (!selectedSheetId && data.sheets.length > 0) {
                    setSelectedSheetId(data.sheets[0].id);
                }
            }
        } catch (err) {
            console.error('Failed to fetch sheets:', err);
            showError('Failed to load test data sheets');
        } finally {
            setLoading(false);
        }
    }, [projectId, selectedSheetId]);

    // Fetch rows for selected sheet
    const fetchRows = useCallback(async (sheetId: string) => {
        setLoadingRows(true);
        try {
            const res = await fetch(apiUrl(`/api/test-data/sheets/${sheetId}`));
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
    }, []);

    useEffect(() => {
        fetchSheets();
    }, [fetchSheets]);

    useEffect(() => {
        if (selectedSheetId) {
            fetchRows(selectedSheetId);
        } else {
            setSelectedSheet(null);
            setRows([]);
        }
    }, [selectedSheetId, fetchRows]);

    // Show messages
    const showSuccess = (message: string) => {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const showError = (message: string) => {
        setErrorMessage(message);
        setTimeout(() => setErrorMessage(null), 5000);
    };

    // Sheet handlers
    const handleCreateSheet = async (name: string, pageObject: string, description: string, columns: DataColumn[]) => {
        // Validate projectId before making API call
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
        try {
            const res = await fetch(apiUrl(`/api/test-data/sheets/${id}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
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

        try {
            const res = await fetch(apiUrl(`/api/test-data/sheets/${id}`), {
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
            } else if (data.error) {
                showError(data.error);
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
            }
        } catch (err) {
            console.error('Failed to update row:', err);
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
    const handleImportComplete = (result: any) => {
        showSuccess(`Imported ${result.sheets.length} sheets`);
        setShowImportModal(false);
        fetchSheets();
    };

    // Export Excel handler
    const handleExport = async () => {
        try {
            const url = apiUrl(`/api/test-data/export?projectId=${projectId}`);
            window.open(url, '_blank');
        } catch (err) {
            showError('Failed to export');
        }
    };

    // Export CSV handler
    const handleExportCSV = () => {
        if (!selectedSheet || rows.length === 0) return;

        // Convert rows to CSV format
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
                showError(data.error || 'Failed to import rows');
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

    // Edit existing column handler
    const handleEditColumn = (columnName: string) => {
        if (!selectedSheet) return;
        const col = selectedSheet.columns.find(c => c.name === columnName);
        if (!col) return;

        // Convert to AGDataColumn format
        const editColumn: AGDataColumn = {
            name: col.name,
            type: col.type === 'string' ? 'text' : col.type as AGDataColumn['type'],
            required: col.required,
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
            ...(column.formula && { formula: column.formula }),
            ...(column.referenceConfig && { referenceConfig: column.referenceConfig }),
        };

        if (editingColumn) {
            // Update existing column
            const updatedColumns = selectedSheet.columns.map(c =>
                c.name === editingColumn.name ? newColumn : c
            );
            await handleUpdateSheet(selectedSheet.id, { columns: updatedColumns });
        } else {
            // Add new column
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

        // Also update row data
        const updatedRows = rows.map(r => {
            const newData = { ...r.data };
            if (oldName in newData) {
                newData[newName] = newData[oldName];
                delete newData[oldName];
            }
            return { ...r, data: newData };
        });

        await handleUpdateSheet(selectedSheet.id, { columns: updatedColumns });
        // Update rows with new column name
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
            showError('Failed to delete rows');
        }
    };

    // Duplicate selected rows
    const handleDuplicateRows = async (rowIds: string[]) => {
        if (!selectedSheet) return;
        try {
            const newRows = await testDataApi.duplicateRows(selectedSheet.id, rowIds);
            // Add the new rows to state with proper DataRow structure
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
            showError('Failed to duplicate rows');
        }
    };

    // Fill series for selected rows and column
    const handleFillSeries = async (
        rowIds: string[],
        columnId: string,
        fillType: 'value' | 'sequence' | 'pattern',
        options: { value?: string; startValue?: number; step?: number; pattern?: string }
    ) => {
        if (!selectedSheet) return;
        try {
            const updated = await testDataApi.fillSeries(selectedSheet.id, rowIds, columnId, fillType, options);
            // Refresh rows to get updated data
            fetchRows(selectedSheet.id);
            showSuccess(`Filled ${updated} cells`);
        } catch (err) {
            showError('Failed to fill series');
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
            }
        } catch (err) {
            showError('Failed to paste rows');
        }
    };

    // Cell change handler for AG Grid
    const handleCellChange = async (rowId: string, columnName: string, value: any) => {
        const row = rows.find(r => r.id === rowId);
        if (!row) return;

        const updatedData = { ...row.data, [columnName]: value };
        await handleUpdateRow(rowId, { data: updatedData });
    };

    // Generate column data handler for AG Grid
    const handleGenerateColumnData = async (columnName: string, values: (string | number | boolean)[]) => {
        if (!selectedSheet) return;

        // Update each row with the generated value
        const updatedRows = rows.map((row, index) => ({
            ...row,
            data: {
                ...row.data,
                [columnName]: values[index] ?? row.data[columnName]
            }
        }));

        // Batch update all rows
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

    // Bulk update handler for AG Grid
    const handleBulkUpdate = async (updates: BulkUpdate[]) => {
        if (!selectedSheet || updates.length === 0) return;

        try {
            // Group updates by row for the API
            const rowUpdates = new Map<string, Record<string, any>>();
            for (const update of updates) {
                const row = rows.find(r => r.id === update.rowId);
                if (row) {
                    const existing = rowUpdates.get(update.rowId) || { ...row.data };
                    existing[update.columnName] = update.newValue;
                    rowUpdates.set(update.rowId, existing);
                }
            }

            // Use the bulk update API endpoint
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
                // Update local state
                setRows(rows.map(row => {
                    const newData = rowUpdates.get(row.id);
                    return newData ? { ...row, data: newData } : row;
                }));
                showSuccess(`Updated ${rowUpdates.size} rows`);
            } else {
                showError(data.error || 'Failed to update rows');
            }
        } catch (err) {
            console.error('Bulk update error:', err);
            showError('Failed to update rows');
        }
    };

    return (
        <div className="relative flex h-full overflow-hidden bg-dark-canvas">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-28 -top-20 h-72 w-72 rounded-full bg-brand-primary/10 blur-3xl" />
                <div className="absolute -right-28 bottom-0 h-72 w-72 rounded-full bg-status-info/10 blur-3xl" />
            </div>

            <div className="relative z-10 flex h-full w-full">
                {/* Left Sidebar - Sheet List */}
                <div className="flex w-72 shrink-0 flex-col border-r border-border-default bg-dark-bg/90 backdrop-blur-sm">
                    <div className="border-b border-border-default px-3 py-3">
                        <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="rounded-md border border-brand-primary/25 bg-brand-primary/15 p-1.5">
                                    <Database className="h-4 w-4 text-brand-secondary" />
                                </div>
                                <div>
                                    <h1 className="text-sm font-semibold tracking-tight text-text-primary">Data Tables</h1>
                                    <p className="text-xxs text-text-muted">Spreadsheet editing for VeroScript data</p>
                                </div>
                            </div>
                            <span className="rounded-md border border-border-default bg-dark-elevated/70 px-2 py-0.5 text-xxs text-text-secondary">
                                {sheets.length} {sheets.length === 1 ? 'table' : 'tables'}
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setShowSheetForm(true)}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-gradient-to-b from-brand-primary to-[#2c5fd9] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:brightness-110"
                                title="Create a new data table"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                New Table
                            </button>

                            <button
                                onClick={() => setShowDataStorageSettings(true)}
                                className="flex items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-300 transition-all hover:bg-emerald-500/20"
                                title="Configure data storage provider"
                            >
                                <Database className="h-3.5 w-3.5" />
                                DB
                            </button>

                            <div className="relative">
                                <button
                                    onClick={() => setShowSidebarMenu(!showSidebarMenu)}
                                    className="rounded-md border border-border-default bg-dark-elevated/70 p-1.5 text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
                                    title="More actions"
                                >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                </button>
                                {showSidebarMenu && (
                                    <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-lg border border-border-default bg-dark-card shadow-2xl animate-scale-in">
                                        <button
                                            onClick={() => { setShowImportModal(true); setShowSidebarMenu(false); }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-dark-elevated hover:text-text-primary"
                                        >
                                            <Upload className="h-3.5 w-3.5 text-status-info" />
                                            Import Excel
                                        </button>
                                        <button
                                            onClick={() => { handleExport(); setShowSidebarMenu(false); }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-dark-elevated hover:text-text-primary"
                                        >
                                            <Download className="h-3.5 w-3.5 text-status-success" />
                                            Export all
                                        </button>
                                        <div className="my-1 h-px bg-border-default" />
                                        <button
                                            onClick={() => { setShowEnvironments(true); setShowSidebarMenu(false); }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-dark-elevated hover:text-text-primary"
                                        >
                                            <Settings className="h-3.5 w-3.5 text-text-muted" />
                                            Environments
                                        </button>
                                        <button
                                            onClick={() => { setShowDataStorageSettings(true); setShowSidebarMenu(false); }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-dark-elevated hover:text-text-primary"
                                        >
                                            <Database className="h-3.5 w-3.5 text-text-muted" />
                                            Data Storage
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <SheetList
                        sheets={sheets}
                        loading={loading}
                        selectedId={selectedSheetId}
                        onSelect={setSelectedSheetId}
                        onEdit={(sheet) => {
                            setEditingSheet(sheet);
                            setShowSheetForm(true);
                        }}
                        onDelete={handleDeleteSheet}
                        onRefresh={fetchSheets}
                    />
                </div>

                {/* Main Content */}
                <div className="flex min-w-0 flex-1 flex-col bg-gradient-to-b from-dark-bg/35 to-dark-canvas/95">
                    {selectedSheet && (
                        <div className="flex shrink-0 items-center justify-between border-b border-border-default bg-dark-bg/75 px-4 py-2.5 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <div className="rounded-md border border-brand-primary/35 bg-brand-primary/15 p-1.5">
                                    <Database className="h-3.5 w-3.5 text-brand-secondary" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-text-primary">{selectedSheet.name}</h2>
                                    {selectedSheet.pageObject && selectedSheet.pageObject !== selectedSheet.name && (
                                        <span className="text-xxs text-text-muted">Linked to: {selectedSheet.pageObject}</span>
                                    )}
                                </div>
                                <span className="rounded-md border border-border-default bg-dark-elevated/75 px-2 py-0.5 text-xxs text-text-secondary">
                                    {rows.length} {rows.length === 1 ? 'row' : 'rows'}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <SavedViewsDropdown
                                    sheetId={selectedSheet.id}
                                    currentFilterState={currentFilterState}
                                    currentSortState={currentSortState}
                                    currentColumnState={currentColumnState}
                                    onViewSelect={(view: SavedView) => {
                                        setCurrentFilterState(view.filterState);
                                        setCurrentSortState(view.sortState);
                                        setCurrentColumnState(view.columnState);
                                        setExternalSortState(view.sortState as SortLevel[]);
                                        setExternalFilterState(view.filterState as Record<string, unknown>);
                                    }}
                                />
                                <button
                                    onClick={() => fetchRows(selectedSheetId!)}
                                    className="rounded-md border border-border-default bg-dark-elevated/75 p-1.5 text-text-muted transition-all hover:border-border-emphasis hover:text-text-primary"
                                    title="Refresh data"
                                >
                                    <RefreshCw className={`h-4 w-4 ${loadingRows ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="relative flex-1 min-h-0">
                        {selectedSheet ? (
                            <div className="absolute inset-0">
                                <AGGridDataTable
                                    tableName={selectedSheet.name}
                                    columns={selectedSheet.columns.map(c => ({
                                        name: c.name,
                                        type: mapColumnType(c.type),
                                        required: c.required,
                                        formula: c.formula,
                                        referenceConfig: c.referenceConfig,
                                    }))}
                                    rows={rows.map((r, idx) => ({
                                        id: r.id,
                                        data: r.data || {},
                                        order: idx
                                    }))}
                                    loading={loadingRows}
                                    onCellChange={handleCellChange}
                                    onRowAdd={handleAddRow}
                                    onRowDelete={handleDeleteRow}
                                    onRowsDelete={handleBulkDeleteRows}
                                    onColumnAdd={handleAddColumn}
                                    onColumnEdit={handleEditColumn}
                                    onColumnRemove={handleRemoveColumn}
                                    onColumnRename={handleRenameColumn}
                                    onColumnTypeChange={handleColumnTypeChange}
                                    onBulkPaste={handleBulkPaste}
                                    onExportCSV={handleExportCSV}
                                    onImportCSV={() => setShowCSVImportModal(true)}
                                    onGenerateColumnData={handleGenerateColumnData}
                                    onBulkUpdate={handleBulkUpdate}
                                    onRowsDuplicate={handleDuplicateRows}
                                    onFillSeries={handleFillSeries}
                                    onSortStateChanged={setCurrentSortState}
                                    onFilterStateChanged={setCurrentFilterState}
                                    onColumnStateChanged={setCurrentColumnState}
                                    externalSortState={externalSortState}
                                    externalFilterState={externalFilterState}
                                />
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center px-6">
                                <div className="w-full max-w-md rounded-xl border border-border-default bg-dark-card/75 p-8 text-center shadow-2xl">
                                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl border border-border-default bg-dark-elevated">
                                        <Database className="h-8 w-8 text-text-muted" />
                                    </div>
                                    <p className="mb-1 text-base font-semibold text-text-primary">No data table selected</p>
                                    <p className="text-sm text-text-secondary">Choose a table from the left sidebar or create a new one.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages */}
            {successMessage && (
                <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-status-success/45 bg-status-success/90 px-4 py-2.5 text-white shadow-xl animate-slide-up">
                    <Check className="h-4 w-4" />
                    <span className="text-xs font-semibold">{successMessage}</span>
                </div>
            )}
            {errorMessage && (
                <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-status-danger/45 bg-status-danger/90 px-4 py-2.5 text-white shadow-xl animate-slide-up">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-semibold">{errorMessage}</span>
                </div>
            )}

            {/* Modals */}
            <Modal
                isOpen={showSheetForm}
                onClose={() => {
                    setShowSheetForm(false);
                    setEditingSheet(null);
                }}
                title={editingSheet ? `Edit "${editingSheet.name}"` : 'Create Data Table'}
                description={editingSheet ? 'Update table details and schema.' : 'Create a new table and define its columns.'}
                size="xl"
            >
                <SheetForm
                    sheet={editingSheet}
                    onSubmit={editingSheet
                        ? (name, pageObject, desc, cols) => handleUpdateSheet(editingSheet.id, { name, pageObject, description: desc, columns: cols })
                        : handleCreateSheet
                    }
                    onClose={() => {
                        setShowSheetForm(false);
                        setEditingSheet(null);
                    }}
                />
            </Modal>

            {showImportModal && (
                <ImportExcelModal
                    projectId={projectId}
                    onImport={handleImportComplete}
                    onClose={() => setShowImportModal(false)}
                />
            )}

            {showEnvironments && (
                <EnvironmentManager
                    userId={projectId}
                    onClose={() => setShowEnvironments(false)}
                />
            )}

            {showCSVImportModal && selectedSheet && (
                <ImportCSVModal
                    isOpen={showCSVImportModal}
                    onClose={() => setShowCSVImportModal(false)}
                    existingColumns={selectedSheet.columns.map(c => ({
                        name: c.name,
                        type: c.type === 'string' ? 'text' : c.type
                    }))}
                    onImport={handleCSVImport}
                />
            )}

            {showColumnEditor && selectedSheet && (
                <ColumnEditorModal
                    isOpen={showColumnEditor}
                    onClose={() => {
                        setShowColumnEditor(false);
                        setEditingColumn(null);
                    }}
                    onSave={handleSaveColumn}
                    existingColumn={editingColumn || undefined}
                    existingColumnNames={selectedSheet.columns.map(c => c.name)}
                    mode={editingColumn ? 'edit' : 'add'}
                    availableSheets={sheets.map(s => ({
                        id: s.id,
                        name: s.name,
                        columns: s.columns.map(c => ({ name: c.name, type: c.type })),
                    }))}
                    currentSheetId={selectedSheet.id}
                />
            )}

            <DataStorageSettingsModal
                isOpen={showDataStorageSettings}
                onClose={() => setShowDataStorageSettings(false)}
                applicationId={projectId}
            />
        </div>
    );
}

export default TestDataPage;
