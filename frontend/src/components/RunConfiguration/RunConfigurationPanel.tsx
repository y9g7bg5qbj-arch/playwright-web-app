/**
 * RunConfigurationPanel - Main configuration panel for test runs
 * Provides a modern, user-friendly interface for configuring test execution
 */
import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Play,
  Tag,
  Globe,
  Monitor,
  Clock,
  Camera,
  Copy,
  Trash2,
  Plus,
  Zap,
} from 'lucide-react';
import type {
  RunConfiguration,
  RunConfigurationCreate,
  RunConfigurationUpdate,
  ExecutionEnvironment,
  BrowserType,
  ArtifactMode,
} from '@playwright-web-app/shared';
import { TagSelector } from './TagSelector';
import { EnvironmentSelector } from './EnvironmentSelector';
import { ExecutionTargetSelector } from './ExecutionTargetSelector';
import { ExecutionSettingsModal } from './ExecutionSettingsModal';

// ============================================
// SECTION COMPONENT
// ============================================

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-500">{icon}</span>
          <span className="font-medium text-sm text-slate-200">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>
      {isOpen && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
};

// ============================================
// BROWSER SELECTOR
// ============================================

const browsers: { value: BrowserType; label: string }[] = [
  { value: 'chromium', label: 'Chromium' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'webkit', label: 'WebKit' },
];

interface BrowserSelectorProps {
  value: BrowserType;
  onChange: (browser: BrowserType) => void;
  disabled?: boolean;
}

const BrowserSelector: React.FC<BrowserSelectorProps> = ({ value, onChange, disabled }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-slate-300">Browser</label>
    <div className="flex gap-2">
      {browsers.map((browser) => (
        <button
          key={browser.value}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) {
              onChange(browser.value);
            }
          }}
          disabled={disabled}
          className={`
            flex-1 px-3 py-2 text-sm rounded-lg border transition-colors
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${
              value === browser.value
                ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
            }
          `}
        >
          {browser.label}
        </button>
      ))}
    </div>
  </div>
);

// ============================================
// ARTIFACT MODE SELECTOR
// ============================================

const artifactModes: { value: ArtifactMode; label: string }[] = [
  { value: 'on', label: 'Always' },
  { value: 'on-failure', label: 'On Failure' },
  { value: 'off', label: 'Never' },
];

interface ArtifactModeSelectorProps {
  label: string;
  value: ArtifactMode;
  onChange: (mode: ArtifactMode) => void;
  disabled?: boolean;
}

const ArtifactModeSelector: React.FC<ArtifactModeSelectorProps> = ({
  label,
  value,
  onChange,
  disabled,
}) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-slate-300">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ArtifactMode)}
      disabled={disabled}
      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
    >
      {artifactModes.map((mode) => (
        <option key={mode.value} value={mode.value}>
          {mode.label}
        </option>
      ))}
    </select>
  </div>
);

// ============================================
// MAIN PANEL
// ============================================

interface RunConfigurationPanelProps {
  configuration: RunConfiguration | null;
  configurations: RunConfiguration[];
  environments: ExecutionEnvironment[];
  availableTags: string[];
  onSave: (data: RunConfigurationUpdate) => Promise<void>;
  onCreate: (data: RunConfigurationCreate) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onDuplicate?: (id: string, name: string) => Promise<void>;
  onSelect: (id: string | null) => void;
  onRun?: (config: RunConfiguration) => void;
  onCreateEnvironment?: (data: any) => Promise<void>;
  isLoading?: boolean;
}

export const RunConfigurationPanel: React.FC<RunConfigurationPanelProps> = ({
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
  const [localConfig, setLocalConfig] = useState<Partial<RunConfiguration>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newConfigName, setNewConfigName] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Sync local state with selected configuration
  useEffect(() => {
    if (configuration) {
      setLocalConfig(configuration);
      setHasChanges(false);
    }
  }, [configuration]);

  const updateField = <K extends keyof RunConfiguration>(key: K, value: RunConfiguration[K]) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!configuration) return;
    await onSave(localConfig as RunConfigurationUpdate);
    setHasChanges(false);
  };

  const handleCreate = async () => {
    if (!newConfigName.trim()) return;
    await onCreate({
      name: newConfigName,
      ...localConfig,
    } as RunConfigurationCreate);
    setShowNewForm(false);
    setNewConfigName('');
  };

  const handleReset = () => {
    if (configuration) {
      setLocalConfig(configuration);
      setHasChanges(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold text-slate-200">Run Configuration</h2>
        </div>
        <div className="flex items-center gap-2">
          {configuration && onRun && (
            <button
              onClick={() => onRun(configuration)}
              disabled={isLoading || hasChanges}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-white rounded transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Run
            </button>
          )}
          {hasChanges && (
            <>
              <button
                onClick={handleReset}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {/* Configuration Selector */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/30">
        <div className="flex items-center gap-2">
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
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
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
              className="p-2 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded transition-colors"
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {configuration || showNewForm ? (
          <>
            {/* Test Filters */}
            <Section title="Test Filters" icon={<Tag className="w-4 h-4" />}>
              <TagSelector
                label="Include Tags"
                value={localConfig.tags || []}
                onChange={(tags) => updateField('tags', tags)}
                availableTags={availableTags}
                placeholder="Add tags to include..."
                helperText="Only tests with these tags will run"
                disabled={isLoading}
              />

              <div className="flex items-center gap-4">
                <label className="text-sm text-slate-300">Tag matching:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateField('tagMode', 'any')}
                    className={`px-3 py-1 text-sm rounded ${
                      localConfig.tagMode === 'any'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Match ANY
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('tagMode', 'all')}
                    className={`px-3 py-1 text-sm rounded ${
                      localConfig.tagMode === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400'
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
            </Section>

            {/* Environment */}
            <Section title="Environment" icon={<Globe className="w-4 h-4" />}>
              <EnvironmentSelector
                value={localConfig.environmentId}
                onChange={(id) => updateField('environmentId', id)}
                environments={environments}
                onCreateNew={onCreateEnvironment}
                disabled={isLoading}
              />
            </Section>

            {/* Execution Target */}
            <Section title="Execution" icon={<Monitor className="w-4 h-4" />}>
              <ExecutionTargetSelector
                value={localConfig.target || 'local'}
                onChange={(target) => updateField('target', target)}
                onOpenSettings={() => setShowSettingsModal(true)}
                disabled={isLoading}
              />

              <div className="mt-4">
                <BrowserSelector
                  value={localConfig.browser || 'chromium'}
                  onChange={(browser) => updateField('browser', browser)}
                  disabled={isLoading}
                />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfig.headless ?? true}
                    onChange={(e) => updateField('headless', e.target.checked)}
                    disabled={isLoading}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-sm text-slate-300">Headless mode</span>
                </label>
              </div>
            </Section>

            {/* Parallel Execution */}
            <Section title="Parallel Execution" icon={<Zap className="w-4 h-4" />} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-300">Workers</label>
                  <input
                    type="number"
                    value={localConfig.workers || 1}
                    onChange={(e) => updateField('workers', Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={32}
                    disabled={isLoading}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-300">Shards</label>
                  <input
                    type="number"
                    value={localConfig.shardCount || 1}
                    onChange={(e) => updateField('shardCount', Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={16}
                    disabled={isLoading}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Workers run tests in parallel within a shard. Shards distribute tests across machines.
              </p>
            </Section>

            {/* Timeout & Retries */}
            <Section title="Timeout & Retries" icon={<Clock className="w-4 h-4" />} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-300">Timeout (seconds)</label>
                  <input
                    type="number"
                    value={(localConfig.timeout || 30000) / 1000}
                    onChange={(e) => updateField('timeout', Math.max(1, parseInt(e.target.value) || 30) * 1000)}
                    min={1}
                    max={600}
                    disabled={isLoading}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-300">Retries</label>
                  <input
                    type="number"
                    value={localConfig.retries || 0}
                    onChange={(e) => updateField('retries', Math.max(0, parseInt(e.target.value) || 0))}
                    min={0}
                    max={10}
                    disabled={isLoading}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
              </div>
            </Section>

            {/* Artifacts */}
            <Section title="Artifacts" icon={<Camera className="w-4 h-4" />} defaultOpen={false}>
              <div className="grid grid-cols-3 gap-4">
                <ArtifactModeSelector
                  label="Tracing"
                  value={localConfig.tracing || 'on-failure'}
                  onChange={(mode) => updateField('tracing', mode)}
                  disabled={isLoading}
                />
                <ArtifactModeSelector
                  label="Screenshots"
                  value={localConfig.screenshot || 'on-failure'}
                  onChange={(mode) => updateField('screenshot', mode)}
                  disabled={isLoading}
                />
                <ArtifactModeSelector
                  label="Video"
                  value={localConfig.video || 'off'}
                  onChange={(mode) => updateField('video', mode)}
                  disabled={isLoading}
                />
              </div>
            </Section>
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

      {/* Footer Summary */}
      {configuration && (
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-800/50">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              {localConfig.tags?.length || 0} tags | {localConfig.target || 'local'} |{' '}
              {localConfig.browser || 'chromium'} | {localConfig.workers || 1} worker(s)
            </span>
            {hasChanges && (
              <span className="flex items-center gap-1 text-orange-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                Unsaved changes
              </span>
            )}
          </div>
        </div>
      )}

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

export default RunConfigurationPanel;
