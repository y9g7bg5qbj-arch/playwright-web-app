import React from 'react';
import type { ScheduleRun } from '@playwright-web-app/shared';
import { formatDate } from './schedulerUtils';

interface StatusBadgeProps {
  status: string;
  isActive?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, isActive }) => {
  const getStatusConfig = () => {
    if (isActive === false) {
      return { color: 'bg-text-muted', text: 'Paused' };
    }
    switch (status) {
      case 'passed':
      case 'completed':
        return { color: 'bg-status-success', text: 'Passed' };
      case 'failed':
        return { color: 'bg-status-danger', text: 'Failed' };
      case 'running':
        return { color: 'bg-status-info animate-pulse', text: 'Running' };
      case 'pending':
      case 'queued':
        return { color: 'bg-status-warning', text: 'Pending' };
      case 'cancelled':
        return { color: 'bg-text-muted', text: 'Cancelled' };
      case 'skipped':
        return { color: 'bg-status-warning/70', text: 'Skipped' };
      default:
        return { color: 'bg-text-muted', text: status };
    }
  };

  const config = getStatusConfig();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white ${config.color}`}>
      {config.text}
    </span>
  );
};

const STATUS_COLOR_MAP: Record<string, string> = {
  passed: 'bg-status-success',
  completed: 'bg-status-success',
  failed: 'bg-status-danger',
  running: 'bg-status-info animate-pulse',
  pending: 'bg-status-warning',
  queued: 'bg-status-warning',
  cancelled: 'bg-text-muted',
  skipped: 'bg-status-warning/70',
};

/**
 * MiniRunHistory - BrowserStack-style "last N runs" dot indicator.
 * Each dot represents a run: green = passed, red = failed, blue = running, yellow = pending, gray = other.
 */
export const MiniRunHistory: React.FC<{ runs: ScheduleRun[] }> = ({ runs }) => {
  if (!runs || runs.length === 0) return null;

  // Chronological order: oldest -> newest (left -> right)
  const sorted = [...runs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="flex items-center gap-1" title="Recent runs (oldest → newest)">
      {sorted.map((run) => (
        <span
          key={run.id}
          className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLOR_MAP[run.status] || 'bg-text-muted'}`}
          title={`${formatDate(run.createdAt)} — ${run.status}${run.testCount ? ` (${run.passedCount}/${run.testCount} passed)` : ''}`}
        />
      ))}
    </div>
  );
};
