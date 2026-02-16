import { useState, useEffect, useMemo, useRef } from 'react';
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
import { IconButton } from '@/components/ui';
import { useRunConfigStore } from '@/store/runConfigStore';

interface IntelliJRunToolbarProps {
  isRunning: boolean;
  isDebugging: boolean;
  onRun: (configId?: string, tags?: string[]) => void;
  onDebug: (configId?: string) => void;
  onStop: () => void;
  workflowId?: string;
  projectId?: string;
  currentFileName?: string;
  className?: string;
}

/**
 * IntelliJ IDEA-style Run Widget
 *
 * Layout: [⚙ Configuration ▾] [▶] [🐛]
 *
 * - Config dropdown shows active run configuration
 * - Simple flat green icons for Run and Debug
 * - 3-dot menu on each config in dropdown
 */
export function IntelliJRunToolbar({
  isRunning,
  isDebugging,
  onRun,
  onDebug,
  onStop,
  workflowId,
  projectId,
  currentFileName,
  className = '',
}: IntelliJRunToolbarProps) {
  const configDropdownRef = useRef<HTMLDivElement>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const {
    configurations,
    activeConfigId,
    setModalOpen,
    setActiveConfig,
    markConfigUsed,
    deleteConfiguration,
    duplicateConfiguration,
  } = useRunConfigStore();

  const scopedConfigurations = useMemo(
    () =>
      workflowId && projectId
        ? configurations.filter((config) => config.workflowId === workflowId && config.projectId === projectId)
        : [],
    [configurations, workflowId, projectId]
  );

  useEffect(() => {
    if (activeConfigId && scopedConfigurations.some((config) => config.id === activeConfigId)) {
      return;
    }
    const fallbackId = scopedConfigurations[0]?.id || null;
    if (activeConfigId !== fallbackId) {
      setActiveConfig(fallbackId);
    }
  }, [activeConfigId, scopedConfigurations, setActiveConfig]);

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
  const activeConfig = scopedConfigurations.find((c) => c.id === activeConfigId) || null;
  const effectiveConfig = activeConfig || scopedConfigurations[0] || null;

  // Prefer the active run configuration label.
  const displayName = effectiveConfig?.name || currentFileName?.replace('.vero', '') || 'Run Configuration';

  // Handle run
  const handleRun = () => {
    if (effectiveConfig?.id) {
      markConfigUsed(effectiveConfig.id);
    }
    onRun(effectiveConfig?.id || undefined);
  };

  // Handle debug
  const handleDebug = () => {
    if (effectiveConfig?.id) {
      markConfigUsed(effectiveConfig.id);
    }
    onDebug(effectiveConfig?.id || undefined);
  };

  // Selecting a config should not execute tests.
  const handleSelectConfig = (configId: string) => {
    setActiveConfig(configId);
    setIsConfigOpen(false);
    setActiveMenuId(null);
  };

  const handleRunWithConfig = (configId: string) => {
    setActiveConfig(configId);
    markConfigUsed(configId);
    setIsConfigOpen(false);
    setActiveMenuId(null);
    onRun(configId);
  };

  const handleDebugWithConfig = (configId: string) => {
    setActiveConfig(configId);
    markConfigUsed(configId);
    setIsConfigOpen(false);
    setActiveMenuId(null);
    onDebug(configId);
  };

  // Get icon for config target
  const getTargetIcon = (target: 'local' | 'github-actions') => {
    return target === 'github-actions' ? (
      <Github className="w-4 h-4" />
    ) : (
      <Monitor className="w-4 h-4" />
    );
  };

  const isExecuting = isRunning || isDebugging;

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {/* Configuration Dropdown - IntelliJ style: shows active config prominently */}
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
          {/* Configuration icon */}
          <FileText className="w-4 h-4 text-status-success" />

          {/* Active configuration name */}
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
              {scopedConfigurations.length === 0 ? (
                <div className="px-3 py-2 text-xs text-text-muted">
                  No run configurations found.
                </div>
              ) : (
                scopedConfigurations.map((config) => (
                <div
                  key={config.id}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 group
                    hover:bg-white/[0.04] transition-colors duration-fast
                    ${config.id === activeConfigId ? 'bg-brand-primary/30' : ''}
                  `}
                >
                  {/* Checkmark for active */}
                  <span className="w-4 flex justify-center shrink-0">
                    {config.id === activeConfigId && (
                      <Check className="w-3.5 h-3.5 text-status-success" />
                    )}
                  </span>

                  {/* Config info - clickable to select */}
                  <button
                    onClick={() => handleSelectConfig(config.id)}
                    className="flex-1 flex items-center gap-2 text-left min-w-0"
                  >
                    <span className="text-text-muted shrink-0">
                      {getTargetIcon(config.target)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-primary truncate">
                        {config.name}
                      </div>
                      <div className="text-3xs text-text-muted">
                        {config.target === 'github-actions' ? 'GitHub' : 'Local'} · {config.browser}
                      </div>
                    </div>
                  </button>

                  {/* 3-dot menu - IntelliJ style */}
                  <div className="relative">
                    <IconButton
                      icon={<MoreVertical className="w-3.5 h-3.5" />}
                      size="sm"
                      variant="ghost"
                      tooltip="More actions"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === config.id ? null : config.id);
                      }}
                      className="opacity-70 group-hover:opacity-100"
                    />

                    {/* Context menu */}
                    {activeMenuId === config.id && (
                      <div className="absolute right-0 top-full mt-1 w-36 bg-dark-elevated border border-border-default rounded shadow-lg z-50 py-1">
                        <button
                          onClick={() => {
                            handleRunWithConfig(config.id);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-white/[0.04]"
                        >
                          <Play className="w-3.5 h-3.5 text-status-success" />
                          Run
                        </button>
                        <button
                          onClick={() => {
                            handleDebugWithConfig(config.id);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-white/[0.04]"
                        >
                          <Bug className="w-3.5 h-3.5 text-status-success" />
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
                ))
              )}
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
        <IconButton
          icon={<span className="material-symbols-outlined icon-filled text-xl leading-none text-status-success">play_arrow</span>}
          tooltip="Run (Shift+F10)"
          onClick={handleRun}
          className="w-7 h-7"
        />
      ) : (
        <IconButton
          icon={<span className="material-symbols-outlined icon-filled text-lg leading-none text-status-danger">stop</span>}
          tooltip="Stop (Ctrl+F2)"
          onClick={onStop}
          className="w-7 h-7"
        />
      )}

      {/* Debug Button - Simple green bug icon (IntelliJ style - same color as run) */}
      {!isExecuting && (
        <IconButton
          icon={<span className="material-symbols-outlined icon-filled text-xl leading-none text-status-success">bug_report</span>}
          tooltip="Debug (Shift+F9)"
          onClick={handleDebug}
          className="w-7 h-7"
        />
      )}
    </div>
  );
}

export default IntelliJRunToolbar;
