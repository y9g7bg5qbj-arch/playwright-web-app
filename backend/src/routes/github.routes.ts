/**
 * GitHub Integration Routes
 * API endpoints for GitHub Actions workflow management
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { githubService } from '../services/github.service';
import { workflowGeneratorService } from '../services/workflowGenerator.service';
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
        inputs
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Workflow triggered successfully',
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

export { router as githubRoutes };
