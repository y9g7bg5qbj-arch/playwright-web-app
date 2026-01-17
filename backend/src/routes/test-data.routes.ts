/**
 * Test Data Management API Routes
 *
 * Provides endpoints for managing test data sheets, rows, Excel import/export,
 * environments, and global variables.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../db/prisma';
import { excelParserService } from '../services/excel-parser';
import { environmentService } from '../services/environment.service';
import { TestDataValidator } from '../services/test-data-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Helper function to verify application access
async function verifyApplicationAccess(userId: string, applicationId: string): Promise<{ hasAccess: boolean; isOwner: boolean }> {
    const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
            members: {
                where: { userId }
            }
        }
    });

    if (!application) {
        return { hasAccess: false, isOwner: false };
    }

    const isOwner = application.userId === userId;
    const isMember = application.members.length > 0;

    return { hasAccess: isOwner || isMember, isOwner };
}

// Configure multer for file uploads (store in memory)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (_req, file, cb) => {
        const validMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/octet-stream'
        ];
        const validExtensions = ['.xlsx', '.xls'];
        const hasValidExt = validExtensions.some(ext =>
            file.originalname.toLowerCase().endsWith(ext)
        );

        if (validMimes.includes(file.mimetype) || hasValidExt) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
        }
    }
});

// ============================================
// TEST DATA SHEETS
// ============================================

/**
 * GET /api/test-data/sheets
 * List all test data sheets for an application
 */
router.get('/sheets', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { projectId } = req.query;

        // projectId is actually applicationId for backwards compatibility
        const applicationId = projectId as string;

        if (!applicationId) {
            return res.status(400).json({
                success: false,
                error: 'projectId is required'
            });
        }

        // Verify application access
        const application = await prisma.application.findFirst({
            where: {
                id: applicationId,
                OR: [
                    { userId },
                    { members: { some: { userId } } }
                ]
            }
        });

        if (!application) {
            // Fallback: use user's first application
            const firstApp = await prisma.application.findFirst({
                where: { userId },
                orderBy: { createdAt: 'asc' }
            });

            if (firstApp) {
                const sheets = await prisma.testDataSheet.findMany({
                    where: { applicationId: firstApp.id },
                    include: {
                        _count: {
                            select: { rows: true }
                        }
                    },
                    orderBy: { name: 'asc' }
                });

                return res.json({
                    success: true,
                    sheets: sheets.map(s => ({
                        id: s.id,
                        name: s.name,
                        pageObject: s.pageObject,
                        description: s.description,
                        columns: JSON.parse(s.columns),
                        rowCount: s._count.rows,
                        createdAt: s.createdAt,
                        updatedAt: s.updatedAt
                    }))
                });
            }

            return res.json({
                success: true,
                sheets: []
            });
        }

        const sheets = await prisma.testDataSheet.findMany({
            where: { applicationId: application.id },
            include: {
                _count: {
                    select: { rows: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        res.json({
            success: true,
            sheets: sheets.map(s => ({
                id: s.id,
                name: s.name,
                pageObject: s.pageObject,
                description: s.description,
                columns: JSON.parse(s.columns),
                rowCount: s._count.rows,
                createdAt: s.createdAt,
                updatedAt: s.updatedAt
            }))
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
 * POST /api/test-data/sheets
 * Create a new test data sheet
 */
router.post('/sheets', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { projectId, name, pageObject, description, columns } = req.body;

        // projectId here is actually the applicationId (for backwards compatibility)
        const applicationId = projectId;
        if (!applicationId || !name) {
            return res.status(400).json({
                success: false,
                error: 'projectId and name are required'
            });
        }

        // Verify the application exists and user has access
        const application = await prisma.application.findFirst({
            where: {
                id: applicationId,
                OR: [
                    { userId }, // User owns the application
                    { members: { some: { userId } } } // User is a member
                ]
            }
        });

        if (!application) {
            // Fallback: use user's first application (don't auto-create new ones)
            const firstApp = await prisma.application.findFirst({
                where: { userId },
                orderBy: { createdAt: 'asc' }
            });

            if (!firstApp) {
                return res.status(400).json({
                    success: false,
                    error: 'No application found. Please create an application first.'
                });
            }

            const sheet = await prisma.testDataSheet.create({
                data: {
                    applicationId: firstApp.id,
                    name,
                    pageObject: pageObject || name,
                    description,
                    columns: JSON.stringify(columns || [])
                }
            });

            return res.status(201).json({
                success: true,
                sheet: {
                    ...sheet,
                    columns: JSON.parse(sheet.columns)
                }
            });
        }

        const sheet = await prisma.testDataSheet.create({
            data: {
                applicationId: application.id,
                name,
                pageObject: pageObject || name,
                description,
                columns: JSON.stringify(columns || [])
            }
        });

        res.status(201).json({
            success: true,
            sheet: {
                ...sheet,
                columns: JSON.parse(sheet.columns)
            }
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
 * GET /api/test-data/sheets/:id
 * Get a sheet with all its rows
 */
router.get('/sheets/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const sheet = await prisma.testDataSheet.findUnique({
            where: { id },
            include: {
                rows: {
                    orderBy: { scenarioId: 'asc' }
                }
            }
        });

        if (!sheet) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }

        res.json({
            success: true,
            sheet: {
                ...sheet,
                columns: JSON.parse(sheet.columns),
                rows: sheet.rows.map(r => ({
                    ...r,
                    data: JSON.parse(r.data)
                }))
            }
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
 * PUT /api/test-data/sheets/:id
 * Update a sheet (name, columns, etc.)
 */
router.put('/sheets/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, pageObject, description, columns } = req.body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (pageObject !== undefined) updateData.pageObject = pageObject;
        if (description !== undefined) updateData.description = description;
        if (columns !== undefined) updateData.columns = JSON.stringify(columns);

        const sheet = await prisma.testDataSheet.update({
            where: { id },
            data: updateData
        });

        res.json({
            success: true,
            sheet: {
                ...sheet,
                columns: JSON.parse(sheet.columns)
            }
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
 * DELETE /api/test-data/sheets/:id
 * Delete a sheet and all its rows
 */
router.delete('/sheets/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.testDataSheet.delete({
            where: { id }
        });

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
 * GET /api/test-data/sheets/:id/rows
 * List all rows for a sheet
 */
router.get('/sheets/:id/rows', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { enabledOnly } = req.query;

        const where: any = { sheetId: id };
        if (enabledOnly === 'true') {
            where.enabled = true;
        }

        const rows = await prisma.testDataRow.findMany({
            where,
            orderBy: { scenarioId: 'asc' }
        });

        res.json({
            success: true,
            rows: rows.map(r => ({
                ...r,
                data: JSON.parse(r.data)
            }))
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
 * POST /api/test-data/sheets/:id/rows
 * Create a new row
 */
router.post('/sheets/:id/rows', async (req: Request, res: Response) => {
    try {
        const { id: sheetId } = req.params;
        const { scenarioId, data, enabled = true } = req.body;

        if (!scenarioId) {
            return res.status(400).json({
                success: false,
                error: 'scenarioId (TestID) is required'
            });
        }

        const row = await prisma.testDataRow.create({
            data: {
                sheetId,
                scenarioId,
                data: JSON.stringify(data || {}),
                enabled
            }
        });

        res.status(201).json({
            success: true,
            row: {
                ...row,
                data: JSON.parse(row.data)
            }
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
 * PUT /api/test-data/rows/:id
 * Update a row
 */
router.put('/rows/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { scenarioId, data, enabled } = req.body;

        const updateData: any = {};
        if (scenarioId !== undefined) updateData.scenarioId = scenarioId;
        if (data !== undefined) updateData.data = JSON.stringify(data);
        if (enabled !== undefined) updateData.enabled = enabled;

        const row = await prisma.testDataRow.update({
            where: { id },
            data: updateData
        });

        res.json({
            success: true,
            row: {
                ...row,
                data: JSON.parse(row.data)
            }
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
 * DELETE /api/test-data/rows/:id
 * Delete a row
 */
router.delete('/rows/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.testDataRow.delete({
            where: { id }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting row:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/test-data/sheets/:id/rows/bulk
 * Bulk create rows
 */
router.post('/sheets/:id/rows/bulk', async (req: Request, res: Response) => {
    try {
        const { id: sheetId } = req.params;
        const { rows } = req.body;

        if (!Array.isArray(rows)) {
            return res.status(400).json({
                success: false,
                error: 'rows must be an array'
            });
        }

        const result = await prisma.testDataRow.createMany({
            data: rows.map((row: any) => ({
                sheetId,
                scenarioId: row.scenarioId || row.TestID,
                data: JSON.stringify(row.data || row),
                enabled: row.enabled ?? true
            }))
        });

        res.status(201).json({
            success: true,
            count: result.count
        });
    } catch (error) {
        console.error('Error bulk creating rows:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/test-data/sheets/:id/rows/bulk-update
 * Bulk update multiple rows in a sheet
 * Body: { updates: Array<{ rowId: string, data: Record<string, any> }> }
 */
router.post('/sheets/:id/rows/bulk-update', async (req: Request, res: Response) => {
    try {
        const { id: sheetId } = req.params;
        const { updates } = req.body;

        if (!Array.isArray(updates)) {
            return res.status(400).json({
                success: false,
                error: 'updates must be an array'
            });
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'updates array cannot be empty'
            });
        }

        // Verify all rows belong to this sheet
        const rowIds = updates.map((u: { rowId: string }) => u.rowId);
        const existingRows = await prisma.testDataRow.findMany({
            where: {
                id: { in: rowIds },
                sheetId
            },
            select: { id: true, data: true }
        });

        if (existingRows.length !== rowIds.length) {
            return res.status(400).json({
                success: false,
                error: 'Some row IDs do not belong to this sheet'
            });
        }

        // Create a map of existing data for merging
        const existingDataMap = new Map(
            existingRows.map(row => [row.id, typeof row.data === 'string' ? JSON.parse(row.data) : row.data])
        );

        // Execute updates in a transaction
        const results = await prisma.$transaction(
            updates.map((update: { rowId: string; data: Record<string, any> }) => {
                const existingData = existingDataMap.get(update.rowId) || {};
                const mergedData = { ...existingData, ...update.data };

                return prisma.testDataRow.update({
                    where: { id: update.rowId },
                    data: { data: JSON.stringify(mergedData) }
                });
            })
        );

        res.json({
            success: true,
            updated: results.length
        });
    } catch (error) {
        console.error('Error bulk updating rows:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/test-data/sheets/:id/rows/bulk-delete
 * Bulk delete multiple rows
 * Body: { rowIds: string[] }
 */
router.post('/sheets/:id/rows/bulk-delete', async (req: Request, res: Response) => {
    try {
        const { id: sheetId } = req.params;
        const { rowIds } = req.body;

        if (!Array.isArray(rowIds) || rowIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'rowIds must be a non-empty array'
            });
        }

        // Verify all rows belong to this sheet
        const existingRows = await prisma.testDataRow.findMany({
            where: {
                id: { in: rowIds },
                sheetId
            },
            select: { id: true }
        });

        if (existingRows.length !== rowIds.length) {
            return res.status(400).json({
                success: false,
                error: 'Some row IDs do not belong to this sheet'
            });
        }

        // Delete all matching rows
        const result = await prisma.testDataRow.deleteMany({
            where: {
                id: { in: rowIds },
                sheetId
            }
        });

        res.json({
            success: true,
            deleted: result.count
        });
    } catch (error) {
        console.error('Error bulk deleting rows:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/test-data/sheets/:id/rows/duplicate
 * Duplicate selected rows
 * Body: { rowIds: string[], insertPosition: 'after' | 'end' }
 */
router.post('/sheets/:id/rows/duplicate', async (req: Request, res: Response) => {
    try {
        const { id: sheetId } = req.params;
        const { rowIds, insertPosition = 'end' } = req.body;

        if (!Array.isArray(rowIds) || rowIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'rowIds must be a non-empty array'
            });
        }

        // Fetch rows to duplicate
        const rowsToDuplicate = await prisma.testDataRow.findMany({
            where: {
                id: { in: rowIds },
                sheetId
            }
        });

        if (rowsToDuplicate.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid rows found to duplicate'
            });
        }

        // Generate unique scenarioIds for duplicates
        const existingScenarioIds = await prisma.testDataRow.findMany({
            where: { sheetId },
            select: { scenarioId: true }
        });
        const existingIds = new Set(existingScenarioIds.map(r => r.scenarioId));

        const newRows = rowsToDuplicate.map(row => {
            // Generate a unique scenarioId
            let newScenarioId = `${row.scenarioId}_copy`;
            let counter = 1;
            while (existingIds.has(newScenarioId)) {
                newScenarioId = `${row.scenarioId}_copy${counter}`;
                counter++;
            }
            existingIds.add(newScenarioId);

            return {
                sheetId,
                scenarioId: newScenarioId,
                data: row.data,
                enabled: row.enabled
            };
        });

        // Create duplicated rows
        const result = await prisma.testDataRow.createMany({
            data: newRows
        });

        // Fetch the newly created rows to return
        const createdRows = await prisma.testDataRow.findMany({
            where: {
                sheetId,
                scenarioId: { in: newRows.map(r => r.scenarioId) }
            }
        });

        res.status(201).json({
            success: true,
            duplicated: result.count,
            rows: createdRows.map(r => ({
                ...r,
                data: JSON.parse(r.data)
            }))
        });
    } catch (error) {
        console.error('Error duplicating rows:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/test-data/sheets/:id/search-replace
 * Find and replace text across cells
 * Body: { find: string, replace: string, scope: 'all' | 'selection' | 'column', columnId?: string, rowIds?: string[], options: { caseSensitive, wholeWord, useRegex } }
 */
router.post('/sheets/:id/search-replace', async (req: Request, res: Response) => {
    try {
        const { id: sheetId } = req.params;
        const { find, replace, scope = 'all', columnId, rowIds, options = {} } = req.body;

        if (!find) {
            return res.status(400).json({
                success: false,
                error: 'find string is required'
            });
        }

        const { caseSensitive = false, wholeWord = false, useRegex = false } = options;

        // Fetch rows based on scope
        let whereClause: any = { sheetId };
        if (scope === 'selection' && rowIds && Array.isArray(rowIds)) {
            whereClause.id = { in: rowIds };
        }

        const rows = await prisma.testDataRow.findMany({
            where: whereClause
        });

        // Build regex pattern
        let pattern: RegExp;
        try {
            let searchPattern = useRegex ? find : find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (wholeWord) {
                searchPattern = `\\b${searchPattern}\\b`;
            }
            pattern = new RegExp(searchPattern, caseSensitive ? 'g' : 'gi');
        } catch (e) {
            return res.status(400).json({
                success: false,
                error: 'Invalid regex pattern'
            });
        }

        let totalMatches = 0;
        let totalReplacements = 0;
        const updatedRowIds: string[] = [];

        // Process each row
        const updates: Promise<any>[] = [];
        for (const row of rows) {
            const data = JSON.parse(row.data) as Record<string, any>;
            let rowUpdated = false;

            // Get columns to process
            const columnsToProcess = scope === 'column' && columnId
                ? [columnId]
                : Object.keys(data);

            for (const col of columnsToProcess) {
                if (data[col] !== null && data[col] !== undefined) {
                    const value = String(data[col]);
                    const matches = value.match(pattern);
                    if (matches) {
                        totalMatches += matches.length;
                        const newValue = value.replace(pattern, replace);
                        if (newValue !== value) {
                            data[col] = newValue;
                            rowUpdated = true;
                            totalReplacements += matches.length;
                        }
                    }
                }
            }

            if (rowUpdated) {
                updatedRowIds.push(row.id);
                updates.push(
                    prisma.testDataRow.update({
                        where: { id: row.id },
                        data: { data: JSON.stringify(data) }
                    })
                );
            }
        }

        // Execute all updates
        await Promise.all(updates);

        res.json({
            success: true,
            matches: totalMatches,
            replacements: totalReplacements,
            updatedRows: updatedRowIds.length,
            updatedRowIds
        });
    } catch (error) {
        console.error('Error in search-replace:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/test-data/sheets/:id/fill-series
 * Fill cells with a value, sequence, or pattern
 * Body: { rowIds: string[], columnId: string, fillType: 'value' | 'sequence' | 'pattern', value?: string, startValue?: number, step?: number, pattern?: string }
 */
router.post('/sheets/:id/fill-series', async (req: Request, res: Response) => {
    try {
        const { id: sheetId } = req.params;
        const { rowIds, columnId, fillType = 'value', value, startValue = 1, step = 1, pattern } = req.body;

        if (!Array.isArray(rowIds) || rowIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'rowIds must be a non-empty array'
            });
        }

        if (!columnId) {
            return res.status(400).json({
                success: false,
                error: 'columnId is required'
            });
        }

        // Fetch rows in the order specified
        const rows = await prisma.testDataRow.findMany({
            where: {
                id: { in: rowIds },
                sheetId
            }
        });

        // Sort rows by the order in rowIds
        const rowMap = new Map(rows.map(r => [r.id, r]));
        const orderedRows = rowIds.map(id => rowMap.get(id)).filter(Boolean) as typeof rows;

        if (orderedRows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid rows found'
            });
        }

        // Generate values based on fill type
        const generateValue = (index: number): string | number => {
            switch (fillType) {
                case 'value':
                    return value ?? '';
                case 'sequence':
                    return startValue + (index * step);
                case 'pattern':
                    // Pattern supports {n} placeholder for row number
                    return (pattern || '{n}').replace(/\{n\}/g, String(startValue + (index * step)));
                default:
                    return '';
            }
        };

        // Update each row
        const updates = orderedRows.map((row, index) => {
            const data = JSON.parse(row.data) as Record<string, any>;
            data[columnId] = generateValue(index);
            return prisma.testDataRow.update({
                where: { id: row.id },
                data: { data: JSON.stringify(data) }
            });
        });

        await Promise.all(updates);

        res.json({
            success: true,
            filled: orderedRows.length,
            columnId,
            fillType
        });
    } catch (error) {
        console.error('Error in fill-series:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/test-data/sheets/:id/export-data
 * Export sheet data to JSON or CSV format
 * Query: format='json' | 'csv', rowIds? (optional, comma-separated)
 */
router.get('/sheets/:id/export-data', async (req: Request, res: Response) => {
    try {
        const { id: sheetId } = req.params;
        const { format = 'json', rowIds: rowIdsParam } = req.query;

        // Fetch sheet with columns
        const sheet = await prisma.testDataSheet.findUnique({
            where: { id: sheetId }
        });

        if (!sheet) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }

        // Fetch rows (optionally filtered)
        let whereClause: any = { sheetId };
        if (rowIdsParam) {
            const rowIds = (rowIdsParam as string).split(',');
            whereClause.id = { in: rowIds };
        }

        const rows = await prisma.testDataRow.findMany({
            where: whereClause,
            orderBy: { scenarioId: 'asc' }
        });

        const columns = JSON.parse(sheet.columns) as Array<{ name: string; type: string }>;
        const columnNames = columns.map(c => c.name);

        if (format === 'csv') {
            // Generate CSV
            const headers = ['TestID', ...columnNames, 'Enabled'].join(',');
            const csvRows = rows.map(row => {
                const data = JSON.parse(row.data) as Record<string, any>;
                const values = columnNames.map(col => {
                    const val = data[col];
                    if (val === null || val === undefined) return '';
                    const strVal = String(val);
                    // Escape quotes and wrap in quotes if contains comma or quotes
                    if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
                        return `"${strVal.replace(/"/g, '""')}"`;
                    }
                    return strVal;
                });
                return [row.scenarioId, ...values, row.enabled].join(',');
            });

            const csv = [headers, ...csvRows].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${sheet.name}.csv"`);
            return res.send(csv);
        }

        // Default: JSON format
        const jsonData = {
            sheet: {
                id: sheet.id,
                name: sheet.name,
                pageObject: sheet.pageObject,
                description: sheet.description,
                columns
            },
            rows: rows.map(row => ({
                TestID: row.scenarioId,
                enabled: row.enabled,
                ...JSON.parse(row.data)
            }))
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${sheet.name}.json"`);
        res.json(jsonData);
    } catch (error) {
        console.error('Error exporting sheet data:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ============================================
// EXCEL IMPORT/EXPORT
// ============================================

/**
 * POST /api/test-data/import
 * Import Excel file
 */
router.post('/import', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const projectId = req.body.projectId || req.body.userId;
        if (!projectId) {
            return res.status(400).json({
                success: false,
                error: 'projectId is required'
            });
        }

        const result = await excelParserService.importExcelBuffer(
            req.file.buffer,
            projectId
        );

        res.json({
            success: result.errors.length === 0,
            ...result
        });
    } catch (error) {
        console.error('Error importing Excel:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/test-data/export
 * Export to Excel
 */
router.get('/export', async (req: Request, res: Response) => {
    try {
        const { projectId, userId, sheetIds } = req.query;

        const pid = (projectId || userId) as string;
        if (!pid) {
            return res.status(400).json({
                success: false,
                error: 'projectId is required'
            });
        }

        const sheetIdList = sheetIds
            ? (sheetIds as string).split(',')
            : undefined;

        const buffer = await excelParserService.exportExcel(pid, sheetIdList);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="test-data.xlsx"');
        res.send(buffer);
    } catch (error) {
        console.error('Error exporting Excel:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/test-data/preview
 * Preview Excel file without importing
 */
router.post('/preview', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const sheets = excelParserService.parseExcelBuffer(req.file.buffer);

        res.json({
            success: true,
            sheets: sheets.map(s => ({
                name: s.name,
                columns: s.columns,
                rowCount: s.rows.length,
                sampleRows: s.rows.slice(0, 5)
            }))
        });
    } catch (error) {
        console.error('Error previewing Excel:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/test-data/template
 * Download Excel template
 */
router.get('/template', async (req: Request, res: Response) => {
    try {
        const { pageName = 'LoginPage', columns = 'email,password,username' } = req.query;

        const columnList = (columns as string).split(',').map(c => c.trim());
        const buffer = excelParserService.createTemplate(pageName as string, columnList);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${pageName}-template.xlsx"`);
        res.send(buffer);
    } catch (error) {
        console.error('Error creating template:', error);
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
 * GET /api/test-data/schema
 * Get lightweight schema for autocomplete (sheet names and columns only)
 * Used by Vero editor for TestData. suggestions
 */
router.get('/schema', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { projectId } = req.query;

        // projectId is actually applicationId for backwards compatibility
        const applicationId = projectId as string;

        if (!applicationId) {
            return res.status(400).json({
                success: false,
                error: 'projectId is required'
            });
        }

        // Verify application access
        const { hasAccess } = await verifyApplicationAccess(userId, applicationId);
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to this application'
            });
        }

        const sheets = await prisma.testDataSheet.findMany({
            where: { applicationId },
            select: {
                id: true,
                name: true,
                columns: true
            },
            orderBy: { name: 'asc' }
        });

        // Return lightweight schema for autocomplete
        res.json({
            success: true,
            schema: sheets.map(s => ({
                name: s.name,
                columns: JSON.parse(s.columns).map((c: any) => ({
                    name: c.name,
                    type: c.type
                }))
            }))
        });
    } catch (error) {
        console.error('Error fetching schema:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ============================================
// DATA VALIDATION
// ============================================

/**
 * POST /api/test-data/validate/:sheetId
 * Validate all rows in a sheet
 */
router.post('/validate/:sheetId', async (req: Request, res: Response) => {
    try {
        const { sheetId } = req.params;

        const sheet = await prisma.testDataSheet.findUnique({
            where: { id: sheetId },
            include: {
                rows: true
            }
        });

        if (!sheet) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }

        const parsedSheet = {
            id: sheet.id,
            name: sheet.name,
            columns: JSON.parse(sheet.columns)
        };

        const parsedRows = sheet.rows.map(r => ({
            id: r.id,
            scenarioId: r.scenarioId,
            data: JSON.parse(r.data),
            enabled: r.enabled
        }));

        const result = TestDataValidator.validateSheet(parsedSheet, parsedRows);

        res.json({
            success: true,
            validation: result
        });
    } catch (error) {
        console.error('Error validating sheet:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ============================================
// GET DATA BY SCENARIO ID (for test execution)
// ============================================

/**
 * GET /api/test-data/by-scenario/:applicationId/:scenarioId
 * Get all data for a scenario across all sheets
 */
router.get('/by-scenario/:applicationId/:scenarioId', async (req: Request, res: Response) => {
    try {
        const { applicationId, scenarioId } = req.params;

        const rows = await prisma.testDataRow.findMany({
            where: {
                scenarioId,
                enabled: true,
                sheet: {
                    applicationId
                }
            },
            include: {
                sheet: {
                    select: {
                        name: true,
                        pageObject: true
                    }
                }
            }
        });

        const dataBySheet: Record<string, any> = {};
        for (const row of rows) {
            const sheetName = row.sheet.name;
            dataBySheet[sheetName] = {
                pageObject: row.sheet.pageObject,
                data: JSON.parse(row.data)
            };
        }

        res.json({
            success: true,
            scenarioId,
            data: dataBySheet
        });
    } catch (error) {
        console.error('Error fetching scenario data:', error);
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

        const sheet = await prisma.testDataSheet.findUnique({
            where: {
                applicationId_name: {
                    applicationId,
                    name: sheetName
                }
            }
        });

        if (!sheet) {
            return res.status(404).json({
                success: false,
                error: `Sheet "${sheetName}" not found`
            });
        }

        const row = await prisma.testDataRow.findUnique({
            where: {
                sheetId_scenarioId: {
                    sheetId: sheet.id,
                    scenarioId
                }
            }
        });

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
            data: JSON.parse(row.data)
        });
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ============================================
// ENVIRONMENTS
// ============================================

/**
 * GET /api/test-data/environments
 * List all environments for a user
 */
router.get('/environments', async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        const environments = await environmentService.listEnvironments(userId as string);

        res.json({
            success: true,
            environments
        });
    } catch (error) {
        console.error('Error listing environments:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/test-data/environments
 * Create a new environment
 */
router.post('/environments', async (req: Request, res: Response) => {
    try {
        const { userId, name, description, variables, setActive } = req.body;

        if (!userId || !name) {
            return res.status(400).json({
                success: false,
                error: 'userId and name are required'
            });
        }

        const env = await environmentService.createEnvironment(userId, name, {
            description,
            variables,
            setActive
        });

        res.status(201).json({
            success: true,
            environment: env
        });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                error: `Environment "${req.body.name}" already exists`
            });
        }
        console.error('Error creating environment:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /api/test-data/environments/:id
 * Update an environment
 */
router.put('/environments/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const env = await environmentService.updateEnvironment(id, { name, description });

        res.json({
            success: true,
            environment: env
        });
    } catch (error) {
        console.error('Error updating environment:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /api/test-data/environments/:id/activate
 * Set environment as active
 */
router.put('/environments/:id/activate', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        await environmentService.setActiveEnvironment(userId, id);

        res.json({ success: true });
    } catch (error) {
        console.error('Error activating environment:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * DELETE /api/test-data/environments/:id
 * Delete an environment
 */
router.delete('/environments/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await environmentService.deleteEnvironment(id);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting environment:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/test-data/environments/:id/variables
 * Get environment variables
 */
router.get('/environments/:id/variables', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const variables = await environmentService.getEnvironmentVariables(id);

        res.json({
            success: true,
            variables
        });
    } catch (error) {
        console.error('Error fetching env variables:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /api/test-data/environments/:id/variables/:key
 * Set an environment variable
 */
router.put('/environments/:id/variables/:key', async (req: Request, res: Response) => {
    try {
        const { id, key } = req.params;
        const { value, type, sensitive, description } = req.body;

        await environmentService.setEnvironmentVariable(id, key, value, {
            type,
            sensitive,
            description
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error setting env variable:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * DELETE /api/test-data/environments/:id/variables/:key
 * Delete an environment variable
 */
router.delete('/environments/:id/variables/:key', async (req: Request, res: Response) => {
    try {
        const { id, key } = req.params;

        await environmentService.deleteEnvironmentVariable(id, key);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting env variable:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ============================================
// GLOBAL VARIABLES
// ============================================

/**
 * GET /api/test-data/global-variables
 * Get global variables
 */
router.get('/global-variables', async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        const variables = await environmentService.getGlobalVariables(userId as string);

        res.json({
            success: true,
            variables
        });
    } catch (error) {
        console.error('Error fetching global variables:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /api/test-data/global-variables/:key
 * Set a global variable
 */
router.put('/global-variables/:key', async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        const { userId, value, type, sensitive, description } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        await environmentService.setGlobalVariable(userId, key, value, {
            type,
            sensitive,
            description
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error setting global variable:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * DELETE /api/test-data/global-variables/:key
 * Delete a global variable
 */
router.delete('/global-variables/:key', async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        await environmentService.deleteGlobalVariable(userId as string, key);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting global variable:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/test-data/resolved-variables
 * Get all resolved variables with precedence
 */
router.get('/resolved-variables', async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        const result = await environmentService.getVariables(userId as string);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Error fetching resolved variables:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ============================================
// SAVED VIEWS
// ============================================

/**
 * GET /api/test-data/sheets/:sheetId/views
 * List all saved views for a sheet
 */
router.get('/sheets/:sheetId/views', async (req: AuthRequest, res: Response) => {
    try {
        const { sheetId } = req.params;

        const views = await prisma.testDataSavedView.findMany({
            where: { sheetId },
            orderBy: [
                { isDefault: 'desc' },
                { name: 'asc' }
            ]
        });

        res.json({
            success: true,
            views: views.map(v => ({
                id: v.id,
                name: v.name,
                description: v.description,
                isDefault: v.isDefault,
                filterState: JSON.parse(v.filterState),
                sortState: JSON.parse(v.sortState),
                columnState: JSON.parse(v.columnState),
                groupState: JSON.parse(v.groupState),
                createdAt: v.createdAt,
                updatedAt: v.updatedAt
            }))
        });
    } catch (error) {
        console.error('Error listing saved views:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/test-data/sheets/:sheetId/views
 * Create a new saved view
 */
router.post('/sheets/:sheetId/views', async (req: AuthRequest, res: Response) => {
    try {
        const { sheetId } = req.params;
        const { name, description, isDefault, filterState, sortState, columnState, groupState } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'name is required'
            });
        }

        // If this view is set as default, unset other defaults
        if (isDefault) {
            await prisma.testDataSavedView.updateMany({
                where: { sheetId, isDefault: true },
                data: { isDefault: false }
            });
        }

        const view = await prisma.testDataSavedView.create({
            data: {
                sheetId,
                name,
                description: description || null,
                isDefault: isDefault || false,
                filterState: JSON.stringify(filterState || {}),
                sortState: JSON.stringify(sortState || []),
                columnState: JSON.stringify(columnState || []),
                groupState: JSON.stringify(groupState || [])
            }
        });

        res.status(201).json({
            success: true,
            view: {
                id: view.id,
                name: view.name,
                description: view.description,
                isDefault: view.isDefault,
                filterState: JSON.parse(view.filterState),
                sortState: JSON.parse(view.sortState),
                columnState: JSON.parse(view.columnState),
                groupState: JSON.parse(view.groupState),
                createdAt: view.createdAt,
                updatedAt: view.updatedAt
            }
        });
    } catch (error) {
        console.error('Error creating saved view:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /api/test-data/views/:viewId
 * Update a saved view
 */
router.put('/views/:viewId', async (req: AuthRequest, res: Response) => {
    try {
        const { viewId } = req.params;
        const { name, description, isDefault, filterState, sortState, columnState, groupState } = req.body;

        const existingView = await prisma.testDataSavedView.findUnique({
            where: { id: viewId }
        });

        if (!existingView) {
            return res.status(404).json({
                success: false,
                error: 'View not found'
            });
        }

        // If this view is set as default, unset other defaults
        if (isDefault && !existingView.isDefault) {
            await prisma.testDataSavedView.updateMany({
                where: { sheetId: existingView.sheetId, isDefault: true },
                data: { isDefault: false }
            });
        }

        const view = await prisma.testDataSavedView.update({
            where: { id: viewId },
            data: {
                name: name ?? existingView.name,
                description: description !== undefined ? description : existingView.description,
                isDefault: isDefault ?? existingView.isDefault,
                filterState: filterState ? JSON.stringify(filterState) : existingView.filterState,
                sortState: sortState ? JSON.stringify(sortState) : existingView.sortState,
                columnState: columnState ? JSON.stringify(columnState) : existingView.columnState,
                groupState: groupState ? JSON.stringify(groupState) : existingView.groupState
            }
        });

        res.json({
            success: true,
            view: {
                id: view.id,
                name: view.name,
                description: view.description,
                isDefault: view.isDefault,
                filterState: JSON.parse(view.filterState),
                sortState: JSON.parse(view.sortState),
                columnState: JSON.parse(view.columnState),
                groupState: JSON.parse(view.groupState),
                createdAt: view.createdAt,
                updatedAt: view.updatedAt
            }
        });
    } catch (error) {
        console.error('Error updating saved view:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * DELETE /api/test-data/views/:viewId
 * Delete a saved view
 */
router.delete('/views/:viewId', async (req: AuthRequest, res: Response) => {
    try {
        const { viewId } = req.params;

        await prisma.testDataSavedView.delete({
            where: { id: viewId }
        });

        res.json({
            success: true,
            message: 'View deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting saved view:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ============================================
// TABLE RELATIONSHIPS
// ============================================

/**
 * GET /api/test-data/sheets/:sheetId/relationships
 * List all relationships for a sheet (both source and target)
 */
router.get('/sheets/:sheetId/relationships', async (req: AuthRequest, res: Response) => {
    try {
        const { sheetId } = req.params;

        const [sourceRelationships, targetRelationships] = await Promise.all([
            prisma.testDataRelationship.findMany({
                where: { sourceSheetId: sheetId },
                include: {
                    targetSheet: {
                        select: { id: true, name: true, columns: true }
                    }
                }
            }),
            prisma.testDataRelationship.findMany({
                where: { targetSheetId: sheetId },
                include: {
                    sourceSheet: {
                        select: { id: true, name: true, columns: true }
                    }
                }
            })
        ]);

        res.json({
            success: true,
            outgoing: sourceRelationships.map(r => ({
                id: r.id,
                name: r.name,
                sourceColumn: r.sourceColumn,
                targetSheetId: r.targetSheetId,
                targetSheetName: r.targetSheet.name,
                targetColumn: r.targetColumn,
                targetColumns: JSON.parse(r.targetSheet.columns),
                displayColumns: JSON.parse(r.displayColumns),
                relationshipType: r.relationshipType,
                cascadeDelete: r.cascadeDelete,
                createdAt: r.createdAt
            })),
            incoming: targetRelationships.map(r => ({
                id: r.id,
                name: r.name,
                sourceSheetId: r.sourceSheetId,
                sourceSheetName: r.sourceSheet.name,
                sourceColumn: r.sourceColumn,
                sourceColumns: JSON.parse(r.sourceSheet.columns),
                targetColumn: r.targetColumn,
                relationshipType: r.relationshipType,
                createdAt: r.createdAt
            }))
        });
    } catch (error) {
        console.error('Error listing relationships:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/test-data/relationships
 * List all relationships for an application
 */
router.get('/relationships', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { projectId } = req.query;
        const applicationId = projectId as string;

        if (!applicationId) {
            return res.status(400).json({
                success: false,
                error: 'projectId is required'
            });
        }

        // Get all sheets for this application
        const sheets = await prisma.testDataSheet.findMany({
            where: { applicationId },
            select: { id: true }
        });
        const sheetIds = sheets.map(s => s.id);

        // Get all relationships where source sheet belongs to this application
        const relationships = await prisma.testDataRelationship.findMany({
            where: {
                sourceSheetId: { in: sheetIds }
            },
            include: {
                sourceSheet: { select: { id: true, name: true } },
                targetSheet: { select: { id: true, name: true, columns: true } }
            }
        });

        res.json({
            success: true,
            relationships: relationships.map(r => ({
                id: r.id,
                name: r.name,
                sourceSheetId: r.sourceSheetId,
                sourceSheetName: r.sourceSheet.name,
                sourceColumn: r.sourceColumn,
                targetSheetId: r.targetSheetId,
                targetSheetName: r.targetSheet.name,
                targetColumn: r.targetColumn,
                displayColumns: JSON.parse(r.displayColumns),
                relationshipType: r.relationshipType,
                cascadeDelete: r.cascadeDelete,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt
            }))
        });
    } catch (error) {
        console.error('Error listing all relationships:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/test-data/relationships
 * Create a new table relationship
 */
router.post('/relationships', async (req: AuthRequest, res: Response) => {
    try {
        const {
            sourceSheetId,
            targetSheetId,
            name,
            sourceColumn,
            targetColumn,
            displayColumns,
            relationshipType,
            cascadeDelete
        } = req.body;

        if (!sourceSheetId || !targetSheetId || !name || !sourceColumn || !targetColumn) {
            return res.status(400).json({
                success: false,
                error: 'sourceSheetId, targetSheetId, name, sourceColumn, and targetColumn are required'
            });
        }

        // Verify both sheets exist
        const [sourceSheet, targetSheet] = await Promise.all([
            prisma.testDataSheet.findUnique({ where: { id: sourceSheetId } }),
            prisma.testDataSheet.findUnique({ where: { id: targetSheetId } })
        ]);

        if (!sourceSheet || !targetSheet) {
            return res.status(404).json({
                success: false,
                error: 'Source or target sheet not found'
            });
        }

        const relationship = await prisma.testDataRelationship.create({
            data: {
                sourceSheetId,
                targetSheetId,
                name,
                sourceColumn,
                targetColumn,
                displayColumns: JSON.stringify(displayColumns || []),
                relationshipType: relationshipType || 'many-to-one',
                cascadeDelete: cascadeDelete || false
            },
            include: {
                sourceSheet: { select: { name: true } },
                targetSheet: { select: { name: true, columns: true } }
            }
        });

        res.status(201).json({
            success: true,
            relationship: {
                id: relationship.id,
                name: relationship.name,
                sourceSheetId: relationship.sourceSheetId,
                sourceSheetName: relationship.sourceSheet.name,
                sourceColumn: relationship.sourceColumn,
                targetSheetId: relationship.targetSheetId,
                targetSheetName: relationship.targetSheet.name,
                targetColumn: relationship.targetColumn,
                displayColumns: JSON.parse(relationship.displayColumns),
                relationshipType: relationship.relationshipType,
                cascadeDelete: relationship.cascadeDelete,
                createdAt: relationship.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating relationship:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /api/test-data/relationships/:relationshipId
 * Update a table relationship
 */
router.put('/relationships/:relationshipId', async (req: AuthRequest, res: Response) => {
    try {
        const { relationshipId } = req.params;
        const { name, displayColumns, cascadeDelete } = req.body;

        const existing = await prisma.testDataRelationship.findUnique({
            where: { id: relationshipId }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Relationship not found'
            });
        }

        const relationship = await prisma.testDataRelationship.update({
            where: { id: relationshipId },
            data: {
                name: name ?? existing.name,
                displayColumns: displayColumns ? JSON.stringify(displayColumns) : existing.displayColumns,
                cascadeDelete: cascadeDelete ?? existing.cascadeDelete
            },
            include: {
                sourceSheet: { select: { name: true } },
                targetSheet: { select: { name: true } }
            }
        });

        res.json({
            success: true,
            relationship: {
                id: relationship.id,
                name: relationship.name,
                sourceSheetId: relationship.sourceSheetId,
                sourceSheetName: relationship.sourceSheet.name,
                sourceColumn: relationship.sourceColumn,
                targetSheetId: relationship.targetSheetId,
                targetSheetName: relationship.targetSheet.name,
                targetColumn: relationship.targetColumn,
                displayColumns: JSON.parse(relationship.displayColumns),
                relationshipType: relationship.relationshipType,
                cascadeDelete: relationship.cascadeDelete
            }
        });
    } catch (error) {
        console.error('Error updating relationship:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * DELETE /api/test-data/relationships/:relationshipId
 * Delete a table relationship
 */
router.delete('/relationships/:relationshipId', async (req: AuthRequest, res: Response) => {
    try {
        const { relationshipId } = req.params;

        await prisma.testDataRelationship.delete({
            where: { id: relationshipId }
        });

        res.json({
            success: true,
            message: 'Relationship deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting relationship:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/test-data/relationships/:relationshipId/lookup
 * Lookup related data for a specific value
 */
router.get('/relationships/:relationshipId/lookup', async (req: AuthRequest, res: Response) => {
    try {
        const { relationshipId } = req.params;
        const { value } = req.query;

        const relationship = await prisma.testDataRelationship.findUnique({
            where: { id: relationshipId },
            include: {
                targetSheet: { select: { id: true, columns: true } }
            }
        });

        if (!relationship) {
            return res.status(404).json({
                success: false,
                error: 'Relationship not found'
            });
        }

        // Find matching row in target sheet
        const targetRows = await prisma.testDataRow.findMany({
            where: { sheetId: relationship.targetSheetId }
        });

        const displayColumns = JSON.parse(relationship.displayColumns) as string[];
        const matchingRow = targetRows.find(row => {
            const data = JSON.parse(row.data);
            return data[relationship.targetColumn] === value;
        });

        if (!matchingRow) {
            return res.json({
                success: true,
                found: false,
                data: null
            });
        }

        const rowData = JSON.parse(matchingRow.data);
        const displayData: Record<string, unknown> = {};
        for (const col of displayColumns) {
            displayData[col] = rowData[col];
        }

        res.json({
            success: true,
            found: true,
            data: displayData,
            rowId: matchingRow.id
        });
    } catch (error) {
        console.error('Error looking up related data:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ============================================
// REFERENCE RESOLUTION
// ============================================

/**
 * POST /api/test-data/resolve-references
 * Resolve reference column values to full row data from target sheets
 * Used for VDQL expand clause and Vero script nested iterations
 */
router.post('/resolve-references', async (req: AuthRequest, res: Response) => {
    try {
        const { sheetId, rowId, columns } = req.body;

        if (!sheetId || !columns || !Array.isArray(columns)) {
            return res.status(400).json({
                success: false,
                error: 'sheetId and columns array are required'
            });
        }

        // Get the source sheet and its column definitions
        const sourceSheet = await prisma.testDataSheet.findUnique({
            where: { id: sheetId }
        });

        if (!sourceSheet) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }

        const sheetColumns = JSON.parse(sourceSheet.columns) as Array<{
            name: string;
            type: string;
            referenceConfig?: {
                targetSheet: string;
                targetColumn: string;
                displayColumn: string;
                allowMultiple: boolean;
                separator?: string;
            };
        }>;

        // Get the row data if rowId is provided
        let rowData: Record<string, unknown> = {};
        if (rowId) {
            const row = await prisma.testDataRow.findUnique({
                where: { id: rowId }
            });
            if (row) {
                rowData = JSON.parse(row.data);
            }
        }

        // Resolve each reference column
        const resolved: Record<string, unknown[]> = {};

        for (const colName of columns) {
            const column = sheetColumns.find(c => c.name === colName);

            if (!column || column.type !== 'reference' || !column.referenceConfig) {
                resolved[colName] = [];
                continue;
            }

            const config = column.referenceConfig;
            const separator = config.separator || ',';

            // Get the IDs from the row data
            const rawValue = rowData[colName];
            const ids = rawValue
                ? String(rawValue).split(separator).map(id => id.trim()).filter(Boolean)
                : [];

            if (ids.length === 0) {
                resolved[colName] = [];
                continue;
            }

            // Fetch all rows from the target sheet
            const targetRows = await prisma.testDataRow.findMany({
                where: { sheetId: config.targetSheet }
            });

            // Find matching rows by target column
            const matchedRows: Record<string, unknown>[] = [];
            for (const targetRow of targetRows) {
                const targetData = JSON.parse(targetRow.data);
                const targetId = String(targetData[config.targetColumn] || '');

                if (ids.includes(targetId)) {
                    matchedRows.push({
                        _id: targetRow.id,
                        _targetId: targetId,
                        ...targetData
                    });
                }
            }

            // Preserve order based on original IDs
            const orderedRows = ids
                .map(id => matchedRows.find(r => r._targetId === id))
                .filter(Boolean) as Record<string, unknown>[];

            resolved[colName] = orderedRows;
        }

        res.json({
            success: true,
            resolved
        });
    } catch (error) {
        console.error('Error resolving references:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/test-data/sheets/:sheetId/expand
 * Fetch sheet rows with reference columns expanded (VDQL expand support)
 */
router.post('/sheets/:sheetId/expand', async (req: AuthRequest, res: Response) => {
    try {
        const { sheetId } = req.params;
        const { rowIds, expandColumns } = req.body;

        // Get the sheet with all rows
        const sheet = await prisma.testDataSheet.findUnique({
            where: { id: sheetId },
            include: { rows: true }
        });

        if (!sheet) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }

        const sheetColumns = JSON.parse(sheet.columns) as Array<{
            name: string;
            type: string;
            referenceConfig?: {
                targetSheet: string;
                targetColumn: string;
                displayColumn: string;
                allowMultiple: boolean;
                separator?: string;
            };
        }>;

        // Filter rows if rowIds provided
        let rows = sheet.rows;
        if (rowIds && Array.isArray(rowIds) && rowIds.length > 0) {
            rows = rows.filter(r => rowIds.includes(r.id));
        }

        // Determine which columns to expand
        const referenceColumns = sheetColumns.filter(c =>
            c.type === 'reference' &&
            c.referenceConfig &&
            (!expandColumns || expandColumns.includes(c.name) || expandColumns.includes('all'))
        );

        // Pre-fetch all target sheet data for efficiency
        const targetSheetIds = [...new Set(referenceColumns.map(c => c.referenceConfig!.targetSheet))];
        const targetSheetData: Record<string, Array<{ id: string; data: Record<string, unknown> }>> = {};

        for (const targetId of targetSheetIds) {
            const targetRows = await prisma.testDataRow.findMany({
                where: { sheetId: targetId }
            });
            targetSheetData[targetId] = targetRows.map(r => ({
                id: r.id,
                data: JSON.parse(r.data)
            }));
        }

        // Expand each row
        const expandedRows = rows.map(row => {
            const rowData = JSON.parse(row.data);
            const expanded: Record<string, unknown> = { ...rowData };

            for (const col of referenceColumns) {
                const config = col.referenceConfig!;
                const separator = config.separator || ',';
                const rawValue = rowData[col.name];
                const ids = rawValue
                    ? String(rawValue).split(separator).map((id: string) => id.trim()).filter(Boolean)
                    : [];

                const targetRows = targetSheetData[config.targetSheet] || [];
                const matchedRows = ids
                    .map((id: string) => {
                        const match = targetRows.find(r =>
                            String(r.data[config.targetColumn]) === id
                        );
                        return match ? match.data : null;
                    })
                    .filter(Boolean);

                // Store expanded data with $ prefix
                expanded[`$${col.name.replace(/^\$/, '')}`] = matchedRows;
            }

            return {
                id: row.id,
                scenarioId: row.scenarioId,
                data: expanded,
                enabled: row.enabled
            };
        });

        res.json({
            success: true,
            sheet: {
                id: sheet.id,
                name: sheet.name,
                columns: sheetColumns
            },
            rows: expandedRows
        });
    } catch (error) {
        console.error('Error expanding sheet rows:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ============================================
// COMPUTED COLUMNS - Formula Evaluation
// ============================================

/**
 * POST /api/test-data/evaluate-formula
 * Evaluate a formula for a given row
 */
router.post('/evaluate-formula', async (req: AuthRequest, res: Response) => {
    try {
        const { formula, rowData, columns } = req.body;

        if (!formula || !rowData) {
            return res.status(400).json({
                success: false,
                error: 'formula and rowData are required'
            });
        }

        // Simple formula evaluator for basic arithmetic
        // Supports: column references, +, -, *, /, parentheses, numbers
        const evaluateFormula = (formula: string, data: Record<string, unknown>): number | string => {
            try {
                // Replace column references with values
                let expression = formula;

                // Match column names (alphanumeric and underscore)
                const columnRefs = formula.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];

                for (const ref of columnRefs) {
                    if (data[ref] !== undefined) {
                        const value = data[ref];
                        const numValue = typeof value === 'number' ? value : parseFloat(String(value));
                        if (!isNaN(numValue)) {
                            expression = expression.replace(new RegExp(`\\b${ref}\\b`, 'g'), String(numValue));
                        }
                    }
                }

                // Security: Only allow safe characters
                if (!/^[\d\s+\-*/().]+$/.test(expression)) {
                    return '#ERROR: Invalid formula';
                }

                // Evaluate the expression
                const result = Function('"use strict"; return (' + expression + ')')();

                if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
                    // Round to 2 decimal places for display
                    return Math.round(result * 100) / 100;
                }

                return '#ERROR: Invalid result';
            } catch {
                return '#ERROR: Evaluation failed';
            }
        };

        const result = evaluateFormula(formula, rowData);

        res.json({
            success: true,
            result,
            isError: typeof result === 'string' && result.startsWith('#ERROR')
        });
    } catch (error) {
        console.error('Error evaluating formula:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/test-data/sheets/:sheetId/compute-all
 * Compute all formula columns for all rows in a sheet
 */
router.post('/sheets/:sheetId/compute-all', async (req: AuthRequest, res: Response) => {
    try {
        const { sheetId } = req.params;

        const sheet = await prisma.testDataSheet.findUnique({
            where: { id: sheetId },
            include: { rows: true }
        });

        if (!sheet) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }

        const columns = JSON.parse(sheet.columns) as Array<{ name: string; type: string; formula?: string }>;
        const formulaColumns = columns.filter(c => c.formula);

        if (formulaColumns.length === 0) {
            return res.json({
                success: true,
                message: 'No formula columns to compute',
                updatedRows: 0
            });
        }

        // Evaluate formulas for each row
        const evaluateFormula = (formula: string, data: Record<string, unknown>): number | string => {
            try {
                let expression = formula;
                const columnRefs = formula.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];

                for (const ref of columnRefs) {
                    if (data[ref] !== undefined) {
                        const value = data[ref];
                        const numValue = typeof value === 'number' ? value : parseFloat(String(value));
                        if (!isNaN(numValue)) {
                            expression = expression.replace(new RegExp(`\\b${ref}\\b`, 'g'), String(numValue));
                        }
                    }
                }

                if (!/^[\d\s+\-*/().]+$/.test(expression)) {
                    return '#ERROR';
                }

                const result = Function('"use strict"; return (' + expression + ')')();
                return typeof result === 'number' && !isNaN(result) && isFinite(result)
                    ? Math.round(result * 100) / 100
                    : '#ERROR';
            } catch {
                return '#ERROR';
            }
        };

        let updatedCount = 0;
        for (const row of sheet.rows) {
            const data = JSON.parse(row.data) as Record<string, unknown>;
            let updated = false;

            for (const col of formulaColumns) {
                const result = evaluateFormula(col.formula!, data);
                if (data[col.name] !== result) {
                    data[col.name] = result;
                    updated = true;
                }
            }

            if (updated) {
                await prisma.testDataRow.update({
                    where: { id: row.id },
                    data: { data: JSON.stringify(data) }
                });
                updatedCount++;
            }
        }

        res.json({
            success: true,
            message: `Computed formulas for ${updatedCount} rows`,
            updatedRows: updatedCount
        });
    } catch (error) {
        console.error('Error computing formulas:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
