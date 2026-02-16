/**
 * VeroRunService — shared execution pipeline for manual and scheduled runs.
 *
 * Consolidates the orchestration logic previously inlined in
 * veroExecution.routes.ts so that scheduleRunWorker.ts (and any future
 * callers) can execute Vero files with the same capabilities:
 *   - Content loading, USE page resolution
 *   - Lex → parse → validate → scenario selection
 *   - Parameterized combination expansion from comma-separated run parameters
 *   - Transpilation, temp spec file creation
 *   - Playwright process spawn with full env
 *   - results.json → execution steps, Allure post-processing
 */

import { spawn } from 'child_process';
import { readFile, writeFile, readdir, mkdir, unlink } from 'fs/promises';
import { join, basename, extname } from 'path';
import { existsSync } from 'fs';
import type { ScenarioSelectionOptions, ScenarioSelectionDiagnostics } from 'vero-lang';
import { buildVeroRunTempSpecFileName, buildVeroRunPlaywrightArgs, resolveVeroScenarioSelection, sanitizePlaywrightArgsForLog, detectVeroRunFailure, preserveStartupFailureSpec, resolvePlaywrightHostPlatformOverride, stripVeroSpecPrefix, VERO_RUN_MODULE_MISMATCH_ERROR_CODE, type VeroRunDiagnostics } from '../routes/veroRunExecution.utils';
import { applicationRepository, projectRepository, executionRepository, executionStepRepository, executionLogRepository, runParameterDefinitionRepository } from '../db/repositories/mongo';
import { detectProjectRoot, loadReferencedPages } from '../routes/veroExecution.utils';
import { resolveEnvironmentRootFromFilePath, ensureEnvironmentResources, resolveVisualSnapshotConfig } from '../routes/veroVisualSnapshots.utils';
import { logger } from '../utils/logger';
import { computeParameterizedCombinations } from './matrixCombinations';
import { planVeroFilesForRun, type VeroSelectionScope } from './veroSelectionPlanner';
import { VERO_PROJECT_PATH } from '../routes/veroProjectPath.utils';

// ─── Constants ──────────────────────────────────────────────────────────────

const STARTUP_FAILURE_DIR = join(VERO_PROJECT_PATH, 'test-results', 'startup-failures');
const STARTUP_FAILURE_RETENTION = 20;
const PROCESS_TIMEOUT_MS = 120_000;

// ─── Public Types ───────────────────────────────────────────────────────────

export interface VeroRunInput {
    /** Relative or absolute path to the .vero file */
    filePath: string;
    /** Optional inline Vero content (skips reading from disk when provided) */
    content?: string;

    // Execution identity
    executionId: string;
    userId?: string;
    projectId?: string;
    /** Needed for run-parameter definition lookup */
    applicationId?: string;
    triggeredBy: 'manual' | 'schedule';

    // How to run
    config?: {
        browserMode?: string;
        workers?: number;
        retries?: number;
        timeout?: number;
        tracing?: string;
        grep?: string;
        grepInvert?: string;
        lastFailed?: boolean;
        selectionScope?: VeroSelectionScope;
        shard?: { current: number; total: number };
        // Visual snapshot options
        visualPreset?: string;
        visualThreshold?: number;
        visualMaxDiffPixels?: number;
        visualMaxDiffPixelRatio?: number;
        updateSnapshotsMode?: string;
        visualUpdateSnapshots?: boolean;
    };

    // Scenario selection
    scenarioName?: string;
    selection?: {
        scenarioName?: string;
        scenarioNames?: string[];
        tagExpression?: string;
        namePatterns?: string[];
        tags?: string[];
        excludeTags?: string[];
        tagMode?: string;
        selectionScope?: VeroSelectionScope;
    };

    // Environment variables — merged in order: envVars → parameterValues → customEnvVars
    environmentVars?: Record<string, string>;
    parameterValues?: Record<string, unknown>;
    customEnvVars?: Record<string, string>;

    /** Auth token forwarded to child process for runtime API calls */
    authToken?: string;
}

export interface VeroRunResult {
    status: 'passed' | 'failed' | 'timeout';
    passed: number;
    failed: number;
    skipped: number;
    durationMs: number;
    exitCode: number;
    generatedCode: string;
    output: string;
    error?: string;
    errorCode?: string;
    diagnostics?: VeroRunDiagnostics;
    allureResultsDir?: string;
    summary?: { passed: number; failed: number; skipped: number };
    scenarios?: Array<{
        name: string;
        status: 'passed' | 'failed' | 'skipped';
        duration: number;
        error?: string;
        steps: Array<{
            stepNumber: number;
            action: string;
            description: string;
            status: 'passed' | 'failed' | 'skipped';
            duration: number;
            error?: string;
        }>;
    }>;
    selectionDiagnostics?: ScenarioSelectionDiagnostics;
    selectionSummary?: {
        selectionScope: VeroSelectionScope;
        selectedFileCount: number;
        selectedScenarioCount: number;
        parameterCombinationCount: number;
        plannedTestInvocations: number;
        selectedFiles: Array<{
            filePath: string;
            selectedScenarioCount: number;
        }>;
    };
    executionSummary?: {
        workers: number;
        shard?: { current: number; total: number };
        selectedFileCount: number;
        selectedScenarioCount: number;
        parameterCombinationCount: number;
        plannedTestInvocations: number;
    };
}

// ─── Env Var Merging ────────────────────────────────────────────────────────

/**
 * Merge environment variable layers in precedence order.
 * Later layers override earlier ones.
 *
 *   base (env manager)  →  parameterValues  →  customEnvVars
 */
export function mergeExecutionEnvironment(
    environmentVars?: Record<string, string>,
    parameterValues?: Record<string, unknown>,
    customEnvVars?: Record<string, string>,
): Record<string, string> {
    const merged: Record<string, string> = {};

    // Layer 1: environment manager variables (base)
    if (environmentVars) {
        for (const [k, v] of Object.entries(environmentVars)) {
            merged[k] = v;
        }
    }

    // Layer 2: parameter values (override)
    // Skip null/undefined entirely so they don't shadow base values with empty strings.
    // Booleans are preserved as 'true'/'false' (env vars are always strings).
    if (parameterValues) {
        for (const [k, v] of Object.entries(parameterValues)) {
            if (v === null || v === undefined) continue;
            merged[k] = String(v);
        }
    }

    // Layer 3: custom env vars from run config (highest precedence)
    if (customEnvVars) {
        for (const [k, v] of Object.entries(customEnvVars)) {
            merged[k] = v;
        }
    }

    return merged;
}

// ─── Service Entry Point ────────────────────────────────────────────────────

export async function executeVeroRun(input: VeroRunInput): Promise<VeroRunResult> {
    const {
        filePath,
        executionId,
        triggeredBy,
        config: runConfig,
    } = input;

    const isHeadless = runConfig?.browserMode === 'headless';
    const requestedSelectionScope = ((input.selection?.selectionScope || runConfig?.selectionScope) as VeroSelectionScope | undefined);
    const hasScenarioNamesSelection = Array.isArray(input.selection?.scenarioNames) && input.selection!.scenarioNames.length > 0;
    const selectionScope = resolveRunSelectionScope({
        requestedScope: requestedSelectionScope,
        triggeredBy,
        scenarioName: input.scenarioName,
        hasScenarioNamesSelection,
    });

    // Resolve project name for Allure breadcrumbs
    const projectName = await resolveProjectName(input.projectId);

    // ── 1. Resolve file execution plan ──────────────────────────────────────
    const plannedFiles = await planVeroFilesForRun({
        filePath,
        content: input.content,
        selectionScope,
    });
    if (plannedFiles.length === 0) {
        throw new VeroRunValidationError('No content provided');
    }

    const environmentRootResolution = resolveEnvironmentRootFromFilePath(plannedFiles[0]?.filePath || filePath, VERO_PROJECT_PATH);
    if (environmentRootResolution.usedFallback) {
        logger.warn('[Vero Run] Unable to infer environment root from file path; using default project root', {
            filePath: filePath || null,
            fallbackRoot: environmentRootResolution.environmentRoot,
        });
    }
    const environmentResources = await ensureEnvironmentResources(environmentRootResolution.environmentRoot);
    const visualSnapshotConfig = resolveVisualSnapshotConfig(runConfig as Record<string, unknown> | null);
    const requestedUpdateSnapshotsMode = visualSnapshotConfig.updateSnapshotsMode;

    // ── 2. Scenario selection ───────────────────────────────────────────────

    const scenarioSelection = resolveVeroScenarioSelection({
        scenarioName: input.scenarioName,
        config: { ...runConfig, ...input.selection } as Record<string, unknown> | null,
    });
    const selectionFilters = scenarioSelection
        ? {
            scenarioNames: [...(scenarioSelection.scenarioNames || [])],
            namePatterns: [...(scenarioSelection.namePatterns || [])],
            tagExpression: scenarioSelection.tagExpression,
        }
        : {
            scenarioNames: [] as string[],
            namePatterns: [] as string[],
            tagExpression: undefined as string | undefined,
        };

    // ── 3. Validate and collect selected files ──────────────────────────────

    const { tokenize, parse, validate, applyScenarioSelection } = await import('vero-lang');
    const selectedFiles: Array<{
        filePath: string;
        combinedContent: string;
        selectedScenarioCount: number;
    }> = [];
    let totalScenariosAcrossFiles = 0;
    let totalSelectedScenarios = 0;

    for (const plannedFile of plannedFiles) {
        const veroContent = plannedFile.content ?? await readFile(plannedFile.absolutePath, 'utf-8');
        const useMatches = veroContent.match(/USE\s+(\w+)/gi) || [];
        const pageNames = useMatches.map((m: string) => m.replace(/USE\s+/i, '').trim());
        const projectRoot = detectProjectRoot(plannedFile.absolutePath, VERO_PROJECT_PATH);
        const referencedContent = await loadReferencedPages(pageNames, projectRoot);
        const combinedContent = referencedContent + veroContent;

        const lexResult = tokenize(combinedContent);
        if (lexResult.errors.length > 0) {
            await executionRepository.update(executionId, { status: 'failed', finishedAt: new Date() });
            const errorMessages = lexResult.errors.map((e: any) => `Line ${e.line}: ${e.message}`).join('\n');
            throw new VeroRunValidationError(`Syntax errors prevent execution:\n${errorMessages}`, lexResult.errors);
        }

        const parseResult = parse(lexResult.tokens);
        if (parseResult.errors.length > 0) {
            await executionRepository.update(executionId, { status: 'failed', finishedAt: new Date() });
            const errorMessages = parseResult.errors.map((e: any) => `Line ${e.line}: ${e.message}`).join('\n');
            throw new VeroRunValidationError(`Parse errors prevent execution:\n${errorMessages}`, parseResult.errors);
        }

        totalScenariosAcrossFiles += countScenariosInProgram(parseResult.ast);
        let selectedAst = parseResult.ast;
        let selectedScenarioCount = countScenariosInProgram(parseResult.ast);

        if (scenarioSelection) {
            try {
                const selectionResult = applyScenarioSelection(parseResult.ast, scenarioSelection);
                selectedAst = selectionResult.program;
                selectedScenarioCount = selectionResult.diagnostics.selectedScenarios;
            } catch (selectionError) {
                const selectionMessage = selectionError instanceof Error ? selectionError.message : String(selectionError);
                if (selectionScope === 'current-sandbox' && isNoScenariosMatchedError(selectionMessage)) {
                    continue;
                }
                await executionRepository.update(executionId, { status: 'failed', finishedAt: new Date() });
                throw new VeroRunSelectionError(selectionMessage, scenarioSelection);
            }
        }

        const validationResult = validate(selectedAst);
        if (!validationResult.valid && validationResult.errors.length > 0) {
            await executionRepository.update(executionId, { status: 'failed', finishedAt: new Date() });
            const errorMessages = validationResult.errors.map((e: any) =>
                `${e.line ? `Line ${e.line}: ` : ''}${e.message}${e.suggestion ? ` (${e.suggestion})` : ''}`
            ).join('\n');
            throw new VeroRunValidationError(`Validation errors prevent execution:\n${errorMessages}`, validationResult.errors);
        }

        if (selectedScenarioCount === 0) {
            continue;
        }

        selectedFiles.push({
            filePath: plannedFile.filePath,
            combinedContent,
            selectedScenarioCount,
        });
        totalSelectedScenarios += selectedScenarioCount;
    }

    if (selectedFiles.length === 0 || totalSelectedScenarios === 0) {
        await executionRepository.update(executionId, { status: 'failed', finishedAt: new Date() });
        const message = scenarioSelection
            ? 'No scenarios matched the provided selection.'
            : 'No executable scenarios were found in the selected scope.';
        throw new VeroRunSelectionError(message, scenarioSelection, {
            selectionScope,
            scannedFileCount: plannedFiles.length,
            selectedFileCount: 0,
            totalScenarios: totalScenariosAcrossFiles,
            selectedScenarios: 0,
        });
    }

    const selectionDiagnostics: ScenarioSelectionDiagnostics = {
        totalScenarios: totalScenariosAcrossFiles,
        selectedScenarios: totalSelectedScenarios,
        selectedFeatures: selectedFiles.length,
        hasFilters: Boolean(scenarioSelection),
        filters: selectionFilters,
    };

    // ── 4. Temp spec files & Playwright args ────────────────────────────────

    const backendDir = process.cwd();
    const configPath = join(backendDir, 'playwright.config.ts');
    const runResultsDir = join(VERO_PROJECT_PATH, 'test-results', executionId);
    const runResultsJsonPath = join(runResultsDir, 'results.json');
    await mkdir(runResultsDir, { recursive: true });

    // ── 5. Build process environment ────────────────────────────────────────

    // Merge env var layers
    const mergedEnvVars = mergeExecutionEnvironment(
        input.environmentVars,
        input.parameterValues,
        input.customEnvVars,
    );

    const processEnv: Record<string, string> = { ...process.env } as Record<string, string>;
    processEnv.VERO_RESULTS_JSON_PATH = runResultsJsonPath;
    processEnv.VERO_OUTPUT_DIR = runResultsDir;
    processEnv.VERO_ALLURE_RESULTS_DIR = join(VERO_PROJECT_PATH, 'allure-results', executionId);
    processEnv.VERO_SNAPSHOT_BASE_DIR = environmentResources.visualBaselinesDir;
    processEnv.VERO_SNAPSHOT_PATH_TEMPLATE = environmentResources.snapshotPathTemplate;
    processEnv.VERO_VISUAL_PRESET = visualSnapshotConfig.preset;
    processEnv.VERO_VISUAL_THRESHOLD = String(visualSnapshotConfig.threshold);
    if (visualSnapshotConfig.maxDiffPixels !== undefined) {
        processEnv.VERO_VISUAL_MAX_DIFF_PIXELS = String(visualSnapshotConfig.maxDiffPixels);
    } else {
        delete processEnv.VERO_VISUAL_MAX_DIFF_PIXELS;
    }
    if (visualSnapshotConfig.maxDiffPixelRatio !== undefined) {
        processEnv.VERO_VISUAL_MAX_DIFF_PIXEL_RATIO = String(visualSnapshotConfig.maxDiffPixelRatio);
    } else {
        delete processEnv.VERO_VISUAL_MAX_DIFF_PIXEL_RATIO;
    }
    if (requestedUpdateSnapshotsMode) {
        processEnv.VERO_UPDATE_SNAPSHOTS_MODE = requestedUpdateSnapshotsMode;
    } else {
        delete processEnv.VERO_UPDATE_SNAPSHOTS_MODE;
    }
    const requestedTraceMode = typeof runConfig?.tracing === 'string' ? runConfig.tracing.trim() : '';
    processEnv.VERO_TRACE_MODE = requestedTraceMode || 'on';

    if (Object.keys(mergedEnvVars).length > 0) {
        processEnv.VERO_ENV_VARS = JSON.stringify(mergedEnvVars);
    }

    processEnv.VERO_PROJECT_NAME = projectName;
    processEnv.VERO_SANDBOX_NAME = extractSandboxName(filePath || '');
    processEnv.VERO_NESTED_PROJECT_NAME = await resolveNestedProjectName(filePath);

    if (input.projectId) {
        processEnv.VERO_PROJECT_ID = input.projectId;
    }
    if (input.authToken) {
        processEnv.VERO_AUTH_TOKEN = input.authToken;
    }
    const hostPlatformOverride = resolvePlaywrightHostPlatformOverride({
        existingOverride: processEnv.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE,
    });
    if (hostPlatformOverride) {
        processEnv.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE = hostPlatformOverride;
    }

    // ── 6. Parameterized combinations ───────────────────────────────────────

    let paramCombinations: { label: string; values: Record<string, string> }[] | undefined;
    const envVarsForParameterization = Object.keys(mergedEnvVars).length > 0 ? mergedEnvVars : undefined;
    const applicationId = input.applicationId || await resolveApplicationId(input.projectId);

    if (envVarsForParameterization && applicationId) {
        try {
            const allDefs = await runParameterDefinitionRepository.findByApplicationId(applicationId);
            const parameterizedNames = allDefs
                .filter((d) => d.parameterize ?? (d as any).parallel)
                .map((d) => d.name);
            if (parameterizedNames.length > 0) {
                const { combinations, baseEnvVars } = computeParameterizedCombinations(
                    envVarsForParameterization,
                    parameterizedNames,
                );
                if (combinations.length > 1) {
                    paramCombinations = combinations;
                    processEnv.VERO_ENV_VARS = JSON.stringify(baseEnvVars);
                }
            }
        } catch (paramError) {
            logger.warn('[Parameterize] Failed to compute combinations, running as single', paramError);
        }
    }

    const parameterCombinationCount = paramCombinations && paramCombinations.length > 1
        ? paramCombinations.length
        : 1;

    let effectiveUpdateSnapshotsMode = requestedUpdateSnapshotsMode;
    if (parameterCombinationCount > 1 && requestedUpdateSnapshotsMode) {
        logger.warn('[Vero Run] Disabling snapshot update mode for parameterized execution to avoid concurrent baseline writes', {
            runId: executionId,
            requestedUpdateSnapshotsMode,
            parameterCombinationCount,
        });
        effectiveUpdateSnapshotsMode = undefined;
        delete processEnv.VERO_UPDATE_SNAPSHOTS_MODE;
    }

    // ── 7. Transpile all selected files ─────────────────────────────────────

    const { transpileVero } = await import('./veroTranspiler');
    const tempSpecPaths: string[] = [];
    const tempSpecFileNames: string[] = [];
    const generatedCodeBlocks: string[] = [];

    for (const [index, selectedFile] of selectedFiles.entries()) {
        const readableName = `${index + 1}-${basename(selectedFile.filePath, extname(selectedFile.filePath))}`;
        const tempTestFileName = buildVeroRunTempSpecFileName(`${executionId}-${index}`, readableName);
        const tempTestFilePath = join(backendDir, tempTestFileName);
        const playwrightCode = transpileVero(selectedFile.combinedContent, {
            selection: scenarioSelection,
            combinations: paramCombinations,
        });
        await writeFile(tempTestFilePath, playwrightCode, 'utf-8');
        tempSpecPaths.push(tempTestFilePath);
        tempSpecFileNames.push(tempTestFileName);
        generatedCodeBlocks.push(playwrightCode);
    }

    const hasPrimaryScenarioSelection = Boolean(
        (typeof input.scenarioName === 'string' && input.scenarioName.trim())
        || hasScenarioNamesSelection
    );
    const applySecondaryTitleFilters = !hasPrimaryScenarioSelection;
    const playwrightArgs = buildVeroRunPlaywrightArgs({
        tempSpecFileNames,
        configPath,
        headed: !isHeadless,
        workers: runConfig?.workers || 1,
        retries: runConfig?.retries || 0,
        grep: applySecondaryTitleFilters && typeof runConfig?.grep === 'string' ? runConfig.grep : undefined,
        grepInvert: applySecondaryTitleFilters && typeof runConfig?.grepInvert === 'string' ? runConfig.grepInvert : undefined,
        lastFailed: applySecondaryTitleFilters && runConfig?.lastFailed === true,
        timeoutMs: runConfig?.timeout || 60000,
        shard: runConfig?.shard,
        updateSnapshotsMode: effectiveUpdateSnapshotsMode,
    });

    logger.info('[Vero Run] Launching Playwright', {
        runId: executionId,
        filePath,
        selectionScope,
        selectedFileCount: selectedFiles.length,
        selectedScenarioCount: totalSelectedScenarios,
        parameterCombinationCount,
        tempSpecFiles: tempSpecFileNames,
        configPath,
        args: sanitizePlaywrightArgsForLog(playwrightArgs),
        triggeredBy,
    });

    // ── 8. Execute ───────────────────────────────────────────────────────────
    try {
    const result = await executeSingleRun({
        executionId,
        playwrightArgs,
        playwrightCode: generatedCodeBlocks.join('\n\n// ---- next spec ----\n\n'),
        tempTestFile: tempSpecPaths[0],
        configPath,
        backendDir,
        processEnv,
        runResultsDir,
        runResultsJsonPath,
        selectionDiagnostics,
    });
    result.selectionSummary = {
        selectionScope,
        selectedFileCount: selectedFiles.length,
        selectedScenarioCount: totalSelectedScenarios,
        parameterCombinationCount,
        plannedTestInvocations: totalSelectedScenarios * parameterCombinationCount,
        selectedFiles: selectedFiles.map((selectedFile) => ({
            filePath: selectedFile.filePath,
            selectedScenarioCount: selectedFile.selectedScenarioCount,
        })),
    };
    result.executionSummary = {
        workers: runConfig?.workers || 1,
        shard: runConfig?.shard,
        selectedFileCount: selectedFiles.length,
        selectedScenarioCount: totalSelectedScenarios,
        parameterCombinationCount,
        plannedTestInvocations: totalSelectedScenarios * parameterCombinationCount,
    };

    // ── 9. Post-process Allure ──────────────────────────────────────────────

    const allureDir = join(VERO_PROJECT_PATH, 'allure-results', executionId);
    await postProcessAllure(allureDir);
    result.allureResultsDir = allureDir;

    // ── 10. Update execution record ──────────────────────────────────────────

    const dbStatus: 'passed' | 'failed' | 'cancelled' = result.status === 'timeout' ? 'failed' : result.status;
    await executionRepository.update(executionId, {
        status: dbStatus,
        exitCode: result.exitCode,
        finishedAt: new Date(),
    });

    if (result.error) {
        await executionLogRepository.create({
            executionId,
            message: result.error,
            level: 'error',
            timestamp: new Date(),
        });
    }

    if (result.diagnostics) {
        await executionLogRepository.create({
            executionId,
            message: `Vero run diagnostics: ${JSON.stringify(result.diagnostics)}`,
            level: result.status === 'passed' ? 'info' : 'error',
            timestamp: new Date(),
        });
    }

    logger.info('[Vero Run] Playwright finished', {
        runId: executionId,
        tempSpecPaths,
        configPath,
        status: result.status,
        exitCode: result.exitCode,
        errorCode: result.errorCode,
        triggeredBy,
    });

    return result;
    } finally {
        // ── 11. Cleanup temp specs (always, even on error) ──────────────────
        for (const tempSpecPath of tempSpecPaths) {
            try {
                await unlink(tempSpecPath);
            } catch {
                // Ignore cleanup errors
            }
        }
    }
}

// ─── Single Run ─────────────────────────────────────────────────────────────

interface SingleRunParams {
    executionId: string;
    playwrightArgs: string[];
    playwrightCode: string;
    tempTestFile: string;
    configPath: string;
    backendDir: string;
    processEnv: Record<string, string>;
    runResultsDir: string;
    runResultsJsonPath: string;
    selectionDiagnostics?: ScenarioSelectionDiagnostics;
}

async function executeSingleRun(params: SingleRunParams): Promise<VeroRunResult> {
    const {
        executionId,
        playwrightArgs,
        playwrightCode,
        tempTestFile,
        configPath,
        backendDir,
        processEnv,
        runResultsJsonPath,
        selectionDiagnostics,
    } = params;

    const startTime = Date.now();
    const testProcess = spawn('npx', playwrightArgs, {
        cwd: backendDir,
        shell: false,
        stdio: 'pipe',
        env: processEnv,
    });

    let stdout = '';
    let stderr = '';

    testProcess.stdout.on('data', (data) => { stdout += data.toString(); });
    testProcess.stderr.on('data', (data) => { stderr += data.toString(); });

    type RunStatus = 'passed' | 'failed' | 'timeout';
    interface ProcessResult {
        status: RunStatus;
        output: string;
        error?: string;
        exitCode: number;
    }

    const processResult = await new Promise<ProcessResult>((resolve) => {
        let settled = false;
        const settle = (value: ProcessResult) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            resolve(value);
        };

        const timeout = setTimeout(() => {
            // Graceful SIGTERM first, escalate to SIGKILL after 5s
            testProcess.kill('SIGTERM');
            const killTimer = setTimeout(() => {
                try { testProcess.kill('SIGKILL'); } catch { /* already dead */ }
            }, 5_000);
            // Clear kill timer if the process exits on its own
            testProcess.once('close', () => clearTimeout(killTimer));
            settle({
                status: 'timeout',
                output: stdout,
                error: 'Test execution timed out after 2 minutes',
                exitCode: 124,
            });
        }, PROCESS_TIMEOUT_MS);

        testProcess.on('error', (processError) => {
            const startupError = [stderr.trim(), processError.message].filter(Boolean).join('\n');
            settle({
                status: 'failed',
                output: stdout || 'Playwright process failed to start',
                error: startupError || 'Playwright process failed to start',
                exitCode: 1,
            });
        });

        testProcess.on('close', (code) => {
            const exitCode = typeof code === 'number' ? code : 1;
            settle({
                status: code === 0 ? 'passed' : 'failed',
                output: stdout || 'Test completed',
                error: exitCode !== 0 ? stderr : undefined,
                exitCode,
            });
        });
    });

    // Classify failure
    const resultsJsonExists = existsSync(runResultsJsonPath);
    let diagnostics: VeroRunDiagnostics | undefined;
    let errorCode: string | undefined;

    if (processResult.status !== 'passed') {
        const failure = detectVeroRunFailure({
            exitCode: processResult.exitCode,
            resultsJsonExists,
            stderr: stderr || processResult.error || '',
            tempSpecPath: tempTestFile,
            configPath,
        });

        diagnostics = failure.diagnostics;
        if (failure.errorCode) errorCode = failure.errorCode;

        if (failure.isStartupFailure) {
            const preservedSpecPath = await preserveStartupFailureSpec({
                tempSpecPath: tempTestFile,
                debugDir: STARTUP_FAILURE_DIR,
                runId: executionId,
                maxRetained: STARTUP_FAILURE_RETENTION,
            });

            if (preservedSpecPath) {
                diagnostics = { ...diagnostics, preservedSpecPath };
            }

            const startupErrorSummary = [
                failure.errorCode
                    ? `Playwright startup failed (${failure.errorCode}).`
                    : 'Playwright startup failed before results.json was generated.',
                diagnostics?.tempSpecPath ? `tempSpecPath: ${diagnostics.tempSpecPath}` : undefined,
                diagnostics?.configPath ? `configPath: ${diagnostics.configPath}` : undefined,
                diagnostics?.stderrSnippet ? `stderr:\n${diagnostics.stderrSnippet}` : undefined,
            ].filter(Boolean).join('\n');

            if (failure.errorCode === VERO_RUN_MODULE_MISMATCH_ERROR_CODE) {
                processResult.error = `${startupErrorSummary}\nModule format mismatch detected: "exports is not defined in ES module scope".`;
            } else if (!processResult.error) {
                processResult.error = startupErrorSummary;
            }
        }
    }

    // Process results.json into execution steps and scenario summaries
    const counts = await processResultsJson(runResultsJsonPath, executionId);
    const durationMs = Date.now() - startTime;
    const runSummary = {
        passed: counts.passed,
        failed: counts.failed,
        skipped: counts.skipped,
    };
    const scenarios = counts.scenarios;

    // Prefer the first concrete scenario failure when Playwright stderr is noisy.
    const firstScenarioError = scenarios.find((scenario) => scenario.status === 'failed' && scenario.error)?.error;
    if (!processResult.error && firstScenarioError) {
        processResult.error = firstScenarioError;
    }

    return {
        status: processResult.status,
        passed: counts.passed,
        failed: counts.failed,
        skipped: counts.skipped,
        durationMs,
        exitCode: processResult.exitCode,
        generatedCode: playwrightCode,
        output: processResult.output,
        error: processResult.error,
        errorCode,
        diagnostics,
        summary: runSummary,
        scenarios,
        selectionDiagnostics,
    };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractSandboxName(filePath: string): string {
    const parts = filePath.split('/');
    const idx = parts.indexOf('sandboxes');
    if (idx !== -1 && idx + 1 < parts.length) return parts[idx + 1];
    return 'default';
}

async function resolveProjectName(projectId?: string): Promise<string> {
    if (!projectId) return 'Vero';
    try {
        const app = await applicationRepository.findById(projectId);
        if (app?.name) return app.name;
        const project = await projectRepository.findById(projectId);
        if (project?.name) return project.name;
    } catch { /* use default */ }
    return 'Vero';
}

async function resolveNestedProjectName(filePath?: string): Promise<string> {
    if (!filePath) return 'default';
    const parts = filePath.replace(/\\/g, '/').split('/');
    // Path pattern: {appId}/{nestedProjectId}/sandboxes/... or {appId}/{nestedProjectId}/Features/...
    // The nested project ID is typically the 2nd segment
    if (parts.length >= 2) {
        const candidateId = parts[1];
        if (candidateId && candidateId !== 'sandboxes' && candidateId !== 'Features' && candidateId !== 'Pages') {
            try {
                const project = await projectRepository.findById(candidateId);
                if (project?.name) return project.name;
            } catch { /* fall through */ }
        }
    }
    return 'default';
}

async function resolveApplicationId(projectId?: string): Promise<string | undefined> {
    if (!projectId) return undefined;
    try {
        const app = await applicationRepository.findById(projectId);
        if (app?.id) return app.id;
        const project = await projectRepository.findById(projectId);
        return project?.applicationId;
    } catch {
        return undefined;
    }
}

interface ResolveRunSelectionScopeInput {
    requestedScope?: VeroSelectionScope;
    triggeredBy: 'manual' | 'schedule';
    scenarioName?: string;
    hasScenarioNamesSelection: boolean;
}

function resolveRunSelectionScope(input: ResolveRunSelectionScopeInput): VeroSelectionScope {
    if (input.scenarioName?.trim() || input.hasScenarioNamesSelection) {
        return 'active-file';
    }
    if (input.requestedScope === 'active-file' || input.requestedScope === 'current-sandbox') {
        return input.requestedScope;
    }
    if (input.triggeredBy === 'manual') {
        return 'current-sandbox';
    }
    return 'active-file';
}

function isNoScenariosMatchedError(message: string): boolean {
    return message.toLowerCase().includes('no scenarios matched');
}

function countScenariosInProgram(program: any): number {
    if (!program || !Array.isArray(program.features)) {
        return 0;
    }
    return program.features.reduce((total: number, feature: any) => {
        const featureScenarioCount = Array.isArray(feature?.scenarios) ? feature.scenarios.length : 0;
        return total + featureScenarioCount;
    }, 0);
}

async function processResultsJson(
    resultsJsonPath: string,
    executionId: string,
): Promise<{
    passed: number;
    failed: number;
    skipped: number;
    scenarios: Array<{
        name: string;
        status: 'passed' | 'failed' | 'skipped';
        duration: number;
        error?: string;
        steps: Array<{
            stepNumber: number;
            action: string;
            description: string;
            status: 'passed' | 'failed' | 'skipped';
            duration: number;
            error?: string;
        }>;
    }>;
}> {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    const scenarios: Array<{
        name: string;
        status: 'passed' | 'failed' | 'skipped';
        duration: number;
        error?: string;
        steps: Array<{
            stepNumber: number;
            action: string;
            description: string;
            status: 'passed' | 'failed' | 'skipped';
            duration: number;
            error?: string;
        }>;
    }> = [];

    if (!existsSync(resultsJsonPath)) {
        return { passed, failed, skipped, scenarios };
    }

    try {
        const resultsJson = await readFile(resultsJsonPath, 'utf-8');
        const results = JSON.parse(resultsJson);
        let stepNumber = 0;

        const processSuite = async (suite: any, parentTitle = '') => {
            const cleanTitle = stripVeroSpecPrefix(suite.title);
            const suiteName = parentTitle ? `${parentTitle} > ${cleanTitle}` : cleanTitle;

            for (const spec of suite.specs || []) {
                for (const test of spec.tests || []) {
                    stepNumber++;
                    const resultList = Array.isArray(test.results) ? test.results : [];
                    const testResult = resultList.length > 0
                        ? resultList[resultList.length - 1]
                        : undefined;
                    const resultStatus = testResult?.status || 'failed';
                    const testStatus = resultStatus === 'passed' ? 'passed'
                        : resultStatus === 'skipped' ? 'skipped' : 'failed';

                    if (testStatus === 'passed') passed++;
                    else if (testStatus === 'failed') failed++;
                    else if (testStatus === 'skipped') skipped++;

                    const subSteps = (testResult?.steps || []).map((step: any, idx: number) => ({
                        id: `step-${stepNumber}-${idx}`,
                        stepNumber: idx + 1,
                        action: step.title || `Step ${idx + 1}`,
                        description: step.title,
                        status: step.error ? 'failed' : 'passed',
                        duration: step.duration || 0,
                        error: step.error?.message || null,
                    }));

                    const stepDescription = suiteName
                        ? `${suiteName} > ${spec.title || `Test ${stepNumber}`}`
                        : spec.title || `Test ${stepNumber}`;

                    scenarios.push({
                        name: stepDescription,
                        status: testStatus,
                        duration: testResult?.duration || 0,
                        error: testResult?.error?.message || undefined,
                        steps: subSteps.map((subStep: {
                            stepNumber: number;
                            action: string;
                            description: string;
                            status: string;
                            duration: number;
                            error: string | null;
                        }) => ({
                            stepNumber: subStep.stepNumber,
                            action: subStep.action,
                            description: subStep.description,
                            status: subStep.status as 'passed' | 'failed' | 'skipped',
                            duration: subStep.duration,
                            error: subStep.error || undefined,
                        })),
                    });

                    await executionStepRepository.create({
                        executionId,
                        stepNumber,
                        action: 'scenario',
                        description: stepDescription,
                        status: testStatus as any,
                        duration: testResult?.duration || 0,
                        error: testResult?.error?.message || undefined,
                        stepsJson: JSON.stringify(subSteps),
                    });
                }
            }

            for (const nested of suite.suites || []) {
                await processSuite(nested, suiteName);
            }
        };

        for (const suite of results.suites || []) {
            await processSuite(suite);
        }
    } catch {
        // Results not parseable
    }

    return { passed, failed, skipped, scenarios };
}

async function postProcessAllure(allureDir: string): Promise<void> {
    try {
        if (!existsSync(allureDir)) return;
        const allureFiles = await readdir(allureDir);
        for (const file of allureFiles) {
            if (!file.endsWith('-result.json')) continue;
            const filePath = join(allureDir, file);
            const raw = await readFile(filePath, 'utf-8');
            const data = JSON.parse(raw);
            let modified = false;
            for (const label of data.labels || []) {
                if (label.name === 'parentSuite' && /^\.vero-/.test(label.value)) {
                    label.value = stripVeroSpecPrefix(label.value);
                    modified = true;
                }
            }
            if (modified) {
                await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
            }
        }
    } catch {
        // Non-critical
    }
}

// ─── Error Types ────────────────────────────────────────────────────────────

export class VeroRunValidationError extends Error {
    public errors?: any[];
    constructor(message: string, errors?: any[]) {
        super(message);
        this.name = 'VeroRunValidationError';
        this.errors = errors;
    }
}

export class VeroRunSelectionError extends Error {
    public selection?: ScenarioSelectionOptions;
    public diagnostics?: {
        selectionScope?: VeroSelectionScope;
        scannedFileCount?: number;
        selectedFileCount?: number;
        totalScenarios?: number;
        selectedScenarios?: number;
    };
    constructor(
        message: string,
        selection?: ScenarioSelectionOptions,
        diagnostics?: {
            selectionScope?: VeroSelectionScope;
            scannedFileCount?: number;
            selectedFileCount?: number;
            totalScenarios?: number;
            selectedScenarios?: number;
        },
    ) {
        super(message);
        this.name = 'VeroRunSelectionError';
        this.selection = selection;
        this.diagnostics = diagnostics;
    }
}
