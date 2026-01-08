import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { AgentService, GenerationRequest, GenerationResult } from '../services/agent.service';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Mock prisma
vi.mock('../db/prisma', () => ({
  prisma: {
    agent: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock config
vi.mock('../config', () => ({
  config: {
    jwt: {
      secret: 'test-secret',
    },
  },
}));

describe('AgentService', () => {
  let agentService: AgentService;

  beforeEach(() => {
    agentService = new AgentService();
    mockFetch.mockReset();
    agentService.clearCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateVeroCode', () => {
    it('should generate Vero code successfully', async () => {
      const mockResponse = {
        vero_code: 'navigate to "https://example.com"\nclick "Login"',
        new_pages: {},
        message: 'Generated successfully',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const request: GenerationRequest = {
        steps: 'Navigate to example.com\nClick on Login button',
        featureName: 'TestFeature',
        scenarioName: 'Test Scenario',
        useAi: true,
      };

      const result = await agentService.generateVeroCode(request);

      expect(result.success).toBe(true);
      expect(result.veroCode).toBe(mockResponse.vero_code);
      expect(result.newPages).toEqual({});
      expect(result.message).toBe('Generated successfully');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5001/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should return error when API call fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Generation failed' }),
      });

      const request: GenerationRequest = {
        steps: 'Some test steps',
      };

      const result = await agentService.generateVeroCode(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Generation failed');
    });

    it('should return cached result for duplicate requests', async () => {
      const mockResponse = {
        vero_code: 'navigate to "https://example.com"',
        new_pages: {},
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const request: GenerationRequest = {
        steps: 'Navigate to example.com',
      };

      // First call - should make API request
      const result1 = await agentService.generateVeroCode(request);
      expect(result1.success).toBe(true);
      expect(result1.cached).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await agentService.generateVeroCode(request);
      expect(result2.success).toBe(true);
      expect(result2.cached).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API call
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const request: GenerationRequest = {
        steps: 'Test steps',
      };

      const result = await agentService.generateVeroCode(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Vero Agent not available');
    });

    it('should normalize request for cache key generation', async () => {
      const mockResponse = {
        vero_code: 'navigate to "https://example.com"',
        new_pages: {},
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      // Same steps with different casing and whitespace
      const request1: GenerationRequest = { steps: '  Navigate to Example.com  ' };
      const request2: GenerationRequest = { steps: 'navigate to example.com' };

      await agentService.generateVeroCode(request1);
      await agentService.generateVeroCode(request2);

      // Should only make 1 API call due to normalized cache key
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkAgentHealth', () => {
    it('should return healthy status when agent is running', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'healthy',
          llm_provider: 'Gemini 2.0 Flash',
          existing_pages: 5,
        }),
      });

      const result = await agentService.checkAgentHealth();

      expect(result.healthy).toBe(true);
      expect(result.status).toBe('healthy');
      expect(result.llmProvider).toBe('Gemini 2.0 Flash');
      expect(result.existingPages).toBe(5);
    });

    it('should return offline status when agent is not running', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await agentService.checkAgentHealth();

      expect(result.healthy).toBe(false);
      expect(result.status).toBe('offline');
    });
  });

  describe('buildContext', () => {
    it('should return context data from agent', async () => {
      const mockContext = {
        existingPages: ['LoginPage', 'HomePage'],
        existingFeatures: ['Authentication', 'Navigation'],
        reusableSelectors: {
          loginButton: 'testId "login-btn"',
          emailField: 'label "Email"',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockContext,
      });

      const result = await agentService.buildContext('/path/to/project');

      expect(result.existingPages).toEqual(['LoginPage', 'HomePage']);
      expect(result.existingFeatures).toEqual(['Authentication', 'Navigation']);
      expect(result.reusableSelectors).toHaveProperty('loginButton');
    });

    it('should return empty context on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await agentService.buildContext('/path/to/project');

      expect(result.existingPages).toEqual([]);
      expect(result.existingFeatures).toEqual([]);
      expect(result.reusableSelectors).toEqual({});
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      const mockResponse = {
        vero_code: 'test code',
        new_pages: {},
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const request: GenerationRequest = { steps: 'Test steps' };

      // First call
      await agentService.generateVeroCode(request);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Clear cache
      agentService.clearCache();

      // Should make new API call
      await agentService.generateVeroCode(request);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should return cache stats', () => {
      const stats = agentService.getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('ttl');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.ttl).toBe('number');
    });
  });

  describe('saveGenerationHistory', () => {
    it('should create history entry with generated id', async () => {
      const entry = {
        steps: 'Navigate to login page',
        generatedCode: 'navigate to "/login"',
        featureName: 'LoginFeature',
        scenarioName: 'Login Test',
      };

      const result = await agentService.saveGenerationHistory('user-123', entry);

      expect(result).toHaveProperty('id');
      expect(result.userId).toBe('user-123');
      expect(result.steps).toBe(entry.steps);
      expect(result.generatedCode).toBe(entry.generatedCode);
      expect(result.featureName).toBe(entry.featureName);
      expect(result.scenarioName).toBe(entry.scenarioName);
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });
});

describe('GenerationRequest validation', () => {
  it('should handle missing optional fields', async () => {
    const agentService = new AgentService();

    const mockResponse = {
      vero_code: 'navigate to "/"',
      new_pages: {},
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const request: GenerationRequest = {
      steps: 'Navigate to home page',
      // No optional fields
    };

    const result = await agentService.generateVeroCode(request);

    expect(result.success).toBe(true);

    // Verify default values were used in API call
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.feature_name).toBe('GeneratedFeature');
    expect(body.scenario_name).toBe('Generated Scenario');
    expect(body.use_ai).toBe(true);
  });

  it('should pass custom feature and scenario names', async () => {
    const agentService = new AgentService();

    const mockResponse = {
      vero_code: 'navigate to "/"',
      new_pages: {},
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const request: GenerationRequest = {
      steps: 'Test steps',
      featureName: 'CustomFeature',
      scenarioName: 'Custom Scenario',
      useAi: false,
      url: 'https://example.com',
    };

    await agentService.generateVeroCode(request);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.feature_name).toBe('CustomFeature');
    expect(body.scenario_name).toBe('Custom Scenario');
    expect(body.use_ai).toBe(false);
    expect(body.url).toBe('https://example.com');
  });
});
