import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Copy, Play, Save } from 'lucide-react';
import { useRunConfigStore, type RunConfiguration, DEFAULT_CONFIG, PRESET_CONFIGS } from '@/store/runConfigStore';
import { GeneralTab } from './GeneralTab';
import { ExecutionTab } from './ExecutionTab';
import { FilteringTab } from './FilteringTab';
import { TimeoutsTab } from './TimeoutsTab';
import { ArtifactsTab } from './ArtifactsTab';
import { AdvancedTab } from './AdvancedTab';

type TabType = 'general' | 'execution' | 'filtering' | 'timeouts' | 'artifacts' | 'advanced';

const TABS: { id: TabType; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'execution', label: 'Execution' },
  { id: 'filtering', label: 'Filtering' },
  { id: 'timeouts', label: 'Timeouts' },
  { id: 'artifacts', label: 'Artifacts' },
  { id: 'advanced', label: 'Advanced' },
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

  // Initialize with active config or first config
  useEffect(() => {
    if (isModalOpen) {
      if (activeConfigId && configurations.find(c => c.id === activeConfigId)) {
        setSelectedConfigId(activeConfigId);
      } else if (configurations.length > 0) {
        setSelectedConfigId(configurations[0].id);
      } else {
        // Create default config if none exist
        const newConfig = addConfiguration(DEFAULT_CONFIG);
        setSelectedConfigId(newConfig.id);
      }
    }
  }, [isModalOpen, activeConfigId, configurations, addConfiguration]);

  // Update editing config when selection changes
  useEffect(() => {
    if (selectedConfigId) {
      const config = configurations.find(c => c.id === selectedConfigId);
      if (config) {
        setEditingConfig({ ...config });
        setHasChanges(false);
      }
    }
  }, [selectedConfigId, configurations]);

  if (!isModalOpen) return null;

  // Handle config field change
  const handleChange = <K extends keyof RunConfiguration>(
    field: K,
    value: RunConfiguration[K]
  ) => {
    if (editingConfig) {
      setEditingConfig({ ...editingConfig, [field]: value });
      setHasChanges(true);
    }
  };

  // Save changes
  const handleSave = () => {
    if (editingConfig && selectedConfigId) {
      updateConfiguration(selectedConfigId, editingConfig);
      setHasChanges(false);
    }
  };

  // Create new config
  const handleCreate = () => {
    const newConfig = addConfiguration(DEFAULT_CONFIG);
    setSelectedConfigId(newConfig.id);
  };

  // Create from preset
  const handleCreateFromPreset = (preset: typeof PRESET_CONFIGS[number]) => {
    const newConfig = addConfiguration(preset);
    setSelectedConfigId(newConfig.id);
  };

  // Delete config
  const handleDelete = () => {
    if (selectedConfigId && configurations.length > 1) {
      deleteConfiguration(selectedConfigId);
      setSelectedConfigId(configurations.find(c => c.id !== selectedConfigId)?.id || null);
    }
  };

  // Duplicate config
  const handleDuplicate = () => {
    if (selectedConfigId) {
      const newConfig = duplicateConfiguration(selectedConfigId);
      setSelectedConfigId(newConfig.id);
    }
  };

  // Run with current config
  const handleRun = () => {
    if (selectedConfigId && editingConfig) {
      // Save any pending changes first
      if (hasChanges) {
        updateConfiguration(selectedConfigId, editingConfig);
      }
      markConfigUsed(selectedConfigId);
      setActiveConfig(selectedConfigId);
      setModalOpen(false);
      onRun?.(selectedConfigId);
    }
  };

  // Close modal
  const handleClose = () => {
    if (hasChanges) {
      // Could add confirmation dialog here
      handleSave();
    }
    setModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl h-[700px] flex flex-col bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#30363d] bg-[#161b22]">
          <h3 className="text-white text-sm font-bold tracking-wide uppercase">
            Run Configuration
          </h3>
          <button
            onClick={handleClose}
            className="text-[#8b949e] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Config List */}
          <div className="w-64 flex flex-col border-r border-[#30363d] bg-[#0d1117]/30">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-2 py-2 border-b border-[#30363d]/50">
              <div className="flex gap-1">
                <button
                  onClick={handleCreate}
                  className="p-1 hover:bg-[#30363d] rounded text-[#8b949e] hover:text-white transition-colors"
                  title="New Configuration"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={configurations.length <= 1}
                  className={`p-1 rounded transition-colors ${
                    configurations.length <= 1
                      ? 'text-[#484f58] cursor-not-allowed'
                      : 'hover:bg-[#30363d] text-[#8b949e] hover:text-white'
                  }`}
                  title="Delete Configuration"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDuplicate}
                  disabled={!selectedConfigId}
                  className={`p-1 rounded transition-colors ${
                    !selectedConfigId
                      ? 'text-[#484f58] cursor-not-allowed'
                      : 'hover:bg-[#30363d] text-[#8b949e] hover:text-white'
                  }`}
                  title="Duplicate Configuration"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Config List */}
            <div className="flex-1 overflow-y-auto py-2">
              {/* User Configs */}
              <div className="px-3 py-1">
                <p className="text-[10px] font-bold text-[#6e7681] uppercase tracking-wider">
                  Configurations
                </p>
              </div>
              {configurations.map(config => (
                <button
                  key={config.id}
                  onClick={() => setSelectedConfigId(config.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left ${
                    config.id === selectedConfigId
                      ? 'bg-sky-500/20 border-l-2 border-sky-500'
                      : 'border-l-2 border-transparent hover:bg-[#30363d]/30'
                  }`}
                >
                  <span className={`text-sm truncate ${
                    config.id === selectedConfigId ? 'text-white' : 'text-[#8b949e]'
                  }`}>
                    {config.name}
                  </span>
                  {config.id === activeConfigId && (
                    <span className="text-[10px] text-emerald-400 ml-auto">Active</span>
                  )}
                </button>
              ))}

              {/* Presets */}
              <div className="px-3 pt-4 pb-1">
                <p className="text-[10px] font-bold text-[#6e7681] uppercase tracking-wider">
                  Templates
                </p>
              </div>
              {PRESET_CONFIGS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCreateFromPreset(preset)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left border-l-2 border-transparent hover:bg-[#30363d]/30 opacity-60 hover:opacity-100"
                >
                  <Plus className="w-3 h-3 text-[#6e7681]" />
                  <span className="text-sm text-[#8b949e] truncate">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel - Config Details */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {editingConfig ? (
              <>
                {/* Tabs */}
                <div className="flex border-b border-[#30363d] bg-[#161b22] px-4">
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'text-white border-sky-500'
                          : 'text-[#8b949e] border-transparent hover:text-white hover:border-[#30363d]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {activeTab === 'general' && (
                    <GeneralTab config={editingConfig} onChange={handleChange} />
                  )}
                  {activeTab === 'execution' && (
                    <ExecutionTab config={editingConfig} onChange={handleChange} />
                  )}
                  {activeTab === 'filtering' && (
                    <FilteringTab config={editingConfig} onChange={handleChange} />
                  )}
                  {activeTab === 'timeouts' && (
                    <TimeoutsTab config={editingConfig} onChange={handleChange} />
                  )}
                  {activeTab === 'artifacts' && (
                    <ArtifactsTab config={editingConfig} onChange={handleChange} />
                  )}
                  {activeTab === 'advanced' && (
                    <AdvancedTab config={editingConfig} onChange={handleChange} />
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#8b949e]">
                <p>Select a configuration or create a new one</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#30363d] bg-[#161b22]">
          <div className="text-xs text-[#8b949e]">
            {hasChanges && (
              <span className="text-yellow-500">Unsaved changes</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-1.5 text-sm text-[#8b949e] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm border rounded transition-colors ${
                hasChanges
                  ? 'text-[#c9d1d9] hover:text-white hover:bg-[#30363d] border-[#30363d]'
                  : 'text-[#484f58] border-[#30363d]/50 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleRun}
              disabled={!selectedConfigId}
              className={`flex items-center gap-2 px-6 py-1.5 text-sm font-medium rounded shadow-lg transition-all ${
                selectedConfigId
                  ? 'text-white bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 shadow-sky-500/20'
                  : 'text-[#484f58] bg-[#30363d] cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4" />
              Save & Run
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
