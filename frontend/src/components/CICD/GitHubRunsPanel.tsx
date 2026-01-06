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
  PlayCircle,
  StopCircle,
  RotateCcw,
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
      return <Clock className={`${sizeClass} text-yellow-500`} />;
    }
    if (status === 'in_progress') {
      return <Loader2 className={`${sizeClass} text-blue-500 animate-spin`} />;
    }

    switch (conclusion) {
      case 'success':
        return <CheckCircle className={`${sizeClass} text-green-500`} />;
      case 'failure':
        return <XCircle className={`${sizeClass} text-red-500`} />;
      case 'cancelled':
        return <StopCircle className={`${sizeClass} text-gray-500`} />;
      case 'skipped':
        return <AlertTriangle className={`${sizeClass} text-gray-400`} />;
      case 'timed_out':
        return <Clock className={`${sizeClass} text-orange-500`} />;
      default:
        return <Clock className={`${sizeClass} text-gray-400`} />;
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
    if (status === 'queued') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    if (status === 'in_progress') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';

    switch (conclusion) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'failure':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
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
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-2 text-sm text-red-700 dark:text-red-300 underline"
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          GitHub Actions Runs
        </h3>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Runs List */}
      {runs.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
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
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                {/* Run Header */}
                <div
                  className={`
                    flex items-center justify-between p-4 cursor-pointer
                    hover:bg-gray-50 dark:hover:bg-gray-700/50
                    ${isExpanded ? 'border-b border-gray-200 dark:border-gray-700' : ''}
                  `}
                  onClick={() => hasJobs && toggleExpand(run.id)}
                >
                  <div className="flex items-center gap-3">
                    {hasJobs ? (
                      isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )
                    ) : (
                      <div className="w-5 h-5" />
                    )}

                    {getStatusIcon(run.status, run.conclusion)}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
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
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
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
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDuration(run.startedAt, run.completedAt)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(run.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <a
                      href={run.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Jobs (Shards) */}
                {isExpanded && hasJobs && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Jobs ({run.jobs!.length} shards)
                    </h4>
                    <div className="space-y-2">
                      {run.jobs!.map((job) => (
                        <div
                          key={job.id}
                          className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {getStatusIcon(job.status, job.conclusion, 'sm')}
                            <div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {job.name}
                              </span>
                              {job.runnerName && (
                                <span className="ml-2 text-xs text-gray-500">
                                  ({job.runnerName})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">
                              {formatDuration(job.startedAt, job.completedAt)}
                            </span>
                            {job.htmlUrl && (
                              <a
                                href={job.htmlUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
