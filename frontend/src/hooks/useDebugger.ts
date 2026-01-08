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

  // Execution data
  const [steps, setSteps] = useState<DebugStep[]>([]);
  const [variables, setVariables] = useState<DebugVariable[]>([]);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);

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
  }, [socket, executionId]);

  // Helper to add console entry
  const addConsoleEntry = useCallback((entry: Omit<ConsoleEntry, 'timestamp'>) => {
    setConsoleEntries(prev => [...prev, { ...entry, timestamp: new Date() }]);
  }, []);

  // Toggle breakpoint
  const toggleBreakpoint = useCallback((line: number) => {
    setBreakpoints(prev => {
      const next = new Set(prev);
      if (next.has(line)) {
        next.delete(line);
      } else {
        next.add(line);
      }

      // If debugging, send update to server
      if (socket && executionId && isDebugging) {
        socket.emit('debug:set-breakpoints', {
          executionId,
          breakpoints: Array.from(next),
        });
      }

      return next;
    });
  }, [socket, executionId, isDebugging]);

  // Clear all breakpoints
  const clearBreakpoints = useCallback(() => {
    setBreakpoints(new Set());
    if (socket && executionId && isDebugging) {
      socket.emit('debug:set-breakpoints', {
        executionId,
        breakpoints: [],
      });
    }
  }, [socket, executionId, isDebugging]);

  // Start debug session
  const startDebug = useCallback((
    testFlowId: string,
    code: string,
    newExecutionId: string
  ) => {
    if (!socket) return;

    // Reset state
    setIsDebugging(true);
    setIsPaused(false);
    setCurrentLine(null);
    setSteps([]);
    setVariables([]);
    setConsoleEntries([]);

    addConsoleEntry({
      type: 'info',
      message: 'Starting debug session...',
    });

    // Send debug start
    socket.emit('debug:start', {
      executionId: newExecutionId,
      testFlowId,
      code,
      breakpoints: Array.from(breakpoints),
    });
  }, [socket, breakpoints, addConsoleEntry]);

  // Resume execution
  const resume = useCallback(() => {
    if (!socket || !executionId) return;
    socket.emit('debug:resume', { executionId });
  }, [socket, executionId]);

  // Step over
  const stepOver = useCallback(() => {
    if (!socket || !executionId) return;
    socket.emit('debug:step-over', { executionId });
  }, [socket, executionId]);

  // Step into
  const stepInto = useCallback(() => {
    if (!socket || !executionId) return;
    socket.emit('debug:step-into', { executionId });
  }, [socket, executionId]);

  // Stop debug session
  const stopDebug = useCallback(() => {
    if (!socket || !executionId) return;
    socket.emit('debug:stop', { executionId });
  }, [socket, executionId]);

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
    steps,
    variables,
    consoleEntries,

    // Actions
    toggleBreakpoint,
    clearBreakpoints,
    startDebug,
    resume,
    stepOver,
    stepInto,
    stopDebug,
    clearConsole,
  };
}
