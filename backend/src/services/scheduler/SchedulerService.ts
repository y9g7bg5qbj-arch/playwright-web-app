/**
 * Scheduler Service
 * Core scheduling service for managing scheduled test executions
 */

import { prisma } from '../../db/prisma';
import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors';
import {
  validateCronExpression,
  getNextRunTime,
  getNextRunTimes,
  describeCronExpression,
  CRON_PRESET_OPTIONS,
} from './cronParser';
import type {
  CreateScheduleDTO,
  UpdateScheduleDTO,
  ScheduledTestResponse,
  ScheduledRunResponse,
  ExecutionConfig,
  RunTriggerType,
  RunResults,
  FailedTest,
} from './types';
import { executionEngine } from '../execution';
import { ExecutionOptions, DEFAULT_EXECUTION_OPTIONS } from '../execution/types';

// Simple in-memory job store for scheduled jobs
// In production, use node-cron or Bull Queue
interface ScheduledJob {
  id: string;
  timer: NodeJS.Timeout | null;
  nextRun: Date;
  enabled: boolean;
}

/**
 * Scheduler Service - Manages scheduled test executions
 */
export class SchedulerService extends EventEmitter {
  private jobs: Map<string, ScheduledJob> = new Map();
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 60000; // Check every minute

  constructor() {
    super();
  }

  // =============================================
  // Schedule Management
  // =============================================

  /**
   * Create a new scheduled test
   */
  async createSchedule(userId: string, dto: CreateScheduleDTO): Promise<ScheduledTestResponse> {
    // Validate cron expression
    const validation = validateCronExpression(dto.cronExpression);
    if (!validation.valid) {
      throw new ValidationError(validation.error || 'Invalid cron expression');
    }

    // Calculate next run time
    const nextRunAt = getNextRunTime(dto.cronExpression);

    const schedule = await prisma.scheduledTest.create({
      data: {
        projectId: dto.projectId,
        userId,
        name: dto.name,
        description: dto.description,
        testPattern: dto.testPattern,
        cronExpression: dto.cronExpression,
        timezone: dto.timezone || 'UTC',
        enabled: dto.enabled ?? true,
        config: JSON.stringify(dto.config || {}),
        nextRunAt,
      },
      include: {
        runs: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        notifications: true,
      },
    });

    // Schedule the job if enabled
    if (schedule.enabled && nextRunAt) {
      this.scheduleJob(schedule.id, dto.cronExpression, schedule.timezone);
    }

    logger.info(`Schedule created: ${schedule.id} - ${schedule.name}`);
    this.emit('schedule:created', { scheduleId: schedule.id });

    return this.formatSchedule(schedule);
  }

  /**
   * Update an existing schedule
   */
  async updateSchedule(
    userId: string,
    scheduleId: string,
    dto: UpdateScheduleDTO
  ): Promise<ScheduledTestResponse> {
    const existing = await this.getScheduleById(scheduleId);

    if (existing.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    // Validate new cron expression if provided
    let nextRunAt = existing.nextRunAt;
    if (dto.cronExpression) {
      const validation = validateCronExpression(dto.cronExpression);
      if (!validation.valid) {
        throw new ValidationError(validation.error || 'Invalid cron expression');
      }
      nextRunAt = getNextRunTime(dto.cronExpression);
    }

    const schedule = await prisma.scheduledTest.update({
      where: { id: scheduleId },
      data: {
        name: dto.name,
        description: dto.description,
        testPattern: dto.testPattern,
        cronExpression: dto.cronExpression,
        timezone: dto.timezone,
        enabled: dto.enabled,
        config: dto.config ? JSON.stringify(dto.config) : undefined,
        nextRunAt,
      },
      include: {
        runs: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        notifications: true,
      },
    });

    // Update scheduled job
    this.unscheduleJob(scheduleId);
    if (schedule.enabled && schedule.nextRunAt) {
      this.scheduleJob(schedule.id, schedule.cronExpression, schedule.timezone);
    }

    logger.info(`Schedule updated: ${scheduleId}`);
    this.emit('schedule:updated', { scheduleId });

    return this.formatSchedule(schedule);
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(userId: string, scheduleId: string): Promise<void> {
    const existing = await this.getScheduleById(scheduleId);

    if (existing.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    // Unschedule the job
    this.unscheduleJob(scheduleId);

    await prisma.scheduledTest.delete({
      where: { id: scheduleId },
    });

    logger.info(`Schedule deleted: ${scheduleId}`);
    this.emit('schedule:deleted', { scheduleId });
  }

  /**
   * Get a single schedule by ID
   */
  async getSchedule(userId: string, scheduleId: string): Promise<ScheduledTestResponse> {
    const schedule = await prisma.scheduledTest.findUnique({
      where: { id: scheduleId },
      include: {
        runs: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        notifications: true,
      },
    });

    if (!schedule) {
      throw new NotFoundError('Schedule not found');
    }

    if (schedule.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    return this.formatSchedule(schedule);
  }

  /**
   * List all schedules for a project
   */
  async listSchedules(userId: string, projectId?: string): Promise<ScheduledTestResponse[]> {
    const where: any = { userId };
    if (projectId) {
      where.projectId = projectId;
    }

    const schedules = await prisma.scheduledTest.findMany({
      where,
      include: {
        runs: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        notifications: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return schedules.map(s => this.formatSchedule(s));
  }

  // =============================================
  // Execution Control
  // =============================================

  /**
   * Enable a schedule
   */
  async enableSchedule(userId: string, scheduleId: string): Promise<void> {
    const existing = await this.getScheduleById(scheduleId);

    if (existing.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const nextRunAt = getNextRunTime(existing.cronExpression);

    await prisma.scheduledTest.update({
      where: { id: scheduleId },
      data: { enabled: true, nextRunAt },
    });

    // Schedule the job
    this.scheduleJob(scheduleId, existing.cronExpression, existing.timezone);

    logger.info(`Schedule enabled: ${scheduleId}`);
    this.emit('schedule:enabled', { scheduleId });
  }

  /**
   * Disable a schedule
   */
  async disableSchedule(userId: string, scheduleId: string): Promise<void> {
    const existing = await this.getScheduleById(scheduleId);

    if (existing.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    await prisma.scheduledTest.update({
      where: { id: scheduleId },
      data: { enabled: false, nextRunAt: null },
    });

    // Unschedule the job
    this.unscheduleJob(scheduleId);

    logger.info(`Schedule disabled: ${scheduleId}`);
    this.emit('schedule:disabled', { scheduleId });
  }

  /**
   * Trigger a schedule to run immediately
   */
  async triggerNow(userId: string, scheduleId: string): Promise<ScheduledRunResponse> {
    const schedule = await this.getScheduleById(scheduleId);

    if (schedule.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    // Create a run with 'manual' trigger type
    const run = await this.createRun(scheduleId, 'manual');

    logger.info(`Schedule triggered manually: ${scheduleId}, run: ${run.id}`);
    this.emit('schedule:triggered', { scheduleId, runId: run.id, triggeredBy: 'manual' });

    // Execute the run (asynchronously)
    this.executeRun(run.id).catch(err => {
      logger.error(`Error executing run ${run.id}:`, err);
    });

    return run;
  }

  // =============================================
  // Scheduler Lifecycle
  // =============================================

  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    logger.info('Starting scheduler...');
    this.isRunning = true;

    // Load all enabled schedules
    const schedules = await prisma.scheduledTest.findMany({
      where: { enabled: true },
    });

    for (const schedule of schedules) {
      this.scheduleJob(schedule.id, schedule.cronExpression, schedule.timezone);
    }

    // Start the periodic check
    this.checkInterval = setInterval(() => {
      this.checkDueSchedules().catch(err => {
        logger.error('Error checking due schedules:', err);
      });
    }, this.CHECK_INTERVAL_MS);

    logger.info(`Scheduler started with ${schedules.length} active schedules`);
    this.emit('scheduler:started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping scheduler...');

    // Clear the check interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Clear all scheduled jobs
    for (const [id, job] of this.jobs) {
      if (job.timer) {
        clearTimeout(job.timer);
      }
    }
    this.jobs.clear();

    this.isRunning = false;
    logger.info('Scheduler stopped');
    this.emit('scheduler:stopped');
  }

  // =============================================
  // Job Management
  // =============================================

  /**
   * Schedule a job for execution
   */
  scheduleJob(scheduleId: string, cronExpression: string, timezone: string): void {
    // Remove existing job if any
    this.unscheduleJob(scheduleId);

    const nextRun = getNextRunTime(cronExpression);
    if (!nextRun) {
      logger.warn(`Could not calculate next run time for schedule ${scheduleId}`);
      return;
    }

    const now = new Date();
    const delay = nextRun.getTime() - now.getTime();

    if (delay <= 0) {
      // Should run now
      this.executeSchedule(scheduleId).catch(err => {
        logger.error(`Error executing schedule ${scheduleId}:`, err);
      });
      return;
    }

    // Schedule for future execution
    const timer = setTimeout(() => {
      this.executeSchedule(scheduleId).then(() => {
        // Reschedule for next run
        this.scheduleJob(scheduleId, cronExpression, timezone);
      }).catch(err => {
        logger.error(`Error executing schedule ${scheduleId}:`, err);
        // Still try to reschedule
        this.scheduleJob(scheduleId, cronExpression, timezone);
      });
    }, Math.min(delay, 2147483647)); // Max timeout is ~24.8 days

    this.jobs.set(scheduleId, {
      id: scheduleId,
      timer,
      nextRun,
      enabled: true,
    });

    logger.debug(`Scheduled job ${scheduleId} for ${nextRun.toISOString()}`);
  }

  /**
   * Unschedule a job
   */
  unscheduleJob(scheduleId: string): void {
    const job = this.jobs.get(scheduleId);
    if (job) {
      if (job.timer) {
        clearTimeout(job.timer);
      }
      this.jobs.delete(scheduleId);
      logger.debug(`Unscheduled job ${scheduleId}`);
    }
  }

  /**
   * Get next run time for a cron expression
   */
  getNextRunTime(cronExpression: string, timezone: string): Date | null {
    return getNextRunTime(cronExpression);
  }

  /**
   * Preview next N run times
   */
  previewNextRuns(cronExpression: string, timezone: string, count: number = 5): Date[] {
    return getNextRunTimes(cronExpression, count);
  }

  /**
   * Validate a cron expression
   */
  validateCron(expression: string): { valid: boolean; error?: string; description?: string } {
    const result = validateCronExpression(expression);
    if (result.valid) {
      return {
        valid: true,
        description: describeCronExpression(expression),
      };
    }
    return result;
  }

  /**
   * Get cron presets
   */
  getCronPresets() {
    return CRON_PRESET_OPTIONS;
  }

  // =============================================
  // Run Management
  // =============================================

  /**
   * Get runs for a schedule
   */
  async getRuns(
    userId: string,
    scheduleId: string,
    limit: number = 20
  ): Promise<ScheduledRunResponse[]> {
    const schedule = await this.getScheduleById(scheduleId);

    if (schedule.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const runs = await prisma.scheduledTestRun.findMany({
      where: { scheduleId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return runs.map(r => this.formatRun(r));
  }

  /**
   * Get a specific run
   */
  async getRun(userId: string, runId: string): Promise<ScheduledRunResponse> {
    const run = await prisma.scheduledTestRun.findUnique({
      where: { id: runId },
      include: { schedule: true },
    });

    if (!run) {
      throw new NotFoundError('Run not found');
    }

    if (run.schedule.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    return this.formatRun(run);
  }

  /**
   * Cancel a running execution
   */
  async cancelRun(userId: string, runId: string): Promise<void> {
    const run = await prisma.scheduledTestRun.findUnique({
      where: { id: runId },
      include: { schedule: true },
    });

    if (!run) {
      throw new NotFoundError('Run not found');
    }

    if (run.schedule.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    if (run.status !== 'running' && run.status !== 'queued') {
      throw new ValidationError('Can only cancel queued or running executions');
    }

    await prisma.scheduledTestRun.update({
      where: { id: runId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      },
    });

    this.emit('run:cancelled', { runId, scheduleId: run.scheduleId });
  }

  // =============================================
  // Private Methods
  // =============================================

  /**
   * Get schedule by ID (internal use)
   */
  private async getScheduleById(scheduleId: string) {
    const schedule = await prisma.scheduledTest.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundError('Schedule not found');
    }

    return schedule;
  }

  /**
   * Check for schedules that are due to run
   */
  private async checkDueSchedules(): Promise<void> {
    const now = new Date();

    const dueSchedules = await prisma.scheduledTest.findMany({
      where: {
        enabled: true,
        nextRunAt: { lte: now },
      },
    });

    for (const schedule of dueSchedules) {
      // Skip if already being handled by a timer
      const job = this.jobs.get(schedule.id);
      if (job && job.timer) {
        continue;
      }

      logger.info(`Found due schedule: ${schedule.id}`);
      this.executeSchedule(schedule.id).catch(err => {
        logger.error(`Error executing schedule ${schedule.id}:`, err);
      });
    }
  }

  /**
   * Execute a scheduled test
   */
  private async executeSchedule(scheduleId: string): Promise<void> {
    const schedule = await prisma.scheduledTest.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule || !schedule.enabled) {
      return;
    }

    // Create a run
    const run = await this.createRun(scheduleId, 'schedule');

    // Update last run and calculate next run
    const nextRunAt = getNextRunTime(schedule.cronExpression);

    await prisma.scheduledTest.update({
      where: { id: scheduleId },
      data: {
        lastRunAt: new Date(),
        nextRunAt,
      },
    });

    // Execute the run
    await this.executeRun(run.id);
  }

  /**
   * Create a new run record
   */
  private async createRun(
    scheduleId: string,
    triggeredBy: RunTriggerType
  ): Promise<ScheduledRunResponse> {
    const run = await prisma.scheduledTestRun.create({
      data: {
        scheduleId,
        triggeredBy,
        status: 'queued',
      },
    });

    return this.formatRun(run);
  }

  /**
   * Execute a run
   */
  private async executeRun(runId: string): Promise<void> {
    try {
      // Update status to running
      await prisma.scheduledTestRun.update({
        where: { id: runId },
        data: {
          status: 'running',
          startedAt: new Date(),
        },
      });

      this.emit('run:started', { runId });

      const run = await prisma.scheduledTestRun.findUnique({
        where: { id: runId },
        include: { schedule: true },
      });

      if (!run) {
        throw new Error(`Run not found: ${runId}`);
      }

      // Parse config
      const config: ExecutionConfig = JSON.parse(run.schedule.config || '{}');

      logger.info(`Executing run ${runId} for schedule ${run.scheduleId}`);
      logger.info(`Test pattern: ${run.schedule.testPattern}`);
      logger.info(`Config: ${JSON.stringify(config)}`);

      // Initialize execution engine if needed
      await executionEngine.initialize();

      // Map scheduler config to execution options
      const executionOptions: ExecutionOptions = {
        ...DEFAULT_EXECUTION_OPTIONS,
        browser: config.browser || 'chromium',
        headless: config.headless ?? true,
        timeout: config.timeout || 30000,
        retries: config.retries || 0,
        workers: config.workers || 1,
        video: config.video === 'on' || config.video === 'on-first-retry',
        tracing: config.trace === 'on' || config.trace === 'on-first-retry',
        screenshot: config.screenshot === 'on' ? 'on' : config.screenshot === 'only-on-failure' ? 'only-on-failure' : 'off',
        viewport: config.viewport || { width: 1280, height: 720 },
        baseUrl: config.baseURL,
        extraHTTPHeaders: config.extraHTTPHeaders,
      };

      // Execute the test
      const startTime = Date.now();
      const testResult = await executionEngine.runTest(run.schedule.testPattern, executionOptions);
      const duration = Date.now() - startTime;

      // Build run results from test result
      const failedTests: FailedTest[] = [];
      if (testResult.status === 'failed' && testResult.error) {
        failedTests.push({
          name: testResult.testName,
          path: testResult.testFile,
          error: testResult.error.message,
          screenshotPath: testResult.error.screenshot,
        });
      }

      const results: RunResults = {
        passed: testResult.status === 'passed' ? 1 : 0,
        failed: testResult.status === 'failed' ? 1 : 0,
        skipped: testResult.status === 'skipped' ? 1 : 0,
        total: 1,
        duration,
        failedTests: failedTests.length > 0 ? failedTests : undefined,
      };

      // Mark as completed
      await prisma.scheduledTestRun.update({
        where: { id: runId },
        data: {
          status: testResult.status === 'failed' ? 'failed' : 'completed',
          completedAt: new Date(),
          executionId: testResult.runId,
          results: JSON.stringify(results),
        },
      });

      this.emit('run:completed', { runId, status: 'completed' });

    } catch (error: any) {
      logger.error(`Run ${runId} failed:`, error);

      await prisma.scheduledTestRun.update({
        where: { id: runId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: error.message,
        },
      });

      this.emit('run:failed', { runId, error: error.message });
    }
  }

  /**
   * Format schedule for response
   */
  private formatSchedule(schedule: any): ScheduledTestResponse {
    return {
      id: schedule.id,
      projectId: schedule.projectId,
      userId: schedule.userId,
      name: schedule.name,
      description: schedule.description,
      testPattern: schedule.testPattern,
      cronExpression: schedule.cronExpression,
      cronDescription: describeCronExpression(schedule.cronExpression),
      timezone: schedule.timezone,
      enabled: schedule.enabled,
      config: JSON.parse(schedule.config || '{}'),
      lastRunAt: schedule.lastRunAt,
      nextRunAt: schedule.nextRunAt,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
      runs: schedule.runs?.map((r: any) => this.formatRun(r)),
      notifications: schedule.notifications?.map((n: any) => ({
        id: n.id,
        type: n.type,
        config: JSON.parse(n.config || '{}'),
        enabled: n.enabled,
      })),
    };
  }

  /**
   * Format run for response
   */
  private formatRun(run: any): ScheduledRunResponse {
    return {
      id: run.id,
      scheduleId: run.scheduleId,
      status: run.status,
      triggeredBy: run.triggeredBy,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      executionId: run.executionId,
      results: run.results ? JSON.parse(run.results) : null,
      errorMessage: run.errorMessage,
      createdAt: run.createdAt,
    };
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService();
