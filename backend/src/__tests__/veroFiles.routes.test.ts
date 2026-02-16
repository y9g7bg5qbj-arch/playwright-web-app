import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

describe('veroFiles.routes sandbox filtering', () => {
  let tempProjectRoot = '';

  beforeEach(async () => {
    tempProjectRoot = await mkdtemp(path.join(tmpdir(), 'vero-files-routes-'));

    await mkdir(path.join(tempProjectRoot, 'sandboxes', 'miketest', '.sync-base', 'Pages'), { recursive: true });
    await mkdir(path.join(tempProjectRoot, 'sandboxes', 'miketest', 'Data'), { recursive: true });
    await mkdir(path.join(tempProjectRoot, 'sandboxes', 'miketest', 'Pages'), { recursive: true });
    await writeFile(path.join(tempProjectRoot, 'sandboxes', 'miketest', 'Pages', 'LoginPage.vero'), 'page LoginPage', 'utf-8');
  });

  afterEach(async () => {
    if (tempProjectRoot) {
      await rm(tempProjectRoot, { recursive: true, force: true });
    }
  });

  it('does not expose Data or .sync-base under sandbox folders', async () => {
    const { __veroFilesRouteTestUtils } = await import('../routes/veroFiles.routes');

    const files = await __veroFilesRouteTestUtils.scanDirectory(tempProjectRoot);
    const sandboxesNode = files.find((node) => node.name === 'sandboxes');
    expect(sandboxesNode).toBeDefined();

    const sandboxNode = sandboxesNode?.children?.find((node) => node.name === 'miketest');
    expect(sandboxNode).toBeDefined();

    const childNames = (sandboxNode?.children || []).map((child) => child.name);
    expect(childNames).toContain('Pages');
    expect(childNames).not.toContain('Data');
    expect(childNames).not.toContain('.sync-base');
  });
});
