/**
 * Local Execution Store
 *
 * Zustand store for managing local test executions.
 * Similar to useGitHubExecutionStore but for local/headed runs.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { executionsApi } from '@/api/executions';
import type { ExecutionWithDetails } from '@/api/executions';

export interface LocalExecution extends ExecutionWithDetails {
  // Additional fields for local executions
  output?: string;
  generatedCode?: string;
  error?: string;
  // Optional shards for parallel execution display
  shards?: Array<{
    id: string;
    index: number;
    status: 'pending' | 'running' | 'passed' | 'failed';
    passedTests: number;
    failedTests: number;
    totalTests: number;
  }>;
}

interface LocalExecutionState {
  executions: LocalExecution[];
  isLoading: boolean;
  lastFetched: string | null;

  // Actions
  fetchExecutions: () => Promise<void>;
  addExecution: (execution: LocalExecution) => void;
  updateExecution: (id: string, updates: Partial<LocalExecution>) => void;
  removeExecution: (id: string) => void;
  clearAll: () => void;
}

export const useLocalExecutionStore = create<LocalExecutionState>()(
  persist(
    (set, get) => ({
      executions: [],
      isLoading: false,
      lastFetched: null,

      fetchExecutions: async () => {
        set({ isLoading: true });
        try {
          const executions = await executionsApi.getRecent(200);
          if (executions && Array.isArray(executions)) {
            // Merge with existing executions (keep real-time updates)
            const existingMap = new Map(
              get().executions.map((e) => [e.id, e])
            );

            // Use API data as base, overlay any real-time updates
            const mergedExecutions = executions.map((apiExec: ExecutionWithDetails) => {
              const existing = existingMap.get(apiExec.id);
              if (existing && existing.status === 'running') {
                // Keep running status from real-time updates
                return existing;
              }
              return apiExec as LocalExecution;
            });

            // Add any running executions not in API response (just started)
            const runningNotInApi = get().executions.filter(
              (e) =>
                e.status === 'running' &&
                !executions.find((apiE: ExecutionWithDetails) => apiE.id === e.id)
            );

            set({
              executions: [...runningNotInApi, ...mergedExecutions],
              isLoading: false,
              lastFetched: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error('[LocalExecutionStore] Failed to fetch executions:', error);
          set({ isLoading: false });
        }
      },

      addExecution: (execution) => {
        set((state) => {
          // Check for duplicates
          const exists = state.executions.some((e) => e.id === execution.id);
          if (exists) {
            return {
              executions: state.executions.map((e) =>
                e.id === execution.id ? { ...e, ...execution } : e
              ),
            };
          }
          return {
            executions: [execution, ...state.executions],
          };
        });
      },

      updateExecution: (id, updates) => {
        set((state) => ({
          executions: state.executions.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        }));
      },

      removeExecution: (id) => {
        set((state) => ({
          executions: state.executions.filter((e) => e.id !== id),
        }));
      },

      clearAll: () => {
        set({ executions: [], lastFetched: null });
      },
    }),
    {
      name: 'local-executions',
      partialize: (state) => ({
        // Only persist recent executions (last 50)
        executions: state.executions.slice(0, 50),
        lastFetched: state.lastFetched,
      }),
    }
  )
);
