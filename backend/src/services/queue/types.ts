/**
 * Queue Types
 * Type definitions for the job queue system
 */

export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
export type JobPriority = 0 | 1 | 2 | 3; // 0=low, 1=normal, 2=high, 3=critical

export interface ScheduleRunJobData {
  scheduleId: string;
  runId: string;
  userId: string;
  triggerType: 'scheduled' | 'manual' | 'webhook' | 'api';
  testSelector?: {
    tags?: string[];
    folders?: string[];
    patterns?: string[];
  };
  parameterValues?: Record<string, unknown>;
  executionConfig?: {
    browser?: 'chromium' | 'firefox' | 'webkit';
    headless?: boolean;
    timeout?: number;
    retries?: number;
    workers?: number;
    baseUrl?: string;
    environment?: string;
  };
}

export interface ExecutionJobData {
  executionId: string;
  testFlowId: string;
  userId: string;
  config: {
    browser: 'chromium' | 'firefox' | 'webkit';
    headless: boolean;
    timeout: number;
    retries: number;
    workers: number;
    baseUrl?: string;
    environment?: string;
    tracing?: boolean;
    screenshot?: 'on' | 'off' | 'only-on-failure';
    video?: boolean;
  };
}

export interface GitHubWorkflowJobData {
  workflowId: string;
  userId: string;
  owner: string;
  repo: string;
  workflowPath: string;
  ref: string;
  inputs?: Record<string, string>;
  executionId?: string;
}

export type QueueJobData = ScheduleRunJobData | ExecutionJobData | GitHubWorkflowJobData;

export interface QueueJob<T = QueueJobData> {
  id: string;
  name: string;
  data: T;
  priority: JobPriority;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  progress: number;
  createdAt: Date;
  processedAt?: Date;
  finishedAt?: Date;
  failedReason?: string;
}

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

export interface QueueWorkerOptions {
  concurrency?: number;
  limiter?: {
    max: number;
    duration: number;
  };
}

export const QUEUE_NAMES = {
  SCHEDULE_RUN: 'schedule-run',
  EXECUTION: 'execution',
  GITHUB_WORKFLOW: 'github-workflow',
  NOTIFICATION: 'notification',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
