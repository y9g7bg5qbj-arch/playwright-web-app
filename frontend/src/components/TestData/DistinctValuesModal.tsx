/**
 * Distinct Values Modal
 *
 * Shows unique values in a column with:
 * - Value count and percentage
 * - Search/filter values
 * - Click to filter the grid
 * - Visual breakdown chart
 */

import { useState, useMemo, useCallback } from 'react';
import { X, Search, Filter, Layers, BarChart2, Copy, Check } from 'lucide-react';

interface DistinctValue {
    value: string | null;
    count: number;
    percentage: number;
}

interface DistinctValuesModalProps {
    isOpen: boolean;
    onClose: () => void;
    columnName: string;
    values: any[];
    onFilterByValue: (value: string | null) => void;
}

export function DistinctValuesModal({
    isOpen,
    onClose,
    columnName,
    values,
    onFilterByValue,
}: DistinctValuesModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [copied, setCopied] = useState(false);

    // Calculate distinct values with counts
    const distinctValues = useMemo((): DistinctValue[] => {
        const counts = new Map<string | null, number>();

        values.forEach(value => {
            const normalizedValue = value === null || value === undefined || value === ''
                ? null
                : String(value);
            counts.set(normalizedValue, (counts.get(normalizedValue) || 0) + 1);
        });

        const total = values.length;
        const result: DistinctValue[] = [];

        counts.forEach((count, value) => {
            result.push({
                value,
                count,
                percentage: total > 0 ? (count / total) * 100 : 0,
            });
        });

        // Sort by count descending
        return result.sort((a, b) => b.count - a.count);
    }, [values]);

    // Filter by search term
    const filteredValues = useMemo(() => {
        if (!searchTerm.trim()) return distinctValues;

        const term = searchTerm.toLowerCase();
        return distinctValues.filter(v =>
            v.value === null
                ? 'empty'.includes(term) || 'null'.includes(term)
                : v.value.toLowerCase().includes(term)
        );
    }, [distinctValues, searchTerm]);

    // Copy all values to clipboard
    const handleCopyAll = useCallback(async () => {
        const text = distinctValues
            .map(v => v.value ?? '(empty)')
            .join('\n');

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, [distinctValues]);

    // Handle filter by value
    const handleFilter = useCallback((value: string | null) => {
        onFilterByValue(value);
        onClose();
    }, [onFilterByValue, onClose]);

    if (!isOpen) return null;

    const totalCount = values.length;
    const uniqueCount = distinctValues.length;
    const maxCount = Math.max(...distinctValues.map(v => v.count), 1);

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
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Layers className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">Distinct Values</h2>
                            <p className="text-xs text-[#8b949e]">Column: "{columnName}"</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-[#30363d] rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-[#8b949e]" />
                    </button>
                </div>

                {/* Stats bar */}
                <div className="flex items-center justify-between px-5 py-3 bg-[#0d1117]/50 border-b border-[#30363d]">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <BarChart2 className="w-4 h-4 text-[#8b949e]" />
                            <span className="text-xs text-[#8b949e]">Total:</span>
                            <span className="text-sm font-medium text-white">{totalCount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-[#8b949e]" />
                            <span className="text-xs text-[#8b949e]">Unique:</span>
                            <span className="text-sm font-medium text-purple-400">{uniqueCount.toLocaleString()}</span>
                        </div>
                    </div>
                    <button
                        onClick={handleCopyAll}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                            copied
                                ? 'bg-emerald-600/20 text-emerald-400'
                                : 'hover:bg-[#21262d] text-[#8b949e]'
                        }`}
                    >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Copied!' : 'Copy All'}
                    </button>
                </div>

                {/* Search */}
                <div className="px-5 py-3 border-b border-[#30363d]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search values..."
                            className="w-full pl-9 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-white placeholder-[#6e7681] focus:outline-none focus:border-purple-500"
                        />
                    </div>
                </div>

                {/* Values list */}
                <div className="max-h-80 overflow-y-auto">
                    {filteredValues.length === 0 ? (
                        <div className="text-center py-8 text-[#8b949e]">
                            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No matching values</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#30363d]/50">
                            {filteredValues.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#21262d] transition-colors group"
                                >
                                    {/* Value */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`text-sm truncate ${
                                                    item.value === null
                                                        ? 'text-[#6e7681] italic'
                                                        : 'text-white'
                                                }`}
                                                title={item.value ?? '(empty)'}
                                            >
                                                {item.value ?? '(empty)'}
                                            </span>
                                        </div>
                                        {/* Progress bar */}
                                        <div className="mt-1 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all"
                                                style={{ width: `${(item.count / maxCount) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center gap-3 text-xs">
                                        <div className="text-right">
                                            <div className="font-medium text-white">{item.count.toLocaleString()}</div>
                                            <div className="text-[#6e7681]">{item.percentage.toFixed(1)}%</div>
                                        </div>
                                        {/* Filter button */}
                                        <button
                                            onClick={() => handleFilter(item.value)}
                                            className="p-1.5 opacity-0 group-hover:opacity-100 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded transition-all"
                                            title={`Filter by "${item.value ?? '(empty)'}"`}
                                        >
                                            <Filter className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-[#30363d] bg-[#0d1117]/50">
                    <p className="text-xs text-[#6e7681]">
                        Click <Filter className="w-3 h-3 inline" /> to filter grid by value
                    </p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm bg-[#21262d] hover:bg-[#30363d] rounded-lg text-[#c9d1d9] transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DistinctValuesModal;
