/**
 * Reference Cell Editor
 *
 * AG Grid custom cell editor for reference columns.
 * Provides a multi-select picker modal to select rows from the referenced table.
 *
 * Features:
 * - Search/filter available options
 * - Multi-select with chips display (when allowMultiple is true)
 * - Single-select (when allowMultiple is false)
 * - Shows display column value but stores ID column value
 */

import { useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { X, Search, Check, Loader2 } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import type { ReferenceConfig } from './AGGridDataTable';
import { testDataApi } from '@/api/testData';

interface ReferenceCellEditorProps {
    value: string;
    referenceConfig: ReferenceConfig;
    stopEditing: (cancel?: boolean) => void;
    data?: { _id: string;[key: string]: any };
    onSave?: (rowId: string, newValue: string) => void;
}

interface ReferenceOption {
    id: string;
    displayValue: string;
    fullRow: Record<string, any>;
}

export const ReferenceCellEditor = forwardRef((props: ReferenceCellEditorProps, ref) => {
    const { value, referenceConfig, stopEditing, data, onSave } = props;
    const inputRef = useRef<HTMLInputElement>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [options, setOptions] = useState<ReferenceOption[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Parse initial value into selected IDs
    useEffect(() => {
        if (value) {
            const separator = referenceConfig.separator || ',';
            const ids = value.split(separator).map(id => id.trim()).filter(Boolean);
            setSelectedIds(ids);
        } else {
            setSelectedIds([]);
        }
    }, [value, referenceConfig.separator]);

    // Fetch options from the target sheet
    useEffect(() => {
        const fetchOptions = async () => {
            setLoading(true);
            setError(null);

            try {
                // Fetch the target sheet with its rows
                const sheet = await testDataApi.getSheet(referenceConfig.targetSheet);
                const rows = sheet.rows || [];

                const opts: ReferenceOption[] = rows.map((row) => ({
                    id: String(row.data[referenceConfig.targetColumn] || row.id),
                    displayValue: String(row.data[referenceConfig.displayColumn] || row.data[referenceConfig.targetColumn] || row.id),
                    fullRow: row.data,
                }));

                setOptions(opts);
            } catch (err) {
                console.error('Failed to fetch reference options:', err);
                setError('Failed to load options');
            } finally {
                setLoading(false);
            }
        };

        fetchOptions();
    }, [referenceConfig.targetSheet, referenceConfig.targetColumn, referenceConfig.displayColumn]);

    // Filter options by search term
    const filteredOptions = useMemo(() => {
        if (!searchTerm.trim()) return options;

        const term = searchTerm.toLowerCase();
        return options.filter(opt =>
            opt.displayValue.toLowerCase().includes(term) ||
            opt.id.toLowerCase().includes(term)
        );
    }, [options, searchTerm]);



    // Expose methods to AG Grid - getValue must be a callable function
    useImperativeHandle(ref, () => ({
        getValue: () => {
            const separator = referenceConfig.separator || ',';
            const result = selectedIds.join(separator);
            console.log('[ReferenceCellEditor] getValue via ref, returning:', result, 'selectedIds:', selectedIds);
            return result;
        },
        isCancelBeforeStart: () => false,
        isCancelAfterEnd: () => false,
    }), [selectedIds, referenceConfig.separator]);

    // Toggle selection of an option
    const handleToggle = useCallback((id: string) => {
        if (referenceConfig.allowMultiple) {
            setSelectedIds(prev =>
                prev.includes(id)
                    ? prev.filter(i => i !== id)
                    : [...prev, id]
            );
        } else {
            setSelectedIds([id]);
        }
    }, [referenceConfig.allowMultiple]);

    // Remove a selected item
    const handleRemove = useCallback((id: string) => {
        setSelectedIds(prev => prev.filter(i => i !== id));
    }, []);

    // Get display value for an ID
    const getDisplayValue = useCallback((id: string): string => {
        const option = options.find(opt => opt.id === id);
        return option?.displayValue || id;
    }, [options]);

    // Handle apply - directly call onSave since AG Grid popup lifecycle doesn't work with our modal
    const handleApply = useCallback(() => {
        const separator = referenceConfig.separator || ',';
        const newValue = selectedIds.join(separator);
        console.log('[ReferenceCellEditor] handleApply:', { rowId: data?._id, newValue, selectedIds });

        // Call onSave directly to persist the change
        if (onSave && data?._id) {
            onSave(data._id, newValue);
        }
        stopEditing(false);
    }, [stopEditing, selectedIds, referenceConfig.separator, onSave, data]);

    // Handle cancel
    const handleCancel = useCallback(() => {
        stopEditing(true);
    }, [stopEditing]);

    // Handle keydown
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            handleCancel();
        } else if (e.key === 'Enter' && !e.shiftKey) {
            handleApply();
        }
    }, [handleApply, handleCancel]);

    // Focus search input on mount
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    return (
        <Modal
            isOpen={true}
            onClose={handleCancel}
            title={referenceConfig.allowMultiple ? 'Select Items' : 'Select Item'}
            description={`From: ${referenceConfig.targetSheet}`}
            size="full"
            bodyClassName="p-0"
            footer={
                <div className="flex items-center justify-between w-full">
                    <p className="text-xs text-text-muted">
                        {referenceConfig.allowMultiple ? 'Click to toggle selection' : 'Click to select'}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
                        <Button variant="action" onClick={handleApply} leftIcon={<Check className="w-4 h-4" />}>Apply</Button>
                    </div>
                </div>
            }
        >
            <div onKeyDown={handleKeyDown}>
                {/* Selected Items */}
                {selectedIds.length > 0 && (
                    <div className="px-5 py-3 border-b border-border-default bg-dark-canvas/50">
                        <p className="text-xs text-text-secondary mb-2">
                            Selected ({selectedIds.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {selectedIds.map(id => (
                                <span
                                    key={id}
                                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-status-info/20 text-status-info rounded-md text-xs"
                                >
                                    <span className="font-medium">{getDisplayValue(id)}</span>
                                    <button
                                        onClick={() => handleRemove(id)}
                                        className="hover:text-status-info transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="px-5 py-3 border-b border-border-default">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search..."
                            className="w-full pl-9 pr-4 py-2 bg-dark-canvas border border-border-default rounded-lg text-sm text-white placeholder-text-muted focus:outline-none focus:border-status-info"
                        />
                    </div>
                </div>

                {/* Options Table with Scrolling */}
                <div className="max-h-96 overflow-auto border-t border-border-default">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 text-status-info animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-status-danger">
                            <p className="text-sm">{error}</p>
                        </div>
                    ) : filteredOptions.length === 0 ? (
                        <div className="text-center py-8 text-text-secondary">
                            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No matching items</p>
                        </div>
                    ) : (() => {
                        // Get all unique column names from all rows
                        const allColumns = new Set<string>();
                        filteredOptions.forEach(opt => {
                            Object.keys(opt.fullRow).forEach(key => {
                                if (key !== '_id') allColumns.add(key);
                            });
                        });
                        const columnNames = Array.from(allColumns);

                        return (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-max border-collapse">
                                    {/* Table Header */}
                                    <thead className="bg-dark-canvas sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary border-b border-border-default w-10">
                                                <span className="sr-only">Select</span>
                                            </th>
                                            {columnNames.map(col => (
                                                <th
                                                    key={col}
                                                    className="px-3 py-2 text-left text-xs font-semibold text-text-secondary border-b border-border-default whitespace-nowrap"
                                                >
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    {/* Table Body */}
                                    <tbody>
                                        {filteredOptions.map(option => {
                                            const isSelected = selectedIds.includes(option.id);
                                            return (
                                                <tr
                                                    key={option.id}
                                                    onClick={() => handleToggle(option.id)}
                                                    className={`cursor-pointer transition-colors ${isSelected
                                                        ? 'bg-status-info/15 hover:bg-status-info/25'
                                                        : 'hover:bg-dark-elevated'
                                                        }`}
                                                >
                                                    {/* Checkbox/Radio cell */}
                                                    <td className="px-3 py-2 border-b border-border-default/50">
                                                        <div className={`w-5 h-5 rounded ${referenceConfig.allowMultiple ? 'rounded' : 'rounded-full'
                                                            } border-2 flex items-center justify-center transition-colors ${isSelected
                                                                ? 'border-status-info bg-status-info'
                                                                : 'border-border-default'
                                                            }`}>
                                                            {isSelected && (
                                                                <Check className="w-3 h-3 text-white" />
                                                            )}
                                                        </div>
                                                    </td>
                                                    {/* Data cells */}
                                                    {columnNames.map(col => (
                                                        <td
                                                            key={col}
                                                            className={`px-3 py-2 text-sm border-b border-border-default/50 whitespace-nowrap ${col === referenceConfig.displayColumn
                                                                ? isSelected ? 'text-status-info font-semibold' : 'text-white font-semibold'
                                                                : isSelected ? 'text-status-info/80' : 'text-text-primary'
                                                                }`}
                                                        >
                                                            {option.fullRow[col] === null || option.fullRow[col] === undefined
                                                                ? <span className="text-text-muted">—</span>
                                                                : String(option.fullRow[col])}
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </Modal>
    );
});

ReferenceCellEditor.displayName = 'ReferenceCellEditor';

export default ReferenceCellEditor;
