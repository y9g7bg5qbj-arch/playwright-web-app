/**
 * Test Coordinator Service
 *
 * Manages workers, distributes tests, and coordinates parallel execution.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import {
  Worker,
  WorkerCapabilities,
  WorkerStatus,
  TestFile,
  TestAllocation,
  TestResult,
  ExecutionSession,
  ExecutionProgress,
  AggregatedResults,
  ShardStatus,
  ParallelExecutionConfig,
  ShardingStrategy,
} from '../sharding/types';
import { createStrategy } from '../sharding/strategies';

/**
 * Worker registration request
 */
export interface WorkerRegistration {
  id?: string;
  name: string;
  type: 'local' | 'remote';
  host: string;
  port: number;
  capabilities: WorkerCapabilities;
  metadata?: Record<string, any>;
}

/**
 * Coordinator events
 */
export interface CoordinatorEvents {
  'worker:connected': { worker: Worker };
  'worker:disconnected': { workerId: string; reason: string };
  'worker:status': { workerId: string; status: WorkerStatus };
  'session:created': { session: ExecutionSession };
  'session:started': { sessionId: string };
  'session:completed': { sessionId: string; results: AggregatedResults };
  'shard:started': { sessionId: string; shardId: string; workerId: string };
  'shard:progress': { sessionId: string; shardId: string; progress: ExecutionProgress };
  'shard:completed': { sessionId: string; shardId: string; results: TestResult[] };
  'test:started': { sessionId: string; testId: string; workerId: string };
  'test:completed': { sessionId: string; result: TestResult };
  'rebalance:triggered': { sessionId: string; reason: string };
}

/**
 * Test Coordinator
 *
 * Central service for managing parallel test execution.
 */
export class TestCoordinator extends EventEmitter {
  private workers: Map<string, Worker> = new Map();
  private sessions: Map<string, ExecutionSession> = new Map();
  private heartbeatIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly HEARTBEAT_TIMEOUT = 90000; // 90 seconds

  constructor() {
    super();
    this.startHealthMonitor();
  }

  // ==================== Worker Management ====================

  /**
   * Register a new worker
   */
  registerWorker(registration: WorkerRegistration): Worker {
    const workerId = registration.id || `worker-${uuidv4().slice(0, 8)}`;

    const worker: Worker = {
      id: workerId,
      name: registration.name,
      type: registration.type,
      host: registration.host,
      port: registration.port,
      capabilities: registration.capabilities,
      status: 'idle',
      registeredAt: new Date(),
      lastHeartbeat: new Date(),
      metadata: registration.metadata,
    };

    this.workers.set(workerId, worker);
    logger.info(`Worker registered: ${workerId} (${worker.name})`);

    this.emit('worker:connected', { worker });

    return worker;
  }

  /**
   * Unregister a worker
   */
  unregisterWorker(workerId: string, reason: string = 'manual'): boolean {
    const worker = this.workers.get(workerId);
    if (!worker) {
      return false;
    }

    // Stop any heartbeat monitoring
    const interval = this.heartbeatIntervals.get(workerId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(workerId);
    }

    this.workers.delete(workerId);
    logger.info(`Worker unregistered: ${workerId} (reason: ${reason})`);

    this.emit('worker:disconnected', { workerId, reason });

    // Trigger rebalancing for any active sessions using this worker
    this.handleWorkerFailure(workerId);

    return true;
  }

  /**
   * Update worker heartbeat
   */
  workerHeartbeat(workerId: string, status?: WorkerStatus): boolean {
    const worker = this.workers.get(workerId);
    if (!worker) {
      return false;
    }

    worker.lastHeartbeat = new Date();
    if (status) {
      worker.status = status;
      this.emit('worker:status', { workerId, status });
    }

    return true;
  }

  /**
   * Get all registered workers
   */
  getWorkers(): Worker[] {
    return Array.from(this.workers.values());
  }

  /**
   * Get available (idle) workers
   */
  getAvailableWorkers(): Worker[] {
    return this.getWorkers().filter((w) => w.status === 'idle');
  }

  /**
   * Get worker by ID
   */
  getWorker(workerId: string): Worker | undefined {
    return this.workers.get(workerId);
  }

  /**
   * Check health of all workers
   */
  async healthCheck(): Promise<Array<{ workerId: string; status: WorkerStatus; latency?: number }>> {
    const results: Array<{ workerId: string; status: WorkerStatus; latency?: number }> = [];

    for (const worker of this.workers.values()) {
      const start = Date.now();
      try {
        // In production, this would ping the worker's health endpoint
        const isHealthy = await this.pingWorker(worker);
        results.push({
          workerId: worker.id,
          status: isHealthy ? worker.status : 'offline',
          latency: Date.now() - start,
        });
      } catch {
        results.push({
          workerId: worker.id,
          status: 'error',
          latency: Date.now() - start,
        });
      }
    }

    return results;
  }

  /**
   * Ping a worker to check if it's alive
   */
  private async pingWorker(worker: Worker): Promise<boolean> {
    // Check last heartbeat
    if (worker.lastHeartbeat) {
      const elapsed = Date.now() - worker.lastHeartbeat.getTime();
      return elapsed < this.HEARTBEAT_TIMEOUT;
    }
    return false;
  }

  // ==================== Test Distribution ====================

  /**
   * Allocate tests to workers using specified strategy
   */
  allocateTests(
    tests: TestFile[],
    strategy: ShardingStrategy,
    workers?: Worker[]
  ): TestAllocation[] {
    const availableWorkers = workers ?? this.getAvailableWorkers();

    if (availableWorkers.length === 0) {
      throw new Error('No workers available for test allocation');
    }

    // Run the sharding strategy
    const allocations = strategy.distribute(tests, availableWorkers.length);

    // Assign actual worker IDs
    allocations.forEach((allocation, index) => {
      allocation.workerId = availableWorkers[index].id;
    });

    logger.info(`Allocated ${tests.length} tests to ${availableWorkers.length} workers`);

    return allocations;
  }

  /**
   * Rebalance tests after worker failure
   */
  rebalance(sessionId: string): TestAllocation[] | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Get remaining tests (not yet completed)
    const completedTestIds = new Set(session.results.map((r) => r.testId));
    const remainingTests = session.testFiles.filter((t) => !completedTestIds.has(t.id));

    if (remainingTests.length === 0) {
      return null;
    }

    // Get available workers
    const availableWorkers = this.getAvailableWorkers();
    if (availableWorkers.length === 0) {
      logger.warn(`No workers available for rebalancing session ${sessionId}`);
      return null;
    }

    // Create new strategy and reallocate
    const strategy = createStrategy(session.config.sharding.strategy);
    const newAllocations = this.allocateTests(remainingTests, strategy, availableWorkers);

    // Update session
    session.allocations = newAllocations;

    this.emit('rebalance:triggered', { sessionId, reason: 'worker_failure' });

    logger.info(`Rebalanced session ${sessionId}: ${remainingTests.length} tests to ${availableWorkers.length} workers`);

    return newAllocations;
  }

  // ==================== Execution Management ====================

  /**
   * Create a new execution session
   */
  createSession(
    tests: TestFile[],
    config: ParallelExecutionConfig
  ): ExecutionSession {
    const sessionId = `session-${uuidv4().slice(0, 8)}`;

    // Create strategy and allocate tests
    const strategy = createStrategy(config.sharding.strategy);
    const availableWorkers = this.getAvailableWorkers();

    if (availableWorkers.length === 0) {
      throw new Error('No workers available');
    }

    const allocations = this.allocateTests(tests, strategy, availableWorkers);

    // Create shard statuses
    const shards = new Map<string, ShardStatus>();
    allocations.forEach((allocation) => {
      const shardId = `shard-${allocation.shardIndex}`;
      shards.set(shardId, {
        shardId,
        shardIndex: allocation.shardIndex,
        totalShards: allocation.totalShards,
        workerId: allocation.workerId,
        workerName: this.workers.get(allocation.workerId)?.name ?? allocation.workerId,
        status: 'pending',
        progress: {
          total: allocation.tests.length,
          completed: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          running: 0,
          pending: allocation.tests.length,
          percentage: 0,
        },
        results: [],
      });
    });

    const session: ExecutionSession = {
      id: sessionId,
      testFiles: tests,
      allocations,
      config,
      status: 'pending',
      progress: {
        total: tests.length,
        completed: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        running: 0,
        pending: tests.length,
        percentage: 0,
      },
      shards,
      results: [],
      startedAt: new Date(),
    };

    this.sessions.set(sessionId, session);

    // Mark workers as busy
    allocations.forEach((allocation) => {
      const worker = this.workers.get(allocation.workerId);
      if (worker) {
        worker.status = 'busy';
        worker.currentTests = allocation.tests.map((t) => t.id);
      }
    });

    this.emit('session:created', { session });

    logger.info(`Created session ${sessionId} with ${tests.length} tests across ${allocations.length} shards`);

    return session;
  }

  /**
   * Start execution of a session
   */
  startExecution(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.status = 'running';

    // Update shard statuses
    session.shards.forEach((shard) => {
      shard.status = 'running';
      shard.startedAt = new Date();
    });

    this.emit('session:started', { sessionId });

    logger.info(`Started execution of session ${sessionId}`);

    return true;
  }

  /**
   * Report test completion from a worker
   */
  reportTestResult(sessionId: string, result: TestResult): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn(`Session ${sessionId} not found for result reporting`);
      return;
    }

    // Add result to session
    session.results.push(result);

    // Update session progress
    session.progress.completed++;
    session.progress.pending--;

    switch (result.status) {
      case 'passed':
        session.progress.passed++;
        break;
      case 'failed':
        session.progress.failed++;
        break;
      case 'skipped':
        session.progress.skipped++;
        break;
    }

    session.progress.percentage = Math.round(
      (session.progress.completed / session.progress.total) * 100
    );

    // Update shard progress
    const shardId = `shard-${result.shardIndex}`;
    const shard = session.shards.get(shardId);
    if (shard) {
      shard.results.push(result);
      shard.progress.completed++;
      shard.progress.pending--;

      switch (result.status) {
        case 'passed':
          shard.progress.passed++;
          break;
        case 'failed':
          shard.progress.failed++;
          break;
        case 'skipped':
          shard.progress.skipped++;
          break;
      }

      shard.progress.percentage = Math.round(
        (shard.progress.completed / shard.progress.total) * 100
      );

      // Check if shard is complete
      if (shard.progress.completed === shard.progress.total) {
        shard.status = 'completed';
        shard.finishedAt = new Date();
        this.emit('shard:completed', {
          sessionId,
          shardId,
          results: shard.results,
        });

        // Mark worker as idle
        const worker = this.workers.get(shard.workerId);
        if (worker) {
          worker.status = 'idle';
          worker.currentTests = [];
        }
      }
    }

    this.emit('test:completed', { sessionId, result });

    // Check if all shards are complete
    const allComplete = Array.from(session.shards.values()).every(
      (s) => s.status === 'completed' || s.status === 'failed'
    );

    if (allComplete) {
      this.completeSession(sessionId);
    }
  }

  /**
   * Mark session as complete
   */
  private completeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'completed';
    session.finishedAt = new Date();

    const results = this.collectResults(sessionId);
    if (results) {
      this.emit('session:completed', { sessionId, results });
    }

    logger.info(
      `Session ${sessionId} completed: ${session.progress.passed} passed, ${session.progress.failed} failed`
    );
  }

  /**
   * Cancel a running session
   */
  cancelSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.status = 'cancelled';
    session.finishedAt = new Date();

    // Mark workers as idle
    session.allocations.forEach((allocation) => {
      const worker = this.workers.get(allocation.workerId);
      if (worker) {
        worker.status = 'idle';
        worker.currentTests = [];
      }
    });

    logger.info(`Cancelled session ${sessionId}`);

    return true;
  }

  /**
   * Get execution progress
   */
  getProgress(sessionId: string): ExecutionProgress | null {
    const session = this.sessions.get(sessionId);
    return session?.progress ?? null;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): ExecutionSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Collect aggregated results
   */
  collectResults(sessionId: string): AggregatedResults | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const duration = session.finishedAt
      ? session.finishedAt.getTime() - session.startedAt.getTime()
      : Date.now() - session.startedAt.getTime();

    return {
      sessionId,
      status: session.status,
      progress: session.progress,
      shards: Array.from(session.shards.values()),
      duration,
      startedAt: session.startedAt,
      finishedAt: session.finishedAt,
    };
  }

  // ==================== Internal Methods ====================

  /**
   * Handle worker failure
   */
  private handleWorkerFailure(workerId: string): void {
    // Find sessions using this worker
    for (const [sessionId, session] of this.sessions) {
      if (session.status !== 'running') continue;

      const affected = session.allocations.find((a) => a.workerId === workerId);
      if (affected && session.config.sharding.retryOnWorkerFailure) {
        logger.warn(`Worker ${workerId} failed during session ${sessionId}, triggering rebalance`);
        this.rebalance(sessionId);
      }
    }
  }

  /**
   * Start health monitoring for workers
   */
  private startHealthMonitor(): void {
    setInterval(() => {
      const now = Date.now();

      for (const worker of this.workers.values()) {
        if (worker.lastHeartbeat) {
          const elapsed = now - worker.lastHeartbeat.getTime();

          if (elapsed > this.HEARTBEAT_TIMEOUT && worker.status !== 'offline') {
            logger.warn(`Worker ${worker.id} heartbeat timeout`);
            worker.status = 'offline';
            this.emit('worker:status', { workerId: worker.id, status: 'offline' });
            this.handleWorkerFailure(worker.id);
          }
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Cleanup completed sessions older than specified age
   */
  cleanup(maxAgeMs: number = 3600000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      if (session.finishedAt) {
        const age = now - session.finishedAt.getTime();
        if (age > maxAgeMs) {
          this.sessions.delete(sessionId);
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} old sessions`);
    }

    return cleaned;
  }
}

// Singleton instance
export const testCoordinator = new TestCoordinator();
