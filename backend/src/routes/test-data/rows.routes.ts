/**
 * Test Data Row Routes
 *
 * Provides endpoints for row CRUD, bulk operations, search-replace,
 * fill-series, and data export.
 *
 * Mounted under /api/test-data
 */

import { Router, Request, Response } from 'express';
import { mongoTestDataService } from '../../services/mongodb-test-data.service';
import { testDataSheetRepository, testDataRowRepository } from '../../db/repositories/mongo';
import { testDataRowValidationService, type TestDataValidationErrorItem } from '../../services/test-data-row-validation.service';
import { logger } from '../../utils/logger';

const router = Router();

function sendValidationFailure(
    res: Response,
    validationErrors: TestDataValidationErrorItem[],
    message?: string
) {
    return res.status(422).json(
        testDataRowValidationService.toValidationErrorPayload(validationErrors, message)
    );
}

// ==================== ROW CRUD ====================

/**
 * GET /api/test-data/sheets/:id/rows
 * List all rows for a sheet
 */
router.get('/sheets/:id/rows', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { enabledOnly } = req.query;

        let rows;
        if (enabledOnly === 'true') {
            rows = await mongoTestDataService.getEnabledRows(id);
        } else {
            rows = await mongoTestDataService.getRows(id);
        }

        res.json({
            success: true,
            rows: rows.map(r => ({
                id: r.id,
                sheetId: r.sheetId,
                scenarioId: r.scenarioId,
                data: r.data,
                enabled: r.enabled,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt
            }))
        });
    } catch (error) {
        logger.error('Error listing rows:', error);
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

        const sheet = await testDataSheetRepository.findById(sheetId);
        if (!sheet) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }

        // Check for duplicate scenarioId in this sheet
        const existingRow = await mongoTestDataService.getRowByScenarioId(sheetId, scenarioId);
        if (existingRow) {
            return res.status(409).json({
                success: false,
                error: `Row with TestID "${scenarioId}" already exists`
            });
        }

        const typedValidation = testDataRowValidationService.validateCreateData(
            scenarioId,
            data || {},
            (sheet.columns || []) as any[]
        );
        if (!typedValidation.valid) {
            return sendValidationFailure(
                res,
                typedValidation.validationErrors,
                'Row creation blocked by strict column type validation.'
            );
        }

        const row = await mongoTestDataService.createRow({
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
        logger.error('Error creating row:', error);
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

        const existingRow = await testDataRowRepository.findById(id);
        if (!existingRow) {
            return res.status(404).json({
                success: false,
                error: 'Row not found'
            });
        }

        if (data !== undefined) {
            const sheet = await testDataSheetRepository.findById(existingRow.sheetId);
            if (!sheet) {
                return res.status(404).json({
                    success: false,
                    error: 'Sheet not found'
                });
            }
            const mergedData = {
                ...(existingRow.data as Record<string, unknown>),
                ...(data as Record<string, unknown>)
            };
            const typedValidation = testDataRowValidationService.validateChangedFields(
                id,
                (existingRow.data as Record<string, unknown>) || {},
                mergedData,
                (sheet.columns || []) as any[]
            );
            if (!typedValidation.valid) {
                return sendValidationFailure(
                    res,
                    typedValidation.validationErrors,
                    'Row update blocked by strict column type validation.'
                );
            }
        }

        const updateData: any = {};
        if (scenarioId !== undefined) updateData.scenarioId = scenarioId;
        if (data !== undefined) updateData.data = data;
        if (enabled !== undefined) updateData.enabled = enabled;

        const row = await mongoTestDataService.updateRow(id, updateData);

        res.json({
            success: true,
            row
        });
    } catch (error) {
        logger.error('Error updating row:', error);
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

        const deleted = await mongoTestDataService.deleteRow(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Row not found'
            });
        }

        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting row:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ==================== BULK OPERATIONS ====================

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

        const sheet = await testDataSheetRepository.findById(sheetId);
        if (!sheet) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }

        const rowInputs = rows.map((row: any) => ({
            sheetId,
            scenarioId: row.scenarioId || row.TestID,
            data: row.data || row,
            enabled: row.enabled ?? true
        }));

        const validationErrors: TestDataValidationErrorItem[] = [];
        for (const rowInput of rowInputs) {
            const typedValidation = testDataRowValidationService.validateCreateData(
                rowInput.scenarioId || 'new-row',
                rowInput.data || {},
                (sheet.columns || []) as any[]
            );
            if (!typedValidation.valid) {
                validationErrors.push(...typedValidation.validationErrors);
            }
        }

        if (validationErrors.length > 0) {
            return sendValidationFailure(
                res,
                validationErrors,
                'Bulk insert blocked by strict column type validation.'
            );
        }

        const result = await mongoTestDataService.bulkCreateRows(rowInputs);

        res.status(201).json({
            success: true,
            count: result.length
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

        // Verify all rows belong to this sheet and get existing data
        const existingRows = await mongoTestDataService.getRows(sheetId);
        const existingRowMap = new Map(existingRows.map(r => [r.id, r]));

        const rowIds = updates.map((u: { rowId: string }) => u.rowId);
        const validRows = rowIds.filter(id => existingRowMap.has(id));

        if (validRows.length !== rowIds.length) {
            return res.status(400).json({
                success: false,
                error: 'Some row IDs do not belong to this sheet'
            });
        }

        const sheet = await testDataSheetRepository.findById(sheetId);
        if (!sheet) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }

        // Build update operations with merged data
        const validationErrors: TestDataValidationErrorItem[] = [];
        const updateOps = updates.map((update: { rowId: string; data: Record<string, any> }) => {
            const existingRow = existingRowMap.get(update.rowId);
            const existingData = existingRow?.data || {};
            const mergedData = { ...existingData, ...update.data };

            const typedValidation = testDataRowValidationService.validateChangedFields(
                update.rowId,
                existingData as Record<string, unknown>,
                mergedData,
                (sheet.columns || []) as any[]
            );
            if (!typedValidation.valid) {
                validationErrors.push(...typedValidation.validationErrors);
            }

            return {
                id: update.rowId,
                input: { data: mergedData }
            };
        });

        if (validationErrors.length > 0) {
            return sendValidationFailure(
                res,
                validationErrors,
                'Bulk update blocked by strict column type validation.'
            );
        }

        const updatedCount = await mongoTestDataService.bulkUpdateRows(updateOps);

        res.json({
            success: true,
            updated: updatedCount
        });
    } catch (error) {
        logger.error('Error bulk updating rows:', error);
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
        const existingRows = await mongoTestDataService.getRows(sheetId);
        const existingRowIds = new Set(existingRows.map(r => r.id));
        const validRowIds = rowIds.filter(id => existingRowIds.has(id));

        if (validRowIds.length !== rowIds.length) {
            return res.status(400).json({
                success: false,
                error: 'Some row IDs do not belong to this sheet'
            });
        }

        // Delete all matching rows
        let deletedCount = 0;
        for (const rowId of validRowIds) {
            const deleted = await mongoTestDataService.deleteRow(rowId);
            if (deleted) deletedCount++;
        }

        res.json({
            success: true,
            deleted: deletedCount
        });
    } catch (error) {
        logger.error('Error bulk deleting rows:', error);
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
        const { rowIds } = req.body;

        if (!Array.isArray(rowIds) || rowIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'rowIds must be a non-empty array'
            });
        }

        // Fetch all rows in the sheet
        const allRows = await mongoTestDataService.getRows(sheetId);
        const rowMap = new Map(allRows.map(r => [r.id, r]));

        // Filter to rows to duplicate
        const rowsToDuplicate = rowIds.map(id => rowMap.get(id)).filter(Boolean);

        if (rowsToDuplicate.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid rows found to duplicate'
            });
        }

        // Generate unique scenarioIds for duplicates
        const existingIds = new Set(allRows.map(r => r.scenarioId));

        const newRowInputs = rowsToDuplicate.map(row => {
            // Generate a unique scenarioId
            let newScenarioId = `${row!.scenarioId}_copy`;
            let counter = 1;
            while (existingIds.has(newScenarioId)) {
                newScenarioId = `${row!.scenarioId}_copy${counter}`;
                counter++;
            }
            existingIds.add(newScenarioId);

            return {
                sheetId,
                scenarioId: newScenarioId,
                data: row!.data,
                enabled: row!.enabled
            };
        });

        // Create duplicated rows
        const createdRows = await mongoTestDataService.bulkCreateRows(newRowInputs);

        res.status(201).json({
            success: true,
            duplicated: createdRows.length,
            rows: createdRows
        });
    } catch (error) {
        logger.error('Error duplicating rows:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ==================== SEARCH & REPLACE ====================

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

        const sheet = await testDataSheetRepository.findById(sheetId);
        if (!sheet) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }

        // Fetch rows from MongoDB
        let rows = await mongoTestDataService.getRows(sheetId);

        // Filter by rowIds if scope is selection
        if (scope === 'selection' && rowIds && Array.isArray(rowIds)) {
            const rowIdSet = new Set(rowIds);
            rows = rows.filter(r => rowIdSet.has(r.id));
        }

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
        const updateOps: Array<{ id: string; input: { data: Record<string, any> } }> = [];
        const validationErrors: TestDataValidationErrorItem[] = [];

        // Process each row
        for (const row of rows) {
            const data = { ...row.data } as Record<string, any>;
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
                const typedValidation = testDataRowValidationService.validateChangedFields(
                    row.id,
                    (row.data as Record<string, unknown>) || {},
                    data,
                    (sheet.columns || []) as any[]
                );
                if (!typedValidation.valid) {
                    validationErrors.push(...typedValidation.validationErrors);
                    continue;
                }
                updatedRowIds.push(row.id);
                updateOps.push({ id: row.id, input: { data } });
            }
        }

        if (validationErrors.length > 0) {
            return sendValidationFailure(
                res,
                validationErrors,
                'Search and replace blocked by strict column type validation.'
            );
        }

        // Execute all updates via MongoDB
        if (updateOps.length > 0) {
            await mongoTestDataService.bulkUpdateRows(updateOps);
        }

        res.json({
            success: true,
            matches: totalMatches,
            replacements: totalReplacements,
            updatedRows: updatedRowIds.length,
            updatedRowIds
        });
    } catch (error) {
        logger.error('Error in search-replace:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ==================== FILL SERIES ====================

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
        const sheet = await testDataSheetRepository.findById(sheetId);
        if (!sheet) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }
        const targetColumn = (sheet.columns || []).find((col: any) => col.name === columnId);
        if (!targetColumn) {
            return res.status(400).json({
                success: false,
                error: `Column "${columnId}" not found in sheet schema`
            });
        }

        const allSheetRows = await testDataRowRepository.findBySheetId(sheetId);
        const rows = allSheetRows.filter(r => rowIds.includes(r.id));

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

        // Build and validate each row update before persisting any changes
        const updateOps: Array<{ id: string; data: Record<string, unknown> }> = [];
        const validationErrors: TestDataValidationErrorItem[] = [];

        for (const [index, row] of orderedRows.entries()) {
            const existingData = (row.data as Record<string, unknown>) || {};
            const data = { ...existingData };
            data[columnId] = generateValue(index);

            const typedValidation = testDataRowValidationService.validateChangedFields(
                row.id,
                existingData,
                data,
                (sheet.columns || []) as any[]
            );
            if (!typedValidation.valid) {
                validationErrors.push(...typedValidation.validationErrors);
                continue;
            }
            updateOps.push({ id: row.id, data });
        }

        if (validationErrors.length > 0) {
            return sendValidationFailure(
                res,
                validationErrors,
                'Fill series blocked by strict column type validation.'
            );
        }

        await Promise.all(updateOps.map((update) => testDataRowRepository.update(update.id, { data: update.data })));

        res.json({
            success: true,
            filled: orderedRows.length,
            updated: orderedRows.length,
            columnId,
            fillType
        });
    } catch (error) {
        logger.error('Error in fill-series:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ==================== DATA EXPORT ====================

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
        const sheet = await testDataSheetRepository.findById(sheetId);

        if (!sheet) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }

        // Fetch rows (optionally filtered)
        let rows = await testDataRowRepository.findBySheetId(sheetId);
        if (rowIdsParam) {
            const rowIds = (rowIdsParam as string).split(',');
            rows = rows.filter(r => rowIds.includes(r.id));
        }
        // Sort by scenarioId
        rows.sort((a, b) => a.scenarioId.localeCompare(b.scenarioId));

        const columns = sheet.columns as Array<{ name: string; type: string }>;
        const columnNames = columns.map(c => c.name);

        if (format === 'csv') {
            // Generate CSV
            const headers = ['TestID', ...columnNames, 'Enabled'].join(',');
            const csvRows = rows.map(row => {
                const data = row.data as Record<string, any>;
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
                ...row.data
            }))
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${sheet.name}.json"`);
        res.json(jsonData);
    } catch (error) {
        logger.error('Error exporting sheet data:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
