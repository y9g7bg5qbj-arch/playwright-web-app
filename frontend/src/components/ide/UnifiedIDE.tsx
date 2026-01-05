import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProjectSidebar } from './ProjectSidebar';
import { PlaywrightIDE } from './PlaywrightIDE';
import { DataTableEditor } from './DataTableEditor';
import { testFlowsApi } from '@/api/testFlows';
import { useWorkflowStore } from '@/store/workflowStore';
import { useProjectStore } from '@/store/projectStore';
import {
    Play,
    History,
    X,
} from 'lucide-react';
import type { ShardInfo } from '../execution/LiveExecutionViewer';

// Import components
import { ExecutionDashboard, LiveExecutionGrid, LocalExecutionViewer } from '../ExecutionDashboard';
import { TraceViewerPanel } from '../TraceViewer/TraceViewerPanel';

type CanvasView = 'flow' | 'executions' | 'live-execution' | 'trace';

export function UnifiedIDE() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeFlowId, setActiveFlowId] = useState<string | undefined>(
        searchParams.get('flow') || undefined
    );
    const [selectedDataTableId, setSelectedDataTableId] = useState<string | undefined>();

    // Canvas view state
    const [canvasView, setCanvasView] = useState<CanvasView>('flow');
    const [viewHistory, setViewHistory] = useState<CanvasView[]>([]);
    const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
    const [activeShards, setActiveShards] = useState<ShardInfo[]>([]);
    const [executionMode, setExecutionMode] = useState<'docker' | 'local'>('local');
    const [selectedTraceUrl, setSelectedTraceUrl] = useState<string | null>(null);
    const [selectedTraceName, setSelectedTraceName] = useState<string>('');

    // Navigation helpers
    const navigateTo = useCallback((view: CanvasView) => {
        setViewHistory(prev => [...prev, canvasView]);
        setCanvasView(view);
    }, [canvasView]);

    const goBack = useCallback(() => {
        if (viewHistory.length > 0) {
            const prev = viewHistory[viewHistory.length - 1];
            setViewHistory(h => h.slice(0, -1));
            setCanvasView(prev);
        } else {
            setCanvasView('flow');
        }
    }, [viewHistory]);

    const handleViewLive = useCallback((execId: string, mode: 'docker' | 'local', shards?: ShardInfo[]) => {
        setActiveExecutionId(execId);
        setExecutionMode(mode);
        setActiveShards(shards || []);
        navigateTo('live-execution');
    }, [navigateTo]);

    const handleViewTrace = useCallback((url: string, name: string) => {
        setSelectedTraceUrl(url);
        setSelectedTraceName(name);
        navigateTo('trace');
    }, [navigateTo]);

    const handleFlowSelect = useCallback((flowId: string) => {
        setActiveFlowId(flowId);
        setSearchParams({ flow: flowId });
        setSelectedDataTableId(undefined);
        // Return to flow view if in another view
        if (canvasView !== 'flow') {
            setCanvasView('flow');
            setViewHistory([]);
        }
    }, [setSearchParams, canvasView]);

    const handleDataTableSelect = useCallback((tableId: string) => {
        setSelectedDataTableId(tableId);
    }, []);

    const handleNewFlow = useCallback(async (workflowId: string) => {
        const flowName = window.prompt('Enter a name for the new test flow:', 'New Test Flow');
        if (!flowName) return;

        try {
            const newFlow = await testFlowsApi.create(workflowId, {
                name: flowName,
                language: 'typescript',
                nodes: JSON.stringify([]),
                edges: JSON.stringify([]),
            });

            // Refetch workflows for the current project
            const { fetchWorkflows } = useWorkflowStore.getState();
            const currentProject = useProjectStore.getState().currentProject;
            await fetchWorkflows(currentProject?.id);
            handleFlowSelect(newFlow.id);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`Failed to create flow: ${errorMessage}`);
        }
    }, [handleFlowSelect]);

    return (
        <div className="h-screen flex flex-col bg-slate-950">
            {/* Clean Top Bar */}
            <div className="h-12 bg-slate-900 border-b border-slate-800/50 flex items-center px-4">
                {/* Left: Brand */}
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                        <Play className="w-3.5 h-3.5 text-white fill-white" />
                    </div>
                    <span className="font-semibold text-white text-sm">Vero</span>
                </div>

                <div className="flex-1" />

                {/* Right: View Toggle */}
                <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
                    <button
                        onClick={() => {
                            setCanvasView('flow');
                            setViewHistory([]);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            canvasView === 'flow'
                                ? 'bg-slate-700 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Play className="w-3.5 h-3.5" />
                        Editor
                    </button>
                    <button
                        onClick={() => {
                            setCanvasView('executions');
                            setViewHistory([]);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            canvasView !== 'flow'
                                ? 'bg-slate-700 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <History className="w-3.5 h-3.5" />
                        Runs
                    </button>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Project Sidebar */}
                <div className="relative z-50 h-full">
                    <ProjectSidebar
                        activeFlowId={activeFlowId}
                        onFlowSelect={handleFlowSelect}
                        onNewFlow={handleNewFlow}
                        onDataTableSelect={handleDataTableSelect}
                        selectedDataTableId={selectedDataTableId}
                    />
                </div>

                {/* Center: Main Canvas Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Flow Editor View */}
                    {canvasView === 'flow' && (
                        selectedDataTableId ? (
                            <DataTableEditor
                                tableId={selectedDataTableId}
                                onClose={() => setSelectedDataTableId(undefined)}
                            />
                        ) : activeFlowId ? (
                            <PlaywrightIDE testFlowId={activeFlowId} />
                        ) : (
                            <EmptyState />
                        )
                    )}

                    {/* Execution Dashboard View */}
                    {canvasView === 'executions' && (
                        <ExecutionDashboard
                            onViewLive={handleViewLive}
                            onViewTrace={handleViewTrace}
                            onBack={() => {
                                setCanvasView('flow');
                                setViewHistory([]);
                            }}
                        />
                    )}

                    {/* Live Execution View */}
                    {canvasView === 'live-execution' && activeExecutionId && (
                        executionMode === 'docker' ? (
                            <LiveExecutionGrid
                                executionId={activeExecutionId}
                                shards={activeShards}
                                mode={executionMode}
                                onBack={goBack}
                            />
                        ) : (
                            <LocalExecutionViewer
                                executionId={activeExecutionId}
                                onBack={goBack}
                            />
                        )
                    )}

                    {/* Trace Viewer View */}
                    {canvasView === 'trace' && selectedTraceUrl && (
                        <div className="flex-1 relative">
                            <button
                                onClick={goBack}
                                className="absolute top-4 right-4 z-10 p-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                            <TraceViewerPanel
                                traceUrl={selectedTraceUrl}
                                testId="trace-view"
                                testName={selectedTraceName}
                                onClose={goBack}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex-1 flex items-center justify-center bg-slate-950">
            <div className="text-center max-w-sm">
                <div className="w-20 h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Play className="w-10 h-10 text-slate-600" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                    Select a Test Flow
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                    Choose a test flow from the sidebar to start editing, or create a new one by clicking the + button on a workflow.
                </p>
            </div>
        </div>
    );
}
