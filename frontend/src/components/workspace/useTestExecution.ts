import { useState, type MutableRefObject } from 'react';
import { io, Socket } from 'socket.io-client';
import type { OpenTab } from './useFileManagement.js';
import { useLocalExecutionStore } from '@/store/useLocalExecutionStore';
import { useRunConfigStore, type RunConfiguration as ZustandRunConfig } from '@/store/runConfigStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { useRunParameterStore } from '@/store/runParameterStore';
import { githubRunsApi } from '@/api/github';
import { useGitHubExecutionStore } from '@/store/useGitHubExecutionStore';
import { useToastStore } from '@/store/useToastStore';
import { useProjectStore } from '@/store/projectStore';
import type { VeroRunResponse } from '@/api/vero';
import {
  buildGitHubInputs,
  buildLocalRunConfig,
  normalizeRunTarget,
  toRelativeVeroPath,
} from './runExecutionUtils.js';
import { humanizePlaywrightError } from '@/utils/playwrightParser';
import type { ActivityView } from './ActivityBar.js';

const API_BASE = '/api';

export interface UseTestExecutionParams {
  socketRef: MutableRefObject<Socket | null>;
  activeTab: OpenTab | undefined;
  currentProjectId: string | undefined;
  currentWorkflowId?: string;
  currentRunConfigProjectId?: string;
  addConsoleOutput: (message: string) => void;
  setShowConsole: (show: boolean) => void;
  setActiveView: (view: ActivityView) => void;
  fetchExecutions: () => Promise<void>;
  debugState: { isDebugging: boolean; breakpoints: Set<number> };
  startDebug: (
    testFlowId: string,
    code: string,
    executionId: string,
    projectId?: string,
    socketOverride?: Socket | null
  ) => void;
  stopDebug: () => void;
  getAuthHeaders: (extraHeaders?: Record<string, string>) => Record<string, string>;
  setDebugExecutionId: (id: string | null) => void;
}

export interface FailureLine {
  line: number;
  category: string;
  userMessage: string;
}

export interface UseTestExecutionReturn {
  isRunning: boolean;
  setIsRunning: (value: boolean) => void;
  showDebugConsole: boolean;
  setShowDebugConsole: (show: boolean) => void;
  lastCompletedExecutionId: string | null;
  setLastCompletedExecutionId: (id: string | null) => void;
  failureLines: FailureLine[];
  runTests: (configId?: string) => Promise<void>;
  debugTests: (configId?: string) => Promise<void>;
  handleStopDebug: () => void;
  handleRestartDebug: () => Promise<void>;
  handleRunScenario: (scenarioName: string) => Promise<void>;
  handleRunFeature: (featureName: string) => Promise<void>;
  handleDebugScenario: (scenarioName: string) => Promise<void>;
  getRunConfigBaseUrl: (config: ZustandRunConfig | null) => string | null;
}

export function useTestExecution({
  socketRef,
  activeTab,
  currentProjectId,
  currentWorkflowId,
  currentRunConfigProjectId,
  addConsoleOutput,
  setShowConsole,
  setActiveView,
  fetchExecutions,
  debugState,
  startDebug,
  stopDebug,
  getAuthHeaders,
  setDebugExecutionId,
}: UseTestExecutionParams): UseTestExecutionReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [showDebugConsole, setShowDebugConsole] = useState(false);
  const [lastCompletedExecutionId, setLastCompletedExecutionId] = useState<string | null>(null);
  const [failureLines, setFailureLines] = useState<FailureLine[]>([]);

  const isRunnableVeroTab = (tab: OpenTab | undefined): tab is OpenTab => {
    if (!tab) return false;
    if (tab.type === 'compare' || tab.type === 'image' || tab.type === 'binary') {
      return false;
    }
    return tab.name.toLowerCase().endsWith('.vero');
  };

  // Local execution store for syncing with Executions tab
  const addLocalExecution = useLocalExecutionStore((state) => state.addExecution);
  const updateLocalExecution = useLocalExecutionStore((state) => state.updateExecution);
  const fetchLocalExecutions = useLocalExecutionStore((state) => state.fetchExecutions);

  const resolveRunConfig = (configId?: string): ZustandRunConfig | null => {
    const runConfigStore = useRunConfigStore.getState();
    const scopedConfigurations = currentWorkflowId && currentRunConfigProjectId
      ? runConfigStore.configurations.filter(
          (config) => config.workflowId === currentWorkflowId && config.projectId === currentRunConfigProjectId
        )
      : [];

    if (configId) {
      const selectedConfig = scopedConfigurations.find((config) => config.id === configId);
      if (selectedConfig) {
        if (runConfigStore.activeConfigId !== configId) {
          runConfigStore.setActiveConfig(configId);
        }
        return selectedConfig;
      }
    }

    const activeConfig = runConfigStore.getActiveConfig();
    if (activeConfig && scopedConfigurations.some((config) => config.id === activeConfig.id)) {
      return activeConfig;
    }

    // Safety fallback if activeConfigId was cleared while configurations still exist.
    const fallbackConfig = scopedConfigurations[0] || null;
    if (fallbackConfig) {
      runConfigStore.setActiveConfig(fallbackConfig.id);
    }
    return fallbackConfig;
  };

  const getRunConfigBaseUrl = (config: ZustandRunConfig | null): string | null => {
    if (!config) return null;

    // Check both casing variants (baseURL and baseUrl) since config shape varies
    const configAny = config as unknown as Record<string, unknown>;
    for (const key of ['baseURL', 'baseUrl'] as const) {
      const value = configAny[key];
      if (typeof value === 'string' && value.trim()) return value;
    }

    return null;
  };

  const getResolvedEnvironmentVariables = (config: ZustandRunConfig | null): Record<string, string> => {
    const parameterState = useRunParameterStore.getState();
    const environmentState = useEnvironmentStore.getState();

    // Layer 1 (lowest): Parameter defaults
    const paramDefaults = parameterState.getDefaultsMap();

    // Layer 2: Environment variables
    let environmentVars: Record<string, string> = environmentState.getVariablesMap();
    if (config?.environmentId) {
      const selectedEnvironment = environmentState.environments.find(env => env.id === config.environmentId);
      if (selectedEnvironment) {
        environmentVars = selectedEnvironment.variables.reduce<Record<string, string>>((acc, variable) => {
          acc[variable.key] = variable.value;
          return acc;
        }, {});
      }
    }

    // Layer 3: Parameter set values
    const setValues = parameterState.getSetValuesMap(config?.parameterSetId);

    // Layer 4 (highest): Per-run overrides
    const paramOverrides: Record<string, string> = {};
    if (config?.parameterOverrides) {
      for (const [key, value] of Object.entries(config.parameterOverrides)) {
        paramOverrides[key] = String(value);
      }
    }

    return {
      ...paramDefaults,
      ...environmentVars,
      ...setValues,
      ...paramOverrides,
      ...(config?.envVars || {}),
    };
  };

  const parseGitHubRepository = (repository: string): { owner: string; repo: string } | null => {
    const trimmed = repository.trim();
    const segments = trimmed.split('/').map(part => part.trim()).filter(Boolean);
    if (segments.length !== 2) {
      return null;
    }
    return { owner: segments[0], repo: segments[1] };
  };

  type DebugPreparationResponse = {
    success?: boolean;
    executionId?: string;
    testFlowId?: string;
    generatedCode?: string;
    error?: string;
  };

  const ensureDebugSocket = (): Socket => {
    if (socketRef.current) return socketRef.current;

    const debugToken = localStorage.getItem('auth_token');
    const socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token: debugToken },
    });
    socketRef.current = socket;
    return socket;
  };

  const resolveExecutionScopeMetadata = (): {
    applicationId?: string;
    projectId?: string;
    projectName: string;
  } => {
    const applicationId = currentProjectId;
    const projectId = currentRunConfigProjectId;
    const currentApplication = useProjectStore.getState().currentProject;
    const nestedProjectName = projectId
      ? currentApplication?.projects?.find((project) => project.id === projectId)?.name
      : undefined;

    return {
      applicationId,
      projectId,
      projectName: nestedProjectName || (projectId ? projectId : 'Unassigned'),
    };
  };

  const prepareDebugSession = async (
    tab: OpenTab
  ): Promise<{ executionId: string; testFlowId: string; generatedCode: string }> => {
    const scopeMetadata = resolveExecutionScopeMetadata();
    const response = await fetch(`${API_BASE}/vero/debug`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({
        content: tab.content,
        filePath: toRelativeVeroPath(tab.path),
        breakpoints: Array.from(debugState.breakpoints).sort((a, b) => a - b),
        applicationId: scopeMetadata.applicationId,
        projectId: scopeMetadata.projectId,
      }),
    });

    const data = await response.json() as DebugPreparationResponse;
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to prepare debug session');
    }
    if (!data.executionId || !data.testFlowId || !data.generatedCode) {
      throw new Error('Debug preparation did not return execution metadata');
    }

    return {
      executionId: data.executionId,
      testFlowId: data.testFlowId,
      generatedCode: data.generatedCode,
    };
  };

  const triggerGitHubRun = async (
    config: ZustandRunConfig,
    tab: OpenTab,
    scenarioName?: string
  ): Promise<void> => {
    const repository = (config as ZustandRunConfig).github?.repository;
    if (!repository) {
      addConsoleOutput('Warning: GitHub Actions target selected but repository not configured');
      addConsoleOutput('Open Run Configuration and set repository as owner/repo');
      return;
    }

    const repoInfo = parseGitHubRepository(repository);
    if (!repoInfo) {
      addConsoleOutput(`Invalid GitHub repository value: "${repository}" (expected owner/repo)`);
      return;
    }

    const workflowPath = (config as ZustandRunConfig).github?.workflowFile || '.github/workflows/vero-tests.yml';
    const branch = (config as ZustandRunConfig).github?.branch || 'main';
    const relativePath = toRelativeVeroPath(tab.path);
    const resolvedEnvVars = getResolvedEnvironmentVariables(config);
    const githubRunConfig = scenarioName
      ? ({ ...config, selectionScope: 'active-file' } as ZustandRunConfig)
      : config;
    const parameterizedNames = useRunParameterStore
      .getState()
      .definitions
      .filter((definition) => definition.parameterize ?? (definition as any).parallel)
      .map((definition) => definition.name);
    const githubInputs = buildGitHubInputs(
      githubRunConfig as unknown as Record<string, unknown>,
      tab.path,
      tab.content,
      scenarioName,
      resolvedEnvVars,
      parameterizedNames
    );

    addConsoleOutput(`Triggering GitHub Actions workflow on ${repository}...`);
    addConsoleOutput(`Workflow: ${workflowPath}, Branch: ${branch}`);
    addConsoleOutput(
      scenarioName
        ? `Intent: run scenario "${scenarioName}" in ${relativePath}`
        : `Intent: run Vero file ${relativePath}`
    );
    const scopeMetadata = resolveExecutionScopeMetadata();

    try {
      const result = await githubRunsApi.trigger(
        repoInfo.owner,
        repoInfo.repo,
        workflowPath,
        branch,
        githubInputs
      );
      if (result.success) {
        addConsoleOutput(
          scenarioName
            ? `Scenario "${scenarioName}" dispatched to GitHub Actions.`
            : 'GitHub Actions workflow triggered successfully!'
        );
        addConsoleOutput('Check the Runs tab to monitor execution progress.');

        useGitHubExecutionStore.getState().addExecution({
          id: `dispatch-${Date.now()}`,
          runId: 0,
          runNumber: 0,
          workflowName: workflowPath,
          status: 'queued',
          browsers: [],
          workers: (config as unknown as Record<string, unknown>).workers as number || 1,
          shards: (config as unknown as Record<string, unknown>).shards as number || 1,
          triggeredAt: new Date().toISOString(),
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          skippedTests: 0,
          htmlUrl: `https://github.com/${repository}/actions`,
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          applicationId: scopeMetadata.applicationId,
          projectId: scopeMetadata.projectId,
          projectName: scopeMetadata.projectName,
        });

        useToastStore.getState().addToast({
          message: scenarioName
            ? `Scenario "${scenarioName}" dispatched to GitHub Actions`
            : 'GitHub Actions workflow dispatched',
          variant: 'success',
        });

        setActiveView('executions');
        setTimeout(() => fetchExecutions(), 3000);
      } else {
        addConsoleOutput(`Failed to trigger workflow: ${result.error || 'Unknown error'}`);
        useToastStore.getState().addToast({
          message: `Failed to trigger workflow: ${result.error || 'Unknown error'}`,
          variant: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to trigger GitHub workflow:', error);
      addConsoleOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
      useToastStore.getState().addToast({
        message: 'Failed to trigger GitHub Actions workflow',
        variant: 'error',
      });
    }
  };

  const runLocalExecution = async (
    config: ZustandRunConfig,
    tab: OpenTab,
    scenarioName?: string
  ): Promise<void> => {
    setFailureLines([]);
    const tempExecutionId = `temp-${Date.now()}`;
    const startedAt = new Date().toISOString();
    const flowName = scenarioName ? `${tab.name} - ${scenarioName}` : tab.name;
    const runLabel = scenarioName ? `Scenario "${scenarioName}"` : 'Test';
    const scopeMetadata = resolveExecutionScopeMetadata();

    addLocalExecution({
      id: tempExecutionId,
      testFlowId: '',
      applicationId: scopeMetadata.applicationId,
      projectId: scopeMetadata.projectId,
      projectName: scopeMetadata.projectName,
      testFlowName: flowName,
      status: 'running',
      target: 'local',
      triggeredBy: { type: 'user' },
      startedAt,
      stepCount: 0,
      passedCount: 0,
      failedCount: 0,
      skippedCount: 0,
    });

    const resolvedEnvVars = getResolvedEnvironmentVariables(config);
    try {
      const localRunConfig = buildLocalRunConfig(config as unknown as Record<string, unknown>);
      if (scenarioName) {
        localRunConfig.selectionScope = 'active-file';
      }
      const response = await fetch(`${API_BASE}/vero/run`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          content: tab.content,
          filePath: toRelativeVeroPath(tab.path),
          scenarioName,
          applicationId: scopeMetadata.applicationId,
          projectId: scopeMetadata.projectId,
          config: {
            ...localRunConfig,
            envVars: Object.keys(resolvedEnvVars).length > 0 ? resolvedEnvVars : undefined,
          },
        }),
      });
      const data = await response.json() as VeroRunResponse;

      if (data.executionId) {
        updateLocalExecution(tempExecutionId, {
          id: data.executionId,
          status: data.status === 'passed' ? 'passed' : 'failed',
          finishedAt: new Date().toISOString(),
          duration: Date.now() - new Date(startedAt).getTime(),
          output: data.output,
          error: data.error,
          generatedCode: data.generatedCode,
        });
      }

      // Navigate to execution report after completion
      const finalExecutionId = data.executionId || tempExecutionId;
      setLastCompletedExecutionId(finalExecutionId);

      if (data.selectionSummary) {
        addConsoleOutput(
          `[SELECT] Scope=${data.selectionSummary.selectionScope}, files=${data.selectionSummary.selectedFileCount}, scenarios=${data.selectionSummary.selectedScenarioCount}, parameter-combinations=${data.selectionSummary.parameterCombinationCount}, planned-invocations=${data.selectionSummary.plannedTestInvocations}`
        );
      }
      const resolvedExecutionSummary = data.executionSummary || (data.selectionSummary
        ? {
          workers: Number(localRunConfig.workers) || 1,
          shard: localRunConfig.shard,
          selectedFileCount: data.selectionSummary.selectedFileCount,
          selectedScenarioCount: data.selectionSummary.selectedScenarioCount,
          parameterCombinationCount: data.selectionSummary.parameterCombinationCount,
          plannedTestInvocations: data.selectionSummary.plannedTestInvocations,
        }
        : undefined);
      if (resolvedExecutionSummary) {
        const shardCurrent = resolvedExecutionSummary.shard?.current ?? 1;
        const shardTotal = resolvedExecutionSummary.shard?.total ?? 1;
        const scope = data.selectionSummary?.selectionScope || localRunConfig.selectionScope || 'active-file';
        addConsoleOutput(
          `[EXEC] workers=${resolvedExecutionSummary.workers}, shard=${shardCurrent}/${shardTotal}, scope=${scope}, files=${resolvedExecutionSummary.selectedFileCount}, scenarios=${resolvedExecutionSummary.selectedScenarioCount}, combos=${resolvedExecutionSummary.parameterCombinationCount}, planned=${resolvedExecutionSummary.plannedTestInvocations}`
        );
      }

      if (data.success && data.status === 'passed') {
        const summary = data.summary;
        if (summary && summary.passed > 0) {
          addConsoleOutput(`[SUCCESS] ${runLabel} completed: ${summary.passed} passed`);
        } else {
          addConsoleOutput(`[SUCCESS] ${runLabel} completed: passed`);
        }
        await fetchLocalExecutions(scopeMetadata.applicationId);
        await fetchExecutions();
      } else {
        // Show summary line
        const summary = data.summary;
        if (summary) {
          addConsoleOutput(`[ERROR] ${runLabel} failed: ${summary.failed} failed, ${summary.passed} passed`);
        } else {
          addConsoleOutput(`[ERROR] ${runLabel} failed`);
        }

        // Show per-scenario and per-step error details
        if (data.scenarios && data.scenarios.length > 0) {
          for (const scenario of data.scenarios) {
            if (scenario.status === 'failed') {
              addConsoleOutput(`  Scenario "${scenario.name}": FAILED`);
              // Prefer classified failure over raw error
              if (scenario.failure) {
                addConsoleOutput(`  [${scenario.failure.category}] ${scenario.failure.userMessage}`);
                addConsoleOutput(`    at ${scenario.failure.dslFile}:${scenario.failure.dslLine} — ${scenario.failure.dslText}`);
              } else if (scenario.error) {
                addConsoleOutput(`  [ERROR] ${humanizePlaywrightError(scenario.error)}`);
              }
              // Show step-level errors
              const failedSteps = scenario.steps.filter(s => s.error);
              for (const step of failedSteps) {
                addConsoleOutput(`    Step ${step.stepNumber} "${step.description}": ${humanizePlaywrightError(step.error!)}`);
              }
            }
          }

          // Derive failureLines from scenario failures
          const newFailureLines: FailureLine[] = data.scenarios
            .filter(s => s.failure)
            .map(s => ({
              line: s.failure!.dslLine,
              category: s.failure!.category,
              userMessage: s.failure!.userMessage,
            }));
          setFailureLines(newFailureLines);
        } else if (data.error) {
          // Fallback: show raw error if no structured scenarios
          addConsoleOutput(`  ${humanizePlaywrightError(data.error)}`);
        }

        if (data.diagnostics) {
          const codeSuffix = data.errorCode ? `, code=${data.errorCode}` : '';
          addConsoleOutput(`  [DIAG] phase=${data.diagnostics.phase}${codeSuffix}`);
          if (data.diagnostics.detail) {
            addConsoleOutput(`  [DIAG] ${data.diagnostics.detail}`);
          }
          if (data.diagnostics.tempSpecPath) {
            addConsoleOutput(`  [DIAG] temp spec: ${data.diagnostics.tempSpecPath}`);
          }
          if (data.diagnostics.configPath) {
            addConsoleOutput(`  [DIAG] config: ${data.diagnostics.configPath}`);
          }
          if (data.diagnostics.stderrSnippet) {
            addConsoleOutput('  [DIAG] stderr tail:');
            for (const line of data.diagnostics.stderrSnippet.split(/\r?\n/).slice(-12)) {
              addConsoleOutput(`    ${line}`);
            }
          }
        }

        if ((!data.scenarios || data.scenarios.length === 0) && data.output) {
          const outputLines = data.output
            .split(/\r?\n/)
            .map((line) => line.trimEnd())
            .filter(Boolean)
            .slice(-12);
          if (outputLines.length > 0) {
            addConsoleOutput('  [DIAG] output tail:');
            for (const line of outputLines) {
              addConsoleOutput(`    ${line}`);
            }
          }
        }

        if (Array.isArray(data.errors) && data.errors.length > 0) {
          addConsoleOutput('  Validation details:');
          for (const rawError of data.errors.slice(0, 10)) {
            const linePrefix = typeof rawError?.line === 'number' ? `Line ${rawError.line}: ` : '';
            const message = typeof rawError?.message === 'string' && rawError.message.trim()
              ? rawError.message.trim()
              : JSON.stringify(rawError);
            addConsoleOutput(`  - ${linePrefix}${message}`);
            if (typeof rawError?.suggestion === 'string' && rawError.suggestion.trim()) {
              addConsoleOutput(`    Fix: ${rawError.suggestion.trim()}`);
            }
          }
        }

        if (!data.executionId) {
          updateLocalExecution(tempExecutionId, {
            status: 'failed',
            finishedAt: new Date().toISOString(),
            error: data.error,
          });
        }
        await fetchLocalExecutions(scopeMetadata.applicationId);
        await fetchExecutions();
      }
    } catch (error) {
      console.error('Failed to run tests:', error);
      addConsoleOutput(`Error running ${scenarioName ? 'scenario' : 'test'}: ${error}`);
      updateLocalExecution(tempExecutionId, {
        status: 'failed',
        finishedAt: new Date().toISOString(),
        error: String(error),
      });
    }
  };

  const runTests = async (configId?: string) => {
    if (!activeTab || isRunning) return;
    if (!isRunnableVeroTab(activeTab)) {
      addConsoleOutput('Only .vero scenario files can be executed.');
      return;
    }

    const config = resolveRunConfig(configId);
    if (!config) {
      addConsoleOutput('No run configuration found. Open Run Configuration to create one.');
      return;
    }

    setIsRunning(true);
    setShowConsole(true);
    addConsoleOutput(`Running ${activeTab.name} with ${config.name || 'Default'}...`);

    try {
      const isGitHubTarget = normalizeRunTarget((config as { target?: unknown }).target) === 'github-actions';
      if (isGitHubTarget) {
        await triggerGitHubRun(config, activeTab);
        return;
      }
      await runLocalExecution(config, activeTab);
    } finally {
      setIsRunning(false);
    }
  };

  // Debug tests (start debug session with breakpoints)
  const debugTests = async (configId?: string) => {
    if (!activeTab || isRunning || debugState.isDebugging) return;
    if (!isRunnableVeroTab(activeTab)) {
      addConsoleOutput('Only .vero scenario files can be debugged.');
      return;
    }

    const config = resolveRunConfig(configId);
    if (!config) {
      addConsoleOutput('No run configuration found. Open Run Configuration to create one.');
      return;
    }

    setShowDebugConsole(true);
    const socket = ensureDebugSocket();

    addConsoleOutput(`Starting debug session for ${activeTab.name} with ${config.name || 'Default'}...`);

    try {
      const prepared = await prepareDebugSession(activeTab);
      setDebugExecutionId(prepared.executionId);
      startDebug(
        prepared.testFlowId,
        prepared.generatedCode,
        prepared.executionId,
        currentRunConfigProjectId || currentProjectId,
        socket
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addConsoleOutput(`Failed to start debug session: ${message}`);
    }
  };

  // Stop debug session
  const handleStopDebug = () => {
    stopDebug();
    setDebugExecutionId(null);
    addConsoleOutput('Debug session stopped');
  };

  // Restart debug session
  const handleRestartDebug = async () => {
    if (!activeTab) return;
    stopDebug(); // Send stop to backend for current session
    setShowDebugConsole(true);
    const socket = ensureDebugSocket();

    addConsoleOutput(`Restarting debug session for ${activeTab.name}...`);
    try {
      const prepared = await prepareDebugSession(activeTab);
      setDebugExecutionId(prepared.executionId);
      startDebug(
        prepared.testFlowId,
        prepared.generatedCode,
        prepared.executionId,
        currentRunConfigProjectId || currentProjectId,
        socket
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addConsoleOutput(`Failed to restart debug session: ${message}`);
    }
  };

  // Run a specific scenario by name (triggered from editor play button)
  const handleRunScenario = async (scenarioName: string) => {
    if (!activeTab || isRunning) return;
    if (!isRunnableVeroTab(activeTab)) {
      addConsoleOutput('Only .vero scenario files can run scenarios.');
      return;
    }

    const normalizedScenarioName = scenarioName.trim();
    if (!normalizedScenarioName) {
      addConsoleOutput('Cannot run scenario: missing scenario name');
      return;
    }

    const config = resolveRunConfig();
    if (!config) {
      addConsoleOutput('No run configuration found. Open Run Configuration to create one.');
      return;
    }

    setIsRunning(true);
    addConsoleOutput(`Running scenario "${normalizedScenarioName}" from ${activeTab.name}...`);

    try {
      const isGitHubTarget = normalizeRunTarget((config as { target?: unknown }).target) === 'github-actions';
      if (isGitHubTarget) {
        await triggerGitHubRun(config, activeTab, normalizedScenarioName);
        return;
      }
      await runLocalExecution(config, activeTab, normalizedScenarioName);
    } finally {
      setIsRunning(false);
    }
  };

  // Run all scenarios in a feature by name (triggered from editor play button)
  const handleRunFeature = async (featureName: string) => {
    if (!activeTab || isRunning) return;
    if (!isRunnableVeroTab(activeTab)) {
      addConsoleOutput('Only .vero scenario files can run features.');
      return;
    }

    // For now, running a feature runs all scenarios in the current file
    // The feature name is for logging purposes
    addConsoleOutput(`Running feature "${featureName}"...`);
    await runTests();
  };

  // Debug a specific scenario by name (triggered from gutter context menu)
  const handleDebugScenario = async (scenarioName: string) => {
    if (!activeTab || isRunning || debugState.isDebugging) return;
    if (!isRunnableVeroTab(activeTab)) {
      addConsoleOutput('Only .vero scenario files can debug scenarios.');
      return;
    }

    setShowDebugConsole(true);
    const socket = ensureDebugSocket();

    addConsoleOutput(`Starting debug for scenario "${scenarioName}" in ${activeTab.name}...`);
    try {
      const prepared = await prepareDebugSession(activeTab);
      setDebugExecutionId(prepared.executionId);
      startDebug(
        prepared.testFlowId,
        prepared.generatedCode,
        prepared.executionId,
        currentRunConfigProjectId || currentProjectId,
        socket
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addConsoleOutput(`Failed to debug scenario "${scenarioName}": ${message}`);
    }
  };

  return {
    isRunning,
    setIsRunning,
    showDebugConsole,
    setShowDebugConsole,
    lastCompletedExecutionId,
    setLastCompletedExecutionId,
    failureLines,
    runTests,
    debugTests,
    handleStopDebug,
    handleRestartDebug,
    handleRunScenario,
    handleRunFeature,
    handleDebugScenario,
    getRunConfigBaseUrl,
  };
}
