import { useState } from 'react';
import { OutlinePanel } from './OutlinePanel';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  icon?: string;
  hasChanges?: boolean;
}

// Nested Project within an Application
export interface NestedProject {
  id: string;
  name: string;
  veroPath?: string;
  files?: FileNode[];
}

export interface ExplorerPanelProps {
  // Application name (top-level container)
  applicationName?: string;
  // Nested projects within the application
  projects?: NestedProject[];
  // Selected project ID
  selectedProjectId?: string | null;
  // Per-project file trees
  projectFiles?: Record<string, FileNode[]>;
  // Currently selected file path
  selectedFile: string | null;
  // Expanded folders
  expandedFolders?: Set<string>;
  // Active file content for outline
  activeFileContent?: string | null;
  // Active file name for outline
  activeFileName?: string | null;
  // Callbacks
  onFileSelect: (file: FileNode, projectId?: string) => void;
  onFolderToggle?: (path: string) => void;
  onProjectSelect?: (projectId: string) => void;
  onProjectExpand?: (projectId: string) => void;
  onCreateProject?: () => void;
  onDeleteProject?: (projectId: string) => void;
  onCreateFile?: (projectId: string, folderPath: string) => void;
  onNavigateToLine?: (line: number) => void;
  // Context menu callback for file comparison
  onFileContextMenu?: (file: FileNode, projectId: string | undefined, x: number, y: number) => void;
  // Callback to create a new sandbox
  onCreateSandbox?: (projectId: string) => void;
  // Callback to sync a sandbox from its source branch
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
  const getFileIcon = (name: string): { icon: string; color: string } => {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'vero':
        return { icon: 'code', color: 'text-purple-400' };
      case 'json':
        return { icon: 'data_object', color: 'text-yellow-500' };
      case 'md':
        return { icon: 'info', color: 'text-blue-400' };
      case 'ts':
      case 'tsx':
        return { icon: 'code', color: 'text-blue-400' };
      case 'js':
      case 'jsx':
        return { icon: 'code', color: 'text-yellow-400' };
      default:
        return { icon: 'description', color: 'text-[#8b949e]' };
    }
  };

  // Get folder icon based on folder name
  const getFolderIcon = (name: string): { icon: string; color: string } => {
    const lowerName = name.toLowerCase();
    switch (lowerName) {
      // Environment folders
      case 'master':
        return { icon: 'verified', color: 'text-green-500' };
      case 'dev':
        return { icon: 'science', color: 'text-blue-500' };
      case 'sandboxes':
        return { icon: 'folder_shared', color: 'text-purple-500' };
      // Content folders
      case 'data':
        return { icon: 'database', color: 'text-emerald-400' };
      case 'features':
        return { icon: 'play_circle', color: 'text-blue-400' };
      case 'pages':
        return { icon: 'web', color: 'text-orange-400' };
      default:
        // Check if it's inside sandboxes folder (sandbox item)
        return { icon: 'folder', color: 'text-[#8b949e]' };
    }
  };

  // Check if a folder is an environment folder
  const isEnvironmentFolder = (name: string): boolean => {
    const lowerName = name.toLowerCase();
    return ['master', 'dev', 'sandboxes'].includes(lowerName);
  };

  // Get environment label
  const getEnvironmentLabel = (name: string): string => {
    const lowerName = name.toLowerCase();
    switch (lowerName) {
      case 'master':
        return 'Production';
      case 'dev':
        return 'Development';
      case 'sandboxes':
        return 'Sandboxes';
      default:
        return name;
    }
  };

  // Check if a folder is a sandbox (direct child of 'sandboxes' folder)
  const isSandboxFolder = (parentPath: string | undefined): boolean => {
    if (!parentPath) return false;
    const parts = parentPath.split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart?.toLowerCase() === 'sandboxes';
  };

  const renderFileTree = (nodes: FileNode[], depth: number = 0, projectId?: string, parentPath?: string) => {
    // Debug: Log first call to renderFileTree for this project
    if (depth === 0) {
      console.log('[ExplorerPanel] renderFileTree called:', { projectId, nodeCount: nodes.length, parentPath });
    }
    return nodes.map((node) => {
      const nodePath = projectId ? `${projectId}:${node.path}` : node.path;
      const isExpanded = expandedFolders.has(nodePath);
      const isSelected = selectedFile === node.path;
      const paddingLeft = 20 + depth * 12;

      if (node.type === 'directory') {
        const hasChildren = node.children && node.children.length > 0;
        const { icon: folderIcon, color: folderColor } = getFolderIcon(node.name);
        const isEnvFolder = isEnvironmentFolder(node.name);
        const isSandbox = isSandboxFolder(parentPath);
        const displayName = isEnvFolder ? getEnvironmentLabel(node.name) : node.name;

        return (
          <div key={nodePath} className="flex flex-col">
            <button
              onClick={() => toggleFolder(nodePath)}
              className={`w-full flex items-center px-2 py-0.5 hover:bg-[#21262d] cursor-pointer text-[13px] group/item border-0 outline-none ${
                isEnvFolder ? 'text-white font-medium' : isSandbox ? 'text-purple-300' : 'text-[#c9d1d9]'
              }`}
              style={{ paddingLeft: `${paddingLeft}px` }}
            >
              <span
                className={`material-symbols-outlined text-[14px] mr-0.5 text-[#8b949e] transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              >
                chevron_right
              </span>
              <span
                className={`material-symbols-outlined text-[14px] mr-1.5 ${isSandbox ? 'text-purple-400' : folderColor} icon-filled`}
              >
                {isSandbox ? 'inventory_2' : folderIcon}
              </span>
              <span className="truncate">{displayName}</span>
              {/* Environment badge */}
              {isEnvFolder && node.name.toLowerCase() === 'master' && (
                <span className="ml-2 px-1.5 py-0.5 text-[9px] font-semibold bg-green-500/20 text-green-400 rounded">
                  PROD
                </span>
              )}
              {/* Sync button for sandbox folders */}
              {isSandbox && onSyncSandbox && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('[ExplorerPanel] Sync clicked:', { sandboxName: node.name, projectId, parentPath });
                    if (!projectId) {
                      console.error('[ExplorerPanel] projectId is undefined/empty!');
                    }
                    onSyncSandbox(node.name, projectId || '');
                  }}
                  className="ml-auto opacity-0 group-hover/item:opacity-100 p-0.5 hover:bg-[#30363d] rounded transition-opacity"
                  title="Sync from source"
                >
                  <span className="material-symbols-outlined text-[12px] text-[#8b949e] hover:text-[#58a6ff]">
                    sync
                  </span>
                </button>
              )}
              {/* Add sandbox button for Sandboxes folder */}
              {isEnvFolder && node.name.toLowerCase() === 'sandboxes' && onCreateSandbox && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('[ExplorerPanel] Create sandbox clicked:', { projectId, nodePath: node.path });
                    if (!projectId) {
                      console.error('[ExplorerPanel] projectId is undefined/empty for create sandbox!');
                    }
                    onCreateSandbox(projectId || '');
                  }}
                  className="ml-auto opacity-0 group-hover/item:opacity-100 p-0.5 hover:bg-[#30363d] rounded transition-opacity"
                  title="New Sandbox"
                >
                  <span className="material-symbols-outlined text-[12px] text-[#8b949e] hover:text-purple-400">
                    add
                  </span>
                </button>
              )}
              {/* Add file button on hover (not for environment root folders or sandbox root) */}
              {onCreateFile && !isEnvFolder && !isSandbox && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateFile(projectId || '', node.path);
                  }}
                  className="ml-auto opacity-0 group-hover/item:opacity-100 p-0.5 hover:bg-[#30363d] rounded transition-opacity"
                  title="New File"
                >
                  <span className="material-symbols-outlined text-[12px] text-[#8b949e] hover:text-white">
                    add
                  </span>
                </button>
              )}
            </button>

            {isExpanded && hasChildren && (
              <div className="flex flex-col">
                {renderFileTree(node.children!, depth + 1, projectId, node.path)}
              </div>
            )}
          </div>
        );
      }

      // File node
      const { icon, color } = getFileIcon(node.name);

      const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onFileContextMenu) {
          onFileContextMenu(node, projectId, e.clientX, e.clientY);
        }
      };

      return (
        <button
          key={nodePath}
          onClick={() => onFileSelect(node, projectId)}
          onContextMenu={handleContextMenu}
          className={`w-full flex items-center pr-2 py-0.5 cursor-pointer text-[13px] border-0 outline-none ${
            isSelected
              ? 'bg-[#21262d] text-white'
              : 'hover:bg-[#21262d] text-[#8b949e]'
          }`}
          style={{ paddingLeft: `${paddingLeft + 16}px` }}
        >
          <span className={`material-symbols-outlined text-[14px] mr-1.5 ${color}`}>
            {icon}
          </span>
          <span className="truncate">{node.name}</span>
          {node.hasChanges && (
            <span className="ml-auto w-1.5 h-1.5 bg-[#58a6ff] rounded-full" />
          )}
        </button>
      );
    });
  };

  // Render a single project with its file tree
  const renderProject = (project: NestedProject) => {
    const projPath = `proj:${project.id}`;
    const isExpanded = expandedFolders.has(projPath);
    const isSelected = selectedProjectId === project.id;
    const files = projectFiles[project.id] || project.files || [];

    // Debug: Log project details
    console.log('[ExplorerPanel] renderProject:', {
      projectId: project.id,
      projectName: project.name,
      veroPath: project.veroPath,
      fileCount: files.length,
      isExpanded,
    });

    return (
      <div key={project.id} className="flex flex-col">
        {/* Project folder header */}
        <div
          className={`flex items-center gap-1 py-1 px-2 cursor-pointer hover:bg-[#21262d] text-[13px] group ${
            isSelected ? 'bg-[#21262d]/50' : ''
          }`}
          onClick={() => {
            toggleFolder(projPath);
            onProjectSelect?.(project.id);
            if (!isExpanded) {
              onProjectExpand?.(project.id);
            }
          }}
        >
          <span
            className={`material-symbols-outlined text-[14px] text-[#8b949e] transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
          >
            chevron_right
          </span>
          <span className="material-symbols-outlined text-[14px] text-yellow-500 icon-filled">
            folder
          </span>
          <span className="flex-1 font-medium text-[#c9d1d9] truncate">{project.name}</span>
          {/* Delete button on hover */}
          {onDeleteProject && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteProject(project.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-600/20 rounded transition-opacity"
              title="Delete project"
            >
              <span className="material-symbols-outlined text-[12px] text-[#8b949e] hover:text-red-400">
                delete
              </span>
            </button>
          )}
        </div>

        {/* Project contents (Environment folders: master, dev, sandboxes) */}
        {isExpanded && (
          <div className="ml-2">
            {files.length > 0 ? (
              renderFileTree(files, 0, project.id)
            ) : (
              // Default environment structure when no files loaded
              <div className="flex flex-col">
                {/* Master (Production) environment */}
                <button
                  onClick={() => toggleFolder(`${project.id}:master`)}
                  className="flex items-center pl-5 pr-2 py-0.5 hover:bg-[#21262d] cursor-pointer text-white text-[13px] font-medium"
                >
                  <span
                    className={`material-symbols-outlined text-[14px] mr-0.5 text-[#8b949e] transition-transform ${
                      expandedFolders.has(`${project.id}:master`) ? 'rotate-90' : ''
                    }`}
                  >
                    chevron_right
                  </span>
                  <span className="material-symbols-outlined text-[14px] mr-1.5 text-green-500 icon-filled">
                    verified
                  </span>
                  <span>Production</span>
                  <span className="ml-2 px-1.5 py-0.5 text-[9px] font-semibold bg-green-500/20 text-green-400 rounded">
                    PROD
                  </span>
                </button>

                {/* Dev (Development) environment */}
                <button
                  onClick={() => toggleFolder(`${project.id}:dev`)}
                  className="flex items-center pl-5 pr-2 py-0.5 hover:bg-[#21262d] cursor-pointer text-white text-[13px] font-medium"
                >
                  <span
                    className={`material-symbols-outlined text-[14px] mr-0.5 text-[#8b949e] transition-transform ${
                      expandedFolders.has(`${project.id}:dev`) ? 'rotate-90' : ''
                    }`}
                  >
                    chevron_right
                  </span>
                  <span className="material-symbols-outlined text-[14px] mr-1.5 text-blue-500 icon-filled">
                    science
                  </span>
                  <span>Development</span>
                </button>

                {/* Sandboxes folder */}
                <button
                  onClick={() => toggleFolder(`${project.id}:sandboxes`)}
                  className="flex items-center pl-5 pr-2 py-0.5 hover:bg-[#21262d] cursor-pointer text-white text-[13px] font-medium"
                >
                  <span
                    className={`material-symbols-outlined text-[14px] mr-0.5 text-[#8b949e] transition-transform ${
                      expandedFolders.has(`${project.id}:sandboxes`) ? 'rotate-90' : ''
                    }`}
                  >
                    chevron_right
                  </span>
                  <span className="material-symbols-outlined text-[14px] mr-1.5 text-purple-500 icon-filled">
                    folder_shared
                  </span>
                  <span>Sandboxes</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-[260px] bg-[#161b22] border-r border-[#30363d] flex flex-col shrink-0 h-full overflow-hidden">
      {/* Title */}
      <div className="h-9 flex items-center px-3 pt-1 shrink-0">
        <span className="text-[#8b949e] text-[11px] font-semibold uppercase tracking-wider">
          Explorer
        </span>
        <button className="ml-auto text-[#8b949e] hover:text-white cursor-pointer">
          <span className="material-symbols-outlined text-[14px]">more_horiz</span>
        </button>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Application Accordion */}
        <div className="border-b border-[#30363d]/50">
          <button
            onClick={() => setApplicationExpanded(!applicationExpanded)}
            className="w-full flex items-center px-2 py-1 cursor-pointer hover:bg-[#21262d] select-none text-white text-[13px] font-semibold"
          >
            <span
              className={`material-symbols-outlined text-[14px] mr-1 text-[#8b949e] transition-transform ${
                applicationExpanded ? 'rotate-90' : ''
              }`}
            >
              chevron_right
            </span>
            {applicationName.toUpperCase()}
          </button>
        </div>

        {/* Projects list within Application */}
        {applicationExpanded && (
          <div className="py-0.5">
            {/* Header with Add Project button */}
            <div className="flex items-center justify-between px-3 py-1 text-[#8b949e]">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Projects</span>
              {onCreateProject && (
                <button
                  onClick={onCreateProject}
                  className="p-0.5 hover:bg-[#21262d] rounded transition-colors"
                  title="New Project"
                >
                  <span className="material-symbols-outlined text-[14px] hover:text-white">
                    add
                  </span>
                </button>
              )}
            </div>

            {/* Projects */}
            {projects.length > 0 ? (
              projects.map(renderProject)
            ) : (
              <div className="py-4 px-3 text-center">
                <div className="text-[#8b949e] text-[12px] mb-2">
                  No projects in this application yet.
                </div>
                {onCreateProject && (
                  <button
                    onClick={onCreateProject}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] bg-[#238636] hover:bg-[#2ea043] text-white rounded transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    Create First Project
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Outline Panel - shows features/scenarios from active file */}
      <OutlinePanel
        fileContent={activeFileContent || null}
        fileName={activeFileName || null}
        onNavigateToLine={onNavigateToLine}
      />
    </div>
  );
}
