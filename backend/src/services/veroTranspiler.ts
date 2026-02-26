import { compile, type ScenarioSelectionOptions, type TranspileResult } from 'vero-lang';

export interface ParameterCombination {
  label: string;
  values: Record<string, string>;
}

export interface TranspileOptions {
  debugMode?: boolean;
  selection?: ScenarioSelectionOptions;
  combinations?: ParameterCombination[];
}

const PLAYWRIGHT_IMPORT =
  "import { test as base, expect, Page, Locator, mergeTests } from '@playwright/test';";

const DATA_MANAGER_IMPORT =
  "import { DataManager, createDataManager, eq, neq, gt, lt, gte, lte, contains, startsWith, endsWith, matches, isIn, notIn, isEmpty, isNotEmpty, isNull, and, or, not } from 'vero-lang/dist/runtime/DataManager.js';";
const TEST_DATA_API_IMPORT =
  "import { testDataApi } from 'vero-lang/dist/api/testDataApi.js';";
const VERO_UTILS_IMPORT =
  "import { veroString, veroDate, veroNumber, veroConvert, veroGenerate } from 'vero-lang/dist/runtime/VeroUtils.js';";
const ALLURE_IMPORT =
  "import { parentSuite, suite, subSuite, label as allureLabel, tag as allureTag } from 'allure-js-commons';";

interface SanitizedFixture {
  code: string;
  factoryName: string | null;
}

export interface SnapshotFeatureTitle {
  baseTitle: string;
  comboLabel?: string;
}

export interface SnapshotLegacyMatchContext {
  featureSegment: string;
  scenarioSegment: string;
  comboSegment?: string;
}

export function normalizeSnapshotSegment(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return 'unnamed';
  const normalized = trimmed
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '');
  return normalized || 'unnamed';
}

export function normalizeSnapshotCompareKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function parseFeatureTitleForSnapshot(title: string): SnapshotFeatureTitle {
  const trimmed = title.trim();
  const match = trimmed.match(/^(.*)\s+\[([^\]]+)\]\s*$/);
  if (!match) {
    return { baseTitle: trimmed || 'feature' };
  }
  return {
    baseTitle: match[1]?.trim() || 'feature',
    comboLabel: match[2]?.trim() || undefined,
  };
}

export function stripScenarioTagsForSnapshot(title: string): string {
  const stripped = title.replace(/(?:\s+@[A-Za-z0-9_-]+)+\s*$/, '').trim();
  return stripped || 'scenario';
}

export function sanitizeSnapshotCombinationLabel(label?: string): string | undefined {
  if (!label) return undefined;
  const parts = label
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return undefined;
  }

  const sanitized = parts
    .map((part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex < 0) {
        return normalizeSnapshotSegment(part);
      }
      const key = normalizeSnapshotSegment(part.slice(0, separatorIndex));
      const value = normalizeSnapshotSegment(part.slice(separatorIndex + 1));
      return `${key}-${value}`.replace(/^-+|-+$/g, '');
    })
    .filter(Boolean);

  return sanitized.length > 0 ? sanitized.join('__') : undefined;
}

export function scoreLegacySnapshotCandidateRelativePath(
  candidateRelativeDir: string,
  context: SnapshotLegacyMatchContext,
): number {
  const haystack = normalizeSnapshotCompareKey(candidateRelativeDir);
  const featureKey = normalizeSnapshotCompareKey(context.featureSegment);
  const scenarioKey = normalizeSnapshotCompareKey(context.scenarioSegment);
  const comboKey = normalizeSnapshotCompareKey(context.comboSegment || '');

  if (comboKey && !haystack.includes(comboKey)) {
    return -1;
  }

  const featureMatches = featureKey ? haystack.includes(featureKey) : false;
  const scenarioMatches = scenarioKey ? haystack.includes(scenarioKey) : false;
  if (!featureMatches && !scenarioMatches) {
    return -1;
  }

  let score = 0;
  if (featureMatches) score += 3;
  if (scenarioMatches) score += 3;
  if (comboKey) score += 5;
  return score;
}

function stripImports(code: string): string {
  const lines = code.split('\n');
  const kept: string[] = [];
  let skippingImport = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!skippingImport && trimmed.startsWith('import ')) {
      if (!trimmed.endsWith(';')) {
        skippingImport = true;
      }
      continue;
    }

    if (skippingImport) {
      if (trimmed.endsWith(';')) {
        skippingImport = false;
      }
      continue;
    }

    kept.push(line);
  }

  return kept.join('\n');
}

function stripExportStatements(code: string): string {
  return code
    .replace(/^\s*export\s+\{[^}]*\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '')
    .replace(/^(\s*)export\s+default\s+/gm, '$1')
    .replace(/^(\s*)export\s+/gm, '$1');
}

function collapseWhitespace(code: string): string {
  return code
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sanitizeModule(code: string): string {
  return collapseWhitespace(stripExportStatements(stripImports(code)));
}

function sanitizeFixtureModule(code: string): SanitizedFixture {
  const sanitized = sanitizeModule(code)
    .replace(/^\s*const\s+test\s*=\s*\w+\s*;\s*$/gm, '')
    .trim();

  const factoryMatch = sanitized.match(/const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*base\.extend\s*</);

  return {
    code: collapseWhitespace(sanitized),
    factoryName: factoryMatch?.[1] || null,
  };
}

function buildRuntimeImports(testSource: string): string[] {
  const imports: string[] = [];

  const needsVeroSnapshotHelper = /\b__veroExpectScreenshot\s*\(/.test(testSource);
  const needsDataManager = /\bcreateDataManager\s*\(|\bDataManager\b/.test(testSource);
  const needsTestDataApi = /\btestDataApi\b/.test(testSource);
  const needsVeroUtils = /\bvero(?:String|Date|Number|Convert|Generate)\b/.test(testSource);
  const needsPath = needsVeroSnapshotHelper || /\bpath\.join\b/.test(testSource);
  const needsFsPromises = needsVeroSnapshotHelper || /\bfsPromises\b/.test(testSource);

  if (needsDataManager) imports.push(DATA_MANAGER_IMPORT);
  if (needsTestDataApi) imports.push(TEST_DATA_API_IMPORT);
  if (needsVeroUtils) imports.push(VERO_UTILS_IMPORT);
  if (needsPath) imports.push("import path from 'path';");
  if (needsFsPromises) imports.push("import fsPromises from 'fs/promises';");

  const needsAllure = /\b(?:parentSuite|suite|subSuite|allureLabel|allureTag)\s*\(/.test(testSource);
  if (needsAllure) imports.push(ALLURE_IMPORT);

  return imports;
}

const VERO_SNAPSHOT_HELPER = [
  "interface __VeroSnapshotMigrationContext {",
  "  featureSegment: string;",
  "  scenarioSegment: string;",
  "  comboSegment?: string;",
  "}",
  "",
  "const __veroSnapshotMigrationCache = new Set<string>();",
  "const __veroSnapshotMigrationLogged = new Set<string>();",
  "const __veroLegacyCandidateCache = new Map<string, string[]>();",
  "",
  "function __veroNormalizeSnapshotSegment(value: string): string {",
  "  const trimmed = value.trim();",
  "  if (!trimmed) return 'unnamed';",
  "  const normalized = trimmed",
  "    .replace(/\\s+/g, '-')",
  "    .replace(/[^A-Za-z0-9._-]+/g, '-')",
  "    .replace(/-+/g, '-')",
  "    .replace(/^[-_.]+|[-_.]+$/g, '');",
  "  return normalized || 'unnamed';",
  "}",
  "",
  "function __veroNormalizeSnapshotCompareKey(value: string): string {",
  "  return value",
  "    .toLowerCase()",
  "    .replace(/[^a-z0-9]+/g, '');",
  "}",
  "",
  "function __veroParseFeatureTitle(title: string): { baseTitle: string; comboLabel?: string } {",
  "  const trimmed = title.trim();",
  "  const match = trimmed.match(/^(.*)\\s+\\[([^\\]]+)\\]\\s*$/);",
  "  if (!match) {",
  "    return { baseTitle: trimmed || 'feature' };",
  "  }",
  "  return {",
  "    baseTitle: match[1]?.trim() || 'feature',",
  "    comboLabel: match[2]?.trim() || undefined,",
  "  };",
  "}",
  "",
  "function __veroStripScenarioTags(title: string): string {",
  "  const stripped = title.replace(/(?:\\s+@[A-Za-z0-9_-]+)+\\s*$/, '').trim();",
  "  return stripped || 'scenario';",
  "}",
  "",
  "function __veroSanitizeComboLabel(label?: string): string | undefined {",
  "  if (!label) return undefined;",
  "  const parts = label",
  "    .split(',')",
  "    .map((part) => part.trim())",
  "    .filter(Boolean);",
  "  if (parts.length === 0) return undefined;",
  "",
  "  const sanitized = parts",
  "    .map((part) => {",
  "      const separatorIndex = part.indexOf('=');",
  "      if (separatorIndex < 0) {",
  "        return __veroNormalizeSnapshotSegment(part);",
  "      }",
  "      const key = __veroNormalizeSnapshotSegment(part.slice(0, separatorIndex));",
  "      const value = __veroNormalizeSnapshotSegment(part.slice(separatorIndex + 1));",
  "      return `${key}-${value}`.replace(/^-+|-+$/g, '');",
  "    })",
  "    .filter(Boolean);",
  "",
  "  return sanitized.length > 0 ? sanitized.join('__') : undefined;",
  "}",
  "",
  "function __veroScoreLegacySnapshotCandidate(relativeDir: string, context: __VeroSnapshotMigrationContext): number {",
  "  const haystack = __veroNormalizeSnapshotCompareKey(relativeDir);",
  "  const featureKey = __veroNormalizeSnapshotCompareKey(context.featureSegment);",
  "  const scenarioKey = __veroNormalizeSnapshotCompareKey(context.scenarioSegment);",
  "  const comboKey = __veroNormalizeSnapshotCompareKey(context.comboSegment || '');",
  "",
  "  if (comboKey && !haystack.includes(comboKey)) return -1;",
  "",
  "  const featureMatches = featureKey ? haystack.includes(featureKey) : false;",
  "  const scenarioMatches = scenarioKey ? haystack.includes(scenarioKey) : false;",
  "  if (!featureMatches && !scenarioMatches) return -1;",
  "",
  "  let score = 0;",
  "  if (featureMatches) score += 3;",
  "  if (scenarioMatches) score += 3;",
  "  if (comboKey) score += 5;",
  "  return score;",
  "}",
  "",
  "async function __veroPathExists(filePath: string): Promise<boolean> {",
  "  try {",
  "    await fsPromises.access(filePath);",
  "    return true;",
  "  } catch {",
  "    return false;",
  "  }",
  "}",
  "",
  "async function __veroCollectLegacyCandidates(platformRoot: string, fileName: string): Promise<string[]> {",
  "  const cacheKey = `${platformRoot}::${fileName}`;",
  "  const cached = __veroLegacyCandidateCache.get(cacheKey);",
  "  if (cached) return cached;",
  "",
  "  const matches: string[] = [];",
  "",
  "  async function walk(dir: string): Promise<void> {",
  "    let entries: Array<import('fs').Dirent> = [];",
  "    try {",
  "      entries = await fsPromises.readdir(dir, { withFileTypes: true });",
  "    } catch {",
  "      return;",
  "    }",
  "",
  "    for (const entry of entries) {",
  "      const fullPath = path.join(dir, entry.name);",
  "      if (entry.isDirectory()) {",
  "        await walk(fullPath);",
  "        continue;",
  "      }",
  "      if (entry.isFile() && entry.name === fileName) {",
  "        matches.push(fullPath);",
  "      }",
  "    }",
  "  }",
  "",
  "  await walk(platformRoot);",
  "  __veroLegacyCandidateCache.set(cacheKey, matches);",
  "  return matches;",
  "}",
  "",
  "async function __veroMaybeMigrateLegacySnapshot(",
  "  expectedPath: string,",
  "  screenshotFileName: string,",
  "  context: __VeroSnapshotMigrationContext,",
  "): Promise<void> {",
  "  if (__veroSnapshotMigrationCache.has(expectedPath)) return;",
  "",
  "  if (await __veroPathExists(expectedPath)) {",
  "    __veroSnapshotMigrationCache.add(expectedPath);",
  "    return;",
  "  }",
  "",
  "  const baseDir = (process.env.VERO_SNAPSHOT_BASE_DIR || '').trim();",
  "  if (!baseDir) return;",
  "",
  "  const relativeToBase = path.relative(baseDir, expectedPath);",
  "  if (!relativeToBase || relativeToBase.startsWith('..') || path.isAbsolute(relativeToBase)) return;",
  "",
  "  const relativeParts = relativeToBase.split(path.sep).filter(Boolean);",
  "  if (relativeParts.length === 0) return;",
  "",
  "  const platformRoot = path.join(baseDir, relativeParts[0]);",
  "  const candidates = await __veroCollectLegacyCandidates(platformRoot, screenshotFileName);",
  "  if (candidates.length === 0) return;",
  "",
  "  let bestCandidate: string | undefined;",
  "  let bestScore = -1;",
  "  let tied = false;",
  "",
  "  for (const candidate of candidates) {",
  "    const relativeDir = path.dirname(path.relative(platformRoot, candidate));",
  "    const score = __veroScoreLegacySnapshotCandidate(relativeDir, context);",
  "    if (score < 0) continue;",
  "",
  "    if (score > bestScore) {",
  "      bestScore = score;",
  "      bestCandidate = candidate;",
  "      tied = false;",
  "      continue;",
  "    }",
  "",
  "    if (score === bestScore) {",
  "      tied = true;",
  "    }",
  "  }",
  "",
  "  if (!bestCandidate || tied) return;",
  "",
  "  await fsPromises.mkdir(path.dirname(expectedPath), { recursive: true });",
  "  await fsPromises.copyFile(bestCandidate, expectedPath);",
  "  __veroSnapshotMigrationCache.add(expectedPath);",
  "",
  "  if (!__veroSnapshotMigrationLogged.has(expectedPath)) {",
  "    console.info('[Vero Snapshot] Migrated legacy baseline', {",
  "      from: bestCandidate,",
  "      to: expectedPath,",
  "    });",
  "    __veroSnapshotMigrationLogged.add(expectedPath);",
  "  }",
  "}",
  "",
  "async function __veroExpectScreenshot(",
  "  target: unknown,",
  "  testInfo: import('@playwright/test').TestInfo,",
  "  screenshotName?: string,",
  "  options?: Record<string, unknown>,",
  "): Promise<void> {",
  "  if (!screenshotName) {",
  "    if (options) {",
  "      await expect(target as any).toHaveScreenshot(options as any);",
  "    } else {",
  "      await expect(target as any).toHaveScreenshot();",
  "    }",
  "    return;",
  "  }",
  "",
  "  const titlePath = testInfo.titlePath || [];",
  "  const rawFeatureTitle = titlePath.length >= 2 ? titlePath[titlePath.length - 2] : 'feature';",
  "  const rawScenarioTitle = testInfo.title || 'scenario';",
  "",
  "  const { baseTitle, comboLabel } = __veroParseFeatureTitle(rawFeatureTitle);",
  "  const featureSegment = __veroNormalizeSnapshotSegment(baseTitle || 'feature');",
  "  const scenarioSegment = __veroNormalizeSnapshotSegment(__veroStripScenarioTags(rawScenarioTitle));",
  "  const comboSegment = __veroSanitizeComboLabel(comboLabel);",
  "",
  "  const argParts = [featureSegment, scenarioSegment];",
  "  if (comboSegment) argParts.push(comboSegment);",
  "  argParts.push(screenshotName);",
  "",
  "  const snapshotArg = argParts.join('/').replace(/\\\\/g, '/');",
  "  const expectedPath = testInfo.snapshotPath(snapshotArg);",
  "",
  "  await __veroMaybeMigrateLegacySnapshot(expectedPath, screenshotName, {",
  "    featureSegment,",
  "    scenarioSegment,",
  "    comboSegment,",
  "  });",
  "",
  "  if (options) {",
  "    await expect(target as any).toHaveScreenshot(snapshotArg, options as any);",
  "  } else {",
  "    await expect(target as any).toHaveScreenshot(snapshotArg);",
  "  }",
  "}",
].join('\n');

interface BuildSpecOptions {
  combinations?: ParameterCombination[];
}

const DESCRIBE_WITH_TITLE_PATTERN = /(test\.describe(?:\.(?:serial(?:\.(?:skip|only))?|skip|only))?\(\s*)(['"`])([^'"`]+?)\2/;

function patchDescribeLabelForCombination(block: string): string {
  return block.replace(
    DESCRIBE_WITH_TITLE_PATTERN,
    (_match, describePrefix: string, _quote: string, title: string) =>
      `${describePrefix}\`${title} [\${__combo__.label}]\``
  );
}

function buildSingleSpecFromTranspileResult(result: TranspileResult, options: BuildSpecOptions = {}): string {
  const stripEnvDeclaration = (code: string): string =>
    code.replace(/^\s*const __env__.*VERO_ENV_VARS.*$/gm, '').trim();

  const pageBlocks = [...result.pages.values(), ...result.pageActions.values()]
    .map((code) => sanitizeModule(code))
    .filter(Boolean);

  const fixtureBlocksRaw = [...result.fixtures.values()].map((code) => sanitizeFixtureModule(code));
  const fixtureBlocks = fixtureBlocksRaw.map((entry) => entry.code).filter(Boolean);
  const fixtureFactories = fixtureBlocksRaw
    .map((entry) => entry.factoryName)
    .filter((name): name is string => Boolean(name));

  const rawTestBlocks = [...result.tests.values()].map((code) => sanitizeModule(code)).filter(Boolean);
  const pageHasEnvVarDeclaration = pageBlocks.some((block) => /\bconst __env__\b/.test(block));
  const testBlocks = rawTestBlocks.map((block) => (pageHasEnvVarDeclaration ? stripEnvDeclaration(block) : block));

  const testSource = testBlocks.join('\n\n');
  const runtimeSource = [...pageBlocks, ...fixtureBlocks, ...testBlocks].join('\n\n');
  const needsVeroSnapshotHelper = /\b__veroExpectScreenshot\s*\(/.test(testSource);
  const hasEnvVarReference = /\b__env__\b/.test(testSource);
  const hasEnvVarDeclaration = /\bconst\s+__env__\b/.test(testSource);
  const hasRuntimeEnvVarReference = /\b__env__\b/.test(runtimeSource);
  const hasRuntimeEnvVarDeclaration = /\bconst\s+__env__\b/.test(runtimeSource);
  const hasCreateDataManagerReference = /\bcreateDataManager\s*\(/.test(runtimeSource);
  const runtimeImports = buildRuntimeImports(runtimeSource);
  const hasDataManagerImport = runtimeImports.some((importLine) => importLine === DATA_MANAGER_IMPORT);
  if (hasCreateDataManagerReference && !hasDataManagerImport) {
    runtimeImports.unshift(DATA_MANAGER_IMPORT);
  }

  const lines: string[] = [];
  lines.push('// Auto-generated from Vero DSL via vero-lang compiler (single-file backend runtime).');
  lines.push(PLAYWRIGHT_IMPORT);

  for (const runtimeImport of runtimeImports) {
    lines.push(runtimeImport);
  }

  lines.push('');

  if (needsVeroSnapshotHelper) {
    lines.push(VERO_SNAPSHOT_HELPER);
    lines.push('');
  }

  if (pageBlocks.length > 0) {
    lines.push(pageBlocks.join('\n\n'));
    lines.push('');
  }

  if (fixtureBlocks.length > 0) {
    lines.push(fixtureBlocks.join('\n\n'));
    lines.push('');
  }

  if (fixtureFactories.length === 0) {
    lines.push('const test = base;');
  } else if (fixtureFactories.length === 1) {
    lines.push(`const test = ${fixtureFactories[0]};`);
  } else {
    lines.push(`const test = mergeTests(${fixtureFactories.join(', ')});`);
  }

  lines.push('');

  const combinations = options.combinations;
  if (combinations && combinations.length > 1) {
    // Parameterized: wrap test blocks in a loop over combinations
    lines.push("const __baseEnv__: Record<string, string> = JSON.parse(process.env.VERO_ENV_VARS || '{}');");
    lines.push(`const __paramCombinations__ = ${JSON.stringify(combinations, null, 2)};`);
    lines.push('');
    lines.push('for (const __combo__ of __paramCombinations__) {');
    lines.push('  const __env__: Record<string, string> = { ...__baseEnv__, ...__combo__.values };');
    lines.push('');

    // Indent test blocks and patch: strip original __env__ line, append combo label to describe name
    for (const block of testBlocks) {
      const patched = block
        // Remove the original VERO_ENV_VARS line (the loop provides __env__ per combo)
        .replace(/^\s*const __env__.*VERO_ENV_VARS.*$/gm, '');
      const withCombinationLabel = patchDescribeLabelForCombination(patched);
      const indented = withCombinationLabel.split('\n').map((line) => '  ' + line).join('\n');
      lines.push(indented);
      lines.push('');
    }

    lines.push('}');
  } else if (testBlocks.length > 0) {
    // Defensive fallback: inject a single shared __env__ declaration when runtime
    // references it but no declaration exists after block normalization/deduping.
    if ((hasRuntimeEnvVarReference || hasEnvVarReference) && !hasRuntimeEnvVarDeclaration && !hasEnvVarDeclaration) {
      lines.push("const __env__: Record<string, string> = JSON.parse(process.env.VERO_ENV_VARS || '{}');");
      lines.push('');
    }
    lines.push(testBlocks.join('\n\n'));
  }

  return collapseWhitespace(lines.join('\n'));
}

function formatCompileErrors(errors: Array<{ message: string; line?: number }>): string {
  return errors
    .map((error) => {
      const prefix = typeof error.line === 'number' ? `Line ${error.line}: ` : '';
      return `${prefix}${error.message}`;
    })
    .join('\n');
}

/**
 * Unified Vero transpilation entrypoint for backend runtime.
 * This delegates parser/validator/transpiler work to vero-lang so grammar logic
 * is centralized in one place.
 */
export function transpileVero(veroCode: string, options: TranspileOptions = {}): string {
  const compilation = compile(veroCode, {
    debugMode: options.debugMode === true,
    selection: options.selection,
  });

  if (!compilation.success || !compilation.result) {
    const details = formatCompileErrors(compilation.errors || []);
    throw new Error(`Vero compilation failed${details ? `:\n${details}` : ''}`);
  }

  return buildSingleSpecFromTranspileResult(compilation.result, {
    combinations: options.combinations,
  });
}
