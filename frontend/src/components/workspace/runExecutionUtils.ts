import { normalizeExecutionTarget } from '@playwright-web-app/shared';

export type BrowserMode = 'headed' | 'headless';

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

export function resolveBrowserMode(config: ConfigLike): BrowserMode {
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

export function encodeUtf8ToBase64(value: string): string {
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
  envVars?: Record<string, string>
): Record<string, string> {
  const browserMode = resolveBrowserMode(config);
  const baseUrl =
    typeof config.baseURL === 'string'
      ? config.baseURL.trim()
      : typeof config.baseUrl === 'string'
        ? config.baseUrl.trim()
        : '';

  const inputs: Record<string, string> = {
    runMode: 'vero',
    veroFilePath: toRelativeVeroPath(activeTabPath),
    veroContentB64: encodeUtf8ToBase64(activeTabContent),
    workers: String(toPositiveInteger(config.workers, 1)),
    retries: String(toNonNegativeInteger(config.retries, 0)),
    timeoutMs: String(toPositiveInteger(config.timeout, 60000)),
    headless: String(browserMode === 'headless'),
    browsers: typeof config.browser === 'string' ? config.browser : 'chromium',
  };

  if (scenarioName && scenarioName.trim()) {
    inputs.scenarioName = scenarioName.trim();
  }
  if (baseUrl) {
    inputs.baseUrl = baseUrl;
  }
  if (envVars && Object.keys(envVars).length > 0) {
    inputs.envVarsB64 = encodeUtf8ToBase64(JSON.stringify(envVars));
  }

  return inputs;
}

export function buildLocalRunConfig(config: ConfigLike) {
  return {
    browser: typeof config.browser === 'string' ? config.browser : 'chromium',
    browserMode: resolveBrowserMode(config),
    baseUrl:
      typeof config.baseURL === 'string'
        ? config.baseURL
        : typeof config.baseUrl === 'string'
          ? config.baseUrl
          : undefined,
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
  };
}
