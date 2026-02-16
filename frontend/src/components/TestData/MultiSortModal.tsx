/**
 * Multi-column Sorting Modal
 *
 * Allows users to define multiple sort levels with:
 * - Column selection for each level
 * - Sort direction (ascending/descending)
 * - Drag-and-drop to reorder priority
 */

import { useState, useCallback } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Plus, GripVertical, Trash2 } from 'lucide-react';
import { IconButton, Modal, Button } from '@/components/ui';
import type { DataColumn } from './AGGridDataTable';

export interface SortLevel {
    id: string;
    column: string;
    direction: 'asc' | 'desc';
}

interface MultiSortModalProps {
    isOpen: boolean;
    onClose: () => void;
    columns: DataColumn[];
    currentSort: SortLevel[];
    onApply: (sortLevels: SortLevel[]) => void;
}

function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}

export function MultiSortModal({
    isOpen,
    onClose,
    columns,
    currentSort,
    onApply,
}: MultiSortModalProps) {
    const [sortLevels, setSortLevels] = useState<SortLevel[]>(
        currentSort.length > 0 ? currentSort : []
    );
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Add a new sort level
    const handleAddLevel = useCallback(() => {
        // Find first column not already used
        const usedColumns = new Set(sortLevels.map(s => s.column));
        const availableColumn = columns.find(c => !usedColumns.has(c.name));

        if (availableColumn || columns.length > 0) {
            setSortLevels(prev => [
                ...prev,
                {
                    id: generateId(),
                    column: availableColumn?.name || columns[0].name,
                    direction: 'asc',
                }
            ]);
        }
    }, [sortLevels, columns]);

    // Remove a sort level
    const handleRemoveLevel = useCallback((id: string) => {
        setSortLevels(prev => prev.filter(s => s.id !== id));
    }, []);

    // Update a sort level
    const handleUpdateLevel = useCallback((id: string, field: 'column' | 'direction', value: string) => {
        setSortLevels(prev =>
            prev.map(s =>
                s.id === id
                    ? { ...s, [field]: value }
                    : s
            )
        );
    }, []);

    // Drag and drop handlers
    const handleDragStart = useCallback((index: number) => {
        setDraggedIndex(index);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        setSortLevels(prev => {
            const newLevels = [...prev];
            const [removed] = newLevels.splice(draggedIndex, 1);
            newLevels.splice(index, 0, removed);
            return newLevels;
        });
        setDraggedIndex(index);
    }, [draggedIndex]);

    const handleDragEnd = useCallback(() => {
        setDraggedIndex(null);
    }, []);

    // Apply sort
    const handleApply = useCallback(() => {
        onApply(sortLevels);
        onClose();
    }, [sortLevels, onApply, onClose]);

    // Clear all sorting
    const handleClear = useCallback(() => {
        onApply([]);
        onClose();
    }, [onApply, onClose]);

    const usedColumns = new Set(sortLevels.map(s => s.column));
    const canAddMore = columns.length > sortLevels.length;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Multi-Column Sort"
            description="Sort by multiple columns with priority"
            size="lg"
            footer={
                <div className="flex items-center justify-between w-full">
                    <Button
                        variant="ghost"
                        className="text-status-danger hover:text-status-danger hover:bg-status-danger/10"
                        onClick={handleClear}
                    >
                        Clear Sorting
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button
                            variant="action"
                            leftIcon={<ArrowUpDown className="w-4 h-4" />}
                            onClick={handleApply}
                        >
                            Apply Sort
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                    {sortLevels.length === 0 ? (
                        <div className="text-center py-8 text-text-secondary">
                            <ArrowUpDown className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No sort levels defined</p>
                            <p className="text-xs mt-1">Click "Add Sort Level" to start sorting</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {sortLevels.map((level, index) => (
                                <div
                                    key={level.id}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex items-center gap-3 p-3 bg-dark-elevated border border-border-default rounded-lg group transition-all ${
                                        draggedIndex === index ? 'opacity-50 scale-95' : ''
                                    }`}
                                >
                                    {/* Drag handle */}
                                    <div className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary">
                                        <GripVertical className="w-4 h-4" />
                                    </div>

                                    {/* Priority number */}
                                    <div className="w-6 h-6 flex items-center justify-center bg-status-warning/20 rounded-full text-xs font-bold text-status-warning">
                                        {index + 1}
                                    </div>

                                    {/* Column select */}
                                    <select
                                        value={level.column}
                                        onChange={(e) => handleUpdateLevel(level.id, 'column', e.target.value)}
                                        className="flex-1 bg-dark-canvas border border-border-default rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-status-info"
                                    >
                                        {columns.map((col) => (
                                            <option
                                                key={col.name}
                                                value={col.name}
                                                disabled={usedColumns.has(col.name) && level.column !== col.name}
                                            >
                                                {col.name}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Direction toggle */}
                                    <div className="flex bg-dark-canvas border border-border-default rounded overflow-hidden">
                                        <button
                                            onClick={() => handleUpdateLevel(level.id, 'direction', 'asc')}
                                            className={`px-2 py-1.5 flex items-center gap-1 text-xs transition-colors ${
                                                level.direction === 'asc'
                                                    ? 'bg-status-info text-white'
                                                    : 'text-text-secondary hover:bg-dark-elevated'
                                            }`}
                                        >
                                            <ArrowUp className="w-3 h-3" />
                                            A-Z
                                        </button>
                                        <button
                                            onClick={() => handleUpdateLevel(level.id, 'direction', 'desc')}
                                            className={`px-2 py-1.5 flex items-center gap-1 text-xs transition-colors ${
                                                level.direction === 'desc'
                                                    ? 'bg-status-info text-white'
                                                    : 'text-text-secondary hover:bg-dark-elevated'
                                            }`}
                                        >
                                            <ArrowDown className="w-3 h-3" />
                                            Z-A
                                        </button>
                                    </div>

                                    {/* Remove button */}
                                    <IconButton
                                        icon={<Trash2 className="w-4 h-4" />}
                                        size="sm"
                                        variant="ghost"
                                        tone="danger"
                                        tooltip="Remove sort level"
                                        onClick={() => handleRemoveLevel(level.id)}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add button */}
                    {canAddMore && (
                        <button
                            onClick={handleAddLevel}
                            className="w-full py-2 px-3 border border-dashed border-border-default hover:border-border-default rounded-lg text-sm text-text-secondary hover:text-white transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Sort Level
                        </button>
                    )}

                    {/* Help text */}
                    <p className="text-xs text-text-muted text-center">
                        Drag rows to change sort priority. Level 1 is highest priority.
                    </p>
                </div>
        </Modal>
    );
}

export default MultiSortModal;
