import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calendar, RefreshCw, Sliders, Link, X, ChevronDown } from 'lucide-react';
import { schedulesApi, type SchedulePreset } from '@/api/schedules';
import { runConfigurationApi } from '@/api/runConfiguration';
import { nestedProjectsApi } from '@/api/projects';
import { sandboxApi } from '@/api/sandbox';
import { veroApi, type VeroFileNode } from '@/api/vero';
import type { Project, Schedule, ScheduleFolderScope } from '@playwright-web-app/shared';
import { DEFAULT_CONFIG, type RunConfiguration } from '@/store/runConfigStore';
import { toBackendCreate, fromBackendConfig } from '@/store/runConfigMapper';
import { RunConfigEditor } from '@/components/RunConfig/RunConfigEditor';
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

interface SandboxOption {
  id: string;
  name: string;
  folderPath: string;
  source: 'database' | 'filesystem';
  dbStatus?: string;
}

function normalizeSandboxFolderPath(value?: string): string | null {
  if (!value) {
    return null;
  }
  const normalized = String(value).trim().replace(/^\/+|\/+$/g, '');
  if (!normalized) {
    return null;
  }
  if (normalized.startsWith('sandboxes/')) {
    const segments = normalized.split('/').filter(Boolean);
    if (segments.length === 2 && segments[0] === 'sandboxes') {
      return normalized;
    }
    return null;
  }
  if (normalized.includes('/')) {
    return null;
  }
  return `sandboxes/${normalized}`;
}

function collectFilesystemSandboxes(fileTree: VeroFileNode[]): SandboxOption[] {
  const sandboxesNode = fileTree.find(
    (node) => node.type === 'directory' && node.path.replace(/^\/+|\/+$/g, '') === 'sandboxes'
  );
  if (!sandboxesNode?.children || !Array.isArray(sandboxesNode.children)) {
    return [];
  }

  const sandboxes: SandboxOption[] = [];
  for (const child of sandboxesNode.children) {
    if (child.type !== 'directory') {
      continue;
    }
    const folderPath = normalizeSandboxFolderPath(child.path || child.name);
    if (!folderPath) {
      continue;
    }
    sandboxes.push({
      id: folderPath,
      name: child.name || folderPath.replace(/^sandboxes\//, ''),
      folderPath,
      source: 'filesystem',
    });
  }

  return sandboxes.sort((a, b) => a.name.localeCompare(b.name));
}

function makeDefaultEmbeddedConfig(): RunConfiguration {
  return {
    ...DEFAULT_CONFIG,
    id: 'embedded',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as RunConfiguration;
}

function buildConfigSummary(config: RunConfiguration): string {
  const parts: string[] = [];
  parts.push(config.target === 'github-actions' ? 'GitHub Actions' : 'Local');
  parts.push(config.browser || 'chromium');
  parts.push(`${config.workers ?? 1}w`);
  parts.push(`${config.retries ?? 0} retries`);
  parts.push(`${Math.round((config.timeout ?? 30000) / 1000)}s`);
  parts.push(config.headed ? 'headed' : 'headless');
  return parts.join(' · ');
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
  const isCreateMode = !schedule;
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

  const [projectId, setProjectId] = useState<string>(schedule?.projectId || defaultProjectId || '');
  const [scopeFolder, setScopeFolder] = useState<ScheduleFolderScope | ''>(
    schedule?.scopeFolder || inferredLegacyScope.scopeFolder || ''
  );
  const [scopeSandboxId, setScopeSandboxId] = useState<string>(schedule?.scopeSandboxId || '');
  const [legacyScopeUnknown, setLegacyScopeUnknown] = useState<boolean>(inferredLegacyScope.legacyCustomScope);

  const [projects, setProjects] = useState<Project[]>([]);
  const [sandboxes, setSandboxes] = useState<SandboxOption[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingSandboxes, setIsLoadingSandboxes] = useState(false);

  const [chainScheduleIds, setChainScheduleIds] = useState<string[]>(schedule?.onSuccessTriggerScheduleIds || []);
  const [allSchedules, setAllSchedules] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);

  // Embedded run configuration state
  const [embeddedConfig, setEmbeddedConfig] = useState<RunConfiguration>(makeDefaultEmbeddedConfig);
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);

  // For edit mode: load the existing owned config
  useEffect(() => {
    if (!schedule?.runConfigurationId) return;
    let cancelled = false;
    runConfigurationApi.getOne(schedule.runConfigurationId)
      .then((backend) => {
        if (!cancelled) {
          setEmbeddedConfig(fromBackendConfig(backend));
        }
      })
      .catch(() => {
        // If fetch fails, keep defaults
      });
    return () => { cancelled = true; };
  }, [schedule?.runConfigurationId]);

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

  // Fetch other schedules for chain-on-success picker
  useEffect(() => {
    if (!workflowId) return;
    let cancelled = false;
    setIsLoadingSchedules(true);
    schedulesApi.list(workflowId)
      .then((items) => {
        if (!cancelled) {
          setAllSchedules(
            items
              .filter((s) => s.id !== schedule?.id)
              .map((s) => ({ id: s.id, name: s.name }))
          );
        }
      })
      .catch(() => { if (!cancelled) setAllSchedules([]); })
      .finally(() => { if (!cancelled) setIsLoadingSchedules(false); });
    return () => { cancelled = true; };
  }, [workflowId, schedule?.id]);

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
    let cancelled = false;

    if (scopeFolder !== 'sandboxes' || !projectId) {
      setSandboxes([]);
      if (scopeFolder !== 'sandboxes') {
        setScopeSandboxId('');
      }
      return;
    }

    setIsLoadingSandboxes(true);
    Promise.all([
      sandboxApi.listByProject(projectId).catch(() => []),
      veroApi.listFiles(projectId).catch(() => []),
    ])
      .then(([items, fileTree]) => {
        if (!cancelled) {
          const mergedByFolder = new Map<string, SandboxOption>();

          (items || [])
            .forEach((sandbox) => {
              if (!sandbox.folderPath) {
                return;
              }
              mergedByFolder.set(sandbox.folderPath, {
                id: sandbox.folderPath,
                name: sandbox.name,
                folderPath: sandbox.folderPath,
                source: 'database',
                dbStatus: sandbox.status || undefined,
              });
            });

          collectFilesystemSandboxes(Array.isArray(fileTree) ? fileTree : []).forEach((sandbox) => {
            if (!mergedByFolder.has(sandbox.folderPath)) {
              mergedByFolder.set(sandbox.folderPath, sandbox);
            }
          });

          const merged = Array.from(mergedByFolder.values()).sort((a, b) => a.name.localeCompare(b.name));
          setSandboxes(merged);
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
    if (scopeFolder !== 'sandboxes' || !scopeSandboxId || sandboxes.length === 0) {
      return;
    }
    const normalizedScopeFolderPath = normalizeSandboxFolderPath(scopeSandboxId);
    if (!normalizedScopeFolderPath) {
      return;
    }
    const matchedSandbox = sandboxes.find((sandbox) => sandbox.folderPath === normalizedScopeFolderPath);
    if (matchedSandbox && matchedSandbox.id !== scopeSandboxId) {
      setScopeSandboxId(matchedSandbox.id);
    }
  }, [scopeFolder, scopeSandboxId, sandboxes]);

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

  const handlePresetSelect = (preset: SchedulePreset) => {
    setSelectedPreset(preset.label);
    setCronExpression(preset.cronExpression);
  };

  const handleConfigChange = <K extends keyof RunConfiguration>(
    field: K,
    value: RunConfiguration[K]
  ) => {
    setEmbeddedConfig((prev) => ({ ...prev, [field]: value }));
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

    // Convert embedded config to backend payload
    const scheduleRunConfiguration = toBackendCreate(embeddedConfig);

    onSave({
      name,
      description,
      projectId,
      scopeFolder,
      scopeSandboxId: scopeFolder === 'sandboxes' ? scopeSandboxId : undefined,
      cronExpression,
      timezone,
      workflowId,
      isActive: isCreateMode ? true : isActive,
      scheduleRunConfiguration,
      onSuccessTriggerScheduleIds: chainScheduleIds.length > 0 ? chainScheduleIds : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto space-y-6 min-h-0 pb-2">
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
              <option key={`${sandbox.source}:${sandbox.id}`} value={sandbox.id}>
                {sandbox.name}{sandbox.dbStatus && sandbox.dbStatus !== 'active' ? ` (${sandbox.dbStatus})` : ''}
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

      {/* Collapsible Run Configuration Editor */}
      <div className="rounded-lg border border-border-default overflow-hidden">
        <button
          type="button"
          onClick={() => setIsConfigExpanded((prev) => !prev)}
          className="flex w-full items-center gap-2 bg-dark-card/60 px-3 py-2.5 text-left hover:bg-dark-card transition-colors"
        >
          <Sliders className="h-4 w-4 text-text-muted shrink-0" />
          <span className="text-sm font-medium text-text-secondary">Run Configuration</span>
          {!isConfigExpanded && (
            <span className="ml-2 truncate text-xs text-text-muted">
              {buildConfigSummary(embeddedConfig)}
            </span>
          )}
          <ChevronDown
            className={`ml-auto h-4 w-4 text-text-muted shrink-0 transition-transform ${
              isConfigExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isConfigExpanded && (
          <div className="border-t border-border-default">
            <RunConfigEditor
              config={embeddedConfig}
              onChange={handleConfigChange}
              hideName
              hideScope
              scrollable={false}
            />
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

      {isCreateMode ? (
        <div className="p-3 border border-border-default rounded-lg bg-dark-card/40">
          <div className="text-sm font-medium text-text-secondary">Activation</div>
          <div className="text-xs text-text-muted mt-1">
            New schedules are created active. Pause from the schedule card after creation.
          </div>
        </div>
      ) : (
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
      )}

      {/* Chain on Success (P1.2) */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          <span className="flex items-center gap-2">
            <Link className="w-4 h-4 text-text-muted" />
            Chain on Success
          </span>
        </label>
        <p className="text-xs text-text-muted mb-2">
          When this schedule passes, automatically trigger the selected schedules.
        </p>
        {allSchedules.length > 0 ? (
          <>
            <select
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (id && !chainScheduleIds.includes(id)) {
                  setChainScheduleIds([...chainScheduleIds, id]);
                }
              }}
              className="w-full px-3 py-2 bg-dark-card border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-status-info"
            >
              <option value="">Add a schedule to chain...</option>
              {allSchedules
                .filter((s) => !chainScheduleIds.includes(s.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
            {chainScheduleIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {chainScheduleIds.map((id) => {
                  const chainName = allSchedules.find((s) => s.id === id)?.name || id;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-status-info/20 text-status-info text-xs rounded"
                    >
                      {chainName}
                      <button
                        type="button"
                        onClick={() => setChainScheduleIds(chainScheduleIds.filter((cid) => cid !== id))}
                        className="hover:text-status-danger transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </>
        ) : isLoadingSchedules ? (
          <p className="text-xs text-text-muted">Loading schedules...</p>
        ) : (
          <p className="text-xs text-text-muted">No other schedules available to chain.</p>
        )}
      </div>

      </div>

      <div className="flex justify-end gap-3 pt-3 pb-1 border-t border-border-default bg-dark-bg shrink-0">
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
            (scopeFolder === 'sandboxes' && !scopeSandboxId)
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
