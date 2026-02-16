export type ExecutionSource = 'local' | 'github';
export type RunState = 'queued' | 'running' | 'completed' | 'canceled' | 'error';
export type RunOutcome = 'passed' | 'unstable' | 'failed' | 'no-tests' | null;
export type RunFilter = 'all' | 'active' | 'passed' | 'unstable' | 'failed' | 'no-tests';

export interface StepData {
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

export interface ScenarioData {
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

export interface MatrixChildData {
  id: string;
  label: string;
  status: 'passed' | 'failed' | 'running' | 'pending' | 'skipped';
  durationLabel: string;
  metrics: { total: number; passed: number; failed: number; skipped: number };
}

export interface RunData {
  id: string;
  source: ExecutionSource;
  applicationId?: string;
  projectId?: string;
  projectName: string;
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
  isMatrixParent?: boolean;
  matrixChildren?: MatrixChildData[];
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
