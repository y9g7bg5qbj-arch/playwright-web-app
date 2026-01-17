import { prisma } from '../db/prisma';
import { gitService, GitDiffResult, GitFileDiff } from './git.service';
import * as path from 'path';

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
    const sandbox = await prisma.sandbox.findUnique({
      where: { id: sandboxId },
      include: {
        project: { include: { application: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

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

    // Check if there's already an open PR for this sandbox
    const existingPR = await prisma.pullRequest.findFirst({
      where: {
        sandboxId,
        status: { in: ['draft', 'open'] },
      },
    });

    if (existingPR) {
      throw new Error('A pull request already exists for this sandbox');
    }

    // Get next PR number for this project
    const lastPR = await prisma.pullRequest.findFirst({
      where: { projectId: sandbox.projectId },
      orderBy: { number: 'desc' },
    });
    const prNumber = (lastPR?.number || 0) + 1;

    const targetBranch = input.targetBranch || 'dev';

    // Get the project path and diff summary
    const projectPath = sandbox.project.veroPath ||
      path.join(VERO_PROJECTS_BASE, sandbox.project.application.id, sandbox.project.id);

    let diffResult: GitDiffResult;
    try {
      diffResult = await gitService.getDiffSummary(projectPath, targetBranch, sandbox.gitBranch);
    } catch (error) {
      diffResult = { files: [], totalAdditions: 0, totalDeletions: 0 };
    }

    // Create pull request with file changes
    const pullRequest = await prisma.pullRequest.create({
      data: {
        number: prNumber,
        title: input.title,
        description: input.description,
        authorId: userId,
        sandboxId,
        projectId: sandbox.projectId,
        targetBranch,
        status: 'draft',
        changedFiles: {
          create: diffResult.files.map(f => ({
            filePath: f.filePath,
            changeType: f.changeType,
            additions: f.additions,
            deletions: f.deletions,
          })),
        },
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
        sandbox: { select: { name: true } },
        mergedBy: { select: { id: true, name: true } },
        _count: { select: { reviews: true, comments: true, changedFiles: true } },
      },
    });

    // Get approval counts
    const reviews = await prisma.pullRequestReview.groupBy({
      by: ['status'],
      where: { pullRequestId: pullRequest.id },
      _count: true,
    });

    const approvalCount = reviews.find(r => r.status === 'approved')?._count || 0;
    const changesRequestedCount = reviews.find(r => r.status === 'changes_requested')?._count || 0;

    return {
      id: pullRequest.id,
      number: pullRequest.number,
      title: pullRequest.title,
      description: pullRequest.description,
      authorId: pullRequest.authorId,
      authorName: pullRequest.author.name,
      authorEmail: pullRequest.author.email,
      sandboxId: pullRequest.sandboxId,
      sandboxName: pullRequest.sandbox.name,
      projectId: pullRequest.projectId,
      targetBranch: pullRequest.targetBranch,
      status: pullRequest.status,
      createdAt: pullRequest.createdAt,
      updatedAt: pullRequest.updatedAt,
      mergedAt: pullRequest.mergedAt,
      mergedById: pullRequest.mergedById,
      mergedByName: pullRequest.mergedBy?.name || null,
      closedAt: pullRequest.closedAt,
      reviewCount: pullRequest._count.reviews,
      approvalCount,
      changesRequestedCount,
      commentCount: pullRequest._count.comments,
      fileCount: pullRequest._count.changedFiles,
    };
  }

  /**
   * List pull requests for a project
   */
  async listByProject(projectId: string, status?: string): Promise<PullRequestWithDetails[]> {
    const where = {
      projectId,
      ...(status ? { status } : {}),
    };

    const pullRequests = await prisma.pullRequest.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, email: true } },
        sandbox: { select: { name: true } },
        mergedBy: { select: { id: true, name: true } },
        _count: { select: { reviews: true, comments: true, changedFiles: true } },
        reviews: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return pullRequests.map(pr => {
      const approvalCount = pr.reviews.filter(r => r.status === 'approved').length;
      const changesRequestedCount = pr.reviews.filter(r => r.status === 'changes_requested').length;

      return {
        id: pr.id,
        number: pr.number,
        title: pr.title,
        description: pr.description,
        authorId: pr.authorId,
        authorName: pr.author.name,
        authorEmail: pr.author.email,
        sandboxId: pr.sandboxId,
        sandboxName: pr.sandbox.name,
        projectId: pr.projectId,
        targetBranch: pr.targetBranch,
        status: pr.status,
        createdAt: pr.createdAt,
        updatedAt: pr.updatedAt,
        mergedAt: pr.mergedAt,
        mergedById: pr.mergedById,
        mergedByName: pr.mergedBy?.name || null,
        closedAt: pr.closedAt,
        reviewCount: pr._count.reviews,
        approvalCount,
        changesRequestedCount,
        commentCount: pr._count.comments,
        fileCount: pr._count.changedFiles,
      };
    });
  }

  /**
   * Get pull request by ID with full details
   */
  async getById(pullRequestId: string): Promise<PullRequestWithDetails | null> {
    const pr = await prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
      include: {
        author: { select: { id: true, name: true, email: true } },
        sandbox: { select: { name: true } },
        mergedBy: { select: { id: true, name: true } },
        _count: { select: { reviews: true, comments: true, changedFiles: true } },
        reviews: { select: { status: true } },
      },
    });

    if (!pr) return null;

    const approvalCount = pr.reviews.filter(r => r.status === 'approved').length;
    const changesRequestedCount = pr.reviews.filter(r => r.status === 'changes_requested').length;

    return {
      id: pr.id,
      number: pr.number,
      title: pr.title,
      description: pr.description,
      authorId: pr.authorId,
      authorName: pr.author.name,
      authorEmail: pr.author.email,
      sandboxId: pr.sandboxId,
      sandboxName: pr.sandbox.name,
      projectId: pr.projectId,
      targetBranch: pr.targetBranch,
      status: pr.status,
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt,
      mergedAt: pr.mergedAt,
      mergedById: pr.mergedById,
      mergedByName: pr.mergedBy?.name || null,
      closedAt: pr.closedAt,
      reviewCount: pr._count.reviews,
      approvalCount,
      changesRequestedCount,
      commentCount: pr._count.comments,
      fileCount: pr._count.changedFiles,
    };
  }

  /**
   * Mark PR as ready for review (draft -> open)
   */
  async openForReview(pullRequestId: string, userId: string): Promise<PullRequestWithDetails> {
    const pr = await prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
    });

    if (!pr) {
      throw new Error('Pull request not found');
    }

    if (pr.authorId !== userId) {
      throw new Error('Only the author can open a PR for review');
    }

    if (pr.status !== 'draft') {
      throw new Error('Only draft PRs can be opened for review');
    }

    await prisma.pullRequest.update({
      where: { id: pullRequestId },
      data: { status: 'open' },
    });

    return this.getById(pullRequestId) as Promise<PullRequestWithDetails>;
  }

  /**
   * Update PR title/description
   */
  async update(pullRequestId: string, userId: string, data: { title?: string; description?: string }): Promise<PullRequestWithDetails> {
    const pr = await prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
    });

    if (!pr) {
      throw new Error('Pull request not found');
    }

    if (pr.authorId !== userId) {
      throw new Error('Only the author can update a PR');
    }

    if (pr.status === 'merged' || pr.status === 'closed') {
      throw new Error('Cannot update a merged or closed PR');
    }

    await prisma.pullRequest.update({
      where: { id: pullRequestId },
      data: {
        title: data.title,
        description: data.description,
      },
    });

    return this.getById(pullRequestId) as Promise<PullRequestWithDetails>;
  }

  /**
   * Close a PR without merging
   */
  async close(pullRequestId: string, userId: string): Promise<void> {
    const pr = await prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
    });

    if (!pr) {
      throw new Error('Pull request not found');
    }

    // Author or admin can close
    if (pr.authorId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'admin' && user?.role !== 'qa_lead') {
        throw new Error('Only the author or admin can close a PR');
      }
    }

    await prisma.pullRequest.update({
      where: { id: pullRequestId },
      data: {
        status: 'closed',
        closedAt: new Date(),
      },
    });
  }

  /**
   * Submit a review on a PR
   */
  async submitReview(pullRequestId: string, userId: string, input: SubmitReviewInput): Promise<PRReviewWithUser> {
    const pr = await prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
      include: { project: { include: { application: { include: { members: true } } } } },
    });

    if (!pr) {
      throw new Error('Pull request not found');
    }

    if (pr.status !== 'open') {
      throw new Error('Can only review open PRs');
    }

    // Check if user can review (not author, has reviewer permissions)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Get project settings
    const settings = await prisma.projectSettings.findUnique({
      where: { projectId: pr.projectId },
    });

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
    const review = await prisma.pullRequestReview.upsert({
      where: {
        pullRequestId_reviewerId: {
          pullRequestId,
          reviewerId: userId,
        },
      },
      create: {
        pullRequestId,
        reviewerId: userId,
        status: input.status,
        comment: input.comment,
      },
      update: {
        status: input.status,
        comment: input.comment,
      },
      include: {
        reviewer: { select: { id: true, name: true, email: true } },
      },
    });

    // Check if PR should be marked as approved
    const requiredApprovals = settings?.requiredApprovals || 1;
    const approvals = await prisma.pullRequestReview.count({
      where: { pullRequestId, status: 'approved' },
    });

    if (approvals >= requiredApprovals) {
      await prisma.pullRequest.update({
        where: { id: pullRequestId },
        data: { status: 'approved' },
      });
    } else if (input.status === 'changes_requested') {
      // Reset to open if changes requested
      await prisma.pullRequest.update({
        where: { id: pullRequestId },
        data: { status: 'open' },
      });
    }

    return {
      id: review.id,
      reviewerId: review.reviewerId,
      reviewerName: review.reviewer.name,
      reviewerEmail: review.reviewer.email,
      status: review.status,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  /**
   * Get reviews for a PR
   */
  async getReviews(pullRequestId: string): Promise<PRReviewWithUser[]> {
    const reviews = await prisma.pullRequestReview.findMany({
      where: { pullRequestId },
      include: {
        reviewer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map(r => ({
      id: r.id,
      reviewerId: r.reviewerId,
      reviewerName: r.reviewer.name,
      reviewerEmail: r.reviewer.email,
      status: r.status,
      comment: r.comment,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  /**
   * Add a comment to a PR
   */
  async addComment(pullRequestId: string, userId: string, input: AddCommentInput): Promise<PRCommentWithUser> {
    const pr = await prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
    });

    if (!pr) {
      throw new Error('Pull request not found');
    }

    const comment = await prisma.pullRequestComment.create({
      data: {
        pullRequestId,
        authorId: userId,
        body: input.body,
        filePath: input.filePath,
        lineNumber: input.lineNumber,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      id: comment.id,
      authorId: comment.authorId,
      authorName: comment.author.name,
      authorEmail: comment.author.email,
      body: comment.body,
      filePath: comment.filePath,
      lineNumber: comment.lineNumber,
      resolved: comment.resolved,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  /**
   * Get comments for a PR
   */
  async getComments(pullRequestId: string): Promise<PRCommentWithUser[]> {
    const comments = await prisma.pullRequestComment.findMany({
      where: { pullRequestId },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return comments.map(c => ({
      id: c.id,
      authorId: c.authorId,
      authorName: c.author.name,
      authorEmail: c.author.email,
      body: c.body,
      filePath: c.filePath,
      lineNumber: c.lineNumber,
      resolved: c.resolved,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await prisma.pullRequestComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new Error('Only the author can delete a comment');
    }

    await prisma.pullRequestComment.delete({ where: { id: commentId } });
  }

  /**
   * Get diff for a PR
   */
  async getDiff(pullRequestId: string): Promise<GitDiffResult> {
    const pr = await prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
      include: {
        sandbox: {
          include: { project: { include: { application: true } } },
        },
      },
    });

    if (!pr) {
      throw new Error('Pull request not found');
    }

    const projectPath = pr.sandbox.project.veroPath ||
      path.join(VERO_PROJECTS_BASE, pr.sandbox.project.application.id, pr.sandbox.project.id);

    return gitService.getDiffSummary(projectPath, pr.targetBranch, pr.sandbox.gitBranch);
  }

  /**
   * Get detailed diff for a specific file in a PR
   */
  async getFileDiff(pullRequestId: string, filePath: string): Promise<GitFileDiff> {
    const pr = await prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
      include: {
        sandbox: {
          include: { project: { include: { application: true } } },
        },
      },
    });

    if (!pr) {
      throw new Error('Pull request not found');
    }

    const projectPath = pr.sandbox.project.veroPath ||
      path.join(VERO_PROJECTS_BASE, pr.sandbox.project.application.id, pr.sandbox.project.id);

    return gitService.getFileDiff(projectPath, pr.targetBranch, pr.sandbox.gitBranch, filePath);
  }

  /**
   * Get all file diffs for a PR
   */
  async getAllFileDiffs(pullRequestId: string): Promise<GitFileDiff[]> {
    const pr = await prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
      include: {
        sandbox: {
          include: { project: { include: { application: true } } },
        },
      },
    });

    if (!pr) {
      throw new Error('Pull request not found');
    }

    const projectPath = pr.sandbox.project.veroPath ||
      path.join(VERO_PROJECTS_BASE, pr.sandbox.project.application.id, pr.sandbox.project.id);

    return gitService.getAllFileDiffs(projectPath, pr.targetBranch, pr.sandbox.gitBranch);
  }

  /**
   * Merge a PR
   */
  async merge(pullRequestId: string, userId: string): Promise<PullRequestWithDetails> {
    const pr = await prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
      include: {
        sandbox: {
          include: { project: { include: { application: true } } },
        },
      },
    });

    if (!pr) {
      throw new Error('Pull request not found');
    }

    // Check user permissions to merge
    const user = await prisma.user.findUnique({ where: { id: userId } });
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
      const settings = await prisma.projectSettings.findUnique({
        where: { projectId: pr.projectId },
      });

      const requiredApprovals = settings?.requiredApprovals || 1;
      const approvals = await prisma.pullRequestReview.count({
        where: { pullRequestId, status: 'approved' },
      });

      if (approvals < requiredApprovals) {
        throw new Error(`PR requires ${requiredApprovals} approval(s). Currently has ${approvals}.`);
      }
    }

    const projectPath = pr.sandbox.project.veroPath ||
      path.join(VERO_PROJECTS_BASE, pr.sandbox.project.application.id, pr.sandbox.project.id);

    // Checkout target branch and merge
    await gitService.checkoutBranch(projectPath, pr.targetBranch);
    const mergeResult = await gitService.mergeBranch(projectPath, pr.sandbox.gitBranch);

    if (!mergeResult.success) {
      throw new Error(`Merge conflicts detected in files: ${mergeResult.conflicts?.join(', ')}`);
    }

    // Update PR status
    await prisma.pullRequest.update({
      where: { id: pullRequestId },
      data: {
        status: 'merged',
        mergedAt: new Date(),
        mergedById: userId,
      },
    });

    // Archive sandbox
    await prisma.sandbox.update({
      where: { id: pr.sandboxId },
      data: { status: 'merged' },
    });

    // Get settings to check if we should delete sandbox
    const settings = await prisma.projectSettings.findUnique({
      where: { projectId: pr.projectId },
    });

    // Optionally delete the git branch
    if (settings?.autoDeleteSandbox) {
      try {
        await gitService.deleteBranch(projectPath, pr.sandbox.gitBranch, true);
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
    const pr = await prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
    });

    if (!pr) {
      return { canMerge: false, reason: 'Pull request not found' };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { canMerge: false, reason: 'User not found' };
    }

    // Check role
    const hasPermission = ['senior_qa', 'qa_lead', 'admin'].includes(user.role);
    if (!hasPermission) {
      return { canMerge: false, reason: 'Insufficient permissions' };
    }

    // Check approvals
    const settings = await prisma.projectSettings.findUnique({
      where: { projectId: pr.projectId },
    });

    const requiredApprovals = settings?.requiredApprovals || 1;
    const approvals = await prisma.pullRequestReview.count({
      where: { pullRequestId, status: 'approved' },
    });

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
    const files = await prisma.pullRequestFile.findMany({
      where: { pullRequestId },
      orderBy: { filePath: 'asc' },
    });

    return files.map(f => ({
      filePath: f.filePath,
      changeType: f.changeType,
      additions: f.additions,
      deletions: f.deletions,
    }));
  }
}

export const pullRequestService = new PullRequestService();
