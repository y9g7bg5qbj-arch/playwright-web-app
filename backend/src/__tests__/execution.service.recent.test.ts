import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  executionRepositoryMock: {
    findRecent: vi.fn(),
    findByMatrixParentIds: vi.fn(),
    countAll: vi.fn(),
  },
  executionStepRepositoryMock: {
    findByExecutionIds: vi.fn(),
  },
  executionLogRepositoryMock: {
    findByExecutionIds: vi.fn(),
  },
  testFlowRepositoryMock: {
    findByWorkflowId: vi.fn(),
  },
  workflowRepositoryMock: {
    findByUserId: vi.fn(),
  },
  projectRepositoryMock: {
    findByApplicationId: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../db/repositories/mongo', () => ({
  executionRepository: mocks.executionRepositoryMock,
  executionStepRepository: mocks.executionStepRepositoryMock,
  executionLogRepository: mocks.executionLogRepositoryMock,
  testFlowRepository: mocks.testFlowRepositoryMock,
  workflowRepository: mocks.workflowRepositoryMock,
  projectRepository: mocks.projectRepositoryMock,
}));

import { ExecutionService } from '../services/execution.service';

describe('ExecutionService.findRecent application scoping', () => {
  const service = new ExecutionService();

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.workflowRepositoryMock.findByUserId.mockResolvedValue([
      { id: 'workflow-app-a', userId: 'user-1', applicationId: 'app-a', name: 'WF A' },
      { id: 'workflow-app-b', userId: 'user-1', applicationId: 'app-b', name: 'WF B' },
    ]);

    mocks.testFlowRepositoryMock.findByWorkflowId.mockImplementation(async (workflowId: string) => {
      if (workflowId === 'workflow-app-a') {
        return [{ id: 'flow-app-a', workflowId, name: 'Flow A' }];
      }
      if (workflowId === 'workflow-app-b') {
        return [{ id: 'flow-app-b', workflowId, name: 'Flow B' }];
      }
      return [];
    });

    mocks.executionRepositoryMock.findRecent.mockResolvedValue([
      {
        id: 'exec-app-a-mapped',
        testFlowId: 'flow-app-a',
        applicationId: 'app-a',
        projectId: 'project-a-1',
        status: 'passed',
        target: 'local',
        triggeredBy: 'manual',
        startedAt: new Date('2026-02-01T10:00:00.000Z'),
        finishedAt: new Date('2026-02-01T10:01:00.000Z'),
      },
      {
        id: 'exec-app-a-legacy',
        testFlowId: 'flow-app-a',
        status: 'failed',
        target: 'local',
        triggeredBy: 'manual',
        startedAt: new Date('2026-02-01T11:00:00.000Z'),
        finishedAt: new Date('2026-02-01T11:01:00.000Z'),
      },
      {
        id: 'exec-app-b',
        testFlowId: 'flow-app-b',
        applicationId: 'app-b',
        projectId: 'project-b-1',
        status: 'passed',
        target: 'local',
        triggeredBy: 'manual',
        startedAt: new Date('2026-02-01T12:00:00.000Z'),
        finishedAt: new Date('2026-02-01T12:01:00.000Z'),
      },
      {
        id: 'exec-app-mismatch',
        testFlowId: 'flow-app-a',
        applicationId: 'app-z',
        status: 'passed',
        target: 'local',
        triggeredBy: 'manual',
        startedAt: new Date('2026-02-01T13:00:00.000Z'),
        finishedAt: new Date('2026-02-01T13:01:00.000Z'),
      },
    ]);

    mocks.executionStepRepositoryMock.findByExecutionIds.mockResolvedValue([]);
    mocks.executionLogRepositoryMock.findByExecutionIds.mockResolvedValue([]);
    mocks.executionRepositoryMock.findByMatrixParentIds.mockResolvedValue([]);
    mocks.executionRepositoryMock.countAll.mockResolvedValue(400);
    mocks.projectRepositoryMock.findByApplicationId.mockResolvedValue([
      { id: 'project-a-1', applicationId: 'app-a', name: 'Alpha Project' },
    ]);
    mocks.projectRepositoryMock.findById.mockResolvedValue(null);
  });

  it('returns only active-application executions when applicationId is provided', async () => {
    const result = await service.findRecent('user-1', 50, 'app-a');
    const resultIds = result.map((row) => row.id);

    expect(resultIds).toContain('exec-app-a-mapped');
    expect(resultIds).toContain('exec-app-a-legacy');
    expect(resultIds).not.toContain('exec-app-b');
    expect(resultIds).not.toContain('exec-app-mismatch');
  });

  it('populates projectName for mapped project rows', async () => {
    const result = await service.findRecent('user-1', 50, 'app-a');
    const mappedRow = result.find((row) => row.id === 'exec-app-a-mapped');

    expect(mappedRow).toBeDefined();
    expect(mappedRow?.projectId).toBe('project-a-1');
    expect(mappedRow?.projectName).toBe('Alpha Project');
  });

  it('labels missing project metadata as Unassigned for scoped legacy rows', async () => {
    const result = await service.findRecent('user-1', 50, 'app-a');
    const legacyRow = result.find((row) => row.id === 'exec-app-a-legacy');

    expect(legacyRow).toBeDefined();
    expect(legacyRow?.applicationId).toBe('app-a');
    expect(legacyRow?.projectId).toBeUndefined();
    expect(legacyRow?.projectName).toBe('Unassigned');
  });
});
