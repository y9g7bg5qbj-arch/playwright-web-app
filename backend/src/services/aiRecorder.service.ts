/**
 * AIRecorderService - Convert plain English test scenarios to Vero scripts
 *
 * Features:
 * - Pool-based parallel execution (5 concurrent browsers)
 * - Retry logic (10 attempts, exponential backoff)
 * - Fail-fast (30s timeout per attempt)
 * - Real Stagehand browser automation
 * - WebSocket event emission for real-time updates
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { prisma } from '../db/prisma';
import { StagehandService, StagehandConfig, ActResult } from './copilot/StagehandService';
import { browserCaptureService, CapturedAction } from './aiRecorder.browserCapture';
import { logger } from '../utils/logger';

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
    const sessionId = uuidv4();

    // Create session in database
    const session = await prisma.aIRecorderSession.create({
      data: {
        id: sessionId,
        userId: params.userId,
        applicationId: params.applicationId,
        environment: params.environment || 'staging',
        baseUrl: params.baseUrl,
        headless: params.headless ?? true,
        status: 'pending',
        totalTests: params.testCases.length,
        completedTests: 0,
        failedTests: 0,
      },
    });

    // Create test cases with steps
    for (let i = 0; i < params.testCases.length; i++) {
      const tc = params.testCases[i];
      const testCase = await prisma.aIRecorderTestCase.create({
        data: {
          sessionId: session.id,
          name: tc.name,
          description: tc.description,
          targetUrl: tc.targetUrl,
          order: i,
          status: 'pending',
        },
      });

      // Create steps for this test case
      for (let j = 0; j < tc.steps.length; j++) {
        await prisma.aIRecorderStep.create({
          data: {
            testCaseId: testCase.id,
            stepNumber: j + 1,
            description: tc.steps[j],
            stepType: this.parseStepType(tc.steps[j]),
            status: 'pending',
            maxRetries: EXECUTION_CONFIG.maxRetries,
          },
        });
      }
    }

    logger.info(`AI Recorder session created: ${sessionId} with ${params.testCases.length} test cases`);
    this.emit('session:created', { sessionId });

    return sessionId;
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
    await prisma.aIRecorderSession.update({
      where: { id: sessionId },
      data: {
        status: 'processing',
        startedAt: new Date(),
      },
    });

    // Get test cases
    const testCases = await prisma.aIRecorderTestCase.findMany({
      where: { sessionId },
      include: { steps: true },
      orderBy: { order: 'asc' },
    });

    // Create abort controller for this session
    const abortController = new AbortController();
    this.runningPools.set(sessionId, abortController);

    // Start parallel execution in background
    this.executeTestCasesInPool(sessionId, testCases, aiSettings, abortController.signal)
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
    const session = await prisma.aIRecorderSession.findUnique({
      where: { id: sessionId },
      include: {
        testCases: {
          include: { steps: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!session) return null;

    return {
      sessionId: session.id,
      status: session.status,
      totalTests: session.totalTests,
      completedTests: session.completedTests,
      failedTests: session.failedTests,
      testCases: session.testCases.map((tc) => ({
        id: tc.id,
        name: tc.name,
        status: tc.status,
        steps: tc.steps.map((s) => ({
          id: s.id,
          stepNumber: s.stepNumber,
          description: s.description,
          status: s.status,
          veroCode: s.veroCode,
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

    await prisma.aIRecorderSession.update({
      where: { id: sessionId },
      data: { status: 'cancelled' },
    });

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
    let stagehand: StagehandService | null = null;

    try {
      // Mark test case as in progress
      await prisma.aIRecorderTestCase.update({
        where: { id: testCase.id },
        data: {
          status: 'in_progress',
          startedAt: new Date(),
        },
      });

      this.emit('testCase:started', { sessionId, testCaseId: testCase.id, name: testCase.name });

      // Initialize Stagehand for this test case
      const stagehandConfig: StagehandConfig = {
        modelName: aiSettings.modelName,
        apiKey: aiSettings.apiKey,
        headless: true, // Always headless during authoring
        useBrowserbase: aiSettings.useBrowserbase,
        browserbaseApiKey: aiSettings.browserbaseApiKey,
      };

      stagehand = new StagehandService(stagehandConfig);
      await stagehand.initialize();

      // Navigate to target URL if specified
      if (testCase.targetUrl) {
        await stagehand.navigateTo(testCase.targetUrl);
      }

      // Get session to check for base URL
      const session = await prisma.aIRecorderSession.findUnique({
        where: { id: sessionId },
      });

      if (session?.baseUrl && !testCase.targetUrl) {
        await stagehand.navigateTo(session.baseUrl);
      }

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
      await prisma.aIRecorderTestCase.update({
        where: { id: testCase.id },
        data: {
          status: finalStatus,
          completedAt: new Date(),
        },
      });

      // Update session counters
      await prisma.aIRecorderSession.update({
        where: { id: sessionId },
        data: {
          completedTests: { increment: 1 },
          failedTests: allStepsSuccessful ? undefined : { increment: 1 },
        },
      });

      this.emit('testCase:completed', {
        sessionId,
        testCaseId: testCase.id,
        status: finalStatus,
      });
    } catch (error: any) {
      logger.error(`Test case ${testCase.id} failed:`, error);

      await prisma.aIRecorderTestCase.update({
        where: { id: testCase.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });

      await prisma.aIRecorderSession.update({
        where: { id: sessionId },
        data: {
          completedTests: { increment: 1 },
          failedTests: { increment: 1 },
        },
      });

      this.emit('testCase:failed', {
        sessionId,
        testCaseId: testCase.id,
        error: error.message,
      });
    } finally {
      // Clean up Stagehand
      if (stagehand) {
        try {
          await stagehand.close();
        } catch (e) {
          logger.warn('Error closing Stagehand:', e);
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
    stagehand: StagehandService,
    signal: AbortSignal
  ): Promise<StepExecutionResult> {
    // Mark step as running
    await prisma.aIRecorderStep.update({
      where: { id: step.id },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
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
        await prisma.aIRecorderStep.update({
          where: { id: step.id },
          data: { retryCount: attempt },
        });

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
          await prisma.aIRecorderStep.update({
            where: { id: step.id },
            data: {
              status: 'success',
              veroCode: result.veroCode,
              selector: result.selector,
              selectorType: result.selectorType,
              confidence: result.confidence,
              screenshotPath: result.screenshotPath,
              retryCount: attempt,
              completedAt: new Date(),
            },
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
    await prisma.aIRecorderStep.update({
      where: { id: step.id },
      data: {
        status: 'stuck',
        errorMessage: lastError,
        suggestions: JSON.stringify(suggestions),
        screenshotPath,
        retryCount: EXECUTION_CONFIG.maxRetries,
        completedAt: new Date(),
      },
    });

    // Mark test case as stuck and record which step
    await prisma.aIRecorderTestCase.update({
      where: { id: testCaseId },
      data: {
        status: 'stuck',
        stuckAtStep: step.stepNumber,
      },
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
   * Execute a single step using Stagehand
   */
  private async executeStep(step: any, stagehand: StagehandService): Promise<StepExecutionResult> {
    const description = step.description;

    logger.info(`Executing step: ${description}`);

    // Use Stagehand to perform the action
    const actResult = await stagehand.act(description);

    if (!actResult.success) {
      return {
        success: false,
        veroCode: null,
        selector: null,
        selectorType: null,
        confidence: 0,
        screenshotPath: null,
        error: actResult.error || 'Action failed',
        retryCount: 0,
      };
    }

    // Find the best selector for this action
    const selector = await stagehand.findBestSelector(description);

    // Take screenshot
    const screenshot = await stagehand.takeScreenshot();
    const screenshotPath = await this.saveScreenshot(step.id, screenshot);

    // Generate Vero code from the step
    const veroCode = this.generateVeroCode(step.stepType, description, selector);

    return {
      success: true,
      veroCode,
      selector,
      selectorType: this.getSelectorType(selector),
      confidence: 0.85, // Default confidence from Stagehand
      screenshotPath,
      error: null,
      retryCount: 0,
    };
  }

  // ----------------------------------------
  // Vero Code Generation
  // ----------------------------------------

  /**
   * Generate Vero code from step information
   */
  private generateVeroCode(
    stepType: string,
    description: string,
    selector: string | null
  ): string {
    const desc = description.toLowerCase();
    const sel = selector || '"element"';

    switch (stepType) {
      case 'navigate': {
        const urlMatch = desc.match(/(?:to|url)[\s:]+['\"]?([^'\"]+)['\"]?/i) ||
          desc.match(/(?:open|go to|navigate to)[\s:]+(.+)/i);
        const url = urlMatch ? urlMatch[1].trim() : 'https://example.com';
        return `open "${url}"`;
      }

      case 'fill': {
        const fillMatch = desc.match(
          /(?:fill|enter|type|input)[\s:]+(?:the\s+)?(?:['\"])?(.+?)['\"]?\s+(?:field\s+)?(?:with|as|=|:)\s*['\"]?([^'\"]+)['\"]?/i
        );
        if (fillMatch) {
          return `fill ${sel} with "${fillMatch[2].trim()}"`;
        }
        // Try to extract just the value
        const valueMatch = desc.match(/['\"]([^'\"]+)['\"]/) ||
          desc.match(/(?:with|as|=|:)\s*(.+)/i);
        const value = valueMatch ? valueMatch[1].trim() : 'value';
        return `fill ${sel} with "${value}"`;
      }

      case 'click': {
        return `click ${sel}`;
      }

      case 'assert': {
        const assertMatch = desc.match(
          /(?:verify|assert|check|expect|confirm)[\s:]+(?:that\s+)?(.+)/i
        );
        const condition = assertMatch ? assertMatch[1].trim() : 'element is visible';

        if (condition.includes('visible') || condition.includes('displayed')) {
          return `expect ${sel} is visible`;
        }
        if (condition.includes('text') || condition.includes('contains')) {
          const textMatch = condition.match(/['\"]([^'\"]+)['\"]/);
          const text = textMatch ? textMatch[1] : 'text';
          return `expect ${sel} contains "${text}"`;
        }
        return `expect ${sel} is visible`;
      }

      case 'wait': {
        const timeMatch = desc.match(/(\d+)\s*(?:second|sec|s)/i);
        if (timeMatch) {
          return `wait ${timeMatch[1]} seconds`;
        }
        return `wait for page load`;
      }

      case 'loop': {
        return `for each item in data {\n  // loop body\n}`;
      }

      default:
        return `// ${description}`;
    }
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
    const step = await prisma.aIRecorderStep.findUnique({
      where: { id: stepId },
      include: { testCase: { include: { session: true, steps: true } } },
    });

    if (!step || step.status !== 'stuck') {
      return { success: false, error: 'Step is not in stuck state' };
    }

    let stagehand: StagehandService | null = null;

    try {
      // Initialize Stagehand with headed browser for user to see
      const stagehandConfig: StagehandConfig = {
        modelName: aiSettings.modelName,
        apiKey: aiSettings.apiKey,
        headless: false, // Show browser for recovery
        useBrowserbase: aiSettings.useBrowserbase,
        browserbaseApiKey: aiSettings.browserbaseApiKey,
      };

      stagehand = new StagehandService(stagehandConfig);
      await stagehand.initialize();

      // Navigate to base URL if available
      const baseUrl = step.testCase.session.baseUrl || step.testCase.targetUrl;
      if (baseUrl) {
        await stagehand.navigateTo(baseUrl);
      }

      // Replay all successful steps before the stuck one
      for (const prevStep of step.testCase.steps) {
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
        await prisma.aIRecorderStep.update({
          where: { id: stepId },
          data: {
            status: 'resolved',
            veroCode,
            selector,
            selectorType: this.getSelectorType(selector),
            screenshotPath,
            errorMessage: null,
          },
        });

        // Update test case status - continue execution or mark for review
        const remainingSteps = step.testCase.steps.filter(
          (s) => s.stepNumber > step.stepNumber && s.status === 'pending'
        );

        if (remainingSteps.length === 0) {
          await prisma.aIRecorderTestCase.update({
            where: { id: testCaseId },
            data: { status: 'human_review', stuckAtStep: null },
          });
        } else {
          await prisma.aIRecorderTestCase.update({
            where: { id: testCaseId },
            data: { status: 'partially_complete', stuckAtStep: null },
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

      return { success: false, error: actResult.error || 'Action failed with user hint' };
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
    await prisma.aIRecorderStep.update({
      where: { id: stepId },
      data: {
        status: 'skipped',
        veroCode: null,
      },
    });

    // Update test case to partially_complete
    await prisma.aIRecorderTestCase.update({
      where: { id: testCaseId },
      data: {
        status: 'partially_complete',
        stuckAtStep: null,
      },
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
    await prisma.aIRecorderStep.update({
      where: { id: stepId },
      data: {
        status: 'captured',
        veroCode,
        selector: selector || null,
        selectorType: selector ? this.getSelectorType(selector) : null,
        errorMessage: null,
      },
    });

    // Update test case status
    await prisma.aIRecorderTestCase.update({
      where: { id: testCaseId },
      data: {
        status: 'partially_complete',
        stuckAtStep: null,
      },
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
    const step = await prisma.aIRecorderStep.findUnique({
      where: { id: stepId },
      include: { testCase: true },
    });

    if (!step) {
      return { success: false, error: 'Step not found' };
    }

    let stagehand: StagehandService | null = null;

    try {
      // Initialize headed Stagehand for replay
      const stagehandConfig: StagehandConfig = {
        modelName: aiSettings.modelName,
        apiKey: aiSettings.apiKey,
        headless: false, // Headed for human review
        useBrowserbase: aiSettings.useBrowserbase,
        browserbaseApiKey: aiSettings.browserbaseApiKey,
      };

      stagehand = new StagehandService(stagehandConfig);
      await stagehand.initialize();

      // Navigate to target URL
      if (step.testCase.targetUrl) {
        await stagehand.navigateTo(step.testCase.targetUrl);
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
        screenshot,
        error: actResult.error,
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
   * Update a step's Vero code (after manual edit)
   */
  async updateStepCode(stepId: string, veroCode: string): Promise<void> {
    await prisma.aIRecorderStep.update({
      where: { id: stepId },
      data: { veroCode },
    });
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
    await prisma.aIRecorderStep.updateMany({
      where: {
        testCaseId,
        stepNumber: { gt: afterStepNumber },
      },
      data: {
        stepNumber: { increment: 1 },
      },
    });

    // Create new step
    const step = await prisma.aIRecorderStep.create({
      data: {
        testCaseId,
        stepNumber: afterStepNumber + 1,
        description,
        stepType: this.parseStepType(description),
        status: 'pending',
        maxRetries: EXECUTION_CONFIG.maxRetries,
      },
    });

    return step.id;
  }

  /**
   * Delete a step
   */
  async deleteStep(stepId: string): Promise<void> {
    const step = await prisma.aIRecorderStep.findUnique({
      where: { id: stepId },
    });

    if (!step) return;

    // Delete the step
    await prisma.aIRecorderStep.delete({
      where: { id: stepId },
    });

    // Reorder remaining steps
    await prisma.aIRecorderStep.updateMany({
      where: {
        testCaseId: step.testCaseId,
        stepNumber: { gt: step.stepNumber },
      },
      data: {
        stepNumber: { decrement: 1 },
      },
    });
  }

  // ----------------------------------------
  // Browser Capture Features
  // ----------------------------------------

  /**
   * Active Stagehand instances for capture mode
   * Maps sessionId:testCaseId to stagehand instance
   */
  private captureStagehandMap: Map<string, StagehandService> = new Map();

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
      // Initialize headed Stagehand for capture
      const stagehandConfig: StagehandConfig = {
        modelName: aiSettings.modelName,
        apiKey: aiSettings.apiKey,
        headless: false, // Must be headed for user interaction
        useBrowserbase: aiSettings.useBrowserbase,
        browserbaseApiKey: aiSettings.browserbaseApiKey,
      };

      const stagehand = new StagehandService(stagehandConfig);
      await stagehand.initialize();

      // Get the page and context from Stagehand
      const page = stagehand.getActivePage();
      const context = stagehand.getBrowserContext();

      if (!page || !context) {
        throw new Error('Failed to get browser page from Stagehand');
      }

      // Navigate to the test case's target URL if available
      const testCase = await prisma.aIRecorderTestCase.findUnique({
        where: { id: testCaseId },
      });
      if (testCase?.targetUrl) {
        await stagehand.navigateTo(testCase.targetUrl);
      }

      // Store stagehand instance for later cleanup
      this.captureStagehandMap.set(captureKey, stagehand);

      // Start browser capture
      // Note: Stagehand Page is compatible with Playwright Page at runtime
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
        await prisma.aIRecorderTestCase.update({
          where: { id: testCaseId },
          data: { status: 'manual_recording' },
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

      // Clean up Stagehand
      const stagehand = this.captureStagehandMap.get(captureKey);
      if (stagehand) {
        await stagehand.close();
        this.captureStagehandMap.delete(captureKey);
      }

      // Process captured actions into steps
      if (actions.length > 0) {
        await this.processCapturedActions(sessionId, testCaseId, actions);
      }

      // Update test case status
      await prisma.aIRecorderTestCase.update({
        where: { id: testCaseId },
        data: {
          status: 'human_review',
        },
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
        await prisma.aIRecorderStep.update({
          where: { id: captureSession.stepId },
          data: {
            status: 'captured',
            veroCode: actions[0].veroCode,
            selector: actions[0].selector,
          },
        });
      }
    } else {
      // Manual recording mode - add all actions as new steps
      const existingSteps = await prisma.aIRecorderStep.findMany({
        where: { testCaseId },
        orderBy: { stepNumber: 'desc' },
        take: 1,
      });

      let nextStepNumber = (existingSteps[0]?.stepNumber || 0) + 1;

      for (const action of actions) {
        await prisma.aIRecorderStep.create({
          data: {
            id: uuidv4(),
            testCaseId,
            stepNumber: nextStepNumber++,
            description: this.actionToDescription(action),
            status: 'captured',
            veroCode: action.veroCode,
            selector: action.selector,
          },
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
        await prisma.aIRecorderStep.update({
          where: { id: stepId },
          data: {
            status: 'captured',
            veroCode: data.action.veroCode,
            selector: data.action.selector,
          },
        });

        // Update test case status
        await prisma.aIRecorderTestCase.update({
          where: { id: testCaseId },
          data: {
            status: 'partially_complete',
            stuckAtStep: null,
          },
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
    const testCase = await prisma.aIRecorderTestCase.findUnique({
      where: { id: testCaseId },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });

    if (!testCase) {
      throw new Error('Test case not found');
    }

    // Generate Vero scenario content
    const veroCode = this.generateVeroScenario(testCase);

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
    const willMerge = fileExists && existingContent !== null &&
      !existingContent.includes(`scenario "${testCase.name}"`);

    return {
      veroCode,
      filePath,
      fileExists,
      existingContent,
      willMerge,
    };
  }

  /**
   * Generate Vero scenario code from test case
   */
  private generateVeroScenario(testCase: any): string {
    const stepsCode = testCase.steps
      .filter((s: any) => s.veroCode)
      .map((s: any) => `  ${s.veroCode}`)
      .join('\n');

    return `scenario "${testCase.name}" {
${stepsCode}
}`;
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
    const testCase = await prisma.aIRecorderTestCase.findUnique({
      where: { id: testCaseId },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });

    if (!testCase) {
      throw new Error('Test case not found');
    }

    const scenarioCode = this.generateVeroScenario(testCase);
    const fileName = testCase.name.toLowerCase().replace(/\s+/g, '_') + '.vero';
    const filePath = path.join(targetPath, fileName);

    await fs.mkdir(targetPath, { recursive: true });

    // Check for existing file
    let finalContent: string;
    let existingContent: string | null = null;

    try {
      existingContent = await fs.readFile(filePath, 'utf-8');
    } catch {
      // File doesn't exist
    }

    if (existingContent) {
      // File exists - decide how to handle
      const scenarioPattern = new RegExp(
        `scenario\\s+"${testCase.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*\\{[\\s\\S]*?\\n\\}`,
        'g'
      );

      if (scenarioPattern.test(existingContent)) {
        // Scenario with same name exists
        if (options.overwrite) {
          // Replace the existing scenario
          finalContent = existingContent.replace(scenarioPattern, scenarioCode);
          logger.info(`Overwrote existing scenario in: ${filePath}`);
        } else {
          throw new Error(`Scenario "${testCase.name}" already exists in ${fileName}. Use overwrite option to replace.`);
        }
      } else if (options.merge) {
        // Append to existing file
        finalContent = existingContent.trimEnd() + '\n\n' + scenarioCode + '\n';
        logger.info(`Merged scenario into: ${filePath}`);
      } else {
        // Create new file with just this scenario
        finalContent = this.generateVeroFileContent(testCase, scenarioCode);
        logger.info(`Created new Vero file: ${filePath}`);
      }
    } else {
      // New file
      finalContent = this.generateVeroFileContent(testCase, scenarioCode);
      logger.info(`Created Vero file: ${filePath}`);
    }

    await fs.writeFile(filePath, finalContent, 'utf-8');

    // Update test case status
    await prisma.aIRecorderTestCase.update({
      where: { id: testCaseId },
      data: {
        status: 'complete',
        veroCode: scenarioCode,
      },
    });

    return filePath;
  }

  /**
   * Generate full Vero file content with header
   */
  private generateVeroFileContent(testCase: any, scenarioCode: string): string {
    return `# ${testCase.name}
${testCase.description ? `# ${testCase.description}\n` : ''}
${scenarioCode}
`;
  }

  /**
   * Get generated Vero code for a test case
   */
  async getTestCaseVeroCode(testCaseId: string): Promise<string | null> {
    const testCase = await prisma.aIRecorderTestCase.findUnique({
      where: { id: testCaseId },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });

    if (!testCase) return null;

    const stepsCode = testCase.steps
      .filter((s) => s.veroCode)
      .map((s) => `  ${s.veroCode}`)
      .join('\n');

    return `scenario "${testCase.name}" {\n${stepsCode}\n}`;
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

  private getSelectorType(selector: string | null): string | null {
    if (!selector) return null;
    if (selector.startsWith('[data-testid=')) return 'testid';
    if (selector.startsWith('[role=')) return 'role';
    if (selector.startsWith('[aria-label=')) return 'label';
    if (selector.startsWith('text=') || selector.startsWith('"')) return 'text';
    if (selector.startsWith('//') || selector.startsWith('xpath=')) return 'xpath';
    return 'css';
  }

  private async saveScreenshot(stepId: string, base64: string): Promise<string | null> {
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
    await prisma.aIRecorderSession.update({
      where: { id: sessionId },
      data: {
        status: 'human_review',
        completedAt: new Date(),
      },
    });

    this.runningPools.delete(sessionId);

    this.emit('session:completed', { sessionId });
  }

  private async markSessionFailed(sessionId: string, error: string): Promise<void> {
    await prisma.aIRecorderSession.update({
      where: { id: sessionId },
      data: {
        status: 'failed',
        completedAt: new Date(),
      },
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
