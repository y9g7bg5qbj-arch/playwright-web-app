import { useState, useEffect, useCallback, useRef, type MutableRefObject } from 'react';
import type { FileNode } from './ExplorerPanel.js';
import { convertApiFilesToFileNodes } from './workspaceFileUtils.js';

const API_BASE = '/api';

export interface OpenTab {
  id: string;
  path: string;
  name: string;
  content: string;
  hasChanges: boolean;
  type?: 'file' | 'compare' | 'image' | 'binary';
  contentType?: string;
  isBinary?: boolean;
  // Compare-specific fields
  compareSource?: string;
  compareTarget?: string;
  projectId?: string;
}

export interface FileContextMenuState {
  x: number;
  y: number;
  filePath: string;
  fileName: string;
  projectId?: string;
  relativePath?: string;
  veroPath?: string;
}

/** Minimal project shape from store — avoids depending on the fully-derived NestedProject. */
interface StoreProject {
  id: string;
  name: string;
  veroPath?: string;
}

export interface UseFileManagementParams {
  /** Raw project list from store (without files merged in). */
  currentProjectProjects: StoreProject[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  addConsoleOutput: (message: string) => void;
  getAuthHeaders: (extraHeaders?: Record<string, string>) => Record<string, string>;
  /** The currentProject from the store — used to gate loadProjectFiles. */
  currentProject: { id: string; name: string } | undefined;
}

export interface UseFileManagementReturn {
  openTabs: OpenTab[];
  setOpenTabs: React.Dispatch<React.SetStateAction<OpenTab[]>>;
  activeTabId: string | null;
  setActiveTabId: (id: string | null) => void;
  activeTab: OpenTab | undefined;
  selectedFile: string | null;
  expandedFolders: Set<string>;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
  projectFiles: Record<string, FileNode[]>;
  setProjectFiles: React.Dispatch<React.SetStateAction<Record<string, FileNode[]>>>;
  contextMenu: FileContextMenuState | null;
  setContextMenu: (menu: FileContextMenuState | null) => void;
  activeTabIdRef: MutableRefObject<string | null>;
  loadFileContent: (filePath: string, projectId?: string) => Promise<void>;
  saveFileContent: (content: string) => Promise<void>;
  updateTabContent: (tabId: string, content: string) => void;
  closeTab: (tabId: string) => void;
  handleFileSelect: (file: FileNode, projectId?: string) => void;
  handleFolderToggle: (path: string) => void;
  handleDeleteFile: (filePath: string) => Promise<void>;
  handleRenameFile: (filePath: string) => Promise<void>;
  handleCreateFile: (projectId: string, folderPath: string) => Promise<void>;
  handleFileContextMenu: (file: FileNode, projectId: string | undefined, x: number, y: number) => void;
  loadProjectFiles: (projectId: string, veroPath?: string) => Promise<void>;
  resolveProjectForPath: (filePath: string, preferredProjectId?: string | null) => StoreProject | undefined;
  toRelativePath: (filePath: string, project?: StoreProject) => string;
  toFullPath: (filePath: string, project?: StoreProject) => string;
  encodePathSegments: (path: string) => string;
  toDevRootPath: (basePath?: string) => string | undefined;
}

export function useFileManagement({
  currentProjectProjects,
  selectedProjectId,
  setSelectedProjectId,
  addConsoleOutput,
  getAuthHeaders,
  currentProject,
}: UseFileManagementParams): UseFileManagementReturn {
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['proj:default', 'data', 'features', 'pages']));
  const [projectFiles, setProjectFiles] = useState<Record<string, FileNode[]>>({});
  const [contextMenu, setContextMenu] = useState<FileContextMenuState | null>(null);

  const activeTabIdRef = useRef<string | null>(null);

  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  const toDevRootPath = useCallback((basePath?: string) => {
    if (!basePath) {
      return undefined;
    }
    return `${basePath.replace(/[\\/]+$/, '')}/dev`;
  }, []);

  const resolveProjectForPath = useCallback((filePath: string, preferredProjectId?: string | null) => {
    if (preferredProjectId) {
      const projectById = currentProjectProjects.find(p => p.id === preferredProjectId);
      if (projectById) return projectById;
    }

    const projectByPath = currentProjectProjects.find(
      p => p.veroPath && filePath.startsWith(`${p.veroPath}/`)
    );
    if (projectByPath) {
      return projectByPath;
    }

    if (selectedProjectId) {
      return currentProjectProjects.find(p => p.id === selectedProjectId);
    }

    return undefined;
  }, [currentProjectProjects, selectedProjectId]);

  const toRelativePath = useCallback((filePath: string, project?: StoreProject) => {
    if (!project?.veroPath) {
      return filePath.replace(/^\/+/, '');
    }
    if (filePath.startsWith(`${project.veroPath}/`)) {
      return filePath.slice(project.veroPath.length + 1);
    }
    return filePath.replace(/^\/+/, '');
  }, []);

  const toFullPath = useCallback((filePath: string, project?: StoreProject) => {
    if (!project?.veroPath) {
      return filePath;
    }

    if (filePath.startsWith(`${project.veroPath}/`)) {
      return filePath;
    }

    return `${project.veroPath}/${filePath.replace(/^\/+/, '')}`;
  }, []);

  const encodePathSegments = useCallback((path: string) => {
    return path
      .split('/')
      .filter(Boolean)
      .map(segment => encodeURIComponent(segment))
      .join('/');
  }, []);

  // Derived state for compatibility
  const activeTab = openTabs.find(tab => tab.id === activeTabId);
  const selectedFile = (() => {
    if (!activeTab) {
      return null;
    }

    const activeProject = resolveProjectForPath(activeTab.path, activeTab.projectId || undefined);
    return toRelativePath(activeTab.path, activeProject);
  })();

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
  }, [currentProject, getAuthHeaders, addConsoleOutput]);

  // API: Load file content (opens in new tab or switches to existing tab)
  const loadFileContent = async (filePath: string, projectId?: string) => {
    const project = resolveProjectForPath(filePath, projectId);
    const relativePath = toRelativePath(filePath, project);
    const fullPath = toFullPath(relativePath, project);

    // Check if file is already open in a tab
    const existingTab = openTabs.find(tab => tab.path === fullPath);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    // Create new tab
    const fileName = relativePath.split('/').pop() || 'Untitled';
    const tabId = `tab-${Date.now()}`;

    try {
      const encodedPath = encodePathSegments(relativePath);
      let apiUrl: string;
      if (project?.veroPath && encodedPath) {
        apiUrl = `${API_BASE}/vero/files/${encodedPath}?veroPath=${encodeURIComponent(project.veroPath)}`;
      } else {
        const fallbackPath = encodePathSegments(filePath);
        apiUrl = `${API_BASE}/vero/files/${fallbackPath}`;
      }

      const response = await fetch(apiUrl, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const data = await response.json();
      const hasContent = Object.prototype.hasOwnProperty.call(data, 'content');

      if (response.ok && data.success && hasContent) {
        const isBinary = data.isBinary === true;
        const contentType = typeof data.contentType === 'string' ? data.contentType : undefined;
        const tabType: OpenTab['type'] = isBinary
          ? (contentType?.startsWith('image/') ? 'image' : 'binary')
          : 'file';

        const newTab: OpenTab = {
          id: tabId,
          path: fullPath,
          name: fileName,
          content: data.content,
          hasChanges: false,
          type: tabType,
          contentType,
          isBinary,
          projectId: project?.id || projectId,
        };
        setOpenTabs(prev => [...prev, newTab]);
        setActiveTabId(tabId);
      } else {
        addConsoleOutput(`Error: Failed to load ${fileName}: ${data.error || `HTTP ${response.status}`}`);
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
    if (activeTab.type === 'image' || activeTab.type === 'binary') {
      addConsoleOutput(`Resource files are read-only in editor: ${activeTab.name}`);
      return;
    }

    try {
      const project = resolveProjectForPath(activeTab.path, activeTab.projectId || selectedProjectId);
      const relativePath = toRelativePath(activeTab.path, project);
      const encodedPath = encodePathSegments(relativePath);

      let apiUrl: string;
      if (project?.veroPath && encodedPath) {
        apiUrl = `${API_BASE}/vero/files/${encodedPath}?veroPath=${encodeURIComponent(project.veroPath)}`;
      } else {
        apiUrl = `${API_BASE}/vero/files/${encodePathSegments(activeTab.path)}`;
      }

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      if (data.success) {
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

  const handleFileSelect = (file: FileNode, projectId?: string) => {
    if (file.type === 'file') {
      if (projectId) {
        setSelectedProjectId(projectId);
      }
      loadFileContent(file.path, projectId);
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

  const handleDeleteFile = async (filePath: string) => {
    if (!contextMenu) return;

    const fileName = contextMenu.fileName;
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;

    try {
      const relativePath = contextMenu.relativePath || fileName;
      const params = new URLSearchParams();
      if (contextMenu.veroPath) params.set('veroPath', contextMenu.veroPath);

      const response = await fetch(`${API_BASE}/vero/files/${encodePathSegments(relativePath)}?${params}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        addConsoleOutput(`Deleted ${fileName}`);

        const matchingTab = openTabs.find(t => t.path === filePath);
        if (matchingTab) {
          setOpenTabs(prev => prev.filter(t => t.id !== matchingTab.id));
          if (activeTabId === matchingTab.id) {
            const remaining = openTabs.filter(t => t.id !== matchingTab.id);
            setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
          }
        }

        const projId = contextMenu.projectId || selectedProjectId;
        const project = currentProjectProjects.find(p => p.id === projId);
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

  const handleRenameFile = async (_filePath: string) => {
    if (!contextMenu) return;

    const oldName = contextMenu.fileName;
    const newName = prompt('Enter new name:', oldName);
    if (!newName || newName === oldName) return;

    try {
      const relativePath = contextMenu.relativePath || oldName;
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
        const project = currentProjectProjects.find(p => p.id === projId);
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

  const handleCreateFile = async (projectId: string, folderPath: string) => {
    const project = currentProjectProjects.find(p => p.id === projectId);
    if (!project?.veroPath) {
      addConsoleOutput('Error: Could not find project path');
      return;
    }

    const fileName = prompt('Enter file name (e.g., MyTest.vero):');
    if (!fileName || !fileName.trim()) {
      return;
    }

    let finalFileName = fileName.trim();
    const isFeatureFolder = folderPath.toLowerCase().includes('feature');
    if (isFeatureFolder && !finalFileName.endsWith('.vero') && !finalFileName.endsWith('.json')) {
      finalFileName += '.vero';
    }

    let defaultContent = '';
    if (finalFileName.endsWith('.vero')) {
      const featureName = finalFileName.replace('.vero', '');
      defaultContent = `FEATURE ${featureName} {
  SCENARIO NewScenario @smoke {
    OPEN "https://example.com"
  }
}
`;
    } else if (finalFileName.endsWith('.json')) {
      defaultContent = '{\n  \n}\n';
    }

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

        await loadProjectFiles(projectId, project.veroPath);

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

  const handleFileContextMenu = (file: FileNode, projectId: string | undefined, x: number, y: number) => {
    const project = currentProjectProjects.find(p => p.id === projectId);
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

  return {
    openTabs,
    setOpenTabs,
    activeTabId,
    setActiveTabId,
    activeTab,
    selectedFile,
    expandedFolders,
    setExpandedFolders,
    projectFiles,
    setProjectFiles,
    contextMenu,
    setContextMenu,
    activeTabIdRef,
    loadFileContent,
    saveFileContent,
    updateTabContent,
    closeTab,
    handleFileSelect,
    handleFolderToggle,
    handleDeleteFile,
    handleRenameFile,
    handleCreateFile,
    handleFileContextMenu,
    loadProjectFiles,
    resolveProjectForPath,
    toRelativePath,
    toFullPath,
    encodePathSegments,
    toDevRootPath,
  };
}
