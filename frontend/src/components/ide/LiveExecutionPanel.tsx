import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Play,
    Pause,
    Square,
    RotateCcw,
    Check,
    X,
    Loader2,
    Monitor,
    MessageSquare,
    ChevronRight,
    AlertCircle,
    Eye,
    Send,
    SkipForward,
} from 'lucide-react';

interface StepResult {
    step_index: number;
    step_text: string;
    success: boolean;
    error?: string;
    duration_ms: number;
    screenshot?: string;
}

interface LiveExecutionPanelProps {
    isVisible?: boolean;
    onClose?: () => void;
}

type ExecutionState = 'idle' | 'starting' | 'running' | 'paused' | 'waiting_for_correction' | 'completed' | 'failed' | 'stopped';

export function LiveExecutionPanel({ isVisible = true, onClose }: LiveExecutionPanelProps) {
    // Connection state
    const [, setSessionId] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    // Execution state
    const [executionState, setExecutionState] = useState<ExecutionState>('idle');
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [steps, setSteps] = useState<string[]>([]);
    const [results, setResults] = useState<StepResult[]>([]);
    const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);

    // Input state
    const [targetUrl, setTargetUrl] = useState('');
    const [stepsInput, setStepsInput] = useState('');
    const [correction, setCorrection] = useState('');
    const [showCorrection, setShowCorrection] = useState(false);

    // Settings
    const [headless, setHeadless] = useState(false);
    const [stepDelay, setStepDelay] = useState(500);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    // Connect to WebSocket
    const connectWebSocket = useCallback((sid: string) => {
        const wsUrl = `ws://localhost:5001/ws/live/${sid}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('[LiveExecution] WebSocket connected');
            setConnected(true);
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            handleMessage(message);
        };

        ws.onerror = (error) => {
            console.error('[LiveExecution] WebSocket error:', error);
            setConnected(false);
        };

        ws.onclose = () => {
            console.log('[LiveExecution] WebSocket closed');
            setConnected(false);
        };

        wsRef.current = ws;
    }, []);

    // Handle incoming WebSocket messages
    const handleMessage = useCallback((message: { type: string; data: any }) => {
        console.log('[LiveExecution] Message:', message.type, message.data);

        switch (message.type) {
            case 'state_change':
                setExecutionState(message.data.state);
                if (message.data.state === 'waiting_for_correction') {
                    setShowCorrection(true);
                }
                break;

            case 'step_complete':
                const result: StepResult = message.data;
                setResults(prev => [...prev, result]);
                setCurrentStepIndex(result.step_index + 1);
                if (result.screenshot) {
                    setCurrentScreenshot(result.screenshot);
                }
                break;

            case 'screenshot':
                setCurrentScreenshot(message.data.image);
                break;

            case 'execution_complete':
                setExecutionState(message.data.success ? 'completed' : 'failed');
                break;

            case 'error':
                console.error('[LiveExecution] Error:', message.data.message);
                break;

            case 'correction_received':
                setShowCorrection(false);
                setCorrection('');
                break;
        }
    }, []);

    // Send WebSocket message
    const sendMessage = useCallback((type: string, data: any = {}) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type, ...data }));
        }
    }, []);

    // Start execution
    const handleStart = async () => {
        if (!stepsInput.trim()) return;

        // Parse steps
        const stepsList = stepsInput
            .split('\n')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('#'));

        setSteps(stepsList);
        setResults([]);
        setCurrentStepIndex(0);
        setCurrentScreenshot(null);
        setExecutionState('starting');

        try {
            // Get session ID
            const response = await fetch('http://localhost:5001/api/live/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    steps: stepsList,
                    url: targetUrl || undefined,
                    headless,
                    step_delay_ms: stepDelay,
                }),
            });

            const data = await response.json();
            setSessionId(data.session_id);

            // Connect WebSocket
            connectWebSocket(data.session_id);

            // Wait for connection, then start
            setTimeout(() => {
                sendMessage('start', {
                    steps: stepsList,
                    url: targetUrl || undefined,
                    headless,
                    step_delay_ms: stepDelay,
                });
            }, 500);
        } catch (error) {
            console.error('Failed to start:', error);
            setExecutionState('failed');
        }
    };

    // Pause execution
    const handlePause = () => {
        sendMessage('pause');
    };

    // Resume execution
    const handleResume = () => {
        sendMessage('resume');
    };

    // Stop execution
    const handleStop = () => {
        sendMessage('stop');
        if (wsRef.current) {
            wsRef.current.close();
        }
        setExecutionState('stopped');
    };

    // Send correction
    const handleSendCorrection = () => {
        if (correction.trim()) {
            sendMessage('correct', { correction: correction.trim() });
        }
    };

    // Skip current step
    const handleSkip = () => {
        sendMessage('skip');
        setShowCorrection(false);
    };

    // Get state badge color
    const getStateBadgeColor = () => {
        switch (executionState) {
            case 'running': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'paused': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'waiting_for_correction': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-slate-700 text-slate-400 border-slate-600';
        }
    };

    if (!isVisible) return null;

    return (
        <div className="flex flex-col h-full bg-slate-900/95 border-l border-slate-700 w-[480px]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900">
                <div className="flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-cyan-400" />
                    <h3 className="font-semibold text-slate-200">Live Execution</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getStateBadgeColor()}`}>
                        {executionState}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {connected && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            Connected
                        </span>
                    )}
                    {onClose && (
                        <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded text-slate-400">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Screenshot Preview */}
                <div className="h-48 bg-slate-950 border-b border-slate-700 flex items-center justify-center">
                    {currentScreenshot ? (
                        <img
                            src={`data:image/png;base64,${currentScreenshot}`}
                            alt="Browser Screenshot"
                            className="max-w-full max-h-full object-contain"
                        />
                    ) : (
                        <div className="text-slate-600 flex flex-col items-center gap-2">
                            <Eye className="w-8 h-8" />
                            <span className="text-sm">Browser preview will appear here</span>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="p-3 border-b border-slate-700 flex items-center gap-2">
                    {executionState === 'idle' || executionState === 'completed' || executionState === 'failed' || executionState === 'stopped' ? (
                        <button
                            onClick={handleStart}
                            disabled={!stepsInput.trim()}
                            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all"
                        >
                            <Play className="w-4 h-4" />
                            Start
                        </button>
                    ) : (
                        <>
                            {executionState === 'running' ? (
                                <button
                                    onClick={handlePause}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-medium"
                                >
                                    <Pause className="w-4 h-4" />
                                    Pause
                                </button>
                            ) : executionState === 'paused' ? (
                                <button
                                    onClick={handleResume}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium"
                                >
                                    <Play className="w-4 h-4" />
                                    Resume
                                </button>
                            ) : null}
                            <button
                                onClick={handleStop}
                                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium"
                            >
                                <Square className="w-4 h-4" />
                                Stop
                            </button>
                        </>
                    )}

                    {/* Progress */}
                    {steps.length > 0 && (
                        <div className="ml-auto text-sm text-slate-400">
                            Step {Math.min(currentStepIndex + 1, steps.length)} / {steps.length}
                        </div>
                    )}
                </div>

                {/* Correction Input (shown when waiting) */}
                {showCorrection && (
                    <div className="p-3 bg-purple-500/10 border-b border-purple-500/30">
                        <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-medium text-purple-300">Provide Correction</span>
                        </div>
                        <p className="text-xs text-purple-300/70 mb-2">
                            The step failed. Describe what the agent should do differently:
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={correction}
                                onChange={(e) => setCorrection(e.target.value)}
                                placeholder="e.g., Click the BLUE button, not the green one"
                                className="flex-1 bg-slate-800 border border-purple-500/30 rounded px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
                                onKeyDown={(e) => e.key === 'Enter' && handleSendCorrection()}
                            />
                            <button
                                onClick={handleSendCorrection}
                                disabled={!correction.trim()}
                                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded text-sm"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleSkip}
                                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm"
                                title="Skip this step"
                            >
                                <SkipForward className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Steps & Results */}
                <div className="flex-1 overflow-y-auto p-3">
                    {executionState === 'idle' ? (
                        <div className="space-y-3">
                            {/* URL Input */}
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Target URL</label>
                                <input
                                    type="text"
                                    value={targetUrl}
                                    onChange={(e) => setTargetUrl(e.target.value)}
                                    placeholder="https://your-app.com"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                                />
                            </div>

                            {/* Steps Input */}
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Test Steps (plain English)</label>
                                <textarea
                                    value={stepsInput}
                                    onChange={(e) => setStepsInput(e.target.value)}
                                    placeholder={`Navigate to the login page
Click on the "Sign In" button
Fill the email field with test@example.com
Fill the password field with secret123
Click the Submit button
Verify "Welcome" message is visible`}
                                    rows={8}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono resize-none"
                                />
                            </div>

                            {/* Settings */}
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={headless}
                                        onChange={(e) => setHeadless(e.target.checked)}
                                        className="w-4 h-4 rounded bg-slate-700 border-slate-600"
                                    />
                                    Headless mode
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-400">Delay:</span>
                                    <input
                                        type="number"
                                        value={stepDelay}
                                        onChange={(e) => setStepDelay(parseInt(e.target.value) || 500)}
                                        className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200"
                                    />
                                    <span className="text-sm text-slate-500">ms</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {steps.map((step, index) => {
                                const result = results.find(r => r.step_index === index);
                                const isCurrent = index === currentStepIndex && executionState === 'running';
                                const isPending = index > currentStepIndex || (!result && index === currentStepIndex);

                                return (
                                    <div
                                        key={index}
                                        className={`flex items-start gap-2 p-2 rounded-lg transition-all ${
                                            isCurrent
                                                ? 'bg-cyan-500/10 border border-cyan-500/30'
                                                : result?.success
                                                    ? 'bg-green-500/5 border border-green-500/20'
                                                    : result?.success === false
                                                        ? 'bg-red-500/5 border border-red-500/20'
                                                        : isPending
                                                            ? 'bg-slate-800/30 border border-slate-700/30 opacity-60'
                                                            : 'bg-slate-800/50 border border-slate-700/50'
                                        }`}
                                    >
                                        {/* Status Icon */}
                                        <div className="w-5 h-5 flex items-center justify-center mt-0.5">
                                            {isCurrent ? (
                                                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                                            ) : result?.success ? (
                                                <Check className="w-4 h-4 text-green-400" />
                                            ) : result?.success === false ? (
                                                <X className="w-4 h-4 text-red-400" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-slate-500" />
                                            )}
                                        </div>

                                        {/* Step Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${
                                                isCurrent ? 'text-cyan-200' :
                                                    result ? 'text-slate-300' : 'text-slate-500'
                                            }`}>
                                                {step}
                                            </p>
                                            {result?.error && (
                                                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" />
                                                    {result.error}
                                                </p>
                                            )}
                                            {result?.duration_ms && (
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {result.duration_ms}ms
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Summary (when complete) */}
                {(executionState === 'completed' || executionState === 'failed') && (
                    <div className={`p-3 border-t ${
                        executionState === 'completed'
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-red-500/10 border-red-500/30'
                    }`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${
                                executionState === 'completed' ? 'text-green-400' : 'text-red-400'
                            }`}>
                                {executionState === 'completed' ? 'All steps passed!' : 'Execution failed'}
                            </span>
                            <span className="text-sm text-slate-400">
                                {results.filter(r => r.success).length} / {steps.length} passed
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                setExecutionState('idle');
                                setResults([]);
                                setCurrentStepIndex(0);
                            }}
                            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Run Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
