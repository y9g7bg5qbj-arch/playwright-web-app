import { useState } from 'react';
import { OutlinePanel } from './OutlinePanel';
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  File,
  MoreHorizontal,
  Plus,
  Trash2,
  RefreshCw,
  ShieldCheck,
  FlaskConical,
  Box,
  Database,
  PlayCircle,
  Layout
} from 'lucide-react';

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
  applicationName?: string;
  projects?: NestedProject[];
  selectedProjectId?: string | null;
  projectFiles?: Record<string, FileNode[]>;
  selectedFile: string | null;
  expandedFolders?: Set<string>;
  activeFileContent?: string | null;
  activeFileName?: string | null;
  onFileSelect: (file: FileNode, projectId?: string) => void;
  onFolderToggle?: (path: string) => void;
  onProjectSelect?: (projectId: string) => void;
  onProjectExpand?: (projectId: string) => void;
  onCreateProject?: () => void;
  onDeleteProject?: (projectId: string) => void;
  onCreateFile?: (projectId: string, folderPath: string) => void;
  onNavigateToLine?: (line: number) => void;
  onFileContextMenu?: (file: FileNode, projectId: string | undefined, x: number, y: number) => void;
  onCreateSandbox?: (projectId: string) => void;
  onSyncSandbox?: (sandboxName: string, projectId: string) => void;
}

export function ExplorerPanel({
  applicationName = 'VERO-PROJECT',
  projects = [],
  selectedProjectId,
  projectFiles = {},
  selectedFile,
  expandedFolders: externalExpandedFolders,
  activeFileContent,
  activeFileName,
  onFileSelect,
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
}: ExplorerPanelProps) {
  const [internalExpandedFolders, setInternalExpandedFolders] = useState<Set<string>>(
    new Set(['proj:default', 'data', 'features', 'pages'])
  );
  const [applicationExpanded, setApplicationExpanded] = useState(true);

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

  // Get file icon based on extension
  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'vero':
        return { Icon: FileCode, color: 'text-brand-primary' };
      case 'json':
        return { Icon: FileJson, color: 'text-status-warning' };
      case 'md':
        return { Icon: FileText, color: 'text-status-info' };
      case 'ts':
      case 'tsx':
        return { Icon: FileCode, color: 'text-status-info' };
      case 'js':
      case 'jsx':
        return { Icon: FileCode, color: 'text-status-warning' };
      default:
        return { Icon: File, color: 'text-text-muted' };
    }
  };

  // Get folder icon based on folder name
  const getFolderIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    switch (lowerName) {
      // Environment folders
      case 'master':
        return { Icon: ShieldCheck, color: 'text-status-success' };
      case 'dev':
        return { Icon: FlaskConical, color: 'text-status-info' };
      case 'sandboxes':
        return { Icon: Box, color: 'text-brand-secondary' };
      // Content folders
      case 'data':
        return { Icon: Database, color: 'text-status-success' };
      case 'features':
        return { Icon: PlayCircle, color: 'text-brand-primary' };
      case 'pages':
        return { Icon: Layout, color: 'text-status-warning' };
      default:
        return { Icon: Folder, color: 'text-brand-primary' };
    }
  };

  const renderFileTree = (nodes: FileNode[], depth: number = 0, projectId?: string, parentPath?: string) => {
    return nodes.map((node) => {
      const nodePath = projectId ? `${projectId}:${node.path}` : node.path;
      const isExpanded = expandedFolders.has(nodePath);
      const isSelected = selectedFile === node.path;
      const paddingLeft = 20 + depth * 12;

      if (node.type === 'directory') {
        const hasChildren = node.children && node.children.length > 0;
        const lowerName = node.name.toLowerCase();
        const { Icon: FolderIcon, color: folderColor } = getFolderIcon(node.name);

        const isEnvFolder = ['master', 'dev', 'sandboxes'].includes(lowerName);
        const isSandbox = parentPath?.endsWith('sandboxes');

        const displayName = lowerName === 'master' ? 'Production' :
          lowerName === 'dev' ? 'Development' :
            lowerName === 'sandboxes' ? 'Sandboxes' :
              node.name;

        // Custom icon logic for expanded state
        const DisplayIcon = (isExpanded && !isEnvFolder && !isSandbox) ? FolderOpen : FolderIcon;

        return (
          <div key={nodePath} className="flex flex-col select-none">
            <div
              className={`
                group/item relative flex items-center w-full py-1 cursor-pointer 
                hover:bg-dark-elevated border-l-2 border-transparent transition-colors duration-150
                ${isSelected ? 'bg-brand-primary/10 border-brand-primary' : ''}
              `}
              onClick={() => toggleFolder(nodePath)}
              style={{ paddingLeft: `${paddingLeft}px` }}
            >
              <ChevronRight
                size={14}
                className={`mr-1 text-text-muted transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              />

              <DisplayIcon
                size={14}
                className={`mr-2 ${isSandbox ? 'text-brand-secondary' : isEnvFolder ? folderColor : 'text-brand-primary'}`}
              />

              <span className={`text-sm truncate ${isEnvFolder ? 'font-medium text-text-primary' : 'text-text-secondary group-hover/item:text-text-primary'}`}>
                {displayName}
              </span>

              {/* Environment Badge */}
              {isEnvFolder && lowerName === 'master' && (
                <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-green-500/10 text-green-400 rounded border border-green-500/20">
                  PROD
                </span>
              )}

              {/* Floating Actions */}
              <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                {isSandbox && onSyncSandbox && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSyncSandbox(node.name, projectId || ''); }}
                    className="p-1 hover:bg-dark-elem-active rounded text-text-muted hover:text-brand-primary"
                    title="Sync from source"
                  >
                    <RefreshCw size={12} />
                  </button>
                )}

                {isEnvFolder && lowerName === 'sandboxes' && onCreateSandbox && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onCreateSandbox(projectId || ''); }}
                    className="p-1 hover:bg-dark-elem-active rounded text-text-muted hover:text-brand-secondary"
                    title="New Sandbox"
                  >
                    <Plus size={12} />
                  </button>
                )}

                {onCreateFile && !isEnvFolder && !isSandbox && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onCreateFile(projectId || '', node.path); }}
                    className="p-1 hover:bg-dark-elem-active rounded text-text-muted hover:text-text-primary"
                    title="New File"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>
            </div>

            {isExpanded && hasChildren && (
              <div className="flex flex-col relative">
                {/* Indentation Guide */}
                <div
                  className="absolute left-[calc(var(--padding)+5px)] top-0 bottom-0 w-px bg-border-subtle"
                  style={{ '--padding': `${paddingLeft}px` } as React.CSSProperties}
                />
                {renderFileTree(node.children!, depth + 1, projectId, node.path)}
              </div>
            )}
          </div>
        );
      }

      // File Node
      const { Icon, color } = getFileIcon(node.name);

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
            group relative flex items-center w-full py-1 pr-2 cursor-pointer 
            border-l-2 text-sm transition-colors duration-150
            ${isSelected
              ? 'bg-brand-primary/10 border-brand-primary text-text-primary font-medium'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-dark-elevated'
            }
          `}
          style={{ paddingLeft: `${paddingLeft + 16}px` }}
        >
          <Icon size={14} className={`mr-2 ${color}`} />
          <span className="truncate">{node.name}</span>

          {node.hasChanges && (
            <span className="ml-auto w-2 h-2 bg-brand-primary rounded-full shadow-[0_0_4px_var(--brand-primary)]" />
          )}
        </div>
      );
    });
  };

  // Render a single project
  const renderProject = (project: NestedProject) => {
    const projPath = `proj:${project.id}`;
    const isExpanded = expandedFolders.has(projPath);
    const isSelected = selectedProjectId === project.id;
    const files = projectFiles[project.id] || project.files || [];

    return (
      <div key={project.id} className="flex flex-col">
        {/* Project Header */}
        <div
          className={`
            group flex items-center gap-1 py-1.5 px-3 cursor-pointer 
            hover:bg-dark-elevated transition-colors
            ${isSelected ? 'bg-dark-elevated/50' : ''}
          `}
          onClick={() => {
            toggleFolder(projPath);
            onProjectSelect?.(project.id);
            if (!isExpanded) onProjectExpand?.(project.id);
          }}
        >
          <ChevronRight
            size={14}
            className={`text-text-muted transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
          />
          <Folder size={14} className="text-brand-secondary fill-brand-secondary/20" />
          <span className="flex-1 font-medium text-text-primary truncate ml-1.5">{project.name}</span>

          {onDeleteProject && (
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-status-danger/20 rounded text-text-muted hover:text-status-danger transition-all"
              title="Delete Project"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>

        {/* Project Content */}
        {isExpanded && (
          <div className="ml-2 border-l border-border-subtle">
            {files.length > 0 ? (
              renderFileTree(files, 0, project.id)
            ) : (
              // Empty State / Default Structure
              <div className="flex flex-col pl-4">
                <div className="text-xs text-text-muted py-2 italic ml-4">Loading environment...</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-[260px] bg-dark-card border-r border-border-default flex flex-col shrink-0 h-full overflow-hidden">
      {/* Title Bar */}
      <div className="h-10 flex items-center px-4 shrink-0 border-b border-border-subtle bg-dark-bg/30">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Explorer
        </span>
        <button className="ml-auto text-text-muted hover:text-text-primary transition-colors">
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
        {/* Application Header */}
        <button
          onClick={() => setApplicationExpanded(!applicationExpanded)}
          className="w-full flex items-center px-2 py-1.5 cursor-pointer hover:bg-dark-elevated text-text-primary text-xs font-bold tracking-wide"
        >
          <ChevronRight
            size={14}
            className={`mr-1 text-text-muted transition-transform duration-200 ${applicationExpanded ? 'rotate-90' : ''}`}
          />
          {applicationName.toUpperCase()}
        </button>

        {/* Projects List */}
        {applicationExpanded && (
          <div className="py-1">
            <div className="flex items-center justify-between px-4 py-1.5 text-text-muted group">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Projects</span>
              {onCreateProject && (
                <button
                  onClick={onCreateProject}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-dark-elevated rounded transition-opacity"
                  title="New Project"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>

            {projects.length > 0 ? (
              projects.map(renderProject)
            ) : (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <p className="text-xs text-text-muted mb-3">No projects found</p>
                {onCreateProject && (
                  <button
                    onClick={onCreateProject}
                    className="btn btn-primary text-xs"
                  >
                    <Plus size={14} className="mr-1" />
                    Create Project
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Outline Panel */}
      <OutlinePanel
        fileContent={activeFileContent || null}
        fileName={activeFileName || null}
        onNavigateToLine={onNavigateToLine}
      />
    </div>
  );
}
