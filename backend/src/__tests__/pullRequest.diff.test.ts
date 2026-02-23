import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Hoist mock objects so vi.mock factory can reference them ───────────────

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

describe('PR Code Comparison', () => {
  let service: PullRequestService;

  const PR_ID = 'pr-1';
  const SANDBOX_ID = 'sandbox-1';
  const PROJECT_ID = 'project-1';
  const APP_ID = 'app-1';

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.pullRequestRepository.findById.mockResolvedValue({
      id: PR_ID, number: 1, title: 'Test PR', authorId: 'user-1',
      sandboxId: SANDBOX_ID, projectId: PROJECT_ID, targetBranch: 'dev',
      status: 'open', createdAt: new Date(), updatedAt: new Date(),
    });

    mocks.sandboxRepository.findById.mockResolvedValue({
      id: SANDBOX_ID, name: 'test-sandbox', ownerId: 'user-1',
      projectId: PROJECT_ID, sourceBranch: 'dev',
      folderPath: 'sandboxes/test-sandbox', status: 'active',
      createdAt: new Date(), updatedAt: new Date(),
    });

    mocks.projectRepository.findById.mockResolvedValue({
      id: PROJECT_ID, applicationId: APP_ID, veroPath: '/fake/project',
    });

    mocks.applicationRepository.findById.mockResolvedValue({ id: APP_ID });

    // Default: no GitHub sync
    mocks.projectSettingsRepository.findByProjectId.mockResolvedValue(null);

    service = new PullRequestService();
  });

  // -----------------------------------------------------------------------
  // getDiff (local folder-based path)
  // -----------------------------------------------------------------------
  describe('getDiff (local git path)', () => {
    it('returns summary of all changed files', async () => {
      // Target (dev) has Login.vero; sandbox has modified Login.vero + new New.vero
      diffMocks.collectDirectoryFiles.mockImplementation(async (dir: string) => {
        if (dir.includes('/dev')) {
          return new Map([['Pages/Login.vero', 'page Login\n  url "/old"\nend']]);
        }
        return new Map([
          ['Pages/Login.vero', 'page Login\n  url "/new"\n  textbox "email"\nend'],
          ['Pages/New.vero', 'page New\n  url "/new"\nend'],
        ]);
      });

      const summary = await service.getDiff(PR_ID);

      expect(summary.files.length).toBe(2);
      const paths = summary.files.map(f => f.filePath).sort();
      expect(paths).toContain('Pages/Login.vero');
      expect(paths).toContain('Pages/New.vero');
    });

    it('returns empty summary for identical directories', async () => {
      const sameContent = new Map([['Pages/Login.vero', 'page Login\nend']]);
      diffMocks.collectDirectoryFiles.mockResolvedValue(sameContent);

      const summary = await service.getDiff(PR_ID);
      expect(summary.files.length).toBe(0);
      expect(summary.files).toHaveLength(0);
    });

    it('detects deleted files', async () => {
      // Target (dev) has Old.vero; sandbox does not
      diffMocks.collectDirectoryFiles.mockImplementation(async (dir: string) => {
        if (dir.includes('/dev')) {
          return new Map([['Pages/Old.vero', 'page Old\n  url "/old"\n  button "go"\n  text "hi"\nend']]);
        }
        return new Map();
      });

      const summary = await service.getDiff(PR_ID);
      expect(summary.files.length).toBe(1);
      expect(summary.files[0].changeType).toBe('deleted');
    });
  });

  // -----------------------------------------------------------------------
  // getFileDiff (local folder-based path)
  // -----------------------------------------------------------------------
  describe('getFileDiff (local git path)', () => {
    it('shows line-level hunks for modified file', async () => {
      diffMocks.collectDirectoryFiles.mockImplementation(async (dir: string) => {
        if (dir.includes('/dev')) {
          return new Map([['Pages/Login.vero', 'page Login\n  url "/old"\nend']]);
        }
        return new Map([['Pages/Login.vero', 'page Login\n  url "/new"\nend']]);
      });

      const diff = await service.getFileDiff(PR_ID, 'Pages/Login.vero');
      expect(diff.hunks.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -----------------------------------------------------------------------
  // getDiff (GitHub path)
  // -----------------------------------------------------------------------
  describe('getDiff (GitHub path)', () => {
    beforeEach(() => {
      mocks.pullRequestRepository.findById.mockResolvedValue({
        id: PR_ID, number: 1, title: 'Test PR', authorId: 'user-1',
        sandboxId: SANDBOX_ID, projectId: PROJECT_ID, targetBranch: 'dev',
        status: 'open', githubPrNumber: 42,
        createdAt: new Date(), updatedAt: new Date(),
      });

      mocks.projectSettingsRepository.findByProjectId.mockResolvedValue({
        id: 'settings-1', projectId: PROJECT_ID,
        requiredApprovals: 1, allowSelfApproval: false, autoDeleteSandbox: false,
        useGitHubPrSync: true, githubRepoFullName: 'org/repo', githubBaseBranch: 'main',
      });
    });

    it('fetches diff from GitHub API and parses patch', async () => {
      githubMocks.githubService.getGitHubPRFiles.mockResolvedValue([
        {
          filename: 'Pages/Login.vero',
          status: 'modified',
          additions: 2,
          deletions: 1,
          patch: `@@ -1,3 +1,4 @@
 page Login
-  url "/old"
+  url "/new"
+  textbox "email"
 end`,
        },
        {
          filename: 'Pages/New.vero',
          status: 'added',
          additions: 3,
          deletions: 0,
          patch: `@@ -0,0 +1,3 @@
+page New
+  url "/new"
+end`,
        },
      ]);

      const summary = await service.getDiff(PR_ID);

      expect(summary.files.length).toBe(2);
      expect(summary.totalAdditions).toBe(5);
      expect(summary.totalDeletions).toBe(1);
      expect(summary.files[0].changeType).toBe('modified');
      expect(summary.files[1].changeType).toBe('added');

      // Local git service should NOT be called
      expect(gitMocks.gitService.getDiffSummary).not.toHaveBeenCalled();
    });

    it('returns parsed hunks from GitHub patch for getFileDiff', async () => {
      githubMocks.githubService.getGitHubPRFiles.mockResolvedValue([
        {
          filename: 'Pages/Login.vero',
          status: 'modified',
          additions: 1,
          deletions: 1,
          patch: `@@ -1,3 +1,3 @@
 page Login
-  url "/old"
+  url "/new"
 end`,
        },
      ]);

      const diff = await service.getFileDiff(PR_ID, 'Pages/Login.vero');

      expect(diff.filePath).toBe('Pages/Login.vero');
      expect(diff.hunks).toHaveLength(1);
      expect(diff.hunks[0].lines).toHaveLength(4);

      const types = diff.hunks[0].lines.map(l => l.type);
      expect(types).toEqual(['context', 'delete', 'add', 'context']);
    });

    it('returns empty hunks when file not found in GitHub PR', async () => {
      githubMocks.githubService.getGitHubPRFiles.mockResolvedValue([]);

      const diff = await service.getFileDiff(PR_ID, 'Pages/Missing.vero');
      expect(diff.filePath).toBe('Pages/Missing.vero');
      expect(diff.hunks).toHaveLength(0);
    });
  });
});
