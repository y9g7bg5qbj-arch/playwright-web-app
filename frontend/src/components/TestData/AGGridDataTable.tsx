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

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
    ColDef,
    GridReadyEvent,
    CellValueChangedEvent,
    SelectionChangedEvent,
    GetRowIdParams,
    ProcessDataFromClipboardParams,
    FilterChangedEvent,
    CellClickedEvent,
    themeQuartz,
    ModuleRegistry,
    AllCommunityModule,
} from 'ag-grid-community';
import { Plus, Trash2, Copy, Filter, Check, Code, MousePointer, BarChart3, Hash, Calculator, TrendingUp, TrendingDown, Sigma, Search, X, AlertCircle, CopyPlus, Wand2, Edit3, Pin, PinOff, Eye, EyeOff, ChevronDown, Columns3, Palette, ArrowUpDown, Layers, Zap, FileDown, FileUp, LayoutGrid, Undo2, Redo2, Type, LetterText } from 'lucide-react';
// Note: Download/Upload icons replaced with FileDown/FileUp for clearer semantics
import { DataGeneratorModal } from './DataGeneratorModal';
import { BulkUpdateModal, type BulkUpdate } from './BulkUpdateModal';
import { CellFormattingModal, type CellFormat } from './CellFormattingModal';
import { MultiSortModal, type SortLevel } from './MultiSortModal';
import { DistinctValuesModal } from './DistinctValuesModal';
import { ConditionalFormattingModal, type ConditionalFormatRule } from './ConditionalFormattingModal';
import { ReferenceCellEditor } from './ReferenceCellEditor';
import { ReferenceCellRenderer } from './ReferenceCellRenderer';

// Register AG Grid Community modules (required for v35+)
ModuleRegistry.registerModules([AllCommunityModule]);

// Create a dark variant of the Quartz theme (GitHub dark colors)
const darkTheme = themeQuartz.withParams({
    backgroundColor: '#0d1117',
    headerBackgroundColor: '#161b22',
    oddRowBackgroundColor: '#0d1117',
    rowHoverColor: '#21262d',
    borderColor: '#30363d',
    headerTextColor: '#8b949e',
    foregroundColor: '#c9d1d9',
    selectedRowBackgroundColor: '#388bfd22',
    accentColor: '#58a6ff',
});

// ============================================
// VDQL GENERATION FROM AG GRID FILTERS
// ============================================

/**
 * Convert AG Grid filter model to VDQL query string
 */
function filterModelToVDQL(
    filterModel: Record<string, any>,
    tableName: string,
    columns: DataColumn[]
): string {
    const conditions: string[] = [];

    for (const [columnName, filter] of Object.entries(filterModel)) {
        const column = columns.find(c => c.name === columnName);
        const isText = !column || column.type === 'text' || column.type === 'date';

        if (filter.filterType === 'text') {
            const condition = convertTextFilter(columnName, filter, isText);
            if (condition) conditions.push(condition);
        } else if (filter.filterType === 'number') {
            const condition = convertNumberFilter(columnName, filter);
            if (condition) conditions.push(condition);
        } else if (filter.operator) {
            // Combined filter (AND/OR)
            const subConditions: string[] = [];
            if (filter.condition1) {
                const cond = filter.filterType === 'text'
                    ? convertTextFilter(columnName, filter.condition1, isText)
                    : convertNumberFilter(columnName, filter.condition1);
                if (cond) subConditions.push(cond);
            }
            if (filter.condition2) {
                const cond = filter.filterType === 'text'
                    ? convertTextFilter(columnName, filter.condition2, isText)
                    : convertNumberFilter(columnName, filter.condition2);
                if (cond) subConditions.push(cond);
            }
            if (subConditions.length === 2) {
                const op = filter.operator.toLowerCase();
                conditions.push(`(${subConditions.join(` ${op} `)})`);
            } else if (subConditions.length === 1) {
                conditions.push(subConditions[0]);
            }
        }
    }

    // Convert table name to PascalCase
    const pascalTableName = tableName
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');

    if (conditions.length === 0) {
        return `data result = TestData.${pascalTableName}`;
    }

    return `data result = TestData.${pascalTableName} where ${conditions.join(' and ')}`;
}

function convertTextFilter(columnName: string, filter: any, isText: boolean): string | null {
    const value = filter.filter;
    if (value === undefined || value === null || value === '') return null;

    const quotedValue = isText ? `"${value}"` : value;

    switch (filter.type) {
        case 'equals':
            return `${columnName} == ${quotedValue}`;
        case 'notEqual':
            return `${columnName} != ${quotedValue}`;
        case 'contains':
            return `${columnName} contains ${quotedValue}`;
        case 'notContains':
            return `not (${columnName} contains ${quotedValue})`;
        case 'startsWith':
            return `${columnName} starts with ${quotedValue}`;
        case 'endsWith':
            return `${columnName} ends with ${quotedValue}`;
        case 'blank':
            return `${columnName} is empty`;
        case 'notBlank':
            return `${columnName} is not empty`;
        default:
            return `${columnName} == ${quotedValue}`;
    }
}

function convertNumberFilter(columnName: string, filter: any): string | null {
    const value = filter.filter;
    if (value === undefined || value === null) {
        if (filter.type === 'blank') return `${columnName} is empty`;
        if (filter.type === 'notBlank') return `${columnName} is not empty`;
        return null;
    }

    switch (filter.type) {
        case 'equals':
            return `${columnName} == ${value}`;
        case 'notEqual':
            return `${columnName} != ${value}`;
        case 'greaterThan':
            return `${columnName} > ${value}`;
        case 'greaterThanOrEqual':
            return `${columnName} >= ${value}`;
        case 'lessThan':
            return `${columnName} < ${value}`;
        case 'lessThanOrEqual':
            return `${columnName} <= ${value}`;
        case 'inRange':
            if (filter.filterTo !== undefined) {
                return `${columnName} >= ${value} and ${columnName} <= ${filter.filterTo}`;
            }
            return `${columnName} >= ${value}`;
        case 'blank':
            return `${columnName} is empty`;
        case 'notBlank':
            return `${columnName} is not empty`;
        default:
            return `${columnName} == ${value}`;
    }
}

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
}

export interface DataRow {
    id: string;
    data: Record<string, any>;
    order: number;
}

export interface AGGridDataTableProps {
    columns: DataColumn[];
    rows: DataRow[];
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
}

// ============================================
// SUMMARY BAR CALCULATIONS
// ============================================

interface ColumnSummary {
    columnName: string;
    columnType: DataColumn['type'];
    count: number;
    nonEmpty: number;
    empty: number;
    distinct: number;
    // Numeric only
    sum?: number;
    avg?: number;
    min?: number | string;
    max?: number | string;
}

/**
 * Calculate summary statistics for a column
 */
function calculateColumnSummary(
    columnName: string,
    columnType: DataColumn['type'],
    rows: { data: Record<string, any> }[]
): ColumnSummary {
    const values = rows.map(r => r.data[columnName]);
    const count = values.length;
    const nonEmptyValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const nonEmpty = nonEmptyValues.length;
    const empty = count - nonEmpty;
    const distinct = new Set(nonEmptyValues.map(v => String(v))).size;

    const summary: ColumnSummary = {
        columnName,
        columnType,
        count,
        nonEmpty,
        empty,
        distinct,
    };

    // Calculate numeric stats for number columns
    if (columnType === 'number') {
        const numericValues = nonEmptyValues
            .map(v => parseFloat(v))
            .filter(v => !isNaN(v));

        if (numericValues.length > 0) {
            summary.sum = numericValues.reduce((a, b) => a + b, 0);
            summary.avg = summary.sum / numericValues.length;
            summary.min = Math.min(...numericValues);
            summary.max = Math.max(...numericValues);
        }
    }

    // Calculate min/max for text/date columns (alphabetical)
    if ((columnType === 'text' || columnType === 'date') && nonEmptyValues.length > 0) {
        const sortedValues = [...nonEmptyValues].sort();
        summary.min = String(sortedValues[0]);
        summary.max = String(sortedValues[sortedValues.length - 1]);
    }

    return summary;
}

// Custom cell renderer for boolean type
const BooleanCellRenderer = (props: any) => {
    const value = props.value;
    return (
        <div className="flex items-center justify-center h-full">
            <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => {
                    props.node.setDataValue(props.column.getColId(), e.target.checked);
                }}
                className="w-4 h-4 rounded border-[#30363d] bg-[#21262d] text-emerald-500 focus:ring-emerald-500 cursor-pointer"
            />
        </div>
    );
};

// Custom cell editor for date type
const DateCellEditor = (props: any) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState(props.value || '');

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            props.stopEditing();
        }
        if (event.key === 'Escape') {
            props.stopEditing(true);
        }
    };

    return (
        <input
            ref={inputRef}
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full h-full bg-[#21262d] border-0 text-[#e6edf3] px-2"
            autoFocus
        />
    );
};

export function AGGridDataTable({
    columns,
    rows,
    tableName,
    onCellChange,
    onRowAdd,
    onRowDelete,
    onRowsDelete,
    onColumnAdd,
    onColumnEdit,
    // These props are available for future column management features
    onColumnRemove: _onColumnRemove,
    onColumnRename: _onColumnRename,
    onColumnTypeChange: _onColumnTypeChange,
    onBulkPaste,
    onExportCSV,
    onImportCSV,
    onGenerateColumnData,
    onBulkUpdate,
    onRowsDuplicate,
    onFillSeries,
    loading = false,
}: AGGridDataTableProps) {
    // Suppress unused variable warnings - these will be used in column context menus
    void _onColumnRemove;
    void _onColumnRename;
    void _onColumnTypeChange;
    const gridRef = useRef<AgGridReact>(null);
    const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
    const [vdqlQuery, setVdqlQuery] = useState<string>('');
    const [hasActiveFilters, setHasActiveFilters] = useState(false);
    const [copied, setCopied] = useState(false);

    // Cell selection state for VDQL generation
    interface SelectedCell {
        rowIndex: number;
        column: string;
        value: any;
        columnType: string;
    }
    const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([]);
    const [cellSelectionQuery, setCellSelectionQuery] = useState<string>('');

    // Summary bar state - tracks selected column for aggregation
    const [columnSummary, setColumnSummary] = useState<ColumnSummary | null>(null);

    // Quick filter state
    const [quickSearch, setQuickSearch] = useState<string>('');
    const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);

    // Data generator modal state
    const [showGeneratorModal, setShowGeneratorModal] = useState(false);
    const [generatorColumn, setGeneratorColumn] = useState<string | null>(null);

    // Bulk update modal state
    const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
    const [filteredRowIds, setFilteredRowIds] = useState<string[]>([]);

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
    const [fillValue, setFillValue] = useState('');

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

    // Cell formatting state - key is "rowId:columnName"
    const [cellFormats, setCellFormats] = useState<Record<string, CellFormat>>({});
    const [showFormattingModal, setShowFormattingModal] = useState(false);
    const [formattingTarget, setFormattingTarget] = useState<{ rowId: string; column: string; value: string } | null>(null);

    // Multi-column sorting state
    const [sortLevels, setSortLevels] = useState<SortLevel[]>([]);
    const [showSortModal, setShowSortModal] = useState(false);

    // Distinct values modal state
    const [showDistinctModal, setShowDistinctModal] = useState(false);

    // Conditional formatting state
    const [conditionalRules, setConditionalRules] = useState<ConditionalFormatRule[]>([]);
    const [showConditionalModal, setShowConditionalModal] = useState(false);

    // Convert rows to AG Grid format - separate frozen and regular rows
    const { rowData, pinnedTopRowData } = useMemo(() => {
        const allData = rows.map((row) => ({
            _id: row.id,
            _order: row.order,
            ...row.data,
        }));

        // Separate frozen rows (pinned to top) from regular rows
        const frozen = allData.filter(row => frozenRowIds.includes(row._id));
        const regular = allData.filter(row => !frozenRowIds.includes(row._id));

        console.log('[AGGrid] rowData:', regular);
        console.log('[AGGrid] pinnedTopRowData:', frozen);
        console.log('[AGGrid] columns:', columns);

        return { rowData: regular, pinnedTopRowData: frozen };
    }, [rows, columns, frozenRowIds]);

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
                cellClass: 'text-[#8b949e] text-xs',
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
                    field: col.name,
                    editable: col.type !== 'boolean', // Boolean uses custom renderer with checkbox
                    resizable: true,
                    sortable: true,
                    filter: true,
                    minWidth: 100,
                    flex: isFrozen ? undefined : 1, // Don't use flex for pinned columns
                    width: isFrozen ? 150 : undefined,
                    pinned: isFrozen ? 'left' : undefined,
                    // Add column header context menu with Edit option
                    mainMenuItems: onColumnEdit ? [
                        {
                            name: 'Edit Column',
                            action: () => onColumnEdit(col.name),
                            icon: '<span class="ag-icon ag-icon-edit"></span>',
                        },
                        'separator',
                        'sortAscending',
                        'sortDescending',
                        'separator',
                        'autoSizeThis',
                        'autoSizeAll',
                        'separator',
                        'resetColumns',
                    ] : undefined,
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
                                    console.log('[AGGrid] ReferenceCellEditor onSave:', rowId, col.name, newValue);
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
                <button
                    onClick={() => onRowDelete(params.data._id)}
                    className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-opacity"
                    title="Delete row"
                >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
            ),
            cellClass: 'flex items-center justify-center group',
        });

        return defs;
    }, [columns, onRowDelete, frozenColumns, hiddenColumns, cellFormats, conditionalRules]);

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
        const rowId = event.data._id;
        const field = event.colDef.field;
        const newValue = event.newValue;
        const oldValue = event.oldValue;

        if (field && field !== '_id' && field !== '_order' && field !== '_actions') {
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
    }, [onCellChange, MAX_HISTORY]);

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
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo]);

    // Handle selection changes
    const onSelectionChanged = useCallback((event: SelectionChangedEvent) => {
        const selectedNodes = event.api.getSelectedNodes();
        const ids = selectedNodes.map((node) => node.data._id);
        setSelectedRowIds(ids);
    }, []);

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
    }, []);

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
    }, [tableName, columns]);

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

    // Generate VDQL from selected cells
    const generateCellSelectionVDQL = useCallback((cells: SelectedCell[]) => {
        if (cells.length === 0) {
            setCellSelectionQuery('');
            return;
        }

        const pascalTableName = tableName
            .replace(/[^a-zA-Z0-9]/g, ' ')
            .split(' ')
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');

        // Group cells by what type of query makes sense
        const uniqueColumns = [...new Set(cells.map(c => c.column))];
        const uniqueRows = [...new Set(cells.map(c => c.rowIndex))];

        // If all cells are from same column - generate column filter
        if (uniqueColumns.length === 1 && cells.length > 1) {
            const col = uniqueColumns[0];
            const colType = cells[0].columnType;
            const values = cells.map(c => {
                if (colType === 'text' || colType === 'date') {
                    return `"${c.value}"`;
                }
                return c.value;
            });
            const query = `data result = TestData.${pascalTableName} where ${col} in (${values.join(', ')})`;
            setCellSelectionQuery(query);
            return;
        }

        // If single cell - generate exact match query
        if (cells.length === 1) {
            const cell = cells[0];
            const formattedValue = (cell.columnType === 'text' || cell.columnType === 'date')
                ? `"${cell.value}"`
                : cell.value;

            // Also provide cell access syntax
            const queries = [
                `# Filter by value:`,
                `data result = TestData.${pascalTableName} where ${cell.column} == ${formattedValue}`,
                ``,
                `# Direct cell access:`,
                `text value = TestData.${pascalTableName}[${cell.rowIndex}].${cell.column}`,
            ];
            setCellSelectionQuery(queries.join('\n'));
            return;
        }

        // Multiple cells from different columns - generate AND conditions
        const conditions = cells.map(cell => {
            const formattedValue = (cell.columnType === 'text' || cell.columnType === 'date')
                ? `"${cell.value}"`
                : cell.value;
            return `${cell.column} == ${formattedValue}`;
        });

        // If same row, use AND; if different rows, show multiple queries
        if (uniqueRows.length === 1) {
            const query = `data result = TestData.${pascalTableName} where ${conditions.join(' and ')}`;
            setCellSelectionQuery(query);
        } else {
            // Multiple rows selected - use OR for each row's conditions
            const rowQueries = uniqueRows.map(rowIdx => {
                const rowCells = cells.filter(c => c.rowIndex === rowIdx);
                const rowConditions = rowCells.map(cell => {
                    const formattedValue = (cell.columnType === 'text' || cell.columnType === 'date')
                        ? `"${cell.value}"`
                        : cell.value;
                    return `${cell.column} == ${formattedValue}`;
                });
                return `(${rowConditions.join(' and ')})`;
            });
            const query = `data result = TestData.${pascalTableName} where ${rowQueries.join(' or ')}`;
            setCellSelectionQuery(query);
        }
    }, [tableName]);

    // Calculate summary when cells in a column are selected
    const updateColumnSummary = useCallback((cells: SelectedCell[]) => {
        if (cells.length === 0) {
            setColumnSummary(null);
            return;
        }

        // Get the most recently selected column for summary
        const lastCell = cells[cells.length - 1];
        const colName = lastCell.column;
        const column = columns.find(c => c.name === colName);

        if (column) {
            const summary = calculateColumnSummary(colName, column.type, rows);
            setColumnSummary(summary);
        }
    }, [columns, rows]);

    // Handle cell click - Ctrl+click for multi-select
    const onCellClicked = useCallback((event: CellClickedEvent) => {
        const field = event.colDef.field;

        // Ignore clicks on system columns
        if (!field || field.startsWith('_')) return;

        const column = columns.find(c => c.name === field);
        const cellData: SelectedCell = {
            rowIndex: event.rowIndex ?? 0,
            column: field,
            value: event.value,
            columnType: column?.type || 'text',
        };

        if (event.event && (event.event as MouseEvent).ctrlKey) {
            // Ctrl+click: add to selection
            setSelectedCells(prev => {
                // Check if already selected (toggle off)
                const existingIndex = prev.findIndex(
                    c => c.rowIndex === cellData.rowIndex && c.column === cellData.column
                );
                if (existingIndex >= 0) {
                    const newCells = prev.filter((_, i) => i !== existingIndex);
                    generateCellSelectionVDQL(newCells);
                    updateColumnSummary(newCells);
                    return newCells;
                }
                const newCells = [...prev, cellData];
                generateCellSelectionVDQL(newCells);
                updateColumnSummary(newCells);
                return newCells;
            });
        } else {
            // Regular click: single selection
            setSelectedCells([cellData]);
            generateCellSelectionVDQL([cellData]);
            updateColumnSummary([cellData]);
        }
    }, [columns, generateCellSelectionVDQL, updateColumnSummary]);

    // Clear cell selection
    const handleClearCellSelection = useCallback(() => {
        setSelectedCells([]);
        setCellSelectionQuery('');
        setColumnSummary(null);
    }, []);

    // Copy cell selection query
    const handleCopyCellQuery = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(cellSelectionQuery);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, [cellSelectionQuery]);

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
        setFillValue('');
        setShowFillColumnModal(true);
        setShowDataDropdown(false);
    }, []);

    const handleFillColumn = useCallback(async () => {
        if (!onFillSeries || !fillColumnName) return;
        const allRowIds = rows.map(r => r.id);
        await onFillSeries(allRowIds, fillColumnName, 'value', { value: fillValue });
        setShowFillColumnModal(false);
        setFillColumnName(null);
        setFillValue('');
    }, [onFillSeries, fillColumnName, fillValue, rows]);

    // Find & Replace handlers
    const handleFind = useCallback(() => {
        if (!findText) {
            setFindResults([]);
            return;
        }

        const results: { rowId: string; column: string; value: string }[] = [];
        const searchText = matchCase ? findText : findText.toLowerCase();

        for (const row of rows) {
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
    }, [findText, findInColumn, matchCase, matchWholeCell, rows, columns]);

    const handleReplaceAll = useCallback(async () => {
        if (!findText || findResults.length === 0) return;

        // Group by row for efficient updates
        const updatesByRow = new Map<string, Record<string, string>>();

        for (const result of findResults) {
            const row = rows.find(r => r.id === result.rowId);
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
    }, [findText, replaceText, findResults, matchCase, matchWholeCell, rows, onCellChange]);

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

    // Cell formatting handlers
    const handleOpenFormattingModal = useCallback(() => {
        if (selectedCells.length > 0) {
            const firstCell = selectedCells[0];
            const row = rows.find((_, idx) => idx === firstCell.rowIndex);
            if (row) {
                setFormattingTarget({
                    rowId: row.id,
                    column: firstCell.column,
                    value: String(firstCell.value ?? ''),
                });
                setShowFormattingModal(true);
            }
        }
    }, [selectedCells, rows]);

    const handleApplyCellFormat = useCallback((format: CellFormat) => {
        if (!formattingTarget) return;

        // Apply format to all selected cells
        const newFormats = { ...cellFormats };
        selectedCells.forEach(cell => {
            const row = rows.find((_, idx) => idx === cell.rowIndex);
            if (row) {
                const key = `${row.id}:${cell.column}`;
                newFormats[key] = format;
            }
        });
        setCellFormats(newFormats);
        setShowFormattingModal(false);
        setFormattingTarget(null);
    }, [formattingTarget, selectedCells, rows, cellFormats]);

    const handleClearCellFormat = useCallback(() => {
        if (!formattingTarget) return;

        // Clear format from all selected cells
        const newFormats = { ...cellFormats };
        selectedCells.forEach(cell => {
            const row = rows.find((_, idx) => idx === cell.rowIndex);
            if (row) {
                const key = `${row.id}:${cell.column}`;
                delete newFormats[key];
            }
        });
        setCellFormats(newFormats);
        setShowFormattingModal(false);
        setFormattingTarget(null);
    }, [formattingTarget, selectedCells, rows, cellFormats]);

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
    }, []);

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

    // Debug: Log what we're rendering
    console.log('[AGGrid] Rendering with:', {
        rowCount: rowData.length,
        columnCount: columns.length,
        columnDefs: columnDefs.map(c => c.field),
        sampleRow: rowData[0]
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-[#8b949e]">
                Loading table...
            </div>
        );
    }

    // Show message if no columns defined
    if (columns.length === 0) {
        return (
            <div className="flex flex-col h-full bg-[#161b22]">
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#30363d] bg-[#0d1117]/50">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onColumnAdd}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-md text-xs text-white transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Column
                        </button>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-[#8b949e]">
                    <p className="text-lg mb-2">No columns defined</p>
                    <p className="text-sm mb-4">Add columns to start entering test data</p>
                    <button
                        onClick={onColumnAdd}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-md text-sm text-white transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add First Column
                    </button>
                </div>
            </div>
        );
    }

    // Count active view settings
    const activeViewCount = (hiddenColumns.length > 0 ? 1 : 0) + (sortLevels.length > 0 ? 1 : 0) + (conditionalRules.length > 0 ? 1 : 0);
    const activeFilterCount = (activeQuickFilter ? 1 : 0) + (hasActiveFilters ? 1 : 0) + (quickSearch ? 1 : 0);

    return (
        <div className="flex flex-col bg-[#161b22] h-full">
            {/* Toolbar - Simplified with Dropdown Groups */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#30363d] bg-[#0d1117]/50">
                <div className="flex items-center gap-2">
                    {/* Primary Actions - Always Visible */}
                    <button
                        onClick={onRowAdd}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-md text-xs text-white transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Row
                    </button>
                    <button
                        onClick={onColumnAdd}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#30363d] hover:bg-[#3d444d] rounded-md text-xs text-[#e6edf3] transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Column
                    </button>

                    <div className="h-4 w-px bg-[#30363d] mx-1" />

                    {/* Undo/Redo Buttons */}
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={handleUndo}
                            disabled={undoStack.length === 0}
                            title={`Undo (Ctrl+Z)${undoStack.length > 0 ? ` - ${undoStack.length} change${undoStack.length > 1 ? 's' : ''}` : ''}`}
                            className={`p-1.5 rounded-md text-xs transition-colors ${
                                undoStack.length > 0
                                    ? 'bg-[#30363d] hover:bg-[#3d444d] text-[#e6edf3]'
                                    : 'bg-[#21262d] text-[#484f58] cursor-not-allowed'
                            }`}
                        >
                            <Undo2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={handleRedo}
                            disabled={redoStack.length === 0}
                            title={`Redo (Ctrl+Y)${redoStack.length > 0 ? ` - ${redoStack.length} change${redoStack.length > 1 ? 's' : ''}` : ''}`}
                            className={`p-1.5 rounded-md text-xs transition-colors ${
                                redoStack.length > 0
                                    ? 'bg-[#30363d] hover:bg-[#3d444d] text-[#e6edf3]'
                                    : 'bg-[#21262d] text-[#484f58] cursor-not-allowed'
                            }`}
                        >
                            <Redo2 className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="h-4 w-px bg-[#30363d] mx-1" />

                    {/* Data Dropdown - Import/Export */}
                    <div className="relative" ref={dataDropdownRef}>
                        <button
                            onClick={() => {
                                setShowDataDropdown(!showDataDropdown);
                                setShowViewDropdown(false);
                                setShowFilterDropdown(false);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#30363d] hover:bg-[#3d444d] rounded-md text-xs text-[#e6edf3] transition-colors"
                        >
                            <FileDown className="w-3.5 h-3.5" />
                            Data
                            <ChevronDown className={`w-3 h-3 transition-transform ${showDataDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showDataDropdown && (
                            <div className="absolute top-full left-0 mt-1 w-52 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl z-50 overflow-hidden">
                                <button
                                    onClick={() => { onImportCSV(); setShowDataDropdown(false); }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                                >
                                    <FileUp className="w-3.5 h-3.5 text-sky-400" />
                                    Import CSV
                                </button>
                                <button
                                    onClick={() => { onExportCSV(); setShowDataDropdown(false); }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                                >
                                    <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                                    Export CSV
                                </button>
                                <div className="h-px bg-[#30363d] my-1" />
                                <button
                                    onClick={() => { setShowFindReplaceModal(true); setShowDataDropdown(false); }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                                >
                                    <Search className="w-3.5 h-3.5 text-blue-400" />
                                    Find & Replace
                                    <span className="ml-auto text-[10px] text-[#6e7681]">Ctrl+H</span>
                                </button>
                                {onGenerateColumnData && columnSummary && (
                                    <>
                                        <div className="h-px bg-[#30363d] my-1" />
                                        <button
                                            onClick={() => { handleOpenGenerator(columnSummary.columnName); setShowDataDropdown(false); }}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-purple-400 hover:bg-purple-600/20 transition-colors"
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
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-amber-400 hover:bg-amber-600/20 transition-colors"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        Fill "{columnSummary.columnName}" with Value
                                    </button>
                                )}
                                {/* Fill any column - always available */}
                                {onFillSeries && columns.length > 0 && !columnSummary && (
                                    <>
                                        <div className="h-px bg-[#30363d] my-1" />
                                        <div className="px-3 py-1 text-[10px] text-[#6e7681] uppercase">Fill Column</div>
                                        {columns.slice(0, 5).map(col => (
                                            <button
                                                key={col.name}
                                                onClick={() => handleOpenFillColumn(col.name)}
                                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                                            >
                                                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                                                {col.name}
                                            </button>
                                        ))}
                                        {columns.length > 5 && (
                                            <div className="px-3 py-1 text-[10px] text-[#6e7681]">
                                                Click a column header for more...
                                            </div>
                                        )}
                                    </>
                                )}
                                {/* Quick Transforms Section */}
                                {columnSummary && columns.find(c => c.name === columnSummary.columnName)?.type === 'text' && (
                                    <>
                                        <div className="h-px bg-[#30363d] my-1" />
                                        <div className="px-3 py-1 text-[10px] text-[#6e7681] uppercase">Transform "{columnSummary.columnName}"</div>
                                        <button
                                            onClick={() => handleQuickTransform(columnSummary.columnName, 'trim')}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                                        >
                                            <Type className="w-3.5 h-3.5 text-sky-400" />
                                            Trim Whitespace
                                        </button>
                                        <button
                                            onClick={() => handleQuickTransform(columnSummary.columnName, 'uppercase')}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                                        >
                                            <LetterText className="w-3.5 h-3.5 text-emerald-400" />
                                            UPPERCASE
                                        </button>
                                        <button
                                            onClick={() => handleQuickTransform(columnSummary.columnName, 'lowercase')}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                                        >
                                            <LetterText className="w-3.5 h-3.5 text-amber-400" />
                                            lowercase
                                        </button>
                                        <button
                                            onClick={() => handleQuickTransform(columnSummary.columnName, 'capitalize')}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                                        >
                                            <Type className="w-3.5 h-3.5 text-purple-400" />
                                            Capitalize Each Word
                                        </button>
                                        <button
                                            onClick={() => handleQuickTransform(columnSummary.columnName, 'sequence')}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                                        >
                                            <Hash className="w-3.5 h-3.5 text-orange-400" />
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
                                    ? 'bg-sky-600/20 text-sky-400 hover:bg-sky-600/30'
                                    : 'bg-[#30363d] hover:bg-[#3d444d] text-[#e6edf3]'
                            }`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            View
                            {activeViewCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-sky-600 text-white text-xs rounded-full">
                                    {activeViewCount}
                                </span>
                            )}
                            <ChevronDown className={`w-3 h-3 transition-transform ${showViewDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showViewDropdown && (
                            <div className="absolute top-full left-0 mt-1 w-56 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl z-50 overflow-hidden">
                                {/* Columns Section */}
                                <button
                                    onClick={() => { setShowColumnDropdown(true); setShowViewDropdown(false); }}
                                    className="flex items-center justify-between w-full px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Columns3 className="w-3.5 h-3.5 text-amber-400" />
                                        Column Visibility
                                    </div>
                                    {hiddenColumns.length > 0 && (
                                        <span className="px-1.5 py-0.5 bg-amber-600 text-white text-xs rounded-full">
                                            {hiddenColumns.length} hidden
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => { setShowSortModal(true); setShowViewDropdown(false); }}
                                    className="flex items-center justify-between w-full px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <ArrowUpDown className="w-3.5 h-3.5 text-purple-400" />
                                        Multi-Column Sort
                                    </div>
                                    {sortLevels.length > 0 && (
                                        <span className="px-1.5 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                                            {sortLevels.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => { setShowConditionalModal(true); setShowViewDropdown(false); }}
                                    className="flex items-center justify-between w-full px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-3.5 h-3.5 text-emerald-400" />
                                        Conditional Formatting
                                    </div>
                                    {conditionalRules.length > 0 && (
                                        <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-xs rounded-full">
                                            {conditionalRules.length}
                                        </span>
                                    )}
                                </button>
                                {/* Row Freezing Section */}
                                <div className="h-px bg-[#30363d] my-1" />
                                <div className="px-3 py-1 text-[10px] text-[#8b949e] uppercase tracking-wider">Row Pinning</div>
                                {selectedRowIds.length > 0 && (
                                    <button
                                        onClick={() => { handleFreezeSelectedRows(); setShowViewDropdown(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                                    >
                                        <Pin className="w-3.5 h-3.5 text-orange-400" />
                                        Freeze Selected Rows ({selectedRowIds.length})
                                    </button>
                                )}
                                {frozenRowIds.length > 0 && (
                                    <button
                                        onClick={() => { handleUnfreezeAllRows(); setShowViewDropdown(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-orange-400 hover:bg-orange-600/20 transition-colors"
                                    >
                                        <PinOff className="w-3.5 h-3.5" />
                                        Unfreeze All Rows ({frozenRowIds.length})
                                    </button>
                                )}
                                {selectedRowIds.length === 0 && frozenRowIds.length === 0 && (
                                    <div className="px-3 py-2 text-xs text-[#6e7681]">
                                        Select rows to freeze them
                                    </div>
                                )}
                                {/* Column Freezing Section */}
                                {(frozenColumns.length > 0) && (
                                    <>
                                        <div className="h-px bg-[#30363d] my-1" />
                                        <button
                                            onClick={() => { handleUnfreezeAll(); setShowViewDropdown(false); }}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-sky-400 hover:bg-sky-600/20 transition-colors"
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
                                    ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30'
                                    : 'bg-[#30363d] hover:bg-[#3d444d] text-[#e6edf3]'
                            }`}
                        >
                            <Filter className="w-3.5 h-3.5" />
                            Filter
                            {activeFilterCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-amber-600 text-white text-xs rounded-full">
                                    {activeFilterCount}
                                </span>
                            )}
                            <ChevronDown className={`w-3 h-3 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showFilterDropdown && (
                            <div className="absolute top-full left-0 mt-1 w-48 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl z-50 overflow-hidden">
                                <button
                                    onClick={() => { handleShowEmpty(); setShowFilterDropdown(false); }}
                                    className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors ${
                                        activeQuickFilter === 'empty'
                                            ? 'bg-amber-600/20 text-amber-400'
                                            : 'text-[#c9d1d9] hover:bg-[#21262d]'
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
                                            ? 'bg-purple-600/20 text-purple-400'
                                            : 'text-[#c9d1d9] hover:bg-[#21262d]'
                                    }`}
                                >
                                    <CopyPlus className="w-3.5 h-3.5" />
                                    Show Duplicates
                                    {activeQuickFilter === 'duplicates' && <Check className="w-3 h-3 ml-auto" />}
                                </button>
                                {(hasActiveFilters || quickSearch || activeQuickFilter) && (
                                    <>
                                        <div className="h-px bg-[#30363d] my-1" />
                                        <button
                                            onClick={() => { handleClearQuickFilters(); setShowFilterDropdown(false); }}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-red-600/20 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                            Clear All Filters
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="h-4 w-px bg-[#30363d] mx-1" />

                    {/* Quick Search - Always Visible */}
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8b949e]" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={quickSearch}
                            onChange={(e) => handleQuickSearch(e.target.value)}
                            className="w-36 pl-7 pr-7 py-1.5 text-xs bg-[#21262d] border border-[#30363d] rounded-md text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-blue-500 focus:w-48 transition-all"
                        />
                        {quickSearch && (
                            <button
                                onClick={handleClearQuickSearch}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#c9d1d9]"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Side - Contextual Actions */}
                <div className="flex items-center gap-2">
                    {/* Update Filtered button */}
                    {onBulkUpdate && hasActiveFilters && filteredRowIds.length > 0 && (
                        <button
                            onClick={() => setShowBulkUpdateModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded-md text-xs text-white transition-colors"
                            title={`Update ${filteredRowIds.length} filtered rows`}
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                            Update {filteredRowIds.length}
                        </button>
                    )}

                    {/* Selection Actions */}
                    {selectedRowIds.length > 0 && (
                        <div className="flex items-center gap-1.5 pl-2 border-l border-[#30363d]">
                            <span className="text-xs text-[#8b949e] mr-1">
                                {selectedRowIds.length} selected
                            </span>
                            {onBulkUpdate && (
                                <button
                                    onClick={() => setShowBulkUpdateModal(true)}
                                    className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded text-white transition-colors"
                                    title="Update selected"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                onClick={handleCopySelected}
                                className="p-1.5 bg-[#30363d] hover:bg-[#3d444d] rounded text-[#c9d1d9] transition-colors"
                                title="Copy selected"
                            >
                                <Copy className="w-3.5 h-3.5" />
                            </button>
                            {onRowsDuplicate && (
                                <button
                                    onClick={handleDuplicateSelected}
                                    className="p-1.5 bg-sky-600/20 hover:bg-sky-600/40 rounded text-sky-400 transition-colors"
                                    title="Duplicate selected"
                                >
                                    <CopyPlus className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                onClick={handleDeleteSelected}
                                className="p-1.5 bg-red-600/20 hover:bg-red-600/40 rounded text-red-400 transition-colors"
                                title="Delete selected"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Row Count */}
                    <span className="text-xs text-[#6e7681] tabular-nums">
                        {rows.length} rows
                    </span>
                </div>
            </div>

            {/* Column Visibility Floating Panel (opened from View dropdown) */}
            {showColumnDropdown && (
                <div className="absolute top-14 left-48 z-50" ref={columnDropdownRef}>
                    <div className="w-64 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl overflow-hidden">
                        <div className="p-2 border-b border-[#30363d] bg-[#0d1117]/50">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-[#c9d1d9]">Column Visibility</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={handleShowAllColumns}
                                        className="px-2 py-0.5 text-xs text-sky-400 hover:bg-sky-500/20 rounded transition-colors"
                                    >
                                        Show All
                                    </button>
                                    <button
                                        onClick={handleHideAllColumns}
                                        className="px-2 py-0.5 text-xs text-[#8b949e] hover:bg-[#30363d] rounded transition-colors"
                                    >
                                        Hide All
                                    </button>
                                    <button
                                        onClick={() => setShowColumnDropdown(false)}
                                        className="p-0.5 text-[#8b949e] hover:text-white rounded transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
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
                                        className="flex items-center justify-between px-3 py-2 hover:bg-[#21262d] transition-colors group"
                                    >
                                        <button
                                            onClick={() => handleToggleColumnVisibility(col.name)}
                                            className="flex items-center gap-2 flex-1"
                                        >
                                            {isHidden ? (
                                                <EyeOff className="w-3.5 h-3.5 text-[#6e7681]" />
                                            ) : (
                                                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                            )}
                                            <span className={`text-xs ${isHidden ? 'text-[#6e7681] line-through' : 'text-[#c9d1d9]'}`}>
                                                {col.name}
                                            </span>
                                            {col.type === 'reference' && (
                                                <span className="text-xs text-sky-400">🔗</span>
                                            )}
                                            {isFrozen && (
                                                <Pin className="w-3 h-3 text-sky-400" />
                                            )}
                                        </button>
                                        <div className="flex items-center gap-1">
                                            {onColumnEdit && (
                                                <button
                                                    onClick={() => {
                                                        onColumnEdit(col.name);
                                                        setShowColumnDropdown(false);
                                                    }}
                                                    className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-500/20 text-amber-400"
                                                    title="Edit column"
                                                >
                                                    <Edit3 className="w-3 h-3" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleFreezeColumn(col.name)}
                                                className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${isFrozen
                                                    ? 'bg-sky-500/20 text-sky-400'
                                                    : 'hover:bg-[#30363d] text-[#8b949e]'
                                                }`}
                                                title={isFrozen ? 'Unfreeze' : 'Freeze'}
                                                disabled={isHidden}
                                            >
                                                {isFrozen ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                                            </button>
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
                    onCellClicked={onCellClicked}
                    processDataFromClipboard={processDataFromClipboard}
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
            {selectedCells.length > 0 && cellSelectionQuery && (
                <div className="px-4 py-3 border-t border-purple-800/50 bg-gradient-to-r from-purple-950/50 to-[#0d1117]/50">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-purple-400">
                                <MousePointer className="w-4 h-4" />
                                <span className="text-xs font-medium">
                                    Cell Selection ({selectedCells.length} cell{selectedCells.length > 1 ? 's' : ''})
                                </span>
                                <span className="text-xs text-purple-500">
                                    Ctrl+click to select multiple
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleOpenFormattingModal}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 rounded text-xs font-medium text-white transition-colors"
                                >
                                    <Palette className="w-3.5 h-3.5" />
                                    Format
                                </button>
                                <button
                                    onClick={handleCopyCellQuery}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${copied
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-purple-600 hover:bg-purple-500 text-white'
                                        }`}
                                >
                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? 'Copied!' : 'Copy Query'}
                                </button>
                                <button
                                    onClick={handleClearCellSelection}
                                    className="px-3 py-1.5 bg-[#30363d] hover:bg-[#3d444d] rounded text-xs text-[#c9d1d9] transition-colors"
                                >
                                    Clear Selection
                                </button>
                            </div>
                        </div>
                        <pre className="bg-[#161b22] border border-[#30363d] px-3 py-2 rounded text-sm font-mono text-purple-300 whitespace-pre-wrap break-all overflow-x-auto max-h-32 overflow-y-auto">
                            {cellSelectionQuery}
                        </pre>
                    </div>
                </div>
            )}

            {/* Summary Bar - Shows aggregations for selected column */}
            {columnSummary && (
                <div className="px-4 py-2 border-t border-amber-800/50 bg-gradient-to-r from-amber-950/30 to-[#0d1117]/50">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-amber-400">
                            <BarChart3 className="w-4 h-4" />
                            <span className="text-xs font-medium">
                                "{columnSummary.columnName}" Summary
                            </span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Count */}
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-[#21262d]/80 rounded text-xs">
                                <Hash className="w-3 h-3 text-[#8b949e]" />
                                <span className="text-[#8b949e]">Count:</span>
                                <span className="text-amber-300 font-medium">{columnSummary.count}</span>
                            </div>
                            {/* Non-Empty */}
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-[#21262d]/80 rounded text-xs">
                                <span className="text-[#8b949e]">Filled:</span>
                                <span className="text-emerald-400 font-medium">{columnSummary.nonEmpty}</span>
                                {columnSummary.empty > 0 && (
                                    <span className="text-[#8b949e]">({columnSummary.empty} empty)</span>
                                )}
                            </div>
                            {/* Distinct - clickable to show modal */}
                            <button
                                onClick={() => setShowDistinctModal(true)}
                                className="flex items-center gap-1.5 px-2 py-1 bg-[#21262d]/80 hover:bg-purple-600/20 rounded text-xs transition-colors group"
                            >
                                <Layers className="w-3 h-3 text-[#8b949e] group-hover:text-purple-400" />
                                <span className="text-[#8b949e] group-hover:text-purple-300">Distinct:</span>
                                <span className="text-blue-400 font-medium group-hover:text-purple-400">{columnSummary.distinct}</span>
                            </button>
                            {/* Numeric stats (only for number columns) */}
                            {columnSummary.columnType === 'number' && columnSummary.sum !== undefined && (
                                <>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-[#21262d]/80 rounded text-xs">
                                        <Sigma className="w-3 h-3 text-[#8b949e]" />
                                        <span className="text-[#8b949e]">Sum:</span>
                                        <span className="text-purple-400 font-medium">
                                            {columnSummary.sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-[#21262d]/80 rounded text-xs">
                                        <Calculator className="w-3 h-3 text-[#8b949e]" />
                                        <span className="text-[#8b949e]">Avg:</span>
                                        <span className="text-cyan-400 font-medium">
                                            {columnSummary.avg?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-[#21262d]/80 rounded text-xs">
                                        <TrendingDown className="w-3 h-3 text-[#8b949e]" />
                                        <span className="text-[#8b949e]">Min:</span>
                                        <span className="text-red-400 font-medium">{columnSummary.min}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-[#21262d]/80 rounded text-xs">
                                        <TrendingUp className="w-3 h-3 text-[#8b949e]" />
                                        <span className="text-[#8b949e]">Max:</span>
                                        <span className="text-green-400 font-medium">{columnSummary.max}</span>
                                    </div>
                                </>
                            )}
                            {/* Min/Max for text columns */}
                            {(columnSummary.columnType === 'text' || columnSummary.columnType === 'date') && columnSummary.min !== undefined && (
                                <>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-[#21262d]/80 rounded text-xs">
                                        <TrendingDown className="w-3 h-3 text-[#8b949e]" />
                                        <span className="text-[#8b949e]">First:</span>
                                        <span className="text-[#c9d1d9] font-medium truncate max-w-24" title={String(columnSummary.min)}>
                                            {String(columnSummary.min).slice(0, 12)}{String(columnSummary.min).length > 12 ? '...' : ''}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-[#21262d]/80 rounded text-xs">
                                        <TrendingUp className="w-3 h-3 text-[#8b949e]" />
                                        <span className="text-[#8b949e]">Last:</span>
                                        <span className="text-[#c9d1d9] font-medium truncate max-w-24" title={String(columnSummary.max)}>
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
            {hasActiveFilters && (
                <div className="px-4 py-3 border-t border-teal-800/50 bg-gradient-to-r from-teal-950/50 to-[#0d1117]/50">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-teal-400">
                                <Filter className="w-4 h-4" />
                                <span className="text-xs font-medium">Generated VDQL Query</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCopyVDQL}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${copied
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-teal-600 hover:bg-teal-500 text-white'
                                        }`}
                                >
                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? 'Copied!' : 'Copy Query'}
                                </button>
                                <button
                                    onClick={handleClearFilters}
                                    className="px-3 py-1.5 bg-[#30363d] hover:bg-[#3d444d] rounded text-xs text-[#c9d1d9] transition-colors"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                        <pre className="bg-[#161b22] border border-[#30363d] px-3 py-2 rounded text-sm font-mono text-teal-300 whitespace-pre-wrap break-all overflow-x-auto max-h-24 overflow-y-auto">
                            {vdqlQuery}
                        </pre>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="px-4 py-2 border-t border-[#30363d] bg-[#0d1117]/50">
                <p className="text-xs text-[#6e7681]">
                    {hasActiveFilters ? (
                        <span className="text-teal-500">
                            <Code className="w-3 h-3 inline mr-1" />
                            Filter the table columns to generate VDQL queries automatically
                        </span>
                    ) : columnSummary ? (
                        <span className="text-purple-400">
                            <Wand2 className="w-3 h-3 inline mr-1" />
                            Click a cell to see column summary. Click "Generate" to fill column with test data.
                        </span>
                    ) : (
                        <>
                            Reference in Vero: <code className="bg-[#21262d] px-1.5 py-0.5 rounded text-emerald-400">load $data from "{tableName}"</code>
                            <span className="ml-4">Tip: Click cells to see stats, use filters for VDQL</span>
                        </>
                    )}
                </p>
            </div>

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
                    onApply={handleApplyCellFormat}
                    onClear={handleClearCellFormat}
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
                    values={rows.map(r => r.data[columnSummary.columnName])}
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
                    <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl w-80">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
                            <h3 className="text-sm font-medium text-white">Fill Column</h3>
                            <button
                                onClick={() => setShowFillColumnModal(false)}
                                className="p-1 hover:bg-[#30363d] rounded text-[#8b949e]"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs text-[#8b949e] mb-1">
                                    Column: <span className="text-amber-400">{fillColumnName}</span>
                                </label>
                                <p className="text-xs text-[#6e7681]">
                                    Fill all {rows.length} rows with this value
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs text-[#8b949e] mb-1">Value</label>
                                <input
                                    type="text"
                                    value={fillValue}
                                    onChange={(e) => setFillValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleFillColumn()}
                                    placeholder="Enter value (e.g., 0, N/A, default)"
                                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-sm text-white placeholder-[#6e7681] focus:outline-none focus:border-amber-500"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#30363d]">
                            <button
                                onClick={() => setShowFillColumnModal(false)}
                                className="px-3 py-1.5 text-xs text-[#8b949e] hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFillColumn}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded-md text-xs text-white transition-colors"
                            >
                                Fill All Rows
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Find & Replace Modal */}
            {showFindReplaceModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl w-[420px]">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
                            <h3 className="text-sm font-medium text-white flex items-center gap-2">
                                <Search className="w-4 h-4 text-blue-400" />
                                Find & Replace
                            </h3>
                            <button
                                onClick={() => setShowFindReplaceModal(false)}
                                className="p-1 hover:bg-[#30363d] rounded text-[#8b949e]"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            {/* Find Input */}
                            <div>
                                <label className="block text-xs text-[#8b949e] mb-1">Find</label>
                                <input
                                    type="text"
                                    value={findText}
                                    onChange={(e) => setFindText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleFind()}
                                    placeholder="Text to find..."
                                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-sm text-white placeholder-[#6e7681] focus:outline-none focus:border-blue-500"
                                    autoFocus
                                />
                            </div>

                            {/* Replace Input */}
                            <div>
                                <label className="block text-xs text-[#8b949e] mb-1">Replace with</label>
                                <input
                                    type="text"
                                    value={replaceText}
                                    onChange={(e) => setReplaceText(e.target.value)}
                                    placeholder="Replacement text..."
                                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-sm text-white placeholder-[#6e7681] focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* Options Row */}
                            <div className="flex items-center gap-4">
                                {/* Column Selection */}
                                <div className="flex-1">
                                    <label className="block text-xs text-[#8b949e] mb-1">In column</label>
                                    <select
                                        value={findInColumn}
                                        onChange={(e) => setFindInColumn(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-xs text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="__all__">All columns</option>
                                        {columns.map(col => (
                                            <option key={col.name} value={col.name}>{col.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Checkboxes */}
                                <div className="flex flex-col gap-1 pt-4">
                                    <label className="flex items-center gap-2 text-xs text-[#c9d1d9] cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={matchCase}
                                            onChange={(e) => setMatchCase(e.target.checked)}
                                            className="w-3.5 h-3.5 rounded border-[#30363d] bg-[#0d1117] text-blue-500"
                                        />
                                        Match case
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-[#c9d1d9] cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={matchWholeCell}
                                            onChange={(e) => setMatchWholeCell(e.target.checked)}
                                            className="w-3.5 h-3.5 rounded border-[#30363d] bg-[#0d1117] text-blue-500"
                                        />
                                        Whole cell
                                    </label>
                                </div>
                            </div>

                            {/* Results */}
                            {findText && (
                                <div className="p-3 bg-[#0d1117] rounded-md border border-[#30363d]">
                                    {findResults.length === 0 ? (
                                        <p className="text-xs text-[#6e7681]">No matches found</p>
                                    ) : (
                                        <div>
                                            <p className="text-xs text-emerald-400 mb-2">
                                                Found {findResults.length} match{findResults.length !== 1 ? 'es' : ''}
                                            </p>
                                            <div className="max-h-32 overflow-y-auto space-y-1">
                                                {findResults.slice(0, 10).map((r, i) => (
                                                    <div key={i} className="text-xs text-[#8b949e] truncate">
                                                        <span className="text-[#6e7681]">{r.column}:</span> {r.value}
                                                    </div>
                                                ))}
                                                {findResults.length > 10 && (
                                                    <div className="text-xs text-[#6e7681]">
                                                        ...and {findResults.length - 10} more
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 border-t border-[#30363d]">
                            <button
                                onClick={handleFind}
                                className="px-3 py-1.5 bg-[#30363d] hover:bg-[#3d444d] rounded-md text-xs text-white transition-colors"
                            >
                                Find All
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowFindReplaceModal(false)}
                                    className="px-3 py-1.5 text-xs text-[#8b949e] hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReplaceAll}
                                    disabled={findResults.length === 0}
                                    className={`px-3 py-1.5 rounded-md text-xs text-white transition-colors ${
                                        findResults.length === 0
                                            ? 'bg-[#30363d] text-[#6e7681] cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-500'
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
}

export default AGGridDataTable;
