import { create } from 'zustand';
import type { Application, ApplicationCreate, ApplicationUpdate, Project, ProjectCreate, ProjectUpdate } from '@playwright-web-app/shared';
import { projectsApi, nestedProjectsApi } from '@/api/projects';

// Note: This store manages "Applications" (top-level containers)
// The naming "project" is kept for backwards compatibility

interface ProjectState {
  // All applications user has access to
  projects: Application[];

  // Currently selected application
  currentProject: Application | null;

  // Currently selected nested project (folder/sandbox within an application)
  currentNestedProject: Project | null;

  // Loading state
  isLoading: boolean;

  // Error state
  error: string | null;

  // Actions - Applications
  fetchProjects: () => Promise<void>;
  setCurrentProject: (project: Application | null) => void;
  setCurrentProjectById: (projectId: string) => Promise<void>;
  createProject: (data: ApplicationCreate) => Promise<Application>;
  updateProject: (id: string, data: ApplicationUpdate) => Promise<Application>;
  deleteProject: (id: string) => Promise<void>;
  duplicateProject: (id: string, newName: string) => Promise<Application>;

  // Actions - Nested Projects
  setCurrentNestedProject: (project: Project | null) => void;
  fetchNestedProjects: (applicationId: string) => Promise<void>;
  createNestedProject: (applicationId: string, data: ProjectCreate) => Promise<Project>;
  updateNestedProject: (applicationId: string, projectId: string, data: ProjectUpdate) => Promise<Project>;
  deleteNestedProject: (applicationId: string, projectId: string) => Promise<void>;
  duplicateNestedProject: (applicationId: string, projectId: string, newName: string) => Promise<Project>;
}

const CURRENT_PROJECT_KEY = 'currentProjectId';

function updateAppNestedProjects(
  apps: Application[],
  applicationId: string,
  updater: (projects: Project[]) => Project[]
): Application[] {
  return apps.map(app => {
    if (app.id === applicationId) {
      return { ...app, projects: updater(app.projects || []) } as Application;
    }
    return app;
  });
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  currentNestedProject: null,
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });

    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [1000, 2000, 4000];

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const projects = await projectsApi.getAll();
        set({ projects, isLoading: false, error: null });

        // Validate and set current project
        const { currentProject } = get();
        const savedProjectId = localStorage.getItem(CURRENT_PROJECT_KEY);

        // Check if current project is still valid (exists in fetched projects)
        const currentProjectStillValid = currentProject && projects.some(p => p.id === currentProject.id);

        if (currentProjectStillValid && currentProject) {
          // Refresh currentProject from freshly fetched data so nested fields
          // like workflows stay in sync for downstream consumers (Scheduler).
          const refreshedCurrentProject = projects.find((p) => p.id === currentProject.id) || null;
          if (refreshedCurrentProject) {
            set({ currentProject: refreshedCurrentProject });
          }
        } else if (!currentProjectStillValid && projects.length > 0) {
          // Try to restore from localStorage, or use first project
          const savedProject = savedProjectId
            ? projects.find(p => p.id === savedProjectId)
            : null;
          const newCurrentProject = savedProject || projects[0];
          set({ currentProject: newCurrentProject });

          // Update localStorage if we changed the project
          if (newCurrentProject && (!savedProjectId || savedProjectId !== newCurrentProject.id)) {
            localStorage.setItem(CURRENT_PROJECT_KEY, newCurrentProject.id);
          }
        } else if (!currentProjectStillValid && projects.length === 0) {
          // No projects available, clear current project
          set({ currentProject: null });
          localStorage.removeItem(CURRENT_PROJECT_KEY);
        }
        return; // Success — exit retry loop
      } catch (error) {
        const isRetryable = error instanceof Error &&
          (error.message.includes('status 5') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError'));

        if (isRetryable && attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
          continue;
        }

        set({
          error: error instanceof Error ? error.message : 'Failed to fetch projects',
          isLoading: false
        });
      }
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

  duplicateProject: async (id, newName) => {
    const project = await projectsApi.duplicate(id, newName);
    set(state => ({
      projects: [...state.projects, project],
      currentProject: project
    }));
    localStorage.setItem(CURRENT_PROJECT_KEY, project.id);
    return project;
  },

  // ============================================
  // NESTED PROJECTS (within Applications)
  // ============================================

  setCurrentNestedProject: (project) => {
    set({ currentNestedProject: project });
  },

  fetchNestedProjects: async (applicationId) => {
    set({ isLoading: true, error: null });
    try {
      const nestedProjects = await nestedProjectsApi.getAll(applicationId);
      set(state => ({
        projects: updateAppNestedProjects(state.projects, applicationId, () => nestedProjects),
        isLoading: false
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch nested projects',
        isLoading: false
      });
    }
  },

  createNestedProject: async (applicationId, data) => {
    const project = await nestedProjectsApi.create(applicationId, data);
    set(state => ({
      projects: updateAppNestedProjects(state.projects, applicationId, projects => [...projects, project]),
      currentNestedProject: project
    }));
    return project;
  },

  updateNestedProject: async (applicationId, projectId, data) => {
    const project = await nestedProjectsApi.update(applicationId, projectId, data);
    set(state => ({
      projects: updateAppNestedProjects(state.projects, applicationId, projects =>
        projects.map(p => p.id === projectId ? project : p)
      ),
      currentNestedProject: state.currentNestedProject?.id === projectId ? project : state.currentNestedProject
    }));
    return project;
  },

  deleteNestedProject: async (applicationId, projectId) => {
    await nestedProjectsApi.delete(applicationId, projectId);
    set(state => ({
      projects: updateAppNestedProjects(state.projects, applicationId, projects =>
        projects.filter(p => p.id !== projectId)
      ),
      currentNestedProject: state.currentNestedProject?.id === projectId ? null : state.currentNestedProject
    }));
  },

  duplicateNestedProject: async (applicationId: string, projectId: string, newName: string) => {
    const project = await nestedProjectsApi.create(applicationId, {
      name: newName,
      duplicateFromId: projectId
    });
    set(state => ({
      projects: updateAppNestedProjects(state.projects, applicationId, projects => [...projects, project]),
      currentNestedProject: project
    }));
    return project;
  },
}));
