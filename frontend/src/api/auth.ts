import { apiClient } from './client';
import type { User, UserCreate, UserLogin, AuthResponse } from '@playwright-web-app/shared';

export const authApi = {
  register: (data: UserCreate) =>
    apiClient.post<AuthResponse>('/auth/register', data),

  login: (data: UserLogin) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  getMe: () =>
    apiClient.get<User>('/auth/me'),

  validateToken: (token: string) =>
    apiClient.get<{ user: { name: string; role: string }; type: 'welcome' | 'reset' }>(`/auth/validate-token/${token}`),

  setPassword: (data: { token: string; password: string }) =>
    apiClient.post<{ message: string }>('/auth/set-password', data),

  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }>('/auth/forgot-password', { email }),

  resetPassword: (data: { token: string; password: string }) =>
    apiClient.post<{ message: string }>('/auth/reset-password', data),

  completeOnboarding: () =>
    apiClient.put<{ message: string }>('/auth/onboarding-complete'),
};
