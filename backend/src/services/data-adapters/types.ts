/**
 * Data Adapter Types
 *
 * Defines the interface for pluggable data storage backends.
 * Supports MongoDB (default), PostgreSQL, MySQL, etc.
 */

// ============================================
// COLUMN DEFINITIONS
// ============================================

export type ColumnType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select'
  | 'formula'
  | 'reference'
  | 'list';

export interface ReferenceConfig {
  targetSheet: string;
  targetColumn: string;
  displayColumn: string;
  allowMultiple: boolean;
  separator?: string;
}

export interface ColumnValidation {
  pattern?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  enum?: string[];
}

export interface ColumnDefinition {
  id: string;
  name: string;
  type: ColumnType;
  required?: boolean;
  defaultValue?: any;
  validation?: ColumnValidation;
  referenceConfig?: ReferenceConfig;
  formula?: string;
}

// ============================================
// TEST DATA SHEET
// ============================================

export interface TestDataSheet {
  id: string;
  applicationId: string;
  name: string;
  pageObject?: string;
  description?: string;
  columns: ColumnDefinition[];
  createdAt: Date;
  updatedAt: Date;
}

export type TestDataSheetCreate = Omit<TestDataSheet, 'id' | 'createdAt' | 'updatedAt'>;
export type TestDataSheetUpdate = Partial<Omit<TestDataSheet, 'id' | 'applicationId' | 'createdAt' | 'updatedAt'>>;

// ============================================
// TEST DATA ROW
// ============================================

export interface TestDataRow {
  id: string;
  sheetId: string;
  scenarioId: string;
  data: Record<string, any>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TestDataRowCreate = Omit<TestDataRow, 'id' | 'createdAt' | 'updatedAt'>;
export type TestDataRowUpdate = Partial<Omit<TestDataRow, 'id' | 'sheetId' | 'createdAt' | 'updatedAt'>>;

// ============================================
// QUERY OPTIONS
// ============================================

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryOptions {
  filter?: Record<string, any>;
  sort?: SortOption[];
  skip?: number;
  limit?: number;
  search?: string;
  searchFields?: string[];
}

export interface QueryResult<T> {
  rows: T[];
  total: number;
  skip: number;
  limit: number;
}

// ============================================
// CONNECTION TEST RESULT
// ============================================

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  latency?: number;
  serverInfo?: {
    version?: string;
    platform?: string;
  };
}

// ============================================
// DATA ADAPTER INTERFACE
// ============================================

/**
 * DataAdapter Interface
 *
 * All data storage backends must implement this interface.
 * This allows swapping between MongoDB, PostgreSQL, MySQL, etc.
 */
export interface DataAdapter {
  // ============================================
  // LIFECYCLE
  // ============================================

  /**
   * Connect to the database
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the database
   */
  disconnect(): Promise<void>;

  /**
   * Test the database connection
   */
  testConnection(): Promise<ConnectionTestResult>;

  /**
   * Check if connected
   */
  isConnected(): boolean;

  // ============================================
  // SHEET OPERATIONS
  // ============================================

  /**
   * Create a new test data sheet
   */
  createSheet(sheet: TestDataSheetCreate): Promise<TestDataSheet>;

  /**
   * Get a sheet by ID
   */
  getSheet(id: string): Promise<TestDataSheet | null>;

  /**
   * Get a sheet by name within an application
   */
  getSheetByName(applicationId: string, name: string): Promise<TestDataSheet | null>;

  /**
   * Get all sheets for an application
   */
  getAllSheets(applicationId: string): Promise<TestDataSheet[]>;

  /**
   * Update a sheet
   */
  updateSheet(id: string, data: TestDataSheetUpdate): Promise<TestDataSheet>;

  /**
   * Delete a sheet and all its rows
   */
  deleteSheet(id: string): Promise<void>;

  // ============================================
  // ROW OPERATIONS
  // ============================================

  /**
   * Create a new row
   */
  createRow(row: TestDataRowCreate): Promise<TestDataRow>;

  /**
   * Get a row by ID
   */
  getRow(id: string): Promise<TestDataRow | null>;

  /**
   * Get all rows for a sheet
   */
  getRows(sheetId: string): Promise<TestDataRow[]>;

  /**
   * Update a row
   */
  updateRow(id: string, data: TestDataRowUpdate): Promise<TestDataRow>;

  /**
   * Delete a row
   */
  deleteRow(id: string): Promise<void>;

  /**
   * Bulk create rows
   */
  bulkCreateRows(sheetId: string, rows: Array<Omit<TestDataRowCreate, 'sheetId'>>): Promise<TestDataRow[]>;

  /**
   * Bulk delete rows
   */
  bulkDeleteRows(ids: string[]): Promise<void>;

  /**
   * Bulk update rows
   */
  bulkUpdateRows(updates: Array<{ id: string; data: TestDataRowUpdate }>): Promise<TestDataRow[]>;

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  /**
   * Query rows with filtering, sorting, and pagination
   */
  queryRows(sheetId: string, options: QueryOptions): Promise<QueryResult<TestDataRow>>;

  // ============================================
  // REFERENCE RESOLUTION
  // ============================================

  /**
   * Resolve reference columns to their full data
   */
  resolveReferences(
    sheetId: string,
    rowId: string,
    columns: string[]
  ): Promise<Record<string, any[]>>;

  /**
   * Expand references for multiple rows
   */
  expandRows(
    sheetId: string,
    rowIds: string[],
    columns: string[]
  ): Promise<Map<string, Record<string, any[]>>>;
}

// ============================================
// ADAPTER CONFIGURATION
// ============================================

export interface AdapterConfig {
  provider: 'mongodb' | 'postgresql' | 'mysql';
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  useSSL?: boolean;
  options?: Record<string, any>;
}

// ============================================
// SUPPORTED PROVIDERS
// ============================================

export const SUPPORTED_PROVIDERS = [
  {
    id: 'mongodb',
    name: 'MongoDB (Default)',
    description: 'Document database for flexible test data',
    icon: 'leaf',
    requiresConfig: false,
    defaultPort: 27017,
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    description: 'Powerful relational database',
    icon: 'elephant',
    requiresConfig: true,
    defaultPort: 5432,
  },
  {
    id: 'mysql',
    name: 'MySQL',
    description: 'Popular relational database',
    icon: 'dolphin',
    requiresConfig: true,
    defaultPort: 3306,
  },
] as const;

export type ProviderType = typeof SUPPORTED_PROVIDERS[number]['id'];
