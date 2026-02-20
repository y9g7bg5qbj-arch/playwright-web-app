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

describe('Sandbox Sync (syncWithDetails)', () => {
  let tempDir: string;
  let projectPath: string;
  let baselinePath: string;
  let SandboxService: any;
  let service: any;
  let originalBaselinePath: string | undefined;
  let originalVeroProjectsPath: string | undefined;

  const SANDBOX_ID = 'sandbox-sync-1';
  const USER_ID = 'user-1';
  const PROJECT_ID = 'project-1';
  const APP_ID = 'app-1';

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    tempDir = await mkdtemp(path.join(tmpdir(), 'sandbox-sync-'));
    projectPath = tempDir;
    baselinePath = path.join(tempDir, 'baselines');
    await mkdir(baselinePath, { recursive: true });

    // Set env vars BEFORE dynamic import so module-level consts pick them up
    originalBaselinePath = process.env.SANDBOX_BASELINE_PATH;
    originalVeroProjectsPath = process.env.VERO_PROJECTS_PATH;
    process.env.SANDBOX_BASELINE_PATH = baselinePath;
    process.env.VERO_PROJECTS_PATH = projectPath;

    // Dynamic import so module reads fresh env vars
    const mod = await import('../services/sandbox.service');
    SandboxService = mod.SandboxService;
    service = new SandboxService();

    // Default mock wiring
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

  // Helper to set up source, sandbox, and baseline directories
  async function setupEnv(opts: {
    source?: Record<string, string>;
    sandbox?: Record<string, string>;
    baseline?: Record<string, string>;
  }) {
    const sourcePath = path.join(projectPath, 'dev');
    const sandboxPath = path.join(projectPath, 'sandboxes', 'test-sandbox');
    const baseDir = path.join(baselinePath, SANDBOX_ID);

    // Source must have Pages/ to satisfy hasEnvironmentContent check
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

    if (opts.baseline) {
      for (const [fp, content] of Object.entries(opts.baseline)) {
        const full = path.join(baseDir, fp);
        await mkdir(path.dirname(full), { recursive: true });
        await writeFile(full, content, 'utf-8');
      }
    }
  }

  // -----------------------------------------------------------------------
  // Core sync scenarios
  // -----------------------------------------------------------------------

  it('clean sync — identical files produce success with no merges/conflicts', async () => {
    await setupEnv({
      source:   { 'Pages/Login.vero': 'same content' },
      sandbox:  { 'Pages/Login.vero': 'same content' },
      baseline: { 'Pages/Login.vero': 'same content' },
    });

    const result = await service.syncWithDetails(SANDBOX_ID, USER_ID);

    expect(result.success).toBe(true);
    expect(result.hasConflicts).toBe(false);
    expect(result.cleanMerges).toHaveLength(0);
  });

  it('new file in source is auto-merged (cleanMerges)', async () => {
    await setupEnv({
      source:   { 'Pages/Login.vero': 'same', 'Pages/New.vero': 'new file' },
      sandbox:  { 'Pages/Login.vero': 'same' },
      baseline: { 'Pages/Login.vero': 'same' },
    });

    const result = await service.syncWithDetails(SANDBOX_ID, USER_ID);

    expect(result.success).toBe(true);
    expect(result.hasConflicts).toBe(false);
    expect(result.cleanMerges).toContain('Pages/New.vero');

    // File should be copied into sandbox
    const sandboxPath = path.join(projectPath, 'sandboxes', 'test-sandbox');
    const newFile = await readFile(path.join(sandboxPath, 'Pages', 'New.vero'), 'utf-8');
    expect(newFile).toBe('new file');
  });

  it('only-sandbox-changed files are preserved (not overwritten)', async () => {
    await setupEnv({
      source:   { 'Pages/Login.vero': 'original' },
      sandbox:  { 'Pages/Login.vero': 'user edited' },
      baseline: { 'Pages/Login.vero': 'original' },
    });

    const result = await service.syncWithDetails(SANDBOX_ID, USER_ID);

    expect(result.success).toBe(true);
    expect(result.hasConflicts).toBe(false);

    // Sandbox version should be kept
    const sandboxPath = path.join(projectPath, 'sandboxes', 'test-sandbox');
    const content = await readFile(path.join(sandboxPath, 'Pages', 'Login.vero'), 'utf-8');
    expect(content).toBe('user edited');
  });

  it('only-source-changed files are pulled in', async () => {
    await setupEnv({
      source:   { 'Pages/Login.vero': 'updated by dev' },
      sandbox:  { 'Pages/Login.vero': 'original' },
      baseline: { 'Pages/Login.vero': 'original' },
    });

    const result = await service.syncWithDetails(SANDBOX_ID, USER_ID);

    expect(result.success).toBe(true);
    expect(result.cleanMerges).toContain('Pages/Login.vero');

    // Source version should be copied to sandbox
    const sandboxPath = path.join(projectPath, 'sandboxes', 'test-sandbox');
    const content = await readFile(path.join(sandboxPath, 'Pages', 'Login.vero'), 'utf-8');
    expect(content).toBe('updated by dev');
  });

  it('both-changed file reported as conflict', async () => {
    await setupEnv({
      source:   { 'Pages/Login.vero': 'source change' },
      sandbox:  { 'Pages/Login.vero': 'sandbox change' },
      baseline: { 'Pages/Login.vero': 'original' },
    });

    const result = await service.syncWithDetails(SANDBOX_ID, USER_ID);

    expect(result.success).toBe(false);
    expect(result.hasConflicts).toBe(true);
    expect(result.conflicts).toBeDefined();
    expect(result.conflicts!.length).toBeGreaterThanOrEqual(1);
    expect(result.conflicts![0].filePath).toBe('Pages/Login.vero');
    expect(result.conflicts![0].theirsContent).toBe('source change');
    expect(result.conflicts![0].yoursContent).toBe('sandbox change');
  });

  it('missing baseline treats differences as conflicts', async () => {
    // No baseline directory at all
    await setupEnv({
      source:  { 'Pages/Login.vero': 'source version' },
      sandbox: { 'Pages/Login.vero': 'sandbox version' },
    });

    const result = await service.syncWithDetails(SANDBOX_ID, USER_ID);

    expect(result.success).toBe(false);
    expect(result.hasConflicts).toBe(true);
    expect(result.conflicts!.some(c => c.filePath === 'Pages/Login.vero')).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Permission checks
  // -----------------------------------------------------------------------

  it('sync rejects non-owner (403)', async () => {
    await setupEnv({
      source:  { 'Pages/Login.vero': 'content' },
      sandbox: { 'Pages/Login.vero': 'content' },
    });

    await expect(service.syncWithDetails(SANDBOX_ID, 'other-user'))
      .rejects.toThrow(/owner/i);
  });

  it('sync rejects archived sandbox (400)', async () => {
    mocks.sandboxRepository.findById.mockResolvedValue({
      id: SANDBOX_ID, name: 'test-sandbox', ownerId: USER_ID,
      projectId: PROJECT_ID, sourceBranch: 'dev',
      folderPath: 'sandboxes/test-sandbox', status: 'archived',
      createdAt: new Date(), updatedAt: new Date(),
    });

    await expect(service.syncWithDetails(SANDBOX_ID, USER_ID))
      .rejects.toThrow(/archived|merged/i);
  });
});
