import { useState, useCallback, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

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
  const [breakpointsMuted, setBreakpointsMuted] = useState(false);

  // Execution data
  const [variables, setVariables] = useState<DebugVariable[]>([]);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);

  // Call stack
  const [callStack, setCallStack] = useState<DebugFrame[]>([]);

  // Ref to track if component is mounted
  const isMounted = useRef(true);
  // Track active execution independently so we don't miss early events
  const activeExecutionIdRef = useRef<string | null>(executionId);
  activeExecutionIdRef.current = executionId;

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Setup socket listeners
  useEffect(() => {
    if (!socket) return;

    // Step before event
    const handleStepBefore = (data: {
      executionId: string;
      line: number;
      action: string;
      target?: string;
    }) => {
      if (data.executionId !== activeExecutionIdRef.current || !isMounted.current) return;

      setCurrentLine(data.line);

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
      if (data.executionId !== activeExecutionIdRef.current || !isMounted.current) return;

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
      if (data.executionId !== activeExecutionIdRef.current || !isMounted.current) return;

      setIsPaused(true);
      setCurrentLine(data.line);

      addConsoleEntry({
        type: 'info',
        line: data.line,
        message: `Paused at line ${data.line}`,
        status: 'paused',
      });
    };

    // Resumed event
    const handleResumed = (data: { executionId: string }) => {
      if (data.executionId !== activeExecutionIdRef.current || !isMounted.current) return;
      setIsPaused(false);
    };

    // Variable event
    const handleVariable = (data: {
      executionId: string;
      name: string;
      value: any;
    }) => {
      if (data.executionId !== activeExecutionIdRef.current || !isMounted.current) return;

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
      if (data.executionId !== activeExecutionIdRef.current || !isMounted.current) return;

      addConsoleEntry({
        type: data.level === 'warn' ? 'warning' : data.level,
        message: data.message,
      });
    };

    // Complete event
    const handleComplete = (data: {
      executionId: string;
      exitCode: number;
      duration: number;
    }) => {
      if (data.executionId !== activeExecutionIdRef.current || !isMounted.current) return;

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
      if (data.executionId !== activeExecutionIdRef.current || !isMounted.current) return;

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
    socket.on('debug:complete', handleComplete);
    socket.on('debug:stopped', handleStopped);

    return () => {
      socket.off('debug:step:before', handleStepBefore);
      socket.off('debug:step:after', handleStepAfter);
      socket.off('debug:paused', handlePaused);
      socket.off('debug:resumed', handleResumed);
      socket.off('debug:variable', handleVariable);
      socket.off('debug:log', handleDebugLog);
      socket.off('debug:complete', handleComplete);
      socket.off('debug:stopped', handleStopped);
    };
  }, [socket]);

  // Helper to add console entry
  const addConsoleEntry = useCallback((entry: Omit<ConsoleEntry, 'timestamp'>) => {
    setConsoleEntries(prev => [...prev, { ...entry, timestamp: new Date() }]);
  }, []);

  // Backend currently accepts line numbers only.
  const serializeBreakpointLines = (bpSet: Set<number>) =>
    Array.from(bpSet)
      .filter((line) => Number.isFinite(line))
      .sort((a, b) => a - b);

  // Toggle breakpoint
  const toggleBreakpoint = useCallback((line: number) => {
    setBreakpoints(prev => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);

      // If debugging, send update to server with correct conditions
      const activeExecutionId = activeExecutionIdRef.current;
      if (socket && activeExecutionId && isDebugging && !breakpointsMuted) {
        socket.emit('debug:set-breakpoints', {
          executionId: activeExecutionId,
          breakpoints: serializeBreakpointLines(next),
        });
      }

      return next;
    });
  }, [socket, isDebugging, breakpointsMuted]);

  // Toggle mute all breakpoints
  const toggleMuteBreakpoints = useCallback(() => {
    setBreakpointsMuted(prev => {
      const newMuted = !prev;
      // If debugging, send the updated breakpoints (empty when muted)
      const activeExecutionId = activeExecutionIdRef.current;
      if (socket && activeExecutionId && isDebugging) {
        socket.emit('debug:set-breakpoints', {
          executionId: activeExecutionId,
          breakpoints: newMuted ? [] : serializeBreakpointLines(breakpoints),
        });
      }
      return newMuted;
    });
  }, [socket, isDebugging, breakpoints]);

  // Start debug session
  const startDebug = useCallback((
    testFlowId: string,
    code: string,
    newExecutionId: string,
    projectId?: string,
    socketOverride?: Socket | null
  ) => {
    const activeSocket = socketOverride ?? socket;
    if (!activeSocket) return;
    activeExecutionIdRef.current = newExecutionId;

    // Reset state
    setIsDebugging(true);
    setIsPaused(false);
    setCurrentLine(null);
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
    activeSocket.emit('debug:start', {
      executionId: newExecutionId,
      testFlowId,
      code,
      breakpoints: breakpointsMuted ? [] : serializeBreakpointLines(breakpoints),
      projectId,
    });
  }, [socket, breakpoints, breakpointsMuted, addConsoleEntry]);

  // Helper: emit a debug command with the current executionId
  const emitDebugCommand = useCallback((event: string) => {
    const activeExecutionId = activeExecutionIdRef.current;
    if (!socket || !activeExecutionId) return;
    socket.emit(event, { executionId: activeExecutionId });
  }, [socket]);

  const resume = useCallback(() => emitDebugCommand('debug:resume'), [emitDebugCommand]);
  const stepOver = useCallback(() => emitDebugCommand('debug:step-over'), [emitDebugCommand]);
  const stepInto = useCallback(() => emitDebugCommand('debug:step-into'), [emitDebugCommand]);
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
    callStack,

    // Actions
    toggleBreakpoint,
    toggleMuteBreakpoints,
    startDebug,
    resume,
    stepOver,
    stepInto,
    stopDebug,
    clearConsole,
  };
}
