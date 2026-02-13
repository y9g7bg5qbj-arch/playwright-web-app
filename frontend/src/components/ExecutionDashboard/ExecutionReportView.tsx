import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGitHubExecutionStore, GitHubExecution } from '@/store/useGitHubExecutionStore';
import { useLocalExecutionStore } from '@/store/useLocalExecutionStore';
import type { ExecutionWithDetails } from './ExecutionDashboard';
import { humanizePlaywrightError } from '@/utils/playwrightParser';
import { ListOrdered, TestTube2 } from 'lucide-react';

interface ExecutionReportViewProps {
  onJumpToEditor?: (line: number) => void;
  onViewTrace?: (traceUrl: string, testName: string) => void;
  onOpenAllure?: (executionId: string) => void;
}

type ExecutionSource = 'local' | 'github';
type RunState = 'queued' | 'running' | 'completed' | 'canceled' | 'error';
type RunOutcome = 'passed' | 'unstable' | 'failed' | 'no-tests' | null;
type RunFilter = 'all' | 'active' | 'passed' | 'unstable' | 'failed' | 'no-tests';
type ScenarioFilter = 'all' | 'passed' | 'failed' | 'running' | 'skipped' | 'flaky';
type DetailTab = 'steps' | 'errors' | 'screenshots' | 'logs';

interface StepData {
  id: string;
  number: number;
  action?: string;
  description?: string;
  name: string;
  status: 'passed' | 'failed' | 'running' | 'pending' | 'skipped';
  durationMs?: number;
  error?: string;
  line?: number;
  page?: string;
  url?: string;
  screenshot?: string;
}

interface ScenarioData {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'running' | 'pending' | 'skipped';
  durationMs: number;
  durationLabel: string;
  traceUrl?: string;
  error?: string;
  screenshot?: string;
  retries?: number;
  steps: StepData[];
}

interface RunData {
  id: string;
  source: ExecutionSource;
  title: string;
  state: RunState;
  outcome: RunOutcome;
  startedAtMs: number;
  dateLabel: string;
  timeLabel: string;
  durationLabel: string;
  triggeredBy: string;
  triggerType: 'Manual' | 'Scheduled' | 'API' | 'Webhook';
  environment: string;
  allureUrl?: string;
  runId?: number;
  owner?: string;
  repo?: string;
  metrics: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    running: number;
    flaky: number;
  };
  scenarios: ScenarioData[];
}

const panelClass = 'bg-[#151d28] border border-[#2c3745] rounded-md';

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDurationMs(ms?: number): string {
  if (!ms || ms <= 0) return '0s';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

function extractVeroScenarioName(playwrightName: string): string {
  if (!playwrightName) return 'Scenario';

  const parts = playwrightName.split('>').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    return toTitleCase(parts[parts.length - 1]);
  }

  const cleaned = playwrightName.replace(/[._-]/g, ' ').trim();
  return cleaned.endsWith('.vero') ? cleaned : toTitleCase(cleaned);
}

function getAuthHeaders(json = false): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = json ? { 'Content-Type': 'application/json' } : {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function getBackendOrigin(): string {
  if (typeof window === 'undefined') return '';
  const { protocol, hostname, port, origin } = window.location;
  if (port === '5173' || port === '5174' || port === '5175' || port === '5176') {
    return `${protocol}//${hostname}:3000`;
  }
  return origin;
}

function toBackendUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const base = getBackendOrigin();
  if (!base) return url;
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}

const REQUEST_TIMEOUT_MS = 15000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function navigateOrOpenPopup(popup: Window | null, targetUrl: string): void {
  if (popup && !popup.closed) {
    popup.location.href = targetUrl;
    return;
  }
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}

function closePopup(popup: Window | null): void {
  if (popup && !popup.closed) {
    popup.close();
  }
}

function computeRunMetrics(
  scenarios: ScenarioData[],
  fallback?: Partial<RunData['metrics']>
): RunData['metrics'] {
  if (scenarios.length === 0) {
    return {
      total: fallback?.total || 0,
      passed: fallback?.passed || 0,
      failed: fallback?.failed || 0,
      skipped: fallback?.skipped || 0,
      running: fallback?.running || 0,
      flaky: fallback?.flaky || 0,
    };
  }

  const passed = scenarios.filter((s) => s.status === 'passed' && !isFlakyScenario(s)).length;
  const failed = scenarios.filter((s) => s.status === 'failed').length;
  const skipped = scenarios.filter((s) => s.status === 'skipped' || s.status === 'pending').length;
  const running = scenarios.filter((s) => s.status === 'running').length;
  const flaky = scenarios.filter((s) => isFlakyScenario(s)).length;

  return {
    total: scenarios.length,
    passed,
    failed,
    skipped,
    running,
    flaky,
  };
}

function deriveRunOutcome(state: RunState, metrics: RunData['metrics']): RunOutcome {
  if (state === 'running' || state === 'queued') return null;
  if (state === 'error') return 'failed';
  if (state === 'canceled') return metrics.total > 0 && metrics.failed > 0 ? 'failed' : 'no-tests';
  if (metrics.total === 0) return 'no-tests';
  if (metrics.failed > 0) {
    return metrics.passed > 0 ? 'unstable' : 'failed';
  }
  if (metrics.flaky > 0) return 'unstable';
  return 'passed';
}

function getRunStatusBadge(run: RunData): { label: string; className: string } {
  if (run.state === 'running') {
    return { label: 'RUNNING', className: 'bg-[#1f3f62] text-[#a9d0ff] border-[#33608f]' };
  }
  if (run.state === 'queued') {
    return { label: 'QUEUED', className: 'bg-[#253242] text-[#b7c8da] border-[#3f556d]' };
  }
  if (run.state === 'canceled') {
    return { label: 'CANCELED', className: 'bg-[#2a313c] text-[#b3c0cf] border-[#3c4a5a]' };
  }
  if (run.state === 'error') {
    return { label: 'ERROR', className: 'bg-[#5a2328] text-[#ffb4bc] border-[#8a3a44]' };
  }

  if (run.outcome === 'passed') {
    return { label: 'PASSED', className: 'bg-[#1f4f2a] text-[#9be9a8] border-[#2f6f3a]' };
  }
  if (run.outcome === 'unstable') {
    return { label: 'UNSTABLE', className: 'bg-[#4a3b1c] text-[#ffd391] border-[#7a5d2a]' };
  }
  if (run.outcome === 'failed') {
    return { label: 'FAILED', className: 'bg-[#5a2328] text-[#ffb4bc] border-[#8a3a44]' };
  }
  if (run.outcome === 'no-tests') {
    return { label: 'NO TESTS', className: 'bg-[#28313d] text-[#b3c0cf] border-[#3c4a5a]' };
  }

  return { label: 'COMPLETED', className: 'bg-[#28313d] text-[#b3c0cf] border-[#3c4a5a]' };
}

function getScenarioStatusDot(status: ScenarioData['status']): string {
  if (status === 'passed') return 'bg-[#3fb950]';
  if (status === 'failed') return 'bg-[#f85149]';
  if (status === 'running') return 'bg-[#58a6ff]';
  if (status === 'skipped' || status === 'pending') return 'bg-[#d29922]';
  return 'bg-[#8b949e]';
}

function isFlakyScenario(scenario: ScenarioData): boolean {
  return typeof scenario.retries === 'number' && scenario.retries > 0;
}

function extractUrlFromText(value?: string): string | undefined {
  if (!value) return undefined;
  const match = value.match(/https?:\/\/[^\s"'`<>]+/i);
  return match?.[0];
}

function getStepDisplayTitle(step: StepData): string {
  const action = step.action?.trim();
  const description = step.description?.trim();
  if (action && description && action.toLowerCase() !== description.toLowerCase()) {
    return `${toTitleCase(action)} - ${description}`;
  }
  return step.name || description || action || `Step ${step.number}`;
}

function getStepPageLabel(step: StepData): string {
  const raw = step.url || step.page || extractUrlFromText(step.error) || extractUrlFromText(step.name);
  if (!raw) return 'N/A';
  try {
    const parsed = new URL(raw);
    return `${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`;
  } catch {
    return raw;
  }
}

interface HorizontalScrollState {
  canLeft: boolean;
  canRight: boolean;
}

function getHorizontalScrollState(element: HTMLDivElement | null): HorizontalScrollState {
  if (!element) {
    return { canLeft: false, canRight: false };
  }

  const { scrollLeft, scrollWidth, clientWidth } = element;
  return {
    canLeft: scrollLeft > 2,
    canRight: scrollLeft + clientWidth < scrollWidth - 2,
  };
}

export const ExecutionReportView: React.FC<ExecutionReportViewProps> = ({
  onJumpToEditor,
  onViewTrace,
  onOpenAllure,
}) => {
  const [activeSource, setActiveSource] = useState<ExecutionSource>('github');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [runsPaneCollapsed, setRunsPaneCollapsed] = useState(false);
  const [scenariosPaneCollapsed, setScenariosPaneCollapsed] = useState(false);
  const [runSearch, setRunSearch] = useState('');
  const [scenarioSearch, setScenarioSearch] = useState('');
  const [runFilter, setRunFilter] = useState<RunFilter>('all');
  const [scenarioFilter, setScenarioFilter] = useState<ScenarioFilter>('all');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('steps');
  const [preparingAllureRunId, setPreparingAllureRunId] = useState<string | null>(null);
  const [openingTraceScenarioId, setOpeningTraceScenarioId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'info' | 'error'; text: string } | null>(null);
  const [fullScreenshot, setFullScreenshot] = useState<string | null>(null);
  const [runFilterScroll, setRunFilterScroll] = useState<HorizontalScrollState>({ canLeft: false, canRight: false });
  const [scenarioFilterScroll, setScenarioFilterScroll] = useState<HorizontalScrollState>({
    canLeft: false,
    canRight: false,
  });
  const runFilterScrollRef = useRef<HTMLDivElement | null>(null);
  const scenarioFilterScrollRef = useRef<HTMLDivElement | null>(null);

  const localExecutions = useLocalExecutionStore((state) => state.executions);
  const fetchLocalExecutions = useLocalExecutionStore((state) => state.fetchExecutions);

  const githubExecutions = useGitHubExecutionStore((state) => state.executions);
  const addExecution = useGitHubExecutionStore((state) => state.addExecution);
  const updateExecution = useGitHubExecutionStore((state) => state.updateExecution);

  const fetchGitHubRuns = useCallback(async () => {
    try {
      const savedSettings = localStorage.getItem('github-settings');
      let owner = 'y9g7bg5qbj-arch';
      let repo = 'playwright-web-app';

      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        owner = settings.owner || owner;
        repo = settings.repo || repo;
      }

      const response = await fetch(`/api/github/runs?owner=${owner}&repo=${repo}&limit=20`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch GitHub runs (HTTP ${response.status})`);
      }

      const data = await response.json();
      if (!data.success || !Array.isArray(data.data)) {
        return;
      }

      for (const run of data.data) {
        const executionId = `github-${run.id}`;
        const existing = githubExecutions.find((item) => item.id === executionId || item.runId === run.id);

        const mapStatus = (status: string): GitHubExecution['status'] => {
          if (status === 'in_progress') return 'in_progress';
          if (status === 'queued') return 'queued';
          if (status === 'failure') return 'failed';
          if (status === 'cancelled') return 'cancelled';
          return 'completed';
        };

        const mapped: Partial<GitHubExecution> = {
          id: executionId,
          runId: run.id,
          runNumber: run.runNumber,
          workflowName: run.name,
          status: mapStatus(run.status),
          conclusion: run.conclusion,
          browsers: ['chromium'],
          workers: run.jobs?.length || 1,
          shards: run.jobs?.length || 1,
          triggeredAt: run.createdAt,
          startedAt: run.createdAt,
          completedAt: run.updatedAt,
          totalTests: existing?.totalTests || 0,
          passedTests: existing?.passedTests || 0,
          failedTests: existing?.failedTests || 0,
          skippedTests: existing?.skippedTests || 0,
          scenarios: existing?.scenarios,
          htmlUrl: run.htmlUrl,
          owner,
          repo,
        };

        if (existing) {
          updateExecution(existing.id, mapped);
        } else {
          addExecution(mapped as GitHubExecution);
        }

        const completed = run.status === 'completed' || run.conclusion;
        const missingDetails = !existing?.scenarios || existing.scenarios.length === 0;

        if (completed && missingDetails) {
          fetch(`/api/github/runs/${run.id}/report?owner=${owner}&repo=${repo}`, {
            headers: getAuthHeaders(),
          })
            .then((res) => res.json())
            .then((report) => {
              if (!report.success || !report.data) return;
              const summary = report.data.summary || {};
              const scenarios = Array.isArray(report.data.scenarios) ? report.data.scenarios : [];

              updateExecution(executionId, {
                totalTests: summary.total || 0,
                passedTests: summary.passed || 0,
                failedTests: summary.failed || 0,
                skippedTests: summary.skipped || 0,
                scenarios: scenarios.map((scenario: any) => ({
                  id: scenario.id,
                  name: scenario.name,
                  status: scenario.status,
                  duration: scenario.duration,
                  error: scenario.error,
                  traceUrl: scenario.traceUrl,
                  screenshot: scenario.screenshot,
                  retries: scenario.retries,
                  steps: Array.isArray(scenario.steps)
                    ? scenario.steps.map((step: any) => ({
                        ...step,
                        screenshot: step.screenshot,
                      }))
                    : [],
                })),
              });
            })
            .catch(() => {
              // Ignore background report fetch errors
            });
        }
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to refresh GitHub executions',
      });
    }
  }, [addExecution, githubExecutions, updateExecution]);

  const refreshActiveSource = useCallback(async () => {
    if (activeSource === 'local') {
      await fetchLocalExecutions();
    } else {
      await fetchGitHubRuns();
    }
  }, [activeSource, fetchGitHubRuns, fetchLocalExecutions]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshActiveSource();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshActiveSource]);

  useEffect(() => {
    handleRefresh();
  }, [activeSource, handleRefresh]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshActiveSource().catch(() => {
        // silent polling failure
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshActiveSource]);

  const convertLocalToRunData = useCallback((exec: ExecutionWithDetails): RunData => {
    const startedAt = new Date(exec.startedAt);
    const durationMs =
      typeof exec.duration === 'number'
        ? exec.duration
        : exec.finishedAt
        ? new Date(exec.finishedAt).getTime() - new Date(exec.startedAt).getTime()
        : 0;

    const triggerType: RunData['triggerType'] =
      exec.triggeredBy.type === 'scheduled'
        ? 'Scheduled'
        : exec.triggeredBy.type === 'api'
        ? 'API'
        : exec.triggeredBy.type === 'webhook'
        ? 'Webhook'
        : 'Manual';

    const localState: RunState =
      exec.status === 'running'
        ? 'running'
        : exec.status === 'pending'
        ? 'queued'
        : exec.status === 'cancelled'
        ? 'canceled'
        : exec.status === 'passed' || exec.status === 'failed'
        ? 'completed'
        : 'error';

    const scenarios: ScenarioData[] = (exec.scenarios || []).map((scenario, scenarioIndex) => ({
      id: scenario.id || `${exec.id}-scenario-${scenarioIndex}`,
      name: extractVeroScenarioName(scenario.name),
      status: scenario.status,
      durationMs: scenario.duration || 0,
      durationLabel: formatDurationMs(scenario.duration),
      traceUrl: scenario.traceUrl,
      error: scenario.error,
      screenshot: scenario.screenshot,
      retries: (scenario as any).retries,
      steps: (scenario.steps || []).map((step, stepIndex) => ({
        id: step.id || `${exec.id}-step-${stepIndex}`,
        number: step.stepNumber || stepIndex + 1,
        action: step.action,
        description: step.description,
        name: step.description || step.action || `Step ${step.stepNumber || stepIndex + 1}`,
        status: step.status,
        durationMs: step.duration,
        error: step.error,
        line: stepIndex + 1,
        page: (step as any).page,
        url: (step as any).url,
        screenshot: step.screenshot || (step.status === 'failed' ? scenario.screenshot : undefined),
      })),
    }));

    const inferredPassed =
      exec.status === 'passed' &&
      (exec.passedCount || 0) === 0 &&
      (exec.failedCount || 0) === 0 &&
      (exec.skippedCount || 0) === 0
        ? 1
        : exec.passedCount || 0;
    const inferredFailed =
      exec.status === 'failed' ? Math.max(exec.failedCount || 0, 1) : exec.failedCount || 0;

    const metrics = computeRunMetrics(scenarios, {
      total: inferredPassed + inferredFailed + (exec.skippedCount || 0) || scenarios.length,
      passed: inferredPassed,
      failed: inferredFailed,
      skipped: exec.skippedCount || 0,
      running: exec.status === 'running' ? 1 : 0,
      flaky: 0,
    });

    return {
      id: exec.id,
      source: 'local',
      title: exec.testFlowName || 'Local Execution',
      state: localState,
      outcome: deriveRunOutcome(localState, metrics),
      startedAtMs: startedAt.getTime(),
      dateLabel: startedAt.toLocaleDateString('en-CA'),
      timeLabel: startedAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      durationLabel: localState === 'running' || localState === 'queued' ? 'Running' : formatDurationMs(durationMs),
      triggeredBy: exec.triggeredBy.name || 'System',
      triggerType,
      environment: 'Local',
      metrics,
      scenarios,
    };
  }, []);

  const convertGitHubToRunData = useCallback((exec: GitHubExecution): RunData => {
    const startedAt = new Date(exec.triggeredAt || exec.startedAt || Date.now());
    const completedAt = exec.completedAt ? new Date(exec.completedAt).getTime() : undefined;
    const startedAtMs = startedAt.getTime();
    const durationMs =
      typeof completedAt === 'number'
        ? completedAt - startedAtMs
        : typeof exec.duration === 'number'
        ? exec.duration
        : 0;

    const state: RunState =
      exec.status === 'in_progress'
        ? 'running'
        : exec.status === 'queued'
        ? 'queued'
        : exec.status === 'cancelled'
        ? 'canceled'
        : exec.status === 'failed'
        ? 'error'
        : 'completed';

    const scenarios: ScenarioData[] = (exec.scenarios || []).map((scenario, scenarioIndex) => {
      const scenarioSteps = Array.isArray(scenario.steps)
        ? scenario.steps.map((step, stepIndex) => ({
            id: step.id || `${exec.id}-step-${stepIndex}`,
            number: step.stepNumber || stepIndex + 1,
            action: step.action,
            description: (step as any).description,
            name:
              (step as any).description ||
              step.action ||
              `Step ${step.stepNumber || stepIndex + 1}`,
            status: step.status,
            durationMs: step.duration,
            error: step.error,
            line: stepIndex + 1,
            page: (step as any).page,
            url: (step as any).url,
            screenshot: step.screenshot || (step.status === 'failed' ? scenario.screenshot : undefined),
          }))
        : [];

      const fallbackSteps: StepData[] =
        scenarioSteps.length > 0
          ? scenarioSteps
          : [
              {
                id: `${exec.id}-synthetic-step-${scenarioIndex}`,
                number: 1,
                action: 'execute',
                description: extractVeroScenarioName(scenario.name),
                name: `Execute ${extractVeroScenarioName(scenario.name)}`,
                status: scenario.status,
                durationMs: scenario.duration,
                error: scenario.error,
                screenshot: scenario.screenshot,
              },
            ];

      return {
        id: scenario.id || `${exec.id}-scenario-${scenarioIndex}`,
        name: extractVeroScenarioName(scenario.name),
        status: scenario.status,
        durationMs: scenario.duration || 0,
        durationLabel: formatDurationMs(scenario.duration),
        traceUrl: scenario.traceUrl,
        error: scenario.error,
        screenshot: scenario.screenshot,
        retries: (scenario as any).retries,
        steps: fallbackSteps,
      };
    });

    const metrics = computeRunMetrics(scenarios, {
      total:
        exec.totalTests ||
        (exec.conclusion === 'success' ? 1 : 0) +
          (exec.conclusion && exec.conclusion !== 'success' ? 1 : 0) ||
        scenarios.length,
      passed:
        exec.passedTests ||
        (exec.conclusion === 'success' && exec.totalTests === 0 && exec.failedTests === 0 ? 1 : 0),
      failed:
        exec.failedTests ||
        (exec.conclusion && exec.conclusion !== 'success' && exec.totalTests === 0 ? 1 : 0),
      skipped: exec.skippedTests || 0,
      running: exec.status === 'in_progress' ? 1 : 0,
      flaky: 0,
    });

    return {
      id: exec.id,
      source: 'github',
      title: exec.workflowName || 'GitHub Run',
      state,
      outcome: deriveRunOutcome(state, metrics),
      startedAtMs,
      dateLabel: startedAt.toLocaleDateString('en-CA'),
      timeLabel: startedAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      durationLabel: state === 'running' || state === 'queued' ? 'Running' : formatDurationMs(durationMs),
      triggeredBy: 'GitHub Actions',
      triggerType: 'API',
      environment: 'GitHub Actions',
      allureUrl: exec.htmlUrl,
      runId: exec.runId,
      owner: exec.owner,
      repo: exec.repo,
      metrics,
      scenarios,
    };
  }, []);

  const sourceRuns = useMemo(() => {
    const runs =
      activeSource === 'local'
        ? localExecutions.map(convertLocalToRunData)
        : githubExecutions.map(convertGitHubToRunData);

    return runs.sort((a, b) => {
      const aActive = a.state === 'running' || a.state === 'queued';
      const bActive = b.state === 'running' || b.state === 'queued';
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return b.startedAtMs - a.startedAtMs;
    });
  }, [activeSource, convertGitHubToRunData, convertLocalToRunData, githubExecutions, localExecutions]);

  const runNumbers = useMemo(() => {
    const map = new Map<string, string>();
    const total = sourceRuns.length;
    sourceRuns.forEach((run, index) => {
      map.set(run.id, `Execution ${total - index}`);
    });
    return map;
  }, [sourceRuns]);

  const filteredRuns = useMemo(() => {
    const query = runSearch.trim().toLowerCase();
    return sourceRuns.filter((run) => {
      if (runFilter === 'active' && !(run.state === 'running' || run.state === 'queued')) return false;
      if (runFilter === 'passed' && run.outcome !== 'passed') return false;
      if (runFilter === 'unstable' && run.outcome !== 'unstable') return false;
      if (runFilter === 'failed' && run.outcome !== 'failed' && run.state !== 'error') return false;
      if (runFilter === 'no-tests' && run.outcome !== 'no-tests') return false;
      if (!query) return true;

      const numberLabel = runNumbers.get(run.id) || run.id;
      const haystack = [
        numberLabel,
        run.title,
        run.triggeredBy,
        run.triggerType,
        run.state,
        run.outcome || '',
        run.dateLabel,
        run.timeLabel,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [runFilter, runNumbers, runSearch, sourceRuns]);

  useEffect(() => {
    if (!selectedRunId || !filteredRuns.some((run) => run.id === selectedRunId)) {
      setSelectedRunId(filteredRuns[0]?.id || null);
    }
  }, [filteredRuns, selectedRunId]);

  const selectedRun = useMemo(
    () => filteredRuns.find((run) => run.id === selectedRunId) || null,
    [filteredRuns, selectedRunId]
  );

  const scenarioCounts = useMemo(() => {
    const scenarios = selectedRun?.scenarios || [];
    const passed = scenarios.filter((s) => s.status === 'passed' && !isFlakyScenario(s)).length;
    const failed = scenarios.filter((s) => s.status === 'failed').length;
    const running = scenarios.filter((s) => s.status === 'running').length;
    const skipped = scenarios.filter((s) => s.status === 'skipped' || s.status === 'pending').length;
    const flaky = scenarios.filter((s) => isFlakyScenario(s)).length;
    return { all: scenarios.length, passed, failed, running, skipped, flaky };
  }, [selectedRun]);

  const filteredScenarios = useMemo(() => {
    const scenarios = selectedRun?.scenarios || [];
    const query = scenarioSearch.trim().toLowerCase();

    return scenarios.filter((scenario) => {
      if (scenarioFilter === 'failed' && scenario.status !== 'failed') return false;
      if (scenarioFilter === 'passed' && scenario.status !== 'passed') return false;
      if (scenarioFilter === 'running' && scenario.status !== 'running') return false;
      if (scenarioFilter === 'skipped' && !(scenario.status === 'skipped' || scenario.status === 'pending')) return false;
      if (scenarioFilter === 'flaky' && !isFlakyScenario(scenario)) return false;

      if (!query) return true;

      const haystack = [
        scenario.name,
        scenario.error,
        scenario.steps.map((step) => step.name).join(' '),
        scenario.steps.map((step) => step.page).join(' '),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [scenarioFilter, scenarioSearch, selectedRun]);

  useEffect(() => {
    if (!selectedScenarioId || !filteredScenarios.some((scenario) => scenario.id === selectedScenarioId)) {
      const failedScenario = filteredScenarios.find((scenario) => scenario.status === 'failed');
      setSelectedScenarioId((failedScenario || filteredScenarios[0] || null)?.id || null);
    }
  }, [filteredScenarios, selectedScenarioId]);

  const selectedScenario = useMemo(
    () => filteredScenarios.find((scenario) => scenario.id === selectedScenarioId) || null,
    [filteredScenarios, selectedScenarioId]
  );

  useEffect(() => {
    if (!selectedScenario) {
      setSelectedStepId(null);
      return;
    }

    if (!selectedStepId || !selectedScenario.steps.some((step) => step.id === selectedStepId)) {
      setSelectedStepId(selectedScenario.steps[0]?.id || null);
    }
  }, [selectedScenario, selectedStepId]);

  const selectedStep = useMemo(
    () => selectedScenario?.steps.find((step) => step.id === selectedStepId) || null,
    [selectedScenario, selectedStepId]
  );

  const openTraceForScenario = useCallback(
    async (run: RunData, scenario: ScenarioData) => {
      const popup = window.open('', '_blank', 'noopener,noreferrer');
      setOpeningTraceScenarioId(scenario.id);
      setMessage({ type: 'info', text: `Opening trace for ${scenario.name}...` });
      try {
        if (run.source === 'local') {
          const response = await fetchWithTimeout(
            `/api/executions/local/trace/${encodeURIComponent(scenario.name)}/open`,
            {
              method: 'POST',
              headers: getAuthHeaders(),
            }
          );
          const data = await response.json().catch(() => ({}));

          if (!response.ok || !data.success) {
            throw new Error(data.error || `Failed to open local trace (HTTP ${response.status})`);
          }

          if (data.traceUrl) {
            navigateOrOpenPopup(popup, toBackendUrl(data.traceUrl));
          } else if (scenario.traceUrl && onViewTrace) {
            closePopup(popup);
            onViewTrace(scenario.traceUrl, scenario.name);
          } else {
            closePopup(popup);
          }

          setMessage({ type: 'info', text: `Opened trace viewer for ${scenario.name}` });
          return;
        }

        if (run.source === 'github' && run.runId && run.owner && run.repo) {
          const response = await fetchWithTimeout(`/api/github/runs/${run.runId}/trace/open`, {
            method: 'POST',
            headers: getAuthHeaders(true),
            body: JSON.stringify({ owner: run.owner, repo: run.repo }),
          });

          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.success) {
            throw new Error(data.error || `Failed to open GitHub trace (HTTP ${response.status})`);
          }

          closePopup(popup);
          setMessage({ type: 'info', text: `Opening trace viewer for run #${run.runId}` });
          return;
        }

        if (scenario.traceUrl && onViewTrace) {
          closePopup(popup);
          onViewTrace(scenario.traceUrl, scenario.name);
          return;
        }

        throw new Error('Trace is not available for this scenario');
      } catch (error) {
        closePopup(popup);
        setMessage({
          type: 'error',
          text: error instanceof Error ? error.message : 'Failed to open trace viewer',
        });
      } finally {
        setOpeningTraceScenarioId(null);
      }
    },
    [onViewTrace]
  );

  const openAllureForRun = useCallback(
    async (run: RunData) => {
      const popup = window.open('', '_blank', 'noopener,noreferrer');
      setPreparingAllureRunId(run.id);
      setMessage({ type: 'info', text: 'Opening execution report...' });
      try {
        if (run.source === 'github' && run.runId && run.owner && run.repo) {
          const statusResponse = await fetchWithTimeout(`/api/github/runs/${run.runId}/allure/status`, {
            headers: getAuthHeaders(),
          });
          const statusData = await statusResponse.json().catch(() => ({}));

          if (statusResponse.ok && statusData.success && statusData.data?.ready && statusData.data?.reportUrl) {
            navigateOrOpenPopup(popup, toBackendUrl(statusData.data.reportUrl));
            return;
          }

          const prepareResponse = await fetchWithTimeout(`/api/github/runs/${run.runId}/allure/prepare`, {
            method: 'POST',
            headers: getAuthHeaders(true),
            body: JSON.stringify({ owner: run.owner, repo: run.repo }),
          });
          const prepareData = await prepareResponse.json().catch(() => ({}));

          if (prepareResponse.ok && prepareData.success && prepareData.data?.reportUrl) {
            navigateOrOpenPopup(popup, toBackendUrl(prepareData.data.reportUrl));
            return;
          }

          if (run.allureUrl) {
            navigateOrOpenPopup(popup, toBackendUrl(run.allureUrl));
            return;
          }

          throw new Error(prepareData.error || 'Unable to prepare report for this run');
        }

        if (run.source === 'local') {
          const statusResponse = await fetchWithTimeout('/api/executions/local/allure/status', {
            headers: getAuthHeaders(),
          });
          const statusData = await statusResponse.json().catch(() => ({}));

          if (statusResponse.ok && statusData.success && statusData.data?.ready && statusData.data?.reportUrl) {
            navigateOrOpenPopup(popup, toBackendUrl(statusData.data.reportUrl));
            return;
          }

          const generateResponse = await fetchWithTimeout('/api/executions/local/allure/generate', {
            method: 'POST',
            headers: getAuthHeaders(true),
          });
          const generateData = await generateResponse.json().catch(() => ({}));

          if (generateResponse.ok && generateData.success && generateData.data?.reportUrl) {
            navigateOrOpenPopup(popup, toBackendUrl(generateData.data.reportUrl));
            return;
          }

          throw new Error(generateData.error || 'Unable to generate local report');
        }

        if (onOpenAllure) {
          closePopup(popup);
          onOpenAllure(run.id);
          return;
        }
        closePopup(popup);
      } catch (error) {
        closePopup(popup);
        setMessage({
          type: 'error',
          text: error instanceof Error ? error.message : 'Failed to open report',
        });
      } finally {
        setPreparingAllureRunId(null);
      }
    },
    [onOpenAllure]
  );

  const networkHints = useMemo(() => {
    if (!selectedScenario) return [] as string[];

    const hints = new Set<string>();
    selectedScenario.steps.forEach((step) => {
      if (step.url) hints.add(step.url);
      const inError = extractUrlFromText(step.error);
      if (inError) hints.add(inError);
    });

    return Array.from(hints).slice(0, 8);
  }, [selectedScenario]);

  const errorSteps = useMemo(() => {
    if (!selectedScenario) return [] as StepData[];
    return selectedScenario.steps.filter((step) => step.error || step.status === 'failed');
  }, [selectedScenario]);

  const summary = useMemo(() => {
    const runs = sourceRuns;
    return {
      total: runs.length,
      passed: runs.filter((run) => run.outcome === 'passed').length,
      unstable: runs.filter((run) => run.outcome === 'unstable').length,
      failed: runs.filter((run) => run.outcome === 'failed' || run.state === 'error').length,
      active: runs.filter((run) => run.state === 'running' || run.state === 'queued').length,
    };
  }, [sourceRuns]);

  const syncRunFilterScroll = useCallback(() => {
    setRunFilterScroll(getHorizontalScrollState(runFilterScrollRef.current));
  }, []);

  const syncScenarioFilterScroll = useCallback(() => {
    setScenarioFilterScroll(getHorizontalScrollState(scenarioFilterScrollRef.current));
  }, []);

  useEffect(() => {
    syncRunFilterScroll();
    syncScenarioFilterScroll();

    const onResize = () => {
      syncRunFilterScroll();
      syncScenarioFilterScroll();
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [
    syncRunFilterScroll,
    syncScenarioFilterScroll,
    runsPaneCollapsed,
    scenariosPaneCollapsed,
    runFilter,
    scenarioFilter,
    filteredRuns.length,
    scenarioCounts.all,
  ]);

  const scrollFilterRow = useCallback(
    (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right', onAfterScroll: () => void) => {
      const element = ref.current;
      if (!element) return;
      const delta = direction === 'right' ? 180 : -180;
      element.scrollBy({ left: delta, behavior: 'smooth' });
      window.setTimeout(onAfterScroll, 200);
    },
    []
  );

  return (
    <div className="h-full min-h-0 flex flex-col bg-[#0d1117] text-[#c9d1d9]">
      <header className="h-14 shrink-0 border-b border-[#2b3643] bg-[#111923] px-3">
        <div className="h-full flex items-center gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-wide text-[#d6dce4]">Execution Results</div>
            <div className="text-[11px] text-[#7f8b99]">
              {summary.total} executions · {summary.passed} passed · {summary.unstable} unstable · {summary.failed} failed · {summary.active} active
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="inline-flex rounded border border-[#3a4554] bg-[#151d28] p-0.5">
              <button
                type="button"
                onClick={() => setActiveSource('local')}
                className={`px-3 py-1 text-xs font-medium rounded ${
                  activeSource === 'local'
                    ? 'bg-[#293a4f] text-[#d6e8ff]'
                    : 'text-[#9aa7b5] hover:text-[#d3dce6]'
                }`}
              >
                Local
              </button>
              <button
                type="button"
                onClick={() => setActiveSource('github')}
                className={`px-3 py-1 text-xs font-medium rounded ${
                  activeSource === 'github'
                    ? 'bg-[#293a4f] text-[#d6e8ff]'
                    : 'text-[#9aa7b5] hover:text-[#d3dce6]'
                }`}
              >
                GitHub Actions
              </button>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              className="h-7 px-2.5 text-xs border border-[#3a4554] rounded bg-[#151d28] text-[#9aa7b5] hover:text-[#d6dce4]"
            >
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      {message && (
        <div className={`shrink-0 px-3 py-1.5 text-xs border-b ${message.type === 'error' ? 'bg-[#3a1f25] border-[#6f3a45] text-[#ffbec7]' : 'bg-[#1f334a] border-[#365272] text-[#b8d9ff]'}`}>
          {message.text}
        </div>
      )}

      <div className="flex-1 min-h-0 flex gap-2 p-2">
        <section className={`${panelClass} ${runsPaneCollapsed ? 'w-11' : 'w-[265px]'} shrink-0 transition-all duration-150 flex flex-col min-h-0`}>
          <div className="h-9 px-2 border-b border-[#2c3745] flex items-center gap-2">
            {!runsPaneCollapsed && (
              <>
                <ListOrdered className="h-3.5 w-3.5 text-[#95a7bb]" />
                <span className="text-[11px] font-semibold tracking-wide text-[#aab4c1] uppercase">Executions</span>
              </>
            )}
            {!runsPaneCollapsed && selectedRun && (
              <button
                type="button"
                onClick={() => void openAllureForRun(selectedRun)}
                disabled={preparingAllureRunId === selectedRun.id}
                className={`ml-auto h-6 px-2 rounded border text-[10px] ${
                  preparingAllureRunId === selectedRun.id
                    ? 'border-[#5e6c7b] bg-[#2a3340] text-[#9aa7b5]'
                    : 'border-[#3a4554] bg-[#1b2431] text-[#c8d5e2] hover:bg-[#253246]'
                }`}
              >
                {preparingAllureRunId === selectedRun.id ? 'Preparing…' : 'Open Allure'}
              </button>
            )}
            <button
              type="button"
              className="h-6 w-6 rounded border border-[#3a4554] text-[#9aa7b5] hover:text-[#d6dce4]"
              onClick={() => setRunsPaneCollapsed((prev) => !prev)}
              title={runsPaneCollapsed ? 'Expand executions pane' : 'Collapse executions pane'}
            >
              {runsPaneCollapsed ? '›' : '‹'}
            </button>
          </div>

          {runsPaneCollapsed ? (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-start py-2 gap-1">
              <div
                className="h-7 w-7 rounded border border-[#334153] bg-[#171f2b] text-[#9aa7b5] flex items-center justify-center"
                title="Executions"
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </div>
              {filteredRuns.slice(0, 10).map((run) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => {
                    setSelectedRunId(run.id);
                    setRunsPaneCollapsed(false);
                  }}
                  className={`h-7 w-7 rounded border text-[10px] ${selectedRunId === run.id ? 'border-[#4f79a8] bg-[#24364b] text-[#d7ebff]' : 'border-[#334153] bg-[#171f2b] text-[#9aa7b5]'}`}
                  title={runNumbers.get(run.id) || run.id}
                >
                  {(runNumbers.get(run.id) || 'R').replace('Execution ', '')}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="p-2 space-y-2 border-b border-[#2c3745]">
                <input
                  value={runSearch}
                  onChange={(event) => setRunSearch(event.target.value)}
                  placeholder="Search executions..."
                  className="w-full h-7 px-2 rounded border border-[#3a4554] bg-[#0f151d] text-xs text-[#c9d1d9] placeholder-[#647282] outline-none"
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => scrollFilterRow(runFilterScrollRef, 'left', syncRunFilterScroll)}
                    disabled={!runFilterScroll.canLeft}
                    className={`h-6 w-6 shrink-0 rounded border text-[11px] ${
                      runFilterScroll.canLeft
                        ? 'border-[#3a4554] bg-[#171f2b] text-[#b8c6d4] hover:bg-[#253246]'
                        : 'border-[#2e3a48] bg-[#141a23] text-[#5f6f82] opacity-50 cursor-not-allowed'
                    }`}
                    title="Scroll filters left"
                    aria-label="Scroll filters left"
                  >
                    ‹
                  </button>
                  <div
                    ref={runFilterScrollRef}
                    onScroll={syncRunFilterScroll}
                    className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    <div className="inline-flex items-center gap-1 pr-1">
                  {(
                    [
                      { key: 'all', label: 'all' },
                      { key: 'active', label: 'active' },
                      { key: 'failed', label: 'failed' },
                      { key: 'unstable', label: 'unstable' },
                      { key: 'passed', label: 'passed' },
                      { key: 'no-tests', label: 'no tests' },
                    ] as Array<{ key: RunFilter; label: string }>
                  ).map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setRunFilter(filter.key)}
                      className={`h-6 px-2 rounded border text-[10px] uppercase tracking-wide ${
                        runFilter === filter.key
                          ? 'border-[#4f79a8] bg-[#24364b] text-[#d7ebff]'
                          : 'border-[#3a4554] bg-[#171f2b] text-[#9aa7b5]'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => scrollFilterRow(runFilterScrollRef, 'right', syncRunFilterScroll)}
                    disabled={!runFilterScroll.canRight}
                    className={`h-6 w-6 shrink-0 rounded border text-[11px] ${
                      runFilterScroll.canRight
                        ? 'border-[#3a4554] bg-[#171f2b] text-[#b8c6d4] hover:bg-[#253246]'
                        : 'border-[#2e3a48] bg-[#141a23] text-[#5f6f82] opacity-50 cursor-not-allowed'
                    }`}
                    title="Scroll filters right"
                    aria-label="Scroll filters right"
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
                {filteredRuns.map((run) => {
                  const selected = selectedRunId === run.id;
                  const executionLabel = runNumbers.get(run.id) || run.id;
                  const badge = getRunStatusBadge(run);
                  return (
                    <button
                      key={run.id}
                      type="button"
                      onClick={() => {
                        setSelectedRunId(run.id);
                        setSelectedScenarioId(null);
                      }}
                      className={`w-full text-left rounded border px-2.5 py-2 transition-colors ${
                        selected
                          ? 'bg-[#24364b] border-[#4f79a8]'
                          : 'bg-[#171f2b] border-[#344354] hover:border-[#4a5a6d]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#d6dce4]">{executionLabel}</span>
                        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded border ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] font-mono text-[#94a3b3]">
                        {run.dateLabel} {run.timeLabel} · {run.durationLabel}
                      </div>
                      <div className="mt-1 text-[10px] text-[#7f8b99] truncate">
                        {run.metrics.passed} passed · {run.metrics.failed} failed · {run.metrics.skipped} skipped · {run.triggerType}
                      </div>
                    </button>
                  );
                })}
                {filteredRuns.length === 0 && (
                  <div className="text-xs text-[#7f8b99] py-4 text-center">No executions found</div>
                )}
              </div>
            </>
          )}
        </section>

        <section className={`${panelClass} ${scenariosPaneCollapsed ? 'w-11' : 'w-[360px]'} shrink-0 transition-all duration-150 flex flex-col min-h-0`}>
          <div className="h-9 px-2 border-b border-[#2c3745] flex items-center gap-2">
            {!scenariosPaneCollapsed && (
              <>
                <TestTube2 className="h-3.5 w-3.5 text-[#95a7bb]" />
                <span className="text-[11px] font-semibold tracking-wide text-[#aab4c1] uppercase">Scenarios</span>
              </>
            )}
            <button
              type="button"
              className="ml-auto h-6 w-6 rounded border border-[#3a4554] text-[#9aa7b5] hover:text-[#d6dce4]"
              onClick={() => setScenariosPaneCollapsed((prev) => !prev)}
              title={scenariosPaneCollapsed ? 'Expand scenarios pane' : 'Collapse scenarios pane'}
            >
              {scenariosPaneCollapsed ? '›' : '‹'}
            </button>
          </div>

          {scenariosPaneCollapsed ? (
            <div className="flex-1 min-h-0 flex flex-col items-center py-2 gap-1">
              <div
                className="h-7 w-7 rounded border border-[#334153] bg-[#171f2b] text-[#9aa7b5] flex items-center justify-center"
                title="Scenarios"
              >
                <TestTube2 className="h-3.5 w-3.5" />
              </div>
              {filteredScenarios.slice(0, 14).map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => {
                    setSelectedScenarioId(scenario.id);
                    setScenariosPaneCollapsed(false);
                  }}
                  className={`h-7 w-7 rounded-full border ${selectedScenarioId === scenario.id ? 'border-[#4f79a8] bg-[#24364b]' : 'border-[#334153] bg-[#171f2b]'}`}
                  title={scenario.name}
                >
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${getScenarioStatusDot(scenario.status)}`} />
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="p-2 space-y-2 border-b border-[#2c3745]">
                <input
                  value={scenarioSearch}
                  onChange={(event) => setScenarioSearch(event.target.value)}
                  placeholder="Search scenarios..."
                  className="w-full h-7 px-2 rounded border border-[#3a4554] bg-[#0f151d] text-xs text-[#c9d1d9] placeholder-[#647282] outline-none"
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => scrollFilterRow(scenarioFilterScrollRef, 'left', syncScenarioFilterScroll)}
                    disabled={!scenarioFilterScroll.canLeft}
                    className={`h-6 w-6 shrink-0 rounded border text-[11px] ${
                      scenarioFilterScroll.canLeft
                        ? 'border-[#3a4554] bg-[#171f2b] text-[#b8c6d4] hover:bg-[#253246]'
                        : 'border-[#2e3a48] bg-[#141a23] text-[#5f6f82] opacity-50 cursor-not-allowed'
                    }`}
                    title="Scroll scenario filters left"
                    aria-label="Scroll scenario filters left"
                  >
                    ‹
                  </button>
                  <div
                    ref={scenarioFilterScrollRef}
                    onScroll={syncScenarioFilterScroll}
                    className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    <div className="inline-flex items-center gap-1 pr-1">
                  {(
                    [
                      ['all', scenarioCounts.all],
                      ['failed', scenarioCounts.failed],
                      ['running', scenarioCounts.running],
                      ['passed', scenarioCounts.passed],
                      ['flaky', scenarioCounts.flaky],
                      ['skipped', scenarioCounts.skipped],
                    ] as Array<[ScenarioFilter, number]>
                  ).map(([filter, count]) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setScenarioFilter(filter)}
                      className={`h-6 px-2 rounded border text-[10px] uppercase tracking-wide ${
                        scenarioFilter === filter
                          ? 'border-[#4f79a8] bg-[#24364b] text-[#d7ebff]'
                          : 'border-[#3a4554] bg-[#171f2b] text-[#9aa7b5]'
                      } ${count === 0 ? 'opacity-50' : ''}`}
                    >
                      {filter} {count}
                    </button>
                  ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => scrollFilterRow(scenarioFilterScrollRef, 'right', syncScenarioFilterScroll)}
                    disabled={!scenarioFilterScroll.canRight}
                    className={`h-6 w-6 shrink-0 rounded border text-[11px] ${
                      scenarioFilterScroll.canRight
                        ? 'border-[#3a4554] bg-[#171f2b] text-[#b8c6d4] hover:bg-[#253246]'
                        : 'border-[#2e3a48] bg-[#141a23] text-[#5f6f82] opacity-50 cursor-not-allowed'
                    }`}
                    title="Scroll scenario filters right"
                    aria-label="Scroll scenario filters right"
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
                {filteredScenarios.map((scenario) => {
                  const selected = selectedScenarioId === scenario.id;
                  return (
                    <div
                      key={scenario.id}
                      className={`rounded border px-2.5 py-2 ${selected ? 'bg-[#24364b] border-[#4f79a8]' : 'bg-[#171f2b] border-[#344354]'}`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedScenarioId(scenario.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${getScenarioStatusDot(scenario.status)}`} />
                          <span className="text-xs font-semibold text-[#d6dce4] truncate">{scenario.name}</span>
                        </div>
                        <div className="mt-1 text-[10px] text-[#8da0b4] font-mono">
                          {scenario.steps.length} steps · {scenario.durationLabel}
                          {isFlakyScenario(scenario) ? ' · Flaky' : ''}
                        </div>
                      </button>

                      <div className="mt-2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedRun) {
                              void openTraceForScenario(selectedRun, scenario);
                            }
                          }}
                          disabled={openingTraceScenarioId === scenario.id}
                          className={`h-6 px-2 rounded border text-[10px] ${
                            openingTraceScenarioId === scenario.id
                              ? 'border-[#5e6c7b] bg-[#2a3340] text-[#9aa7b5]'
                              : 'border-[#3a4554] bg-[#1b2431] text-[#c8d5e2] hover:bg-[#253246]'
                          }`}
                        >
                          {openingTraceScenarioId === scenario.id ? 'Opening…' : 'Open Trace'}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredScenarios.length === 0 && (
                  <div className="text-xs text-[#7f8b99] py-4 text-center">No scenarios found</div>
                )}
              </div>
            </>
          )}
        </section>

        <section className={`${panelClass} flex-1 min-w-0 flex flex-col min-h-0`}>
          <div className="h-10 px-3 border-b border-[#2c3745] flex items-center gap-2">
            <span className="text-xs font-semibold text-[#d6dce4] truncate">
              {selectedScenario ? selectedScenario.name : selectedRun ? runNumbers.get(selectedRun.id) : 'Execution Detail'}
            </span>
            {selectedRun && (
              <span className="ml-1 text-[10px] font-mono text-[#7f8b99]">
                {runNumbers.get(selectedRun.id)} · {selectedRun.dateLabel} {selectedRun.timeLabel}
              </span>
            )}

            <div className="ml-auto flex items-center gap-1.5">
              {selectedRun && selectedScenario && (
                <button
                  type="button"
                  onClick={() => void openTraceForScenario(selectedRun, selectedScenario)}
                  disabled={openingTraceScenarioId === selectedScenario.id}
                  className={`h-7 px-2.5 text-xs border rounded ${
                    openingTraceScenarioId === selectedScenario.id
                      ? 'border-[#5e6c7b] bg-[#2a3340] text-[#9aa7b5]'
                      : 'border-[#4c3f7a] bg-[#3d3264] text-[#e2dbff] hover:bg-[#4a3a7a]'
                  }`}
                >
                  {openingTraceScenarioId === selectedScenario.id ? 'Opening…' : 'Open Trace'}
                </button>
              )}
            </div>
          </div>

          <div className="h-9 px-3 border-b border-[#2c3745] flex items-center gap-1">
            {(['steps', 'errors', 'screenshots', 'logs'] as DetailTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setDetailTab(tab)}
                className={`h-6 px-2.5 rounded border text-[10px] uppercase tracking-wide ${
                  detailTab === tab
                    ? 'border-[#4f79a8] bg-[#24364b] text-[#d7ebff]'
                    : 'border-[#3a4554] bg-[#171f2b] text-[#9aa7b5]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 p-2">
            {!selectedRun ? (
              <div className="h-full flex items-center justify-center text-sm text-[#7f8b99]">No execution selected</div>
            ) : !selectedScenario ? (
              <div className="h-full flex items-center justify-center text-sm text-[#7f8b99]">No scenario selected</div>
            ) : detailTab === 'steps' ? (
              <div className="h-full min-h-0 grid grid-cols-[minmax(0,1fr)_280px] gap-2">
                <div className={`${panelClass} min-h-0 overflow-hidden flex flex-col`}>
                  <div className="h-8 px-2.5 border-b border-[#2c3745] flex items-center text-[11px] text-[#9aa7b5]">
                    Steps ({selectedScenario.steps.length})
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
                    {selectedScenario.steps.map((step) => {
                      const selected = selectedStepId === step.id;
                      return (
                        <button
                          key={step.id}
                          type="button"
                          onClick={() => {
                            setSelectedStepId(step.id);
                            if (typeof step.line === 'number' && onJumpToEditor) {
                              onJumpToEditor(step.line);
                            }
                          }}
                          className={`w-full text-left rounded border px-2 py-1.5 ${
                            selected
                              ? 'bg-[#24364b] border-[#4f79a8]'
                              : step.status === 'failed'
                              ? 'bg-[#2b1c22] border-[#6f3a45]'
                              : 'bg-[#171f2b] border-[#344354]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="inline-flex min-w-[24px] justify-center rounded border border-[#3a4554] bg-[#0f151d] text-[10px] font-mono text-[#9aa7b5]">
                              {String(step.number).padStart(2, '0')}
                            </span>
                            <span className={`h-2.5 w-2.5 rounded-full ${getScenarioStatusDot(step.status)}`} />
                            <span className="text-xs font-medium text-[#d6dce4] truncate">
                              {getStepDisplayTitle(step)}
                            </span>
                            <span className="ml-auto text-[10px] font-mono text-[#8ea4b7]">
                              {formatDurationMs(step.durationMs)}
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] font-mono text-[#7f8b99] truncate">
                            {getStepPageLabel(step)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={`${panelClass} min-h-0 overflow-hidden flex flex-col`}>
                  <div className="h-8 px-2.5 border-b border-[#2c3745] flex items-center text-[11px] text-[#9aa7b5]">
                    Evidence
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
                    <div className="rounded border border-[#344354] bg-[#0f151d] p-2">
                      <div className="text-[10px] uppercase tracking-wide text-[#7f8b99]">Current Step</div>
                      <div className="mt-1 text-xs text-[#d6dce4]">
                        {selectedStep ? getStepDisplayTitle(selectedStep) : 'No step selected'}
                      </div>
                    </div>

                    <div className="rounded border border-[#344354] bg-[#0f151d] p-2">
                      <div className="text-[10px] uppercase tracking-wide text-[#7f8b99]">Screenshot</div>
                      {selectedStep?.screenshot || selectedScenario.screenshot ? (
                        <button
                          type="button"
                          onClick={() => setFullScreenshot(selectedStep?.screenshot || selectedScenario.screenshot || null)}
                          className="mt-1 w-full aspect-video overflow-hidden rounded border border-[#3a4554]"
                        >
                          <img
                            src={selectedStep?.screenshot || selectedScenario.screenshot}
                            alt="Step screenshot"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="mt-1 w-full aspect-video rounded border border-dashed border-[#3a4554] flex items-center justify-center text-[10px] text-[#7f8b99]">
                          No screenshot
                        </div>
                      )}
                    </div>

                    {(selectedStep?.error || selectedScenario.error) && (
                      <div className="rounded border border-[#6f3a45] bg-[#2b1c22] p-2">
                        <div className="text-[10px] uppercase tracking-wide text-[#f2b3bc]">Error</div>
                        <div className="mt-1 text-[11px] font-mono text-[#ffcad1] whitespace-pre-wrap break-words">
                          {humanizePlaywrightError(selectedStep?.error || selectedScenario.error || 'Step failed')}
                        </div>
                      </div>
                    )}

                    {networkHints.length > 0 && (
                      <div className="rounded border border-[#344354] bg-[#0f151d] p-2">
                        <div className="text-[10px] uppercase tracking-wide text-[#7f8b99]">Network Hints</div>
                        <div className="mt-1 space-y-1">
                          {networkHints.slice(0, 4).map((hint) => (
                            <div key={hint} className="text-[10px] font-mono text-[#8ea4b7] truncate" title={hint}>
                              {hint}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : detailTab === 'errors' ? (
              <div className={`${panelClass} h-full overflow-y-auto p-3 space-y-2`}>
                {errorSteps.length === 0 ? (
                  <div className="text-sm text-[#7f8b99]">No errors captured for this scenario.</div>
                ) : (
                  errorSteps.map((step) => (
                    <div key={step.id} className="rounded border border-[#6f3a45] bg-[#2b1c22] p-2.5">
                      <div className="text-xs font-semibold text-[#ffcad1]">Step {step.number} · {getStepDisplayTitle(step)}</div>
                      <div className="mt-1 text-[11px] font-mono text-[#ffcad1] whitespace-pre-wrap break-words">
                        {humanizePlaywrightError(step.error || 'Step failed')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : detailTab === 'screenshots' ? (
              <div className={`${panelClass} h-full overflow-y-auto p-3`}>
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                  {[
                    ...selectedScenario.steps
                      .filter((step) => Boolean(step.screenshot))
                      .map((step) => ({
                        id: step.id,
                        label: `Step ${step.number}`,
                        src: step.screenshot as string,
                      })),
                    ...(selectedScenario.screenshot
                      ? [
                          {
                            id: `${selectedScenario.id}-scenario-shot`,
                            label: 'Scenario',
                            src: selectedScenario.screenshot,
                          },
                        ]
                      : []),
                  ].map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setFullScreenshot(entry.src)}
                      className="rounded border border-[#344354] overflow-hidden bg-[#0f151d]"
                    >
                      <img src={entry.src} alt={entry.label} className="w-full aspect-video object-cover" />
                      <div className="px-2 py-1 text-[10px] text-[#9aa7b5] text-left">{entry.label}</div>
                    </button>
                  ))}
                </div>
                {!selectedScenario.screenshot && !selectedScenario.steps.some((step) => Boolean(step.screenshot)) && (
                  <div className="text-sm text-[#7f8b99]">No screenshots available.</div>
                )}
              </div>
            ) : (
              <div className={`${panelClass} h-full overflow-y-auto p-3 space-y-2`}>
                {selectedScenario.steps.length === 0 ? (
                  <div className="text-sm text-[#7f8b99]">No logs available.</div>
                ) : (
                  selectedScenario.steps.map((step) => (
                    <div key={step.id} className="rounded border border-[#344354] bg-[#0f151d] p-2">
                      <div className="text-[10px] uppercase tracking-wide text-[#7f8b99]">
                        Step {step.number} · {step.status.toUpperCase()}
                      </div>
                      <div className="mt-1 text-[11px] font-mono text-[#9fb5c9]">{getStepDisplayTitle(step)}</div>
                      {step.error && (
                        <div className="mt-1 text-[11px] font-mono text-[#ffcad1] whitespace-pre-wrap break-words">
                          {humanizePlaywrightError(step.error)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {fullScreenshot && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setFullScreenshot(null)}
        >
          <img
            src={fullScreenshot}
            alt="Screenshot"
            className="max-w-[90vw] max-h-[88vh] object-contain rounded border border-[#3a4554]"
          />
        </div>
      )}
    </div>
  );
};

export default ExecutionReportView;
