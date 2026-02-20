import { apiClient } from './client';
import type {
  RunConfiguration,
  RunConfigurationCreate,
  RunConfigurationUpdate,
} from '@playwright-web-app/shared';

// ============================================
// RUN CONFIGURATIONS
// ============================================

export const runConfigurationApi = {
  getAll: (workflowId: string, projectId?: string) =>
    apiClient.get<RunConfiguration[]>(
      `/workflows/${workflowId}/run-configurations${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`
    ),

  getOne: (id: string) =>
    apiClient.get<RunConfiguration>(`/run-configurations/${id}`),

  create: (workflowId: string, data: RunConfigurationCreate, projectId?: string) =>
    apiClient.post<RunConfiguration>(`/workflows/${workflowId}/run-configurations`, {
      ...data,
      projectId: projectId ?? data.projectId,
    }),

  update: (id: string, data: RunConfigurationUpdate) =>
    apiClient.put<RunConfiguration>(`/run-configurations/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<void>(`/run-configurations/${id}`),

  duplicate: (id: string, name: string) =>
    apiClient.post<RunConfiguration>(`/run-configurations/${id}/duplicate`, { name }),
};

