/**
 * Test Pattern Resolver
 * Resolves test selectors (tags, folders, glob patterns) into concrete file paths
 */

import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { resolveProjectPath } from '../../routes/veroProjectPath.utils';
import { extractScenariosFromVero, normalizeTags } from '../../routes/veroScenarioIndex.utils';

const globCallback = require('glob') as (pattern: string, options: Record<string, unknown>, cb: (err: Error | null, matches: string[]) => void) => void;
const glob = promisify(globCallback) as unknown as (pattern: string, options: { cwd: string; absolute: boolean }) => Promise<string[]>;

export interface TestSelector {
  tags?: string[];
  tagMode?: 'any' | 'all';
  folders?: string[];
  patterns?: string[];
}

export interface ResolvedTestTarget {
  filePath: string;
  scenarioNames?: string[];
}

/**
 * Resolve a test selector into concrete file + scenario targets.
 * @param selector - The test selector from the schedule
 * @param basePath - The root directory to resolve patterns against (defaults to VERO_PROJECT_PATH)
 * @param projectId - Optional project ID to resolve project-specific base path
 * @returns Array of resolved targets
 */
export async function resolveTestPlan(
  selector: TestSelector,
  basePath?: string,
  projectId?: string
): Promise<ResolvedTestTarget[]> {
  let root: string;
  if (basePath) {
    root = basePath;
  } else if (projectId) {
    root = await resolveProjectPath(undefined, projectId);
  } else {
    root = process.env.VERO_PROJECT_PATH || process.cwd();
  }
  const allFiles: Set<string> = new Set();

  // Resolve explicit patterns
  if (selector.patterns && selector.patterns.length > 0) {
    for (const pattern of selector.patterns) {
      const isGlob = /[*?{]/.test(pattern);
      if (!isGlob) {
        // Single file path — verify it exists
        const fullPath = path.resolve(root, pattern);
        try {
          await fs.access(fullPath);
          allFiles.add(fullPath);
        } catch {
          // File doesn't exist, skip
        }
      } else {
        const matches = await glob(pattern, { cwd: root, absolute: true });
        matches.forEach(f => allFiles.add(f));
      }
    }
  }

  // Resolve folder selectors
  if (selector.folders && selector.folders.length > 0) {
    for (const folder of selector.folders) {
      const folderPattern = `${folder}/**/*.{spec.ts,vero}`;
      const matches = await glob(folderPattern, { cwd: root, absolute: true });
      matches.forEach(f => allFiles.add(f));
    }
  }

  // Recursive fallback: if patterns/folders were specified but nothing matched,
  // search recursively through all subdirectories (e.g. projectId/workspace/sandbox/...)
  if (allFiles.size === 0 && (
    (selector.patterns && selector.patterns.length > 0) ||
    (selector.folders && selector.folders.length > 0)
  )) {
    if (selector.patterns) {
      for (const pattern of selector.patterns) {
        const recursivePattern = pattern.startsWith('**') ? pattern : `**/${pattern}`;
        const matches = await glob(recursivePattern, { cwd: root, absolute: true });
        matches.forEach(f => allFiles.add(f));
      }
    }
    if (selector.folders) {
      for (const folder of selector.folders) {
        const recursivePattern = `**/${folder}/**/*.{spec.ts,vero}`;
        const matches = await glob(recursivePattern, { cwd: root, absolute: true });
        matches.forEach(f => allFiles.add(f));
      }
    }
  }

  // If nothing resolved and no explicit patterns/folders given, use default
  if (
    allFiles.size === 0 &&
    (!selector.patterns || selector.patterns.length === 0) &&
    (!selector.folders || selector.folders.length === 0)
  ) {
    const matches = await glob('**/*.{spec.ts,vero}', { cwd: root, absolute: true });
    matches.forEach(f => allFiles.add(f));
  }

  const resolvedFiles = Array.from(allFiles).sort();

  // If tags are specified, filter .vero files to only matching scenarios
  if (selector.tags && selector.tags.length > 0) {
    const normalizedTags = normalizeTags(selector.tags);
    const tagMode = selector.tagMode || 'any';
    const matchingTargets: ResolvedTestTarget[] = [];

    for (const filePath of resolvedFiles) {
      // Non-vero files pass through (e.g. .spec.ts files can't have vero tags)
      if (!filePath.endsWith('.vero')) {
        matchingTargets.push({ filePath });
        continue;
      }
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const feature = extractScenariosFromVero(content, filePath);
        if (!feature) continue;

        const matchingScenarioNames = feature.scenarios
          .filter((scenario) => {
          const scenarioTags = scenario.tags.map((t) => t.toLowerCase());
          if (tagMode === 'all') {
            return normalizedTags.every((t) => scenarioTags.includes(t));
          }
          // 'any' mode: at least one tag matches
          return normalizedTags.some((t) => scenarioTags.includes(t));
          })
          .map((scenario) => scenario.name);

        if (matchingScenarioNames.length > 0) {
          matchingTargets.push({
            filePath,
            scenarioNames: Array.from(new Set(matchingScenarioNames)),
          });
        }
      } catch {
        // Can't read file, skip it
      }
    }

    return matchingTargets;
  }

  return resolvedFiles.map((filePath) => ({ filePath }));
}

/**
 * Backward-compatible resolver returning only file paths.
 */
export async function resolveTestFiles(
  selector: TestSelector,
  basePath?: string,
  projectId?: string
): Promise<string[]> {
  const plan = await resolveTestPlan(selector, basePath, projectId);
  return plan.map((target) => target.filePath);
}

/**
 * Parse a test pattern string (from MongoScheduledTest.testPattern) into a TestSelector.
 */
export function parseTestPattern(testPattern: string): TestSelector {
  const patterns = testPattern.split(/\s+/).filter(Boolean);
  return { patterns };
}
