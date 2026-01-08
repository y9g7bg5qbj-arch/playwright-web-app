/**
 * ExecutionConfigPanel - Main configuration panel for parallel execution
 */
import React, { useState } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  RefreshCw,
} from 'lucide-react';
import type { ParallelConfig } from '@/types/execution';
import { ExecutionModeSelector } from './ExecutionModeSelector';
import { BrowserSelector } from './BrowserSelector';
import { WorkerCountSlider } from './WorkerCountSlider';
import { ArtifactSettings } from './ArtifactSettings';

interface ExecutionConfigPanelProps {
  config: ParallelConfig;
  onConfigChange: (config: ParallelConfig) => void;
  onSave?: () => void;
  onReset?: () => void;
  isLoading?: boolean;
  hasChanges?: boolean;
}

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
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors"
        aria-expanded={isOpen}
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

export const ExecutionConfigPanel: React.FC<ExecutionConfigPanelProps> = ({
  config,
  onConfigChange,
  onSave,
  onReset,
  isLoading = false,
  hasChanges = false,
}) => {
  const updateConfig = <K extends keyof ParallelConfig>(
    key: K,
    value: ParallelConfig[K]
  ) => {
    onConfigChange({ ...config, [key]: value });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold text-slate-200">Execution Configuration</h2>
        </div>
        <div className="flex items-center gap-2">
          {onReset && (
            <button
              onClick={onReset}
              disabled={isLoading || !hasChanges}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Reset configuration"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          )}
          {onSave && (
            <button
              onClick={onSave}
              disabled={isLoading || !hasChanges}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors
                ${hasChanges
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }
                disabled:opacity-50
              `}
              aria-label="Save configuration"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Execution Mode */}
        <Section title="Execution Mode" icon={<Zap className="w-4 h-4" />}>
          <ExecutionModeSelector
            value={config.mode}
            onChange={(mode) => updateConfig('mode', mode)}
            disabled={isLoading}
          />
        </Section>

        {/* Workers & Browsers */}
        <Section title="Workers & Browsers" icon={<Settings className="w-4 h-4" />}>
          <WorkerCountSlider
            value={config.workerCount}
            onChange={(count) => updateConfig('workerCount', count)}
            disabled={isLoading}
          />
          <BrowserSelector
            value={config.browsers}
            onChange={(browsers) => updateConfig('browsers', browsers)}
            disabled={isLoading}
          />
        </Section>

        {/* Timeout & Retries */}
        <Section title="Timeout & Retries" icon={<Clock className="w-4 h-4" />} defaultOpen={false}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Test Timeout
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.timeout / 1000}
                  onChange={(e) => updateConfig('timeout', parseInt(e.target.value, 10) * 1000 || 30000)}
                  min={1}
                  max={600}
                  disabled={isLoading}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  aria-label="Timeout in seconds"
                />
                <span className="text-sm text-slate-400">seconds</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Max Retries
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.maxRetries}
                  onChange={(e) => updateConfig('maxRetries', parseInt(e.target.value, 10) || 0)}
                  min={0}
                  max={5}
                  disabled={isLoading}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  aria-label="Maximum retries"
                />
                <RefreshCw className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Failed tests will be retried up to the max retries before being marked as failed.
          </p>
        </Section>

        {/* Artifacts */}
        <Section title="Artifacts" icon={<Save className="w-4 h-4" />} defaultOpen={false}>
          <ArtifactSettings
            value={config.artifacts}
            onChange={(artifacts) => updateConfig('artifacts', artifacts)}
            disabled={isLoading}
          />
        </Section>
      </div>

      {/* Footer with summary */}
      <div className="px-4 py-3 border-t border-slate-800 bg-slate-800/50">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            {config.workerCount} worker{config.workerCount !== 1 ? 's' : ''} | {config.browsers.length} browser
            {config.browsers.length !== 1 ? 's' : ''} | {config.mode} mode
          </span>
          {hasChanges && (
            <span className="flex items-center gap-1 text-orange-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              Unsaved changes
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExecutionConfigPanel;
