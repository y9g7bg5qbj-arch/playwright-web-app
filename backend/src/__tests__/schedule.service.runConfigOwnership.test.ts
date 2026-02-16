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
    create: vi.fn(),
    update: vi.fn(),
    findByWorkflowId: vi.fn(),
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

describe('ScheduleService run configuration ownership validation', () => {
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
      name: 'Alta',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mocks.runConfigurationRepositoryMock.findById.mockResolvedValue({
      id: 'config-1',
      workflowId: 'workflow-1',
      projectId: 'project-2',
      target: 'local',
      browser: 'chromium',
      headless: true,
      workers: 1,
      retries: 0,
      timeout: 30000,
      tracing: 'on-failure',
      screenshot: 'on-failure',
      video: 'off',
    });
  });

  it('rejects schedule creation when linked run config belongs to a different project', async () => {
    await expect(
      service.create('user-1', {
        name: 'Daily Smoke',
        projectId: 'project-1',
        scopeFolder: 'dev',
        cronExpression: '0 6 * * *',
        timezone: 'UTC',
        workflowId: 'workflow-1',
        isActive: true,
        runConfigurationId: 'config-1',
      })
    ).rejects.toThrow('Run configuration does not belong to this project');

    expect(mocks.scheduleRepositoryMock.create).not.toHaveBeenCalled();
  });
});
