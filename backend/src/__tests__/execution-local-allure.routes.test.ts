import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { EventEmitter } from 'events';

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

let spawnMock: ReturnType<typeof vi.fn>;

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  spawnMock = vi.fn();
  return {
    ...actual,
    spawn: (...args: any[]) => spawnMock(...args),
  };
});

let tmpRoot: string;
let executionRoutes: any;

async function invokeRoute(
  method: 'GET' | 'POST',
  url: string,
  options: { query?: Record<string, unknown>; body?: Record<string, unknown> } = {}
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req: any = {
      method,
      url,
      originalUrl: url,
      path: url,
      query: options.query || {},
      body: options.body || {},
      headers: { 'content-type': 'application/json' },
      get: () => undefined,
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
describe.skip('Local Allure Routes', () => {
  beforeAll(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'local-allure-routes-'));
    process.env.VERO_PROJECT_PATH = tmpRoot;
    process.env.STORAGE_PATH = path.join(tmpRoot, 'storage');

    vi.resetModules();
    ({ executionRoutes } = await import('../routes/execution.routes'));
  });

  afterAll(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  beforeEach(async () => {
    spawnMock?.mockReset();
    await fs.rm(path.join(tmpRoot, 'allure-results'), { recursive: true, force: true });
    await fs.rm(path.join(tmpRoot, 'allure-report'), { recursive: true, force: true });
    await fs.rm(path.join(tmpRoot, 'storage', 'allure-reports'), { recursive: true, force: true });
  });

  it('returns ready=false for unknown execution scope status', async () => {
    const { status, body } = await invokeRoute('GET', '/local/allure/status', {
      query: { executionId: 'unknown-execution-1' },
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.ready).toBe(false);
    expect(body.data.reportUrl).toBeNull();
  });

  it('returns ALLURE_RESULTS_NOT_FOUND when scoped results are missing', async () => {
    const { status, body } = await invokeRoute('POST', '/local/allure/generate', {
      body: { executionId: 'unknown-execution-1' },
    });

    expect(status).toBe(200);
    expect(body.success).toBe(false);
    expect(body.code).toBe('ALLURE_RESULTS_NOT_FOUND');
  });

  it('falls back to legacy unscoped allure-results for scoped execution requests', async () => {
    const executionId = 'legacy-exec-987';
    const legacyAllureResultsPath = path.join(tmpRoot, 'allure-results');
    const allureReportPath = path.join(tmpRoot, 'allure-report', executionId);

    await fs.mkdir(legacyAllureResultsPath, { recursive: true });
    await fs.writeFile(
      path.join(legacyAllureResultsPath, 'legacy-uuid-1-result.json'),
      JSON.stringify({
        uuid: 'legacy-uuid-1',
        name: 'Legacy passing test',
        status: 'passed',
        start: 1700000000000,
        stop: 1700000005000,
        steps: [],
        attachments: [],
        labels: [{ name: 'suite', value: 'Legacy Suite' }],
      }),
      'utf-8',
    );

    spawnMock.mockImplementation((_cmd: string, args: string[]) => {
      const proc = new EventEmitter() as any;
      proc.stdout = new EventEmitter();
      proc.stderr = new EventEmitter();

      const outputIdx = args.indexOf('-o');
      const outputDir = outputIdx >= 0 ? args[outputIdx + 1] : allureReportPath;

      setTimeout(async () => {
        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(path.join(outputDir, 'index.html'), '<html><body>Legacy Allure Report</body></html>');
        proc.emit('close', 0);
      }, 10);

      return proc;
    });

    const { status, body } = await invokeRoute('POST', '/local/allure/generate', {
      body: { executionId },
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.reportUrl).toBe(`/allure-reports/${executionId}/index.html`);
  });

  it('returns scoped report URL when generation succeeds', async () => {
    const executionId = 'exec-12345';
    const allureResultsPath = path.join(tmpRoot, 'allure-results', executionId);
    const allureReportPath = path.join(tmpRoot, 'allure-report', executionId);

    await fs.mkdir(allureResultsPath, { recursive: true });
    await fs.writeFile(
      path.join(allureResultsPath, 'test-uuid-1-result.json'),
      JSON.stringify({
        uuid: 'test-uuid-1',
        name: 'Sample passing test',
        status: 'passed',
        start: 1700000000000,
        stop: 1700000005000,
        steps: [],
        attachments: [],
        labels: [{ name: 'suite', value: 'Sample Suite' }],
      }),
      'utf-8',
    );

    // Mock spawn to simulate successful allure generate
    spawnMock.mockImplementation((_cmd: string, args: string[]) => {
      const proc = new EventEmitter() as any;
      proc.stdout = new EventEmitter();
      proc.stderr = new EventEmitter();

      // Find -o flag to determine output directory
      const outputIdx = args.indexOf('-o');
      const outputDir = outputIdx >= 0 ? args[outputIdx + 1] : allureReportPath;

      // Simulate allure generate: create output directory with index.html
      setTimeout(async () => {
        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(path.join(outputDir, 'index.html'), '<html><body>Allure Report</body></html>');
        proc.emit('close', 0);
      }, 10);

      return proc;
    });

    const { status, body } = await invokeRoute('POST', '/local/allure/generate', {
      body: { executionId },
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.reportUrl).toBe(`/allure-reports/${executionId}/index.html`);

    const statusResult = await invokeRoute('GET', '/local/allure/status', {
      query: { executionId },
    });

    expect(statusResult.status).toBe(200);
    expect(statusResult.body.success).toBe(true);
    expect(statusResult.body.data.ready).toBe(true);
  });

  it('returns 400 for invalid execution ID format', async () => {
    const { status, body } = await invokeRoute('POST', '/local/allure/generate', {
      body: { executionId: '../bad-id' },
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });
});
