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
import { X, Palette, AlignLeft, AlignCenter, AlignRight, Bold, Type, Check } from 'lucide-react';

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-sky-500/20 rounded-lg">
                            <Palette className="w-5 h-5 text-sky-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">Cell Formatting</h2>
                            {cellColumn && (
                                <p className="text-xs text-[#8b949e]">Column: {cellColumn}</p>
                            )}
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
                <div className="p-5 space-y-5">
                    {/* Preview */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wide">Preview</label>
                        <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-lg">
                            <div
                                className="px-3 py-2 rounded border border-[#30363d]"
                                style={previewStyle as React.CSSProperties}
                            >
                                {cellValue}
                            </div>
                        </div>
                    </div>

                    {/* Presets */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wide">Presets</label>
                        <div className="grid grid-cols-3 gap-2">
                            {PRESETS.map((preset) => (
                                <button
                                    key={preset.name}
                                    onClick={() => handleApplyPreset(preset.format)}
                                    className="flex flex-col items-center gap-1 p-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg transition-colors group"
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
                                    <span className="text-[10px] text-[#8b949e] group-hover:text-white transition-colors">
                                        {preset.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Background Color */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wide flex items-center gap-2">
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
                                            ? 'border-sky-500 scale-110'
                                            : 'border-[#30363d] hover:border-[#484f58]'
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
                        <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wide flex items-center gap-2">
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
                                            ? 'border-sky-500 scale-110'
                                            : 'border-[#30363d] hover:border-[#484f58]'
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
                            <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wide flex items-center gap-2">
                                <Bold className="w-3.5 h-3.5" />
                                Font Weight
                            </label>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setFormat(f => ({ ...f, fontWeight: 'normal' }))}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                                        format.fontWeight === 'normal'
                                            ? 'bg-sky-500 text-white'
                                            : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d]'
                                    }`}
                                >
                                    Normal
                                </button>
                                <button
                                    onClick={() => setFormat(f => ({ ...f, fontWeight: 'bold' }))}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                                        format.fontWeight === 'bold'
                                            ? 'bg-sky-500 text-white'
                                            : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d]'
                                    }`}
                                >
                                    Bold
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wide flex items-center gap-2">
                                <AlignLeft className="w-3.5 h-3.5" />
                                Alignment
                            </label>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setFormat(f => ({ ...f, textAlign: 'left' }))}
                                    className={`flex-1 py-2 px-3 rounded-lg transition-colors flex items-center justify-center ${
                                        format.textAlign === 'left'
                                            ? 'bg-sky-500 text-white'
                                            : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d]'
                                    }`}
                                >
                                    <AlignLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setFormat(f => ({ ...f, textAlign: 'center' }))}
                                    className={`flex-1 py-2 px-3 rounded-lg transition-colors flex items-center justify-center ${
                                        format.textAlign === 'center'
                                            ? 'bg-sky-500 text-white'
                                            : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d]'
                                    }`}
                                >
                                    <AlignCenter className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setFormat(f => ({ ...f, textAlign: 'right' }))}
                                    className={`flex-1 py-2 px-3 rounded-lg transition-colors flex items-center justify-center ${
                                        format.textAlign === 'right'
                                            ? 'bg-sky-500 text-white'
                                            : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d]'
                                    }`}
                                >
                                    <AlignRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-[#30363d] bg-[#0d1117]/50">
                    <button
                        onClick={handleClear}
                        className="px-4 py-2 text-sm text-[#8b949e] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                        Clear Format
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
                            className="px-4 py-2 text-sm bg-sky-600 hover:bg-sky-500 rounded-lg text-white transition-colors flex items-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            Apply
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CellFormattingModal;
