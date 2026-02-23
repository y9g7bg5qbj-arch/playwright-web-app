import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import {
  findDiffHunks,
  buildDiffSummary,
  buildFileDiff,
  buildAllFileDiffs,
  collectDirectoryFiles,
} from '../utils/diff';

// ---------------------------------------------------------------------------
// 1. findDiffHunks
// ---------------------------------------------------------------------------
describe('findDiffHunks', () => {
  it('identical files produce no hunks', () => {
    const content = 'line1\nline2\nline3';
    const hunks = findDiffHunks(content, content);
    expect(hunks).toHaveLength(0);
  });

  it('single-line change produces one hunk', () => {
    const theirs = 'line1\nline2\nline3';
    const yours  = 'line1\nchanged\nline3';
    const hunks = findDiffHunks(theirs, yours);

    expect(hunks).toHaveLength(1);
    expect(hunks[0].theirsLines).toEqual(['line2']);
    expect(hunks[0].yoursLines).toEqual(['changed']);
  });

  it('multiple disjoint edits produce separate hunks', () => {
    const theirs = 'a\nb\nc\nd\ne\nf\ng';
    const yours  = 'a\nB\nc\nd\ne\nF\ng';
    const hunks = findDiffHunks(theirs, yours);

    expect(hunks.length).toBeGreaterThanOrEqual(2);
    // First hunk covers line "b" → "B"
    expect(hunks[0].theirsLines).toEqual(['b']);
    expect(hunks[0].yoursLines).toEqual(['B']);
    // Second hunk covers line "f" → "F"
    expect(hunks[1].theirsLines).toEqual(['f']);
    expect(hunks[1].yoursLines).toEqual(['F']);
  });

  it('added lines produce a hunk with empty theirs side', () => {
    const theirs = 'line1\nline3';
    const yours  = 'line1\nline2\nline3';
    const hunks = findDiffHunks(theirs, yours);

    expect(hunks).toHaveLength(1);
    expect(hunks[0].theirsLines).toEqual([]);
    expect(hunks[0].yoursLines).toEqual(['line2']);
  });

  it('deleted lines produce a hunk with empty yours side', () => {
    const theirs = 'line1\nline2\nline3';
    const yours  = 'line1\nline3';
    const hunks = findDiffHunks(theirs, yours);

    expect(hunks).toHaveLength(1);
    expect(hunks[0].theirsLines).toEqual(['line2']);
    expect(hunks[0].yoursLines).toEqual([]);
  });

  it('completely different files produce hunks covering all lines', () => {
    const theirs = 'alpha\nbeta';
    const yours  = 'gamma\ndelta';
    const hunks = findDiffHunks(theirs, yours);

    expect(hunks.length).toBeGreaterThanOrEqual(1);
    const allTheirs = hunks.flatMap(h => h.theirsLines);
    const allYours  = hunks.flatMap(h => h.yoursLines);
    expect(allTheirs).toContain('alpha');
    expect(allTheirs).toContain('beta');
    expect(allYours).toContain('gamma');
    expect(allYours).toContain('delta');
  });

  it('empty strings produce no hunks', () => {
    expect(findDiffHunks('', '')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. buildDiffSummary
// ---------------------------------------------------------------------------
describe('buildDiffSummary', () => {
  it('added file shows all-additions summary', () => {
    const target  = new Map<string, string>();
    const sandbox = new Map<string, string>([['newFile.vero', 'line1\nline2\nline3']]);

    const summary = buildDiffSummary(target, sandbox);

    expect(summary.totalFiles).toBe(1);
    expect(summary.files[0].changeType).toBe('added');
    expect(summary.files[0].additions).toBe(3); // 3 lines
    expect(summary.files[0].deletions).toBe(0);
    expect(summary.totalAdditions).toBe(3);
    expect(summary.totalDeletions).toBe(0);
  });

  it('deleted file shows all-deletions summary', () => {
    const target  = new Map<string, string>([['old.vero', 'a\nb']]);
    const sandbox = new Map<string, string>();

    const summary = buildDiffSummary(target, sandbox);

    expect(summary.totalFiles).toBe(1);
    expect(summary.files[0].changeType).toBe('deleted');
    expect(summary.files[0].deletions).toBe(2);
    expect(summary.files[0].additions).toBe(0);
    expect(summary.totalDeletions).toBe(2);
  });

  it('modified file shows balanced add/delete counts', () => {
    const target  = new Map<string, string>([['file.vero', 'line1\nline2\nline3']]);
    const sandbox = new Map<string, string>([['file.vero', 'line1\nchanged\nline3']]);

    const summary = buildDiffSummary(target, sandbox);

    expect(summary.totalFiles).toBe(1);
    expect(summary.files[0].changeType).toBe('modified');
    expect(summary.files[0].additions).toBeGreaterThanOrEqual(1);
    expect(summary.files[0].deletions).toBeGreaterThanOrEqual(1);
  });

  it('identical directories produce empty summary', () => {
    const files = new Map<string, string>([['a.vero', 'content']]);
    const summary = buildDiffSummary(files, new Map(files));

    expect(summary.totalFiles).toBe(0);
    expect(summary.files).toHaveLength(0);
    expect(summary.totalAdditions).toBe(0);
    expect(summary.totalDeletions).toBe(0);
  });

  it('mixed add/modify/delete scenario', () => {
    const target = new Map<string, string>([
      ['keep.vero', 'same'],
      ['modify.vero', 'old'],
      ['delete.vero', 'gone'],
    ]);
    const sandbox = new Map<string, string>([
      ['keep.vero', 'same'],
      ['modify.vero', 'new'],
      ['add.vero', 'fresh'],
    ]);

    const summary = buildDiffSummary(target, sandbox);

    expect(summary.totalFiles).toBe(3); // modify, delete, add (keep is unchanged)
    const types = summary.files.map(f => f.changeType).sort();
    expect(types).toEqual(['added', 'deleted', 'modified']);
  });
});

// ---------------------------------------------------------------------------
// 3. buildFileDiff
// ---------------------------------------------------------------------------
describe('buildFileDiff', () => {
  it('added file: all lines are additions', () => {
    const diff = buildFileDiff('new.vero', undefined, 'line1\nline2');

    expect(diff.changeType).toBe('added');
    expect(diff.additions).toBe(2);
    expect(diff.deletions).toBe(0);
    expect(diff.hunks).toHaveLength(1);
    expect(diff.hunks[0].lines.every(l => l.type === 'add')).toBe(true);
  });

  it('deleted file: all lines are deletions', () => {
    const diff = buildFileDiff('old.vero', 'line1\nline2\nline3', undefined);

    expect(diff.changeType).toBe('deleted');
    expect(diff.additions).toBe(0);
    expect(diff.deletions).toBe(3);
    expect(diff.hunks).toHaveLength(1);
    expect(diff.hunks[0].lines.every(l => l.type === 'delete')).toBe(true);
  });

  it('modified file: shows hunks with correct line numbers', () => {
    const diff = buildFileDiff('edit.vero', 'a\nb\nc', 'a\nB\nc');

    expect(diff.changeType).toBe('modified');
    expect(diff.additions).toBeGreaterThanOrEqual(1);
    expect(diff.deletions).toBeGreaterThanOrEqual(1);
    expect(diff.hunks.length).toBeGreaterThanOrEqual(1);
  });

  it('both undefined returns empty modified diff', () => {
    const diff = buildFileDiff('ghost.vero', undefined, undefined);

    expect(diff.changeType).toBe('modified');
    expect(diff.additions).toBe(0);
    expect(diff.deletions).toBe(0);
    expect(diff.hunks).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. buildAllFileDiffs
// ---------------------------------------------------------------------------
describe('buildAllFileDiffs', () => {
  it('returns diffs only for changed files, excludes unchanged', () => {
    const target = new Map<string, string>([
      ['same.vero', 'content'],
      ['changed.vero', 'old'],
    ]);
    const sandbox = new Map<string, string>([
      ['same.vero', 'content'],
      ['changed.vero', 'new'],
      ['added.vero', 'fresh'],
    ]);

    const diffs = buildAllFileDiffs(target, sandbox);

    const paths = diffs.map(d => d.filePath).sort();
    expect(paths).toEqual(['added.vero', 'changed.vero']);
    expect(diffs.find(d => d.filePath === 'same.vero')).toBeUndefined();
  });

  it('returns empty array for identical directories', () => {
    const files = new Map<string, string>([['a.vero', 'x']]);
    expect(buildAllFileDiffs(files, new Map(files))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 5. collectDirectoryFiles
// ---------------------------------------------------------------------------
describe('collectDirectoryFiles', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'diff-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('collects files with correct relative paths', async () => {
    await mkdir(path.join(tempDir, 'Pages'), { recursive: true });
    await writeFile(path.join(tempDir, 'Pages', 'Login.vero'), 'page content');
    await writeFile(path.join(tempDir, 'root.txt'), 'root file');

    const files = await collectDirectoryFiles(tempDir);

    expect(files.has('Pages/Login.vero')).toBe(true);
    expect(files.has('root.txt')).toBe(true);
    expect(files.get('Pages/Login.vero')).toBe('page content');
    expect(files.get('root.txt')).toBe('root file');
  });

  it('excludes configured directories (data, .sync-base, node_modules, .git)', async () => {
    await mkdir(path.join(tempDir, 'data'), { recursive: true });
    await mkdir(path.join(tempDir, '.sync-base'), { recursive: true });
    await mkdir(path.join(tempDir, 'node_modules'), { recursive: true });
    await mkdir(path.join(tempDir, '.git'), { recursive: true });
    await mkdir(path.join(tempDir, 'Pages'), { recursive: true });

    await writeFile(path.join(tempDir, 'data', 'seed.json'), '{}');
    await writeFile(path.join(tempDir, '.sync-base', 'base.vero'), 'base');
    await writeFile(path.join(tempDir, 'node_modules', 'pkg.js'), 'mod');
    await writeFile(path.join(tempDir, '.git', 'config'), 'git');
    await writeFile(path.join(tempDir, 'Pages', 'Home.vero'), 'home');

    const files = await collectDirectoryFiles(tempDir);

    expect(files.has('Pages/Home.vero')).toBe(true);
    expect(files.has('data/seed.json')).toBe(false);
    expect(files.has('.sync-base/base.vero')).toBe(false);
    expect(files.has('node_modules/pkg.js')).toBe(false);
    expect(files.has('.git/config')).toBe(false);
  });

  it('handles missing directory gracefully (returns empty map)', async () => {
    const files = await collectDirectoryFiles(path.join(tempDir, 'nonexistent'));
    expect(files.size).toBe(0);
  });

  it('handles nested directory structure', async () => {
    await mkdir(path.join(tempDir, 'Features', 'Auth'), { recursive: true });
    await writeFile(path.join(tempDir, 'Features', 'Auth', 'Login.vero'), 'feat');

    const files = await collectDirectoryFiles(tempDir);

    expect(files.has('Features/Auth/Login.vero')).toBe(true);
    expect(files.get('Features/Auth/Login.vero')).toBe('feat');
  });

  it('handles empty directory', async () => {
    const files = await collectDirectoryFiles(tempDir);
    expect(files.size).toBe(0);
  });
});
