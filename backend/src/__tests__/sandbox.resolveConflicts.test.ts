import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

// ── Hoist mocks ───────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  sandboxRepository: {
    findById: vi.fn(), findAll: vi.fn(), findByProjectId: vi.fn(),
    findByOwnerId: vi.fn(), countByOwnerAndProject: vi.fn(),
    create: vi.fn(), update: vi.fn(), delete: vi.fn(),
  },
  pullRequestRepository: {
    findBySandboxId: vi.fn(), findOpenBySandboxId: vi.fn(),
    findById: vi.fn(), create: vi.fn(), update: vi.fn(),
    delete: vi.fn(), deleteBySandboxId: vi.fn(),
    countByProjectId: vi.fn(), getNextPRNumber: vi.fn(), findByProjectId: vi.fn(),
  },
  pullRequestReviewRepository: {
    findByPullRequestId: vi.fn(), countByStatus: vi.fn(),
    upsert: vi.fn(), findById: vi.fn(), create: vi.fn(),
    delete: vi.fn(), deleteByPullRequestId: vi.fn(),
    findByPullRequestAndReviewer: vi.fn(),
  },
  pullRequestCommentRepository: {
    countByPullRequestId: vi.fn(), findByPullRequestId: vi.fn(),
    findById: vi.fn(), create: vi.fn(), update: vi.fn(),
    delete: vi.fn(), deleteByPullRequestId: vi.fn(),
  },
  pullRequestFileRepository: {
    countByPullRequestId: vi.fn(), findByPullRequestId: vi.fn(),
    create: vi.fn(), createMany: vi.fn(), deleteByPullRequestId: vi.fn(),
  },
  projectSettingsRepository: { findByProjectId: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
  projectRepository: { findById: vi.fn() },
  applicationRepository: { findById: vi.fn() },
  userRepository: { findById: vi.fn() },
}));

vi.mock('../db/repositories/mongo', () => mocks);
vi.mock('../db/mongodb', () => ({ getDb: vi.fn(), getMongoUri: vi.fn() }));

describe('Merge Conflict Resolution (resolveConflicts)', () => {
  let tempDir: string;
  let projectPath: string;
  let baselinePath: string;
  let service: any;
  let originalBaselinePath: string | undefined;
  let originalVeroProjectsPath: string | undefined;

  const SANDBOX_ID = 'sandbox-resolve-1';
  const USER_ID = 'user-1';
  const PROJECT_ID = 'project-1';
  const APP_ID = 'app-1';

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    tempDir = await mkdtemp(path.join(tmpdir(), 'sandbox-resolve-'));
    projectPath = tempDir;
    baselinePath = path.join(tempDir, 'baselines');
    await mkdir(baselinePath, { recursive: true });

    originalBaselinePath = process.env.SANDBOX_BASELINE_PATH;
    originalVeroProjectsPath = process.env.VERO_PROJECTS_PATH;
    process.env.SANDBOX_BASELINE_PATH = baselinePath;
    process.env.VERO_PROJECTS_PATH = projectPath;

    // Dynamic import so module reads fresh env vars
    const mod = await import('../services/sandbox.service');
    service = new mod.SandboxService();

    mocks.sandboxRepository.findById.mockResolvedValue({
      id: SANDBOX_ID, name: 'test-sandbox', ownerId: USER_ID,
      projectId: PROJECT_ID, sourceBranch: 'dev',
      folderPath: 'sandboxes/test-sandbox', status: 'active',
      createdAt: new Date(), updatedAt: new Date(),
    });

    mocks.projectRepository.findById.mockResolvedValue({
      id: PROJECT_ID, applicationId: APP_ID, veroPath: projectPath,
    });

    mocks.applicationRepository.findById.mockResolvedValue({ id: APP_ID });

    mocks.userRepository.findById.mockResolvedValue({
      id: USER_ID, name: 'Test User', email: 'test@example.com', role: 'qa',
    });

    mocks.pullRequestRepository.findBySandboxId.mockResolvedValue([]);

    mocks.sandboxRepository.update.mockImplementation(async (_id: string, data: any) => ({
      id: SANDBOX_ID, name: 'test-sandbox', ownerId: USER_ID,
      projectId: PROJECT_ID, sourceBranch: 'dev',
      folderPath: 'sandboxes/test-sandbox', status: 'active',
      createdAt: new Date(), updatedAt: new Date(), ...data,
    }));
  });

  afterEach(async () => {
    if (originalBaselinePath === undefined) {
      delete process.env.SANDBOX_BASELINE_PATH;
    } else {
      process.env.SANDBOX_BASELINE_PATH = originalBaselinePath;
    }
    if (originalVeroProjectsPath === undefined) {
      delete process.env.VERO_PROJECTS_PATH;
    } else {
      process.env.VERO_PROJECTS_PATH = originalVeroProjectsPath;
    }
    await rm(tempDir, { recursive: true, force: true });
  });

  async function setupEnv(opts: {
    source?: Record<string, string>;
    sandbox?: Record<string, string>;
  }) {
    const sourcePath = path.join(projectPath, 'dev');
    const sandboxPath = path.join(projectPath, 'sandboxes', 'test-sandbox');

    await mkdir(path.join(sourcePath, 'Pages'), { recursive: true });
    await mkdir(path.join(sandboxPath, 'Pages'), { recursive: true });

    for (const [fp, content] of Object.entries(opts.source || {})) {
      const full = path.join(sourcePath, fp);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, content, 'utf-8');
    }
    for (const [fp, content] of Object.entries(opts.sandbox || {})) {
      const full = path.join(sandboxPath, fp);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, content, 'utf-8');
    }
  }

  function sandboxFilePath(fp: string): string {
    return path.join(projectPath, 'sandboxes', 'test-sandbox', fp);
  }

  // -----------------------------------------------------------------------
  // Resolution strategies
  // -----------------------------------------------------------------------

  it('resolve with "theirs" — writes source content to sandbox', async () => {
    await setupEnv({
      source:  { 'Pages/Login.vero': 'source version' },
      sandbox: { 'Pages/Login.vero': 'sandbox version' },
    });

    const result = await service.resolveConflicts(
      SANDBOX_ID, USER_ID,
      { 'Pages/Login.vero': 'source version' }
    );

    expect(result.success).toBe(true);
    expect(result.updatedFiles).toContain('Pages/Login.vero');

    const content = await readFile(sandboxFilePath('Pages/Login.vero'), 'utf-8');
    expect(content).toBe('source version');
  });

  it('resolve with "yours" — keeps sandbox content', async () => {
    await setupEnv({
      source:  { 'Pages/Login.vero': 'source version' },
      sandbox: { 'Pages/Login.vero': 'sandbox version' },
    });

    const result = await service.resolveConflicts(
      SANDBOX_ID, USER_ID,
      { 'Pages/Login.vero': 'sandbox version' }
    );

    expect(result.success).toBe(true);
    expect(result.updatedFiles).toContain('Pages/Login.vero');

    const content = await readFile(sandboxFilePath('Pages/Login.vero'), 'utf-8');
    expect(content).toBe('sandbox version');
  });

  it('custom merged content is accepted (hand-edited)', async () => {
    await setupEnv({
      source:  { 'Pages/Login.vero': 'source version' },
      sandbox: { 'Pages/Login.vero': 'sandbox version' },
    });

    const customContent = 'hand-merged content that matches neither side';
    const result = await service.resolveConflicts(
      SANDBOX_ID, USER_ID,
      { 'Pages/Login.vero': customContent }
    );

    expect(result.success).toBe(true);
    const content = await readFile(sandboxFilePath('Pages/Login.vero'), 'utf-8');
    expect(content).toBe(customContent);
  });

  it('auto-merge copies new source files alongside resolutions', async () => {
    await setupEnv({
      source:  {
        'Pages/Login.vero': 'source change',
        'Pages/Brand.vero': 'brand new file',
      },
      sandbox: { 'Pages/Login.vero': 'sandbox change' },
    });

    const result = await service.resolveConflicts(
      SANDBOX_ID, USER_ID,
      { 'Pages/Login.vero': 'resolved content' },
      true // autoMergeClean
    );

    expect(result.success).toBe(true);
    expect(result.updatedFiles).toContain('Pages/Login.vero');
    expect(result.updatedFiles).toContain('Pages/Brand.vero');

    const brandContent = await readFile(sandboxFilePath('Pages/Brand.vero'), 'utf-8');
    expect(brandContent).toBe('brand new file');
  });

  it('baseline snapshot updated after resolution', async () => {
    await setupEnv({
      source:  { 'Pages/Login.vero': 'source version' },
      sandbox: { 'Pages/Login.vero': 'sandbox version' },
    });

    await service.resolveConflicts(
      SANDBOX_ID, USER_ID,
      { 'Pages/Login.vero': 'resolved' }
    );

    // Baseline should now contain the source content (snapshot of source at resolution time)
    const baselineFile = path.join(baselinePath, SANDBOX_ID, 'Pages', 'Login.vero');
    const baselineContent = await readFile(baselineFile, 'utf-8');
    expect(baselineContent).toBe('source version');
  });

  // -----------------------------------------------------------------------
  // Permission checks
  // -----------------------------------------------------------------------

  it('resolve rejects non-owner (403)', async () => {
    await setupEnv({
      source:  { 'Pages/Login.vero': 'source' },
      sandbox: { 'Pages/Login.vero': 'sandbox' },
    });

    await expect(
      service.resolveConflicts(SANDBOX_ID, 'other-user', { 'Pages/Login.vero': 'content' })
    ).rejects.toThrow(/owner/i);
  });
});
