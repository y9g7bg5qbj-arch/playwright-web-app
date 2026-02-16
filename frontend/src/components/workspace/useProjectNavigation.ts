import { useState, useCallback } from 'react';
import type { NestedProject } from './ExplorerPanel.js';
import { sandboxApi, type ConflictFile } from '@/api/sandbox';

export interface UseProjectNavigationParams {
  currentProjectId: string | undefined;
  nestedProjects: NestedProject[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
  addConsoleOutput: (message: string) => void;
  loadProjectFiles: (projectId: string, veroPath?: string) => Promise<void>;
  setCurrentProjectById: (id: string) => Promise<void>;
  createApplication: (data: { name: string }) => Promise<unknown>;
  fetchProjects: () => Promise<void>;
  createNestedProject: (applicationId: string, data: { name: string }) => Promise<{ id: string; name: string }>;
  fetchNestedProjects: (applicationId: string) => Promise<void>;
  deleteNestedProject: (applicationId: string, projectId: string) => Promise<void>;
}

export interface UseProjectNavigationReturn {
  // Sandbox creation state
  showCreateSandboxModal: boolean;
  setShowCreateSandboxModal: (show: boolean) => void;
  sandboxTargetProjectId: string | null;
  // Merge conflict resolution state
  showMergeConflictModal: boolean;
  setShowMergeConflictModal: (show: boolean) => void;
  mergeConflicts: ConflictFile[];
  setMergeConflicts: (conflicts: ConflictFile[]) => void;
  mergeSandboxId: string | null;
  setMergeSandboxId: (id: string | null) => void;
  mergeSandboxName: string;
  mergeSourceBranch: string;
  // Handlers
  handleApplicationSelect: (applicationId: string) => Promise<void>;
  handleCreateApplication: () => Promise<void>;
  handleProjectSelect: (projectId: string) => void;
  handleProjectExpand: (projectId: string) => void;
  handleCreateProject: () => Promise<void>;
  handleDeleteProject: (projectId: string) => Promise<void>;
  handleCreateSandbox: (projectId: string) => void;
  handleSandboxCreated: () => void;
  handleSyncSandbox: (sandboxName: string, projectId: string) => Promise<void>;
  handleResolveMergeConflicts: (resolutions: Record<string, string>) => Promise<void>;
}

export function useProjectNavigation({
  currentProjectId,
  nestedProjects,
  selectedProjectId,
  setSelectedProjectId,
  setExpandedFolders,
  addConsoleOutput,
  loadProjectFiles,
  setCurrentProjectById,
  createApplication,
  fetchProjects,
  createNestedProject,
  fetchNestedProjects,
  deleteNestedProject,
}: UseProjectNavigationParams): UseProjectNavigationReturn {
  // Sandbox creation state
  const [showCreateSandboxModal, setShowCreateSandboxModal] = useState(false);
  const [sandboxTargetProjectId, setSandboxTargetProjectId] = useState<string | null>(null);

  // Merge conflict resolution state
  const [showMergeConflictModal, setShowMergeConflictModal] = useState(false);
  const [mergeConflicts, setMergeConflicts] = useState<ConflictFile[]>([]);
  const [mergeSandboxId, setMergeSandboxId] = useState<string | null>(null);
  const [mergeSandboxName, setMergeSandboxName] = useState<string>('');
  const [mergeSourceBranch, setMergeSourceBranch] = useState<string>('dev');

  // Helper to validate UUID format
  const isValidUUID = useCallback((str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }, []);

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

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const handleProjectExpand = (projectId: string) => {
    // Find the project from store and load its files if not already loaded
    const project = nestedProjects.find(p => p.id === projectId);
    if (project && !project.files) {
      loadProjectFiles(projectId, project.veroPath);
    }
  };

  const handleCreateProject = async () => {
    if (!currentProjectId) {
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
      const project = await createNestedProject(currentProjectId, { name: name.trim() });
      // Refresh nested projects
      await fetchNestedProjects(currentProjectId);
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
    if (!currentProjectId) return;

    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await deleteNestedProject(currentProjectId, projectId);
      // Refresh nested projects
      await fetchNestedProjects(currentProjectId);
      // Clear selected if deleted
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
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

  return {
    showCreateSandboxModal,
    setShowCreateSandboxModal,
    sandboxTargetProjectId,
    showMergeConflictModal,
    setShowMergeConflictModal,
    mergeConflicts,
    setMergeConflicts,
    mergeSandboxId,
    setMergeSandboxId,
    mergeSandboxName,
    mergeSourceBranch,
    handleApplicationSelect,
    handleCreateApplication,
    handleProjectSelect,
    handleProjectExpand,
    handleCreateProject,
    handleDeleteProject,
    handleCreateSandbox,
    handleSandboxCreated,
    handleSyncSandbox,
    handleResolveMergeConflicts,
  };
}
