import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

// Mock DB repositories used by veroProjectPath.utils (resolveProjectPath)
vi.mock('../db/repositories/mongo', () => ({
  projectRepository: { findById: vi.fn() },
  sandboxRepository: { findById: vi.fn() },
  applicationRepository: { findById: vi.fn() },
}));

// Import after mocks
import { confineToBase } from '../routes/veroProjectPath.utils';
import { __veroFilesRouteTestUtils } from '../routes/veroFiles.routes';

const { scanDirectory } = __veroFilesRouteTestUtils;

describe('Environment-Scoped File Operations', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'vero-folder-scope-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // -----------------------------------------------------------------------
  // scanDirectory — scoped mode
  // -----------------------------------------------------------------------
  describe('scanDirectory (scoped)', () => {
    it('shows content folders at root when scoped', async () => {
      // Simulate a sandbox folder: sandboxes/my-sandbox/Pages, Features, PageActions
      const scopedRoot = path.join(tempDir, 'sandboxes', 'my-sandbox');
      await mkdir(path.join(scopedRoot, 'Pages'), { recursive: true });
      await mkdir(path.join(scopedRoot, 'Features'), { recursive: true });
      await mkdir(path.join(scopedRoot, 'PageActions'), { recursive: true });
      await writeFile(path.join(scopedRoot, 'Pages', 'Login.vero'), 'page');

      const result = await scanDirectory(scopedRoot, '', true);

      const names = result.map(n => n.name);
      expect(names).toContain('Pages');
      expect(names).toContain('Features');
      expect(names).toContain('PageActions');
    });

    it('shows .vero files inside content folders when scoped', async () => {
      const scopedRoot = path.join(tempDir, 'dev');
      await mkdir(path.join(scopedRoot, 'Pages'), { recursive: true });
      await writeFile(path.join(scopedRoot, 'Pages', 'Home.vero'), 'content');

      const result = await scanDirectory(scopedRoot, '', true);

      const pagesNode = result.find(n => n.name === 'Pages');
      expect(pagesNode).toBeDefined();
      expect(pagesNode!.children!.some(c => c.name === 'Home.vero')).toBe(true);
    });

    it('hides sandbox internal dirs (data, .sync-base) inside sandbox trees', async () => {
      // scanDirectory filters SANDBOX_HIDDEN_DIRS when relativePath starts with 'sandboxes/'
      // So we need to call it from the project root to trigger the inSandbox path
      const sandboxDir = path.join(tempDir, 'sandboxes', 'test');
      await mkdir(path.join(sandboxDir, 'data'), { recursive: true });
      await mkdir(path.join(sandboxDir, '.sync-base'), { recursive: true });
      await mkdir(path.join(sandboxDir, 'Pages'), { recursive: true });
      await writeFile(path.join(sandboxDir, 'data', 'seed.json'), '{}');
      await writeFile(path.join(sandboxDir, '.sync-base', 'base.vero'), 'base');
      await writeFile(path.join(sandboxDir, 'Pages', 'Home.vero'), 'page');

      // Also need dev/ so the root has valid ROOT_ENV_FOLDERS entries
      await mkdir(path.join(tempDir, 'dev', 'Pages'), { recursive: true });
      await mkdir(path.join(tempDir, 'sandboxes'), { recursive: true });

      const result = await scanDirectory(tempDir, '');

      // Navigate into sandboxes -> test to check hidden dirs
      const sandboxesNode = result.find(n => n.name === 'sandboxes');
      expect(sandboxesNode).toBeDefined();
      const testNode = sandboxesNode!.children?.find(n => n.name === 'test');
      expect(testNode).toBeDefined();

      const sandboxChildren = testNode!.children?.map(n => n.name) ?? [];
      expect(sandboxChildren).toContain('Pages');
      expect(sandboxChildren).not.toContain('data');
      expect(sandboxChildren).not.toContain('.sync-base');
    });
  });

  // -----------------------------------------------------------------------
  // scanDirectory — unscoped mode
  // -----------------------------------------------------------------------
  describe('scanDirectory (unscoped)', () => {
    it('shows only environment root folders at project root', async () => {
      await mkdir(path.join(tempDir, 'dev', 'Pages'), { recursive: true });
      await mkdir(path.join(tempDir, 'master', 'Pages'), { recursive: true });
      await mkdir(path.join(tempDir, 'sandboxes'), { recursive: true });
      await mkdir(path.join(tempDir, 'random-other'), { recursive: true });
      await writeFile(path.join(tempDir, 'dev', 'Pages', 'Login.vero'), 'page');

      const result = await scanDirectory(tempDir, '', false);

      const names = result.map(n => n.name);
      expect(names).toContain('dev');
      expect(names).toContain('master');
      expect(names).toContain('sandboxes');
      expect(names).not.toContain('random-other');
    });
  });

  // -----------------------------------------------------------------------
  // confineToBase — path traversal blocking
  // -----------------------------------------------------------------------
  describe('confineToBase', () => {
    it('resolves valid subpath within base', () => {
      const base = '/projects/app';
      const result = confineToBase(base, 'Pages/Login.vero');
      expect(result).toBe(path.resolve(base, 'Pages/Login.vero'));
    });

    it('blocks path traversal with ../', () => {
      const base = '/projects/app';
      expect(() => confineToBase(base, '../../etc/passwd')).toThrow('Access denied');
    });

    it('blocks path traversal with absolute path escape', () => {
      const base = '/projects/app';
      expect(() => confineToBase(base, '/etc/passwd')).toThrow('Access denied');
    });

    it('allows nested paths within base', () => {
      const base = '/projects/app';
      const result = confineToBase(base, 'Features/Auth/Login.vero');
      expect(result).toBe(path.resolve(base, 'Features/Auth/Login.vero'));
    });
  });

  // -----------------------------------------------------------------------
  // resolveBasePath
  // -----------------------------------------------------------------------
  describe('resolveBasePath', () => {
    // We test the resolveBasePath function indirectly through confineToBase
    // since resolveBasePath is not exported. The key behavior is:
    // - With folder param: basePath = confineToBase(projectPath, folder), isScoped = true
    // - Without folder: basePath = projectPath, isScoped = false

    it('scoped file read resolves within folder', () => {
      const projectPath = tempDir;
      const folder = 'sandboxes/my-sandbox';
      const basePath = confineToBase(projectPath, folder);

      // Now reading a file within that scoped base
      const filePath = confineToBase(basePath, 'Pages/Login.vero');

      expect(filePath).toBe(path.resolve(tempDir, 'sandboxes/my-sandbox/Pages/Login.vero'));
    });

    it('scoped file write creates in correct folder', () => {
      const projectPath = tempDir;
      const folder = 'dev';
      const basePath = confineToBase(projectPath, folder);
      const filePath = confineToBase(basePath, 'Pages/New.vero');

      expect(filePath).toBe(path.resolve(tempDir, 'dev/Pages/New.vero'));
    });

    it('path traversal blocked in scoped mode', () => {
      const projectPath = tempDir;
      const folder = 'sandboxes/my-sandbox';
      const basePath = confineToBase(projectPath, folder);

      expect(() => confineToBase(basePath, '../../etc/passwd')).toThrow('Access denied');
    });
  });
});
