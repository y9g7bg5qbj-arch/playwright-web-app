import { useState, useEffect, useRef } from 'react';
import { useRunConfigStore, initializeDefaultConfig, type RunConfigSummary } from '@/store/runConfigStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { EnvironmentSelector, EnvironmentQuickLook } from './EnvironmentQuickLook';

export interface Application {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface HeaderProps {
  applications: Application[];
  selectedApplicationId: string | null;
  onApplicationSelect: (applicationId: string) => void;
  onCreateApplication: () => void;
  isRunning: boolean;
  isRecording: boolean;
  onRun: () => void;
  onStop: () => void;
  onRecord: () => void;
  onStopRecording: () => void;
  onOpenSearch?: () => void;
  showRunControls?: boolean;
}

// App colors for visual distinction
const APP_COLORS = [
  'from-[#3b82f6] to-[#1d4ed8]', // Blue
  'from-[#10b981] to-[#059669]', // Green
  'from-[#f59e0b] to-[#d97706]', // Amber
  'from-[#ef4444] to-[#dc2626]', // Red
  'from-[#8b5cf6] to-[#7c3aed]', // Purple
  'from-[#ec4899] to-[#db2777]', // Pink
  'from-[#06b6d4] to-[#0891b2]', // Cyan
  'from-[#f97316] to-[#ea580c]', // Orange
];

function getAppColor(index: number): string {
  return APP_COLORS[index % APP_COLORS.length];
}

function getAppInitials(name: string): string {
  return name
    .split(/\s+/)
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Header({
  applications,
  selectedApplicationId,
  onApplicationSelect,
  onCreateApplication,
  isRunning,
  isRecording,
  onRun,
  onStop,
  onRecord,
  onStopRecording,
  onOpenSearch,
  showRunControls = true,
}: HeaderProps): JSX.Element {
  const [showAppLauncher, setShowAppLauncher] = useState(false);
  const [showRunDropdown, setShowRunDropdown] = useState(false);
  const runDropdownRef = useRef<HTMLDivElement>(null);

  // Zustand store for run configurations
  const {
    recentConfigs,
    activeConfigId,
    setModalOpen,
    setActiveConfig,
    markConfigUsed,
  } = useRunConfigStore();

  // Initialize default config on mount
  useEffect(() => {
    initializeDefaultConfig();
  }, []);

  // Initialize environment store when application changes
  useEffect(() => {
    if (selectedApplicationId) {
      useEnvironmentStore.getState().setApplicationId(selectedApplicationId);
    }
  }, [selectedApplicationId]);

  // Close run dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (runDropdownRef.current && !runDropdownRef.current.contains(event.target as Node)) {
        setShowRunDropdown(false);
      }
    };

    if (showRunDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showRunDropdown]);

  const selectedApplication = applications.find(app => app.id === selectedApplicationId);

  // Handle selecting a config from dropdown (does NOT trigger run)
  const handleSelectConfig = (configId: string) => {
    setActiveConfig(configId);
    setShowRunDropdown(false);
  };

  // Handle Run button click - marks config as used and runs
  const handleRun = () => {
    if (activeConfigId) {
      markConfigUsed(activeConfigId);
    }
    onRun();
  };

  function formatLastUsed(lastUsedAt?: string): string {
    if (!lastUsedAt) return '';

    const date = new Date(lastUsedAt);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-[#30363d] bg-[#161b22] shrink-0">
      {/* Left Section - App Launcher, Logo, and Current App */}
      <div className="flex items-center gap-3">
        {/* 9-Dot App Launcher */}
        <div className="relative">
          <button
            onClick={() => setShowAppLauncher(!showAppLauncher)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              showAppLauncher
                ? 'bg-[#30363d] text-white'
                : 'hover:bg-[#21262d] text-[#8b949e] hover:text-white'
            }`}
            title="App Launcher"
          >
            {/* 9-dot grid icon */}
            <div className="grid grid-cols-3 gap-[3px]">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className="w-[5px] h-[5px] rounded-full bg-current"
                />
              ))}
            </div>
          </button>

          {/* App Launcher Popup */}
          {showAppLauncher && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowAppLauncher(false)}
              />
              <div className="absolute left-0 top-full mt-2 w-[320px] bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl z-50 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-[#30363d]">
                  <h3 className="text-white font-semibold text-sm">Applications</h3>
                </div>

                {/* App Grid */}
                <div className="p-3">
                  {applications.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {applications.map((app, index) => {
                        const isSelected = app.id === selectedApplicationId;
                        const colorClass = app.color || getAppColor(index);
                        return (
                          <button
                            key={app.id}
                            onClick={() => {
                              onApplicationSelect(app.id);
                              setShowAppLauncher(false);
                            }}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
                              isSelected
                                ? 'bg-[#21262d] ring-2 ring-[#58a6ff]'
                                : 'hover:bg-[#21262d]'
                            }`}
                          >
                            <div
                              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-lg`}
                            >
                              {app.icon ? (
                                <span className="material-symbols-outlined text-white text-xl">
                                  {app.icon}
                                </span>
                              ) : (
                                <span className="text-white font-bold text-sm">
                                  {getAppInitials(app.name)}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#c9d1d9] text-center leading-tight line-clamp-2 w-full">
                              {app.name}
                            </span>
                          </button>
                        );
                      })}

                      {/* New App Button */}
                      <button
                        onClick={() => {
                          setShowAppLauncher(false);
                          onCreateApplication();
                        }}
                        className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-[#21262d] transition-colors"
                      >
                        <div className="w-12 h-12 rounded-xl border-2 border-dashed border-[#30363d] flex items-center justify-center hover:border-[#58a6ff] transition-colors">
                          <span className="material-symbols-outlined text-[#8b949e] text-xl">
                            add
                          </span>
                        </div>
                        <span className="text-[11px] text-[#8b949e] text-center">
                          New App
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-[#21262d] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#8b949e] text-3xl">
                          folder_off
                        </span>
                      </div>
                      <p className="text-[#8b949e] text-sm mb-3">No applications yet</p>
                      <button
                        onClick={() => {
                          setShowAppLauncher(false);
                          onCreateApplication();
                        }}
                        className="px-4 py-2 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium transition-colors"
                      >
                        Create Application
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-[#30363d]" />

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#135bec] to-[#8b5cf6] flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Vero IDE</span>
        </div>

        {/* Current Application Badge */}
        {selectedApplication && (
          <>
            <span className="text-[#30363d]">/</span>
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-[#21262d]">
              <div
                className={`w-5 h-5 rounded bg-gradient-to-br ${
                  selectedApplication.color || getAppColor(applications.findIndex(a => a.id === selectedApplicationId))
                } flex items-center justify-center`}
              >
                <span className="text-white text-[10px] font-bold">
                  {getAppInitials(selectedApplication.name)}
                </span>
              </div>
              <span className="text-white text-sm font-medium">{selectedApplication.name}</span>
            </div>
          </>
        )}
      </div>

      {/* Center Section - Search */}
      <div className="flex-1 max-w-xl mx-8">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center gap-2 px-4 py-2 rounded-md bg-[#0d1117] border border-[#30363d] text-[#8b949e] text-sm hover:border-[#58a6ff] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">search</span>
          <span className="flex-1 text-left">Search commands and files...</span>
          <kbd className="hidden md:flex items-center gap-1 px-2 py-0.5 text-xs bg-[#21262d] border border-[#30363d] rounded">
            <span>⌘</span>
            <span>K</span>
          </kbd>
        </button>
      </div>

      {/* Right Section - Run Controls */}
      <div className="flex items-center gap-3">
        {showRunControls && (
          <>
            {/* Run/Stop Button with Dropdown */}
            {isRunning ? (
          <button
            onClick={onStop}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#da3633] hover:bg-[#f85149] text-white text-sm font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">stop</span>
            <span>Stop</span>
          </button>
        ) : (
          <div className="relative" ref={runDropdownRef}>
            {/* Unified Split Button */}
            <div className="inline-flex rounded-md shadow-lg shadow-green-900/20">
              {/* Run Button */}
              <button
                onClick={handleRun}
                className="flex items-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium transition-colors rounded-l-md"
              >
                <span className="material-symbols-outlined text-[18px] icon-filled">
                  play_arrow
                </span>
                <span>Run</span>
              </button>
              {/* Dropdown Arrow - Same green, subtle divider */}
              <button
                onClick={() => setShowRunDropdown(!showRunDropdown)}
                className={`flex items-center px-2 py-2 text-white text-sm font-medium transition-colors rounded-r-md border-l border-[#1a7f37] ${
                  showRunDropdown ? 'bg-[#2ea043]' : 'bg-[#238636] hover:bg-[#2ea043]'
                }`}
                title="Run Configuration"
              >
                <span className={`material-symbols-outlined text-[16px] transition-transform ${showRunDropdown ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
            </div>

            {/* Run Config Dropdown Menu */}
            {showRunDropdown && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl z-50 overflow-hidden">
                {/* Recent Configurations */}
                {recentConfigs.length > 0 && (
                  <>
                    <div className="px-3 py-2 border-b border-[#30363d]">
                      <div className="flex items-center gap-2 text-xs font-medium text-[#8b949e] uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        Recent
                      </div>
                    </div>
                    <div className="py-1">
                      {recentConfigs.slice(0, 5).map((config: RunConfigSummary) => (
                        <button
                          key={config.id}
                          onClick={() => handleSelectConfig(config.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#21262d] transition-colors ${
                            config.id === activeConfigId ? 'bg-[#21262d]/50' : ''
                          }`}
                        >
                          {/* Checkmark for active config */}
                          <span className="w-5 flex justify-center shrink-0">
                            {config.id === activeConfigId && (
                              <span className="material-symbols-outlined text-[16px] text-[#238636]">check</span>
                            )}
                          </span>

                          {/* Target icon */}
                          <span className="text-[#8b949e] shrink-0">
                            <span className="material-symbols-outlined text-[16px]">
                              {config.target === 'github' ? 'cloud' : 'computer'}
                            </span>
                          </span>

                          {/* Config details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-white truncate">
                                {config.name}
                              </span>
                              {config.lastUsedAt && (
                                <span className="text-xs text-[#6e7681] ml-2 shrink-0">
                                  {formatLastUsed(config.lastUsedAt)}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#6e7681]">
                              {config.target === 'github' ? 'GitHub Actions' : 'Local'} · {config.browser} · {config.workers} worker{config.workers !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Empty State */}
                {recentConfigs.length === 0 && (
                  <div className="px-3 py-6 text-center">
                    <span className="material-symbols-outlined text-3xl text-[#30363d] mb-2 block">settings</span>
                    <p className="text-sm text-[#8b949e]">No recent configurations</p>
                    <p className="text-xs text-[#6e7681] mt-1">
                      Run a test to see your configurations here
                    </p>
                  </div>
                )}

                {/* Divider */}
                <div className="border-t border-[#30363d]" />

                {/* Configuration Settings */}
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowRunDropdown(false);
                      setModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-[#21262d] transition-colors"
                  >
                    <span className="w-5 flex justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px] text-[#8b949e]">settings</span>
                    </span>
                    <span className="text-sm text-[#c9d1d9]">
                      Run Configuration...
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Record Button */}
        {isRecording ? (
          <button
            onClick={onStopRecording}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#da3633] hover:bg-[#f85149] text-white text-sm font-medium transition-colors animate-pulse"
          >
            <span className="material-symbols-outlined text-[18px]">stop</span>
            <span>Stop Rec</span>
          </button>
        ) : (
          <button
            onClick={onRecord}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] text-white text-sm font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] text-red-500 icon-filled">
              fiber_manual_record
            </span>
            <span>Record</span>
          </button>
        )}

        {/* Environment Selector + Quick Look (Postman-style) */}
        <div className="flex items-center gap-1">
          <EnvironmentSelector
            onOpenManager={() => useEnvironmentStore.getState().setManagerOpen(true)}
          />
          <EnvironmentQuickLook
            onOpenManager={() => useEnvironmentStore.getState().setManagerOpen(true)}
          />
        </div>

            {/* Separator */}
            <div className="h-6 w-px bg-[#30363d]" />
          </>
        )}

      </div>
    </header>
  );
}
