/**
 * Test Data Routes v2 - Using Repository Pattern
 *
 * This is an example of how to refactor routes to use the database
 * abstraction layer. It demonstrates:
 *
 * 1. Using repository pattern instead of direct Prisma calls
 * 2. Dependency injection of project context
 * 3. Clean separation of concerns
 *
 * To migrate existing routes:
 * 1. Replace `prisma.testDataSheet` with `ctx.testDataSheets`
 * 2. Remove JSON.parse/stringify - repositories handle it
 * 3. Use typed interfaces for better type safety
 */

import { Router, Response } from 'express';
import { getProjectContext, getCatalog } from '../database/adapters/legacy-prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { ITestDataSheet, ITestDataRow } from '../database/interfaces';

const router = Router();

// Apply authentication
router.use(authenticateToken);

// ============================================
// MIDDLEWARE: Inject Project Context
// ============================================

interface ProjectRequest extends AuthRequest {
  projectId: string;
  projectCtx: ReturnType<typeof getProjectContext>;
}

/**
 * Middleware to inject project context into request
 */
async function injectProjectContext(
  req: AuthRequest,
  res: Response,
  next: () => void
) {
  const projectId = req.query.projectId as string || req.body?.projectId;

  if (!projectId) {
    return res.status(400).json({
      success: false,
      error: 'projectId is required'
    });
  }

  // Verify project access
  const catalog = getCatalog();
  const project = await catalog.projects.findById(projectId);

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Check if user has access (owner or member)
  if (project.userId !== req.userId) {
    // TODO: Check project members
    // For now, allow if user is owner
  }

  // Inject context
  (req as ProjectRequest).projectId = projectId;
  (req as ProjectRequest).projectCtx = getProjectContext(projectId);

  next();
}

// ============================================
// TEST DATA SHEETS
// ============================================

/**
 * GET /api/v2/test-data/sheets
 * List all test data sheets for a project
 */
router.get('/sheets', injectProjectContext, async (req: AuthRequest, res: Response) => {
  try {
    const { projectCtx } = req as ProjectRequest;

    // Use repository - no JSON parsing needed!
    const sheets = await projectCtx.testDataSheets.findMany();

    // Get row counts
    const sheetsWithCounts = await Promise.all(
      sheets.map(async (sheet) => {
        const rows = await projectCtx.testDataRows.findBySheetId(sheet.id);
        return {
          ...sheet,
          rowCount: rows.length
        };
      })
    );

    res.json({
      success: true,
      sheets: sheetsWithCounts
    });
  } catch (error) {
    console.error('Error listing sheets:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v2/test-data/sheets
 * Create a new test data sheet
 */
router.post('/sheets', injectProjectContext, async (req: AuthRequest, res: Response) => {
  try {
    const { projectCtx } = req as ProjectRequest;
    const { name, pageObject, description, columns } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'name is required'
      });
    }

    // Create using repository - pass objects directly!
    const sheet = await projectCtx.testDataSheets.create({
      name,
      pageObject: pageObject || name,
      description,
      columns: columns || []
    });

    res.status(201).json({
      success: true,
      sheet
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: `Sheet "${req.body.name}" already exists`
      });
    }
    console.error('Error creating sheet:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v2/test-data/sheets/:id
 * Get a sheet with all its rows
 */
router.get('/sheets/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = req.query.projectId as string;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'projectId is required'
      });
    }

    const projectCtx = getProjectContext(projectId);

    // Use repository method that includes rows
    const sheet = await projectCtx.testDataSheets.findWithRows(id);

    if (!sheet) {
      return res.status(404).json({
        success: false,
        error: 'Sheet not found'
      });
    }

    res.json({
      success: true,
      sheet
    });
  } catch (error) {
    console.error('Error fetching sheet:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/v2/test-data/sheets/:id
 * Update a sheet
 */
router.put('/sheets/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { projectId, name, pageObject, description, columns } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'projectId is required'
      });
    }

    const projectCtx = getProjectContext(projectId);

    // Update using repository - partial updates supported
    const sheet = await projectCtx.testDataSheets.update(id, {
      ...(name !== undefined && { name }),
      ...(pageObject !== undefined && { pageObject }),
      ...(description !== undefined && { description }),
      ...(columns !== undefined && { columns })
    });

    res.json({
      success: true,
      sheet
    });
  } catch (error) {
    console.error('Error updating sheet:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/v2/test-data/sheets/:id
 * Delete a sheet and all its rows
 */
router.delete('/sheets/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = req.query.projectId as string;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'projectId is required'
      });
    }

    const projectCtx = getProjectContext(projectId);
    await projectCtx.testDataSheets.delete(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting sheet:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================
// TEST DATA ROWS
// ============================================

/**
 * GET /api/v2/test-data/sheets/:id/rows
 * List all rows for a sheet
 */
router.get('/sheets/:id/rows', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { enabledOnly, projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'projectId is required'
      });
    }

    const projectCtx = getProjectContext(projectId as string);

    let rows = await projectCtx.testDataRows.findBySheetId(id);

    if (enabledOnly === 'true') {
      rows = rows.filter(r => r.enabled);
    }

    res.json({
      success: true,
      rows
    });
  } catch (error) {
    console.error('Error listing rows:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v2/test-data/sheets/:id/rows
 * Create a new row
 */
router.post('/sheets/:id/rows', async (req: AuthRequest, res: Response) => {
  try {
    const { id: sheetId } = req.params;
    const { projectId, scenarioId, data, enabled = true } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'projectId is required'
      });
    }

    if (!scenarioId) {
      return res.status(400).json({
        success: false,
        error: 'scenarioId (TestID) is required'
      });
    }

    const projectCtx = getProjectContext(projectId);

    // Create row - data is passed as object, not stringified
    const row = await projectCtx.testDataRows.create({
      sheetId,
      scenarioId,
      data: data || {},
      enabled
    });

    res.status(201).json({
      success: true,
      row
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: `Row with TestID "${req.body.scenarioId}" already exists`
      });
    }
    console.error('Error creating row:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/v2/test-data/rows/:id
 * Update a row
 */
router.put('/rows/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { projectId, scenarioId, data, enabled } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'projectId is required'
      });
    }

    const projectCtx = getProjectContext(projectId);

    const row = await projectCtx.testDataRows.update(id, {
      ...(scenarioId !== undefined && { scenarioId }),
      ...(data !== undefined && { data }),
      ...(enabled !== undefined && { enabled })
    });

    res.json({
      success: true,
      row
    });
  } catch (error) {
    console.error('Error updating row:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/v2/test-data/rows/:id
 * Delete a row
 */
router.delete('/rows/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = req.query.projectId as string;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'projectId is required'
      });
    }

    const projectCtx = getProjectContext(projectId);
    await projectCtx.testDataRows.delete(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting row:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================
// SCHEMA FOR AUTOCOMPLETE
// ============================================

/**
 * GET /api/v2/test-data/schema
 * Get lightweight schema for autocomplete
 */
router.get('/schema', injectProjectContext, async (req: AuthRequest, res: Response) => {
  try {
    const { projectCtx } = req as ProjectRequest;

    // Use dedicated schema method
    const schema = await projectCtx.testDataSheets.getSchema();

    res.json({
      success: true,
      schema
    });
  } catch (error) {
    console.error('Error fetching schema:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
