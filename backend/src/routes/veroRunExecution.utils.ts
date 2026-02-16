import { copyFile, mkdir, readdir, readFile, stat, unlink } from 'fs/promises';
import { release } from 'os';
import { basename, join } from 'path';
import type { ScenarioSelectionOptions } from 'vero-lang';

export const VERO_RUN_MODULE_MISMATCH_ERROR_CODE = 'VERO-RUN-MODULE-MISMATCH';

const MODULE_MISMATCH_PATTERN = /ReferenceError:\s*exports is not defined in ES module scope/i;
const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_STDERR_SNIPPET_LINES = 40;

export interface VeroRunPlaywrightArgsOptions {
  tempSpecFileName?: string;
  tempSpecFileNames?: string[];
  configPath: string;
  headed: boolean;
  workers?: number;
  retries?: number;
  grep?: string;
  grepInvert?: string;
  lastFailed?: boolean;
  updateSnapshotsMode?: 'all' | 'changed' | 'missing';
  timeoutMs?: number;
  shard?: { current: number; total: number };
}

export interface VeroRunDiagnostics {
  phase: 'startup' | 'test';
  tempSpecPath?: string;
  configPath?: string;
  stderrSnippet?: string;
  preservedSpecPath?: string;
}

export interface VeroRunFailureClassification {
  isStartupFailure: boolean;
  errorCode?: string;
  diagnostics: VeroRunDiagnostics;
}

export interface DetectVeroRunFailureOptions {
  exitCode: number;
  resultsJsonExists: boolean;
  stderr: string;
  tempSpecPath: string;
  configPath: string;
  stderrSnippetLineLimit?: number;
}

export interface PreserveStartupFailureSpecOptions {
  tempSpecPath: string;
  debugDir: string;
  runId: string;
  maxRetained?: number;
}

export interface PlaywrightHostPlatformOverrideInput {
  existingOverride?: string;
  platform?: NodeJS.Platform;
  arch?: string;
  osRelease?: string;
}

export function buildVeroRunTempSpecFileName(runId: string, readableName?: string): string {
  if (readableName) {
    const safe = readableName.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').substring(0, 60);
    return `.vero-run-${safe}-${runId.substring(0, 8)}.spec.mts`;
  }
  return `.vero-run-${runId}.spec.mts`;
}

/**
 * Strip .vero-run-* temp spec filename pattern to extract the clean readable name.
 * Used to clean suite titles in Playwright results and Allure reports.
 *
 * Examples:
 *   ".vero-run-HerokuLogin-5e4453cc.spec.mts" → "HerokuLogin"
 *   ".vero-run-d0a8cb94-ad05-47b3-b8cd-903d16fe75a5.spec.mts" → "Test"
 *   ".vero-temp-test-abc.spec.ts" → "Test"
 *   "SomeOtherTitle" → "SomeOtherTitle" (unchanged)
 */
export function stripVeroSpecPrefix(title: string): string {
  // New pattern: .vero-run-ReadableName-8hexchars.spec.mts
  const namedMatch = title.match(/^\.vero-run-(.+)-[0-9a-f]{8}\.spec\.m?ts$/i);
  if (namedMatch) {
    return namedMatch[1];
  }
  // Legacy pattern: .vero-run-UUID.spec.mts
  if (/^\.vero-run-[0-9a-f-]+\.spec\.m?ts$/i.test(title)) {
    return 'Test';
  }
  // Legacy pattern: .vero-temp-test-*.spec.ts
  if (/^\.vero-temp-test-.*\.spec\.m?ts$/i.test(title)) {
    return 'Test';
  }
  return title;
}

export function resolvePlaywrightHostPlatformOverride(
  input: PlaywrightHostPlatformOverrideInput = {}
): string | undefined {
  if (input.existingOverride) {
    return input.existingOverride;
  }

  const platform = input.platform ?? process.platform;
  const arch = input.arch ?? process.arch;
  if (platform !== 'darwin' || arch !== 'arm64') {
    return undefined;
  }

  const osRelease = input.osRelease ?? release();
  const major = Number.parseInt(osRelease.split('.')[0] || '', 10);
  if (!Number.isFinite(major) || major < 20) {
    return undefined;
  }

  const LAST_STABLE_MACOS_MAJOR_VERSION = 15;
  const macVersion = Math.min(major - 9, LAST_STABLE_MACOS_MAJOR_VERSION);
  return `mac${macVersion}-arm64`;
}

export function buildVeroRunPlaywrightArgs(options: VeroRunPlaywrightArgsOptions): string[] {
  const tempSpecFileNames = options.tempSpecFileNames && options.tempSpecFileNames.length > 0
    ? options.tempSpecFileNames
    : options.tempSpecFileName
      ? [options.tempSpecFileName]
      : [];
  if (tempSpecFileNames.length === 0) {
    throw new Error('No temp spec files provided for Playwright run');
  }

  const args = [
    'playwright',
    'test',
    ...tempSpecFileNames,
    '--config',
    options.configPath,
  ];

  if (options.headed) {
    args.push('--headed');
  }

  const workers = Number.isFinite(options.workers) ? Number(options.workers) : 1;
  if (workers > 1) {
    args.push(`--workers=${workers}`);
  }

  const retries = Number.isFinite(options.retries) ? Number(options.retries) : 0;
  if (retries > 0) {
    args.push(`--retries=${retries}`);
  }

  if (typeof options.grep === 'string' && options.grep.trim()) {
    args.push('--grep', options.grep.trim());
  }

  if (typeof options.grepInvert === 'string' && options.grepInvert.trim()) {
    args.push('--grep-invert', options.grepInvert.trim());
  }

  if (options.lastFailed === true) {
    args.push('--last-failed');
  }

  if (options.shard && options.shard.total > 1) {
    args.push(`--shard=${options.shard.current}/${options.shard.total}`);
  }

  if (options.updateSnapshotsMode) {
    args.push(`--update-snapshots=${options.updateSnapshotsMode}`);
  }

  const timeoutMs = Number.isFinite(options.timeoutMs) ? Number(options.timeoutMs) : DEFAULT_TIMEOUT_MS;
  args.push(`--timeout=${timeoutMs}`);
  return args;
}

export interface ResolveVeroScenarioSelectionInput {
  scenarioName?: string;
  config?: Record<string, unknown> | null;
}

export function resolveVeroScenarioSelection(input: ResolveVeroScenarioSelectionInput): ScenarioSelectionOptions | undefined {
  const scenarioNames = [
    ...toTrimmedStringArray([
      normalizeOptionalString(input.scenarioName),
      normalizeOptionalString(input.config?.scenarioName),
    ]),
    ...toTrimmedStringArray(input.config?.scenarioNames),
  ];
  const uniqueScenarioNames = Array.from(new Set(scenarioNames));
  const namePatterns = toTrimmedStringArray(input.config?.namePatterns);
  const explicitTagExpression = normalizeOptionalString(input.config?.tagExpression);
  const fallbackTagExpression = buildLegacyTagExpression({
    tags: toTrimmedStringArray(input.config?.tags),
    tagMode: normalizeTagMode(input.config?.tagMode),
    excludeTags: toTrimmedStringArray(input.config?.excludeTags),
  });
  const tagExpression = explicitTagExpression || fallbackTagExpression;

  if (uniqueScenarioNames.length === 0 && namePatterns.length === 0 && !tagExpression) {
    return undefined;
  }

  return {
    scenarioNames: uniqueScenarioNames.length > 0 ? uniqueScenarioNames : undefined,
    namePatterns: namePatterns.length > 0 ? namePatterns : undefined,
    tagExpression: tagExpression || undefined,
  };
}

export function sanitizePlaywrightArgsForLog(args: string[]): string[] {
  const sanitized = [...args];
  const sanitizeFlagValue = (flag: string, replacement: string) => {
    const index = sanitized.indexOf(flag);
    if (index >= 0 && sanitized[index + 1]) {
      sanitized[index + 1] = replacement;
    }
  };

  sanitizeFlagValue('--grep', '[grep]');
  sanitizeFlagValue('--grep-invert', '[grepInvert]');

  for (let index = 0; index < sanitized.length; index += 1) {
    if (sanitized[index].startsWith('--grep=')) {
      sanitized[index] = '--grep=[grep]';
    }
    if (sanitized[index].startsWith('--grep-invert=')) {
      sanitized[index] = '--grep-invert=[grepInvert]';
    }
  }

  return sanitized;
}

export function detectVeroRunFailure(options: DetectVeroRunFailureOptions): VeroRunFailureClassification {
  const isStartupFailure = options.exitCode !== 0 && !options.resultsJsonExists;
  const stderrSnippet = buildStderrSnippet(
    options.stderr,
    options.stderrSnippetLineLimit ?? DEFAULT_STDERR_SNIPPET_LINES
  );

  const diagnostics: VeroRunDiagnostics = {
    phase: isStartupFailure ? 'startup' : 'test',
    tempSpecPath: options.tempSpecPath,
    configPath: options.configPath,
    stderrSnippet,
  };

  if (isStartupFailure && MODULE_MISMATCH_PATTERN.test(options.stderr)) {
    return {
      isStartupFailure: true,
      errorCode: VERO_RUN_MODULE_MISMATCH_ERROR_CODE,
      diagnostics,
    };
  }

  return {
    isStartupFailure,
    diagnostics,
  };
}

export async function preserveStartupFailureSpec(
  options: PreserveStartupFailureSpecOptions
): Promise<string | undefined> {
  const maxRetained = options.maxRetained && options.maxRetained > 0 ? options.maxRetained : 20;
  const normalizedName = basename(options.tempSpecPath).replace(/^\./, '');
  const preservedSpecPath = join(options.debugDir, `${options.runId}-${normalizedName}`);

  try {
    await mkdir(options.debugDir, { recursive: true });
    await copyFile(options.tempSpecPath, preservedSpecPath);
    await pruneByMtime(options.debugDir, maxRetained);
    return preservedSpecPath;
  } catch {
    return undefined;
  }
}

export async function shouldWriteLegacyDockerSpec(dockerConfigPath: string): Promise<boolean> {
  try {
    const source = await readFile(dockerConfigPath, 'utf-8');
    const explicitlyMatchesMts = /\.spec\.mts/.test(source) || /\bmts\b/.test(source);
    const explicitlyMatchesTs = /\.spec\.ts/.test(source) || /\bts\b/.test(source);
    return explicitlyMatchesTs && !explicitlyMatchesMts;
  } catch {
    return false;
  }
}

function buildStderrSnippet(stderr: string, maxLines: number): string | undefined {
  const trimmed = stderr.trim();
  if (!trimmed) {
    return undefined;
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (lines.length === 0) {
    return undefined;
  }

  return lines.slice(-maxLines).join('\n');
}

async function pruneByMtime(dirPath: string, maxRetained: number): Promise<void> {
  const entries = await readdir(dirPath);
  const filesWithTime = (await Promise.all(entries.map(async (entry) => {
    const filePath = join(dirPath, entry);
    try {
      const fileStats = await stat(filePath);
      if (!fileStats.isFile()) {
        return null;
      }
      return { filePath, mtimeMs: fileStats.mtimeMs };
    } catch {
      return null;
    }
  }))).filter((entry): entry is { filePath: string; mtimeMs: number } => entry !== null);

  filesWithTime.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const staleFiles = filesWithTime.slice(maxRetained);
  if (staleFiles.length === 0) {
    return;
  }

  await Promise.all(staleFiles.map(async ({ filePath }) => {
    try {
      await unlink(filePath);
    } catch {
      // Best-effort retention cleanup.
    }
  }));
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function toTrimmedStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [];
}

function normalizeTagMode(value: unknown): 'any' | 'all' {
  return typeof value === 'string' && value.toLowerCase() === 'all' ? 'all' : 'any';
}

function buildLegacyTagExpression(input: { tags: string[]; tagMode: 'any' | 'all'; excludeTags: string[] }): string | undefined {
  const includeExpression = input.tags.length > 0
    ? `(${input.tags.map(asTagLiteral).join(input.tagMode === 'all' ? ' and ' : ' or ')})`
    : '';
  const excludeExpression = input.excludeTags.map((tag) => `not ${asTagLiteral(tag)}`).join(' and ');

  if (includeExpression && excludeExpression) {
    return `${includeExpression} and ${excludeExpression}`;
  }
  if (includeExpression) {
    return includeExpression;
  }
  if (excludeExpression) {
    return excludeExpression;
  }
  return undefined;
}

function asTagLiteral(tag: string): string {
  return `@${tag.trim().replace(/^@+/, '')}`;
}
