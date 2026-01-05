import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { logger } from './logger';
import { config } from './config';

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
      const screenshotPath = path.join(screenshotDir, `step-${stepNumber}.png`);

      // For goto, just take screenshot after navigation
      if (isGoto) {
        modifiedLines.push(line);
        modifiedLines.push(`${indent}await page.screenshot({ path: '${screenshotPath}', fullPage: false });`);
      } else {
        // For interactions, highlight element before screenshot
        // Extract the locator part (everything before the final action method)
        const locatorMatch = line.match(/(await page\.[^;]+?)(\.(click|fill|type|select|check|uncheck|hover)\([^)]*\))/);

        if (locatorMatch) {
          const locatorPart = locatorMatch[1];
          const actionPart = locatorMatch[2];
          const locatorVar = `_loc${stepNumber}`;

          // Store locator in variable
          modifiedLines.push(`${indent}const ${locatorVar} = ${locatorPart};`);
          // Highlight element with red outline
          modifiedLines.push(`${indent}await ${locatorVar}.evaluate(el => el.style.outline = '4px solid #ef4444');`);
          modifiedLines.push(`${indent}await ${locatorVar}.evaluate(el => el.style.outlineOffset = '2px');`);
          // Take screenshot with highlight
          modifiedLines.push(`${indent}await page.screenshot({ path: '${screenshotPath}', fullPage: false });`);
          // Remove highlight
          modifiedLines.push(`${indent}await ${locatorVar}.evaluate(el => { el.style.outline = ''; el.style.outlineOffset = ''; });`);
          // Execute the original action
          modifiedLines.push(`${indent}await ${locatorVar}${actionPart};`);
        } else {
          // Fallback: just add screenshot after the action
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

export class Executor {
  private process: ChildProcess | null = null;

  async execute(
    code: string,
    executionId: string,
    onLog: (message: string, level: 'info' | 'warn' | 'error') => void,
    onComplete: (exitCode: number, duration: number) => void
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Create storage directory
      const storageDir = path.join(config.storage.path, executionId);
      await fs.mkdir(storageDir, { recursive: true });

      // Create screenshots directory
      const screenshotsDir = path.join(storageDir, 'screenshots');
      await fs.mkdir(screenshotsDir, { recursive: true });

      // Inject screenshot capture into the test code
      const modifiedCode = injectScreenshots(code, screenshotsDir);

      // Write modified code to temp file
      const testFile = path.join(storageDir, 'test.spec.ts');
      await fs.writeFile(testFile, modifiedCode);

      logger.info(`Executing test: ${testFile}`);
      onLog('Starting test execution...', 'info');

      // Run Playwright test in headed mode (browser visible) with screenshots
      // --trace on: captures screenshots with element highlighting
      this.process = spawn('npx', ['playwright', 'test', testFile, '--headed', '--trace', 'on'], {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.process.stdout?.on('data', (data) => {
        const message = data.toString();
        logger.info(`Test stdout: ${message}`);
        onLog(message, 'info');
      });

      this.process.stderr?.on('data', (data) => {
        const message = data.toString();
        logger.error(`Test stderr: ${message}`);
        onLog(message, 'error');
      });

      this.process.on('close', (code) => {
        const duration = Date.now() - startTime;
        logger.info(`Test execution completed with code ${code} in ${duration}ms`);
        onLog(`Test completed with exit code ${code}`, code === 0 ? 'info' : 'error');
        onComplete(code || 0, duration);
        this.process = null;
      });

      this.process.on('error', (error) => {
        const duration = Date.now() - startTime;
        logger.error('Test execution error:', error);
        onLog(`Execution error: ${error.message}`, 'error');
        onComplete(1, duration);
        this.process = null;
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('Failed to execute test:', error);
      onLog(`Failed to execute: ${error.message}`, 'error');
      onComplete(1, duration);
    }
  }

  cancel(): void {
    if (this.process) {
      logger.info('Cancelling execution...');
      this.process.kill('SIGTERM');
      this.process = null;
    }
  }
}
