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
import { RunConfigurationModal, type RunConfiguration } from './RunConfigurationModal.js';
import { ScenarioBrowser, type ScenarioInfo } from './ScenarioBrowser.js';
import { RunConfigModal } from '../RunConfig/RunConfigModal';
import { SchedulePanel, type Schedule } from './SchedulePanel.js';
import { AIAgentPanel } from '../ide/AIAgentPanel.js';
import { AITestRecorderPanel } from '../ide/AITestRecorderPanel.js';
import { LiveExecutionPanel } from '../ide/LiveExecutionPanel.js';
import { TestDataPage } from '../TestData/TestDataPage.js';
import { TraceViewerPanel } from '../TraceViewer/TraceViewerPanel.js';
import { VeroEditor } from '../vero/VeroEditor.js';
import { useProjectStore } from '@/store/projectStore';
import { useLocalExecutionStore } from '@/store/useLocalExecutionStore';
import { useRunConfigStore, type RunConfiguration as ZustandRunConfig } from '@/store/runConfigStore';
import { CreateSandboxModal } from '@/components/sandbox/CreateSandboxModal';
import { MergeConflictModal } from './MergeConflictModal';
import { githubRunsApi } from '@/api/github';
import { sandboxApi, type ConflictFile } from '@/api/sandbox';

const API_BASE = '/api';

const FULL_PAGE_VIEWS: ActivityView[] = ['executions', 'schedules', 'testdata', 'ai-test-generator', 'trace'];

interface ApiFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: ApiFile[];
}

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

  const socketRef = useRef<Socket | null>(null);
  const activeTabIdRef = useRef<string | null>(null);

  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  // Run configuration state
  const [configurations, setConfigurations] = useState<RunConfiguration[]>([
    {
      id: 'local-chromium',
      name: 'Local (Chromium)',
      target: 'local',
      environment: 'Development',
      browser: 'chromium',
      baseUrl: 'http://localhost:3000',
      timeout: 30000,
      retries: 0,
      headless: false,
      tracing: true,
      video: false,
      screenshotOnFailure: true,
    },
    {
      id: 'staging-firefox',
      name: 'Staging (Firefox)',
      target: 'local',
      environment: 'Staging',
      browser: 'firefox',
      baseUrl: 'https://staging.example.com',
      timeout: 30000,
      retries: 0,
      headless: true,
      tracing: true,
      video: false,
      screenshotOnFailure: true,
    },
    {
      id: 'github-ci',
      name: 'GitHub CI',
      target: 'github',
      environment: 'Production',
      browser: 'chromium',
      baseUrl: 'https://example.com',
      timeout: 60000,
      retries: 1,
      headless: true,
      tracing: true,
      video: false,
      screenshotOnFailure: true,
      github: {
        repository: 'y9g7bg5qbj-arch/playwright-web-app',
        branch: 'main',
        workflowFile: '.github/workflows/vero-tests.yml',
      },
    },
  ]);

  const [selectedConfigId, setSelectedConfigId] = useState<string | null>('local-chromium');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Executions state
  const [executionBadge, setExecutionBadge] = useState(0);

  // Schedules state
  const [schedules, setSchedules] = useState<Schedule[]>([
    {
      id: 'schedule-1',
      name: 'Nightly Regression',
      cron: '0 0 * * *',
      cronDescription: 'Runs every day at 12:00 AM',
      environment: 'Staging - Chrome',
      retryStrategy: 'Retry failed tests (2x)',
      enabled: true,
      nextRun: 'Tomorrow 12:00 AM',
      lastRun: { status: 'success', time: '14 hours ago' },
      tags: ['@smoke', '@regression', '@login', '@p0'],
      notifications: {
        slack: { enabled: true, webhook: '' },
        email: { enabled: false, address: 'qa-team@vero.com' },
        teams: { enabled: false },
      },
      reporting: {
        allureReport: true,
        traceOnFailure: true,
        recordVideo: false,
      },
    },
    {
      id: 'schedule-2',
      name: 'Hourly Smoke',
      cron: '0 * * * *',
      cronDescription: 'Runs every hour',
      environment: 'Staging - Chrome',
      retryStrategy: 'No Retry',
      enabled: true,
      nextRun: '2:00 PM',
      tags: ['@smoke'],
      notifications: {
        slack: { enabled: false, webhook: '' },
        email: { enabled: false, address: '' },
        teams: { enabled: false },
      },
      reporting: {
        allureReport: true,
        traceOnFailure: true,
        recordVideo: false,
      },
    },
    {
      id: 'schedule-3',
      name: 'Weekly Full',
      cron: '0 3 * * 0',
      cronDescription: 'Runs every Sunday at 3:00 AM',
      environment: 'Production - Chrome (Read Only)',
      retryStrategy: 'Retry failed tests (2x)',
      enabled: true,
      nextRun: 'Monday 3:00 AM',
      tags: ['@full', '@regression'],
      notifications: {
        slack: { enabled: true, webhook: '' },
        email: { enabled: true, address: 'qa-team@vero.com' },
        teams: { enabled: false },
      },
      reporting: {
        allureReport: true,
        traceOnFailure: true,
        recordVideo: true,
      },
    },
  ]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>('schedule-1');

  // Overlay panel states
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showLiveExecution, setShowLiveExecution] = useState(false);
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
  } | null>(null);

  // Compare modal state
  const [compareModal, setCompareModal] = useState<{
    filePath: string;
    projectId?: string;
  } | null>(null);

  // Scenario Browser state
  const [showScenarioBrowser, setShowScenarioBrowser] = useState(false);
  const [extractedScenarios, setExtractedScenarios] = useState<ScenarioInfo[]>([]);

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

  function extractScenariosFromContent(content: string, filePath: string): ScenarioInfo[] {
    const scenarios: ScenarioInfo[] = [];
    const lines = content.split('\n');
    let currentFeature: string | undefined;

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];

      // Match feature declarations
      const featureMatch = line.match(/^\s*feature\s+["']?([^"'\n]+)["']?/i);
      if (featureMatch) {
        currentFeature = featureMatch[1].trim();
        continue;
      }

      // Match scenario declarations with optional tags
      // Format: scenario "Name" @tag1 @tag2 { or scenario "Name" as AliasName @tag1 {
      const scenarioMatch = line.match(/^\s*scenario\s+["']([^"']+)["'](?:\s+as\s+\w+)?(\s+@[\w,\s@]+)?(?:\s*\{)?/i);
      if (scenarioMatch) {
        const scenarioName = scenarioMatch[1];
        const tagString = scenarioMatch[2] || '';
        const tagMatches = tagString.match(/@(\w+)/g) || [];
        const tags = tagMatches.map(tag => tag.slice(1));

        scenarios.push({
          id: `${filePath}:${index + 1}:${scenarioName}`,
          name: scenarioName,
          tags,
          filePath,
          line: index + 1,
          featureName: currentFeature,
        });
      }
    }

    return scenarios;
  }

  // API: Load files for a specific nested project
  const loadProjectFiles = useCallback(async (projectId: string, veroPath?: string) => {
    if (!currentProject || !veroPath) return;

    try {
      const response = await fetch(`${API_BASE}/vero/files?projectId=${currentProject.id}&veroPath=${encodeURIComponent(veroPath)}`);
      const data = await response.json();
      if (data.success) {
        // Convert to FileNode format
        const convertedFiles = convertApiFilesToFileNodes(data.files || []);
        setProjectFiles(prev => ({
          ...prev,
          [projectId]: convertedFiles
        }));
      }
    } catch (error) {
      console.error('Failed to fetch project files:', error);
      // Set mock files for development
      const mockFiles: FileNode[] = [
        {
          name: 'Data',
          path: 'data',
          type: 'directory',
          icon: 'folder',
          children: [
            { name: 'users.json', path: 'data/users.json', type: 'file', icon: 'data_object' },
            { name: 'products.json', path: 'data/products.json', type: 'file', icon: 'data_object' },
          ],
        },
        {
          name: 'Features',
          path: 'features',
          type: 'directory',
          icon: 'folder',
          children: [
            { name: 'login.vero', path: 'features/login.vero', type: 'file', icon: 'description', hasChanges: true },
            { name: 'checkout.vero', path: 'features/checkout.vero', type: 'file', icon: 'description' },
            { name: 'search.vero', path: 'features/search.vero', type: 'file', icon: 'description' },
          ],
        },
        {
          name: 'Pages',
          path: 'pages',
          type: 'directory',
          icon: 'folder',
          children: [
            { name: 'LoginPage.vero', path: 'pages/LoginPage.vero', type: 'file', icon: 'description' },
            { name: 'HomePage.vero', path: 'pages/HomePage.vero', type: 'file', icon: 'description' },
            { name: 'CheckoutPage.vero', path: 'pages/CheckoutPage.vero', type: 'file', icon: 'description' },
          ],
        },
      ];
      setProjectFiles(prev => ({
        ...prev,
        [projectId]: mockFiles
      }));
    }
  }, [currentProject]);

  function convertApiFilesToFileNodes(apiFiles: ApiFile[]): FileNode[] {
    return apiFiles.map(file => ({
      name: file.name,
      path: file.path,
      type: file.type,
      icon: file.type === 'directory' ? 'folder' : 'description',
      children: file.children ? convertApiFilesToFileNodes(file.children) : undefined,
    }));
  }

  // API: Fetch execution count for badge (ExecutionDashboard manages its own data)
  const fetchExecutions = async () => {
    let runningCount = 0;

    // Count running local executions
    try {
      const response = await fetch(`${API_BASE}/executions`);
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
      const ghResponse = await fetch(`${API_BASE}/github/runs?owner=${owner}&repo=${repo}&limit=10`);
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

      console.log('[VeroWorkspace] Loading file:', { filePath, projectId, apiUrl, project: project?.name });

      const response = await fetch(apiUrl);
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
        // API returned error or no content - use mock for development
        console.warn('File not found or empty, using mock content:', filePath, data);
        const mockContent = `# File: ${fileName}
# Could not load from backend - showing mock content

feature ${fileName.replace('.vero', '')} {
  scenario "Example Test" @smoke {
    open "https://example.com"
    verify "Example Domain" is visible
  }
}
`;
        const newTab: OpenTab = {
          id: tabId,
          path: filePath,
          name: fileName,
          content: mockContent,
          hasChanges: false,
        };
        setOpenTabs(prev => [...prev, newTab]);
        setActiveTabId(tabId);
      }
    } catch (error) {
      console.error('Failed to load file:', error);
      // Set mock content for development
      const mockContent = `# File: ${fileName}
# Error loading from backend - showing mock content

feature ${fileName.replace('.vero', '')} {
  scenario "Example Test" @smoke {
    open "https://example.com"
    verify "Example Domain" is visible
  }
}
`;
      const newTab: OpenTab = {
        id: tabId,
        path: filePath,
        name: fileName,
        content: mockContent,
        hasChanges: false,
      };
      setOpenTabs(prev => [...prev, newTab]);
      setActiveTabId(tabId);
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

      console.log('[VeroWorkspace] Saving file:', { path: activeTab.path, apiUrl });

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
        // API returned error - still mark as saved for development
        console.warn('Save API returned error, marking as saved locally:', data.error);
        setOpenTabs(prev => prev.map(tab =>
          tab.id === activeTab.id
            ? { ...tab, content, hasChanges: false }
            : tab
        ));
        addConsoleOutput(`File saved locally: ${activeTab.name} (backend unavailable)`);
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      // Still mark as saved for development when backend is unavailable
      setOpenTabs(prev => prev.map(tab =>
        tab.id === activeTab.id
          ? { ...tab, content, hasChanges: false }
          : tab
      ));
      addConsoleOutput(`File saved locally: ${activeTab.name} (backend unavailable)`);
    }
  };

  // Local execution store for syncing with Executions tab
  const addLocalExecution = useLocalExecutionStore((state) => state.addExecution);
  const updateLocalExecution = useLocalExecutionStore((state) => state.updateExecution);
  const fetchLocalExecutions = useLocalExecutionStore((state) => state.fetchExecutions);

  // Get run configuration from Zustand store
  const { getActiveConfig } = useRunConfigStore();

  // API: Run tests
  const runTests = async () => {
    if (!activeTab || isRunning) return;

    // Try to get config from Zustand store first (new system)
    const zustandConfig = getActiveConfig();
    // Fall back to legacy configurations if Zustand config not available
    const legacyConfig = configurations.find(c => c.id === selectedConfigId);

    // Use zustand config if available, otherwise legacy
    const activeConfig = zustandConfig || legacyConfig;
    if (!activeConfig) return;

    // Check if target is GitHub Actions (check activeConfig which could be zustand or legacy)
    // Cast to ZustandRunConfig to access target and github properties (legacy configs won't have these)
    const configWithGitHub = activeConfig as ZustandRunConfig;
    const isGitHubTarget = configWithGitHub?.target === 'github';

    // Debug logging to identify GitHub Actions trigger issues
    console.log('[VeroWorkspace] runTests called with:', {
      zustandConfigId: zustandConfig?.id,
      zustandConfigName: zustandConfig?.name,
      zustandConfigTarget: zustandConfig?.target,
      zustandConfigGitHub: zustandConfig?.github,
      legacyConfigId: legacyConfig?.id,
      legacyConfigName: legacyConfig?.name,
      activeConfigName: activeConfig?.name,
      isGitHubTarget,
      hasRepository: !!configWithGitHub?.github?.repository,
    });

    setIsRunning(true);
    addConsoleOutput(`Running ${activeTab.name} with ${activeConfig?.name || 'Default'}...`);

    // If GitHub Actions target, trigger workflow
    if (isGitHubTarget) {
      // Check if repository is configured
      if (!configWithGitHub?.github?.repository) {
        addConsoleOutput(`⚠️ GitHub Actions target selected but repository not configured!`);
        addConsoleOutput(`Please open Run Configuration and set the repository (e.g., owner/repo)`);
        setIsRunning(false);
        return;
      }

      const [owner, repo] = configWithGitHub.github.repository.split('/');
      const workflowPath = configWithGitHub.github.workflowFile || '.github/workflows/vero-tests.yml';
      const branch = configWithGitHub.github.branch || 'main';

      addConsoleOutput(`Triggering GitHub Actions workflow on ${configWithGitHub.github.repository}...`);
      addConsoleOutput(`Workflow: ${workflowPath}, Branch: ${branch}`);

      try {
        const result = await githubRunsApi.trigger(owner, repo, workflowPath, branch);
        if (result.success) {
          addConsoleOutput('GitHub Actions workflow triggered successfully!');
          addConsoleOutput('Check the Runs tab to monitor execution progress.');
          // Switch to executions view
          setActiveView('executions');
          // Refresh execution badge after a delay
          setTimeout(() => fetchExecutions(), 3000);
        } else {
          addConsoleOutput(`Failed to trigger workflow: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Failed to trigger GitHub workflow:', error);
        addConsoleOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsRunning(false);
      }
      return;
    }


    // Local execution (original code)
    const config = legacyConfig;
    if (!config) {
      addConsoleOutput('No local configuration found');
      setIsRunning(false);
      return;
    }

    // Create a placeholder execution ID for immediate UI feedback
    const tempExecutionId = `temp-${Date.now()}`;
    const startTime = new Date().toISOString();

    // Add running execution to store immediately for real-time UI update
    addLocalExecution({
      id: tempExecutionId,
      testFlowId: '',
      testFlowName: activeTab.name,
      status: 'running',
      target: 'local',
      triggeredBy: { type: 'user' },
      startedAt: startTime,
      stepCount: 0,
      passedCount: 0,
      failedCount: 0,
      skippedCount: 0,
    });

    try {
      // Get the relative file path (without veroPath prefix)
      const project = nestedProjects.find(p =>
        activeTab.path.startsWith(p.veroPath || '')
      );
      const relativePath = project?.veroPath
        ? activeTab.path.replace(`${project.veroPath}/`, '')
        : activeTab.path;

      console.log('[VeroWorkspace] Running test:', {
        filePath: relativePath,
        content: activeTab.content.substring(0, 100) + '...',
        config: config.name
      });

      const response = await fetch(`${API_BASE}/vero/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: relativePath,
          content: activeTab.content, // Send current editor content (includes unsaved changes)
          config: {
            browser: config.browser,
            browserMode: config.headless ? 'headless' : 'headed',
            baseUrl: config.baseUrl,
            timeout: config.timeout,
            retries: config.retries || 0,
            tracing: config.tracing,
            video: config.video,
            screenshotOnFailure: config.screenshotOnFailure,
            workers: config.workers || 1,
          },
        }),
      });
      const data = await response.json();

      // Update the temp execution with real data from backend
      if (data.executionId) {
        updateLocalExecution(tempExecutionId, {
          id: data.executionId,
          status: data.status === 'passed' ? 'passed' : 'failed',
          finishedAt: new Date().toISOString(),
          duration: Date.now() - new Date(startTime).getTime(),
          output: data.output,
          error: data.error,
          generatedCode: data.generatedCode,
        });
      }

      if (data.success) {
        addConsoleOutput(`Test completed: ${data.status}`);
        // Refresh executions from backend to get full details
        await fetchLocalExecutions();
        await fetchExecutions();
      } else {
        addConsoleOutput(`Test failed: ${data.error || 'Unknown error'}`);
        // Update temp execution as failed
        updateLocalExecution(tempExecutionId, {
          status: 'failed',
          finishedAt: new Date().toISOString(),
          error: data.error,
        });
      }
    } catch (error) {
      console.error('Failed to run tests:', error);
      addConsoleOutput(`Error running test: ${error}`);
      // Update temp execution as failed
      updateLocalExecution(tempExecutionId, {
        status: 'failed',
        finishedAt: new Date().toISOString(),
        error: String(error),
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Run a specific scenario by name (triggered from editor play button)
  const handleRunScenario = async (scenarioName: string) => {
    if (!activeTab || isRunning) return;

    // Get config from Zustand store first, then fall back to legacy
    const zustandConfig = getActiveConfig();
    const legacyConfig = configurations.find(c => c.id === selectedConfigId);
    const config = zustandConfig || legacyConfig;
    if (!config) {
      addConsoleOutput('No run configuration found');
      return;
    }

    setIsRunning(true);
    addConsoleOutput(`Running scenario "${scenarioName}" from ${activeTab.name}...`);

    // Create a placeholder execution ID for immediate UI feedback
    const tempExecutionId = `temp-${Date.now()}`;
    const startTime = new Date().toISOString();

    addLocalExecution({
      id: tempExecutionId,
      testFlowId: '',
      testFlowName: `${activeTab.name} - ${scenarioName}`,
      status: 'running',
      target: 'local',
      triggeredBy: { type: 'user' },
      startedAt: startTime,
      stepCount: 0,
      passedCount: 0,
      failedCount: 0,
      skippedCount: 0,
    });

    try {
      const project = nestedProjects.find(p =>
        activeTab.path.startsWith(p.veroPath || '')
      );
      const relativePath = project?.veroPath
        ? activeTab.path.replace(`${project.veroPath}/`, '')
        : activeTab.path;

      const response = await fetch(`${API_BASE}/vero/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: relativePath,
          content: activeTab.content,
          scenarioName: scenarioName, // Filter to specific scenario
          config: {
            browser: (config as any).browser || 'chromium',
            browserMode: (config as any).headless !== false ? 'headless' : 'headed',
            baseUrl: (config as any).baseUrl,
            timeout: (config as any).timeout || 30000,
            retries: (config as any).retries || 0,
            tracing: (config as any).tracing,
            video: (config as any).video,
            screenshotOnFailure: (config as any).screenshotOnFailure,
            workers: (config as any).workers || 1,
          },
        }),
      });
      const data = await response.json();

      if (data.executionId) {
        updateLocalExecution(tempExecutionId, {
          id: data.executionId,
          status: data.status === 'passed' ? 'passed' : 'failed',
          finishedAt: new Date().toISOString(),
          duration: Date.now() - new Date(startTime).getTime(),
        });
      }

      if (data.success) {
        addConsoleOutput(`Scenario "${scenarioName}" completed: ${data.status}`);
        await fetchLocalExecutions();
        await fetchExecutions();
      } else {
        addConsoleOutput(`Scenario "${scenarioName}" failed: ${data.error || 'Unknown error'}`);
        updateLocalExecution(tempExecutionId, {
          status: 'failed',
          finishedAt: new Date().toISOString(),
          error: data.error,
        });
      }
    } catch (error) {
      console.error('Failed to run scenario:', error);
      addConsoleOutput(`Error running scenario: ${error}`);
      updateLocalExecution(tempExecutionId, {
        status: 'failed',
        finishedAt: new Date().toISOString(),
        error: String(error),
      });
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
        // Look for the last `}` that closes the feature, or `end feature`
        const closingBraceMatch = content.match(/(\n?)(\s*}\s*)$/);
        const endFeatureMatch = content.match(/(\n?\s*end\s+feature\s*)$/i);

        if (closingBraceMatch) {
          // Insert before the closing brace
          content = content.replace(/(\s*}\s*)$/, `\n\n${veroScenario}\n}`);
        } else if (endFeatureMatch) {
          // Insert before "end feature"
          content = content.replace(/(\s*end\s+feature\s*)$/i, `\n\n${veroScenario}\n\nend feature\n`);
        } else {
          // No feature block found, just append
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
        console.log('Recorded Vero code:\n', newFileContent);
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
        console.log('[Recording] WebSocket connected');
        socket.emit('codegen:subscribe', { sessionId });
      });

      // Real-time Vero code updates
      socket.on('codegen:action', (data: { veroCode: string; pagePath?: string; fieldCreated?: unknown }) => {
        console.log('[Recording] Action received:', data.veroCode);
        addConsoleOutput(`  Recording: ${data.veroCode}`);
      });

      socket.on('codegen:error', (data: { error: string }) => {
        console.error('[Recording] Error:', data.error);
        addConsoleOutput(`Recording error: ${data.error}`);
      });

      socket.on('codegen:stopped', (data: { sessionId: string; veroLines: string[]; scenarioName: string }) => {
        console.log('[Recording] Recording stopped, received lines:', data.veroLines);
        addConsoleOutput('Recording completed');

        // Use the veroLines from the server (Playwright writes to file only when browser closes)
        if (data.veroLines && data.veroLines.length > 0) {
          insertRecordedScenario(data.scenarioName || scenarioName, data.veroLines);
        } else {
          addConsoleOutput('No actions were recorded');
        }

        cleanupRecordingState();
      });

      const response = await fetch(`${API_BASE}/codegen/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          url,
          scenarioName,
          projectId: currentProject?.id,
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

  // Run configuration handlers
  const handleCreateConfig = (config: Omit<RunConfiguration, 'id'>) => {
    const newConfig: RunConfiguration = {
      ...config,
      id: `config-${Date.now()}`,
    };
    setConfigurations([...configurations, newConfig]);
    setSelectedConfigId(newConfig.id);
  };

  const handleUpdateConfig = (configId: string, updates: Partial<RunConfiguration>) => {
    setConfigurations(configs =>
      configs.map(c => (c.id === configId ? { ...c, ...updates } : c))
    );
  };

  const handleDeleteConfig = (configId: string) => {
    setConfigurations(configs => configs.filter(c => c.id !== configId));
    if (selectedConfigId === configId) {
      setSelectedConfigId(configurations[0]?.id || null);
    }
  };

  const handleDuplicateConfig = (configId: string) => {
    const config = configurations.find(c => c.id === configId);
    if (config) {
      const newConfig: RunConfiguration = {
        ...config,
        id: `config-${Date.now()}`,
        name: `${config.name} (Copy)`,
      };
      setConfigurations([...configurations, newConfig]);
    }
  };

  // Schedule handlers
  const handleCreateSchedule = () => {
    const newSchedule: Schedule = {
      id: `schedule-${Date.now()}`,
      name: 'New Schedule',
      cron: '0 0 * * *',
      cronDescription: 'Runs every day at 12:00 AM',
      environment: 'Staging - Chrome',
      retryStrategy: 'No Retry',
      enabled: false,
      nextRun: 'Not scheduled',
      tags: [],
      notifications: {
        slack: { enabled: false, webhook: '' },
        email: { enabled: false, address: '' },
        teams: { enabled: false },
      },
      reporting: {
        allureReport: true,
        traceOnFailure: true,
        recordVideo: false,
      },
    };
    setSchedules([...schedules, newSchedule]);
    setSelectedScheduleId(newSchedule.id);
  };

  const handleSaveSchedule = async (schedule: Schedule) => {
    setSchedules(prev =>
      prev.map(s => (s.id === schedule.id ? schedule : s))
    );
  };

  const handleDeleteSchedule = async (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
    if (selectedScheduleId === id && schedules.length > 1) {
      setSelectedScheduleId(schedules[0].id);
    }
  };

  const handleRunScheduleNow = async (id: string) => {
    console.log('Running schedule now:', id);
    await fetchExecutions();
  };

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

  const handleCreateFile = (projectId: string, folderPath: string) => {
    console.log('Create new file in', projectId, folderPath);
  };

  const handleCreateSandbox = (projectId: string) => {
    console.log('[handleCreateSandbox] Called with projectId:', projectId);
    console.log('[handleCreateSandbox] nestedProjects:', nestedProjects.map(p => ({ id: p.id, name: p.name })));
    console.log('[handleCreateSandbox] currentProject:', currentProject?.id, currentProject?.name);

    if (!projectId || projectId.trim() === '') {
      console.error('[handleCreateSandbox] Empty projectId received!');
      addConsoleOutput('Error: Cannot create sandbox - project ID is missing. Please expand a project first.');
      return;
    }

    // Validate UUID format
    if (!isValidUUID(projectId)) {
      console.error('[handleCreateSandbox] Invalid UUID format:', projectId);
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
    console.log('[handleSyncSandbox] Called with:', { sandboxName, projectId });
    console.log('[handleSyncSandbox] nestedProjects:', nestedProjects.map(p => ({ id: p.id, name: p.name })));
    console.log('[handleSyncSandbox] currentProject:', currentProject?.id, currentProject?.name);

    if (!projectId || projectId.trim() === '') {
      console.error('[handleSyncSandbox] Empty projectId received!');
      addConsoleOutput('Error: Cannot sync sandbox - project ID is missing. Please expand a project first.');
      return;
    }

    // Validate UUID format
    if (!isValidUUID(projectId)) {
      console.error('[handleSyncSandbox] Invalid UUID format:', projectId);
      addConsoleOutput(`Error: Invalid project ID format: "${projectId}". Expected a UUID.`);
      return;
    }

    addConsoleOutput(`Syncing sandbox "${sandboxName}" (projectId: ${projectId})...`);

    try {
      // First, we need to find the sandbox ID from the name
      // The sandbox folder name might be the sandbox name with some ID suffix
      // For now, we'll fetch all sandboxes and match by name
      const project = nestedProjects.find(p => p.id === projectId);
      console.log('[handleSyncSandbox] Found project:', project);
      if (!project) {
        addConsoleOutput(`Error: Project not found (id=${projectId})`);
        return;
      }

      // List sandboxes for this project to find the sandbox ID
      console.log('[handleSyncSandbox] Calling listByProject with:', projectId);
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
    });
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

    console.log('[Compare] Opening compare modal with projectId:', projectId, 'from:', {
      contextMenuProjectId: contextMenu?.projectId,
      selectedProjectId,
      applicationId: currentProject?.id,
    });

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

  // Console output helper
  const addConsoleOutput = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleOutput(prev => [...prev, `[${timestamp}] ${message}`]);
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
        isRecording={isRecording}
        onRun={runTests}
        onStop={() => setIsRunning(false)}
        onRecord={handleRecordClick}
        onStopRecording={stopRecording}
        showRunControls={activeView === 'explorer'}
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
                onOpenAllure={(executionId) => {
                  console.log('Open Allure report for:', executionId);
                }}
              />
            )}
            {activeView === 'schedules' && (
              <SchedulePanel
                schedules={schedules}
                selectedScheduleId={selectedScheduleId}
                onSelectSchedule={setSelectedScheduleId}
                onCreateSchedule={handleCreateSchedule}
                onSaveSchedule={handleSaveSchedule}
                onRunNow={handleRunScheduleNow}
                onDeleteSchedule={handleDeleteSchedule}
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
                onClose={() => setActiveView('explorer')}
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
                    // TODO: Implement editor scrolling to specific line
                    console.log('Navigate to line:', line);
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
                      onClick={() => setShowConfigModal(true)}
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

                  {/* Editor or Compare View */}
                  <div className="flex-1 overflow-hidden">
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
                        key={activeTab.id}
                        initialValue={activeTab.content}
                        onChange={(value) => value && updateTabContent(activeTab.id, value)}
                        onRunScenario={handleRunScenario}
                        onRunFeature={handleRunFeature}
                      />
                    ) : null}
                  </div>
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
      {/* AI Agent Panel (right side overlay) */}
      {showAIPanel && (
        <div className="fixed right-0 top-14 bottom-0 w-[400px] bg-[#161b22] border-l border-[#30363d] z-30 overflow-hidden shadow-xl">
          <AIAgentPanel
            onInsertCode={(code) => {
              if (activeTab) {
                updateTabContent(activeTab.id, activeTab.content + '\n' + code);
              }
              addConsoleOutput('Code inserted from AI Agent');
            }}
            isVisible={showAIPanel}
            onClose={() => setShowAIPanel(false)}
          />
        </div>
      )}

      {/* Live Execution Panel (right side overlay) */}
      {showLiveExecution && (
        <div className="fixed right-0 top-14 bottom-0 w-[350px] bg-[#161b22] border-l border-[#30363d] z-30 overflow-hidden shadow-xl">
          <LiveExecutionPanel
            isVisible={showLiveExecution}
            onClose={() => setShowLiveExecution(false)}
          />
        </div>
      )}

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

      {/* Run Configuration Modal (Legacy) */}
      <RunConfigurationModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        configurations={configurations}
        selectedConfigId={selectedConfigId}
        onSelect={setSelectedConfigId}
        onCreate={handleCreateConfig}
        onUpdate={handleUpdateConfig}
        onDelete={handleDeleteConfig}
        onDuplicate={handleDuplicateConfig}
      />

      {/* New Run Configuration Modal (Zustand-managed) */}
      <RunConfigModal onRun={runTests} />

      {/* Recording Modal */}
      <RecordingModal
        isOpen={showRecordingModal}
        onClose={() => setShowRecordingModal(false)}
        onStart={startRecording}
        defaultUrl={configurations.find(c => c.id === selectedConfigId)?.baseUrl || 'https://example.com'}
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
