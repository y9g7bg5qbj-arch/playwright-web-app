import { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  AlertCircle,
  Minimize2,
  Maximize2,
  Play,
  Check,
  X,
  Pause,
  Clock,
  Trash2,
  Variable,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import type { ConsoleEntry, DebugVariable } from '@/hooks/useDebugger';

type DebugTab = 'execution' | 'output' | 'variables' | 'problems';

interface DebugConsolePanelProps {
  entries: ConsoleEntry[];
  variables: DebugVariable[];
  problems?: string[];
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  onClearConsole?: () => void;
  onGoToLine?: (line: number) => void;
}

/**
 * Format duration in human readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Get status icon for console entry
 */
function StatusIcon({ status }: { status?: ConsoleEntry['status'] }) {
  switch (status) {
    case 'running':
      return <Clock className="w-3.5 h-3.5 text-blue-400 animate-pulse" />;
    case 'success':
      return <Check className="w-3.5 h-3.5 text-green-400" />;
    case 'failure':
      return <X className="w-3.5 h-3.5 text-red-400" />;
    case 'paused':
      return <Pause className="w-3.5 h-3.5 text-yellow-400" />;
    default:
      return null;
  }
}

/**
 * Get entry type color
 */
function getEntryColor(type: ConsoleEntry['type']): string {
  switch (type) {
    case 'step':
      return 'text-blue-300';
    case 'error':
      return 'text-red-400';
    case 'warning':
      return 'text-yellow-400';
    case 'info':
      return 'text-gray-400';
    case 'log':
      return 'text-gray-300';
    default:
      return 'text-gray-400';
  }
}

/**
 * Variable value display with expand/collapse for objects
 */
function VariableValue({ value }: { value: any }) {
  const [expanded, setExpanded] = useState(false);

  if (typeof value === 'object' && value !== null) {
    const isArray = Array.isArray(value);
    const entries = Object.entries(value);

    return (
      <div className="inline">
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-0.5 hover:text-white"
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          <span className="text-purple-400">
            {isArray ? `Array(${entries.length})` : `Object`}
          </span>
        </button>
        {expanded && (
          <div className="ml-4 border-l border-gray-700 pl-2 mt-1">
            {entries.map(([key, val]) => (
              <div key={key} className="flex items-start gap-2">
                <span className="text-gray-500">{key}:</span>
                <VariableValue value={val} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof value === 'string') {
    return <span className="text-green-400">"{value}"</span>;
  }
  if (typeof value === 'number') {
    return <span className="text-blue-400">{value}</span>;
  }
  if (typeof value === 'boolean') {
    return <span className="text-yellow-400">{value.toString()}</span>;
  }
  if (value === null) {
    return <span className="text-gray-500">null</span>;
  }
  if (value === undefined) {
    return <span className="text-gray-500">undefined</span>;
  }

  return <span className="text-gray-400">{String(value)}</span>;
}

export function DebugConsolePanel({
  entries,
  variables,
  problems = [],
  isMinimized = false,
  onToggleMinimize,
  onClearConsole,
  onGoToLine,
}: DebugConsolePanelProps) {
  const [activeTab, setActiveTab] = useState<DebugTab>('execution');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (scrollRef.current && activeTab === 'execution') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, activeTab]);

  if (isMinimized) {
    return (
      <div className="h-8 bg-gray-900 border-t border-gray-800 flex items-center justify-between px-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Terminal className="w-3.5 h-3.5" />
          <span>Debug Console</span>
          {entries.length > 0 && (
            <span className="text-gray-600">({entries.length} entries)</span>
          )}
        </div>
        <button
          onClick={onToggleMinimize}
          className="p-1 hover:bg-gray-800 rounded"
        >
          <Maximize2 className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>
    );
  }

  return (
    <div className="h-64 bg-gray-900 border-t border-gray-800 flex flex-col">
      {/* Tabs Header */}
      <div className="h-9 border-b border-gray-800 flex items-center justify-between px-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('execution')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'execution'
                ? 'bg-gray-800 text-gray-200'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5" />
              Execution
            </div>
          </button>
          <button
            onClick={() => setActiveTab('output')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'output'
                ? 'bg-gray-800 text-gray-200'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              Output
            </div>
          </button>
          <button
            onClick={() => setActiveTab('variables')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'variables'
                ? 'bg-gray-800 text-gray-200'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Variable className="w-3.5 h-3.5" />
              Variables
              {variables.length > 0 && (
                <span className="text-gray-600">({variables.length})</span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('problems')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'problems'
                ? 'bg-gray-800 text-gray-200'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Problems
              {problems.length > 0 && (
                <span className="text-red-400">({problems.length})</span>
              )}
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {onClearConsole && (
            <button
              onClick={onClearConsole}
              className="p-1 hover:bg-gray-800 rounded"
              title="Clear Console"
            >
              <Trash2 className="w-3.5 h-3.5 text-gray-500" />
            </button>
          )}
          <button
            onClick={onToggleMinimize}
            className="p-1 hover:bg-gray-800 rounded"
            title="Minimize"
          >
            <Minimize2 className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto font-mono text-xs">
        {activeTab === 'execution' && (
          <div className="p-2">
            {entries.length === 0 ? (
              <div className="text-gray-600 italic p-2">
                No execution logs yet. Start a debug session to see step-by-step output.
              </div>
            ) : (
              <table className="w-full">
                <tbody>
                  {entries.map((entry, i) => (
                    <tr
                      key={i}
                      className={`hover:bg-gray-800/50 ${
                        entry.status === 'paused' ? 'bg-yellow-900/20' : ''
                      }`}
                    >
                      {/* Timestamp */}
                      <td className="px-2 py-1 text-gray-600 whitespace-nowrap align-top">
                        {entry.timestamp.toLocaleTimeString()}
                      </td>

                      {/* Status icon */}
                      <td className="px-1 py-1 align-top">
                        <StatusIcon status={entry.status} />
                      </td>

                      {/* Line number */}
                      <td className="px-2 py-1 align-top">
                        {entry.line && (
                          <button
                            onClick={() => onGoToLine?.(entry.line!)}
                            className="text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            Line {entry.line}
                          </button>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-2 py-1 text-purple-400 whitespace-nowrap align-top">
                        {entry.action}
                      </td>

                      {/* Message */}
                      <td className={`px-2 py-1 ${getEntryColor(entry.type)} align-top`}>
                        {entry.message}
                      </td>

                      {/* Duration */}
                      <td className="px-2 py-1 text-gray-500 whitespace-nowrap align-top text-right">
                        {entry.duration !== undefined && formatDuration(entry.duration)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'output' && (
          <div className="p-3">
            {entries.filter((e) => e.type === 'log').length === 0 ? (
              <div className="text-gray-600 italic">
                Console output will appear here during execution.
              </div>
            ) : (
              <div className="space-y-1">
                {entries
                  .filter((e) => e.type === 'log')
                  .map((entry, i) => (
                    <div key={i} className="text-gray-300">
                      <span className="text-gray-600">
                        [{entry.timestamp.toLocaleTimeString()}]
                      </span>{' '}
                      {entry.message}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'variables' && (
          <div className="p-3">
            {variables.length === 0 ? (
              <div className="text-gray-600 italic">
                Variables will appear here during debug execution.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-2 py-1 text-gray-500 font-medium">
                      Name
                    </th>
                    <th className="text-left px-2 py-1 text-gray-500 font-medium">
                      Value
                    </th>
                    <th className="text-left px-2 py-1 text-gray-500 font-medium">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {variables.map((v, i) => (
                    <tr key={i} className="hover:bg-gray-800/50">
                      <td className="px-2 py-1 text-cyan-400">${v.name}</td>
                      <td className="px-2 py-1">
                        <VariableValue value={v.value} />
                      </td>
                      <td className="px-2 py-1 text-gray-500">{v.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'problems' && (
          <div className="p-3">
            {problems.length === 0 ? (
              <div className="text-gray-600 italic">No problems detected.</div>
            ) : (
              <div className="space-y-2">
                {problems.map((problem, i) => (
                  <div key={i} className="flex items-start gap-2 text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{problem}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
