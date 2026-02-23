import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pullRequestRepository: {
    findById: vi.fn(),
    findBySandboxId: vi.fn(),
    findOpenBySandboxId: vi.fn(),
    findActiveBySandboxId: vi.fn(),
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
vi.mock('../utils/githubDiffParser', async () => {
  const actual = await vi.importActual('../utils/githubDiffParser');
  return actual;
});
const diffMocks = vi.hoisted(() => ({
  collectDirectoryFiles: vi.fn(),
}));
vi.mock('../utils/diff', async () => {
  const actual = await vi.importActual('../utils/diff') as any;
  return {
    ...actual,
    collectDirectoryFiles: diffMocks.collectDirectoryFiles,
  };
});

import { PullRequestService } from '../services/pullRequest.service';

describe('PR Create', () => {
  let service: PullRequestService;

  const USER_ID = 'user-1';
  const SANDBOX_ID = 'sandbox-1';
  const PROJECT_ID = 'project-1';
  const APP_ID = 'app-1';
  const PR_ID = 'pr-1';

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.sandboxRepository.findById.mockResolvedValue({
      id: SANDBOX_ID,
      name: 'feature-work',
      ownerId: USER_ID,
      projectId: PROJECT_ID,
      sourceBranch: 'dev',
      folderPath: 'sandboxes/feature-work',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mocks.userRepository.findById.mockResolvedValue({
      id: USER_ID,
      name: 'Owner',
      email: 'owner@example.com',
      role: 'qa',
    });

    mocks.projectRepository.findById.mockResolvedValue({
      id: PROJECT_ID,
      applicationId: APP_ID,
      veroPath: '/fake/project/path',
    });

    mocks.applicationRepository.findById.mockResolvedValue({ id: APP_ID });

    mocks.pullRequestRepository.findOpenBySandboxId.mockResolvedValue([]);
    mocks.pullRequestRepository.getNextPRNumber.mockResolvedValue(1);
    mocks.pullRequestRepository.create.mockImplementation(async (data: any) => ({
      id: PR_ID,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    mocks.pullRequestFileRepository.createMany.mockResolvedValue([]);

    // Default: no GitHub sync
    mocks.projectSettingsRepository.findByProjectId.mockResolvedValue(null);

    // Mock folder-based diff: collectDirectoryFiles returns file maps
    diffMocks.collectDirectoryFiles.mockImplementation(async (dir: string) => {
      if (dir.includes('dev')) {
        return new Map([
          ['Pages/Login.vero', 'old login content'],
          ['Pages/Deleted.vero', 'deleted content'],
        ]);
      }
      // sandbox dir
      return new Map([
        ['Pages/Login.vero', 'new login content'],
        ['Pages/New.vero', 'new page content'],
      ]);
    });

    service = new PullRequestService();
  });

  describe('create (local git path)', () => {
    it('creates a draft PR from sandbox to dev with file summary records', async () => {
      const result = await service.create(USER_ID, SANDBOX_ID, {
        title: 'Sandbox updates',
        description: 'Update login and add new page',
      });

      expect(result.status).toBe('draft');
      expect(result.targetBranch).toBe('dev');
      expect(result.fileCount).toBe(3);

      expect(mocks.pullRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Sandbox updates',
          targetBranch: 'dev',
          status: 'draft',
          sandboxId: SANDBOX_ID,
          projectId: PROJECT_ID,
        })
      );

      expect(mocks.pullRequestFileRepository.createMany).toHaveBeenCalledTimes(1);
      const [, files] = mocks.pullRequestFileRepository.createMany.mock.calls[0];
      expect(files).toHaveLength(3);
      expect(files).toEqual(expect.arrayContaining([
        expect.objectContaining({ filePath: 'Pages/Login.vero', changeType: 'modified' }),
        expect.objectContaining({ filePath: 'Pages/New.vero', changeType: 'added' }),
        expect.objectContaining({ filePath: 'Pages/Deleted.vero', changeType: 'deleted' }),
      ]));
    });

    it('creates a PR with only selectedFiles when provided', async () => {
      const result = await service.create(USER_ID, SANDBOX_ID, {
        title: 'Selective PR',
        description: 'Only include Login file',
        selectedFiles: ['Pages/Login.vero'],
      });

      expect(result.fileCount).toBe(1);

      const [, files] = mocks.pullRequestFileRepository.createMany.mock.calls[0];
      expect(files).toHaveLength(1);
      expect(files[0]).toEqual(
        expect.objectContaining({ filePath: 'Pages/Login.vero', changeType: 'modified' })
      );
    });

    it('stores all files when selectedFiles is omitted (backward compat)', async () => {
      const result = await service.create(USER_ID, SANDBOX_ID, {
        title: 'All files PR',
      });

      expect(result.fileCount).toBe(3);
    });

    it('stores all files when selectedFiles is empty array', async () => {
      const result = await service.create(USER_ID, SANDBOX_ID, {
        title: 'Empty selection PR',
        selectedFiles: [],
      });

      expect(result.fileCount).toBe(3);
    });

    it('rejects create when caller is not the sandbox owner (403)', async () => {
      mocks.sandboxRepository.findById.mockResolvedValue({
        id: SANDBOX_ID,
        name: 'feature-work',
        ownerId: 'someone-else',
        projectId: PROJECT_ID,
        sourceBranch: 'dev',
        folderPath: 'sandboxes/feature-work',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.create(USER_ID, SANDBOX_ID, { title: 'No access' })
      ).rejects.toMatchObject({ statusCode: 403 });

      expect(mocks.pullRequestRepository.create).not.toHaveBeenCalled();
      expect(mocks.pullRequestFileRepository.createMany).not.toHaveBeenCalled();
    });

    it('rejects create when sandbox is archived or merged (409)', async () => {
      mocks.sandboxRepository.findById.mockResolvedValue({
        id: SANDBOX_ID,
        name: 'feature-work',
        ownerId: USER_ID,
        projectId: PROJECT_ID,
        sourceBranch: 'dev',
        folderPath: 'sandboxes/feature-work',
        status: 'archived',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.create(USER_ID, SANDBOX_ID, { title: 'Archived sandbox PR' })
      ).rejects.toMatchObject({ statusCode: 409 });

      expect(mocks.pullRequestRepository.create).not.toHaveBeenCalled();
      expect(mocks.pullRequestFileRepository.createMany).not.toHaveBeenCalled();
    });

    it('rejects create when an approved PR already exists for sandbox (409)', async () => {
      mocks.pullRequestRepository.findOpenBySandboxId.mockResolvedValue([
        {
          id: 'pr-existing',
          sandboxId: SANDBOX_ID,
          status: 'approved',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await expect(
        service.create(USER_ID, SANDBOX_ID, { title: 'Duplicate PR' })
      ).rejects.toMatchObject({ statusCode: 409 });

      expect(mocks.pullRequestRepository.create).not.toHaveBeenCalled();
      expect(mocks.pullRequestFileRepository.createMany).not.toHaveBeenCalled();
    });

    it('fails with 400 when diff computation fails', async () => {
      diffMocks.collectDirectoryFiles.mockRejectedValue(
        new Error('target branch folder does not exist')
      );

      await expect(
        service.create(USER_ID, SANDBOX_ID, { title: 'Missing dev folder' })
      ).rejects.toMatchObject({ statusCode: 400 });

      expect(mocks.pullRequestRepository.create).not.toHaveBeenCalled();
      expect(mocks.pullRequestFileRepository.createMany).not.toHaveBeenCalled();
    });

    it('returns 404 when sandbox is missing', async () => {
      mocks.sandboxRepository.findById.mockResolvedValue(null);

      await expect(
        service.create(USER_ID, SANDBOX_ID, { title: 'Missing sandbox' })
      ).rejects.toMatchObject({ statusCode: 404 });

      expect(mocks.pullRequestRepository.create).not.toHaveBeenCalled();
      expect(mocks.pullRequestFileRepository.createMany).not.toHaveBeenCalled();
    });

    it('returns 404 when project is missing', async () => {
      mocks.projectRepository.findById.mockResolvedValue(null);

      await expect(
        service.create(USER_ID, SANDBOX_ID, { title: 'Missing project' })
      ).rejects.toMatchObject({ statusCode: 404 });

      expect(mocks.pullRequestRepository.create).not.toHaveBeenCalled();
      expect(mocks.pullRequestFileRepository.createMany).not.toHaveBeenCalled();
    });

    it('returns 404 when application is missing', async () => {
      mocks.applicationRepository.findById.mockResolvedValue(null);

      await expect(
        service.create(USER_ID, SANDBOX_ID, { title: 'Missing app' })
      ).rejects.toMatchObject({ statusCode: 404 });

      expect(mocks.pullRequestRepository.create).not.toHaveBeenCalled();
      expect(mocks.pullRequestFileRepository.createMany).not.toHaveBeenCalled();
    });
  });

  describe('create (GitHub sync path)', () => {
    beforeEach(() => {
      // Enable GitHub sync
      mocks.projectSettingsRepository.findByProjectId.mockResolvedValue({
        id: 'settings-1',
        projectId: PROJECT_ID,
        requiredApprovals: 1,
        allowSelfApproval: false,
        autoDeleteSandbox: false,
        useGitHubPrSync: true,
        githubRepoFullName: 'org/repo',
        githubBaseBranch: 'main',
      });

      mocks.githubIntegrationRepository.findByUserId.mockResolvedValue({
        id: 'gh-1',
        userId: USER_ID,
        accessToken: 'encrypted-token',
      });

      // Mock sandbox files in DB
      mocks.sandboxFileRepository.findBySandboxIdAsMap.mockResolvedValue(
        new Map([
          ['Pages/Login.vero', 'page Login\n  url "/login"'],
          ['Pages/New.vero', 'page New\n  url "/new"'],
        ])
      );

      // Mock sandbox files with deletions for GitHub sync
      mocks.sandboxFileRepository.findBySandboxIdWithDeletions.mockResolvedValue(
        new Map<string, string | null>([
          ['Pages/Login.vero', 'page Login\n  url "/login"'],
          ['Pages/New.vero', 'page New\n  url "/new"'],
        ])
      );

      githubMocks.githubService.syncSandboxToBranch.mockResolvedValue({ sha: 'abc123' });
      githubMocks.githubService.createGitHubPR.mockResolvedValue({ number: 42, html_url: 'https://github.com/org/repo/pull/42' });

      // After creating PR, code fetches diff from GitHub API
      githubMocks.githubService.getGitHubPRFiles.mockResolvedValue([
        { filename: 'Pages/Login.vero', status: 'modified', additions: 1, deletions: 1 },
        { filename: 'Pages/New.vero', status: 'added', additions: 2, deletions: 0 },
      ]);
    });

    it('creates a PR via GitHub when useGitHubPrSync is enabled', async () => {
      const result = await service.create(USER_ID, SANDBOX_ID, {
        title: 'GitHub PR',
        description: 'Test GitHub path',
      });

      expect(result.status).toBe('draft');
      expect(githubMocks.githubService.syncSandboxToBranch).toHaveBeenCalledTimes(1);
      expect(githubMocks.githubService.createGitHubPR).toHaveBeenCalledWith(
        USER_ID, 'org', 'repo',
        expect.stringContaining('vero/sandbox-'),
        'main',
        'GitHub PR',
        'Test GitHub path',
      );

      // Diff fetched from GitHub API (not local disk)
      expect(githubMocks.githubService.getGitHubPRFiles).toHaveBeenCalledWith(
        USER_ID, 'org', 'repo', 42
      );

      // githubPrNumber should be stored
      expect(mocks.pullRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ githubPrNumber: 42 })
      );

      // Local folder diff should NOT be called
      expect(diffMocks.collectDirectoryFiles).not.toHaveBeenCalled();
    });

    it('throws 400 when GitHub token is missing', async () => {
      mocks.githubIntegrationRepository.findByUserId.mockResolvedValue(null);

      await expect(
        service.create(USER_ID, SANDBOX_ID, { title: 'No token' })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('GitHub integration required'),
      });
    });
  });
});
