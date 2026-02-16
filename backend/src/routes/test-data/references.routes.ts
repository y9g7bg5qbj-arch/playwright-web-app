/**
 * Test Data Reference Resolution & Formula Routes
 *
 * Provides endpoints for resolving reference column values to full row data
 * from target sheets, expanding referenced data (VDQL support), and
 * evaluating computed column formulas.
 *
 * Mounted under /api/test-data
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { testDataSheetRepository, testDataRowRepository } from '../../db/repositories/mongo';
import { logger } from '../../utils/logger';

const router = Router();

// ==================== REFERENCE RESOLUTION ====================

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
        const sourceSheet = await testDataSheetRepository.findById(sheetId);

        if (!sourceSheet) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }

        const sheetColumns = (sourceSheet.columns || []) as Array<{
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
            const row = await testDataRowRepository.findById(rowId);
            if (row) {
                rowData = row.data as Record<string, unknown>;
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
            const targetRows = await testDataRowRepository.findBySheetId(config.targetSheet);

            // Find matching rows by target column
            const matchedRows: Record<string, unknown>[] = [];
            for (const targetRow of targetRows) {
                const targetData = targetRow.data as Record<string, any>;
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
        logger.error('Error resolving references:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ==================== ROW EXPANSION ====================

/**
 * POST /api/test-data/sheets/:sheetId/expand
 * Fetch sheet rows with reference columns expanded (VDQL expand support)
 */
router.post('/sheets/:sheetId/expand', async (req: AuthRequest, res: Response) => {
    try {
        const { sheetId } = req.params;
        const { rowIds, expandColumns } = req.body;

        // Get the sheet with all rows
        const sheet = await testDataSheetRepository.findById(sheetId);

        if (!sheet) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }

        const allRows = await testDataRowRepository.findBySheetId(sheetId);

        const sheetColumns = (sheet.columns || []) as Array<{
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
        let rows = allRows;
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
            const targetRows = await testDataRowRepository.findBySheetId(targetId);
            targetSheetData[targetId] = targetRows.map(r => ({
                id: r.id,
                data: r.data as Record<string, unknown>
            }));
        }

        // Expand each row
        const expandedRows = rows.map(row => {
            const rowData = row.data as Record<string, any>;
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
        logger.error('Error expanding sheet rows:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ==================== FORMULA EVALUATION ====================

/**
 * POST /api/test-data/evaluate-formula
 * Evaluate a formula for a given row
 */
router.post('/evaluate-formula', async (req: AuthRequest, res: Response) => {
    try {
        const { formula, rowData } = req.body;

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
        logger.error('Error evaluating formula:', error);
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

        const sheet = await testDataSheetRepository.findById(sheetId);

        if (!sheet) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }

        const allRows = await testDataRowRepository.findBySheetId(sheetId);

        const columns = (sheet.columns || []) as Array<{ name: string; type: string; formula?: string }>;
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
        for (const row of allRows) {
            const data = row.data as Record<string, unknown>;
            let updated = false;

            for (const col of formulaColumns) {
                const result = evaluateFormula(col.formula!, data);
                if (data[col.name] !== result) {
                    data[col.name] = result;
                    updated = true;
                }
            }

            if (updated) {
                await testDataRowRepository.update(row.id, { data });
                updatedCount++;
            }
        }

        res.json({
            success: true,
            message: `Computed formulas for ${updatedCount} rows`,
            updatedRows: updatedCount
        });
    } catch (error) {
        logger.error('Error computing formulas:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
