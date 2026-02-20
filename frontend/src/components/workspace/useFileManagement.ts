import { useState, useEffect, useCallback, useRef } from 'react';
import type { FileNode } from './ExplorerPanel.js';
import { convertApiFilesToFileNodes } from './workspaceFileUtils.js';
import { useSandboxStore, getEnvironmentFolder } from '@/store/sandboxStore';
import type { OpenTab, FileContextMenuState } from './workspace.types.js';

// Re-export shared types so existing imports from this module keep working.
export type { OpenTab, FileContextMenuState } from './workspace.types.js';

const API_BASE = '/api';

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
  // ─── Read-only state ────────────────────────────────────────
  openTabs: OpenTab[];
  activeTabId: string | null;
  activeTab: OpenTab | undefined;
  selectedFile: string | null;
  expandedFolders: Set<string>;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
  projectFiles: Record<string, FileNode[]>;
  setProjectFiles: React.Dispatch<React.SetStateAction<Record<string, FileNode[]>>>;
  contextMenu: FileContextMenuState | null;
  setContextMenu: (menu: FileContextMenuState | null) => void;

  // ─── Action API (single-writer tab mutations) ───────────────
  activateTab: (id: string | null) => void;
  resetTabsForEnvironmentSwitch: () => Promise<void>;
  openCompareTab: (input: { filePath: string; source: string; target: string; projectId?: string }) => string;
  applyCompareChanges: (input: { compareTabId: string; content: string }) => void;
  mutateTabContent: (tabId: string, updater: (prev: string) => string, options?: { markDirty?: boolean }) => void;
  getTabById: (tabId: string) => OpenTab | undefined;
  getActiveTabId: () => string | null;

  // ─── File operations ────────────────────────────────────────
  loadFileContent: (filePath: string, projectId?: string) => Promise<void>;
  saveFileContent: (
    content: string,
    options?: { tabId?: string; silent?: boolean; reason?: 'manual' | 'autosave' },
  ) => Promise<void>;
  flushAutoSave: (tabId?: string) => Promise<void>;
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
  const AUTO_SAVE_DELAY_MS = 800;
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabIdState] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['proj:default', 'data', 'features', 'pages']));
  const [projectFiles, setProjectFiles] = useState<Record<string, FileNode[]>>({});
  const [contextMenu, setContextMenu] = useState<FileContextMenuState | null>(null);

  const openTabsRef = useRef<OpenTab[]>([]);
  const activeTabIdRef = useRef<string | null>(null);
  const autoSaveTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const tabVersionRef = useRef<Record<string, number>>({});
  const saveSequenceRef = useRef<Record<string, number>>({});

  // Environment folder scoping
  const activeEnvironment = useSandboxStore(s => s.activeEnvironment);
  const sandboxes = useSandboxStore(s => s.sandboxes);
  const currentFolder = getEnvironmentFolder(activeEnvironment, sandboxes);

  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    openTabsRef.current = openTabs;

    const openTabIds = new Set(openTabs.map((tab) => tab.id));

    for (const tabId of Object.keys(autoSaveTimeoutsRef.current)) {
      if (openTabIds.has(tabId)) continue;
      clearTimeout(autoSaveTimeoutsRef.current[tabId]);
      delete autoSaveTimeoutsRef.current[tabId];
    }

    for (const tabId of Object.keys(tabVersionRef.current)) {
      if (openTabIds.has(tabId)) continue;
      delete tabVersionRef.current[tabId];
      delete saveSequenceRef.current[tabId];
    }
  }, [openTabs]);

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

  const normalizeRelativePath = useCallback((path: string) => (
    path.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase()
  ), []);

  const isAbsolutePath = useCallback((path: string) => (
    path.startsWith('/') || /^[a-z]:\//i.test(path)
  ), []);

  const hasEnvironmentRootPrefix = useCallback((path: string) => {
    const normalizedPath = normalizeRelativePath(path);
    return (
      normalizedPath === 'dev' ||
      normalizedPath === 'master' ||
      normalizedPath === 'sandboxes' ||
      normalizedPath.startsWith('dev/') ||
      normalizedPath.startsWith('master/') ||
      normalizedPath.startsWith('sandboxes/')
    );
  }, [normalizeRelativePath]);

  const shouldUseFolderScope = useCallback((path: string) => {
    if (!currentFolder) {
      return false;
    }

    const normalizedPath = path.replace(/\\/g, '/');
    if (isAbsolutePath(normalizedPath)) {
      return false;
    }

    return !hasEnvironmentRootPrefix(normalizedPath);
  }, [currentFolder, hasEnvironmentRootPrefix, isAbsolutePath]);

  const isEditableFileTab = useCallback((tab?: OpenTab) => {
    return Boolean(tab && (tab.type === undefined || tab.type === 'file'));
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
      // Keep tree unscoped so users can switch environments/sandboxes from Explorer folders.

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
      const folderParam = shouldUseFolderScope(relativePath) && currentFolder
        ? `&folder=${encodeURIComponent(currentFolder)}`
        : '';
      let apiUrl: string;
      if (project?.veroPath && encodedPath) {
        apiUrl = `${API_BASE}/vero/files/${encodedPath}?veroPath=${encodeURIComponent(project.veroPath)}${folderParam}`;
      } else {
        const fallbackPath = encodePathSegments(filePath);
        const fallbackFolderParam = shouldUseFolderScope(filePath) && currentFolder
          ? `?folder=${encodeURIComponent(currentFolder)}`
          : '';
        apiUrl = `${API_BASE}/vero/files/${fallbackPath}${fallbackFolderParam}`;
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

  const clearAutoSaveTimeout = useCallback((tabId: string) => {
    const pending = autoSaveTimeoutsRef.current[tabId];
    if (!pending) return;
    clearTimeout(pending);
    delete autoSaveTimeoutsRef.current[tabId];
  }, []);

  // API: Save file content (tab addressable with backward compatibility).
  const saveFileContent = useCallback(
    async (
      content: string,
      options?: { tabId?: string; silent?: boolean; reason?: 'manual' | 'autosave' },
    ) => {
      const targetTabId = options?.tabId ?? activeTabIdRef.current;
      if (!targetTabId) return;

      const tabSnapshot = openTabsRef.current.find((tab) => tab.id === targetTabId);
      if (!tabSnapshot) return;

      if (!isEditableFileTab(tabSnapshot)) {
        if (!options?.silent && (tabSnapshot.type === 'image' || tabSnapshot.type === 'binary')) {
          addConsoleOutput(`Resource files are read-only in editor: ${tabSnapshot.name}`);
        }
        return;
      }

      clearAutoSaveTimeout(targetTabId);

      const saveSequence = (saveSequenceRef.current[targetTabId] ?? 0) + 1;
      saveSequenceRef.current[targetTabId] = saveSequence;
      const versionAtSaveStart = tabVersionRef.current[targetTabId] ?? 0;

      try {
        const project = resolveProjectForPath(tabSnapshot.path, tabSnapshot.projectId || selectedProjectId);
        const relativePath = toRelativePath(tabSnapshot.path, project);
        const encodedPath = encodePathSegments(relativePath);
        const saveFolderParam = shouldUseFolderScope(relativePath) && currentFolder
          ? `&folder=${encodeURIComponent(currentFolder)}`
          : '';

        let apiUrl: string;
        if (project?.veroPath && encodedPath) {
          apiUrl = `${API_BASE}/vero/files/${encodedPath}?veroPath=${encodeURIComponent(project.veroPath)}${saveFolderParam}`;
        } else {
          const fallbackSaveFolderParam = shouldUseFolderScope(tabSnapshot.path) && currentFolder
            ? `?folder=${encodeURIComponent(currentFolder)}`
            : '';
          apiUrl = `${API_BASE}/vero/files/${encodePathSegments(tabSnapshot.path)}${fallbackSaveFolderParam}`;
        }

        const response = await fetch(apiUrl, {
          method: 'PUT',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          credentials: 'include',
          body: JSON.stringify({ content }),
        });
        const data = await response.json();

        // Ignore stale responses from slower requests.
        if (saveSequenceRef.current[targetTabId] !== saveSequence) {
          return;
        }

        if (data.success) {
          const currentVersion = tabVersionRef.current[targetTabId] ?? 0;
          const canMarkClean = currentVersion === versionAtSaveStart;

          if (canMarkClean) {
            setOpenTabs((prev) => prev.map((tab) => (
              tab.id === targetTabId
                ? { ...tab, hasChanges: false }
                : tab
            )));
          }

          if (!options?.silent && options?.reason !== 'autosave') {
            addConsoleOutput(`File saved: ${tabSnapshot.name}`);
          }
        } else {
          addConsoleOutput(`Error: Failed to save ${tabSnapshot.name}: ${data.error || 'Unknown error'}`);
        }
      } catch (error) {
        addConsoleOutput(`Error: Failed to save ${tabSnapshot.name}: ${error instanceof Error ? error.message : 'Backend unavailable'}`);
      }
    },
    [
      addConsoleOutput,
      clearAutoSaveTimeout,
      currentFolder,
      encodePathSegments,
      getAuthHeaders,
      isEditableFileTab,
      resolveProjectForPath,
      selectedProjectId,
      shouldUseFolderScope,
      toRelativePath,
    ],
  );

  const flushAutoSave = useCallback(async (tabId?: string) => {
    const tabIdsToFlush = tabId
      ? [tabId]
      : Object.keys(autoSaveTimeoutsRef.current);

    await Promise.all(tabIdsToFlush.map(async (id) => {
      const pending = autoSaveTimeoutsRef.current[id];
      if (pending) {
        clearTimeout(pending);
        delete autoSaveTimeoutsRef.current[id];
      }

      const tab = openTabsRef.current.find((entry) => entry.id === id);
      if (!tab || !tab.hasChanges || !isEditableFileTab(tab)) return;
      await saveFileContent(tab.content, { tabId: id, silent: true, reason: 'autosave' });
    }));
  }, [isEditableFileTab, saveFileContent]);

  const scheduleAutoSave = useCallback((tabId: string, content: string) => {
    clearAutoSaveTimeout(tabId);
    autoSaveTimeoutsRef.current[tabId] = setTimeout(() => {
      void saveFileContent(content, { tabId, silent: true, reason: 'autosave' });
    }, AUTO_SAVE_DELAY_MS);
  }, [AUTO_SAVE_DELAY_MS, clearAutoSaveTimeout, saveFileContent]);

  const setActiveTabId = useCallback((id: string | null) => {
    const previousTabId = activeTabIdRef.current;
    if (previousTabId && previousTabId !== id) {
      void flushAutoSave(previousTabId);
    }
    setActiveTabIdState(id);
  }, [flushAutoSave]);

  // Update tab content (for editor changes)
  const updateTabContent = useCallback((tabId: string, content: string) => {
    const targetTab = openTabsRef.current.find((tab) => tab.id === tabId);
    if (!targetTab || !isEditableFileTab(targetTab)) {
      setOpenTabs((prev) => prev.map((tab) => (
        tab.id === tabId ? { ...tab, content } : tab
      )));
      return;
    }

    tabVersionRef.current[tabId] = (tabVersionRef.current[tabId] ?? 0) + 1;
    setOpenTabs((prev) => prev.map((tab) => (
      tab.id === tabId ? { ...tab, content, hasChanges: true } : tab
    )));
    scheduleAutoSave(tabId, content);
  }, [isEditableFileTab, scheduleAutoSave]);

  // Close a tab
  const closeTab = useCallback((tabId: string) => {
    const tabToClose = openTabsRef.current.find((tab) => tab.id === tabId);
    if (tabToClose && tabToClose.hasChanges && isEditableFileTab(tabToClose)) {
      void saveFileContent(tabToClose.content, { tabId, silent: true, reason: 'autosave' });
    }
    clearAutoSaveTimeout(tabId);

    setOpenTabs((prev) => {
      const newTabs = prev.filter((tab) => tab.id !== tabId);
      if (activeTabIdRef.current === tabId && newTabs.length > 0) {
        const closedIndex = prev.findIndex((tab) => tab.id === tabId);
        const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
        setActiveTabIdState(newTabs[newActiveIndex].id);
      } else if (newTabs.length === 0) {
        setActiveTabIdState(null);
      }
      return newTabs;
    });
  }, [clearAutoSaveTimeout, isEditableFileTab, saveFileContent]);

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
      if (shouldUseFolderScope(relativePath) && currentFolder) {
        params.set('folder', currentFolder);
      }

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
      const folderScope = shouldUseFolderScope(relativePath) && currentFolder
        ? currentFolder
        : undefined;

      const response = await fetch(`${API_BASE}/vero/files/rename`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          oldPath: relativePath,
          newPath: newRelativePath,
          veroPath: contextMenu.veroPath,
          ...(folderScope ? { folder: folderScope } : {}),
        }),
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
    const createFolderParam = shouldUseFolderScope(relativePath) && currentFolder
      ? `&folder=${encodeURIComponent(currentFolder)}`
      : '';
    const apiUrl = `${API_BASE}/vero/files/${relativePath}?veroPath=${encodeURIComponent(project.veroPath)}${createFolderParam}`;

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

  useEffect(() => {
    return () => {
      const pendingTabIds = Object.keys(autoSaveTimeoutsRef.current);
      for (const tabId of pendingTabIds) {
        clearTimeout(autoSaveTimeoutsRef.current[tabId]);
      }
      autoSaveTimeoutsRef.current = {};

      for (const tab of openTabsRef.current) {
        if (!tab.hasChanges || !isEditableFileTab(tab)) continue;
        void saveFileContent(tab.content, { tabId: tab.id, silent: true, reason: 'autosave' });
      }
    };
  }, [isEditableFileTab, saveFileContent]);

  // Keyboard shortcuts (Ctrl+S to save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const currentTab = openTabsRef.current.find((tab) => tab.id === activeTabIdRef.current);
        if (currentTab && isEditableFileTab(currentTab)) {
          void saveFileContent(currentTab.content, { tabId: currentTab.id, reason: 'manual' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditableFileTab, saveFileContent]);

  // ─── Action API ──────────────────────────────────────────────

  /** Activate a tab by ID. Flushes autosave on the previous tab. Wraps setActiveTabId. */
  const activateTab = useCallback((id: string | null) => {
    setActiveTabId(id);
  }, [setActiveTabId]);

  /** Flush pending saves, then clear all open tabs and active selection (used by environment switching). */
  const resetTabsForEnvironmentSwitch = useCallback(async () => {
    await flushAutoSave();
    setOpenTabs([]);
    setActiveTabIdState(null);
  }, [flushAutoSave]);

  /** Open a compare tab and return its ID. */
  const openCompareTab = useCallback((input: { filePath: string; source: string; target: string; projectId?: string }): string => {
    const fileName = input.filePath.split('/').pop() || 'Compare';
    const tabId = `compare-${Date.now()}`;
    const newTab: OpenTab = {
      id: tabId,
      path: input.filePath,
      name: `${fileName} (${input.source} ↔ ${input.target})`,
      content: '',
      hasChanges: false,
      type: 'compare',
      compareSource: input.source,
      compareTarget: input.target,
      projectId: input.projectId,
    };
    setOpenTabs(prev => [...prev, newTab]);
    setActiveTabId(tabId);
    return tabId;
  }, [setActiveTabId]);

  /** Apply content from a compare tab into an existing or new file tab. */
  const applyCompareChanges = useCallback((input: { compareTabId: string; content: string }) => {
    const tab = openTabsRef.current.find(t => t.id === input.compareTabId);
    if (!tab) return;

    const existingFileTab = openTabsRef.current.find(t => t.path === tab.path && t.type !== 'compare');
    if (existingFileTab) {
      setOpenTabs(prev => prev.map(t =>
        t.id === existingFileTab.id
          ? { ...t, content: input.content, hasChanges: true }
          : t
      ));
      setActiveTabId(existingFileTab.id);
    } else {
      const fileName = tab.path.split('/').pop() || 'Untitled';
      const newTabId = `tab-${Date.now()}`;
      const newTab: OpenTab = {
        id: newTabId,
        path: tab.path,
        name: fileName,
        content: input.content,
        hasChanges: true,
        type: 'file',
        projectId: tab.projectId,
      };
      setOpenTabs(prev => [...prev, newTab]);
      setActiveTabId(newTabId);
    }
  }, [setActiveTabId]);

  /** Functional update on a specific tab's content. Bumps version and schedules autosave when markDirty is set. */
  const mutateTabContent = useCallback((tabId: string, updater: (prev: string) => string, options?: { markDirty?: boolean }) => {
    const dirty = options?.markDirty ?? false;

    // Read current content from ref to compute the new value for autosave scheduling.
    const currentTab = openTabsRef.current.find(tab => tab.id === tabId);
    let newContent: string | undefined;

    setOpenTabs(prev => prev.map(tab => {
      if (tab.id !== tabId) return tab;
      newContent = updater(tab.content);
      return {
        ...tab,
        content: newContent,
        hasChanges: dirty || tab.hasChanges,
      };
    }));

    if (dirty && currentTab && isEditableFileTab(currentTab)) {
      tabVersionRef.current[tabId] = (tabVersionRef.current[tabId] ?? 0) + 1;
      // newContent was assigned inside setOpenTabs; fall back to current if somehow missed.
      const contentForSave = newContent ?? currentTab.content;
      scheduleAutoSave(tabId, contentForSave);
    }
  }, [isEditableFileTab, scheduleAutoSave]);

  /** Read-only accessor: get a tab by ID (snapshot from ref). */
  const getTabById = useCallback((tabId: string): OpenTab | undefined => {
    return openTabsRef.current.find(tab => tab.id === tabId);
  }, []);

  /** Read-only accessor: current active tab ID. */
  const getActiveTabId = useCallback((): string | null => {
    return activeTabIdRef.current;
  }, []);

  return {
    openTabs,
    activeTabId,
    activeTab,
    selectedFile,
    expandedFolders,
    setExpandedFolders,
    projectFiles,
    setProjectFiles,
    contextMenu,
    setContextMenu,
    activateTab,
    resetTabsForEnvironmentSwitch,
    openCompareTab,
    applyCompareChanges,
    mutateTabContent,
    getTabById,
    getActiveTabId,
    loadFileContent,
    saveFileContent,
    flushAutoSave,
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
