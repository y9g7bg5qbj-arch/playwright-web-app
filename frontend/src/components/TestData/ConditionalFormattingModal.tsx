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
import { Plus, Trash2, GripVertical, Check, Palette, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { IconButton, Modal, Button, Tooltip } from '@/components/ui';
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

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Conditional Formatting"
            description="Apply formatting rules based on cell values"
            size="2xl"
            footer={
                <div className="flex items-center justify-between w-full">
                    <Button
                        variant="ghost"
                        className="text-status-danger hover:text-status-danger hover:bg-status-danger/10"
                        onClick={handleClear}
                    >
                        Clear All Rules
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button
                            variant="action"
                            leftIcon={<Zap className="w-4 h-4" />}
                            onClick={handleApply}
                        >
                            Apply Rules
                        </Button>
                    </div>
                </div>
            }
        >
                <div className="space-y-4">
                    {rules.length === 0 ? (
                        <div className="text-center py-8 text-text-secondary">
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
                                        className={`border border-border-default rounded-lg overflow-hidden transition-all ${
                                            draggedIndex === index ? 'opacity-50' : ''
                                        } ${rule.enabled ? 'bg-dark-elevated' : 'bg-dark-elevated/50'}`}
                                    >
                                        {/* Rule header */}
                                        <div className="flex items-center gap-3 px-3 py-2">
                                            <div className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary">
                                                <GripVertical className="w-4 h-4" />
                                            </div>

                                            {/* Priority */}
                                            <div className="w-6 h-6 flex items-center justify-center bg-status-success/20 rounded-full text-xs font-bold text-status-success">
                                                {index + 1}
                                            </div>

                                            {/* Preview swatch */}
                                            <div
                                                className="w-6 h-6 rounded border border-border-default"
                                                style={{
                                                    backgroundColor: rule.format.backgroundColor || 'transparent',
                                                }}
                                            />

                                            {/* Rule summary */}
                                            <button
                                                onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                                                className="flex-1 text-left"
                                            >
                                                <div className={`text-sm font-medium ${rule.enabled ? 'text-white' : 'text-text-secondary'}`}>
                                                    {rule.name}
                                                </div>
                                                <div className="text-xs text-text-muted">
                                                    If "{rule.column}" {operator?.label.toLowerCase()} {operator?.requiresValue ? `"${rule.value}"` : ''}
                                                </div>
                                            </button>

                                            {/* Enable toggle */}
                                            <Tooltip content={rule.enabled ? 'Disable rule' : 'Enable rule'} showDelayMs={0} hideDelayMs={0}>
                                                <button
                                                    onClick={() => handleToggleEnabled(rule.id)}
                                                    className={`p-1.5 rounded transition-colors ${
                                                        rule.enabled
                                                            ? 'bg-status-success/20 text-status-success'
                                                            : 'bg-dark-elevated text-text-muted'
                                                    }`}
                                                    aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            </Tooltip>

                                            {/* Expand toggle */}
                                            <Tooltip content={isExpanded ? 'Collapse rule details' : 'Expand rule details'} showDelayMs={0} hideDelayMs={0}>
                                                <button
                                                    onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                                                    className="p-1.5 text-text-secondary hover:text-white rounded transition-colors"
                                                    aria-label={isExpanded ? 'Collapse rule details' : 'Expand rule details'}
                                                >
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </Tooltip>

                                            {/* Delete */}
                                            <IconButton
                                                icon={<Trash2 className="w-4 h-4" />}
                                                size="sm"
                                                variant="ghost"
                                                tone="danger"
                                                tooltip="Delete rule"
                                                onClick={() => handleDeleteRule(rule.id)}
                                            />
                                        </div>

                                        {/* Expanded editor */}
                                        {isExpanded && (
                                            <div className="px-4 py-3 border-t border-border-default bg-dark-canvas/50 space-y-4">
                                                {/* Rule name */}
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-text-secondary">Rule Name</label>
                                                    <input
                                                        type="text"
                                                        value={rule.name}
                                                        onChange={(e) => handleUpdateRule(rule.id, { name: e.target.value })}
                                                        className="w-full px-3 py-1.5 bg-dark-elevated border border-border-default rounded text-sm text-white focus:outline-none focus:border-status-info"
                                                    />
                                                </div>

                                                {/* Condition */}
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-text-secondary">Column</label>
                                                        <select
                                                            value={rule.column}
                                                            onChange={(e) => handleUpdateRule(rule.id, { column: e.target.value })}
                                                            className="w-full px-3 py-1.5 bg-dark-elevated border border-border-default rounded text-sm text-white focus:outline-none focus:border-status-info"
                                                        >
                                                            {columns.map(col => (
                                                                <option key={col.name} value={col.name}>{col.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-text-secondary">Condition</label>
                                                        <select
                                                            value={rule.operator}
                                                            onChange={(e) => handleUpdateRule(rule.id, { operator: e.target.value as ConditionalFormatRule['operator'] })}
                                                            className="w-full px-3 py-1.5 bg-dark-elevated border border-border-default rounded text-sm text-white focus:outline-none focus:border-status-info"
                                                        >
                                                            {OPERATORS.map(op => (
                                                                <option key={op.value} value={op.value}>{op.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-text-secondary">Value</label>
                                                        <input
                                                            type="text"
                                                            value={rule.value}
                                                            onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                                                            disabled={!operator?.requiresValue}
                                                            className="w-full px-3 py-1.5 bg-dark-elevated border border-border-default rounded text-sm text-white focus:outline-none focus:border-status-info disabled:opacity-50 disabled:cursor-not-allowed"
                                                            placeholder={operator?.requiresValue ? 'Enter value...' : 'N/A'}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Format presets */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-text-secondary flex items-center gap-2">
                                                        <Palette className="w-3 h-3" />
                                                        Format Presets
                                                    </label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {PRESET_FORMATS.map(preset => (
                                                            <button
                                                                key={preset.name}
                                                                onClick={() => handleApplyPreset(rule.id, preset.format)}
                                                                className="px-2 py-1 rounded text-xs transition-colors flex items-center gap-1.5 hover:ring-1 hover:ring-status-info"
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
                                                        <label className="text-xs font-medium text-text-secondary">Background Color</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                value={rule.format.backgroundColor || '#21262d'}
                                                                onChange={(e) => handleUpdateRule(rule.id, {
                                                                    format: { ...rule.format, backgroundColor: e.target.value }
                                                                })}
                                                                className="w-10 h-8 rounded border border-border-default cursor-pointer"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={rule.format.backgroundColor || ''}
                                                                onChange={(e) => handleUpdateRule(rule.id, {
                                                                    format: { ...rule.format, backgroundColor: e.target.value }
                                                                })}
                                                                className="flex-1 px-2 py-1 bg-dark-elevated border border-border-default rounded text-xs text-white font-mono focus:outline-none focus:border-status-info"
                                                                placeholder="#000000"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-text-secondary">Text Color</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                value={rule.format.textColor || '#c9d1d9'}
                                                                onChange={(e) => handleUpdateRule(rule.id, {
                                                                    format: { ...rule.format, textColor: e.target.value }
                                                                })}
                                                                className="w-10 h-8 rounded border border-border-default cursor-pointer"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={rule.format.textColor || ''}
                                                                onChange={(e) => handleUpdateRule(rule.id, {
                                                                    format: { ...rule.format, textColor: e.target.value }
                                                                })}
                                                                className="flex-1 px-2 py-1 bg-dark-elevated border border-border-default rounded text-xs text-white font-mono focus:outline-none focus:border-status-info"
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
                        className="w-full py-2 px-3 border border-dashed border-border-default hover:border-status-success/50 rounded-lg text-sm text-text-secondary hover:text-status-success transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Rule
                    </button>

                    <p className="text-xs text-text-muted text-center">
                        Drag rows to change rule priority. Rules are applied in order (first match wins).
                    </p>
                </div>
        </Modal>
    );
}

export default ConditionalFormattingModal;
