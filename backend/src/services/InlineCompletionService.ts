/**
 * InlineCompletionService - AI-powered inline code completions for Vero DSL
 *
 * Provides GitHub Copilot-style ghost text suggestions using the user's
 * configured AI provider (Gemini, OpenAI, or Anthropic).
 */

import { VERO_SYNTAX_COMPACT } from './veroSyntaxReference';
import { aiSettingsRepository } from '../db/repositories/mongo';
import { logger } from '../utils/logger';

// ============================================
// Types
// ============================================

export interface InlineCompletionRequest {
  /** Current line content up to cursor */
  currentLine: string;
  /** Cursor column position (1-indexed) */
  column: number;
  /** Previous lines for context (up to 10) */
  prefixLines: string[];
  /** Current scope information */
  scope: {
    type: 'page' | 'feature' | 'scenario' | 'action' | 'global';
    name?: string;
    parentPage?: string;
  };
  /** Available pages for autocomplete context */
  availablePages: Array<{
    name: string;
    fields: string[];
  }>;
}

export interface InlineCompletionResponse {
  completions: Array<{
    insertText: string;
  }>;
}

// ============================================
// Fast models for each provider (low latency)
// ============================================

const FAST_MODELS = {
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
} as const;

// ============================================
// Vero DSL System Prompt
// ============================================

const VERO_SYSTEM_PROMPT = `You are an expert Vero DSL code completion assistant. Vero is a domain-specific language for browser test automation.

${VERO_SYNTAX_COMPACT}

Completion rules:
1. Only return the completion text, not the existing code
2. Keep completions short (1-2 lines max for mid-line, up to 5 lines at block starts)
3. Match the indentation and style of surrounding code
4. Prefer common patterns and idioms
5. Complete keywords, field references, and actions
6. SCENARIO names are PascalCase identifiers (NOT quoted strings)
7. Use PERFORM for page action calls

Examples:
- "CLICK " → complete with field reference like "LoginPage.submitButton"
- "FILL " → complete with "PageName.field WITH \\"value\\""
- "VERIFY " → complete with assertion like "element IS VISIBLE"
- "OPEN " → complete with URL like "\\"https://example.com\\""
- "SCENARIO " → complete with PascalCase identifier like "UserCanLogin"
- "PERFORM " → complete with "PageName.action WITH args"
- "WAIT " → complete with "2 SECONDS" or "FOR element"`;

// ============================================
// InlineCompletionService
// ============================================

export class InlineCompletionService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Get inline completions for the current cursor position
   */
  async getCompletions(request: InlineCompletionRequest): Promise<InlineCompletionResponse> {
    // Get user's AI settings
    const settings = await aiSettingsRepository.findByUserId(this.userId);

    if (!settings) {
      return { completions: [] };
    }

    // Check if user has API key configured for their provider
    const provider = settings.provider || 'gemini';
    const apiKey = this.getApiKey(settings, provider);

    if (!apiKey) {
      return { completions: [] };
    }

    // Build the prompt
    const prompt = this.buildPrompt(request);

    // Call the AI provider with timeout
    try {
      const completion = await Promise.race([
        this.callProvider(provider, apiKey, prompt),
        this.timeout(3000), // 3 second timeout
      ]);

      if (!completion) {
        return { completions: [] };
      }

      // Clean and return the completion
      const cleanedCompletion = this.cleanCompletion(completion, request);
      if (!cleanedCompletion) {
        return { completions: [] };
      }

      return {
        completions: [{ insertText: cleanedCompletion }],
      };
    } catch (error) {
      logger.error('[InlineCompletion] Error getting completion:', error);
      return { completions: [] };
    }
  }

  /**
   * Get API key for the specified provider
   */
  private getApiKey(settings: any, provider: string): string | null {
    switch (provider) {
      case 'gemini':
        return settings.geminiApiKey || process.env.GOOGLE_GEMINI_API_KEY || null;
      case 'openai':
        return settings.openaiApiKey || process.env.OPENAI_API_KEY || null;
      case 'anthropic':
        return settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY || null;
      default:
        return null;
    }
  }

  /**
   * Build completion prompt from request context
   */
  private buildPrompt(request: InlineCompletionRequest): string {
    const { currentLine, column, prefixLines, scope, availablePages } = request;

    // Build context string
    let context = '';

    // Add scope information
    context += `Current scope: ${scope.type}`;
    if (scope.name) context += ` "${scope.name}"`;
    if (scope.parentPage) context += ` (in page: ${scope.parentPage})`;
    context += '\n\n';

    // Add available pages
    if (availablePages.length > 0) {
      context += 'Available pages:\n';
      for (const page of availablePages.slice(0, 5)) {
        context += `- ${page.name}: ${page.fields.slice(0, 5).join(', ')}`;
        if (page.fields.length > 5) context += `, ...`;
        context += '\n';
      }
      context += '\n';
    }

    // Add prefix lines for context
    if (prefixLines.length > 0) {
      context += 'Previous lines:\n```vero\n';
      context += prefixLines.slice(-5).join('\n');
      context += '\n```\n\n';
    }

    // Add current line with cursor position marker
    const beforeCursor = currentLine.substring(0, column - 1);
    context += `Current line (complete after cursor): "${beforeCursor}|"`;

    return context;
  }

  /**
   * Call the AI provider
   */
  private async callProvider(provider: string, apiKey: string, prompt: string): Promise<string | null> {
    switch (provider) {
      case 'gemini':
        return this.callGemini(apiKey, prompt);
      case 'openai':
        return this.callOpenAI(apiKey, prompt);
      case 'anthropic':
        return this.callAnthropic(apiKey, prompt);
      default:
        return null;
    }
  }

  /**
   * Call Gemini API
   */
  private async callGemini(apiKey: string, prompt: string): Promise<string | null> {
    const model = FAST_MODELS.gemini;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${VERO_SYSTEM_PROMPT}\n\n${prompt}` }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.2,
          topP: 0.8,
        },
      }),
    });

    if (!response.ok) {
      logger.error('[InlineCompletion] Gemini error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(apiKey: string, prompt: string): Promise<string | null> {
    const model = FAST_MODELS.openai;
    const url = 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: VERO_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 100,
        temperature: 0.2,
        top_p: 0.8,
      }),
    });

    if (!response.ok) {
      logger.error('[InlineCompletion] OpenAI error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropic(apiKey: string, prompt: string): Promise<string | null> {
    const model = FAST_MODELS.anthropic;
    const url = 'https://api.anthropic.com/v1/messages';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 100,
        system: VERO_SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      logger.error('[InlineCompletion] Anthropic error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.content?.[0]?.text || null;
  }

  /**
   * Timeout helper
   */
  private timeout(ms: number): Promise<null> {
    return new Promise((resolve) => setTimeout(() => resolve(null), ms));
  }

  /**
   * Clean up the completion text
   */
  private cleanCompletion(completion: string, request: InlineCompletionRequest): string | null {
    let text = completion.trim();

    // Remove markdown code blocks if present
    text = text.replace(/^```(?:vero)?\n?/i, '').replace(/\n?```$/i, '');

    // Remove leading quotes that might have been added
    text = text.replace(/^["']/, '').replace(/["']$/, '');

    // Don't return empty completions
    if (!text || text.length === 0) {
      return null;
    }

    // Don't return if it's just repeating what's already there
    const beforeCursor = request.currentLine.substring(0, request.column - 1);
    if (beforeCursor.endsWith(text)) {
      return null;
    }

    // Limit to reasonable length (prevent runaway completions)
    const lines = text.split('\n');
    if (lines.length > 5) {
      text = lines.slice(0, 5).join('\n');
    }

    return text;
  }
}

export default InlineCompletionService;
