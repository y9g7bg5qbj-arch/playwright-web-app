import {
  Play,
  Bug,
  Pause,
  Square,
  RotateCw,
  Circle,
  CircleSlash,
  MousePointer2,
} from 'lucide-react';

// IntelliJ-style debug step icons
function StepOverIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="11" r="1.5" fill="currentColor" stroke="none" />
      <path d="M2 5 L6 5 Q8 5 8 3 Q8 1 10 1 L14 1" />
      <polyline points="12,0 14,1 12,2" fill="none" />
    </svg>
  );
}

function StepIntoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="13" r="1.5" fill="currentColor" stroke="none" />
      <line x1="8" y1="1" x2="8" y2="10" />
      <polyline points="6,8 8,10 10,8" fill="none" />
    </svg>
  );
}

function StepOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="13" r="1.5" fill="currentColor" stroke="none" />
      <line x1="8" y1="10" x2="8" y2="1" />
      <polyline points="6,3 8,1 10,3" fill="none" />
    </svg>
  );
}

/**
 * Debug execution state
 */
export interface DebugState {
  isDebugging: boolean;
  isPaused: boolean;
  currentLine: number | null;
  breakpoints: Set<number>;
}

/**
 * Debug toolbar props
 */
interface DebugToolbarProps {
  isRunning: boolean;
  debugState: DebugState;
  breakpointsMuted?: boolean;
  onPause: () => void;
  onResume: () => void;
  onStepOver: () => void;
  onStepInto: () => void;
  onStepOut: () => void;
  onStop: () => void;
  onRestart: () => void;
  onToggleMuteBreakpoints?: () => void;
  onOpenInspector?: () => void;
  className?: string;
}

/**
 * IntelliJ IDEA-style Debug toolbar
 *
 * Layout:
 * [⏸ Pause] [⏹ Stop] [↻ Restart]  |  [→ Step Over] [↓ Into] [↑ Out]  |  [⊘ Mute] [🔍 Inspector]
 */
export function DebugToolbar({
  isRunning,
  debugState,
  breakpointsMuted = false,
  onPause,
  onResume,
  onStepOver,
  onStepInto,
  onStepOut,
  onStop,
  onRestart,
  onToggleMuteBreakpoints,
  onOpenInspector,
  className = '',
}: DebugToolbarProps) {
  const { isDebugging, isPaused, currentLine, breakpoints } = debugState;
  const isExecuting = isRunning || isDebugging;

  // Button style helper
  const iconButtonClass = (active = false, disabled = false) => `
    flex items-center justify-center w-7 h-7 rounded transition-colors duration-fast
    ${disabled
      ? 'text-text-muted cursor-not-allowed opacity-40'
      : active
        ? 'bg-brand-primary text-white hover:brightness-110'
        : 'text-text-secondary hover:bg-white/[0.06] hover:text-text-primary'
    }
  `;

  return (
    <div className={`flex items-center gap-1 px-2 py-1.5 bg-dark-card border-b border-border-default ${className}`}>
      {/* Execution Controls - Only shown when running/debugging */}
      {isExecuting && (
        <>
          <div className="w-px h-5 bg-border-emphasis mx-1" />

          <div className="flex items-center gap-0.5">
            {/* Resume/Pause */}
            {isDebugging && (
              isPaused ? (
                <button
                  onClick={onResume}
                  className={iconButtonClass(true)}
                  title="Resume (F9)"
                >
                  <Play className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={onPause}
                  className={iconButtonClass()}
                  title="Pause"
                >
                  <Pause className="w-4 h-4" />
                </button>
              )
            )}

            {/* Stop */}
            <button
              onClick={onStop}
              className="flex items-center justify-center w-7 h-7 rounded text-status-danger hover:bg-status-danger/20 transition-colors duration-fast"
              title="Stop (Shift+F5)"
            >
              <Square className="w-3.5 h-3.5" />
            </button>

            {/* Restart */}
            <button
              onClick={onRestart}
              className={iconButtonClass()}
              title="Restart (Ctrl+Shift+F5)"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* Step Controls - Only shown when debugging and paused */}
      {isDebugging && (
        <>
          <div className="w-px h-5 bg-border-emphasis mx-1" />

          <div className="flex items-center gap-0.5">
            <button
              onClick={onStepOver}
              disabled={!isPaused}
              className={iconButtonClass(false, !isPaused)}
              title="Step Over (F10)"
            >
              <StepOverIcon className="w-4 h-4" />
            </button>

            <button
              onClick={onStepInto}
              disabled={!isPaused}
              className={iconButtonClass(false, !isPaused)}
              title="Step Into (F11)"
            >
              <StepIntoIcon className="w-4 h-4" />
            </button>

            <button
              onClick={onStepOut}
              disabled={!isPaused}
              className={iconButtonClass(false, !isPaused)}
              title="Step Out (Shift+F11)"
            >
              <StepOutIcon className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* Breakpoint Controls */}
      {breakpoints.size > 0 && (
        <>
          <div className="w-px h-5 bg-border-emphasis mx-1" />

          <button
            onClick={onToggleMuteBreakpoints}
            className={iconButtonClass(breakpointsMuted)}
            title={breakpointsMuted ? 'Unmute Breakpoints' : 'Mute All Breakpoints'}
          >
            <CircleSlash className={`w-4 h-4 ${breakpointsMuted ? 'text-status-danger' : ''}`} />
          </button>
        </>
      )}

      {/* Playwright Inspector - when debugging */}
      {isDebugging && (
        <>
          <div className="w-px h-5 bg-border-emphasis mx-1" />
          <button
            onClick={onOpenInspector}
            className={iconButtonClass()}
            title="Open Playwright Inspector (pick elements, test selectors)"
          >
            <MousePointer2 className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Status Section */}
      <div className="flex-1" />

      <div className="flex items-center gap-2 text-xs">
        {isDebugging && (
          <>
            {/* Debug status indicator */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-dark-elevated">
              <Circle
                className={`w-2 h-2 ${isPaused ? 'fill-status-warning text-status-warning' : 'fill-status-success text-status-success'}`}
              />
              <span className={isPaused ? 'text-status-warning' : 'text-status-success'}>
                {isPaused ? 'Paused' : 'Running'}
              </span>
            </div>

            {/* Current line */}
            {currentLine !== null && (
              <span className="text-text-secondary tabular-nums">
                Line {currentLine}
              </span>
            )}

            {/* Breakpoints count */}
            {breakpoints.size > 0 && (
              <span className="text-text-muted">
                {breakpoints.size} BP{breakpoints.size !== 1 ? 's' : ''}
              </span>
            )}
          </>
        )}

        {isRunning && !isDebugging && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-dark-elevated">
            <Circle className="w-2 h-2 fill-status-success text-status-success animate-pulse" />
            <span className="text-status-success">Running</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact debug toolbar for embedding in editor header
 */
export function CompactDebugToolbar({
  isRunning,
  debugState,
  onRun,
  onDebug,
  onStop,
  className = '',
}: {
  isRunning: boolean;
  debugState: DebugState;
  onRun: (configId?: string) => void;
  onDebug: (configId?: string) => void;
  onStop: () => void;
  className?: string;
}) {
  const { isDebugging } = debugState;
  const isExecuting = isRunning || isDebugging;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {!isExecuting ? (
        <>
          <button
            onClick={() => onRun()}
            className="flex items-center justify-center w-6 h-6 rounded bg-status-success/20 hover:bg-status-success/30 text-status-success transition-colors duration-fast"
            title="Run (Shift+F10)"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDebug()}
            className="flex items-center justify-center w-6 h-6 rounded bg-status-warning/20 hover:bg-status-warning/30 text-status-warning transition-colors duration-fast"
            title="Debug (Shift+F9)"
          >
            <Bug className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <button
          onClick={onStop}
          className="flex items-center justify-center w-6 h-6 rounded bg-status-danger/20 hover:bg-status-danger/30 text-status-danger transition-colors duration-fast"
          title="Stop (Shift+F5)"
        >
          <Square className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
