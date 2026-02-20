/**
 * Schedule Run Worker
 * Processes scheduled test run jobs
 * Supports both local execution and GitHub Actions dispatch
 *
 * Phase 1B: .vero files now use the shared veroRunService pipeline,
 * gaining Allure output, execution steps, visual config, parameterized combinations,
 * and — critically — parameter value injection (Gap 1 fix).
 */

import { logger } from '../../../utils/logger';
import {
  applicationRepository,
  executionRepository,
  environmentVariableRepository,
  projectRepository,
  runConfigurationRepository,
  scheduleRepository,
  scheduleRunRepository,
  userEnvironmentRepository,
  workflowRepository,
} from '../../../db/repositories/mongo';
import { auditService } from '../../audit.service';
import { notificationService, ScheduleRunInfo } from '../../notification.service';
import { executionEngine } from '../../execution';
import { ExecutionOptions, DEFAULT_EXECUTION_OPTIONS } from '../../execution/types';
import { resolveTestPlan } from '../../execution/testResolver';
import { getOrCreateVeroTestFlow } from '../../testFlow.utils';
import { githubService } from '../../github.service';
import { ExecutionService } from '../../execution.service';
import { executeVeroRun, mergeExecutionEnvironment, type VeroRunInput } from '../../veroRunService';
import { resultManager } from '../../results';
import type { QueueJob, ScheduleRunJobData } from '../types';

const executionService = new ExecutionService();

function parseJsonSafe<T>(value: unknown, fallback: T): T {
  if (!value) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (!value) return [];
  return parseJsonSafe<string[]>(value, []);
}

function mapRunConfigurationToExecutionConfig(rawConfig: any): Record<string, any> {
  const runtime = parseJsonSafe<Record<string, unknown>>(rawConfig.runtimeConfig, {});
  const githubInputs = runtime.githubInputs && typeof runtime.githubInputs === 'object'
    ? runtime.githubInputs as Record<string, string>
    : undefined;

  return {
    target: rawConfig.target,
    browser: rawConfig.browser,
    headless: rawConfig.headless,
    workers: rawConfig.workers,
    retries: rawConfig.retries,
    timeout: rawConfig.timeout,
    tracing: rawConfig.tracing,
    screenshot: rawConfig.screenshot,
    video: rawConfig.video,
    environmentId: rawConfig.environmentId,
    // Visual config
    visualPreset: rawConfig.visualPreset,
    visualThreshold: rawConfig.visualThreshold,
    visualMaxDiffPixels: rawConfig.visualMaxDiffPixels,
    visualMaxDiffPixelRatio: rawConfig.visualMaxDiffPixelRatio,
    visualUpdateSnapshots: rawConfig.visualUpdateSnapshots,
    // Sharding
    shardCount: rawConfig.shardCount,
    // Custom env vars from the run config
    envVars: parseJsonSafe<Record<string, string>>(rawConfig.envVars, {}),
    // Selection and filtering
    selectionScope: rawConfig.selectionScope,
    tagExpression: rawConfig.tagExpression,
    namePatterns: parseStringArray(rawConfig.namePatterns),
    grep: rawConfig.grep,
    baseUrl: typeof runtime.baseURL === 'string' ? runtime.baseURL : undefined,
    tags: parseStringArray(rawConfig.tags),
    excludeTags: parseStringArray(rawConfig.excludeTags),
    tagMode: rawConfig.tagMode,
    testFlowIds: parseStringArray(rawConfig.testFlowIds),
    // Parameters
    parameterSetId: rawConfig.parameterSetId,
    parameterOverrides: parseJsonSafe<Record<string, string | number | boolean>>(rawConfig.parameterOverrides, {}),
    // Target-specific GitHub settings
    githubRepository: rawConfig.githubRepository,
    githubWorkflowPath: rawConfig.githubWorkflowPath,
    githubBranch: typeof runtime.githubBranch === 'string' ? runtime.githubBranch : undefined,
    githubInputs,
    // Runtime fields
    ...runtime,
  };
}

function resolveExecutionTarget(schedule: any, effectiveConfig: Record<string, any>): 'local' | 'github-actions' {
  const configTarget = typeof effectiveConfig.target === 'string' ? effectiveConfig.target : undefined;
  if (configTarget === 'github-actions') return 'github-actions';
  if (configTarget === 'docker') {
    // Docker schedules are not yet executed by a dedicated worker path.
    return 'local';
  }
  return schedule.executionTarget === 'github-actions' ? 'github-actions' : 'local';
}

function resolveScheduleSelector(schedule: any, effectiveConfig: Record<string, any>): Record<string, unknown> {
  const runtime = effectiveConfig || {};
  const legacyMigration = runtime.legacyScheduleMigration as Record<string, unknown> | undefined;
  const migratedSelector = legacyMigration?.testSelector;
  if (migratedSelector && typeof migratedSelector === 'object') {
    return migratedSelector as Record<string, unknown>;
  }

  const selector: Record<string, unknown> = {};
  if (Array.isArray(runtime.tags) && runtime.tags.length > 0) selector.tags = runtime.tags;
  if (runtime.tagMode === 'any' || runtime.tagMode === 'all') selector.tagMode = runtime.tagMode;
  if (Array.isArray(runtime.testFlowIds) && runtime.testFlowIds.length > 0) selector.testFlowIds = runtime.testFlowIds;

  if (Object.keys(selector).length > 0) {
    return selector;
  }

  return schedule.testSelector ? parseJsonSafe<Record<string, unknown>>(schedule.testSelector, {}) : {};
}

function normalizeScopeId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

interface ExecutionScope {
  applicationId?: string;
  projectId?: string;
  runtimeProjectId?: string;
}

async function resolveScheduleExecutionScope(schedule: any): Promise<ExecutionScope> {
  const rawProjectId = normalizeScopeId(schedule?.projectId);
  let applicationId: string | undefined;
  let projectId: string | undefined;

  if (rawProjectId) {
    const nestedProject = await projectRepository.findById(rawProjectId);
    if (nestedProject) {
      projectId = nestedProject.id;
      applicationId = nestedProject.applicationId;
    } else {
      const application = await applicationRepository.findById(rawProjectId);
      if (application) {
        applicationId = application.id;
      } else {
        // Legacy schedules may have stored applicationId in projectId.
        applicationId = rawProjectId;
      }
    }
  }

  if (!applicationId) {
    const workflowId = normalizeScopeId(schedule?.workflowId);
    if (workflowId) {
      const workflow = await workflowRepository.findById(workflowId);
      if (workflow?.applicationId) {
        applicationId = workflow.applicationId;
      }
    }
  }

  return {
    applicationId,
    projectId,
    runtimeProjectId: projectId || rawProjectId || applicationId,
  };
}

/**
 * Process a schedule run job
 */
export async function processScheduleRunJob(job: QueueJob<ScheduleRunJobData>): Promise<void> {
  const {
    scheduleId,
    runId,
    userId,
    triggerType,
    parameterValues,
    executionConfig: deprecatedExecutionOverrides,
  } = job.data;

  logger.info(`Processing schedule run job: ${job.id} (run: ${runId})`);

  // Update run status to running
  await scheduleRunRepository.update(runId, {
    status: 'running',
    startedAt: new Date(),
  });

  // Audit log
  await auditService.logExecutionAction('triggered', runId, userId, {
    scheduleId,
    triggerType,
    jobId: job.id,
  });

  try {
    // Get schedule details
    const schedule = await scheduleRepository.findById(scheduleId);

    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    // Scheduler is run-config driven. Load linked configuration first.
    let linkedRunConfig: Record<string, any> | undefined;
    if (schedule.runConfigurationId) {
      const rawConfig = await runConfigurationRepository.findById(schedule.runConfigurationId);
      if (!rawConfig) {
        throw new Error(`Linked run configuration ${schedule.runConfigurationId} not found`);
      }
      linkedRunConfig = mapRunConfigurationToExecutionConfig(rawConfig);
      logger.info(`[Schedule] Loaded linked run configuration: ${rawConfig.name}`, {
        runConfigurationId: schedule.runConfigurationId,
        browser: rawConfig.browser,
        workers: rawConfig.workers,
        target: rawConfig.target,
      });
    }

    // Prefer linked run config. Legacy execution overrides are only honored
    // when a schedule still has no linked run configuration.
    const effectiveConfig = linkedRunConfig
      ? { ...linkedRunConfig }
      : { ...(deprecatedExecutionOverrides || {}) };

    // Preserve custom env vars BEFORE environment resolution overwrites them.
    // Custom env vars (from run config) have higher precedence than environment
    // manager vars — they get passed as a separate layer to mergeExecutionEnvironment().
    const customEnvVarsFromConfig = effectiveConfig.envVars
      ? { ...effectiveConfig.envVars }
      : undefined;

    const resolvedSelector = resolveScheduleSelector(schedule, effectiveConfig);
    const executionTarget = resolveExecutionTarget(schedule, effectiveConfig);
    const executionScope = await resolveScheduleExecutionScope(schedule);
    const resolvedEnvironment = await resolveEnvironmentContext(
      userId,
      effectiveConfig.environmentId,
    );
    // Do NOT merge resolvedEnvironment.envVars onto config — they are passed
    // as a separate layer (environmentVars) to mergeExecutionEnvironment() which
    // applies correct precedence: envManager < paramValues < customEnvVars.
    const mergedExecutionConfig = {
      ...effectiveConfig,
      ...(resolvedEnvironment.environmentId ? { environmentId: resolvedEnvironment.environmentId } : {}),
    };

    if (executionTarget === 'github-actions') {
      // Execute via GitHub Actions
      await executeViaGitHubActions(
        schedule,
        runId,
        userId,
        triggerType,
        parameterValues,
        mergedExecutionConfig,
        resolvedEnvironment.envVars
      );
    } else {
      // Execute locally — now passes parameterValues (Gap 1 fix)
      await executeLocally(
        schedule,
        runId,
        userId,
        triggerType,
        mergedExecutionConfig,
        parameterValues,
        resolvedEnvironment.envVars,
        customEnvVarsFromConfig,
        resolvedSelector,
        executionScope,
      );
    }

    logger.info(`Schedule run ${runId} processing completed`);
  } catch (error: any) {
    logger.error(`Schedule run ${runId} failed:`, error);

    // Update run with failure
    await scheduleRunRepository.update(runId, {
      status: 'failed',
      completedAt: new Date(),
      errorMessage: error.message,
    });

    // Audit log failure
    await auditService.logExecutionAction('failed', runId, userId, {
      error: error.message,
    });

    // Try to send failure notifications
    try {
      const schedule = await scheduleRepository.findById(scheduleId);

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

async function resolveEnvironmentContext(
  userId: string,
  requestedEnvironmentId?: string
): Promise<{ environmentId?: string; envVars: Record<string, string> }> {
  let selectedEnvironment: { id: string; userId: string } | null = null;

  if (requestedEnvironmentId) {
    const requested = await userEnvironmentRepository.findById(requestedEnvironmentId);
    if (requested && requested.userId === userId) {
      selectedEnvironment = requested;
    }
  }

  if (!selectedEnvironment) {
    const active = await userEnvironmentRepository.findActiveByUserId(userId);
    if (active) {
      selectedEnvironment = active;
    }
  }

  if (!selectedEnvironment) {
    return { envVars: {} };
  }

  const variables = await environmentVariableRepository.findByEnvironmentId(selectedEnvironment.id);
  const envVars: Record<string, string> = {};
  for (const variable of variables) {
    envVars[variable.key] = String(variable.value ?? '');
  }

  return {
    environmentId: selectedEnvironment.id,
    envVars,
  };
}

/**
 * Execute tests via GitHub Actions workflow dispatch
 */
async function executeViaGitHubActions(
  schedule: any,
  runId: string,
  userId: string,
  triggerType: string,
  parameterValues?: Record<string, any>,
  executionConfig?: any,
  resolvedEnvVars?: Record<string, string>
): Promise<void> {
  logger.info(`Executing schedule run ${runId} via GitHub Actions`);

  const repoFullName = executionConfig?.githubRepository || schedule.githubRepoFullName;
  const workflowFile = executionConfig?.githubWorkflowPath || schedule.githubWorkflowFile;
  const workflowBranch = executionConfig?.githubBranch || schedule.githubBranch || 'main';
  const configInputs = executionConfig?.githubInputs && typeof executionConfig.githubInputs === 'object'
    ? executionConfig.githubInputs
    : {};
  const scheduleInputs = schedule.githubInputs
    ? parseJsonSafe<Record<string, string>>(schedule.githubInputs, {})
    : {};

  // Validate GitHub config
  if (!repoFullName) {
    throw new Error('GitHub repository not configured for this schedule');
  }
  if (!workflowFile) {
    throw new Error('GitHub workflow file not configured for this schedule');
  }

  // Parse repo full name into owner and repo
  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) {
    throw new Error('Invalid GitHub repository format. Expected "owner/repo"');
  }

  // Build workflow inputs from schedule config, execution config, and parameter values.
  // This mirrors the frontend buildGitHubInputs() so scheduled GitHub runs get the
  // same config fields as manual IDE-triggered GitHub runs.
  const baseInputs = {
    ...scheduleInputs,
    ...configInputs,
  };
  const workflowInputs: Record<string, string> = {
    ...baseInputs,
    // Core execution config
    ...(executionConfig?.browser && { browsers: executionConfig.browser }),
    ...(executionConfig?.workers && { workers: String(executionConfig.workers) }),
    ...(executionConfig?.headless !== undefined && { headless: String(executionConfig.headless) }),
    ...(executionConfig?.retries && { retries: String(executionConfig.retries) }),
    ...(executionConfig?.timeout && { timeoutMs: String(executionConfig.timeout) }),
    // Sharding
    ...(executionConfig?.shardCount && executionConfig.shardCount > 1 && { shards: String(executionConfig.shardCount) }),
    // Test filtering
    ...(executionConfig?.tagExpression && { tagExpression: executionConfig.tagExpression }),
    ...(executionConfig?.grep && { grep: executionConfig.grep }),
    ...(executionConfig?.grepInvert && { grepInvert: executionConfig.grepInvert }),
    ...(executionConfig?.lastFailed === true && { lastFailed: 'true' }),
    // Legacy tags (base64-encoded JSON arrays)
    ...(executionConfig?.tags?.length && {
      tagsB64: Buffer.from(JSON.stringify(executionConfig.tags), 'utf-8').toString('base64'),
    }),
    ...(executionConfig?.tagMode && { tagMode: executionConfig.tagMode }),
    ...(executionConfig?.excludeTags?.length && {
      excludeTagsB64: Buffer.from(JSON.stringify(executionConfig.excludeTags), 'utf-8').toString('base64'),
    }),
    ...(executionConfig?.namePatterns?.length && {
      namePatternsB64: Buffer.from(JSON.stringify(executionConfig.namePatterns), 'utf-8').toString('base64'),
    }),
    // Base URL
    ...(executionConfig?.baseUrl && { baseUrl: executionConfig.baseUrl }),
    // Add parameter values as inputs (convert to strings)
    ...Object.fromEntries(
      Object.entries(parameterValues || {}).map(([k, v]) => [k, String(v)])
    ),
    // Add metadata
    schedule_run_id: runId,
    triggered_by: triggerType,
  };

  // Environment variables (base64-encoded JSON)
  if (resolvedEnvVars && Object.keys(resolvedEnvVars).length > 0) {
    workflowInputs.envVarsB64 = Buffer.from(JSON.stringify(resolvedEnvVars), 'utf-8').toString('base64');
  }

  // Trigger the GitHub Actions workflow
  const result = await githubService.triggerWorkflow(
    userId,
    owner,
    repo,
    workflowFile,
    workflowBranch,
    workflowInputs
  );

  if (!result.success) {
    throw new Error(`Failed to trigger GitHub Actions workflow: ${result.error}`);
  }

  // Update the run to indicate it was dispatched to GitHub
  // Note: The actual completion will be handled by GitHub webhooks
  await scheduleRunRepository.update(runId, {
    status: 'running',
    // We don't have the run ID yet - it will be updated by webhooks
    // For now, store the repo info in the error message field as metadata
    errorMessage: undefined,
  });

  // Try to get the latest workflow run to link it
  // This is a best-effort attempt since there's a race condition
  try {
    // Wait a moment for GitHub to create the run
    await new Promise(resolve => setTimeout(resolve, 2000));

    const runs = await githubService.listWorkflowRuns(userId, owner, repo, {
      workflowId: workflowFile,
      branch: workflowBranch,
      perPage: 1,
    });

    if (runs.length > 0) {
      const latestRun = runs[0];
      await scheduleRunRepository.update(runId, {
        githubRunId: String(latestRun.id),
        githubRunUrl: latestRun.html_url,
      });
      logger.info(`Linked schedule run ${runId} to GitHub Actions run ${latestRun.id}`);
    }
  } catch (linkError) {
    logger.warn(`Could not link schedule run to GitHub Actions run:`, linkError);
    // Non-fatal - the webhook will handle this
  }

  // Update schedule's last run time and calculate next run
  const nextRunAt = calculateNextRunTime(schedule.cronExpression, schedule.timezone);
  await scheduleRepository.update(schedule.id, {
    lastRunAt: new Date(),
    nextRunAt: nextRunAt || undefined,
  });

  // Audit log
  await auditService.logExecutionAction('dispatched_to_github', runId, userId, {
    repo: repoFullName,
    workflow: workflowFile,
    branch: workflowBranch,
  });

  logger.info(`Schedule run ${runId} dispatched to GitHub Actions`);
}

/**
 * Execute tests locally.
 *
 * .vero files are routed through veroRunService.executeVeroRun() which gives
 * them the full feature set: Allure output, execution steps, visual config,
 * parameterized scenario expansion, and — critically — parameter value injection.
 *
 * Non-vero files (legacy .spec.ts) fall back to the old execution engine.
 */
async function executeLocally(
  schedule: any,
  runId: string,
  userId: string,
  triggerType: string,
  executionConfig?: any,
  parameterValues?: Record<string, unknown>,
  resolvedEnvVars?: Record<string, string>,
  customEnvVars?: Record<string, string>,
  resolvedSelector?: Record<string, unknown>,
  executionScope?: ExecutionScope,
): Promise<void> {
  logger.info(`Executing schedule run ${runId} locally`);

  // Parse test selector and resolve to concrete file paths
  const testSelector = resolvedSelector || (schedule.testSelector ? parseJsonSafe<Record<string, unknown>>(schedule.testSelector, {}) : {});
  const rawResolvedTargets = await resolveTestPlan(testSelector, undefined, schedule.projectId);
  const resolvedTargets = rawResolvedTargets.map((target: any) =>
    typeof target === 'string' ? { filePath: target } : target
  );

  if (resolvedTargets.length === 0) {
    logger.warn(`No test files found for schedule run ${runId} — selector may be stale`);
    await scheduleRunRepository.update(runId, {
      status: 'failed',
      completedAt: new Date(),
      errorMessage: 'No test files found matching the schedule selector',
    });
    return;
  }

  logger.info(`Resolved ${resolvedTargets.length} test target(s) for schedule run ${runId}`);

  // Split targets into .vero and non-vero
  const veroTargets = resolvedTargets.filter((target) => target.filePath.endsWith('.vero'));
  const legacyFiles = resolvedTargets.filter((target) => !target.filePath.endsWith('.vero')).map((target) => target.filePath);

  // Schedules already resolve target files by schedule scope. Avoid re-expanding
  // to the whole sandbox via run-config selectionScope for each resolved file.
  if (veroTargets.length > 0 && executionConfig?.selectionScope === 'current-sandbox') {
    logger.info('[Schedule] Normalizing selectionScope for scheduled Vero run', {
      scheduleId: schedule.id,
      runId,
      originalScope: 'current-sandbox',
      normalizedScope: 'active-file',
    });
  }

  const startTime = Date.now();
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let lastError: { message: string } | undefined;
  const flowName = schedule.name || `Schedule ${schedule.id}`;

  // ── Execute .vero files via veroRunService ──────────────────────────────

  for (const [index, veroTarget] of veroTargets.entries()) {
    try {
      const testFlow = await getOrCreateVeroTestFlow(
        userId,
        veroTarget.filePath,
        flowName,
        '',
        'Scheduled Tests',
        executionScope?.applicationId
      );
      const execution = await executionRepository.create({
        testFlowId: testFlow.id,
        applicationId: executionScope?.applicationId,
        projectId: executionScope?.projectId,
        status: 'running',
        target: 'local',
        triggeredBy: 'schedule',
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        startedAt: new Date(),
        configSnapshot: JSON.stringify(executionConfig || {}),
      });

      // Link first execution to the schedule run
      if (index === 0) {
        await scheduleRunRepository.update(runId, { executionId: execution.id });
      }

      const runInput: VeroRunInput = {
        filePath: veroTarget.filePath,
        executionId: execution.id,
        userId,
        projectId: executionScope?.runtimeProjectId || schedule.projectId,
        applicationId: executionScope?.applicationId,
        triggeredBy: 'schedule',
        config: {
          browserMode: executionConfig?.headless === false ? 'headed' : 'headless',
          workers: executionConfig?.workers || 1,
          retries: executionConfig?.retries || 0,
          timeout: executionConfig?.timeout || 30000,
          tracing: executionConfig?.tracing,
          grep: executionConfig?.grep,
          grepInvert: executionConfig?.grepInvert,
          lastFailed: executionConfig?.lastFailed,
          selectionScope: 'active-file',
          shard: executionConfig?.shardCount && executionConfig.shardCount > 1
            ? { current: 1, total: executionConfig.shardCount }
            : undefined,
          visualPreset: executionConfig?.visualPreset,
          visualThreshold: executionConfig?.visualThreshold,
          visualMaxDiffPixels: executionConfig?.visualMaxDiffPixels,
          visualMaxDiffPixelRatio: executionConfig?.visualMaxDiffPixelRatio,
          updateSnapshotsMode: executionConfig?.visualUpdateSnapshots ? 'all' : undefined,
          visualUpdateSnapshots: executionConfig?.visualUpdateSnapshots,
        },
        // Env var merge: env manager vars → parameter values → run config custom env vars
        environmentVars: resolvedEnvVars,
        parameterValues,
        customEnvVars,
        selection: {
          ...(veroTarget.scenarioNames?.length ? { scenarioNames: veroTarget.scenarioNames } : {}),
          ...(executionConfig?.tagExpression ? { tagExpression: executionConfig.tagExpression } : {}),
          ...(executionConfig?.namePatterns ? { namePatterns: executionConfig.namePatterns } : {}),
          ...(executionConfig?.tags ? { tags: executionConfig.tags } : {}),
          ...(executionConfig?.excludeTags ? { excludeTags: executionConfig.excludeTags } : {}),
          ...(executionConfig?.tagMode ? { tagMode: executionConfig.tagMode } : {}),
        },
      };

      logger.info(`[Schedule] Running vero file via service: ${veroTarget.filePath}`, {
        runId,
        executionId: execution.id,
        hasParams: !!parameterValues && Object.keys(parameterValues).length > 0,
        selectedScenarios: veroTarget.scenarioNames?.length || undefined,
      });

      const result = await executeVeroRun(runInput);

      totalPassed += result.passed;
      totalFailed += result.failed;
      totalSkipped += result.skipped;
      if (result.error) {
        lastError = { message: result.error };
      }
    } catch (err: any) {
      logger.error(`[Schedule] Vero file execution failed: ${veroTarget.filePath}`, err);
      totalFailed++;
      lastError = { message: err.message };
    }
  }

  // ── Execute legacy .spec.ts files via old execution engine ──────────────

  if (legacyFiles.length > 0) {
    await executionEngine.initialize();

    let legacyExecutionId: string;
    try {
      const testFlow = await getOrCreateVeroTestFlow(
        userId,
        flowName,
        flowName,
        '',
        'Scheduled Tests',
        executionScope?.applicationId
      );
      const execution = await executionRepository.create({
        testFlowId: testFlow.id,
        applicationId: executionScope?.applicationId,
        projectId: executionScope?.projectId,
        status: 'running',
        target: 'local',
        triggeredBy: 'schedule',
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        startedAt: new Date(),
        configSnapshot: JSON.stringify(executionConfig || {}),
      });
      legacyExecutionId = execution.id;

      // Link execution to schedule run if no vero files claimed it
      if (veroTargets.length === 0) {
        await scheduleRunRepository.update(runId, { executionId: execution.id });
      }
    } catch (error) {
      logger.error('Failed to create legacy execution record:', error);
      legacyExecutionId = require('uuid').v4();
    }

    // Merge env vars for legacy path too
    const mergedEnvVars = mergeExecutionEnvironment(
      resolvedEnvVars,
      parameterValues,
      customEnvVars,
    );

    const options: ExecutionOptions = {
      ...DEFAULT_EXECUTION_OPTIONS,
      browser: (executionConfig?.browser as any) || 'chromium',
      headless: executionConfig?.headless ?? true,
      timeout: executionConfig?.timeout || 30000,
      retries: executionConfig?.retries || 0,
      workers: executionConfig?.workers || 1,
      baseUrl: executionConfig?.baseUrl,
      environmentId: executionConfig?.environmentId,
      envVars: Object.keys(mergedEnvVars).length > 0 ? mergedEnvVars : executionConfig?.envVars,
      runId: legacyExecutionId,
    };

    // resultManager imported at module scope

    try {
      for await (const result of executionEngine.runSuite(legacyFiles, options)) {
        await resultManager.saveResult(result);

        if (result.status === 'passed') totalPassed++;
        else if (result.status === 'failed') { totalFailed++; lastError = result.error; }
        else if (result.status === 'skipped') totalSkipped++;
      }
    } catch (err: any) {
      logger.error(`Execution engine error during schedule run ${runId}:`, err);
      lastError = { message: err.message };
    }

    if (legacyExecutionId) {
      const legacyStatus = totalFailed > 0 ? 'failed' : 'passed';
      await executionService.updateStatus(legacyExecutionId, legacyStatus);
    }
  }

  // ── Aggregate & finalize ────────────────────────────────────────────────

  const durationMs = Date.now() - startTime;
  const testCount = totalPassed + totalFailed + totalSkipped;
  const status = totalFailed > 0 ? 'failed' : 'passed';

  // Update schedule run with results
  await scheduleRunRepository.update(runId, {
    status,
    testCount,
    passedCount: totalPassed,
    failedCount: totalFailed,
    skippedCount: totalSkipped,
    durationMs,
    completedAt: new Date(),
    errorMessage: lastError?.message,
  });

  // Update schedule's last run time and calculate next run
  const nextRunAt = calculateNextRunTime(schedule.cronExpression, schedule.timezone);
  await scheduleRepository.update(schedule.id, {
    lastRunAt: new Date(),
    nextRunAt: nextRunAt || undefined,
  });

  // Audit log completion
  await auditService.logExecutionAction('completed', runId, userId, {
    status,
    durationMs,
    testCount,
    passedCount: totalPassed,
    failedCount: totalFailed,
  });

  // Send notifications
  const notificationConfig = schedule.notificationConfig
    ? JSON.parse(schedule.notificationConfig)
    : null;

  if (notificationConfig) {
    const runInfo: ScheduleRunInfo = {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      runId,
      status: status as 'passed' | 'failed',
      testCount,
      passedCount: totalPassed,
      failedCount: totalFailed,
      skippedCount: totalSkipped,
      durationMs,
      errorMessage: lastError?.message,
      triggeredBy: triggerType,
      environment: executionConfig?.environment,
    };

    await notificationService.sendRunNotifications(runInfo, notificationConfig);
  }

  logger.info(`Schedule run ${runId} completed locally with status: ${status} (${testCount} tests, ${veroTargets.length} vero + ${legacyFiles.length} legacy)`);
}

/**
 * Calculate next run time (simplified - use cronParser in production)
 */
function calculateNextRunTime(cronExpression: string, timezone: string): Date | null {
  try {
    const { getNextRunTime } = require('../../scheduler/cronParser');
    return getNextRunTime(cronExpression, new Date(), timezone);
  } catch {
    return null;
  }
}
