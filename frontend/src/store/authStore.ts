import { create } from 'zustand';
import type { User } from '@playwright-web-app/shared';
import { apiClient, ApiError } from '@/api/client';
import { authApi } from '@/api/auth';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const LOGIN_RETRY_DELAY_MS = 400;

const isRetryableLoginError = (error: unknown): boolean => {
  if (!(error instanceof ApiError)) {
    return false;
  }
  if (error.status == null) {
    return true;
  }
  return error.status >= 500;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  login: async (email, password) => {
    try {
      set({ error: null });

      let response: Awaited<ReturnType<typeof authApi.login>> | null = null;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          response = await authApi.login({ email, password });
          break;
        } catch (error) {
          if (attempt === 0 && isRetryableLoginError(error)) {
            await new Promise((resolve) => setTimeout(resolve, LOGIN_RETRY_DELAY_MS));
            continue;
          }
          throw error;
        }
      }

      if (!response) {
        throw new Error('Login failed');
      }

      apiClient.setToken(response.token);
      set({ user: response.user, isAuthenticated: true });
    } catch (error) {
      set({ isAuthenticated: false, user: null, error: error instanceof Error ? error.message : 'Login failed' });
      throw error;
    }
  },

  register: async (email, password, name) => {
    try {
      set({ error: null });
      const response = await authApi.register({ email, password, name });
      apiClient.setToken(response.token);
      set({ user: response.user, isAuthenticated: true });
    } catch (error) {
      set({ isAuthenticated: false, user: null, error: error instanceof Error ? error.message : 'Registration failed' });
      throw error;
    }
  },

  logout: () => {
    apiClient.setToken(null);
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = apiClient.getToken();
    if (!token) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      return;
    }

    try {
      const user = await authApi.getMe();
      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch (error) {
      const status = error instanceof ApiError ? error.status : undefined;
      const isUnauthorized = status === 401 || status === 403;

      if (isUnauthorized) {
        apiClient.setToken(null);
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      // Keep current auth state on transient/server failures.
      set((state) => ({
        user: state.user,
        isAuthenticated: Boolean(state.user),
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication check failed',
      }));
    }
  },
}));
