/**
 * Multi-column Sorting Modal
 *
 * Allows users to define multiple sort levels with:
 * - Column selection for each level
 * - Sort direction (ascending/descending)
 * - Drag-and-drop to reorder priority
 */

import { useState, useCallback } from 'react';
import { X, ArrowUpDown, ArrowUp, ArrowDown, Plus, GripVertical, Trash2 } from 'lucide-react';
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

    if (!isOpen) return null;

    const usedColumns = new Set(sortLevels.map(s => s.column));
    const canAddMore = columns.length > sortLevels.length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                            <ArrowUpDown className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">Multi-Column Sort</h2>
                            <p className="text-xs text-[#8b949e]">Sort by multiple columns with priority</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-[#30363d] rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-[#8b949e]" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4 max-h-96 overflow-y-auto">
                    {sortLevels.length === 0 ? (
                        <div className="text-center py-8 text-[#8b949e]">
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
                                    className={`flex items-center gap-3 p-3 bg-[#21262d] border border-[#30363d] rounded-lg group transition-all ${
                                        draggedIndex === index ? 'opacity-50 scale-95' : ''
                                    }`}
                                >
                                    {/* Drag handle */}
                                    <div className="cursor-grab active:cursor-grabbing text-[#6e7681] hover:text-[#8b949e]">
                                        <GripVertical className="w-4 h-4" />
                                    </div>

                                    {/* Priority number */}
                                    <div className="w-6 h-6 flex items-center justify-center bg-amber-500/20 rounded-full text-xs font-bold text-amber-400">
                                        {index + 1}
                                    </div>

                                    {/* Column select */}
                                    <select
                                        value={level.column}
                                        onChange={(e) => handleUpdateLevel(level.id, 'column', e.target.value)}
                                        className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
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
                                    <div className="flex bg-[#0d1117] border border-[#30363d] rounded overflow-hidden">
                                        <button
                                            onClick={() => handleUpdateLevel(level.id, 'direction', 'asc')}
                                            className={`px-2 py-1.5 flex items-center gap-1 text-xs transition-colors ${
                                                level.direction === 'asc'
                                                    ? 'bg-sky-500 text-white'
                                                    : 'text-[#8b949e] hover:bg-[#21262d]'
                                            }`}
                                        >
                                            <ArrowUp className="w-3 h-3" />
                                            A-Z
                                        </button>
                                        <button
                                            onClick={() => handleUpdateLevel(level.id, 'direction', 'desc')}
                                            className={`px-2 py-1.5 flex items-center gap-1 text-xs transition-colors ${
                                                level.direction === 'desc'
                                                    ? 'bg-sky-500 text-white'
                                                    : 'text-[#8b949e] hover:bg-[#21262d]'
                                            }`}
                                        >
                                            <ArrowDown className="w-3 h-3" />
                                            Z-A
                                        </button>
                                    </div>

                                    {/* Remove button */}
                                    <button
                                        onClick={() => handleRemoveLevel(level.id)}
                                        className="p-1.5 text-[#6e7681] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add button */}
                    {canAddMore && (
                        <button
                            onClick={handleAddLevel}
                            className="w-full py-2 px-3 border border-dashed border-[#30363d] hover:border-[#484f58] rounded-lg text-sm text-[#8b949e] hover:text-white transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Sort Level
                        </button>
                    )}

                    {/* Help text */}
                    <p className="text-xs text-[#6e7681] text-center">
                        Drag rows to change sort priority. Level 1 is highest priority.
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-[#30363d] bg-[#0d1117]/50">
                    <button
                        onClick={handleClear}
                        className="px-4 py-2 text-sm text-[#8b949e] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                        Clear Sorting
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm bg-[#21262d] hover:bg-[#30363d] rounded-lg text-[#c9d1d9] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 rounded-lg text-white transition-colors flex items-center gap-2"
                        >
                            <ArrowUpDown className="w-4 h-4" />
                            Apply Sort
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MultiSortModal;
