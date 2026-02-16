import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MongoRunConfiguration } from '../db/mongodb';

const mocks = vi.hoisted(() => ({
  workflowRepositoryMock: {
    findById: vi.fn(),
  },
  projectRepositoryMock: {
    findById: vi.fn(),
  },
  runConfigurationRepositoryMock: {
    findByWorkflowId: vi.fn(),
    findByWorkflowIdAndProjectId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  executionEnvironmentRepositoryMock: {
    findById: vi.fn(),
    findByWorkflowId: vi.fn(),
    updateManyByWorkflowId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  remoteRunnerRepositoryMock: {
    findByWorkflowId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  storedCredentialRepositoryMock: {
    findByWorkflowId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  testFlowRepositoryMock: {
    findByWorkflowId: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../db/repositories/mongo', () => ({
  workflowRepository: mocks.workflowRepositoryMock,
  projectRepository: mocks.projectRepositoryMock,
  runConfigurationRepository: mocks.runConfigurationRepositoryMock,
  executionEnvironmentRepository: mocks.executionEnvironmentRepositoryMock,
  remoteRunnerRepository: mocks.remoteRunnerRepositoryMock,
  storedCredentialRepository: mocks.storedCredentialRepositoryMock,
  testFlowRepository: mocks.testFlowRepositoryMock,
}));

import { RunConfigurationService } from '../services/runConfiguration.service';

function buildMongoConfig(overrides: Partial<MongoRunConfiguration> = {}): MongoRunConfiguration {
  const now = new Date();
  return {
    id: 'config-1',
    workflowId: 'workflow-1',
    projectId: 'project-1',
    name: 'Default',
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

describe('RunConfigurationService project-scope behavior', () => {
  const service = new RunConfigurationService();

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
    mocks.executionEnvironmentRepositoryMock.findById.mockResolvedValue(null);
    mocks.runConfigurationRepositoryMock.findByWorkflowId.mockResolvedValue([]);
    mocks.runConfigurationRepositoryMock.findByWorkflowIdAndProjectId.mockResolvedValue([]);
    mocks.runConfigurationRepositoryMock.create.mockImplementation(async (data: any) =>
      buildMongoConfig({
        ...data,
        id: 'created-config',
      })
    );
  });

  it('filters configurations by workflow + project', async () => {
    mocks.runConfigurationRepositoryMock.findByWorkflowIdAndProjectId.mockResolvedValue([
      buildMongoConfig({
        id: 'cfg-project',
        workflowId: 'workflow-1',
        projectId: 'project-1',
        name: 'Smoke',
      }),
    ]);

    const results = await service.findAllConfigurations('user-1', 'workflow-1', 'project-1');

    expect(mocks.runConfigurationRepositoryMock.findByWorkflowIdAndProjectId).toHaveBeenCalledWith(
      'workflow-1',
      'project-1'
    );
    expect(results).toHaveLength(1);
    expect(results[0].projectId).toBe('project-1');
  });

  it('creates configuration with projectId', async () => {
    await service.createConfiguration(
      'user-1',
      'workflow-1',
      {
        name: 'Smoke',
        target: 'local',
      },
      'project-1'
    );

    expect(mocks.runConfigurationRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'workflow-1',
        projectId: 'project-1',
      })
    );
  });

  it('duplicates configuration preserving projectId', async () => {
    const source = buildMongoConfig({
      id: 'cfg-source',
      workflowId: 'workflow-1',
      projectId: 'project-1',
      name: 'Smoke',
    });
    mocks.runConfigurationRepositoryMock.findById.mockResolvedValue(source);
    mocks.runConfigurationRepositoryMock.create.mockResolvedValue(
      buildMongoConfig({
        id: 'cfg-copy',
        workflowId: 'workflow-1',
        projectId: 'project-1',
        name: 'Smoke (Copy)',
      })
    );

    await service.duplicateConfiguration('user-1', 'cfg-source', 'Smoke (Copy)');

    expect(mocks.runConfigurationRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'workflow-1',
        projectId: 'project-1',
        name: 'Smoke (Copy)',
      })
    );
  });
});
