import { access, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { buildSnapshotPathTemplate, ensureEnvironmentResources, ensureProjectEnvironmentResources, resolveEnvironmentRootFromFilePath, resolveVisualSnapshotConfig,  } from '../routes/veroVisualSnapshots.utils';

describe('veroVisualSnapshots utils', () => {
  it('resolves environment root from file path under Features/Pages/PageActions', () => {
    const defaultRoot = '/tmp/vero-projects';
    const result = resolveEnvironmentRootFromFilePath('app-1/dev/Features/Login.vero', defaultRoot);
    expect(result.environmentRoot).toBe('/tmp/vero-projects/app-1/dev');
    expect(result.usedFallback).toBe(false);
  });

  it('falls back to default root when file path is missing', () => {
    const result = resolveEnvironmentRootFromFilePath(undefined, '/tmp/vero-projects');
    expect(result.environmentRoot).toBe('/tmp/vero-projects');
    expect(result.usedFallback).toBe(true);
  });

  it('ensures Resources/Visual/Baselines and Resources/Docs exist', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'vero-visual-utils-'));
    const environmentRoot = join(tempRoot, 'project', 'dev');

    try {
      const resources = await ensureEnvironmentResources(environmentRoot);
      await access(resources.visualBaselinesDir);
      await access(resources.docsDir);
      expect(resources.snapshotPathTemplate).toContain('{platform}{/projectName}/{arg}{ext}');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('scaffolds Resources folders for dev/master and sandboxes', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'vero-visual-project-utils-'));
    const projectRoot = join(tempRoot, 'project');
    const sandboxRoot = join(projectRoot, 'sandboxes', 'ui-sandbox');

    try {
      await ensureEnvironmentResources(sandboxRoot);
      const scaffolded = await ensureProjectEnvironmentResources(projectRoot);

      expect(scaffolded.ensuredEnvironmentRoots).toEqual(
        expect.arrayContaining([
          join(projectRoot, 'dev'),
          join(projectRoot, 'master'),
          sandboxRoot,
        ])
      );

      await access(join(projectRoot, 'dev', 'Resources', 'Visual', 'Baselines'));
      await access(join(projectRoot, 'dev', 'Resources', 'Docs'));
      await access(join(projectRoot, 'master', 'Resources', 'Visual', 'Baselines'));
      await access(join(projectRoot, 'master', 'Resources', 'Docs'));
      await access(join(projectRoot, 'sandboxes', 'ui-sandbox', 'Resources', 'Visual', 'Baselines'));
      await access(join(projectRoot, 'sandboxes', 'ui-sandbox', 'Resources', 'Docs'));
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('creates an empty sandboxes root for new projects', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'vero-visual-project-root-'));
    const projectRoot = join(tempRoot, 'project');

    try {
      await ensureProjectEnvironmentResources(projectRoot);

      await access(join(projectRoot, 'sandboxes'));
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('builds deterministic snapshot path templates', () => {
    const template = buildSnapshotPathTemplate('/tmp/project/dev/Resources/Visual/Baselines');
    expect(template).toBe('/tmp/project/dev/Resources/Visual/Baselines/{platform}{/projectName}/{arg}{ext}');
  });

  it('uses balanced defaults when visual config is absent', () => {
    const resolved = resolveVisualSnapshotConfig(undefined);
    expect(resolved.preset).toBe('balanced');
    expect(resolved.threshold).toBe(0.2);
    expect(resolved.maxDiffPixels).toBeUndefined();
    expect(resolved.maxDiffPixelRatio).toBeUndefined();
    expect(resolved.updateSnapshotsMode).toBeUndefined();
  });

  it('applies preset defaults and explicit numeric overrides', () => {
    const resolved = resolveVisualSnapshotConfig({
      visualPreset: 'strict',
      visualThreshold: 0.25,
      visualMaxDiffPixels: 5,
      visualUpdateSnapshots: true,
    });

    expect(resolved.preset).toBe('strict');
    expect(resolved.threshold).toBe(0.25);
    expect(resolved.maxDiffPixels).toBe(5);
    expect(resolved.maxDiffPixelRatio).toBe(0);
    expect(resolved.updateSnapshotsMode).toBe('changed');
  });

  it('accepts explicit updateSnapshotsMode over boolean toggle', () => {
    const resolved = resolveVisualSnapshotConfig({
      visualUpdateSnapshots: true,
      updateSnapshotsMode: 'missing',
    });

    expect(resolved.updateSnapshotsMode).toBe('missing');
  });
});
