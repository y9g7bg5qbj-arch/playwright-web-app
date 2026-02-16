/**
 * Version Manifest and Bulk Fetch Routes
 *
 * These endpoints support the vero-lang runtime's optimized data loading:
 * - GET /versions returns a version manifest for all tables
 * - POST /bulk fetches multiple tables in a single request
 *
 * IMPORTANT: The runtime sends "projectId" but this actually maps to "applicationId"
 * in the database. This matches the frontend convention where currentProject.id
 * is the application ID.
 *
 * Mounted under /api/test-data
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { mongoTestDataService } from '../../services/mongodb-test-data.service';
import { runtimeAuth } from './runtimeAuth';
import { logger } from '../../utils/logger';

const router = Router();

// Authenticate and verify ownership of the application
router.use(runtimeAuth);

/**
 * GET /api/test-data/versions
 * Get version manifest for all tables in an application.
 * Query: ?projectId=xxx (actually applicationId)
 * Response: { [tableName]: { version, rowCount, updatedAt } }
 */
router.get('/versions', async (req: AuthRequest, res: Response) => {
  try {
    const applicationId = req.query.projectId as string;
    if (!applicationId) {
      return res.status(400).json({ error: 'projectId query parameter is required' });
    }

    const manifest = await mongoTestDataService.getVersionManifest(applicationId);
    res.json(manifest);
  } catch (error) {
    logger.error('Error fetching version manifest:', error);
    res.status(500).json({ error: 'Failed to fetch version manifest' });
  }
});

/**
 * POST /api/test-data/bulk
 * Fetch multiple tables in a single request.
 * Query: ?projectId=xxx (actually applicationId)
 * Body: { tables: string[], ifNoneMatch?: Record<string, string> }
 * Response: { tables: { [name]: { version, data: DataRow[] } } }
 */
router.post('/bulk', async (req: AuthRequest, res: Response) => {
  try {
    const applicationId = req.query.projectId as string;
    if (!applicationId) {
      return res.status(400).json({ error: 'projectId query parameter is required' });
    }

    const { tables: tableNames, ifNoneMatch } = req.body as {
      tables: string[];
      ifNoneMatch?: Record<string, string>;
    };

    if (!Array.isArray(tableNames) || tableNames.length === 0) {
      return res.status(400).json({ error: 'tables array is required' });
    }

    const result: Record<string, { version: string; data: unknown[] }> = {};

    for (const tableName of tableNames) {
      const sheet = await mongoTestDataService.getSheetByApplicationAndName(applicationId, tableName);
      if (!sheet) {
        continue; // Skip missing tables
      }

      const currentVersion = String(sheet.version ?? 1);

      // If client has this version cached, skip fetching data
      if (ifNoneMatch && ifNoneMatch[tableName] === currentVersion) {
        continue;
      }

      const rows = await mongoTestDataService.getRows(sheet.id);
      result[tableName] = {
        version: currentVersion,
        data: rows.map(row => ({
          ...row.data,
          _id: row.id,
          _scenarioId: row.scenarioId,
          _enabled: row.enabled,
        })),
      };
    }

    res.json({ tables: result });
  } catch (error) {
    logger.error('Error in bulk fetch:', error);
    res.status(500).json({ error: 'Failed to bulk fetch tables' });
  }
});

export default router;
