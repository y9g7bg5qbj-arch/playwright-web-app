/**
 * DataManager - Runtime Data Management for Vero Tests
 *
 * Architecture:
 * 1. BEFORE test execution: Load all test data tables into memory as POJOs
 * 2. DURING test execution: Queries filter in-memory POJOs (NO database calls)
 *
 * This ensures:
 * - Fast test execution (no network latency)
 * - Consistent data (snapshot at test start)
 * - Reduced database load
 */

export interface DataRow {
    [key: string]: unknown;
}

export interface OrderBySpec {
    column: string;
    direction: 'ASC' | 'DESC';
}

export type FilterPredicate = (row: DataRow) => boolean;

/**
 * QueryBuilder provides a fluent API for querying in-memory data
 * All operations are performed on cached POJOs - no database calls
 */
export class QueryBuilder<T extends DataRow = DataRow> {
    private data: T[];
    private selectedColumns: string[] | null = null;
    private filterPredicate: FilterPredicate | null = null;
    private orderBySpecs: OrderBySpec[] = [];
    private limitCount: number | null = null;
    private offsetCount: number = 0;
    private rowIndexValue: number | null = null;
    private rangeStartValue: number | null = null;
    private rangeEndValue: number | null = null;

    constructor(data: T[]) {
        this.data = [...data]; // Work on a copy
    }

    /**
     * Select specific column(s) from the data
     */
    select(columns: string | string[]): QueryBuilder<T> {
        this.selectedColumns = Array.isArray(columns) ? columns : [columns];
        return this;
    }

    /**
     * Access a specific row by index
     */
    row(index: number): QueryBuilder<T> {
        this.rowIndexValue = index;
        return this;
    }

    /**
     * Access a range of rows [start..end] (inclusive)
     */
    range(start: number, end: number): QueryBuilder<T> {
        this.rangeStartValue = start;
        this.rangeEndValue = end;
        return this;
    }

    /**
     * Access a specific cell value
     */
    cell(rowIndex: number, colIndex: number): unknown {
        const row = this.data[rowIndex];
        if (!row) return null;
        const keys = Object.keys(row);
        return row[keys[colIndex]] ?? null;
    }

    /**
     * Filter rows based on a predicate
     */
    where(predicate: FilterPredicate): QueryBuilder<T> {
        this.filterPredicate = predicate;
        return this;
    }

    /**
     * Sort results
     */
    orderBy(specs: OrderBySpec[]): QueryBuilder<T> {
        this.orderBySpecs = specs;
        return this;
    }

    /**
     * Limit the number of results
     */
    limit(count: number): QueryBuilder<T> {
        this.limitCount = count;
        return this;
    }

    /**
     * Skip the first N results
     */
    offset(count: number): QueryBuilder<T> {
        this.offsetCount = count;
        return this;
    }

    /**
     * Get the first matching row
     */
    first(): T | null {
        const results = this.execute();
        return results[0] ?? null;
    }

    /**
     * Get the last matching row
     */
    last(): T | null {
        const results = this.execute();
        return results[results.length - 1] ?? null;
    }

    /**
     * Get a random matching row
     */
    random(): T | null {
        const results = this.execute();
        if (results.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * results.length);
        return results[randomIndex];
    }

    /**
     * Provide a default value if no results
     */
    default(defaultValue: T): T {
        const result = this.first();
        return result ?? defaultValue;
    }

    /**
     * Execute the query and return results
     */
    execute(): T[] {
        let result = [...this.data];

        // Apply row index access
        if (this.rowIndexValue !== null) {
            const row = result[this.rowIndexValue];
            result = row ? [row] : [];
        }

        // Apply range access
        if (this.rangeStartValue !== null && this.rangeEndValue !== null) {
            result = result.slice(this.rangeStartValue, this.rangeEndValue + 1);
        }

        // Apply filter
        if (this.filterPredicate) {
            result = result.filter(this.filterPredicate);
        }

        // Apply sorting
        if (this.orderBySpecs.length > 0) {
            result.sort((a, b) => {
                for (const spec of this.orderBySpecs) {
                    const aVal = a[spec.column] as string | number | boolean | null;
                    const bVal = b[spec.column] as string | number | boolean | null;

                    let comparison = 0;
                    if (aVal === null || aVal === undefined) comparison = -1;
                    else if (bVal === null || bVal === undefined) comparison = 1;
                    else if (aVal < bVal) comparison = -1;
                    else if (aVal > bVal) comparison = 1;

                    if (comparison !== 0) {
                        return spec.direction === 'DESC' ? -comparison : comparison;
                    }
                }
                return 0;
            });
        }

        // Apply offset
        if (this.offsetCount > 0) {
            result = result.slice(this.offsetCount);
        }

        // Apply limit
        if (this.limitCount !== null) {
            result = result.slice(0, this.limitCount);
        }

        // Apply column selection
        if (this.selectedColumns) {
            const cols = this.selectedColumns;
            if (cols.length === 1) {
                // Single column - return array of values
                return result.map(row => row[cols[0]]) as unknown as T[];
            } else {
                // Multiple columns - return objects with only those columns
                return result.map(row => {
                    const projected: DataRow = {};
                    for (const col of cols) {
                        projected[col] = row[col];
                    }
                    return projected as T;
                });
            }
        }

        return result;
    }

    // ==================== Aggregation Methods ====================

    /**
     * Count rows (operates on in-memory data)
     */
    count(): number {
        let result = [...this.data];
        if (this.filterPredicate) {
            result = result.filter(this.filterPredicate);
        }
        return result.length;
    }

    /**
     * Count distinct values in a column
     */
    countDistinct(column: string): number {
        let result = [...this.data];
        if (this.filterPredicate) {
            result = result.filter(this.filterPredicate);
        }
        const uniqueValues = new Set(result.map(row => row[column]));
        return uniqueValues.size;
    }

    /**
     * Sum values in a column
     */
    sum(column: string): number {
        let result = [...this.data];
        if (this.filterPredicate) {
            result = result.filter(this.filterPredicate);
        }
        return result.reduce((acc, row) => acc + (Number(row[column]) || 0), 0);
    }

    /**
     * Average values in a column
     */
    average(column: string): number {
        let result = [...this.data];
        if (this.filterPredicate) {
            result = result.filter(this.filterPredicate);
        }
        if (result.length === 0) return 0;
        const sum = result.reduce((acc, row) => acc + (Number(row[column]) || 0), 0);
        return sum / result.length;
    }

    /**
     * Minimum value in a column
     */
    min(column: string): number {
        let result = [...this.data];
        if (this.filterPredicate) {
            result = result.filter(this.filterPredicate);
        }
        if (result.length === 0) return 0;
        return Math.min(...result.map(row => Number(row[column]) || 0));
    }

    /**
     * Maximum value in a column
     */
    max(column: string): number {
        let result = [...this.data];
        if (this.filterPredicate) {
            result = result.filter(this.filterPredicate);
        }
        if (result.length === 0) return 0;
        return Math.max(...result.map(row => Number(row[column]) || 0));
    }

    /**
     * Get distinct values from a column
     */
    distinct(column: string): unknown[] {
        let result = [...this.data];
        if (this.filterPredicate) {
            result = result.filter(this.filterPredicate);
        }
        return [...new Set(result.map(row => row[column]))];
    }

    /**
     * Get row count (metadata)
     */
    rowCount(): number {
        return this.data.length;
    }

    /**
     * Get column count (metadata)
     */
    columnCount(): number {
        if (this.data.length === 0) return 0;
        return Object.keys(this.data[0]).length;
    }

    /**
     * Get column headers
     */
    headers(): string[] {
        if (this.data.length === 0) return [];
        return Object.keys(this.data[0]);
    }
}

// ==================== Filter Predicate Helpers ====================
// These are used by the transpiled code to build filter predicates

export const eq = (column: string, value: unknown): FilterPredicate =>
    (row) => row[column] === value;

export const neq = (column: string, value: unknown): FilterPredicate =>
    (row) => row[column] !== value;

export const gt = (column: string, value: unknown): FilterPredicate =>
    (row) => (row[column] as number) > (value as number);

export const lt = (column: string, value: unknown): FilterPredicate =>
    (row) => (row[column] as number) < (value as number);

export const gte = (column: string, value: unknown): FilterPredicate =>
    (row) => (row[column] as number) >= (value as number);

export const lte = (column: string, value: unknown): FilterPredicate =>
    (row) => (row[column] as number) <= (value as number);

export const contains = (column: string, value: string): FilterPredicate =>
    (row) => String(row[column] ?? '').includes(value);

export const startsWith = (column: string, value: string): FilterPredicate =>
    (row) => String(row[column] ?? '').startsWith(value);

export const endsWith = (column: string, value: string): FilterPredicate =>
    (row) => String(row[column] ?? '').endsWith(value);

export const matches = (column: string, pattern: string): FilterPredicate =>
    (row) => new RegExp(pattern).test(String(row[column] ?? ''));

export const isIn = (column: string, values: unknown[]): FilterPredicate =>
    (row) => values.includes(row[column]);

export const notIn = (column: string, values: unknown[]): FilterPredicate =>
    (row) => !values.includes(row[column]);

export const isEmpty = (column: string): FilterPredicate =>
    (row) => row[column] === null || row[column] === undefined || row[column] === '';

export const isNotEmpty = (column: string): FilterPredicate =>
    (row) => row[column] !== null && row[column] !== undefined && row[column] !== '';

export const isNull = (column: string): FilterPredicate =>
    (row) => row[column] === null || row[column] === undefined;

// Compound predicates
export const and = (left: FilterPredicate, right: FilterPredicate): FilterPredicate =>
    (row) => left(row) && right(row);

export const or = (left: FilterPredicate, right: FilterPredicate): FilterPredicate =>
    (row) => left(row) || right(row);

export const not = (predicate: FilterPredicate): FilterPredicate =>
    (row) => !predicate(row);

// ==================== DataManager Class ====================

export interface DataManagerConfig {
    /** Function to fetch all data for a table from the backend */
    fetchTable: (tableName: string) => Promise<DataRow[]>;
    /** Function to get table version/hash for cache validation */
    getTableVersion?: (tableName: string) => Promise<string>;
    /** Enable persistent file cache */
    persistentCache?: {
        enabled: boolean;
        cacheDir: string;
        projectId: string;
        /** Max cache age in ms (default: 24 hours) */
        maxAge?: number;
    };
}

// Import dynamically to avoid issues in browser environment
let DataCacheClass: typeof import('./DataCache.js').DataCache | null = null;
let createDataCacheFn: typeof import('./DataCache.js').createDataCache | null = null;

// Check if we're in Node.js environment (has 'process' but no 'window')
const isNode = typeof process !== 'undefined' && process.versions?.node;

async function loadCacheModule(): Promise<void> {
    if (isNode && !DataCacheClass) {
        const module = await import('./DataCache.js');
        DataCacheClass = module.DataCache;
        createDataCacheFn = module.createDataCache;
    }
}

/**
 * DataManager handles test data with POJO caching strategy:
 *
 * 1. preloadTables() - Called ONCE before test execution
 *    - Checks persistent cache first (only fetches if data changed)
 *    - Fetches from database only when needed
 *    - Stores as in-memory POJOs
 *
 * 2. query() - Called during test execution
 *    - Operates ONLY on cached POJOs
 *    - NO database calls
 *
 * Caching Layers:
 * - Level 1: In-memory cache (per test run)
 * - Level 2: File-based persistent cache (across test runs)
 */
export class DataManager {
    private cache: Map<string, DataRow[]> = new Map();
    private config: DataManagerConfig;
    private preloaded: boolean = false;
    private persistentCache: InstanceType<typeof import('./DataCache.js').DataCache> | null = null;

    constructor(config: DataManagerConfig) {
        this.config = config;
    }

    /**
     * Initialize persistent cache if configured
     */
    private async initPersistentCache(): Promise<void> {
        if (this.config.persistentCache?.enabled && !this.persistentCache) {
            await loadCacheModule();
            if (createDataCacheFn) {
                this.persistentCache = createDataCacheFn({
                    cacheDir: this.config.persistentCache.cacheDir,
                    projectId: this.config.persistentCache.projectId,
                    maxAge: this.config.persistentCache.maxAge,
                    getTableVersion: this.config.getTableVersion || (async () => ''),
                    fetchTableData: this.config.fetchTable,
                });
            }
        }
    }

    /**
     * Preload tables into memory BEFORE test execution
     *
     * With persistent cache enabled:
     * - Only fetches tables that have changed since last cache
     * - Uses cached data for unchanged tables
     *
     * Without persistent cache:
     * - Fetches all tables fresh each time
     */
    async preloadTables(tableNames: string[]): Promise<void> {
        console.log(`[DataManager] Preloading ${tableNames.length} tables...`);

        const startTime = Date.now();

        // Initialize persistent cache if configured
        await this.initPersistentCache();

        if (this.persistentCache) {
            // Use persistent cache - only fetches changed tables
            console.log('[DataManager] Using persistent cache...');
            const cachedData = await this.persistentCache.getTables(tableNames);
            for (const [tableName, data] of cachedData) {
                this.cache.set(tableName, data);
                console.log(`[DataManager] Loaded ${tableName}: ${data.length} rows`);
            }
        } else {
            // No persistent cache - fetch all fresh
            await Promise.all(
                tableNames.map(async (tableName) => {
                    const data = await this.config.fetchTable(tableName);
                    this.cache.set(tableName, data);
                    console.log(`[DataManager] Loaded ${tableName}: ${data.length} rows`);
                })
            );
        }

        this.preloaded = true;
        console.log(`[DataManager] Preload complete in ${Date.now() - startTime}ms`);
    }

    /**
     * Check if a table is loaded in cache
     */
    isTableLoaded(tableName: string): boolean {
        return this.cache.has(tableName);
    }

    /**
     * Get all cached table names
     */
    getLoadedTables(): string[] {
        return [...this.cache.keys()];
    }

    /**
     * Query a table - operates on cached POJOs only
     * NO database calls are made during query execution
     */
    query<T extends DataRow = DataRow>(tableName: string): QueryBuilder<T> {
        const data = this.cache.get(tableName);

        if (!data) {
            if (!this.preloaded) {
                console.warn(`[DataManager] Table "${tableName}" not found. Did you call preloadTables()?`);
            }
            // Return empty query builder instead of throwing
            return new QueryBuilder<T>([]);
        }

        return new QueryBuilder<T>(data as T[]);
    }

    /**
     * Legacy load method for backwards compatibility
     * @deprecated Use preloadTables() + query() instead
     */
    async load(tableName: string, options?: {
        project?: string;
        where?: Record<string, unknown>;
    }): Promise<DataRow[]> {
        // If not in cache, load it (single table lazy load)
        if (!this.cache.has(tableName)) {
            const data = await this.config.fetchTable(tableName);
            this.cache.set(tableName, data);
        }

        let result = this.cache.get(tableName) || [];

        // Apply simple where filter if provided
        if (options?.where) {
            result = result.filter(row => {
                for (const [key, condition] of Object.entries(options.where!)) {
                    if (typeof condition === 'object' && condition !== null) {
                        // Handle operators like { equals: value }
                        const [op, value] = Object.entries(condition)[0];
                        switch (op) {
                            case 'equals': if (row[key] !== value) return false; break;
                            case 'not': if (row[key] === value) return false; break;
                            case 'gt': if ((row[key] as number) <= (value as number)) return false; break;
                            case 'lt': if ((row[key] as number) >= (value as number)) return false; break;
                            case 'gte': if ((row[key] as number) < (value as number)) return false; break;
                            case 'lte': if ((row[key] as number) > (value as number)) return false; break;
                        }
                    } else {
                        if (row[key] !== condition) return false;
                    }
                }
                return true;
            });
        }

        return result;
    }

    /**
     * Clear in-memory cache only
     */
    clearCache(): void {
        this.cache.clear();
        this.preloaded = false;
    }

    /**
     * Clear both in-memory and persistent cache
     */
    clearAllCache(): void {
        this.cache.clear();
        this.preloaded = false;
        if (this.persistentCache) {
            this.persistentCache.invalidateAll();
        }
    }

    /**
     * Invalidate cache for a specific table (both in-memory and persistent)
     * Call this when table data is modified
     */
    invalidateTable(tableName: string): void {
        this.cache.delete(tableName);
        if (this.persistentCache) {
            this.persistentCache.invalidateTable(tableName);
        }
    }

    /**
     * Refresh a specific table from database
     * Forces a fresh fetch, bypassing cache
     */
    async refreshTable(tableName: string): Promise<void> {
        // Invalidate persistent cache first
        if (this.persistentCache) {
            this.persistentCache.invalidateTable(tableName);
        }
        // Fetch fresh data
        const data = await this.config.fetchTable(tableName);
        this.cache.set(tableName, data);
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): {
        inMemoryTables: string[];
        persistentCache?: {
            projectId: string;
            tablesCount: number;
            tables: Record<string, { version: string; fetchedAt: string; rowCount: number }>;
        };
    } {
        const stats: ReturnType<DataManager['getCacheStats']> = {
            inMemoryTables: [...this.cache.keys()],
        };
        if (this.persistentCache) {
            stats.persistentCache = this.persistentCache.getStats();
        }
        return stats;
    }
}

// Export a factory function for creating DataManager instances
export function createDataManager(config: DataManagerConfig): DataManager {
    return new DataManager(config);
}

/**
 * Create a DataManager with persistent caching enabled
 */
export function createCachedDataManager(config: {
    fetchTable: (tableName: string) => Promise<DataRow[]>;
    getTableVersion?: (tableName: string) => Promise<string>;
    cacheDir: string;
    projectId: string;
    maxAge?: number;
}): DataManager {
    return new DataManager({
        fetchTable: config.fetchTable,
        getTableVersion: config.getTableVersion,
        persistentCache: {
            enabled: true,
            cacheDir: config.cacheDir,
            projectId: config.projectId,
            maxAge: config.maxAge,
        },
    });
}
