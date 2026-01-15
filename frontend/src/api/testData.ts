/**
 * Test Data API Client
 * Handles all test data sheet and row operations
 */

// Note: Using fetchJson helper instead of apiClient because test-data routes
// return {success, sheets/rows/...} directly, not wrapped in {data: ...}

// Types
export interface Column {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select' | 'formula';
  required?: boolean;
  unique?: boolean;
  choices?: string[];
  description?: string;
  formula?: string; // For computed columns: e.g., "price * quantity"
}

// Saved Views
export interface SavedView {
  id: string;
  sheetId?: string;
  name: string;
  description?: string;
  isDefault: boolean;
  filterState: Record<string, unknown>;
  sortState: unknown[];
  columnState: unknown[];
  groupState: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedViewCreate {
  name: string;
  description?: string;
  isDefault?: boolean;
  filterState?: Record<string, unknown>;
  sortState?: unknown[];
  columnState?: unknown[];
  groupState?: unknown[];
}

export interface SavedViewUpdate extends Partial<SavedViewCreate> {}

// Table Relationships
export interface TableRelationship {
  id: string;
  name: string;
  sourceSheetId: string;
  sourceSheetName?: string;
  sourceColumn: string;
  targetSheetId: string;
  targetSheetName?: string;
  targetColumn: string;
  displayColumns: string[];
  relationshipType: 'many-to-one' | 'one-to-many' | 'many-to-many';
  cascadeDelete: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface RelationshipCreate {
  sourceSheetId: string;
  targetSheetId: string;
  name: string;
  sourceColumn: string;
  targetColumn: string;
  displayColumns?: string[];
  relationshipType?: 'many-to-one' | 'one-to-many' | 'many-to-many';
  cascadeDelete?: boolean;
}

export interface RelationshipUpdate {
  name?: string;
  displayColumns?: string[];
  cascadeDelete?: boolean;
}

// Formula types
export interface FormulaResult {
  result: number | string;
  isError: boolean;
}

export interface TestDataSheet {
  id: string;
  name: string;
  pageObject?: string;
  description?: string;
  columns: Column[];
  rowCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestDataRow {
  id: string;
  sheetId: string;
  scenarioId: string;
  data: Record<string, unknown>;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SheetWithRows extends TestDataSheet {
  rows: TestDataRow[];
}

export interface SheetCreate {
  projectId: string;
  name: string;
  pageObject?: string;
  description?: string;
  columns?: Column[];
}

export interface SheetUpdate {
  name?: string;
  pageObject?: string;
  description?: string;
  columns?: Column[];
}

export interface RowCreate {
  scenarioId: string;
  data: Record<string, unknown>;
  enabled?: boolean;
}

export interface RowUpdate {
  scenarioId?: string;
  data?: Record<string, unknown>;
  enabled?: boolean;
}

export interface ImportResult {
  success: boolean;
  sheets: string[];
  rowsImported: number;
  errors: string[];
}

export interface ExcelPreview {
  name: string;
  columns: Column[];
  rowCount: number;
  sampleRows: Record<string, unknown>[];
}

// API Response types
interface SheetsResponse {
  success: boolean;
  sheets: TestDataSheet[];
}

interface SheetResponse {
  success: boolean;
  sheet: SheetWithRows;
}

interface RowsResponse {
  success: boolean;
  rows: TestDataRow[];
}

interface RowResponse {
  success: boolean;
  row: TestDataRow;
}

// Helper for direct fetch calls (test-data API returns responses without 'data' wrapper)
const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const testDataApi = {
  // ============================================
  // SHEETS
  // ============================================

  /**
   * List all sheets for a project
   */
  async listSheets(projectId: string): Promise<TestDataSheet[]> {
    const response = await fetchJson<SheetsResponse>(
      `/test-data/sheets?projectId=${encodeURIComponent(projectId)}`
    );
    return response.sheets || [];
  },

  /**
   * Get a single sheet with all its rows
   */
  async getSheet(id: string): Promise<SheetWithRows> {
    const response = await fetchJson<SheetResponse>(`/test-data/sheets/${id}`);
    return response.sheet;
  },

  /**
   * Create a new sheet
   */
  async createSheet(data: SheetCreate): Promise<TestDataSheet> {
    const response = await fetchJson<SheetResponse>('/test-data/sheets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.sheet;
  },

  /**
   * Update a sheet
   */
  async updateSheet(id: string, data: SheetUpdate): Promise<TestDataSheet> {
    const response = await fetchJson<SheetResponse>(`/test-data/sheets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.sheet;
  },

  /**
   * Delete a sheet
   */
  async deleteSheet(id: string): Promise<void> {
    await fetchJson(`/test-data/sheets/${id}`, { method: 'DELETE' });
  },

  // ============================================
  // ROWS
  // ============================================

  /**
   * List all rows for a sheet
   */
  async listRows(sheetId: string, enabledOnly = false): Promise<TestDataRow[]> {
    const params = enabledOnly ? '?enabledOnly=true' : '';
    const response = await fetchJson<RowsResponse>(
      `/test-data/sheets/${sheetId}/rows${params}`
    );
    return response.rows || [];
  },

  /**
   * Create a new row
   */
  async createRow(sheetId: string, data: RowCreate): Promise<TestDataRow> {
    const response = await fetchJson<RowResponse>(
      `/test-data/sheets/${sheetId}/rows`,
      { method: 'POST', body: JSON.stringify(data) }
    );
    return response.row;
  },

  /**
   * Update a row
   */
  async updateRow(rowId: string, data: RowUpdate): Promise<TestDataRow> {
    const response = await fetchJson<RowResponse>(`/test-data/rows/${rowId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.row;
  },

  /**
   * Delete a row
   */
  async deleteRow(rowId: string): Promise<void> {
    await fetchJson(`/test-data/rows/${rowId}`, { method: 'DELETE' });
  },

  /**
   * Bulk create rows
   */
  async bulkCreateRows(sheetId: string, rows: RowCreate[]): Promise<number> {
    const response = await fetchJson<{ success: boolean; count: number }>(
      `/test-data/sheets/${sheetId}/rows/bulk`,
      { method: 'POST', body: JSON.stringify({ rows }) }
    );
    return response.count;
  },

  /**
   * Bulk update rows
   */
  async bulkUpdateRows(
    sheetId: string,
    updates: { rowId: string; data: Record<string, unknown> }[]
  ): Promise<number> {
    const response = await fetchJson<{ success: boolean; updated: number }>(
      `/test-data/sheets/${sheetId}/rows/bulk-update`,
      { method: 'POST', body: JSON.stringify({ updates }) }
    );
    return response.updated;
  },

  // ============================================
  // IMPORT / EXPORT
  // ============================================

  /**
   * Import Excel file
   */
  async importExcel(projectId: string, file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/test-data/import`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    return response.json();
  },

  /**
   * Export to Excel
   */
  async exportExcel(projectId: string, sheetIds?: string[]): Promise<Blob> {
    let url = `/test-data/export?projectId=${encodeURIComponent(projectId)}`;
    if (sheetIds?.length) {
      url += `&sheetIds=${sheetIds.join(',')}`;
    }

    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}${url}`,
      { credentials: 'include' }
    );

    return response.blob();
  },

  /**
   * Preview Excel file without importing
   */
  async previewExcel(file: File): Promise<ExcelPreview[]> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/test-data/preview`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    const data = await response.json();
    return data.sheets || [];
  },

  /**
   * Download Excel template
   */
  async downloadTemplate(pageName: string, columns: string[]): Promise<Blob> {
    const url = `/test-data/template?pageName=${encodeURIComponent(pageName)}&columns=${columns.join(',')}`;

    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}${url}`,
      { credentials: 'include' }
    );

    return response.blob();
  },

  // ============================================
  // SCHEMA & VALIDATION
  // ============================================

  /**
   * Get schema for autocomplete
   */
  async getSchema(projectId: string): Promise<{ name: string; columns: { name: string; type: string }[] }[]> {
    const response = await fetchJson<{ success: boolean; schema: any[] }>(
      `/test-data/schema?projectId=${encodeURIComponent(projectId)}`
    );
    return response.schema || [];
  },

  /**
   * Validate a sheet
   */
  async validateSheet(sheetId: string): Promise<{ valid: boolean; errors: string[] }> {
    const response = await fetchJson<{ success: boolean; validation: any }>(
      `/test-data/validate/${sheetId}`,
      { method: 'POST' }
    );
    return response.validation;
  },

  // ============================================
  // DTO GENERATION
  // ============================================

  /**
   * Generate TypeScript DTOs
   */
  async generateDto(projectId: string): Promise<string> {
    const response = await fetchJson<{ success: boolean; code: string }>(
      `/test-data/generate-dto?projectId=${encodeURIComponent(projectId)}`
    );
    return response.code;
  },

  // ============================================
  // SAVED VIEWS
  // ============================================

  /**
   * List all saved views for a sheet
   */
  async listSavedViews(sheetId: string): Promise<SavedView[]> {
    const response = await fetchJson<{ success: boolean; views: SavedView[] }>(
      `/test-data/sheets/${sheetId}/views`
    );
    return response.views || [];
  },

  /**
   * Create a new saved view
   */
  async createSavedView(sheetId: string, data: SavedViewCreate): Promise<SavedView> {
    const response = await fetchJson<{ success: boolean; view: SavedView }>(
      `/test-data/sheets/${sheetId}/views`,
      { method: 'POST', body: JSON.stringify(data) }
    );
    return response.view;
  },

  /**
   * Update a saved view
   */
  async updateSavedView(viewId: string, data: SavedViewUpdate): Promise<SavedView> {
    const response = await fetchJson<{ success: boolean; view: SavedView }>(
      `/test-data/views/${viewId}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
    return response.view;
  },

  /**
   * Delete a saved view
   */
  async deleteSavedView(viewId: string): Promise<void> {
    await fetchJson(`/test-data/views/${viewId}`, { method: 'DELETE' });
  },

  // ============================================
  // TABLE RELATIONSHIPS
  // ============================================

  /**
   * List all relationships for a sheet
   */
  async listSheetRelationships(sheetId: string): Promise<{
    outgoing: TableRelationship[];
    incoming: TableRelationship[];
  }> {
    const response = await fetchJson<{
      success: boolean;
      outgoing: TableRelationship[];
      incoming: TableRelationship[];
    }>(`/test-data/sheets/${sheetId}/relationships`);
    return {
      outgoing: response.outgoing || [],
      incoming: response.incoming || [],
    };
  },

  /**
   * List all relationships for a project
   */
  async listRelationships(projectId: string): Promise<TableRelationship[]> {
    const response = await fetchJson<{ success: boolean; relationships: TableRelationship[] }>(
      `/test-data/relationships?projectId=${encodeURIComponent(projectId)}`
    );
    return response.relationships || [];
  },

  /**
   * Create a new relationship
   */
  async createRelationship(data: RelationshipCreate): Promise<TableRelationship> {
    const response = await fetchJson<{ success: boolean; relationship: TableRelationship }>(
      '/test-data/relationships',
      { method: 'POST', body: JSON.stringify(data) }
    );
    return response.relationship;
  },

  /**
   * Update a relationship
   */
  async updateRelationship(relationshipId: string, data: RelationshipUpdate): Promise<TableRelationship> {
    const response = await fetchJson<{ success: boolean; relationship: TableRelationship }>(
      `/test-data/relationships/${relationshipId}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
    return response.relationship;
  },

  /**
   * Delete a relationship
   */
  async deleteRelationship(relationshipId: string): Promise<void> {
    await fetchJson(`/test-data/relationships/${relationshipId}`, { method: 'DELETE' });
  },

  /**
   * Lookup related data for a value
   */
  async lookupRelatedData(relationshipId: string, value: string): Promise<{
    found: boolean;
    data: Record<string, unknown> | null;
    rowId?: string;
  }> {
    const response = await fetchJson<{
      success: boolean;
      found: boolean;
      data: Record<string, unknown> | null;
      rowId?: string;
    }>(`/test-data/relationships/${relationshipId}/lookup?value=${encodeURIComponent(value)}`);
    return {
      found: response.found,
      data: response.data,
      rowId: response.rowId,
    };
  },

  // ============================================
  // COMPUTED COLUMNS / FORMULAS
  // ============================================

  /**
   * Evaluate a formula for given row data
   */
  async evaluateFormula(formula: string, rowData: Record<string, unknown>): Promise<FormulaResult> {
    const response = await fetchJson<{ success: boolean; result: number | string; isError: boolean }>(
      '/test-data/evaluate-formula',
      { method: 'POST', body: JSON.stringify({ formula, rowData }) }
    );
    return {
      result: response.result,
      isError: response.isError,
    };
  },

  /**
   * Compute all formula columns for all rows in a sheet
   */
  async computeAllFormulas(sheetId: string): Promise<{ message: string; updatedRows: number }> {
    const response = await fetchJson<{ success: boolean; message: string; updatedRows: number }>(
      `/test-data/sheets/${sheetId}/compute-all`,
      { method: 'POST' }
    );
    return {
      message: response.message,
      updatedRows: response.updatedRows,
    };
  },

  // ============================================
  // BULK OPERATIONS (New Endpoints)
  // ============================================

  /**
   * Bulk delete multiple rows by IDs
   */
  async bulkDeleteRows(sheetId: string, rowIds: string[]): Promise<number> {
    const response = await fetchJson<{ success: boolean; deleted: number }>(
      `/test-data/sheets/${sheetId}/rows/bulk-delete`,
      { method: 'POST', body: JSON.stringify({ rowIds }) }
    );
    return response.deleted;
  },

  /**
   * Duplicate selected rows
   */
  async duplicateRows(
    sheetId: string,
    rowIds: string[],
    insertPosition: 'after' | 'end' = 'end'
  ): Promise<TestDataRow[]> {
    const response = await fetchJson<{ success: boolean; rows: TestDataRow[] }>(
      `/test-data/sheets/${sheetId}/rows/duplicate`,
      { method: 'POST', body: JSON.stringify({ rowIds, insertPosition }) }
    );
    return response.rows || [];
  },

  /**
   * Find and replace values with advanced options
   */
  async searchReplace(
    sheetId: string,
    find: string,
    replace: string,
    scope: 'all' | 'selection' | 'column',
    options: {
      caseSensitive?: boolean;
      wholeWord?: boolean;
      useRegex?: boolean;
      columnId?: string;
      rowIds?: string[];
    } = {}
  ): Promise<{ matchCount: number; replacedCount: number }> {
    const response = await fetchJson<{
      success: boolean;
      matchCount: number;
      replacedCount: number;
    }>(
      `/test-data/sheets/${sheetId}/search-replace`,
      {
        method: 'POST',
        body: JSON.stringify({
          find,
          replace,
          scope,
          columnId: options.columnId,
          rowIds: options.rowIds,
          options: {
            caseSensitive: options.caseSensitive ?? false,
            wholeWord: options.wholeWord ?? false,
            useRegex: options.useRegex ?? false,
          },
        }),
      }
    );
    return {
      matchCount: response.matchCount,
      replacedCount: response.replacedCount,
    };
  },

  /**
   * Fill cells with value, sequence, or pattern
   */
  async fillSeries(
    sheetId: string,
    rowIds: string[],
    columnId: string,
    fillType: 'value' | 'sequence' | 'pattern',
    options: {
      value?: string;
      startValue?: number;
      step?: number;
      pattern?: string;
    } = {}
  ): Promise<number> {
    const response = await fetchJson<{ success: boolean; updated: number }>(
      `/test-data/sheets/${sheetId}/fill-series`,
      {
        method: 'POST',
        body: JSON.stringify({
          rowIds,
          columnId,
          fillType,
          ...options,
        }),
      }
    );
    return response.updated;
  },

  /**
   * Export sheet data to JSON or CSV format
   */
  async exportData(
    sheetId: string,
    format: 'json' | 'csv' = 'json',
    rowIds?: string[]
  ): Promise<Blob> {
    let url = `/test-data/sheets/${sheetId}/export-data?format=${format}`;
    if (rowIds?.length) {
      url += `&rowIds=${rowIds.join(',')}`;
    }

    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}${url}`,
      { credentials: 'include' }
    );

    return response.blob();
  },

  // ============================================
  // REFERENCE RESOLUTION
  // ============================================

  /**
   * Resolve reference column values to full row data from target sheets
   * Used for VDQL expand clause and Vero script nested iterations
   */
  async resolveReferences(
    sheetId: string,
    rowId: string,
    columns: string[]
  ): Promise<Record<string, Record<string, unknown>[]>> {
    const response = await fetchJson<{
      success: boolean;
      resolved: Record<string, Record<string, unknown>[]>;
    }>('/test-data/resolve-references', {
      method: 'POST',
      body: JSON.stringify({ sheetId, rowId, columns }),
    });
    return response.resolved || {};
  },

  /**
   * Fetch sheet rows with reference columns expanded (VDQL expand support)
   * @param expandColumns - Array of column names to expand, or ['all'] for all reference columns
   */
  async expandSheetRows(
    sheetId: string,
    options: {
      rowIds?: string[];
      expandColumns?: string[];
    } = {}
  ): Promise<{
    sheet: { id: string; name: string; columns: unknown[] };
    rows: Array<{
      id: string;
      scenarioId: string;
      data: Record<string, unknown>;
      enabled: boolean;
    }>;
  }> {
    const response = await fetchJson<{
      success: boolean;
      sheet: { id: string; name: string; columns: unknown[] };
      rows: Array<{
        id: string;
        scenarioId: string;
        data: Record<string, unknown>;
        enabled: boolean;
      }>;
    }>(`/test-data/sheets/${sheetId}/expand`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
    return {
      sheet: response.sheet,
      rows: response.rows || [],
    };
  },
};
