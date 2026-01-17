import { prisma } from '../db/prisma';
import * as path from 'path';
import * as fs from 'fs/promises';
import { AppError } from '../utils/errors';
import { findDiffHunks, type DiffHunk, type ConflictFile } from '../utils/diff';

const VERO_PROJECTS_BASE = process.env.VERO_PROJECTS_PATH || path.join(process.cwd(), 'vero-projects');
const MAX_SANDBOXES_PER_USER = 5;

export interface CreateSandboxInput {
  name: string;
  description?: string;
  sourceBranch?: 'dev' | 'master';
}

export interface SandboxWithDetails {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  ownerName: string | null;
  ownerEmail: string;
  projectId: string;
  sourceBranch: string;
  folderPath: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt: Date | null;
  pullRequestCount: number;
}

/**
 * Recursively copy directory contents
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Recursively delete directory
 */
async function deleteDirectory(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Could not delete directory ${dirPath}:`, error);
  }
}

export class SandboxService {
  /**
   * Create a new sandbox for a user in a project
   */
  async create(userId: string, projectId: string, input: CreateSandboxInput): Promise<SandboxWithDetails> {
    // Get user and project details
    const [user, project] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.project.findUnique({
        where: { id: projectId },
        include: { application: true },
      }),
    ]);

    if (!user) {
      throw new Error('User not found');
    }

    if (!project) {
      throw new Error('Project not found');
    }

    // Check sandbox limit per user (max 5)
    const userSandboxCount = await prisma.sandbox.count({
      where: {
        ownerId: userId,
        projectId,
        status: 'active',
      },
    });

    if (userSandboxCount >= MAX_SANDBOXES_PER_USER) {
      throw new AppError(400, `Maximum ${MAX_SANDBOXES_PER_USER} active sandboxes allowed per user per project`);
    }

    // Generate folder path: sandboxes/{sandbox-name-slug}
    const nameSlug = input.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const folderPath = `sandboxes/${nameSlug}`;

    // Determine the project's vero path
    const projectPath = project.veroPath || path.join(VERO_PROJECTS_BASE, project.application.id, project.id);

    // Full paths
    const sandboxFullPath = path.join(projectPath, folderPath);
    const sourceBranch = input.sourceBranch || 'dev';
    const sourceFullPath = path.join(projectPath, sourceBranch);

    // Check if sandbox folder already exists
    try {
      await fs.access(sandboxFullPath);
      throw new AppError(409, `Sandbox folder "${folderPath}" already exists. Please use a different name.`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // ENOENT means folder doesn't exist, which is what we want
    }

    // Check if source environment exists
    try {
      await fs.access(sourceFullPath);
    } catch {
      throw new Error(`Source environment '${sourceBranch}' not found. Please ensure the project has been properly initialized.`);
    }

    // Copy source environment to sandbox folder
    await copyDirectory(sourceFullPath, sandboxFullPath);

    // Also copy to .sync-base/ folder for three-way merge support
    const syncBasePath = path.join(sandboxFullPath, '.sync-base');
    await copyDirectory(sourceFullPath, syncBasePath);

    // Create sandbox record in database
    const sandbox = await prisma.sandbox.create({
      data: {
        name: input.name,
        description: input.description,
        ownerId: userId,
        projectId,
        sourceBranch,
        folderPath,
        status: 'active',
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { pullRequests: true } },
      },
    });

    return {
      id: sandbox.id,
      name: sandbox.name,
      description: sandbox.description,
      ownerId: sandbox.ownerId,
      ownerName: sandbox.owner.name,
      ownerEmail: sandbox.owner.email,
      projectId: sandbox.projectId,
      sourceBranch: sandbox.sourceBranch,
      folderPath: sandbox.folderPath,
      status: sandbox.status,
      createdAt: sandbox.createdAt,
      updatedAt: sandbox.updatedAt,
      lastSyncAt: sandbox.lastSyncAt,
      pullRequestCount: sandbox._count.pullRequests,
    };
  }

  /**
   * List all sandboxes for a project
   */
  async listByProject(projectId: string): Promise<SandboxWithDetails[]> {
    const sandboxes = await prisma.sandbox.findMany({
      where: { projectId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { pullRequests: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sandboxes.map(sandbox => ({
      id: sandbox.id,
      name: sandbox.name,
      description: sandbox.description,
      ownerId: sandbox.ownerId,
      ownerName: sandbox.owner.name,
      ownerEmail: sandbox.owner.email,
      projectId: sandbox.projectId,
      sourceBranch: sandbox.sourceBranch,
      folderPath: sandbox.folderPath,
      status: sandbox.status,
      createdAt: sandbox.createdAt,
      updatedAt: sandbox.updatedAt,
      lastSyncAt: sandbox.lastSyncAt,
      pullRequestCount: sandbox._count.pullRequests,
    }));
  }

  /**
   * List sandboxes owned by a user
   */
  async listByUser(userId: string, projectId?: string): Promise<SandboxWithDetails[]> {
    const sandboxes = await prisma.sandbox.findMany({
      where: {
        ownerId: userId,
        ...(projectId ? { projectId } : {}),
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { pullRequests: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sandboxes.map(sandbox => ({
      id: sandbox.id,
      name: sandbox.name,
      description: sandbox.description,
      ownerId: sandbox.ownerId,
      ownerName: sandbox.owner.name,
      ownerEmail: sandbox.owner.email,
      projectId: sandbox.projectId,
      sourceBranch: sandbox.sourceBranch,
      folderPath: sandbox.folderPath,
      status: sandbox.status,
      createdAt: sandbox.createdAt,
      updatedAt: sandbox.updatedAt,
      lastSyncAt: sandbox.lastSyncAt,
      pullRequestCount: sandbox._count.pullRequests,
    }));
  }

  /**
   * Get sandbox by ID
   */
  async getById(sandboxId: string): Promise<SandboxWithDetails | null> {
    const sandbox = await prisma.sandbox.findUnique({
      where: { id: sandboxId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { pullRequests: true } },
      },
    });

    if (!sandbox) return null;

    return {
      id: sandbox.id,
      name: sandbox.name,
      description: sandbox.description,
      ownerId: sandbox.ownerId,
      ownerName: sandbox.owner.name,
      ownerEmail: sandbox.owner.email,
      projectId: sandbox.projectId,
      sourceBranch: sandbox.sourceBranch,
      folderPath: sandbox.folderPath,
      status: sandbox.status,
      createdAt: sandbox.createdAt,
      updatedAt: sandbox.updatedAt,
      lastSyncAt: sandbox.lastSyncAt,
      pullRequestCount: sandbox._count.pullRequests,
    };
  }

  /**
   * Delete a sandbox (removes folder and database record)
   */
  async delete(sandboxId: string, userId: string, forceDelete: boolean = false): Promise<void> {
    const sandbox = await prisma.sandbox.findUnique({
      where: { id: sandboxId },
      include: {
        project: { include: { application: true } },
        pullRequests: { where: { status: { in: ['draft', 'open'] } } },
      },
    });

    if (!sandbox) {
      throw new AppError(404, 'Sandbox not found');
    }

    // Check ownership
    if (sandbox.ownerId !== userId) {
      throw new Error('Only the sandbox owner can delete it');
    }

    // Check for open PRs
    if (sandbox.pullRequests.length > 0 && !forceDelete) {
      throw new Error('Cannot delete sandbox with open pull requests. Close or merge them first.');
    }

    const projectPath = sandbox.project.veroPath ||
      path.join(VERO_PROJECTS_BASE, sandbox.project.application.id, sandbox.project.id);

    // Delete the sandbox folder
    const sandboxFullPath = path.join(projectPath, sandbox.folderPath);
    await deleteDirectory(sandboxFullPath);

    // Delete sandbox record (cascades to PRs)
    await prisma.sandbox.delete({ where: { id: sandboxId } });
  }

  /**
   * Archive a sandbox (soft delete - keeps folder but marks as archived)
   */
  async archive(sandboxId: string, userId: string): Promise<SandboxWithDetails> {
    const sandbox = await prisma.sandbox.findUnique({
      where: { id: sandboxId },
    });

    if (!sandbox) {
      throw new AppError(404, 'Sandbox not found');
    }

    if (sandbox.ownerId !== userId) {
      throw new Error('Only the sandbox owner can archive it');
    }

    const updated = await prisma.sandbox.update({
      where: { id: sandboxId },
      data: { status: 'archived' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { pullRequests: true } },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      ownerId: updated.ownerId,
      ownerName: updated.owner.name,
      ownerEmail: updated.owner.email,
      projectId: updated.projectId,
      sourceBranch: updated.sourceBranch,
      folderPath: updated.folderPath,
      status: updated.status,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      lastSyncAt: updated.lastSyncAt,
      pullRequestCount: updated._count.pullRequests,
    };
  }

  /**
   * Sync sandbox with source environment (pull latest changes from dev/master)
   * Note: This is a simple overwrite sync. For more complex merge scenarios,
   * a UI-based conflict resolution would be needed.
   */
  async sync(sandboxId: string, userId: string): Promise<{ success: boolean; conflicts?: string[] }> {
    const sandbox = await prisma.sandbox.findUnique({
      where: { id: sandboxId },
      include: {
        project: { include: { application: true } },
      },
    });

    if (!sandbox) {
      throw new AppError(404, 'Sandbox not found');
    }

    if (sandbox.ownerId !== userId) {
      throw new Error('Only the sandbox owner can sync it');
    }

    if (sandbox.status !== 'active') {
      throw new Error('Cannot sync an archived or merged sandbox');
    }

    const projectPath = sandbox.project.veroPath ||
      path.join(VERO_PROJECTS_BASE, sandbox.project.application.id, sandbox.project.id);

    const sandboxFullPath = path.join(projectPath, sandbox.folderPath);
    const sourceFullPath = path.join(projectPath, sandbox.sourceBranch);

    // For now, we do a simple comparison to detect potential conflicts
    // In a real implementation, you'd want a more sophisticated merge strategy
    const conflicts: string[] = [];

    try {
      // Get list of files in both directories (excluding .sync-base)
      const [sandboxFiles, sourceFiles] = await Promise.all([
        this.listFilesRecursive(sandboxFullPath, ['.sync-base']),
        this.listFilesRecursive(sourceFullPath, []),
      ]);

      // Find files that exist in both and check for differences
      for (const file of sandboxFiles) {
        if (sourceFiles.includes(file)) {
          const sandboxContent = await fs.readFile(path.join(sandboxFullPath, file), 'utf-8');
          const sourceContent = await fs.readFile(path.join(sourceFullPath, file), 'utf-8');

          if (sandboxContent !== sourceContent) {
            // File was modified in both sandbox and source - potential conflict
            conflicts.push(file);
          }
        }
      }

      // If there are conflicts, return them for user review
      if (conflicts.length > 0) {
        return {
          success: false,
          conflicts,
        };
      }

      // No conflicts - copy new/updated files from source to sandbox
      for (const file of sourceFiles) {
        const sourceFilePath = path.join(sourceFullPath, file);
        const sandboxFilePath = path.join(sandboxFullPath, file);

        // Create directory if needed
        await fs.mkdir(path.dirname(sandboxFilePath), { recursive: true });
        await fs.copyFile(sourceFilePath, sandboxFilePath);
      }

      // Update lastSyncAt
      await prisma.sandbox.update({
        where: { id: sandboxId },
        data: { lastSyncAt: new Date() },
      });

      return { success: true };
    } catch (error) {
      console.error('Sync failed:', error);
      throw new Error('Failed to sync sandbox with source environment');
    }
  }

  /**
   * Get the project path for a sandbox
   */
  async getProjectPath(sandboxId: string): Promise<string> {
    const sandbox = await prisma.sandbox.findUnique({
      where: { id: sandboxId },
      include: {
        project: { include: { application: true } },
      },
    });

    if (!sandbox) {
      throw new AppError(404, 'Sandbox not found');
    }

    return sandbox.project.veroPath ||
      path.join(VERO_PROJECTS_BASE, sandbox.project.application.id, sandbox.project.id);
  }

  /**
   * Get the full path to a sandbox folder
   */
  async getSandboxPath(sandboxId: string): Promise<string> {
    const sandbox = await prisma.sandbox.findUnique({
      where: { id: sandboxId },
      include: {
        project: { include: { application: true } },
      },
    });

    if (!sandbox) {
      throw new AppError(404, 'Sandbox not found');
    }

    const projectPath = sandbox.project.veroPath ||
      path.join(VERO_PROJECTS_BASE, sandbox.project.application.id, sandbox.project.id);

    return path.join(projectPath, sandbox.folderPath);
  }

  /**
   * Check if user has permission to access sandbox
   */
  async canAccess(sandboxId: string, userId: string): Promise<boolean> {
    const sandbox = await prisma.sandbox.findUnique({
      where: { id: sandboxId },
      include: {
        project: {
          include: {
            application: {
              include: {
                members: { where: { userId } },
              },
            },
          },
        },
      },
    });

    if (!sandbox) return false;

    // Owner has access
    if (sandbox.ownerId === userId) return true;

    // Application members have read access
    const isMember = sandbox.project.application.members.length > 0;
    return isMember;
  }

  /**
   * Check if user can modify sandbox (owner only)
   */
  async canModify(sandboxId: string, userId: string): Promise<boolean> {
    const sandbox = await prisma.sandbox.findUnique({
      where: { id: sandboxId },
    });

    return sandbox?.ownerId === userId;
  }

  /**
   * Recursively list all files in a directory
   */
  private async listFilesRecursive(
    dirPath: string,
    excludeDirs: string[] = [],
    basePath: string = ''
  ): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip excluded directories
        if (entry.isDirectory() && excludeDirs.includes(entry.name)) {
          continue;
        }

        const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;

        if (entry.isDirectory()) {
          const subFiles = await this.listFilesRecursive(
            path.join(dirPath, entry.name),
            excludeDirs,
            relativePath
          );
          files.push(...subFiles);
        } else {
          files.push(relativePath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or not readable
    }

    return files;
  }

  /**
   * Sync with detailed conflict information for three-way merge resolution
   */
  async syncWithDetails(sandboxId: string, userId: string): Promise<{
    success: boolean;
    hasConflicts: boolean;
    conflicts?: ConflictFile[];
    cleanMerges?: string[];
    sandbox?: SandboxWithDetails;
  }> {
    const sandbox = await prisma.sandbox.findUnique({
      where: { id: sandboxId },
      include: {
        project: { include: { application: true } },
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { pullRequests: true } },
      },
    });

    if (!sandbox) {
      throw new AppError(404, 'Sandbox not found');
    }

    if (sandbox.ownerId !== userId) {
      throw new AppError(403, 'Only the sandbox owner can sync it');
    }

    if (sandbox.status !== 'active') {
      throw new AppError(400, 'Cannot sync an archived or merged sandbox');
    }

    const projectPath = sandbox.project.veroPath ||
      path.join(VERO_PROJECTS_BASE, sandbox.project.application.id, sandbox.project.id);

    const sandboxFullPath = path.join(projectPath, sandbox.folderPath);
    const sourceFullPath = path.join(projectPath, sandbox.sourceBranch);

    // Path to base files (snapshot from when sandbox was created/last synced)
    const syncBasePath = path.join(sandboxFullPath, '.sync-base');

    try {
      // Check if .sync-base exists (for backwards compatibility with old sandboxes)
      let hasBaseFolder = false;
      try {
        await fs.access(syncBasePath);
        hasBaseFolder = true;
      } catch {
        // .sync-base doesn't exist - old sandbox, will create it after sync
        console.log(`[syncWithDetails] No .sync-base folder found for sandbox ${sandboxId}, will create after sync`);
      }

      // Get list of files in both directories (excluding .sync-base)
      const [sandboxFiles, sourceFiles] = await Promise.all([
        this.listFilesRecursive(sandboxFullPath, ['.sync-base']),
        this.listFilesRecursive(sourceFullPath, []),
      ]);

      const conflicts: ConflictFile[] = [];
      const cleanMerges: string[] = [];
      const autoMergedFiles: string[] = [];

      // Check files that exist in source (potential updates)
      for (const file of sourceFiles) {
        const sandboxFilePath = path.join(sandboxFullPath, file);
        const sourceFilePath = path.join(sourceFullPath, file);
        const baseFilePath = path.join(syncBasePath, file);

        const sourceContent = await fs.readFile(sourceFilePath, 'utf-8');

        if (sandboxFiles.includes(file)) {
          // File exists in both - check for differences
          const sandboxContent = await fs.readFile(sandboxFilePath, 'utf-8');

          if (sandboxContent === sourceContent) {
            // Files are identical - no action needed
            continue;
          }

          // Files differ - need to check base for three-way merge
          let baseContent: string | null = null;
          if (hasBaseFolder) {
            try {
              baseContent = await fs.readFile(baseFilePath, 'utf-8');
            } catch {
              // Base file doesn't exist - treat as new file scenario
              baseContent = null;
            }
          }

          if (baseContent === null) {
            // No base content - can't determine who changed what, treat as conflict
            const hunks = findDiffHunks(sourceContent, sandboxContent);
            conflicts.push({
              filePath: file,
              theirsContent: sourceContent,
              yoursContent: sandboxContent,
              hunks,
            });
          } else if (baseContent === sourceContent) {
            // Source unchanged from base, only sandbox changed
            // Keep sandbox version - no action needed (sandbox has the changes)
            autoMergedFiles.push(file);
            console.log(`[syncWithDetails] File ${file}: source unchanged, keeping sandbox changes`);
          } else if (baseContent === sandboxContent) {
            // Sandbox unchanged from base, only source changed
            // Auto-merge: copy source to sandbox
            cleanMerges.push(file);
            console.log(`[syncWithDetails] File ${file}: sandbox unchanged, pulling source changes`);
          } else {
            // Both changed from base - need to check if same lines were modified
            // For now, treat as conflict and let user resolve
            // TODO: Implement line-level three-way merge to auto-merge non-overlapping changes
            const hunks = findDiffHunks(sourceContent, sandboxContent);
            conflicts.push({
              filePath: file,
              theirsContent: sourceContent,
              yoursContent: sandboxContent,
              hunks,
            });
            console.log(`[syncWithDetails] File ${file}: both changed, conflict detected`);
          }
        } else {
          // New file in source - can be auto-merged
          cleanMerges.push(file);
        }
      }

      // If there are conflicts, return them for user resolution
      if (conflicts.length > 0) {
        return {
          success: false,
          hasConflicts: true,
          conflicts,
          cleanMerges,
        };
      }

      // No conflicts - apply clean merges and update sandbox
      for (const file of cleanMerges) {
        const sourceFilePath = path.join(sourceFullPath, file);
        const sandboxFilePath = path.join(sandboxFullPath, file);

        // Create directory if needed
        await fs.mkdir(path.dirname(sandboxFilePath), { recursive: true });
        await fs.copyFile(sourceFilePath, sandboxFilePath);
      }

      // Update .sync-base with current source content (new baseline for next sync)
      // This should happen after successful sync
      console.log(`[syncWithDetails] Updating .sync-base folder for sandbox ${sandboxId}`);
      await deleteDirectory(syncBasePath);
      await copyDirectory(sourceFullPath, syncBasePath);

      // Update lastSyncAt
      const updated = await prisma.sandbox.update({
        where: { id: sandboxId },
        data: { lastSyncAt: new Date() },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { pullRequests: true } },
        },
      });

      return {
        success: true,
        hasConflicts: false,
        cleanMerges,
        sandbox: {
          id: updated.id,
          name: updated.name,
          description: updated.description,
          ownerId: updated.ownerId,
          ownerName: updated.owner.name,
          ownerEmail: updated.owner.email,
          projectId: updated.projectId,
          sourceBranch: updated.sourceBranch,
          folderPath: updated.folderPath,
          status: updated.status,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          lastSyncAt: updated.lastSyncAt,
          pullRequestCount: updated._count.pullRequests,
        },
      };
    } catch (error) {
      console.error('Sync with details failed:', error);
      throw new AppError(500, 'Failed to sync sandbox with source environment');
    }
  }

  /**
   * Apply resolved conflicts and complete the sync
   */
  async resolveConflicts(
    sandboxId: string,
    userId: string,
    resolutions: Record<string, string>, // filePath -> resolved content
    autoMergeClean: boolean = true
  ): Promise<{
    success: boolean;
    updatedFiles: string[];
    sandbox: SandboxWithDetails;
  }> {
    const sandbox = await prisma.sandbox.findUnique({
      where: { id: sandboxId },
      include: {
        project: { include: { application: true } },
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { pullRequests: true } },
      },
    });

    if (!sandbox) {
      throw new AppError(404, 'Sandbox not found');
    }

    if (sandbox.ownerId !== userId) {
      throw new AppError(403, 'Only the sandbox owner can resolve conflicts');
    }

    const projectPath = sandbox.project.veroPath ||
      path.join(VERO_PROJECTS_BASE, sandbox.project.application.id, sandbox.project.id);

    const sandboxFullPath = path.join(projectPath, sandbox.folderPath);
    const sourceFullPath = path.join(projectPath, sandbox.sourceBranch);

    const updatedFiles: string[] = [];

    try {
      // Apply resolved content for each file
      for (const [filePath, content] of Object.entries(resolutions)) {
        const fullPath = path.join(sandboxFullPath, filePath);

        // Ensure directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });

        // Write the resolved content
        await fs.writeFile(fullPath, content, 'utf-8');
        updatedFiles.push(filePath);

        console.log(`[Sandbox] Resolved conflict: ${filePath}`);
      }

      // If autoMergeClean is true, also copy non-conflicting files from source
      if (autoMergeClean) {
        const [sandboxFiles, sourceFiles] = await Promise.all([
          this.listFilesRecursive(sandboxFullPath, ['.sync-base']),
          this.listFilesRecursive(sourceFullPath, []),
        ]);

        for (const file of sourceFiles) {
          // Skip files that were in the resolutions (already handled)
          if (resolutions[file]) continue;

          const sandboxFilePath = path.join(sandboxFullPath, file);
          const sourceFilePath = path.join(sourceFullPath, file);

          if (!sandboxFiles.includes(file)) {
            // New file in source - copy it
            await fs.mkdir(path.dirname(sandboxFilePath), { recursive: true });
            await fs.copyFile(sourceFilePath, sandboxFilePath);
            updatedFiles.push(file);
          }
        }
      }

      // Update .sync-base with current source content (new baseline for next sync)
      const syncBasePath = path.join(sandboxFullPath, '.sync-base');
      console.log(`[resolveConflicts] Updating .sync-base folder for sandbox ${sandboxId}`);
      await deleteDirectory(syncBasePath);
      await copyDirectory(sourceFullPath, syncBasePath);

      // Update lastSyncAt
      const updated = await prisma.sandbox.update({
        where: { id: sandboxId },
        data: { lastSyncAt: new Date() },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { pullRequests: true } },
        },
      });

      return {
        success: true,
        updatedFiles,
        sandbox: {
          id: updated.id,
          name: updated.name,
          description: updated.description,
          ownerId: updated.ownerId,
          ownerName: updated.owner.name,
          ownerEmail: updated.owner.email,
          projectId: updated.projectId,
          sourceBranch: updated.sourceBranch,
          folderPath: updated.folderPath,
          status: updated.status,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          lastSyncAt: updated.lastSyncAt,
          pullRequestCount: updated._count.pullRequests,
        },
      };
    } catch (error) {
      console.error('Resolve conflicts failed:', error);
      throw new AppError(500, 'Failed to resolve conflicts');
    }
  }
}

export const sandboxService = new SandboxService();
