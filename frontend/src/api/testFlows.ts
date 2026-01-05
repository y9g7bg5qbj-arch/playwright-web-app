import { apiClient } from './client';
import type { TestFlow, TestFlowCreate, TestFlowUpdate } from '@playwright-web-app/shared';

export const testFlowsApi = {
  getAll: (workflowId: string) =>
    apiClient.get<TestFlow[]>(`/test-flows/workflow/${workflowId}`),

  getOne: (id: string) =>
    apiClient.get<TestFlow>(`/test-flows/${id}`),

  create: (workflowId: string, data: TestFlowCreate) =>
    apiClient.post<TestFlow>(`/test-flows/workflow/${workflowId}`, data),

  update: (id: string, data: TestFlowUpdate) =>
    apiClient.put<TestFlow>(`/test-flows/${id}`, data),

  clone: (id: string) =>
    apiClient.post<TestFlow>(`/test-flows/${id}/clone`),

  delete: (id: string) =>
    apiClient.delete(`/test-flows/${id}`),
};
