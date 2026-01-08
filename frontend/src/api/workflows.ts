import { apiClient } from './client';
import type { Workflow, WorkflowCreate, WorkflowUpdate } from '@playwright-web-app/shared';

export const workflowsApi = {
  getAll: (applicationId?: string) => {
    // Support both applicationId and legacy projectId
    const params = applicationId ? `?applicationId=${encodeURIComponent(applicationId)}` : '';
    return apiClient.get<Workflow[]>(`/workflows${params}`);
  },

  getOne: (id: string) =>
    apiClient.get<Workflow>(`/workflows/${id}`),

  create: (data: WorkflowCreate) =>
    apiClient.post<Workflow>('/workflows', data),

  update: (id: string, data: WorkflowUpdate) =>
    apiClient.put<Workflow>(`/workflows/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/workflows/${id}`),
};
