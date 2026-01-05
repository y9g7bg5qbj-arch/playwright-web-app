import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Save, X, GripVertical, Type, Hash, Calendar, ToggleLeft } from 'lucide-react';
import { apiUrl } from '@/config';

interface DataColumn {
    name: string;
    type: 'text' | 'number' | 'date' | 'boolean';
    required?: boolean;
}

interface DataRow {
    id: string;
    data: Record<string, any>;
    order: number;
}

interface DataTableEditorProps {
    tableId: string;
    onClose?: () => void;
}

const TYPE_ICONS = {
    text: Type,
    number: Hash,
    date: Calendar,
    boolean: ToggleLeft,
};

export function DataTableEditor({ tableId, onClose }: DataTableEditorProps) {
    const [tableName, setTableName] = useState('');
    const [columns, setColumns] = useState<DataColumn[]>([]);
    const [rows, setRows] = useState<DataRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingColumn, setEditingColumn] = useState<number | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

    const fetchTable = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(apiUrl(`/api/data-tables/${tableId}`));
            const data = await res.json();
            if (data.success) {
                setTableName(data.table.name);
                setColumns(data.table.columns);
                setRows(data.table.rows);
            }
        } catch (err) {
            console.error('Failed to fetch table:', err);
        } finally {
            setLoading(false);
        }
    }, [tableId]);

    useEffect(() => {
        fetchTable();
    }, [fetchTable]);

    const saveColumns = async (newColumns: DataColumn[]) => {
        try {
            await fetch(apiUrl(`/api/data-tables/${tableId}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ columns: newColumns })
            });
        } catch (err) {
            console.error('Failed to save columns:', err);
        }
    };

    const handleAddColumn = () => {
        const newName = `column${columns.length + 1}`;
        const newColumns = [...columns, { name: newName, type: 'text' as const }];
        setColumns(newColumns);
        saveColumns(newColumns);
        setHasChanges(true);
    };

    const handleRemoveColumn = (index: number) => {
        const newColumns = columns.filter((_, i) => i !== index);
        setColumns(newColumns);
        saveColumns(newColumns);
        setHasChanges(true);
    };

    const handleColumnNameChange = (index: number, newName: string) => {
        const oldName = columns[index].name;
        const newColumns = columns.map((col, i) =>
            i === index ? { ...col, name: newName } : col
        );
        setColumns(newColumns);

        // Update all rows to use new column name
        setRows(rows.map(row => {
            const newData = { ...row.data };
            if (oldName in newData) {
                newData[newName] = newData[oldName];
                delete newData[oldName];
            }
            return { ...row, data: newData };
        }));

        saveColumns(newColumns);
        setHasChanges(true);
    };

    const handleColumnTypeChange = (index: number, newType: DataColumn['type']) => {
        const newColumns = columns.map((col, i) =>
            i === index ? { ...col, type: newType } : col
        );
        setColumns(newColumns);
        saveColumns(newColumns);
    };

    const handleAddRow = async () => {
        const emptyData: Record<string, any> = {};
        columns.forEach(col => {
            emptyData[col.name] = col.type === 'boolean' ? false : '';
        });

        try {
            const res = await fetch(apiUrl(`/api/data-tables/${tableId}/rows`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: emptyData })
            });
            const data = await res.json();
            if (data.success) {
                setRows([...rows, data.row]);
            }
        } catch (err) {
            console.error('Failed to add row:', err);
        }
    };

    const handleRemoveRow = async (rowId: string) => {
        try {
            await fetch(apiUrl(`/api/data-tables/${tableId}/rows/${rowId}`), {
                method: 'DELETE'
            });
            setRows(rows.filter(r => r.id !== rowId));
        } catch (err) {
            console.error('Failed to delete row:', err);
        }
    };

    const handleCellChange = (rowId: string, columnName: string, value: any) => {
        setRows(rows.map(row =>
            row.id === rowId
                ? { ...row, data: { ...row.data, [columnName]: value } }
                : row
        ));
        setHasChanges(true);
    };

    const saveRow = async (rowId: string) => {
        const row = rows.find(r => r.id === rowId);
        if (!row) return;

        try {
            await fetch(apiUrl(`/api/data-tables/${tableId}/rows/${rowId}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: row.data })
            });
        } catch (err) {
            console.error('Failed to save row:', err);
        }
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            await Promise.all(rows.map(row => saveRow(row.id)));
            setHasChanges(false);
        } catch (err) {
            console.error('Failed to save:', err);
        } finally {
            setSaving(false);
        }
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const text = e.clipboardData.getData('text');
        const lines = text.split('\n').filter(l => l.trim());

        if (lines.length === 0) return;

        // Parse as tab-separated or comma-separated
        const delimiter = lines[0].includes('\t') ? '\t' : ',';
        const newRows = lines.map(line => {
            const values = line.split(delimiter);
            const data: Record<string, any> = {};
            columns.forEach((col, i) => {
                data[col.name] = values[i]?.trim() ?? '';
            });
            return data;
        });

        try {
            const res = await fetch(apiUrl(`/api/data-tables/${tableId}/rows/bulk`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows: newRows })
            });
            const data = await res.json();
            if (data.success) {
                fetchTable(); // Refresh to get new rows with IDs
            }
        } catch (err) {
            console.error('Failed to bulk insert:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-500">
                Loading table...
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-slate-200">{tableName}</h2>
                    <span className="text-xs text-slate-500">{rows.length} rows</span>
                </div>
                <div className="flex items-center gap-2">
                    {hasChanges && (
                        <button
                            onClick={handleSaveAll}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-md text-xs text-white transition-colors disabled:opacity-50"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    )}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-slate-800 rounded-md transition-colors"
                        >
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    )}
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800 bg-slate-950/50">
                <button
                    onClick={handleAddColumn}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 transition-colors"
                >
                    <Plus className="w-3 h-3" />
                    Add Column
                </button>
                <button
                    onClick={handleAddRow}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 transition-colors"
                >
                    <Plus className="w-3 h-3" />
                    Add Row
                </button>
                <span className="text-xs text-slate-600 ml-auto">
                    Tip: Paste from Excel/CSV to bulk import
                </span>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto" onPaste={handlePaste}>
                <table className="w-full border-collapse min-w-max">
                    <thead className="sticky top-0 bg-slate-950 z-10">
                        <tr>
                            <th className="w-8 px-2 py-2 text-left text-xs font-medium text-slate-500 border-b border-slate-800">
                                #
                            </th>
                            {columns.map((col, colIndex) => {
                                const TypeIcon = TYPE_ICONS[col.type];
                                return (
                                    <th
                                        key={colIndex}
                                        className="px-2 py-2 text-left text-xs font-medium text-slate-400 border-b border-slate-800 min-w-[120px] group"
                                    >
                                        <div className="flex items-center gap-1">
                                            <TypeIcon className="w-3 h-3 text-slate-600" />
                                            {editingColumn === colIndex ? (
                                                <input
                                                    type="text"
                                                    value={col.name}
                                                    onChange={(e) => handleColumnNameChange(colIndex, e.target.value)}
                                                    onBlur={() => setEditingColumn(null)}
                                                    onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                                    autoFocus
                                                    className="flex-1 bg-slate-800 border border-blue-500 rounded px-1 py-0.5 text-xs text-slate-200"
                                                />
                                            ) : (
                                                <span
                                                    className="flex-1 cursor-pointer hover:text-slate-200"
                                                    onDoubleClick={() => setEditingColumn(colIndex)}
                                                >
                                                    {col.name}
                                                </span>
                                            )}
                                            <select
                                                value={col.type}
                                                onChange={(e) => handleColumnTypeChange(colIndex, e.target.value as DataColumn['type'])}
                                                className="opacity-0 group-hover:opacity-100 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-400 px-1"
                                            >
                                                <option value="text">Text</option>
                                                <option value="number">Number</option>
                                                <option value="date">Date</option>
                                                <option value="boolean">Boolean</option>
                                            </select>
                                            <button
                                                onClick={() => handleRemoveColumn(colIndex)}
                                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/20 rounded"
                                            >
                                                <Trash2 className="w-3 h-3 text-red-400" />
                                            </button>
                                        </div>
                                    </th>
                                );
                            })}
                            <th className="w-10 border-b border-slate-800"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 2} className="px-4 py-8 text-center text-slate-500 text-sm">
                                    No data yet. Click "Add Row" or paste from Excel.
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => (
                                <tr key={row.id} className="group hover:bg-slate-800/30">
                                    <td className="px-2 py-1.5 text-xs text-slate-600 border-b border-slate-800/50">
                                        <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-50 cursor-grab" />
                                    </td>
                                    {columns.map((col) => (
                                        <td key={col.name} className="px-1 py-1 border-b border-slate-800/50">
                                            {col.type === 'boolean' ? (
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(row.data[col.name])}
                                                    onChange={(e) => handleCellChange(row.id, col.name, e.target.checked)}
                                                    onBlur={() => saveRow(row.id)}
                                                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                                                />
                                            ) : (
                                                <input
                                                    type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                                                    value={row.data[col.name] ?? ''}
                                                    onChange={(e) => handleCellChange(row.id, col.name, e.target.value)}
                                                    onBlur={() => saveRow(row.id)}
                                                    ref={(el) => {
                                                        if (el) inputRefs.current.set(`${row.id}-${col.name}`, el);
                                                    }}
                                                    className="w-full bg-transparent border border-transparent hover:border-slate-700 focus:border-blue-500 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
                                                />
                                            )}
                                        </td>
                                    ))}
                                    <td className="px-1 py-1 border-b border-slate-800/50">
                                        <button
                                            onClick={() => handleRemoveRow(row.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded"
                                        >
                                            <Trash2 className="w-3 h-3 text-red-400" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/50">
                <p className="text-xs text-slate-600">
                    Reference in Vero: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400">use data from "{tableName}"</code>
                </p>
            </div>
        </div>
    );
}
