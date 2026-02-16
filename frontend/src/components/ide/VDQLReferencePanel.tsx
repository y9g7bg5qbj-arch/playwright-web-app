/**
 * VDQLReferencePanel - Quick reference for VDQL query syntax
 *
 * Collapsible panel showing common VDQL patterns with copy buttons.
 * Designed to live inside the IDE sidebar for easy discovery.
 */

import { useState, useCallback } from 'react';
import { ChevronRight, Copy, Check, BookOpen } from 'lucide-react';
import { Tooltip } from '@/components/ui';

interface VDQLExample {
    label: string;
    snippet: string;
    description: string;
}

const VDQL_EXAMPLES: VDQLExample[] = [
    {
        label: 'Single row by key',
        snippet: 'ROW one FROM Users WHERE userId = "U-1001"',
        description: 'Fetch one row matching an exact value.',
    },
    {
        label: 'Multiple rows',
        snippet: 'ROWS many FROM Users WHERE status = "active"',
        description: 'Fetch all rows matching a condition.',
    },
    {
        label: 'Extract a field',
        snippet: `ROW user FROM Users WHERE email = "test@example.com"\nTEXT name = user.fullName`,
        description: 'Pull a single value from the matched row.',
    },
    {
        label: 'Count matching rows',
        snippet: 'NUMBER total = COUNT Users WHERE enabled = true',
        description: 'Get the number of rows matching a filter.',
    },
    {
        label: 'Sorted + limited',
        snippet: 'ROWS recent FROM Users WHERE status = "active" ORDER BY createdAt DESC LIMIT 10',
        description: 'Fetch sorted rows with a row limit.',
    },
    {
        label: 'IN filter',
        snippet: 'ROWS subset FROM Drivers WHERE region IN ["US-East", "US-West"]',
        description: 'Match rows where a column is in a list.',
    },
];

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard API may fail in some contexts
        }
    }, [text]);

    return (
        <Tooltip content="Copy to clipboard" showDelayMs={0} hideDelayMs={0}>
            <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-dark-elevated/50 text-text-muted hover:text-text-secondary transition-colors"
                aria-label="Copy to clipboard"
            >
                {copied ? (
                    <Check className="w-3 h-3 text-status-success" />
                ) : (
                    <Copy className="w-3 h-3" />
                )}
            </button>
        </Tooltip>
    );
}

interface VDQLReferencePanelProps {
    onInsertSnippet?: (snippet: string) => void;
}

export function VDQLReferencePanel({ onInsertSnippet }: VDQLReferencePanelProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border-t border-border-default/60 bg-dark-canvas/50">
            {/* Header */}
            <div
                className="flex items-center gap-1.5 px-3 py-2.5 hover:bg-dark-elevated/30 cursor-pointer transition-colors duration-150"
                onClick={() => setExpanded(!expanded)}
            >
                <div className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
                    <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />
                </div>
                <div className="w-5 h-5 rounded-md bg-accent-purple/15 flex items-center justify-center">
                    <BookOpen className="w-3 h-3 text-accent-purple" />
                </div>
                <span className="flex-1 text-xs text-text-secondary font-semibold uppercase tracking-wider">
                    VDQL Reference
                </span>
            </div>

            {/* Examples */}
            {expanded && (
                <div className="px-2 pb-3 space-y-1">
                    {VDQL_EXAMPLES.map((example) => (
                        <div
                            key={example.label}
                            className="rounded-lg border border-border-default/40 bg-dark-card/30 px-2.5 py-2 group"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-text-primary">
                                    {example.label}
                                </span>
                                <div className="flex items-center gap-0.5">
                                    <CopyButton text={example.snippet} />
                                    {onInsertSnippet && (
                                        <button
                                            onClick={() => onInsertSnippet(example.snippet)}
                                            className="px-1.5 py-0.5 text-3xs bg-accent-purple/15 text-accent-purple rounded hover:bg-accent-purple/25 transition-colors hidden group-hover:inline-flex"
                                            title="Insert into editor"
                                        >
                                            Insert
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="text-3xs text-text-muted mb-1.5">{example.description}</p>
                            <pre className="text-3xs text-accent-teal font-mono bg-dark-bg/50 rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap">
                                {example.snippet}
                            </pre>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
