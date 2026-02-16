import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface GitDiffFile {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

export interface GitDiffResult {
  files: GitDiffFile[];
  totalAdditions: number;
  totalDeletions: number;
}

export interface GitFileDiff {
  filePath: string;
  hunks: GitDiffHunk[];
}

export interface GitDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: GitDiffLine[];
}

export interface GitDiffLine {
  type: 'context' | 'add' | 'delete';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export class GitService {
  /**
   * Initialize a git repository in the given directory
   */
  async initRepo(repoPath: string): Promise<void> {
    try {
      // Check if already initialized
      const gitDir = path.join(repoPath, '.git');
      const exists = await fs.stat(gitDir).then(() => true).catch(() => false);

      if (exists) {
        logger.debug(`Git repo already initialized at ${repoPath}`);
        return;
      }

      await execAsync('git init', { cwd: repoPath });

      // Set initial config
      await execAsync('git config user.email "vero@local"', { cwd: repoPath });
      await execAsync('git config user.name "Vero System"', { cwd: repoPath });

      // Create initial commit with .gitkeep
      const gitkeepPath = path.join(repoPath, '.gitkeep');
      await fs.writeFile(gitkeepPath, '# Vero Test Project\n');
      await execAsync('git add .', { cwd: repoPath });
      await execAsync('git commit -m "Initial commit"', { cwd: repoPath });

      // Create dev and master branches
      await execAsync('git checkout -b dev', { cwd: repoPath });
      await execAsync('git checkout -b master', { cwd: repoPath });
      await execAsync('git checkout dev', { cwd: repoPath });

      logger.info(`Git repo initialized at ${repoPath}`);
    } catch (error: any) {
      logger.error('Failed to initialize git repo:', error.message);
      throw new Error(`Failed to initialize git repo: ${error.message}`);
    }
  }

  /**
   * Create a new branch from the current branch
   */
  async createBranch(repoPath: string, branchName: string, fromBranch: string = 'dev'): Promise<void> {
    try {
      // Ensure we're on the source branch
      await execAsync(`git checkout ${fromBranch}`, { cwd: repoPath });

      // Create and checkout new branch
      await execAsync(`git checkout -b ${branchName}`, { cwd: repoPath });

      logger.info(`Created branch ${branchName} from ${fromBranch}`);
    } catch (error: any) {
      throw new Error(`Failed to create branch ${branchName}: ${error.message}`);
    }
  }

  /**
   * Switch to a branch
   */
  async checkoutBranch(repoPath: string, branchName: string): Promise<void> {
    try {
      await execAsync(`git checkout ${branchName}`, { cwd: repoPath });
    } catch (error: any) {
      throw new Error(`Failed to checkout branch ${branchName}: ${error.message}`);
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(repoPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: repoPath });
      return stdout.trim();
    } catch (error: any) {
      throw new Error(`Failed to get current branch: ${error.message}`);
    }
  }

  /**
   * Check if branch exists
   */
  async branchExists(repoPath: string, branchName: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`git branch --list ${branchName}`, { cwd: repoPath });
      return stdout.trim().length > 0;
    } catch (error: any) {
      return false;
    }
  }

  /**
   * Delete a branch
   */
  async deleteBranch(repoPath: string, branchName: string, force: boolean = false): Promise<void> {
    try {
      const flag = force ? '-D' : '-d';
      await execAsync(`git branch ${flag} ${branchName}`, { cwd: repoPath });
    } catch (error: any) {
      throw new Error(`Failed to delete branch ${branchName}: ${error.message}`);
    }
  }

  /**
   * Stage and commit all changes
   */
  async commitAll(repoPath: string, message: string, authorEmail: string = 'vero@local'): Promise<string> {
    try {
      // Stage all changes
      await execAsync('git add -A', { cwd: repoPath });

      // Check if there are changes to commit
      const { stdout: status } = await execAsync('git status --porcelain', { cwd: repoPath });
      if (!status.trim()) {
        return ''; // No changes to commit
      }

      // Commit with author info
      await execAsync(
        `git commit -m "${message.replace(/"/g, '\\"')}" --author="${authorEmail} <${authorEmail}>"`,
        { cwd: repoPath }
      );

      // Get commit hash
      const { stdout: hash } = await execAsync('git rev-parse HEAD', { cwd: repoPath });
      return hash.trim();
    } catch (error: any) {
      throw new Error(`Failed to commit: ${error.message}`);
    }
  }

  /**
   * Get diff summary between two branches
   */
  async getDiffSummary(repoPath: string, fromBranch: string, toBranch: string): Promise<GitDiffResult> {
    try {
      const { stdout } = await execAsync(
        `git diff --stat ${fromBranch}...${toBranch}`,
        { cwd: repoPath }
      );

      const files: GitDiffFile[] = [];
      let totalAdditions = 0;
      let totalDeletions = 0;

      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        // Parse lines like: "file.ts | 10 +++---"
        const match = line.match(/^\s*(.+?)\s*\|\s*(\d+)\s*(\+*)(-*)/);
        if (match) {
          const [, filePath, , plusses, minuses] = match;
          const additions = plusses.length;
          const deletions = minuses.length;

          files.push({
            filePath: filePath.trim(),
            changeType: 'modified',
            additions,
            deletions,
          });

          totalAdditions += additions;
          totalDeletions += deletions;
        }
      }

      // Get new/deleted files
      const { stdout: nameStatus } = await execAsync(
        `git diff --name-status ${fromBranch}...${toBranch}`,
        { cwd: repoPath }
      );

      for (const line of nameStatus.trim().split('\n')) {
        const [status, filePath] = line.split('\t');
        const file = files.find(f => f.filePath === filePath);
        if (file) {
          if (status === 'A') file.changeType = 'added';
          else if (status === 'D') file.changeType = 'deleted';
        }
      }

      return { files, totalAdditions, totalDeletions };
    } catch (error: any) {
      throw new Error(`Failed to get diff: ${error.message}`);
    }
  }

  /**
   * Get detailed diff for a specific file between branches
   */
  async getFileDiff(repoPath: string, fromBranch: string, toBranch: string, filePath: string): Promise<GitFileDiff> {
    try {
      const { stdout } = await execAsync(
        `git diff ${fromBranch}...${toBranch} -- "${filePath}"`,
        { cwd: repoPath }
      );

      return this.parseUnifiedDiff(filePath, stdout);
    } catch (error: any) {
      throw new Error(`Failed to get file diff: ${error.message}`);
    }
  }

  /**
   * Get all file diffs between branches
   */
  async getAllFileDiffs(repoPath: string, fromBranch: string, toBranch: string): Promise<GitFileDiff[]> {
    try {
      const { stdout } = await execAsync(
        `git diff ${fromBranch}...${toBranch}`,
        { cwd: repoPath }
      );

      return this.parseAllDiffs(stdout);
    } catch (error: any) {
      throw new Error(`Failed to get all file diffs: ${error.message}`);
    }
  }

  /**
   * Merge a branch into the current branch
   */
  async mergeBranch(repoPath: string, branchToMerge: string): Promise<{ success: boolean; conflicts?: string[] }> {
    try {
      await execAsync(`git merge ${branchToMerge} --no-ff -m "Merge ${branchToMerge}"`, { cwd: repoPath });
      return { success: true };
    } catch (error: any) {
      // Check for merge conflicts
      if (error.message.includes('CONFLICT')) {
        const { stdout } = await execAsync('git diff --name-only --diff-filter=U', { cwd: repoPath });
        const conflicts = stdout.trim().split('\n').filter(Boolean);

        // Abort the merge
        await execAsync('git merge --abort', { cwd: repoPath });

        return { success: false, conflicts };
      }
      throw new Error(`Failed to merge ${branchToMerge}: ${error.message}`);
    }
  }

  /**
   * Sync a sandbox branch with the source branch (pull latest changes)
   */
  async syncWithSource(repoPath: string, sandboxBranch: string, sourceBranch: string): Promise<{ success: boolean; conflicts?: string[] }> {
    try {
      // Save current branch
      const currentBranch = await this.getCurrentBranch(repoPath);

      // Checkout sandbox branch
      await this.checkoutBranch(repoPath, sandboxBranch);

      // Try to merge source branch
      const result = await this.mergeBranch(repoPath, sourceBranch);

      // Return to original branch if different
      if (currentBranch !== sandboxBranch) {
        await this.checkoutBranch(repoPath, currentBranch);
      }

      return result;
    } catch (error: any) {
      throw new Error(`Failed to sync with ${sourceBranch}: ${error.message}`);
    }
  }

  /**
   * Get list of all branches
   */
  async listBranches(repoPath: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync('git branch', { cwd: repoPath });
      return stdout
        .split('\n')
        .map(line => line.replace('*', '').trim())
        .filter(Boolean);
    } catch (error: any) {
      throw new Error(`Failed to list branches: ${error.message}`);
    }
  }

  /**
   * Get commit history for a branch
   */
  async getCommitHistory(repoPath: string, branch: string, limit: number = 50): Promise<Array<{
    hash: string;
    shortHash: string;
    author: string;
    date: string;
    message: string;
  }>> {
    try {
      const { stdout } = await execAsync(
        `git log ${branch} --pretty=format:"%H|%h|%an|%ci|%s" -n ${limit}`,
        { cwd: repoPath }
      );

      return stdout.split('\n').filter(Boolean).map(line => {
        const [hash, shortHash, author, date, message] = line.split('|');
        return { hash, shortHash, author, date, message };
      });
    } catch (error: any) {
      throw new Error(`Failed to get commit history: ${error.message}`);
    }
  }

  /**
   * Parse unified diff format
   */
  private parseUnifiedDiff(filePath: string, diff: string): GitFileDiff {
    const hunks: GitDiffHunk[] = [];
    const hunkRegex = /@@\s*-(\d+)(?:,(\d+))?\s*\+(\d+)(?:,(\d+))?\s*@@/g;

    let match;
    const hunkMatches: Array<{ match: RegExpExecArray; index: number }> = [];

    while ((match = hunkRegex.exec(diff)) !== null) {
      hunkMatches.push({ match, index: match.index });
    }

    for (let i = 0; i < hunkMatches.length; i++) {
      const { match, index } = hunkMatches[i];
      const nextIndex = hunkMatches[i + 1]?.index ?? diff.length;
      const hunkContent = diff.slice(index + match[0].length, nextIndex);

      const oldStart = parseInt(match[1], 10);
      const oldLines = parseInt(match[2] || '1', 10);
      const newStart = parseInt(match[3], 10);
      const newLines = parseInt(match[4] || '1', 10);

      const lines: GitDiffLine[] = [];
      let oldLineNum = oldStart;
      let newLineNum = newStart;

      for (const line of hunkContent.split('\n')) {
        if (line.startsWith('+')) {
          lines.push({
            type: 'add',
            content: line.slice(1),
            newLineNumber: newLineNum++,
          });
        } else if (line.startsWith('-')) {
          lines.push({
            type: 'delete',
            content: line.slice(1),
            oldLineNumber: oldLineNum++,
          });
        } else if (line.startsWith(' ') || line === '') {
          lines.push({
            type: 'context',
            content: line.slice(1) || '',
            oldLineNumber: oldLineNum++,
            newLineNumber: newLineNum++,
          });
        }
      }

      hunks.push({ oldStart, oldLines, newStart, newLines, lines });
    }

    return { filePath, hunks };
  }

  /**
   * Parse multiple file diffs
   */
  private parseAllDiffs(diff: string): GitFileDiff[] {
    const files: GitFileDiff[] = [];
    const fileRegex = /diff --git a\/(.+?) b\/(.+?)\n/g;

    let match;
    const fileMatches: Array<{ filePath: string; index: number }> = [];

    while ((match = fileRegex.exec(diff)) !== null) {
      fileMatches.push({ filePath: match[2], index: match.index });
    }

    for (let i = 0; i < fileMatches.length; i++) {
      const { filePath, index } = fileMatches[i];
      const nextIndex = fileMatches[i + 1]?.index ?? diff.length;
      const fileDiff = diff.slice(index, nextIndex);

      files.push(this.parseUnifiedDiff(filePath, fileDiff));
    }

    return files;
  }

  /**
   * Check if there are uncommitted changes
   */
  async hasUncommittedChanges(repoPath: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: repoPath });
      return stdout.trim().length > 0;
    } catch (error: any) {
      throw new Error(`Failed to check for uncommitted changes: ${error.message}`);
    }
  }

  /**
   * Stash uncommitted changes
   */
  async stash(repoPath: string, message?: string): Promise<void> {
    try {
      const cmd = message ? `git stash push -m "${message}"` : 'git stash push';
      await execAsync(cmd, { cwd: repoPath });
    } catch (error: any) {
      throw new Error(`Failed to stash changes: ${error.message}`);
    }
  }

  /**
   * Apply stashed changes
   */
  async stashPop(repoPath: string): Promise<void> {
    try {
      await execAsync('git stash pop', { cwd: repoPath });
    } catch (error: any) {
      throw new Error(`Failed to apply stash: ${error.message}`);
    }
  }

  /**
   * Get file content from a specific branch
   */
  async getFileFromBranch(repoPath: string, branch: string, filePath: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync(
        `git show ${branch}:${filePath}`,
        { cwd: repoPath }
      );
      return stdout;
    } catch (error: any) {
      // File might not exist in that branch
      if (error.message.includes('does not exist') || error.message.includes('fatal:')) {
        return null;
      }
      throw new Error(`Failed to get file from branch: ${error.message}`);
    }
  }

  /**
   * Compare a file between two branches and return both versions plus diff
   */
  async compareFile(repoPath: string, sourceBranch: string, targetBranch: string, filePath: string): Promise<{
    sourceContent: string | null;
    targetContent: string | null;
    diff: GitFileDiff;
    sourceExists: boolean;
    targetExists: boolean;
  }> {
    const [sourceContent, targetContent] = await Promise.all([
      this.getFileFromBranch(repoPath, sourceBranch, filePath),
      this.getFileFromBranch(repoPath, targetBranch, filePath),
    ]);

    const diff = await this.getFileDiff(repoPath, targetBranch, sourceBranch, filePath);

    return {
      sourceContent,
      targetContent,
      diff,
      sourceExists: sourceContent !== null,
      targetExists: targetContent !== null,
    };
  }
}

export const gitService = new GitService();
