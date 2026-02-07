/**
 * GitHub Integration Routes
 * API endpoints for GitHub Actions workflow management
 */

import { Router, Response, Request } from 'express';
import { body, param, query, header } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { githubService } from '../services/github.service';
import { workflowGeneratorService } from '../services/workflowGenerator.service';
import { auditService } from '../services/audit.service';
import { logger } from '../utils/logger';
import { config } from '../config';
import crypto from 'crypto';
import type { RunConfiguration } from '@playwright-web-app/shared';

const router = Router();

// ============================================
// INTEGRATION MANAGEMENT
// ============================================

/**
 * GET /api/github/integration
 * Get user's GitHub integration status
 */
router.get('/integration', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  try {
    const integration = await githubService.getIntegration(req.userId!);
    res.json({
      success: true,
      data: integration,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/github/connect
 * Connect GitHub with a Personal Access Token
 */
router.post(
  '/connect',
  authenticateToken,
  validate([
    body('token').isString().notEmpty().withMessage('Token is required'),
    body('tokenType').optional().isIn(['pat', 'oauth']).withMessage('Invalid token type'),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { token, tokenType = 'pat' } = req.body;

      const encryptionKey = (process.env.GITHUB_TOKEN_ENCRYPTION_KEY || '').trim();
      if (!encryptionKey) {
        res.status(503).json({
          success: false,
          error: 'GitHub integration is disabled until GITHUB_TOKEN_ENCRYPTION_KEY is configured',
        });
        return;
      }
      if (encryptionKey.length < 32) {
        res.status(503).json({
          success: false,
          error: 'GitHub integration requires GITHUB_TOKEN_ENCRYPTION_KEY to be at least 32 characters',
        });
        return;
      }

      // Validate the token
      const validation = await githubService.validateToken(token);
      if (!validation.valid || !validation.user) {
        res.status(400).json({
          success: false,
          error: validation.error || 'Invalid GitHub token',
        });
        return;
      }

      // Save the integration
      const integration = await githubService.saveIntegration(
        req.userId!,
        token,
        tokenType,
        validation.user
      );

      // Don't send the encrypted token back
      const { accessToken, ...safeIntegration } = integration;

      res.json({
        success: true,
        data: safeIntegration,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/github/disconnect
 * Disconnect GitHub integration
 */
router.delete('/disconnect', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  try {
    await githubService.deleteIntegration(req.userId!);
    res.json({
      success: true,
      message: 'GitHub disconnected successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/github/validate-token
 * Validate a GitHub token without saving
 */
router.post(
  '/validate-token',
  authenticateToken,
  validate([body('token').isString().notEmpty().withMessage('Token is required')]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { token } = req.body;
      const validation = await githubService.validateToken(token);

      res.json({
        success: true,
        data: {
          valid: validation.valid,
          login: validation.user?.login,
          avatarUrl: validation.user?.avatar_url,
          error: validation.error,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// REPOSITORY MANAGEMENT
// ============================================

/**
 * GET /api/github/repos
 * List user's GitHub repositories
 */
router.get('/repos', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  try {
    const repos = await githubService.listRepositories(req.userId!);
    res.json({
      success: true,
      data: repos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        private: repo.private,
        defaultBranch: repo.default_branch,
        htmlUrl: repo.html_url,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/github/repos/:owner/:repo/branches
 * Get branches for a repository
 */
router.get(
  '/repos/:owner/:repo/branches',
  authenticateToken,
  validate([
    param('owner').isString().notEmpty(),
    param('repo').isString().notEmpty(),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { owner, repo } = req.params;
      const branches = await githubService.getRepoBranches(req.userId!, owner, repo);
      res.json({
        success: true,
        data: branches,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// WORKFLOW GENERATION
// ============================================

/**
 * POST /api/github/workflows/generate
 * Generate a GitHub Actions workflow YAML
 */
router.post(
  '/workflows/generate',
  authenticateToken,
  validate([
    body('config').isObject().withMessage('Configuration is required'),
    body('options').optional().isObject(),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { config, options } = req.body;

      // Validate the configuration
      const validation = workflowGeneratorService.validateConfig(config);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          errors: validation.errors,
        });
        return;
      }

      const workflow = workflowGeneratorService.generateWorkflow(config, options);

      res.json({
        success: true,
        data: workflow,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/github/workflows/preview
 * Preview the generated workflow without validation
 */
router.post(
  '/workflows/preview',
  authenticateToken,
  validate([
    body('config').isObject().withMessage('Configuration is required'),
    body('options').optional().isObject(),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { config, options } = req.body;
      const workflow = workflowGeneratorService.generateWorkflow(config, options);

      res.json({
        success: true,
        data: workflow,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/github/workflows/estimate
 * Estimate execution time for a configuration
 */
router.post(
  '/workflows/estimate',
  authenticateToken,
  validate([
    body('testCount').isInt({ min: 1 }).withMessage('Test count must be at least 1'),
    body('avgTestDuration').isFloat({ min: 1 }).withMessage('Average test duration must be positive'),
    body('config').isObject().withMessage('GitHub Actions configuration is required'),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { testCount, avgTestDuration, config } = req.body;

      const estimate = workflowGeneratorService.estimateExecutionTime(
        testCount,
        avgTestDuration,
        config
      );

      res.json({
        success: true,
        data: estimate,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// WORKFLOW RUNS
// ============================================

/**
 * POST /api/github/runs/trigger
 * Trigger a workflow run
 */
router.post(
  '/runs/trigger',
  authenticateToken,
  validate([
    body('owner').isString().notEmpty().withMessage('Owner is required'),
    body('repo').isString().notEmpty().withMessage('Repo is required'),
    body('workflowPath').isString().notEmpty().withMessage('Workflow path is required'),
    body('ref').optional().isString(),
    body('inputs').optional().isObject(),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { owner, repo, workflowPath, ref, inputs } = req.body;
      const sanitizedInputs = inputs
        ? Object.fromEntries(
            Object.entries(inputs).map(([key, value]) => [key, String(value)])
          )
        : undefined;

      // Get default branch if ref not provided
      let targetRef = ref;
      if (!targetRef) {
        const branches = await githubService.getRepoBranches(req.userId!, owner, repo);
        targetRef = branches.includes('main') ? 'main' : 'master';
      }

      const result = await githubService.triggerWorkflow(
        req.userId!,
        owner,
        repo,
        workflowPath,
        targetRef,
        sanitizedInputs
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
          data: { success: false, error: result.error },
        });
        return;
      }

      res.json({
        success: true,
        data: { success: true },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/github/runs
 * List workflow runs for a repository
 */
router.get(
  '/runs',
  authenticateToken,
  validate([
    query('owner').isString().notEmpty().withMessage('Owner is required'),
    query('repo').isString().notEmpty().withMessage('Repo is required'),
    query('workflowId').optional().isString(),
    query('branch').optional().isString(),
    query('status').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { owner, repo, workflowId, branch, status, limit } = req.query;

      const runs = await githubService.listWorkflowRuns(req.userId!, owner as string, repo as string, {
        workflowId: workflowId as string | undefined,
        branch: branch as string | undefined,
        status: status as string | undefined,
        perPage: limit ? parseInt(limit as string, 10) : 10,
      });

      res.json({
        success: true,
        data: runs.map((run) => ({
          id: run.id,
          name: run.name,
          runNumber: run.run_number,
          status: run.status,
          conclusion: run.conclusion,
          htmlUrl: run.html_url,
          event: run.event,
          headBranch: run.head_branch,
          headSha: run.head_sha,
          createdAt: run.created_at,
          updatedAt: run.updated_at,
        })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes('github not connected')) {
        res.json({
          success: true,
          data: [],
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * GET /api/github/runs/:runId
 * Get details of a specific workflow run
 */
router.get(
  '/runs/:runId',
  authenticateToken,
  validate([
    param('runId').isInt().withMessage('Run ID must be an integer'),
    query('owner').isString().notEmpty().withMessage('Owner is required'),
    query('repo').isString().notEmpty().withMessage('Repo is required'),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { runId } = req.params;
      const { owner, repo } = req.query;

      const run = await githubService.getWorkflowRun(
        req.userId!,
        owner as string,
        repo as string,
        parseInt(runId, 10)
      );

      res.json({
        success: true,
        data: {
          id: run.id,
          name: run.name,
          runNumber: run.run_number,
          status: run.status,
          conclusion: run.conclusion,
          htmlUrl: run.html_url,
          event: run.event,
          headBranch: run.head_branch,
          headSha: run.head_sha,
          createdAt: run.created_at,
          updatedAt: run.updated_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/github/runs/:runId/jobs
 * Get jobs for a workflow run (shards)
 */
router.get(
  '/runs/:runId/jobs',
  authenticateToken,
  validate([
    param('runId').isInt().withMessage('Run ID must be an integer'),
    query('owner').isString().notEmpty().withMessage('Owner is required'),
    query('repo').isString().notEmpty().withMessage('Repo is required'),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { runId } = req.params;
      const { owner, repo } = req.query;

      const jobs = await githubService.getWorkflowJobs(
        req.userId!,
        owner as string,
        repo as string,
        parseInt(runId, 10)
      );

      res.json({
        success: true,
        data: jobs.map((job) => ({
          id: job.id,
          name: job.name,
          status: job.status,
          conclusion: job.conclusion,
          htmlUrl: job.html_url,
          runnerName: job.runner_name,
          startedAt: job.started_at,
          completedAt: job.completed_at,
          steps: job.steps?.map((step) => ({
            name: step.name,
            status: step.status,
            conclusion: step.conclusion,
            number: step.number,
            startedAt: step.started_at,
            completedAt: step.completed_at,
          })),
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/github/runs/:runId/cancel
 * Cancel a workflow run
 */
router.post(
  '/runs/:runId/cancel',
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

      const success = await githubService.cancelWorkflowRun(
        req.userId!,
        owner,
        repo,
        parseInt(runId, 10)
      );

      if (!success) {
        res.status(400).json({
          success: false,
          error: 'Failed to cancel workflow run',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Workflow run cancelled',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/github/runs/:runId/rerun
 * Re-run a workflow
 */
router.post(
  '/runs/:runId/rerun',
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

      const success = await githubService.rerunWorkflow(
        req.userId!,
        owner,
        repo,
        parseInt(runId, 10)
      );

      if (!success) {
        res.status(400).json({
          success: false,
          error: 'Failed to re-run workflow',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Workflow re-run triggered',
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// ARTIFACTS
// ============================================

/**
 * GET /api/github/runs/:runId/artifacts
 * List artifacts for a workflow run
 */
router.get(
  '/runs/:runId/artifacts',
  authenticateToken,
  validate([
    param('runId').isInt().withMessage('Run ID must be an integer'),
    query('owner').isString().notEmpty().withMessage('Owner is required'),
    query('repo').isString().notEmpty().withMessage('Repo is required'),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { runId } = req.params;
      const { owner, repo } = req.query;

      const artifacts = await githubService.listArtifacts(
        req.userId!,
        owner as string,
        repo as string,
        parseInt(runId, 10)
      );

      res.json({
        success: true,
        data: artifacts.map((artifact) => ({
          id: artifact.id,
          name: artifact.name,
          sizeInBytes: artifact.size_in_bytes,
          expired: artifact.expired,
          createdAt: artifact.created_at,
          expiresAt: artifact.expires_at,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/github/artifacts/:artifactId/download
 * Download an artifact
 */
router.get(
  '/artifacts/:artifactId/download',
  authenticateToken,
  validate([
    param('artifactId').isInt().withMessage('Artifact ID must be an integer'),
    query('owner').isString().notEmpty().withMessage('Owner is required'),
    query('repo').isString().notEmpty().withMessage('Repo is required'),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { artifactId } = req.params;
      const { owner, repo } = req.query;

      const buffer = await githubService.downloadArtifact(
        req.userId!,
        owner as string,
        repo as string,
        parseInt(artifactId, 10)
      );

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=artifact-${artifactId}.zip`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/github/runs/:runId/trace/open
 * Download trace artifact and launch Playwright Trace Viewer
 */
router.post(
  '/runs/:runId/trace/open',
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
      const AdmZip = require('adm-zip');
      const { spawn } = require('child_process');
      const path = require('path');
      const fs = require('fs');
      const os = require('os');

      logger.info(`[TraceViewer] Opening trace for run ${runId}, owner=${owner}, repo=${repo}`);

      // Get artifacts for this run
      const artifacts = await githubService.listArtifacts(
        req.userId!,
        owner as string,
        repo as string,
        parseInt(runId, 10)
      );

      // Find trace artifact (usually named 'playwright-trace' or contains 'trace')
      const traceArtifact = artifacts.find((a) =>
        a.name.includes('trace') ||
        a.name.includes('playwright-trace') ||
        a.name.includes('test-results')
      );

      if (!traceArtifact) {
        res.status(404).json({
          success: false,
          error: 'No trace artifact found for this run',
        });
        return;
      }

      logger.info(`[TraceViewer] Found trace artifact: ${traceArtifact.name} (${traceArtifact.id})`);

      // Download the artifact
      const buffer = await githubService.downloadArtifact(
        req.userId!,
        owner as string,
        repo as string,
        traceArtifact.id
      );

      // Create temp directory for traces
      const tempDir = path.join(os.tmpdir(), 'vero-traces', `run-${runId}`);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Extract the artifact
      const zip = new AdmZip(buffer);
      zip.extractAllTo(tempDir, true);

      logger.info(`[TraceViewer] Extracted traces to ${tempDir}`);

      // Find .zip trace files (Playwright traces are .zip files within the artifact)
      const findTraceFiles = (dir: string): string[] => {
        const files: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            files.push(...findTraceFiles(fullPath));
          } else if (entry.name.endsWith('.zip') && entry.name.includes('trace')) {
            files.push(fullPath);
          }
        }
        return files;
      };

      const traceFiles = findTraceFiles(tempDir);

      if (traceFiles.length === 0) {
        // Try to find any .zip file as a fallback
        const allZips = findTraceFiles(tempDir).length === 0
          ? fs.readdirSync(tempDir, { recursive: true })
            .filter((f: string) => f.endsWith('.zip'))
            .map((f: string) => path.join(tempDir, f))
          : [];

        if (allZips.length === 0) {
          res.status(404).json({
            success: false,
            error: 'No trace files found in artifact. The run may not have generated traces.',
          });
          return;
        }
      }

      // Use the first trace file (or all of them)
      const traceFile = traceFiles[0] || path.join(tempDir, 'trace.zip');

      logger.info(`[TraceViewer] Launching trace viewer for: ${traceFile}`);

      // Launch Playwright Trace Viewer
      const child = spawn('npx', ['playwright', 'show-trace', traceFile], {
        detached: true,
        stdio: 'ignore',
        cwd: process.cwd(),
      });

      // Detach the child process so it runs independently
      child.unref();

      res.json({
        success: true,
        message: 'Trace Viewer launched',
        data: {
          tracePath: traceFile,
          traceFiles: traceFiles,
        },
      });
    } catch (error) {
      logger.error(`[TraceViewer] Error: ${error}`);
      next(error);
    }
  }
);

/**
 * GET /api/github/runs/:runId/report
 * Get parsed test report from a workflow run's artifacts
 */
router.get(
  '/runs/:runId/report',
  authenticateToken,
  validate([
    param('runId').isInt().withMessage('Run ID must be an integer'),
    query('owner').isString().notEmpty().withMessage('Owner is required'),
    query('repo').isString().notEmpty().withMessage('Repo is required'),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { runId } = req.params;
      const { owner, repo } = req.query;
      const AdmZip = require('adm-zip');

      logger.info(`[GitHub Report] Fetching report for run ${runId}, owner=${owner}, repo=${repo}`);

      // Get artifacts for this run
      const artifacts = await githubService.listArtifacts(
        req.userId!,
        owner as string,
        repo as string,
        parseInt(runId, 10)
      );

      // Find the JSON results artifact first, then fall back to HTML report
      // Prioritize test-results (contains JSON) over playwright-report (HTML only)
      const reportArtifact = artifacts.find((a) => a.name.includes('test-results-shard'))
        || artifacts.find((a) => a.name.includes('test-results'))
        || artifacts.find((a) => a.name.includes('playwright-report'));

      logger.info(`[GitHub Report] Found artifacts: ${artifacts.map((a: any) => a.name).join(', ')}`);
      logger.info(`[GitHub Report] Selected artifact: ${reportArtifact?.name || 'none'}`);

      if (!reportArtifact) {
        res.json({
          success: true,
          data: null,
          message: 'No report artifact found',
        });
        return;
      }

      // Download the artifact
      logger.info(`[GitHub Report] Downloading artifact ${reportArtifact.id}: ${reportArtifact.name}`);
      const buffer = await githubService.downloadArtifact(
        req.userId!,
        owner as string,
        repo as string,
        reportArtifact.id
      );
      logger.info(`[GitHub Report] Downloaded ${buffer.length} bytes`);

      // Extract and parse the report
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();
      logger.info(`[GitHub Report] ZIP has ${entries.length} entries: ${entries.map((e: any) => e.entryName).join(', ')}`);

      // Look for JSON report files
      let reportData: any = null;
      let scenarios: any[] = [];

      for (const entry of entries) {
        const entryName = entry.entryName.toLowerCase();

        // Playwright JSON report
        if (entryName.endsWith('.json') && !entry.isDirectory) {
          try {
            logger.info(`[GitHub Report] Parsing JSON file: ${entry.entryName}`);
            const content = entry.getData().toString('utf8');
            const jsonData = JSON.parse(content);

            // Check if this is a Playwright report
            if (jsonData.suites || jsonData.stats) {
              reportData = jsonData;
              logger.info(`[GitHub Report] Found Playwright report with ${jsonData.suites?.length || 0} suites`);

              // Parse Playwright report format
              if (jsonData.suites) {
                scenarios = parsePlaywrightSuites(jsonData.suites);
              }
              break;
            }
          } catch (parseError) {
            logger.warn(`[GitHub Report] Failed to parse ${entry.entryName}: ${parseError}`);
          }
        }
      }

      // Calculate summary stats
      const summary = {
        total: scenarios.length,
        passed: scenarios.filter((s) => s.status === 'passed').length,
        failed: scenarios.filter((s) => s.status === 'failed').length,
        skipped: scenarios.filter((s) => s.status === 'skipped').length,
        duration: scenarios.reduce((sum, s) => sum + (s.duration || 0), 0),
      };

      logger.info(`[GitHub Report] Parsed ${scenarios.length} scenarios: ${summary.passed} passed, ${summary.failed} failed`);

      res.json({
        success: true,
        data: {
          summary,
          scenarios,
          raw: reportData,
        },
      });
    } catch (error) {
      logger.error(`[GitHub Report] Error: ${error}`);
      next(error);
    }
  }
);

/**
 * Parse Playwright test suites into our scenario format
 */
function parsePlaywrightSuites(suites: any[], parentName = ''): any[] {
  const scenarios: any[] = [];

  for (const suite of suites) {
    const suiteName = parentName ? `${parentName} > ${suite.title}` : suite.title;

    // Parse specs (test cases)
    if (suite.specs) {
      for (const spec of suite.specs) {
        const scenario: any = {
          id: spec.id || `spec-${Math.random().toString(36).substr(2, 9)}`,
          name: `${suiteName} > ${spec.title}`,
          status: 'passed',
          duration: 0,
          steps: [],
          error: undefined,
          screenshot: undefined,  // Evidence or failure screenshot
          traceUrl: undefined,
        };

        // Get results from tests
        if (spec.tests) {
          for (const test of spec.tests) {
            // Get the first result (or retry results)
            const results = test.results || [];
            for (const result of results) {
              scenario.duration += result.duration || 0;

              // Set status based on result
              if (result.status === 'failed' || result.status === 'timedOut') {
                scenario.status = 'failed';
                if (result.error) {
                  scenario.error = result.error.message || result.error.snippet || String(result.error);
                }
              } else if (result.status === 'skipped') {
                if (scenario.status !== 'failed') {
                  scenario.status = 'skipped';
                }
              }

              // Parse steps with screenshot extraction
              if (result.steps) {
                scenario.steps = result.steps.map((step: any, index: number) => {
                  const stepData: any = {
                    id: `step-${index}`,
                    stepNumber: index + 1,
                    action: step.category || 'action',
                    description: step.title,
                    status: step.error ? 'failed' : 'passed',
                    duration: step.duration || 0,
                    error: step.error?.message,
                  };

                  // Check if this step has attachments (screenshots)
                  if (step.attachments) {
                    const screenshotAtt = step.attachments.find(
                      (a: any) => a.contentType?.includes('image') || a.name?.includes('screenshot')
                    );
                    if (screenshotAtt) {
                      // Convert path to base64 data URL if body is available
                      if (screenshotAtt.body) {
                        stepData.screenshot = `data:image/png;base64,${screenshotAtt.body}`;
                      } else if (screenshotAtt.path) {
                        stepData.screenshot = screenshotAtt.path;
                      }
                    }
                  }

                  return stepData;
                });
              }

              // Get attachments (screenshots, traces) at result level
              if (result.attachments) {
                scenario.attachments = result.attachments.map((att: any) => ({
                  name: att.name,
                  path: att.path,
                  contentType: att.contentType,
                  body: att.body, // Base64 encoded body if available
                }));

                // Extract screenshot - prioritize evidence-screenshot, then any screenshot
                const evidenceScreenshot = result.attachments.find(
                  (a: any) => a.name === 'evidence-screenshot' || a.name?.includes('evidence')
                );
                const failureScreenshot = result.attachments.find(
                  (a: any) => a.name === 'screenshot' || a.name?.includes('failure') || a.name?.includes('screenshot')
                );
                const anyScreenshot = result.attachments.find(
                  (a: any) => a.contentType?.includes('image')
                );

                const screenshotAtt = evidenceScreenshot || failureScreenshot || anyScreenshot;
                if (screenshotAtt) {
                  // Convert to base64 data URL if body is available
                  if (screenshotAtt.body) {
                    scenario.screenshot = `data:image/png;base64,${screenshotAtt.body}`;
                  } else if (screenshotAtt.path) {
                    scenario.screenshot = screenshotAtt.path;
                  }
                }

                // Check for trace
                const traceAtt = result.attachments.find(
                  (a: any) => a.name === 'trace' || a.contentType?.includes('trace')
                );
                if (traceAtt) {
                  scenario.traceUrl = traceAtt.path;
                }
              }
            }
          }
        }

        scenarios.push(scenario);
      }
    }

    // Recursively parse nested suites
    if (suite.suites) {
      scenarios.push(...parsePlaywrightSuites(suite.suites, suiteName));
    }
  }

  return scenarios;
}

// ============================================
// REPOSITORY CONFIG
// ============================================

/**
 * POST /api/github/workflows/:workflowId/repo
 * Save repository configuration for a Vero workflow
 */
router.post(
  '/workflows/:workflowId/repo',
  authenticateToken,
  validate([
    param('workflowId').isString().notEmpty(),
    body('repoFullName').isString().notEmpty().withMessage('Repository full name is required'),
    body('repoId').isInt().withMessage('Repository ID is required'),
    body('defaultBranch').optional().isString(),
    body('workflowPath').optional().isString(),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { workflowId } = req.params;
      const { repoFullName, repoId, defaultBranch = 'main', workflowPath = '.github/workflows/vero-tests.yml' } = req.body;

      const config = await githubService.saveRepositoryConfig(
        req.userId!,
        workflowId,
        repoFullName,
        repoId,
        defaultBranch,
        workflowPath
      );

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/github/workflows/:workflowId/repo
 * Get repository configuration for a Vero workflow
 */
router.get(
  '/workflows/:workflowId/repo',
  authenticateToken,
  validate([param('workflowId').isString().notEmpty()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { workflowId } = req.params;
      const config = await githubService.getRepositoryConfig(workflowId);

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/github/workflows/:workflowId/runs
 * Get tracked workflow runs for a Vero workflow
 */
router.get(
  '/workflows/:workflowId/runs',
  authenticateToken,
  validate([
    param('workflowId').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { workflowId } = req.params;
      const { limit } = req.query;

      const runs = await githubService.getTrackedRuns(
        workflowId,
        limit ? parseInt(limit as string, 10) : 20
      );

      res.json({
        success: true,
        data: runs.map((run) => ({
          id: run.id,
          runId: run.runId.toString(),
          runNumber: run.runNumber,
          status: run.status,
          conclusion: run.conclusion,
          htmlUrl: run.htmlUrl,
          event: run.event,
          headBranch: run.headBranch,
          headSha: run.headSha,
          startedAt: run.startedAt?.toISOString(),
          completedAt: run.completedAt?.toISOString(),
          createdAt: run.createdAt.toISOString(),
          jobs: run.jobs?.map((job) => ({
            id: job.id,
            jobId: job.jobId.toString(),
            name: job.name,
            status: job.status,
            conclusion: job.conclusion,
            htmlUrl: job.htmlUrl,
            runnerName: job.runnerName,
            startedAt: job.startedAt?.toISOString(),
            completedAt: job.completedAt?.toISOString(),
          })),
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/github/jobs/:jobId/logs
 * Get logs for a specific job
 */
router.get(
  '/jobs/:jobId/logs',
  authenticateToken,
  validate([
    param('jobId').isString().notEmpty(),
    query('owner').isString().notEmpty(),
    query('repo').isString().notEmpty(),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { jobId } = req.params;
      const { owner, repo } = req.query;

      const logs = await githubService.getJobLogs(
        req.userId!,
        owner as string,
        repo as string,
        parseInt(jobId, 10)
      );

      res.json({
        success: true,
        data: {
          logs,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/github/runs/:runId/logs
 * Get logs for an entire workflow run
 */
router.get(
  '/runs/:runId/logs',
  authenticateToken,
  validate([
    param('runId').isString().notEmpty(),
    query('owner').isString().notEmpty(),
    query('repo').isString().notEmpty(),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { runId } = req.params;
      const { owner, repo } = req.query;

      const logs = await githubService.getRunLogs(
        req.userId!,
        owner as string,
        repo as string,
        parseInt(runId, 10)
      );

      res.json({
        success: true,
        data: {
          logs,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

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
      const AdmZip = require('adm-zip');
      const fs = require('fs').promises;
      const path = require('path');

      logger.info(`[Allure] Preparing report for run ${runId}`);

      // Get artifacts for this run
      const artifacts = await githubService.listArtifacts(
        req.userId!,
        owner,
        repo,
        parseInt(runId, 10)
      );

      // Find Allure or Playwright report artifact(s) - fallback to Playwright if Allure not available
      let reportArtifacts = artifacts.filter((a: any) =>
        a.name.includes('allure-report') ||
        a.name.includes('allure-results')
      );

      // Fallback to Playwright HTML report if no Allure artifacts
      if (reportArtifacts.length === 0) {
        reportArtifacts = artifacts.filter((a: any) =>
          a.name.includes('playwright-report')
        );
        logger.info(`[Allure] No Allure artifacts found, falling back to Playwright report`);
      }

      logger.info(`[Allure] Found ${reportArtifacts.length} report artifacts: ${reportArtifacts.map((a: any) => a.name).join(', ')}`);

      if (reportArtifacts.length === 0) {
        res.json({
          success: false,
          error: 'No report artifact found (neither Allure nor Playwright HTML)',
          availableArtifacts: artifacts.map((a: any) => a.name),
        });
        return;
      }

      // Use the best report artifact (prefer allure-report-merged, then any allure-report, then playwright-report-merged, then shard)
      const reportArtifact = reportArtifacts.find((a: any) => a.name === 'allure-report-merged')
        || reportArtifacts.find((a: any) => a.name.includes('allure-report'))
        || reportArtifacts.find((a: any) => a.name === 'playwright-report-merged')
        || reportArtifacts[0];

      // Download the artifact
      logger.info(`[Allure] Downloading artifact ${reportArtifact.id}: ${reportArtifact.name}`);
      const buffer = await githubService.downloadArtifact(
        req.userId!,
        owner,
        repo,
        reportArtifact.id
      );

      // Create storage directory for this run's Allure report
      const storageDir = path.resolve(config.storage.path, 'allure-reports', runId.toString());
      await fs.mkdir(storageDir, { recursive: true });

      // Extract zip to storage directory
      const zip = new AdmZip(buffer);
      zip.extractAllTo(storageDir, true);

      logger.info(`[Allure] Extracted report to ${storageDir}`);

      // Check if index.html exists (may be in a subdirectory)
      let indexPath = path.join(storageDir, 'index.html');
      try {
        await fs.access(indexPath);
      } catch {
        // Try to find index.html in subdirectories
        const entries = await fs.readdir(storageDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subIndexPath = path.join(storageDir, entry.name, 'index.html');
            try {
              await fs.access(subIndexPath);
              // Move contents up one level
              const subDir = path.join(storageDir, entry.name);
              const subEntries = await fs.readdir(subDir);
              for (const subEntry of subEntries) {
                await fs.rename(
                  path.join(subDir, subEntry),
                  path.join(storageDir, subEntry)
                );
              }
              await fs.rmdir(subDir);
              break;
            } catch {
              continue;
            }
          }
        }
      }

      res.json({
        success: true,
        data: {
          runId,
          reportUrl: `/allure-reports/${runId}/index.html`,
          extractedTo: storageDir,
        },
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
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { runId } = req.params;
      const fs = require('fs').promises;
      const path = require('path');

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
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// GITHUB WEBHOOKS
// ============================================

// GitHub webhook secret from environment
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubSignature(payload: string, signature: string | undefined): boolean {
  if (!GITHUB_WEBHOOK_SECRET || !signature) {
    // If no secret configured, skip verification (development mode)
    if (!GITHUB_WEBHOOK_SECRET) {
      logger.warn('GitHub webhook secret not configured - skipping signature verification');
      return true;
    }
    return false;
  }

  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', GITHUB_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    // Buffers have different lengths
    return false;
  }
}

/**
 * POST /api/github/webhooks/workflow_run
 * Handle GitHub workflow_run webhook events
 * This endpoint receives notifications when GitHub Actions workflows complete
 */
router.post(
  '/webhooks/workflow_run',
  async (req: Request, res: Response, next) => {
    try {
      const signature = req.headers['x-hub-signature-256'] as string | undefined;
      const event = req.headers['x-github-event'] as string;
      const deliveryId = req.headers['x-github-delivery'] as string;
      const payload = JSON.stringify(req.body);

      // Verify signature
      if (!verifyGitHubSignature(payload, signature)) {
        logger.warn(`GitHub webhook signature verification failed for delivery ${deliveryId}`);
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      // Only handle workflow_run events
      if (event !== 'workflow_run') {
        logger.debug(`Ignoring GitHub webhook event: ${event}`);
        res.json({ success: true, message: 'Event type not handled' });
        return;
      }

      const { action, workflow_run, repository } = req.body;
      logger.info(`GitHub webhook: workflow_run ${action} - ${workflow_run?.name} #${workflow_run?.run_number}`);

      // Audit log the webhook
      await auditService.logGitHubWebhook('webhook_received', deliveryId || 'unknown', {
        event,
        action,
        runId: workflow_run?.id,
        runNumber: workflow_run?.run_number,
        repository: repository?.full_name,
        status: workflow_run?.status,
        conclusion: workflow_run?.conclusion,
      });

      // Handle different workflow_run actions
      if (action === 'completed') {
        // Workflow run completed - update our tracked run if exists
        await handleWorkflowRunCompleted(workflow_run, repository);
      } else if (action === 'requested' || action === 'in_progress') {
        // Workflow started or in progress - update status
        await handleWorkflowRunProgress(workflow_run, repository, action);
      }

      res.json({ success: true, message: `Handled workflow_run ${action}` });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/github/webhooks/check_run
 * Handle GitHub check_run webhook events
 */
router.post(
  '/webhooks/check_run',
  async (req: Request, res: Response, next) => {
    try {
      const signature = req.headers['x-hub-signature-256'] as string | undefined;
      const event = req.headers['x-github-event'] as string;
      const deliveryId = req.headers['x-github-delivery'] as string;
      const payload = JSON.stringify(req.body);

      // Verify signature
      if (!verifyGitHubSignature(payload, signature)) {
        logger.warn(`GitHub webhook signature verification failed for delivery ${deliveryId}`);
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      if (event !== 'check_run') {
        res.json({ success: true, message: 'Event type not handled' });
        return;
      }

      const { action, check_run, repository } = req.body;
      logger.info(`GitHub webhook: check_run ${action} - ${check_run?.name}`);

      // Audit log
      await auditService.logGitHubWebhook('webhook_received', deliveryId || 'unknown', {
        event,
        action,
        checkRunId: check_run?.id,
        repository: repository?.full_name,
        status: check_run?.status,
        conclusion: check_run?.conclusion,
      });

      res.json({ success: true, message: `Handled check_run ${action}` });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/github/webhooks
 * Generic webhook handler - routes to specific handlers based on event type
 */
router.post(
  '/webhooks',
  async (req: Request, res: Response, next) => {
    try {
      const signature = req.headers['x-hub-signature-256'] as string | undefined;
      const event = req.headers['x-github-event'] as string;
      const deliveryId = req.headers['x-github-delivery'] as string;
      const payload = JSON.stringify(req.body);

      // Verify signature
      if (!verifyGitHubSignature(payload, signature)) {
        logger.warn(`GitHub webhook signature verification failed for delivery ${deliveryId}`);
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      logger.info(`GitHub webhook received: ${event} (delivery: ${deliveryId})`);

      // Audit log all webhooks
      await auditService.logGitHubWebhook('webhook_received', deliveryId || 'unknown', {
        event,
        repositoryFullName: req.body.repository?.full_name,
      });

      // Route to appropriate handler based on event type
      switch (event) {
        case 'workflow_run': {
          const { action, workflow_run, repository } = req.body;
          if (action === 'completed') {
            await handleWorkflowRunCompleted(workflow_run, repository);
          } else if (action === 'requested' || action === 'in_progress') {
            await handleWorkflowRunProgress(workflow_run, repository, action);
          }
          break;
        }
        case 'check_run': {
          // Handle check runs if needed
          break;
        }
        case 'ping': {
          logger.info('GitHub webhook ping received');
          break;
        }
        default:
          logger.debug(`Unhandled GitHub event type: ${event}`);
      }

      res.json({ success: true, event, deliveryId });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Handle workflow_run completed event
 */
async function handleWorkflowRunCompleted(workflowRun: any, repository: any): Promise<void> {
  if (!workflowRun || !repository) return;

  const repoFullName = repository.full_name;
  const runId = workflowRun.id;

  try {
    // Find if we have a tracked run for this workflow
    const { githubWorkflowRunRepository, executionRepository } = await import('../db/repositories/mongo');

    const trackedRun = await githubWorkflowRunRepository.findByRunIdAndRepo(BigInt(runId), repoFullName);

    if (trackedRun) {
      // Update the tracked run with completion status
      await githubWorkflowRunRepository.update(trackedRun.id, {
        status: workflowRun.status,
        conclusion: workflowRun.conclusion,
        completedAt: workflowRun.updated_at ? new Date(workflowRun.updated_at) : new Date(),
      });

      logger.info(`Updated tracked workflow run ${trackedRun.id} with status: ${workflowRun.conclusion}`);

      // If this run is linked to a Vero execution, update that too
      if (trackedRun.executionId) {
        await executionRepository.update(trackedRun.executionId, {
          status: workflowRun.conclusion === 'success' ? 'passed' : 'failed',
          finishedAt: new Date(),
        });
      }
    }
  } catch (error) {
    logger.error('Error handling workflow_run completed:', error);
  }
}

/**
 * Handle workflow_run progress event (requested or in_progress)
 */
async function handleWorkflowRunProgress(workflowRun: any, repository: any, action: string): Promise<void> {
  if (!workflowRun || !repository) return;

  const repoFullName = repository.full_name;
  const runId = workflowRun.id;

  try {
    const { githubWorkflowRunRepository } = await import('../db/repositories/mongo');

    // Update status if we're tracking this run
    const trackedRun = await githubWorkflowRunRepository.findByRunIdAndRepo(BigInt(runId), repoFullName);

    if (trackedRun) {
      await githubWorkflowRunRepository.update(trackedRun.id, {
        status: action === 'in_progress' ? 'in_progress' : 'queued',
        startedAt: action === 'in_progress' ? new Date() : undefined,
      });

      logger.info(`Updated tracked workflow run ${trackedRun.id} status to: ${action}`);
    }
  } catch (error) {
    logger.error('Error handling workflow_run progress:', error);
  }
}

export { router as githubRoutes };
