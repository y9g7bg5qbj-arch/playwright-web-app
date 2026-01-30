/**
 * AIRecorderService - Convert plain English test scenarios to Vero scripts
 *
 * Features:
 * - Pool-based parallel execution (5 concurrent browsers)
 * - Retry logic (10 attempts, exponential backoff)
 * - Fail-fast (30s timeout per attempt)
 * - Browser automation (TODO: Integrate ClaudeAgentService)
 * - WebSocket event emission for real-time updates
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import {
  aiRecorderSessionRepository,
  aiRecorderTestCaseRepository,
  aiRecorderStepRepository
} from '../db/repositories/mongo';
import { browserCaptureService, CapturedAction } from './aiRecorder.browserCapture';
import { logger } from '../utils/logger';
import { fixVeroSyntax, generateVeroPage, generateVeroFeature, generateVeroAction, generateVeroAssertion } from './veroSyntaxReference';

// TODO: Import from ClaudeAgentService when ready
// import { ClaudeAgentService } from './claude-agent/ClaudeAgentService';

// Placeholder types - will be replaced by ClaudeAgentService types
interface ActResult {
  success: boolean;
  message?: string;
  action?: string;
}

interface RecordedAction {
  instruction: string;
  action?: string;
  selectors?: ExtractedSelectors;
  screenshot?: string;
}

interface ExtractedSelectors {
  testId: string | null;
  role: string | null;
  roleWithName: string | null;
  label: string | null;
  placeholder: string | null;
  text: string | null;
  title: string | null;
  alt: string | null;
  css: string | null;
  tagName: string;
  isUnique: Record<string, boolean>;
  recommended: string;
  recommendedType: string;
}

// Placeholder for browser automation service
// TODO: Replace with ClaudeAgentService
class BrowserAutomationService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private recording: boolean = false;
  private recordedActions: RecordedAction[] = [];

  constructor(_config: Record<string, unknown>) {
    // Config will be used when ClaudeAgentService is integrated
  }

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }

  async navigateTo(url: string): Promise<{ success: boolean }> {
    if (!this.page) throw new Error('Browser not initialized');
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    return { success: true };
  }

  async startRecording(_url: string): Promise<void> {
    this.recording = true;
    this.recordedActions = [];
  }

  stopRecording(): { actions: RecordedAction[] } {
    this.recording = false;
    return { actions: this.recordedActions };
  }

  async act(instruction: string): Promise<ActResult> {
    // TODO: Integrate with ClaudeAgentService for intelligent action execution
    logger.info(`[BrowserAutomation] Action requested: ${instruction}`);
    return {
      success: false,
      message: 'Browser automation is being upgraded. Please use manual step entry.',
    };
  }

  async actAndRecord(instruction: string): Promise<{ actResult: ActResult; recordedAction: RecordedAction }> {
    const actResult = await this.act(instruction);
    const recordedAction: RecordedAction = {
      instruction,
      action: instruction,
    };
    if (this.recording) {
      this.recordedActions.push(recordedAction);
    }
    return { actResult, recordedAction };
  }

  async observe(): Promise<void> {
    // TODO: Implement with ClaudeAgentService
  }

  async takeScreenshot(): Promise<string | null> {
    if (!this.page) return null;
    try {
      const buffer = await this.page.screenshot();
      return buffer.toString('base64');
    } catch {
      return null;
    }
  }

  async findBestSelector(_description: string): Promise<string | null> {
    // TODO: Implement with ClaudeAgentService
    return null;
  }

  getActivePage(): Page | null {
    return this.page;
  }

  getBrowserContext(): BrowserContext | null {
    return this.context;
  }
}

// ============================================
// Configuration Constants
// ============================================

const EXECUTION_CONFIG = {
  maxConcurrent: 5, // Hardcoded for now, configurable later
  maxRetries: 10,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  backoffMultiplier: 1.5,
  stepTimeoutMs: 30000, // Fail fast - 30 second timeout per attempt
};

// ============================================
// Types
// ============================================

export interface TestStepInput {
  description: string;
  type?: 'navigate' | 'fill' | 'click' | 'assert' | 'loop' | 'wait';
}

export interface TestCaseInput {
  name: string;
  description?: string;
  steps: string[]; // Plain English steps
  targetUrl?: string;
}

export interface CreateSessionParams {
  userId: string;
  applicationId?: string;
  testCases: TestCaseInput[];
  environment?: string;
  baseUrl?: string;
  headless?: boolean;
}

export interface StepExecutionResult {
  success: boolean;
  veroCode: string | null;
  selector: string | null;
  selectorType: string | null;
  confidence: number;
  screenshotPath: string | null;
  error: string | null;
  retryCount: number;
}

export interface SessionProgress {
  sessionId: string;
  status: string;
  totalTests: number;
  completedTests: number;
  failedTests: number;
  testCases: {
    id: string;
    name: string;
    status: string;
    steps: {
      id: string;
      stepNumber: number;
      description: string;
      status: string;
      veroCode: string | null;
      retryCount: number;
    }[];
  }[];
}

// ============================================
// AIRecorderService
// ============================================

export class AIRecorderService extends EventEmitter {
  private runningPools: Map<string, AbortController> = new Map();
  // Stateful debug sessions: sessionId -> { browser, page, context }
  private debugSessions: Map<string, { browser: Browser; page: Page; context: any }> = new Map();

  constructor() {
    super();
  }

  // ----------------------------------------
  // Session Management
  // ----------------------------------------

  /**
   * Create a new AI Recorder session with test cases
   */
  async createSession(params: CreateSessionParams): Promise<string> {
    // Create session in database
    const session = await aiRecorderSessionRepository.create({
      userId: params.userId,
      applicationId: params.applicationId,
      environment: params.environment || 'staging',
      baseUrl: params.baseUrl,
      headless: params.headless ?? true,
      status: 'pending',
      totalTests: params.testCases.length,
      completedTests: 0,
      failedTests: 0,
    });

    // Create test cases with steps
    for (let i = 0; i < params.testCases.length; i++) {
      const tc = params.testCases[i];
      const testCase = await aiRecorderTestCaseRepository.create({
        sessionId: session.id,
        name: tc.name,
        description: tc.description,
        targetUrl: tc.targetUrl,
        order: i,
        status: 'pending',
        retryCount: 0,
      });

      // Create steps for this test case
      for (let j = 0; j < tc.steps.length; j++) {
        await aiRecorderStepRepository.create({
          testCaseId: testCase.id,
          stepNumber: j + 1,
          description: tc.steps[j],
          stepType: this.parseStepType(tc.steps[j]) as any,
          status: 'pending',
          retryCount: 0,
          maxRetries: EXECUTION_CONFIG.maxRetries,
          confidence: 0,
        });
      }
    }

    logger.info(`AI Recorder session created: ${session.id} with ${params.testCases.length} test cases`);
    this.emit('session:created', { sessionId: session.id });

    return session.id;
  }

  /**
   * Start processing a session
   */
  async startSession(sessionId: string, aiSettings: {
    provider: string;
    apiKey: string;
    modelName: string;
    useBrowserbase?: boolean;
    browserbaseApiKey?: string;
  }): Promise<void> {
    // Update session status
    await aiRecorderSessionRepository.update(sessionId, {
      status: 'processing',
      startedAt: new Date(),
    });

    // Get test cases with steps
    const testCases = await aiRecorderTestCaseRepository.findBySessionId(sessionId);
    const testCasesWithSteps = await Promise.all(
      testCases.map(async (tc) => ({
        ...tc,
        steps: await aiRecorderStepRepository.findByTestCaseId(tc.id)
      }))
    );

    // Create abort controller for this session
    const abortController = new AbortController();
    this.runningPools.set(sessionId, abortController);

    // Start parallel execution in background
    this.executeTestCasesInPool(sessionId, testCasesWithSteps, aiSettings, abortController.signal)
      .catch((error) => {
        logger.error(`Session ${sessionId} failed:`, error);
        this.markSessionFailed(sessionId, error.message);
      });

    this.emit('session:started', { sessionId });
  }

  /**
   * Get session progress
   */
  async getSessionProgress(sessionId: string): Promise<SessionProgress | null> {
    const session = await aiRecorderSessionRepository.findById(sessionId);

    if (!session) return null;

    const testCases = await aiRecorderTestCaseRepository.findBySessionId(sessionId);
    const testCasesWithSteps = await Promise.all(
      testCases.map(async (tc) => ({
        ...tc,
        steps: await aiRecorderStepRepository.findByTestCaseId(tc.id)
      }))
    );

    return {
      sessionId: session.id,
      status: session.status,
      totalTests: session.totalTests,
      completedTests: session.completedTests,
      failedTests: session.failedTests,
      testCases: testCasesWithSteps.map((tc) => ({
        id: tc.id,
        name: tc.name,
        status: tc.status,
        steps: tc.steps.map((s) => ({
          id: s.id,
          stepNumber: s.stepNumber,
          description: s.description,
          status: s.status,
          veroCode: s.veroCode || null,
          retryCount: s.retryCount,
        })),
      })),
    };
  }

  /**
   * Cancel a running session
   */
  async cancelSession(sessionId: string): Promise<void> {
    const abortController = this.runningPools.get(sessionId);
    if (abortController) {
      abortController.abort();
      this.runningPools.delete(sessionId);
    }

    await aiRecorderSessionRepository.update(sessionId, { status: 'cancelled' });

    this.emit('session:cancelled', { sessionId });
  }

  // ----------------------------------------
  // Parallel Execution Pool
  // ----------------------------------------

  /**
   * Execute test cases using a pool of concurrent browsers
   */
  private async executeTestCasesInPool(
    sessionId: string,
    testCases: any[],
    aiSettings: any,
    signal: AbortSignal
  ): Promise<void> {
    const queue = [...testCases];
    const running: Promise<void>[] = [];

    logger.info(`Starting pool execution for session ${sessionId} with ${queue.length} test cases`);

    while (queue.length > 0 || running.length > 0) {
      if (signal.aborted) {
        logger.info(`Session ${sessionId} aborted`);
        break;
      }

      // Fill pool up to max concurrent
      while (running.length < EXECUTION_CONFIG.maxConcurrent && queue.length > 0) {
        const testCase = queue.shift()!;
        const promise = this.executeTestCase(sessionId, testCase, aiSettings, signal)
          .finally(() => {
            // Remove from running when done
            const index = running.indexOf(promise);
            if (index > -1) running.splice(index, 1);
          });
        running.push(promise);
      }

      // Wait for at least one to complete before checking again
      if (running.length > 0) {
        await Promise.race(running);
      }
    }

    // Mark session complete if not aborted
    if (!signal.aborted) {
      await this.markSessionComplete(sessionId);
    }
  }

  /**
   * Execute a single test case with its steps
   */
  private async executeTestCase(
    sessionId: string,
    testCase: any,
    aiSettings: any,
    signal: AbortSignal
  ): Promise<void> {
    let stagehand: BrowserAutomationService | null = null;

    try {
      // Mark test case as in progress
      await aiRecorderTestCaseRepository.update(testCase.id, {
        status: 'in_progress',
        startedAt: new Date(),
      });

      this.emit('testCase:started', { sessionId, testCaseId: testCase.id, name: testCase.name });

      // Initialize BrowserAutomation for this test case
      const stagehandConfig: Record<string, unknown> = {
        modelName: aiSettings.modelName,
        apiKey: aiSettings.apiKey,
        headless: true, // Always headless during authoring
        useBrowserbase: aiSettings.useBrowserbase,
        browserbaseApiKey: aiSettings.browserbaseApiKey,
      };

      stagehand = new BrowserAutomationService(stagehandConfig);
      await stagehand.initialize();

      // Navigate to target URL if specified
      if (testCase.targetUrl) {
        await stagehand.navigateTo(testCase.targetUrl);
      }

      // Get session to check for base URL
      const session = await aiRecorderSessionRepository.findById(sessionId);

      if (session?.baseUrl && !testCase.targetUrl) {
        await stagehand.navigateTo(session.baseUrl);
      }

      // Start recording to enable selector extraction
      // This injects the selector extractor script into the browser
      const startUrl = testCase.targetUrl || session?.baseUrl || 'about:blank';
      await stagehand.startRecording(startUrl);
      logger.info(`Recording started for test case ${testCase.id} at ${startUrl}`);

      // Execute each step
      let allStepsSuccessful = true;
      for (const step of testCase.steps) {
        if (signal.aborted) break;

        const result = await this.executeStepWithRetry(
          sessionId,
          testCase.id,
          step,
          stagehand,
          signal
        );

        if (!result.success) {
          allStepsSuccessful = false;
        }
      }

      // Mark test case complete or needs review
      const finalStatus = allStepsSuccessful ? 'human_review' : 'failed';
      await aiRecorderTestCaseRepository.update(testCase.id, {
        status: finalStatus,
        completedAt: new Date(),
      });

      // Update session counters
      const currentSession = await aiRecorderSessionRepository.findById(sessionId);
      if (currentSession) {
        await aiRecorderSessionRepository.update(sessionId, {
          completedTests: currentSession.completedTests + 1,
          failedTests: allStepsSuccessful ? currentSession.failedTests : currentSession.failedTests + 1,
        });
      }

      this.emit('testCase:completed', {
        sessionId,
        testCaseId: testCase.id,
        status: finalStatus,
      });
    } catch (error: any) {
      logger.error(`Test case ${testCase.id} failed:`, error);

      await aiRecorderTestCaseRepository.update(testCase.id, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date(),
      });

      // Update session counters
      const currentSession = await aiRecorderSessionRepository.findById(sessionId);
      if (currentSession) {
        await aiRecorderSessionRepository.update(sessionId, {
          completedTests: currentSession.completedTests + 1,
          failedTests: currentSession.failedTests + 1,
        });
      }

      this.emit('testCase:failed', {
        sessionId,
        testCaseId: testCase.id,
        error: error.message,
      });
    } finally {
      // Clean up BrowserAutomation
      if (stagehand) {
        try {
          // Stop recording first to capture all selectors
          stagehand.stopRecording();
          await stagehand.close();
        } catch (e) {
          logger.warn('Error closing BrowserAutomation:', e);
        }
      }
    }
  }

  // ----------------------------------------
  // Step Execution with Retry
  // ----------------------------------------

  /**
   * Execute a step with retry logic (10 attempts, exponential backoff)
   */
  private async executeStepWithRetry(
    sessionId: string,
    testCaseId: string,
    step: any,
    stagehand: BrowserAutomationService,
    signal: AbortSignal
  ): Promise<StepExecutionResult> {
    // Mark step as running
    await aiRecorderStepRepository.update(step.id, {
      status: 'running',
      startedAt: new Date(),
    });

    this.emit('step:started', {
      sessionId,
      testCaseId,
      stepId: step.id,
      stepNumber: step.stepNumber,
      description: step.description,
    });

    let lastError: string | null = null;

    for (let attempt = 1; attempt <= EXECUTION_CONFIG.maxRetries; attempt++) {
      if (signal.aborted) {
        return {
          success: false,
          veroCode: null,
          selector: null,
          selectorType: null,
          confidence: 0,
          screenshotPath: null,
          error: 'Cancelled',
          retryCount: attempt - 1,
        };
      }

      try {
        // Update retry count
        await aiRecorderStepRepository.update(step.id, { retryCount: attempt });

        this.emit('step:retry', {
          sessionId,
          testCaseId,
          stepId: step.id,
          attempt,
          maxAttempts: EXECUTION_CONFIG.maxRetries,
        });

        // Execute step with timeout (fail fast - 30s)
        const result = await Promise.race([
          this.executeStep(step, stagehand),
          this.timeout(EXECUTION_CONFIG.stepTimeoutMs),
        ]) as StepExecutionResult;

        if (result.success) {
          // Update step with success
          await aiRecorderStepRepository.update(step.id, {
            status: 'success',
            veroCode: result.veroCode || undefined,
            selector: result.selector || undefined,
            selectorType: result.selectorType as any || undefined,
            confidence: result.confidence,
            screenshotPath: result.screenshotPath || undefined,
            retryCount: attempt,
            completedAt: new Date(),
          });

          this.emit('step:completed', {
            sessionId,
            testCaseId,
            stepId: step.id,
            success: true,
            veroCode: result.veroCode,
            retryCount: attempt,
          });

          return result;
        }

        lastError = result.error || 'Unknown error';
      } catch (error: any) {
        lastError = error.message;
        logger.warn(`Step ${step.id} attempt ${attempt} failed:`, error.message);
      }

      // Exponential backoff before retry
      if (attempt < EXECUTION_CONFIG.maxRetries) {
        const delay = Math.min(
          EXECUTION_CONFIG.initialDelayMs * Math.pow(EXECUTION_CONFIG.backoffMultiplier, attempt - 1),
          EXECUTION_CONFIG.maxDelayMs
        );
        await this.sleep(delay);

        // Re-observe page state before retry
        try {
          await stagehand.observe();
        } catch (e) {
          logger.warn('Failed to re-observe page state:', e);
        }
      }
    }

    // All retries exhausted - enter stuck state
    // Generate suggestions based on the error and step description
    const suggestions = this.generateStuckSuggestions(step.description, lastError || '');

    // Take a screenshot for context
    let screenshotPath: string | null = null;
    try {
      const screenshot = await stagehand.takeScreenshot();
      screenshotPath = await this.saveScreenshot(step.id, screenshot);
    } catch (e) {
      logger.warn('Failed to take screenshot for stuck step:', e);
    }

    // Mark step as stuck
    await aiRecorderStepRepository.update(step.id, {
      status: 'stuck',
      errorMessage: lastError || undefined,
      suggestions: JSON.stringify(suggestions),
      screenshotPath: screenshotPath || undefined,
      retryCount: EXECUTION_CONFIG.maxRetries,
      completedAt: new Date(),
    });

    // Mark test case as stuck and record which step
    await aiRecorderTestCaseRepository.update(testCaseId, {
      status: 'stuck',
      stuckAtStep: step.stepNumber,
    });

    // Emit stuck event with suggestions for UI
    this.emit('step:stuck', {
      sessionId,
      testCaseId,
      stepId: step.id,
      stepNumber: step.stepNumber,
      description: step.description,
      error: lastError,
      screenshot: screenshotPath,
      suggestions,
      retryCount: EXECUTION_CONFIG.maxRetries,
    });

    // Also emit testCase:stuck event
    this.emit('testCase:stuck', {
      sessionId,
      testCaseId,
      stuckAtStep: step.stepNumber,
    });

    return {
      success: false,
      veroCode: null,
      selector: null,
      selectorType: null,
      confidence: 0,
      screenshotPath,
      error: lastError,
      retryCount: EXECUTION_CONFIG.maxRetries,
    };
  }

  /**
   * Generate helpful suggestions when a step gets stuck
   */
  private generateStuckSuggestions(description: string, error: string): string[] {
    const suggestions: string[] = [];
    const lowerDesc = description.toLowerCase();
    const lowerError = error.toLowerCase();

    // Common element matching issues
    if (lowerError.includes('multiple') || lowerError.includes('found') || lowerError.includes('ambiguous')) {
      suggestions.push(`Try being more specific: "${description}" in the header area`);
      suggestions.push(`Try being more specific: "${description}" with specific text`);
    }

    // Element not found
    if (lowerError.includes('not found') || lowerError.includes('no element') || lowerError.includes('timeout')) {
      suggestions.push('Check if the element has a different label on this page');
      suggestions.push('The element might be hidden - try scrolling first');
      suggestions.push('Wait for the page to fully load before clicking');
    }

    // Click-specific issues
    if (lowerDesc.includes('click')) {
      suggestions.push('Try clicking a nearby element instead');
      suggestions.push('The button might have a different label now');
    }

    // Fill-specific issues
    if (lowerDesc.includes('fill') || lowerDesc.includes('enter') || lowerDesc.includes('type')) {
      suggestions.push('Make sure the input field is visible and not disabled');
      suggestions.push('Try clicking the field first, then filling');
    }

    // Always add these options
    suggestions.push('Skip this step and continue');
    suggestions.push('Let me do it manually');

    // Limit to 5 suggestions
    return suggestions.slice(0, 5);
  }

  /**
   * Execute a single step using BrowserAutomation
   */
  private async executeStep(step: any, stagehand: BrowserAutomationService): Promise<StepExecutionResult> {
    const description = step.description;
    const stepType = step.stepType;

    logger.info(`Executing step (${stepType}): ${description}`);

    // Handle navigation steps specially - act() can't navigate to URLs
    if (stepType === 'navigate') {
      const urlMatch = description.match(/(?:to|url)[\s:]+['\"]?([^\s'\"]+)['\"]?/i) ||
        description.match(/(?:open|go to|navigate to|navigate)[\s:]+['\"]?([^\s'\"]+)['\"]?/i) ||
        description.match(/(https?:\/\/[^\s'\"]+)/i);

      if (urlMatch) {
        const url = urlMatch[1].trim();
        logger.info(`Navigating to URL: ${url}`);

        const navResult = await stagehand.navigateTo(url);

        if (!navResult.success) {
          return {
            success: false,
            veroCode: null,
            selector: null,
            selectorType: null,
            confidence: 0,
            screenshotPath: null,
            error: 'Navigation failed',
            retryCount: 0,
          };
        }

        // Take screenshot after navigation
        const screenshot = await stagehand.takeScreenshot();
        const screenshotPath = await this.saveScreenshot(step.id, screenshot);

        return {
          success: true,
          veroCode: generateVeroAction('open', undefined, url),
          selector: null,
          selectorType: null,
          confidence: 1.0,
          screenshotPath,
          error: null,
          retryCount: 0,
        };
      }
    }

    // Use BrowserAutomation to perform the action AND record selectors
    const { actResult, recordedAction } = await stagehand.actAndRecord(description);

    if (!actResult.success) {
      return {
        success: false,
        veroCode: null,
        selector: null,
        selectorType: null,
        confidence: 0,
        screenshotPath: null,
        error: actResult.message || 'Action failed',
        retryCount: 0,
      };
    }

    // Extract selectors from the recorded action (uses our new selector extraction)
    const extractedSelectors = recordedAction?.selectors;

    // Use the recommended selector from our extraction, or fall back to BrowserAutomation's description
    let veroSelector: string | null = null;
    let selectorType: string = 'text';
    let confidence: number = 0.85;

    if (extractedSelectors?.recommended) {
      // Use our extracted selector (prioritized by testId > role > label > text > css)
      veroSelector = extractedSelectors.recommended;
      selectorType = extractedSelectors.recommendedType || 'text';
      // Higher confidence for unique selectors
      confidence = extractedSelectors.isUnique?.[selectorType] ? 0.95 : 0.85;
      logger.info(`Extracted selector: ${veroSelector} (type: ${selectorType}, unique: ${extractedSelectors.isUnique?.[selectorType]})`);
    } else {
      // Fall back to BrowserAutomation's description
      const actionDescription = (actResult as any).actionDescription ||
        (actResult as any).actions?.[0]?.description || null;
      veroSelector = this.convertToVeroSelector(actionDescription, description);
    }

    // Take screenshot
    const screenshot = await stagehand.takeScreenshot();
    const screenshotPath = await this.saveScreenshot(step.id, screenshot);

    // Generate Vero code from the step using the extracted selector
    const veroCode = this.generateVeroCodeWithSelectors(step.stepType, description, veroSelector, extractedSelectors);

    return {
      success: true,
      veroCode,
      selector: veroSelector,
      selectorType,
      confidence,
      screenshotPath,
      error: null,
      retryCount: 0,
    };
  }

  /**
   * Generate Vero code with enhanced selector information
   */
  private generateVeroCodeWithSelectors(
    stepType: string,
    description: string,
    selector: string | null,
    extractedSelectors: ExtractedSelectors | null | undefined
  ): string {
    // If we have extracted selectors, use the best one
    if (extractedSelectors) {
      const sel = this.formatSelectorForVero(extractedSelectors);
      return this.generateVeroCodeInternal(stepType, description, sel);
    }

    // Fall back to basic generation
    return this.generateVeroCode(stepType, description, selector);
  }

  /**
   * Format extracted selectors for Vero DSL
   * Prioritizes human-readable selectors over CSS
   */
  private formatSelectorForVero(selectors: ExtractedSelectors): string {
    // Priority: testId > label > placeholder > text > role > css
    if (selectors.testId) {
      return `[data-testid="${selectors.testId}"]`;
    }
    if (selectors.label) {
      return `"${selectors.label}"`;
    }
    if (selectors.placeholder) {
      return `"${selectors.placeholder}"`;
    }
    if (selectors.text) {
      // For buttons/links, use the text as selector
      if (selectors.tagName === 'button' || selectors.tagName === 'a') {
        return `"${selectors.text}"`;
      }
      return `"${selectors.text}"`;
    }
    if (selectors.roleWithName) {
      // Convert role[name="X"] to just "X" for Vero
      const nameMatch = selectors.roleWithName.match(/name="([^"]+)"/);
      if (nameMatch) {
        return `"${nameMatch[1]}"`;
      }
    }
    if (selectors.css) {
      return selectors.css;
    }
    return '"element"';
  }

  /**
   * Default page name for generated Vero code
   */
  private readonly DEFAULT_PAGE_NAME = 'RecordedPage';

  /**
   * Convert a selector string to a camelCase field name
   * e.g., "ZIP Code" -> "zipCode", "Submit Button" -> "submitButton"
   * Removes ALL special characters to ensure valid identifiers
   */
  private selectorToFieldName(selector: string): string {
    // Remove ALL quotes (not just leading/trailing)
    let cleaned = selector.replace(/["']/g, '');
    // Remove brackets for test-id selectors
    cleaned = cleaned.replace(/^\[data-testid=|^\[data-test=|\]$/g, '');
    // Remove all non-alphanumeric characters except spaces and hyphens (used for word splitting)
    cleaned = cleaned.replace(/[^a-zA-Z0-9\s\-_]/g, ' ');
    // Normalize multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    // Convert to camelCase: split on spaces/special chars, lowercase first word, capitalize rest
    const words = cleaned.split(/[\s\-_]+/).filter(w => w.length > 0);
    if (words.length === 0) return 'element';
    // Remove leading numbers (invalid for identifiers)
    const firstWord = words[0].replace(/^\d+/, '');
    if (!firstWord && words.length === 1) return 'element';
    const adjustedWords = firstWord ? [firstWord, ...words.slice(1)] : words.slice(1);
    if (adjustedWords.length === 0) return 'element';
    return adjustedWords
      .map((word, index) => {
        const lower = word.toLowerCase();
        if (index === 0) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join('');
  }

  /**
   * Format selector as PageName.fieldName for Vero DSL
   */
  private formatAsPageField(selector: string, pageName: string = this.DEFAULT_PAGE_NAME): string {
    const fieldName = this.selectorToFieldName(selector);
    return `${pageName}.${fieldName}`;
  }

  /**
   * Internal Vero code generation (shared logic)
   * Uses veroSyntaxReference.ts as single source of truth
   */
  private generateVeroCodeInternal(
    stepType: string,
    description: string,
    selector: string
  ): string {
    const desc = description.toLowerCase();
    const originalDesc = description; // Keep original case for values
    const pageField = this.formatAsPageField(selector);

    switch (stepType) {
      case 'navigate': {
        const urlMatch = desc.match(/(?:to|url)[\s:]+['\"]?([^'\"]+)['\"]?/i) ||
          desc.match(/(?:open|go to|navigate to)[\s:]+(.+)/i);
        const url = urlMatch ? urlMatch[1].trim() : 'https://example.com';
        return generateVeroAction('open', undefined, url);
      }

      case 'fill': {
        // Extract value from description using various patterns
        const quotedValueMatch = originalDesc.match(/["']([^"']+)["']/);
        const quotedValue = quotedValueMatch ? quotedValueMatch[1] : null;

        // Pattern 1: "Enter VALUE in the FIELD field"
        const enterInMatch = originalDesc.match(
          /(?:enter|type|input|fill)\s+(.+?)\s+(?:in(?:to)?|on)\s+(?:the\s+)?(.+?)(?:\s+field)?$/i
        );
        if (enterInMatch) {
          const rawValue = enterInMatch[1].trim();
          const value = quotedValue || rawValue.replace(/^["']|["']$/g, '');
          return generateVeroAction('fill', pageField, value);
        }

        // Pattern 2: "Fill FIELD with VALUE"
        const fillWithMatch = originalDesc.match(
          /(?:fill|enter|type|input)\s+(?:the\s+)?(.+?)\s+(?:with|as|=|:)\s+(.+)/i
        );
        if (fillWithMatch) {
          const rawValue = fillWithMatch[2].trim();
          const value = quotedValue || rawValue.replace(/^["']|["']$/g, '');
          return generateVeroAction('fill', pageField, value);
        }

        // Pattern 3: "Select VALUE from DROPDOWN"
        const selectFromMatch = originalDesc.match(
          /select\s+(.+?)\s+from\s+(?:the\s+)?(.+?)(?:\s+dropdown)?$/i
        );
        if (selectFromMatch) {
          const rawValue = selectFromMatch[1].trim();
          const value = quotedValue || rawValue.replace(/^["']|["']$/g, '');
          return generateVeroAction('select', pageField, value);
        }

        // Pattern 4: If we have a quoted value, use it directly
        if (quotedValue) {
          return generateVeroAction('fill', pageField, quotedValue);
        }

        // Fallback
        const valueMatch = originalDesc.match(/(?:enter|type|fill|input)\s+(?:[\w\s]+?)["']?(\w+)["']?\s*$/i);
        const value = valueMatch ? valueMatch[1].trim() : 'value';
        return generateVeroAction('fill', pageField, value);
      }

      case 'click': {
        return generateVeroAction('click', pageField);
      }

      case 'assert': {
        const assertMatch = desc.match(
          /(?:verify|assert|check|expect|confirm)[\s:]+(?:that\s+)?(.+)/i
        );
        const condition = assertMatch ? assertMatch[1].trim() : 'element is visible';

        if (condition.includes('visible') || condition.includes('displayed')) {
          return generateVeroAssertion(pageField, 'visible');
        }
        if (condition.includes('text') || condition.includes('contains')) {
          const textMatch = condition.match(/['\"]([^'\"]+)['\"]/);
          const text = textMatch ? textMatch[1] : 'text';
          return generateVeroAssertion(pageField, 'contains', text);
        }
        return generateVeroAssertion(pageField, 'visible');
      }

      case 'wait': {
        const timeMatch = desc.match(/(\d+)\s*(?:second|sec|s)/i);
        if (timeMatch) {
          return generateVeroAction('wait', undefined, timeMatch[1]);
        }
        return generateVeroAction('wait', 'page');
      }

      case 'loop': {
        return `for each item in data {\n  // loop body\n}`;
      }

      default:
        return `# ${description}`;
    }
  }

  // ----------------------------------------
  // Vero Code Generation
  // ----------------------------------------

  /**
   * Generate Vero code from step information
   * Uses veroSyntaxReference.ts as single source of truth
   */
  private generateVeroCode(
    stepType: string,
    description: string,
    selector: string | null
  ): string {
    // Delegate to internal method with default selector
    const sel = selector || '"element"';
    return this.generateVeroCodeInternal(stepType, description, sel);
  }

  // ----------------------------------------
  // Recovery & Resume Features
  // ----------------------------------------

  /**
   * Resume execution after user provides help for a stuck step
   * This is called when user provides a chat hint to retry the stuck step
   */
  async resumeWithHint(
    sessionId: string,
    testCaseId: string,
    stepId: string,
    userHint: string,
    aiSettings: any
  ): Promise<{ success: boolean; veroCode?: string; error?: string }> {
    const step = await aiRecorderStepRepository.findById(stepId);

    if (!step || step.status !== 'stuck') {
      return { success: false, error: 'Step is not in stuck state' };
    }

    // Fetch related data
    const testCase = await aiRecorderTestCaseRepository.findById(testCaseId);
    const session = await aiRecorderSessionRepository.findById(sessionId);
    const allSteps = await aiRecorderStepRepository.findByTestCaseId(testCaseId);

    if (!testCase || !session) {
      return { success: false, error: 'Test case or session not found' };
    }

    let stagehand: BrowserAutomationService | null = null;

    try {
      // Initialize BrowserAutomation with headed browser for user to see
      const stagehandConfig: Record<string, unknown> = {
        modelName: aiSettings.modelName,
        apiKey: aiSettings.apiKey,
        headless: false, // Show browser for recovery
        useBrowserbase: aiSettings.useBrowserbase,
        browserbaseApiKey: aiSettings.browserbaseApiKey,
      };

      stagehand = new BrowserAutomationService(stagehandConfig);
      await stagehand.initialize();

      // Navigate to base URL if available
      const baseUrl = session.baseUrl || testCase.targetUrl;
      if (baseUrl) {
        await stagehand.navigateTo(baseUrl);
      }

      // Replay all successful steps before the stuck one
      for (const prevStep of allSteps) {
        if (prevStep.stepNumber >= step.stepNumber) break;
        if (prevStep.status === 'success' || prevStep.status === 'resolved') {
          await stagehand.act(prevStep.description);
        }
      }

      // Try the stuck step with user's hint
      const refinedDescription = `${step.description}. User hint: ${userHint}`;
      const actResult = await stagehand.act(refinedDescription);

      if (actResult.success) {
        // Find best selector and generate Vero code
        const selector = await stagehand.findBestSelector(step.description);
        const veroCode = this.generateVeroCode(step.stepType, step.description, selector);
        const screenshot = await stagehand.takeScreenshot();
        const screenshotPath = await this.saveScreenshot(step.id, screenshot);

        // Mark step as resolved
        await aiRecorderStepRepository.update(stepId, {
          status: 'resolved',
          veroCode,
          selector: selector || undefined,
          selectorType: this.getSelectorType(selector) as any || undefined,
          screenshotPath: screenshotPath || undefined,
          errorMessage: undefined,
        });

        // Update test case status - continue execution or mark for review
        const remainingSteps = allSteps.filter(
          (s) => s.stepNumber > step.stepNumber && s.status === 'pending'
        );

        if (remainingSteps.length === 0) {
          await aiRecorderTestCaseRepository.update(testCaseId, {
            status: 'human_review',
            stuckAtStep: undefined,
          });
        } else {
          await aiRecorderTestCaseRepository.update(testCaseId, {
            status: 'partially_complete',
            stuckAtStep: undefined,
          });
        }

        this.emit('step:resolved', {
          sessionId,
          testCaseId,
          stepId,
          veroCode,
          screenshot: screenshotPath,
        });

        return { success: true, veroCode };
      }

      return { success: false, error: actResult.message || 'Action failed with user hint' };
    } catch (error: any) {
      logger.error('Failed to resume with hint:', error);
      return { success: false, error: error.message };
    } finally {
      if (stagehand) {
        await stagehand.close();
      }
    }
  }

  /**
   * Skip a stuck step and continue with the next one
   */
  async skipStep(
    sessionId: string,
    testCaseId: string,
    stepId: string
  ): Promise<void> {
    await aiRecorderStepRepository.update(stepId, {
      status: 'skipped',
      veroCode: undefined,
    });

    // Update test case to partially_complete
    await aiRecorderTestCaseRepository.update(testCaseId, {
      status: 'partially_complete',
      stuckAtStep: undefined,
    });

    this.emit('step:skipped', {
      sessionId,
      testCaseId,
      stepId,
    });
  }

  /**
   * Update a step with manually captured action (browser takeover)
   */
  async captureManualAction(
    sessionId: string,
    testCaseId: string,
    stepId: string,
    veroCode: string,
    selector?: string
  ): Promise<void> {
    await aiRecorderStepRepository.update(stepId, {
      status: 'captured',
      veroCode,
      selector: selector || undefined,
      selectorType: selector ? this.getSelectorType(selector) as any : undefined,
      errorMessage: undefined,
    });

    // Update test case status
    await aiRecorderTestCaseRepository.update(testCaseId, {
      status: 'partially_complete',
      stuckAtStep: undefined,
    });

    this.emit('step:captured', {
      sessionId,
      testCaseId,
      stepId,
      veroCode,
    });
  }

  // ----------------------------------------
  // Human Review Features
  // ----------------------------------------

  /**
   * Replay a single step for human review
   */
  async replayStep(
    sessionId: string,
    testCaseId: string,
    stepId: string,
    aiSettings: any
  ): Promise<{ success: boolean; screenshot?: string; error?: string }> {
    const step = await aiRecorderStepRepository.findById(stepId);

    if (!step) {
      return { success: false, error: 'Step not found' };
    }

    const testCase = await aiRecorderTestCaseRepository.findById(testCaseId);

    let stagehand: BrowserAutomationService | null = null;

    try {
      // Initialize headed BrowserAutomation for replay
      const stagehandConfig: Record<string, unknown> = {
        modelName: aiSettings.modelName,
        apiKey: aiSettings.apiKey,
        headless: false, // Headed for human review
        useBrowserbase: aiSettings.useBrowserbase,
        browserbaseApiKey: aiSettings.browserbaseApiKey,
      };

      stagehand = new BrowserAutomationService(stagehandConfig);
      await stagehand.initialize();

      // Navigate to target URL
      if (testCase?.targetUrl) {
        await stagehand.navigateTo(testCase.targetUrl);
      }

      // Execute the step
      const actResult = await stagehand.act(step.description);
      const screenshot = await stagehand.takeScreenshot();

      this.emit('step:replayed', {
        sessionId,
        testCaseId,
        stepId,
        success: actResult.success,
        screenshot,
      });

      return {
        success: actResult.success,
        screenshot: screenshot || undefined,
        error: actResult.message,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    } finally {
      if (stagehand) {
        await stagehand.close();
      }
    }
  }

  /**
   * Run all steps in a test case with live browser preview
   * Emits events per step for real-time UI updates
   */
  async runTestCase(
    sessionId: string,
    testCaseId: string,
    aiSettings: any
  ): Promise<{ success: boolean; stepsCompleted: number; error?: string }> {
    const testCase = await aiRecorderTestCaseRepository.findById(testCaseId);

    if (!testCase) {
      return { success: false, stepsCompleted: 0, error: 'Test case not found' };
    }

    const steps = await aiRecorderStepRepository.findByTestCaseId(testCaseId);
    const session = await aiRecorderSessionRepository.findById(sessionId);

    let stagehand: BrowserAutomationService | null = null;
    let stepsCompleted = 0;

    try {
      // Emit run started event
      this.emit('run:started', {
        sessionId,
        testCaseId,
        totalSteps: steps.length,
      });

      // Initialize headed BrowserAutomation for visible execution
      const stagehandConfig: Record<string, unknown> = {
        modelName: aiSettings.modelName,
        apiKey: aiSettings.apiKey,
        headless: false, // Must be headed for live preview
        useBrowserbase: aiSettings.useBrowserbase,
        browserbaseApiKey: aiSettings.browserbaseApiKey,
      };

      stagehand = new BrowserAutomationService(stagehandConfig);
      await stagehand.initialize();

      // Navigate to target URL if available
      const targetUrl = testCase.targetUrl || session?.baseUrl;
      if (targetUrl) {
        await stagehand.navigateTo(targetUrl);

        // Take initial screenshot
        const screenshot = await stagehand.takeScreenshot();
        this.emit('run:screenshot', {
          sessionId,
          testCaseId,
          stepNumber: 0,
          screenshot,
          url: targetUrl,
        });
      }

      // Execute each step
      for (const step of steps) {
        // Emit step starting
        this.emit('run:step', {
          sessionId,
          testCaseId,
          stepId: step.id,
          stepNumber: step.stepNumber,
          description: step.description,
          status: 'running',
        });

        try {
          // Execute the step using Vero code if available, otherwise use description
          const instruction = step.veroCode
            ? this.veroCodeToInstruction(step.veroCode)
            : step.description;

          const actResult = await stagehand.act(instruction);

          // Take screenshot after action
          const screenshot = await stagehand.takeScreenshot();
          const page = stagehand.getActivePage();
          const currentUrl = page ? await page.url() : '';

          if (actResult.success) {
            stepsCompleted++;
            this.emit('run:step', {
              sessionId,
              testCaseId,
              stepId: step.id,
              stepNumber: step.stepNumber,
              description: step.description,
              status: 'success',
              screenshot,
              url: currentUrl,
            });
          } else {
            this.emit('run:step', {
              sessionId,
              testCaseId,
              stepId: step.id,
              stepNumber: step.stepNumber,
              description: step.description,
              status: 'failed',
              error: actResult.message || 'Action failed',
              screenshot,
              url: currentUrl,
            });

            // Continue to next step even if one fails
          }

          // Small delay between steps for visual feedback
          await this.sleep(500);

        } catch (stepError: any) {
          this.emit('run:step', {
            sessionId,
            testCaseId,
            stepId: step.id,
            stepNumber: step.stepNumber,
            description: step.description,
            status: 'error',
            error: stepError.message,
          });
        }
      }

      // Emit run complete
      this.emit('run:complete', {
        sessionId,
        testCaseId,
        stepsCompleted,
        totalSteps: steps.length,
        success: stepsCompleted === steps.length,
      });

      return {
        success: stepsCompleted === steps.length,
        stepsCompleted,
      };

    } catch (error: any) {
      logger.error('Failed to run test case:', error);

      this.emit('run:error', {
        sessionId,
        testCaseId,
        error: error.message,
      });

      return {
        success: false,
        stepsCompleted,
        error: error.message,
      };
    } finally {
      if (stagehand) {
        await stagehand.close();
      }
    }
  }

  /**
   * Run test case directly using Playwright (no AI required)
   * Executes generated Vero code step by step
   */
  async runVeroTestCaseDirectly(
    sessionId: string,
    testCaseId: string
  ): Promise<{ success: boolean; stepsCompleted: number; error?: string }> {
    const testCase = await aiRecorderTestCaseRepository.findById(testCaseId);

    if (!testCase) {
      return { success: false, stepsCompleted: 0, error: 'Test case not found' };
    }

    const steps = await aiRecorderStepRepository.findByTestCaseId(testCaseId);
    const session = await aiRecorderSessionRepository.findById(sessionId);

    let browser: Browser | null = null;
    let page: Page | null = null;
    let stepsCompleted = 0;

    try {
      // Emit run started event
      this.emit('run:started', {
        sessionId,
        testCaseId,
        totalSteps: steps.length,
      });

      // Launch browser (headed for visibility)
      browser = await chromium.launch({ headless: false });
      const context = await browser.newContext();
      page = await context.newPage();

      // Navigate to target URL if available
      const targetUrl = testCase.targetUrl || session?.baseUrl;
      if (targetUrl) {
        await page.goto(targetUrl);

        // Take initial screenshot
        const screenshotBuffer = await page.screenshot();
        const screenshot = screenshotBuffer.toString('base64');
        this.emit('run:screenshot', {
          sessionId,
          testCaseId,
          stepNumber: 0,
          screenshot,
          url: targetUrl,
        });
      }

      // Execute each step
      for (const step of steps) {
        // Emit step starting
        this.emit('run:step', {
          sessionId,
          testCaseId,
          stepId: step.id,
          stepNumber: step.stepNumber,
          description: step.description,
          status: 'running',
        });

        try {
          if (!step.veroCode) {
            // Skip steps without Vero code
            this.emit('run:step', {
              sessionId,
              testCaseId,
              stepId: step.id,
              stepNumber: step.stepNumber,
              description: step.description,
              status: 'skipped',
            });
            continue;
          }

          // Execute the Vero code directly, passing the stored selector for lookup
          await this.executeVeroCode(page, step.veroCode, step.selector || undefined);
          stepsCompleted++;

          // Take screenshot after step
          const screenshotBuffer = await page.screenshot();
          const screenshot = screenshotBuffer.toString('base64');
          const currentUrl = page.url();

          // Emit step success
          this.emit('run:step', {
            sessionId,
            testCaseId,
            stepId: step.id,
            stepNumber: step.stepNumber,
            description: step.description,
            status: 'success',
            veroCode: step.veroCode,
          });

          this.emit('run:screenshot', {
            sessionId,
            testCaseId,
            stepNumber: step.stepNumber,
            screenshot,
            url: currentUrl,
          });

          // Small delay between steps for visual feedback
          await this.sleep(500);

        } catch (stepError: any) {
          this.emit('run:step', {
            sessionId,
            testCaseId,
            stepId: step.id,
            stepNumber: step.stepNumber,
            description: step.description,
            status: 'error',
            error: stepError.message,
          });
        }
      }

      // Emit run complete
      this.emit('run:complete', {
        sessionId,
        testCaseId,
        stepsCompleted,
        totalSteps: steps.length,
        success: stepsCompleted === steps.length,
      });

      return {
        success: stepsCompleted === steps.length,
        stepsCompleted,
      };

    } catch (error: any) {
      logger.error('Failed to run Vero test case directly:', error);

      this.emit('run:error', {
        sessionId,
        testCaseId,
        error: error.message,
      });

      return {
        success: false,
        stepsCompleted,
        error: error.message,
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Convert a camelCase field name back to a human-readable selector
   * e.g., "zipCode" -> "ZIP Code", "submitButton" -> "Submit Button"
   */
  private fieldNameToSelector(fieldName: string): string {
    // Split on capital letters and join with spaces
    const words = fieldName.replace(/([A-Z])/g, ' $1').trim().split(' ');
    // Capitalize each word
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  /**
   * Perform a click action with auto-detection of element type
   */
  private async performClick(page: Page, target: string): Promise<void> {
    try {
      // 1. Try getByRole button
      let clicked = false;
      try {
        const btn = page.getByRole('button', { name: target });
        if (await btn.count() > 0) {
          await btn.first().click({ timeout: 5000 });
          clicked = true;
        }
      } catch { }

      // 2. Try getByRole link
      if (!clicked) {
        try {
          const link = page.getByRole('link', { name: target });
          if (await link.count() > 0) {
            await link.first().click({ timeout: 5000 });
            clicked = true;
          }
        } catch { }
      }

      // 3. Try getByText
      if (!clicked) {
        try {
          const text = page.getByText(target, { exact: false });
          if (await text.count() > 0) {
            await text.first().click({ timeout: 5000 });
            clicked = true;
          }
        } catch { }
      }

      // 4. Last resort - any clickable with this text
      if (!clicked) {
        await page.locator(`text="${target}"`).first().click({ timeout: 10000 });
      }
    } catch (err: any) {
      logger.error(`Click failed for "${target}": ${err.message}`);
      throw err;
    }
  }

  /**
   * Perform a fill action with multiple selector strategies
   */
  private async performFill(page: Page, field: string, value: string): Promise<void> {
    try {
      // 1. getByLabel (most common for form fields)
      const labelElement = page.getByLabel(field, { exact: false });
      if (await labelElement.count() > 0) {
        await labelElement.first().fill(value);
        logger.info(`Filled by label "${field}"`);
        return;
      }

      // 2. getByPlaceholder
      const placeholderElement = page.getByPlaceholder(field, { exact: false });
      if (await placeholderElement.count() > 0) {
        await placeholderElement.first().fill(value);
        logger.info(`Filled by placeholder "${field}"`);
        return;
      }

      // 3. getByRole textbox with name
      const textboxElement = page.getByRole('textbox', { name: field });
      if (await textboxElement.count() > 0) {
        await textboxElement.first().fill(value);
        logger.info(`Filled by role textbox "${field}"`);
        return;
      }

      // 4. getByRole spinbutton (for number inputs)
      const spinbuttonElement = page.getByRole('spinbutton', { name: field });
      if (await spinbuttonElement.count() > 0) {
        await spinbuttonElement.first().fill(value);
        logger.info(`Filled by role spinbutton "${field}"`);
        return;
      }

      // 5. Look for input near text containing field name
      const nearText = page.locator(`input:near(:text("${field}"))`).first();
      if (await nearText.count() > 0) {
        await nearText.fill(value);
        logger.info(`Filled input near text "${field}"`);
        return;
      }

      throw new Error(`Could not find field "${field}"`);
    } catch (err: any) {
      logger.error(`Fill failed for "${field}": ${err.message}`);
      throw err;
    }
  }

  /**
   * Extract selector from PageName.fieldName format or quoted string
   * Returns the selector string to use for element lookup
   */
  private extractSelectorFromVeroCode(selectorPart: string, originalSelector?: string): string {
    // If we have the original selector stored, use it
    if (originalSelector) {
      return originalSelector.replace(/^["']|["']$/g, '');
    }

    // Check if it's PageName.fieldName format
    const pageFieldMatch = selectorPart.match(/^(\w+)\.(\w+)$/);
    if (pageFieldMatch) {
      // Convert fieldName back to human-readable selector
      return this.fieldNameToSelector(pageFieldMatch[2]);
    }

    // Otherwise it's a quoted string, return as-is without quotes
    return selectorPart.replace(/^["']|["']$/g, '');
  }

  /**
   * Execute a single Vero code instruction using Playwright
   */
  private async executeVeroCode(page: Page, veroCode: string, originalSelector?: string): Promise<void> {
    const code = veroCode.trim();
    logger.info(`Executing Vero code: ${code}`);

    // Handle open/navigate
    const openMatch = code.match(/^open\s+["']([^"']+)["']$/i);
    if (openMatch) {
      logger.info(`Navigating to: ${openMatch[1]}`);
      await page.goto(openMatch[1]);
      await page.waitForLoadState('domcontentloaded');
      return;
    }

    // Handle click with PageName.fieldName format: CLICK PageName.fieldName
    const clickPageFieldMatch = code.match(/^click\s+(\w+\.\w+)$/i);
    if (clickPageFieldMatch) {
      const target = this.extractSelectorFromVeroCode(clickPageFieldMatch[1], originalSelector);
      logger.info(`Clicking (page.field): "${target}"`);
      await this.performClick(page, target);
      return;
    }

    // Handle click with element type (e.g., click "Auto" link, click "Submit" button)
    const clickMatch = code.match(/^click\s+["']([^"']+)["']\s*(button|link|checkbox|element)?$/i);
    if (clickMatch) {
      const target = clickMatch[1];
      const elementType = clickMatch[2]?.toLowerCase();
      logger.info(`Clicking: "${target}" (type: ${elementType || 'auto'})`);

      try {
        if (elementType === 'button') {
          await page.getByRole('button', { name: target }).first().click({ timeout: 10000 });
        } else if (elementType === 'link') {
          await page.getByRole('link', { name: target }).first().click({ timeout: 10000 });
        } else if (elementType === 'checkbox') {
          await page.getByRole('checkbox', { name: target }).first().check({ timeout: 10000 });
        } else {
          // Auto-detect: try multiple strategies
          // 1. Try getByRole button
          let clicked = false;
          try {
            const btn = page.getByRole('button', { name: target });
            if (await btn.count() > 0) {
              await btn.first().click({ timeout: 5000 });
              clicked = true;
            }
          } catch { }

          // 2. Try getByRole link
          if (!clicked) {
            try {
              const link = page.getByRole('link', { name: target });
              if (await link.count() > 0) {
                await link.first().click({ timeout: 5000 });
                clicked = true;
              }
            } catch { }
          }

          // 3. Try getByText
          if (!clicked) {
            try {
              const text = page.getByText(target, { exact: false });
              if (await text.count() > 0) {
                await text.first().click({ timeout: 5000 });
                clicked = true;
              }
            } catch { }
          }

          // 4. Last resort - any clickable with this text
          if (!clicked) {
            await page.locator(`text="${target}"`).first().click({ timeout: 10000 });
          }
        }
      } catch (err: any) {
        logger.error(`Click failed for "${target}": ${err.message}`);
        throw err;
      }
      return;
    }

    // Handle fill with PageName.fieldName format: FILL PageName.fieldName WITH "value"
    const fillPageFieldMatch = code.match(/^fill\s+(\w+\.\w+)\s+with\s+["']([^"']*)["']$/i);
    if (fillPageFieldMatch) {
      const field = this.extractSelectorFromVeroCode(fillPageFieldMatch[1], originalSelector);
      const value = fillPageFieldMatch[2];
      logger.info(`Fill (page.field): "${field}" with "${value}"`);
      await this.performFill(page, field, value);
      return;
    }

    // Handle fill with quoted string: fill "Field Name" with "value"
    const fillMatch = code.match(/^fill\s+["']([^"']+)["']\s+with\s+["']([^"']*)["']$/i);
    if (fillMatch) {
      const field = fillMatch[1];
      const value = fillMatch[2];
      logger.info(`Fill: "${field}" with "${value}"`);
      await this.performFill(page, field, value);
      return;
    }

    // Handle select with PageName.fieldName format: SELECT "value" FROM PageName.fieldName
    const selectPageFieldMatch = code.match(/^select\s+["']([^"']+)["']\s+from\s+(\w+\.\w+)$/i);
    if (selectPageFieldMatch) {
      const option = selectPageFieldMatch[1];
      const dropdown = this.extractSelectorFromVeroCode(selectPageFieldMatch[2], originalSelector);
      logger.info(`Select (page.field): "${option}" from "${dropdown}"`);
      try {
        await page.getByLabel(dropdown, { exact: false }).selectOption(option);
      } catch {
        await page.getByText(option, { exact: false }).first().click();
      }
      return;
    }

    // Handle select - new syntax: SELECT "value" FROM "dropdown"
    const selectFromMatch = code.match(/^select\s+["']([^"']+)["']\s+from\s+["']([^"']+)["']$/i);
    if (selectFromMatch) {
      const option = selectFromMatch[1];
      const dropdown = selectFromMatch[2];
      logger.info(`Select: "${option}" from "${dropdown}"`);
      try {
        await page.getByLabel(dropdown, { exact: false }).selectOption(option);
      } catch {
        // Try clicking the option directly (for custom dropdowns)
        await page.getByText(option, { exact: false }).first().click();
      }
      return;
    }

    // Handle legacy select syntax: select "dropdown" option "value"
    const selectMatch = code.match(/^select\s+["']([^"']+)["']\s+option\s+["']([^"']+)["']$/i);
    if (selectMatch) {
      const dropdown = selectMatch[1];
      const option = selectMatch[2];
      logger.info(`Select (legacy): "${dropdown}" option "${option}"`);
      try {
        await page.getByLabel(dropdown, { exact: false }).selectOption(option);
      } catch {
        // Try clicking the option directly (for custom dropdowns)
        await page.getByText(option, { exact: false }).first().click();
      }
      return;
    }

    // Handle wait with seconds
    const waitMatch = code.match(/^wait\s+(?:for\s+)?(\d+)\s*(?:seconds?|s)?$/i);
    if (waitMatch) {
      const seconds = parseInt(waitMatch[1]);
      logger.info(`Waiting ${seconds} seconds`);
      await page.waitForTimeout(seconds * 1000);
      return;
    }

    // Handle wait for page load/network idle
    if (code.match(/^wait\s+for\s+(page\s+load|network\s+idle)$/i)) {
      logger.info('Waiting for network idle');
      await page.waitForLoadState('networkidle');
      return;
    }

    // Handle verify with PageName.fieldName format: VERIFY PageName.fieldName IS VISIBLE
    const verifyPageFieldVisibleMatch = code.match(/^(?:verify|expect|assert)\s+(\w+\.\w+)\s+is\s+visible$/i);
    if (verifyPageFieldVisibleMatch) {
      const target = this.extractSelectorFromVeroCode(verifyPageFieldVisibleMatch[1], originalSelector);
      logger.info(`Verifying visible (page.field): "${target}"`);
      await page.getByText(target, { exact: false }).first().waitFor({ state: 'visible', timeout: 10000 });
      return;
    }

    // Handle verify with PageName.fieldName format: VERIFY PageName.fieldName CONTAINS "text"
    const verifyPageFieldContainsMatch = code.match(/^(?:verify|expect|assert)\s+(\w+\.\w+)\s+contains\s+["']([^"']+)["']$/i);
    if (verifyPageFieldContainsMatch) {
      const target = this.extractSelectorFromVeroCode(verifyPageFieldContainsMatch[1], originalSelector);
      const expectedText = verifyPageFieldContainsMatch[2];
      logger.info(`Verifying (page.field) "${target}" contains "${expectedText}"`);
      const element = page.getByText(target, { exact: false }).first();
      await element.waitFor({ state: 'visible', timeout: 10000 });
      const text = await element.textContent();
      if (!text || !text.includes(expectedText)) {
        throw new Error(`Expected "${target}" to contain "${expectedText}", but got "${text}"`);
      }
      return;
    }

    // Handle verify/expect/assert visible with quoted string
    const assertVisibleMatch = code.match(/^(?:verify|expect|assert)\s+["']([^"']+)["']\s+is\s+visible$/i);
    if (assertVisibleMatch) {
      const target = assertVisibleMatch[1];
      logger.info(`Verifying visible: "${target}"`);
      await page.getByText(target, { exact: false }).first().waitFor({ state: 'visible', timeout: 10000 });
      return;
    }

    // Handle verify/expect/assert contains with quoted string
    const assertContainsMatch = code.match(/^(?:verify|expect|assert)\s+["']([^"']+)["']\s+contains\s+["']([^"']+)["']$/i);
    if (assertContainsMatch) {
      const target = assertContainsMatch[1];
      const expectedText = assertContainsMatch[2];
      logger.info(`Verifying "${target}" contains "${expectedText}"`);
      const element = page.getByText(target, { exact: false }).first();
      await element.waitFor({ state: 'visible', timeout: 10000 });
      const text = await element.textContent();
      if (!text || !text.includes(expectedText)) {
        throw new Error(`Expected "${target}" to contain "${expectedText}", but got "${text}"`);
      }
      return;
    }

    // If no match, log warning but don't fail
    logger.warn(`Unrecognized Vero code, skipping: ${code}`);
  }

  /**
   * Convert Vero code back to natural language instruction for BrowserAutomation
   */
  private veroCodeToInstruction(veroCode: string): string {
    const code = veroCode.trim().toLowerCase();

    // Handle open/navigate
    const openMatch = veroCode.match(/open\s+["']([^"']+)["']/i);
    if (openMatch) {
      return `Navigate to ${openMatch[1]}`;
    }

    // Handle click
    const clickMatch = veroCode.match(/click\s+(.+)/i);
    if (clickMatch) {
      return `Click on ${clickMatch[1].replace(/["']/g, '')}`;
    }

    // Handle fill
    const fillMatch = veroCode.match(/fill\s+(.+?)\s+with\s+["']([^"']+)["']/i);
    if (fillMatch) {
      return `Fill ${fillMatch[1].replace(/["']/g, '')} with "${fillMatch[2]}"`;
    }

    // Handle expect/verify
    const expectMatch = veroCode.match(/expect\s+(.+?)\s+(is visible|contains\s+["']([^"']+)["'])/i);
    if (expectMatch) {
      return `Verify that ${expectMatch[1].replace(/["']/g, '')} ${expectMatch[2]}`;
    }

    // Default: use the code as-is
    return veroCode;
  }

  /**
   * Update a step's Vero code (after manual edit)
   */
  async updateStepCode(stepId: string, veroCode: string): Promise<void> {
    await aiRecorderStepRepository.update(stepId, { veroCode });
  }

  /**
   * Add a new step to a test case
   */
  async addStep(
    testCaseId: string,
    afterStepNumber: number,
    description: string
  ): Promise<string> {
    // Shift existing steps after the insertion point
    const existingSteps = await aiRecorderStepRepository.findByTestCaseId(testCaseId);
    for (const s of existingSteps) {
      if (s.stepNumber > afterStepNumber) {
        await aiRecorderStepRepository.update(s.id, { stepNumber: s.stepNumber + 1 });
      }
    }

    // Create new step
    const step = await aiRecorderStepRepository.create({
      testCaseId,
      stepNumber: afterStepNumber + 1,
      description,
      stepType: this.parseStepType(description) as any,
      status: 'pending',
      retryCount: 0,
      maxRetries: EXECUTION_CONFIG.maxRetries,
      confidence: 0,
    });

    return step.id;
  }

  /**
   * Delete a step
   */
  async deleteStep(stepId: string): Promise<void> {
    const step = await aiRecorderStepRepository.findById(stepId);

    if (!step) return;

    // Delete the step
    await aiRecorderStepRepository.delete(stepId);

    // Reorder remaining steps
    const remainingSteps = await aiRecorderStepRepository.findByTestCaseId(step.testCaseId);
    for (const s of remainingSteps) {
      if (s.stepNumber > step.stepNumber) {
        await aiRecorderStepRepository.update(s.id, { stepNumber: s.stepNumber - 1 });
      }
    }
  }

  // ----------------------------------------
  // Browser Capture Features
  // ----------------------------------------

  /**
   * Active BrowserAutomation instances for capture mode
   * Maps sessionId:testCaseId to stagehand instance
   */
  private captureBrowserAutomationMap: Map<string, BrowserAutomationService> = new Map();

  /**
   * Start browser capture mode for a step (single action) or manual recording (multiple actions)
   */
  async startBrowserCapture(
    sessionId: string,
    testCaseId: string,
    stepId: string | undefined,
    mode: 'single' | 'manual',
    aiSettings: any
  ): Promise<{ success: boolean; error?: string }> {
    const captureKey = `${sessionId}:${testCaseId}`;

    try {
      // Initialize headed BrowserAutomation for capture
      const stagehandConfig: Record<string, unknown> = {
        modelName: aiSettings.modelName,
        apiKey: aiSettings.apiKey,
        headless: false, // Must be headed for user interaction
        useBrowserbase: aiSettings.useBrowserbase,
        browserbaseApiKey: aiSettings.browserbaseApiKey,
      };

      const stagehand = new BrowserAutomationService(stagehandConfig);
      await stagehand.initialize();

      // Get the page and context from BrowserAutomation
      const page = stagehand.getActivePage();
      const context = stagehand.getBrowserContext();

      if (!page || !context) {
        throw new Error('Failed to get browser page from BrowserAutomation');
      }

      // Navigate to the test case's target URL if available
      const testCase = await aiRecorderTestCaseRepository.findById(testCaseId);
      if (testCase?.targetUrl) {
        await stagehand.navigateTo(testCase.targetUrl);
      }

      // Store stagehand instance for later cleanup
      this.captureBrowserAutomationMap.set(captureKey, stagehand);

      // Start browser capture
      // Note: BrowserAutomation Page is compatible with Playwright Page at runtime
      // but TypeScript types differ slightly
      await browserCaptureService.startCapture(
        sessionId,
        testCaseId,
        stepId,
        mode,
        page as any,
        context as any
      );

      // Update test case status to manual_recording if in manual mode
      if (mode === 'manual') {
        await aiRecorderTestCaseRepository.update(testCaseId, {
          status: 'manual_recording',
        });
      }

      // Set up event forwarding from capture service
      this.setupCaptureEventForwarding(sessionId, testCaseId, stepId);

      logger.info('Browser capture started', { sessionId, testCaseId, stepId, mode });

      this.emit('capture:started', {
        sessionId,
        testCaseId,
        stepId,
        mode,
      });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to start browser capture:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop browser capture and process captured actions
   */
  async stopBrowserCapture(
    sessionId: string,
    testCaseId: string
  ): Promise<{ success: boolean; actions: CapturedAction[]; error?: string }> {
    const captureKey = `${sessionId}:${testCaseId}`;

    try {
      // Stop capture and get actions
      const actions = await browserCaptureService.stopCapture(sessionId, testCaseId);

      // Clean up BrowserAutomation
      const stagehand = this.captureBrowserAutomationMap.get(captureKey);
      if (stagehand) {
        await stagehand.close();
        this.captureBrowserAutomationMap.delete(captureKey);
      }

      // Process captured actions into steps
      if (actions.length > 0) {
        await this.processCapturedActions(sessionId, testCaseId, actions);
      }

      // Update test case status
      await aiRecorderTestCaseRepository.update(testCaseId, {
        status: 'human_review',
      });

      logger.info('Browser capture stopped', { sessionId, testCaseId, actionsCount: actions.length });

      this.emit('capture:stopped', {
        sessionId,
        testCaseId,
        actions,
      });

      return { success: true, actions };
    } catch (error: any) {
      logger.error('Failed to stop browser capture:', error);
      return { success: false, actions: [], error: error.message };
    }
  }

  /**
   * Process captured browser actions and convert them to steps
   */
  private async processCapturedActions(
    sessionId: string,
    testCaseId: string,
    actions: CapturedAction[]
  ): Promise<void> {
    const captureSession = browserCaptureService.getCaptureSession(sessionId, testCaseId);

    if (captureSession?.stepId) {
      // Single step replacement mode - update the specific step
      if (actions.length > 0) {
        await aiRecorderStepRepository.update(captureSession.stepId, {
          status: 'captured',
          veroCode: actions[0].veroCode,
          selector: actions[0].selector,
        });
      }
    } else {
      // Manual recording mode - add all actions as new steps
      const maxStepNumber = await aiRecorderStepRepository.getMaxStepNumber(testCaseId);

      let nextStepNumber = maxStepNumber + 1;

      for (const action of actions) {
        await aiRecorderStepRepository.create({
          testCaseId,
          stepNumber: nextStepNumber++,
          description: this.actionToDescription(action),
          stepType: 'click',
          status: 'captured',
          veroCode: action.veroCode,
          selector: action.selector,
          retryCount: 0,
          maxRetries: EXECUTION_CONFIG.maxRetries,
          confidence: 0,
        });
      }
    }
  }

  /**
   * Convert a captured action to a human-readable description
   */
  private actionToDescription(action: CapturedAction): string {
    switch (action.type) {
      case 'click':
        return `Click on ${action.target}`;
      case 'fill':
        return `Fill ${action.target} with "${action.value || ''}"`;
      case 'select':
        return `Select "${action.value || ''}" from ${action.target}`;
      case 'check':
        return `Check ${action.target}`;
      case 'uncheck':
        return `Uncheck ${action.target}`;
      case 'navigate':
        return `Navigate to ${action.value || action.target}`;
      case 'hover':
        return `Hover over ${action.target}`;
      case 'press':
        return `Press ${action.value || 'Enter'} key`;
      default:
        return `Perform ${action.type} on ${action.target}`;
    }
  }

  /**
   * Set up event forwarding from browser capture service
   */
  private setupCaptureEventForwarding(
    sessionId: string,
    testCaseId: string,
    stepId: string | undefined
  ): void {
    const handleAction = async (data: {
      sessionId: string;
      testCaseId: string;
      stepId?: string;
      action: CapturedAction;
    }) => {
      // Only forward events for this capture session
      if (data.sessionId !== sessionId || data.testCaseId !== testCaseId) return;

      // If single step mode and we have a stepId, update that step
      if (stepId && data.action) {
        await aiRecorderStepRepository.update(stepId, {
          status: 'captured',
          veroCode: data.action.veroCode,
          selector: data.action.selector,
        });

        // Update test case status
        await aiRecorderTestCaseRepository.update(testCaseId, {
          status: 'partially_complete',
          stuckAtStep: undefined,
        });
      }

      // Emit the action to WebSocket clients
      this.emit('capture:action', {
        sessionId,
        testCaseId,
        stepId,
        action: data.action,
      });
    };

    // Listen for capture actions
    browserCaptureService.on('capture:action', handleAction);

    // Clean up listener when capture stops
    const handleStopped = (data: { sessionId: string; testCaseId: string }) => {
      if (data.sessionId === sessionId && data.testCaseId === testCaseId) {
        browserCaptureService.off('capture:action', handleAction);
        browserCaptureService.off('capture:stopped', handleStopped);
      }
    };
    browserCaptureService.on('capture:stopped', handleStopped);
  }

  /**
   * Check if browser capture is active for a test case
   */
  isCapturing(sessionId: string, testCaseId: string): boolean {
    return browserCaptureService.isCapturing(sessionId, testCaseId);
  }

  // ----------------------------------------
  // Debugger Features (Stateful Execution)
  // ----------------------------------------

  /**
   * Stop any active debug session for this session ID
   */
  async stopDebugSession(sessionId: string): Promise<void> {
    const session = this.debugSessions.get(sessionId);
    if (session) {
      logger.info(`Stopping debug session for ${sessionId}`);
      try {
        await session.browser.close();
      } catch (e) {
        logger.warn('Error closing debug browser:', e);
      }
      this.debugSessions.delete(sessionId);
    }
  }

  /**
   * Run test case up to a specific step number (inclusive)
   * Maintains browser state between runs
   */
  async runVeroTestCaseToStep(
    sessionId: string,
    testCaseId: string,
    targetStepNumber: number
  ): Promise<{ success: boolean; stepsCompleted: number; error?: string }> {
    const testCase = await aiRecorderTestCaseRepository.findById(testCaseId);

    if (!testCase) {
      return { success: false, stepsCompleted: 0, error: 'Test case not found' };
    }

    const steps = await aiRecorderStepRepository.findByTestCaseId(testCaseId);
    const session = await aiRecorderSessionRepository.findById(sessionId);

    let stepsCompleted = 0;
    let page: Page;

    try {
      // 1. Get or create debug session
      let debugSession = this.debugSessions.get(sessionId);

      if (!debugSession) {
        logger.info(`Starting new debug session for ${sessionId}`);
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        page = await context.newPage();

        this.debugSessions.set(sessionId, { browser, page, context });
        debugSession = { browser, page, context };

        // Initial navigation
        const targetUrl = testCase.targetUrl || session?.baseUrl;
        if (targetUrl) {
          await page.goto(targetUrl);

          // Initial screenshot
          const screenshotBuffer = await page.screenshot();
          const screenshot = screenshotBuffer.toString('base64');
          this.emit('run:screenshot', {
            sessionId,
            testCaseId,
            stepNumber: 0,
            screenshot,
            url: targetUrl,
          });
        }
      } else {
        page = debugSession.page;
        // Bring to front
        try {
          await page.bringToFront();
        } catch {
          // If page is closed/crashed, restart session
          await this.stopDebugSession(sessionId);
          return this.runVeroTestCaseToStep(sessionId, testCaseId, targetStepNumber);
        }
      }

      // 2. Determine which steps to run
      // In a real debugger, we'd track 'currentStep' index. 
      // For now, we'll run from the beginning if it seems we aren't at the right state, 
      // or we assume the user wants to "Run from start to X". 
      // But preserving state is key. 
      // Simplified approach: Run from step 1 to targetStepNumber.
      // Ideally, we skip steps that are already "done" if we knew the state.
      // But to be safe, "Run To Step" usually implies re-running the flow to get there.
      // However, if we simply re-run everything, we don't need stateful sessions except to NOT close the browser at the end.

      this.emit('run:started', {
        sessionId,
        testCaseId,
        totalSteps: steps.length,
      });

      // Filter steps to run: 1 to targetStepNumber
      const stepsToRun = steps.filter(s => s.stepNumber <= targetStepNumber);

      for (const step of stepsToRun) {
        // Emit step starting
        this.emit('run:step', {
          sessionId,
          testCaseId,
          stepId: step.id,
          stepNumber: step.stepNumber,
          description: step.description,
          status: 'running',
        });

        try {
          if (!step.veroCode) {
            this.emit('run:step', {
              sessionId,
              testCaseId,
              stepId: step.id,
              stepNumber: step.stepNumber,
              description: step.description,
              status: 'skipped',
            });
            continue;
          }

          // Execute
          await this.executeVeroCode(page, step.veroCode, step.selector || undefined);
          stepsCompleted++;

          // Screenshot
          const screenshotBuffer = await page.screenshot();
          const screenshot = screenshotBuffer.toString('base64');
          const currentUrl = page.url();

          this.emit('run:step', {
            sessionId,
            testCaseId,
            stepId: step.id,
            stepNumber: step.stepNumber,
            description: step.description,
            status: 'success',
            veroCode: step.veroCode,
            screenshot,
            url: currentUrl
          });

          await this.sleep(200);

        } catch (stepError: any) {
          this.emit('run:step', {
            sessionId,
            testCaseId,
            stepId: step.id,
            stepNumber: step.stepNumber,
            description: step.description,
            status: 'error',
            error: stepError.message,
          });
          throw stepError; // Stop execution on error
        }
      }

      return {
        success: true,
        stepsCompleted
      };

    } catch (error: any) {
      logger.error('Error in runVeroTestCaseToStep:', error);
      this.emit('run:error', {
        sessionId,
        testCaseId,
        error: error.message,
      });
      return { success: false, stepsCompleted, error: error.message };
    }
  }

  /**
   * Run a single step directly (Debugger "Step Over")
   * Uses existing debug session if available
   */
  async runVeroStepDirectly(
    sessionId: string,
    testCaseId: string,
    stepId: string
  ): Promise<{ success: boolean; error?: string }> {
    // Get existing session
    let debugSession = this.debugSessions.get(sessionId);
    if (!debugSession) {
      // If no session, we can't contextually run "just this step" easily without setup.
      // However, we'll try to start one.
      // But wait, "Step Over" implies we are paused. 
      // If not paused, we probably shouldn't be here.
      // We'll throw an error telling user to "Start Debugging" first (Run To Step or Run All).
      // Or we just launch and try? No, that's risky.
      return { success: false, error: 'No active debug session. Use "Run to Step" or "Run All" first.' };
    }

    const step = await aiRecorderStepRepository.findById(stepId);

    if (!step || !step.veroCode) {
      return { success: false, error: 'Step not found or empty code' };
    }

    const page = debugSession.page;

    try {
      // Emit run started
      this.emit('run:started', {
        sessionId,
        testCaseId,
        totalSteps: 1, // Single step
      });

      this.emit('run:step', {
        sessionId,
        testCaseId,
        stepId: step.id,
        stepNumber: step.stepNumber,
        description: step.description,
        status: 'running',
      });

      await this.executeVeroCode(page, step.veroCode, step.selector || undefined);

      const screenshotBuffer = await page.screenshot();
      const screenshot = screenshotBuffer.toString('base64');
      const currentUrl = page.url();

      this.emit('run:step', {
        sessionId,
        testCaseId,
        stepId: step.id,
        stepNumber: step.stepNumber,
        description: step.description,
        status: 'success',
        veroCode: step.veroCode,
        screenshot,
        url: currentUrl
      });

      // Emit run complete
      this.emit('run:complete', {
        sessionId,
        testCaseId,
        stepsCompleted: 1,
        totalSteps: 1,
        success: true,
      });

      return { success: true };

    } catch (error: any) {
      this.emit('run:step', {
        sessionId,
        testCaseId,
        stepId: step.id,
        stepNumber: step.stepNumber,
        description: step.description,
        status: 'error',
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  // ----------------------------------------
  // Approval & Export
  // ----------------------------------------



  /**
   * Preview Vero code for a test case before saving
   */
  async previewTestCaseVero(
    testCaseId: string,
    targetPath: string
  ): Promise<{
    veroCode: string;
    filePath: string;
    fileExists: boolean;
    existingContent: string | null;
    willMerge: boolean;
  }> {
    const testCase = await aiRecorderTestCaseRepository.findById(testCaseId);

    if (!testCase) {
      throw new Error('Test case not found');
    }

    const steps = await aiRecorderStepRepository.findByTestCaseId(testCaseId);

    // Generate Vero scenario content
    const veroCode = this.generateVeroScenario({ ...testCase, steps });

    // Determine file path
    const fileName = testCase.name.toLowerCase().replace(/\s+/g, '_') + '.vero';
    const filePath = path.join(targetPath, fileName);

    // Check if file exists
    let fileExists = false;
    let existingContent: string | null = null;
    try {
      existingContent = await fs.readFile(filePath, 'utf-8');
      fileExists = true;
    } catch {
      // File doesn't exist
    }

    // Check if we'll merge (file exists and has different scenarios)
    const scenarioName = this.toPascalCaseIdentifier(testCase.name);
    const willMerge = fileExists && existingContent !== null &&
      !existingContent.includes(`SCENARIO ${scenarioName}`);

    return {
      veroCode,
      filePath,
      fileExists,
      existingContent,
      willMerge,
    };
  }

  /**
   * Convert a test case name to a PascalCase identifier
   * e.g., "Progressive Auto Insurance Quote Flow" -> "ProgressiveAutoInsuranceQuoteFlow"
   */
  private toPascalCaseIdentifier(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Clean up a field name for Vero DSL
   * Removes quotes, special chars, and converts to camelCase
   */
  private cleanFieldName(field: string): string {
    // Remove all quotes
    let cleaned = field.replace(/["']/g, '');
    // Remove all non-alphanumeric characters (replace with space for word splitting)
    cleaned = cleaned.replace(/[^a-zA-Z0-9]/g, ' ');
    // Normalize spaces and trim
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    // Split into words and convert to camelCase
    const words = cleaned.split(' ').filter(w => w.length > 0);
    if (words.length === 0) return 'element';
    return words
      .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Generate Vero scenario code from test case
   * Uses SCENARIO with PascalCase identifier (not quoted string)
   * Applies fixVeroSyntax to clean up any legacy/invalid syntax
   */
  private generateVeroScenario(testCase: any): string {
    const scenarioName = this.toPascalCaseIdentifier(testCase.name);
    const stepsCode = testCase.steps
      .filter((s: any) => s.veroCode)
      .map((s: any) => {
        // Clean up each step's veroCode
        let code = s.veroCode;
        // Fix lowercase open -> OPEN
        code = code.replace(/^open\s+/i, 'OPEN ');
        // Fix invalid field names: match PageName.fieldWithQuotes"OrSpecialChars
        // The field part can contain quotes and special chars that need cleaning
        code = code.replace(
          /(\w+Page)\.([^\s]+?)(\s|$)/g,
          (match: string, page: string, field: string, suffix: string) => {
            const cleanField = this.cleanFieldName(field);
            return `${page}.${cleanField}${suffix}`;
          }
        );
        // Fix double-quoted values: ""value"" -> "value"
        code = code.replace(/""([^"]+)""/g, '"$1"');
        return `  ${code}`;
      })
      .join('\n');

    const scenario = `SCENARIO ${scenarioName} {
${stepsCode}
}`;

    // Apply global fixVeroSyntax for any remaining issues
    return fixVeroSyntax(scenario);
  }

  /**
   * Approve a test case and save as .vero file
   * Supports merging with existing files
   */
  async approveTestCase(
    testCaseId: string,
    targetPath: string,
    options: {
      merge?: boolean; // If true, append to existing file
      overwrite?: boolean; // If true, replace existing scenario
    } = {}
  ): Promise<string> {
    const testCase = await aiRecorderTestCaseRepository.findById(testCaseId);

    if (!testCase) {
      throw new Error('Test case not found');
    }

    const steps = await aiRecorderStepRepository.findByTestCaseId(testCaseId);
    const testCaseWithSteps = { ...testCase, steps };

    const scenarioCode = this.generateVeroScenario(testCaseWithSteps);

    // Extract page fields to create separate Page files
    const pageFields = this.extractPageFieldsFromSteps(steps);
    const pageNames = Object.keys(pageFields);

    // Determine if targetPath is a sandbox folder (has Pages/ and Features/ subfolders)
    // If targetPath ends with Features/, use parent as sandbox root
    let sandboxRoot = targetPath;
    if (targetPath.endsWith('/Features') || targetPath.endsWith('\\Features')) {
      sandboxRoot = path.dirname(targetPath);
    } else if (targetPath.includes('/Features/') || targetPath.includes('\\Features\\')) {
      sandboxRoot = targetPath.split(/[/\\]Features[/\\]/)[0];
    }

    const pagesDir = path.join(sandboxRoot, 'Pages');
    const featuresDir = path.join(sandboxRoot, 'Features');

    // Create directories
    await fs.mkdir(pagesDir, { recursive: true });
    await fs.mkdir(featuresDir, { recursive: true });

    // Write separate Page files for each referenced page
    const createdPageFiles: string[] = [];
    for (const [pageName, fields] of Object.entries(pageFields)) {
      const pageFilePath = path.join(pagesDir, `${pageName}.vero`);

      // Check if page file already exists
      let existingPageContent: string | null = null;
      try {
        existingPageContent = await fs.readFile(pageFilePath, 'utf-8');
      } catch {
        // File doesn't exist
      }

      if (existingPageContent) {
        // Merge new fields into existing page
        const existingFieldNames = new Set<string>();
        const fieldMatches = existingPageContent.matchAll(/FIELD\s+(\w+)\s*=/g);
        for (const match of fieldMatches) {
          existingFieldNames.add(match[1]);
        }

        // Filter out fields that already exist
        const newFields = fields.filter(f => !existingFieldNames.has(f.fieldName));

        if (newFields.length > 0) {
          // Add new fields before the closing brace
          const newFieldLines = newFields.map(f => {
            const selectorType = f.selectorType || 'text';
            const selector = f.selector || f.fieldName;
            return `    FIELD ${f.fieldName} = ${selectorType} "${selector}"`;
          }).join('\n');

          const updatedContent = existingPageContent.replace(
            /(\n\s*})(\s*)$/,
            `\n${newFieldLines}\n}$2`
          );
          await fs.writeFile(pageFilePath, updatedContent, 'utf-8');
          logger.info(`[AIRecorder] Merged ${newFields.length} new fields into: ${pageFilePath}`);
          createdPageFiles.push(pageFilePath);
        }
      } else {
        // Create new page file
        const fieldDefs = fields.map(f => ({
          name: f.fieldName,
          selectorType: f.selectorType || 'text',
          selector: f.selector || f.fieldName
        }));
        const pageContent = generateVeroPage(pageName, fieldDefs);
        await fs.writeFile(pageFilePath, pageContent, 'utf-8');
        logger.info(`[AIRecorder] Created Page file: ${pageFilePath}`);
        createdPageFiles.push(pageFilePath);
      }
    }

    // Generate Feature file with just the FEATURE wrapper and USE statements
    const featureName = this.toPascalCaseIdentifier(testCase.name);
    const featureCode = generateVeroFeature(featureName, [scenarioCode], pageNames);
    const featureFileName = testCase.name.toLowerCase().replace(/\s+/g, '_') + '.vero';
    const featureFilePath = path.join(featuresDir, featureFileName);

    // Check for existing feature file
    let existingContent: string | null = null;
    try {
      existingContent = await fs.readFile(featureFilePath, 'utf-8');
    } catch {
      // File doesn't exist
    }

    let finalContent: string;
    if (existingContent) {
      // File exists - decide how to handle
      const scenarioIdent = this.toPascalCaseIdentifier(testCase.name);
      const scenarioPattern = new RegExp(
        `SCENARIO\\s+${scenarioIdent}\\s*\\{[\\s\\S]*?\\n\\}`,
        'g'
      );

      if (scenarioPattern.test(existingContent)) {
        // Scenario with same name exists
        if (options.overwrite) {
          // Replace the existing scenario
          finalContent = existingContent.replace(scenarioPattern, scenarioCode);
          logger.info(`[AIRecorder] Overwrote existing scenario in: ${featureFilePath}`);
        } else {
          throw new Error(`SCENARIO ${scenarioIdent} already exists in ${featureFileName}. Use overwrite option to replace.`);
        }
      } else if (options.merge) {
        // Append scenario to existing feature
        // Find the closing brace of the FEATURE and insert before it
        finalContent = existingContent.replace(
          /(\n})(\s*)$/,
          `\n\n${scenarioCode}\n}$2`
        );
        logger.info(`[AIRecorder] Merged scenario into: ${featureFilePath}`);
      } else {
        // Create new feature file
        finalContent = featureCode;
        logger.info(`[AIRecorder] Created new Feature file: ${featureFilePath}`);
      }
    } else {
      // New file
      const header = testCase.description ? `# ${testCase.description}\n\n` : '';
      finalContent = header + featureCode;
      logger.info(`[AIRecorder] Created Feature file: ${featureFilePath}`);
    }

    await fs.writeFile(featureFilePath, finalContent, 'utf-8');

    // Update test case status
    await aiRecorderTestCaseRepository.update(testCaseId, {
      status: 'complete',
      veroCode: scenarioCode,
    });

    logger.info(`[AIRecorder] Approved test case. Created ${createdPageFiles.length} Page files and 1 Feature file.`);
    return featureFilePath;
  }

  /**
   * Generate full Vero file content with PAGE objects, FEATURE wrapper, and USE statements
   */
  private generateVeroFileContent(testCase: any, scenarioCode: string): string {
    // Extract page references from steps to generate PAGE objects
    const pageFields = this.extractPageFieldsFromSteps(testCase.steps || []);

    // Generate PAGE objects
    const pageObjects: string[] = [];
    const pageNames: string[] = [];

    for (const [pageName, fields] of Object.entries(pageFields)) {
      pageNames.push(pageName);
      const fieldDefs = fields.map(f => ({
        name: f.fieldName,
        selectorType: f.selectorType || 'text',
        selector: f.selector || f.fieldName
      }));
      pageObjects.push(generateVeroPage(pageName, fieldDefs));
    }

    // Generate FEATURE with USE statements
    const featureName = this.toPascalCaseIdentifier(testCase.name);
    const featureContent = generateVeroFeature(featureName, [scenarioCode], pageNames);

    // Combine PAGE objects and FEATURE
    const header = testCase.description ? `# ${testCase.description}\n\n` : '';
    const pages = pageObjects.length > 0 ? pageObjects.join('\n\n') + '\n\n' : '';

    return `${header}${pages}${featureContent}\n`;
  }

  /**
   * Extract page field references from steps' veroCode
   * Returns a map of pageName -> array of field info
   */
  private extractPageFieldsFromSteps(steps: any[]): Record<string, Array<{ fieldName: string, selector?: string, selectorType?: string }>> {
    const pageFields: Record<string, Array<{ fieldName: string, selector?: string, selectorType?: string }>> = {};

    for (const step of steps) {
      if (!step.veroCode) continue;

      // Match PageName.fieldName patterns
      const matches = step.veroCode.matchAll(/(\w+Page)\.(\w+)/g);

      for (const match of matches) {
        const pageName = match[1];
        const fieldName = match[2];

        if (!pageFields[pageName]) {
          pageFields[pageName] = [];
        }

        // Check if field already exists
        const exists = pageFields[pageName].some(f => f.fieldName === fieldName);
        if (!exists) {
          pageFields[pageName].push({
            fieldName,
            selector: step.selector || fieldName,
            selectorType: step.selectorType || this.inferSelectorType(fieldName)
          });
        }
      }
    }

    return pageFields;
  }

  /**
   * Infer selector type from field name
   */
  private inferSelectorType(fieldName: string): string {
    const name = fieldName.toLowerCase();
    if (name.includes('button') || name.includes('btn')) return 'button';
    if (name.includes('textbox') || name.includes('input') || name.includes('field')) return 'textbox';
    if (name.includes('link')) return 'link';
    if (name.includes('checkbox') || name.includes('check')) return 'checkbox';
    if (name.includes('dropdown') || name.includes('select')) return 'combobox';
    if (name.includes('text') || name.includes('label')) return 'text';
    return 'text';
  }

  /**
   * Get generated Vero code for a test case
   * Uses SCENARIO with PascalCase identifier (correct Vero syntax)
   */
  async getTestCaseVeroCode(testCaseId: string): Promise<string | null> {
    const testCase = await aiRecorderTestCaseRepository.findById(testCaseId);

    if (!testCase) return null;

    const steps = await aiRecorderStepRepository.findByTestCaseId(testCaseId);

    // Use generateVeroScenario for consistent syntax
    return this.generateVeroScenario({ ...testCase, steps });
  }

  // ----------------------------------------
  // Excel Import
  // ----------------------------------------

  /**
   * Parse Excel file to extract test cases
   */
  async parseExcelTestCases(buffer: Buffer): Promise<TestCaseInput[]> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to JSON - returns array of arrays
    const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: '' });

    if (rows.length < 2) {
      throw new Error('Excel file must have at least a header row and one data row');
    }

    // Assume format: Test Case Name | Step 1 | Step 2 | ...
    const testCases: TestCaseInput[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue;

      const name = String(row[0]);
      const steps: string[] = [];

      for (let j = 1; j < row.length; j++) {
        const stepText = row[j];
        if (stepText && String(stepText).trim()) {
          steps.push(String(stepText).trim());
        }
      }

      if (steps.length > 0) {
        testCases.push({ name, steps });
      }
    }

    return testCases;
  }

  // ----------------------------------------
  // Helpers
  // ----------------------------------------

  private parseStepType(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('navigate') || lower.includes('go to') || lower.includes('open')) return 'navigate';
    if (lower.includes('fill') || lower.includes('enter') || lower.includes('type')) return 'fill';
    if (lower.includes('click') || lower.includes('press') || lower.includes('tap')) return 'click';
    if (lower.includes('assert') || lower.includes('verify') || lower.includes('check') || lower.includes('expect')) return 'assert';
    if (lower.includes('loop') || lower.includes('each') || lower.includes('iterate')) return 'loop';
    if (lower.includes('wait')) return 'wait';
    return 'click';
  }

  /**
   * Convert BrowserAutomation's action description to a Vero-friendly selector
   * BrowserAutomation returns descriptions like:
   *   - "combobox: Search with DuckDuckGo"
   *   - "button: Submit"
   *   - "textbox: Email address"
   *   - "link: Sign up"
   *
   * We convert these to Vero selectors:
   *   - "Search with DuckDuckGo" (for inputs/comboboxes)
   *   - "Submit" button (for buttons)
   *   - "Email address" (for textboxes)
   *   - "Sign up" link (for links)
   */
  private convertToVeroSelector(
    actionDescription: string | null,
    stepDescription: string
  ): string {
    // If no action description, try to extract from step description
    if (!actionDescription) {
      return this.extractSelectorFromDescription(stepDescription);
    }

    // Parse BrowserAutomation's format: "role: label text"
    const match = actionDescription.match(/^(\w+):\s*(.+)$/);
    if (!match) {
      return `"${actionDescription}"`;
    }

    const role = match[1].toLowerCase();
    const label = match[2].trim();

    // Map roles to Vero selector format
    switch (role) {
      case 'button':
        return `"${label}" button`;
      case 'link':
        return `"${label}" link`;
      case 'textbox':
      case 'combobox':
      case 'searchbox':
        return `"${label}"`;
      case 'checkbox':
        return `"${label}" checkbox`;
      case 'radio':
        return `"${label}" radio`;
      default:
        return `"${label}"`;
    }
  }

  /**
   * Extract a meaningful selector from the step description when BrowserAutomation doesn't provide one
   * e.g., "Click the Submit button" -> "Submit" button
   * e.g., "Fill the email field with test@example.com" -> "email"
   */
  private extractSelectorFromDescription(description: string): string {
    const lower = description.toLowerCase();

    // Extract button name: "click the X button" or "click X"
    const buttonMatch = description.match(/click\s+(?:the\s+)?['\"]?(.+?)['\"]?\s*(?:button)?$/i);
    if (buttonMatch && lower.includes('button')) {
      const name = buttonMatch[1].replace(/button$/i, '').trim();
      return `"${name}" button`;
    }

    // Extract link name
    const linkMatch = description.match(/click\s+(?:the\s+)?['\"]?(.+?)['\"]?\s*link/i);
    if (linkMatch) {
      return `"${linkMatch[1].trim()}" link`;
    }

    // Extract field name for fill: "fill the X field" or "type in X"
    const fillMatch = description.match(/(?:fill|type|enter)\s+(?:in\s+)?(?:the\s+)?['\"]?([^'\"]+?)['\"]?\s+(?:field|box|input)?/i);
    if (fillMatch) {
      return `"${fillMatch[1].trim()}"`;
    }

    // Default: extract quoted text or key words
    const quotedMatch = description.match(/['\"]([^'\"]+)['\"]/);
    if (quotedMatch) {
      return `"${quotedMatch[1]}"`;
    }

    // Fallback
    return '"element"';
  }

  private getSelectorType(selector: string | null): string | null {
    if (!selector) return null;
    if (selector.startsWith('[data-testid=')) return 'testid';
    if (selector.startsWith('[role=')) return 'role';
    if (selector.startsWith('[aria-label=')) return 'label';
    if (selector.startsWith('text=') || selector.startsWith('"')) return 'text';
    if (selector.startsWith('//') || selector.startsWith('xpath=')) return 'xpath';
    return 'css';
  }

  private async saveScreenshot(stepId: string, base64: string | null): Promise<string | null> {
    if (!base64) return null;
    try {
      const screenshotsDir = path.join(process.cwd(), 'screenshots', 'ai-recorder');
      await fs.mkdir(screenshotsDir, { recursive: true });

      const fileName = `${stepId}.png`;
      const filePath = path.join(screenshotsDir, fileName);

      const buffer = Buffer.from(base64, 'base64');
      await fs.writeFile(filePath, buffer);

      return filePath;
    } catch (error) {
      logger.warn('Failed to save screenshot:', error);
      return null;
    }
  }

  private async markSessionComplete(sessionId: string): Promise<void> {
    await aiRecorderSessionRepository.update(sessionId, {
      status: 'human_review',
      completedAt: new Date(),
    });

    this.runningPools.delete(sessionId);

    this.emit('session:completed', { sessionId });
  }

  private async markSessionFailed(sessionId: string, error: string): Promise<void> {
    await aiRecorderSessionRepository.update(sessionId, {
      status: 'failed',
      completedAt: new Date(),
    });

    this.runningPools.delete(sessionId);

    this.emit('session:failed', { sessionId, error });
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Step timeout exceeded')), ms);
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const aiRecorderService = new AIRecorderService();
