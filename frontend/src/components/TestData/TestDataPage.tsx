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

    // Saved views state
    const [currentFilterState, setCurrentFilterState] = useState<Record<string, unknown>>({});
    const [currentSortState, setCurrentSortState] = useState<unknown[]>([]);
    const [currentColumnState, setCurrentColumnState] = useState<unknown[]>([]);

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
        <div className="flex h-full bg-[#0d1117]">
            {/* Left Sidebar - Sheet List */}
            <div className="w-64 flex-shrink-0 border-r border-[#30363d] flex flex-col bg-[#161b22]">
                {/* Header */}
                <div className="p-4 border-b border-[#30363d]">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-[20px] text-[#58a6ff]">database</span>
                        <h1 className="text-base font-semibold text-white">Test Data</h1>
                    </div>

                    {/* Actions - Simplified */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSheetForm(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] rounded-md text-xs font-medium text-white transition-colors flex-1"
                            title="New Data Table"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            New Table
                        </button>

                        {/* Data Storage Settings Button - Made more visible */}
                        <button
                            onClick={() => setShowDataStorageSettings(true)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-emerald-500/10 to-green-500/10 hover:from-emerald-500/20 hover:to-green-500/20 border border-emerald-500/30 rounded-md text-emerald-400 hover:text-emerald-300 transition-all"
                            title="Configure database connection (MongoDB, PostgreSQL, MySQL)"
                        >
                            <Database className="w-4 h-4" />
                            <span className="text-xs font-medium">DB Config</span>
                        </button>

                        {/* More Actions Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowSidebarMenu(!showSidebarMenu)}
                                className="flex items-center gap-1 p-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-md text-[#c9d1d9] transition-colors"
                                title="More actions"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {showSidebarMenu && (
                                <div className="absolute top-full right-0 mt-1 w-44 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl z-50 overflow-hidden">
                                    <button
                                        onClick={() => { setShowImportModal(true); setShowSidebarMenu(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                                    >
                                        <Upload className="w-3.5 h-3.5 text-sky-400" />
                                        Import Excel
                                    </button>
                                    <button
                                        onClick={() => { handleExport(); setShowSidebarMenu(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                                    >
                                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                                        Export All (Excel)
                                    </button>
                                    <div className="h-px bg-[#30363d] my-1" />
                                    <button
                                        onClick={() => { setShowEnvironments(true); setShowSidebarMenu(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                                    >
                                        <Settings className="w-3.5 h-3.5 text-[#8b949e]" />
                                        Environments
                                    </button>
                                    <button
                                        onClick={() => { setShowDataStorageSettings(true); setShowSidebarMenu(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[14px] text-[#8b949e]">database</span>
                                        Data Storage
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sheet List */}
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

            {/* Main Content - Data Table (fixed width container) */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                {selectedSheet && (
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#30363d] bg-[#161b22] flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[18px] text-[#58a6ff]">table_chart</span>
                            <div>
                                <h2 className="text-sm font-medium text-white">{selectedSheet.name}</h2>
                                {selectedSheet.pageObject && selectedSheet.pageObject !== selectedSheet.name && (
                                    <span className="text-xs text-[#8b949e]">
                                        Linked to: {selectedSheet.pageObject}
                                    </span>
                                )}
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-[#21262d] text-xs text-[#8b949e]">
                                {rows.length} {rows.length === 1 ? 'row' : 'rows'}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Saved Views Dropdown */}
                            <SavedViewsDropdown
                                sheetId={selectedSheet.id}
                                currentFilterState={currentFilterState}
                                currentSortState={currentSortState}
                                currentColumnState={currentColumnState}
                                onViewSelect={(view: SavedView) => {
                                    // Apply view settings to the grid
                                    setCurrentFilterState(view.filterState);
                                    setCurrentSortState(view.sortState);
                                    setCurrentColumnState(view.columnState);
                                    // Grid will pick up these changes
                                }}
                            />
                            <button
                                onClick={() => fetchRows(selectedSheetId!)}
                                className="p-1.5 hover:bg-[#21262d] rounded-md transition-colors"
                                title="Refresh data"
                            >
                                <RefreshCw className={`w-4 h-4 text-[#8b949e] ${loadingRows ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Data Table Container - AG Grid */}
                <div className="flex-1 min-h-0 relative bg-[#0d1117]">
                    {selectedSheet ? (
                        <div className="absolute inset-0">
                            <AGGridDataTable
                                tableName={selectedSheet.name}
                                columns={selectedSheet.columns.map(c => ({
                                    name: c.name,
                                    type: c.type === 'string' ? 'text' : c.type as any,
                                    required: c.required,
                                    formula: (c as any).formula,
                                    referenceConfig: (c as any).referenceConfig,
                                }))}
                                rows={rows.map((r, idx) => ({
                                    id: r.id,
                                    data: r.data,
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
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="w-20 h-20 rounded-2xl bg-[#21262d] flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-[40px] text-[#8b949e]">database</span>
                            </div>
                            <p className="text-lg font-medium text-[#c9d1d9] mb-1">No data table selected</p>
                            <p className="text-sm text-[#8b949e]">Select a table from the sidebar or create a new one</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages */}
            {successMessage && (
                <div className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 bg-[#238636] text-white rounded-lg shadow-lg z-50">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">{successMessage}</span>
                </div>
            )}
            {errorMessage && (
                <div className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 bg-[#da3633] text-white rounded-lg shadow-lg z-50">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">{errorMessage}</span>
                </div>
            )}

            {/* Modals */}
            {showSheetForm && (
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
            )}

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

            {/* Data Storage Settings Modal */}
            <DataStorageSettingsModal
                isOpen={showDataStorageSettings}
                onClose={() => setShowDataStorageSettings(false)}
                applicationId={projectId}
            />
        </div>
    );
}

export default TestDataPage;
