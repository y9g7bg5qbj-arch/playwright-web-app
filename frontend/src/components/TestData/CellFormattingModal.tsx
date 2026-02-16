/**
 * Cell Formatting Modal
 *
 * Allows users to apply visual formatting to cells:
 * - Background color
 * - Text color
 * - Font weight (Normal/Bold)
 * - Text alignment (Left/Center/Right)
 * - Pre-defined presets for common use cases
 */

import { useState, useCallback, useMemo } from 'react';
import { Palette, AlignLeft, AlignCenter, AlignRight, Bold, Type, Check } from 'lucide-react';
import { Modal, Button } from '@/components/ui';

export interface CellFormat {
    backgroundColor?: string;
    textColor?: string;
    fontWeight?: 'normal' | 'bold';
    textAlign?: 'left' | 'center' | 'right';
}

interface CellFormattingModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFormat?: CellFormat;
    cellValue?: string;
    cellColumn?: string;
    onApply: (format: CellFormat) => void;
    onClear: () => void;
}

// Color presets for quick selection
const BACKGROUND_COLORS = [
    { name: 'None', value: 'transparent' },
    { name: 'Sky', value: '#0c4a6e' },
    { name: 'Emerald', value: '#064e3b' },
    { name: 'Amber', value: '#78350f' },
    { name: 'Rose', value: '#881337' },
    { name: 'Purple', value: '#581c87' },
    { name: 'Gray', value: '#374151' },
    { name: 'Slate', value: '#1e293b' },
];

const TEXT_COLORS = [
    { name: 'Default', value: '#c9d1d9' },
    { name: 'White', value: '#ffffff' },
    { name: 'Sky', value: '#38bdf8' },
    { name: 'Emerald', value: '#34d399' },
    { name: 'Amber', value: '#fbbf24' },
    { name: 'Rose', value: '#fb7185' },
    { name: 'Purple', value: '#a78bfa' },
    { name: 'Gray', value: '#9ca3af' },
];

// Pre-defined formatting presets
const PRESETS: { name: string; format: CellFormat; description: string }[] = [
    {
        name: 'Header',
        description: 'Bold white on dark blue',
        format: {
            backgroundColor: '#1e3a5f',
            textColor: '#ffffff',
            fontWeight: 'bold',
            textAlign: 'center',
        },
    },
    {
        name: 'Success',
        description: 'Green background',
        format: {
            backgroundColor: '#064e3b',
            textColor: '#34d399',
            fontWeight: 'normal',
            textAlign: 'left',
        },
    },
    {
        name: 'Warning',
        description: 'Amber background',
        format: {
            backgroundColor: '#78350f',
            textColor: '#fbbf24',
            fontWeight: 'normal',
            textAlign: 'left',
        },
    },
    {
        name: 'Error',
        description: 'Red background',
        format: {
            backgroundColor: '#881337',
            textColor: '#fb7185',
            fontWeight: 'normal',
            textAlign: 'left',
        },
    },
    {
        name: 'Currency',
        description: 'Right-aligned, emerald text',
        format: {
            backgroundColor: 'transparent',
            textColor: '#34d399',
            fontWeight: 'bold',
            textAlign: 'right',
        },
    },
    {
        name: 'Muted',
        description: 'Dimmed text',
        format: {
            backgroundColor: 'transparent',
            textColor: '#6b7280',
            fontWeight: 'normal',
            textAlign: 'left',
        },
    },
];

export function CellFormattingModal({
    isOpen,
    onClose,
    currentFormat,
    cellValue = 'Sample Value',
    cellColumn,
    onApply,
    onClear,
}: CellFormattingModalProps) {
    const [format, setFormat] = useState<CellFormat>(currentFormat || {
        backgroundColor: 'transparent',
        textColor: '#c9d1d9',
        fontWeight: 'normal',
        textAlign: 'left',
    });

    // Apply preset
    const handleApplyPreset = useCallback((preset: CellFormat) => {
        setFormat(preset);
    }, []);

    // Preview style
    const previewStyle = useMemo(() => ({
        backgroundColor: format.backgroundColor || 'transparent',
        color: format.textColor || '#c9d1d9',
        fontWeight: format.fontWeight || 'normal',
        textAlign: format.textAlign || 'left',
    }), [format]);

    const handleApply = useCallback(() => {
        onApply(format);
        onClose();
    }, [format, onApply, onClose]);

    const handleClear = useCallback(() => {
        onClear();
        onClose();
    }, [onClear, onClose]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Cell Formatting"
            description={cellColumn ? `Column: ${cellColumn}` : undefined}
            size="md"
            footer={
                <div className="flex items-center justify-between w-full">
                        <Button variant="ghost" className="text-status-danger hover:bg-status-danger/10" onClick={handleClear}>
                            Clear Format
                        </Button>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button variant="action" onClick={handleApply} leftIcon={<Check className="w-4 h-4" />}>
                            Apply
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="space-y-5">
                {/* Preview */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Preview</label>
                    <div className="p-4 bg-dark-canvas border border-border-default rounded-lg">
                        <div
                            className="px-3 py-2 rounded border border-border-default"
                            style={previewStyle as React.CSSProperties}
                        >
                            {cellValue}
                        </div>
                    </div>
                </div>

                {/* Presets */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Presets</label>
                    <div className="grid grid-cols-3 gap-2">
                        {PRESETS.map((preset) => (
                            <button
                                key={preset.name}
                                onClick={() => handleApplyPreset(preset.format)}
                                className="flex flex-col items-center gap-1 p-2 bg-dark-elevated hover:bg-dark-elevated border border-border-default rounded-lg transition-colors group"
                                title={preset.description}
                            >
                                <div
                                    className="w-full h-6 rounded text-xs flex items-center justify-center font-medium"
                                    style={{
                                        backgroundColor: preset.format.backgroundColor,
                                        color: preset.format.textColor,
                                        fontWeight: preset.format.fontWeight,
                                    }}
                                >
                                    Aa
                                </div>
                                <span className="text-3xs text-text-secondary group-hover:text-white transition-colors">
                                    {preset.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Background Color */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wide flex items-center gap-2">
                        <Palette className="w-3.5 h-3.5" />
                        Background Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {BACKGROUND_COLORS.map((color) => (
                            <button
                                key={color.value}
                                onClick={() => setFormat(f => ({ ...f, backgroundColor: color.value }))}
                                className={`w-8 h-8 rounded-lg border-2 transition-all ${
                                    format.backgroundColor === color.value
                                        ? 'border-status-info scale-110'
                                        : 'border-border-default hover:border-border-default'
                                }`}
                                style={{ backgroundColor: color.value === 'transparent' ? '#0d1117' : color.value }}
                                title={color.name}
                            >
                                {format.backgroundColor === color.value && (
                                    <Check className="w-4 h-4 mx-auto text-white" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Text Color */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wide flex items-center gap-2">
                        <Type className="w-3.5 h-3.5" />
                        Text Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {TEXT_COLORS.map((color) => (
                            <button
                                key={color.value}
                                onClick={() => setFormat(f => ({ ...f, textColor: color.value }))}
                                className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center ${
                                    format.textColor === color.value
                                        ? 'border-status-info scale-110'
                                        : 'border-border-default hover:border-border-default'
                                }`}
                                style={{ backgroundColor: '#21262d' }}
                                title={color.name}
                            >
                                <span style={{ color: color.value }} className="font-bold text-sm">A</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Font Weight & Alignment */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-text-secondary uppercase tracking-wide flex items-center gap-2">
                            <Bold className="w-3.5 h-3.5" />
                            Font Weight
                        </label>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setFormat(f => ({ ...f, fontWeight: 'normal' }))}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                                    format.fontWeight === 'normal'
                                        ? 'bg-status-info text-white'
                                        : 'bg-dark-elevated text-text-secondary hover:bg-dark-elevated'
                                }`}
                            >
                                Normal
                            </button>
                            <button
                                onClick={() => setFormat(f => ({ ...f, fontWeight: 'bold' }))}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                                    format.fontWeight === 'bold'
                                        ? 'bg-status-info text-white'
                                        : 'bg-dark-elevated text-text-secondary hover:bg-dark-elevated'
                                }`}
                            >
                                Bold
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-text-secondary uppercase tracking-wide flex items-center gap-2">
                            <AlignLeft className="w-3.5 h-3.5" />
                            Alignment
                        </label>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setFormat(f => ({ ...f, textAlign: 'left' }))}
                                className={`flex-1 py-2 px-3 rounded-lg transition-colors flex items-center justify-center ${
                                    format.textAlign === 'left'
                                        ? 'bg-status-info text-white'
                                        : 'bg-dark-elevated text-text-secondary hover:bg-dark-elevated'
                                }`}
                            >
                                <AlignLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setFormat(f => ({ ...f, textAlign: 'center' }))}
                                className={`flex-1 py-2 px-3 rounded-lg transition-colors flex items-center justify-center ${
                                    format.textAlign === 'center'
                                        ? 'bg-status-info text-white'
                                        : 'bg-dark-elevated text-text-secondary hover:bg-dark-elevated'
                                }`}
                            >
                                <AlignCenter className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setFormat(f => ({ ...f, textAlign: 'right' }))}
                                className={`flex-1 py-2 px-3 rounded-lg transition-colors flex items-center justify-center ${
                                    format.textAlign === 'right'
                                        ? 'bg-status-info text-white'
                                        : 'bg-dark-elevated text-text-secondary hover:bg-dark-elevated'
                                }`}
                            >
                                <AlignRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

export default CellFormattingModal;
