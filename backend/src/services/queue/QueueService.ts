/**
 * Queue Service
 * BullMQ-based job queue for scheduled test executions
 * Falls back to in-memory queue when Redis is not available
 */

import { EventEmitter } from 'events';
import net from 'net';
import { logger } from '../../utils/logger';
import { auditService } from '../audit.service';
import { notificationService, NotificationConfig, ScheduleRunInfo } from '../notification.service';
import type {
  QueueJob,
  QueueStats,
  ScheduleRunJobData,
  ExecutionJobData,
  GitHubWorkflowJobData,
  QueueName,
  JobStatus,
  JobPriority,
  QueueWorkerOptions,
} from './types';
import { QUEUE_NAMES } from './types';

// BullMQ imports - will be dynamically loaded
let Queue: any;
let Worker: any;
let QueueEvents: any;

interface RedisOptions {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest: null;
}

class QueueService extends EventEmitter {
  private queues: Map<string, any> = new Map();
  private workers: Map<string, any> = new Map();
  private queueEvents: Map<string, any> = new Map();
  private redisConnection: RedisOptions | null = null;
  private isRedisAvailable: boolean = false;
  private inMemoryQueues: Map<string, QueueJob[]> = new Map();
  private inMemoryWorkers: Map<string, NodeJS.Timeout> = new Map();
  private isPaused: Map<string, boolean> = new Map();
  private initialized: boolean = false;

  constructor() {
    super();
  }

  private async canConnectToRedis(options: RedisOptions): Promise<boolean> {
    return await new Promise<boolean>((resolve) => {
      const socket = new net.Socket();

      const finalize = (result: boolean) => {
        socket.removeAllListeners();
        if (!socket.destroyed) {
          socket.destroy();
        }
        resolve(result);
      };

      socket.setTimeout(800);
      socket.once('connect', () => finalize(true));
      socket.once('timeout', () => finalize(false));
      socket.once('error', () => finalize(false));

      socket.connect(options.port, options.host);
    });
  }

  /**
   * Initialize the queue service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.info('Initializing Queue Service...');

    // Try to load BullMQ and connect to Redis
    try {
      const bullmq = await import('bullmq');
      Queue = bullmq.Queue;
      Worker = bullmq.Worker;
      QueueEvents = bullmq.QueueEvents;

      // Configure Redis connection
      this.redisConnection = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
      };

      const redisReachable = await this.canConnectToRedis(this.redisConnection);
      if (!redisReachable) {
        throw new Error('Redis is not reachable');
      }

      this.isRedisAvailable = true;
      logger.info('Redis connection established - using BullMQ');
    } catch (error) {
      logger.warn('Redis not available - using in-memory queue fallback');
      this.isRedisAvailable = false;
    }

    // Initialize all queues
    for (const queueName of Object.values(QUEUE_NAMES)) {
      await this.createQueue(queueName);
      this.isPaused.set(queueName, false);
    }

    this.initialized = true;
    logger.info('Queue Service initialized');
  }

  /**
   * Create a queue
   */
  private async createQueue(name: string): Promise<void> {
    if (this.isRedisAvailable && Queue) {
      const queue = new Queue(name, {
        connection: this.redisConnection!,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 5000 },
        },
      });

      this.queues.set(name, queue);
      logger.debug(`BullMQ queue created: ${name}`);
    } else {
      // In-memory fallback
      this.inMemoryQueues.set(name, []);
      logger.debug(`In-memory queue created: ${name}`);
    }
  }

  /**
   * Start a worker for a queue
   */
  async startWorker(
    name: QueueName,
    processor: (job: QueueJob) => Promise<void>,
    options: QueueWorkerOptions = {}
  ): Promise<void> {
    const { concurrency = 5 } = options;

    if (this.isRedisAvailable && Worker) {
      const worker = new Worker(
        name,
        async (job: any) => {
          const queueJob: QueueJob = {
            id: job.id,
            name: job.name,
            data: job.data,
            priority: job.opts?.priority || 1,
            status: 'active',
            attempts: job.attemptsMade,
            maxAttempts: job.opts?.attempts || 3,
            progress: 0,
            createdAt: new Date(job.timestamp),
          };

          await processor(queueJob);
        },
        {
          connection: this.redisConnection!,
          concurrency,
          limiter: options.limiter,
        }
      );

      // Set up event handlers
      worker.on('completed', (job: any) => {
        logger.info(`Job ${job.id} completed in queue ${name}`);
        this.emit('job:completed', { queue: name, jobId: job.id });
      });

      worker.on('failed', (job: any, err: Error) => {
        logger.error(`Job ${job?.id} failed in queue ${name}:`, err);
        this.emit('job:failed', { queue: name, jobId: job?.id, error: err.message });
      });

      worker.on('progress', (job: any, progress: number) => {
        this.emit('job:progress', { queue: name, jobId: job.id, progress });
      });

      this.workers.set(name, worker);

      // Set up queue events for real-time updates
      const queueEvents = new QueueEvents(name, { connection: this.redisConnection! });
      this.queueEvents.set(name, queueEvents);

      logger.info(`BullMQ worker started for queue: ${name} (concurrency: ${concurrency})`);
    } else {
      // In-memory worker fallback
      const interval = setInterval(async () => {
        if (this.isPaused.get(name)) return;

        const queue = this.inMemoryQueues.get(name);
        if (!queue || queue.length === 0) return;

        // Process up to 'concurrency' jobs
        const jobsToProcess = queue.splice(0, concurrency).filter(j => j.status === 'waiting');

        for (const job of jobsToProcess) {
          try {
            job.status = 'active';
            job.processedAt = new Date();
            await processor(job);
            job.status = 'completed';
            job.finishedAt = new Date();
            this.emit('job:completed', { queue: name, jobId: job.id });
          } catch (error: any) {
            job.attempts++;
            if (job.attempts >= job.maxAttempts) {
              job.status = 'failed';
              job.failedReason = error.message;
              job.finishedAt = new Date();
              this.emit('job:failed', { queue: name, jobId: job.id, error: error.message });
            } else {
              job.status = 'waiting';
              queue.push(job);
            }
          }
        }
      }, 1000);

      this.inMemoryWorkers.set(name, interval);
      logger.info(`In-memory worker started for queue: ${name}`);
    }
  }

  /**
   * Add a job to a queue
   */
  async addJob<T>(
    queueName: QueueName,
    jobName: string,
    data: T,
    options: { priority?: JobPriority; delay?: number } = {}
  ): Promise<string> {
    const { priority = 1, delay = 0 } = options;

    if (this.isRedisAvailable) {
      const queue = this.queues.get(queueName);
      if (!queue) throw new Error(`Queue ${queueName} not found`);

      const job = await queue.add(jobName, data, {
        priority,
        delay,
      });

      logger.debug(`Job ${job.id} added to queue ${queueName}`);
      this.emit('job:added', { queue: queueName, jobId: job.id, jobName });

      return job.id;
    } else {
      // In-memory fallback
      const queue = this.inMemoryQueues.get(queueName);
      if (!queue) throw new Error(`Queue ${queueName} not found`);

      const jobId = `${queueName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const job: QueueJob<T> = {
        id: jobId,
        name: jobName,
        data,
        priority,
        status: delay > 0 ? 'delayed' : 'waiting',
        attempts: 0,
        maxAttempts: 3,
        progress: 0,
        createdAt: new Date(),
      };

      if (delay > 0) {
        setTimeout(() => {
          job.status = 'waiting';
        }, delay);
      }

      // Insert based on priority (higher priority = earlier in queue)
      const insertIndex = queue.findIndex(j => j.priority < priority);
      if (insertIndex === -1) {
        queue.push(job as QueueJob);
      } else {
        queue.splice(insertIndex, 0, job as QueueJob);
      }

      logger.debug(`Job ${jobId} added to in-memory queue ${queueName}`);
      this.emit('job:added', { queue: queueName, jobId, jobName });

      return jobId;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: QueueName): Promise<QueueStats> {
    if (this.isRedisAvailable) {
      const queue = this.queues.get(queueName);
      if (!queue) throw new Error(`Queue ${queueName} not found`);

      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      const isPaused = await queue.isPaused();

      return {
        name: queueName,
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused: isPaused,
      };
    } else {
      const queue = this.inMemoryQueues.get(queueName) || [];
      const jobs = queue;

      return {
        name: queueName,
        waiting: jobs.filter(j => j.status === 'waiting').length,
        active: jobs.filter(j => j.status === 'active').length,
        completed: jobs.filter(j => j.status === 'completed').length,
        failed: jobs.filter(j => j.status === 'failed').length,
        delayed: jobs.filter(j => j.status === 'delayed').length,
        paused: this.isPaused.get(queueName) || false,
      };
    }
  }

  /**
   * Get all queue statistics
   */
  async getAllQueueStats(): Promise<QueueStats[]> {
    const stats: QueueStats[] = [];
    for (const queueName of Object.values(QUEUE_NAMES)) {
      stats.push(await this.getQueueStats(queueName as QueueName));
    }
    return stats;
  }

  /**
   * Get jobs from a queue
   */
  async getJobs(
    queueName: QueueName,
    status: JobStatus | JobStatus[],
    start: number = 0,
    end: number = 20
  ): Promise<QueueJob[]> {
    const statuses = Array.isArray(status) ? status : [status];

    if (this.isRedisAvailable) {
      const queue = this.queues.get(queueName);
      if (!queue) throw new Error(`Queue ${queueName} not found`);

      const jobs = await queue.getJobs(statuses, start, end);
      return jobs.map((job: any) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        priority: job.opts?.priority || 1,
        status: this.mapBullMQStatus(job),
        attempts: job.attemptsMade,
        maxAttempts: job.opts?.attempts || 3,
        progress: job.progress || 0,
        createdAt: new Date(job.timestamp),
        processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
        finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
        failedReason: job.failedReason,
      }));
    } else {
      const queue = this.inMemoryQueues.get(queueName) || [];
      return queue
        .filter(j => statuses.includes(j.status))
        .slice(start, end);
    }
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: QueueName): Promise<void> {
    if (this.isRedisAvailable) {
      const queue = this.queues.get(queueName);
      if (queue) await queue.pause();
    }
    this.isPaused.set(queueName, true);
    logger.info(`Queue ${queueName} paused`);
    this.emit('queue:paused', { queue: queueName });
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: QueueName): Promise<void> {
    if (this.isRedisAvailable) {
      const queue = this.queues.get(queueName);
      if (queue) await queue.resume();
    }
    this.isPaused.set(queueName, false);
    logger.info(`Queue ${queueName} resumed`);
    this.emit('queue:resumed', { queue: queueName });
  }

  /**
   * Remove a job from queue
   */
  async removeJob(queueName: QueueName, jobId: string): Promise<boolean> {
    if (this.isRedisAvailable) {
      const queue = this.queues.get(queueName);
      if (!queue) return false;

      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        return true;
      }
      return false;
    } else {
      const queue = this.inMemoryQueues.get(queueName);
      if (!queue) return false;

      const index = queue.findIndex(j => j.id === jobId);
      if (index !== -1) {
        queue.splice(index, 1);
        return true;
      }
      return false;
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(queueName: QueueName, jobId: string): Promise<boolean> {
    if (this.isRedisAvailable) {
      const queue = this.queues.get(queueName);
      if (!queue) return false;

      const job = await queue.getJob(jobId);
      if (job) {
        await job.retry();
        return true;
      }
      return false;
    } else {
      const queue = this.inMemoryQueues.get(queueName);
      if (!queue) return false;

      const job = queue.find(j => j.id === jobId);
      if (job && job.status === 'failed') {
        job.status = 'waiting';
        job.attempts = 0;
        job.failedReason = undefined;
        return true;
      }
      return false;
    }
  }

  /**
   * Clean completed/failed jobs
   */
  async cleanQueue(
    queueName: QueueName,
    grace: number = 3600000, // 1 hour
    status: 'completed' | 'failed' = 'completed'
  ): Promise<number> {
    if (this.isRedisAvailable) {
      const queue = this.queues.get(queueName);
      if (!queue) return 0;

      const jobs = await queue.clean(grace, 1000, status);
      return jobs.length;
    } else {
      const queue = this.inMemoryQueues.get(queueName);
      if (!queue) return 0;

      const cutoff = Date.now() - grace;
      const initialLength = queue.length;
      const filtered = queue.filter(j => {
        if (j.status !== status) return true;
        if (!j.finishedAt) return true;
        return j.finishedAt.getTime() > cutoff;
      });

      this.inMemoryQueues.set(queueName, filtered);
      return initialLength - filtered.length;
    }
  }

  /**
   * Map BullMQ job state to our JobStatus
   */
  private mapBullMQStatus(job: any): JobStatus {
    if (job.finishedOn && job.failedReason) return 'failed';
    if (job.finishedOn) return 'completed';
    if (job.processedOn) return 'active';
    if (job.delay && job.delay > 0) return 'delayed';
    return 'waiting';
  }

  /**
   * Gracefully shutdown the queue service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Queue Service...');

    // Close BullMQ workers and queues
    for (const [name, worker] of this.workers) {
      await worker.close();
      logger.debug(`Worker ${name} closed`);
    }

    for (const [name, queueEvents] of this.queueEvents) {
      await queueEvents.close();
    }

    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.debug(`Queue ${name} closed`);
    }

    // Clear in-memory workers
    for (const [name, interval] of this.inMemoryWorkers) {
      clearInterval(interval);
    }

    this.workers.clear();
    this.queues.clear();
    this.queueEvents.clear();
    this.inMemoryQueues.clear();
    this.inMemoryWorkers.clear();
    this.initialized = false;

    logger.info('Queue Service shutdown complete');
  }

  /**
   * Check if Redis is available
   */
  isRedisConnected(): boolean {
    return this.isRedisAvailable;
  }
}

export const queueService = new QueueService();
export default queueService;
