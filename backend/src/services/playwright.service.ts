import { spawn, ChildProcess, fork } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { stripVeroSpecPrefix } from '../routes/veroRunExecution.utils';

/**
 * Debug session state
 */
export interface DebugSession {
  executionId: string;
  breakpoints: Set<number>;
  currentLine: number;
  isPaused: boolean;
  stepMode: 'run' | 'step-over' | 'step-into';
  process: ChildProcess | null;
}

/**
 * Debug event types from child process
 */
export interface DebugStepEvent {
  type: 'step:before' | 'step:after';
  line: number;
  action: string;
  target?: string;
  success?: boolean;
  duration?: number;
  error?: string;
}

export interface DebugPauseEvent {
  type: 'execution:paused';
  line: number;
}

export interface DebugVariableEvent {
  type: 'variable:set';
  name: string;
  value: any;
}

export interface DebugLogEvent {
  type: 'log';
  line?: number;
  message: string;
  level: 'info' | 'warn' | 'error';
}

export type DebugEvent = DebugStepEvent | DebugPauseEvent | DebugVariableEvent | DebugLogEvent;

// Storage path for recordings and executions
const STORAGE_PATH = path.resolve(process.env.STORAGE_PATH || './storage');

/**
 * Injects screenshot capture with element highlighting before each Playwright action
 */
function injectScreenshots(code: string, screenshotDir: string): string {
  const lines = code.split('\n');
  const modifiedLines: string[] = [];
  let stepNumber = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if this line contains a Playwright action
    const isAction = (
      trimmed.includes('await page.') &&
      (trimmed.includes('.click(') ||
        trimmed.includes('.fill(') ||
        trimmed.includes('.type(') ||
        trimmed.includes('.select') ||
        trimmed.includes('.check(') ||
        trimmed.includes('.uncheck(') ||
        trimmed.includes('.hover(') ||
        trimmed.includes('getByRole') ||
        trimmed.includes('getByText') ||
        trimmed.includes('getByLabel'))
    );

    const isGoto = trimmed.includes('await page.') && trimmed.includes('.goto(');

    if ((isAction || isGoto) && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
      stepNumber++;
      const indent = line.match(/^\s*/)?.[0] || '  ';
      const screenshotPath = path.join(screenshotDir, `step-${stepNumber}.png`).replace(/\\/g, '/');

      // For goto, just take screenshot after navigation
      if (isGoto) {
        modifiedLines.push(line);
        modifiedLines.push(`${indent}await page.screenshot({ path: '${screenshotPath}', fullPage: false });`);
      } else {
        // For interactions, highlight element before screenshot
        const locatorMatch = line.match(/(await page\.[^;]+?)(\.(click|fill|type|select|check|uncheck|hover)\([^)]*\))/);

        if (locatorMatch) {
          const locatorPart = locatorMatch[1];
          const actionPart = locatorMatch[2];
          const locatorVar = `_loc${stepNumber}`;

          modifiedLines.push(`${indent}const ${locatorVar} = ${locatorPart};`);
          modifiedLines.push(`${indent}await ${locatorVar}.evaluate(el => el.style.outline = '4px solid #ef4444');`);
          modifiedLines.push(`${indent}await ${locatorVar}.evaluate(el => el.style.outlineOffset = '2px');`);
          modifiedLines.push(`${indent}await page.screenshot({ path: '${screenshotPath}', fullPage: false });`);
          modifiedLines.push(`${indent}await ${locatorVar}.evaluate(el => { el.style.outline = ''; el.style.outlineOffset = ''; });`);
          modifiedLines.push(`${indent}await ${locatorVar}${actionPart};`);
        } else {
          modifiedLines.push(line);
          modifiedLines.push(`${indent}await page.screenshot({ path: '${screenshotPath}', fullPage: false });`);
        }
      }
    } else {
      modifiedLines.push(line);
    }
  }

  return modifiedLines.join('\n');
}

export class PlaywrightService extends EventEmitter {
  private activeProcesses: Map<string, ChildProcess> = new Map();
  private debugSessions: Map<string, DebugSession> = new Map();

  constructor() {
    super();
    // Ensure storage directory exists
    fs.mkdir(STORAGE_PATH, { recursive: true }).catch(err => {
      logger.error('Failed to create storage directory:', err);
    });
  }

  /**
   * Start recording using Playwright codegen
   */
  async startRecording(
    url: string,
    language: 'javascript' | 'typescript' | 'python',
    executionId: string,
    onComplete: (success: boolean, code?: string, error?: string) => void
  ): Promise<void> {
    try {
      // Create storage directory for this execution
      const storageDir = path.join(STORAGE_PATH, executionId);
      await fs.mkdir(storageDir, { recursive: true });

      // Generate output file path
      const ext = language === 'python' ? 'py' : 'ts';
      const outputFile = path.join(storageDir, `recording.${ext}`);

      logger.info(`Starting Playwright recording: ${url}`);
      logger.info(`Output file: ${outputFile}`);

      // Build codegen command
      const args = [
        'playwright',
        'codegen',
        url,
        '--target',
        language === 'python' ? 'python' : 'playwright-test',
        '--output',
        outputFile,
      ];

      // Spawn Playwright codegen process
      const process = spawn('npx', args, {
        cwd: STORAGE_PATH,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.activeProcesses.set(executionId, process);

      process.stdout?.on('data', (data) => {
        logger.info(`Codegen stdout: ${data.toString()}`);
      });

      process.stderr?.on('data', (data) => {
        logger.warn(`Codegen stderr: ${data.toString()}`);
      });

      process.on('close', async (code) => {
        logger.info(`Codegen process exited with code ${code}`);
        this.activeProcesses.delete(executionId);

        if (code === 0) {
          try {
            const recordedCode = await fs.readFile(outputFile, 'utf-8');
            onComplete(true, recordedCode);
          } catch (error) {
            logger.error('Failed to read recorded file:', error);
            onComplete(false, undefined, 'Failed to read recorded file');
          }
        } else {
          onComplete(false, undefined, `Recording exited with code ${code}`);
        }
      });

      process.on('error', (error) => {
        logger.error('Codegen process error:', error);
        this.activeProcesses.delete(executionId);
        onComplete(false, undefined, error.message);
      });

    } catch (error: any) {
      logger.error('Failed to start recording:', error);
      onComplete(false, undefined, error.message);
    }
  }

  /**
   * Cancel an active recording
   */
  cancelRecording(executionId: string): void {
    const process = this.activeProcesses.get(executionId);
    if (process) {
      logger.info(`Cancelling recording: ${executionId}`);
      process.kill('SIGTERM');
      this.activeProcesses.delete(executionId);
    }
  }

  /**
   * Execute a Playwright test with tracing enabled
   */
  async executeTest(
    code: string,
    executionId: string,
    onLog: (message: string, level: 'info' | 'warn' | 'error') => void,
    onComplete: (exitCode: number, duration: number) => void,
    traceMode: 'always' | 'on-failure' | 'never' = 'on-failure'
  ): Promise<void> {
    const startTime = Date.now();

    // Cancel any existing executions to prevent duplicates
    for (const [existingId, existingProcess] of this.activeProcesses) {
      if (existingId !== executionId) {
        logger.info(`Cancelling previous execution: ${existingId}`);
        existingProcess.kill('SIGTERM');
        this.activeProcesses.delete(existingId);
      }
    }

    try {
      // Create storage directory
      const storageDir = path.join(STORAGE_PATH, executionId);
      await fs.mkdir(storageDir, { recursive: true });

      // Create screenshots directory
      const screenshotsDir = path.join(storageDir, 'screenshots');
      await fs.mkdir(screenshotsDir, { recursive: true });

      // Create trace directory
      const traceDir = path.join(storageDir, 'trace');
      await fs.mkdir(traceDir, { recursive: true });

      // Inject screenshot capture and tracing into the test code
      const modifiedCode = this.injectTracingAndScreenshots(code, screenshotsDir, traceDir);

      // Write modified code to temp file
      const testFile = path.join(storageDir, 'test.spec.ts');
      await fs.writeFile(testFile, modifiedCode);

      // Create a minimal playwright.config.ts with tracing and JSON reporter
      const configFile = path.join(storageDir, 'playwright.config.ts');
      const traceOutputPath = path.join(storageDir, 'trace').replace(/\\/g, '/');
      const resultsJsonPath = path.join(storageDir, 'results.json').replace(/\\/g, '/');
      // Map frontend traceMode to Playwright trace config
      const playwrightTraceMode = {
        'always': 'on',
        'on-failure': 'retain-on-failure',
        'never': 'off',
      }[traceMode] || 'retain-on-failure';
      const configContent = `
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: 'test.spec.ts',
  reporter: [
    ['list'],
    ['json', { outputFile: '${resultsJsonPath}' }],
  ],
  use: {
    headless: false,
    trace: '${playwrightTraceMode}',
  },
  outputDir: '${traceOutputPath}',
});
`;
      await fs.writeFile(configFile, configContent);

      logger.info(`Executing test: ${testFile}`);
      logger.info(`Trace will be saved to: ${traceDir}`);
      onLog('Starting test execution with tracing enabled...', 'info');

      // Run Playwright test in headed mode
      // Run from the execution directory to avoid picking up other test files
      const process = spawn('npx', [
        'playwright', 'test', 'test.spec.ts',
        '--headed'
      ], {
        cwd: storageDir,  // Run from execution-specific directory
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      });

      this.activeProcesses.set(executionId, process);

      process.stdout?.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          logger.info(`Test stdout: ${message}`);
          onLog(message, 'info');
        }
      });

      process.stderr?.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          logger.warn(`Test stderr: ${message}`);
          // Some stderr output is not actually errors (like progress info)
          const isError = message.toLowerCase().includes('error') ||
            message.toLowerCase().includes('failed') ||
            message.toLowerCase().includes('timeout');
          onLog(message, isError ? 'error' : 'warn');
        }
      });

      process.on('close', async (code) => {
        const duration = Date.now() - startTime;
        this.activeProcesses.delete(executionId);

        logger.info(`Test execution completed with code ${code} in ${duration}ms`);

        // Find the trace file
        const traceFile = await this.findTraceFile(storageDir);
        if (traceFile) {
          onLog(`Trace saved! View with: npx playwright show-trace "${traceFile}"`, 'info');
          logger.info(`Trace file: ${traceFile}`);
        }

        onLog(`Test completed with exit code ${code}`, code === 0 ? 'info' : 'error');
        onComplete(code || 0, duration);
      });

      process.on('error', (error) => {
        const duration = Date.now() - startTime;
        this.activeProcesses.delete(executionId);

        logger.error('Test execution error:', error);
        onLog(`Execution error: ${error.message}`, 'error');
        onComplete(1, duration);
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('Failed to execute test:', error);
      onLog(`Failed to execute: ${error.message}`, 'error');
      onComplete(1, duration);
    }
  }

  /**
   * Find the trace file in a directory (recursively)
   */
  private async findTraceFile(dir: string): Promise<string | null> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = await this.findTraceFile(fullPath);
          if (found) return found;
        } else if (entry.name === 'trace.zip' || entry.name.endsWith('.zip')) {
          return fullPath;
        }
      }
    } catch (error) {
      // Directory might not exist
    }
    return null;
  }

  /**
   * Inject tracing and screenshot capture into test code
   */
  private injectTracingAndScreenshots(code: string, screenshotsDir: string, _traceDir: string): string {
    // First inject screenshots
    const withScreenshots = injectScreenshots(code, screenshotsDir);
    return withScreenshots;
  }

  /**
   * Cancel an active test execution
   */
  cancelExecution(executionId: string): void {
    const process = this.activeProcesses.get(executionId);
    if (process) {
      logger.info(`Cancelling execution: ${executionId}`);
      process.kill('SIGTERM');
      this.activeProcesses.delete(executionId);
    }
  }

  /**
   * Get screenshots for an execution
   */
  async getScreenshots(executionId: string): Promise<{ stepNumber: number; filename: string; url: string }[]> {
    const screenshotsDir = path.join(STORAGE_PATH, executionId, 'screenshots');

    try {
      const files = await fs.readdir(screenshotsDir);
      return files
        .filter(f => f.endsWith('.png'))
        .map(filename => {
          const match = filename.match(/step-(\d+)\.png/);
          return {
            stepNumber: match ? parseInt(match[1], 10) : 0,
            filename,
            url: `/executions/${executionId}/screenshots/${filename}`,
          };
        })
        .sort((a, b) => a.stepNumber - b.stepNumber);
    } catch (error) {
      logger.warn(`No screenshots found for execution ${executionId}`);
      return [];
    }
  }

  /**
   * Get screenshot file path
   */
  getScreenshotPath(executionId: string, filename: string): string {
    return path.join(STORAGE_PATH, executionId, 'screenshots', filename);
  }

  /**
   * Get storage path
   */
  getStoragePath(): string {
    return STORAGE_PATH;
  }

  /**
   * Get the results JSON path for an execution
   */
  getResultsJsonPath(executionId: string): string {
    return path.join(STORAGE_PATH, executionId, 'results.json');
  }

  /**
   * Parse Playwright JSON results for an execution
   * Returns an array of scenario data with steps
   */
  async parseTestResults(executionId: string): Promise<{
    scenarios: Array<{
      id: string;
      name: string;
      status: 'passed' | 'failed' | 'skipped';
      duration: number;
      error?: string;
      steps: Array<{
        id: string;
        stepNumber: number;
        action: string;
        description: string;
        status: 'passed' | 'failed' | 'skipped';
        duration: number;
        error?: string;
      }>;
    }>;
    summary: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
    };
  } | null> {
    const resultsPath = this.getResultsJsonPath(executionId);

    try {
      const content = await fs.readFile(resultsPath, 'utf-8');
      const results = JSON.parse(content);

      const scenarios: Array<{
        id: string;
        name: string;
        status: 'passed' | 'failed' | 'skipped';
        duration: number;
        error?: string;
        steps: Array<{
          id: string;
          stepNumber: number;
          action: string;
          description: string;
          status: 'passed' | 'failed' | 'skipped';
          duration: number;
          error?: string;
        }>;
      }> = [];

      let passedCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      let scenarioIndex = 0;

      // Process suites recursively
      const processSuite = (suite: any, parentName?: string) => {
        const cleanTitle = stripVeroSpecPrefix(suite.title);
        const suiteName = parentName ? `${parentName} > ${cleanTitle}` : cleanTitle;

        // Process specs/tests in this suite
        for (const spec of suite.specs || []) {
          for (const test of spec.tests || []) {
            scenarioIndex++;
            const resultStatus = test.results?.[0]?.status || 'failed';
            const testStatus = resultStatus === 'passed' ? 'passed' :
                               resultStatus === 'skipped' ? 'skipped' : 'failed';

            if (testStatus === 'passed') passedCount++;
            else if (testStatus === 'failed') failedCount++;
            else if (testStatus === 'skipped') skippedCount++;

            const testResult = test.results?.[0];
            const duration = testResult?.duration || 0;
            const error = testResult?.error?.message;

            // Extract sub-steps from the test result
            const steps = (testResult?.steps || []).map((step: any, idx: number) => ({
              id: `step-${scenarioIndex}-${idx}`,
              stepNumber: idx + 1,
              action: step.title || `Step ${idx + 1}`,
              description: step.title,
              status: step.error ? 'failed' : 'passed' as 'passed' | 'failed' | 'skipped',
              duration: step.duration || 0,
              error: step.error?.message || undefined,
            }));

            scenarios.push({
              id: `scenario-${scenarioIndex}`,
              name: spec.title || `Test ${scenarioIndex}`,
              status: testStatus,
              duration,
              error,
              steps,
            });
          }
        }

        // Process nested suites
        for (const nestedSuite of suite.suites || []) {
          processSuite(nestedSuite, suiteName);
        }
      };

      // Process all top-level suites
      for (const suite of results.suites || []) {
        processSuite(suite);
      }

      logger.info(`[PlaywrightService] Parsed results for ${executionId}: ${passedCount} passed, ${failedCount} failed, ${skippedCount} skipped`);

      return {
        scenarios,
        summary: {
          total: scenarios.length,
          passed: passedCount,
          failed: failedCount,
          skipped: skippedCount,
        },
      };
    } catch (error) {
      logger.warn(`[PlaywrightService] Failed to parse results for ${executionId}:`, error);
      return null;
    }
  }

  // ============== DEBUG EXECUTION METHODS ==============

  /**
   * Execute a test with debug mode enabled
   * Uses IPC to communicate with the test process for breakpoints and stepping
   */
  async executeTestWithDebug(
    code: string,
    executionId: string,
    breakpoints: number[],
    onDebugEvent: (event: DebugEvent) => void,
    onLog: (message: string, level: 'info' | 'warn' | 'error') => void,
    onComplete: (exitCode: number, duration: number) => void,
    options?: { projectId?: string; authToken?: string; envVars?: Record<string, string> }
  ): Promise<void> {
    const startTime = Date.now();

    // Cancel any existing debug sessions
    const existingSession = this.debugSessions.get(executionId);
    if (existingSession?.process) {
      existingSession.process.kill('SIGTERM');
    }

    try {
      // Create storage directory
      const storageDir = path.join(STORAGE_PATH, executionId);
      await fs.mkdir(storageDir, { recursive: true });

      // Create screenshots directory
      const screenshotsDir = path.join(storageDir, 'screenshots');
      await fs.mkdir(screenshotsDir, { recursive: true });

      // Write test code to file
      const testFile = path.join(storageDir, 'test.spec.ts');
      await fs.writeFile(testFile, code);

      // Create playwright.config.ts
      const configFile = path.join(storageDir, 'playwright.config.ts');
      const configContent = `
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: 'test.spec.ts',
  use: {
    headless: false,
    trace: 'on',
  },
  timeout: 0,  // No timeout in debug mode
});
`;
      await fs.writeFile(configFile, configContent);

      const normalizedEnvVars: Record<string, string> = {};
      if (options?.envVars && typeof options.envVars === 'object') {
        for (const [key, value] of Object.entries(options.envVars)) {
          const normalizedKey = key.trim();
          if (!normalizedKey) continue;
          normalizedEnvVars[normalizedKey] = String(value ?? '');
        }
      }
      const serializedEnvVars = JSON.stringify(normalizedEnvVars);

      // Create a wrapper script that enables IPC
      const wrapperFile = path.join(storageDir, 'debug-runner.js');
      const wrapperContent = `
const { spawn } = require('child_process');
const fs = require('fs');
const debugEventPrefix = '__VERO_DEBUG_EVENT__';
	const signalPath = '${storageDir.replace(/\\/g, '/')}';
	const signalFile = signalPath + '/debug-signal.json';

// Run Playwright test
const child = spawn('npx', ['playwright', 'test', 'test.spec.ts', '--headed'], {
  cwd: '${storageDir.replace(/\\/g, '/')}',
  stdio: ['inherit', 'pipe', 'pipe'],
  env: {
    ...process.env,
    VERO_DEBUG: 'true',
    VERO_BREAKPOINTS: '${breakpoints.join(',')}',
    VERO_DEBUG_EVENTS: 'stdout',
    VERO_DEBUG_SIGNAL_PATH: signalPath + '/debug-signal.json',
    VERO_ENV_VARS: ${JSON.stringify(serializedEnvVars)},
    ${options?.projectId ? `VERO_PROJECT_ID: '${options.projectId.replace(/'/g, "\\'")}',` : ''}
    ${options?.authToken ? `VERO_AUTH_TOKEN: '${options.authToken.replace(/'/g, "\\'")}',` : ''}
  }
});

// Forward stdout/stderr and bridge debug events for environments where worker IPC is unavailable.
let __stdoutBuffer = '';
child.stdout.on('data', (data) => {
  process.stdout.write(data);

  const chunk = data.toString();
  const lines = (__stdoutBuffer + chunk).split('\\n');
  __stdoutBuffer = lines.pop() || '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(debugEventPrefix)) {
      try {
        const payload = trimmed.replace(debugEventPrefix, '');
        process.send?.(JSON.parse(payload));
      } catch {
        // Ignore malformed debug event payloads.
      }
    }
  }
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Listen for messages from parent
process.on('message', (msg) => {
  // Forward control messages to test via environment signaling
  if (msg.type === 'resume' || msg.type === 'step' || msg.type === 'stop') {
    // For now, we'll use file-based signaling
    fs.writeFileSync(signalFile, JSON.stringify(msg));
  }
});

child.on('close', (code) => {
  process.exit(code);
});
`;
      await fs.writeFile(wrapperFile, wrapperContent);

      // Create debug session
      const session: DebugSession = {
        executionId,
        breakpoints: new Set(breakpoints),
        currentLine: 0,
        isPaused: false,
        stepMode: 'run',
        process: null,
      };
      this.debugSessions.set(executionId, session);

      logger.info(`Starting debug execution: ${testFile}`);
      onLog('Starting test execution in debug mode...', 'info');

      // Fork the wrapper script with IPC
      const child = fork(wrapperFile, [], {
        cwd: storageDir,
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      });

      session.process = child;
      this.activeProcesses.set(executionId, child);

      // Handle IPC messages from child
      child.on('message', (msg: any) => {
        logger.debug('Debug IPC message:', msg);

        switch (msg.type) {
          case 'step:before':
            session.currentLine = msg.line;
            onDebugEvent({
              type: 'step:before',
              line: msg.line,
              action: msg.action,
              target: msg.target,
            });
            break;

          case 'step:after':
            onDebugEvent({
              type: 'step:after',
              line: msg.line,
              action: msg.action,
              success: msg.success,
              duration: msg.duration,
              error: msg.error,
            });
            break;

          case 'execution:paused':
            session.isPaused = true;
            onDebugEvent({
              type: 'execution:paused',
              line: msg.line,
            });
            break;

          case 'variable:set':
            onDebugEvent({
              type: 'variable:set',
              name: msg.name,
              value: msg.value,
            });
            break;

          case 'log':
            onDebugEvent({
              type: 'log',
              message: msg.message,
              level: msg.level || 'info',
            });
            break;
        }
      });

      child.stdout?.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          logger.info(`Debug stdout: ${message}`);
          onLog(message, 'info');
        }
      });

      child.stderr?.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          logger.warn(`Debug stderr: ${message}`);
          const isError = message.toLowerCase().includes('error') ||
            message.toLowerCase().includes('failed');
          onLog(message, isError ? 'error' : 'warn');
        }
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        this.activeProcesses.delete(executionId);
        this.debugSessions.delete(executionId);

        logger.info(`Debug execution completed with code ${code} in ${duration}ms`);
        onLog(`Test completed with exit code ${code}`, code === 0 ? 'info' : 'error');
        onComplete(code || 0, duration);
      });

      child.on('error', (error) => {
        const duration = Date.now() - startTime;
        this.activeProcesses.delete(executionId);
        this.debugSessions.delete(executionId);

        logger.error('Debug execution error:', error);
        onLog(`Execution error: ${error.message}`, 'error');
        onComplete(1, duration);
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('Failed to start debug execution:', error);
      onLog(`Failed to execute: ${error.message}`, 'error');
      onComplete(1, duration);
    }
  }

  /**
   * Set breakpoints for a debug session
   */
  setBreakpoints(executionId: string, lines: number[]): void {
    const session = this.debugSessions.get(executionId);
    if (session) {
      session.breakpoints = new Set(lines);
      logger.info(`Set breakpoints for ${executionId}: ${lines.join(', ')}`);
    }
  }

  /**
   * Resume execution (continue running)
   */
  resumeDebug(executionId: string): void {
    const session = this.debugSessions.get(executionId);
    if (session?.process) {
      session.isPaused = false;
      session.stepMode = 'run';
      session.process.send({ type: 'resume' });
      logger.info(`Resumed debug execution: ${executionId}`);
    }
  }

  /**
   * Step over (execute current line and pause at next)
   */
  stepOverDebug(executionId: string): void {
    const session = this.debugSessions.get(executionId);
    if (session?.process) {
      session.stepMode = 'step-over';
      session.process.send({ type: 'step', mode: 'over' });
      logger.info(`Step over debug execution: ${executionId}`);
    }
  }

  /**
   * Step into (used for future procedure stepping)
   */
  stepIntoDebug(executionId: string): void {
    const session = this.debugSessions.get(executionId);
    if (session?.process) {
      session.stepMode = 'step-into';
      session.process.send({ type: 'step', mode: 'into' });
      logger.info(`Step into debug execution: ${executionId}`);
    }
  }

  /**
   * Stop debug execution
   */
  stopDebug(executionId: string): void {
    const session = this.debugSessions.get(executionId);
    if (session?.process) {
      session.process.send({ type: 'stop' });
      setTimeout(() => {
        // Force kill if not terminated gracefully
        if (this.activeProcesses.has(executionId)) {
          session.process?.kill('SIGTERM');
        }
      }, 1000);
      logger.info(`Stopped debug execution: ${executionId}`);
    }
  }

  /**
   * Get current debug session state
   */
  getDebugSession(executionId: string): DebugSession | undefined {
    return this.debugSessions.get(executionId);
  }

  /**
   * Check if a debug session is active
   */
  isDebugActive(executionId: string): boolean {
    return this.debugSessions.has(executionId);
  }
}
