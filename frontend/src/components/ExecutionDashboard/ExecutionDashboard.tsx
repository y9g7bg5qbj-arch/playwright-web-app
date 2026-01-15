/**
 * ExecutionDashboard - Main canvas component for viewing all test executions
 *
 * Displays a list of executions with timestamps, triggered by info, and expandable
 * details showing either live execution view or Allure-style reports.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Filter,
  Activity,
  Github,
  Monitor,
  Loader2,
} from 'lucide-react';
import { ExecutionCard } from './ExecutionCard';
import { GitHubExecutionCard } from './GitHubExecutionCard';
import { useGitHubExecutionStore, GitHubExecution } from '@/store/useGitHubExecutionStore';
import { useLocalExecutionStore } from '@/store/useLocalExecutionStore';

/**
 * Shard information for parallel execution
 */
export interface ShardInfo {
  id: string;
  index: number;
  status: 'pending' | 'running' | 'passed' | 'failed';
  passedTests: number;
  failedTests: number;
  totalTests: number;
}

export interface ExecutionWithDetails {
  id: string;
  testFlowId: string;
  testFlowName: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';
  target: 'local' | 'remote';
  triggeredBy: {
    type: 'user' | 'scheduled' | 'api' | 'webhook';
    name?: string;
  };
  startedAt: string;
  finishedAt?: string;
  stepCount: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  duration?: number;
  scenarios?: ExecutionScenario[];
  shards?: ShardInfo[];
}

export interface ExecutionLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export interface ExecutionAttachment {
  id: string;
  name: string;
  type: 'screenshot' | 'file' | 'video';
  path: string;
  timestamp: string;
  description?: string;
}

export interface ExecutionStep {
  id: string;
  stepNumber: number;
  action: string;
  description?: string;
  selector?: string;
  selectorName?: string;
  page?: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  screenshot?: string;
  startedAt?: string;
  finishedAt?: string;
  logs?: ExecutionLog[];
}

export interface ExecutionScenario {
  id: string;
  name: string;
  tags?: string[];
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  screenshot?: string;
  traceUrl?: string;
  steps?: ExecutionStep[];
  logs?: ExecutionLog[];
  attachments?: ExecutionAttachment[];
}

export interface ExecutionDashboardProps {
  onViewLive: (executionId: string, mode: 'local' | 'remote', shards?: ShardInfo[]) => void;
  onViewTrace: (traceUrl: string, testName: string) => void;
  onBack: () => void;
}

type StatusFilter = 'all' | 'running' | 'passed' | 'failed';
type ExecutionSource = 'local' | 'github';

export const ExecutionDashboard: React.FC<ExecutionDashboardProps> = ({
  onViewLive,
  onViewTrace,
  onBack,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSource, setActiveSource] = useState<ExecutionSource>('local');

  // Local executions from store
  const localExecutions = useLocalExecutionStore((state) => state.executions);
  const localIsLoading = useLocalExecutionStore((state) => state.isLoading);
  const fetchLocalExecutions = useLocalExecutionStore((state) => state.fetchExecutions);
  const clearLocalExecutions = useLocalExecutionStore((state) => state.clearAll);

  // GitHub executions from store
  const githubExecutions = useGitHubExecutionStore((state) => state.executions);
  const clearGitHubExecutions = useGitHubExecutionStore((state) => state.clearAll);
  const addExecution = useGitHubExecutionStore((state) => state.addExecution);
  const updateExecution = useGitHubExecutionStore((state) => state.updateExecution);

  // Count running executions
  const runningLocalCount = localExecutions.filter((e) => e.status === 'running').length;
  const runningGitHubCount = githubExecutions.filter(
    (e) => e.status === 'queued' || e.status === 'in_progress'
  ).length;

  // Fetch GitHub runs from API and update store
  const fetchGitHubRuns = useCallback(async () => {
    try {
      const authToken = localStorage.getItem('auth_token');
      const headers: Record<string, string> = authToken
        ? { 'Authorization': `Bearer ${authToken}` }
        : {};

      const savedSettings = localStorage.getItem('github-settings');
      let owner = 'y9g7bg5qbj-arch';
      let repo = 'playwright-web-app';

      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        owner = settings.owner || owner;
        repo = settings.repo || repo;
      }

      const response = await fetch(`/api/github/runs?owner=${owner}&repo=${repo}&limit=20`, { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch runs: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.data) {
        for (const run of data.data) {
          const newId = `github-${run.id}`;
          const existingRun = githubExecutions.find(e =>
            e.runId === run.id || e.id === newId
          );

          const mapStatus = (status: string): 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled' => {
            if (status === 'completed') return 'completed';
            if (status === 'in_progress') return 'in_progress';
            if (status === 'queued') return 'queued';
            if (status === 'failure') return 'failed';
            if (status === 'cancelled') return 'cancelled';
            return 'completed';
          };

          const jobs = run.jobs?.map((job: { id: number; name: string; status: string; conclusion: string | null; started_at: string; completed_at: string }) => ({
            id: job.id,
            name: job.name,
            status: job.status,
            conclusion: job.conclusion,
            startedAt: job.started_at,
            completedAt: job.completed_at,
          }));

          const execution: Partial<GitHubExecution> = {
            id: newId,
            runId: run.id,
            runNumber: run.runNumber,
            workflowName: run.name,
            status: mapStatus(run.status),
            conclusion: run.conclusion,
            browsers: ['chromium'],
            workers: run.jobs?.length || 2,
            shards: run.jobs?.length || 1,
            triggeredAt: run.createdAt,
            startedAt: run.createdAt,
            completedAt: run.updatedAt,
            totalTests: existingRun?.totalTests || 0,
            passedTests: existingRun?.passedTests || 0,
            failedTests: existingRun?.failedTests || 0,
            skippedTests: existingRun?.skippedTests || 0,
            scenarios: existingRun?.scenarios,
            htmlUrl: run.htmlUrl,
            owner,
            repo,
            jobs,
          };

          if (existingRun) {
            updateExecution(existingRun.id, execution);
          } else {
            addExecution(execution as any);
          }

          const isCompleted = run.status === 'completed' || run.conclusion;
          const needsReport = isCompleted && (!existingRun?.scenarios || existingRun.scenarios.length === 0);

          if (needsReport) {
            fetch(`/api/github/runs/${run.id}/report?owner=${owner}&repo=${repo}`, { headers })
              .then(res => res.json())
              .then(reportData => {
                if (reportData.success && reportData.data) {
                  const { summary, scenarios } = reportData.data;
                  updateExecution(newId, {
                    totalTests: summary.total,
                    passedTests: summary.passed,
                    failedTests: summary.failed,
                    skippedTests: summary.skipped,
                    scenarios: scenarios?.map((s: any) => ({
                      id: s.id,
                      name: s.name,
                      status: s.status,
                      duration: s.duration,
                      error: s.error,
                      traceUrl: s.traceUrl,
                      steps: s.steps,
                    })),
                  });
                }
              })
              .catch(err => console.warn(`[ExecutionDashboard] Failed to fetch report for run ${run.id}:`, err));
          }
        }
      }
    } catch (error) {
      console.error('[ExecutionDashboard] Failed to fetch GitHub runs:', error);
    }
  }, [githubExecutions, addExecution, updateExecution]);

  const fetchExecutions = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      if (activeSource === 'github') {
        await fetchGitHubRuns();
      } else {
        await fetchLocalExecutions();
      }
    } catch (error) {
      console.error('Failed to fetch executions:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [activeSource, fetchGitHubRuns, fetchLocalExecutions]);

  useEffect(() => {
    fetchExecutions();
  }, [activeSource, fetchExecutions]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter local executions
  const filteredLocalExecutions = localExecutions.filter(exec => {
    if (filter === 'all') return true;
    return exec.status === filter;
  });

  const localFilterCounts = {
    all: localExecutions.length,
    running: localExecutions.filter(e => e.status === 'running').length,
    passed: localExecutions.filter(e => e.status === 'passed').length,
    failed: localExecutions.filter(e => e.status === 'failed').length,
  };

  return (
    <div className="flex-1 flex flex-col bg-dark-bg overflow-hidden">
      {/* Header */}
      <div className="h-14 bg-dark-card border-b border-border-default flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Editor</span>
          </button>
          <div className="h-6 w-px bg-border-default" />
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent-blue" />
            <h1 className="text-lg font-semibold text-text-primary">Execution History</h1>
          </div>
          {/* Source Tabs */}
          <div className="flex items-center gap-1 ml-6 bg-dark-elevated rounded-lg p-1 border border-border-muted">
            <button
              onClick={() => setActiveSource('local')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeSource === 'local'
                ? 'bg-dark-card text-text-primary border border-border-default'
                : 'text-text-secondary hover:text-text-primary'
                }`}
            >
              <Monitor className="w-4 h-4" />
              Local
              {runningLocalCount > 0 && (
                <span className="flex items-center gap-1 ml-1 px-1.5 py-0.5 bg-accent-green/20 text-accent-green text-xs rounded-full">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {runningLocalCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveSource('github')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeSource === 'github'
                ? 'bg-dark-card text-text-primary border border-border-default'
                : 'text-text-secondary hover:text-text-primary'
                }`}
            >
              <Github className="w-4 h-4" />
              GitHub Actions
              {runningGitHubCount > 0 && (
                <span className="flex items-center gap-1 ml-1 px-1.5 py-0.5 bg-accent-blue/20 text-accent-blue text-xs rounded-full">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {runningGitHubCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <button
          onClick={() => fetchExecutions(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 bg-dark-elevated hover:bg-dark-card text-text-primary rounded-md text-sm transition-colors disabled:opacity-50 border border-border-default"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs - Only show for local executions */}
      {activeSource === 'local' && (
        <div className="px-6 py-3 border-b border-border-default flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          {(['all', 'running', 'passed', 'failed'] as StatusFilter[]).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${filter === status
                ? status === 'running' ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30' :
                  status === 'passed' ? 'bg-accent-green/20 text-accent-green border border-accent-green/30' :
                    status === 'failed' ? 'bg-accent-red/20 text-accent-red border border-accent-red/30' :
                      'bg-dark-elevated text-text-primary border border-border-default'
                : 'bg-dark-card/50 text-text-muted hover:text-text-secondary border border-transparent'
                }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="opacity-70">({localFilterCounts[status]})</span>
            </button>
          ))}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* GitHub Actions View */}
        {activeSource === 'github' ? (
          <div className="max-w-5xl mx-auto">
            {githubExecutions.length > 0 && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => {
                    if (confirm('Clear all GitHub execution history?')) {
                      clearGitHubExecutions();
                    }
                  }}
                  className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  Clear History
                </button>
              </div>
            )}
            {githubExecutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 bg-dark-card rounded-full flex items-center justify-center mb-4 border border-border-default">
                  <Github className="w-8 h-8 text-text-muted" />
                </div>
                <p className="text-text-primary font-medium">No GitHub Actions runs yet</p>
                <p className="text-sm text-text-muted mt-1">
                  Run tests with GitHub Actions to see execution history here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...githubExecutions]
                  .sort((a, b) => {
                    const aRunning = a.status === 'queued' || a.status === 'in_progress';
                    const bRunning = b.status === 'queued' || b.status === 'in_progress';
                    if (aRunning && !bRunning) return -1;
                    if (!aRunning && bRunning) return 1;
                    const aDate = new Date(a.triggeredAt || a.startedAt || 0).getTime();
                    const bDate = new Date(b.triggeredAt || b.startedAt || 0).getTime();
                    return bDate - aDate;
                  })
                  .map((execution) => (
                    <GitHubExecutionCard
                      key={execution.id}
                      execution={execution}
                      onViewTrace={onViewTrace}
                    />
                  ))}
              </div>
            )}
          </div>
        ) : (
          /* Local Executions View */
          <div className="max-w-5xl mx-auto">
            {localExecutions.length > 0 && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => {
                    if (confirm('Clear all local execution history?')) {
                      clearLocalExecutions();
                    }
                  }}
                  className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  Clear History
                </button>
              </div>
            )}
            {localIsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 border-4 border-border-default border-t-accent-blue rounded-full animate-spin mx-auto" />
                  <p className="text-text-secondary text-sm">Loading executions...</p>
                </div>
              </div>
            ) : filteredLocalExecutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 bg-dark-card rounded-full flex items-center justify-center mb-4 border border-border-default">
                  <Monitor className="w-8 h-8 text-text-muted" />
                </div>
                <p className="text-text-primary font-medium">No local executions found</p>
                <p className="text-sm text-text-muted mt-1">
                  {filter !== 'all' ? 'Try changing your filter' : 'Run a test locally to see execution history'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLocalExecutions
                  .sort((a, b) => {
                    // Running executions first
                    if (a.status === 'running' && b.status !== 'running') return -1;
                    if (a.status !== 'running' && b.status === 'running') return 1;
                    // Then by start time (newest first)
                    const aDate = new Date(a.startedAt || 0).getTime();
                    const bDate = new Date(b.startedAt || 0).getTime();
                    return bDate - aDate;
                  })
                  .map(execution => (
                    <ExecutionCard
                      key={execution.id}
                      execution={execution}
                      isExpanded={expandedIds.has(execution.id)}
                      onToggle={() => toggleExpand(execution.id)}
                      onViewLive={() => onViewLive(
                        execution.id,
                        execution.target,
                        execution.shards
                      )}
                      onViewTrace={onViewTrace}
                    />
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutionDashboard;
