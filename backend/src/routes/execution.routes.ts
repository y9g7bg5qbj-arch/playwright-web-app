import { Router } from 'express';
import { body, param } from 'express-validator';
import { ExecutionService } from '../services/execution.service';
import { PlaywrightService } from '../services/playwright.service';
import { TestFlowService } from '../services/testFlow.service';
import { FlowExecutor, parseFlow } from '../executor';
import { validate } from '../middleware/validate';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { ExecutionConfig, DEFAULT_EXECUTION_CONFIG } from '@playwright-web-app/shared';
import path from 'path';
import fs from 'fs/promises';

// Docker traces directory (relative to project root)
// __dirname is backend/src/routes, so go up 3 levels to reach project root
const DOCKER_TRACES_DIR = path.join(__dirname, '../../../docker/worker-vnc/traces');

const router = Router();
const executionService = new ExecutionService();
const playwrightService = new PlaywrightService();
const testFlowService = new TestFlowService();

// CORS preflight handler for trace files (required for trace.playwright.dev embedding)
router.options('/:id/trace', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Origin, Accept');
  res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  res.status(204).end();
});

// Helper function to find trace file
const findTraceFile = async (baseDir: string): Promise<string | null> => {
  const findTrace = async (dir: string): Promise<string | null> => {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = await findTrace(fullPath);
          if (found) return found;
        } else if (entry.name === 'trace.zip' || entry.name.endsWith('.zip')) {
          return fullPath;
        }
      }
    } catch {
      // Directory might not exist
    }
    return null;
  };
  return findTrace(baseDir);
};

// HEAD: Check if trace file exists (for quick availability check)
router.head(
  '/:id/trace',
  validate([param('id').isString().withMessage('Invalid execution ID')]),
  async (req, res, next) => {
    try {
      const storagePath = playwrightService.getStoragePath();
      const traceDir = path.join(storagePath, req.params.id, 'trace');
      const testResultsDir = path.join(storagePath, req.params.id, 'test-results');

      let tracePath = await findTraceFile(traceDir);
      if (!tracePath) {
        tracePath = await findTraceFile(testResultsDir);
      }

      if (!tracePath) {
        return res.status(404).end();
      }

      // Get file stats for Content-Length
      const stats = await fs.stat(tracePath);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(200).end();
    } catch (error) {
      next(error);
    }
  }
);

// PUBLIC: Serve trace file for an execution (no auth required for trace.playwright.dev embedding)
router.get(
  '/:id/trace',
  validate([param('id').isString().withMessage('Invalid execution ID')]),
  async (req, res, next) => {
    try {
      // Get trace file path from PlaywrightService
      const storagePath = playwrightService.getStoragePath();
      const traceDir = path.join(storagePath, req.params.id, 'trace');
      const testResultsDir = path.join(storagePath, req.params.id, 'test-results');

      console.log('[TRACE] Looking for trace in:', traceDir);

      // Find trace.zip using shared helper
      let tracePath = await findTraceFile(traceDir);
      if (!tracePath) {
        tracePath = await findTraceFile(testResultsDir);
      }
      if (tracePath) {
        console.log('[TRACE] Found trace file:', tracePath);
      }

      if (!tracePath) {
        console.log('[TRACE] Trace file not found for:', req.params.id);
        return res.status(404).json({
          success: false,
          error: 'Trace file not found',
        });
      }

      // Ensure absolute path
      const absoluteTracePath = path.resolve(tracePath);
      console.log('[TRACE] Serving trace file:', absoluteTracePath);

      // Send the trace file with CORS headers for trace.playwright.dev embedding
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `inline; filename="trace-${req.params.id}.zip"`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      res.sendFile(absoluteTracePath, (err) => {
        if (err) {
          console.error('[TRACE] Error sending file:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to send trace file' });
          }
        } else {
          console.log('[TRACE] Successfully sent trace file');
        }
      });
    } catch (error) {
      console.error('[TRACE] Error in trace route:', error);
      next(error);
    }
  }
);

// PUBLIC: Launch local Playwright trace viewer for an execution
router.post(
  '/:id/trace/view',
  validate([param('id').isString().withMessage('Invalid execution ID')]),
  async (req, res, next) => {
    try {
      const storagePath = playwrightService.getStoragePath();
      const traceDir = path.join(storagePath, req.params.id, 'trace');

      // Find trace.zip
      const findTrace = async (dir: string): Promise<string | null> => {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              const found = await findTrace(fullPath);
              if (found) return found;
            } else if (entry.name === 'trace.zip' || entry.name.endsWith('.zip')) {
              return fullPath;
            }
          }
        } catch {
          // Directory might not exist
        }
        return null;
      };

      const testResultsDir = path.join(storagePath, req.params.id, 'test-results');
      let tracePath = await findTrace(traceDir);
      if (!tracePath) {
        tracePath = await findTrace(testResultsDir);
      }

      if (!tracePath) {
        return res.status(404).json({
          success: false,
          error: 'Trace file not found',
        });
      }

      // Launch Playwright trace viewer (opens in dedicated browser window)
      const { spawn } = require('child_process');
      const absoluteTracePath = path.resolve(tracePath);
      console.log('[TRACE] Opening trace viewer for:', absoluteTracePath);

      // Just spawn the trace viewer - it opens in its own browser window
      const traceProcess = spawn('npx', ['playwright', 'show-trace', absoluteTracePath], {
        detached: true,
        stdio: 'ignore',
      });
      traceProcess.unref();

      res.json({
        success: true,
        message: 'Trace viewer opened',
        tracePath: absoluteTracePath,
      });
    } catch (error) {
      console.error('[TRACE] Error launching trace viewer:', error);
      next(error);
    }
  }
);
// PUBLIC: List all Docker executions with traces
router.get('/docker/list', async (req, res, next) => {
  try {
    const executions: Array<{
      id: string;
      name: string;
      shard: string;
      status: 'passed' | 'failed';
      traceUrl: string;
      timestamp: string;
    }> = [];

    // Check both shard directories
    const shards = ['shard1', 'shard2'];

    for (const shard of shards) {
      const shardDir = path.join(DOCKER_TRACES_DIR, shard);
      try {
        const entries = await fs.readdir(shardDir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory()) {
            // Check if trace.zip exists in this directory
            const traceZipPath = path.join(shardDir, entry.name, 'trace.zip');
            try {
              await fs.access(traceZipPath);

              // Parse test name from directory name
              const dirName = entry.name;
              const hasFailed = dirName.includes('retry') || dirName.includes('failed');

              // Get file stats for timestamp
              const stats = await fs.stat(traceZipPath);

              executions.push({
                id: `docker-${shard}-${dirName}`,
                name: dirName.replace(/-chromium.*$/, '').replace(/-/g, ' '),
                shard: shard,
                status: hasFailed ? 'failed' : 'passed',
                traceUrl: `/api/executions/docker/trace/${shard}/${encodeURIComponent(entry.name)}`,
                timestamp: stats.mtime.toISOString(),
              });
            } catch {
              // No trace.zip in this directory
            }
          }
        }
      } catch {
        // Shard directory doesn't exist
      }
    }

    // Sort by timestamp, newest first
    executions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      success: true,
      data: executions,
    });
  } catch (error) {
    console.error('[DOCKER-TRACES] Error listing executions:', error);
    next(error);
  }
});

// CORS preflight for Docker traces
router.options('/docker/trace/:shard/:testDir', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Origin, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(204).end();
});

// PUBLIC: Serve trace file from Docker execution
router.get('/docker/trace/:shard/:testDir', async (req, res, next) => {
  try {
    const { shard, testDir } = req.params;
    const tracePath = path.join(DOCKER_TRACES_DIR, shard, decodeURIComponent(testDir), 'trace.zip');

    console.log('[DOCKER-TRACE] Looking for trace at:', tracePath);

    // Verify file exists
    try {
      await fs.access(tracePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Trace file not found',
      });
    }

    const absolutePath = path.resolve(tracePath);
    console.log('[DOCKER-TRACE] Serving:', absolutePath);

    // Send with CORS headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `inline; filename="trace-${shard}-${testDir}.zip"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    res.sendFile(absolutePath, (err) => {
      if (err) {
        console.error('[DOCKER-TRACE] Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to send trace file' });
        }
      }
    });
  } catch (error) {
    console.error('[DOCKER-TRACE] Error:', error);
    next(error);
  }
});

// PUBLIC: Open Docker trace in local viewer
router.post('/docker/trace/:shard/:testDir/view', async (req, res, next) => {
  try {
    const { shard, testDir } = req.params;
    const tracePath = path.join(DOCKER_TRACES_DIR, shard, decodeURIComponent(testDir), 'trace.zip');

    // Verify file exists
    try {
      await fs.access(tracePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Trace file not found',
      });
    }

    const absolutePath = path.resolve(tracePath);
    console.log('[DOCKER-TRACE] Opening local viewer for:', absolutePath);

    // Launch Playwright trace viewer
    const { spawn } = require('child_process');
    const traceProcess = spawn('npx', ['playwright', 'show-trace', absolutePath], {
      detached: true,
      stdio: 'ignore',
    });
    traceProcess.unref();

    res.json({
      success: true,
      message: 'Trace viewer opened',
      tracePath: absolutePath,
    });
  } catch (error) {
    console.error('[DOCKER-TRACE] Error launching viewer:', error);
    next(error);
  }
});

router.use(authenticateToken);

// Get all executions for a test flow
router.get(
  '/test-flow/:testFlowId',
  validate([param('testFlowId').isUUID().withMessage('Invalid test flow ID')]),
  async (req: AuthRequest, res, next) => {
    try {
      const executions = await executionService.findAll(req.userId!, req.params.testFlowId);
      res.json({
        success: true,
        data: executions,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create execution
router.post(
  '/test-flow/:testFlowId',
  validate([
    param('testFlowId').isUUID().withMessage('Invalid test flow ID'),
    body('target').isIn(['local', 'remote']).withMessage('Invalid target'),
    body('agentId').optional().isUUID().withMessage('Invalid agent ID'),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const execution = await executionService.create(
        req.userId!,
        req.params.testFlowId,
        req.body
      );
      res.status(201).json({
        success: true,
        data: execution,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Execute a flow with the new flow executor
// POST /api/executions/flows/:flowId/execute
router.post(
  '/flows/:flowId/execute',
  validate([
    param('flowId').isUUID().withMessage('Invalid flow ID'),
    body('config').optional().isObject().withMessage('Config must be an object'),
    body('variables').optional().isObject().withMessage('Variables must be an object'),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      // Get the test flow
      const testFlow = await testFlowService.findOne(req.userId!, req.params.flowId);

      // Parse the flow
      const parsedFlow = parseFlow(testFlow);

      // Create execution config
      const config: ExecutionConfig = {
        flowId: testFlow.id,
        browser: req.body.config?.browser || 'chromium',
        headless: req.body.config?.headless ?? false,
        viewport: req.body.config?.viewport || { width: 1280, height: 720 },
        device: req.body.config?.device,
        trace: req.body.config?.trace || 'retain-on-failure',
        screenshot: req.body.config?.screenshot || 'only-on-failure',
        video: req.body.config?.video || 'off',
        timeout: req.body.config?.timeout || 30000,
        retries: req.body.config?.retries || 0,
        workers: req.body.config?.workers || 1,
        variables: req.body.variables,
        environment: req.body.config?.environment || 'dev',
        debugMode: req.body.config?.debugMode,
        breakpoints: req.body.config?.breakpoints,
      };

      // Create flow executor (without WebSocket for now - this is synchronous execution)
      const executor = new FlowExecutor(null);

      // Execute the flow
      const result = await executor.executeWithRetry(parsedFlow, config);

      // Update execution status in database
      await executionService.updateStatus(
        result.executionId,
        result.status,
        result.status === 'passed' ? 0 : 1,
        testFlow.id
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get screenshots for an execution (MUST come before /:id route!)
router.get(
  '/:id/screenshots',
  validate([param('id').isUUID().withMessage('Invalid execution ID')]),
  async (req: AuthRequest, res, next) => {
    try {
      // Verify execution belongs to user
      await executionService.findOne(req.userId!, req.params.id);

      // Get screenshots using PlaywrightService
      const screenshots = await playwrightService.getScreenshots(req.params.id);

      res.json({
        success: true,
        data: screenshots,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Serve individual screenshot
router.get(
  '/:id/screenshots/:filename',
  validate([
    param('id').isUUID().withMessage('Invalid execution ID'),
    param('filename').matches(/^step-\d+\.png$/).withMessage('Invalid filename'),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      // Verify execution belongs to user
      await executionService.findOne(req.userId!, req.params.id);

      // Get screenshot path from PlaywrightService
      const screenshotPath = playwrightService.getScreenshotPath(
        req.params.id,
        req.params.filename
      );

      // Check if file exists
      await fs.access(screenshotPath);

      // Send the file
      res.sendFile(screenshotPath);
    } catch (error) {
      next(error);
    }
  }
);

// Get single execution (MUST come after specific routes like /screenshots)
router.get(
  '/:id',
  validate([param('id').isUUID().withMessage('Invalid execution ID')]),
  async (req: AuthRequest, res, next) => {
    try {
      const execution = await executionService.findOne(req.userId!, req.params.id);
      res.json({
        success: true,
        data: execution,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete execution
router.delete(
  '/:id',
  validate([param('id').isUUID().withMessage('Invalid execution ID')]),
  async (req: AuthRequest, res, next) => {
    try {
      await executionService.delete(req.userId!, req.params.id);
      res.json({
        success: true,
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as executionRoutes };
