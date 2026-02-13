import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Bug,
  ChevronDown,
  Settings,
  Check,
  Monitor,
  Github,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  FileText,
} from 'lucide-react';
import { useRunConfigStore, initializeDefaultConfig, type RunConfigSummary } from '@/store/runConfigStore';

interface IntelliJRunToolbarProps {
  isRunning: boolean;
  isDebugging: boolean;
  onRun: (configId?: string, tags?: string[]) => void;
  onDebug: (configId?: string) => void;
  onStop: () => void;
  currentFileName?: string;
  className?: string;
}

/**
 * IntelliJ IDEA-style Run Widget
 *
 * Layout: [📄 TestName ▾] [▶] [🐛]
 *
 * - Config dropdown shows current file/test name prominently
 * - Simple flat green icons for Run and Debug
 * - 3-dot menu on each config in dropdown
 */
export function IntelliJRunToolbar({
  isRunning,
  isDebugging,
  onRun,
  onDebug,
  onStop,
  currentFileName,
  className = '',
}: IntelliJRunToolbarProps) {
  const configDropdownRef = useRef<HTMLDivElement>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const {
    recentConfigs,
    activeConfigId,
    setModalOpen,
    setActiveConfig,
    markConfigUsed,
    deleteConfiguration,
    duplicateConfiguration,
  } = useRunConfigStore();

  // Initialize default config on mount
  useEffect(() => {
    initializeDefaultConfig();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (configDropdownRef.current && !configDropdownRef.current.contains(event.target as Node)) {
        setIsConfigOpen(false);
        setActiveMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get active config
  const activeConfig = recentConfigs.find(c => c.id === activeConfigId);

  // Prefer the active run configuration label, then fall back to current file
  const displayName = activeConfig?.name || currentFileName?.replace('.vero', '') || 'Current File';

  // Handle run
  const handleRun = () => {
    if (activeConfigId) {
      markConfigUsed(activeConfigId);
    }
    onRun(activeConfigId || undefined);
  };

  // Handle debug
  const handleDebug = () => {
    if (activeConfigId) {
      markConfigUsed(activeConfigId);
    }
    onDebug(activeConfigId || undefined);
  };

  // Handle run with specific config
  const handleRunWithConfig = (configId: string) => {
    setActiveConfig(configId);
    markConfigUsed(configId);
    setIsConfigOpen(false);
    onRun(configId);
  };

  // Get icon for config target
  const getTargetIcon = (target: 'local' | 'github') => {
    return target === 'github' ? (
      <Github className="w-4 h-4" />
    ) : (
      <Monitor className="w-4 h-4" />
    );
  };

  const isExecuting = isRunning || isDebugging;

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {/* Configuration Dropdown - IntelliJ style: shows test/file name prominently */}
      <div ref={configDropdownRef} className="relative">
        <button
          onClick={() => !isExecuting && setIsConfigOpen(!isConfigOpen)}
          disabled={isExecuting}
          className={`
            flex items-center gap-2 h-7 px-2.5 rounded
            border border-transparent
            ${isExecuting
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:bg-white/[0.04] hover:border-border-subtle'
            }
            transition-all duration-fast
          `}
        >
          {/* File/Test icon */}
          <FileText className="w-4 h-4 text-[#6bac65]" />

          {/* Test/File name - prominent like IntelliJ */}
          <span className="text-sm text-text-primary font-medium max-w-[180px] truncate">
            {displayName}
          </span>

          {/* Dropdown arrow */}
          <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform duration-fast ${isConfigOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Config Dropdown */}
        {isConfigOpen && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-dark-card border border-border-default rounded shadow-lg z-50 overflow-hidden">
            {/* Configurations list */}
            <div className="py-1 max-h-[280px] overflow-y-auto">
              {/* Current file option */}
              <div
                className={`
                  flex items-center gap-2 px-3 py-1.5 group cursor-pointer
                  hover:bg-white/[0.04] transition-colors duration-fast
                  ${!activeConfigId ? 'bg-[#2a4b8c]/30' : ''}
                `}
                onClick={() => {
                  setActiveConfig('');
                  setIsConfigOpen(false);
                  onRun();
                }}
              >
                <span className="w-4 flex justify-center shrink-0">
                  {!activeConfigId && <Check className="w-3.5 h-3.5 text-[#6bac65]" />}
                </span>
                <FileText className="w-4 h-4 text-[#6bac65] shrink-0" />
                <span className="flex-1 text-sm text-text-primary truncate">
                  {currentFileName || 'Current File'}
                </span>
              </div>

              {/* Divider if we have configs */}
              {recentConfigs.length > 0 && (
                <div className="border-t border-border-subtle my-1" />
              )}

              {/* Recent configs */}
              {recentConfigs.map((config: RunConfigSummary) => (
                <div
                  key={config.id}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 group
                    hover:bg-white/[0.04] transition-colors duration-fast
                    ${config.id === activeConfigId ? 'bg-[#2a4b8c]/30' : ''}
                  `}
                >
                  {/* Checkmark for active */}
                  <span className="w-4 flex justify-center shrink-0">
                    {config.id === activeConfigId && (
                      <Check className="w-3.5 h-3.5 text-[#6bac65]" />
                    )}
                  </span>

                  {/* Config info - clickable to select */}
                  <button
                    onClick={() => handleRunWithConfig(config.id)}
                    className="flex-1 flex items-center gap-2 text-left min-w-0"
                  >
                    <span className="text-text-muted shrink-0">
                      {getTargetIcon(config.target)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-primary truncate">
                        {config.name}
                      </div>
                      <div className="text-[10px] text-text-muted">
                        {config.target === 'github' ? 'GitHub' : 'Local'} · {config.browser}
                      </div>
                    </div>
                  </button>

                  {/* 3-dot menu - IntelliJ style */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === config.id ? null : config.id);
                      }}
                      className="p-1 rounded opacity-70 group-hover:opacity-100 hover:bg-white/[0.08] transition-all duration-fast"
                    >
                      <MoreVertical className="w-3.5 h-3.5 text-text-muted" />
                    </button>

                    {/* Context menu */}
                    {activeMenuId === config.id && (
                      <div className="absolute right-0 top-full mt-1 w-36 bg-dark-elevated border border-border-default rounded shadow-lg z-50 py-1">
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            handleRunWithConfig(config.id);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-white/[0.04]"
                        >
                          <Play className="w-3.5 h-3.5 text-[#6bac65]" />
                          Run
                        </button>
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            setActiveConfig(config.id);
                            onDebug(config.id);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-white/[0.04]"
                        >
                          <Bug className="w-3.5 h-3.5 text-[#6bac65]" />
                          Debug
                        </button>
                        <div className="border-t border-border-subtle my-1" />
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            setActiveConfig(config.id);
                            setIsConfigOpen(false);
                            setModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-white/[0.04]"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit Configuration...
                        </button>
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            duplicateConfiguration(config.id);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-white/[0.04]"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Duplicate
                        </button>
                        <div className="border-t border-border-subtle my-1" />
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            deleteConfiguration(config.id);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-status-danger hover:bg-white/[0.04]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-border-subtle" />

            {/* Edit Configurations link */}
            <button
              onClick={() => {
                setIsConfigOpen(false);
                setModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.04] transition-colors duration-fast"
            >
              <span className="w-4" />
              <Settings className="w-4 h-4 text-text-muted" />
              <span className="text-sm text-text-secondary">Edit Configurations...</span>
            </button>
          </div>
        )}
      </div>

      {/* Run Button - Simple green play icon (IntelliJ style) */}
      {!isExecuting ? (
        <button
          onClick={handleRun}
          className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/[0.04] transition-colors duration-fast"
          title="Run (Shift+F10)"
        >
          <span className="material-symbols-outlined icon-filled text-[18px] leading-none text-[#6bac65]">
            play_arrow
          </span>
        </button>
      ) : (
        <button
          onClick={onStop}
          className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/[0.04] transition-colors duration-fast"
          title="Stop (Ctrl+F2)"
        >
          <span className="material-symbols-outlined icon-filled text-[17px] leading-none text-[#c75450]">
            stop
          </span>
        </button>
      )}

      {/* Debug Button - Simple green bug icon (IntelliJ style - same color as run) */}
      {!isExecuting && (
        <button
          onClick={handleDebug}
          className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/[0.04] transition-colors duration-fast"
          title="Debug (Shift+F9)"
        >
          <span className="material-symbols-outlined icon-filled text-[18px] leading-none text-[#6bac65]">
            bug_report
          </span>
        </button>
      )}
    </div>
  );
}

export default IntelliJRunToolbar;
