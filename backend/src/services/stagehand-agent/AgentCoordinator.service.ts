/**
 * Agent Coordinator Service
 *
 * Orchestrates the multi-agent pipeline for test generation:
 * 1. Excel Parser Agent - Parses uploaded Excel into test cases/steps
 * 2. Stagehand Executor Agent - Runs headless browser, caches selectors
 * 3. Vero Generator Agent - Converts cached JSON to Vero files
 * 4. Replay Executor - Runs headed browser for human review
 *
 * State Machine: IDLE → PARSING → EXECUTING → GENERATING → REVIEW → REPLAY
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import { excelStepParserService, ParsedTestCase, ParsedStep } from './ExcelStepParser.service';
import { stagehandExecutorService, StagehandExecutionResult } from './StagehandExecutor.service';
import { veroGeneratorService, VeroGenerationResult } from './VeroGenerator.service';
import { replayExecutorService } from './ReplayExecutor.service';

// ============================================
// Types
// ============================================

export type AgentState =
  | 'idle'
  | 'parsing'
  | 'executing'
  | 'generating'
  | 'review'
  | 'replay'
  | 'error'
  | 'complete';

export interface AgentSession {
  id: string;
  userId: string;
  applicationId?: string;
  state: AgentState;
  testCases: ParsedTestCase[];
  executionResults: Map<string, StagehandExecutionResult>;
  generationResults: Map<string, VeroGenerationResult>;
  currentTestCaseIndex: number;
  currentStepIndex: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentConfig {
  provider: 'gemini' | 'openai' | 'anthropic';
  apiKey: string;
  modelName?: string;
  baseUrl: string;
  headless?: boolean;
  outputDir?: string;
}

export interface SessionProgress {
  sessionId: string;
  state: AgentState;
  totalTestCases: number;
  completedTestCases: number;
  currentTestCase?: {
    id: string;
    name: string;
    totalSteps: number;
    completedSteps: number;
    currentStep?: {
      stepNumber: number;
      description: string;
      status: string;
    };
  };
  testCases: Array<{
    id: string;
    testId: string;
    name: string;
    status: string;
    stepsCompleted: number;
    totalSteps: number;
    veroFiles?: {
      pageFile?: string;
      featureFile?: string;
    };
    steps: Array<{
      stepNumber: number;
      description: string;
      status: string;
      veroCode?: string;
      selector?: string;
      confidence?: number;
      pageAddition?: string;
    }>;
  }>;
  error?: string;
}

// ============================================
// Agent Coordinator Service
// ============================================

export class AgentCoordinatorService extends EventEmitter {
  private sessions: Map<string, AgentSession> = new Map();

  constructor() {
    super();
    this.setupEventListeners();
  }

  /**
   * Setup internal event listeners for agent communication
   */
  private setupEventListeners(): void {
    // Listen for Stagehand execution events
    stagehandExecutorService.on('step:start', (data) => {
      this.emit('step:start', data);
    });

    stagehandExecutorService.on('step:complete', (data) => {
      this.emit('step:complete', data);
    });

    stagehandExecutorService.on('step:failed', (data) => {
      this.emit('step:failed', data);
    });

    stagehandExecutorService.on('testcase:complete', (data) => {
      this.emit('testcase:complete', data);
    });

    // Listen for Vero generation events
    veroGeneratorService.on('generation:start', (data) => {
      this.emit('generation:start', data);
    });

    veroGeneratorService.on('generation:complete', (data) => {
      this.emit('generation:complete', data);
    });

    // Listen for replay events
    replayExecutorService.on('replay:step:start', (data) => {
      this.emit('replay:step:start', data);
    });

    replayExecutorService.on('replay:step:complete', (data) => {
      this.emit('replay:step:complete', data);
    });

    replayExecutorService.on('replay:step:failed', (data) => {
      this.emit('replay:step:failed', data);
    });
  }

  /**
   * Create a new agent session
   */
  async createSession(userId: string, applicationId?: string): Promise<string> {
    const sessionId = uuidv4();
    const session: AgentSession = {
      id: sessionId,
      userId,
      applicationId,
      state: 'idle',
      testCases: [],
      executionResults: new Map(),
      generationResults: new Map(),
      currentTestCaseIndex: 0,
      currentStepIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    logger.info(`Created agent session: ${sessionId}`);

    return sessionId;
  }

  /**
   * Start the agent pipeline with an Excel file
   */
  async startPipeline(
    sessionId: string,
    excelBuffer: Buffer,
    config: AgentConfig
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    try {
      // Phase 1: Parse Excel
      await this.runParsingPhase(session, excelBuffer);

      // Phase 2: Execute with Stagehand (headless)
      await this.runExecutionPhase(session, config);

      // Phase 3: Generate Vero files
      await this.runGenerationPhase(session, config.outputDir);

      // Phase 4: Move to review state
      session.state = 'review';
      session.updatedAt = new Date();
      this.emit('session:review', { sessionId, session: this.getProgress(sessionId) });

      logger.info(`Session ${sessionId} ready for human review`);
    } catch (error) {
      session.state = 'error';
      session.error = error instanceof Error ? error.message : 'Unknown error';
      session.updatedAt = new Date();
      this.emit('session:error', { sessionId, error: session.error });
      throw error;
    }
  }

  /**
   * Phase 1: Parse Excel file into test cases
   */
  private async runParsingPhase(session: AgentSession, excelBuffer: Buffer): Promise<void> {
    session.state = 'parsing';
    session.updatedAt = new Date();
    this.emit('session:parsing', { sessionId: session.id });

    logger.info(`Session ${session.id}: Starting parsing phase`);

    const parseResult = excelStepParserService.parseExcelBuffer(excelBuffer);

    if (parseResult.errors.length > 0) {
      throw new Error(`Excel parsing errors: ${parseResult.errors.join('; ')}`);
    }

    if (parseResult.testCases.length === 0) {
      throw new Error('No valid test cases found in Excel file');
    }

    session.testCases = parseResult.testCases;
    session.updatedAt = new Date();

    this.emit('session:parsed', {
      sessionId: session.id,
      testCases: parseResult.testCases.length,
      totalSteps: parseResult.totalSteps,
      warnings: parseResult.warnings,
    });

    logger.info(
      `Session ${session.id}: Parsed ${parseResult.testCases.length} test cases with ${parseResult.totalSteps} steps`
    );
  }

  /**
   * Phase 2: Execute test cases with Stagehand in headless mode
   */
  private async runExecutionPhase(session: AgentSession, config: AgentConfig): Promise<void> {
    session.state = 'executing';
    session.updatedAt = new Date();
    this.emit('session:executing', { sessionId: session.id });

    logger.info(`Session ${session.id}: Starting execution phase`);

    // Execute each test case
    for (let i = 0; i < session.testCases.length; i++) {
      session.currentTestCaseIndex = i;
      const testCase = session.testCases[i];

      this.emit('testcase:start', {
        sessionId: session.id,
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        index: i,
        total: session.testCases.length,
      });

      try {
        const result = await stagehandExecutorService.executeTestCase(testCase, {
          provider: config.provider,
          apiKey: config.apiKey,
          modelName: config.modelName,
          baseUrl: config.baseUrl,
          headless: config.headless ?? true,
          sessionId: session.id,
        });

        session.executionResults.set(testCase.id, result);

        // Update test case status
        testCase.status = result.status === 'complete' ? 'ready' : 'failed';

        this.emit('testcase:executed', {
          sessionId: session.id,
          testCaseId: testCase.id,
          status: result.status,
          jsonPath: result.jsonPath,
        });
      } catch (error) {
        logger.error(`Session ${session.id}: Failed to execute test case ${testCase.testId}`, error);

        testCase.status = 'failed';
        session.executionResults.set(testCase.id, {
          testCaseId: testCase.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          steps: [],
          pageObjects: {},
        });
      }
    }

    session.updatedAt = new Date();
    logger.info(`Session ${session.id}: Execution phase complete`);
  }

  /**
   * Phase 3: Generate Vero files from execution results
   */
  private async runGenerationPhase(session: AgentSession, outputDir?: string): Promise<void> {
    session.state = 'generating';
    session.updatedAt = new Date();
    this.emit('session:generating', { sessionId: session.id });

    logger.info(`Session ${session.id}: Starting generation phase`);

    // Generate Vero files for each completed test case
    for (const testCase of session.testCases) {
      const executionResult = session.executionResults.get(testCase.id);

      if (!executionResult || executionResult.status !== 'complete') {
        logger.warn(`Session ${session.id}: Skipping generation for failed test case ${testCase.testId}`);
        continue;
      }

      try {
        const generationResult = await veroGeneratorService.generateVeroFiles(
          executionResult,
          testCase,
          outputDir
        );

        session.generationResults.set(testCase.id, generationResult);

        // Update steps with generated Vero code
        for (const stepMapping of generationResult.stepMappings) {
          const step = testCase.steps.find(s => s.stepNumber === stepMapping.stepNumber);
          if (step) {
            step.veroCode = stepMapping.veroCode;
            step.status = 'ready';
          }
        }

        this.emit('testcase:generated', {
          sessionId: session.id,
          testCaseId: testCase.id,
          pageFile: generationResult.pageFilePath,
          featureFile: generationResult.featureFilePath,
        });
      } catch (error) {
        logger.error(`Session ${session.id}: Failed to generate Vero for ${testCase.testId}`, error);
      }
    }

    session.updatedAt = new Date();
    logger.info(`Session ${session.id}: Generation phase complete`);
  }

  /**
   * Start replay execution for human review
   */
  async startReplay(
    sessionId: string,
    testCaseId: string,
    config: AgentConfig
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.state !== 'review') {
      throw new Error(`Session is not in review state: ${session.state}`);
    }

    const testCase = session.testCases.find(tc => tc.id === testCaseId);
    if (!testCase) {
      throw new Error(`Test case not found: ${testCaseId}`);
    }

    const generationResult = session.generationResults.get(testCaseId);
    if (!generationResult) {
      throw new Error(`No generated Vero files for test case: ${testCaseId}`);
    }

    session.state = 'replay';
    session.updatedAt = new Date();

    this.emit('session:replay', { sessionId, testCaseId });

    try {
      await replayExecutorService.replayTestCase(testCase, generationResult, {
        ...config,
        headless: false, // Always headed for replay
        sessionId,
      });

      session.state = 'review';
      session.updatedAt = new Date();

      this.emit('replay:complete', { sessionId, testCaseId });
    } catch (error) {
      session.state = 'review'; // Go back to review on error
      session.updatedAt = new Date();

      this.emit('replay:error', {
        sessionId,
        testCaseId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Get session progress for UI display
   */
  getProgress(sessionId: string): SessionProgress | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const completedTestCases = session.testCases.filter(
      tc => tc.status === 'ready' || tc.status === 'complete'
    ).length;

    const currentTestCase = session.testCases[session.currentTestCaseIndex];
    const currentStep = currentTestCase?.steps[session.currentStepIndex];

    return {
      sessionId: session.id,
      state: session.state,
      totalTestCases: session.testCases.length,
      completedTestCases,
      currentTestCase: currentTestCase
        ? {
            id: currentTestCase.id,
            name: currentTestCase.name,
            totalSteps: currentTestCase.steps.length,
            completedSteps: currentTestCase.steps.filter(
              s => s.status === 'ready' || s.status === 'passed'
            ).length,
            currentStep: currentStep
              ? {
                  stepNumber: currentStep.stepNumber,
                  description: currentStep.description,
                  status: currentStep.status,
                }
              : undefined,
          }
        : undefined,
      testCases: session.testCases.map(tc => {
        const execResult = session.executionResults.get(tc.id);
        const genResult = session.generationResults.get(tc.id);

        return {
          id: tc.id,
          testId: tc.testId,
          name: tc.name,
          status: tc.status,
          stepsCompleted: tc.steps.filter(s => s.status === 'ready' || s.status === 'passed').length,
          totalSteps: tc.steps.length,
          veroFiles: genResult
            ? {
                pageFile: genResult.pageFilePath,
                featureFile: genResult.featureFilePath,
              }
            : undefined,
          steps: tc.steps.map(step => {
            const execStep = execResult?.steps.find(s => s.stepNumber === step.stepNumber);
            const genStep = genResult?.stepMappings.find(s => s.stepNumber === step.stepNumber);

            return {
              stepNumber: step.stepNumber,
              description: step.description,
              status: step.status,
              veroCode: step.veroCode || genStep?.veroCode,
              selector: execStep?.result?.selector,
              confidence: execStep?.result?.confidence,
              pageAddition: genStep?.pageAddition,
            };
          }),
        };
      }),
      error: session.error,
    };
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Cancel a running session
   */
  async cancelSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // Cancel any running executions
    await stagehandExecutorService.cancel(sessionId);
    await replayExecutorService.cancel(sessionId);

    session.state = 'idle';
    session.updatedAt = new Date();

    this.emit('session:cancelled', { sessionId });
  }
}

// Export singleton instance
export const agentCoordinatorService = new AgentCoordinatorService();
