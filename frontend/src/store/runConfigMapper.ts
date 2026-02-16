/**
 * Maps between frontend RunConfiguration (runConfigStore) and backend/shared RunConfiguration types.
 *
 * The frontend store uses a flattened shape optimized for UI controls,
 * while the backend uses the shared RunConfiguration shape with nested configs.
 */

import type {
  RunConfiguration as BackendRunConfiguration,
  RunConfigurationCreate,
  RunConfigurationUpdate,
  RunConfigRuntimeFields,
} from '@playwright-web-app/shared';
import type { RunConfiguration as FrontendRunConfiguration } from './runConfigStore';

// Map frontend artifact modes to backend ArtifactMode
function toBackendArtifactMode(mode: string): 'on' | 'off' | 'on-failure' | 'on-first-retry' | 'retain-on-failure' {
  if (mode === 'only-on-failure') return 'on-failure';
  if (mode === 'on-failure') return 'on-failure';
  if (mode === 'retain-on-failure') return 'retain-on-failure';
  if (mode === 'on-first-retry') return 'on-first-retry';
  if (mode === 'on') return 'on';
  return 'off';
}

/**
 * Convert a frontend config to a backend create payload.
 */
export function toBackendCreate(
  config: Omit<FrontendRunConfiguration, 'id' | 'createdAt' | 'updatedAt'>,
): RunConfigurationCreate {
  const shardCount =
    typeof config.shards?.total === 'number' && config.shards.total > 0
      ? config.shards.total
      : undefined;

  const runtimeConfig: RunConfigRuntimeFields = {
    headed: config.headed,
    debug: config.debug,
    ui: config.ui,
    lastFailed: config.lastFailed,
    globalTimeout: config.globalTimeout || undefined,
    grepInvert: config.grepInvert || undefined,
    baseURL: config.baseURL || undefined,
    reporter: config.reporter?.length ? config.reporter : undefined,
    outputDir: config.outputDir || undefined,
    locale: config.locale || undefined,
    timezoneId: config.timezoneId || undefined,
    geolocation: config.geolocation || undefined,
    lastUsedAt: config.lastUsedAt || undefined,
  };

  return {
    projectId: config.projectId,
    name: config.name,
    target: config.target === 'github-actions' ? 'github-actions' : 'local',
    browser: config.browser,
    headless: !config.headed,
    workers: config.workers,
    shardCount,
    retries: config.retries,
    timeout: config.timeout,
    tracing: toBackendArtifactMode(config.trace),
    screenshot: toBackendArtifactMode(config.screenshot),
    video: toBackendArtifactMode(config.video),
    grep: config.grep || undefined,
    tagExpression: config.tagExpression || undefined,
    namePatterns: config.namePatterns?.length ? config.namePatterns : undefined,
    selectionScope: config.selectionScope || undefined,
    environmentId: config.environmentId || undefined,
    envVars: config.envVars && Object.keys(config.envVars).length > 0 ? config.envVars : undefined,
    parameterSetId: config.parameterSetId || undefined,
    parameterOverrides: config.parameterOverrides || undefined,
    visualPreset: config.visualPreset || undefined,
    visualThreshold: config.visualThreshold,
    visualMaxDiffPixels: config.visualMaxDiffPixels,
    visualMaxDiffPixelRatio: config.visualMaxDiffPixelRatio,
    visualUpdateSnapshots: config.visualUpdateSnapshots || undefined,
    githubRepository: config.github?.repository || undefined,
    githubWorkflowPath: config.github?.workflowFile || undefined,
    viewport: config.viewport,
    runtimeConfig,
  };
}

/**
 * Convert a backend RunConfiguration to the frontend store shape.
 */
export function fromBackendConfig(backend: BackendRunConfiguration): FrontendRunConfiguration {
  const rt = backend.runtimeConfig || {};

  return {
    id: backend.id,
    workflowId: backend.workflowId,
    projectId: backend.projectId,
    name: backend.name,
    target: backend.target === 'github-actions' ? 'github-actions' : 'local',
    browser: backend.browser || 'chromium',
    project: undefined,
    headed: rt.headed ?? !backend.headless,
    debug: rt.debug ?? false,
    ui: rt.ui ?? false,
    workers: backend.workers || 1,
    shards: backend.shardCount ? { current: 1, total: backend.shardCount } : undefined,
    grep: backend.grep || undefined,
    grepInvert: rt.grepInvert || undefined,
    tagExpression: backend.tagExpression || undefined,
    selectionScope: backend.selectionScope || undefined,
    namePatterns: backend.namePatterns || undefined,
    lastFailed: rt.lastFailed ?? false,
    retries: backend.retries || 0,
    timeout: backend.timeout || 30000,
    globalTimeout: rt.globalTimeout ?? 0,
    trace: (backend.tracing as FrontendRunConfiguration['trace']) || 'retain-on-failure',
    screenshot: (backend.screenshot as FrontendRunConfiguration['screenshot']) || 'only-on-failure',
    video: (backend.video as FrontendRunConfiguration['video']) || 'off',
    visualPreset: (backend.visualPreset as FrontendRunConfiguration['visualPreset']) || 'balanced',
    visualThreshold: backend.visualThreshold ?? 0.2,
    visualMaxDiffPixels: backend.visualMaxDiffPixels,
    visualMaxDiffPixelRatio: backend.visualMaxDiffPixelRatio,
    visualUpdateSnapshots: backend.visualUpdateSnapshots ?? false,
    reporter: (rt.reporter as FrontendRunConfiguration['reporter']) || ['list'],
    outputDir: rt.outputDir || undefined,
    baseURL: rt.baseURL || undefined,
    viewport: backend.viewport || undefined,
    locale: rt.locale || undefined,
    timezoneId: rt.timezoneId || undefined,
    geolocation: rt.geolocation || undefined,
    environmentId: backend.environmentId || undefined,
    envVars: backend.envVars || undefined,
    parameterSetId: backend.parameterSetId || undefined,
    parameterOverrides: backend.parameterOverrides || undefined,
    github: backend.githubRepository ? {
      repository: backend.githubRepository,
      branch: undefined,
      workflowFile: backend.githubWorkflowPath,
    } : undefined,
    lastUsedAt: rt.lastUsedAt || undefined,
    createdAt: backend.createdAt,
    updatedAt: backend.updatedAt,
  };
}

/**
 * Convert partial frontend updates to a backend update payload.
 */
export function toBackendUpdate(updates: Partial<FrontendRunConfiguration>): RunConfigurationUpdate {
  const result: RunConfigurationUpdate = {};

  if (updates.name !== undefined) result.name = updates.name;
  if (updates.target !== undefined) result.target = updates.target === 'github-actions' ? 'github-actions' : 'local';
  if (updates.browser !== undefined) result.browser = updates.browser;
  if (updates.headed !== undefined) result.headless = !updates.headed;
  if (updates.workers !== undefined) result.workers = updates.workers;
  if (updates.shards !== undefined) {
    const shardCount =
      typeof updates.shards?.total === 'number' && updates.shards.total > 0
        ? updates.shards.total
        : undefined;
    result.shardCount = shardCount;
  }
  if (updates.retries !== undefined) result.retries = updates.retries;
  if (updates.timeout !== undefined) result.timeout = updates.timeout;
  if (updates.trace !== undefined) result.tracing = toBackendArtifactMode(updates.trace);
  if (updates.screenshot !== undefined) result.screenshot = toBackendArtifactMode(updates.screenshot);
  if (updates.video !== undefined) result.video = toBackendArtifactMode(updates.video);
  if (updates.grep !== undefined) result.grep = updates.grep || undefined;
  if (updates.tagExpression !== undefined) result.tagExpression = updates.tagExpression || undefined;
  if (updates.namePatterns !== undefined) result.namePatterns = updates.namePatterns;
  if (updates.selectionScope !== undefined) result.selectionScope = updates.selectionScope;
  if (updates.environmentId !== undefined) result.environmentId = updates.environmentId || undefined;
  if (updates.envVars !== undefined) result.envVars = updates.envVars;
  if (updates.parameterSetId !== undefined) result.parameterSetId = updates.parameterSetId || undefined;
  if (updates.visualPreset !== undefined) result.visualPreset = updates.visualPreset;
  if (updates.visualThreshold !== undefined) result.visualThreshold = updates.visualThreshold;
  if (updates.visualMaxDiffPixels !== undefined) result.visualMaxDiffPixels = updates.visualMaxDiffPixels;
  if (updates.visualMaxDiffPixelRatio !== undefined) result.visualMaxDiffPixelRatio = updates.visualMaxDiffPixelRatio;
  if (updates.visualUpdateSnapshots !== undefined) result.visualUpdateSnapshots = updates.visualUpdateSnapshots;
  if (updates.viewport !== undefined) result.viewport = updates.viewport;

  // Bundle runtime fields
  const runtimeConfig: RunConfigRuntimeFields = {};
  let hasRuntime = false;
  if (updates.headed !== undefined) { runtimeConfig.headed = updates.headed; hasRuntime = true; }
  if (updates.debug !== undefined) { runtimeConfig.debug = updates.debug; hasRuntime = true; }
  if (updates.ui !== undefined) { runtimeConfig.ui = updates.ui; hasRuntime = true; }
  if (updates.lastFailed !== undefined) { runtimeConfig.lastFailed = updates.lastFailed; hasRuntime = true; }
  if (updates.globalTimeout !== undefined) { runtimeConfig.globalTimeout = updates.globalTimeout; hasRuntime = true; }
  if (updates.grepInvert !== undefined) { runtimeConfig.grepInvert = updates.grepInvert; hasRuntime = true; }
  if (updates.baseURL !== undefined) { runtimeConfig.baseURL = updates.baseURL; hasRuntime = true; }
  if (updates.reporter !== undefined) { runtimeConfig.reporter = updates.reporter; hasRuntime = true; }
  if (updates.outputDir !== undefined) { runtimeConfig.outputDir = updates.outputDir; hasRuntime = true; }
  if (updates.locale !== undefined) { runtimeConfig.locale = updates.locale; hasRuntime = true; }
  if (updates.timezoneId !== undefined) { runtimeConfig.timezoneId = updates.timezoneId; hasRuntime = true; }
  if (updates.geolocation !== undefined) { runtimeConfig.geolocation = updates.geolocation; hasRuntime = true; }
  if (updates.lastUsedAt !== undefined) { runtimeConfig.lastUsedAt = updates.lastUsedAt; hasRuntime = true; }
  if (hasRuntime) result.runtimeConfig = runtimeConfig;

  return result;
}
