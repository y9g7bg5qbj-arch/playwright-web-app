/**
 * Application Management API Routes
 *
 * Provides endpoints for managing applications, which are top-level containers
 * for projects, test data, and workflows.
 *
 * NOW USES MONGODB INSTEAD OF PRISMA
 */

import { Router, Response } from 'express';
import { applicationRepository, projectRepository, workflowRepository } from '../db/repositories/mongo';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================
// APPLICATION CRUD
// ============================================

/**
 * GET /api/applications
 * List all applications for the authenticated user
 */
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;

        // Get applications owned by user
        const applications = await applicationRepository.findByUserId(userId);

        // Get counts and projects for each application
        const applicationsWithDetails = await Promise.all(
            applications.map(async (app) => {
                const projects = await projectRepository.findByApplicationId(app.id);
                const workflows = await workflowRepository.findByApplicationId(app.id);

                return {
                    id: app.id,
                    name: app.name,
                    description: app.description,
                    baseUrl: app.baseUrl,
                    isOwner: true,
                    role: 'owner',
                    projectCount: projects.length,
                    workflowCount: workflows.length,
                    memberCount: 1,
                    projects: projects.map(p => ({
                        id: p.id,
                        name: p.name,
                        description: p.description,
                        veroPath: p.veroPath
                    })),
                    createdAt: app.createdAt,
                    updatedAt: app.updatedAt
                };
            })
        );

        res.json({
            success: true,
            data: applicationsWithDetails
        });
    } catch (error) {
        console.error('Error listing applications:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/applications
 * Create a new application
 */
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { name, description, baseUrl } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Application name is required'
            });
        }

        // Check for duplicate name
        const existing = await applicationRepository.findByUserIdAndName(userId, name.trim());
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'An application with this name already exists'
            });
        }

        // Create the application
        const application = await applicationRepository.create({
            userId,
            name: name.trim(),
            description: description?.trim() || undefined,
            baseUrl: baseUrl?.trim() || undefined
        });

        res.status(201).json({
            success: true,
            data: {
                id: application.id,
                name: application.name,
                description: application.description,
                baseUrl: application.baseUrl,
                projects: [],
                createdAt: application.createdAt
            }
        });
    } catch (error: any) {
        console.error('Error creating application:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/applications/:id
 * Get a single application by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;

        const application = await applicationRepository.findById(id);

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        // Check ownership
        if (application.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to access this application'
            });
        }

        // Get projects and workflows
        const projects = await projectRepository.findByApplicationId(id);
        const workflows = await workflowRepository.findByApplicationId(id);

        res.json({
            success: true,
            data: {
                id: application.id,
                name: application.name,
                description: application.description,
                baseUrl: application.baseUrl,
                isOwner: true,
                role: 'owner',
                projects: projects.map(p => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    veroPath: p.veroPath
                })),
                workflows: workflows.map(w => ({
                    id: w.id,
                    name: w.name,
                    description: w.description
                })),
                createdAt: application.createdAt,
                updatedAt: application.updatedAt
            }
        });
    } catch (error) {
        console.error('Error getting application:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /api/applications/:id
 * Update an application
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;
        const { name, description, baseUrl } = req.body;

        const application = await applicationRepository.findById(id);

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        if (application.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to update this application'
            });
        }

        // Check for duplicate name if name is being changed
        if (name && name.trim() !== application.name) {
            const existing = await applicationRepository.findByUserIdAndName(userId, name.trim());
            if (existing && existing.id !== id) {
                return res.status(409).json({
                    success: false,
                    error: 'An application with this name already exists'
                });
            }
        }

        const updated = await applicationRepository.update(id, {
            name: name?.trim() || application.name,
            description: description?.trim(),
            baseUrl: baseUrl?.trim()
        });

        res.json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error('Error updating application:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * DELETE /api/applications/:id
 * Delete an application
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;

        const application = await applicationRepository.findById(id);

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        if (application.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to delete this application'
            });
        }

        await applicationRepository.delete(id);

        res.json({
            success: true,
            message: 'Application deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ============================================
// PROJECT CRUD (nested under applications)
// ============================================

/**
 * GET /api/applications/:appId/projects
 * List all projects for an application
 */
router.get('/:appId/projects', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { appId } = req.params;

        const application = await applicationRepository.findById(appId);

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        if (application.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to access this application'
            });
        }

        const projects = await projectRepository.findByApplicationId(appId);

        res.json({
            success: true,
            data: projects
        });
    } catch (error) {
        console.error('Error listing projects:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/applications/:appId/projects
 * Create a new project within an application
 */
router.post('/:appId/projects', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { appId } = req.params;
        const { name, description, veroPath } = req.body;

        const application = await applicationRepository.findById(appId);

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        if (application.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to create projects in this application'
            });
        }

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Project name is required'
            });
        }

        // Check for duplicate name
        const existing = await projectRepository.findByApplicationIdAndName(appId, name.trim());
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'A project with this name already exists in this application'
            });
        }

        const project = await projectRepository.create({
            applicationId: appId,
            name: name.trim(),
            description: description?.trim() || undefined,
            veroPath: veroPath?.trim() || undefined,
            gitInitialized: false
        });

        res.status(201).json({
            success: true,
            data: project
        });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/applications/:appId/projects/:projectId
 * Get a single project
 */
router.get('/:appId/projects/:projectId', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { appId, projectId } = req.params;

        const application = await applicationRepository.findById(appId);

        if (!application || application.userId !== userId) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const project = await projectRepository.findById(projectId);

        if (!project || project.applicationId !== appId) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        res.json({
            success: true,
            data: project
        });
    } catch (error) {
        console.error('Error getting project:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /api/applications/:appId/projects/:projectId
 * Update a project
 */
router.put('/:appId/projects/:projectId', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { appId, projectId } = req.params;
        const { name, description, veroPath } = req.body;

        const application = await applicationRepository.findById(appId);

        if (!application || application.userId !== userId) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const project = await projectRepository.findById(projectId);

        if (!project || project.applicationId !== appId) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        const updated = await projectRepository.update(projectId, {
            name: name?.trim() || project.name,
            description: description?.trim(),
            veroPath: veroPath?.trim()
        });

        res.json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * DELETE /api/applications/:appId/projects/:projectId
 * Delete a project
 */
router.delete('/:appId/projects/:projectId', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { appId, projectId } = req.params;

        const application = await applicationRepository.findById(appId);

        if (!application || application.userId !== userId) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const project = await projectRepository.findById(projectId);

        if (!project || project.applicationId !== appId) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        await projectRepository.delete(projectId);

        res.json({
            success: true,
            message: 'Project deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
