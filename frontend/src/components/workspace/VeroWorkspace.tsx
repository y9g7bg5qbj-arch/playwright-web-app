import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

import { ActivityBar, type ActivityView } from './ActivityBar.js';
import { CompareTab } from './CompareTab.js';
import { CompareWithModal } from './CompareWithModal.js';
import { ConsolePanel } from './ConsolePanel.js';
import { EnvironmentManager } from './EnvironmentManager.js';
import { type Execution } from './ExecutionsPanel.js';
import { ExecutionReportView } from '../ExecutionDashboard/ExecutionReportView';
import { ExplorerPanel, type FileNode, type NestedProject } from './ExplorerPanel.js';
import { FileContextMenu } from './FileContextMenu.js';
import { Header } from './Header.js';
import { RecordingModal } from './RecordingModal.js';
import { ScenarioBrowser, type ScenarioInfo } from './ScenarioBrowser.js';
import { RunConfigModal } from '../RunConfig/RunConfigModal';
import { SchedulerPanel } from '../Scheduler/SchedulerPanel';
import { AITestRecorderPanel } from '../ide/AITestRecorderPanel.js';
import { ReviewSidePanel } from '../ide/ReviewSidePanel.js';
import { AISettingsModal } from '../settings/AISettingsModal.js';
import { DebugToolbar } from '../ide/DebugToolbar.js';
import { DebugConsolePanel } from '../ide/DebugConsolePanel.js';
import { useDebugger } from '@/hooks/useDebugger';
import { TestDataPage } from '../TestData/TestDataPage.js';
import { TraceViewerPanel } from '../TraceViewer/TraceViewerPanel.js';
import { VeroEditor, type VeroEditorHandle } from '../vero/VeroEditor.js';
import { GutterContextMenu } from '../vero/GutterContextMenu.js';
import { useProjectStore } from '@/store/projectStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { useLocalExecutionStore } from '@/store/useLocalExecutionStore';
import { useRunConfigStore, type RunConfiguration as ZustandRunConfig } from '@/store/runConfigStore';
import { CreateSandboxModal } from '@/components/sandbox/CreateSandboxModal';
import { MergeConflictModal } from './MergeConflictModal';
import { githubRunsApi } from '@/api/github';
import { sandboxApi, type ConflictFile } from '@/api/sandbox';
import {
  buildGitHubInputs,
  buildLocalRunConfig,
  normalizeRunTarget,
  toRelativeVeroPath,
} from './runExecutionUtils.js';
import { humanizePlaywrightError } from '@/utils/playwrightParser';
import {
  convertApiFilesToFileNodes,
  extractScenariosFromContent,
} from './workspaceFileUtils.js';

const API_BASE = '/api';

const FULL_PAGE_VIEWS: ActivityView[] = ['executions', 'schedules', 'testdata', 'ai-test-generator', 'trace'];

interface OpenTab {
  id: string;
  path: string;
  name: string;
  content: string;
  hasChanges: boolean;
  type?: 'file' | 'compare';
  // Compare-specific fields
  compareSource?: string;
  compareTarget?: string;
  projectId?: string;
}

interface VeroRunScenario {
  name: string;
  status: string;
  duration: number;
  error?: string;
  steps: Array<{
    stepNumber: number;
    action: string;
    description: string;
    status: string;
    duration: number;
    error?: string;
  }>;
}

interface VeroRunResponse {
  success?: boolean;
  executionId?: string;
  status?: string;
  output?: string;
  error?: string;
  generatedCode?: string;
  scenarios?: VeroRunScenario[];
  summary?: { passed: number; failed: number; skipped: number };
}

export function VeroWorkspace() {
  // View state
  const [activeView, setActiveView] = useState<ActivityView>('explorer');

  // Project state from store (Application = currentProject, nested projects = currentProject.projects)
  const {
    projects: applications, // All applications
    currentProject,         // Selected application
    isLoading: isProjectsLoading, // Loading state for projects
    fetchProjects,
    fetchNestedProjects,
    createNestedProject,
    deleteNestedProject,
    setCurrentProjectById,
    createProject: createApplication,
  } = useProjectStore();

  // Nested project state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectFiles, setProjectFiles] = useState<Record<string, FileNode[]>>({});

  // File state - Multi-tab support
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['proj:default', 'data', 'features', 'pages']));

  // Derived state for compatibility
  const activeTab = openTabs.find(tab => tab.id === activeTabId);
  const selectedFile = activeTab?.path || null;

  // Run state
  const [isRunning, setIsRunning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Recording state
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [recordingSessionId, setRecordingSessionId] = useState<string | null>(null);

  // Sandbox creation state
  const [showCreateSandboxModal, setShowCreateSandboxModal] = useState(false);
  const [sandboxTargetProjectId, setSandboxTargetProjectId] = useState<string | null>(null);

  // Merge conflict resolution state
  const [showMergeConflictModal, setShowMergeConflictModal] = useState(false);
  const [mergeConflicts, setMergeConflicts] = useState<ConflictFile[]>([]);
  const [mergeSandboxId, setMergeSandboxId] = useState<string | null>(null);
  const [mergeSandboxName, setMergeSandboxName] = useState<string>('');
  const [mergeSourceBranch, setMergeSourceBranch] = useState<string>('dev');

  // Review side panel state
  const [selectedReviewSessionId, setSelectedReviewSessionId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const activeTabIdRef = useRef<string | null>(null);
  const editorRef = useRef<VeroEditorHandle | null>(null);

  // Debug state
  const [debugExecutionId, setDebugExecutionId] = useState<string | null>(null);
  const [showDebugConsole, setShowDebugConsole] = useState(false);
  const {
    debugState,
    breakpointsMuted,
    consoleEntries,
    variables,
    watches,
    callStack,
    toggleBreakpoint,
    toggleMuteBreakpoints,
    addWatch,
    removeWatch,
    startDebug,
    resume,
    pause,
    stepOver,
    stepInto,
    stepOut,
    stopDebug,
    openInspector,
    clearConsole,
  } = useDebugger(socketRef.current, debugExecutionId);

  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  const [showAISettingsModal, setShowAISettingsModal] = useState(false);

  // Executions state
  const [executionBadge, setExecutionBadge] = useState(0);

  // Schedules state - now managed by useScheduleStore (see SchedulePanel)

  // Overlay panel states
  const [showConsole, setShowConsole] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);

  // Trace viewer state
  const [selectedTraceUrl, setSelectedTraceUrl] = useState<string | null>(null);
  const [selectedTraceName, setSelectedTraceName] = useState<string>('');

  // File context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    filePath: string;
    fileName: string;
    projectId?: string;
    relativePath?: string;
    veroPath?: string;
  } | null>(null);

  // Compare modal state
  const [compareModal, setCompareModal] = useState<{
    filePath: string;
    projectId?: string;
  } | null>(null);

  // Gutter context menu state (Run/Debug from editor play icon)
  const [gutterMenu, setGutterMenu] = useState<{ x: number; y: number; itemType: 'scenario' | 'feature'; itemName: string } | null>(null);

  // Scenario Browser state
  const [showScenarioBrowser, setShowScenarioBrowser] = useState(false);
  const [extractedScenarios, setExtractedScenarios] = useState<ScenarioInfo[]>([]);

  const getAuthHeaders = useCallback((extraHeaders: Record<string, string> = {}) => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return extraHeaders;
    }
    return {
      ...extraHeaders,
      Authorization: `Bearer ${token}`,
    };
  }, []);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Fetch nested projects when application changes
  useEffect(() => {
    if (currentProject?.id) {
      fetchNestedProjects(currentProject.id);
    }
  }, [currentProject?.id, fetchNestedProjects]);

  // Fetch executions
  useEffect(() => {
    fetchExecutions();
    const interval = setInterval(fetchExecutions, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Extract scenarios from open tabs
  useEffect(() => {
    const scenarios: ScenarioInfo[] = [];

    // Extract scenarios from all open .vero tabs
    openTabs.forEach(tab => {
      if (tab.name.endsWith('.vero')) {
        const extractedFromFile = extractScenariosFromContent(tab.content, tab.path);
        scenarios.push(...extractedFromFile);
      }
    });

    setExtractedScenarios(scenarios);
  }, [openTabs]);

  // API: Load files for a specific nested project
  const loadProjectFiles = useCallback(async (projectId: string, veroPath?: string) => {
    if (!currentProject) return;

    try {
      const params = new URLSearchParams();
      params.set('projectId', projectId);
      if (veroPath) {
        params.set('veroPath', veroPath);
      }

      const response = await fetch(`${API_BASE}/vero/files?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        // Convert to FileNode format
        const convertedFiles = convertApiFilesToFileNodes(data.files || []);
        setProjectFiles(prev => ({
          ...prev,
          [projectId]: convertedFiles
        }));
      } else {
        setProjectFiles(prev => ({
          ...prev,
          [projectId]: [],
        }));
        addConsoleOutput(`Error loading project files: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to fetch project files:', error);
      setProjectFiles(prev => ({
        ...prev,
        [projectId]: [],
      }));
      addConsoleOutput(`Error loading project files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [currentProject, getAuthHeaders]);

  // API: Fetch execution count for badge (ExecutionDashboard manages its own data)
  const fetchExecutions = async () => {
    let runningCount = 0;

    // Count running local executions
    try {
      const response = await fetch(`${API_BASE}/executions`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success && data.executions) {
        runningCount += data.executions.filter((e: Execution) => e.status === 'running').length;
      }
    } catch (error) {
      console.error('Failed to fetch local executions:', error);
    }

    // Count running GitHub Actions
    try {
      const owner = 'y9g7bg5qbj-arch';
      const repo = 'playwright-web-app';
      const ghResponse = await fetch(`${API_BASE}/github/runs?owner=${owner}&repo=${repo}&limit=10`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      const ghData = await ghResponse.json();
      if (ghData.success && ghData.data) {
        runningCount += ghData.data.filter((r: { status: string }) =>
          r.status === 'in_progress' || r.status === 'queued'
        ).length;
      }
    } catch (error) {
      console.error('Failed to fetch GitHub runs:', error);
    }

    setExecutionBadge(runningCount);
  };

  // API: Load file content (opens in new tab or switches to existing tab)
  const loadFileContent = async (filePath: string, projectId?: string) => {
    // Check if file is already open in a tab
    const existingTab = openTabs.find(tab => tab.path === filePath);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    // Create new tab
    const fileName = filePath.split('/').pop() || 'Untitled';
    const tabId = `tab-${Date.now()}`;

    try {
      // Build the API URL with the correct endpoint format
      // Backend expects: GET /api/vero/files/:path with optional veroPath query param
      const project = projectId
        ? nestedProjects.find(p => p.id === projectId)
        : nestedProjects.find(p => p.id === selectedProjectId);

      // If we have a project veroPath, use it as query param and send relative path
      // Otherwise, send the full path as the URL param
      let apiUrl: string;
      if (project?.veroPath) {
        // Send relative path in URL, veroPath as query param
        // Don't encode the path slashes - Express handles routing properly
        const relativePath = filePath.replace(`${project.veroPath}/`, '');
        apiUrl = `${API_BASE}/vero/files/${relativePath}?veroPath=${encodeURIComponent(project.veroPath)}`;
      } else {
        // Just send the path directly (don't encode slashes)
        apiUrl = `${API_BASE}/vero/files/${filePath}`;
      }

      const response = await fetch(apiUrl, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success && data.content) {
        const newTab: OpenTab = {
          id: tabId,
          path: filePath,
          name: fileName,
          content: data.content,
          hasChanges: false,
        };
        setOpenTabs(prev => [...prev, newTab]);
        setActiveTabId(tabId);
      } else {
        addConsoleOutput(`Error: Failed to load ${fileName}: ${data.error || 'File not found or empty'}`);
      }
    } catch (error) {
      addConsoleOutput(`Error: Failed to load ${fileName}: ${error instanceof Error ? error.message : 'Backend unavailable'}`);
    }
  };

  // Update tab content (for editor changes)
  const updateTabContent = (tabId: string, content: string) => {
    setOpenTabs(prev => prev.map(tab =>
      tab.id === tabId
        ? { ...tab, content, hasChanges: true }
        : tab
    ));
  };

  // Close a tab
  const closeTab = (tabId: string) => {
    setOpenTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId);
      // If closing the active tab, switch to another tab
      if (activeTabId === tabId && newTabs.length > 0) {
        const closedIndex = prev.findIndex(tab => tab.id === tabId);
        const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
        setActiveTabId(newTabs[newActiveIndex].id);
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
      }
      return newTabs;
    });
  };

  // API: Save file content
  const saveFileContent = async (content: string) => {
    if (!activeTab) return;

    try {
      // Find the project to get the veroPath for correct API path construction
      const project = nestedProjects.find(p =>
        activeTab.path.startsWith(p.veroPath || '')
      );

      // Build the API URL with the correct endpoint format
      // Backend expects: PUT /api/vero/files/:path with optional veroPath query param
      // Don't encode slashes in path - Express handles routing properly
      let apiUrl: string;
      if (project?.veroPath) {
        const relativePath = activeTab.path.replace(`${project.veroPath}/`, '');
        apiUrl = `${API_BASE}/vero/files/${relativePath}?veroPath=${encodeURIComponent(project.veroPath)}`;
      } else {
        apiUrl = `${API_BASE}/vero/files/${activeTab.path}`;
      }

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      if (data.success) {
        // Mark tab as saved (no changes)
        setOpenTabs(prev => prev.map(tab =>
          tab.id === activeTab.id
            ? { ...tab, content, hasChanges: false }
            : tab
        ));
        addConsoleOutput(`File saved: ${activeTab.name}`);
      } else {
        addConsoleOutput(`Error: Failed to save ${activeTab.name}: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      addConsoleOutput(`Error: Failed to save ${activeTab.name}: ${error instanceof Error ? error.message : 'Backend unavailable'}`);
    }
  };

  // Local execution store for syncing with Executions tab
  const addLocalExecution = useLocalExecutionStore((state) => state.addExecution);
  const updateLocalExecution = useLocalExecutionStore((state) => state.updateExecution);
  const fetchLocalExecutions = useLocalExecutionStore((state) => state.fetchExecutions);

  // Get run configuration from Zustand store
  const { getActiveConfig, setModalOpen: setRunConfigModalOpen } = useRunConfigStore();

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
    const environmentState = useEnvironmentStore.getState();
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

    return {
      ...environmentVars,
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

  const triggerGitHubRun = async (
    config: ZustandRunConfig,
    tab: OpenTab,
    scenarioName?: string
  ): Promise<void> => {
    const repository = (config as ZustandRunConfig).github?.repository;
    if (!repository) {
      addConsoleOutput('⚠️ GitHub Actions target selected but repository not configured');
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
    const githubInputs = buildGitHubInputs(
      config as unknown as Record<string, unknown>,
      tab.path,
      tab.content,
      scenarioName,
      resolvedEnvVars
    );

    addConsoleOutput(`Triggering GitHub Actions workflow on ${repository}...`);
    addConsoleOutput(`Workflow: ${workflowPath}, Branch: ${branch}`);
    addConsoleOutput(
      scenarioName
        ? `Intent: run scenario "${scenarioName}" in ${relativePath}`
        : `Intent: run Vero file ${relativePath}`
    );

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
        setActiveView('executions');
        setTimeout(() => fetchExecutions(), 3000);
      } else {
        addConsoleOutput(`Failed to trigger workflow: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to trigger GitHub workflow:', error);
      addConsoleOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const runLocalExecution = async (
    config: ZustandRunConfig,
    tab: OpenTab,
    scenarioName?: string
  ): Promise<void> => {
    const tempExecutionId = `temp-${Date.now()}`;
    const startedAt = new Date().toISOString();
    const flowName = scenarioName ? `${tab.name} - ${scenarioName}` : tab.name;
    const runLabel = scenarioName ? `Scenario "${scenarioName}"` : 'Test';

    addLocalExecution({
      id: tempExecutionId,
      testFlowId: '',
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
      const response = await fetch(`${API_BASE}/vero/run`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          content: tab.content,
          filePath: toRelativeVeroPath(tab.path),
          scenarioName,
          config: {
            ...buildLocalRunConfig(config as unknown as Record<string, unknown>),
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

      if (data.success && data.status === 'passed') {
        const summary = data.summary;
        if (summary && summary.passed > 0) {
          addConsoleOutput(`[SUCCESS] ${runLabel} completed: ${summary.passed} passed`);
        } else {
          addConsoleOutput(`[SUCCESS] ${runLabel} completed: passed`);
        }
        await fetchLocalExecutions();
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
              // Show scenario-level error
              if (scenario.error) {
                addConsoleOutput(`  [ERROR] ${humanizePlaywrightError(scenario.error)}`);
              }
              // Show step-level errors
              const failedSteps = scenario.steps.filter(s => s.error);
              for (const step of failedSteps) {
                addConsoleOutput(`    Step ${step.stepNumber} "${step.description}": ${humanizePlaywrightError(step.error!)}`);
              }
            }
          }
        } else if (data.error) {
          // Fallback: show raw error if no structured scenarios
          addConsoleOutput(`  ${humanizePlaywrightError(data.error)}`);
        }

        if (!data.executionId) {
          updateLocalExecution(tempExecutionId, {
            status: 'failed',
            finishedAt: new Date().toISOString(),
            error: data.error,
          });
        }
        await fetchLocalExecutions();
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

  const runTests = async () => {
    if (!activeTab || isRunning) return;

    const config = getActiveConfig();
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
  const debugTests = async () => {
    if (!activeTab || isRunning || debugState.isDebugging) return;

    const newExecutionId = `debug-${Date.now()}`;
    setDebugExecutionId(newExecutionId);
    setShowDebugConsole(true);

    // Connect to WebSocket if not already connected
    if (!socketRef.current) {
      const socket = io(window.location.origin, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
      });
      socketRef.current = socket;
    }

    addConsoleOutput(`Starting debug session for ${activeTab.name}...`);

    // Start the debug session via the hook
    startDebug(activeTab.path, activeTab.content, newExecutionId);
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

    // Skip null state — go directly to new execution ID to avoid
    // a window where socket listeners are detached
    const newExecutionId = `debug-${Date.now()}`;
    setDebugExecutionId(newExecutionId);
    setShowDebugConsole(true);

    addConsoleOutput(`Restarting debug session for ${activeTab.name}...`);
    startDebug(activeTab.path, activeTab.content, newExecutionId);
  };

  // Run a specific scenario by name (triggered from editor play button)
  const handleRunScenario = async (scenarioName: string) => {
    if (!activeTab || isRunning) return;

    const normalizedScenarioName = scenarioName.trim();
    if (!normalizedScenarioName) {
      addConsoleOutput('Cannot run scenario: missing scenario name');
      return;
    }

    const config = getActiveConfig();
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

    // For now, running a feature runs all scenarios in the current file
    // The feature name is for logging purposes
    addConsoleOutput(`Running feature "${featureName}"...`);
    await runTests();
  };

  // Debug a specific scenario by name (triggered from gutter context menu)
  const handleDebugScenario = async (scenarioName: string) => {
    if (!activeTab || isRunning || debugState.isDebugging) return;

    const newExecutionId = `debug-${Date.now()}`;
    setDebugExecutionId(newExecutionId);
    setShowDebugConsole(true);

    if (!socketRef.current) {
      const socket = io(window.location.origin, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
      });
      socketRef.current = socket;
    }

    addConsoleOutput(`Starting debug for scenario "${scenarioName}" in ${activeTab.name}...`);
    startDebug(activeTab.path, activeTab.content, newExecutionId, scenarioName);
  };

  // Insert recorded scenario into the active editor
  const insertRecordedScenario = (scenarioName: string, veroLines: string[]) => {
    // Generate complete Vero scenario with brace syntax
    // Format: scenario "Name" { steps }
    const stepsIndented = veroLines.map(line => `    ${line}`).join('\n');
    const veroScenario = `  scenario "${scenarioName}" {\n${stepsIndented}\n  }`;

    // Use functional update to get current tabs and activeTabIdRef
    setOpenTabs(tabs => {
      const currentActiveTabId = activeTabIdRef.current;
      const currentActiveTab = tabs.find(tab => tab.id === currentActiveTabId);

      // If we have an active .vero file, insert the scenario inside the feature block
      if (currentActiveTab && currentActiveTab.name.endsWith('.vero')) {
        let content = currentActiveTab.content;

        // Try to find closing brace of feature block (handles both `}` and `end feature`)
        // Insert the scenario before the closing brace/end-feature keyword
        if (/(\s*}\s*)$/.test(content)) {
          content = content.replace(/(\s*}\s*)$/, `\n\n${veroScenario}\n}`);
        } else if (/(\s*end\s+feature\s*)$/i.test(content)) {
          content = content.replace(/(\s*end\s+feature\s*)$/i, `\n\n${veroScenario}\n\nend feature\n`);
        } else {
          content = content + '\n\n' + veroScenario + '\n';
        }

        addConsoleOutput(`Scenario "${scenarioName}" added to ${currentActiveTab.name}`);
        return tabs.map(tab =>
          tab.id === currentActiveTabId
            ? { ...tab, content, hasChanges: true }
            : tab
        );
      } else {
        // No .vero file open - log to console
        const newFileContent = `feature RecordedTests {\n\n${veroScenario}\n\n}`;
        addConsoleOutput('No .vero file open. Recorded scenario:');
        addConsoleOutput(newFileContent);
        return tabs;
      }
    });
  };

  const handleRecordClick = () => setShowRecordingModal(true);

  function cleanupRecordingState(): void {
    setIsRecording(false);
    setRecordingSessionId(null);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }

  async function startRecording(scenarioName: string, url: string): Promise<void> {
    setShowRecordingModal(false);
    setIsRecording(true);

    const sessionId = `rec-${Date.now()}`;
    setRecordingSessionId(sessionId);

    addConsoleOutput(`Starting recording: ${scenarioName}`);
    addConsoleOutput(`URL: ${url}`);

    try {
      // Connect to WebSocket for real-time updates
      const socket = io(window.location.origin, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
      });
      socketRef.current = socket;

      // Subscribe to recording events
      socket.on('connect', () => {
        socket.emit('codegen:subscribe', { sessionId });
      });

      // Real-time Vero code updates
      // Capture project info at recording start for reliable refresh in callbacks
      const recProjId = activeTab?.projectId || selectedProjectId;
      const recProject = nestedProjects.find(p => p.id === recProjId);
      let fileRefreshTimer: ReturnType<typeof setTimeout> | null = null;
      socket.on('codegen:action', (data: { veroCode: string; pagePath?: string; fieldCreated?: unknown }) => {
        addConsoleOutput(`  Recording: ${data.veroCode}`);

        // Debounced file tree refresh during recording to pick up new page files
        if (fileRefreshTimer) clearTimeout(fileRefreshTimer);
        fileRefreshTimer = setTimeout(() => {
          if (recProjId && recProject?.veroPath) {
            loadProjectFiles(recProjId, recProject.veroPath);
          }
        }, 1000);
      });

      socket.on('codegen:error', (data: { error: string }) => {
        console.error('[Recording] Error:', data.error);
        addConsoleOutput(`Recording error: ${data.error}`);
      });

      socket.on('codegen:stopped', (data: { sessionId: string; veroLines: string[]; scenarioName: string }) => {
        addConsoleOutput('Recording completed');

        // Use the veroLines from the server (Playwright writes to file only when browser closes)
        if (data.veroLines && data.veroLines.length > 0) {
          insertRecordedScenario(data.scenarioName || scenarioName, data.veroLines);
        } else {
          addConsoleOutput('No actions were recorded');
        }

        cleanupRecordingState();
      });

      // Derive sandbox path from the active file's location.
      // The path before /Features/, /Pages/, or /PageActions/ is the sandbox (or project) root.
      const deriveSandboxPath = (): string | undefined => {
        if (activeTab?.path) {
          const match = activeTab.path.match(/^(.+?)\/(Features|Pages|PageActions)\//);
          if (match) return match[1];
        }
        // Fallback: use the project's veroPath
        const projId = activeTab?.projectId || selectedProjectId;
        if (projId) {
          return nestedProjects.find(p => p.id === projId)?.veroPath;
        }
        return undefined;
      };

      const response = await fetch(`${API_BASE}/codegen/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          url,
          scenarioName,
          projectId: currentProject?.id,
          sandboxPath: deriveSandboxPath(),
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to start recording');
      }

      addConsoleOutput('Playwright Codegen browser launched');
      addConsoleOutput('Record your actions, then close the browser when done');
    } catch (error) {
      console.error('Failed to start recording:', error);
      addConsoleOutput(`Error: ${error}`);
      cleanupRecordingState();
    }
  }
  async function stopRecording(): Promise<void> {
    if (!recordingSessionId) {
      setIsRecording(false);
      return;
    }

    try {
      addConsoleOutput('Stopping recording...');
      const response = await fetch(`${API_BASE}/codegen/stop/${recordingSessionId}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        addConsoleOutput('Recording stopped');
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      addConsoleOutput(`Error stopping recording: ${error}`);
    } finally {
      cleanupRecordingState();
    }
  }

  // Keyboard shortcuts (Ctrl+S to save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const currentTab = openTabs.find(t => t.id === activeTabIdRef.current);
        if (currentTab && currentTab.type !== 'compare') {
          saveFileContent(currentTab.content);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openTabs]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Schedule handlers - now managed by useScheduleStore (see SchedulePanel)

  // Execution handlers
  const handleViewTrace = (url: string, scenarioName: string) => {
    setSelectedTraceUrl(url);
    setSelectedTraceName(scenarioName);
    setActiveView('trace');
  };

  function handleNavigateToScenario(scenario: ScenarioInfo): void {
    const existingTab = openTabs.find(tab => tab.path === scenario.filePath);

    if (existingTab) {
      setActiveTabId(existingTab.id);
    } else {
      loadFileContent(scenario.filePath);
    }

    setShowScenarioBrowser(false);

    // TODO: Implement actual editor scrolling to line
    setTimeout(() => {
      addConsoleOutput(`Navigate to ${scenario.filePath}:${scenario.line} - ${scenario.name}`);
    }, 100);
  }

  // File tree handlers
  const handleFileSelect = (file: FileNode, projectId?: string) => {
    if (file.type === 'file') {
      if (projectId) {
        setSelectedProjectId(projectId);
      }
      // Construct full path using project's veroPath
      const project = nestedProjects.find(p => p.id === projectId);
      const fullPath = project?.veroPath
        ? `${project.veroPath}/${file.path}`
        : file.path;
      // Pass projectId to loadFileContent so it can construct the correct API URL
      loadFileContent(fullPath, projectId);
    }
  };

  const handleFolderToggle = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Application handlers (top-level)
  const handleApplicationSelect = async (applicationId: string) => {
    await setCurrentProjectById(applicationId);
  };

  const handleCreateApplication = async () => {
    const name = prompt('Enter application name:');
    if (!name) return;

    try {
      await createApplication({ name });
      await fetchProjects();
    } catch (error) {
      console.error('Failed to create application:', error);
    }
  };

  // Project handlers (nested within application)
  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const handleProjectExpand = (projectId: string) => {
    // Find the project from store and load its files if not already loaded
    const project = currentProject?.projects?.find(p => p.id === projectId);
    if (project && !projectFiles[projectId]) {
      loadProjectFiles(projectId, project.veroPath);
    }
  };

  const handleCreateProject = async () => {
    if (!currentProject?.id) {
      addConsoleOutput('Error: No application selected. Please select an application first.');
      alert('No application selected. Please select an application from the header dropdown first.');
      return;
    }

    const name = prompt('Enter project name:');
    if (!name || !name.trim()) {
      return;
    }

    try {
      addConsoleOutput(`Creating project "${name}"...`);
      const project = await createNestedProject(currentProject.id, { name: name.trim() });
      // Refresh nested projects
      await fetchNestedProjects(currentProject.id);
      addConsoleOutput(`Project "${project.name}" created successfully.`);
      // Expand the new project in the file tree
      setExpandedFolders(prev => {
        const next = new Set(prev);
        next.add(`proj:${project.id}`);
        return next;
      });
      setSelectedProjectId(project.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to create project:', error);
      addConsoleOutput(`Error creating project: ${errorMessage}`);
      alert(`Failed to create project: ${errorMessage}`);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!currentProject?.id) return;

    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await deleteNestedProject(currentProject.id, projectId);
      // Refresh nested projects
      await fetchNestedProjects(currentProject.id);
      // Clear selected if deleted
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleCreateFile = async (projectId: string, folderPath: string) => {
    // Find the project to get the veroPath
    const project = nestedProjects.find(p => p.id === projectId);
    if (!project?.veroPath) {
      addConsoleOutput('Error: Could not find project path');
      return;
    }

    // Prompt user for filename
    const fileName = prompt('Enter file name (e.g., MyTest.vero):');
    if (!fileName || !fileName.trim()) {
      return; // User cancelled
    }

    // Ensure .vero extension for feature files in Features folder
    let finalFileName = fileName.trim();
    const isFeatureFolder = folderPath.toLowerCase().includes('feature');
    if (isFeatureFolder && !finalFileName.endsWith('.vero') && !finalFileName.endsWith('.json')) {
      finalFileName += '.vero';
    }

    // Create default content based on file type
    let defaultContent = '';
    if (finalFileName.endsWith('.vero')) {
      const featureName = finalFileName.replace('.vero', '');
      defaultContent = `FEATURE ${featureName} {
  SCENARIO "New Scenario" @smoke {
    OPEN "https://example.com"
  }
}
`;
    } else if (finalFileName.endsWith('.json')) {
      defaultContent = '{\n  \n}\n';
    }

    // Construct the file path
    const relativePath = `${folderPath}/${finalFileName}`;
    const apiUrl = `${API_BASE}/vero/files/${relativePath}?veroPath=${encodeURIComponent(project.veroPath)}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ content: defaultContent }),
      });
      const data = await response.json();

      if (data.success) {
        addConsoleOutput(`File created: ${finalFileName}`);

        // Refresh the file tree
        await loadProjectFiles(projectId, project.veroPath);

        // Open the new file in a tab
        const tabId = `tab-${Date.now()}`;
        const fullPath = `${project.veroPath}/${relativePath}`;
        const newTab: OpenTab = {
          id: tabId,
          path: fullPath,
          name: finalFileName,
          content: defaultContent,
          hasChanges: false,
          projectId,
        };
        setOpenTabs(prev => [...prev, newTab]);
        setActiveTabId(tabId);
      } else {
        addConsoleOutput(`Error creating file: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create file:', error);
      addConsoleOutput(`Error creating file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleCreateSandbox = (projectId: string) => {
    if (!projectId || projectId.trim() === '') {
      addConsoleOutput('Error: Cannot create sandbox - project ID is missing. Please expand a project first.');
      return;
    }

    if (!isValidUUID(projectId)) {
      addConsoleOutput(`Error: Invalid project ID format: "${projectId}". Expected a UUID.`);
      return;
    }

    setSandboxTargetProjectId(projectId);
    setShowCreateSandboxModal(true);
  };

  const handleSandboxCreated = () => {
    setShowCreateSandboxModal(false);
    setSandboxTargetProjectId(null);
    // Refresh the project files to show the new sandbox
    if (sandboxTargetProjectId) {
      const project = nestedProjects.find(p => p.id === sandboxTargetProjectId);
      if (project?.veroPath) {
        loadProjectFiles(sandboxTargetProjectId, project.veroPath);
      }
    }
    addConsoleOutput('Sandbox created successfully!');
  };

  // Helper to validate UUID format
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Sync sandbox handler - triggers three-way merge if conflicts exist
  const handleSyncSandbox = async (sandboxName: string, projectId: string) => {
    if (!projectId || projectId.trim() === '') {
      addConsoleOutput('Error: Cannot sync sandbox - project ID is missing. Please expand a project first.');
      return;
    }

    if (!isValidUUID(projectId)) {
      addConsoleOutput(`Error: Invalid project ID format: "${projectId}". Expected a UUID.`);
      return;
    }

    addConsoleOutput(`Syncing sandbox "${sandboxName}"...`);

    try {
      const project = nestedProjects.find(p => p.id === projectId);
      if (!project) {
        addConsoleOutput(`Error: Project not found (id=${projectId})`);
        return;
      }

      const sandboxes = await sandboxApi.listByProject(projectId);
      const sandbox = sandboxes.find(s => s.name === sandboxName || s.folderPath?.includes(sandboxName));

      if (!sandbox) {
        addConsoleOutput(`Error: Sandbox "${sandboxName}" not found. It may not be registered in the database.`);
        return;
      }

      addConsoleOutput(`Found sandbox ID: ${sandbox.id}, source: ${sandbox.sourceBranch}`);

      // Call sync with details to get conflict information
      const result = await sandboxApi.syncWithDetails(sandbox.id);

      // Note: result.success=false means "sync not complete, conflicts exist"
      // This is NOT an error - it's a normal case that triggers the merge UI
      if (result.hasConflicts && result.conflicts && result.conflicts.length > 0) {
        // Show merge conflict resolution modal
        addConsoleOutput(`Found ${result.conflicts.length} file(s) with conflicts`);
        setMergeConflicts(result.conflicts);
        setMergeSandboxId(sandbox.id);
        setMergeSandboxName(sandbox.name);
        setMergeSourceBranch(sandbox.sourceBranch);
        setShowMergeConflictModal(true);
      } else {
        // No conflicts, sync completed successfully
        addConsoleOutput(`Sandbox "${sandboxName}" synced successfully with no conflicts!`);
        // Refresh the project files
        if (project.veroPath) {
          loadProjectFiles(projectId, project.veroPath);
        }
      }
    } catch (error) {
      console.error('Failed to sync sandbox:', error);
      addConsoleOutput(`Error syncing sandbox: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handle merge conflict resolution
  const handleResolveMergeConflicts = async (resolutions: Record<string, string>) => {
    if (!mergeSandboxId) return;

    try {
      addConsoleOutput(`Applying conflict resolutions...`);

      const result = await sandboxApi.resolveConflicts(mergeSandboxId, resolutions, true);

      if (result.success) {
        addConsoleOutput(`Resolved conflicts and updated ${result.updatedFiles.length} file(s)`);
        setShowMergeConflictModal(false);
        setMergeConflicts([]);
        setMergeSandboxId(null);

        // Refresh the project files to show updated content
        // Find the project that contains this sandbox
        for (const project of nestedProjects) {
          if (project.veroPath && result.sandbox?.folderPath?.includes(project.veroPath)) {
            loadProjectFiles(project.id, project.veroPath);
            break;
          }
        }
      } else {
        addConsoleOutput(`Failed to resolve conflicts`);
      }
    } catch (error) {
      console.error('Failed to resolve conflicts:', error);
      addConsoleOutput(`Error resolving conflicts: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // File context menu handler
  const handleFileContextMenu = (file: FileNode, projectId: string | undefined, x: number, y: number) => {
    // Construct full path using project's veroPath
    const project = nestedProjects.find(p => p.id === projectId);
    const fullPath = project?.veroPath
      ? `${project.veroPath}/${file.path}`
      : file.path;

    setContextMenu({
      x,
      y,
      filePath: fullPath,
      fileName: file.name,
      projectId,
      relativePath: file.path,
      veroPath: project?.veroPath,
    });
  };

  // Handler to delete a file
  const handleDeleteFile = async (filePath: string) => {
    if (!contextMenu) return;

    const fileName = contextMenu.fileName;
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;

    try {
      const relativePath = contextMenu.relativePath || fileName;
      const params = new URLSearchParams();
      if (contextMenu.veroPath) params.set('veroPath', contextMenu.veroPath);

      const response = await fetch(`${API_BASE}/vero/files/${encodeURIComponent(relativePath)}?${params}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        addConsoleOutput(`Deleted ${fileName}`);

        // Close the file if it's open in a tab
        const matchingTab = openTabs.find(t => t.path === filePath);
        if (matchingTab) {
          setOpenTabs(prev => prev.filter(t => t.id !== matchingTab.id));
          if (activeTabId === matchingTab.id) {
            const remaining = openTabs.filter(t => t.id !== matchingTab.id);
            setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
          }
        }

        // Refresh file tree
        const projId = contextMenu.projectId || selectedProjectId;
        const project = nestedProjects.find(p => p.id === projId);
        if (projId && project?.veroPath) {
          loadProjectFiles(projId, project.veroPath);
        }
      } else {
        addConsoleOutput(`Error deleting ${fileName}: ${data.error}`);
      }
    } catch (error) {
      addConsoleOutput(`Error deleting ${fileName}: ${error}`);
    }

    setContextMenu(null);
  };

  // Handler to rename a file
  const handleRenameFile = async (_filePath: string) => {
    if (!contextMenu) return;

    const oldName = contextMenu.fileName;
    const newName = prompt('Enter new name:', oldName);
    if (!newName || newName === oldName) return;

    try {
      const relativePath = contextMenu.relativePath || oldName;
      // Compute new relative path: replace the filename in the path
      const pathParts = relativePath.split('/');
      pathParts[pathParts.length - 1] = newName;
      const newRelativePath = pathParts.join('/');

      const response = await fetch(`${API_BASE}/vero/files/rename`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ oldPath: relativePath, newPath: newRelativePath, veroPath: contextMenu.veroPath }),
      });
      const data = await response.json();

      if (data.success) {
        addConsoleOutput(`Renamed ${oldName} to ${newName}`);
        const projId = contextMenu.projectId || selectedProjectId;
        const project = nestedProjects.find(p => p.id === projId);
        if (projId && project?.veroPath) {
          loadProjectFiles(projId, project.veroPath);
        }
      } else {
        addConsoleOutput(`Error renaming: ${data.error}`);
      }
    } catch (error) {
      addConsoleOutput(`Error renaming: ${error}`);
    }

    setContextMenu(null);
  };

  // Handler to open compare modal
  const handleOpenCompareWith = (filePath: string) => {
    // Get the project ID from context menu or selected project
    // Fall back to application ID if no nested project is selected
    const nestedProjectId = contextMenu?.projectId || selectedProjectId;

    // Use nested project ID, or fall back to the application ID
    const projectId = nestedProjectId || currentProject?.id;

    if (!projectId) {
      addConsoleOutput('Error: No project selected. Please select a project first.');
      setContextMenu(null);
      return;
    }

    setCompareModal({
      filePath,
      projectId,
    });
    setContextMenu(null);
  };

  // Handler to open compare tab
  const handleCompare = (source: string, target: string) => {
    if (!compareModal) return;

    const fileName = compareModal.filePath.split('/').pop() || 'Compare';
    const tabId = `compare-${Date.now()}`;

    const newTab: OpenTab = {
      id: tabId,
      path: compareModal.filePath,
      name: `${fileName} (${source} ↔ ${target})`,
      content: '', // Compare tabs don't have editable content
      hasChanges: false,
      type: 'compare',
      compareSource: source,
      compareTarget: target,
      projectId: compareModal.projectId,
    };

    setOpenTabs(prev => [...prev, newTab]);
    setActiveTabId(tabId);
    setCompareModal(null);
    addConsoleOutput(`Comparing ${fileName}: ${source} vs ${target}`);
  };

  // Handler to apply changes from compare view
  const handleApplyCompareChanges = (tabId: string, content: string) => {
    const tab = openTabs.find(t => t.id === tabId);
    if (!tab) return;

    // Find or create a file tab for this path
    const existingFileTab = openTabs.find(t => t.path === tab.path && t.type !== 'compare');

    if (existingFileTab) {
      // Update existing file tab
      setOpenTabs(prev => prev.map(t =>
        t.id === existingFileTab.id
          ? { ...t, content, hasChanges: true }
          : t
      ));
      setActiveTabId(existingFileTab.id);
      addConsoleOutput(`Applied changes to ${tab.name.split(' (')[0]}`);
    } else {
      // Create new file tab with the content
      const fileName = tab.path.split('/').pop() || 'Untitled';
      const newTabId = `tab-${Date.now()}`;
      const newTab: OpenTab = {
        id: newTabId,
        path: tab.path,
        name: fileName,
        content,
        hasChanges: true,
        type: 'file',
        projectId: tab.projectId,
      };
      setOpenTabs(prev => [...prev, newTab]);
      setActiveTabId(newTabId);
      addConsoleOutput(`Created file tab with applied changes: ${fileName}`);
    }
  };

  // Convert nested projects from store format to ExplorerPanel format
  const nestedProjects: NestedProject[] = (currentProject?.projects || []).map(p => ({
    id: p.id,
    name: p.name,
    veroPath: p.veroPath,
    files: projectFiles[p.id],
  }));

  const isFullPageView = FULL_PAGE_VIEWS.includes(activeView);

  // Handle cross-file "Go to Definition" navigation from the editor
  const handleNavigateToDefinition = useCallback(async (targetPath: string, line: number, _column: number) => {
    // The backend returns absolute paths like /abs/path/to/Pages/HomePage.vero
    // loadFileContent expects full veroPath-prefixed paths
    // Try to match the targetPath to a known project's veroPath
    let resolvedPath = targetPath;
    for (const project of nestedProjects) {
      if (project.veroPath && targetPath.includes(project.veroPath)) {
        // Already a full path that includes the veroPath — use as-is
        resolvedPath = targetPath;
        break;
      }
      // If the backend returned just the relative portion (e.g., Pages/HomePage.vero)
      if (project.veroPath && !targetPath.startsWith('/')) {
        resolvedPath = `${project.veroPath}/${targetPath}`;
        break;
      }
    }

    await loadFileContent(resolvedPath);

    // After the tab opens and the editor mounts, scroll to the target line
    setTimeout(() => {
      editorRef.current?.goToLine(line);
    }, 150);
  }, [nestedProjects, loadFileContent]);

  // Console output helper — auto-opens console on errors
  const addConsoleOutput = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleOutput(prev => [...prev, `[${timestamp}] ${message}`]);
    if (message.includes('[ERROR]') || message.includes('FAILED')) {
      setShowConsole(true);
    }
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[#0d1117] text-white font-sans">
      {/* Header */}
      <Header
        applications={applications.map(a => ({ id: a.id, name: a.name }))}
        selectedApplicationId={currentProject?.id || null}
        onApplicationSelect={handleApplicationSelect}
        onCreateApplication={handleCreateApplication}
        isRunning={isRunning}
        isDebugging={debugState.isDebugging}
        isRecording={isRecording}
        onRun={runTests}
        onDebug={debugTests}
        onStop={() => {
          if (debugState.isDebugging) {
            handleStopDebug();
            return;
          }
          setIsRunning(false);
        }}
        onRecord={handleRecordClick}
        onStopRecording={stopRecording}
        showRunControls={activeView === 'explorer'}
        currentFileName={activeTab?.name}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar
          activeView={activeView}
          onViewChange={setActiveView}
          executionBadge={executionBadge}
          onOpenScenarioBrowser={() => setShowScenarioBrowser(true)}
          scenarioCount={extractedScenarios.length}
        />

        {/* Full-page panels (Executions, Schedules) */}
        {isFullPageView ? (
          <div className="flex-1 overflow-hidden">
            {activeView === 'executions' && (
              <ExecutionReportView
                onJumpToEditor={(line) => {
                  // Navigate to line in editor
                  addConsoleOutput(`Navigate to line ${line}`);
                }}
                onViewTrace={handleViewTrace}
                onOpenAllure={(_executionId) => {
                  // TODO: open Allure report
                }}
              />
            )}
            {activeView === 'schedules' && (
              <SchedulerPanel
                onRunTriggered={() => {
                  void fetchExecutions();
                  setActiveView('executions');
                }}
              />
            )}
            {activeView === 'testdata' && currentProject?.id && (
              <TestDataPage projectId={currentProject.id} />
            )}
            {activeView === 'testdata' && isProjectsLoading && (
              <div className="flex-1 flex items-center justify-center text-[#8b949e]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mx-auto mb-4"></div>
                  <p>Loading projects...</p>
                </div>
              </div>
            )}
            {activeView === 'testdata' && !isProjectsLoading && !currentProject && (
              <div className="flex-1 flex items-center justify-center text-[#8b949e]">
                <div className="text-center">
                  <span className="material-symbols-outlined text-5xl mb-4 block opacity-50">database</span>
                  <p>Select a project to view test data</p>
                </div>
              </div>
            )}
            {activeView === 'ai-test-generator' && currentProject && (
              <AITestRecorderPanel
                onTestApproved={(_testId, veroCode, filePath) => {
                  // Create a new tab for the approved test
                  const fileName = filePath.split('/').pop() || 'NewTest.vero';
                  const tabId = `tab-${Date.now()}`;
                  const newTab: OpenTab = {
                    id: tabId,
                    path: filePath,
                    name: fileName,
                    content: veroCode,
                    hasChanges: true,
                  };
                  setOpenTabs(prev => [...prev, newTab]);
                  setActiveTabId(tabId);
                  setActiveView('explorer');
                  addConsoleOutput(`Test approved and loaded: ${filePath}`);
                }}
                projectPath={selectedProjectId ? nestedProjects.find(p => p.id === selectedProjectId)?.veroPath : undefined}
                selectedSessionId={selectedReviewSessionId}
              />
            )}
            {activeView === 'ai-test-generator' && !currentProject && (
              <div className="flex-1 flex items-center justify-center text-[#8b949e]">
                <div className="text-center">
                  <span className="material-symbols-outlined text-5xl mb-4 block opacity-50">smart_toy</span>
                  <p>Select a project to use AI Test Generator</p>
                </div>
              </div>
            )}
            {activeView === 'trace' && selectedTraceUrl && (
              <TraceViewerPanel
                traceUrl={selectedTraceUrl}
                testId="selected-test"
                testName={selectedTraceName}
                onClose={() => {
                  setSelectedTraceUrl(null);
                  setActiveView('executions');
                }}
              />
            )}
            {activeView === 'trace' && !selectedTraceUrl && (
              <div className="flex-1 flex items-center justify-center text-[#8b949e]">
                <div className="text-center">
                  <span className="material-symbols-outlined text-5xl mb-4 block opacity-50">bug_report</span>
                  <p>No trace selected</p>
                  <p className="text-xs mt-1">Run a test with tracing enabled to view traces</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Primary Sidebar */}
            <aside className="w-[280px] flex flex-col bg-[#161b22] shrink-0">
              {activeView === 'explorer' && (
                <ExplorerPanel
                  applicationName={currentProject?.name || 'VERO-PROJECT'}
                  projects={nestedProjects}
                  selectedProjectId={selectedProjectId}
                  projectFiles={projectFiles}
                  selectedFile={selectedFile}
                  expandedFolders={expandedFolders}
                  activeFileContent={activeTab?.content || null}
                  activeFileName={activeTab?.name || null}
                  onFileSelect={handleFileSelect}
                  onFolderToggle={handleFolderToggle}
                  onProjectSelect={handleProjectSelect}
                  onProjectExpand={handleProjectExpand}
                  onCreateProject={handleCreateProject}
                  onDeleteProject={handleDeleteProject}
                  onCreateFile={handleCreateFile}
                  onCreateSandbox={handleCreateSandbox}
                  onSyncSandbox={handleSyncSandbox}
                  onNavigateToLine={(line) => {
                    addConsoleOutput(`Navigate to line ${line}`);
                  }}
                  onFileContextMenu={handleFileContextMenu}
                />
              )}
              {activeView === 'settings' && (
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="h-12 flex items-center px-4 border-b border-[#30363d]">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Settings</span>
                  </div>
                  <div className="p-4 space-y-4">
                    <button
                      onClick={() => setShowAISettingsModal(true)}
                      className="w-full px-4 py-2 bg-[#21262d] border border-[#30363d] rounded-lg text-sm text-white hover:bg-[#30363d] transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">auto_awesome</span>
                      AI Provider Settings
                    </button>
                    <button
                      onClick={() => setRunConfigModalOpen(true)}
                      className="w-full px-4 py-2 bg-[#21262d] border border-[#30363d] rounded-lg text-sm text-white hover:bg-[#30363d] transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">tune</span>
                      Run Configurations
                    </button>
                  </div>
                </div>
              )}
            </aside>

            {/* Editor Area */}
            <main className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
              {openTabs.length > 0 ? (
                <div className="flex-1 flex flex-col">
                  {/* Tab Bar */}
                  <div className="h-10 flex items-center justify-between border-b border-[#30363d] bg-[#161b22]">
                    {/* Tabs */}
                    <div className="flex items-center overflow-x-auto flex-1">
                      {openTabs.map(tab => (
                        <div
                          key={tab.id}
                          onClick={() => setActiveTabId(tab.id)}
                          className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm border-r border-[#30363d] min-w-0 group ${activeTabId === tab.id
                            ? 'bg-[#0d1117] text-white'
                            : 'bg-[#161b22] text-[#8b949e] hover:text-white hover:bg-[#21262d]'
                            }`}
                        >
                          <span className={`material-symbols-outlined text-sm ${tab.type === 'compare'
                            ? (activeTabId === tab.id ? 'text-purple-400' : 'text-[#8b949e]')
                            : (activeTabId === tab.id ? 'text-[#135bec]' : 'text-[#8b949e]')
                            }`}>
                            {tab.type === 'compare' ? 'compare' : 'description'}
                          </span>
                          <span className="truncate max-w-[120px]">{tab.name}</span>
                          {tab.hasChanges && (
                            <span className="w-2 h-2 bg-[#58a6ff] rounded-full flex-shrink-0" />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              closeTab(tab.id);
                            }}
                            className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#30363d] transition-opacity"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                    {/* Save Button - only for file tabs */}
                    {activeTab && activeTab.type !== 'compare' && (
                      <button
                        onClick={() => saveFileContent(activeTab.content)}
                        className="mx-2 px-3 py-1 text-xs bg-[#238636] hover:bg-[#2ea043] text-white rounded transition-colors flex items-center gap-1 flex-shrink-0"
                      >
                        <span className="material-symbols-outlined text-sm">save</span>
                        Save
                      </button>
                    )}
                  </div>

                  {/* Debug controls */}
                  {(isRunning || debugState.isDebugging || debugState.breakpoints.size > 0) && (
                    <DebugToolbar
                      isRunning={isRunning}
                      debugState={debugState}
                      breakpointsMuted={breakpointsMuted}
                      onPause={pause}
                      onResume={resume}
                      onStepOver={stepOver}
                      onStepInto={stepInto}
                      onStepOut={stepOut}
                      onStop={handleStopDebug}
                      onRestart={handleRestartDebug}
                      onToggleMuteBreakpoints={toggleMuteBreakpoints}
                      onOpenInspector={openInspector}
                    />
                  )}

                  {/* Editor or Compare View */}
                  <div className="flex-1 flex flex-col min-h-0">
                    {activeTab && activeTab.type === 'compare' ? (
                      <CompareTab
                        key={activeTab.id}
                        projectId={activeTab.projectId || currentProject?.id || ''}
                        filePath={activeTab.path}
                        initialSource={activeTab.compareSource}
                        initialTarget={activeTab.compareTarget}
                        onClose={() => closeTab(activeTab.id)}
                        onApplyChanges={(content) => handleApplyCompareChanges(activeTab.id, content)}
                      />
                    ) : activeTab ? (
                      <VeroEditor
                        ref={editorRef}
                        key={activeTab.id}
                        initialValue={activeTab.content}
                        onChange={(value) => value && updateTabContent(activeTab.id, value)}
                        onRunScenario={handleRunScenario}
                        onRunFeature={handleRunFeature}
                        onGutterContextMenu={(info) => setGutterMenu(info)}
                        showErrorPanel={true}
                        token={null}
                        veroPath={nestedProjects.find(p => activeTab.path.startsWith(p.veroPath || ''))?.veroPath}
                        filePath={activeTab.path}
                        projectId={nestedProjects.find(p => activeTab.path.startsWith(p.veroPath || ''))?.id}
                        onNavigateToDefinition={handleNavigateToDefinition}
                        breakpoints={debugState.breakpoints}
                        onToggleBreakpoint={toggleBreakpoint}
                        debugCurrentLine={debugState.currentLine}
                        isDebugging={debugState.isDebugging}
                      />
                    ) : null}
                  </div>

                  {/* Debug Console Panel - Shows when debugging or manually opened */}
                  {(debugState.isDebugging || showDebugConsole) && (
                    <DebugConsolePanel
                      entries={consoleEntries}
                      variables={variables}
                      watches={watches}
                      callStack={callStack}
                      problems={[]}
                      isMinimized={!showDebugConsole}
                      onToggleMinimize={() => setShowDebugConsole(!showDebugConsole)}
                      onClearConsole={clearConsole}
                      onGoToLine={(line) => editorRef.current?.goToLine(line)}
                      onAddWatch={addWatch}
                      onRemoveWatch={removeWatch}
                    />
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-[#135bec] to-[#8b5cf6] flex items-center justify-center">
                      <span className="text-white font-bold text-2xl">V</span>
                    </div>
                    <h2 className="text-xl font-semibold text-[#e6edf3] mb-2">Welcome to Vero IDE</h2>
                    <p className="text-[#8b949e] text-sm max-w-md">
                      Select a file from the Explorer to start editing,<br />
                      or create a new test scenario.
                    </p>
                  </div>
                </div>
              )}
            </main>

            {/* Review Side Panel - Shows sessions needing attention */}
            <ReviewSidePanel
              onSelectSession={(sessionId) => {
                setSelectedReviewSessionId(sessionId);
                setActiveView('ai-test-generator');
              }}
              onOpenAIStudio={() => setActiveView('ai-test-generator')}
            />
          </>
        )}
      </div>

      {/* Bottom Status Bar (IntelliJ-style) */}
      <div className="h-6 flex items-center bg-[#161b22] border-t border-[#30363d] px-1 shrink-0">
        {/* Left section - Terminal toggle */}
        <button
          onClick={() => setShowConsole(!showConsole)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${showConsole
            ? 'bg-[#238636] text-white'
            : 'text-[#8b949e] hover:text-white hover:bg-[#30363d]'
            }`}
          title="Toggle Terminal"
        >
          <span className="material-symbols-outlined text-[14px]">terminal</span>
          <span>Terminal</span>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right section - Status info */}
        <div className="flex items-center gap-3 text-xs text-[#8b949e]">
          {isRunning && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-[#238636] rounded-full animate-pulse" />
              Running
            </span>
          )}
          {activeTab && (
            <span className="truncate max-w-[200px]">{activeTab.name}</span>
          )}
        </div>
      </div>

      {/* Overlay Panels */}
      {/* Console Panel (bottom overlay - above status bar) */}
      {showConsole && (
        <div className="fixed left-[48px] right-0 bottom-6 h-[200px] bg-[#0d1117] border-t border-[#30363d] z-30 shadow-xl">
          <ConsolePanel
            output={consoleOutput}
            onClear={() => setConsoleOutput([])}
            onClose={() => setShowConsole(false)}
          />
        </div>
      )}

      {/* New Run Configuration Modal (Zustand-managed) */}
      <RunConfigModal onRun={runTests} />

      {/* AI Settings Modal */}
      <AISettingsModal
        isOpen={showAISettingsModal}
        onClose={() => setShowAISettingsModal(false)}
      />

      {/* Recording Modal */}
      <RecordingModal
        isOpen={showRecordingModal}
        onClose={() => setShowRecordingModal(false)}
        onStart={startRecording}
        defaultUrl={getRunConfigBaseUrl(getActiveConfig()) || 'https://example.com'}
      />

      {/* Create Sandbox Modal */}
      {sandboxTargetProjectId && (
        <CreateSandboxModal
          isOpen={showCreateSandboxModal}
          onClose={handleSandboxCreated}
          projectId={sandboxTargetProjectId}
        />
      )}

      {/* Environment Manager Modal */}
      <EnvironmentManager />

      {/* Scenario Browser Modal */}
      <ScenarioBrowser
        isOpen={showScenarioBrowser}
        onClose={() => setShowScenarioBrowser(false)}
        scenarios={extractedScenarios}
        onNavigateToScenario={handleNavigateToScenario}
      />

      {/* File Context Menu */}
      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          filePath={contextMenu.filePath}
          fileName={contextMenu.fileName}
          onClose={() => setContextMenu(null)}
          onCompareWith={handleOpenCompareWith}
          onDelete={handleDeleteFile}
          onRename={handleRenameFile}
        />
      )}

      {/* Gutter Context Menu (Run/Debug from editor play icon) */}
      {gutterMenu && (
        <GutterContextMenu
          x={gutterMenu.x}
          y={gutterMenu.y}
          itemType={gutterMenu.itemType}
          itemName={gutterMenu.itemName}
          onRun={() => {
            if (gutterMenu.itemType === 'scenario') {
              handleRunScenario(gutterMenu.itemName);
            } else {
              handleRunFeature(gutterMenu.itemName);
            }
            setGutterMenu(null);
          }}
          onDebug={() => {
            if (gutterMenu.itemType === 'scenario') {
              handleDebugScenario(gutterMenu.itemName);
            } else {
              debugTests();
            }
            setGutterMenu(null);
          }}
          onClose={() => setGutterMenu(null)}
        />
      )}

      {/* Compare With Modal */}
      {compareModal && compareModal.projectId && (
        <CompareWithModal
          isOpen={true}
          projectId={compareModal.projectId}
          filePath={compareModal.filePath}
          currentEnvironment="dev"
          onClose={() => setCompareModal(null)}
          onCompare={handleCompare}
        />
      )}

      {/* Merge Conflict Resolution Modal */}
      <MergeConflictModal
        isOpen={showMergeConflictModal}
        sandboxName={mergeSandboxName}
        sourceBranch={mergeSourceBranch}
        conflicts={mergeConflicts}
        onClose={() => {
          setShowMergeConflictModal(false);
          setMergeConflicts([]);
          setMergeSandboxId(null);
        }}
        onResolve={handleResolveMergeConflicts}
      />
    </div>
  );
}
