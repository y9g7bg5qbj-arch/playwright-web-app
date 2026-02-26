import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pullRequestRepository: {
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  pullRequestReviewRepository: {
    deleteByPullRequestId: vi.fn(),
  },
  pullRequestCommentRepository: {
    deleteByPullRequestId: vi.fn(),
  },
  pullRequestFileRepository: {
    deleteByPullRequestId: vi.fn(),
  },
  projectSettingsRepository: { findByProjectId: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
  sandboxRepository: { findById: vi.fn() },
  sandboxFileRepository: { findBySandboxIdAsMap: vi.fn(), findBySandboxIdWithDeletions: vi.fn() },
  userRepository: { findById: vi.fn() },
  projectRepository: { findById: vi.fn() },
  applicationRepository: { findById: vi.fn() },
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
import { AppError } from '../utils/errors';

describe('PullRequestService lifecycle error semantics', () => {
  const PR_ID = 'pr-1';
  const AUTHOR_ID = 'author-1';
  let service: PullRequestService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PullRequestService();
  });

  describe('openForReview', () => {
    it('returns 404 when PR is missing', async () => {
      mocks.pullRequestRepository.findById.mockResolvedValue(null);

      await expect(service.openForReview(PR_ID, AUTHOR_ID)).rejects.toBeInstanceOf(AppError);
      await expect(service.openForReview(PR_ID, AUTHOR_ID)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Pull request not found',
      });
    });

    it('returns 403 when user is not author', async () => {
      mocks.pullRequestRepository.findById.mockResolvedValue({
        id: PR_ID,
        authorId: AUTHOR_ID,
        status: 'draft',
      });

      await expect(service.openForReview(PR_ID, 'other-user')).rejects.toBeInstanceOf(AppError);
      await expect(service.openForReview(PR_ID, 'other-user')).rejects.toMatchObject({
        statusCode: 403,
        message: 'Only the author can open a PR for review',
      });
    });

    it('returns 409 when PR is not draft', async () => {
      mocks.pullRequestRepository.findById.mockResolvedValue({
        id: PR_ID,
        authorId: AUTHOR_ID,
        status: 'closed',
      });

      await expect(service.openForReview(PR_ID, AUTHOR_ID)).rejects.toBeInstanceOf(AppError);
      await expect(service.openForReview(PR_ID, AUTHOR_ID)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Only draft PRs can be opened for review',
      });
    });
  });

  describe('update', () => {
    it('returns 404 when PR is missing', async () => {
      mocks.pullRequestRepository.findById.mockResolvedValue(null);

      await expect(service.update(PR_ID, AUTHOR_ID, { title: 'x' })).rejects.toBeInstanceOf(AppError);
      await expect(service.update(PR_ID, AUTHOR_ID, { title: 'x' })).rejects.toMatchObject({
        statusCode: 404,
        message: 'Pull request not found',
      });
    });

    it('returns 403 when user is not author', async () => {
      mocks.pullRequestRepository.findById.mockResolvedValue({
        id: PR_ID,
        authorId: AUTHOR_ID,
        status: 'draft',
      });

      await expect(service.update(PR_ID, 'other-user', { title: 'x' })).rejects.toBeInstanceOf(AppError);
      await expect(service.update(PR_ID, 'other-user', { title: 'x' })).rejects.toMatchObject({
        statusCode: 403,
        message: 'Only the author can update a PR',
      });
    });

    it('returns 409 when PR is merged/closed', async () => {
      mocks.pullRequestRepository.findById.mockResolvedValue({
        id: PR_ID,
        authorId: AUTHOR_ID,
        status: 'merged',
      });

      await expect(service.update(PR_ID, AUTHOR_ID, { title: 'x' })).rejects.toBeInstanceOf(AppError);
      await expect(service.update(PR_ID, AUTHOR_ID, { title: 'x' })).rejects.toMatchObject({
        statusCode: 409,
        message: 'Cannot update a merged or closed PR',
      });
    });
  });

  describe('close', () => {
    it('returns 404 when PR is missing', async () => {
      mocks.pullRequestRepository.findById.mockResolvedValue(null);

      await expect(service.close(PR_ID, AUTHOR_ID)).rejects.toBeInstanceOf(AppError);
      await expect(service.close(PR_ID, AUTHOR_ID)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Pull request not found',
      });
    });

    it('returns 403 when non-author lacks manage permission', async () => {
      mocks.pullRequestRepository.findById.mockResolvedValue({
        id: PR_ID,
        authorId: AUTHOR_ID,
        status: 'open',
      });
      mocks.userRepository.findById.mockResolvedValue({
        id: 'other-user',
        role: 'qa_tester',
      });

      await expect(service.close(PR_ID, 'other-user')).rejects.toBeInstanceOf(AppError);
      await expect(service.close(PR_ID, 'other-user')).rejects.toMatchObject({
        statusCode: 403,
        message: 'Only the author or admin/lead can close a PR',
      });
    });
  });

  describe('deleteClosed', () => {
    it('returns 404 when PR is missing', async () => {
      mocks.pullRequestRepository.findById.mockResolvedValue(null);

      await expect(service.deleteClosed(PR_ID, AUTHOR_ID)).rejects.toBeInstanceOf(AppError);
      await expect(service.deleteClosed(PR_ID, AUTHOR_ID)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Pull request not found',
      });
    });

    it('returns 409 when PR is not closed', async () => {
      mocks.pullRequestRepository.findById.mockResolvedValue({
        id: PR_ID,
        authorId: AUTHOR_ID,
        status: 'draft',
      });

      await expect(service.deleteClosed(PR_ID, AUTHOR_ID)).rejects.toBeInstanceOf(AppError);
      await expect(service.deleteClosed(PR_ID, AUTHOR_ID)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Only closed pull requests can be permanently deleted',
      });
    });

    it('returns 403 when non-author lacks manage permission', async () => {
      mocks.pullRequestRepository.findById.mockResolvedValue({
        id: PR_ID,
        authorId: AUTHOR_ID,
        status: 'closed',
      });
      mocks.userRepository.findById.mockResolvedValue({
        id: 'other-user',
        role: 'qa_tester',
      });

      await expect(service.deleteClosed(PR_ID, 'other-user')).rejects.toBeInstanceOf(AppError);
      await expect(service.deleteClosed(PR_ID, 'other-user')).rejects.toMatchObject({
        statusCode: 403,
        message: 'Only the author or admin/lead can delete a closed PR',
      });
    });
  });
});
