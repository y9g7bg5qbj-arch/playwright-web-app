import { io, Socket } from 'socket.io-client';
import os from 'os';
import { config } from './config';
import { logger } from './logger';
import { Recorder } from './recorder';
import { Executor } from './executor';
import type { AgentListenEvents, AgentEmitEvents } from '@playwright-web-app/shared';

class Agent {
  private socket: Socket<AgentListenEvents, AgentEmitEvents> | null = null;
  private recorder: Recorder | null = null;
  private executor: Executor | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  async start() {
    logger.info('Starting Playwright Agent...');
    logger.info(`Agent name: ${config.agentName}`);
    logger.info(`Server URL: ${config.serverUrl}`);

    if (!config.agentToken) {
      logger.error('AGENT_TOKEN not set in environment variables');
      logger.error('Please set AGENT_TOKEN in your .env file');
      process.exit(1);
    }

    this.connect();
  }

  private connect() {
    logger.info('Connecting to server...');

    this.socket = io(config.serverUrl, {
      auth: {
        token: config.agentToken,
      },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      logger.info('Connected to server');
      this.setupHandlers();
      this.startHeartbeat();

      // Register agent
      this.socket!.emit('agent:register', {
        name: config.agentName,
        systemInfo: {
          platform: os.platform(),
          arch: os.arch(),
          nodeVersion: process.version,
          playwrightVersion: require('@playwright/test/package.json').version,
        },
      });
    });

    this.socket.on('disconnect', () => {
      logger.warn('Disconnected from server');
      this.stopHeartbeat();
    });

    this.socket.on('connect_error', (error) => {
      logger.error('Connection error:', error.message);
    });
  }

  private setupHandlers() {
    if (!this.socket) return;

    // Remove all existing listeners to prevent duplicates
    this.socket.removeAllListeners('recording:start');
    this.socket.removeAllListeners('recording:cancel');
    this.socket.removeAllListeners('execution:start');
    this.socket.removeAllListeners('execution:cancel');

    this.socket.on('recording:start', async (data) => {
      logger.info('Recording start requested:', data);

      this.recorder = new Recorder();

      // Notify that recording is ready
      this.socket!.emit('recording:ready', {
        testFlowId: data.testFlowId,
        executionId: data.executionId,
      });

      // Start recording
      await this.recorder.start(
        data.url,
        data.language,
        data.executionId,
        (success, code, error) => {
          this.socket!.emit('recording:complete', {
            testFlowId: data.testFlowId,
            executionId: data.executionId,
            success,
            code,
            message: error,
          });
          this.recorder = null;
        }
      );
    });

    this.socket.on('recording:cancel', (data) => {
      logger.info('Recording cancel requested:', data);
      if (this.recorder) {
        this.recorder.cancel();
        this.recorder = null;
      }
    });

    this.socket.on('execution:start', async (data) => {
      logger.info('Execution start requested:', data);

      this.executor = new Executor();

      await this.executor.execute(
        data.code,
        data.executionId,
        (message, level) => {
          this.socket!.emit('execution:log', {
            executionId: data.executionId,
            message,
            level,
          });
        },
        (exitCode, duration) => {
          this.socket!.emit('execution:complete', {
            executionId: data.executionId,
            exitCode,
            duration,
          });
          this.executor = null;
        }
      );
    });

    this.socket.on('execution:cancel', (data) => {
      logger.info('Execution cancel requested:', data);
      if (this.executor) {
        this.executor.cancel();
        this.executor = null;
      }
    });
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('agent:heartbeat');
      }
    }, config.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

const agent = new Agent();
agent.start();

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down agent...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down agent...');
  process.exit(0);
});
