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
import { Search, Filter, Layers, BarChart2, Copy, Check } from 'lucide-react';
import { Modal, Button } from '@/components/ui';

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

    const totalCount = values.length;
    const uniqueCount = distinctValues.length;
    const maxCount = Math.max(...distinctValues.map(v => v.count), 1);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Distinct Values"
            description={`Column: "${columnName}"`}
            size="md"
            bodyClassName="p-0"
            footer={
                <div className="flex items-center justify-between w-full">
                    <p className="text-xs text-text-muted">
                        Click <Filter className="w-3 h-3 inline" /> to filter grid by value
                    </p>
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            }
        >
            {/* Stats bar */}
            <div className="flex items-center justify-between px-5 py-3 bg-dark-canvas/50 border-b border-border-default">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-text-secondary" />
                        <span className="text-xs text-text-secondary">Total:</span>
                        <span className="text-sm font-medium text-white">{totalCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-text-secondary" />
                        <span className="text-xs text-text-secondary">Unique:</span>
                        <span className="text-sm font-medium text-accent-purple">{uniqueCount.toLocaleString()}</span>
                    </div>
                </div>
                <button
                    onClick={handleCopyAll}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                        copied
                            ? 'bg-status-success/20 text-status-success'
                            : 'hover:bg-dark-elevated text-text-secondary'
                    }`}
                >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy All'}
                </button>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-border-default">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search values..."
                        className="w-full pl-9 pr-4 py-2 bg-dark-canvas border border-border-default rounded-lg text-sm text-white placeholder-text-muted focus:outline-none focus:border-accent-purple"
                    />
                </div>
            </div>

            {/* Values list */}
            <div className="max-h-80 overflow-y-auto">
                {filteredValues.length === 0 ? (
                    <div className="text-center py-8 text-text-secondary">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No matching values</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border-default/50">
                        {filteredValues.map((item, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 px-5 py-2.5 hover:bg-dark-elevated transition-colors group"
                            >
                                {/* Value */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`text-sm truncate ${
                                                item.value === null
                                                    ? 'text-text-muted italic'
                                                    : 'text-white'
                                            }`}
                                            title={item.value ?? '(empty)'}
                                        >
                                            {item.value ?? '(empty)'}
                                        </span>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="mt-1 h-1.5 bg-dark-elevated rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-accent-purple to-accent-purple rounded-full transition-all"
                                            style={{ width: `${(item.count / maxCount) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-3 text-xs">
                                    <div className="text-right">
                                        <div className="font-medium text-white">{item.count.toLocaleString()}</div>
                                        <div className="text-text-muted">{item.percentage.toFixed(1)}%</div>
                                    </div>
                                    {/* Filter button */}
                                    <button
                                        onClick={() => handleFilter(item.value)}
                                        className="p-1.5 opacity-0 group-hover:opacity-100 bg-accent-purple/20 hover:bg-accent-purple/40 text-accent-purple rounded transition-all"
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
        </Modal>
    );
}

export default DistinctValuesModal;
