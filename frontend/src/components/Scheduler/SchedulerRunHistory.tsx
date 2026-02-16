import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Play,
  Clock,
  AlertCircle,
  RefreshCw,
  History,
  CheckSquare,
  ExternalLink,
  Square,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { EmptyState, Tooltip } from '@/components/ui';
import { schedulesApi } from '@/api/schedules';
import type { Schedule, ScheduleRun } from '@playwright-web-app/shared';
import { StatusBadge } from './SchedulerStatusBadge';
import { formatDate, formatRelativeTime, formatDuration } from './schedulerUtils';

const RunStatusIcon: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'passed':
    case 'completed':
      return (
        <div className="w-8 h-8 rounded-full bg-status-success/20 flex items-center justify-center shrink-0">
          <CheckSquare className="w-4 h-4 text-status-success" />
        </div>
      );
    case 'failed':
      return (
        <div className="w-8 h-8 rounded-full bg-status-danger/20 flex items-center justify-center shrink-0">
          <AlertCircle className="w-4 h-4 text-status-danger" />
        </div>
      );
    case 'running':
      return (
        <div className="w-8 h-8 rounded-full bg-status-info/20 flex items-center justify-center shrink-0">
          <RefreshCw className="w-4 h-4 text-status-info animate-spin" />
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-dark-elevated flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4 text-text-muted" />
        </div>
      );
  }
};

export interface RunHistoryProps {
  schedule: Schedule;
  onBack: () => void;
  onOpenExecution?: (executionId: string) => void;
  onTrigger: (schedule: Schedule) => void;
}

const PAGE_SIZE = 5;

export const RunHistory: React.FC<RunHistoryProps> = ({ schedule, onBack, onOpenExecution, onTrigger }) => {
  const [runs, setRuns] = useState<ScheduleRun[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Aggregate stats across all known runs (from the current page -- total from API)
  const passedTotal = runs.reduce((sum, r) => sum + (r.passedCount || 0), 0);
  const failedTotal = runs.reduce((sum, r) => sum + (r.failedCount || 0), 0);

  useEffect(() => {
    const fetchRuns = async () => {
      setIsLoading(true);
      try {
        const data = await schedulesApi.getRuns(schedule.id, PAGE_SIZE, page * PAGE_SIZE);
        setRuns(data.runs);
        setTotal(data.total);
      } catch (e) {
        console.error('Failed to fetch runs:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRuns();
  }, [schedule.id, page]);

  const pageStart = page * PAGE_SIZE + 1;
  const pageEnd = Math.min((page + 1) * PAGE_SIZE, total);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-text-muted" />
          <div>
            <h3 className="text-lg font-medium text-text-primary">{schedule.name} Run History</h3>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Schedulers
          </button>
          <button
            onClick={() => onTrigger(schedule)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-status-info hover:bg-status-info/80 rounded-md transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            Run Now
          </button>
        </div>
      </div>

      {/* Schedule Configuration Card */}
      <div className="p-4 bg-dark-card/50 border border-border-default rounded-lg">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-medium text-text-primary">Schedule Configuration</h4>
            {schedule.description && (
              <p className="text-sm text-text-muted mt-1">{schedule.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-text-muted">
                <Clock className="w-3.5 h-3.5" />
                <code className="text-xs bg-dark-elevated px-1.5 py-0.5 rounded">{schedule.cronExpression}</code>
              </div>
              <div className="flex items-center gap-1.5 text-text-muted">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-xs">Next: {formatRelativeTime(schedule.nextRunAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-text-primary">{total}</div>
              <div className="text-3xs uppercase tracking-wider text-text-muted">Total Runs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-status-success">{passedTotal}</div>
              <div className="text-3xs uppercase tracking-wider text-text-muted">Passed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-status-danger">{failedTotal}</div>
              <div className="text-3xs uppercase tracking-wider text-text-muted">Failed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section label */}
      <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        Recent Executions
      </div>

      {/* Run list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-text-muted animate-spin" />
        </div>
      ) : runs.length === 0 ? (
        <EmptyState
          icon={<History className="w-5 h-5" />}
          title="No runs yet"
          compact
        />
      ) : (
        <div className="space-y-2">
          {runs.map((run, index) => {
            const runNumber = total - (page * PAGE_SIZE) - index;
            const isRunning = run.status === 'running';
            const isPending = run.status === 'pending' || run.status === ('queued' as string);
            const triggerLabel = run.triggerType === 'scheduled' ? 'System (Cron)'
              : run.triggerType === 'manual' ? 'manual_trigger'
              : run.triggerType;

            return (
              <div
                key={run.id}
                className={`relative p-4 bg-dark-card/50 border rounded-lg overflow-hidden ${
                  isRunning ? 'border-status-warning/50' : 'border-border-default'
                }`}
              >
                {/* Progress bar for running */}
                {isRunning && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-status-warning/30">
                    <div className="h-full bg-status-warning animate-pulse" style={{ width: '60%' }} />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RunStatusIcon status={run.status} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">Run #{runNumber}</span>
                        <StatusBadge status={run.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(run.createdAt)}
                        </span>
                        {run.durationMs && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(run.durationMs)}
                          </span>
                        )}
                        <span>{triggerLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Test counts */}
                    {!isRunning && !isPending && (run.passedCount !== undefined || run.failedCount !== undefined) && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-status-success">{run.passedCount || 0} passed</span>
                        <span className="text-status-danger">{run.failedCount || 0} failed</span>
                      </div>
                    )}

                    {/* Report button */}
                    {isRunning || isPending ? (
                      <div className="flex items-center gap-1">
                        <span className="px-3 py-1.5 text-xs text-text-muted bg-dark-elevated border border-border-default rounded-md cursor-default">
                          Report Pending
                        </span>
                        {isRunning && (
                          <Tooltip content="Stop run" showDelayMs={0} hideDelayMs={0}>
                            <button className="p-1.5 text-text-muted hover:text-status-danger transition-colors" aria-label="Stop run">
                              <Square className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    ) : onOpenExecution && (run.executionId || run.githubRunId) ? (
                      <button
                        onClick={() => {
                          if (run.executionId) {
                            onOpenExecution(run.executionId);
                          } else if (run.githubRunId) {
                            onOpenExecution(`github-${run.githubRunId}`);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-dark-elevated border border-border-default hover:border-text-muted rounded-md transition-colors"
                        title="Open execution report"
                      >
                        Open Report
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    ) : !isRunning && !isPending && onOpenExecution ? (
                      <span className="px-3 py-1.5 text-xs text-text-muted bg-dark-elevated border border-border-default rounded-md cursor-default" title="No execution report linked to this run">
                        No Report
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-text-muted">
            Showing {pageStart} to {pageEnd} of {total} runs
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-text-muted hover:text-text-primary bg-dark-elevated border border-border-default rounded-md transition-colors disabled:opacity-40 disabled:cursor-default"
            >
              <ChevronLeft className="w-3 h-3" />
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-text-muted hover:text-text-primary bg-dark-elevated border border-border-default rounded-md transition-colors disabled:opacity-40 disabled:cursor-default"
            >
              Next
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
