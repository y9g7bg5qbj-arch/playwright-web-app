import { apiClient } from './client';
import type { User, UserCreate, UserLogin, AuthResponse } from '@playwright-web-app/shared';

export const authApi = {
  register: (data: UserCreate) =>
    apiClient.post<AuthResponse>('/auth/register', data),

  login: (data: UserLogin) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  getMe: () =>
    apiClient.get<User>('/auth/me'),
};
