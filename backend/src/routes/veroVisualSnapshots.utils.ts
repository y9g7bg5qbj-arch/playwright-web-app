import { mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import { detectProjectRoot } from './veroExecution.utils';

export type VisualPreset = 'strict' | 'balanced' | 'relaxed' | 'custom';
export type UpdateSnapshotsMode = 'all' | 'changed' | 'missing';

interface PresetDefaults {
  threshold: number;
  maxDiffPixels?: number;
  maxDiffPixelRatio?: number;
}

const VISUAL_PRESET_DEFAULTS: Record<Exclude<VisualPreset, 'custom'>, PresetDefaults> = {
  strict: { threshold: 0.1, maxDiffPixels: 0, maxDiffPixelRatio: 0 },
  balanced: { threshold: 0.2 },
  relaxed: { threshold: 0.3, maxDiffPixelRatio: 0.01 },
};

const DEFAULT_VISUAL_PRESET: VisualPreset = 'balanced';
const DEFAULT_VISUAL_THRESHOLD = 0.2;

function parseFiniteNumber(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalThreshold(value: unknown): number | undefined {
  const parsed = parseFiniteNumber(value);
  if (parsed === undefined) return undefined;
  return Math.max(0, Math.min(1, parsed));
}

function parseOptionalNonNegativeInt(value: unknown): number | undefined {
  const parsed = parseFiniteNumber(value);
  if (parsed === undefined || parsed < 0) return undefined;
  return Math.floor(parsed);
}

function parseOptionalRatio(value: unknown): number | undefined {
  const parsed = parseFiniteNumber(value);
  if (parsed === undefined) return undefined;
  return Math.max(0, Math.min(1, parsed));
}

function normalizeTemplatePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/\/+$/g, '');
}

function parseVisualPreset(value: unknown): VisualPreset {
  if (typeof value !== 'string') return DEFAULT_VISUAL_PRESET;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'strict' || normalized === 'balanced' || normalized === 'relaxed' || normalized === 'custom') {
    return normalized;
  }
  return DEFAULT_VISUAL_PRESET;
}

function parseUpdateSnapshotsMode(value: unknown): UpdateSnapshotsMode | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'all' || normalized === 'changed' || normalized === 'missing') {
    return normalized;
  }
  return undefined;
}

export interface EnvironmentRootResolution {
  environmentRoot: string;
  usedFallback: boolean;
}

export function resolveEnvironmentRootFromFilePath(
  filePath: string | undefined,
  defaultRoot: string
): EnvironmentRootResolution {
  if (!filePath || !filePath.trim()) {
    return { environmentRoot: defaultRoot, usedFallback: true };
  }

  const environmentRoot = detectProjectRoot(filePath, defaultRoot);
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  const hasKnownBoundary = normalized.includes('/features/')
    || normalized.includes('/pages/')
    || normalized.includes('/pageactions/');

  return {
    environmentRoot,
    usedFallback: !hasKnownBoundary && environmentRoot === defaultRoot,
  };
}

export interface EnvironmentResources {
  environmentRoot: string;
  resourcesDir: string;
  visualBaselinesDir: string;
  docsDir: string;
  snapshotPathTemplate: string;
}

export function buildSnapshotPathTemplate(snapshotBaseDir: string): string {
  return `${normalizeTemplatePath(snapshotBaseDir)}/{platform}{/projectName}/{arg}{ext}`;
}

export async function ensureEnvironmentResources(environmentRoot: string): Promise<EnvironmentResources> {
  const resourcesDir = join(environmentRoot, 'Resources');
  const visualBaselinesDir = join(resourcesDir, 'Visual', 'Baselines');
  const docsDir = join(resourcesDir, 'Docs');

  await mkdir(visualBaselinesDir, { recursive: true });
  await mkdir(docsDir, { recursive: true });

  return {
    environmentRoot,
    resourcesDir,
    visualBaselinesDir,
    docsDir,
    snapshotPathTemplate: buildSnapshotPathTemplate(visualBaselinesDir),
  };
}

export interface ProjectEnvironmentResources {
  projectRoot: string;
  ensuredEnvironmentRoots: string[];
}

export async function ensureProjectEnvironmentResources(
  projectRoot: string
): Promise<ProjectEnvironmentResources> {
  const ensuredEnvironmentRoots = new Set<string>();
  const rootEnvironments = ['dev', 'master'].map((name) => join(projectRoot, name));

  for (const environmentRoot of rootEnvironments) {
    await ensureEnvironmentResources(environmentRoot);
    ensuredEnvironmentRoots.add(environmentRoot);
  }

  const sandboxesRoot = join(projectRoot, 'sandboxes');
  await mkdir(sandboxesRoot, { recursive: true });
  try {
    const sandboxEntries = await readdir(sandboxesRoot, { withFileTypes: true });
    for (const entry of sandboxEntries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const sandboxEnvironmentRoot = join(sandboxesRoot, entry.name);
      await ensureEnvironmentResources(sandboxEnvironmentRoot);
      ensuredEnvironmentRoots.add(sandboxEnvironmentRoot);
    }
  } catch (error: unknown) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
    if (code !== 'ENOENT') {
      throw error;
    }
  }

  return {
    projectRoot,
    ensuredEnvironmentRoots: Array.from(ensuredEnvironmentRoots),
  };
}

export interface ResolvedVisualSnapshotConfig {
  preset: VisualPreset;
  threshold: number;
  maxDiffPixels?: number;
  maxDiffPixelRatio?: number;
  updateSnapshotsMode?: UpdateSnapshotsMode;
}

export function resolveVisualSnapshotConfig(
  config: Record<string, unknown> | null | undefined
): ResolvedVisualSnapshotConfig {
  const preset = parseVisualPreset(config?.visualPreset);

  const baseDefaults: PresetDefaults =
    preset === 'custom'
      ? { threshold: DEFAULT_VISUAL_THRESHOLD }
      : VISUAL_PRESET_DEFAULTS[preset];

  const threshold = parseOptionalThreshold(config?.visualThreshold) ?? baseDefaults.threshold;
  const maxDiffPixels = parseOptionalNonNegativeInt(config?.visualMaxDiffPixels) ?? baseDefaults.maxDiffPixels;
  const maxDiffPixelRatio = parseOptionalRatio(config?.visualMaxDiffPixelRatio) ?? baseDefaults.maxDiffPixelRatio;

  const explicitUpdateMode = parseUpdateSnapshotsMode(config?.updateSnapshotsMode);
  const updateSnapshotsMode = explicitUpdateMode
    ?? (config?.visualUpdateSnapshots === true ? 'changed' : undefined);

  return {
    preset,
    threshold,
    ...(maxDiffPixels !== undefined ? { maxDiffPixels } : {}),
    ...(maxDiffPixelRatio !== undefined ? { maxDiffPixelRatio } : {}),
    ...(updateSnapshotsMode ? { updateSnapshotsMode } : {}),
  };
}
