import type { RunConfigurationCreate, RunConfigurationUpdate } from './runConfiguration';

// User Types
export type UserRole = 'admin' | 'qa_lead' | 'senior_qa' | 'qa_tester' | 'viewer';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  onboardingCompleted?: boolean;
  passwordSetAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreate {
  email: string;
  password: string;
  name?: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Application Types (Top-level container)
export interface Application {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  members?: ApplicationMember[];
  projects?: Project[];
  workflows?: Workflow[];
}

export interface ApplicationCreate {
  name: string;
  description?: string;
}

export interface ApplicationUpdate {
  name?: string;
  description?: string;
}

export type ApplicationMemberRole = 'owner' | 'editor' | 'viewer';

export interface ApplicationMember {
  id: string;
  applicationId: string;
  userId: string;
  role: ApplicationMemberRole;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

export interface ApplicationMemberCreate {
  userId: string;
  role: ApplicationMemberRole;
}

// Project Types (Nested under Application)
export interface Project {
  id: string;
  applicationId: string;
  name: string;
  description?: string;
  veroPath?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectCreate {
  name: string;
  description?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
}

// Legacy aliases for backwards compatibility
export type ProjectMemberRole = ApplicationMemberRole;
export type ProjectMember = ApplicationMember;
export type ProjectMemberCreate = ApplicationMemberCreate;

// Workflow Types
export interface Workflow {
  id: string;
  applicationId: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  testFlows?: TestFlow[];
}

export interface WorkflowCreate {
  applicationId: string;
  name: string;
  description?: string;
}

export interface WorkflowUpdate {
  name?: string;
  description?: string;
}

// Test Flow Types
export interface TestFlow {
  id: string;
  workflowId: string;
  name: string;
  code?: string;
  nodes?: string;
  edges?: string;
  language: 'javascript' | 'typescript' | 'python';
  createdAt: Date;
  updatedAt: Date;
  executions?: Execution[];
}

export interface TestFlowCreate {
  name: string;
  code?: string;
  nodes?: string;
  edges?: string;
  language?: 'javascript' | 'typescript' | 'python';
}

export interface TestFlowUpdate {
  name?: string;
  code?: string;
  nodes?: string;
  edges?: string;
  language?: 'javascript' | 'typescript' | 'python';
}

// Execution Types
export type ExecutionStatus = 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';
export type ExecutionTarget = 'local' | 'remote';

export interface MatrixCombination {
  label: string;                        // "state=IL" or "state=IL, region=midwest"
  values: Record<string, string>;       // { state: "IL" }
}

export interface Execution {
  id: string;
  testFlowId: string;
  status: ExecutionStatus;
  exitCode?: number;
  target: ExecutionTarget;
  agentId?: string;
  triggeredByUser?: string;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  logs?: ExecutionLog[];
  steps?: ExecutionStep[];
  isMatrixParent?: boolean;
  matrixChildren?: string[];
  matrixParentId?: string;
  matrixLabel?: string;
  matrixConfig?: {
    combinations: MatrixCombination[];
    concurrency: number;
    failFast: boolean;
    totalChildren: number;
  };
}

export interface ExecutionCreate {
  target: ExecutionTarget;
  agentId?: string;
}

export interface ExecutionLog {
  id: string;
  executionId: string;
  message: string;
  level: 'info' | 'warn' | 'error';
  timestamp: Date;
}

// Execution Step Types (for detailed reporting)
export type ExecutionStepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface ExecutionStep {
  id: string;
  executionId: string;
  stepNumber: number;
  action: string;
  description?: string;
  selector?: string;
  selectorName?: string;
  value?: string;
  url?: string;
  status: ExecutionStepStatus;
  duration?: number;
  error?: string;
  screenshot?: string;
  startedAt?: Date;
  finishedAt?: Date;
}

export interface ExecutionStepCreate {
  stepNumber: number;
  action: string;
  description?: string;
  selector?: string;
  selectorName?: string;
  value?: string;
  url?: string;
}

// Agent Types
export type AgentStatus = 'online' | 'offline' | 'busy';

export interface Agent {
  id: string;
  userId: string;
  name: string;
  status: AgentStatus;
  lastSeenAt?: Date;
  systemInfo?: {
    platform?: string;
    arch?: string;
    nodeVersion?: string;
    playwrightVersion?: string;
  };
  createdAt: Date;
}

export interface AgentCreate {
  name: string;
}

export interface AgentUpdate {
  name?: string;
  status?: AgentStatus;
  systemInfo?: Agent['systemInfo'];
}

// Recording Types
export interface RecordingConfig {
  viewport?: {
    width: number;
    height: number;
  };
  device?: string;
  colorScheme?: 'light' | 'dark';
}

export interface RecordingStart {
  testFlowId: string;
  url: string;
  language: 'javascript' | 'typescript' | 'python';
  config?: RecordingConfig;
}

// WebSocket Event Types - Frontend Client
export type ClientToServerEvents = {
  'recording:start': (data: RecordingStart & { executionId: string }) => void;
  'recording:cancel': (data: { testFlowId: string; executionId: string }) => void;
  'execution:start': (data: { executionId: string; target: ExecutionTarget; code: string }) => void;
  'execution:cancel': (data: { executionId: string }) => void;
  // Codegen recorder events
  'codegen:subscribe': (data: { sessionId: string }) => void;
  'codegen:unsubscribe': (data: { sessionId: string }) => void;
  'recording:codegen:start': (data: { url: string; sessionId: string; scenarioName: string }) => void;
  'recording:codegen:stop': (data: { sessionId: string }) => void;
  // Embedded recorder events
  'recording:embedded:start': (data: { url: string; sessionId: string; scenarioName: string; useProxy?: boolean }) => void;
  'recording:embedded:stop': (data: { sessionId: string }) => void;
  // Embedded recorder input events
  'recording:input:click': (data: { sessionId: string; x: number; y: number }) => void;
  'recording:input:move': (data: { sessionId: string; x: number; y: number }) => void;
  'recording:input:type': (data: { sessionId: string; text: string; key?: string }) => void;
  'recording:input:scroll': (data: { sessionId: string; x: number; y: number; deltaX: number; deltaY: number }) => void;
  // Embedded recorder iframe action forwarding
  'recording:iframe:action': (data: { sessionId: string; action: Record<string, unknown>; url?: string; scenarioName?: string; sandboxPath?: string }) => void;
  // Debug client events
  'debug:start': (data: { executionId: string; testFlowId: string; code: string; breakpoints: number[] }) => void;
  'debug:set-breakpoints': (data: { executionId: string; breakpoints: number[] }) => void;
  'debug:resume': (data: { executionId: string }) => void;
  'debug:step-over': (data: { executionId: string }) => void;
  'debug:step-into': (data: { executionId: string }) => void;
  'debug:stop': (data: { executionId: string }) => void;
};

export type ServerToClientEvents = {
  'recording:ready': (data: { testFlowId: string; executionId: string }) => void;
  'recording:complete': (data: { testFlowId: string; executionId: string; success: boolean; code?: string; message?: string }) => void;
  // Recording action & page object events
  'recording:action': (data: { sessionId: string; veroCode: string; newPagePath?: string; newPageCode?: string }) => void;
  'recording:page-updated': (data: { sessionId: string; pageName: string; fieldName: string; filePath: string; pageContent: string }) => void;
  'recording:field-created': (data: { sessionId: string; pageName: string; fieldName: string }) => void;
  'recording:error': (data: { sessionId?: string; error: string }) => void;
  // Codegen recorder events
  'recording:codegen:ready': (data: { sessionId: string }) => void;
  'recording:codegen:complete': (data: { sessionId: string }) => void;
  // Embedded recorder events
  'recording:embedded:ready': (data: { sessionId: string; mode: string }) => void;
  'recording:embedded:complete': (data: { sessionId: string; code?: string }) => void;
  // Embedded recorder streaming
  'recording:frame': (data: { sessionId: string; frame: string }) => void;
  'recording:debug': (data: { sessionId: string; message: string; elementInfo?: Record<string, unknown>; urlAfter?: string }) => void;
  // Codegen action events (forwarded to subscribers)
  'codegen:action': (data: { sessionId: string; veroCode: string; pagePath?: string; pageCode?: string; fieldCreated?: Record<string, unknown> }) => void;
  'codegen:error': (data: { sessionId: string; error: string }) => void;
  'codegen:stopped': (data: { sessionId: string; veroLines: string[]; scenarioName: string }) => void;
  // Execution events
  'execution:log': (data: { executionId: string; message: string; level: 'info' | 'warn' | 'error' }) => void;
  'execution:complete': (data: {
    executionId: string;
    exitCode: number;
    duration: number;
    traceUrl?: string;
    scenarios?: Array<{
      id: string;
      name: string;
      status: string;
      duration?: number;
      error?: string;
      steps?: unknown[];
    }>;
  }) => void;
  'execution:screenshot': (data: { executionId: string; stepNumber: number; imageData: string }) => void;
  'agent:status': (data: { agentId: string; status: AgentStatus }) => void;
  'error': (data: { message: string; executionId?: string }) => void;
  // Debug events
  'debug:step:before': (data: { executionId: string; line: number; action: string; target?: string }) => void;
  'debug:step:after': (data: { executionId: string; line: number; action: string; success: boolean; duration?: number }) => void;
  'debug:paused': (data: { executionId: string; line: number }) => void;
  'debug:variable': (data: { executionId: string; name: string; value: unknown; type: string }) => void;
  'debug:log': (data: { executionId: string; line: number; message: string; level: 'info' | 'warn' | 'error' }) => void;
  'debug:complete': (data: { executionId: string; exitCode: number; duration: number }) => void;
  'debug:resumed': (data: { executionId: string }) => void;
  'debug:stopped': (data: { executionId: string }) => void;
};

// WebSocket Event Types - Agent
export type AgentListenEvents = {
  'recording:start': (data: RecordingStart & { executionId: string }) => void;
  'recording:cancel': (data: { testFlowId: string; executionId: string }) => void;
  'execution:start': (data: { executionId: string; target: ExecutionTarget; code: string }) => void;
  'execution:cancel': (data: { executionId: string }) => void;
};

export type AgentEmitEvents = {
  'recording:ready': (data: { testFlowId: string; executionId: string }) => void;
  'recording:complete': (data: { testFlowId: string; executionId: string; success: boolean; code?: string; message?: string }) => void;
  'execution:log': (data: { executionId: string; message: string; level: 'info' | 'warn' | 'error' }) => void;
  'execution:complete': (data: { executionId: string; exitCode: number; duration: number }) => void;
  'agent:register': (data: { name: string; systemInfo: Agent['systemInfo'] }) => void;
  'agent:heartbeat': () => void;
};

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Error Types
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================
// SCHEDULED TEST EXECUTION TYPES
// ============================================

export type ScheduleTriggerType = 'scheduled' | 'webhook' | 'manual' | 'chained';
export type ScheduleRunStatus = 'pending' | 'running' | 'passed' | 'failed' | 'cancelled' | 'skipped';
export type ScheduleConcurrencyPolicy = 'allow' | 'forbid';

// Test selector configuration for scheduled runs
export interface TestSelector {
  tags?: string[];        // e.g., ['@smoke', '@critical']
  tagMode?: 'any' | 'all'; // 'any' = OR logic (default), 'all' = AND logic
  folders?: string[];     // e.g., ['/tests/auth/**']
  patterns?: string[];    // e.g., ['*.login.*']
  testFlowIds?: string[]; // Specific flow IDs to run
}

export type ScheduleFolderScope = 'dev' | 'master' | 'sandboxes';

// Notification configuration for scheduled runs
export interface ScheduleNotificationConfig {
  email?: string[];
  slack?: {
    webhook: string;
    channel?: string;
  };
  onFailureOnly?: boolean;
  includeArtifacts?: boolean;
}

// =============================================
// SCHEDULE PARAMETER SYSTEM (Jenkins-style)
// =============================================

// Parameter types supported
export type ScheduleParameterType = 'string' | 'choice' | 'boolean' | 'number';

// Parameter definition (schema for what can be configured)
export interface ScheduleParameterDefinition {
  name: string;               // Parameter key, e.g., "browser", "baseUrl"
  type: ScheduleParameterType;
  label: string;              // Human-readable label
  description?: string;       // Help text shown in UI
  defaultValue: string | number | boolean;
  required?: boolean;

  // For 'choice' type
  choices?: string[];

  // For 'number' type
  min?: number;
  max?: number;
  step?: number;

  // For 'string' type
  placeholder?: string;
  pattern?: string;           // Regex validation
}

// Parameter values (actual values for a run)
export type ScheduleParameterValues = Record<string, string | number | boolean>;

// Execution config for scheduled runs
export interface ScheduleExecutionConfig {
  target?: 'local' | 'docker' | 'remote';
  browser?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  workers?: number;
  retries?: number;
  timeout?: number;
  tracing?: 'always' | 'on-failure' | 'never';
  screenshot?: 'always' | 'on-failure' | 'never';
  video?: 'always' | 'on-failure' | 'never';
  environmentId?: string;
  parameterSetId?: string;
}

/**
 * Subset of execution config fields that can be temporarily overridden per-run
 * via the "Run now" modal (Jenkins-style parameterized overrides).
 * These apply to ONE run only and do NOT modify the saved RunConfiguration.
 */
export interface ExecutionConfigOverrides {
  browser?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  workers?: number;
  retries?: number;
  timeout?: number;
  tagExpression?: string;
}

// Execution target for schedules (where tests run)
export type ScheduleExecutionTarget = 'local' | 'github-actions';

// GitHub Actions configuration for schedules
export interface ScheduleGitHubActionsConfig {
  repoFullName: string;      // e.g., "owner/repo"
  branch: string;            // e.g., "main"
  workflowFile: string;      // e.g., "vero-tests.yml"
  inputs?: Record<string, string>; // Workflow inputs
}

// Request to trigger a run with parameters and optional execution overrides
export interface ScheduleTriggerRequest {
  parameterValues?: ScheduleParameterValues;
  /** Per-run execution config overrides (Jenkins-style). Applied on top of the linked RunConfiguration. */
  executionConfigOverrides?: ExecutionConfigOverrides;
}

// Schedule entity
export interface Schedule {
  id: string;
  userId: string;
  projectId?: string;
  workflowId?: string;
  scopeFolder?: ScheduleFolderScope;
  scopeSandboxId?: string;
  name: string;
  description?: string;
  cronExpression: string;
  timezone: string;
  testSelector: TestSelector;
  notificationConfig?: ScheduleNotificationConfig;
  isActive: boolean;
  nextRunAt?: Date;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  runs?: ScheduleRun[];
  // Legacy schedule-embedded parameter schema (read-only compatibility)
  parameters?: ScheduleParameterDefinition[];
  // Legacy schedule-embedded execution config (read-only compatibility)
  defaultExecutionConfig?: ScheduleExecutionConfig;
  // Legacy schedule-embedded execution target (read-only compatibility)
  executionTarget: ScheduleExecutionTarget;
  // Linked run configuration (source of truth for execution behavior)
  runConfigurationId?: string;
  // Overlap control: 'forbid' skips runs when previous is still pending/running
  concurrencyPolicy?: ScheduleConcurrencyPolicy;
  // Legacy schedule-embedded GitHub config (read-only compatibility)
  githubConfig?: ScheduleGitHubActionsConfig;
  // Legacy migration marker (set by backend backfill)
  migrationVersion?: number;
  // P1.2: Chained schedules — trigger these on success
  onSuccessTriggerScheduleIds?: string[];
}

export interface ScheduleCreate {
  projectId: string;
  workflowId: string;
  scopeFolder: ScheduleFolderScope;
  scopeSandboxId?: string;
  name: string;
  description?: string;
  cronExpression: string;
  timezone?: string;
  notificationConfig?: ScheduleNotificationConfig;
  isActive?: boolean;
  // Linked run configuration ID (optional when scheduleRunConfiguration is provided)
  runConfigurationId?: string;
  // Inline run config payload for scheduler-owned configs
  scheduleRunConfiguration?: RunConfigurationCreate;
  // P1.2: Chained schedules — trigger these on success
  onSuccessTriggerScheduleIds?: string[];
}

export interface ScheduleUpdate {
  projectId: string;
  scopeFolder: ScheduleFolderScope;
  scopeSandboxId?: string;
  name?: string;
  description?: string;
  cronExpression?: string;
  timezone?: string;
  notificationConfig?: ScheduleNotificationConfig;
  isActive?: boolean;
  // Linked run configuration ID (optional when scheduleRunConfiguration is provided)
  runConfigurationId?: string;
  // Inline run config payload for scheduler-owned configs
  scheduleRunConfiguration?: RunConfigurationUpdate;
  // P1.2: Chained schedules — trigger these on success
  onSuccessTriggerScheduleIds?: string[];
}

// Schedule run entity
export interface ScheduleRun {
  id: string;
  scheduleId: string;
  triggerType: ScheduleTriggerType;
  status: ScheduleRunStatus;
  testCount: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  durationMs?: number;
  artifactsPath?: string;
  errorMessage?: string;
  skipReason?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  testResults?: ScheduleTestResult[];
  // Parameter system - what was used for this run
  parameterValues?: ScheduleParameterValues;
  executionConfig?: ScheduleExecutionConfig;
  /** Per-run execution overrides that were applied (audit trail). */
  executionConfigOverrides?: ExecutionConfigOverrides;
  triggeredBy?: string;  // User email or "system" for cron
  // GitHub Actions tracking (when executed via GitHub Actions)
  githubRunId?: number;
  githubRunUrl?: string;
  executionId?: string;
}

// Individual test result in a run
export interface ScheduleTestResult {
  id: string;
  runId: string;
  testName: string;
  testPath?: string;
  status: ScheduleRunStatus;
  durationMs?: number;
  errorMessage?: string;
  errorStack?: string;
  retryCount: number;
  screenshotPath?: string;
  tracePath?: string;
  startedAt?: Date;
  completedAt?: Date;
}

// Cron schedule preset for UI
export interface SchedulePreset {
  label: string;           // "Every night at 2 AM"
  cronExpression: string;  // "0 2 * * *"
  description?: string;
}

// Schedule presets for non-technical users
export const SCHEDULE_PRESETS: SchedulePreset[] = [
  { label: 'Every night at 2 AM', cronExpression: '0 2 * * *', description: 'Ideal for regression testing' },
  { label: 'Every morning at 6 AM', cronExpression: '0 6 * * *', description: 'Run before the team arrives' },
  { label: 'Every hour', cronExpression: '0 * * * *', description: 'Continuous monitoring' },
  { label: 'Every Monday at 6 AM', cronExpression: '0 6 * * 1', description: 'Weekly smoke tests' },
  { label: 'Every weekday at 8 AM', cronExpression: '0 8 * * 1-5', description: 'Business hours only' },
  { label: 'Every 30 minutes', cronExpression: '*/30 * * * *', description: 'Frequent validation' },
];

// ============================================
// AUTH PROFILE TYPES (Phase A)
// ============================================

export type AuthProfileStatus = 'ready' | 'refreshing' | 'expired' | 'error';

export interface AuthProfile {
  id: string;
  applicationId: string;
  projectId: string;
  name: string;
  description?: string;
  loginScriptPath: string;
  storageStatePath?: string;
  status: AuthProfileStatus;
  lastRefreshedAt?: Date;
  errorMessage?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthProfileCreate {
  applicationId: string;
  projectId: string;
  name: string;
  description?: string;
  loginScriptPath: string;
}

// ============================================
// FAILURE TRANSLATION TYPES (Phase B)
// ============================================

export interface LineMapEntry {
  generatedLine: number;
  dslFile: string;
  dslLine: number;
  dslText: string;
}

export interface VeroFailureInfo {
  category: string;
  userMessage: string;
  dslFile: string;
  dslLine: number;
  dslText: string;
  errorCode: string;
  retryable: boolean;
  rawError?: string;
  tracePath?: string;
}

// ============================================
// CUSTOM ACTIONS TYPES (Phase C)
// ============================================

export interface CustomActionParam {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  description?: string;
}

export type CustomActionReturnType = 'FLAG' | 'TEXT' | 'NUMBER' | 'LIST';

export interface CustomActionDefinition {
  name: string;
  description: string;
  params: CustomActionParam[];
  returns?: CustomActionReturnType;
  sourceFile: string;
  timeoutMs?: number;
}

export interface CustomActionsManifest {
  actions: CustomActionDefinition[];
}

// ============================================
// CONFIG SYNC TYPES (Phase D)
// ============================================

export type ConfigSyncStatus = 'synced' | 'drifted' | 'conflict' | 'error';

export interface ConfigSyncState {
  id: string;
  projectId: string;
  lastSyncedAt: Date;
  fileHashes: Record<string, string>;
  status: ConfigSyncStatus;
  lastConflictAt?: Date;
  conflictLog: Array<{
    file: string;
    timestamp: Date;
    resolution: 'file-wins' | 'db-wins';
    details?: string;
  }>;
}
