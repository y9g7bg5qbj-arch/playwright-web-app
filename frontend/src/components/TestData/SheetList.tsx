/**
 * Data Table List Component
 *
 * Displays list of test data tables (entities) in the sidebar.
 * Tables are project-level and can be referenced as:
 *   - Simple: load $users from "Users"
 *   - Qualified: load $users from "ProjectName.Users"
 */

import { Database, MoreVertical, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { DataSheet } from './TestDataPage';

interface SheetListProps {
    sheets: DataSheet[];
    loading: boolean;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onEdit: (sheet: DataSheet) => void;
    onDelete: (id: string) => void;
    onRefresh: () => void;
}

export function SheetList({
    sheets,
    loading,
    selectedId,
    onSelect,
    onEdit,
    onDelete,
    onRefresh
}: SheetListProps) {
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sheet: DataSheet } | null>(null);

    const handleContextMenu = (e: React.MouseEvent, sheet: DataSheet) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, sheet });
    };

    return (
        <div className="flex-1 overflow-y-auto">
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-5 h-5 text-slate-500 animate-spin" />
                </div>
            ) : sheets.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500 text-sm">
                    <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No data tables yet</p>
                    <p className="text-xs mt-1">Create a table or import from CSV/Excel</p>
                </div>
            ) : (
                <div className="py-2">
                    {sheets.map(sheet => (
                        <div
                            key={sheet.id}
                            onClick={() => onSelect(sheet.id)}
                            onContextMenu={(e) => handleContextMenu(e, sheet)}
                            className={`
                                flex items-center gap-2 px-4 py-2 cursor-pointer group
                                ${selectedId === sheet.id
                                    ? 'bg-emerald-500/10 border-l-2 border-emerald-500'
                                    : 'hover:bg-slate-800/50 border-l-2 border-transparent'
                                }
                            `}
                        >
                            <Database className={`w-4 h-4 ${
                                selectedId === sheet.id ? 'text-emerald-400' : 'text-slate-500'
                            }`} />

                            <div className="flex-1 min-w-0">
                                <div className={`text-sm truncate ${
                                    selectedId === sheet.id ? 'text-emerald-300' : 'text-slate-300'
                                }`}>
                                    {sheet.name}
                                </div>
                                <div className="text-xs text-slate-500">
                                    {sheet.rowCount} {sheet.rowCount === 1 ? 'row' : 'rows'}
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleContextMenu(e, sheet);
                                }}
                                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-700 rounded"
                            >
                                <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Refresh button at bottom */}
            <div className="px-4 py-2 border-t border-slate-800">
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setContextMenu(null)}
                    />
                    <div
                        className="fixed z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[150px]"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        <button
                            onClick={() => {
                                onEdit(contextMenu.sheet);
                                setContextMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/50"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit Table
                        </button>
                        <hr className="my-1 border-slate-700" />
                        <button
                            onClick={() => {
                                onDelete(contextMenu.sheet.id);
                                setContextMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-slate-700/50"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Table
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
