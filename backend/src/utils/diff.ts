/**
 * File-map diff utilities for computing PR diffs from sandbox file content.
 *
 * These operate on in-memory Maps (filePath → content) rather than git,
 * enabling stateless PR diff computation when using GitHub-backed PRs.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { findDiffHunks } from './conflictDiff';

// Re-export findDiffHunks so existing consumers of diff.ts still work
export { findDiffHunks };

/** Summary of a single changed file */
export interface FileDiffSummary {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

/** Overall diff summary for a PR */
export interface DiffSummary {
  files: FileDiffSummary[];
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
}

/** A line in a unified diff hunk */
export interface UnifiedDiffLine {
  type: 'context' | 'add' | 'delete';
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
}

/** A hunk in a unified diff */
export interface UnifiedDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: UnifiedDiffLine[];
}

/** Full file diff with hunks */
export interface FileDiff {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  hunks: UnifiedDiffHunk[];
}

/**
 * Build a diff summary comparing target (base) and sandbox file maps.
 */
export function buildDiffSummary(
  target: Map<string, string>,
  sandbox: Map<string, string>
): DiffSummary {
  const allPaths = new Set([...target.keys(), ...sandbox.keys()]);
  const files: FileDiffSummary[] = [];
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const filePath of allPaths) {
    const targetContent = target.get(filePath);
    const sandboxContent = sandbox.get(filePath);

    if (targetContent === sandboxContent) continue;

    let changeType: 'added' | 'modified' | 'deleted';
    let additions = 0;
    let deletions = 0;

    if (targetContent === undefined) {
      changeType = 'added';
      additions = sandboxContent!.split('\n').length;
    } else if (sandboxContent === undefined) {
      changeType = 'deleted';
      deletions = targetContent.split('\n').length;
    } else {
      changeType = 'modified';
      const hunks = findDiffHunks(targetContent, sandboxContent);
      for (const hunk of hunks) {
        deletions += hunk.theirsLines.length;
        additions += hunk.yoursLines.length;
      }
    }

    files.push({ filePath, changeType, additions, deletions });
    totalAdditions += additions;
    totalDeletions += deletions;
  }

  return {
    files,
    totalFiles: files.length,
    totalAdditions,
    totalDeletions,
  };
}

/**
 * Build a detailed file diff with unified hunks.
 */
export function buildFileDiff(
  filePath: string,
  targetContent: string | undefined,
  sandboxContent: string | undefined
): FileDiff {
  // Both missing — empty diff
  if (targetContent === undefined && sandboxContent === undefined) {
    return { filePath, changeType: 'modified', additions: 0, deletions: 0, hunks: [] };
  }

  // Added file — single hunk with all add lines
  if (targetContent === undefined) {
    const lines = sandboxContent!.split('\n');
    const diffLines: UnifiedDiffLine[] = lines.map((content, i) => ({
      type: 'add' as const,
      content,
      oldLineNumber: null,
      newLineNumber: i + 1,
    }));
    return {
      filePath,
      changeType: 'added',
      additions: lines.length,
      deletions: 0,
      hunks: [{
        oldStart: 0,
        oldLines: 0,
        newStart: 1,
        newLines: lines.length,
        lines: diffLines,
      }],
    };
  }

  // Deleted file — single hunk with all delete lines
  if (sandboxContent === undefined) {
    const lines = targetContent.split('\n');
    const diffLines: UnifiedDiffLine[] = lines.map((content, i) => ({
      type: 'delete' as const,
      content,
      oldLineNumber: i + 1,
      newLineNumber: null,
    }));
    return {
      filePath,
      changeType: 'deleted',
      additions: 0,
      deletions: lines.length,
      hunks: [{
        oldStart: 1,
        oldLines: lines.length,
        newStart: 0,
        newLines: 0,
        lines: diffLines,
      }],
    };
  }

  // Modified file — compute hunks from LCS diff
  const targetLines = targetContent.split('\n');
  const sandboxLines = sandboxContent.split('\n');
  const rawHunks = findDiffHunks(targetContent, sandboxContent);

  if (rawHunks.length === 0) {
    return { filePath, changeType: 'modified', additions: 0, deletions: 0, hunks: [] };
  }

  let totalAdditions = 0;
  let totalDeletions = 0;
  const CONTEXT_LINES = 3;
  const hunks: UnifiedDiffHunk[] = [];

  for (const raw of rawHunks) {
    // Convert conflict-style hunk to unified-style hunk with context
    const oldHunkStart = Math.max(1, raw.theirsStart - CONTEXT_LINES);
    const oldHunkEnd = Math.min(targetLines.length, (raw.theirsEnd || raw.theirsStart) + CONTEXT_LINES);
    const newHunkStart = Math.max(1, raw.yoursStart - CONTEXT_LINES);
    const newHunkEnd = Math.min(sandboxLines.length, (raw.yoursEnd || raw.yoursStart) + CONTEXT_LINES);

    const lines: UnifiedDiffLine[] = [];

    // Leading context
    for (let i = oldHunkStart; i < raw.theirsStart; i++) {
      const newLineNum = newHunkStart + (i - oldHunkStart);
      lines.push({
        type: 'context',
        content: targetLines[i - 1],
        oldLineNumber: i,
        newLineNumber: newLineNum,
      });
    }

    // Deleted lines
    for (let i = 0; i < raw.theirsLines.length; i++) {
      lines.push({
        type: 'delete',
        content: raw.theirsLines[i],
        oldLineNumber: raw.theirsStart + i,
        newLineNumber: null,
      });
      totalDeletions++;
    }

    // Added lines
    for (let i = 0; i < raw.yoursLines.length; i++) {
      lines.push({
        type: 'add',
        content: raw.yoursLines[i],
        oldLineNumber: null,
        newLineNumber: raw.yoursStart + i,
      });
      totalAdditions++;
    }

    // Trailing context
    const trailingOldStart = raw.theirsEnd || raw.theirsStart;
    const trailingNewStart = raw.yoursEnd || raw.yoursStart;
    for (let i = trailingOldStart + 1; i <= oldHunkEnd; i++) {
      const offset = i - trailingOldStart;
      lines.push({
        type: 'context',
        content: targetLines[i - 1] ?? '',
        oldLineNumber: i,
        newLineNumber: trailingNewStart + offset,
      });
    }

    const oldLines = lines.filter(l => l.type !== 'add').length;
    const newLines = lines.filter(l => l.type !== 'delete').length;

    hunks.push({
      oldStart: oldHunkStart,
      oldLines,
      newStart: newHunkStart,
      newLines,
      lines,
    });
  }

  return {
    filePath,
    changeType: 'modified',
    additions: totalAdditions,
    deletions: totalDeletions,
    hunks,
  };
}

/**
 * Build diffs for all changed files between target and sandbox file maps.
 */
export function buildAllFileDiffs(
  target: Map<string, string>,
  sandbox: Map<string, string>
): FileDiff[] {
  const allPaths = new Set([...target.keys(), ...sandbox.keys()]);
  const diffs: FileDiff[] = [];

  for (const filePath of allPaths) {
    const targetContent = target.get(filePath);
    const sandboxContent = sandbox.get(filePath);

    // Skip unchanged
    if (targetContent === sandboxContent) continue;

    diffs.push(buildFileDiff(filePath, targetContent, sandboxContent));
  }

  return diffs;
}

/** Directories to exclude when collecting files from disk */
const EXCLUDED_DIRS = new Set(['data', '.sync-base', 'node_modules', '.git']);

/**
 * Recursively collect all files in a directory as a Map of relative path → content.
 * Skips excluded directories (data, .sync-base, node_modules, .git).
 */
export async function collectDirectoryFiles(dirPath: string): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  async function walk(currentPath: string, relativePath: string) {
    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch {
      return; // Directory doesn't exist
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) {
          await walk(fullPath, relPath);
        }
      } else if (entry.isFile()) {
        const content = await fs.readFile(fullPath, 'utf-8');
        result.set(relPath, content);
      }
    }
  }

  await walk(dirPath, '');
  return result;
}
