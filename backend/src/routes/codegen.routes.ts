/**
 * Code Generation Routes
 * API endpoints for exporting test flows to Playwright code
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { CodegenService, ExportOptions } from '../services/codegen.service';
import type { ExportMode } from '@playwright-web-app/shared';

const router = Router();

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
