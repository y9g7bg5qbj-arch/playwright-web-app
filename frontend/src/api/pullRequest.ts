import { apiClient } from './client';

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  description: string | null;
  authorId: string;
  authorName: string | null;
  authorEmail: string;
  sandboxId: string;
  sandboxName: string;
  projectId: string;
  targetBranch: string;
  status: 'draft' | 'open' | 'approved' | 'merged' | 'closed';
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  mergedById: string | null;
  closedAt: string | null;
  reviewCount: number;
  approvalCount: number;
  commentCount: number;
  fileCount: number;
}

export interface PullRequestReview {
  id: string;
  pullRequestId: string;
  reviewerId: string;
  reviewerName: string | null;
  reviewerEmail: string;
  status: 'pending' | 'approved' | 'changes_requested';
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PullRequestComment {
  id: string;
  pullRequestId: string;
  authorId: string;
  authorName: string | null;
  authorEmail: string;
  body: string;
  filePath: string | null;
  lineNumber: number | null;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PullRequestFile {
  id: string;
  pullRequestId: string;
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

export interface FileDiff {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'add' | 'delete';
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
}

export interface DiffSummary {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  files: PullRequestFile[];
}

export interface CreatePullRequestInput {
  title: string;
  description?: string;
  targetBranch?: 'dev' | 'master';
}

export interface UpdatePullRequestInput {
  title?: string;
  description?: string;
}

export interface SubmitReviewInput {
  status: 'approved' | 'changes_requested';
  comment?: string;
}

export interface AddCommentInput {
  body: string;
  filePath?: string;
  lineNumber?: number;
}

export interface CanMergeResult {
  canMerge: boolean;
  reasons: string[];
}

// Raw API response shapes
interface PRListResponse {
  pullRequests: PullRequest[];
}

interface PRResponse {
  pullRequest: PullRequest;
}

interface ReviewsResponse {
  reviews: PullRequestReview[];
}

interface ReviewResponse {
  review: PullRequestReview;
}

interface CommentsResponse {
  comments: PullRequestComment[];
}

interface CommentResponse {
  comment: PullRequestComment;
}

interface FilesResponse {
  files: PullRequestFile[];
}

interface DiffResponse {
  diff: DiffSummary;
}

interface FileDiffResponse {
  fileDiff: FileDiff;
}

export const pullRequestApi = {
  // List all PRs for a project
  async listByProject(projectId: string, status?: string): Promise<PullRequest[]> {
    const endpoint = status
      ? `/projects/${projectId}/pull-requests?status=${status}`
      : `/projects/${projectId}/pull-requests`;
    const response = await apiClient.get<PRListResponse>(endpoint);
    return response.pullRequests;
  },

  // Get PR details
  async getById(prId: string): Promise<PullRequest> {
    const response = await apiClient.get<PRResponse>(`/pull-requests/${prId}`);
    return response.pullRequest;
  },

  // Create a new PR from a sandbox
  async create(sandboxId: string, input: CreatePullRequestInput): Promise<PullRequest> {
    const response = await apiClient.post<PRResponse>(`/sandboxes/${sandboxId}/pull-requests`, input);
    return response.pullRequest;
  },

  // Update PR title/description
  async update(prId: string, input: UpdatePullRequestInput): Promise<PullRequest> {
    const response = await apiClient.patch<PRResponse>(`/pull-requests/${prId}`, input);
    return response.pullRequest;
  },

  // Mark PR as ready for review (draft -> open)
  async openForReview(prId: string): Promise<PullRequest> {
    const response = await apiClient.post<PRResponse>(`/pull-requests/${prId}/open`);
    return response.pullRequest;
  },

  // Close a PR
  async close(prId: string): Promise<void> {
    await apiClient.delete(`/pull-requests/${prId}`);
  },

  // Get diff summary for a PR
  async getDiff(prId: string): Promise<DiffSummary> {
    const response = await apiClient.get<DiffResponse>(`/pull-requests/${prId}/diff`);
    return response.diff;
  },

  // Get detailed diff for a specific file
  async getFileDiff(prId: string, filePath: string): Promise<FileDiff> {
    const response = await apiClient.get<FileDiffResponse>(
      `/pull-requests/${prId}/diff/${encodeURIComponent(filePath)}`
    );
    return response.fileDiff;
  },

  // Get changed files list
  async getChangedFiles(prId: string): Promise<PullRequestFile[]> {
    const response = await apiClient.get<FilesResponse>(`/pull-requests/${prId}/files`);
    return response.files;
  },

  // Get reviews for a PR
  async getReviews(prId: string): Promise<PullRequestReview[]> {
    const response = await apiClient.get<ReviewsResponse>(`/pull-requests/${prId}/reviews`);
    return response.reviews;
  },

  // Submit a review
  async submitReview(prId: string, input: SubmitReviewInput): Promise<PullRequestReview> {
    const response = await apiClient.post<ReviewResponse>(`/pull-requests/${prId}/reviews`, input);
    return response.review;
  },

  // Get comments for a PR
  async getComments(prId: string): Promise<PullRequestComment[]> {
    const response = await apiClient.get<CommentsResponse>(`/pull-requests/${prId}/comments`);
    return response.comments;
  },

  // Add a comment
  async addComment(prId: string, input: AddCommentInput): Promise<PullRequestComment> {
    const response = await apiClient.post<CommentResponse>(`/pull-requests/${prId}/comments`, input);
    return response.comment;
  },

  // Delete a comment
  async deleteComment(prId: string, commentId: string): Promise<void> {
    await apiClient.delete(`/pull-requests/${prId}/comments/${commentId}`);
  },

  // Check if PR can be merged
  async canMerge(prId: string): Promise<CanMergeResult> {
    const response = await apiClient.get<{ canMerge: boolean; reason?: string }>(`/pull-requests/${prId}/can-merge`);
    return { canMerge: response.canMerge, reasons: response.reason ? [response.reason] : [] };
  },

  // Merge a PR
  async merge(prId: string): Promise<PullRequest> {
    const response = await apiClient.post<PRResponse>(`/pull-requests/${prId}/merge`);
    return response.pullRequest;
  },
};
