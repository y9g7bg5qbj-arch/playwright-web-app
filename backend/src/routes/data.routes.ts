/**
 * Data Tables API Routes
 * 
 * Provides endpoints for managing test data tables and rows.
 * Tables are workflow-scoped and contain typed columns with row data.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { TestDataClassGenerator, generateTestDataCode } from '../codegen/testDataClassGenerator';

const router = Router();

// ============================================
// DATA TABLE ENDPOINTS
// ============================================

/**
 * GET /api/data-tables/workflow/:workflowId
 * Get all data tables for a workflow
 */
router.get('/workflow/:workflowId', async (req: Request, res: Response) => {
    try {
        const { workflowId } = req.params;

        const tables = await prisma.dataTable.findMany({
            where: { workflowId },
            include: {
                _count: {
                    select: { rows: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        res.json({
            success: true,
            tables: tables.map(t => ({
                ...t,
                columns: JSON.parse(t.columns),
                rowCount: t._count.rows
            }))
        });
    } catch (error) {
        console.error('Error fetching data tables:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/data-tables/:id
 * Get a single data table with all its rows
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const table = await prisma.dataTable.findUnique({
            where: { id },
            include: {
                rows: {
                    orderBy: { order: 'asc' }
                }
            }
        });

        if (!table) {
            return res.status(404).json({
                success: false,
                error: 'Data table not found'
            });
        }

        res.json({
            success: true,
            table: {
                ...table,
                columns: JSON.parse(table.columns),
                rows: table.rows.map(r => ({
                    ...r,
                    data: JSON.parse(r.data)
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching data table:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/data-tables
 * Create a new data table
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { workflowId, name, description, columns } = req.body;

        if (!workflowId || !name) {
            return res.status(400).json({
                success: false,
                error: 'workflowId and name are required'
            });
        }

        const table = await prisma.dataTable.create({
            data: {
                workflowId,
                name,
                description: description || null,
                columns: JSON.stringify(columns || [])
            }
        });

        res.status(201).json({
            success: true,
            table: {
                ...table,
                columns: JSON.parse(table.columns)
            }
        });
    } catch (error: any) {
        console.error('Error creating data table:', error);

        // Handle unique constraint violation
        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                error: `A table named "${req.body.name}" already exists in this workflow`
            });
        }

        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /api/data-tables/:id
 * Update a data table (name, description, columns)
 */
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, columns } = req.body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (columns !== undefined) updateData.columns = JSON.stringify(columns);

        const table = await prisma.dataTable.update({
            where: { id },
            data: updateData
        });

        res.json({
            success: true,
            table: {
                ...table,
                columns: JSON.parse(table.columns)
            }
        });
    } catch (error) {
        console.error('Error updating data table:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * DELETE /api/data-tables/:id
 * Delete a data table and all its rows
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.dataTable.delete({
            where: { id }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting data table:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ============================================
// DATA ROW ENDPOINTS
// ============================================

/**
 * POST /api/data-tables/:tableId/rows
 * Add a new row to a data table
 */
router.post('/:tableId/rows', async (req: Request, res: Response) => {
    try {
        const { tableId } = req.params;
        const { data } = req.body;

        // Get max order for this table
        const maxOrderRow = await prisma.dataRow.findFirst({
            where: { tableId },
            orderBy: { order: 'desc' },
            select: { order: true }
        });

        const row = await prisma.dataRow.create({
            data: {
                tableId,
                data: JSON.stringify(data || {}),
                order: (maxOrderRow?.order ?? -1) + 1
            }
        });

        res.status(201).json({
            success: true,
            row: {
                ...row,
                data: JSON.parse(row.data)
            }
        });
    } catch (error) {
        console.error('Error creating data row:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /api/data-tables/:tableId/rows/:rowId
 * Update a row's data
 */
router.put('/:tableId/rows/:rowId', async (req: Request, res: Response) => {
    try {
        const { rowId } = req.params;
        const { data, order } = req.body;

        const updateData: any = {};
        if (data !== undefined) updateData.data = JSON.stringify(data);
        if (order !== undefined) updateData.order = order;

        const row = await prisma.dataRow.update({
            where: { id: rowId },
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
        console.error('Error updating data row:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * DELETE /api/data-tables/:tableId/rows/:rowId
 * Delete a row
 */
router.delete('/:tableId/rows/:rowId', async (req: Request, res: Response) => {
    try {
        const { rowId } = req.params;

        await prisma.dataRow.delete({
            where: { id: rowId }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting data row:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/data-tables/:tableId/rows/bulk
 * Add multiple rows at once (for import/paste)
 */
router.post('/:tableId/rows/bulk', async (req: Request, res: Response) => {
    try {
        const { tableId } = req.params;
        const { rows } = req.body;

        if (!Array.isArray(rows)) {
            return res.status(400).json({
                success: false,
                error: 'rows must be an array'
            });
        }

        // Get max order for this table
        const maxOrderRow = await prisma.dataRow.findFirst({
            where: { tableId },
            orderBy: { order: 'desc' },
            select: { order: true }
        });

        let currentOrder = (maxOrderRow?.order ?? -1) + 1;

        const createdRows = await prisma.dataRow.createMany({
            data: rows.map((rowData: any) => ({
                tableId,
                data: JSON.stringify(rowData),
                order: currentOrder++
            }))
        });

        res.status(201).json({
            success: true,
            count: createdRows.count
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
 * GET /api/data-tables/by-name/:workflowId/:tableName
 * Get a data table by name (for Vero DSL integration)
 */
router.get('/by-name/:workflowId/:tableName', async (req: Request, res: Response) => {
    try {
        const { workflowId, tableName } = req.params;

        const table = await prisma.dataTable.findUnique({
            where: {
                workflowId_name: {
                    workflowId,
                    name: tableName
                }
            },
            include: {
                rows: {
                    orderBy: { order: 'asc' }
                }
            }
        });

        if (!table) {
            return res.status(404).json({
                success: false,
                error: `Data table "${tableName}" not found`
            });
        }

        // Return data in a format ready for test iteration
        const columns = JSON.parse(table.columns);
        const data = table.rows.map(r => JSON.parse(r.data));

        res.json({
            success: true,
            tableName: table.name,
            columns,
            data,
            rowCount: data.length
        });
    } catch (error) {
        console.error('Error fetching data table by name:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ============================================
// CODE GENERATION ENDPOINTS
// ============================================

/**
 * GET /api/data-tables/generate-code/:workflowId
 * Generate TypeScript code for TestData classes
 * 
 * Returns code that can be used like: TestData.Driver.firstName
 */
router.get('/generate-code/:workflowId', async (req: Request, res: Response) => {
    try {
        const { workflowId } = req.params;

        const code = await generateTestDataCode(workflowId);

        res.json({
            success: true,
            code,
            contentType: 'text/typescript'
        });
    } catch (error) {
        console.error('Error generating test data code:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/data-tables/generate-code/:workflowId/download
 * Download the generated TestData.ts file
 */
router.get('/generate-code/:workflowId/download', async (req: Request, res: Response) => {
    try {
        const { workflowId } = req.params;

        const code = await generateTestDataCode(workflowId);

        res.setHeader('Content-Type', 'text/typescript');
        res.setHeader('Content-Disposition', 'attachment; filename="TestData.ts"');
        res.send(code);
    } catch (error) {
        console.error('Error downloading test data code:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;

