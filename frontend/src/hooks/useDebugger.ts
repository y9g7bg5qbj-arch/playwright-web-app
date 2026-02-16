import { useState, useCallback, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

/**
 * Debug step information
 */
export interface DebugStep {
  line: number;
  action: string;
  target?: string;
  status: 'pending' | 'running' | 'success' | 'failure' | 'paused';
  duration?: number;
  error?: string;
  timestamp: Date;
}

/**
 * Debug variable
 */
export interface DebugVariable {
  name: string;
  value: any;
  type: string;
}

/**
 * Console log entry
 */
export interface ConsoleEntry {
  timestamp: Date;
  type: 'step' | 'log' | 'error' | 'warning' | 'info';
  line?: number;
  action?: string;
  message: string;
  duration?: number;
  status?: 'running' | 'success' | 'failure' | 'paused';
}

/**
 * Breakpoint with optional condition
 */
export interface Breakpoint {
  line: number;
  condition?: string;  // JavaScript expression that must be true to pause
  hitCount?: number;   // Number of times the breakpoint has been hit
  logMessage?: string; // Log message instead of pausing (tracepoint)
  enabled: boolean;
}

/**
 * Watch expression with evaluated value
 */
export interface WatchExpression {
  id: string;
  expression: string;
  value?: any;
  type?: string;
  error?: string;
}

/**
 * Debug frame (call stack entry)
 */
export interface DebugFrame {
  id: string;
  name: string;
  type: 'feature' | 'scenario' | 'action' | 'step';
  line: number;
  file?: string;
  isCurrent?: boolean;
}

/**
 * Debug state
 */
export interface DebugState {
  isDebugging: boolean;
  isPaused: boolean;
  currentLine: number | null;
  breakpoints: Set<number>;
}

/**
 * useDebugger hook for managing debug state and communication
 */
export function useDebugger(socket: Socket | null, executionId: string | null) {
  // Debug state
  const [isDebugging, setIsDebugging] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLine, setCurrentLine] = useState<number | null>(null);
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
  const [breakpointConditions, setBreakpointConditions] = useState<Map<number, Breakpoint>>(new Map());
  const [breakpointsMuted, setBreakpointsMuted] = useState(false);

  // Execution data
  const [_steps, setSteps] = useState<DebugStep[]>([]);
  const [variables, setVariables] = useState<DebugVariable[]>([]);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);

  // Watch expressions
  const [watches, setWatches] = useState<WatchExpression[]>([]);
  const watchIdCounter = useRef(0);

  // Call stack
  const [callStack, setCallStack] = useState<DebugFrame[]>([]);

  // Ref to track if component is mounted
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Setup socket listeners
  useEffect(() => {
    if (!socket || !executionId) return;

    // Step before event
    const handleStepBefore = (data: {
      executionId: string;
      line: number;
      action: string;
      target?: string;
    }) => {
      if (data.executionId !== executionId || !isMounted.current) return;

      setCurrentLine(data.line);
      setSteps(prev => [...prev, {
        line: data.line,
        action: data.action,
        target: data.target,
        status: 'running',
        timestamp: new Date(),
      }]);

      // Update call stack - add current action as the top frame
      setCallStack(prev => {
        // Keep feature/scenario frames, update the action frame
        const baseFrames = prev.filter(f => f.type === 'feature' || f.type === 'scenario');
        return [
          ...baseFrames,
          {
            id: `action-${data.line}`,
            name: `${data.action}${data.target ? `: ${data.target}` : ''}`,
            type: 'action' as const,
            line: data.line,
            isCurrent: true,
          },
        ];
      });

      addConsoleEntry({
        type: 'step',
        line: data.line,
        action: data.action,
        message: `${data.action}${data.target ? ` "${data.target}"` : ''}`,
        status: 'running',
      });
    };

    // Step after event
    const handleStepAfter = (data: {
      executionId: string;
      line: number;
      action: string;
      success?: boolean;
      duration?: number;
      error?: string;
    }) => {
      if (data.executionId !== executionId || !isMounted.current) return;

      setSteps(prev => prev.map(step =>
        step.line === data.line && step.status === 'running'
          ? {
              ...step,
              status: data.success ? 'success' : 'failure',
              duration: data.duration,
              error: data.error,
            }
          : step
      ));

      // Update last console entry
      setConsoleEntries(prev => {
        const lastIdx = prev.findIndex(e => e.line === data.line && e.status === 'running');
        if (lastIdx !== -1) {
          const updated = [...prev];
          updated[lastIdx] = {
            ...updated[lastIdx],
            status: data.success ? 'success' : 'failure',
            duration: data.duration,
          };
          return updated;
        }
        return prev;
      });
    };

    // Paused event
    const handlePaused = (data: { executionId: string; line: number }) => {
      if (data.executionId !== executionId || !isMounted.current) return;

      setIsPaused(true);
      setCurrentLine(data.line);

      // Update step status
      setSteps(prev => prev.map(step =>
        step.line === data.line && step.status === 'running'
          ? { ...step, status: 'paused' }
          : step
      ));

      addConsoleEntry({
        type: 'info',
        line: data.line,
        message: `Paused at line ${data.line}`,
        status: 'paused',
      });
    };

    // Resumed event
    const handleResumed = (data: { executionId: string }) => {
      if (data.executionId !== executionId || !isMounted.current) return;
      setIsPaused(false);
    };

    // Variable event
    const handleVariable = (data: {
      executionId: string;
      name: string;
      value: any;
    }) => {
      if (data.executionId !== executionId || !isMounted.current) return;

      const type = typeof data.value;
      setVariables(prev => {
        const existing = prev.findIndex(v => v.name === data.name);
        if (existing !== -1) {
          const updated = [...prev];
          updated[existing] = { name: data.name, value: data.value, type };
          return updated;
        }
        return [...prev, { name: data.name, value: data.value, type }];
      });
    };

    // Log event
    const handleDebugLog = (data: {
      executionId: string;
      message: string;
      level: 'info' | 'warn' | 'error';
    }) => {
      if (data.executionId !== executionId || !isMounted.current) return;

      addConsoleEntry({
        type: data.level === 'warn' ? 'warning' : data.level,
        message: data.message,
      });
    };

    // Watch expression evaluated event
    const handleEvaluated = (data: {
      executionId: string;
      watchId: string;
      value?: any;
      error?: string;
    }) => {
      if (data.executionId !== executionId || !isMounted.current) return;

      setWatches(prev => prev.map(watch =>
        watch.id === data.watchId
          ? {
              ...watch,
              value: data.value,
              type: data.error ? undefined : typeof data.value,
              error: data.error,
            }
          : watch
      ));
    };

    // Complete event
    const handleComplete = (data: {
      executionId: string;
      exitCode: number;
      duration: number;
    }) => {
      if (data.executionId !== executionId || !isMounted.current) return;

      setIsDebugging(false);
      setIsPaused(false);
      setCurrentLine(null);

      addConsoleEntry({
        type: data.exitCode === 0 ? 'info' : 'error',
        message: `Debug session completed with exit code ${data.exitCode} (${data.duration}ms)`,
      });
    };

    // Stopped event
    const handleStopped = (data: { executionId: string }) => {
      if (data.executionId !== executionId || !isMounted.current) return;

      setIsDebugging(false);
      setIsPaused(false);
      setCurrentLine(null);

      addConsoleEntry({
        type: 'warning',
        message: 'Debug session stopped by user',
      });
    };

    // Register listeners
    socket.on('debug:step:before', handleStepBefore);
    socket.on('debug:step:after', handleStepAfter);
    socket.on('debug:paused', handlePaused);
    socket.on('debug:resumed', handleResumed);
    socket.on('debug:variable', handleVariable);
    socket.on('debug:log', handleDebugLog);
    socket.on('debug:evaluated', handleEvaluated);
    socket.on('debug:complete', handleComplete);
    socket.on('debug:stopped', handleStopped);

    return () => {
      socket.off('debug:step:before', handleStepBefore);
      socket.off('debug:step:after', handleStepAfter);
      socket.off('debug:paused', handlePaused);
      socket.off('debug:resumed', handleResumed);
      socket.off('debug:variable', handleVariable);
      socket.off('debug:log', handleDebugLog);
      socket.off('debug:evaluated', handleEvaluated);
      socket.off('debug:complete', handleComplete);
      socket.off('debug:stopped', handleStopped);
    };
  }, [socket, executionId]);

  // Helper to add console entry
  const addConsoleEntry = useCallback((entry: Omit<ConsoleEntry, 'timestamp'>) => {
    setConsoleEntries(prev => [...prev, { ...entry, timestamp: new Date() }]);
  }, []);

  // Helper to serialize breakpoints with conditions for socket emission
  const serializeBreakpoints = (
    bpSet: Set<number>,
    conditionsMap: Map<number, Breakpoint>
  ) => Array.from(bpSet).map(line => ({
    line,
    condition: conditionsMap.get(line)?.condition,
    logMessage: conditionsMap.get(line)?.logMessage,
  }));

  // Toggle breakpoint
  const toggleBreakpoint = useCallback((line: number) => {
    setBreakpoints(prev => {
      const next = new Set(prev);
      let nextConditions = breakpointConditions;

      if (next.has(line)) {
        next.delete(line);
        // Compute updated conditions synchronously to avoid stale closure
        nextConditions = new Map(breakpointConditions);
        nextConditions.delete(line);
        setBreakpointConditions(nextConditions);
      } else {
        next.add(line);
      }

      // If debugging, send update to server with correct conditions
      if (socket && executionId && isDebugging && !breakpointsMuted) {
        socket.emit('debug:set-breakpoints', {
          executionId,
          breakpoints: serializeBreakpoints(next, nextConditions),
        });
      }

      return next;
    });
  }, [socket, executionId, isDebugging, breakpointsMuted, breakpointConditions]);

  // Toggle mute all breakpoints
  const toggleMuteBreakpoints = useCallback(() => {
    setBreakpointsMuted(prev => {
      const newMuted = !prev;
      // If debugging, send the updated breakpoints (empty when muted)
      if (socket && executionId && isDebugging) {
        socket.emit('debug:set-breakpoints', {
          executionId,
          breakpoints: newMuted ? [] : serializeBreakpoints(breakpoints, breakpointConditions),
        });
      }
      return newMuted;
    });
  }, [socket, executionId, isDebugging, breakpoints, breakpointConditions]);

  // Add a watch expression
  const addWatch = useCallback((expression: string) => {
    if (!expression.trim()) return;

    const id = `watch-${++watchIdCounter.current}`;
    const newWatch: WatchExpression = {
      id,
      expression: expression.trim(),
    };

    setWatches(prev => [...prev, newWatch]);

    // If paused, immediately evaluate the new watch
    if (socket && executionId && isPaused) {
      socket.emit('debug:evaluate', {
        executionId,
        watchId: id,
        expression: expression.trim(),
      });
    }
  }, [socket, executionId, isPaused]);

  // Remove a watch expression
  const removeWatch = useCallback((watchId: string) => {
    setWatches(prev => prev.filter(w => w.id !== watchId));
  }, []);

  // Start debug session
  const startDebug = useCallback((
    testFlowId: string,
    code: string,
    newExecutionId: string,
    scenarioName?: string,
    projectId?: string
  ) => {
    if (!socket) return;

    // Reset state
    setIsDebugging(true);
    setIsPaused(false);
    setCurrentLine(null);
    setSteps([]);
    setVariables([]);
    setConsoleEntries([]);
    // Initialize call stack with test execution frame
    setCallStack([
      {
        id: 'test-execution',
        name: 'Test Execution',
        type: 'feature',
        line: 1,
      },
    ]);

    addConsoleEntry({
      type: 'info',
      message: 'Starting debug session...',
    });

    // Send debug start with conditions (empty breakpoints if muted)
    socket.emit('debug:start', {
      executionId: newExecutionId,
      testFlowId,
      code,
      breakpoints: breakpointsMuted ? [] : serializeBreakpoints(breakpoints, breakpointConditions),
      scenarioName,
      projectId,
    });
  }, [socket, breakpoints, breakpointsMuted, breakpointConditions, addConsoleEntry]);

  // Helper: emit a debug command with the current executionId
  const emitDebugCommand = useCallback((event: string) => {
    if (!socket || !executionId) return;
    socket.emit(event, { executionId });
  }, [socket, executionId]);

  const resume = useCallback(() => emitDebugCommand('debug:resume'), [emitDebugCommand]);
  const stepOver = useCallback(() => emitDebugCommand('debug:step-over'), [emitDebugCommand]);
  const stepInto = useCallback(() => emitDebugCommand('debug:step-into'), [emitDebugCommand]);
  const stepOut = useCallback(() => emitDebugCommand('debug:step-out'), [emitDebugCommand]);
  const pause = useCallback(() => emitDebugCommand('debug:pause'), [emitDebugCommand]);
  const openInspector = useCallback(() => emitDebugCommand('debug:inspect'), [emitDebugCommand]);
  const stopDebug = useCallback(() => emitDebugCommand('debug:stop'), [emitDebugCommand]);

  // Clear console
  const clearConsole = useCallback(() => {
    setConsoleEntries([]);
  }, []);

  return {
    // State
    debugState: {
      isDebugging,
      isPaused,
      currentLine,
      breakpoints,
    } as DebugState,
    breakpointsMuted,
    variables,
    consoleEntries,
    watches,
    callStack,

    // Actions
    toggleBreakpoint,
    toggleMuteBreakpoints,
    addWatch,
    removeWatch,
    startDebug,
    resume,
    pause,
    stepOver,
    stepInto,
    stepOut,
    stopDebug,
    openInspector,
    clearConsole,
  };
}
