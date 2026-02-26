import type { ApiResponse } from '@playwright-web-app/shared';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

export class ApiError extends Error {
  status?: number;
  endpoint: string;

  constructor(message: string, endpoint: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.endpoint = endpoint;
    this.status = status;
  }
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Merge existing headers if provided
    if (options.headers) {
      const existingHeaders = options.headers as Record<string, string>;
      Object.assign(headers, existingHeaders);
    }

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: options.credentials ?? 'include',
      });
    } catch {
      throw new ApiError(
        'Unable to reach the server. Please check your connection and try again.',
        endpoint
      );
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      if (!response.ok) {
        if (response.status >= 500) {
          throw new ApiError(
            'Server is temporarily unavailable. Please try again in a moment.',
            endpoint,
            response.status
          );
        }
        throw new ApiError(`Request failed with status ${response.status}`, endpoint, response.status);
      }
      return undefined as T;
    }

    // Parse JSON response
    let data: ApiResponse<T>;
    try {
      data = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw new ApiError(
          response.status >= 500
            ? 'Server returned an invalid response. Please try again in a moment.'
            : `Request failed with status ${response.status}`,
          endpoint,
          response.status
        );
      }
      throw new ApiError(`Invalid JSON response: ${text.substring(0, 100)}`, endpoint, response.status);
    }

    if (!response.ok || !data.success) {
      throw new ApiError(
        data.error || `Request failed with status ${response.status}`,
        endpoint,
        response.status
      );
    }

    return data.data as T;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
