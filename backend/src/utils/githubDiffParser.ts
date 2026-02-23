/**
 * GitHub Diff Parser
 *
 * Parses GitHub's unified diff patch format into the FileDiff shape
 * expected by the frontend DiffViewer component.
 */

import type { GitFileDiff, GitDiffHunk, GitDiffLine } from '../services/git.service';

/** GitHub PR file from the List pull request files API */
export interface GitHubPRFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  patch?: string;
  previous_filename?: string;
}

/**
 * Parse a single GitHub unified diff patch string into an array of hunks.
 *
 * GitHub's patch format is standard unified diff without the file headers:
 *   @@ -oldStart,oldLines +newStart,newLines @@
 *   context line
 *   -deleted line
 *   +added line
 */
export function parseGithubPatchToHunks(patch: string): GitDiffHunk[] {
  if (!patch) return [{
    oldStart: 0,
    oldLines: 0,
    newStart: 0,
    newLines: 0,
    lines: [{
      type: 'context' as const,
      content: 'Binary file or diff too large to display inline.',
      oldLineNumber: null,
      newLineNumber: null,
    }],
  }];

  const lines = patch.split('\n');
  const hunks: GitDiffHunk[] = [];
  let currentHunk: GitDiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    // Hunk header: @@ -oldStart,oldLines +newStart,newLines @@
    const hunkMatch = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
    if (hunkMatch) {
      currentHunk = {
        oldStart: parseInt(hunkMatch[1], 10),
        oldLines: parseInt(hunkMatch[2] ?? '1', 10),
        newStart: parseInt(hunkMatch[3], 10),
        newLines: parseInt(hunkMatch[4] ?? '1', 10),
        lines: [],
      };
      hunks.push(currentHunk);
      oldLine = currentHunk.oldStart;
      newLine = currentHunk.newStart;
      continue;
    }

    if (!currentHunk) continue;

    if (line.startsWith('+')) {
      currentHunk.lines.push({
        type: 'add',
        content: line.slice(1),
        oldLineNumber: null,
        newLineNumber: newLine,
      });
      newLine++;
    } else if (line.startsWith('-')) {
      currentHunk.lines.push({
        type: 'delete',
        content: line.slice(1),
        oldLineNumber: oldLine,
        newLineNumber: null,
      });
      oldLine++;
    } else if (line.startsWith('\\')) {
      // "\ No newline at end of file" — skip
      continue;
    } else {
      // Context line (may have leading space)
      currentHunk.lines.push({
        type: 'context',
        content: line.startsWith(' ') ? line.slice(1) : line,
        oldLineNumber: oldLine,
        newLineNumber: newLine,
      });
      oldLine++;
      newLine++;
    }
  }

  return hunks;
}

/**
 * Map GitHub file status to our changeType.
 */
function mapChangeType(status: GitHubPRFile['status']): 'added' | 'modified' | 'deleted' {
  switch (status) {
    case 'added': return 'added';
    case 'removed': return 'deleted';
    default: return 'modified';
  }
}

/**
 * Convert a GitHub PR file to our GitFileDiff format.
 * If patch is missing (binary or too large), returns a placeholder hunk.
 */
export function githubFileToFileDiff(file: GitHubPRFile): GitFileDiff & {
  changeType: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
} {
  const hunks = parseGithubPatchToHunks(file.patch ?? '');

  return {
    filePath: file.filename,
    changeType: mapChangeType(file.status),
    additions: file.additions,
    deletions: file.deletions,
    hunks,
  };
}

/**
 * Convert an array of GitHub PR files to our diff summary format.
 */
export function githubFilesToDiffSummary(files: GitHubPRFile[]): {
  files: Array<{ filePath: string; changeType: 'added' | 'modified' | 'deleted'; additions: number; deletions: number }>;
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
} {
  let totalAdditions = 0;
  let totalDeletions = 0;

  const summaryFiles = files.map(f => {
    totalAdditions += f.additions;
    totalDeletions += f.deletions;
    return {
      filePath: f.filename,
      changeType: mapChangeType(f.status),
      additions: f.additions,
      deletions: f.deletions,
    };
  });

  return {
    files: summaryFiles,
    totalFiles: files.length,
    totalAdditions,
    totalDeletions,
  };
}
