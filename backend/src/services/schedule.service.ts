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
    ExecutionConfigOverrides,
    ScheduleExecutionTarget,
    ScheduleGitHubActionsConfig,
    ScheduleFolderScope,
    RunConfigurationCreate,
} from '@playwright-web-app/shared';
import { randomBytes } from 'crypto';
import { isAdmin } from '../middleware/rbac';

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
const SCHEDULE_OWNED_CONFIG_MIGRATION_VERSION = 2;

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

        this.migrationInFlight = (async () => {
            await this.runLegacyScheduleBackfill();
            await this.migrateSharedConfigsToScheduleOwned();
        })();
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

    /**
     * Create a scheduler-owned run configuration from an inline payload.
     */
    private async createSchedulerOwnedConfig(
        workflowId: string,
        projectId: string,
        scheduleName: string,
        configPayload: RunConfigurationCreate,
        scheduleId: string,
    ): Promise<any> {
        return runConfigurationRepository.create({
            workflowId,
            projectId,
            name: configPayload.name || `Schedule: ${scheduleName}`,
            description: configPayload.description,
            isDefault: false,
            tags: configPayload.tags ?? [],
            tagMode: configPayload.tagMode ?? 'any',
            excludeTags: configPayload.excludeTags ?? [],
            testFlowIds: configPayload.testFlowIds ?? [],
            grep: configPayload.grep,
            tagExpression: configPayload.tagExpression,
            namePatterns: configPayload.namePatterns ? JSON.stringify(configPayload.namePatterns) : undefined,
            environmentId: configPayload.environmentId,
            target: configPayload.target ?? 'local',
            localConfig: configPayload.localConfig ? JSON.stringify(configPayload.localConfig) : undefined,
            dockerConfig: configPayload.dockerConfig ? JSON.stringify(configPayload.dockerConfig) : undefined,
            githubActionsConfig: configPayload.githubActionsConfig ? JSON.stringify(configPayload.githubActionsConfig) : undefined,
            browser: configPayload.browser ?? 'chromium',
            browserChannel: configPayload.browserChannel,
            headless: configPayload.headless ?? true,
            viewport: JSON.stringify(configPayload.viewport ?? { width: 1280, height: 720 }),
            workers: configPayload.workers ?? 1,
            shardCount: configPayload.shardCount ?? 1,
            retries: configPayload.retries ?? 0,
            timeout: configPayload.timeout ?? 30000,
            tracing: configPayload.tracing ?? 'on-failure',
            screenshot: configPayload.screenshot ?? 'on-failure',
            video: configPayload.video ?? 'off',
            advancedConfig: configPayload.advancedConfig ? JSON.stringify(configPayload.advancedConfig) : undefined,
            selectionScope: configPayload.selectionScope,
            envVars: configPayload.envVars ? JSON.stringify(configPayload.envVars) : undefined,
            parameterSetId: configPayload.parameterSetId,
            parameterOverrides: configPayload.parameterOverrides ? JSON.stringify(configPayload.parameterOverrides) : undefined,
            visualPreset: configPayload.visualPreset,
            visualThreshold: configPayload.visualThreshold,
            visualMaxDiffPixels: configPayload.visualMaxDiffPixels,
            visualMaxDiffPixelRatio: configPayload.visualMaxDiffPixelRatio,
            visualUpdateSnapshots: configPayload.visualUpdateSnapshots,
            runtimeConfig: configPayload.runtimeConfig ? JSON.stringify(configPayload.runtimeConfig) : undefined,
            githubRepository: configPayload.githubRepository,
            githubWorkflowPath: configPayload.githubWorkflowPath,
            ownerType: 'schedule',
            ownerScheduleId: scheduleId,
        });
    }

    /**
     * Update an existing scheduler-owned run configuration from an inline payload.
     */
    private async updateSchedulerOwnedConfig(
        configId: string,
        configPayload: Partial<RunConfigurationCreate>,
    ): Promise<any> {
        const updateData: Record<string, any> = {};

        if (configPayload.name !== undefined) updateData.name = configPayload.name;
        if (configPayload.description !== undefined) updateData.description = configPayload.description;
        if (configPayload.tags !== undefined) updateData.tags = configPayload.tags;
        if (configPayload.tagMode !== undefined) updateData.tagMode = configPayload.tagMode;
        if (configPayload.excludeTags !== undefined) updateData.excludeTags = configPayload.excludeTags;
        if (configPayload.testFlowIds !== undefined) updateData.testFlowIds = configPayload.testFlowIds;
        if (configPayload.grep !== undefined) updateData.grep = configPayload.grep;
        if (configPayload.tagExpression !== undefined) updateData.tagExpression = configPayload.tagExpression;
        if (configPayload.namePatterns !== undefined) updateData.namePatterns = configPayload.namePatterns ? JSON.stringify(configPayload.namePatterns) : null;
        if (configPayload.environmentId !== undefined) updateData.environmentId = configPayload.environmentId;
        if (configPayload.target !== undefined) updateData.target = configPayload.target;
        if (configPayload.localConfig !== undefined) updateData.localConfig = configPayload.localConfig ? JSON.stringify(configPayload.localConfig) : null;
        if (configPayload.dockerConfig !== undefined) updateData.dockerConfig = configPayload.dockerConfig ? JSON.stringify(configPayload.dockerConfig) : null;
        if (configPayload.githubActionsConfig !== undefined) updateData.githubActionsConfig = configPayload.githubActionsConfig ? JSON.stringify(configPayload.githubActionsConfig) : null;
        if (configPayload.browser !== undefined) updateData.browser = configPayload.browser;
        if (configPayload.browserChannel !== undefined) updateData.browserChannel = configPayload.browserChannel;
        if (configPayload.headless !== undefined) updateData.headless = configPayload.headless;
        if (configPayload.viewport !== undefined) updateData.viewport = JSON.stringify(configPayload.viewport);
        if (configPayload.workers !== undefined) updateData.workers = configPayload.workers;
        if (configPayload.shardCount !== undefined) updateData.shardCount = configPayload.shardCount;
        if (configPayload.retries !== undefined) updateData.retries = configPayload.retries;
        if (configPayload.timeout !== undefined) updateData.timeout = configPayload.timeout;
        if (configPayload.tracing !== undefined) updateData.tracing = configPayload.tracing;
        if (configPayload.screenshot !== undefined) updateData.screenshot = configPayload.screenshot;
        if (configPayload.video !== undefined) updateData.video = configPayload.video;
        if (configPayload.advancedConfig !== undefined) updateData.advancedConfig = configPayload.advancedConfig ? JSON.stringify(configPayload.advancedConfig) : null;
        if (configPayload.selectionScope !== undefined) updateData.selectionScope = configPayload.selectionScope;
        if (configPayload.envVars !== undefined) updateData.envVars = configPayload.envVars ? JSON.stringify(configPayload.envVars) : null;
        if (configPayload.parameterSetId !== undefined) updateData.parameterSetId = configPayload.parameterSetId;
        if (configPayload.parameterOverrides !== undefined) updateData.parameterOverrides = configPayload.parameterOverrides ? JSON.stringify(configPayload.parameterOverrides) : null;
        if (configPayload.visualPreset !== undefined) updateData.visualPreset = configPayload.visualPreset;
        if (configPayload.visualThreshold !== undefined) updateData.visualThreshold = configPayload.visualThreshold;
        if (configPayload.visualMaxDiffPixels !== undefined) updateData.visualMaxDiffPixels = configPayload.visualMaxDiffPixels;
        if (configPayload.visualMaxDiffPixelRatio !== undefined) updateData.visualMaxDiffPixelRatio = configPayload.visualMaxDiffPixelRatio;
        if (configPayload.visualUpdateSnapshots !== undefined) updateData.visualUpdateSnapshots = configPayload.visualUpdateSnapshots;
        if (configPayload.runtimeConfig !== undefined) updateData.runtimeConfig = configPayload.runtimeConfig ? JSON.stringify(configPayload.runtimeConfig) : null;
        if (configPayload.githubRepository !== undefined) updateData.githubRepository = configPayload.githubRepository;
        if (configPayload.githubWorkflowPath !== undefined) updateData.githubWorkflowPath = configPayload.githubWorkflowPath;

        return runConfigurationRepository.update(configId, updateData);
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

    private async validateWorkflowOwnership(userId: string, workflowId: string, userRole?: string): Promise<any> {
        const workflow = await workflowRepository.findById(workflowId);
        if (!workflow) {
            throw new ValidationError(`Workflow '${workflowId}' not found`);
        }
        if (!isAdmin(userRole) && workflow.userId !== userId) {
            throw new ForbiddenError('Workflow does not belong to current user');
        }
        return workflow;
    }

    private async validateProjectWorkflowOwnership(
        projectId: string,
        workflowId: string,
        userId?: string,
        userRole?: string
    ): Promise<void> {
        const workflow = userId
            ? await this.validateWorkflowOwnership(userId, workflowId, userRole)
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

    private normalizeSandboxScopeFolder(scopeSandboxId: string): string | null {
        const normalized = String(scopeSandboxId || '').trim().replace(/^\/+|\/+$/g, '');
        if (!normalized || normalized.includes('..')) {
            return null;
        }

        if (normalized.startsWith('sandboxes/')) {
            const segments = normalized.split('/').filter(Boolean);
            if (segments.length === 2 && segments[0] === 'sandboxes') {
                return normalized;
            }
            return null;
        }

        if (normalized.includes('/')) {
            return null;
        }

        return `sandboxes/${normalized}`;
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
        if (sandbox) {
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

        const normalizedSandboxFolder = this.normalizeSandboxScopeFolder(scopeSandboxId);
        if (!normalizedSandboxFolder) {
            throw new ValidationError(`Sandbox '${scopeSandboxId}' not found`);
        }

        return { folders: [normalizedSandboxFolder] };
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
     * Migration v2: Clone shared run configs into scheduler-owned copies.
     * For every schedule that still points at a shared (workspace-level) run config,
     * duplicate the linked config with ownerType='schedule' and rebind.
     */
    private async migrateSharedConfigsToScheduleOwned(): Promise<void> {
        const allSchedules = await scheduleRepository.findAll();
        let migrated = 0;
        let skipped = 0;

        for (const schedule of allSchedules) {
            // Skip if already at v2 or has no linked config
            if (
                (schedule.migrationVersion ?? 0) >= SCHEDULE_OWNED_CONFIG_MIGRATION_VERSION ||
                !schedule.runConfigurationId
            ) {
                continue;
            }

            try {
                // Check if this schedule already has an owned config (idempotency)
                const existingOwned = await runConfigurationRepository.findByOwnerScheduleId(schedule.id);
                if (existingOwned) {
                    // Already has an owned config — just bump version
                    await scheduleRepository.update(schedule.id, {
                        runConfigurationId: existingOwned.id,
                        migrationVersion: SCHEDULE_OWNED_CONFIG_MIGRATION_VERSION,
                    });
                    migrated += 1;
                    continue;
                }

                // Load the shared config
                const sharedConfig = await runConfigurationRepository.findById(schedule.runConfigurationId);
                if (!sharedConfig) {
                    skipped += 1;
                    logger.warn(`[ScheduleOwnedConfigMigration] Skipping schedule ${schedule.id}: linked config ${schedule.runConfigurationId} not found`);
                    continue;
                }

                // Clone as scheduler-owned
                const cloned = await runConfigurationRepository.create({
                    workflowId: sharedConfig.workflowId,
                    projectId: sharedConfig.projectId,
                    name: `Schedule: ${schedule.name}`,
                    description: sharedConfig.description,
                    isDefault: false,
                    tags: sharedConfig.tags,
                    tagMode: sharedConfig.tagMode,
                    excludeTags: sharedConfig.excludeTags,
                    testFlowIds: sharedConfig.testFlowIds,
                    grep: sharedConfig.grep,
                    tagExpression: sharedConfig.tagExpression,
                    namePatterns: sharedConfig.namePatterns,
                    environmentId: sharedConfig.environmentId,
                    target: sharedConfig.target,
                    localConfig: sharedConfig.localConfig,
                    dockerConfig: sharedConfig.dockerConfig,
                    githubActionsConfig: sharedConfig.githubActionsConfig,
                    browser: sharedConfig.browser,
                    browserChannel: sharedConfig.browserChannel,
                    headless: sharedConfig.headless,
                    viewport: sharedConfig.viewport,
                    workers: sharedConfig.workers,
                    shardCount: sharedConfig.shardCount,
                    retries: sharedConfig.retries,
                    timeout: sharedConfig.timeout,
                    tracing: sharedConfig.tracing,
                    screenshot: sharedConfig.screenshot,
                    video: sharedConfig.video,
                    advancedConfig: sharedConfig.advancedConfig,
                    selectionScope: sharedConfig.selectionScope,
                    envVars: sharedConfig.envVars,
                    parameterSetId: sharedConfig.parameterSetId,
                    parameterOverrides: sharedConfig.parameterOverrides,
                    visualPreset: sharedConfig.visualPreset,
                    visualThreshold: sharedConfig.visualThreshold,
                    visualMaxDiffPixels: sharedConfig.visualMaxDiffPixels,
                    visualMaxDiffPixelRatio: sharedConfig.visualMaxDiffPixelRatio,
                    visualUpdateSnapshots: sharedConfig.visualUpdateSnapshots,
                    runtimeConfig: sharedConfig.runtimeConfig,
                    githubRepository: sharedConfig.githubRepository,
                    githubWorkflowPath: sharedConfig.githubWorkflowPath,
                    ownerType: 'schedule',
                    ownerScheduleId: schedule.id,
                });

                // Rebind schedule to the cloned config
                await scheduleRepository.update(schedule.id, {
                    runConfigurationId: cloned.id,
                    migrationVersion: SCHEDULE_OWNED_CONFIG_MIGRATION_VERSION,
                });

                migrated += 1;
            } catch (error: any) {
                skipped += 1;
                logger.warn(`[ScheduleOwnedConfigMigration] Failed to migrate schedule ${schedule.id}: ${error?.message || error}`);
            }
        }

        if (migrated > 0 || skipped > 0) {
            logger.info(`[ScheduleOwnedConfigMigration] Completed: migrated=${migrated}, skipped=${skipped}`);
        }
    }

    /**
     * Create a new schedule
     */
    async create(userId: string, data: ScheduleCreate, userRole?: string): Promise<Schedule> {
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

        const hasInlineConfig = data.scheduleRunConfiguration && typeof data.scheduleRunConfiguration === 'object';
        const hasLinkedId = data.runConfigurationId && typeof data.runConfigurationId === 'string';
        if (!hasInlineConfig && !hasLinkedId) {
            throw new ValidationError('Either runConfigurationId or scheduleRunConfiguration is required');
        }

        await this.validateProjectWorkflowOwnership(data.projectId, data.workflowId, userId, userRole);

        const scopeSandboxId = data.scopeFolder === 'sandboxes' ? data.scopeSandboxId : undefined;
        const generatedSelector = await this.buildSelectorFromScope(
            data.projectId,
            data.scopeFolder,
            scopeSandboxId
        );

        // Resolve the run configuration: either validate linked or defer for inline creation
        let linkedConfig: any;
        let effectiveRunConfigurationId: string | undefined;

        if (hasLinkedId && !hasInlineConfig) {
            linkedConfig = await this.loadAndValidateRunConfiguration(
                data.runConfigurationId!,
                data.workflowId,
                data.projectId
            );
            effectiveRunConfigurationId = data.runConfigurationId!;
        }

        // Build compat from linked config if available (inline path defers)
        let compat = linkedConfig
            ? this.buildLegacyCompatFromRunConfiguration(linkedConfig)
            : { executionTarget: 'local' as ScheduleExecutionTarget };

        if (linkedConfig && compat.executionTarget === 'github-actions' && (!compat.githubRepoFullName || !compat.githubWorkflowFile)) {
            throw new ValidationError('Linked run configuration is missing GitHub repository/workflow settings');
        }

        const nextRunAt = getNextRunTime(data.cronExpression, data.timezone || 'UTC');
        const webhookToken = generateWebhookToken();
        const enforcedIsActive = true;

        if (data.isActive === false) {
            logger.warn('[Schedule] New schedule requested as paused; enforcing active state', {
                userId,
                workflowId: data.workflowId,
                projectId: data.projectId,
                scheduleName: data.name,
                requestedIsActive: data.isActive,
                enforcedIsActive,
            });
        }

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
            isActive: enforcedIsActive,
            nextRunAt: nextRunAt || undefined,
            webhookToken,
            parameters: undefined,
            defaultExecutionConfig: undefined,
            executionTarget: compat.executionTarget,
            runConfigurationId: effectiveRunConfigurationId,
            githubRepoFullName: compat.executionTarget === 'github-actions' ? compat.githubRepoFullName : undefined,
            githubBranch: compat.executionTarget === 'github-actions' ? (compat.githubBranch || 'main') : undefined,
            githubWorkflowFile: compat.executionTarget === 'github-actions' ? compat.githubWorkflowFile : undefined,
            githubInputs: compat.executionTarget === 'github-actions' ? compat.githubInputs : undefined,
            migrationVersion: SCHEDULE_OWNED_CONFIG_MIGRATION_VERSION,
            onSuccessTriggerScheduleIds: data.onSuccessTriggerScheduleIds?.length
                ? JSON.stringify(data.onSuccessTriggerScheduleIds)
                : undefined,
        });

        // If using inline config, create the scheduler-owned config and update the schedule
        if (hasInlineConfig) {
            const ownedConfig = await this.createSchedulerOwnedConfig(
                data.workflowId,
                data.projectId,
                data.name,
                data.scheduleRunConfiguration!,
                schedule.id,
            );
            effectiveRunConfigurationId = ownedConfig.id;
            linkedConfig = ownedConfig;
            compat = this.buildLegacyCompatFromRunConfiguration(ownedConfig);

            await scheduleRepository.update(schedule.id, {
                runConfigurationId: ownedConfig.id,
                executionTarget: compat.executionTarget,
                githubRepoFullName: compat.executionTarget === 'github-actions' ? compat.githubRepoFullName : undefined,
                githubBranch: compat.executionTarget === 'github-actions' ? (compat.githubBranch || 'main') : undefined,
                githubWorkflowFile: compat.executionTarget === 'github-actions' ? compat.githubWorkflowFile : undefined,
                githubInputs: compat.executionTarget === 'github-actions' ? compat.githubInputs : undefined,
            });
        }

        // Validate chained schedule references (after create so we have the ID)
        if (data.onSuccessTriggerScheduleIds?.length) {
            await this.validateChainedSchedules(userId, schedule.id, data.onSuccessTriggerScheduleIds);
        }

        // Sync repeatable schedule registration.
        await this.syncRepeatableSchedule(schedule.id);

        // Get recent runs
        const runs = await scheduleRunRepository.findByScheduleId(schedule.id, 5);

        return this.formatSchedule({ ...schedule, runs });
    }

    /**
     * Find all schedules for a user
     */
    async findAll(userId: string, workflowId?: string, userRole?: string): Promise<Schedule[]> {
        if (workflowId) {
            await this.validateWorkflowOwnership(userId, workflowId, userRole);
            const schedules = await scheduleRepository.findByUserIdAndWorkflowId(userId, workflowId);
            const schedulesWithRuns = await Promise.all(
                schedules.map(async (schedule) => {
                    const runs = await scheduleRunRepository.findByScheduleId(schedule.id, 5);
                    return { ...schedule, runs };
                })
            );
            return schedulesWithRuns.map(s => this.formatSchedule(s));
        }

        const schedules = isAdmin(userRole)
            ? await scheduleRepository.findAll()
            : await scheduleRepository.findByUserId(userId);
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
    private async verifyOwnership(userId: string, scheduleId: string, userRole?: string): Promise<any> {
        const schedule = await scheduleRepository.findById(scheduleId);

        if (!schedule) {
            throw new NotFoundError('Schedule not found');
        }

        if (!isAdmin(userRole) && schedule.userId !== userId) {
            throw new ForbiddenError('Access denied');
        }

        return schedule;
    }

    async findOne(userId: string, scheduleId: string, userRole?: string): Promise<Schedule> {
        const schedule = await this.verifyOwnership(userId, scheduleId, userRole);

        const runs = await scheduleRunRepository.findByScheduleId(scheduleId, 10);
        const runsWithResults = await this.enrichRunsWithResults(runs);

        return this.formatSchedule({ ...schedule, runs: runsWithResults });
    }

    /**
     * Update a schedule
     */
    async update(userId: string, scheduleId: string, data: ScheduleUpdate, userRole?: string): Promise<Schedule> {
        const existing = await this.verifyOwnership(userId, scheduleId, userRole);

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

        const hasInlineConfig = data.scheduleRunConfiguration && typeof data.scheduleRunConfiguration === 'object';
        const hasLinkedId = data.runConfigurationId && typeof data.runConfigurationId === 'string';
        if (!hasInlineConfig && !hasLinkedId) {
            throw new ValidationError('Either runConfigurationId or scheduleRunConfiguration is required');
        }

        const effectiveWorkflowId = existing.workflowId;
        if (!effectiveWorkflowId) {
            throw new ValidationError('workflowId is required to validate run configuration ownership');
        }
        await this.validateWorkflowOwnership(userId, effectiveWorkflowId, userRole);

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

        // Resolve run configuration: inline or linked
        let linkedConfig: any;
        let effectiveRunConfigurationId: string;

        if (hasInlineConfig) {
            // Check if schedule already has a scheduler-owned config
            const existingOwnedConfig = await runConfigurationRepository.findByOwnerScheduleId(scheduleId);

            if (existingOwnedConfig) {
                // Update existing scheduler-owned config
                await this.updateSchedulerOwnedConfig(existingOwnedConfig.id, data.scheduleRunConfiguration as RunConfigurationCreate);
                linkedConfig = await runConfigurationRepository.findById(existingOwnedConfig.id);
                effectiveRunConfigurationId = existingOwnedConfig.id;
            } else {
                // Create new scheduler-owned config (was previously linked to shared)
                const ownedConfig = await this.createSchedulerOwnedConfig(
                    effectiveWorkflowId,
                    effectiveProjectId!,
                    data.name || existing.name,
                    data.scheduleRunConfiguration as RunConfigurationCreate,
                    scheduleId,
                );
                linkedConfig = ownedConfig;
                effectiveRunConfigurationId = ownedConfig.id;
            }
        } else {
            linkedConfig = await this.loadAndValidateRunConfiguration(
                data.runConfigurationId!,
                effectiveWorkflowId,
                effectiveProjectId
            );
            effectiveRunConfigurationId = data.runConfigurationId!;
        }

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
        updateData.migrationVersion = SCHEDULE_OWNED_CONFIG_MIGRATION_VERSION;
        if (data.onSuccessTriggerScheduleIds !== undefined) {
            updateData.onSuccessTriggerScheduleIds = data.onSuccessTriggerScheduleIds?.length
                ? JSON.stringify(data.onSuccessTriggerScheduleIds)
                : null;
        }

        // Validate chained schedule references before persisting
        if (data.onSuccessTriggerScheduleIds?.length) {
            await this.validateChainedSchedules(userId, scheduleId, data.onSuccessTriggerScheduleIds);
        }

        const schedule = await scheduleRepository.update(scheduleId, updateData);

        if (!schedule) {
            throw new NotFoundError('Schedule not found');
        }

        // Sync repeatable schedule registration.
        await this.syncRepeatableSchedule(scheduleId);

        const runs = await scheduleRunRepository.findByScheduleId(scheduleId, 5);

        return this.formatSchedule({ ...schedule, runs });
    }

    /**
     * Delete a schedule
     */
    async delete(userId: string, scheduleId: string, userRole?: string): Promise<void> {
        await this.verifyOwnership(userId, scheduleId, userRole);
        await scheduleRepository.delete(scheduleId);
        await queueService.removeRepeatableSchedule(scheduleId);
        // Clean up scheduler-owned run configuration
        await runConfigurationRepository.deleteByOwnerScheduleId(scheduleId);
    }

    /**
     * Toggle schedule active status
     */
    async toggleActive(userId: string, scheduleId: string, userRole?: string): Promise<Schedule> {
        const existing = await this.verifyOwnership(userId, scheduleId, userRole);

        const schedule = await scheduleRepository.update(scheduleId, {
            isActive: !existing.isActive,
            nextRunAt: !existing.isActive
                ? getNextRunTime(existing.cronExpression, existing.timezone) || undefined
                : undefined,
        });

        if (!schedule) {
            throw new NotFoundError('Schedule not found');
        }

        // Sync repeatable schedule registration.
        await this.syncRepeatableSchedule(scheduleId);

        const runs = await scheduleRunRepository.findByScheduleId(scheduleId, 5);

        return this.formatSchedule({ ...schedule, runs });
    }

    /**
     * Trigger a manual run of a schedule
     */
    async triggerRun(
        userId: string,
        scheduleId: string,
        request?: ScheduleTriggerRequest,
        userRole?: string
    ): Promise<ScheduleRun> {
        const schedule = await this.verifyOwnership(userId, scheduleId, userRole);

        // Get user info for audit
        const user = await userRepository.findById(userId);

        if (!schedule.runConfigurationId) {
            throw new ValidationError('Schedule is not linked to a run configuration');
        }
        if (!schedule.workflowId) {
            throw new ValidationError('Schedule is missing workflow context');
        }

        // Reject old deprecated field name; use executionConfigOverrides instead
        if (request && Object.prototype.hasOwnProperty.call(request as object, 'executionConfig')) {
            throw new ValidationError('executionConfig is deprecated; use executionConfigOverrides instead');
        }

        const linkedConfig = await this.loadAndValidateRunConfiguration(
            schedule.runConfigurationId,
            schedule.workflowId,
            schedule.projectId
        );
        const baseConfig = this.buildScheduleExecutionConfigFromRunConfiguration(linkedConfig);

        // Merge per-run execution overrides (Jenkins-style) on top of base config
        const overrides = request?.executionConfigOverrides;
        const effectiveConfig: ScheduleExecutionConfig = overrides
            ? {
                ...baseConfig,
                ...(overrides.browser !== undefined ? { browser: overrides.browser } : {}),
                ...(overrides.headless !== undefined ? { headless: overrides.headless } : {}),
                ...(overrides.workers !== undefined ? { workers: overrides.workers } : {}),
                ...(overrides.retries !== undefined ? { retries: overrides.retries } : {}),
                ...(overrides.timeout !== undefined ? { timeout: overrides.timeout } : {}),
              }
            : baseConfig;

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
            // Store overrides separately for audit trail
            executionConfigOverrides: overrides && Object.keys(overrides).length > 0
                ? JSON.stringify(overrides)
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
                // Pass overrides to worker for execution-time merging
                executionConfigOverrides: overrides,
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
                    if (param.min != null && numValue < param.min) {
                        throw new ValidationError(`"${param.label}" must be at least ${param.min}`);
                    }
                    if (param.max != null && numValue > param.max) {
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
    async getRuns(userId: string, scheduleId: string, limit: number = 20, offset: number = 0, userRole?: string): Promise<{ runs: ScheduleRun[]; total: number }> {
        await this.verifyOwnership(userId, scheduleId, userRole);

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
    async getRun(userId: string, runId: string, userRole?: string): Promise<ScheduleRun> {
        const run = await scheduleRunRepository.findById(runId);

        if (!run) {
            throw new NotFoundError('Run not found');
        }

        const schedule = await scheduleRepository.findById(run.scheduleId);

        if (!schedule || (!isAdmin(userRole) && schedule.userId !== userId)) {
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
                // Concurrency policy check: skip when 'forbid' and active runs exist.
                const policy = schedule.concurrencyPolicy || 'forbid';
                if (policy === 'forbid') {
                    const hasActive = await scheduleRunRepository.hasActiveRuns(schedule.id);
                    if (hasActive) {
                        await scheduleRunRepository.create({
                            scheduleId: schedule.id,
                            triggerType: 'scheduled',
                            status: 'skipped',
                            skipReason: 'Overlap forbidden: previous run still pending or running',
                            triggeredByUser: 'system',
                        });
                        const now = new Date();
                        const nextRunAt = getNextRunTime(schedule.cronExpression, schedule.timezone || 'UTC', now) || undefined;
                        await scheduleRepository.update(schedule.id, { nextRunAt });
                        skipped += 1;
                        continue;
                    }
                }

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

                // P1.2: Trigger chained schedules on success
                if (results.status === 'passed') {
                    await this.triggerChainedSchedules(schedule, runId);
                }
            }
        }
    }

    /**
     * P1.2: Validate that chained schedule IDs are valid.
     * - All targets must exist and belong to the same user.
     * - No cycles: following onSuccessTriggerScheduleIds from any target
     *   must not lead back to sourceScheduleId.
     */
    private async validateChainedSchedules(
        userId: string,
        sourceScheduleId: string,
        targetIds: string[],
    ): Promise<void> {
        // Self-reference check
        if (targetIds.includes(sourceScheduleId)) {
            throw new ValidationError('A schedule cannot chain to itself');
        }

        // Ownership check
        for (const targetId of targetIds) {
            const target = await scheduleRepository.findById(targetId);
            if (!target) {
                throw new ValidationError(`Chained schedule ${targetId} not found`);
            }
            if (target.userId !== userId) {
                throw new ValidationError(`Chained schedule ${targetId} belongs to a different user`);
            }
        }

        // Cycle detection via BFS
        const visited = new Set<string>([sourceScheduleId]);
        const queue = [...targetIds];
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (visited.has(current)) {
                throw new ValidationError(`Cycle detected: chained schedule ${current} leads back to the source`);
            }
            visited.add(current);

            const schedule = await scheduleRepository.findById(current);
            if (schedule?.onSuccessTriggerScheduleIds) {
                const childIds = this.parseJSON<string[]>(schedule.onSuccessTriggerScheduleIds, []);
                for (const childId of childIds) {
                    if (!visited.has(childId)) {
                        queue.push(childId);
                    }
                }
            }
        }
    }

    /**
     * P1.2: Trigger chained schedules after a successful run.
     * Enqueues child schedule runs with triggerType 'chained'.
     */
    async triggerChainedSchedules(schedule: any, parentRunId: string): Promise<void> {
        const chainIds = schedule.onSuccessTriggerScheduleIds
            ? this.parseJSON<string[]>(schedule.onSuccessTriggerScheduleIds, [])
            : [];

        if (chainIds.length === 0) return;

        logger.info(`[Chain] Schedule ${schedule.id} passed — triggering ${chainIds.length} chained schedule(s)`, {
            parentRunId,
            chainIds,
        });

        for (const childId of chainIds) {
            try {
                const child = await scheduleRepository.findById(childId);
                if (!child) {
                    logger.warn(`[Chain] Chained schedule ${childId} not found — skipping`);
                    continue;
                }
                if (!child.isActive) {
                    logger.info(`[Chain] Chained schedule ${childId} is inactive — skipping`);
                    continue;
                }

                // Create a pending ScheduleRun for the child
                const run = await scheduleRunRepository.create({
                    scheduleId: childId,
                    triggerType: 'chained',
                    status: 'pending',
                    triggeredByUser: 'system',
                });

                // Enqueue the job
                const jobData: ScheduleRunJobData = {
                    scheduleId: childId,
                    runId: run.id,
                    userId: child.userId,
                    triggerType: 'chained',
                };

                await queueService.addJob(
                    QUEUE_NAMES.SCHEDULE_RUN as any,
                    `chained-run-${childId}`,
                    jobData,
                    { priority: 1 },
                );

                logger.info(`[Chain] Enqueued chained run ${run.id} for schedule ${childId}`, {
                    parentRunId,
                    childRunId: run.id,
                });

                await auditService.logExecutionAction('chained_trigger', run.id, child.userId, {
                    parentScheduleId: schedule.id,
                    parentRunId,
                    childScheduleId: childId,
                });
            } catch (err: any) {
                logger.error(`[Chain] Failed to trigger chained schedule ${childId}:`, err);
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
    async getWebhookInfo(userId: string, scheduleId: string, userRole?: string): Promise<{
        token: string | null;
        webhookUrl: string | null;
        hasToken: boolean;
    }> {
        const schedule = await this.verifyOwnership(userId, scheduleId, userRole);

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
    async regenerateWebhookToken(userId: string, scheduleId: string, userRole?: string): Promise<string> {
        await this.verifyOwnership(userId, scheduleId, userRole);

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
            onSuccessTriggerScheduleIds: schedule.onSuccessTriggerScheduleIds
                ? this.parseJSON<string[]>(schedule.onSuccessTriggerScheduleIds, [])
                : undefined,
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
            executionConfigOverrides: run.executionConfigOverrides
                ? this.parseJSON<ExecutionConfigOverrides>(run.executionConfigOverrides, {} as ExecutionConfigOverrides)
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

    // =============================================
    // REPEATABLE SCHEDULE SYNC
    // =============================================

    /**
     * Sync a single schedule's repeatable job registration.
     * Called on create/update/toggle/delete.
     */
    async syncRepeatableSchedule(scheduleId: string): Promise<void> {
        try {
            const schedule = await scheduleRepository.findById(scheduleId);
            if (!schedule || !schedule.isActive) {
                await queueService.removeRepeatableSchedule(scheduleId);
                return;
            }

            await queueService.upsertRepeatableSchedule(
                schedule.id,
                schedule.cronExpression,
                schedule.timezone || 'UTC',
                {
                    userId: schedule.userId,
                    triggerType: 'scheduled' as const,
                }
            );
        } catch (error) {
            logger.error(`Failed to sync repeatable schedule ${scheduleId}:`, error);
        }
    }

    /**
     * Reconcile all repeatable schedules on worker startup.
     * Ensures every active schedule has a registered BullMQ scheduler.
     */
    async reconcileRepeatableSchedules(): Promise<void> {
        const allSchedules = await scheduleRepository.findDue()
            .catch(() => [] as any[]);

        // Also get active schedules that haven't become due yet.
        // findDue() only returns due schedules; we need all active ones.
        const allActiveSchedules = await this.getAllActiveSchedules();

        let registered = 0;
        for (const schedule of allActiveSchedules) {
            try {
                await queueService.upsertRepeatableSchedule(
                    schedule.id,
                    schedule.cronExpression,
                    schedule.timezone || 'UTC',
                    {
                        userId: schedule.userId,
                        triggerType: 'scheduled' as const,
                    }
                );
                registered += 1;
            } catch (error) {
                logger.error(`Failed to register repeatable for schedule ${schedule.id}:`, error);
            }
        }

        logger.info(`Reconciled repeatable schedules: ${registered} registered`);
    }

    private async getAllActiveSchedules(): Promise<any[]> {
        // Query all active schedules regardless of nextRunAt.
        const { getDb, COLLECTIONS } = await import('../db/mongodb');
        return getDb().collection(COLLECTIONS.SCHEDULES).find({ isActive: true }).toArray();
    }
}

export const scheduleService = new ScheduleService();
