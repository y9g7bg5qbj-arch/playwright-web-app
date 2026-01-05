import { create } from 'zustand';
import type { User } from '@playwright-web-app/shared';
import { apiClient } from '@/api/client';
import { authApi } from '@/api/auth';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const response = await authApi.login({ email, password });
    apiClient.setToken(response.token);
    set({ user: response.user, isAuthenticated: true });
  },

  register: async (email, password, name) => {
    const response = await authApi.register({ email, password, name });
    apiClient.setToken(response.token);
    set({ user: response.user, isAuthenticated: true });
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
