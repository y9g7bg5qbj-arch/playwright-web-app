import { useState, useEffect, useCallback, useRef } from 'react';
import { type Socket } from 'socket.io-client';

import { ActivityBar, type ActivityView } from './ActivityBar.js';
import { CompareTab } from './CompareTab.js';
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
import { TraceViewerPanel } from '../TraceViewer/TraceViewerPanel.js';
import { VeroEditor, type VeroEditorHandle } from '../vero/VeroEditor.js';
import { GutterContextMenu } from '../vero/GutterContextMenu.js';
import { useProjectStore } from '@/store/projectStore';
import { useRunConfigStore } from '@/store/runConfigStore';
import { useGitHubExecutionStore } from '@/store/useGitHubExecutionStore';
import { CreateSandboxModal } from '@/components/sandbox/CreateSandboxModal';
import { MergeConflictModal } from './MergeConflictModal';
import { IconButton, PanelHeader, EmptyState, Toolbar, ToolbarGroup } from '@/components/ui';
import { Bot, Database, FileBarChart2 } from 'lucide-react';
import { DataQueryModal } from '../ide/DataQueryModal';
import { DataPanel } from '../ide/DataPanel';
import { VDQLReferencePanel } from '../ide/VDQLReferencePanel';
import { useTestDataRegistry } from '@/hooks/useTestDataRegistry';

import { useFileManagement, type OpenTab } from './useFileManagement.js';
import { useRecording } from './useRecording.js';
import { useTestExecution } from './useTestExecution.js';
import { useScenarioBrowser } from './useScenarioBrowser.js';
import { useProjectNavigation } from './useProjectNavigation.js';

const API_BASE = '/api';

const FULL_PAGE_VIEWS: ActivityView[] = ['executions', 'schedules', 'testdata', 'ai-test-generator', 'trace'];

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

  // Convert nested projects from store format to ExplorerPanel format
  const nestedProjects: NestedProject[] = (currentProject?.projects || []).map(p => ({
    id: p.id,
    name: p.name,
    veroPath: p.veroPath,
    files: fileManagement.projectFiles[p.id],
  }));
  const selectedRunConfigProjectId =
    selectedProjectId ||
    fileManagement.activeTab?.projectId ||
    currentProject?.projects?.[0]?.id ||
    applications[0]?.projects?.[0]?.id;
  const runConfigScopeApplication =
    (selectedRunConfigProjectId
      ? applications.find((app) => app.projects?.some((project) => project.id === selectedRunConfigProjectId))
      : undefined) ||
    currentProject ||
    applications[0];
  const currentRunConfigProjectId =
    selectedRunConfigProjectId ||
    runConfigScopeApplication?.projects?.[0]?.id;
  const currentWorkflowId =
    runConfigScopeApplication?.workflows?.[0]?.id ||
    currentProject?.workflows?.[0]?.id ||
    applications.find((app) => app.id === currentProject?.id)?.workflows?.[0]?.id;

  // ─── Debug state (needs debugExecutionId before testExecution) ─
  const [debugExecutionId, setDebugExecutionId] = useState<string | null>(null);

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
    activeTabIdRef: fileManagement.activeTabIdRef,
    activeTab: fileManagement.activeTab,
    selectedProjectId,
    nestedProjects,
    currentProjectId: currentProject?.id,
    setOpenTabs: fileManagement.setOpenTabs,
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
  const [selectedTraceUrl, setSelectedTraceUrl] = useState<string | null>(null);
  const [selectedTraceName, setSelectedTraceName] = useState<string>('');
  const [compareModal, setCompareModal] = useState<{ filePath: string; projectId?: string } | null>(null);
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
      fileManagement.setActiveTabId(existingTab.id);
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
    const projectId = nestedProjectId || currentProject?.id;

    if (!projectId) {
      addConsoleOutput('Error: No project selected. Please select a project first.');
      fileManagement.setContextMenu(null);
      return;
    }

    setCompareModal({ filePath, projectId });
    fileManagement.setContextMenu(null);
  };

  const handleCompare = (source: string, target: string) => {
    if (!compareModal) return;

    const fileName = compareModal.filePath.split('/').pop() || 'Compare';
    const tabId = `compare-${Date.now()}`;

    const newTab: OpenTab = {
      id: tabId,
      path: compareModal.filePath,
      name: `${fileName} (${source} ↔ ${target})`,
      content: '',
      hasChanges: false,
      type: 'compare',
      compareSource: source,
      compareTarget: target,
      projectId: compareModal.projectId,
    };

    fileManagement.setOpenTabs(prev => [...prev, newTab]);
    fileManagement.setActiveTabId(tabId);
    setCompareModal(null);
    addConsoleOutput(`Comparing ${fileName}: ${source} vs ${target}`);
  };

  const handleApplyCompareChanges = (tabId: string, content: string) => {
    const tab = fileManagement.openTabs.find(t => t.id === tabId);
    if (!tab) return;

    const existingFileTab = fileManagement.openTabs.find(t => t.path === tab.path && t.type !== 'compare');

    if (existingFileTab) {
      fileManagement.setOpenTabs(prev => prev.map(t =>
        t.id === existingFileTab.id
          ? { ...t, content, hasChanges: true }
          : t
      ));
      fileManagement.setActiveTabId(existingFileTab.id);
      addConsoleOutput(`Applied changes to ${tab.name.split(' (')[0]}`);
    } else {
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
      fileManagement.setOpenTabs(prev => [...prev, newTab]);
      fileManagement.setActiveTabId(newTabId);
      addConsoleOutput(`Created file tab with applied changes: ${fileName}`);
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

  const isFullPageView = FULL_PAGE_VIEWS.includes(activeView);
  const { activeTab, openTabs, activeTabId } = fileManagement;

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
              <div className="flex-1 flex flex-col items-center justify-center text-text-secondary gap-3">
                <Bot size={48} strokeWidth={1.25} className="text-text-tertiary" />
                <h2 className="text-lg font-medium text-text-primary">AI Studio</h2>
                <p className="text-sm">Coming soon</p>
              </div>
            )}
            {activeView === 'trace' && selectedTraceUrl && (
              <TraceViewerPanel
                traceUrl={selectedTraceUrl}
                testId="selected-test"
                testName={selectedTraceName}
                onClose={() => {
                  setSelectedTraceUrl(null);
                  setSelectedTraceName('');
                  handleViewChange('executions');
                }}
              />
            )}
            {activeView === 'trace' && !selectedTraceUrl && (
              <EmptyState
                icon={<span className="material-symbols-outlined text-2xl">bug_report</span>}
                title="No trace selected"
                message="Run a test with tracing enabled to view traces"
                className="flex-1"
              />
            )}
          </div>
        ) : (
          <>
            {/* Primary Sidebar */}
            <aside className="w-[280px] flex flex-col bg-dark-card shrink-0">
              {activeView === 'explorer' && (
                <>
                  <ExplorerPanel
                    applicationName={currentProject?.name || 'VERO-PROJECT'}
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
                  <DataPanel
                    projectId={currentProject?.id}
                    onBuildQuery={() => {
                      setShowDataQueryModal(true);
                    }}
                    onInsertColumnRef={(ref) => {
                      editorRef.current?.insertText(ref, 'cursor');
                    }}
                  />
                  <VDQLReferencePanel
                    onInsertSnippet={handleInsertSnippet}
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
            <main className="flex-1 flex flex-col overflow-hidden bg-dark-canvas">
              {openTabs.length > 0 ? (
                <div className="flex-1 flex flex-col">
                  {/* Tab Bar */}
                  <div className="h-10 flex items-center justify-between border-b border-border-default bg-dark-card">
                    <div className="flex items-center overflow-x-auto flex-1">
                      {openTabs.map(tab => (
                        <div
                          key={tab.id}
                          onClick={() => fileManagement.setActiveTabId(tab.id)}
                          className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm border-r border-border-default min-w-0 group ${activeTabId === tab.id
                            ? 'bg-dark-canvas text-white'
                            : 'bg-dark-card text-text-secondary hover:text-white hover:bg-dark-elevated'
                            }`}
                        >
                          <span className={`material-symbols-outlined text-sm ${tab.type === 'compare'
                            ? (activeTabId === tab.id ? 'text-accent-purple' : 'text-text-secondary')
                            : (activeTabId === tab.id ? 'text-brand-primary' : 'text-text-secondary')
                            }`}>
                            {tab.type === 'compare'
                              ? 'compare'
                              : tab.type === 'image'
                                ? 'image'
                                : tab.type === 'binary'
                                  ? 'draft'
                                  : 'description'}
                          </span>
                          <span className="truncate max-w-[120px]">{tab.name}</span>
                          {tab.hasChanges && (
                            <span className="w-2 h-2 bg-brand-secondary rounded-full flex-shrink-0" />
                          )}
                          <IconButton
                            icon={<span className="material-symbols-outlined text-sm">close</span>}
                            size="sm"
                            tooltip="Close tab"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileManagement.closeTab(tab.id);
                            }}
                            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </div>
                      ))}
                    </div>
                    {activeTab && (activeTab.type === undefined || activeTab.type === 'file') && (
                      <div className="flex items-center gap-1 mx-2 flex-shrink-0">
                        <IconButton
                          icon={<Database className="w-3.5 h-3.5" />}
                          size="sm"
                          tooltip="Insert Data Query (Ctrl+D)"
                          onClick={handleInsertDataQuery}
                        />
                        <button
                          onClick={() => fileManagement.saveFileContent(activeTab.content)}
                          className="px-3 py-1 text-xs bg-status-success hover:bg-status-success/90 text-white rounded transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">save</span>
                          Save
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Debug controls */}
                  {(testExecution.isRunning || debugState.isDebugging || debugState.breakpoints.size > 0) && (
                    <DebugToolbar
                      isRunning={testExecution.isRunning}
                      debugState={debugState}
                      breakpointsMuted={breakpointsMuted}
                      onPause={pause}
                      onResume={resume}
                      onStepOver={stepOver}
                      onStepInto={stepInto}
                      onStepOut={stepOut}
                      onStop={testExecution.handleStopDebug}
                      onRestart={testExecution.handleRestartDebug}
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
                        onClose={() => fileManagement.closeTab(activeTab.id)}
                        onApplyChanges={(content) => handleApplyCompareChanges(activeTab.id, content)}
                      />
                    ) : activeTab && activeTab.type === 'image' ? (
                      <div className="flex-1 overflow-auto p-4 bg-dark-canvas">
                        <div className="text-xs text-text-secondary mb-2">{activeTab.path}</div>
                        <div className="rounded border border-border-default bg-dark-card p-2 inline-block">
                          <img
                            src={activeTab.content}
                            alt={activeTab.name}
                            className="max-w-full h-auto block"
                          />
                        </div>
                      </div>
                    ) : activeTab && activeTab.type === 'binary' ? (
                      <div className="flex-1 flex items-center justify-center p-6">
                        <div className="max-w-xl text-center">
                          <h3 className="text-text-primary font-medium mb-2">Binary file preview unavailable</h3>
                          <p className="text-sm text-text-secondary break-all">{activeTab.path}</p>
                          {activeTab.contentType && (
                            <p className="text-xs text-text-muted mt-2">Content type: {activeTab.contentType}</p>
                          )}
                        </div>
                      </div>
                    ) : activeTab ? (
                      <VeroEditor
                        ref={editorRef}
                        key={activeTab.id}
                        initialValue={activeTab.content}
                        onChange={(value) => value && fileManagement.updateTabContent(activeTab.id, value)}
                        onRunScenario={testExecution.handleRunScenario}
                        onRunFeature={testExecution.handleRunFeature}
                        onGutterContextMenu={(info) => setGutterMenu(info)}
                        showErrorPanel={true}
                        token={null}
                        veroPath={nestedProjects.find(p => activeTab.path.startsWith(p.veroPath || ''))?.veroPath}
                        filePath={activeTab.path}
                        projectId={nestedProjects.find(p => activeTab.path.startsWith(p.veroPath || ''))?.id}
                        applicationId={currentProject?.id}
                        onNavigateToDefinition={handleNavigateToDefinition}
                        onInsertDataQuery={handleInsertDataQuery}
                        breakpoints={debugState.breakpoints}
                        onToggleBreakpoint={toggleBreakpoint}
                        debugCurrentLine={debugState.currentLine}
                        isDebugging={debugState.isDebugging}
                        isRecording={recording.isRecording}
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
                      watches={watches}
                      callStack={callStack}
                      problems={[]}
                      isMinimized={!testExecution.showDebugConsole}
                      onToggleMinimize={() => testExecution.setShowDebugConsole(!testExecution.showDebugConsole)}
                      onClearConsole={clearConsole}
                      onGoToLine={(line) => editorRef.current?.goToLine(line)}
                      onAddWatch={addWatch}
                      onRemoveWatch={removeWatch}
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
                      <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-brand-primary to-accent-purple flex items-center justify-center">
                        <span className="text-white font-bold text-2xl">V</span>
                      </div>
                      <h2 className="text-xl font-semibold text-text-primary mb-2">Welcome to Vero IDE</h2>
                      <p className="text-text-secondary text-sm max-w-md">
                        Select a file from the Explorer to start editing,<br />
                        or create a new test scenario.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </main>

          </>
        )}
      </div>

      {/* Bottom Status Bar */}
      <Toolbar position="bottom" size="sm" className="h-6 px-1 bg-dark-card">
        <ToolbarGroup>
          <button
            onClick={() => setShowConsole(!showConsole)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${showConsole
              ? 'bg-status-success text-white'
              : 'text-text-secondary hover:text-white hover:bg-dark-elevated'
              }`}
            title="Toggle Terminal"
          >
            <span className="material-symbols-outlined text-base">terminal</span>
            <span>Terminal</span>
          </button>
        </ToolbarGroup>

        <div className="flex-1" />

        <ToolbarGroup className="gap-3 text-xs text-text-secondary">
          {testExecution.lastCompletedExecutionId && !testExecution.isRunning && activeView !== 'executions' && (
            <button
              onClick={() => {
                setTargetExecutionId(testExecution.lastCompletedExecutionId);
                handleViewChange('executions');
                testExecution.setLastCompletedExecutionId(null);
              }}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded text-3xs font-medium text-status-info bg-status-info/12 border border-status-info/30 hover:bg-status-info/20 transition-colors"
            >
              <FileBarChart2 className="h-3 w-3" />
              View Report
            </button>
          )}
          {testExecution.isRunning && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-status-success rounded-full animate-pulse" />
              Running
            </span>
          )}
          {activeTab && (
            <span className="truncate max-w-[200px]">{activeTab.name}</span>
          )}
        </ToolbarGroup>
      </Toolbar>

      {/* Overlay Panels */}
      {showConsole && (
        <div className="fixed left-[48px] right-0 bottom-6 h-[200px] bg-dark-canvas border-t border-border-default z-30 shadow-xl">
          <ConsolePanel
            output={consoleOutput}
            onClear={() => setConsoleOutput([])}
            onClose={() => setShowConsole(false)}
          />
        </div>
      )}

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
          currentEnvironment="dev"
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
    </div>
  );
}
