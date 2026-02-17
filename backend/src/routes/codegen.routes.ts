/**
 * Code Generation Routes
 * API endpoints for exporting test flows to Playwright code
 * and recording with Playwright codegen
 */

import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { CodegenService, ExportOptions } from '../services/codegen.service';
import { codegenRecorderService } from '../services/codegenRecorder.service';
import { recordingSessionStore } from '../services/recordingSessionStore';
import type { ExportMode } from '@playwright-web-app/shared';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/codegen/start
 * Start a Playwright codegen recording session
 */
router.post(
    '/start',
    authenticateToken,
    [
        body('url').isURL().withMessage('Valid URL is required'),
        body('scenarioName').optional().isString(),
        body('projectId').optional().isString(),
        body('sandboxPath').optional().isString(),
    ],
    async (req: AuthRequest, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { url, scenarioName, projectId, sandboxPath } = req.body;
            const userId = req.userId;

            // Generate session ID server-side for security
            const sessionId = `rec-${randomUUID()}`;

            logger.info(`[Codegen] Starting recording session ${sessionId} for URL: ${url}`);

            // Store session info with ownership
            recordingSessionStore.create(sessionId, userId || 'anonymous', scenarioName || 'Recorded Scenario');

            // Get the WebSocket server from app
            const io = req.app.get('io');

            // Start recording with callbacks
            await codegenRecorderService.startRecording(
                url,
                sessionId,
                // onAction callback - broadcast to WebSocket
                (veroCode, pagePath, pageCode, fieldCreated) => {
                    recordingSessionStore.addLine(sessionId, veroCode);

                    // Broadcast to subscribed clients
                    if (io) {
                        io.to(`codegen:${sessionId}`).emit('codegen:action', {
                            sessionId,
                            veroCode,
                            pagePath,
                            pageCode,
                            fieldCreated
                        });
                    }

                    logger.debug(`[Codegen] Action: ${veroCode}`);
                },
                // onError callback
                (error) => {
                    logger.error(`[Codegen] Error: ${error}`);
                    if (io) {
                        io.to(`codegen:${sessionId}`).emit('codegen:error', { sessionId, error });
                    }
                },
                // onComplete callback - when browser is closed
                // Only emits if session still exists (stop route deletes it first)
                () => {
                    logger.info(`[Codegen] Recording completed for session ${sessionId}`);
                    const sessionData = recordingSessionStore.get(sessionId);
                    if (!sessionData) return; // Already handled by stop route

                    // Broadcast completion to subscribed clients
                    if (io) {
                        io.to(`codegen:${sessionId}`).emit('codegen:stopped', {
                            sessionId,
                            veroLines: sessionData.veroLines,
                            scenarioName: sessionData.scenarioName
                        });
                    }

                    // Clean up session data
                    recordingSessionStore.delete(sessionId);
                },
                scenarioName,
                userId,
                projectId,
                sandboxPath
            );

            return res.json({
                success: true,
                sessionId,
                message: 'Recording started. Close the browser when done.'
            });
        } catch (error: any) {
            logger.error('[Codegen] Start error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to start recording',
                message: error.message
            });
        }
    }
);

/**
 * POST /api/codegen/stop/:sessionId
 * Stop a Playwright codegen recording session
 */
router.post(
    '/stop/:sessionId',
    authenticateToken,
    [
        param('sessionId').isString().notEmpty().withMessage('Session ID is required'),
    ],
    async (req: AuthRequest, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { sessionId } = req.params;
            const userId = req.userId;
            logger.info(`[Codegen] Stopping recording session ${sessionId}`);

            // Verify session ownership
            const sessionData = recordingSessionStore.get(sessionId);
            if (!sessionData) {
                return res.status(404).json({ success: false, error: 'Session not found' });
            }
            if (userId && !recordingSessionStore.isOwner(sessionId, userId)) {
                return res.status(403).json({ success: false, error: 'Not authorized to stop this session' });
            }

            // Stop the recording
            const finalCode = await codegenRecorderService.stopRecording(sessionId);

            // Get final data and clean up (prevents onComplete from also emitting)
            const veroLines = sessionData.veroLines;
            const scenarioName = sessionData.scenarioName;
            recordingSessionStore.delete(sessionId);

            return res.json({
                success: true,
                sessionId,
                veroLines,
                scenarioName,
                playwrightCode: finalCode,
                message: 'Recording stopped'
            });
        } catch (error: any) {
            logger.error('[Codegen] Stop error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to stop recording',
                message: error.message
            });
        }
    }
);

/**
 * GET /api/codegen/session/:sessionId
 * Get current state of a recording session
 */
router.get(
    '/session/:sessionId',
    authenticateToken,
    async (req: AuthRequest, res: Response) => {
        try {
            const { sessionId } = req.params;
            const sessionData = recordingSessionStore.get(sessionId);
            const hasSession = codegenRecorderService.hasSession(sessionId);

            if (!sessionData && !hasSession) {
                return res.status(404).json({
                    success: false,
                    error: 'Session not found'
                });
            }

            // Verify session ownership
            if (sessionData && req.userId && !recordingSessionStore.isOwner(sessionId, req.userId)) {
                return res.status(403).json({
                    success: false,
                    error: 'Not authorized to view this session'
                });
            }

            return res.json({
                success: true,
                sessionId,
                isActive: hasSession,
                scenarioName: sessionData?.scenarioName,
                veroLines: sessionData?.veroLines || [],
                lineCount: sessionData?.veroLines?.length || 0
            });
        } catch (error: any) {
            logger.error('[Codegen] Session status error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get session status',
                message: error.message
            });
        }
    }
);

/**
 * POST /api/flows/:id/export
 * Export a test flow to Playwright TypeScript code
 */
router.post(
    '/:id/export',
    authenticateToken,
    [
        param('id').isString().notEmpty().withMessage('Flow ID is required'),
        body('mode')
            .optional()
            .isIn(['basic', 'pom', 'fixtures', 'pom-fixtures'])
            .withMessage('Invalid export mode'),
        body('includeComments').optional().isBoolean(),
        body('testName').optional().isString().trim(),
        body('baseUrl').optional().isURL(),
        body('timeout').optional().isInt({ min: 1000, max: 300000 }),
        body('retries').optional().isInt({ min: 0, max: 10 }),
        body('browsers').optional().isArray(),
        body('browsers.*').optional().isIn(['chromium', 'firefox', 'webkit']),
        body('generateConfig').optional().isBoolean(),
        body('format').optional().isBoolean(),
    ],
    async (req: AuthRequest, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const flowId = req.params.id;
            const options: ExportOptions = {
                mode: req.body.mode as ExportMode,
                includeComments: req.body.includeComments,
                testName: req.body.testName,
                baseUrl: req.body.baseUrl,
                timeout: req.body.timeout,
                retries: req.body.retries,
                browsers: req.body.browsers,
                generateConfig: req.body.generateConfig,
                format: req.body.format,
            };

            const result = await CodegenService.exportFlow(userId, flowId, options);

            return res.json(result);
        } catch (error: any) {
            logger.error('Export error:', error);

            if (error.name === 'NotFoundError') {
                return res.status(404).json({ error: error.message });
            }
            if (error.name === 'ForbiddenError') {
                return res.status(403).json({ error: error.message });
            }

            return res.status(500).json({
                error: 'Failed to export flow',
                message: error.message
            });
        }
    }
);

/**
 * GET /api/flows/:id/preview
 * Preview generated code without full export
 */
router.get(
    '/:id/preview',
    authenticateToken,
    [
        param('id').isString().notEmpty().withMessage('Flow ID is required'),
        query('mode')
            .optional()
            .isIn(['basic', 'pom', 'fixtures', 'pom-fixtures'])
            .withMessage('Invalid export mode'),
    ],
    async (req: AuthRequest, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const flowId = req.params.id;
            const mode = req.query.mode as ExportMode | undefined;

            const result = await CodegenService.previewFlow(userId, flowId, { mode });

            return res.json(result);
        } catch (error: any) {
            logger.error('Preview error:', error);

            if (error.name === 'NotFoundError') {
                return res.status(404).json({ error: error.message });
            }
            if (error.name === 'ForbiddenError') {
                return res.status(403).json({ error: error.message });
            }

            return res.status(500).json({
                error: 'Failed to preview flow',
                message: error.message
            });
        }
    }
);

/**
 * GET /api/codegen/modes
 * Get available export modes with descriptions
 */
router.get(
    '/modes',
    authenticateToken,
    async (_req: AuthRequest, res: Response) => {
        try {
            const modes = CodegenService.getExportModes();
            return res.json({ modes });
        } catch (error: any) {
            logger.error('Get modes error:', error);
            return res.status(500).json({
                error: 'Failed to get export modes',
                message: error.message
            });
        }
    }
);

/**
 * POST /api/flows/:id/download
 * Download generated code as a zip file
 */
router.post(
    '/:id/download',
    authenticateToken,
    [
        param('id').isString().notEmpty().withMessage('Flow ID is required'),
        body('mode')
            .optional()
            .isIn(['basic', 'pom', 'fixtures', 'pom-fixtures'])
            .withMessage('Invalid export mode'),
        body('generateConfig').optional().isBoolean(),
    ],
    async (req: AuthRequest, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const flowId = req.params.id;
            const options: ExportOptions = {
                mode: req.body.mode as ExportMode,
                generateConfig: req.body.generateConfig ?? true,
            };

            const result = await CodegenService.exportFlow(userId, flowId, options);

            // For now, return JSON with files
            // TODO: Implement actual zip file creation with archiver
            res.setHeader('Content-Type', 'application/json');
            return res.json({
                flowName: result.metadata.flowName,
                files: result.files,
                message: 'Files ready for download',
            });
        } catch (error: any) {
            logger.error('Download error:', error);

            if (error.name === 'NotFoundError') {
                return res.status(404).json({ error: error.message });
            }
            if (error.name === 'ForbiddenError') {
                return res.status(403).json({ error: error.message });
            }

            return res.status(500).json({
                error: 'Failed to download flow',
                message: error.message
            });
        }
    }
);

export default router;
