import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { VeroEditor } from './VeroEditor';
import { updatePageRegistry, updateTestDataRegistry } from './veroLanguage';
import {
    FileText, Play, Square, Circle,
    Save, ChevronRight, ChevronDown,
    Folder, FolderOpen, Plus, Pencil, Settings,
    Globe, Monitor, AlertTriangle, Database,
    FileSearch, Calendar, Activity,
    Zap, Grid3X3, Briefcase, Layers,
    Search, Check, Trash2, Github, Bot,
    Pause, ArrowRight, Bug, Sparkles
} from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { NewProjectModal } from '../ui/NewProjectModal';
import type { ParallelConfig, ShardingConfig as ShardingConfigType } from '@/types/execution';

// Import new panels
import { ExecutionConfigPanel } from '../ExecutionConfig/ExecutionConfigPanel';
import { WorkerDashboard } from '../Workers/WorkerDashboard';
import { TraceViewerPanel } from '../TraceViewer/TraceViewerPanel';
import { TestResultsDashboard } from '../Results/TestResultsDashboard';
import { ShardingConfig } from '../Sharding/ShardingConfig';
import { TestDataPage } from '../TestData/TestDataPage';
import { ExecutionDashboard, LocalExecutionViewer } from '../ExecutionDashboard';
import { SchedulerPanel } from '../Scheduler/SchedulerPanel';
import { AIAgentPanel } from '../ide/AIAgentPanel';
import { LiveExecutionPanel } from '../ide/LiveExecutionPanel';
import { CopilotPanel } from '../copilot/CopilotPanel';
import { useWorkflowStore } from '@/store/workflowStore';
import { useProjectStore } from '@/store/projectStore';

// Import RunConfigurationModal and store
import { RunConfigurationModal } from '../RunConfiguration';
import { useRunConfigStore } from '@/store/useRunConfigStore';
import { useGitHubStore } from '@/store/useGitHubStore';
import { useGitHubExecutionStore, type GitHubExecution } from '@/store/useGitHubExecutionStore';
import { GitHubRunModal, type GitHubRunConfig } from './GitHubRunModal';
import { githubRepoApi, githubRunsApi } from '@/api/github';

// Right panel tab type (deprecated - keeping for compatibility)
type RightPanelTab = 'none' | 'console' | 'config' | 'workers' | 'sharding' | 'results' | 'trace' | 'testdata' | 'scheduler';

// Settings view type - controls what shows in canvas area
type SettingsView = 'explorer' | 'testdata' | 'workers' | 'sharding' | 'results' | 'trace' | 'scheduler' | 'config' | 'executions' | 'live-execution';

// Default parallel execution config
const defaultParallelConfig: ParallelConfig = {
    mode: 'local',
    workerCount: 2,
    maxRetries: 1,
    timeout: 30000,
    browsers: ['chromium'],
    sharding: {
        enabled: false,
        strategy: 'round-robin',
        shardCount: 1,
    },
    artifacts: {
        traces: 'on-failure',
        videos: 'on-failure',
        screenshots: 'on-failure',
        retentionDays: 7,
    },
};

interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileNode[];
}

interface VeroIDEProps {
    projectPath?: string;
}

// Environment definition (Postman-style)
interface EnvironmentVariable {
    key: string;
    value: string;
    enabled: boolean;
}

interface Environment {
    name: string;
    color: string;
    protected?: boolean;
    variables: EnvironmentVariable[];
}

// Default environments with Postman-style variables
const DEFAULT_ENVIRONMENTS: Environment[] = [
    {
        name: 'Local',
        color: '#22c55e',
        variables: [
            { key: 'baseUrl', value: 'http://localhost:3000', enabled: true },
            { key: 'apiUrl', value: 'http://localhost:3001/api', enabled: true },
        ]
    },
    {
        name: 'QA',
        color: '#eab308',
        variables: [
            { key: 'baseUrl', value: 'https://qa.example.com', enabled: true },
            { key: 'apiUrl', value: 'https://qa-api.example.com', enabled: true },
        ]
    },
    {
        name: 'Staging',
        color: '#3b82f6',
        variables: [
            { key: 'baseUrl', value: 'https://staging.example.com', enabled: true },
            { key: 'apiUrl', value: 'https://staging-api.example.com', enabled: true },
        ]
    },
    {
        name: 'Production',
        color: '#ef4444',
        protected: true,
        variables: [
            { key: 'baseUrl', value: 'https://www.example.com', enabled: true },
            { key: 'apiUrl', value: 'https://api.example.com', enabled: true },
        ]
    }
];

// Test execution configuration
interface ExecutionConfig {
    // Tier 1 - Toolbar
    browserMode: 'headed' | 'headless';
    environment: string;
    target: 'local' | 'remote';  // Execution target

    // Tier 2 - Quick Settings
    browser: 'chromium' | 'firefox' | 'webkit';
    viewport: { width: number; height: number };
    slowMo: number;
    screenshotOnFailure: boolean;
    recordVideo: boolean;
    workers: number;
    timeout: number;

    // Tier 3 - Advanced
    retries: number;
    shardIndex?: number;
    shardTotal?: number;
    pauseOnFailure: boolean;
}

// Viewport presets
const VIEWPORT_PRESETS = [
    { name: 'Desktop (1280×720)', width: 1280, height: 720 },
    { name: 'Full HD (1920×1080)', width: 1920, height: 1080 },
    { name: 'Tablet (768×1024)', width: 768, height: 1024 },
    { name: 'iPhone SE (375×667)', width: 375, height: 667 },
    { name: 'iPhone 14 (390×844)', width: 390, height: 844 },
];

export function VeroIDE({ projectPath = '/vero-lang/test-project' }: VeroIDEProps) {
    // Router hooks
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // URL params for navigation from Scenario Dashboard
    const urlFile = searchParams.get('file');
    const urlLine = searchParams.get('line');

    // Ref to VeroEditor for programmatic control (goToLine for navigation from Scenario Dashboard)
    const veroEditorRef = useRef<import('./VeroEditor').VeroEditorHandle | null>(null);

    // Store hooks
    const { workflows, currentWorkflow, fetchWorkflows } = useWorkflowStore();
    const { projects, currentProject, setCurrentProject, fetchProjects, createProject, updateProject } = useProjectStore();

    // Run configuration store
    const runConfigState = useRunConfigStore();
    const configurations = runConfigState.configurations || [];
    const selectedConfigId = runConfigState.selectedConfigId;
    const runConfigEnvironments = runConfigState.environments || [];
    const runners = runConfigState.runners || [];
    const availableTags = runConfigState.availableTags || [];

    // Run config store actions
    const selectConfiguration = runConfigState.selectConfiguration;
    const createConfiguration = runConfigState.createConfiguration;
    const updateConfiguration = runConfigState.updateConfiguration;
    const deleteConfiguration = runConfigState.deleteConfiguration;
    const duplicateConfiguration = runConfigState.duplicateConfiguration;
    const createEnvironment = runConfigState.createEnvironment;

    // GitHub Actions store
    const {
        isConnected: isGitHubConnected,
        loadIntegration: loadGitHubIntegration
    } = useGitHubStore();

    // Active flow state (for ProjectSidebar integration)
    const [activeFlowId, setActiveFlowId] = useState<string | undefined>();
    const [selectedDataTableId, setSelectedDataTableId] = useState<string | undefined>();
    const [showRunConfigModal, setShowRunConfigModal] = useState(false);
    const [showGitHubRunModal, setShowGitHubRunModal] = useState(false);

    // App Launcher state (Salesforce-style 9-dot grid)
    const [showAppLauncher, setShowAppLauncher] = useState(false);
    const [appLauncherSearch, setAppLauncherSearch] = useState('');

    // New Project Modal state
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDescription, setNewProjectDescription] = useState('');
    const [isCreatingProject, setIsCreatingProject] = useState(false);

    // Rename Project Modal state
    const [showRenameProjectModal, setShowRenameProjectModal] = useState(false);
    const [renameProjectName, setRenameProjectName] = useState('');
    const [isRenamingProject, setIsRenamingProject] = useState(false);

    // Delete project confirmation state
    const [deleteConfirmProject, setDeleteConfirmProject] = useState<{ id: string; name: string } | null>(null);

    // New inner project modal state (for creating projects inside application)
    const [showNewInnerProjectModal, setShowNewInnerProjectModal] = useState(false);

    const [files, setFiles] = useState<FileNode[]>([]);
    // Per-project file trees (key = project ID)
    const [projectFiles, setProjectFiles] = useState<Record<string, FileNode[]>>({});
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    // Currently selected inner project (for file operations)
    const [selectedInnerProjectId, setSelectedInnerProjectId] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    // Auth token for API calls (including validation)
    const authToken = localStorage.getItem('auth_token');
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [showAIPanel, setShowAIPanel] = useState(false);
    const [showCopilotPanel, setShowCopilotPanel] = useState(false);
    const [showLiveExecution, setShowLiveExecution] = useState(false);
    const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['proj:default', 'pages', 'features']));
    const [isDirty, setIsDirty] = useState(false);
    const [showNewFileDialog, setShowNewFileDialog] = useState<string | null>(null); // folder path for new file
    const [newFileName, setNewFileName] = useState('');

    // Recording state
    const [showRecordingDialog, setShowRecordingDialog] = useState(false);
    const [recordingScenarioName, setRecordingScenarioName] = useState('');
    const [recordingStartUrl, setRecordingStartUrl] = useState('https://example.com');
    const [recordedActions, setRecordedActions] = useState<string[]>([]);
    const [recordingSessionId, setRecordingSessionId] = useState<string | null>(null);

    // Embedded recording state (split-screen with browser iframe)
    const [isEmbeddedRecording, setIsEmbeddedRecording] = useState(false);
    const [activeRecordingScenario, setActiveRecordingScenario] = useState<string | null>(null);
    const activeRecordingScenarioRef = useRef<string | null>(null); // Ref for immediate access in callbacks
    const browserCanvasRef = useRef<HTMLCanvasElement>(null);
    const browserIframeRef = useRef<HTMLIFrameElement>(null);
    const recordingSocketRef = useRef<Socket | null>(null);

    // Rename state
    const [renamingFile, setRenamingFile] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    // Config state
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [configTab, setConfigTab] = useState<'quick' | 'advanced'>('quick');
    const [showRunDropdown, setShowRunDropdown] = useState(false);
    const [showEnvDropdown, setShowEnvDropdown] = useState(false);
    const [showProductionWarning, setShowProductionWarning] = useState(false);
    const [pendingEnvironment, setPendingEnvironment] = useState<string | null>(null);

    // Environment Manager (Postman-style)
    const [showEnvManager, setShowEnvManager] = useState(false);
    const [environments, setEnvironments] = useState<Environment[]>(() => {
        const saved = localStorage.getItem('vero-environments');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                // ignore
            }
        }
        return DEFAULT_ENVIRONMENTS;
    });

    // Right panel state for new config panels (deprecated)
    const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('console');
    const [parallelConfig, setParallelConfig] = useState<ParallelConfig>(defaultParallelConfig);
    const [selectedTraceUrl, setSelectedTraceUrl] = useState<string | null>(null);

    // Settings panel state - controls left sidebar and canvas content
    const [activeSettingsView, setActiveSettingsView] = useState<SettingsView>('explorer');
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);

    // Execution dashboard state
    const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
    const [previousView, setPreviousView] = useState<SettingsView>('explorer');

    const toggleRightPanel = (tab: RightPanelTab) => {
        setRightPanelTab(prev => prev === tab ? 'console' : tab);
    };

    // Execution dashboard handlers
    const handleViewLive = (execId: string) => {
        setActiveExecutionId(execId);
        setPreviousView(activeSettingsView);
        setActiveSettingsView('live-execution');
    };

    const handleViewTrace = (url: string, _name: string) => {
        setSelectedTraceUrl(url);
        setActiveSettingsView('trace');
    };

    const handleExecutionBack = () => {
        if (activeSettingsView === 'live-execution') {
            setActiveSettingsView('executions');
            setActiveExecutionId(null);
        } else {
            setActiveSettingsView(previousView);
        }
    };

    // ProjectSidebar handlers
    const handleFlowSelect = useCallback((flowId: string) => {
        setActiveFlowId(flowId);
        setSelectedDataTableId(undefined);
        // Initialize run configuration store for the workflow
        const workflow = workflows.find(w => w.testFlows?.some((f: any) => f.id === flowId));
        if (workflow) {
            useRunConfigStore.getState().setWorkflowId(workflow.id);
        }
    }, [workflows]);

    const handleNewFlow = useCallback(async (workflowId: string) => {
        const flowName = window.prompt('Enter a name for the new test flow:', 'New Test Flow');
        if (!flowName) return;
        // This would typically call the API to create a new flow
        console.log('Create new flow:', flowName, 'in workflow:', workflowId);
    }, []);

    const handleDataTableSelect = useCallback((tableId: string) => {
        setSelectedDataTableId(tableId);
    }, []);

    // Handle creating a new application
    const handleCreateProject = useCallback(async () => {
        if (!newProjectName.trim()) return;

        setIsCreatingProject(true);
        try {
            await createProject({
                name: newProjectName.trim(),
                description: newProjectDescription.trim() || undefined,
            });
            setShowNewProjectModal(false);
            setNewProjectName('');
            setNewProjectDescription('');
            setShowAppLauncher(false);
        } catch (error) {
            console.error('Failed to create application:', error);
            alert('Failed to create application. Please try again.');
        } finally {
            setIsCreatingProject(false);
        }
    }, [newProjectName, newProjectDescription, createProject]);

    // Handle renaming an application
    const handleRenameProject = useCallback(async () => {
        if (!renameProjectName.trim() || !currentProject) return;

        setIsRenamingProject(true);
        try {
            await updateProject(currentProject.id, {
                name: renameProjectName.trim(),
            });
            setShowRenameProjectModal(false);
            setRenameProjectName('');
        } catch (error) {
            console.error('Failed to rename application:', error);
            alert('Failed to rename application. Please try again.');
        } finally {
            setIsRenamingProject(false);
        }
    }, [renameProjectName, currentProject, updateProject]);

    // Handle deleting a project (inner project inside application)
    const handleDeleteProject = useCallback(async (projectId: string) => {
        if (!currentProject) return;

        try {
            const response = await fetch(`/api/applications/${currentProject.id}/projects/${projectId}`, {
                method: 'DELETE',
            });
            const result = await response.json();
            if (result.success) {
                // Refresh the current application to get updated projects list
                const updatedResponse = await fetch(`/api/applications/${currentProject.id}`);
                const updatedResult = await updatedResponse.json();
                if (updatedResult.success && updatedResult.data) {
                    setCurrentProject(updatedResult.data);
                }
            } else {
                alert('Failed to delete project: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error deleting project:', error);
            alert('Failed to delete project. Please try again.');
        } finally {
            setDeleteConfirmProject(null);
        }
    }, [currentProject, setCurrentProject]);

    // Handle creating a new project (inside application) with optional duplication
    const handleCreateInnerProject = useCallback(async (name: string, duplicateFromId?: string) => {
        if (!currentProject) {
            throw new Error('No application selected');
        }

        // Only include duplicateFromId if it's provided (for duplication)
        const payload: { name: string; duplicateFromId?: string } = { name };
        if (duplicateFromId) {
            payload.duplicateFromId = duplicateFromId;
        }

        const response = await fetch(`/api/applications/${currentProject.id}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to create project');
        }

        // Refresh the current application to get updated projects list
        const updatedResponse = await fetch(`/api/applications/${currentProject.id}`);
        const updatedResult = await updatedResponse.json();
        if (updatedResult.success && updatedResult.data) {
            setCurrentProject(updatedResult.data);
            // Expand the new project
            setExpandedFolders(prev => {
                const next = new Set(prev);
                next.add(`proj:${result.data.id}`);
                return next;
            });
            // Load files for the new project (use the veroPath from the response)
            if (result.data.veroPath) {
                // Use setTimeout to ensure state is updated first
                setTimeout(() => {
                    loadInnerProjectFiles(result.data.id, result.data.veroPath);
                }, 100);
            }
        }
    }, [currentProject, setCurrentProject]);

    // Refresh test data schema when leaving test data view (in case user made changes)
    const prevSettingsViewRef = useRef<SettingsView>(activeSettingsView);
    useEffect(() => {
        const prevView = prevSettingsViewRef.current;
        prevSettingsViewRef.current = activeSettingsView;

        // If we just switched FROM testdata to explorer, refresh the schema
        if (prevView === 'testdata' && activeSettingsView === 'explorer') {
            loadTestDataSchema();
        }
    }, [activeSettingsView]);

    // Fetch projects on mount
    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    // Fetch workflows and reload file tree when application changes
    useEffect(() => {
        if (currentProject) {
            fetchWorkflows(currentProject.id);
            // Clear per-project file cache when application changes
            setProjectFiles({});
            // Clear current file selection
            setSelectedFile(null);
            setFileContent('');
            setIsDirty(false);
            // Clear the default files state (since each inner project has its own files)
            setFiles([]);
            // Expand the first project folder and load its files
            const projects = (currentProject as any)?.projects || [];
            if (projects.length > 0) {
                const firstProject = projects[0];
                setExpandedFolders(prev => {
                    const next = new Set(prev);
                    next.add(`proj:${firstProject.id}`);
                    next.add('pages');
                    next.add('features');
                    return next;
                });
                // Load files for the first project
                if (firstProject.veroPath) {
                    loadInnerProjectFiles(firstProject.id, firstProject.veroPath);
                }
            } else {
                // No inner projects - set default expanded folders
                setExpandedFolders(prev => {
                    const next = new Set(prev);
                    next.add('proj:default');
                    next.add('pages');
                    next.add('features');
                    return next;
                });
                // Don't load any files - the application has no inner projects yet
                // User will need to create a project first
            }
        }
    }, [currentProject, fetchWorkflows]);

    // Initialize run configuration store when workflows are loaded or active flow changes
    // Also auto-create a default workflow if none exist
    useEffect(() => {
        const initializeWorkflowContext = async () => {
            if (workflows.length === 0 && currentProject) {
                // No workflows exist in store - try to create a default one
                try {
                    console.log('[VeroIDE] No workflows in store, creating default workflow for:', currentProject.id);
                    const newWorkflow = await useWorkflowStore.getState().createWorkflow(
                        'Default Workflow',
                        currentProject.id,
                        'Auto-created workflow for test execution'
                    );
                    useRunConfigStore.getState().setWorkflowId(newWorkflow.id);
                    console.log('[VeroIDE] Created default workflow:', newWorkflow.id);
                } catch (error) {
                    // Workflow might already exist in database - refetch workflows
                    console.log('[VeroIDE] Default workflow may already exist, refetching...');
                    await useWorkflowStore.getState().fetchWorkflows(currentProject.id);
                    const refreshedWorkflows = useWorkflowStore.getState().workflows;
                    if (refreshedWorkflows.length > 0) {
                        useRunConfigStore.getState().setWorkflowId(refreshedWorkflows[0].id);
                        console.log('[VeroIDE] Using existing workflow:', refreshedWorkflows[0].id);
                    }
                }
            } else if (activeFlowId && workflows.length > 0) {
                const workflow = workflows.find(w => w.testFlows?.some((f: any) => f.id === activeFlowId));
                if (workflow) {
                    useRunConfigStore.getState().setWorkflowId(workflow.id);
                }
            } else if (workflows.length > 0 && workflows[0].id) {
                // If no active flow, use the first workflow
                useRunConfigStore.getState().setWorkflowId(workflows[0].id);
            }
        };
        initializeWorkflowContext();
    }, [activeFlowId, workflows, currentProject]);

    // Persist environments to localStorage
    useEffect(() => {
        localStorage.setItem('vero-environments', JSON.stringify(environments));
    }, [environments]);

    // Resume polling for in-progress GitHub executions on mount
    useEffect(() => {
        const syncStuckExecutions = async () => {
            // Wait a moment for Zustand store to rehydrate from localStorage
            await new Promise(resolve => setTimeout(resolve, 500));

            const executions = useGitHubExecutionStore.getState().executions;
            console.log(`[VeroIDE] Checking ${executions.length} executions for sync...`);

            const inProgress = executions.filter(
                e => e.status === 'queued' || e.status === 'in_progress'
            );

            if (inProgress.length === 0) {
                console.log(`[VeroIDE] No in-progress executions to sync`);
                return;
            }

            console.log(`[VeroIDE] Found ${inProgress.length} in-progress GitHub execution(s), syncing status...`);

            for (const exec of inProgress) {
                // Parse owner/repo from htmlUrl or use stored values
                let owner = exec.owner;
                let repo = exec.repo;

                if (!owner || !repo) {
                    const match = exec.htmlUrl?.match(/github\.com\/([^/]+)\/([^/]+)/);
                    if (match) {
                        owner = match[1];
                        repo = match[2];
                    }
                }

                if (!owner || !repo) {
                    console.log(`[VeroIDE] Cannot sync execution ${exec.id} - no owner/repo`);
                    continue;
                }

                try {
                    let runId = exec.runId;

                    // If runId is 0, try to find the run by runNumber or time window
                    if (!runId || runId === 0) {
                        console.log(`[VeroIDE] Execution ${exec.id} has runId=0, fetching runs list...`);
                        const runsResp = await fetch(`/api/github/runs?owner=${owner}&repo=${repo}&limit=10`);
                        const runsData = await runsResp.json();

                        if (runsData.success && runsData.data) {
                            // Try to match by runNumber first
                            if (exec.runNumber && exec.runNumber > 0) {
                                const match = runsData.data.find((r: any) => r.runNumber === exec.runNumber);
                                if (match) {
                                    runId = match.id;
                                    console.log(`[VeroIDE] Found run by runNumber: ${runId}`);
                                }
                            }

                            // Or match by trigger time
                            if (!runId) {
                                const triggerTime = new Date(exec.triggeredAt).getTime();
                                const match = runsData.data.find((r: any) => {
                                    const createdAt = new Date(r.createdAt).getTime();
                                    return Math.abs(createdAt - triggerTime) < 120000; // 2 min window
                                });
                                if (match) {
                                    runId = match.id;
                                    console.log(`[VeroIDE] Found run by time window: ${runId}`);
                                }
                            }
                        }
                    }

                    if (!runId || runId === 0) {
                        console.log(`[VeroIDE] Could not find runId for execution ${exec.id}`);
                        continue;
                    }

                    console.log(`[VeroIDE] Checking status for run ${runId}`);
                    const response = await fetch(`/api/github/runs/${runId}?owner=${owner}&repo=${repo}`);
                    const data = await response.json();

                    if (data.success && data.data) {
                        const run = data.data;
                        console.log(`[VeroIDE] Run ${runId} actual status: ${run.status}/${run.conclusion}`);

                        // Update the execution with current status and runId
                        useGitHubExecutionStore.getState().updateExecution(exec.id, {
                            runId: runId,
                            runNumber: run.runNumber,
                            status: run.status,
                            conclusion: run.conclusion,
                            owner,
                            repo,
                        });

                        // If completed, also fetch jobs
                        if (run.status === 'completed') {
                            try {
                                const jobsResp = await fetch(`/api/github/runs/${runId}/jobs?owner=${owner}&repo=${repo}`);
                                const jobsData = await jobsResp.json();
                                if (jobsData.success && jobsData.data) {
                                    useGitHubExecutionStore.getState().updateExecution(exec.id, {
                                        jobs: jobsData.data.map((j: any) => ({
                                            id: j.id, name: j.name, status: j.status, conclusion: j.conclusion,
                                        })),
                                    });
                                }
                            } catch (e) { /* ignore */ }
                        } else {
                            // Still in progress - resume polling
                            pollGitHubRunStatus(exec.id, owner, repo, new Date(exec.triggeredAt).getTime());
                        }
                    }
                } catch (error) {
                    console.error(`[VeroIDE] Failed to sync execution ${exec.id}:`, error);
                }
            }
        };

        syncStuckExecutions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount

    const [executionConfig, setExecutionConfig] = useState<ExecutionConfig>(() => {
        // Load from localStorage or use defaults
        const saved = localStorage.getItem('vero-execution-config');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge with defaults to handle newly added fields
                return {
                    browserMode: 'headed',
                    environment: 'Local',
                    target: 'local',
                    browser: 'chromium',
                    viewport: { width: 1280, height: 720 },
                    slowMo: 0,
                    screenshotOnFailure: true,
                    recordVideo: false,
                    workers: 1,
                    timeout: 30000,
                    retries: 0,
                    pauseOnFailure: false,
                    ...parsed
                };
            } catch {
                // ignore
            }
        }
        return {
            browserMode: 'headed',
            environment: 'Local',
            target: 'local',
            browser: 'chromium',
            viewport: { width: 1280, height: 720 },
            slowMo: 0,
            screenshotOnFailure: true,
            recordVideo: false,
            workers: 1,
            timeout: 30000,
            retries: 0,
            pauseOnFailure: false
        };
    });

    // Save config to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('vero-execution-config', JSON.stringify(executionConfig));
    }, [executionConfig]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setShowRunDropdown(false);
            setShowEnvDropdown(false);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const wsRef = useRef<WebSocket | null>(null);

    // Load test data schema on mount
    // Note: File tree is loaded per-project when application changes (see currentProject effect)
    useEffect(() => {
        loadTestDataSchema();
    }, []);

    // Load GitHub integration status on mount
    useEffect(() => {
        loadGitHubIntegration();
    }, [loadGitHubIntegration]);

    // Load test data schema for autocomplete
    const loadTestDataSchema = async () => {
        try {
            // Get projectId from localStorage or use demo project
            const projectId = localStorage.getItem('currentProjectId') || 'demo-project-001';
            const response = await fetch(`/api/test-data/schema?projectId=${encodeURIComponent(projectId)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.schema) {
                    updateTestDataRegistry(data.schema);
                    console.log('[VeroIDE] Loaded test data schema:', data.schema.length, 'sheets');
                }
            }
        } catch (error) {
            console.error('Failed to load test data schema:', error);
        }
    };

    const loadFileTree = async () => {
        try {
            // Pass project ID so backend knows which project's files to load
            const projectId = currentProject?.id;
            const url = projectId ? `/api/vero/files?projectId=${projectId}` : '/api/vero/files';
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setFiles(data.files || []);
                console.log('[VeroIDE] Loaded file tree for project:', projectId, data.files?.length, 'items');
            } else {
                // Fallback: show example structure for empty projects
                setFiles([
                    {
                        name: 'pages',
                        path: 'pages',
                        type: 'directory',
                        children: [
                            { name: 'ExamplePage.vero', path: 'pages/ExamplePage.vero', type: 'file' },
                        ],
                    },
                    {
                        name: 'features',
                        path: 'features',
                        type: 'directory',
                        children: [
                            { name: 'Example.vero', path: 'features/Example.vero', type: 'file' },
                        ],
                    },
                ]);
            }
        } catch (error) {
            console.error('Failed to load file tree:', error);
        }
    };

    // Load file tree for a specific inner project (using its veroPath)
    const loadInnerProjectFiles = async (innerProjectId: string, veroPath: string) => {
        try {
            // Use the inner project's veroPath to load its specific files
            const url = `/api/vero/files?veroPath=${encodeURIComponent(veroPath)}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setProjectFiles(prev => ({
                    ...prev,
                    [innerProjectId]: data.files || []
                }));
                console.log('[VeroIDE] Loaded file tree for inner project:', innerProjectId, data.files?.length, 'items');
            } else {
                // Fallback: show example structure
                const defaultFiles: FileNode[] = [
                    {
                        name: 'pages',
                        path: 'pages',
                        type: 'directory',
                        children: [
                            { name: 'example.vero', path: 'pages/example.vero', type: 'file' },
                        ],
                    },
                    {
                        name: 'features',
                        path: 'features',
                        type: 'directory',
                        children: [
                            { name: 'example.vero', path: 'features/example.vero', type: 'file' },
                        ],
                    },
                ];
                setProjectFiles(prev => ({
                    ...prev,
                    [innerProjectId]: defaultFiles
                }));
            }
        } catch (error) {
            console.error('Failed to load inner project files:', error);
        }
    };

    const loadFile = async (path: string) => {
        try {
            const projectId = currentProject?.id;
            const url = projectId
                ? `/api/vero/files/${encodeURIComponent(path)}?projectId=${projectId}`
                : `/api/vero/files/${encodeURIComponent(path)}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setFileContent(data.content);
                setSelectedFile(path);
                setIsDirty(false);
                // Update page registry for autocomplete
                updatePageRegistry(data.content, path);
            } else {
                // API returned error - show file-specific placeholder
                const fileName = path.split('/').pop()?.replace('.vero', '') || 'Unknown';
                const isPage = path.includes('pages/');
                const template = isPage
                    ? `# ${fileName}\n\npage ${fileName} {\n    field exampleField = testId "example"\n    \n    exampleAction {\n        click exampleField\n    }\n}\n`
                    : `# ${fileName}\n\nfeature ${fileName} {\n    use ExamplePage\n    \n    scenario "Sample test" @smoke {\n        open "https://example.com"\n        verify "Example Domain" is visible\n    }\n}\n`;
                setFileContent(template);
                setSelectedFile(path);
                setIsDirty(false);
                console.warn(`File not found: ${path}, showing template`);
            }
        } catch (error) {
            console.error('Failed to load file:', error);
            // Network error - show minimal placeholder
            setFileContent(`# Error loading ${path}\n# Please check the backend connection\n`);
            setSelectedFile(path);
            setIsDirty(false);
        }
    };

    const saveFile = async () => {
        if (!selectedFile) return;

        try {
            const projectId = currentProject?.id;
            const url = projectId
                ? `/api/vero/files/${encodeURIComponent(selectedFile)}?projectId=${projectId}`
                : `/api/vero/files/${encodeURIComponent(selectedFile)}`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: fileContent }),
            });

            if (response.ok) {
                setIsDirty(false);
                addConsoleOutput('✓ File saved');
            }
        } catch (error) {
            console.error('Failed to save file:', error);
            addConsoleOutput('✗ Failed to save file');
        }
    };

    // Handle URL params from Scenario Dashboard navigation
    useEffect(() => {
        if (urlFile) {
            const lineNumber = urlLine ? parseInt(urlLine, 10) : undefined;

            // Load the file
            loadFile(urlFile).then(() => {
                // Clear URL params after loading
                setSearchParams((prev) => {
                    prev.delete('file');
                    prev.delete('line');
                    return prev;
                });

                // Scroll to line after a short delay for editor to mount
                if (lineNumber && veroEditorRef.current) {
                    setTimeout(() => {
                        veroEditorRef.current?.goToLine(lineNumber);
                    }, 100);
                }
            });
        }
    }, [urlFile, urlLine]);

    // Navigate to Scenario Dashboard
    const handleOpenScenarioDashboard = () => {
        const params = new URLSearchParams();
        if (currentProject?.id) params.set('projectId', currentProject.id);
        // veroPath may exist on some project types
        const veroPath = (currentProject as any)?.veroPath;
        if (veroPath) params.set('veroPath', veroPath);
        navigate(`/scenarios?${params}`);
    };

    const handleCodeChange = (value: string) => {
        setFileContent(value);
        setIsDirty(true);
        // Update page registry on each change for live autocomplete
        updatePageRegistry(value, selectedFile || undefined);
    };

    const addConsoleOutput = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setConsoleOutput(prev => [...prev, `[${timestamp}] ${message}`]);
    };

    // Recording controls
    const handleRecordClick = () => {
        // Show dialog to enter scenario name and URL
        setRecordingScenarioName('');
        setRecordingStartUrl('https://example.com');
        setRecordedActions([]);
        setShowRecordingDialog(true);
    };

    const startRecording = async () => {
        if (!recordingScenarioName.trim()) {
            addConsoleOutput('✗ Please enter a scenario name');
            return;
        }

        setShowRecordingDialog(false);

        try {
            const response = await fetch('/api/vero/recording/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: recordingStartUrl }),
            });

            if (response.ok) {
                const data = await response.json();
                setIsRecording(true);
                setIsPaused(false);
                setRecordedActions([]);
                setRecordingSessionId(data.sessionId);
                addConsoleOutput(`🔴 Recording scenario: "${recordingScenarioName}"`);
                addConsoleOutput(`📍 Starting at: ${recordingStartUrl}`);
                addConsoleOutput('📌 Perform actions in the browser, then close it when done.');
            }
        } catch (error) {
            console.error('Failed to start recording:', error);
            addConsoleOutput('✗ Failed to start recording');
        }
    };

    const pauseRecording = () => {
        setIsPaused(!isPaused);
        addConsoleOutput(isPaused ? '▶ Recording resumed' : '⏸ Recording paused');
    };

    const stopRecording = async () => {
        try {
            // Stop recording and get the generated code from backend
            const response = await fetch('/api/vero/recording/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: recordingSessionId }),
            });

            setIsRecording(false);
            setIsPaused(false);
            setRecordingSessionId(null);

            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }

            const data = await response.json();
            const veroCode = data.code || '';

            // Generate scenario code from the backend-converted Vero actions
            if (veroCode && recordingScenarioName) {
                const scenarioCode = `\n    scenario "${recordingScenarioName}" @recorded {\n        open "${recordingStartUrl}"\n${veroCode}\n    }\n`;

                // Check if current file is a feature file and insert scenario
                if (fileContent.includes('feature ')) {
                    // Find the last closing brace of the feature and insert before it
                    const lastBraceIndex = fileContent.lastIndexOf('}');
                    if (lastBraceIndex > 0) {
                        const newContent =
                            fileContent.slice(0, lastBraceIndex) +
                            scenarioCode +
                            fileContent.slice(lastBraceIndex);
                        setFileContent(newContent);
                        setIsDirty(true);
                        const actionCount = veroCode.split('\n').filter((l: string) => l.trim()).length;
                        addConsoleOutput(`⏹ Recording stopped - added scenario "${recordingScenarioName}" with ${actionCount} actions`);
                    }
                } else {
                    // Not a feature file - append as standalone scenario
                    setFileContent(prev => prev + '\n' + scenarioCode);
                    setIsDirty(true);
                    const actionCount = veroCode.split('\n').filter((l: string) => l.trim()).length;
                    addConsoleOutput(`⏹ Recording stopped - created scenario with ${actionCount} actions`);
                }
            } else {
                addConsoleOutput('⏹ Recording stopped - no actions recorded');
            }
        } catch (error) {
            console.error('Failed to stop recording:', error);
            addConsoleOutput('✗ Failed to stop recording');
        }
    };

    // ========== EMBEDDED RECORDING (Split-screen with browser canvas) ==========

    // Handle + button click - creates empty scenario
    const handleAddScenario = () => {
        setRecordingScenarioName('');
        setRecordingStartUrl('https://example.com');
        setShowRecordingDialog(true);
    };

    // Create empty scenario and prepare for recording
    const createEmptyScenario = () => {
        if (!recordingScenarioName.trim()) {
            addConsoleOutput('✗ Please enter a scenario name');
            return;
        }

        setShowRecordingDialog(false);

        // Create empty scenario with recording placeholder
        const emptyScenario = `\n    scenario "${recordingScenarioName}" {\n        # Click Record to start capturing actions\n    }\n`;

        // Insert into feature file
        if (fileContent.includes('feature ')) {
            const lastBraceIndex = fileContent.lastIndexOf('}');
            if (lastBraceIndex > 0) {
                const newContent =
                    fileContent.slice(0, lastBraceIndex) +
                    emptyScenario +
                    fileContent.slice(lastBraceIndex);
                setFileContent(newContent);
                setIsDirty(true);
            }
        } else {
            setFileContent(prev => prev + '\n' + emptyScenario);
            setIsDirty(true);
        }

        addConsoleOutput(`✓ Created empty scenario "${recordingScenarioName}"`);

        // Automatically start recording after creating scenario
        // Pass the scenario name directly to avoid state timing issues
        startEmbeddedRecording(recordingScenarioName);
    };

    // Start embedded recording with browser iframe
    const startEmbeddedRecording = async (scenarioNameOverride?: string) => {
        const scenarioName = scenarioNameOverride || activeRecordingScenario;
        if (!scenarioName) {
            addConsoleOutput('✗ Please create a scenario first');
            return;
        }

        const sessionId = `vero-embedded-${Date.now()}`;
        setRecordingSessionId(sessionId);
        setIsEmbeddedRecording(true);
        setIsRecording(true);

        // Set both state and ref for the scenario name
        // The ref is used in callbacks for immediate access
        if (scenarioNameOverride) {
            setActiveRecordingScenario(scenarioNameOverride);
            activeRecordingScenarioRef.current = scenarioNameOverride;
        } else {
            activeRecordingScenarioRef.current = activeRecordingScenario;
        }

        addConsoleOutput(`🔴 Starting Playwright codegen for "${scenarioName}"...`);

        // Connect using Socket.IO for action processing
        const socket = io('http://localhost:3000', {
            transports: ['websocket'],
            auth: { token: localStorage.getItem('token') || '' }
        });

        recordingSocketRef.current = socket;

        socket.on('connect', () => {
            addConsoleOutput('✓ Connected to recording server');
            // Start Playwright codegen - this launches real browser
            socket.emit('recording:codegen:start', {
                url: recordingStartUrl,
                sessionId,
                scenarioName: scenarioName
            });
        });

        socket.on('recording:codegen:ready', () => {
            addConsoleOutput(`🔴 Playwright Codegen launched!`);
            addConsoleOutput(`💡 Interact with the browser to record actions`);
            addConsoleOutput(`📝 Vero code will appear here automatically`);
            addConsoleOutput(`ℹ️  Note: The Playwright inspector shows TypeScript - that's normal`);
        });

        // Handle real-time action updates
        socket.on('recording:action', (data: { sessionId: string; veroCode: string; newPagePath?: string; newPageCode?: string }) => {
            console.log('[VeroIDE] Received recording:action', data);
            if (data.sessionId === sessionId) {
                console.log(`[VeroIDE] Inserting action: ${data.veroCode}`);
                insertActionIntoScenario(data.veroCode);
                addConsoleOutput(`📝 ${data.veroCode}`);
            } else {
                console.log(`[VeroIDE] Session mismatch: expected ${sessionId}, got ${data.sessionId}`);
            }
        });

        // Handle page object updates (new field created)
        socket.on('recording:page-updated', (data: { sessionId: string; pageName: string; fieldName: string; filePath: string; pageContent?: string }) => {
            if (data.sessionId === sessionId) {
                // If the page file is currently open in the editor, refresh it
                const pageFileName = data.filePath.split('/').pop();
                if (selectedFile && selectedFile.includes(data.pageName)) {
                    // Reload the page content
                    if (data.pageContent) {
                        setFileContent(data.pageContent);
                        addConsoleOutput(`🔄 Updated ${pageFileName} in editor`);
                    }
                }
                // Reload the file tree to show new/updated pages
                loadFileTree();
            }
        });

        // Handle field creation notifications
        socket.on('recording:field-created', (data: { sessionId: string; pageName: string; fieldName: string }) => {
            if (data.sessionId === sessionId) {
                addConsoleOutput(`✨ Created field "${data.fieldName}" in ${data.pageName}`);
            }
        });

        // Handle debug info from click dispatch
        socket.on('recording:debug', (data: { sessionId: string; message: string; elementInfo?: any; urlAfter?: string }) => {
            if (data.sessionId === sessionId) {
                console.log('[Recording Debug]', data);
                // Show what element was clicked
                if (data.elementInfo) {
                    const el = data.elementInfo;
                    addConsoleOutput(`🔍 Clicked: <${el.tag}>${el.text ? ` "${el.text.slice(0, 30)}"` : ''}${el.href ? ` → ${el.href}` : ''}`);
                }
            }
        });

        // Handle errors
        socket.on('recording:error', (data: { sessionId: string; error: string }) => {
            if (data.sessionId === sessionId) {
                // Check if browser was closed by user
                if (data.error === 'Browser closed') {
                    addConsoleOutput('⏹ Browser closed - recording stopped');
                } else {
                    addConsoleOutput(`✗ ${data.error}`);
                }

                // Check if it's a session expiration or browser closed error
                if (data.error.includes('expired') || data.error.includes('not found') || data.error === 'Browser closed') {
                    setIsEmbeddedRecording(false);
                    setIsRecording(false);
                    setRecordingSessionId(null);
                    setActiveRecordingScenario(null);
                    socket.disconnect();
                    recordingSocketRef.current = null;
                }
            }
        });

        socket.on('recording:embedded:complete', (data: { sessionId: string; code: string }) => {
            addConsoleOutput('⏹ Recording completed');
        });

        socket.on('connect_error', (error) => {
            addConsoleOutput(`✗ Connection error: ${error.message}`);
        });

        // Handle socket disconnect - server restart or network issue
        socket.on('disconnect', (reason) => {
            addConsoleOutput(`⚠️ Connection lost: ${reason}`);
            addConsoleOutput('Recording stopped. Please start a new recording session.');

            // Clean up recording state
            setIsEmbeddedRecording(false);
            setIsRecording(false);
            setRecordingSessionId(null);
            setActiveRecordingScenario(null);
            recordingSocketRef.current = null;
        });
    };

    // Render frame to canvas
    const renderFrameToCanvas = (base64Frame: string) => {
        const canvas = browserCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = `data:image/jpeg;base64,${base64Frame}`;
    };

    // Insert action into the active scenario
    const insertActionIntoScenario = (veroCode: string) => {
        // Use the ref for immediate access (state might not be updated yet)
        const scenarioName = activeRecordingScenarioRef.current || activeRecordingScenario;
        if (!scenarioName) {
            console.log('[VeroIDE] insertActionIntoScenario: No active scenario');
            return;
        }

        console.log(`[VeroIDE] Inserting action into scenario "${scenarioName}": ${veroCode}`);

        // Use callback form of setFileContent to get the latest state
        // This prevents race conditions when multiple actions arrive quickly
        setFileContent(prevContent => {
            // Find the scenario's closing brace and insert before it
            const scenarioStartPattern = new RegExp(
                `(scenario\\s+"${scenarioName}"\\s*\\{)`,
                'g'
            );

            // Find where the scenario starts
            const match = scenarioStartPattern.exec(prevContent);
            if (!match) return prevContent;

            const scenarioStart = match.index + match[0].length;

            // Find the matching closing brace (accounting for nested braces)
            let braceCount = 1;
            let closingBraceIndex = -1;
            for (let i = scenarioStart; i < prevContent.length; i++) {
                if (prevContent[i] === '{') braceCount++;
                if (prevContent[i] === '}') braceCount--;
                if (braceCount === 0) {
                    closingBraceIndex = i;
                    break;
                }
            }

            if (closingBraceIndex === -1) return prevContent;

            // Get content before and after the closing brace
            let beforeBrace = prevContent.substring(0, closingBraceIndex);
            const afterBrace = prevContent.substring(closingBraceIndex);

            // Remove placeholder comment if it exists (only on first action)
            beforeBrace = beforeBrace.replace(/\s*#\s*Click Record to start capturing actions\s*\n?/, '');

            // Check if we need a newline before the action
            const needsNewline = !beforeBrace.endsWith('\n');

            return beforeBrace + (needsNewline ? '\n' : '') + `        ${veroCode}\n    ` + afterBrace;
        });

        setIsDirty(true);
    };

    // Stop embedded recording
    const stopEmbeddedRecording = () => {
        if (recordingSocketRef.current) {
            // Stop codegen recording
            recordingSocketRef.current.emit('recording:codegen:stop', {
                sessionId: recordingSessionId
            });
            recordingSocketRef.current.disconnect();
            recordingSocketRef.current = null;
        }

        setIsEmbeddedRecording(false);
        setIsRecording(false);
        setRecordingSessionId(null);
        setActiveRecordingScenario(null);
        activeRecordingScenarioRef.current = null;
        addConsoleOutput('⏹ Recording stopped');
    };

    // Handle canvas click - pass to browser
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = browserCanvasRef.current;
        if (!canvas || !recordingSocketRef.current || !recordingSessionId) {
            console.log('[VeroIDE] Canvas click ignored - no socket or session');
            return;
        }

        // Focus canvas for keyboard input
        canvas.focus();

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (1280 / rect.width);
        const y = (e.clientY - rect.top) * (720 / rect.height);

        console.log(`[VeroIDE] Sending click at (${Math.round(x)}, ${Math.round(y)}) to session ${recordingSessionId}`);

        recordingSocketRef.current.emit('recording:input:click', {
            sessionId: recordingSessionId,
            x: Math.round(x),
            y: Math.round(y)
        });
    };

    // Handle canvas mouse move - pass to browser for hover states
    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = browserCanvasRef.current;
        if (!canvas || !recordingSocketRef.current || !recordingSessionId) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (1280 / rect.width);
        const y = (e.clientY - rect.top) * (720 / rect.height);

        // Throttle mouse move events
        recordingSocketRef.current.emit('recording:input:move', {
            sessionId: recordingSessionId,
            x: Math.round(x),
            y: Math.round(y)
        });
    };

    // Handle canvas keyboard input - pass to browser
    const handleCanvasKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
        if (!recordingSocketRef.current) return;

        // Prevent default browser actions for certain keys
        if (['Tab', 'Enter', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        }

        // Send key to browser
        recordingSocketRef.current.emit('recording:input:type', {
            sessionId: recordingSessionId,
            text: e.key === 'Enter' ? '\n' : (e.key.length === 1 ? e.key : ''),
            key: e.key
        });
    };

    // Handle canvas scroll - pass to browser for scrolling
    const handleCanvasScroll = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!recordingSocketRef.current || !recordingSessionId) return;

        const canvas = browserCanvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (1280 / rect.width);
        const y = (e.clientY - rect.top) * (720 / rect.height);

        recordingSocketRef.current.emit('recording:input:scroll', {
            sessionId: recordingSessionId,
            x: Math.round(x),
            y: Math.round(y),
            deltaX: e.deltaX,
            deltaY: e.deltaY
        });
    };

    const connectRecordingWebSocket = (sessionId: string) => {
        const ws = new WebSocket(`ws://localhost:3000/recording/${sessionId}`);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'action' && !isPaused) {
                // Convert and collect action
                const veroCode = convertToVero(data.action);
                setRecordedActions(prev => [...prev, veroCode]);
                addConsoleOutput(`📝 ${veroCode}`);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            addConsoleOutput('✗ Recording connection error');
        };

        wsRef.current = ws;
    };

    // Convert Playwright action to Vero DSL
    const convertToVero = (action: any): string => {
        switch (action.type) {
            case 'click':
                return `click "${action.selector}"`;
            case 'fill':
                return `fill "${action.selector}" with "${action.value}"`;
            case 'navigate':
                return `open "${action.url}"`;
            case 'check':
                return `check "${action.selector}"`;
            case 'select':
                return `select "${action.value}" from "${action.selector}"`;
            default:
                return `# Unknown action: ${action.type}`;
        }
    };

    // Run current file in browser
    const [isRunning, setIsRunning] = useState(false);

    // Debug mode state
    const [isDebugging, setIsDebugging] = useState(false);
    const [debugPaused, setDebugPaused] = useState(false);
    const [debugCurrentLine, setDebugCurrentLine] = useState<number | null>(null);
    const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
    const [debugLogs, setDebugLogs] = useState<Array<{ timestamp: Date; message: string; type: 'step' | 'info' | 'error' }>>([]);
    const debugSocketRef = useRef<Socket | null>(null);
    const debugExecutionIdRef = useRef<string | null>(null);

    // Toggle breakpoint handler
    const toggleBreakpoint = useCallback((line: number) => {
        setBreakpoints(prev => {
            const next = new Set(prev);
            if (next.has(line)) {
                next.delete(line);
            } else {
                next.add(line);
            }
            return next;
        });
    }, []);

    // Add debug log
    const addDebugLog = useCallback((message: string, type: 'step' | 'info' | 'error' = 'info') => {
        setDebugLogs(prev => [...prev, { timestamp: new Date(), message, type }]);
    }, []);

    // Run in debug mode
    const runDebug = async () => {
        if (!selectedFile || isRunning || isDebugging) return;

        // Save file first if dirty
        if (isDirty) {
            await saveFile();
        }

        setIsDebugging(true);
        setDebugPaused(false);
        setDebugCurrentLine(null);
        setDebugLogs([]);
        addDebugLog('Starting debug session...', 'info');

        try {
            // Call debug endpoint
            const response = await fetch('/api/vero/debug', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filePath: selectedFile,
                    content: fileContent,
                    breakpoints: Array.from(breakpoints),
                }),
            });

            const data = await response.json();
            if (!data.success) {
                addDebugLog(`Error: ${data.error}`, 'error');
                setIsDebugging(false);
                return;
            }

            debugExecutionIdRef.current = data.executionId;
            addDebugLog(`Debug session started: ${data.executionId}`, 'info');

            // Connect WebSocket for debug events
            const socket = io('http://localhost:3000', {
                transports: ['websocket'],
                auth: { token: localStorage.getItem('token') || '' }
            });

            debugSocketRef.current = socket;

            socket.on('connect', () => {
                addDebugLog('Connected to debug server', 'info');
                // Start the debug execution
                socket.emit('debug:start', {
                    executionId: data.executionId,
                    testFlowId: data.testFlowId,
                    code: data.generatedCode,
                    breakpoints: Array.from(breakpoints),
                });
            });

            socket.on('debug:step:before', (event: { line: number; action: string; target?: string }) => {
                setDebugCurrentLine(event.line);
                addDebugLog(`[Line ${event.line}] ${event.action}${event.target ? ` "${event.target}"` : ''}`, 'step');
            });

            socket.on('debug:step:after', (event: { line: number; action: string; success: boolean; duration?: number }) => {
                const status = event.success ? '✓' : '✗';
                const durationStr = event.duration ? ` (${event.duration}ms)` : '';
                addDebugLog(`${status} Line ${event.line} completed${durationStr}`, event.success ? 'step' : 'error');
            });

            socket.on('debug:paused', (event: { line: number }) => {
                setDebugPaused(true);
                setDebugCurrentLine(event.line);
                addDebugLog(`⏸ Paused at line ${event.line}`, 'info');
            });

            socket.on('debug:resumed', () => {
                setDebugPaused(false);
                addDebugLog('▶ Resumed execution', 'info');
            });

            socket.on('debug:complete', (event: { exitCode: number; duration: number }) => {
                const status = event.exitCode === 0 ? '✓ Passed' : '✗ Failed';
                addDebugLog(`${status} - completed in ${event.duration}ms`, event.exitCode === 0 ? 'info' : 'error');
                setIsDebugging(false);
                setDebugPaused(false);
                setDebugCurrentLine(null);
                socket.disconnect();
            });

            socket.on('debug:stopped', () => {
                addDebugLog('⏹ Debug session stopped', 'info');
                setIsDebugging(false);
                setDebugPaused(false);
                setDebugCurrentLine(null);
                socket.disconnect();
            });

            socket.on('disconnect', () => {
                if (isDebugging) {
                    addDebugLog('Disconnected from debug server', 'error');
                }
            });

        } catch (error) {
            addDebugLog(`Error: ${error}`, 'error');
            setIsDebugging(false);
        }
    };

    // Debug control functions
    const debugResume = useCallback(() => {
        if (debugSocketRef.current && debugExecutionIdRef.current) {
            debugSocketRef.current.emit('debug:resume', { executionId: debugExecutionIdRef.current });
        }
    }, []);

    const debugStepOver = useCallback(() => {
        if (debugSocketRef.current && debugExecutionIdRef.current) {
            debugSocketRef.current.emit('debug:step-over', { executionId: debugExecutionIdRef.current });
        }
    }, []);

    const debugStop = useCallback(() => {
        if (debugSocketRef.current && debugExecutionIdRef.current) {
            debugSocketRef.current.emit('debug:stop', { executionId: debugExecutionIdRef.current });
        }
    }, []);

    const runCurrentFile = async (scenarioName?: string) => {
        if (!selectedFile || isRunning) return;

        // Save file first if dirty
        if (isDirty) {
            await saveFile();
        }

        setIsRunning(true);
        const modeLabel = executionConfig.browserMode === 'headed' ? '👁️ Headed' : '⚡ Headless';
        addConsoleOutput(`▶ Running: ${selectedFile.split('/').pop()} (${modeLabel}, ${executionConfig.workers} worker${executionConfig.workers > 1 ? 's' : ''})`);

        try {
            const response = await fetch('/api/vero/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filePath: selectedFile,
                    content: fileContent,
                    config: executionConfig,
                    scenarioName  // Filter to specific scenario if provided
                }),
            });

            const data = await response.json();

            if (data.success) {
                if (data.status === 'passed') {
                    addConsoleOutput(`✓ Test passed!`);
                } else if (data.status === 'failed') {
                    addConsoleOutput(`✗ Test failed: ${data.error || 'Unknown error'}`);
                } else if (data.status === 'timeout') {
                    addConsoleOutput(`⏱ Test timed out`);
                }

                // Show output if any
                if (data.output) {
                    const lines = data.output.split('\n').filter((l: string) => l.trim());
                    lines.forEach((line: string) => addConsoleOutput(`  ${line}`));
                }
            } else {
                addConsoleOutput(`✗ Error: ${data.error}`);
            }
        } catch (error) {
            addConsoleOutput(`✗ Failed to run: ${error}`);
        } finally {
            setIsRunning(false);
        }
    };

    // Legacy run handlers (kept for compatibility)
    const handleRunScenario = async (scenarioName: string) => {
        addConsoleOutput(`▶ Running scenario: ${scenarioName}`);
        await runCurrentFile(scenarioName);
    };

    const handleRunFeature = async (featureName: string) => {
        addConsoleOutput(`▶ Running feature: ${featureName}`);
        await runCurrentFile();
    };

    // GitHub Execution Store
    const { addExecution, updateExecution, startPolling, stopPolling } = useGitHubExecutionStore();

    // Poll GitHub run status - tracks specific run once found
    const pollGitHubRunStatus = async (
        executionId: string,
        owner: string,
        repo: string,
        triggerTime: number, // When we triggered the workflow
        interval = 5000
    ) => {
        console.log(`[GitHub Poll] Starting polling for ${executionId}, owner=${owner}, repo=${repo}`);

        // Note: Backend uses the stored GitHub integration token for API calls
        // No user auth_token required for polling
        const headers: Record<string, string> = {};

        startPolling(executionId);
        let pollCount = 0;
        const maxPolls = 360; // 30 minutes max
        let trackedRunId: number | null = null;

        const poll = async () => {
            pollCount++;

            try {
                // If we have a tracked run ID, poll that specific run
                if (trackedRunId) {
                    console.log(`[GitHub Poll #${pollCount}] Checking run ${trackedRunId}`);
                    // Add timestamp to prevent caching
                    const runResponse = await fetch(`/api/github/runs/${trackedRunId}?owner=${owner}&repo=${repo}&_t=${Date.now()}`, { headers });
                    const runData = await runResponse.json();

                    if (runData.success && runData.data) {
                        const run = runData.data;
                        console.log(`[GitHub Poll] Run #${run.runNumber}: ${run.status} / ${run.conclusion}`, run);

                        updateExecution(executionId, {
                            status: run.status,
                            conclusion: run.conclusion,
                        });

                        if (run.status === 'completed') {
                            stopPolling(executionId);
                            addConsoleOutput(`✓ Run #${run.runNumber} completed: ${run.conclusion}`);

                            // Fetch final jobs status
                            try {
                                const jobsResp = await fetch(`/api/github/runs/${trackedRunId}/jobs?owner=${owner}&repo=${repo}`, { headers });
                                const jobsData = await jobsResp.json();
                                if (jobsData.success && jobsData.data) {
                                    updateExecution(executionId, {
                                        jobs: jobsData.data.map((j: any) => ({
                                            id: j.id, name: j.name, status: j.status, conclusion: j.conclusion,
                                        })),
                                    });
                                }
                            } catch (e) { /* ignore */ }

                            updateExecution(executionId, {
                                duration: new Date(run.updatedAt).getTime() - new Date(run.createdAt).getTime(),
                            });
                            fetchGitHubArtifacts(executionId, owner, repo, trackedRunId);
                            return;
                        }
                    }

                    if (pollCount < maxPolls) setTimeout(poll, interval);
                    return;
                }

                // Find our run from the list
                console.log(`[GitHub Poll #${pollCount}] Searching for our run (triggered at ${new Date(triggerTime).toISOString()})`);
                const runsResponse = await fetch(`/api/github/runs?owner=${owner}&repo=${repo}&limit=10`, { headers });
                const runsData = await runsResponse.json();

                if (!runsData.success || !runsData.data?.length) {
                    console.log('[GitHub Poll] No runs yet...');
                    if (pollCount < maxPolls) setTimeout(poll, interval);
                    return;
                }

                // Find run created after our trigger (within 2 min window)
                const ourRun = runsData.data.find((r: any) => {
                    const createdAt = new Date(r.createdAt).getTime();
                    return r.event === 'workflow_dispatch' &&
                        createdAt >= triggerTime - 10000 &&
                        createdAt <= triggerTime + 120000;
                });

                if (!ourRun) {
                    // Fall back to most recent workflow_dispatch
                    const latestDispatch = runsData.data.find((r: any) => r.event === 'workflow_dispatch');
                    if (latestDispatch) {
                        console.log(`[GitHub Poll] Using latest dispatch run #${latestDispatch.runNumber}`);
                        trackedRunId = latestDispatch.id;
                        updateExecution(executionId, {
                            runId: latestDispatch.id,
                            runNumber: latestDispatch.runNumber,
                            status: latestDispatch.status,
                            conclusion: latestDispatch.conclusion,
                            htmlUrl: latestDispatch.htmlUrl,
                        });
                    } else {
                        console.log('[GitHub Poll] No workflow_dispatch runs found');
                    }
                    if (pollCount < maxPolls) setTimeout(poll, interval);
                    return;
                }

                console.log(`[GitHub Poll] Found our run #${ourRun.runNumber}, locking onto it`);
                trackedRunId = ourRun.id;

                updateExecution(executionId, {
                    runId: ourRun.id,
                    runNumber: ourRun.runNumber,
                    status: ourRun.status,
                    conclusion: ourRun.conclusion,
                    startedAt: ourRun.createdAt,
                    htmlUrl: ourRun.htmlUrl,
                });

                // Fetch jobs
                try {
                    const jobsResp = await fetch(`/api/github/runs/${ourRun.id}/jobs?owner=${owner}&repo=${repo}`, { headers });
                    const jobsData = await jobsResp.json();
                    if (jobsData.success && jobsData.data) {
                        updateExecution(executionId, {
                            jobs: jobsData.data.map((j: any) => ({
                                id: j.id, name: j.name, status: j.status, conclusion: j.conclusion,
                            })),
                        });
                    }
                } catch (e) { /* ignore */ }

                if (ourRun.status === 'completed') {
                    stopPolling(executionId);
                    addConsoleOutput(`✓ Run #${ourRun.runNumber} completed: ${ourRun.conclusion}`);
                    fetchGitHubArtifacts(executionId, owner, repo, ourRun.id);
                    return;
                }

                if (pollCount < maxPolls) setTimeout(poll, interval);
            } catch (error) {
                console.error('[GitHub Poll] Error:', error);
                if (pollCount < maxPolls) setTimeout(poll, interval * 2);
            }
        };

        setTimeout(poll, 5000);
    };

    // Fetch artifacts and parse report after completion
    const fetchGitHubArtifacts = async (
        executionId: string,
        owner: string,
        repo: string,
        runId: number
    ) => {
        // Get auth token for API calls
        const authToken = localStorage.getItem('auth_token');
        const headers: Record<string, string> = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

        try {
            // First, list artifacts
            const artifactsResponse = await fetch(`/api/github/runs/${runId}/artifacts?owner=${owner}&repo=${repo}`, { headers });
            const artifactsData = await artifactsResponse.json();

            if (artifactsData.success && artifactsData.data?.length) {
                addConsoleOutput(`  Found ${artifactsData.data.length} artifact(s)`);

                // Look for playwright report artifact
                const reportArtifact = artifactsData.data.find((a: { name: string }) =>
                    a.name.includes('playwright-report') || a.name.includes('test-results')
                );

                if (reportArtifact) {
                    updateExecution(executionId, {
                        htmlReportUrl: `/api/github/artifacts/${reportArtifact.id}/download?owner=${owner}&repo=${repo}`,
                    });
                }
            }

            // Fetch and parse the detailed report
            addConsoleOutput('  📊 Parsing test results...');
            const reportResponse = await fetch(`/api/github/runs/${runId}/report?owner=${owner}&repo=${repo}`, { headers });
            const reportData = await reportResponse.json();

            if (reportData.success && reportData.data) {
                const { summary, scenarios } = reportData.data;

                // Update execution with parsed results
                updateExecution(executionId, {
                    totalTests: summary.total,
                    passedTests: summary.passed,
                    failedTests: summary.failed,
                    skippedTests: summary.skipped,
                    scenarios: scenarios.map((s: any) => ({
                        id: s.id,
                        name: s.name,
                        status: s.status,
                        duration: s.duration,
                        error: s.error,
                        traceUrl: s.traceUrl,
                        steps: s.steps,
                    })),
                });

                addConsoleOutput(`  ✓ Report parsed: ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped`);
            }
        } catch (error) {
            console.error('Failed to fetch artifacts:', error);
            addConsoleOutput('  ⚠ Could not parse test report');
        }
    };

    // Run on GitHub Actions with config from modal
    const runOnGitHub = async (config: GitHubRunConfig) => {
        console.log('[runOnGitHub] Called with config:', config);
        console.log('[runOnGitHub] selectedFile:', selectedFile, 'isRunning:', isRunning);

        if (!selectedFile || isRunning) {
            console.log('[runOnGitHub] Early return - no file or already running');
            return;
        }

        // Check if GitHub is connected
        const connected = isGitHubConnected();
        console.log('[runOnGitHub] isGitHubConnected:', connected);

        if (!connected) {
            addConsoleOutput('⚠ GitHub not connected. Please connect in Settings > Integrations.');
            console.log('[runOnGitHub] GitHub not connected, returning');
            return;
        }

        // Save file first if dirty
        if (isDirty) {
            console.log('[runOnGitHub] File is dirty, saving...');
            await saveFile();
            console.log('[runOnGitHub] File saved');
        }

        setIsRunning(true);
        console.log('[runOnGitHub] setIsRunning(true)');
        addConsoleOutput(`☁️ Triggering GitHub Actions run for: ${selectedFile.split('/').pop()}`);

        try {
            // Fetch repositories using API layer
            console.log('[runOnGitHub] Fetching repos via API...');
            const repos = await githubRepoApi.list();
            console.log('[runOnGitHub] Found repos:', repos.length);

            if (!repos?.length) {
                addConsoleOutput('⚠ No GitHub repositories found. Please check your GitHub connection.');
                setIsRunning(false);
                return;
            }

            // Use the playwright-web-app repo or the first available repo
            const targetRepo = repos.find((r) => r.name === 'playwright-web-app') || repos[0];

            addConsoleOutput(`  Repository: ${targetRepo.fullName}`);
            addConsoleOutput(`  Browser: ${config.browsers.join(', ')}`);
            addConsoleOutput(`  Workers: ${config.workers} per job`);
            addConsoleOutput(`  Shards: ${config.shards} parallel jobs`);
            addConsoleOutput(`  Total parallel: ${config.workers * config.shards * config.browsers.length} browsers`);

            // Trigger the workflow via API layer
            // NOTE: apiClient throws on errors, so if this doesn't throw, it's success
            console.log('[runOnGitHub] Triggering workflow...');
            await githubRunsApi.trigger(
                targetRepo.owner,
                targetRepo.name,
                '.github/workflows/vero-tests.yml',
                targetRepo.defaultBranch || 'main',
                {
                    browsers: config.browsers.join(','),
                    workers: config.workers.toString(),
                    shards: config.shards.toString(),
                }
            );

            // If we get here, the trigger succeeded
            console.log('[runOnGitHub] SUCCESS! Workflow triggered');
            addConsoleOutput('✓ GitHub Actions workflow triggered successfully!');
            addConsoleOutput(`  Branch: ${targetRepo.defaultBranch || 'main'}`);
            addConsoleOutput('  View progress: Execution tab → GitHub Actions');
            addConsoleOutput(`  Or at: https://github.com/${targetRepo.fullName}/actions`);

            // Create execution record with timestamp
            const triggerTime = Date.now();
            const executionId = `gh-${triggerTime}`;
            const newExecution: GitHubExecution = {
                id: executionId,
                runId: 0, // Will be updated when run starts
                runNumber: 0,
                workflowName: 'Vero Tests',
                status: 'queued',
                browsers: config.browsers,
                workers: config.workers,
                shards: config.shards,
                triggeredAt: new Date(triggerTime).toISOString(),
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                skippedTests: 0,
                htmlUrl: `https://github.com/${targetRepo.fullName}/actions`,
                owner: targetRepo.owner,
                repo: targetRepo.name,
            };

            console.log('[runOnGitHub] Adding execution:', newExecution);
            addExecution(newExecution);
            addConsoleOutput('  📊 Tracking execution in Execution tab...');

            // Start polling for status with trigger timestamp
            console.log('[runOnGitHub] Starting polling...');
            pollGitHubRunStatus(executionId, targetRepo.owner, targetRepo.name, triggerTime);

            // Navigate to Execution tab
            console.log('[runOnGitHub] Navigating to executions view');
            setActiveSettingsView('executions');
        } catch (error) {
            console.error('[runOnGitHub] Error:', error);
            addConsoleOutput(`✗ Error triggering GitHub Actions: ${error}`);
        } finally {
            setIsRunning(false);
        }
    };

    const toggleFolder = (path: string) => {
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

    // Create new .vero file
    const createNewFile = async (folderPath: string, fileName: string) => {
        if (!fileName.trim()) return;

        // Ensure .vero extension
        const fullName = fileName.endsWith('.vero') ? fileName : `${fileName}.vero`;
        const filePath = `${folderPath}/${fullName}`;
        const baseName = fullName.replace('.vero', '');

        // Generate template based on folder type
        const isPage = folderPath.includes('pages');
        const template = isPage
            ? `# ${baseName} Page Object\n\npage ${baseName} {\n    field exampleField = "#example-selector"\n    \n    exampleAction {\n        click exampleField\n    }\n}\n`
            : `# ${baseName} Feature\n\nfeature ${baseName} {\n    use ExamplePage\n    \n    before each {\n        open "https://example.com"\n    }\n    \n    scenario "Example test" @smoke {\n        verify "Example" is visible\n    }\n}\n`;

        try {
            // Create file via API - encode path components but not slashes
            const encodedPath = filePath.split('/').map(p => encodeURIComponent(p)).join('/');
            console.log('[VeroIDE] Creating file:', encodedPath);

            const response = await fetch(`/api/vero/files/${encodedPath}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: template }),
            });

            console.log('[VeroIDE] API response:', response.status, response.statusText);

            if (response.ok) {
                addConsoleOutput(`✓ Created ${fullName}`);
                // Reload file tree and open new file
                await loadFileTree();
                loadFile(filePath);
            } else {
                const errorData = await response.text();
                console.error('[VeroIDE] API error:', errorData);
                // If API fails, just add to local state and open
                addConsoleOutput(`⚠ Created ${fullName} (local only - save to persist)`);
                setFileContent(template);
                setSelectedFile(filePath);
                setIsDirty(true);
            }
        } catch (error) {
            console.error('[VeroIDE] Error creating file:', error);
            // Fallback: create locally
            addConsoleOutput(`⚠ Created ${fullName} (local only - save to persist)`);
            setFileContent(template);
            setSelectedFile(filePath);
            setIsDirty(true);
        }

        // Close dialog
        setShowNewFileDialog(null);
        setNewFileName('');
    };

    // Handle plus button click
    const handleAddFile = (e: React.MouseEvent, folderPath: string) => {
        e.stopPropagation(); // Prevent folder toggle
        setShowNewFileDialog(folderPath);
        setNewFileName('');
    };

    // Rename file
    const handleRenameClick = (e: React.MouseEvent, filePath: string, currentName: string) => {
        e.stopPropagation();
        setRenamingFile(filePath);
        setRenameValue(currentName.replace('.vero', ''));
    };

    const renameFile = async (oldPath: string, newName: string) => {
        if (!newName.trim()) {
            setRenamingFile(null);
            return;
        }

        const fullNewName = newName.endsWith('.vero') ? newName : `${newName}.vero`;
        const pathParts = oldPath.split('/');
        pathParts[pathParts.length - 1] = fullNewName;
        const newPath = pathParts.join('/');

        try {
            const response = await fetch(`/api/vero/files/rename`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPath, newPath }),
            });

            if (response.ok) {
                addConsoleOutput(`✓ Renamed to ${fullNewName}`);
                await loadFileTree();
                // If the renamed file was selected, update selection
                if (selectedFile === oldPath) {
                    setSelectedFile(newPath);
                }
            } else {
                addConsoleOutput(`✗ Failed to rename file`);
            }
        } catch (error) {
            addConsoleOutput(`✗ Rename error: ${error}`);
        }

        setRenamingFile(null);
    };

    // Render file tree recursively
    const renderFileTree = (nodes: FileNode[], depth = 0) => {
        return nodes.map((node) => {
            const isExpanded = expandedFolders.has(node.path);
            const isSelected = selectedFile === node.path;
            const paddingLeft = depth * 16 + 8;

            if (node.type === 'directory') {
                const showAddButton = node.name === 'pages' || node.name === 'features';
                const isCreatingFile = showNewFileDialog === node.path;

                return (
                    <div key={node.path}>
                        <div
                            className="flex items-center gap-1 py-1 px-2 cursor-pointer hover:bg-gray-700 rounded text-sm group"
                            style={{ paddingLeft }}
                            onClick={() => toggleFolder(node.path)}
                        >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            {isExpanded ? <FolderOpen className="w-4 h-4 text-yellow-500" /> : <Folder className="w-4 h-4 text-yellow-500" />}
                            <span className="flex-1">{node.name}</span>
                            {showAddButton && (
                                <button
                                    onClick={(e) => handleAddFile(e, node.path)}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-600 rounded transition-opacity"
                                    title={`New ${node.name === 'pages' ? 'Page' : 'Feature'}`}
                                >
                                    <Plus className="w-4 h-4 text-green-400" />
                                </button>
                            )}
                        </div>
                        {/* Inline new file input */}
                        {isCreatingFile && (
                            <div className="flex items-center gap-1 py-1 px-2" style={{ paddingLeft: paddingLeft + 20 }}>
                                <input
                                    type="text"
                                    value={newFileName}
                                    onChange={(e) => setNewFileName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            createNewFile(node.path, newFileName);
                                        } else if (e.key === 'Escape') {
                                            setShowNewFileDialog(null);
                                            setNewFileName('');
                                        }
                                    }}
                                    placeholder={node.name === 'pages' ? 'NewPage' : 'NewFeature'}
                                    className="flex-1 bg-gray-700 border border-gray-500 rounded px-2 py-0.5 text-sm focus:outline-none focus:border-green-500"
                                    autoFocus
                                />
                                <span className="text-gray-500 text-xs">.vero</span>
                            </div>
                        )}
                        {isExpanded && node.children && (
                            <div>{renderFileTree(node.children, depth + 1)}</div>
                        )}
                    </div>
                );
            }

            const isRenaming = renamingFile === node.path;

            if (isRenaming) {
                // Inline rename input
                return (
                    <div
                        key={node.path}
                        className="flex items-center gap-2 py-1 px-2 bg-gray-700 rounded text-sm"
                        style={{ paddingLeft: paddingLeft + 20 }}
                    >
                        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                            <polygon points="12,2 22,7 22,17 12,22 2,17 2,7" stroke="#00FF41" strokeWidth="1.5" fill="#000800" />
                        </svg>
                        <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    renameFile(node.path, renameValue);
                                } else if (e.key === 'Escape') {
                                    setRenamingFile(null);
                                }
                            }}
                            onBlur={() => renameFile(node.path, renameValue)}
                            className="flex-1 bg-gray-600 border border-gray-500 rounded px-2 py-0.5 text-sm focus:outline-none focus:border-green-500"
                            autoFocus
                        />
                        <span className="text-gray-500 text-xs">.vero</span>
                    </div>
                );
            }

            return (
                <div
                    key={node.path}
                    className={`flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-gray-700 rounded text-sm group ${isSelected ? 'bg-blue-600 hover:bg-blue-700' : ''
                        }`}
                    style={{ paddingLeft: paddingLeft + 20 }}
                    onClick={() => loadFile(node.path)}
                >
                    {/* Hexagonal Matrix-themed Vero icon */}
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                        <defs>
                            <linearGradient id="hexagonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#00FF41" />
                                <stop offset="100%" stopColor="#003B00" />
                            </linearGradient>
                        </defs>
                        {/* Hexagon Shape */}
                        <polygon
                            points="12,2 22,7 22,17 12,22 2,17 2,7"
                            stroke="#00FF41"
                            strokeWidth="1.5"
                            fill="#000800"
                        />
                        {/* Internal "Code Rain" Pattern (Animated) */}
                        <rect x="7" y="9" width="2" height="6" fill="#00FF41" opacity="0.8">
                            <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
                        </rect>
                        <rect x="11" y="7" width="2" height="10" fill="#00FF41" opacity="0.6">
                            <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
                        </rect>
                        <rect x="15" y="9" width="2" height="6" fill="#00FF41" opacity="0.8">
                            <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2.5s" repeatCount="indefinite" />
                        </rect>
                    </svg>
                    <span className="truncate flex-1">{node.name}</span>
                    {/* Rename button - appears on hover */}
                    <button
                        onClick={(e) => handleRenameClick(e, node.path, node.name)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-600 rounded transition-opacity"
                        title="Rename file"
                    >
                        <Pencil className="w-3 h-3 text-gray-400" />
                    </button>
                </div>
            );
        });
    };

    // Filter projects/workflows for app launcher search
    const filteredProjects = (projects || []).filter(p =>
        p.name.toLowerCase().includes(appLauncherSearch.toLowerCase())
    );
    const filteredWorkflows = (workflows || []).filter(w =>
        w.name.toLowerCase().includes(appLauncherSearch.toLowerCase())
    );

    return (
        <div className="vero-ide h-screen flex flex-col bg-gray-900 text-white">
            {/* Toolbar */}
            <div className="toolbar flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
                {/* App Launcher (9-dot grid) */}
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowAppLauncher(!showAppLauncher);
                            setAppLauncherSearch('');
                        }}
                        className={`p-2 rounded-lg transition-all ${showAppLauncher
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-gray-700 text-gray-400 hover:text-white'
                            }`}
                        title="App Launcher"
                    >
                        <Grid3X3 className="w-5 h-5" />
                    </button>

                    {/* App Launcher Dropdown */}
                    {showAppLauncher && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowAppLauncher(false)} />
                            <div className="absolute left-0 top-full mt-2 w-96 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                                {/* Search */}
                                <div className="p-3 border-b border-gray-800">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="text"
                                            value={appLauncherSearch}
                                            onChange={(e) => setAppLauncherSearch(e.target.value)}
                                            placeholder="Search applications & workflows..."
                                            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Applications Section */}
                                <div className="max-h-80 overflow-y-auto">
                                    <div className="p-2">
                                        <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Applications
                                        </div>
                                        {filteredProjects.length === 0 ? (
                                            <div className="px-2 py-3 text-sm text-gray-500">No applications found</div>
                                        ) : (
                                            <div className="grid grid-cols-3 gap-2 mt-2">
                                                {filteredProjects.map((project) => (
                                                    <button
                                                        key={project.id}
                                                        onClick={() => {
                                                            setCurrentProject(project);
                                                            setShowAppLauncher(false);
                                                        }}
                                                        className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${currentProject?.id === project.id
                                                            ? 'bg-blue-600/20 border border-blue-500'
                                                            : 'hover:bg-gray-800 border border-transparent'
                                                            }`}
                                                    >
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${currentProject?.id === project.id
                                                            ? 'bg-blue-600'
                                                            : 'bg-gradient-to-br from-purple-500 to-blue-600'
                                                            }`}>
                                                            <Briefcase className="w-5 h-5 text-white" />
                                                        </div>
                                                        <span className="text-xs text-center text-gray-300 truncate w-full">
                                                            {project.name}
                                                        </span>
                                                        {currentProject?.id === project.id && (
                                                            <Check className="w-3 h-3 text-blue-400 absolute top-1 right-1" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Workflows Section */}
                                    {currentProject && (
                                        <div className="p-2 border-t border-gray-800">
                                            <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Workflows in {currentProject.name}
                                            </div>
                                            {filteredWorkflows.length === 0 ? (
                                                <div className="px-2 py-3 text-sm text-gray-500">No workflows found</div>
                                            ) : (
                                                <div className="mt-2 space-y-1">
                                                    {filteredWorkflows.map((workflow) => (
                                                        <div key={workflow.id} className="rounded-lg bg-gray-800/50">
                                                            <div className="flex items-center gap-2 px-3 py-2">
                                                                <Folder className="w-4 h-4 text-yellow-500" />
                                                                <span className="text-sm font-medium text-gray-200">{workflow.name}</span>
                                                                <span className="text-xs text-gray-500 ml-auto">
                                                                    {workflow.testFlows?.length || 0} flows
                                                                </span>
                                                            </div>
                                                            {workflow.testFlows && workflow.testFlows.length > 0 && (
                                                                <div className="px-3 pb-2 space-y-1">
                                                                    {workflow.testFlows.slice(0, 5).map((flow: any) => (
                                                                        <button
                                                                            key={flow.id}
                                                                            onClick={() => {
                                                                                handleFlowSelect(flow.id);
                                                                                setShowAppLauncher(false);
                                                                            }}
                                                                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${activeFlowId === flow.id
                                                                                ? 'bg-blue-600/30 text-blue-300'
                                                                                : 'hover:bg-gray-700 text-gray-400'
                                                                                }`}
                                                                        >
                                                                            <FileText className="w-3.5 h-3.5" />
                                                                            <span className="truncate">{flow.name}</span>
                                                                            {activeFlowId === flow.id && (
                                                                                <Check className="w-3 h-3 ml-auto text-blue-400" />
                                                                            )}
                                                                        </button>
                                                                    ))}
                                                                    {workflow.testFlows.length > 5 && (
                                                                        <div className="text-xs text-gray-500 px-2 py-1">
                                                                            +{workflow.testFlows.length - 5} more...
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-2 border-t border-gray-800 bg-gray-800/50">
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>
                                            {currentProject ? (
                                                <>Current: <span className="text-blue-400">{currentProject.name}</span></>
                                            ) : (
                                                'No application selected'
                                            )}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {currentProject && (
                                                <button
                                                    onClick={() => {
                                                        setRenameProjectName(currentProject.name);
                                                        setShowAppLauncher(false);
                                                        setShowRenameProjectModal(true);
                                                    }}
                                                    className="flex items-center gap-1 px-2 py-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                    Rename
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setShowAppLauncher(false);
                                                    setShowNewProjectModal(true);
                                                }}
                                                className="flex items-center gap-1 px-2 py-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                                New Application
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Logo and Title */}
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center">
                        <span className="text-white font-bold text-xs">V</span>
                    </div>
                    <span className="font-semibold">Vero IDE</span>
                    {currentProject && (
                        <>
                            <span className="text-gray-600">/</span>
                            <span className="text-gray-400 text-sm">{currentProject.name}</span>
                        </>
                    )}
                </div>

                <div className="flex-1" />

                {/* File actions */}
                <button
                    onClick={saveFile}
                    disabled={!isDirty}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${isDirty ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 text-gray-400'
                        }`}
                >
                    <Save className="w-4 h-4" />
                    Save
                </button>

                {/* Run Button with Dropdown */}
                {(() => {
                    const isFeatureFile = selectedFile?.includes('features/') || fileContent.includes('feature ');
                    const canRun = selectedFile && isFeatureFile && !isRunning;
                    return (
                        <div className="relative">
                            <div className="flex">
                                <button
                                    onClick={() => runCurrentFile()}
                                    disabled={!canRun}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-l text-sm ${!canRun
                                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700'
                                        }`}
                                    title={!isFeatureFile ? 'Run is only available for feature files' : 'Run current file'}
                                >
                                    <Play className="w-4 h-4" />
                                    {isRunning ? 'Running...' : 'Run'}
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowRunDropdown(!showRunDropdown);
                                        setShowEnvDropdown(false);
                                    }}
                                    disabled={!canRun}
                                    className={`flex items-center px-1.5 py-1.5 rounded-r border-l border-green-700 text-sm ${!canRun
                                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700'
                                        }`}
                                >
                                    <ChevronDown className="w-3 h-3" />
                                </button>
                            </div>

                            {showRunDropdown && (
                                <div className="absolute top-full right-0 mt-1 w-52 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setExecutionConfig(c => ({ ...c, browserMode: 'headed' }));
                                            runCurrentFile();
                                            setShowRunDropdown(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-700"
                                    >
                                        <Play className="w-4 h-4 text-green-400" />
                                        Run
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            runDebug();
                                            setShowRunDropdown(false);
                                        }}
                                        disabled={isDebugging}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${isDebugging ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'}`}
                                    >
                                        <span className="w-4 text-center">🐛</span>
                                        {isDebugging ? 'Debugging...' : 'Run with Debug'}
                                    </button>
                                    <div className="border-t border-gray-700" />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowGitHubRunModal(true);
                                            setShowRunDropdown(false);
                                        }}
                                        disabled={!isGitHubConnected()}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${isGitHubConnected()
                                            ? 'hover:bg-gray-700'
                                            : 'opacity-50 cursor-not-allowed'
                                            }`}
                                        title={isGitHubConnected() ? 'Run on GitHub Actions' : 'GitHub not connected'}
                                    >
                                        <Github className="w-4 h-4 text-purple-400" />
                                        Run on GitHub Actions
                                        {!isGitHubConnected() && (
                                            <span className="ml-auto text-xs text-gray-500">(not connected)</span>
                                        )}
                                    </button>
                                    <div className="border-t border-gray-700" />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowRunDropdown(false);
                                            setShowRunConfigModal(true);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-700"
                                    >
                                        <Settings className="w-4 h-4 text-gray-400" />
                                        Run Configuration...
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* Debug Controls - visible when debugging */}
                {isDebugging && (
                    <>
                        <div className="w-px h-6 bg-gray-600 mx-1" />
                        <div className="flex items-center gap-1">
                            {debugPaused ? (
                                <button
                                    onClick={debugResume}
                                    className="flex items-center gap-1 px-2 py-1.5 rounded text-sm bg-green-600 hover:bg-green-700 text-white"
                                    title="Continue (F5)"
                                >
                                    <Play className="w-4 h-4" />
                                    <span className="hidden sm:inline">Continue</span>
                                </button>
                            ) : (
                                <div className="flex items-center gap-1 px-2 py-1 text-sm text-yellow-400">
                                    <span className="animate-pulse">●</span>
                                    <span>Running...</span>
                                </div>
                            )}
                            <button
                                onClick={debugStepOver}
                                disabled={!debugPaused}
                                className={`flex items-center gap-1 px-2 py-1.5 rounded text-sm ${debugPaused
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    }`}
                                title="Step Over (F10)"
                            >
                                <ArrowRight className="w-4 h-4" />
                                <span className="hidden sm:inline">Step</span>
                            </button>
                            <button
                                onClick={debugStop}
                                className="flex items-center gap-1 px-2 py-1.5 rounded text-sm bg-red-600 hover:bg-red-700 text-white"
                                title="Stop Debugging (Shift+F5)"
                            >
                                <Square className="w-4 h-4" />
                                <span className="hidden sm:inline">Stop</span>
                            </button>
                        </div>
                        {debugCurrentLine && (
                            <div className="text-xs text-gray-400 ml-2">
                                Line {debugCurrentLine}
                            </div>
                        )}
                    </>
                )}

                {/* Copilot Button */}
                <button
                    onClick={() => {
                        setShowCopilotPanel(!showCopilotPanel);
                        if (!showCopilotPanel) setShowAIPanel(false); // Close AI Agent if opening Copilot
                    }}
                    disabled={isRunning || isRecording}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${showCopilotPanel
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                        } disabled:opacity-50`}
                    title="Vero Copilot - AI-powered test automation assistant"
                >
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden lg:inline">Copilot</span>
                </button>

                {/* AI Agent Button */}
                <button
                    onClick={() => {
                        setShowAIPanel(!showAIPanel);
                        if (!showAIPanel) setShowCopilotPanel(false); // Close Copilot if opening AI Agent
                    }}
                    disabled={isRunning || isRecording}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${showAIPanel
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                        } disabled:opacity-50`}
                    title="AI Agent - Generate tests from natural language"
                >
                    <Bot className="w-4 h-4" />
                    <span className="hidden lg:inline">AI Agent</span>
                </button>

                {/* Live Run Button */}
                <button
                    onClick={() => setShowLiveExecution(!showLiveExecution)}
                    disabled={isRecording}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${showLiveExecution
                        ? 'bg-cyan-600 text-white'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                        } disabled:opacity-50`}
                    title="Live Run - Execute with AI assistance"
                >
                    <Monitor className="w-4 h-4" />
                    <span className="hidden lg:inline">Live Run</span>
                </button>

                {/* Record Button */}
                <button
                    onClick={() => {
                        if (isRecording) {
                            stopRecording();
                        } else {
                            setShowRecordingDialog(true);
                        }
                    }}
                    disabled={!selectedFile || isRunning}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${isRecording
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                        } disabled:opacity-50 disabled:bg-gray-700 disabled:text-gray-400`}
                    title={isRecording ? 'Stop Recording' : 'Start Recording - Record browser actions'}
                >
                    {isRecording ? (
                        <>
                            <Square className="w-4 h-4 fill-current" />
                            <span>Stop</span>
                        </>
                    ) : (
                        <>
                            <Circle className="w-4 h-4 fill-current" />
                            <span>Record</span>
                        </>
                    )}
                </button>

                <div className="w-px h-6 bg-gray-600 mx-1" />

                {/* Execution Dashboard Button */}
                <button
                    onClick={() => {
                        if (activeSettingsView === 'executions' || activeSettingsView === 'live-execution') {
                            setActiveSettingsView('explorer');
                        } else {
                            setPreviousView(activeSettingsView);
                            setActiveSettingsView('executions');
                        }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${activeSettingsView === 'executions' || activeSettingsView === 'live-execution'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                        }`}
                    title="Execution History"
                >
                    <Activity className="w-4 h-4" />
                    <span className="hidden lg:inline">Execution</span>
                </button>

                {/* Scenario Dashboard Button */}
                <button
                    onClick={handleOpenScenarioDashboard}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                    title="Scenario Dashboard - View all scenarios by tags"
                >
                    <Layers className="w-4 h-4" />
                    <span className="hidden lg:inline">Scenarios</span>
                </button>

                <div className="w-px h-6 bg-gray-600 mx-1" />

                {/* Settings Gear Icon - opens settings panel in sidebar */}
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowSettingsMenu(!showSettingsMenu);
                        }}
                        className={`flex items-center gap-1 p-2 rounded text-sm transition-colors ${activeSettingsView !== 'explorer' || showSettingsMenu
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                            }`}
                        title="Settings & Panels"
                    >
                        <Settings className="w-4 h-4" />
                    </button>

                    {showSettingsMenu && (
                        <div className="absolute top-full right-0 mt-1 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveSettingsView('explorer');
                                    setShowSettingsMenu(false);
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-700 ${activeSettingsView === 'explorer' ? 'bg-gray-700 text-green-400' : ''}`}
                            >
                                <Folder className="w-4 h-4" />
                                Explorer
                                {activeSettingsView === 'explorer' && <span className="ml-auto">✓</span>}
                            </button>
                            <div className="border-t border-gray-700" />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveSettingsView('testdata');
                                    setShowSettingsMenu(false);
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-700 ${activeSettingsView === 'testdata' ? 'bg-gray-700 text-emerald-400' : ''}`}
                            >
                                <Database className="w-4 h-4" />
                                Test Data
                                {activeSettingsView === 'testdata' && <span className="ml-auto">✓</span>}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveSettingsView('scheduler');
                                    setShowSettingsMenu(false);
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-700 ${activeSettingsView === 'scheduler' ? 'bg-gray-700 text-yellow-400' : ''}`}
                            >
                                <Calendar className="w-4 h-4" />
                                Scheduler
                                {activeSettingsView === 'scheduler' && <span className="ml-auto">✓</span>}
                            </button>
                            <div className="border-t border-gray-700" />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowSettingsMenu(false);
                                    setShowRunConfigModal(true);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-700 text-blue-400"
                            >
                                <Zap className="w-4 h-4" />
                                Run Configuration...
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowSettingsMenu(false);
                                    setShowConfigModal(true);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-700 text-gray-400"
                            >
                                <Settings className="w-4 h-4" />
                                Quick Settings...
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Recording Status Bar - shows when recording is active */}
            {isRecording && (
                <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between border-b border-red-700">
                    <div className="flex items-center gap-2">
                        <Circle className="w-3 h-3 fill-current animate-pulse" />
                        <span className="font-medium">Recording: {activeRecordingScenario || 'New Scenario'}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <span className="text-red-200">
                            {recordedActions.length} action{recordedActions.length !== 1 ? 's' : ''} captured
                        </span>
                        <button
                            onClick={stopRecording}
                            className="bg-white text-red-600 px-3 py-1 rounded text-xs font-medium hover:bg-red-100 transition-colors"
                        >
                            Stop Recording
                        </button>
                    </div>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 flex min-h-0">
                {/* Left Sidebar - Settings Menu */}
                <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto flex flex-col">
                    <div className="p-2 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-700 flex items-center justify-between">
                        <span>{activeSettingsView === 'explorer' ? 'Explorer' : 'Settings'}</span>
                    </div>
                    <div className="flex flex-col">
                        {/* Settings Navigation */}
                        <button
                            onClick={() => setActiveSettingsView('explorer')}
                            className={`flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${activeSettingsView === 'explorer'
                                ? 'bg-gray-700 text-green-400 border-l-2 border-green-400'
                                : 'hover:bg-gray-700 text-gray-300'
                                }`}
                        >
                            <Folder className="w-4 h-4" />
                            Explorer
                        </button>
                        <button
                            onClick={() => setActiveSettingsView('testdata')}
                            className={`flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${activeSettingsView === 'testdata'
                                ? 'bg-gray-700 text-emerald-400 border-l-2 border-emerald-400'
                                : 'hover:bg-gray-700 text-gray-300'
                                }`}
                        >
                            <Database className="w-4 h-4" />
                            Test Data
                        </button>
                        <button
                            onClick={() => setActiveSettingsView('scheduler')}
                            className={`flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${activeSettingsView === 'scheduler'
                                ? 'bg-gray-700 text-yellow-400 border-l-2 border-yellow-400'
                                : 'hover:bg-gray-700 text-gray-300'
                                }`}
                        >
                            <Calendar className="w-4 h-4" />
                            Scheduler
                        </button>
                    </div>

                    {/* File tree - only when explorer is selected */}
                    {activeSettingsView === 'explorer' && (
                        <div className="flex-1 border-t border-gray-700 overflow-y-auto">
                            {/* Explorer header with add project button */}
                            <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50 border-b border-gray-700">
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Explorer</span>
                                <button
                                    onClick={() => setShowNewInnerProjectModal(true)}
                                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                                    title="New Project"
                                >
                                    <Plus className="w-3.5 h-3.5 text-gray-400 hover:text-green-400" />
                                </button>
                            </div>

                            {/* Projects list - each project is a root folder */}
                            <div className="p-2">
                                {((currentProject as any)?.projects || []).map((project: any) => (
                                    <div key={project.id}>
                                        {/* Project folder */}
                                        <div
                                            className="flex items-center gap-1 py-1 px-2 cursor-pointer hover:bg-gray-700 rounded text-sm group"
                                            onClick={() => {
                                                const projPath = `proj:${project.id}`;
                                                const isExpanding = !expandedFolders.has(projPath);
                                                setExpandedFolders(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(projPath)) {
                                                        next.delete(projPath);
                                                    } else {
                                                        next.add(projPath);
                                                    }
                                                    return next;
                                                });
                                                // Load files for this project when expanding (if not already loaded)
                                                if (isExpanding && project.veroPath && !projectFiles[project.id]) {
                                                    loadInnerProjectFiles(project.id, project.veroPath);
                                                }
                                                // Set as selected inner project
                                                setSelectedInnerProjectId(project.id);
                                            }}
                                        >
                                            {expandedFolders.has(`proj:${project.id}`) ? (
                                                <ChevronDown className="w-4 h-4" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4" />
                                            )}
                                            <Folder className="w-4 h-4 text-yellow-500" />
                                            <span className="flex-1 font-medium">{project.name}</span>
                                            {/* Delete button - visible on hover */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteConfirmProject({ id: project.id, name: project.name });
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600/20 rounded transition-all"
                                                title="Delete project"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-400" />
                                            </button>
                                        </div>
                                        {/* Project contents (features, pages) - use project-specific files */}
                                        {expandedFolders.has(`proj:${project.id}`) && (
                                            <div className="ml-3">
                                                {renderFileTree(projectFiles[project.id] || [])}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* If no projects from API, show message to create a project */}
                                {(!((currentProject as any)?.projects) || (currentProject as any)?.projects?.length === 0) && (
                                    <div className="py-4 px-3 text-center">
                                        <div className="text-gray-500 text-sm mb-3">
                                            No projects in this application yet.
                                        </div>
                                        <button
                                            onClick={() => setShowNewInnerProjectModal(true)}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Create First Project
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Canvas Area - Editor or Panel Content */}
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Show Editor when explorer is selected */}
                    {activeSettingsView === 'explorer' && (
                        <>
                            {/* Tab bar */}
                            {selectedFile && (
                                <div className="flex items-center px-2 py-1 bg-gray-800 border-b border-gray-700 text-sm">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-t">
                                        <FileText className="w-4 h-4 text-purple-400" />
                                        <span>{selectedFile.split('/').pop()}</span>
                                        {isDirty && <span className="text-yellow-400 ml-1">●</span>}
                                    </div>
                                    {isEmbeddedRecording && (
                                        <div className="ml-4 flex items-center gap-2 text-red-400">
                                            <Circle className="w-3 h-3 animate-pulse" />
                                            <span className="text-xs">Recording: {activeRecordingScenario}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Split-screen during recording */}
                            {isEmbeddedRecording ? (
                                <div className="flex-1 flex min-h-0">
                                    {/* Playwright Codegen Status Panel - 50% */}
                                    <div className="w-[50%] bg-gray-900 flex flex-col border-r border-gray-700">
                                        {/* Codegen toolbar */}
                                        <div className="px-3 py-2 bg-gray-800 border-b border-gray-700 flex items-center gap-2">
                                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                            <span className="text-sm font-medium text-white">Playwright Codegen</span>
                                            <div className="flex-1 mx-2">
                                                <div className="bg-gray-700 rounded px-3 py-1 text-sm text-gray-300 truncate">
                                                    {recordingStartUrl}
                                                </div>
                                            </div>
                                            <button
                                                onClick={stopEmbeddedRecording}
                                                className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-white text-sm flex items-center gap-2"
                                            >
                                                <Square className="w-3 h-3" />
                                                Stop Recording
                                            </button>
                                        </div>
                                        {/* Codegen Status */}
                                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                                            <div className="relative mb-6">
                                                <Monitor className="w-32 h-32 text-green-500" />
                                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                                                    <Circle className="w-4 h-4 text-white" />
                                                </div>
                                            </div>
                                            <h3 className="text-2xl font-bold text-white mb-3">Playwright Codegen Running</h3>
                                            <p className="text-gray-300 mb-6 text-center max-w-md">
                                                A Chrome browser window has opened. Interact with the page and your actions will be automatically converted to Vero DSL.
                                            </p>
                                            <div className="bg-gray-800 rounded-lg p-4 max-w-md w-full">
                                                <h4 className="text-sm font-semibold text-gray-300 mb-3">Recording Features:</h4>
                                                <ul className="text-sm text-gray-400 space-y-2">
                                                    <li className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                        Uses Playwright's best-in-class selectors
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                        Auto-creates Page Object fields
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                        Reuses existing selectors from codebase
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                        Real-time Vero DSL conversion
                                                    </li>
                                                </ul>
                                            </div>
                                            <div className="mt-6 flex items-center gap-2 text-sm">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                <span className="text-green-400">Recording to: {activeRecordingScenario}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Editor - 50% */}
                                    <div className="w-[50%] min-w-[400px]">
                                        <VeroEditor
                                            ref={veroEditorRef}
                                            initialValue={fileContent}
                                            onChange={handleCodeChange}
                                            onRunScenario={handleRunScenario}
                                            onRunFeature={handleRunFeature}
                                            onAddScenario={handleAddScenario}
                                            onStartRecording={(scenarioName) => {
                                                setActiveRecordingScenario(scenarioName);
                                                startEmbeddedRecording();
                                            }}
                                            isRecording={isRecording && !isPaused}
                                            activeRecordingScenario={activeRecordingScenario}
                                            breakpoints={breakpoints}
                                            onToggleBreakpoint={toggleBreakpoint}
                                            debugCurrentLine={debugCurrentLine}
                                            isDebugging={isDebugging}
                                            token={authToken}
                                        />
                                    </div>
                                </div>
                            ) : (
                                /* Normal editor */
                                <div className="flex-1 min-h-0 relative">
                                    {selectedFile ? (
                                        <VeroEditor
                                            ref={veroEditorRef}
                                            initialValue={fileContent}
                                            onChange={handleCodeChange}
                                            onRunScenario={handleRunScenario}
                                            onRunFeature={handleRunFeature}
                                            onAddScenario={handleAddScenario}
                                            onStartRecording={(scenarioName) => {
                                                setActiveRecordingScenario(scenarioName);
                                                startEmbeddedRecording();
                                            }}
                                            isRecording={isRecording && !isPaused}
                                            activeRecordingScenario={activeRecordingScenario}
                                            breakpoints={breakpoints}
                                            onToggleBreakpoint={toggleBreakpoint}
                                            debugCurrentLine={debugCurrentLine}
                                            isDebugging={isDebugging}
                                            token={authToken}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-500">
                                            <div className="text-center">
                                                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                                <p>Select a file to edit</p>
                                                <p className="text-sm mt-2">or click Record to start a new test</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* AI Agent Panel (Overlay from right) */}
                                    {showAIPanel && (
                                        <div className="absolute top-0 right-0 h-full z-30">
                                            <AIAgentPanel
                                                isVisible={showAIPanel}
                                                onClose={() => setShowAIPanel(false)}
                                                onInsertCode={(veroCode) => {
                                                    // Insert generated Vero code at cursor or end of file
                                                    if (fileContent.includes('feature ')) {
                                                        // Insert before last 'end' or at end of file
                                                        const lastEndMatch = fileContent.lastIndexOf('\nend');
                                                        if (lastEndMatch !== -1) {
                                                            const before = fileContent.substring(0, lastEndMatch);
                                                            const after = fileContent.substring(lastEndMatch);
                                                            setFileContent(before + '\n\n' + veroCode + after);
                                                        } else {
                                                            setFileContent(fileContent + '\n\n' + veroCode);
                                                        }
                                                    } else {
                                                        setFileContent(fileContent + '\n\n' + veroCode);
                                                    }
                                                    setIsDirty(true);
                                                    setShowAIPanel(false);
                                                    addConsoleOutput('✨ AI-generated code inserted');
                                                }}
                                                onGeneratedCode={(code) => {
                                                    console.log('[AI Agent] Generated code:', code.substring(0, 100) + '...');
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Live Execution Panel (Overlay from right) */}
                                    {showLiveExecution && (
                                        <div className="absolute top-0 right-0 h-full z-30">
                                            <LiveExecutionPanel
                                                isVisible={showLiveExecution}
                                                onClose={() => setShowLiveExecution(false)}
                                            />
                                        </div>
                                    )}

                                    {/* Copilot Panel (Overlay from right) */}
                                    {showCopilotPanel && (
                                        <div className="absolute top-0 right-0 h-full z-30 w-96">
                                            <CopilotPanel
                                                projectId={currentProject?.id || 'default'}
                                                onCodeGenerated={(code, filePath) => {
                                                    // Insert generated Vero code
                                                    if (fileContent.includes('feature ') || fileContent.includes('FEATURE ')) {
                                                        const lastEndMatch = fileContent.lastIndexOf('\nend');
                                                        if (lastEndMatch !== -1) {
                                                            const before = fileContent.substring(0, lastEndMatch);
                                                            const after = fileContent.substring(lastEndMatch);
                                                            setFileContent(before + '\n\n' + code + after);
                                                        } else {
                                                            setFileContent(fileContent + '\n\n' + code);
                                                        }
                                                    } else {
                                                        setFileContent(code);
                                                    }
                                                    setIsDirty(true);
                                                    addConsoleOutput(`✨ Copilot generated: ${filePath}`);
                                                }}
                                                className="h-full border-l border-gray-700"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Debug Console Panel - visible when debugging */}
                            {isDebugging && (
                                <div className="h-48 min-h-[8rem] max-h-[16rem] border-t border-gray-700 bg-gray-900 flex flex-col">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-b border-gray-700">
                                        <Bug className="w-4 h-4 text-orange-400" />
                                        <span className="text-sm font-medium text-white">Debug Console</span>
                                        {debugPaused && debugCurrentLine && (
                                            <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-600 text-white rounded">
                                                Paused at line {debugCurrentLine}
                                            </span>
                                        )}
                                        <div className="flex-1" />
                                        <span className="text-xs text-gray-500">
                                            {debugLogs.length} entries
                                        </span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto font-mono text-xs p-2 space-y-1">
                                        {debugLogs.length === 0 ? (
                                            <div className="text-gray-500 italic">Waiting for debug output...</div>
                                        ) : (
                                            debugLogs.map((log, i) => (
                                                <div
                                                    key={i}
                                                    className={`py-0.5 px-2 rounded ${log.type === 'error'
                                                        ? 'bg-red-900/30 text-red-300'
                                                        : log.type === 'step'
                                                            ? 'bg-blue-900/30 text-blue-300'
                                                            : 'text-gray-300'
                                                        }`}
                                                >
                                                    <span className="text-gray-500 mr-2">
                                                        [{log.timestamp.toLocaleTimeString()}]
                                                    </span>
                                                    {log.message}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Test Data Panel in Canvas */}
                    {activeSettingsView === 'testdata' && (
                        <div className="flex-1 overflow-y-auto">
                            <TestDataPage projectId={localStorage.getItem('currentProjectId') || 'demo-project-001'} />
                        </div>
                    )}

                    {/* Workers Panel in Canvas */}
                    {activeSettingsView === 'workers' && (
                        <div className="flex-1 overflow-y-auto p-6">
                            <WorkerDashboard
                                workers={[]}
                                canScale={parallelConfig.mode === 'remote'}
                                onRefresh={() => addConsoleOutput('Refreshing workers...')}
                            />
                        </div>
                    )}

                    {/* Sharding Panel in Canvas */}
                    {activeSettingsView === 'sharding' && (
                        <div className="flex-1 overflow-y-auto p-6">
                            <ShardingConfig
                                value={parallelConfig.sharding}
                                onChange={(sharding: ShardingConfigType) => setParallelConfig({ ...parallelConfig, sharding })}
                            />
                        </div>
                    )}

                    {/* Results Panel in Canvas */}
                    {activeSettingsView === 'results' && (
                        <div className="flex-1 overflow-y-auto">
                            <TestResultsDashboard
                                runs={[]}
                                onRefresh={() => addConsoleOutput('Refreshing results...')}
                            />
                        </div>
                    )}

                    {/* Trace Viewer Panel in Canvas */}
                    {activeSettingsView === 'trace' && (
                        <div className="flex-1 overflow-y-auto">
                            {selectedTraceUrl ? (
                                <TraceViewerPanel
                                    traceUrl={selectedTraceUrl}
                                    testId="current"
                                    testName="Test Trace"
                                    onClose={() => {
                                        setSelectedTraceUrl(null);
                                        setActiveSettingsView('explorer');
                                    }}
                                />
                            ) : (
                                <div className="flex-1 flex items-center justify-center p-4 h-full">
                                    <div className="text-center text-gray-500">
                                        <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p className="text-sm">No trace selected</p>
                                        <p className="text-xs mt-1">Run a test with tracing enabled to view traces</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Scheduler Panel in Canvas */}
                    {activeSettingsView === 'scheduler' && (
                        <SchedulerPanel
                            workflowId={currentWorkflow?.id}
                            onRunTriggered={(runId) => {
                                addConsoleOutput(`Schedule triggered: Run ${runId}`);
                            }}
                        />
                    )}

                    {/* Execution Config Panel in Canvas */}
                    {activeSettingsView === 'config' && (
                        <div className="flex-1 overflow-y-auto p-6">
                            <ExecutionConfigPanel
                                config={parallelConfig}
                                onConfigChange={setParallelConfig}
                                onSave={() => addConsoleOutput('Configuration saved')}
                                onReset={() => setParallelConfig(defaultParallelConfig)}
                                hasChanges={JSON.stringify(parallelConfig) !== JSON.stringify(defaultParallelConfig)}
                            />
                        </div>
                    )}

                    {/* Execution Dashboard in Canvas */}
                    {activeSettingsView === 'executions' && (
                        <ExecutionDashboard
                            onViewLive={(execId) => handleViewLive(execId)}
                            onViewTrace={handleViewTrace}
                            onBack={handleExecutionBack}
                        />
                    )}

                    {/* Live Execution View in Canvas */}
                    {activeSettingsView === 'live-execution' && activeExecutionId && (
                        <LocalExecutionViewer
                            executionId={activeExecutionId}
                            onBack={handleExecutionBack}
                        />
                    )}
                </div>
            </div>

            {/* Recording Dialog Modal */}
            {
                showRecordingDialog && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-gray-800 rounded-lg p-6 w-[420px] shadow-xl border border-gray-600">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                                    <Circle className="w-5 h-5 text-white fill-current" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Start Recording</h3>
                                    <p className="text-xs text-gray-400">Create a new test scenario</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-300 mb-1">Scenario Name</label>
                                    <input
                                        type="text"
                                        value={recordingScenarioName}
                                        onChange={(e) => setRecordingScenarioName(e.target.value)}
                                        placeholder="e.g., User can login successfully"
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-red-500"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && recordingScenarioName.trim() && recordingStartUrl.trim() && (() => {
                                            createEmptyScenario();
                                            setTimeout(() => startEmbeddedRecording(), 100);
                                        })()}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-300 mb-1">Start URL</label>
                                    <input
                                        type="url"
                                        value={recordingStartUrl}
                                        onChange={(e) => setRecordingStartUrl(e.target.value)}
                                        placeholder="https://example.com"
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-red-500"
                                    />
                                </div>

                                <div className="bg-gray-700/50 rounded p-3 text-xs text-gray-400">
                                    <p className="font-medium text-gray-300 mb-1">What happens next:</p>
                                    <ul className="list-disc list-inside space-y-0.5">
                                        <li>A Playwright browser window will open</li>
                                        <li>Click and type to record actions</li>
                                        <li>Vero code appears in real-time in the editor</li>
                                        <li>Page objects are auto-generated</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    onClick={() => setShowRecordingDialog(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={createEmptyScenario}
                                    disabled={!recordingScenarioName.trim()}
                                    className={`px-4 py-2 rounded text-sm flex items-center gap-2 ${recordingScenarioName.trim()
                                        ? 'bg-gray-700 hover:bg-gray-600 border border-gray-500'
                                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Empty
                                </button>
                                <button
                                    onClick={() => {
                                        if (!recordingScenarioName.trim()) return;
                                        createEmptyScenario();
                                        // Start recording immediately
                                        setTimeout(() => startEmbeddedRecording(), 100);
                                    }}
                                    disabled={!recordingScenarioName.trim() || !recordingStartUrl.trim()}
                                    className={`px-4 py-2 rounded text-sm flex items-center gap-2 font-medium ${recordingScenarioName.trim() && recordingStartUrl.trim()
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    <Circle className="w-4 h-4 fill-current" />
                                    Start Recording
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Config Modal - Two Tab Layout */}
            {showConfigModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 w-[500px] shadow-xl border border-gray-600 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Execution Configuration
                        </h3>

                        {/* Tab Buttons */}
                        <div className="flex border-b border-gray-700 mb-4">
                            <button
                                onClick={() => setConfigTab('quick')}
                                className={`px-4 py-2 text-sm font-medium ${configTab === 'quick'
                                    ? 'text-green-400 border-b-2 border-green-400'
                                    : 'text-gray-400 hover:text-gray-200'
                                    }`}
                            >
                                Quick Settings
                            </button>
                            <button
                                onClick={() => setConfigTab('advanced')}
                                className={`px-4 py-2 text-sm font-medium ${configTab === 'advanced'
                                    ? 'text-green-400 border-b-2 border-green-400'
                                    : 'text-gray-400 hover:text-gray-200'
                                    }`}
                            >
                                Advanced
                            </button>
                        </div>

                        {/* Quick Settings Tab */}
                        {configTab === 'quick' && (
                            <div className="space-y-4">
                                {/* Browser Type */}
                                <div>
                                    <label className="block text-sm text-gray-300 mb-2">Browser</label>
                                    <div className="flex gap-2">
                                        {(['chromium', 'firefox', 'webkit'] as const).map((browser) => (
                                            <button
                                                key={browser}
                                                onClick={() => setExecutionConfig(c => ({ ...c, browser }))}
                                                className={`flex-1 py-2 px-3 rounded text-sm capitalize ${executionConfig.browser === browser
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                    }`}
                                            >
                                                {browser}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Viewport */}
                                <div>
                                    <label className="block text-sm text-gray-300 mb-2">Viewport</label>
                                    <select
                                        value={`${executionConfig.viewport.width}x${executionConfig.viewport.height}`}
                                        onChange={(e) => {
                                            const preset = VIEWPORT_PRESETS.find(p => `${p.width}x${p.height}` === e.target.value);
                                            if (preset) {
                                                setExecutionConfig(c => ({ ...c, viewport: { width: preset.width, height: preset.height } }));
                                            }
                                        }}
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                                    >
                                        {VIEWPORT_PRESETS.map((preset) => (
                                            <option key={preset.name} value={`${preset.width}x${preset.height}`}>
                                                {preset.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Debug Options */}
                                <div>
                                    <label className="block text-sm text-gray-300 mb-2">Debug Options</label>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={executionConfig.slowMo > 0}
                                                onChange={(e) => setExecutionConfig(c => ({ ...c, slowMo: e.target.checked ? 500 : 0 }))}
                                                className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                                            />
                                            <span className="text-sm text-gray-300">Slow Motion (500ms)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={executionConfig.pauseOnFailure}
                                                onChange={(e) => setExecutionConfig(c => ({ ...c, pauseOnFailure: e.target.checked }))}
                                                className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                                            />
                                            <span className="text-sm text-gray-300">Pause on Failure</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={executionConfig.screenshotOnFailure}
                                                onChange={(e) => setExecutionConfig(c => ({ ...c, screenshotOnFailure: e.target.checked }))}
                                                className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                                            />
                                            <span className="text-sm text-gray-300">Screenshot on Failure</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={executionConfig.recordVideo}
                                                onChange={(e) => setExecutionConfig(c => ({ ...c, recordVideo: e.target.checked }))}
                                                className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                                            />
                                            <span className="text-sm text-gray-300">Record Video</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Parallel Workers */}
                                <div>
                                    <label className="block text-sm text-gray-300 mb-2">
                                        Parallel Workers: {executionConfig.workers}
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="8"
                                        value={executionConfig.workers}
                                        onChange={(e) => setExecutionConfig(c => ({ ...c, workers: parseInt(e.target.value) }))}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>1</span>
                                        <span>4</span>
                                        <span>8</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Advanced Tab */}
                        {configTab === 'advanced' && (
                            <div className="space-y-4">
                                {/* Timeout */}
                                <div>
                                    <label className="block text-sm text-gray-300 mb-1">Timeout (ms)</label>
                                    <input
                                        type="number"
                                        value={executionConfig.timeout}
                                        onChange={(e) => setExecutionConfig(c => ({ ...c, timeout: parseInt(e.target.value) || 30000 }))}
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                                    />
                                </div>

                                {/* Retries */}
                                <div>
                                    <label className="block text-sm text-gray-300 mb-1">Retries on Failure</label>
                                    <select
                                        value={executionConfig.retries}
                                        onChange={(e) => setExecutionConfig(c => ({ ...c, retries: parseInt(e.target.value) }))}
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                                    >
                                        <option value={0}>No retries</option>
                                        <option value={1}>1 retry</option>
                                        <option value={2}>2 retries</option>
                                        <option value={3}>3 retries</option>
                                    </select>
                                </div>

                                {/* Sharding */}
                                <div className="border-t border-gray-700 pt-4">
                                    <label className="block text-sm text-gray-300 mb-2">Sharding (CI/CD)</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-500 mb-1">Shard Index</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={executionConfig.shardIndex || ''}
                                                placeholder="e.g., 1"
                                                onChange={(e) => setExecutionConfig(c => ({
                                                    ...c,
                                                    shardIndex: e.target.value ? parseInt(e.target.value) : undefined
                                                }))}
                                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-500 mb-1">Total Shards</label>
                                            <input
                                                type="number"
                                                min="2"
                                                value={executionConfig.shardTotal || ''}
                                                placeholder="e.g., 3"
                                                onChange={(e) => setExecutionConfig(c => ({
                                                    ...c,
                                                    shardTotal: e.target.value ? parseInt(e.target.value) : undefined
                                                }))}
                                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Leave empty for single-machine execution.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowConfigModal(false)}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Production Environment Warning Modal */}
            {showProductionWarning && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 w-96 shadow-xl border border-red-600">
                        <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Production Environment
                        </h3>
                        <p className="text-gray-300 mb-4">
                            You are about to switch to <span className="text-red-400 font-semibold">Production</span> environment.
                            Tests will run against live production systems.
                        </p>
                        <p className="text-sm text-yellow-500 mb-6">
                            ⚠️ Exercise caution to avoid unintended side effects.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowProductionWarning(false);
                                    setPendingEnvironment(null);
                                }}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (pendingEnvironment) {
                                        setExecutionConfig(c => ({ ...c, environment: pendingEnvironment }));
                                    }
                                    setShowProductionWarning(false);
                                    setPendingEnvironment(null);
                                }}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
                            >
                                Confirm Switch
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Environment Manager Modal (Postman-style) */}
            {showEnvManager && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg w-[700px] max-h-[80vh] shadow-xl border border-gray-600 flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-gray-700">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Globe className="w-5 h-5" />
                                Manage Environments
                            </h3>
                            <button
                                onClick={() => setShowEnvManager(false)}
                                className="text-gray-400 hover:text-white text-xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {environments.map((env, envIndex) => (
                                <div key={env.name} className="mb-6 last:mb-0">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: env.color }}
                                        />
                                        <span className="text-white font-medium">{env.name}</span>
                                        {env.protected && (
                                            <span className="text-xs text-yellow-500 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Protected
                                            </span>
                                        )}
                                        <span className="text-xs text-gray-500">
                                            ({env.variables.filter(v => v.enabled).length} variables)
                                        </span>
                                    </div>

                                    <div className="bg-gray-900 rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-700">
                                                    <th className="w-8 px-2 py-1"></th>
                                                    <th className="text-left px-3 py-1 text-gray-400 font-medium">Variable</th>
                                                    <th className="text-left px-3 py-1 text-gray-400 font-medium">Value</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {env.variables.map((variable, varIndex) => (
                                                    <tr key={varIndex} className="border-t border-gray-800">
                                                        <td className="px-2 py-1.5 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={variable.enabled}
                                                                onChange={(e) => {
                                                                    const newEnvs = [...environments];
                                                                    newEnvs[envIndex].variables[varIndex].enabled = e.target.checked;
                                                                    setEnvironments(newEnvs);
                                                                }}
                                                                className="w-3.5 h-3.5 rounded"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-1.5">
                                                            <input
                                                                type="text"
                                                                value={variable.key}
                                                                onChange={(e) => {
                                                                    const newEnvs = [...environments];
                                                                    newEnvs[envIndex].variables[varIndex].key = e.target.value;
                                                                    setEnvironments(newEnvs);
                                                                }}
                                                                className="w-full bg-transparent text-white border-none outline-none text-sm"
                                                                placeholder="key"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-1.5">
                                                            <input
                                                                type="text"
                                                                value={variable.value}
                                                                onChange={(e) => {
                                                                    const newEnvs = [...environments];
                                                                    newEnvs[envIndex].variables[varIndex].value = e.target.value;
                                                                    setEnvironments(newEnvs);
                                                                }}
                                                                className={`w-full bg-transparent border-none outline-none text-sm ${variable.enabled ? 'text-green-400' : 'text-gray-500'
                                                                    }`}
                                                                placeholder="value"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        <button
                                            onClick={() => {
                                                const newEnvs = [...environments];
                                                newEnvs[envIndex].variables.push({ key: '', value: '', enabled: true });
                                                setEnvironments(newEnvs);
                                            }}
                                            className="w-full text-left px-3 py-1.5 text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
                                        >
                                            + Add variable
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center p-4 border-t border-gray-700">
                            <p className="text-xs text-gray-500">
                                Use <code className="bg-gray-700 px-1 rounded">{'{{variableName}}'}</code> in your tests
                            </p>
                            <button
                                onClick={() => setShowEnvManager(false)}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Run Configuration Modal - New comprehensive configuration */}
            {showRunConfigModal && (
                <RunConfigurationModal
                    isOpen={showRunConfigModal}
                    onClose={() => setShowRunConfigModal(false)}
                    configuration={configurations.find(c => c.id === selectedConfigId) || null}
                    configurations={configurations}
                    environments={runConfigEnvironments}
                    availableTags={availableTags}
                    onSave={async (data) => {
                        if (selectedConfigId) {
                            await updateConfiguration(selectedConfigId, data);
                        }
                    }}
                    onCreate={async (data) => {
                        try {
                            const createdConfig = await createConfiguration(data);
                            addConsoleOutput('✓ Configuration created successfully');
                            return createdConfig;
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : 'Failed to create configuration';
                            addConsoleOutput(`✗ ${errorMessage}`);
                            console.error('Failed to create configuration:', error);
                        }
                    }}
                    onDelete={async (id) => {
                        await deleteConfiguration(id);
                    }}
                    onDuplicate={async (id, name) => {
                        await duplicateConfiguration(id, name);
                    }}
                    onSelect={(id) => selectConfiguration(id)}
                    onRun={(config) => {
                        setShowRunConfigModal(false);
                        selectConfiguration(config.id);
                        // Check if target is GitHub Actions
                        if (config.target === 'github-actions') {
                            // Trigger GitHub Actions run with config settings
                            runOnGitHub({
                                browser: (config.browser || 'chromium') as 'chromium' | 'firefox' | 'webkit',
                                browsers: [config.browser || 'chromium'],
                                workers: config.workers || 2,
                                shards: config.shardCount || 1,
                            });
                        } else {
                            runCurrentFile();
                        }
                    }}
                    onCreateEnvironment={async (data) => {
                        await createEnvironment(data);
                    }}
                    isLoading={false}
                />
            )}

            {/* New Application Modal */}
            {showNewProjectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-xl w-[450px] shadow-2xl border border-gray-700 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gradient-to-r from-purple-600/20 to-blue-600/20">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                                    <Briefcase className="w-4 h-4 text-white" />
                                </div>
                                Create New Application
                            </h3>
                            <button
                                onClick={() => {
                                    setShowNewProjectModal(false);
                                    setNewProjectName('');
                                    setNewProjectDescription('');
                                }}
                                className="p-1 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Application Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    placeholder="e.g., E-Commerce Tests, API Automation"
                                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newProjectName.trim()) {
                                            handleCreateProject();
                                        }
                                    }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Description <span className="text-gray-500">(optional)</span>
                                </label>
                                <textarea
                                    value={newProjectDescription}
                                    onChange={(e) => setNewProjectDescription(e.target.value)}
                                    placeholder="Briefly describe what this application is for..."
                                    rows={3}
                                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                                />
                            </div>

                            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                                <div className="flex items-start gap-2 text-sm text-gray-400">
                                    <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>
                                        Applications help you organize test flows, configurations, and team collaboration. You can create workflows within applications.
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700 bg-gray-800/50">
                            <button
                                onClick={() => {
                                    setShowNewProjectModal(false);
                                    setNewProjectName('');
                                    setNewProjectDescription('');
                                }}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateProject}
                                disabled={!newProjectName.trim() || isCreatingProject}
                                className={`px-5 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${!newProjectName.trim() || isCreatingProject
                                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/20'
                                    }`}
                            >
                                {isCreatingProject ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        Create Application
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename Application Modal */}
            {showRenameProjectModal && currentProject && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-xl w-[450px] shadow-2xl border border-gray-700 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <Pencil className="w-4 h-4 text-white" />
                                </div>
                                Rename Application
                            </h3>
                            <button
                                onClick={() => {
                                    setShowRenameProjectModal(false);
                                    setRenameProjectName('');
                                }}
                                className="p-1 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Application Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={renameProjectName}
                                    onChange={(e) => setRenameProjectName(e.target.value)}
                                    placeholder="Enter new application name"
                                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && renameProjectName.trim()) {
                                            handleRenameProject();
                                        }
                                    }}
                                />
                            </div>

                            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                                <div className="flex items-start gap-2 text-sm text-gray-400">
                                    <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>
                                        Renaming the application will update its display name. All workflows and test flows will remain associated with this application.
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700 bg-gray-800/50">
                            <button
                                onClick={() => {
                                    setShowRenameProjectModal(false);
                                    setRenameProjectName('');
                                }}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRenameProject}
                                disabled={!renameProjectName.trim() || isRenamingProject || renameProjectName.trim() === currentProject.name}
                                className={`px-5 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${!renameProjectName.trim() || isRenamingProject || renameProjectName.trim() === currentProject.name
                                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/20'
                                    }`}
                            >
                                {isRenamingProject ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Renaming...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Rename Application
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Project Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirmProject !== null}
                title="Delete Project"
                message={`Are you sure you want to delete "${deleteConfirmProject?.name}"? This action cannot be undone. All files and test flows in this project will be permanently removed.`}
                confirmLabel="Delete Project"
                cancelLabel="Cancel"
                variant="danger"
                onConfirm={() => {
                    if (deleteConfirmProject) {
                        handleDeleteProject(deleteConfirmProject.id);
                    }
                }}
                onCancel={() => setDeleteConfirmProject(null)}
            />

            {/* New Project Modal (for creating projects inside application) */}
            <NewProjectModal
                isOpen={showNewInnerProjectModal}
                existingProjects={((currentProject as any)?.projects || []).map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                }))}
                onClose={() => setShowNewInnerProjectModal(false)}
                onCreate={handleCreateInnerProject}
            />

            {/* GitHub Run Modal */}
            <GitHubRunModal
                isOpen={showGitHubRunModal}
                onClose={() => setShowGitHubRunModal(false)}
                onRun={runOnGitHub}
                fileName={selectedFile ?? undefined}
                isConnected={isGitHubConnected()}
            />
        </div>
    );
}
