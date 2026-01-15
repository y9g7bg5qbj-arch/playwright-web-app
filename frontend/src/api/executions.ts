import { apiClient } from './client';
import type { Execution, ExecutionCreate } from '@playwright-web-app/shared';

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
  testFlowName: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';
  target: 'local' | 'remote';
  triggeredBy: {
    type: 'user' | 'scheduled' | 'api' | 'webhook';
    name?: string;
  };
  startedAt: string;
  finishedAt?: string;
  stepCount: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  duration?: number;
  scenarios?: ExecutionScenario[];
}

export interface ExecutionStep {
  id: string;
  stepNumber: number;
  action: string;
  description?: string;
  selector?: string;
  selectorName?: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  screenshot?: string;
  traceUrl?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface ExecutionFull extends ExecutionWithDetails {
  steps: ExecutionStep[];
  logs: { id: string; message: string; level: string; timestamp: string }[];
  artifacts: {
    traces: string[];
    screenshots: string[];
    videos: string[];
  };
  shards?: {
    id: string;
    shardIndex: number;
    totalShards: number;
    status: string;
    currentTest?: string;
  }[];
}

export const executionsApi = {
  getAll: (testFlowId: string) =>
    apiClient.get<Execution[]>(`/executions/test-flow/${testFlowId}`),

  getOne: (id: string) =>
    apiClient.get<Execution>(`/executions/${id}`),

  create: (testFlowId: string, data: ExecutionCreate) =>
    apiClient.post<Execution>(`/executions/test-flow/${testFlowId}`, data),

  delete: (id: string) =>
    apiClient.delete(`/executions/${id}`),

  // Get recent executions across all flows
  getRecent: (limit = 200) =>
    apiClient.get<ExecutionWithDetails[]>(`/executions/recent?limit=${limit}`),

  // Get full execution details including steps, logs, and artifacts
  getDetails: (id: string) =>
    apiClient.get<ExecutionFull>(`/executions/${id}/full`),
};
