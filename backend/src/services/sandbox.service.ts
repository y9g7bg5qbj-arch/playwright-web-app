/**
 * Sandbox Service
 *
 * Manages user sandboxes for isolated test development with branching.
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import type { Dirent } from 'fs';
import { AppError } from '../utils/errors';
import { findDiffHunks, type ConflictFile } from '../utils/diff';
import { logger } from '../utils/logger';
import { sandboxRepository, pullRequestRepository, userRepository, projectRepository, applicationRepository } from '../db/repositories/mongo';

const VERO_PROJECTS_BASE = process.env.VERO_PROJECTS_PATH
  || (existsSync(path.join(process.cwd(), 'vero-projects'))
    ? path.join(process.cwd(), 'vero-projects')
    : path.join(process.cwd(), '..', 'vero-projects'));
const DEFAULT_SANDBOX_BASELINE_ROOT = existsSync(path.join(process.cwd(), 'backend'))
  ? path.join(process.cwd(), 'backend', 'storage', 'sandbox-baselines')
  : path.join(process.cwd(), 'storage', 'sandbox-baselines');
const SANDBOX_BASELINE_ROOT = process.env.SANDBOX_BASELINE_PATH || DEFAULT_SANDBOX_BASELINE_ROOT;
const MAX_SANDBOXES_PER_USER = 5;
const LEGACY_CONTENT_FOLDERS = new Set(['pages', 'features', 'pageactions', 'resources']);
const ENV_ROOT_FOLDERS = new Set(['dev', 'master', 'sandboxes']);
const EXCLUDED_SANDBOX_DIR_NAMES = new Set(['data', '.sync-base']);

interface CopyDirectoryOptions {
  includeRootDirNames?: Set<string>;
  excludeDirNames?: Set<string>;
}

export function resolveSandboxBaselinePath(sandboxId: string): string {
  return path.join(SANDBOX_BASELINE_ROOT, sandboxId);
}

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
async function copyDirectory(
  src: string,
  dest: string,
  options: CopyDirectoryOptions = {},
  depth: number = 0
): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const entryLower = entry.name.toLowerCase();
      if (options.excludeDirNames?.has(entryLower)) {
        continue;
      }
      if (depth === 0 && options.includeRootDirNames && !options.includeRootDirNames.has(entryLower)) {
        continue;
      }
    }

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath, options, depth + 1);
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
    logger.warn(`Could not delete directory ${dirPath}:`, error);
  }
}

async function ensureResourceFolders(environmentRoot: string): Promise<void> {
  const resourcesDir = path.join(environmentRoot, 'Resources');
  await fs.mkdir(path.join(resourcesDir, 'Visual', 'Baselines'), { recursive: true });
  await fs.mkdir(path.join(resourcesDir, 'Docs'), { recursive: true });
}

async function writeSandboxBaselineSnapshot(
  sandboxId: string,
  sourcePath: string,
  options: CopyDirectoryOptions
): Promise<void> {
  const baselinePath = resolveSandboxBaselinePath(sandboxId);
  await deleteDirectory(baselinePath);
  await copyDirectory(sourcePath, baselinePath, options);
  await ensureResourceFolders(baselinePath);
}

async function writeBaselineFromSource(
  sandboxId: string,
  sourcePath: string,
  useLegacyRoot: boolean
): Promise<void> {
  const copyOptions: CopyDirectoryOptions = useLegacyRoot
    ? {
      includeRootDirNames: LEGACY_CONTENT_FOLDERS,
      excludeDirNames: EXCLUDED_SANDBOX_DIR_NAMES,
    }
    : { excludeDirNames: EXCLUDED_SANDBOX_DIR_NAMES };

  await writeSandboxBaselineSnapshot(sandboxId, sourcePath, copyOptions);
}

async function scaffoldEnvironmentFolders(environmentRoot: string): Promise<void> {
  await fs.mkdir(path.join(environmentRoot, 'Pages'), { recursive: true });
  await fs.mkdir(path.join(environmentRoot, 'Features'), { recursive: true });
  await fs.mkdir(path.join(environmentRoot, 'PageActions'), { recursive: true });
  await ensureResourceFolders(environmentRoot);
}

function hasEnvironmentContent(entries: Dirent[]): boolean {
  return entries.some((entry) => entry.isDirectory() && LEGACY_CONTENT_FOLDERS.has(entry.name.toLowerCase()));
}

async function resolveSandboxSource(
  projectPath: string,
  sourceBranch: string,
  options: { bootstrapIfMissing?: boolean } = {}
): Promise<{ sourcePath: string; useLegacyRoot: boolean }> {
  const sourceBranchPath = path.join(projectPath, sourceBranch);

  let sourceBranchEntries: Dirent[] | null = null;
  try {
    sourceBranchEntries = await fs.readdir(sourceBranchPath, { withFileTypes: true });
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  if (sourceBranchEntries && hasEnvironmentContent(sourceBranchEntries)) {
    return { sourcePath: sourceBranchPath, useLegacyRoot: false };
  }

  const projectRootEntries = await fs.readdir(projectPath, { withFileTypes: true });
  if (hasEnvironmentContent(projectRootEntries)) {
    return { sourcePath: projectPath, useLegacyRoot: true };
  }

  if (options.bootstrapIfMissing) {
    // Bootstrap empty projects so first sandbox creation works without manual filesystem setup.
    await scaffoldEnvironmentFolders(sourceBranchPath);
    return { sourcePath: sourceBranchPath, useLegacyRoot: false };
  }

  if (sourceBranchEntries) {
    throw new AppError(
      400,
      `Source environment '${sourceBranch}' exists but has no test content folders (Pages/Features/PageActions/Resources).`
    );
  }

  throw new AppError(
    400,
    `Source environment '${sourceBranch}' not found. Initialize ${sourceBranch}/ or add test content folders at the project root.`
  );
}

async function copyLegacyEnvironment(projectPath: string, targetPath: string): Promise<void> {
  await fs.mkdir(targetPath, { recursive: true });
  const entries = await fs.readdir(projectPath, { withFileTypes: true });

  let copiedCount = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const lowerName = entry.name.toLowerCase();
    if (ENV_ROOT_FOLDERS.has(lowerName) || !LEGACY_CONTENT_FOLDERS.has(lowerName)) {
      continue;
    }

    await copyDirectory(path.join(projectPath, entry.name), path.join(targetPath, entry.name), {
      excludeDirNames: EXCLUDED_SANDBOX_DIR_NAMES,
    });
    copiedCount += 1;
  }

  if (copiedCount === 0) {
    throw new AppError(400, 'No test content folders were found to seed this sandbox.');
  }
}

export class SandboxService {
  /**
   * Convert a sandbox record to SandboxWithDetails format
   */
  private async toSandboxWithDetails(sandbox: {
    id: string;
    name: string;
    description?: string | null;
    ownerId: string;
    projectId: string;
    sourceBranch: string;
    folderPath: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    lastSyncAt?: Date | null;
  }): Promise<SandboxWithDetails> {
    const [owner, pullRequests] = await Promise.all([
      userRepository.findById(sandbox.ownerId),
      pullRequestRepository.findBySandboxId(sandbox.id),
    ]);

    return {
      id: sandbox.id,
      name: sandbox.name,
      description: sandbox.description || null,
      ownerId: sandbox.ownerId,
      ownerName: owner?.name || null,
      ownerEmail: owner?.email || 'unknown',
      projectId: sandbox.projectId,
      sourceBranch: sandbox.sourceBranch,
      folderPath: sandbox.folderPath,
      status: sandbox.status,
      createdAt: sandbox.createdAt,
      updatedAt: sandbox.updatedAt,
      lastSyncAt: sandbox.lastSyncAt || null,
      pullRequestCount: pullRequests.length,
    };
  }

  /**
   * Create a new sandbox for a user in a project
   */
  async create(userId: string, projectId: string, input: CreateSandboxInput): Promise<SandboxWithDetails> {
    // Get user and project details
    const [user, project] = await Promise.all([
      userRepository.findById(userId),
      projectRepository.findById(projectId),
    ]);

    if (!user) {
      throw new Error('User not found');
    }

    if (!project) {
      throw new Error('Project not found');
    }

    // Check sandbox limit per user (max 5)
    const userSandboxCount = await sandboxRepository.countByOwnerAndProject(userId, projectId, 'active');

    if (userSandboxCount >= MAX_SANDBOXES_PER_USER) {
      throw new AppError(400, `Maximum ${MAX_SANDBOXES_PER_USER} active sandboxes allowed per user per project`);
    }

    // Generate folder path: sandboxes/{sandbox-name-slug}
    const nameSlug = input.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const folderPath = `sandboxes/${nameSlug}`;

    // Determine the project's vero path
    let projectPath = project.veroPath;
    if (!projectPath) {
      const application = await applicationRepository.findById(project.applicationId);
      if (!application) {
        throw new AppError(404, 'Application not found');
      }
      projectPath = path.join(VERO_PROJECTS_BASE, application.id, project.id);
    }
    await fs.mkdir(projectPath, { recursive: true });

    // Full paths
    const sandboxFullPath = path.join(projectPath, folderPath);
    const sourceBranch = input.sourceBranch || 'dev';
    const sourceResolution = await resolveSandboxSource(projectPath, sourceBranch, { bootstrapIfMissing: true });

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

    // Copy source environment to sandbox folder
    if (sourceResolution.useLegacyRoot) {
      await copyLegacyEnvironment(sourceResolution.sourcePath, sandboxFullPath);
    } else {
      await copyDirectory(sourceResolution.sourcePath, sandboxFullPath, {
        excludeDirNames: EXCLUDED_SANDBOX_DIR_NAMES,
      });
    }
    await ensureResourceFolders(sandboxFullPath);

    // Create sandbox record in database
    const sandbox = await sandboxRepository.create({
      name: input.name,
      description: input.description,
      ownerId: userId,
      projectId,
      sourceBranch,
      folderPath,
      status: 'active',
    });

    try {
      await writeBaselineFromSource(sandbox.id, sourceResolution.sourcePath, sourceResolution.useLegacyRoot);
    } catch (error) {
      await sandboxRepository.delete(sandbox.id);
      await deleteDirectory(sandboxFullPath);
      throw error;
    }

    return this.toSandboxWithDetails(sandbox);
  }

  /**
   * List all sandboxes for a project
   */
  async listByProject(projectId: string): Promise<SandboxWithDetails[]> {
    const sandboxes = await sandboxRepository.findByProjectId(projectId);
    return Promise.all(sandboxes.map(s => this.toSandboxWithDetails(s)));
  }

  /**
   * List sandboxes owned by a user
   */
  async listByUser(userId: string, projectId?: string): Promise<SandboxWithDetails[]> {
    const sandboxes = await sandboxRepository.findByOwnerId(userId, projectId);
    return Promise.all(sandboxes.map(s => this.toSandboxWithDetails(s)));
  }

  /**
   * Get sandbox by ID
   */
  async getById(sandboxId: string): Promise<SandboxWithDetails | null> {
    const sandbox = await sandboxRepository.findById(sandboxId);
    if (!sandbox) return null;
    return this.toSandboxWithDetails(sandbox);
  }

  /**
   * Delete a sandbox (removes folder and database record)
   */
  async delete(sandboxId: string, userId: string, forceDelete: boolean = false): Promise<void> {
    const sandbox = await sandboxRepository.findById(sandboxId);

    if (!sandbox) {
      throw new AppError(404, 'Sandbox not found');
    }

    // Check ownership
    if (sandbox.ownerId !== userId) {
      throw new Error('Only the sandbox owner can delete it');
    }

    // Check for open PRs
    const openPRs = await pullRequestRepository.findOpenBySandboxId(sandboxId);
    if (openPRs.length > 0 && !forceDelete) {
      throw new Error('Cannot delete sandbox with open pull requests. Close or merge them first.');
    }

    // Get project and application for path resolution
    const project = await projectRepository.findById(sandbox.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const application = await applicationRepository.findById(project.applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    const projectPath = project.veroPath || path.join(VERO_PROJECTS_BASE, application.id, project.id);

    // Delete the sandbox folder
    const sandboxFullPath = path.join(projectPath, sandbox.folderPath);
    await deleteDirectory(sandboxFullPath);
    await deleteDirectory(resolveSandboxBaselinePath(sandboxId));

    // Delete pull requests associated with sandbox
    await pullRequestRepository.deleteBySandboxId(sandboxId);

    // Delete sandbox record
    await sandboxRepository.delete(sandboxId);
  }

  /**
   * Archive a sandbox (soft delete - keeps folder but marks as archived)
   */
  async archive(sandboxId: string, userId: string): Promise<SandboxWithDetails> {
    const sandbox = await sandboxRepository.findById(sandboxId);

    if (!sandbox) {
      throw new AppError(404, 'Sandbox not found');
    }

    if (sandbox.ownerId !== userId) {
      throw new Error('Only the sandbox owner can archive it');
    }

    const updated = await sandboxRepository.update(sandboxId, { status: 'archived' });
    if (!updated) {
      throw new Error('Failed to update sandbox');
    }

    return this.toSandboxWithDetails(updated);
  }

  /**
   * Sync sandbox with source environment (pull latest changes from dev/master)
   * Note: This is a simple overwrite sync. For more complex merge scenarios,
   * a UI-based conflict resolution would be needed.
   */
  async sync(sandboxId: string, userId: string): Promise<{ success: boolean; conflicts?: string[] }> {
    const sandbox = await sandboxRepository.findById(sandboxId);

    if (!sandbox) {
      throw new AppError(404, 'Sandbox not found');
    }

    if (sandbox.ownerId !== userId) {
      throw new Error('Only the sandbox owner can sync it');
    }

    if (sandbox.status !== 'active') {
      throw new Error('Cannot sync an archived or merged sandbox');
    }

    // Get project and application for path resolution
    const project = await projectRepository.findById(sandbox.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const application = await applicationRepository.findById(project.applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    const projectPath = project.veroPath || path.join(VERO_PROJECTS_BASE, application.id, project.id);

    const sandboxFullPath = path.join(projectPath, sandbox.folderPath);
    const sourceResolution = await resolveSandboxSource(projectPath, sandbox.sourceBranch, { bootstrapIfMissing: false });

    // For now, we do a simple comparison to detect potential conflicts
    // In a real implementation, you'd want a more sophisticated merge strategy
    const conflicts: string[] = [];

    try {
      await this.removeExcludedSandboxDirectories(sandboxFullPath);

      // Get list of files in both directories while excluding forbidden sandbox folders.
      const [sandboxFiles, sourceFiles] = await Promise.all([
        this.listFilesRecursive(sandboxFullPath, EXCLUDED_SANDBOX_DIR_NAMES),
        this.listSourceFiles(sourceResolution.sourcePath, sourceResolution.useLegacyRoot),
      ]);

      // Find files that exist in both and check for differences
      for (const file of sandboxFiles) {
        if (sourceFiles.includes(file)) {
          const sandboxContent = await fs.readFile(path.join(sandboxFullPath, file), 'utf-8');
          const sourceContent = await fs.readFile(path.join(sourceResolution.sourcePath, file), 'utf-8');

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
        const sourceFilePath = path.join(sourceResolution.sourcePath, file);
        const sandboxFilePath = path.join(sandboxFullPath, file);

        // Create directory if needed
        await fs.mkdir(path.dirname(sandboxFilePath), { recursive: true });
        await fs.copyFile(sourceFilePath, sandboxFilePath);
      }

      await ensureResourceFolders(sandboxFullPath);
      await writeBaselineFromSource(sandboxId, sourceResolution.sourcePath, sourceResolution.useLegacyRoot);

      // Update lastSyncAt
      await sandboxRepository.update(sandboxId, { lastSyncAt: new Date() });

      return { success: true };
    } catch (error) {
      logger.error('Sync failed:', error);
      throw new Error('Failed to sync sandbox with source environment');
    }
  }

  /**
   * Resolve the project path for a sandbox by looking up project and application.
   * Returns the sandbox record and the resolved project path.
   */
  private async resolveProjectPath(sandboxId: string): Promise<{
    sandbox: { id: string; folderPath: string; ownerId: string; projectId: string; sourceBranch: string; status: string };
    projectPath: string;
  }> {
    const sandbox = await sandboxRepository.findById(sandboxId);
    if (!sandbox) {
      throw new AppError(404, 'Sandbox not found');
    }

    const project = await projectRepository.findById(sandbox.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const application = await applicationRepository.findById(project.applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    const projectPath = project.veroPath || path.join(VERO_PROJECTS_BASE, application.id, project.id);
    return { sandbox, projectPath };
  }

  /**
   * Get the project path for a sandbox
   */
  async getProjectPath(sandboxId: string): Promise<string> {
    const { projectPath } = await this.resolveProjectPath(sandboxId);
    return projectPath;
  }

  /**
   * Get the full path to a sandbox folder
   */
  async getSandboxPath(sandboxId: string): Promise<string> {
    const { sandbox, projectPath } = await this.resolveProjectPath(sandboxId);
    return path.join(projectPath, sandbox.folderPath);
  }

  /**
   * Check if user has permission to access sandbox
   */
  async canAccess(sandboxId: string, userId: string): Promise<boolean> {
    const sandbox = await sandboxRepository.findById(sandboxId);

    if (!sandbox) return false;

    // Owner has access
    if (sandbox.ownerId === userId) return true;

    // For now, all users in the same application have read access
    // This could be extended with more granular permissions
    return true;
  }

  /**
   * Check if user can modify sandbox (owner only)
   */
  async canModify(sandboxId: string, userId: string): Promise<boolean> {
    const sandbox = await sandboxRepository.findById(sandboxId);
    return sandbox?.ownerId === userId;
  }

  /**
   * Recursively list all files in a directory
   */
  private async listFilesRecursive(
    dirPath: string,
    excludeDirNames: Set<string> = new Set(),
    basePath: string = ''
  ): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip excluded directories
        if (entry.isDirectory() && excludeDirNames.has(entry.name.toLowerCase())) {
          continue;
        }

        const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;

        if (entry.isDirectory()) {
          const subFiles = await this.listFilesRecursive(
            path.join(dirPath, entry.name),
            excludeDirNames,
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
   * List source files while supporting legacy project-root layouts.
   */
  private async listSourceFiles(sourcePath: string, useLegacyRoot: boolean): Promise<string[]> {
    if (!useLegacyRoot) {
      return this.listFilesRecursive(sourcePath, EXCLUDED_SANDBOX_DIR_NAMES);
    }

    let entries: Dirent[] = [];
    try {
      entries = await fs.readdir(sourcePath, { withFileTypes: true });
    } catch (error) {
      logger.warn(`[Sandbox] Failed to read legacy source path: ${sourcePath}`, error);
      return [];
    }

    const files: string[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      if (!LEGACY_CONTENT_FOLDERS.has(entry.name.toLowerCase())) {
        continue;
      }

      const nested = await this.listFilesRecursive(
        path.join(sourcePath, entry.name),
        EXCLUDED_SANDBOX_DIR_NAMES,
        entry.name
      );
      files.push(...nested);
    }

    return files;
  }

  /**
   * Remove excluded root directories from sandbox folders.
   */
  private async removeExcludedSandboxDirectories(sandboxFullPath: string): Promise<void> {
    let entries: Dirent[] = [];
    try {
      entries = await fs.readdir(sandboxFullPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      if (!EXCLUDED_SANDBOX_DIR_NAMES.has(entry.name.toLowerCase())) {
        continue;
      }

      await deleteDirectory(path.join(sandboxFullPath, entry.name));
    }
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
    const sandbox = await sandboxRepository.findById(sandboxId);

    if (!sandbox) {
      throw new AppError(404, 'Sandbox not found');
    }

    if (sandbox.ownerId !== userId) {
      throw new AppError(403, 'Only the sandbox owner can sync it');
    }

    if (sandbox.status !== 'active') {
      throw new AppError(400, 'Cannot sync an archived or merged sandbox');
    }

    // Get project and application for path resolution
    const project = await projectRepository.findById(sandbox.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const application = await applicationRepository.findById(project.applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    const projectPath = project.veroPath || path.join(VERO_PROJECTS_BASE, application.id, project.id);

    const sandboxFullPath = path.join(projectPath, sandbox.folderPath);
    const sourceResolution = await resolveSandboxSource(projectPath, sandbox.sourceBranch, { bootstrapIfMissing: false });
    const baselinePath = resolveSandboxBaselinePath(sandboxId);

    try {
      await this.removeExcludedSandboxDirectories(sandboxFullPath);

      // Check if baseline snapshot exists
      let hasBaseFolder = false;
      try {
        await fs.access(baselinePath);
        hasBaseFolder = true;
      } catch {
        logger.info(`[syncWithDetails] No baseline snapshot found for sandbox ${sandboxId}, treating changes conservatively`);
      }

      // Get list of files in both directories while excluding forbidden sandbox folders.
      const [sandboxFiles, sourceFiles] = await Promise.all([
        this.listFilesRecursive(sandboxFullPath, EXCLUDED_SANDBOX_DIR_NAMES),
        this.listSourceFiles(sourceResolution.sourcePath, sourceResolution.useLegacyRoot),
      ]);

      const conflicts: ConflictFile[] = [];
      const cleanMerges: string[] = [];
      const autoMergedFiles: string[] = [];

      // Check files that exist in source (potential updates)
      for (const file of sourceFiles) {
        const sandboxFilePath = path.join(sandboxFullPath, file);
        const sourceFilePath = path.join(sourceResolution.sourcePath, file);
        const baseFilePath = path.join(baselinePath, file);

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
            logger.debug(`[syncWithDetails] File ${file}: source unchanged, keeping sandbox changes`);
          } else if (baseContent === sandboxContent) {
            // Sandbox unchanged from base, only source changed
            // Auto-merge: copy source to sandbox
            cleanMerges.push(file);
            logger.debug(`[syncWithDetails] File ${file}: sandbox unchanged, pulling source changes`);
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
            logger.debug(`[syncWithDetails] File ${file}: both changed, conflict detected`);
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
        const sourceFilePath = path.join(sourceResolution.sourcePath, file);
        const sandboxFilePath = path.join(sandboxFullPath, file);

        // Create directory if needed
        await fs.mkdir(path.dirname(sandboxFilePath), { recursive: true });
        await fs.copyFile(sourceFilePath, sandboxFilePath);
      }

      // Update baseline snapshot with current source content (new baseline for next sync).
      logger.debug(`[syncWithDetails] Updating baseline snapshot for sandbox ${sandboxId}`);
      await ensureResourceFolders(sandboxFullPath);
      await writeBaselineFromSource(sandboxId, sourceResolution.sourcePath, sourceResolution.useLegacyRoot);

      // Update lastSyncAt
      const updated = await sandboxRepository.update(sandboxId, { lastSyncAt: new Date() });
      if (!updated) {
        throw new Error('Failed to update sandbox');
      }

      return {
        success: true,
        hasConflicts: false,
        cleanMerges,
        sandbox: await this.toSandboxWithDetails(updated),
      };
    } catch (error) {
      logger.error('Sync with details failed:', error);
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
    const sandbox = await sandboxRepository.findById(sandboxId);

    if (!sandbox) {
      throw new AppError(404, 'Sandbox not found');
    }

    if (sandbox.ownerId !== userId) {
      throw new AppError(403, 'Only the sandbox owner can resolve conflicts');
    }

    // Get project and application for path resolution
    const project = await projectRepository.findById(sandbox.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const application = await applicationRepository.findById(project.applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    const projectPath = project.veroPath || path.join(VERO_PROJECTS_BASE, application.id, project.id);

    const sandboxFullPath = path.join(projectPath, sandbox.folderPath);
    const sourceResolution = await resolveSandboxSource(projectPath, sandbox.sourceBranch, { bootstrapIfMissing: false });

    const updatedFiles: string[] = [];

    try {
      await this.removeExcludedSandboxDirectories(sandboxFullPath);

      // Apply resolved content for each file
      for (const [filePath, content] of Object.entries(resolutions)) {
        const fullPath = path.join(sandboxFullPath, filePath);

        // Ensure directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });

        // Write the resolved content
        await fs.writeFile(fullPath, content, 'utf-8');
        updatedFiles.push(filePath);

        logger.debug(`[Sandbox] Resolved conflict: ${filePath}`);
      }

      // If autoMergeClean is true, also copy non-conflicting files from source
      if (autoMergeClean) {
        const [sandboxFiles, sourceFiles] = await Promise.all([
          this.listFilesRecursive(sandboxFullPath, EXCLUDED_SANDBOX_DIR_NAMES),
          this.listSourceFiles(sourceResolution.sourcePath, sourceResolution.useLegacyRoot),
        ]);

        for (const file of sourceFiles) {
          // Skip files that were in the resolutions (already handled)
          if (resolutions[file]) continue;

          const sandboxFilePath = path.join(sandboxFullPath, file);
          const sourceFilePath = path.join(sourceResolution.sourcePath, file);

          if (!sandboxFiles.includes(file)) {
            // New file in source - copy it
            await fs.mkdir(path.dirname(sandboxFilePath), { recursive: true });
            await fs.copyFile(sourceFilePath, sandboxFilePath);
            updatedFiles.push(file);
          }
        }
      }

      // Update baseline snapshot with current source content (new baseline for next sync).
      logger.debug(`[resolveConflicts] Updating baseline snapshot for sandbox ${sandboxId}`);
      await ensureResourceFolders(sandboxFullPath);
      await writeBaselineFromSource(sandboxId, sourceResolution.sourcePath, sourceResolution.useLegacyRoot);

      // Update lastSyncAt
      const updated = await sandboxRepository.update(sandboxId, { lastSyncAt: new Date() });
      if (!updated) {
        throw new Error('Failed to update sandbox');
      }

      return {
        success: true,
        updatedFiles,
        sandbox: await this.toSandboxWithDetails(updated),
      };
    } catch (error) {
      logger.error('Resolve conflicts failed:', error);
      throw new AppError(500, 'Failed to resolve conflicts');
    }
  }
}

export const sandboxService = new SandboxService();
