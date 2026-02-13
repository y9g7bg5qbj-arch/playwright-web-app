import { useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock3,
  Download,
  FileBarChart2,
  Filter,
  Loader2,
  RefreshCw,
  SkipForward,
  Timer,
  XCircle,
} from 'lucide-react';

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

type StatusMeta = {
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  softBgClass: string;
  label: string;
};

const statusConfig: Record<string, StatusMeta> = {
  passed: {
    icon: CheckCircle2,
    colorClass: 'text-status-success',
    softBgClass: 'bg-status-success/12',
    label: 'Passed',
  },
  failed: {
    icon: XCircle,
    colorClass: 'text-status-danger',
    softBgClass: 'bg-status-danger/12',
    label: 'Failed',
  },
  running: {
    icon: Loader2,
    colorClass: 'text-status-info',
    softBgClass: 'bg-status-info/12',
    label: 'Running',
  },
  queued: {
    icon: Clock3,
    colorClass: 'text-status-warning',
    softBgClass: 'bg-status-warning/12',
    label: 'Queued',
  },
  cancelled: {
    icon: Ban,
    colorClass: 'text-text-secondary',
    softBgClass: 'bg-white/[0.06]',
    label: 'Cancelled',
  },
  pending: {
    icon: CircleDot,
    colorClass: 'text-text-muted',
    softBgClass: 'bg-white/[0.06]',
    label: 'Pending',
  },
  skipped: {
    icon: SkipForward,
    colorClass: 'text-text-secondary',
    softBgClass: 'bg-white/[0.06]',
    label: 'Skipped',
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

  const runningCount = executions.filter((e) => e.status === 'running' || e.status === 'queued').length;
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

  const renderStatusIcon = (status: string, className: string = 'h-4 w-4') => {
    const cfg = statusConfig[status] || statusConfig.pending;
    const Icon = cfg.icon;
    const spin = status === 'running';
    return <Icon className={`${className} ${cfg.colorClass} ${spin ? 'animate-spin' : ''}`} />;
  };

  return (
    <section className="h-full flex flex-col bg-dark-canvas">
      <header className="h-10 px-3 flex items-center justify-between border-b border-border-default bg-dark-bg shrink-0">
        <div className="flex items-center gap-2">
          <FileBarChart2 className="h-4 w-4 text-status-info" />
          <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">Execution Results</span>
          <span className="text-[10px] text-text-secondary bg-dark-elevated px-1.5 py-0.5 rounded-full border border-border-default">
            {executions.length}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onRefresh}
            className="h-7 w-7 inline-flex items-center justify-center rounded text-text-secondary hover:text-text-primary hover:bg-white/[0.05] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            className="h-7 w-7 inline-flex items-center justify-center rounded text-text-secondary hover:text-text-primary hover:bg-white/[0.05] transition-colors"
            title="Filter"
          >
            <Filter className="h-3.5 w-3.5" />
          </button>
          <button
            className="h-7 w-7 inline-flex items-center justify-center rounded text-text-secondary hover:text-text-primary hover:bg-white/[0.05] transition-colors"
            title="Export"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="px-3 py-2 border-b border-border-default bg-dark-bg/40">
        <div className="flex gap-1">
          {[
            { id: 'all' as FilterTab, label: 'All', count: executions.length },
            { id: 'running' as FilterTab, label: 'Running', count: runningCount },
            { id: 'failed' as FilterTab, label: 'Failed', count: failedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors border ${
                activeTab === tab.id
                  ? 'bg-dark-elevated border-border-emphasis text-text-primary'
                  : 'bg-transparent border-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
              }`}
            >
              {tab.label}
              <span className="min-w-[16px] h-4 inline-flex items-center justify-center rounded-full text-[10px] font-semibold bg-black/25 text-text-secondary border border-border-default">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredExecutions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary">
            <FileBarChart2 className="h-9 w-9 mb-3 opacity-35" />
            <p className="text-xs font-medium">No execution results found</p>
            <p className="text-[11px] mt-1 text-text-muted">Run a test to see results here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredExecutions.map((execution) => {
              const isExpanded = expandedExecutions.has(execution.id);
              const cfg = statusConfig[execution.status] || statusConfig.pending;
              const passRate = execution.totalTests > 0 ? (execution.passedTests / execution.totalTests) * 100 : 0;

              return (
                <article
                  key={execution.id}
                  className="bg-dark-card rounded-lg border border-border-default overflow-hidden hover:border-border-emphasis transition-colors"
                >
                  <button
                    className="w-full px-3 py-2.5 text-left hover:bg-white/[0.03] transition-colors"
                    onClick={() => toggleExecution(execution.id)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-text-secondary" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-text-secondary" />
                      )}

                      {renderStatusIcon(execution.status, 'h-4.5 w-4.5')}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-text-primary">Run #{execution.runNumber}</span>
                          <span className="text-[10px] text-text-secondary bg-black/25 border border-border-default px-1.5 py-0.5 rounded">
                            {execution.config}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${cfg.softBgClass} ${cfg.colorClass} border-current/30`}>
                            {cfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-muted">
                          <span>{formatTimeAgo(execution.startedAt)}</span>
                          <span>·</span>
                          <span>{formatDuration(execution.duration)}</span>
                          <span>·</span>
                          <span>{execution.environment}</span>
                          <span>·</span>
                          <span>{execution.triggeredBy}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pl-2">
                        <div className="text-[10px] flex items-center gap-1.5">
                          <span className="text-status-success inline-flex items-center gap-0.5">
                            <CheckCircle2 className="h-3 w-3" /> {execution.passedTests}
                          </span>
                          <span className="text-text-muted">/</span>
                          <span className={`${execution.failedTests > 0 ? 'text-status-danger' : 'text-text-muted'} inline-flex items-center gap-0.5`}>
                            <XCircle className="h-3 w-3" /> {execution.failedTests}
                          </span>
                        </div>
                        <div className="w-16 h-1.5 rounded-full bg-dark-elevated overflow-hidden border border-border-default">
                          <div
                            className={`h-full ${passRate === 100 ? 'bg-status-success' : passRate > 0 ? 'bg-status-warning' : 'bg-text-muted'}`}
                            style={{ width: `${passRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 space-y-2 bg-black/10 border-t border-border-default">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Scenarios</span>
                        {execution.allureReportUrl && (
                          <button
                            onClick={() => onViewAllure(execution.allureReportUrl!)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-status-info bg-status-info/12 border border-status-info/30 hover:bg-status-info/20 transition-colors"
                          >
                            <FileBarChart2 className="h-3 w-3" /> Report
                          </button>
                        )}
                      </div>

                      {execution.scenarios.map((scenario) => {
                        const isScenarioExpanded = expandedScenarios.has(scenario.id);
                        const scenarioPassRate = scenario.steps.length > 0
                          ? (scenario.steps.filter((s) => s.status === 'passed').length / scenario.steps.length) * 100
                          : 0;

                        return (
                          <div key={scenario.id} className="bg-dark-card rounded-md border border-border-default overflow-hidden">
                            <button
                              className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-white/[0.03] transition-colors"
                              onClick={() => toggleScenario(scenario.id)}
                            >
                              {isScenarioExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-text-secondary" />
                              )}
                              {renderStatusIcon(scenario.status, 'h-3.5 w-3.5')}
                              <span className="text-[11px] font-medium text-text-primary flex-1 truncate text-left">{scenario.name}</span>
                              <span className="text-[10px] text-text-muted font-mono">{formatDuration(scenario.duration)}</span>
                              <div className="w-10 h-1 rounded-full bg-dark-elevated overflow-hidden border border-border-default">
                                <div
                                  className={`h-full ${scenario.status === 'passed' ? 'bg-status-success' : scenario.status === 'failed' ? 'bg-status-danger' : 'bg-status-info'}`}
                                  style={{ width: `${scenarioPassRate}%` }}
                                />
                              </div>
                            </button>

                            {isScenarioExpanded && (
                              <div className="px-2.5 pb-2.5 pt-1 space-y-2 border-t border-border-default bg-black/15">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] uppercase tracking-wide text-text-muted">Steps</span>
                                  {scenario.traceUrl && (
                                    <button
                                      onClick={() => onViewTrace(scenario.traceUrl!, scenario.name)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-accent-purple bg-accent-purple/12 border border-accent-purple/30 hover:bg-accent-purple/20 transition-colors"
                                    >
                                      <Timer className="h-3 w-3" /> View Trace
                                    </button>
                                  )}
                                </div>

                                <div className="space-y-1">
                                  {scenario.steps.map((step) => {
                                    const failed = step.status === 'failed';
                                    const stepCfg = statusConfig[step.status] || statusConfig.pending;

                                    if (!failed) {
                                      return (
                                        <div
                                          key={step.id}
                                          className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-white/[0.04] transition-colors ${step.status === 'skipped' ? 'opacity-50' : ''}`}
                                        >
                                          {renderStatusIcon(step.status, 'h-3 w-3')}
                                          <span className="text-[10px] text-text-primary flex-1 truncate">{step.name}</span>
                                          <span className="text-[9px] text-text-muted font-mono">{formatDuration(step.duration)}</span>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div key={step.id} className="rounded-md bg-status-danger/8 border border-status-danger/30 overflow-hidden">
                                        <div className="flex items-center gap-2 px-2 py-1.5 bg-status-danger/12 border-b border-status-danger/25">
                                          <AlertTriangle className="h-3.5 w-3.5 text-status-danger" />
                                          <span className="text-[10px] font-semibold text-text-primary flex-1 truncate">{step.name}</span>
                                          <span className={`text-[9px] font-mono ${stepCfg.colorClass}`}>{formatDuration(step.duration)}</span>
                                        </div>
                                        <div className="p-2 space-y-2">
                                          {step.error && (
                                            <div className="p-2 rounded bg-dark-card border border-status-danger/30 text-[10px] font-mono text-red-200">
                                              <span className="font-semibold">Error:</span> {step.error}
                                            </div>
                                          )}
                                          {step.screenshotUrl && (
                                            <div className="relative aspect-video bg-black rounded border border-border-default overflow-hidden max-w-[220px]">
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
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
