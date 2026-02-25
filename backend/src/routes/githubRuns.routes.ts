/**
 * GitHub Workflow Run Routes
 * Endpoints for triggering, listing, cancelling, and re-running workflow runs,
 * plus fetching job and run logs.
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { githubService } from '../services/github.service';
import { resolve } from 'path';
import { detectProjectRoot, extractReferencedPageNames, loadReferencedPages } from './veroExecution.utils';

const router = Router();

function decodeBase64Utf8(value: string): string {
  return Buffer.from(value, 'base64').toString('utf8');
}

function encodeBase64Utf8(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64');
}

async function enrichVeroDispatchInputs(inputs?: Record<string, string>): Promise<Record<string, string> | undefined> {
  if (!inputs) return undefined;
  if (inputs.runMode !== 'vero') return inputs;
  if (inputs.veroReferencedContentB64?.trim()) return inputs;

  const encodedFeatureContent = inputs.veroContentB64?.trim();
  const veroFilePath = inputs.veroFilePath?.trim();
  if (!encodedFeatureContent || !veroFilePath) return inputs;

  let featureContent = '';
  try {
    featureContent = decodeBase64Utf8(encodedFeatureContent);
  } catch {
    return inputs;
  }

  if (!featureContent.trim()) return inputs;

  const referencedNames = extractReferencedPageNames(featureContent);
  if (referencedNames.length === 0) return inputs;

  const repoRoot = resolve(process.cwd());
  const veroProjectsRoot = resolve(repoRoot, 'vero-projects');
  const absoluteFilePath = resolve(veroProjectsRoot, veroFilePath);
  const projectRoot = detectProjectRoot(absoluteFilePath, veroProjectsRoot);

  const referencedContent = await loadReferencedPages(referencedNames, projectRoot);
  if (!referencedContent.trim()) return inputs;

  return {
    ...inputs,
    veroReferencedContentB64: encodeBase64Utf8(referencedContent),
  };
}

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
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { owner, repo, workflowPath, ref, inputs } = req.body;
    const sanitizedInputs = inputs
      ? Object.fromEntries(
          Object.entries(inputs).map(([key, value]) => [key, String(value)])
        )
      : undefined;
    const enrichedInputs = await enrichVeroDispatchInputs(sanitizedInputs);

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
      enrichedInputs
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
  })
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
  asyncHandler(async (req: AuthRequest, res: Response) => {
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
  })
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
  asyncHandler(async (req: AuthRequest, res: Response) => {
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
  })
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
  asyncHandler(async (req: AuthRequest, res: Response) => {
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
  })
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
  asyncHandler(async (req: AuthRequest, res: Response) => {
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
  })
);

// ============================================
// LOGS
// ============================================

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
  asyncHandler(async (req: AuthRequest, res: Response) => {
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
  })
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
  asyncHandler(async (req: AuthRequest, res: Response) => {
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
  })
);

export { router as githubRunsRouter };
