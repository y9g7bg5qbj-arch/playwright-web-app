import { useState, useEffect } from 'react';

export interface RunConfiguration {
  id: string;
  name: string;
  target: 'local' | 'github';
  environment: 'Development' | 'Staging' | 'Production' | 'QA';
  browser: 'chromium' | 'firefox' | 'webkit' | 'edge';
  baseUrl: string;
  timeout: number;
  retries: number;
  headless: boolean;
  tracing: boolean;
  video: boolean;
  screenshotOnFailure: boolean;
  workers?: number;
  github?: {
    repository?: string;
    branch?: string;
    workflowFile?: string;
  };
}


export interface RunConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  configurations: RunConfiguration[];
  selectedConfigId: string | null;
  onSelect: (configId: string) => void;
  onCreate: (config: Omit<RunConfiguration, 'id'>) => void;
  onUpdate: (configId: string, config: Partial<RunConfiguration>) => void;
  onDelete: (configId: string) => void;
  onDuplicate: (configId: string) => void;
}

const defaultConfig: Omit<RunConfiguration, 'id'> = {
  name: 'New Configuration',
  target: 'local',
  environment: 'Development',
  browser: 'chromium',
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  retries: 0,
  headless: false,
  tracing: true,
  video: false,
  screenshotOnFailure: true,
};


// Accent color - Teal/Cyan for modern IDE feel
const ACCENT = {
  primary: '#0ea5e9',      // Sky blue - main accent
  primaryHover: '#0284c7', // Darker sky blue
  bg: 'rgba(14, 165, 233, 0.15)',
  border: 'rgba(14, 165, 233, 0.5)',
  text: '#38bdf8',
};

// Environment colors for visual distinction
const ENV_COLORS = {
  Development: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: 'desktop_windows' },
  Staging: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: 'cloud' },
  Production: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', icon: 'factory' },
  QA: { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400', icon: 'science' },
};

// Icon mapping for different config types
const getConfigIcon = (
  env: string,
  _browser: string
): { icon: string; color: string } => {
  const envConfig = ENV_COLORS[env as keyof typeof ENV_COLORS];
  if (envConfig) return { icon: envConfig.icon, color: envConfig.text };
  return { icon: 'settings', color: 'text-[#8b949e]' };
};

export function RunConfigurationModal({
  isOpen,
  onClose,
  configurations,
  selectedConfigId,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
  onDuplicate,
}: RunConfigurationModalProps) {
  const [editingConfig, setEditingConfig] = useState<RunConfiguration | null>(null);

  // Update editing config when selection changes
  useEffect(() => {
    if (selectedConfigId) {
      const config = configurations.find((c) => c.id === selectedConfigId);
      if (config) {
        setEditingConfig({ ...config });
      }
    } else if (configurations.length > 0) {
      setEditingConfig({ ...configurations[0] });
      onSelect(configurations[0].id);
    }
  }, [selectedConfigId, configurations, onSelect]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (editingConfig && selectedConfigId) {
      onUpdate(selectedConfigId, editingConfig);
    }
  };

  const handleCreate = () => {
    onCreate(defaultConfig);
  };

  const handleInputChange = (field: keyof RunConfiguration, value: unknown) => {
    if (editingConfig) {
      setEditingConfig({ ...editingConfig, [field]: value });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-5xl h-[700px] flex flex-col bg-[#0d1117] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#30363d] bg-[#161b22] select-none shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: ACCENT.bg }}>
              <span className="material-symbols-outlined text-[18px]" style={{ color: ACCENT.primary }}>
                tune
              </span>
            </div>
            <div>
              <h3 className="text-white text-sm font-semibold">
                Run Configurations
              </h3>
              <p className="text-[10px] text-[#8b949e]">Configure test execution settings</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="p-1.5 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded-md transition-colors"
              title="Help"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                help_outline
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded-md transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                close
              </span>
            </button>
          </div>
        </div>

        {/* Body Split */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Rail (Sidebar) */}
          <div className="w-72 flex flex-col border-r border-[#30363d] bg-[#0d1117]/30 shrink-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-2 py-2 border-b border-[#30363d]/50">
              <div className="flex gap-1">
                <button
                  onClick={handleCreate}
                  className="p-1 hover:bg-[#30363d] rounded text-[#8b949e] hover:text-white transition-colors"
                  title="Add Configuration"
                >
                  <span
                    className="material-symbols-outlined block"
                    style={{ fontSize: '20px' }}
                  >
                    add
                  </span>
                </button>
                <button
                  onClick={() => selectedConfigId && onDelete(selectedConfigId)}
                  className="p-1 hover:bg-[#30363d] rounded text-[#8b949e] hover:text-white transition-colors"
                  title="Remove Configuration"
                >
                  <span
                    className="material-symbols-outlined block"
                    style={{ fontSize: '20px' }}
                  >
                    remove
                  </span>
                </button>
                <div className="w-px h-5 bg-[#30363d] mx-1 self-center" />
                <button
                  onClick={() => selectedConfigId && onDuplicate(selectedConfigId)}
                  className="p-1 hover:bg-[#30363d] rounded text-[#8b949e] hover:text-white transition-colors"
                  title="Duplicate Configuration"
                >
                  <span
                    className="material-symbols-outlined block"
                    style={{ fontSize: '20px' }}
                  >
                    content_copy
                  </span>
                </button>
              </div>
              <button className="p-1 hover:bg-[#30363d] rounded text-[#8b949e] hover:text-white transition-colors">
                <span
                  className="material-symbols-outlined block"
                  style={{ fontSize: '20px' }}
                >
                  folder
                </span>
              </button>
            </div>

            {/* Config List */}
            <div className="flex-1 overflow-y-auto py-2">
              {configurations.map((config) => {
                const isSelected = config.id === selectedConfigId;
                const { icon, color } = getConfigIcon(config.environment, config.browser);
                const envConfig = ENV_COLORS[config.environment as keyof typeof ENV_COLORS];

                return (
                  <button
                    key={config.id}
                    onClick={() => onSelect(config.id)}
                    className={`group w-full flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all ${isSelected
                      ? 'bg-[#21262d] border-l-2'
                      : 'border-l-2 border-transparent hover:bg-[#21262d]/50'
                      }`}
                    style={isSelected ? { borderLeftColor: ACCENT.primary } : undefined}
                  >
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center ${isSelected ? envConfig?.bg || 'bg-[#21262d]' : 'bg-[#21262d]'
                      }`}>
                      <span
                        className={`material-symbols-outlined ${isSelected ? color : 'text-[#8b949e] group-hover:text-[#c9d1d9]'
                          }`}
                        style={{ fontSize: '16px' }}
                      >
                        {icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[13px] font-medium truncate ${isSelected ? 'text-white' : 'text-[#8b949e] group-hover:text-[#c9d1d9]'
                          }`}
                      >
                        {config.name}
                      </p>
                      <p className={`text-[10px] truncate ${isSelected ? 'text-[#8b949e]' : 'text-[#6e7681]'}`}>
                        {config.environment} · {config.browser}
                      </p>
                    </div>
                  </button>
                );
              })}

              {/* Section Header - Templates */}
              <div className="px-3 pt-4 pb-1">
                <p className="text-[10px] font-bold text-[#6e7681] uppercase tracking-wider">
                  Templates
                </p>
              </div>

              {/* Template Item */}
              <button className="group w-full flex items-center gap-3 px-3 py-2 border-l-2 border-transparent hover:bg-[#30363d]/30 cursor-pointer opacity-60">
                <span
                  className="material-symbols-outlined text-[#8b949e]"
                  style={{ fontSize: '18px' }}
                >
                  extension
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[#8b949e] text-sm font-medium truncate">
                    Custom Node.js
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Right Panel (Details) */}
          <div className="flex-1 flex flex-col bg-[#0d1117] overflow-y-auto">
            {editingConfig ? (
              <div className="p-6 max-w-3xl">
                {/* Config Header with Environment Badge */}
                <div className="mb-6 pb-4 border-b border-[#21262d]">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-semibold text-white">
                      {editingConfig.name}
                    </h2>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${ENV_COLORS[editingConfig.environment]?.bg || 'bg-[#21262d]'
                      } ${ENV_COLORS[editingConfig.environment]?.text || 'text-[#8b949e]'}`}>
                      {editingConfig.environment}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6e7681] font-mono">
                    ID: {editingConfig.id.slice(0, 12)}
                  </p>
                </div>

                <form className="space-y-5">
                  {/* Name Input */}
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <label className="col-span-3 text-[13px] text-[#8b949e] font-medium text-right">
                      Name
                    </label>
                    <div className="col-span-9">
                      <input
                        type="text"
                        value={editingConfig.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 placeholder-[#6e7681] transition-all"
                      />
                    </div>
                  </div>

                  {/* Target Selection */}
                  <div className="grid grid-cols-12 gap-4 items-center mt-4">
                    <label className="col-span-3 text-[13px] text-[#8b949e] font-medium text-right">
                      Target
                    </label>
                    <div className="col-span-9">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleInputChange('target', 'local')}
                          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${editingConfig.target === 'local'
                              ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                              : 'bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#484f58]'
                            }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">computer</span>
                          Local
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange('target', 'github')}
                          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${editingConfig.target === 'github'
                              ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400'
                              : 'bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#484f58]'
                            }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">cloud</span>
                          GitHub Actions
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* GitHub Actions Settings (only shown when target is github) */}
                  {editingConfig.target === 'github' && (
                    <div className="grid grid-cols-12 gap-4 items-start mt-4">
                      <label className="col-span-3 text-[13px] text-[#8b949e] font-medium text-right pt-2">
                        GitHub
                      </label>
                      <div className="col-span-9 space-y-3">
                        <div>
                          <label className="text-[11px] text-[#6e7681] mb-1.5 block uppercase tracking-wider">
                            Repository (owner/repo)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., myorg/playwright-tests"
                            value={editingConfig.github?.repository || ''}
                            onChange={(e) => handleInputChange('github', {
                              ...editingConfig.github,
                              repository: e.target.value,
                            })}
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 font-mono text-xs placeholder-[#6e7681]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] text-[#6e7681] mb-1.5 block uppercase tracking-wider">
                              Branch
                            </label>
                            <input
                              type="text"
                              placeholder="main"
                              value={editingConfig.github?.branch || 'main'}
                              onChange={(e) => handleInputChange('github', {
                                ...editingConfig.github,
                                branch: e.target.value,
                              })}
                              className="w-full bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-[#6e7681] mb-1.5 block uppercase tracking-wider">
                              Workflow File
                            </label>
                            <input
                              type="text"
                              placeholder=".github/workflows/tests.yml"
                              value={editingConfig.github?.workflowFile || '.github/workflows/vero-tests.yml'}
                              onChange={(e) => handleInputChange('github', {
                                ...editingConfig.github,
                                workflowFile: e.target.value,
                              })}
                              className="w-full bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 font-mono text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="h-px bg-[#21262d] w-full my-4" />


                  {/* Environment Select */}
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <label className="col-span-3 text-[13px] text-[#8b949e] font-medium text-right">
                      Environment
                    </label>
                    <div className="col-span-9">
                      <select
                        value={editingConfig.environment}
                        onChange={(e) => handleInputChange('environment', e.target.value)}
                        className="w-full bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 appearance-none cursor-pointer"
                      >
                        <option value="Development">Development</option>
                        <option value="Staging">Staging</option>
                        <option value="Production">Production</option>
                        <option value="QA">QA</option>
                      </select>
                    </div>
                  </div>

                  {/* Browser Select */}
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <label className="col-span-3 text-[13px] text-[#8b949e] font-medium text-right">
                      Browser
                    </label>
                    <div className="col-span-9">
                      <div className="flex gap-2">
                        {(['chromium', 'firefox', 'webkit', 'edge'] as const).map((browser) => (
                          <button
                            key={browser}
                            type="button"
                            onClick={() => handleInputChange('browser', browser)}
                            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${editingConfig.browser === browser
                              ? 'bg-sky-500/20 border border-sky-500/50 text-sky-400'
                              : 'bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#484f58]'
                              }`}
                          >
                            {browser.charAt(0).toUpperCase() + browser.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Base URL & Timeout Row */}
                  <div className="grid grid-cols-12 gap-4 items-start">
                    <label className="col-span-3 text-[13px] text-[#8b949e] font-medium text-right pt-2">
                      Settings
                    </label>
                    <div className="col-span-9 grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="text-[11px] text-[#6e7681] mb-1.5 block uppercase tracking-wider">
                          Base URL
                        </label>
                        <input
                          type="text"
                          value={editingConfig.baseUrl}
                          onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                          className="w-full bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-[#6e7681] mb-1.5 block uppercase tracking-wider">
                          Timeout
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={editingConfig.timeout}
                            onChange={(e) =>
                              handleInputChange('timeout', parseInt(e.target.value) || 30000)
                            }
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 pr-10 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 font-mono text-xs"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#6e7681]">ms</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-[#6e7681] mb-1.5 block uppercase tracking-wider">
                          Retries
                        </label>
                        <div className="flex gap-1">
                          {[0, 1, 2, 3].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => handleInputChange('retries', n)}
                              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${(editingConfig.retries ?? 0) === n
                                ? 'bg-sky-500/20 border border-sky-500/50 text-sky-400'
                                : 'bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:border-[#484f58]'
                                }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[#21262d] w-full my-4" />

                  {/* Options Section */}
                  <div className="grid grid-cols-12 gap-4 items-start">
                    <label className="col-span-3 text-[13px] text-[#8b949e] font-medium text-right pt-0.5">
                      Options
                    </label>
                    <div className="col-span-9">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Headless Toggle */}
                        <div
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${editingConfig.headless
                            ? 'bg-sky-500/10 border-sky-500/30'
                            : 'bg-[#161b22] border-[#30363d] hover:border-[#484f58]'
                            }`}
                          onClick={() => handleInputChange('headless', !editingConfig.headless)}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-[18px] ${editingConfig.headless ? 'text-sky-400' : 'text-[#6e7681]'}`}>
                              visibility_off
                            </span>
                            <span className="text-sm text-[#c9d1d9]">Headless</span>
                          </div>
                          <div className={`w-8 h-4 rounded-full transition-all ${editingConfig.headless ? 'bg-sky-500' : 'bg-[#30363d]'}`}>
                            <div className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-all ${editingConfig.headless ? 'ml-4.5' : 'ml-0.5'}`}
                              style={{ marginLeft: editingConfig.headless ? '18px' : '2px' }} />
                          </div>
                        </div>

                        {/* Tracing Toggle */}
                        <div
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${editingConfig.tracing
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-[#161b22] border-[#30363d] hover:border-[#484f58]'
                            }`}
                          onClick={() => handleInputChange('tracing', !editingConfig.tracing)}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-[18px] ${editingConfig.tracing ? 'text-emerald-400' : 'text-[#6e7681]'}`}>
                              timeline
                            </span>
                            <span className="text-sm text-[#c9d1d9]">Tracing</span>
                          </div>
                          <div className={`w-8 h-4 rounded-full transition-all ${editingConfig.tracing ? 'bg-emerald-500' : 'bg-[#30363d]'}`}>
                            <div className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-all`}
                              style={{ marginLeft: editingConfig.tracing ? '18px' : '2px' }} />
                          </div>
                        </div>

                        {/* Video Toggle */}
                        <div
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${editingConfig.video
                            ? 'bg-rose-500/10 border-rose-500/30'
                            : 'bg-[#161b22] border-[#30363d] hover:border-[#484f58]'
                            }`}
                          onClick={() => handleInputChange('video', !editingConfig.video)}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-[18px] ${editingConfig.video ? 'text-rose-400' : 'text-[#6e7681]'}`}>
                              videocam
                            </span>
                            <span className="text-sm text-[#c9d1d9]">Video</span>
                          </div>
                          <div className={`w-8 h-4 rounded-full transition-all ${editingConfig.video ? 'bg-rose-500' : 'bg-[#30363d]'}`}>
                            <div className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-all`}
                              style={{ marginLeft: editingConfig.video ? '18px' : '2px' }} />
                          </div>
                        </div>

                        {/* Screenshot Toggle */}
                        <div
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${editingConfig.screenshotOnFailure
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : 'bg-[#161b22] border-[#30363d] hover:border-[#484f58]'
                            }`}
                          onClick={() => handleInputChange('screenshotOnFailure', !editingConfig.screenshotOnFailure)}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-[18px] ${editingConfig.screenshotOnFailure ? 'text-amber-400' : 'text-[#6e7681]'}`}>
                              photo_camera
                            </span>
                            <span className="text-sm text-[#c9d1d9]">Screenshot</span>
                          </div>
                          <div className={`w-8 h-4 rounded-full transition-all ${editingConfig.screenshotOnFailure ? 'bg-amber-500' : 'bg-[#30363d]'}`}>
                            <div className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-all`}
                              style={{ marginLeft: editingConfig.screenshotOnFailure ? '18px' : '2px' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#8b949e]">
                <p>Select a configuration or create a new one</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#21262d] bg-[#161b22] shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#6e7681]">
            <span className="material-symbols-outlined text-[14px]">terminal</span>
            <code className="bg-[#0d1117] px-2 py-1 rounded-md text-[#8b949e] font-mono border border-[#21262d]">
              vero run --config={editingConfig?.name.toLowerCase().replace(/\s+/g, '-') || 'local'}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm text-[#c9d1d9] hover:text-white bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-md transition-colors"
            >
              Apply
            </button>
            <button
              onClick={() => {
                handleSave();
                onClose();
              }}
              className="px-5 py-2 text-sm font-medium text-white rounded-md shadow-lg transition-all hover:shadow-sky-500/25"
              style={{
                background: `linear-gradient(135deg, ${ACCENT.primary} 0%, #0284c7 100%)`,
              }}
            >
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
