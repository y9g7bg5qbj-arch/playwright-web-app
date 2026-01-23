/**
 * MongoDB Connection for Vero Test Data
 *
 * Uses MongoDB Atlas for test data storage while keeping
 * Prisma/SQLite for other application data.
 */

import { MongoClient, Db, Collection } from 'mongodb';

// MongoDB Atlas connection string - REQUIRED from environment
const MONGODB_URI: string = (() => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required. Set it in your .env file.');
  }
  return uri;
})();
const DATABASE_NAME = process.env.MONGODB_DATABASE || 'vero_ide';

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Connect to MongoDB Atlas
 */
export async function connectMongoDB(): Promise<Db> {
  if (db) return db;

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DATABASE_NAME);
    console.log('✅ Connected to MongoDB Atlas');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Get the MongoDB database instance
 */
export function getDb(): Db {
  if (!db) {
    throw new Error('MongoDB not connected. Call connectMongoDB() first.');
  }
  return db;
}

/**
 * Get a typed collection
 */
export function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

/**
 * Close MongoDB connection
 */
export async function closeMongoDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}

// Collection names - ALL application data in MongoDB
export const COLLECTIONS = {
  // Core entities
  USERS: 'users',
  APPLICATIONS: 'applications',
  PROJECTS: 'projects',

  // Test authoring
  WORKFLOWS: 'workflows',
  TEST_FLOWS: 'test_flows',
  VERO_FILES: 'vero_files',

  // Test data
  TEST_DATA_SHEETS: 'test_data_sheets',
  TEST_DATA_ROWS: 'test_data_rows',
  TEST_DATA_SAVED_VIEWS: 'test_data_saved_views',
  TEST_DATA_RELATIONSHIPS: 'test_data_relationships',
  DATA_TABLES: 'data_tables',
  DATA_ROWS: 'data_rows',

  // Execution
  EXECUTIONS: 'executions',
  EXECUTION_LOGS: 'execution_logs',
  EXECUTION_STEPS: 'execution_steps',
  RUN_CONFIGURATIONS: 'run_configurations',

  // Recording
  RECORDING_SESSIONS: 'recording_sessions',
  RECORDING_STEPS: 'recording_steps',

  // Scheduling
  SCHEDULES: 'schedules',
  SCHEDULE_RUNS: 'schedule_runs',
  SCHEDULED_TESTS: 'scheduled_tests',
  SCHEDULED_TEST_RUNS: 'scheduled_test_runs',
  SCHEDULE_NOTIFICATIONS: 'schedule_notifications',

  // Variables & Environments
  ENVIRONMENTS: 'environments',
  ENVIRONMENT_VARIABLES: 'environment_variables',
  GLOBAL_VARIABLES: 'global_variables',
  APP_ENVIRONMENTS: 'app_environments',

  // Repository & Page Objects
  OBJECT_REPOSITORIES: 'object_repositories',
  PAGE_OBJECTS: 'page_objects',

  // AI Features
  AI_SETTINGS: 'ai_settings',
  AI_RECORDER_SESSIONS: 'ai_recorder_sessions',
  AI_RECORDER_TEST_CASES: 'ai_recorder_test_cases',
  AI_RECORDER_STEPS: 'ai_recorder_steps',
  COPILOT_SESSIONS: 'copilot_sessions',
  COPILOT_EXPLORATIONS: 'copilot_explorations',
  COPILOT_STAGED_CHANGES: 'copilot_staged_changes',
  COPILOT_LEARNED_SELECTORS: 'copilot_learned_selectors',

  // Collaboration
  SANDBOXES: 'sandboxes',
  PULL_REQUESTS: 'pull_requests',

  // Agents & GitHub
  AGENTS: 'agents',
  GITHUB_INTEGRATIONS: 'github_integrations',
  GITHUB_WORKFLOW_RUNS: 'github_workflow_runs',

  // System
  SETTINGS: 'settings',
  AUDIT_LOGS: 'audit_logs',
  DATA_STORAGE_CONFIGS: 'data_storage_configs',
} as const;

// TypeScript interfaces for MongoDB documents
export interface MongoTestDataSheet {
  _id?: string;
  id: string;
  applicationId: string;
  name: string;
  pageObject?: string;
  description?: string;
  columns: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoTestDataRow {
  _id?: string;
  id: string;
  sheetId: string;
  scenarioId: string;
  data: Record<string, any>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoTestDataSavedView {
  _id?: string;
  id: string;
  sheetId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  filterState: string;
  sortState: string;
  columnState: string;
  groupState: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoTestDataRelationship {
  _id?: string;
  id: string;
  sourceSheetId: string;
  targetSheetId: string;
  name: string;
  sourceColumn: string;
  targetColumn: string;
  displayColumns: string;
  relationshipType: string;
  cascadeDelete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoProject {
  _id?: string;
  id: string;
  applicationId: string;
  name: string;
  description?: string;
  veroPath?: string;
  gitInitialized: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoApplication {
  _id?: string;
  id: string;
  userId: string;
  name: string;
  description?: string;
  baseUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// User model
export interface MongoUser {
  _id?: string;
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

// Workflow model
export interface MongoWorkflow {
  _id?: string;
  id: string;
  applicationId?: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// TestFlow model
export interface MongoTestFlow {
  _id?: string;
  id: string;
  workflowId: string;
  name: string;
  code?: string;
  nodes?: string;
  edges?: string;
  variables?: string;
  dataSource?: string;
  language: string;
  tags: string[];
  timeout?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Execution model
export interface MongoExecution {
  _id?: string;
  id: string;
  testFlowId: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';
  exitCode?: number;
  target: string;
  agentId?: string;
  runConfigurationId?: string;
  configSnapshot?: string;
  triggeredBy: string;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
}

// ExecutionLog model
export interface MongoExecutionLog {
  _id?: string;
  id: string;
  executionId: string;
  message: string;
  level: 'info' | 'warn' | 'error';
  timestamp: Date;
}

// ExecutionStep model
export interface MongoExecutionStep {
  _id?: string;
  id: string;
  executionId: string;
  stepNumber: number;
  action: string;
  description?: string;
  selector?: string;
  selectorName?: string;
  value?: string;
  url?: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  screenshot?: string;
  stepsJson?: string;
  startedAt?: Date;
  finishedAt?: Date;
}

// Agent model
export interface MongoAgent {
  _id?: string;
  id: string;
  userId: string;
  name: string;
  tokenHash: string;
  status: 'online' | 'offline' | 'busy';
  lastSeenAt?: Date;
  systemInfo?: string;
  createdAt: Date;
}

// AISettings model
export interface MongoAISettings {
  _id?: string;
  id: string;
  userId: string;
  provider: 'gemini' | 'openai' | 'anthropic';
  geminiApiKey?: string;
  geminiModel: string;
  openaiApiKey?: string;
  openaiModel: string;
  anthropicApiKey?: string;
  anthropicModel: string;
  browserbaseApiKey?: string;
  useBrowserbase: boolean;
  stagehandHeadless: boolean;
  stagehandDebug: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Schedule model
export interface MongoSchedule {
  _id?: string;
  id: string;
  userId: string;
  workflowId?: string;
  name: string;
  description?: string;
  cronExpression: string;
  timezone: string;
  testSelector: string;
  notificationConfig?: string;
  isActive: boolean;
  webhookToken?: string;
  nextRunAt?: Date;
  lastRunAt?: Date;
  parameters?: string;
  defaultExecutionConfig?: string;
  executionTarget: string;
  githubRepoFullName?: string;
  githubBranch?: string;
  githubWorkflowFile?: string;
  githubInputs?: string;
  createdAt: Date;
  updatedAt: Date;
}

// RunConfiguration model
export interface MongoRunConfiguration {
  _id?: string;
  id: string;
  workflowId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  tags: string[];
  tagMode: 'any' | 'all';
  excludeTags: string[];
  testFlowIds: string[];
  grep?: string;
  environmentId?: string;
  target: 'local' | 'docker' | 'github-actions';
  localConfig?: string;
  dockerConfig?: string;
  githubActionsConfig?: string;
  browser: string;
  browserChannel?: string;
  headless: boolean;
  viewport: string;
  workers: number;
  shardCount: number;
  retries: number;
  timeout: number;
  tracing: string;
  screenshot: string;
  video: string;
  advancedConfig?: string;
  createdAt: Date;
  updatedAt: Date;
}

// RecordingSession model
export interface MongoRecordingSession {
  _id?: string;
  id: string;
  testFlowId?: string;
  userId: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  startUrl: string;
  scenarioName?: string;
  pageName?: string;
  veroCode?: string;
  errorMessage?: string;
  browserPid?: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// RecordingStep model
export interface MongoRecordingStep {
  _id?: string;
  id: string;
  sessionId: string;
  stepNumber: number;
  actionType: string;
  veroCode: string;
  primarySelector: string;
  selectorType: string;
  fallbackSelectors?: string;
  confidence: number;
  isStable: boolean;
  value?: string;
  url: string;
  pageName?: string;
  fieldName?: string;
  screenshotPath?: string;
  elementTag?: string;
  elementText?: string;
  boundingBox?: string;
  createdAt: Date;
}

// Sandbox model
export interface MongoSandbox {
  _id?: string;
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  projectId: string;
  sourceBranch: string;
  folderPath: string;
  status: 'active' | 'merged' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt?: Date;
}

// PullRequest model
export interface MongoPullRequest {
  _id?: string;
  id: string;
  number: number;
  title: string;
  description?: string;
  authorId: string;
  sandboxId: string;
  projectId: string;
  targetBranch: string;
  status: 'draft' | 'open' | 'approved' | 'merged' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  mergedAt?: Date;
  mergedById?: string;
  closedAt?: Date;
}

// AI Recorder Session model
export interface MongoAIRecorderSession {
  _id?: string;
  id: string;
  userId: string;
  applicationId?: string;
  status: 'pending' | 'processing' | 'human_review' | 'complete' | 'failed' | 'cancelled';
  environment: string;
  baseUrl?: string;
  headless: boolean;
  totalTests: number;
  completedTests: number;
  failedTests: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// AI Recorder Test Case model
export interface MongoAIRecorderTestCase {
  _id?: string;
  id: string;
  sessionId: string;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'stuck' | 'manual_recording' | 'partially_complete' | 'human_review' | 'approved' | 'complete' | 'failed';
  order: number;
  veroCode?: string;
  targetUrl?: string;
  retryCount: number;
  stuckAtStep?: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// AI Recorder Step model
export interface MongoAIRecorderStep {
  _id?: string;
  id: string;
  testCaseId: string;
  stepNumber: number;
  description: string;
  stepType: 'navigate' | 'fill' | 'click' | 'assert' | 'loop' | 'wait';
  veroCode?: string;
  selector?: string;
  selectorType?: 'testid' | 'role' | 'label' | 'text' | 'css' | 'xpath';
  value?: string;
  status: 'pending' | 'running' | 'retrying' | 'success' | 'stuck' | 'resolved' | 'captured' | 'manual' | 'skipped';
  retryCount: number;
  maxRetries: number;
  confidence: number;
  screenshotPath?: string;
  errorMessage?: string;
  suggestions?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// ScheduledTest model
export interface MongoScheduledTest {
  _id?: string;
  id: string;
  projectId: string;
  userId: string;
  name: string;
  description?: string;
  testPattern: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  config?: string;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ScheduledTestRun model
export interface MongoScheduledTestRun {
  _id?: string;
  id: string;
  scheduleId: string;
  triggeredBy: 'schedule' | 'manual' | 'api' | 'webhook';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  executionId?: string;
  results?: string;
  errorMessage?: string;
  createdAt: Date;
}

// ScheduleNotification model
export interface MongoScheduleNotification {
  _id?: string;
  id: string;
  scheduleId: string;
  type: 'email' | 'slack' | 'webhook';
  config: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// CopilotSession model
export interface MongoCopilotSession {
  _id?: string;
  id: string;
  userId: string;
  applicationId?: string;
  projectId?: string;
  title: string;
  status: 'active' | 'idle' | 'planning' | 'exploring' | 'writing' | 'reviewing' | 'completed' | 'failed' | 'cancelled';
  contextSummary?: string;
  goalStatement?: string;
  targetFiles?: string;
  messagesJson?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// CopilotExploration model
export interface MongoCopilotExploration {
  _id?: string;
  id: string;
  sessionId: string;
  type: 'codebase_analysis' | 'pattern_discovery' | 'dependency_mapping' | 'test_coverage' | 'custom';
  query: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  findings?: string;
  relevantFiles?: string;
  suggestedActions?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// CopilotStagedChange model
export interface MongoCopilotStagedChange {
  _id?: string;
  id: string;
  sessionId: string;
  explorationId?: string;
  filePath: string;
  changeType: 'create' | 'modify' | 'delete';
  description: string;
  originalContent?: string;
  proposedContent?: string;
  diffContent?: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'reverted';
  approvedBy?: string;
  appliedAt?: Date;
  revertedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// CopilotLearnedSelector model
export interface MongoCopilotLearnedSelector {
  _id?: string;
  id: string;
  projectId: string;
  elementDescription: string;
  selector: string;
  selectorType: string;
  confidence: number;
  usageCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// DataStorageConfig model
export interface MongoDataStorageConfig {
  _id?: string;
  id: string;
  applicationId: string;
  provider: string;
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  useSSL: boolean;
  options?: string;
  isActive: boolean;
  lastTestedAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

// DataTable model (workflow-scoped test data)
export interface MongoDataTable {
  _id?: string;
  id: string;
  workflowId: string;
  name: string;
  description?: string;
  columns: any[]; // Stored as object array in MongoDB
  createdAt: Date;
  updatedAt: Date;
}

// DataRow model
export interface MongoDataRow {
  _id?: string;
  id: string;
  tableId: string;
  data: Record<string, any>; // Stored as object in MongoDB
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// ObjectRepository model - container for page objects in a workflow
export interface MongoObjectRepository {
  _id?: string;
  id: string;
  workflowId: string;
  name: string;
  description?: string;
  globalElements?: any[];
  createdAt: Date;
  updatedAt: Date;
}

// PageObject model - represents a page with elements
export interface MongoPageObject {
  _id?: string;
  id: string;
  repositoryId: string;
  name: string;
  description?: string;
  urlPattern?: string;
  baseUrl?: string;
  elements: any[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
