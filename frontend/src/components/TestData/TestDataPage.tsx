/**
 * Test Data Management Page
 *
 * Main page for managing test data sheets, rows, and Excel import/export.
 * Provides Excel-like grid editing with scenario-based data linking.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Database, Plus, Upload, Download, RefreshCw, Settings, FileSpreadsheet,
    Code, Check, AlertTriangle
} from 'lucide-react';
import { apiUrl } from '@/config';
import { SheetList } from './SheetList';
import { DataTable } from './DataTable';
import { SheetForm } from './SheetForm';
import { ImportExcelModal } from './ImportExcelModal';
import { EnvironmentManager } from './EnvironmentManager';

// ============================================
// TYPES
// ============================================

export interface DataColumn {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    required: boolean;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
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
    const [showEnvironments, setShowEnvironments] = useState(false);

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
        if (!confirm('Delete this sheet and all its data? This cannot be undone.')) {
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
        if (!selectedSheet) return;

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
            if (data.success) {
                setRows([...rows, data.row]);
            } else if (res.status === 409) {
                showError(data.error || 'A row with this Test ID already exists');
            } else if (data.error) {
                showError(data.error);
            }
        } catch (err) {
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

    // Export handler
    const handleExport = async () => {
        try {
            const url = apiUrl(`/api/test-data/export?projectId=${projectId}`);
            window.open(url, '_blank');
        } catch (err) {
            showError('Failed to export');
        }
    };

    // Generate DTO code
    const handleGenerateCode = async () => {
        try {
            const res = await fetch(apiUrl(`/api/test-data/generate-dto?projectId=${projectId}`));
            const data = await res.json();
            if (data.success) {
                // Open in new window/tab for viewing
                const blob = new Blob([data.code], { type: 'text/typescript' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
            }
        } catch (err) {
            showError('Failed to generate code');
        }
    };

    return (
        <div className="flex h-full bg-slate-950">
            {/* Left Sidebar - Sheet List */}
            <div className="w-64 flex-shrink-0 border-r border-slate-800 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-800">
                    <div className="flex items-center gap-2 mb-3">
                        <Database className="w-5 h-5 text-emerald-400" />
                        <h1 className="text-lg font-semibold text-slate-200">Test Data</h1>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-1">
                        <button
                            onClick={() => setShowSheetForm(true)}
                            className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-xs text-white"
                            title="New Sheet"
                        >
                            <Plus className="w-3 h-3" />
                            New
                        </button>
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200"
                            title="Import Excel"
                        >
                            <Upload className="w-3 h-3" />
                        </button>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200"
                            title="Export Excel"
                        >
                            <Download className="w-3 h-3" />
                        </button>
                        <button
                            onClick={() => setShowEnvironments(true)}
                            className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200"
                            title="Environments"
                        >
                            <Settings className="w-3 h-3" />
                        </button>
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
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                            <div>
                                <h2 className="text-sm font-medium text-slate-200">{selectedSheet.name}</h2>
                                {selectedSheet.pageObject && selectedSheet.pageObject !== selectedSheet.name && (
                                    <span className="text-xs text-slate-500">
                                        Page: {selectedSheet.pageObject}
                                    </span>
                                )}
                            </div>
                            <span className="text-xs text-slate-500">
                                {rows.length} scenarios
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleAddRow}
                                className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200"
                            >
                                <Plus className="w-3 h-3" />
                                Add Row
                            </button>
                            <button
                                onClick={handleGenerateCode}
                                className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white"
                                title="Generate TypeScript DTO Classes"
                            >
                                <Code className="w-3 h-3" />
                                Generate Code
                            </button>
                            <button
                                onClick={() => fetchRows(selectedSheetId!)}
                                className="p-1 hover:bg-slate-700 rounded"
                                title="Refresh"
                            >
                                <RefreshCw className={`w-4 h-4 text-slate-400 ${loadingRows ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Data Table Container - fixed area with internal scroll */}
                <div className="flex-1 min-h-0 relative">
                    {selectedSheet ? (
                        <div className="absolute inset-0">
                            <DataTable
                                sheet={selectedSheet}
                                rows={rows}
                                loading={loadingRows}
                                onUpdateRow={handleUpdateRow}
                                onDeleteRow={handleDeleteRow}
                                onUpdateColumns={(columns) => handleUpdateSheet(selectedSheet.id, { columns })}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <Database className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg mb-2">No sheet selected</p>
                            <p className="text-sm">Select a sheet from the sidebar or create a new one</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages */}
            {successMessage && (
                <div className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg shadow-lg z-50">
                    <Check className="w-4 h-4" />
                    {successMessage}
                </div>
            )}
            {errorMessage && (
                <div className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg z-50">
                    <AlertTriangle className="w-4 h-4" />
                    {errorMessage}
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
        </div>
    );
}

export default TestDataPage;
