/**
 * Auth Profile Routes
 *
 * CRUD + refresh for browser auth state profiles.
 */

import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireFeature } from '../middleware/featureFlag';
import { authProfileRepository } from '../db/repositories/mongo';
import { authProfileService, resolveAuthProfileDir } from '../services/authProfile.service';
import { logger } from '../utils/logger';

const router = Router();
const gate = requireFeature('VERO_ENABLE_AUTH_PROFILES');

// GET /api/vero/auth-profiles?projectId=<id>
router.get('/auth-profiles', gate, authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, applicationId } = req.query;
    if (!projectId && !applicationId) {
      return res.status(400).json({ error: 'projectId or applicationId is required' });
    }

    const profiles = projectId
      ? await authProfileRepository.findByProjectId(projectId as string)
      : await authProfileRepository.findByApplicationId(applicationId as string);

    res.json({ success: true, data: profiles });
  } catch (err: any) {
    logger.error('[AuthProfile] List failed', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vero/auth-profiles
router.post('/auth-profiles', gate, authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId, projectId, name, description, loginScriptPath, environmentRoot } = req.body;
    if (!applicationId || !projectId || !name || !loginScriptPath || !environmentRoot) {
      return res.status(400).json({ error: 'applicationId, projectId, name, loginScriptPath, and environmentRoot are required' });
    }

    const profile = await authProfileService.create({
      applicationId,
      projectId,
      name,
      description,
      loginScriptPath,
      createdBy: req.userId!,
      environmentRoot,
    });

    res.status(201).json({ success: true, data: profile });
  } catch (err: any) {
    logger.error('[AuthProfile] Create failed', err);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/vero/auth-profiles/:id/refresh
router.post('/auth-profiles/:id/refresh', gate, authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { environmentRoot } = req.body;
    if (!environmentRoot) {
      return res.status(400).json({ error: 'environmentRoot is required' });
    }

    const profile = await authProfileService.refresh(req.params.id, environmentRoot);
    res.json({ success: true, data: profile });
  } catch (err: any) {
    logger.error('[AuthProfile] Refresh failed', err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/vero/auth-profiles/:id
router.delete('/auth-profiles/:id', gate, authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { environmentRoot } = req.body;
    if (!environmentRoot) {
      return res.status(400).json({ error: 'environmentRoot is required' });
    }

    await authProfileService.delete(req.params.id, environmentRoot);
    res.json({ success: true });
  } catch (err: any) {
    logger.error('[AuthProfile] Delete failed', err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
