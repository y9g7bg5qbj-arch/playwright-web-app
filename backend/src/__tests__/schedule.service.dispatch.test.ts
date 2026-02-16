import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  scheduleRepositoryMock: {
    findDue: vi.fn(),
    update: vi.fn(),
  },
  scheduleRunRepositoryMock: {
    create: vi.fn(),
  },
  scheduleTestResultRepositoryMock: {
    findByRunId: vi.fn(),
  },
  userRepositoryMock: {
    findById: vi.fn(),
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

import { scheduleService } from '../services/schedule.service';

describe('scheduleService.dispatchDueSchedules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.scheduleRepositoryMock.update.mockResolvedValue({});
    mocks.auditServiceMock.logScheduleAction.mockResolvedValue(undefined);
  });

  it('dispatches due schedules with scheduled trigger and default values', async () => {
    mocks.scheduleRepositoryMock.findDue.mockResolvedValue([
      {
        id: 'schedule-1',
        userId: 'user-1',
        name: 'Nightly',
        cronExpression: '0 9 * * *',
        timezone: 'UTC',
        isActive: true,
        parameters: JSON.stringify([
          { name: 'browser', type: 'choice', label: 'Browser', defaultValue: 'chromium' },
        ]),
        defaultExecutionConfig: JSON.stringify({
          retries: 2,
          workers: 4,
        }),
      },
    ]);

    mocks.scheduleRunRepositoryMock.create.mockResolvedValue({
      id: 'run-1',
      scheduleId: 'schedule-1',
      triggerType: 'scheduled',
      status: 'pending',
      createdAt: new Date(),
    });

    mocks.queueServiceMock.addJob.mockResolvedValue('job-1');

    const result = await scheduleService.dispatchDueSchedules();

    expect(result).toEqual({ dispatched: 1, skipped: 0, failed: 0 });
    expect(mocks.scheduleRunRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: 'schedule-1',
        triggerType: 'scheduled',
        status: 'pending',
        parameterValues: JSON.stringify({ browser: 'chromium' }),
        executionConfig: JSON.stringify({ retries: 2, workers: 4 }),
        triggeredByUser: 'system',
      })
    );
    expect(mocks.queueServiceMock.addJob).toHaveBeenCalledWith(
      'schedule-run',
      'schedule-run-schedule-1',
      expect.objectContaining({
        scheduleId: 'schedule-1',
        runId: 'run-1',
        userId: 'user-1',
        triggerType: 'scheduled',
        parameterValues: { browser: 'chromium' },
      }),
      { priority: 1 }
    );
    expect(mocks.scheduleRepositoryMock.update).toHaveBeenCalledWith(
      'schedule-1',
      expect.objectContaining({
        lastRunAt: expect.any(Date),
      })
    );
    expect(mocks.auditServiceMock.logScheduleAction).toHaveBeenCalledWith(
      'triggered',
      'schedule-1',
      'user-1',
      undefined,
      expect.objectContaining({
        runId: 'run-1',
        triggerType: 'scheduled',
      })
    );
  });

  it('counts failures when dispatching a due schedule fails', async () => {
    mocks.scheduleRepositoryMock.findDue.mockResolvedValue([
      {
        id: 'schedule-2',
        userId: 'user-2',
        name: 'Morning',
        cronExpression: '0 6 * * *',
        timezone: 'UTC',
        isActive: true,
      },
    ]);

    mocks.scheduleRunRepositoryMock.create.mockResolvedValue({
      id: 'run-2',
      scheduleId: 'schedule-2',
      triggerType: 'scheduled',
      status: 'pending',
      createdAt: new Date(),
    });

    mocks.queueServiceMock.addJob.mockRejectedValue(new Error('queue unavailable'));

    const result = await scheduleService.dispatchDueSchedules();

    expect(result).toEqual({ dispatched: 0, skipped: 0, failed: 1 });
    expect(mocks.loggerMock.error).toHaveBeenCalled();
  });
});
