/**
 * Artifact Collector
 * Handles collection and storage of screenshots, traces, and videos during execution
 */

import { Page, BrowserContext } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import { ExecutionArtifacts, StepArtifacts, ExecutionConfig } from '@playwright-web-app/shared';
import { logger } from '../utils/logger';

// Storage path for execution artifacts
const STORAGE_PATH = path.resolve(process.env.STORAGE_PATH || './storage');

export class ArtifactCollector {
    private executionId: string;
    private config: ExecutionConfig;
    private storageDir: string;
    private screenshotsDir: string;
    private tracesDir: string;
    private videosDir: string;
    private screenshotCount: number = 0;
    private screenshots: string[] = [];

    constructor(executionId: string, config: ExecutionConfig) {
        this.executionId = executionId;
        this.config = config;
        this.storageDir = path.join(STORAGE_PATH, executionId);
        this.screenshotsDir = path.join(this.storageDir, 'screenshots');
        this.tracesDir = path.join(this.storageDir, 'traces');
        this.videosDir = path.join(this.storageDir, 'videos');
    }

    /**
     * Initialize storage directories
     */
    async initialize(): Promise<void> {
        await fs.mkdir(this.storageDir, { recursive: true });
        await fs.mkdir(this.screenshotsDir, { recursive: true });
        await fs.mkdir(this.tracesDir, { recursive: true });

        if (this.config.video !== 'off') {
            await fs.mkdir(this.videosDir, { recursive: true });
        }

        logger.info(`Artifact collector initialized for execution ${this.executionId}`);
    }

    /**
     * Capture screenshot before a step
     */
    async captureBeforeScreenshot(page: Page, nodeId: string): Promise<string | undefined> {
        if (this.config.screenshot === 'off') {
            return undefined;
        }

        try {
            const filename = `step-${++this.screenshotCount}-before-${this.sanitizeFilename(nodeId)}.png`;
            const filepath = path.join(this.screenshotsDir, filename);

            await page.screenshot({
                path: filepath,
                fullPage: false,
                timeout: 5000,
            });

            this.screenshots.push(filepath);
            return filepath;
        } catch (error) {
            logger.warn(`Failed to capture before screenshot for ${nodeId}:`, error);
            return undefined;
        }
    }

    /**
     * Capture screenshot after a step
     */
    async captureAfterScreenshot(page: Page, nodeId: string): Promise<string | undefined> {
        if (this.config.screenshot === 'off') {
            return undefined;
        }

        try {
            const filename = `step-${this.screenshotCount}-after-${this.sanitizeFilename(nodeId)}.png`;
            const filepath = path.join(this.screenshotsDir, filename);

            await page.screenshot({
                path: filepath,
                fullPage: false,
                timeout: 5000,
            });

            this.screenshots.push(filepath);
            return filepath;
        } catch (error) {
            logger.warn(`Failed to capture after screenshot for ${nodeId}:`, error);
            return undefined;
        }
    }

    /**
     * Capture screenshot on failure
     */
    async captureFailureScreenshot(page: Page, nodeId: string): Promise<string | undefined> {
        try {
            const filename = `failure-${this.sanitizeFilename(nodeId)}-${Date.now()}.png`;
            const filepath = path.join(this.screenshotsDir, filename);

            await page.screenshot({
                path: filepath,
                fullPage: true,
                timeout: 10000,
            });

            this.screenshots.push(filepath);
            logger.info(`Captured failure screenshot: ${filepath}`);
            return filepath;
        } catch (error) {
            logger.error(`Failed to capture failure screenshot for ${nodeId}:`, error);
            return undefined;
        }
    }

    /**
     * Capture screenshot as base64
     */
    async captureScreenshotBase64(page: Page): Promise<string | undefined> {
        try {
            const buffer = await page.screenshot({
                fullPage: true,
                timeout: 10000,
            });
            return buffer.toString('base64');
        } catch (error) {
            logger.warn('Failed to capture screenshot as base64:', error);
            return undefined;
        }
    }

    /**
     * Start tracing on context
     */
    async startTracing(context: BrowserContext): Promise<void> {
        if (this.config.trace === 'off') {
            return;
        }

        try {
            await context.tracing.start({
                screenshots: true,
                snapshots: true,
                sources: true,
            });
            logger.info(`Tracing started for execution ${this.executionId}`);
        } catch (error) {
            logger.error('Failed to start tracing:', error);
        }
    }

    /**
     * Stop tracing and save
     */
    async stopTracing(context: BrowserContext, failed: boolean): Promise<string | undefined> {
        if (this.config.trace === 'off') {
            return undefined;
        }

        // Handle retain-on-failure logic
        if (this.config.trace === 'retain-on-failure' && !failed) {
            try {
                await context.tracing.stop();
            } catch {
                // Ignore errors when discarding trace
            }
            return undefined;
        }

        try {
            const tracePath = path.join(this.tracesDir, `trace-${this.executionId}.zip`);
            await context.tracing.stop({ path: tracePath });
            logger.info(`Trace saved to: ${tracePath}`);
            return tracePath;
        } catch (error) {
            logger.error('Failed to save trace:', error);
            return undefined;
        }
    }

    /**
     * Collect step artifacts
     */
    async collectStepArtifacts(
        page: Page,
        nodeId: string,
        captureType: 'before' | 'after' | 'both' | 'failure'
    ): Promise<StepArtifacts> {
        const artifacts: StepArtifacts = {};

        if (captureType === 'failure') {
            artifacts.screenshot = await this.captureFailureScreenshot(page, nodeId);
            artifacts.screenshotBase64 = await this.captureScreenshotBase64(page);
        } else if (captureType === 'before' || captureType === 'both') {
            artifacts.beforeScreenshot = await this.captureBeforeScreenshot(page, nodeId);
        }

        if (captureType === 'after' || captureType === 'both') {
            artifacts.afterScreenshot = await this.captureAfterScreenshot(page, nodeId);
        }

        return artifacts;
    }

    /**
     * Collect all execution artifacts
     */
    async collectExecutionArtifacts(
        context: BrowserContext,
        failed: boolean
    ): Promise<ExecutionArtifacts> {
        const trace = await this.stopTracing(context, failed);

        // Find video file if recording was enabled
        let video: string | undefined;
        if (this.config.video !== 'off') {
            video = await this.findVideoFile();
        }

        return {
            trace,
            video,
            screenshots: [...this.screenshots],
        };
    }

    /**
     * Find video file in storage
     */
    private async findVideoFile(): Promise<string | undefined> {
        try {
            const files = await fs.readdir(this.videosDir);
            const videoFile = files.find(f => f.endsWith('.webm') || f.endsWith('.mp4'));
            if (videoFile) {
                return path.join(this.videosDir, videoFile);
            }
        } catch {
            // Directory might not exist
        }
        return undefined;
    }

    /**
     * Get relative path for web serving
     */
    getRelativePath(absolutePath: string): string {
        return path.relative(STORAGE_PATH, absolutePath);
    }

    /**
     * Get web-accessible URL for artifact
     */
    getArtifactUrl(absolutePath: string): string {
        const relativePath = this.getRelativePath(absolutePath);
        return `/api/executions/${this.executionId}/artifacts/${relativePath}`;
    }

    /**
     * Clean up artifacts (for failed retries, etc.)
     */
    async cleanup(): Promise<void> {
        try {
            await fs.rm(this.storageDir, { recursive: true, force: true });
            logger.info(`Cleaned up artifacts for execution ${this.executionId}`);
        } catch (error) {
            logger.warn(`Failed to clean up artifacts:`, error);
        }
    }

    /**
     * Sanitize filename for storage
     */
    private sanitizeFilename(name: string): string {
        return name.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
    }

    /**
     * Get storage directory path
     */
    getStorageDir(): string {
        return this.storageDir;
    }

    /**
     * Get screenshots directory path
     */
    getScreenshotsDir(): string {
        return this.screenshotsDir;
    }
}
