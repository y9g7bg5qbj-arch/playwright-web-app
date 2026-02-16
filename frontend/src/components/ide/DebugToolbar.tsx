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
import { IconButton, Toolbar, ToolbarGroup, ToolbarDivider } from '@/components/ui';

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

  return (
    <Toolbar className={`bg-dark-card ${className}`}>
      {/* Execution Controls - Only shown when running/debugging */}
      {isExecuting && (
        <>
          <ToolbarDivider />

          <ToolbarGroup>
            {/* Resume/Pause */}
            {isDebugging && (
              isPaused ? (
                <IconButton
                  icon={<Play className="w-4 h-4" />}
                  active
                  tooltip="Resume (F9)"
                  onClick={onResume}
                />
              ) : (
                <IconButton
                  icon={<Pause className="w-4 h-4" />}
                  tooltip="Pause"
                  onClick={onPause}
                />
              )
            )}

            {/* Stop */}
            <IconButton
              icon={<Square className="w-3.5 h-3.5" />}
              tone="danger"
              tooltip="Stop (Shift+F5)"
              onClick={onStop}
            />

            {/* Restart */}
            <IconButton
              icon={<RotateCw className="w-4 h-4" />}
              tooltip="Restart (Ctrl+Shift+F5)"
              onClick={onRestart}
            />
          </ToolbarGroup>
        </>
      )}

      {/* Step Controls - Only shown when debugging and paused */}
      {isDebugging && (
        <>
          <ToolbarDivider />

          <ToolbarGroup>
            <IconButton
              icon={<StepOverIcon className="w-4 h-4" />}
              disabled={!isPaused}
              tooltip="Step Over (F10)"
              onClick={onStepOver}
            />

            <IconButton
              icon={<StepIntoIcon className="w-4 h-4" />}
              disabled={!isPaused}
              tooltip="Step Into (F11)"
              onClick={onStepInto}
            />

            <IconButton
              icon={<StepOutIcon className="w-4 h-4" />}
              disabled={!isPaused}
              tooltip="Step Out (Shift+F11)"
              onClick={onStepOut}
            />
          </ToolbarGroup>
        </>
      )}

      {/* Breakpoint Controls */}
      {breakpoints.size > 0 && (
        <>
          <ToolbarDivider />

          <IconButton
            icon={<CircleSlash className={`w-4 h-4 ${breakpointsMuted ? 'text-status-danger' : ''}`} />}
            active={breakpointsMuted}
            tooltip={breakpointsMuted ? 'Unmute Breakpoints' : 'Mute All Breakpoints'}
            onClick={onToggleMuteBreakpoints}
          />
        </>
      )}

      {/* Playwright Inspector - when debugging */}
      {isDebugging && (
        <>
          <ToolbarDivider />
          <IconButton
            icon={<MousePointer2 className="w-4 h-4" />}
            tooltip="Open Playwright Inspector (pick elements, test selectors)"
            onClick={onOpenInspector}
          />
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
    </Toolbar>
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
          <IconButton
            icon={<Play className="w-3.5 h-3.5" />}
            size="sm"
            tooltip="Run (Shift+F10)"
            onClick={() => onRun()}
            className="bg-status-success/20 hover:bg-status-success/30 text-status-success"
          />
          <IconButton
            icon={<Bug className="w-3.5 h-3.5" />}
            size="sm"
            tooltip="Debug (Shift+F9)"
            onClick={() => onDebug()}
            className="bg-status-warning/20 hover:bg-status-warning/30 text-status-warning"
          />
        </>
      ) : (
        <IconButton
          icon={<Square className="w-3 h-3" />}
          size="sm"
          tone="danger"
          tooltip="Stop (Shift+F5)"
          onClick={onStop}
          className="bg-status-danger/20 hover:bg-status-danger/30 text-status-danger"
        />
      )}
    </div>
  );
}
