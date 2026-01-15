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
                    <RefreshCw className="w-5 h-5 text-[#8b949e] animate-spin" />
                </div>
            ) : sheets.length === 0 ? (
                <div className="px-4 py-8 text-center text-[#8b949e] text-sm">
                    <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No data tables yet</p>
                    <p className="text-xs mt-1 text-[#6e7681]">Create a table or import from CSV/Excel</p>
                </div>
            ) : (
                <div className="py-2">
                    {sheets.map(sheet => (
                        <div
                            key={sheet.id}
                            onClick={() => onSelect(sheet.id)}
                            onContextMenu={(e) => handleContextMenu(e, sheet)}
                            className={`
                                flex items-center gap-2 px-4 py-2.5 cursor-pointer group transition-colors
                                ${selectedId === sheet.id
                                    ? 'bg-[#21262d] border-l-2 border-[#58a6ff]'
                                    : 'hover:bg-[#21262d]/50 border-l-2 border-transparent'
                                }
                            `}
                        >
                            <span className={`material-symbols-outlined text-[18px] ${
                                selectedId === sheet.id ? 'text-[#58a6ff]' : 'text-[#8b949e]'
                            }`}>table_chart</span>

                            <div className="flex-1 min-w-0">
                                <div className={`text-sm truncate ${
                                    selectedId === sheet.id ? 'text-white font-medium' : 'text-[#c9d1d9]'
                                }`}>
                                    {sheet.name}
                                </div>
                                <div className="text-xs text-[#8b949e]">
                                    {sheet.rowCount} {sheet.rowCount === 1 ? 'row' : 'rows'}
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleContextMenu(e, sheet);
                                }}
                                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-[#30363d] rounded transition-colors"
                            >
                                <MoreVertical className="w-3.5 h-3.5 text-[#8b949e]" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Refresh button at bottom */}
            <div className="px-4 py-2 border-t border-[#30363d]">
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded-md transition-colors"
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
                        className="fixed z-50 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl py-1 min-w-[150px]"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        <button
                            onClick={() => {
                                onEdit(contextMenu.sheet);
                                setContextMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d]"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit Table
                        </button>
                        <hr className="my-1 border-[#30363d]" />
                        <button
                            onClick={() => {
                                onDelete(contextMenu.sheet.id);
                                setContextMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#f85149] hover:bg-[#21262d]"
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
