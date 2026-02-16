/**
 * Test Data Environments & Global Variables Routes
 *
 * Provides endpoints for managing test environments, environment variables,
 * global variables, and resolved variable lookups.
 *
 * Mounted under /api/test-data
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { environmentService } from '../../services/environment.service';
import { logger } from '../../utils/logger';

const router = Router();

// ==================== ENVIRONMENTS ====================

/**
 * GET /api/test-data/environments
 * List all environments for the authenticated user
 */
router.get('/environments', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;

        const environments = await environmentService.listEnvironments(userId);

        res.json({
            success: true,
            environments
        });
    } catch (error) {
        logger.error('Error listing environments:', error);
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
router.post('/environments', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { name, description, variables, setActive } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'name is required'
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
        logger.error('Error creating environment:', error);
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
router.put('/environments/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const env = await environmentService.updateEnvironment(id, { name, description });

        res.json({
            success: true,
            environment: env
        });
    } catch (error) {
        logger.error('Error updating environment:', error);
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
router.put('/environments/:id/activate', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.userId!;

        await environmentService.setActiveEnvironment(userId, id);

        res.json({ success: true });
    } catch (error) {
        logger.error('Error activating environment:', error);
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
router.delete('/environments/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        await environmentService.deleteEnvironment(id);

        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting environment:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ==================== ENVIRONMENT VARIABLES ====================

/**
 * GET /api/test-data/environments/:id/variables
 * Get environment variables
 */
router.get('/environments/:id/variables', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const variables = await environmentService.getEnvironmentVariables(id);

        res.json({
            success: true,
            variables
        });
    } catch (error) {
        logger.error('Error fetching env variables:', error);
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
router.put('/environments/:id/variables/:key', async (req: AuthRequest, res: Response) => {
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
        logger.error('Error setting env variable:', error);
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
router.delete('/environments/:id/variables/:key', async (req: AuthRequest, res: Response) => {
    try {
        const { id, key } = req.params;

        await environmentService.deleteEnvironmentVariable(id, key);

        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting env variable:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ==================== GLOBAL VARIABLES ====================

/**
 * GET /api/test-data/global-variables
 * Get global variables for the authenticated user
 */
router.get('/global-variables', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;

        const variables = await environmentService.getGlobalVariables(userId);

        res.json({
            success: true,
            variables
        });
    } catch (error) {
        logger.error('Error fetching global variables:', error);
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
router.put('/global-variables/:key', async (req: AuthRequest, res: Response) => {
    try {
        const { key } = req.params;
        const userId = req.userId!;
        const { value, type, sensitive, description } = req.body;

        await environmentService.setGlobalVariable(userId, key, value, {
            type,
            sensitive,
            description
        });

        res.json({ success: true });
    } catch (error) {
        logger.error('Error setting global variable:', error);
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
router.delete('/global-variables/:key', async (req: AuthRequest, res: Response) => {
    try {
        const { key } = req.params;
        const userId = req.userId!;

        await environmentService.deleteGlobalVariable(userId, key);

        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting global variable:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ==================== RESOLVED VARIABLES ====================

/**
 * GET /api/test-data/resolved-variables
 * Get all resolved variables with precedence
 */
router.get('/resolved-variables', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;

        const result = await environmentService.getVariables(userId);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        logger.error('Error fetching resolved variables:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
