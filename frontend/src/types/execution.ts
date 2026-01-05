/**
 * Execution Configuration Types for Vero Test Automation IDE
 * Defines types for parallel execution, workers, sharding, and remote execution
 */

// =============================================================================
// Execution Mode Types
// =============================================================================

export type ExecutionMode = 'local' | 'docker' | 'remote';

export type BrowserType = 'chromium' | 'firefox' | 'webkit';

export type ShardingStrategy =
  | 'round-robin'
  | 'by-file'
  | 'by-test'
  | 'by-tag'
  | 'custom';

export type ArtifactType = 'trace' | 'video' | 'screenshot';

// =============================================================================
// Parallel Configuration
// =============================================================================

export interface ParallelConfig {
  mode: ExecutionMode;
  workerCount: number;
  maxRetries: number;
  timeout: number;
  browsers: BrowserType[];
  sharding: ShardingConfig;
  artifacts: ArtifactConfig;
  remote?: RemoteConfig;
  docker?: DockerConfig;
}

export interface ShardingConfig {
  enabled: boolean;
  strategy: ShardingStrategy;
  shardCount: number;
  customRules?: ShardingRule[];
  tagFilters?: string[];
  excludePatterns?: string[];
}

export interface ShardingRule {
  id: string;
  name: string;
  pattern: string;
  shardIndex: number;
  priority: number;
}

export interface ArtifactConfig {
  traces: 'always' | 'on-failure' | 'never';
  videos: 'always' | 'on-failure' | 'never';
  screenshots: 'always' | 'on-failure' | 'never';
  retentionDays: number;
}

export interface DockerConfig {
  enabled: boolean;
  image: string;
  network?: string;
  volumes?: string[];
  environment?: Record<string, string>;
  scaleMin: number;
  scaleMax: number;
}

// =============================================================================
// Remote Execution
// =============================================================================

export interface RemoteConfig {
  endpoints: RemoteEndpoint[];
  defaultEndpoint?: string;
  loadBalancing: 'round-robin' | 'least-connections' | 'random';
}

export interface RemoteEndpoint {
  id: string;
  name: string;
  url: string;
  status: RemoteEndpointStatus;
  browsers: BrowserType[];
  workerCapacity: number;
  activeWorkers: number;
  auth?: RemoteAuth;
  ssl?: SSLConfig;
  latency?: number;
  lastConnected?: string;
}

export type RemoteEndpointStatus = 'connected' | 'disconnected' | 'error' | 'connecting';

export interface RemoteAuth {
  type: 'none' | 'basic' | 'token' | 'oauth';
  username?: string;
  password?: string;
  token?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface SSLConfig {
  enabled: boolean;
  rejectUnauthorized: boolean;
  certPath?: string;
  keyPath?: string;
  caPath?: string;
}

// =============================================================================
// Worker Types
// =============================================================================

export type WorkerStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'error'
  | 'disconnected'
  | 'connecting';

export interface Worker {
  id: string;
  index: number;
  status: WorkerStatus;
  browser: BrowserType;
  currentTest?: TestInfo;
  testsCompleted: number;
  testsPassed: number;
  testsFailed: number;
  startTime?: string;
  metrics?: WorkerMetrics;
  endpoint?: string;
  shardIndex?: number;
}

export interface WorkerMetrics {
  cpuUsage?: number;
  memoryUsage?: number;
  networkLatency?: number;
  avgTestDuration?: number;
}

export interface TestInfo {
  id: string;
  name: string;
  file: string;
  startTime: string;
  duration?: number;
}

// =============================================================================
// Execution State
// =============================================================================

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ExecutionState {
  id: string;
  status: ExecutionStatus;
  progress: ExecutionProgress;
  workers: Worker[];
  results: TestResult[];
  startTime?: string;
  endTime?: string;
  config: ParallelConfig;
  errors: ExecutionError[];
}

export interface ExecutionProgress {
  total: number;
  completed: number;
  passed: number;
  failed: number;
  skipped: number;
  remaining: number;
  estimatedTimeRemaining?: number;
  currentRate?: number;
}

export interface TestResult {
  id: string;
  testId: string;
  testName: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  workerId: string;
  shardIndex?: number;
  error?: TestError;
  artifacts?: TestArtifacts;
  timestamp: string;
}

export interface TestError {
  message: string;
  stack?: string;
  screenshot?: string;
  expected?: string;
  actual?: string;
}

export interface TestArtifacts {
  trace?: string;
  video?: string;
  screenshots?: string[];
}

export interface ExecutionError {
  timestamp: string;
  message: string;
  type: 'worker' | 'network' | 'test' | 'system';
  workerId?: string;
  testId?: string;
  recoverable: boolean;
}

// =============================================================================
// Preset Types
// =============================================================================

export interface ExecutionPreset {
  id: string;
  name: string;
  description?: string;
  config: ParallelConfig;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Shard Distribution Preview
// =============================================================================

export interface ShardDistribution {
  shardIndex: number;
  tests: ShardTest[];
  estimatedDuration: number;
  testCount: number;
}

export interface ShardTest {
  id: string;
  name: string;
  file: string;
  estimatedDuration?: number;
  tags?: string[];
}

// =============================================================================
// WebSocket Events
// =============================================================================

export interface WorkerUpdateEvent {
  workerId: string;
  status: WorkerStatus;
  currentTest?: TestInfo;
  metrics?: WorkerMetrics;
}

export interface TestResultEvent {
  result: TestResult;
}

export interface ExecutionProgressEvent {
  executionId: string;
  progress: ExecutionProgress;
}

export interface ExecutionCompleteEvent {
  executionId: string;
  status: 'completed' | 'failed' | 'cancelled';
  summary: ExecutionProgress;
  duration: number;
}
