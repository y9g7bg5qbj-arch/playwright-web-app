import { useState, useEffect } from 'react';
import { useEnvironmentStore } from '@/store/environmentStore';
import { IntelliJRunToolbar } from '../ide/IntelliJRunToolbar';
import { Plus, FolderX, ChevronRight, Search } from 'lucide-react';
import { IconButton } from '@/components/ui';

export interface Application {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface HeaderProps {
  applications: Application[];
  selectedApplicationId: string | null;
  workflowId?: string;
  projectId?: string;
  onApplicationSelect: (applicationId: string) => void;
  onCreateApplication: () => void;
  isRunning: boolean;
  isDebugging: boolean;
  isRecording: boolean;
  onRun: (configId?: string) => void;
  onDebug: (configId?: string) => void;
  onStop: () => void;
  onRecord: () => void;
  onStopRecording: () => void;
  showRunControls?: boolean;
  currentFileName?: string;
}

const APP_COLORS = [
  'bg-status-info',
  'bg-status-success',
  'bg-status-warning',
  'bg-status-danger',
  'bg-accent-purple',
  'bg-accent-teal',
  'bg-accent-orange',
  'bg-brand-primary',
];

function getAppColor(index: number): string {
  return APP_COLORS[index % APP_COLORS.length];
}

function getAppInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Header({
  applications,
  selectedApplicationId,
  workflowId,
  projectId,
  onApplicationSelect,
  onCreateApplication,
  isRunning,
  isDebugging,
  isRecording,
  onRun,
  onDebug,
  onStop,
  onRecord,
  onStopRecording,
  showRunControls = true,
  currentFileName,
}: HeaderProps): JSX.Element {
  const [showAppLauncher, setShowAppLauncher] = useState(false);

  useEffect(() => {
    if (selectedApplicationId) {
      useEnvironmentStore.getState().setApplicationId(selectedApplicationId);
    }
  }, [selectedApplicationId]);

  const selectedApplication = applications.find((app) => app.id === selectedApplicationId);
  return (
    <header className="relative z-20 h-10 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-2.5 border-b border-border-default bg-dark-bg shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="relative">
          <IconButton
            icon={<span className="material-symbols-outlined text-sm leading-none">apps</span>}
            size="md"
            variant="ghost"
            tooltip="Applications"
            active={showAppLauncher}
            onClick={() => setShowAppLauncher(!showAppLauncher)}
            className={showAppLauncher ? 'bg-dark-elevated' : 'bg-dark-shell hover:bg-dark-elevated'}
          />

          {showAppLauncher && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAppLauncher(false)} />
              <div className="absolute left-0 top-full mt-1 w-[300px] bg-dark-shell border border-border-default rounded-md shadow-xl z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-border-default">
                  <h3 className="text-text-primary font-medium text-xs">Applications</h3>
                </div>

                <div className="p-2">
                  {applications.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1.5">
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
                            className={`flex flex-col items-center gap-1.5 p-2 rounded transition-colors ${
                              isSelected
                                ? 'bg-dark-elevated border border-brand-primary'
                                : 'hover:bg-dark-elevated border border-transparent'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-md ${colorClass} flex items-center justify-center`}>
                              {app.icon ? (
                                <span className="material-symbols-outlined text-white text-base">{app.icon}</span>
                              ) : (
                                <span className="text-white font-semibold text-xs">{getAppInitials(app.name)}</span>
                              )}
                            </div>
                            <span className="text-3xs text-text-secondary text-center leading-tight line-clamp-2 w-full">
                              {app.name}
                            </span>
                          </button>
                        );
                      })}

                      <button
                        onClick={() => {
                          setShowAppLauncher(false);
                          onCreateApplication();
                        }}
                        className="flex flex-col items-center gap-1.5 p-2 rounded hover:bg-dark-elevated transition-colors"
                      >
                        <div className="w-9 h-9 rounded-md border border-dashed border-border-emphasis flex items-center justify-center hover:border-brand-primary transition-colors">
                          <Plus size={16} className="text-text-muted" />
                        </div>
                        <span className="text-3xs text-text-muted text-center">New App</span>
                      </button>
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-md bg-dark-elevated flex items-center justify-center">
                        <FolderX size={22} className="text-text-muted" />
                      </div>
                      <p className="text-text-muted text-xs mb-2">No applications yet</p>
                      <button
                        onClick={() => {
                          setShowAppLauncher(false);
                          onCreateApplication();
                        }}
                        className="px-3 py-1.5 rounded bg-status-success hover:bg-status-success/90 text-white text-xs font-medium transition-colors"
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

        <div className="flex items-center min-w-0 gap-1.5">
          <span className="text-xs font-medium text-text-primary">Vero</span>
          <ChevronRight className="h-3 w-3 text-text-muted shrink-0" />
          {selectedApplication ? (
            <span className="text-xs text-text-secondary truncate">{selectedApplication.name}</span>
          ) : (
            <span className="text-xs text-text-muted">No App</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center min-w-[340px] overflow-visible">
        {showRunControls && (
          <div className="h-8 flex items-center bg-dark-canvas border border-border-default rounded-md px-1.5">
            <IntelliJRunToolbar
              isRunning={isRunning}
              isDebugging={isDebugging}
              workflowId={workflowId}
              projectId={projectId}
              onRun={(configId?: string) => onRun(configId)}
              onDebug={(configId?: string) => onDebug(configId)}
              onStop={onStop}
              currentFileName={currentFileName}
              className="pr-1.5 mr-1.5 border-r border-border-default"
            />

            {isRecording ? (
              <button
                onClick={onStopRecording}
                className="h-6 px-1.5 inline-flex items-center justify-center rounded border border-status-danger/45 text-status-danger bg-status-danger/10 hover:bg-status-danger/20 transition-colors"
                title="Stop recording"
                aria-label="Stop recording"
              >
                <span className="material-symbols-outlined icon-filled text-base leading-none">stop_circle</span>
              </button>
            ) : (
              <button
                onClick={onRecord}
                className="h-6 px-1.5 inline-flex items-center justify-center rounded border border-border-default text-status-danger hover:border-status-danger/50 hover:bg-status-danger/10 transition-colors"
                title="Start recording"
                aria-label="Start recording"
              >
                <span className="material-symbols-outlined icon-filled text-base leading-none">fiber_manual_record</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end">
        <div className="h-7 inline-flex items-center gap-1.5 px-2 rounded border border-border-default bg-dark-canvas text-text-muted text-3xs cursor-default">
          <Search size={12} className="text-text-muted" />
          <span className="hidden sm:inline">Search Everywhere</span>
          <kbd className="ml-1 px-1 py-px rounded-sm bg-dark-elevated text-text-muted text-4xs border border-border-default">
            {navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl'}P
          </kbd>
        </div>
      </div>
    </header>
  );
}
