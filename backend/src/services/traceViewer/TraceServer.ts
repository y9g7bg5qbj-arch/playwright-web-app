/**
 * Trace Server
 * Serves Playwright trace files and provides access to trace viewer
 */

import { spawn, ChildProcess } from 'child_process';
import { Server } from 'http';
import express, { Express, Request, Response } from 'express';
import path from 'path';
import { createReadStream, existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ArtifactRef, TraceData, TraceAction, TraceScreenshot, TraceNetworkRequest, TraceConsoleMessage, TraceError } from '../execution/types';
import { logger } from '../../utils/logger';

const STORAGE_PATH = path.resolve(process.env.STORAGE_PATH || './storage');

/**
 * Trace serving session
 */
interface TraceSession {
    id: string;
    traceRef: ArtifactRef;
    createdAt: Date;
    expiresAt: Date;
    accessCount: number;
}

/**
 * Trace Server
 * Serves trace files for the Playwright Trace Viewer
 */
export class TraceServer {
    private sessions: Map<string, TraceSession> = new Map();
    private serverPort: number;
    private baseUrl: string;
    private app: Express;
    private server: Server | null = null;
    private viewerProcesses: Map<string, ChildProcess> = new Map();

    constructor(config?: {
        port?: number;
        baseUrl?: string;
    }) {
        this.serverPort = config?.port || 9323;
        this.baseUrl = config?.baseUrl || `http://localhost:${this.serverPort}`;
        this.app = express();

        this.setupRoutes();
    }

    /**
     * Setup Express routes for serving traces
     */
    private setupRoutes(): void {
        // CORS headers for trace.playwright.dev
        this.app.use((_req, res, next) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Origin, Accept');
            res.setHeader('Access-Control-Max-Age', '86400');
            next();
        });

        // Preflight requests
        this.app.options('*', (_req, res) => {
            res.status(204).end();
        });

        // Serve trace by session ID
        this.app.get('/trace/:sessionId', async (req: Request, res: Response) => {
            try {
                const session = this.sessions.get(req.params.sessionId);

                if (!session) {
                    res.status(404).json({ error: 'Trace session not found' });
                    return;
                }

                // Check expiration
                if (new Date() > session.expiresAt) {
                    this.sessions.delete(req.params.sessionId);
                    res.status(410).json({ error: 'Trace session expired' });
                    return;
                }

                // Update access count
                session.accessCount++;

                // Get trace file path
                const tracePath = path.join(STORAGE_PATH, session.traceRef.path);

                if (!existsSync(tracePath)) {
                    res.status(404).json({ error: 'Trace file not found' });
                    return;
                }

                // Stream the trace file
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader('Content-Disposition', `inline; filename="trace-${session.id}.zip"`);

                const stream = createReadStream(tracePath);
                stream.pipe(res);

            } catch (error: any) {
                logger.error('Error serving trace:', error);
                res.status(500).json({ error: 'Failed to serve trace' });
            }
        });

        // Serve trace file directly by path (for internal use)
        this.app.get('/trace-file/*', async (req: Request, res: Response) => {
            try {
                const tracePath = path.join(STORAGE_PATH, req.params[0]);

                if (!existsSync(tracePath)) {
                    res.status(404).json({ error: 'Trace file not found' });
                    return;
                }

                res.setHeader('Content-Type', 'application/zip');
                res.setHeader('Content-Disposition', 'inline; filename="trace.zip"');

                const stream = createReadStream(tracePath);
                stream.pipe(res);

            } catch (error: any) {
                logger.error('Error serving trace file:', error);
                res.status(500).json({ error: 'Failed to serve trace file' });
            }
        });

        // Get trace viewer URL
        this.app.get('/viewer/:sessionId', (req: Request, res: Response) => {
            const session = this.sessions.get(req.params.sessionId);

            if (!session) {
                res.status(404).json({ error: 'Trace session not found' });
                return;
            }

            const traceUrl = encodeURIComponent(`${this.baseUrl}/trace/${req.params.sessionId}`);
            const viewerUrl = `https://trace.playwright.dev/?trace=${traceUrl}`;

            res.json({
                viewerUrl,
                traceUrl: `${this.baseUrl}/trace/${req.params.sessionId}`,
                expiresAt: session.expiresAt,
            });
        });

        // Health check
        this.app.get('/health', (_req, res) => {
            res.json({
                status: 'ok',
                sessions: this.sessions.size,
                viewerProcesses: this.viewerProcesses.size,
            });
        });
    }

    /**
     * Start the trace server
     */
    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.serverPort, () => {
                    logger.info(`Trace server started on port ${this.serverPort}`);
                    resolve();
                });

                this.server.on('error', (error: any) => {
                    if (error.code === 'EADDRINUSE') {
                        logger.warn(`Port ${this.serverPort} is already in use, trace server may already be running`);
                        resolve();
                    } else {
                        reject(error);
                    }
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Stop the trace server
     */
    async stop(): Promise<void> {
        // Close all viewer processes
        for (const [_id, process] of this.viewerProcesses) {
            process.kill('SIGTERM');
        }
        this.viewerProcesses.clear();

        // Clear sessions
        this.sessions.clear();

        // Close server
        if (this.server) {
            return new Promise((resolve) => {
                this.server!.close(() => {
                    logger.info('Trace server stopped');
                    resolve();
                });
            });
        }
    }

    /**
     * Create a session to serve a trace file
     */
    serveTrace(traceRef: ArtifactRef, expirationMinutes: number = 60): string {
        const sessionId = uuidv4();
        const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

        const session: TraceSession = {
            id: sessionId,
            traceRef,
            createdAt: new Date(),
            expiresAt,
            accessCount: 0,
        };

        this.sessions.set(sessionId, session);

        logger.debug(`Created trace session ${sessionId} for ${traceRef.path}`);
        return `${this.baseUrl}/trace/${sessionId}`;
    }

    /**
     * Get Playwright Trace Viewer URL for a trace
     */
    getTraceViewerUrl(traceRef: ArtifactRef): string {
        const traceUrl = this.serveTrace(traceRef);
        const encodedTraceUrl = encodeURIComponent(traceUrl);
        return `https://trace.playwright.dev/?trace=${encodedTraceUrl}`;
    }

    /**
     * Launch local Playwright trace viewer
     */
    async launchLocalViewer(traceRef: ArtifactRef): Promise<{ success: boolean; message: string }> {
        const tracePath = path.join(STORAGE_PATH, traceRef.path);

        if (!existsSync(tracePath)) {
            return { success: false, message: 'Trace file not found' };
        }

        try {
            // Launch the Playwright trace viewer
            const viewerProcess = spawn('npx', ['playwright', 'show-trace', tracePath], {
                detached: true,
                stdio: 'ignore',
            });

            viewerProcess.unref();

            // Store process reference for cleanup
            this.viewerProcesses.set(traceRef.id, viewerProcess);

            // Remove from map when process exits
            viewerProcess.on('exit', () => {
                this.viewerProcesses.delete(traceRef.id);
            });

            logger.info(`Launched trace viewer for ${traceRef.path}`);
            return { success: true, message: 'Trace viewer launched' };

        } catch (error: any) {
            logger.error('Failed to launch trace viewer:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Parse trace data from a trace file
     */
    async parseTrace(traceData: Buffer): Promise<TraceData> {
        // Playwright traces are ZIP files containing JSON data
        // This is a simplified parser - in production, use the full trace parsing logic

        const AdmZip = require('adm-zip');
        const zip = new AdmZip(traceData);
        const entries = zip.getEntries();

        let actions: TraceAction[] = [];
        let screenshots: TraceScreenshot[] = [];
        let networkRequests: TraceNetworkRequest[] = [];
        let consoleMessages: TraceConsoleMessage[] = [];
        let errors: TraceError[] = [];
        let metadata: any = {};

        for (const entry of entries) {
            if (entry.entryName.endsWith('.trace')) {
                // Parse trace events
                const content = entry.getData().toString('utf8');
                const lines = content.split('\n').filter((line: string) => line.trim());

                for (const line of lines) {
                    try {
                        const event = JSON.parse(line);
                        this.processTraceEvent(event, actions, screenshots, networkRequests, consoleMessages, errors, metadata);
                    } catch {
                        // Skip invalid lines
                    }
                }
            }
        }

        return {
            traceId: uuidv4(),
            testId: metadata.testId || '',
            actions,
            screenshots,
            networkRequests,
            consoleMessages,
            errors,
            metadata: {
                title: metadata.title || 'Unknown',
                startTime: metadata.startTime || 0,
                endTime: metadata.endTime || 0,
                browserName: metadata.browserName || 'unknown',
                browserVersion: metadata.browserVersion || '',
                platform: metadata.platform || '',
                viewport: metadata.viewport || { width: 1280, height: 720 },
            },
        };
    }

    /**
     * Process a single trace event
     */
    private processTraceEvent(
        event: any,
        actions: TraceAction[],
        screenshots: TraceScreenshot[],
        networkRequests: TraceNetworkRequest[],
        consoleMessages: TraceConsoleMessage[],
        errors: TraceError[],
        metadata: any
    ): void {
        switch (event.type) {
            case 'action':
                actions.push({
                    id: event.callId || uuidv4(),
                    type: event.method || 'unknown',
                    selector: event.params?.selector,
                    value: event.params?.text,
                    url: event.params?.url,
                    startTime: event.startTime || 0,
                    endTime: event.endTime || 0,
                    duration: (event.endTime || 0) - (event.startTime || 0),
                    status: event.error ? 'failed' : 'passed',
                    error: event.error?.message,
                });
                break;

            case 'screencast-frame':
            case 'screenshot':
                screenshots.push({
                    index: screenshots.length,
                    timestamp: event.timestamp || 0,
                    sha1: event.sha1 || '',
                    width: event.width || 0,
                    height: event.height || 0,
                });
                break;

            case 'resource-snapshot':
            case 'request':
                networkRequests.push({
                    requestId: event.requestId || uuidv4(),
                    url: event.url || '',
                    method: event.method || 'GET',
                    status: event.status,
                    statusText: event.statusText,
                    headers: event.headers || {},
                    responseHeaders: event.responseHeaders,
                    startTime: event.startTime || 0,
                    endTime: event.endTime,
                    duration: event.endTime ? event.endTime - event.startTime : undefined,
                    resourceType: event.resourceType || 'other',
                    size: event.bodySize,
                    transferSize: event.transferSize,
                    failure: event.failure,
                });
                break;

            case 'console':
                consoleMessages.push({
                    type: event.messageType || 'log',
                    text: event.text || '',
                    location: event.location,
                    timestamp: event.timestamp || 0,
                });
                break;

            case 'error':
            case 'page-error':
                errors.push({
                    message: event.message || event.error?.message || 'Unknown error',
                    stack: event.stack || event.error?.stack,
                    timestamp: event.timestamp || 0,
                    actionId: event.callId,
                });
                break;

            case 'context-options':
            case 'browser':
                Object.assign(metadata, {
                    browserName: event.browserName,
                    browserVersion: event.browserVersion,
                    platform: event.platform,
                    viewport: event.viewport,
                });
                break;
        }
    }

    /**
     * Get actions from trace data
     */
    getTraceActions(traceData: TraceData): TraceAction[] {
        return traceData.actions;
    }

    /**
     * Get screenshots from trace data
     */
    getTraceScreenshots(traceData: TraceData): TraceScreenshot[] {
        return traceData.screenshots;
    }

    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions(): number {
        const now = new Date();
        let cleanedCount = 0;

        for (const [sessionId, session] of this.sessions) {
            if (now > session.expiresAt) {
                this.sessions.delete(sessionId);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            logger.debug(`Cleaned up ${cleanedCount} expired trace sessions`);
        }

        return cleanedCount;
    }

    /**
     * Get session statistics
     */
    getStats(): {
        activeSessions: number;
        totalAccesses: number;
        viewerProcesses: number;
    } {
        let totalAccesses = 0;
        for (const session of this.sessions.values()) {
            totalAccesses += session.accessCount;
        }

        return {
            activeSessions: this.sessions.size,
            totalAccesses,
            viewerProcesses: this.viewerProcesses.size,
        };
    }
}

// Export singleton instance
export const traceServer = new TraceServer();
