/**
 * GitHub Allure Report Routes
 * Endpoints for preparing and checking status of Allure reports from workflow runs.
 */

import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { githubService } from '../services/github.service';
import { logger } from '../utils/logger';
import { config } from '../config';

const router = Router();
const BACKEND_ROOT = path.resolve(__dirname, '../..');
const ALLURE_BIN_CANDIDATES = [
  path.resolve(BACKEND_ROOT, 'node_modules', '.bin', 'allure'),
  path.resolve(process.cwd(), 'node_modules', '.bin', 'allure'),
];

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resetDirectory(targetPath: string): Promise<void> {
  await fs.rm(targetPath, { recursive: true, force: true });
  await fs.mkdir(targetPath, { recursive: true });
}

const resolveAllureCommand = async (): Promise<{ command: string; prefixArgs: string[] }> => {
  for (const candidate of ALLURE_BIN_CANDIDATES) {
    try {
      await fs.access(candidate);
      return { command: candidate, prefixArgs: [] };
    } catch {
      // Try next candidate
    }
  }
  return { command: 'npx', prefixArgs: ['allure'] };
};

const copyDirectoryRecursive = async (src: string, dest: string): Promise<void> => {
  const entries = await fs.readdir(src, { withFileTypes: true });
  await fs.mkdir(dest, { recursive: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDirectoryRecursive(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
};

async function findFileInTree(rootDir: string, fileName: string): Promise<string | null> {
  const queue: string[] = [rootDir];
  while (queue.length > 0) {
    const currentDir = queue.shift()!;
    let entries: Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }>;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isFile() && entry.name === fileName) {
        return fullPath;
      }
      if (entry.isDirectory()) {
        queue.push(fullPath);
      }
    }
  }
  return null;
}

async function normalizeReportRoot(storageDir: string): Promise<boolean> {
  const rootIndexPath = path.join(storageDir, 'index.html');
  if (await fileExists(rootIndexPath)) {
    return true;
  }

  const foundIndexPath = await findFileInTree(storageDir, 'index.html');
  if (!foundIndexPath) {
    return false;
  }

  const reportRoot = path.dirname(foundIndexPath);
  if (path.resolve(reportRoot) === path.resolve(storageDir)) {
    return true;
  }

  const entries = await fs.readdir(reportRoot);
  for (const entry of entries) {
    const fromPath = path.join(reportRoot, entry);
    const toPath = path.join(storageDir, entry);
    await fs.rm(toPath, { recursive: true, force: true });
    await fs.rename(fromPath, toPath).catch(async () => {
      const stat = await fs.stat(fromPath);
      if (stat.isDirectory()) {
        await copyDirectoryRecursive(fromPath, toPath);
        await fs.rm(fromPath, { recursive: true, force: true });
      } else {
        await fs.copyFile(fromPath, toPath);
        await fs.rm(fromPath, { force: true });
      }
    });
  }

  return fileExists(rootIndexPath);
}

async function findAllureResultsRoot(extractedRoot: string): Promise<string | null> {
  const queue: string[] = [extractedRoot];
  while (queue.length > 0) {
    const currentDir = queue.shift()!;
    let entries: Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }>;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }

    if (entries.some((entry) => entry.isFile() && entry.name.endsWith('-result.json'))) {
      return currentDir;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        queue.push(path.join(currentDir, entry.name));
      }
    }
  }
  return null;
}

async function hasAllureResultFiles(dirPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dirPath);
    return entries.some((entry) => entry.endsWith('-result.json'));
  } catch {
    return false;
  }
}

async function runAllureGenerate(resultsDir: string, outputDir: string): Promise<void> {
  const { command, prefixArgs } = await resolveAllureCommand();
  const args = [...prefixArgs, 'generate', resultsDir, '--clean', '-o', outputDir];

  await new Promise<void>((resolve, reject) => {
    const childProcess = spawn(command, args, {
      cwd: globalThis.process.cwd(),
    });

    let stderr = '';
    childProcess.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    childProcess.on('close', (code: number | null) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Allure generate failed with code ${code}: ${stderr}`));
      }
    });

    childProcess.on('error', reject);
  });
}

async function extractArtifactToDirectory(buffer: Buffer, destination: string): Promise<void> {
  const AdmZip = require('adm-zip');
  await fs.mkdir(destination, { recursive: true });
  const zip = new AdmZip(buffer);
  zip.extractAllTo(destination, true);
}

// ============================================
// ALLURE REPORT
// ============================================

/**
 * POST /api/github/runs/:runId/allure/prepare
 * Download and extract Allure report for static serving
 */
router.post(
  '/runs/:runId/allure/prepare',
  authenticateToken,
  validate([
    param('runId').isInt().withMessage('Run ID must be an integer'),
    body('owner').isString().notEmpty().withMessage('Owner is required'),
    body('repo').isString().notEmpty().withMessage('Repo is required'),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { runId } = req.params;
      const { owner, repo } = req.body;
      const numericRunId = parseInt(runId, 10);
      const storageDir = path.resolve(config.storage.path, 'allure-reports', runId.toString());

      logger.info(`[Allure] Preparing report for run ${runId}`);

      // Get artifacts for this run
      const artifacts = await githubService.listArtifacts(
        req.userId!,
        owner,
        repo,
        numericRunId
      );

      const allureReportArtifacts = artifacts.filter((a: any) => a.name.includes('allure-report'));
      const allureResultsArtifacts = artifacts.filter((a: any) => a.name.includes('allure-results'));
      const playwrightReportArtifacts = artifacts.filter((a: any) => a.name.includes('playwright-report'));

      logger.info(
        `[Allure] Artifacts for run ${runId} - allure-report: ${allureReportArtifacts.length}, ` +
        `allure-results: ${allureResultsArtifacts.length}, playwright-report: ${playwrightReportArtifacts.length}`
      );

      const selectBestArtifact = (candidates: any[]): any | null => {
        if (!candidates.length) return null;
        return candidates.find((a) => a.name.endsWith('-merged') || a.name.includes('merged'))
          || candidates[0];
      };

      const preferredReportArtifact = selectBestArtifact(allureReportArtifacts);
      if (preferredReportArtifact) {
        await resetDirectory(storageDir);

        logger.info(
          `[Allure] Downloading prebuilt report artifact ${preferredReportArtifact.id}: ${preferredReportArtifact.name}`
        );
        const reportBuffer = await githubService.downloadArtifact(
          req.userId!,
          owner,
          repo,
          preferredReportArtifact.id
        );
        await extractArtifactToDirectory(reportBuffer, storageDir);

        if (await normalizeReportRoot(storageDir)) {
          res.json({
            success: true,
            data: {
              runId,
              reportUrl: `/allure-reports/${runId}/index.html`,
              extractedTo: storageDir,
            },
          });
          return;
        }

        logger.warn(
          `[Allure] Prebuilt report artifact ${preferredReportArtifact.name} did not contain index.html after extraction`
        );
      }

      // If there is no prebuilt report artifact, build one from Allure results artifacts.
      if (allureResultsArtifacts.length > 0) {
        await resetDirectory(storageDir);
        const tempRoot = path.resolve(config.storage.path, 'allure-reports', `_tmp-${runId}-${Date.now()}`);
        const mergedResultsDir = path.join(tempRoot, 'allure-results-merged');
        await fs.mkdir(mergedResultsDir, { recursive: true });

        try {
          for (const artifact of allureResultsArtifacts) {
            logger.info(`[Allure] Downloading results artifact ${artifact.id}: ${artifact.name}`);
            const artifactBuffer = await githubService.downloadArtifact(
              req.userId!,
              owner,
              repo,
              artifact.id
            );
            const extractedDir = path.join(tempRoot, `artifact-${artifact.id}`);
            await extractArtifactToDirectory(artifactBuffer, extractedDir);
            const resultsRoot = await findAllureResultsRoot(extractedDir);
            if (!resultsRoot) {
              logger.warn(`[Allure] No result JSON found in artifact ${artifact.name}, skipping`);
              continue;
            }
            await copyDirectoryRecursive(resultsRoot, mergedResultsDir);
          }

          if (await hasAllureResultFiles(mergedResultsDir)) {
            logger.info(`[Allure] Generating Allure 3 report from merged results for run ${runId}`);
            await runAllureGenerate(mergedResultsDir, storageDir);
            if (await normalizeReportRoot(storageDir)) {
              res.json({
                success: true,
                data: {
                  runId,
                  reportUrl: `/allure-reports/${runId}/index.html`,
                  extractedTo: storageDir,
                },
              });
              return;
            }
          } else {
            logger.warn(`[Allure] No merged result JSON files were found for run ${runId}`);
          }
        } finally {
          await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
        }
      }

      // Fallback: serve Playwright HTML report artifact when Allure artifacts are unavailable.
      const playwrightArtifact = selectBestArtifact(playwrightReportArtifacts);
      if (playwrightArtifact) {
        await resetDirectory(storageDir);
        logger.info(`[Allure] Falling back to Playwright report artifact ${playwrightArtifact.id}: ${playwrightArtifact.name}`);
        const playwrightBuffer = await githubService.downloadArtifact(
          req.userId!,
          owner,
          repo,
          playwrightArtifact.id
        );
        await extractArtifactToDirectory(playwrightBuffer, storageDir);
        if (await normalizeReportRoot(storageDir)) {
          res.json({
            success: true,
            data: {
              runId,
              reportUrl: `/allure-reports/${runId}/index.html`,
              extractedTo: storageDir,
            },
          });
          return;
        }
      }

      res.json({
        success: false,
        error: 'No usable report artifact found for this run',
        availableArtifacts: artifacts.map((a: any) => a.name),
      });
    } catch (error) {
      logger.error(`[Allure] Error preparing report: ${error}`);
      next(error);
    }
  }
);

/**
 * GET /api/github/runs/:runId/allure/status
 * Check if Allure report is ready for this run
 */
router.get(
  '/runs/:runId/allure/status',
  authenticateToken,
  validate([
    param('runId').isInt().withMessage('Run ID must be an integer'),
  ]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { runId } = req.params;

    const storageDir = path.resolve(config.storage.path, 'allure-reports', runId.toString());
    const indexPath = path.join(storageDir, 'index.html');

    let ready = false;
    try {
      await fs.access(indexPath);
      ready = true;
    } catch {
      ready = false;
    }

    res.json({
      success: true,
      data: {
        runId,
        ready,
        reportUrl: ready ? `/allure-reports/${runId}/index.html` : null,
      },
    });
  })
);

export { router as githubAllureRouter };
