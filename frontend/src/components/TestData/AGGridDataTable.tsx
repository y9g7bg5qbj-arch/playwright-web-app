// design-lint-ignore NO_HARDCODED_MODAL — inline confirmation/rename dialogs within AG Grid data table; not standalone modals
/**
 * AG Grid Data Table Component
 *
 * Excel-like spreadsheet for test data management with:
 * - Cell editing with type-aware inputs
 * - Copy/paste support (Excel/CSV format)
 * - Keyboard navigation
 * - Row selection and bulk operations
 * - Column type support: text, number, boolean, date
 */

import { forwardRef, useState, useCallback, useMemo, useRef, useEffect, useImperativeHandle } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
    ColDef,
    GridReadyEvent,
    CellValueChangedEvent,
    SelectionChangedEvent,
    GetRowIdParams,
    ProcessDataFromClipboardParams,
    FilterChangedEvent,
    ModuleRegistry,
    AllCommunityModule,
} from 'ag-grid-community';
import { Plus, Trash2, Copy, Filter, Check, Code, MousePointer, BarChart3, Hash, Calculator, TrendingUp, TrendingDown, Sigma, Search, X, AlertCircle, CopyPlus, Wand2, Edit3, Pin, PinOff, Eye, EyeOff, ChevronDown, Columns3, Palette, ArrowUpDown, Layers, Zap, FileDown, FileUp, LayoutGrid, Undo2, Redo2, Type, LetterText } from 'lucide-react';
// Note: Download/Upload icons replaced with FileDown/FileUp for clearer semantics
import { IconButton, EmptyState } from '@/components/ui';
import { DataGeneratorModal } from './DataGeneratorModal';
import { BulkUpdateModal, type BulkUpdate } from './BulkUpdateModal';
import { CellFormattingModal } from './CellFormattingModal';
import { MultiSortModal, type SortLevel } from './MultiSortModal';
import { DistinctValuesModal } from './DistinctValuesModal';
import { ConditionalFormattingModal } from './ConditionalFormattingModal';
import { ReferenceCellEditor } from './ReferenceCellEditor';
import { ReferenceCellRenderer } from './ReferenceCellRenderer';
import type { CellQueryPayload } from './canvas-v2/queryGeneratorUtils';
import { darkTheme, filterModelToVDQL } from './agGridFilterUtils';
import { validateValueAgainstColumn, type CellValidationResult } from './agGridValidation';
import { BooleanCellRenderer } from './BooleanCellRenderer';
import { DateCellEditor } from './DateCellEditor';
import { EditableHeaderComponent } from './EditableHeaderComponent';
import { useCellSelection } from './useCellSelection';
import { useCellFormatting } from './useCellFormatting';

export type { CellQueryPayload };

// Register AG Grid Community modules (required for v35+)
ModuleRegistry.registerModules([AllCommunityModule]);

// ============================================
// TYPES
// ============================================

export interface ReferenceConfig {
    targetSheet: string;       // "Drivers" - sheet ID or name
    targetColumn: string;      // "DriverID" - the ID column in target sheet
    displayColumn: string;     // "Name" - what to show in the cell
    allowMultiple: boolean;    // true for multi-select ($drivers, $vehicles)
    separator?: string;        // "," for parsing (default)
}

export interface DataColumn {
    name: string;
    type: 'text' | 'number' | 'boolean' | 'date' | 'formula' | 'reference';
    required?: boolean;
    width?: number;
    formula?: string; // For computed columns
    referenceConfig?: ReferenceConfig; // For reference columns
    validation?: {
        min?: number;
        max?: number;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        enum?: string[];
    };
    // Backward-compatible validation fields
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: string[];
}

export interface DataRow {
    id: string;
    data: Record<string, any>;
    order: number;
}

export interface AGGridDataTableProps {
    columns: DataColumn[];
    rows: DataRow[];
    tableId?: string;
    tableName: string;
    onCellChange: (rowId: string, columnName: string, value: any) => void;
    onRowAdd: () => Promise<void>;
    onRowDelete: (rowId: string) => Promise<void>;
    onRowsDelete: (rowIds: string[]) => Promise<void>;
    onColumnAdd: () => void;
    onColumnEdit?: (columnName: string) => void;
    onColumnRemove: (columnName: string) => void;
    onColumnRename: (oldName: string, newName: string) => void;
    onColumnTypeChange: (columnName: string, newType: DataColumn['type']) => void;
    onBulkPaste: (rows: Record<string, any>[]) => Promise<void>;
    onExportCSV: () => void;
    onImportCSV: () => void;
    onGenerateColumnData?: (columnName: string, values: (string | number | boolean)[]) => Promise<void>;
    onBulkUpdate?: (updates: BulkUpdate[]) => Promise<void>;
    onRowsDuplicate?: (rowIds: string[]) => Promise<void>;
    onFillSeries?: (
        rowIds: string[],
        columnId: string,
        fillType: 'value' | 'sequence' | 'pattern',
        options: { value?: string; startValue?: number; step?: number; pattern?: string }
    ) => Promise<void>;
    loading?: boolean;
    // Saved views: state capture callbacks
    onSortStateChanged?: (sortState: unknown[]) => void;
    onFilterStateChanged?: (filterState: Record<string, unknown>) => void;
    onColumnStateChanged?: (columnState: unknown) => void;
    // Saved views: externally-controlled state for view restoration
    externalSortState?: SortLevel[];
    externalFilterState?: Record<string, unknown>;
    externalColumnState?: unknown;
    // Canvas mode: embedded hides legacy AG Grid chrome (toolbar/footer)
    chromeMode?: 'full' | 'embedded';
    onSelectionCountChange?: (count: number) => void;
    onCellQueryGenerated?: (payload: CellQueryPayload | null) => void;
}

export interface AGGridDataTableHandle {
    applyFilterModel: (model: Record<string, unknown>) => void;
    clearFilterModel: () => void;
    setQuickSearch: (value: string) => void;
    applyExternalRowScope: (rowIds: string[] | null) => void;
    clearExternalRowScope: () => void;
    getFilterModel: () => Record<string, unknown>;
    getFilteredRowIds: () => string[];
    getSelectedRowIds: () => string[];
    getSelectedRowCount: () => number;
    openFindReplace: () => void;
    openBulkUpdate: () => void;
    openMultiSort: () => void;
    openConditionalFormatting: () => void;
    openColumnVisibility: () => void;
    openShortcutHelp: () => void;
    undo: () => void;
    redo: () => void;
    deleteSelectedRows: () => void;
    duplicateSelectedRows: () => void;
    freezeSelectedRows: () => void;
    unfreezeAllRows: () => void;
    unfreezeAllColumns: () => void;
    applyQuickFilterPreset: (preset: 'empty' | 'duplicates' | 'clear') => void;
    openFillColumn: (columnName?: string) => void;
    openDataGenerator: (columnName?: string) => void;
    getValidationIssueCount: () => number;
    getValidationHotspots: () => Array<{ column: string; count: number }>;
}

interface CanvasColumnViewState {
    agColumnState: unknown[];
    hiddenColumns: string[];
    frozenColumns: string[];
    frozenRowIds: string[];
}

export const AGGridDataTable = forwardRef<AGGridDataTableHandle, AGGridDataTableProps>(function AGGridDataTable({
    columns,
    rows,
    tableId,
    tableName,
    onCellChange,
    onRowAdd,
    onRowDelete,
    onRowsDelete,
    onColumnAdd,
    onColumnEdit,
    onColumnRemove,
    onColumnRename,
    onColumnTypeChange: _onColumnTypeChange,
    onBulkPaste,
    onExportCSV,
    onImportCSV,
    onGenerateColumnData,
    onBulkUpdate,
    onRowsDuplicate,
    onFillSeries,
    loading = false,
    // Saved views callbacks
    onSortStateChanged,
    onFilterStateChanged,
    onColumnStateChanged,
    externalSortState,
    externalFilterState,
    externalColumnState,
    chromeMode = 'full',
    onSelectionCountChange,
    onCellQueryGenerated,
}: AGGridDataTableProps, ref) {
    // Suppress unused variable warnings
    void _onColumnTypeChange;
    const isEmbedded = chromeMode === 'embedded';
    const gridRef = useRef<AgGridReact>(null);
    const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
    const [cellValidationError, setCellValidationError] = useState<string | null>(null);
    const [lastValidationErrorAt, setLastValidationErrorAt] = useState<number>(0);
    const [vdqlQuery, setVdqlQuery] = useState<string>('');
    const [hasActiveFilters, setHasActiveFilters] = useState(false);
    const isRevertingInvalidChangeRef = useRef(false);

    // Quick filter state
    const [quickSearch, setQuickSearch] = useState<string>('');
    const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);

    // Data generator modal state
    const [showGeneratorModal, setShowGeneratorModal] = useState(false);
    const [generatorColumn, setGeneratorColumn] = useState<string | null>(null);

    // Bulk update modal state
    const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
    const [filteredRowIds, setFilteredRowIds] = useState<string[]>([]);
    const [externalRowScopeIds, setExternalRowScopeIds] = useState<Set<string> | null>(null);

    // Column visibility and freeze state
    const [frozenColumns, setFrozenColumns] = useState<string[]>([]);
    const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);
    const columnDropdownRef = useRef<HTMLDivElement>(null);

    // Row freeze state (pinned to top)
    const [frozenRowIds, setFrozenRowIds] = useState<string[]>([]);

    // Toolbar dropdown states
    const [showDataDropdown, setShowDataDropdown] = useState(false);
    const [showViewDropdown, setShowViewDropdown] = useState(false);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const dataDropdownRef = useRef<HTMLDivElement>(null);
    const viewDropdownRef = useRef<HTMLDivElement>(null);
    const filterDropdownRef = useRef<HTMLDivElement>(null);

    // Fill column modal state
    const [showFillColumnModal, setShowFillColumnModal] = useState(false);
    const [fillColumnName, setFillColumnName] = useState<string | null>(null);
    const [fillType, setFillType] = useState<'value' | 'sequence' | 'pattern'>('value');
    const [fillValue, setFillValue] = useState('');
    const [fillStartValue, setFillStartValue] = useState('1');
    const [fillStepValue, setFillStepValue] = useState('1');
    const [fillPattern, setFillPattern] = useState('{n}');
    const [fillError, setFillError] = useState<string | null>(null);

    // Find & Replace modal state
    const [showFindReplaceModal, setShowFindReplaceModal] = useState(false);
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [findInColumn, setFindInColumn] = useState<string>('__all__');
    const [matchCase, setMatchCase] = useState(false);
    const [matchWholeCell, setMatchWholeCell] = useState(false);
    const [findResults, setFindResults] = useState<{ rowId: string; column: string; value: string }[]>([]);

    // Undo/Redo history
    interface HistoryEntry {
        rowId: string;
        column: string;
        oldValue: any;
        newValue: any;
        timestamp: number;
    }
    const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
    const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);
    const MAX_HISTORY = 50;

    // Multi-column sorting state
    const [sortLevels, setSortLevels] = useState<SortLevel[]>([]);
    const [showSortModal, setShowSortModal] = useState(false);

    // Distinct values modal state
    const [showDistinctModal, setShowDistinctModal] = useState(false);

    const [showShortcutHelp, setShowShortcutHelp] = useState(false);

    const fillPreviewValues = useMemo(() => {
        const start = Number(fillStartValue);
        const step = Number(fillStepValue);
        if (!Number.isFinite(start) || !Number.isFinite(step)) {
            return [];
        }

        return [0, 1, 2].map((index) => {
            if (fillType === 'value') {
                return fillValue;
            }
            if (fillType === 'sequence') {
                return String(start + (index * step));
            }
            return (fillPattern || '{n}').replace(/\{n\}/g, String(start + (index * step)));
        });
    }, [fillPattern, fillStartValue, fillStepValue, fillType, fillValue]);

    const buildColumnViewState = useCallback((): CanvasColumnViewState => ({
        agColumnState: (gridRef.current?.api.getColumnState() as unknown[]) || [],
        hiddenColumns: [...hiddenColumns],
        frozenColumns: [...frozenColumns],
        frozenRowIds: [...frozenRowIds],
    }), [frozenColumns, frozenRowIds, hiddenColumns]);

    const emitColumnViewState = useCallback(() => {
        onColumnStateChanged?.(buildColumnViewState());
    }, [buildColumnViewState, onColumnStateChanged]);

    const visibleRows = useMemo(() => {
        if (!externalRowScopeIds) {
            return rows;
        }
        return rows.filter((row) => externalRowScopeIds.has(row.id));
    }, [externalRowScopeIds, rows]);

    // Cell selection hook
    const {
        selectedCells,
        cellSelectionQuery,
        columnSummary,
        onCellClicked,
        handleClearCellSelection,
        handleCopyCellQuery,
        setCopied,
        copied,
    } = useCellSelection({
        columns,
        visibleRows,
        tableName,
        tableId,
        onCellQueryGenerated,
    });

    // Cell formatting hook
    const {
        cellFormats,
        showFormattingModal,
        setShowFormattingModal,
        formattingTarget,
        setFormattingTarget,
        handleOpenFormattingModal,
        handleApplyCellFormat,
        handleClearCellFormat,
        conditionalRules,
        setConditionalRules,
        showConditionalModal,
        setShowConditionalModal,
    } = useCellFormatting({
        visibleRows,
    });

    // Convert rows to AG Grid format - separate frozen and regular rows
    const { rowData, pinnedTopRowData } = useMemo(() => {
        const allData = visibleRows.map((row) => {
            if (!row.data) {
                console.warn('[AGGrid] Row has null/undefined data:', row.id);
            }
            const data = row.data || {};
            return {
                _id: row.id,
                _order: row.order,
                ...data,
            };
        });

        // Diagnostic: check for column name mismatches
        if (allData.length > 0 && columns.length > 0) {
            const sampleRow = allData[0];
            const rowKeys = new Set(Object.keys(sampleRow).filter(k => !k.startsWith('_')));
            const missingColumns = columns.filter(col => !rowKeys.has(col.name));
            if (missingColumns.length > 0) {
                console.warn('[AGGrid] Column names not found in row data:', missingColumns.map(c => c.name));
            }
        }

        // Separate frozen rows (pinned to top) from regular rows
        const frozen = allData.filter(row => frozenRowIds.includes(row._id));
        const regular = allData.filter(row => !frozenRowIds.includes(row._id));

        return { rowData: regular, pinnedTopRowData: frozen };
    }, [visibleRows, columns, frozenRowIds]);

    const legacyInvalidCellMap = useMemo(() => {
        const result = new Map<string, CellValidationResult>();
        for (const row of visibleRows) {
            for (const column of columns) {
                const value = row.data?.[column.name];
                const validation = validateValueAgainstColumn(column, value);
                if (!validation.valid) {
                    result.set(`${row.id}:${column.name}`, validation);
                }
            }
        }
        return result;
    }, [columns, visibleRows]);

    const validationHotspots = useMemo(() => {
        const counts = new Map<string, number>();
        for (const key of legacyInvalidCellMap.keys()) {
            const [, columnName] = key.split(':');
            counts.set(columnName, (counts.get(columnName) || 0) + 1);
        }
        return [...counts.entries()]
            .map(([column, count]) => ({ column, count }))
            .sort((a, b) => b.count - a.count);
    }, [legacyInvalidCellMap]);

    // Generate column definitions
    const columnDefs = useMemo((): ColDef[] => {
        const defs: ColDef[] = [
            // Row number column
            {
                headerName: '#',
                field: '_order',
                width: 60,
                editable: false,
                sortable: false,
                filter: false,
                resizable: false,
                pinned: 'left',
                cellClass: 'text-text-secondary text-xs',
                valueGetter: (params) => (params.node?.rowIndex ?? 0) + 1,
            },
        ];

        // Data columns - filter out hidden columns and apply freeze state
        columns
            .filter(col => !hiddenColumns.includes(col.name))
            .forEach((col) => {
                const isFrozen = frozenColumns.includes(col.name);
                const colDef: ColDef = {
                    headerName: col.name,
                    headerComponent: EditableHeaderComponent,
                    headerComponentParams: {
                        onRename: onColumnRename,
                        onEdit: onColumnEdit,
                        onRemove: onColumnRemove,
                        existingColumnNames: columns.map(c => c.name),
                    },
                    field: col.name,
                    editable: col.type !== 'boolean', // Boolean uses custom renderer with checkbox
                    resizable: true,
                    sortable: true,
                    filter: true,
                    minWidth: 100,
                    flex: isFrozen ? undefined : 1, // Don't use flex for pinned columns
                    width: isFrozen ? 150 : undefined,
                    pinned: isFrozen ? 'left' : undefined,
                    // Note: mainMenuItems removed — requires AG Grid Enterprise ColumnMenuModule
                    // Edit/Delete actions are provided via the custom header component menu instead
                    // Apply cell formatting (direct formats take priority over conditional)
                    cellStyle: (params) => {
                        const rowId = params.data?._id;
                        if (!rowId) return null;

                        const style: Record<string, string> = {};

                        // First check conditional formatting rules (applied in order)
                        for (const rule of conditionalRules) {
                            if (!rule.enabled || rule.column !== col.name) continue;

                            const cellValue = params.value;
                            const stringValue = cellValue === null || cellValue === undefined ? '' : String(cellValue);
                            let matches = false;

                            switch (rule.operator) {
                                case 'equals':
                                    matches = stringValue === rule.value;
                                    break;
                                case 'notEquals':
                                    matches = stringValue !== rule.value;
                                    break;
                                case 'contains':
                                    matches = stringValue.toLowerCase().includes(rule.value.toLowerCase());
                                    break;
                                case 'notContains':
                                    matches = !stringValue.toLowerCase().includes(rule.value.toLowerCase());
                                    break;
                                case 'startsWith':
                                    matches = stringValue.toLowerCase().startsWith(rule.value.toLowerCase());
                                    break;
                                case 'endsWith':
                                    matches = stringValue.toLowerCase().endsWith(rule.value.toLowerCase());
                                    break;
                                case 'greaterThan':
                                    matches = parseFloat(stringValue) > parseFloat(rule.value);
                                    break;
                                case 'lessThan':
                                    matches = parseFloat(stringValue) < parseFloat(rule.value);
                                    break;
                                case 'isEmpty':
                                    matches = stringValue === '';
                                    break;
                                case 'isNotEmpty':
                                    matches = stringValue !== '';
                                    break;
                            }

                            if (matches && rule.format) {
                                if (rule.format.backgroundColor && rule.format.backgroundColor !== 'transparent') {
                                    style.backgroundColor = rule.format.backgroundColor;
                                }
                                if (rule.format.textColor) {
                                    style.color = rule.format.textColor;
                                }
                                if (rule.format.fontWeight) {
                                    style.fontWeight = rule.format.fontWeight;
                                }
                                if (rule.format.textAlign) {
                                    style.textAlign = rule.format.textAlign;
                                }
                                break; // First matching rule wins
                            }
                        }

                        // Then check direct cell formatting (overrides conditional)
                        const formatKey = `${rowId}:${col.name}`;
                        const directFormat = cellFormats[formatKey];
                        if (directFormat) {
                            if (directFormat.backgroundColor && directFormat.backgroundColor !== 'transparent') {
                                style.backgroundColor = directFormat.backgroundColor;
                            }
                            if (directFormat.textColor) {
                                style.color = directFormat.textColor;
                            }
                            if (directFormat.fontWeight) {
                                style.fontWeight = directFormat.fontWeight;
                            }
                            if (directFormat.textAlign) {
                                style.textAlign = directFormat.textAlign;
                            }
                        }

                        // Legacy invalid values remain visible but flagged until corrected.
                        const legacyIssue = legacyInvalidCellMap.get(formatKey);
                        if (legacyIssue) {
                            style.boxShadow = 'inset 0 0 0 1px rgba(250, 173, 20, 0.85)';
                            style.backgroundImage = 'linear-gradient(to top, rgba(250, 173, 20, 0.08), rgba(250, 173, 20, 0.08))';
                        }

                        return Object.keys(style).length > 0 ? style : null;
                    },
                };

                // Type-specific configurations
                switch (col.type) {
                    case 'number':
                        colDef.cellEditor = 'agNumberCellEditor';
                        colDef.cellClass = 'text-right';
                        colDef.valueParser = (params) => {
                            const value = params.newValue;
                            return value === '' || value === null ? null : Number(value);
                        };
                        break;
                    case 'boolean':
                        colDef.cellRenderer = BooleanCellRenderer;
                        colDef.cellClass = 'flex items-center justify-center';
                        colDef.editable = false;
                        break;
                    case 'date':
                        colDef.cellEditor = DateCellEditor;
                        colDef.valueFormatter = (params) => {
                            if (!params.value) return '';
                            const date = new Date(params.value);
                            return date.toLocaleDateString();
                        };
                        break;
                    case 'reference':
                        if (col.referenceConfig) {
                            // Custom renderer shows resolved names
                            colDef.cellRenderer = (params: any) => (
                                <ReferenceCellRenderer
                                    value={params.value}
                                    referenceConfig={col.referenceConfig!}
                                />
                            );
                            // Custom editor opens multi-select modal
                            colDef.cellEditor = ReferenceCellEditor;
                            colDef.cellEditorParams = {
                                referenceConfig: col.referenceConfig,
                                // Pass direct save callback since AG Grid popup tracking 
                                // doesn't work with fixed-position modals
                                onSave: (rowId: string, newValue: string) => {
                                    onCellChange(rowId, col.name, newValue);
                                },
                            };
                            colDef.cellEditorPopup = true;
                            colDef.cellEditorPopupPosition = 'under';
                        }
                        break;
                    default: // text
                        colDef.cellEditor = 'agTextCellEditor';
                        break;
                }

                defs.push(colDef);
            });

        // Actions column
        defs.push({
            headerName: '',
            field: '_actions',
            width: 50,
            editable: false,
            sortable: false,
            filter: false,
            resizable: false,
            pinned: 'right',
            cellRenderer: (params: any) => (
                <IconButton
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    size="sm"
                    variant="ghost"
                    tone="danger"
                    tooltip="Delete row"
                    onClick={() => onRowDelete(params.data._id)}
                    className="opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                />
            ),
            cellClass: 'flex items-center justify-center group',
        });

        return defs;
    }, [columns, onRowDelete, onColumnRename, onColumnRemove, onColumnEdit, frozenColumns, hiddenColumns, cellFormats, conditionalRules, legacyInvalidCellMap]);

    // Default column settings
    const defaultColDef = useMemo((): ColDef => ({
        resizable: true,
        editable: true,
    }), []);

    // Get row ID for AG Grid
    const getRowId = useCallback((params: GetRowIdParams) => {
        return params.data._id;
    }, []);

    // Handle cell value changes with history tracking
    const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
        if (isRevertingInvalidChangeRef.current) {
            isRevertingInvalidChangeRef.current = false;
            return;
        }

        const rowId = event.data._id;
        const field = event.colDef.field;
        const newValue = event.newValue;
        const oldValue = event.oldValue;

        if (field && field !== '_id' && field !== '_order' && field !== '_actions') {
            const column = columns.find((c) => c.name === field);
            if (column) {
                const validation = validateValueAgainstColumn(column, newValue);
                if (!validation.valid) {
                    isRevertingInvalidChangeRef.current = true;
                    event.node.setDataValue(field, oldValue);
                    setCellValidationError(`${field}: ${validation.reason || `Expected ${validation.expectedType}`}`);
                    setLastValidationErrorAt(Date.now());
                    return;
                }
            }

            // Add to undo stack
            setUndoStack(prev => {
                const entry: HistoryEntry = {
                    rowId,
                    column: field,
                    oldValue,
                    newValue,
                    timestamp: Date.now()
                };
                const newStack = [...prev, entry];
                // Limit history size
                if (newStack.length > MAX_HISTORY) {
                    return newStack.slice(-MAX_HISTORY);
                }
                return newStack;
            });
            // Clear redo stack on new change
            setRedoStack([]);

            onCellChange(rowId, field, newValue);
        }
    }, [onCellChange, MAX_HISTORY, columns]);

    // Undo last change
    const handleUndo = useCallback(() => {
        if (undoStack.length === 0) return;

        const lastChange = undoStack[undoStack.length - 1];

        // Move to redo stack
        setRedoStack(prev => [...prev, lastChange]);
        setUndoStack(prev => prev.slice(0, -1));

        // Apply the old value
        onCellChange(lastChange.rowId, lastChange.column, lastChange.oldValue);

        // Update grid
        gridRef.current?.api.refreshCells({ rowNodes: [gridRef.current.api.getRowNode(lastChange.rowId)!] });
    }, [undoStack, onCellChange]);

    // Redo last undone change
    const handleRedo = useCallback(() => {
        if (redoStack.length === 0) return;

        const lastUndo = redoStack[redoStack.length - 1];

        // Move back to undo stack
        setUndoStack(prev => [...prev, lastUndo]);
        setRedoStack(prev => prev.slice(0, -1));

        // Apply the new value
        onCellChange(lastUndo.rowId, lastUndo.column, lastUndo.newValue);

        // Update grid
        gridRef.current?.api.refreshCells({ rowNodes: [gridRef.current.api.getRowNode(lastUndo.rowId)!] });
    }, [redoStack, onCellChange]);

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                handleRedo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                handleRedo();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                setShowFindReplaceModal(true);
            } else if (e.shiftKey && e.key === '?') {
                e.preventDefault();
                setShowShortcutHelp(true);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo]);

    useEffect(() => {
        if (!cellValidationError || !lastValidationErrorAt) {
            return;
        }
        const timeout = window.setTimeout(() => setCellValidationError(null), 4200);
        return () => window.clearTimeout(timeout);
    }, [cellValidationError, lastValidationErrorAt]);

    // Handle selection changes
    const onSelectionChanged = useCallback((event: SelectionChangedEvent) => {
        const selectedNodes = event.api.getSelectedNodes();
        const ids = selectedNodes.map((node) => node.data._id);
        setSelectedRowIds(ids);
        onSelectionCountChange?.(ids.length);
    }, [onSelectionCountChange]);

    // Handle paste from clipboard
    const processDataFromClipboard = useCallback((params: ProcessDataFromClipboardParams): string[][] | null => {
        const data = params.data;
        if (!data || data.length === 0) return null;

        // If pasting more rows than selected, create new rows
        const selectedNodes = gridRef.current?.api.getSelectedNodes() || [];
        if (data.length > 1 && selectedNodes.length <= 1) {
            // Bulk paste - create new rows
            const newRows = data.map((rowValues) => {
                const rowData: Record<string, any> = {};
                columns.forEach((col, index) => {
                    const strValue = rowValues[index] || '';
                    // Type conversion
                    if (col.type === 'number') {
                        rowData[col.name] = strValue === '' ? null : Number(strValue);
                    } else if (col.type === 'boolean') {
                        rowData[col.name] = strValue.toLowerCase() === 'true' || strValue === '1';
                    } else {
                        rowData[col.name] = strValue;
                    }
                });
                return rowData;
            });
            onBulkPaste(newRows);
            return null; // Prevent default paste behavior
        }

        return data;
    }, [columns, onBulkPaste]);

    // Handle grid ready
    const onGridReady = useCallback((params: GridReadyEvent) => {
        params.api.sizeColumnsToFit();

        // Emit initial column state
        emitColumnViewState();
    }, [emitColumnViewState]);

    // Handle sort changed (from column header clicks) - emit for saved views
    const onSortChanged = useCallback(() => {
        if (!gridRef.current?.api) return;
        const colState = gridRef.current.api.getColumnState();
        const sortedCols = colState
            .filter((c: any) => c.sort)
            .sort((a: any, b: any) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
            .map((c: any) => ({
                id: Math.random().toString(36).substring(2, 9),
                column: c.colId,
                direction: c.sort as 'asc' | 'desc',
            }));
        setSortLevels(sortedCols);
        onSortStateChanged?.(sortedCols);
    }, [onSortStateChanged]);

    // Handle column moved/resized/visibility changed - emit for saved views
    const onColumnStateUpdated = useCallback(() => {
        if (!gridRef.current?.api) return;
        emitColumnViewState();
    }, [emitColumnViewState]);

    // Apply external sort state when it changes (e.g., from loading a saved view)
    useEffect(() => {
        if (!externalSortState || !gridRef.current?.api) return;
        if (externalSortState.length === 0) {
            gridRef.current.api.applyColumnState({ defaultState: { sort: null } });
        } else {
            const columnState = externalSortState.map((level, index) => ({
                colId: level.column,
                sort: level.direction,
                sortIndex: index,
            }));
            gridRef.current.api.applyColumnState({
                state: columnState,
                defaultState: { sort: null },
            });
        }
        setSortLevels(externalSortState);
    }, [externalSortState]);

    // Apply external filter state when it changes (e.g., from loading a saved view)
    useEffect(() => {
        if (!externalFilterState || !gridRef.current?.api) return;
        gridRef.current.api.setFilterModel(externalFilterState);
    }, [externalFilterState]);

    useEffect(() => {
        const visibleRowIds = new Set(visibleRows.map((row) => row.id));
        setSelectedRowIds((prev) => {
            const next = prev.filter((id) => visibleRowIds.has(id));
            return next.length === prev.length ? prev : next;
        });

        if (!gridRef.current?.api) {
            setFilteredRowIds([...visibleRowIds]);
            return;
        }

        const ids: string[] = [];
        gridRef.current.api.forEachNodeAfterFilter((node) => {
            const rowId = node.data?._id;
            if (typeof rowId === 'string') {
                ids.push(rowId);
            }
        });
        setFilteredRowIds(ids);
    }, [pinnedTopRowData, rowData, visibleRows]);

    // Restore saved column/freeze visibility state from saved views.
    useEffect(() => {
        if (!externalColumnState) {
            return;
        }

        // Legacy format support: columnState was stored directly as an array.
        if (Array.isArray(externalColumnState)) {
            if (gridRef.current?.api) {
                gridRef.current.api.applyColumnState({
                    state: externalColumnState as any[],
                    applyOrder: true,
                });
            }
            return;
        }

        if (typeof externalColumnState !== 'object') {
            return;
        }

        const viewState = externalColumnState as Partial<CanvasColumnViewState>;
        if (Array.isArray(viewState.hiddenColumns)) {
            setHiddenColumns(viewState.hiddenColumns);
        }
        if (Array.isArray(viewState.frozenColumns)) {
            setFrozenColumns(viewState.frozenColumns);
        }
        if (Array.isArray(viewState.frozenRowIds)) {
            setFrozenRowIds(viewState.frozenRowIds);
        }
        if (Array.isArray(viewState.agColumnState) && gridRef.current?.api) {
            gridRef.current.api.applyColumnState({
                state: viewState.agColumnState as any[],
                applyOrder: true,
            });
        }
    }, [externalColumnState]);

    // Handle filter changes - generate VDQL and track filtered rows
    const onFilterChanged = useCallback((event: FilterChangedEvent) => {
        const filterModel = event.api.getFilterModel();
        const hasFilters = Object.keys(filterModel).length > 0;
        setHasActiveFilters(hasFilters);

        const query = filterModelToVDQL(filterModel, tableName, columns);
        setVdqlQuery(query);

        // Track filtered row IDs for bulk update
        if (hasFilters) {
            const filteredIds: string[] = [];
            event.api.forEachNodeAfterFilter((node) => {
                if (node.data?._id) {
                    filteredIds.push(node.data._id);
                }
            });
            setFilteredRowIds(filteredIds);
        } else {
            setFilteredRowIds([]);
        }

        // Emit filter state for saved views
        onFilterStateChanged?.(filterModel as Record<string, unknown>);
    }, [tableName, columns, onFilterStateChanged]);

    // Copy VDQL to clipboard
    const handleCopyVDQL = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(vdqlQuery);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, [vdqlQuery]);

    // Clear all filters
    const handleClearFilters = useCallback(() => {
        if (gridRef.current?.api) {
            gridRef.current.api.setFilterModel(null);
            setHasActiveFilters(false);
            setVdqlQuery('');
        }
    }, []);

    // Delete selected rows
    const handleDeleteSelected = useCallback(async () => {
        if (selectedRowIds.length > 0) {
            await onRowsDelete(selectedRowIds);
            setSelectedRowIds([]);
        }
    }, [selectedRowIds, onRowsDelete]);

    // Duplicate selected rows
    const handleDuplicateSelected = useCallback(async () => {
        if (selectedRowIds.length > 0 && onRowsDuplicate) {
            await onRowsDuplicate(selectedRowIds);
            setSelectedRowIds([]);
        }
    }, [selectedRowIds, onRowsDuplicate]);

    // Copy selected rows to clipboard
    const handleCopySelected = useCallback(() => {
        if (gridRef.current?.api) {
            gridRef.current.api.copySelectedRowsToClipboard();
        }
    }, []);

    // Quick search - filters across all columns
    const handleQuickSearch = useCallback((searchText: string) => {
        setQuickSearch(searchText);
        if (gridRef.current?.api) {
            gridRef.current.api.setGridOption('quickFilterText', searchText);
        }
    }, []);

    // Clear quick search
    const handleClearQuickSearch = useCallback(() => {
        setQuickSearch('');
        if (gridRef.current?.api) {
            gridRef.current.api.setGridOption('quickFilterText', '');
        }
    }, []);

    // Find rows with empty values in any column
    const handleShowEmpty = useCallback(() => {
        if (!gridRef.current?.api) return;

        if (activeQuickFilter === 'empty') {
            gridRef.current.api.setFilterModel(null);
            setActiveQuickFilter(null);
            setHasActiveFilters(false);
            setVdqlQuery('');
            return;
        }

        // Find first column with any empty values
        const columnWithEmpty = columns.find(col => {
            return rows.some(row => {
                const value = row.data[col.name];
                return value === null || value === undefined || value === '';
            });
        });

        if (columnWithEmpty) {
            gridRef.current.api.setFilterModel({
                [columnWithEmpty.name]: {
                    filterType: 'text',
                    type: 'blank',
                }
            });
            setActiveQuickFilter('empty');
        }
    }, [columns, rows, activeQuickFilter]);

    // Find duplicate values in a column
    const handleShowDuplicates = useCallback(() => {
        if (!gridRef.current?.api) return;

        if (activeQuickFilter === 'duplicates') {
            gridRef.current.api.setFilterModel(null);
            setActiveQuickFilter(null);
            setHasActiveFilters(false);
            setVdqlQuery('');
            return;
        }

        // Find duplicate values in the first column (or selected column if available)
        const targetColumn = columnSummary?.columnName || columns[0]?.name;
        if (!targetColumn) return;

        const valueCounts = new Map<string, number>();
        rows.forEach(row => {
            const value = String(row.data[targetColumn] ?? '');
            valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
        });

        const duplicateValues = [...valueCounts.entries()]
            .filter(([_, count]) => count > 1)
            .map(([value]) => value);

        if (duplicateValues.length > 0) {
            // Use external filter to show only duplicates
            gridRef.current.api.setFilterModel({
                [targetColumn]: {
                    filterType: 'text',
                    type: 'contains',
                    filter: duplicateValues[0], // Filter to first duplicate
                }
            });
            setActiveQuickFilter('duplicates');
        }
    }, [columns, rows, activeQuickFilter, columnSummary]);

    // Clear all quick filters
    const handleClearQuickFilters = useCallback(() => {
        if (gridRef.current?.api) {
            gridRef.current.api.setFilterModel(null);
            gridRef.current.api.setGridOption('quickFilterText', '');
        }
        setQuickSearch('');
        setActiveQuickFilter(null);
        setHasActiveFilters(false);
        setVdqlQuery('');
    }, []);

    // Open data generator modal for a column
    const handleOpenGenerator = useCallback((columnName: string) => {
        setGeneratorColumn(columnName);
        setShowGeneratorModal(true);
    }, []);

    // Handle generated data
    const handleGeneratedData = useCallback(async (values: (string | number | boolean)[]) => {
        if (!generatorColumn || !onGenerateColumnData) return;
        await onGenerateColumnData(generatorColumn, values);
        setShowGeneratorModal(false);
        setGeneratorColumn(null);
    }, [generatorColumn, onGenerateColumnData]);

    // Handle bulk update
    const handleBulkUpdate = useCallback(async (updates: BulkUpdate[]) => {
        if (!onBulkUpdate) return;
        await onBulkUpdate(updates);
        setShowBulkUpdateModal(false);
    }, [onBulkUpdate]);

    // Handle fill column with value
    const handleOpenFillColumn = useCallback((columnName: string) => {
        setFillColumnName(columnName);
        setFillType('value');
        setFillValue('');
        setFillStartValue('1');
        setFillStepValue('1');
        setFillPattern('{n}');
        setFillError(null);
        setShowFillColumnModal(true);
        setShowDataDropdown(false);
    }, []);

    const handleFillColumn = useCallback(async () => {
        if (!onFillSeries || !fillColumnName) return;

        const parsedStart = Number(fillStartValue);
        const parsedStep = Number(fillStepValue);
        if ((fillType === 'sequence' || fillType === 'pattern') && (!Number.isFinite(parsedStart) || !Number.isFinite(parsedStep))) {
            setFillError('Start and step must be valid numbers.');
            return;
        }
        if (fillType === 'pattern' && !fillPattern.trim()) {
            setFillError('Pattern is required. Use {n} as the sequence placeholder.');
            return;
        }

        const allRowIds = visibleRows.map(r => r.id);
        const options =
            fillType === 'value'
                ? { value: fillValue }
                : fillType === 'sequence'
                    ? { startValue: parsedStart, step: parsedStep }
                    : { pattern: fillPattern, startValue: parsedStart, step: parsedStep };

        await onFillSeries(allRowIds, fillColumnName, fillType, options);
        setShowFillColumnModal(false);
        setFillColumnName(null);
        setFillType('value');
        setFillValue('');
        setFillStartValue('1');
        setFillStepValue('1');
        setFillPattern('{n}');
        setFillError(null);
    }, [onFillSeries, fillColumnName, fillType, fillValue, fillStartValue, fillStepValue, fillPattern, visibleRows]);

    // Find & Replace handlers
    const handleFind = useCallback(() => {
        if (!findText) {
            setFindResults([]);
            return;
        }

        const results: { rowId: string; column: string; value: string }[] = [];
        const searchText = matchCase ? findText : findText.toLowerCase();

        for (const row of visibleRows) {
            const columnsToSearch = findInColumn === '__all__'
                ? columns.map(c => c.name)
                : [findInColumn];

            for (const colName of columnsToSearch) {
                const cellValue = String(row.data[colName] ?? '');
                const compareValue = matchCase ? cellValue : cellValue.toLowerCase();

                let isMatch = false;
                if (matchWholeCell) {
                    isMatch = compareValue === searchText;
                } else {
                    isMatch = compareValue.includes(searchText);
                }

                if (isMatch) {
                    results.push({ rowId: row.id, column: colName, value: cellValue });
                }
            }
        }

        setFindResults(results);
    }, [findText, findInColumn, matchCase, matchWholeCell, visibleRows, columns]);

    const handleReplaceAll = useCallback(async () => {
        if (!findText || findResults.length === 0) return;

        // Group by row for efficient updates
        const updatesByRow = new Map<string, Record<string, string>>();

        for (const result of findResults) {
            const row = visibleRows.find(r => r.id === result.rowId);
            if (!row) continue;

            const currentValue = String(row.data[result.column] ?? '');
            let newValue: string;

            if (matchWholeCell) {
                newValue = replaceText;
            } else {
                // Replace all occurrences in the cell
                if (matchCase) {
                    newValue = currentValue.split(findText).join(replaceText);
                } else {
                    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    newValue = currentValue.replace(regex, replaceText);
                }
            }

            if (!updatesByRow.has(result.rowId)) {
                updatesByRow.set(result.rowId, {});
            }
            updatesByRow.get(result.rowId)![result.column] = newValue;
        }

        // Apply updates
        for (const [rowId, updates] of updatesByRow) {
            for (const [column, value] of Object.entries(updates)) {
                onCellChange(rowId, column, value);
            }
        }

        // Re-run find to update results (should be empty now)
        setFindResults([]);
        setFindText('');
        setReplaceText('');
        setShowFindReplaceModal(false);
    }, [findText, replaceText, findResults, matchCase, matchWholeCell, visibleRows, onCellChange]);

    // Freeze/Unfreeze column handlers
    const handleFreezeColumn = useCallback((columnName: string) => {
        setFrozenColumns(prev =>
            prev.includes(columnName)
                ? prev.filter(c => c !== columnName)
                : [...prev, columnName]
        );
    }, []);

    const handleUnfreezeAll = useCallback(() => {
        setFrozenColumns([]);
    }, []);

    // Freeze/Unfreeze row handlers (pin rows to top)
    // Individual row freeze (used in context menu - currently disabled due to AG Grid v35 type issues)
    const handleFreezeRow = useCallback((rowId: string) => {
        setFrozenRowIds(prev =>
            prev.includes(rowId)
                ? prev.filter(id => id !== rowId)
                : [...prev, rowId]
        );
    }, []);
    void handleFreezeRow; // Reserved for future context menu implementation

    const handleFreezeSelectedRows = useCallback(() => {
        if (selectedRowIds.length === 0) return;
        setFrozenRowIds(prev => {
            const newIds = selectedRowIds.filter(id => !prev.includes(id));
            return [...prev, ...newIds];
        });
    }, [selectedRowIds]);

    const handleUnfreezeAllRows = useCallback(() => {
        setFrozenRowIds([]);
    }, []);

    // Column visibility handlers
    const handleToggleColumnVisibility = useCallback((columnName: string) => {
        setHiddenColumns(prev =>
            prev.includes(columnName)
                ? prev.filter(c => c !== columnName)
                : [...prev, columnName]
        );
    }, []);

    const handleShowAllColumns = useCallback(() => {
        setHiddenColumns([]);
    }, []);

    const handleHideAllColumns = useCallback(() => {
        setHiddenColumns(columns.map(c => c.name));
    }, [columns]);

    // Quick Transform handler - applies text transformations to a column
    const handleQuickTransform = useCallback((columnName: string, transform: string) => {
        type TransformFn = (value: unknown, idx?: number) => unknown;
        const transformFn: Record<string, TransformFn> = {
            'trim': (v) => typeof v === 'string' ? v.trim() : v,
            'uppercase': (v) => typeof v === 'string' ? v.toUpperCase() : v,
            'lowercase': (v) => typeof v === 'string' ? v.toLowerCase() : v,
            'capitalize': (v) => typeof v === 'string' ? v.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : v,
            'titlecase': (v) => typeof v === 'string' ? v.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()) : v,
            'sentencecase': (v) => typeof v === 'string' ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : v,
            'remove_spaces': (v) => typeof v === 'string' ? v.replace(/\s+/g, '') : v,
            'remove_special': (v) => typeof v === 'string' ? v.replace(/[^a-zA-Z0-9\s]/g, '') : v,
            'pad_left_zeros': (v) => typeof v === 'string' || typeof v === 'number' ? String(v).padStart(5, '0') : v,
            'prefix_add': (v) => typeof v === 'string' ? `TEST_${v}` : v,
            'sequence': (_v, idx) => idx !== undefined ? String(idx + 1) : _v,
        };

        const fn = transformFn[transform];
        if (!fn) return;

        // Apply transform to all rows in the column
        let changeCount = 0;
        rows.forEach((row, idx) => {
            const oldValue = row.data[columnName];
            const newValue = fn(oldValue, idx);
            if (oldValue !== newValue) {
                // Track in undo stack
                setUndoStack(prev => {
                    const entry: HistoryEntry = {
                        rowId: row.id,
                        column: columnName,
                        oldValue,
                        newValue,
                        timestamp: Date.now()
                    };
                    return [...prev.slice(-(MAX_HISTORY - 1)), entry];
                });
                onCellChange(row.id, columnName, newValue);
                changeCount++;
            }
        });

        // Clear redo stack after bulk transform
        if (changeCount > 0) {
            setRedoStack([]);
        }

        setShowDataDropdown(false);
    }, [rows, onCellChange, MAX_HISTORY]);

    // Close dropdowns when clicking outside
    const handleClickOutside = useCallback((e: MouseEvent) => {
        const target = e.target as Node;
        if (columnDropdownRef.current && !columnDropdownRef.current.contains(target)) {
            setShowColumnDropdown(false);
        }
        if (dataDropdownRef.current && !dataDropdownRef.current.contains(target)) {
            setShowDataDropdown(false);
        }
        if (viewDropdownRef.current && !viewDropdownRef.current.contains(target)) {
            setShowViewDropdown(false);
        }
        if (filterDropdownRef.current && !filterDropdownRef.current.contains(target)) {
            setShowFilterDropdown(false);
        }
    }, []);

    // Add click outside listener
    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handleClickOutside]);

    useEffect(() => {
        onSelectionCountChange?.(selectedRowIds.length);
    }, [onSelectionCountChange, selectedRowIds.length]);

    useEffect(() => {
        if (!gridRef.current?.api) {
            return;
        }
        emitColumnViewState();
    }, [emitColumnViewState]);

    // Multi-sort handler
    const handleApplyMultiSort = useCallback((newSortLevels: SortLevel[]) => {
        setSortLevels(newSortLevels);

        // Apply sorting to AG Grid
        if (gridRef.current?.api) {
            if (newSortLevels.length === 0) {
                // Clear all sorting
                gridRef.current.api.applyColumnState({ defaultState: { sort: null } });
            } else {
                // Apply multi-column sort
                const columnState = newSortLevels.map((level, index) => ({
                    colId: level.column,
                    sort: level.direction,
                    sortIndex: index,
                }));
                gridRef.current.api.applyColumnState({
                    state: columnState,
                    defaultState: { sort: null },
                });
            }
        }

        // Emit sort state for saved views
        onSortStateChanged?.(newSortLevels);
    }, [onSortStateChanged]);

    // Handle filtering by distinct value
    const handleFilterByDistinctValue = useCallback((value: string | null) => {
        if (!gridRef.current?.api || !columnSummary) return;

        if (value === null) {
            // Filter to empty values
            gridRef.current.api.setFilterModel({
                [columnSummary.columnName]: {
                    filterType: 'text',
                    type: 'blank',
                }
            });
        } else {
            // Filter to specific value
            gridRef.current.api.setFilterModel({
                [columnSummary.columnName]: {
                    filterType: 'text',
                    type: 'equals',
                    filter: value,
                }
            });
        }
    }, [columnSummary]);

    useImperativeHandle(ref, () => ({
        applyFilterModel: (model: Record<string, unknown>) => {
            gridRef.current?.api.setFilterModel(model);
        },
        clearFilterModel: () => {
            gridRef.current?.api.setFilterModel(null);
            setHasActiveFilters(false);
            setVdqlQuery('');
            setFilteredRowIds(visibleRows.map((row) => row.id));
        },
        setQuickSearch: (value: string) => {
            setQuickSearch(value);
            gridRef.current?.api.setGridOption('quickFilterText', value);
        },
        applyExternalRowScope: (rowIds: string[] | null) => {
            if (!rowIds) {
                setExternalRowScopeIds(null);
                return;
            }
            setExternalRowScopeIds(new Set(rowIds));
        },
        clearExternalRowScope: () => {
            setExternalRowScopeIds(null);
        },
        getFilterModel: () => (gridRef.current?.api.getFilterModel() as Record<string, unknown>) || {},
        getFilteredRowIds: () => [...filteredRowIds],
        getSelectedRowIds: () => [...selectedRowIds],
        getSelectedRowCount: () => selectedRowIds.length,
        openFindReplace: () => setShowFindReplaceModal(true),
        openBulkUpdate: () => {
            if (onBulkUpdate) {
                setShowBulkUpdateModal(true);
            }
        },
        openMultiSort: () => setShowSortModal(true),
        openConditionalFormatting: () => setShowConditionalModal(true),
        openColumnVisibility: () => setShowColumnDropdown(true),
        openShortcutHelp: () => setShowShortcutHelp(true),
        undo: () => handleUndo(),
        redo: () => handleRedo(),
        deleteSelectedRows: () => {
            void handleDeleteSelected();
        },
        duplicateSelectedRows: () => {
            void handleDuplicateSelected();
        },
        freezeSelectedRows: () => handleFreezeSelectedRows(),
        unfreezeAllRows: () => handleUnfreezeAllRows(),
        unfreezeAllColumns: () => handleUnfreezeAll(),
        applyQuickFilterPreset: (preset: 'empty' | 'duplicates' | 'clear') => {
            if (preset === 'empty') {
                handleShowEmpty();
                return;
            }
            if (preset === 'duplicates') {
                handleShowDuplicates();
                return;
            }
            handleClearQuickFilters();
        },
        openFillColumn: (columnName?: string) => {
            const targetColumn = columnName || columnSummary?.columnName || columns[0]?.name;
            if (!targetColumn) return;
            setFillColumnName(targetColumn);
            setFillValue('');
            setShowFillColumnModal(true);
        },
        openDataGenerator: (columnName?: string) => {
            if (!onGenerateColumnData) return;
            const targetColumn = columnName || columnSummary?.columnName || columns.find(c => c.type === 'text')?.name;
            if (!targetColumn) return;
            setGeneratorColumn(targetColumn);
            setShowGeneratorModal(true);
        },
        getValidationIssueCount: () => legacyInvalidCellMap.size,
        getValidationHotspots: () => validationHotspots,
    }), [
        columnSummary?.columnName,
        columns,
        filteredRowIds,
        visibleRows,
        handleDeleteSelected,
        handleDuplicateSelected,
        handleFreezeSelectedRows,
        handleRedo,
        handleUndo,
        handleClearQuickFilters,
        handleShowDuplicates,
        handleShowEmpty,
        handleUnfreezeAll,
        handleUnfreezeAllRows,
        legacyInvalidCellMap,
        onBulkUpdate,
        onGenerateColumnData,
        selectedRowIds,
        validationHotspots,
    ]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center text-text-muted">
                Loading table...
            </div>
        );
    }

    // Show message if no columns defined
    if (columns.length === 0) {
        return (
            <div className="flex h-full flex-col rounded-lg border border-border-default bg-dark-card">
                <div className="flex items-center justify-between border-b border-border-default bg-dark-bg/50 px-4 py-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onColumnAdd}
                            className="flex items-center gap-1.5 rounded-md bg-gradient-to-b from-brand-primary to-brand-primary px-3 py-1.5 text-xs text-white transition-all hover:brightness-110"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Column
                        </button>
                    </div>
                </div>
                <EmptyState
                    className="flex-1"
                    title="No columns defined"
                    message="Add columns to start entering test data"
                    action={
                        <button
                            onClick={onColumnAdd}
                            className="flex items-center gap-1.5 rounded-md bg-gradient-to-b from-brand-primary to-brand-primary px-4 py-2 text-sm text-white transition-all hover:brightness-110"
                        >
                            <Plus className="w-4 h-4" />
                            Add First Column
                        </button>
                    }
                />
            </div>
        );
    }

    // Count active view settings
    const activeViewCount = (hiddenColumns.length > 0 ? 1 : 0) + (sortLevels.length > 0 ? 1 : 0) + (conditionalRules.length > 0 ? 1 : 0);
    const activeFilterCount = (activeQuickFilter ? 1 : 0) + (hasActiveFilters ? 1 : 0) + (quickSearch ? 1 : 0);

    return (
        <div className="flex h-full flex-col bg-dark-card">
            {cellValidationError && (
                <div className="border-b border-status-danger/35 bg-status-danger/12 px-3 py-2 text-xs text-status-danger">
                    <span className="font-semibold">Blocked invalid edit:</span> {cellValidationError}
                </div>
            )}
            {!isEmbedded && (
                <>
            {/* Toolbar - Simplified with Dropdown Groups */}
            <div className="flex items-center justify-between border-b border-border-default bg-dark-bg/70 px-4 py-2 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    {/* Primary Actions - Always Visible */}
                    <button
                        onClick={onRowAdd}
                        className="flex items-center gap-1.5 rounded-md bg-gradient-to-b from-brand-primary to-brand-primary px-3 py-1.5 text-xs text-white transition-all hover:brightness-110"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Row
                    </button>
                    <button
                        onClick={onColumnAdd}
                        className="flex items-center gap-1.5 rounded-md border border-border-default bg-dark-elevated/75 px-3 py-1.5 text-xs text-text-primary transition-all hover:border-border-emphasis hover:bg-dark-elevated"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Column
                    </button>

                    <div className="mx-1 h-4 w-px bg-border-default" />

                    {/* Undo/Redo Buttons */}
                    <div className="flex items-center gap-0.5">
                        <IconButton
                            icon={<Undo2 className="w-3.5 h-3.5" />}
                            variant="outlined"
                            tooltip={`Undo (Ctrl+Z)${undoStack.length > 0 ? ` - ${undoStack.length} change${undoStack.length > 1 ? 's' : ''}` : ''}`}
                            onClick={handleUndo}
                            disabled={undoStack.length === 0}
                            className={undoStack.length > 0 ? 'bg-dark-elevated/75' : 'border-border-default/40 bg-dark-bg/40'}
                        />
                        <IconButton
                            icon={<Redo2 className="w-3.5 h-3.5" />}
                            variant="outlined"
                            tooltip={`Redo (Ctrl+Y)${redoStack.length > 0 ? ` - ${redoStack.length} change${redoStack.length > 1 ? 's' : ''}` : ''}`}
                            onClick={handleRedo}
                            disabled={redoStack.length === 0}
                            className={redoStack.length > 0 ? 'bg-dark-elevated/75' : 'border-border-default/40 bg-dark-bg/40'}
                        />
                    </div>

                    <div className="mx-1 h-4 w-px bg-border-default" />

                    {/* Data Dropdown - Import/Export */}
                    <div className="relative" ref={dataDropdownRef}>
                        <button
                            onClick={() => {
                                setShowDataDropdown(!showDataDropdown);
                                setShowViewDropdown(false);
                                setShowFilterDropdown(false);
                            }}
                            className="flex items-center gap-1.5 rounded-md border border-border-default bg-dark-elevated/75 px-3 py-1.5 text-xs text-text-primary transition-all hover:border-border-emphasis hover:bg-dark-elevated"
                        >
                            <FileDown className="w-3.5 h-3.5" />
                            Data
                            <ChevronDown className={`w-3 h-3 transition-transform ${showDataDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showDataDropdown && (
                            <div className="absolute top-full left-0 z-50 mt-1 w-52 overflow-hidden rounded-lg border border-border-default bg-dark-card shadow-2xl animate-scale-in">
                                <button
                                    onClick={() => { onImportCSV(); setShowDataDropdown(false); }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-dark-elevated hover:text-text-primary"
                                >
                                    <FileUp className="w-3.5 h-3.5 text-status-info" />
                                    Import CSV
                                </button>
                                <button
                                    onClick={() => { onExportCSV(); setShowDataDropdown(false); }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-dark-elevated hover:text-text-primary"
                                >
                                    <FileDown className="w-3.5 h-3.5 text-status-success" />
                                    Export CSV
                                </button>
                                <div className="my-1 h-px bg-border-default" />
                                <button
                                    onClick={() => { setShowFindReplaceModal(true); setShowDataDropdown(false); }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-dark-elevated hover:text-text-primary"
                                >
                                    <Search className="w-3.5 h-3.5 text-status-info" />
                                    Find & Replace
                                    <span className="ml-auto text-3xs text-text-muted">Ctrl+H</span>
                                </button>
                                {onGenerateColumnData && columnSummary && (
                                    <>
                                        <div className="my-1 h-px bg-border-default" />
                                        <button
                                            onClick={() => { handleOpenGenerator(columnSummary.columnName); setShowDataDropdown(false); }}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-accent-purple hover:bg-accent-purple/20 transition-colors"
                                        >
                                            <Wand2 className="w-3.5 h-3.5" />
                                            Generate "{columnSummary.columnName}"
                                        </button>
                                    </>
                                )}
                                {/* Fill Column - when column is selected */}
                                {onFillSeries && columnSummary && (
                                    <button
                                        onClick={() => handleOpenFillColumn(columnSummary.columnName)}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-status-warning hover:bg-status-warning/20 transition-colors"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        Fill "{columnSummary.columnName}" with Value
                                    </button>
                                )}
                                {/* Fill any column - always available */}
                                {onFillSeries && columns.length > 0 && !columnSummary && (
                                    <>
                                        <div className="my-1 h-px bg-border-default" />
                                        <div className="px-3 py-1 text-3xs uppercase text-text-muted">Fill Column</div>
                                        {columns.slice(0, 5).map(col => (
                                            <button
                                                key={col.name}
                                                onClick={() => handleOpenFillColumn(col.name)}
                                                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-dark-elevated hover:text-text-primary"
                                            >
                                                <Edit3 className="w-3.5 h-3.5 text-status-warning" />
                                                {col.name}
                                            </button>
                                        ))}
                                        {columns.length > 5 && (
                                            <div className="px-3 py-1 text-3xs text-text-muted">
                                                Click a column header for more...
                                            </div>
                                        )}
                                    </>
                                )}
                                {/* Quick Transforms Section */}
                                {columnSummary && columns.find(c => c.name === columnSummary.columnName)?.type === 'text' && (
                                    <>
                                        <div className="my-1 h-px bg-border-default" />
                                        <div className="px-3 py-1 text-3xs uppercase text-text-muted">Transform "{columnSummary.columnName}"</div>
                                        <button
                                            onClick={() => handleQuickTransform(columnSummary.columnName, 'trim')}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-dark-elevated hover:text-text-primary"
                                        >
                                            <Type className="w-3.5 h-3.5 text-status-info" />
                                            Trim Whitespace
                                        </button>
                                        <button
                                            onClick={() => handleQuickTransform(columnSummary.columnName, 'uppercase')}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-dark-elevated hover:text-text-primary"
                                        >
                                            <LetterText className="w-3.5 h-3.5 text-status-success" />
                                            UPPERCASE
                                        </button>
                                        <button
                                            onClick={() => handleQuickTransform(columnSummary.columnName, 'lowercase')}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-dark-elevated hover:text-text-primary"
                                        >
                                            <LetterText className="w-3.5 h-3.5 text-status-warning" />
                                            lowercase
                                        </button>
                                        <button
                                            onClick={() => handleQuickTransform(columnSummary.columnName, 'capitalize')}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-dark-elevated hover:text-text-primary"
                                        >
                                            <Type className="w-3.5 h-3.5 text-accent-purple" />
                                            Capitalize Each Word
                                        </button>
                                        <button
                                            onClick={() => handleQuickTransform(columnSummary.columnName, 'sequence')}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-dark-elevated hover:text-text-primary"
                                        >
                                            <Hash className="w-3.5 h-3.5 text-accent-orange" />
                                            Generate Sequence (1, 2, 3...)
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* View Dropdown - Columns, Sort, Format */}
                    <div className="relative" ref={viewDropdownRef}>
                        <button
                            onClick={() => {
                                setShowViewDropdown(!showViewDropdown);
                                setShowDataDropdown(false);
                                setShowFilterDropdown(false);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                                activeViewCount > 0
                                    ? 'bg-status-info/20 text-status-info hover:bg-status-info/30'
                                    : 'border border-border-default bg-dark-elevated/75 text-text-primary hover:border-border-emphasis hover:bg-dark-elevated'
                            }`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            View
                            {activeViewCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-status-info text-white text-xs rounded-full">
                                    {activeViewCount}
                                </span>
                            )}
                            <ChevronDown className={`w-3 h-3 transition-transform ${showViewDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showViewDropdown && (
                            <div className="absolute top-full left-0 z-50 mt-1 w-56 overflow-hidden rounded-lg border border-border-default bg-dark-card shadow-2xl animate-scale-in">
                                {/* Columns Section */}
                                <button
                                    onClick={() => { setShowColumnDropdown(true); setShowViewDropdown(false); }}
                                    className="flex w-full items-center justify-between px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-dark-elevated hover:text-text-primary"
                                >
                                    <div className="flex items-center gap-2">
                                        <Columns3 className="w-3.5 h-3.5 text-status-warning" />
                                        Column Visibility
                                    </div>
                                    {hiddenColumns.length > 0 && (
                                        <span className="px-1.5 py-0.5 bg-status-warning text-white text-xs rounded-full">
                                            {hiddenColumns.length} hidden
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => { setShowSortModal(true); setShowViewDropdown(false); }}
                                    className="flex w-full items-center justify-between px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-dark-elevated hover:text-text-primary"
                                >
                                    <div className="flex items-center gap-2">
                                        <ArrowUpDown className="w-3.5 h-3.5 text-accent-purple" />
                                        Multi-Column Sort
                                    </div>
                                    {sortLevels.length > 0 && (
                                        <span className="px-1.5 py-0.5 bg-accent-purple text-white text-xs rounded-full">
                                            {sortLevels.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => { setShowConditionalModal(true); setShowViewDropdown(false); }}
                                    className="flex w-full items-center justify-between px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-dark-elevated hover:text-text-primary"
                                >
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-3.5 h-3.5 text-status-success" />
                                        Conditional Formatting
                                    </div>
                                    {conditionalRules.length > 0 && (
                                        <span className="px-1.5 py-0.5 bg-status-success text-white text-xs rounded-full">
                                            {conditionalRules.length}
                                        </span>
                                    )}
                                </button>
                                {/* Row Freezing Section */}
                                <div className="my-1 h-px bg-border-default" />
                                <div className="px-3 py-1 text-3xs uppercase tracking-wider text-text-muted">Row Pinning</div>
                                {selectedRowIds.length > 0 && (
                                    <button
                                        onClick={() => { handleFreezeSelectedRows(); setShowViewDropdown(false); }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-dark-elevated hover:text-text-primary"
                                    >
                                        <Pin className="w-3.5 h-3.5 text-accent-orange" />
                                        Freeze Selected Rows ({selectedRowIds.length})
                                    </button>
                                )}
                                {frozenRowIds.length > 0 && (
                                    <button
                                        onClick={() => { handleUnfreezeAllRows(); setShowViewDropdown(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-accent-orange hover:bg-accent-orange/20 transition-colors"
                                    >
                                        <PinOff className="w-3.5 h-3.5" />
                                        Unfreeze All Rows ({frozenRowIds.length})
                                    </button>
                                )}
                                {selectedRowIds.length === 0 && frozenRowIds.length === 0 && (
                                    <div className="px-3 py-2 text-xs text-text-muted">
                                        Select rows to freeze them
                                    </div>
                                )}
                                {/* Column Freezing Section */}
                                {(frozenColumns.length > 0) && (
                                    <>
                                        <div className="my-1 h-px bg-border-default" />
                                        <button
                                            onClick={() => { handleUnfreezeAll(); setShowViewDropdown(false); }}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-status-info hover:bg-status-info/20 transition-colors"
                                        >
                                            <PinOff className="w-3.5 h-3.5" />
                                            Unfreeze All Columns ({frozenColumns.length})
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Filter Dropdown */}
                    <div className="relative" ref={filterDropdownRef}>
                        <button
                            onClick={() => {
                                setShowFilterDropdown(!showFilterDropdown);
                                setShowDataDropdown(false);
                                setShowViewDropdown(false);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                                activeFilterCount > 0
                                    ? 'bg-status-warning/20 text-status-warning hover:bg-status-warning/30'
                                    : 'border border-border-default bg-dark-elevated/75 text-text-primary hover:border-border-emphasis hover:bg-dark-elevated'
                            }`}
                        >
                            <Filter className="w-3.5 h-3.5" />
                            Filter
                            {activeFilterCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-status-warning text-white text-xs rounded-full">
                                    {activeFilterCount}
                                </span>
                            )}
                            <ChevronDown className={`w-3 h-3 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showFilterDropdown && (
                            <div className="absolute top-full left-0 z-50 mt-1 w-48 overflow-hidden rounded-lg border border-border-default bg-dark-card shadow-2xl animate-scale-in">
                                <button
                                    onClick={() => { handleShowEmpty(); setShowFilterDropdown(false); }}
                                    className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors ${
                                        activeQuickFilter === 'empty'
                                            ? 'bg-status-warning/20 text-status-warning'
                                            : 'text-text-secondary hover:bg-dark-elevated hover:text-text-primary'
                                    }`}
                                >
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Show Empty Cells
                                    {activeQuickFilter === 'empty' && <Check className="w-3 h-3 ml-auto" />}
                                </button>
                                <button
                                    onClick={() => { handleShowDuplicates(); setShowFilterDropdown(false); }}
                                    className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors ${
                                        activeQuickFilter === 'duplicates'
                                            ? 'bg-accent-purple/20 text-accent-purple'
                                            : 'text-text-secondary hover:bg-dark-elevated hover:text-text-primary'
                                    }`}
                                >
                                    <CopyPlus className="w-3.5 h-3.5" />
                                    Show Duplicates
                                    {activeQuickFilter === 'duplicates' && <Check className="w-3 h-3 ml-auto" />}
                                </button>
                                {(hasActiveFilters || quickSearch || activeQuickFilter) && (
                                    <>
                                        <div className="my-1 h-px bg-border-default" />
                                        <button
                                            onClick={() => { handleClearQuickFilters(); setShowFilterDropdown(false); }}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-status-danger hover:bg-status-danger/20 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                            Clear All Filters
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mx-1 h-4 w-px bg-border-default" />

                    {/* Quick Search - Always Visible */}
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={quickSearch}
                            onChange={(e) => handleQuickSearch(e.target.value)}
                            className="w-36 rounded-md border border-border-default bg-dark-elevated/80 py-1.5 pl-7 pr-7 text-xs text-text-primary transition-all placeholder:text-text-muted focus:w-48 focus:border-border-active focus:outline-none"
                        />
                        {quickSearch && (
                            <IconButton
                                icon={<X className="w-3 h-3" />}
                                size="sm"
                                variant="ghost"
                                tooltip="Clear search"
                                onClick={handleClearQuickSearch}
                                className="absolute right-2 top-1/2 -translate-y-1/2"
                            />
                        )}
                    </div>
                </div>

                {/* Right Side - Contextual Actions */}
                <div className="flex items-center gap-2">
                    {/* Update Filtered button */}
                    {onBulkUpdate && hasActiveFilters && filteredRowIds.length > 0 && (
                        <button
                            onClick={() => setShowBulkUpdateModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-status-warning hover:bg-status-warning rounded-md text-xs text-white transition-colors"
                            title={`Update ${filteredRowIds.length} filtered rows`}
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                            Update {filteredRowIds.length}
                        </button>
                    )}

                    {/* Selection Actions */}
                    {selectedRowIds.length > 0 && (
                        <div className="flex items-center gap-1.5 border-l border-border-default pl-2">
                            <span className="mr-1 text-xs text-text-muted">
                                {selectedRowIds.length} selected
                            </span>
                            {onBulkUpdate && (
                                <IconButton
                                    icon={<Edit3 className="w-3.5 h-3.5" />}
                                    tone="info"
                                    tooltip="Update selected"
                                    onClick={() => setShowBulkUpdateModal(true)}
                                    className="bg-status-info hover:bg-status-info text-white"
                                />
                            )}
                            <IconButton
                                icon={<Copy className="w-3.5 h-3.5" />}
                                variant="outlined"
                                tooltip="Copy selected"
                                onClick={handleCopySelected}
                                className="bg-dark-elevated/80"
                            />
                            {onRowsDuplicate && (
                                <IconButton
                                    icon={<CopyPlus className="w-3.5 h-3.5" />}
                                    tone="info"
                                    tooltip="Duplicate selected"
                                    onClick={handleDuplicateSelected}
                                    className="bg-status-info/20 hover:bg-status-info/40"
                                />
                            )}
                            <IconButton
                                icon={<Trash2 className="w-3.5 h-3.5" />}
                                tone="danger"
                                tooltip="Delete selected"
                                onClick={handleDeleteSelected}
                                className="bg-status-danger/20 hover:bg-status-danger/40"
                            />
                        </div>
                    )}

                    {/* Row Count */}
                    <span className="text-xs tabular-nums text-text-muted">
                        {rows.length} rows
                    </span>
                </div>
            </div>
                </>
            )}

            {/* Column Visibility Floating Panel (opened from View dropdown) */}
            {showColumnDropdown && (
                <div className="absolute top-14 left-48 z-50" ref={columnDropdownRef}>
                    <div className="w-64 overflow-hidden rounded-lg border border-border-default bg-dark-card shadow-2xl animate-scale-in">
                        <div className="border-b border-border-default bg-dark-bg/50 p-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-text-secondary">Column Visibility</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={handleShowAllColumns}
                                        className="px-2 py-0.5 text-xs text-status-info hover:bg-status-info/20 rounded transition-colors"
                                    >
                                        Show All
                                    </button>
                                    <button
                                        onClick={handleHideAllColumns}
                                        className="px-2 py-0.5 text-xs text-text-muted hover:bg-dark-elevated rounded transition-colors"
                                    >
                                        Hide All
                                    </button>
                                    <IconButton
                                        icon={<X className="w-3.5 h-3.5" />}
                                        size="sm"
                                        variant="ghost"
                                        tooltip="Close"
                                        onClick={() => setShowColumnDropdown(false)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {columns.map((col) => {
                                const isHidden = hiddenColumns.includes(col.name);
                                const isFrozen = frozenColumns.includes(col.name);
                                return (
                                    <div
                                        key={col.name}
                                        className="flex items-center justify-between px-3 py-2 hover:bg-dark-elevated transition-colors group"
                                    >
                                        <button
                                            onClick={() => handleToggleColumnVisibility(col.name)}
                                            className="flex items-center gap-2 flex-1"
                                        >
                                            {isHidden ? (
                                                <EyeOff className="w-3.5 h-3.5 text-text-muted" />
                                            ) : (
                                                <Eye className="w-3.5 h-3.5 text-status-success" />
                                            )}
                                            <span className={`text-xs ${isHidden ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                                                {col.name}
                                            </span>
                                            {col.type === 'reference' && (
                                                <span className="text-xs text-status-info">🔗</span>
                                            )}
                                            {isFrozen && (
                                                <Pin className="w-3 h-3 text-status-info" />
                                            )}
                                        </button>
                                        <div className="flex items-center gap-1">
                                            {onColumnEdit && (
                                                <IconButton
                                                    icon={<Edit3 className="w-3 h-3" />}
                                                    size="sm"
                                                    variant="ghost"
                                                    tone="warning"
                                                    tooltip="Edit column"
                                                    onClick={() => {
                                                        onColumnEdit(col.name);
                                                        setShowColumnDropdown(false);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                />
                                            )}
                                            {onColumnRemove && (
                                                <IconButton
                                                    icon={<Trash2 className="w-3 h-3" />}
                                                    size="sm"
                                                    variant="ghost"
                                                    tone="danger"
                                                    tooltip="Delete column"
                                                    onClick={() => {
                                                        onColumnRemove(col.name);
                                                        setShowColumnDropdown(false);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                />
                                            )}
                                            <IconButton
                                                icon={isFrozen ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                                                size="sm"
                                                variant="ghost"
                                                tone={isFrozen ? 'info' : 'default'}
                                                tooltip={isFrozen ? 'Unfreeze' : 'Freeze'}
                                                onClick={() => handleFreezeColumn(col.name)}
                                                disabled={isHidden}
                                                className={`opacity-0 group-hover:opacity-100 transition-opacity ${isFrozen ? 'bg-status-info/20' : ''}`}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* AG Grid */}
            <div
                className="flex-1 overflow-hidden"
                style={{ minHeight: '300px', height: '100%', width: '100%' }}
            >
                <AgGridReact
                    ref={gridRef}
                    theme={darkTheme}
                    rowData={rowData}
                    pinnedTopRowData={pinnedTopRowData}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    getRowId={getRowId}
                    onGridReady={onGridReady}
                    onCellValueChanged={onCellValueChanged}
                    onSelectionChanged={onSelectionChanged}
                    onFilterChanged={onFilterChanged}
                    onSortChanged={onSortChanged}
                    onColumnMoved={onColumnStateUpdated}
                    onColumnVisible={onColumnStateUpdated}
                    onColumnResized={onColumnStateUpdated}
                    onCellClicked={onCellClicked}
                    processDataFromClipboard={processDataFromClipboard}
                    overlayNoRowsTemplate={'<div class="flex flex-col items-center justify-center py-12 text-text-secondary"><p class="text-base mb-1">No rows yet</p><p class="text-sm">Click &quot;Add Row&quot; to start entering test data</p></div>'}
                    rowSelection={{
                        mode: 'multiRow',
                        checkboxes: true,
                        headerCheckbox: true,
                        enableClickSelection: false
                    }}
                    enableCellTextSelection={true}
                    ensureDomOrder={true}
                    animateRows={true}
                    undoRedoCellEditing={true}
                    undoRedoCellEditingLimit={20}
                    stopEditingWhenCellsLoseFocus={true}
                    singleClickEdit={true}
                    headerHeight={36}
                    rowHeight={36}
                    suppressContextMenu={false}
                    clipboardDelimiter="\t"
                    alwaysShowHorizontalScroll={true}
                    alwaysShowVerticalScroll={true}
                />
            </div>

            {/* Cell Selection VDQL Bar - Shows when cells are selected */}
            {!isEmbedded && selectedCells.length > 0 && cellSelectionQuery && (
                <div className="px-4 py-3 border-t border-accent-purple/50 bg-gradient-to-r from-accent-purple/10 to-dark-canvas/50">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-accent-purple">
                                <MousePointer className="w-4 h-4" />
                                <span className="text-xs font-medium">
                                    Cell Selection ({selectedCells.length} cell{selectedCells.length > 1 ? 's' : ''})
                                </span>
                                <span className="text-xs text-accent-purple">
                                    Ctrl+click to select multiple
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleOpenFormattingModal(selectedCells)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-status-info hover:bg-status-info rounded text-xs font-medium text-white transition-colors"
                                >
                                    <Palette className="w-3.5 h-3.5" />
                                    Format
                                </button>
                                <button
                                    onClick={handleCopyCellQuery}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${copied
                                        ? 'bg-status-success text-white'
                                        : 'bg-accent-purple hover:bg-accent-purple text-white'
                                        }`}
                                >
                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? 'Copied!' : 'Copy Query'}
                                </button>
                                <button
                                    onClick={handleClearCellSelection}
                                    className="px-3 py-1.5 bg-border-default hover:bg-dark-elevated rounded text-xs text-text-primary transition-colors"
                                >
                                    Clear Selection
                                </button>
                            </div>
                        </div>
                        <pre className="bg-dark-card border border-border-default px-3 py-2 rounded text-sm font-mono text-accent-purple whitespace-pre-wrap break-all overflow-x-auto max-h-32 overflow-y-auto">
                            {cellSelectionQuery}
                        </pre>
                    </div>
                </div>
            )}

            {/* Summary Bar - Shows aggregations for selected column */}
            {!isEmbedded && columnSummary && (
                <div className="px-4 py-2 border-t border-status-warning/50 bg-gradient-to-r from-status-warning/10 to-dark-canvas/50">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-status-warning">
                            <BarChart3 className="w-4 h-4" />
                            <span className="text-xs font-medium">
                                "{columnSummary.columnName}" Summary
                            </span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Count */}
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-dark-elevated/80 rounded text-xs">
                                <Hash className="w-3 h-3 text-text-secondary" />
                                <span className="text-text-secondary">Count:</span>
                                <span className="text-status-warning font-medium">{columnSummary.count}</span>
                            </div>
                            {/* Non-Empty */}
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-dark-elevated/80 rounded text-xs">
                                <span className="text-text-secondary">Filled:</span>
                                <span className="text-status-success font-medium">{columnSummary.nonEmpty}</span>
                                {columnSummary.empty > 0 && (
                                    <span className="text-text-secondary">({columnSummary.empty} empty)</span>
                                )}
                            </div>
                            {/* Distinct - clickable to show modal */}
                            <button
                                onClick={() => setShowDistinctModal(true)}
                                className="flex items-center gap-1.5 px-2 py-1 bg-dark-elevated/80 hover:bg-accent-purple/20 rounded text-xs transition-colors group"
                            >
                                <Layers className="w-3 h-3 text-text-secondary group-hover:text-accent-purple" />
                                <span className="text-text-secondary group-hover:text-accent-purple">Distinct:</span>
                                <span className="text-status-info font-medium group-hover:text-accent-purple">{columnSummary.distinct}</span>
                            </button>
                            {/* Numeric stats (only for number columns) */}
                            {columnSummary.columnType === 'number' && columnSummary.sum !== undefined && (
                                <>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-dark-elevated/80 rounded text-xs">
                                        <Sigma className="w-3 h-3 text-text-secondary" />
                                        <span className="text-text-secondary">Sum:</span>
                                        <span className="text-accent-purple font-medium">
                                            {columnSummary.sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-dark-elevated/80 rounded text-xs">
                                        <Calculator className="w-3 h-3 text-text-secondary" />
                                        <span className="text-text-secondary">Avg:</span>
                                        <span className="text-accent-teal font-medium">
                                            {columnSummary.avg?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-dark-elevated/80 rounded text-xs">
                                        <TrendingDown className="w-3 h-3 text-text-secondary" />
                                        <span className="text-text-secondary">Min:</span>
                                        <span className="text-status-danger font-medium">{columnSummary.min}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-dark-elevated/80 rounded text-xs">
                                        <TrendingUp className="w-3 h-3 text-text-secondary" />
                                        <span className="text-text-secondary">Max:</span>
                                        <span className="text-status-success font-medium">{columnSummary.max}</span>
                                    </div>
                                </>
                            )}
                            {/* Min/Max for text columns */}
                            {(columnSummary.columnType === 'text' || columnSummary.columnType === 'date') && columnSummary.min !== undefined && (
                                <>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-dark-elevated/80 rounded text-xs">
                                        <TrendingDown className="w-3 h-3 text-text-secondary" />
                                        <span className="text-text-secondary">First:</span>
                                        <span className="text-text-primary font-medium truncate max-w-24" title={String(columnSummary.min)}>
                                            {String(columnSummary.min).slice(0, 12)}{String(columnSummary.min).length > 12 ? '...' : ''}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-dark-elevated/80 rounded text-xs">
                                        <TrendingUp className="w-3 h-3 text-text-secondary" />
                                        <span className="text-text-secondary">Last:</span>
                                        <span className="text-text-primary font-medium truncate max-w-24" title={String(columnSummary.max)}>
                                            {String(columnSummary.max).slice(0, 12)}{String(columnSummary.max).length > 12 ? '...' : ''}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* VDQL Query Bar - Shows when filtering */}
            {!isEmbedded && hasActiveFilters && (
                <div className="px-4 py-3 border-t border-accent-teal/50 bg-gradient-to-r from-accent-teal/10 to-dark-canvas/50">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-accent-teal">
                                <Filter className="w-4 h-4" />
                                <span className="text-xs font-medium">Generated VDQL Query</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCopyVDQL}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${copied
                                        ? 'bg-status-success text-white'
                                        : 'bg-accent-teal hover:bg-accent-teal text-white'
                                        }`}
                                >
                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? 'Copied!' : 'Copy Query'}
                                </button>
                                <button
                                    onClick={handleClearFilters}
                                    className="px-3 py-1.5 bg-border-default hover:bg-dark-elevated rounded text-xs text-text-primary transition-colors"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                        <pre className="bg-dark-card border border-border-default px-3 py-2 rounded text-sm font-mono text-accent-teal whitespace-pre-wrap break-all overflow-x-auto max-h-24 overflow-y-auto">
                            {vdqlQuery}
                        </pre>
                    </div>
                </div>
            )}

            {/* Footer */}
            {!isEmbedded && (
            <div className="px-4 py-2 border-t border-border-default bg-dark-canvas/50">
                <p className="text-xs text-text-muted">
                    {hasActiveFilters ? (
                        <span className="text-accent-teal">
                            <Code className="w-3 h-3 inline mr-1" />
                            Filter the table columns to generate VDQL queries automatically
                        </span>
                    ) : columnSummary ? (
                        <span className="text-accent-purple">
                            <Wand2 className="w-3 h-3 inline mr-1" />
                            Click a cell to see column summary. Click "Generate" to fill column with test data.
                        </span>
                    ) : (
                        <>
                            Reference in Vero: <code className="bg-dark-elevated px-1.5 py-0.5 rounded text-status-success">load $data from "{tableName}"</code>
                            <span className="ml-4">Tip: Click cells to see stats, use filters for VDQL</span>
                        </>
                    )}
                </p>
            </div>
            )}

            {showShortcutHelp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-lg rounded-lg border border-border-default bg-dark-card shadow-xl">
                        <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
                            <h3 className="text-sm font-semibold text-text-primary">Spreadsheet Shortcuts</h3>
                            <IconButton
                                icon={<X className="h-4 w-4" />}
                                size="sm"
                                variant="ghost"
                                tooltip="Close"
                                onClick={() => setShowShortcutHelp(false)}
                            />
                        </div>
                        <div className="space-y-2 px-4 py-3 text-xs text-text-secondary">
                            <div className="flex items-center justify-between rounded bg-dark-elevated/55 px-2.5 py-1.5">
                                <span>Undo</span>
                                <code className="text-status-info">Ctrl/Cmd + Z</code>
                            </div>
                            <div className="flex items-center justify-between rounded bg-dark-elevated/55 px-2.5 py-1.5">
                                <span>Redo</span>
                                <code className="text-status-info">Ctrl/Cmd + Shift + Z</code>
                            </div>
                            <div className="flex items-center justify-between rounded bg-dark-elevated/55 px-2.5 py-1.5">
                                <span>Find & Replace</span>
                                <code className="text-status-info">Ctrl/Cmd + H</code>
                            </div>
                            <div className="flex items-center justify-between rounded bg-dark-elevated/55 px-2.5 py-1.5">
                                <span>Multi-select cells</span>
                                <code className="text-status-info">Ctrl/Cmd + Click</code>
                            </div>
                            <div className="flex items-center justify-between rounded bg-dark-elevated/55 px-2.5 py-1.5">
                                <span>Open this help</span>
                                <code className="text-status-info">Shift + ?</code>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Data Generator Modal */}
            {showGeneratorModal && generatorColumn && (
                <DataGeneratorModal
                    isOpen={showGeneratorModal}
                    onClose={() => {
                        setShowGeneratorModal(false);
                        setGeneratorColumn(null);
                    }}
                    columnName={generatorColumn}
                    rowCount={rows.length}
                    onGenerate={handleGeneratedData}
                />
            )}

            {/* Bulk Update Modal */}
            {showBulkUpdateModal && onBulkUpdate && (
                <BulkUpdateModal
                    isOpen={showBulkUpdateModal}
                    onClose={() => setShowBulkUpdateModal(false)}
                    columns={columns}
                    rows={rows}
                    selectedRowIds={selectedRowIds}
                    filteredRowIds={hasActiveFilters ? filteredRowIds : undefined}
                    onUpdate={handleBulkUpdate}
                />
            )}

            {/* Cell Formatting Modal */}
            {showFormattingModal && formattingTarget && (
                <CellFormattingModal
                    isOpen={showFormattingModal}
                    onClose={() => {
                        setShowFormattingModal(false);
                        setFormattingTarget(null);
                    }}
                    currentFormat={cellFormats[`${formattingTarget.rowId}:${formattingTarget.column}`]}
                    cellValue={formattingTarget.value}
                    cellColumn={formattingTarget.column}
                    onApply={(format) => handleApplyCellFormat(format, selectedCells)}
                    onClear={() => handleClearCellFormat(selectedCells)}
                />
            )}

            {/* Multi-Sort Modal */}
            {showSortModal && (
                <MultiSortModal
                    isOpen={showSortModal}
                    onClose={() => setShowSortModal(false)}
                    columns={columns}
                    currentSort={sortLevels}
                    onApply={handleApplyMultiSort}
                />
            )}

            {/* Distinct Values Modal */}
            {showDistinctModal && columnSummary && (
                <DistinctValuesModal
                    isOpen={showDistinctModal}
                    onClose={() => setShowDistinctModal(false)}
                    columnName={columnSummary.columnName}
                    values={visibleRows.map(r => r.data[columnSummary.columnName])}
                    onFilterByValue={handleFilterByDistinctValue}
                />
            )}

            {/* Conditional Formatting Modal */}
            {showConditionalModal && (
                <ConditionalFormattingModal
                    isOpen={showConditionalModal}
                    onClose={() => setShowConditionalModal(false)}
                    columns={columns}
                    rules={conditionalRules}
                    onApply={setConditionalRules}
                />
            )}

            {/* Fill Column Modal */}
            {showFillColumnModal && fillColumnName && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-dark-card border border-border-default rounded-lg shadow-xl w-[420px]">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
                            <h3 className="text-sm font-medium text-white">Fill Column</h3>
                            <IconButton
                                icon={<X className="w-4 h-4" />}
                                size="sm"
                                variant="ghost"
                                tooltip="Close"
                                onClick={() => setShowFillColumnModal(false)}
                            />
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs text-text-secondary mb-1">
                                    Column: <span className="text-status-warning">{fillColumnName}</span>
                                </label>
                                <p className="text-xs text-text-muted">
                                    Fill all {rows.length} rows using value, sequence, or pattern.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs text-text-secondary mb-2">Fill Mode</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => {
                                            setFillType('value');
                                            setFillError(null);
                                        }}
                                        className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
                                            fillType === 'value'
                                                ? 'border-status-info/60 bg-status-info/20 text-text-primary'
                                                : 'border-border-default bg-dark-elevated text-text-secondary hover:text-text-primary'
                                        }`}
                                    >
                                        Value
                                    </button>
                                    <button
                                        onClick={() => {
                                            setFillType('sequence');
                                            setFillError(null);
                                        }}
                                        className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
                                            fillType === 'sequence'
                                                ? 'border-status-info/60 bg-status-info/20 text-text-primary'
                                                : 'border-border-default bg-dark-elevated text-text-secondary hover:text-text-primary'
                                        }`}
                                    >
                                        Sequence
                                    </button>
                                    <button
                                        onClick={() => {
                                            setFillType('pattern');
                                            setFillError(null);
                                        }}
                                        className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
                                            fillType === 'pattern'
                                                ? 'border-status-info/60 bg-status-info/20 text-text-primary'
                                                : 'border-border-default bg-dark-elevated text-text-secondary hover:text-text-primary'
                                        }`}
                                    >
                                        Pattern
                                    </button>
                                </div>
                            </div>

                            {fillType === 'value' && (
                                <div>
                                    <label className="block text-xs text-text-secondary mb-1">Value</label>
                                    <input
                                        type="text"
                                        value={fillValue}
                                        onChange={(e) => {
                                            setFillValue(e.target.value);
                                            setFillError(null);
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleFillColumn()}
                                        placeholder="Enter value (e.g., 0, N/A, default)"
                                        className="w-full px-3 py-2 bg-dark-canvas border border-border-default rounded-md text-sm text-white placeholder-text-muted focus:outline-none focus:border-status-info"
                                        autoFocus
                                    />
                                </div>
                            )}

                            {(fillType === 'sequence' || fillType === 'pattern') && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-text-secondary mb-1">Start</label>
                                        <input
                                            type="number"
                                            value={fillStartValue}
                                            onChange={(e) => {
                                                setFillStartValue(e.target.value);
                                                setFillError(null);
                                            }}
                                            className="w-full px-3 py-2 bg-dark-canvas border border-border-default rounded-md text-sm text-white placeholder-text-muted focus:outline-none focus:border-status-info"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-text-secondary mb-1">Step</label>
                                        <input
                                            type="number"
                                            value={fillStepValue}
                                            onChange={(e) => {
                                                setFillStepValue(e.target.value);
                                                setFillError(null);
                                            }}
                                            className="w-full px-3 py-2 bg-dark-canvas border border-border-default rounded-md text-sm text-white placeholder-text-muted focus:outline-none focus:border-status-info"
                                        />
                                    </div>
                                </div>
                            )}

                            {fillType === 'pattern' && (
                                <div>
                                    <label className="block text-xs text-text-secondary mb-1">
                                        Pattern
                                    </label>
                                    <input
                                        type="text"
                                        value={fillPattern}
                                        onChange={(e) => {
                                            setFillPattern(e.target.value);
                                            setFillError(null);
                                        }}
                                        placeholder="e.g., User-{n}"
                                        className="w-full px-3 py-2 bg-dark-canvas border border-border-default rounded-md text-sm text-white placeholder-text-muted focus:outline-none focus:border-status-info"
                                    />
                                    <p className="mt-1 text-xxs text-text-muted">Use <code>{'{n}'}</code> as the running value placeholder.</p>
                                </div>
                            )}

                            <div className="rounded-md border border-border-default bg-dark-elevated/40 px-3 py-2">
                                <p className="text-xxs text-text-secondary mb-1">Preview</p>
                                <p className="text-xs text-text-primary font-mono">
                                    {fillPreviewValues.length > 0 ? fillPreviewValues.join(', ') : 'Invalid numeric settings'}
                                </p>
                            </div>

                            {fillError && (
                                <p className="text-xs text-status-danger">{fillError}</p>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-default">
                            <button
                                onClick={() => setShowFillColumnModal(false)}
                                className="px-3 py-1.5 text-xs text-text-secondary hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFillColumn}
                                className="px-3 py-1.5 bg-status-info hover:bg-status-info/80 rounded-md text-xs text-white transition-colors"
                            >
                                Apply Fill
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Find & Replace Modal */}
            {showFindReplaceModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-dark-card border border-border-default rounded-lg shadow-xl w-[420px]">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
                            <h3 className="text-sm font-medium text-white flex items-center gap-2">
                                <Search className="w-4 h-4 text-status-info" />
                                Find & Replace
                            </h3>
                            <IconButton
                                icon={<X className="w-4 h-4" />}
                                size="sm"
                                variant="ghost"
                                tooltip="Close"
                                onClick={() => setShowFindReplaceModal(false)}
                            />
                        </div>
                        <div className="p-4 space-y-4">
                            {/* Find Input */}
                            <div>
                                <label className="block text-xs text-text-secondary mb-1">Find</label>
                                <input
                                    type="text"
                                    value={findText}
                                    onChange={(e) => setFindText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleFind()}
                                    placeholder="Text to find..."
                                    className="w-full px-3 py-2 bg-dark-canvas border border-border-default rounded-md text-sm text-white placeholder-text-muted focus:outline-none focus:border-status-info"
                                    autoFocus
                                />
                            </div>

                            {/* Replace Input */}
                            <div>
                                <label className="block text-xs text-text-secondary mb-1">Replace with</label>
                                <input
                                    type="text"
                                    value={replaceText}
                                    onChange={(e) => setReplaceText(e.target.value)}
                                    placeholder="Replacement text..."
                                    className="w-full px-3 py-2 bg-dark-canvas border border-border-default rounded-md text-sm text-white placeholder-text-muted focus:outline-none focus:border-status-info"
                                />
                            </div>

                            {/* Options Row */}
                            <div className="flex items-center gap-4">
                                {/* Column Selection */}
                                <div className="flex-1">
                                    <label className="block text-xs text-text-secondary mb-1">In column</label>
                                    <select
                                        value={findInColumn}
                                        onChange={(e) => setFindInColumn(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-dark-canvas border border-border-default rounded-md text-xs text-white focus:outline-none focus:border-status-info"
                                    >
                                        <option value="__all__">All columns</option>
                                        {columns.map(col => (
                                            <option key={col.name} value={col.name}>{col.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Checkboxes */}
                                <div className="flex flex-col gap-1 pt-4">
                                    <label className="flex items-center gap-2 text-xs text-text-primary cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={matchCase}
                                            onChange={(e) => setMatchCase(e.target.checked)}
                                            className="w-3.5 h-3.5 rounded border-border-default bg-dark-canvas text-status-info"
                                        />
                                        Match case
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-text-primary cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={matchWholeCell}
                                            onChange={(e) => setMatchWholeCell(e.target.checked)}
                                            className="w-3.5 h-3.5 rounded border-border-default bg-dark-canvas text-status-info"
                                        />
                                        Whole cell
                                    </label>
                                </div>
                            </div>

                            {/* Results */}
                            {findText && (
                                <div className="p-3 bg-dark-canvas rounded-md border border-border-default">
                                    {findResults.length === 0 ? (
                                        <p className="text-xs text-text-muted">No matches found</p>
                                    ) : (
                                        <div>
                                            <p className="text-xs text-status-success mb-2">
                                                Found {findResults.length} match{findResults.length !== 1 ? 'es' : ''}
                                            </p>
                                            <div className="max-h-32 overflow-y-auto space-y-1">
                                                {findResults.slice(0, 10).map((r, i) => (
                                                    <div key={i} className="text-xs text-text-secondary truncate">
                                                        <span className="text-text-muted">{r.column}:</span> {r.value}
                                                    </div>
                                                ))}
                                                {findResults.length > 10 && (
                                                    <div className="text-xs text-text-muted">
                                                        ...and {findResults.length - 10} more
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
                            <button
                                onClick={handleFind}
                                className="px-3 py-1.5 bg-border-default hover:bg-dark-elevated rounded-md text-xs text-white transition-colors"
                            >
                                Find All
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowFindReplaceModal(false)}
                                    className="px-3 py-1.5 text-xs text-text-secondary hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReplaceAll}
                                    disabled={findResults.length === 0}
                                    className={`px-3 py-1.5 rounded-md text-xs text-white transition-colors ${
                                        findResults.length === 0
                                            ? 'bg-border-default text-text-muted cursor-not-allowed'
                                            : 'bg-status-info hover:bg-status-info'
                                    }`}
                                >
                                    Replace All ({findResults.length})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default AGGridDataTable;
