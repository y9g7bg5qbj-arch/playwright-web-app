/**
 * API client for Run Parameters (definitions + sets)
 */

import type {
  RunParameterDefinition,
  RunParameterDefinitionCreate,
  RunParameterDefinitionUpdate,
  RunParameterSet,
  RunParameterSetCreate,
  RunParameterSetUpdate,
} from '@playwright-web-app/shared';

const API_BASE = '/api/applications';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'API request failed');
  }
  return data.data;
}

export const runParametersApi = {
  // ============================================
  // DEFINITIONS
  // ============================================

  async getDefinitions(applicationId: string): Promise<RunParameterDefinition[]> {
    const response = await fetch(`${API_BASE}/${applicationId}/run-parameters/definitions`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<RunParameterDefinition[]>(response);
  },

  async createDefinition(
    applicationId: string,
    data: RunParameterDefinitionCreate
  ): Promise<RunParameterDefinition> {
    const response = await fetch(`${API_BASE}/${applicationId}/run-parameters/definitions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<RunParameterDefinition>(response);
  },

  async updateDefinition(
    applicationId: string,
    id: string,
    data: RunParameterDefinitionUpdate
  ): Promise<RunParameterDefinition> {
    const response = await fetch(`${API_BASE}/${applicationId}/run-parameters/definitions/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<RunParameterDefinition>(response);
  },

  async deleteDefinition(applicationId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${applicationId}/run-parameters/definitions/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    await handleResponse<void>(response);
  },

  async reorderDefinitions(applicationId: string, orderedIds: string[]): Promise<RunParameterDefinition[]> {
    const response = await fetch(`${API_BASE}/${applicationId}/run-parameters/definitions/reorder`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ orderedIds }),
    });
    return handleResponse<RunParameterDefinition[]>(response);
  },

  // ============================================
  // SETS
  // ============================================

  async getSets(applicationId: string): Promise<RunParameterSet[]> {
    const response = await fetch(`${API_BASE}/${applicationId}/run-parameters/sets`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<RunParameterSet[]>(response);
  },

  async createSet(applicationId: string, data: RunParameterSetCreate): Promise<RunParameterSet> {
    const response = await fetch(`${API_BASE}/${applicationId}/run-parameters/sets`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<RunParameterSet>(response);
  },

  async updateSet(applicationId: string, id: string, data: RunParameterSetUpdate): Promise<RunParameterSet> {
    const response = await fetch(`${API_BASE}/${applicationId}/run-parameters/sets/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<RunParameterSet>(response);
  },

  async deleteSet(applicationId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${applicationId}/run-parameters/sets/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    await handleResponse<void>(response);
  },

  async cloneSet(applicationId: string, id: string): Promise<RunParameterSet> {
    const response = await fetch(`${API_BASE}/${applicationId}/run-parameters/sets/${id}/clone`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<RunParameterSet>(response);
  },
};
