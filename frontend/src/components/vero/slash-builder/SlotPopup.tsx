/**
 * SlotPopup — Generic popup for non-target slot kinds.
 *
 * Handles: text, select, number, key inputs.
 * Renders as a compact portal at the placeholder location.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { COMMON_KEYS } from './types';
import type { SlotDef } from './types';

interface SlotPopupProps {
    x: number;
    y: number;
    slot: SlotDef;
    onApply: (value: string) => void;
    onClose: () => void;
}

export function SlotPopup({ x, y, slot, onApply, onClose }: SlotPopupProps) {
    const [value, setValue] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    // Auto-focus
    useEffect(() => {
        const timer = setTimeout(() => inputRef.current?.focus(), 10);
        return () => clearTimeout(timer);
    }, []);

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
        const trimmed = value.trim();
        if (trimmed || slot.optional) {
            onApply(trimmed);
        }
    }, [value, slot.optional, onApply]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleApply();
        }
    }, [handleApply]);

    // For select kind, apply immediately on change
    const handleSelectChange = useCallback((val: string) => {
        setValue(val);
        if (val) {
            onApply(val);
        }
    }, [onApply]);

    const renderInput = () => {
        switch (slot.kind) {
            case 'select':
                return (
                    <select
                        ref={inputRef as React.Ref<HTMLSelectElement>}
                        value={value}
                        onChange={e => handleSelectChange(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm bg-dark-elevated border border-border-default rounded text-text-primary outline-none focus:border-accent-primary"
                    >
                        <option value="">Select {slot.label}...</option>
                        {slot.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );

            case 'key':
                return (
                    <select
                        ref={inputRef as React.Ref<HTMLSelectElement>}
                        value={value}
                        onChange={e => handleSelectChange(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm bg-dark-elevated border border-border-default rounded text-text-primary outline-none focus:border-accent-primary"
                    >
                        <option value="">Select key...</option>
                        {COMMON_KEYS.map(key => (
                            <option key={key} value={key}>{key}</option>
                        ))}
                    </select>
                );

            case 'number':
                return (
                    <input
                        ref={inputRef as React.Ref<HTMLInputElement>}
                        type="number"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        placeholder={slot.label}
                        min={0}
                        step={1}
                        className="w-full px-2 py-1.5 text-sm bg-dark-elevated border border-border-default rounded text-text-primary placeholder:text-text-muted outline-none focus:border-accent-primary"
                        autoComplete="off"
                    />
                );

            case 'text':
            default:
                return (
                    <input
                        ref={inputRef as React.Ref<HTMLInputElement>}
                        type="text"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        placeholder={slot.label}
                        className="w-full px-2 py-1.5 text-sm bg-dark-elevated border border-border-default rounded text-text-primary placeholder:text-text-muted outline-none focus:border-accent-primary"
                        autoComplete="off"
                        spellCheck={false}
                    />
                );
        }
    };

    const content = (
        <div
            ref={containerRef}
            style={{ position: 'fixed', left: x, top: y, zIndex: 1001 }}
            className="bg-dark-card border border-border-default rounded-lg shadow-xl w-[240px] overflow-hidden"
            onKeyDown={handleKeyDown}
        >
            <div className="p-2">
                <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
                    {slot.label}
                </div>
                {renderInput()}
            </div>
            {/* Only show footer for text/number (select/key apply immediately) */}
            {(slot.kind === 'text' || slot.kind === 'number') && (
                <div className="flex items-center justify-between px-2 py-1.5 border-t border-border-default">
                    <span className="text-[10px] text-text-muted">Enter to apply</span>
                    <button
                        onClick={handleApply}
                        disabled={!value.trim() && !slot.optional}
                        className="px-3 py-0.5 text-xs font-medium rounded bg-accent-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-primary/80 transition-colors"
                    >
                        Apply
                    </button>
                </div>
            )}
        </div>
    );

    return createPortal(content, document.body);
}
