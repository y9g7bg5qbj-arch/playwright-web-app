import { useState, useCallback } from 'react';
import { Bot, Sparkles, Play, Loader2, Copy, Check, AlertCircle, Settings, ChevronDown } from 'lucide-react';

interface AIAgentPanelProps {
    onGeneratedCode?: (code: string) => void;
    onInsertCode?: (code: string) => void;
}

interface AgentHealth {
    success: boolean;
    agentStatus: string;
    llmProvider?: string;
    existingPages?: number;
}

export function AIAgentPanel({ onGeneratedCode, onInsertCode }: AIAgentPanelProps) {
    const [steps, setSteps] = useState('');
    const [targetUrl, setTargetUrl] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [agentHealth, setAgentHealth] = useState<AgentHealth | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [useAi, setUseAi] = useState(true);
    const [featureName, setFeatureName] = useState('GeneratedFeature');
    const [scenarioName, setScenarioName] = useState('Generated Scenario');

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

    // Generate Vero code from English steps
    const handleGenerate = async () => {
        if (!steps.trim()) {
            setError('Please enter some test steps');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
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
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);

            if (message.includes('not available') || message.includes('not running')) {
                setAgentHealth({ success: false, agentStatus: 'offline' });
            }
        } finally {
            setIsGenerating(false);
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

    return (
        <div className="flex flex-col h-full bg-slate-900/50 border-l border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-purple-400" />
                    <h3 className="font-semibold text-slate-200">AI Agent</h3>
                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">
                        Beta
                    </span>
                </div>
                <div className="flex items-center gap-2">
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
                        {agentHealth?.llmProvider || 'Check Status'}
                    </button>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-200"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
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
Verify "Dashboard" is visible
Press Tab
Select "Admin" from role dropdown`}
                        rows={8}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 resize-none font-mono"
                    />
                </div>

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
                        <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 overflow-auto max-h-64 font-mono">
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
