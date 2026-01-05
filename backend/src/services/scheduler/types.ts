/**
 * Scheduler Service Types
 */

// =============================================
// Execution Configuration
// =============================================

export interface ExecutionConfig {
  browser?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  workers?: number;
  retries?: number;
  timeout?: number;
  video?: 'on' | 'off' | 'on-first-retry' | 'retain-on-failure';
  screenshot?: 'on' | 'off' | 'only-on-failure';
  trace?: 'on' | 'off' | 'on-first-retry' | 'retain-on-failure';
  viewport?: {
    width: number;
    height: number;
  };
  baseURL?: string;
  extraHTTPHeaders?: Record<string, string>;
  environmentVariables?: Record<string, string>;
}

// =============================================
// Run Trigger Types
// =============================================

export type RunTriggerType = 'schedule' | 'manual' | 'api' | 'webhook';
export type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

// =============================================
// DTOs (Data Transfer Objects)
// =============================================

export interface CreateScheduleDTO {
  projectId: string;
  name: string;
  description?: string;
  testPattern: string;
  cronExpression: string;
  timezone?: string;
  enabled?: boolean;
  config?: ExecutionConfig;
}

export interface UpdateScheduleDTO {
  name?: string;
  description?: string;
  testPattern?: string;
  cronExpression?: string;
  timezone?: string;
  enabled?: boolean;
  config?: ExecutionConfig;
}

export interface CreateNotificationDTO {
  type: 'email' | 'slack' | 'webhook';
  config: EmailNotificationConfig | SlackNotificationConfig | WebhookNotificationConfig;
  enabled?: boolean;
}

export interface UpdateNotificationDTO {
  type?: 'email' | 'slack' | 'webhook';
  config?: EmailNotificationConfig | SlackNotificationConfig | WebhookNotificationConfig;
  enabled?: boolean;
}

// =============================================
// Notification Configurations
// =============================================

export interface EmailNotificationConfig {
  recipients: string[];
  onSuccess?: boolean;
  onFailure?: boolean;
  includeReport?: boolean;
  includeLogs?: boolean;
}

export interface SlackNotificationConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
  onSuccess?: boolean;
  onFailure?: boolean;
  mentionOnFailure?: string[];
}

export interface WebhookNotificationConfig {
  url: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  onSuccess?: boolean;
  onFailure?: boolean;
  includeResults?: boolean;
}

// =============================================
// Response Types
// =============================================

export interface ScheduledTestResponse {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  description?: string;
  testPattern: string;
  cronExpression: string;
  cronDescription: string;
  timezone: string;
  enabled: boolean;
  config: ExecutionConfig;
  lastRunAt?: Date | null;
  nextRunAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  runs?: ScheduledRunResponse[];
  notifications?: NotificationResponse[];
}

export interface ScheduledRunResponse {
  id: string;
  scheduleId: string;
  status: RunStatus;
  triggeredBy: RunTriggerType;
  startedAt?: Date | null;
  completedAt?: Date | null;
  executionId?: string | null;
  results?: RunResults | null;
  errorMessage?: string | null;
  createdAt: Date;
}

export interface RunResults {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration: number;
  failedTests?: FailedTest[];
}

export interface FailedTest {
  name: string;
  path?: string;
  error: string;
  screenshotPath?: string;
  tracePath?: string;
}

export interface NotificationResponse {
  id: string;
  type: 'email' | 'slack' | 'webhook';
  config: EmailNotificationConfig | SlackNotificationConfig | WebhookNotificationConfig;
  enabled: boolean;
}

// =============================================
// Queue Types
// =============================================

export enum QueuePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

export interface QueueItem {
  id: string;
  scheduleId?: string;
  testPattern: string;
  config: ExecutionConfig;
  priority: QueuePriority;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface QueueStats {
  queuedCount: number;
  runningCount: number;
  completedCount: number;
  failedCount: number;
  totalCount: number;
  isPaused: boolean;
}

// =============================================
// Cron Types
// =============================================

export interface CronPreset {
  label: string;
  expression: string;
  description: string;
}

export interface CronValidation {
  valid: boolean;
  error?: string;
  description?: string;
  nextRuns?: Date[];
}

// =============================================
// Event Types
// =============================================

export interface SchedulerEvents {
  'scheduler:started': void;
  'scheduler:stopped': void;
  'schedule:created': { scheduleId: string };
  'schedule:updated': { scheduleId: string };
  'schedule:deleted': { scheduleId: string };
  'schedule:enabled': { scheduleId: string };
  'schedule:disabled': { scheduleId: string };
  'schedule:triggered': { scheduleId: string; runId: string; triggeredBy: RunTriggerType };
  'run:started': { runId: string };
  'run:completed': { runId: string; status: RunStatus };
  'run:failed': { runId: string; error: string };
  'run:cancelled': { runId: string; scheduleId: string };
  'queue:paused': void;
  'queue:resumed': void;
  'queue:item:added': { itemId: string };
  'queue:item:started': { itemId: string };
  'queue:item:completed': { itemId: string };
  'queue:item:failed': { itemId: string; error: string };
}
