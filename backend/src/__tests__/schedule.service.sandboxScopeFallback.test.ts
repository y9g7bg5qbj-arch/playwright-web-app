import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  scheduleRepositoryMock: {
    create: vi.fn(),
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
    id: 'schedule-1',
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
    lastRunAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    webhookToken: payload.webhookToken,
    parameters: null,
    defaultExecutionConfig: null,
    executionTarget: payload.executionTarget || 'local',
    runConfigurationId: payload.runConfigurationId,
    githubRepoFullName: payload.githubRepoFullName || null,
    githubBranch: payload.githubBranch || null,
    githubWorkflowFile: payload.githubWorkflowFile || null,
    githubInputs: payload.githubInputs || null,
    migrationVersion: payload.migrationVersion || 1,
  };
}

describe('ScheduleService sandbox scope fallback', () => {
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
    mocks.scheduleRepositoryMock.create.mockImplementation(async (payload: any) => buildStoredSchedule(payload));
    mocks.scheduleRunRepositoryMock.findByScheduleId.mockResolvedValue([]);
  });

  it('creates schedule when scopeSandboxId is a sandbox folder path', async () => {
    const schedule = await service.create('user-1', {
      name: 'Nightly Sandbox',
      projectId: 'project-1',
      workflowId: 'workflow-1',
      scopeFolder: 'sandboxes',
      scopeSandboxId: 'sandboxes/simple-test',
      cronExpression: '0 6 * * *',
      timezone: 'UTC',
      runConfigurationId: 'config-1',
      isActive: true,
    });

    expect(mocks.scheduleRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scopeSandboxId: 'sandboxes/simple-test',
        testSelector: JSON.stringify({ folders: ['sandboxes/simple-test'] }),
      })
    );
    expect(schedule.testSelector.folders).toEqual(['sandboxes/simple-test']);
  });

  it('rejects invalid sandbox folder path fallback values', async () => {
    await expect(
      service.create('user-1', {
        name: 'Invalid Sandbox Scope',
        projectId: 'project-1',
        workflowId: 'workflow-1',
        scopeFolder: 'sandboxes',
        scopeSandboxId: 'sandboxes/simple-test/nested',
        cronExpression: '0 6 * * *',
        timezone: 'UTC',
        runConfigurationId: 'config-1',
        isActive: true,
      })
    ).rejects.toThrow("Sandbox 'sandboxes/simple-test/nested' not found");

    expect(mocks.scheduleRepositoryMock.create).not.toHaveBeenCalled();
  });
});
