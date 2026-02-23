/**
 * Page Fields API Route
 *
 * GET /api/vero/page-fields?projectId=xxx
 *
 * Returns all PAGE definitions with their fields (including selector type/value)
 * and action signatures from all .vero files in the project.
 */

import { Router, Response, NextFunction } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { resolveProjectPath } from './veroProjectPath.utils';
import { scanProjectPageFields } from './veroPageFields.utils';
import { logger } from '../utils/logger';

const pageFieldsRouter = Router();

pageFieldsRouter.get(
    '/page-fields',
    authenticateToken,
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        try {
            const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
            const veroPathParam = typeof req.query.veroPath === 'string' ? req.query.veroPath : undefined;

            const projectPath = await resolveProjectPath(veroPathParam, projectId);
            const pageFields = await scanProjectPageFields(projectPath);

            res.json({ success: true, data: pageFields });
        } catch (error) {
            logger.error('[Vero PageFields] Failed to scan page fields:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to scan page fields',
            });
        }
    }
);

export { pageFieldsRouter as veroPageFieldsRouter };
