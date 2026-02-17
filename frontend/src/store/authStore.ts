import { create } from 'zustand';
import type { User } from '@playwright-web-app/shared';
import { apiClient } from '@/api/client';
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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  login: async (email, password) => {
    try {
      set({ error: null });
      const response = await authApi.login({ email, password });
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
    try {
      const token = apiClient.getToken();
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      const user = await authApi.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      apiClient.setToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
