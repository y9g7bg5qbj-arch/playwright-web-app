/**
 * Artifact Manager
 * Handles storage, retrieval, and management of test artifacts
 * (traces, screenshots, videos, reports)
 */

import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { ArtifactRef } from '../execution/types';
import {
    StorageBackend,
    LocalStorageBackend,
    createStorageBackend,
} from './StorageBackend';
import { logger } from '../../utils/logger';

/**
 * MIME types for different artifact types
 */
const MIME_TYPES: Record<string, string> = {
    trace: 'application/zip',
    screenshot: 'image/png',
    video: 'video/webm',
    html: 'text/html',
    json: 'application/json',
    log: 'text/plain',
};

/**
 * File extensions for different artifact types
 */
const EXTENSIONS: Record<string, string> = {
    trace: '.zip',
    screenshot: '.png',
    video: '.webm',
    html: '.html',
    json: '.json',
    log: '.log',
};

/**
 * Artifact Manager Interface
 */
export interface IArtifactManager {
    // Storage
    saveTrace(testId: string, traceData: Buffer): Promise<ArtifactRef>;
    saveScreenshot(testId: string, name: string, data: Buffer): Promise<ArtifactRef>;
    saveVideo(testId: string, data: Buffer): Promise<ArtifactRef>;

    // Retrieval
    getArtifact(ref: ArtifactRef): Promise<Buffer>;
    getArtifactsForTest(testId: string): Promise<ArtifactRef[]>;
    getArtifactsForRun(runId: string): Promise<ArtifactRef[]>;

    // Cleanup
    deleteArtifact(ref: ArtifactRef): Promise<void>;
    cleanup(olderThan: Date): Promise<number>;

    // Storage backends
    setStorageBackend(backend: StorageBackend): void;
}

/**
 * Artifact Manager Implementation
 */
export class ArtifactManager implements IArtifactManager {
    private storageBackend: StorageBackend;
    private artifactIndex: Map<string, ArtifactRef[]> = new Map();
    private runIndex: Map<string, string[]> = new Map();
    private indexPath: string;

    constructor(config?: {
        storagePath?: string;
        storageType?: 'local' | 's3' | 'gcs';
        bucket?: string;
        region?: string;
        prefix?: string;
    }) {
        const storagePath = config?.storagePath || process.env.STORAGE_PATH || './storage/artifacts';
        this.indexPath = path.join(storagePath, '.artifact-index.json');

        // Initialize storage backend
        if (config?.storageType && config.storageType !== 'local') {
            this.storageBackend = createStorageBackend({
                type: config.storageType,
                bucket: config.bucket,
                region: config.region,
                prefix: config.prefix,
            });
        } else {
            this.storageBackend = new LocalStorageBackend(storagePath);
        }
    }

    /**
     * Initialize the artifact manager
     */
    async initialize(): Promise<void> {
        // Load existing artifact index
        await this.loadIndex();
        logger.info('Artifact Manager initialized');
    }

    /**
     * Load artifact index from disk
     */
    private async loadIndex(): Promise<void> {
        try {
            const indexData = await fs.readFile(this.indexPath, 'utf-8');
            const index = JSON.parse(indexData);

            // Restore Maps from serialized data
            for (const [testId, artifacts] of Object.entries(index.artifacts || {})) {
                this.artifactIndex.set(testId, artifacts as ArtifactRef[]);
            }

            for (const [runId, testIds] of Object.entries(index.runs || {})) {
                this.runIndex.set(runId, testIds as string[]);
            }

            logger.debug(`Loaded artifact index with ${this.artifactIndex.size} tests`);
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                logger.warn('Failed to load artifact index:', error);
            }
        }
    }

    /**
     * Save artifact index to disk
     */
    private async saveIndex(): Promise<void> {
        const index = {
            artifacts: Object.fromEntries(this.artifactIndex),
            runs: Object.fromEntries(this.runIndex),
            lastUpdated: new Date().toISOString(),
        };

        await fs.mkdir(path.dirname(this.indexPath), { recursive: true });
        await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2));
    }

    /**
     * Set storage backend
     */
    setStorageBackend(backend: StorageBackend): void {
        this.storageBackend = backend;
        logger.info('Storage backend updated');
    }

    /**
     * Save a trace file
     */
    async saveTrace(testId: string, traceData: Buffer): Promise<ArtifactRef> {
        const artifactId = uuidv4();
        const fileName = `trace-${testId}${EXTENSIONS.trace}`;
        const storagePath = `traces/${testId}/${fileName}`;

        await this.storageBackend.save(storagePath, traceData, {
            testId,
            type: 'trace',
            artifactId,
        });

        const ref: ArtifactRef = {
            id: artifactId,
            testId,
            type: 'trace',
            name: 'trace',
            path: storagePath,
            size: traceData.length,
            mimeType: MIME_TYPES.trace,
            createdAt: new Date(),
        };

        // Update index
        this.addToIndex(testId, ref);
        await this.saveIndex();

        logger.debug(`Saved trace for test ${testId}: ${storagePath}`);
        return ref;
    }

    /**
     * Save a screenshot
     */
    async saveScreenshot(testId: string, name: string, data: Buffer): Promise<ArtifactRef> {
        const artifactId = uuidv4();
        const fileName = `${name}-${Date.now()}${EXTENSIONS.screenshot}`;
        const storagePath = `screenshots/${testId}/${fileName}`;

        await this.storageBackend.save(storagePath, data, {
            testId,
            type: 'screenshot',
            name,
            artifactId,
        });

        const ref: ArtifactRef = {
            id: artifactId,
            testId,
            type: 'screenshot',
            name,
            path: storagePath,
            size: data.length,
            mimeType: MIME_TYPES.screenshot,
            createdAt: new Date(),
        };

        this.addToIndex(testId, ref);
        await this.saveIndex();

        logger.debug(`Saved screenshot for test ${testId}: ${storagePath}`);
        return ref;
    }

    /**
     * Save a video
     */
    async saveVideo(testId: string, data: Buffer): Promise<ArtifactRef> {
        const artifactId = uuidv4();
        const fileName = `video-${testId}${EXTENSIONS.video}`;
        const storagePath = `videos/${testId}/${fileName}`;

        await this.storageBackend.save(storagePath, data, {
            testId,
            type: 'video',
            artifactId,
        });

        const ref: ArtifactRef = {
            id: artifactId,
            testId,
            type: 'video',
            name: 'video',
            path: storagePath,
            size: data.length,
            mimeType: MIME_TYPES.video,
            createdAt: new Date(),
        };

        this.addToIndex(testId, ref);
        await this.saveIndex();

        logger.debug(`Saved video for test ${testId}: ${storagePath}`);
        return ref;
    }

    /**
     * Save an HTML report
     */
    async saveHtmlReport(testId: string, name: string, html: string): Promise<ArtifactRef> {
        const artifactId = uuidv4();
        const fileName = `${name}${EXTENSIONS.html}`;
        const storagePath = `reports/${testId}/${fileName}`;

        await this.storageBackend.save(storagePath, Buffer.from(html), {
            testId,
            type: 'html',
            name,
            artifactId,
        });

        const ref: ArtifactRef = {
            id: artifactId,
            testId,
            type: 'html',
            name,
            path: storagePath,
            size: html.length,
            mimeType: MIME_TYPES.html,
            createdAt: new Date(),
        };

        this.addToIndex(testId, ref);
        await this.saveIndex();

        logger.debug(`Saved HTML report for test ${testId}: ${storagePath}`);
        return ref;
    }

    /**
     * Save JSON data
     */
    async saveJsonData(testId: string, name: string, data: object): Promise<ArtifactRef> {
        const artifactId = uuidv4();
        const fileName = `${name}${EXTENSIONS.json}`;
        const storagePath = `data/${testId}/${fileName}`;
        const jsonString = JSON.stringify(data, null, 2);

        await this.storageBackend.save(storagePath, Buffer.from(jsonString), {
            testId,
            type: 'json',
            name,
            artifactId,
        });

        const ref: ArtifactRef = {
            id: artifactId,
            testId,
            type: 'json',
            name,
            path: storagePath,
            size: jsonString.length,
            mimeType: MIME_TYPES.json,
            createdAt: new Date(),
        };

        this.addToIndex(testId, ref);
        await this.saveIndex();

        logger.debug(`Saved JSON data for test ${testId}: ${storagePath}`);
        return ref;
    }

    /**
     * Save a log file
     */
    async saveLog(testId: string, name: string, content: string): Promise<ArtifactRef> {
        const artifactId = uuidv4();
        const fileName = `${name}${EXTENSIONS.log}`;
        const storagePath = `logs/${testId}/${fileName}`;

        await this.storageBackend.save(storagePath, Buffer.from(content), {
            testId,
            type: 'log',
            name,
            artifactId,
        });

        const ref: ArtifactRef = {
            id: artifactId,
            testId,
            type: 'log',
            name,
            path: storagePath,
            size: content.length,
            mimeType: MIME_TYPES.log,
            createdAt: new Date(),
        };

        this.addToIndex(testId, ref);
        await this.saveIndex();

        logger.debug(`Saved log for test ${testId}: ${storagePath}`);
        return ref;
    }

    /**
     * Get artifact data by reference
     */
    async getArtifact(ref: ArtifactRef): Promise<Buffer> {
        return this.storageBackend.get(ref.path);
    }

    /**
     * Get artifact by ID
     */
    async getArtifactById(artifactId: string): Promise<Buffer | null> {
        for (const artifacts of this.artifactIndex.values()) {
            const artifact = artifacts.find(a => a.id === artifactId);
            if (artifact) {
                return this.getArtifact(artifact);
            }
        }
        return null;
    }

    /**
     * Get artifact reference by ID
     */
    getArtifactRefById(artifactId: string): ArtifactRef | null {
        for (const artifacts of this.artifactIndex.values()) {
            const artifact = artifacts.find(a => a.id === artifactId);
            if (artifact) {
                return artifact;
            }
        }
        return null;
    }

    /**
     * Get all artifacts for a test
     */
    async getArtifactsForTest(testId: string): Promise<ArtifactRef[]> {
        return this.artifactIndex.get(testId) || [];
    }

    /**
     * Get all artifacts for a run
     */
    async getArtifactsForRun(runId: string): Promise<ArtifactRef[]> {
        const testIds = this.runIndex.get(runId) || [];
        const allArtifacts: ArtifactRef[] = [];

        for (const testId of testIds) {
            const artifacts = await this.getArtifactsForTest(testId);
            allArtifacts.push(...artifacts.map(a => ({ ...a, runId })));
        }

        return allArtifacts;
    }

    /**
     * Get artifact stream for large files
     */
    getArtifactStream(ref: ArtifactRef): NodeJS.ReadableStream {
        return this.storageBackend.getStream(ref.path);
    }

    /**
     * Delete a single artifact
     */
    async deleteArtifact(ref: ArtifactRef): Promise<void> {
        await this.storageBackend.delete(ref.path);

        // Remove from index
        const artifacts = this.artifactIndex.get(ref.testId);
        if (artifacts) {
            const index = artifacts.findIndex(a => a.id === ref.id);
            if (index !== -1) {
                artifacts.splice(index, 1);
            }
            if (artifacts.length === 0) {
                this.artifactIndex.delete(ref.testId);
            }
        }

        await this.saveIndex();
        logger.debug(`Deleted artifact: ${ref.path}`);
    }

    /**
     * Delete all artifacts for a test
     */
    async deleteArtifactsForTest(testId: string): Promise<number> {
        const artifacts = this.artifactIndex.get(testId) || [];
        let deletedCount = 0;

        for (const artifact of artifacts) {
            try {
                await this.storageBackend.delete(artifact.path);
                deletedCount++;
            } catch (error) {
                logger.warn(`Failed to delete artifact ${artifact.path}:`, error);
            }
        }

        this.artifactIndex.delete(testId);
        await this.saveIndex();

        logger.info(`Deleted ${deletedCount} artifacts for test ${testId}`);
        return deletedCount;
    }

    /**
     * Clean up old artifacts
     */
    async cleanup(olderThan: Date): Promise<number> {
        let deletedCount = 0;

        for (const [testId, artifacts] of this.artifactIndex) {
            const remainingArtifacts: ArtifactRef[] = [];

            for (const artifact of artifacts) {
                if (artifact.createdAt < olderThan) {
                    try {
                        await this.storageBackend.delete(artifact.path);
                        deletedCount++;
                    } catch (error) {
                        logger.warn(`Failed to delete old artifact ${artifact.path}:`, error);
                        remainingArtifacts.push(artifact);
                    }
                } else {
                    remainingArtifacts.push(artifact);
                }
            }

            if (remainingArtifacts.length === 0) {
                this.artifactIndex.delete(testId);
            } else {
                this.artifactIndex.set(testId, remainingArtifacts);
            }
        }

        await this.saveIndex();
        logger.info(`Cleaned up ${deletedCount} old artifacts`);
        return deletedCount;
    }

    /**
     * Associate a test with a run
     */
    associateWithRun(runId: string, testId: string): void {
        const testIds = this.runIndex.get(runId) || [];
        if (!testIds.includes(testId)) {
            testIds.push(testId);
            this.runIndex.set(runId, testIds);
        }
    }

    /**
     * Add artifact to index
     */
    private addToIndex(testId: string, ref: ArtifactRef): void {
        const artifacts = this.artifactIndex.get(testId) || [];
        artifacts.push(ref);
        this.artifactIndex.set(testId, artifacts);
    }

    /**
     * Get total storage size
     */
    async getTotalStorageSize(): Promise<number> {
        let totalSize = 0;

        for (const artifacts of this.artifactIndex.values()) {
            for (const artifact of artifacts) {
                totalSize += artifact.size;
            }
        }

        return totalSize;
    }

    /**
     * Get storage statistics
     */
    async getStorageStats(): Promise<{
        totalSize: number;
        artifactCount: number;
        testCount: number;
        byType: Record<string, { count: number; size: number }>;
    }> {
        const byType: Record<string, { count: number; size: number }> = {};
        let totalSize = 0;
        let artifactCount = 0;

        for (const artifacts of this.artifactIndex.values()) {
            for (const artifact of artifacts) {
                totalSize += artifact.size;
                artifactCount++;

                if (!byType[artifact.type]) {
                    byType[artifact.type] = { count: 0, size: 0 };
                }
                byType[artifact.type].count++;
                byType[artifact.type].size += artifact.size;
            }
        }

        return {
            totalSize,
            artifactCount,
            testCount: this.artifactIndex.size,
            byType,
        };
    }
}

// Export singleton instance
export const artifactManager = new ArtifactManager();
