import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, Plus, Search, FolderOpen, FileCode, Trash2, Briefcase, Check } from 'lucide-react';
import { useWorkflowStore } from '@/store/workflowStore';
import { useProjectStore } from '@/store/projectStore';
import { DataPanel } from './DataPanel';

interface ProjectSidebarProps {
    activeFlowId?: string;
    onFlowSelect: (flowId: string) => void;
    onNewFlow: (workflowId: string) => void;
    onDataTableSelect?: (tableId: string) => void;
    selectedDataTableId?: string;
}

export function ProjectSidebar({ activeFlowId, onFlowSelect, onNewFlow, onDataTableSelect, selectedDataTableId }: ProjectSidebarProps) {
    const { workflows, fetchWorkflows, createWorkflow, deleteWorkflow } = useWorkflowStore();
    const { projects, currentProject, fetchProjects, setCurrentProject } = useProjectStore();
    const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; workflowId: string } | null>(null);
    const [showProjectPicker, setShowProjectPicker] = useState(false);

    const onFlowSelectRef = useRef(onFlowSelect);
    onFlowSelectRef.current = onFlowSelect;
    const fetchedRef = useRef(false);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    useEffect(() => {
        if (!currentProject) return;
        if (fetchedRef.current && useWorkflowStore.getState().currentProjectId === currentProject.id) return;
        fetchedRef.current = true;

        fetchWorkflows(currentProject.id).then(() => {
            const { workflows } = useWorkflowStore.getState();
            if (workflows.length > 0 && workflows[0].testFlows && workflows[0].testFlows.length > 0) {
                const firstFlow = workflows[0].testFlows[0];
                onFlowSelectRef.current(firstFlow.id);
                setExpandedWorkflows(new Set([workflows[0].id]));
            }
        });
    }, [fetchWorkflows, currentProject]);

    const toggleWorkflow = (workflowId: string) => {
        const newExpanded = new Set(expandedWorkflows);
        if (newExpanded.has(workflowId)) {
            newExpanded.delete(workflowId);
        } else {
            newExpanded.add(workflowId);
        }
        setExpandedWorkflows(newExpanded);
    };

    const handleCreateWorkflow = async () => {
        if (!currentProject) {
            alert('Please select a project first');
            return;
        }
        const name = prompt('Enter workflow name:');
        if (name) {
            await createWorkflow(name.trim(), currentProject.id);
        }
    };

    const handleDeleteWorkflow = async (workflowId: string, workflowName: string) => {
        if (confirm(`Delete workflow "${workflowName}"?`)) {
            await deleteWorkflow(workflowId);
            setContextMenu(null);
        }
    };

    const filteredWorkflows = workflows.filter(w =>
        w.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col bg-slate-950 border-r border-slate-800/60 w-60">
            {/* Project Selector - Minimal Design */}
            <div className="px-3 pt-4 pb-3">
                <div className="relative">
                    <button
                        onClick={() => setShowProjectPicker(!showProjectPicker)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800/60 rounded-xl transition-all duration-200"
                    >
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Briefcase className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <div className="text-xs text-slate-500 font-medium">Project</div>
                            <div className="text-sm font-semibold text-white truncate">
                                {currentProject?.name || 'Select Project'}
                            </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${showProjectPicker ? 'rotate-180' : ''}`} />
                    </button>

                    {showProjectPicker && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowProjectPicker(false)} />
                            <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl shadow-black/40 overflow-hidden backdrop-blur-xl">
                                {projects.length === 0 ? (
                                    <div className="p-4 text-sm text-slate-500 text-center">No projects yet</div>
                                ) : (
                                    <div className="max-h-64 overflow-y-auto p-1.5">
                                        {projects.map((project) => (
                                            <button
                                                key={project.id}
                                                onClick={() => {
                                                    setCurrentProject(project);
                                                    setShowProjectPicker(false);
                                                    fetchedRef.current = false;
                                                }}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left rounded-lg transition-all duration-150 ${
                                                    currentProject?.id === project.id
                                                        ? 'bg-blue-500/15 text-blue-400'
                                                        : 'hover:bg-slate-800/60 text-slate-300'
                                                }`}
                                            >
                                                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                                                    currentProject?.id === project.id
                                                        ? 'bg-blue-500/20'
                                                        : 'bg-slate-800'
                                                }`}>
                                                    <Briefcase className="w-3 h-3" />
                                                </div>
                                                <span className="flex-1 text-sm truncate">{project.name}</span>
                                                {currentProject?.id === project.id && (
                                                    <Check className="w-4 h-4 text-blue-400" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="border-t border-slate-800/60 p-1.5">
                                    <button
                                        onClick={() => {
                                            const name = prompt('Enter project name:');
                                            if (name) {
                                                useProjectStore.getState().createProject({ name: name.trim() });
                                            }
                                            setShowProjectPicker(false);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm text-slate-400 hover:text-slate-300 hover:bg-slate-800/60 rounded-lg transition-colors"
                                    >
                                        <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center">
                                            <Plus className="w-3.5 h-3.5" />
                                        </div>
                                        New Project
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="px-3 pb-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search flows..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-800/60 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-slate-700 focus:bg-slate-900/80 transition-all duration-200"
                    />
                </div>
            </div>

            {/* Workflows Header */}
            <div className="px-3 pb-2 flex items-center justify-between">
                <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Workflows</h2>
                <button
                    onClick={handleCreateWorkflow}
                    className="p-1 hover:bg-slate-800/60 rounded-md transition-colors group"
                    title="New Workflow"
                >
                    <Plus className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                </button>
            </div>

            {/* Tree View */}
            <div className="flex-1 overflow-y-auto px-2 pb-2">
                {filteredWorkflows.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 rounded-full bg-slate-900/50 flex items-center justify-center mx-auto mb-3">
                            <FolderOpen className="w-5 h-5 text-slate-600" />
                        </div>
                        <p className="text-sm text-slate-500">
                            {searchQuery ? 'No matches found' : 'No workflows yet'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredWorkflows.map((workflow) => (
                            <div key={workflow.id}>
                                {/* Workflow Row */}
                                <div
                                    className="flex items-center gap-1.5 px-2 py-2 hover:bg-slate-800/40 rounded-lg cursor-pointer group transition-colors duration-150"
                                    onClick={() => toggleWorkflow(workflow.id)}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        setContextMenu({ x: e.clientX, y: e.clientY, workflowId: workflow.id });
                                    }}
                                >
                                    <div className={`transition-transform duration-200 ${expandedWorkflows.has(workflow.id) ? 'rotate-90' : ''}`}>
                                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                    </div>
                                    <FolderOpen className={`w-4 h-4 transition-colors ${expandedWorkflows.has(workflow.id) ? 'text-blue-400' : 'text-slate-500'}`} />
                                    <span className="flex-1 text-sm text-slate-300 truncate font-medium">{workflow.name}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onNewFlow(workflow.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700/60 rounded transition-all duration-150"
                                        title="New Flow"
                                    >
                                        <Plus className="w-3.5 h-3.5 text-slate-400" />
                                    </button>
                                </div>

                                {/* Test Flows (Expanded) */}
                                {expandedWorkflows.has(workflow.id) && (
                                    <div className="ml-3 mt-0.5 space-y-0.5 border-l border-slate-800/60 pl-3">
                                        {workflow.testFlows && workflow.testFlows.length > 0 ? (
                                            workflow.testFlows.map((flow: any) => (
                                                <div
                                                    key={flow.id}
                                                    onClick={() => onFlowSelect(flow.id)}
                                                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
                                                        activeFlowId === flow.id
                                                            ? 'bg-emerald-500/15 text-emerald-400 shadow-sm shadow-emerald-500/5'
                                                            : 'hover:bg-slate-800/40 text-slate-400 hover:text-slate-300'
                                                    }`}
                                                >
                                                    <FileCode className={`w-4 h-4 ${activeFlowId === flow.id ? 'text-emerald-400' : ''}`} />
                                                    <span className="flex-1 text-sm truncate">{flow.name || 'Untitled Flow'}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-sm text-slate-600 italic px-2.5 py-2">No flows yet</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Data Tables Section */}
            {workflows.length > 0 && (
                <DataPanel
                    workflowId={workflows[0]?.id}
                    selectedTableId={selectedDataTableId}
                    onTableSelect={onDataTableSelect || (() => { })}
                />
            )}

            {/* Context Menu */}
            {contextMenu && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
                    <div
                        className="fixed z-50 bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl shadow-black/40 py-1.5 min-w-[180px] overflow-hidden"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        <button
                            onClick={() => {
                                const workflow = workflows.find(w => w.id === contextMenu.workflowId);
                                if (workflow) {
                                    handleDeleteWorkflow(workflow.id, workflow.name);
                                }
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Workflow
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
