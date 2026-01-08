/**
 * DataCache - Persistent caching for test data POJOs
 *
 * Caching Strategy:
 * 1. Each table has a version/hash stored with its data
 * 2. Before fetching, check if local cache version matches server version
 * 3. Only fetch data if version changed (table was modified)
 * 4. Cache persists to file system for reuse across test runs
 *
 * This minimizes database calls:
 * - First run: Fetch all tables, cache locally
 * - Subsequent runs: Only fetch tables that changed
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { DataRow } from './DataManager.js';

export interface CachedTable {
    tableName: string;
    version: string;           // Hash or ETag from server
    fetchedAt: string;         // ISO timestamp
    rowCount: number;
    data: DataRow[];
}

export interface CacheMetadata {
    projectId: string;
    tables: Record<string, {
        version: string;
        fetchedAt: string;
        rowCount: number;
    }>;
}

export interface DataCacheConfig {
    /** Directory to store cache files */
    cacheDir: string;
    /** Project identifier for cache isolation */
    projectId: string;
    /** Function to get table version/hash from server */
    getTableVersion: (tableName: string) => Promise<string>;
    /** Function to fetch table data from server */
    fetchTableData: (tableName: string) => Promise<DataRow[]>;
    /** Max age in ms before forcing refresh (default: 24 hours) */
    maxAge?: number;
    /**
     * OPTIMAL: Bulk operations for minimal API calls
     * If provided, uses 2 API calls total instead of N+M calls
     */
    bulkOperations?: {
        /** Get all table versions in one call */
        getVersionManifest: () => Promise<Record<string, { version: string }>>;
        /** Fetch multiple tables in one call */
        bulkFetch: (tableNames: string[]) => Promise<Record<string, { data: DataRow[]; version: string }>>;
    };
}

/**
 * Generate a hash from table data for version comparison
 */
export function hashTableData(data: DataRow[]): string {
    const content = JSON.stringify(data);
    return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * DataCache provides persistent caching for test data
 */
export class DataCache {
    private config: DataCacheConfig;
    private cacheDir: string;
    private metadataPath: string;
    private metadata: CacheMetadata | null = null;

    constructor(config: DataCacheConfig) {
        this.config = {
            maxAge: 24 * 60 * 60 * 1000, // 24 hours default
            ...config,
        };
        this.cacheDir = path.join(config.cacheDir, config.projectId);
        this.metadataPath = path.join(this.cacheDir, 'cache-metadata.json');
    }

    /**
     * Initialize cache directory
     */
    private ensureCacheDir(): void {
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    /**
     * Load cache metadata
     */
    private loadMetadata(): CacheMetadata {
        if (this.metadata) return this.metadata;

        try {
            if (fs.existsSync(this.metadataPath)) {
                const content = fs.readFileSync(this.metadataPath, 'utf-8');
                this.metadata = JSON.parse(content);
                return this.metadata!;
            }
        } catch (error) {
            console.warn('[DataCache] Failed to load metadata:', error);
        }

        this.metadata = {
            projectId: this.config.projectId,
            tables: {},
        };
        return this.metadata;
    }

    /**
     * Save cache metadata
     */
    private saveMetadata(): void {
        this.ensureCacheDir();
        fs.writeFileSync(this.metadataPath, JSON.stringify(this.metadata, null, 2));
    }

    /**
     * Get path for a table's cache file
     */
    private getTableCachePath(tableName: string): string {
        return path.join(this.cacheDir, `${tableName}.json`);
    }

    /**
     * Check if cached data is still valid
     */
    private async isCacheValid(tableName: string): Promise<boolean> {
        const metadata = this.loadMetadata();
        const tableInfo = metadata.tables[tableName];

        if (!tableInfo) {
            console.log(`[DataCache] No cache for "${tableName}"`);
            return false;
        }

        // Check max age
        const fetchedAt = new Date(tableInfo.fetchedAt).getTime();
        const age = Date.now() - fetchedAt;
        if (age > this.config.maxAge!) {
            console.log(`[DataCache] Cache expired for "${tableName}" (age: ${Math.round(age / 1000 / 60)}min)`);
            return false;
        }

        // Check if file exists
        const cachePath = this.getTableCachePath(tableName);
        if (!fs.existsSync(cachePath)) {
            console.log(`[DataCache] Cache file missing for "${tableName}"`);
            return false;
        }

        // Check version against server
        try {
            const serverVersion = await this.config.getTableVersion(tableName);
            if (serverVersion !== tableInfo.version) {
                console.log(`[DataCache] Version changed for "${tableName}" (local: ${tableInfo.version}, server: ${serverVersion})`);
                return false;
            }
        } catch (error) {
            console.warn(`[DataCache] Failed to check version for "${tableName}":`, error);
            // If we can't check version, use cached data if available
            return true;
        }

        console.log(`[DataCache] Cache valid for "${tableName}"`);
        return true;
    }

    /**
     * Load table data from cache file
     */
    private loadFromCache(tableName: string): DataRow[] | null {
        const cachePath = this.getTableCachePath(tableName);
        try {
            if (fs.existsSync(cachePath)) {
                const content = fs.readFileSync(cachePath, 'utf-8');
                const cached: CachedTable = JSON.parse(content);
                return cached.data;
            }
        } catch (error) {
            console.warn(`[DataCache] Failed to load cache for "${tableName}":`, error);
        }
        return null;
    }

    /**
     * Save table data to cache file
     */
    private saveToCache(tableName: string, data: DataRow[], version: string): void {
        this.ensureCacheDir();

        const cached: CachedTable = {
            tableName,
            version,
            fetchedAt: new Date().toISOString(),
            rowCount: data.length,
            data,
        };

        const cachePath = this.getTableCachePath(tableName);
        fs.writeFileSync(cachePath, JSON.stringify(cached));

        // Update metadata
        const metadata = this.loadMetadata();
        metadata.tables[tableName] = {
            version,
            fetchedAt: cached.fetchedAt,
            rowCount: data.length,
        };
        this.saveMetadata();

        console.log(`[DataCache] Saved "${tableName}" to cache (${data.length} rows, version: ${version})`);
    }

    /**
     * Get table data - from cache if valid, otherwise fetch and cache
     */
    async getTable(tableName: string): Promise<DataRow[]> {
        // Check if cache is valid
        const cacheValid = await this.isCacheValid(tableName);

        if (cacheValid) {
            const cachedData = this.loadFromCache(tableName);
            if (cachedData) {
                console.log(`[DataCache] Using cached data for "${tableName}" (${cachedData.length} rows)`);
                return cachedData;
            }
        }

        // Fetch fresh data from server
        console.log(`[DataCache] Fetching "${tableName}" from server...`);
        const data = await this.config.fetchTableData(tableName);

        // Calculate version hash from data
        const version = hashTableData(data);

        // Save to cache
        this.saveToCache(tableName, data, version);

        return data;
    }

    /**
     * Get multiple tables with caching
     * Uses bulk operations if available (optimal: 2 API calls total)
     */
    async getTables(tableNames: string[]): Promise<Map<string, DataRow[]>> {
        const results = new Map<string, DataRow[]>();

        // OPTIMAL PATH: Use bulk operations if available
        if (this.config.bulkOperations) {
            return this.getTablesOptimized(tableNames);
        }

        // FALLBACK: Process tables individually (N+M API calls)
        await Promise.all(
            tableNames.map(async (tableName) => {
                const data = await this.getTable(tableName);
                results.set(tableName, data);
            })
        );

        return results;
    }

    /**
     * OPTIMAL: Get multiple tables with minimal API calls
     *
     * 1. Get version manifest (1 API call)
     * 2. Compare with cached versions
     * 3. Bulk fetch only changed tables (1 API call)
     *
     * Total: 2 API calls regardless of table count
     */
    private async getTablesOptimized(tableNames: string[]): Promise<Map<string, DataRow[]>> {
        const results = new Map<string, DataRow[]>();
        const bulk = this.config.bulkOperations!;
        const metadata = this.loadMetadata();

        console.log(`[DataCache] Optimized fetch for ${tableNames.length} tables...`);

        // Step 1: Get version manifest from server (1 API call)
        const manifest = await bulk.getVersionManifest();

        // Step 2: Determine which tables need fetching vs using cache
        const tablesToFetch: string[] = [];
        const tablesFromCache: string[] = [];

        for (const tableName of tableNames) {
            const serverVersion = manifest[tableName]?.version;
            const cachedInfo = metadata.tables[tableName];
            const cachePath = this.getTableCachePath(tableName);

            // Check if cache is valid
            const cacheExists = fs.existsSync(cachePath);
            const cacheNotExpired = cachedInfo &&
                (Date.now() - new Date(cachedInfo.fetchedAt).getTime()) < this.config.maxAge!;
            const versionMatches = cachedInfo && serverVersion === cachedInfo.version;

            if (cacheExists && cacheNotExpired && versionMatches) {
                tablesFromCache.push(tableName);
            } else {
                tablesToFetch.push(tableName);
            }
        }

        console.log(`[DataCache] ${tablesFromCache.length} from cache, ${tablesToFetch.length} to fetch`);

        // Step 3: Load cached tables from file
        for (const tableName of tablesFromCache) {
            const cachedData = this.loadFromCache(tableName);
            if (cachedData) {
                results.set(tableName, cachedData);
            } else {
                // Cache file missing, need to fetch
                tablesToFetch.push(tableName);
            }
        }

        // Step 4: Bulk fetch changed tables (1 API call)
        if (tablesToFetch.length > 0) {
            const fetchedTables = await bulk.bulkFetch(tablesToFetch);

            for (const [tableName, tableData] of Object.entries(fetchedTables)) {
                const version = tableData.version || hashTableData(tableData.data);
                this.saveToCache(tableName, tableData.data, version);
                results.set(tableName, tableData.data);
            }
        }

        return results;
    }

    /**
     * Invalidate cache for a specific table
     */
    invalidateTable(tableName: string): void {
        const metadata = this.loadMetadata();
        delete metadata.tables[tableName];
        this.saveMetadata();

        const cachePath = this.getTableCachePath(tableName);
        if (fs.existsSync(cachePath)) {
            fs.unlinkSync(cachePath);
        }

        console.log(`[DataCache] Invalidated cache for "${tableName}"`);
    }

    /**
     * Invalidate all cached data
     */
    invalidateAll(): void {
        if (fs.existsSync(this.cacheDir)) {
            fs.rmSync(this.cacheDir, { recursive: true });
        }
        this.metadata = null;
        console.log(`[DataCache] Invalidated all cached data`);
    }

    /**
     * Get cache statistics
     */
    getStats(): {
        projectId: string;
        tablesCount: number;
        tables: Record<string, { version: string; fetchedAt: string; rowCount: number }>;
    } {
        const metadata = this.loadMetadata();
        return {
            projectId: metadata.projectId,
            tablesCount: Object.keys(metadata.tables).length,
            tables: metadata.tables,
        };
    }
}

/**
 * Create a DataCache instance
 */
export function createDataCache(config: DataCacheConfig): DataCache {
    return new DataCache(config);
}
