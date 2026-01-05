/**
 * LocalExecutionViewer - Live view for local execution
 *
 * Shows console output and live screenshot updates
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Terminal,
  Image,
  CheckCircle2,
  XCircle,
  Loader2,
  Maximize2,
  Minimize2,
  FileSearch,
  Download,
  ExternalLink,
} from 'lucide-react';

export interface LocalExecutionViewerProps {
  executionId: string;
  onBack: () => void;
  onViewTrace?: (traceUrl: string, testName: string) => void;
}

interface ConsoleLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

interface ExecutionProgress {
  currentStep: number;
  totalSteps: number;
  currentAction: string;
  status: 'running' | 'passed' | 'failed';
  screenshot?: string;
}

export const LocalExecutionViewer: React.FC<LocalExecutionViewerProps> = ({
  executionId,
  onBack,
  // onViewTrace prop available for parent components to use full trace panel
}) => {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [progress, setProgress] = useState<ExecutionProgress>({
    currentStep: 0,
    totalSteps: 0,
    currentAction: 'Initializing...',
    status: 'running',
  });
  const [isScreenshotExpanded, setIsScreenshotExpanded] = useState(false);
  const [hasTrace, setHasTrace] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Check if trace exists for this execution
  useEffect(() => {
    const checkTrace = async () => {
      try {
        const response = await fetch(`/api/executions/${executionId}/trace`, {
          method: 'HEAD',
        });
        setHasTrace(response.ok);
      } catch {
        setHasTrace(false);
      }
    };

    // Check for trace when execution completes
    if (progress.status !== 'running') {
      checkTrace();
    }
  }, [executionId, progress.status]);

  const traceUrl = `/api/executions/${executionId}/trace`;

  const handleOpenLocalViewer = async () => {
    try {
      await fetch(`/api/executions/${executionId}/trace/view`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('Error opening local trace viewer:', err);
      window.open('https://trace.playwright.dev/', '_blank');
    }
  };

  const handleOpenExternalViewer = () => {
    const absoluteUrl = `${window.location.origin}${traceUrl}`;
    window.open(`https://trace.playwright.dev/?trace=${encodeURIComponent(absoluteUrl)}`, '_blank');
  };

  const handleDownloadTrace = () => {
    const link = document.createElement('a');
    link.href = traceUrl;
    link.download = `trace-${executionId}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mock WebSocket connection for live updates
  useEffect(() => {
    // Simulate receiving logs
    const mockLogs: ConsoleLog[] = [
      { id: '1', timestamp: new Date().toISOString(), level: 'info', message: 'Starting test execution...' },
      { id: '2', timestamp: new Date().toISOString(), level: 'info', message: 'Launching browser (chromium)' },
      { id: '3', timestamp: new Date().toISOString(), level: 'debug', message: 'Browser launched in 1.2s' },
      { id: '4', timestamp: new Date().toISOString(), level: 'info', message: 'Navigating to https://example.com' },
      { id: '5', timestamp: new Date().toISOString(), level: 'debug', message: 'Page loaded in 0.8s' },
    ];
    setLogs(mockLogs);

    // Simulate progress updates
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev.currentStep < 10) {
          return {
            ...prev,
            currentStep: prev.currentStep + 1,
            totalSteps: 10,
            currentAction: `Executing step ${prev.currentStep + 1}...`,
          };
        }
        return prev;
      });

      // Add a new log
      setLogs(prev => [
        ...prev,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: Math.random() > 0.8 ? 'warn' : 'info',
          message: `Step ${Math.floor(Math.random() * 10) + 1} completed`,
        },
      ]);
    }, 2000);

    return () => clearInterval(interval);
  }, [executionId]);

  // Auto-scroll console
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'debug':
        return 'text-slate-500';
      default:
        return 'text-slate-300';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    const secs = date.getSeconds().toString().padStart(2, '0');
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${mins}:${secs}.${ms}`;
  };

  const progressPercent = progress.totalSteps > 0
    ? (progress.currentStep / progress.totalSteps) * 100
    : 0;

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <div className="h-6 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-green-400" />
            <h1 className="text-lg font-semibold text-slate-100">Local Execution</h1>
          </div>
          <span className="text-sm text-slate-500 font-mono">
            {executionId.slice(0, 12)}...
          </span>
        </div>

        <div className="flex items-center gap-3">
          {progress.status === 'running' && (
            <span className="flex items-center gap-2 text-blue-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Running
            </span>
          )}
          {progress.status === 'passed' && (
            <span className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Passed
            </span>
          )}
          {progress.status === 'failed' && (
            <span className="flex items-center gap-2 text-red-400 text-sm">
              <XCircle className="w-4 h-4" />
              Failed
            </span>
          )}

          {/* Trace Actions - visible when execution is complete and trace exists */}
          {progress.status !== 'running' && hasTrace && (
            <>
              <div className="h-6 w-px bg-slate-700" />
              <button
                onClick={handleOpenLocalViewer}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-500 transition-colors"
                title="Open in local Playwright trace viewer"
              >
                <FileSearch className="w-4 h-4" />
                View Trace
              </button>
              <button
                onClick={handleDownloadTrace}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                title="Download trace file"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleOpenExternalViewer}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                title="Open in trace.playwright.dev"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-3 bg-slate-900/50 border-b border-slate-800">
        <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
          <span>{progress.currentAction}</span>
          <span>
            Step {progress.currentStep} / {progress.totalSteps}
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Split View: Console & Screenshot */}
      <div className="flex-1 flex overflow-hidden">
        {/* Console Panel */}
        <div className="flex-1 flex flex-col border-r border-slate-800">
          <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-400">Console Output</span>
            <span className="text-xs text-slate-600 ml-auto">{logs.length} lines</span>
          </div>
          <div
            ref={consoleRef}
            className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1"
          >
            {logs.map((log) => (
              <div key={log.id} className="flex gap-3">
                <span className="text-slate-600 flex-shrink-0">
                  {formatTimestamp(log.timestamp)}
                </span>
                <span className={`flex-shrink-0 w-12 ${getLogLevelColor(log.level)}`}>
                  [{log.level.toUpperCase()}]
                </span>
                <span className={getLogLevelColor(log.level)}>{log.message}</span>
              </div>
            ))}
            {progress.status === 'running' && (
              <div className="flex items-center gap-2 text-blue-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Waiting for output...</span>
              </div>
            )}
          </div>
        </div>

        {/* Screenshot Panel */}
        <div className={`flex flex-col bg-slate-900/30 transition-all ${
          isScreenshotExpanded ? 'flex-1' : 'w-80'
        }`}>
          <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800 flex items-center gap-2">
            <Image className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-400">Live Screenshot</span>
            <button
              onClick={() => setIsScreenshotExpanded(!isScreenshotExpanded)}
              className="ml-auto p-1 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {isScreenshotExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            {progress.screenshot ? (
              <img
                src={progress.screenshot}
                alt="Current screenshot"
                className="max-w-full max-h-full object-contain rounded-lg border border-slate-700"
              />
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Image className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-sm text-slate-500">No screenshot yet</p>
                <p className="text-xs text-slate-600 mt-1">
                  Screenshot will appear when available
                </p>
              </div>
            )}
          </div>
          <div className="px-4 py-2 bg-slate-900/50 border-t border-slate-800 text-xs text-slate-500 text-center">
            Auto-updates every step
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocalExecutionViewer;
