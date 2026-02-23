import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Hoist mocks ───────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  pullRequestRepository: {
    findById: vi.fn(), findBySandboxId: vi.fn(), findOpenBySandboxId: vi.fn(),
    countByProjectId: vi.fn(), getNextPRNumber: vi.fn(), create: vi.fn(),
    update: vi.fn(), delete: vi.fn(), deleteBySandboxId: vi.fn(), findByProjectId: vi.fn(),
  },
  pullRequestReviewRepository: {
    findByPullRequestId: vi.fn(), countByStatus: vi.fn(), upsert: vi.fn(),
    findById: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteByPullRequestId: vi.fn(),
    findByPullRequestAndReviewer: vi.fn(),
  },
  pullRequestCommentRepository: {
    countByPullRequestId: vi.fn(), findByPullRequestId: vi.fn(), findById: vi.fn(),
    create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteByPullRequestId: vi.fn(),
  },
  pullRequestFileRepository: {
    countByPullRequestId: vi.fn(), findByPullRequestId: vi.fn(), create: vi.fn(),
    createMany: vi.fn(), deleteByPullRequestId: vi.fn(),
  },
  sandboxRepository: {
    findById: vi.fn(), findAll: vi.fn(), findByProjectId: vi.fn(), findByOwnerId: vi.fn(),
    countByOwnerAndProject: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(),
  },
  sandboxFileRepository: {
    findBySandboxId: vi.fn(), findBySandboxIdAsMap: vi.fn(), findBySandboxIdWithDeletions: vi.fn(),
    upsert: vi.fn(), upsertMany: vi.fn(), delete: vi.fn(), deleteBySandboxId: vi.fn(),
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

const fsMocks = vi.hoisted(() => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock('../db/repositories/mongo', () => mocks);
vi.mock('../db/mongodb', () => ({ getDb: vi.fn(), getMongoUri: vi.fn() }));
vi.mock('../services/git.service', () => gitMocks);
vi.mock('../services/github.service', () => githubMocks);
vi.mock('fs/promises', () => fsMocks);
vi.mock('../utils/githubDiffParser', async () => {
  const actual = await vi.importActual('../utils/githubDiffParser');
  return actual;
});
vi.mock('../utils/diff', async () => {
  const actual = await vi.importActual('../utils/diff');
  return actual;
});

import { PullRequestService } from '../services/pullRequest.service';

describe('PR Merge', () => {
  let service: PullRequestService;

  const PR_ID = 'pr-merge-1';
  const SANDBOX_ID = 'sandbox-merge-1';
  const PROJECT_ID = 'project-1';
  const APP_ID = 'app-1';
  const USER_ID = 'user-1';

  beforeEach(() => {
    vi.clearAllMocks();

    // --- PR record ---
    mocks.pullRequestRepository.findById.mockResolvedValue({
      id: PR_ID, number: 1, title: 'Merge PR', authorId: USER_ID,
      sandboxId: SANDBOX_ID, projectId: PROJECT_ID, targetBranch: 'dev',
      status: 'approved', createdAt: new Date(), updatedAt: new Date(),
    });

    // --- Sandbox record ---
    mocks.sandboxRepository.findById.mockResolvedValue({
      id: SANDBOX_ID, name: 'merge-sandbox', ownerId: USER_ID,
      projectId: PROJECT_ID, sourceBranch: 'dev',
      folderPath: 'sandboxes/merge-sandbox', status: 'active',
      createdAt: new Date(), updatedAt: new Date(),
    });

    // --- Project + App ---
    mocks.projectRepository.findById.mockResolvedValue({
      id: PROJECT_ID, applicationId: APP_ID, veroPath: '/fake/project',
    });
    mocks.applicationRepository.findById.mockResolvedValue({ id: APP_ID });

    // --- User with merge permissions ---
    mocks.userRepository.findById.mockResolvedValue({
      id: USER_ID, name: 'Senior QA', email: 'qa@example.com', role: 'senior_qa',
    });

    // --- Default: no GitHub sync ---
    mocks.projectSettingsRepository.findByProjectId.mockResolvedValue({
      requiredApprovals: 1, allowSelfApproval: false, autoDeleteSandbox: false,
    });

    // --- Reviews ---
    mocks.pullRequestReviewRepository.findByPullRequestId.mockResolvedValue([]);
    mocks.pullRequestReviewRepository.countByStatus.mockResolvedValue(1);
    mocks.pullRequestCommentRepository.countByPullRequestId.mockResolvedValue(0);
    mocks.pullRequestFileRepository.countByPullRequestId.mockResolvedValue(0);

    // --- Update stubs ---
    mocks.pullRequestRepository.update.mockResolvedValue(null);
    mocks.sandboxRepository.update.mockResolvedValue(null);

    // --- PR file records for file-copy merge ---
    mocks.pullRequestFileRepository.findByPullRequestId.mockResolvedValue([
      { id: 'f1', pullRequestId: PR_ID, filePath: 'Pages/Login.vero', changeType: 'modified', additions: 5, deletions: 2, createdAt: new Date() },
      { id: 'f2', pullRequestId: PR_ID, filePath: 'Pages/New.vero', changeType: 'added', additions: 10, deletions: 0, createdAt: new Date() },
    ]);

    // --- fs stubs ---
    fsMocks.readFile.mockResolvedValue('file content');
    fsMocks.writeFile.mockResolvedValue(undefined);
    fsMocks.mkdir.mockResolvedValue(undefined);
    fsMocks.unlink.mockResolvedValue(undefined);

    // --- git service stubs ---
    gitMocks.gitService.checkoutBranch.mockResolvedValue(undefined);
    gitMocks.gitService.mergeBranch.mockResolvedValue({ success: true });
    gitMocks.gitService.deleteBranch.mockResolvedValue(undefined);

    // --- getById is called at end of merge() → returns merged PR ---
    mocks.pullRequestRepository.findById
      .mockResolvedValueOnce({
        id: PR_ID, number: 1, title: 'Merge PR', authorId: USER_ID,
        sandboxId: SANDBOX_ID, projectId: PROJECT_ID, targetBranch: 'dev',
        status: 'approved', createdAt: new Date(), updatedAt: new Date(),
      })
      .mockResolvedValue({
        id: PR_ID, number: 1, title: 'Merge PR', authorId: USER_ID,
        sandboxId: SANDBOX_ID, projectId: PROJECT_ID, targetBranch: 'dev',
        status: 'merged', mergedAt: new Date(), mergedById: USER_ID,
        createdAt: new Date(), updatedAt: new Date(),
      });

    service = new PullRequestService();
  });

  // -----------------------------------------------------------------------
  // merge() — local git path
  // -----------------------------------------------------------------------
  describe('merge (local file-copy path)', () => {
    it('copies PR files from sandbox to dev, then updates PR status', async () => {
      await service.merge(PR_ID, USER_ID);

      // Should fetch PR file records
      expect(mocks.pullRequestFileRepository.findByPullRequestId).toHaveBeenCalledWith(PR_ID);

      // Should read each modified/added file from sandbox and write to dev
      expect(fsMocks.readFile).toHaveBeenCalledTimes(2);
      expect(fsMocks.writeFile).toHaveBeenCalledTimes(2);
      expect(fsMocks.mkdir).toHaveBeenCalledTimes(2);

      // git merge commands should NOT be called
      expect(gitMocks.gitService.checkoutBranch).not.toHaveBeenCalled();
      expect(gitMocks.gitService.mergeBranch).not.toHaveBeenCalled();

      expect(mocks.pullRequestRepository.update).toHaveBeenCalledWith(
        PR_ID,
        expect.objectContaining({ status: 'merged', mergedById: USER_ID })
      );

      expect(mocks.sandboxRepository.update).toHaveBeenCalledWith(
        SANDBOX_ID,
        expect.objectContaining({ status: 'merged' })
      );
    });

    it('deletes files from dev when changeType is deleted', async () => {
      mocks.pullRequestFileRepository.findByPullRequestId.mockResolvedValue([
        { id: 'f1', pullRequestId: PR_ID, filePath: 'Pages/Old.vero', changeType: 'deleted', additions: 0, deletions: 5, createdAt: new Date() },
      ]);

      await service.merge(PR_ID, USER_ID);

      expect(fsMocks.unlink).toHaveBeenCalledWith(
        expect.stringContaining('Pages/Old.vero')
      );
      expect(fsMocks.readFile).not.toHaveBeenCalled();
    });

    it('throws when PR has no files to merge', async () => {
      mocks.pullRequestFileRepository.findByPullRequestId.mockResolvedValue([]);

      await expect(service.merge(PR_ID, USER_ID))
        .rejects.toThrow(/No files to merge/);
    });

    it('merge requires sufficient approvals', async () => {
      mocks.pullRequestRepository.findById.mockReset();
      mocks.pullRequestRepository.findById.mockResolvedValue({
        id: PR_ID, number: 1, title: 'PR', authorId: USER_ID,
        sandboxId: SANDBOX_ID, projectId: PROJECT_ID, targetBranch: 'dev',
        status: 'open', createdAt: new Date(), updatedAt: new Date(),
      });

      mocks.projectSettingsRepository.findByProjectId.mockResolvedValue({
        requiredApprovals: 2, allowSelfApproval: false, autoDeleteSandbox: false,
      });

      mocks.pullRequestReviewRepository.countByStatus.mockResolvedValue(0);

      await expect(service.merge(PR_ID, USER_ID))
        .rejects.toThrow(/approval/i);
    });

    it('merge requires privileged role', async () => {
      mocks.userRepository.findById.mockResolvedValue({
        id: 'user-2', name: 'Junior', email: 'jr@example.com', role: 'qa',
      });

      await expect(service.merge(PR_ID, 'user-2'))
        .rejects.toThrow(/permission/i);
    });

    it('calls deleteBranch when autoDeleteSandbox is enabled (local path)', async () => {
      mocks.projectSettingsRepository.findByProjectId.mockResolvedValue({
        requiredApprovals: 1, allowSelfApproval: false, autoDeleteSandbox: true,
      });

      await service.merge(PR_ID, USER_ID);

      expect(gitMocks.gitService.deleteBranch).toHaveBeenCalledWith(
        '/fake/project', 'sandboxes/merge-sandbox', true
      );
    });
  });

  // -----------------------------------------------------------------------
  // merge() — GitHub path
  // -----------------------------------------------------------------------
  describe('merge (GitHub path)', () => {
    beforeEach(() => {
      // Enable GitHub sync
      mocks.projectSettingsRepository.findByProjectId.mockResolvedValue({
        id: 'settings-1', projectId: PROJECT_ID,
        requiredApprovals: 1, allowSelfApproval: false, autoDeleteSandbox: false,
        useGitHubPrSync: true, githubRepoFullName: 'org/repo', githubBaseBranch: 'main',
      });

      mocks.githubIntegrationRepository.findByUserId.mockResolvedValue({
        id: 'gh-1', userId: USER_ID, accessToken: 'encrypted-token',
      });

      // PR has a GitHub PR number
      mocks.pullRequestRepository.findById.mockReset();
      mocks.pullRequestRepository.findById
        .mockResolvedValueOnce({
          id: PR_ID, number: 1, title: 'Merge PR', authorId: USER_ID,
          sandboxId: SANDBOX_ID, projectId: PROJECT_ID, targetBranch: 'dev',
          status: 'approved', githubPrNumber: 42,
          createdAt: new Date(), updatedAt: new Date(),
        })
        .mockResolvedValue({
          id: PR_ID, number: 1, title: 'Merge PR', authorId: USER_ID,
          sandboxId: SANDBOX_ID, projectId: PROJECT_ID, targetBranch: 'dev',
          status: 'merged', githubPrNumber: 42, mergedAt: new Date(), mergedById: USER_ID,
          createdAt: new Date(), updatedAt: new Date(),
        });

      githubMocks.githubService.getPullRequestWithMergeable.mockResolvedValue({
        mergeable: true, mergeable_state: 'clean', state: 'open',
      });

      githubMocks.githubService.mergeGitHubPR.mockResolvedValue({
        merged: true, message: 'Pull Request successfully merged',
      });
    });

    it('merges via GitHub API when useGitHubPrSync is enabled', async () => {
      await service.merge(PR_ID, USER_ID);

      expect(githubMocks.githubService.getPullRequestWithMergeable).toHaveBeenCalledWith(
        USER_ID, 'org', 'repo', 42
      );
      expect(githubMocks.githubService.mergeGitHubPR).toHaveBeenCalledWith(
        USER_ID, 'org', 'repo', 42,
        expect.stringContaining('Merge PR #1')
      );

      // Local git service should NOT be called
      expect(gitMocks.gitService.checkoutBranch).not.toHaveBeenCalled();
      expect(gitMocks.gitService.mergeBranch).not.toHaveBeenCalled();

      // PR status should still be updated
      expect(mocks.pullRequestRepository.update).toHaveBeenCalledWith(
        PR_ID,
        expect.objectContaining({ status: 'merged', mergedById: USER_ID })
      );
    });

    it('throws conflict error when GitHub reports not mergeable', async () => {
      githubMocks.githubService.getPullRequestWithMergeable.mockResolvedValue({
        mergeable: false, mergeable_state: 'dirty', state: 'open',
      });

      await expect(service.merge(PR_ID, USER_ID))
        .rejects.toThrow(/Update Sandbox from Dev/i);

      expect(githubMocks.githubService.mergeGitHubPR).not.toHaveBeenCalled();
    });

    it('throws when GitHub merge API returns conflict (405/409)', async () => {
      githubMocks.githubService.mergeGitHubPR.mockRejectedValue(
        new Error('MERGE_CONFLICT: Update Sandbox from Dev to resolve conflicts.')
      );

      await expect(service.merge(PR_ID, USER_ID))
        .rejects.toThrow(/Update Sandbox from Dev/i);
    });

    it('does not call git deleteBranch for GitHub path even with autoDeleteSandbox', async () => {
      mocks.projectSettingsRepository.findByProjectId.mockResolvedValue({
        id: 'settings-1', projectId: PROJECT_ID,
        requiredApprovals: 1, allowSelfApproval: false, autoDeleteSandbox: true,
        useGitHubPrSync: true, githubRepoFullName: 'org/repo', githubBaseBranch: 'main',
      });

      await service.merge(PR_ID, USER_ID);

      expect(gitMocks.gitService.deleteBranch).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // canMerge()
  // -----------------------------------------------------------------------
  describe('canMerge', () => {
    it('returns canMerge: true when conditions met', async () => {
      const result = await service.canMerge(PR_ID, USER_ID);
      expect(result.canMerge).toBe(true);
    });

    it('returns actionable reason when blocked by permissions', async () => {
      mocks.userRepository.findById.mockResolvedValue({
        id: 'user-2', name: 'Junior', email: 'jr@example.com', role: 'qa',
      });

      const result = await service.canMerge(PR_ID, 'user-2');
      expect(result.canMerge).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason!.toLowerCase()).toContain('permission');
    });

    it('returns actionable reason when blocked by approvals', async () => {
      mocks.pullRequestReviewRepository.countByStatus.mockResolvedValue(0);
      mocks.projectSettingsRepository.findByProjectId.mockResolvedValue({
        requiredApprovals: 2, allowSelfApproval: false, autoDeleteSandbox: false,
      });

      const result = await service.canMerge(PR_ID, USER_ID);
      expect(result.canMerge).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason!.toLowerCase()).toContain('approval');
    });
  });
});
