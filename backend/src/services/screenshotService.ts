/**
 * Screenshot Service
 *
 * Manages screenshot capture and storage for recording sessions.
 */

import { mkdir, writeFile, readdir, unlink, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { logger } from '../utils/logger';

// Base directory for screenshots
const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR ||
    join(process.cwd(), 'artifacts', 'screenshots');

/**
 * Screenshot options
 */
export interface ScreenshotOptions {
    /** Full page screenshot (default: false) */
    fullPage?: boolean;
    /** Image type (default: png) */
    type?: 'png' | 'jpeg';
    /** Quality for jpeg (0-100) */
    quality?: number;
    /** Clip region */
    clip?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

/**
 * Screenshot metadata
 */
export interface ScreenshotMetadata {
    sessionId: string;
    stepNumber: number;
    filename: string;
    path: string;
    timestamp: Date;
    size: number;
    dimensions?: {
        width: number;
        height: number;
    };
}

class ScreenshotService {
    private baseDir: string;

    constructor(baseDir: string = SCREENSHOTS_DIR) {
        this.baseDir = baseDir;
    }

    /**
     * Ensure the screenshots directory exists
     */
    async ensureDir(sessionId: string): Promise<string> {
        const dir = join(this.baseDir, sessionId);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }
        return dir;
    }

    /**
     * Save a step screenshot
     */
    async saveStepScreenshot(
        sessionId: string,
        stepNumber: number,
        buffer: Buffer,
        options: ScreenshotOptions = {}
    ): Promise<ScreenshotMetadata> {
        const dir = await this.ensureDir(sessionId);
        const timestamp = new Date();
        const extension = options.type || 'png';
        const filename = `step-${String(stepNumber).padStart(3, '0')}-${timestamp.getTime()}.${extension}`;
        const filepath = join(dir, filename);

        await writeFile(filepath, buffer);

        const stats = await stat(filepath);

        return {
            sessionId,
            stepNumber,
            filename,
            path: filepath,
            timestamp,
            size: stats.size,
        };
    }

    /**
     * Get all screenshots for a session
     */
    async getSessionScreenshots(sessionId: string): Promise<ScreenshotMetadata[]> {
        const dir = join(this.baseDir, sessionId);

        if (!existsSync(dir)) {
            return [];
        }

        const files = await readdir(dir);
        const screenshots: ScreenshotMetadata[] = [];

        for (const filename of files) {
            if (!filename.match(/\.(png|jpeg|jpg)$/i)) continue;

            const filepath = join(dir, filename);
            const stats = await stat(filepath);

            // Extract step number from filename: step-001-timestamp.png
            const match = filename.match(/step-(\d+)-(\d+)\./);
            const stepNumber = match ? parseInt(match[1], 10) : 0;
            const timestamp = match ? new Date(parseInt(match[2], 10)) : stats.mtime;

            screenshots.push({
                sessionId,
                stepNumber,
                filename,
                path: filepath,
                timestamp,
                size: stats.size,
            });
        }

        // Sort by step number
        return screenshots.sort((a, b) => a.stepNumber - b.stepNumber);
    }

    /**
     * Get screenshot by step number
     */
    async getStepScreenshot(sessionId: string, stepNumber: number): Promise<ScreenshotMetadata | null> {
        const screenshots = await this.getSessionScreenshots(sessionId);
        return screenshots.find(s => s.stepNumber === stepNumber) || null;
    }

    /**
     * Delete all screenshots for a session
     */
    async cleanupSession(sessionId: string): Promise<number> {
        const dir = join(this.baseDir, sessionId);

        if (!existsSync(dir)) {
            return 0;
        }

        const files = await readdir(dir);
        let deleted = 0;

        for (const filename of files) {
            try {
                await unlink(join(dir, filename));
                deleted++;
            } catch (e) {
                logger.warn(`Failed to delete screenshot: ${filename}`, e);
            }
        }

        // Try to remove the directory
        try {
            const { rmdir } = await import('fs/promises');
            await rmdir(dir);
        } catch (e) {
            // Directory not empty or other error, ignore
        }

        return deleted;
    }

    /**
     * Clean up old sessions
     */
    async cleanupOldSessions(maxAgeDays: number = 7): Promise<number> {
        if (!existsSync(this.baseDir)) {
            return 0;
        }

        const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
        const sessions = await readdir(this.baseDir);
        let cleaned = 0;

        for (const sessionId of sessions) {
            const dir = join(this.baseDir, sessionId);
            try {
                const stats = await stat(dir);
                if (stats.mtime.getTime() < cutoff) {
                    await this.cleanupSession(sessionId);
                    cleaned++;
                }
            } catch (e) {
                // Ignore errors
            }
        }

        return cleaned;
    }

    /**
     * Get the relative URL path for a screenshot
     */
    getScreenshotUrl(sessionId: string, filename: string): string {
        return `/api/screenshots/${sessionId}/${filename}`;
    }

    /**
     * Convert screenshot buffer to base64 data URL
     */
    bufferToDataUrl(buffer: Buffer, type: 'png' | 'jpeg' = 'png'): string {
        const base64 = buffer.toString('base64');
        const mimeType = type === 'jpeg' ? 'image/jpeg' : 'image/png';
        return `data:${mimeType};base64,${base64}`;
    }

    /**
     * Get storage statistics
     */
    async getStorageStats(): Promise<{
        totalSessions: number;
        totalScreenshots: number;
        totalSizeBytes: number;
    }> {
        if (!existsSync(this.baseDir)) {
            return { totalSessions: 0, totalScreenshots: 0, totalSizeBytes: 0 };
        }

        const sessions = await readdir(this.baseDir);
        let totalScreenshots = 0;
        let totalSizeBytes = 0;

        for (const sessionId of sessions) {
            const screenshots = await this.getSessionScreenshots(sessionId);
            totalScreenshots += screenshots.length;
            totalSizeBytes += screenshots.reduce((sum, s) => sum + s.size, 0);
        }

        return {
            totalSessions: sessions.length,
            totalScreenshots,
            totalSizeBytes,
        };
    }
}

export const screenshotService = new ScreenshotService();
