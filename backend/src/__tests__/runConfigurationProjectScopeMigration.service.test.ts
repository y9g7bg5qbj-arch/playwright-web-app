import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MongoRunConfiguration } from '../db/mongodb';

const mocks = vi.hoisted(() => ({
  runConfigurationRepositoryMock: {
    findPendingProjectScopeMigration: vi.fn(),
    findByProjectScopeSource: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  workflowRepositoryMock: {
    findById: vi.fn(),
  },
  projectRepositoryMock: {
    findByApplicationId: vi.fn(),
  },
  scheduleRepositoryMock: {
    findByRunConfigurationId: vi.fn(),
    update: vi.fn(),
  },
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../db/repositories/mongo', () => ({
  runConfigurationRepository: mocks.runConfigurationRepositoryMock,
  workflowRepository: mocks.workflowRepositoryMock,
  projectRepository: mocks.projectRepositoryMock,
  scheduleRepository: mocks.scheduleRepositoryMock,
}));

vi.mock('../utils/logger', () => ({
  logger: mocks.loggerMock,
}));

import { migrateRunConfigurationsToProjectScope } from '../services/runConfigurationProjectScopeMigration.service';

function buildSourceConfig(overrides: Partial<MongoRunConfiguration> = {}): MongoRunConfiguration {
  const now = new Date();
  return {
    id: 'source-config',
    workflowId: 'workflow-1',
    name: 'Legacy Shared Config',
    isDefault: false,
    tags: [],
    tagMode: 'any',
    excludeTags: [],
    testFlowIds: [],
    target: 'local',
    browser: 'chromium',
    headless: true,
    viewport: JSON.stringify({ width: 1280, height: 720 }),
    workers: 1,
    shardCount: 1,
    retries: 0,
    timeout: 30000,
    tracing: 'on-failure',
    screenshot: 'on-failure',
    video: 'off',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('migrateRunConfigurationsToProjectScope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is idempotent across repeated startup runs', async () => {
    const source = buildSourceConfig();
    const schedule = {
      id: 'schedule-1',
      runConfigurationId: 'source-config',
      projectId: 'project-1',
    };
    const clonesByProject = new Map<string, any>();
    let pendingCalls = 0;

    mocks.workflowRepositoryMock.findById.mockResolvedValue({
      id: 'workflow-1',
      userId: 'user-1',
      applicationId: 'app-1',
      name: 'Workflow',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mocks.projectRepositoryMock.findByApplicationId.mockResolvedValue([
      { id: 'project-1', applicationId: 'app-1' },
      { id: 'project-2', applicationId: 'app-1' },
    ]);

    mocks.runConfigurationRepositoryMock.findPendingProjectScopeMigration.mockImplementation(async () => {
      pendingCalls += 1;
      return pendingCalls <= 2 ? [source] : [];
    });
    mocks.runConfigurationRepositoryMock.findByProjectScopeSource.mockImplementation(
      async (_workflowId: string, projectId: string) => clonesByProject.get(projectId) || null
    );
    mocks.runConfigurationRepositoryMock.create.mockImplementation(async (data: any) => {
      const created = {
        ...source,
        ...data,
        id: `clone-${data.projectId}`,
        projectScopeSourceConfigId: source.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      clonesByProject.set(data.projectId, created);
      return created;
    });
    mocks.runConfigurationRepositoryMock.update.mockResolvedValue(source);

    mocks.scheduleRepositoryMock.findByRunConfigurationId.mockImplementation(async (runConfigurationId: string) =>
      schedule.runConfigurationId === runConfigurationId ? [schedule] : []
    );
    mocks.scheduleRepositoryMock.update.mockImplementation(async (_id: string, updates: any) => {
      if (updates.runConfigurationId) {
        schedule.runConfigurationId = updates.runConfigurationId;
      }
      return { ...schedule };
    });

    await migrateRunConfigurationsToProjectScope();
    await migrateRunConfigurationsToProjectScope();

    expect(mocks.runConfigurationRepositoryMock.create).toHaveBeenCalledTimes(2);
    expect(mocks.scheduleRepositoryMock.update).toHaveBeenCalledTimes(1);
    expect(mocks.scheduleRepositoryMock.update).toHaveBeenCalledWith(
      'schedule-1',
      expect.objectContaining({ runConfigurationId: 'clone-project-1' })
    );
  });
});
