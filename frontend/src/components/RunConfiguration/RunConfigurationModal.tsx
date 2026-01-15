/**
 * RunConfigurationModal - Comprehensive modal for configuring test execution
 * Combines all configuration panels into a tabbed interface
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Play,
  Save,
  Settings,
  Tag,
  Globe,
  Monitor,
  Layers,
  Camera,
  Zap,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Copy,
  Trash2,
  Plus,
  Github,
  Cpu,
  Clock,
} from 'lucide-react';
import type {
  RunConfiguration,
  RunConfigurationCreate,
  ExecutionEnvironment,
  BrowserConfig,
  ShardingConfig,
  AdvancedConfig,
  ArtifactMode,
  Viewport,
  TimeoutConfig,
} from '@playwright-web-app/shared';

// Define constants locally to avoid ESM/CJS compatibility issues
const DEFAULT_VIEWPORT: Viewport = { width: 1280, height: 720 };

interface RunConfigurationPreset {
  name: string;
  description: string;
  config: Partial<RunConfiguration>;
}

const RUN_CONFIGURATION_PRESETS: RunConfigurationPreset[] = [
  {
    name: 'Quick Smoke Test',
    description: 'Fast execution with minimal overhead',
    config: {
      browser: 'chromium',
      headless: true,
      workers: 4,
      shardCount: 1,
      retries: 0,
      timeout: 15000,
      tracing: 'off',
      screenshot: 'off',
      video: 'off',
    },
  },
  {
    name: 'Full Regression',
    description: 'Complete test suite with all artifacts',
    config: {
      browser: 'chromium',
      headless: true,
      workers: 2,
      shardCount: 4,
      retries: 2,
      timeout: 60000,
      tracing: 'on-failure',
      screenshot: 'on-failure',
      video: 'on-failure',
    },
  },
  {
    name: 'CI Pipeline',
    description: 'Optimized for CI/CD environments',
    config: {
      browser: 'chromium',
      headless: true,
      workers: 4,
      shardCount: 2,
      retries: 1,
      timeout: 30000,
      tracing: 'on-failure',
      screenshot: 'on-failure',
      video: 'off',
    },
  },
  {
    name: 'Debug Mode',
    description: 'Single test with full visibility',
    config: {
      browser: 'chromium',
      headless: false,
      workers: 1,
      shardCount: 1,
      retries: 0,
      timeout: 120000,
      tracing: 'on',
      screenshot: 'on',
      video: 'on',
    },
  },
];
import { TagSelector } from './TagSelector';
import { EnvironmentSelector } from './EnvironmentSelector';
import { ExecutionSettingsModal } from './ExecutionSettingsModal';
import { AdvancedOptionsPanel } from './AdvancedOptionsPanel';
import { useGitHubStore } from '@/store/useGitHubStore';

const BROWSERS = [
  { value: 'chromium', label: 'Chromium', icon: '🌐' },
  { value: 'firefox', label: 'Firefox', icon: '🦊' },
  { value: 'webkit', label: 'WebKit', icon: '🧭' },
];

type TabId = 'tests' | 'environment' | 'execution' | 'artifacts' | 'advanced';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'tests', label: 'Tests', icon: <Tag className="w-4 h-4" /> },
  { id: 'environment', label: 'Environment', icon: <Globe className="w-4 h-4" /> },
  { id: 'execution', label: 'Execution', icon: <Layers className="w-4 h-4" /> },
  { id: 'artifacts', label: 'Artifacts', icon: <Camera className="w-4 h-4" /> },
  { id: 'advanced', label: 'Advanced', icon: <Settings className="w-4 h-4" /> },
];

interface RunConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  configuration: RunConfiguration | null;
  configurations: RunConfiguration[];
  environments: ExecutionEnvironment[];
  availableTags: string[];
  onSave: (data: RunConfigurationCreate) => Promise<void>;
  onCreate: (data: RunConfigurationCreate) => Promise<RunConfiguration | void>;
  onDelete?: (id: string) => Promise<void>;
  onDuplicate?: (id: string, name: string) => Promise<void>;
  onSelect: (id: string | null) => void;
  onRun?: (config: RunConfiguration) => void;
  onCreateEnvironment?: (data: any) => Promise<void>;
  isLoading?: boolean;
}

const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
  type: 'chromium',
  headless: true,
  viewport: DEFAULT_VIEWPORT,
  javaScriptEnabled: true,
};

const DEFAULT_SHARDING_CONFIG: ShardingConfig = {
  enabled: false,
  count: 1,
  strategy: 'round-robin',
};

const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  global: 0,        // No global timeout by default
  action: 0,        // Inherit from test timeout
  navigation: 0,    // Inherit from test timeout
  expect: 5000,     // 5 seconds for assertions
};

const DEFAULT_ADVANCED_CONFIG: AdvancedConfig = {
  reporters: {
    html: true,
    json: false,
    junit: false,
    github: false,
    allure: false,
    list: true,
  },
  notifications: {},
  debug: {},
  fullyParallel: false,
  forbidOnly: false,
  maxFailures: 0,
};

export const RunConfigurationModal: React.FC<RunConfigurationModalProps> = ({
  isOpen,
  onClose,
  configuration,
  configurations,
  environments,
  availableTags,
  onSave,
  onCreate,
  onDelete,
  onDuplicate,
  onSelect,
  onRun,
  onCreateEnvironment,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('tests');
  const [localConfig, setLocalConfig] = useState<Partial<RunConfiguration>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newConfigName, setNewConfigName] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAdvancedTimeouts, setShowAdvancedTimeouts] = useState(false);

  // GitHub integration
  const { integration, isConnected } = useGitHubStore();

  // Initialize local config from selected configuration
  useEffect(() => {
    if (configuration) {
      setLocalConfig({
        ...configuration,
        browserConfig: configuration.browserConfig || {
          type: configuration.browser,
          headless: configuration.headless,
          viewport: configuration.viewport,
          javaScriptEnabled: true,
        },
        shardingConfig: configuration.shardingConfig || {
          enabled: configuration.shardCount > 1,
          count: configuration.shardCount,
          strategy: 'round-robin',
        },
        timeoutConfig: configuration.timeoutConfig || {
          global: configuration.timeout,
          action: 15000,
          navigation: 30000,
          expect: 5000,
        },
        advancedConfig: configuration.advancedConfig || DEFAULT_ADVANCED_CONFIG,
      });
      setHasChanges(false);
    } else {
      setLocalConfig({
        browser: 'chromium',
        headless: true,
        viewport: DEFAULT_VIEWPORT,
        workers: 1,
        shardCount: 1,
        retries: 0,
        timeout: 30000,
        tracing: 'on-failure',
        screenshot: 'on-failure',
        video: 'off',
        tags: [],
        excludeTags: [],
        tagMode: 'any',
        target: 'local',
        browserConfig: DEFAULT_BROWSER_CONFIG,
        shardingConfig: DEFAULT_SHARDING_CONFIG,
        advancedConfig: DEFAULT_ADVANCED_CONFIG,
      });
    }
  }, [configuration]);

  const updateField = useCallback(<K extends keyof RunConfiguration>(key: K, value: RunConfiguration[K]) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    if (!configuration) return;

    // Sync nested configs back to flat fields for backward compatibility
    const saveData = {
      name: configuration.name,
      description: localConfig.description,
      isDefault: localConfig.isDefault,
      tags: localConfig.tags,
      tagMode: localConfig.tagMode,
      excludeTags: localConfig.excludeTags,
      testFlowIds: localConfig.testFlowIds,
      environmentId: localConfig.environmentId,
      target: localConfig.target,
      remoteRunnerId: localConfig.remoteRunnerId,
      dockerConfig: localConfig.dockerConfig,
      browser: localConfig.browserConfig?.type || localConfig.browser || 'chromium',
      headless: localConfig.browserConfig?.headless ?? localConfig.headless ?? true,
      viewport: localConfig.browserConfig?.viewport || localConfig.viewport || DEFAULT_VIEWPORT,
      browserConfig: localConfig.browserConfig,
      workers: localConfig.workers,
      shardCount: localConfig.shardingConfig?.enabled ? localConfig.shardingConfig.count : 1,
      shardingConfig: localConfig.shardingConfig,
      retries: localConfig.retries,
      timeout: localConfig.timeoutConfig?.global || localConfig.timeout || 30000,
      timeoutConfig: localConfig.timeoutConfig,
      tracing: localConfig.tracing,
      screenshot: localConfig.screenshot,
      video: localConfig.video,
      advancedConfig: localConfig.advancedConfig,
    };

    await onSave(saveData);
    setHasChanges(false);
  };

  const handleCreate = async () => {
    if (!newConfigName.trim()) return;

    const createData: RunConfigurationCreate = {
      name: newConfigName,
      description: localConfig.description,
      isDefault: localConfig.isDefault,
      tags: localConfig.tags,
      tagMode: localConfig.tagMode,
      excludeTags: localConfig.excludeTags,
      testFlowIds: localConfig.testFlowIds,
      environmentId: localConfig.environmentId,
      target: localConfig.target,
      remoteRunnerId: localConfig.remoteRunnerId,
      dockerConfig: localConfig.dockerConfig,
      browser: localConfig.browserConfig?.type || localConfig.browser || 'chromium',
      headless: localConfig.browserConfig?.headless ?? localConfig.headless ?? true,
      viewport: localConfig.browserConfig?.viewport || localConfig.viewport || DEFAULT_VIEWPORT,
      browserConfig: localConfig.browserConfig,
      workers: localConfig.workers,
      shardCount: localConfig.shardingConfig?.enabled ? localConfig.shardingConfig.count : 1,
      shardingConfig: localConfig.shardingConfig,
      retries: localConfig.retries,
      timeout: localConfig.timeoutConfig?.global || localConfig.timeout || 30000,
      timeoutConfig: localConfig.timeoutConfig,
      tracing: localConfig.tracing,
      screenshot: localConfig.screenshot,
      video: localConfig.video,
      advancedConfig: localConfig.advancedConfig,
    };

    const createdConfig = await onCreate(createData);
    setShowNewForm(false);
    setNewConfigName('');

    // Select the newly created config so user can continue editing
    if (createdConfig && createdConfig.id) {
      onSelect(createdConfig.id);
    }
  };

  const handleReset = () => {
    if (configuration) {
      setLocalConfig(configuration);
      setHasChanges(false);
    }
  };

  const applyPreset = (preset: typeof RUN_CONFIGURATION_PRESETS[0]) => {
    setLocalConfig((prev) => ({
      ...prev,
      ...preset.config,
      browserConfig: {
        ...prev.browserConfig,
        headless: preset.config.headless ?? prev.browserConfig?.headless ?? true,
      } as BrowserConfig,
      shardingConfig: {
        ...prev.shardingConfig,
        enabled: (preset.config.shardCount ?? 1) > 1,
        count: preset.config.shardCount ?? 1,
      } as ShardingConfig,
    }));
    setHasChanges(true);
  };

  if (!isOpen) return null;

  const artifactModes: { value: ArtifactMode; label: string }[] = [
    { value: 'on', label: 'Always' },
    { value: 'on-failure', label: 'On Failure' },
    { value: 'on-first-retry', label: 'On First Retry' },
    { value: 'off', label: 'Never' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Settings className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Run Configuration</h2>
              <p className="text-sm text-slate-400">Configure test execution settings</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {configuration && onRun && (
              <button
                onClick={() => onRun(configuration)}
                disabled={isLoading || hasChanges}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                Run
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Selector */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-800/30">
          <div className="flex items-center gap-3">
            <select
              value={configuration?.id || ''}
              onChange={(e) => onSelect(e.target.value || null)}
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">Select configuration...</option>
              {configurations.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.name} {config.isDefault && '(Default)'}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowNewForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
            {configuration && onDuplicate && (
              <button
                onClick={() => {
                  const name = prompt('New configuration name:', `${configuration.name} (Copy)`);
                  if (name) onDuplicate(configuration.id, name);
                }}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                title="Duplicate"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
            {configuration && onDelete && (
              <button
                onClick={() => {
                  if (confirm(`Delete "${configuration.name}"?`)) {
                    onDelete(configuration.id);
                  }
                }}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* New configuration form */}
          {showNewForm && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newConfigName}
                onChange={(e) => setNewConfigName(e.target.value)}
                placeholder="Configuration name"
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button
                onClick={handleCreate}
                disabled={!newConfigName.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg disabled:opacity-50"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowNewForm(false);
                  setNewConfigName('');
                }}
                className="px-3 py-2 text-slate-400 hover:text-slate-200 text-sm"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Presets */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-slate-500">Presets:</span>
            {RUN_CONFIGURATION_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                disabled={isLoading}
                className="px-3 py-1 text-xs bg-slate-800 border border-slate-700 rounded hover:border-slate-600 text-slate-300 disabled:opacity-50"
                title={preset.description}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-48 border-r border-slate-800 bg-slate-800/30 overflow-y-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${activeTab === tab.id
                    ? 'bg-blue-600/20 text-blue-400 border-r-2 border-blue-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
              >
                {tab.icon}
                <span className="text-sm font-medium">{tab.label}</span>
                {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {configuration || showNewForm ? (
              <>
                {/* Tests Tab */}
                {activeTab === 'tests' && (
                  <div className="space-y-6">
                    {/* Filter by Tags */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-slate-200">Filter by Tags</h3>
                      <TagSelector
                        label="Include Tags"
                        value={localConfig.tags || []}
                        onChange={(tags) => updateField('tags', tags)}
                        availableTags={availableTags}
                        placeholder="Add tags to include..."
                        helperText="Only tests with these tags will run. Leave empty for all tests."
                        disabled={isLoading}
                      />

                      <div className="flex items-center gap-4">
                        <label className="text-sm text-slate-300">Tag matching:</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => updateField('tagMode', 'any')}
                            className={`px-4 py-2 text-sm rounded-lg transition-colors ${localConfig.tagMode === 'any'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                          >
                            Match ANY
                          </button>
                          <button
                            type="button"
                            onClick={() => updateField('tagMode', 'all')}
                            className={`px-4 py-2 text-sm rounded-lg transition-colors ${localConfig.tagMode === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                          >
                            Match ALL
                          </button>
                        </div>
                      </div>

                      <TagSelector
                        label="Exclude Tags"
                        value={localConfig.excludeTags || []}
                        onChange={(tags) => updateField('excludeTags', tags)}
                        availableTags={availableTags}
                        placeholder="Add tags to exclude..."
                        helperText="Tests with these tags will be skipped"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Filter by Title Pattern (grep) */}
                    <div className="space-y-3 pt-4 border-t border-slate-700">
                      <h3 className="text-lg font-medium text-slate-200">Filter by Title</h3>
                      <div className="space-y-2">
                        <label className="block text-sm text-slate-300">Title Pattern (grep)</label>
                        <input
                          type="text"
                          value={localConfig.grep || ''}
                          onChange={(e) => updateField('grep', e.target.value || undefined)}
                          placeholder="e.g., login, checkout, @smoke"
                          disabled={isLoading}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        />
                        <p className="text-xs text-slate-500">
                          Run only tests whose title matches this pattern. Supports regex.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm text-slate-300">Exclude Pattern (grep invert)</label>
                        <input
                          type="text"
                          value={localConfig.advancedConfig?.grepInvert || ''}
                          onChange={(e) => updateField('advancedConfig', {
                            ...localConfig.advancedConfig,
                            reporters: localConfig.advancedConfig?.reporters || { html: true, json: false, junit: false, github: false, allure: false, list: true },
                            notifications: localConfig.advancedConfig?.notifications || {},
                            debug: localConfig.advancedConfig?.debug || {},
                            grepInvert: e.target.value || undefined,
                          })}
                          placeholder="e.g., flaky, wip, skip"
                          disabled={isLoading}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        />
                        <p className="text-xs text-slate-500">
                          Exclude tests whose title matches this pattern.
                        </p>
                      </div>
                    </div>

                    {/* Additional Options */}
                    <div className="space-y-3 pt-4 border-t border-slate-700">
                      <h3 className="text-lg font-medium text-slate-200">Run Options</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm text-slate-300">Repeat Each Test</label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={localConfig.advancedConfig?.debug?.preserveOutput ? 1 : 1}
                            onChange={() => {/* TODO: Add repeatEach to config */ }}
                            placeholder="1"
                            disabled={isLoading}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                          />
                          <p className="text-xs text-slate-500">
                            Run each test N times (for flaky test detection)
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm text-slate-300">Max Failures</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={localConfig.advancedConfig?.maxFailures || 0}
                            onChange={(e) => updateField('advancedConfig', {
                              ...localConfig.advancedConfig,
                              reporters: localConfig.advancedConfig?.reporters || { html: true, json: false, junit: false, github: false, allure: false, list: true },
                              notifications: localConfig.advancedConfig?.notifications || {},
                              debug: localConfig.advancedConfig?.debug || {},
                              maxFailures: parseInt(e.target.value) || 0,
                            })}
                            placeholder="0 (no limit)"
                            disabled={isLoading}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                          />
                          <p className="text-xs text-slate-500">
                            Stop after N failures (0 = no limit)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={localConfig.advancedConfig?.fullyParallel || false}
                            onChange={(e) => updateField('advancedConfig', {
                              ...localConfig.advancedConfig,
                              reporters: localConfig.advancedConfig?.reporters || { html: true, json: false, junit: false, github: false, allure: false, list: true },
                              notifications: localConfig.advancedConfig?.notifications || {},
                              debug: localConfig.advancedConfig?.debug || {},
                              fullyParallel: e.target.checked,
                            })}
                            disabled={isLoading}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
                          />
                          <span className="text-sm text-slate-300">Fully Parallel</span>
                        </label>
                        <span className="text-xs text-slate-500">Run tests within each file in parallel</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={localConfig.advancedConfig?.forbidOnly || false}
                            onChange={(e) => updateField('advancedConfig', {
                              ...localConfig.advancedConfig,
                              reporters: localConfig.advancedConfig?.reporters || { html: true, json: false, junit: false, github: false, allure: false, list: true },
                              notifications: localConfig.advancedConfig?.notifications || {},
                              debug: localConfig.advancedConfig?.debug || {},
                              forbidOnly: e.target.checked,
                            })}
                            disabled={isLoading}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
                          />
                          <span className="text-sm text-slate-300">Forbid .only</span>
                        </label>
                        <span className="text-xs text-slate-500">Fail if test.only() is present (CI safety)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Environment Tab */}
                {activeTab === 'environment' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-slate-200 mb-4">Execution Environment</h3>
                    <EnvironmentSelector
                      value={localConfig.environmentId}
                      onChange={(id) => updateField('environmentId', id)}
                      environments={environments}
                      onCreateNew={onCreateEnvironment}
                      disabled={isLoading}
                    />
                  </div>
                )}

                {/* Execution Tab - All Run Settings in One Place */}
                {activeTab === 'execution' && (
                  <div className="space-y-6">
                    {/* Run Location Toggle */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-300">Run Location</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => updateField('target', 'local')}
                          disabled={isLoading}
                          className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${localConfig.target === 'local' || !localConfig.target
                              ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                        >
                          <Monitor className="w-5 h-5" />
                          <div className="text-left">
                            <p className="font-medium">Local</p>
                            <p className="text-xs opacity-70">Run on this machine</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateField('target', 'github-actions')}
                          disabled={isLoading}
                          className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${localConfig.target === 'github-actions'
                              ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                        >
                          <Github className="w-5 h-5" />
                          <div className="text-left">
                            <p className="font-medium">GitHub Actions</p>
                            <p className="text-xs opacity-70">Run on GitHub runners</p>
                          </div>
                        </button>
                      </div>
                      {localConfig.target === 'github-actions' && (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isConnected() ? 'bg-green-900/20 border border-green-800' : 'bg-yellow-900/20 border border-yellow-800'
                          }`}>
                          <div className={`w-2 h-2 rounded-full ${isConnected() ? 'bg-green-500' : 'bg-yellow-500'}`} />
                          <span className="text-xs">
                            {isConnected() ? `Connected as ${integration?.login}` : 'GitHub not connected - connect in Settings'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-700" />

                    {/* Browser Selection */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-300">Browser</label>
                      <div className="flex gap-2">
                        {BROWSERS.map((b) => (
                          <button
                            key={b.value}
                            type="button"
                            onClick={() => {
                              updateField('browser', b.value as any);
                              updateField('browserConfig', {
                                ...(localConfig.browserConfig || DEFAULT_BROWSER_CONFIG),
                                type: b.value as any,
                              });
                            }}
                            disabled={isLoading}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-all ${(localConfig.browser || 'chromium') === b.value
                                ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                              }`}
                          >
                            <span className="text-lg">{b.icon}</span>
                            <span className="text-sm font-medium">{b.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Headless Toggle */}
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div>
                        <label className="text-sm font-medium text-slate-300">Headless Mode</label>
                        <p className="text-xs text-slate-500 mt-0.5">Run without visible browser window</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          updateField('headless', !localConfig.headless);
                          updateField('browserConfig', {
                            ...(localConfig.browserConfig || DEFAULT_BROWSER_CONFIG),
                            headless: !localConfig.headless,
                          });
                        }}
                        disabled={isLoading}
                        className={`relative w-12 h-6 rounded-full transition-colors ${localConfig.headless !== false ? 'bg-blue-600' : 'bg-slate-600'
                          }`}
                      >
                        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${localConfig.headless !== false ? 'translate-x-6' : ''
                          }`} />
                      </button>
                    </div>

                    <div className="border-t border-slate-700" />

                    {/* Workers */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-blue-400" />
                          <label className="text-sm font-medium text-slate-300">Workers (Parallel Tests)</label>
                        </div>
                        <span className="text-sm text-blue-400 font-mono">{localConfig.workers || 1}</span>
                      </div>
                      <input
                        type="range"
                        value={localConfig.workers || 1}
                        onChange={(e) => updateField('workers', parseInt(e.target.value))}
                        min={1}
                        max={localConfig.target === 'github-actions' ? 4 : 16}
                        disabled={isLoading}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
                      />
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>1</span>
                        <span>{localConfig.target === 'github-actions' ? '2' : '4'}</span>
                        <span>{localConfig.target === 'github-actions' ? '3' : '8'}</span>
                        <span>{localConfig.target === 'github-actions' ? '4' : '16'}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {localConfig.target === 'github-actions'
                          ? 'Parallel browser instances per GitHub runner VM'
                          : 'Number of tests to run in parallel on your machine'}
                      </p>
                    </div>

                    {/* Shards */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-purple-400" />
                          <label className="text-sm font-medium text-slate-300">Shards (Parallel Jobs)</label>
                        </div>
                        <span className="text-sm text-purple-400 font-mono">{localConfig.shardCount || 1}</span>
                      </div>
                      <input
                        type="range"
                        value={localConfig.shardCount || 1}
                        onChange={(e) => {
                          const count = parseInt(e.target.value);
                          updateField('shardCount', count);
                          updateField('shardingConfig', {
                            ...(localConfig.shardingConfig || DEFAULT_SHARDING_CONFIG),
                            enabled: count > 1,
                            count: count,
                          });
                        }}
                        min={1}
                        max={localConfig.target === 'github-actions' ? 4 : 8}
                        disabled={isLoading}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50"
                      />
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>1</span>
                        <span>2</span>
                        <span>{localConfig.target === 'github-actions' ? '3' : '4'}</span>
                        <span>{localConfig.target === 'github-actions' ? '4' : '8'}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {localConfig.target === 'github-actions'
                          ? 'Number of parallel GitHub runner VMs'
                          : 'Split tests across multiple processes'}
                      </p>
                    </div>

                    {/* Parallelism Summary */}
                    {((localConfig.workers || 1) > 1 || (localConfig.shardCount || 1) > 1) && (
                      <div className="p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-800/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-300">Total Parallelism</span>
                          <span className="text-lg font-bold text-white">
                            {(localConfig.workers || 1) * (localConfig.shardCount || 1)} concurrent
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {localConfig.workers || 1} workers × {localConfig.shardCount || 1} shards
                          {localConfig.target === 'github-actions' && (
                            <span className="text-purple-400"> = {localConfig.shardCount || 1} GitHub jobs</span>
                          )}
                        </p>
                      </div>
                    )}

                    <div className="border-t border-slate-700" />

                    {/* Timeout & Retries Row */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Timeout */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <label className="text-sm font-medium text-slate-300">Timeout</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={(localConfig.timeout || 30000) / 1000}
                            onChange={(e) => updateField('timeout', parseInt(e.target.value) * 1000)}
                            min={5}
                            max={600}
                            disabled={isLoading}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                          />
                          <span className="text-xs text-slate-500">sec</span>
                        </div>
                      </div>

                      {/* Retries */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Retries</label>
                        <div className="flex gap-1">
                          {[0, 1, 2, 3].map((count) => (
                            <button
                              key={count}
                              type="button"
                              onClick={() => updateField('retries', count)}
                              disabled={isLoading}
                              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${(localConfig.retries || 0) === count
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                                } disabled:opacity-50`}
                            >
                              {count}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Advanced Timeouts - Collapsible */}
                    <button
                      type="button"
                      onClick={() => setShowAdvancedTimeouts(!showAdvancedTimeouts)}
                      className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedTimeouts ? 'rotate-180' : ''}`} />
                      Advanced Timeout Settings
                    </button>

                    {showAdvancedTimeouts && (
                      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Action Timeout</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={(localConfig.timeoutConfig?.action || 0) / 1000}
                                onChange={(e) => updateField('timeoutConfig', {
                                  ...(localConfig.timeoutConfig || DEFAULT_TIMEOUT_CONFIG),
                                  action: parseInt(e.target.value) * 1000
                                })}
                                min={0}
                                max={300}
                                disabled={isLoading}
                                className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                              />
                              <span className="text-xs text-slate-500">sec</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Navigation Timeout</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={(localConfig.timeoutConfig?.navigation || 0) / 1000}
                                onChange={(e) => updateField('timeoutConfig', {
                                  ...(localConfig.timeoutConfig || DEFAULT_TIMEOUT_CONFIG),
                                  navigation: parseInt(e.target.value) * 1000
                                })}
                                min={0}
                                max={300}
                                disabled={isLoading}
                                className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                              />
                              <span className="text-xs text-slate-500">sec</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Expect Timeout</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={(localConfig.timeoutConfig?.expect || 5000) / 1000}
                                onChange={(e) => updateField('timeoutConfig', {
                                  ...(localConfig.timeoutConfig || DEFAULT_TIMEOUT_CONFIG),
                                  expect: parseInt(e.target.value) * 1000
                                })}
                                min={1}
                                max={60}
                                disabled={isLoading}
                                className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                              />
                              <span className="text-xs text-slate-500">sec</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Global Timeout</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={(localConfig.timeoutConfig?.global || 0) / 1000 / 60}
                                onChange={(e) => updateField('timeoutConfig', {
                                  ...(localConfig.timeoutConfig || DEFAULT_TIMEOUT_CONFIG),
                                  global: parseInt(e.target.value) * 60 * 1000
                                })}
                                min={0}
                                max={120}
                                disabled={isLoading}
                                className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                              />
                              <span className="text-xs text-slate-500">min</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Fully Parallel Toggle */}
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div>
                        <label className="text-sm font-medium text-slate-300">Fully Parallel</label>
                        <p className="text-xs text-slate-500 mt-0.5">Run tests within files in parallel</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateField('advancedConfig', {
                          ...(localConfig.advancedConfig || DEFAULT_ADVANCED_CONFIG),
                          fullyParallel: !(localConfig.advancedConfig?.fullyParallel ?? false)
                        })}
                        disabled={isLoading}
                        className={`relative w-12 h-6 rounded-full transition-colors ${localConfig.advancedConfig?.fullyParallel ? 'bg-blue-600' : 'bg-slate-600'
                          }`}
                      >
                        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${localConfig.advancedConfig?.fullyParallel ? 'translate-x-6' : ''
                          }`} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Artifacts Tab */}
                {activeTab === 'artifacts' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-slate-200 mb-4">Debug Artifacts</h3>

                    {/* Trace Files - Primary debugging tool */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-slate-300">Trace Files</label>
                        <p className="text-xs text-slate-500 mt-1">
                          Comprehensive debugging with DOM snapshots, network logs, and action timeline. Opens in Trace Viewer.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {artifactModes.map((mode) => (
                          <button
                            key={mode.value}
                            onClick={() => updateField('tracing', mode.value)}
                            disabled={isLoading}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${localConfig.tracing === mode.value
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                              } disabled:opacity-50`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Screenshots */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-slate-300">Screenshots</label>
                        <p className="text-xs text-slate-500 mt-1">
                          Capture screenshots at test failure or after each test.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {artifactModes.map((mode) => (
                          <button
                            key={mode.value}
                            onClick={() => updateField('screenshot', mode.value)}
                            disabled={isLoading}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${localConfig.screenshot === mode.value
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                              } disabled:opacity-50`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
                      <p className="text-sm text-blue-300">
                        💡 <strong>Recommended:</strong> Use "On Failure" for both. This captures debugging info only when tests fail, saving storage while ensuring you have what you need.
                      </p>
                    </div>
                  </div>
                )}

                {/* Advanced Tab */}
                {activeTab === 'advanced' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-slate-200 mb-4">Advanced Options</h3>
                    <AdvancedOptionsPanel
                      config={localConfig.advancedConfig || DEFAULT_ADVANCED_CONFIG}
                      onChange={(advancedConfig) => updateField('advancedConfig', advancedConfig)}
                      disabled={isLoading}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Settings className="w-12 h-12 text-slate-600 mb-4" />
                <p className="text-slate-400">No configuration selected</p>
                <p className="text-sm text-slate-500 mt-1">
                  Select an existing configuration or create a new one
                </p>
                <button
                  onClick={() => setShowNewForm(true)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Configuration
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-800/30">
          <div className="text-sm text-slate-500">
            {localConfig.workers || 1} worker(s) |{' '}
            {localConfig.shardingConfig?.enabled ? `${localConfig.shardingConfig.count} shards` : 'No sharding'} |{' '}
            {localConfig.browserConfig?.type || localConfig.browser || 'chromium'} |{' '}
            {localConfig.target || 'local'}
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <>
                <button
                  onClick={handleReset}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </>
            )}
            {!hasChanges && (
              <span className="flex items-center gap-2 text-sm text-green-400">
                <Zap className="w-4 h-4" />
                All changes saved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Execution Settings Modal */}
      <ExecutionSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        localConfig={localConfig.localConfig}
        onLocalConfigChange={(config) => updateField('localConfig', config)}
        githubActionsConfig={localConfig.githubActionsConfig}
        onGitHubActionsConfigChange={(config) => updateField('githubActionsConfig', config)}
      />
    </div>
  );
};

export default RunConfigurationModal;
