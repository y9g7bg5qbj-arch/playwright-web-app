import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const spawnMock = vi.fn();
const execSyncMock = vi.fn(() => '');
const createConnectionMock = vi.fn(() => {
  const socket: any = new EventEmitter();
  socket.destroy = vi.fn();
  socket.setTimeout = vi.fn((_timeout: number, _callback?: () => void) => socket);
  setTimeout(() => {
    socket.emit('connect');
  }, 0);
  return socket;
});

vi.mock('child_process', async () => {
  const actual = await vi.importActual<typeof import('child_process')>('child_process');
  return {
    ...actual,
    spawn: (...args: any[]) => spawnMock(...args),
    exec: vi.fn(),
    execSync: (...args: any[]) => execSyncMock(...args),
  };
});

vi.mock('net', async () => {
  const actual = await vi.importActual<typeof import('net')>('net');
  return {
    ...actual,
    createConnection: (...args: any[]) => createConnectionMock(...args),
  };
});

vi.mock('../middleware/auth', () => ({
  authenticateToken: (_req: any, _res: any, next: any) => next(),
  AuthRequest: {} as any,
}));

vi.mock('../services/execution.service', () => ({
  ExecutionService: class {
    create = vi.fn();
    findAll = vi.fn();
    findOne = vi.fn();
    findRecent = vi.fn();
    update = vi.fn();
    addLog = vi.fn();
    delete = vi.fn();
  },
}));

vi.mock('../services/testFlow.service', () => ({
  TestFlowService: class {
    findOne = vi.fn();
  },
}));

vi.mock('../services/playwright.service', () => ({
  PlaywrightService: class {
    getStoragePath() {
      return path.join(os.tmpdir(), 'playwright-storage-mock');
    }

    getScreenshotPath() {
      return path.join(os.tmpdir(), 'missing-screenshot.png');
    }

    async getScreenshots() {
      return [];
    }

    cancelExecution = vi.fn();
    executeTest = vi.fn();
    parseTestResults = vi.fn();
  },
}));

vi.mock('../executor', () => ({
  FlowExecutor: class {
    async executeWithRetry() {
      return { success: true, status: 'passed' };
    }
  },
  parseFlow: vi.fn(() => ({})),
}));

let tmpRoot: string;
let executionRoutes: any;

async function invokeRoute(
  method: 'GET' | 'POST',
  url: string,
  options: {
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  } = {}
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const headers = {
      'content-type': 'application/json',
      ...(options.headers || {}),
    };

    const req: any = {
      method,
      url,
      originalUrl: url,
      path: url,
      query: options.query || {},
      body: options.body || {},
      headers,
      protocol: 'http',
      get: (name: string) => headers[name.toLowerCase()],
    };

    const res: any = {
      statusCode: 200,
      headers: {} as Record<string, unknown>,
      setHeader(name: string, value: unknown) {
        this.headers[name.toLowerCase()] = value;
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        resolve({ status: this.statusCode, body: payload });
        return this;
      },
      end(payload?: unknown) {
        resolve({ status: this.statusCode, body: payload });
      },
    };

    executionRoutes.handle(req, res, (err: unknown) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ status: res.statusCode, body: undefined });
    });
  });
}

// TODO: Requires MONGODB_URI — transitive import of mongodb.ts throws at module load time
describe.skip('Execution Trace Routes', () => {
  beforeAll(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'execution-trace-routes-'));
    process.env.VERO_PROJECT_PATH = tmpRoot;
    process.env.STORAGE_PATH = path.join(tmpRoot, 'storage');
    process.env.VERO_TRACE_VIEWER_START_TIMEOUT_MS = '25';
    process.env.VERO_TRACE_VIEWER_POLL_INTERVAL_MS = '5';

    vi.resetModules();
    ({ executionRoutes } = await import('../routes/execution.routes'));
  });

  afterAll(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  beforeEach(async () => {
    spawnMock.mockReset();
    execSyncMock.mockReset();
    createConnectionMock.mockClear();
    await fs.rm(path.join(tmpRoot, 'test-results'), { recursive: true, force: true });
  });

  it('returns cloud-viewer URL derived from forwarded host/proto', async () => {
    const executionId = 'trace-exec-1';
    const traceDir = path.join(tmpRoot, 'test-results', executionId);
    await fs.mkdir(traceDir, { recursive: true });
    await fs.writeFile(path.join(traceDir, 'trace.zip'), 'zip-content', 'utf-8');

    spawnMock.mockReturnValue({
      unref: vi.fn(),
    });

    const { status, body } = await invokeRoute('POST', `/${executionId}/trace/view`, {
      headers: {
        host: 'internal.local:3000',
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'qa.example.com',
      },
      body: {},
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.traceUrl).toBe(`https://qa.example.com/api/executions/${executionId}/trace`);
    expect(body.viewerUrl).toContain('https://trace.playwright.dev/?trace=');

    const viewer = new URL(body.viewerUrl);
    expect(viewer.searchParams.get('trace')).toBe(
      `https://qa.example.com/api/executions/${executionId}/trace`
    );
  });
});
