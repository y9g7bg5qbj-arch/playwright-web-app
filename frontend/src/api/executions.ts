import { apiClient } from './client';

export interface ExecutionScenario {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  traceUrl?: string;
  screenshot?: string;
  steps?: Array<{
    id: string;
    stepNumber: number;
    action: string;
    description?: string;
    status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
    duration?: number;
    error?: string;
    screenshot?: string;
  }>;
}

export interface ExecutionWithDetails {
  id: string;
  testFlowId: string;
  applicationId?: string;
  projectId?: string;
  projectName?: string;
  testFlowName: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';
  target: 'local' | 'remote';
  triggeredBy: {
    type: 'user' | 'scheduled' | 'api' | 'webhook' | 'manual' | 'schedule';
    name?: string;
  };
  startedAt: string;
  finishedAt?: string;
  stepCount: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  duration?: number;
  runNumber?: number;
  startupFailure?: boolean;
  startupErrorSummary?: string;
  scenarios?: ExecutionScenario[];
  isMatrixParent?: boolean;
  matrixLabel?: string;
  matrixChildren?: Array<{
    id: string;
    label: string;
    status: string;
    passedCount: number;
    failedCount: number;
    skippedCount: number;
  }>;
}

export const executionsApi = {
  delete: (id: string) =>
    apiClient.delete(`/executions/${id}`),

  // Get recent executions across all flows
  getRecent: (limit = 200, applicationId?: string) => {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (typeof applicationId === 'string' && applicationId.trim().length > 0) {
      params.set('applicationId', applicationId.trim());
    }
    return apiClient.get<ExecutionWithDetails[]>(`/executions/recent?${params.toString()}`);
  },
};
