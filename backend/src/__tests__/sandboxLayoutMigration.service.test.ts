import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { existsSync } from 'fs';

const sandboxRepositoryMock = {
  findAll: vi.fn(),
};

const projectRepositoryMock = {
  findById: vi.fn(),
};

const applicationRepositoryMock = {
  findById: vi.fn(),
};

vi.mock('../db/repositories/mongo', () => ({
  sandboxRepository: sandboxRepositoryMock,
  projectRepository: projectRepositoryMock,
  applicationRepository: applicationRepositoryMock,
}));

describe('sandboxLayoutMigration.service', () => {
  let tempRoot = '';
  let originalVeroProjectsPath: string | undefined;
  let originalSandboxBaselinePath: string | undefined;
  let projectsRoot = '';
  let baselineRoot = '';

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    tempRoot = await mkdtemp(path.join(tmpdir(), 'sandbox-layout-migration-'));
    projectsRoot = path.join(tempRoot, 'projects');
    baselineRoot = path.join(tempRoot, 'baselines');

    originalVeroProjectsPath = process.env.VERO_PROJECTS_PATH;
    originalSandboxBaselinePath = process.env.SANDBOX_BASELINE_PATH;
    process.env.VERO_PROJECTS_PATH = projectsRoot;
    process.env.SANDBOX_BASELINE_PATH = baselineRoot;
  });

  afterEach(async () => {
    if (originalVeroProjectsPath === undefined) {
      delete process.env.VERO_PROJECTS_PATH;
    } else {
      process.env.VERO_PROJECTS_PATH = originalVeroProjectsPath;
    }

    if (originalSandboxBaselinePath === undefined) {
      delete process.env.SANDBOX_BASELINE_PATH;
    } else {
      process.env.SANDBOX_BASELINE_PATH = originalSandboxBaselinePath;
    }

    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('migrates legacy .sync-base to backend storage and removes Data folder', async () => {
    const projectPath = path.join(projectsRoot, 'app-1', 'project-1');
    const sandboxPath = path.join(projectPath, 'sandboxes', 'miketest');
    await mkdir(path.join(sandboxPath, '.sync-base', 'Pages'), { recursive: true });
    await writeFile(path.join(sandboxPath, '.sync-base', 'Pages', 'example.vero'), 'baseline-content', 'utf-8');
    await mkdir(path.join(sandboxPath, 'Data'), { recursive: true });
    await writeFile(path.join(sandboxPath, 'Data', 'seed.json'), '{"keep":false}', 'utf-8');

    sandboxRepositoryMock.findAll.mockResolvedValue([
      {
        id: 'sandbox-1',
        projectId: 'project-1',
        folderPath: 'sandboxes/miketest',
      },
    ]);
    projectRepositoryMock.findById.mockResolvedValue({
      id: 'project-1',
      applicationId: 'app-1',
      veroPath: projectPath,
    });
    applicationRepositoryMock.findById.mockResolvedValue({ id: 'app-1' });

    const { migrateSandboxLayoutOnStartup } = await import('../services/sandboxLayoutMigration.service');
    await migrateSandboxLayoutOnStartup();

    const baselineFilePath = path.join(baselineRoot, 'sandbox-1', 'Pages', 'example.vero');
    expect(existsSync(baselineFilePath)).toBe(true);
    expect(await readFile(baselineFilePath, 'utf-8')).toBe('baseline-content');

    expect(existsSync(path.join(sandboxPath, '.sync-base'))).toBe(false);
    expect(existsSync(path.join(sandboxPath, 'Data'))).toBe(false);
  });

  it('is idempotent when run multiple times', async () => {
    const projectPath = path.join(projectsRoot, 'app-1', 'project-1');
    const sandboxPath = path.join(projectPath, 'sandboxes', 'miketest');
    await mkdir(path.join(sandboxPath, '.sync-base', 'Features'), { recursive: true });
    await writeFile(path.join(sandboxPath, '.sync-base', 'Features', 'Login.vero'), 'Feature: Login', 'utf-8');
    await mkdir(path.join(sandboxPath, 'Data', 'nested'), { recursive: true });
    await writeFile(path.join(sandboxPath, 'Data', 'nested', 'row.json'), '{"id":1}', 'utf-8');

    sandboxRepositoryMock.findAll.mockResolvedValue([
      {
        id: 'sandbox-2',
        projectId: 'project-1',
        folderPath: 'sandboxes/miketest',
      },
    ]);
    projectRepositoryMock.findById.mockResolvedValue({
      id: 'project-1',
      applicationId: 'app-1',
      veroPath: projectPath,
    });
    applicationRepositoryMock.findById.mockResolvedValue({ id: 'app-1' });

    const { migrateSandboxLayoutOnStartup } = await import('../services/sandboxLayoutMigration.service');

    await migrateSandboxLayoutOnStartup();
    await migrateSandboxLayoutOnStartup();

    const baselineFilePath = path.join(baselineRoot, 'sandbox-2', 'Features', 'Login.vero');
    expect(existsSync(baselineFilePath)).toBe(true);
    expect(await readFile(baselineFilePath, 'utf-8')).toBe('Feature: Login');
    expect(existsSync(path.join(sandboxPath, '.sync-base'))).toBe(false);
    expect(existsSync(path.join(sandboxPath, 'Data'))).toBe(false);
  });
});
