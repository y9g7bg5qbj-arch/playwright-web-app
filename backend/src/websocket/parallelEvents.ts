/**
 * Parallel Execution WebSocket Events
 *
 * Handles real-time updates for parallel test execution.
 */

import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { testCoordinator } from '../services/execution/coordinator';
import {
  Worker,
  WorkerStatus,
  TestResult,
  ExecutionProgress,
  ShardStatus,
  AggregatedResults,
} from '../services/sharding/types';

/**
 * Client to Server events for parallel execution
 */
export interface ParallelClientToServerEvents {
  // Session management
  'parallel:subscribe': (data: { sessionId: string }) => void;
  'parallel:unsubscribe': (data: { sessionId: string }) => void;

  // Worker management
  'workers:subscribe': () => void;
  'workers:unsubscribe': () => void;
}

/**
 * Server to Client events for parallel execution
 */
export interface ParallelServerToClientEvents {
  // Worker events
  'worker:connected': (data: { worker: WorkerInfo }) => void;
  'worker:disconnected': (data: { workerId: string; reason: string }) => void;
  'worker:status': (data: { workerId: string; status: WorkerStatus }) => void;

  // Test execution events
  'test:started': (data: TestStartedEvent) => void;
  'test:progress': (data: TestProgressEvent) => void;
  'test:completed': (data: TestCompletedEvent) => void;

  // Shard events
  'shard:started': (data: ShardStartedEvent) => void;
  'shard:progress': (data: ShardProgressEvent) => void;
  'shard:completed': (data: ShardCompletedEvent) => void;

  // Session events
  'session:started': (data: SessionStartedEvent) => void;
  'session:progress': (data: SessionProgressEvent) => void;
  'session:completed': (data: SessionCompletedEvent) => void;

  // Rebalance events
  'rebalance:triggered': (data: { sessionId: string; reason: string }) => void;
}

/**
 * Worker info for client display
 */
export interface WorkerInfo {
  id: string;
  name: string;
  type: 'local' | 'docker' | 'remote';
  status: WorkerStatus;
  capabilities: {
    browsers: string[];
    maxConcurrent: number;
  };
  vncUrl?: string;
  currentTests?: string[];
}

/**
 * Test started event
 */
export interface TestStartedEvent {
  sessionId: string;
  testId: string;
  testName: string;
  testPath: string;
  workerId: string;
  workerName: string;
  shardIndex: number;
}

/**
 * Test progress event
 */
export interface TestProgressEvent {
  sessionId: string;
  testId: string;
  step: string;
  screenshot?: string; // base64 encoded
}

/**
 * Test completed event
 */
export interface TestCompletedEvent {
  sessionId: string;
  testId: string;
  result: {
    status: 'passed' | 'failed' | 'skipped' | 'timedOut';
    duration: number;
    error?: string;
    traceUrl?: string;
    screenshots?: string[];
  };
}

/**
 * Shard started event
 */
export interface ShardStartedEvent {
  sessionId: string;
  shardId: string;
  shardIndex: number;
  totalShards: number;
  workerId: string;
  workerName: string;
  testCount: number;
}

/**
 * Shard progress event
 */
export interface ShardProgressEvent {
  sessionId: string;
  shardId: string;
  progress: ExecutionProgress;
  currentTest?: string;
}

/**
 * Shard completed event
 */
export interface ShardCompletedEvent {
  sessionId: string;
  shardId: string;
  results: Array<{
    testId: string;
    testName: string;
    status: 'passed' | 'failed' | 'skipped' | 'timedOut';
    duration: number;
  }>;
  duration: number;
}

/**
 * Session started event
 */
export interface SessionStartedEvent {
  sessionId: string;
  totalTests: number;
  totalShards: number;
  workers: Array<{
    workerId: string;
    workerName: string;
    testCount: number;
  }>;
}

/**
 * Session progress event
 */
export interface SessionProgressEvent {
  sessionId: string;
  progress: ExecutionProgress;
  shards: Array<{
    shardId: string;
    status: string;
    progress: ExecutionProgress;
  }>;
}

/**
 * Session completed event
 */
export interface SessionCompletedEvent {
  sessionId: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  reportUrl?: string;
}

/**
 * Setup parallel execution WebSocket handlers
 */
export function setupParallelWebSocket(
  io: Server<ParallelClientToServerEvents, ParallelServerToClientEvents>
): void {
  // Track session subscriptions
  const sessionSubscriptions = new Map<string, Set<string>>(); // sessionId -> Set<socketId>
  const workerSubscriptions = new Set<string>(); // socketIds subscribed to worker updates

  // Helper to get room name for a session
  const getSessionRoom = (sessionId: string) => `session:${sessionId}`;

  // Setup coordinator event listeners
  setupCoordinatorListeners(io, sessionSubscriptions);

  io.on('connection', (socket: Socket) => {
    logger.info(`Parallel WebSocket connected: ${socket.id}`);

    // Subscribe to session updates
    socket.on('parallel:subscribe', ({ sessionId }) => {
      socket.join(getSessionRoom(sessionId));

      if (!sessionSubscriptions.has(sessionId)) {
        sessionSubscriptions.set(sessionId, new Set());
      }
      sessionSubscriptions.get(sessionId)!.add(socket.id);

      logger.debug(`Socket ${socket.id} subscribed to session ${sessionId}`);

      // Send current session state
      const session = testCoordinator.getSession(sessionId);
      if (session) {
        socket.emit('session:progress', {
          sessionId,
          progress: session.progress,
          shards: Array.from(session.shards.values()).map((s) => ({
            shardId: s.shardId,
            status: s.status,
            progress: s.progress,
          })),
        });
      }
    });

    // Unsubscribe from session updates
    socket.on('parallel:unsubscribe', ({ sessionId }) => {
      socket.leave(getSessionRoom(sessionId));
      sessionSubscriptions.get(sessionId)?.delete(socket.id);
      logger.debug(`Socket ${socket.id} unsubscribed from session ${sessionId}`);
    });

    // Subscribe to worker updates
    socket.on('workers:subscribe', () => {
      socket.join('workers');
      workerSubscriptions.add(socket.id);
      logger.debug(`Socket ${socket.id} subscribed to worker updates`);

      // Send current workers
      const workers = testCoordinator.getWorkers();
      workers.forEach((worker) => {
        socket.emit('worker:connected', {
          worker: formatWorkerInfo(worker),
        });
      });
    });

    // Unsubscribe from worker updates
    socket.on('workers:unsubscribe', () => {
      socket.leave('workers');
      workerSubscriptions.delete(socket.id);
      logger.debug(`Socket ${socket.id} unsubscribed from worker updates`);
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      workerSubscriptions.delete(socket.id);

      // Remove from all session subscriptions
      for (const subscribers of sessionSubscriptions.values()) {
        subscribers.delete(socket.id);
      }

      logger.debug(`Parallel WebSocket disconnected: ${socket.id}`);
    });
  });
}

/**
 * Setup listeners for coordinator events
 */
function setupCoordinatorListeners(
  io: Server<ParallelClientToServerEvents, ParallelServerToClientEvents>,
  sessionSubscriptions: Map<string, Set<string>>
): void {
  // Worker events
  testCoordinator.on('worker:connected', ({ worker }) => {
    io.to('workers').emit('worker:connected', {
      worker: formatWorkerInfo(worker),
    });
  });

  testCoordinator.on('worker:disconnected', ({ workerId, reason }) => {
    io.to('workers').emit('worker:disconnected', { workerId, reason });
  });

  testCoordinator.on('worker:status', ({ workerId, status }) => {
    io.to('workers').emit('worker:status', { workerId, status });
  });

  // Session events
  testCoordinator.on('session:started', ({ sessionId }) => {
    const session = testCoordinator.getSession(sessionId);
    if (!session) return;

    const workers = session.allocations.map((a) => ({
      workerId: a.workerId,
      workerName: testCoordinator.getWorker(a.workerId)?.name ?? a.workerId,
      testCount: a.tests.length,
    }));

    io.to(`session:${sessionId}`).emit('session:started', {
      sessionId,
      totalTests: session.testFiles.length,
      totalShards: session.allocations.length,
      workers,
    });
  });

  testCoordinator.on('session:completed', ({ sessionId, results }) => {
    io.to(`session:${sessionId}`).emit('session:completed', {
      sessionId,
      summary: {
        total: results.progress.total,
        passed: results.progress.passed,
        failed: results.progress.failed,
        skipped: results.progress.skipped,
        duration: results.duration,
      },
      reportUrl: results.reportUrl,
    });

    // Clean up subscriptions
    sessionSubscriptions.delete(sessionId);
  });

  // Shard events
  testCoordinator.on('shard:started', ({ sessionId, shardId, workerId }) => {
    const session = testCoordinator.getSession(sessionId);
    const shard = session?.shards.get(shardId);
    if (!shard) return;

    io.to(`session:${sessionId}`).emit('shard:started', {
      sessionId,
      shardId,
      shardIndex: shard.shardIndex,
      totalShards: shard.totalShards,
      workerId,
      workerName: shard.workerName,
      testCount: shard.progress.total,
    });
  });

  testCoordinator.on('shard:completed', ({ sessionId, shardId, results }) => {
    const session = testCoordinator.getSession(sessionId);
    const shard = session?.shards.get(shardId);
    if (!shard) return;

    const duration = shard.finishedAt && shard.startedAt
      ? shard.finishedAt.getTime() - shard.startedAt.getTime()
      : 0;

    io.to(`session:${sessionId}`).emit('shard:completed', {
      sessionId,
      shardId,
      results: results.map((r) => ({
        testId: r.testId,
        testName: r.testName,
        status: r.status,
        duration: r.duration,
      })),
      duration,
    });
  });

  // Test events
  testCoordinator.on('test:completed', ({ sessionId, result }) => {
    const session = testCoordinator.getSession(sessionId);
    if (!session) return;

    // Emit test completed
    io.to(`session:${sessionId}`).emit('test:completed', {
      sessionId,
      testId: result.testId,
      result: {
        status: result.status,
        duration: result.duration,
        error: result.error,
        traceUrl: result.traceUrl,
        screenshots: result.screenshots,
      },
    });

    // Emit session progress update
    io.to(`session:${sessionId}`).emit('session:progress', {
      sessionId,
      progress: session.progress,
      shards: Array.from(session.shards.values()).map((s) => ({
        shardId: s.shardId,
        status: s.status,
        progress: s.progress,
      })),
    });
  });

  // Rebalance events
  testCoordinator.on('rebalance:triggered', ({ sessionId, reason }) => {
    io.to(`session:${sessionId}`).emit('rebalance:triggered', {
      sessionId,
      reason,
    });
  });
}

/**
 * Format worker for client display
 */
function formatWorkerInfo(worker: Worker): WorkerInfo {
  return {
    id: worker.id,
    name: worker.name,
    type: worker.type,
    status: worker.status,
    capabilities: {
      browsers: worker.capabilities.browsers,
      maxConcurrent: worker.capabilities.maxConcurrent,
    },
    vncUrl: worker.vncPort
      ? `http://${worker.host}:${worker.vncPort}/vnc.html`
      : undefined,
    currentTests: worker.currentTests,
  };
}
