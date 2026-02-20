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
  Layers,
} from 'lucide-react';
import type { ConsoleEntry, DebugVariable, DebugFrame } from '@/hooks/useDebugger';
import { IconButton, Toolbar, ToolbarGroup, Tabs, TabsList, TabsTrigger } from '@/components/ui';

type DebugTab = 'execution' | 'output' | 'variables' | 'callstack' | 'problems';

interface DebugConsolePanelProps {
  entries: ConsoleEntry[];
  variables: DebugVariable[];
  callStack?: DebugFrame[];
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
 * Get status icon for console entry - Terminal aesthetic colors
 */
function StatusIcon({ status }: { status?: ConsoleEntry['status'] }) {
  switch (status) {
    case 'running':
      return <Clock className="w-3.5 h-3.5 text-status-info animate-pulse" />;
    case 'success':
      return <Check className="w-3.5 h-3.5 text-status-success" />;
    case 'failure':
      return <X className="w-3.5 h-3.5 text-status-danger" />;
    case 'paused':
      return <Pause className="w-3.5 h-3.5 text-status-warning" />;
    default:
      return null;
  }
}

/**
 * Get entry type color - Terminal aesthetic
 */
function getEntryColor(type: ConsoleEntry['type']): string {
  switch (type) {
    case 'step':
      return 'text-status-info';
    case 'error':
      return 'text-status-danger';
    case 'warning':
      return 'text-status-warning';
    case 'info':
      return 'text-text-secondary';
    case 'log':
      return 'text-text-primary';
    default:
      return 'text-text-secondary';
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
          <span className="text-accent-purple">
            {isArray ? `Array(${entries.length})` : `Object`}
          </span>
        </button>
        {expanded && (
          <div className="ml-4 border-l border-border-default pl-2 mt-1">
            {entries.map(([key, val]) => (
              <div key={key} className="flex items-start gap-2">
                <span className="text-text-muted">{key}:</span>
                <VariableValue value={val} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof value === 'string') {
    return <span className="text-status-success">"{value}"</span>;
  }
  if (typeof value === 'number') {
    return <span className="text-status-info">{value}</span>;
  }
  if (typeof value === 'boolean') {
    return <span className="text-status-warning">{value.toString()}</span>;
  }
  if (value === null) {
    return <span className="text-text-muted">null</span>;
  }
  if (value === undefined) {
    return <span className="text-text-muted">undefined</span>;
  }

  return <span className="text-text-secondary">{String(value)}</span>;
}

export function DebugConsolePanel({
  entries,
  variables,
  callStack = [],
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
      <div className="h-7 bg-dark-canvas border-t border-border-default flex items-center justify-between px-2">
        <div className="flex items-center gap-1.5 text-3xs text-text-muted">
          <Terminal className="w-3 h-3" />
          <span>Debug Console</span>
          {entries.length > 0 && (
            <span className="text-text-muted/60 tabular-nums">({entries.length})</span>
          )}
        </div>
        <IconButton
          icon={<Maximize2 className="w-3 h-3" />}
          size="sm"
          tooltip="Maximize"
          onClick={onToggleMinimize}
        />
      </div>
    );
  }

  return (
    <div className="h-56 bg-dark-canvas border-t border-border-default flex flex-col">
      {/* Tabs Header */}
      <Toolbar position="top" size="sm" className="justify-between px-1.5">
        <ToolbarGroup>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DebugTab)} variant="pill" size="sm">
            <TabsList>
              <TabsTrigger value="execution" icon={<Play className="w-3 h-3" />}>Execution</TabsTrigger>
              <TabsTrigger value="output" icon={<Terminal className="w-3 h-3" />}>Output</TabsTrigger>
              <TabsTrigger value="variables" icon={<Variable className="w-3 h-3" />} count={variables.length || undefined}>Variables</TabsTrigger>
              <TabsTrigger value="callstack" icon={<Layers className="w-3 h-3" />} count={callStack.length || undefined}>Stack</TabsTrigger>
              <TabsTrigger value="problems" icon={<AlertCircle className="w-3 h-3" />} count={problems.length || undefined}>Problems</TabsTrigger>
            </TabsList>
          </Tabs>
        </ToolbarGroup>

        <ToolbarGroup>
          {onClearConsole && (
            <IconButton
              icon={<Trash2 className="w-3 h-3" />}
              size="sm"
              tooltip="Clear Console"
              onClick={onClearConsole}
            />
          )}
          <IconButton
            icon={<Minimize2 className="w-3 h-3" />}
            size="sm"
            tooltip="Minimize"
            onClick={onToggleMinimize}
          />
        </ToolbarGroup>
      </Toolbar>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto font-mono text-xxs">
        {activeTab === 'execution' && (
          <div className="p-2">
            {entries.length === 0 ? (
              <div className="text-text-muted italic p-2">
                No execution logs yet. Start a debug session to see step-by-step output.
              </div>
            ) : (
              <table className="w-full">
                <tbody>
                  {entries.map((entry, i) => (
                    <tr
                      key={i}
                      className={`hover:bg-white/[0.03] ${
                        entry.status === 'paused' ? 'bg-status-warning/10' : ''
                      }`}
                    >
                      {/* Timestamp */}
                      <td className="px-2 py-1 text-text-muted whitespace-nowrap align-top tabular-nums">
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
                            className="text-status-info hover:text-status-info hover:underline tabular-nums"
                          >
                            Line {entry.line}
                          </button>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-2 py-1 text-accent-purple whitespace-nowrap align-top">
                        {entry.action}
                      </td>

                      {/* Message */}
                      <td className={`px-2 py-1 ${getEntryColor(entry.type)} align-top`}>
                        {entry.message}
                      </td>

                      {/* Duration */}
                      <td className="px-2 py-1 text-text-muted whitespace-nowrap align-top text-right tabular-nums">
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
              <div className="text-text-muted italic">
                Console output will appear here during execution.
              </div>
            ) : (
              <div className="space-y-1">
                {entries
                  .filter((e) => e.type === 'log')
                  .map((entry, i) => (
                    <div key={i} className="text-text-primary">
                      <span className="text-text-muted tabular-nums">
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
              <div className="text-text-muted italic">
                Variables will appear here during debug execution.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="text-left px-2 py-1 text-text-muted font-medium">
                      Name
                    </th>
                    <th className="text-left px-2 py-1 text-text-muted font-medium">
                      Value
                    </th>
                    <th className="text-left px-2 py-1 text-text-muted font-medium">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {variables.map((v, i) => (
                    <tr key={i} className="hover:bg-white/[0.03]">
                      <td className="px-2 py-1 text-accent-cyan">${v.name}</td>
                      <td className="px-2 py-1">
                        <VariableValue value={v.value} />
                      </td>
                      <td className="px-2 py-1 text-text-muted">{v.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'callstack' && (
          <div className="p-3">
            {callStack.length === 0 ? (
              <div className="text-text-muted italic">
                Call stack will appear here during debug execution.
              </div>
            ) : (
              <div className="space-y-1">
                {[...callStack].reverse().map((frame, i) => (
                  <div
                    key={frame.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors duration-fast ${
                      frame.isCurrent
                        ? 'bg-brand-primary/20 text-status-info'
                        : 'hover:bg-white/[0.03] text-text-secondary'
                    }`}
                    onClick={() => onGoToLine?.(frame.line)}
                  >
                    {/* Indentation based on type */}
                    <div
                      className="flex items-center"
                      style={{ paddingLeft: `${i * 8}px` }}
                    >
                      {/* Frame type icon */}
                      {frame.type === 'feature' && (
                        <span className="w-4 h-4 flex items-center justify-center text-status-info text-xs">F</span>
                      )}
                      {frame.type === 'scenario' && (
                        <span className="w-4 h-4 flex items-center justify-center text-status-success text-xs">S</span>
                      )}
                      {frame.type === 'action' && (
                        <span className="w-4 h-4 flex items-center justify-center text-accent-purple text-xs">→</span>
                      )}
                    </div>

                    {/* Frame name */}
                    <span className={frame.isCurrent ? 'font-medium' : ''}>
                      {frame.name}
                    </span>

                    {/* Line number */}
                    <span className="text-text-muted text-xs ml-auto tabular-nums">
                      Line {frame.line}
                    </span>

                    {/* Current indicator */}
                    {frame.isCurrent && (
                      <span className="text-status-warning text-xs">●</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'problems' && (
          <div className="p-3">
            {problems.length === 0 ? (
              <div className="text-text-muted italic">No problems detected.</div>
            ) : (
              <div className="space-y-2">
                {problems.map((problem, i) => (
                  <div key={i} className="flex items-start gap-2 text-status-danger">
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
