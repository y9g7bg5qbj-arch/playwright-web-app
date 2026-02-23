/**
 * Test Data Table Relationships Routes
 *
 * Provides endpoints for managing relationships between test data tables,
 * including CRUD operations and data lookup across related tables.
 *
 * Mounted under /api/test-data
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { testDataSheetRepository, testDataRowRepository, testDataRelationshipRepository } from '../../db/repositories/mongo';
import { getStringParam, resolveScopeForRequest } from './helpers';
import { logger } from '../../utils/logger';

const router = Router();

// ==================== SHEET-SCOPED RELATIONSHIPS ====================

/**
 * GET /api/test-data/sheets/:sheetId/relationships
 * List all relationships for a sheet (both source and target)
 */
router.get('/sheets/:sheetId/relationships', async (req: AuthRequest, res: Response) => {
    try {
        const { sheetId } = req.params;

        const [sourceRelationships, targetRelationships] = await Promise.all([
            testDataRelationshipRepository.findBySourceSheetId(sheetId),
            testDataRelationshipRepository.findByTargetSheetId(sheetId)
        ]);

        // Fetch related sheets for outgoing relationships
        const targetSheetIds = [...new Set(sourceRelationships.map(r => r.targetSheetId))];
        const sourceSheetIds = [...new Set(targetRelationships.map(r => r.sourceSheetId))];

        const allRelatedSheetIds = [...new Set([...targetSheetIds, ...sourceSheetIds])];
        const relatedSheetsMap = new Map<string, any>();
        for (const id of allRelatedSheetIds) {
            const sheet = await testDataSheetRepository.findById(id);
            if (sheet) relatedSheetsMap.set(id, sheet);
        }

        res.json({
            success: true,
            outgoing: sourceRelationships.map(r => {
                const targetSheet = relatedSheetsMap.get(r.targetSheetId);
                return {
                    id: r.id,
                    name: r.name,
                    sourceColumn: r.sourceColumn,
                    targetSheetId: r.targetSheetId,
                    targetSheetName: targetSheet?.name || 'Unknown',
                    targetColumn: r.targetColumn,
                    targetColumns: targetSheet?.columns || [],
                    displayColumns: JSON.parse(r.displayColumns),
                    relationshipType: r.relationshipType,
                    cascadeDelete: r.cascadeDelete,
                    createdAt: r.createdAt
                };
            }),
            incoming: targetRelationships.map(r => {
                const sourceSheet = relatedSheetsMap.get(r.sourceSheetId);
                return {
                    id: r.id,
                    name: r.name,
                    sourceSheetId: r.sourceSheetId,
                    sourceSheetName: sourceSheet?.name || 'Unknown',
                    sourceColumn: r.sourceColumn,
                    sourceColumns: sourceSheet?.columns || [],
                    targetColumn: r.targetColumn,
                    relationshipType: r.relationshipType,
                    createdAt: r.createdAt
                };
            })
        });
    } catch (error) {
        logger.error('Error listing relationships:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ==================== APPLICATION-SCOPED RELATIONSHIPS ====================

/**
 * GET /api/test-data/relationships
 * List all relationships for an application
 */
router.get('/relationships', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const applicationId = getStringParam(req.query.projectId);
        const nestedProjectId = getStringParam(req.query.nestedProjectId);
        const resolved = await resolveScopeForRequest(userId, applicationId, nestedProjectId, false, req.userRole);
        if (!resolved.scope) {
            return res.status(resolved.status || 500).json({
                success: false,
                error: resolved.error || 'Failed to resolve scope'
            });
        }

        // Get all sheets for this application
        const sheets = await testDataSheetRepository.findByScope(
            resolved.scope.applicationId,
            resolved.scope.nestedProjectId
        );
        const sheetIds = sheets.map(s => s.id);
        const sheetMap = new Map(sheets.map(s => [s.id, s]));

        // Get all relationships where source sheet belongs to this application
        const relationships = await testDataRelationshipRepository.findBySheetIds(sheetIds);
        // Filter to only outgoing relationships from this application's sheets
        const outgoingRelationships = relationships.filter(r => sheetIds.includes(r.sourceSheetId));

        // Fetch any target sheets not in our map
        const missingSheetIds = outgoingRelationships
            .filter(r => !sheetMap.has(r.targetSheetId))
            .map(r => r.targetSheetId);
        for (const id of missingSheetIds) {
            const sheet = await testDataSheetRepository.findById(id);
            if (sheet) sheetMap.set(id, sheet);
        }

        res.json({
            success: true,
            relationships: outgoingRelationships.map(r => {
                const sourceSheet = sheetMap.get(r.sourceSheetId);
                const targetSheet = sheetMap.get(r.targetSheetId);
                return {
                    id: r.id,
                    name: r.name,
                    sourceSheetId: r.sourceSheetId,
                    sourceSheetName: sourceSheet?.name || 'Unknown',
                    sourceColumn: r.sourceColumn,
                    targetSheetId: r.targetSheetId,
                    targetSheetName: targetSheet?.name || 'Unknown',
                    targetColumn: r.targetColumn,
                    displayColumns: JSON.parse(r.displayColumns),
                    relationshipType: r.relationshipType,
                    cascadeDelete: r.cascadeDelete,
                    createdAt: r.createdAt,
                    updatedAt: r.updatedAt
                };
            })
        });
    } catch (error) {
        logger.error('Error listing all relationships:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ==================== RELATIONSHIP CRUD ====================

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
            testDataSheetRepository.findById(sourceSheetId),
            testDataSheetRepository.findById(targetSheetId)
        ]);

        if (!sourceSheet || !targetSheet) {
            return res.status(404).json({
                success: false,
                error: 'Source or target sheet not found'
            });
        }

        const relationship = await testDataRelationshipRepository.create({
            sourceSheetId,
            targetSheetId,
            name,
            sourceColumn,
            targetColumn,
            displayColumns: JSON.stringify(displayColumns || []),
            relationshipType: relationshipType || 'many-to-one',
            cascadeDelete: cascadeDelete || false
        });

        res.status(201).json({
            success: true,
            relationship: {
                id: relationship.id,
                name: relationship.name,
                sourceSheetId: relationship.sourceSheetId,
                sourceSheetName: sourceSheet.name,
                sourceColumn: relationship.sourceColumn,
                targetSheetId: relationship.targetSheetId,
                targetSheetName: targetSheet.name,
                targetColumn: relationship.targetColumn,
                displayColumns: JSON.parse(relationship.displayColumns),
                relationshipType: relationship.relationshipType,
                cascadeDelete: relationship.cascadeDelete,
                createdAt: relationship.createdAt
            }
        });
    } catch (error) {
        logger.error('Error creating relationship:', error);
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

        const existing = await testDataRelationshipRepository.findById(relationshipId);

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Relationship not found'
            });
        }

        const relationship = await testDataRelationshipRepository.update(relationshipId, {
            name: name ?? existing.name,
            displayColumns: displayColumns ? JSON.stringify(displayColumns) : existing.displayColumns,
            cascadeDelete: cascadeDelete ?? existing.cascadeDelete
        });

        if (!relationship) {
            return res.status(500).json({ success: false, error: 'Failed to update relationship' });
        }

        const [sourceSheet, targetSheet] = await Promise.all([
            testDataSheetRepository.findById(relationship.sourceSheetId),
            testDataSheetRepository.findById(relationship.targetSheetId)
        ]);

        res.json({
            success: true,
            relationship: {
                id: relationship.id,
                name: relationship.name,
                sourceSheetId: relationship.sourceSheetId,
                sourceSheetName: sourceSheet?.name || 'Unknown',
                sourceColumn: relationship.sourceColumn,
                targetSheetId: relationship.targetSheetId,
                targetSheetName: targetSheet?.name || 'Unknown',
                targetColumn: relationship.targetColumn,
                displayColumns: JSON.parse(relationship.displayColumns),
                relationshipType: relationship.relationshipType,
                cascadeDelete: relationship.cascadeDelete
            }
        });
    } catch (error) {
        logger.error('Error updating relationship:', error);
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

        await testDataRelationshipRepository.delete(relationshipId);

        res.json({
            success: true,
            message: 'Relationship deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting relationship:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ==================== RELATIONSHIP LOOKUP ====================

/**
 * GET /api/test-data/relationships/:relationshipId/lookup
 * Lookup related data for a specific value
 */
router.get('/relationships/:relationshipId/lookup', async (req: AuthRequest, res: Response) => {
    try {
        const { relationshipId } = req.params;
        const { value } = req.query;

        const relationship = await testDataRelationshipRepository.findById(relationshipId);

        if (!relationship) {
            return res.status(404).json({
                success: false,
                error: 'Relationship not found'
            });
        }

        // Find matching row in target sheet
        const targetRows = await testDataRowRepository.findBySheetId(relationship.targetSheetId);

        const displayColumns = JSON.parse(relationship.displayColumns) as string[];
        const matchingRow = targetRows.find(row => {
            const data = row.data as Record<string, any>;
            return data[relationship.targetColumn] === value;
        });

        if (!matchingRow) {
            return res.json({
                success: true,
                found: false,
                data: null
            });
        }

        const rowData = matchingRow.data as Record<string, any>;
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
        logger.error('Error looking up related data:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
