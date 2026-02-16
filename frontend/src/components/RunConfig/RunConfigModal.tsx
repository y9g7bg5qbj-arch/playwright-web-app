// design-lint-ignore NO_HARDCODED_MODAL — max-w-6xl 2-panel+6-tab layout exceeds Modal's max-w-4xl; interior controls use shared primitives
import { useState, useEffect, useMemo, useRef, type ComponentType } from 'react';
import {
  X,
  Plus,
  Trash2,
  Copy,
  Play,
  Save,
  Settings,
  SlidersHorizontal,
  Filter,
  Timer,
  Clapperboard,
  Image,
  Wrench,
  FlaskConical,
} from 'lucide-react';
import { useRunConfigStore, type RunConfiguration, DEFAULT_CONFIG, PRESET_CONFIGS } from '@/store/runConfigStore';
import { useProjectStore } from '@/store/projectStore';
import { GeneralTab } from './GeneralTab';
import { ExecutionTab } from './ExecutionTab';
import { FilteringTab } from './FilteringTab';
import { TimeoutsTab } from './TimeoutsTab';
import { ArtifactsTab } from './ArtifactsTab';
import { VisualTab } from './VisualTab';
import { AdvancedTab } from './AdvancedTab';
import { ParametersTab } from './ParametersTab';
import { Tabs, TabsList, TabsTrigger, Button, Tooltip } from '@/components/ui';
import { cx } from './theme';

type TabType = 'general' | 'execution' | 'filtering' | 'timeouts' | 'artifacts' | 'visual' | 'parameters' | 'advanced';

const TABS: { id: TabType; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'execution', label: 'Execution', icon: SlidersHorizontal },
  { id: 'filtering', label: 'Filtering', icon: Filter },
  { id: 'timeouts', label: 'Timeouts', icon: Timer },
  { id: 'artifacts', label: 'Artifacts', icon: Clapperboard },
  { id: 'visual', label: 'Visual', icon: Image },
  { id: 'parameters', label: 'Parameters', icon: FlaskConical },
  { id: 'advanced', label: 'Advanced', icon: Wrench },
];

interface RunConfigModalProps {
  onRun?: (configId: string) => void;
  workflowId?: string;
  projectId?: string;
}

type DraftRunConfiguration = Omit<RunConfiguration, 'id' | 'createdAt' | 'updatedAt'>;

export function RunConfigModal({ onRun, workflowId, projectId }: RunConfigModalProps) {
  const {
    configurations,
    isModalOpen,
    setModalOpen,
    addConfiguration,
    updateConfiguration,
    deleteConfiguration,
    duplicateConfiguration,
    markConfigUsed,
    activeConfigId,
    setActiveConfig,
  } = useRunConfigStore();
  const applications = useProjectStore((state) => state.projects);
  const currentApplication = useProjectStore((state) => state.currentProject);

  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<RunConfiguration | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const autoCreateAttemptScopeRef = useRef<string | null>(null);
  const resolvedProjectId = useMemo(
    () => projectId || currentApplication?.projects?.[0]?.id || applications[0]?.projects?.[0]?.id,
    [projectId, currentApplication?.projects, applications]
  );
  const scopeApplication = useMemo(() => {
    if (resolvedProjectId) {
      return (
        applications.find((app) => app.projects?.some((project) => project.id === resolvedProjectId)) ||
        currentApplication ||
        applications[0]
      );
    }
    return currentApplication || applications[0];
  }, [applications, currentApplication, resolvedProjectId]);
  const resolvedWorkflowId = useMemo(
    () => workflowId || scopeApplication?.workflows?.[0]?.id || currentApplication?.workflows?.[0]?.id,
    [workflowId, scopeApplication?.workflows, currentApplication?.workflows]
  );
  const missingScopeMessage = !resolvedWorkflowId
    ? 'Select an application/workflow before creating run configurations.'
    : !resolvedProjectId
      ? 'Select a project folder before creating run configurations.'
      : null;
  const canManageScopedConfigurations = Boolean(resolvedWorkflowId && resolvedProjectId);

  const scopedConfigurations = useMemo(
    () =>
      resolvedWorkflowId && resolvedProjectId
        ? configurations.filter((config) => config.workflowId === resolvedWorkflowId && config.projectId === resolvedProjectId)
        : configurations,
    [configurations, resolvedWorkflowId, resolvedProjectId]
  );

  const getUniqueName = (baseName: string): string => {
    const existingNames = new Set(scopedConfigurations.map((config) => config.name));
    if (!existingNames.has(baseName)) {
      return baseName;
    }

    let suffix = 2;
    let candidate = `${baseName} ${suffix}`;
    while (existingNames.has(candidate)) {
      suffix += 1;
      candidate = `${baseName} ${suffix}`;
    }
    return candidate;
  };

  const withUniqueName = (config: DraftRunConfiguration): DraftRunConfiguration => ({
    ...config,
    name: getUniqueName(config.name),
  });

  useEffect(() => {
    if (!isModalOpen) {
      autoCreateAttemptScopeRef.current = null;
      return;
    }

    if (!canManageScopedConfigurations) {
      setSelectedConfigId(null);
      setEditingConfig(null);
      setCreateError(missingScopeMessage || 'Select a project folder to manage run configurations.');
      autoCreateAttemptScopeRef.current = null;
      return;
    }

    setCreateError(null);

    const apiBackedConfigs = scopedConfigurations.filter((config) => !config.id.startsWith('config_'));

    if (
      activeConfigId &&
      scopedConfigurations.find((config) => config.id === activeConfigId) &&
      !activeConfigId.startsWith('config_')
    ) {
      setSelectedConfigId(activeConfigId);
      return;
    }

    if (apiBackedConfigs.length > 0) {
      setSelectedConfigId(apiBackedConfigs[0].id);
      autoCreateAttemptScopeRef.current = null;
      return;
    }

    const scopeKey = `${resolvedWorkflowId}::${resolvedProjectId}`;
    if (autoCreateAttemptScopeRef.current === scopeKey) {
      return;
    }
    autoCreateAttemptScopeRef.current = scopeKey;

    void addConfiguration(withUniqueName(DEFAULT_CONFIG), resolvedWorkflowId, resolvedProjectId)
      .then((newConfig) => {
        setSelectedConfigId(newConfig.id);
        setCreateError(null);
      })
      .catch((error) => {
        setCreateError(error instanceof Error ? error.message : 'Failed to create run configuration');
      });
  }, [isModalOpen, activeConfigId, scopedConfigurations, addConfiguration, resolvedWorkflowId, resolvedProjectId, canManageScopedConfigurations, missingScopeMessage]);

  useEffect(() => {
    if (!selectedConfigId) return;
    const config = scopedConfigurations.find((candidate) => candidate.id === selectedConfigId);
    if (!config) return;
    setEditingConfig({ ...config });
    setHasChanges(false);
  }, [selectedConfigId, scopedConfigurations]);

  if (!isModalOpen) return null;

  const handleChange = <K extends keyof RunConfiguration>(
    field: K,
    value: RunConfiguration[K]
  ) => {
    if (!editingConfig) return;
    setEditingConfig({ ...editingConfig, [field]: value });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!editingConfig || !selectedConfigId) return;
    updateConfiguration(selectedConfigId, editingConfig);
    setHasChanges(false);
  };

  const handleCreate = async () => {
    if (!canManageScopedConfigurations) {
      setCreateError((missingScopeMessage || 'Select a project folder before creating run configurations.') + ' Creating local draft configuration.');
    }
    const scopedWorkflowId = resolvedWorkflowId;
    const scopedProjectId = resolvedProjectId;

    try {
      const newConfig = await addConfiguration(withUniqueName(DEFAULT_CONFIG), scopedWorkflowId, scopedProjectId);
      setSelectedConfigId(newConfig.id);
      setActiveTab('general');
      setCreateError(null);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create run configuration');
    }
  };

  const handleCreateFromPreset = async (preset: (typeof PRESET_CONFIGS)[number]) => {
    if (!canManageScopedConfigurations) {
      setCreateError((missingScopeMessage || 'Select a project folder before creating run configurations.') + ' Creating local draft configuration.');
    }
    const scopedWorkflowId = resolvedWorkflowId;
    const scopedProjectId = resolvedProjectId;

    try {
      const newConfig = await addConfiguration(withUniqueName(preset), scopedWorkflowId, scopedProjectId);
      setSelectedConfigId(newConfig.id);
      setActiveTab('general');
      setCreateError(null);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create run configuration');
    }
  };

  const handleDelete = () => {
    if (!selectedConfigId || scopedConfigurations.length <= 1) return;
    deleteConfiguration(selectedConfigId);
    setSelectedConfigId(scopedConfigurations.find((config) => config.id !== selectedConfigId)?.id || null);
  };

  const handleDuplicate = () => {
    if (!selectedConfigId) return;
    const duplicated = duplicateConfiguration(selectedConfigId);
    setSelectedConfigId(duplicated.id);
  };

  const handleRun = () => {
    if (!selectedConfigId || !editingConfig) return;

    if (hasChanges) {
      updateConfiguration(selectedConfigId, editingConfig);
    }

    markConfigUsed(selectedConfigId);
    setActiveConfig(selectedConfigId);
    setModalOpen(false);
    onRun?.(selectedConfigId);
  };

  const handleClose = () => {
    if (hasChanges) {
      handleSave();
    }
    setModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative flex h-[min(88vh,820px)] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-border-default bg-dark-card shadow-2xl">
        <header className="flex h-12 items-center justify-between border-b border-border-default bg-dark-bg px-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-brand-secondary" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-primary">Run Configurations</h3>
            <span className="rounded-full border border-border-default bg-dark-elevated px-2 py-0.5 text-3xs text-text-secondary">
              {scopedConfigurations.length}
            </span>
          </div>
          <Tooltip content="Close" showDelayMs={0} hideDelayMs={0}>
            <button
              onClick={handleClose}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </Tooltip>
        </header>

        {createError && (
          <div className="border-b border-status-danger/40 bg-status-danger/10 px-4 py-2 text-xs text-status-danger">
            {createError}
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-72 flex-col border-r border-border-default bg-dark-bg/70">
            <div className="flex items-center gap-1 border-b border-border-default px-3 py-2">
              <Tooltip content="Create configuration" showDelayMs={0} hideDelayMs={0}>
                <button
                  onClick={handleCreate}
                  className={cx(
                    'inline-flex h-7 w-7 items-center justify-center rounded border transition-colors',
                    !canManageScopedConfigurations
                      ? 'border-border-default/70 text-text-secondary hover:border-border-emphasis hover:text-text-primary'
                      : 'border-border-default text-text-secondary hover:border-border-emphasis hover:text-text-primary'
                  )}
                  aria-label="Create configuration"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </Tooltip>
              <Tooltip content="Delete configuration" showDelayMs={0} hideDelayMs={0}>
                <button
                  onClick={handleDelete}
                  disabled={scopedConfigurations.length <= 1}
                  className={cx(
                    'inline-flex h-7 w-7 items-center justify-center rounded border transition-colors',
                    scopedConfigurations.length <= 1
                      ? 'cursor-not-allowed border-border-default/40 text-text-muted/50'
                      : 'border-border-default text-text-secondary hover:border-border-emphasis hover:text-status-danger'
                  )}
                  aria-label="Delete configuration"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Tooltip>
              <Tooltip content="Duplicate configuration" showDelayMs={0} hideDelayMs={0}>
                <button
                  onClick={handleDuplicate}
                  disabled={!selectedConfigId}
                  className={cx(
                    'inline-flex h-7 w-7 items-center justify-center rounded border transition-colors',
                    !selectedConfigId
                      ? 'cursor-not-allowed border-border-default/40 text-text-muted/50'
                      : 'border-border-default text-text-secondary hover:border-border-emphasis hover:text-text-primary'
                  )}
                  aria-label="Duplicate configuration"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto py-2">
              <div className="px-3 pb-1 text-3xs font-semibold uppercase tracking-wide text-text-muted">
                Configurations
              </div>
              <div className="space-y-1 px-2">
                {scopedConfigurations.map((config) => {
                  const selected = config.id === selectedConfigId;
                  const isActive = config.id === activeConfigId;
                  return (
                    <button
                      key={config.id}
                      onClick={() => setSelectedConfigId(config.id)}
                      className={cx(
                        'flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors',
                        selected
                          ? 'border-border-active bg-brand-primary/12 text-text-primary'
                          : 'border-transparent text-text-secondary hover:border-border-default hover:bg-dark-elevated/50 hover:text-text-primary'
                      )}
                    >
                      <span className="truncate text-xs font-medium">{config.name}</span>
                      {isActive && (
                        <span className="ml-auto rounded-full border border-status-success/40 bg-status-success/15 px-1.5 py-0.5 text-3xs font-medium text-status-success">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="px-3 pb-1 pt-4 text-3xs font-semibold uppercase tracking-wide text-text-muted">
                Templates
              </div>
              <div className="space-y-1 px-2">
                {PRESET_CONFIGS.map((preset, index) => (
                  <button
                    key={`${preset.name}-${index}`}
                    onClick={() => handleCreateFromPreset(preset)}
                    className={cx(
                      'flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition-colors',
                      !canManageScopedConfigurations
                        ? 'border-transparent text-text-secondary hover:border-border-default hover:bg-dark-elevated/50 hover:text-text-primary'
                        : 'border-transparent text-text-secondary hover:border-border-default hover:bg-dark-elevated/50 hover:text-text-primary'
                    )}
                  >
                    <Plus className="h-3.5 w-3.5 text-text-muted" />
                    <span className="truncate">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col">
            {editingConfig ? (
              <>
                <div className="border-b border-border-default bg-dark-bg px-4 py-1.5">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} variant="pill" size="md">
                    <TabsList className="overflow-x-auto">
                      {TABS.map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <TabsTrigger key={tab.id} value={tab.id} icon={<Icon className="h-3.5 w-3.5" />}>
                            {tab.label}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </Tabs>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-dark-canvas/40 p-5">
                  {activeTab === 'general' && <GeneralTab config={editingConfig} onChange={handleChange} />}
                  {activeTab === 'execution' && <ExecutionTab config={editingConfig} onChange={handleChange} />}
                  {activeTab === 'filtering' && <FilteringTab config={editingConfig} onChange={handleChange} />}
                  {activeTab === 'timeouts' && <TimeoutsTab config={editingConfig} onChange={handleChange} />}
                  {activeTab === 'artifacts' && <ArtifactsTab config={editingConfig} onChange={handleChange} />}
                  {activeTab === 'visual' && <VisualTab config={editingConfig} onChange={handleChange} />}
                  {activeTab === 'parameters' && <ParametersTab config={editingConfig} onChange={handleChange} />}
                  {activeTab === 'advanced' && <AdvancedTab config={editingConfig} onChange={handleChange} />}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-text-secondary">
                Select a configuration or create a new one.
              </div>
            )}
          </section>
        </div>

        <footer className="flex items-center justify-between border-t border-border-default bg-dark-bg px-4 py-3">
          <div className="text-xs text-text-secondary">
            {hasChanges && <span className="text-status-warning">Unsaved changes</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleClose}>Close</Button>
            <Button
              variant="secondary"
              leftIcon={<Save className="h-3.5 w-3.5" />}
              disabled={!hasChanges}
              onClick={handleSave}
            >
              Save
            </Button>
            <Button
              variant="primary"
              leftIcon={<Play className="h-3.5 w-3.5" />}
              disabled={!selectedConfigId}
              onClick={handleRun}
            >
              Save & Run
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
