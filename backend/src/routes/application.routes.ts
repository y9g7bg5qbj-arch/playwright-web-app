/**
 * Application Management API Routes
 *
 * Provides endpoints for managing applications, which are top-level containers
 * for projects, test data, and workflows.
 */

import { Router, Response } from 'express';
import { prisma } from '../db/prisma';
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

        // Get applications owned by user OR where user is a member
        const applications = await prisma.application.findMany({
            where: {
                OR: [
                    { userId },
                    { members: { some: { userId } } }
                ]
            },
            include: {
                _count: {
                    select: {
                        projects: true,
                        workflows: true,
                        members: true
                    }
                },
                members: {
                    where: { userId },
                    select: { role: true }
                },
                projects: {
                    orderBy: { name: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        veroPath: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        res.json({
            success: true,
            data: applications.map(app => ({
                id: app.id,
                name: app.name,
                description: app.description,
                isOwner: app.userId === userId,
                role: app.userId === userId ? 'owner' : (app.members[0]?.role || 'viewer'),
                projectCount: app._count.projects,
                workflowCount: app._count.workflows,
                memberCount: app._count.members + 1, // +1 for owner
                projects: app.projects,
                createdAt: app.createdAt,
                updatedAt: app.updatedAt
            }))
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
        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Application name is required'
            });
        }

        // Create the application
        const application = await prisma.application.create({
            data: {
                userId,
                name: name.trim(),
                description: description?.trim() || null
            }
        });

        res.status(201).json({
            success: true,
            data: {
                id: application.id,
                name: application.name,
                description: application.description,
                projects: [],
                createdAt: application.createdAt
            }
        });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                error: 'An application with this name already exists'
            });
        }
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

        const application = await prisma.application.findUnique({
            where: { id },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                },
                projects: {
                    orderBy: { name: 'asc' }
                },
                _count: {
                    select: { workflows: true }
                }
            }
        });

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        // Check access
        const isMember = application.members.some(m => m.userId === userId);
        if (application.userId !== userId && !isMember) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: {
                id: application.id,
                name: application.name,
                description: application.description,
                isOwner: application.userId === userId,
                role: application.userId === userId ? 'owner' : (application.members.find(m => m.userId === userId)?.role || 'viewer'),
                members: application.members.map(m => ({
                    id: m.id,
                    userId: m.userId,
                    name: m.user.name,
                    email: m.user.email,
                    role: m.role
                })),
                projects: application.projects,
                workflowCount: application._count.workflows,
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
        const { name, description } = req.body;

        // Check ownership
        const existing = await prisma.application.findUnique({
            where: { id }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        if (existing.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Only application owner can update the application'
            });
        }

        const application = await prisma.application.update({
            where: { id },
            data: {
                name: name?.trim() || existing.name,
                description: description?.trim() ?? existing.description
            }
        });

        res.json({
            success: true,
            data: {
                id: application.id,
                name: application.name,
                description: application.description,
                updatedAt: application.updatedAt
            }
        });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                error: 'An application with this name already exists'
            });
        }
        console.error('Error updating application:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/applications/:id/duplicate
 * Duplicate an application with all its projects and files
 */
router.post('/:id/duplicate', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'New application name is required'
            });
        }

        // Check access to source application
        const sourceApp = await prisma.application.findUnique({
            where: { id },
            include: {
                members: { where: { userId } },
                projects: true
            }
        });

        if (!sourceApp) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const isMember = sourceApp.members.length > 0;
        if (sourceApp.userId !== userId && !isMember) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        // Import file system utilities
        const { join } = await import('path');
        const { mkdir, readdir, copyFile, stat } = await import('fs/promises');
        const VERO_PROJECTS_BASE = process.env.VERO_PROJECTS_BASE || join(process.cwd(), '..', 'vero-projects');

        // Helper to recursively copy directory contents
        const copyDirectory = async (srcDir: string, destDir: string) => {
            try {
                await mkdir(destDir, { recursive: true });
                const entries = await readdir(srcDir, { withFileTypes: true });

                for (const entry of entries) {
                    const srcPath = join(srcDir, entry.name);
                    const destPath = join(destDir, entry.name);

                    if (entry.isDirectory()) {
                        await copyDirectory(srcPath, destPath);
                    } else if (entry.isFile()) {
                        await copyFile(srcPath, destPath);
                    }
                }
            } catch (err) {
                console.warn(`Could not copy from ${srcDir}:`, err);
            }
        };

        // Create new application
        const newApp = await prisma.application.create({
            data: {
                userId,
                name: name.trim(),
                description: sourceApp.description ? `Duplicated from ${sourceApp.name}` : null
            }
        });

        // Duplicate each project
        const newProjects = [];
        for (const sourceProject of sourceApp.projects) {
            // Create new project
            const newProject = await prisma.project.create({
                data: {
                    applicationId: newApp.id,
                    name: sourceProject.name,
                    description: sourceProject.description,
                    veroPath: '' // Temporary
                }
            });

            // Set up file path
            const newVeroPath = join(VERO_PROJECTS_BASE, newApp.id, newProject.id);

            // Update project with correct veroPath
            await prisma.project.update({
                where: { id: newProject.id },
                data: { veroPath: newVeroPath }
            });

            // Copy files from source project
            if (sourceProject.veroPath) {
                try {
                    await copyDirectory(sourceProject.veroPath, newVeroPath);
                } catch (err) {
                    console.warn(`Could not copy project files from ${sourceProject.veroPath}:`, err);
                }
            }

            newProjects.push({ ...newProject, veroPath: newVeroPath });
        }

        res.status(201).json({
            success: true,
            data: {
                id: newApp.id,
                name: newApp.name,
                description: newApp.description,
                projects: newProjects,
                createdAt: newApp.createdAt
            }
        });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                error: 'An application with this name already exists'
            });
        }
        console.error('Error duplicating application:', error);
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

        // Check ownership
        const existing = await prisma.application.findUnique({
            where: { id }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        if (existing.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Only application owner can delete the application'
            });
        }

        await prisma.application.delete({
            where: { id }
        });

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
// APPLICATION MEMBERS
// ============================================

/**
 * POST /api/applications/:id/members
 * Add a member to an application
 */
router.post('/:id/members', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;
        const { email, role = 'viewer' } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        // Check ownership
        const application = await prisma.application.findUnique({
            where: { id }
        });

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        if (application.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Only application owner can add members'
            });
        }

        // Find user by email
        const targetUser = await prisma.user.findUnique({
            where: { email }
        });

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found with this email'
            });
        }

        if (targetUser.id === userId) {
            return res.status(400).json({
                success: false,
                error: 'Cannot add yourself as a member'
            });
        }

        // Add member
        const member = await prisma.applicationMember.create({
            data: {
                applicationId: id,
                userId: targetUser.id,
                role: role
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        res.status(201).json({
            success: true,
            data: {
                id: member.id,
                userId: member.userId,
                name: member.user.name,
                email: member.user.email,
                role: member.role
            }
        });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                error: 'User is already a member of this application'
            });
        }
        console.error('Error adding member:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * DELETE /api/applications/:id/members/:memberId
 * Remove a member from an application
 */
router.delete('/:id/members/:memberId', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { id, memberId } = req.params;

        // Check ownership
        const application = await prisma.application.findUnique({
            where: { id }
        });

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        if (application.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Only application owner can remove members'
            });
        }

        await prisma.applicationMember.delete({
            where: { id: memberId }
        });

        res.json({
            success: true,
            message: 'Member removed successfully'
        });
    } catch (error) {
        console.error('Error removing member:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ============================================
// PROJECT MANAGEMENT (nested under application)
// ============================================

/**
 * GET /api/applications/:id/projects
 * List all projects in an application
 */
router.get('/:id/projects', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;

        // Check access
        const application = await prisma.application.findUnique({
            where: { id },
            include: {
                members: { where: { userId } }
            }
        });

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const isMember = application.members.length > 0;
        if (application.userId !== userId && !isMember) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const projects = await prisma.project.findMany({
            where: { applicationId: id },
            orderBy: { name: 'asc' }
        });

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
 * POST /api/applications/:id/projects
 * Create a new project in an application
 * Supports optional duplication from an existing project
 */
router.post('/:id/projects', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;
        const { name, description, duplicateFromId } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Project name is required'
            });
        }

        // Check access
        const application = await prisma.application.findUnique({
            where: { id },
            include: {
                members: { where: { userId, role: { in: ['owner', 'editor'] } } }
            }
        });

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const canEdit = application.userId === userId || application.members.length > 0;
        if (!canEdit) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        // Import file system utilities
        const { join } = await import('path');
        const { mkdir, readdir, copyFile } = await import('fs/promises');
        const VERO_PROJECTS_BASE = process.env.VERO_PROJECTS_BASE || join(process.cwd(), '..', 'vero-projects');

        // If duplicating, get the source project
        let sourceProject = null;
        if (duplicateFromId) {
            sourceProject = await prisma.project.findUnique({
                where: { id: duplicateFromId }
            });
            if (!sourceProject || sourceProject.applicationId !== id) {
                return res.status(404).json({
                    success: false,
                    error: 'Source project not found or not in this application'
                });
            }
        }

        // Create the project first to get its unique ID
        const project = await prisma.project.create({
            data: {
                applicationId: id,
                name: name.trim(),
                description: description?.trim() || (sourceProject ? `Duplicated from ${sourceProject.name}` : null),
                veroPath: '' // Temporary, will update below
            }
        });

        // Now create the folder path using the project's unique ID
        const veroPath = join(VERO_PROJECTS_BASE, id, project.id);

        // Update the project with the correct veroPath
        await prisma.project.update({
            where: { id: project.id },
            data: { veroPath }
        });

        // Helper function to recursively copy directory contents
        const copyDirectory = async (srcDir: string, destDir: string) => {
            try {
                await mkdir(destDir, { recursive: true });
                const entries = await readdir(srcDir, { withFileTypes: true });

                for (const entry of entries) {
                    const srcPath = join(srcDir, entry.name);
                    const destPath = join(destDir, entry.name);

                    if (entry.isDirectory()) {
                        await copyDirectory(srcPath, destPath);
                    } else if (entry.isFile()) {
                        await copyFile(srcPath, destPath);
                    }
                }
            } catch (err) {
                // Directory might not exist, that's ok
                console.warn(`Could not copy from ${srcDir}:`, err);
            }
        };

        // Create project folder structure with environments (master/dev/sandboxes)
        try {
            const { writeFile } = await import('fs/promises');

            // Example file contents
            const examplePageContent = `# Example Page Object
# Define page elements with FIELD definitions

PAGE LoginPage
  URL "/login"

  FIELD usernameInput
    SELECTOR input[name="username"]
    TYPE text
  END

  FIELD passwordInput
    SELECTOR input[name="password"]
    TYPE password
  END

  FIELD submitButton
    SELECTOR button[type="submit"]
    TYPE button
  END

  ACTION login(username, password)
    fill usernameInput with username
    fill passwordInput with password
    click submitButton
  END
END
`;

            const exampleFeatureContent = `# Example Feature Test
# Write your test scenarios using FEATURE/SCENARIO syntax

@testId("TC001")
FEATURE "User Authentication"

  SCENARIO "User can login with valid credentials"
    navigate to "https://example.com/login"
    fill "Username" with "testuser"
    fill "Password" with "password123"
    click "Login" button
    assert "Dashboard" is visible
  END

  SCENARIO "User sees error with invalid credentials"
    navigate to "https://example.com/login"
    fill "Username" with "invalid"
    fill "Password" with "wrong"
    click "Login" button
    assert "Invalid credentials" is visible
  END

END
`;

            const exampleDataContent = `# Example Test Data
# Define test data for data-driven testing

DATA LoginCredentials
  ROW valid_user
    username: "testuser"
    password: "password123"
    expected: "success"
  END

  ROW invalid_user
    username: "invalid"
    password: "wrong"
    expected: "error"
  END
END
`;

            if (sourceProject && sourceProject.veroPath) {
                // Duplicate files from source project
                await copyDirectory(sourceProject.veroPath, veroPath);
            } else {
                // Create environment-based folder structure
                // Master environment (production - stable code)
                await mkdir(join(veroPath, 'master', 'Pages'), { recursive: true });
                await mkdir(join(veroPath, 'master', 'Features'), { recursive: true });
                await mkdir(join(veroPath, 'master', 'Data'), { recursive: true });
                await writeFile(join(veroPath, 'master', 'Pages', 'example.vero'), examplePageContent);
                await writeFile(join(veroPath, 'master', 'Features', 'example.vero'), exampleFeatureContent);
                await writeFile(join(veroPath, 'master', 'Data', 'example.vero'), exampleDataContent);

                // Dev environment (development/integration)
                await mkdir(join(veroPath, 'dev', 'Pages'), { recursive: true });
                await mkdir(join(veroPath, 'dev', 'Features'), { recursive: true });
                await mkdir(join(veroPath, 'dev', 'Data'), { recursive: true });
                await writeFile(join(veroPath, 'dev', 'Pages', 'example.vero'), examplePageContent);
                await writeFile(join(veroPath, 'dev', 'Features', 'example.vero'), exampleFeatureContent);
                await writeFile(join(veroPath, 'dev', 'Data', 'example.vero'), exampleDataContent);

                // Sandboxes folder (user-specific isolated environments)
                await mkdir(join(veroPath, 'sandboxes'), { recursive: true });
            }
        } catch (fsError) {
            console.warn('Could not create/copy project folders:', fsError);
        }

        res.status(201).json({
            success: true,
            data: { ...project, veroPath } // Include updated veroPath
        });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                error: 'A project with this name already exists in this application'
            });
        }
        console.error('Error creating project:', error);
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
        const { name, description } = req.body;

        // Check access
        const application = await prisma.application.findUnique({
            where: { id: appId },
            include: {
                members: { where: { userId, role: { in: ['owner', 'editor'] } } }
            }
        });

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const canEdit = application.userId === userId || application.members.length > 0;
        if (!canEdit) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const existing = await prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!existing || existing.applicationId !== appId) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        const project = await prisma.project.update({
            where: { id: projectId },
            data: {
                name: name?.trim() || existing.name,
                description: description?.trim() ?? existing.description
            }
        });

        res.json({
            success: true,
            data: project
        });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                error: 'A project with this name already exists in this application'
            });
        }
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

        // Check ownership (only app owner can delete projects)
        const application = await prisma.application.findUnique({
            where: { id: appId }
        });

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        if (application.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Only application owner can delete projects'
            });
        }

        const project = await prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!project || project.applicationId !== appId) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        await prisma.project.delete({
            where: { id: projectId }
        });

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

// ============================================
// APPLICATION ENVIRONMENTS (Postman-style)
// ============================================

/**
 * GET /api/applications/:appId/environments
 * List all environments for an application
 */
router.get('/:appId/environments', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { appId } = req.params;

        // Check access
        const application = await prisma.application.findUnique({
            where: { id: appId },
            include: { members: { where: { userId } } }
        });

        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const hasAccess = application.userId === userId || application.members.length > 0;
        if (!hasAccess) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const environments = await prisma.appEnvironment.findMany({
            where: { applicationId: appId },
            include: {
                variables: {
                    orderBy: { key: 'asc' }
                }
            },
            orderBy: { name: 'asc' }
        });

        res.json({
            success: true,
            data: environments.map(env => ({
                ...env,
                variables: env.variables.map(v => ({
                    ...v,
                    value: v.isSecret ? '••••••••' : v.value // Mask secrets
                }))
            }))
        });
    } catch (error) {
        console.error('Error listing environments:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/applications/:appId/environments/active
 * Get the active environment with all variables (unmasked for execution)
 */
router.get('/:appId/environments/active', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { appId } = req.params;

        // Check access
        const application = await prisma.application.findUnique({
            where: { id: appId },
            include: { members: { where: { userId } } }
        });

        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const hasAccess = application.userId === userId || application.members.length > 0;
        if (!hasAccess) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const activeEnv = await prisma.appEnvironment.findFirst({
            where: { applicationId: appId, isActive: true },
            include: {
                variables: { orderBy: { key: 'asc' } }
            }
        });

        if (!activeEnv) {
            return res.json({ success: true, data: null });
        }

        // Return unmasked values for execution
        res.json({
            success: true,
            data: {
                ...activeEnv,
                // Convert to key-value object for easy consumption
                variablesMap: activeEnv.variables.reduce((acc, v) => {
                    acc[v.key] = v.value;
                    return acc;
                }, {} as Record<string, string>)
            }
        });
    } catch (error) {
        console.error('Error getting active environment:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
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
        const { name, variables = [] } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Environment name is required' });
        }

        // Check access
        const application = await prisma.application.findUnique({
            where: { id: appId },
            include: { members: { where: { userId, role: { in: ['owner', 'editor'] } } } }
        });

        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const canEdit = application.userId === userId || application.members.length > 0;
        if (!canEdit) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        // Check if this will be the first environment (make it active by default)
        const existingCount = await prisma.appEnvironment.count({
            where: { applicationId: appId }
        });

        const environment = await prisma.appEnvironment.create({
            data: {
                applicationId: appId,
                name: name.trim(),
                isActive: existingCount === 0, // First environment is active by default
                variables: {
                    create: variables.map((v: { key: string; value: string; isSecret?: boolean }) => ({
                        key: v.key,
                        value: v.value,
                        isSecret: v.isSecret || false
                    }))
                }
            },
            include: {
                variables: { orderBy: { key: 'asc' } }
            }
        });

        res.status(201).json({ success: true, data: environment });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                error: 'An environment with this name already exists'
            });
        }
        console.error('Error creating environment:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /api/applications/:appId/environments/:envId
 * Update an environment (name only, use activate endpoint for isActive)
 */
router.put('/:appId/environments/:envId', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { appId, envId } = req.params;
        const { name } = req.body;

        // Check access
        const application = await prisma.application.findUnique({
            where: { id: appId },
            include: { members: { where: { userId, role: { in: ['owner', 'editor'] } } } }
        });

        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const canEdit = application.userId === userId || application.members.length > 0;
        if (!canEdit) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const existing = await prisma.appEnvironment.findUnique({ where: { id: envId } });
        if (!existing || existing.applicationId !== appId) {
            return res.status(404).json({ success: false, error: 'Environment not found' });
        }

        const environment = await prisma.appEnvironment.update({
            where: { id: envId },
            data: { name: name?.trim() || existing.name },
            include: { variables: { orderBy: { key: 'asc' } } }
        });

        res.json({ success: true, data: environment });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                error: 'An environment with this name already exists'
            });
        }
        console.error('Error updating environment:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
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

        // Check access
        const application = await prisma.application.findUnique({
            where: { id: appId },
            include: { members: { where: { userId, role: { in: ['owner', 'editor'] } } } }
        });

        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const canEdit = application.userId === userId || application.members.length > 0;
        if (!canEdit) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const existing = await prisma.appEnvironment.findUnique({ where: { id: envId } });
        if (!existing || existing.applicationId !== appId) {
            return res.status(404).json({ success: false, error: 'Environment not found' });
        }

        await prisma.appEnvironment.delete({ where: { id: envId } });

        // If deleted env was active, make another one active
        if (existing.isActive) {
            const firstEnv = await prisma.appEnvironment.findFirst({
                where: { applicationId: appId },
                orderBy: { name: 'asc' }
            });
            if (firstEnv) {
                await prisma.appEnvironment.update({
                    where: { id: firstEnv.id },
                    data: { isActive: true }
                });
            }
        }

        res.json({ success: true, message: 'Environment deleted successfully' });
    } catch (error) {
        console.error('Error deleting environment:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/applications/:appId/environments/:envId/activate
 * Set an environment as active (deactivates others)
 */
router.post('/:appId/environments/:envId/activate', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { appId, envId } = req.params;

        // Check access
        const application = await prisma.application.findUnique({
            where: { id: appId },
            include: { members: { where: { userId } } }
        });

        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const hasAccess = application.userId === userId || application.members.length > 0;
        if (!hasAccess) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const existing = await prisma.appEnvironment.findUnique({ where: { id: envId } });
        if (!existing || existing.applicationId !== appId) {
            return res.status(404).json({ success: false, error: 'Environment not found' });
        }

        // Deactivate all environments for this app, then activate the selected one
        await prisma.$transaction([
            prisma.appEnvironment.updateMany({
                where: { applicationId: appId },
                data: { isActive: false }
            }),
            prisma.appEnvironment.update({
                where: { id: envId },
                data: { isActive: true }
            })
        ]);

        const environment = await prisma.appEnvironment.findUnique({
            where: { id: envId },
            include: { variables: { orderBy: { key: 'asc' } } }
        });

        res.json({ success: true, data: environment });
    } catch (error) {
        console.error('Error activating environment:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/applications/:appId/environments/:envId/variables
 * Add a variable to an environment
 */
router.post('/:appId/environments/:envId/variables', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { appId, envId } = req.params;
        const { key, value, isSecret = false } = req.body;

        if (!key || !key.trim()) {
            return res.status(400).json({ success: false, error: 'Variable key is required' });
        }

        // Check access
        const application = await prisma.application.findUnique({
            where: { id: appId },
            include: { members: { where: { userId, role: { in: ['owner', 'editor'] } } } }
        });

        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const canEdit = application.userId === userId || application.members.length > 0;
        if (!canEdit) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const existing = await prisma.appEnvironment.findUnique({ where: { id: envId } });
        if (!existing || existing.applicationId !== appId) {
            return res.status(404).json({ success: false, error: 'Environment not found' });
        }

        const variable = await prisma.appEnvVariable.create({
            data: {
                environmentId: envId,
                key: key.trim(),
                value: value || '',
                isSecret
            }
        });

        res.status(201).json({ success: true, data: variable });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                error: 'A variable with this key already exists in this environment'
            });
        }
        console.error('Error adding variable:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
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
        const { key, value, isSecret } = req.body;

        // Check access
        const application = await prisma.application.findUnique({
            where: { id: appId },
            include: { members: { where: { userId, role: { in: ['owner', 'editor'] } } } }
        });

        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const canEdit = application.userId === userId || application.members.length > 0;
        if (!canEdit) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const existing = await prisma.appEnvVariable.findUnique({ where: { id: varId } });
        if (!existing || existing.environmentId !== envId) {
            return res.status(404).json({ success: false, error: 'Variable not found' });
        }

        const variable = await prisma.appEnvVariable.update({
            where: { id: varId },
            data: {
                key: key?.trim() || existing.key,
                value: value !== undefined ? value : existing.value,
                isSecret: isSecret !== undefined ? isSecret : existing.isSecret
            }
        });

        res.json({ success: true, data: variable });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                error: 'A variable with this key already exists in this environment'
            });
        }
        console.error('Error updating variable:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
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

        // Check access
        const application = await prisma.application.findUnique({
            where: { id: appId },
            include: { members: { where: { userId, role: { in: ['owner', 'editor'] } } } }
        });

        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const canEdit = application.userId === userId || application.members.length > 0;
        if (!canEdit) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const existing = await prisma.appEnvVariable.findUnique({ where: { id: varId } });
        if (!existing || existing.environmentId !== envId) {
            return res.status(404).json({ success: false, error: 'Variable not found' });
        }

        await prisma.appEnvVariable.delete({ where: { id: varId } });

        res.json({ success: true, message: 'Variable deleted successfully' });
    } catch (error) {
        console.error('Error deleting variable:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
