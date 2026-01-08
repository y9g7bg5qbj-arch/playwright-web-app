import { useState, useCallback, useEffect } from 'react';
import { Bot, Sparkles, Play, Loader2, Copy, Check, AlertCircle, Settings, History, Trash2, ChevronRight, X } from 'lucide-react';

interface AIAgentPanelProps {
    onGeneratedCode?: (code: string) => void;
    onInsertCode?: (code: string) => void;
    isVisible?: boolean;
    onClose?: () => void;
}

interface AgentHealth {
    success: boolean;
    agentStatus: string;
    llmProvider?: string;
    existingPages?: number;
}

interface HistoryEntry {
    id: string;
    steps: string;
    generatedCode: string;
    featureName: string;
    scenarioName: string;
    createdAt: string;
}

interface StreamProgress {
    step: string;
    message: string;
}

export function AIAgentPanel({ onGeneratedCode, onInsertCode, isVisible = true, onClose }: AIAgentPanelProps) {
    const [steps, setSteps] = useState('');
    const [targetUrl, setTargetUrl] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [agentHealth, setAgentHealth] = useState<AgentHealth | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [useAi, setUseAi] = useState(true);
    const [useStreaming, setUseStreaming] = useState(true);
    const [featureName, setFeatureName] = useState('GeneratedFeature');
    const [scenarioName, setScenarioName] = useState('Generated Scenario');
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [streamProgress, setStreamProgress] = useState<StreamProgress | null>(null);

    // Load history on mount
    useEffect(() => {
        loadHistory();
    }, []);

    // Check agent health
    const checkHealth = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/vero/agent/health', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setAgentHealth(data);
        } catch {
            setAgentHealth({ success: false, agentStatus: 'offline' });
        }
    }, []);

    // Load generation history
    const loadHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/vero/agent/history', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setHistory(data.history || []);
            }
        } catch {
            // Silently fail - history is optional
        }
    };

    // Save to history
    const saveToHistory = async (generatedCode: string) => {
        try {
            const token = localStorage.getItem('token');
            await fetch('/api/vero/agent/history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    steps: steps.trim(),
                    generatedCode,
                    featureName,
                    scenarioName
                })
            });
            loadHistory(); // Refresh history
        } catch {
            // Silently fail - history is optional
        }
    };

    // Delete history entry
    const deleteHistoryEntry = async (entryId: string) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/vero/agent/history/${entryId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setHistory(prev => prev.filter(e => e.id !== entryId));
        } catch {
            // Silently fail
        }
    };

    // Load history entry into editor
    const loadHistoryEntry = (entry: HistoryEntry) => {
        setSteps(entry.steps);
        setFeatureName(entry.featureName);
        setScenarioName(entry.scenarioName);
        setGeneratedCode(entry.generatedCode);
        setShowHistory(false);
    };

    // Generate with streaming
    const handleGenerateStreaming = async () => {
        setStreamProgress({ step: 'start', message: 'Initializing...' });

        const token = localStorage.getItem('token');
        const response = await fetch('/api/vero/agent/generate-stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                steps: steps.trim(),
                url: targetUrl || undefined,
                featureName,
                scenarioName,
                useAi
            })
        });

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('event: ')) {
                    // Skip event type lines, we parse data from data lines
                    continue;
                }
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.step && data.message) {
                            setStreamProgress({ step: data.step, message: data.message });
                        }
                        if (data.veroCode) {
                            setGeneratedCode(data.veroCode);
                            onGeneratedCode?.(data.veroCode);
                            saveToHistory(data.veroCode);
                        }
                        if (data.error) {
                            throw new Error(data.error);
                        }
                    } catch (e) {
                        // Ignore parse errors for partial data
                    }
                }
            }
        }
    };

    // Generate Vero code from English steps
    const handleGenerate = async () => {
        if (!steps.trim()) {
            setError('Please enter some test steps');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setStreamProgress(null);

        try {
            if (useStreaming) {
                await handleGenerateStreaming();
            } else {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/vero/agent/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        steps: steps.trim(),
                        url: targetUrl || undefined,
                        featureName,
                        scenarioName,
                        useAi
                    })
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Generation failed');
                }

                setGeneratedCode(data.veroCode);
                onGeneratedCode?.(data.veroCode);
                saveToHistory(data.veroCode);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);

            if (message.includes('not available') || message.includes('not running')) {
                setAgentHealth({ success: false, agentStatus: 'offline' });
            }
        } finally {
            setIsGenerating(false);
            setStreamProgress(null);
        }
    };

    // Copy generated code
    const handleCopy = () => {
        navigator.clipboard.writeText(generatedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Insert into editor
    const handleInsert = () => {
        onInsertCode?.(generatedCode);
    };

    if (!isVisible) return null;

    return (
        <div className="flex flex-col h-full bg-slate-900/50 border-l border-slate-800 w-80">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-purple-400" />
                    <h3 className="font-semibold text-slate-200">AI Agent</h3>
                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">
                        Beta
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {/* Agent Status */}
                    <button
                        onClick={checkHealth}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${agentHealth?.agentStatus === 'healthy'
                            ? 'bg-green-500/20 text-green-400'
                            : agentHealth?.agentStatus === 'offline'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-slate-700 text-slate-400'
                            }`}
                    >
                        <div className={`w-2 h-2 rounded-full ${agentHealth?.agentStatus === 'healthy'
                            ? 'bg-green-400'
                            : agentHealth?.agentStatus === 'offline'
                                ? 'bg-red-400'
                                : 'bg-slate-500'
                            }`} />
                        {agentHealth?.llmProvider || 'Check'}
                    </button>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`p-1.5 rounded transition-colors ${showHistory ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'}`}
                        title="View History"
                    >
                        <History className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-1.5 rounded transition-colors ${showSettings ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'}`}
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-200"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="p-3 border-b border-slate-800 bg-slate-800/50 space-y-3">
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={useAi}
                                onChange={(e) => setUseAi(e.target.checked)}
                                className="w-4 h-4 rounded text-purple-500 bg-slate-700 border-slate-600"
                            />
                            Use AI (requires API key)
                        </label>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={useStreaming}
                                onChange={(e) => setUseStreaming(e.target.checked)}
                                className="w-4 h-4 rounded text-purple-500 bg-slate-700 border-slate-600"
                            />
                            Stream progress updates
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-slate-500 mb-1 block">Feature Name</label>
                            <input
                                type="text"
                                value={featureName}
                                onChange={(e) => setFeatureName(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 mb-1 block">Scenario Name</label>
                            <input
                                type="text"
                                value={scenarioName}
                                onChange={(e) => setScenarioName(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* History Panel */}
            {showHistory && (
                <div className="border-b border-slate-800 bg-slate-800/30 max-h-64 overflow-y-auto">
                    <div className="p-2 border-b border-slate-700 flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-medium">Recent Generations</span>
                        <span className="text-xs text-slate-600">{history.length} items</span>
                    </div>
                    {history.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500">
                            No history yet
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {history.slice(0, 10).map((entry) => (
                                <div
                                    key={entry.id}
                                    className="p-2 hover:bg-slate-700/30 group cursor-pointer"
                                    onClick={() => loadHistoryEntry(entry)}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-slate-300 truncate">
                                                {entry.steps.split('\n')[0]}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {entry.featureName} • {new Date(entry.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    loadHistoryEntry(entry);
                                                }}
                                                className="p-1 hover:bg-slate-600 rounded"
                                                title="Load"
                                            >
                                                <ChevronRight className="w-3 h-3 text-slate-400" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteHistoryEntry(entry.id);
                                                }}
                                                className="p-1 hover:bg-red-500/20 rounded"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3 h-3 text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Target URL */}
                <div>
                    <label className="text-xs text-slate-500 mb-1 block">Target URL (optional)</label>
                    <input
                        type="text"
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        placeholder="https://your-app.com"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
                    />
                </div>

                {/* Steps Input */}
                <div>
                    <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Enter Test Steps (plain English)
                    </label>
                    <textarea
                        value={steps}
                        onChange={(e) => setSteps(e.target.value)}
                        placeholder={`Navigate to login page
Fill email with test@example.com
Fill password with secret123
Click the Submit button
Verify "Dashboard" is visible`}
                        rows={6}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 resize-none font-mono"
                    />
                </div>

                {/* Progress Indicator */}
                {streamProgress && (
                    <div className="flex items-center gap-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                        <span className="text-xs text-purple-300">{streamProgress.message}</span>
                    </div>
                )}

                {/* Generate Button */}
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !steps.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Bot className="w-4 h-4" />
                            Generate Vero Code
                        </>
                    )}
                </button>

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                            <p>{error}</p>
                            {error.includes('not available') && (
                                <p className="text-xs mt-1 text-red-400/70">
                                    Start the agent: <code className="bg-red-500/20 px-1 rounded">cd vero-agent && uvicorn src.main:app --port 5001</code>
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Generated Code */}
                {generatedCode && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500">Generated Vero DSL</span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                                >
                                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                                {onInsertCode && (
                                    <button
                                        onClick={handleInsert}
                                        className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors"
                                    >
                                        <Play className="w-3 h-3" />
                                        Insert
                                    </button>
                                )}
                            </div>
                        </div>
                        <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 overflow-auto max-h-48 font-mono">
                            {generatedCode}
                        </pre>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-slate-800 bg-slate-900/50">
                <p className="text-xs text-slate-600 text-center">
                    Powered by {agentHealth?.llmProvider || 'Gemini/Claude'} • Self-healing enabled
                </p>
            </div>
        </div>
    );
}
