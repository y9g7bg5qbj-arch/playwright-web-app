import { create } from 'zustand';
import type { Application, ApplicationCreate, ApplicationUpdate } from '@playwright-web-app/shared';
import { projectsApi } from '@/api/projects';

// Note: This store manages "Applications" (top-level containers)
// The naming "project" is kept for backwards compatibility

interface ProjectState {
  // All applications user has access to
  projects: Application[];

  // Currently selected application
  currentProject: Application | null;

  // Loading state
  isLoading: boolean;

  // Error state
  error: string | null;

  // Actions
  fetchProjects: () => Promise<void>;
  setCurrentProject: (project: Application | null) => void;
  setCurrentProjectById: (projectId: string) => Promise<void>;
  createProject: (data: ApplicationCreate) => Promise<Application>;
  updateProject: (id: string, data: ApplicationUpdate) => Promise<Application>;
  deleteProject: (id: string) => Promise<void>;
}

const CURRENT_PROJECT_KEY = 'currentProjectId';

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await projectsApi.getAll();
      set({ projects, isLoading: false });

      // If no current project, try to restore from localStorage or use first project
      const { currentProject } = get();
      if (!currentProject && projects.length > 0) {
        const savedProjectId = localStorage.getItem(CURRENT_PROJECT_KEY);
        const savedProject = savedProjectId
          ? projects.find(p => p.id === savedProjectId)
          : null;
        set({ currentProject: savedProject || projects[0] });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch projects',
        isLoading: false
      });
    }
  },

  setCurrentProject: (project) => {
    set({ currentProject: project });
    if (project) {
      localStorage.setItem(CURRENT_PROJECT_KEY, project.id);
    } else {
      localStorage.removeItem(CURRENT_PROJECT_KEY);
    }
  },

  setCurrentProjectById: async (projectId) => {
    const { projects } = get();
    let project = projects.find(p => p.id === projectId);

    // If not in cache, fetch it
    if (!project) {
      try {
        project = await projectsApi.getById(projectId);
        set(state => ({ projects: [...state.projects, project!] }));
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch project'
        });
        return;
      }
    }

    set({ currentProject: project });
    localStorage.setItem(CURRENT_PROJECT_KEY, projectId);
  },

  createProject: async (data) => {
    const project = await projectsApi.create(data);
    set(state => ({
      projects: [...state.projects, project],
      currentProject: project
    }));
    localStorage.setItem(CURRENT_PROJECT_KEY, project.id);
    return project;
  },

  updateProject: async (id, data) => {
    const project = await projectsApi.update(id, data);
    set(state => ({
      projects: state.projects.map(p => p.id === id ? project : p),
      currentProject: state.currentProject?.id === id ? project : state.currentProject
    }));
    return project;
  },

  deleteProject: async (id) => {
    await projectsApi.delete(id);
    set(state => {
      const newProjects = state.projects.filter(p => p.id !== id);
      const newCurrent = state.currentProject?.id === id
        ? (newProjects[0] || null)
        : state.currentProject;

      if (newCurrent) {
        localStorage.setItem(CURRENT_PROJECT_KEY, newCurrent.id);
      } else {
        localStorage.removeItem(CURRENT_PROJECT_KEY);
      }

      return {
        projects: newProjects,
        currentProject: newCurrent
      };
    });
  },
}));
