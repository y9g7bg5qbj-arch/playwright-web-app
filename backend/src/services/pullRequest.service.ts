/**
 * Pull Request Service
 *
 * Manages pull requests for sandbox-to-main branch merges.
 * Supports dual-path: local git (default) or GitHub-backed PRs
 * when `useGitHubPrSync` is enabled in project settings.
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { pullRequestRepository, pullRequestReviewRepository, pullRequestCommentRepository, pullRequestFileRepository, projectSettingsRepository, sandboxRepository, sandboxFileRepository, userRepository, projectRepository, applicationRepository, githubIntegrationRepository } from '../db/repositories/mongo';
import { gitService, GitDiffResult, GitFileDiff } from './git.service';
import { githubService } from './github.service';
import { githubFileToFileDiff, githubFilesToDiffSummary, type GitHubPRFile } from '../utils/githubDiffParser';
import { collectDirectoryFiles, buildDiffSummary, buildFileDiff, buildAllFileDiffs } from '../utils/diff';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { normalizeRole, hasPermission } from '../middleware/rbac';
import type { MongoProjectSettings } from '../db/repositories/mongo/pullRequests';

const VERO_PROJECTS_BASE = process.env.VERO_PROJECTS_PATH || path.join(process.cwd(), 'vero-projects');

export interface CreatePullRequestInput {
  title: string;
  description?: string;
  selectedFiles?: string[];
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

export interface PullRequestWithDetails {
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
  status: string;
  createdAt: Date;
  updatedAt: Date;
  mergedAt: Date | null;
  mergedById: string | null;
  mergedByName: string | null;
  closedAt: Date | null;
  reviewCount: number;
  approvalCount: number;
  changesRequestedCount: number;
  commentCount: number;
  fileCount: number;
}

export interface PRReviewWithUser {
  id: string;
  reviewerId: string;
  reviewerName: string | null;
  reviewerEmail: string;
  status: string;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PRCommentWithUser {
  id: string;
  authorId: string;
  authorName: string | null;
  authorEmail: string;
  body: string;
  filePath: string | null;
  lineNumber: number | null;
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class PullRequestService {
  /**
   * Build PullRequestWithDetails from a PR record by fetching related entities
   */
  private async buildPRWithDetails(pr: {
    id: string;
    number: number;
    title: string;
    description?: string | null;
    authorId: string;
    sandboxId: string;
    projectId: string;
    targetBranch: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    mergedAt?: Date | null;
    mergedById?: string | null;
    closedAt?: Date | null;
  }): Promise<PullRequestWithDetails> {
    const [author, sandbox, mergedBy, reviews, comments, files] = await Promise.all([
      userRepository.findById(pr.authorId),
      sandboxRepository.findById(pr.sandboxId),
      pr.mergedById ? userRepository.findById(pr.mergedById) : null,
      pullRequestReviewRepository.findByPullRequestId(pr.id),
      pullRequestCommentRepository.countByPullRequestId(pr.id),
      pullRequestFileRepository.countByPullRequestId(pr.id),
    ]);

    const approvalCount = reviews.filter(r => r.status === 'approved').length;
    const changesRequestedCount = reviews.filter(r => r.status === 'changes_requested').length;

    return {
      id: pr.id,
      number: pr.number,
      title: pr.title,
      description: pr.description || null,
      authorId: pr.authorId,
      authorName: author?.name || null,
      authorEmail: author?.email || 'unknown',
      sandboxId: pr.sandboxId,
      sandboxName: sandbox?.name || 'unknown',
      projectId: pr.projectId,
      targetBranch: pr.targetBranch,
      status: pr.status,
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt,
      mergedAt: pr.mergedAt || null,
      mergedById: pr.mergedById || null,
      mergedByName: mergedBy?.name || null,
      closedAt: pr.closedAt || null,
      reviewCount: reviews.length,
      approvalCount,
      changesRequestedCount,
      commentCount: comments,
      fileCount: files,
    };
  }

  /**
   * Resolve the project path and sandbox details for a PR
   */
  private async resolvePRProjectPath(pullRequestId: string): Promise<{
    pr: { id: string; targetBranch: string; sandboxId: string; projectId: string; authorId: string; status: string; githubPrNumber?: number };
    sandbox: { folderPath: string; id: string };
    projectPath: string;
  }> {
    const pr = await pullRequestRepository.findById(pullRequestId);
    if (!pr) {
      throw new Error('Pull request not found');
    }

    const sandbox = await sandboxRepository.findById(pr.sandboxId);
    if (!sandbox) {
      throw new Error('Sandbox not found');
    }

    const project = await projectRepository.findById(sandbox.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const application = await applicationRepository.findById(project.applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    const projectPath = project.veroPath || path.join(VERO_PROJECTS_BASE, application.id, project.id);

    return { pr, sandbox, projectPath };
  }

  /**
   * Check if GitHub PR sync is enabled for a project and validate the token.
   * Returns settings if GitHub path should be used, null otherwise.
   */
  private async getGitHubConfig(projectId: string, userId: string): Promise<{
    settings: MongoProjectSettings;
    owner: string;
    repo: string;
    baseBranch: string;
  } | null> {
    const settings = await projectSettingsRepository.findByProjectId(projectId);
    if (!settings?.useGitHubPrSync || !settings.githubRepoFullName) {
      return null;
    }

    // Validate GitHub token
    const integration = await githubIntegrationRepository.findByUserId(userId);
    if (!integration?.accessToken) {
      throw new AppError(400, 'GitHub integration required. Connect your GitHub account in Settings.');
    }

    const [owner, repo] = settings.githubRepoFullName.split('/');
    if (!owner || !repo) {
      throw new AppError(400, 'Invalid GitHub repository configuration. Check project settings.');
    }

    return {
      settings,
      owner,
      repo,
      baseBranch: settings.githubBaseBranch || 'main',
    };
  }

  /**
   * Resolve which user's GitHub token to use for API calls.
   * Prefers the requesting user's token; falls back to the PR author's.
   */
  private async resolveGitHubTokenUser(requestingUserId: string | undefined, authorId: string): Promise<string> {
    if (requestingUserId) {
      const integration = await githubIntegrationRepository.findByUserId(requestingUserId);
      if (integration?.accessToken) {
        return requestingUserId;
      }
    }
    return authorId;
  }

  /**
   * Ensure sandbox files are stored in the database for stateless GitHub push.
   * Hydrates from disk on first call (cold-start).
   */
  private async ensureSandboxFiles(sandboxId: string, sandboxFolderPath: string, projectPath: string, projectId: string): Promise<Map<string, string>> {
    // Check if files already exist in DB
    const existing = await sandboxFileRepository.findBySandboxIdAsMap(sandboxId);
    if (existing.size > 0) {
      return existing;
    }

    // Cold-start: hydrate from disk
    // sandboxFolderPath is already "sandboxes/<name>", so join directly with projectPath
    const sandboxPath = path.join(projectPath, sandboxFolderPath);
    const files = await collectDirectoryFiles(sandboxPath);
    if (files.size > 0) {
      await sandboxFileRepository.upsertMany(sandboxId, files, projectId);
    }
    return files;
  }

  /**
   * Create a new pull request from a sandbox
   */
  async create(userId: string, sandboxId: string, input: CreatePullRequestInput): Promise<PullRequestWithDetails> {
    // Get sandbox details
    const sandbox = await sandboxRepository.findById(sandboxId);

    if (!sandbox) {
      throw new AppError(404, 'Sandbox not found');
    }

    // Only sandbox owner can create PR
    if (sandbox.ownerId !== userId) {
      throw new AppError(403, 'Only sandbox owner can create pull request');
    }

    if (sandbox.status !== 'active') {
      throw new AppError(409, 'Cannot create PR from archived or merged sandbox');
    }

    // Get owner and project details
    const [owner, project] = await Promise.all([
      userRepository.findById(sandbox.ownerId),
      projectRepository.findById(sandbox.projectId),
    ]);

    if (!owner || !project) {
      throw new AppError(404, 'Owner or project not found');
    }

    const application = await applicationRepository.findById(project.applicationId);
    if (!application) {
      throw new AppError(404, 'Application not found');
    }

    // Check if there's already an open PR for this sandbox
    const existingPRs = await pullRequestRepository.findOpenBySandboxId(sandboxId);
    if (existingPRs.length > 0) {
      throw new AppError(409, 'A pull request already exists for this sandbox');
    }

    // Get next PR number for this project
    const prNumber = await pullRequestRepository.getNextPRNumber(project.id);
    const targetBranch = 'dev';
    const projectPath = project.veroPath || path.join(VERO_PROJECTS_BASE, application.id, project.id);

    // Check for GitHub sync
    const githubConfig = await this.getGitHubConfig(project.id, userId);

    let diffFiles: Array<{ filePath: string; changeType: 'added' | 'modified' | 'deleted'; additions: number; deletions: number }>;
    let githubPrNumber: number | undefined;

    if (githubConfig) {
      // === GitHub Path (fully stateless — no local disk reads) ===
      const { owner: ghOwner, repo: ghRepo, baseBranch } = githubConfig;
      const branchName = `vero/sandbox-${sandbox.id.slice(0, 8)}`;

      // Ensure sandbox files are in DB, then sync to GitHub (including tombstoned deletions)
      await this.ensureSandboxFiles(sandbox.id, sandbox.folderPath, projectPath, project.id);
      let fileMap = await sandboxFileRepository.findBySandboxIdWithDeletions(sandbox.id);

      // Filter to selected files for GitHub sync
      if (input.selectedFiles && input.selectedFiles.length > 0) {
        const selectedSet = new Set(input.selectedFiles);
        const filteredMap = new Map<string, string | null>();
        for (const [filePath, content] of fileMap) {
          if (selectedSet.has(filePath)) {
            filteredMap.set(filePath, content);
          }
        }
        fileMap = filteredMap;
      }

      await githubService.syncSandboxToBranch(userId, ghOwner, ghRepo, branchName, baseBranch, fileMap);

      // Create GitHub PR
      const ghPR = await githubService.createGitHubPR(
        userId, ghOwner, ghRepo,
        branchName, baseBranch,
        input.title, input.description
      );
      githubPrNumber = ghPR.number;

      // Fetch file diff from GitHub (authoritative — no local disk dependency)
      const ghFiles = await githubService.getGitHubPRFiles(userId, ghOwner, ghRepo, ghPR.number);
      const summary = githubFilesToDiffSummary(ghFiles as GitHubPRFile[]);
      diffFiles = summary.files;
    } else {
      // === Local Folder-Based Path ===
      try {
        const targetDir = path.join(projectPath, targetBranch);
        const sandboxDir = path.join(projectPath, sandbox.folderPath);
        const [targetFiles, sandboxFiles] = await Promise.all([
          collectDirectoryFiles(targetDir),
          collectDirectoryFiles(sandboxDir),
        ]);
        const summary = buildDiffSummary(targetFiles, sandboxFiles);
        diffFiles = summary.files.map(f => ({
          filePath: f.filePath,
          changeType: f.changeType as 'added' | 'modified' | 'deleted',
          additions: f.additions,
          deletions: f.deletions,
        }));
      } catch (error) {
        throw new AppError(400, `Cannot compute diff: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    // Filter to selected files if provided
    if (input.selectedFiles && input.selectedFiles.length > 0) {
      const selectedSet = new Set(input.selectedFiles);
      diffFiles = diffFiles.filter(f => selectedSet.has(f.filePath));
    }

    // Create pull request record
    const pullRequest = await pullRequestRepository.create({
      number: prNumber,
      title: input.title,
      description: input.description,
      authorId: userId,
      sandboxId,
      projectId: sandbox.projectId,
      targetBranch,
      status: 'draft',
      githubPrNumber,
    });

    // Create file change records
    if (diffFiles.length > 0) {
      await pullRequestFileRepository.createMany(pullRequest.id, diffFiles);
    }

    return {
      id: pullRequest.id,
      number: pullRequest.number,
      title: pullRequest.title,
      description: pullRequest.description || null,
      authorId: pullRequest.authorId,
      authorName: owner.name || null,
      authorEmail: owner.email,
      sandboxId: pullRequest.sandboxId,
      sandboxName: sandbox.name,
      projectId: pullRequest.projectId,
      targetBranch: pullRequest.targetBranch,
      status: pullRequest.status,
      createdAt: pullRequest.createdAt,
      updatedAt: pullRequest.updatedAt,
      mergedAt: pullRequest.mergedAt || null,
      mergedById: pullRequest.mergedById || null,
      mergedByName: null,
      closedAt: pullRequest.closedAt || null,
      reviewCount: 0,
      approvalCount: 0,
      changesRequestedCount: 0,
      commentCount: 0,
      fileCount: diffFiles.length,
    };
  }

  /**
   * Get a diff preview between sandbox and dev WITHOUT creating a PR.
   * Used by the frontend to show file selection checkboxes before creation.
   */
  async getDiffPreview(userId: string, sandboxId: string): Promise<{
    files: Array<{ filePath: string; changeType: 'added' | 'modified' | 'deleted'; additions: number; deletions: number }>;
    totalAdditions: number;
    totalDeletions: number;
  }> {
    const sandbox = await sandboxRepository.findById(sandboxId);
    if (!sandbox) {
      throw new AppError(404, 'Sandbox not found');
    }

    if (sandbox.status !== 'active') {
      throw new AppError(409, 'Cannot preview diff from archived or merged sandbox');
    }

    const project = await projectRepository.findById(sandbox.projectId);
    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    const application = await applicationRepository.findById(project.applicationId);
    if (!application) {
      throw new AppError(404, 'Application not found');
    }

    const projectPath = project.veroPath || path.join(VERO_PROJECTS_BASE, application.id, project.id);
    const targetBranch = 'dev';

    const targetDir = path.join(projectPath, targetBranch);
    const sandboxDir = path.join(projectPath, sandbox.folderPath);
    const [targetFiles, sandboxFiles] = await Promise.all([
      collectDirectoryFiles(targetDir),
      collectDirectoryFiles(sandboxDir),
    ]);
    const summary = buildDiffSummary(targetFiles, sandboxFiles);
    return {
      files: summary.files.map(f => ({
        filePath: f.filePath,
        changeType: f.changeType as 'added' | 'modified' | 'deleted',
        additions: f.additions,
        deletions: f.deletions,
      })),
      totalAdditions: summary.totalAdditions,
      totalDeletions: summary.totalDeletions,
    };
  }

  /**
   * List pull requests for a project
   */
  async listByProject(projectId: string, status?: string): Promise<PullRequestWithDetails[]> {
    const pullRequests = await pullRequestRepository.findByProjectId(projectId, status);
    return Promise.all(pullRequests.map(pr => this.buildPRWithDetails(pr)));
  }

  /**
   * Get pull request by ID with full details
   */
  async getById(pullRequestId: string): Promise<PullRequestWithDetails | null> {
    const pr = await pullRequestRepository.findById(pullRequestId);
    if (!pr) return null;
    return this.buildPRWithDetails(pr);
  }

  /**
   * Mark PR as ready for review (draft -> open)
   */
  async openForReview(pullRequestId: string, userId: string): Promise<PullRequestWithDetails> {
    const pr = await pullRequestRepository.findById(pullRequestId);

    if (!pr) {
      throw new AppError(404, 'Pull request not found');
    }

    if (pr.authorId !== userId) {
      throw new AppError(403, 'Only the author can open a PR for review');
    }

    if (pr.status !== 'draft') {
      throw new AppError(409, 'Only draft PRs can be opened for review');
    }

    await pullRequestRepository.update(pullRequestId, { status: 'open' });

    return this.getById(pullRequestId) as Promise<PullRequestWithDetails>;
  }

  /**
   * Update PR title/description
   */
  async update(pullRequestId: string, userId: string, data: { title?: string; description?: string }): Promise<PullRequestWithDetails> {
    const pr = await pullRequestRepository.findById(pullRequestId);

    if (!pr) {
      throw new AppError(404, 'Pull request not found');
    }

    if (pr.authorId !== userId) {
      throw new AppError(403, 'Only the author can update a PR');
    }

    if (pr.status === 'merged' || pr.status === 'closed') {
      throw new AppError(409, 'Cannot update a merged or closed PR');
    }

    await pullRequestRepository.update(pullRequestId, {
      title: data.title,
      description: data.description,
    });

    return this.getById(pullRequestId) as Promise<PullRequestWithDetails>;
  }

  /**
   * Close a PR without merging
   */
  async close(pullRequestId: string, userId: string): Promise<void> {
    const pr = await pullRequestRepository.findById(pullRequestId);

    if (!pr) {
      throw new AppError(404, 'Pull request not found');
    }

    // Author or users with manage:projects permission can close
    if (pr.authorId !== userId) {
      const user = await userRepository.findById(userId);
      if (!user || !hasPermission(normalizeRole(user.role), 'manage:projects')) {
        throw new AppError(403, 'Only the author or admin/lead can close a PR');
      }
    }

    await pullRequestRepository.update(pullRequestId, {
      status: 'closed',
      closedAt: new Date(),
    });
  }

  /**
   * Permanently delete a closed PR and all related metadata.
   */
  async deleteClosed(pullRequestId: string, userId: string): Promise<void> {
    const pr = await pullRequestRepository.findById(pullRequestId);

    if (!pr) {
      throw new AppError(404, 'Pull request not found');
    }

    if (pr.status !== 'closed') {
      throw new AppError(409, 'Only closed pull requests can be permanently deleted');
    }

    // Author or users with manage:projects permission can delete
    if (pr.authorId !== userId) {
      const user = await userRepository.findById(userId);
      if (!user || !hasPermission(normalizeRole(user.role), 'manage:projects')) {
        throw new AppError(403, 'Only the author or admin/lead can delete a closed PR');
      }
    }

    await pullRequestReviewRepository.deleteByPullRequestId(pullRequestId);
    await pullRequestCommentRepository.deleteByPullRequestId(pullRequestId);
    await pullRequestFileRepository.deleteByPullRequestId(pullRequestId);

    const deleted = await pullRequestRepository.delete(pullRequestId);
    if (!deleted) {
      throw new AppError(500, 'Failed to delete pull request');
    }
  }

  /**
   * Submit a review on a PR
   */
  async submitReview(pullRequestId: string, userId: string, input: SubmitReviewInput): Promise<PRReviewWithUser> {
    const pr = await pullRequestRepository.findById(pullRequestId);

    if (!pr) {
      throw new AppError(404, 'Pull request not found');
    }

    if (pr.status !== 'open') {
      throw new AppError(409, `Can only review open PRs (current status: ${pr.status})`);
    }

    // Check if user can review (not author, has reviewer permissions)
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Get project settings
    const settings = await projectSettingsRepository.findByProjectId(pr.projectId);

    // Check self-approval
    if (pr.authorId === userId && !settings?.allowSelfApproval) {
      throw new AppError(403, 'Cannot review your own PR');
    }

    // Check role permissions for approval
    if (input.status === 'approved') {
      if (!hasPermission(normalizeRole(user.role), 'approve:pr')) {
        throw new AppError(403, 'You do not have permission to approve PRs');
      }
    }

    // Create or update review
    const review = await pullRequestReviewRepository.upsert(pullRequestId, userId, {
      status: input.status,
      comment: input.comment,
    });

    // Check if PR should be marked as approved
    const requiredApprovals = settings?.requiredApprovals || 1;
    const approvals = await pullRequestReviewRepository.countByStatus(pullRequestId, 'approved');

    if (approvals >= requiredApprovals) {
      await pullRequestRepository.update(pullRequestId, { status: 'approved' });
    } else if (input.status === 'changes_requested') {
      // Reset to open if changes requested
      await pullRequestRepository.update(pullRequestId, { status: 'open' });
    }

    return {
      id: review.id,
      reviewerId: review.reviewerId,
      reviewerName: user.name || null,
      reviewerEmail: user.email,
      status: review.status,
      comment: review.comment || null,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  /**
   * Get reviews for a PR
   */
  async getReviews(pullRequestId: string): Promise<PRReviewWithUser[]> {
    const reviews = await pullRequestReviewRepository.findByPullRequestId(pullRequestId);

    const results: PRReviewWithUser[] = [];
    for (const review of reviews) {
      const reviewer = await userRepository.findById(review.reviewerId);
      results.push({
        id: review.id,
        reviewerId: review.reviewerId,
        reviewerName: reviewer?.name || null,
        reviewerEmail: reviewer?.email || 'unknown',
        status: review.status,
        comment: review.comment || null,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      });
    }

    return results;
  }

  /**
   * Add a comment to a PR
   */
  async addComment(pullRequestId: string, userId: string, input: AddCommentInput): Promise<PRCommentWithUser> {
    const pr = await pullRequestRepository.findById(pullRequestId);

    if (!pr) {
      throw new Error('Pull request not found');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const comment = await pullRequestCommentRepository.create({
      pullRequestId,
      authorId: userId,
      body: input.body,
      filePath: input.filePath,
      lineNumber: input.lineNumber,
      resolved: false,
    });

    return {
      id: comment.id,
      authorId: comment.authorId,
      authorName: user.name || null,
      authorEmail: user.email,
      body: comment.body,
      filePath: comment.filePath || null,
      lineNumber: comment.lineNumber || null,
      resolved: comment.resolved,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  /**
   * Get comments for a PR
   */
  async getComments(pullRequestId: string): Promise<PRCommentWithUser[]> {
    const comments = await pullRequestCommentRepository.findByPullRequestId(pullRequestId);

    const results: PRCommentWithUser[] = [];
    for (const comment of comments) {
      const author = await userRepository.findById(comment.authorId);
      results.push({
        id: comment.id,
        authorId: comment.authorId,
        authorName: author?.name || null,
        authorEmail: author?.email || 'unknown',
        body: comment.body,
        filePath: comment.filePath || null,
        lineNumber: comment.lineNumber || null,
        resolved: comment.resolved,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      });
    }

    return results;
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await pullRequestCommentRepository.findById(commentId);

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new Error('Only the author can delete a comment');
    }

    await pullRequestCommentRepository.delete(commentId);
  }

  /**
   * Get diff for a PR (dual-path: GitHub or local git)
   */
  async getDiff(pullRequestId: string, userId?: string): Promise<GitDiffResult> {
    const { pr, sandbox, projectPath } = await this.resolvePRProjectPath(pullRequestId);

    // GitHub path: use GitHub API to fetch PR files
    if (pr.githubPrNumber) {
      const settings = await projectSettingsRepository.findByProjectId(pr.projectId);
      if (settings?.useGitHubPrSync && settings.githubRepoFullName) {
        const [owner, repo] = settings.githubRepoFullName.split('/');
        const tokenUserId = await this.resolveGitHubTokenUser(userId, pr.authorId);
        const ghFiles = await githubService.getGitHubPRFiles(tokenUserId, owner, repo, pr.githubPrNumber);
        const summary = githubFilesToDiffSummary(ghFiles as GitHubPRFile[]);
        return {
          files: summary.files,
          totalAdditions: summary.totalAdditions,
          totalDeletions: summary.totalDeletions,
        };
      }
    }

    // Local folder-based diff
    const targetDir = path.join(projectPath, pr.targetBranch);
    const sandboxDir = path.join(projectPath, sandbox.folderPath);
    const [targetFiles, sandboxFiles] = await Promise.all([
      collectDirectoryFiles(targetDir),
      collectDirectoryFiles(sandboxDir),
    ]);
    const summary = buildDiffSummary(targetFiles, sandboxFiles);
    return {
      files: summary.files,
      totalAdditions: summary.totalAdditions,
      totalDeletions: summary.totalDeletions,
    };
  }

  /**
   * Get detailed diff for a specific file in a PR (dual-path)
   */
  async getFileDiff(pullRequestId: string, filePath: string, userId?: string): Promise<GitFileDiff> {
    const { pr, sandbox, projectPath } = await this.resolvePRProjectPath(pullRequestId);

    // GitHub path
    if (pr.githubPrNumber) {
      const settings = await projectSettingsRepository.findByProjectId(pr.projectId);
      if (settings?.useGitHubPrSync && settings.githubRepoFullName) {
        const [owner, repo] = settings.githubRepoFullName.split('/');
        const tokenUserId = await this.resolveGitHubTokenUser(userId, pr.authorId);
        const ghFiles = await githubService.getGitHubPRFiles(tokenUserId, owner, repo, pr.githubPrNumber);
        const targetFile = (ghFiles as GitHubPRFile[]).find(f => f.filename === filePath);
        if (!targetFile) {
          return { filePath, hunks: [] };
        }
        const diff = githubFileToFileDiff(targetFile);
        return { filePath: diff.filePath, hunks: diff.hunks };
      }
    }

    // Local folder-based diff
    const targetDir = path.join(projectPath, pr.targetBranch);
    const sandboxDir = path.join(projectPath, sandbox.folderPath);
    const [targetFiles, sandboxFiles] = await Promise.all([
      collectDirectoryFiles(targetDir),
      collectDirectoryFiles(sandboxDir),
    ]);
    const diff = buildFileDiff(filePath, targetFiles.get(filePath), sandboxFiles.get(filePath));
    return { filePath: diff.filePath, hunks: diff.hunks };
  }

  /**
   * Get all file diffs for a PR (dual-path)
   */
  async getAllFileDiffs(pullRequestId: string, userId?: string): Promise<GitFileDiff[]> {
    const { pr, sandbox, projectPath } = await this.resolvePRProjectPath(pullRequestId);

    // GitHub path
    if (pr.githubPrNumber) {
      const settings = await projectSettingsRepository.findByProjectId(pr.projectId);
      if (settings?.useGitHubPrSync && settings.githubRepoFullName) {
        const [owner, repo] = settings.githubRepoFullName.split('/');
        const tokenUserId = await this.resolveGitHubTokenUser(userId, pr.authorId);
        const ghFiles = await githubService.getGitHubPRFiles(tokenUserId, owner, repo, pr.githubPrNumber);
        return (ghFiles as GitHubPRFile[]).map(f => {
          const diff = githubFileToFileDiff(f);
          return { filePath: diff.filePath, hunks: diff.hunks };
        });
      }
    }

    // Local folder-based diff
    const targetDir = path.join(projectPath, pr.targetBranch);
    const sandboxDir = path.join(projectPath, sandbox.folderPath);
    const [targetFiles, sandboxFiles] = await Promise.all([
      collectDirectoryFiles(targetDir),
      collectDirectoryFiles(sandboxDir),
    ]);
    return buildAllFileDiffs(targetFiles, sandboxFiles).map(d => ({
      filePath: d.filePath,
      hunks: d.hunks,
    }));
  }

  /**
   * Merge a PR (dual-path: GitHub or local git)
   */
  async merge(pullRequestId: string, userId: string): Promise<PullRequestWithDetails> {
    const pr = await pullRequestRepository.findById(pullRequestId);

    if (!pr) {
      throw new AppError(404, 'Pull request not found');
    }

    // Check user permissions to merge
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (!hasPermission(normalizeRole(user.role), 'merge:pr')) {
      throw new AppError(403, 'You do not have permission to merge PRs');
    }

    // Check PR status
    if (pr.status !== 'approved') {
      // Get settings to check if we require approval
      const settings = await projectSettingsRepository.findByProjectId(pr.projectId);

      const requiredApprovals = settings?.requiredApprovals || 1;
      const approvals = await pullRequestReviewRepository.countByStatus(pullRequestId, 'approved');

      if (approvals < requiredApprovals) {
        throw new AppError(409, `PR requires ${requiredApprovals} approval(s). Currently has ${approvals}.`);
      }
    }

    const sandbox = await sandboxRepository.findById(pr.sandboxId);
    if (!sandbox) {
      throw new AppError(404, 'Sandbox not found');
    }

    const project = await projectRepository.findById(sandbox.projectId);
    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    const application = await applicationRepository.findById(project.applicationId);
    if (!application) {
      throw new AppError(404, 'Application not found');
    }

    const projectPath = project.veroPath || path.join(VERO_PROJECTS_BASE, application.id, project.id);

    // Check for GitHub sync
    const githubConfig = await this.getGitHubConfig(project.id, userId);

    if (githubConfig && pr.githubPrNumber) {
      // === GitHub Path ===
      const { owner: ghOwner, repo: ghRepo } = githubConfig;

      // Check mergeability with backoff
      const mergeStatus = await githubService.getPullRequestWithMergeable(
        userId, ghOwner, ghRepo, pr.githubPrNumber
      );

      if (!mergeStatus.mergeable) {
        throw new AppError(409, 'MERGE_CONFLICT: Update Sandbox from Dev to resolve conflicts.');
      }

      // Merge via GitHub API
      const mergeResult = await githubService.mergeGitHubPR(
        userId, ghOwner, ghRepo, pr.githubPrNumber,
        `Merge PR #${pr.number}: ${pr.title}`
      );

      if (!mergeResult.merged) {
        throw new AppError(502, `GitHub merge failed: ${mergeResult.message}`);
      }
    } else {
      // === Local File-Copy Merge ===
      // Only files tracked in the PR are merged (supports selective file inclusion)
      const prFiles = await pullRequestFileRepository.findByPullRequestId(pullRequestId);

      if (prFiles.length === 0) {
        throw new AppError(409, 'No files to merge');
      }

      const targetDir = path.join(projectPath, pr.targetBranch);
      const sandboxDir = path.join(projectPath, sandbox.folderPath);

      for (const file of prFiles) {
        const targetFilePath = path.join(targetDir, file.filePath);
        const sandboxFilePath = path.join(sandboxDir, file.filePath);

        if (file.changeType === 'deleted') {
          try {
            await fs.unlink(targetFilePath);
          } catch (err: any) {
            if (err.code !== 'ENOENT') throw err;
          }
        } else {
          // added or modified: read from sandbox, write to dev
          const content = await fs.readFile(sandboxFilePath, 'utf-8');
          await fs.mkdir(path.dirname(targetFilePath), { recursive: true });
          await fs.writeFile(targetFilePath, content, 'utf-8');
        }
      }
    }

    // Update PR status
    await pullRequestRepository.update(pullRequestId, {
      status: 'merged',
      mergedAt: new Date(),
      mergedById: userId,
    });

    // Archive sandbox
    await sandboxRepository.update(pr.sandboxId, { status: 'merged' });

    // Get settings to check if we should delete sandbox
    const settings = await projectSettingsRepository.findByProjectId(pr.projectId);

    // Optionally delete the git branch (only for local git path)
    if (settings?.autoDeleteSandbox && !githubConfig) {
      try {
        await gitService.deleteBranch(projectPath, sandbox.folderPath, true);
      } catch (error) {
        logger.error('Failed to delete sandbox branch:', error);
      }
    }

    return this.getById(pullRequestId) as Promise<PullRequestWithDetails>;
  }

  /**
   * Check if user can merge a PR
   */
  async canMerge(pullRequestId: string, userId: string): Promise<{ canMerge: boolean; reason?: string }> {
    const pr = await pullRequestRepository.findById(pullRequestId);

    if (!pr) {
      return { canMerge: false, reason: 'Pull request not found' };
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      return { canMerge: false, reason: 'User not found' };
    }

    const canMergeByRole = hasPermission(normalizeRole(user.role), 'merge:pr');
    if (!canMergeByRole) {
      return { canMerge: false, reason: 'Insufficient permissions' };
    }

    // Check approvals
    const settings = await projectSettingsRepository.findByProjectId(pr.projectId);

    const requiredApprovals = settings?.requiredApprovals || 1;
    const approvals = await pullRequestReviewRepository.countByStatus(pullRequestId, 'approved');

    if (approvals < requiredApprovals) {
      return { canMerge: false, reason: `Needs ${requiredApprovals - approvals} more approval(s)` };
    }

    return { canMerge: true };
  }

  /**
   * Get changed files for a PR
   */
  async getChangedFiles(pullRequestId: string): Promise<Array<{
    filePath: string;
    changeType: string;
    additions: number;
    deletions: number;
  }>> {
    const files = await pullRequestFileRepository.findByPullRequestId(pullRequestId);

    return files.map(f => ({
      filePath: f.filePath,
      changeType: f.changeType,
      additions: f.additions,
      deletions: f.deletions,
    }));
  }
}

export const pullRequestService = new PullRequestService();
