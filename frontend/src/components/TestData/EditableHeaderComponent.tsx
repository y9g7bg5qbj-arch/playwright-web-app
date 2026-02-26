/**
 * Custom AG Grid header component with inline rename support.
 * Double-click the header text to edit the column name.
 * Single-click sorts. Menu button shows Edit/Delete actions.
 * Uses React Portal for the dropdown to escape AG Grid's overflow:hidden.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { IHeaderParams } from 'ag-grid-community';
import { ArrowUp, ArrowDown, MoreVertical, Edit3, Trash2, Type } from 'lucide-react';

export interface EditableHeaderCustomParams {
    onRename?: (oldName: string, newName: string) => void;
    onEdit?: (columnName: string) => void;
    onRemove?: (columnName: string) => void;
    existingColumnNames: string[];
}

type SortState = 'asc' | 'desc' | null;

export function EditableHeaderComponent(props: IHeaderParams & EditableHeaderCustomParams) {
    const { displayName, enableSorting, progressSort, column, onRename, onEdit, onRemove, existingColumnNames } = props;

    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(displayName);
    const [error, setError] = useState<string | null>(null);
    const [sortState, setSortState] = useState<SortState>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Sync sort state from AG Grid
    useEffect(() => {
        const updateSort = () => {
            if (column.isSortAscending()) setSortState('asc');
            else if (column.isSortDescending()) setSortState('desc');
            else setSortState(null);
        };
        updateSort();

        const listener = () => updateSort();
        column.addEventListener('sortChanged', listener);
        return () => {
            column.removeEventListener('sortChanged', listener);
        };
    }, [column]);

    // Auto-focus and select when entering edit mode
    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editing]);

    // Reset value when displayName changes (after rename completes)
    useEffect(() => {
        setValue(displayName);
    }, [displayName]);

    // Close menu on outside click
    useEffect(() => {
        if (!menuOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (
                menuRef.current && !menuRef.current.contains(e.target as Node) &&
                menuButtonRef.current && !menuButtonRef.current.contains(e.target as Node)
            ) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    const handleStartEdit = useCallback(() => {
        if (!onRename) return;
        setValue(displayName);
        setError(null);
        setEditing(true);
    }, [displayName, onRename]);

    const handleCancel = useCallback(() => {
        setValue(displayName);
        setError(null);
        setEditing(false);
    }, [displayName]);

    const handleCommit = useCallback(() => {
        const trimmed = value.trim();
        if (!trimmed) {
            setError('Name cannot be empty');
            return;
        }
        if (trimmed === displayName) {
            setEditing(false);
            setError(null);
            return;
        }
        // Check for duplicates (case-insensitive), excluding current name
        const otherNames = (existingColumnNames || []).filter(n => n !== displayName);
        if (otherNames.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
            setError('Column name already exists');
            return;
        }
        // Validate name format (allow letters, numbers, underscore, $, spaces)
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$ ]*$/.test(trimmed)) {
            setError('Invalid column name');
            return;
        }
        onRename?.(displayName, trimmed);
        setEditing(false);
        setError(null);
    }, [value, displayName, existingColumnNames, onRename]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCommit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
        // Stop propagation to prevent AG Grid from handling keys during edit
        e.stopPropagation();
    }, [handleCommit, handleCancel]);

    const handleSort = useCallback((e: React.MouseEvent) => {
        if (!enableSorting) return;
        progressSort(e.shiftKey);
    }, [enableSorting, progressSort]);

    const handleToggleMenu = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (menuOpen) {
            setMenuOpen(false);
            return;
        }
        // Calculate position relative to viewport for the portal
        if (menuButtonRef.current) {
            const rect = menuButtonRef.current.getBoundingClientRect();
            setMenuPos({
                top: rect.bottom + 4,
                left: rect.right - 140, // align right edge with button
            });
        }
        setMenuOpen(true);
    }, [menuOpen]);

    const hasMenuActions = onEdit || onRemove || onRename;

    if (editing) {
        return (
            <div className="relative flex flex-col w-full h-full justify-center px-0.5">
                <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        setError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    onBlur={handleCommit}
                    className={`w-full h-7 px-2 text-xs bg-dark-elevated border rounded text-text-primary focus:outline-none focus:ring-1 ${
                        error
                            ? 'border-status-danger focus:border-status-danger focus:ring-status-danger'
                            : 'border-border-default focus:border-brand-primary focus:ring-brand-primary'
                    }`}
                />
                {error && createPortal(
                    <div
                        className="fixed px-2 py-1 bg-status-danger/90 text-white text-[10px] rounded shadow-lg whitespace-nowrap pointer-events-none"
                        style={{
                            top: inputRef.current ? inputRef.current.getBoundingClientRect().bottom + 2 : 0,
                            left: inputRef.current ? inputRef.current.getBoundingClientRect().left : 0,
                            zIndex: 9999,
                        }}
                    >
                        {error}
                    </div>,
                    document.body
                )}
            </div>
        );
    }

    return (
        <div
            className="flex items-center gap-1 w-full h-full select-none group/header"
            onClick={handleSort}
            onDoubleClick={(e) => {
                e.stopPropagation();
                handleStartEdit();
            }}
            style={{ cursor: enableSorting ? 'pointer' : 'default' }}
        >
            <span className="truncate text-xs font-medium text-text-secondary flex-1">
                {displayName}
            </span>
            {sortState === 'asc' && <ArrowUp className="w-3 h-3 text-brand-primary shrink-0" />}
            {sortState === 'desc' && <ArrowDown className="w-3 h-3 text-brand-primary shrink-0" />}
            {hasMenuActions && (
                <>
                    <button
                        ref={menuButtonRef}
                        onClick={handleToggleMenu}
                        className="shrink-0 opacity-0 group-hover/header:opacity-100 transition-opacity p-0.5 hover:bg-dark-elevated rounded"
                    >
                        <MoreVertical className="w-3 h-3 text-text-muted" />
                    </button>
                    {menuOpen && menuPos && createPortal(
                        <div
                            ref={menuRef}
                            className="fixed bg-dark-surface border border-border-default rounded-md shadow-lg py-1 min-w-[140px]"
                            style={{
                                top: menuPos.top,
                                left: menuPos.left,
                                zIndex: 9999,
                            }}
                        >
                            {onRename && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuOpen(false);
                                        handleStartEdit();
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-primary hover:bg-dark-elevated transition-colors"
                                >
                                    <Type className="w-3.5 h-3.5 text-text-muted" />
                                    Rename Column
                                </button>
                            )}
                            {onEdit && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuOpen(false);
                                        onEdit(displayName);
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-primary hover:bg-dark-elevated transition-colors"
                                >
                                    <Edit3 className="w-3.5 h-3.5 text-status-warning" />
                                    Edit Column
                                </button>
                            )}
                            {onRemove && (
                                <>
                                    <div className="border-t border-border-default my-1" />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMenuOpen(false);
                                            onRemove(displayName);
                                        }}
                                        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-status-danger hover:bg-dark-elevated transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete Column
                                    </button>
                                </>
                            )}
                        </div>,
                        document.body
                    )}
                </>
            )}
        </div>
    );
}
