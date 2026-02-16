/**
 * API client for Application Environments (Postman-style)
 */

const API_BASE = '/api/applications';

// Types
export interface EnvVariable {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppEnvironment {
  id: string;
  applicationId: string;
  name: string;
  isActive: boolean;
  variables: EnvVariable[];
  createdAt: string;
  updatedAt: string;
}

export interface ActiveEnvironment extends AppEnvironment {
  variablesMap: Record<string, string>;
}

// Helper to get auth headers
function getHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Handle API response
async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'API request failed');
  }
  return data.data;
}

// API functions
export const environmentsApi = {
  /**
   * List all environments for an application
   */
  async getAll(applicationId: string): Promise<AppEnvironment[]> {
    const response = await fetch(`${API_BASE}/${applicationId}/environments`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<AppEnvironment[]>(response);
  },

  /**
   * Get the active environment with unmasked values
   */
  async getActive(applicationId: string): Promise<ActiveEnvironment | null> {
    const response = await fetch(`${API_BASE}/${applicationId}/environments/active`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<ActiveEnvironment | null>(response);
  },

  /**
   * Create a new environment
   */
  async create(
    applicationId: string,
    data: { name: string; variables?: { key: string; value: string; isSecret?: boolean }[] }
  ): Promise<AppEnvironment> {
    const response = await fetch(`${API_BASE}/${applicationId}/environments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<AppEnvironment>(response);
  },

  /**
   * Update an environment
   */
  async update(applicationId: string, envId: string, data: { name?: string }): Promise<AppEnvironment> {
    const response = await fetch(`${API_BASE}/${applicationId}/environments/${envId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<AppEnvironment>(response);
  },

  /**
   * Delete an environment
   */
  async delete(applicationId: string, envId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${applicationId}/environments/${envId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    await handleResponse<void>(response);
  },

  /**
   * Set an environment as active
   */
  async activate(applicationId: string, envId: string): Promise<AppEnvironment> {
    const response = await fetch(`${API_BASE}/${applicationId}/environments/${envId}/activate`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<AppEnvironment>(response);
  },

  /**
   * Add a variable to an environment
   */
  async addVariable(
    applicationId: string,
    envId: string,
    data: { key: string; value: string; isSecret?: boolean }
  ): Promise<EnvVariable> {
    const response = await fetch(`${API_BASE}/${applicationId}/environments/${envId}/variables`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<EnvVariable>(response);
  },

  /**
   * Update a variable
   */
  async updateVariable(
    applicationId: string,
    envId: string,
    varId: string,
    data: { key?: string; value?: string; isSecret?: boolean }
  ): Promise<EnvVariable> {
    const response = await fetch(`${API_BASE}/${applicationId}/environments/${envId}/variables/${varId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<EnvVariable>(response);
  },

  /**
   * Delete a variable
   */
  async deleteVariable(applicationId: string, envId: string, varId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${applicationId}/environments/${envId}/variables/${varId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    await handleResponse<void>(response);
  },
};
