/**
 * MongoDB Test Data API Routes
 *
 * REST API endpoints for test data management using MongoDB Atlas.
 * Provides CRUD operations for test data sheets and rows.
 */

import { Router, Request, Response } from 'express';
import { mongoTestDataService } from '../services/mongodb-test-data.service';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// ==================== SHEETS ====================

/**
 * GET /api/test-data-mongo/sheets/:applicationId
 * Get all test data sheets for an application
 */
router.get('/sheets/:applicationId', async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId } = req.params;
    const sheets = await mongoTestDataService.getSheets(applicationId);

    // Add row counts for each sheet
    const sheetsWithStats = await Promise.all(
      sheets.map(async (sheet) => {
        const stats = await mongoTestDataService.getSheetStats(sheet.id);
        return { ...sheet, ...stats };
      })
    );

    res.json(sheetsWithStats);
  } catch (error) {
    console.error('Error fetching sheets:', error);
    res.status(500).json({ error: 'Failed to fetch test data sheets' });
  }
});

/**
 * GET /api/test-data-mongo/sheet/:id
 * Get a single test data sheet by ID
 */
router.get('/sheet/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const sheet = await mongoTestDataService.getSheetById(id);

    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    const stats = await mongoTestDataService.getSheetStats(id);
    res.json({ ...sheet, ...stats });
  } catch (error) {
    console.error('Error fetching sheet:', error);
    res.status(500).json({ error: 'Failed to fetch test data sheet' });
  }
});

/**
 * POST /api/test-data-mongo/sheets
 * Create a new test data sheet
 */
router.post('/sheets', async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId, name, pageObject, description, columns } = req.body;

    if (!applicationId || !name) {
      return res.status(400).json({ error: 'applicationId and name are required' });
    }

    // Check for duplicate name
    const existing = await mongoTestDataService.getSheetByName(applicationId, name);
    if (existing) {
      return res.status(409).json({ error: 'A sheet with this name already exists' });
    }

    const sheet = await mongoTestDataService.createSheet({
      applicationId,
      name,
      pageObject,
      description,
      columns: columns || []
    });

    res.status(201).json(sheet);
  } catch (error) {
    console.error('Error creating sheet:', error);
    res.status(500).json({ error: 'Failed to create test data sheet' });
  }
});

/**
 * PUT /api/test-data-mongo/sheet/:id
 * Update a test data sheet
 */
router.put('/sheet/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, pageObject, description, columns } = req.body;

    const sheet = await mongoTestDataService.updateSheet(id, {
      name,
      pageObject,
      description,
      columns
    });

    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    res.json(sheet);
  } catch (error) {
    console.error('Error updating sheet:', error);
    res.status(500).json({ error: 'Failed to update test data sheet' });
  }
});

/**
 * DELETE /api/test-data-mongo/sheet/:id
 * Delete a test data sheet and all its rows
 */
router.delete('/sheet/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await mongoTestDataService.deleteSheet(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    res.json({ success: true, message: 'Sheet and all rows deleted' });
  } catch (error) {
    console.error('Error deleting sheet:', error);
    res.status(500).json({ error: 'Failed to delete test data sheet' });
  }
});

// ==================== ROWS ====================

/**
 * GET /api/test-data-mongo/rows/:sheetId
 * Get all rows for a sheet
 */
router.get('/rows/:sheetId', async (req: AuthRequest, res: Response) => {
  try {
    const { sheetId } = req.params;
    const { enabledOnly } = req.query;

    const rows = enabledOnly === 'true'
      ? await mongoTestDataService.getEnabledRows(sheetId)
      : await mongoTestDataService.getRows(sheetId);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching rows:', error);
    res.status(500).json({ error: 'Failed to fetch test data rows' });
  }
});

/**
 * GET /api/test-data-mongo/row/:id
 * Get a single row by ID
 */
router.get('/row/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const row = await mongoTestDataService.getRowById(id);

    if (!row) {
      return res.status(404).json({ error: 'Row not found' });
    }

    res.json(row);
  } catch (error) {
    console.error('Error fetching row:', error);
    res.status(500).json({ error: 'Failed to fetch test data row' });
  }
});

/**
 * POST /api/test-data-mongo/rows
 * Create a new test data row
 */
router.post('/rows', async (req: AuthRequest, res: Response) => {
  try {
    const { sheetId, scenarioId, data, enabled } = req.body;

    if (!sheetId || !scenarioId) {
      return res.status(400).json({ error: 'sheetId and scenarioId are required' });
    }

    // Check for duplicate scenarioId in sheet
    const existing = await mongoTestDataService.getRowByScenarioId(sheetId, scenarioId);
    if (existing) {
      return res.status(409).json({ error: 'A row with this scenarioId already exists in this sheet' });
    }

    const row = await mongoTestDataService.createRow({
      sheetId,
      scenarioId,
      data: data || {},
      enabled
    });

    res.status(201).json(row);
  } catch (error) {
    console.error('Error creating row:', error);
    res.status(500).json({ error: 'Failed to create test data row' });
  }
});

/**
 * PUT /api/test-data-mongo/row/:id
 * Update a test data row
 */
router.put('/row/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { scenarioId, data, enabled } = req.body;

    const row = await mongoTestDataService.updateRow(id, {
      scenarioId,
      data,
      enabled
    });

    if (!row) {
      return res.status(404).json({ error: 'Row not found' });
    }

    res.json(row);
  } catch (error) {
    console.error('Error updating row:', error);
    res.status(500).json({ error: 'Failed to update test data row' });
  }
});

/**
 * DELETE /api/test-data-mongo/row/:id
 * Delete a test data row
 */
router.delete('/row/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await mongoTestDataService.deleteRow(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Row not found' });
    }

    res.json({ success: true, message: 'Row deleted' });
  } catch (error) {
    console.error('Error deleting row:', error);
    res.status(500).json({ error: 'Failed to delete test data row' });
  }
});

// ==================== BULK OPERATIONS ====================

/**
 * POST /api/test-data-mongo/rows/bulk
 * Create multiple rows at once
 */
router.post('/rows/bulk', async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows array is required' });
    }

    const createdRows = await mongoTestDataService.bulkCreateRows(rows);
    res.status(201).json({ created: createdRows.length, rows: createdRows });
  } catch (error) {
    console.error('Error bulk creating rows:', error);
    res.status(500).json({ error: 'Failed to bulk create rows' });
  }
});

/**
 * PUT /api/test-data-mongo/rows/bulk
 * Update multiple rows at once
 */
router.put('/rows/bulk', async (req: AuthRequest, res: Response) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'updates array is required' });
    }

    const modifiedCount = await mongoTestDataService.bulkUpdateRows(updates);
    res.json({ updated: modifiedCount });
  } catch (error) {
    console.error('Error bulk updating rows:', error);
    res.status(500).json({ error: 'Failed to bulk update rows' });
  }
});

// ==================== SEARCH & STATS ====================

/**
 * GET /api/test-data-mongo/search/:sheetId
 * Search rows in a sheet
 */
router.get('/search/:sheetId', async (req: AuthRequest, res: Response) => {
  try {
    const { sheetId } = req.params;
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const rows = await mongoTestDataService.searchRows(sheetId, q);
    res.json(rows);
  } catch (error) {
    console.error('Error searching rows:', error);
    res.status(500).json({ error: 'Failed to search rows' });
  }
});

/**
 * GET /api/test-data-mongo/stats/:applicationId
 * Get test data statistics for an application
 */
router.get('/stats/:applicationId', async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId } = req.params;
    const stats = await mongoTestDataService.getApplicationStats(applicationId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
