import { prisma } from '../db/prisma';
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

/**
 * Hash a webhook token for storage (optional additional security)
 */
function hashWebhookToken(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
}

// =============================================
// Timezone-aware Date Calculation
// =============================================

/**
 * Get the current time in a specific timezone
 */
function getNowInTimezone(timezone: string): Date {
    try {
        // Get current UTC time
        const now = new Date();

        // Format in the target timezone to get the offset
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

        // Construct date in the target timezone
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
        // Fallback to UTC if timezone is invalid
        return new Date();
    }
}

/**
 * Calculate next run time with proper timezone support
 */
function getNextRunTime(cronExpression: string, timezone: string = 'UTC'): Date | null {
    // Get current time in the specified timezone
    const nowInTz = getNowInTimezone(timezone);

    // Calculate next run using the cron parser
    const nextRun = calculateNextRunTime(cronExpression, nowInTz, timezone);

    if (!nextRun) {
        return null;
    }

    // Convert back to UTC for storage
    // The nextRun is calculated in the target timezone, we need to adjust
    try {
        // Get the offset between the timezone and UTC
        const utcFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'UTC',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });

        const tzFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });

        // For simplicity, return the calculated time
        // In production, you might want to use a library like luxon or date-fns-tz
        return nextRun;
    } catch {
        return nextRun;
    }
}

export class ScheduleService {
    /**
     * Create a new schedule
     */
    async create(userId: string, data: ScheduleCreate): Promise<Schedule> {
        // Validate cron expression using the full-featured parser
        const cronValidation = validateCron(data.cronExpression);
        if (!cronValidation.valid) {
            throw new ValidationError(cronValidation.error || 'Invalid cron expression');
        }

        // Calculate next run time with timezone support
        const nextRunAt = getNextRunTime(data.cronExpression, data.timezone || 'UTC');

        // Generate a secure webhook token for this schedule
        const webhookToken = generateWebhookToken();

        const schedule = await prisma.schedule.create({
            data: {
                userId,
                workflowId: data.workflowId,
                name: data.name,
                description: data.description,
                cronExpression: data.cronExpression,
                timezone: data.timezone || 'UTC',
                testSelector: JSON.stringify(data.testSelector || {}),
                notificationConfig: data.notificationConfig ? JSON.stringify(data.notificationConfig) : null,
                isActive: data.isActive ?? true,
                nextRunAt,
                webhookToken, // Store the secure webhook token
                // Parameter system
                parameters: data.parameters ? JSON.stringify(data.parameters) : null,
                defaultExecutionConfig: data.defaultExecutionConfig
                    ? JSON.stringify(data.defaultExecutionConfig)
                    : null,
            },
            include: {
                runs: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        return this.formatSchedule(schedule);
    }

    /**
     * Find all schedules for a user
     */
    async findAll(userId: string): Promise<Schedule[]> {
        const schedules = await prisma.schedule.findMany({
            where: { userId },
            include: {
                runs: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });

        return schedules.map(s => this.formatSchedule(s));
    }

    /**
     * Find a single schedule by ID
     */
    async findOne(userId: string, scheduleId: string): Promise<Schedule> {
        const schedule = await prisma.schedule.findUnique({
            where: { id: scheduleId },
            include: {
                runs: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        testResults: true,
                    },
                },
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
     * Update a schedule
     */
    async update(userId: string, scheduleId: string, data: ScheduleUpdate): Promise<Schedule> {
        const existing = await prisma.schedule.findUnique({
            where: { id: scheduleId },
        });

        if (!existing) {
            throw new NotFoundError('Schedule not found');
        }

        if (existing.userId !== userId) {
            throw new ForbiddenError('Access denied');
        }

        // Validate new cron expression if provided using the full-featured parser
        let nextRunAt = existing.nextRunAt;
        if (data.cronExpression) {
            const cronValidation = validateCron(data.cronExpression);
            if (!cronValidation.valid) {
                throw new ValidationError(cronValidation.error || 'Invalid cron expression');
            }
            nextRunAt = getNextRunTime(data.cronExpression, data.timezone || existing.timezone);
        }

        const schedule = await prisma.schedule.update({
            where: { id: scheduleId },
            data: {
                name: data.name,
                description: data.description,
                cronExpression: data.cronExpression,
                timezone: data.timezone,
                testSelector: data.testSelector ? JSON.stringify(data.testSelector) : undefined,
                notificationConfig: data.notificationConfig ? JSON.stringify(data.notificationConfig) : undefined,
                isActive: data.isActive,
                nextRunAt,
                // Parameter system
                parameters: data.parameters !== undefined
                    ? (data.parameters ? JSON.stringify(data.parameters) : null)
                    : undefined,
                defaultExecutionConfig: data.defaultExecutionConfig !== undefined
                    ? (data.defaultExecutionConfig ? JSON.stringify(data.defaultExecutionConfig) : null)
                    : undefined,
            },
            include: {
                runs: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        return this.formatSchedule(schedule);
    }

    /**
     * Delete a schedule
     */
    async delete(userId: string, scheduleId: string): Promise<void> {
        const existing = await prisma.schedule.findUnique({
            where: { id: scheduleId },
        });

        if (!existing) {
            throw new NotFoundError('Schedule not found');
        }

        if (existing.userId !== userId) {
            throw new ForbiddenError('Access denied');
        }

        await prisma.schedule.delete({
            where: { id: scheduleId },
        });
    }

    /**
     * Toggle schedule active status
     */
    async toggleActive(userId: string, scheduleId: string): Promise<Schedule> {
        const existing = await prisma.schedule.findUnique({
            where: { id: scheduleId },
        });

        if (!existing) {
            throw new NotFoundError('Schedule not found');
        }

        if (existing.userId !== userId) {
            throw new ForbiddenError('Access denied');
        }

        const schedule = await prisma.schedule.update({
            where: { id: scheduleId },
            data: {
                isActive: !existing.isActive,
                nextRunAt: !existing.isActive
                    ? getNextRunTime(existing.cronExpression, existing.timezone)
                    : null,
            },
            include: {
                runs: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        return this.formatSchedule(schedule);
    }

    /**
     * Trigger a manual run of a schedule with optional parameter overrides
     */
    async triggerRun(
        userId: string,
        scheduleId: string,
        request?: ScheduleTriggerRequest
    ): Promise<ScheduleRun> {
        const schedule = await prisma.schedule.findUnique({
            where: { id: scheduleId },
        });

        if (!schedule) {
            throw new NotFoundError('Schedule not found');
        }

        if (schedule.userId !== userId) {
            throw new ForbiddenError('Access denied');
        }

        // Get user info for audit
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });

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

        // Create a new run with 'manual' trigger type and captured parameters
        const run = await prisma.scheduleRun.create({
            data: {
                scheduleId,
                triggerType: 'manual',
                status: 'pending',
                parameterValues: Object.keys(effectiveParams).length > 0
                    ? JSON.stringify(effectiveParams)
                    : null,
                executionConfig: Object.keys(effectiveConfig).length > 0
                    ? JSON.stringify(effectiveConfig)
                    : null,
                triggeredByUser: user?.email || userId,
            },
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
                { priority: 2 } // High priority for manual triggers
            );

            logger.info(`Schedule run ${run.id} dispatched to queue`);

            // Audit log
            await auditService.logScheduleAction('triggered', scheduleId, userId, undefined, {
                runId: run.id,
                triggerType: 'manual',
            });
        } catch (error: any) {
            logger.error(`Failed to dispatch schedule run to queue:`, error);
            // Update run status to failed
            await prisma.scheduleRun.update({
                where: { id: run.id },
                data: {
                    status: 'failed',
                    errorMessage: `Failed to queue: ${error.message}`,
                    completedAt: new Date(),
                },
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

            // Check required parameters
            if (param.required && (value === undefined || value === '')) {
                throw new ValidationError(`Parameter "${param.label}" is required`);
            }

            // Skip validation if value is not provided and not required
            if (value === undefined) continue;

            // Type-specific validation
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

                case 'boolean':
                    // Boolean values are flexible - accept true/false/"true"/"false"
                    break;
            }
        }
    }

    /**
     * Trigger a run via webhook token
     */
    async triggerWebhook(webhookToken: string): Promise<ScheduleRun> {
        // Validate token format (must be 64 hex characters)
        if (!/^[a-f0-9]{64}$/i.test(webhookToken)) {
            throw new NotFoundError('Invalid webhook token');
        }

        // Find the schedule by the secure webhook token
        const schedule = await prisma.schedule.findFirst({
            where: { webhookToken },
        });

        if (!schedule) {
            throw new NotFoundError('Invalid webhook token');
        }

        if (!schedule.isActive) {
            throw new ValidationError('Schedule is not active');
        }

        const run = await prisma.scheduleRun.create({
            data: {
                scheduleId: schedule.id,
                triggerType: 'webhook',
                status: 'pending',
                webhookToken,
            },
        });

        // Dispatch to execution queue
        try {
            // Parse schedule's execution config
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
                { priority: 1 } // Normal priority for webhook triggers
            );

            logger.info(`Webhook-triggered run ${run.id} dispatched to queue`);

            // Audit log
            await auditService.logScheduleAction('triggered', schedule.id, undefined, undefined, {
                runId: run.id,
                triggerType: 'webhook',
            });
        } catch (error: any) {
            logger.error(`Failed to dispatch webhook run to queue:`, error);
            await prisma.scheduleRun.update({
                where: { id: run.id },
                data: {
                    status: 'failed',
                    errorMessage: `Failed to queue: ${error.message}`,
                    completedAt: new Date(),
                },
            });
        }

        return this.formatRun(run);
    }

    /**
     * Get run history for a schedule
     */
    async getRuns(userId: string, scheduleId: string, limit: number = 20): Promise<ScheduleRun[]> {
        const schedule = await prisma.schedule.findUnique({
            where: { id: scheduleId },
        });

        if (!schedule) {
            throw new NotFoundError('Schedule not found');
        }

        if (schedule.userId !== userId) {
            throw new ForbiddenError('Access denied');
        }

        const runs = await prisma.scheduleRun.findMany({
            where: { scheduleId },
            include: {
                testResults: true,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return runs.map(r => this.formatRun(r));
    }

    /**
     * Get details of a specific run
     */
    async getRun(userId: string, runId: string): Promise<ScheduleRun> {
        const run = await prisma.scheduleRun.findUnique({
            where: { id: runId },
            include: {
                schedule: true,
                testResults: true,
            },
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
     * Get schedules that are due to run
     */
    async getDueSchedules(): Promise<Schedule[]> {
        const now = new Date();

        const schedules = await prisma.schedule.findMany({
            where: {
                isActive: true,
                nextRunAt: {
                    lte: now,
                },
            },
        });

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

        await prisma.scheduleRun.update({
            where: { id: runId },
            data: {
                status: results.status,
                testCount: results.testCount,
                passedCount: results.passedCount,
                failedCount: results.failedCount,
                skippedCount: results.skippedCount,
                durationMs: results.durationMs,
                artifactsPath: results.artifactsPath,
                errorMessage: results.errorMessage,
                completedAt: now,
            },
        });

        // Update the schedule's lastRunAt and calculate next run
        const run = await prisma.scheduleRun.findUnique({
            where: { id: runId },
            include: { schedule: true },
        });

        if (run) {
            const nextRunAt = getNextRunTime(run.schedule.cronExpression, run.schedule.timezone);

            await prisma.schedule.update({
                where: { id: run.scheduleId },
                data: {
                    lastRunAt: now,
                    nextRunAt,
                },
            });
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
     * Preview upcoming run times with proper timezone support
     */
    previewNextRuns(cronExpression: string, timezone: string = 'UTC', count: number = 5): Date[] {
        // Use the proper cron parser's getNextRunTimes function
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
        const schedule = await prisma.schedule.findUnique({
            where: { id: scheduleId },
        });

        if (!schedule) {
            throw new NotFoundError('Schedule not found');
        }

        if (schedule.userId !== userId) {
            throw new ForbiddenError('Access denied');
        }

        const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

        return {
            token: schedule.webhookToken,
            webhookUrl: schedule.webhookToken
                ? `${baseUrl}/api/schedules/webhook/${schedule.webhookToken}`
                : null,
            hasToken: !!schedule.webhookToken,
        };
    }

    /**
     * Regenerate webhook token for a schedule (security feature)
     */
    async regenerateWebhookToken(userId: string, scheduleId: string): Promise<string> {
        const existing = await prisma.schedule.findUnique({
            where: { id: scheduleId },
        });

        if (!existing) {
            throw new NotFoundError('Schedule not found');
        }

        if (existing.userId !== userId) {
            throw new ForbiddenError('Access denied');
        }

        const newToken = generateWebhookToken();

        await prisma.schedule.update({
            where: { id: scheduleId },
            data: { webhookToken: newToken },
        });

        return newToken;
    }

    // =============================================
    // Private formatting methods
    // =============================================

    private formatSchedule(schedule: any): Schedule {
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
            // Parameter system
            parameters: this.parseJSON<ScheduleParameterDefinition[]>(schedule.parameters, []),
            defaultExecutionConfig: schedule.defaultExecutionConfig
                ? this.parseJSON<ScheduleExecutionConfig>(schedule.defaultExecutionConfig, {})
                : undefined,
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
            // Parameter system
            parameterValues: run.parameterValues
                ? this.parseJSON<ScheduleParameterValues>(run.parameterValues, {})
                : undefined,
            executionConfig: run.executionConfig
                ? this.parseJSON<ScheduleExecutionConfig>(run.executionConfig, {})
                : undefined,
            triggeredBy: run.triggeredByUser,
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
