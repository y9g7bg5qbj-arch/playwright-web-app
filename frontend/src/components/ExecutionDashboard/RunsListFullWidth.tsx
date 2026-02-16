import React, { useState } from 'react';
import { ExternalLink, Trash2, FileBarChart2, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { EmptyState, Tabs, TabsList, TabsTrigger } from '@/components/ui';
import type { RunData, RunFilter } from './executionReportTypes';
import { getRunStatusBadge } from './executionReportUtils';

interface RunsListFullWidthProps {
  runSearch: string;
  onRunSearchChange: (value: string) => void;
  runFilter: RunFilter;
  onRunFilterChange: (value: RunFilter) => void;
  projectFilter: string;
  onProjectFilterChange: (value: string) => void;
  projectFilterOptions: Array<{ value: string; label: string; count: number }>;
  filteredRuns: RunData[];
  runNumbers: Map<string, string>;
  onOpenAllure: (run: RunData) => void;
  preparingAllureRunId: string | null;
  onDeleteExecution: (runId: string) => void;
}

const statusBadgeClass: Record<string, string> = {
  passed: 'border-status-success/30 bg-status-success/12 text-status-success',
  failed: 'border-status-danger/30 bg-status-danger/12 text-status-danger',
  running: 'border-status-info/30 bg-status-info/12 text-status-info',
  pending: 'border-border-default bg-surface-disabled text-text-secondary',
  skipped: 'border-border-default bg-surface-disabled text-text-muted',
};

const reportButtonClass = (isPreparing: boolean): string =>
  [
    'inline-flex min-w-[108px] items-center justify-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35 focus-visible:ring-offset-0',
    isPreparing
      ? 'cursor-wait border-border-default bg-dark-elevated/70 text-text-secondary'
      : 'border-info-border bg-surface-info text-info-bright shadow-sm shadow-black/25 hover:border-status-info/50 hover:bg-status-info/20',
  ].join(' ');

const actionIconButtonClass =
  'inline-flex h-6 w-6 items-center justify-center rounded border border-border-default bg-dark-elevated/35 text-text-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:ring-offset-0';

export const RunsListFullWidth: React.FC<RunsListFullWidthProps> = ({
  runSearch,
  onRunSearchChange,
  runFilter,
  onRunFilterChange,
  projectFilter,
  onProjectFilterChange,
  projectFilterOptions,
  filteredRuns,
  runNumbers,
  onOpenAllure,
  preparingAllureRunId,
  onDeleteExecution,
}) => {
  const [expandedMatrixIds, setExpandedMatrixIds] = useState<Set<string>>(new Set());

  const toggleMatrix = (id: string) => {
    setExpandedMatrixIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 px-3 py-2 flex items-center gap-3 border-b border-border-default">
        <input
          value={runSearch}
          onChange={(e) => onRunSearchChange(e.target.value)}
          placeholder="Search executions..."
          className="w-64 h-7 px-2 rounded border border-border-default bg-dark-canvas text-xs text-text-primary placeholder-text-muted outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
        />
        <Tabs value={runFilter} onValueChange={(v) => onRunFilterChange(v as RunFilter)} variant="chip" size="sm">
          <TabsList>
            <TabsTrigger value="all">all</TabsTrigger>
            <TabsTrigger value="active">active</TabsTrigger>
            <TabsTrigger value="failed">failed</TabsTrigger>
            <TabsTrigger value="unstable">unstable</TabsTrigger>
            <TabsTrigger value="passed">passed</TabsTrigger>
            <TabsTrigger value="no-tests">no tests</TabsTrigger>
          </TabsList>
        </Tabs>
        <select
          value={projectFilter}
          onChange={(event) => onProjectFilterChange(event.target.value)}
          className="h-7 min-w-[180px] rounded border border-border-default bg-dark-canvas px-2 text-xs text-text-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
          aria-label="Filter by project"
        >
          {projectFilterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.count})
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-dark-card border-b border-border-default z-10">
            <tr className="text-left text-xs uppercase tracking-wide text-text-muted">
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Execution</th>
              <th className="py-2 px-3 font-medium">Date / Time</th>
              <th className="py-2 px-3 font-medium">Duration</th>
              <th className="py-2 px-3 font-medium">Passed</th>
              <th className="py-2 px-3 font-medium">Failed</th>
              <th className="py-2 px-3 font-medium">Skipped</th>
              <th className="py-2 px-3 font-medium">Project</th>
              <th className="py-2 px-3 font-medium">Trigger</th>
              <th className="py-2 px-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRuns.map((run) => {
              const badge = getRunStatusBadge(run);
              const executionLabel = runNumbers.get(run.id) || run.id;
              const isMatrix = run.isMatrixParent && run.matrixChildren && run.matrixChildren.length > 0;
              const isExpanded = expandedMatrixIds.has(run.id);
              const canOpenReport =
                run.state === 'completed'
                && (
                  run.source === 'github'
                  || run.metrics.total > 0
                  || (isMatrix && run.matrixChildren && run.matrixChildren.length > 0)
                );

              return (
                <React.Fragment key={run.id}>
                  <tr className="border-b border-border-default bg-dark-card/35 transition-colors hover:bg-surface-hover">
                    <td className="py-2 px-3">
                      <span className={`text-3xs px-1.5 py-0.5 rounded border font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        {isMatrix && (
                          <button
                            type="button"
                            onClick={() => toggleMatrix(run.id)}
                            className="p-0.5 rounded text-text-muted hover:text-text-primary transition-colors"
                          >
                            {isExpanded
                              ? <ChevronDown className="h-3.5 w-3.5" />
                              : <ChevronRight className="h-3.5 w-3.5" />
                            }
                          </button>
                        )}
                        <span className="text-sm font-semibold text-text-primary">{executionLabel}</span>
                        {run.title && run.title !== 'Local Execution' && run.title !== 'GitHub Run' && (
                          <span className="ml-2 text-xs text-text-secondary">{run.title}</span>
                        )}
                        {isMatrix && (
                          <span className="ml-1 text-3xs text-text-muted">
                            ({run.matrixChildren!.length} children)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-text-secondary">
                      {run.dateLabel} {run.timeLabel}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-text-secondary">{run.durationLabel}</td>
                    <td className="px-3 py-2 font-mono text-xs text-status-success">{run.metrics.passed}</td>
                    <td className="px-3 py-2 font-mono text-xs text-status-danger">{run.metrics.failed}</td>
                    <td className="px-3 py-2 font-mono text-xs text-text-muted">{run.metrics.skipped}</td>
                    <td className="px-3 py-2 text-xs text-text-secondary">{run.projectName}</td>
                    <td className="px-3 py-2 text-xs text-text-secondary">{run.triggerType}</td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canOpenReport && (
                          <button
                            type="button"
                            onClick={() => onOpenAllure(run)}
                            disabled={preparingAllureRunId === run.id}
                            className={reportButtonClass(preparingAllureRunId === run.id)}
                            title={preparingAllureRunId === run.id ? 'Preparing report' : 'Open execution report'}
                          >
                            {preparingAllureRunId === run.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <FileBarChart2 className="h-3 w-3" />
                            }
                            {preparingAllureRunId === run.id ? 'Preparing' : 'View Report'}
                          </button>
                        )}
                        {run.source === 'github' && run.allureUrl && (
                          <a
                            href={run.allureUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${actionIconButtonClass} hover:border-info-border hover:bg-surface-info hover:text-info-bright`}
                            title="Open on GitHub"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {run.source === 'local' && run.state !== 'running' && run.state !== 'queued' && (
                          <button
                            type="button"
                            onClick={() => onDeleteExecution(run.id)}
                            className={`${actionIconButtonClass} hover:border-danger-border hover:bg-surface-danger hover:text-danger-label`}
                            title="Delete execution"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {isMatrix && isExpanded && run.matrixChildren!.map((child) => (
                    <tr key={child.id} className="border-b border-border-default/50 bg-dark-elevated/30">
                      <td className="py-1.5 px-3 pl-8">
                        <span className={`text-3xs px-1.5 py-0.5 rounded border font-medium ${statusBadgeClass[child.status] || statusBadgeClass.pending}`}>
                          {child.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 pl-10">
                        <span className="font-mono text-text-secondary text-3xs">{child.label}</span>
                      </td>
                      <td className="py-1.5 px-3" />
                      <td className="py-1.5 px-3 font-mono text-text-secondary">{child.durationLabel}</td>
                      <td className="py-1.5 px-3 text-status-success font-mono">{child.metrics.passed}</td>
                      <td className="py-1.5 px-3 font-mono text-status-danger">{child.metrics.failed}</td>
                      <td className="py-1.5 px-3 text-text-muted font-mono">{child.metrics.skipped}</td>
                      <td className="py-1.5 px-3 text-text-muted text-3xs">{run.projectName}</td>
                      <td className="py-1.5 px-3 text-text-muted text-3xs">Matrix</td>
                      <td className="py-1.5 px-3" />
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {filteredRuns.length === 0 && (
          <EmptyState title="No executions found" compact className="py-8" />
        )}
      </div>
    </div>
  );
};
