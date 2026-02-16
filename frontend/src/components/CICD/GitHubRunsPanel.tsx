/**
 * GitHub Runs Panel Component
 * Shows GitHub Actions workflow runs integrated with execution history
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  GitBranch,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  StopCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface GitHubWorkflowRun {
  id: string;
  runId: string;
  runNumber: number;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | null;
  htmlUrl: string;
  event: string;
  headBranch: string | null;
  headSha: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  jobs?: GitHubJob[];
}

interface GitHubJob {
  id: string;
  jobId: string;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  htmlUrl: string | null;
  runnerName: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface GitHubRunsPanelProps {
  workflowId: string;
  onRefresh?: () => void;
}

const API_BASE = '/api/github';

export const GitHubRunsPanel: React.FC<GitHubRunsPanelProps> = ({
  workflowId,
  onRefresh,
}) => {
  const [runs, setRuns] = useState<GitHubWorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // Fetch workflow runs
  const fetchRuns = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(
        `${API_BASE}/workflows/${workflowId}/runs?limit=20`,
        { credentials: 'include' }
      );
      const data = await response.json();
      if (data.success) {
        setRuns(data.data);
      } else {
        setError(data.error || 'Failed to fetch runs');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch runs');
    }
  }, [workflowId]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchRuns();
      setLoading(false);
    };
    load();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchRuns, 30000);
    return () => clearInterval(interval);
  }, [fetchRuns]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRuns();
    setRefreshing(false);
    onRefresh?.();
  };

  // Toggle run expansion
  const toggleExpand = (runId: string) => {
    setExpandedRuns((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  };

  // Get status icon
  const getStatusIcon = (
    status: string,
    conclusion: string | null,
    size: 'sm' | 'md' = 'md'
  ) => {
    const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

    if (status === 'queued') {
      return <Clock className={`${sizeClass} text-status-warning`} />;
    }
    if (status === 'in_progress') {
      return <Loader2 className={`${sizeClass} text-status-info animate-spin`} />;
    }

    switch (conclusion) {
      case 'success':
        return <CheckCircle className={`${sizeClass} text-status-success`} />;
      case 'failure':
        return <XCircle className={`${sizeClass} text-status-danger`} />;
      case 'cancelled':
        return <StopCircle className={`${sizeClass} text-text-secondary`} />;
      case 'skipped':
        return <AlertTriangle className={`${sizeClass} text-text-secondary`} />;
      case 'timed_out':
        return <Clock className={`${sizeClass} text-status-warning`} />;
      default:
        return <Clock className={`${sizeClass} text-text-secondary`} />;
    }
  };

  // Get status label
  const getStatusLabel = (status: string, conclusion: string | null) => {
    if (status === 'queued') return 'Queued';
    if (status === 'in_progress') return 'Running';
    if (conclusion) {
      return conclusion.charAt(0).toUpperCase() + conclusion.slice(1);
    }
    return 'Unknown';
  };

  // Get status color
  const getStatusColor = (status: string, conclusion: string | null) => {
    if (status === 'queued') return 'bg-status-warning/20 text-status-warning';
    if (status === 'in_progress') return 'bg-status-info/20 text-status-info';

    switch (conclusion) {
      case 'success':
        return 'bg-status-success/20 text-status-success';
      case 'failure':
        return 'bg-status-danger/20 text-status-danger';
      case 'cancelled':
        return 'bg-dark-elevated text-text-secondary';
      default:
        return 'bg-dark-elevated text-text-secondary';
    }
  };

  // Format duration
  const formatDuration = (startedAt: string | null, completedAt: string | null) => {
    if (!startedAt) return '-';
    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    const durationMs = end - start;

    if (durationMs < 1000) return `${durationMs}ms`;
    if (durationMs < 60000) return `${Math.floor(durationMs / 1000)}s`;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-status-info" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-status-danger/20 rounded-lg">
        <p className="text-status-danger">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-2 text-sm text-status-danger underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-text-primary">
          GitHub Actions Runs
        </h3>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-dark-elevated rounded-lg hover:bg-dark-elevated disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Runs List */}
      {runs.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">
          <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No workflow runs found</p>
          <p className="text-sm mt-1">
            Trigger a workflow to see runs here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => {
            const isExpanded = expandedRuns.has(run.id);
            const hasJobs = run.jobs && run.jobs.length > 0;

            return (
              <div
                key={run.id}
                className="border border-border-default rounded-lg overflow-hidden"
              >
                {/* Run Header */}
                <div
                  className={`
                    flex items-center justify-between p-4 cursor-pointer
                    hover:bg-dark-elevated
                    ${isExpanded ? 'border-b border-border-default' : ''}
                  `}
                  onClick={() => hasJobs && toggleExpand(run.id)}
                >
                  <div className="flex items-center gap-3">
                    {hasJobs ? (
                      isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-text-secondary" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-text-secondary" />
                      )
                    ) : (
                      <div className="w-5 h-5" />
                    )}

                    {getStatusIcon(run.status, run.conclusion)}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">
                          Run #{run.runNumber}
                        </span>
                        <span
                          className={`
                            px-2 py-0.5 text-xs font-medium rounded-full
                            ${getStatusColor(run.status, run.conclusion)}
                          `}
                        >
                          {getStatusLabel(run.status, run.conclusion)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        {run.headBranch && (
                          <>
                            <GitBranch className="w-3 h-3" />
                            <span>{run.headBranch}</span>
                          </>
                        )}
                        {run.headSha && (
                          <span className="font-mono text-xs">
                            {run.headSha.slice(0, 7)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-text-secondary">
                        {formatDuration(run.startedAt, run.completedAt)}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {new Date(run.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <a
                      href={run.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 text-text-secondary hover:text-text-primary"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Jobs (Shards) */}
                {isExpanded && hasJobs && (
                  <div className="bg-dark-card/50 p-4">
                    <h4 className="text-sm font-medium text-text-primary mb-3">
                      Jobs ({run.jobs!.length} shards)
                    </h4>
                    <div className="space-y-2">
                      {run.jobs!.map((job) => (
                        <div
                          key={job.id}
                          className="flex items-center justify-between p-3 bg-dark-elevated rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {getStatusIcon(job.status, job.conclusion, 'sm')}
                            <div>
                              <span className="text-sm font-medium text-text-primary">
                                {job.name}
                              </span>
                              {job.runnerName && (
                                <span className="ml-2 text-xs text-text-secondary">
                                  ({job.runnerName})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-text-secondary">
                              {formatDuration(job.startedAt, job.completedAt)}
                            </span>
                            {job.htmlUrl && (
                              <a
                                href={job.htmlUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-text-secondary hover:text-text-primary"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GitHubRunsPanel;
