/**
 * Schedule Service
 * NOW USES MONGODB INSTEAD OF PRISMA
 */

import { scheduleRepository, scheduleRunRepository, scheduleTestResultRepository, userRepository } from '../db/repositories/mongo';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import type {
    Schedule,
    ScheduleCreate,
    ScheduleUpdate,
    ScheduleRun,
    ScheduleTestResult,
    TestSelector,
    ScheduleNotificationConfig,
    ScheduleTriggerType,
    ScheduleTriggerRequest,
    ScheduleParameterDefinition,
    ScheduleParameterValues,
    ScheduleExecutionConfig,
    ScheduleExecutionTarget,
    ScheduleGitHubActionsConfig,
} from '@playwright-web-app/shared';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

// Import the full-featured cron parser
import {
    validateCronExpression as validateCron,
    getNextRunTime as calculateNextRunTime,
    getNextRunTimes as calculateNextRunTimes,
    describeCronExpression as describeCron,
} from './scheduler/cronParser';

// Import queue and audit services
import { queueService, QUEUE_NAMES, ScheduleRunJobData } from './queue';
import { auditService } from './audit.service';
import { logger } from '../utils/logger';

// =============================================
// Secure Webhook Token Generation
// =============================================

/**
 * Generate a cryptographically secure webhook token
 */
function generateWebhookToken(): string {
    return randomBytes(32).toString('hex'); // 64 character hex string
}

// =============================================
// Timezone-aware Date Calculation
// =============================================

/**
 * Get the current time in a specific timezone
 */
function getNowInTimezone(timezone: string): Date {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });

        const parts = formatter.formatToParts(now);
        const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';

        const tzDate = new Date(
            parseInt(getPart('year')),
            parseInt(getPart('month')) - 1,
            parseInt(getPart('day')),
            parseInt(getPart('hour')),
            parseInt(getPart('minute')),
            parseInt(getPart('second'))
        );

        return tzDate;
    } catch {
        return new Date();
    }
}

/**
 * Calculate next run time with proper timezone support
 */
function getNextRunTime(cronExpression: string, timezone: string = 'UTC'): Date | null {
    const nowInTz = getNowInTimezone(timezone);
    const nextRun = calculateNextRunTime(cronExpression, nowInTz, timezone);
    return nextRun || null;
}

export class ScheduleService {
    /**
     * Create a new schedule
     */
    async create(userId: string, data: ScheduleCreate): Promise<Schedule> {
        // Validate cron expression
        const cronValidation = validateCron(data.cronExpression);
        if (!cronValidation.valid) {
            throw new ValidationError(cronValidation.error || 'Invalid cron expression');
        }

        const nextRunAt = getNextRunTime(data.cronExpression, data.timezone || 'UTC');
        const webhookToken = generateWebhookToken();

        // Validate GitHub Actions config
        if (data.executionTarget === 'github-actions') {
            if (!data.githubConfig?.repoFullName) {
                throw new ValidationError('GitHub repository is required for GitHub Actions execution');
            }
            if (!data.githubConfig?.workflowFile) {
                throw new ValidationError('GitHub workflow file is required for GitHub Actions execution');
            }
        }

        const schedule = await scheduleRepository.create({
            userId,
            workflowId: data.workflowId,
            name: data.name,
            description: data.description,
            cronExpression: data.cronExpression,
            timezone: data.timezone || 'UTC',
            testSelector: JSON.stringify(data.testSelector || {}),
            notificationConfig: data.notificationConfig ? JSON.stringify(data.notificationConfig) : undefined,
            isActive: data.isActive ?? true,
            nextRunAt: nextRunAt || undefined,
            webhookToken,
            parameters: data.parameters ? JSON.stringify(data.parameters) : undefined,
            defaultExecutionConfig: data.defaultExecutionConfig
                ? JSON.stringify(data.defaultExecutionConfig)
                : undefined,
            executionTarget: data.executionTarget || 'local',
            githubRepoFullName: data.githubConfig?.repoFullName,
            githubBranch: data.githubConfig?.branch || 'main',
            githubWorkflowFile: data.githubConfig?.workflowFile,
            githubInputs: data.githubConfig?.inputs ? JSON.stringify(data.githubConfig.inputs) : undefined,
        });

        // Get recent runs
        const runs = await scheduleRunRepository.findByScheduleId(schedule.id, 5);

        return this.formatSchedule({ ...schedule, runs });
    }

    /**
     * Find all schedules for a user
     */
    async findAll(userId: string): Promise<Schedule[]> {
        const schedules = await scheduleRepository.findByUserId(userId);

        const schedulesWithRuns = await Promise.all(
            schedules.map(async (schedule) => {
                const runs = await scheduleRunRepository.findByScheduleId(schedule.id, 1);
                return { ...schedule, runs };
            })
        );

        return schedulesWithRuns.map(s => this.formatSchedule(s));
    }

    /**
     * Find a single schedule by ID
     */
    async findOne(userId: string, scheduleId: string): Promise<Schedule> {
        const schedule = await scheduleRepository.findById(scheduleId);

        if (!schedule) {
            throw new NotFoundError('Schedule not found');
        }

        if (schedule.userId !== userId) {
            throw new ForbiddenError('Access denied');
        }

        const runs = await scheduleRunRepository.findByScheduleId(scheduleId, 10);
        const runsWithResults = await Promise.all(
            runs.map(async (run) => {
                const testResults = await scheduleTestResultRepository.findByRunId(run.id);
                return { ...run, testResults };
            })
        );

        return this.formatSchedule({ ...schedule, runs: runsWithResults });
    }

    /**
     * Update a schedule
     */
    async update(userId: string, scheduleId: string, data: ScheduleUpdate): Promise<Schedule> {
        const existing = await scheduleRepository.findById(scheduleId);

        if (!existing) {
            throw new NotFoundError('Schedule not found');
        }

        if (existing.userId !== userId) {
            throw new ForbiddenError('Access denied');
        }

        // Validate new cron expression if provided
        let nextRunAt = existing.nextRunAt;
        if (data.cronExpression) {
            const cronValidation = validateCron(data.cronExpression);
            if (!cronValidation.valid) {
                throw new ValidationError(cronValidation.error || 'Invalid cron expression');
            }
            nextRunAt = getNextRunTime(data.cronExpression, data.timezone || existing.timezone) || undefined;
        }

        // Validate GitHub Actions config
        const effectiveTarget = data.executionTarget ?? existing.executionTarget;
        if (effectiveTarget === 'github-actions') {
            const effectiveRepo = data.githubConfig?.repoFullName ?? existing.githubRepoFullName;
            const effectiveWorkflow = data.githubConfig?.workflowFile ?? existing.githubWorkflowFile;
            if (!effectiveRepo) {
                throw new ValidationError('GitHub repository is required for GitHub Actions execution');
            }
            if (!effectiveWorkflow) {
                throw new ValidationError('GitHub workflow file is required for GitHub Actions execution');
            }
        }

        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.cronExpression !== undefined) updateData.cronExpression = data.cronExpression;
        if (data.timezone !== undefined) updateData.timezone = data.timezone;
        if (data.testSelector !== undefined) updateData.testSelector = JSON.stringify(data.testSelector);
        if (data.notificationConfig !== undefined) updateData.notificationConfig = JSON.stringify(data.notificationConfig);
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (nextRunAt !== undefined) updateData.nextRunAt = nextRunAt;
        if (data.parameters !== undefined) updateData.parameters = data.parameters ? JSON.stringify(data.parameters) : null;
        if (data.defaultExecutionConfig !== undefined) updateData.defaultExecutionConfig = data.defaultExecutionConfig ? JSON.stringify(data.defaultExecutionConfig) : null;
        if (data.executionTarget !== undefined) updateData.executionTarget = data.executionTarget;
        if (data.githubConfig?.repoFullName !== undefined) updateData.githubRepoFullName = data.githubConfig.repoFullName;
        if (data.githubConfig?.branch !== undefined) updateData.githubBranch = data.githubConfig.branch;
        if (data.githubConfig?.workflowFile !== undefined) updateData.githubWorkflowFile = data.githubConfig.workflowFile;
        if (data.githubConfig?.inputs !== undefined) updateData.githubInputs = data.githubConfig.inputs ? JSON.stringify(data.githubConfig.inputs) : null;

        const schedule = await scheduleRepository.update(scheduleId, updateData);

        if (!schedule) {
            throw new NotFoundError('Schedule not found');
        }

        const runs = await scheduleRunRepository.findByScheduleId(scheduleId, 5);

        return this.formatSchedule({ ...schedule, runs });
    }

    /**
     * Delete a schedule
     */
    async delete(userId: string, scheduleId: string): Promise<void> {
        const existing = await scheduleRepository.findById(scheduleId);

        if (!existing) {
            throw new NotFoundError('Schedule not found');
        }

        if (existing.userId !== userId) {
            throw new ForbiddenError('Access denied');
        }

        await scheduleRepository.delete(scheduleId);
    }

    /**
     * Toggle schedule active status
     */
    async toggleActive(userId: string, scheduleId: string): Promise<Schedule> {
        const existing = await scheduleRepository.findById(scheduleId);

        if (!existing) {
            throw new NotFoundError('Schedule not found');
        }

        if (existing.userId !== userId) {
            throw new ForbiddenError('Access denied');
        }

        const schedule = await scheduleRepository.update(scheduleId, {
            isActive: !existing.isActive,
            nextRunAt: !existing.isActive
                ? getNextRunTime(existing.cronExpression, existing.timezone) || undefined
                : undefined,
        });

        if (!schedule) {
            throw new NotFoundError('Schedule not found');
        }

        const runs = await scheduleRunRepository.findByScheduleId(scheduleId, 5);

        return this.formatSchedule({ ...schedule, runs });
    }

    /**
     * Trigger a manual run of a schedule
     */
    async triggerRun(
        userId: string,
        scheduleId: string,
        request?: ScheduleTriggerRequest
    ): Promise<ScheduleRun> {
        const schedule = await scheduleRepository.findById(scheduleId);

        if (!schedule) {
            throw new NotFoundError('Schedule not found');
        }

        if (schedule.userId !== userId) {
            throw new ForbiddenError('Access denied');
        }

        // Get user info for audit
        const user = await userRepository.findById(userId);

        // Parse schedule's default execution config
        const defaultConfig: ScheduleExecutionConfig = schedule.defaultExecutionConfig
            ? JSON.parse(schedule.defaultExecutionConfig)
            : {};

        // Parse schedule's parameter definitions
        const scheduleParams: ScheduleParameterDefinition[] = schedule.parameters
            ? JSON.parse(schedule.parameters)
            : [];

        // Build default parameter values from schema
        const defaultParamValues: ScheduleParameterValues = {};
        scheduleParams.forEach(param => {
            defaultParamValues[param.name] = param.defaultValue;
        });

        // Merge defaults with provided overrides
        const effectiveConfig: ScheduleExecutionConfig = {
            ...defaultConfig,
            ...(request?.executionConfig || {}),
        };

        const effectiveParams: ScheduleParameterValues = {
            ...defaultParamValues,
            ...(request?.parameterValues || {}),
        };

        // Validate parameter values against schema
        this.validateParameterValues(scheduleParams, effectiveParams);

        // Create a new run
        const run = await scheduleRunRepository.create({
            scheduleId,
            triggerType: 'manual',
            status: 'pending',
            parameterValues: Object.keys(effectiveParams).length > 0
                ? JSON.stringify(effectiveParams)
                : undefined,
            executionConfig: Object.keys(effectiveConfig).length > 0
                ? JSON.stringify(effectiveConfig)
                : undefined,
            triggeredByUser: user?.email || userId,
        });

        // Dispatch to execution queue
        try {
            const jobData: ScheduleRunJobData = {
                scheduleId,
                runId: run.id,
                userId,
                triggerType: 'manual',
                parameterValues: effectiveParams,
                executionConfig: effectiveConfig,
            };

            await queueService.addJob(
                QUEUE_NAMES.SCHEDULE_RUN,
                `schedule-run-${scheduleId}`,
                jobData,
                { priority: 2 }
            );

            logger.info(`Schedule run ${run.id} dispatched to queue`);

            await auditService.logScheduleAction('triggered', scheduleId, userId, undefined, {
                runId: run.id,
                triggerType: 'manual',
            });
        } catch (error: any) {
            logger.error(`Failed to dispatch schedule run to queue:`, error);
            await scheduleRunRepository.update(run.id, {
                status: 'failed',
                errorMessage: `Failed to queue: ${error.message}`,
                completedAt: new Date(),
            });
        }

        return this.formatRun(run);
    }

    /**
     * Validate parameter values against the schedule's parameter schema
     */
    private validateParameterValues(
        schema: ScheduleParameterDefinition[],
        values: ScheduleParameterValues
    ): void {
        for (const param of schema) {
            const value = values[param.name];

            if (param.required && (value === undefined || value === '')) {
                throw new ValidationError(`Parameter "${param.label}" is required`);
            }

            if (value === undefined) continue;

            switch (param.type) {
                case 'choice':
                    if (param.choices && !param.choices.includes(String(value))) {
                        throw new ValidationError(
                            `Invalid value for "${param.label}". Must be one of: ${param.choices.join(', ')}`
                        );
                    }
                    break;

                case 'number':
                    const numValue = Number(value);
                    if (isNaN(numValue)) {
                        throw new ValidationError(`"${param.label}" must be a number`);
                    }
                    if (param.min !== undefined && numValue < param.min) {
                        throw new ValidationError(`"${param.label}" must be at least ${param.min}`);
                    }
                    if (param.max !== undefined && numValue > param.max) {
                        throw new ValidationError(`"${param.label}" must be at most ${param.max}`);
                    }
                    break;

                case 'string':
                    if (param.pattern) {
                        const regex = new RegExp(param.pattern);
                        if (!regex.test(String(value))) {
                            throw new ValidationError(`"${param.label}" format is invalid`);
                        }
                    }
                    break;
            }
        }
    }

    /**
     * Trigger a run via webhook token
     */
    async triggerWebhook(webhookToken: string): Promise<ScheduleRun> {
        if (!/^[a-f0-9]{64}$/i.test(webhookToken)) {
            throw new NotFoundError('Invalid webhook token');
        }

        const schedule = await scheduleRepository.findByWebhookToken(webhookToken);

        if (!schedule) {
            throw new NotFoundError('Invalid webhook token');
        }

        if (!schedule.isActive) {
            throw new ValidationError('Schedule is not active');
        }

        const run = await scheduleRunRepository.create({
            scheduleId: schedule.id,
            triggerType: 'webhook',
            status: 'pending',
            webhookToken,
        });

        // Dispatch to execution queue
        try {
            const defaultConfig: ScheduleExecutionConfig = schedule.defaultExecutionConfig
                ? JSON.parse(schedule.defaultExecutionConfig)
                : {};

            const jobData: ScheduleRunJobData = {
                scheduleId: schedule.id,
                runId: run.id,
                userId: schedule.userId,
                triggerType: 'webhook',
                executionConfig: defaultConfig,
            };

            await queueService.addJob(
                QUEUE_NAMES.SCHEDULE_RUN,
                `schedule-run-${schedule.id}`,
                jobData,
                { priority: 1 }
            );

            logger.info(`Webhook-triggered run ${run.id} dispatched to queue`);

            await auditService.logScheduleAction('triggered', schedule.id, undefined, undefined, {
                runId: run.id,
                triggerType: 'webhook',
            });
        } catch (error: any) {
            logger.error(`Failed to dispatch webhook run to queue:`, error);
            await scheduleRunRepository.update(run.id, {
                status: 'failed',
                errorMessage: `Failed to queue: ${error.message}`,
                completedAt: new Date(),
            });
        }

        return this.formatRun(run);
    }

    /**
     * Get run history for a schedule
     */
    async getRuns(userId: string, scheduleId: string, limit: number = 20): Promise<ScheduleRun[]> {
        const schedule = await scheduleRepository.findById(scheduleId);

        if (!schedule) {
            throw new NotFoundError('Schedule not found');
        }

        if (schedule.userId !== userId) {
            throw new ForbiddenError('Access denied');
        }

        const runs = await scheduleRunRepository.findByScheduleId(scheduleId, limit);
        const runsWithResults = await Promise.all(
            runs.map(async (run) => {
                const testResults = await scheduleTestResultRepository.findByRunId(run.id);
                return { ...run, testResults };
            })
        );

        return runsWithResults.map(r => this.formatRun(r));
    }

    /**
     * Get details of a specific run
     */
    async getRun(userId: string, runId: string): Promise<ScheduleRun> {
        const run = await scheduleRunRepository.findById(runId);

        if (!run) {
            throw new NotFoundError('Run not found');
        }

        const schedule = await scheduleRepository.findById(run.scheduleId);

        if (!schedule || schedule.userId !== userId) {
            throw new ForbiddenError('Access denied');
        }

        const testResults = await scheduleTestResultRepository.findByRunId(runId);

        return this.formatRun({ ...run, testResults });
    }

    /**
     * Get schedules that are due to run
     */
    async getDueSchedules(): Promise<Schedule[]> {
        const schedules = await scheduleRepository.findDue();
        return schedules.map(s => this.formatSchedule(s));
    }

    /**
     * Update schedule after a run completes
     */
    async markRunComplete(runId: string, results: {
        status: 'passed' | 'failed' | 'cancelled';
        testCount: number;
        passedCount: number;
        failedCount: number;
        skippedCount: number;
        durationMs: number;
        artifactsPath?: string;
        errorMessage?: string;
    }): Promise<void> {
        const now = new Date();

        await scheduleRunRepository.update(runId, {
            status: results.status,
            testCount: results.testCount,
            passedCount: results.passedCount,
            failedCount: results.failedCount,
            skippedCount: results.skippedCount,
            durationMs: results.durationMs,
            artifactsPath: results.artifactsPath,
            errorMessage: results.errorMessage,
            completedAt: now,
        });

        const run = await scheduleRunRepository.findById(runId);

        if (run) {
            const schedule = await scheduleRepository.findById(run.scheduleId);
            if (schedule) {
                const nextRunAt = getNextRunTime(schedule.cronExpression, schedule.timezone);

                await scheduleRepository.update(run.scheduleId, {
                    lastRunAt: now,
                    nextRunAt: nextRunAt || undefined,
                });
            }
        }
    }

    /**
     * Get cron expression description
     */
    describeCron(expression: string): string {
        return describeCron(expression);
    }

    /**
     * Validate a cron expression
     */
    validateCron(expression: string): { valid: boolean; error?: string; description?: string } {
        const result = validateCron(expression);
        if (result.valid) {
            return {
                valid: true,
                description: describeCron(expression),
            };
        }
        return result;
    }

    /**
     * Preview upcoming run times
     */
    previewNextRuns(cronExpression: string, timezone: string = 'UTC', count: number = 5): Date[] {
        const nowInTz = getNowInTimezone(timezone);
        return calculateNextRunTimes(cronExpression, count, nowInTz, timezone);
    }

    /**
     * Get webhook information for a schedule
     */
    async getWebhookInfo(userId: string, scheduleId: string): Promise<{
        token: string | null;
        webhookUrl: string | null;
        hasToken: boolean;
    }> {
        const schedule = await scheduleRepository.findById(scheduleId);

        if (!schedule) {
            throw new NotFoundError('Schedule not found');
        }

        if (schedule.userId !== userId) {
            throw new ForbiddenError('Access denied');
        }

        const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

        return {
            token: schedule.webhookToken || null,
            webhookUrl: schedule.webhookToken
                ? `${baseUrl}/api/schedules/webhook/${schedule.webhookToken}`
                : null,
            hasToken: !!schedule.webhookToken,
        };
    }

    /**
     * Regenerate webhook token for a schedule
     */
    async regenerateWebhookToken(userId: string, scheduleId: string): Promise<string> {
        const existing = await scheduleRepository.findById(scheduleId);

        if (!existing) {
            throw new NotFoundError('Schedule not found');
        }

        if (existing.userId !== userId) {
            throw new ForbiddenError('Access denied');
        }

        const newToken = generateWebhookToken();

        await scheduleRepository.update(scheduleId, { webhookToken: newToken });

        return newToken;
    }

    // =============================================
    // Private formatting methods
    // =============================================

    private formatSchedule(schedule: any): Schedule {
        const githubInputs = schedule.githubInputs
            ? this.parseJSON<Record<string, string>>(schedule.githubInputs, {})
            : undefined;

        const githubConfig: ScheduleGitHubActionsConfig | undefined = schedule.githubRepoFullName
            ? {
                repoFullName: schedule.githubRepoFullName,
                branch: schedule.githubBranch || 'main',
                workflowFile: schedule.githubWorkflowFile || 'vero-tests.yml',
                inputs: githubInputs && Object.keys(githubInputs).length > 0 ? githubInputs : undefined,
            }
            : undefined;

        return {
            id: schedule.id,
            userId: schedule.userId,
            workflowId: schedule.workflowId,
            name: schedule.name,
            description: schedule.description,
            cronExpression: schedule.cronExpression,
            timezone: schedule.timezone,
            testSelector: this.parseJSON<TestSelector>(schedule.testSelector, {}),
            notificationConfig: schedule.notificationConfig
                ? this.parseJSON<ScheduleNotificationConfig>(schedule.notificationConfig, {} as ScheduleNotificationConfig)
                : undefined,
            isActive: schedule.isActive,
            nextRunAt: schedule.nextRunAt,
            lastRunAt: schedule.lastRunAt,
            createdAt: schedule.createdAt,
            updatedAt: schedule.updatedAt,
            runs: schedule.runs?.map((r: any) => this.formatRun(r)),
            parameters: this.parseJSON<ScheduleParameterDefinition[]>(schedule.parameters, []),
            defaultExecutionConfig: schedule.defaultExecutionConfig
                ? this.parseJSON<ScheduleExecutionConfig>(schedule.defaultExecutionConfig, {})
                : undefined,
            executionTarget: (schedule.executionTarget || 'local') as ScheduleExecutionTarget,
            githubConfig,
        };
    }

    private formatRun(run: any): ScheduleRun {
        return {
            id: run.id,
            scheduleId: run.scheduleId,
            triggerType: run.triggerType as ScheduleTriggerType,
            status: run.status,
            testCount: run.testCount,
            passedCount: run.passedCount,
            failedCount: run.failedCount,
            skippedCount: run.skippedCount,
            durationMs: run.durationMs,
            artifactsPath: run.artifactsPath,
            errorMessage: run.errorMessage,
            startedAt: run.startedAt,
            completedAt: run.completedAt,
            createdAt: run.createdAt,
            testResults: run.testResults?.map((tr: any) => this.formatTestResult(tr)),
            parameterValues: run.parameterValues
                ? this.parseJSON<ScheduleParameterValues>(run.parameterValues, {})
                : undefined,
            executionConfig: run.executionConfig
                ? this.parseJSON<ScheduleExecutionConfig>(run.executionConfig, {})
                : undefined,
            triggeredBy: run.triggeredByUser,
            githubRunId: run.githubRunId ? Number(run.githubRunId) : undefined,
            githubRunUrl: run.githubRunUrl,
        };
    }

    private formatTestResult(result: any): ScheduleTestResult {
        return {
            id: result.id,
            runId: result.runId,
            testName: result.testName,
            testPath: result.testPath,
            status: result.status,
            durationMs: result.durationMs,
            errorMessage: result.errorMessage,
            errorStack: result.errorStack,
            retryCount: result.retryCount,
            screenshotPath: result.screenshotPath,
            tracePath: result.tracePath,
            startedAt: result.startedAt,
            completedAt: result.completedAt,
        };
    }

    private parseJSON<T>(value: string | null | undefined, defaultValue: T): T {
        if (!value) return defaultValue;
        try {
            return JSON.parse(value);
        } catch {
            return defaultValue;
        }
    }
}

export const scheduleService = new ScheduleService();
