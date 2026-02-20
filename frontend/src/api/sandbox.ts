import { apiClient } from './client';

// UUID validation helper
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export interface Sandbox {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  ownerName: string | null;
  ownerEmail: string;
  projectId: string;
  sourceBranch: string;
  folderPath: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastSyncAt: string | null;
  pullRequestCount: number;
}

export interface CreateSandboxInput {
  name: string;
  description?: string;
  sourceBranch?: 'dev' | 'master';
}

export interface SyncResult {
  success: boolean;
  conflicts?: string[];
  sandbox?: Sandbox;
}

// Three-way merge conflict types
export interface DiffHunk {
  id: string;
  theirsStart: number;
  theirsEnd: number;
  yoursStart: number;
  yoursEnd: number;
  theirsLines: string[];
  yoursLines: string[];
}

export interface ConflictFile {
  filePath: string;
  theirsContent: string;
  yoursContent: string;
  hunks: DiffHunk[];
}

export interface SyncWithDetailsResult {
  success: boolean;
  hasConflicts: boolean;
  conflicts?: ConflictFile[];
  cleanMerges?: string[];
  sandbox?: Sandbox;
}

export interface ResolveConflictsResult {
  success: boolean;
  updatedFiles: string[];
  sandbox: Sandbox;
}

// Raw API response shape (backend returns { sandboxes } or { sandbox })
interface SandboxListResponse {
  sandboxes: Sandbox[];
}

interface SandboxResponse {
  sandbox: Sandbox;
}

interface SyncResponse {
  sandbox?: Sandbox;
}

export const sandboxApi = {
  // List all sandboxes for a project
  async listByProject(projectId: string): Promise<Sandbox[]> {
    // Validate UUID format before making API call
    if (!projectId || !isValidUUID(projectId)) {
      console.error('[sandboxApi.listByProject] Invalid projectId:', projectId);
      throw new Error(`Invalid project ID format: "${projectId}". Expected a valid UUID.`);
    }
    // API returns { sandboxes: [...] } wrapped in data
    const response = await apiClient.get<{ sandboxes: Sandbox[] }>(`/projects/${projectId}/sandboxes`);
    return response.sandboxes;
  },

  // List sandboxes owned by current user
  async listMySandboxes(projectId?: string): Promise<Sandbox[]> {
    const endpoint = projectId ? `/sandboxes?projectId=${projectId}` : '/sandboxes';
    const response = await apiClient.get<SandboxListResponse>(endpoint);
    return response.sandboxes;
  },

  // Get sandbox details
  async getById(sandboxId: string): Promise<Sandbox> {
    const response = await apiClient.get<SandboxResponse>(`/sandboxes/${sandboxId}`);
    return response.sandbox;
  },

  // Create a new sandbox in a project
  async create(projectId: string, input: CreateSandboxInput): Promise<Sandbox> {
    // Validate UUID format before making API call
    if (!projectId || !isValidUUID(projectId)) {
      console.error('[sandboxApi.create] Invalid projectId:', projectId);
      throw new Error(`Invalid project ID format: "${projectId}". Expected a valid UUID.`);
    }
    // API returns { sandbox: ... } wrapped in data
    const response = await apiClient.post<{ sandbox: Sandbox }>(`/projects/${projectId}/sandboxes`, input);
    return response.sandbox;
  },

  // Delete a sandbox
  async delete(sandboxId: string, force: boolean = false): Promise<void> {
    await apiClient.delete(`/sandboxes/${sandboxId}${force ? '?force=true' : ''}`);
  },

  // Archive a sandbox (soft delete)
  async archive(sandboxId: string): Promise<Sandbox> {
    const response = await apiClient.post<SandboxResponse>(`/sandboxes/${sandboxId}/archive`);
    return response.sandbox;
  },

  // Sync sandbox with source environment (pull latest from dev/master)
  async sync(sandboxId: string): Promise<SyncResult> {
    const response = await apiClient.post<SyncResponse>(`/sandboxes/${sandboxId}/sync`);
    return {
      success: true,
      sandbox: response.sandbox,
    };
  },

  // Enhanced sync that returns detailed conflict information for three-way merge
  async syncWithDetails(sandboxId: string): Promise<SyncWithDetailsResult> {
    return apiClient.post<SyncWithDetailsResult>(`/sandboxes/${sandboxId}/sync-with-details`);
  },

  // Submit resolved conflicts after merge resolution
  async resolveConflicts(
    sandboxId: string,
    resolutions: Record<string, string>,
    autoMergeClean: boolean = true
  ): Promise<ResolveConflictsResult> {
    return apiClient.post<ResolveConflictsResult>(`/sandboxes/${sandboxId}/resolve-conflicts`, {
      resolutions,
      autoMergeClean,
    });
  },
};

// File comparison types and API
export interface CompareEnvironment {
  id: string;
  name: string;
  type: 'branch' | 'sandbox';
  branch: string;
  owner?: string;
}

export interface FileComparisonSide {
  branch: string;
  environment: string;
  content: string | null;
  exists: boolean;
}

export interface FileDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: FileDiffLine[];
}

export interface FileDiffLine {
  type: 'context' | 'add' | 'delete';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface FileDiff {
  filePath: string;
  hunks: FileDiffHunk[];
}

export interface FileComparisonResult {
  source: FileComparisonSide;
  target: FileComparisonSide;
  diff: FileDiff;
  filePath: string;
}

interface EnvironmentsResponse {
  environments: CompareEnvironment[];
}

export const compareApi = {
  // Get available environments for comparison
  async getEnvironments(projectId: string): Promise<CompareEnvironment[]> {
    const response = await apiClient.get<EnvironmentsResponse>(`/compare/${projectId}/environments`);
    return response.environments;
  },

  // Compare a file between two environments
  async compareFile(
    projectId: string,
    source: string,
    target: string,
    filePath: string
  ): Promise<FileComparisonResult> {
    const params = new URLSearchParams({ source, target, file: filePath });
    return apiClient.get<FileComparisonResult>(`/projects/${projectId}/compare?${params}`);
  },
};
