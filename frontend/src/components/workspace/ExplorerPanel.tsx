import { useMemo, useState } from 'react';
import { OutlinePanel } from './OutlinePanel';
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  FileImage,
  File,
  MoreHorizontal,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { IconButton, PanelHeader, EmptyState } from '@/components/ui';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  icon?: string;
  hasChanges?: boolean;
}

export interface NestedProject {
  id: string;
  name: string;
  veroPath?: string;
  files?: FileNode[];
}

export interface ExplorerPanelProps {
  projects?: NestedProject[];
  error?: string | null;
  isLoading?: boolean;
  selectedProjectId?: string | null;
  projectFiles?: Record<string, FileNode[]>;
  selectedFile: string | null;
  expandedFolders?: Set<string>;
  activeFileContent?: string | null;
  activeFileName?: string | null;
  onFileSelect: (file: FileNode, projectId?: string) => void;
  onDirectorySelect?: (directory: FileNode, projectId?: string) => void;
  onFolderToggle?: (path: string) => void;
  onProjectSelect?: (projectId: string) => void;
  onProjectExpand?: (projectId: string) => void;
  onCreateProject?: () => void;
  onDeleteProject?: (projectId: string) => void;
  onCreateFile?: (projectId: string, folderPath: string) => void;
  onNavigateToLine?: (line: number) => void;
  onFileContextMenu?: (file: FileNode, projectId: string | undefined, x: number, y: number) => void;
  onCreateSandbox?: (projectId: string) => void;
  onSyncSandbox?: (sandboxFolderName: string, projectId: string) => void;
  onRetry?: () => void;
}

export function ExplorerPanel({
  projects = [],
  error = null,
  isLoading = false,
  selectedProjectId,
  projectFiles = {},
  selectedFile,
  expandedFolders: externalExpandedFolders,
  activeFileContent,
  activeFileName,
  onFileSelect,
  onDirectorySelect,
  onFolderToggle: externalFolderToggle,
  onProjectSelect,
  onProjectExpand,
  onCreateProject,
  onDeleteProject,
  onCreateFile,
  onNavigateToLine,
  onFileContextMenu,
  onCreateSandbox,
  onSyncSandbox,
  onRetry,
}: ExplorerPanelProps) {
  const [internalExpandedFolders, setInternalExpandedFolders] = useState<Set<string>>(
    new Set(['proj:default', 'data', 'features'])
  );

  // Use external state if provided, otherwise use internal state
  const expandedFolders = externalExpandedFolders || internalExpandedFolders;

  const toggleFolder = (path: string) => {
    if (externalFolderToggle) {
      externalFolderToggle(path);
    } else {
      setInternalExpandedFolders((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
        return next;
      });
    }
  };

  type FileVisual = {
    Icon: typeof File;
    iconClassName: string;
  };

  const FILE_VISUALS: Record<string, FileVisual> = {
    vero: {
      Icon: FileCode,
      iconClassName: 'text-accent-teal',
    },
    json: {
      Icon: FileJson,
      iconClassName: 'text-status-warning',
    },
    md: {
      Icon: FileText,
      iconClassName: 'text-status-success',
    },
    ts: {
      Icon: FileCode,
      iconClassName: 'text-status-info',
    },
    tsx: {
      Icon: FileCode,
      iconClassName: 'text-status-info',
    },
    js: {
      Icon: FileCode,
      iconClassName: 'text-status-warning',
    },
    jsx: {
      Icon: FileCode,
      iconClassName: 'text-status-warning',
    },
    png: {
      Icon: FileImage,
      iconClassName: 'text-status-info',
    },
    jpg: {
      Icon: FileImage,
      iconClassName: 'text-status-info',
    },
    jpeg: {
      Icon: FileImage,
      iconClassName: 'text-status-info',
    },
    webp: {
      Icon: FileImage,
      iconClassName: 'text-status-info',
    },
    gif: {
      Icon: FileImage,
      iconClassName: 'text-status-info',
    },
  };

  const DEFAULT_FILE_VISUAL: FileVisual = {
    Icon: File,
    iconClassName: 'text-text-secondary',
  };

  function getFileVisual(name: string): FileVisual {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    return FILE_VISUALS[ext] ?? DEFAULT_FILE_VISUAL;
  }

  type FolderVisual = {
    iconClassName: string;
    rowClassName: string;
  };

  const FOLDER_VISUALS: Record<string, FolderVisual> = {
    master: {
      iconClassName: 'text-status-success',
      rowClassName: 'bg-status-success/[0.08] hover:bg-status-success/[0.14]',
    },
    dev: {
      iconClassName: 'text-status-info',
      rowClassName: 'bg-status-info/[0.08] hover:bg-status-info/[0.14]',
    },
    sandboxes: {
      iconClassName: 'text-accent-purple',
      rowClassName: 'bg-accent-purple/[0.08] hover:bg-accent-purple/[0.14]',
    },
    sandbox: {
      iconClassName: 'text-accent-purple',
      rowClassName: 'bg-accent-purple/[0.05] hover:bg-accent-purple/[0.1]',
    },
    features: {
      iconClassName: 'text-status-warning',
      rowClassName: 'bg-transparent hover:bg-white/[0.05]',
    },
    pages: {
      iconClassName: 'text-status-warning',
      rowClassName: 'bg-transparent hover:bg-white/[0.05]',
    },
    data: {
      iconClassName: 'text-status-warning',
      rowClassName: 'bg-transparent hover:bg-white/[0.05]',
    },
  };

  const DEFAULT_FOLDER_VISUAL: FolderVisual = {
    iconClassName: 'text-status-warning',
    rowClassName: 'bg-transparent hover:bg-white/[0.05]',
  };

  function getFolderVisual(name: string): FolderVisual {
    return FOLDER_VISUALS[name.toLowerCase()] ?? DEFAULT_FOLDER_VISUAL;
  }

  function sortNodes(nodes: FileNode[]): FileNode[] {
    return [...nodes].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }

  function countFiles(nodes: FileNode[]): number {
    return nodes.reduce((count, node) => {
      if (node.type === 'file') {
        return count + 1;
      }

      return count + countFiles(node.children || []);
    }, 0);
  }

  const visibleProjectFiles = useMemo(() => {
    const byProject: Record<string, FileNode[]> = {};
    for (const project of projects) {
      const sourceNodes = Object.prototype.hasOwnProperty.call(projectFiles, project.id)
        ? projectFiles[project.id]
        : (project.files || []);
      byProject[project.id] = sourceNodes;
    }
    return byProject;
  }, [projects, projectFiles]);

  const renderFileTree = (nodes: FileNode[], depth: number = 0, projectId?: string, parentPath?: string) => {
    return sortNodes(nodes).map((node) => {
      const nodePath = projectId ? `${projectId}:${node.path}` : node.path;
      const isExpanded = expandedFolders.has(nodePath);
      const isSelected = selectedFile === node.path;
      const paddingLeft = 12 + depth * 14;

      if (node.type === 'directory') {
        const hasChildren = node.children && node.children.length > 0;
        const lowerName = node.name.toLowerCase();

        const isEnvFolder = ['master', 'dev', 'sandboxes'].includes(lowerName);
        const isSandbox = parentPath?.endsWith('sandboxes');
        const folderVisual = getFolderVisual(isSandbox ? 'sandbox' : lowerName);

        const ENV_DISPLAY_NAMES: Record<string, string> = {
          master: 'Production',
          dev: 'Development',
          sandboxes: 'Sandboxes',
        };
        const displayName = ENV_DISPLAY_NAMES[lowerName] || node.name;
        const DisplayIcon = isExpanded ? FolderOpen : Folder;
        const selectedFolderRowClass = 'bg-brand-primary/22 text-text-primary';

        return (
          <div key={nodePath} className="flex flex-col select-none">
            <div
              className={`
                group/item relative flex w-full cursor-pointer items-center rounded-sm py-1 text-xs
                transition-all duration-fast
                ${isSelected
                  ? selectedFolderRowClass
                  : folderVisual.rowClassName}
              `}
              onClick={() => {
                toggleFolder(nodePath);
                onDirectorySelect?.(node, projectId);
              }}
              style={{ paddingLeft: `${paddingLeft}px`, paddingRight: '6px' }}
            >
              <ChevronRight
                size={12}
                className={`mr-0.5 text-text-muted transition-transform duration-fast ${isExpanded ? 'rotate-90' : ''}`}
              />

              <DisplayIcon
                size={15}
                className={`mr-1.5 ${folderVisual.iconClassName}`}
              />

              <span className={`truncate leading-5 ${isEnvFolder ? 'font-medium text-text-primary' : 'font-normal text-text-secondary group-hover/item:text-text-primary'}`}>
                {displayName}
              </span>

              <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity duration-fast group-hover/item:opacity-100">
                {isSandbox && onSyncSandbox && (
                  <IconButton
                    icon={<RefreshCw size={11} />}
                    size="sm"
                    variant="ghost"
                    tooltip="Sync from source"
                    onClick={(e) => { e.stopPropagation(); onSyncSandbox(node.name, projectId || ''); }}
                    className="h-5 w-5"
                  />
                )}

                {isEnvFolder && lowerName === 'sandboxes' && onCreateSandbox && (
                  <IconButton
                    icon={<Plus size={11} />}
                    size="sm"
                    variant="ghost"
                    tooltip="New Sandbox"
                    onClick={(e) => { e.stopPropagation(); onCreateSandbox(projectId || ''); }}
                    className="h-5 w-5"
                  />
                )}

                {onCreateFile && !isEnvFolder && !isSandbox && (
                  <IconButton
                    icon={<Plus size={11} />}
                    size="sm"
                    variant="ghost"
                    tooltip="New File"
                    onClick={(e) => { e.stopPropagation(); onCreateFile(projectId || '', node.path); }}
                    className="h-5 w-5"
                  />
                )}
              </div>
            </div>

            {isExpanded && hasChildren && (
              <div className="flex flex-col relative">
                {renderFileTree(node.children!, depth + 1, projectId, node.path)}
              </div>
            )}
          </div>
        );
      }

      // File Node
      const fileVisual = getFileVisual(node.name);
      const { Icon } = fileVisual;

      const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onFileContextMenu) {
          onFileContextMenu(node, projectId, e.clientX, e.clientY);
        }
      };

      return (
        <div
          key={nodePath}
          onClick={() => onFileSelect(node, projectId)}
          onContextMenu={handleContextMenu}
          className={`
            group relative flex w-full cursor-pointer items-center rounded-sm py-1 pr-2 text-xxs
            transition-all duration-fast
            ${isSelected
              ? 'bg-brand-primary/22 text-text-primary font-medium'
              : 'bg-transparent text-text-secondary hover:bg-white/[0.05] hover:text-text-primary'
            }
          `}
          style={{ paddingLeft: `${paddingLeft + 19}px` }}
        >
          <Icon size={14} className={`mr-1.5 ${isSelected ? 'text-text-primary' : fileVisual.iconClassName}`} />
          <span className="truncate leading-5">{node.name}</span>
        </div>
      );
    });
  };

  // Render a single project
  const renderProject = (project: NestedProject) => {
    const projPath = `proj:${project.id}`;
    const isExpanded = expandedFolders.has(projPath);
    const isSelected = selectedProjectId === project.id;
    const hasLoadedFiles = Object.prototype.hasOwnProperty.call(projectFiles, project.id);
    const files = visibleProjectFiles[project.id] || [];
    const totalFiles = countFiles(files);

    return (
      <div key={project.id} className="flex flex-col">
        {/* Project Header */}
        <div
          className={`
            group flex cursor-pointer items-center gap-1 rounded-sm px-2 py-1 text-xxs
            transition-all duration-fast
            hover:bg-white/[0.05]
            ${isSelected ? 'bg-brand-primary/22' : ''}
          `}
          onClick={() => {
            toggleFolder(projPath);
            onProjectSelect?.(project.id);
            if (!isExpanded) onProjectExpand?.(project.id);
          }}
        >
          <ChevronRight
            size={12}
            className={`text-text-muted transition-transform duration-fast ${isExpanded ? 'rotate-90' : ''}`}
          />
          <Folder size={14} className="text-status-warning" />
          <span className="ml-1 flex-1 truncate text-xxs font-medium text-text-primary">{project.name}</span>
          <span className="text-3xs text-text-muted">
            {totalFiles}
          </span>

          {onDeleteProject && (
            <IconButton
              icon={<Trash2 size={11} />}
              size="sm"
              variant="ghost"
              tone="danger"
              tooltip="Delete Project"
              onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
              className="h-5 w-5 opacity-0 transition-all duration-fast group-hover:opacity-100"
            />
          )}
        </div>

        {/* Project Content */}
        {isExpanded && (
          <div className="ml-2 pl-1">
            {files.length > 0 ? (
              renderFileTree(files, 0, project.id)
            ) : (
              // Distinguish between "still loading" and "loaded but empty"
              <div className="flex flex-col pl-4">
                {!hasLoadedFiles ? (
                  <div className="ml-4 py-2 text-xs italic text-text-muted">Loading environment...</div>
                ) : (
                  <div className="ml-4 py-2 text-xs italic text-text-muted">No files found in this environment.</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative flex h-full w-full shrink-0 flex-col overflow-hidden border-r border-border-default bg-dark-bg">
      {/* Header */}
      <PanelHeader
        title="Projects"
        actions={
          <div className="flex items-center gap-0.5">
            {onCreateProject && (
              <IconButton
                icon={<Plus size={12} />}
                size="sm"
                variant="ghost"
                tooltip="New Project"
                onClick={onCreateProject}
              />
            )}
            <IconButton
              icon={<MoreHorizontal size={14} />}
              size="sm"
              variant="ghost"
              tooltip="More options"
            />
          </div>
        }
        className="relative z-10"
      />

      {/* File Tree */}
      <div className="custom-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {/* Projects List */}
        <div className="p-1">
          {projects.length > 0 ? (
            <div className="mt-1 space-y-0.5">
              {projects.map(renderProject)}
            </div>
          ) : (
            <div>
              {isLoading ? (
                <EmptyState
                  title="Loading projects..."
                  compact
                />
              ) : error ? (
                <EmptyState
                  title="Unable to load projects"
                  message={error}
                  compact
                  className="[&>p:first-of-type]:text-status-danger"
                  action={onRetry ? (
                    <button
                      onClick={onRetry}
                      className="inline-flex items-center rounded-md border border-border-default bg-dark-elevated px-2.5 py-1 text-xs font-medium text-text-primary transition-colors hover:border-border-emphasis"
                    >
                      <RefreshCw size={14} className="mr-1" />
                      Retry
                    </button>
                  ) : undefined}
                />
              ) : (
                <EmptyState
                  title="No projects found"
                  compact
                  action={onCreateProject ? (
                    <button
                      onClick={onCreateProject}
                      className="inline-flex items-center rounded-md border border-border-default bg-dark-elevated px-2.5 py-1 text-xs font-medium text-text-primary transition-colors hover:border-border-emphasis"
                    >
                      <Plus size={14} className="mr-1" />
                      Create Project
                    </button>
                  ) : undefined}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Outline Panel */}
      <div className="relative z-10 border-t border-border-default bg-dark-bg">
        <OutlinePanel
          fileContent={activeFileContent || null}
          fileName={activeFileName || null}
          onNavigateToLine={onNavigateToLine}
        />
      </div>
    </div>
  );
}
