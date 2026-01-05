/**
 * ExecutionReport - Allure-style report for completed executions
 *
 * Shows summary bar, stats, and scenario list with screenshots and trace viewer links
 */
import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  SkipForward,
  Clock,
  Download,
  RotateCcw,
} from 'lucide-react';
import { ScenarioRow } from './ScenarioRow';
import type { ExecutionWithDetails, ExecutionScenario } from './ExecutionDashboard';

interface ExecutionReportProps {
  execution: ExecutionWithDetails;
  scenarios: ExecutionScenario[];
  onViewTrace: (traceUrl: string, testName: string) => void;
}

const formatDuration = (ms?: number): string => {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
};

export const ExecutionReport: React.FC<ExecutionReportProps> = ({
  execution,
  scenarios,
  onViewTrace,
}) => {
  const [showAllScenarios, setShowAllScenarios] = useState(false);

  const passed = execution.passedCount;
  const failed = execution.failedCount;
  const skipped = execution.skippedCount;
  const total = scenarios.length || execution.stepCount;

  const passPercent = total > 0 ? (passed / total) * 100 : 0;
  const failPercent = total > 0 ? (failed / total) * 100 : 0;
  const skipPercent = total > 0 ? (skipped / total) * 100 : 0;

  // Show failed scenarios first, then others
  const sortedScenarios = [...scenarios].sort((a, b) => {
    const statusOrder = { failed: 0, passed: 1, skipped: 2, running: 3, pending: 4 };
    return (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
  });

  const displayScenarios = showAllScenarios ? sortedScenarios : sortedScenarios.slice(0, 5);
  const hasMoreScenarios = sortedScenarios.length > 5;

  return (
    <div className="p-4 space-y-4">
      {/* Summary Bar */}
      <div className="space-y-2">
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden flex">
          {passPercent > 0 && (
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${passPercent}%` }}
            />
          )}
          {failPercent > 0 && (
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${failPercent}%` }}
            />
          )}
          {skipPercent > 0 && (
            <div
              className="h-full bg-yellow-500 transition-all"
              style={{ width: `${skipPercent}%` }}
            />
          )}
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>{passed} Passed</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-400">
            <XCircle className="w-4 h-4" />
            <span>{failed} Failed</span>
          </div>
          <div className="flex items-center gap-1.5 text-yellow-400">
            <SkipForward className="w-4 h-4" />
            <span>{skipped} Skipped</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 ml-auto">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(execution.duration)}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors">
          <Download className="w-3.5 h-3.5" />
          Download Report
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors">
          <RotateCcw className="w-3.5 h-3.5" />
          Re-run
        </button>
      </div>

      {/* Scenario List */}
      {scenarios.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Scenarios ({scenarios.length})
          </h4>
          <div className="space-y-2">
            {displayScenarios.map((scenario) => (
              <ScenarioRow
                key={scenario.id}
                scenario={scenario}
                onViewTrace={() => {
                  console.log('ExecutionReport onViewTrace called, traceUrl:', scenario.traceUrl);
                  if (scenario.traceUrl) {
                    onViewTrace(scenario.traceUrl, scenario.name);
                  }
                }}
              />
            ))}
          </div>

          {/* Show More Button */}
          {hasMoreScenarios && (
            <button
              onClick={() => setShowAllScenarios(!showAllScenarios)}
              className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              {showAllScenarios ? 'Show Less' : `Show ${sortedScenarios.length - 5} More Scenarios`}
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-slate-500 text-sm">
          No scenario details available
        </div>
      )}
    </div>
  );
};

export default ExecutionReport;
