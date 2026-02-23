/**
 * SlashPalette — Filterable action list that appears when "/" is typed on an empty line.
 *
 * Rendered as a React portal into document.body, positioned via fixed coordinates
 * from the Monaco editor cursor. Follows the same pattern as GutterContextMenu.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { filterActions, groupActionsByCategory } from './actionCatalog';
import type { ActionDef } from './types';

interface SlashPaletteProps {
    x: number;
    y: number;
    onSelect: (action: ActionDef) => void;
    onClose: () => void;
}

export function SlashPalette({ x, y, onSelect, onClose }: SlashPaletteProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const filtered = filterActions(query);
    const groups = groupActionsByCategory(filtered);
    const flatActions = groups.flatMap(g => g.actions);

    // Reset selection when filter changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Auto-focus input on mount
    useEffect(() => {
        // Small delay to avoid capturing the "/" keystroke
        const timer = setTimeout(() => inputRef.current?.focus(), 10);
        return () => clearTimeout(timer);
    }, []);

    // Click-outside and Esc dismissal (same pattern as GutterContextMenu)
    useEffect(() => {
        let mousedownHandler: ((e: MouseEvent) => void) | null = null;

        const timerId = requestAnimationFrame(() => {
            mousedownHandler = (e: MouseEvent) => {
                if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                    onCloseRef.current();
                }
            };
            document.addEventListener('mousedown', mousedownHandler);
        });

        return () => {
            cancelAnimationFrame(timerId);
            if (mousedownHandler) document.removeEventListener('mousedown', mousedownHandler);
        };
    }, []);

    // Viewport edge adjustment
    useEffect(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            if (rect.right > viewportWidth) {
                containerRef.current.style.left = `${x - rect.width}px`;
            }
            if (rect.bottom > viewportHeight) {
                containerRef.current.style.top = `${Math.max(8, y - rect.height)}px`;
            }
        }
    }, [x, y]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, flatActions.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (flatActions[selectedIndex]) {
                    onSelect(flatActions[selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                onClose();
                break;
        }
    }, [flatActions, selectedIndex, onSelect, onClose]);

    // Scroll selected item into view
    useEffect(() => {
        const selectedEl = containerRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
        selectedEl?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    const content = (
        <div
            ref={containerRef}
            style={{ position: 'fixed', left: x, top: y, zIndex: 1000 }}
            className="bg-dark-card border border-border-default rounded-lg shadow-xl w-[280px] max-h-[320px] flex flex-col overflow-hidden"
            onKeyDown={handleKeyDown}
        >
            {/* Search input */}
            <div className="px-2 pt-2 pb-1 border-b border-border-default">
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search actions..."
                    className="w-full px-2 py-1 text-sm bg-dark-elevated border border-border-default rounded text-text-primary placeholder:text-text-muted outline-none focus:border-accent-primary"
                    autoComplete="off"
                    spellCheck={false}
                />
            </div>

            {/* Action list */}
            <div className="overflow-y-auto flex-1 py-1">
                {flatActions.length === 0 && (
                    <div className="px-3 py-2 text-xs text-text-muted">No matching actions</div>
                )}
                {groups.map(group => (
                    <div key={group.category}>
                        <div className="px-3 py-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                            {group.label}
                        </div>
                        {group.actions.map(action => {
                            const globalIndex = flatActions.indexOf(action);
                            const isSelected = globalIndex === selectedIndex;
                            return (
                                <button
                                    key={action.id}
                                    data-index={globalIndex}
                                    onClick={() => onSelect(action)}
                                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                                        isSelected
                                            ? 'bg-accent-primary/20 text-text-primary'
                                            : 'text-text-primary hover:bg-dark-elevated'
                                    }`}
                                >
                                    <span className="font-mono text-xs font-bold text-accent-primary min-w-[90px]">
                                        {action.label}
                                    </span>
                                    <span className="text-xs text-text-secondary truncate">
                                        {action.description}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Footer hint */}
            <div className="px-3 py-1.5 border-t border-border-default text-[10px] text-text-muted">
                ↑↓ navigate · Enter select · Esc cancel
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
