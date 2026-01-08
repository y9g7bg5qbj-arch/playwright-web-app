/**
 * QuickRunModal - Modal for quick ad-hoc test execution
 */
import React, { useState } from 'react';
import { X, Play, Tag, Globe, Monitor, Zap, Settings } from 'lucide-react';
import type {
  QuickRunRequest,
  ExecutionEnvironment,
  RemoteRunner,
  RunConfiguration,
  ExecutionTarget,
} from '@playwright-web-app/shared';
import { TagSelector } from './TagSelector';
import { EnvironmentSelector } from './EnvironmentSelector';
import { ExecutionTargetSelector } from './ExecutionTargetSelector';

interface QuickRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: (config: QuickRunRequest) => void;
  environments: ExecutionEnvironment[];
  runners: RemoteRunner[];
  availableTags: string[];
  configurations: RunConfiguration[];
  initialConfig?: Partial<QuickRunRequest>;
}

const DEFAULT_CONFIG: QuickRunRequest = {
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

export const QuickRunModal: React.FC<QuickRunModalProps> = ({
  isOpen,
  onClose,
  onRun,
  environments,
  runners: _runners, // Reserved for future remote runner selection
  availableTags,
  configurations,
  initialConfig,
}) => {
  const [config, setConfig] = useState<QuickRunRequest>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  const [activeTab, setActiveTab] = useState<'quick' | 'saved'>('quick');
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);

  if (!isOpen) return null;

  const updateConfig = <K extends keyof QuickRunRequest>(key: K, value: QuickRunRequest[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleRun = () => {
    onRun(config);
    onClose();
  };

  const applyConfiguration = (configId: string) => {
    const savedConfig = configurations.find((c) => c.id === configId);
    if (savedConfig) {
      setConfig({
        testFlowIds: savedConfig.testFlowIds,
        tags: savedConfig.tags,
        tagMode: savedConfig.tagMode,
        excludeTags: savedConfig.excludeTags,
        environmentId: savedConfig.environmentId,
        target: savedConfig.target,
        remoteRunnerId: savedConfig.remoteRunnerId,
        browser: savedConfig.browser,
        headless: savedConfig.headless,
        workers: savedConfig.workers,
        retries: savedConfig.retries,
        timeout: savedConfig.timeout,
        tracing: savedConfig.tracing,
        screenshot: savedConfig.screenshot,
        video: savedConfig.video,
      });
      setSelectedConfigId(configId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <Play className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Run Tests</h2>
              <p className="text-sm text-slate-400">Configure and execute tests</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('quick')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'quick'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-600/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4 inline mr-2" />
            Quick Run
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'saved'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-600/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Saved Configurations
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'saved' ? (
            // Saved configurations list
            <div className="space-y-2">
              {configurations.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No saved configurations</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Create configurations in the Run Configuration panel
                  </p>
                </div>
              ) : (
                configurations.map((savedConfig) => (
                  <button
                    key={savedConfig.id}
                    onClick={() => applyConfiguration(savedConfig.id)}
                    className={`
                      w-full flex items-center justify-between p-4 rounded-lg border text-left transition-colors
                      ${
                        selectedConfigId === savedConfig.id
                          ? 'bg-blue-600/20 border-blue-500'
                          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                      }
                    `}
                  >
                    <div>
                      <p className="font-medium text-slate-200">{savedConfig.name}</p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {savedConfig.tags.length > 0 ? savedConfig.tags.join(', ') : 'All tests'} |{' '}
                        {savedConfig.target} | {savedConfig.browser}
                      </p>
                    </div>
                    {savedConfig.isDefault && (
                      <span className="px-2 py-0.5 bg-blue-600/30 text-blue-400 text-xs rounded">
                        Default
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          ) : (
            // Quick run configuration
            <div className="space-y-6">
              {/* Tags */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Tag className="w-4 h-4" />
                  Test Selection
                </div>
                <TagSelector
                  value={config.tags || []}
                  onChange={(tags) => updateConfig('tags', tags)}
                  availableTags={availableTags}
                  placeholder="Filter by tags..."
                  helperText="Leave empty to run all tests"
                />
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-400">Match:</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={config.tagMode === 'any'}
                      onChange={() => updateConfig('tagMode', 'any')}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-slate-300">Any tag</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={config.tagMode === 'all'}
                      onChange={() => updateConfig('tagMode', 'all')}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-slate-300">All tags</span>
                  </label>
                </div>
              </div>

              {/* Environment */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Globe className="w-4 h-4" />
                  Environment
                </div>
                <EnvironmentSelector
                  value={config.environmentId}
                  onChange={(id) => updateConfig('environmentId', id)}
                  environments={environments}
                  showBaseUrl
                />
              </div>

              {/* Execution Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Monitor className="w-4 h-4" />
                  Execution
                </div>

                {/* Execution Target (Local/GitHub Actions) */}
                <ExecutionTargetSelector
                  value={(config.target as ExecutionTarget) || 'local'}
                  onChange={(target) => updateConfig('target', target as any)}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Browser</label>
                    <select
                      value={config.browser}
                      onChange={(e) => updateConfig('browser', e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
                    >
                      <option value="chromium">Chromium</option>
                      <option value="firefox">Firefox</option>
                      <option value="webkit">WebKit</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.headless}
                      onChange={(e) => updateConfig('headless', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
                    />
                    <span className="text-sm text-slate-300">Headless</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Workers:</span>
                    <input
                      type="number"
                      value={config.workers}
                      onChange={(e) => updateConfig('workers', parseInt(e.target.value) || 1)}
                      min={1}
                      max={16}
                      className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Retries:</span>
                    <input
                      type="number"
                      value={config.retries}
                      onChange={(e) => updateConfig('retries', parseInt(e.target.value) || 0)}
                      min={0}
                      max={5}
                      className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-800/30">
          <div className="text-sm text-slate-500">
            {config.tags && config.tags.length > 0
              ? `Running tests with: ${config.tags.join(', ')}`
              : 'Running all tests'}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRun}
              className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
            >
              <Play className="w-4 h-4" />
              Run Tests
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickRunModal;
