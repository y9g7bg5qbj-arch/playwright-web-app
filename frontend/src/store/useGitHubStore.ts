import { create } from 'zustand';
import {
  githubIntegrationApi,
  githubRepoApi,
  githubWorkflowApi,
  githubRunsApi,
  githubArtifactsApi,
  type GitHubIntegration,
  type GitHubRepository,
  type GitHubWorkflowRun,
  type GitHubWorkflowJob,
  type GitHubArtifact,
  type GeneratedWorkflow,
  type WorkflowGeneratorOptions,
  type TrackedWorkflowRun,
} from '@/api/github';
import type { RunConfiguration, GitHubActionsConfig } from '@playwright-web-app/shared';

interface GitHubState {
  // Integration
  integration: GitHubIntegration | null;
  integrationLoading: boolean;
  integrationError: string | null;

  // Repositories
  repositories: GitHubRepository[];
  repositoriesLoading: boolean;
  selectedRepository: GitHubRepository | null;

  // Branches
  branches: string[];
  branchesLoading: boolean;
  selectedBranch: string | null;

  // Workflow Runs
  runs: GitHubWorkflowRun[];
  runsLoading: boolean;
  selectedRun: GitHubWorkflowRun | null;

  // Jobs
  jobs: GitHubWorkflowJob[];
  jobsLoading: boolean;

  // Artifacts
  artifacts: GitHubArtifact[];
  artifactsLoading: boolean;

  // Generated Workflow
  generatedWorkflow: GeneratedWorkflow | null;
  workflowGenerating: boolean;

  // Tracked Runs (from Vero DB)
  trackedRuns: TrackedWorkflowRun[];
  trackedRunsLoading: boolean;

  // Execution Estimate
  executionEstimate: { minutes: number; formatted: string } | null;

  // Workflow File Provisioning
  workflowFileStatus: 'unknown' | 'checking' | 'not-found' | 'found' | 'pushing' | 'error';
  workflowFileError: string | null;

  // Polling
  pollingInterval: ReturnType<typeof setInterval> | null;

  // Actions - Integration
  loadIntegration: () => Promise<void>;
  connectWithToken: (token: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  validateToken: (token: string) => Promise<{ valid: boolean; login?: string; error?: string }>;

  // Actions - Repositories
  loadRepositories: () => Promise<void>;
  selectRepository: (repo: GitHubRepository | null) => void;

  // Actions - Branches
  loadBranches: (owner: string, repo: string) => Promise<void>;
  selectBranch: (branch: string | null) => void;

  // Actions - Workflow Generation
  generateWorkflow: (config: Partial<RunConfiguration>, options?: WorkflowGeneratorOptions) => Promise<GeneratedWorkflow>;
  previewWorkflow: (config: Partial<RunConfiguration>, options?: WorkflowGeneratorOptions) => Promise<GeneratedWorkflow>;
  estimateExecution: (testCount: number, avgTestDuration: number, config: GitHubActionsConfig) => Promise<void>;
  clearGeneratedWorkflow: () => void;

  // Actions - Runs
  triggerRun: (workflowPath: string, ref?: string, inputs?: Record<string, string>) => Promise<boolean>;
  loadRuns: (limit?: number) => Promise<void>;
  selectRun: (run: GitHubWorkflowRun | null) => void;
  loadJobs: (runId: number) => Promise<void>;
  cancelRun: (runId: number) => Promise<boolean>;
  rerunWorkflow: (runId: number) => Promise<boolean>;

  // Actions - Artifacts
  loadArtifacts: (runId: number) => Promise<void>;
  getArtifactDownloadUrl: (artifactId: number) => string;

  // Actions - Workflow File Provisioning
  checkWorkflowFile: (owner: string, repo: string, branch: string) => Promise<void>;
  pushWorkflowFile: (owner: string, repo: string, branch: string) => Promise<boolean>;

  // Actions - Tracked Runs
  loadTrackedRuns: (workflowId: string, limit?: number) => Promise<void>;
  saveRepoConfig: (workflowId: string, repoId: number, defaultBranch?: string, workflowPath?: string) => Promise<void>;

  // Actions - Polling
  startPollingRun: (runId: number, intervalMs?: number) => void;
  stopPolling: () => void;

  // Helpers
  isConnected: () => boolean;
  getRepoFullName: () => string | null;
}

export const useGitHubStore = create<GitHubState>((set, get) => ({
  // Initial State
  integration: null,
  integrationLoading: false,
  integrationError: null,

  repositories: [],
  repositoriesLoading: false,
  selectedRepository: null,

  branches: [],
  branchesLoading: false,
  selectedBranch: null,

  runs: [],
  runsLoading: false,
  selectedRun: null,

  jobs: [],
  jobsLoading: false,

  artifacts: [],
  artifactsLoading: false,

  generatedWorkflow: null,
  workflowGenerating: false,

  trackedRuns: [],
  trackedRunsLoading: false,

  executionEstimate: null,

  workflowFileStatus: 'unknown',
  workflowFileError: null,

  pollingInterval: null,

  // Integration Actions
  loadIntegration: async () => {
    set({ integrationLoading: true, integrationError: null });
    try {
      const integration = await githubIntegrationApi.getIntegration();
      set({ integration, integrationLoading: false });

      // If connected, also load repositories
      if (integration) {
        get().loadRepositories();
      }
    } catch (error) {
      set({
        integrationError: error instanceof Error ? error.message : 'Failed to load integration',
        integrationLoading: false,
      });
    }
  },

  connectWithToken: async (token) => {
    set({ integrationLoading: true, integrationError: null });
    try {
      const integration = await githubIntegrationApi.connect(token, 'pat');
      set({ integration, integrationLoading: false });

      // Load repositories after connecting
      get().loadRepositories();
      return true;
    } catch (error) {
      set({
        integrationError: error instanceof Error ? error.message : 'Failed to connect',
        integrationLoading: false,
      });
      return false;
    }
  },

  disconnect: async () => {
    try {
      await githubIntegrationApi.disconnect();
      set({
        integration: null,
        repositories: [],
        selectedRepository: null,
        branches: [],
        selectedBranch: null,
        runs: [],
        selectedRun: null,
        jobs: [],
        artifacts: [],
        workflowFileStatus: 'unknown',
        workflowFileError: null,
      });
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  },

  validateToken: async (token) => {
    try {
      const result = await githubIntegrationApi.validateToken(token);
      return result;
    } catch {
      return { valid: false, error: 'Validation failed' };
    }
  },

  // Repository Actions
  loadRepositories: async () => {
    set({ repositoriesLoading: true });
    try {
      const repositories = await githubRepoApi.list();
      set({ repositories, repositoriesLoading: false });
    } catch {
      set({ repositoriesLoading: false });
    }
  },

  selectRepository: (repo) => {
    set({ selectedRepository: repo, branches: [], selectedBranch: null, workflowFileStatus: 'unknown', workflowFileError: null });
    if (repo) {
      get().loadBranches(repo.owner, repo.name);
    }
  },

  // Branch Actions
  loadBranches: async (owner, repo) => {
    set({ branchesLoading: true });
    try {
      const branches = await githubRepoApi.getBranches(owner, repo);
      set({ branches, branchesLoading: false });

      // Auto-select default branch
      const selectedRepo = get().selectedRepository;
      if (selectedRepo && branches.includes(selectedRepo.defaultBranch)) {
        set({ selectedBranch: selectedRepo.defaultBranch });
      } else if (branches.length > 0) {
        set({ selectedBranch: branches[0] });
      }
    } catch {
      set({ branchesLoading: false });
    }
  },

  selectBranch: (branch) => {
    set({ selectedBranch: branch });
  },

  // Workflow Generation Actions
  generateWorkflow: async (config, options) => {
    set({ workflowGenerating: true });
    try {
      const workflow = await githubWorkflowApi.generate(config, options);
      set({ generatedWorkflow: workflow, workflowGenerating: false });
      return workflow;
    } catch (error) {
      set({ workflowGenerating: false });
      throw error;
    }
  },

  previewWorkflow: async (config, options) => {
    set({ workflowGenerating: true });
    try {
      const workflow = await githubWorkflowApi.preview(config, options);
      set({ generatedWorkflow: workflow, workflowGenerating: false });
      return workflow;
    } catch (error) {
      set({ workflowGenerating: false });
      throw error;
    }
  },

  estimateExecution: async (testCount, avgTestDuration, config) => {
    try {
      const estimate = await githubWorkflowApi.estimate(testCount, avgTestDuration, config);
      set({ executionEstimate: estimate });
    } catch {
      set({ executionEstimate: null });
    }
  },

  clearGeneratedWorkflow: () => {
    set({ generatedWorkflow: null });
  },

  // Run Actions
  triggerRun: async (workflowPath, ref, inputs) => {
    const { selectedRepository, selectedBranch } = get();
    if (!selectedRepository) return false;

    try {
      const result = await githubRunsApi.trigger(
        selectedRepository.owner,
        selectedRepository.name,
        workflowPath,
        ref || selectedBranch || selectedRepository.defaultBranch,
        inputs
      );

      if (result.success) {
        // Refresh runs after triggering
        setTimeout(() => get().loadRuns(), 2000);
      }

      return result.success;
    } catch {
      return false;
    }
  },

  loadRuns: async (limit = 10) => {
    const { selectedRepository } = get();
    if (!selectedRepository) return;

    set({ runsLoading: true });
    try {
      const runs = await githubRunsApi.list(
        selectedRepository.owner,
        selectedRepository.name,
        { limit }
      );
      set({ runs, runsLoading: false });
    } catch {
      set({ runsLoading: false });
    }
  },

  selectRun: (run) => {
    set({ selectedRun: run, jobs: [], artifacts: [] });
    if (run) {
      get().loadJobs(run.id);
      get().loadArtifacts(run.id);
    }
  },

  loadJobs: async (runId) => {
    const { selectedRepository } = get();
    if (!selectedRepository) return;

    set({ jobsLoading: true });
    try {
      const jobs = await githubRunsApi.getJobs(
        selectedRepository.owner,
        selectedRepository.name,
        runId
      );
      set({ jobs, jobsLoading: false });
    } catch {
      set({ jobsLoading: false });
    }
  },

  cancelRun: async (runId) => {
    const { selectedRepository } = get();
    if (!selectedRepository) return false;

    try {
      await githubRunsApi.cancel(
        selectedRepository.owner,
        selectedRepository.name,
        runId
      );
      // Refresh runs
      get().loadRuns();
      return true;
    } catch {
      return false;
    }
  },

  rerunWorkflow: async (runId) => {
    const { selectedRepository } = get();
    if (!selectedRepository) return false;

    try {
      await githubRunsApi.rerun(
        selectedRepository.owner,
        selectedRepository.name,
        runId
      );
      // Refresh runs after a delay
      setTimeout(() => get().loadRuns(), 2000);
      return true;
    } catch {
      return false;
    }
  },

  // Artifact Actions
  loadArtifacts: async (runId) => {
    const { selectedRepository } = get();
    if (!selectedRepository) return;

    set({ artifactsLoading: true });
    try {
      const artifacts = await githubArtifactsApi.list(
        selectedRepository.owner,
        selectedRepository.name,
        runId
      );
      set({ artifacts, artifactsLoading: false });
    } catch {
      set({ artifactsLoading: false });
    }
  },

  getArtifactDownloadUrl: (artifactId) => {
    const { selectedRepository } = get();
    if (!selectedRepository) return '';

    return githubArtifactsApi.getDownloadUrl(
      selectedRepository.owner,
      selectedRepository.name,
      artifactId
    );
  },

  // Workflow File Provisioning Actions
  checkWorkflowFile: async (owner, repo, branch) => {
    set({ workflowFileStatus: 'checking', workflowFileError: null });
    try {
      const result = await githubWorkflowApi.checkWorkflowFile(owner, repo, branch);
      set({
        workflowFileStatus: result.exists ? 'found' : 'not-found',
      });
    } catch (error) {
      set({
        workflowFileStatus: 'error',
        workflowFileError: error instanceof Error ? error.message : 'Failed to check workflow file',
      });
    }
  },

  pushWorkflowFile: async (owner, repo, branch) => {
    set({ workflowFileStatus: 'pushing', workflowFileError: null });
    try {
      await githubWorkflowApi.pushWorkflowFile(owner, repo, branch);
      set({ workflowFileStatus: 'found' });
      return true;
    } catch (error) {
      set({
        workflowFileStatus: 'error',
        workflowFileError: error instanceof Error ? error.message : 'Failed to push workflow file',
      });
      return false;
    }
  },

  // Tracked Runs Actions
  loadTrackedRuns: async (workflowId, limit = 20) => {
    set({ trackedRunsLoading: true });
    try {
      const trackedRuns = await githubWorkflowApi.getTrackedRuns(workflowId, limit);
      set({ trackedRuns, trackedRunsLoading: false });
    } catch {
      set({ trackedRunsLoading: false });
    }
  },

  saveRepoConfig: async (workflowId, repoId, defaultBranch, workflowPath) => {
    const { selectedRepository } = get();
    if (!selectedRepository) return;

    await githubWorkflowApi.saveRepoConfig(
      workflowId,
      selectedRepository.fullName,
      repoId,
      defaultBranch || selectedRepository.defaultBranch,
      workflowPath
    );
  },

  // Polling Actions
  startPollingRun: (runId, intervalMs = 5000) => {
    // Stop any existing polling
    get().stopPolling();

    const interval = setInterval(async () => {
      const { selectedRepository, selectedRun } = get();
      if (!selectedRepository || !selectedRun) {
        get().stopPolling();
        return;
      }

      try {
        const run = await githubRunsApi.get(
          selectedRepository.owner,
          selectedRepository.name,
          runId
        );

        set({ selectedRun: run });

        // Also refresh jobs
        get().loadJobs(runId);

        // Stop polling if completed
        if (run.status === 'completed') {
          get().stopPolling();
          get().loadArtifacts(runId);
        }
      } catch {
        // Continue polling on error
      }
    }, intervalMs);

    set({ pollingInterval: interval });
  },

  stopPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) {
      clearInterval(pollingInterval);
      set({ pollingInterval: null });
    }
  },

  // Helpers
  isConnected: () => {
    const { integration } = get();
    return !!integration && integration.isValid;
  },

  getRepoFullName: () => {
    const { selectedRepository } = get();
    return selectedRepository?.fullName || null;
  },
}));
