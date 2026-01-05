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
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Copy,
  Trash2,
  Plus,
  Container,
  Server,
} from 'lucide-react';
import type {
  RunConfiguration,
  RunConfigurationCreate,
  ExecutionEnvironment,
  BrowserConfig,
  ShardingConfig,
  AdvancedConfig,
  ArtifactMode,
  DockerExecutionConfig,
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
import { ExecutionTargetSelector } from './ExecutionTargetSelector';
import { ExecutionSettingsModal } from './ExecutionSettingsModal';
import { BrowserConfigPanel } from './BrowserConfigPanel';
import { AdvancedOptionsPanel } from './AdvancedOptionsPanel';

type TabId = 'tests' | 'environment' | 'target' | 'browser' | 'execution' | 'artifacts' | 'advanced';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'tests', label: 'Tests', icon: <Tag className="w-4 h-4" /> },
  { id: 'environment', label: 'Environment', icon: <Globe className="w-4 h-4" /> },
  { id: 'target', label: 'Target', icon: <Server className="w-4 h-4" /> },
  { id: 'browser', label: 'Browser', icon: <Monitor className="w-4 h-4" /> },
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
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  activeTab === tab.id
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
                            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                              localConfig.tagMode === 'any'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Match ANY
                          </button>
                          <button
                            type="button"
                            onClick={() => updateField('tagMode', 'all')}
                            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                              localConfig.tagMode === 'all'
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
                            onChange={() => {/* TODO: Add repeatEach to config */}}
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

                {/* Target Tab */}
                {activeTab === 'target' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-slate-200 mb-4">Execution Target</h3>
                    <ExecutionTargetSelector
                      value={localConfig.target || 'local'}
                      onChange={(target) => updateField('target', target)}
                      onOpenSettings={() => setShowSettingsModal(true)}
                      disabled={isLoading}
                    />

                    {/* Note: Docker and GitHub Actions configs are now handled inside ExecutionTargetSelector */}
                    {false && localConfig.target === 'docker' && (
                      <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-4">
                        <div className="flex items-center gap-2">
                          <Container className="w-5 h-5 text-blue-400" />
                          <h4 className="text-sm font-medium text-slate-200">Docker Configuration (Legacy)</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Shards</label>
                            <input
                              type="number"
                              value={localConfig.dockerConfig?.shardCount || 1}
                              onChange={(e) =>
                                updateField('dockerConfig', {
                                  shardCount: parseInt(e.target.value) || 1,
                                  memory: localConfig.dockerConfig?.memory ?? '2G',
                                  cpus: localConfig.dockerConfig?.cpus ?? '1.0',
                                } as DockerExecutionConfig)
                              }
                              disabled={isLoading}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Memory</label>
                            <select
                              value={localConfig.dockerConfig?.memory || '2G'}
                              onChange={(e) =>
                                updateField('dockerConfig', {
                                  shardCount: localConfig.dockerConfig?.shardCount ?? 1,
                                  memory: e.target.value as '1G' | '2G' | '4G' | '8G',
                                  cpus: localConfig.dockerConfig?.cpus ?? '1.0',
                                } as DockerExecutionConfig)
                              }
                              disabled={isLoading}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                            >
                              <option value="1G">1 GB</option>
                              <option value="2G">2 GB</option>
                              <option value="4G">4 GB</option>
                              <option value="8G">8 GB</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">CPUs</label>
                            <select
                              value={localConfig.dockerConfig?.cpus || '1.0'}
                              onChange={(e) =>
                                updateField('dockerConfig', {
                                  shardCount: localConfig.dockerConfig?.shardCount ?? 1,
                                  memory: localConfig.dockerConfig?.memory ?? '2G',
                                  cpus: e.target.value as '0.5' | '1.0' | '2.0' | '4.0',
                                } as DockerExecutionConfig)
                              }
                              disabled={isLoading}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                            >
                              <option value="0.5">0.5</option>
                              <option value="1.0">1.0</option>
                              <option value="2.0">2.0</option>
                              <option value="4.0">4.0</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Placeholder</label>
                            <input
                              type="number"
                              value={1}
                              min={1}
                              max={32}
                              disabled={true}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Browser Tab */}
                {activeTab === 'browser' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-slate-200 mb-4">Browser Configuration</h3>
                    <BrowserConfigPanel
                      config={localConfig.browserConfig || DEFAULT_BROWSER_CONFIG}
                      onChange={(browserConfig) => updateField('browserConfig', browserConfig)}
                      disabled={isLoading}
                    />
                  </div>
                )}

                {/* Execution Tab - Combines Workers, Timeout, and Retries */}
                {activeTab === 'execution' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-slate-200 mb-4">Execution Settings</h3>

                    {/* Workers */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-300">Workers (Parallel Tests)</label>
                        <span className="text-sm text-blue-400 font-mono">{localConfig.workers || 1}</span>
                      </div>
                      <input
                        type="range"
                        value={localConfig.workers || 1}
                        onChange={(e) => updateField('workers', parseInt(e.target.value))}
                        min={1}
                        max={16}
                        disabled={isLoading}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
                      />
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>1</span>
                        <span>4</span>
                        <span>8</span>
                        <span>16</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Number of tests to run in parallel. Higher = faster but more resource intensive.
                      </p>
                    </div>

                    {/* Timeout */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Test Timeout</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={(localConfig.timeout || 30000) / 1000}
                          onChange={(e) => updateField('timeout', parseInt(e.target.value) * 1000)}
                          min={5}
                          max={600}
                          disabled={isLoading}
                          className="w-24 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        />
                        <span className="text-sm text-slate-400">seconds</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Maximum time for each test before it's marked as failed.
                      </p>

                      {/* Advanced Timeouts - Collapsible */}
                      <button
                        onClick={() => setShowAdvancedTimeouts(!showAdvancedTimeouts)}
                        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mt-3"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedTimeouts ? 'rotate-180' : ''}`} />
                        Advanced Timeouts
                      </button>

                      {showAdvancedTimeouts && (
                        <div className="mt-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-4">
                          {/* Action Timeout */}
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium text-slate-300">Action Timeout</label>
                              <p className="text-xs text-slate-500">For click, fill, etc. (0 = inherit from test)</p>
                            </div>
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
                                className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                              />
                              <span className="text-xs text-slate-400">sec</span>
                            </div>
                          </div>

                          {/* Navigation Timeout */}
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium text-slate-300">Navigation Timeout</label>
                              <p className="text-xs text-slate-500">For page.goto(), reload (0 = inherit)</p>
                            </div>
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
                                className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                              />
                              <span className="text-xs text-slate-400">sec</span>
                            </div>
                          </div>

                          {/* Expect Timeout */}
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium text-slate-300">Expect Timeout</label>
                              <p className="text-xs text-slate-500">For assertions to pass</p>
                            </div>
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
                                className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                              />
                              <span className="text-xs text-slate-400">sec</span>
                            </div>
                          </div>

                          {/* Global Timeout */}
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium text-slate-300">Global Timeout</label>
                              <p className="text-xs text-slate-500">Max time for entire test run (0 = no limit)</p>
                            </div>
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
                                className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                              />
                              <span className="text-xs text-slate-400">min</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Retries */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Retries on Failure</label>
                      <div className="flex items-center gap-4">
                        {[0, 1, 2, 3].map((count) => (
                          <button
                            key={count}
                            onClick={() => updateField('retries', count)}
                            disabled={isLoading}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              (localConfig.retries || 0) === count
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            } disabled:opacity-50`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500">
                        Number of times to retry a failed test before marking it as failed.
                      </p>
                    </div>

                    {/* Fully Parallel */}
                    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div>
                        <label className="text-sm font-medium text-slate-300">Fully Parallel</label>
                        <p className="text-xs text-slate-500 mt-1">
                          Run tests within each file in parallel (not just across files)
                        </p>
                      </div>
                      <button
                        onClick={() => updateField('advancedConfig', {
                          ...(localConfig.advancedConfig || DEFAULT_ADVANCED_CONFIG),
                          fullyParallel: !(localConfig.advancedConfig?.fullyParallel ?? false)
                        })}
                        disabled={isLoading}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          localConfig.advancedConfig?.fullyParallel
                            ? 'bg-blue-600'
                            : 'bg-slate-600'
                        } disabled:opacity-50`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            localConfig.advancedConfig?.fullyParallel ? 'translate-x-6' : ''
                          }`}
                        />
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
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              localConfig.tracing === mode.value
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
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              localConfig.screenshot === mode.value
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
