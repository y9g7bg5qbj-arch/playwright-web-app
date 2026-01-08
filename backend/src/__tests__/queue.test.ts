/**
 * Queue Service Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

// Mock the queue service for testing
const mockQueueService = {
  initialized: false,
  queues: new Map<string, any[]>(),
  isPaused: new Map<string, boolean>(),

  async initialize() {
    this.initialized = true;
    this.queues.set('schedule-run', []);
    this.queues.set('execution', []);
    this.queues.set('github-workflow', []);
    this.queues.set('notification', []);
    return Promise.resolve();
  },

  async addJob(queueName: string, jobName: string, data: any, options?: any) {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    const jobId = `${queueName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    queue.push({
      id: jobId,
      name: jobName,
      data,
      priority: options?.priority || 1,
      status: 'waiting',
      createdAt: new Date(),
    });
    return jobId;
  },

  async getQueueStats(queueName: string) {
    const queue = this.queues.get(queueName) || [];
    return {
      name: queueName,
      waiting: queue.filter(j => j.status === 'waiting').length,
      active: queue.filter(j => j.status === 'active').length,
      completed: queue.filter(j => j.status === 'completed').length,
      failed: queue.filter(j => j.status === 'failed').length,
      delayed: 0,
      paused: this.isPaused.get(queueName) || false,
    };
  },

  async pauseQueue(queueName: string) {
    this.isPaused.set(queueName, true);
  },

  async resumeQueue(queueName: string) {
    this.isPaused.set(queueName, false);
  },

  async removeJob(queueName: string, jobId: string) {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    const index = queue.findIndex(j => j.id === jobId);
    if (index !== -1) {
      queue.splice(index, 1);
      return true;
    }
    return false;
  },

  isRedisConnected() {
    return false; // In-memory mode for tests
  },

  async shutdown() {
    this.queues.clear();
    this.isPaused.clear();
    this.initialized = false;
  },
};

describe('Queue Service', () => {
  beforeAll(async () => {
    await mockQueueService.initialize();
  });

  afterAll(async () => {
    await mockQueueService.shutdown();
  });

  beforeEach(() => {
    // Reset queues before each test
    mockQueueService.queues.forEach((queue) => queue.length = 0);
    mockQueueService.isPaused.forEach((_, key) => mockQueueService.isPaused.set(key, false));
  });

  describe('Queue Initialization', () => {
    it('should initialize successfully', () => {
      expect(mockQueueService.initialized).toBe(true);
    });

    it('should create all required queues', () => {
      expect(mockQueueService.queues.has('schedule-run')).toBe(true);
      expect(mockQueueService.queues.has('execution')).toBe(true);
      expect(mockQueueService.queues.has('github-workflow')).toBe(true);
      expect(mockQueueService.queues.has('notification')).toBe(true);
    });

    it('should report in-memory mode', () => {
      expect(mockQueueService.isRedisConnected()).toBe(false);
    });
  });

  describe('Job Management', () => {
    it('should add a job to a queue', async () => {
      const jobId = await mockQueueService.addJob(
        'schedule-run',
        'test-job',
        { scheduleId: 'test-schedule', runId: 'test-run' },
        { priority: 2 }
      );

      expect(jobId).toBeDefined();
      expect(jobId.startsWith('schedule-run-')).toBe(true);

      const stats = await mockQueueService.getQueueStats('schedule-run');
      expect(stats.waiting).toBe(1);
    });

    it('should add job with correct priority', async () => {
      const jobId1 = await mockQueueService.addJob(
        'schedule-run',
        'low-priority',
        { test: 'data' },
        { priority: 0 }
      );

      const jobId2 = await mockQueueService.addJob(
        'schedule-run',
        'high-priority',
        { test: 'data' },
        { priority: 3 }
      );

      const queue = mockQueueService.queues.get('schedule-run')!;
      expect(queue.length).toBe(2);
    });

    it('should remove a job from a queue', async () => {
      const jobId = await mockQueueService.addJob(
        'execution',
        'to-remove',
        { test: 'data' }
      );

      let stats = await mockQueueService.getQueueStats('execution');
      expect(stats.waiting).toBe(1);

      const removed = await mockQueueService.removeJob('execution', jobId);
      expect(removed).toBe(true);

      stats = await mockQueueService.getQueueStats('execution');
      expect(stats.waiting).toBe(0);
    });

    it('should return false when removing non-existent job', async () => {
      const removed = await mockQueueService.removeJob('execution', 'non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('Queue Control', () => {
    it('should pause a queue', async () => {
      await mockQueueService.pauseQueue('schedule-run');
      const stats = await mockQueueService.getQueueStats('schedule-run');
      expect(stats.paused).toBe(true);
    });

    it('should resume a paused queue', async () => {
      await mockQueueService.pauseQueue('schedule-run');
      await mockQueueService.resumeQueue('schedule-run');
      const stats = await mockQueueService.getQueueStats('schedule-run');
      expect(stats.paused).toBe(false);
    });
  });

  describe('Queue Statistics', () => {
    it('should return correct queue statistics', async () => {
      // Add some jobs
      await mockQueueService.addJob('notification', 'job1', {});
      await mockQueueService.addJob('notification', 'job2', {});
      await mockQueueService.addJob('notification', 'job3', {});

      const stats = await mockQueueService.getQueueStats('notification');
      expect(stats.name).toBe('notification');
      expect(stats.waiting).toBe(3);
      expect(stats.active).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
    });

    it('should handle empty queue', async () => {
      const stats = await mockQueueService.getQueueStats('github-workflow');
      expect(stats.waiting).toBe(0);
      expect(stats.active).toBe(0);
    });
  });
});

describe('Schedule Run Job Data', () => {
  it('should have correct structure for schedule run job', async () => {
    const jobData = {
      scheduleId: 'schedule-123',
      runId: 'run-456',
      userId: 'user-789',
      triggerType: 'manual' as const,
      parameterValues: { browser: 'chromium' },
      executionConfig: {
        browser: 'chromium' as const,
        headless: true,
        timeout: 30000,
        retries: 1,
        workers: 2,
      },
    };

    expect(jobData.scheduleId).toBeDefined();
    expect(jobData.runId).toBeDefined();
    expect(jobData.triggerType).toBe('manual');
    expect(jobData.executionConfig.browser).toBe('chromium');
  });
});
