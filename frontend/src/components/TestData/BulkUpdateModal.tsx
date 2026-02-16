/**
 * Bulk Update Modal
 *
 * Modal for bulk updating test data with three modes:
 * 1. Update Selected - Update manually selected rows
 * 2. Find & Replace - Find values and replace them
 * 3. Update Filtered - Update all rows matching current filter
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, Filter, Check, AlertCircle } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
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

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Bulk Update"
            description={
                mode === 'selected' ? `Update ${selectedRowIds.length} selected rows` :
                mode === 'filtered' ? `Update ${filteredRowIds?.length || rows.length} filtered rows` :
                'Find and replace values'
            }
            size="3xl"
            bodyClassName="max-h-[75vh]"
            footer={
                <div className="flex items-center justify-between w-full">
                    <p className="text-xs text-text-secondary">
                        {previewUpdates.length > 0
                            ? `${previewUpdates.length} rows will be updated`
                            : 'No rows selected for update'}
                    </p>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button
                            variant="action"
                            onClick={handleApply}
                            disabled={previewUpdates.length === 0 || isSubmitting}
                            isLoading={isSubmitting}
                            leftIcon={!isSubmitting ? <Check className="w-4 h-4" /> : undefined}
                        >
                            {isSubmitting ? 'Updating...' : 'Apply Changes'}
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="space-y-6">
                {/* Mode Selector */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Update Mode</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setMode('selected')}
                                disabled={selectedRowIds.length === 0}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
                                    mode === 'selected'
                                        ? 'bg-brand-primary text-white'
                                        : selectedRowIds.length === 0
                                            ? 'bg-dark-elevated text-text-secondary cursor-not-allowed'
                                            : 'bg-dark-elevated hover:bg-dark-elevated text-text-primary'
                                }`}
                            >
                                <Check className="w-4 h-4" />
                                Selected ({selectedRowIds.length})
                            </button>
                            <button
                                onClick={() => setMode('findReplace')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
                                    mode === 'findReplace'
                                        ? 'bg-brand-primary text-white'
                                        : 'bg-dark-elevated hover:bg-dark-elevated text-text-primary'
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
                                        ? 'bg-brand-primary text-white'
                                        : !filteredRowIds || filteredRowIds.length === 0
                                            ? 'bg-dark-elevated text-text-secondary cursor-not-allowed'
                                            : 'bg-dark-elevated hover:bg-dark-elevated text-text-primary'
                                }`}
                            >
                                <Filter className="w-4 h-4" />
                                Filtered ({filteredRowIds?.length || 0})
                            </button>
                        </div>
                    </div>

                    {/* Column Selector */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Target Column</label>
                        <select
                            value={targetColumn}
                            onChange={(e) => setTargetColumn(e.target.value)}
                            className="w-full bg-dark-elevated border border-border-default rounded-md px-3 py-2 text-text-primary focus:outline-none focus:border-status-info"
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
                        <div className="space-y-4 bg-dark-elevated/50 rounded-lg p-4">
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">Find Value</label>
                                <input
                                    type="text"
                                    value={findValue}
                                    onChange={(e) => setFindValue(e.target.value)}
                                    placeholder="Enter value to find..."
                                    className="w-full bg-dark-canvas border border-border-default rounded-md px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:border-status-info"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="useContains"
                                    checked={useContains}
                                    onChange={(e) => setUseContains(e.target.checked)}
                                    className="w-4 h-4 rounded border-border-default bg-dark-elevated text-status-info focus:ring-status-info"
                                />
                                <label htmlFor="useContains" className="text-sm text-text-secondary">
                                    Match partial values (contains)
                                </label>
                            </div>
                        </div>
                    )}

                    {/* New Value Input */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            {mode === 'findReplace' ? 'Replace With' : 'New Value'}
                        </label>
                        {columnType === 'boolean' ? (
                            <select
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                className="w-full bg-dark-elevated border border-border-default rounded-md px-3 py-2 text-text-primary focus:outline-none focus:border-status-info"
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
                                className="w-full bg-dark-elevated border border-border-default rounded-md px-3 py-2 text-text-primary focus:outline-none focus:border-status-info"
                            />
                        ) : columnType === 'number' ? (
                            <input
                                type="number"
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                placeholder="Enter number..."
                                className="w-full bg-dark-elevated border border-border-default rounded-md px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:border-status-info"
                            />
                        ) : (
                            <input
                                type="text"
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                placeholder="Enter new value..."
                                className="w-full bg-dark-elevated border border-border-default rounded-md px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:border-status-info"
                            />
                        )}
                    </div>

                    {/* Preview */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-text-primary">
                                Preview ({previewUpdates.length} rows will be updated)
                            </label>
                        </div>
                        <div className="bg-dark-elevated/50 rounded-lg overflow-hidden">
                            {previewUpdates.length === 0 ? (
                                <div className="p-4 text-center text-text-secondary text-sm">
                                    {mode === 'findReplace' && !findValue
                                        ? 'Enter a value to find'
                                        : mode === 'selected' && selectedRowIds.length === 0
                                            ? 'Select rows to update'
                                            : 'No matching rows found'}
                                </div>
                            ) : (
                                <div className="max-h-64 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-dark-canvas sticky top-0">
                                            <tr>
                                                <th className="text-left px-3 py-2 text-text-secondary font-medium">Row</th>
                                                <th className="text-left px-3 py-2 text-text-secondary font-medium">Current Value</th>
                                                <th className="text-left px-3 py-2 text-text-secondary font-medium">New Value</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewUpdates.slice(0, 10).map((update, idx) => (
                                                <tr key={update.rowId} className="border-t border-border-default/50">
                                                    <td className="px-3 py-2 text-text-secondary">{idx + 1}</td>
                                                    <td className="px-3 py-2 text-status-danger font-mono text-xs">
                                                        {formatValue(update.oldValue)}
                                                    </td>
                                                    <td className="px-3 py-2 text-status-success font-mono text-xs">
                                                        {formatValue(update.newValue)}
                                                    </td>
                                                </tr>
                                            ))}
                                            {previewUpdates.length > 10 && (
                                                <tr className="border-t border-border-default/50">
                                                    <td colSpan={3} className="px-3 py-2 text-center text-text-secondary">
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
                        <div className="flex items-center gap-2 px-4 py-2 bg-status-danger/30 border border-status-danger rounded-md text-status-danger text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
            </div>
        </Modal>
    );
}

export default BulkUpdateModal;
