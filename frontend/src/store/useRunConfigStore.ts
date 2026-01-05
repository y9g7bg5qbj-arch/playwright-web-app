import { create } from 'zustand';
import type {
  RunConfiguration,
  RunConfigurationCreate,
  RunConfigurationUpdate,
  ExecutionEnvironment,
  ExecutionEnvironmentCreate,
  ExecutionEnvironmentUpdate,
  RemoteRunner,
  RemoteRunnerCreate,
  RemoteRunnerUpdate,
  StoredCredential,
  StoredCredentialCreate,
  QuickRunRequest,
} from '@playwright-web-app/shared';
import {
  runConfigurationApi,
  environmentApi,
  runnerApi,
  credentialApi,
  tagApi,
} from '@/api/runConfiguration';

interface RunConfigState {
  // Current workflow context
  workflowId: string | null;

  // Run Configurations
  configurations: RunConfiguration[];
  selectedConfigId: string | null;
  configurationsLoading: boolean;
  configurationsError: string | null;

  // Execution Environments
  environments: ExecutionEnvironment[];
  environmentsLoading: boolean;
  environmentsError: string | null;

  // Remote Runners
  runners: RemoteRunner[];
  runnersLoading: boolean;
  runnersError: string | null;

  // Stored Credentials
  credentials: StoredCredential[];
  credentialsLoading: boolean;

  // Available Tags
  availableTags: string[];
  tagsLoading: boolean;

  // Quick Run State
  quickRunConfig: QuickRunRequest;
  showQuickRunModal: boolean;

  // Actions - Workflow Context
  setWorkflowId: (workflowId: string | null) => void;

  // Actions - Configurations
  loadConfigurations: (workflowId: string) => Promise<void>;
  selectConfiguration: (id: string | null) => void;
  createConfiguration: (data: RunConfigurationCreate) => Promise<RunConfiguration>;
  updateConfiguration: (id: string, data: RunConfigurationUpdate) => Promise<RunConfiguration>;
  deleteConfiguration: (id: string) => Promise<void>;
  duplicateConfiguration: (id: string, name: string) => Promise<RunConfiguration>;

  // Actions - Environments
  loadEnvironments: (workflowId: string) => Promise<void>;
  createEnvironment: (data: ExecutionEnvironmentCreate) => Promise<ExecutionEnvironment>;
  updateEnvironment: (id: string, data: ExecutionEnvironmentUpdate) => Promise<ExecutionEnvironment>;
  deleteEnvironment: (id: string) => Promise<void>;

  // Actions - Runners
  loadRunners: (workflowId: string) => Promise<void>;
  createRunner: (data: RemoteRunnerCreate) => Promise<RemoteRunner>;
  updateRunner: (id: string, data: RemoteRunnerUpdate) => Promise<RemoteRunner>;
  deleteRunner: (id: string) => Promise<void>;
  pingRunner: (id: string) => Promise<{ healthy: boolean; message?: string }>;

  // Actions - Credentials
  loadCredentials: (workflowId: string) => Promise<void>;
  createCredential: (data: StoredCredentialCreate) => Promise<StoredCredential>;
  deleteCredential: (id: string) => Promise<void>;

  // Actions - Tags
  loadTags: (workflowId: string) => Promise<void>;
  updateFlowTags: (flowId: string, tags: string[]) => Promise<void>;
  filterFlows: (filters: { tags?: string[]; tagMode?: 'any' | 'all'; excludeTags?: string[]; testFlowIds?: string[] }) => Promise<string[]>;

  // Actions - Quick Run
  setQuickRunConfig: (config: Partial<QuickRunRequest>) => void;
  resetQuickRunConfig: () => void;
  setShowQuickRunModal: (show: boolean) => void;

  // Helpers
  getSelectedConfiguration: () => RunConfiguration | null;
  getDefaultConfiguration: () => RunConfiguration | null;
  getDefaultEnvironment: () => ExecutionEnvironment | null;
  getHealthyRunners: () => RemoteRunner[];
}

const DEFAULT_QUICK_RUN_CONFIG: QuickRunRequest = {
  testFlowIds: [],
  tags: [],
  tagMode: 'any',
  excludeTags: [],
  target: 'local',
  browser: 'chromium',
  headless: false,
  workers: 1,
  retries: 0,
  timeout: 30000,
  tracing: 'on-failure',
  screenshot: 'on-failure',
  video: 'off',
};

export const useRunConfigStore = create<RunConfigState>((set, get) => ({
  // Initial State
  workflowId: null,

  configurations: [],
  selectedConfigId: null,
  configurationsLoading: false,
  configurationsError: null,

  environments: [],
  environmentsLoading: false,
  environmentsError: null,

  runners: [],
  runnersLoading: false,
  runnersError: null,

  credentials: [],
  credentialsLoading: false,

  availableTags: [],
  tagsLoading: false,

  quickRunConfig: DEFAULT_QUICK_RUN_CONFIG,
  showQuickRunModal: false,

  // Actions
  setWorkflowId: (workflowId) => {
    set({ workflowId });
    if (workflowId) {
      // Load all data for the workflow
      get().loadConfigurations(workflowId);
      get().loadEnvironments(workflowId);
      get().loadRunners(workflowId);
      get().loadCredentials(workflowId);
      get().loadTags(workflowId);
    } else {
      // Clear all data
      set({
        configurations: [],
        environments: [],
        runners: [],
        credentials: [],
        availableTags: [],
        selectedConfigId: null,
      });
    }
  },

  // Configurations
  loadConfigurations: async (workflowId) => {
    set({ configurationsLoading: true, configurationsError: null });
    try {
      const configs = await runConfigurationApi.getAll(workflowId);
      set({ configurations: configs, configurationsLoading: false });

      // Auto-select default configuration
      const defaultConfig = configs.find((c) => c.isDefault);
      if (defaultConfig && !get().selectedConfigId) {
        set({ selectedConfigId: defaultConfig.id });
      }
    } catch (error) {
      set({
        configurationsError: error instanceof Error ? error.message : 'Failed to load configurations',
        configurationsLoading: false,
      });
    }
  },

  selectConfiguration: (id) => {
    set({ selectedConfigId: id });
  },

  createConfiguration: async (data) => {
    const workflowId = get().workflowId;
    if (!workflowId) throw new Error('No workflow selected');

    const config = await runConfigurationApi.create(workflowId, data);
    set({ configurations: [...get().configurations, config] });
    return config;
  },

  updateConfiguration: async (id, data) => {
    const config = await runConfigurationApi.update(id, data);
    set({
      configurations: get().configurations.map((c) => (c.id === id ? config : c)),
    });
    return config;
  },

  deleteConfiguration: async (id) => {
    await runConfigurationApi.delete(id);
    set({
      configurations: get().configurations.filter((c) => c.id !== id),
      selectedConfigId: get().selectedConfigId === id ? null : get().selectedConfigId,
    });
  },

  duplicateConfiguration: async (id, name) => {
    const config = await runConfigurationApi.duplicate(id, name);
    set({ configurations: [...get().configurations, config] });
    return config;
  },

  // Environments
  loadEnvironments: async (workflowId) => {
    set({ environmentsLoading: true, environmentsError: null });
    try {
      const envs = await environmentApi.getAll(workflowId);
      set({ environments: envs, environmentsLoading: false });
    } catch (error) {
      set({
        environmentsError: error instanceof Error ? error.message : 'Failed to load environments',
        environmentsLoading: false,
      });
    }
  },

  createEnvironment: async (data) => {
    const workflowId = get().workflowId;
    if (!workflowId) throw new Error('No workflow selected');

    const env = await environmentApi.create(workflowId, data);
    set({ environments: [...get().environments, env] });
    return env;
  },

  updateEnvironment: async (id, data) => {
    const env = await environmentApi.update(id, data);
    set({
      environments: get().environments.map((e) => (e.id === id ? env : e)),
    });
    return env;
  },

  deleteEnvironment: async (id) => {
    await environmentApi.delete(id);
    set({
      environments: get().environments.filter((e) => e.id !== id),
    });
  },

  // Runners
  loadRunners: async (workflowId) => {
    set({ runnersLoading: true, runnersError: null });
    try {
      const runners = await runnerApi.getAll(workflowId);
      set({ runners, runnersLoading: false });
    } catch (error) {
      set({
        runnersError: error instanceof Error ? error.message : 'Failed to load runners',
        runnersLoading: false,
      });
    }
  },

  createRunner: async (data) => {
    const workflowId = get().workflowId;
    if (!workflowId) throw new Error('No workflow selected');

    const runner = await runnerApi.create(workflowId, data);
    set({ runners: [...get().runners, runner] });
    return runner;
  },

  updateRunner: async (id, data) => {
    const runner = await runnerApi.update(id, data);
    set({
      runners: get().runners.map((r) => (r.id === id ? runner : r)),
    });
    return runner;
  },

  deleteRunner: async (id) => {
    await runnerApi.delete(id);
    set({
      runners: get().runners.filter((r) => r.id !== id),
    });
  },

  pingRunner: async (id) => {
    const result = await runnerApi.ping(id);
    // Reload runners to get updated health status
    const workflowId = get().workflowId;
    if (workflowId) {
      await get().loadRunners(workflowId);
    }
    return result;
  },

  // Credentials
  loadCredentials: async (workflowId) => {
    set({ credentialsLoading: true });
    try {
      const credentials = await credentialApi.getAll(workflowId);
      set({ credentials, credentialsLoading: false });
    } catch {
      set({ credentialsLoading: false });
    }
  },

  createCredential: async (data) => {
    const workflowId = get().workflowId;
    if (!workflowId) throw new Error('No workflow selected');

    const credential = await credentialApi.create(workflowId, data);
    set({ credentials: [...get().credentials, credential] });
    return credential;
  },

  deleteCredential: async (id) => {
    await credentialApi.delete(id);
    set({
      credentials: get().credentials.filter((c) => c.id !== id),
    });
  },

  // Tags
  loadTags: async (workflowId) => {
    set({ tagsLoading: true });
    try {
      const tags = await tagApi.getAll(workflowId);
      set({ availableTags: tags, tagsLoading: false });
    } catch {
      set({ tagsLoading: false });
    }
  },

  updateFlowTags: async (flowId, tags) => {
    await tagApi.updateFlowTags(flowId, tags);
    // Reload tags to include any new ones
    const workflowId = get().workflowId;
    if (workflowId) {
      await get().loadTags(workflowId);
    }
  },

  filterFlows: async (filters) => {
    const workflowId = get().workflowId;
    if (!workflowId) return [];
    return tagApi.filterFlows(workflowId, filters);
  },

  // Quick Run
  setQuickRunConfig: (config) => {
    set({ quickRunConfig: { ...get().quickRunConfig, ...config } });
  },

  resetQuickRunConfig: () => {
    set({ quickRunConfig: DEFAULT_QUICK_RUN_CONFIG });
  },

  setShowQuickRunModal: (show) => {
    set({ showQuickRunModal: show });
  },

  // Helpers
  getSelectedConfiguration: () => {
    const { configurations, selectedConfigId } = get();
    return configurations.find((c) => c.id === selectedConfigId) || null;
  },

  getDefaultConfiguration: () => {
    return get().configurations.find((c) => c.isDefault) || null;
  },

  getDefaultEnvironment: () => {
    return get().environments.find((e) => e.isDefault) || null;
  },

  getHealthyRunners: () => {
    return get().runners.filter((r) => r.isHealthy);
  },
}));
