import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { logger } from './logger';
import { config } from './config';

export class Recorder {
  private process: ChildProcess | null = null;
  private outputFile: string = '';

  async start(
    url: string,
    language: string,
    executionId: string,
    onComplete: (success: boolean, code?: string, error?: string) => void
  ): Promise<void> {
    try {
      // Create storage directory
      const storageDir = path.join(config.storage.path, executionId);
      await fs.mkdir(storageDir, { recursive: true });

      // Generate output file path
      const ext = language === 'python' ? 'py' : 'ts';
      this.outputFile = path.join(storageDir, `recording.${ext}`);

      logger.info(`Starting recording: ${url}`);
      logger.info(`Output file: ${this.outputFile}`);

      // Build codegen command
      const args = [
        'codegen',
        url,
        '--target',
        language === 'python' ? 'python' : 'playwright-test',
        '--output',
        this.outputFile,
      ];

      // Spawn Playwright codegen process
      this.process = spawn('npx', ['playwright', ...args], {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.process.stdout?.on('data', (data) => {
        logger.info(`Codegen stdout: ${data}`);
      });

      this.process.stderr?.on('data', (data) => {
        logger.error(`Codegen stderr: ${data}`);
      });

      this.process.on('close', async (code) => {
        logger.info(`Codegen process exited with code ${code}`);

        if (code === 0) {
          // Read the generated code
          try {
            const recordedCode = await fs.readFile(this.outputFile, 'utf-8');
            onComplete(true, recordedCode);
          } catch (error) {
            logger.error('Failed to read recorded file:', error);
            onComplete(false, undefined, 'Failed to read recorded file');
          }
        } else {
          onComplete(false, undefined, `Recording failed with code ${code}`);
        }

        this.process = null;
      });

      this.process.on('error', (error) => {
        logger.error('Codegen process error:', error);
        onComplete(false, undefined, error.message);
        this.process = null;
      });

    } catch (error: any) {
      logger.error('Failed to start recording:', error);
      onComplete(false, undefined, error.message);
    }
  }

  cancel(): void {
    if (this.process) {
      logger.info('Cancelling recording...');
      this.process.kill('SIGTERM');
      this.process = null;
    }
  }
}
