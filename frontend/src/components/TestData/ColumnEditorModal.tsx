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
import { Type, Hash, Calendar, ToggleLeft, Calculator, HelpCircle, Link2 } from 'lucide-react';
import { Modal, Button, Tooltip } from '@/components/ui';
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
    const [required, setRequired] = useState(false);
    const [formula, setFormula] = useState('');
    const [minValue, setMinValue] = useState('');
    const [maxValue, setMaxValue] = useState('');
    const [minLength, setMinLength] = useState('');
    const [maxLength, setMaxLength] = useState('');
    const [pattern, setPattern] = useState('');
    const [enumValuesRaw, setEnumValuesRaw] = useState('');
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
                setRequired(Boolean(existingColumn.required));
                setFormula(existingColumn.formula || '');
                const validation = existingColumn.validation || {};
                setMinValue(String(validation.min ?? existingColumn.min ?? ''));
                setMaxValue(String(validation.max ?? existingColumn.max ?? ''));
                setMinLength(String(validation.minLength ?? existingColumn.minLength ?? ''));
                setMaxLength(String(validation.maxLength ?? existingColumn.maxLength ?? ''));
                setPattern(validation.pattern ?? existingColumn.pattern ?? '');
                setEnumValuesRaw((validation.enum ?? existingColumn.enum ?? []).join(', '));
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
                setRequired(false);
                setFormula('');
                setMinValue('');
                setMaxValue('');
                setMinLength('');
                setMaxLength('');
                setPattern('');
                setEnumValuesRaw('');
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

        const toOptionalNumber = (value: string) => {
            if (!value.trim()) return undefined;
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : NaN;
        };

        const parsedMin = toOptionalNumber(minValue);
        const parsedMax = toOptionalNumber(maxValue);
        const parsedMinLength = toOptionalNumber(minLength);
        const parsedMaxLength = toOptionalNumber(maxLength);

        if (Number.isNaN(parsedMin) || Number.isNaN(parsedMax) || Number.isNaN(parsedMinLength) || Number.isNaN(parsedMaxLength)) {
            setError('Validation bounds must be valid numbers');
            return;
        }
        if (parsedMin !== undefined && parsedMax !== undefined && parsedMin > parsedMax) {
            setError('Min value cannot be greater than max value');
            return;
        }
        if (parsedMinLength !== undefined && parsedMaxLength !== undefined && parsedMinLength > parsedMaxLength) {
            setError('Min length cannot be greater than max length');
            return;
        }
        if (pattern.trim()) {
            try {
                // Validate regex format
                new RegExp(pattern.trim());
            } catch {
                setError('Pattern must be a valid regular expression');
                return;
            }
        }

        const enumValues = enumValuesRaw
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);

        const column: DataColumn = {
            name: trimmedName,
            type,
            required,
        };

        const validation: NonNullable<DataColumn['validation']> = {
            ...(parsedMin !== undefined && { min: parsedMin }),
            ...(parsedMax !== undefined && { max: parsedMax }),
            ...(parsedMinLength !== undefined && { minLength: parsedMinLength }),
            ...(parsedMaxLength !== undefined && { maxLength: parsedMaxLength }),
            ...(pattern.trim() && { pattern: pattern.trim() }),
            ...(enumValues.length > 0 && { enum: enumValues }),
        };

        if (Object.keys(validation).length > 0) {
            column.validation = validation;
            column.min = validation.min;
            column.max = validation.max;
            column.minLength = validation.minLength;
            column.maxLength = validation.maxLength;
            column.pattern = validation.pattern;
            column.enum = validation.enum;
        }

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

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'add' ? 'Add Column' : 'Edit Column'}
            size="md"
            bodyClassName="max-h-[70vh]"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="success" onClick={handleSave}>
                        {mode === 'add' ? 'Add Column' : 'Save Changes'}
                    </Button>
                </>
            }
        >
            <div className="space-y-6">
                    {/* Column Name */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
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
                            className="w-full bg-dark-elevated border border-border-default rounded-md px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:border-status-success"
                            autoFocus
                        />
                        {error && (
                            <p className="mt-1.5 text-xs text-status-danger">{error}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-3 rounded-md border border-border-default bg-dark-elevated/30 px-3 py-2">
                        <input
                            type="checkbox"
                            id="columnRequired"
                            checked={required}
                            onChange={(event) => setRequired(event.target.checked)}
                            className="h-4 w-4 rounded border-border-default bg-dark-elevated text-status-success focus:ring-status-success"
                        />
                        <label htmlFor="columnRequired" className="text-sm text-text-primary">
                            Required field
                        </label>
                    </div>

                    {/* Column Type */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
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
                                            ? 'border-status-success bg-status-success/10'
                                            : 'border-border-default hover:border-border-default hover:bg-dark-elevated/50'
                                            }`}
                                    >
                                        <Icon
                                            className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isSelected ? 'text-status-success' : 'text-text-secondary'
                                                }`}
                                        />
                                        <div>
                                            <p
                                                className={`text-sm font-medium ${isSelected ? 'text-status-success' : 'text-text-primary'
                                                    }`}
                                            >
                                                {option.label}
                                            </p>
                                            <p className="text-xs text-text-secondary mt-0.5">
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
                                <label className="block text-sm font-medium text-text-primary">
                                    Formula Expression
                                </label>
                                <Tooltip content={showFormulaHelp ? 'Hide formula help' : 'Show formula help'} showDelayMs={0} hideDelayMs={0}>
                                    <button
                                        type="button"
                                        onClick={() => setShowFormulaHelp(!showFormulaHelp)}
                                        className="p-1 hover:bg-dark-elevated rounded text-text-secondary hover:text-text-primary"
                                        aria-label={showFormulaHelp ? 'Hide formula help' : 'Show formula help'}
                                    >
                                        <HelpCircle className="w-4 h-4" />
                                    </button>
                                </Tooltip>
                            </div>

                            {showFormulaHelp && (
                                <div className="mb-3 p-3 bg-dark-elevated/50 rounded-md border border-border-default text-xs text-text-secondary">
                                    <p className="font-medium text-text-primary mb-2">Formula Syntax:</p>
                                    <ul className="space-y-1">
                                        <li>Use column names directly: <code className="text-status-warning">price * quantity</code></li>
                                        <li>Basic math operators: <code className="text-status-warning">+</code>, <code className="text-status-warning">-</code>, <code className="text-status-warning">*</code>, <code className="text-status-warning">/</code></li>
                                        <li>Parentheses for grouping: <code className="text-status-warning">(price + tax) * quantity</code></li>
                                    </ul>
                                    <p className="mt-2 text-text-secondary">
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
                                className="w-full bg-dark-elevated border border-border-default rounded-md px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:border-status-success font-mono text-sm"
                            />
                            <p className="mt-1.5 text-xs text-text-secondary">
                                Reference other columns by name. Result is computed automatically.
                            </p>
                        </div>
                    )}

                    {/* Reference Configuration - Only shown when type is 'reference' */}
                    {type === 'reference' && (
                        <div className="space-y-4">
                            <div className="p-3 bg-status-info/10 border border-status-info/30 rounded-md">
                                <p className="text-xs text-status-info">
                                    <Link2 className="w-3.5 h-3.5 inline mr-1.5" />
                                    Reference columns link to rows in another table. Values are stored as IDs but display friendly names.
                                </p>
                            </div>

                            {/* Target Sheet Selection */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Target Table
                                </label>
                                {referenceableSheets.length === 0 ? (
                                    <div className="p-3 bg-status-warning/10 border border-status-warning/30 rounded-md">
                                        <p className="text-xs text-status-warning">
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
                                        className="w-full bg-dark-elevated border border-border-default rounded-md px-3 py-2 text-text-primary focus:outline-none focus:border-status-info"
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
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        ID Column <span className="text-text-secondary font-normal">(stored in cell)</span>
                                    </label>
                                    <select
                                        value={targetColumn}
                                        onChange={(e) => {
                                            setTargetColumn(e.target.value);
                                            setError(null);
                                        }}
                                        className="w-full bg-dark-elevated border border-border-default rounded-md px-3 py-2 text-text-primary focus:outline-none focus:border-status-info"
                                    >
                                        <option value="">Select ID column...</option>
                                        {targetSheetColumns.map((col) => (
                                            <option key={col.name} value={col.name}>
                                                {col.name} ({col.type})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-xs text-text-secondary">
                                        The unique identifier column (e.g., DriverID, VehicleID)
                                    </p>
                                </div>
                            )}

                            {/* Display Column Selection */}
                            {targetSheet && targetSheetColumns.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        Display Column <span className="text-text-secondary font-normal">(shown in cell)</span>
                                    </label>
                                    <select
                                        value={displayColumn}
                                        onChange={(e) => {
                                            setDisplayColumn(e.target.value);
                                            setError(null);
                                        }}
                                        className="w-full bg-dark-elevated border border-border-default rounded-md px-3 py-2 text-text-primary focus:outline-none focus:border-status-info"
                                    >
                                        <option value="">Select display column...</option>
                                        {targetSheetColumns.map((col) => (
                                            <option key={col.name} value={col.name}>
                                                {col.name} ({col.type})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-xs text-text-secondary">
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
                                        className="w-4 h-4 rounded border-border-default bg-dark-elevated text-status-info focus:ring-status-info"
                                    />
                                    <label htmlFor="allowMultiple" className="flex flex-col">
                                        <span className="text-sm font-medium text-text-primary">
                                            Allow multiple selections
                                        </span>
                                        <span className="text-xs text-text-secondary">
                                            Enable to select multiple rows (e.g., $drivers with "D001, D002")
                                        </span>
                                    </label>
                                </div>
                            )}

                            {/* Target Table Preview */}
                            {targetSheet && targetSheetColumns.length > 0 && (
                                <div className="pt-4">
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        Target Table Columns Preview
                                    </label>
                                    <div className="border border-border-default rounded-md overflow-hidden">
                                        <div className="max-h-48 overflow-auto">
                                            <table className="w-full min-w-max border-collapse text-sm">
                                                <thead className="bg-dark-elevated sticky top-0">
                                                    <tr>
                                                        {targetSheetColumns.map((col) => (
                                                            <th
                                                                key={col.name}
                                                                className={`px-3 py-2 text-left text-xs font-semibold whitespace-nowrap border-b border-border-default ${col.name === targetColumn
                                                                        ? 'text-status-success bg-status-success/10'
                                                                        : col.name === displayColumn
                                                                            ? 'text-status-info bg-status-info/10'
                                                                            : 'text-text-secondary'
                                                                    }`}
                                                            >
                                                                {col.name}
                                                                {col.name === targetColumn && (
                                                                    <span className="ml-1 text-3xs text-status-success">(ID)</span>
                                                                )}
                                                                {col.name === displayColumn && (
                                                                    <span className="ml-1 text-3xs text-status-info">(Display)</span>
                                                                )}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr className="text-text-secondary italic">
                                                        {targetSheetColumns.map((col) => (
                                                            <td
                                                                key={col.name}
                                                                className="px-3 py-2 border-b border-border-default/50 whitespace-nowrap"
                                                            >
                                                                {col.type}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="px-3 py-1.5 bg-dark-elevated/50 border-t border-border-default text-xs text-text-secondary">
                                            {targetSheetColumns.length} column{targetSheetColumns.length !== 1 ? 's' : ''} •
                                            <span className="text-status-success ml-1">Green = ID column</span> •
                                            <span className="text-status-info ml-1">Blue = Display column</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Validation Controls */}
                    <div className="space-y-3 rounded-md border border-border-default bg-dark-elevated/25 p-3">
                        <p className="text-sm font-medium text-text-primary">Validation Rules</p>
                        {(type === 'number') && (
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="mb-1 block text-xs text-text-secondary">Min</label>
                                    <input
                                        type="number"
                                        value={minValue}
                                        onChange={(event) => setMinValue(event.target.value)}
                                        placeholder="e.g., 0"
                                        className="w-full rounded-md border border-border-default bg-dark-elevated px-2.5 py-2 text-sm text-text-primary focus:border-status-success focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-text-secondary">Max</label>
                                    <input
                                        type="number"
                                        value={maxValue}
                                        onChange={(event) => setMaxValue(event.target.value)}
                                        placeholder="e.g., 100"
                                        className="w-full rounded-md border border-border-default bg-dark-elevated px-2.5 py-2 text-sm text-text-primary focus:border-status-success focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        {(type === 'text' || type === 'reference' || type === 'formula') && (
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="mb-1 block text-xs text-text-secondary">Min Length</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={minLength}
                                        onChange={(event) => setMinLength(event.target.value)}
                                        placeholder="e.g., 1"
                                        className="w-full rounded-md border border-border-default bg-dark-elevated px-2.5 py-2 text-sm text-text-primary focus:border-status-success focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-text-secondary">Max Length</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={maxLength}
                                        onChange={(event) => setMaxLength(event.target.value)}
                                        placeholder="e.g., 64"
                                        className="w-full rounded-md border border-border-default bg-dark-elevated px-2.5 py-2 text-sm text-text-primary focus:border-status-success focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        {(type === 'text' || type === 'reference' || type === 'formula') && (
                            <div>
                                <label className="mb-1 block text-xs text-text-secondary">Pattern (Regex)</label>
                                <input
                                    type="text"
                                    value={pattern}
                                    onChange={(event) => setPattern(event.target.value)}
                                    placeholder="e.g., ^[A-Z]{3}-\\d+$"
                                    className="w-full rounded-md border border-border-default bg-dark-elevated px-2.5 py-2 font-mono text-sm text-text-primary focus:border-status-success focus:outline-none"
                                />
                            </div>
                        )}

                        {(type === 'text' || type === 'reference' || type === 'formula') && (
                            <div>
                                <label className="mb-1 block text-xs text-text-secondary">Allowed Values (comma-separated)</label>
                                <input
                                    type="text"
                                    value={enumValuesRaw}
                                    onChange={(event) => setEnumValuesRaw(event.target.value)}
                                    placeholder="e.g., admin, manager, analyst"
                                    className="w-full rounded-md border border-border-default bg-dark-elevated px-2.5 py-2 text-sm text-text-primary focus:border-status-success focus:outline-none"
                                />
                            </div>
                        )}
                        <p className="text-xs text-text-secondary">
                            Validation is strictly enforced on new writes and edited values. Existing legacy-invalid values are highlighted until corrected.
                        </p>
                    </div>
                </div>
        </Modal>
    );
}

export default ColumnEditorModal;
