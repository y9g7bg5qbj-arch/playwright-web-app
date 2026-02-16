/**
 * Test Data API
 *
 * This is the API layer that fetches test data from the backend.
 * The DataManager calls this ONCE during preloadTables() before tests run.
 *
 * After preloading, all VDQL queries operate on the cached POJOs in memory.
 *
 * Cache Invalidation:
 * - Each table has a version/hash that changes when data is modified
 * - DataCache checks version before using cached data
 * - Only fetches fresh data when version changes
 */

import type { DataRow } from '../runtime/DataManager.js';

export interface TestDataApiConfig {
    baseUrl: string;
    projectId?: string;
    authToken?: string;
}

// Default configuration - can be overridden at runtime
let config: TestDataApiConfig = {
    baseUrl: process.env.VERO_API_URL || 'http://localhost:3000/api',
    projectId: process.env.VERO_PROJECT_ID,
    authToken: process.env.VERO_AUTH_TOKEN,
};

/**
 * Build request headers including auth token when configured.
 */
function buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (config.authToken) {
        headers['Authorization'] = `Bearer ${config.authToken}`;
    }
    return headers;
}

/**
 * Configure the test data API
 */
export function configureTestDataApi(newConfig: Partial<TestDataApiConfig>): void {
    config = { ...config, ...newConfig };
}

/**
 * Get the current API configuration
 */
export function getTestDataApiConfig(): TestDataApiConfig {
    return { ...config };
}

/**
 * Table version manifest - versions of all tables in one response
 */
export interface TableVersionManifest {
    [tableName: string]: {
        version: string;      // Hash or timestamp
        rowCount: number;
        updatedAt: string;
    };
}

/**
 * Bulk fetch response - multiple tables in one request
 */
export interface BulkTableResponse {
    tables: {
        [tableName: string]: {
            version: string;
            data: DataRow[];
        };
    };
}

/**
 * Test Data API methods
 * These are called by DataManager.preloadTables() BEFORE test execution
 */
export const testDataApi = {
    /**
     * Fetch all rows for a table
     * Called ONCE during preloading - not during test execution
     */
    async getTableData(tableName: string): Promise<DataRow[]> {
        const url = `${config.baseUrl}/test-data/tables/${encodeURIComponent(tableName)}/rows`;
        const params = new URLSearchParams();
        if (config.projectId) {
            params.set('projectId', config.projectId);
        }

        const response = await fetch(`${url}?${params}`, {
            method: 'GET',
            headers: buildHeaders(),
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch table "${tableName}": ${response.statusText}`);
        }

        const result: unknown = await response.json();

        // Handle different response formats
        if (Array.isArray(result)) {
            return result as DataRow[];
        }
        if (result && typeof result === 'object' && 'rows' in result && Array.isArray((result as { rows: unknown }).rows)) {
            return (result as { rows: DataRow[] }).rows;
        }
        if (result && typeof result === 'object' && 'data' in result && Array.isArray((result as { data: unknown }).data)) {
            return (result as { data: DataRow[] }).data;
        }

        console.warn(`Unexpected response format for table "${tableName}":`, result);
        return [];
    },

    /**
     * Get table metadata (columns, row count)
     */
    async getTableMetadata(tableName: string): Promise<{
        name: string;
        columns: Array<{ name: string; type: string }>;
        rowCount: number;
    }> {
        const url = `${config.baseUrl}/test-data/tables/${encodeURIComponent(tableName)}`;
        const params = new URLSearchParams();
        if (config.projectId) {
            params.set('projectId', config.projectId);
        }

        const response = await fetch(`${url}?${params}`, {
            method: 'GET',
            headers: buildHeaders(),
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch metadata for "${tableName}": ${response.statusText}`);
        }

        return response.json() as Promise<{
            name: string;
            columns: Array<{ name: string; type: string }>;
            rowCount: number;
        }>;
    },

    /**
     * List all available tables
     */
    async listTables(): Promise<string[]> {
        const url = `${config.baseUrl}/test-data/tables`;
        const params = new URLSearchParams();
        if (config.projectId) {
            params.set('projectId', config.projectId);
        }

        const response = await fetch(`${url}?${params}`, {
            method: 'GET',
            headers: buildHeaders(),
        });

        if (!response.ok) {
            throw new Error(`Failed to list tables: ${response.statusText}`);
        }

        const result: unknown = await response.json();
        if (Array.isArray(result)) {
            return result as string[];
        }
        if (result && typeof result === 'object' && 'tables' in result) {
            return (result as { tables: string[] }).tables || [];
        }
        return [];
    },

    /**
     * Get table version/hash for cache validation
     * Returns a version string that changes when table data is modified
     *
     * The backend should return:
     * - A hash of the table data, OR
     * - A last-modified timestamp, OR
     * - An incrementing version number
     */
    async getTableVersion(tableName: string): Promise<string> {
        const url = `${config.baseUrl}/test-data/tables/${encodeURIComponent(tableName)}/version`;
        const params = new URLSearchParams();
        if (config.projectId) {
            params.set('projectId', config.projectId);
        }

        try {
            const response = await fetch(`${url}?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                // If version endpoint not available, return empty string
                // This will cause the cache to always fetch fresh data
                console.warn(`[testDataApi] Version endpoint not available for "${tableName}"`);
                return '';
            }

            const result: unknown = await response.json();
            if (typeof result === 'string') {
                return result;
            }
            if (result && typeof result === 'object' && 'version' in result) {
                return String((result as { version: unknown }).version);
            }
            if (result && typeof result === 'object' && 'hash' in result) {
                return String((result as { hash: unknown }).hash);
            }
            if (result && typeof result === 'object' && 'updatedAt' in result) {
                return String((result as { updatedAt: unknown }).updatedAt);
            }

            return '';
        } catch (error) {
            console.warn(`[testDataApi] Failed to get version for "${tableName}":`, error);
            return '';
        }
    },

    /**
     * Notify the server that a table was modified (for cache invalidation)
     * Call this after modifying test data in the UI
     */
    async notifyTableModified(tableName: string): Promise<void> {
        const url = `${config.baseUrl}/test-data/tables/${encodeURIComponent(tableName)}/invalidate`;
        const params = new URLSearchParams();
        if (config.projectId) {
            params.set('projectId', config.projectId);
        }

        try {
            await fetch(`${url}?${params}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        } catch (error) {
            console.warn(`[testDataApi] Failed to notify modification for "${tableName}":`, error);
        }
    },

    // ==================== OPTIMIZED BULK OPERATIONS ====================

    /**
     * Get version manifest for ALL tables in ONE request
     * This is the optimal way to check what needs refreshing
     *
     * Returns: { Users: { version: "abc123", rowCount: 50 }, Products: { version: "def456", rowCount: 100 } }
     */
    async getVersionManifest(): Promise<TableVersionManifest> {
        const url = `${config.baseUrl}/test-data/versions`;
        const params = new URLSearchParams();
        if (config.projectId) {
            params.set('projectId', config.projectId);
        }

        try {
            const response = await fetch(`${url}?${params}`, {
                method: 'GET',
                headers: buildHeaders(),
            });

            if (!response.ok) {
                console.warn('[testDataApi] Version manifest endpoint not available');
                return {};
            }

            return await response.json() as TableVersionManifest;
        } catch (error) {
            console.warn('[testDataApi] Failed to get version manifest:', error);
            return {};
        }
    },

    /**
     * Fetch multiple tables in ONE request
     * Only fetches tables that are stale (based on provided versions)
     *
     * @param tableNames - Tables to fetch
     * @param currentVersions - Current cached versions (to skip unchanged tables)
     */
    async bulkFetch(
        tableNames: string[],
        currentVersions?: Record<string, string>
    ): Promise<BulkTableResponse> {
        const url = `${config.baseUrl}/test-data/bulk`;
        const params = new URLSearchParams();
        if (config.projectId) {
            params.set('projectId', config.projectId);
        }

        try {
            const response = await fetch(`${url}?${params}`, {
                method: 'POST',
                headers: buildHeaders(),
                body: JSON.stringify({
                    tables: tableNames,
                    // Server can use these to return 304 Not Modified for unchanged tables
                    ifNoneMatch: currentVersions,
                }),
            });

            if (!response.ok) {
                throw new Error(`Bulk fetch failed: ${response.statusText}`);
            }

            return await response.json() as BulkTableResponse;
        } catch (error) {
            console.warn('[testDataApi] Bulk fetch failed, falling back to individual fetches:', error);
            // Fallback to individual fetches
            const tables: BulkTableResponse['tables'] = {};
            for (const tableName of tableNames) {
                const data = await this.getTableData(tableName);
                tables[tableName] = {
                    version: '', // Will be computed from data hash
                    data,
                };
            }
            return { tables };
        }
    },

    /**
     * OPTIMAL: Smart fetch with caching
     * 1. Get version manifest (1 API call)
     * 2. Compare with cached versions
     * 3. Bulk fetch only changed tables (1 API call)
     *
     * Total: 2 API calls regardless of table count
     */
    async smartFetch(
        tableNames: string[],
        cachedVersions: Record<string, string>
    ): Promise<{
        tables: Record<string, { data: DataRow[]; version: string }>;
        stats: { cached: number; fetched: number };
    }> {
        // Step 1: Get current versions from server (1 API call)
        const manifest = await this.getVersionManifest();

        // Step 2: Determine which tables need fetching
        const tablesToFetch: string[] = [];
        const tablesFromCache: string[] = [];

        for (const tableName of tableNames) {
            const serverVersion = manifest[tableName]?.version;
            const cachedVersion = cachedVersions[tableName];

            if (!serverVersion || serverVersion !== cachedVersion) {
                tablesToFetch.push(tableName);
            } else {
                tablesFromCache.push(tableName);
            }
        }

        console.log(`[testDataApi] Smart fetch: ${tablesFromCache.length} cached, ${tablesToFetch.length} to fetch`);

        // Step 3: Bulk fetch only changed tables (1 API call)
        const result: Record<string, { data: DataRow[]; version: string }> = {};

        if (tablesToFetch.length > 0) {
            const bulkResponse = await this.bulkFetch(tablesToFetch);
            for (const [name, tableData] of Object.entries(bulkResponse.tables)) {
                result[name] = tableData;
            }
        }

        return {
            tables: result,
            stats: {
                cached: tablesFromCache.length,
                fetched: tablesToFetch.length,
            },
        };
    },
};
