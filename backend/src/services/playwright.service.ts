import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger';
import { config } from '../config';

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

export class PlaywrightService {
  private activeProcesses: Map<string, ChildProcess> = new Map();

  constructor() {
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
        shell: true,
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

      // Create a minimal playwright.config.ts with tracing based on settings
      const configFile = path.join(storageDir, 'playwright.config.ts');
      const traceOutputPath = path.join(storageDir, 'trace').replace(/\\/g, '/');
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
  private injectTracingAndScreenshots(code: string, screenshotsDir: string, traceDir: string): string {
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
}
