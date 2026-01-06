/**
 * Queue Management Routes
 * API endpoints for managing the job queue system
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { queueService, QUEUE_NAMES, QueueName, JobStatus } from '../services/queue';
import { auditService } from '../services/audit.service';
import { logger } from '../utils/logger';

const router = Router();

// ============================================
// QUEUE STATS
// ============================================

/**
 * GET /api/queue/stats
 * Get statistics for all queues
 */
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  try {
    const stats = await queueService.getAllQueueStats();

    res.json({
      success: true,
      data: {
        queues: stats,
        redisConnected: queueService.isRedisConnected(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/queue/:queueName/stats
 * Get statistics for a specific queue
 */
router.get(
  '/:queueName/stats',
  authenticateToken,
  validate([
    param('queueName')
      .isIn(Object.values(QUEUE_NAMES))
      .withMessage('Invalid queue name'),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { queueName } = req.params;
      const stats = await queueService.getQueueStats(queueName as QueueName);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// QUEUE CONTROL
// ============================================

/**
 * POST /api/queue/:queueName/pause
 * Pause a queue
 */
router.post(
  '/:queueName/pause',
  authenticateToken,
  validate([
    param('queueName')
      .isIn(Object.values(QUEUE_NAMES))
      .withMessage('Invalid queue name'),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { queueName } = req.params;

      await queueService.pauseQueue(queueName as QueueName);

      // Audit log
      await auditService.logQueueAction('paused', queueName, req.userId!);

      logger.info(`Queue ${queueName} paused by user ${req.userId}`);

      res.json({
        success: true,
        message: `Queue ${queueName} paused`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/queue/:queueName/resume
 * Resume a paused queue
 */
router.post(
  '/:queueName/resume',
  authenticateToken,
  validate([
    param('queueName')
      .isIn(Object.values(QUEUE_NAMES))
      .withMessage('Invalid queue name'),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { queueName } = req.params;

      await queueService.resumeQueue(queueName as QueueName);

      // Audit log
      await auditService.logQueueAction('resumed', queueName, req.userId!);

      logger.info(`Queue ${queueName} resumed by user ${req.userId}`);

      res.json({
        success: true,
        message: `Queue ${queueName} resumed`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/queue/:queueName/clean
 * Clean completed/failed jobs from a queue
 */
router.post(
  '/:queueName/clean',
  authenticateToken,
  validate([
    param('queueName')
      .isIn(Object.values(QUEUE_NAMES))
      .withMessage('Invalid queue name'),
    body('grace')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Grace period must be a positive number'),
    body('status')
      .optional()
      .isIn(['completed', 'failed'])
      .withMessage('Status must be completed or failed'),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { queueName } = req.params;
      const { grace = 3600000, status = 'completed' } = req.body;

      const count = await queueService.cleanQueue(
        queueName as QueueName,
        grace,
        status
      );

      // Audit log
      await auditService.logQueueAction('updated', queueName, req.userId!, {
        cleanedJobs: { from: count, to: 0 },
      });

      res.json({
        success: true,
        message: `Cleaned ${count} ${status} jobs from ${queueName}`,
        data: { cleanedCount: count },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// JOB MANAGEMENT
// ============================================

/**
 * GET /api/queue/:queueName/jobs
 * Get jobs from a queue
 */
router.get(
  '/:queueName/jobs',
  authenticateToken,
  validate([
    param('queueName')
      .isIn(Object.values(QUEUE_NAMES))
      .withMessage('Invalid queue name'),
    query('status')
      .optional()
      .isIn(['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'])
      .withMessage('Invalid status'),
    query('start')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Start must be a positive number'),
    query('end')
      .optional()
      .isInt({ min: 1 })
      .withMessage('End must be a positive number'),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { queueName } = req.params;
      const { status = 'waiting', start = '0', end = '20' } = req.query;

      const jobs = await queueService.getJobs(
        queueName as QueueName,
        status as JobStatus,
        parseInt(start as string, 10),
        parseInt(end as string, 10)
      );

      res.json({
        success: true,
        data: jobs.map(job => ({
          id: job.id,
          name: job.name,
          priority: job.priority,
          status: job.status,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
          progress: job.progress,
          createdAt: job.createdAt,
          processedAt: job.processedAt,
          finishedAt: job.finishedAt,
          failedReason: job.failedReason,
          // Don't send full job data for security/size reasons
          dataPreview: {
            scheduleId: (job.data as any)?.scheduleId,
            runId: (job.data as any)?.runId,
            triggerType: (job.data as any)?.triggerType,
          },
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/queue/:queueName/jobs/:jobId
 * Remove a job from a queue
 */
router.delete(
  '/:queueName/jobs/:jobId',
  authenticateToken,
  validate([
    param('queueName')
      .isIn(Object.values(QUEUE_NAMES))
      .withMessage('Invalid queue name'),
    param('jobId').isString().notEmpty().withMessage('Job ID is required'),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { queueName, jobId } = req.params;

      const removed = await queueService.removeJob(queueName as QueueName, jobId);

      if (!removed) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
        });
        return;
      }

      // Audit log
      await auditService.logQueueAction('deleted', `${queueName}:${jobId}`, req.userId!);

      res.json({
        success: true,
        message: 'Job removed',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/queue/:queueName/jobs/:jobId/retry
 * Retry a failed job
 */
router.post(
  '/:queueName/jobs/:jobId/retry',
  authenticateToken,
  validate([
    param('queueName')
      .isIn(Object.values(QUEUE_NAMES))
      .withMessage('Invalid queue name'),
    param('jobId').isString().notEmpty().withMessage('Job ID is required'),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { queueName, jobId } = req.params;

      const retried = await queueService.retryJob(queueName as QueueName, jobId);

      if (!retried) {
        res.status(400).json({
          success: false,
          error: 'Job not found or cannot be retried',
        });
        return;
      }

      // Audit log
      await auditService.logQueueAction('triggered', `${queueName}:${jobId}`, req.userId!, {
        action: { from: 'failed', to: 'retry' },
      });

      res.json({
        success: true,
        message: 'Job retry queued',
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// QUEUE INFO
// ============================================

/**
 * GET /api/queue/info
 * Get information about available queues
 */
router.get('/info', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  try {
    res.json({
      success: true,
      data: {
        queues: Object.entries(QUEUE_NAMES).map(([key, name]) => ({
          key,
          name,
          description: getQueueDescription(name),
        })),
        redisConnected: queueService.isRedisConnected(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get description for a queue
 */
function getQueueDescription(queueName: string): string {
  switch (queueName) {
    case QUEUE_NAMES.SCHEDULE_RUN:
      return 'Processes scheduled test runs';
    case QUEUE_NAMES.EXECUTION:
      return 'Processes test executions';
    case QUEUE_NAMES.GITHUB_WORKFLOW:
      return 'Triggers GitHub Actions workflows';
    case QUEUE_NAMES.NOTIFICATION:
      return 'Sends email and Slack notifications';
    default:
      return 'Unknown queue';
  }
}

export { router as queueRoutes };
