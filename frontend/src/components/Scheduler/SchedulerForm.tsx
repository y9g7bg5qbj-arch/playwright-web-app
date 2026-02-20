import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calendar, RefreshCw, Sliders } from 'lucide-react';
import { schedulesApi, type SchedulePreset } from '@/api/schedules';
import { nestedProjectsApi } from '@/api/projects';
import { sandboxApi, type Sandbox } from '@/api/sandbox';
import type { Project, Schedule, ScheduleFolderScope } from '@playwright-web-app/shared';
import { DEFAULT_CONFIG, useRunConfigStore } from '@/store/runConfigStore';
import { CRON_PRESETS } from './schedulerUtils';

export interface ScheduleFormProps {
  schedule?: Schedule;
  workflowId?: string;
  applicationId?: string;
  defaultProjectId?: string;
  onSave: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function inferLegacyScope(schedule?: Schedule): {
  scopeFolder?: ScheduleFolderScope;
  sandboxFolderPath?: string;
  legacyCustomScope: boolean;
} {
  if (!schedule) {
    return { legacyCustomScope: false };
  }

  if (schedule.scopeFolder) {
    return {
      scopeFolder: schedule.scopeFolder,
      sandboxFolderPath: schedule.scopeFolder === 'sandboxes' ? schedule.testSelector?.folders?.[0] : undefined,
      legacyCustomScope: false,
    };
  }

  const folders = schedule.testSelector?.folders ?? [];
  if (folders.length !== 1) {
    return { legacyCustomScope: true };
  }

  const normalized = String(folders[0] || '').replace(/^\/+|\/+$/g, '');
  if (normalized === 'dev' || normalized === 'master') {
    return {
      scopeFolder: normalized,
      legacyCustomScope: false,
    };
  }

  if (normalized.startsWith('sandboxes/')) {
    return {
      scopeFolder: 'sandboxes',
      sandboxFolderPath: normalized,
      legacyCustomScope: false,
    };
  }

  return { legacyCustomScope: true };
}

export const ScheduleForm: React.FC<ScheduleFormProps> = ({
  schedule,
  workflowId,
  applicationId,
  defaultProjectId,
  onSave,
  onCancel,
  isLoading = false,
}) => {
  const inferredLegacyScope = useMemo(() => inferLegacyScope(schedule), [schedule]);

  const [name, setName] = useState(schedule?.name || '');
  const [description, setDescription] = useState(schedule?.description || '');
  const [cronExpression, setCronExpression] = useState(schedule?.cronExpression || '0 6 * * *');
  const [timezone, setTimezone] = useState(schedule?.timezone || 'UTC');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [cronError, setCronError] = useState<string | null>(null);
  const [cronDescription, setCronDescription] = useState<string | null>(null);
  const [nextRuns, setNextRuns] = useState<string[]>([]);
  const [isActive, setIsActive] = useState<boolean>(schedule?.isActive ?? true);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreatingRunConfig, setIsCreatingRunConfig] = useState(false);

  const [projectId, setProjectId] = useState<string>(schedule?.projectId || defaultProjectId || '');
  const [scopeFolder, setScopeFolder] = useState<ScheduleFolderScope | ''>(
    schedule?.scopeFolder || inferredLegacyScope.scopeFolder || ''
  );
  const [scopeSandboxId, setScopeSandboxId] = useState<string>(schedule?.scopeSandboxId || '');
  const [legacyScopeUnknown, setLegacyScopeUnknown] = useState<boolean>(inferredLegacyScope.legacyCustomScope);

  const [projects, setProjects] = useState<Project[]>([]);
  const [sandboxes, setSandboxes] = useState<Sandbox[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingSandboxes, setIsLoadingSandboxes] = useState(false);

  const [runConfigurationId, setRunConfigurationId] = useState<string>(schedule?.runConfigurationId || '');
  const runConfigurations = useRunConfigStore((s) => s.configurations);
  const loadConfigurations = useRunConfigStore((s) => s.loadConfigurations);
  const setRunConfigModalOpen = useRunConfigStore((s) => s.setModalOpen);
  const addConfiguration = useRunConfigStore((s) => s.addConfiguration);
  const runConfigSyncError = useRunConfigStore((s) => s.syncError);

  const availableRunConfigurations = useMemo(
    () => {
      if (!workflowId || !projectId) {
        return [];
      }
      return runConfigurations.filter(
        (config) =>
          !config.id.startsWith('config_') &&
          config.workflowId === workflowId &&
          config.projectId === projectId
      );
    },
    [runConfigurations, workflowId, projectId]
  );
  const hasSelectedRunConfiguration = useMemo(
    () => availableRunConfigurations.some((config) => config.id === runConfigurationId),
    [availableRunConfigurations, runConfigurationId]
  );
  const effectiveRunConfigurationId = hasSelectedRunConfiguration ? runConfigurationId : '';

  useEffect(() => {
    let cancelled = false;
    if (!applicationId) {
      setProjects([]);
      return;
    }

    setIsLoadingProjects(true);
    nestedProjectsApi
      .getAll(applicationId)
      .then((items) => {
        if (!cancelled) {
          setProjects(Array.isArray(items) ? items : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProjects([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingProjects(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  useEffect(() => {
    if (!schedule?.projectId && defaultProjectId) {
      setProjectId(defaultProjectId);
    }
  }, [defaultProjectId, schedule?.projectId]);

  useEffect(() => {
    if (isLoadingProjects || projects.length === 0 || !projectId) {
      return;
    }
    if (projects.some((project) => project.id === projectId)) {
      return;
    }

    const fallbackProjectId = projects.some((project) => project.id === defaultProjectId)
      ? defaultProjectId || ''
      : projects[0]?.id || '';
    if (!fallbackProjectId) {
      return;
    }

    setProjectId(fallbackProjectId);
    setScopeSandboxId('');
  }, [defaultProjectId, isLoadingProjects, projectId, projects]);

  useEffect(() => {
    if (!cronExpression) return;

    const validateCron = async () => {
      try {
        const result = await schedulesApi.validateCron(cronExpression, 5, timezone);
        if (result.valid) {
          setCronError(null);
          setCronDescription(result.description || null);
          setNextRuns(result.nextRuns || []);
        } else {
          setCronError(result.error || 'Invalid cron expression');
          setCronDescription(null);
          setNextRuns([]);
        }
      } catch {
        // Ignore validation errors while typing
      }
    };

    const timer = setTimeout(validateCron, 500);
    return () => clearTimeout(timer);
  }, [cronExpression, timezone]);

  useEffect(() => {
    if (!workflowId || !projectId) {
      return;
    }
    if (applicationId) {
      if (isLoadingProjects) {
        return;
      }
      if (projects.length === 0 || !projects.some((project) => project.id === projectId)) {
        return;
      }
    }
    void loadConfigurations(workflowId, projectId);
  }, [workflowId, projectId, applicationId, isLoadingProjects, projects, loadConfigurations]);

  useEffect(() => {
    let cancelled = false;

    if (scopeFolder !== 'sandboxes' || !projectId) {
      setSandboxes([]);
      if (scopeFolder !== 'sandboxes') {
        setScopeSandboxId('');
      }
      return;
    }

    setIsLoadingSandboxes(true);
    sandboxApi
      .listByProject(projectId)
      .then((items) => {
        if (!cancelled) {
          setSandboxes((items || []).filter((sandbox) => sandbox.status === 'active'));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSandboxes([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSandboxes(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, scopeFolder]);

  useEffect(() => {
    if (
      scopeFolder !== 'sandboxes' ||
      scopeSandboxId ||
      !inferredLegacyScope.sandboxFolderPath ||
      sandboxes.length === 0
    ) {
      return;
    }

    const matchedSandbox = sandboxes.find((sandbox) => sandbox.folderPath === inferredLegacyScope.sandboxFolderPath);
    if (matchedSandbox) {
      setScopeSandboxId(matchedSandbox.id);
    }
  }, [scopeFolder, scopeSandboxId, inferredLegacyScope.sandboxFolderPath, sandboxes]);

  useEffect(() => {
    if (!runConfigurationId) {
      return;
    }
    if (availableRunConfigurations.length === 0) {
      return;
    }
    if (!availableRunConfigurations.some((config) => config.id === runConfigurationId)) {
      setRunConfigurationId('');
    }
  }, [availableRunConfigurations, runConfigurationId]);

  useEffect(() => {
    if (!schedule || schedule.scopeFolder) {
      return;
    }

    if (!projectId || !scopeFolder) {
      return;
    }

    if (scopeFolder !== 'sandboxes' || scopeSandboxId) {
      setLegacyScopeUnknown(false);
    }
  }, [projectId, scopeFolder, scopeSandboxId, schedule]);

  const selectedConfig = availableRunConfigurations.find((c) => c.id === runConfigurationId);

  const handlePresetSelect = (preset: SchedulePreset) => {
    setSelectedPreset(preset.label);
    setCronExpression(preset.cronExpression);
  };

  const handleCreateRunConfiguration = async () => {
    if (!workflowId || !projectId || isCreatingRunConfig) {
      return;
    }

    setIsCreatingRunConfig(true);
    try {
      const created = await addConfiguration(DEFAULT_CONFIG, workflowId, projectId);
      setRunConfigurationId(created.id);
      setFormError(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to create run configuration');
    } finally {
      setIsCreatingRunConfig(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setFormError(null);

    if (!name || !cronExpression || cronError) {
      if (cronError) {
        setFormError(cronError);
      }
      return;
    }

    if (!workflowId) {
      setFormError('Workflow context is required. Reopen scheduler from an active workflow.');
      return;
    }

    if (!applicationId) {
      setFormError('Application context is required to create schedules.');
      return;
    }

    if (!projectId) {
      setFormError('Project selection is required.');
      return;
    }

    if (!scopeFolder) {
      setFormError('Environment scope is required.');
      return;
    }

    if (scopeFolder === 'sandboxes' && !scopeSandboxId) {
      setFormError('Sandbox selection is required when environment is Sandboxes.');
      return;
    }

    if (!runConfigurationId || !hasSelectedRunConfiguration) {
      setFormError('Run configuration is required.');
      return;
    }

    onSave({
      name,
      description,
      projectId,
      scopeFolder,
      scopeSandboxId: scopeFolder === 'sandboxes' ? scopeSandboxId : undefined,
      cronExpression,
      timezone,
      workflowId,
      isActive,
      runConfigurationId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Schedule Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Nightly Regression Suite"
          className="w-full px-3 py-2 bg-dark-card border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-status-info"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Runs all regression tests every night"
          className="w-full px-3 py-2 bg-dark-card border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-status-info"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Project *</label>
        <select
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setScopeSandboxId('');
          }}
          className={`w-full px-3 py-2 bg-dark-card border rounded-lg text-text-primary focus:outline-none focus:ring-2 ${
            submitAttempted && !projectId
              ? 'border-status-danger focus:ring-status-danger'
              : 'border-border-default focus:ring-status-info'
          }`}
          required
        >
          <option value="">Select a project...</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-text-muted mt-1">Scope starts from this nested project inside the selected application.</p>
        {isLoadingProjects && <p className="text-xs text-text-muted mt-1">Loading projects...</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Environment Scope *</label>
        <select
          value={scopeFolder}
          onChange={(e) => {
            const value = e.target.value as ScheduleFolderScope | '';
            setScopeFolder(value);
            if (value !== 'sandboxes') {
              setScopeSandboxId('');
            }
          }}
          className={`w-full px-3 py-2 bg-dark-card border rounded-lg text-text-primary focus:outline-none focus:ring-2 ${
            submitAttempted && !scopeFolder
              ? 'border-status-danger focus:ring-status-danger'
              : 'border-border-default focus:ring-status-info'
          }`}
          required
        >
          <option value="">Select environment scope...</option>
          <option value="dev">Development (`dev` folder)</option>
          <option value="master">Production (`master` folder)</option>
          <option value="sandboxes">Sandbox (`sandboxes/*`)</option>
        </select>
        <p className="text-xs text-text-muted mt-1">This controls file-system folder scope only. Variable environments stay in Run Configuration.</p>
      </div>

      {scopeFolder === 'sandboxes' && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Sandbox *</label>
          <select
            value={scopeSandboxId}
            onChange={(e) => setScopeSandboxId(e.target.value)}
            className={`w-full px-3 py-2 bg-dark-card border rounded-lg text-text-primary focus:outline-none focus:ring-2 ${
              submitAttempted && !scopeSandboxId
                ? 'border-status-danger focus:ring-status-danger'
                : 'border-border-default focus:ring-status-info'
            }`}
            required
          >
            <option value="">Select sandbox...</option>
            {sandboxes.map((sandbox) => (
              <option key={sandbox.id} value={sandbox.id}>
                {sandbox.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-muted mt-1">Required when scheduling against the `sandboxes` scope.</p>
          {isLoadingSandboxes && <p className="text-xs text-text-muted mt-1">Loading sandboxes...</p>}
        </div>
      )}

      {legacyScopeUnknown && (
        <div className="rounded-lg border border-status-warning/60 bg-status-warning/10 px-3 py-2 text-xs text-status-warning flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            Legacy custom scope detected for this schedule. Re-select project and environment scope before saving.
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          <span className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-text-muted" />
            Run Configuration *
          </span>
        </label>
        <select
          value={effectiveRunConfigurationId}
          onChange={(e) => {
            setRunConfigurationId(e.target.value);
            if (e.target.value) {
              setFormError(null);
            }
          }}
          className={`w-full px-3 py-2 bg-dark-card border rounded-lg text-text-primary focus:outline-none focus:ring-2 ${
            submitAttempted && !runConfigurationId
              ? 'border-status-danger focus:ring-status-danger'
              : 'border-border-default focus:ring-status-info'
          }`}
          required
        >
          <option value="">Select a run configuration...</option>
          {availableRunConfigurations.map((config) => (
            <option key={config.id} value={config.id}>
              {config.name} — {config.target}, {config.browser}, {config.workers}w, {config.headed ? 'headed' : 'headless'}
            </option>
          ))}
        </select>

        {availableRunConfigurations.length === 0 && (
          <div className="mt-1 space-y-2">
            <p className="text-xs text-status-warning">
              No API-backed run configurations found for this workflow. Create one in Run Configuration first.
            </p>
            {runConfigSyncError && <p className="text-xs text-status-danger">{runConfigSyncError}</p>}
            <button
              type="button"
              onClick={() => {
                void handleCreateRunConfiguration();
              }}
              disabled={!workflowId || !projectId || isCreatingRunConfig}
              className="inline-flex items-center rounded border border-border-default px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:border-border-emphasis disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreatingRunConfig ? 'Creating...' : 'Create Run Configuration'}
            </button>
            <button
              type="button"
              onClick={() => setRunConfigModalOpen(true)}
              className="ml-2 inline-flex items-center rounded border border-border-default px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:border-border-emphasis"
            >
              Open Run Configuration
            </button>
            {!workflowId && (
              <p className="text-xs text-status-danger">Select an application with a workflow before creating run configurations.</p>
            )}
            {workflowId && !projectId && (
              <p className="text-xs text-status-danger">Select a project folder to load run configurations.</p>
            )}
          </div>
        )}

        {submitAttempted && !hasSelectedRunConfiguration && (
          <p className="text-xs text-status-danger mt-1">Select a run configuration to save this schedule.</p>
        )}
        {!workflowId && (
          <p className="text-xs text-status-danger mt-1">Workflow context missing. Scheduler requires workflow-linked run configurations.</p>
        )}
        {workflowId && !projectId && (
          <p className="text-xs text-status-danger mt-1">Project selection is required for project-scoped run configurations.</p>
        )}

        {selectedConfig && (
          <div className="mt-2 p-3 bg-dark-elevated rounded-lg border border-border-default">
            <div className="text-xs font-medium text-text-secondary mb-1">Configuration Summary</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-muted">
              <span>
                Target: <span className="text-text-primary">{selectedConfig.target}</span>
              </span>
              <span>
                Browser: <span className="text-text-primary">{selectedConfig.browser}</span>
              </span>
              <span>
                Workers: <span className="text-text-primary">{selectedConfig.workers}</span>
              </span>
              <span>
                Retries: <span className="text-text-primary">{selectedConfig.retries}</span>
              </span>
              <span>
                Timeout: <span className="text-text-primary">{Math.round(selectedConfig.timeout / 1000)}s</span>
              </span>
              <span>
                Mode: <span className="text-text-primary">{selectedConfig.headed ? 'Headed' : 'Headless'}</span>
              </span>
              {selectedConfig.tagExpression && (
                <span className="col-span-2">
                  Tag expression: <span className="text-text-primary">{selectedConfig.tagExpression}</span>
                </span>
              )}
              {selectedConfig.grep && (
                <span className="col-span-2">
                  Grep: <span className="text-text-primary">{selectedConfig.grep}</span>
                </span>
              )}
              {selectedConfig.parameterSetId && (
                <span className="col-span-2">
                  Parameter set: <span className="text-text-primary">{selectedConfig.parameterSetId}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Schedule Frequency</label>
        <div className="grid grid-cols-3 gap-2">
          {CRON_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              className={`p-2 text-left border rounded-lg transition-colors ${
                selectedPreset === preset.label || cronExpression === preset.cronExpression
                  ? 'border-status-info bg-status-info/30 text-status-info'
                  : 'border-border-default hover:border-border-default text-text-muted'
              }`}
            >
              <div className="text-sm font-medium">{preset.label}</div>
              <div className="text-xs text-text-muted mt-0.5">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Cron Expression *</label>
        <input
          type="text"
          value={cronExpression}
          onChange={(e) => setCronExpression(e.target.value)}
          placeholder="0 6 * * *"
          className={`w-full px-3 py-2 bg-dark-card border rounded-lg text-text-primary font-mono text-sm focus:outline-none focus:ring-2 ${
            cronError ? 'border-status-danger focus:ring-status-danger' : 'border-border-default focus:ring-status-info'
          }`}
          required
        />
        {cronError && <p className="text-status-danger text-xs mt-1">{cronError}</p>}
        {cronDescription && !cronError && <p className="text-status-success text-xs mt-1">{cronDescription}</p>}
        {nextRuns.length > 0 && !cronError && (
          <div className="mt-2 text-xs text-text-muted">
            <span className="font-medium">Next runs:</span>
            <ul className="mt-1 space-y-0.5">
              {nextRuns.slice(0, 3).map((run, i) => (
                <li key={i}>{new Date(run).toLocaleString()}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Timezone</label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full px-3 py-2 bg-dark-card border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-status-info"
        >
          <option value="UTC">UTC</option>
          <option value="America/New_York">America/New_York (EST/EDT)</option>
          <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
          <option value="Europe/London">Europe/London (GMT/BST)</option>
          <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
          <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
          <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
          <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
        </select>
      </div>

      <div className="flex items-center justify-between p-3 border border-border-default rounded-lg bg-dark-card/40">
        <div>
          <div className="text-sm font-medium text-text-secondary">Active</div>
          <div className="text-xs text-text-muted">Inactive schedules are saved but will not auto-run.</div>
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <div className="relative w-11 h-6 bg-dark-elevated peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-status-info rounded-full peer peer-checked:bg-status-success/70 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
        {formError && <p className="mr-auto text-xs text-status-danger self-center">{formError}</p>}
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-text-muted hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={
            isLoading ||
            !name ||
            !cronExpression ||
            !!cronError ||
            !workflowId ||
            !applicationId ||
            !projectId ||
            !scopeFolder ||
            (scopeFolder === 'sandboxes' && !scopeSandboxId) ||
            !hasSelectedRunConfiguration
          }
          className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4" />
              {schedule ? 'Update Schedule' : 'Create Schedule'}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ScheduleForm;
