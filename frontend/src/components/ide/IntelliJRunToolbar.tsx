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
    [configurations, workflowId, projectId],
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

  const activeConfig = scopedConfigurations.find((c) => c.id === activeConfigId) || null;
  const effectiveConfig = activeConfig || scopedConfigurations[0] || null;
  const displayName = effectiveConfig?.name || currentFileName?.replace('.vero', '') || 'Run Configuration';

  const handleRun = () => {
    if (effectiveConfig?.id) {
      markConfigUsed(effectiveConfig.id);
    }
    onRun(effectiveConfig?.id || undefined);
  };

  const handleDebug = () => {
    if (effectiveConfig?.id) {
      markConfigUsed(effectiveConfig.id);
    }
    onDebug(effectiveConfig?.id || undefined);
  };

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

  const getTargetIcon = (target: 'local' | 'github-actions') => (
    target === 'github-actions'
      ? <Github className="w-3.5 h-3.5" />
      : <Monitor className="w-3.5 h-3.5" />
  );

  const isExecuting = isRunning || isDebugging;

  return (
    <div className={`relative z-30 flex items-center gap-1 ${className}`}>
      <div ref={configDropdownRef} className="relative">
        <button
          onClick={() => !isExecuting && setIsConfigOpen(!isConfigOpen)}
          disabled={isExecuting}
          className={`
            flex items-center gap-1.5 h-6 px-2 rounded
            border border-transparent text-xs
            ${isExecuting
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:bg-dark-elevated hover:border-border-default'
            }
            transition-colors
          `}
        >
          <FileText className="w-3.5 h-3.5 text-status-success" />
          <span className="text-xs text-text-primary font-medium max-w-[170px] truncate">
            {displayName}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${isConfigOpen ? 'rotate-180' : ''}`} />
        </button>

        {isConfigOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-[360px] bg-dark-shell border border-border-emphasis rounded-md shadow-xl z-[120] overflow-hidden">
            <div className="max-h-[300px] overflow-y-auto">
              {scopedConfigurations.length === 0 ? (
                <div className="px-3 py-2.5 text-xs text-text-muted">No run configurations found.</div>
              ) : (
                scopedConfigurations.map((config) => (
                  <div
                    key={config.id}
                    className={`
                      flex items-center gap-1.5 px-2.5 py-2 group
                      border-b border-border-default/70
                      hover:bg-dark-elevated transition-colors
                      ${config.id === activeConfigId ? 'bg-brand-primary/15' : ''}
                    `}
                  >
                    <span className="w-3.5 flex justify-center shrink-0">
                      {config.id === activeConfigId && (
                        <Check className="w-3.5 h-3.5 text-status-success" />
                      )}
                    </span>

                    <button
                      onClick={() => handleSelectConfig(config.id)}
                      className="flex-1 flex items-center gap-2 text-left min-w-0"
                    >
                      <span className="text-text-muted shrink-0">{getTargetIcon(config.target)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-text-primary truncate">{config.name}</div>
                        <div className="text-xs text-text-muted truncate">
                          {config.target === 'github-actions' ? 'GitHub' : 'Local'} · {config.browser}
                        </div>
                      </div>
                    </button>

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

                      {activeMenuId === config.id && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-dark-elevated border border-border-default rounded-md shadow-xl z-[130] py-1">
                          <button
                            onClick={() => {
                              handleRunWithConfig(config.id);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-dark-shell"
                          >
                            <Play className="w-3.5 h-3.5 text-status-success" />
                            Run
                          </button>
                          <button
                            onClick={() => {
                              handleDebugWithConfig(config.id);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-dark-shell"
                          >
                            <Bug className="w-3.5 h-3.5 text-status-success" />
                            Debug
                          </button>
                          <div className="border-t border-border-default my-1" />
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setActiveConfig(config.id);
                              setIsConfigOpen(false);
                              setModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-dark-shell"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit Configuration...
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              duplicateConfiguration(config.id);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-dark-shell"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Duplicate
                          </button>
                          <div className="border-t border-border-default my-1" />
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              deleteConfiguration(config.id);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-status-danger hover:bg-dark-shell"
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

            <div className="border-t border-border-default" />

            <button
              onClick={() => {
                setIsConfigOpen(false);
                setModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-dark-elevated transition-colors"
            >
              <span className="w-3.5" />
              <Settings className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-xs text-text-secondary">Edit Configurations...</span>
            </button>
          </div>
        )}
      </div>

      {!isExecuting ? (
        <>
          <button
            onClick={handleRun}
            className="h-6 w-6 inline-flex items-center justify-center rounded text-status-success hover:bg-dark-elevated transition-colors"
            title="Run (Shift+F10)"
            aria-label="Run"
          >
            <span className="material-symbols-outlined icon-filled text-base leading-none">play_arrow</span>
          </button>
          <button
            onClick={handleDebug}
            className="h-6 w-6 inline-flex items-center justify-center rounded text-status-success hover:bg-dark-elevated transition-colors"
            title="Debug (Shift+F9)"
            aria-label="Debug"
          >
            <span className="material-symbols-outlined icon-filled text-base leading-none">bug_report</span>
          </button>
        </>
      ) : (
        <button
          onClick={onStop}
          className="h-6 w-6 inline-flex items-center justify-center rounded text-status-danger hover:bg-dark-elevated transition-colors"
          title="Stop (Ctrl+F2)"
          aria-label="Stop"
        >
          <span className="material-symbols-outlined icon-filled text-base leading-none">stop</span>
        </button>
      )}
    </div>
  );
}

export default IntelliJRunToolbar;
