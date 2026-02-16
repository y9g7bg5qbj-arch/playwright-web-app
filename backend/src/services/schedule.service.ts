/**
 * Schedule Service
 *
 * Manages scheduled test execution with cron expressions.
 */

import {
    scheduleRepository,
    scheduleRunRepository,
    scheduleTestResultRepository,
    userRepository,
    runConfigurationRepository,
    workflowRepository,
    projectRepository,
    sandboxRepository,
    runParameterDefinitionRepository,
    runParameterSetRepository,
} from '../db/repositories/mongo';
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
    ScheduleFolderScope,
} from '@playwright-web-app/shared';
import { randomBytes } from 'crypto';

// Import the full-featured cron parser
import { validateCronExpression as validateCron, getNextRunTime as calculateNextRunTime, getNextRunTimes as calculateNextRunTimes, describeCronExpression as describeCron } from './scheduler/cronParser';

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
// Date Calculation
// =============================================

/**
 * Calculate next run time with timezone support
 */
function getNextRunTime(cronExpression: string, timezone: string = 'UTC', fromDate: Date = new Date()): Date | null {
    const nextRun = calculateNextRunTime(cronExpression, fromDate, timezone);
    return nextRun || null;
}

const SCHEDULE_RUN_CONFIG_MIGRATION_VERSION = 1;

export class ScheduleService {
    private migrationInFlight: Promise<void> | null = null;
    private migrationCompleted = false;

    async ensureLegacySchedulesMigrated(): Promise<void> {
        if (this.migrationCompleted) {
            return;
        }
        if (this.migrationInFlight) {
            await this.migrationInFlight;
            return;
        }

        this.migrationInFlight = this.runLegacyScheduleBackfill();
        try {
            await this.migrationInFlight;
            this.migrationCompleted = true;
        } finally {
            this.migrationInFlight = null;
        }
    }

    private mapRunArtifactToSchedule(mode?: string): ScheduleExecutionConfig['tracing'] {
        if (mode === 'on' || mode === 'always') return 'always';
        if (mode === 'off' || mode === 'never') return 'never';
        return 'on-failure';
    }

    private mapScheduleArtifactToRun(mode?: string): 'on' | 'off' | 'on-failure' {
        if (mode === 'always' || mode === 'on') return 'on';
        if (mode === 'never' || mode === 'off') return 'off';
        return 'on-failure';
    }

    private buildLegacyCompatFromRunConfiguration(config: any): {
        executionTarget: ScheduleExecutionTarget;
        githubRepoFullName?: string;
        githubBranch?: string;
        githubWorkflowFile?: string;
        githubInputs?: string;
    } {
        const runtime = this.parseJSON<Record<string, unknown>>(config.runtimeConfig, {});
        const githubInputs = runtime.githubInputs && typeof runtime.githubInputs === 'object'
            ? runtime.githubInputs as Record<string, string>
            : undefined;

        return {
            executionTarget: config.target === 'github-actions' ? 'github-actions' : 'local',
            githubRepoFullName: config.githubRepository || undefined,
            githubBranch: typeof runtime.githubBranch === 'string' ? runtime.githubBranch : undefined,
            githubWorkflowFile: config.githubWorkflowPath || undefined,
            githubInputs: githubInputs ? JSON.stringify(githubInputs) : undefined,
        };
    }

    private buildScheduleExecutionConfigFromRunConfiguration(config: any): ScheduleExecutionConfig {
        return {
            browser: config.browser || 'chromium',
            headless: config.headless ?? true,
            workers: config.workers ?? 1,
            retries: config.retries ?? 0,
            timeout: config.timeout ?? 30000,
            tracing: this.mapRunArtifactToSchedule(config.tracing),
            screenshot: this.mapRunArtifactToSchedule(config.screenshot),
            video: this.mapRunArtifactToSchedule(config.video),
            environmentId: config.environmentId || undefined,
            parameterSetId: config.parameterSetId || undefined,
        };
    }

    private async resolveWorkflowIdForSchedule(schedule: any): Promise<string | null> {
        if (schedule.workflowId) {
            return schedule.workflowId;
        }

        // Schedules sometimes store application IDs in projectId. Try both interpretations.
        if (schedule.projectId) {
            const workflowsByApp = await workflowRepository.findByApplicationId(schedule.projectId);
            if (workflowsByApp.length > 0) {
                return workflowsByApp[0].id;
            }

            const project = await projectRepository.findById(schedule.projectId);
            if (project?.applicationId) {
                const workflowsByProjectApp = await workflowRepository.findByApplicationId(project.applicationId);
                if (workflowsByProjectApp.length > 0) {
                    return workflowsByProjectApp[0].id;
                }
            }
        }

        const userWorkflows = await workflowRepository.findByUserId(schedule.userId);
        return userWorkflows[0]?.id || null;
    }

    private async resolveApplicationIdForSchedule(schedule: any): Promise<string | null> {
        if (schedule.projectId) {
            // In current frontend flow, projectId is often the application ID.
            const workflowsByApp = await workflowRepository.findByApplicationId(schedule.projectId);
            if (workflowsByApp.length > 0) {
                return schedule.projectId;
            }

            const project = await projectRepository.findById(schedule.projectId);
            if (project?.applicationId) {
                return project.applicationId;
            }
        }

        const workflowId = await this.resolveWorkflowIdForSchedule(schedule);
        if (!workflowId) {
            return null;
        }
        const workflow = await workflowRepository.findById(workflowId);
        return workflow?.applicationId || null;
    }

    private async loadAndValidateRunConfiguration(
        runConfigurationId: string,
        workflowId: string,
        projectId?: string
    ): Promise<any> {
        const linkedConfig = await runConfigurationRepository.findById(runConfigurationId);
        if (!linkedConfig) {
            throw new ValidationError(`Run configuration '${runConfigurationId}' not found`);
        }
        if (linkedConfig.workflowId !== workflowId) {
            throw new ValidationError('Run configuration does not belong to this workflow');
        }
        if (projectId && linkedConfig.projectId !== projectId) {
            throw new ValidationError('Run configuration does not belong to this project');
        }
        return linkedConfig;
    }

    private async validateWorkflowOwnership(userId: string, workflowId: string): Promise<any> {
        const workflow = await workflowRepository.findById(workflowId);
        if (!workflow) {
            throw new ValidationError(`Workflow '${workflowId}' not found`);
        }
        if (workflow.userId !== userId) {
            throw new ForbiddenError('Workflow does not belong to current user');
        }
        return workflow;
    }

    private async validateProjectWorkflowOwnership(
        projectId: string,
        workflowId: string,
        userId?: string
    ): Promise<void> {
        const workflow = userId
            ? await this.validateWorkflowOwnership(userId, workflowId)
            : await workflowRepository.findById(workflowId);
        if (!workflow) {
            throw new ValidationError(`Workflow '${workflowId}' not found`);
        }

        const project = await projectRepository.findById(projectId);
        if (!project) {
            throw new ValidationError(`Project '${projectId}' not found`);
        }

        if (project.applicationId !== workflow.applicationId) {
            throw new ValidationError('Selected project does not belong to the selected workflow');
        }
    }

    private async buildSelectorFromScope(
        projectId: string,
        scopeFolder: ScheduleFolderScope,
        scopeSandboxId?: string
    ): Promise<TestSelector> {
        if (scopeFolder === 'dev') {
            return { folders: ['dev'] };
        }
        if (scopeFolder === 'master') {
            return { folders: ['master'] };
        }

        if (!scopeSandboxId) {
            throw new ValidationError('scopeSandboxId is required when scopeFolder is sandboxes');
        }

        const sandbox = await sandboxRepository.findById(scopeSandboxId);
        if (!sandbox) {
            throw new ValidationError(`Sandbox '${scopeSandboxId}' not found`);
        }
        if (sandbox.projectId !== projectId) {
            throw new ValidationError('Selected sandbox does not belong to selected project');
        }
        if (sandbox.status !== 'active') {
            throw new ValidationError('Selected sandbox is not active');
        }
        if (!sandbox.folderPath) {
            throw new ValidationError('Selected sandbox has no folder path');
        }

        return { folders: [sandbox.folderPath] };
    }

    private async resolveRunParametersForSchedule(
        schedule: any,
        linkedConfig?: any,
    ): Promise<{ schema: ScheduleParameterDefinition[]; defaults: ScheduleParameterValues }> {
        const applicationId = await this.resolveApplicationIdForSchedule(schedule);
        if (!applicationId) {
            const legacySchema = this.parseJSON<ScheduleParameterDefinition[]>(schedule.parameters, []);
            return {
                schema: legacySchema,
                defaults: this.buildDefaultParameterValues(legacySchema),
            };
        }

        const definitions = await runParameterDefinitionRepository.findByApplicationId(applicationId);
        const schema: ScheduleParameterDefinition[] = definitions.map((def) => ({
            name: def.name,
            type: def.type === 'enum' ? 'choice' : def.type,
            label: def.label,
            description: def.description,
            defaultValue: def.defaultValue ?? '',
            required: def.required,
            choices: def.choices,
            min: def.min,
            max: def.max,
        }));

        if (schema.length === 0) {
            const legacySchema = this.parseJSON<ScheduleParameterDefinition[]>(schedule.parameters, []);
            return {
                schema: legacySchema,
                defaults: this.buildDefaultParameterValues(legacySchema),
            };
        }

        let defaults: ScheduleParameterValues = this.buildDefaultParameterValues(schema);

        if (linkedConfig?.parameterSetId) {
            const parameterSet = await runParameterSetRepository.findById(linkedConfig.parameterSetId);
            if (parameterSet && parameterSet.applicationId === applicationId) {
                defaults = {
                    ...defaults,
                    ...parameterSet.values,
                };
            }
        } else {
            const allSets = await runParameterSetRepository.findByApplicationId(applicationId);
            const defaultSet = allSets.find((s) => s.isDefault);
            if (defaultSet) {
                defaults = {
                    ...defaults,
                    ...defaultSet.values,
                };
            }
        }

        const parameterOverrides = this.parseJSON<Record<string, string | number | boolean>>(
            linkedConfig?.parameterOverrides,
            {}
        );
        if (Object.keys(parameterOverrides).length > 0) {
            defaults = {
                ...defaults,
                ...parameterOverrides,
            };
        }

        return { schema, defaults };
    }

    private async runLegacyScheduleBackfill(): Promise<void> {
        const users = await userRepository.findAll();
        let migrated = 0;
        let skipped = 0;

        for (const user of users) {
            const schedules = await scheduleRepository.findByUserId(user.id);
            for (const schedule of schedules) {
                if (schedule.runConfigurationId || schedule.migrationVersion === SCHEDULE_RUN_CONFIG_MIGRATION_VERSION) {
                    continue;
                }

                try {
                    const workflowId = await this.resolveWorkflowIdForSchedule(schedule);
                    if (!workflowId) {
                        skipped += 1;
                        logger.warn(`[ScheduleMigration] Skipping schedule ${schedule.id}: unable to resolve workflow`);
                        continue;
                    }

                    const selector = this.parseJSON<TestSelector>(schedule.testSelector, {});
                    const legacyParams = this.parseJSON<ScheduleParameterDefinition[]>(schedule.parameters, []);
                    const legacyConfig = this.parseJSON<ScheduleExecutionConfig>(schedule.defaultExecutionConfig, {});
                    const githubInputs = this.parseJSON<Record<string, string>>(schedule.githubInputs, {});

                    const target = schedule.executionTarget === 'github-actions' ? 'github-actions' : 'local';
                    const migratedConfig = await runConfigurationRepository.create({
                        workflowId,
                        name: `${schedule.name} (Migrated)`,
                        description: schedule.description || 'Auto-migrated from legacy scheduler settings',
                        isDefault: false,
                        tags: selector.tags || [],
                        tagMode: selector.tagMode || 'any',
                        excludeTags: [],
                        testFlowIds: selector.testFlowIds || [],
                        grep: (legacyConfig as any).grep,
                        tagExpression: (legacyConfig as any).tagExpression,
                        namePatterns: (legacyConfig as any).namePatterns
                            ? JSON.stringify((legacyConfig as any).namePatterns)
                            : undefined,
                        environmentId: legacyConfig.environmentId,
                        target,
                        localConfig: target === 'local'
                            ? JSON.stringify({ workers: legacyConfig.workers || 1 })
                            : undefined,
                        dockerConfig: undefined,
                        githubActionsConfig: target === 'github-actions'
                            ? JSON.stringify({
                                runnerType: 'cloud-hosted',
                                shardCount: (legacyConfig as any).shardCount || 1,
                                workersPerShard: legacyConfig.workers || 1,
                            })
                            : undefined,
                        browser: legacyConfig.browser || 'chromium',
                        browserChannel: undefined,
                        headless: legacyConfig.headless ?? true,
                        viewport: JSON.stringify({ width: 1280, height: 720 }),
                        workers: legacyConfig.workers || 1,
                        shardCount: (legacyConfig as any).shardCount || 1,
                        retries: legacyConfig.retries || 0,
                        timeout: legacyConfig.timeout || 30000,
                        tracing: this.mapScheduleArtifactToRun((legacyConfig as any).tracing),
                        screenshot: this.mapScheduleArtifactToRun((legacyConfig as any).screenshot),
                        video: this.mapScheduleArtifactToRun((legacyConfig as any).video),
                        advancedConfig: undefined,
                        selectionScope: (legacyConfig as any).selectionScope,
                        envVars: (legacyConfig as any).envVars
                            ? JSON.stringify((legacyConfig as any).envVars)
                            : undefined,
                        parameterSetId: legacyConfig.parameterSetId,
                        parameterOverrides: undefined,
                        githubRepository: schedule.githubRepoFullName || undefined,
                        githubWorkflowPath: schedule.githubWorkflowFile || undefined,
                        visualPreset: (legacyConfig as any).visualPreset,
                        visualThreshold: (legacyConfig as any).visualThreshold,
                        visualMaxDiffPixels: (legacyConfig as any).visualMaxDiffPixels,
                        visualMaxDiffPixelRatio: (legacyConfig as any).visualMaxDiffPixelRatio,
                        visualUpdateSnapshots: (legacyConfig as any).visualUpdateSnapshots,
                        runtimeConfig: JSON.stringify({
                            headed: legacyConfig.headless === false,
                            githubBranch: schedule.githubBranch || undefined,
                            githubInputs: Object.keys(githubInputs).length > 0 ? githubInputs : undefined,
                            legacyScheduleMigration: {
                                scheduleId: schedule.id,
                                executionTarget: schedule.executionTarget,
                                testSelector: selector,
                                parameters: legacyParams,
                                defaultExecutionConfig: legacyConfig,
                                githubConfig: schedule.githubRepoFullName
                                    ? {
                                        repoFullName: schedule.githubRepoFullName,
                                        branch: schedule.githubBranch || 'main',
                                        workflowFile: schedule.githubWorkflowFile || 'vero-tests.yml',
                                        inputs: Object.keys(githubInputs).length > 0 ? githubInputs : undefined,
                                    }
                                    : undefined,
                            },
                        }),
                    });

                    const compat = this.buildLegacyCompatFromRunConfiguration(migratedConfig);
                    await scheduleRepository.update(schedule.id, {
                        workflowId,
                        runConfigurationId: migratedConfig.id,
                        executionTarget: compat.executionTarget,
                        githubRepoFullName: compat.githubRepoFullName,
                        githubBranch: compat.githubBranch,
                        githubWorkflowFile: compat.githubWorkflowFile,
                        githubInputs: compat.githubInputs,
                        migrationVersion: SCHEDULE_RUN_CONFIG_MIGRATION_VERSION,
                    });
                    migrated += 1;
                } catch (error: any) {
                    skipped += 1;
                    logger.warn(`[ScheduleMigration] Failed to migrate schedule ${schedule.id}: ${error?.message || error}`);
                }
            }
        }

        if (migrated > 0 || skipped > 0) {
            logger.info(`[ScheduleMigration] Completed: migrated=${migrated}, skipped=${skipped}`);
        }
    }

    /**
     * Create a new schedule
     */
    async create(userId: string, data: ScheduleCreate): Promise<Schedule> {
        // Validate cron expression
        const cronValidation = validateCron(data.cronExpression);
        if (!cronValidation.valid) {
            throw new ValidationError(cronValidation.error || 'Invalid cron expression');
        }

        if (!data.workflowId) {
            throw new ValidationError('workflowId is required');
        }
        if (!data.projectId) {
            throw new ValidationError('projectId is required');
        }
        if (!data.scopeFolder) {
            throw new ValidationError('scopeFolder is required');
        }
        if (data.scopeFolder !== 'sandboxes' && data.scopeSandboxId) {
            throw new ValidationError('scopeSandboxId is only valid when scopeFolder is sandboxes');
        }
        if (!data.runConfigurationId) {
            throw new ValidationError('runConfigurationId is required');
        }

        await this.validateProjectWorkflowOwnership(data.projectId, data.workflowId, userId);

        const scopeSandboxId = data.scopeFolder === 'sandboxes' ? data.scopeSandboxId : undefined;
        const generatedSelector = await this.buildSelectorFromScope(
            data.projectId,
            data.scopeFolder,
            scopeSandboxId
        );

        const linkedConfig = await this.loadAndValidateRunConfiguration(
            data.runConfigurationId,
            data.workflowId,
            data.projectId
        );
        const compat = this.buildLegacyCompatFromRunConfiguration(linkedConfig);
        if (compat.executionTarget === 'github-actions' && (!compat.githubRepoFullName || !compat.githubWorkflowFile)) {
            throw new ValidationError('Linked run configuration is missing GitHub repository/workflow settings');
        }

        const nextRunAt = getNextRunTime(data.cronExpression, data.timezone || 'UTC');
        const webhookToken = generateWebhookToken();

        const schedule = await scheduleRepository.create({
            userId,
            projectId: data.projectId,
            workflowId: data.workflowId,
            scopeFolder: data.scopeFolder,
            scopeSandboxId,
            name: data.name,
            description: data.description,
            cronExpression: data.cronExpression,
            timezone: data.timezone || 'UTC',
            testSelector: JSON.stringify(generatedSelector),
            notificationConfig: data.notificationConfig ? JSON.stringify(data.notificationConfig) : undefined,
            isActive: data.isActive ?? true,
            nextRunAt: nextRunAt || undefined,
            webhookToken,
            parameters: undefined,
            defaultExecutionConfig: undefined,
            executionTarget: compat.executionTarget,
            runConfigurationId: data.runConfigurationId,
            githubRepoFullName: compat.executionTarget === 'github-actions' ? compat.githubRepoFullName : undefined,
            githubBranch: compat.executionTarget === 'github-actions' ? (compat.githubBranch || 'main') : undefined,
            githubWorkflowFile: compat.executionTarget === 'github-actions' ? compat.githubWorkflowFile : undefined,
            githubInputs: compat.executionTarget === 'github-actions' ? compat.githubInputs : undefined,
            migrationVersion: SCHEDULE_RUN_CONFIG_MIGRATION_VERSION,
        });

        // Get recent runs
        const runs = await scheduleRunRepository.findByScheduleId(schedule.id, 5);

        return this.formatSchedule({ ...schedule, runs });
    }

    /**
     * Find all schedules for a user
     */
    async findAll(userId: string, workflowId?: string): Promise<Schedule[]> {
        if (workflowId) {
            await this.validateWorkflowOwnership(userId, workflowId);
            const schedules = await scheduleRepository.findByUserIdAndWorkflowId(userId, workflowId);
            const schedulesWithRuns = await Promise.all(
                schedules.map(async (schedule) => {
                    const runs = await scheduleRunRepository.findByScheduleId(schedule.id, 5);
                    return { ...schedule, runs };
                })
            );
            return schedulesWithRuns.map(s => this.formatSchedule(s));
        }

        const schedules = await scheduleRepository.findByUserId(userId);
        const schedulesWithRuns = await Promise.all(
            schedules.map(async (schedule) => {
                const runs = await scheduleRunRepository.findByScheduleId(schedule.id, 5);
                return { ...schedule, runs };
            })
        );

        return schedulesWithRuns.map(s => this.formatSchedule(s));
    }

    /**
     * Find a single schedule by ID
     */
    /**
     * Enrich run records with their test results.
     */
    private async enrichRunsWithResults(runs: any[]): Promise<any[]> {
        return Promise.all(
            runs.map(async (run) => {
                const testResults = await scheduleTestResultRepository.findByRunId(run.id);
                return { ...run, testResults };
            })
        );
    }

    /**
     * Verify user owns the schedule. Returns the schedule record.
     */
    private async verifyOwnership(userId: string, scheduleId: string): Promise<any> {
        const schedule = await scheduleRepository.findById(scheduleId);

        if (!schedule) {
            throw new NotFoundError('Schedule not found');
        }

        if (schedule.userId !== userId) {
            throw new ForbiddenError('Access denied');
        }

        return schedule;
    }

    async findOne(userId: string, scheduleId: string): Promise<Schedule> {
        const schedule = await this.verifyOwnership(userId, scheduleId);

        const runs = await scheduleRunRepository.findByScheduleId(scheduleId, 10);
        const runsWithResults = await this.enrichRunsWithResults(runs);

        return this.formatSchedule({ ...schedule, runs: runsWithResults });
    }

    /**
     * Update a schedule
     */
    async update(userId: string, scheduleId: string, data: ScheduleUpdate): Promise<Schedule> {
        const existing = await this.verifyOwnership(userId, scheduleId);

        // Validate new cron expression if provided
        let nextRunAt = existing.nextRunAt;
        if (data.cronExpression || data.timezone) {
            const effectiveCronExpression = data.cronExpression || existing.cronExpression;
            const effectiveTimezone = data.timezone || existing.timezone;
            const cronValidation = validateCron(effectiveCronExpression);
            if (!cronValidation.valid) {
                throw new ValidationError(cronValidation.error || 'Invalid cron expression');
            }
            nextRunAt = getNextRunTime(effectiveCronExpression, effectiveTimezone) || undefined;
        }

        if (!data.runConfigurationId) {
            throw new ValidationError('runConfigurationId is required');
        }
        const effectiveRunConfigurationId = data.runConfigurationId;

        const effectiveWorkflowId = existing.workflowId;
        if (!effectiveWorkflowId) {
            throw new ValidationError('workflowId is required to validate run configuration ownership');
        }
        await this.validateWorkflowOwnership(userId, effectiveWorkflowId);

        const scopeInputProvided =
            data.projectId !== undefined ||
            data.scopeFolder !== undefined ||
            data.scopeSandboxId !== undefined;
        const existingHasScope = Boolean(existing.projectId && existing.scopeFolder);

        const effectiveProjectId = (data.projectId ?? existing.projectId) as string | undefined;
        const effectiveScopeFolder = (data.scopeFolder ?? existing.scopeFolder) as ScheduleFolderScope | undefined;
        let effectiveScopeSandboxId = (data.scopeSandboxId ?? existing.scopeSandboxId) as string | undefined;

        const sandboxFolderForValidation = data.scopeFolder ?? existing.scopeFolder;
        if (data.scopeSandboxId !== undefined && sandboxFolderForValidation !== 'sandboxes') {
            throw new ValidationError('scopeSandboxId is only valid when scopeFolder is sandboxes');
        }
        if (effectiveScopeFolder === 'sandboxes' && !effectiveScopeSandboxId) {
            throw new ValidationError('scopeSandboxId is required when scopeFolder is sandboxes');
        }
        if (effectiveScopeFolder && effectiveScopeFolder !== 'sandboxes') {
            effectiveScopeSandboxId = undefined;
        }

        let generatedSelector: TestSelector | undefined;
        if (scopeInputProvided || existingHasScope) {
            if (!effectiveProjectId || !effectiveScopeFolder) {
                throw new ValidationError('projectId and scopeFolder are required for schedule updates');
            }

            await this.validateProjectWorkflowOwnership(effectiveProjectId, effectiveWorkflowId, userId);
            generatedSelector = await this.buildSelectorFromScope(
                effectiveProjectId,
                effectiveScopeFolder,
                effectiveScopeSandboxId
            );
        }

        const linkedConfig = await this.loadAndValidateRunConfiguration(
            effectiveRunConfigurationId,
            effectiveWorkflowId,
            effectiveProjectId
        );
        const compat = this.buildLegacyCompatFromRunConfiguration(linkedConfig);
        if (compat.executionTarget === 'github-actions' && (!compat.githubRepoFullName || !compat.githubWorkflowFile)) {
            throw new ValidationError('Linked run configuration is missing GitHub repository/workflow settings');
        }

        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.cronExpression !== undefined) updateData.cronExpression = data.cronExpression;
        if (data.timezone !== undefined) updateData.timezone = data.timezone;
        if (generatedSelector) {
            updateData.projectId = effectiveProjectId;
            updateData.scopeFolder = effectiveScopeFolder;
            updateData.scopeSandboxId = effectiveScopeFolder === 'sandboxes' ? effectiveScopeSandboxId : null;
            updateData.testSelector = JSON.stringify(generatedSelector);
        }
        if (data.notificationConfig !== undefined) {
            updateData.notificationConfig = data.notificationConfig
                ? JSON.stringify(data.notificationConfig)
                : null;
        }
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (nextRunAt !== undefined) updateData.nextRunAt = nextRunAt;
        updateData.runConfigurationId = effectiveRunConfigurationId;
        updateData.executionTarget = compat.executionTarget;
        updateData.githubRepoFullName = compat.githubRepoFullName || null;
        updateData.githubBranch = compat.githubBranch || null;
        updateData.githubWorkflowFile = compat.githubWorkflowFile || null;
        updateData.githubInputs = compat.githubInputs || null;
        updateData.migrationVersion = SCHEDULE_RUN_CONFIG_MIGRATION_VERSION;

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
        await this.verifyOwnership(userId, scheduleId);
        await scheduleRepository.delete(scheduleId);
    }

    /**
     * Toggle schedule active status
     */
    async toggleActive(userId: string, scheduleId: string): Promise<Schedule> {
        const existing = await this.verifyOwnership(userId, scheduleId);

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
        const schedule = await this.verifyOwnership(userId, scheduleId);

        // Get user info for audit
        const user = await userRepository.findById(userId);

        if (!schedule.runConfigurationId) {
            throw new ValidationError('Schedule is not linked to a run configuration');
        }
        if (!schedule.workflowId) {
            throw new ValidationError('Schedule is missing workflow context');
        }

        if (request && Object.prototype.hasOwnProperty.call(request as object, 'executionConfig')) {
            throw new ValidationError('Manual execution overrides are no longer supported for schedules');
        }

        const linkedConfig = await this.loadAndValidateRunConfiguration(
            schedule.runConfigurationId,
            schedule.workflowId,
            schedule.projectId
        );
        const effectiveConfig = this.buildScheduleExecutionConfigFromRunConfiguration(linkedConfig);

        const { schema, defaults } = await this.resolveRunParametersForSchedule(schedule, linkedConfig);
        const effectiveParams: ScheduleParameterValues = {
            ...defaults,
            ...(request?.parameterValues || {}),
        };
        this.validateParameterValues(schema, effectiveParams);

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

    private buildDefaultParameterValues(schema: ScheduleParameterDefinition[]): ScheduleParameterValues {
        const defaults: ScheduleParameterValues = {};
        schema.forEach((param) => {
            defaults[param.name] = param.defaultValue;
        });
        return defaults;
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

        let effectiveConfig: ScheduleExecutionConfig = schedule.defaultExecutionConfig
            ? this.parseJSON<ScheduleExecutionConfig>(schedule.defaultExecutionConfig, {})
            : {};
        let effectiveParams: ScheduleParameterValues = {};

        if (schedule.runConfigurationId && schedule.workflowId) {
            const linkedConfig = await this.loadAndValidateRunConfiguration(
                schedule.runConfigurationId,
                schedule.workflowId,
                schedule.projectId
            );
            effectiveConfig = this.buildScheduleExecutionConfigFromRunConfiguration(linkedConfig);
            const { defaults } = await this.resolveRunParametersForSchedule(schedule, linkedConfig);
            effectiveParams = defaults;
        } else {
            const legacySchema = this.parseJSON<ScheduleParameterDefinition[]>(schedule.parameters, []);
            effectiveParams = this.buildDefaultParameterValues(legacySchema);
        }

        const run = await scheduleRunRepository.create({
            scheduleId: schedule.id,
            triggerType: 'webhook',
            status: 'pending',
            webhookToken,
            parameterValues: Object.keys(effectiveParams).length > 0
                ? JSON.stringify(effectiveParams)
                : undefined,
            executionConfig: Object.keys(effectiveConfig).length > 0
                ? JSON.stringify(effectiveConfig)
                : undefined,
        });

        // Dispatch to execution queue
        try {
            const jobData: ScheduleRunJobData = {
                scheduleId: schedule.id,
                runId: run.id,
                userId: schedule.userId,
                triggerType: 'webhook',
                parameterValues: effectiveParams,
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
    async getRuns(userId: string, scheduleId: string, limit: number = 20, offset: number = 0): Promise<{ runs: ScheduleRun[]; total: number }> {
        await this.verifyOwnership(userId, scheduleId);

        const [rawRuns, total] = await Promise.all([
            scheduleRunRepository.findByScheduleId(scheduleId, limit, offset),
            scheduleRunRepository.countByScheduleId(scheduleId),
        ]);
        const runsWithResults = await this.enrichRunsWithResults(rawRuns);

        return {
            runs: runsWithResults.map(r => this.formatRun(r)),
            total,
        };
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
     * Dispatch due schedules to the execution queue.
     *
     * This is called by the queue bootstrap poller to ensure cron schedules
     * are actually enqueued for execution.
     */
    async dispatchDueSchedules(limit: number = 100): Promise<{ dispatched: number; skipped: number; failed: number }> {
        const dueSchedules = await scheduleRepository.findDue();
        const schedulesToDispatch = dueSchedules.slice(0, Math.max(0, limit));

        let dispatched = 0;
        let skipped = 0;
        let failed = 0;

        for (const schedule of schedulesToDispatch) {
            if (!schedule.isActive) {
                skipped += 1;
                continue;
            }

            try {
                let defaultParamValues: ScheduleParameterValues = {};
                let defaultConfig: ScheduleExecutionConfig = schedule.defaultExecutionConfig
                    ? this.parseJSON<ScheduleExecutionConfig>(schedule.defaultExecutionConfig, {})
                    : {};

                if (schedule.runConfigurationId && schedule.workflowId) {
                    const linkedConfig = await this.loadAndValidateRunConfiguration(
                        schedule.runConfigurationId,
                        schedule.workflowId,
                        schedule.projectId
                    );
                    defaultConfig = this.buildScheduleExecutionConfigFromRunConfiguration(linkedConfig);
                    const { defaults } = await this.resolveRunParametersForSchedule(schedule, linkedConfig);
                    defaultParamValues = defaults;
                } else {
                    const scheduleParams: ScheduleParameterDefinition[] = this.parseJSON<ScheduleParameterDefinition[]>(
                        schedule.parameters,
                        []
                    );
                    defaultParamValues = this.buildDefaultParameterValues(scheduleParams);
                }

                const run = await scheduleRunRepository.create({
                    scheduleId: schedule.id,
                    triggerType: 'scheduled',
                    status: 'pending',
                    parameterValues: Object.keys(defaultParamValues).length > 0
                        ? JSON.stringify(defaultParamValues)
                        : undefined,
                    executionConfig: Object.keys(defaultConfig).length > 0
                        ? JSON.stringify(defaultConfig)
                        : undefined,
                    triggeredByUser: 'system',
                });

                const now = new Date();
                const nextRunAt = getNextRunTime(schedule.cronExpression, schedule.timezone || 'UTC', now) || undefined;

                // Update immediately before enqueue to avoid duplicate pickup when pending.
                await scheduleRepository.update(schedule.id, {
                    lastRunAt: now,
                    nextRunAt,
                });

                const jobData: ScheduleRunJobData = {
                    scheduleId: schedule.id,
                    runId: run.id,
                    userId: schedule.userId,
                    triggerType: 'scheduled',
                    parameterValues: defaultParamValues,
                };

                await queueService.addJob(
                    QUEUE_NAMES.SCHEDULE_RUN,
                    `schedule-run-${schedule.id}`,
                    jobData,
                    { priority: 1 }
                );

                await auditService.logScheduleAction('triggered', schedule.id, schedule.userId, undefined, {
                    runId: run.id,
                    triggerType: 'scheduled',
                });

                dispatched += 1;
            } catch (error: any) {
                failed += 1;
                logger.error(`Failed to dispatch due schedule ${schedule.id}:`, error);
            }
        }

        return { dispatched, skipped, failed };
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
        return calculateNextRunTimes(cronExpression, count, new Date(), timezone);
    }

    /**
     * Get webhook information for a schedule
     */
    async getWebhookInfo(userId: string, scheduleId: string): Promise<{
        token: string | null;
        webhookUrl: string | null;
        hasToken: boolean;
    }> {
        const schedule = await this.verifyOwnership(userId, scheduleId);

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
        await this.verifyOwnership(userId, scheduleId);

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
            projectId: schedule.projectId || undefined,
            workflowId: schedule.workflowId,
            scopeFolder: schedule.scopeFolder || undefined,
            scopeSandboxId: schedule.scopeSandboxId || undefined,
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
            runConfigurationId: schedule.runConfigurationId || undefined,
            githubConfig,
            migrationVersion: schedule.migrationVersion,
        };
    }

    private formatRun(run: any): ScheduleRun {
        const normalizedTriggerType: ScheduleTriggerType =
            run.triggerType === 'cron'
                ? 'scheduled'
                : run.triggerType === 'api'
                    ? 'manual'
                    : run.triggerType;

        return {
            id: run.id,
            scheduleId: run.scheduleId,
            triggerType: normalizedTriggerType,
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
            executionId: run.executionId || undefined,
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
