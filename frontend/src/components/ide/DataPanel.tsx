import { useState, useEffect, useCallback } from 'react';
import { Plus, Database, ChevronRight, Table2, Trash2, Edit3, Download } from 'lucide-react';
import { apiUrl } from '@/config';

interface DataColumn {
    name: string;
    type: 'text' | 'number' | 'date' | 'boolean';
    required?: boolean;
}

interface DataTable {
    id: string;
    workflowId: string;
    name: string;
    description?: string;
    columns: DataColumn[];
    rowCount: number;
    createdAt: string;
    updatedAt: string;
}

interface DataPanelProps {
    workflowId?: string;
    selectedTableId?: string;
    onTableSelect: (tableId: string) => void;
    onTableEdit?: (table: DataTable) => void;
}

export function DataPanel({ workflowId, selectedTableId, onTableSelect, onTableEdit }: DataPanelProps) {
    const [tables, setTables] = useState<DataTable[]>([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; table: DataTable } | null>(null);

    const fetchTables = useCallback(async () => {
        if (!workflowId) return;

        setLoading(true);
        try {
            const res = await fetch(apiUrl(`/api/data-tables/workflow/${workflowId}`));
            const data = await res.json();
            if (data.success) {
                setTables(data.tables);
            }
        } catch (err) {
            console.error('Failed to fetch data tables:', err);
        } finally {
            setLoading(false);
        }
    }, [workflowId]);

    useEffect(() => {
        fetchTables();
    }, [fetchTables]);

    const handleCreateTable = async () => {
        const name = prompt('Enter table name:');
        if (!name || !workflowId) return;

        try {
            const res = await fetch(apiUrl('/api/data-tables'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workflowId,
                    name: name.trim(),
                    columns: [
                        { name: 'column1', type: 'text' },
                        { name: 'column2', type: 'text' }
                    ]
                })
            });
            const data = await res.json();
            if (data.success) {
                fetchTables();
                onTableSelect(data.table.id);
            } else {
                alert(data.error || 'Failed to create table');
            }
        } catch (err) {
            console.error('Failed to create table:', err);
            alert('Failed to create table');
        }
    };

    const handleDeleteTable = async (tableId: string, tableName: string) => {
        if (!confirm(`Delete table "${tableName}"? This cannot be undone.`)) return;

        try {
            const res = await fetch(apiUrl(`/api/data-tables/${tableId}`), {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                fetchTables();
                if (selectedTableId === tableId) {
                    onTableSelect('');
                }
            }
        } catch (err) {
            console.error('Failed to delete table:', err);
        }
        setContextMenu(null);
    };

    const handleExportCSV = async (table: DataTable) => {
        try {
            const res = await fetch(apiUrl(`/api/data-tables/${table.id}`));
            const data = await res.json();
            if (!data.success) return;

            const { columns, rows } = data.table;

            const headers = columns.map((c: DataColumn) => c.name).join(',');
            const csvRows = rows.map((row: any) =>
                columns.map((c: DataColumn) => {
                    const val = row.data[c.name] ?? '';
                    const escaped = String(val).replace(/"/g, '""');
                    return escaped.includes(',') ? `"${escaped}"` : escaped;
                }).join(',')
            );
            const csv = [headers, ...csvRows].join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${table.name}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to export CSV:', err);
        }
        setContextMenu(null);
    };

    return (
        <div className="border-t border-slate-800/60 bg-slate-950/50">
            {/* Header */}
            <div
                className="flex items-center gap-1.5 px-3 py-2.5 hover:bg-slate-800/30 cursor-pointer transition-colors duration-150"
                onClick={() => setExpanded(!expanded)}
            >
                <div className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="w-5 h-5 rounded-md bg-emerald-500/15 flex items-center justify-center">
                    <Database className="w-3 h-3 text-emerald-400" />
                </div>
                <span className="flex-1 text-xs text-slate-400 font-semibold uppercase tracking-wider">Data</span>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleCreateTable();
                    }}
                    className="p-1 hover:bg-slate-700/60 rounded transition-colors group"
                    title="New Data Table"
                >
                    <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                </button>
            </div>

            {/* Table List */}
            {expanded && (
                <div className="px-2 pb-3">
                    {loading ? (
                        <div className="text-xs text-slate-600 px-3 py-2">Loading...</div>
                    ) : tables.length === 0 ? (
                        <div className="text-center py-4">
                            <div className="w-8 h-8 rounded-full bg-slate-900/50 flex items-center justify-center mx-auto mb-2">
                                <Table2 className="w-4 h-4 text-slate-600" />
                            </div>
                            <p className="text-xs text-slate-600">No data tables</p>
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {tables.map((table) => (
                                <div
                                    key={table.id}
                                    onClick={() => onTableSelect(table.id)}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        setContextMenu({ x: e.clientX, y: e.clientY, table });
                                    }}
                                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150 group ${
                                        selectedTableId === table.id
                                            ? 'bg-emerald-500/15 text-emerald-400'
                                            : 'hover:bg-slate-800/40 text-slate-400 hover:text-slate-300'
                                    }`}
                                >
                                    <Table2 className={`w-4 h-4 ${selectedTableId === table.id ? 'text-emerald-400' : ''}`} />
                                    <span className="flex-1 text-sm truncate">{table.name}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                        selectedTableId === table.id
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'bg-slate-800 text-slate-500'
                                    }`}>
                                        {table.rowCount}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
                    <div
                        className="fixed z-50 bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl shadow-black/40 py-1.5 min-w-[180px] overflow-hidden"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        <button
                            onClick={() => {
                                onTableEdit?.(contextMenu.table);
                                setContextMenu(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60 transition-colors"
                        >
                            <Edit3 className="w-4 h-4" />
                            Edit Table
                        </button>
                        <button
                            onClick={() => handleExportCSV(contextMenu.table)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                        <hr className="my-1.5 border-slate-800/60" />
                        <button
                            onClick={() => handleDeleteTable(contextMenu.table.id, contextMenu.table.name)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Table
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
