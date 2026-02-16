import type { RunData, RunState, RunOutcome, ScenarioData } from './executionReportTypes';

export function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatDurationMs(ms?: number): string {
  if (!ms || ms <= 0) return '0s';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

export function extractVeroScenarioName(playwrightName: string): string {
  if (!playwrightName) return 'Scenario';

  const parts = playwrightName.split('>').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    return toTitleCase(parts[parts.length - 1]);
  }

  const cleaned = playwrightName.replace(/[._-]/g, ' ').trim();
  return cleaned.endsWith('.vero') ? cleaned : toTitleCase(cleaned);
}

export function getAuthHeaders(json = false): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = json ? { 'Content-Type': 'application/json' } : {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function getBackendOrigin(): string {
  if (typeof window === 'undefined') return '';
  const { protocol, hostname, port, origin } = window.location;
  if (port === '5173' || port === '5174' || port === '5175' || port === '5176') {
    return `${protocol}//${hostname}:3000`;
  }
  return origin;
}

export function toBackendUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const base = getBackendOrigin();
  if (!base) return url;
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}

const REQUEST_TIMEOUT_MS = 15000;

export async function fetchWithTimeout(
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

function isFlakyScenario(scenario: ScenarioData): boolean {
  return typeof scenario.retries === 'number' && scenario.retries > 0;
}

export function computeRunMetrics(
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

export function deriveRunOutcome(state: RunState, metrics: RunData['metrics']): RunOutcome {
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

export function getRunStatusBadge(run: RunData): { label: string; className: string } {
  if (run.state === 'running') {
    return { label: 'RUNNING', className: 'bg-badge-running-bg text-badge-running-text border-badge-running-border' };
  }
  if (run.state === 'queued') {
    return { label: 'QUEUED', className: 'bg-badge-queued-bg text-badge-queued-text border-badge-queued-border' };
  }
  if (run.state === 'canceled') {
    return { label: 'CANCELED', className: 'bg-badge-canceled-bg text-badge-canceled-text border-badge-canceled-border' };
  }
  if (run.state === 'error') {
    return { label: 'ERROR', className: 'bg-badge-error-bg text-badge-error-text border-badge-error-border' };
  }

  if (run.outcome === 'passed') {
    return { label: 'PASSED', className: 'bg-badge-passed-bg text-badge-passed-text border-badge-passed-border' };
  }
  if (run.outcome === 'unstable') {
    return { label: 'UNSTABLE', className: 'bg-badge-unstable-bg text-badge-unstable-text border-badge-unstable-border' };
  }
  if (run.outcome === 'failed') {
    return { label: 'FAILED', className: 'bg-badge-error-bg text-badge-error-text border-badge-error-border' };
  }
  if (run.outcome === 'no-tests') {
    return { label: 'NO TESTS', className: 'bg-badge-neutral-bg text-badge-neutral-text border-badge-neutral-border' };
  }

  return { label: 'COMPLETED', className: 'bg-badge-neutral-bg text-badge-neutral-text border-badge-neutral-border' };
}
