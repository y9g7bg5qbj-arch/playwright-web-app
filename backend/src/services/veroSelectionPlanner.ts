import { join, relative } from 'path';
import { scanForScenarios } from '../routes/veroScenarioIndex.utils';
import { VERO_PROJECT_PATH, confineToBase } from '../routes/veroProjectPath.utils';

export type VeroSelectionScope = 'active-file' | 'current-sandbox';

export interface PlannedVeroFile {
  filePath: string;
  absolutePath: string;
  content?: string;
  source: 'active' | 'disk';
}

export interface PlanVeroSelectionInput {
  filePath?: string;
  content?: string;
  selectionScope?: VeroSelectionScope;
}

function resolveAbsolutePath(filePath: string): string {
  // Validate that the resolved path stays within the project root (prevents path traversal).
  return confineToBase(VERO_PROJECT_PATH, filePath);
}

function toRunFilePath(absolutePath: string): string {
  const relativePath = relative(VERO_PROJECT_PATH, absolutePath).replace(/\\/g, '/');
  if (!relativePath.startsWith('..') && relativePath !== '') {
    return relativePath;
  }
  return absolutePath;
}

function resolveSandboxRoot(absoluteFilePath: string): string | undefined {
  const normalized = absoluteFilePath.replace(/\\/g, '/');
  const marker = '/sandboxes/';
  const markerIndex = normalized.toLowerCase().indexOf(marker);
  if (markerIndex < 0) {
    return undefined;
  }

  const afterMarker = normalized.slice(markerIndex + marker.length);
  const slashIndex = afterMarker.indexOf('/');
  if (slashIndex < 0) {
    return undefined;
  }

  const sandboxName = afterMarker.slice(0, slashIndex);
  if (!sandboxName) {
    return undefined;
  }

  return normalized.slice(0, markerIndex + marker.length + sandboxName.length);
}

export async function planVeroFilesForRun(input: PlanVeroSelectionInput): Promise<PlannedVeroFile[]> {
  const requestedScope: VeroSelectionScope = input.selectionScope === 'current-sandbox'
    ? 'current-sandbox'
    : 'active-file';

  if (!input.filePath) {
    return [];
  }

  const absoluteActivePath = resolveAbsolutePath(input.filePath);
  const activePlan: PlannedVeroFile = {
    filePath: toRunFilePath(absoluteActivePath),
    absolutePath: absoluteActivePath,
    content: input.content,
    source: 'active',
  };

  if (requestedScope !== 'current-sandbox') {
    return [activePlan];
  }

  const sandboxRoot = resolveSandboxRoot(absoluteActivePath);
  if (!sandboxRoot) {
    return [activePlan];
  }

  const features = await scanForScenarios(sandboxRoot);
  const absolutePaths = new Set<string>();
  for (const feature of features) {
    absolutePaths.add(join(sandboxRoot, feature.filePath));
  }
  absolutePaths.add(absoluteActivePath);

  const diskPlans: PlannedVeroFile[] = Array.from(absolutePaths)
    .sort((a, b) => a.localeCompare(b))
    .map((absolutePath) => ({
      filePath: toRunFilePath(absolutePath),
      absolutePath,
      source: absolutePath === absoluteActivePath ? 'active' : 'disk',
    }));

  return diskPlans.map((plan) => {
    if (plan.absolutePath === absoluteActivePath) {
      return {
        ...plan,
        content: input.content,
      };
    }
    return plan;
  });
}
