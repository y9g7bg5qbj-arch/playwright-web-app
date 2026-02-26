/**
 * TargetPopup — Two-tab popup for selecting an element target.
 *
 * Tab 1: "From Page" — page dropdown → field dropdown (with selector info)
 * Tab 2: "Direct Selector" — selector type → value text input
 *
 * Renders as a portal positioned at the placeholder pill location.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getPageFields } from '../veroLanguage';
import { SELECTOR_TYPES } from './types';
import type { TargetValue, PageFieldData } from './types';

interface TargetPopupProps {
    x: number;
    y: number;
    onApply: (value: TargetValue) => void;
    onClose: () => void;
}

type TabMode = 'page' | 'selector';

export function TargetPopup({ x, y, onApply, onClose }: TargetPopupProps) {
    const pages = getPageFields();
    const hasPages = pages.length > 0;

    const [tab, setTab] = useState<TabMode>(hasPages ? 'page' : 'selector');
    const [selectedPage, setSelectedPage] = useState<string>(pages[0]?.name ?? '');
    const [selectedField, setSelectedField] = useState<string>('');
    const [selectorType, setSelectorType] = useState<string>('BUTTON');
    const [selectorValue, setSelectorValue] = useState<string>('');

    const containerRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    // Get fields for selected page
    const currentPage: PageFieldData | undefined = pages.find(p => p.name === selectedPage);
    const fields = currentPage?.fields ?? [];

    // Auto-select first field when page changes
    useEffect(() => {
        setSelectedField(fields[0]?.name ?? '');
    }, [selectedPage]);

    // Click-outside and Esc
    useEffect(() => {
        let mousedownHandler: ((e: MouseEvent) => void) | null = null;
        let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

        const timerId = requestAnimationFrame(() => {
            mousedownHandler = (e: MouseEvent) => {
                if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                    onCloseRef.current();
                }
            };
            keydownHandler = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    e.stopPropagation();
                    onCloseRef.current();
                }
            };
            document.addEventListener('mousedown', mousedownHandler);
            document.addEventListener('keydown', keydownHandler, true);
        });

        return () => {
            cancelAnimationFrame(timerId);
            if (mousedownHandler) document.removeEventListener('mousedown', mousedownHandler);
            if (keydownHandler) document.removeEventListener('keydown', keydownHandler, true);
        };
    }, []);

    // Viewport adjustment
    useEffect(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                containerRef.current.style.left = `${x - rect.width}px`;
            }
            if (rect.bottom > window.innerHeight) {
                containerRef.current.style.top = `${Math.max(8, y - rect.height)}px`;
            }
        }
    }, [x, y]);

    const handleApply = useCallback(() => {
        if (tab === 'page') {
            if (selectedPage && selectedField) {
                onApply({ kind: 'page-ref', page: selectedPage, field: selectedField });
            }
        } else {
            if (selectorType && selectorValue.trim()) {
                onApply({ kind: 'selector', type: selectorType, value: selectorValue.trim() });
            }
        }
    }, [tab, selectedPage, selectedField, selectorType, selectorValue, onApply]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleApply();
        }
    }, [handleApply]);

    const canApply = tab === 'page'
        ? (selectedPage && selectedField)
        : (selectorType && selectorValue.trim());

    // Preview text
    const preview = tab === 'page'
        ? (selectedPage && selectedField ? `${selectedPage}.${selectedField}` : '')
        : (selectorType && selectorValue.trim() ? `${selectorType} "${selectorValue.trim()}"` : '');

    const content = (
        <div
            ref={containerRef}
            style={{ position: 'fixed', left: x, top: y, zIndex: 1001 }}
            className="bg-dark-card border border-border-default rounded-lg shadow-xl w-[300px] overflow-hidden"
            onKeyDown={handleKeyDown}
        >
            {/* Tab toggle */}
            <div className="flex border-b border-border-default">
                <button
                    onClick={() => setTab('page')}
                    className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                        tab === 'page'
                            ? 'text-accent-primary border-b-2 border-accent-primary bg-dark-elevated'
                            : 'text-text-muted hover:text-text-secondary'
                    }`}
                    disabled={!hasPages}
                >
                    From Page
                </button>
                <button
                    onClick={() => setTab('selector')}
                    className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                        tab === 'selector'
                            ? 'text-accent-primary border-b-2 border-accent-primary bg-dark-elevated'
                            : 'text-text-muted hover:text-text-secondary'
                    }`}
                >
                    Direct Selector
                </button>
            </div>

            {/* Tab content */}
            <div className="p-3 space-y-2">
                {tab === 'page' ? (
                    <>
                        <label className="block">
                            <span className="text-3xs text-text-muted uppercase tracking-wider">Page</span>
                            <select
                                value={selectedPage}
                                onChange={e => setSelectedPage(e.target.value)}
                                className="mt-0.5 w-full px-2 py-1.5 text-sm bg-dark-elevated border border-border-default rounded text-text-primary outline-none focus:border-accent-primary"
                            >
                                {pages.map(p => (
                                    <option key={p.name} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-3xs text-text-muted uppercase tracking-wider">Field</span>
                            <select
                                value={selectedField}
                                onChange={e => setSelectedField(e.target.value)}
                                className="mt-0.5 w-full px-2 py-1.5 text-sm bg-dark-elevated border border-border-default rounded text-text-primary outline-none focus:border-accent-primary"
                            >
                                {fields.map(f => (
                                    <option key={f.name} value={f.name}>
                                        {f.name} ({f.selectorType} &quot;{f.selectorValue}&quot;)
                                    </option>
                                ))}
                            </select>
                        </label>
                    </>
                ) : (
                    <>
                        <label className="block">
                            <span className="text-3xs text-text-muted uppercase tracking-wider">Selector Type</span>
                            <select
                                value={selectorType}
                                onChange={e => setSelectorType(e.target.value)}
                                className="mt-0.5 w-full px-2 py-1.5 text-sm bg-dark-elevated border border-border-default rounded text-text-primary outline-none focus:border-accent-primary"
                            >
                                {SELECTOR_TYPES.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-3xs text-text-muted uppercase tracking-wider">Value</span>
                            <input
                                type="text"
                                value={selectorValue}
                                onChange={e => setSelectorValue(e.target.value)}
                                placeholder={selectorType === 'CSS' ? '.my-class' : 'Submit'}
                                className="mt-0.5 w-full px-2 py-1.5 text-sm bg-dark-elevated border border-border-default rounded text-text-primary placeholder:text-text-muted outline-none focus:border-accent-primary"
                                autoFocus
                                autoComplete="off"
                                spellCheck={false}
                            />
                        </label>
                    </>
                )}

                {/* Preview */}
                {preview && (
                    <div className="px-2 py-1 bg-dark-elevated rounded text-xs font-mono text-accent-primary truncate">
                        {preview}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-border-default">
                <span className="text-3xs text-text-muted">Enter to apply</span>
                <button
                    onClick={handleApply}
                    disabled={!canApply}
                    className="px-3 py-1 text-xs font-medium rounded bg-accent-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-primary/80 transition-colors"
                >
                    Apply
                </button>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
