import React from 'react';
import { Play, CheckCircle, XCircle, Clock, User, Calendar, Loader2, ExternalLink } from 'lucide-react';

interface Execution {
  id: string;
  testName: string;
  status: 'passed' | 'failed' | 'running' | 'pending';
  triggeredBy: string;
  duration?: number;
  timestamp: string;
}

interface ExecutionsTableProps {
  executions: Execution[];
  onViewExecution?: (id: string) => void;
  maxRows?: number;
}

export const ExecutionsTable: React.FC<ExecutionsTableProps> = ({
  executions,
  onViewExecution,
  maxRows = 5,
}) => {
  const getStatusIcon = (status: Execution['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-accent-green" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-accent-red" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-accent-blue animate-spin" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-accent-yellow" />;
    }
  };

  const getStatusBadge = (status: Execution['status']) => {
    const styles = {
      passed: 'bg-accent-green/20 text-accent-green',
      failed: 'bg-accent-red/20 text-accent-red',
      running: 'bg-accent-blue/20 text-accent-blue',
      pending: 'bg-accent-yellow/20 text-accent-yellow',
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {getStatusIcon(status)}
        <span className="capitalize">{status}</span>
      </span>
    );
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const displayedExecutions = executions.slice(0, maxRows);

  return (
    <div className="bg-dark-card border border-border-default rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border-default flex items-center justify-between">
        <h3 className="text-base font-semibold text-text-primary">Recent Executions</h3>
        {executions.length > maxRows && (
          <button className="text-sm text-accent-blue hover:text-blue-400 flex items-center gap-1">
            View All
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {displayedExecutions.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div className="w-12 h-12 bg-dark-elevated rounded-full flex items-center justify-center mx-auto mb-3">
            <Play className="w-6 h-6 text-text-muted" />
          </div>
          <p className="text-text-secondary font-medium">No executions yet</p>
          <p className="text-sm text-text-muted mt-1">Run a test to see results here</p>
        </div>
      ) : (
        <div className="divide-y divide-border-default">
          {displayedExecutions.map((execution) => (
            <div
              key={execution.id}
              onClick={() => onViewExecution?.(execution.id)}
              className="px-5 py-3.5 hover:bg-dark-elevated transition-colors cursor-pointer flex items-center gap-4"
            >
              {/* Test Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {execution.testName}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-xs text-text-muted">
                    <User className="w-3 h-3" />
                    <span>{execution.triggeredBy}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-text-muted">
                    <Calendar className="w-3 h-3" />
                    <span>{formatTime(execution.timestamp)}</span>
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="text-sm text-text-secondary w-20 text-right">
                {formatDuration(execution.duration)}
              </div>

              {/* Status */}
              <div className="w-24 flex justify-end">
                {getStatusBadge(execution.status)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExecutionsTable;
