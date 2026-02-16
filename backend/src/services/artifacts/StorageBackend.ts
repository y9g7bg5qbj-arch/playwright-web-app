/**
 * Storage Backend Interface and Implementations
 * Provides abstraction for different storage backends (local, S3, GCS)
 */

import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
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
 * S3 Storage Backend - Full implementation for AWS S3
 * Requires @aws-sdk/client-s3 package
 */
export class S3StorageBackend implements StorageBackend {
    private bucket: string;
    private region: string;
    private prefix: string;
    private client: any; // S3Client from @aws-sdk/client-s3
    private isInitialized: boolean = false;

    constructor(config: {
        bucket: string;
        region: string;
        prefix?: string;
        accessKeyId?: string;
        secretAccessKey?: string;
        endpoint?: string; // For S3-compatible services like MinIO
    }) {
        this.bucket = config.bucket;
        this.region = config.region;
        this.prefix = config.prefix || '';

        // Lazy initialization to allow graceful fallback
        this.initializeClient(config);
    }

    private async initializeClient(config: {
        accessKeyId?: string;
        secretAccessKey?: string;
        endpoint?: string;
    }) {
        try {
            const { S3Client } = await import('@aws-sdk/client-s3');

            const clientConfig: any = {
                region: this.region,
            };

            // Use explicit credentials if provided, otherwise rely on default credential chain
            if (config.accessKeyId && config.secretAccessKey) {
                clientConfig.credentials = {
                    accessKeyId: config.accessKeyId,
                    secretAccessKey: config.secretAccessKey,
                };
            }

            // Support S3-compatible services (MinIO, DigitalOcean Spaces, etc.)
            if (config.endpoint) {
                clientConfig.endpoint = config.endpoint;
                clientConfig.forcePathStyle = true;
            }

            this.client = new S3Client(clientConfig);
            this.isInitialized = true;
            logger.info(`S3 storage backend initialized: ${this.bucket}/${this.prefix}`);
        } catch (error) {
            logger.warn('AWS SDK not available. S3 storage backend will not work.', error);
            this.isInitialized = false;
        }
    }

    private ensureInitialized(): void {
        if (!this.isInitialized || !this.client) {
            throw new Error('S3 storage backend not initialized. Install @aws-sdk/client-s3: npm install @aws-sdk/client-s3');
        }
    }

    private getFullKey(key: string): string {
        return this.prefix ? `${this.prefix}/${key}` : key;
    }

    async save(key: string, data: Buffer, metadata: object): Promise<string> {
        this.ensureInitialized();
        const fullKey = this.getFullKey(key);

        const { PutObjectCommand } = await import('@aws-sdk/client-s3');

        // Convert metadata to S3-compatible format (all values must be strings)
        const s3Metadata: Record<string, string> = {};
        for (const [k, v] of Object.entries(metadata)) {
            s3Metadata[k] = String(v);
        }

        await this.client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: fullKey,
            Body: data,
            Metadata: s3Metadata,
            ContentType: this.getContentType(key),
        }));

        logger.debug(`Saved to S3: s3://${this.bucket}/${fullKey}`);
        return `s3://${this.bucket}/${fullKey}`;
    }

    async get(key: string): Promise<Buffer> {
        this.ensureInitialized();
        const fullKey = this.getFullKey(key);

        const { GetObjectCommand } = await import('@aws-sdk/client-s3');

        const response = await this.client.send(new GetObjectCommand({
            Bucket: this.bucket,
            Key: fullKey,
        }));

        // Convert stream to buffer
        const chunks: Uint8Array[] = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }

    async delete(key: string): Promise<void> {
        this.ensureInitialized();
        const fullKey = this.getFullKey(key);

        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');

        await this.client.send(new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: fullKey,
        }));

        logger.debug(`Deleted from S3: s3://${this.bucket}/${fullKey}`);
    }

    async list(prefix: string): Promise<string[]> {
        this.ensureInitialized();
        const fullPrefix = this.getFullKey(prefix);

        const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');

        const results: string[] = [];
        let continuationToken: string | undefined;

        do {
            const response = await this.client.send(new ListObjectsV2Command({
                Bucket: this.bucket,
                Prefix: fullPrefix,
                ContinuationToken: continuationToken,
            }));

            if (response.Contents) {
                for (const object of response.Contents) {
                    if (object.Key) {
                        // Remove prefix to return relative paths
                        const relativePath = this.prefix
                            ? object.Key.replace(`${this.prefix}/`, '')
                            : object.Key;
                        results.push(relativePath);
                    }
                }
            }

            continuationToken = response.NextContinuationToken;
        } while (continuationToken);

        return results;
    }

    async exists(key: string): Promise<boolean> {
        this.ensureInitialized();
        const fullKey = this.getFullKey(key);

        const { HeadObjectCommand } = await import('@aws-sdk/client-s3');

        try {
            await this.client.send(new HeadObjectCommand({
                Bucket: this.bucket,
                Key: fullKey,
            }));
            return true;
        } catch (error: any) {
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                return false;
            }
            throw error;
        }
    }

    async getMetadata(key: string): Promise<object | null> {
        this.ensureInitialized();
        const fullKey = this.getFullKey(key);

        const { HeadObjectCommand } = await import('@aws-sdk/client-s3');

        try {
            const response = await this.client.send(new HeadObjectCommand({
                Bucket: this.bucket,
                Key: fullKey,
            }));
            return {
                ...response.Metadata,
                contentType: response.ContentType,
                contentLength: response.ContentLength,
                lastModified: response.LastModified,
                eTag: response.ETag,
            };
        } catch (error: any) {
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                return null;
            }
            throw error;
        }
    }

    getUrl(key: string): string {
        const fullKey = this.getFullKey(key);
        return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fullKey}`;
    }

    /**
     * Get a presigned URL for direct access (valid for specified duration)
     */
    async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
        this.ensureInitialized();
        const fullKey = this.getFullKey(key);

        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: fullKey,
        });

        return getSignedUrl(this.client, command, { expiresIn });
    }

    getStream(key: string): NodeJS.ReadableStream {
        // For streaming, we need to return a passthrough stream that we populate
        const { PassThrough } = require('stream');
        const passThrough = new PassThrough();

        // Async initialization
        (async () => {
            try {
                this.ensureInitialized();
                const fullKey = this.getFullKey(key);

                const { GetObjectCommand } = await import('@aws-sdk/client-s3');
                const response = await this.client.send(new GetObjectCommand({
                    Bucket: this.bucket,
                    Key: fullKey,
                }));

                response.Body.pipe(passThrough);
            } catch (error) {
                passThrough.destroy(error as Error);
            }
        })();

        return passThrough;
    }

    async getSize(key: string): Promise<number> {
        const metadata = await this.getMetadata(key);
        return (metadata as any)?.contentLength || 0;
    }

    private getContentType(key: string): string {
        const ext = path.extname(key).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.vero': 'text/plain',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webm': 'video/webm',
            '.mp4': 'video/mp4',
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.ts': 'text/typescript',
            '.zip': 'application/zip',
            '.txt': 'text/plain',
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * Copy an object within S3
     */
    async copy(sourceKey: string, destKey: string): Promise<void> {
        this.ensureInitialized();
        const fullSourceKey = this.getFullKey(sourceKey);
        const fullDestKey = this.getFullKey(destKey);

        const { CopyObjectCommand } = await import('@aws-sdk/client-s3');

        await this.client.send(new CopyObjectCommand({
            Bucket: this.bucket,
            CopySource: `${this.bucket}/${fullSourceKey}`,
            Key: fullDestKey,
        }));

        logger.debug(`Copied in S3: ${sourceKey} -> ${destKey}`);
    }

    /**
     * Delete multiple objects
     */
    async deleteMany(keys: string[]): Promise<void> {
        this.ensureInitialized();

        const { DeleteObjectsCommand } = await import('@aws-sdk/client-s3');

        // S3 limits to 1000 objects per request
        const batches: string[][] = [];
        for (let i = 0; i < keys.length; i += 1000) {
            batches.push(keys.slice(i, i + 1000));
        }

        for (const batch of batches) {
            await this.client.send(new DeleteObjectsCommand({
                Bucket: this.bucket,
                Delete: {
                    Objects: batch.map(key => ({ Key: this.getFullKey(key) })),
                },
            }));
        }

        logger.debug(`Deleted ${keys.length} objects from S3`);
    }
}

/**
 * Google Cloud Storage Backend (placeholder implementation)
 */
export class GCSStorageBackend implements StorageBackend {
    private bucket: string;
    private prefix: string;

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

    async save(key: string, _data: Buffer, _metadata: object): Promise<string> {
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

    async exists(_key: string): Promise<boolean> {
        // Placeholder implementation
        return false;
    }

    async getMetadata(_key: string): Promise<object | null> {
        // Placeholder implementation
        return null;
    }

    getUrl(key: string): string {
        const fullKey = this.getFullKey(key);
        return `gs://${this.bucket}/${fullKey}`;
    }

    getStream(_key: string): NodeJS.ReadableStream {
        throw new Error('GCS stream not implemented');
    }

    async getSize(_key: string): Promise<number> {
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
