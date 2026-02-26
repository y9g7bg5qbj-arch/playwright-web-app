/**
 * GitHub Workflow Generation & Config Routes
 * Endpoints for generating workflow YAML, estimating execution time,
 * and managing repository configuration for Vero workflows.
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { githubService } from '../services/github.service';
import { workflowGeneratorService } from '../services/workflowGenerator.service';
import { VERO_WORKFLOW_TEMPLATE } from '../templates/veroWorkflowTemplate';

const router = Router();

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
  asyncHandler(async (req: AuthRequest, res: Response) => {
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
  })
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
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { config, options } = req.body;
    const workflow = workflowGeneratorService.generateWorkflow(config, options);

    res.json({
      success: true,
      data: workflow,
    });
  })
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
  asyncHandler(async (req: AuthRequest, res: Response) => {
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
  })
);

// ============================================
// MANAGED WORKFLOW FILE
// ============================================

/**
 * GET /api/github/workflows/check-workflow-file
 * Check whether the managed workflow YAML exists in a repo.
 */
router.get(
  '/workflows/check-workflow-file',
  authenticateToken,
  validate([
    query('owner').isString().notEmpty().withMessage('Owner is required'),
    query('repo').isString().notEmpty().withMessage('Repo is required'),
    query('branch').isString().notEmpty().withMessage('Branch is required'),
  ]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { owner, repo, branch } = req.query;

    const result = await githubService.checkWorkflowFileExists(
      req.userId!,
      owner as string,
      repo as string,
      branch as string
    );

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/github/workflows/push-workflow-file
 * Create the managed workflow YAML in a repo (create-only, no overwrite).
 */
router.post(
  '/workflows/push-workflow-file',
  authenticateToken,
  validate([
    body('owner').isString().notEmpty().withMessage('Owner is required'),
    body('repo').isString().notEmpty().withMessage('Repo is required'),
    body('branch').isString().notEmpty().withMessage('Branch is required'),
  ]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { owner, repo, branch } = req.body;

    // Check existing first — never overwrite
    const existing = await githubService.checkWorkflowFileExists(
      req.userId!,
      owner,
      repo,
      branch
    );

    if (existing.exists) {
      res.json({
        success: true,
        data: {
          sha: existing.sha,
          htmlUrl: existing.htmlUrl,
          created: false,
          updated: false,
        },
      });
      return;
    }

    const result = await githubService.pushWorkflowFile(
      req.userId!,
      owner,
      repo,
      branch,
      VERO_WORKFLOW_TEMPLATE
    );

    res.json({
      success: true,
      data: {
        sha: result.sha,
        htmlUrl: result.htmlUrl,
        created: true,
        updated: false,
      },
    });
  })
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
  asyncHandler(async (req: AuthRequest, res: Response) => {
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
  })
);

/**
 * GET /api/github/workflows/:workflowId/repo
 * Get repository configuration for a Vero workflow
 */
router.get(
  '/workflows/:workflowId/repo',
  authenticateToken,
  validate([param('workflowId').isString().notEmpty()]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { workflowId } = req.params;
    const config = await githubService.getRepositoryConfig(workflowId);

    res.json({
      success: true,
      data: config,
    });
  })
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
  asyncHandler(async (req: AuthRequest, res: Response) => {
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
  })
);

export { router as githubWorkflowsRouter };
