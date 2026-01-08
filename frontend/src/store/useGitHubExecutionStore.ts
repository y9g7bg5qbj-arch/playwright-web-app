/**
 * GitHub Execution Store
 * Tracks GitHub Actions executions and their results
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GitHubTestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  retry?: number;
  attachments?: {
    name: string;
    path: string;
    contentType: string;
  }[];
}

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

  // Repository info for polling recovery
  owner?: string;
  repo?: string;

  // Jobs/Shards info
  jobs?: {
    id: number;
    name: string;
    status: string;
    conclusion?: string | null;
    startedAt?: string;
    completedAt?: string;
  }[];
}

interface GitHubExecutionStore {
  executions: GitHubExecution[];
  activePolling: Set<string>;

  // Actions
  addExecution: (execution: GitHubExecution) => void;
  updateExecution: (id: string, updates: Partial<GitHubExecution>) => void;
  removeExecution: (id: string) => void;
  getExecution: (id: string) => GitHubExecution | undefined;

  // Polling management
  startPolling: (id: string) => void;
  stopPolling: (id: string) => void;
  isPolling: (id: string) => boolean;

  // Clear all
  clearAll: () => void;
}

export const useGitHubExecutionStore = create<GitHubExecutionStore>()(
  persist(
    (set, get) => ({
      executions: [],
      activePolling: new Set(),

      addExecution: (execution) => {
        set((state) => ({
          executions: [execution, ...state.executions].slice(0, 50), // Keep last 50
        }));
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

      getExecution: (id) => {
        return get().executions.find((exec) => exec.id === id);
      },

      startPolling: (id) => {
        set((state) => ({
          activePolling: new Set([...state.activePolling, id]),
        }));
      },

      stopPolling: (id) => {
        set((state) => {
          const newPolling = new Set(state.activePolling);
          newPolling.delete(id);
          return { activePolling: newPolling };
        });
      },

      isPolling: (id) => {
        return get().activePolling.has(id);
      },

      clearAll: () => {
        set({ executions: [], activePolling: new Set() });
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

export default useGitHubExecutionStore;
