import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import os from 'os';
import path from 'path';

const mocks = vi.hoisted(() => ({
  findRecentMock: vi.fn(),
}));

vi.mock('../middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.userId = 'user-route-1';
    next();
  },
  AuthRequest: {} as any,
}));

vi.mock('../services/execution.service', () => ({
  ExecutionService: class {
    create = vi.fn();
    findAll = vi.fn();
    findOne = vi.fn();
    findRecent = mocks.findRecentMock;
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
      protocol: 'http',
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
describe.skip('GET /recent route', () => {
  beforeAll(async () => {
    vi.resetModules();
    ({ executionRoutes } = await import('../routes/execution.routes'));
  });

  beforeEach(() => {
    mocks.findRecentMock.mockReset();
  });

  it('passes applicationId query to ExecutionService.findRecent and returns scoped fields', async () => {
    mocks.findRecentMock.mockResolvedValue([
      {
        id: 'exec-1',
        testFlowId: 'flow-1',
        applicationId: 'app-1',
        projectId: 'project-1',
        projectName: 'Project One',
      },
    ]);

    const { status, body } = await invokeRoute('GET', '/recent', {
      query: { limit: '25', applicationId: 'app-1' },
    });

    expect(status).toBe(200);
    expect(mocks.findRecentMock).toHaveBeenCalledWith('user-route-1', 25, 'app-1');
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].applicationId).toBe('app-1');
    expect(body.data[0].projectId).toBe('project-1');
    expect(body.data[0].projectName).toBe('Project One');
  });
});
