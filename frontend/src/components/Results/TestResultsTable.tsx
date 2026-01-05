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
  if (isFlaky) return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
  switch (status) {
    case 'passed':
      return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-400" />;
    case 'skipped':
      return <SkipForward className="w-4 h-4 text-slate-400" />;
    default:
      return <Clock className="w-4 h-4 text-blue-400" />;
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
        <thead className="bg-slate-800/50 border-b border-slate-700">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-slate-400">Status</th>
            <th className="text-left px-4 py-3 font-medium text-slate-400">Test Name</th>
            <th className="text-left px-4 py-3 font-medium text-slate-400">Run</th>
            <th className="text-left px-4 py-3 font-medium text-slate-400">Browser</th>
            <th className="text-left px-4 py-3 font-medium text-slate-400">Duration</th>
            <th className="text-left px-4 py-3 font-medium text-slate-400">Retries</th>
            <th className="text-right px-4 py-3 font-medium text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {allResults.map((result, idx) => (
            <tr
              key={`${result.runId}-${result.id}-${idx}`}
              className="hover:bg-slate-800/30 transition-colors"
            >
              <td className="px-4 py-3">
                <StatusIcon status={result.status} isFlaky={result.isFlaky} />
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-slate-200">{result.name}</div>
                {result.error && (
                  <div className="text-xs text-red-400 mt-0.5 truncate max-w-xs">
                    {typeof result.error === 'string' ? result.error : result.error.message}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onViewRun?.(result.runId)}
                  className="text-slate-400 hover:text-blue-400 transition-colors"
                >
                  {result.runName}
                </button>
                {result.branch && (
                  <span className="ml-2 text-xs text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">
                    {result.branch}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-400">{result.browser}</td>
              <td className="px-4 py-3 text-slate-400">{formatDuration(result.duration)}</td>
              <td className="px-4 py-3">
                {(result.retries ?? 0) > 0 ? (
                  <span className="text-yellow-400 text-xs bg-yellow-400/10 px-1.5 py-0.5 rounded">
                    {result.retries} retries
                  </span>
                ) : (
                  <span className="text-slate-600">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {result.traceUrl && (
                  <button
                    onClick={() => onViewTrace?.(result.id, result.traceUrl!)}
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
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
