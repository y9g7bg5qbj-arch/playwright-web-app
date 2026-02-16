/**
 * Custom hook for query generator state and handlers.
 *
 * Extracted from TestDataPage to isolate the query builder logic
 * (draft management, distinct-value loading, preview computation, filter application).
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { testDataApi } from '@/api/testData';
import type { AGGridDataTableHandle } from './AGGridDataTable';
import type { DataSheet, DataRow, PendingQueryApply } from './testDataTypes';
import { mapColumnType } from './testDataUtils';
import {
    ANY_VALUE,
    buildDistinctValueMap,
    buildFilterModelFromAnswers,
    buildRuntimeQueryFromAnswers,
    createInitialQueryDraft,
    filterRowsByAnswers,
    validateTopLastRequirements,
    type CellQueryPayload,
    type QueryGeneratorDraft,
    type QueryGeneratorTable,
    type QueryResultControl,
    type QueryRowLike,
} from './canvas-v2/queryGeneratorUtils';
import type { GuidedColumn } from './canvas-v2';

interface UseQueryGeneratorParams {
    sheets: DataSheet[];
    rows: DataRow[];
    selectedSheetId: string | null;
    setSelectedSheetId: (id: string | null) => void;
    loadingRows: boolean;
    gridHandleRef: React.MutableRefObject<AGGridDataTableHandle | null>;
    showError: (message: string) => void;
    showSuccess: (message: string) => void;
}

export interface QueryGeneratorState {
    // Query tables
    queryTables: QueryGeneratorTable[];
    selectedQueryTable: QueryGeneratorTable | null;

    // Modal state
    showQueryGeneratorModal: boolean;
    setShowQueryGeneratorModal: (show: boolean) => void;
    queryModalMode: 'builder' | 'cell';

    // Draft
    queryDraft: QueryGeneratorDraft;

    // Distinct values
    queryDistinctValueMap: Record<string, string[]>;
    queryValuesLoading: boolean;

    // Preview / applied state
    queryValidationError: string | null;
    queryWarnings: string[];
    queryMatchCount: number | null;
    queryShape: 'ROW' | 'ROWS';
    generatedRuntimeQuery: string;
    queryPreview: {
        snippet: string;
        shape: 'ROW' | 'ROWS';
        warnings: string[];
        matchCount: number | null;
        validationError: string | null;
    };
    queryStatusLabel: string | undefined;
    cellQueryPayload: CellQueryPayload | null;

    // Filter state
    currentFilterState: Record<string, unknown>;
    setCurrentFilterState: (state: Record<string, unknown>) => void;
    externalFilterState: Record<string, unknown> | undefined;
    filteredRowCount: number;
    setFilteredRowCount: (count: number) => void;
    lastAppliedMatchCount: number | null;
    selectedRowCount: number;
    setSelectedRowCount: (count: number) => void;

    // Handlers
    handleOpenQueryGenerator: () => void;
    handleQueryTableChange: (tableId: string) => void;
    handleQueryAnswerChange: (columnName: string, value: string) => void;
    handleQueryResultControlChange: (resultControl: QueryResultControl) => void;
    handleQuerySortColumnChange: (sortColumn: string) => void;
    handleQuerySortDirectionChange: (sortDirection: 'asc' | 'desc') => void;
    handleQueryLimitChange: (limit: number) => void;
    handleApplyQueryFilters: () => Promise<void>;
    handleCopyGeneratedQuery: () => Promise<void>;
    handleCellQueryGenerated: (payload: CellQueryPayload | null) => void;
    handleUseCellAsBuilder: () => void;
    handleGridFilterStateChanged: (filterState: Record<string, unknown>) => void;
    applyFilterModelToGrid: (model: Record<string, unknown>) => void;
}

export function useQueryGenerator({
    sheets,
    rows,
    selectedSheetId,
    setSelectedSheetId,
    loadingRows,
    gridHandleRef,
    showError,
    showSuccess,
}: UseQueryGeneratorParams): QueryGeneratorState {
    // Canvas v2 state
    const [showQueryGeneratorModal, setShowQueryGeneratorModal] = useState(false);
    const [queryModalMode, setQueryModalMode] = useState<'builder' | 'cell'>('builder');
    const [queryDraft, setQueryDraft] = useState<QueryGeneratorDraft>(createInitialQueryDraft('', []));
    const [queryRowsCache, setQueryRowsCache] = useState<Record<string, QueryRowLike[]>>({});
    const [queryDistinctValueMap, setQueryDistinctValueMap] = useState<Record<string, string[]>>({});
    const [queryValuesLoading, setQueryValuesLoading] = useState(false);
    const [queryValidationError, setQueryValidationError] = useState<string | null>(null);
    const [queryWarnings, setQueryWarnings] = useState<string[]>([]);
    const [queryMatchCount, setQueryMatchCount] = useState<number | null>(null);
    const [queryShape, setQueryShape] = useState<'ROW' | 'ROWS'>('ROWS');
    const [generatedRuntimeQuery, setGeneratedRuntimeQuery] = useState('');
    const [cellQueryPayload, setCellQueryPayload] = useState<CellQueryPayload | null>(null);
    const [pendingQueryApply, setPendingQueryApply] = useState<PendingQueryApply | null>(null);

    // Filter state (driven by grid + query generator)
    const [currentFilterState, setCurrentFilterState] = useState<Record<string, unknown>>({});
    const [externalFilterState, setExternalFilterState] = useState<Record<string, unknown> | undefined>(undefined);
    const [filteredRowCount, setFilteredRowCount] = useState(0);
    const [lastAppliedMatchCount, setLastAppliedMatchCount] = useState<number | null>(null);
    const [selectedRowCount, setSelectedRowCount] = useState(0);

    // Derived: queryTables
    const queryTables = useMemo<QueryGeneratorTable[]>(() => {
        const sheetsById = new Map(sheets.map((sheet) => [sheet.id, sheet]));
        const sheetsByName = new Map(sheets.map((sheet) => [sheet.name.toLowerCase(), sheet]));

        return sheets.map((sheet) => ({
            id: sheet.id,
            name: sheet.name,
            columns: sheet.columns.map((column) => {
                const mappedType = mapColumnType(column.type);
                const guidedColumn: GuidedColumn = {
                    name: column.name,
                    type: mappedType,
                };

                if (mappedType === 'reference' && column.referenceConfig) {
                    const rawTarget = column.referenceConfig.targetSheet;
                    const targetSheet =
                        sheetsById.get(rawTarget) ||
                        sheetsByName.get(rawTarget.toLowerCase());
                    const targetColumns: GuidedColumn[] = (targetSheet?.columns || []).map((targetColumn) => ({
                        name: targetColumn.name,
                        type: mapColumnType(targetColumn.type),
                    }));

                    guidedColumn.reference = {
                        targetSheetId: targetSheet?.id || rawTarget,
                        targetSheetName: targetSheet?.name || rawTarget,
                        targetColumn: column.referenceConfig.targetColumn,
                        displayColumn: column.referenceConfig.displayColumn,
                        allowMultiple: column.referenceConfig.allowMultiple,
                        separator: column.referenceConfig.separator,
                        targetColumns,
                    };
                }

                return guidedColumn;
            }),
        }));
    }, [sheets]);

    const selectedQueryTable = useMemo(() => {
        if (queryDraft.tableId) {
            const explicit = queryTables.find((table) => table.id === queryDraft.tableId);
            if (explicit) {
                return explicit;
            }
        }
        if (selectedSheetId) {
            const active = queryTables.find((table) => table.id === selectedSheetId);
            if (active) {
                return active;
            }
        }
        return queryTables[0] || null;
    }, [queryDraft.tableId, queryTables, selectedSheetId]);

    const syncDraftToTable = useCallback((table: QueryGeneratorTable, keepAnswers: boolean, previous: QueryGeneratorDraft) => {
        const base = createInitialQueryDraft(table.id, table.columns);
        const nextAnswers: Record<string, string> = {};
        table.columns.forEach((column) => {
            if (keepAnswers) {
                nextAnswers[column.name] = previous.answers[column.name] ?? ANY_VALUE;
            } else {
                nextAnswers[column.name] = ANY_VALUE;
            }
        });

        return {
            ...base,
            answers: nextAnswers,
            resultControl: previous.resultControl,
            sortColumn: table.columns.some((column) => column.name === previous.sortColumn) ? previous.sortColumn : '',
            sortDirection: previous.sortDirection,
            limit: previous.limit,
        };
    }, []);

    // Sync draft when selected table changes
    useEffect(() => {
        if (!selectedQueryTable) {
            return;
        }

        setQueryDraft((prev) => {
            if (!prev.tableId || prev.tableId !== selectedQueryTable.id) {
                return syncDraftToTable(selectedQueryTable, false, prev);
            }
            return syncDraftToTable(selectedQueryTable, true, prev);
        });
    }, [selectedQueryTable, syncDraftToTable]);

    // Keep query rows cache in sync with current rows
    useEffect(() => {
        if (!selectedSheetId) {
            return;
        }

        const normalizedRows = rows.map((row) => ({
            id: row.id,
            data: (row.data as Record<string, unknown>) || {},
        }));
        setQueryRowsCache((prev) => ({
            ...prev,
            [selectedSheetId]: normalizedRows,
        }));
    }, [rows, selectedSheetId]);

    const loadTableRowsForQuery = useCallback(async (tableId: string) => {
        const cachedRows = queryRowsCache[tableId];
        if (cachedRows) {
            return cachedRows;
        }

        const remoteRows = await testDataApi.listRows(tableId);
        const normalizedRows = remoteRows.map((row) => ({
            id: row.id,
            data: (row.data as Record<string, unknown>) || {},
        }));
        setQueryRowsCache((prev) => ({
            ...prev,
            [tableId]: normalizedRows,
        }));
        return normalizedRows;
    }, [queryRowsCache]);

    // Load distinct values when query modal opens in builder mode
    useEffect(() => {
        if (!showQueryGeneratorModal || queryModalMode !== 'builder' || !selectedQueryTable) {
            return;
        }

        let cancelled = false;
        const loadDistinctValues = async () => {
            const cachedRows = queryRowsCache[selectedQueryTable.id];
            if (cachedRows) {
                setQueryDistinctValueMap(buildDistinctValueMap(cachedRows, selectedQueryTable.columns));
                setQueryValuesLoading(false);
                return;
            }

            setQueryValuesLoading(true);
            try {
                const tableRows = await loadTableRowsForQuery(selectedQueryTable.id);
                if (!cancelled) {
                    setQueryDistinctValueMap(buildDistinctValueMap(tableRows, selectedQueryTable.columns));
                }
            } catch (error) {
                if (!cancelled) {
                    setQueryDistinctValueMap({});
                }
            } finally {
                if (!cancelled) {
                    setQueryValuesLoading(false);
                }
            }
        };

        void loadDistinctValues();

        return () => {
            cancelled = true;
        };
    }, [loadTableRowsForQuery, queryModalMode, queryRowsCache, selectedQueryTable, showQueryGeneratorModal]);

    // Query preview (live computation)
    const queryPreview = useMemo(() => {
        if (!selectedQueryTable) {
            return {
                snippet: '',
                shape: 'ROWS' as const,
                warnings: [] as string[],
                matchCount: null as number | null,
                validationError: null as string | null,
            };
        }

        const validationError = validateTopLastRequirements(queryDraft, selectedQueryTable.columns);
        const filterResult = buildFilterModelFromAnswers(queryDraft.answers, selectedQueryTable.columns);
        const scopedRows = queryRowsCache[selectedQueryTable.id];
        const matchCount = scopedRows ? filterRowsByAnswers(scopedRows, selectedQueryTable.columns, queryDraft.answers).length : null;
        const runtimeResult = buildRuntimeQueryFromAnswers({
            tableName: selectedQueryTable.name,
            columns: selectedQueryTable.columns,
            answers: queryDraft.answers,
            resultControl: queryDraft.resultControl,
            sortColumn: queryDraft.sortColumn,
            sortDirection: queryDraft.sortDirection,
            limit: queryDraft.limit,
            matchCount,
        });

        return {
            snippet: runtimeResult.snippet,
            shape: runtimeResult.shape,
            warnings: Array.from(new Set([...filterResult.warnings, ...runtimeResult.warnings])),
            matchCount,
            validationError,
        };
    }, [queryDraft, queryRowsCache, selectedQueryTable]);

    const queryStatusLabel = useMemo(() => {
        if (!generatedRuntimeQuery.trim()) {
            return undefined;
        }
        const effectiveMatchCount = lastAppliedMatchCount ?? queryMatchCount;
        const matchText = effectiveMatchCount === null ? 'matches ?' : `matches ${effectiveMatchCount}`;
        return `${queryShape} • ${matchText}`;
    }, [generatedRuntimeQuery, lastAppliedMatchCount, queryMatchCount, queryShape]);

    const applyFilterModelToGrid = useCallback((model: Record<string, unknown>) => {
        setExternalFilterState(model);
        setCurrentFilterState(model);
        gridHandleRef.current?.clearExternalRowScope();
        gridHandleRef.current?.setQuickSearch('');
        gridHandleRef.current?.applyFilterModel(model);
        setTimeout(() => {
            const nextMatchCount = gridHandleRef.current?.getFilteredRowIds().length ?? 0;
            setFilteredRowCount(nextMatchCount);
            setLastAppliedMatchCount(nextMatchCount);
        }, 0);
    }, [gridHandleRef]);

    // Apply pending filter when switching sheets
    useEffect(() => {
        if (!pendingQueryApply) {
            return;
        }
        if (selectedSheetId !== pendingQueryApply.tableId || loadingRows) {
            return;
        }
        applyFilterModelToGrid(pendingQueryApply.model);
        setPendingQueryApply(null);
    }, [applyFilterModelToGrid, loadingRows, pendingQueryApply, selectedSheetId]);

    // Handlers
    const handleOpenQueryGenerator = useCallback(() => {
        const activeTable = (selectedSheetId
            ? queryTables.find((table) => table.id === selectedSheetId)
            : null) || selectedQueryTable;
        if (!activeTable) {
            return;
        }

        setQueryDraft((prev) => syncDraftToTable(activeTable, prev.tableId === activeTable.id, prev));
        setQueryValidationError(null);
        setQueryWarnings([]);
        setQueryModalMode('builder');
        setCellQueryPayload(null);
        setShowQueryGeneratorModal(true);
    }, [queryTables, selectedQueryTable, selectedSheetId, syncDraftToTable]);

    const handleQueryTableChange = useCallback((tableId: string) => {
        const table = queryTables.find((entry) => entry.id === tableId);
        if (!table) {
            return;
        }
        setQueryValidationError(null);
        setQueryWarnings([]);
        setQueryDraft((prev) => syncDraftToTable(table, prev.tableId === table.id, prev));
    }, [queryTables, syncDraftToTable]);

    const handleQueryAnswerChange = useCallback((columnName: string, value: string) => {
        setQueryValidationError(null);
        setQueryWarnings([]);
        setQueryDraft((prev) => ({
            ...prev,
            answers: {
                ...prev.answers,
                [columnName]: value,
            },
        }));
    }, []);

    const handleQueryResultControlChange = useCallback((resultControl: QueryResultControl) => {
        setQueryValidationError(null);
        setQueryWarnings([]);
        setQueryDraft((prev) => ({
            ...prev,
            resultControl,
        }));
    }, []);

    const handleQuerySortColumnChange = useCallback((sortColumn: string) => {
        setQueryValidationError(null);
        setQueryWarnings([]);
        setQueryDraft((prev) => ({
            ...prev,
            sortColumn,
        }));
    }, []);

    const handleQuerySortDirectionChange = useCallback((sortDirection: 'asc' | 'desc') => {
        setQueryWarnings([]);
        setQueryDraft((prev) => ({
            ...prev,
            sortDirection,
        }));
    }, []);

    const handleQueryLimitChange = useCallback((limit: number) => {
        setQueryWarnings([]);
        setQueryDraft((prev) => ({
            ...prev,
            limit,
        }));
    }, []);

    const handleApplyQueryFilters = useCallback(async () => {
        if (!selectedQueryTable) {
            return;
        }

        const validationError = validateTopLastRequirements(queryDraft, selectedQueryTable.columns);
        if (validationError) {
            setQueryValidationError(validationError);
            return;
        }

        let sourceRows = queryRowsCache[selectedQueryTable.id];
        if (!sourceRows) {
            try {
                sourceRows = await loadTableRowsForQuery(selectedQueryTable.id);
            } catch (error) {
                showError('Failed to load table rows for query generation');
                return;
            }
        }

        const filterResult = buildFilterModelFromAnswers(queryDraft.answers, selectedQueryTable.columns);
        const matches = filterRowsByAnswers(sourceRows, selectedQueryTable.columns, queryDraft.answers);
        const inferredMatchCount = matches.length;
        const runtimeResult = buildRuntimeQueryFromAnswers({
            tableName: selectedQueryTable.name,
            columns: selectedQueryTable.columns,
            answers: queryDraft.answers,
            resultControl: queryDraft.resultControl,
            sortColumn: queryDraft.sortColumn,
            sortDirection: queryDraft.sortDirection,
            limit: queryDraft.limit,
            matchCount: inferredMatchCount,
        });
        const combinedWarnings = Array.from(new Set([...filterResult.warnings, ...runtimeResult.warnings]));

        setQueryValidationError(null);
        setQueryWarnings(combinedWarnings);
        setQueryMatchCount(inferredMatchCount);
        setQueryShape(runtimeResult.shape);
        setGeneratedRuntimeQuery(runtimeResult.snippet);
        setLastAppliedMatchCount(inferredMatchCount);

        if (selectedSheetId === selectedQueryTable.id) {
            applyFilterModelToGrid(filterResult.model as Record<string, unknown>);
            return;
        }

        setPendingQueryApply({
            tableId: selectedQueryTable.id,
            model: filterResult.model as Record<string, unknown>,
        });
        setSelectedSheetId(selectedQueryTable.id);
    }, [applyFilterModelToGrid, loadTableRowsForQuery, queryDraft, queryRowsCache, selectedQueryTable, selectedSheetId, setSelectedSheetId, showError]);

    const handleCopyGeneratedQuery = useCallback(async () => {
        const queryToCopy = queryModalMode === 'cell'
            ? (cellQueryPayload?.query || '')
            : queryPreview.snippet;
        if (!queryToCopy.trim()) {
            showError('No query available to copy');
            return;
        }

        try {
            await navigator.clipboard.writeText(queryToCopy);
            showSuccess('Query copied');
        } catch (error) {
            showError('Failed to copy query');
        }
    }, [cellQueryPayload, queryModalMode, queryPreview.snippet, showError, showSuccess]);

    const handleCellQueryGenerated = useCallback((payload: CellQueryPayload | null) => {
        if (!payload) {
            return;
        }

        setCellQueryPayload(payload);
        setQueryModalMode('cell');
        setShowQueryGeneratorModal(true);
        setGeneratedRuntimeQuery(payload.query);
        setQueryShape('ROW');
        setQueryMatchCount(1);

        const table = payload.tableId
            ? queryTables.find((entry) => entry.id === payload.tableId)
            : queryTables.find((entry) => entry.name === payload.tableName);
        if (!table) {
            return;
        }

        setQueryDraft((prev) => {
            const nextDraft = syncDraftToTable(table, false, prev);
            if (nextDraft.answers[payload.column] !== undefined) {
                nextDraft.answers[payload.column] = payload.prefillAnswerValue || ANY_VALUE;
            }
            nextDraft.resultControl = 'first';
            return nextDraft;
        });
    }, [queryTables, syncDraftToTable]);

    const handleUseCellAsBuilder = useCallback(() => {
        if (!cellQueryPayload) {
            setQueryModalMode('builder');
            return;
        }

        const table = cellQueryPayload.tableId
            ? queryTables.find((entry) => entry.id === cellQueryPayload.tableId)
            : queryTables.find((entry) => entry.name === cellQueryPayload.tableName);
        if (table) {
            setQueryDraft((prev) => {
                const nextDraft = syncDraftToTable(table, false, prev);
                if (nextDraft.answers[cellQueryPayload.column] !== undefined) {
                    nextDraft.answers[cellQueryPayload.column] = cellQueryPayload.prefillAnswerValue || ANY_VALUE;
                }
                nextDraft.resultControl = 'first';
                return nextDraft;
            });
        }

        setQueryModalMode('builder');
    }, [cellQueryPayload, queryTables, syncDraftToTable]);

    const handleGridFilterStateChanged = (filterState: Record<string, unknown>) => {
        setCurrentFilterState(filterState);
        setFilteredRowCount(gridHandleRef.current?.getFilteredRowIds().length || 0);
    };

    return {
        queryTables,
        selectedQueryTable,

        showQueryGeneratorModal,
        setShowQueryGeneratorModal,
        queryModalMode,

        queryDraft,

        queryDistinctValueMap,
        queryValuesLoading,

        queryValidationError,
        queryWarnings,
        queryMatchCount,
        queryShape,
        generatedRuntimeQuery,
        queryPreview,
        queryStatusLabel,
        cellQueryPayload,

        currentFilterState,
        setCurrentFilterState,
        externalFilterState,
        filteredRowCount,
        setFilteredRowCount,
        lastAppliedMatchCount,
        selectedRowCount,
        setSelectedRowCount,

        handleOpenQueryGenerator,
        handleQueryTableChange,
        handleQueryAnswerChange,
        handleQueryResultControlChange,
        handleQuerySortColumnChange,
        handleQuerySortDirectionChange,
        handleQueryLimitChange,
        handleApplyQueryFilters,
        handleCopyGeneratedQuery,
        handleCellQueryGenerated,
        handleUseCellAsBuilder,
        handleGridFilterStateChanged,
        applyFilterModelToGrid,
    };
}
