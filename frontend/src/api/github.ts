import { apiClient } from './client';
import type {
  RunConfiguration,
  GitHubActionsConfig,
} from '@playwright-web-app/shared';

// ============================================
// TYPES
// ============================================

export interface GitHubIntegration {
  id: string;
  userId: string;
  tokenType: 'oauth' | 'pat';
  scope: string;
  login: string;
  avatarUrl?: string;
  isValid: boolean;
  lastValidatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  runNumber: number;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
  htmlUrl: string;
  event: string;
  headBranch: string;
  headSha: string;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubWorkflowJob {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  htmlUrl: string;
  runnerName?: string;
  startedAt?: string;
  completedAt?: string;
  steps?: GitHubWorkflowStep[];
}

export interface GitHubWorkflowStep {
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'skipped';
  number: number;
  startedAt?: string;
  completedAt?: string;
}

export interface GitHubArtifact {
  id: number;
  name: string;
  sizeInBytes: number;
  expired: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface GeneratedWorkflow {
  content: string;
  path: string;
  filename: string;
}

export interface WorkflowGeneratorOptions {
  name?: string;
  description?: string;
  triggers?: {
    push?: { branches?: string[] };
    pullRequest?: { branches?: string[] };
    schedule?: string[];
    workflowDispatch?: boolean;
  };
  environment?: {
    name: string;
    baseUrl: string;
    variables?: Record<string, string>;
  };
}

export interface TrackedWorkflowRun {
  id: string;
  runId: string;
  runNumber: number;
  status: string;
  conclusion?: string;
  htmlUrl: string;
  event: string;
  headBranch?: string;
  headSha?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  jobs?: TrackedWorkflowJob[];
}

export interface TrackedWorkflowJob {
  id: string;
  jobId: string;
  name: string;
  status: string;
  conclusion?: string;
  htmlUrl: string;
  runnerName?: string;
  startedAt?: string;
  completedAt?: string;
}

// ============================================
// INTEGRATION API
// ============================================

export const githubIntegrationApi = {
  // Get current integration status
  getIntegration: () =>
    apiClient.get<GitHubIntegration | null>('/github/integration'),

  // Connect with PAT
  connect: (token: string, tokenType: 'pat' | 'oauth' = 'pat') =>
    apiClient.post<GitHubIntegration>('/github/connect', { token, tokenType }),

  // Disconnect
  disconnect: () =>
    apiClient.delete<void>('/github/disconnect'),

  // Validate token without saving
  validateToken: (token: string) =>
    apiClient.post<{ valid: boolean; login?: string; avatarUrl?: string; error?: string }>(
      '/github/validate-token',
      { token }
    ),
};

// ============================================
// REPOSITORY API
// ============================================

export const githubRepoApi = {
  // List user's repositories
  list: () =>
    apiClient.get<GitHubRepository[]>('/github/repos'),

  // Get branches for a repository
  getBranches: (owner: string, repo: string) =>
    apiClient.get<string[]>(`/github/repos/${owner}/${repo}/branches`),
};

// ============================================
// WORKFLOW GENERATION API
// ============================================

export const githubWorkflowApi = {
  // Generate workflow YAML
  generate: (config: Partial<RunConfiguration>, options?: WorkflowGeneratorOptions) =>
    apiClient.post<GeneratedWorkflow>('/github/workflows/generate', { config, options }),

  // Preview without validation
  preview: (config: Partial<RunConfiguration>, options?: WorkflowGeneratorOptions) =>
    apiClient.post<GeneratedWorkflow>('/github/workflows/preview', { config, options }),

  // Estimate execution time
  estimate: (testCount: number, avgTestDuration: number, config: GitHubActionsConfig) =>
    apiClient.post<{ minutes: number; formatted: string }>('/github/workflows/estimate', {
      testCount,
      avgTestDuration,
      config,
    }),

  // Save repository config for a workflow
  saveRepoConfig: (
    workflowId: string,
    repoFullName: string,
    repoId: number,
    defaultBranch?: string,
    workflowPath?: string
  ) =>
    apiClient.post(`/github/workflows/${workflowId}/repo`, {
      repoFullName,
      repoId,
      defaultBranch,
      workflowPath,
    }),

  // Get repository config for a workflow
  getRepoConfig: (workflowId: string) =>
    apiClient.get(`/github/workflows/${workflowId}/repo`),

  // Get tracked runs for a workflow
  getTrackedRuns: (workflowId: string, limit?: number) =>
    apiClient.get<TrackedWorkflowRun[]>(
      `/github/workflows/${workflowId}/runs${limit ? `?limit=${limit}` : ''}`
    ),
};

// ============================================
// WORKFLOW RUNS API
// ============================================

export const githubRunsApi = {
  // Trigger a workflow
  trigger: (
    owner: string,
    repo: string,
    workflowPath: string,
    ref?: string,
    inputs?: Record<string, string>
  ) =>
    apiClient.post<{ success: boolean; error?: string }>('/github/runs/trigger', {
      owner,
      repo,
      workflowPath,
      ref,
      inputs,
    }),

  // List runs for a repository
  list: (
    owner: string,
    repo: string,
    options?: {
      workflowId?: string;
      branch?: string;
      status?: string;
      limit?: number;
    }
  ) => {
    const params = new URLSearchParams({ owner, repo });
    if (options?.workflowId) params.set('workflowId', options.workflowId);
    if (options?.branch) params.set('branch', options.branch);
    if (options?.status) params.set('status', options.status);
    if (options?.limit) params.set('limit', String(options.limit));
    return apiClient.get<GitHubWorkflowRun[]>(`/github/runs?${params}`);
  },

  // Get a specific run
  get: (owner: string, repo: string, runId: number) =>
    apiClient.get<GitHubWorkflowRun>(`/github/runs/${runId}?owner=${owner}&repo=${repo}`),

  // Get jobs for a run
  getJobs: (owner: string, repo: string, runId: number) =>
    apiClient.get<GitHubWorkflowJob[]>(`/github/runs/${runId}/jobs?owner=${owner}&repo=${repo}`),

  // Cancel a run
  cancel: (owner: string, repo: string, runId: number) =>
    apiClient.post<void>(`/github/runs/${runId}/cancel`, { owner, repo }),

  // Re-run a workflow
  rerun: (owner: string, repo: string, runId: number) =>
    apiClient.post<void>(`/github/runs/${runId}/rerun`, { owner, repo }),
};

// ============================================
// ARTIFACTS API
// ============================================

export const githubArtifactsApi = {
  // List artifacts for a run
  list: (owner: string, repo: string, runId: number) =>
    apiClient.get<GitHubArtifact[]>(`/github/runs/${runId}/artifacts?owner=${owner}&repo=${repo}`),

  // Get download URL for an artifact
  getDownloadUrl: (owner: string, repo: string, artifactId: number) =>
    `/api/github/artifacts/${artifactId}/download?owner=${owner}&repo=${repo}`,
};
