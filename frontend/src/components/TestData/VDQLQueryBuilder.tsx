/**
 * VDQL Query Builder
 *
 * Visual query builder that generates Vero Data Query Language code.
 * Users can build filters, select columns, and configure sorting without
 * writing code directly.
 */

import { useState, useEffect, useMemo } from 'react';
import {
    Filter, Plus, Trash2, Copy, Check, Code,
    ArrowUpDown, ChevronDown
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface Column {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
}

interface FilterCondition {
    id: string;
    column: string;
    operator: string;
    value: string;
    logicalOperator: 'and' | 'or';
}

interface SortConfig {
    column: string;
    direction: 'asc' | 'desc';
}

interface VDQLQueryBuilderProps {
    tableName: string;
    columns: Column[];
    onQueryGenerated?: (query: string) => void;
    onCopyToClipboard?: (query: string) => void;
    initialQuery?: string;
}

// ============================================
// CONSTANTS
// ============================================

const STRING_OPERATORS = [
    { value: '==', label: 'equals' },
    { value: '!=', label: 'not equals' },
    { value: 'contains', label: 'contains' },
    { value: 'starts with', label: 'starts with' },
    { value: 'ends with', label: 'ends with' },
    { value: 'matches', label: 'matches (regex)' },
    { value: 'is empty', label: 'is empty' },
    { value: 'is not empty', label: 'is not empty' },
];

const NUMBER_OPERATORS = [
    { value: '==', label: 'equals' },
    { value: '!=', label: 'not equals' },
    { value: '>', label: 'greater than' },
    { value: '<', label: 'less than' },
    { value: '>=', label: 'greater or equal' },
    { value: '<=', label: 'less or equal' },
    { value: 'is empty', label: 'is empty' },
];

const BOOLEAN_OPERATORS = [
    { value: '==', label: 'is' },
    { value: '!=', label: 'is not' },
];

const AGGREGATION_FUNCTIONS = [
    { value: 'count', label: 'Count rows' },
    { value: 'sum', label: 'Sum' },
    { value: 'average', label: 'Average' },
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' },
    { value: 'distinct', label: 'Distinct values' },
];

// ============================================
// COMPONENT
// ============================================

export function VDQLQueryBuilder({
    tableName,
    columns,
    onQueryGenerated,
    onCopyToClipboard,
}: VDQLQueryBuilderProps) {
    // Query configuration state
    const [resultType, setResultType] = useState<'data' | 'list' | 'number' | 'text'>('data');
    const [variableName, setVariableName] = useState('result');
    const [selectedColumn, setSelectedColumn] = useState<string>('');
    const [filters, setFilters] = useState<FilterCondition[]>([]);
    const [sorting, setSorting] = useState<SortConfig | null>(null);
    const [limitValue, setLimitValue] = useState<string>('');
    const [offsetValue, setOffsetValue] = useState<string>('');
    const [aggregation, setAggregation] = useState<string>('');
    const [aggregationColumn, setAggregationColumn] = useState<string>('');
    const [position, setPosition] = useState<'all' | 'first' | 'last'>('all');

    // UI state
    const [copied, setCopied] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Get operators based on column type
    const getOperatorsForColumn = (columnName: string) => {
        const column = columns.find(c => c.name === columnName);
        if (!column) return STRING_OPERATORS;

        switch (column.type) {
            case 'number':
                return NUMBER_OPERATORS;
            case 'boolean':
                return BOOLEAN_OPERATORS;
            default:
                return STRING_OPERATORS;
        }
    };

    // Add a new filter condition
    const addFilter = () => {
        const newFilter: FilterCondition = {
            id: Date.now().toString(),
            column: columns.length > 0 ? columns[0].name : '',
            operator: '==',
            value: '',
            logicalOperator: filters.length > 0 ? 'and' : 'and',
        };
        setFilters([...filters, newFilter]);
    };

    // Remove a filter condition
    const removeFilter = (id: string) => {
        setFilters(filters.filter(f => f.id !== id));
    };

    // Update a filter condition
    const updateFilter = (id: string, field: keyof FilterCondition, value: string) => {
        setFilters(filters.map(f =>
            f.id === id ? { ...f, [field]: value } : f
        ));
    };

    // Convert table name to PascalCase
    const toPascalCase = (str: string): string => {
        return str
            .replace(/[^a-zA-Z0-9]/g, ' ')
            .split(' ')
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
    };

    // Generate VDQL query
    const generatedQuery = useMemo(() => {
        const tableRef = `TestData.${toPascalCase(tableName)}`;
        let query = '';

        // Handle aggregation queries
        if (resultType === 'number' && aggregation) {
            query = `number ${variableName} = `;

            if (aggregation === 'count') {
                query += `count ${tableRef}`;
            } else if (['sum', 'average', 'min', 'max'].includes(aggregation)) {
                if (aggregationColumn) {
                    query += `${aggregation} ${tableRef}.${aggregationColumn}`;
                } else {
                    query += `${aggregation} ${tableRef}`;
                }
            } else if (aggregation === 'distinct') {
                if (aggregationColumn) {
                    query += `count distinct ${tableRef}.${aggregationColumn}`;
                }
            }
        }
        // Handle list queries
        else if (resultType === 'list') {
            query = `list ${variableName} = ${tableRef}`;
            if (selectedColumn) {
                query += `.${selectedColumn}`;
            }
        }
        // Handle text queries (single value)
        else if (resultType === 'text') {
            query = `text ${variableName} = `;
            if (position === 'first') {
                query += `first ${tableRef}`;
            } else if (position === 'last') {
                query += `last ${tableRef}`;
            } else {
                query += tableRef;
            }
            if (selectedColumn) {
                query += `.${selectedColumn}`;
            }
        }
        // Handle data queries (row/rows)
        else {
            query = `data ${variableName} = `;
            if (position === 'first') {
                query += `first ${tableRef}`;
            } else if (position === 'last') {
                query += `last ${tableRef}`;
            } else {
                query += tableRef;
            }
        }

        // Add WHERE clause
        if (filters.length > 0) {
            const whereConditions = filters.map((filter, index) => {
                let condition = '';

                // Add logical operator for subsequent conditions
                if (index > 0) {
                    condition += ` ${filter.logicalOperator} `;
                }

                // Handle operators that don't need a value
                if (filter.operator === 'is empty' || filter.operator === 'is not empty') {
                    condition += `${filter.column} ${filter.operator}`;
                } else {
                    // Determine value format
                    const column = columns.find(c => c.name === filter.column);
                    let formattedValue = filter.value;

                    if (column?.type === 'string' || column?.type === 'date') {
                        formattedValue = `"${filter.value}"`;
                    } else if (column?.type === 'boolean') {
                        formattedValue = filter.value.toLowerCase() === 'true' ? 'true' : 'false';
                    }

                    condition += `${filter.column} ${filter.operator} ${formattedValue}`;
                }

                return condition;
            });

            query += ` where ${whereConditions.join('')}`;
        }

        // Add ORDER BY
        if (sorting && sorting.column) {
            query += ` order by ${sorting.column} ${sorting.direction}`;
        }

        // Add LIMIT
        if (limitValue && parseInt(limitValue) > 0) {
            query += ` limit ${limitValue}`;
        }

        // Add OFFSET
        if (offsetValue && parseInt(offsetValue) > 0) {
            query += ` offset ${offsetValue}`;
        }

        return query;
    }, [
        tableName, resultType, variableName, selectedColumn,
        filters, sorting, limitValue, offsetValue,
        aggregation, aggregationColumn, position, columns
    ]);

    // Notify parent when query changes
    useEffect(() => {
        if (onQueryGenerated) {
            onQueryGenerated(generatedQuery);
        }
    }, [generatedQuery, onQueryGenerated]);

    // Copy to clipboard
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(generatedQuery);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            if (onCopyToClipboard) {
                onCopyToClipboard(generatedQuery);
            }
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="bg-dark-bg rounded-lg border border-border-default p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Code size={18} className="text-purple-400" />
                    <h3 className="text-sm font-medium text-white">VDQL Query Builder</h3>
                </div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy Code'}
                </button>
            </div>

            {/* Result Type Selection */}
            <div className="mb-4">
                <label className="block text-xs text-text-muted mb-2">Result Type</label>
                <div className="flex gap-2 flex-wrap">
                    {(['data', 'list', 'number', 'text'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => setResultType(type)}
                            className={`px-3 py-1.5 text-xs rounded transition-colors ${
                                resultType === type
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-dark-card text-text-secondary hover:bg-dark-elevated'
                            }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Variable Name */}
            <div className="mb-4">
                <label className="block text-xs text-text-muted mb-2">Variable Name</label>
                <input
                    type="text"
                    value={variableName}
                    onChange={e => setVariableName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    className="w-full px-3 py-2 bg-dark-card border border-border-default rounded text-white text-sm focus:border-purple-500 focus:outline-none"
                    placeholder="variableName"
                />
            </div>

            {/* Position Selector (for data/text) */}
            {(resultType === 'data' || resultType === 'text') && (
                <div className="mb-4">
                    <label className="block text-xs text-text-muted mb-2">Row Selection</label>
                    <div className="flex gap-2">
                        {(['all', 'first', 'last'] as const).map(pos => (
                            <button
                                key={pos}
                                onClick={() => setPosition(pos)}
                                className={`px-3 py-1.5 text-xs rounded transition-colors ${
                                    position === pos
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-dark-card text-text-secondary hover:bg-dark-elevated'
                                }`}
                            >
                                {pos === 'all' ? 'All rows' : `${pos.charAt(0).toUpperCase() + pos.slice(1)} row`}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Column Selection (for list/text) */}
            {(resultType === 'list' || resultType === 'text') && (
                <div className="mb-4">
                    <label className="block text-xs text-text-muted mb-2">Select Column</label>
                    <select
                        value={selectedColumn}
                        onChange={e => setSelectedColumn(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-card border border-border-default rounded text-white text-sm focus:border-purple-500 focus:outline-none"
                    >
                        <option value="">All columns</option>
                        {columns.map(col => (
                            <option key={col.name} value={col.name}>
                                {col.name} ({col.type})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Aggregation Selection (for number) */}
            {resultType === 'number' && (
                <div className="mb-4 space-y-3">
                    <div>
                        <label className="block text-xs text-text-muted mb-2">Aggregation Function</label>
                        <select
                            value={aggregation}
                            onChange={e => setAggregation(e.target.value)}
                            className="w-full px-3 py-2 bg-dark-card border border-border-default rounded text-white text-sm focus:border-purple-500 focus:outline-none"
                        >
                            <option value="">Select function...</option>
                            {AGGREGATION_FUNCTIONS.map(fn => (
                                <option key={fn.value} value={fn.value}>
                                    {fn.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {aggregation && aggregation !== 'count' && (
                        <div>
                            <label className="block text-xs text-text-muted mb-2">Column</label>
                            <select
                                value={aggregationColumn}
                                onChange={e => setAggregationColumn(e.target.value)}
                                className="w-full px-3 py-2 bg-dark-card border border-border-default rounded text-white text-sm focus:border-purple-500 focus:outline-none"
                            >
                                <option value="">Select column...</option>
                                {columns.filter(c => c.type === 'number' || aggregation === 'distinct').map(col => (
                                    <option key={col.name} value={col.name}>
                                        {col.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* Filters */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-text-muted flex items-center gap-1">
                        <Filter size={12} />
                        Filters
                    </label>
                    <button
                        onClick={addFilter}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-dark-card hover:bg-dark-elevated text-text-secondary rounded transition-colors"
                    >
                        <Plus size={12} />
                        Add Filter
                    </button>
                </div>

                {filters.length === 0 ? (
                    <p className="text-xs text-text-muted italic">No filters applied</p>
                ) : (
                    <div className="space-y-2">
                        {filters.map((filter, index) => (
                            <div key={filter.id} className="flex items-center gap-2 bg-dark-card p-2 rounded">
                                {/* Logical operator */}
                                {index > 0 && (
                                    <select
                                        value={filter.logicalOperator}
                                        onChange={e => updateFilter(filter.id, 'logicalOperator', e.target.value)}
                                        className="w-16 px-2 py-1 bg-dark-elevated border border-border-default rounded text-xs text-white"
                                    >
                                        <option value="and">AND</option>
                                        <option value="or">OR</option>
                                    </select>
                                )}

                                {/* Column */}
                                <select
                                    value={filter.column}
                                    onChange={e => updateFilter(filter.id, 'column', e.target.value)}
                                    className="flex-1 px-2 py-1 bg-dark-elevated border border-border-default rounded text-xs text-white"
                                >
                                    {columns.map(col => (
                                        <option key={col.name} value={col.name}>
                                            {col.name}
                                        </option>
                                    ))}
                                </select>

                                {/* Operator */}
                                <select
                                    value={filter.operator}
                                    onChange={e => updateFilter(filter.id, 'operator', e.target.value)}
                                    className="w-32 px-2 py-1 bg-dark-elevated border border-border-default rounded text-xs text-white"
                                >
                                    {getOperatorsForColumn(filter.column).map(op => (
                                        <option key={op.value} value={op.value}>
                                            {op.label}
                                        </option>
                                    ))}
                                </select>

                                {/* Value (hidden for is empty/is not empty) */}
                                {!['is empty', 'is not empty'].includes(filter.operator) && (
                                    <input
                                        type="text"
                                        value={filter.value}
                                        onChange={e => updateFilter(filter.id, 'value', e.target.value)}
                                        placeholder="Value"
                                        className="flex-1 px-2 py-1 bg-dark-elevated border border-border-default rounded text-xs text-white"
                                    />
                                )}

                                {/* Remove button */}
                                <button
                                    onClick={() => removeFilter(filter.id)}
                                    className="p-1 text-text-muted hover:text-red-400 transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Advanced Options Toggle */}
            <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-white mb-3 transition-colors"
            >
                <ChevronDown
                    size={14}
                    className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                />
                Advanced Options
            </button>

            {/* Advanced Options */}
            {showAdvanced && (
                <div className="space-y-3 mb-4 pl-4 border-l-2 border-border-default">
                    {/* Sorting */}
                    <div>
                        <label className="block text-xs text-text-muted mb-2 flex items-center gap-1">
                            <ArrowUpDown size={12} />
                            Sort By
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={sorting?.column || ''}
                                onChange={e => setSorting(e.target.value ? { column: e.target.value, direction: sorting?.direction || 'asc' } : null)}
                                className="flex-1 px-2 py-1 bg-dark-card border border-border-default rounded text-xs text-white"
                            >
                                <option value="">No sorting</option>
                                {columns.map(col => (
                                    <option key={col.name} value={col.name}>
                                        {col.name}
                                    </option>
                                ))}
                            </select>
                            {sorting && (
                                <select
                                    value={sorting.direction}
                                    onChange={e => setSorting({ ...sorting, direction: e.target.value as 'asc' | 'desc' })}
                                    className="w-24 px-2 py-1 bg-dark-card border border-border-default rounded text-xs text-white"
                                >
                                    <option value="asc">Ascending</option>
                                    <option value="desc">Descending</option>
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Limit & Offset */}
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-xs text-text-muted mb-2">Limit</label>
                            <input
                                type="number"
                                value={limitValue}
                                onChange={e => setLimitValue(e.target.value)}
                                placeholder="No limit"
                                min="1"
                                className="w-full px-2 py-1 bg-dark-card border border-border-default rounded text-xs text-white"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-text-muted mb-2">Offset</label>
                            <input
                                type="number"
                                value={offsetValue}
                                onChange={e => setOffsetValue(e.target.value)}
                                placeholder="0"
                                min="0"
                                className="w-full px-2 py-1 bg-dark-card border border-border-default rounded text-xs text-white"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Generated Code Preview */}
            <div className="mt-4">
                <label className="block text-xs text-text-muted mb-2">Generated VDQL Code</label>
                <pre className="bg-dark-canvas border border-border-default rounded p-3 text-sm font-mono overflow-x-auto">
                    <code className="text-teal-400">{generatedQuery}</code>
                </pre>
            </div>
        </div>
    );
}

export default VDQLQueryBuilder;
