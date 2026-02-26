import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pullRequestRepository: {
    findById: vi.fn(),
    findBySandboxId: vi.fn(),
    findOpenBySandboxId: vi.fn(),
    countByProjectId: vi.fn(),
    getNextPRNumber: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteBySandboxId: vi.fn(),
    findByProjectId: vi.fn(),
  },
  pullRequestReviewRepository: {
    findByPullRequestId: vi.fn(),
    countByStatus: vi.fn(),
    upsert: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteByPullRequestId: vi.fn(),
    findByPullRequestAndReviewer: vi.fn(),
  },
  pullRequestCommentRepository: {
    countByPullRequestId: vi.fn(),
    findByPullRequestId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteByPullRequestId: vi.fn(),
  },
  pullRequestFileRepository: {
    countByPullRequestId: vi.fn(),
    findByPullRequestId: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    deleteByPullRequestId: vi.fn(),
  },
  sandboxRepository: {
    findById: vi.fn(),
    findAll: vi.fn(),
    findByProjectId: vi.fn(),
    findByOwnerId: vi.fn(),
    countByOwnerAndProject: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  sandboxFileRepository: {
    findBySandboxId: vi.fn(),
    findBySandboxIdAsMap: vi.fn(),
    findBySandboxIdWithDeletions: vi.fn(),
    upsert: vi.fn(),
    upsertMany: vi.fn(),
    delete: vi.fn(),
    deleteBySandboxId: vi.fn(),
  },
  projectRepository: { findById: vi.fn() },
  applicationRepository: { findById: vi.fn() },
  userRepository: { findById: vi.fn() },
  projectSettingsRepository: { findByProjectId: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
  githubIntegrationRepository: { findByUserId: vi.fn() },
}));

const gitMocks = vi.hoisted(() => ({
  gitService: {
    getDiffSummary: vi.fn(),
    getFileDiff: vi.fn(),
    getAllFileDiffs: vi.fn(),
    checkoutBranch: vi.fn(),
    mergeBranch: vi.fn(),
    deleteBranch: vi.fn(),
  },
}));

const githubMocks = vi.hoisted(() => ({
  githubService: {
    syncSandboxToBranch: vi.fn(),
    createGitHubPR: vi.fn(),
    getGitHubPRFiles: vi.fn(),
    getPullRequestWithMergeable: vi.fn(),
    mergeGitHubPR: vi.fn(),
  },
}));

vi.mock('../db/repositories/mongo', () => mocks);
vi.mock('../db/mongodb', () => ({ getDb: vi.fn(), getMongoUri: vi.fn() }));
vi.mock('../services/git.service', () => gitMocks);
vi.mock('../services/github.service', () => githubMocks);

import { PullRequestService } from '../services/pullRequest.service';

describe('PR Delete Closed', () => {
  let service: PullRequestService;

  const PR_ID = 'pr-1';
  const AUTHOR_ID = 'author-1';

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pullRequestRepository.delete.mockResolvedValue(true);
    mocks.pullRequestReviewRepository.deleteByPullRequestId.mockResolvedValue(1);
    mocks.pullRequestCommentRepository.deleteByPullRequestId.mockResolvedValue(1);
    mocks.pullRequestFileRepository.deleteByPullRequestId.mockResolvedValue(1);
    service = new PullRequestService();
  });

  it('deletes a closed PR as the author and cascades related data', async () => {
    mocks.pullRequestRepository.findById.mockResolvedValue({
      id: PR_ID,
      authorId: AUTHOR_ID,
      status: 'closed',
    });

    await service.deleteClosed(PR_ID, AUTHOR_ID);

    expect(mocks.pullRequestReviewRepository.deleteByPullRequestId).toHaveBeenCalledWith(PR_ID);
    expect(mocks.pullRequestCommentRepository.deleteByPullRequestId).toHaveBeenCalledWith(PR_ID);
    expect(mocks.pullRequestFileRepository.deleteByPullRequestId).toHaveBeenCalledWith(PR_ID);
    expect(mocks.pullRequestRepository.delete).toHaveBeenCalledWith(PR_ID);
    expect(mocks.userRepository.findById).not.toHaveBeenCalled();

    expect(githubMocks.githubService.syncSandboxToBranch).not.toHaveBeenCalled();
    expect(githubMocks.githubService.createGitHubPR).not.toHaveBeenCalled();
    expect(githubMocks.githubService.getGitHubPRFiles).not.toHaveBeenCalled();
    expect(githubMocks.githubService.getPullRequestWithMergeable).not.toHaveBeenCalled();
    expect(githubMocks.githubService.mergeGitHubPR).not.toHaveBeenCalled();
  });

  it('deletes a closed PR for admin/lead user who is not the author', async () => {
    mocks.pullRequestRepository.findById.mockResolvedValue({
      id: PR_ID,
      authorId: AUTHOR_ID,
      status: 'closed',
    });
    mocks.userRepository.findById.mockResolvedValue({
      id: 'lead-1',
      role: 'qa_lead',
      email: 'lead@example.com',
    });

    await service.deleteClosed(PR_ID, 'lead-1');

    expect(mocks.userRepository.findById).toHaveBeenCalledWith('lead-1');
    expect(mocks.pullRequestRepository.delete).toHaveBeenCalledWith(PR_ID);
  });

  it('rejects deleting PRs that are not closed', async () => {
    mocks.pullRequestRepository.findById.mockResolvedValue({
      id: PR_ID,
      authorId: AUTHOR_ID,
      status: 'open',
    });

    await expect(service.deleteClosed(PR_ID, AUTHOR_ID))
      .rejects.toThrow('Only closed pull requests can be permanently deleted');

    expect(mocks.pullRequestReviewRepository.deleteByPullRequestId).not.toHaveBeenCalled();
    expect(mocks.pullRequestCommentRepository.deleteByPullRequestId).not.toHaveBeenCalled();
    expect(mocks.pullRequestFileRepository.deleteByPullRequestId).not.toHaveBeenCalled();
    expect(mocks.pullRequestRepository.delete).not.toHaveBeenCalled();
  });

  it('rejects unauthorized non-author users', async () => {
    mocks.pullRequestRepository.findById.mockResolvedValue({
      id: PR_ID,
      authorId: AUTHOR_ID,
      status: 'closed',
    });
    mocks.userRepository.findById.mockResolvedValue({
      id: 'tester-1',
      role: 'qa_tester',
      email: 'tester@example.com',
    });

    await expect(service.deleteClosed(PR_ID, 'tester-1'))
      .rejects.toThrow('Only the author or admin/lead can delete a closed PR');

    expect(mocks.pullRequestReviewRepository.deleteByPullRequestId).not.toHaveBeenCalled();
    expect(mocks.pullRequestCommentRepository.deleteByPullRequestId).not.toHaveBeenCalled();
    expect(mocks.pullRequestFileRepository.deleteByPullRequestId).not.toHaveBeenCalled();
    expect(mocks.pullRequestRepository.delete).not.toHaveBeenCalled();
  });

  it('rejects when PR does not exist', async () => {
    mocks.pullRequestRepository.findById.mockResolvedValue(null);

    await expect(service.deleteClosed(PR_ID, AUTHOR_ID))
      .rejects.toThrow('Pull request not found');

    expect(mocks.pullRequestReviewRepository.deleteByPullRequestId).not.toHaveBeenCalled();
    expect(mocks.pullRequestCommentRepository.deleteByPullRequestId).not.toHaveBeenCalled();
    expect(mocks.pullRequestFileRepository.deleteByPullRequestId).not.toHaveBeenCalled();
    expect(mocks.pullRequestRepository.delete).not.toHaveBeenCalled();
  });
});
