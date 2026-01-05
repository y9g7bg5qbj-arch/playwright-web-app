/**
 * Test Data Management API Routes
 *
 * Provides endpoints for managing test data sheets, rows, Excel import/export,
 * environments, and global variables.
 */

import { Router, Response } from 'express';
import multer from 'multer';
import { prisma } from '../db/prisma';
import { excelParserService } from '../services/excel-parser';
import { dtoGenerator } from '../services/dto-generator';
import { environmentService } from '../services/environment.service';
import { TestDataValidator } from '../services/test-data-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Helper function to verify project access
async function verifyProjectAccess(userId: string, projectId: string): Promise<{ hasAccess: boolean; isOwner: boolean }> {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            members: {
                where: { userId }
            }
        }
    });

    if (!project) {
        return { hasAccess: false, isOwner: false };
    }

    const isOwner = project.userId === userId;
    const isMember = project.members.length > 0;

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
 * List all test data sheets for a project
 */
router.get('/sheets', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { projectId } = req.query;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                error: 'projectId is required'
            });
        }

        // Verify project access
        const { hasAccess } = await verifyProjectAccess(userId, projectId as string);
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to this project'
            });
        }

        const sheets = await prisma.testDataSheet.findMany({
            where: { projectId: projectId as string },
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
router.post('/sheets', async (req: Request, res: Response) => {
    try {
        const { projectId, userId, name, pageObject, description, columns } = req.body;

        const pid = projectId || userId;
        if (!pid || !name) {
            return res.status(400).json({
                success: false,
                error: 'projectId and name are required'
            });
        }

        const sheet = await prisma.testDataSheet.create({
            data: {
                projectId: pid,
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
            })),
            skipDuplicates: true
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

        if (!projectId) {
            return res.status(400).json({
                success: false,
                error: 'projectId is required'
            });
        }

        // Verify project access
        const { hasAccess } = await verifyProjectAccess(userId, projectId as string);
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to this project'
            });
        }

        const sheets = await prisma.testDataSheet.findMany({
            where: { projectId: projectId as string },
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
// DTO CODE GENERATION
// ============================================

/**
 * GET /api/test-data/generate-dto
 * Generate TypeScript DTO classes
 */
router.get('/generate-dto', async (req: Request, res: Response) => {
    try {
        const { projectId, userId } = req.query;

        const pid = (projectId || userId) as string;
        if (!pid) {
            return res.status(400).json({
                success: false,
                error: 'projectId is required'
            });
        }

        const code = await dtoGenerator.generateDtoClasses(pid);

        res.json({
            success: true,
            code,
            contentType: 'text/typescript'
        });
    } catch (error) {
        console.error('Error generating DTO:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/test-data/generate-dto/download
 * Download generated DTO file
 */
router.get('/generate-dto/download', async (req: Request, res: Response) => {
    try {
        const { projectId, userId } = req.query;

        const pid = (projectId || userId) as string;
        if (!pid) {
            return res.status(400).json({
                success: false,
                error: 'projectId is required'
            });
        }

        const code = await dtoGenerator.generateDtoClasses(pid);

        res.setHeader('Content-Type', 'text/typescript');
        res.setHeader('Content-Disposition', 'attachment; filename="TestData.ts"');
        res.send(code);
    } catch (error) {
        console.error('Error downloading DTO:', error);
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
 * GET /api/test-data/by-scenario/:projectId/:scenarioId
 * Get all data for a scenario across all sheets
 */
router.get('/by-scenario/:projectId/:scenarioId', async (req: Request, res: Response) => {
    try {
        const { projectId, scenarioId } = req.params;

        const rows = await prisma.testDataRow.findMany({
            where: {
                scenarioId,
                enabled: true,
                sheet: {
                    projectId
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
 * GET /api/test-data/by-sheet/:projectId/:sheetName/:scenarioId
 * Get data for a specific sheet and scenario
 */
router.get('/by-sheet/:projectId/:sheetName/:scenarioId', async (req: Request, res: Response) => {
    try {
        const { projectId, sheetName, scenarioId } = req.params;

        const sheet = await prisma.testDataSheet.findUnique({
            where: {
                projectId_name: {
                    projectId,
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

export default router;
