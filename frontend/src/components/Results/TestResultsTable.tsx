/**
 * TestResultsTable - Table view for test results
 */
import React from 'react';
import {
  CheckCircle2,
  XCircle,
  SkipForward,
  AlertTriangle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import type { TestRun } from './TestResultsDashboard';

interface TestResultsTableProps {
  runs: TestRun[];
  onViewRun?: (runId: string) => void;
  onViewTrace?: (testId: string, traceUrl: string) => void;
}

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
};

const StatusIcon: React.FC<{ status: string; isFlaky?: boolean }> = ({ status, isFlaky }) => {
  if (isFlaky) return <AlertTriangle className="w-4 h-4 text-status-warning" />;
  switch (status) {
    case 'passed':
      return <CheckCircle2 className="w-4 h-4 text-status-success" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-status-danger" />;
    case 'skipped':
      return <SkipForward className="w-4 h-4 text-text-secondary" />;
    default:
      return <Clock className="w-4 h-4 text-status-info" />;
  }
};

export const TestResultsTable: React.FC<TestResultsTableProps> = ({
  runs,
  onViewRun,
  onViewTrace,
}) => {
  const allResults = runs.flatMap(run =>
    run.results.map(result => ({
      ...result,
      runId: run.id,
      runName: run.name,
      browser: run.browser,
      branch: run.branch,
    }))
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-dark-card/50 border-b border-border-default">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-text-secondary">Status</th>
            <th className="text-left px-4 py-3 font-medium text-text-secondary">Test Name</th>
            <th className="text-left px-4 py-3 font-medium text-text-secondary">Run</th>
            <th className="text-left px-4 py-3 font-medium text-text-secondary">Browser</th>
            <th className="text-left px-4 py-3 font-medium text-text-secondary">Duration</th>
            <th className="text-left px-4 py-3 font-medium text-text-secondary">Retries</th>
            <th className="text-right px-4 py-3 font-medium text-text-secondary">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {allResults.map((result, idx) => (
            <tr
              key={`${result.runId}-${result.id}-${idx}`}
              className="hover:bg-dark-card/30 transition-colors"
            >
              <td className="px-4 py-3">
                <StatusIcon status={result.status} isFlaky={result.isFlaky} />
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-text-primary">{result.name}</div>
                {result.error && (
                  <div className="text-xs text-status-danger mt-0.5 truncate max-w-xs">
                    {typeof result.error === 'string' ? result.error : result.error.message}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onViewRun?.(result.runId)}
                  className="text-text-secondary hover:text-status-info transition-colors"
                >
                  {result.runName}
                </button>
                {result.branch && (
                  <span className="ml-2 text-xs text-text-muted bg-dark-card px-1.5 py-0.5 rounded">
                    {result.branch}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-text-secondary">{result.browser}</td>
              <td className="px-4 py-3 text-text-secondary">{formatDuration(result.duration)}</td>
              <td className="px-4 py-3">
                {(result.retries ?? 0) > 0 ? (
                  <span className="text-status-warning text-xs bg-status-warning/10 px-1.5 py-0.5 rounded">
                    {result.retries} retries
                  </span>
                ) : (
                  <span className="text-text-muted">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {result.traceUrl && (
                  <button
                    onClick={() => onViewTrace?.(result.id, result.traceUrl!)}
                    className="inline-flex items-center gap-1 text-xs text-status-info hover:text-status-info transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Trace
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TestResultsTable;
