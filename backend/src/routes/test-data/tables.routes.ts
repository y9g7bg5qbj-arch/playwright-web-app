/**
 * Runtime-compatible Test Data Table Routes
 *
 * These endpoints serve the vero-lang runtime (testDataApi.ts).
 * They use table names instead of sheet IDs and accept ?projectId= query params.
 *
 * IMPORTANT: The runtime sends "projectId" but this actually maps to "applicationId"
 * in the database. This matches the frontend convention where currentProject.id
 * is the application ID. All lookups use applicationId to find sheets.
 *
 * Mounted under /api/test-data/tables
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { mongoTestDataService } from '../../services/mongodb-test-data.service';
import { runtimeAuth } from './runtimeAuth';
import { logger } from '../../utils/logger';

const router = Router();

// Authenticate and verify ownership of the application
router.use(runtimeAuth);

// ==================== TABLE LISTING ====================

/**
 * GET /api/test-data/tables
 * List all table (sheet) names for an application.
 * Query: ?projectId=xxx (actually applicationId)
 * Response: string[]
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const applicationId = req.query.projectId as string;
    if (!applicationId) {
      return res.status(400).json({ error: 'projectId query parameter is required' });
    }

    const sheets = await mongoTestDataService.getSheetsByApplicationId(applicationId);
    const names = sheets.map(s => s.name);
    res.json(names);
  } catch (error) {
    logger.error('Error listing tables:', error);
    res.status(500).json({ error: 'Failed to list tables' });
  }
});

// ==================== TABLE METADATA ====================

/**
 * GET /api/test-data/tables/:name
 * Get table metadata by name.
 * Query: ?projectId=xxx (actually applicationId)
 * Response: { name, columns: [{ name, type }], rowCount }
 */
router.get('/:name', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;
    const applicationId = req.query.projectId as string;
    if (!applicationId) {
      return res.status(400).json({ error: 'projectId query parameter is required' });
    }

    const sheet = await mongoTestDataService.getSheetByApplicationAndName(applicationId, decodeURIComponent(name));
    if (!sheet) {
      return res.status(404).json({ error: `Table "${name}" not found` });
    }

    const stats = await mongoTestDataService.getSheetStats(sheet.id);
    res.json({
      name: sheet.name,
      columns: sheet.columns.map(c => ({ name: c.name, type: c.type })),
      rowCount: stats.totalRows,
    });
  } catch (error) {
    logger.error('Error fetching table metadata:', error);
    res.status(500).json({ error: 'Failed to fetch table metadata' });
  }
});

// ==================== TABLE ROWS ====================

/**
 * GET /api/test-data/tables/:name/rows
 * Get all rows for a table by name.
 * Query: ?projectId=xxx (actually applicationId)
 * Response: DataRow[] (each row has .data as the values object)
 */
router.get('/:name/rows', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;
    const applicationId = req.query.projectId as string;
    if (!applicationId) {
      return res.status(400).json({ error: 'projectId query parameter is required' });
    }

    const sheet = await mongoTestDataService.getSheetByApplicationAndName(applicationId, decodeURIComponent(name));
    if (!sheet) {
      return res.status(404).json({ error: `Table "${name}" not found` });
    }

    const rows = await mongoTestDataService.getRows(sheet.id);
    // Return rows with their data flattened for the runtime QueryBuilder
    const result = rows.map(row => ({
      ...row.data,
      _id: row.id,
      _scenarioId: row.scenarioId,
      _enabled: row.enabled,
    }));
    res.json(result);
  } catch (error) {
    logger.error('Error fetching table rows:', error);
    res.status(500).json({ error: 'Failed to fetch table rows' });
  }
});

// ==================== TABLE VERSION ====================

/**
 * GET /api/test-data/tables/:name/version
 * Get the current version of a table (for cache validation).
 * Query: ?projectId=xxx (actually applicationId)
 * Response: { version: string }
 */
router.get('/:name/version', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;
    const applicationId = req.query.projectId as string;
    if (!applicationId) {
      return res.status(400).json({ error: 'projectId query parameter is required' });
    }

    const sheet = await mongoTestDataService.getSheetByApplicationAndName(applicationId, decodeURIComponent(name));
    if (!sheet) {
      return res.status(404).json({ error: `Table "${name}" not found` });
    }

    res.json({ version: String(sheet.version ?? 1) });
  } catch (error) {
    logger.error('Error fetching table version:', error);
    res.status(500).json({ error: 'Failed to fetch table version' });
  }
});

// ==================== CACHE INVALIDATION ====================

/**
 * POST /api/test-data/tables/:name/invalidate
 * Increment the table version to bust runtime caches.
 * Query: ?projectId=xxx (actually applicationId)
 * Response: 204 No Content
 */
router.post('/:name/invalidate', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;
    const applicationId = req.query.projectId as string;
    if (!applicationId) {
      return res.status(400).json({ error: 'projectId query parameter is required' });
    }

    const sheet = await mongoTestDataService.getSheetByApplicationAndName(applicationId, decodeURIComponent(name));
    if (!sheet) {
      return res.status(404).json({ error: `Table "${name}" not found` });
    }

    await mongoTestDataService.incrementSheetVersion(sheet.id);
    res.status(204).send();
  } catch (error) {
    logger.error('Error invalidating table cache:', error);
    res.status(500).json({ error: 'Failed to invalidate table cache' });
  }
});

export default router;
