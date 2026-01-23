/**
 * Agent Service
 * NOW USES MONGODB INSTEAD OF PRISMA
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { agentRepository } from '../db/repositories/mongo';
import { config } from '../config';
import { NotFoundError } from '../utils/errors';

const SALT_ROUNDS = 10;
const VERO_AGENT_URL = process.env.VERO_AGENT_URL || 'http://localhost:5001';

// Types for AI generation
export interface GenerationRequest {
  steps: string;
  url?: string;
  featureName?: string;
  scenarioName?: string;
  useAi?: boolean;
  projectPath?: string;
}

export interface GenerationResult {
  success: boolean;
  veroCode?: string;
  newPages?: Record<string, string>;
  message?: string;
  error?: string;
  cached?: boolean;
}

export interface GenerationHistoryEntry {
  id: string;
  userId: string;
  steps: string;
  generatedCode: string;
  featureName: string;
  scenarioName: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

// Simple in-memory cache for generation results
const generationCache = new Map<string, { result: GenerationResult; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class AgentService {
  // ============= AGENT CRUD =============

  async createAgent(userId: string, name: string): Promise<{ agentId: string; token: string }> {
    const randomToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(randomToken, SALT_ROUNDS);

    const agent = await agentRepository.create({
      userId,
      name,
      tokenHash,
      status: 'offline',
    });

    const jwtToken = jwt.sign({ agentId: agent.id }, config.jwt.secret, {
      expiresIn: '7d',
    });

    return {
      agentId: agent.id,
      token: jwtToken,
    };
  }

  async listAgents(userId: string) {
    return agentRepository.findByUserId(userId);
  }

  async getAgent(agentId: string) {
    const agent = await agentRepository.findById(agentId);

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    return agent;
  }

  async deleteAgent(agentId: string, userId: string) {
    const agents = await agentRepository.findByUserId(userId);
    const agent = agents.find(a => a.id === agentId);

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    await agentRepository.delete(agentId);
  }

  async updateAgentStatus(agentId: string, status: string) {
    await agentRepository.update(agentId, {
      status: status as 'online' | 'offline' | 'busy',
      lastSeenAt: new Date(),
    });
  }

  // ============= AI GENERATION =============

  /**
   * Generate Vero code from plain English steps
   * Uses caching to avoid duplicate API calls
   */
  async generateVeroCode(request: GenerationRequest): Promise<GenerationResult> {
    const cacheKey = this.getCacheKey(request);

    // Check cache first
    const cached = generationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { ...cached.result, cached: true };
    }

    try {
      const response = await fetch(`${VERO_AGENT_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps: request.steps,
          url: request.url,
          feature_name: request.featureName || 'GeneratedFeature',
          scenario_name: request.scenarioName || 'Generated Scenario',
          use_ai: request.useAi !== false,
          project_path: request.projectPath,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || 'Generation failed',
        };
      }

      const result: GenerationResult = {
        success: true,
        veroCode: data.vero_code,
        newPages: data.new_pages || {},
        message: data.message,
      };

      // Cache the result
      generationCache.set(cacheKey, { result, timestamp: Date.now() });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Vero Agent not available. Is it running on ${VERO_AGENT_URL}?`,
      };
    }
  }

  /**
   * Check if the Vero Agent is healthy
   */
  async checkAgentHealth(): Promise<{
    healthy: boolean;
    status: string;
    llmProvider?: string;
    existingPages?: number;
  }> {
    try {
      const response = await fetch(`${VERO_AGENT_URL}/health`);
      const data = await response.json();

      return {
        healthy: data.status === 'healthy',
        status: data.status,
        llmProvider: data.llm_provider,
        existingPages: data.existing_pages,
      };
    } catch {
      return {
        healthy: false,
        status: 'offline',
      };
    }
  }

  /**
   * Build context for AI prompts from existing project files
   */
  async buildContext(projectPath: string): Promise<{
    existingPages: string[];
    existingFeatures: string[];
    reusableSelectors: Record<string, string>;
  }> {
    try {
      const response = await fetch(`${VERO_AGENT_URL}/api/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_path: projectPath }),
      });

      if (!response.ok) {
        return { existingPages: [], existingFeatures: [], reusableSelectors: {} };
      }

      return await response.json();
    } catch {
      return { existingPages: [], existingFeatures: [], reusableSelectors: {} };
    }
  }

  /**
   * Save a generation to history
   */
  async saveGenerationHistory(
    userId: string,
    entry: Omit<GenerationHistoryEntry, 'id' | 'userId' | 'createdAt'>
  ): Promise<GenerationHistoryEntry> {
    // Store in database using a generic JSON field or separate table
    // For now, using in-memory storage as a demo
    const id = crypto.randomUUID();
    const historyEntry: GenerationHistoryEntry = {
      id,
      userId,
      ...entry,
      createdAt: new Date(),
    };

    // Could persist to database here
    return historyEntry;
  }

  /**
   * Clear the generation cache
   */
  clearCache(): void {
    generationCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; ttl: number } {
    return {
      size: generationCache.size,
      ttl: CACHE_TTL,
    };
  }

  // ============= HELPERS =============

  private getCacheKey(request: GenerationRequest): string {
    const normalized = {
      steps: request.steps.trim().toLowerCase(),
      url: request.url || '',
      featureName: request.featureName || 'GeneratedFeature',
      useAi: request.useAi !== false,
    };
    return crypto.createHash('md5').update(JSON.stringify(normalized)).digest('hex');
  }
}
