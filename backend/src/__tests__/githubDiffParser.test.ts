import { describe, it, expect } from 'vitest';
import {
  parseGithubPatchToHunks,
  githubFileToFileDiff,
  githubFilesToDiffSummary,
  type GitHubPRFile,
} from '../utils/githubDiffParser';

// ---------------------------------------------------------------------------
// 1. parseGithubPatchToHunks
// ---------------------------------------------------------------------------
describe('parseGithubPatchToHunks', () => {
  it('returns placeholder hunk for empty/undefined patch', () => {
    const result = parseGithubPatchToHunks('');
    expect(result).toHaveLength(1);
    expect(result[0].lines).toHaveLength(1);
    expect(result[0].lines[0].type).toBe('context');
    expect(result[0].lines[0].content).toContain('Binary file');
  });

  it('parses a single-hunk add-only patch', () => {
    const patch = `@@ -0,0 +1,3 @@
+line1
+line2
+line3`;

    const hunks = parseGithubPatchToHunks(patch);

    expect(hunks).toHaveLength(1);
    expect(hunks[0].oldStart).toBe(0);
    expect(hunks[0].oldLines).toBe(0);
    expect(hunks[0].newStart).toBe(1);
    expect(hunks[0].newLines).toBe(3);
    expect(hunks[0].lines).toHaveLength(3);
    expect(hunks[0].lines.every(l => l.type === 'add')).toBe(true);
  });

  it('parses a single-hunk delete-only patch', () => {
    const patch = `@@ -1,2 +0,0 @@
-old1
-old2`;

    const hunks = parseGithubPatchToHunks(patch);

    expect(hunks).toHaveLength(1);
    expect(hunks[0].oldStart).toBe(1);
    expect(hunks[0].oldLines).toBe(2);
    expect(hunks[0].lines).toHaveLength(2);
    expect(hunks[0].lines.every(l => l.type === 'delete')).toBe(true);
  });

  it('parses a mixed context/add/delete patch', () => {
    const patch = `@@ -1,5 +1,5 @@
 context1
-old
+new
 context2
 context3`;

    const hunks = parseGithubPatchToHunks(patch);

    expect(hunks).toHaveLength(1);
    expect(hunks[0].lines).toHaveLength(5);

    const types = hunks[0].lines.map(l => l.type);
    expect(types).toEqual(['context', 'delete', 'add', 'context', 'context']);
  });

  it('tracks line numbers correctly for context lines', () => {
    const patch = `@@ -10,4 +10,4 @@
 ctx
-old
+new
 ctx2`;

    const hunks = parseGithubPatchToHunks(patch);
    const lines = hunks[0].lines;

    // First context line: old=10, new=10
    expect(lines[0].oldLineNumber).toBe(10);
    expect(lines[0].newLineNumber).toBe(10);

    // Delete line: old=11, no new
    expect(lines[1].oldLineNumber).toBe(11);
    expect(lines[1].newLineNumber).toBeNull();

    // Add line: no old, new=11
    expect(lines[2].oldLineNumber).toBeNull();
    expect(lines[2].newLineNumber).toBe(11);

    // Second context: old=12, new=12
    expect(lines[3].oldLineNumber).toBe(12);
    expect(lines[3].newLineNumber).toBe(12);
  });

  it('parses multiple hunks', () => {
    const patch = `@@ -1,3 +1,3 @@
 a
-b
+B
 c
@@ -10,3 +10,3 @@
 x
-y
+Y
 z`;

    const hunks = parseGithubPatchToHunks(patch);

    expect(hunks).toHaveLength(2);
    expect(hunks[0].oldStart).toBe(1);
    expect(hunks[1].oldStart).toBe(10);
  });

  it('handles "No newline at end of file" marker', () => {
    const patch = `@@ -1,2 +1,2 @@
-old
+new
\\ No newline at end of file`;

    const hunks = parseGithubPatchToHunks(patch);

    expect(hunks).toHaveLength(1);
    // The "\\ No newline" marker should be skipped
    expect(hunks[0].lines).toHaveLength(2);
  });

  it('handles hunk header without comma (single-line hunks)', () => {
    const patch = `@@ -1 +1 @@
-old
+new`;

    const hunks = parseGithubPatchToHunks(patch);

    expect(hunks).toHaveLength(1);
    expect(hunks[0].oldStart).toBe(1);
    expect(hunks[0].oldLines).toBe(1);
    expect(hunks[0].newStart).toBe(1);
    expect(hunks[0].newLines).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 2. githubFileToFileDiff
// ---------------------------------------------------------------------------
describe('githubFileToFileDiff', () => {
  it('converts an added file correctly', () => {
    const file: GitHubPRFile = {
      filename: 'Pages/Login.vero',
      status: 'added',
      additions: 5,
      deletions: 0,
      patch: `@@ -0,0 +1,5 @@
+page Login
+  url "/login"
+  textbox "username"
+  textbox "password"
+  button "Submit"`,
    };

    const diff = githubFileToFileDiff(file);

    expect(diff.filePath).toBe('Pages/Login.vero');
    expect(diff.changeType).toBe('added');
    expect(diff.additions).toBe(5);
    expect(diff.deletions).toBe(0);
    expect(diff.hunks).toHaveLength(1);
    expect(diff.hunks[0].lines.every(l => l.type === 'add')).toBe(true);
  });

  it('converts a deleted file correctly', () => {
    const file: GitHubPRFile = {
      filename: 'old.vero',
      status: 'removed',
      additions: 0,
      deletions: 3,
      patch: `@@ -1,3 +0,0 @@
-line1
-line2
-line3`,
    };

    const diff = githubFileToFileDiff(file);

    expect(diff.changeType).toBe('deleted');
    expect(diff.hunks[0].lines.every(l => l.type === 'delete')).toBe(true);
  });

  it('maps renamed status to modified', () => {
    const file: GitHubPRFile = {
      filename: 'Pages/NewName.vero',
      status: 'renamed',
      additions: 1,
      deletions: 1,
      previous_filename: 'Pages/OldName.vero',
      patch: `@@ -1,1 +1,1 @@
-old content
+new content`,
    };

    const diff = githubFileToFileDiff(file);
    expect(diff.changeType).toBe('modified');
  });

  it('handles missing patch (binary/large file)', () => {
    const file: GitHubPRFile = {
      filename: 'large.bin',
      status: 'modified',
      additions: 0,
      deletions: 0,
    };

    const diff = githubFileToFileDiff(file);

    expect(diff.hunks).toHaveLength(1);
    expect(diff.hunks[0].lines).toHaveLength(1);
    expect(diff.hunks[0].lines[0].content).toBe('Binary file or diff too large to display inline.');
  });
});

// ---------------------------------------------------------------------------
// 3. githubFilesToDiffSummary
// ---------------------------------------------------------------------------
describe('githubFilesToDiffSummary', () => {
  it('computes totals across all files', () => {
    const files: GitHubPRFile[] = [
      { filename: 'a.vero', status: 'added', additions: 10, deletions: 0 },
      { filename: 'b.vero', status: 'modified', additions: 3, deletions: 2 },
      { filename: 'c.vero', status: 'removed', additions: 0, deletions: 5 },
    ];

    const summary = githubFilesToDiffSummary(files);

    expect(summary.totalFiles).toBe(3);
    expect(summary.totalAdditions).toBe(13);
    expect(summary.totalDeletions).toBe(7);
    expect(summary.files[0].changeType).toBe('added');
    expect(summary.files[1].changeType).toBe('modified');
    expect(summary.files[2].changeType).toBe('deleted');
  });

  it('handles empty file list', () => {
    const summary = githubFilesToDiffSummary([]);

    expect(summary.totalFiles).toBe(0);
    expect(summary.totalAdditions).toBe(0);
    expect(summary.totalDeletions).toBe(0);
    expect(summary.files).toHaveLength(0);
  });
});
