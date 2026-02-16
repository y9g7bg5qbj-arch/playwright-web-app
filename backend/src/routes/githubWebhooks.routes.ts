/**
 * GitHub Webhook Routes
 * Endpoints for receiving and processing GitHub webhook events
 * (workflow_run, check_run, and generic webhook handler).
 */

import { Router, Response, Request } from 'express';
import express from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../middleware/asyncHandler';
import { auditService } from '../services/audit.service';
import { logger } from '../utils/logger';

// Extend Request to carry the raw body captured during JSON parsing
interface WebhookRequest extends Request {
    rawBody?: string;
}

const router = Router();

// Capture raw body for HMAC verification before JSON parsing alters it.
// This middleware replaces the global express.json() for webhook routes.
router.use(express.json({
    verify: (req: WebhookRequest, _res, buf) => {
        req.rawBody = buf.toString('utf-8');
    },
}));

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
  asyncHandler(async (req: WebhookRequest, res: Response) => {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const event = req.headers['x-github-event'] as string;
    const deliveryId = req.headers['x-github-delivery'] as string;
    const payload = req.rawBody || JSON.stringify(req.body);

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
  })
);

/**
 * POST /api/github/webhooks/check_run
 * Handle GitHub check_run webhook events
 */
router.post(
  '/webhooks/check_run',
  asyncHandler(async (req: WebhookRequest, res: Response) => {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const event = req.headers['x-github-event'] as string;
    const deliveryId = req.headers['x-github-delivery'] as string;
    const payload = req.rawBody || JSON.stringify(req.body);

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
  })
);

/**
 * POST /api/github/webhooks
 * Generic webhook handler - routes to specific handlers based on event type
 */
router.post(
  '/webhooks',
  asyncHandler(async (req: WebhookRequest, res: Response) => {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const event = req.headers['x-github-event'] as string;
    const deliveryId = req.headers['x-github-delivery'] as string;
    const payload = req.rawBody || JSON.stringify(req.body);

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
  })
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
    const { githubWorkflowRunRepository, executionRepository, scheduleRunRepository } = await import('../db/repositories/mongo');

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

    // Phase 4: Also update any schedule run linked to this GitHub run ID.
    // Schedule runs dispatched to GitHub have a `githubRunId` field set by the worker.
    // Without this, they stay in 'running' forever.
    try {
      const scheduleRunStatus = workflowRun.conclusion === 'success' ? 'passed' : 'failed';
      const matchingScheduleRun = await scheduleRunRepository.findByGithubRunId(String(runId));
      if (matchingScheduleRun) {
        await scheduleRunRepository.update(matchingScheduleRun.id, {
          status: scheduleRunStatus,
          completedAt: new Date(),
        });
        logger.info(`Updated schedule run ${matchingScheduleRun.id} status to '${scheduleRunStatus}' from GitHub webhook`);
      }
    } catch (scheduleErr) {
      // Non-fatal — the schedule run lookup may not exist or the method may not be available
      logger.debug('Schedule run update from webhook skipped:', scheduleErr);
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

export { router as githubWebhooksRouter };
