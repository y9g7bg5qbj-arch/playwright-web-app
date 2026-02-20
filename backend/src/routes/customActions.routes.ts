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
import { VERO_PROJECT_PATH, confineToBase } from './veroProjectPath.utils';

const router = Router();
const gate = requireFeature('VERO_ENABLE_CUSTOM_ACTIONS');

// GET /api/vero/custom-actions?projectId=<id>&sandboxId=<id>
router.get('/custom-actions', gate, authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, sandboxId } = req.query;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const projectRoot = confineToBase(VERO_PROJECT_PATH, projectId as string);

    const actions = await getActions(projectRoot);
    res.json({ success: true, data: actions });
  } catch (err: any) {
    logger.error('[CustomActions] List failed', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
