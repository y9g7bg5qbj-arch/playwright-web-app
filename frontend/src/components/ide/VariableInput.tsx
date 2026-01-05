/**
 * VariableInput Component
 * 
 * A smart input component with {{variable}} syntax detection and autocomplete.
 * Shows available variables grouped by scope as user types.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VariableScope, Variable, ResolvedVariable } from '@playwright-web-app/shared';

// ============================================
// TYPES
// ============================================

export interface VariableInputProps {
    value: string;
    onChange: (value: string) => void;
    availableVariables?: ResolvedVariable[];
    placeholder?: string;
    className?: string;
    multiline?: boolean;
    rows?: number;
    disabled?: boolean;
    label?: string;
    error?: string;
}

interface AutocompleteItem {
    key: string;
    scope: VariableScope;
    type: string;
    displayValue: string;
}

// ============================================
// SCOPE CONFIG
// ============================================

const SCOPE_COLORS: Record<VariableScope, string> = {
    [VariableScope.GLOBAL]: '#6b7280',      // Gray
    [VariableScope.ENVIRONMENT]: '#10b981', // Green
    [VariableScope.WORKFLOW]: '#8b5cf6',    // Purple
    [VariableScope.FLOW]: '#3b82f6',        // Blue
    [VariableScope.DATA]: '#f59e0b',        // Amber
    [VariableScope.RUNTIME]: '#ef4444',     // Red
};

const SCOPE_LABELS: Record<VariableScope, string> = {
    [VariableScope.GLOBAL]: 'Global',
    [VariableScope.ENVIRONMENT]: 'Environment',
    [VariableScope.WORKFLOW]: 'Workflow',
    [VariableScope.FLOW]: 'Flow',
    [VariableScope.DATA]: 'Data',
    [VariableScope.RUNTIME]: 'Runtime',
};

const SCOPE_ICONS: Record<VariableScope, string> = {
    [VariableScope.GLOBAL]: '🌍',
    [VariableScope.ENVIRONMENT]: '🔧',
    [VariableScope.WORKFLOW]: '📁',
    [VariableScope.FLOW]: '📄',
    [VariableScope.DATA]: '📊',
    [VariableScope.RUNTIME]: '⚡',
};

// ============================================
// COMPONENT
// ============================================

export function VariableInput({
    value,
    onChange,
    availableVariables = [],
    placeholder = 'Enter value or {{variable}}',
    className = '',
    multiline = false,
    rows = 3,
    disabled = false,
    label,
    error,
}: VariableInputProps) {
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [autocompleteItems, setAutocompleteItems] = useState<AutocompleteItem[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [cursorPosition, setCursorPosition] = useState(0);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    const autocompleteRef = useRef<HTMLDivElement>(null);

    // Convert available variables to autocomplete items
    const allItems: AutocompleteItem[] = availableVariables.map(v => ({
        key: v.key,
        scope: v.scope,
        type: v.type,
        displayValue: v.sensitive ? '********' : String(v.value),
    }));

    // Check if we're in a variable context (typing after {{)
    const detectVariableContext = useCallback((text: string, position: number): string | null => {
        const before = text.substring(0, position);
        const lastOpenBrace = before.lastIndexOf('{{');

        if (lastOpenBrace === -1) return null;

        // Check if there's a closing brace after the opening
        const afterOpen = before.substring(lastOpenBrace + 2);
        if (afterOpen.includes('}}')) return null;

        return afterOpen.trim();
    }, []);

    // Filter items based on current input
    const filterItems = useCallback((searchText: string): AutocompleteItem[] => {
        const search = searchText.toLowerCase();
        return allItems
            .filter(item => item.key.toLowerCase().includes(search))
            .sort((a, b) => {
                // Prioritize items that start with the search text
                const aStarts = a.key.toLowerCase().startsWith(search);
                const bStarts = b.key.toLowerCase().startsWith(search);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return a.key.localeCompare(b.key);
            })
            .slice(0, 10);
    }, [allItems]);

    // Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const position = e.target.selectionStart || 0;

        onChange(newValue);
        setCursorPosition(position);

        // Check for variable context
        const searchText = detectVariableContext(newValue, position);
        if (searchText !== null) {
            const filtered = filterItems(searchText);
            setAutocompleteItems(filtered);
            setShowAutocomplete(filtered.length > 0);
            setSelectedIndex(0);
        } else {
            setShowAutocomplete(false);
        }
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showAutocomplete) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, autocompleteItems.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
            case 'Tab':
                if (autocompleteItems.length > 0) {
                    e.preventDefault();
                    insertVariable(autocompleteItems[selectedIndex]);
                }
                break;
            case 'Escape':
                setShowAutocomplete(false);
                break;
        }
    };

    // Insert selected variable
    const insertVariable = (item: AutocompleteItem) => {
        const searchText = detectVariableContext(value, cursorPosition);
        if (searchText === null) return;

        const beforeSearch = value.substring(0, cursorPosition - searchText.length);
        const afterCursor = value.substring(cursorPosition);

        // Find where to end the variable (next }} or end of string)
        let afterToKeep = afterCursor;
        const closingBrace = afterCursor.indexOf('}}');
        if (closingBrace !== -1) {
            afterToKeep = afterCursor.substring(closingBrace + 2);
        }

        const newValue = `${beforeSearch}${item.key}}}${afterToKeep}`;
        onChange(newValue);
        setShowAutocomplete(false);

        // Set cursor after the inserted variable
        const newPosition = beforeSearch.length + item.key.length + 2;
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.setSelectionRange(newPosition, newPosition);
                inputRef.current.focus();
            }
        }, 0);
    };

    // Close autocomplete when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                autocompleteRef.current &&
                !autocompleteRef.current.contains(e.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(e.target as Node)
            ) {
                setShowAutocomplete(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Highlight variables in the display
    const highlightedValue = value.replace(
        /\{\{([^}]+)\}\}/g,
        '<span class="variable-highlight">{{$1}}</span>'
    );

    const InputComponent = multiline ? 'textarea' : 'input';

    return (
        <div className={`variable-input-container ${className}`} style={{ position: 'relative' }}>
            {label && (
                <label className="variable-input-label" style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#6b7280',
                }}>
                    {label}
                </label>
            )}

            <InputComponent
                ref={inputRef as any}
                type="text"
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                rows={multiline ? rows : undefined}
                className="variable-input"
                style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: error ? '1px solid #ef4444' : '1px solid #e5e7eb',
                    borderRadius: '6px',
                    outline: 'none',
                    backgroundColor: disabled ? '#f3f4f6' : '#fff',
                    color: '#1f2937',
                    resize: multiline ? 'vertical' : 'none',
                }}
            />

            {error && (
                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                    {error}
                </div>
            )}

            {showAutocomplete && autocompleteItems.length > 0 && (
                <div
                    ref={autocompleteRef}
                    className="variable-autocomplete"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflowY: 'auto',
                    }}
                >
                    {autocompleteItems.map((item, index) => (
                        <div
                            key={`${item.scope}-${item.key}`}
                            onClick={() => insertVariable(item)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: index === selectedIndex ? '#f3f4f6' : 'transparent',
                                borderBottom: index < autocompleteItems.length - 1 ? '1px solid #f3f4f6' : 'none',
                            }}
                        >
                            <span style={{ fontSize: '14px' }}>{SCOPE_ICONS[item.scope]}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontFamily: 'monospace',
                                    fontSize: '13px',
                                    color: '#1f2937'
                                }}>
                                    {item.key}
                                </div>
                                <div style={{
                                    fontSize: '11px',
                                    color: '#9ca3af',
                                    display: 'flex',
                                    gap: '8px',
                                }}>
                                    <span style={{
                                        backgroundColor: SCOPE_COLORS[item.scope],
                                        color: '#fff',
                                        padding: '1px 4px',
                                        borderRadius: '3px',
                                        fontSize: '10px',
                                    }}>
                                        {SCOPE_LABELS[item.scope]}
                                    </span>
                                    <span>{item.displayValue}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================
// CSS STYLES (Add to your global CSS)
// ============================================

export const VariableInputStyles = `
.variable-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.variable-input::placeholder {
  color: #9ca3af;
}

.variable-highlight {
  background-color: #dbeafe;
  color: #1e40af;
  padding: 1px 3px;
  border-radius: 3px;
  font-family: monospace;
}
`;

export default VariableInput;
