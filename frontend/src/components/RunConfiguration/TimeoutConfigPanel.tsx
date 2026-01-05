/**
 * TimeoutConfigPanel - Configure granular timeout settings for different operations
 */
import React from 'react';
import {
  Clock,
  MousePointer,
  Navigation,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
  Info,
  XCircle,
} from 'lucide-react';
import type { TimeoutConfig } from '@playwright-web-app/shared';

interface TimeoutConfigPanelProps {
  config: TimeoutConfig;
  retries: number;
  onChange: (config: TimeoutConfig) => void;
  onRetriesChange: (retries: number) => void;
  disabled?: boolean;
}

interface TimeoutFieldProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  disabled?: boolean;
}

const TimeoutField: React.FC<TimeoutFieldProps> = ({
  label,
  description,
  icon,
  value,
  onChange,
  min = 1,
  max = 600,
  unit = 'seconds',
  disabled = false,
}) => {
  // Convert ms to seconds for display
  const displayValue = Math.round(value / 1000);

  const handleChange = (newValue: number) => {
    // Convert seconds to ms for storage
    onChange(Math.max(min * 1000, Math.min(max * 1000, newValue * 1000)));
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
      <span className="text-slate-500 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-300">{label}</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={displayValue}
              onChange={(e) => handleChange(parseInt(e.target.value) || min)}
              min={min}
              max={max}
              disabled={disabled}
              className="w-20 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 text-right focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <span className="text-xs text-slate-500">{unit}</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>
    </div>
  );
};


const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  global: 30000,
  action: 15000,
  navigation: 30000,
  expect: 5000,
};

export const TimeoutConfigPanel: React.FC<TimeoutConfigPanelProps> = ({
  config: configProp,
  retries = 0,
  onChange,
  onRetriesChange,
  disabled = false,
}) => {
  // Ensure config is always defined with defaults
  const config = { ...DEFAULT_TIMEOUT_CONFIG, ...configProp };

  const updateTimeout = (key: keyof TimeoutConfig, value: number) => {
    onChange({ ...config, [key]: value });
  };

  const presets = [
    { name: 'Fast', global: 15000, action: 5000, navigation: 15000, expect: 3000 },
    { name: 'Normal', global: 30000, action: 15000, navigation: 30000, expect: 5000 },
    { name: 'Slow', global: 60000, action: 30000, navigation: 60000, expect: 10000 },
    { name: 'Debug', global: 120000, action: 60000, navigation: 120000, expect: 30000 },
  ];

  const applyPreset = (preset: TimeoutConfig) => {
    onChange(preset);
  };

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">Presets:</span>
        {presets.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() =>
              applyPreset({
                global: preset.global,
                action: preset.action,
                navigation: preset.navigation,
                expect: preset.expect,
              })
            }
            disabled={disabled}
            className="px-3 py-1 text-xs bg-slate-800 border border-slate-700 rounded hover:border-slate-600 text-slate-300 disabled:opacity-50"
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Timeout fields */}
      <div className="space-y-2">
        <TimeoutField
          label="Global Timeout"
          description="Maximum time for the entire test to complete"
          icon={<Clock className="w-4 h-4" />}
          value={config.global}
          onChange={(v) => updateTimeout('global', v)}
          max={600}
          disabled={disabled}
        />

        <TimeoutField
          label="Action Timeout"
          description="Maximum time for actions like click, fill, select"
          icon={<MousePointer className="w-4 h-4" />}
          value={config.action}
          onChange={(v) => updateTimeout('action', v)}
          max={120}
          disabled={disabled}
        />

        <TimeoutField
          label="Navigation Timeout"
          description="Maximum time for page navigation (goto, reload)"
          icon={<Navigation className="w-4 h-4" />}
          value={config.navigation}
          onChange={(v) => updateTimeout('navigation', v)}
          max={120}
          disabled={disabled}
        />

        <TimeoutField
          label="Expect Timeout"
          description="Maximum time for assertions and expectations"
          icon={<CheckCircle className="w-4 h-4" />}
          value={config.expect}
          onChange={(v) => updateTimeout('expect', v)}
          max={60}
          disabled={disabled}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-slate-700" />

      {/* Retries section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-300">Retry Configuration</span>
        </div>

        <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Retry Count</label>
              <span className="text-sm text-blue-400 font-mono">{retries}</span>
            </div>
            <input
              type="range"
              value={retries}
              onChange={(e) => onRetriesChange(parseInt(e.target.value))}
              min={0}
              max={5}
              disabled={disabled}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Failed tests will be retried up to {retries} time{retries !== 1 ? 's' : ''} before
              being marked as failed.
            </p>
          </div>
        </div>

        {/* Fail fast option */}
        <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <XCircle className="w-4 h-4 text-slate-500 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Fail Fast</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Stop execution after the first test failure
                </p>
              </div>
              <input
                type="checkbox"
                disabled={disabled}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Max failures */}
        <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <AlertTriangle className="w-4 h-4 text-slate-500 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Max Failures</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Stop execution after N failures (0 = no limit)
                </p>
              </div>
              <input
                type="number"
                min={0}
                max={100}
                defaultValue={0}
                disabled={disabled}
                className="w-20 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 text-right focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Info tip */}
      <div className="flex items-start gap-2 p-3 bg-blue-600/10 border border-blue-500/30 rounded-lg">
        <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-300">
          Timeout values are inherited from parent to child. Action and navigation timeouts cannot
          exceed the global timeout.
        </p>
      </div>
    </div>
  );
};

export default TimeoutConfigPanel;
