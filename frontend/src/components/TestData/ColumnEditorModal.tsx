/**
 * Column Editor Modal
 *
 * Modal for adding/editing data table columns with:
 * - Column name input
 * - Type selection (text, number, boolean, date, formula)
 * - Formula input for computed columns
 * - Validation
 */

import { useState, useEffect, useMemo } from 'react';
import { X, Type, Hash, Calendar, ToggleLeft, Calculator, HelpCircle, Link2 } from 'lucide-react';
import type { DataColumn } from './AGGridDataTable';

// Sheet info for reference column configuration
interface SheetInfo {
    id: string;
    name: string;
    columns: { name: string; type: string }[];
}

interface ColumnEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (column: DataColumn) => void;
    existingColumn?: DataColumn;
    existingColumnNames: string[];
    mode: 'add' | 'edit';
    availableSheets?: SheetInfo[]; // For reference column configuration
    currentSheetId?: string; // Exclude current sheet from reference options
}

const TYPE_OPTIONS: { value: DataColumn['type']; label: string; icon: typeof Type; description: string }[] = [
    { value: 'text', label: 'Text', icon: Type, description: 'String values like names, emails' },
    { value: 'number', label: 'Number', icon: Hash, description: 'Numeric values, integers or decimals' },
    { value: 'boolean', label: 'Boolean', icon: ToggleLeft, description: 'True/false values' },
    { value: 'date', label: 'Date', icon: Calendar, description: 'Date values' },
    { value: 'formula', label: 'Formula', icon: Calculator, description: 'Computed from other columns' },
    { value: 'reference', label: 'Reference', icon: Link2, description: 'Link to rows in another table' },
];

export function ColumnEditorModal({
    isOpen,
    onClose,
    onSave,
    existingColumn,
    existingColumnNames,
    mode,
    availableSheets = [],
    currentSheetId,
}: ColumnEditorModalProps) {
    const [name, setName] = useState('');
    const [type, setType] = useState<DataColumn['type']>('text');
    const [formula, setFormula] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showFormulaHelp, setShowFormulaHelp] = useState(false);

    // Reference column configuration state
    const [targetSheet, setTargetSheet] = useState<string>('');
    const [targetColumn, setTargetColumn] = useState<string>('');
    const [displayColumn, setDisplayColumn] = useState<string>('');
    const [allowMultiple, setAllowMultiple] = useState(false);

    // Filter out current sheet from available sheets for reference selection
    const referenceableSheets = useMemo(() => {
        return availableSheets.filter(sheet => sheet.id !== currentSheetId);
    }, [availableSheets, currentSheetId]);

    // Get columns from selected target sheet
    const targetSheetColumns = useMemo(() => {
        const sheet = referenceableSheets.find(s => s.id === targetSheet || s.name === targetSheet);
        return sheet?.columns || [];
    }, [referenceableSheets, targetSheet]);

    useEffect(() => {
        if (isOpen) {
            if (existingColumn) {
                setName(existingColumn.name);
                setType(existingColumn.type);
                setFormula(existingColumn.formula || '');
                // Initialize reference config if editing a reference column
                if (existingColumn.referenceConfig) {
                    setTargetSheet(existingColumn.referenceConfig.targetSheet);
                    setTargetColumn(existingColumn.referenceConfig.targetColumn);
                    setDisplayColumn(existingColumn.referenceConfig.displayColumn);
                    setAllowMultiple(existingColumn.referenceConfig.allowMultiple);
                } else {
                    setTargetSheet('');
                    setTargetColumn('');
                    setDisplayColumn('');
                    setAllowMultiple(false);
                }
            } else {
                // Generate unique column name
                let baseName = 'column';
                let index = 1;
                while (existingColumnNames.includes(`${baseName}${index}`)) {
                    index++;
                }
                setName(`${baseName}${index}`);
                setType('text');
                setFormula('');
                setTargetSheet('');
                setTargetColumn('');
                setDisplayColumn('');
                setAllowMultiple(false);
            }
            setError(null);
            setShowFormulaHelp(false);
        }
    }, [isOpen, existingColumn, existingColumnNames]);

    const handleSave = () => {
        // Validate
        const trimmedName = name.trim();

        if (!trimmedName) {
            setError('Column name is required');
            return;
        }

        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmedName)) {
            setError('Column name must start with a letter (or $ for references) and contain only letters, numbers, underscores, and $');
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

        // Validate formula if type is formula
        if (type === 'formula' && !formula.trim()) {
            setError('Formula is required for computed columns');
            return;
        }

        // Validate reference configuration if type is reference
        if (type === 'reference') {
            if (!targetSheet) {
                setError('Please select a target table');
                return;
            }
            if (!targetColumn) {
                setError('Please select an ID column from the target table');
                return;
            }
            if (!displayColumn) {
                setError('Please select a display column');
                return;
            }
        }

        const column: DataColumn = {
            name: trimmedName,
            type,
        };

        if (type === 'formula' && formula.trim()) {
            column.formula = formula.trim();
        }

        if (type === 'reference') {
            column.referenceConfig = {
                targetSheet,
                targetColumn,
                displayColumn,
                allowMultiple,
                separator: ',',
            };
        }

        onSave(column);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-900 rounded-lg shadow-xl w-full max-w-md my-auto max-h-[90vh] flex flex-col">
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
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
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
                                        className={`flex items-start gap-3 p-3 rounded-md border transition-colors text-left ${isSelected
                                            ? 'border-emerald-500 bg-emerald-500/10'
                                            : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
                                            }`}
                                    >
                                        <Icon
                                            className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-500'
                                                }`}
                                        />
                                        <div>
                                            <p
                                                className={`text-sm font-medium ${isSelected ? 'text-emerald-400' : 'text-slate-300'
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

                    {/* Formula Input - Only shown when type is 'formula' */}
                    {type === 'formula' && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    Formula Expression
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowFormulaHelp(!showFormulaHelp)}
                                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-300"
                                >
                                    <HelpCircle className="w-4 h-4" />
                                </button>
                            </div>

                            {showFormulaHelp && (
                                <div className="mb-3 p-3 bg-slate-800/50 rounded-md border border-slate-700 text-xs text-slate-400">
                                    <p className="font-medium text-slate-300 mb-2">Formula Syntax:</p>
                                    <ul className="space-y-1">
                                        <li>Use column names directly: <code className="text-amber-400">price * quantity</code></li>
                                        <li>Basic math operators: <code className="text-amber-400">+</code>, <code className="text-amber-400">-</code>, <code className="text-amber-400">*</code>, <code className="text-amber-400">/</code></li>
                                        <li>Parentheses for grouping: <code className="text-amber-400">(price + tax) * quantity</code></li>
                                    </ul>
                                    <p className="mt-2 text-slate-500">
                                        Note: Formula columns are read-only and auto-computed.
                                    </p>
                                </div>
                            )}

                            <input
                                type="text"
                                value={formula}
                                onChange={(e) => {
                                    setFormula(e.target.value);
                                    setError(null);
                                }}
                                placeholder="e.g., price * quantity"
                                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                            />
                            <p className="mt-1.5 text-xs text-slate-500">
                                Reference other columns by name. Result is computed automatically.
                            </p>
                        </div>
                    )}

                    {/* Reference Configuration - Only shown when type is 'reference' */}
                    {type === 'reference' && (
                        <div className="space-y-4">
                            <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-md">
                                <p className="text-xs text-sky-300">
                                    <Link2 className="w-3.5 h-3.5 inline mr-1.5" />
                                    Reference columns link to rows in another table. Values are stored as IDs but display friendly names.
                                </p>
                            </div>

                            {/* Target Sheet Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Target Table
                                </label>
                                {referenceableSheets.length === 0 ? (
                                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
                                        <p className="text-xs text-amber-300">
                                            No other tables available. Create another data table first to use references.
                                        </p>
                                    </div>
                                ) : (
                                    <select
                                        value={targetSheet}
                                        onChange={(e) => {
                                            setTargetSheet(e.target.value);
                                            setTargetColumn('');
                                            setDisplayColumn('');
                                            setError(null);
                                        }}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                                    >
                                        <option value="">Select a table...</option>
                                        {referenceableSheets.map((sheet) => (
                                            <option key={sheet.id} value={sheet.id}>
                                                {sheet.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Target Column (ID) Selection */}
                            {targetSheet && targetSheetColumns.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        ID Column <span className="text-slate-500 font-normal">(stored in cell)</span>
                                    </label>
                                    <select
                                        value={targetColumn}
                                        onChange={(e) => {
                                            setTargetColumn(e.target.value);
                                            setError(null);
                                        }}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                                    >
                                        <option value="">Select ID column...</option>
                                        {targetSheetColumns.map((col) => (
                                            <option key={col.name} value={col.name}>
                                                {col.name} ({col.type})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-xs text-slate-500">
                                        The unique identifier column (e.g., DriverID, VehicleID)
                                    </p>
                                </div>
                            )}

                            {/* Display Column Selection */}
                            {targetSheet && targetSheetColumns.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Display Column <span className="text-slate-500 font-normal">(shown in cell)</span>
                                    </label>
                                    <select
                                        value={displayColumn}
                                        onChange={(e) => {
                                            setDisplayColumn(e.target.value);
                                            setError(null);
                                        }}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                                    >
                                        <option value="">Select display column...</option>
                                        {targetSheetColumns.map((col) => (
                                            <option key={col.name} value={col.name}>
                                                {col.name} ({col.type})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-xs text-slate-500">
                                        The column shown in the cell (e.g., Name, Make)
                                    </p>
                                </div>
                            )}

                            {/* Allow Multiple Selection */}
                            {targetSheet && (
                                <div className="flex items-center gap-3 pt-2">
                                    <input
                                        type="checkbox"
                                        id="allowMultiple"
                                        checked={allowMultiple}
                                        onChange={(e) => setAllowMultiple(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
                                    />
                                    <label htmlFor="allowMultiple" className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-300">
                                            Allow multiple selections
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            Enable to select multiple rows (e.g., $drivers with "D001, D002")
                                        </span>
                                    </label>
                                </div>
                            )}

                            {/* Target Table Preview */}
                            {targetSheet && targetSheetColumns.length > 0 && (
                                <div className="pt-4">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Target Table Columns Preview
                                    </label>
                                    <div className="border border-slate-700 rounded-md overflow-hidden">
                                        <div className="max-h-48 overflow-auto">
                                            <table className="w-full min-w-max border-collapse text-sm">
                                                <thead className="bg-slate-800 sticky top-0">
                                                    <tr>
                                                        {targetSheetColumns.map((col) => (
                                                            <th
                                                                key={col.name}
                                                                className={`px-3 py-2 text-left text-xs font-semibold whitespace-nowrap border-b border-slate-700 ${col.name === targetColumn
                                                                        ? 'text-emerald-400 bg-emerald-500/10'
                                                                        : col.name === displayColumn
                                                                            ? 'text-sky-400 bg-sky-500/10'
                                                                            : 'text-slate-400'
                                                                    }`}
                                                            >
                                                                {col.name}
                                                                {col.name === targetColumn && (
                                                                    <span className="ml-1 text-[10px] text-emerald-500">(ID)</span>
                                                                )}
                                                                {col.name === displayColumn && (
                                                                    <span className="ml-1 text-[10px] text-sky-500">(Display)</span>
                                                                )}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr className="text-slate-500 italic">
                                                        {targetSheetColumns.map((col) => (
                                                            <td
                                                                key={col.name}
                                                                className="px-3 py-2 border-b border-slate-700/50 whitespace-nowrap"
                                                            >
                                                                {col.type}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="px-3 py-1.5 bg-slate-800/50 border-t border-slate-700 text-xs text-slate-500">
                                            {targetSheetColumns.length} column{targetSheetColumns.length !== 1 ? 's' : ''} •
                                            <span className="text-emerald-400 ml-1">Green = ID column</span> •
                                            <span className="text-sky-400 ml-1">Blue = Display column</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
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
