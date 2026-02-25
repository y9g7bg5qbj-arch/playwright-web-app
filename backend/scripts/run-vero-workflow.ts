import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { basename, extname, isAbsolute, join, resolve } from 'path';
import {
  applyScenarioSelection,
  collectFeatureReferences,
  parse,
  type ScenarioSelectionOptions,
  tokenize,
  validate
} from 'vero-lang';
import { transpileVero } from '../src/services/veroTranspiler';
import { resolveVeroScenarioSelection } from '../src/routes/veroRunExecution.utils';
import { computeParameterizedCombinations } from '../src/services/matrixCombinations';
import { scanForScenarios } from '../src/routes/veroScenarioIndex.utils';

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

function decodeBase64Utf8(value: string): string {
  return Buffer.from(value, 'base64').toString('utf8');
}

function decodeBase64JsonArray(value?: string): string[] | undefined {
  if (!value || !value.trim()) {
    return undefined;
  }

  const decoded = decodeBase64Utf8(value.trim());
  const parsed = JSON.parse(decoded);
  if (!Array.isArray(parsed)) {
    throw new Error('Expected a JSON array payload for base64-encoded list input.');
  }

  return parsed
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

type VeroSelectionScope = 'active-file' | 'current-sandbox';

interface PlannedVeroFile {
  filePath: string;
  absolutePath: string;
  content?: string;
}

function resolveSelectionScope(value: string | undefined): VeroSelectionScope {
  return value === 'active-file' ? 'active-file' : 'current-sandbox';
}

function resolveRepoPath(repoRoot: string, maybeRelativePath: string): string {
  if (isAbsolute(maybeRelativePath)) {
    return maybeRelativePath;
  }
  const candidate = resolve(repoRoot, maybeRelativePath);
  if (existsSync(candidate)) {
    return candidate;
  }
  const veroProjectsCandidate = resolve(repoRoot, 'vero-projects', maybeRelativePath);
  if (existsSync(veroProjectsCandidate)) {
    return veroProjectsCandidate;
  }
  return candidate;
}

function detectProjectRoot(filePath: string, defaultRoot: string): string {
  const pathParts = filePath.split(/[\\/]/);
  const isAbsolutePath = filePath.startsWith('/');

  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i].toLowerCase();
    if (part === 'features' || part === 'pages' || part === 'pageactions') {
      const projectPathParts = pathParts.slice(0, i).join('/');
      return isAbsolutePath
        ? projectPathParts
        : (projectPathParts ? join(defaultRoot, projectPathParts) : defaultRoot);
    }
  }

  return defaultRoot;
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

async function planVeroFilesForRun(options: {
  repoRoot: string;
  filePathInput: string;
  content: string;
  selectionScope: VeroSelectionScope;
}): Promise<PlannedVeroFile[]> {
  const { repoRoot, filePathInput, content, selectionScope } = options;

  if (!filePathInput) {
    return [
      {
        filePath: 'inline.vero',
        absolutePath: join(repoRoot, '.vero-inline', 'inline.vero'),
        content,
      },
    ];
  }

  const absoluteActivePath = resolveRepoPath(repoRoot, filePathInput);
  const activePlan: PlannedVeroFile = {
    filePath: filePathInput,
    absolutePath: absoluteActivePath,
    content,
  };

  if (selectionScope !== 'current-sandbox') {
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

  return Array.from(absolutePaths)
    .sort((a, b) => a.localeCompare(b))
    .map((absolutePath) => ({
      filePath: absolutePath === absoluteActivePath ? filePathInput : absolutePath,
      absolutePath,
      content: absolutePath === absoluteActivePath ? content : undefined,
    }));
}

async function loadReferencedPages(pageNames: string[], projectRoot: string): Promise<string> {
  let combinedContent = '';

  for (const pageName of pageNames) {
    const pageFilePath = join(projectRoot, 'Pages', `${pageName}.vero`);
    const pageActionsFilePath = join(projectRoot, 'PageActions', `${pageName}.vero`);

    try {
      combinedContent += `${await readFile(pageFilePath, 'utf-8')}\n\n`;
      continue;
    } catch {
      // Fall through to PageActions folder.
    }

    try {
      combinedContent += `${await readFile(pageActionsFilePath, 'utf-8')}\n\n`;
    } catch {
      // Ignore missing references; validator will report unresolved usage when needed.
    }
  }

  return combinedContent;
}

function extractReferencedPageNames(veroContent: string): string[] {
  try {
    const lexResult = tokenize(veroContent);
    if (lexResult.errors.length > 0) {
      return [];
    }

    const parseResult = parse(lexResult.tokens);
    const refs = new Set<string>();
    for (const feature of parseResult.ast.features || []) {
      for (const name of collectFeatureReferences(feature)) {
        refs.add(name);
      }
    }
    return [...refs];
  } catch {
    return [];
  }
}

function countScenariosInProgram(program: any): number {
  if (program && Array.isArray(program.features)) {
    return program.features.reduce((count: number, feature: any) => {
      if (Array.isArray(feature?.scenarios)) {
        return count + feature.scenarios.length;
      }
      return count;
    }, 0);
  }

  if (program && Array.isArray(program.declarations)) {
    return program.declarations.reduce((count: number, declaration: any) => {
      if (declaration?.type === 'feature' && Array.isArray(declaration.scenarios)) {
        return count + declaration.scenarios.length;
      }
      return count;
    }, 0);
  }

  return 0;
}

function isNoScenariosMatchedError(message: string): boolean {
  return message.toLowerCase().includes('no scenarios matched');
}

function assertValidVero(combinedContent: string, selection?: ScenarioSelectionOptions): {
  selectedScenarios: number;
  totalScenarios: number;
} {
  const lexResult = tokenize(combinedContent);
  if (lexResult.errors.length > 0) {
    const message = lexResult.errors.map((e: any) => `Line ${e.line}: ${e.message}`).join('\n');
    throw new Error(`Syntax errors prevent execution:\n${message}`);
  }

  const parseResult = parse(lexResult.tokens);
  if (parseResult.errors.length > 0) {
    const message = parseResult.errors.map((e: any) => `Line ${e.line}: ${e.message}`).join('\n');
    throw new Error(`Parse errors prevent execution:\n${message}`);
  }

  let selectedAst = parseResult.ast;
  const totalScenarios = countScenariosInProgram(parseResult.ast);
  let selectedScenarios = totalScenarios;

  if (selection) {
    const selected = applyScenarioSelection(parseResult.ast, selection);
    selectedAst = selected.program;
    selectedScenarios = selected.diagnostics.selectedScenarios;
  }

  const validationResult = validate(selectedAst);
  if (!validationResult.valid && validationResult.errors.length > 0) {
    const message = validationResult.errors
      .map((e: any) => `${e.line ? `Line ${e.line}: ` : ''}${e.message}${e.suggestion ? ` (${e.suggestion})` : ''}`)
      .join('\n');
    throw new Error(`Validation errors prevent execution:\n${message}`);
  }

  return { selectedScenarios, totalScenarios };
}

async function run(): Promise<void> {
  const backendDir = resolve(__dirname, '..');
  const repoRoot = resolve(backendDir, '..');
  const veroProjectsRoot = resolve(repoRoot, 'vero-projects');

  const runId = randomUUID();
  const tempRootDir = join(backendDir, '.vero-ci');
  const tempSpecFiles: string[] = [];
  const runResultsDir = join(tempRootDir, 'test-results', runId);
  const resultsJsonPath = join(runResultsDir, 'results.json');
  const outputDir = join(runResultsDir, 'artifacts');
  const allureResultsDir = join(runResultsDir, 'allure-results');

  await mkdir(runResultsDir, { recursive: true });
  await mkdir(tempRootDir, { recursive: true });

  try {
    const veroFilePathInput = process.env.VERO_FILE_PATH?.trim() || '';
    const encodedContent = process.env.VERO_CONTENT_B64?.trim() || '';
    const encodedReferencedContent = process.env.VERO_REFERENCED_CONTENT_B64?.trim() || '';
    const selectionScope = resolveSelectionScope(normalizeOptionalString(process.env.SELECTION_SCOPE));
    const injectedReferencedContent = encodedReferencedContent
      ? decodeBase64Utf8(encodedReferencedContent)
      : '';

    let veroContent = encodedContent ? decodeBase64Utf8(encodedContent) : '';
    if (!veroContent && veroFilePathInput) {
      const absolutePath = resolveRepoPath(repoRoot, veroFilePathInput);
      veroContent = await readFile(absolutePath, 'utf-8');
    }

    if (!veroContent) {
      throw new Error('No Vero content supplied. Provide VERO_CONTENT_B64 or VERO_FILE_PATH.');
    }

    const plannedFiles = await planVeroFilesForRun({
      repoRoot,
      filePathInput: veroFilePathInput,
      content: veroContent,
      selectionScope,
    });

    const scenarioName = normalizeOptionalString(process.env.SCENARIO_NAME);
    const tagExpression = normalizeOptionalString(process.env.TAG_EXPRESSION);
    const namePatterns = decodeBase64JsonArray(process.env.NAME_PATTERNS_B64);
    const tags = decodeBase64JsonArray(process.env.TAGS_B64);
    const excludeTags = decodeBase64JsonArray(process.env.EXCLUDE_TAGS_B64);
    const tagMode = normalizeOptionalString(process.env.TAG_MODE) || 'any';
    const grep = normalizeOptionalString(process.env.GREP);
    const grepInvert = normalizeOptionalString(process.env.GREP_INVERT);
    const lastFailed = normalizeOptionalString(process.env.LAST_FAILED);

    const scenarioSelection = resolveVeroScenarioSelection({
      scenarioName,
      config: {
        tagExpression,
        namePatterns,
        tags,
        tagMode,
        excludeTags,
      },
    });

    const workers = toPositiveInteger(process.env.WORKERS, 1);
    const shardIndex = toPositiveInteger(process.env.SHARD_INDEX, 1);
    const shardTotal = toPositiveInteger(process.env.SHARD_TOTAL, 1);
    const retries = toNonNegativeInteger(process.env.RETRIES, 0);
    const timeoutMs = toPositiveInteger(process.env.TIMEOUT_MS, 60000);
    const headless = (process.env.HEADLESS || 'true').toLowerCase() !== 'false';
    const envVarsB64 = process.env.ENV_VARS_B64?.trim();
    const parameterizedNames = decodeBase64JsonArray(process.env.PARAMETERIZED_NAMES_B64) || [];
    const baseUrl = process.env.BASE_URL?.trim();

    let envVarsMap: Record<string, string> | undefined;
    if (envVarsB64) {
      const decodedEnvVars = JSON.parse(decodeBase64Utf8(envVarsB64));
      if (typeof decodedEnvVars !== 'object' || decodedEnvVars === null || Array.isArray(decodedEnvVars)) {
        throw new Error('ENV_VARS_B64 must decode to a JSON object.');
      }
      envVarsMap = Object.entries(decodedEnvVars).reduce<Record<string, string>>((acc, [key, value]) => {
        acc[key] = String(value ?? '');
        return acc;
      }, {});
    }

    let paramCombinations:
      | Array<{ label: string; values: Record<string, string> }>
      | undefined;
    if (envVarsMap && parameterizedNames.length > 0) {
      const { combinations, baseEnvVars } = computeParameterizedCombinations(envVarsMap, parameterizedNames);
      if (combinations.length > 1) {
        paramCombinations = combinations;
        envVarsMap = baseEnvVars;
      }
    }

    let totalScenarios = 0;
    let selectedScenarios = 0;

    for (const [index, plannedFile] of plannedFiles.entries()) {
      let fileContent = plannedFile.content;
      if (!fileContent) {
        try {
          fileContent = await readFile(plannedFile.absolutePath, 'utf-8');
        } catch {
          if (selectionScope === 'current-sandbox') {
            continue;
          }
          throw new Error(`Unable to read Vero file: ${plannedFile.absolutePath}`);
        }
      }

      const projectRoot = detectProjectRoot(plannedFile.absolutePath, veroProjectsRoot);
      const pageNames = extractReferencedPageNames(fileContent);
      let referencedContent = await loadReferencedPages(pageNames, projectRoot);
      if (!referencedContent.trim() && injectedReferencedContent) {
        referencedContent = injectedReferencedContent;
      }
      const combinedContent = `${referencedContent}${fileContent}`;

      let diagnostics: { selectedScenarios: number; totalScenarios: number };
      try {
        diagnostics = assertValidVero(combinedContent, scenarioSelection);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (selectionScope === 'current-sandbox' && scenarioSelection && isNoScenariosMatchedError(message)) {
          continue;
        }
        throw error;
      }

      totalScenarios += diagnostics.totalScenarios;
      if (diagnostics.selectedScenarios === 0) {
        if (selectionScope === 'current-sandbox') {
          continue;
        }
        throw new Error('No scenarios matched the provided selection.');
      }
      selectedScenarios += diagnostics.selectedScenarios;

      const playwrightCode = transpileVero(combinedContent, {
        selection: scenarioSelection,
        combinations: paramCombinations,
      });

      const fileNameSeed = basename(
        plannedFile.filePath || plannedFile.absolutePath,
        extname(plannedFile.filePath || plannedFile.absolutePath)
      )
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .slice(0, 60) || 'spec';
      const tempSpecFile = join(tempRootDir, `.vero-dispatch-${runId}-${index}-${fileNameSeed}.spec.mts`);
      await writeFile(tempSpecFile, playwrightCode, 'utf-8');
      tempSpecFiles.push(tempSpecFile);
    }

    if (tempSpecFiles.length === 0) {
      throw new Error('No scenarios matched the provided selection.');
    }

    const combinationCount = paramCombinations && paramCombinations.length > 1 ? paramCombinations.length : 1;
    console.log(
      `[Vero Workflow] Scope=${selectionScope}, files=${tempSpecFiles.length}, scenarios=${selectedScenarios}/${totalScenarios}, parameterCombinations=${combinationCount}, plannedInvocations=${selectedScenarios * combinationCount}`
    );

    const envVarsJson = envVarsMap && Object.keys(envVarsMap).length > 0
      ? JSON.stringify(envVarsMap)
      : undefined;

    const args = [
      'playwright',
      'test',
      ...tempSpecFiles,
      `--workers=${workers}`,
      `--retries=${retries}`,
      `--timeout=${timeoutMs}`,
    ];
    if (shardTotal > 1) {
      const boundedShardIndex = Math.min(Math.max(shardIndex, 1), shardTotal);
      args.push(`--shard=${boundedShardIndex}/${shardTotal}`);
    }

    if (!headless) {
      args.push('--headed');
    }

    const applySecondaryTitleFilters = !scenarioName;
    if (applySecondaryTitleFilters && grep) {
      args.push('--grep', grep);
    }

    if (applySecondaryTitleFilters && grepInvert) {
      args.push('--grep-invert', grepInvert);
    }

    if (applySecondaryTitleFilters && lastFailed && lastFailed.toLowerCase() === 'true') {
      args.push('--last-failed');
    }

    if (baseUrl) {
      args.push(`--base-url=${baseUrl}`);
    }

    const child = spawn('npx', args, {
      cwd: backendDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        VERO_RESULTS_JSON_PATH: resultsJsonPath,
        VERO_OUTPUT_DIR: outputDir,
        VERO_ALLURE_RESULTS_DIR: allureResultsDir,
        VERO_TRACE_MODE: 'on',
        ...(envVarsJson ? { VERO_ENV_VARS: envVarsJson } : {}),
      },
    });

    const exitCode = await new Promise<number>((resolveCode, rejectCode) => {
      child.once('error', rejectCode);
      child.once('close', (code) => resolveCode(code ?? 1));
    });

    if (!existsSync(resultsJsonPath)) {
      throw new Error('Playwright completed without producing JSON results.');
    }

    process.exit(exitCode);
  } finally {
    for (const tempSpecFile of tempSpecFiles) {
      try {
        await unlink(tempSpecFile);
      } catch {
        // Ignore cleanup failures.
      }
    }
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
