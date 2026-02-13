/**
 * Data Table List Component
 *
 * Displays list of test data tables (entities) in the sidebar.
 * Tables are project-level and can be referenced as:
 *   - Simple: load $users from "Users"
 *   - Qualified: load $users from "ProjectName.Users"
 */

import { Database, MoreVertical, Edit2, Trash2, RefreshCw, Table2 } from 'lucide-react';
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
        <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-2 py-2">
                {loading ? (
                    <div className="flex items-center justify-center py-8 text-text-muted">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                    </div>
                ) : sheets.length === 0 ? (
                    <div className="rounded-lg border border-border-default bg-dark-card/70 px-4 py-8 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-border-default bg-dark-elevated/70">
                            <Database className="h-5 w-5 text-text-muted" />
                        </div>
                        <p className="text-sm font-medium text-text-secondary">No data tables yet</p>
                        <p className="mt-1 text-xs text-text-muted">Create a table or import from CSV/Excel.</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {sheets.map((sheet) => {
                            const isSelected = selectedId === sheet.id;
                            return (
                                <div
                                    key={sheet.id}
                                    onClick={() => onSelect(sheet.id)}
                                    onContextMenu={(e) => handleContextMenu(e, sheet)}
                                    className={`group flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 transition-all duration-fast ${
                                        isSelected
                                            ? 'border-brand-primary/45 bg-brand-primary/15 shadow-[0_0_0_1px_rgba(53,116,240,0.18)_inset]'
                                            : 'border-transparent hover:border-border-default hover:bg-dark-elevated/65'
                                    }`}
                                >
                                    <div className={`rounded-md p-1 ${isSelected ? 'bg-brand-primary/15' : 'bg-dark-elevated/80'}`}>
                                        <Table2 className={`h-3.5 w-3.5 ${isSelected ? 'text-brand-secondary' : 'text-text-muted'}`} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className={`truncate text-xs ${isSelected ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                                            {sheet.name}
                                        </div>
                                        <div className="text-xxs text-text-muted">
                                            {sheet.rowCount} {sheet.rowCount === 1 ? 'row' : 'rows'}
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleContextMenu(e, sheet);
                                        }}
                                        className="rounded p-1 text-text-muted opacity-0 transition-all duration-fast group-hover:opacity-100 hover:bg-white/[0.06] hover:text-text-primary"
                                        aria-label={`More actions for ${sheet.name}`}
                                    >
                                        <MoreVertical className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="border-t border-border-default p-2">
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border-default bg-dark-elevated/70 px-2.5 py-1.5 text-xxs text-text-secondary transition-all duration-fast hover:border-border-emphasis hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh tables
                </button>
            </div>

            {contextMenu && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
                    <div
                        className="fixed z-50 min-w-[164px] overflow-hidden rounded-lg border border-border-default bg-dark-card py-1 shadow-2xl animate-scale-in"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        <button
                            onClick={() => {
                                onEdit(contextMenu.sheet);
                                setContextMenu(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-dark-elevated hover:text-text-primary"
                        >
                            <Edit2 className="h-3.5 w-3.5" />
                            Edit table
                        </button>
                        <div className="my-1 h-px bg-border-default" />
                        <button
                            onClick={() => {
                                onDelete(contextMenu.sheet.id);
                                setContextMenu(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-status-danger transition-colors hover:bg-status-danger/10"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete table
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
