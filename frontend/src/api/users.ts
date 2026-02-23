import { apiClient } from './client';
import type { User, UserRole } from '@playwright-web-app/shared';

export const usersApi = {
  listUsers: () =>
    apiClient.get<User[]>('/users'),

  createUser: (data: { name: string; email: string; role: UserRole }) =>
    apiClient.post<User>('/users', data),

  updateUserRole: (userId: string, role: UserRole) =>
    apiClient.put<User>(`/users/${userId}/role`, { role }),
};
