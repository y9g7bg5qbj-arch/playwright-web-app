/**
 * GitHub Execution Store
 * Tracks GitHub Actions executions and their results
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GitHubExecutionStep {
  id: string;
  stepNumber: number;
  action: string;
  status: 'passed' | 'failed' | 'skipped' | 'running' | 'pending';
  duration?: number;
  error?: string;
  screenshot?: string;
}

export interface GitHubExecutionScenario {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'running' | 'pending';
  duration?: number;
  error?: string;
  traceUrl?: string;
  screenshot?: string;
  steps?: GitHubExecutionStep[];
}

export interface GitHubReportFetchMeta {
  status: 'pending' | 'failed' | 'succeeded';
  attempts: number;
  lastAttemptAt: string;
  nextRetryAt?: string;
  lastHttpStatus?: number;
  lastError?: string;
}

export interface GitHubExecution {
  id: string;
  runId: number;
  runNumber: number;
  workflowName: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | null;

  // Config used
  browsers: string[];
  workers: number;
  shards: number;

  // Timestamps
  triggeredAt: string;
  startedAt?: string;
  completedAt?: string;

  // Results
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration?: number;

  // Detailed results
  scenarios?: GitHubExecutionScenario[];

  // Artifacts
  htmlReportUrl?: string;
  traceUrls?: string[];

  // GitHub URLs
  htmlUrl: string;
  logsUrl?: string;

  // Repository info for dispatch/run reconciliation
  owner?: string;
  repo?: string;
  applicationId?: string;
  projectId?: string;
  projectName?: string;

  // Jobs/Shards info
  jobs?: {
    id: number;
    name: string;
    status: string;
    conclusion?: string | null;
    startedAt?: string;
    completedAt?: string;
  }[];

  // Client-side report fetch state to avoid repeated failing /report calls on polling.
  reportFetch?: GitHubReportFetchMeta;
}

interface GitHubExecutionStore {
  executions: GitHubExecution[];

  // Actions
  addExecution: (execution: GitHubExecution) => void;
  updateExecution: (id: string, updates: Partial<GitHubExecution>) => void;
  removeExecution: (id: string) => void;
}

export const useGitHubExecutionStore = create<GitHubExecutionStore>()(
  persist(
    (set) => ({
      executions: [],

      addExecution: (execution) => {
        set((state) => {
          // Prevent duplicates:
          // 1. If same runId/runNumber exists (already tracking this run)
          // 2. If a queued execution was added in the last 30 seconds (debounce rapid clicks)
          const now = Date.now();
          const thirtySecondsAgo = now - 30000;

          const isDuplicate = state.executions.some((existing) => {
            // Same run already being tracked
            if (execution.runId && existing.runId === execution.runId) return true;
            if (execution.runNumber && existing.runNumber === execution.runNumber) return true;

            // Debounce: queued execution for same repo within 30 seconds
            if (
              existing.status === 'queued' &&
              existing.owner === execution.owner &&
              existing.repo === execution.repo &&
              new Date(existing.triggeredAt).getTime() > thirtySecondsAgo
            ) {
              return true;
            }

            return false;
          });

          if (isDuplicate) {
            console.log('[GitHubExecutionStore] Skipping duplicate execution:', execution.id);
            return state; // Don't add duplicate
          }

          return {
            executions: [execution, ...state.executions].slice(0, 50), // Keep last 50
          };
        });
      },

      updateExecution: (id, updates) => {
        set((state) => ({
          executions: state.executions.map((exec) =>
            exec.id === id ? { ...exec, ...updates } : exec
          ),
        }));
      },

      removeExecution: (id) => {
        set((state) => ({
          executions: state.executions.filter((exec) => exec.id !== id),
        }));
      },
    }),
    {
      name: 'github-executions',
      partialize: (state) => ({
        executions: state.executions,
      }),
    }
  )
);
