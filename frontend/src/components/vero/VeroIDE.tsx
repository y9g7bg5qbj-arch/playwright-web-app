import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { VeroEditor } from './VeroEditor';
import { updatePageRegistry, updateTestDataRegistry } from './veroLanguage';
import {
    FileText, Play, Square, Circle,
    Save, ChevronRight, ChevronDown,
    Folder, FolderOpen, Plus, Pencil, Settings,
    Globe, Monitor, AlertTriangle, Database,
    FileSearch, Calendar, Activity,
    Container, Zap, Grid3X3, Briefcase,
    Search, Check, Trash2
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
import { ExecutionDashboard, LiveExecutionGrid, LocalExecutionViewer } from '../ExecutionDashboard';
import { SchedulerPanel } from '../Scheduler/SchedulerPanel';
import type { ShardInfo } from '../execution/LiveExecutionViewer';
import { useWorkflowStore } from '@/store/workflowStore';
import { useProjectStore } from '@/store/projectStore';

// Import RunConfigurationModal and store
import { RunConfigurationModal } from '../RunConfiguration';
import { useRunConfigStore } from '@/store/useRunConfigStore';

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
    target: 'local' | 'docker';  // Execution target

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

    // Docker-specific
    dockerShards?: number;  // Number of parallel Docker shards
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

    // Active flow state (for ProjectSidebar integration)
    const [activeFlowId, setActiveFlowId] = useState<string | undefined>();
    const [selectedDataTableId, setSelectedDataTableId] = useState<string | undefined>();
    const [showRunConfigModal, setShowRunConfigModal] = useState(false);

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
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
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
    const [activeShards, setActiveShards] = useState<ShardInfo[]>([]);
    const [executionMode, setExecutionMode] = useState<'docker' | 'local'>('local');
    const [previousView, setPreviousView] = useState<SettingsView>('explorer');

    const toggleRightPanel = (tab: RightPanelTab) => {
        setRightPanelTab(prev => prev === tab ? 'console' : tab);
    };

    // Execution dashboard handlers
    const handleViewLive = (execId: string, mode: 'docker' | 'local', shards?: ShardInfo[]) => {
        setActiveExecutionId(execId);
        setExecutionMode(mode);
        setActiveShards(shards || []);
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
    useEffect(() => {
        if (activeFlowId && workflows.length > 0) {
            const workflow = workflows.find(w => w.testFlows?.some((f: any) => f.id === activeFlowId));
            if (workflow) {
                useRunConfigStore.getState().setWorkflowId(workflow.id);
            }
        } else if (workflows.length > 0 && workflows[0].id) {
            // If no active flow, use the first workflow
            useRunConfigStore.getState().setWorkflowId(workflows[0].id);
        }
    }, [activeFlowId, workflows]);

    // Persist environments to localStorage
    useEffect(() => {
        localStorage.setItem('vero-environments', JSON.stringify(environments));
    }, [environments]);

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
                    dockerShards: 2,
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
            pauseOnFailure: false,
            dockerShards: 2
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

    const runCurrentFile = async () => {
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
                    config: executionConfig
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

    // Run tests in Docker with VNC
    const runInDocker = async (shardCountOverride?: number) => {
        if (!selectedFile || isRunning) return;

        // Use shards from parallelConfig.docker if available, otherwise use override or default
        const shardCount = shardCountOverride ?? parallelConfig.docker?.scaleMin ?? 1;

        // Save file first if dirty
        if (isDirty) {
            await saveFile();
        }

        setIsRunning(true);
        const executionId = `exec-${Date.now()}`;
        addConsoleOutput(`🐳 Starting Docker execution with ${shardCount} shard${shardCount > 1 ? 's' : ''}...`);

        try {
            // First, check Docker availability and optionally start cluster
            const statusResponse = await fetch('/api/docker/status');
            const statusData = await statusResponse.json();

            if (!statusData.success || !statusData.docker?.available) {
                addConsoleOutput(`✗ Docker is not available: ${statusData.docker?.error || 'Unknown error'}`);
                addConsoleOutput(`   Please ensure Docker Desktop is running.`);
                setIsRunning(false);
                return;
            }

            // If cluster is not running, start it with the configured shard count
            if (!statusData.cluster?.isRunning) {
                addConsoleOutput(`   Starting Docker cluster with ${shardCount} shards...`);
                const startResponse = await fetch('/api/docker/cluster/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        shardCount,
                        vncEnabled: true,
                        browsers: parallelConfig.browsers || ['chromium'],
                        maxConcurrentPerShard: 2,
                        memory: parallelConfig.docker?.environment?.MEMORY || '2G',
                        cpus: parallelConfig.docker?.environment?.CPUS || '1.0',
                    }),
                });

                const startData = await startResponse.json();
                if (!startData.success) {
                    addConsoleOutput(`✗ Failed to start Docker cluster: ${startData.error}`);
                    setIsRunning(false);
                    return;
                }

                addConsoleOutput(`✓ Docker cluster started with ${startData.cluster.healthyShards} healthy shards`);
            } else {
                addConsoleOutput(`   Using existing Docker cluster with ${statusData.cluster.healthyShards} shards`);
            }

            // Now run the tests in Docker
            const response = await fetch('/api/vero/run-docker', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filePath: selectedFile,
                    content: fileContent,
                    config: {
                        ...executionConfig,
                        target: 'docker',
                        dockerShards: shardCount,
                        browsers: parallelConfig.browsers,
                        timeout: parallelConfig.timeout,
                        maxRetries: parallelConfig.maxRetries,
                    },
                    executionId
                }),
            });

            const data = await response.json();

            if (data.success) {
                addConsoleOutput(`✓ Tests submitted to Docker cluster`);

                // Create shard info for live view
                const shards: ShardInfo[] = Array.from({ length: shardCount }, (_, i) => ({
                    id: `shard-${i + 1}`,
                    shardIndex: i,
                    totalShards: shardCount,
                    vncUrl: `http://localhost:${6081 + i}/vnc.html`,
                    status: 'running' as const,
                    currentTest: 'Starting...',
                    progress: { passed: 0, failed: 0, total: 0 }
                }));

                // Switch to live execution view
                addConsoleOutput(`📺 Opening live execution view...`);
                addConsoleOutput(`   Shard VNC URLs:`);
                shards.forEach((s, i) => {
                    addConsoleOutput(`   - Shard ${i + 1}: http://localhost:${6081 + i}/vnc.html`);
                });

                // Trigger the live view
                handleViewLive(executionId, 'docker', shards);

            } else {
                addConsoleOutput(`✗ Docker error: ${data.error}`);
                setIsRunning(false);
            }
        } catch (error) {
            addConsoleOutput(`✗ Failed to start Docker: ${error}`);
            setIsRunning(false);
        }
    };

    // Legacy run handlers (kept for compatibility)
    const handleRunScenario = async (scenarioName: string) => {
        addConsoleOutput(`▶ Running scenario: ${scenarioName}`);
        await runCurrentFile();
    };

    const handleRunFeature = async (featureName: string) => {
        addConsoleOutput(`▶ Running feature: ${featureName}`);
        await runCurrentFile();
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
                                                        className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
                                                            currentProject?.id === project.id
                                                                ? 'bg-blue-600/20 border border-blue-500'
                                                                : 'hover:bg-gray-800 border border-transparent'
                                                        }`}
                                                    >
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                            currentProject?.id === project.id
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
                                                                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${
                                                                                activeFlowId === flow.id
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
                                    onClick={runCurrentFile}
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
                                            setExecutionConfig(c => ({ ...c, browserMode: 'headed', slowMo: 500, pauseOnFailure: true }));
                                            runCurrentFile();
                                            setShowRunDropdown(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-700"
                                    >
                                        <span className="w-4 text-center">🐛</span>
                                        Run with Debug
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                        activeSettingsView === 'executions' || activeSettingsView === 'live-execution'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                    }`}
                    title="Execution History"
                >
                    <Activity className="w-4 h-4" />
                    <span className="hidden lg:inline">Execution</span>
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
                                        />
                                    </div>
                                </div>
                            ) : (
                                /* Normal editor */
                                <div className="flex-1 min-h-0">
                                    {selectedFile ? (
                                        <VeroEditor
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
                                canScale={parallelConfig.mode === 'docker' || parallelConfig.mode === 'remote'}
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
                            onViewLive={handleViewLive}
                            onViewTrace={handleViewTrace}
                            onBack={handleExecutionBack}
                        />
                    )}

                    {/* Live Execution View in Canvas */}
                    {activeSettingsView === 'live-execution' && activeExecutionId && (
                        executionMode === 'docker' ? (
                            <LiveExecutionGrid
                                executionId={activeExecutionId}
                                shards={activeShards}
                                mode={executionMode}
                                onBack={handleExecutionBack}
                            />
                        ) : (
                            <LocalExecutionViewer
                                executionId={activeExecutionId}
                                onBack={handleExecutionBack}
                            />
                        )
                    )}
                </div>
            </div>

            {/* Recording Dialog Modal */}
            {
                showRecordingDialog && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-gray-800 rounded-lg p-6 w-96 shadow-xl border border-gray-600">
                            <h3 className="text-lg font-semibold mb-4 text-white">➕ Add New Scenario</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-300 mb-1">Scenario Name</label>
                                    <input
                                        type="text"
                                        value={recordingScenarioName}
                                        onChange={(e) => setRecordingScenarioName(e.target.value)}
                                        placeholder="e.g., Login with valid credentials"
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && recordingScenarioName.trim() && createEmptyScenario()}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-300 mb-1">Start URL (for recording)</label>
                                    <input
                                        type="text"
                                        value={recordingStartUrl}
                                        onChange={(e) => setRecordingStartUrl(e.target.value)}
                                        placeholder="https://example.com"
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500"
                                        onKeyDown={(e) => e.key === 'Enter' && recordingScenarioName.trim() && createEmptyScenario()}
                                    />
                                </div>

                                <p className="text-xs text-gray-400">
                                    Choose "Start Recording" to capture browser actions with auto-generated page objects, or "Add Empty" to create a scenario manually.
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    onClick={() => setShowRecordingDialog(false)}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={createEmptyScenario}
                                    disabled={!recordingScenarioName.trim()}
                                    className={`px-4 py-2 rounded text-sm flex items-center gap-2 ${recordingScenarioName.trim()
                                        ? 'bg-gray-700 hover:bg-gray-600 border border-gray-500'
                                        : 'bg-gray-600 text-gray-400'
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
                                    disabled={!recordingScenarioName.trim()}
                                    className={`px-4 py-2 rounded text-sm flex items-center gap-2 ${recordingScenarioName.trim()
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-gray-600 text-gray-400'
                                        }`}
                                >
                                    <Circle className="w-4 h-4" />
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
                        runCurrentFile();
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
                                className={`px-5 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                                    !newProjectName.trim() || isCreatingProject
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
                                className={`px-5 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                                    !renameProjectName.trim() || isRenamingProject || renameProjectName.trim() === currentProject.name
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
        </div>
    );
}
