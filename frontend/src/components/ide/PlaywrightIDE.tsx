import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import {
    Play,
    Save,
    Code2,
    Circle,
    Square,
    Loader2,
    Check,
    Monitor,
    Settings,
    Zap,
    ChevronDown,
} from 'lucide-react';
import { IDEFlowCanvas } from './IDEFlowCanvas';
import { IDEPropertiesPanel } from './IDEPropertiesPanel';
import { useFlowStore } from '@/store/useFlowStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { generateCodeFromGraph } from './graph/graphToCode';
import { recorderApi } from '@/api/recorder';
import { testFlowsApi } from '@/api/testFlows';
import { useWebSocket } from '@/hooks/useWebSocket';
import { convertCodeToFlow } from '@/utils/codeToFlow';

// Run Configuration
import { useRunConfigStore } from '@/store/useRunConfigStore';
import { RunConfigurationModal } from '@/components/RunConfiguration';

interface PlaywrightIDEProps {
    testFlowId?: string;
}

export function PlaywrightIDE({ testFlowId }: PlaywrightIDEProps) {
    const {
        nodes,
        edges,
        addNode,
        setNodes,
        setEdges,
        isRunning,
        setNodeStatus,
        clearExecutionState,
        setIsRunning,
        setIsPaused,
    } = useFlowStore();
    const { workflows } = useWorkflowStore();

    const [isRecording, setIsRecording] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [flowName, setFlowName] = useState('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const { socket } = useWebSocket();
    const hasRecordedRef = useRef(false);
    const lastLoadedFlowIdRef = useRef<string | null>(null);
    const executionIdRef = useRef<string | null>(null);
    const [recordingError, setRecordingError] = useState<string | null>(null);

    // View state
    const [activeView, setActiveView] = useState<'canvas' | 'code'>('canvas');
    const [showSettings, setShowSettings] = useState(false);
    const [showRunConfigModal, setShowRunConfigModal] = useState(false);
    const [showRunDropdown, setShowRunDropdown] = useState(false);

    // Run configuration store - with safe fallbacks
    const runConfigState = useRunConfigStore();
    const configurations = runConfigState.configurations || [];
    const selectedConfigId = runConfigState.selectedConfigId;
    const environments = runConfigState.environments || [];
    const runners = runConfigState.runners || [];
    const availableTags = runConfigState.availableTags || [];

    // Actions from store
    const setRunConfigWorkflowId = runConfigState.setWorkflowId;
    const selectConfiguration = runConfigState.selectConfiguration;
    const createConfiguration = runConfigState.createConfiguration;
    const updateConfiguration = runConfigState.updateConfiguration;
    const deleteConfiguration = runConfigState.deleteConfiguration;
    const duplicateConfiguration = runConfigState.duplicateConfiguration;
    const createEnvironment = runConfigState.createEnvironment;

    // Execution state
    const [traceUrl, setTraceUrl] = useState<string | null>(null);
    const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);

    // Settings
    const [traceMode, setTraceMode] = useState<'always' | 'on-failure' | 'never'>('on-failure');

    // Load flow data when testFlowId changes
    const previousFlowIdRef = useRef<string | null>(null);
    const initialLoadDoneRef = useRef(false);

    useEffect(() => {
        if (!testFlowId || workflows.length === 0) return;
        if (isRecording || hasRecordedRef.current || isSaving) return;

        const isNewFlowSelection = testFlowId !== previousFlowIdRef.current;
        if (!isNewFlowSelection && lastLoadedFlowIdRef.current === testFlowId) return;

        if (isNewFlowSelection) {
            previousFlowIdRef.current = testFlowId;
            lastLoadedFlowIdRef.current = null;
        }

        let foundFlow: any = null;
        for (const workflow of workflows) {
            if (workflow.testFlows) {
                foundFlow = workflow.testFlows.find((f: any) => f.id === testFlowId);
                if (foundFlow) break;
            }
        }

        if (foundFlow) {
            try {
                let flowNodes = typeof foundFlow.nodes === 'string' ? JSON.parse(foundFlow.nodes) : (foundFlow.nodes || []);
                let flowEdges = typeof foundFlow.edges === 'string' ? JSON.parse(foundFlow.edges) : (foundFlow.edges || []);

                if (flowNodes.length === 0) {
                    flowNodes = [
                        { id: 'start-default', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Start', actionType: 'start' } },
                        { id: 'end-default', type: 'end', position: { x: 250, y: 200 }, data: { label: 'End', actionType: 'end' } },
                    ];
                    flowEdges = [{ id: 'edge-start-end', source: 'start-default', target: 'end-default', type: 'default' }];
                }

                setNodes(flowNodes);
                setEdges(flowEdges);
                lastLoadedFlowIdRef.current = testFlowId;
                initialLoadDoneRef.current = false;
            } catch (e) {
                console.error('Failed to parse flow data:', e);
                setNodes([]);
                setEdges([]);
            }
        }
    }, [testFlowId, workflows, setNodes, setEdges, isRecording, isSaving]);

    // Load flow name and initialize run config store
    useEffect(() => {
        if (!testFlowId || workflows.length === 0) return;
        for (const workflow of workflows) {
            if (workflow.testFlows) {
                const flow = workflow.testFlows.find((f: any) => f.id === testFlowId);
                if (flow) {
                    setFlowName(flow.name);
                    setHasUnsavedChanges(false);
                    // Initialize run configuration store for this workflow
                    // Use getState to avoid dependency on the action function
                    useRunConfigStore.getState().setWorkflowId(workflow.id);
                    return;
                }
            }
        }
    }, [testFlowId, workflows]);

    // Track unsaved changes
    useEffect(() => {
        if (initialLoadDoneRef.current && !hasRecordedRef.current) {
            setHasUnsavedChanges(true);
        }
    }, [nodes, edges]);

    useEffect(() => {
        if (lastLoadedFlowIdRef.current === testFlowId && nodes.length > 0) {
            const timer = setTimeout(() => { initialLoadDoneRef.current = true; }, 500);
            return () => clearTimeout(timer);
        } else {
            initialLoadDoneRef.current = false;
        }
    }, [testFlowId, nodes.length]);

    // Recording handlers
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const handleRecordingComplete = useCallback((code: string) => {
        setIsRecording(false);
        hasRecordedRef.current = true;
        if (code && code.trim()) {
            const { nodes: newNodes, edges: newEdges } = convertCodeToFlow(code);
            if (newNodes.length > 0) {
                setNodes(newNodes);
                setEdges(newEdges);
            }
        }
    }, [setNodes, setEdges]);

    const startPolling = useCallback((flowId: string) => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
            try {
                const status = await recorderApi.getCode(flowId);
                if (status?.isComplete && status?.code) {
                    if (pollingRef.current) {
                        clearInterval(pollingRef.current);
                        pollingRef.current = null;
                    }
                    handleRecordingComplete(status.code);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 2000);
    }, [handleRecordingComplete]);

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    useEffect(() => () => stopPolling(), [stopPolling]);

    const toggleRecording = async () => {
        if (!testFlowId) {
            setRecordingError('Select a test flow first');
            setTimeout(() => setRecordingError(null), 3000);
            return;
        }
        setRecordingError(null);

        try {
            if (isRecording) {
                stopPolling();
                setIsRecording(false);
                const response = await recorderApi.stopRecording(testFlowId);
                handleRecordingComplete(response?.code || '');
            } else {
                setIsRecording(true);
                hasRecordedRef.current = false;
                await recorderApi.startRecording('https://google.com', testFlowId);
                startPolling(testFlowId);
            }
        } catch (error) {
            console.error('Recording error:', error);
            setIsRecording(false);
            stopPolling();
            setRecordingError(error instanceof Error ? error.message : 'Recording failed');
        }
    };

    // Socket handlers for recorded actions
    useEffect(() => {
        if (!socket) return;
        const handleRecordedAction = (action: any) => {
            const newNode = {
                id: `recorded-${Date.now()}`,
                type: 'action',
                position: { x: 250, y: (nodes.length + 1) * 100 },
                data: { label: action.action || 'Recorded Action', actionType: action.action, selector: action.selector, value: action.value }
            };
            addNode(newNode);
        };
        socket.on('recorded-action' as any, handleRecordedAction);
        return () => { socket.off('recorded-action' as any, handleRecordedAction); };
    }, [socket, addNode, nodes.length]);

    // Generate code
    const generatedCode = useMemo(() => {
        try {
            return generateCodeFromGraph(nodes, edges);
        } catch (error) {
            console.error('Code generation failed:', error);
            return '// Error generating code';
        }
    }, [nodes, edges]);

    // Get execution order
    const getExecutionOrder = useCallback(() => {
        const startNode = nodes.find(n => n.type === 'start');
        if (!startNode) return [];
        const order: string[] = [];
        const visited = new Set<string>();
        const traverse = (nodeId: string) => {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;
            if (node.type === 'action') order.push(nodeId);
            edges.filter(e => e.source === nodeId).forEach(edge => traverse(edge.target));
        };
        traverse(startNode.id);
        return order;
    }, [nodes, edges]);

    // Run flow
    const runFlow = useCallback(async () => {
        if (isRunning || !socket || !testFlowId) return;
        if (!generatedCode || !generatedCode.includes('page.')) {
            alert('Add some actions to your flow first.');
            return;
        }

        clearExecutionState();
        setIsRunning(true);
        setTraceUrl(null);
        setCurrentScreenshot(null);

        const executionId = `exec-${Date.now()}`;
        executionIdRef.current = executionId;
        const executionOrder = getExecutionOrder();

        socket.off('execution:complete' as any);
        socket.off('execution:log' as any);
        socket.off('execution:screenshot' as any);

        const handleComplete = (data: any) => {
            if (data.executionId === executionId) {
                setIsRunning(false);
                const passed = data.exitCode === 0;
                executionOrder.forEach(id => setNodeStatus(id, passed ? 'success' : 'failure', data.duration));

                if (traceMode === 'always' || (traceMode === 'on-failure' && !passed)) {
                    setTraceUrl(data.traceUrl || `/api/executions/${executionId}/trace`);
                }
            }
        };

        const handleLog = (data: any) => {
            if (data.executionId === executionId) {
                console.log('[Execution]', data.message);
            }
        };

        const handleScreenshot = (data: any) => {
            if (data.executionId === executionId) {
                setCurrentScreenshot(data.imageData);
            }
        };

        socket.on('execution:complete' as any, handleComplete);
        socket.on('execution:log' as any, handleLog);
        socket.on('execution:screenshot' as any, handleScreenshot);

        executionOrder.forEach(id => setNodeStatus(id, 'running'));
        socket.emit('execution:start' as any, { executionId, testFlowId, code: generatedCode, target: 'local', traceMode });

    }, [socket, testFlowId, generatedCode, isRunning, getExecutionOrder, clearExecutionState, setIsRunning, setNodeStatus, traceMode]);

    const handleStop = () => {
        if (socket && executionIdRef.current) {
            socket.emit('execution:cancel' as any, { executionId: executionIdRef.current });
        }
        setIsRunning(false);
        setIsPaused(false, null);
        clearExecutionState();
    };

    // Save flow
    const handleSaveFlow = async () => {
        if (!testFlowId) return;
        setIsSaving(true);
        try {
            await testFlowsApi.update(testFlowId, {
                name: flowName,
                nodes: JSON.stringify(nodes),
                edges: JSON.stringify(edges),
            });
            setHasUnsavedChanges(false);
            hasRecordedRef.current = false;
            lastLoadedFlowIdRef.current = testFlowId;
            const { fetchWorkflows } = useWorkflowStore.getState();
            await fetchWorkflows();
        } catch (error) {
            console.error('Failed to save:', error);
            alert('Failed to save flow');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950">
            {/* Clean Canvas Toolbar */}
            <div className="h-14 border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-between px-4">
                {/* Left: Flow Name + Status */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-500" />
                        <span className="font-medium text-white text-sm">{flowName || 'Untitled Flow'}</span>
                        {hasUnsavedChanges && (
                            <span className="w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />
                        )}
                    </div>

                    {recordingError && (
                        <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
                            {recordingError}
                        </span>
                    )}
                </div>

                {/* Center: View Toggle */}
                <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-0.5">
                    <button
                        onClick={() => setActiveView('canvas')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            activeView === 'canvas'
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Visual
                    </button>
                    <button
                        onClick={() => setActiveView('code')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            activeView === 'code'
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Code2 className="w-3 h-3" />
                        Code
                    </button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {/* Record Button */}
                    <button
                        onClick={toggleRecording}
                        disabled={isRunning}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isRecording
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                        } disabled:opacity-50`}
                    >
                        {isRecording ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Recording...
                            </>
                        ) : (
                            <>
                                <Circle className="w-3.5 h-3.5" />
                                Record
                            </>
                        )}
                    </button>

                    {/* Run/Stop Button with Dropdown */}
                    {isRunning ? (
                        <button
                            onClick={handleStop}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium transition-all"
                        >
                            <Square className="w-3.5 h-3.5" />
                            Stop
                        </button>
                    ) : (
                        <div className="relative flex">
                            {/* Main Run Button */}
                            <button
                                onClick={runFlow}
                                disabled={nodes.length < 2}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-l-lg text-xs font-medium transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Play className="w-3.5 h-3.5" />
                                Run
                            </button>
                            {/* Dropdown Toggle */}
                            <button
                                onClick={() => setShowRunDropdown(!showRunDropdown)}
                                disabled={nodes.length < 2}
                                className="flex items-center px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-r-lg text-xs font-medium transition-all border-l border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Run Dropdown Menu */}
                            {showRunDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowRunDropdown(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                                        <div className="p-3 border-b border-slate-700">
                                            <span className="text-xs font-medium text-slate-400">Run Configuration</span>
                                        </div>
                                        <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                                            {configurations.length === 0 ? (
                                                <p className="text-xs text-slate-500 px-2 py-2">No saved configurations</p>
                                            ) : (
                                                configurations.map((config) => (
                                                    <button
                                                        key={config.id}
                                                        onClick={() => {
                                                            selectConfiguration(config.id);
                                                            setShowRunDropdown(false);
                                                            runFlow();
                                                        }}
                                                        className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-left hover:bg-slate-700/50 ${
                                                            selectedConfigId === config.id ? 'bg-slate-700/50' : ''
                                                        }`}
                                                    >
                                                        <div>
                                                            <p className="text-sm text-slate-200">{config.name}</p>
                                                            <p className="text-xs text-slate-500">
                                                                {config.browser} | {config.target} | {config.workers} worker(s)
                                                            </p>
                                                        </div>
                                                        {config.isDefault && (
                                                            <span className="px-1.5 py-0.5 bg-blue-600/30 text-blue-400 text-xs rounded">
                                                                Default
                                                            </span>
                                                        )}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                        <div className="p-2 border-t border-slate-700">
                                            <button
                                                onClick={() => {
                                                    setShowRunDropdown(false);
                                                    setShowRunConfigModal(true);
                                                }}
                                                className="w-full flex items-center gap-2 px-2 py-2 text-sm text-blue-400 hover:bg-slate-700/50 rounded-lg"
                                            >
                                                <Settings className="w-4 h-4" />
                                                Configure Run Settings...
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Settings Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                        >
                            <Settings className="w-4 h-4" />
                        </button>

                        {showSettings && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                                    <div className="p-3 border-b border-slate-700">
                                        <span className="text-xs font-medium text-slate-400">Trace Recording</span>
                                    </div>
                                    <div className="p-2">
                                        {(['always', 'on-failure', 'never'] as const).map((mode) => (
                                            <label
                                                key={mode}
                                                className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-700/50 cursor-pointer"
                                            >
                                                <input
                                                    type="radio"
                                                    checked={traceMode === mode}
                                                    onChange={() => setTraceMode(mode)}
                                                    className="w-3.5 h-3.5 text-emerald-500"
                                                />
                                                <span className="text-sm text-slate-300 capitalize">{mode.replace('-', ' ')}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSaveFlow}
                        disabled={isSaving || !testFlowId}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            hasUnsavedChanges
                                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        } disabled:opacity-50`}
                    >
                        {isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Save className="w-3.5 h-3.5" />
                        )}
                        Save
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Canvas/Code View */}
                <div className="flex-1 relative">
                    {activeView === 'canvas' ? (
                        <>
                            <IDEFlowCanvas />
                            <IDEPropertiesPanel />

                            {/* Execution Preview (shown during/after run) */}
                            {(isRunning || currentScreenshot || traceUrl) && (
                                <div className="absolute bottom-4 left-4 w-80 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
                                    <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Monitor className="w-4 h-4 text-emerald-400" />
                                            <span className="text-xs font-medium text-white">
                                                {isRunning ? 'Running...' : 'Last Run'}
                                            </span>
                                        </div>
                                        {isRunning && (
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        )}
                                    </div>
                                    <div className="aspect-video bg-slate-950 flex items-center justify-center">
                                        {currentScreenshot ? (
                                            <img
                                                src={currentScreenshot}
                                                alt="Execution"
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <Monitor className="w-8 h-8 text-slate-700" />
                                        )}
                                    </div>
                                    {traceUrl && !isRunning && (
                                        <div className="p-2 border-t border-slate-800">
                                            <button
                                                onClick={() => {
                                                    const match = traceUrl.match(/executions\/(exec-\d+)/);
                                                    if (match) {
                                                        fetch(`http://localhost:3000/api/executions/${match[1]}/trace/view`, { method: 'POST' });
                                                    }
                                                }}
                                                className="w-full py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                Open Trace Viewer
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <Editor
                            height="100%"
                            defaultLanguage="typescript"
                            value={generatedCode}
                            theme="vs-dark"
                            options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                fontSize: 13,
                                fontFamily: 'JetBrains Mono, Menlo, monospace',
                                scrollBeyondLastLine: false,
                                padding: { top: 16, bottom: 16 },
                                lineNumbers: 'on',
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Run Configuration Modal - temporarily disabled for debugging */}
            {showRunConfigModal && (
                <RunConfigurationModal
                    isOpen={showRunConfigModal}
                    onClose={() => setShowRunConfigModal(false)}
                    configuration={configurations.find(c => c.id === selectedConfigId) || null}
                    configurations={configurations}
                    environments={environments}
                    availableTags={availableTags}
                    onSave={async (data) => {
                        if (selectedConfigId) {
                            await updateConfiguration(selectedConfigId, data);
                        }
                    }}
                    onCreate={async (data) => {
                        await createConfiguration(data);
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
                        runFlow();
                    }}
                    onCreateEnvironment={async (data) => {
                        await createEnvironment(data);
                    }}
                    isLoading={false}
                />
            )}
        </div>
    );
}
