import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Database, Table2, Columns3 } from 'lucide-react';
import { testDataApi, type TestDataSheet } from '@/api/testData';
import { Tooltip } from '@/components/ui';

interface DataPanelProps {
    projectId?: string;
    nestedProjectId?: string | null;
    onBuildQuery?: (tableName: string) => void;
    onInsertColumnRef?: (ref: string) => void;
}

export function DataPanel({ projectId, nestedProjectId, onBuildQuery, onInsertColumnRef }: DataPanelProps) {
    const [sheets, setSheets] = useState<TestDataSheet[]>([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [expandedSheets, setExpandedSheets] = useState<Set<string>>(new Set());

    const fetchSheets = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const result = await testDataApi.listSheets(projectId, {
                nestedProjectId,
                fallbackToApplicationScope: true,
            });
            setSheets(result);
        } catch {
            setSheets([]);
        } finally {
            setLoading(false);
        }
    }, [nestedProjectId, projectId]);

    useEffect(() => {
        fetchSheets();
    }, [fetchSheets]);

    const toggleSheetExpand = (sheetId: string) => {
        setExpandedSheets((prev) => {
            const next = new Set(prev);
            if (next.has(sheetId)) {
                next.delete(sheetId);
            } else {
                next.add(sheetId);
            }
            return next;
        });
    };

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
                <div className="w-5 h-5 rounded-md bg-accent-teal/15 flex items-center justify-center">
                    <Database className="w-3 h-3 text-accent-teal" />
                </div>
                <span className="flex-1 text-xs text-text-secondary font-semibold uppercase tracking-wider">Test Data</span>
                <span className="text-3xs text-text-muted">{sheets.length}</span>
            </div>

            {/* Sheet List */}
            {expanded && (
                <div className="px-2 pb-3">
                    {loading ? (
                        <div className="text-xs text-text-muted px-3 py-2">Loading...</div>
                    ) : sheets.length === 0 ? (
                        <div className="text-center py-4">
                            <div className="w-8 h-8 rounded-full bg-dark-bg/50 flex items-center justify-center mx-auto mb-2">
                                <Table2 className="w-4 h-4 text-text-muted" />
                            </div>
                            <p className="text-xs text-text-muted">No data tables</p>
                            <p className="text-3xs text-text-muted mt-1">Create tables in the Data view</p>
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {sheets.map((sheet) => {
                                const isExpanded = expandedSheets.has(sheet.id);
                                return (
                                    <div key={sheet.id}>
                                        {/* Sheet row */}
                                        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-dark-elevated/40 text-text-secondary hover:text-text-primary transition-all duration-150 group">
                                            <Tooltip content={`${isExpanded ? 'Collapse' : 'Expand'} ${sheet.name}`} showDelayMs={0} hideDelayMs={0}>
                                                <button
                                                    onClick={() => toggleSheetExpand(sheet.id)}
                                                    className="p-0.5"
                                                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${sheet.name}`}
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className="w-3 h-3" />
                                                    ) : (
                                                        <ChevronRight className="w-3 h-3" />
                                                    )}
                                                </button>
                                            </Tooltip>
                                            <Table2 className="w-3.5 h-3.5 text-accent-teal/70" />
                                            <span className="flex-1 text-xs truncate">{sheet.name}</span>
                                            <span className="text-3xs px-1.5 py-0.5 rounded-full bg-dark-card text-text-secondary">
                                                {sheet.rowCount}
                                            </span>
                                            {onBuildQuery && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onBuildQuery(sheet.name);
                                                    }}
                                                    className="hidden group-hover:inline-flex px-1.5 py-0.5 text-3xs bg-accent-teal/15 text-accent-teal rounded hover:bg-accent-teal/25 transition-colors"
                                                    title="Build query for this table"
                                                >
                                                    Query
                                                </button>
                                            )}
                                        </div>

                                        {/* Expanded: column list */}
                                        {isExpanded && (
                                            <div className="ml-7 mt-0.5 mb-1 space-y-0.5">
                                                {sheet.columns.map((col) => (
                                                    <button
                                                        key={col.name}
                                                        onClick={() => onInsertColumnRef?.(`${sheet.name}.${col.name}`)}
                                                        className="flex items-center gap-1.5 w-full px-2 py-1 rounded text-left hover:bg-dark-elevated/30 transition-colors"
                                                        title={`Insert ${sheet.name}.${col.name}`}
                                                    >
                                                        <Columns3 className="w-3 h-3 text-text-muted" />
                                                        <span className="text-3xs text-text-secondary truncate">{col.name}</span>
                                                        <span className="text-3xs text-text-muted ml-auto">{col.type}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
