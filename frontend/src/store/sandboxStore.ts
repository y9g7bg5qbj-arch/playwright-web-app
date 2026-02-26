import { create } from 'zustand';
import { sandboxApi, type Sandbox, type CreateSandboxInput, type SyncResult, type ConflictFile, type SyncWithDetailsResult } from '@/api/sandbox';
import {
  pullRequestApi,
  type PullRequest,
  type PullRequestReview,
  type PullRequestComment,
  type PullRequestFile,
  type FileDiff,
  type DiffSummary,
  type CreatePullRequestInput,
  type UpdatePullRequestInput,
  type SubmitReviewInput,
  type AddCommentInput,
  type CanMergeResult,
} from '@/api/pullRequest';

// Active environment type
export type ActiveEnvironment = 'dev' | 'master' | { sandboxId: string };

/**
 * Resolve the folder path for an active environment.
 * Returns the folder name to pass as the `folder` query param to vero file APIs.
 */
export function getEnvironmentFolder(
  activeEnvironment: ActiveEnvironment,
  sandboxes: Sandbox[]
): string | undefined {
  if (activeEnvironment === 'dev') return 'dev';
  if (activeEnvironment === 'master') return 'master';
  if (typeof activeEnvironment === 'object' && 'sandboxId' in activeEnvironment) {
    const sandbox = sandboxes.find(s => s.id === activeEnvironment.sandboxId);
    return sandbox?.folderPath;
  }
  return undefined;
}

interface SandboxState {
  // Current environment context
  activeEnvironment: ActiveEnvironment;

  // Sandboxes list (for current project)
  sandboxes: Sandbox[];
  currentSandbox: Sandbox | null;

  // Pull requests list (for current project)
  pullRequests: PullRequest[];
  currentPullRequest: PullRequest | null;

  // PR detail data
  currentPRReviews: PullRequestReview[];
  currentPRComments: PullRequestComment[];
  currentPRFiles: PullRequestFile[];
  currentPRDiff: DiffSummary | null;
  currentFileDiff: FileDiff | null;
  canMergeResult: CanMergeResult | null;

  // Loading and error states
  isLoading: boolean;
  error: string | null;

  // Sync state
  syncInProgress: boolean;
  syncConflicts: string[] | null;

  // Detailed sync conflict state (for merge conflict modal)
  syncConflictsDetailed: ConflictFile[] | null;
  syncConflictSandbox: Sandbox | null;

  // PR navigation
  selectedPullRequestId: string | null;
  setSelectedPullRequestId: (id: string | null) => void;

  // Environment Actions
  setActiveEnvironment: (env: ActiveEnvironment) => void;
  getActiveEnvironmentLabel: () => string;

  // Sandbox Actions
  fetchSandboxes: (projectId: string) => Promise<void>;
  fetchMySandboxes: (projectId?: string) => Promise<void>;
  createSandbox: (projectId: string, input: CreateSandboxInput) => Promise<Sandbox>;
  deleteSandbox: (sandboxId: string, force?: boolean) => Promise<void>;
  archiveSandbox: (sandboxId: string) => Promise<void>;
  syncSandbox: (sandboxId: string) => Promise<SyncResult>;
  syncSandboxWithDetails: (sandboxId: string) => Promise<SyncWithDetailsResult>;
  setSyncConflictsDetailed: (conflicts: ConflictFile[] | null, sandbox?: Sandbox | null) => void;
  clearSyncConflictState: () => void;
  setCurrentSandbox: (sandbox: Sandbox | null) => void;

  // Pull Request Actions
  fetchPullRequests: (projectId: string, status?: string) => Promise<void>;
  fetchPullRequest: (prId: string) => Promise<void>;
  createPullRequest: (sandboxId: string, input: CreatePullRequestInput) => Promise<PullRequest>;
  updatePullRequest: (prId: string, input: UpdatePullRequestInput) => Promise<void>;
  openPullRequestForReview: (prId: string) => Promise<void>;
  closePullRequest: (prId: string) => Promise<void>;
  deleteClosedPullRequest: (prId: string) => Promise<void>;
  mergePullRequest: (prId: string) => Promise<void>;
  setCurrentPullRequest: (pr: PullRequest | null) => void;

  // PR Review Actions
  fetchPRReviews: (prId: string) => Promise<void>;
  submitReview: (prId: string, input: SubmitReviewInput) => Promise<void>;

  // PR Comment Actions
  fetchPRComments: (prId: string) => Promise<void>;
  addComment: (prId: string, input: AddCommentInput) => Promise<void>;
  deleteComment: (prId: string, commentId: string) => Promise<void>;

  // PR Diff Actions
  fetchPRDiff: (prId: string) => Promise<void>;
  fetchFileDiff: (prId: string, filePath: string) => Promise<void>;
  fetchPRFiles: (prId: string) => Promise<void>;
  checkCanMerge: (prId: string) => Promise<void>;

  // Reset
  clearCurrentPR: () => void;
  clearError: () => void;
}

const ACTIVE_ENV_KEY = 'sandbox_activeEnvironment';

function loadActiveEnvironment(): ActiveEnvironment {
  try {
    const stored = localStorage.getItem(ACTIVE_ENV_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return 'dev';
}

function saveActiveEnvironment(env: ActiveEnvironment): void {
  localStorage.setItem(ACTIVE_ENV_KEY, JSON.stringify(env));
}

function resolveSandboxEnvironmentState(
  activeEnvironment: ActiveEnvironment,
  sandboxes: Sandbox[]
): { activeEnvironment: ActiveEnvironment; currentSandbox: Sandbox | null; changed: boolean } {
  if (typeof activeEnvironment === 'object' && 'sandboxId' in activeEnvironment) {
    const activeSandbox = sandboxes.find(
      sandbox => sandbox.id === activeEnvironment.sandboxId && sandbox.status === 'active'
    );
    if (activeSandbox) {
      return {
        activeEnvironment,
        currentSandbox: activeSandbox,
        changed: false,
      };
    }

    return {
      activeEnvironment: 'dev',
      currentSandbox: null,
      changed: true,
    };
  }

  return {
    activeEnvironment,
    currentSandbox: null,
    changed: false,
  };
}

export const useSandboxStore = create<SandboxState>((set, get) => ({
  activeEnvironment: loadActiveEnvironment(),
  sandboxes: [],
  currentSandbox: null,
  pullRequests: [],
  currentPullRequest: null,
  currentPRReviews: [],
  currentPRComments: [],
  currentPRFiles: [],
  currentPRDiff: null,
  currentFileDiff: null,
  canMergeResult: null,
  isLoading: false,
  error: null,
  syncInProgress: false,
  syncConflicts: null,
  syncConflictsDetailed: null,
  syncConflictSandbox: null,
  selectedPullRequestId: null,

  setSelectedPullRequestId: (id) => set({ selectedPullRequestId: id }),

  // Environment Actions
  setActiveEnvironment: (env) => {
    set({ activeEnvironment: env });
    saveActiveEnvironment(env);

    // If switching to a sandbox, set it as current
    if (typeof env === 'object' && 'sandboxId' in env) {
      const sandbox = get().sandboxes.find(s => s.id === env.sandboxId);
      if (sandbox) {
        set({ currentSandbox: sandbox });
      }
    } else {
      set({ currentSandbox: null });
    }
  },

  getActiveEnvironmentLabel: () => {
    const { activeEnvironment, currentSandbox } = get();
    if (activeEnvironment === 'dev') return 'Development';
    if (activeEnvironment === 'master') return 'Production';
    if (currentSandbox) return currentSandbox.name;
    return 'Sandbox';
  },

  // Sandbox Actions
  fetchSandboxes: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const sandboxes = await sandboxApi.listByProject(projectId);
      set(state => {
        const nextEnvironmentState = resolveSandboxEnvironmentState(state.activeEnvironment, sandboxes);
        if (nextEnvironmentState.changed) {
          saveActiveEnvironment(nextEnvironmentState.activeEnvironment);
        }
        return {
          sandboxes,
          currentSandbox: nextEnvironmentState.currentSandbox,
          activeEnvironment: nextEnvironmentState.activeEnvironment,
          isLoading: false,
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch sandboxes',
        isLoading: false,
      });
    }
  },

  fetchMySandboxes: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const sandboxes = await sandboxApi.listMySandboxes(projectId);
      set(state => {
        const nextEnvironmentState = resolveSandboxEnvironmentState(state.activeEnvironment, sandboxes);
        if (nextEnvironmentState.changed) {
          saveActiveEnvironment(nextEnvironmentState.activeEnvironment);
        }
        return {
          sandboxes,
          currentSandbox: nextEnvironmentState.currentSandbox,
          activeEnvironment: nextEnvironmentState.activeEnvironment,
          isLoading: false,
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch sandboxes',
        isLoading: false,
      });
    }
  },

  createSandbox: async (projectId, input) => {
    set({ isLoading: true, error: null });
    try {
      const sandbox = await sandboxApi.create(projectId, input);
      set(state => ({
        sandboxes: [...state.sandboxes, sandbox],
        currentSandbox: sandbox,
        activeEnvironment: { sandboxId: sandbox.id },
        isLoading: false,
      }));
      saveActiveEnvironment({ sandboxId: sandbox.id });
      return sandbox;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create sandbox',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteSandbox: async (sandboxId, force = false) => {
    set({ isLoading: true, error: null });
    try {
      await sandboxApi.delete(sandboxId, force);
      set(state => {
        const newSandboxes = state.sandboxes.filter(s => s.id !== sandboxId);
        const newEnv = state.activeEnvironment;

        // If we deleted the active sandbox, switch to dev
        if (typeof newEnv === 'object' && newEnv.sandboxId === sandboxId) {
          saveActiveEnvironment('dev');
          return {
            sandboxes: newSandboxes,
            currentSandbox: null,
            activeEnvironment: 'dev' as ActiveEnvironment,
            isLoading: false,
          };
        }

        return {
          sandboxes: newSandboxes,
          currentSandbox: state.currentSandbox?.id === sandboxId ? null : state.currentSandbox,
          isLoading: false,
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete sandbox',
        isLoading: false,
      });
      throw error;
    }
  },

  archiveSandbox: async (sandboxId) => {
    set({ isLoading: true, error: null });
    try {
      const sandbox = await sandboxApi.archive(sandboxId);
      set(state => {
        const archivedActiveSandbox =
          (typeof state.activeEnvironment === 'object' && state.activeEnvironment.sandboxId === sandboxId)
          || state.currentSandbox?.id === sandboxId;

        if (archivedActiveSandbox) {
          saveActiveEnvironment('dev');
        }

        return {
          sandboxes: state.sandboxes.map(s => s.id === sandboxId ? sandbox : s),
          currentSandbox: archivedActiveSandbox ? null : state.currentSandbox,
          activeEnvironment: archivedActiveSandbox ? 'dev' as ActiveEnvironment : state.activeEnvironment,
          isLoading: false,
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to archive sandbox',
        isLoading: false,
      });
      throw error;
    }
  },

  syncSandbox: async (sandboxId) => {
    set({ syncInProgress: true, syncConflicts: null, error: null });
    try {
      const result = await sandboxApi.sync(sandboxId);
      if (result.success && result.sandbox) {
        set(state => ({
          sandboxes: state.sandboxes.map(s => s.id === sandboxId ? result.sandbox! : s),
          currentSandbox: state.currentSandbox?.id === sandboxId ? result.sandbox! : state.currentSandbox,
          syncInProgress: false,
        }));
      } else {
        set({
          syncConflicts: result.conflicts || [],
          syncInProgress: false,
        });
      }
      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to sync sandbox',
        syncInProgress: false,
      });
      throw error;
    }
  },

  syncSandboxWithDetails: async (sandboxId) => {
    set({ syncInProgress: true, syncConflictsDetailed: null, syncConflictSandbox: null, error: null });
    try {
      const result = await sandboxApi.syncWithDetails(sandboxId);
      if (result.hasConflicts && result.conflicts) {
        const sandbox = get().sandboxes.find(s => s.id === sandboxId) || null;
        set({
          syncConflictsDetailed: result.conflicts,
          syncConflictSandbox: sandbox,
          syncInProgress: false,
        });
      } else if (result.sandbox) {
        set(state => ({
          sandboxes: state.sandboxes.map(s => s.id === sandboxId ? result.sandbox! : s),
          currentSandbox: state.currentSandbox?.id === sandboxId ? result.sandbox! : state.currentSandbox,
          syncConflictsDetailed: null,
          syncConflictSandbox: null,
          syncInProgress: false,
        }));
      } else {
        set({ syncInProgress: false });
      }
      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to sync sandbox',
        syncInProgress: false,
      });
      throw error;
    }
  },

  setSyncConflictsDetailed: (conflicts, sandbox = null) => {
    set({ syncConflictsDetailed: conflicts, syncConflictSandbox: sandbox ?? null });
  },

  clearSyncConflictState: () => {
    set({ syncConflictsDetailed: null, syncConflictSandbox: null });
  },

  setCurrentSandbox: (sandbox) => {
    set({ currentSandbox: sandbox });
    if (sandbox) {
      set({ activeEnvironment: { sandboxId: sandbox.id } });
      saveActiveEnvironment({ sandboxId: sandbox.id });
    }
  },

  // Pull Request Actions
  fetchPullRequests: async (projectId, status) => {
    set({ isLoading: true, error: null });
    try {
      const pullRequests = await pullRequestApi.listByProject(projectId, status);
      set({ pullRequests, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch pull requests',
        isLoading: false,
      });
    }
  },

  fetchPullRequest: async (prId) => {
    set({ isLoading: true, error: null });
    try {
      const pullRequest = await pullRequestApi.getById(prId);
      set({ currentPullRequest: pullRequest, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch pull request',
        isLoading: false,
      });
    }
  },

  createPullRequest: async (sandboxId, input) => {
    set({ isLoading: true, error: null });
    try {
      const pullRequest = await pullRequestApi.create(sandboxId, input);
      set(state => ({
        pullRequests: [...state.pullRequests, pullRequest],
        currentPullRequest: pullRequest,
        selectedPullRequestId: pullRequest.id,
        isLoading: false,
      }));
      return pullRequest;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create pull request',
        isLoading: false,
      });
      throw error;
    }
  },

  updatePullRequest: async (prId, input) => {
    set({ isLoading: true, error: null });
    try {
      const pullRequest = await pullRequestApi.update(prId, input);
      set(state => ({
        pullRequests: state.pullRequests.map(pr => pr.id === prId ? pullRequest : pr),
        currentPullRequest: state.currentPullRequest?.id === prId ? pullRequest : state.currentPullRequest,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update pull request',
        isLoading: false,
      });
      throw error;
    }
  },

  openPullRequestForReview: async (prId) => {
    set({ isLoading: true, error: null });
    try {
      const pullRequest = await pullRequestApi.openForReview(prId);
      set(state => ({
        pullRequests: state.pullRequests.map(pr => pr.id === prId ? pullRequest : pr),
        currentPullRequest: state.currentPullRequest?.id === prId ? pullRequest : state.currentPullRequest,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to open pull request for review',
        isLoading: false,
      });
      throw error;
    }
  },

  closePullRequest: async (prId) => {
    set({ isLoading: true, error: null });
    try {
      await pullRequestApi.close(prId);
      set(state => {
        const isCurrentPullRequest = state.currentPullRequest?.id === prId;
        const isSelectedPullRequest = state.selectedPullRequestId === prId;
        return {
          pullRequests: state.pullRequests.filter(pr => pr.id !== prId),
          currentPullRequest: isCurrentPullRequest ? null : state.currentPullRequest,
          selectedPullRequestId: isSelectedPullRequest ? null : state.selectedPullRequestId,
          isLoading: false,
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to close pull request',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteClosedPullRequest: async (prId) => {
    set({ isLoading: true, error: null });
    try {
      await pullRequestApi.deleteClosed(prId);
      set(state => {
        const isCurrentPullRequest = state.currentPullRequest?.id === prId;
        const isSelectedPullRequest = state.selectedPullRequestId === prId;
        return {
          pullRequests: state.pullRequests.filter(pr => pr.id !== prId),
          currentPullRequest: isCurrentPullRequest ? null : state.currentPullRequest,
          currentPRReviews: isCurrentPullRequest ? [] : state.currentPRReviews,
          currentPRComments: isCurrentPullRequest ? [] : state.currentPRComments,
          currentPRFiles: isCurrentPullRequest ? [] : state.currentPRFiles,
          currentPRDiff: isCurrentPullRequest ? null : state.currentPRDiff,
          currentFileDiff: isCurrentPullRequest ? null : state.currentFileDiff,
          canMergeResult: isCurrentPullRequest ? null : state.canMergeResult,
          selectedPullRequestId: isSelectedPullRequest ? null : state.selectedPullRequestId,
          isLoading: false,
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to permanently delete pull request',
        isLoading: false,
      });
      throw error;
    }
  },

  mergePullRequest: async (prId) => {
    set({ isLoading: true, error: null });
    try {
      const pullRequest = await pullRequestApi.merge(prId);
      set(state => ({
        pullRequests: state.pullRequests.map(pr => pr.id === prId ? pullRequest : pr),
        currentPullRequest: state.currentPullRequest?.id === prId ? pullRequest : state.currentPullRequest,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to merge pull request',
        isLoading: false,
      });
      throw error;
    }
  },

  setCurrentPullRequest: (pr) => {
    set({ currentPullRequest: pr });
  },

  // PR Review Actions
  fetchPRReviews: async (prId) => {
    try {
      const reviews = await pullRequestApi.getReviews(prId);
      set({ currentPRReviews: reviews });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch reviews',
      });
    }
  },

  submitReview: async (prId, input) => {
    set({ isLoading: true, error: null });
    try {
      const review = await pullRequestApi.submitReview(prId, input);
      set(state => ({
        currentPRReviews: [...state.currentPRReviews.filter(r => r.reviewerId !== review.reviewerId), review],
        isLoading: false,
      }));
      // Refresh PR to get updated approval count
      await get().fetchPullRequest(prId);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to submit review',
        isLoading: false,
      });
      throw error;
    }
  },

  // PR Comment Actions
  fetchPRComments: async (prId) => {
    try {
      const comments = await pullRequestApi.getComments(prId);
      set({ currentPRComments: comments });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch comments',
      });
    }
  },

  addComment: async (prId, input) => {
    set({ isLoading: true, error: null });
    try {
      const comment = await pullRequestApi.addComment(prId, input);
      set(state => ({
        currentPRComments: [...state.currentPRComments, comment],
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add comment',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteComment: async (prId, commentId) => {
    set({ isLoading: true, error: null });
    try {
      await pullRequestApi.deleteComment(prId, commentId);
      set(state => ({
        currentPRComments: state.currentPRComments.filter(c => c.id !== commentId),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete comment',
        isLoading: false,
      });
      throw error;
    }
  },

  // PR Diff Actions
  fetchPRDiff: async (prId) => {
    try {
      const diff = await pullRequestApi.getDiff(prId);
      set({ currentPRDiff: diff });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch diff',
      });
    }
  },

  fetchFileDiff: async (prId, filePath) => {
    try {
      const fileDiff = await pullRequestApi.getFileDiff(prId, filePath);
      set({ currentFileDiff: fileDiff });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch file diff',
      });
    }
  },

  fetchPRFiles: async (prId) => {
    try {
      const files = await pullRequestApi.getChangedFiles(prId);
      set({ currentPRFiles: files });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch changed files',
      });
    }
  },

  checkCanMerge: async (prId) => {
    try {
      const result = await pullRequestApi.canMerge(prId);
      set({ canMergeResult: result });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to check merge status',
      });
    }
  },

  // Reset
  clearCurrentPR: () => {
    set({
      currentPullRequest: null,
      currentPRReviews: [],
      currentPRComments: [],
      currentPRFiles: [],
      currentPRDiff: null,
      currentFileDiff: null,
      canMergeResult: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));
