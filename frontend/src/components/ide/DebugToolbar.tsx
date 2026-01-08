/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Play,
  Bug,
  Pause,
  Square,
  ArrowRight,
  ArrowDown,
  RotateCw,
  Circle,
} from 'lucide-react';

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
  onRun: () => void;
  onDebug: () => void;
  onPause: () => void;
  onResume: () => void;
  onStepOver: () => void;
  onStepInto: () => void;
  onStop: () => void;
  onRestart: () => void;
  className?: string;
}

/**
 * Debug toolbar component with run/debug controls
 * Similar to IntelliJ IDEA debug toolbar
 */
export function DebugToolbar({
  isRunning,
  debugState,
  onRun,
  onDebug,
  onPause,
  onResume,
  onStepOver,
  onStepInto,
  onStop,
  onRestart,
  className = '',
}: DebugToolbarProps) {
  const { isDebugging, isPaused, currentLine, breakpoints } = debugState;

  // Button style helper
  const buttonClass = (active = false, disabled = false) => `
    p-1.5 rounded transition-colors
    ${disabled
      ? 'text-gray-500 cursor-not-allowed'
      : active
        ? 'bg-blue-600 text-white hover:bg-blue-700'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }
  `;

  return (
    <div className={`flex items-center gap-1 px-2 py-1 bg-gray-800 border-b border-gray-700 ${className}`}>
      {/* Left section: Run/Debug buttons */}
      <div className="flex items-center gap-1">
        {!isRunning && !isDebugging ? (
          <>
            {/* Run button */}
            <button
              onClick={onRun}
              className={buttonClass()}
              title="Run (F5)"
            >
              <Play className="w-4 h-4" />
            </button>

            {/* Debug button */}
            <button
              onClick={onDebug}
              className={buttonClass()}
              title="Debug (F9)"
            >
              <Bug className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            {/* Resume/Pause button */}
            {isPaused ? (
              <button
                onClick={onResume}
                className={buttonClass(true)}
                title="Continue (F5)"
              >
                <Play className="w-4 h-4" />
              </button>
            ) : isDebugging ? (
              <button
                onClick={onPause}
                className={buttonClass()}
                title="Pause"
              >
                <Pause className="w-4 h-4" />
              </button>
            ) : null}

            {/* Stop button */}
            <button
              onClick={onStop}
              className={buttonClass()}
              title="Stop (Shift+F5)"
            >
              <Square className="w-4 h-4" />
            </button>

            {/* Restart button */}
            <button
              onClick={onRestart}
              className={buttonClass()}
              title="Restart (Ctrl+Shift+F5)"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Divider */}
      {(isRunning || isDebugging) && (
        <div className="w-px h-5 bg-gray-600 mx-1" />
      )}

      {/* Step controls - only shown when debugging and paused */}
      {isDebugging && (
        <div className="flex items-center gap-1">
          <button
            onClick={onStepOver}
            disabled={!isPaused}
            className={buttonClass(false, !isPaused)}
            title="Step Over (F10)"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onStepInto}
            disabled={!isPaused}
            className={buttonClass(false, !isPaused)}
            title="Step Into (F11)"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Divider */}
      {isDebugging && (
        <div className="w-px h-5 bg-gray-600 mx-1" />
      )}

      {/* Status section */}
      <div className="flex items-center gap-2 ml-2 text-xs">
        {isDebugging && (
          <>
            {/* Debug indicator */}
            <div className="flex items-center gap-1">
              <Circle
                className={`w-2 h-2 ${isPaused ? 'fill-yellow-500 text-yellow-500' : 'fill-green-500 text-green-500'}`}
              />
              <span className={isPaused ? 'text-yellow-400' : 'text-green-400'}>
                {isPaused ? 'Paused' : 'Running'}
              </span>
            </div>

            {/* Current line */}
            {currentLine !== null && (
              <span className="text-gray-400">
                Line {currentLine}
              </span>
            )}

            {/* Breakpoints count */}
            {breakpoints.size > 0 && (
              <span className="text-gray-500">
                {breakpoints.size} breakpoint{breakpoints.size !== 1 ? 's' : ''}
              </span>
            )}
          </>
        )}

        {isRunning && !isDebugging && (
          <div className="flex items-center gap-1">
            <Circle className="w-2 h-2 fill-green-500 text-green-500" />
            <span className="text-green-400">Running</span>
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
  onRun: () => void;
  onDebug: () => void;
  onStop: () => void;
  className?: string;
}) {
  const { isDebugging } = debugState;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {!isRunning && !isDebugging ? (
        <>
          <button
            onClick={onRun}
            className="p-1 rounded text-green-400 hover:bg-gray-700"
            title="Run (F5)"
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            onClick={onDebug}
            className="p-1 rounded text-orange-400 hover:bg-gray-700"
            title="Debug (F9)"
          >
            <Bug className="w-4 h-4" />
          </button>
        </>
      ) : (
        <button
          onClick={onStop}
          className="p-1 rounded text-red-400 hover:bg-gray-700"
          title="Stop (Shift+F5)"
        >
          <Square className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
