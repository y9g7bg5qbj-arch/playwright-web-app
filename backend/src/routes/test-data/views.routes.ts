/**
 * Test Data Saved Views Routes
 *
 * Provides endpoints for creating, reading, updating, and deleting
 * saved grid views (filter/sort/column state) for test data sheets.
 *
 * Mounted under /api/test-data
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { testDataSavedViewRepository } from '../../db/repositories/mongo';
import { logger } from '../../utils/logger';

const router = Router();

// ==================== SAVED VIEWS ====================

/**
 * GET /api/test-data/sheets/:sheetId/views
 * List all saved views for a sheet
 */
router.get('/sheets/:sheetId/views', async (req: AuthRequest, res: Response) => {
    try {
        const { sheetId } = req.params;

        const views = await testDataSavedViewRepository.findBySheetId(sheetId);
        // Sort: default views first, then alphabetically by name
        views.sort((a, b) => {
            if (a.isDefault !== b.isDefault) return b.isDefault ? 1 : -1;
            return a.name.localeCompare(b.name);
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
        logger.error('Error listing saved views:', error);
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
            await testDataSavedViewRepository.updateMany({ sheetId, isDefault: true }, { isDefault: false });
        }

        const view = await testDataSavedViewRepository.create({
            sheetId,
            name,
            description: description || undefined,
            isDefault: isDefault || false,
            filterState: JSON.stringify(filterState || {}),
            sortState: JSON.stringify(sortState || []),
            columnState: JSON.stringify(columnState || []),
            groupState: JSON.stringify(groupState || [])
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
        logger.error('Error creating saved view:', error);
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

        const existingView = await testDataSavedViewRepository.findById(viewId);

        if (!existingView) {
            return res.status(404).json({
                success: false,
                error: 'View not found'
            });
        }

        // If this view is set as default, unset other defaults
        if (isDefault && !existingView.isDefault) {
            await testDataSavedViewRepository.updateMany({ sheetId: existingView.sheetId, isDefault: true }, { isDefault: false });
        }

        const view = await testDataSavedViewRepository.update(viewId, {
            name: name ?? existingView.name,
            description: description !== undefined ? description : existingView.description,
            isDefault: isDefault ?? existingView.isDefault,
            filterState: filterState ? JSON.stringify(filterState) : existingView.filterState,
            sortState: sortState ? JSON.stringify(sortState) : existingView.sortState,
            columnState: columnState ? JSON.stringify(columnState) : existingView.columnState,
            groupState: groupState ? JSON.stringify(groupState) : existingView.groupState
        });

        if (!view) {
            return res.status(500).json({ success: false, error: 'Failed to update view' });
        }

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
        logger.error('Error updating saved view:', error);
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

        await testDataSavedViewRepository.delete(viewId);

        res.json({
            success: true,
            message: 'View deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting saved view:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
