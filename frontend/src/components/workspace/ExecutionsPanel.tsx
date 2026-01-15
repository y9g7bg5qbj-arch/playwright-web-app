import { useState } from 'react';

// Execution types
export interface ExecutionStep {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'running' | 'pending' | 'skipped';
  duration?: number;
  error?: string;
  logs?: string[];
  screenshotUrl?: string;
}

export interface ExecutionScenario {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'running' | 'pending' | 'skipped';
  duration?: number;
  traceUrl?: string;
  steps: ExecutionStep[];
}

export interface Execution {
  id: string;
  runNumber: number;
  status: 'passed' | 'failed' | 'running' | 'queued' | 'cancelled';
  config: string;
  environment: string;
  triggeredBy: string;
  startedAt: string;
  duration?: number;
  allureReportUrl?: string;
  scenarios: ExecutionScenario[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
}

export interface ExecutionsPanelProps {
  executions: Execution[];
  onViewAllure: (url: string) => void;
  onViewTrace: (url: string, scenarioName: string) => void;
  onRefresh: () => void;
}

type FilterTab = 'all' | 'running' | 'failed';

const statusConfig: Record<string, { icon: string; color: string; bgColor: string; label: string }> = {
  passed: {
    icon: 'task_alt',
    color: '#3fb950',
    bgColor: 'bg-[#238636]/10',
    label: 'Passed'
  },
  failed: {
    icon: 'error',
    color: '#f85149',
    bgColor: 'bg-[#da3633]/10',
    label: 'Failed'
  },
  running: {
    icon: 'sync',
    color: '#58a6ff',
    bgColor: 'bg-[#2479f9]/10',
    label: 'Running'
  },
  queued: {
    icon: 'schedule',
    color: '#d29922',
    bgColor: 'bg-[#d29922]/10',
    label: 'Queued'
  },
  cancelled: {
    icon: 'cancel',
    color: '#8b949e',
    bgColor: 'bg-[#8b949e]/10',
    label: 'Cancelled'
  },
  pending: {
    icon: 'radio_button_unchecked',
    color: '#6e7681',
    bgColor: 'bg-[#6e7681]/10',
    label: 'Pending'
  },
  skipped: {
    icon: 'skip_next',
    color: '#6e7681',
    bgColor: 'bg-[#6e7681]/10',
    label: 'Skipped'
  },
};


export function ExecutionsPanel({
  executions,
  onViewAllure,
  onViewTrace,
  onRefresh,
}: ExecutionsPanelProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [expandedExecutions, setExpandedExecutions] = useState<Set<string>>(new Set());
  const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(new Set());

  const toggleExecution = (id: string) => {
    setExpandedExecutions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleScenario = (id: string) => {
    setExpandedScenarios((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredExecutions = executions.filter((e) => {
    if (activeTab === 'running') return e.status === 'running' || e.status === 'queued';
    if (activeTab === 'failed') return e.status === 'failed';
    return true;
  });

  const runningCount = executions.filter(
    (e) => e.status === 'running' || e.status === 'queued'
  ).length;
  const failedCount = executions.filter((e) => e.status === 'failed').length;

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="h-full flex flex-col bg-[#161b22]">
      {/* Header */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-[#30363d]/50 bg-[#0d1117] shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-[#3fb950]">rocket_launch</span>
          <span className="text-[12px] font-semibold text-[#c9d1d9]">
            Test Runs
          </span>
          <span className="text-[10px] text-[#6e7681] bg-[#21262d] px-1.5 py-0.5 rounded-full">
            {executions.length}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onRefresh}
            className="text-[#6e7681] hover:text-white hover:bg-[#21262d] text-[10px] flex items-center gap-1 px-2 py-1 rounded transition-all"
          >
            <span className="material-symbols-outlined text-[14px]">refresh</span>
          </button>
          <button className="text-[#6e7681] hover:text-white hover:bg-[#21262d] text-[10px] flex items-center gap-1 px-2 py-1 rounded transition-all">
            <span className="material-symbols-outlined text-[14px]">filter_list</span>
          </button>
          <button className="text-[#6e7681] hover:text-white hover:bg-[#21262d] text-[10px] flex items-center gap-1 px-2 py-1 rounded transition-all">
            <span className="material-symbols-outlined text-[14px]">download</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-3 py-2 border-b border-[#30363d]/50 bg-[#0d1117]/50">
        <div className="flex gap-1">
          {[
            { id: 'all' as FilterTab, icon: 'list', label: 'All', count: executions.length, color: '#8b949e' },
            { id: 'running' as FilterTab, icon: 'sync', label: 'Running', count: runningCount, color: '#58a6ff' },
            { id: 'failed' as FilterTab, icon: 'error', label: 'Failed', count: failedCount, color: '#f85149' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#21262d] text-white border border-[#30363d]'
                  : 'text-[#6e7681] hover:text-[#c9d1d9] hover:bg-[#21262d]/50'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[12px] ${tab.id === 'running' && activeTab === tab.id ? 'animate-spin' : ''}`}
                style={{ color: activeTab === tab.id ? tab.color : undefined }}
              >
                {tab.icon}
              </span>
              {tab.label}
              <span
                className="min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-bold"
                style={{
                  backgroundColor: activeTab === tab.id ? `${tab.color}20` : '#21262d',
                  color: activeTab === tab.id ? tab.color : '#6e7681'
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Executions List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredExecutions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#6e7681]">
            <span className="material-symbols-outlined text-[40px] mb-3 opacity-30">
              rocket_launch
            </span>
            <p className="text-[11px] font-medium">No test runs found</p>
            <p className="text-[10px] mt-1 opacity-70">Run a test to see results here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredExecutions.map((execution) => {
              const isExpanded = expandedExecutions.has(execution.id);
              const status = statusConfig[execution.status] || statusConfig.pending;
              const passRate = execution.totalTests > 0 ? (execution.passedTests / execution.totalTests) * 100 : 0;

              return (
                <div
                  key={execution.id}
                  className="bg-[#161b22] rounded-lg border border-[#30363d]/70 overflow-hidden hover:border-[#30363d] transition-colors"
                >
                  {/* Execution Header */}
                  <div
                    className="px-3 py-2.5 cursor-pointer hover:bg-[#1c2128]/50 transition-colors"
                    onClick={() => toggleExecution(execution.id)}
                  >
                    <div className="flex items-center gap-2">
                      {/* Expand Icon */}
                      <span className="material-symbols-outlined text-[16px] text-[#6e7681]">
                        {isExpanded ? 'expand_more' : 'chevron_right'}
                      </span>

                      {/* Status Icon */}
                      <span
                        className={`material-symbols-outlined text-[18px] ${execution.status === 'running' ? 'animate-spin' : 'icon-filled'}`}
                        style={{ color: status.color }}
                      >
                        {status.icon}
                      </span>

                      {/* Run Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-[#c9d1d9]">
                            Run #{execution.runNumber}
                          </span>
                          <span className="text-[9px] text-[#6e7681] bg-[#21262d] px-1.5 py-0.5 rounded">
                            {execution.config}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[9px] text-[#6e7681]">
                          <span>{formatTimeAgo(execution.startedAt)}</span>
                          <span className="opacity-50">·</span>
                          <span>{formatDuration(execution.duration)}</span>
                          <span className="opacity-50">·</span>
                          <span>{execution.environment}</span>
                        </div>
                      </div>

                      {/* Stats Mini */}
                      <div className="flex items-center gap-3">
                        {/* Pass/Fail counts */}
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="flex items-center gap-0.5" style={{ color: statusConfig.passed.color }}>
                            <span className="material-symbols-outlined text-[12px]">check</span>
                            {execution.passedTests}
                          </span>
                          <span className="text-[#6e7681]">/</span>
                          <span className="flex items-center gap-0.5" style={{ color: execution.failedTests > 0 ? statusConfig.failed.color : '#6e7681' }}>
                            <span className="material-symbols-outlined text-[12px]">close</span>
                            {execution.failedTests}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-16 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${passRate}%`,
                              backgroundColor: passRate === 100 ? statusConfig.passed.color : passRate > 0 ? statusConfig.failed.color : '#6e7681'
                            }}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      {execution.allureReportUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewAllure(execution.allureReportUrl!);
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-[9px] font-medium text-[#58a6ff] bg-[#58a6ff]/10 hover:bg-[#58a6ff]/20 border border-[#58a6ff]/20 rounded transition-all"
                        >
                          <span className="material-symbols-outlined text-[12px]">assessment</span>
                          Report
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Scenarios */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 space-y-2 bg-[#0d1117]/30 border-t border-[#30363d]/30">
                      {execution.scenarios.map((scenario) => {
                        const isScenarioExpanded = expandedScenarios.has(scenario.id);
                        const scenarioStatus = statusConfig[scenario.status] || statusConfig.pending;
                        const scenarioPassRate = scenario.steps.length > 0
                          ? (scenario.steps.filter((s) => s.status === 'passed').length / scenario.steps.length) * 100
                          : 0;

                        return (
                          <div
                            key={scenario.id}
                            className="bg-[#161b22] rounded-md border border-[#30363d]/50 overflow-hidden"
                          >
                            {/* Scenario Header */}
                            <div
                              className="flex items-center gap-2 px-2.5 py-2 cursor-pointer hover:bg-[#1c2128]/50 transition-colors"
                              onClick={() => toggleScenario(scenario.id)}
                            >
                              <span className="material-symbols-outlined text-[14px] text-[#6e7681]">
                                {isScenarioExpanded ? 'expand_more' : 'chevron_right'}
                              </span>
                              <span
                                className={`material-symbols-outlined text-[14px] ${scenario.status === 'running' ? 'animate-spin' : 'icon-filled'}`}
                                style={{ color: scenarioStatus.color }}
                              >
                                {scenarioStatus.icon}
                              </span>
                              <span className="text-[11px] font-medium text-[#c9d1d9] flex-1 truncate">
                                {scenario.name}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-[#6e7681] font-mono">
                                  {formatDuration(scenario.duration)}
                                </span>
                                <div className="flex items-center gap-0.5 text-[9px]">
                                  <span style={{ color: statusConfig.passed.color }}>
                                    {scenario.steps.filter((s) => s.status === 'passed').length}
                                  </span>
                                  <span className="text-[#6e7681]">/</span>
                                  <span className="text-[#6e7681]">{scenario.steps.length}</span>
                                </div>
                                <div className="w-10 h-1 bg-[#21262d] rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${scenarioPassRate}%`,
                                      backgroundColor: scenarioStatus.color
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Scenario Expanded Content */}
                            {isScenarioExpanded && (
                              <div className="px-2.5 pb-2.5 pt-1 space-y-2 bg-[#0d1117]/50 border-t border-[#30363d]/30">
                                {/* Trace Viewer Button */}
                                {scenario.traceUrl && (
                                  <div className="flex justify-start mb-2">
                                    <button
                                      onClick={() => onViewTrace(scenario.traceUrl!, scenario.name)}
                                      className="flex items-center gap-1 px-2 py-1 text-[9px] font-medium text-[#a371f7] bg-[#a371f7]/10 border border-[#a371f7]/20 hover:bg-[#a371f7]/20 rounded transition-all"
                                    >
                                      <span className="material-symbols-outlined text-[12px]">
                                        timeline
                                      </span>
                                      View Trace
                                    </button>
                                  </div>
                                )}

                                {/* Steps */}
                                <div className="space-y-1">
                                  {scenario.steps.map((step) => {
                                    const stepStatus = statusConfig[step.status] || statusConfig.pending;
                                    if (step.status !== 'failed') {
                                      return (
                                        <div
                                          key={step.id}
                                          className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-[#21262d]/50 transition-colors ${
                                            step.status === 'skipped' ? 'opacity-40' : ''
                                          }`}
                                        >
                                          <span
                                            className={`material-symbols-outlined text-[12px] ${step.status === 'running' ? 'animate-spin' : ''}`}
                                            style={{ color: stepStatus.color }}
                                          >
                                            {stepStatus.icon}
                                          </span>
                                          <span className="text-[10px] text-[#c9d1d9] flex-1 truncate">{step.name}</span>
                                          <span className="text-[9px] text-[#6e7681] font-mono">
                                            {formatDuration(step.duration)}
                                          </span>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div key={step.id} className="rounded-md bg-[#f85149]/5 border border-[#f85149]/30 overflow-hidden">
                                        <div className="flex items-center gap-2 px-2 py-1.5 bg-[#f85149]/10 border-b border-[#f85149]/20">
                                          <span className="material-symbols-outlined text-[14px] icon-filled" style={{ color: statusConfig.failed.color }}>
                                            {statusConfig.failed.icon}
                                          </span>
                                          <span className="text-[10px] font-semibold text-[#c9d1d9] flex-1 truncate">{step.name}</span>
                                          <span className="text-[9px] font-mono" style={{ color: statusConfig.failed.color }}>
                                            {formatDuration(step.duration)}
                                          </span>
                                        </div>
                                        <div className="p-2 space-y-2">
                                          {step.error && (
                                            <div className="p-2 rounded bg-[#161b22] border border-[#da3633]/30 text-[10px] font-mono text-red-300">
                                              <span className="font-bold">Error:</span> {step.error}
                                            </div>
                                          )}
                                          {step.screenshotUrl && (
                                            <div className="relative aspect-video bg-black rounded border border-[#30363d] overflow-hidden max-w-[200px]">
                                              <img src={step.screenshotUrl} alt="Failure" className="w-full h-full object-cover" />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
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
            })}
          </div>
        )}
      </div>
    </div>
  );
}
