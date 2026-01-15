/**
 * Code Generation Routes
 * API endpoints for exporting test flows to Playwright code
 * and recording with Playwright codegen
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { CodegenService, ExportOptions } from '../services/codegen.service';
import { codegenRecorderService } from '../services/codegenRecorder.service';
import type { ExportMode } from '@playwright-web-app/shared';

const router = Router();

// Store active recording sessions for WebSocket broadcasting
const activeRecordingSessions = new Map<string, { scenarioName: string; veroLines: string[] }>();

/**
 * POST /api/codegen/start
 * Start a Playwright codegen recording session
 */
router.post(
    '/start',
    authenticateToken,
    [
        body('sessionId').isString().notEmpty().withMessage('Session ID is required'),
        body('url').isURL().withMessage('Valid URL is required'),
        body('scenarioName').optional().isString(),
        body('projectId').optional().isString(),
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

            const { sessionId, url, scenarioName, projectId } = req.body;
            const userId = req.userId;

            console.log(`[Codegen] Starting recording session ${sessionId} for URL: ${url}`);

            // Store session info
            activeRecordingSessions.set(sessionId, {
                scenarioName: scenarioName || 'Recorded Scenario',
                veroLines: []
            });

            // Get the WebSocket server from app
            const io = req.app.get('io');

            // Start recording with callbacks
            await codegenRecorderService.startRecording(
                url,
                sessionId,
                // onAction callback - broadcast to WebSocket
                (veroCode, pagePath, pageCode, fieldCreated, duplicateWarning) => {
                    const sessionData = activeRecordingSessions.get(sessionId);
                    if (sessionData) {
                        sessionData.veroLines.push(veroCode);
                    }

                    // Broadcast to subscribed clients
                    if (io) {
                        io.to(`codegen:${sessionId}`).emit('codegen:action', {
                            sessionId,
                            veroCode,
                            pagePath,
                            pageCode,
                            fieldCreated,
                            duplicateWarning
                        });
                    }

                    console.log(`[Codegen] Action: ${veroCode}`);
                },
                // onError callback
                (error) => {
                    console.error(`[Codegen] Error: ${error}`);
                    if (io) {
                        io.to(`codegen:${sessionId}`).emit('codegen:error', { sessionId, error });
                    }
                },
                // onComplete callback - when browser is closed
                () => {
                    console.log(`[Codegen] Recording completed for session ${sessionId}`);
                    const sessionData = activeRecordingSessions.get(sessionId);

                    // Broadcast completion to subscribed clients
                    if (io) {
                        io.to(`codegen:${sessionId}`).emit('codegen:stopped', {
                            sessionId,
                            veroLines: sessionData?.veroLines || [],
                            scenarioName: sessionData?.scenarioName || 'Recorded Scenario'
                        });
                    }

                    // Clean up session data
                    activeRecordingSessions.delete(sessionId);
                },
                scenarioName,
                userId,
                projectId
            );

            return res.json({
                success: true,
                sessionId,
                message: 'Recording started. Close the browser when done.'
            });
        } catch (error: any) {
            console.error('[Codegen] Start error:', error);
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
            console.log(`[Codegen] Stopping recording session ${sessionId}`);

            // Stop the recording
            const finalCode = await codegenRecorderService.stopRecording(sessionId);

            // Get session data and clean up
            const sessionData = activeRecordingSessions.get(sessionId);
            const veroLines = sessionData?.veroLines || [];
            const scenarioName = sessionData?.scenarioName || 'Recorded Scenario';
            activeRecordingSessions.delete(sessionId);

            // Broadcast completion
            const io = req.app.get('io');
            if (io) {
                io.to(`codegen:${sessionId}`).emit('codegen:stopped', {
                    sessionId,
                    veroLines,
                    scenarioName,
                    playwrightCode: finalCode
                });
            }

            return res.json({
                success: true,
                sessionId,
                veroLines,
                scenarioName,
                playwrightCode: finalCode,
                message: 'Recording stopped'
            });
        } catch (error: any) {
            console.error('[Codegen] Stop error:', error);
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
            const sessionData = activeRecordingSessions.get(sessionId);
            const hasSession = codegenRecorderService.hasSession(sessionId);

            if (!sessionData && !hasSession) {
                return res.status(404).json({
                    success: false,
                    error: 'Session not found'
                });
            }

            return res.json({
                success: true,
                sessionId,
                isActive: hasSession,
                scenarioName: sessionData?.scenarioName,
                veroLines: sessionData?.veroLines || [],
                lineCount: sessionData?.veroLines.length || 0
            });
        } catch (error: any) {
            console.error('[Codegen] Session status error:', error);
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
            console.error('Export error:', error);

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
            console.error('Preview error:', error);

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
    async (req: AuthRequest, res: Response) => {
        try {
            const modes = CodegenService.getExportModes();
            return res.json({ modes });
        } catch (error: any) {
            console.error('Get modes error:', error);
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
            console.error('Download error:', error);

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
