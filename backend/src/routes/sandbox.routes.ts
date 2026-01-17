import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as fs from 'fs/promises';
import * as path from 'path';
import { validate } from '../middleware/validate';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { sandboxService } from '../services/sandbox.service';
import { prisma } from '../db/prisma';

const VERO_PROJECTS_BASE = process.env.VERO_PROJECTS_PATH || path.join(process.cwd(), 'vero-projects');

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/projects/:projectId/sandboxes
 * List all sandboxes for a project
 */
router.get(
  '/projects/:projectId/sandboxes',
  validate([
    param('projectId').isUUID(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const sandboxes = await sandboxService.listByProject(req.params.projectId);
      res.json({ success: true, data: { sandboxes } });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/projects/:projectId/sandboxes
 * Create a new sandbox in a project
 */
router.post(
  '/projects/:projectId/sandboxes',
  validate([
    param('projectId').isUUID(),
    body('name').isString().trim().notEmpty().isLength({ min: 1, max: 100 }),
    body('description').optional().isString().trim().isLength({ max: 500 }),
    body('sourceBranch').optional().isIn(['dev', 'master']),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const sandbox = await sandboxService.create(req.userId!, req.params.projectId, {
        name: req.body.name,
        description: req.body.description,
        sourceBranch: req.body.sourceBranch,
      });

      // Emit WebSocket event
      const io = req.app.get('io');
      if (io) {
        io.to(`project:${req.params.projectId}`).emit('sandbox:created', { sandbox });
      }

      res.status(201).json({ success: true, data: { sandbox } });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/sandboxes
 * List sandboxes owned by current user
 */
router.get(
  '/sandboxes',
  async (req: AuthRequest, res, next) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const sandboxes = await sandboxService.listByUser(req.userId!, projectId);
      res.json({ sandboxes });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/sandboxes/:id
 * Get sandbox details
 */
router.get(
  '/sandboxes/:id',
  validate([
    param('id').isUUID(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      // Check access permission
      const canAccess = await sandboxService.canAccess(req.params.id, req.userId!);
      if (!canAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const sandbox = await sandboxService.getById(req.params.id);
      if (!sandbox) {
        return res.status(404).json({ error: 'Sandbox not found' });
      }

      res.json({ sandbox });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/sandboxes/:id
 * Delete a sandbox
 */
router.delete(
  '/sandboxes/:id',
  validate([
    param('id').isUUID(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const sandbox = await sandboxService.getById(req.params.id);
      if (!sandbox) {
        return res.status(404).json({ error: 'Sandbox not found' });
      }

      const forceDelete = req.query.force === 'true';
      await sandboxService.delete(req.params.id, req.userId!, forceDelete);

      // Emit WebSocket event
      const io = req.app.get('io');
      if (io) {
        io.to(`project:${sandbox.projectId}`).emit('sandbox:deleted', {
          sandboxId: req.params.id,
        });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/sandboxes/:id/archive
 * Archive a sandbox (soft delete)
 */
router.post(
  '/sandboxes/:id/archive',
  validate([
    param('id').isUUID(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const sandbox = await sandboxService.archive(req.params.id, req.userId!);

      // Emit WebSocket event
      const io = req.app.get('io');
      if (io) {
        io.to(`project:${sandbox.projectId}`).emit('sandbox:archived', { sandbox });
      }

      res.json({ sandbox });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/sandboxes/:id/sync
 * Sync sandbox with source branch (pull latest changes from dev/master)
 */
router.post(
  '/sandboxes/:id/sync',
  validate([
    param('id').isUUID(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await sandboxService.sync(req.params.id, req.userId!);

      if (!result.success && result.conflicts) {
        return res.status(409).json({
          success: false,
          conflicts: result.conflicts,
          message: 'Merge conflicts detected. Please resolve them manually.',
        });
      }

      const sandbox = await sandboxService.getById(req.params.id);

      // Emit WebSocket event
      const io = req.app.get('io');
      if (io && sandbox) {
        io.to(`project:${sandbox.projectId}`).emit('sandbox:synced', {
          sandboxId: req.params.id,
          success: result.success,
          conflicts: result.conflicts,
        });
      }

      res.json({
        success: true,
        sandbox,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/sandboxes/:id/sync-with-details
 * Sync sandbox with detailed conflict information for three-way merge resolution
 */
router.post(
  '/sandboxes/:id/sync-with-details',
  validate([
    param('id').isUUID(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await sandboxService.syncWithDetails(req.params.id, req.userId!);

      // Emit WebSocket event
      const io = req.app.get('io');
      if (io) {
        const sandbox = await sandboxService.getById(req.params.id);
        if (sandbox) {
          io.to(`project:${sandbox.projectId}`).emit('sandbox:sync-started', {
            sandboxId: req.params.id,
            hasConflicts: result.hasConflicts,
          });
        }
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/sandboxes/:id/resolve-conflicts
 * Apply resolved conflicts and complete the sync
 */
router.post(
  '/sandboxes/:id/resolve-conflicts',
  validate([
    param('id').isUUID(),
    body('resolutions').isObject().notEmpty(),
    body('autoMergeClean').optional().isBoolean(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const { resolutions, autoMergeClean = true } = req.body;

      const result = await sandboxService.resolveConflicts(
        req.params.id,
        req.userId!,
        resolutions,
        autoMergeClean
      );

      // Emit WebSocket event
      const io = req.app.get('io');
      if (io) {
        io.to(`project:${result.sandbox.projectId}`).emit('sandbox:conflicts-resolved', {
          sandboxId: req.params.id,
          updatedFiles: result.updatedFiles,
        });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/projects/:projectId/compare
 * Compare a file between two environments (folder-based)
 * Query params:
 *   - source: 'dev' | 'master' | 'sandbox:{sandboxId}'
 *   - target: 'dev' | 'master' | 'sandbox:{sandboxId}'
 *   - file: file path relative to environment root (e.g., 'Pages/LoginPage.vero')
 */
router.get(
  '/projects/:projectId/compare',
  validate([
    param('projectId').isString().notEmpty(),
    query('source').isString().notEmpty(),
    query('target').isString().notEmpty(),
    query('file').isString().notEmpty(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const { projectId } = req.params;
      const { source, target, file } = req.query as { source: string; target: string; file: string };

      // Get project info
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { application: true },
      });

      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      const projectPath = project.veroPath ||
        path.join(VERO_PROJECTS_BASE, project.application.id, project.id);

      // Helper to resolve environment to folder path
      const resolveEnvFolder = async (env: string): Promise<string> => {
        if (env === 'dev' || env === 'master') {
          return env;
        }
        if (env.startsWith('sandbox:')) {
          const sandboxId = env.replace('sandbox:', '');
          const sandbox = await prisma.sandbox.findUnique({ where: { id: sandboxId } });
          if (!sandbox) {
            throw new Error(`Sandbox ${sandboxId} not found`);
          }
          return sandbox.folderPath; // e.g., 'sandboxes/my-sandbox'
        }
        throw new Error(`Invalid environment: ${env}`);
      };

      const [sourceFolder, targetFolder] = await Promise.all([
        resolveEnvFolder(source),
        resolveEnvFolder(target),
      ]);

      // Extract relative file path from full path if needed
      // The file parameter might be:
      //   - A relative path: "Features/example.vero"
      //   - A full path: "/Users/.../projectPath/sandboxes/login-/Features/example.vero"
      let relativeFilePath = file;

      // If file starts with projectPath, strip it
      if (file.startsWith(projectPath)) {
        relativeFilePath = file.substring(projectPath.length);
        // Remove leading slash
        if (relativeFilePath.startsWith('/')) {
          relativeFilePath = relativeFilePath.substring(1);
        }
      }

      // Strip environment folder prefix (dev/, master/, sandboxes/xxx/)
      const envPrefixes = ['dev/', 'master/'];
      for (const prefix of envPrefixes) {
        if (relativeFilePath.startsWith(prefix)) {
          relativeFilePath = relativeFilePath.substring(prefix.length);
          break;
        }
      }
      // Also handle sandboxes/xxx/ prefix
      const sandboxMatch = relativeFilePath.match(/^sandboxes\/[^/]+\//);
      if (sandboxMatch) {
        relativeFilePath = relativeFilePath.substring(sandboxMatch[0].length);
      }

      // Build full file paths using the cleaned relative path
      const sourceFilePath = path.join(projectPath, sourceFolder, relativeFilePath);
      const targetFilePath = path.join(projectPath, targetFolder, relativeFilePath);

      console.log('[Compare] Paths:', {
        originalFile: file,
        relativeFilePath,
        projectPath,
        sourceFolder,
        targetFolder,
        sourceFilePath,
        targetFilePath,
      });

      // Read file contents
      let sourceContent: string | null = null;
      let targetContent: string | null = null;
      let sourceExists = false;
      let targetExists = false;

      try {
        sourceContent = await fs.readFile(sourceFilePath, 'utf-8');
        sourceExists = true;
      } catch {
        sourceContent = null;
      }

      try {
        targetContent = await fs.readFile(targetFilePath, 'utf-8');
        targetExists = true;
      } catch {
        targetContent = null;
      }

      // Generate simple diff (line-by-line comparison)
      const diff = generateLineDiff(sourceContent, targetContent, file);

      res.json({
        success: true,
        data: {
          source: {
            branch: sourceFolder,
            environment: source,
            content: sourceContent,
            exists: sourceExists,
          },
          target: {
            branch: targetFolder,
            environment: target,
            content: targetContent,
            exists: targetExists,
          },
          diff,
          filePath: relativeFilePath,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Generate a simple line-by-line diff between two file contents
 */
function generateLineDiff(
  sourceContent: string | null,
  targetContent: string | null,
  filePath: string
): { filePath: string; hunks: any[] } {
  if (!sourceContent && !targetContent) {
    return { filePath, hunks: [] };
  }

  const sourceLines = sourceContent?.split('\n') || [];
  const targetLines = targetContent?.split('\n') || [];
  const hunks: any[] = [];

  // Simple diff algorithm - finds changed regions
  let i = 0;
  let j = 0;
  let currentHunk: any = null;

  const startHunk = (oldStart: number, newStart: number) => {
    currentHunk = {
      oldStart,
      oldLines: 0,
      newStart,
      newLines: 0,
      lines: [],
    };
  };

  const closeHunk = () => {
    if (currentHunk && currentHunk.lines.length > 0) {
      hunks.push(currentHunk);
    }
    currentHunk = null;
  };

  while (i < sourceLines.length || j < targetLines.length) {
    if (i >= sourceLines.length) {
      // Remaining lines are additions
      if (!currentHunk) startHunk(i + 1, j + 1);
      currentHunk.lines.push({
        type: 'add',
        content: targetLines[j],
        newLineNumber: j + 1,
      });
      currentHunk.newLines++;
      j++;
    } else if (j >= targetLines.length) {
      // Remaining lines are deletions
      if (!currentHunk) startHunk(i + 1, j + 1);
      currentHunk.lines.push({
        type: 'delete',
        content: sourceLines[i],
        oldLineNumber: i + 1,
      });
      currentHunk.oldLines++;
      i++;
    } else if (sourceLines[i] === targetLines[j]) {
      // Lines match - close current hunk and add context
      if (currentHunk) {
        // Add one line of trailing context
        currentHunk.lines.push({
          type: 'context',
          content: sourceLines[i],
          oldLineNumber: i + 1,
          newLineNumber: j + 1,
        });
        currentHunk.oldLines++;
        currentHunk.newLines++;
        closeHunk();
      }
      i++;
      j++;
    } else {
      // Lines differ
      if (!currentHunk) startHunk(i + 1, j + 1);

      // Check if source line was deleted or modified
      const sourceLineInTarget = targetLines.indexOf(sourceLines[i], j);
      const targetLineInSource = sourceLines.indexOf(targetLines[j], i);

      if (sourceLineInTarget === -1 || (targetLineInSource !== -1 && targetLineInSource < sourceLineInTarget)) {
        // Line was deleted from source
        currentHunk.lines.push({
          type: 'delete',
          content: sourceLines[i],
          oldLineNumber: i + 1,
        });
        currentHunk.oldLines++;
        i++;
      } else {
        // Line was added to target
        currentHunk.lines.push({
          type: 'add',
          content: targetLines[j],
          newLineNumber: j + 1,
        });
        currentHunk.newLines++;
        j++;
      }
    }
  }

  closeHunk();

  return { filePath, hunks };
}

/**
 * GET /api/compare/:projectId/environments
 * List available environments (folders + sandboxes) for comparison
 */
router.get(
  '/compare/:projectId/environments',
  validate([
    param('projectId').isString().notEmpty(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const { projectId } = req.params;

      // Try to find in Project table first, then Application table
      // This handles both nested project IDs and application IDs
      let resolvedProjectId = projectId;

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, applicationId: true },
      });

      if (!project) {
        // Check if ID is for an Application instead
        const application = await prisma.application.findUnique({
          where: { id: projectId },
          include: { projects: { take: 1, select: { id: true } } },
        });

        if (!application) {
          return res.status(404).json({ error: 'Project or Application not found' });
        }

        // Use the first project under this application if available
        if (application.projects.length > 0) {
          resolvedProjectId = application.projects[0].id;
        }
      } else {
        resolvedProjectId = project.id;
      }

      // Base environments: master (production) and dev (development)
      const environments: any[] = [
        { id: 'master', name: 'Production', type: 'folder', branch: 'master', icon: 'green' },
        { id: 'dev', name: 'Development', type: 'folder', branch: 'dev', icon: 'blue' },
      ];

      // Get sandboxes for this project
      const sandboxes = await prisma.sandbox.findMany({
        where: {
          projectId: resolvedProjectId,
          status: 'active',
        },
        include: {
          owner: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Add sandboxes to environments
      for (const sandbox of sandboxes) {
        environments.push({
          id: `sandbox:${sandbox.id}`,
          name: sandbox.name,
          type: 'sandbox',
          branch: sandbox.folderPath,
          icon: 'purple',
          owner: sandbox.owner.name || sandbox.owner.email,
        });
      }

      res.json({ success: true, data: { environments } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
