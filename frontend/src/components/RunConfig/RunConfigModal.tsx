import { useState, useEffect, type ComponentType } from 'react';
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
  Wrench,
  FlaskConical,
} from 'lucide-react';
import { useRunConfigStore, type RunConfiguration, DEFAULT_CONFIG, PRESET_CONFIGS } from '@/store/runConfigStore';
import { GeneralTab } from './GeneralTab';
import { ExecutionTab } from './ExecutionTab';
import { FilteringTab } from './FilteringTab';
import { TimeoutsTab } from './TimeoutsTab';
import { ArtifactsTab } from './ArtifactsTab';
import { AdvancedTab } from './AdvancedTab';
import { cx } from './theme';

type TabType = 'general' | 'execution' | 'filtering' | 'timeouts' | 'artifacts' | 'advanced';

const TABS: { id: TabType; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'execution', label: 'Execution', icon: SlidersHorizontal },
  { id: 'filtering', label: 'Filtering', icon: Filter },
  { id: 'timeouts', label: 'Timeouts', icon: Timer },
  { id: 'artifacts', label: 'Artifacts', icon: Clapperboard },
  { id: 'advanced', label: 'Advanced', icon: Wrench },
];

interface RunConfigModalProps {
  onRun?: (configId: string) => void;
}

export function RunConfigModal({ onRun }: RunConfigModalProps) {
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

  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<RunConfiguration | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!isModalOpen) return;

    if (activeConfigId && configurations.find((config) => config.id === activeConfigId)) {
      setSelectedConfigId(activeConfigId);
      return;
    }

    if (configurations.length > 0) {
      setSelectedConfigId(configurations[0].id);
      return;
    }

    const newConfig = addConfiguration(DEFAULT_CONFIG);
    setSelectedConfigId(newConfig.id);
  }, [isModalOpen, activeConfigId, configurations, addConfiguration]);

  useEffect(() => {
    if (!selectedConfigId) return;
    const config = configurations.find((candidate) => candidate.id === selectedConfigId);
    if (!config) return;
    setEditingConfig({ ...config });
    setHasChanges(false);
  }, [selectedConfigId, configurations]);

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

  const handleCreate = () => {
    const newConfig = addConfiguration(DEFAULT_CONFIG);
    setSelectedConfigId(newConfig.id);
    setActiveTab('general');
  };

  const handleCreateFromPreset = (preset: (typeof PRESET_CONFIGS)[number]) => {
    const newConfig = addConfiguration(preset);
    setSelectedConfigId(newConfig.id);
    setActiveTab('general');
  };

  const handleDelete = () => {
    if (!selectedConfigId || configurations.length <= 1) return;
    deleteConfiguration(selectedConfigId);
    setSelectedConfigId(configurations.find((config) => config.id !== selectedConfigId)?.id || null);
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
            <span className="rounded-full border border-border-default bg-dark-elevated px-2 py-0.5 text-[10px] text-text-secondary">
              {configurations.length}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-72 flex-col border-r border-border-default bg-dark-bg/70">
            <div className="flex items-center gap-1 border-b border-border-default px-3 py-2">
              <button
                onClick={handleCreate}
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-border-default text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
                title="Create configuration"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={handleDelete}
                disabled={configurations.length <= 1}
                className={cx(
                  'inline-flex h-7 w-7 items-center justify-center rounded border transition-colors',
                  configurations.length <= 1
                    ? 'cursor-not-allowed border-border-default/40 text-text-muted/50'
                    : 'border-border-default text-text-secondary hover:border-border-emphasis hover:text-status-danger'
                )}
                title="Delete configuration"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={handleDuplicate}
                disabled={!selectedConfigId}
                className={cx(
                  'inline-flex h-7 w-7 items-center justify-center rounded border transition-colors',
                  !selectedConfigId
                    ? 'cursor-not-allowed border-border-default/40 text-text-muted/50'
                    : 'border-border-default text-text-secondary hover:border-border-emphasis hover:text-text-primary'
                )}
                title="Duplicate configuration"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto py-2">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                Configurations
              </div>
              <div className="space-y-1 px-2">
                {configurations.map((config) => {
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
                        <span className="ml-auto rounded-full border border-status-success/40 bg-status-success/15 px-1.5 py-0.5 text-[10px] font-medium text-status-success">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                Templates
              </div>
              <div className="space-y-1 px-2">
                {PRESET_CONFIGS.map((preset, index) => (
                  <button
                    key={`${preset.name}-${index}`}
                    onClick={() => handleCreateFromPreset(preset)}
                    className="flex w-full items-center gap-2 rounded-md border border-transparent px-2.5 py-2 text-left text-xs text-text-secondary transition-colors hover:border-border-default hover:bg-dark-elevated/50 hover:text-text-primary"
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
                <div className="border-b border-border-default bg-dark-bg px-4">
                  <div className="flex gap-1 overflow-x-auto py-1.5">
                    {TABS.map((tab) => {
                      const Icon = tab.icon;
                      const selected = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={cx(
                            'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                            selected
                              ? 'border-border-active bg-brand-primary/15 text-text-primary'
                              : 'border-transparent text-text-secondary hover:border-border-default hover:bg-dark-elevated/45 hover:text-text-primary'
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-dark-canvas/40 p-5">
                  {activeTab === 'general' && <GeneralTab config={editingConfig} onChange={handleChange} />}
                  {activeTab === 'execution' && <ExecutionTab config={editingConfig} onChange={handleChange} />}
                  {activeTab === 'filtering' && <FilteringTab config={editingConfig} onChange={handleChange} />}
                  {activeTab === 'timeouts' && <TimeoutsTab config={editingConfig} onChange={handleChange} />}
                  {activeTab === 'artifacts' && <ArtifactsTab config={editingConfig} onChange={handleChange} />}
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
            <button
              onClick={handleClose}
              className="rounded-md border border-border-default px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                hasChanges
                  ? 'border-border-default bg-dark-elevated text-text-primary hover:border-border-emphasis hover:bg-dark-card'
                  : 'cursor-not-allowed border-border-default/40 bg-dark-elevated/30 text-text-muted'
              )}
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </button>
            <button
              onClick={handleRun}
              disabled={!selectedConfigId}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-semibold transition-colors',
                selectedConfigId
                  ? 'bg-brand-primary text-white hover:bg-brand-hover'
                  : 'cursor-not-allowed bg-dark-elevated text-text-muted'
              )}
            >
              <Play className="h-3.5 w-3.5" />
              Save &amp; Run
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
