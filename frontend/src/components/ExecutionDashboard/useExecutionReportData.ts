import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGitHubExecutionStore, GitHubExecution } from '@/store/useGitHubExecutionStore';
import { useLocalExecutionStore } from '@/store/useLocalExecutionStore';
import { useAuthStore } from '@/store/authStore';
import { executionsApi } from '@/api/executions';
import type { ExecutionWithDetails } from '@/api/executions';
import type {
  ExecutionSource,
  RunState,
  RunFilter,
  RunData,
  ScenarioData,
  StepData,
  MatrixChildData,
} from './executionReportTypes';
import {
  extractVeroScenarioName,
  formatDurationMs,
  computeRunMetrics,
  deriveRunOutcome,
  getAuthHeaders,
  fetchWithTimeout,
  toBackendUrl,
} from './executionReportUtils';

interface UseExecutionReportDataOptions {
  initialSelectedRunId?: string | null;
  applicationId?: string;
}

type ProjectFilter = 'all' | 'unassigned' | string;

interface ProjectFilterOption {
  value: ProjectFilter;
  label: string;
  count: number;
}

const VALID_RUN_FILTERS: ReadonlySet<RunFilter> = new Set([
  'all',
  'active',
  'passed',
  'unstable',
  'failed',
  'no-tests',
]);

function parseRunFilter(value: unknown): RunFilter {
  return typeof value === 'string' && VALID_RUN_FILTERS.has(value as RunFilter)
    ? (value as RunFilter)
    : 'all';
}

function decodeUserIdFromAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('auth_token');
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const payloadSegment = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = payloadSegment.padEnd(Math.ceil(payloadSegment.length / 4) * 4, '=');
    const payload = JSON.parse(window.atob(paddedPayload)) as Record<string, unknown>;
    const candidate = payload.userId ?? payload.sub ?? payload.id;
    return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : null;
  } catch {
    return null;
  }
}

function resolveFilterUserId(authUserId: string | null | undefined): string {
  if (typeof authUserId === 'string' && authUserId.trim().length > 0) {
    return authUserId.trim();
  }
  return decodeUserIdFromAuthToken() || 'anonymous';
}

export function useExecutionReportData({ initialSelectedRunId, applicationId }: UseExecutionReportDataOptions) {
  const [activeSource, setActiveSource] = useState<ExecutionSource>('github');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [runSearch, setRunSearch] = useState('');
  const [runFilter, setRunFilter] = useState<RunFilter>('all');
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('all');
  const [preparingAllureRunId, setPreparingAllureRunId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'info' | 'error'; text: string } | null>(null);
  const didLoadPersistedFilters = useRef(false);

  const authUserId = useAuthStore((state) => state.user?.id || null);
  const filterUserId = useMemo(() => resolveFilterUserId(authUserId), [authUserId]);
  const filterStorageKey = useMemo(
    () => `execution-report-filters:v1:${filterUserId}`,
    [filterUserId]
  );

  const localExecutions = useLocalExecutionStore((state) => state.executions);
  const fetchLocalExecutions = useLocalExecutionStore((state) => state.fetchExecutions);
  const removeExecution = useLocalExecutionStore((state) => state.removeExecution);

  const githubExecutions = useGitHubExecutionStore((state) => state.executions);
  const addExecution = useGitHubExecutionStore((state) => state.addExecution);
  const updateExecution = useGitHubExecutionStore((state) => state.updateExecution);
  const removeGitHubExecution = useGitHubExecutionStore((state) => state.removeExecution);

  const fetchGitHubRuns = useCallback(async () => {
    try {
      const { useRunConfigStore } = await import('@/store/runConfigStore');
      const config = useRunConfigStore.getState().getActiveConfig();
      const repoStr = config?.github?.repository;
      if (!repoStr) return;
      const parts = repoStr.split('/').filter(Boolean);
      if (parts.length !== 2) return;
      const [owner, repo] = parts;

      const response = await fetch(`/api/github/runs?owner=${owner}&repo=${repo}&limit=20`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        if (body?.retryable) {
          return;
        }
        throw new Error(`Failed to fetch GitHub runs for ${owner}/${repo} (HTTP ${response.status})`);
      }

      const data = await response.json();
      if (!data.success || !Array.isArray(data.data)) return;

      for (const run of data.data) {
        const executionId = `github-${run.id}`;

        // Match by real id/runId first, then fall back to placeholder dispatch entries
        // (dispatch placeholders have id 'dispatch-...' and runId 0)
        const existing = githubExecutions.find((item) => item.id === executionId || item.runId === run.id)
          || githubExecutions.find(
            (item) =>
              item.id.startsWith('dispatch-') &&
              item.runId === 0 &&
              item.owner === owner &&
              item.repo === repo &&
              (item.status === 'queued' || item.status === 'in_progress')
          );

        const mapStatus = (status: string, conclusion: string | null): GitHubExecution['status'] => {
          if (status === 'in_progress') return 'in_progress';
          if (status === 'queued' || status === 'waiting') return 'queued';
          if (status === 'completed') {
            if (conclusion === 'failure' || conclusion === 'timed_out') return 'failed';
            if (conclusion === 'cancelled') return 'cancelled';
            return 'completed';
          }
          return 'completed';
        };

        const resolvedApplicationId = existing?.applicationId || applicationId;
        const resolvedProjectId = existing?.projectId;
        const resolvedProjectName =
          existing?.projectName || (resolvedProjectId ? resolvedProjectId : 'Unassigned');

        const mapped: Partial<GitHubExecution> = {
          id: executionId,
          runId: run.id,
          runNumber: run.runNumber,
          workflowName: run.name,
          status: mapStatus(run.status, run.conclusion),
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
          applicationId: resolvedApplicationId,
          projectId: resolvedProjectId,
          projectName: resolvedProjectName,
        };

        if (existing) {
          // If updating a dispatch placeholder, remove it and add as new with the real ID
          if (existing.id.startsWith('dispatch-')) {
            removeGitHubExecution(existing.id);
            addExecution(mapped as GitHubExecution);
          } else {
            updateExecution(existing.id, mapped);
          }
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
  }, [addExecution, applicationId, githubExecutions, removeGitHubExecution, updateExecution]);

  const refreshActiveSource = useCallback(async () => {
    if (activeSource === 'local') {
      await fetchLocalExecutions(applicationId);
    } else {
      await fetchGitHubRuns();
    }
  }, [activeSource, applicationId, fetchGitHubRuns, fetchLocalExecutions]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshActiveSource();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshActiveSource]);

  const handleDeleteExecution = useCallback(async (runId: string) => {
    if (!confirm('Delete this execution? This cannot be undone.')) return;
    try {
      await executionsApi.delete(runId);
      removeExecution(runId);
    } catch (error) {
      console.error('[ExecutionReportView] Failed to delete execution:', error);
      removeExecution(runId);
    }
  }, [removeExecution]);

  useEffect(() => {
    handleRefresh();
  }, [activeSource, handleRefresh]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshActiveSource().catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshActiveSource]);

  useEffect(() => {
    let nextRunSearch = '';
    let nextRunFilter: RunFilter = 'all';
    let nextProjectFilter: ProjectFilter = 'all';

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(filterStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            runSearch?: unknown;
            runFilter?: unknown;
            projectFilter?: unknown;
          };
          if (typeof parsed.runSearch === 'string') {
            nextRunSearch = parsed.runSearch;
          }
          nextRunFilter = parseRunFilter(parsed.runFilter);
          if (typeof parsed.projectFilter === 'string' && parsed.projectFilter.trim().length > 0) {
            nextProjectFilter = parsed.projectFilter.trim();
          }
        }
      } catch {
        // Ignore corrupted stored filter payloads.
      }
    }

    setRunSearch(nextRunSearch);
    setRunFilter(nextRunFilter);
    setProjectFilter(nextProjectFilter);
    didLoadPersistedFilters.current = true;
  }, [filterStorageKey]);

  useEffect(() => {
    if (!didLoadPersistedFilters.current) return;
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(
        filterStorageKey,
        JSON.stringify({
          runSearch,
          runFilter,
          projectFilter,
        })
      );
    } catch {
      // Ignore localStorage write failures.
    }
  }, [filterStorageKey, projectFilter, runFilter, runSearch]);

  const convertLocalToRunData = useCallback((exec: ExecutionWithDetails): RunData => {
    const startedAt = new Date(exec.startedAt);
    const durationMs =
      typeof exec.duration === 'number'
        ? exec.duration
        : exec.finishedAt
        ? new Date(exec.finishedAt).getTime() - new Date(exec.startedAt).getTime()
        : 0;

    const triggerType: RunData['triggerType'] =
      exec.triggeredBy.type === 'scheduled' || exec.triggeredBy.type === 'schedule'
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

    let localScenarioLineOffset = 0;
    const scenarios: ScenarioData[] = (exec.scenarios || []).map((scenario, scenarioIndex) => {
      const currentOffset = localScenarioLineOffset;
      const stepsArr = scenario.steps || [];
      localScenarioLineOffset += stepsArr.length;
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
        steps: stepsArr.map((step, stepIndex) => ({
          id: step.id || `${exec.id}-scenario-${scenarioIndex}-step-${stepIndex}`,
          number: step.stepNumber || stepIndex + 1,
          action: step.action,
          description: step.description,
          name: step.description || step.action || `Step ${step.stepNumber || stepIndex + 1}`,
          status: step.status,
          durationMs: step.duration,
          error: step.error,
          line: currentOffset + stepIndex + 1,
          page: (step as any).page,
          url: (step as any).url,
          screenshot: step.screenshot || (step.status === 'failed' ? scenario.screenshot : undefined),
        })),
      };
    });

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

    const matrixChildren: MatrixChildData[] | undefined = exec.isMatrixParent && exec.matrixChildren
      ? exec.matrixChildren.map((child) => ({
          id: child.id,
          label: child.label,
          status: child.status as MatrixChildData['status'],
          durationLabel: '-',
          metrics: {
            total: child.passedCount + child.failedCount + child.skippedCount,
            passed: child.passedCount,
            failed: child.failedCount,
            skipped: child.skippedCount,
          },
        }))
      : undefined;
    const projectName = exec.projectName || (exec.projectId ? exec.projectId : 'Unassigned');

    return {
      id: exec.id,
      source: 'local',
      applicationId: exec.applicationId,
      projectId: exec.projectId,
      projectName,
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
      isMatrixParent: exec.isMatrixParent,
      matrixChildren,
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

    let ghScenarioLineOffset = 0;
    const scenarios: ScenarioData[] = (exec.scenarios || []).map((scenario, scenarioIndex) => {
      const currentOffset = ghScenarioLineOffset;
      const stepsArr = Array.isArray(scenario.steps) ? scenario.steps : [];
      ghScenarioLineOffset += stepsArr.length;
      const scenarioSteps: StepData[] = stepsArr.map((step, stepIndex) => ({
        id: step.id || `${exec.id}-scenario-${scenarioIndex}-step-${stepIndex}`,
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
        line: currentOffset + stepIndex + 1,
        page: (step as any).page,
        url: (step as any).url,
        screenshot: step.screenshot || (step.status === 'failed' ? scenario.screenshot : undefined),
      }));

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
    const projectName = exec.projectName || (exec.projectId ? exec.projectId : 'Unassigned');

    return {
      id: exec.id,
      source: 'github',
      applicationId: exec.applicationId,
      projectId: exec.projectId,
      projectName,
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

    const applicationScopedRuns = applicationId
      ? runs.filter((run) => run.applicationId === applicationId)
      : runs;

    return applicationScopedRuns.sort((a, b) => {
      const aActive = a.state === 'running' || a.state === 'queued';
      const bActive = b.state === 'running' || b.state === 'queued';
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return b.startedAtMs - a.startedAtMs;
    });
  }, [activeSource, applicationId, convertGitHubToRunData, convertLocalToRunData, githubExecutions, localExecutions]);

  const runNumbers = useMemo(() => {
    const map = new Map<string, string>();
    sourceRuns.forEach((run, index) => {
      if (activeSource === 'local') {
        const apiExec = localExecutions.find(e => e.id === run.id);
        const num = apiExec?.runNumber || (sourceRuns.length - index);
        map.set(run.id, `Execution ${num}`);
      } else {
        map.set(run.id, `Execution ${sourceRuns.length - index}`);
      }
    });
    return map;
  }, [activeSource, localExecutions, sourceRuns]);

  const projectFilterOptions = useMemo<ProjectFilterOption[]>(() => {
    const countsByProjectId = new Map<string, { label: string; count: number }>();
    let unassignedCount = 0;

    for (const run of sourceRuns) {
      if (run.projectId) {
        const existing = countsByProjectId.get(run.projectId);
        if (existing) {
          existing.count += 1;
        } else {
          countsByProjectId.set(run.projectId, {
            label: run.projectName || run.projectId,
            count: 1,
          });
        }
      } else {
        unassignedCount += 1;
      }
    }

    const projectOptions = Array.from(countsByProjectId.entries())
      .map(([value, payload]) => ({
        value,
        label: payload.label,
        count: payload.count,
      }))
      .sort((left, right) => left.label.localeCompare(right.label));

    return [
      { value: 'all', label: 'All', count: sourceRuns.length },
      ...projectOptions,
      { value: 'unassigned', label: 'Unassigned', count: unassignedCount },
    ];
  }, [sourceRuns]);

  useEffect(() => {
    const allowedValues = new Set(projectFilterOptions.map((option) => option.value));
    if (!allowedValues.has(projectFilter)) {
      setProjectFilter('all');
    }
  }, [projectFilter, projectFilterOptions]);

  const filteredRuns = useMemo(() => {
    const query = runSearch.trim().toLowerCase();
    return sourceRuns.filter((run) => {
      if (runFilter === 'active' && !(run.state === 'running' || run.state === 'queued')) return false;
      if (runFilter === 'passed' && run.outcome !== 'passed') return false;
      if (runFilter === 'unstable' && run.outcome !== 'unstable') return false;
      if (runFilter === 'failed' && run.outcome !== 'failed' && run.state !== 'error') return false;
      if (runFilter === 'no-tests' && run.outcome !== 'no-tests') return false;
      if (projectFilter === 'unassigned' && run.projectId) return false;
      if (projectFilter !== 'all' && projectFilter !== 'unassigned' && run.projectId !== projectFilter) return false;
      if (!query) return true;

      const numberLabel = runNumbers.get(run.id) || run.id;
      const haystack = [
        numberLabel,
        run.title,
        run.projectName,
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
  }, [projectFilter, runFilter, runNumbers, runSearch, sourceRuns]);

  // Honor external navigation (e.g. from Scheduler "Open Report")
  useEffect(() => {
    if (!initialSelectedRunId) return;
    setActiveSource(initialSelectedRunId.startsWith('github-') ? 'github' : 'local');
  }, [initialSelectedRunId]);

  const openAllureForRun = useCallback(
    async (run: RunData) => {
      setPreparingAllureRunId(run.id);
      setMessage({ type: 'info', text: 'Opening execution report...' });
      try {
        if (run.source === 'github' && run.runId && run.owner && run.repo) {
          const statusResponse = await fetchWithTimeout(`/api/github/runs/${run.runId}/allure/status`, {
            headers: getAuthHeaders(),
          });
          const statusData = await statusResponse.json().catch(() => ({}));

          if (statusResponse.ok && statusData.success && statusData.data?.ready && statusData.data?.reportUrl) {
            window.open(toBackendUrl(statusData.data.reportUrl), '_blank', 'noopener,noreferrer');
            return;
          }

          const prepareResponse = await fetchWithTimeout(`/api/github/runs/${run.runId}/allure/prepare`, {
            method: 'POST',
            headers: getAuthHeaders(true),
            body: JSON.stringify({ owner: run.owner, repo: run.repo }),
          });
          const prepareData = await prepareResponse.json().catch(() => ({}));

          if (prepareResponse.ok && prepareData.success && prepareData.data?.reportUrl) {
            window.open(toBackendUrl(prepareData.data.reportUrl), '_blank', 'noopener,noreferrer');
            return;
          }

          if (run.allureUrl) {
            window.open(toBackendUrl(run.allureUrl), '_blank', 'noopener,noreferrer');
            return;
          }

          throw new Error(prepareData.error || 'Unable to prepare report for this run');
        }

        if (run.source === 'local') {
          const candidateExecutionIds = Array.from(
            new Set(
              run.isMatrixParent && run.matrixChildren && run.matrixChildren.length > 0
                ? [run.id, ...run.matrixChildren.map((child) => child.id)]
                : [run.id]
            )
          );

          let sawAllureNotFound = false;
          let lastError: string | null = null;

          for (const executionId of candidateExecutionIds) {
            const statusResponse = await fetchWithTimeout(
              `/api/executions/local/allure/status?executionId=${encodeURIComponent(executionId)}`,
              { headers: getAuthHeaders() }
            );
            const statusData = await statusResponse.json().catch(() => ({}));

            if (!statusResponse.ok) {
              if (typeof statusData.error === 'string' && statusData.error.trim()) {
                lastError = statusData.error;
              }
              continue;
            }

            if (statusData.success && statusData.data?.ready && statusData.data?.reportUrl) {
              window.open(toBackendUrl(statusData.data.reportUrl), '_blank', 'noopener,noreferrer');
              return;
            }

            const generateResponse = await fetchWithTimeout('/api/executions/local/allure/generate', {
              method: 'POST',
              headers: getAuthHeaders(true),
              body: JSON.stringify({ executionId }),
            });
            const generateData = await generateResponse.json().catch(() => ({}));

            if (generateResponse.ok && generateData.success && generateData.data?.reportUrl) {
              window.open(toBackendUrl(generateData.data.reportUrl), '_blank', 'noopener,noreferrer');
              return;
            }

            if (
              generateData.code === 'ALLURE_RESULTS_NOT_FOUND'
              || (typeof generateData.error === 'string' && generateData.error.includes('No allure-results found'))
            ) {
              sawAllureNotFound = true;
              continue;
            }

            if (typeof generateData.error === 'string' && generateData.error.trim()) {
              lastError = generateData.error;
            }
          }

          if (sawAllureNotFound) {
            if (run.metrics.total === 0) {
              throw new Error('No tests were executed for this run, so no Allure report was generated.');
            }
            throw new Error('Allure report unavailable for this execution. Re-run this execution to generate Allure artifacts.');
          }

          throw new Error(lastError || 'Unable to generate local report');
        }
      } catch (error) {
        let errorText = 'Failed to open report';
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          errorText = 'Backend server is unreachable. Make sure the server is running.';
        } else if (error instanceof DOMException && error.name === 'AbortError') {
          errorText = 'Request timed out. The server may be starting up — please try again.';
        } else if (error instanceof Error) {
          errorText = error.message;
        }
        setMessage({ type: 'error', text: errorText });
      } finally {
        setPreparingAllureRunId(null);
      }
    },
    []
  );

  const summary = useMemo(() => {
    const runs = sourceRuns;
    const scopedLocalExecutions = applicationId
      ? localExecutions.filter((execution) => execution.applicationId === applicationId)
      : localExecutions;
    const maxApiRunNumber = activeSource === 'local'
      ? Math.max(...scopedLocalExecutions.map((execution) => execution.runNumber || 0), 0)
      : 0;
    return {
      total: maxApiRunNumber > runs.length ? maxApiRunNumber : runs.length,
      passed: runs.filter((run) => run.outcome === 'passed').length,
      failed: runs.filter((run) => run.outcome === 'failed' || run.state === 'error').length,
      active: runs.filter((run) => run.state === 'running' || run.state === 'queued').length,
    };
  }, [activeSource, applicationId, localExecutions, sourceRuns]);

  return {
    activeSource,
    setActiveSource,
    isRefreshing,
    handleRefresh,
    handleDeleteExecution,
    runSearch,
    setRunSearch,
    runFilter,
    setRunFilter,
    projectFilter,
    setProjectFilter,
    projectFilterOptions,
    filteredRuns,
    runNumbers,
    summary,
    openAllureForRun,
    preparingAllureRunId,
    message,
  };
}
