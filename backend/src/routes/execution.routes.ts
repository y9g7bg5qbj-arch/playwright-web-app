import { Router } from 'express';
import { body, param } from 'express-validator';
import { exec, execFileSync, spawn } from 'child_process';
import { ExecutionService } from '../services/execution.service';
import { PlaywrightService } from '../services/playwright.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { config as appConfig } from '../config';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import net from 'net';
import os from 'os';
import { VERO_PROJECT_PATH as SHARED_VERO_PROJECT_PATH } from './veroProjectPath.utils';

// Docker traces directory (relative to project root)
// __dirname is backend/src/routes, so go up 3 levels to reach project root
const DOCKER_TRACES_DIR = path.join(__dirname, '../../../docker/worker-vnc/traces');

const router = Router();
const executionService = new ExecutionService();
const playwrightService = new PlaywrightService();

interface TraceMatch {
  path: string;
  mtimeMs: number;
}

interface ResolveLaunchTracePathOptions {
  executionId?: string;
  scenarioName?: string;
  allowLatestFallback?: boolean;
}

const TRACE_VIEWER_PORT = 9323;
const NO_TRACE_LAUNCH_ERROR =
  'No trace found. Traces are retained on failure by default.';
const BACKEND_ROOT = path.resolve(__dirname, '../..');
const WORKSPACE_ROOT = path.resolve(BACKEND_ROOT, '..');
const TRACE_TOOL_CWD = existsSync(BACKEND_ROOT) ? BACKEND_ROOT : process.cwd();
const TRACE_PUBLIC_BASE_URL = (process.env.VERO_TRACE_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || '').trim();

const TRACE_VIEWER_START_TIMEOUT_MS = (() => {
  const raw = (process.env.VERO_TRACE_VIEWER_START_TIMEOUT_MS || '').trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7000;
})();
const TRACE_VIEWER_POLL_INTERVAL_MS = (() => {
  const raw = (process.env.VERO_TRACE_VIEWER_POLL_INTERVAL_MS || '').trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 200;
})();

// GET / - List all executions (returns empty for now as executions are managed per-session in memory)
router.get('/', (_req, res) => {
  res.json({
    success: true,
    executions: []
  });
});

// Shared CORS preflight handler for trace endpoints (required for trace.playwright.dev embedding)
function traceCorsHandler(_req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Origin, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(204).end();
}

router.options('/:id/trace', traceCorsHandler);

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
        } else if (entry.name === 'trace.zip' || (entry.name.endsWith('.zip') && entry.name.includes('trace'))) {
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

const normalizeScenarioKey = (value: string): string => {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
};

const isTraceFile = (fileName: string): boolean => fileName === 'trace.zip';

const findLatestTrace = async (baseDir: string, scenarioFilter?: string): Promise<string | null> => {
  const targetKey = scenarioFilter ? normalizeScenarioKey(scenarioFilter) : '';
  if (scenarioFilter && !targetKey) return null;

  let latest: TraceMatch | null = null;

  const matchesScenario = (dirName: string): boolean => {
    const directoryKey = normalizeScenarioKey(dirName);
    const strippedDirectoryKey = normalizeScenarioKey(stripVeroPrefix(dirName));
    if (!directoryKey && !strippedDirectoryKey) return false;
    return (
      directoryKey.includes(targetKey) ||
      targetKey.includes(directoryKey) ||
      strippedDirectoryKey.includes(targetKey) ||
      targetKey.includes(strippedDirectoryKey)
    );
  };

  const walk = async (dir: string): Promise<void> => {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
          continue;
        }
        if (!isTraceFile(entry.name)) continue;
        if (scenarioFilter) {
          const parentDirName = path.basename(path.dirname(fullPath));
          if (!matchesScenario(parentDirName)) continue;
        }
        const stats = await fs.stat(fullPath);
        if (!latest || stats.mtimeMs > latest.mtimeMs) {
          latest = { path: fullPath, mtimeMs: stats.mtimeMs };
        }
      }
    } catch {
      // Directory might not exist
    }
  };

  await walk(baseDir);
  return latest ? (latest as TraceMatch).path : null;
};

const findExecutionScopedTraceFile = async (executionId: string): Promise<string | null> => {
  const storagePath = playwrightService.getStoragePath();
  const traceDir = path.join(storagePath, executionId, 'trace');
  const testResultsDir = path.join(storagePath, executionId, 'test-results');

  let tracePath = await findTraceFile(traceDir);
  if (!tracePath) {
    tracePath = await findTraceFile(testResultsDir);
  }

  return tracePath;
};

const selectMostRecentTrace = async (tracePaths: Array<string | null>): Promise<string | null> => {
  let latest: TraceMatch | null = null;

  for (const tracePath of tracePaths) {
    if (!tracePath) continue;
    try {
      const stats = await fs.stat(tracePath);
      if (!latest || stats.mtimeMs > latest.mtimeMs) {
        latest = { path: tracePath, mtimeMs: stats.mtimeMs };
      }
    } catch {
      // Skip unreadable candidates.
    }
  }

  return latest ? latest.path : null;
};

const findScenarioTraceAcrossRoots = async (scenarioName: string): Promise<string | null> => {
  const candidates = await Promise.all(
    VERO_TEST_RESULTS_PATHS.map((baseDir) => findLatestTrace(baseDir, scenarioName))
  );
  return selectMostRecentTrace(candidates);
};

const findLatestTraceAcrossRoots = async (): Promise<string | null> => {
  const candidates = await Promise.all(
    VERO_TEST_RESULTS_PATHS.map((baseDir) => findLatestTrace(baseDir))
  );
  return selectMostRecentTrace(candidates);
};

const resolveLaunchTracePath = async ({
  executionId,
  scenarioName,
  allowLatestFallback = false,
}: ResolveLaunchTracePathOptions): Promise<string | null> => {
  let tracePath: string | null = null;
  const normalizedScenario = typeof scenarioName === 'string' ? scenarioName.trim() : '';

  if (executionId) {
    tracePath = await findTraceForExecutionId(executionId);
  }

  if (!tracePath && normalizedScenario) {
    tracePath = await findScenarioTraceAcrossRoots(normalizedScenario);
  }

  if (!tracePath && allowLatestFallback && !normalizedScenario) {
    tracePath = await findLatestTraceAcrossRoots();
  }

  return tracePath;
};

const findVeroExecutionScopedTraceFile = async (executionId: string): Promise<string | null> => {
  const candidateRoots = VERO_TEST_RESULTS_PATHS.map((baseDir) => path.join(baseDir, executionId));
  const candidates = await Promise.all(candidateRoots.map((candidateDir) => findTraceFile(candidateDir)));
  return selectMostRecentTrace(candidates);
};

const findTraceForExecutionId = async (executionId: string): Promise<string | null> => {
  const [playwrightScopedTrace, veroScopedTrace] = await Promise.all([
    findExecutionScopedTraceFile(executionId),
    findVeroExecutionScopedTraceFile(executionId),
  ]);
  return selectMostRecentTrace([playwrightScopedTrace, veroScopedTrace]);
};

interface TraceLaunchResult {
  success: boolean;
  message: string;
  tracePath: string;
  traceViewerUrl: string;
}

function readForwardedHeader(req: any, headerName: string): string | undefined {
  const rawHeaderValue = req.headers?.[headerName];
  if (Array.isArray(rawHeaderValue)) {
    return rawHeaderValue[0]?.split(',')[0]?.trim() || undefined;
  }
  if (typeof rawHeaderValue === 'string') {
    return rawHeaderValue.split(',')[0]?.trim() || undefined;
  }
  return undefined;
}

function buildAbsoluteUrl(req: any, relativePath: string): string {
  const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  if (TRACE_PUBLIC_BASE_URL) {
    try {
      return new URL(normalizedPath, TRACE_PUBLIC_BASE_URL).toString();
    } catch {
      // Fall through to request-derived URL when env override is invalid.
    }
  }

  const forwardedProto = readForwardedHeader(req, 'x-forwarded-proto');
  const forwardedHost = readForwardedHeader(req, 'x-forwarded-host');
  const forwardedPort = readForwardedHeader(req, 'x-forwarded-port');
  const protocol = forwardedProto || req.protocol || 'http';

  let host = forwardedHost;
  if (host && forwardedPort && !host.includes(':')) {
    host = `${host}:${forwardedPort}`;
  }
  if (!host && typeof req.get === 'function') {
    host = req.get('host');
  }
  if (!host) {
    host = `localhost:${appConfig.port}`;
  }

  return `${protocol}://${host}${normalizedPath}`;
}

function buildPlaywrightCloudViewerUrl(traceAssetUrl: string): string {
  return `https://trace.playwright.dev/?trace=${encodeURIComponent(traceAssetUrl)}`;
}

function isPortListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForPortReady(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortListening(port)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, TRACE_VIEWER_POLL_INTERVAL_MS));
  }
  return false;
}

const launchLocalTraceViewer = async (
  tracePath: string,
  options: { autoOpenBrowser?: boolean } = {}
): Promise<TraceLaunchResult> => {
  const absoluteTracePath = path.resolve(tracePath);
  const traceViewerUrl = `http://localhost:${TRACE_VIEWER_PORT}`;

  try {
    await fs.access(absoluteTracePath);
  } catch {
    return {
      success: false,
      message: `Trace file not found: ${absoluteTracePath}`,
      tracePath: absoluteTracePath,
      traceViewerUrl,
    };
  }

  try {
    const existingPidsOutput = execFileSync('lsof', ['-ti', `tcp:${TRACE_VIEWER_PORT}`], {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
    const existingPids = existingPidsOutput
      .split(/\s+/)
      .map((entry) => Number.parseInt(entry, 10))
      .filter((pid) => Number.isFinite(pid) && pid > 0);
    for (const pid of existingPids) {
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        // Ignore per-process kill errors.
      }
    }
  } catch {
    // Ignore if no process is currently listening.
  }

  const child = spawn(
    'npx',
    ['playwright', 'show-trace', '-p', String(TRACE_VIEWER_PORT), absoluteTracePath],
    {
      cwd: TRACE_TOOL_CWD,
      detached: true,
      stdio: 'ignore',
      shell: false,
    }
  );
  child.unref();

  const isReady = await waitForPortReady(TRACE_VIEWER_PORT, TRACE_VIEWER_START_TIMEOUT_MS);
  if (!isReady) {
    return {
      success: false,
      message: `Trace viewer did not become ready on port ${TRACE_VIEWER_PORT} within ${TRACE_VIEWER_START_TIMEOUT_MS}ms.`,
      tracePath: absoluteTracePath,
      traceViewerUrl,
    };
  }

  if (options.autoOpenBrowser !== false) {
    exec(`open "${traceViewerUrl}"`, { cwd: TRACE_TOOL_CWD }, () => {
      // Ignore open failures; frontend fallback URL remains available.
    });
  }

  return {
    success: true,
    message: 'Trace viewer opening at ' + traceViewerUrl,
    tracePath: absoluteTracePath,
    traceViewerUrl,
  };
};

async function sendTraceViewResponse(req: any, res: any, tracePath: string, traceAssetPath: string) {
  const traceAssetUrl = buildAbsoluteUrl(req, traceAssetPath);
  const viewerUrl = buildPlaywrightCloudViewerUrl(traceAssetUrl);
  const launchResult = await launchLocalTraceViewer(tracePath, { autoOpenBrowser: false });
  res.json({
    success: true,
    launchedLocally: launchResult.success,
    message: launchResult.success
      ? launchResult.message
      : `Local trace viewer was not ready. Opening cloud trace viewer instead.`,
    tracePath: launchResult.tracePath,
    traceViewerUrl: launchResult.traceViewerUrl,
    traceUrl: traceAssetUrl,
    viewerUrl,
  });
}

// HEAD: Check if trace file exists (for quick availability check)
router.head(
  '/:id/trace',
  validate([param('id').isString().withMessage('Invalid execution ID')]),
  asyncHandler(async (req, res) => {
    const tracePath = await findTraceForExecutionId(req.params.id);

    if (!tracePath) {
      return res.status(404).end();
    }

    // Get file stats for Content-Length
    const stats = await fs.stat(tracePath);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).end();
  })
);

// PUBLIC: Serve trace file for an execution (no auth required for trace.playwright.dev embedding)
router.get(
  '/:id/trace',
  validate([param('id').isString().withMessage('Invalid execution ID')]),
  asyncHandler(async (req, res) => {
    const tracePath = await findTraceForExecutionId(req.params.id);

    if (!tracePath) {
      return res.status(404).json({
        success: false,
        error: 'Trace file not found',
      });
    }

    const absoluteTracePath = path.resolve(tracePath);

    // Send the trace file with CORS headers for trace.playwright.dev embedding
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `inline; filename="trace-${req.params.id}.zip"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    res.sendFile(absoluteTracePath, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ error: 'Failed to send trace file' });
      }
    });
  })
);

// PUBLIC: Launch local Playwright trace viewer for an execution
router.post(
  '/:id/trace/view',
  validate([
    param('id').isString().withMessage('Invalid execution ID'),
    body('scenarioName').optional().isString().withMessage('Invalid scenario name'),
  ]),
  asyncHandler(async (req, res) => {
    const scenarioName = typeof req.body?.scenarioName === 'string' ? req.body.scenarioName : undefined;
    const tracePath = await resolveLaunchTracePath({
      executionId: req.params.id,
      scenarioName,
      allowLatestFallback: false,
    });

    if (!tracePath) {
      return res.status(404).json({
        success: false,
        error: NO_TRACE_LAUNCH_ERROR,
      });
    }

    const normalizedScenarioName = scenarioName?.trim();
    const executionScopedTrace = await findTraceForExecutionId(req.params.id);
    const traceAssetPath = executionScopedTrace
      ? `/api/executions/${encodeURIComponent(req.params.id)}/trace`
      : normalizedScenarioName
        ? `/api/executions/local/trace/${encodeURIComponent(normalizedScenarioName)}`
        : '/api/executions/local/trace';
    await sendTraceViewResponse(req, res, tracePath, traceAssetPath);
  })
);
// PUBLIC: List all Docker executions with traces
router.get('/docker/list', asyncHandler(async (_req, res) => {
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
}));

// CORS preflight for Docker traces
router.options('/docker/trace/:shard/:testDir', traceCorsHandler);

// PUBLIC: Serve trace file from Docker execution
router.get('/docker/trace/:shard/:testDir', asyncHandler(async (req, res) => {
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

  // Send with CORS headers
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `inline; filename="trace-${shard}-${testDir}.zip"`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  res.sendFile(absolutePath, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: 'Failed to send trace file' });
    }
  });
}));

// PUBLIC: Open Docker trace in local viewer
router.post('/docker/trace/:shard/:testDir/view', asyncHandler(async (req, res) => {
  const { shard, testDir } = req.params;
  const decodedTestDir = decodeURIComponent(testDir);
  const tracePath = path.join(DOCKER_TRACES_DIR, shard, decodedTestDir, 'trace.zip');

  // Verify file exists
  try {
    await fs.access(tracePath);
  } catch {
    return res.status(404).json({
      success: false,
      error: 'Trace file not found',
    });
  }

  const traceAssetPath = `/api/executions/docker/trace/${encodeURIComponent(shard)}/${encodeURIComponent(decodedTestDir)}`;
  await sendTraceViewResponse(req, res, tracePath, traceAssetPath);
}));

// ============================================
// LOCAL VERO TRACE SERVING
// ============================================

const VERO_PROJECT_PATH = path.resolve(SHARED_VERO_PROJECT_PATH);
const VERO_TEST_RESULTS_PATHS = Array.from(
  new Set(
    [
      path.join(VERO_PROJECT_PATH, 'test-results'),
      process.env.VERO_PROJECTS_ROOT ? path.join(process.env.VERO_PROJECTS_ROOT, 'test-results') : null,
      path.join(WORKSPACE_ROOT, 'vero-projects', 'test-results'),
      path.join(WORKSPACE_ROOT, 'vero-lang', 'test-project', 'test-results'),
      path.join(process.cwd(), '..', 'vero-projects', 'test-results'),
      path.join(process.cwd(), 'vero-projects', 'test-results'),
      path.join(process.cwd(), '..', 'vero-lang', 'test-project', 'test-results'),
    ]
      .filter((candidate): candidate is string => Boolean(candidate))
      .map((candidate) => path.resolve(candidate))
  )
);
const VERO_TEST_RESULTS_PATH = VERO_TEST_RESULTS_PATHS[0];
const HAS_EXPLICIT_VERO_PROJECT_PATH = Boolean((process.env.VERO_PROJECT_PATH || '').trim());
const LOCAL_ALLURE_PROJECT_PATHS = Array.from(
  new Set(
    [
      VERO_PROJECT_PATH,
      ...(
        HAS_EXPLICIT_VERO_PROJECT_PATH
          ? []
          : [
              path.resolve(WORKSPACE_ROOT, 'vero-projects'),
              path.resolve(WORKSPACE_ROOT, 'vero-lang', 'test-project'),
              path.resolve(process.cwd(), '..', 'vero-projects'),
              path.resolve(process.cwd(), '..', 'vero-lang', 'test-project'),
              path.resolve(process.cwd(), 'vero-projects'),
            ]
      ),
    ]
  )
);
const EXECUTION_ID_PATTERN = /^[A-Za-z0-9-]+$/;

function parseOptionalExecutionId(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== 'string') {
    throw new Error('Execution ID must be a string');
  }

  const executionId = raw.trim();
  if (!executionId) return null;

  if (!EXECUTION_ID_PATTERN.test(executionId)) {
    throw new Error('Invalid execution ID format. Only alphanumeric characters and hyphens are allowed.');
  }

  return executionId;
}

function getLocalAllureScope(executionId: string | null, projectPath: string = VERO_PROJECT_PATH) {
  const scopeKey = executionId || 'local';
  const allureResultsPath = executionId
    ? path.join(projectPath, 'allure-results', executionId)
    : path.join(projectPath, 'allure-results');
  const allureReportPath = executionId
    ? path.join(projectPath, 'allure-report', executionId)
    : path.join(projectPath, 'allure-report');
  const storageAllurePath = path.resolve(appConfig.storage.path, 'allure-reports', scopeKey);
  const reportUrl = `/allure-reports/${scopeKey}/index.html`;

  return {
    projectPath,
    scopeKey,
    allureResultsPath,
    allureReportPath,
    storageAllurePath,
    storageReportIndexPath: path.join(storageAllurePath, 'index.html'),
    reportUrl,
  };
}

function resolveExistingLocalAllureScope(executionId: string | null) {
  for (const projectPath of LOCAL_ALLURE_PROJECT_PATHS) {
    const scope = getLocalAllureScope(executionId, projectPath);
    if (
      existsSync(scope.allureResultsPath)
      || existsSync(path.join(scope.allureReportPath, 'index.html'))
    ) {
      return scope;
    }
  }
  return getLocalAllureScope(executionId, LOCAL_ALLURE_PROJECT_PATHS[0] || VERO_PROJECT_PATH);
}

async function hasAllureResultFiles(dirPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dirPath);
    return entries.some((entry) => entry.endsWith('-result.json'));
  } catch {
    return false;
  }
}

async function resolveAllureResultsInput(
  executionId: string | null
): Promise<{ scope: ReturnType<typeof getLocalAllureScope>; resultsPath: string; cleanupPath: string | null }> {
  const scope = resolveExistingLocalAllureScope(executionId);

  if (await hasAllureResultFiles(scope.allureResultsPath)) {
    return { scope, resultsPath: scope.allureResultsPath, cleanupPath: null };
  }

  if (executionId) {
    for (const projectPath of LOCAL_ALLURE_PROJECT_PATHS) {
      const legacyResultsPath = path.join(projectPath, 'allure-results');
      if (legacyResultsPath === scope.allureResultsPath) {
        continue;
      }
      if (!(await hasAllureResultFiles(legacyResultsPath))) {
        continue;
      }

      const fallbackScope = getLocalAllureScope(executionId, projectPath);
      const tempInputPath = path.join(
        appConfig.storage.path,
        'allure-reports',
        `_legacy-input-${executionId}-${Date.now()}`
      );

      await fs.rm(tempInputPath, { recursive: true, force: true });
      await copyDirectoryRecursive(legacyResultsPath, tempInputPath);

      return {
        scope: fallbackScope,
        resultsPath: tempInputPath,
        cleanupPath: tempInputPath,
      };
    }
  }

  return { scope, resultsPath: scope.allureResultsPath, cleanupPath: null };
}


/**
 * Strip the vero spec file prefix from a test-results directory name
 * to extract the scenario name. Handles both legacy (.vero-temp-test-)
 * and current (.vero-run-<UUID>-) naming patterns.
 */
function stripVeroPrefix(dirName: string): string {
    return dirName
        .replace(/^\.vero-run-[a-zA-Z0-9_-]*-[0-9a-f]{8}-/i, '')  // new: .vero-run-Login-d0a8cb94-
        .replace(/^\.vero-run-[0-9a-f-]+-/i, '')                    // legacy: .vero-run-UUID-
        .replace(/^\.vero-temp-test-/i, '')                          // legacy: .vero-temp-test-
        .replace(/-/g, ' ');
}

// CORS preflight for local traces
router.options('/local/trace', traceCorsHandler);
router.options('/local/trace/:scenarioName', traceCorsHandler);

/**
 * GET /api/executions/local/trace
 * Get the most recent trace from local vero test executions
 */
router.get('/local/trace', asyncHandler(async (_req, res) => {
  const tracePath = await findLatestTraceAcrossRoots();
  if (!tracePath) {
    return res.status(404).json({
      success: false,
      error: 'No trace files found. Run tests first.',
    });
  }

  // Send with CORS headers for trace.playwright.dev
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'inline; filename="trace.zip"');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  res.sendFile(tracePath, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: 'Failed to send trace file' });
    }
  });
}));

/**
 * GET /api/executions/local/trace/:scenarioName
 * Get trace for a specific scenario by name (partial match)
 */
router.get('/local/trace/:scenarioName', asyncHandler(async (req, res) => {
  const scenarioName = decodeURIComponent(req.params.scenarioName);
  const tracePath = await findScenarioTraceAcrossRoots(scenarioName);
  if (!tracePath) {
    return res.status(404).json({
      success: false,
      error: `No trace found for scenario: ${scenarioName}`,
    });
  }

  // Send with CORS headers
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `inline; filename="trace-${req.params.scenarioName}.zip"`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  res.sendFile(tracePath, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: 'Failed to send trace file' });
    }
  });
}));

/**
 * GET /api/executions/local/traces
 * List all available traces from local vero test executions
 */
router.get('/local/traces', asyncHandler(async (_req, res) => {
  const traces: Array<{ name: string; path: string; timestamp: string }> = [];

  try {
    const entries = await fs.readdir(VERO_TEST_RESULTS_PATH, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const tracePath = path.join(VERO_TEST_RESULTS_PATH, entry.name, 'trace.zip');
        try {
          const stats = await fs.stat(tracePath);
          traces.push({
            name: entry.name,
            path: `/api/executions/local/trace/${encodeURIComponent(entry.name)}`,
            timestamp: stats.mtime.toISOString(),
          });
        } catch {
          // No trace.zip in this directory
        }
      }
    }
  } catch {
    // test-results directory might not exist
  }

  // Sort by timestamp, newest first
  traces.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json({
    success: true,
    data: traces,
  });
}));

/**
 * POST /api/executions/local/trace/:scenarioName/open
 * Open trace viewer locally using Playwright's built-in viewer
 * This avoids the HTTPS mixed content issue with trace.playwright.dev
 */
router.post('/local/trace/:scenarioName/open', asyncHandler(async (req, res) => {
  const scenarioName = decodeURIComponent(req.params.scenarioName);
  const tracePath = await resolveLaunchTracePath({
    scenarioName,
    allowLatestFallback: false,
  });

  if (!tracePath) {
    return res.status(404).json({
      success: false,
      error: NO_TRACE_LAUNCH_ERROR,
    });
  }

  const traceAssetPath = `/api/executions/local/trace/${encodeURIComponent(scenarioName)}`;
  await sendTraceViewResponse(req, res, tracePath, traceAssetPath);
}));

/**
 * POST /api/executions/local/trace/open
 * Open trace viewer for a specific execution.
 * Accepts: { executionId?, scenarioName? } in body.
 * Prefers execution-scoped trace lookup, then scenario matching, then most recent trace.
 */
router.post('/local/trace/open', authenticateToken, asyncHandler(async (req: AuthRequest, res) => {
  const { executionId, scenarioName } = req.body || {};
  const tracePath = await resolveLaunchTracePath({
    executionId: typeof executionId === 'string' ? executionId : undefined,
    scenarioName: typeof scenarioName === 'string' ? scenarioName : undefined,
    allowLatestFallback: true,
  });

  if (!tracePath) {
    return res.status(404).json({
      success: false,
      error: NO_TRACE_LAUNCH_ERROR,
    });
  }

  const normalizedExecutionId = typeof executionId === 'string' ? executionId.trim() : '';
  const normalizedScenarioName = typeof scenarioName === 'string' ? scenarioName.trim() : '';
  const traceAssetPath = normalizedScenarioName
    ? `/api/executions/local/trace/${encodeURIComponent(normalizedScenarioName)}`
    : normalizedExecutionId
      ? `/api/executions/${encodeURIComponent(normalizedExecutionId)}/trace`
      : '/api/executions/local/trace';
  await sendTraceViewResponse(req, res, tracePath, traceAssetPath);
}));

// ============================================
// LOCAL SCREENSHOT SERVING
// ============================================

/**
 * GET /api/executions/local/screenshot/:scenarioName
 * Get screenshot for a specific scenario
 */
router.get('/local/screenshot/:scenarioName', asyncHandler(async (req, res) => {
  const scenarioName = decodeURIComponent(req.params.scenarioName).toLowerCase();

  // Find screenshot in test-results directory matching scenario name
  let screenshotPath: string | null = null;

  try {
    const entries = await fs.readdir(VERO_TEST_RESULTS_PATH, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirNameLower = entry.name.toLowerCase();
        if (dirNameLower.includes(scenarioName) || scenarioName.includes(stripVeroPrefix(dirNameLower))) {
          const dirPath = path.join(VERO_TEST_RESULTS_PATH, entry.name);
          // Look for any .png file in the directory
          try {
            const dirContents = await fs.readdir(dirPath);
            const pngFile = dirContents.find(f => f.endsWith('.png'));
            if (pngFile) {
              screenshotPath = path.join(dirPath, pngFile);
              break;
            }
          } catch {
            // Skip this directory
          }
        }
      }
    }
  } catch {
    // test-results directory might not exist
  }

  if (!screenshotPath) {
    return res.status(404).json({
      success: false,
      error: `No screenshot found for scenario: ${scenarioName}`,
    });
  }

  // Serve the screenshot file
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  const fileBuffer = await fs.readFile(screenshotPath);
  res.send(fileBuffer);
}));

/**
 * GET /api/executions/local/screenshots
 * List all available screenshots from local vero test executions
 */
router.get('/local/screenshots', asyncHandler(async (_req, res) => {
  const screenshots: Array<{ name: string; url: string; timestamp: string }> = [];

  try {
    const entries = await fs.readdir(VERO_TEST_RESULTS_PATH, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = path.join(VERO_TEST_RESULTS_PATH, entry.name);
        try {
          const dirContents = await fs.readdir(dirPath);
          const pngFile = dirContents.find(f => f.endsWith('.png'));
          if (pngFile) {
            const stats = await fs.stat(path.join(dirPath, pngFile));
            screenshots.push({
              name: entry.name,
              url: `/api/executions/local/screenshot/${encodeURIComponent(entry.name)}`,
              timestamp: stats.mtime.toISOString(),
            });
          }
        } catch {
          // Skip this directory
        }
      }
    }
  } catch {
    // test-results directory might not exist
  }

  // Sort by timestamp, newest first
  screenshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json({
    success: true,
    data: screenshots,
  });
}));

// ============================================
// LOCAL ALLURE REPORT GENERATION
// ============================================

const ALLURE_BIN_CANDIDATES = [
  path.resolve(BACKEND_ROOT, 'node_modules', '.bin', 'allure'),
  path.resolve(process.cwd(), 'node_modules', '.bin', 'allure'),
];

const resolveAllureCommand = async (): Promise<{ command: string; prefixArgs: string[] }> => {
  for (const candidate of ALLURE_BIN_CANDIDATES) {
    try {
      await fs.access(candidate);
      return { command: candidate, prefixArgs: [] };
    } catch {}
  }
  return { command: 'npx', prefixArgs: ['allure'] };
};

const MASTER_ALLURE_HISTORY_PATH = path.resolve(appConfig.storage.path, 'allure-reports', '_history');

const copyDirectoryRecursive = async (src: string, dest: string): Promise<void> => {
  const entries = await fs.readdir(src, { withFileTypes: true });
  await fs.mkdir(dest, { recursive: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDirectoryRecursive(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
};

/**
 * GET /api/executions/local/allure/status
 * Check if local Allure report is ready
 */
router.get('/local/allure/status', asyncHandler(async (req, res) => {
  let executionId: string | null = null;
  try {
    executionId = parseOptionalExecutionId(req.query.executionId);
  } catch (validationError: any) {
    return res.status(400).json({
      success: false,
      error: validationError.message || 'Invalid execution ID',
    });
  }

  const allureScope = resolveExistingLocalAllureScope(executionId);

  let ready = false;
  try {
    await fs.access(allureScope.storageReportIndexPath);
    ready = true;
  } catch {
    // Report not generated yet
  }

  if (!ready) {
    const projectReportIndexPath = path.join(allureScope.allureReportPath, 'index.html');
    try {
      await fs.access(projectReportIndexPath);
      try {
        await copyDirectoryRecursive(allureScope.allureReportPath, allureScope.storageAllurePath);
      } catch {
        // Non-critical: if copy fails but file exists, still report as ready.
      }
      ready = true;
    } catch {
      // No project-level report either.
    }
  }

  res.json({
    success: true,
    data: {
      ready,
      reportUrl: ready ? allureScope.reportUrl : null,
      scopeKey: allureScope.scopeKey,
    },
  });
}));

/**
 * POST /api/executions/local/allure/generate
 * Generate Allure HTML report from local test results
 */
router.post('/local/allure/generate', async (req, res) => {
  let cleanupAllureInputPath: string | null = null;
  try {
    let executionId: string | null = null;
    try {
      executionId = parseOptionalExecutionId(req.body?.executionId);
    } catch (validationError: any) {
      return res.status(400).json({
        success: false,
        error: validationError.message || 'Invalid execution ID',
      });
    }

    const resolvedInput = await resolveAllureResultsInput(executionId);
    const allureScope = resolvedInput.scope;
    const allureResultsInputPath = resolvedInput.resultsPath;
    cleanupAllureInputPath = resolvedInput.cleanupPath;

    // Check if allure-results exists
    try {
      await fs.access(allureResultsInputPath);
    } catch {
      return res.json({
        success: false,
        code: 'ALLURE_RESULTS_NOT_FOUND',
        error: executionId
          ? 'Allure report unavailable for this execution. Re-run this execution to generate Allure artifacts.'
          : 'No allure-results found. Run tests first.',
      });
    }

    // Preserve history from previous report for trend/history data
    // Check: this scope's stored history, then master aggregated history, then local report fallback
    const historySourceCandidates = [
      path.join(allureScope.storageAllurePath, 'history'),
      MASTER_ALLURE_HISTORY_PATH,
      path.join(appConfig.storage.path, 'allure-reports', 'local', 'history'),
    ];
    for (const historySource of historySourceCandidates) {
      try {
        await fs.access(historySource);
        const historyDest = path.join(allureResultsInputPath, 'history');
        await fs.rm(historyDest, { recursive: true, force: true });
        await copyDirectoryRecursive(historySource, historyDest);
        break;
      } catch {
        // This history source doesn't exist, try the next
      }
    }

    // Clean up old report directories
    await fs.rm(allureScope.allureReportPath, { recursive: true, force: true });
    await fs.rm(allureScope.storageAllurePath, { recursive: true, force: true });

    // Write environment.properties for Allure Environments widget
    const playwrightVersion = (() => {
      try {
        const pkgPath = require.resolve('@playwright/test/package.json');
        return require(pkgPath).version || 'unknown';
      } catch { return 'unknown'; }
    })();
    const envProps = [
      `OS=${os.platform()} ${os.release()}`,
      `Node=${process.version}`,
      `Browser=Chromium (headless)`,
      `Playwright=${playwrightVersion}`,
      `Host=${os.hostname()}`,
    ].join('\n');
    try {
      await fs.writeFile(
        path.join(allureResultsInputPath, 'environment.properties'),
        envProps, 'utf-8'
      );
    } catch { /* Non-critical: environment metadata is cosmetic */ }

    // Post-process Allure result JSON files to clean up Vero-specific artifacts.
    // 1. Deduplicate labels: keep LAST occurrence so our custom values override defaults.
    // 2. Rewrite titlePath array and fullName to remove temp file name references.
    try {
      const resultFiles = (await fs.readdir(allureResultsInputPath))
        .filter(f => f.endsWith('-result.json'));
      for (const file of resultFiles) {
        const resultPath = path.join(allureResultsInputPath, file);
        const data = JSON.parse(await fs.readFile(resultPath, 'utf-8'));

        // Deduplicate labels — last value wins
        if (Array.isArray(data.labels)) {
          const deduped = new Map<string, { name: string; value: string }>();
          for (const label of data.labels) {
            deduped.set(label.name, label);
          }
          data.labels = [...deduped.values()];
        }

        // Rewrite titlePath array: replace .vero-run-* entry with clean hierarchy
        if (Array.isArray(data.titlePath)) {
          const titlePathLabel = data.labels?.find((l: { name: string }) => l.name === 'titlePath');
          if (titlePathLabel) {
            data.titlePath = titlePathLabel.value.split(' > ');
          } else {
            // Fallback: just strip .vero-run- entries
            data.titlePath = data.titlePath.filter((s: string) => !s.startsWith('.vero-run-'));
          }
        }

        // Rewrite fullName: replace file reference with clean path
        if (typeof data.fullName === 'string' && data.fullName.includes('.vero-run-')) {
          const titlePathLabel = data.labels?.find((l: { name: string }) => l.name === 'titlePath');
          const testName = data.name || 'test';
          if (titlePathLabel) {
            data.fullName = titlePathLabel.value + ' > ' + testName;
          }
        }

        await fs.writeFile(resultPath, JSON.stringify(data), 'utf-8');
      }
    } catch { /* Non-critical: result cleanup is cosmetic */ }

    // Resolve allure CLI binary (Allure 3 — Node.js, no Java required)
    const { command, prefixArgs } = await resolveAllureCommand();
    const allureArgs = [
      ...prefixArgs,
      'generate',
      allureResultsInputPath,
      '-o',
      allureScope.allureReportPath,
    ];

    const allureProcess = spawn(command, allureArgs, {
      cwd: allureScope.projectPath,
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    allureProcess.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    allureProcess.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    await new Promise<void>((resolve, reject) => {
      allureProcess.on('close', async (code: number) => {
        if (code === 0) {
          // Copy generated report to storage location for static serving
          try {
            await copyDirectoryRecursive(allureScope.allureReportPath, allureScope.storageAllurePath);
          } catch {
            // Non-critical: report is still available from allure-report directory
          }
          // Update master history for cross-execution history sharing
          try {
            const generatedHistory = path.join(allureScope.allureReportPath, 'history');
            await fs.access(generatedHistory);
            await fs.rm(MASTER_ALLURE_HISTORY_PATH, { recursive: true, force: true });
            await copyDirectoryRecursive(generatedHistory, MASTER_ALLURE_HISTORY_PATH);
          } catch { /* history update non-critical */ }
          resolve();
        } else {
          reject(new Error(`Allure generate failed with code ${code}: ${stderr}`));
        }
      });

      allureProcess.on('error', (err: Error) => {
        reject(err);
      });
    });

    res.json({
      success: true,
      data: {
        reportUrl: allureScope.reportUrl,
        scopeKey: allureScope.scopeKey,
        message: 'Allure report generated successfully',
      },
    });
  } catch (error: any) {
    res.json({
      success: false,
      error: error.message || 'Failed to generate Allure report',
    });
  } finally {
    if (cleanupAllureInputPath) {
      await fs.rm(cleanupAllureInputPath, { recursive: true, force: true }).catch(() => {});
    }
  }
});

router.use(authenticateToken);

// Get recent executions across all test flows for the authenticated user
router.get('/recent', asyncHandler(async (req: AuthRequest, res) => {
  const limit = parseInt(req.query.limit as string) || 200;
  const applicationId =
    typeof req.query.applicationId === 'string' && req.query.applicationId.trim().length > 0
      ? req.query.applicationId.trim()
      : undefined;
  const executions = await executionService.findRecent(req.userId!, limit, applicationId);
  res.json({
    success: true,
    data: executions,
  });
}));

// Delete execution
router.delete(
  '/:id',
  validate([param('id').isUUID().withMessage('Invalid execution ID')]),
  asyncHandler(async (req: AuthRequest, res) => {
    await executionService.delete(req.userId!, req.params.id);
    res.json({
      success: true,
      data: null,
    });
  })
);

export { router as executionRoutes };
