/**
 * Parallel Execution API Routes
 *
 * Endpoints for parallel test execution with Docker sharding support.
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { testCoordinator, WorkerRegistration } from '../services/execution/coordinator';
import { createStrategy, getAvailableStrategies, getStrategyDescription } from '../services/sharding/strategies';
import {
  TestFile,
  WorkerCapabilities,
  ParallelExecutionConfig,
} from '../services/sharding/types';
import {
  ParallelConfig,
  validateParallelConfig,
  mergeWithDefaults,
  defaultParallelConfig,
} from '../config/parallel';

const router = Router();

// ==================== Parallel Execution ====================

/**
 * POST /api/execution/parallel
 * Start a parallel test execution
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { testFiles, testPattern, config } = req.body;

    // Validate configuration
    const validationErrors = validateParallelConfig(config || {});
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: validationErrors,
      });
    }

    // Merge with defaults
    const fullConfig = mergeWithDefaults(config || {});

    // Convert to internal config format
    const parallelConfig: ParallelExecutionConfig = {
      mode: fullConfig.mode,
      workers: {
        local: fullConfig.workers.local,
        docker: fullConfig.workers.docker,
        remote: fullConfig.workers.remote,
      },
      sharding: {
        strategy: fullConfig.sharding.strategy,
        rebalance: fullConfig.sharding.rebalance,
        retryOnWorkerFailure: fullConfig.sharding.retryOnWorkerFailure,
        maxRetries: fullConfig.sharding.maxRetries,
      },
      artifacts: {
        collectTraces: fullConfig.artifacts.collectTraces,
        collectVideos: fullConfig.artifacts.collectVideos,
        collectScreenshots: fullConfig.artifacts.collectScreenshots,
        storageType: fullConfig.artifacts.storageType,
        storagePath: fullConfig.artifacts.storagePath,
      },
      timeout: fullConfig.timeout,
    };

    // Get or create test files
    let tests: TestFile[];
    if (testFiles && Array.isArray(testFiles)) {
      tests = testFiles.map((tf: any, index: number) => ({
        id: tf.id || `test-${uuidv4().slice(0, 8)}`,
        path: tf.path || tf,
        name: tf.name || tf.path || `Test ${index + 1}`,
        estimatedDuration: tf.estimatedDuration,
        lastRunDuration: tf.lastRunDuration,
        lastRunStatus: tf.lastRunStatus,
        tags: tf.tags,
        priority: tf.priority,
      }));
    } else if (testPattern) {
      // In production, this would scan the filesystem
      tests = [
        {
          id: `test-${uuidv4().slice(0, 8)}`,
          path: testPattern,
          name: testPattern,
        },
      ];
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either testFiles or testPattern is required',
      });
    }

    if (tests.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No tests to execute',
      });
    }

    // Check for available workers
    const availableWorkers = testCoordinator.getAvailableWorkers();
    if (availableWorkers.length === 0) {
      return res.status(503).json({
        success: false,
        error: 'No workers available. Start workers first.',
      });
    }

    // Create execution session
    const session = testCoordinator.createSession(tests, parallelConfig);

    // Start execution
    testCoordinator.startExecution(session.id);

    logger.info(`Started parallel execution: ${session.id}`);

    res.status(201).json({
      success: true,
      sessionId: session.id,
      totalTests: tests.length,
      shards: session.allocations.map((a) => ({
        shardIndex: a.shardIndex,
        workerId: a.workerId,
        testCount: a.tests.length,
        estimatedDuration: a.estimatedDuration,
      })),
      message: `Started execution with ${session.allocations.length} shards`,
    });
  } catch (error: any) {
    logger.error('Failed to start parallel execution:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/execution/parallel/:sessionId/status
 * Get execution progress
 */
router.get('/:sessionId/status', (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const session = testCoordinator.getSession(sessionId);
  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found',
    });
  }

  const results = testCoordinator.collectResults(sessionId);

  res.json({
    success: true,
    sessionId,
    status: session.status,
    progress: session.progress,
    duration: results?.duration || Date.now() - session.startedAt.getTime(),
    shards: Array.from(session.shards.values()).map((shard) => ({
      shardId: shard.shardId,
      shardIndex: shard.shardIndex,
      workerId: shard.workerId,
      workerName: shard.workerName,
      status: shard.status,
      progress: shard.progress,
      currentTest: shard.currentTest,
      results: shard.results.map((r) => ({
        testId: r.testId,
        testName: r.testName,
        status: r.status,
        duration: r.duration,
        error: r.error,
      })),
    })),
  });
});

/**
 * POST /api/execution/parallel/:sessionId/cancel
 * Cancel a running execution
 */
router.post('/:sessionId/cancel', (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const cancelled = testCoordinator.cancelSession(sessionId);

  if (!cancelled) {
    return res.status(404).json({
      success: false,
      error: 'Session not found or already completed',
    });
  }

  logger.info(`Cancelled parallel execution: ${sessionId}`);

  res.json({
    success: true,
    message: 'Execution cancelled',
  });
});

/**
 * GET /api/execution/parallel/:sessionId/results
 * Get aggregated results
 */
router.get('/:sessionId/results', (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const results = testCoordinator.collectResults(sessionId);

  if (!results) {
    return res.status(404).json({
      success: false,
      error: 'Session not found',
    });
  }

  res.json({
    success: true,
    ...results,
  });
});

// ==================== Worker Management ====================

/**
 * GET /api/workers
 * List all registered workers
 */
router.get('/workers', (req: Request, res: Response) => {
  const workers = testCoordinator.getWorkers();

  res.json({
    success: true,
    workers: workers.map((w) => ({
      id: w.id,
      name: w.name,
      type: w.type,
      host: w.host,
      port: w.port,
      status: w.status,
      capabilities: w.capabilities,
      vncUrl: w.vncPort ? `http://${w.host}:${w.vncPort}/vnc.html` : undefined,
      currentTests: w.currentTests,
      registeredAt: w.registeredAt,
      lastHeartbeat: w.lastHeartbeat,
    })),
  });
});

/**
 * POST /api/workers/register
 * Register a new worker
 */
router.post('/workers/register', (req: Request, res: Response) => {
  try {
    const registration: WorkerRegistration = req.body;

    // Validate required fields
    if (!registration.name) {
      return res.status(400).json({
        success: false,
        error: 'Worker name is required',
      });
    }

    if (!registration.capabilities) {
      return res.status(400).json({
        success: false,
        error: 'Worker capabilities are required',
      });
    }

    const worker = testCoordinator.registerWorker(registration);

    logger.info(`Registered worker: ${worker.id}`);

    res.status(201).json({
      success: true,
      worker: {
        id: worker.id,
        name: worker.name,
        type: worker.type,
        status: worker.status,
      },
    });
  } catch (error: any) {
    logger.error('Failed to register worker:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/workers/:id/heartbeat
 * Update worker heartbeat
 */
router.post('/workers/:id/heartbeat', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const updated = testCoordinator.workerHeartbeat(id, status);

  if (!updated) {
    return res.status(404).json({
      success: false,
      error: 'Worker not found',
    });
  }

  res.json({
    success: true,
  });
});

/**
 * POST /api/workers/:id/unregister
 * Unregister a worker
 */
router.post('/workers/:id/unregister', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  const unregistered = testCoordinator.unregisterWorker(id, reason || 'manual');

  if (!unregistered) {
    return res.status(404).json({
      success: false,
      error: 'Worker not found',
    });
  }

  logger.info(`Unregistered worker: ${id}`);

  res.json({
    success: true,
  });
});

/**
 * POST /api/workers/:id/result
 * Report test result from worker
 */
router.post('/workers/:id/result', (req: Request, res: Response) => {
  const { id } = req.params;
  const result = req.body;

  // Find the session for this result
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: 'Session ID is required',
    });
  }

  testCoordinator.reportTestResult(sessionId, result);

  res.json({
    success: true,
  });
});

/**
 * GET /api/workers/health
 * Health check all workers
 */
router.get('/workers/health', async (req: Request, res: Response) => {
  const health = await testCoordinator.healthCheck();

  res.json({
    success: true,
    workers: health,
  });
});

/**
 * POST /api/workers/rebalance
 * Trigger rebalancing for active sessions
 */
router.post('/workers/rebalance', (req: Request, res: Response) => {
  const { reason } = req.body;

  // Get all running sessions
  const workers = testCoordinator.getWorkers();

  logger.info(`Rebalance triggered: ${reason || 'manual'}`);

  res.json({
    success: true,
    message: 'Rebalance triggered',
    activeWorkers: workers.length,
  });
});

// ==================== Configuration ====================

/**
 * GET /api/execution/parallel/config/default
 * Get default configuration
 */
router.get('/config/default', (req: Request, res: Response) => {
  res.json({
    success: true,
    config: defaultParallelConfig,
  });
});

/**
 * POST /api/execution/parallel/config/validate
 * Validate configuration
 */
router.post('/config/validate', (req: Request, res: Response) => {
  const config = req.body;

  const errors = validateParallelConfig(config);

  res.json({
    success: errors.length === 0,
    errors,
    config: errors.length === 0 ? mergeWithDefaults(config) : undefined,
  });
});

// ==================== Strategies ====================

/**
 * GET /api/execution/parallel/strategies
 * List available sharding strategies
 */
router.get('/strategies', (req: Request, res: Response) => {
  const strategies = getAvailableStrategies();

  res.json({
    success: true,
    strategies: strategies.map((type) => ({
      type,
      description: getStrategyDescription(type),
    })),
  });
});

/**
 * POST /api/execution/parallel/strategies/preview
 * Preview test distribution with a strategy
 */
router.post('/strategies/preview', (req: Request, res: Response) => {
  try {
    const { testFiles, strategy, workerCount } = req.body;

    if (!testFiles || !Array.isArray(testFiles) || testFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'testFiles array is required',
      });
    }

    if (!strategy) {
      return res.status(400).json({
        success: false,
        error: 'strategy is required',
      });
    }

    const count = workerCount || testCoordinator.getAvailableWorkers().length || 2;

    // Create test files
    const tests: TestFile[] = testFiles.map((tf: any, index: number) => ({
      id: tf.id || `test-${index + 1}`,
      path: tf.path || tf,
      name: tf.name || tf.path || `Test ${index + 1}`,
      estimatedDuration: tf.estimatedDuration,
      lastRunDuration: tf.lastRunDuration,
      lastRunStatus: tf.lastRunStatus,
      tags: tf.tags,
      priority: tf.priority,
    }));

    // Create strategy and preview distribution
    const shardingStrategy = createStrategy(strategy);
    const allocations = shardingStrategy.distribute(tests, count);

    res.json({
      success: true,
      strategy: shardingStrategy.name,
      workerCount: count,
      allocations: allocations.map((a) => ({
        shardIndex: a.shardIndex,
        testCount: a.tests.length,
        estimatedDuration: a.estimatedDuration,
        tests: a.tests.map((t) => ({
          id: t.id,
          path: t.path,
          name: t.name,
        })),
      })),
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
