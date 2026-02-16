/**
 * Shared types for the Test Data module.
 *
 * All types that were previously defined and exported from TestDataPage.tsx
 * are consolidated here so they can be imported independently.
 */

import type { AGGridDataTableHandle, DataColumn as AGDataColumn } from './AGGridDataTable';

export interface ReferenceConfig {
    targetSheet: string;
    targetColumn: string;
    displayColumn: string;
    allowMultiple: boolean;
    separator?: string;
}

export interface DataColumn {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'formula' | 'reference';
    required: boolean;
    validation?: {
        min?: number;
        max?: number;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        enum?: string[];
    };
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    enum?: string[];
    formula?: string; // For computed columns
    referenceConfig?: ReferenceConfig; // For reference columns
}

export interface DataSheet {
    id: string;
    name: string;
    pageObject?: string;
    description?: string;
    projectId?: string | null;
    columns: DataColumn[];
    rowCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface DataRow {
    id: string;
    sheetId: string;
    scenarioId: string;
    data: Record<string, any>;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface QualityRequiredField {
    column: string;
    missing: number;
    completionRate: number;
}

export interface QualityDuplicateCheck {
    column: string;
    duplicateRows: number;
    distinctValues: number;
    totalValues: number;
}

export interface QualityReportData {
    typeIssueCount: number;
    duplicateIssueCount: number;
    requiredGapCount: number;
    requiredFields: QualityRequiredField[];
    duplicateChecks: QualityDuplicateCheck[];
}

export interface TestDataPageProps {
    projectId: string;
    nestedProjectId?: string | null;
    /** Callback to insert a VDQL snippet into the Vero editor and switch to it */
    onInsertQuery?: (snippet: string) => void;
}

export interface PendingQueryApply {
    tableId: string;
    model: Record<string, unknown>;
}

export interface InspectorData {
    rowCount: number;
    columnCount: number;
    filteredRowCount: number;
    activeFilters: number;
    emptyChecks: { column: string; count: number }[];
    duplicateChecks: { column: string; count: number }[];
    validationIssueCount: number;
    validationChecks: { column: string; count: number }[];
}

/**
 * Return type for the useSheetOperations hook.
 * Groups all sheet/row/column CRUD state and handlers.
 */
export interface SheetOperations {
    sheets: DataSheet[];
    selectedSheetId: string | null;
    setSelectedSheetId: (id: string | null) => void;
    selectedSheet: DataSheet | null;
    rows: DataRow[];
    setRows: React.Dispatch<React.SetStateAction<DataRow[]>>;
    loading: boolean;
    loadingRows: boolean;
    sheetsRef: React.MutableRefObject<DataSheet[]>;
    gridHandleRef: React.MutableRefObject<AGGridDataTableHandle | null>;

    // Messages
    successMessage: string | null;
    errorMessage: string | null;
    showSuccess: (message: string) => void;
    showError: (message: string) => void;

    // Fetching
    fetchSheets: () => Promise<void>;
    fetchRows: (sheetId: string) => Promise<void>;

    // Sheet CRUD
    handleCreateSheet: (name: string, pageObject: string, description: string, columns: DataColumn[]) => Promise<void>;
    handleUpdateSheet: (id: string, updates: Partial<DataSheet>) => Promise<void>;
    handleDeleteSheet: (id: string) => Promise<void>;

    // Row CRUD
    handleAddRow: () => Promise<void>;
    handleUpdateRow: (rowId: string, updates: Partial<DataRow>) => Promise<void>;
    handleDeleteRow: (rowId: string) => Promise<void>;
    handleBulkDeleteRows: (rowIds: string[]) => Promise<void>;
    handleDuplicateRows: (rowIds: string[]) => Promise<void>;
    handleFillSeries: (
        rowIds: string[],
        columnId: string,
        fillType: 'value' | 'sequence' | 'pattern',
        options: { value?: string; startValue?: number; step?: number; pattern?: string }
    ) => Promise<void>;
    handleBulkPaste: (pastedRows: Record<string, any>[]) => Promise<void>;
    handleCellChange: (rowId: string, columnName: string, value: any) => Promise<void>;
    handleGenerateColumnData: (columnName: string, values: (string | number | boolean)[]) => Promise<void>;
    handleBulkUpdate: (updates: import('./BulkUpdateModal').BulkUpdate[]) => Promise<void>;

    // Column operations
    handleAddColumn: () => void;
    handleEditColumn: (columnName: string) => void;
    handleSaveColumn: (column: AGDataColumn) => Promise<void>;
    handleRemoveColumn: (columnName: string) => Promise<void>;
    handleRenameColumn: (oldName: string, newName: string) => Promise<void>;
    handleColumnTypeChange: (columnName: string, newType: AGDataColumn['type']) => Promise<void>;

    // Import/Export
    handleImportComplete: (result: import('@/api/testData').ImportResult) => void;
    handleExportCSV: () => void;
    handleCSVImport: (importedRows: Record<string, any>[], newColumns?: AGDataColumn[]) => Promise<void>;

    // Modal state
    showSheetForm: boolean;
    setShowSheetForm: (show: boolean) => void;
    editingSheet: DataSheet | null;
    setEditingSheet: (sheet: DataSheet | null) => void;
    showImportModal: boolean;
    setShowImportModal: (show: boolean) => void;
    showCSVImportModal: boolean;
    setShowCSVImportModal: (show: boolean) => void;
    showColumnEditor: boolean;
    setShowColumnEditor: (show: boolean) => void;
    editingColumn: AGDataColumn | null;
    setEditingColumn: (column: AGDataColumn | null) => void;
    showQualityReport: boolean;
    setShowQualityReport: (show: boolean) => void;
    showEnvironments: boolean;
    setShowEnvironments: (show: boolean) => void;
    showDataStorageSettings: boolean;
    setShowDataStorageSettings: (show: boolean) => void;
}
