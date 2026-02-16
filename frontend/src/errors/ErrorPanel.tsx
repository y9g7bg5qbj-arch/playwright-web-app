/**
 * ErrorPanel - VS Code-style Problems Panel
 *
 * A collapsible bottom panel that displays all validation errors and warnings
 * with click-to-navigate functionality.
 */

import { useState, useCallback } from 'react';
import {
    AlertCircle,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    XCircle,
    Info,
    Lightbulb,
    X
} from 'lucide-react';
import type { VeroError, ErrorStats } from './useEditorErrors';

interface ErrorPanelProps {
    /** All validation errors */
    errors: VeroError[];
    /** All validation warnings */
    warnings: VeroError[];
    /** Error statistics */
    stats: ErrorStats;
    /** Whether validation is running */
    isValidating: boolean;
    /** Callback when user clicks on an error to navigate */
    onNavigateToError?: (line: number, column?: number) => void;
    /** Callback when a suggestion action link is clicked (e.g. "openTestData", "createTable:Users") */
    onSuggestionAction?: (action: string) => void;
    /** Initial collapsed state */
    defaultCollapsed?: boolean;
    /** Maximum height when expanded */
    maxHeight?: number;
}

type FilterType = 'all' | 'errors' | 'warnings';

/**
 * Get severity icon
 */
function SeverityIcon({ severity }: { severity: VeroError['severity'] }) {
    switch (severity) {
        case 'error':
            return <XCircle className="w-4 h-4 text-status-danger flex-shrink-0" />;
        case 'warning':
            return <AlertTriangle className="w-4 h-4 text-status-warning flex-shrink-0" />;
        case 'info':
            return <Info className="w-4 h-4 text-status-info flex-shrink-0" />;
        case 'hint':
            return <Lightbulb className="w-4 h-4 text-text-secondary flex-shrink-0" />;
        default:
            return <AlertCircle className="w-4 h-4 text-text-secondary flex-shrink-0" />;
    }
}

/**
 * Single error row component
 */
function ErrorRow({
    error,
    onClick,
}: {
    error: VeroError;
    onClick: () => void;
}) {
    return (
        <div
            className="flex items-start gap-2 px-3 py-2 hover:bg-dark-elevated cursor-pointer border-b border-border-default last:border-b-0"
            onClick={onClick}
        >
            <SeverityIcon severity={error.severity} />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-text-primary truncate">
                        {error.title}
                    </span>
                    <span className="text-xs text-text-secondary font-mono">
                        [{error.code}]
                    </span>
                </div>

                <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                    {error.whatWentWrong}
                </p>

                {error.location && (
                    <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-text-muted">
                            Line {error.location.line}
                            {error.location.column ? `:${error.location.column}` : ''}
                        </span>
                    </div>
                )}
            </div>

            {/* Category badge */}
            <span className={`
                px-1.5 py-0.5 text-xs rounded font-medium flex-shrink-0
                ${error.category === 'lexer' ? 'bg-accent-purple/20 text-accent-purple' : ''}
                ${error.category === 'parser' ? 'bg-status-info/20 text-status-info' : ''}
                ${error.category === 'validation' ? 'bg-status-warning/20 text-status-warning' : ''}
            `}>
                {error.category}
            </span>
        </div>
    );
}

/**
 * Error detail popover (shown when clicking an error)
 */
function ErrorDetailPopover({
    error,
    onClose,
    onSuggestionAction,
}: {
    error: VeroError;
    onClose: () => void;
    onSuggestionAction?: (action: string) => void;
}) {
    return (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-dark-bg rounded-lg shadow-xl border border-border-default p-4 z-50">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-2">
                    <SeverityIcon severity={error.severity} />
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-text-primary">
                                {error.title}
                            </h3>
                            <span className="text-xs text-text-secondary font-mono">
                                [{error.code}]
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-dark-elevated rounded"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="mt-3 space-y-3">
                <div>
                    <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
                        What went wrong
                    </h4>
                    <p className="text-sm text-text-primary">
                        {error.whatWentWrong}
                    </p>
                </div>

                <div>
                    <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
                        How to fix
                    </h4>
                    <p className="text-sm text-text-primary">
                        {error.howToFix}
                    </p>
                </div>

                {error.suggestions.length > 0 && (
                    <div>
                        <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
                            Suggestions
                        </h4>
                        <ul className="space-y-1">
                            {error.suggestions.map((suggestion, i) => (
                                <li
                                    key={i}
                                    className="flex items-start gap-2 text-sm text-text-primary"
                                >
                                    <Lightbulb className="w-4 h-4 text-status-warning flex-shrink-0 mt-0.5" />
                                    {suggestion.action && onSuggestionAction ? (
                                        <button
                                            onClick={() => onSuggestionAction(suggestion.action!)}
                                            className="text-status-info hover:underline text-left"
                                        >
                                            {suggestion.text}
                                        </button>
                                    ) : (
                                        suggestion.text
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * ErrorPanel Component
 */
export function ErrorPanel({
    errors,
    warnings,
    stats,
    isValidating,
    onNavigateToError,
    onSuggestionAction,
    defaultCollapsed = false,
    maxHeight = 200,
}: ErrorPanelProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const [filter, setFilter] = useState<FilterType>('all');
    const [selectedError, setSelectedError] = useState<VeroError | null>(null);

    // Filter issues based on current filter
    const filteredIssues = useCallback(() => {
        switch (filter) {
            case 'errors':
                return errors;
            case 'warnings':
                return warnings;
            default:
                return [...errors, ...warnings];
        }
    }, [errors, warnings, filter])();

    // Handle error click
    const handleErrorClick = useCallback((error: VeroError) => {
        setSelectedError(error);
        if (error.location && onNavigateToError) {
            onNavigateToError(error.location.line, error.location.column);
        }
    }, [onNavigateToError]);

    // No issues - show minimal bar
    if (stats.total === 0) {
        return (
            <div className="border-t border-border-default bg-dark-card">
                <div className="flex items-center justify-between px-3 py-1.5 text-xs text-text-secondary">
                    <span className="flex items-center gap-2">
                        {isValidating ? (
                            <>
                                <div className="w-3 h-3 border-2 border-border-default border-t-transparent rounded-full animate-spin" />
                                Validating...
                            </>
                        ) : (
                            <>
                                <AlertCircle className="w-3.5 h-3.5 text-status-success" />
                                No problems
                            </>
                        )}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="border-t border-border-default bg-white dark:bg-dark-bg relative">
            {/* Header */}
            <div
                className="flex items-center justify-between px-3 py-1.5 bg-dark-card cursor-pointer select-none"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-text-primary">
                        Problems
                    </span>

                    {/* Error/Warning counts */}
                    <div className="flex items-center gap-2">
                        {stats.errors > 0 && (
                            <span className="flex items-center gap-1 text-xs text-status-danger">
                                <XCircle className="w-3.5 h-3.5" />
                                {stats.errors}
                            </span>
                        )}
                        {stats.warnings > 0 && (
                            <span className="flex items-center gap-1 text-xs text-status-warning">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {stats.warnings}
                            </span>
                        )}
                    </div>

                    {isValidating && (
                        <div className="w-3 h-3 border-2 border-status-info border-t-transparent rounded-full animate-spin" />
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Filter buttons (only when expanded) */}
                    {!isCollapsed && (
                        <div className="flex items-center gap-1 mr-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); setFilter('all'); }}
                                className={`px-2 py-0.5 text-xs rounded ${
                                    filter === 'all'
                                        ? 'bg-dark-elevated text-text-primary'
                                        : 'text-text-secondary hover:bg-dark-elevated'
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setFilter('errors'); }}
                                className={`px-2 py-0.5 text-xs rounded ${
                                    filter === 'errors'
                                        ? 'bg-status-danger/20 text-status-danger'
                                        : 'text-text-secondary hover:bg-dark-elevated'
                                }`}
                            >
                                Errors
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setFilter('warnings'); }}
                                className={`px-2 py-0.5 text-xs rounded ${
                                    filter === 'warnings'
                                        ? 'bg-status-warning/20 text-status-warning'
                                        : 'text-text-secondary hover:bg-dark-elevated'
                                }`}
                            >
                                Warnings
                            </button>
                        </div>
                    )}

                    {/* Collapse/Expand icon */}
                    {isCollapsed ? (
                        <ChevronUp className="w-4 h-4 text-text-secondary" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-text-secondary" />
                    )}
                </div>
            </div>

            {/* Error list (when expanded) */}
            {!isCollapsed && (
                <div
                    className="overflow-y-auto"
                    style={{ maxHeight }}
                >
                    {filteredIssues.length === 0 ? (
                        <div className="px-3 py-4 text-center text-sm text-text-secondary">
                            No {filter === 'all' ? 'problems' : filter} to show
                        </div>
                    ) : (
                        filteredIssues.map((error, index) => (
                            <ErrorRow
                                key={`${error.code}-${error.location?.line}-${index}`}
                                error={error}
                                onClick={() => handleErrorClick(error)}
                            />
                        ))
                    )}
                </div>
            )}

            {/* Error detail popover */}
            {selectedError && (
                <ErrorDetailPopover
                    error={selectedError}
                    onClose={() => setSelectedError(null)}
                    onSuggestionAction={onSuggestionAction}
                />
            )}
        </div>
    );
}

export default ErrorPanel;
