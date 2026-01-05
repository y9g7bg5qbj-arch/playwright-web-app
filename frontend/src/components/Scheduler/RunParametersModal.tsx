/**
 * RunParametersModal - Jenkins-style "Build with Parameters" modal
 * Allows users to override parameters when manually triggering a schedule run
 */
import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Settings,
  Sliders,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import type {
  Schedule,
  ScheduleParameterDefinition,
  ScheduleParameterValues,
  ScheduleExecutionConfig,
  ScheduleTriggerRequest,
} from '@playwright-web-app/shared';

interface RunParametersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: (request: ScheduleTriggerRequest) => void;
  schedule: Schedule;
  isLoading?: boolean;
}

export const RunParametersModal: React.FC<RunParametersModalProps> = ({
  isOpen,
  onClose,
  onRun,
  schedule,
  isLoading = false,
}) => {
  const [parameterValues, setParameterValues] = useState<ScheduleParameterValues>({});
  const [executionConfig, setExecutionConfig] = useState<ScheduleExecutionConfig>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize with default values when modal opens
  useEffect(() => {
    if (isOpen && schedule) {
      const defaults: ScheduleParameterValues = {};
      (schedule.parameters || []).forEach(param => {
        defaults[param.name] = param.defaultValue;
      });
      setParameterValues(defaults);
      setExecutionConfig(schedule.defaultExecutionConfig || {});
      setErrors({});
      setShowAdvanced(false);
    }
  }, [isOpen, schedule]);

  if (!isOpen) return null;

  const parameters = schedule.parameters || [];
  const hasParameters = parameters.length > 0;

  const updateParameter = (name: string, value: string | number | boolean) => {
    setParameterValues(prev => ({ ...prev, [name]: value }));
    // Clear error when value changes
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const updateExecutionConfig = <K extends keyof ScheduleExecutionConfig>(
    key: K,
    value: ScheduleExecutionConfig[K]
  ) => {
    setExecutionConfig(prev => ({ ...prev, [key]: value }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    parameters.forEach(param => {
      const value = parameterValues[param.name];

      if (param.required && (value === undefined || value === '')) {
        newErrors[param.name] = `${param.label} is required`;
      }

      if (param.type === 'number' && value !== undefined) {
        const numValue = Number(value);
        if (param.min !== undefined && numValue < param.min) {
          newErrors[param.name] = `Must be at least ${param.min}`;
        }
        if (param.max !== undefined && numValue > param.max) {
          newErrors[param.name] = `Must be at most ${param.max}`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRun = () => {
    if (!validate()) return;

    onRun({
      parameterValues: hasParameters ? parameterValues : undefined,
      executionConfig: showAdvanced ? executionConfig : undefined,
    });
  };

  const renderParameterInput = (param: ScheduleParameterDefinition) => {
    const value = parameterValues[param.name] ?? param.defaultValue;
    const error = errors[param.name];

    switch (param.type) {
      case 'boolean':
        return (
          <div className="space-y-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => updateParameter(param.name, e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
              />
              <span className="text-sm text-slate-300">{param.label}</span>
              {param.required && <span className="text-red-400">*</span>}
            </label>
            {param.description && (
              <p className="text-xs text-slate-500 ml-6">{param.description}</p>
            )}
          </div>
        );

      case 'choice':
        return (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">
              {param.label}
              {param.required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <select
              value={String(value)}
              onChange={(e) => updateParameter(param.name, e.target.value)}
              disabled={isLoading}
              className={`
                w-full px-3 py-2 bg-slate-800 border rounded-lg text-sm text-slate-200
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${error ? 'border-red-500' : 'border-slate-700'}
              `}
            >
              {param.choices?.map(choice => (
                <option key={choice} value={choice}>{choice}</option>
              ))}
            </select>
            {param.description && (
              <p className="text-xs text-slate-500">{param.description}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">
              {param.label}
              {param.required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <input
              type="number"
              value={Number(value)}
              onChange={(e) => updateParameter(param.name, Number(e.target.value))}
              min={param.min}
              max={param.max}
              step={param.step}
              disabled={isLoading}
              className={`
                w-full px-3 py-2 bg-slate-800 border rounded-lg text-sm text-slate-200
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${error ? 'border-red-500' : 'border-slate-700'}
              `}
            />
            {param.description && (
              <p className="text-xs text-slate-500">{param.description}</p>
            )}
          </div>
        );

      case 'string':
      default:
        return (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">
              {param.label}
              {param.required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={String(value)}
              onChange={(e) => updateParameter(param.name, e.target.value)}
              placeholder={param.placeholder}
              disabled={isLoading}
              className={`
                w-full px-3 py-2 bg-slate-800 border rounded-lg text-sm text-slate-200
                placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500
                ${error ? 'border-red-500' : 'border-slate-700'}
              `}
            />
            {param.description && (
              <p className="text-xs text-slate-500">{param.description}</p>
            )}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <Play className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Run: {schedule.name}</h2>
              <p className="text-sm text-slate-400">
                {hasParameters ? 'Configure parameters and run' : 'Configure and run'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
          {/* Parameters Section */}
          {hasParameters && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Sliders className="w-4 h-4" />
                Parameters
              </div>

              <div className="space-y-4">
                {parameters.map(param => (
                  <div key={param.name}>
                    {renderParameterInput(param)}
                    {errors[param.name] && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors[param.name]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Parameters Message */}
          {!hasParameters && (
            <div className="text-center py-4">
              <Settings className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                This schedule has no custom parameters
              </p>
              <p className="text-xs text-slate-500 mt-1">
                You can still configure execution settings below
              </p>
            </div>
          )}

          {/* Advanced Execution Settings (Collapsible) */}
          <div className="border border-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-300">
                  Execution Settings
                </span>
              </div>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {showAdvanced && (
              <div className="p-4 space-y-4 border-t border-slate-700">
                {/* Browser */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-300">Browser</label>
                  <div className="flex gap-2">
                    {(['chromium', 'firefox', 'webkit'] as const).map(browser => (
                      <button
                        key={browser}
                        type="button"
                        onClick={() => updateExecutionConfig('browser', browser)}
                        disabled={isLoading}
                        className={`
                          flex-1 px-3 py-2 text-sm rounded-lg border transition-colors
                          ${executionConfig.browser === browser
                            ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                          }
                        `}
                      >
                        {browser.charAt(0).toUpperCase() + browser.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Headless */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={executionConfig.headless ?? true}
                    onChange={(e) => updateExecutionConfig('headless', e.target.checked)}
                    disabled={isLoading}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-300">Headless mode</span>
                </label>

                {/* Workers & Retries */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-300">Workers</label>
                    <input
                      type="number"
                      value={executionConfig.workers ?? 4}
                      onChange={(e) => updateExecutionConfig('workers', parseInt(e.target.value) || 1)}
                      min={1}
                      max={16}
                      disabled={isLoading}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-300">Retries</label>
                    <input
                      type="number"
                      value={executionConfig.retries ?? 2}
                      onChange={(e) => updateExecutionConfig('retries', parseInt(e.target.value) || 0)}
                      min={0}
                      max={5}
                      disabled={isLoading}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Timeout */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-300">Timeout (seconds)</label>
                  <input
                    type="number"
                    value={(executionConfig.timeout ?? 30000) / 1000}
                    onChange={(e) => updateExecutionConfig('timeout', (parseInt(e.target.value) || 30) * 1000)}
                    min={1}
                    max={600}
                    disabled={isLoading}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Artifacts */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-300">Artifacts</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['tracing', 'screenshot', 'video'] as const).map(artifact => (
                      <div key={artifact} className="space-y-1">
                        <label className="block text-xs text-slate-400 capitalize">{artifact}</label>
                        <select
                          value={executionConfig[artifact] || 'on-failure'}
                          onChange={(e) => updateExecutionConfig(artifact, e.target.value as any)}
                          disabled={isLoading}
                          className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="always">Always</option>
                          <option value="on-failure">On Failure</option>
                          <option value="never">Never</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-800/30">
          <div className="text-sm text-slate-500">
            Trigger type: manual
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRun}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunParametersModal;
