/**
 * Column Editor Modal
 *
 * Modal for adding/editing data table columns with:
 * - Column name input
 * - Type selection (text, number, boolean, date)
 * - Validation
 */

import { useState, useEffect } from 'react';
import { X, Type, Hash, Calendar, ToggleLeft } from 'lucide-react';
import type { DataColumn } from './AGGridDataTable';

interface ColumnEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (column: DataColumn) => void;
    existingColumn?: DataColumn;
    existingColumnNames: string[];
    mode: 'add' | 'edit';
}

const TYPE_OPTIONS: { value: DataColumn['type']; label: string; icon: typeof Type; description: string }[] = [
    { value: 'text', label: 'Text', icon: Type, description: 'String values like names, emails' },
    { value: 'number', label: 'Number', icon: Hash, description: 'Numeric values, integers or decimals' },
    { value: 'boolean', label: 'Boolean', icon: ToggleLeft, description: 'True/false values' },
    { value: 'date', label: 'Date', icon: Calendar, description: 'Date values' },
];

export function ColumnEditorModal({
    isOpen,
    onClose,
    onSave,
    existingColumn,
    existingColumnNames,
    mode,
}: ColumnEditorModalProps) {
    const [name, setName] = useState('');
    const [type, setType] = useState<DataColumn['type']>('text');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (existingColumn) {
                setName(existingColumn.name);
                setType(existingColumn.type);
            } else {
                // Generate unique column name
                let baseName = 'column';
                let index = 1;
                while (existingColumnNames.includes(`${baseName}${index}`)) {
                    index++;
                }
                setName(`${baseName}${index}`);
                setType('text');
            }
            setError(null);
        }
    }, [isOpen, existingColumn, existingColumnNames]);

    const handleSave = () => {
        // Validate
        const trimmedName = name.trim();

        if (!trimmedName) {
            setError('Column name is required');
            return;
        }

        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName)) {
            setError('Column name must start with a letter and contain only letters, numbers, and underscores');
            return;
        }

        // Check for duplicate names (excluding current column in edit mode)
        const isNameTaken = existingColumnNames
            .filter((n) => mode === 'edit' ? n !== existingColumn?.name : true)
            .includes(trimmedName);

        if (isNameTaken) {
            setError('A column with this name already exists');
            return;
        }

        onSave({
            name: trimmedName,
            type,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-slate-900 rounded-lg shadow-xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <h2 className="text-lg font-semibold text-slate-200">
                        {mode === 'add' ? 'Add Column' : 'Edit Column'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-800 rounded-md transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Column Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Column Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                setError(null);
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            placeholder="e.g., email, username, price"
                            className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                            autoFocus
                        />
                        {error && (
                            <p className="mt-1.5 text-xs text-red-400">{error}</p>
                        )}
                    </div>

                    {/* Column Type */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Data Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {TYPE_OPTIONS.map((option) => {
                                const Icon = option.icon;
                                const isSelected = type === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => setType(option.value)}
                                        className={`flex items-start gap-3 p-3 rounded-md border transition-colors text-left ${
                                            isSelected
                                                ? 'border-emerald-500 bg-emerald-500/10'
                                                : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
                                        }`}
                                    >
                                        <Icon
                                            className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                                isSelected ? 'text-emerald-400' : 'text-slate-500'
                                            }`}
                                        />
                                        <div>
                                            <p
                                                className={`text-sm font-medium ${
                                                    isSelected ? 'text-emerald-400' : 'text-slate-300'
                                                }`}
                                            >
                                                {option.label}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {option.description}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-md text-sm text-white transition-colors"
                    >
                        {mode === 'add' ? 'Add Column' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ColumnEditorModal;
