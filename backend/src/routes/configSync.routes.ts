/**
 * Config Sync Routes
 *
 * File-authoritative config sync: status, sync triggers, backfill migration.
 */

import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireFeature } from '../middleware/featureFlag';
import { configSyncService } from '../services/configSync/configSyncService';
import { configSyncStateRepository } from '../db/repositories/mongo';
import { backfillConfigFiles } from '../services/configSync/backfillMigration';
import { logger } from '../utils/logger';

const router = Router();
const gate = requireFeature('VERO_ENABLE_FILE_CONFIG_SYNC');

// GET /api/vero/config-sync/status?projectId=<id>
router.get('/config-sync/status', gate, authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const state = await configSyncStateRepository.findByProjectId(projectId as string);
    res.json({ success: true, data: state });
  } catch (err: any) {
    logger.error('[ConfigSync] Status check failed', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vero/config-sync/sync
router.post('/config-sync/sync', gate, authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, projectRoot, workflowId, applicationId } = req.body;
    if (!projectId || !projectRoot) {
      return res.status(400).json({ error: 'projectId and projectRoot are required' });
    }

    const result = await configSyncService.syncToMongo(projectRoot, projectId, {
      workflowId: workflowId || '',
      applicationId: applicationId || '',
      userId: req.userId!,
    });

    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error('[ConfigSync] Sync failed', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vero/config-sync/drift?projectId=<id>&projectRoot=<path>
router.post('/config-sync/drift', gate, authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, projectRoot } = req.body;
    if (!projectId || !projectRoot) {
      return res.status(400).json({ error: 'projectId and projectRoot are required' });
    }

    const result = await configSyncService.detectDrift(projectRoot, projectId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error('[ConfigSync] Drift detection failed', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vero/config-sync/backfill
router.post('/config-sync/backfill', gate, authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, projectRoot, workflowId } = req.body;
    if (!projectId || !projectRoot) {
      return res.status(400).json({ error: 'projectId and projectRoot are required' });
    }

    const result = await backfillConfigFiles(projectId, projectRoot, {
      workflowId: workflowId || '',
    });

    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error('[ConfigSync] Backfill failed', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
