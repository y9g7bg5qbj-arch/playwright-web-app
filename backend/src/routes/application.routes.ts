/**
 * Application Management API Routes
 *
 * Provides endpoints for managing applications, which are top-level containers
 * for projects, test data, and workflows.
 */

import { Router, Response } from 'express';
import { applicationRepository, projectRepository, workflowRepository, userEnvironmentRepository, environmentVariableRepository } from '../db/repositories/mongo';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
}

function mapEnvironmentVariable(variable: {
    id: string;
    key: string;
    value: string;
    sensitive: boolean;
    createdAt: Date;
    updatedAt: Date;
}) {
    return {
        id: variable.id,
        key: variable.key,
        value: variable.value,
        isSecret: variable.sensitive,
        createdAt: variable.createdAt,
        updatedAt: variable.updatedAt
    };
}

function mapEnvironment(
    applicationId: string,
    environment: {
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    },
    variables: Array<{
        id: string;
        key: string;
        value: string;
        sensitive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>
) {
    return {
        id: environment.id,
        applicationId,
        name: environment.name,
        isActive: environment.isActive,
        variables: variables.map(mapEnvironmentVariable),
        createdAt: environment.createdAt,
        updatedAt: environment.updatedAt
    };
}

async function ensureDefaultWorkflow(applicationId: string, userId: string) {
    const existing = await workflowRepository.findByApplicationId(applicationId);
    if (existing.length > 0) {
        return existing;
    }

    const created = await workflowRepository.create({
        applicationId,
        userId,
        name: 'Default Workflow',
        description: 'Auto-created default workflow',
    });
    return [created];
}

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
                const workflows = await ensureDefaultWorkflow(app.id, app.userId);

                return {
                    id: app.id,
                    userId: app.userId,
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
                    workflows: workflows.map(w => ({
                        id: w.id,
                        applicationId: w.applicationId,
                        userId: w.userId,
                        name: w.name,
                        description: w.description,
                        createdAt: w.createdAt,
                        updatedAt: w.updatedAt,
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
        logger.error('Error listing applications:', error);
        res.status(500).json({ success: false, error: getErrorMessage(error) });
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

        const defaultWorkflow = await workflowRepository.create({
            applicationId: application.id,
            userId,
            name: 'Default Workflow',
            description: 'Auto-created default workflow',
        });

        res.status(201).json({
            success: true,
            data: {
                id: application.id,
                userId: application.userId,
                name: application.name,
                description: application.description,
                baseUrl: application.baseUrl,
                projects: [],
                workflows: [{
                    id: defaultWorkflow.id,
                    applicationId: defaultWorkflow.applicationId,
                    userId: defaultWorkflow.userId,
                    name: defaultWorkflow.name,
                    description: defaultWorkflow.description,
                    createdAt: defaultWorkflow.createdAt,
                    updatedAt: defaultWorkflow.updatedAt,
                }],
                createdAt: application.createdAt
            }
        });
    } catch (error) {
        logger.error('Error creating application:', error);
        res.status(500).json({ success: false, error: getErrorMessage(error) });
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
        const workflows = await ensureDefaultWorkflow(id, application.userId);

        res.json({
            success: true,
            data: {
                id: application.id,
                userId: application.userId,
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
                    applicationId: w.applicationId,
                    userId: w.userId,
                    name: w.name,
                    description: w.description,
                    createdAt: w.createdAt,
                    updatedAt: w.updatedAt,
                })),
                createdAt: application.createdAt,
                updatedAt: application.updatedAt
            }
        });
    } catch (error) {
        logger.error('Error getting application:', error);
        res.status(500).json({ success: false, error: getErrorMessage(error) });
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
        logger.error('Error updating application:', error);
        res.status(500).json({ success: false, error: getErrorMessage(error) });
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
        logger.error('Error deleting application:', error);
        res.status(500).json({ success: false, error: getErrorMessage(error) });
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
        logger.error('Error listing projects:', error);
        res.status(500).json({ success: false, error: getErrorMessage(error) });
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
        logger.error('Error creating project:', error);
        res.status(500).json({ success: false, error: getErrorMessage(error) });
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
        logger.error('Error getting project:', error);
        res.status(500).json({ success: false, error: getErrorMessage(error) });
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
        logger.error('Error updating project:', error);
        res.status(500).json({ success: false, error: getErrorMessage(error) });
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
        logger.error('Error deleting project:', error);
        res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
});

// ============================================
// ENVIRONMENTS CRUD (nested under applications)
// ============================================

/**
 * GET /api/applications/:appId/environments
 * List all environments for the authenticated user (application scoped in API contract)
 */
router.get('/:appId/environments', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { appId } = req.params;

        const application = await applicationRepository.findById(appId);
        if (!application || application.userId !== userId) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const environments = await userEnvironmentRepository.findByUserId(userId);
        const data = await Promise.all(
            environments.map(async (env) => {
                const variables = await environmentVariableRepository.findByEnvironmentId(env.id);
                return mapEnvironment(appId, env, variables);
            })
        );

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('Error listing environments:', error);
        res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
});

/**
 * GET /api/applications/:appId/environments/active
 * Get active environment with unmasked values
 */
router.get('/:appId/environments/active', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { appId } = req.params;

        const application = await applicationRepository.findById(appId);
        if (!application || application.userId !== userId) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const activeEnvironment = await userEnvironmentRepository.findActiveByUserId(userId);
        if (!activeEnvironment) {
            return res.json({
                success: true,
                data: null
            });
        }

        const variables = await environmentVariableRepository.findByEnvironmentId(activeEnvironment.id);
        const variablesMap = variables.reduce<Record<string, string>>((acc, variable) => {
            acc[variable.key] = variable.value;
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                ...mapEnvironment(appId, activeEnvironment, variables),
                variablesMap
            }
        });
    } catch (error) {
        logger.error('Error getting active environment:', error);
        res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
});

/**
 * POST /api/applications/:appId/environments
 * Create a new environment
 */
router.post('/:appId/environments', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { appId } = req.params;
        const { name, variables } = req.body as {
            name?: string;
            variables?: Array<{ key: string; value?: string; isSecret?: boolean }>;
        };

        const application = await applicationRepository.findById(appId);
        if (!application || application.userId !== userId) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Environment name is required'
            });
        }

        const existingActive = await userEnvironmentRepository.findActiveByUserId(userId);
        const shouldActivate = !existingActive;
        if (shouldActivate) {
            await userEnvironmentRepository.deactivateAll(userId);
        }

        const environment = await userEnvironmentRepository.create({
            userId,
            name: name.trim(),
            isActive: shouldActivate
        });

        const inputVariables = Array.isArray(variables) ? variables : [];
        for (const variable of inputVariables) {
            if (!variable.key || !variable.key.trim()) {
                continue;
            }
            await environmentVariableRepository.upsert(environment.id, variable.key.trim(), {
                value: variable.value ?? '',
                type: 'string',
                sensitive: Boolean(variable.isSecret)
            });
        }

        const storedVariables = await environmentVariableRepository.findByEnvironmentId(environment.id);

        res.status(201).json({
            success: true,
            data: mapEnvironment(appId, environment, storedVariables)
        });
    } catch (error) {
        logger.error('Error creating environment:', error);
        res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
});

/**
 * PUT /api/applications/:appId/environments/:envId
 * Update environment metadata
 */
router.put('/:appId/environments/:envId', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { appId, envId } = req.params;
        const { name } = req.body as { name?: string };

        const application = await applicationRepository.findById(appId);
        if (!application || application.userId !== userId) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const existingEnvironment = await userEnvironmentRepository.findById(envId);
        if (!existingEnvironment || existingEnvironment.userId !== userId) {
            return res.status(404).json({
                success: false,
                error: 'Environment not found'
            });
        }

        const updatedEnvironment = await userEnvironmentRepository.update(envId, {
            name: name?.trim() || existingEnvironment.name
        });

        if (!updatedEnvironment) {
            return res.status(404).json({
                success: false,
                error: 'Environment not found'
            });
        }

        const variables = await environmentVariableRepository.findByEnvironmentId(envId);

        res.json({
            success: true,
            data: mapEnvironment(appId, updatedEnvironment, variables)
        });
    } catch (error) {
        logger.error('Error updating environment:', error);
        res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
});

/**
 * DELETE /api/applications/:appId/environments/:envId
 * Delete an environment
 */
router.delete('/:appId/environments/:envId', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { appId, envId } = req.params;

        const application = await applicationRepository.findById(appId);
        if (!application || application.userId !== userId) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const environment = await userEnvironmentRepository.findById(envId);
        if (!environment || environment.userId !== userId) {
            return res.status(404).json({
                success: false,
                error: 'Environment not found'
            });
        }

        await environmentVariableRepository.deleteByEnvironmentId(envId);
        await userEnvironmentRepository.delete(envId);

        if (environment.isActive) {
            const remaining = await userEnvironmentRepository.findByUserId(userId);
            if (remaining.length > 0) {
                await userEnvironmentRepository.update(remaining[0].id, { isActive: true });
            }
        }

        res.json({
            success: true,
            data: null
        });
    } catch (error) {
        logger.error('Error deleting environment:', error);
        res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
});

/**
 * POST /api/applications/:appId/environments/:envId/activate
 * Activate an environment
 */
router.post('/:appId/environments/:envId/activate', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { appId, envId } = req.params;

        const application = await applicationRepository.findById(appId);
        if (!application || application.userId !== userId) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const environment = await userEnvironmentRepository.findById(envId);
        if (!environment || environment.userId !== userId) {
            return res.status(404).json({
                success: false,
                error: 'Environment not found'
            });
        }

        await userEnvironmentRepository.deactivateAll(userId);
        const activated = await userEnvironmentRepository.update(envId, { isActive: true });
        if (!activated) {
            return res.status(404).json({
                success: false,
                error: 'Environment not found'
            });
        }

        const variables = await environmentVariableRepository.findByEnvironmentId(envId);

        res.json({
            success: true,
            data: mapEnvironment(appId, activated, variables)
        });
    } catch (error) {
        logger.error('Error activating environment:', error);
        res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
});

/**
 * POST /api/applications/:appId/environments/:envId/variables
 * Add a variable
 */
router.post('/:appId/environments/:envId/variables', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { appId, envId } = req.params;
        const { key, value, isSecret } = req.body as {
            key?: string;
            value?: string;
            isSecret?: boolean;
        };

        const application = await applicationRepository.findById(appId);
        if (!application || application.userId !== userId) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const environment = await userEnvironmentRepository.findById(envId);
        if (!environment || environment.userId !== userId) {
            return res.status(404).json({
                success: false,
                error: 'Environment not found'
            });
        }

        if (!key || !key.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Variable key is required'
            });
        }

        const stored = await environmentVariableRepository.upsert(envId, key.trim(), {
            value: value ?? '',
            type: 'string',
            sensitive: Boolean(isSecret)
        });

        res.status(201).json({
            success: true,
            data: mapEnvironmentVariable(stored)
        });
    } catch (error) {
        logger.error('Error adding environment variable:', error);
        res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
});

/**
 * PUT /api/applications/:appId/environments/:envId/variables/:varId
 * Update a variable
 */
router.put('/:appId/environments/:envId/variables/:varId', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { appId, envId, varId } = req.params;
        const { key, value, isSecret } = req.body as {
            key?: string;
            value?: string;
            isSecret?: boolean;
        };

        const application = await applicationRepository.findById(appId);
        if (!application || application.userId !== userId) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const environment = await userEnvironmentRepository.findById(envId);
        if (!environment || environment.userId !== userId) {
            return res.status(404).json({
                success: false,
                error: 'Environment not found'
            });
        }

        const variables = await environmentVariableRepository.findByEnvironmentId(envId);
        const existingVariable = variables.find((variable) => variable.id === varId);
        if (!existingVariable) {
            return res.status(404).json({
                success: false,
                error: 'Variable not found'
            });
        }

        const nextKey = key?.trim() || existingVariable.key;
        if (nextKey !== existingVariable.key) {
            await environmentVariableRepository.delete(envId, existingVariable.key);
        }

        const stored = await environmentVariableRepository.upsert(envId, nextKey, {
            value: value ?? existingVariable.value,
            type: existingVariable.type || 'string',
            sensitive: typeof isSecret === 'boolean' ? isSecret : existingVariable.sensitive
        });

        res.json({
            success: true,
            data: mapEnvironmentVariable(stored)
        });
    } catch (error) {
        logger.error('Error updating environment variable:', error);
        res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
});

/**
 * DELETE /api/applications/:appId/environments/:envId/variables/:varId
 * Delete a variable
 */
router.delete('/:appId/environments/:envId/variables/:varId', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { appId, envId, varId } = req.params;

        const application = await applicationRepository.findById(appId);
        if (!application || application.userId !== userId) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const environment = await userEnvironmentRepository.findById(envId);
        if (!environment || environment.userId !== userId) {
            return res.status(404).json({
                success: false,
                error: 'Environment not found'
            });
        }

        const variables = await environmentVariableRepository.findByEnvironmentId(envId);
        const existingVariable = variables.find((variable) => variable.id === varId);
        if (!existingVariable) {
            return res.status(404).json({
                success: false,
                error: 'Variable not found'
            });
        }

        await environmentVariableRepository.delete(envId, existingVariable.key);

        res.json({
            success: true,
            data: null
        });
    } catch (error) {
        logger.error('Error deleting environment variable:', error);
        res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
});

export default router;
