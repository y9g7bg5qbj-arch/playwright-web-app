/**
 * useAIRecorder Hook
 *
 * Combines REST API + WebSocket for real-time AI Test Recorder functionality.
 *
 * Features:
 * - Create sessions with test cases
 * - Start processing with parallel execution
 * - Real-time progress updates via WebSocket
 * - Step retry notifications
 * - Human review playback
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import * as aiRecorderApi from '@/api/aiRecorder';
import type {
  TestCaseInput,
  SessionProgress,
} from '@/api/aiRecorder';

// ============================================
// Types
// ============================================

export interface StepProgress {
  stepId: string;
  stepNumber: number;
  description: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'needs_review';
  veroCode: string | null;
  retryCount: number;
  error?: string;
}

export interface TestCaseProgress {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'complete' | 'human_review' | 'failed';
  steps: StepProgress[];
}

export interface SessionState {
  sessionId: string | null;
  status: 'idle' | 'pending' | 'processing' | 'human_review' | 'complete' | 'failed' | 'cancelled';
  totalTests: number;
  completedTests: number;
  failedTests: number;
  testCases: TestCaseProgress[];
  error: string | null;
}

interface UseAIRecorderReturn {
  // State
  session: SessionState;
  isConnected: boolean;
  isProcessing: boolean;
  isComplete: boolean;

  // Actions
  importExcel: (file: File) => Promise<TestCaseInput[]>;
  createAndStart: (testCases: TestCaseInput[], options?: {
    environment?: string;
    baseUrl?: string;
    applicationId?: string;
  }) => Promise<void>;
  cancelSession: () => Promise<void>;
  refreshProgress: () => Promise<void>;

  // Human Review
  replayStep: (testCaseId: string, stepId: string) => void;
  updateStepCode: (stepId: string, veroCode: string) => Promise<void>;
  addStep: (testCaseId: string, afterStepNumber: number, description: string) => Promise<void>;
  deleteStep: (stepId: string) => Promise<void>;
  approveTestCase: (testCaseId: string, targetPath: string) => Promise<string>;

  // Reset
  reset: () => void;
}

// ============================================
// Hook Implementation
// ============================================

export function useAIRecorder(): UseAIRecorderReturn {
  const { socket, isConnected } = useWebSocket();

  const [session, setSession] = useState<SessionState>({
    sessionId: null,
    status: 'idle',
    totalTests: 0,
    completedTests: 0,
    failedTests: 0,
    testCases: [],
    error: null,
  });

  const sessionIdRef = useRef<string | null>(null);

  // Computed values
  const isProcessing = session.status === 'processing';
  const isComplete = session.status === 'complete' || session.status === 'human_review';

  // ----------------------------------------
  // WebSocket Event Handlers
  // ----------------------------------------

  useEffect(() => {
    if (!socket) return;

    // Cast socket for AI Recorder events (not in shared types)
    const aiSocket = socket as any;

    // Subscribe to session when we have one
    if (session.sessionId && !sessionIdRef.current) {
      sessionIdRef.current = session.sessionId;
      aiSocket.emit('aiRecorder:subscribe', { sessionId: session.sessionId });
    }

    // Session events
    const handleSessionStarted = (data: { sessionId: string }) => {
      if (data.sessionId === session.sessionId) {
        setSession((prev) => ({ ...prev, status: 'processing' }));
      }
    };

    const handleSessionCompleted = (data: { sessionId: string }) => {
      if (data.sessionId === session.sessionId) {
        setSession((prev) => ({ ...prev, status: 'human_review' }));
      }
    };

    const handleSessionFailed = (data: { sessionId: string; error: string }) => {
      if (data.sessionId === session.sessionId) {
        setSession((prev) => ({ ...prev, status: 'failed', error: data.error }));
      }
    };

    const handleSessionCancelled = (data: { sessionId: string }) => {
      if (data.sessionId === session.sessionId) {
        setSession((prev) => ({ ...prev, status: 'cancelled' }));
      }
    };

    const handleSessionProgress = (data: SessionProgress) => {
      if (data.sessionId === session.sessionId) {
        setSession((prev) => ({
          ...prev,
          status: data.status as any,
          totalTests: data.totalTests,
          completedTests: data.completedTests,
          failedTests: data.failedTests,
          testCases: data.testCases.map((tc) => ({
            id: tc.id,
            name: tc.name,
            status: tc.status as any,
            steps: tc.steps.map((s) => ({
              stepId: s.id,
              stepNumber: s.stepNumber,
              description: s.description,
              status: s.status as any,
              veroCode: s.veroCode,
              retryCount: s.retryCount,
            })),
          })),
        }));
      }
    };

    // Test case events
    const handleTestCaseStarted = (data: { sessionId: string; testCaseId: string; name: string }) => {
      if (data.sessionId === session.sessionId) {
        setSession((prev) => ({
          ...prev,
          testCases: prev.testCases.map((tc) =>
            tc.id === data.testCaseId ? { ...tc, status: 'in_progress' as const } : tc
          ),
        }));
      }
    };

    const handleTestCaseCompleted = (data: { sessionId: string; testCaseId: string; status: string }) => {
      if (data.sessionId === session.sessionId) {
        setSession((prev) => ({
          ...prev,
          completedTests: prev.completedTests + 1,
          testCases: prev.testCases.map((tc) =>
            tc.id === data.testCaseId ? { ...tc, status: data.status as any } : tc
          ),
        }));
      }
    };

    const handleTestCaseFailed = (data: { sessionId: string; testCaseId: string; error: string }) => {
      if (data.sessionId === session.sessionId) {
        setSession((prev) => ({
          ...prev,
          completedTests: prev.completedTests + 1,
          failedTests: prev.failedTests + 1,
          testCases: prev.testCases.map((tc) =>
            tc.id === data.testCaseId ? { ...tc, status: 'failed' as const } : tc
          ),
        }));
      }
    };

    // Step events
    const handleStepStarted = (data: {
      sessionId: string;
      testCaseId: string;
      stepId: string;
      stepNumber: number;
      description: string;
    }) => {
      if (data.sessionId === session.sessionId) {
        setSession((prev) => ({
          ...prev,
          testCases: prev.testCases.map((tc) =>
            tc.id === data.testCaseId
              ? {
                  ...tc,
                  steps: tc.steps.map((s) =>
                    s.stepId === data.stepId ? { ...s, status: 'running' as const } : s
                  ),
                }
              : tc
          ),
        }));
      }
    };

    const handleStepRetry = (data: {
      sessionId: string;
      testCaseId: string;
      stepId: string;
      attempt: number;
      maxAttempts: number;
    }) => {
      if (data.sessionId === session.sessionId) {
        setSession((prev) => ({
          ...prev,
          testCases: prev.testCases.map((tc) =>
            tc.id === data.testCaseId
              ? {
                  ...tc,
                  steps: tc.steps.map((s) =>
                    s.stepId === data.stepId ? { ...s, retryCount: data.attempt } : s
                  ),
                }
              : tc
          ),
        }));
      }
    };

    const handleStepCompleted = (data: {
      sessionId: string;
      testCaseId: string;
      stepId: string;
      success: boolean;
      veroCode?: string;
      retryCount: number;
      error?: string;
    }) => {
      if (data.sessionId === session.sessionId) {
        setSession((prev) => ({
          ...prev,
          testCases: prev.testCases.map((tc) =>
            tc.id === data.testCaseId
              ? {
                  ...tc,
                  steps: tc.steps.map((s) =>
                    s.stepId === data.stepId
                      ? {
                          ...s,
                          status: data.success ? ('success' as const) : ('needs_review' as const),
                          veroCode: data.veroCode || s.veroCode,
                          retryCount: data.retryCount,
                          error: data.error,
                        }
                      : s
                  ),
                }
              : tc
          ),
        }));
      }
    };

    // Error handler
    const handleError = (data: { error: string; sessionId?: string }) => {
      if (!data.sessionId || data.sessionId === session.sessionId) {
        setSession((prev) => ({ ...prev, error: data.error }));
      }
    };

    // Register event listeners
    aiSocket.on('aiRecorder:session:started', handleSessionStarted);
    aiSocket.on('aiRecorder:session:completed', handleSessionCompleted);
    aiSocket.on('aiRecorder:session:failed', handleSessionFailed);
    aiSocket.on('aiRecorder:session:cancelled', handleSessionCancelled);
    aiSocket.on('aiRecorder:session:progress', handleSessionProgress);
    aiSocket.on('aiRecorder:testCase:started', handleTestCaseStarted);
    aiSocket.on('aiRecorder:testCase:completed', handleTestCaseCompleted);
    aiSocket.on('aiRecorder:testCase:failed', handleTestCaseFailed);
    aiSocket.on('aiRecorder:step:started', handleStepStarted);
    aiSocket.on('aiRecorder:step:retry', handleStepRetry);
    aiSocket.on('aiRecorder:step:completed', handleStepCompleted);
    aiSocket.on('aiRecorder:error', handleError);

    return () => {
      aiSocket.off('aiRecorder:session:started', handleSessionStarted);
      aiSocket.off('aiRecorder:session:completed', handleSessionCompleted);
      aiSocket.off('aiRecorder:session:failed', handleSessionFailed);
      aiSocket.off('aiRecorder:session:cancelled', handleSessionCancelled);
      aiSocket.off('aiRecorder:session:progress', handleSessionProgress);
      aiSocket.off('aiRecorder:testCase:started', handleTestCaseStarted);
      aiSocket.off('aiRecorder:testCase:completed', handleTestCaseCompleted);
      aiSocket.off('aiRecorder:testCase:failed', handleTestCaseFailed);
      aiSocket.off('aiRecorder:step:started', handleStepStarted);
      aiSocket.off('aiRecorder:step:retry', handleStepRetry);
      aiSocket.off('aiRecorder:step:completed', handleStepCompleted);
      aiSocket.off('aiRecorder:error', handleError);

      // Unsubscribe from session
      if (sessionIdRef.current) {
        aiSocket.emit('aiRecorder:unsubscribe', { sessionId: sessionIdRef.current });
        sessionIdRef.current = null;
      }
    };
  }, [socket, session.sessionId]);

  // ----------------------------------------
  // Actions
  // ----------------------------------------

  const importExcel = useCallback(async (file: File): Promise<TestCaseInput[]> => {
    const { testCases } = await aiRecorderApi.importExcel(file);
    return testCases;
  }, []);

  const createAndStart = useCallback(
    async (
      testCases: TestCaseInput[],
      options?: {
        environment?: string;
        baseUrl?: string;
        applicationId?: string;
      }
    ) => {
      try {
        setSession((prev) => ({ ...prev, status: 'pending', error: null }));

        // Create session
        const sessionId = await aiRecorderApi.createSession({
          testCases,
          ...options,
        });

        // Update state with initial test cases
        setSession((prev) => ({
          ...prev,
          sessionId,
          totalTests: testCases.length,
          testCases: testCases.map((tc, i) => ({
            id: `pending-${i}`, // Will be replaced with real IDs from WebSocket
            name: tc.name,
            status: 'pending' as const,
            steps: tc.steps.map((step, j) => ({
              stepId: `pending-${i}-${j}`,
              stepNumber: j + 1,
              description: step,
              status: 'pending' as const,
              veroCode: null,
              retryCount: 0,
            })),
          })),
        }));

        // Subscribe to WebSocket updates
        if (socket) {
          (socket as any).emit('aiRecorder:subscribe', { sessionId });
        }

        // Start processing
        await aiRecorderApi.startSession(sessionId);

        setSession((prev) => ({ ...prev, status: 'processing' }));
      } catch (error: any) {
        setSession((prev) => ({
          ...prev,
          status: 'failed',
          error: error.message || 'Failed to start session',
        }));
        throw error;
      }
    },
    [socket]
  );

  const cancelSession = useCallback(async () => {
    if (!session.sessionId) return;

    try {
      await aiRecorderApi.cancelSession(session.sessionId);
      setSession((prev) => ({ ...prev, status: 'cancelled' }));
    } catch (error: any) {
      setSession((prev) => ({ ...prev, error: error.message }));
    }
  }, [session.sessionId]);

  const refreshProgress = useCallback(async () => {
    if (!session.sessionId) return;

    try {
      const progress = await aiRecorderApi.getSessionProgress(session.sessionId);
      setSession((prev) => ({
        ...prev,
        status: progress.status as any,
        totalTests: progress.totalTests,
        completedTests: progress.completedTests,
        failedTests: progress.failedTests,
        testCases: progress.testCases.map((tc) => ({
          id: tc.id,
          name: tc.name,
          status: tc.status as any,
          steps: tc.steps.map((s) => ({
            stepId: s.id,
            stepNumber: s.stepNumber,
            description: s.description,
            status: s.status as any,
            veroCode: s.veroCode,
            retryCount: s.retryCount,
          })),
        })),
      }));
    } catch (error: any) {
      setSession((prev) => ({ ...prev, error: error.message }));
    }
  }, [session.sessionId]);

  // ----------------------------------------
  // Human Review Actions
  // ----------------------------------------

  const replayStep = useCallback(
    (testCaseId: string, stepId: string) => {
      if (!socket || !session.sessionId) return;

      (socket as any).emit('aiRecorder:replayStep', {
        sessionId: session.sessionId,
        testCaseId,
        stepId,
      });
    },
    [socket, session.sessionId]
  );

  const updateStepCode = useCallback(async (stepId: string, veroCode: string) => {
    await aiRecorderApi.updateStep(stepId, veroCode);

    // Update local state
    setSession((prev) => ({
      ...prev,
      testCases: prev.testCases.map((tc) => ({
        ...tc,
        steps: tc.steps.map((s) => (s.stepId === stepId ? { ...s, veroCode } : s)),
      })),
    }));
  }, []);

  const addStep = useCallback(
    async (testCaseId: string, afterStepNumber: number, description: string) => {
      await aiRecorderApi.addStep(testCaseId, afterStepNumber, description);

      // Refresh to get updated step list
      await refreshProgress();
    },
    [refreshProgress]
  );

  const deleteStep = useCallback(
    async (stepId: string) => {
      await aiRecorderApi.deleteStep(stepId);

      // Remove from local state
      setSession((prev) => ({
        ...prev,
        testCases: prev.testCases.map((tc) => ({
          ...tc,
          steps: tc.steps.filter((s) => s.stepId !== stepId),
        })),
      }));
    },
    []
  );

  const approveTestCase = useCallback(async (testCaseId: string, targetPath: string): Promise<string> => {
    const filePath = await aiRecorderApi.approveTestCase(testCaseId, targetPath);

    // Update local state
    setSession((prev) => ({
      ...prev,
      testCases: prev.testCases.map((tc) =>
        tc.id === testCaseId ? { ...tc, status: 'complete' as const } : tc
      ),
    }));

    return filePath;
  }, []);

  const reset = useCallback(() => {
    if (socket && sessionIdRef.current) {
      (socket as any).emit('aiRecorder:unsubscribe', { sessionId: sessionIdRef.current });
    }
    sessionIdRef.current = null;

    setSession({
      sessionId: null,
      status: 'idle',
      totalTests: 0,
      completedTests: 0,
      failedTests: 0,
      testCases: [],
      error: null,
    });
  }, [socket]);

  return {
    session,
    isConnected,
    isProcessing,
    isComplete,
    importExcel,
    createAndStart,
    cancelSession,
    refreshProgress,
    replayStep,
    updateStepCode,
    addStep,
    deleteStep,
    approveTestCase,
    reset,
  };
}

export type { TestCaseInput };
