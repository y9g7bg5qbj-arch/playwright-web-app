/**
 * RunParametersModal - Jenkins-style "Build with Parameters" modal
 * Manual trigger now supports parameter overrides only.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Play, AlertCircle, Sliders, Settings } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import type {
  Schedule,
  ScheduleParameterValues,
  ScheduleTriggerRequest,
  RunParameterDefinition,
  RunParameterSet,
} from '@playwright-web-app/shared';
import type { RunConfiguration } from '@/store/runConfigStore';

interface RunParametersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: (request: ScheduleTriggerRequest) => void;
  schedule: Schedule;
  runConfiguration?: RunConfiguration | null;
  parameterDefinitions?: RunParameterDefinition[];
  parameterSets?: RunParameterSet[];
  isLoading?: boolean;
}

function toScheduleValue(value: string | number | boolean | undefined): string | number | boolean {
  if (value === undefined) return '';
  return value;
}

export const RunParametersModal: React.FC<RunParametersModalProps> = ({
  isOpen,
  onClose,
  onRun,
  schedule,
  runConfiguration,
  parameterDefinitions = [],
  parameterSets = [],
  isLoading = false,
}) => {
  const [parameterValues, setParameterValues] = useState<ScheduleParameterValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedParameterSet = useMemo(() => {
    if (!runConfiguration?.parameterSetId) return undefined;
    return parameterSets.find((set) => set.id === runConfiguration.parameterSetId);
  }, [parameterSets, runConfiguration?.parameterSetId]);

  const legacyParameters = schedule.parameters || [];
  const hasModernParameters = parameterDefinitions.length > 0;
  const hasLegacyParameters = !hasModernParameters && legacyParameters.length > 0;

  // Initialize defaults whenever modal opens or upstream data changes
  useEffect(() => {
    if (!isOpen) return;

    const defaults: ScheduleParameterValues = {};

    if (hasModernParameters) {
      parameterDefinitions.forEach((def) => {
        defaults[def.name] = toScheduleValue(def.defaultValue as any);
      });

      if (selectedParameterSet) {
        Object.entries(selectedParameterSet.values || {}).forEach(([key, value]) => {
          defaults[key] = toScheduleValue(value as any);
        });
      }

      if (runConfiguration?.parameterOverrides) {
        Object.entries(runConfiguration.parameterOverrides).forEach(([key, value]) => {
          defaults[key] = toScheduleValue(value as any);
        });
      }
    } else if (hasLegacyParameters) {
      legacyParameters.forEach((param) => {
        defaults[param.name] = toScheduleValue(param.defaultValue as any);
      });
    }

    setParameterValues(defaults);
    setErrors({});
  }, [
    hasLegacyParameters,
    hasModernParameters,
    isOpen,
    legacyParameters,
    parameterDefinitions,
    runConfiguration?.parameterOverrides,
    selectedParameterSet,
  ]);

  const updateParameter = (name: string, value: string | number | boolean) => {
    setParameterValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (hasModernParameters) {
      parameterDefinitions.forEach((def) => {
        const raw = parameterValues[def.name];

        if (def.required && (raw === undefined || raw === '')) {
          newErrors[def.name] = `${def.label} is required`;
          return;
        }

        if (raw === undefined || raw === '') {
          return;
        }

        if (def.type === 'number') {
          const num = Number(raw);
          if (Number.isNaN(num)) {
            newErrors[def.name] = `${def.label} must be a number`;
            return;
          }
          if (def.min !== undefined && num < def.min) {
            newErrors[def.name] = `${def.label} must be at least ${def.min}`;
          }
          if (def.max !== undefined && num > def.max) {
            newErrors[def.name] = `${def.label} must be at most ${def.max}`;
          }
        }

        if (def.type === 'enum' && def.choices?.length && !def.choices.includes(String(raw))) {
          newErrors[def.name] = `${def.label} must be one of: ${def.choices.join(', ')}`;
        }
      });
    } else if (hasLegacyParameters) {
      legacyParameters.forEach((param) => {
        const value = parameterValues[param.name];
        if (param.required && (value === undefined || value === '')) {
          newErrors[param.name] = `${param.label} is required`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRun = () => {
    if (!validate()) return;

    onRun({
      parameterValues: Object.keys(parameterValues).length > 0 ? parameterValues : undefined,
    });
  };

  const renderModernInput = (def: RunParameterDefinition) => {
    const value = parameterValues[def.name];

    if (def.type === 'boolean') {
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => updateParameter(def.name, e.target.checked)}
            disabled={isLoading}
            className="w-4 h-4 rounded border-border-default bg-dark-card text-brand-primary focus:ring-status-info"
          />
          <span className="text-sm text-text-secondary">{def.label}</span>
          {def.required && <span className="text-status-danger">*</span>}
        </label>
      );
    }

    if (def.type === 'enum') {
      return (
        <>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {def.label}
            {def.required && <span className="text-status-danger ml-1">*</span>}
          </label>
          <select
            value={String(value ?? '')}
            onChange={(e) => updateParameter(def.name, e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-dark-card border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-status-info"
          >
            <option value="">Select...</option>
            {def.choices?.map((choice) => (
              <option key={choice} value={choice}>{choice}</option>
            ))}
          </select>
        </>
      );
    }

    if (def.type === 'number') {
      return (
        <>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {def.label}
            {def.required && <span className="text-status-danger ml-1">*</span>}
          </label>
          <input
            type="number"
            value={Number(value ?? 0)}
            onChange={(e) => updateParameter(def.name, Number(e.target.value))}
            min={def.min}
            max={def.max}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-dark-card border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-status-info"
          />
        </>
      );
    }

    return (
      <>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          {def.label}
          {def.required && <span className="text-status-danger ml-1">*</span>}
        </label>
        <input
          type="text"
          value={String(value ?? '')}
          onChange={(e) => updateParameter(def.name, e.target.value)}
          disabled={isLoading}
          className="w-full px-3 py-2 bg-dark-card border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-status-info"
        />
      </>
    );
  };

  const renderLegacyInput = (param: any) => {
    const value = parameterValues[param.name] ?? param.defaultValue;

    if (param.type === 'boolean') {
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => updateParameter(param.name, e.target.checked)}
            disabled={isLoading}
            className="w-4 h-4 rounded border-border-default bg-dark-card text-brand-primary focus:ring-status-info"
          />
          <span className="text-sm text-text-secondary">{param.label}</span>
          {param.required && <span className="text-status-danger">*</span>}
        </label>
      );
    }

    if (param.type === 'choice') {
      return (
        <>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {param.label}
            {param.required && <span className="text-status-danger ml-1">*</span>}
          </label>
          <select
            value={String(value ?? '')}
            onChange={(e) => updateParameter(param.name, e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-dark-card border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-status-info"
          >
            {(param.choices || []).map((choice: string) => (
              <option key={choice} value={choice}>{choice}</option>
            ))}
          </select>
        </>
      );
    }

    if (param.type === 'number') {
      return (
        <>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {param.label}
            {param.required && <span className="text-status-danger ml-1">*</span>}
          </label>
          <input
            type="number"
            value={Number(value ?? 0)}
            onChange={(e) => updateParameter(param.name, Number(e.target.value))}
            min={param.min}
            max={param.max}
            step={param.step}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-dark-card border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-status-info"
          />
        </>
      );
    }

    return (
      <>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          {param.label}
          {param.required && <span className="text-status-danger ml-1">*</span>}
        </label>
        <input
          type="text"
          value={String(value ?? '')}
          onChange={(e) => updateParameter(param.name, e.target.value)}
          disabled={isLoading}
          className="w-full px-3 py-2 bg-dark-card border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-status-info"
        />
      </>
    );
  };

  const hasParameters = hasModernParameters || hasLegacyParameters;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Run: ${schedule.name}`}
      description={hasParameters ? 'Configure parameter overrides and run' : 'Run using linked configuration defaults'}
      size="lg"
      bodyClassName="max-h-[70vh]"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-sm text-text-muted">Trigger type: manual</div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button
              variant="success"
              leftIcon={<Play className="w-4 h-4" />}
              isLoading={isLoading}
              onClick={handleRun}
            >
              Run Now
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="border border-border-default rounded-lg p-4 bg-dark-card/40">
          <div className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
            <Settings className="w-4 h-4" />
            Linked Run Configuration
          </div>
          {runConfiguration ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-muted">
              <span>Name: <span className="text-text-primary">{runConfiguration.name}</span></span>
              <span>Target: <span className="text-text-primary">{runConfiguration.target}</span></span>
              <span>Browser: <span className="text-text-primary">{runConfiguration.browser}</span></span>
              <span>Workers: <span className="text-text-primary">{runConfiguration.workers}</span></span>
              <span>Retries: <span className="text-text-primary">{runConfiguration.retries}</span></span>
              <span>Timeout: <span className="text-text-primary">{Math.round(runConfiguration.timeout / 1000)}s</span></span>
              {runConfiguration.tagExpression && (
                <span className="col-span-2">Tag expression: <span className="text-text-primary">{runConfiguration.tagExpression}</span></span>
              )}
              {selectedParameterSet && (
                <span className="col-span-2">Parameter set: <span className="text-text-primary">{selectedParameterSet.name}</span></span>
              )}
            </div>
          ) : (
            <div className="text-xs text-status-warning">
              Linked run configuration could not be resolved in the client store. The backend will still enforce linkage.
            </div>
          )}
        </div>

        {hasParameters ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
              <Sliders className="w-4 h-4" />
              Parameter Overrides
            </div>

            <div className="space-y-4">
              {hasModernParameters && parameterDefinitions.map((def) => (
                <div key={def.id}>
                  {renderModernInput(def)}
                  {def.description && (
                    <p className="text-xs text-text-muted mt-1">{def.description}</p>
                  )}
                  {errors[def.name] && (
                    <p className="text-xs text-status-danger mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors[def.name]}
                    </p>
                  )}
                </div>
              ))}

              {hasLegacyParameters && legacyParameters.map((param: any) => (
                <div key={param.name}>
                  {renderLegacyInput(param)}
                  {param.description && (
                    <p className="text-xs text-text-muted mt-1">{param.description}</p>
                  )}
                  {errors[param.name] && (
                    <p className="text-xs text-status-danger mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors[param.name]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Settings className="w-8 h-8 text-text-muted mx-auto mb-2" />
            <p className="text-sm text-text-muted">No run parameters defined for this application</p>
            <p className="text-xs text-text-muted mt-1">This run will use run configuration defaults.</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RunParametersModal;
