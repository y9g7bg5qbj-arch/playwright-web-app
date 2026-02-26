import { normalizeExecutionTarget } from '@/utils/normalizeExecutionTarget';

type BrowserMode = 'headed' | 'headless';

type ConfigLike = Record<string, unknown>;

function toPositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function toNonNegativeInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function toNumberInRange(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

function toOptionalNonNegativeInteger(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }
  return Math.floor(parsed);
}

function toOptionalRatio(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return Math.max(0, Math.min(1, parsed));
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toShardTotal(value: unknown): number {
  if (typeof value === 'object' && value !== null && 'total' in value) {
    return toPositiveInteger((value as { total?: unknown }).total, 1);
  }
  return toPositiveInteger(value, 1);
}

function resolveBrowserMode(config: ConfigLike): BrowserMode {
  if (config.headed === true) return 'headed';
  if (config.headed === false) return 'headless';
  if (config.headless === true) return 'headless';
  return 'headed';
}

export function normalizeRunTarget(target: unknown): 'local' | 'github-actions' {
  const normalized = normalizeExecutionTarget(target as string | null | undefined, 'local');
  return normalized === 'github-actions' ? 'github-actions' : 'local';
}

export function toRelativeVeroPath(absolutePath: string): string {
  const marker = 'vero-projects/';
  const index = absolutePath.indexOf(marker);
  return index !== -1
    ? absolutePath.substring(index + marker.length)
    : absolutePath;
}

function encodeUtf8ToBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function buildGitHubInputs(
  config: ConfigLike,
  activeTabPath: string,
  activeTabContent: string,
  scenarioName?: string,
  envVars?: Record<string, string>,
  parameterizedNames?: string[]
): Record<string, string> {
  const browserMode = resolveBrowserMode(config);

  const inputs: Record<string, string> = {
    runMode: 'vero',
    veroFilePath: toRelativeVeroPath(activeTabPath),
    veroContentB64: encodeUtf8ToBase64(activeTabContent),
    workers: String(toPositiveInteger(config.workers, 1)),
    shards: String(toShardTotal((config as { shards?: unknown; shardCount?: unknown }).shards ?? (config as { shardCount?: unknown }).shardCount)),
    retries: String(toNonNegativeInteger(config.retries, 0)),
    timeoutMs: String(toPositiveInteger(config.timeout, 60000)),
    headless: String(browserMode === 'headless'),
    browsers: typeof config.browser === 'string' ? config.browser : 'chromium',
    selectionScope:
      config.selectionScope === 'active-file' || config.selectionScope === 'current-sandbox'
        ? config.selectionScope
        : 'current-sandbox',
  };

  if (scenarioName && scenarioName.trim()) {
    inputs.scenarioName = scenarioName.trim();
  }
  if (typeof config.tagExpression === 'string' && config.tagExpression.trim()) {
    inputs.tagExpression = config.tagExpression.trim();
  }
  const namePatterns = toStringArray(config.namePatterns);
  if (namePatterns.length > 0) {
    inputs.namePatternsB64 = encodeUtf8ToBase64(JSON.stringify(namePatterns));
  }
  const legacyTags = toStringArray(config.tags);
  if (legacyTags.length > 0) {
    inputs.tagsB64 = encodeUtf8ToBase64(JSON.stringify(legacyTags));
  }
  if (typeof config.tagMode === 'string' && config.tagMode.trim()) {
    inputs.tagMode = config.tagMode.trim();
  }
  const legacyExcludeTags = toStringArray(config.excludeTags);
  if (legacyExcludeTags.length > 0) {
    inputs.excludeTagsB64 = encodeUtf8ToBase64(JSON.stringify(legacyExcludeTags));
  }
  if (typeof config.grep === 'string' && config.grep.trim()) {
    inputs.grep = config.grep.trim();
  }
  if (typeof config.grepInvert === 'string' && config.grepInvert.trim()) {
    inputs.grepInvert = config.grepInvert.trim();
  }
  if (config.lastFailed === true) {
    inputs.lastFailed = 'true';
  }
  if (envVars && Object.keys(envVars).length > 0) {
    inputs.envVarsB64 = encodeUtf8ToBase64(JSON.stringify(envVars));
  }
  if (Array.isArray(parameterizedNames) && parameterizedNames.length > 0) {
    const normalized = parameterizedNames
      .filter((name): name is string => typeof name === 'string')
      .map((name) => name.trim())
      .filter(Boolean);
    if (normalized.length > 0) {
      inputs.parameterizedNamesB64 = encodeUtf8ToBase64(JSON.stringify(Array.from(new Set(normalized))));
    }
  }

  return inputs;
}

export function buildLocalRunConfig(config: ConfigLike) {
  const runTarget = normalizeRunTarget(config.target);
  const namePatterns = toStringArray(config.namePatterns);
  const legacyTags = toStringArray(config.tags);
  const legacyExcludeTags = toStringArray(config.excludeTags);
  const visualPreset =
    typeof config.visualPreset === 'string'
      ? config.visualPreset.trim().toLowerCase()
      : 'balanced';
  const normalizedVisualPreset =
    visualPreset === 'strict' || visualPreset === 'balanced' || visualPreset === 'relaxed' || visualPreset === 'custom'
      ? visualPreset
      : 'balanced';

  return {
    browser: typeof config.browser === 'string' ? config.browser : 'chromium',
    browserMode: resolveBrowserMode(config),
    timeout: toPositiveInteger(config.timeout, 30000),
    retries: toNonNegativeInteger(config.retries, 0),
    tracing:
      typeof config.trace === 'string'
        ? config.trace
        : typeof config.tracing === 'string'
          ? config.tracing
          : undefined,
    video: typeof config.video === 'string' ? config.video : undefined,
    screenshotOnFailure:
      config.screenshot === 'only-on-failure' || config.screenshotOnFailure === true,
    workers: toPositiveInteger(config.workers, 1),
    grep: typeof config.grep === 'string' ? config.grep : undefined,
    grepInvert: typeof config.grepInvert === 'string' ? config.grepInvert : undefined,
    lastFailed: config.lastFailed === true,
    tagExpression: typeof config.tagExpression === 'string' ? config.tagExpression : undefined,
    selectionScope:
      config.selectionScope === 'active-file' || config.selectionScope === 'current-sandbox'
        ? config.selectionScope
        : 'current-sandbox',
    namePatterns: namePatterns.length > 0 ? namePatterns : undefined,
    tags: legacyTags.length > 0 ? legacyTags : undefined,
    tagMode: typeof config.tagMode === 'string' ? config.tagMode : undefined,
    excludeTags: legacyExcludeTags.length > 0 ? legacyExcludeTags : undefined,
    visualPreset: normalizedVisualPreset,
    visualThreshold: toNumberInRange(config.visualThreshold, 0.2, 0, 1),
    visualMaxDiffPixels: toOptionalNonNegativeInteger(config.visualMaxDiffPixels),
    visualMaxDiffPixelRatio: toOptionalRatio(config.visualMaxDiffPixelRatio),
    visualUpdateSnapshots: config.visualUpdateSnapshots === true,
    authProfileId: typeof config.authProfileId === 'string' ? config.authProfileId : undefined,
    shard: runTarget === 'github-actions'
      && config.shards
      && typeof config.shards === 'object'
      && 'total' in config.shards
      && (config.shards as { total: number }).total > 1
      ? config.shards as { current: number; total: number }
      : undefined,
  };
}
