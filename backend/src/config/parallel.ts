/**
 * Parallel Execution Configuration
 *
 * Schema and validation for parallel test execution configuration.
 */

import { ShardingStrategyType } from '../services/sharding/types';

/**
 * Remote worker authentication
 */
export interface RemoteAuthConfig {
  type: 'token' | 'basic' | 'oauth';
  token?: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
}

/**
 * Remote worker configuration
 */
export interface RemoteWorkerConfig {
  /** List of remote worker endpoints */
  endpoints: string[];
  /** Authentication configuration */
  auth?: RemoteAuthConfig;
  /** Connection timeout in milliseconds */
  timeout?: number;
  /** Enable TLS verification */
  tlsVerify?: boolean;
}

/**
 * Sharding configuration
 */
export interface ShardingConfig {
  /** Sharding strategy to use */
  strategy: ShardingStrategyType;
  /** Enable dynamic rebalancing on worker failure */
  rebalance: boolean;
  /** Retry tests on worker failure */
  retryOnWorkerFailure: boolean;
  /** Maximum number of retries per test */
  maxRetries?: number;
  /** Strategy-specific options */
  options?: {
    /** File-based: directory grouping level */
    fileGroupingLevel?: number;
    /** Tag-based: tags to keep together */
    groupTags?: string[];
    /** Tag-based: tags to distribute */
    distributeTags?: string[];
    /** Fail-first: number of shards for failed tests */
    failedTestShards?: number;
  };
}

/**
 * Artifact collection configuration
 */
export interface ArtifactConfig {
  /** Collect trace files */
  collectTraces: boolean;
  /** Collect video recordings */
  collectVideos: boolean;
  /** Collect failure screenshots */
  collectScreenshots: boolean;
  /** Storage type for artifacts */
  storageType: 'local' | 's3' | 'gcs';
  /** Local storage path or bucket name */
  storagePath?: string;
  /** S3/GCS credentials */
  credentials?: {
    accessKey?: string;
    secretKey?: string;
    region?: string;
    bucket?: string;
  };
  /** Artifact retention period in days */
  retentionDays?: number;
}

/**
 * Timeout configuration
 */
export interface TimeoutConfig {
  /** Individual test timeout in milliseconds */
  test: number;
  /** Shard timeout in milliseconds */
  shard: number;
  /** Total execution timeout in milliseconds */
  total: number;
}

/**
 * Main parallel execution configuration
 */
export interface ParallelConfig {
  /** Execution mode */
  mode: 'local' | 'remote';

  /** Worker configuration by mode */
  workers: {
    /** Number of local workers (when mode is 'local') */
    local: number;
    /** Remote worker configuration (when mode is 'remote') */
    remote: RemoteWorkerConfig;
  };

  /** Sharding configuration */
  sharding: ShardingConfig;

  /** Artifact collection configuration */
  artifacts: ArtifactConfig;

  /** Timeout configuration */
  timeout?: TimeoutConfig;

  /** Enable real-time progress updates via WebSocket */
  realTimeUpdates?: boolean;

  /** Browsers to use for execution */
  browsers?: string[];

  /** Run tests in headed mode (for debugging) */
  headed?: boolean;
}

/**
 * Default configuration
 */
export const defaultParallelConfig: ParallelConfig = {
  mode: 'local',
  workers: {
    local: 2,
    remote: {
      endpoints: [],
    },
  },
  sharding: {
    strategy: 'round-robin',
    rebalance: true,
    retryOnWorkerFailure: true,
    maxRetries: 2,
  },
  artifacts: {
    collectTraces: true,
    collectVideos: false,
    collectScreenshots: true,
    storageType: 'local',
    retentionDays: 7,
  },
  timeout: {
    test: 60000, // 1 minute
    shard: 1800000, // 30 minutes
    total: 3600000, // 1 hour
  },
  realTimeUpdates: true,
  browsers: ['chromium'],
  headed: false,
};

/**
 * Validation errors
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate parallel configuration
 */
export function validateParallelConfig(config: Partial<ParallelConfig>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate mode
  if (config.mode && !['local', 'remote'].includes(config.mode)) {
    errors.push({
      field: 'mode',
      message: 'Mode must be one of: local, remote',
    });
  }

  // Validate workers based on mode
  if (config.mode === 'local' && config.workers?.local !== undefined) {
    if (typeof config.workers.local !== 'number' || config.workers.local < 1) {
      errors.push({
        field: 'workers.local',
        message: 'Local worker count must be a positive number',
      });
    }
  }

  if (config.mode === 'remote' && config.workers?.remote) {
    if (!config.workers.remote.endpoints || config.workers.remote.endpoints.length === 0) {
      errors.push({
        field: 'workers.remote.endpoints',
        message: 'At least one remote endpoint is required',
      });
    }

    // Validate endpoint URLs
    for (const endpoint of config.workers.remote.endpoints || []) {
      try {
        new URL(endpoint);
      } catch {
        errors.push({
          field: 'workers.remote.endpoints',
          message: `Invalid endpoint URL: ${endpoint}`,
        });
      }
    }
  }

  // Validate sharding
  if (config.sharding) {
    const validStrategies: ShardingStrategyType[] = [
      'round-robin',
      'duration',
      'file',
      'tag',
      'fail-first',
    ];

    if (config.sharding.strategy && !validStrategies.includes(config.sharding.strategy)) {
      errors.push({
        field: 'sharding.strategy',
        message: `Strategy must be one of: ${validStrategies.join(', ')}`,
      });
    }

    if (config.sharding.maxRetries !== undefined && config.sharding.maxRetries < 0) {
      errors.push({
        field: 'sharding.maxRetries',
        message: 'Max retries must be non-negative',
      });
    }
  }

  // Validate artifacts
  if (config.artifacts) {
    const validStorageTypes = ['local', 's3', 'gcs'];
    if (config.artifacts.storageType && !validStorageTypes.includes(config.artifacts.storageType)) {
      errors.push({
        field: 'artifacts.storageType',
        message: `Storage type must be one of: ${validStorageTypes.join(', ')}`,
      });
    }

    if (config.artifacts.storageType !== 'local' && !config.artifacts.credentials) {
      errors.push({
        field: 'artifacts.credentials',
        message: 'Credentials are required for cloud storage',
      });
    }
  }

  // Validate timeouts
  if (config.timeout) {
    if (config.timeout.test !== undefined && config.timeout.test < 1000) {
      errors.push({
        field: 'timeout.test',
        message: 'Test timeout must be at least 1000ms',
      });
    }

    if (config.timeout.shard !== undefined && config.timeout.shard < config.timeout.test!) {
      errors.push({
        field: 'timeout.shard',
        message: 'Shard timeout must be greater than test timeout',
      });
    }

    if (config.timeout.total !== undefined && config.timeout.total < config.timeout.shard!) {
      errors.push({
        field: 'timeout.total',
        message: 'Total timeout must be greater than shard timeout',
      });
    }
  }

  // Validate browsers
  if (config.browsers) {
    const validBrowsers = ['chromium', 'firefox', 'webkit'];
    for (const browser of config.browsers) {
      if (!validBrowsers.includes(browser)) {
        errors.push({
          field: 'browsers',
          message: `Invalid browser: ${browser}. Must be one of: ${validBrowsers.join(', ')}`,
        });
      }
    }
  }

  return errors;
}

/**
 * Merge configuration with defaults
 */
export function mergeWithDefaults(config: Partial<ParallelConfig>): ParallelConfig {
  return {
    mode: config.mode ?? defaultParallelConfig.mode,
    workers: {
      local: config.workers?.local ?? defaultParallelConfig.workers.local,
      remote: {
        ...defaultParallelConfig.workers.remote,
        ...config.workers?.remote,
      },
    },
    sharding: {
      ...defaultParallelConfig.sharding,
      ...config.sharding,
    },
    artifacts: {
      ...defaultParallelConfig.artifacts,
      ...config.artifacts,
    },
    timeout: config.timeout
      ? {
          ...defaultParallelConfig.timeout!,
          ...config.timeout,
        }
      : defaultParallelConfig.timeout,
    realTimeUpdates: config.realTimeUpdates ?? defaultParallelConfig.realTimeUpdates,
    browsers: config.browsers ?? defaultParallelConfig.browsers,
    headed: config.headed ?? defaultParallelConfig.headed,
  };
}

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnv(): Partial<ParallelConfig> {
  const localWorkers = process.env.PARALLEL_WORKERS
    ? parseInt(process.env.PARALLEL_WORKERS)
    : defaultParallelConfig.workers.local;

  return {
    mode: (process.env.PARALLEL_MODE as 'local' | 'remote') || undefined,
    workers: {
      local: localWorkers,
      remote: {
        endpoints: process.env.REMOTE_ENDPOINTS?.split(',') || [],
      },
    },
    sharding: {
      strategy: (process.env.SHARDING_STRATEGY as ShardingStrategyType) || 'round-robin',
      rebalance: process.env.SHARDING_REBALANCE !== 'false',
      retryOnWorkerFailure: process.env.SHARDING_RETRY !== 'false',
    },
    artifacts: {
      collectTraces: process.env.COLLECT_TRACES !== 'false',
      collectVideos: process.env.COLLECT_VIDEOS === 'true',
      collectScreenshots: process.env.COLLECT_SCREENSHOTS !== 'false',
      storageType: (process.env.ARTIFACT_STORAGE as 'local' | 's3' | 'gcs') || 'local',
      storagePath: process.env.ARTIFACT_PATH,
    },
  };
}
