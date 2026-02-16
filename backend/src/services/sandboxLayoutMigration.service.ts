import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import type { Dirent } from 'fs';
import { sandboxRepository, projectRepository, applicationRepository } from '../db/repositories/mongo';
import { logger } from '../utils/logger';
import { resolveSandboxBaselinePath } from './sandbox.service';

const VERO_PROJECTS_BASE = process.env.VERO_PROJECTS_PATH
  || (existsSync(path.join(process.cwd(), 'vero-projects'))
    ? path.join(process.cwd(), 'vero-projects')
    : path.join(process.cwd(), '..', 'vero-projects'));
const EXCLUDED_SANDBOX_DIR_NAMES = new Set(['data', '.sync-base']);

async function deleteDirectory(dirPath: string): Promise<void> {
  await fs.rm(dirPath, { recursive: true, force: true });
}

async function ensureResourceFolders(environmentRoot: string): Promise<void> {
  const resourcesDir = path.join(environmentRoot, 'Resources');
  await fs.mkdir(path.join(resourcesDir, 'Visual', 'Baselines'), { recursive: true });
  await fs.mkdir(path.join(resourcesDir, 'Docs'), { recursive: true });
}

async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && EXCLUDED_SANDBOX_DIR_NAMES.has(entry.name.toLowerCase())) {
      continue;
    }

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function listRootEntries(dirPath: string): Promise<Dirent[]> {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function removeSandboxRootDirectoryIfPresent(sandboxPath: string, targetDirName: string): Promise<boolean> {
  const targetLower = targetDirName.toLowerCase();
  const entries = await listRootEntries(sandboxPath);

  let removed = false;
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (entry.name.toLowerCase() !== targetLower) {
      continue;
    }

    await deleteDirectory(path.join(sandboxPath, entry.name));
    removed = true;
  }

  return removed;
}

async function migrateLegacyBaselineIfPresent(sandboxId: string, sandboxPath: string): Promise<boolean> {
  const legacySyncBasePath = path.join(sandboxPath, '.sync-base');
  try {
    await fs.access(legacySyncBasePath);
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }

  const baselinePath = resolveSandboxBaselinePath(sandboxId);
  await deleteDirectory(baselinePath);
  await copyDirectory(legacySyncBasePath, baselinePath);
  await ensureResourceFolders(baselinePath);
  await deleteDirectory(legacySyncBasePath);
  return true;
}

async function resolveSandboxProjectPath(projectId: string): Promise<string | null> {
  const project = await projectRepository.findById(projectId);
  if (!project) {
    return null;
  }

  if (project.veroPath) {
    return project.veroPath;
  }

  const application = await applicationRepository.findById(project.applicationId);
  if (!application) {
    return null;
  }

  return path.join(VERO_PROJECTS_BASE, application.id, project.id);
}

export async function migrateSandboxLayoutOnStartup(): Promise<void> {
  const sandboxes = await sandboxRepository.findAll();
  if (sandboxes.length === 0) {
    return;
  }

  logger.info(`[SandboxLayoutMigration] Starting migration for ${sandboxes.length} sandboxes`);

  let migratedBaselines = 0;
  let removedLegacySyncBases = 0;
  let removedDataFolders = 0;
  let failures = 0;

  for (const sandbox of sandboxes) {
    try {
      const projectPath = await resolveSandboxProjectPath(sandbox.projectId);
      if (!projectPath) {
        failures += 1;
        logger.warn(`[SandboxLayoutMigration] Skipping sandbox ${sandbox.id}: project path could not be resolved`);
        continue;
      }

      const sandboxPath = path.join(projectPath, sandbox.folderPath);

      const migrated = await migrateLegacyBaselineIfPresent(sandbox.id, sandboxPath);
      if (migrated) {
        migratedBaselines += 1;
        removedLegacySyncBases += 1;
      } else {
        const removedLegacy = await removeSandboxRootDirectoryIfPresent(sandboxPath, '.sync-base');
        if (removedLegacy) {
          removedLegacySyncBases += 1;
        }
      }

      const removedData = await removeSandboxRootDirectoryIfPresent(sandboxPath, 'Data');
      if (removedData) {
        removedDataFolders += 1;
      }
    } catch (error) {
      failures += 1;
      logger.error(`[SandboxLayoutMigration] Failed for sandbox ${sandbox.id}:`, error);
    }
  }

  logger.info(
    `[SandboxLayoutMigration] Completed migration: migratedBaselines=${migratedBaselines}, removedLegacySyncBases=${removedLegacySyncBases}, removedDataFolders=${removedDataFolders}, failures=${failures}`
  );
}
