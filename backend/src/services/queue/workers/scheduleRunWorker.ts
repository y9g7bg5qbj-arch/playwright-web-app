/**
 * Schedule Run Worker
 * Processes scheduled test run jobs
 */

import { logger } from '../../../utils/logger';
import { prisma } from '../../../db/prisma';
import { auditService } from '../../audit.service';
import { notificationService, NotificationConfig, ScheduleRunInfo } from '../../notification.service';
import { executionEngine } from '../../execution';
import { ExecutionOptions, DEFAULT_EXECUTION_OPTIONS } from '../../execution/types';
import type { QueueJob, ScheduleRunJobData } from '../types';

/**
 * Process a schedule run job
 */
export async function processScheduleRunJob(job: QueueJob<ScheduleRunJobData>): Promise<void> {
  const { scheduleId, runId, userId, triggerType, parameterValues, executionConfig } = job.data;

  logger.info(`Processing schedule run job: ${job.id} (run: ${runId})`);

  // Update run status to running
  await prisma.scheduleRun.update({
    where: { id: runId },
    data: {
      status: 'running',
      startedAt: new Date(),
    },
  });

  // Audit log
  await auditService.logExecutionAction('triggered', runId, userId, {
    scheduleId,
    triggerType,
    jobId: job.id,
  });

  try {
    // Get schedule details
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    // Parse test selector
    const testSelector = schedule.testSelector ? JSON.parse(schedule.testSelector) : {};

    // Build test pattern from selector
    let testPattern = buildTestPattern(testSelector);
    if (!testPattern) {
      testPattern = '**/*.spec.ts'; // Default pattern
    }

    // Build execution options
    const options: ExecutionOptions = {
      ...DEFAULT_EXECUTION_OPTIONS,
      browser: (executionConfig?.browser as any) || 'chromium',
      headless: executionConfig?.headless ?? true,
      timeout: executionConfig?.timeout || 30000,
      retries: executionConfig?.retries || 0,
      workers: executionConfig?.workers || 1,
      baseUrl: executionConfig?.baseUrl,
    };

    // Initialize execution engine
    await executionEngine.initialize();

    // Execute tests
    const startTime = Date.now();
    const testResult = await executionEngine.runTest(testPattern, options);
    const durationMs = Date.now() - startTime;

    // Build run results
    const status = testResult.status === 'passed' ? 'passed' : 'failed';
    const testCount = 1; // Would need to aggregate from actual test results
    const passedCount = testResult.status === 'passed' ? 1 : 0;
    const failedCount = testResult.status === 'failed' ? 1 : 0;
    const skippedCount = testResult.status === 'skipped' ? 1 : 0;

    // Update run with results
    await prisma.scheduleRun.update({
      where: { id: runId },
      data: {
        status,
        testCount,
        passedCount,
        failedCount,
        skippedCount,
        durationMs,
        completedAt: new Date(),
        errorMessage: testResult.error?.message,
      },
    });

    // Update schedule's last run time and calculate next run
    const nextRunAt = calculateNextRunTime(schedule.cronExpression, schedule.timezone);
    await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        lastRunAt: new Date(),
        nextRunAt,
      },
    });

    // Audit log completion
    await auditService.logExecutionAction('completed', runId, userId, {
      status,
      durationMs,
      testCount,
      passedCount,
      failedCount,
    });

    // Send notifications
    const notificationConfig = schedule.notificationConfig
      ? JSON.parse(schedule.notificationConfig)
      : null;

    if (notificationConfig) {
      const runInfo: ScheduleRunInfo = {
        scheduleId,
        scheduleName: schedule.name,
        runId,
        status: status as 'passed' | 'failed',
        testCount,
        passedCount,
        failedCount,
        skippedCount,
        durationMs,
        errorMessage: testResult.error?.message,
        triggeredBy: triggerType,
        environment: executionConfig?.environment,
      };

      await notificationService.sendRunNotifications(runInfo, notificationConfig);
    }

    logger.info(`Schedule run ${runId} completed with status: ${status}`);
  } catch (error: any) {
    logger.error(`Schedule run ${runId} failed:`, error);

    // Update run with failure
    await prisma.scheduleRun.update({
      where: { id: runId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error.message,
      },
    });

    // Audit log failure
    await auditService.logExecutionAction('failed', runId, userId, {
      error: error.message,
    });

    // Try to send failure notifications
    try {
      const schedule = await prisma.schedule.findUnique({
        where: { id: scheduleId },
      });

      if (schedule?.notificationConfig) {
        const notificationConfig = JSON.parse(schedule.notificationConfig);
        const runInfo: ScheduleRunInfo = {
          scheduleId,
          scheduleName: schedule.name,
          runId,
          status: 'failed',
          testCount: 0,
          passedCount: 0,
          failedCount: 0,
          skippedCount: 0,
          durationMs: 0,
          errorMessage: error.message,
          triggeredBy: triggerType,
        };

        await notificationService.sendRunNotifications(runInfo, notificationConfig);
      }
    } catch (notifError) {
      logger.error('Failed to send failure notification:', notifError);
    }

    throw error; // Re-throw to mark job as failed
  }
}

/**
 * Build test pattern from selector
 */
function buildTestPattern(selector: {
  tags?: string[];
  folders?: string[];
  patterns?: string[];
}): string | null {
  // If patterns specified, use them
  if (selector.patterns && selector.patterns.length > 0) {
    return selector.patterns.join(' ');
  }

  // If folders specified, build pattern
  if (selector.folders && selector.folders.length > 0) {
    return selector.folders.map(f => `${f}/**/*.spec.ts`).join(' ');
  }

  // Tags would be handled by test runner grep
  return null;
}

/**
 * Calculate next run time (simplified - use cronParser in production)
 */
function calculateNextRunTime(cronExpression: string, timezone: string): Date | null {
  // This is a simplified implementation
  // In production, use the cronParser from scheduler service
  try {
    const { getNextRunTime } = require('../../scheduler/cronParser');
    return getNextRunTime(cronExpression);
  } catch {
    return null;
  }
}
