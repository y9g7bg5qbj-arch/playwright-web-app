import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Database, Globe, Folder, Play, FileText, Hash } from 'lucide-react';

/**
 * Variable scopes matching backend VariableScope enum
 */
export type VariableScope = 'runtime' | 'data' | 'flow' | 'workflow' | 'environment' | 'global';

interface Variable {
    key: string;
    value?: any;
    scope: VariableScope;
    type?: 'string' | 'number' | 'boolean' | 'json' | 'array';
    sensitive?: boolean;
}

interface VariableAutocompleteProps {
    /** The input element to attach the autocomplete to */
    inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
    /** Current value of the input */
    value: string;
    /** Available variables grouped by scope */
    variables: Variable[];
    /** Callback when a variable is selected */
    onSelect: (variable: string) => void;
    /** Position offset for the dropdown */
    offset?: { x: number; y: number };
}

/** Scope configuration for display */
const scopeConfig: Record<VariableScope, {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ElementType;
    priority: number;
}> = {
    runtime: {
        label: 'Runtime',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/20',
        icon: Play,
        priority: 1
    },
    data: {
        label: 'Data',
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/20',
        icon: Database,
        priority: 2
    },
    flow: {
        label: 'Flow',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        icon: FileText,
        priority: 3
    },
    workflow: {
        label: 'Workflow',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        icon: Folder,
        priority: 4
    },
    environment: {
        label: 'Environment',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        icon: Globe,
        priority: 5
    },
    global: {
        label: 'Global',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20',
        icon: Hash,
        priority: 6
    },
};

/**
 * VariableAutocomplete
 * 
 * A dropdown component that appears when typing {{  in an input field.
 * Shows available variables grouped by scope with proper hierarchy.
 * 
 * Resolution Order (narrowest to broadest):
 * RUNTIME → DATA → FLOW → WORKFLOW → ENVIRONMENT → GLOBAL
 */
export function VariableAutocomplete({
    inputRef,
    value,
    variables,
    onSelect,
    offset = { x: 0, y: 0 },
}: VariableAutocompleteProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Detect {{ pattern and extract search term
    useEffect(() => {
        if (!value) {
            setIsOpen(false);
            return;
        }

        const cursorPosition = inputRef.current?.selectionStart || 0;
        const textBeforeCursor = value.slice(0, cursorPosition);

        // Look for {{ that's not already closed
        const openBraceIndex = textBeforeCursor.lastIndexOf('{{');
        const closeBraceIndex = textBeforeCursor.lastIndexOf('}}');

        if (openBraceIndex > closeBraceIndex) {
            // We're inside {{ ... 
            const searchTerm = textBeforeCursor.slice(openBraceIndex + 2);
            setSearch(searchTerm);
            setIsOpen(true);
            setSelectedIndex(0);
        } else {
            setIsOpen(false);
            setSearch('');
        }
    }, [value, inputRef]);

    // Update dropdown position based on input element
    useEffect(() => {
        if (!isOpen || !inputRef.current) return;

        const rect = inputRef.current.getBoundingClientRect();
        setPosition({
            top: rect.bottom + window.scrollY + offset.y + 4,
            left: rect.left + window.scrollX + offset.x,
        });
    }, [isOpen, inputRef, offset]);

    // Filter and group variables
    const filteredGroups = useMemo(() => {
        const searchLower = search.toLowerCase().trim();

        // Filter variables
        const filtered = variables.filter(v =>
            v.key.toLowerCase().includes(searchLower)
        );

        // Group by scope
        const groups = new Map<VariableScope, Variable[]>();

        for (const v of filtered) {
            if (!groups.has(v.scope)) {
                groups.set(v.scope, []);
            }
            groups.get(v.scope)!.push(v);
        }

        // Sort groups by priority
        return Array.from(groups.entries())
            .sort(([a], [b]) => scopeConfig[a].priority - scopeConfig[b].priority);
    }, [variables, search]);

    // Flatten for keyboard navigation
    const flatList = useMemo(() =>
        filteredGroups.flatMap(([_, vars]) => vars),
        [filteredGroups]
    );

    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(i => Math.min(i + 1, flatList.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(i => Math.max(i - 1, 0));
                    break;
                case 'Enter':
                case 'Tab':
                    if (flatList[selectedIndex]) {
                        e.preventDefault();
                        handleSelect(flatList[selectedIndex].key);
                    }
                    break;
                case 'Escape':
                    setIsOpen(false);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, flatList]);

    // Handle variable selection
    const handleSelect = (key: string) => {
        // Insert the variable, replacing the search term
        const cursorPosition = inputRef.current?.selectionStart || 0;
        const textBeforeCursor = value.slice(0, cursorPosition);
        const openBraceIndex = textBeforeCursor.lastIndexOf('{{');

        // Build the new value: everything before {{ + {{key}} + everything after cursor
        const before = value.slice(0, openBraceIndex);
        const after = value.slice(cursorPosition);
        const newValue = `${before}{{${key}}}${after}`;

        onSelect(newValue);
        setIsOpen(false);
    };

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node) &&
                !inputRef.current?.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, inputRef]);

    if (!isOpen || filteredGroups.length === 0) return null;

    let currentIndex = 0;

    return createPortal(
        <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-slate-800 border border-slate-700 rounded-lg shadow-2xl 
                 w-72 max-h-80 overflow-hidden flex flex-col"
            style={{ top: position.top, left: position.left }}
        >
            {/* Header */}
            <div className="px-3 py-2 bg-slate-850 border-b border-slate-700">
                <div className="text-xs text-slate-400 font-medium">
                    Insert Variable
                </div>
                {search && (
                    <div className="text-sm text-slate-300 mt-0.5">
                        Searching: <span className="text-blue-400">{search}</span>
                    </div>
                )}
            </div>

            {/* Variable list */}
            <div className="overflow-y-auto flex-1">
                {filteredGroups.map(([scope, vars]) => {
                    const config = scopeConfig[scope];
                    const ScopeIcon = config.icon;

                    return (
                        <div key={scope}>
                            {/* Scope header */}
                            <div className={`px-3 py-1.5 flex items-center gap-2 ${config.bgColor}`}>
                                <ScopeIcon className={`w-3.5 h-3.5 ${config.color}`} />
                                <span className={`text-xs font-semibold uppercase tracking-wide ${config.color}`}>
                                    {config.label}
                                </span>
                                <span className="text-xs text-slate-500 ml-auto">
                                    {vars.length}
                                </span>
                            </div>

                            {/* Variables in this scope */}
                            {vars.map((variable) => {
                                const index = currentIndex++;
                                const isSelected = index === selectedIndex;

                                return (
                                    <button
                                        key={`${scope}-${variable.key}`}
                                        onClick={() => handleSelect(variable.key)}
                                        className={`w-full px-3 py-2 flex items-center gap-2 text-left transition-colors
                               ${isSelected ? 'bg-blue-600/30' : 'hover:bg-slate-700/50'}`}
                                    >
                                        <ChevronRight className={`w-3 h-3 ${isSelected ? 'text-blue-400' : 'text-slate-600'}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-slate-200 font-mono truncate">
                                                {variable.key}
                                            </div>
                                            {variable.value !== undefined && !variable.sensitive && (
                                                <div className="text-xs text-slate-500 truncate">
                                                    = {typeof variable.value === 'object'
                                                        ? JSON.stringify(variable.value).slice(0, 30)
                                                        : String(variable.value)}
                                                </div>
                                            )}
                                            {variable.sensitive && (
                                                <div className="text-xs text-slate-500">= ********</div>
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-600 ml-2">
                                            {variable.type || 'string'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/* Footer hint */}
            <div className="px-3 py-2 bg-slate-850 border-t border-slate-700 text-xs text-slate-500">
                <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-400">↑↓</kbd> navigate
                <span className="mx-2">•</span>
                <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-400">Enter</kbd> select
                <span className="mx-2">•</span>
                <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-400">Esc</kbd> close
            </div>
        </div>,
        document.body
    );
}

/**
 * Helper hook to use variable autocomplete with any input
 */
export function useVariableAutocomplete(
    variables: Variable[]
) {
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    const [value, setValue] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setValue(e.target.value);
    };

    const handleSelect = (newValue: string) => {
        setValue(newValue);
        // Focus back on input and move cursor after the inserted variable
        inputRef.current?.focus();
    };

    return {
        inputRef,
        value,
        setValue,
        handleChange,
        autocompleteProps: {
            inputRef,
            value,
            variables,
            onSelect: handleSelect,
        },
    };
}
