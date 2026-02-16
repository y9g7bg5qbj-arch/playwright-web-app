/**
 * CSV Import Modal
 *
 * Import CSV files into data tables with:
 * - Drag and drop file upload
 * - Preview of parsed data
 * - Automatic type inference
 * - Column mapping
 * - Error handling
 */

import { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, AlertCircle, Check } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import type { DataColumn } from './AGGridDataTable';

interface ImportCSVModalProps {
    isOpen: boolean;
    onClose: () => void;
    existingColumns: DataColumn[];
    onImport: (rows: Record<string, any>[], newColumns?: DataColumn[]) => Promise<void>;
}

interface ParsedData {
    headers: string[];
    rows: Record<string, any>[];
    inferredTypes: Record<string, DataColumn['type']>;
    errors: string[];
}

// Infer column type from sample values
function inferColumnType(values: any[]): DataColumn['type'] {
    const nonEmptyValues = values.filter((v) => v !== null && v !== undefined && v !== '');

    if (nonEmptyValues.length === 0) return 'text';

    // Check for boolean
    const booleanValues = ['true', 'false', 'yes', 'no', '1', '0'];
    if (nonEmptyValues.every((v) => booleanValues.includes(String(v).toLowerCase()))) {
        return 'boolean';
    }

    // Check for number
    if (nonEmptyValues.every((v) => !isNaN(Number(v)) && v !== '')) {
        return 'number';
    }

    // Check for date (ISO format or common date formats)
    const dateRegex = /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}|^\d{2}-\d{2}-\d{4}/;
    if (nonEmptyValues.every((v) => dateRegex.test(String(v)) || !isNaN(Date.parse(String(v))))) {
        const allValidDates = nonEmptyValues.every((v) => {
            const date = new Date(v);
            return !isNaN(date.getTime());
        });
        if (allValidDates) return 'date';
    }

    return 'text';
}

// Convert value based on type
function convertValue(value: any, type: DataColumn['type']): any {
    if (value === null || value === undefined || value === '') {
        return type === 'boolean' ? false : type === 'number' ? null : '';
    }

    switch (type) {
        case 'number':
            return Number(value);
        case 'boolean':
            const strValue = String(value).toLowerCase();
            return strValue === 'true' || strValue === 'yes' || strValue === '1';
        case 'date':
            return new Date(value).toISOString().split('T')[0];
        default:
            return String(value);
    }
}

export function ImportCSVModal({
    isOpen,
    onClose,
    existingColumns,
    onImport,
}: ImportCSVModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
    const [columnTypes, setColumnTypes] = useState<Record<string, DataColumn['type']>>({});
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFile = useCallback((file: File) => {
        setError(null);

        if (!file.name.endsWith('.csv')) {
            setError('Please upload a CSV file');
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    setError(`Parse errors: ${results.errors.map((e) => e.message).join(', ')}`);
                }

                const headers = results.meta.fields || [];
                const rows = results.data as Record<string, any>[];

                // Infer types for each column
                const inferredTypes: Record<string, DataColumn['type']> = {};
                headers.forEach((header) => {
                    const columnValues = rows.slice(0, 100).map((row) => row[header]);
                    inferredTypes[header] = inferColumnType(columnValues);
                });

                // Initialize column mapping
                const mapping: Record<string, string> = {};
                headers.forEach((header) => {
                    // Try to match with existing columns
                    const existingCol = existingColumns.find(
                        (col) => col.name.toLowerCase() === header.toLowerCase()
                    );
                    mapping[header] = existingCol ? existingCol.name : header;
                });

                setParsedData({
                    headers,
                    rows,
                    inferredTypes,
                    errors: results.errors.map((e) => e.message),
                });
                setColumnMapping(mapping);
                setColumnTypes(inferredTypes);
            },
            error: (err) => {
                setError(`Failed to parse CSV: ${err.message}`);
            },
        });
    }, [existingColumns]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleImport = async () => {
        if (!parsedData) return;

        setImporting(true);
        setError(null);

        try {
            // Build new columns list
            const newColumns: DataColumn[] = [];
            const existingColNames = new Set(existingColumns.map((c) => c.name));

            Object.entries(columnMapping).forEach(([csvHeader, targetName]) => {
                if (!existingColNames.has(targetName)) {
                    newColumns.push({
                        name: targetName,
                        type: columnTypes[csvHeader] || 'text',
                    });
                }
            });

            // Transform rows
            const transformedRows = parsedData.rows.map((row) => {
                const newRow: Record<string, any> = {};
                Object.entries(columnMapping).forEach(([csvHeader, targetName]) => {
                    const type = columnTypes[csvHeader] || 'text';
                    newRow[targetName] = convertValue(row[csvHeader], type);
                });
                return newRow;
            });

            await onImport(transformedRows, newColumns.length > 0 ? newColumns : undefined);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        setParsedData(null);
        setColumnMapping({});
        setColumnTypes({});
        setError(null);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Import CSV"
            size="full"
            bodyClassName="max-h-[75vh]"
            footer={
                <>
                    <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                    <Button
                        variant="success"
                        onClick={handleImport}
                        disabled={!parsedData || importing}
                        leftIcon={importing ? <span className="animate-spin">⏳</span> : <Check className="w-4 h-4" />}
                    >
                        {importing ? 'Importing...' : `Import ${parsedData?.rows.length || 0} rows`}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                {error && (
                    <div className="mb-4 p-3 bg-status-danger/10 border border-status-danger/30 rounded-md flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-status-danger flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-status-danger">{error}</p>
                    </div>
                )}

                {!parsedData ? (
                    /* File Upload */
                    <div
                        onDrop={handleDrop}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                            dragOver
                                ? 'border-status-success bg-status-success/10'
                                : 'border-border-default hover:border-border-default'
                        }`}
                    >
                        <Upload className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                        <p className="text-text-primary mb-2">
                            Drag and drop a CSV file here, or{' '}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="text-status-success hover:text-status-success"
                            >
                                browse
                            </button>
                        </p>
                        <p className="text-xs text-text-secondary">
                            First row will be used as column headers
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>
                ) : (
                    /* Preview & Mapping */
                    <div className="space-y-6">
                        {/* Summary */}
                        <div className="flex items-center gap-4 p-3 bg-dark-elevated/50 rounded-md">
                            <FileText className="w-5 h-5 text-status-success" />
                            <div>
                                <p className="text-sm text-text-primary">
                                    {parsedData.rows.length} rows, {parsedData.headers.length} columns
                                </p>
                                {parsedData.errors.length > 0 && (
                                    <p className="text-xs text-status-warning">
                                        {parsedData.errors.length} parsing warnings
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setParsedData(null)}
                                className="ml-auto text-xs text-text-secondary hover:text-text-primary"
                            >
                                Choose different file
                            </button>
                        </div>

                        {/* Column Mapping */}
                        <div>
                            <h3 className="text-sm font-medium text-text-primary mb-3">Column Mapping</h3>
                            <div className="border border-border-default rounded-md overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-dark-elevated/50">
                                            <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">
                                                CSV Column
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">
                                                Target Column
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">
                                                Type
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">
                                                Sample Values
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-default">
                                        {parsedData.headers.map((header) => (
                                            <tr key={header} className="hover:bg-dark-elevated/30">
                                                <td className="px-3 py-2 text-text-primary">{header}</td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={columnMapping[header] || ''}
                                                        onChange={(e) =>
                                                            setColumnMapping({
                                                                ...columnMapping,
                                                                [header]: e.target.value,
                                                            })
                                                        }
                                                        className="w-full bg-dark-elevated border border-border-default rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-status-success"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <select
                                                        value={columnTypes[header] || 'text'}
                                                        onChange={(e) =>
                                                            setColumnTypes({
                                                                ...columnTypes,
                                                                [header]: e.target.value as DataColumn['type'],
                                                            })
                                                        }
                                                        className="bg-dark-elevated border border-border-default rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-status-success"
                                                    >
                                                        <option value="text">Text</option>
                                                        <option value="number">Number</option>
                                                        <option value="boolean">Boolean</option>
                                                        <option value="date">Date</option>
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2 text-xs text-text-secondary max-w-xs truncate">
                                                    {parsedData.rows
                                                        .slice(0, 3)
                                                        .map((r) => r[header])
                                                        .filter(Boolean)
                                                        .join(', ')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Data Preview */}
                        <div>
                            <h3 className="text-sm font-medium text-text-primary mb-3">
                                Data Preview (first 5 rows)
                            </h3>
                            <div className="border border-border-default rounded-md overflow-auto max-h-48">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-dark-elevated/50 sticky top-0">
                                            <th className="px-2 py-1.5 text-left font-medium text-text-secondary">
                                                #
                                            </th>
                                            {parsedData.headers.map((header) => (
                                                <th
                                                    key={header}
                                                    className="px-2 py-1.5 text-left font-medium text-text-secondary"
                                                >
                                                    {columnMapping[header] || header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-default/50">
                                        {parsedData.rows.slice(0, 5).map((row, idx) => (
                                            <tr key={idx} className="hover:bg-dark-elevated/20">
                                                <td className="px-2 py-1.5 text-text-secondary">{idx + 1}</td>
                                                {parsedData.headers.map((header) => (
                                                    <td
                                                        key={header}
                                                        className="px-2 py-1.5 text-text-primary max-w-32 truncate"
                                                    >
                                                        {String(row[header] ?? '')}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default ImportCSVModal;
