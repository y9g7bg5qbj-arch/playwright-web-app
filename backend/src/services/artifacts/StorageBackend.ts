/**
 * Storage Backend Interface and Implementations
 * Provides abstraction for different storage backends (local, S3, GCS)
 */

import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { logger } from '../../utils/logger';

/**
 * Storage backend interface
 */
export interface StorageBackend {
    /**
     * Save data to storage
     */
    save(key: string, data: Buffer, metadata: object): Promise<string>;

    /**
     * Get data from storage
     */
    get(key: string): Promise<Buffer>;

    /**
     * Delete data from storage
     */
    delete(key: string): Promise<void>;

    /**
     * List keys with prefix
     */
    list(prefix: string): Promise<string[]>;

    /**
     * Check if key exists
     */
    exists(key: string): Promise<boolean>;

    /**
     * Get metadata for a key
     */
    getMetadata(key: string): Promise<object | null>;

    /**
     * Get storage URL for a key (for direct access)
     */
    getUrl(key: string): string;

    /**
     * Get stream for reading
     */
    getStream(key: string): NodeJS.ReadableStream;

    /**
     * Get total size of stored data
     */
    getSize(key: string): Promise<number>;
}

/**
 * Local file system storage backend
 */
export class LocalStorageBackend implements StorageBackend {
    private basePath: string;

    constructor(basePath: string) {
        this.basePath = path.resolve(basePath);
    }

    private getFullPath(key: string): string {
        return path.join(this.basePath, key);
    }

    private getMetadataPath(key: string): string {
        return this.getFullPath(key) + '.meta.json';
    }

    async save(key: string, data: Buffer, metadata: object): Promise<string> {
        const fullPath = this.getFullPath(key);
        const dir = path.dirname(fullPath);

        // Ensure directory exists
        await fs.mkdir(dir, { recursive: true });

        // Write data
        await fs.writeFile(fullPath, data);

        // Write metadata
        const metaPath = this.getMetadataPath(key);
        await fs.writeFile(metaPath, JSON.stringify({
            ...metadata,
            size: data.length,
            createdAt: new Date().toISOString(),
        }, null, 2));

        logger.debug(`Saved artifact to local storage: ${key}`);
        return fullPath;
    }

    async get(key: string): Promise<Buffer> {
        const fullPath = this.getFullPath(key);
        return fs.readFile(fullPath);
    }

    async delete(key: string): Promise<void> {
        const fullPath = this.getFullPath(key);
        const metaPath = this.getMetadataPath(key);

        try {
            await fs.unlink(fullPath);
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        try {
            await fs.unlink(metaPath);
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        logger.debug(`Deleted artifact from local storage: ${key}`);
    }

    async list(prefix: string): Promise<string[]> {
        const fullPrefix = this.getFullPath(prefix);
        const dir = path.dirname(fullPrefix);
        const filePrefix = path.basename(prefix);

        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            const results: string[] = [];

            for (const entry of entries) {
                const name = entry.name;
                if (name.startsWith(filePrefix) && !name.endsWith('.meta.json')) {
                    const relativePath = path.join(path.relative(this.basePath, dir), name);
                    if (entry.isDirectory()) {
                        // Recursively list subdirectory
                        const subResults = await this.list(relativePath + '/');
                        results.push(...subResults);
                    } else {
                        results.push(relativePath);
                    }
                }
            }

            return results;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    async exists(key: string): Promise<boolean> {
        const fullPath = this.getFullPath(key);
        try {
            await fs.access(fullPath);
            return true;
        } catch {
            return false;
        }
    }

    async getMetadata(key: string): Promise<object | null> {
        const metaPath = this.getMetadataPath(key);
        try {
            const data = await fs.readFile(metaPath, 'utf-8');
            return JSON.parse(data);
        } catch {
            return null;
        }
    }

    getUrl(key: string): string {
        return `file://${this.getFullPath(key)}`;
    }

    getStream(key: string): NodeJS.ReadableStream {
        const fullPath = this.getFullPath(key);
        return createReadStream(fullPath);
    }

    async getSize(key: string): Promise<number> {
        const fullPath = this.getFullPath(key);
        const stats = await fs.stat(fullPath);
        return stats.size;
    }

    /**
     * Clean up old artifacts
     */
    async cleanup(olderThan: Date): Promise<number> {
        let deletedCount = 0;

        const walkDir = async (dir: string): Promise<void> => {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory()) {
                        await walkDir(fullPath);
                        // Try to remove empty directories
                        try {
                            await fs.rmdir(fullPath);
                        } catch {
                            // Directory not empty, skip
                        }
                    } else if (!entry.name.endsWith('.meta.json')) {
                        const stats = await fs.stat(fullPath);
                        if (stats.mtime < olderThan) {
                            const relativePath = path.relative(this.basePath, fullPath);
                            await this.delete(relativePath);
                            deletedCount++;
                        }
                    }
                }
            } catch (error: any) {
                if (error.code !== 'ENOENT') {
                    logger.warn(`Error walking directory ${dir}:`, error);
                }
            }
        };

        await walkDir(this.basePath);
        logger.info(`Cleaned up ${deletedCount} old artifacts`);
        return deletedCount;
    }
}

/**
 * S3 Storage Backend (placeholder implementation)
 */
export class S3StorageBackend implements StorageBackend {
    private bucket: string;
    private region: string;
    private prefix: string;
    private client: any; // AWS S3 client

    constructor(config: {
        bucket: string;
        region: string;
        prefix?: string;
        accessKeyId?: string;
        secretAccessKey?: string;
    }) {
        this.bucket = config.bucket;
        this.region = config.region;
        this.prefix = config.prefix || '';

        // Note: In production, you would initialize the AWS S3 client here
        // const { S3Client } = require('@aws-sdk/client-s3');
        // this.client = new S3Client({ region: this.region });

        logger.info(`S3 storage backend initialized: ${this.bucket}/${this.prefix}`);
    }

    private getFullKey(key: string): string {
        return this.prefix ? `${this.prefix}/${key}` : key;
    }

    async save(key: string, data: Buffer, metadata: object): Promise<string> {
        const fullKey = this.getFullKey(key);

        // Placeholder implementation
        // In production:
        // const { PutObjectCommand } = require('@aws-sdk/client-s3');
        // await this.client.send(new PutObjectCommand({
        //     Bucket: this.bucket,
        //     Key: fullKey,
        //     Body: data,
        //     Metadata: metadata,
        // }));

        logger.debug(`[S3 Placeholder] Would save to: s3://${this.bucket}/${fullKey}`);
        throw new Error('S3 storage backend not fully implemented. Install @aws-sdk/client-s3 and configure credentials.');
    }

    async get(key: string): Promise<Buffer> {
        const fullKey = this.getFullKey(key);

        // Placeholder implementation
        logger.debug(`[S3 Placeholder] Would get from: s3://${this.bucket}/${fullKey}`);
        throw new Error('S3 storage backend not fully implemented.');
    }

    async delete(key: string): Promise<void> {
        const fullKey = this.getFullKey(key);

        // Placeholder implementation
        logger.debug(`[S3 Placeholder] Would delete: s3://${this.bucket}/${fullKey}`);
        throw new Error('S3 storage backend not fully implemented.');
    }

    async list(prefix: string): Promise<string[]> {
        const fullPrefix = this.getFullKey(prefix);

        // Placeholder implementation
        logger.debug(`[S3 Placeholder] Would list: s3://${this.bucket}/${fullPrefix}`);
        return [];
    }

    async exists(key: string): Promise<boolean> {
        const fullKey = this.getFullKey(key);

        // Placeholder implementation
        logger.debug(`[S3 Placeholder] Would check existence: s3://${this.bucket}/${fullKey}`);
        return false;
    }

    async getMetadata(key: string): Promise<object | null> {
        // Placeholder implementation
        return null;
    }

    getUrl(key: string): string {
        const fullKey = this.getFullKey(key);
        return `s3://${this.bucket}/${fullKey}`;
    }

    getStream(key: string): NodeJS.ReadableStream {
        throw new Error('S3 stream not implemented');
    }

    async getSize(key: string): Promise<number> {
        // Placeholder implementation
        return 0;
    }
}

/**
 * Google Cloud Storage Backend (placeholder implementation)
 */
export class GCSStorageBackend implements StorageBackend {
    private bucket: string;
    private prefix: string;
    private client: any; // GCS client

    constructor(config: {
        bucket: string;
        prefix?: string;
        projectId?: string;
        keyFilePath?: string;
    }) {
        this.bucket = config.bucket;
        this.prefix = config.prefix || '';

        // Note: In production, you would initialize the GCS client here
        // const { Storage } = require('@google-cloud/storage');
        // this.client = new Storage({ projectId: config.projectId, keyFilename: config.keyFilePath });

        logger.info(`GCS storage backend initialized: gs://${this.bucket}/${this.prefix}`);
    }

    private getFullKey(key: string): string {
        return this.prefix ? `${this.prefix}/${key}` : key;
    }

    async save(key: string, data: Buffer, metadata: object): Promise<string> {
        const fullKey = this.getFullKey(key);

        // Placeholder implementation
        logger.debug(`[GCS Placeholder] Would save to: gs://${this.bucket}/${fullKey}`);
        throw new Error('GCS storage backend not fully implemented. Install @google-cloud/storage and configure credentials.');
    }

    async get(key: string): Promise<Buffer> {
        const fullKey = this.getFullKey(key);

        // Placeholder implementation
        logger.debug(`[GCS Placeholder] Would get from: gs://${this.bucket}/${fullKey}`);
        throw new Error('GCS storage backend not fully implemented.');
    }

    async delete(key: string): Promise<void> {
        const fullKey = this.getFullKey(key);

        // Placeholder implementation
        logger.debug(`[GCS Placeholder] Would delete: gs://${this.bucket}/${fullKey}`);
        throw new Error('GCS storage backend not fully implemented.');
    }

    async list(prefix: string): Promise<string[]> {
        const fullPrefix = this.getFullKey(prefix);

        // Placeholder implementation
        logger.debug(`[GCS Placeholder] Would list: gs://${this.bucket}/${fullPrefix}`);
        return [];
    }

    async exists(key: string): Promise<boolean> {
        // Placeholder implementation
        return false;
    }

    async getMetadata(key: string): Promise<object | null> {
        // Placeholder implementation
        return null;
    }

    getUrl(key: string): string {
        const fullKey = this.getFullKey(key);
        return `gs://${this.bucket}/${fullKey}`;
    }

    getStream(key: string): NodeJS.ReadableStream {
        throw new Error('GCS stream not implemented');
    }

    async getSize(key: string): Promise<number> {
        // Placeholder implementation
        return 0;
    }
}

/**
 * Create storage backend from configuration
 */
export function createStorageBackend(config: {
    type: 'local' | 's3' | 'gcs';
    basePath?: string;
    bucket?: string;
    region?: string;
    prefix?: string;
    projectId?: string;
    keyFilePath?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
}): StorageBackend {
    switch (config.type) {
        case 'local':
            return new LocalStorageBackend(config.basePath || './storage/artifacts');

        case 's3':
            if (!config.bucket || !config.region) {
                throw new Error('S3 storage requires bucket and region');
            }
            return new S3StorageBackend({
                bucket: config.bucket,
                region: config.region,
                prefix: config.prefix,
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            });

        case 'gcs':
            if (!config.bucket) {
                throw new Error('GCS storage requires bucket');
            }
            return new GCSStorageBackend({
                bucket: config.bucket,
                prefix: config.prefix,
                projectId: config.projectId,
                keyFilePath: config.keyFilePath,
            });

        default:
            throw new Error(`Unknown storage backend type: ${config.type}`);
    }
}
