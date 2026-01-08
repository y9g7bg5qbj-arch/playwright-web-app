/**
 * GitHubExecutionCard - Displays a tracked GitHub Actions execution
 * Shows real-time status, progress, and results from the execution store
 */
import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Server,
  Layers,
  Monitor,
  Download,
  BarChart2,
  PlayCircle,
} from 'lucide-react';
import type { GitHubExecution, GitHubExecutionScenario, GitHubExecutionStep } from '@/store/useGitHubExecutionStore';
import { ScenarioRow } from './ScenarioRow';
import type { ExecutionScenario } from './ExecutionDashboard';

interface GitHubExecutionCardProps {
  execution: GitHubExecution;
  onViewTrace?: (traceUrl: string, testName: string) => void;
}

// Convert GitHub scenario to ExecutionScenario format
const toExecutionScenario = (scenario: GitHubExecutionScenario): ExecutionScenario => ({
  id: scenario.id,
  name: scenario.name,
  status: scenario.status as ExecutionScenario['status'],
  duration: scenario.duration,
  error: scenario.error,
  traceUrl: scenario.traceUrl,
  screenshot: scenario.screenshot,
  steps: scenario.steps?.map((step: GitHubExecutionStep) => ({
    id: step.id,
    stepNumber: step.stepNumber,
    action: step.action,
    description: step.action,
    status: step.status as ExecutionScenario['status'],
    duration: step.duration,
    error: step.error,
    screenshot: step.screenshot,
  })),
});

export const GitHubExecutionCard: React.FC<GitHubExecutionCardProps> = ({
  execution,
  onViewTrace,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllScenarios, setShowAllScenarios] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [embeddedReportUrl, setEmbeddedReportUrl] = useState<string | null>(null);
  const [isReportCollapsed, setIsReportCollapsed] = useState(true); // Collapsed by default

  // Format duration from milliseconds
  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // Format time ago
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Get status indicator
  const getStatusIndicator = () => {
    switch (execution.status) {
      case 'queued':
        return (
          <div className="flex items-center gap-2 text-yellow-400">
            <Clock className="w-5 h-5" />
            <span className="font-medium">Queued</span>
          </div>
        );
      case 'in_progress':
        return (
          <div className="flex items-center gap-2 text-blue-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">Running</span>
          </div>
        );
      case 'completed':
        if (execution.conclusion === 'success') {
          return (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Passed</span>
            </div>
          );
        }
        if (execution.conclusion === 'failure') {
          return (
            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Failed</span>
            </div>
          );
        }
        if (execution.conclusion === 'cancelled') {
          return (
            <div className="flex items-center gap-2 text-slate-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Cancelled</span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2 text-slate-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Completed</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-2 text-red-400">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Failed</span>
          </div>
        );
      case 'cancelled':
        return (
          <div className="flex items-center gap-2 text-slate-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Cancelled</span>
          </div>
        );
      default:
        return null;
    }
  };

  // Get progress bar
  const getProgressBar = () => {
    if (execution.status !== 'in_progress' && execution.status !== 'completed') return null;
    if (execution.totalTests === 0) return null;

    const total = execution.totalTests;
    const passed = execution.passedTests;
    const failed = execution.failedTests;
    const skipped = execution.skippedTests;
    const completed = passed + failed + skipped;
    const percent = Math.round((completed / total) * 100);

    return (
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>{completed}/{total} tests</span>
          <span>{percent}%</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full flex"
            style={{ width: `${percent}%` }}
          >
            {passed > 0 && (
              <div
                className="h-full bg-green-500"
                style={{ width: `${(passed / completed) * 100}%` }}
              />
            )}
            {failed > 0 && (
              <div
                className="h-full bg-red-500"
                style={{ width: `${(failed / completed) * 100}%` }}
              />
            )}
            {skipped > 0 && (
              <div
                className="h-full bg-slate-500"
                style={{ width: `${(skipped / completed) * 100}%` }}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  // Load embedded report
  const loadEmbeddedReport = async () => {
    if (!execution.runId || execution.runId === 0) {
      setReportError('Run ID not available');
      return;
    }

    setReportLoading(true);
    setReportError(null);

    try {
      // First try to check if report is already prepared
      const statusResp = await fetch(`/api/github/runs/${execution.runId}/allure/status`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const statusData = await statusResp.json();

      if (statusData.success && statusData.data.ready) {
        // Report already extracted, embed it
        setEmbeddedReportUrl(`http://localhost:3000${statusData.data.reportUrl}`);
        return;
      }

      // Need to prepare the report first
      const owner = execution.owner;
      const repo = execution.repo;
      if (!owner || !repo) {
        setReportError('Repository information not available');
        return;
      }

      const prepareResp = await fetch(`/api/github/runs/${execution.runId}/allure/prepare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ owner, repo })
      });

      const prepareData = await prepareResp.json();

      if (prepareData.success && prepareData.data.reportUrl) {
        setEmbeddedReportUrl(`http://localhost:3000${prepareData.data.reportUrl}`);
      } else {
        setReportError(prepareData.error || 'Failed to prepare report');
      }
    } catch (err) {
      setReportError('Failed to load report');
      console.error('[Report] Error:', err);
    } finally {
      setReportLoading(false);
    }
  };

  // Auto-load report when card is expanded
  useEffect(() => {
    if (isExpanded && !embeddedReportUrl && !reportLoading && execution.status === 'completed') {
      loadEmbeddedReport();
    }
  }, [isExpanded, execution.status]);

  // Check if traces should be available (completed runs have traces)
  const hasTraces = execution.status === 'completed' && execution.conclusion === 'success';
  const [traceLoading, setTraceLoading] = useState(false);

  // Open trace viewer - calls backend to download and launch npx playwright show-trace
  const handleOpenTraceViewer = async () => {
    if (!execution.owner || !execution.repo || !execution.runId) {
      console.error('[TraceViewer] Missing owner, repo, or runId');
      return;
    }

    setTraceLoading(true);
    try {
      const response = await fetch(`/api/github/runs/${execution.runId}/trace/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          owner: execution.owner,
          repo: execution.repo,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('[TraceViewer] Launched successfully:', data.data);
        // The trace viewer GUI will open in a separate window via npx playwright show-trace
      } else {
        console.error('[TraceViewer] Failed:', data.error);
        alert(`Failed to open trace viewer: ${data.error}`);
      }
    } catch (error) {
      console.error('[TraceViewer] Error:', error);
      alert('Failed to open trace viewer. Check console for details.');
    } finally {
      setTraceLoading(false);
    }
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-slate-700/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <button className="mt-1 text-slate-400">
              {isExpanded ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>

            <div>
              <div className="flex items-center gap-3">
                {getStatusIndicator()}
                {execution.runNumber > 0 && (
                  <span className="text-slate-500 text-sm">
                    Run #{execution.runNumber}
                  </span>
                )}
              </div>

              <p className="text-slate-300 mt-1">
                {execution.workflowName}
              </p>

              {/* Configuration badges */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">
                  <Monitor className="w-3 h-3" />
                  {execution.browsers.join(', ')}
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">
                  <Server className="w-3 h-3" />
                  {execution.workers} workers
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">
                  <Layers className="w-3 h-3" />
                  {execution.shards} shards
                </div>
              </div>

              {getProgressBar()}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-sm text-slate-400">
              {formatTimeAgo(execution.triggeredAt)}
            </div>
            {execution.duration && (
              <div className="text-xs text-slate-500">
                Duration: {formatDuration(execution.duration)}
              </div>
            )}
            <a
              href={execution.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
            >
              <ExternalLink className="w-3 h-3" />
              View on GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-slate-700 p-4 bg-slate-800/30">
          {/* Jobs/Shards */}
          {execution.jobs && execution.jobs.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-slate-300 mb-2">
                Jobs ({execution.jobs.length})
              </h4>
              <div className="space-y-2">
                {execution.jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {job.status === 'in_progress' ? (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      ) : job.conclusion === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : job.conclusion === 'failure' ? (
                        <XCircle className="w-4 h-4 text-red-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="text-sm text-slate-300">{job.name}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {job.status === 'completed' ? job.conclusion : job.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test Results Summary */}
          {(execution.totalTests > 0 || execution.status === 'completed') && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-slate-300 mb-2">
                Test Results
              </h4>
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-slate-700/50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-slate-200">
                    {execution.totalTests}
                  </div>
                  <div className="text-xs text-slate-400">Total</div>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {execution.passedTests}
                  </div>
                  <div className="text-xs text-green-400/70">Passed</div>
                </div>
                <div className="p-3 bg-red-500/10 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {execution.failedTests}
                  </div>
                  <div className="text-xs text-red-400/70">Failed</div>
                </div>
                <div className="p-3 bg-slate-500/10 rounded-lg text-center">
                  <div className="text-2xl font-bold text-slate-400">
                    {execution.skippedTests}
                  </div>
                  <div className="text-xs text-slate-400/70">Skipped</div>
                </div>
              </div>
            </div>
          )}

          {/* Scenarios - using ScenarioRow for polished display */}
          {execution.scenarios && execution.scenarios.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-slate-300">
                  Test Scenarios ({execution.scenarios.length})
                </h4>
                {execution.scenarios.length > 5 && (
                  <button
                    onClick={() => setShowAllScenarios(!showAllScenarios)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    {showAllScenarios ? 'Show less' : `Show all ${execution.scenarios.length}`}
                  </button>
                )}
              </div>

              {/* Failed scenarios first */}
              {execution.scenarios
                .filter((s) => s.status === 'failed')
                .slice(0, showAllScenarios ? undefined : 3)
                .map((scenario) => (
                  <ScenarioRow
                    key={scenario.id}
                    scenario={toExecutionScenario(scenario)}
                    onViewTrace={() => onViewTrace?.(scenario.traceUrl || '', scenario.name)}
                  />
                ))}

              {/* Then passed/other scenarios */}
              {execution.scenarios
                .filter((s) => s.status !== 'failed')
                .slice(0, showAllScenarios ? undefined : 5 - execution.scenarios.filter((s) => s.status === 'failed').length)
                .map((scenario) => (
                  <ScenarioRow
                    key={scenario.id}
                    scenario={toExecutionScenario(scenario)}
                    onViewTrace={() => onViewTrace?.(scenario.traceUrl || '', scenario.name)}
                  />
                ))}
            </div>
          )}

          {/* Quick Actions Bar */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              {/* Trace Viewer Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenTraceViewer();
                }}
                disabled={!hasTraces || traceLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {traceLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PlayCircle className="w-4 h-4" />
                )}
                {traceLoading ? 'Launching...' : 'Open Trace Viewer'}
              </button>
              <span className="text-xs text-slate-400">
                {hasTraces ? 'Launch Playwright Trace Viewer GUI' : 'No traces available'}
              </span>

              {/* Additional actions */}
              <div className="ml-auto flex items-center gap-2">
                {execution.htmlReportUrl && (
                  <a
                    href={execution.htmlReportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                )}
                <a
                  href={execution.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  GitHub
                </a>
              </div>
            </div>

            {/* Embedded Report - Collapsible */}
            {reportLoading ? (
              <div className="flex items-center justify-center p-8 bg-slate-700/30 rounded-lg">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400 mr-3" />
                <span className="text-slate-300">Loading report...</span>
              </div>
            ) : reportError ? (
              <div className="p-4 text-sm text-red-400 bg-red-500/10 rounded-lg">
                {reportError}
              </div>
            ) : embeddedReportUrl ? (
              <div className="border border-slate-600 rounded-lg overflow-hidden bg-white">
                <div
                  className="flex items-center justify-between px-3 py-2 bg-slate-700 border-b border-slate-600 cursor-pointer hover:bg-slate-600/50 transition-colors"
                  onClick={() => setIsReportCollapsed(!isReportCollapsed)}
                >
                  <span className="text-xs text-slate-300 flex items-center gap-2">
                    {isReportCollapsed ? (
                      <ChevronRight className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                    <BarChart2 className="w-3 h-3" />
                    Playwright HTML Report
                  </span>
                  <span className="text-xs text-slate-400">
                    {isReportCollapsed ? 'Click to expand' : 'Click to collapse'}
                  </span>
                </div>
                {!isReportCollapsed && (
                  <iframe
                    src={embeddedReportUrl}
                    className="w-full"
                    style={{ height: '600px' }}
                    title="Test Report"
                  />
                )}
              </div>
            ) : execution.status !== 'completed' ? (
              <div className="p-4 text-sm text-slate-400 bg-slate-700/30 rounded-lg text-center">
                Report will be available after execution completes
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default GitHubExecutionCard;
