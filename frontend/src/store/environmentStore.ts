/**
 * Zustand store for Application Environments (Postman-style)
 *
 * Manages environment variables that can be used in Vero scripts
 * with {{variableName}} syntax.
 */

import { create } from 'zustand';
import { environmentsApi, type AppEnvironment, type ActiveEnvironment } from '@/api/environments';

interface EnvironmentState {
  // Data
  environments: AppEnvironment[];
  activeEnvironment: ActiveEnvironment | null;

  // UI State
  isLoading: boolean;
  error: string | null;
  isQuickLookOpen: boolean;
  isManagerOpen: boolean;

  // Current application context
  applicationId: string | null;

  // Actions
  setApplicationId: (appId: string | null) => void;
  fetchEnvironments: (applicationId: string) => Promise<void>;
  fetchActiveEnvironment: (applicationId: string) => Promise<void>;
  createEnvironment: (name: string, variables?: { key: string; value: string; isSecret?: boolean }[]) => Promise<AppEnvironment>;
  updateEnvironment: (envId: string, name: string) => Promise<void>;
  deleteEnvironment: (envId: string) => Promise<void>;
  activateEnvironment: (envId: string) => Promise<void>;
  addVariable: (envId: string, key: string, value: string, isSecret?: boolean) => Promise<void>;
  updateVariable: (envId: string, varId: string, data: { key?: string; value?: string; isSecret?: boolean }) => Promise<void>;
  deleteVariable: (envId: string, varId: string) => Promise<void>;

  // UI Actions
  setQuickLookOpen: (open: boolean) => void;
  setManagerOpen: (open: boolean) => void;

  // Helpers
  getActiveEnvironment: () => AppEnvironment | null;
  resolveVariable: (key: string) => string | undefined;
  getVariablesMap: () => Record<string, string>;
}

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  // Initial state
  environments: [],
  activeEnvironment: null,
  isLoading: false,
  error: null,
  isQuickLookOpen: false,
  isManagerOpen: false,
  applicationId: null,

  setApplicationId: (appId) => {
    set({ applicationId: appId, environments: [], activeEnvironment: null });
    if (appId) {
      // Auto-fetch environments when app changes
      get().fetchEnvironments(appId);
    }
  },

  fetchEnvironments: async (applicationId) => {
    set({ isLoading: true, error: null });
    try {
      const environments = await environmentsApi.getAll(applicationId);
      set({ environments, isLoading: false, applicationId });

      // Also fetch active environment with unmasked values
      const activeEnv = await environmentsApi.getActive(applicationId);
      set({ activeEnvironment: activeEnv });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch environments',
        isLoading: false,
      });
    }
  },

  fetchActiveEnvironment: async (applicationId) => {
    try {
      const activeEnv = await environmentsApi.getActive(applicationId);
      set({ activeEnvironment: activeEnv });
    } catch (error) {
      console.error('Failed to fetch active environment:', error);
    }
  },

  createEnvironment: async (name, variables) => {
    const { applicationId } = get();
    if (!applicationId) throw new Error('No application selected');

    set({ isLoading: true, error: null });
    try {
      const newEnv = await environmentsApi.create(applicationId, { name, variables });
      set((state) => ({
        environments: [...state.environments, newEnv],
        isLoading: false,
      }));

      // If it's the first environment, it becomes active
      if (newEnv.isActive) {
        await get().fetchActiveEnvironment(applicationId);
      }

      return newEnv;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create environment',
        isLoading: false,
      });
      throw error;
    }
  },

  updateEnvironment: async (envId, name) => {
    const { applicationId } = get();
    if (!applicationId) return;

    try {
      const updated = await environmentsApi.update(applicationId, envId, { name });
      set((state) => ({
        environments: state.environments.map((env) => (env.id === envId ? updated : env)),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update environment' });
      throw error;
    }
  },

  deleteEnvironment: async (envId) => {
    const { applicationId } = get();
    if (!applicationId) return;

    try {
      await environmentsApi.delete(applicationId, envId);
      set((state) => ({
        environments: state.environments.filter((env) => env.id !== envId),
      }));

      // Refresh to get new active environment
      await get().fetchEnvironments(applicationId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete environment' });
      throw error;
    }
  },

  activateEnvironment: async (envId) => {
    const { applicationId } = get();
    if (!applicationId) return;

    try {
      await environmentsApi.activate(applicationId, envId);

      // Update local state
      set((state) => ({
        environments: state.environments.map((env) => ({
          ...env,
          isActive: env.id === envId,
        })),
      }));

      // Fetch active environment with unmasked values
      await get().fetchActiveEnvironment(applicationId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to activate environment' });
      throw error;
    }
  },

  addVariable: async (envId, key, value, isSecret = false) => {
    const { applicationId } = get();
    if (!applicationId) return;

    try {
      const newVar = await environmentsApi.addVariable(applicationId, envId, { key, value, isSecret });
      set((state) => ({
        environments: state.environments.map((env) =>
          env.id === envId ? { ...env, variables: [...env.variables, newVar] } : env
        ),
      }));

      // Refresh active environment if this was the active one
      const activeEnv = get().environments.find((e) => e.isActive);
      if (activeEnv?.id === envId) {
        await get().fetchActiveEnvironment(applicationId);
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add variable' });
      throw error;
    }
  },

  updateVariable: async (envId, varId, data) => {
    const { applicationId } = get();
    if (!applicationId) return;

    try {
      const updated = await environmentsApi.updateVariable(applicationId, envId, varId, data);
      set((state) => ({
        environments: state.environments.map((env) =>
          env.id === envId
            ? { ...env, variables: env.variables.map((v) => (v.id === varId ? updated : v)) }
            : env
        ),
      }));

      // Refresh active environment if this was the active one
      const activeEnv = get().environments.find((e) => e.isActive);
      if (activeEnv?.id === envId) {
        await get().fetchActiveEnvironment(applicationId);
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update variable' });
      throw error;
    }
  },

  deleteVariable: async (envId, varId) => {
    const { applicationId } = get();
    if (!applicationId) return;

    try {
      await environmentsApi.deleteVariable(applicationId, envId, varId);
      set((state) => ({
        environments: state.environments.map((env) =>
          env.id === envId ? { ...env, variables: env.variables.filter((v) => v.id !== varId) } : env
        ),
      }));

      // Refresh active environment if this was the active one
      const activeEnv = get().environments.find((e) => e.isActive);
      if (activeEnv?.id === envId) {
        await get().fetchActiveEnvironment(applicationId);
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete variable' });
      throw error;
    }
  },

  // UI Actions
  setQuickLookOpen: (open) => set({ isQuickLookOpen: open }),
  setManagerOpen: (open) => set({ isManagerOpen: open }),

  // Helpers
  getActiveEnvironment: () => {
    const { environments } = get();
    return environments.find((env) => env.isActive) || null;
  },

  resolveVariable: (key) => {
    const { activeEnvironment } = get();
    return activeEnvironment?.variablesMap[key];
  },

  getVariablesMap: () => {
    const { activeEnvironment } = get();
    return activeEnvironment?.variablesMap || {};
  },
}));
