import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
// @ts-expect-error - supertest types not installed
import request from 'supertest';
import express, { Express } from 'express';
import veroRoutes from '../routes/vero.routes';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Mock authentication middleware
vi.mock('../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    const userId = 'test-user-123';
    req.userId = userId;
    req.user = { id: userId, email: 'test@example.com' };
    next();
  },
  AuthRequest: {} as any,
}));

// Mock MongoDB connection (prevents MONGODB_URI requirement at import time)
vi.mock('../db/mongodb', () => ({
  getMongoUri: () => 'mongodb://localhost:27017/test',
  getDb: vi.fn(),
  COLLECTIONS: {},
}));

vi.mock('../services/mongodb-test-data.service', () => ({
  MongoDBTestDataService: class { async findAll() { return []; } },
  mongoDBTestDataService: { findAll: vi.fn().mockResolvedValue([]) },
}));

// Mock MongoDB repositories
vi.mock('../db/repositories/mongo', () => ({
  testFlowRepository: {
    findById: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  workflowRepository: {
    findById: vi.fn(),
  },
  executionRepository: {
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  userRepository: {
    findById: vi.fn().mockResolvedValue({ id: 'test-user-123' }),
  },
}));

describe('Vero Agent Routes', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/vero', veroRoutes);
  });

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('POST /api/vero/agent/generate', () => {
    it('should generate Vero code from English steps', async () => {
      const mockVeroAgentResponse = {
        vero_code: `feature GeneratedFeature

scenario "Generated Scenario"
    navigate to "https://example.com"
    click "Login"
end
`,
        new_pages: {},
        message: 'Generated successfully',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockVeroAgentResponse,
      });

      const response = await request(app)
        .post('/api/vero/agent/generate')
        .send({
          steps: 'Navigate to example.com\nClick on Login button',
          featureName: 'TestFeature',
          scenarioName: 'Test Scenario',
          useAi: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.veroCode).toContain('navigate to');
      expect(response.body.veroCode).toContain('click');
    });

    it('should return 400 when steps are missing', async () => {
      const response = await request(app)
        .post('/api/vero/agent/generate')
        .send({
          featureName: 'TestFeature',
          // Missing 'steps'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Steps are required');
    });

    it('should handle Vero Agent service errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'LLM API error' }),
      });

      const response = await request(app)
        .post('/api/vero/agent/generate')
        .send({
          steps: 'Test steps',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle Vero Agent not running', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const response = await request(app)
        .post('/api/vero/agent/generate')
        .send({
          steps: 'Test steps',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Vero Agent not available');
    });
  });

  describe('POST /api/vero/agent/run', () => {
    it('should run Vero code with self-healing', async () => {
      const mockRunResponse = {
        success: true,
        final_code: 'navigate to "/"\nclick "Login"',
        attempts: 1,
        message: 'Test passed',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRunResponse,
      });

      const response = await request(app)
        .post('/api/vero/agent/run')
        .send({
          veroCode: 'navigate to "/"\nclick "Login"',
          maxRetries: 5,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.attempts).toBe(1);
    });

    it('should return 400 when veroCode is missing', async () => {
      const response = await request(app)
        .post('/api/vero/agent/run')
        .send({
          maxRetries: 5,
          // Missing 'veroCode'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Vero code is required');
    });
  });

  describe('POST /api/vero/agent/generate-and-run', () => {
    it('should generate and run in one call', async () => {
      const mockResponse = {
        success: true,
        final_code: 'navigate to "/login"\nfill "email" with "test@test.com"',
        attempts: 2,
        message: 'Generated and executed successfully',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const response = await request(app)
        .post('/api/vero/agent/generate-and-run')
        .send({
          steps: 'Go to login page\nFill email with test@test.com',
          maxRetries: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.attempts).toBe(2);
      expect(response.body.finalCode).toContain('navigate');
    });

    it('should return 400 when steps are missing', async () => {
      const response = await request(app)
        .post('/api/vero/agent/generate-and-run')
        .send({
          maxRetries: 5,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Steps are required');
    });
  });

  describe('GET /api/vero/agent/health', () => {
    it('should return healthy status when agent is running', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'healthy',
          llm_provider: 'Gemini 2.0 Flash',
          existing_pages: 3,
        }),
      });

      const response = await request(app)
        .get('/api/vero/agent/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.agentStatus).toBe('healthy');
      expect(response.body.llmProvider).toBe('Gemini 2.0 Flash');
      expect(response.body.existingPages).toBe(3);
    });

    it('should return offline status when agent is not running', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const response = await request(app)
        .get('/api/vero/agent/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.agentStatus).toBe('offline');
    });
  });

  describe('GET /api/vero/agent/pages', () => {
    it('should return existing page objects', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pages: {
            LoginPage: {
              fields: ['emailField', 'passwordField', 'submitButton'],
            },
            HomePage: {
              fields: ['navMenu', 'searchBox'],
            },
          },
        }),
      });

      const response = await request(app)
        .get('/api/vero/agent/pages');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pages).toHaveProperty('LoginPage');
      expect(response.body.pages).toHaveProperty('HomePage');
    });

    it('should handle error when fetching pages', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const response = await request(app)
        .get('/api/vero/agent/pages');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Generation History', () => {
    describe('POST /api/vero/agent/history', () => {
      it('should save generation to history', async () => {
        const response = await request(app)
          .post('/api/vero/agent/history')
          .send({
            steps: 'Navigate to login page',
            generatedCode: 'navigate to "/login"',
            featureName: 'LoginFeature',
            scenarioName: 'Login Test',
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.entry).toHaveProperty('id');
        expect(response.body.entry.steps).toBe('Navigate to login page');
        expect(response.body.entry.generatedCode).toBe('navigate to "/login"');
      });
    });

    describe('GET /api/vero/agent/history', () => {
      it('should return empty history initially', async () => {
        const response = await request(app)
          .get('/api/vero/agent/history');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.history)).toBe(true);
      });
    });

    describe('DELETE /api/vero/agent/history/:entryId', () => {
      it('should delete history entry', async () => {
        // First, create an entry
        const createResponse = await request(app)
          .post('/api/vero/agent/history')
          .send({
            steps: 'Test steps',
            generatedCode: 'test code',
            featureName: 'Test',
            scenarioName: 'Test',
          });

        const entryId = createResponse.body.entry.id;

        // Then delete it
        const deleteResponse = await request(app)
          .delete(`/api/vero/agent/history/${entryId}`);

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.success).toBe(true);
      });
    });
  });

  describe('Streaming Generation', () => {
    describe('POST /api/vero/agent/generate-stream', () => {
      it('should return 400 when steps are missing', async () => {
        const response = await request(app)
          .post('/api/vero/agent/generate-stream')
          .send({
            featureName: 'Test',
          });

        expect(response.status).toBe(400);
      });

      it('should stream progress updates', async () => {
        const mockResponse = {
          vero_code: 'navigate to "/"',
          new_pages: {},
          message: 'Success',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const response = await request(app)
          .post('/api/vero/agent/generate-stream')
          .send({
            steps: 'Navigate to home page',
          });

        // SSE response
        expect(response.headers['content-type']).toContain('text/event-stream');
      });
    });
  });
});

describe('Error Handling', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/vero', veroRoutes);
  });

  it('should handle malformed JSON in request body', async () => {
    const response = await request(app)
      .post('/api/vero/agent/generate')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }');

    expect(response.status).toBe(400);
  });
});
