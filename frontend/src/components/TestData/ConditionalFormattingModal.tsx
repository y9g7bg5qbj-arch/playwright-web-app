/**
 * Conditional Formatting Modal
 *
 * Allows users to define formatting rules that apply based on cell values:
 * - Multiple rules with priority ordering
 * - Various conditions (equals, contains, greater than, etc.)
 * - Format options (background color, text color, font weight)
 * - Enable/disable individual rules
 */

import { useState, useCallback } from 'react';
import { X, Plus, Trash2, GripVertical, Check, Palette, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import type { DataColumn } from './AGGridDataTable';
import type { CellFormat } from './CellFormattingModal';

export interface ConditionalFormatRule {
    id: string;
    name: string;
    column: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
    value: string;
    format: CellFormat;
    enabled: boolean;
}

interface ConditionalFormattingModalProps {
    isOpen: boolean;
    onClose: () => void;
    columns: DataColumn[];
    rules: ConditionalFormatRule[];
    onApply: (rules: ConditionalFormatRule[]) => void;
}

const OPERATORS = [
    { value: 'equals', label: 'Equals', requiresValue: true },
    { value: 'notEquals', label: 'Not Equals', requiresValue: true },
    { value: 'contains', label: 'Contains', requiresValue: true },
    { value: 'notContains', label: 'Does Not Contain', requiresValue: true },
    { value: 'startsWith', label: 'Starts With', requiresValue: true },
    { value: 'endsWith', label: 'Ends With', requiresValue: true },
    { value: 'greaterThan', label: 'Greater Than', requiresValue: true },
    { value: 'lessThan', label: 'Less Than', requiresValue: true },
    { value: 'isEmpty', label: 'Is Empty', requiresValue: false },
    { value: 'isNotEmpty', label: 'Is Not Empty', requiresValue: false },
];

const PRESET_FORMATS: { name: string; format: CellFormat }[] = [
    { name: 'Success', format: { backgroundColor: '#064e3b', textColor: '#34d399', fontWeight: 'normal', textAlign: 'left' } },
    { name: 'Warning', format: { backgroundColor: '#78350f', textColor: '#fbbf24', fontWeight: 'normal', textAlign: 'left' } },
    { name: 'Error', format: { backgroundColor: '#881337', textColor: '#fb7185', fontWeight: 'normal', textAlign: 'left' } },
    { name: 'Info', format: { backgroundColor: '#0c4a6e', textColor: '#38bdf8', fontWeight: 'normal', textAlign: 'left' } },
    { name: 'Bold', format: { fontWeight: 'bold', textAlign: 'left' } },
    { name: 'Muted', format: { textColor: '#6b7280', fontWeight: 'normal', textAlign: 'left' } },
];

function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}

export function ConditionalFormattingModal({
    isOpen,
    onClose,
    columns,
    rules: initialRules,
    onApply,
}: ConditionalFormattingModalProps) {
    const [rules, setRules] = useState<ConditionalFormatRule[]>(initialRules);
    const [expandedRule, setExpandedRule] = useState<string | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Add a new rule
    const handleAddRule = useCallback(() => {
        const newRule: ConditionalFormatRule = {
            id: generateId(),
            name: `Rule ${rules.length + 1}`,
            column: columns[0]?.name || '',
            operator: 'equals',
            value: '',
            format: { backgroundColor: '#064e3b', textColor: '#34d399', fontWeight: 'normal', textAlign: 'left' },
            enabled: true,
        };
        setRules(prev => [...prev, newRule]);
        setExpandedRule(newRule.id);
    }, [rules.length, columns]);

    // Update a rule
    const handleUpdateRule = useCallback((id: string, updates: Partial<ConditionalFormatRule>) => {
        setRules(prev =>
            prev.map(rule =>
                rule.id === id ? { ...rule, ...updates } : rule
            )
        );
    }, []);

    // Delete a rule
    const handleDeleteRule = useCallback((id: string) => {
        setRules(prev => prev.filter(rule => rule.id !== id));
        if (expandedRule === id) {
            setExpandedRule(null);
        }
    }, [expandedRule]);

    // Toggle rule enabled
    const handleToggleEnabled = useCallback((id: string) => {
        setRules(prev =>
            prev.map(rule =>
                rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
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

        setRules(prev => {
            const newRules = [...prev];
            const [removed] = newRules.splice(draggedIndex, 1);
            newRules.splice(index, 0, removed);
            return newRules;
        });
        setDraggedIndex(index);
    }, [draggedIndex]);

    const handleDragEnd = useCallback(() => {
        setDraggedIndex(null);
    }, []);

    // Apply format preset
    const handleApplyPreset = useCallback((ruleId: string, format: CellFormat) => {
        handleUpdateRule(ruleId, { format });
    }, [handleUpdateRule]);

    // Apply all rules
    const handleApply = useCallback(() => {
        onApply(rules);
        onClose();
    }, [rules, onApply, onClose]);

    // Clear all rules
    const handleClear = useCallback(() => {
        onApply([]);
        onClose();
    }, [onApply, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <Zap className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">Conditional Formatting</h2>
                            <p className="text-xs text-[#8b949e]">Apply formatting rules based on cell values</p>
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
                <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                    {rules.length === 0 ? (
                        <div className="text-center py-8 text-[#8b949e]">
                            <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No formatting rules defined</p>
                            <p className="text-xs mt-1">Click "Add Rule" to create conditional formatting</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {rules.map((rule, index) => {
                                const isExpanded = expandedRule === rule.id;
                                const operator = OPERATORS.find(o => o.value === rule.operator);

                                return (
                                    <div
                                        key={rule.id}
                                        draggable
                                        onDragStart={() => handleDragStart(index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragEnd={handleDragEnd}
                                        className={`border border-[#30363d] rounded-lg overflow-hidden transition-all ${
                                            draggedIndex === index ? 'opacity-50' : ''
                                        } ${rule.enabled ? 'bg-[#21262d]' : 'bg-[#21262d]/50'}`}
                                    >
                                        {/* Rule header */}
                                        <div className="flex items-center gap-3 px-3 py-2">
                                            <div className="cursor-grab active:cursor-grabbing text-[#6e7681] hover:text-[#8b949e]">
                                                <GripVertical className="w-4 h-4" />
                                            </div>

                                            {/* Priority */}
                                            <div className="w-6 h-6 flex items-center justify-center bg-emerald-500/20 rounded-full text-xs font-bold text-emerald-400">
                                                {index + 1}
                                            </div>

                                            {/* Preview swatch */}
                                            <div
                                                className="w-6 h-6 rounded border border-[#30363d]"
                                                style={{
                                                    backgroundColor: rule.format.backgroundColor || 'transparent',
                                                }}
                                            />

                                            {/* Rule summary */}
                                            <button
                                                onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                                                className="flex-1 text-left"
                                            >
                                                <div className={`text-sm font-medium ${rule.enabled ? 'text-white' : 'text-[#8b949e]'}`}>
                                                    {rule.name}
                                                </div>
                                                <div className="text-xs text-[#6e7681]">
                                                    If "{rule.column}" {operator?.label.toLowerCase()} {operator?.requiresValue ? `"${rule.value}"` : ''}
                                                </div>
                                            </button>

                                            {/* Enable toggle */}
                                            <button
                                                onClick={() => handleToggleEnabled(rule.id)}
                                                className={`p-1.5 rounded transition-colors ${
                                                    rule.enabled
                                                        ? 'bg-emerald-500/20 text-emerald-400'
                                                        : 'bg-[#30363d] text-[#6e7681]'
                                                }`}
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>

                                            {/* Expand toggle */}
                                            <button
                                                onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                                                className="p-1.5 text-[#8b949e] hover:text-white rounded transition-colors"
                                            >
                                                {isExpanded ? (
                                                    <ChevronUp className="w-4 h-4" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4" />
                                                )}
                                            </button>

                                            {/* Delete */}
                                            <button
                                                onClick={() => handleDeleteRule(rule.id)}
                                                className="p-1.5 text-[#6e7681] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Expanded editor */}
                                        {isExpanded && (
                                            <div className="px-4 py-3 border-t border-[#30363d] bg-[#0d1117]/50 space-y-4">
                                                {/* Rule name */}
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-[#8b949e]">Rule Name</label>
                                                    <input
                                                        type="text"
                                                        value={rule.name}
                                                        onChange={(e) => handleUpdateRule(rule.id, { name: e.target.value })}
                                                        className="w-full px-3 py-1.5 bg-[#21262d] border border-[#30363d] rounded text-sm text-white focus:outline-none focus:border-sky-500"
                                                    />
                                                </div>

                                                {/* Condition */}
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-[#8b949e]">Column</label>
                                                        <select
                                                            value={rule.column}
                                                            onChange={(e) => handleUpdateRule(rule.id, { column: e.target.value })}
                                                            className="w-full px-3 py-1.5 bg-[#21262d] border border-[#30363d] rounded text-sm text-white focus:outline-none focus:border-sky-500"
                                                        >
                                                            {columns.map(col => (
                                                                <option key={col.name} value={col.name}>{col.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-[#8b949e]">Condition</label>
                                                        <select
                                                            value={rule.operator}
                                                            onChange={(e) => handleUpdateRule(rule.id, { operator: e.target.value as ConditionalFormatRule['operator'] })}
                                                            className="w-full px-3 py-1.5 bg-[#21262d] border border-[#30363d] rounded text-sm text-white focus:outline-none focus:border-sky-500"
                                                        >
                                                            {OPERATORS.map(op => (
                                                                <option key={op.value} value={op.value}>{op.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-[#8b949e]">Value</label>
                                                        <input
                                                            type="text"
                                                            value={rule.value}
                                                            onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                                                            disabled={!operator?.requiresValue}
                                                            className="w-full px-3 py-1.5 bg-[#21262d] border border-[#30363d] rounded text-sm text-white focus:outline-none focus:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            placeholder={operator?.requiresValue ? 'Enter value...' : 'N/A'}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Format presets */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-[#8b949e] flex items-center gap-2">
                                                        <Palette className="w-3 h-3" />
                                                        Format Presets
                                                    </label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {PRESET_FORMATS.map(preset => (
                                                            <button
                                                                key={preset.name}
                                                                onClick={() => handleApplyPreset(rule.id, preset.format)}
                                                                className="px-2 py-1 rounded text-xs transition-colors flex items-center gap-1.5 hover:ring-1 hover:ring-sky-500"
                                                                style={{
                                                                    backgroundColor: preset.format.backgroundColor || '#21262d',
                                                                    color: preset.format.textColor || '#c9d1d9',
                                                                    fontWeight: preset.format.fontWeight || 'normal',
                                                                }}
                                                            >
                                                                {preset.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Custom colors */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-[#8b949e]">Background Color</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                value={rule.format.backgroundColor || '#21262d'}
                                                                onChange={(e) => handleUpdateRule(rule.id, {
                                                                    format: { ...rule.format, backgroundColor: e.target.value }
                                                                })}
                                                                className="w-10 h-8 rounded border border-[#30363d] cursor-pointer"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={rule.format.backgroundColor || ''}
                                                                onChange={(e) => handleUpdateRule(rule.id, {
                                                                    format: { ...rule.format, backgroundColor: e.target.value }
                                                                })}
                                                                className="flex-1 px-2 py-1 bg-[#21262d] border border-[#30363d] rounded text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                                                                placeholder="#000000"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-[#8b949e]">Text Color</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                value={rule.format.textColor || '#c9d1d9'}
                                                                onChange={(e) => handleUpdateRule(rule.id, {
                                                                    format: { ...rule.format, textColor: e.target.value }
                                                                })}
                                                                className="w-10 h-8 rounded border border-[#30363d] cursor-pointer"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={rule.format.textColor || ''}
                                                                onChange={(e) => handleUpdateRule(rule.id, {
                                                                    format: { ...rule.format, textColor: e.target.value }
                                                                })}
                                                                className="flex-1 px-2 py-1 bg-[#21262d] border border-[#30363d] rounded text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                                                                placeholder="#ffffff"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Add rule button */}
                    <button
                        onClick={handleAddRule}
                        className="w-full py-2 px-3 border border-dashed border-[#30363d] hover:border-emerald-500/50 rounded-lg text-sm text-[#8b949e] hover:text-emerald-400 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Rule
                    </button>

                    <p className="text-xs text-[#6e7681] text-center">
                        Drag rows to change rule priority. Rules are applied in order (first match wins).
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-[#30363d] bg-[#0d1117]/50">
                    <button
                        onClick={handleClear}
                        className="px-4 py-2 text-sm text-[#8b949e] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                        Clear All Rules
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
                            className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition-colors flex items-center gap-2"
                        >
                            <Zap className="w-4 h-4" />
                            Apply Rules
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ConditionalFormattingModal;
