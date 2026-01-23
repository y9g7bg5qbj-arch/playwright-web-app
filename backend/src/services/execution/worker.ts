/**
 * Test Worker Service
 *
 * Executes tests assigned by the coordinator and reports results.
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import {
  Worker,
  WorkerCapabilities,
  WorkerStatus,
  TestFile,
  TestResult,
  TestAllocation,
} from '../sharding/types';

/**
 * Worker configuration
 */
export interface WorkerConfig {
  id?: string;
  name?: string;
  coordinatorUrl: string;
  capabilities: WorkerCapabilities;
  workDir?: string;
  artifactsDir?: string;
}

/**
 * Worker events
 */
export interface WorkerEvents {
  'registered': { workerId: string };
  'test:started': { testId: string; testPath: string };
  'test:progress': { testId: string; step: string; screenshot?: string };
  'test:completed': { result: TestResult };
  'error': { error: Error };
  'disconnected': { reason: string };
}

/**
 * Test execution options for worker (simplified subset)
 */
export interface WorkerExecutionOptions {
  timeout?: number;
  retries?: number;
  browser?: string;
  headless?: boolean;
  traceEnabled?: boolean;
  screenshotOnFailure?: boolean;
  videoEnabled?: boolean;
  // Environment variables for {{variableName}} resolution in Vero scripts
  envVars?: Record<string, string>;
}

/**
 * Test Worker
 *
 * Executes Playwright tests and reports results to coordinator.
 */
export class TestWorker extends EventEmitter {
  readonly id: string;
  readonly name: string;
  readonly capabilities: WorkerCapabilities;

  private coordinatorUrl: string;
  private workDir: string;
  private artifactsDir: string;
  private status: WorkerStatus = 'idle';
  private currentTests: Map<string, ChildProcess> = new Map();
  private heartbeatInterval?: ReturnType<typeof setInterval>;
  private registered: boolean = false;

  constructor(config: WorkerConfig) {
    super();

    this.id = config.id || `worker-${uuidv4().slice(0, 8)}`;
    this.name = config.name || `Worker ${this.id}`;
    this.coordinatorUrl = config.coordinatorUrl;
    this.capabilities = config.capabilities;
    this.workDir = config.workDir || process.cwd();
    this.artifactsDir = config.artifactsDir || path.join(this.workDir, 'artifacts');
  }

  // ==================== Lifecycle ====================

  /**
   * Register with coordinator
   */
  async register(): Promise<void> {
    try {
      const response = await fetch(`${this.coordinatorUrl}/api/workers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: this.id,
          name: this.name,
          type: 'local',
          host: process.env.HOSTNAME || 'localhost',
          port: parseInt(process.env.WORKER_PORT || '3002'),
          capabilities: this.capabilities,
        }),
      });

      if (!response.ok) {
        throw new Error(`Registration failed: ${response.statusText}`);
      }

      this.registered = true;
      this.startHeartbeat();

      logger.info(`Worker ${this.id} registered with coordinator`);
      this.emit('registered', { workerId: this.id });
    } catch (error) {
      logger.error(`Failed to register worker: ${error}`);
      throw error;
    }
  }

  /**
   * Start heartbeat to coordinator
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.sendHeartbeat();
      } catch (error) {
        logger.warn(`Heartbeat failed: ${error}`);
      }
    }, 30000);
  }

  /**
   * Send heartbeat to coordinator
   */
  private async sendHeartbeat(): Promise<void> {
    await fetch(`${this.coordinatorUrl}/api/workers/${this.id}/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: this.status }),
    });
  }

  /**
   * Unregister from coordinator
   */
  async unregister(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.registered) {
      try {
        await fetch(`${this.coordinatorUrl}/api/workers/${this.id}/unregister`, {
          method: 'POST',
        });
      } catch (error) {
        logger.warn(`Failed to unregister: ${error}`);
      }
    }

    this.registered = false;
    this.emit('disconnected', { reason: 'unregistered' });
  }

  /**
   * Get current status
   */
  getStatus(): WorkerStatus {
    return this.status;
  }

  // ==================== Test Execution ====================

  /**
   * Run tests from an allocation
   */
  async *runTests(
    allocation: TestAllocation,
    options: WorkerExecutionOptions = {}
  ): AsyncGenerator<TestResult> {
    this.status = 'busy';

    for (const test of allocation.tests) {
      const result = await this.runSingleTest(test, allocation, options);
      yield result;
    }

    this.status = 'idle';
  }

  /**
   * Run a single test
   */
  private async runSingleTest(
    test: TestFile,
    allocation: TestAllocation,
    options: WorkerExecutionOptions
  ): Promise<TestResult> {
    const startTime = new Date();
    const testDir = path.join(this.artifactsDir, test.id);

    // Ensure artifacts directory exists
    await fs.mkdir(testDir, { recursive: true });

    this.emit('test:started', { testId: test.id, testPath: test.path });

    try {
      const playwrightResult = await this.executePlaywright(test, testDir, options);

      const result: TestResult = {
        testId: test.id,
        testPath: test.path,
        testName: test.name,
        workerId: this.id,
        shardIndex: allocation.shardIndex,
        status: playwrightResult.exitCode === 0 ? 'passed' : 'failed',
        duration: Date.now() - startTime.getTime(),
        error: playwrightResult.error,
        errorStack: playwrightResult.errorStack,
        screenshots: playwrightResult.screenshots,
        traceUrl: playwrightResult.traceUrl,
        videoUrl: playwrightResult.videoUrl,
        startedAt: startTime,
        finishedAt: new Date(),
      };

      this.emit('test:completed', { result });
      await this.reportResult(result);

      return result;
    } catch (error: any) {
      const result: TestResult = {
        testId: test.id,
        testPath: test.path,
        testName: test.name,
        workerId: this.id,
        shardIndex: allocation.shardIndex,
        status: 'failed',
        duration: Date.now() - startTime.getTime(),
        error: error.message,
        errorStack: error.stack,
        startedAt: startTime,
        finishedAt: new Date(),
      };

      this.emit('test:completed', { result });
      await this.reportResult(result);

      return result;
    }
  }

  /**
   * Execute Playwright test
   */
  private executePlaywright(
    test: TestFile,
    testDir: string,
    options: WorkerExecutionOptions
  ): Promise<{
    exitCode: number;
    error?: string;
    errorStack?: string;
    screenshots?: string[];
    traceUrl?: string;
    videoUrl?: string;
  }> {
    return new Promise((resolve) => {
      const args = [
        'playwright',
        'test',
        test.path,
        '--reporter=json',
      ];

      // Add options
      if (options.browser) {
        args.push(`--project=${options.browser}`);
      }

      if (options.retries) {
        args.push(`--retries=${options.retries}`);
      }

      if (options.timeout) {
        args.push(`--timeout=${options.timeout}`);
      }

      if (options.traceEnabled) {
        args.push('--trace=on');
      }

      // Set output directory
      args.push(`--output=${testDir}`);

      const env: Record<string, string | undefined> = {
        ...process.env,
        PLAYWRIGHT_JSON_OUTPUT_NAME: path.join(testDir, 'results.json'),
      };

      if (options.headless === false) {
        env.PWDEBUG = '1';
      }

      // Pass environment variables for {{variableName}} resolution in Vero scripts
      if (options.envVars && Object.keys(options.envVars).length > 0) {
        env.VERO_ENV_VARS = JSON.stringify(options.envVars);
      }

      const child = spawn('npx', args, {
        cwd: this.workDir,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.currentTests.set(test.id, child);

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', async (exitCode) => {
        this.currentTests.delete(test.id);

        // Parse results
        let error: string | undefined;
        let errorStack: string | undefined;

        try {
          const resultsPath = path.join(testDir, 'results.json');
          const resultsContent = await fs.readFile(resultsPath, 'utf-8');
          const results = JSON.parse(resultsContent);

          if (results.errors && results.errors.length > 0) {
            error = results.errors[0].message;
            errorStack = results.errors[0].stack;
          }
        } catch {
          if (exitCode !== 0) {
            error = stderr || stdout || 'Test failed';
          }
        }

        // Find artifacts
        const screenshots = await this.findArtifacts(testDir, '*.png');
        const traces = await this.findArtifacts(testDir, '*.zip');
        const videos = await this.findArtifacts(testDir, '*.webm');

        resolve({
          exitCode: exitCode ?? 1,
          error,
          errorStack,
          screenshots,
          traceUrl: traces[0],
          videoUrl: videos[0],
        });
      });

      // Handle timeout
      if (options.timeout) {
        setTimeout(() => {
          if (this.currentTests.has(test.id)) {
            child.kill('SIGTERM');
          }
        }, options.timeout);
      }
    });
  }

  /**
   * Find artifact files in directory
   */
  private async findArtifacts(dir: string, pattern: string): Promise<string[]> {
    try {
      const files = await fs.readdir(dir);
      const ext = pattern.replace('*', '');
      return files.filter((f) => f.endsWith(ext)).map((f) => path.join(dir, f));
    } catch {
      return [];
    }
  }

  /**
   * Cancel a running test
   */
  cancelTest(testId: string): boolean {
    const process = this.currentTests.get(testId);
    if (process) {
      process.kill('SIGTERM');
      return true;
    }
    return false;
  }

  /**
   * Cancel all running tests
   */
  cancelAllTests(): void {
    for (const [testId, process] of this.currentTests) {
      process.kill('SIGTERM');
    }
    this.currentTests.clear();
  }

  // ==================== Result Reporting ====================

  /**
   * Report test result to coordinator
   */
  async reportResult(result: TestResult): Promise<void> {
    try {
      await fetch(`${this.coordinatorUrl}/api/workers/${this.id}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
    } catch (error) {
      logger.warn(`Failed to report result: ${error}`);
    }
  }

  // ==================== Artifact Upload ====================

  /**
   * Upload trace file
   */
  async uploadTrace(testId: string, tracePath: string): Promise<string | null> {
    try {
      const traceData = await fs.readFile(tracePath);
      const formData = new FormData();
      formData.append('trace', new Blob([traceData]), path.basename(tracePath));
      formData.append('testId', testId);
      formData.append('workerId', this.id);

      const response = await fetch(`${this.coordinatorUrl}/api/artifacts/trace`, {
        method: 'POST',
        body: formData as any,
      });

      if (response.ok) {
        const data = await response.json() as { url: string };
        return data.url;
      }
    } catch (error) {
      logger.warn(`Failed to upload trace: ${error}`);
    }

    return null;
  }

  /**
   * Upload screenshot
   */
  async uploadScreenshot(testId: string, screenshotPath: string): Promise<string | null> {
    try {
      const imageData = await fs.readFile(screenshotPath);
      const base64 = imageData.toString('base64');

      const response = await fetch(`${this.coordinatorUrl}/api/artifacts/screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId,
          workerId: this.id,
          filename: path.basename(screenshotPath),
          data: base64,
        }),
      });

      if (response.ok) {
        const data = await response.json() as { url: string };
        return data.url;
      }
    } catch (error) {
      logger.warn(`Failed to upload screenshot: ${error}`);
    }

    return null;
  }

  /**
   * Upload video
   */
  async uploadVideo(testId: string, videoPath: string): Promise<string | null> {
    try {
      const videoData = await fs.readFile(videoPath);
      const formData = new FormData();
      formData.append('video', new Blob([videoData]), path.basename(videoPath));
      formData.append('testId', testId);
      formData.append('workerId', this.id);

      const response = await fetch(`${this.coordinatorUrl}/api/artifacts/video`, {
        method: 'POST',
        body: formData as any,
      });

      if (response.ok) {
        const data = await response.json() as { url: string };
        return data.url;
      }
    } catch (error) {
      logger.warn(`Failed to upload video: ${error}`);
    }

    return null;
  }

  // ==================== Info ====================

  /**
   * Get worker info
   */
  getInfo(): Worker {
    return {
      id: this.id,
      name: this.name,
      type: 'local',
      host: process.env.HOSTNAME || 'localhost',
      port: parseInt(process.env.WORKER_PORT || '3002'),
      capabilities: this.capabilities,
      status: this.status,
      currentTests: Array.from(this.currentTests.keys()),
      registeredAt: new Date(),
      lastHeartbeat: new Date(),
    };
  }
}

/**
 * Create a worker instance from environment variables
 */
export function createWorkerFromEnv(): TestWorker {
  const browsers = (process.env.WORKER_BROWSERS || 'chromium,firefox,webkit').split(',');
  const maxConcurrent = parseInt(process.env.WORKER_MAX_CONCURRENT || '2');
  const tags = process.env.WORKER_TAGS?.split(',');

  return new TestWorker({
    id: process.env.WORKER_ID,
    name: process.env.WORKER_NAME,
    coordinatorUrl: process.env.COORDINATOR_URL || 'http://coordinator:3001',
    capabilities: {
      browsers,
      maxConcurrent,
      tags,
    },
  });
}
