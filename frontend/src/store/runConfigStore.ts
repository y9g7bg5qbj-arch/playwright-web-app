import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { normalizeExecutionTarget } from '@playwright-web-app/shared';

// Run configuration types matching Playwright options
export interface RunConfiguration {
  id: string;
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
  lastFailed: boolean;

  // Retry & Timeout
  retries: number;
  timeout: number;
  globalTimeout: number;

  // Artifacts
  trace: 'off' | 'on' | 'retain-on-failure' | 'on-first-retry';
  screenshot: 'off' | 'on' | 'only-on-failure';
  video: 'off' | 'on' | 'on-failure' | 'retain-on-failure';

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
  lastFailed: false,
  retries: 0,
  timeout: 30000,
  globalTimeout: 0,
  trace: 'retain-on-failure',
  screenshot: 'only-on-failure',
  video: 'off',
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

  // Actions
  setConfigurations: (configs: RunConfiguration[]) => void;
  addConfiguration: (config: Omit<RunConfiguration, 'id' | 'createdAt' | 'updatedAt'>) => RunConfiguration;
  updateConfiguration: (id: string, updates: Partial<RunConfiguration>) => void;
  deleteConfiguration: (id: string) => void;
  duplicateConfiguration: (id: string) => RunConfiguration;

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

// Generate unique ID
const generateId = () => `config_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

function normalizeStoreTarget(target: unknown): 'local' | 'github-actions' {
  const normalized = normalizeExecutionTarget(target as string | null | undefined, 'local');
  return normalized === 'github-actions' ? 'github-actions' : 'local';
}

export const useRunConfigStore = create<RunConfigState>()(
  persist(
    (set, get) => ({
      configurations: [],
      recentConfigs: [],
      activeConfigId: null,
      isDropdownOpen: false,
      isModalOpen: false,

      setConfigurations: (configs) => set({ configurations: configs }),

      addConfiguration: (config) => {
        const now = new Date().toISOString();
        const newConfig: RunConfiguration = {
          ...config,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          configurations: [...state.configurations, newConfig],
        }));

        return newConfig;
      },

      updateConfiguration: (id, updates) => {
        set((state) => ({
          configurations: state.configurations.map((c) =>
            c.id === id
              ? { ...c, ...updates, updatedAt: new Date().toISOString() }
              : c
          ),
        }));
      },

      deleteConfiguration: (id) => {
        set((state) => ({
          configurations: state.configurations.filter((c) => c.id !== id),
          recentConfigs: state.recentConfigs.filter((c) => c.id !== id),
          activeConfigId: state.activeConfigId === id ? null : state.activeConfigId,
        }));
      },

      duplicateConfiguration: (id) => {
        const { configurations, addConfiguration } = get();
        const original = configurations.find((c) => c.id === id);

        if (!original) {
          throw new Error('Configuration not found');
        }

        const { id: _id, createdAt: _c, updatedAt: _u, ...configData } = original;
        return addConfiguration({
          ...configData,
          name: `${original.name} (Copy)`,
        });
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
    }),
    {
      name: 'run-config-storage',
      partialize: (state) => ({
        configurations: state.configurations,
        recentConfigs: state.recentConfigs,
        activeConfigId: state.activeConfigId,
      }),
    }
  )
);

// Initialize default config if none exists
export const initializeDefaultConfig = () => {
  const {
    configurations,
    recentConfigs,
    addConfiguration,
    setActiveConfig,
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

  if (normalizedConfigs.length === 0) {
    const defaultConfig = addConfiguration(DEFAULT_CONFIG);
    setActiveConfig(defaultConfig.id);
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
  if (config.shards) {
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
