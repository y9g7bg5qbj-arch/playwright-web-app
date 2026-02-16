/**
 * TraceConsolePanel - Console output viewer for trace
 *
 * Features:
 * - Console logs, warnings, errors
 * - Filter by log level
 * - Search console output
 */
import React, { useState, useMemo } from 'react';
import { Search, AlertCircle, AlertTriangle, Info, Terminal, XCircle } from 'lucide-react';

export interface ConsoleEntry {
  id: string;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: number;
  source?: string;
  args?: any[];
}

export interface TraceConsolePanelProps {
  entries: ConsoleEntry[];
}

type FilterLevel = 'all' | 'error' | 'warn' | 'info' | 'log' | 'debug';

const filterLevels: { value: FilterLevel; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'all', label: 'All', icon: <Terminal className="w-3 h-3" />, color: 'text-text-secondary' },
  { value: 'error', label: 'Errors', icon: <XCircle className="w-3 h-3" />, color: 'text-status-danger' },
  { value: 'warn', label: 'Warnings', icon: <AlertTriangle className="w-3 h-3" />, color: 'text-status-warning' },
  { value: 'info', label: 'Info', icon: <Info className="w-3 h-3" />, color: 'text-status-info' },
  { value: 'log', label: 'Logs', icon: <Terminal className="w-3 h-3" />, color: 'text-text-primary' },
  { value: 'debug', label: 'Debug', icon: <AlertCircle className="w-3 h-3" />, color: 'text-accent-purple' },
];

const getLevelIcon = (level: ConsoleEntry['level']) => {
  switch (level) {
    case 'error':
      return <XCircle className="w-3.5 h-3.5 text-status-danger" />;
    case 'warn':
      return <AlertTriangle className="w-3.5 h-3.5 text-status-warning" />;
    case 'info':
      return <Info className="w-3.5 h-3.5 text-status-info" />;
    case 'debug':
      return <AlertCircle className="w-3.5 h-3.5 text-accent-purple" />;
    default:
      return <Terminal className="w-3.5 h-3.5 text-text-secondary" />;
  }
};

const getLevelColor = (level: ConsoleEntry['level']): string => {
  switch (level) {
    case 'error': return 'bg-status-danger/10 border-status-danger/30 text-status-danger';
    case 'warn': return 'bg-status-warning/10 border-status-warning/30 text-status-warning';
    case 'info': return 'bg-status-info/10 border-status-info/30 text-status-info';
    case 'debug': return 'bg-accent-purple/10 border-accent-purple/30 text-accent-purple';
    default: return 'bg-dark-elevated/10 border-border-default/30 text-text-primary';
  }
};

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  } as Intl.DateTimeFormatOptions);
};

export const TraceConsolePanel: React.FC<TraceConsolePanelProps> = ({ entries }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterLevel>('all');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  // Count entries by level
  const levelCounts = useMemo(() => {
    return entries.reduce((acc, entry) => {
      acc[entry.level] = (acc[entry.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Apply level filter
      if (activeFilter !== 'all' && entry.level !== activeFilter) {
        return false;
      }

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          entry.message.toLowerCase().includes(query) ||
          entry.source?.toLowerCase().includes(query) ||
          entry.level.includes(query)
        );
      }

      return true;
    });
  }, [entries, activeFilter, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      {/* Search & Filters */}
      <div className="p-2 border-b border-border-default/50 space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            type="text"
            placeholder="Filter console output..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-dark-card/50 border border-border-default/50 rounded text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-status-info/50"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 flex-wrap">
          {filterLevels.map(level => {
            const count = level.value === 'all' ? entries.length : levelCounts[level.value] || 0;
            return (
              <button
                key={level.value}
                onClick={() => setActiveFilter(level.value)}
                className={`flex items-center gap-1 px-2 py-0.5 text-3xs font-medium rounded transition-colors ${
                  activeFilter === level.value
                    ? 'bg-status-info/20 text-status-info border border-status-info/30'
                    : 'bg-dark-card/50 text-text-secondary border border-transparent hover:text-text-primary'
                }`}
              >
                <span className={level.color}>{level.icon}</span>
                <span>{level.label}</span>
                {count > 0 && (
                  <span className="ml-0.5 px-1 py-px bg-dark-elevated rounded text-4xs">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Console entries */}
      <div className="flex-1 overflow-auto font-mono text-xs">
        {filteredEntries.length === 0 ? (
          <div className="p-4 text-center text-text-secondary">
            {entries.length === 0 ? 'No console output' : 'No entries match your filter'}
          </div>
        ) : (
          <div className="divide-y divide-border-default/20">
            {filteredEntries.map(entry => {
              const isExpanded = expandedEntry === entry.id;

              return (
                <div
                  key={entry.id}
                  className={`px-2 py-1.5 border-l-2 transition-colors hover:bg-dark-card/30 ${getLevelColor(entry.level)}`}
                >
                  <button
                    onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                    className="w-full text-left flex items-start gap-2"
                  >
                    {/* Level icon */}
                    <div className="shrink-0 pt-0.5">
                      {getLevelIcon(entry.level)}
                    </div>

                    {/* Message */}
                    <div className="flex-1 min-w-0">
                      <div className={`break-words ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {entry.message}
                      </div>

                      {/* Source & Timestamp */}
                      <div className="flex items-center gap-2 mt-1 text-3xs text-text-secondary">
                        <span>{formatTimestamp(entry.timestamp)}</span>
                        {entry.source && (
                          <>
                            <span className="text-text-muted">|</span>
                            <span className="text-status-info/70">{entry.source}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded view with args */}
                  {isExpanded && entry.args && entry.args.length > 0 && (
                    <div className="mt-2 ml-6 p-2 bg-dark-bg/50 rounded border border-border-default/50">
                      <div className="text-3xs text-text-secondary mb-1">Arguments:</div>
                      <pre className="text-xxs text-text-secondary overflow-auto max-h-40">
                        {JSON.stringify(entry.args, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="px-3 py-2 border-t border-border-default/50 text-3xs text-text-secondary flex items-center justify-between">
        <span>{filteredEntries.length} entries</span>
        <div className="flex items-center gap-3">
          {levelCounts.error > 0 && (
            <span className="flex items-center gap-1 text-status-danger">
              <XCircle className="w-3 h-3" />
              {levelCounts.error}
            </span>
          )}
          {levelCounts.warn > 0 && (
            <span className="flex items-center gap-1 text-status-warning">
              <AlertTriangle className="w-3 h-3" />
              {levelCounts.warn}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TraceConsolePanel;
