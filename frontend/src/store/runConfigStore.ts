import { create } from 'zustand';
import { normalizeExecutionTarget } from '@playwright-web-app/shared';
import { runConfigurationApi } from '@/api/runConfiguration';
import { toBackendCreate, fromBackendConfig, toBackendUpdate } from './runConfigMapper';

const RUN_CONFIG_STORAGE_KEY = 'run-config-storage-v2';
const LEGACY_RUN_CONFIG_STORAGE_KEY = 'run-config-storage';

function cleanupLegacyRunConfigStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(RUN_CONFIG_STORAGE_KEY) !== null) {
      window.localStorage.removeItem(RUN_CONFIG_STORAGE_KEY);
    }
    if (window.localStorage.getItem(LEGACY_RUN_CONFIG_STORAGE_KEY) !== null) {
      window.localStorage.removeItem(LEGACY_RUN_CONFIG_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('[RunConfig] Failed to cleanup legacy run-config localStorage key:', error);
  }
}

cleanupLegacyRunConfigStorage();

// Run configuration types matching Playwright options
export interface RunConfiguration {
  id: string;
  workflowId?: string;
  projectId?: string;
  name: string;

  // Execution Target
  target: 'local' | 'github-actions';

  // Browser & Project
  browser: 'chromium' | 'firefox' | 'webkit';
  project?: string;

  // Execution Mode
  headed: boolean;
  debug: boolean;
  ui: boolean;

  // Parallelism
  workers: number;
  shards?: {
    current: number;
    total: number;
  };

  // Test Filtering
  grep?: string;
  grepInvert?: string;
  tagExpression?: string;
  selectionScope?: 'active-file' | 'current-sandbox';
  namePatterns?: string[];
  lastFailed: boolean;

  // Retry & Timeout
  retries: number;
  timeout: number;
  globalTimeout: number;

  // Artifacts
  trace: 'off' | 'on' | 'retain-on-failure' | 'on-first-retry';
  screenshot: 'off' | 'on' | 'only-on-failure';
  video: 'off' | 'on' | 'on-failure' | 'retain-on-failure';
  visualPreset: 'strict' | 'balanced' | 'relaxed' | 'custom';
  visualThreshold: number;
  visualMaxDiffPixels?: number;
  visualMaxDiffPixelRatio?: number;
  visualUpdateSnapshots: boolean;

  // Reporting
  reporter: ('list' | 'html' | 'json' | 'junit' | 'allure')[];
  outputDir?: string;

  // Context Options
  baseURL?: string;
  viewport?: {
    width: number;
    height: number;
  };
  locale?: string;
  timezoneId?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
  };

  // GitHub Actions specific
  github?: {
    repository?: string;
    branch?: string;
    workflowFile?: string;
  };

  // Environment from Environment Manager (Postman-style)
  // This selects a pre-defined environment, overriding the "active" one
  environmentId?: string;

  // Custom environment variables (can override environment variables)
  envVars?: Record<string, string>;

  // Run Parameters
  parameterSetId?: string;
  parameterOverrides?: Record<string, string | number | boolean>;

  // Auth Profile (cached browser auth state)
  authProfileId?: string;

  // Metadata
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RunConfigSummary {
  id: string;
  name: string;
  target: 'local' | 'github-actions';
  browser: 'chromium' | 'firefox' | 'webkit';
  workers: number;
  lastUsedAt?: string;
}

// Default configuration
export const DEFAULT_CONFIG: Omit<RunConfiguration, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Default',
  target: 'local',
  browser: 'chromium',
  headed: true, // Show browser by default for better user experience
  debug: false,
  ui: false,
  workers: 1,
  selectionScope: 'current-sandbox',
  lastFailed: false,
  retries: 0,
  timeout: 30000,
  globalTimeout: 0,
  trace: 'retain-on-failure',
  screenshot: 'only-on-failure',
  video: 'off',
  visualPreset: 'balanced',
  visualThreshold: 0.2,
  visualUpdateSnapshots: false,
  reporter: ['list'],
  baseURL: 'http://localhost:3000',
};

// Preset configurations
export const PRESET_CONFIGS: Omit<RunConfiguration, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    ...DEFAULT_CONFIG,
    name: 'Debug Mode',
    headed: true,
    debug: true,
    workers: 1,
    trace: 'on',
  },
  {
    ...DEFAULT_CONFIG,
    name: 'Headed Browser',
    headed: true,
    workers: 1,
  },
  {
    ...DEFAULT_CONFIG,
    name: 'All Browsers',
    browser: 'chromium',
    workers: 3,
  },
  {
    ...DEFAULT_CONFIG,
    name: 'GitHub CI',
    target: 'github-actions',
    workers: 4,
    shards: { current: 1, total: 4 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reporter: ['html', 'allure'],
    github: {
      repository: 'y9g7bg5qbj-arch/playwright-web-app',
      branch: 'main',
      workflowFile: '.github/workflows/vero-tests.yml',
    },
  },
];

interface RunConfigState {
  // All configurations
  configurations: RunConfiguration[];

  // Recently used (max 5)
  recentConfigs: RunConfigSummary[];

  // Currently active configuration
  activeConfigId: string | null;

  // Dropdown open state
  isDropdownOpen: boolean;

  // Modal open state
  isModalOpen: boolean;

  // API sync state
  isLoading: boolean;
  syncError: string | null;
  seededScopeKeys: string[];
  seedingScopeKeys: string[];

  // Actions
  setConfigurations: (configs: RunConfiguration[]) => void;
  addConfiguration: (
    config: Omit<RunConfiguration, 'id' | 'createdAt' | 'updatedAt'>,
    workflowId?: string,
    projectId?: string
  ) => Promise<RunConfiguration>;
  updateConfiguration: (id: string, updates: Partial<RunConfiguration>) => void;
  deleteConfiguration: (id: string) => void;
  duplicateConfiguration: (id: string) => RunConfiguration;

  // API sync
  loadConfigurations: (workflowId: string, projectId?: string) => Promise<void>;

  // Recent configs
  addRecentConfig: (config: RunConfigSummary) => void;
  markConfigUsed: (id: string) => void;

  // Active config
  setActiveConfig: (id: string | null) => void;
  getActiveConfig: () => RunConfiguration | null;

  // UI state
  setDropdownOpen: (open: boolean) => void;
  setModalOpen: (open: boolean) => void;

  // Run with config
  runWithConfig: (configId: string) => void;
}

// Generate unique ID (fallback for offline)
const generateId = () => `config_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

function normalizeStoreTarget(target: unknown): 'local' | 'github-actions' {
  const normalized = normalizeExecutionTarget(target as string | null | undefined, 'local');
  return normalized === 'github-actions' ? 'github-actions' : 'local';
}

function getScopeKey(workflowId: string, projectId?: string): string {
  return `${workflowId}::${projectId || 'none'}`;
}

function isConfigInScope(config: RunConfiguration, workflowId: string, projectId?: string): boolean {
  return config.workflowId === workflowId && config.projectId === projectId;
}

export const useRunConfigStore = create<RunConfigState>()(
  (set, get) => ({
      configurations: [],
      recentConfigs: [],
      activeConfigId: null,
      isDropdownOpen: false,
      isModalOpen: false,
      isLoading: false,
      syncError: null,
      seededScopeKeys: [],
      seedingScopeKeys: [],

      setConfigurations: (configs) => set({ configurations: configs }),

      addConfiguration: async (config, workflowId?, projectId?) => {
        const createLocalConfig = (errorMessage?: string): RunConfiguration => {
          const now = new Date().toISOString();
          const newConfig: RunConfiguration = {
            ...config,
            id: generateId(),
            workflowId,
            projectId,
            createdAt: now,
            updatedAt: now,
          };

          set((state) => ({
            configurations: [...state.configurations, newConfig],
            syncError: errorMessage || null,
          }));

          return newConfig;
        };

        // Try API first if workflowId is available
        if (workflowId) {
          try {
            const backendPayload = toBackendCreate(config);
            const backendConfig = await runConfigurationApi.create(workflowId, backendPayload, projectId);
            const frontendConfig = fromBackendConfig(backendConfig);

            set((state) => ({
              configurations: state.configurations.some((existing) => existing.id === frontendConfig.id)
                ? state.configurations.map((existing) => existing.id === frontendConfig.id ? frontendConfig : existing)
                : [...state.configurations, frontendConfig],
              syncError: null,
            }));

            return frontendConfig;
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create run configuration on server';
            console.warn('[RunConfig] API create failed:', err);
            set({ syncError: message });
            throw new Error(message);
          }
        }

        // Local-only fallback
        return createLocalConfig();
      },

      updateConfiguration: (id, updates) => {
        // Optimistic local update
        set((state) => ({
          configurations: state.configurations.map((c) =>
            c.id === id
              ? { ...c, ...updates, updatedAt: new Date().toISOString() }
              : c
          ),
        }));

        // Fire-and-forget API sync (skip for local-only IDs during migration)
        if (!id.startsWith('config_')) {
          const backendUpdates = toBackendUpdate(updates);
          runConfigurationApi.update(id, backendUpdates).catch((err) => {
            console.warn('[RunConfig] API update failed:', err);
          });
        }
      },

      deleteConfiguration: (id) => {
        set((state) => ({
          configurations: state.configurations.filter((c) => c.id !== id),
          recentConfigs: state.recentConfigs.filter((c) => c.id !== id),
          activeConfigId: state.activeConfigId === id ? null : state.activeConfigId,
        }));

        // Fire-and-forget API delete (skip for local-only IDs)
        if (!id.startsWith('config_')) {
          runConfigurationApi.delete(id).catch((err) => {
            console.warn('[RunConfig] API delete failed:', err);
          });
        }
      },

      duplicateConfiguration: (id) => {
        const { configurations } = get();
        const original = configurations.find((c) => c.id === id);

        if (!original) {
          throw new Error('Configuration not found');
        }

        // Create a temporary local duplicate for immediate UI feedback
        const now = new Date().toISOString();
        const tempId = generateId();
        const { id: _id, createdAt: _c, updatedAt: _u, ...configData } = original;
        const newConfig: RunConfiguration = {
          ...configData,
          name: `${original.name} (Copy)`,
          id: tempId,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          configurations: [...state.configurations, newConfig],
        }));

        // For API-backed configs, duplicate via API and replace the temp entry
        if (!id.startsWith('config_')) {
          runConfigurationApi.duplicate(id, newConfig.name)
            .then((backendConfig) => {
              const frontendConfig = fromBackendConfig(backendConfig);
              set((state) => ({
                configurations: state.configurations.map((c) =>
                  c.id === tempId ? frontendConfig : c
                ),
              }));
            })
            .catch((err) => {
              console.warn('[RunConfig] API duplicate failed, keeping local copy:', err);
            });
        }

        return newConfig;
      },

      loadConfigurations: async (workflowId, projectId) => {
        const scopeKey = getScopeKey(workflowId, projectId);
        set({ isLoading: true, syncError: null });
        try {
          let backendConfigs = await runConfigurationApi.getAll(workflowId, projectId);

          // Project-folder scope: auto-seed a default configuration once per scope
          // when the backend has no records yet.
          if (projectId && backendConfigs.length === 0) {
            const { seededScopeKeys, seedingScopeKeys } = get();
            if (!seededScopeKeys.includes(scopeKey) && !seedingScopeKeys.includes(scopeKey)) {
              set((state) => ({
                seedingScopeKeys: [...new Set([...state.seedingScopeKeys, scopeKey])],
              }));
              try {
                const backendPayload = toBackendCreate({ ...DEFAULT_CONFIG, projectId });
                const created = await runConfigurationApi.create(workflowId, backendPayload, projectId);
                backendConfigs = [created];
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to create default run configuration';
                set({ syncError: message });
              } finally {
                set((state) => ({
                  seededScopeKeys: [...new Set([...state.seededScopeKeys, scopeKey])],
                  seedingScopeKeys: state.seedingScopeKeys.filter((key) => key !== scopeKey),
                }));
              }
            }
          }

          const frontendConfigs = backendConfigs.map(fromBackendConfig);

          set((state) => {
            const apiIds = new Set(frontendConfigs.map((c) => c.id));
            const localOnlyForScope = state.configurations.filter(
              (c) =>
                c.id.startsWith('config_') &&
                isConfigInScope(c, workflowId, projectId) &&
                !apiIds.has(c.id)
            );
            const preservedForOtherScopes = state.configurations.filter(
              (c) => !isConfigInScope(c, workflowId, projectId)
            );

            const scopedConfigs = [...frontendConfigs, ...localOnlyForScope];
            const hasActive = scopedConfigs.some((c) => c.id === state.activeConfigId);

            return {
              configurations: [...preservedForOtherScopes, ...scopedConfigs],
              activeConfigId: hasActive ? state.activeConfigId : scopedConfigs[0]?.id || null,
              isLoading: false,
            };
          });
        } catch (err) {
          console.warn('[RunConfig] Failed to load from API, using cached configs:', err);
          const errorMessage = err instanceof Error ? err.message : 'Failed to load configurations from server';
          set((state) => {
            const scopedConfigs = state.configurations.filter(
              (c) =>
                c.id.startsWith('config_') &&
                isConfigInScope(c, workflowId, projectId)
            );
            const preservedForOtherScopes = state.configurations.filter(
              (c) => !isConfigInScope(c, workflowId, projectId)
            );
            const hasActive = scopedConfigs.some((c) => c.id === state.activeConfigId);
            return {
              configurations: [...preservedForOtherScopes, ...scopedConfigs],
              activeConfigId: hasActive ? state.activeConfigId : scopedConfigs[0]?.id || null,
              isLoading: false,
              syncError: `Failed to load configurations from server: ${errorMessage}`,
            };
          });
        }
      },

      addRecentConfig: (config) => {
        set((state) => {
          // Remove if already exists
          const filtered = state.recentConfigs.filter((c) => c.id !== config.id);
          // Add to front, keep max 5
          const updated = [config, ...filtered].slice(0, 5);
          return { recentConfigs: updated };
        });
      },

      markConfigUsed: (id) => {
        const { configurations, addRecentConfig, updateConfiguration } = get();
        const config = configurations.find((c) => c.id === id);

        if (config) {
          const now = new Date().toISOString();
          updateConfiguration(id, { lastUsedAt: now });

          addRecentConfig({
            id: config.id,
            name: config.name,
            target: config.target,
            browser: config.browser,
            workers: config.workers,
            lastUsedAt: now,
          });
        }
      },

      setActiveConfig: (id) => set({ activeConfigId: id }),

      getActiveConfig: () => {
        const { configurations, activeConfigId } = get();
        if (!activeConfigId) return null;
        return configurations.find((c) => c.id === activeConfigId) || null;
      },

      setDropdownOpen: (open) => set({ isDropdownOpen: open }),
      setModalOpen: (open) => set({ isModalOpen: open }),

      runWithConfig: (configId) => {
        const { markConfigUsed, setActiveConfig } = get();
        markConfigUsed(configId);
        setActiveConfig(configId);
        // The actual run will be triggered by the component that calls this
      },
    })
);

// Legacy helper retained for backward compatibility with old call sites.
// It now only normalizes persisted target values and does not create shared defaults.
export const initializeDefaultConfig = () => {
  const {
    configurations,
    recentConfigs,
  } = useRunConfigStore.getState();

  // Migrate legacy persisted target values.
  const normalizedConfigs = configurations.map((config) => {
    const target = normalizeStoreTarget((config as any).target);
    return target === config.target ? config : { ...config, target };
  });
  const normalizedRecentConfigs = recentConfigs.map((config) => {
    const target = normalizeStoreTarget((config as any).target);
    return target === config.target ? config : { ...config, target };
  });
  const changed =
    normalizedConfigs.some((config, index) => config !== configurations[index]) ||
    normalizedRecentConfigs.some((config, index) => config !== recentConfigs[index]);
  if (changed) {
    useRunConfigStore.setState({
      configurations: normalizedConfigs,
      recentConfigs: normalizedRecentConfigs,
    });
  }
};

// Helper to convert config to Playwright CLI args
export const configToPlaywrightArgs = (config: RunConfiguration): string[] => {
  const args: string[] = [];

  // Browser
  args.push(`--browser=${config.browser}`);

  // Headed/Headless
  if (config.headed) args.push('--headed');
  if (config.debug) args.push('--debug');
  if (config.ui) args.push('--ui');

  // Workers
  args.push(`--workers=${config.workers}`);

  // Shards
  if (config.shards && config.target === 'github-actions') {
    args.push(`--shard=${config.shards.current}/${config.shards.total}`);
  }

  // Filtering
  if (config.grep) args.push(`--grep="${config.grep}"`);
  if (config.grepInvert) args.push(`--grep-invert="${config.grepInvert}"`);
  if (config.lastFailed) args.push('--last-failed');

  // Retries & Timeout
  if (config.retries > 0) args.push(`--retries=${config.retries}`);
  if (config.timeout > 0) args.push(`--timeout=${config.timeout}`);
  if (config.globalTimeout > 0) args.push(`--global-timeout=${config.globalTimeout}`);

  // Artifacts
  args.push(`--trace=${config.trace}`);
  args.push(`--screenshot=${config.screenshot}`);
  args.push(`--video=${config.video}`);
  if (config.visualUpdateSnapshots) {
    args.push('--update-snapshots=changed');
  }

  // Reporter
  if (config.reporter.length > 0) {
    args.push(`--reporter=${config.reporter.join(',')}`);
  }

  // Output dir
  if (config.outputDir) {
    args.push(`--output=${config.outputDir}`);
  }

  return args;
};
