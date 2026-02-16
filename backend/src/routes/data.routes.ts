/**
 * Data Tables API Routes
 * 
 * Provides endpoints for managing test data tables and rows.
 * Tables are workflow-scoped and contain typed columns with row data.
 */

import { Router, Request, Response } from 'express';
import { dataTableRepository, dataRowRepository } from '../db/repositories/mongo';
import { generateTestDataCode } from '../codegen/testDataClassGenerator';
import { logger } from '../utils/logger';

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

        const tables = await dataTableRepository.findByWorkflowId(workflowId);

        // Get row counts for each table
        const tablesWithCounts = await Promise.all(
            tables.map(async (t) => {
                const rows = await dataRowRepository.findByTableId(t.id);
                return {
                    ...t,
                    columns: t.columns, // Already an object in MongoDB
                    rowCount: rows.length
                };
            })
        );

        res.json({
            success: true,
            tables: tablesWithCounts
        });
    } catch (error) {
        logger.error('Error fetching data tables:', error);
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

        const table = await dataTableRepository.findById(id);

        if (!table) {
            return res.status(404).json({
                success: false,
                error: 'Data table not found'
            });
        }

        const rows = await dataRowRepository.findByTableId(id);

        res.json({
            success: true,
            table: {
                ...table,
                columns: table.columns, // Already an object in MongoDB
                rows: rows.map(r => ({
                    ...r,
                    data: r.data // Already an object in MongoDB
                }))
            }
        });
    } catch (error) {
        logger.error('Error fetching data table:', error);
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

        // Check for duplicate name
        const existing = await dataTableRepository.findByWorkflowIdAndName(workflowId, name);
        if (existing) {
            return res.status(409).json({
                success: false,
                error: `A table named "${name}" already exists in this workflow`
            });
        }

        const table = await dataTableRepository.create({
            workflowId,
            name,
            description: description || undefined,
            columns: columns || []
        });

        res.status(201).json({
            success: true,
            table: {
                ...table,
                columns: table.columns
            }
        });
    } catch (error: any) {
        logger.error('Error creating data table:', error);
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
        if (columns !== undefined) updateData.columns = columns;

        const table = await dataTableRepository.update(id, updateData);

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
                columns: table.columns
            }
        });
    } catch (error) {
        logger.error('Error updating data table:', error);
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

        await dataTableRepository.delete(id);

        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting data table:', error);
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
        const maxOrderRow = await dataRowRepository.findFirstByTableIdDesc(tableId);

        const row = await dataRowRepository.create({
            tableId,
            data: data || {},
            order: (maxOrderRow?.order ?? -1) + 1
        });

        res.status(201).json({
            success: true,
            row: {
                ...row,
                data: row.data
            }
        });
    } catch (error) {
        logger.error('Error creating data row:', error);
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
        if (data !== undefined) updateData.data = data;
        if (order !== undefined) updateData.order = order;

        const row = await dataRowRepository.update(rowId, updateData);

        if (!row) {
            return res.status(404).json({
                success: false,
                error: 'Data row not found'
            });
        }

        res.json({
            success: true,
            row: {
                ...row,
                data: row.data
            }
        });
    } catch (error) {
        logger.error('Error updating data row:', error);
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

        await dataRowRepository.delete(rowId);

        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting data row:', error);
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
        const maxOrderRow = await dataRowRepository.findFirstByTableIdDesc(tableId);

        let currentOrder = (maxOrderRow?.order ?? -1) + 1;

        const rowsToCreate = rows.map((rowData: any) => ({
            tableId,
            data: rowData,
            order: currentOrder++
        }));

        const count = await dataRowRepository.createMany(rowsToCreate);

        res.status(201).json({
            success: true,
            count
        });
    } catch (error) {
        logger.error('Error bulk creating rows:', error);
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

        const table = await dataTableRepository.findByWorkflowIdAndName(workflowId, tableName);

        if (!table) {
            return res.status(404).json({
                success: false,
                error: `Data table "${tableName}" not found`
            });
        }

        const rows = await dataRowRepository.findByTableId(table.id);

        // Return data in a format ready for test iteration
        const columns = table.columns;
        const data = rows.map(r => r.data);

        res.json({
            success: true,
            tableName: table.name,
            columns,
            data,
            rowCount: data.length
        });
    } catch (error) {
        logger.error('Error fetching data table by name:', error);
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
        logger.error('Error generating test data code:', error);
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
        logger.error('Error downloading test data code:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;

