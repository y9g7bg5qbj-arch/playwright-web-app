import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Play,
  Save,
  Settings,
  Plus,
  Search,
  X,
  Home,
  Terminal,
  AlertCircle,
  PanelBottomClose,
  PanelBottomOpen,
  RefreshCw,
  Trash2,
  Bug,
  Loader2,
} from 'lucide-react';
import { VeroEditor } from '@/components/vero/VeroEditor';
import { useProjectStore } from '@/store/projectStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { veroApi, VeroFileNode } from '@/api/vero';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  isExpanded?: boolean;
}

interface ConsoleMessage {
  id: string;
  type: 'info' | 'error' | 'warning' | 'success';
  message: string;
  timestamp: Date;
}

export function EditorPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');

  const { currentProject, projects, setCurrentProject } = useProjectStore();
  const { fetchWorkflows } = useWorkflowStore();

  // Editor state
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [openTabs, setOpenTabs] = useState<{ id: string; name: string; path: string; content: string }[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // UI state
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [consoleHeight] = useState(200);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);

  // File tree state
  const [fileTree, setFileTree] = useState<FileNode[]>([]);

  // Helper to convert VeroFileNode to FileNode with IDs
  const convertToFileNode = useCallback((nodes: VeroFileNode[], parentId = ''): FileNode[] => {
    return nodes.map((node, index) => {
      const id = parentId ? `${parentId}-${index}` : `${index}`;
      return {
        id,
        name: node.name,
        type: node.type === 'directory' ? 'folder' : 'file',
        path: node.path,
        isExpanded: false,
        children: node.children ? convertToFileNode(node.children, id) : undefined,
      };
    });
  }, []);

  // Load files from API
  const loadFiles = useCallback(async () => {
    if (!currentProject?.id) return;

    setIsLoadingFiles(true);
    try {
      // Use project's veroPath if available (from nested projects)
      const veroPath = currentProject.projects?.[0]?.veroPath;
      const files = await veroApi.listFiles(currentProject.id, veroPath);
      const fileNodes = convertToFileNode(files);
      // Auto-expand first level
      fileNodes.forEach(node => { node.isExpanded = true; });
      setFileTree(fileNodes);
    } catch (error) {
      console.error('Failed to load files:', error);
      setConsoleMessages(prev => [...prev, {
        id: `${Date.now()}`,
        type: 'error',
        message: `Failed to load files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [currentProject?.id, currentProject?.projects, convertToFileNode]);

  // Load project data
  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setCurrentProject(project);
      }
    }
    fetchWorkflows();
  }, [projectId, projects, setCurrentProject, fetchWorkflows]);

  // Load files when project changes
  useEffect(() => {
    if (currentProject?.id) {
      loadFiles();
    }
  }, [currentProject?.id, loadFiles]);

  // File tree toggle
  const toggleFolder = (nodeId: string) => {
    setFileTree(prev => {
      const toggle = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.id === nodeId) {
            return { ...node, isExpanded: !node.isExpanded };
          }
          if (node.children) {
            return { ...node, children: toggle(node.children) };
          }
          return node;
        });
      };
      return toggle(prev);
    });
  };

  // Open file
  const openFile = async (node: FileNode) => {
    if (node.type === 'folder') {
      toggleFolder(node.id);
      return;
    }

    // Check if already open
    const existingTab = openTabs.find(tab => tab.id === node.id);
    if (existingTab) {
      setActiveTabId(node.id);
      setSelectedFile(node.path);
      setFileContent(existingTab.content);
      setOriginalContent(existingTab.content);
      setIsDirty(false);
      return;
    }

    // Load file content from API
    setIsLoadingContent(true);
    try {
      const content = await veroApi.getFileContent(node.path, currentProject?.id);

      // Add new tab with content
      setOpenTabs(prev => [...prev, { id: node.id, name: node.name, path: node.path, content }]);
      setActiveTabId(node.id);
      setSelectedFile(node.path);
      setFileContent(content);
      setOriginalContent(content);
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to load file:', error);
      setConsoleMessages(prev => [...prev, {
        id: `${Date.now()}`,
        type: 'error',
        message: `Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Close tab
  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs(prev => prev.filter(tab => tab.id !== tabId));
    if (activeTabId === tabId) {
      const remaining = openTabs.filter(tab => tab.id !== tabId);
      if (remaining.length > 0) {
        const lastTab = remaining[remaining.length - 1];
        setActiveTabId(lastTab.id);
        setSelectedFile(lastTab.path);
        setFileContent(lastTab.content);
        setOriginalContent(lastTab.content);
        setIsDirty(false);
      } else {
        setActiveTabId(null);
        setSelectedFile(null);
        setFileContent('');
        setOriginalContent('');
        setIsDirty(false);
      }
    }
  };

  // Run test
  const runTest = async () => {
    if (!selectedFile) return;

    setIsRunning(true);
    setConsoleMessages([]);
    setIsConsoleOpen(true);

    const addMessage = (type: ConsoleMessage['type'], message: string) => {
      setConsoleMessages(prev => [...prev, {
        id: `${Date.now()}-${Math.random()}`,
        type,
        message,
        timestamp: new Date(),
      }]);
    };

    addMessage('info', `Starting test execution: ${selectedFile}`);

    try {
      // Save file first if dirty
      if (isDirty) {
        addMessage('info', 'Saving changes...');
        await veroApi.saveFile(selectedFile, fileContent, currentProject?.id);
        setIsDirty(false);
        setOriginalContent(fileContent);
        // Update tab content
        setOpenTabs(prev => prev.map(tab =>
          tab.path === selectedFile ? { ...tab, content: fileContent } : tab
        ));
      }

      addMessage('info', 'Transpiling Vero to Playwright...');

      const result = await veroApi.runTest({
        filePath: selectedFile,
        content: fileContent,
        config: { browserMode: 'headed' },
      });

      // Parse output and add messages
      if (result.output) {
        const lines = result.output.split('\n').filter(line => line.trim());
        for (const line of lines) {
          if (line.includes('passed') || line.includes('✓')) {
            addMessage('success', line);
          } else if (line.includes('failed') || line.includes('✗') || line.includes('error')) {
            addMessage('error', line);
          } else {
            addMessage('info', line);
          }
        }
      }

      if (result.status === 'passed') {
        addMessage('success', `✓ Test passed${result.executionId ? ` (Execution ID: ${result.executionId})` : ''}`);
      } else if (result.status === 'failed') {
        addMessage('error', `✗ Test failed: ${result.error || 'Unknown error'}`);
      } else if (result.status === 'timeout') {
        addMessage('warning', '⏱ Test timed out');
      }
    } catch (error) {
      addMessage('error', `Failed to run test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Save file
  const saveFile = async () => {
    if (!selectedFile || !isDirty) return;

    setIsSaving(true);
    try {
      await veroApi.saveFile(selectedFile, fileContent, currentProject?.id);
      setIsDirty(false);
      setOriginalContent(fileContent);
      // Update tab content
      setOpenTabs(prev => prev.map(tab =>
        tab.path === selectedFile ? { ...tab, content: fileContent } : tab
      ));
      setConsoleMessages(prev => [...prev, {
        id: `${Date.now()}`,
        type: 'success',
        message: `File saved: ${selectedFile}`,
        timestamp: new Date(),
      }]);
    } catch (error) {
      setConsoleMessages(prev => [...prev, {
        id: `${Date.now()}`,
        type: 'error',
        message: `Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsSaving(false);
    }
  };

  // Render file tree node
  const renderFileNode = (node: FileNode, depth = 0) => {
    const isFolder = node.type === 'folder';
    const isSelected = selectedFile === node.path;

    return (
      <div key={node.id}>
        <button
          onClick={() => openFile(node)}
          className={`w-full flex items-center gap-1.5 px-2 py-1 text-sm transition-colors ${
            isSelected
              ? 'bg-accent-blue/20 text-accent-blue'
              : 'text-text-secondary hover:bg-dark-elevated hover:text-text-primary'
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isFolder ? (
            node.isExpanded ? (
              <>
                <ChevronDown className="w-4 h-4 shrink-0" />
                <FolderOpen className="w-4 h-4 shrink-0 text-accent-yellow" />
              </>
            ) : (
              <>
                <ChevronRight className="w-4 h-4 shrink-0" />
                <Folder className="w-4 h-4 shrink-0 text-accent-yellow" />
              </>
            )
          ) : (
            <>
              <span className="w-4" />
              <File className="w-4 h-4 shrink-0 text-text-muted" />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {isFolder && node.isExpanded && node.children && (
          <div>
            {node.children.map(child => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-dark-bg text-text-primary">
      {/* Top Toolbar */}
      <header className="h-12 bg-dark-card border-b border-border-default flex items-center px-4 gap-3 shrink-0">
        {/* Logo & Home */}
        <Link to="/" className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">V</span>
          </div>
        </Link>

        <div className="h-6 w-px bg-border-default" />

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm">
          <Link to="/" className="text-text-muted hover:text-text-primary transition-colors">
            <Home className="w-4 h-4" />
          </Link>
          <ChevronRight className="w-4 h-4 text-text-muted" />
          <span className="text-text-secondary">{currentProject?.name || 'Project'}</span>
          {selectedFile && (
            <>
              <ChevronRight className="w-4 h-4 text-text-muted" />
              <span className="text-text-primary">{selectedFile.split('/').pop()}</span>
            </>
          )}
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={saveFile}
            disabled={!isDirty || isSaving}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isDirty && !isSaving
                ? 'bg-accent-blue text-white hover:bg-accent-blue/90'
                : 'bg-dark-elevated text-text-muted'
            }`}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Saving...' : 'Save'}
          </button>

          <div className="h-6 w-px bg-border-default" />

          <button
            onClick={runTest}
            disabled={!selectedFile || isRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !selectedFile || isRunning
                ? 'bg-dark-elevated text-text-muted cursor-not-allowed'
                : 'bg-accent-green text-white hover:bg-accent-green/90'
            }`}
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run
              </>
            )}
          </button>

          <button
            disabled={!selectedFile || isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-dark-elevated text-text-secondary hover:bg-dark-card hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Bug className="w-4 h-4" />
            Debug
          </button>

          <div className="h-6 w-px bg-border-default" />

          <button className="p-2 rounded-md hover:bg-dark-elevated text-text-muted hover:text-text-primary transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree Sidebar */}
        <aside className="w-60 bg-dark-card border-r border-border-default flex flex-col shrink-0">
          {/* Sidebar Header */}
          <div className="h-10 px-3 flex items-center justify-between border-b border-border-default">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Explorer</span>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded hover:bg-dark-elevated text-text-muted hover:text-text-primary transition-colors">
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={loadFiles}
                disabled={isLoadingFiles}
                className="p-1 rounded hover:bg-dark-elevated text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingFiles ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="p-2 border-b border-border-default">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search files..."
                className="w-full pl-8 pr-3 py-1.5 bg-dark-bg border border-border-default rounded-md text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue"
              />
            </div>
          </div>

          {/* File Tree */}
          <div className="flex-1 overflow-y-auto py-1">
            {isLoadingFiles ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
              </div>
            ) : fileTree.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-text-muted">
                <p>No Vero files found</p>
                <p className="text-xs mt-1">Create a new file to get started</p>
              </div>
            ) : (
              fileTree.map(node => renderFileNode(node))
            )}
          </div>
        </aside>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <div className="h-10 bg-dark-card border-b border-border-default flex items-center overflow-x-auto">
            {openTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTabId(tab.id);
                  setSelectedFile(tab.path);
                  setFileContent(tab.content);
                  setOriginalContent(tab.content);
                  setIsDirty(false);
                }}
                className={`group h-full px-4 flex items-center gap-2 text-sm border-r border-border-default transition-colors ${
                  activeTabId === tab.id
                    ? 'bg-dark-bg text-text-primary border-t-2 border-t-accent-blue'
                    : 'bg-dark-elevated text-text-secondary hover:bg-dark-card'
                }`}
              >
                <File className="w-4 h-4 text-text-muted" />
                <span>{tab.name}</span>
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  className="p-0.5 rounded hover:bg-dark-elevated opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </button>
            ))}
            {openTabs.length === 0 && (
              <div className="px-4 text-sm text-text-muted">No files open</div>
            )}
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden" style={{ height: isConsoleOpen ? `calc(100% - ${consoleHeight}px)` : '100%' }}>
            {isLoadingContent ? (
              <div className="h-full flex items-center justify-center bg-dark-bg">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-accent-blue mx-auto mb-4" />
                  <p className="text-text-secondary">Loading file...</p>
                </div>
              </div>
            ) : selectedFile ? (
              <div className="h-full bg-dark-bg">
                <VeroEditor
                  initialValue={fileContent}
                  onChange={(value) => {
                    setFileContent(value || '');
                    setIsDirty(value !== originalContent);
                    // Update tab content for unsaved changes
                    setOpenTabs(prev => prev.map(tab =>
                      tab.path === selectedFile ? { ...tab, content: value || '' } : tab
                    ));
                  }}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-dark-bg">
                <div className="text-center">
                  <File className="w-16 h-16 text-text-muted mx-auto mb-4" />
                  <p className="text-text-secondary mb-2">No file selected</p>
                  <p className="text-sm text-text-muted">Select a file from the explorer to start editing</p>
                </div>
              </div>
            )}
          </div>

          {/* Console Panel */}
          {isConsoleOpen && (
            <div
              className="border-t border-border-default bg-dark-card flex flex-col"
              style={{ height: `${consoleHeight}px` }}
            >
              {/* Console Header */}
              <div className="h-9 px-3 flex items-center justify-between border-b border-border-default shrink-0">
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1.5 px-2 py-1 text-sm text-accent-blue border-b-2 border-accent-blue">
                    <Terminal className="w-4 h-4" />
                    Output
                  </button>
                  <button className="flex items-center gap-1.5 px-2 py-1 text-sm text-text-muted hover:text-text-primary transition-colors">
                    <AlertCircle className="w-4 h-4" />
                    Problems
                    <span className="px-1.5 py-0.5 bg-dark-elevated rounded text-xs">0</span>
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1 rounded hover:bg-dark-elevated text-text-muted hover:text-text-primary transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsConsoleOpen(false)}
                    className="p-1 rounded hover:bg-dark-elevated text-text-muted hover:text-text-primary transition-colors"
                  >
                    <PanelBottomClose className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Console Content */}
              <div className="flex-1 overflow-y-auto p-3 font-mono text-sm">
                {consoleMessages.length === 0 ? (
                  <div className="text-text-muted">Ready to run tests...</div>
                ) : (
                  consoleMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2 py-0.5 ${
                        msg.type === 'error' ? 'text-accent-red' :
                        msg.type === 'warning' ? 'text-accent-yellow' :
                        msg.type === 'success' ? 'text-accent-green' :
                        'text-text-secondary'
                      }`}
                    >
                      <span className="text-text-muted text-xs shrink-0">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                      <span>{msg.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Console Toggle (when closed) */}
          {!isConsoleOpen && (
            <button
              onClick={() => setIsConsoleOpen(true)}
              className="h-8 border-t border-border-default bg-dark-card flex items-center justify-center gap-2 text-sm text-text-muted hover:text-text-primary hover:bg-dark-elevated transition-colors"
            >
              <PanelBottomOpen className="w-4 h-4" />
              Show Console
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
