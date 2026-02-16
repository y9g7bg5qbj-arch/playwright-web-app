import React from 'react';
import { RefreshCw, FileBarChart2 } from 'lucide-react';
import { IconButton, PanelHeader, Tabs, TabsList, TabsTrigger } from '@/components/ui';
import type { ExecutionSource } from './executionReportTypes';
import { useExecutionReportData } from './useExecutionReportData';
import { RunsListFullWidth } from './RunsListFullWidth';

interface ExecutionReportViewProps {
  initialSelectedRunId?: string | null;
  applicationId?: string;
}

export const ExecutionReportView: React.FC<ExecutionReportViewProps> = ({
  initialSelectedRunId,
  applicationId,
}) => {
  const data = useExecutionReportData({ initialSelectedRunId, applicationId });

  return (
    <div className="h-full min-h-0 flex flex-col bg-dark-canvas text-text-primary">
      <PanelHeader
        className="h-10 px-3"
        icon={<FileBarChart2 className="h-4 w-4 text-status-info" />}
        title="Execution Results"
        meta={
          <span className="text-xs font-medium text-text-secondary">
            {data.summary.total} runs · {data.summary.passed} passed · {data.summary.failed} failed
            {data.summary.active > 0 ? ` · ${data.summary.active} active` : ''}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Tabs value={data.activeSource} onValueChange={(v) => data.setActiveSource(v as ExecutionSource)} variant="chip" size="sm">
              <TabsList>
                <TabsTrigger value="local">Local</TabsTrigger>
                <TabsTrigger value="github">GitHub Actions</TabsTrigger>
              </TabsList>
            </Tabs>
            <IconButton
              icon={<RefreshCw className={`h-3.5 w-3.5 ${data.isRefreshing ? 'animate-spin' : ''}`} />}
              tooltip="Refresh"
              variant="outlined"
              onClick={data.handleRefresh}
            />
          </div>
        }
      />

      {data.message && (
        <div
          className={`shrink-0 border-b px-3 py-2 text-xs font-medium ${
            data.message.type === 'error'
              ? 'border-danger-border bg-surface-danger text-danger-bright'
              : 'border-info-border bg-surface-info text-info-bright'
          }`}
        >
          {data.message.text}
        </div>
      )}

      <RunsListFullWidth
        runSearch={data.runSearch}
        onRunSearchChange={data.setRunSearch}
        runFilter={data.runFilter}
        onRunFilterChange={data.setRunFilter}
        projectFilter={data.projectFilter}
        onProjectFilterChange={data.setProjectFilter}
        projectFilterOptions={data.projectFilterOptions}
        filteredRuns={data.filteredRuns}
        runNumbers={data.runNumbers}
        onOpenAllure={data.openAllureForRun}
        preparingAllureRunId={data.preparingAllureRunId}
        onDeleteExecution={data.handleDeleteExecution}
      />
    </div>
  );
};

export default ExecutionReportView;
