import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  scheduleRepositoryMock: {
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
  },
  scheduleRunRepositoryMock: {
    findByScheduleId: vi.fn(),
  },
  scheduleTestResultRepositoryMock: {
    findByRunId: vi.fn(),
  },
  userRepositoryMock: {
    findById: vi.fn(),
  },
  runConfigurationRepositoryMock: {
    findById: vi.fn(),
  },
  workflowRepositoryMock: {
    findById: vi.fn(),
    findByApplicationId: vi.fn(),
    findByUserId: vi.fn(),
  },
  projectRepositoryMock: {
    findById: vi.fn(),
  },
  sandboxRepositoryMock: {
    findById: vi.fn(),
  },
  runParameterDefinitionRepositoryMock: {
    findByApplicationId: vi.fn(),
  },
  runParameterSetRepositoryMock: {
    findById: vi.fn(),
    findByApplicationId: vi.fn(),
  },
  queueServiceMock: {
    addJob: vi.fn(),
  },
  auditServiceMock: {
    logScheduleAction: vi.fn(),
  },
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../db/repositories/mongo', () => ({
  scheduleRepository: mocks.scheduleRepositoryMock,
  scheduleRunRepository: mocks.scheduleRunRepositoryMock,
  scheduleTestResultRepository: mocks.scheduleTestResultRepositoryMock,
  userRepository: mocks.userRepositoryMock,
  runConfigurationRepository: mocks.runConfigurationRepositoryMock,
  workflowRepository: mocks.workflowRepositoryMock,
  projectRepository: mocks.projectRepositoryMock,
  sandboxRepository: mocks.sandboxRepositoryMock,
  runParameterDefinitionRepository: mocks.runParameterDefinitionRepositoryMock,
  runParameterSetRepository: mocks.runParameterSetRepositoryMock,
}));

vi.mock('../services/queue', () => ({
  queueService: mocks.queueServiceMock,
  QUEUE_NAMES: {
    SCHEDULE_RUN: 'schedule-run',
  },
}));

vi.mock('../services/audit.service', () => ({
  auditService: mocks.auditServiceMock,
}));

vi.mock('../utils/logger', () => ({
  logger: mocks.loggerMock,
}));

import { ScheduleService } from '../services/schedule.service';

function buildStoredSchedule(payload: any) {
  return {
    id: payload.id || 'schedule-1',
    userId: payload.userId || 'user-1',
    projectId: payload.projectId,
    workflowId: payload.workflowId,
    scopeFolder: payload.scopeFolder,
    scopeSandboxId: payload.scopeSandboxId,
    name: payload.name,
    description: payload.description || null,
    cronExpression: payload.cronExpression,
    timezone: payload.timezone || 'UTC',
    testSelector: payload.testSelector,
    notificationConfig: payload.notificationConfig || null,
    isActive: payload.isActive ?? true,
    nextRunAt: payload.nextRunAt || new Date(),
    lastRunAt: payload.lastRunAt || null,
    createdAt: payload.createdAt || new Date(),
    updatedAt: payload.updatedAt || new Date(),
    webhookToken: payload.webhookToken || 'token',
    parameters: null,
    defaultExecutionConfig: null,
    executionTarget: payload.executionTarget || 'local',
    runConfigurationId: payload.runConfigurationId || 'config-1',
    githubRepoFullName: payload.githubRepoFullName || null,
    githubBranch: payload.githubBranch || null,
    githubWorkflowFile: payload.githubWorkflowFile || null,
    githubInputs: payload.githubInputs || null,
    migrationVersion: payload.migrationVersion || 1,
  };
}

describe('ScheduleService active-on-create enforcement', () => {
  const service = new ScheduleService();

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.workflowRepositoryMock.findById.mockResolvedValue({
      id: 'workflow-1',
      userId: 'user-1',
      applicationId: 'app-1',
      name: 'Workflow',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mocks.projectRepositoryMock.findById.mockResolvedValue({
      id: 'project-1',
      applicationId: 'app-1',
      name: 'Project 1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mocks.runConfigurationRepositoryMock.findById.mockResolvedValue({
      id: 'config-1',
      workflowId: 'workflow-1',
      projectId: 'project-1',
      target: 'local',
      browser: 'chromium',
      headless: true,
      workers: 1,
      retries: 0,
      timeout: 30000,
      tracing: 'on-failure',
      screenshot: 'on-failure',
      video: 'off',
      runtimeConfig: JSON.stringify({}),
    });
    mocks.sandboxRepositoryMock.findById.mockResolvedValue(null);
    mocks.scheduleRunRepositoryMock.findByScheduleId.mockResolvedValue([]);
    mocks.scheduleRepositoryMock.create.mockImplementation(async (payload: any) => buildStoredSchedule(payload));
  });

  it('forces isActive=true when create payload requests false', async () => {
    const schedule = await service.create('user-1', {
      name: 'MikeTest',
      projectId: 'project-1',
      workflowId: 'workflow-1',
      scopeFolder: 'dev',
      cronExpression: '*/30 * * * *',
      timezone: 'UTC',
      runConfigurationId: 'config-1',
      isActive: false,
    });

    expect(mocks.scheduleRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: true,
      })
    );
    expect(mocks.loggerMock.warn).toHaveBeenCalledWith(
      '[Schedule] New schedule requested as paused; enforcing active state',
      expect.objectContaining({
        userId: 'user-1',
        workflowId: 'workflow-1',
        projectId: 'project-1',
        scheduleName: 'MikeTest',
        requestedIsActive: false,
        enforcedIsActive: true,
      })
    );
    expect(schedule.isActive).toBe(true);
  });

  it('defaults new schedules to active when isActive is omitted', async () => {
    const schedule = await service.create('user-1', {
      name: 'Nightly',
      projectId: 'project-1',
      workflowId: 'workflow-1',
      scopeFolder: 'dev',
      cronExpression: '0 6 * * *',
      timezone: 'UTC',
      runConfigurationId: 'config-1',
    });

    expect(mocks.scheduleRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: true,
      })
    );
    expect(mocks.loggerMock.warn).not.toHaveBeenCalled();
    expect(schedule.isActive).toBe(true);
  });

  it('still allows pausing existing schedules via toggle', async () => {
    const existing = buildStoredSchedule({
      id: 'schedule-1',
      userId: 'user-1',
      projectId: 'project-1',
      workflowId: 'workflow-1',
      scopeFolder: 'dev',
      name: 'Existing',
      cronExpression: '0 6 * * *',
      timezone: 'UTC',
      testSelector: JSON.stringify({ folders: ['dev'] }),
      isActive: true,
    });
    const paused = {
      ...existing,
      isActive: false,
      nextRunAt: undefined,
      updatedAt: new Date(),
    };

    mocks.scheduleRepositoryMock.findById.mockResolvedValue(existing);
    mocks.scheduleRepositoryMock.update.mockResolvedValue(paused);

    const result = await service.toggleActive('user-1', 'schedule-1');

    expect(mocks.scheduleRepositoryMock.update).toHaveBeenCalledWith(
      'schedule-1',
      expect.objectContaining({
        isActive: false,
        nextRunAt: undefined,
      })
    );
    expect(result.isActive).toBe(false);
  });
});
