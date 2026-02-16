/**
 * Test Data Sheet CRUD Routes
 *
 * Provides endpoints for creating, reading, updating, and deleting
 * test data sheets (tables) within an application.
 *
 * Mounted under /api/test-data
 */

import { Router, Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { mongoTestDataService } from '../../services/mongodb-test-data.service';
import { getStringParam, resolveScopeForRequest, sheetInScope, TestDataScope } from './helpers';
import { logger } from '../../utils/logger';

const router = Router();

// ==================== SHEET CRUD ====================

/**
 * GET /api/test-data/sheets
 * List all test data sheets for an application
 */
router.get('/sheets', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const applicationId = getStringParam(req.query.projectId);
        const nestedProjectId = getStringParam(req.query.nestedProjectId);
        const resolved = await resolveScopeForRequest(userId, applicationId, nestedProjectId, true);

        if (!resolved.scope) {
            // Keep list behavior non-failing for unauthorized/missing contexts
            if (resolved.status === 403 || resolved.status === 400) {
                return res.json({
                    success: true,
                    sheets: []
                });
            }
            return res.status(resolved.status || 500).json({
                success: false,
                error: resolved.error || 'Failed to resolve scope'
            });
        }

        // Get sheets from MongoDB
        const sheets = await mongoTestDataService.getSheets(
            resolved.scope.applicationId,
            resolved.scope.nestedProjectId
        );

        // Get row counts for each sheet
        const sheetsWithCounts = await Promise.all(
            sheets.map(async (sheet) => {
                const stats = await mongoTestDataService.getSheetStats(sheet.id);
                return {
                    id: sheet.id,
                    name: sheet.name,
                    pageObject: sheet.pageObject,
                    description: sheet.description,
                    columns: sheet.columns || [],
                    projectId: sheet.projectId,
                    rowCount: stats.totalRows,
                    createdAt: sheet.createdAt,
                    updatedAt: sheet.updatedAt
                };
            })
        );

        res.json({
            success: true,
            sheets: sheetsWithCounts
        });
    } catch (error) {
        logger.error('Error listing sheets:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/test-data/sheets
 * Create a new test data sheet
 */
router.post('/sheets', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const applicationId = getStringParam(req.body.projectId);
        const nestedProjectId = getStringParam(req.body.nestedProjectId);
        const { name, pageObject, description, columns } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'name is required'
            });
        }

        const resolved = await resolveScopeForRequest(userId, applicationId, nestedProjectId, true);
        if (!resolved.scope) {
            return res.status(resolved.status || 500).json({
                success: false,
                error: resolved.error || 'Failed to resolve scope'
            });
        }

        // Check if sheet with same name already exists
        const existingSheet = await mongoTestDataService.getSheetByName(
            resolved.scope.applicationId,
            name,
            resolved.scope.nestedProjectId
        );
        if (existingSheet) {
            return res.status(409).json({
                success: false,
                error: `Sheet "${name}" already exists`
            });
        }

        // Create sheet in MongoDB
        const sheet = await mongoTestDataService.createSheet({
            applicationId: resolved.scope.applicationId,
            projectId: resolved.scope.nestedProjectId,
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
        logger.error('Error creating sheet:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/test-data/sheets/:id
 * Get a sheet with all its rows
 */
router.get('/sheets/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as AuthRequest).userId!;
        const applicationId = getStringParam(req.query.projectId);
        const nestedProjectId = getStringParam(req.query.nestedProjectId);
        let scope: TestDataScope | undefined;
        if (applicationId || nestedProjectId) {
            const resolved = await resolveScopeForRequest(userId, applicationId, nestedProjectId, false);
            if (!resolved.scope) {
                return res.status(resolved.status || 500).json({
                    success: false,
                    error: resolved.error || 'Failed to resolve scope'
                });
            }
            scope = resolved.scope;
        }

        // Get sheet from MongoDB
        const sheet = await mongoTestDataService.getSheetById(id);

        if (!sheet || (scope && !sheetInScope(sheet, scope))) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }

        // Get rows from MongoDB
        const rows = await mongoTestDataService.getRows(id);

        res.json({
            success: true,
            sheet: {
                ...sheet,
                columns: sheet.columns || [],
                rows: rows.map(r => ({
                    id: r.id,
                    sheetId: r.sheetId,
                    scenarioId: r.scenarioId,
                    data: r.data,
                    enabled: r.enabled,
                    createdAt: r.createdAt,
                    updatedAt: r.updatedAt
                }))
            }
        });
    } catch (error) {
        logger.error('Error fetching sheet:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /api/test-data/sheets/:id
 * Update a sheet (name, columns, etc.)
 */
router.put('/sheets/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as AuthRequest).userId!;
        const applicationId = getStringParam(req.body.projectId ?? req.query.projectId);
        const nestedProjectId = getStringParam(req.body.nestedProjectId ?? req.query.nestedProjectId);
        const { name, pageObject, description, columns } = req.body;
        let scope: TestDataScope | undefined;
        if (applicationId || nestedProjectId) {
            const resolved = await resolveScopeForRequest(userId, applicationId, nestedProjectId, false);
            if (!resolved.scope) {
                return res.status(resolved.status || 500).json({
                    success: false,
                    error: resolved.error || 'Failed to resolve scope'
                });
            }
            scope = resolved.scope;
        }

        const existingSheet = await mongoTestDataService.getSheetById(id);
        if (!existingSheet || (scope && !sheetInScope(existingSheet, scope))) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (pageObject !== undefined) updateData.pageObject = pageObject;
        if (description !== undefined) updateData.description = description;
        if (columns !== undefined) updateData.columns = columns;

        const sheet = await mongoTestDataService.updateSheet(id, updateData);

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
        logger.error('Error updating sheet:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * DELETE /api/test-data/sheets/:id
 * Delete a sheet and all its rows
 */
router.delete('/sheets/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as AuthRequest).userId!;
        const applicationId = getStringParam(req.query.projectId);
        const nestedProjectId = getStringParam(req.query.nestedProjectId);
        let scope: TestDataScope | undefined;
        if (applicationId || nestedProjectId) {
            const resolved = await resolveScopeForRequest(userId, applicationId, nestedProjectId, false);
            if (!resolved.scope) {
                return res.status(resolved.status || 500).json({
                    success: false,
                    error: resolved.error || 'Failed to resolve scope'
                });
            }
            scope = resolved.scope;
        }

        const existingSheet = await mongoTestDataService.getSheetById(id);
        if (!existingSheet || (scope && !sheetInScope(existingSheet, scope))) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }

        const deleted = await mongoTestDataService.deleteSheet(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }

        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting sheet:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/test-data/schema
 * Get lightweight schema for autocomplete (sheet names and columns only)
 * Used by Vero editor for TestData. suggestions
 */
router.get('/schema', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const applicationId = getStringParam(req.query.projectId);
        const nestedProjectId = getStringParam(req.query.nestedProjectId);
        const resolved = await resolveScopeForRequest(userId, applicationId, nestedProjectId, false);
        if (!resolved.scope) {
            return res.status(resolved.status || 500).json({
                success: false,
                error: resolved.error || 'Failed to resolve scope'
            });
        }

        const { testDataSheetRepository } = await import('../../db/repositories/mongo');
        const sheets = await testDataSheetRepository.findByScope(
            resolved.scope.applicationId,
            resolved.scope.nestedProjectId
        );
        sheets.sort((a, b) => a.name.localeCompare(b.name));

        // Return lightweight schema for autocomplete
        res.json({
            success: true,
            schema: sheets.map(s => ({
                name: s.name,
                columns: (s.columns || []).map((c: any) => ({
                    name: c.name,
                    type: c.type
                }))
            }))
        });
    } catch (error) {
        logger.error('Error fetching schema:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/test-data/validate/:sheetId
 * Validate all rows in a sheet
 */
router.post('/validate/:sheetId', async (req: Request, res: Response) => {
    try {
        const { sheetId } = req.params;

        const { testDataSheetRepository, testDataRowRepository } = await import('../../db/repositories/mongo');
        const { TestDataValidator } = await import('../../services/test-data-validator');

        const sheet = await testDataSheetRepository.findById(sheetId);

        if (!sheet) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }

        const rows = await testDataRowRepository.findBySheetId(sheetId);

        const parsedSheet = {
            id: sheet.id,
            name: sheet.name,
            columns: (sheet.columns || []).map(col => ({
                ...col,
                // Normalize UI aliases to validator-supported core types
                type: (col.type === 'text'
                    ? 'string'
                    : col.type === 'flag'
                        ? 'boolean'
                        : col.type) as 'string' | 'number' | 'boolean' | 'date'
            }))
        };

        const parsedRows = rows.map(r => ({
            id: r.id,
            scenarioId: r.scenarioId,
            data: r.data,
            enabled: r.enabled
        }));

        const result = TestDataValidator.validateSheet(parsedSheet, parsedRows);

        res.json({
            success: true,
            validation: result
        });
    } catch (error) {
        logger.error('Error validating sheet:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/test-data/by-scenario/:applicationId/:scenarioId
 * Get all data for a scenario across all sheets
 */
router.get('/by-scenario/:applicationId/:scenarioId', async (req: Request, res: Response) => {
    try {
        const { applicationId, scenarioId } = req.params;
        const nestedProjectId = getStringParam(req.query.nestedProjectId);

        const { testDataSheetRepository, testDataRowRepository } = await import('../../db/repositories/mongo');

        // Get all sheets for the application
        const sheets = await testDataSheetRepository.findByScope(applicationId, nestedProjectId);

        // Get rows for each sheet with this scenarioId
        const dataBySheet: Record<string, any> = {};
        for (const sheet of sheets) {
            const sheetRows = await testDataRowRepository.findBySheetIdAndScenarioId(sheet.id, scenarioId);
            const enabledRow = sheetRows.find(r => r.enabled);
            if (enabledRow) {
                dataBySheet[sheet.name] = {
                    pageObject: sheet.pageObject,
                    data: enabledRow.data
                };
            }
        }

        res.json({
            success: true,
            scenarioId,
            data: dataBySheet
        });
    } catch (error) {
        logger.error('Error fetching scenario data:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/test-data/by-sheet/:applicationId/:sheetName/:scenarioId
 * Get data for a specific sheet and scenario
 */
router.get('/by-sheet/:applicationId/:sheetName/:scenarioId', async (req: Request, res: Response) => {
    try {
        const { applicationId, sheetName, scenarioId } = req.params;
        const nestedProjectId = getStringParam(req.query.nestedProjectId);

        const { testDataSheetRepository, testDataRowRepository } = await import('../../db/repositories/mongo');

        // Find sheet by applicationId and name
        const sheets = await testDataSheetRepository.findByScope(applicationId, nestedProjectId);
        const sheet = sheets.find(s => s.name === sheetName);

        if (!sheet) {
            return res.status(404).json({
                success: false,
                error: `Sheet "${sheetName}" not found`
            });
        }

        const rows = await testDataRowRepository.findBySheetIdAndScenarioId(sheet.id, scenarioId);
        const row = rows[0];

        if (!row) {
            return res.status(404).json({
                success: false,
                error: `No data found for scenario "${scenarioId}" in sheet "${sheetName}"`
            });
        }

        res.json({
            success: true,
            sheetName,
            scenarioId,
            enabled: row.enabled,
            data: row.data
        });
    } catch (error) {
        logger.error('Error fetching sheet data:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
