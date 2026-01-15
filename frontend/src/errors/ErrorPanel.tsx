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
            return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
        case 'warning':
            return <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />;
        case 'info':
            return <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />;
        case 'hint':
            return <Lightbulb className="w-4 h-4 text-gray-500 flex-shrink-0" />;
        default:
            return <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0" />;
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
            className="flex items-start gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0"
            onClick={onClick}
        >
            <SeverityIcon severity={error.severity} />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                        {error.title}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        [{error.code}]
                    </span>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {error.whatWentWrong}
                </p>

                {error.location && (
                    <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            Line {error.location.line}
                            {error.location.column ? `:${error.location.column}` : ''}
                        </span>
                    </div>
                )}
            </div>

            {/* Category badge */}
            <span className={`
                px-1.5 py-0.5 text-xs rounded font-medium flex-shrink-0
                ${error.category === 'lexer' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' : ''}
                ${error.category === 'parser' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}
                ${error.category === 'validation' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' : ''}
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
}: {
    error: VeroError;
    onClose: () => void;
}) {
    return (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-2">
                    <SeverityIcon severity={error.severity} />
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                {error.title}
                            </h3>
                            <span className="text-xs text-gray-500 font-mono">
                                [{error.code}]
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="mt-3 space-y-3">
                <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        What went wrong
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                        {error.whatWentWrong}
                    </p>
                </div>

                <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        How to fix
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                        {error.howToFix}
                    </p>
                </div>

                {error.suggestions.length > 0 && (
                    <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                            Suggestions
                        </h4>
                        <ul className="space-y-1">
                            {error.suggestions.map((suggestion, i) => (
                                <li
                                    key={i}
                                    className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                                >
                                    <Lightbulb className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                                    {suggestion.text}
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
            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center justify-between px-3 py-1.5 text-xs text-gray-500">
                    <span className="flex items-center gap-2">
                        {isValidating ? (
                            <>
                                <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                Validating...
                            </>
                        ) : (
                            <>
                                <AlertCircle className="w-3.5 h-3.5 text-green-500" />
                                No problems
                            </>
                        )}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 relative">
            {/* Header */}
            <div
                className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-800 cursor-pointer select-none"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Problems
                    </span>

                    {/* Error/Warning counts */}
                    <div className="flex items-center gap-2">
                        {stats.errors > 0 && (
                            <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                <XCircle className="w-3.5 h-3.5" />
                                {stats.errors}
                            </span>
                        )}
                        {stats.warnings > 0 && (
                            <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {stats.warnings}
                            </span>
                        )}
                    </div>

                    {isValidating && (
                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setFilter('errors'); }}
                                className={`px-2 py-0.5 text-xs rounded ${
                                    filter === 'errors'
                                        ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                            >
                                Errors
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setFilter('warnings'); }}
                                className={`px-2 py-0.5 text-xs rounded ${
                                    filter === 'warnings'
                                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                            >
                                Warnings
                            </button>
                        </div>
                    )}

                    {/* Collapse/Expand icon */}
                    {isCollapsed ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
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
                        <div className="px-3 py-4 text-center text-sm text-gray-500">
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
                />
            )}
        </div>
    );
}

export default ErrorPanel;
