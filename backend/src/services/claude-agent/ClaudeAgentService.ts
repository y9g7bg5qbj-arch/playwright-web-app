/**
 * Claude Agent Service
 *
 * Main orchestrator for the Claude-powered test automation agent.
 * Converts natural language test steps into Playwright actions using skills and hooks.
 */

import type { Page, Browser, BrowserContext } from 'playwright';
import { chromium } from 'playwright';
import type { NaturalLanguageStep, ExecutionContext, ExecutionConfig } from './interfaces';
import { SkillRegistry } from './SkillRegistry';
import type { PlaywrightClient } from './interfaces/PlaywrightClient';
import { DirectPlaywrightClient } from './clients/DirectPlaywrightClient';
import { generateVeroAction } from '../veroSyntaxReference';
import { logger } from '../../utils/logger';

/** Options for starting an agent session */
export interface AgentSessionOptions {
  /** Browser to use (creates new if not provided) */
  browser?: Browser;

  /** Page to use (creates new if not provided) */
  page?: Page;

  /** Browser context to use */
  context?: BrowserContext;

  /** Headless mode */
  headless?: boolean;

  /** Project path for page object storage */
  projectPath: string;

  /** Viewport size */
  viewport?: { width: number; height: number };

  /** Default timeout for actions */
  timeout?: number;

  /** Whether to use selector caching */
  useSelectorCache?: boolean;

  /** Whether to generate Vero code */
  generateVeroCode?: boolean;
}

/** Result of executing a single step */
export interface StepExecutionResult {
  success: boolean;
  step: NaturalLanguageStep;
  playwrightCode?: string;
  veroCode?: string;
  error?: string;
  durationMs: number;
  skillsUsed: string[];
  screenshot?: string;
}

/** Result of executing all steps */
export interface SessionExecutionResult {
  success: boolean;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  stepResults: StepExecutionResult[];
  generatedVeroCode?: string;
  generatedPlaywrightCode?: string;
  totalDurationMs: number;
}

/** Event emitted during execution */
export interface ExecutionEvent {
  type: 'step-start' | 'step-complete' | 'step-error' | 'session-start' | 'session-complete';
  stepIndex?: number;
  step?: NaturalLanguageStep;
  result?: StepExecutionResult;
  error?: string;
  timestamp: Date;
}

/** Event listener type */
export type ExecutionEventListener = (event: ExecutionEvent) => void;

/**
 * Claude Agent Service
 *
 * Orchestrates test execution using the skill-based architecture.
 */
export class ClaudeAgentService {
  private registry: SkillRegistry;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private playwrightClient: PlaywrightClient | null = null;
  private config: ExecutionConfig;
  private ownsBrowser: boolean = false;
  private eventListeners: ExecutionEventListener[] = [];
  private generatedVeroLines: string[] = [];
  private generatedPlaywrightLines: string[] = [];

  constructor(registry?: SkillRegistry) {
    this.registry = registry || new SkillRegistry();
    this.config = this.getDefaultConfig();
  }

  /**
   * Get the skill registry for registering skills and hooks
   */
  getRegistry(): SkillRegistry {
    return this.registry;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): ExecutionConfig {
    return {
      useSelectorCache: true,
      storeSelectorCache: true,
      projectPath: process.cwd(),
      actionTimeout: 30000,
      screenshotOnFailure: true,
      generateVeroCode: true,
    };
  }

  /**
   * Start an agent session
   */
  async startSession(options: AgentSessionOptions): Promise<void> {
    // Update configuration
    this.config = {
      ...this.config,
      projectPath: options.projectPath,
      actionTimeout: options.timeout || 30000,
      useSelectorCache: options.useSelectorCache ?? true,
      generateVeroCode: options.generateVeroCode ?? true,
    };

    // Use provided browser/page or create new ones
    if (options.page) {
      this.page = options.page;
      this.context = options.context || options.page.context();
      this.browser = this.context.browser() || null;
      this.ownsBrowser = false;
    } else if (options.browser) {
      this.browser = options.browser;
      this.context = await this.browser.newContext({
        viewport: options.viewport || { width: 1280, height: 720 },
      });
      this.page = await this.context.newPage();
      this.ownsBrowser = false;
    } else {
      // Launch new browser
      this.browser = await chromium.launch({
        headless: options.headless ?? true,
      });
      this.context = await this.browser.newContext({
        viewport: options.viewport || { width: 1280, height: 720 },
      });
      this.page = await this.context.newPage();
      this.ownsBrowser = true;
    }

    // Create Playwright client
    this.playwrightClient = new DirectPlaywrightClient(this.page, this.context);

    // Reset generated code
    this.generatedVeroLines = [];
    this.generatedPlaywrightLines = [];

    logger.info('[ClaudeAgentService] Session started');
  }

  /**
   * End the agent session
   */
  async endSession(): Promise<void> {
    if (this.ownsBrowser && this.browser) {
      await this.browser.close();
    }

    this.browser = null;
    this.context = null;
    this.page = null;
    this.playwrightClient = null;

    logger.info('[ClaudeAgentService] Session ended');
  }

  /**
   * Get the current page
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * Get the Playwright client
   */
  getPlaywrightClient(): PlaywrightClient | null {
    return this.playwrightClient;
  }

  /**
   * Add an event listener
   */
  addEventListener(listener: ExecutionEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove an event listener
   */
  removeEventListener(listener: ExecutionEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index !== -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit an event
   */
  private emitEvent(event: ExecutionEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        logger.error('[ClaudeAgentService] Error in event listener:', error);
      }
    }
  }

  /**
   * Parse a natural language step
   */
  parseStep(rawStep: string, index?: number): NaturalLanguageStep {
    const lower = rawStep.toLowerCase().trim();

    // Determine action type
    let action: NaturalLanguageStep['action'] = 'unknown';
    let target: string | undefined;
    let value: string | undefined;

    // Click patterns
    if (lower.match(/\b(click|tap|press)\b/)) {
      action = 'click';
      // Extract target
      const clickMatch = rawStep.match(/(?:click|tap|press)\s+(?:on\s+)?(?:the\s+)?["']?(.+?)["']?\s*(?:button|link|element)?$/i);
      if (clickMatch) target = clickMatch[1].trim();
    }
    // Fill patterns
    else if (lower.match(/\b(fill|type|enter|input)\b.*\b(with|into|in)\b/)) {
      action = 'fill';
      // Extract target and value
      const fillMatch = rawStep.match(/(?:fill|type|enter|input)\s+(?:in(?:to)?\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:with|field)\s+["'](.+?)["']/i);
      if (fillMatch) {
        target = fillMatch[1].trim();
        value = fillMatch[2];
      } else {
        // Alternative pattern: "type 'value' in 'field'"
        const altMatch = rawStep.match(/(?:type|enter)\s+["'](.+?)["']\s+(?:in(?:to)?|on)\s+(?:the\s+)?["']?(.+?)["']?/i);
        if (altMatch) {
          value = altMatch[1];
          target = altMatch[2].trim();
        }
      }
    }
    // Select patterns
    else if (lower.match(/\b(select|choose|pick)\b/)) {
      action = 'select';
      const selectMatch = rawStep.match(/(?:select|choose|pick)\s+["'](.+?)["']\s+(?:from|in)\s+(?:the\s+)?["']?(.+?)["']?/i);
      if (selectMatch) {
        value = selectMatch[1];
        target = selectMatch[2].trim();
      }
    }
    // Check/Uncheck patterns
    else if (lower.match(/\b(check)\b/) && !lower.match(/\bcheck\s+that\b/)) {
      action = 'check';
      const checkMatch = rawStep.match(/check\s+(?:the\s+)?["']?(.+?)["']?$/i);
      if (checkMatch) target = checkMatch[1].trim();
    }
    else if (lower.match(/\buncheck\b/)) {
      action = 'uncheck';
      const uncheckMatch = rawStep.match(/uncheck\s+(?:the\s+)?["']?(.+?)["']?$/i);
      if (uncheckMatch) target = uncheckMatch[1].trim();
    }
    // Hover patterns
    else if (lower.match(/\bhover\b/)) {
      action = 'hover';
      const hoverMatch = rawStep.match(/hover\s+(?:over\s+)?(?:the\s+)?["']?(.+?)["']?$/i);
      if (hoverMatch) target = hoverMatch[1].trim();
    }
    // Navigate patterns
    else if (lower.match(/\b(go\s*to|navigate|open|visit)\b/)) {
      action = 'navigate';
      const navMatch = rawStep.match(/(?:go\s*to|navigate\s+to|open|visit)\s+["']?(.+?)["']?$/i);
      if (navMatch) value = navMatch[1].trim();
    }
    // Wait patterns
    else if (lower.match(/\bwait\b/)) {
      action = 'wait';
      const waitMatch = rawStep.match(/wait\s+(?:for\s+)?["']?(.+?)["']?/i);
      if (waitMatch) target = waitMatch[1].trim();
    }
    // Assert patterns
    else if (lower.match(/\b(assert|verify|check\s+that|ensure|confirm)\b/)) {
      action = 'assert';
      target = rawStep;
    }

    return {
      raw: rawStep,
      action,
      target,
      value,
      originalIndex: index,
    };
  }

  /**
   * Execute a single natural language step
   */
  async executeStep(step: NaturalLanguageStep): Promise<StepExecutionResult> {
    const startTime = Date.now();

    if (!this.page || !this.playwrightClient) {
      return {
        success: false,
        step,
        error: 'Session not started. Call startSession() first.',
        durationMs: Date.now() - startTime,
        skillsUsed: [],
      };
    }

    this.emitEvent({
      type: 'step-start',
      stepIndex: step.originalIndex,
      step,
      timestamp: new Date(),
    });

    // Create execution context
    const context: ExecutionContext = {
      step,
      page: this.page,
      url: this.page.url(),
      metadata: {},
      config: this.config,
    };

    try {
      // Execute skills
      const result = await this.registry.executeSkills(context);

      const stepResult: StepExecutionResult = {
        success: result.success,
        step,
        playwrightCode: result.executeResult?.playwrightCode,
        veroCode: result.executeResult?.veroCode,
        error: result.error,
        durationMs: result.totalDurationMs,
        skillsUsed: result.skillsExecuted,
      };

      // Collect generated code
      if (result.executeResult?.veroCode) {
        this.generatedVeroLines.push(result.executeResult.veroCode);
      }
      if (result.executeResult?.playwrightCode) {
        this.generatedPlaywrightLines.push(result.executeResult.playwrightCode);
      }

      // Take screenshot on failure if configured
      if (!result.success && this.config.screenshotOnFailure) {
        try {
          const screenshotBuffer = await this.page.screenshot();
          stepResult.screenshot = screenshotBuffer.toString('base64');
        } catch {
          // Ignore screenshot errors
        }
      }

      this.emitEvent({
        type: result.success ? 'step-complete' : 'step-error',
        stepIndex: step.originalIndex,
        step,
        result: stepResult,
        error: result.error,
        timestamp: new Date(),
      });

      return stepResult;

    } catch (error) {
      const stepResult: StepExecutionResult = {
        success: false,
        step,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
        skillsUsed: [],
      };

      this.emitEvent({
        type: 'step-error',
        stepIndex: step.originalIndex,
        step,
        result: stepResult,
        error: stepResult.error,
        timestamp: new Date(),
      });

      return stepResult;
    }
  }

  /**
   * Execute a raw natural language step string
   */
  async executeRawStep(rawStep: string, index?: number): Promise<StepExecutionResult> {
    const step = this.parseStep(rawStep, index);
    return this.executeStep(step);
  }

  /**
   * Execute multiple steps
   */
  async executeSteps(rawSteps: string[]): Promise<SessionExecutionResult> {
    const startTime = Date.now();
    const stepResults: StepExecutionResult[] = [];
    let passedSteps = 0;
    let failedSteps = 0;

    this.emitEvent({
      type: 'session-start',
      timestamp: new Date(),
    });

    for (let i = 0; i < rawSteps.length; i++) {
      const rawStep = rawSteps[i].trim();
      if (!rawStep || rawStep.startsWith('#')) {
        // Skip empty lines and comments
        continue;
      }

      const result = await this.executeRawStep(rawStep, i);
      stepResults.push(result);

      if (result.success) {
        passedSteps++;
      } else {
        failedSteps++;
        // Optionally stop on first failure
        // if (this.config.stopOnFirstFailure) break;
      }
    }

    const sessionResult: SessionExecutionResult = {
      success: failedSteps === 0,
      totalSteps: stepResults.length,
      passedSteps,
      failedSteps,
      stepResults,
      generatedVeroCode: this.generatedVeroLines.join('\n'),
      generatedPlaywrightCode: this.wrapPlaywrightCode(this.generatedPlaywrightLines),
      totalDurationMs: Date.now() - startTime,
    };

    this.emitEvent({
      type: 'session-complete',
      timestamp: new Date(),
    });

    return sessionResult;
  }

  /**
   * Wrap generated Playwright lines in a test file
   */
  private wrapPlaywrightCode(lines: string[]): string {
    if (lines.length === 0) return '';

    return `import { test, expect } from '@playwright/test';

test('Generated Test', async ({ page }) => {
  ${lines.join('\n  ')}
});
`;
  }

  /**
   * Navigate to a URL (convenience method)
   * Uses veroSyntaxReference.ts as single source of truth
   */
  async navigateTo(url: string): Promise<StepExecutionResult> {
    return this.executeRawStep(generateVeroAction('open', undefined, url));
  }

  /**
   * Click an element (convenience method)
   * Uses veroSyntaxReference.ts as single source of truth
   */
  async click(target: string): Promise<StepExecutionResult> {
    return this.executeRawStep(generateVeroAction('click', `"${target}"`));
  }

  /**
   * Fill an input (convenience method)
   * Uses veroSyntaxReference.ts as single source of truth
   */
  async fill(target: string, value: string): Promise<StepExecutionResult> {
    return this.executeRawStep(generateVeroAction('fill', `"${target}"`, value));
  }
}

// Factory function for creating configured agent
export function createClaudeAgent(registry?: SkillRegistry): ClaudeAgentService {
  return new ClaudeAgentService(registry);
}
