import { apiClient } from './client';
import type {
  RunConfiguration,
  RunConfigurationCreate,
  RunConfigurationUpdate,
  ExecutionEnvironment,
  ExecutionEnvironmentCreate,
  ExecutionEnvironmentUpdate,
  RemoteRunner,
  RemoteRunnerCreate,
  RemoteRunnerUpdate,
  StoredCredential,
  StoredCredentialCreate,
} from '@playwright-web-app/shared';

// ============================================
// RUN CONFIGURATIONS
// ============================================

export const runConfigurationApi = {
  getAll: (workflowId: string) =>
    apiClient.get<RunConfiguration[]>(`/workflows/${workflowId}/run-configurations`),

  getOne: (id: string) =>
    apiClient.get<RunConfiguration>(`/run-configurations/${id}`),

  create: (workflowId: string, data: RunConfigurationCreate) =>
    apiClient.post<RunConfiguration>(`/workflows/${workflowId}/run-configurations`, data),

  update: (id: string, data: RunConfigurationUpdate) =>
    apiClient.put<RunConfiguration>(`/run-configurations/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<void>(`/run-configurations/${id}`),

  duplicate: (id: string, name: string) =>
    apiClient.post<RunConfiguration>(`/run-configurations/${id}/duplicate`, { name }),
};

// ============================================
// EXECUTION ENVIRONMENTS
// ============================================

export const environmentApi = {
  getAll: (workflowId: string) =>
    apiClient.get<ExecutionEnvironment[]>(`/workflows/${workflowId}/environments`),

  getOne: (id: string) =>
    apiClient.get<ExecutionEnvironment>(`/environments/${id}`),

  create: (workflowId: string, data: ExecutionEnvironmentCreate) =>
    apiClient.post<ExecutionEnvironment>(`/workflows/${workflowId}/environments`, data),

  update: (id: string, data: ExecutionEnvironmentUpdate) =>
    apiClient.put<ExecutionEnvironment>(`/environments/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<void>(`/environments/${id}`),
};

// ============================================
// REMOTE RUNNERS
// ============================================

export const runnerApi = {
  getAll: (workflowId: string) =>
    apiClient.get<RemoteRunner[]>(`/workflows/${workflowId}/runners`),

  getOne: (id: string) =>
    apiClient.get<RemoteRunner>(`/runners/${id}`),

  create: (workflowId: string, data: RemoteRunnerCreate) =>
    apiClient.post<RemoteRunner>(`/workflows/${workflowId}/runners`, data),

  update: (id: string, data: RemoteRunnerUpdate) =>
    apiClient.put<RemoteRunner>(`/runners/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<void>(`/runners/${id}`),

  ping: (id: string) =>
    apiClient.post<{ healthy: boolean; message?: string }>(`/runners/${id}/ping`),
};

// ============================================
// STORED CREDENTIALS
// ============================================

export const credentialApi = {
  getAll: (workflowId: string) =>
    apiClient.get<StoredCredential[]>(`/workflows/${workflowId}/credentials`),

  create: (workflowId: string, data: StoredCredentialCreate) =>
    apiClient.post<StoredCredential>(`/workflows/${workflowId}/credentials`, data),

  delete: (id: string) =>
    apiClient.delete<void>(`/credentials/${id}`),
};

// ============================================
// TAGS
// ============================================

export const tagApi = {
  getAll: (workflowId: string) =>
    apiClient.get<string[]>(`/workflows/${workflowId}/tags`),

  updateFlowTags: (flowId: string, tags: string[]) =>
    apiClient.put<string[]>(`/test-flows/${flowId}/tags`, { tags }),

  filterFlows: (
    workflowId: string,
    filters: { tags?: string[]; tagMode?: 'any' | 'all'; excludeTags?: string[]; testFlowIds?: string[] }
  ) =>
    apiClient.post<string[]>(`/workflows/${workflowId}/filter-flows`, filters),
};
