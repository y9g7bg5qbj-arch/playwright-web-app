import { useState, useEffect } from 'react';
import { useEnvironmentStore } from '@/store/environmentStore';
import { EnvironmentSelector } from './EnvironmentQuickLook';
import { IntelliJRunToolbar } from '../ide/IntelliJRunToolbar';
import { LayoutDashboard, Plus, FolderX, ChevronRight } from 'lucide-react';

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
  isDebugging: boolean;
  isRecording: boolean;
  onRun: () => void;
  onDebug: () => void;
  onStop: () => void;
  onRecord: () => void;
  onStopRecording: () => void;
  showRunControls?: boolean;
  currentFileName?: string;
}

// App colors - solid semantic colors (no gradients)
const APP_COLORS = [
  'bg-status-info',      // Blue
  'bg-status-success',   // Green
  'bg-status-warning',   // Amber
  'bg-status-danger',    // Red
  'bg-accent-purple',    // Purple
  'bg-accent-teal',      // Teal
  'bg-accent-orange',    // Orange
  'bg-brand-primary',    // Brand blue
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

  // Initialize environment store when application changes
  useEffect(() => {
    if (selectedApplicationId) {
      useEnvironmentStore.getState().setApplicationId(selectedApplicationId);
    }
  }, [selectedApplicationId]);

  const selectedApplication = applications.find(app => app.id === selectedApplicationId);
  const selectedAppColor = selectedApplication
    ? selectedApplication.color || getAppColor(applications.findIndex((app) => app.id === selectedApplicationId))
    : 'bg-dark-elevated';

  return (
    <header className="h-11 flex items-center justify-between px-3 border-b border-border-default bg-dark-bg shrink-0">
      {/* Left Section - App Launcher, Logo, and Current App */}
      <div className="flex items-center gap-2.5">
        {/* Application Launcher */}
        <div className="relative">
          <button
            onClick={() => setShowAppLauncher(!showAppLauncher)}
            className={`w-8 h-8 rounded-md border flex items-center justify-center transition-colors duration-fast ease-out ${
              showAppLauncher
                ? 'border-border-emphasis bg-dark-elevated text-text-primary'
                : 'border-border-default bg-dark-card text-text-muted hover:border-border-emphasis hover:text-text-primary'
              }`}
            title="Applications"
          >
            <LayoutDashboard size={14} />
          </button>

          {/* App Launcher Popup */}
          {showAppLauncher && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowAppLauncher(false)}
              />
              <div className="absolute left-0 top-full mt-2 w-[320px] bg-dark-bg border border-border-default rounded-xl shadow-2xl z-50 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-border-default">
                  <h3 className="text-text-primary font-semibold text-sm">Applications</h3>
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
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${isSelected
                                ? 'bg-dark-elevated border-2 border-brand-primary'
                                : 'hover:bg-dark-elevated'
                              }`}
                          >
                            <div
                              className={`w-12 h-12 rounded-xl ${colorClass} flex items-center justify-center shadow-md`}
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
                            <span className="text-[11px] text-text-secondary text-center leading-tight line-clamp-2 w-full">
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
                        className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-dark-elevated transition-colors"
                      >
                        <div className="w-12 h-12 rounded-xl border-2 border-dashed border-border-emphasis flex items-center justify-center hover:border-brand-primary transition-colors">
                          <Plus size={18} className="text-text-muted" />
                        </div>
                        <span className="text-[11px] text-text-muted text-center">
                          New App
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-dark-elevated flex items-center justify-center">
                        <FolderX size={28} className="text-text-muted" />
                      </div>
                      <p className="text-text-muted text-sm mb-3">No applications yet</p>
                      <button
                        onClick={() => {
                          setShowAppLauncher(false);
                          onCreateApplication();
                        }}
                        className="px-4 py-2 rounded-md bg-status-success hover:bg-status-success/90 text-white text-sm font-medium transition-colors"
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

        {/* IntelliJ-style product + application breadcrumb */}
        <div className="flex items-center rounded-md border border-border-default bg-dark-card px-2 py-1">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-sm bg-brand-primary/90 flex items-center justify-center">
              <span className="text-white font-semibold text-[10px]">V</span>
            </div>
            <span className="text-text-primary font-semibold text-xs tracking-tight">Vero IDE</span>
          </div>

          <ChevronRight className="mx-2 h-3.5 w-3.5 text-text-muted" />

          {selectedApplication ? (
            <div className="flex items-center gap-1.5 rounded-sm bg-dark-elevated/70 px-1.5 py-0.5">
              <div className={`h-4 w-4 rounded-sm ${selectedAppColor} flex items-center justify-center`}>
                <span className="text-white text-[9px] font-semibold">
                  {getAppInitials(selectedApplication.name)}
                </span>
              </div>
              <span className="text-text-primary text-xs font-medium">{selectedApplication.name}</span>
            </div>
          ) : (
            <span className="text-text-muted text-xs">No Application</span>
          )}
        </div>
      </div>

      {/* Right Section - Run Controls */}
      <div className="flex items-center gap-2">
        {showRunControls && (
          <div className="flex items-center gap-2 rounded-xl border border-border-default bg-gradient-to-b from-white/[0.04] to-white/[0.02] px-2 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
            <IntelliJRunToolbar
              isRunning={isRunning}
              isDebugging={isDebugging}
              onRun={(_configId?: string, _tags?: string[]) => onRun()}
              onDebug={(_configId?: string) => onDebug()}
              onStop={onStop}
              currentFileName={currentFileName}
              className="pr-2 mr-1 border-r border-border-default"
            />

            {/* Record Button */}
            {isRecording ? (
              <button
                onClick={onStopRecording}
                className="relative flex h-8 w-8 items-center justify-center rounded-md border border-status-danger/50 bg-status-danger/15 text-status-danger hover:bg-status-danger/25 transition-all duration-fast ease-out"
                title="Stop recording"
                aria-label="Stop recording"
              >
                <span className="material-symbols-outlined icon-filled text-[18px] leading-none">stop_circle</span>
              </button>
            ) : (
              <button
                onClick={onRecord}
                className="group relative flex h-8 w-8 items-center justify-center rounded-md border border-border-default bg-dark-elevated text-status-danger hover:border-status-danger/55 hover:bg-status-danger/10 transition-all duration-fast ease-out"
                title="Start recording"
                aria-label="Start recording"
              >
                <span className="absolute inset-0 rounded-md ring-1 ring-status-danger/0 group-hover:ring-status-danger/30 transition-all duration-fast" />
                <span className="material-symbols-outlined icon-filled text-[18px] leading-none animate-pulse-recording">
                  fiber_manual_record
                </span>
              </button>
            )}

            {/* Environment Selector */}
            <div className="flex items-center gap-1">
              <EnvironmentSelector
                onOpenManager={() => useEnvironmentStore.getState().setManagerOpen(true)}
              />
            </div>

            {/* Separator */}
            <div className="h-5 w-px bg-border-default" />
          </div>
        )}

      </div>
    </header>
  );
}
