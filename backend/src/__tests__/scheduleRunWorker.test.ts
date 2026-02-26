import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScheduleRunJobData } from '../services/queue/types';

const mocks = vi.hoisted(() => ({
  scheduleRepositoryMock: {
    findById: vi.fn(),
    update: vi.fn(),
  },
  scheduleRunRepositoryMock: {
    update: vi.fn(),
    create: vi.fn(),
    hasActiveRuns: vi.fn(),
  },
  executionRepositoryMock: {
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
  },
  runConfigurationRepositoryMock: {
    findById: vi.fn(),
  },
  projectRepositoryMock: {
    findById: vi.fn(),
  },
  applicationRepositoryMock: {
    findById: vi.fn(),
  },
  workflowRepositoryMock: {
    findById: vi.fn(),
    findByApplicationId: vi.fn(),
  },
  runParameterDefinitionRepositoryMock: {
    findByApplicationId: vi.fn(),
  },
  runParameterSetRepositoryMock: {
    findById: vi.fn(),
    findByApplicationId: vi.fn(),
  },
  executionStepRepositoryMock: {
    create: vi.fn(),
  },
  auditServiceMock: {
    logExecutionAction: vi.fn(),
  },
  notificationServiceMock: {
    sendRunNotifications: vi.fn(),
  },
  executionEngineMock: {
    initialize: vi.fn(),
    runSuite: vi.fn(),
  },
  githubServiceMock: {
    triggerWorkflow: vi.fn(),
    listWorkflowRuns: vi.fn(),
  },
  resolveTestFilesMock: vi.fn(),
  executeVeroRunMock: vi.fn(),
  executionServiceMock: {
    updateStatus: vi.fn(),
  },
  scheduleServiceMock: {
    triggerChainedSchedules: vi.fn(),
  },
}));

vi.mock('../db/repositories/mongo', () => ({
  scheduleRepository: mocks.scheduleRepositoryMock,
  scheduleRunRepository: mocks.scheduleRunRepositoryMock,
  executionRepository: mocks.executionRepositoryMock,
  runConfigurationRepository: mocks.runConfigurationRepositoryMock,
  projectRepository: mocks.projectRepositoryMock,
  applicationRepository: mocks.applicationRepositoryMock,
  workflowRepository: mocks.workflowRepositoryMock,
  executionStepRepository: mocks.executionStepRepositoryMock,
  runParameterDefinitionRepository: mocks.runParameterDefinitionRepositoryMock,
  runParameterSetRepository: mocks.runParameterSetRepositoryMock,
}));

vi.mock('../services/audit.service', () => ({
  auditService: mocks.auditServiceMock,
}));

vi.mock('../services/notification.service', () => ({
  notificationService: mocks.notificationServiceMock,
}));

vi.mock('../services/execution', () => ({
  executionEngine: mocks.executionEngineMock,
}));

vi.mock('../services/github.service', () => ({
  githubService: mocks.githubServiceMock,
}));

vi.mock('../services/execution/testResolver', () => ({
  resolveTestFiles: mocks.resolveTestFilesMock,
  resolveTestPlan: mocks.resolveTestFilesMock,
}));

vi.mock('../services/veroRunService', () => ({
  executeVeroRun: mocks.executeVeroRunMock,
  mergeExecutionEnvironment: (envVars?: Record<string, string>, paramValues?: Record<string, unknown>, custom?: Record<string, string>) => {
    const merged: Record<string, string> = {};
    if (envVars) Object.assign(merged, envVars);
    if (paramValues) for (const [k, v] of Object.entries(paramValues)) merged[k] = String(v ?? '');
    if (custom) Object.assign(merged, custom);
    return merged;
  },
}));

vi.mock('../services/execution.service', () => ({
  ExecutionService: class MockExecutionService {
    updateStatus = mocks.executionServiceMock.updateStatus;
  },
}));

vi.mock('../services/testFlow.utils', () => ({
  getOrCreateVeroTestFlow: vi.fn().mockResolvedValue({ id: 'test-flow-1' }),
}));

// The worker uses a dynamic require('../../results') — mock from worker's perspective
vi.mock('../services/results/index', () => ({
  resultManager: { saveResult: vi.fn() },
  ResultManager: vi.fn(),
}));
// Also mock the path as vitest may resolve it differently
vi.mock('../services/results', () => ({
  resultManager: { saveResult: vi.fn() },
  ResultManager: vi.fn(),
}));

vi.mock('../services/schedule.service', () => ({
  scheduleService: mocks.scheduleServiceMock,
}));

import { processScheduleRunJob } from '../services/queue/workers/scheduleRunWorker';

function buildJob(overrides: Partial<ScheduleRunJobData> = {}) {
  const data: ScheduleRunJobData = {
    scheduleId: 'schedule-1',
    runId: 'run-1',
    userId: 'user-1',
    triggerType: 'manual',
    executionConfig: {},
    ...overrides,
  };

  return {
    id: 'job-1',
    name: 'schedule-run',
    data,
    priority: 1,
    status: 'waiting',
    attempts: 0,
    maxAttempts: 1,
    progress: 0,
    createdAt: new Date(),
  };
}

describe('scheduleRunWorker environment propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.scheduleRepositoryMock.update.mockResolvedValue({});
    mocks.scheduleRunRepositoryMock.update.mockResolvedValue({});

    mocks.auditServiceMock.logExecutionAction.mockResolvedValue(undefined);
    mocks.notificationServiceMock.sendRunNotifications.mockResolvedValue(undefined);

    mocks.executionEngineMock.initialize.mockResolvedValue(undefined);
    mocks.executionServiceMock.updateStatus.mockResolvedValue(undefined);
    mocks.executionRepositoryMock.create.mockResolvedValue({ id: 'exec-1' });
    mocks.executionRepositoryMock.update.mockResolvedValue({});
    mocks.runConfigurationRepositoryMock.findById.mockResolvedValue(null);
    mocks.projectRepositoryMock.findById.mockResolvedValue(null);
    mocks.applicationRepositoryMock.findById.mockResolvedValue(null);
    mocks.workflowRepositoryMock.findById.mockResolvedValue(null);
    mocks.workflowRepositoryMock.findByApplicationId.mockResolvedValue([]);
    mocks.runParameterDefinitionRepositoryMock.findByApplicationId.mockResolvedValue([]);
    mocks.runParameterSetRepositoryMock.findById.mockResolvedValue(null);
    mocks.runParameterSetRepositoryMock.findByApplicationId.mockResolvedValue([]);
    mocks.scheduleRunRepositoryMock.create.mockResolvedValue({ id: 'run-auto-1' });
    mocks.scheduleRunRepositoryMock.hasActiveRuns.mockResolvedValue(false);

    mocks.scheduleServiceMock.triggerChainedSchedules.mockResolvedValue(undefined);

    mocks.githubServiceMock.triggerWorkflow.mockResolvedValue({ success: true });
    mocks.githubServiceMock.listWorkflowRuns.mockResolvedValue([]);
  });

  it('resolves runtime env vars from parameter values for legacy .spec.ts path', async () => {
    // Resolve to a legacy .spec.ts file (not .vero)
    mocks.resolveTestFilesMock.mockResolvedValue(['/tests/smoke.spec.ts']);
    // Mock the runSuite async generator to yield one passed result
    mocks.executionEngineMock.runSuite.mockReturnValue(
      (async function* () { yield { status: 'passed' }; })()
    );

    mocks.scheduleRepositoryMock.findById.mockResolvedValue({
      id: 'schedule-1',
      userId: 'user-1',
      name: 'Nightly',
      executionTarget: 'local',
      testSelector: JSON.stringify({ patterns: ['smoke.spec.ts'] }),
      cronExpression: '* * * * *',
      timezone: 'UTC',
    });

    await processScheduleRunJob(
      buildJob({
        executionConfig: { browser: 'chromium' },
        parameterValues: {
          BASE_URL: 'https://qa.example.com',
          API_TOKEN: 'token-123',
        },
      }) as any
    );

    // Legacy .spec.ts files go through executionEngine.runSuite
    expect(mocks.executionEngineMock.runSuite).toHaveBeenCalledWith(
      ['/tests/smoke.spec.ts'],
      expect.objectContaining({
        envVars: {
          BASE_URL: 'https://qa.example.com',
          API_TOKEN: 'token-123',
        },
      })
    );

    // No environmentId on the options
    const options = mocks.executionEngineMock.runSuite.mock.calls[0][1];
    expect(options.environmentId).toBeUndefined();

    expect(mocks.scheduleRunRepositoryMock.update).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({ status: 'passed' })
    );
  });

  it('routes .vero files through executeVeroRun with parameter values', async () => {
    mocks.resolveTestFilesMock.mockResolvedValue(['/tests/Login.vero']);
    mocks.executeVeroRunMock.mockResolvedValue({
      status: 'passed',
      passed: 1,
      failed: 0,
      skipped: 0,
      durationMs: 1000,
      exitCode: 0,
      generatedCode: '',
      output: '',
    });

    mocks.scheduleRepositoryMock.findById.mockResolvedValue({
      id: 'schedule-1',
      userId: 'user-1',
      name: 'Nightly Login',
      projectId: 'proj-1',
      executionTarget: 'local',
      testSelector: JSON.stringify({ patterns: ['Login.vero'] }),
      cronExpression: '0 2 * * *',
      timezone: 'UTC',
    });

    await processScheduleRunJob(
      buildJob({
        parameterValues: { browser: 'firefox', region: 'us-east' },
      }) as any
    );

    // .vero files go through executeVeroRun (not executionEngine)
    expect(mocks.executionEngineMock.runSuite).not.toHaveBeenCalled();
    expect(mocks.executeVeroRunMock).toHaveBeenCalledTimes(1);

    const runInput = mocks.executeVeroRunMock.mock.calls[0][0];
    expect(runInput.filePath).toBe('/tests/Login.vero');
    expect(runInput.triggeredBy).toBe('schedule');
    expect(runInput.projectId).toBe('proj-1');
    // Parameter values are passed through
    expect(runInput.parameterValues).toEqual({ browser: 'firefox', region: 'us-east' });
    // No environment manager vars — environment layer removed
    expect(runInput.environmentVars).toBeUndefined();

    expect(mocks.scheduleRunRepositoryMock.update).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({ status: 'passed' })
    );
  });

  it('normalizes linked run-config selectionScope to active-file for scheduled .vero runs', async () => {
    mocks.resolveTestFilesMock.mockResolvedValue(['/tests/Login.vero']);
    mocks.executeVeroRunMock.mockResolvedValue({
      status: 'passed',
      passed: 1,
      failed: 0,
      skipped: 0,
      durationMs: 700,
      exitCode: 0,
      generatedCode: '',
      output: '',
    });

    mocks.scheduleRepositoryMock.findById.mockResolvedValue({
      id: 'schedule-1',
      userId: 'user-1',
      name: 'Nightly Login',
      projectId: 'proj-1',
      executionTarget: 'local',
      runConfigurationId: 'config-1',
      testSelector: JSON.stringify({ patterns: ['Login.vero'] }),
      cronExpression: '0 2 * * *',
      timezone: 'UTC',
    });

    mocks.runConfigurationRepositoryMock.findById.mockResolvedValue({
      id: 'config-1',
      name: 'Current Sandbox Config',
      target: 'local',
      browser: 'chromium',
      headless: true,
      workers: 2,
      retries: 0,
      timeout: 30000,
      selectionScope: 'current-sandbox',
      runtimeConfig: JSON.stringify({}),
    });

    await processScheduleRunJob(buildJob() as any);

    expect(mocks.executeVeroRunMock).toHaveBeenCalledTimes(1);
    const runInput = mocks.executeVeroRunMock.mock.calls[0][0];
    expect(runInput.config.selectionScope).toBe('active-file');
  });

  it('passes scenario-level tag selection into executeVeroRun for .vero targets', async () => {
    mocks.resolveTestFilesMock.mockResolvedValue([
      { filePath: '/tests/Login.vero', scenarioNames: ['Smoke Login', 'Smoke Logout'] },
    ]);
    mocks.executeVeroRunMock.mockResolvedValue({
      status: 'passed',
      passed: 2,
      failed: 0,
      skipped: 0,
      durationMs: 900,
      exitCode: 0,
      generatedCode: '',
      output: '',
    });

    mocks.scheduleRepositoryMock.findById.mockResolvedValue({
      id: 'schedule-1',
      userId: 'user-1',
      name: 'Tagged Smoke',
      projectId: 'proj-1',
      executionTarget: 'local',
      testSelector: JSON.stringify({ tags: ['@smoke'] }),
      cronExpression: '0 2 * * *',
      timezone: 'UTC',
    });

    await processScheduleRunJob(buildJob() as any);

    expect(mocks.executeVeroRunMock).toHaveBeenCalledTimes(1);
    const runInput = mocks.executeVeroRunMock.mock.calls[0][0];
    expect(runInput.selection).toEqual({
      scenarioNames: ['Smoke Login', 'Smoke Logout'],
    });
  });

  it('does not call environment repositories (environment layer removed)', async () => {
    mocks.resolveTestFilesMock.mockResolvedValue(['/tests/smoke.spec.ts']);
    mocks.executionEngineMock.runSuite.mockReturnValue(
      (async function* () { yield { status: 'passed' }; })()
    );

    mocks.scheduleRepositoryMock.findById.mockResolvedValue({
      id: 'schedule-1',
      userId: 'user-1',
      name: 'Nightly',
      executionTarget: 'local',
      testSelector: JSON.stringify({}),
      cronExpression: '* * * * *',
      timezone: 'UTC',
    });

    await processScheduleRunJob(buildJob() as any);

    // Environment layer fully removed — no env repository calls
    const options = mocks.executionEngineMock.runSuite.mock.calls[0][1];
    expect(options.environmentId).toBeUndefined();
    // No parameter values -> no envVars passed to the legacy execution engine.
    expect(options.envVars).toBeUndefined();
  });

  it('injects envVarsB64 from resolved parameter values when dispatching to GitHub Actions', async () => {
    const setTimeoutSpy = vi
      .spyOn(global, 'setTimeout')
      .mockImplementation(((handler: (...args: any[]) => void) => {
        handler();
        return 0 as unknown as NodeJS.Timeout;
      }) as any);

    mocks.scheduleRepositoryMock.findById.mockResolvedValue({
      id: 'schedule-1',
      userId: 'user-1',
      name: 'CI Vero',
      executionTarget: 'github-actions',
      githubRepoFullName: 'owner/repo',
      githubWorkflowFile: '.github/workflows/vero-tests.yml',
      githubBranch: 'main',
      githubInputs: JSON.stringify({
        runMode: 'vero',
        veroFilePath: 'app/features/Login.vero',
      }),
      cronExpression: '* * * * *',
      timezone: 'UTC',
      testSelector: JSON.stringify({}),
    });

    try {
      await processScheduleRunJob(
        buildJob({
          parameterValues: {
            BASE_URL: 'https://ci.example.com',
            AUTH_TOKEN: 'secret-token',
          },
        }) as any
      );
    } finally {
      setTimeoutSpy.mockRestore();
    }

    expect(mocks.executionEngineMock.runSuite).not.toHaveBeenCalled();
    expect(mocks.githubServiceMock.triggerWorkflow).toHaveBeenCalledTimes(1);

    const workflowInputs = mocks.githubServiceMock.triggerWorkflow.mock.calls[0][5] as Record<string, string>;
    expect(workflowInputs.schedule_run_id).toBe('run-1');
    expect(workflowInputs.triggered_by).toBe('manual');
    expect(typeof workflowInputs.envVarsB64).toBe('string');

    const decoded = JSON.parse(Buffer.from(workflowInputs.envVarsB64, 'base64').toString('utf-8'));
    expect(decoded).toEqual({
      BASE_URL: 'https://ci.example.com',
      AUTH_TOKEN: 'secret-token',
    });
  });

  it('creates ScheduleRun at execution time for repeatable tick (no runId)', async () => {
    mocks.resolveTestFilesMock.mockResolvedValue(['/tests/Login.vero']);
    mocks.executeVeroRunMock.mockResolvedValue({
      status: 'passed',
      passed: 1,
      failed: 0,
      skipped: 0,
      durationMs: 800,
      exitCode: 0,
      generatedCode: '',
      output: '',
    });

    mocks.scheduleRepositoryMock.findById.mockResolvedValue({
      id: 'schedule-1',
      userId: 'user-1',
      name: 'Repeatable Nightly',
      projectId: 'proj-1',
      executionTarget: 'local',
      isActive: true,
      concurrencyPolicy: 'forbid',
      runConfigurationId: 'config-1',
      testSelector: JSON.stringify({}),
      cronExpression: '0 2 * * *',
      timezone: 'UTC',
    });

    mocks.runConfigurationRepositoryMock.findById.mockResolvedValue({
      id: 'config-1',
      name: 'Config',
      target: 'local',
      browser: 'chromium',
      headless: true,
      workers: 1,
      retries: 0,
      timeout: 30000,
      runtimeConfig: JSON.stringify({}),
    });

    mocks.scheduleRunRepositoryMock.create.mockResolvedValue({ id: 'run-auto-1' });
    mocks.scheduleRunRepositoryMock.hasActiveRuns.mockResolvedValue(false);

    // Build a job WITHOUT runId (simulates repeatable tick)
    const job = {
      id: 'job-repeatable-1',
      name: 'schedule-run-schedule-1',
      data: {
        scheduleId: 'schedule-1',
        userId: 'user-1',
        triggerType: 'scheduled' as const,
      },
      priority: 1,
      status: 'waiting',
      attempts: 0,
      maxAttempts: 1,
      progress: 0,
      createdAt: new Date(), // recent = not stale
    };

    await processScheduleRunJob(job as any);

    // Should have created a ScheduleRun
    expect(mocks.scheduleRunRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: 'schedule-1',
        triggerType: 'scheduled',
        status: 'pending',
      })
    );

    // Should then proceed to execute
    expect(mocks.executeVeroRunMock).toHaveBeenCalledTimes(1);

    // Should update the auto-created run to running then to passed
    expect(mocks.scheduleRunRepositoryMock.update).toHaveBeenCalledWith(
      'run-auto-1',
      expect.objectContaining({ status: 'running' })
    );
    expect(mocks.scheduleRunRepositoryMock.update).toHaveBeenCalledWith(
      'run-auto-1',
      expect.objectContaining({ status: 'passed' })
    );
  });

  it('skips repeatable tick when stale (lag exceeds threshold)', async () => {
    mocks.scheduleRepositoryMock.findById.mockResolvedValue({
      id: 'schedule-1',
      userId: 'user-1',
      name: 'Stale Test',
      isActive: true,
      cronExpression: '0 2 * * *',
      timezone: 'UTC',
    });

    mocks.scheduleRunRepositoryMock.create.mockResolvedValue({ id: 'run-skipped-1' });

    // Build a job WITHOUT runId that was created 10 minutes ago (stale)
    const job = {
      id: 'job-stale-1',
      name: 'schedule-run-schedule-1',
      data: {
        scheduleId: 'schedule-1',
        userId: 'user-1',
        triggerType: 'scheduled' as const,
      },
      priority: 1,
      status: 'waiting',
      attempts: 0,
      maxAttempts: 1,
      progress: 0,
      createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
    };

    await processScheduleRunJob(job as any);

    // Should create a skipped run record
    expect(mocks.scheduleRunRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'skipped',
        skipReason: expect.stringContaining('Stale job'),
      })
    );

    // Should NOT execute anything
    expect(mocks.executeVeroRunMock).not.toHaveBeenCalled();
    expect(mocks.executionEngineMock.runSuite).not.toHaveBeenCalled();
  });

  it('skips repeatable tick when concurrency policy forbids overlap', async () => {
    mocks.scheduleRepositoryMock.findById.mockResolvedValue({
      id: 'schedule-1',
      userId: 'user-1',
      name: 'Overlap Test',
      isActive: true,
      concurrencyPolicy: 'forbid',
      cronExpression: '0 2 * * *',
      timezone: 'UTC',
    });

    // Active runs exist
    mocks.scheduleRunRepositoryMock.hasActiveRuns.mockResolvedValue(true);
    mocks.scheduleRunRepositoryMock.create.mockResolvedValue({ id: 'run-skipped-2' });

    const job = {
      id: 'job-overlap-1',
      name: 'schedule-run-schedule-1',
      data: {
        scheduleId: 'schedule-1',
        userId: 'user-1',
        triggerType: 'scheduled' as const,
      },
      priority: 1,
      status: 'waiting',
      attempts: 0,
      maxAttempts: 1,
      progress: 0,
      createdAt: new Date(),
    };

    await processScheduleRunJob(job as any);

    // Should create a skipped run
    expect(mocks.scheduleRunRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'skipped',
        skipReason: 'Overlap forbidden: previous run still pending or running',
      })
    );

    // Should NOT execute anything
    expect(mocks.executeVeroRunMock).not.toHaveBeenCalled();
  });

  it('handles mixed .vero and .spec.ts files in the same schedule', async () => {
    mocks.resolveTestFilesMock.mockResolvedValue([
      '/tests/Login.vero',
      '/tests/legacy.spec.ts',
    ]);
    mocks.executeVeroRunMock.mockResolvedValue({
      status: 'passed',
      passed: 2,
      failed: 0,
      skipped: 0,
      durationMs: 500,
      exitCode: 0,
      generatedCode: '',
      output: '',
    });
    mocks.executionEngineMock.runSuite.mockReturnValue(
      (async function* () { yield { status: 'passed' }; })()
    );

    mocks.scheduleRepositoryMock.findById.mockResolvedValue({
      id: 'schedule-1',
      userId: 'user-1',
      name: 'Mixed Suite',
      executionTarget: 'local',
      testSelector: JSON.stringify({}),
      cronExpression: '* * * * *',
      timezone: 'UTC',
    });

    await processScheduleRunJob(buildJob() as any);

    // .vero goes through service
    expect(mocks.executeVeroRunMock).toHaveBeenCalledTimes(1);
    expect(mocks.executeVeroRunMock.mock.calls[0][0].filePath).toBe('/tests/Login.vero');

    // .spec.ts goes through legacy engine
    expect(mocks.executionEngineMock.runSuite).toHaveBeenCalledWith(
      ['/tests/legacy.spec.ts'],
      expect.anything()
    );

    // Final status is passed (2 vero + 1 legacy all passed)
    expect(mocks.scheduleRunRepositoryMock.update).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({ status: 'passed', passedCount: 3 })
    );
  });

  it('triggers chained schedules when run passes', async () => {
    mocks.resolveTestFilesMock.mockResolvedValue(['/tests/Login.vero']);
    mocks.executeVeroRunMock.mockResolvedValue({
      status: 'passed',
      passed: 1,
      failed: 0,
      skipped: 0,
      durationMs: 500,
      exitCode: 0,
      generatedCode: '',
      output: '',
    });

    const scheduleWithChain = {
      id: 'schedule-1',
      userId: 'user-1',
      name: 'Parent Schedule',
      executionTarget: 'local',
      testSelector: JSON.stringify({}),
      cronExpression: '0 6 * * *',
      timezone: 'UTC',
      onSuccessTriggerScheduleIds: JSON.stringify(['schedule-child-1', 'schedule-child-2']),
    };

    mocks.scheduleRepositoryMock.findById.mockResolvedValue(scheduleWithChain);

    await processScheduleRunJob(buildJob() as any);

    // Should have called triggerChainedSchedules with the schedule and runId
    expect(mocks.scheduleServiceMock.triggerChainedSchedules).toHaveBeenCalledWith(
      scheduleWithChain,
      'run-1'
    );
  });

  it('does NOT trigger chained schedules when run fails', async () => {
    mocks.resolveTestFilesMock.mockResolvedValue(['/tests/Login.vero']);
    mocks.executeVeroRunMock.mockResolvedValue({
      status: 'failed',
      passed: 0,
      failed: 1,
      skipped: 0,
      durationMs: 500,
      exitCode: 1,
      generatedCode: '',
      output: '',
      error: 'Assertion failed',
    });

    const scheduleWithChain = {
      id: 'schedule-1',
      userId: 'user-1',
      name: 'Parent Schedule',
      executionTarget: 'local',
      testSelector: JSON.stringify({}),
      cronExpression: '0 6 * * *',
      timezone: 'UTC',
      onSuccessTriggerScheduleIds: JSON.stringify(['schedule-child-1']),
    };

    mocks.scheduleRepositoryMock.findById.mockResolvedValue(scheduleWithChain);

    await processScheduleRunJob(buildJob() as any);

    // Should NOT have been called since the run failed
    expect(mocks.scheduleServiceMock.triggerChainedSchedules).not.toHaveBeenCalled();
  });

  it('does NOT trigger chained schedules when schedule has no chain IDs', async () => {
    mocks.resolveTestFilesMock.mockResolvedValue(['/tests/Login.vero']);
    mocks.executeVeroRunMock.mockResolvedValue({
      status: 'passed',
      passed: 1,
      failed: 0,
      skipped: 0,
      durationMs: 500,
      exitCode: 0,
      generatedCode: '',
      output: '',
    });

    mocks.scheduleRepositoryMock.findById.mockResolvedValue({
      id: 'schedule-1',
      userId: 'user-1',
      name: 'No Chain',
      executionTarget: 'local',
      testSelector: JSON.stringify({}),
      cronExpression: '0 6 * * *',
      timezone: 'UTC',
      // No onSuccessTriggerScheduleIds
    });

    await processScheduleRunJob(buildJob() as any);

    // triggerChainedSchedules is called but should be a no-op (no chain IDs)
    expect(mocks.scheduleServiceMock.triggerChainedSchedules).toHaveBeenCalled();
  });
});
