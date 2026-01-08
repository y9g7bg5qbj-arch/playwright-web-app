/**
 * Sharding Types
 *
 * Type definitions for the test sharding and distribution system.
 */

/**
 * Represents a test file to be executed
 */
export interface TestFile {
  id: string;
  path: string;
  name: string;
  estimatedDuration?: number; // milliseconds
  lastRunDuration?: number; // milliseconds
  lastRunStatus?: 'passed' | 'failed' | 'skipped';
  tags?: string[];
  priority?: number;
  dependencies?: string[]; // other test file IDs that must run first
}

/**
 * Test allocation to a specific worker
 */
export interface TestAllocation {
  workerId: string;
  shardIndex: number;
  totalShards: number;
  tests: TestFile[];
  estimatedDuration: number;
  priority: number;
}

/**
 * Worker capabilities
 */
export interface WorkerCapabilities {
  browsers: string[];
  maxConcurrent: number;
  tags?: string[];
  memory?: number; // MB
  cpu?: number; // cores
}

/**
 * Worker status
 */
export type WorkerStatus = 'idle' | 'busy' | 'offline' | 'error';

/**
 * Registered worker
 */
export interface Worker {
  id: string;
  name: string;
  type: 'local' | 'remote';
  host: string;
  port: number;
  capabilities: WorkerCapabilities;
  status: WorkerStatus;
  currentTests?: string[];
  lastHeartbeat?: Date;
  registeredAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Test result from worker
 */
export interface TestResult {
  testId: string;
  testPath: string;
  testName: string;
  workerId: string;
  shardIndex: number;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  duration: number;
  error?: string;
  errorStack?: string;
  retryCount?: number;
  screenshots?: string[];
  traceUrl?: string;
  videoUrl?: string;
  annotations?: Array<{ type: string; description: string }>;
  startedAt: Date;
  finishedAt: Date;
}

/**
 * Execution progress
 */
export interface ExecutionProgress {
  total: number;
  completed: number;
  passed: number;
  failed: number;
  skipped: number;
  running: number;
  pending: number;
  percentage: number;
}

/**
 * Shard execution status
 */
export interface ShardStatus {
  shardId: string;
  shardIndex: number;
  totalShards: number;
  workerId: string;
  workerName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: ExecutionProgress;
  currentTest?: string;
  startedAt?: Date;
  finishedAt?: Date;
  results: TestResult[];
}

/**
 * Aggregated execution results
 */
export interface AggregatedResults {
  sessionId: string;
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
  progress: ExecutionProgress;
  shards: ShardStatus[];
  duration: number;
  startedAt: Date;
  finishedAt?: Date;
  reportUrl?: string;
}

/**
 * Execution session
 */
export interface ExecutionSession {
  id: string;
  testFiles: TestFile[];
  allocations: TestAllocation[];
  config: ParallelExecutionConfig;
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
  progress: ExecutionProgress;
  shards: Map<string, ShardStatus>;
  results: TestResult[];
  startedAt: Date;
  finishedAt?: Date;
}

/**
 * Parallel execution configuration
 */
export interface ParallelExecutionConfig {
  mode: 'local' | 'remote';
  workers: {
    local: number;
    remote: {
      endpoints: string[];
      auth?: AuthConfig;
    };
  };
  sharding: {
    strategy: ShardingStrategyType;
    rebalance: boolean;
    retryOnWorkerFailure: boolean;
    maxRetries?: number;
  };
  artifacts: {
    collectTraces: boolean;
    collectVideos: boolean;
    collectScreenshots: boolean;
    storageType: 'local' | 's3' | 'gcs';
    storagePath?: string;
  };
  timeout?: {
    test: number;
    shard: number;
    total: number;
  };
}

/**
 * Authentication configuration for remote workers
 */
export interface AuthConfig {
  type: 'token' | 'basic' | 'oauth';
  token?: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
}

/**
 * Sharding strategy types
 */
export type ShardingStrategyType =
  | 'round-robin'
  | 'duration'
  | 'file'
  | 'tag'
  | 'fail-first';

/**
 * Sharding strategy interface
 */
export interface ShardingStrategy {
  name: string;
  type: ShardingStrategyType;
  distribute(tests: TestFile[], workerCount: number): TestAllocation[];
}

/**
 * Historical test data for duration-based sharding
 */
export interface TestHistory {
  testId: string;
  testPath: string;
  runs: Array<{
    duration: number;
    status: 'passed' | 'failed' | 'skipped';
    timestamp: Date;
  }>;
  averageDuration: number;
  failureRate: number;
}

/**
 * Test history storage interface
 */
export interface TestHistoryStore {
  get(testId: string): Promise<TestHistory | null>;
  set(testId: string, history: TestHistory): Promise<void>;
  getAll(): Promise<TestHistory[]>;
  updateFromResult(result: TestResult): Promise<void>;
}
