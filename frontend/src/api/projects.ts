import { apiClient } from './client';
import type {
  Application,
  ApplicationCreate,
  ApplicationUpdate,
  ApplicationMemberCreate,
  ApplicationMember,
  Project,
  ProjectCreate,
  ProjectUpdate,
} from '@playwright-web-app/shared';

// Note: "Project" in projectStore is actually "Application" (top-level container)
// The naming was kept for backwards compatibility with the store

export const projectsApi = {
  // Get all applications (owned + member of)
  getAll: async (): Promise<Application[]> => {
    const response = await apiClient.get<{ success: boolean; data: Application[] }>('/applications');
    // Handle wrapped response format
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as any).data;
    }
    return response as Application[];
  },

  // Get a single application by ID
  getById: async (id: string): Promise<Application> => {
    const response = await apiClient.get<{ success: boolean; data: Application }>(`/applications/${id}`);
    // Handle wrapped response format
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as any).data;
    }
    return response as Application;
  },

  // Create a new application
  create: async (data: ApplicationCreate): Promise<Application> => {
    const response = await apiClient.post<{ success: boolean; data: Application }>('/applications', data);
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as any).data;
    }
    return response as Application;
  },

  // Update an application
  update: async (id: string, data: ApplicationUpdate): Promise<Application> => {
    const response = await apiClient.put<{ success: boolean; data: Application }>(`/applications/${id}`, data);
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as any).data;
    }
    return response as Application;
  },

  // Delete an application
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/applications/${id}`);
  },

  // Duplicate an application with all its projects and files
  duplicate: async (id: string, newName: string): Promise<Application> => {
    const response = await apiClient.post<{ success: boolean; data: Application }>(
      `/applications/${id}/duplicate`,
      { name: newName }
    );
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as any).data;
    }
    return response as Application;
  },

  // Add a member to an application
  addMember: async (applicationId: string, data: ApplicationMemberCreate): Promise<ApplicationMember> => {
    const response = await apiClient.post<{ success: boolean; data: ApplicationMember }>(`/applications/${applicationId}/members`, data);
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as any).data;
    }
    return response as ApplicationMember;
  },

  // Remove a member from an application
  removeMember: async (applicationId: string, memberId: string): Promise<void> => {
    return apiClient.delete(`/applications/${applicationId}/members/${memberId}`);
  },
};

// ============================================
// NESTED PROJECTS (within Applications)
// ============================================

export const nestedProjectsApi = {
  // Get all projects in an application
  getAll: async (applicationId: string): Promise<Project[]> => {
    const response = await apiClient.get<{ success: boolean; data: Project[] }>(
      `/applications/${applicationId}/projects`
    );
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as any).data;
    }
    return response as Project[];
  },

  // Create a new project in an application
  create: async (
    applicationId: string,
    data: ProjectCreate & { duplicateFromId?: string }
  ): Promise<Project> => {
    const response = await apiClient.post<{ success: boolean; data: Project }>(
      `/applications/${applicationId}/projects`,
      data
    );
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as any).data;
    }
    return response as Project;
  },

  // Update a project
  update: async (
    applicationId: string,
    projectId: string,
    data: ProjectUpdate
  ): Promise<Project> => {
    const response = await apiClient.put<{ success: boolean; data: Project }>(
      `/applications/${applicationId}/projects/${projectId}`,
      data
    );
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as any).data;
    }
    return response as Project;
  },

  // Delete a project
  delete: async (applicationId: string, projectId: string): Promise<void> => {
    return apiClient.delete(`/applications/${applicationId}/projects/${projectId}`);
  },
};
