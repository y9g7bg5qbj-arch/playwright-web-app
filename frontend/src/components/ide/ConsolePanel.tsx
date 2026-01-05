import { useState } from 'react';
import { Terminal, AlertCircle, Minimize2, Maximize2 } from 'lucide-react';

type ConsoleTab = 'logs' | 'output' | 'problems';

interface ConsolePanelProps {
    logs: string[];
    isMinimized?: boolean;
    onToggleMinimize?: () => void;
}

export function ConsolePanel({ logs, isMinimized = false, onToggleMinimize }: ConsolePanelProps) {
    const [activeTab, setActiveTab] = useState<ConsoleTab>('logs');

    if (isMinimized) {
        return (
            <div className="h-8 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Console</span>
                </div>
                <button
                    onClick={onToggleMinimize}
                    className="p-1 hover:bg-slate-800 rounded"
                >
                    <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                </button>
            </div>
        );
    }

    return (
        <div className="h-48 bg-slate-900 border-t border-slate-800 flex flex-col">
            {/* Tabs Header */}
            <div className="h-9 border-b border-slate-800 flex items-center justify-between px-2">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === 'logs'
                                ? 'bg-slate-800 text-slate-200'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <div className="flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5" />
                            Execution Logs
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('output')}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === 'output'
                                ? 'bg-slate-800 text-slate-200'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        Output
                    </button>
                    <button
                        onClick={() => setActiveTab('problems')}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === 'problems'
                                ? 'bg-slate-800 text-slate-200'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <div className="flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Problems
                        </div>
                    </button>
                </div>

                <button
                    onClick={onToggleMinimize}
                    className="p-1 hover:bg-slate-800 rounded"
                    title="Minimize"
                >
                    <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
                {activeTab === 'logs' && (
                    <div className="space-y-1">
                        {logs.length === 0 ? (
                            <div className="text-slate-600 italic">No logs yet. Run or record a test to see output.</div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className="text-slate-400">
                                    <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span> {log}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'output' && (
                    <div className="text-slate-600 italic">
                        Test output will appear here during execution.
                    </div>
                )}

                {activeTab === 'problems' && (
                    <div className="text-slate-600 italic">
                        No problems detected.
                    </div>
                )}
            </div>
        </div>
    );
}
