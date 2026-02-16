import { useState, useCallback, useEffect } from 'react';
import { Bot, Sparkles, Play, Loader2, Copy, Check, AlertCircle, Settings, History, Trash2, ChevronRight, X } from 'lucide-react';
import { IconButton } from '@/components/ui';

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
        <div className="flex flex-col h-full bg-dark-bg/50 border-l border-border-default w-80">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-dark-bg">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-accent-purple" />
                    <h3 className="font-semibold text-text-primary">AI Agent</h3>
                    <span className="text-xs px-2 py-0.5 bg-accent-purple/20 text-accent-purple rounded-full">
                        Beta
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {/* Agent Status */}
                    <button
                        onClick={checkHealth}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${agentHealth?.agentStatus === 'healthy'
                            ? 'bg-status-success/20 text-status-success'
                            : agentHealth?.agentStatus === 'offline'
                                ? 'bg-status-danger/20 text-status-danger'
                                : 'bg-dark-elevated text-text-secondary'
                            }`}
                    >
                        <div className={`w-2 h-2 rounded-full ${agentHealth?.agentStatus === 'healthy'
                            ? 'bg-status-success'
                            : agentHealth?.agentStatus === 'offline'
                                ? 'bg-status-danger'
                                : 'bg-text-secondary'
                            }`} />
                        {agentHealth?.llmProvider || 'Check'}
                    </button>
                    <IconButton
                        icon={<History className="w-4 h-4" />}
                        variant="ghost"
                        active={showHistory}
                        tooltip="View History"
                        onClick={() => setShowHistory(!showHistory)}
                        className={showHistory ? 'bg-accent-purple/20 text-accent-purple' : ''}
                    />
                    <IconButton
                        icon={<Settings className="w-4 h-4" />}
                        variant="ghost"
                        active={showSettings}
                        tooltip="Settings"
                        onClick={() => setShowSettings(!showSettings)}
                        className={showSettings ? 'bg-accent-purple/20 text-accent-purple' : ''}
                    />
                    {onClose && (
                        <IconButton
                            icon={<X className="w-4 h-4" />}
                            variant="ghost"
                            tooltip="Close"
                            onClick={onClose}
                        />
                    )}
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="p-3 border-b border-border-default bg-dark-card/50 space-y-3">
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                            <input
                                type="checkbox"
                                checked={useAi}
                                onChange={(e) => setUseAi(e.target.checked)}
                                className="w-4 h-4 rounded text-accent-purple bg-dark-elevated border-border-default"
                            />
                            Use AI (requires API key)
                        </label>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                            <input
                                type="checkbox"
                                checked={useStreaming}
                                onChange={(e) => setUseStreaming(e.target.checked)}
                                className="w-4 h-4 rounded text-accent-purple bg-dark-elevated border-border-default"
                            />
                            Stream progress updates
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-text-secondary mb-1 block">Feature Name</label>
                            <input
                                type="text"
                                value={featureName}
                                onChange={(e) => setFeatureName(e.target.value)}
                                className="w-full bg-dark-card border border-border-default rounded px-2 py-1 text-sm text-text-primary"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-text-secondary mb-1 block">Scenario Name</label>
                            <input
                                type="text"
                                value={scenarioName}
                                onChange={(e) => setScenarioName(e.target.value)}
                                className="w-full bg-dark-card border border-border-default rounded px-2 py-1 text-sm text-text-primary"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* History Panel */}
            {showHistory && (
                <div className="border-b border-border-default bg-dark-card/30 max-h-64 overflow-y-auto">
                    <div className="p-2 border-b border-border-default flex items-center justify-between">
                        <span className="text-xs text-text-secondary font-medium">Recent Generations</span>
                        <span className="text-xs text-text-muted">{history.length} items</span>
                    </div>
                    {history.length === 0 ? (
                        <div className="p-4 text-center text-sm text-text-secondary">
                            No history yet
                        </div>
                    ) : (
                        <div className="divide-y divide-border-default">
                            {history.slice(0, 10).map((entry) => (
                                <div
                                    key={entry.id}
                                    className="p-2 hover:bg-dark-elevated/30 group cursor-pointer"
                                    onClick={() => loadHistoryEntry(entry)}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-text-primary truncate">
                                                {entry.steps.split('\n')[0]}
                                            </p>
                                            <p className="text-xs text-text-secondary mt-0.5">
                                                {entry.featureName} • {new Date(entry.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <IconButton
                                                icon={<ChevronRight className="w-3 h-3" />}
                                                size="sm"
                                                variant="ghost"
                                                tooltip="Load"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    loadHistoryEntry(entry);
                                                }}
                                                className="h-auto w-auto p-1"
                                            />
                                            <IconButton
                                                icon={<Trash2 className="w-3 h-3" />}
                                                size="sm"
                                                variant="ghost"
                                                tone="danger"
                                                tooltip="Delete"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteHistoryEntry(entry.id);
                                                }}
                                                className="h-auto w-auto p-1"
                                            />
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
                    <label className="text-xs text-text-secondary mb-1 block">Target URL (optional)</label>
                    <input
                        type="text"
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        placeholder="https://your-app.com"
                        className="w-full bg-dark-card border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50"
                    />
                </div>

                {/* Steps Input */}
                <div>
                    <label className="text-xs text-text-secondary mb-1 block flex items-center gap-1">
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
                        className="w-full bg-dark-card border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 resize-none font-mono"
                    />
                </div>

                {/* Progress Indicator */}
                {streamProgress && (
                    <div className="flex items-center gap-2 p-2 bg-accent-purple/10 border border-accent-purple/20 rounded-lg">
                        <Loader2 className="w-4 h-4 animate-spin text-accent-purple" />
                        <span className="text-xs text-accent-purple">{streamProgress.message}</span>
                    </div>
                )}

                {/* Generate Button */}
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !steps.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-accent-purple to-brand-primary hover:from-accent-purple hover:to-status-info text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent-purple/20"
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
                    <div className="flex items-start gap-2 p-3 bg-status-danger/10 border border-status-danger/30 rounded-lg text-status-danger text-sm">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                            <p>{error}</p>
                            {error.includes('not available') && (
                                <p className="text-xs mt-1 text-status-danger/70">
                                    Start the agent: <code className="bg-status-danger/20 px-1 rounded">cd vero-agent && uvicorn src.main:app --port 5001</code>
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Generated Code */}
                {generatedCode && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-text-secondary">Generated Vero DSL</span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-dark-card hover:bg-dark-elevated text-text-primary rounded transition-colors"
                                >
                                    {copied ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3" />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                                {onInsertCode && (
                                    <button
                                        onClick={handleInsert}
                                        className="flex items-center gap-1 px-2 py-1 text-xs bg-accent-purple hover:bg-accent-purple text-white rounded transition-colors"
                                    >
                                        <Play className="w-3 h-3" />
                                        Insert
                                    </button>
                                )}
                            </div>
                        </div>
                        <pre className="p-3 bg-dark-canvas border border-border-default rounded-lg text-sm text-text-primary overflow-auto max-h-48 font-mono">
                            {generatedCode}
                        </pre>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-border-default bg-dark-bg/50">
                <p className="text-xs text-text-muted text-center">
                    Powered by {agentHealth?.llmProvider || 'Gemini/Claude'} • Self-healing enabled
                </p>
            </div>
        </div>
    );
}
