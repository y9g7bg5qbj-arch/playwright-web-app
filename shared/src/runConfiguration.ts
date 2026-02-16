/**
 * Run Configuration Types
 * Types for managing test execution configurations
 */

// ============================================
// EXECUTION TARGET
// ============================================

export type ExecutionTarget = 'local' | 'docker' | 'github-actions';

export type RunnerType = 'cloud-hosted' | 'self-hosted';

export type BrowserType = 'chromium' | 'firefox' | 'webkit';

export type BrowserChannel = 'chrome' | 'chrome-beta' | 'msedge' | 'msedge-beta' | 'msedge-dev';

export type ArtifactMode = 'on' | 'off' | 'on-failure' | 'on-first-retry' | 'retain-on-failure';

export type TagMatchMode = 'any' | 'all';

export type ShardingStrategy = 'round-robin' | 'by-file' | 'by-test' | 'by-tag' | 'by-duration';

export type ColorScheme = 'light' | 'dark' | 'no-preference';

export type ReducedMotion = 'reduce' | 'no-preference';

export type ReporterType = 'html' | 'json' | 'junit' | 'github' | 'allure' | 'list' | 'dot' | 'line';

/**
 * Normalizes loosely-typed execution target input to a supported value.
 * Accepts legacy aliases to remain backward-compatible across frontend stores.
 */
export function normalizeExecutionTarget(
  target: string | null | undefined,
  fallback: ExecutionTarget = 'local'
): ExecutionTarget {
  const normalized = (target || '').trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (normalized === 'local') return 'local';
  if (normalized === 'github-actions' || normalized === 'github' || normalized === 'gha') return 'github-actions';
  if (normalized === 'docker') return 'docker';
  if (normalized === 'remote') return 'local';
  return fallback;
}

// ============================================
// DEVICE EMULATION
// ============================================

export interface DeviceDescriptor {
  name: string;
  userAgent: string;
  viewport: Viewport;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  defaultBrowserType: BrowserType;
}

// Common device presets
export const DEVICE_PRESETS: Record<string, DeviceDescriptor> = {
  'Desktop Chrome': {
    name: 'Desktop Chrome',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    defaultBrowserType: 'chromium',
  },
  'Desktop Firefox': {
    name: 'Desktop Firefox',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    defaultBrowserType: 'firefox',
  },
  'iPhone 14': {
    name: 'iPhone 14',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    defaultBrowserType: 'webkit',
  },
  'iPhone 14 Pro Max': {
    name: 'iPhone 14 Pro Max',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    defaultBrowserType: 'webkit',
  },
  'Pixel 7': {
    name: 'Pixel 7',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    defaultBrowserType: 'chromium',
  },
  'Galaxy S23': {
    name: 'Galaxy S23',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    defaultBrowserType: 'chromium',
  },
  'iPad Pro 11': {
    name: 'iPad Pro 11',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 834, height: 1194 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    defaultBrowserType: 'webkit',
  },
  'iPad Mini': {
    name: 'iPad Mini',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 768, height: 1024 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    defaultBrowserType: 'webkit',
  },
};

// Viewport presets
export const VIEWPORT_PRESETS: Record<string, Viewport> = {
  'Desktop (1920×1080)': { width: 1920, height: 1080 },
  'Desktop (1280×720)': { width: 1280, height: 720 },
  'Laptop (1366×768)': { width: 1366, height: 768 },
  'Tablet Landscape': { width: 1024, height: 768 },
  'Tablet Portrait': { width: 768, height: 1024 },
  'Mobile Large': { width: 428, height: 926 },
  'Mobile Medium': { width: 390, height: 844 },
  'Mobile Small': { width: 375, height: 667 },
};

// ============================================
// EXECUTION ENVIRONMENT
// ============================================

export interface ExecutionEnvironment {
  id: string;
  workflowId: string;
  name: string;
  slug: string;
  baseUrl: string;
  description?: string;
  variables: Record<string, string>;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionEnvironmentCreate {
  name: string;
  slug: string;
  baseUrl: string;
  description?: string;
  variables?: Record<string, string>;
  isDefault?: boolean;
}

export interface ExecutionEnvironmentUpdate {
  name?: string;
  slug?: string;
  baseUrl?: string;
  description?: string;
  variables?: Record<string, string>;
  isDefault?: boolean;
}

// ============================================
// REMOTE RUNNER
// ============================================

export type AuthType = 'ssh-key' | 'token' | 'basic';

export interface RemoteRunner {
  id: string;
  workflowId: string;
  name: string;
  host: string;
  port: number;
  authType: AuthType;
  credentialId?: string;
  dockerImage?: string;
  maxWorkers: number;
  isHealthy: boolean;
  lastPingAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RemoteRunnerCreate {
  name: string;
  host: string;
  port?: number;
  authType?: AuthType;
  credentialId?: string;
  dockerImage?: string;
  maxWorkers?: number;
}

export interface RemoteRunnerUpdate {
  name?: string;
  host?: string;
  port?: number;
  authType?: AuthType;
  credentialId?: string;
  dockerImage?: string;
  maxWorkers?: number;
}

// ============================================
// STORED CREDENTIALS
// ============================================

export type CredentialType = 'ssh-key' | 'token' | 'basic' | 'docker-registry';

export interface StoredCredential {
  id: string;
  workflowId: string;
  name: string;
  type: CredentialType;
  createdAt: string;
  updatedAt: string;
  // Note: encryptedValue is never sent to frontend
}

export interface StoredCredentialCreate {
  name: string;
  type: CredentialType;
  value: string; // Will be encrypted on backend
}

// ============================================
// RUN CONFIGURATION
// ============================================

export interface Viewport {
  width: number;
  height: number;
}

export interface Geolocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface TimeoutConfig {
  global: number;        // Overall test timeout
  action: number;        // click, fill, etc.
  navigation: number;    // goto, reload
  expect: number;        // assertions
}

export interface ShardingConfig {
  enabled: boolean;
  count: number;
  strategy: ShardingStrategy;
}

export interface BrowserConfig {
  type: BrowserType;
  headless: boolean;
  viewport: Viewport;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  // Device emulation
  deviceName?: string;
  userAgent?: string;
  // Advanced options
  ignoreHTTPSErrors?: boolean;
  bypassCSP?: boolean;
  javaScriptEnabled?: boolean;
  acceptDownloads?: boolean;
  locale?: string;
  timezoneId?: string;
  geolocation?: Geolocation;
  colorScheme?: ColorScheme;
  reducedMotion?: ReducedMotion;
  extraHTTPHeaders?: Record<string, string>;
  storageState?: string;
}

export interface DockerShardConfig {
  image: string;
  network?: string;
  volumes?: string[];
  environment?: Record<string, string>;
  scaleMin: number;
  scaleMax: number;
  keepContainers?: boolean;
  autoPullImage?: boolean;
}

// ============================================
// GITHUB ACTIONS CONFIGURATION
// ============================================

export interface GitHubActionsConfig {
  runnerType: RunnerType;
  shardCount: number;           // Number of parallel jobs (1-20 for cloud, unlimited for self-hosted)
  workersPerShard: number;      // Workers per job (1-4 recommended)
  runnerLabels?: string[];      // For self-hosted: ['self-hosted', 'linux', 'x64']
  timeoutMinutes?: number;      // Job timeout (default: 60)
  continueOnError?: boolean;    // Continue other shards if one fails
}

export interface LocalExecutionConfig {
  workers: number;  // 1-8
}

export interface DockerExecutionConfig {
  shardCount: number;           // 1-8
  memory: '1G' | '2G' | '4G' | '8G';
  cpus: '0.5' | '1.0' | '2.0' | '4.0';
}

// ============================================
// GITHUB INTEGRATION
// ============================================

export interface GitHubIntegration {
  id: string;
  userId: string;
  accessToken?: string;         // Encrypted, never sent to frontend
  tokenType: 'oauth' | 'pat';
  scope: string;                // 'repo,workflow'
  login: string;                // GitHub username
  avatarUrl?: string;
  isValid: boolean;
  lastValidatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubRepository {
  id: number;
  fullName: string;             // 'owner/repo'
  name: string;
  owner: string;
  defaultBranch: string;
  private: boolean;
  htmlUrl: string;
}

export interface GitHubWorkflowTrigger {
  configurationId: string;
  repository: string;           // 'owner/repo'
  ref?: string;                 // Branch or tag, defaults to default branch
  inputs?: Record<string, string>;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
  htmlUrl: string;
  runNumber: number;
  event: string;
  createdAt: string;
  updatedAt: string;
  jobs?: GitHubWorkflowJob[];
}

export interface GitHubWorkflowJob {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  steps?: GitHubWorkflowStep[];
}

export interface GitHubWorkflowStep {
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'skipped';
  number: number;
  startedAt?: string;
  completedAt?: string;
}

export interface GitHubArtifact {
  id: number;
  name: string;
  sizeInBytes: number;
  expired: boolean;
  createdAt: string;
  expiresAt: string;
  downloadUrl?: string;
}

export interface ReporterConfig {
  html: boolean;
  json: boolean;
  junit: boolean;
  github: boolean;
  allure: boolean;
  list: boolean;
}

export interface NotificationConfig {
  slackWebhook?: string;
  slackChannel?: string;
  webhookUrl?: string;
  emailOnFailure?: string[];
  updateGitHubPR?: boolean;
}

export interface DebugConfig {
  slowMo?: number;           // Milliseconds between actions
  pauseOnFailure?: boolean;  // Pause test on failure for debugging
  enableInspector?: boolean; // Enable Playwright Inspector
  preserveOutput?: boolean;  // Keep output on pass
}

export interface AdvancedConfig {
  reporters: ReporterConfig;
  notifications: NotificationConfig;
  debug: DebugConfig;
  fullyParallel?: boolean;   // Run tests within files in parallel
  forbidOnly?: boolean;      // Fail if test.only is present
  maxFailures?: number;      // Stop after N failures (0 = no limit)
  grep?: string;             // Filter tests by title pattern
  grepInvert?: string;       // Exclude tests matching pattern
  outputDir?: string;        // Directory for artifacts
  retentionDays?: number;    // How long to keep artifacts
}

export interface RunConfiguration {
  id: string;
  workflowId: string;
  projectId?: string;
  name: string;
  description?: string;
  isDefault: boolean;

  // Test Filters
  tags: string[];
  tagMode: TagMatchMode;
  excludeTags: string[];
  testFlowIds: string[];
  grep?: string;              // Filter tests by title pattern
  tagExpression?: string;     // Cucumber-style expression for scenario tags
  namePatterns?: string[];    // Scenario name regex filters

  // Environment
  environmentId?: string;
  environment?: ExecutionEnvironment;

  // Execution Target
  target: ExecutionTarget;

  // Target-specific configs (only one will be set based on target)
  localConfig?: LocalExecutionConfig;
  dockerConfig?: DockerExecutionConfig;
  githubActionsConfig?: GitHubActionsConfig;

  // Legacy fields for backward compat (deprecated, use target-specific configs)
  remoteRunnerId?: string;
  remoteRunner?: RemoteRunner;

  // Browser Settings
  browser: BrowserType;
  browserChannel?: BrowserChannel;  // 'chrome', 'msedge', etc.
  headless: boolean;
  viewport: Viewport;
  // Extended browser config
  browserConfig?: BrowserConfig;

  // Parallel Execution (legacy, use target-specific configs)
  workers: number;
  shardCount: number;
  shardingConfig?: ShardingConfig;

  // Retry & Timeout
  retries: number;
  timeout: number;
  timeoutConfig?: TimeoutConfig;

  // Artifacts
  tracing: ArtifactMode;
  screenshot: ArtifactMode;
  video: ArtifactMode;

  // Advanced options
  advancedConfig?: AdvancedConfig;

  // Visual Snapshot Testing
  visualPreset?: 'strict' | 'balanced' | 'relaxed' | 'custom';
  visualThreshold?: number;
  visualMaxDiffPixels?: number;
  visualMaxDiffPixelRatio?: number;
  visualUpdateSnapshots?: boolean;

  // Scenario selection scope
  selectionScope?: 'active-file' | 'current-sandbox';

  // Custom environment variables (override environment manager vars)
  envVars?: Record<string, string>;

  // Run parameters linkage
  parameterSetId?: string;
  parameterOverrides?: Record<string, string | number | boolean>;

  // GitHub Actions specific
  githubRepository?: string;    // 'owner/repo' for GitHub Actions target
  githubWorkflowPath?: string;  // Path to workflow file

  // Runtime config — frontend-specific fields stored as JSON
  runtimeConfig?: RunConfigRuntimeFields;

  createdAt: string;
  updatedAt: string;
}

/**
 * Frontend-specific runtime fields that don't map directly to Playwright CLI args.
 * Stored as a JSON blob in the DB to avoid schema bloat.
 */
export interface RunConfigRuntimeFields {
  headed?: boolean;
  debug?: boolean;
  ui?: boolean;
  lastFailed?: boolean;
  globalTimeout?: number;
  grepInvert?: string;
  baseURL?: string;
  reporter?: string[];
  outputDir?: string;
  locale?: string;
  timezoneId?: string;
  geolocation?: { latitude: number; longitude: number };
  lastUsedAt?: string;
  // GitHub metadata that does not have dedicated top-level fields
  githubBranch?: string;
  githubInputs?: Record<string, string>;
  // Backward-compat snapshot used when migrating legacy schedules
  legacyScheduleMigration?: {
    scheduleId: string;
    executionTarget?: string;
    testSelector?: Record<string, unknown>;
    parameters?: Array<Record<string, unknown>>;
    defaultExecutionConfig?: Record<string, unknown>;
    githubConfig?: Record<string, unknown>;
  };
}

export interface RunConfigurationCreate {
  projectId?: string;
  name: string;
  description?: string;
  isDefault?: boolean;

  // Test Filters
  tags?: string[];
  tagMode?: TagMatchMode;
  excludeTags?: string[];
  testFlowIds?: string[];
  grep?: string;
  tagExpression?: string;
  namePatterns?: string[];

  // Environment
  environmentId?: string;

  // Execution Target
  target?: ExecutionTarget;

  // Target-specific configs
  localConfig?: LocalExecutionConfig;
  dockerConfig?: DockerExecutionConfig;
  githubActionsConfig?: GitHubActionsConfig;

  // Legacy (deprecated)
  remoteRunnerId?: string;

  // Browser Settings
  browser?: BrowserType;
  browserChannel?: BrowserChannel;
  headless?: boolean;
  viewport?: Viewport;
  browserConfig?: BrowserConfig;

  // Parallel Execution (legacy)
  workers?: number;
  shardCount?: number;
  shardingConfig?: ShardingConfig;

  // Retry & Timeout
  retries?: number;
  timeout?: number;
  timeoutConfig?: TimeoutConfig;

  // Artifacts
  tracing?: ArtifactMode;
  screenshot?: ArtifactMode;
  video?: ArtifactMode;

  // Advanced options
  advancedConfig?: AdvancedConfig;

  // Visual Snapshot Testing
  visualPreset?: 'strict' | 'balanced' | 'relaxed' | 'custom';
  visualThreshold?: number;
  visualMaxDiffPixels?: number;
  visualMaxDiffPixelRatio?: number;
  visualUpdateSnapshots?: boolean;

  // Scenario selection scope
  selectionScope?: 'active-file' | 'current-sandbox';

  // Custom environment variables
  envVars?: Record<string, string>;

  // Run parameters linkage
  parameterSetId?: string;
  parameterOverrides?: Record<string, string | number | boolean>;

  // GitHub Actions specific
  githubRepository?: string;
  githubWorkflowPath?: string;

  // Runtime config
  runtimeConfig?: RunConfigRuntimeFields;
}

export interface RunConfigurationUpdate extends Partial<RunConfigurationCreate> {}

// ============================================
// QUICK RUN (Ad-hoc execution)
// ============================================

export interface QuickRunRequest {
  // What to run
  testFlowIds?: string[];
  tags?: string[];
  tagMode?: TagMatchMode;
  excludeTags?: string[];
  tagExpression?: string;
  namePatterns?: string[];

  // Where to run
  environmentId?: string;
  environmentVariables?: Record<string, string>;

  // How to run
  target: ExecutionTarget;
  remoteRunnerId?: string;
  browser: BrowserType;
  headless: boolean;
  workers: number;
  retries: number;
  timeout: number;

  // Artifacts
  tracing: ArtifactMode;
  screenshot: ArtifactMode;
  video: ArtifactMode;
}

// ============================================
// CONFIGURATION RUN REQUEST
// ============================================

export interface ConfigurationRunRequest {
  configurationId: string;
  overrides?: Partial<QuickRunRequest>;
}

// ============================================
// DEFAULT VALUES
// ============================================

export const DEFAULT_VIEWPORT: Viewport = {
  width: 1280,
  height: 720,
};

export const DEFAULT_RUN_CONFIGURATION: Omit<RunConfiguration, 'id' | 'workflowId' | 'name' | 'createdAt' | 'updatedAt'> = {
  description: undefined,
  isDefault: false,
  tags: [],
  tagMode: 'any',
  excludeTags: [],
  testFlowIds: [],
  grep: undefined,
  tagExpression: undefined,
  namePatterns: [],
  environmentId: undefined,
  target: 'local',
  localConfig: { workers: 1 },
  dockerConfig: undefined,
  githubActionsConfig: undefined,
  remoteRunnerId: undefined,
  browser: 'chromium',
  browserChannel: undefined,
  headless: true,
  viewport: DEFAULT_VIEWPORT,
  workers: 1,
  shardCount: 1,
  retries: 0,
  timeout: 30000,
  tracing: 'on-failure',
  screenshot: 'on-failure',
  video: 'off',
  githubRepository: undefined,
  githubWorkflowPath: undefined,
};

export const DEFAULT_QUICK_RUN: QuickRunRequest = {
  testFlowIds: [],
  tags: [],
  tagMode: 'any',
  excludeTags: [],
  tagExpression: undefined,
  namePatterns: [],
  target: 'local',
  browser: 'chromium',
  headless: false, // Quick runs default to headed for debugging
  workers: 1,
  retries: 0,
  timeout: 30000,
  tracing: 'on-failure',
  screenshot: 'on-failure',
  video: 'off',
};

// ============================================
// PRESET CONFIGURATIONS
// ============================================

export interface RunConfigurationPreset {
  name: string;
  description: string;
  icon: string;
  config: Partial<RunConfigurationCreate>;
}

export const RUN_CONFIGURATION_PRESETS: RunConfigurationPreset[] = [
  {
    name: 'Development',
    description: 'Local debugging with full visibility',
    icon: 'Code',
    config: {
      target: 'local',
      localConfig: { workers: 1 },
      browser: 'chromium',
      browserChannel: 'chrome',
      headless: false,
      retries: 0,
      tracing: 'on',
      screenshot: 'on',
      video: 'off',
    },
  },
  {
    name: 'Quick Local',
    description: 'Fast parallel run on your machine',
    icon: 'Zap',
    config: {
      target: 'docker',
      dockerConfig: { shardCount: 4, memory: '2G', cpus: '1.0' },
      browser: 'chromium',
      headless: true,
      retries: 1,
      tracing: 'on-failure',
      screenshot: 'on-failure',
      video: 'off',
    },
  },
  {
    name: 'GitHub Actions (Free)',
    description: 'Run on GitHub cloud, 4 parallel jobs',
    icon: 'Cloud',
    config: {
      target: 'github-actions',
      githubActionsConfig: {
        runnerType: 'cloud-hosted',
        shardCount: 4,
        workersPerShard: 2,
      },
      browser: 'chromium',
      headless: true,
      retries: 2,
      tracing: 'on-first-retry',
      screenshot: 'on-failure',
      video: 'off',
    },
  },
  {
    name: 'GitHub Actions (Scale)',
    description: 'Self-hosted runners, 10 parallel jobs',
    icon: 'Server',
    config: {
      target: 'github-actions',
      githubActionsConfig: {
        runnerType: 'self-hosted',
        shardCount: 10,
        workersPerShard: 4,
        runnerLabels: ['self-hosted', 'linux', 'x64'],
      },
      browser: 'chromium',
      headless: true,
      retries: 2,
      tracing: 'on-first-retry',
      screenshot: 'on-failure',
      video: 'retain-on-failure',
    },
  },
  {
    name: 'Full Regression',
    description: 'Complete test suite with retries',
    icon: 'Shield',
    config: {
      excludeTags: ['wip', 'flaky', 'manual'],
      target: 'github-actions',
      githubActionsConfig: {
        runnerType: 'cloud-hosted',
        shardCount: 8,
        workersPerShard: 2,
      },
      browser: 'chromium',
      headless: true,
      retries: 2,
      tracing: 'on-first-retry',
      screenshot: 'on-failure',
      video: 'on-failure',
    },
  },
  {
    name: 'Debug Mode',
    description: 'Maximum visibility for troubleshooting',
    icon: 'Bug',
    config: {
      target: 'local',
      localConfig: { workers: 1 },
      browser: 'chromium',
      browserChannel: 'chrome',
      headless: false,
      retries: 0,
      timeout: 0, // No timeout
      tracing: 'on',
      screenshot: 'on',
      video: 'on',
    },
  },
];
