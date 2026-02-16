/**
 * TraceTimeline - Visual timeline of test actions
 *
 * Features:
 * - Click to navigate to specific step
 * - Duration indicators
 * - Error markers
 * - Status icons for each action
 */
import React, { useCallback } from 'react';
import { MousePointer2, Type, Navigation, Eye, Clock, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

export interface TraceAction {
  index: number;
  type: 'navigate' | 'click' | 'fill' | 'expect' | 'wait' | 'hover' | 'press' | 'screenshot' | 'other';
  title: string;
  selector: string;
  value: string;
  duration: number;
  status: 'passed' | 'failed' | 'pending' | 'running';
  timestamp: number;
  screenshot?: string;
  error?: string;
}

export interface TraceTimelineProps {
  actions: TraceAction[];
  selectedIndex: number;
  onSelectAction: (index: number) => void;
}

const getActionIcon = (type: TraceAction['type']) => {
  switch (type) {
    case 'navigate':
      return <Navigation className="w-3.5 h-3.5" />;
    case 'click':
      return <MousePointer2 className="w-3.5 h-3.5" />;
    case 'fill':
      return <Type className="w-3.5 h-3.5" />;
    case 'expect':
      return <Eye className="w-3.5 h-3.5" />;
    case 'wait':
      return <Clock className="w-3.5 h-3.5" />;
    default:
      return <MousePointer2 className="w-3.5 h-3.5" />;
  }
};

const getStatusIcon = (status: TraceAction['status']) => {
  switch (status) {
    case 'passed':
      return <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />;
    case 'failed':
      return <XCircle className="w-3.5 h-3.5 text-status-danger" />;
    case 'running':
      return <div className="w-3.5 h-3.5 border-2 border-status-info border-t-transparent rounded-full animate-spin" />;
    default:
      return <div className="w-3.5 h-3.5 rounded-full bg-dark-elevated" />;
  }
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const TraceTimeline: React.FC<TraceTimelineProps> = ({
  actions,
  selectedIndex,
  onSelectAction,
}) => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectAction(index);
    } else if (e.key === 'ArrowDown' && index < actions.length - 1) {
      e.preventDefault();
      onSelectAction(index + 1);
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      onSelectAction(index - 1);
    }
  }, [actions.length, onSelectAction]);

  // Calculate total duration for progress bar
  const totalDuration = actions.reduce((sum, a) => sum + a.duration, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Summary Bar */}
      <div className="px-3 py-2 border-b border-border-default/50 bg-dark-card/30">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>{actions.length} actions</span>
          <span>{formatDuration(totalDuration)} total</span>
        </div>
        {/* Duration distribution bar */}
        <div className="mt-2 h-1.5 bg-dark-elevated rounded-full overflow-hidden flex">
          {actions.map((action, index) => {
            const width = (action.duration / totalDuration) * 100;
            return (
              <div
                key={action.index}
                className={`h-full transition-opacity cursor-pointer ${
                  action.status === 'passed' ? 'bg-status-success' :
                  action.status === 'failed' ? 'bg-status-danger' :
                  'bg-status-info'
                } ${selectedIndex === index ? 'opacity-100' : 'opacity-60 hover:opacity-80'}`}
                style={{ width: `${Math.max(width, 2)}%` }}
                onClick={() => onSelectAction(index)}
                title={`${action.title}: ${formatDuration(action.duration)}`}
              />
            );
          })}
        </div>
      </div>

      {/* Actions List */}
      <div className="flex-1 overflow-auto">
        <div className="py-1">
          {actions.map((action, index) => (
            <button
              key={action.index}
              onClick={() => onSelectAction(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`w-full text-left px-3 py-2 flex items-start gap-2 transition-colors ${
                selectedIndex === index
                  ? 'bg-status-info/20 border-l-2 border-status-info'
                  : 'hover:bg-dark-card/50 border-l-2 border-transparent'
              } ${action.status === 'failed' ? 'bg-status-danger/10' : ''}`}
              tabIndex={0}
              role="option"
              aria-selected={selectedIndex === index}
            >
              {/* Timeline connector */}
              <div className="flex flex-col items-center pt-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  selectedIndex === index ? 'bg-status-info/30 text-status-info' :
                  action.status === 'failed' ? 'bg-status-danger/20 text-status-danger' :
                  'bg-dark-elevated text-text-secondary'
                }`}>
                  {getActionIcon(action.type)}
                </div>
                {index < actions.length - 1 && (
                  <div className={`w-0.5 h-full min-h-[16px] mt-1 ${
                    action.status === 'passed' ? 'bg-status-success/30' :
                    action.status === 'failed' ? 'bg-status-danger/30' :
                    'bg-dark-elevated'
                  }`} />
                )}
              </div>

              {/* Action content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`font-mono text-xs truncate ${
                      selectedIndex === index ? 'text-status-info' :
                      action.status === 'failed' ? 'text-status-danger' :
                      'text-text-primary'
                    }`}>
                      {action.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {getStatusIcon(action.status)}
                    <span className="text-3xs text-text-secondary">
                      {formatDuration(action.duration)}
                    </span>
                  </div>
                </div>

                {/* Selector/Value */}
                {(action.selector || action.value) && (
                  <div className="mt-1 text-xxs text-text-secondary truncate font-mono">
                    {action.selector && (
                      <span className="text-accent-purple/80">{action.selector}</span>
                    )}
                    {action.selector && action.value && <span className="mx-1">-</span>}
                    {action.value && (
                      <span className="text-text-secondary">"{action.value}"</span>
                    )}
                  </div>
                )}

                {/* Error message */}
                {action.error && (
                  <div className="mt-1 flex items-start gap-1 text-xxs text-status-danger">
                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{action.error}</span>
                  </div>
                )}

                {/* Timestamp */}
                <div className="mt-1 text-3xs text-text-muted">
                  {formatTimestamp(action.timestamp)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard navigation hint */}
      <div className="px-3 py-2 border-t border-border-default/50 text-3xs text-text-muted text-center">
        Use arrow keys to navigate
      </div>
    </div>
  );
};

export default TraceTimeline;
