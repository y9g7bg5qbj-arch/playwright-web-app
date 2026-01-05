// User Types
export interface User {
  id: string;
  email: string;
  name?: string;
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

export interface Execution {
  id: string;
  testFlowId: string;
  status: ExecutionStatus;
  exitCode?: number;
  target: ExecutionTarget;
  agentId?: string;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  logs?: ExecutionLog[];
  steps?: ExecutionStep[];
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
};

export type ServerToClientEvents = {
  'recording:ready': (data: { testFlowId: string; executionId: string }) => void;
  'recording:complete': (data: { testFlowId: string; executionId: string; success: boolean; code?: string; message?: string }) => void;
  'execution:log': (data: { executionId: string; message: string; level: 'info' | 'warn' | 'error' }) => void;
  'execution:complete': (data: { executionId: string; exitCode: number; duration: number; traceUrl?: string }) => void;
  'execution:screenshot': (data: { executionId: string; stepNumber: number; imageData: string }) => void;
  'agent:status': (data: { agentId: string; status: AgentStatus }) => void;
  'error': (data: { message: string; executionId?: string }) => void;
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

export type ScheduleTriggerType = 'scheduled' | 'webhook' | 'manual';
export type ScheduleRunStatus = 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';

// Test selector configuration for scheduled runs
export interface TestSelector {
  tags?: string[];        // e.g., ['@smoke', '@critical']
  folders?: string[];     // e.g., ['/tests/auth/**']
  patterns?: string[];    // e.g., ['*.login.*']
  testFlowIds?: string[]; // Specific flow IDs to run
}

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
}

// Request to trigger a run with parameters
export interface ScheduleTriggerRequest {
  parameterValues?: ScheduleParameterValues;
  executionConfig?: Partial<ScheduleExecutionConfig>;
}

// Schedule entity
export interface Schedule {
  id: string;
  userId: string;
  workflowId?: string;
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
  // Parameter system
  parameters?: ScheduleParameterDefinition[];
  defaultExecutionConfig?: ScheduleExecutionConfig;
}

export interface ScheduleCreate {
  workflowId?: string;
  name: string;
  description?: string;
  cronExpression: string;
  timezone?: string;
  testSelector?: TestSelector;
  notificationConfig?: ScheduleNotificationConfig;
  isActive?: boolean;
  // Parameter system
  parameters?: ScheduleParameterDefinition[];
  defaultExecutionConfig?: ScheduleExecutionConfig;
}

export interface ScheduleUpdate {
  name?: string;
  description?: string;
  cronExpression?: string;
  timezone?: string;
  testSelector?: TestSelector;
  notificationConfig?: ScheduleNotificationConfig;
  isActive?: boolean;
  // Parameter system
  parameters?: ScheduleParameterDefinition[];
  defaultExecutionConfig?: ScheduleExecutionConfig;
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
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  testResults?: ScheduleTestResult[];
  // Parameter system - what was used for this run
  parameterValues?: ScheduleParameterValues;
  executionConfig?: ScheduleExecutionConfig;
  triggeredBy?: string;  // User email or "system" for cron
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
