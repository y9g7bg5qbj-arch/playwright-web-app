/**
 * Test Data Preview Routes
 *
 * Provides a lightweight endpoint for previewing query results
 * (match count + sample rows) used by the editor hover provider.
 *
 * Mounted under /api/test-data
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { mongoTestDataService } from '../../services/mongodb-test-data.service';
import { resolveScopeForRequest } from './helpers';

const router = Router();

interface PreviewFilter {
    column: string;
    operator: string;
    value: string;
}

/**
 * POST /api/test-data/preview-query
 * Preview a VDQL-style query: returns match count + first N rows
 */
router.post('/preview-query', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { tableName, applicationId, filters, limit = 5 } = req.body as {
            tableName: string;
            applicationId: string;
            filters?: PreviewFilter[];
            limit?: number;
        };

        if (!tableName || !applicationId) {
            return res.status(400).json({
                success: false,
                error: 'tableName and applicationId are required',
            });
        }

        const resolved = await resolveScopeForRequest(userId, applicationId, undefined, true);
        if (!resolved.scope) {
            return res.status(resolved.status || 500).json({
                success: false,
                error: resolved.error || 'Failed to resolve scope',
            });
        }

        // Find the sheet by name
        const sheets = await mongoTestDataService.getSheets(
            resolved.scope.applicationId,
            resolved.scope.nestedProjectId
        );
        const sheet = sheets.find(
            (s) => s.name.toLowerCase() === tableName.toLowerCase()
        );

        if (!sheet) {
            return res.json({
                success: true,
                matchCount: 0,
                preview: [],
                error: `Table "${tableName}" not found`,
            });
        }

        // Get all rows
        const allRows = await mongoTestDataService.getRows(sheet.id);

        // Apply filters in memory
        let filtered = allRows;
        if (filters && filters.length > 0) {
            filtered = allRows.filter((row) => {
                return filters.every((f) => {
                    const cellValue = String(row.data?.[f.column] ?? '');
                    const filterValue = f.value;

                    switch (f.operator) {
                        case '==':
                        case 'equals':
                            return cellValue === filterValue;
                        case '!=':
                        case 'notEqual':
                            return cellValue !== filterValue;
                        case 'contains':
                        case 'CONTAINS':
                            return cellValue.toLowerCase().includes(filterValue.toLowerCase());
                        case 'startsWith':
                        case 'STARTS WITH':
                            return cellValue.toLowerCase().startsWith(filterValue.toLowerCase());
                        case 'endsWith':
                        case 'ENDS WITH':
                            return cellValue.toLowerCase().endsWith(filterValue.toLowerCase());
                        case '>':
                            return Number(cellValue) > Number(filterValue);
                        case '<':
                            return Number(cellValue) < Number(filterValue);
                        case '>=':
                            return Number(cellValue) >= Number(filterValue);
                        case '<=':
                            return Number(cellValue) <= Number(filterValue);
                        default:
                            return true;
                    }
                });
            });
        }

        const matchCount = filtered.length;
        const preview = filtered
            .slice(0, Math.min(limit, 5))
            .map((row) => row.data || {});

        return res.json({
            success: true,
            matchCount,
            preview,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            error: error.message || 'Preview query failed',
        });
    }
});

export default router;
