/**
 * Line-level diff utilities for merge conflict resolution
 */

export interface DiffHunk {
  id: string;
  theirsStart: number;
  theirsEnd: number;
  yoursStart: number;
  yoursEnd: number;
  theirsLines: string[];
  yoursLines: string[];
}

export interface ConflictFile {
  filePath: string;
  theirsContent: string;
  yoursContent: string;
  hunks: DiffHunk[];
}

/**
 * Compute the longest common subsequence of two arrays
 */
function lcs<T>(a: T[], b: T[]): T[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the LCS
  const result: T[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return result;
}

/**
 * Find differing regions (hunks) between two file contents
 */
export function findDiffHunks(theirsContent: string, yoursContent: string): DiffHunk[] {
  const theirsLines = theirsContent.split('\n');
  const yoursLines = yoursContent.split('\n');

  const commonLines = lcs(theirsLines, yoursLines);
  const hunks: DiffHunk[] = [];

  let theirsIdx = 0;
  let yoursIdx = 0;
  let commonIdx = 0;
  let hunkId = 0;

  while (theirsIdx < theirsLines.length || yoursIdx < yoursLines.length) {
    // Skip matching lines
    while (
      commonIdx < commonLines.length &&
      theirsIdx < theirsLines.length &&
      yoursIdx < yoursLines.length &&
      theirsLines[theirsIdx] === commonLines[commonIdx] &&
      yoursLines[yoursIdx] === commonLines[commonIdx]
    ) {
      theirsIdx++;
      yoursIdx++;
      commonIdx++;
    }

    // Found a difference - collect the hunk
    const theirsStart = theirsIdx;
    const yoursStart = yoursIdx;
    const theirsDiffLines: string[] = [];
    const yoursDiffLines: string[] = [];

    // Collect differing lines from theirs until we hit the next common line
    while (
      theirsIdx < theirsLines.length &&
      (commonIdx >= commonLines.length || theirsLines[theirsIdx] !== commonLines[commonIdx])
    ) {
      theirsDiffLines.push(theirsLines[theirsIdx]);
      theirsIdx++;
    }

    // Collect differing lines from yours until we hit the next common line
    while (
      yoursIdx < yoursLines.length &&
      (commonIdx >= commonLines.length || yoursLines[yoursIdx] !== commonLines[commonIdx])
    ) {
      yoursDiffLines.push(yoursLines[yoursIdx]);
      yoursIdx++;
    }

    // Only create a hunk if there are actual differences
    if (theirsDiffLines.length > 0 || yoursDiffLines.length > 0) {
      hunks.push({
        id: `hunk-${hunkId++}`,
        theirsStart: theirsStart + 1, // 1-indexed
        theirsEnd: theirsIdx,
        yoursStart: yoursStart + 1, // 1-indexed
        yoursEnd: yoursIdx,
        theirsLines: theirsDiffLines,
        yoursLines: yoursDiffLines,
      });
    }
  }

  return hunks;
}

/**
 * Check if two files have conflicts (any differing content)
 */
export function hasConflicts(theirsContent: string, yoursContent: string): boolean {
  return theirsContent !== yoursContent;
}

/**
 * Compare all files between two directories and return conflict details
 */
export function compareFiles(
  theirsFiles: Map<string, string>,
  yoursFiles: Map<string, string>
): ConflictFile[] {
  const conflicts: ConflictFile[] = [];
  const allPaths = new Set([...theirsFiles.keys(), ...yoursFiles.keys()]);

  for (const filePath of allPaths) {
    const theirsContent = theirsFiles.get(filePath) || '';
    const yoursContent = yoursFiles.get(filePath) || '';

    if (hasConflicts(theirsContent, yoursContent)) {
      const hunks = findDiffHunks(theirsContent, yoursContent);
      conflicts.push({
        filePath,
        theirsContent,
        yoursContent,
        hunks,
      });
    }
  }

  return conflicts;
}

/**
 * Apply a resolution by replacing hunk content
 * resolution can be 'theirs', 'yours', 'both', or custom content
 */
export function applyHunkResolution(
  currentContent: string,
  hunk: DiffHunk,
  resolution: 'theirs' | 'yours' | 'both' | string
): string {
  const lines = currentContent.split('\n');

  let newLines: string[];
  if (resolution === 'theirs') {
    newLines = hunk.theirsLines;
  } else if (resolution === 'yours') {
    newLines = hunk.yoursLines;
  } else if (resolution === 'both') {
    newLines = [...hunk.theirsLines, ...hunk.yoursLines];
  } else {
    // Custom content
    newLines = resolution.split('\n');
  }

  // Replace the lines in the range
  const startIdx = hunk.yoursStart - 1; // Convert to 0-indexed
  const deleteCount = hunk.yoursEnd - hunk.yoursStart + 1;

  lines.splice(startIdx, deleteCount, ...newLines);

  return lines.join('\n');
}

/**
 * Generate a merged result from base content and resolved hunks
 */
export function generateMergedContent(
  yoursContent: string,
  hunks: DiffHunk[],
  resolutions: Map<string, 'theirs' | 'yours' | 'both' | string>
): string {
  let result = yoursContent;

  // Apply resolutions in reverse order to preserve line numbers
  const sortedHunks = [...hunks].sort((a, b) => b.yoursStart - a.yoursStart);

  for (const hunk of sortedHunks) {
    const resolution = resolutions.get(hunk.id);
    if (resolution) {
      result = applyHunkResolution(result, hunk, resolution);
    }
  }

  return result;
}
