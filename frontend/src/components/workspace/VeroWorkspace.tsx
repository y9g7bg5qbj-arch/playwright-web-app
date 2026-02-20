import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { type Socket } from 'socket.io-client';

import { ActivityBar, type ActivityView } from './ActivityBar.js';
import { CompareWithModal } from './CompareWithModal.js';
import { ConsolePanel } from './ConsolePanel.js';
import { EnvironmentManager } from './EnvironmentManager.js';
import { ExecutionReportView } from '../ExecutionDashboard/ExecutionReportView';
import { ExplorerPanel, type NestedProject } from './ExplorerPanel.js';
import { FileContextMenu } from './FileContextMenu.js';
import { Header } from './Header.js';
import { RecordingModal } from './RecordingModal.js';
import { ScenarioBrowser, type ScenarioInfo } from './ScenarioBrowser.js';
import { RunConfigModal } from '../RunConfig/RunConfigModal';
import { SchedulerPanel } from '../Scheduler/SchedulerPanel';
import { AISettingsModal } from '../settings/AISettingsModal.js';
import { DebugToolbar } from '../ide/DebugToolbar.js';
import { DebugConsolePanel } from '../ide/DebugConsolePanel.js';
import { useDebugger } from '@/hooks/useDebugger';
import { TestDataPage } from '../TestData/TestDataPage.js';
import { type VeroEditorHandle } from '../vero/VeroEditor.js';
import { GutterContextMenu } from '../vero/GutterContextMenu.js';
import { useProjectStore } from '@/store/projectStore';
import { useSandboxStore } from '@/store/sandboxStore';
import { sandboxApi } from '@/api/sandbox';
import { useToastStore } from '@/store/useToastStore';
import { PullRequestsPanel } from '@/components/pr/PullRequestsPanel';
import { useRunConfigStore } from '@/store/runConfigStore';
import { useGitHubExecutionStore } from '@/store/useGitHubExecutionStore';
import { CreateSandboxModal } from '@/components/sandbox/CreateSandboxModal';
import { MergeConflictModal } from './MergeConflictModal';
import { IconButton, PanelHeader, EmptyState } from '@/components/ui';
import { Bot, FileBarChart2, Play, Bug, FileText, Terminal, Settings, FilePlus, Folder } from 'lucide-react';
import { DataQueryModal } from '../ide/DataQueryModal';
import { DataPanel } from '../ide/DataPanel';
import { VDQLReferencePanel } from '../ide/VDQLReferencePanel';
import { AIAgentPanel } from '../ide/AIAgentPanel';
import { useTestDataRegistry } from '@/hooks/useTestDataRegistry';
import { CommandPalette, type PaletteCommand } from './CommandPalette';
import { QuickOpenDialog } from './QuickOpenDialog';
import { ProblemsPanel, type Problem } from './ProblemsPanel';
import { RightToolRail } from './RightToolRail';
import { WorkspaceEditorTabs } from './layout/WorkspaceEditorTabs';
import { WorkspaceEditorPane } from './layout/WorkspaceEditorPane';
import { WorkspaceStatusBar } from './layout/WorkspaceStatusBar';

import { useFileManagement } from './useFileManagement.js';
import { useRecording } from './useRecording.js';
import { useTestExecution } from './useTestExecution.js';
import { useScenarioBrowser } from './useScenarioBrowser.js';
import { useProjectNavigation } from './useProjectNavigation.js';
import { useEnvironmentSwitching } from './useEnvironmentSwitching.js';

const API_BASE = '/api';

const FULL_PAGE_VIEWS: ActivityView[] = ['executions', 'schedules', 'testdata', 'ai-test-generator', 'prs'];

export function VeroWorkspace() {
  // ─── View state ───────────────────────────────────────────────
  const [activeView, setActiveView] = useState<ActivityView>('explorer');
  const activeViewRef = useRef<ActivityView>('explorer');
  const [targetExecutionId, setTargetExecutionId] = useState<string | null>(null);

  const handleViewChange = useCallback((view: ActivityView) => {
    activeViewRef.current = view;
    setActiveView(view);
    if (view === 'executions') setExecutionBadge(0);
  }, []);

  // ─── Project state from store ─────────────────────────────────
  const {
    projects: applications,
    currentProject,
    isLoading: isProjectsLoading,
    error: projectLoadError,
    fetchProjects,
    fetchNestedProjects,
    createNestedProject,
    deleteNestedProject,
    setCurrentProjectById,
    createProject: createApplication,
  } = useProjectStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // ─── Test data registry for editor autocomplete ────────────────
  useTestDataRegistry(currentProject?.id);

  // ─── Shared infrastructure ────────────────────────────────────
  const socketRef = useRef<Socket | null>(null);
  const editorRef = useRef<VeroEditorHandle | null>(null);

  const [showConsole, setShowConsole] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);

  const addConsoleOutput = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleOutput(prev => [...prev, `[${timestamp}] ${message}`]);
    if (message.includes('[ERROR]') || message.includes('FAILED')) {
      setShowConsole(true);
    }
  }, []);

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

  // ─── File management hook (must come before nestedProjects derivation) ──
  const fileManagement = useFileManagement({
    currentProjectProjects: currentProject?.projects || [],
    selectedProjectId,
    setSelectedProjectId,
    addConsoleOutput,
    getAuthHeaders,
    currentProject: currentProject || undefined,
  });

  // ─── Environment context ─────────────────────────────────────
  const syncConflictsDetailed = useSandboxStore(s => s.syncConflictsDetailed);
  const syncConflictSandbox = useSandboxStore(s => s.syncConflictSandbox);
  const clearSyncConflictState = useSandboxStore(s => s.clearSyncConflictState);

  // Convert nested projects from store format to ExplorerPanel format
  const nestedProjects: NestedProject[] = (currentProject?.projects || []).map(p => ({
    id: p.id,
    name: p.name,
    veroPath: p.veroPath,
    files: fileManagement.projectFiles[p.id],
  }));
  const currentApplicationProjectIds = useMemo(
    () => new Set((currentProject?.projects || []).map((project) => project.id)),
    [currentProject?.projects]
  );
  const scopedSelectedProjectId =
    selectedProjectId && currentApplicationProjectIds.has(selectedProjectId)
      ? selectedProjectId
      : null;
  const activeNestedProjectId = scopedSelectedProjectId || currentProject?.projects?.[0]?.id || null;
  const activeTabProjectId = fileManagement.activeTab?.projectId;
  const scopedActiveTabProjectId =
    activeTabProjectId && currentApplicationProjectIds.has(activeTabProjectId)
      ? activeTabProjectId
      : undefined;
  const currentRunConfigProjectId =
    scopedSelectedProjectId ||
    scopedActiveTabProjectId ||
    currentProject?.projects?.[0]?.id;
  const currentWorkflowId =
    currentProject?.workflows?.[0]?.id ||
    applications.find((app) => app.id === currentProject?.id)?.workflows?.[0]?.id ||
    applications[0]?.workflows?.[0]?.id;

  useEffect(() => {
    if (!selectedProjectId) return;
    if (currentApplicationProjectIds.has(selectedProjectId)) return;
    setSelectedProjectId(null);
  }, [currentApplicationProjectIds, selectedProjectId]);

  const { handleExplorerDirectorySelect, resolveCompareSourceEnvironment } = useEnvironmentSwitching({
    currentProjects: currentProject?.projects,
    activeNestedProjectId,
    resetTabsForEnvironmentSwitch: fileManagement.resetTabsForEnvironmentSwitch,
    loadProjectFiles: fileManagement.loadProjectFiles,
    setSelectedProjectId,
  });

  // ─── Debug state (needs debugExecutionId before testExecution) ─
  const [debugExecutionId, setDebugExecutionId] = useState<string | null>(null);

  const {
    debugState,
    breakpointsMuted,
    consoleEntries,
    variables,
    callStack,
    toggleBreakpoint,
    toggleMuteBreakpoints,
    startDebug,
    resume,
    stepOver,
    stepInto,
    stopDebug,
    clearConsole,
  } = useDebugger(socketRef.current, debugExecutionId);

  // ─── Execution badge state ────────────────────────────────────
  const [executionBadge, setExecutionBadge] = useState(0);

  async function fetchExecutions(): Promise<void> {
    let runningCount = 0;

    try {
      const response = await fetch(`${API_BASE}/executions`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success && data.executions) {
        runningCount += data.executions.filter((e: { status?: string }) => e.status === 'running').length;
      }
    } catch (error) {
      console.error('Failed to fetch local executions:', error);
    }

    // Count active GitHub runs from the zustand store (no API call).
    // The store is populated by ExecutionReportView when the user views
    // the GitHub Actions tab, or by useTestExecution on dispatch.
    // Only count runs triggered within the last 2 hours — older entries
    // persisted in localStorage are likely stale (never polled for updates).
    const ghExecutions = useGitHubExecutionStore.getState().executions;
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    runningCount += ghExecutions.filter(
      (e) =>
        (e.status === 'in_progress' || e.status === 'queued') &&
        new Date(e.triggeredAt).getTime() > twoHoursAgo
    ).length;

    setExecutionBadge(activeViewRef.current === 'executions' ? 0 : runningCount);
  }

  // ─── Test execution hook ──────────────────────────────────────
  const testExecution = useTestExecution({
    socketRef,
    activeTab: fileManagement.activeTab,
    currentProjectId: currentProject?.id,
    currentWorkflowId,
    currentRunConfigProjectId,
    addConsoleOutput,
    setShowConsole,
    setActiveView: handleViewChange,
    fetchExecutions,
    debugState,
    startDebug,
    stopDebug,
    getAuthHeaders,
    setDebugExecutionId,
  });

  // ─── Recording hook ───────────────────────────────────────────
  const recording = useRecording({
    socketRef,
    activeTab: fileManagement.activeTab,
    selectedProjectId,
    nestedProjects,
    currentProjectId: currentProject?.id,
    getActiveTabId: fileManagement.getActiveTabId,
    getTabById: fileManagement.getTabById,
    mutateTabContent: fileManagement.mutateTabContent,
    addConsoleOutput,
    setShowConsole,
    loadProjectFiles: fileManagement.loadProjectFiles,
    getAuthHeaders,
    toDevRootPath: fileManagement.toDevRootPath,
  });

  // ─── Scenario browser hook ────────────────────────────────────
  const scenarioBrowser = useScenarioBrowser({
    currentProjectId: currentProject?.id,
    nestedProjectsLength: nestedProjects.length,
  });

  // ─── Project navigation hook ──────────────────────────────────
  const projectNavigation = useProjectNavigation({
    currentProjectId: currentProject?.id,
    nestedProjects,
    selectedProjectId,
    setSelectedProjectId,
    setExpandedFolders: fileManagement.setExpandedFolders,
    addConsoleOutput,
    loadProjectFiles: fileManagement.loadProjectFiles,
    setCurrentProjectById,
    createApplication,
    fetchProjects,
    createNestedProject,
    fetchNestedProjects,
    deleteNestedProject,
  });

  // ─── Remaining local state ────────────────────────────────────
  const [showDataQueryModal, setShowDataQueryModal] = useState(false);
  const [showAISettingsModal, setShowAISettingsModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  const [isRightToolPanelOpen, setIsRightToolPanelOpen] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [compareModal, setCompareModal] = useState<{ filePath: string; projectId?: string; sourceEnvironment: string } | null>(null);
  const [gutterMenu, setGutterMenu] = useState<{ x: number; y: number; itemType: 'scenario' | 'feature'; itemName: string } | null>(null);

  const { setModalOpen: setRunConfigModalOpen, getActiveConfig, loadConfigurations } = useRunConfigStore();

  // ─── Effects ──────────────────────────────────────────────────
  useEffect(() => {
    if (activeView !== 'executions') setTargetExecutionId(null);
  }, [activeView]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Load API-backed run configurations when a workflow is available
  useEffect(() => {
    if (currentWorkflowId && currentRunConfigProjectId) {
      loadConfigurations(currentWorkflowId, currentRunConfigProjectId);
    }
  }, [currentWorkflowId, currentRunConfigProjectId, loadConfigurations]);

  useEffect(() => {
    if (currentProject?.id) {
      fetchNestedProjects(currentProject.id);
    }
  }, [currentProject?.id, fetchNestedProjects]);

  useEffect(() => {
    fetchExecutions();
    const interval = setInterval(fetchExecutions, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // ─── Cross-hook handlers ──────────────────────────────────────
  async function handleNavigateToScenario(scenario: ScenarioInfo): Promise<void> {
    const scenarioProject = fileManagement.resolveProjectForPath(scenario.filePath, scenario.projectId || undefined);
    const targetFullPath = fileManagement.toFullPath(scenario.filePath, scenarioProject);
    const existingTab = fileManagement.openTabs.find(tab => tab.path === targetFullPath);

    if (scenario.projectId) {
      setSelectedProjectId(scenario.projectId);
    }

    if (existingTab) {
      fileManagement.activateTab(existingTab.id);
    } else {
      await fileManagement.loadFileContent(scenario.filePath, scenario.projectId);
    }

    scenarioBrowser.setShowScenarioBrowser(false);

    setTimeout(() => {
      editorRef.current?.goToLine(scenario.line);
      addConsoleOutput(`Navigate to ${scenario.filePath}:${scenario.line} - ${scenario.name}`);
    }, 150);
  }

  const handleOpenCompareWith = (filePath: string) => {
    const nestedProjectId = fileManagement.contextMenu?.projectId || selectedProjectId;
    const projectIdFromPath = (currentProject?.projects || []).find(
      (project) => project.veroPath && filePath.startsWith(`${project.veroPath}/`)
    )?.id;
    const idLikePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const normalizedFilePath = filePath.replace(/\\/g, '/');
    const pathParts = normalizedFilePath.split('/').filter(Boolean);
    const veroProjectsIdx = pathParts.lastIndexOf('vero-projects');
    const projectIdFromAbsolutePath = (
      veroProjectsIdx >= 0 && pathParts.length > veroProjectsIdx + 2
        ? pathParts[veroProjectsIdx + 2]
        : undefined
    );
    const projectId = nestedProjectId
      || projectIdFromPath
      || (projectIdFromAbsolutePath && idLikePattern.test(projectIdFromAbsolutePath) ? projectIdFromAbsolutePath : undefined)
      || currentProject?.projects?.[0]?.id;

    const relativePath = fileManagement.contextMenu?.relativePath?.replace(/\\/g, '/');
    const sourceEnvironment = resolveCompareSourceEnvironment(relativePath, normalizedFilePath);

    if (!projectId) {
      addConsoleOutput('Error: No project selected. Please select a project first.');
      fileManagement.setContextMenu(null);
      return;
    }

    setCompareModal({ filePath, projectId, sourceEnvironment });
    fileManagement.setContextMenu(null);
  };

  const handleCompare = (source: string, target: string) => {
    if (!compareModal) return;

    fileManagement.openCompareTab({
      filePath: compareModal.filePath,
      source,
      target,
      projectId: compareModal.projectId,
    });
    const fileName = compareModal.filePath.split('/').pop() || 'Compare';
    setCompareModal(null);
    addConsoleOutput(`Comparing ${fileName}: ${source} vs ${target}`);
  };

  const handleApplyCompareChanges = (tabId: string, content: string) => {
    const tab = fileManagement.openTabs.find(t => t.id === tabId);
    fileManagement.applyCompareChanges({ compareTabId: tabId, content });
    if (tab) {
      const fileName = tab.name.split(' (')[0];
      addConsoleOutput(`Applied changes to ${fileName}`);
    }
  };

  const handleNavigateToDefinition = useCallback(async (targetPath: string, line: number, _column: number) => {
    let resolvedPath = targetPath;
    for (const project of nestedProjects) {
      if (project.veroPath && targetPath.includes(project.veroPath)) {
        resolvedPath = targetPath;
        break;
      }
      if (project.veroPath && !targetPath.startsWith('/')) {
        resolvedPath = `${project.veroPath}/${targetPath}`;
        break;
      }
    }

    await fileManagement.loadFileContent(resolvedPath);

    setTimeout(() => {
      editorRef.current?.goToLine(line);
    }, 150);
  }, [nestedProjects, fileManagement.loadFileContent]);

  const handleInsertDataQuery = useCallback(() => {
    setShowDataQueryModal(true);
  }, []);

  const handleInsertSnippet = useCallback((snippet: string) => {
    editorRef.current?.insertText(snippet, 'newline');
  }, []);

  // ─── Global keyboard shortcuts ────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setShowQuickOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ─── Command palette commands ────────────────────────────────
  const paletteCommands: PaletteCommand[] = useMemo(() => [
    {
      id: 'run-file', label: 'Run File', shortcut: 'F5',
      icon: <Play size={14} />, category: 'Run',
      action: () => { void testExecution.runTests(); },
    },
    {
      id: 'debug-file', label: 'Debug File', shortcut: 'Shift+F5',
      icon: <Bug size={14} />, category: 'Run',
      action: () => { void testExecution.debugTests(); },
    },
    {
      id: 'record-scenario', label: 'Record Scenario',
      icon: <span className="w-3.5 h-3.5 rounded-full border-2 border-status-danger inline-block" />, category: 'Recording',
      action: () => recording.handleRecordClick(),
    },
    {
      id: 'toggle-terminal', label: 'Toggle Terminal', shortcut: 'Ctrl+`',
      icon: <Terminal size={14} />, category: 'View',
      action: () => setShowConsole(prev => !prev),
    },
    {
      id: 'toggle-problems', label: 'Toggle Problems Panel', shortcut: 'Ctrl+Shift+M',
      icon: <FileText size={14} />, category: 'View',
      action: () => setShowProblems(prev => !prev),
    },
    {
      id: 'open-settings', label: 'Open Settings',
      icon: <Settings size={14} />, category: 'Preferences',
      action: () => handleViewChange('settings'),
    },
    {
      id: 'ai-settings', label: 'AI Provider Settings',
      icon: <Bot size={14} />, category: 'Preferences',
      action: () => setShowAISettingsModal(true),
    },
    {
      id: 'new-file', label: 'New File',
      icon: <FilePlus size={14} />, category: 'File',
      action: () => fileManagement.handleCreateFile(selectedProjectId || nestedProjects[0]?.id || '', 'feature'),
    },
    {
      id: 'quick-open', label: 'Go to File', shortcut: `${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl+'}P`,
      icon: <FileText size={14} />, category: 'File',
      action: () => setShowQuickOpen(true),
    },
    {
      id: 'view-executions', label: 'View Executions',
      icon: <FileBarChart2 size={14} />, category: 'View',
      action: () => handleViewChange('executions'),
    },
    {
      id: 'view-explorer', label: 'Show Explorer',
      icon: <Folder size={14} />, category: 'View',
      action: () => handleViewChange('explorer'),
    },
    {
      id: 'ai-studio', label: 'Open AI Studio',
      icon: <Bot size={14} />, category: 'AI',
      action: () => handleViewChange('ai-test-generator'),
    },
  ], [testExecution, recording, handleViewChange, fileManagement, selectedProjectId, nestedProjects]);

  // ─── Quick Open file list ────────────────────────────────────
  const quickOpenFiles = useMemo(() => {
    const result: { name: string; path: string; relativePath: string }[] = [];
    function collectFiles(nodes: typeof nestedProjects[0]['files'], prefix: string) {
      if (!nodes) return;
      for (const node of nodes) {
        if (node.type === 'file') {
          result.push({ name: node.name, path: node.path, relativePath: `${prefix}/${node.name}` });
        }
        if (node.children) {
          collectFiles(node.children, `${prefix}/${node.name}`);
        }
      }
    }
    for (const project of nestedProjects) {
      collectFiles(project.files, project.name);
    }
    return result;
  }, [nestedProjects]);

  const isFullPageView = FULL_PAGE_VIEWS.includes(activeView);
  const { activeTab, openTabs, activeTabId } = fileManagement;
  const isEditableActiveTab = Boolean(activeTab && (activeTab.type === undefined || activeTab.type === 'file'));
  const showRightToolRail = activeView === 'explorer' && !isFullPageView && isEditableActiveTab;

  useEffect(() => {
    if (showRightToolRail) return;
    setIsRightToolPanelOpen(false);
  }, [showRightToolRail]);

  // ─── Sync Monaco diagnostics to Problems panel ────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const monaco = (window as any).monaco as
        | { editor?: { getModelMarkers?: (filter: Record<string, unknown>) => Array<{ severity: number; message: string; startLineNumber: number; startColumn: number; resource?: { path?: string } }> } }
        | undefined;
      if (!monaco?.editor?.getModelMarkers) return;
      const markers = monaco.editor.getModelMarkers({});
      const mapped: Problem[] = markers.map(m => ({
        severity: m.severity >= 8 ? 'error' : m.severity >= 4 ? 'warning' : 'info',
        message: m.message,
        file: m.resource?.path?.split('/').pop() || activeTab?.name || 'unknown',
        line: m.startLineNumber,
        column: m.startColumn,
      }));
      setProblems(mapped);
    }, 2000);
    return () => clearInterval(interval);
  }, [activeTab?.name]);

  // ─── JSX ──────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-dark-canvas text-white font-sans">
      {/* Header */}
      <Header
        applications={applications.map(a => ({ id: a.id, name: a.name }))}
        selectedApplicationId={currentProject?.id || null}
        workflowId={currentWorkflowId}
        projectId={currentRunConfigProjectId}
        onApplicationSelect={projectNavigation.handleApplicationSelect}
        onCreateApplication={projectNavigation.handleCreateApplication}
        isRunning={testExecution.isRunning}
        isDebugging={debugState.isDebugging}
        isRecording={recording.isRecording}
        onRun={(configId?: string) => {
          void testExecution.runTests(configId);
        }}
        onDebug={(configId?: string) => {
          void testExecution.debugTests(configId);
        }}
        onStop={() => {
          if (debugState.isDebugging) {
            testExecution.handleStopDebug();
            return;
          }
          testExecution.setIsRunning(false);
        }}
        onRecord={recording.handleRecordClick}
        onStopRecording={recording.stopRecording}
        showRunControls={activeView === 'explorer'}
        currentFileName={activeTab?.name}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar
          activeView={activeView}
          onViewChange={handleViewChange}
          executionBadge={executionBadge}
          onOpenScenarioBrowser={() => scenarioBrowser.setShowScenarioBrowser(true)}
          scenarioCount={scenarioBrowser.scenarioBadgeCount}
        />

        {/* Full-page panels (Executions, Schedules) */}
        {isFullPageView ? (
          <div className="flex-1 overflow-hidden">
            {activeView === 'executions' && (
              <ExecutionReportView
                initialSelectedRunId={targetExecutionId}
                applicationId={currentProject?.id}
              />
            )}
            {activeView === 'schedules' && (
              <SchedulerPanel
                workflowId={currentWorkflowId}
                applicationId={currentProject?.id}
                defaultProjectId={selectedProjectId || undefined}
                onRunTriggered={() => {
                  void fetchExecutions();
                  handleViewChange('executions');
                }}
                onNavigateToExecution={(executionId) => {
                  setTargetExecutionId(executionId);
                  handleViewChange('executions');
                }}
              />
            )}
            {activeView === 'testdata' && currentProject?.id && (
              <TestDataPage
                projectId={currentProject.id}
                nestedProjectId={selectedProjectId}
                onInsertQuery={(snippet) => {
                  handleInsertSnippet(snippet);
                  handleViewChange('explorer');
                }}
              />
            )}
            {activeView === 'testdata' && isProjectsLoading && (
              <div className="flex-1 flex items-center justify-center text-text-secondary">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-status-info mx-auto mb-4"></div>
                  <p>Loading projects...</p>
                </div>
              </div>
            )}
            {activeView === 'testdata' && !isProjectsLoading && !currentProject && (
              <EmptyState
                icon={<span className="material-symbols-outlined text-2xl">database</span>}
                title="Select a project to view test data"
                className="flex-1"
              />
            )}
            {activeView === 'ai-test-generator' && (
              <AIAgentPanel
                isVisible={true}
                onInsertCode={(code) => {
                  editorRef.current?.insertText(code, 'newline');
                  handleViewChange('explorer');
                }}
                onGeneratedCode={(code) => {
                  editorRef.current?.insertText(code, 'newline');
                }}
                onClose={() => handleViewChange('explorer')}
              />
            )}
            {activeView === 'prs' && (
              activeNestedProjectId ? (
                <PullRequestsPanel projectId={activeNestedProjectId} />
              ) : (
                <EmptyState
                  icon={<span className="material-symbols-outlined text-2xl">account_tree</span>}
                  title="No nested project selected"
                  message="Create or select a project to view and create pull requests."
                  className="flex-1"
                />
              )
            )}
          </div>
        ) : (
          <>
            {/* Primary Sidebar */}
            <aside className="w-[280px] flex flex-col bg-dark-card shrink-0">
              {activeView === 'explorer' && (
                <>
                  <ExplorerPanel
                    projects={nestedProjects}
                    error={projectLoadError}
                    isLoading={isProjectsLoading}
                    selectedProjectId={selectedProjectId}
                    projectFiles={fileManagement.projectFiles}
                    selectedFile={fileManagement.selectedFile}
                    expandedFolders={fileManagement.expandedFolders}
                    activeFileContent={activeTab?.content || null}
                    activeFileName={activeTab?.name || null}
                    onFileSelect={fileManagement.handleFileSelect}
                    onDirectorySelect={handleExplorerDirectorySelect}
                    onFolderToggle={fileManagement.handleFolderToggle}
                    onProjectSelect={projectNavigation.handleProjectSelect}
                    onProjectExpand={projectNavigation.handleProjectExpand}
                    onCreateProject={projectNavigation.handleCreateProject}
                    onDeleteProject={projectNavigation.handleDeleteProject}
                    onCreateFile={fileManagement.handleCreateFile}
                    onCreateSandbox={projectNavigation.handleCreateSandbox}
                    onSyncSandbox={projectNavigation.handleSyncSandbox}
                    onRetry={fetchProjects}
                    onNavigateToLine={(line) => {
                      addConsoleOutput(`Navigate to line ${line}`);
                    }}
                    onFileContextMenu={fileManagement.handleFileContextMenu}
                  />
                </>
              )}
              {activeView === 'settings' && (
                <div className="flex-1 overflow-y-auto p-4">
                  <PanelHeader title="Settings" className="h-12 px-4" />
                  <div className="p-4 space-y-4">
                    <button
                      onClick={() => setShowAISettingsModal(true)}
                      className="w-full px-4 py-2 bg-dark-elevated border border-border-default rounded-lg text-sm text-white hover:bg-dark-elevated transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">auto_awesome</span>
                      AI Provider Settings
                    </button>
                    <button
                      onClick={() => setRunConfigModalOpen(true)}
                      className="w-full px-4 py-2 bg-dark-elevated border border-border-default rounded-lg text-sm text-white hover:bg-dark-elevated transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">tune</span>
                      Run Configurations
                    </button>
                  </div>
                </div>
              )}
            </aside>

            {/* Editor Area */}
            <main className="flex-1 flex overflow-hidden bg-dark-canvas">
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {openTabs.length > 0 ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    <WorkspaceEditorTabs
                      tabs={openTabs}
                      activeTabId={activeTabId}
                      onActivate={fileManagement.activateTab}
                      onClose={fileManagement.closeTab}
                    />

                    {/* Debug controls */}
                    {(testExecution.isRunning || debugState.isDebugging || debugState.breakpoints.size > 0) && (
                      <DebugToolbar
                        isRunning={testExecution.isRunning}
                        debugState={debugState}
                        breakpointsMuted={breakpointsMuted}
                        onResume={resume}
                        onStepOver={stepOver}
                        onStepInto={stepInto}
                        onStop={testExecution.handleStopDebug}
                        onRestart={testExecution.handleRestartDebug}
                        onToggleMuteBreakpoints={toggleMuteBreakpoints}
                      />
                    )}

                    {/* Editor or Compare View */}
                    <div className="flex-1 flex flex-col min-h-0">
                      {activeTab ? (
                        <WorkspaceEditorPane
                          activeTab={activeTab}
                          editorRef={editorRef}
                          currentProjectId={currentProject?.id}
                          nestedProjects={nestedProjects}
                          onTabContentChange={fileManagement.updateTabContent}
                          onCloseTab={fileManagement.closeTab}
                          onApplyCompareChanges={handleApplyCompareChanges}
                          onRunScenario={testExecution.handleRunScenario}
                          onRunFeature={testExecution.handleRunFeature}
                          onGutterContextMenu={(info) => setGutterMenu(info)}
                          onNavigateToDefinition={handleNavigateToDefinition}
                          onInsertDataQuery={handleInsertDataQuery}
                          breakpoints={debugState.breakpoints}
                          onToggleBreakpoint={toggleBreakpoint}
                          debugCurrentLine={debugState.currentLine}
                          isDebugging={debugState.isDebugging}
                          isRecording={recording.isRecording}
                          failureLines={testExecution.failureLines}
                          onStartRecording={(scenarioName) => {
                            recording.setPrefilledScenarioName(scenarioName);
                            recording.setShowRecordingModal(true);
                          }}
                        />
                      ) : null}
                    </div>

                    {/* Debug Console Panel */}
                    {(debugState.isDebugging || testExecution.showDebugConsole) && (
                      <DebugConsolePanel
                        entries={consoleEntries}
                        variables={variables}
                        callStack={callStack}
                        problems={[]}
                        isMinimized={!testExecution.showDebugConsole}
                        onToggleMinimize={() => testExecution.setShowDebugConsole(!testExecution.showDebugConsole)}
                        onClearConsole={clearConsole}
                        onGoToLine={(line) => editorRef.current?.goToLine(line)}
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    {projectLoadError ? (
                      <div className="text-center max-w-lg px-6">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-status-danger/15 border border-status-danger/40 flex items-center justify-center">
                          <span className="material-symbols-outlined text-status-danger text-2xl">error</span>
                        </div>
                        <h2 className="text-xl font-semibold text-text-primary mb-2">Backend unavailable</h2>
                        <p className="text-text-secondary text-sm break-words">
                          {projectLoadError}
                        </p>
                        <p className="text-text-secondary text-xs mt-3">
                          Start the backend and reload to see your latest application and scheduler changes.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-lg bg-brand-primary flex items-center justify-center">
                          <span className="text-white font-bold text-xl">V</span>
                        </div>
                        <h2 className="text-lg font-semibold text-text-primary mb-1.5">Welcome to Vero IDE</h2>
                        <p className="text-text-secondary text-sm max-w-md">
                          Select a file from the Explorer to start editing,<br />
                          or create a new test scenario.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {showRightToolRail && (
                <>
                  <RightToolRail
                    isOpen={isRightToolPanelOpen}
                    onToggle={() => setIsRightToolPanelOpen((prev) => !prev)}
                  />

                  {isRightToolPanelOpen && (
                    <aside className="w-[320px] border-l border-border-default bg-dark-shell flex flex-col shrink-0">
                      <PanelHeader
                        title="Data Tools"
                        className="h-9 px-3"
                        actions={(
                          <IconButton
                            icon={<span className="material-symbols-outlined text-sm">close</span>}
                            size="sm"
                            tooltip="Close data tools"
                            onClick={() => setIsRightToolPanelOpen(false)}
                          />
                        )}
                      />
                      <div className="px-3 py-2 border-b border-border-default bg-dark-shell">
                        <button
                          onClick={handleInsertDataQuery}
                          className="w-full h-7 rounded border border-border-default bg-dark-canvas text-xs text-text-primary hover:bg-dark-elevated transition-colors"
                        >
                          Insert Data Query (Ctrl+D)
                        </button>
                      </div>
                      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                        <DataPanel
                          projectId={currentProject?.id}
                          onBuildQuery={() => {
                            setShowDataQueryModal(true);
                          }}
                          onInsertColumnRef={(ref) => {
                            editorRef.current?.insertText(ref, 'cursor');
                          }}
                        />
                        <VDQLReferencePanel onInsertSnippet={handleInsertSnippet} />
                      </div>
                    </aside>
                  )}
                </>
              )}
            </main>

          </>
        )}
      </div>

      {/* Bottom Status Bar */}
      <WorkspaceStatusBar
        showConsole={showConsole}
        onToggleConsole={() => setShowConsole(!showConsole)}
        showProblems={showProblems}
        onToggleProblems={() => setShowProblems(!showProblems)}
        problemCount={problems.length}
        isRunning={testExecution.isRunning}
        activeTabName={activeTab?.name}
        lastCompletedExecutionId={testExecution.lastCompletedExecutionId}
        activeView={activeView}
        onViewReport={() => {
          setTargetExecutionId(testExecution.lastCompletedExecutionId);
          handleViewChange('executions');
          testExecution.setLastCompletedExecutionId(null);
        }}
      />

      {/* Overlay Panels */}
      {showConsole && (
        <div className="fixed left-[42px] right-0 bottom-6 h-[200px] bg-dark-canvas border-t border-border-default z-30 shadow-xl">
          <ConsolePanel
            output={consoleOutput}
            onClear={() => setConsoleOutput([])}
            onClose={() => setShowConsole(false)}
          />
        </div>
      )}

      {showProblems && (
        <div className="fixed left-[42px] right-0 bottom-6 z-30 shadow-xl">
          <ProblemsPanel
            problems={problems}
            isOpen={showProblems}
            onClose={() => setShowProblems(false)}
            onNavigate={(_file, line) => {
              editorRef.current?.goToLine(line);
            }}
          />
        </div>
      )}

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={paletteCommands}
      />

      <QuickOpenDialog
        isOpen={showQuickOpen}
        onClose={() => setShowQuickOpen(false)}
        files={quickOpenFiles}
        onSelect={(filePath) => {
          void fileManagement.loadFileContent(filePath);
        }}
      />

      {/* Modals */}
      {currentProject?.id && (
        <DataQueryModal
          isOpen={showDataQueryModal}
          onClose={() => setShowDataQueryModal(false)}
          projectId={currentProject.id}
          onInsertSnippet={handleInsertSnippet}
        />
      )}

      <RunConfigModal
        workflowId={currentWorkflowId}
        projectId={currentRunConfigProjectId}
        onRun={(configId: string) => { void testExecution.runTests(configId); }}
      />

      <AISettingsModal
        isOpen={showAISettingsModal}
        onClose={() => setShowAISettingsModal(false)}
      />

      <RecordingModal
        isOpen={recording.showRecordingModal}
        onClose={() => { recording.setShowRecordingModal(false); recording.setPrefilledScenarioName(''); }}
        onStart={recording.startRecording}
        defaultUrl={testExecution.getRunConfigBaseUrl(getActiveConfig()) || 'https://example.com'}
        defaultScenarioName={recording.prefilledScenarioName}
      />

      {projectNavigation.sandboxTargetProjectId && (
        <CreateSandboxModal
          isOpen={projectNavigation.showCreateSandboxModal}
          onClose={projectNavigation.handleSandboxCreated}
          projectId={projectNavigation.sandboxTargetProjectId}
        />
      )}

      <EnvironmentManager />

      <ScenarioBrowser
        isOpen={scenarioBrowser.showScenarioBrowser}
        onClose={() => scenarioBrowser.setShowScenarioBrowser(false)}
        scenarios={scenarioBrowser.scenarioItems}
        totalScenarios={scenarioBrowser.scenarioTotal}
        loading={scenarioBrowser.scenarioBrowserLoading}
        error={scenarioBrowser.scenarioBrowserError}
        filters={scenarioBrowser.scenarioFilters}
        onFiltersChange={scenarioBrowser.handleScenarioFiltersChange}
        availableProjects={scenarioBrowser.scenarioFacets?.projects || []}
        availableFolders={scenarioBrowser.scenarioFacets?.folders || []}
        availableTags={scenarioBrowser.scenarioFacets?.tags || []}
        onNavigateToScenario={handleNavigateToScenario}
      />

      {fileManagement.contextMenu && (
        <FileContextMenu
          x={fileManagement.contextMenu.x}
          y={fileManagement.contextMenu.y}
          filePath={fileManagement.contextMenu.filePath}
          fileName={fileManagement.contextMenu.fileName}
          onClose={() => fileManagement.setContextMenu(null)}
          onCompareWith={handleOpenCompareWith}
          onDelete={fileManagement.handleDeleteFile}
          onRename={fileManagement.handleRenameFile}
        />
      )}

      {gutterMenu && (
        <GutterContextMenu
          x={gutterMenu.x}
          y={gutterMenu.y}
          itemType={gutterMenu.itemType}
          itemName={gutterMenu.itemName}
          onRun={() => {
            if (gutterMenu.itemType === 'scenario') {
              testExecution.handleRunScenario(gutterMenu.itemName);
            } else {
              testExecution.handleRunFeature(gutterMenu.itemName);
            }
            setGutterMenu(null);
          }}
          onDebug={() => {
            if (gutterMenu.itemType === 'scenario') {
              testExecution.handleDebugScenario(gutterMenu.itemName);
            } else {
              testExecution.debugTests();
            }
            setGutterMenu(null);
          }}
          onClose={() => setGutterMenu(null)}
        />
      )}

      {compareModal && compareModal.projectId && (
        <CompareWithModal
          isOpen={true}
          projectId={compareModal.projectId}
          filePath={compareModal.filePath}
          currentEnvironment={compareModal.sourceEnvironment}
          onClose={() => setCompareModal(null)}
          onCompare={handleCompare}
        />
      )}

      <MergeConflictModal
        isOpen={projectNavigation.showMergeConflictModal}
        sandboxName={projectNavigation.mergeSandboxName}
        sourceBranch={projectNavigation.mergeSourceBranch}
        conflicts={projectNavigation.mergeConflicts}
        onClose={() => {
          projectNavigation.setShowMergeConflictModal(false);
          projectNavigation.setMergeConflicts([]);
          projectNavigation.setMergeSandboxId(null);
        }}
        onResolve={projectNavigation.handleResolveMergeConflicts}
      />

      {/* Store-driven merge conflict modal (from syncSandboxWithDetails) */}
      <MergeConflictModal
        isOpen={!!syncConflictsDetailed && syncConflictsDetailed.length > 0}
        sandboxName={syncConflictSandbox?.name || 'Sandbox'}
        sourceBranch={syncConflictSandbox?.sourceBranch || 'dev'}
        conflicts={syncConflictsDetailed || []}
        onClose={clearSyncConflictState}
        onResolve={async (resolutions) => {
          if (!syncConflictSandbox) return;
          const addToast = useToastStore.getState().addToast;
          try {
            const result = await sandboxApi.resolveConflicts(syncConflictSandbox.id, resolutions, true);
            if (result.success) {
              addToast({ message: `Resolved conflicts and updated ${result.updatedFiles.length} file(s)`, variant: 'success' });
              clearSyncConflictState();
              // Reload file trees
              if (currentProject?.projects) {
                for (const p of currentProject.projects) {
                  if (p.veroPath) fileManagement.loadProjectFiles(p.id, p.veroPath);
                }
              }
            }
          } catch (error) {
            addToast({ message: `Failed to resolve conflicts: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: 'error' });
          }
        }}
      />
    </div>
  );
}
