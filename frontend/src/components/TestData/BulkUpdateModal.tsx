/**
 * Bulk Update Modal
 *
 * Modal for bulk updating test data with three modes:
 * 1. Update Selected - Update manually selected rows
 * 2. Find & Replace - Find values and replace them
 * 3. Update Filtered - Update all rows matching current filter
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { X, Edit3, Search, Filter, Check, AlertCircle } from 'lucide-react';
import type { DataColumn, DataRow } from './AGGridDataTable';

// ============================================
// TYPES
// ============================================

export type BulkUpdateMode = 'selected' | 'findReplace' | 'filtered';

export interface BulkUpdate {
    rowId: string;
    columnName: string;
    oldValue: any;
    newValue: any;
}

interface BulkUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    columns: DataColumn[];
    rows: DataRow[];
    selectedRowIds: string[];
    filteredRowIds?: string[];
    onUpdate: (updates: BulkUpdate[]) => Promise<void>;
}

// ============================================
// COMPONENT
// ============================================

export function BulkUpdateModal({
    isOpen,
    onClose,
    columns,
    rows,
    selectedRowIds,
    filteredRowIds,
    onUpdate,
}: BulkUpdateModalProps) {
    // State
    const [mode, setMode] = useState<BulkUpdateMode>('selected');
    const [targetColumn, setTargetColumn] = useState<string>('');
    const [newValue, setNewValue] = useState<string>('');
    const [findValue, setFindValue] = useState<string>('');
    const [useContains, setUseContains] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setTargetColumn(columns[0]?.name || '');
            setNewValue('');
            setFindValue('');
            setUseContains(false);
            setError(null);

            // Auto-select mode based on context
            if (selectedRowIds.length > 0) {
                setMode('selected');
            } else if (filteredRowIds && filteredRowIds.length > 0) {
                setMode('filtered');
            } else {
                setMode('findReplace');
            }
        }
    }, [isOpen, columns, selectedRowIds, filteredRowIds]);

    // Get the column type for the selected column
    const columnType = useMemo(() => {
        return columns.find(c => c.name === targetColumn)?.type || 'text';
    }, [columns, targetColumn]);

    // Calculate affected rows based on mode
    const affectedRows = useMemo(() => {
        if (!targetColumn) return [];

        switch (mode) {
            case 'selected':
                return rows.filter(r => selectedRowIds.includes(r.id));

            case 'filtered':
                if (filteredRowIds) {
                    return rows.filter(r => filteredRowIds.includes(r.id));
                }
                return rows;

            case 'findReplace':
                if (!findValue) return [];
                return rows.filter(r => {
                    const cellValue = String(r.data[targetColumn] ?? '');
                    if (useContains) {
                        return cellValue.toLowerCase().includes(findValue.toLowerCase());
                    }
                    return cellValue.toLowerCase() === findValue.toLowerCase();
                });

            default:
                return [];
        }
    }, [mode, rows, selectedRowIds, filteredRowIds, targetColumn, findValue, useContains]);

    // Generate preview updates
    const previewUpdates = useMemo((): BulkUpdate[] => {
        if (!targetColumn || affectedRows.length === 0) return [];

        return affectedRows.map(row => {
            const oldValue = row.data[targetColumn];
            let computedNewValue: any = newValue;

            // For find & replace, do actual replacement
            if (mode === 'findReplace' && findValue) {
                const currentValue = String(oldValue ?? '');
                if (useContains) {
                    // Replace all occurrences (case-insensitive)
                    const regex = new RegExp(findValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    computedNewValue = currentValue.replace(regex, newValue);
                } else {
                    // Exact match replacement
                    computedNewValue = newValue;
                }
            }

            // Type conversion
            if (columnType === 'number') {
                computedNewValue = computedNewValue === '' ? null : Number(computedNewValue);
            } else if (columnType === 'boolean') {
                computedNewValue = computedNewValue === 'true' || computedNewValue === '1' || computedNewValue === true;
            }

            return {
                rowId: row.id,
                columnName: targetColumn,
                oldValue,
                newValue: computedNewValue,
            };
        });
    }, [affectedRows, targetColumn, newValue, findValue, useContains, mode, columnType]);

    // Handle apply
    const handleApply = useCallback(async () => {
        if (previewUpdates.length === 0) {
            setError('No rows to update');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await onUpdate(previewUpdates);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update rows');
        } finally {
            setIsSubmitting(false);
        }
    }, [previewUpdates, onUpdate, onClose]);

    // Format value for display
    const formatValue = (value: any): string => {
        if (value === null || value === undefined) return '(empty)';
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        return String(value);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-slate-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <Edit3 className="w-5 h-5 text-blue-400" />
                        <div>
                            <h2 className="text-lg font-semibold text-slate-200">Bulk Update</h2>
                            <p className="text-xs text-slate-500">
                                {mode === 'selected' && `Update ${selectedRowIds.length} selected rows`}
                                {mode === 'filtered' && `Update ${filteredRowIds?.length || rows.length} filtered rows`}
                                {mode === 'findReplace' && 'Find and replace values'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-800 rounded-md transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Mode Selector */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Update Mode</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setMode('selected')}
                                disabled={selectedRowIds.length === 0}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
                                    mode === 'selected'
                                        ? 'bg-blue-600 text-white'
                                        : selectedRowIds.length === 0
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                }`}
                            >
                                <Check className="w-4 h-4" />
                                Selected ({selectedRowIds.length})
                            </button>
                            <button
                                onClick={() => setMode('findReplace')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
                                    mode === 'findReplace'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                }`}
                            >
                                <Search className="w-4 h-4" />
                                Find & Replace
                            </button>
                            <button
                                onClick={() => setMode('filtered')}
                                disabled={!filteredRowIds || filteredRowIds.length === 0}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
                                    mode === 'filtered'
                                        ? 'bg-blue-600 text-white'
                                        : !filteredRowIds || filteredRowIds.length === 0
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                }`}
                            >
                                <Filter className="w-4 h-4" />
                                Filtered ({filteredRowIds?.length || 0})
                            </button>
                        </div>
                    </div>

                    {/* Column Selector */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Target Column</label>
                        <select
                            value={targetColumn}
                            onChange={(e) => setTargetColumn(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                        >
                            {columns.map(col => (
                                <option key={col.name} value={col.name}>
                                    {col.name} ({col.type})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Find & Replace specific fields */}
                    {mode === 'findReplace' && (
                        <div className="space-y-4 bg-slate-800/50 rounded-lg p-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Find Value</label>
                                <input
                                    type="text"
                                    value={findValue}
                                    onChange={(e) => setFindValue(e.target.value)}
                                    placeholder="Enter value to find..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="useContains"
                                    checked={useContains}
                                    onChange={(e) => setUseContains(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                                />
                                <label htmlFor="useContains" className="text-sm text-slate-400">
                                    Match partial values (contains)
                                </label>
                            </div>
                        </div>
                    )}

                    {/* New Value Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            {mode === 'findReplace' ? 'Replace With' : 'New Value'}
                        </label>
                        {columnType === 'boolean' ? (
                            <select
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Select value...</option>
                                <option value="true">True</option>
                                <option value="false">False</option>
                            </select>
                        ) : columnType === 'date' ? (
                            <input
                                type="date"
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                        ) : columnType === 'number' ? (
                            <input
                                type="number"
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                placeholder="Enter number..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            />
                        ) : (
                            <input
                                type="text"
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                placeholder="Enter new value..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            />
                        )}
                    </div>

                    {/* Preview */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-slate-300">
                                Preview ({previewUpdates.length} rows will be updated)
                            </label>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg overflow-hidden">
                            {previewUpdates.length === 0 ? (
                                <div className="p-4 text-center text-slate-500 text-sm">
                                    {mode === 'findReplace' && !findValue
                                        ? 'Enter a value to find'
                                        : mode === 'selected' && selectedRowIds.length === 0
                                            ? 'Select rows to update'
                                            : 'No matching rows found'}
                                </div>
                            ) : (
                                <div className="max-h-64 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-900 sticky top-0">
                                            <tr>
                                                <th className="text-left px-3 py-2 text-slate-400 font-medium">Row</th>
                                                <th className="text-left px-3 py-2 text-slate-400 font-medium">Current Value</th>
                                                <th className="text-left px-3 py-2 text-slate-400 font-medium">New Value</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewUpdates.slice(0, 10).map((update, idx) => (
                                                <tr key={update.rowId} className="border-t border-slate-700/50">
                                                    <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                                                    <td className="px-3 py-2 text-red-400 font-mono text-xs">
                                                        {formatValue(update.oldValue)}
                                                    </td>
                                                    <td className="px-3 py-2 text-green-400 font-mono text-xs">
                                                        {formatValue(update.newValue)}
                                                    </td>
                                                </tr>
                                            ))}
                                            {previewUpdates.length > 10 && (
                                                <tr className="border-t border-slate-700/50">
                                                    <td colSpan={3} className="px-3 py-2 text-center text-slate-500">
                                                        ... and {previewUpdates.length - 10} more rows
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-900/30 border border-red-800 rounded-md text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/50">
                    <p className="text-xs text-slate-500">
                        {previewUpdates.length > 0
                            ? `${previewUpdates.length} rows will be updated`
                            : 'No rows selected for update'}
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            disabled={previewUpdates.length === 0 || isSubmitting}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-md text-sm text-white transition-colors"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="animate-spin">&#9696;</span>
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Apply Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BulkUpdateModal;
