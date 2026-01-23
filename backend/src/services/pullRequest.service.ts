/**
 * Pull Request Service
 * NOW USES MONGODB INSTEAD OF PRISMA
 */

import * as path from 'path';
import {
  pullRequestRepository,
  pullRequestReviewRepository,
  pullRequestCommentRepository,
  pullRequestFileRepository,
  projectSettingsRepository,
  sandboxRepository,
  userRepository,
  projectRepository,
  applicationRepository
} from '../db/repositories/mongo';
import { gitService, GitDiffResult, GitFileDiff } from './git.service';

const VERO_PROJECTS_BASE = process.env.VERO_PROJECTS_PATH || path.join(process.cwd(), 'vero-projects');

export interface CreatePullRequestInput {
  title: string;
  description?: string;
  targetBranch?: 'dev' | 'master';
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
   * Create a new pull request from a sandbox
   */
  async create(userId: string, sandboxId: string, input: CreatePullRequestInput): Promise<PullRequestWithDetails> {
    // Get sandbox details
    const sandbox = await sandboxRepository.findById(sandboxId);

    if (!sandbox) {
      throw new Error('Sandbox not found');
    }

    // Only sandbox owner can create PR
    if (sandbox.ownerId !== userId) {
      throw new Error('Only sandbox owner can create pull request');
    }

    if (sandbox.status !== 'active') {
      throw new Error('Cannot create PR from archived or merged sandbox');
    }

    // Get owner and project details
    const [owner, project] = await Promise.all([
      userRepository.findById(sandbox.ownerId),
      projectRepository.findById(sandbox.projectId),
    ]);

    if (!owner || !project) {
      throw new Error('Owner or project not found');
    }

    const application = await applicationRepository.findById(project.applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    // Check if there's already an open PR for this sandbox
    const existingPRs = await pullRequestRepository.findOpenBySandboxId(sandboxId);
    if (existingPRs.length > 0) {
      throw new Error('A pull request already exists for this sandbox');
    }

    // Get next PR number for this project
    const prNumber = await pullRequestRepository.getNextPRNumber(project.id);

    const targetBranch = input.targetBranch || 'dev';

    // Get the project path and diff summary
    const projectPath = project.veroPath || path.join(VERO_PROJECTS_BASE, application.id, project.id);

    let diffResult: GitDiffResult;
    try {
      diffResult = await gitService.getDiffSummary(projectPath, targetBranch, sandbox.folderPath);
    } catch (error) {
      diffResult = { files: [], totalAdditions: 0, totalDeletions: 0 };
    }

    // Create pull request
    const pullRequest = await pullRequestRepository.create({
      number: prNumber,
      title: input.title,
      description: input.description,
      authorId: userId,
      sandboxId,
      projectId: sandbox.projectId,
      targetBranch,
      status: 'draft',
    });

    // Create file change records
    if (diffResult.files.length > 0) {
      await pullRequestFileRepository.createMany(pullRequest.id, diffResult.files.map(f => ({
        filePath: f.filePath,
        changeType: f.changeType as 'added' | 'modified' | 'deleted',
        additions: f.additions,
        deletions: f.deletions,
      })));
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
      fileCount: diffResult.files.length,
    };
  }

  /**
   * List pull requests for a project
   */
  async listByProject(projectId: string, status?: string): Promise<PullRequestWithDetails[]> {
    const pullRequests = await pullRequestRepository.findByProjectId(projectId, status);

    const results: PullRequestWithDetails[] = [];
    for (const pr of pullRequests) {
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

      results.push({
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
      });
    }

    return results;
  }

  /**
   * Get pull request by ID with full details
   */
  async getById(pullRequestId: string): Promise<PullRequestWithDetails | null> {
    const pr = await pullRequestRepository.findById(pullRequestId);

    if (!pr) return null;

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
   * Mark PR as ready for review (draft -> open)
   */
  async openForReview(pullRequestId: string, userId: string): Promise<PullRequestWithDetails> {
    const pr = await pullRequestRepository.findById(pullRequestId);

    if (!pr) {
      throw new Error('Pull request not found');
    }

    if (pr.authorId !== userId) {
      throw new Error('Only the author can open a PR for review');
    }

    if (pr.status !== 'draft') {
      throw new Error('Only draft PRs can be opened for review');
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
      throw new Error('Pull request not found');
    }

    if (pr.authorId !== userId) {
      throw new Error('Only the author can update a PR');
    }

    if (pr.status === 'merged' || pr.status === 'closed') {
      throw new Error('Cannot update a merged or closed PR');
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
      throw new Error('Pull request not found');
    }

    // Author or admin can close
    if (pr.authorId !== userId) {
      const user = await userRepository.findById(userId);
      if (user?.role !== 'admin' && user?.role !== 'qa_lead') {
        throw new Error('Only the author or admin can close a PR');
      }
    }

    await pullRequestRepository.update(pullRequestId, {
      status: 'closed',
      closedAt: new Date(),
    });
  }

  /**
   * Submit a review on a PR
   */
  async submitReview(pullRequestId: string, userId: string, input: SubmitReviewInput): Promise<PRReviewWithUser> {
    const pr = await pullRequestRepository.findById(pullRequestId);

    if (!pr) {
      throw new Error('Pull request not found');
    }

    if (pr.status !== 'open') {
      throw new Error('Can only review open PRs');
    }

    // Check if user can review (not author, has reviewer permissions)
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get project settings
    const settings = await projectSettingsRepository.findByProjectId(pr.projectId);

    // Check self-approval
    if (pr.authorId === userId && !settings?.allowSelfApproval) {
      throw new Error('Cannot review your own PR');
    }

    // Check role permissions for approval
    if (input.status === 'approved') {
      const canApprove = ['senior_qa', 'qa_lead', 'admin'].includes(user.role);
      if (!canApprove) {
        throw new Error('You do not have permission to approve PRs');
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
   * Get diff for a PR
   */
  async getDiff(pullRequestId: string): Promise<GitDiffResult> {
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

    return gitService.getDiffSummary(projectPath, pr.targetBranch, sandbox.folderPath);
  }

  /**
   * Get detailed diff for a specific file in a PR
   */
  async getFileDiff(pullRequestId: string, filePath: string): Promise<GitFileDiff> {
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

    return gitService.getFileDiff(projectPath, pr.targetBranch, sandbox.folderPath, filePath);
  }

  /**
   * Get all file diffs for a PR
   */
  async getAllFileDiffs(pullRequestId: string): Promise<GitFileDiff[]> {
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

    return gitService.getAllFileDiffs(projectPath, pr.targetBranch, sandbox.folderPath);
  }

  /**
   * Merge a PR
   */
  async merge(pullRequestId: string, userId: string): Promise<PullRequestWithDetails> {
    const pr = await pullRequestRepository.findById(pullRequestId);

    if (!pr) {
      throw new Error('Pull request not found');
    }

    // Check user permissions to merge
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const canMerge = ['senior_qa', 'qa_lead', 'admin'].includes(user.role);
    if (!canMerge) {
      throw new Error('You do not have permission to merge PRs');
    }

    // Check PR status
    if (pr.status !== 'approved') {
      // Get settings to check if we require approval
      const settings = await projectSettingsRepository.findByProjectId(pr.projectId);

      const requiredApprovals = settings?.requiredApprovals || 1;
      const approvals = await pullRequestReviewRepository.countByStatus(pullRequestId, 'approved');

      if (approvals < requiredApprovals) {
        throw new Error(`PR requires ${requiredApprovals} approval(s). Currently has ${approvals}.`);
      }
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

    // Checkout target branch and merge
    await gitService.checkoutBranch(projectPath, pr.targetBranch);
    const mergeResult = await gitService.mergeBranch(projectPath, sandbox.folderPath);

    if (!mergeResult.success) {
      throw new Error(`Merge conflicts detected in files: ${mergeResult.conflicts?.join(', ')}`);
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

    // Optionally delete the git branch
    if (settings?.autoDeleteSandbox) {
      try {
        await gitService.deleteBranch(projectPath, sandbox.folderPath, true);
      } catch (error) {
        console.error('Failed to delete sandbox branch:', error);
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

    // Check role
    const hasPermission = ['senior_qa', 'qa_lead', 'admin'].includes(user.role);
    if (!hasPermission) {
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
