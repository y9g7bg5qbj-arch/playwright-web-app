/**
 * Custom Actions Routes
 *
 * Discovery endpoint for external TypeScript action modules.
 */

import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireFeature } from '../middleware/featureFlag';
import { getActions } from '../services/customActions/registryService';
import { logger } from '../utils/logger';
import { VERO_PROJECT_PATH } from './veroProjectPath.utils';
import { join } from 'path';

const router = Router();
const gate = requireFeature('VERO_ENABLE_CUSTOM_ACTIONS');

// GET /api/vero/custom-actions?projectId=<id>&sandboxId=<id>
router.get('/custom-actions', gate, authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, sandboxId } = req.query;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    // Resolve project root from the Vero projects base path
    // The custom-actions directory sits at the project root level
    let projectRoot = VERO_PROJECT_PATH;
    if (projectId) {
      projectRoot = join(VERO_PROJECT_PATH, projectId as string);
    }

    const actions = await getActions(projectRoot);
    res.json({ success: true, data: actions });
  } catch (err: any) {
    logger.error('[CustomActions] List failed', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
