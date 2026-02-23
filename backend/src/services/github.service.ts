/**
 * GitHub Integration Service
 *
 * Manages GitHub OAuth, repository configs, workflow run tracking,
 * and PR sync operations (via Octokit).
 */

import crypto from 'crypto';
import { Octokit } from '@octokit/rest';
import { githubIntegrationRepository, githubRepositoryConfigRepository, githubWorkflowRunRepository, githubWorkflowJobRepository } from '../db/repositories/mongo';

// Encryption key from environment (should be 32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;

// Note: If ENCRYPTION_KEY is not set, tokens will be stored base64-encoded (development mode only)

interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name?: string;
  email?: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
  owner: {
    login: string;
  };
}

interface GitHubWorkflowRun {
  id: number;
  name: string;
  run_number: number;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  html_url: string;
  event: string;
  head_branch: string;
  head_sha: string;
  created_at: string;
  updated_at: string;
  jobs_url: string;
  artifacts_url: string;
  logs_url: string;
}

interface GitHubJob {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  html_url: string;
  runner_name: string | null;
  started_at: string | null;
  completed_at: string | null;
  steps: Array<{
    name: string;
    status: 'queued' | 'in_progress' | 'completed';
    conclusion: 'success' | 'failure' | 'skipped' | null;
    number: number;
    started_at: string | null;
    completed_at: string | null;
  }>;
}

interface GitHubArtifact {
  id: number;
  name: string;
  size_in_bytes: number;
  expired: boolean;
  created_at: string;
  expires_at: string;
  archive_download_url: string;
}

// Encryption utilities - only encrypt if key is configured
function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    // Return with prefix to indicate unencrypted (for development)
    return 'UNENC:' + Buffer.from(text).toString('base64');
  }
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  // Handle unencrypted tokens (development mode)
  if (encryptedText.startsWith('UNENC:')) {
    return Buffer.from(encryptedText.slice(6), 'base64').toString('utf8');
  }
  if (!ENCRYPTION_KEY) {
    throw new Error('Cannot decrypt: GITHUB_TOKEN_ENCRYPTION_KEY not configured');
  }
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

class GitHubService {
  private baseUrl = 'https://api.github.com';

  /**
   * Validate a Personal Access Token
   */
  async validateToken(token: string): Promise<{ valid: boolean; user?: GitHubUser; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Vero-IDE',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return { valid: false, error: error.message || 'Invalid token' };
      }

      const user = await response.json() as GitHubUser;
      return { valid: true, user };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Save or update GitHub integration for a user
   */
  async saveIntegration(
    userId: string,
    token: string,
    tokenType: 'oauth' | 'pat',
    user: GitHubUser
  ) {
    const encryptedToken = encrypt(token);

    return githubIntegrationRepository.upsert(userId, {
      accessToken: encryptedToken,
      tokenType,
      login: user.login,
      avatarUrl: user.avatar_url,
      isValid: true,
      lastValidatedAt: new Date(),
    });
  }

  /**
   * Get user's GitHub integration
   */
  async getIntegration(userId: string) {
    const integration = await githubIntegrationRepository.findByUserId(userId);

    if (integration) {
      // Don't send the encrypted token to the frontend
      const { accessToken, ...safeIntegration } = integration;
      return safeIntegration;
    }

    return null;
  }

  /**
   * Get decrypted token for API calls
   */
  private async getToken(userId: string): Promise<string | null> {
    const integration = await githubIntegrationRepository.findByUserId(userId);

    if (!integration) return null;

    try {
      return decrypt(integration.accessToken);
    } catch {
      return null;
    }
  }

  /**
   * Get an authenticated Octokit instance for a user.
   */
  private async getOctokit(userId: string): Promise<Octokit> {
    const token = await this.getToken(userId);
    if (!token) throw new Error('GitHub not connected');
    return new Octokit({ auth: token, userAgent: 'Vero-IDE' });
  }

  /**
   * Delete GitHub integration
   */
  async deleteIntegration(userId: string) {
    return githubIntegrationRepository.delete(userId);
  }

  /**
   * List user's repositories
   */
  async listRepositories(userId: string): Promise<GitHubRepo[]> {
    const token = await this.getToken(userId);
    if (!token) throw new Error('GitHub not connected');

    const repos: GitHubRepo[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await fetch(
        `${this.baseUrl}/user/repos?per_page=${perPage}&page=${page}&sort=updated`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Vero-IDE',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }

      const pageRepos = await response.json() as GitHubRepo[];
      repos.push(...pageRepos);

      if (pageRepos.length < perPage) break;
      page++;

      // Safety limit
      if (page > 10) break;
    }

    return repos;
  }

  /**
   * Get repository branches
   */
  async getRepoBranches(userId: string, owner: string, repo: string): Promise<string[]> {
    const token = await this.getToken(userId);
    if (!token) throw new Error('GitHub not connected');

    const response = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/branches?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Vero-IDE',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch branches');
    }

    const branches = await response.json() as Array<{ name: string }>;
    return branches.map((b) => b.name);
  }

  /**
   * Trigger a workflow dispatch event
   */
  async triggerWorkflow(
    userId: string,
    owner: string,
    repo: string,
    workflowPath: string,
    ref: string,
    inputs?: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> {
    const token = await this.getToken(userId);
    if (!token) throw new Error('GitHub not connected');

    // Extract just the filename from the path
    const workflowFile = workflowPath.split('/').pop() || workflowPath;

    const response = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Vero-IDE',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref,
          inputs: inputs || {},
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      return { success: false, error: error.message };
    }

    // Workflow dispatch returns 204 No Content on success
    return { success: true };
  }

  /**
   * List workflow runs
   */
  async listWorkflowRuns(
    userId: string,
    owner: string,
    repo: string,
    options?: {
      workflowId?: string;
      branch?: string;
      status?: string;
      perPage?: number;
    }
  ): Promise<GitHubWorkflowRun[]> {
    const token = await this.getToken(userId);
    if (!token) throw new Error('GitHub not connected');

    const params = new URLSearchParams();
    if (options?.branch) params.set('branch', options.branch);
    if (options?.status) params.set('status', options.status);
    params.set('per_page', String(options?.perPage || 10));

    const url = options?.workflowId
      ? `${this.baseUrl}/repos/${owner}/${repo}/actions/workflows/${options.workflowId}/runs`
      : `${this.baseUrl}/repos/${owner}/${repo}/actions/runs`;

    const response = await fetch(`${url}?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Vero-IDE',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workflow runs');
    }

    const data = await response.json() as { workflow_runs: GitHubWorkflowRun[] };
    return data.workflow_runs;
  }

  /**
   * Get a specific workflow run
   */
  async getWorkflowRun(userId: string, owner: string, repo: string, runId: number): Promise<GitHubWorkflowRun> {
    const token = await this.getToken(userId);
    if (!token) throw new Error('GitHub not connected');

    const response = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/actions/runs/${runId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Vero-IDE',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch workflow run');
    }

    return response.json() as Promise<GitHubWorkflowRun>;
  }

  /**
   * Get jobs for a workflow run
   */
  async getWorkflowJobs(userId: string, owner: string, repo: string, runId: number): Promise<GitHubJob[]> {
    const token = await this.getToken(userId);
    if (!token) throw new Error('GitHub not connected');

    const response = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/actions/runs/${runId}/jobs`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Vero-IDE',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch workflow jobs');
    }

    const data = await response.json() as { jobs: GitHubJob[] };
    return data.jobs;
  }

  /**
   * List artifacts for a workflow run
   */
  async listArtifacts(userId: string, owner: string, repo: string, runId: number): Promise<GitHubArtifact[]> {
    const token = await this.getToken(userId);
    if (!token) throw new Error('GitHub not connected');

    const response = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Vero-IDE',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch artifacts');
    }

    const data = await response.json() as { artifacts: GitHubArtifact[] };
    return data.artifacts;
  }

  /**
   * Download an artifact
   */
  async downloadArtifact(userId: string, owner: string, repo: string, artifactId: number): Promise<Buffer> {
    const token = await this.getToken(userId);
    if (!token) throw new Error('GitHub not connected');

    const response = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/actions/artifacts/${artifactId}/zip`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Vero-IDE',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to download artifact');
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Cancel a workflow run
   */
  async cancelWorkflowRun(userId: string, owner: string, repo: string, runId: number): Promise<boolean> {
    const token = await this.getToken(userId);
    if (!token) throw new Error('GitHub not connected');

    const response = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/actions/runs/${runId}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Vero-IDE',
        },
      }
    );

    return response.ok;
  }

  /**
   * Re-run a workflow
   */
  async rerunWorkflow(userId: string, owner: string, repo: string, runId: number): Promise<boolean> {
    const token = await this.getToken(userId);
    if (!token) throw new Error('GitHub not connected');

    const response = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/actions/runs/${runId}/rerun`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Vero-IDE',
        },
      }
    );

    return response.ok;
  }

  /**
   * Save a repository configuration for a workflow
   */
  async saveRepositoryConfig(
    userId: string,
    workflowId: string,
    repoFullName: string,
    repoId: number,
    defaultBranch: string,
    workflowPath: string
  ) {
    const integration = await githubIntegrationRepository.findByUserId(userId);

    if (!integration) {
      throw new Error('GitHub not connected');
    }

    return githubRepositoryConfigRepository.upsert(workflowId, repoFullName, {
      integrationId: integration.id,
      repoId,
      defaultBranch,
      workflowPath,
      isActive: true,
      lastSyncedAt: new Date(),
    });
  }

  /**
   * Get repository config for a workflow
   */
  async getRepositoryConfig(workflowId: string) {
    return githubRepositoryConfigRepository.findByWorkflowId(workflowId);
  }

  /**
   * Track a GitHub workflow run in our database
   */
  async trackWorkflowRun(
    workflowId: string,
    executionId: string | null,
    run: GitHubWorkflowRun,
    repoFullName: string,
    configSnapshot?: string
  ) {
    return githubWorkflowRunRepository.upsert(String(run.id), {
      workflowId,
      executionId: executionId || undefined,
      runNumber: run.run_number,
      repoFullName,
      status: run.status,
      conclusion: run.conclusion || undefined,
      htmlUrl: run.html_url,
      event: run.event,
      headBranch: run.head_branch,
      headSha: run.head_sha,
      configSnapshot,
      artifactsUrl: run.artifacts_url,
      logsUrl: run.logs_url,
      startedAt: run.created_at ? new Date(run.created_at) : undefined,
      completedAt: run.status === 'completed' ? new Date() : undefined,
    });
  }

  /**
   * Update jobs for a tracked workflow run
   */
  async updateWorkflowJobs(runDbId: string, jobs: GitHubJob[]) {
    for (const job of jobs) {
      await githubWorkflowJobRepository.upsert(String(job.id), {
        runDbId,
        name: job.name,
        status: job.status,
        conclusion: job.conclusion || undefined,
        htmlUrl: job.html_url,
        runnerName: job.runner_name || undefined,
        startedAt: job.started_at ? new Date(job.started_at) : undefined,
        completedAt: job.completed_at ? new Date(job.completed_at) : undefined,
      });
    }
  }

  /**
   * Get tracked workflow runs for a Vero workflow
   */
  async getTrackedRuns(workflowId: string, limit = 20) {
    const runs = await githubWorkflowRunRepository.findByWorkflowId(workflowId, limit);

    // Add jobs to each run
    const runsWithJobs = await Promise.all(
      runs.map(async (run) => {
        const jobs = await githubWorkflowJobRepository.findByRunDbId(run.id);
        return { ...run, jobs };
      })
    );

    return runsWithJobs;
  }

  /**
   * Get logs for a specific job
   */
  async getJobLogs(userId: string, owner: string, repo: string, jobId: number): Promise<string> {
    const token = await this.getToken(userId);
    if (!token) {
      throw new Error('GitHub not connected');
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      // GitHub returns 302 redirect for logs
      if (response.status === 302) {
        const redirectUrl = response.headers.get('location');
        if (redirectUrl) {
          const logsResponse = await fetch(redirectUrl);
          return logsResponse.text();
        }
      }
      throw new Error(`Failed to get job logs: ${response.statusText}`);
    }

    return response.text();
  }

  /**
   * Get workflow run logs (all jobs)
   */
  async getRunLogs(userId: string, owner: string, repo: string, runId: number): Promise<string> {
    const token = await this.getToken(userId);
    if (!token) {
      throw new Error('GitHub not connected');
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/logs`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
        redirect: 'follow',
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get run logs: ${response.statusText}`);
    }

    return response.text();
  }

  // ============================================
  // GITHUB PR SYNC METHODS
  // ============================================

  /**
   * Sync sandbox files to a GitHub branch via the Trees API.
   * Creates/updates/deletes files to match the sandbox content.
   */
  async syncSandboxToBranch(
    userId: string,
    owner: string,
    repo: string,
    branchName: string,
    baseBranch: string,
    files: Map<string, string | null>
  ): Promise<{ sha: string }> {
    const octokit = await this.getOctokit(userId);

    // 1. Get the latest commit SHA on the base branch
    let baseCommitSha: string;
    try {
      const { data: refData } = await octokit.git.getRef({ owner, repo, ref: `heads/${baseBranch}` });
      baseCommitSha = refData.object.sha;
    } catch (err: any) {
      if (err.status === 404) throw new Error('GitHub repository or base branch not found. Check project settings.');
      throw new Error(`Failed to get base branch ref: ${err.message}`);
    }

    // 2. Get the base tree SHA
    const { data: commitData } = await octokit.git.getCommit({ owner, repo, commit_sha: baseCommitSha });
    const baseTreeSha = commitData.tree.sha;

    // 3. Build tree entries
    const tree: Array<{ path: string; mode: '100644'; type: 'blob'; content?: string; sha?: string | null }> = [];
    for (const [filePath, content] of files) {
      const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\//, '');
      if (content === null) {
        tree.push({ path: normalizedPath, mode: '100644', type: 'blob', sha: null });
      } else {
        tree.push({ path: normalizedPath, mode: '100644', type: 'blob', content });
      }
    }

    // 4. Create tree
    const { data: treeData } = await octokit.git.createTree({
      owner, repo,
      base_tree: baseTreeSha,
      tree: tree as any,
    });

    // 5. Create commit
    const { data: newCommit } = await octokit.git.createCommit({
      owner, repo,
      message: 'Sync sandbox files for PR',
      tree: treeData.sha,
      parents: [baseCommitSha],
    });

    // 6. Create or update branch ref
    try {
      await octokit.git.updateRef({
        owner, repo,
        ref: `heads/${branchName}`,
        sha: newCommit.sha,
        force: true,
      });
    } catch (err: any) {
      if (err.status === 422) {
        // Branch doesn't exist yet — create it
        await octokit.git.createRef({
          owner, repo,
          ref: `refs/heads/${branchName}`,
          sha: newCommit.sha,
        });
      } else {
        throw new Error(`Failed to update branch: ${err.message}`);
      }
    }

    return { sha: newCommit.sha };
  }

  /**
   * Create a GitHub PR from a branch.
   */
  async createGitHubPR(
    userId: string,
    owner: string,
    repo: string,
    head: string,
    base: string,
    title: string,
    body?: string
  ): Promise<{ number: number; html_url: string }> {
    const octokit = await this.getOctokit(userId);

    try {
      const { data: pr } = await octokit.pulls.create({
        owner, repo, title, body: body || '', head, base,
      });
      return { number: pr.number, html_url: pr.html_url };
    } catch (err: any) {
      if (err.status === 403) throw new Error('No write access to this repository.');
      if (err.status === 422) throw new Error(`Invalid branch or PR configuration: ${err.message || ''}`);
      throw new Error(`Failed to create GitHub PR: ${err.message}`);
    }
  }

  /**
   * Get files from a GitHub PR (paginated via Octokit).
   */
  async getGitHubPRFiles(
    userId: string,
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
    previous_filename?: string;
  }>> {
    const octokit = await this.getOctokit(userId);

    try {
      const files = await octokit.paginate(octokit.pulls.listFiles, {
        owner, repo, pull_number: prNumber, per_page: 100,
      });
      return files.map(f => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch,
        previous_filename: f.previous_filename,
      }));
    } catch (err: any) {
      if (err.status === 401) throw new Error('GitHub token expired. Reconnect in Settings.');
      if (err.status === 404) throw new Error('GitHub PR not found.');
      throw new Error(`Failed to fetch PR files: ${err.message}`);
    }
  }

  /**
   * Check if a GitHub PR is mergeable with bounded exponential backoff.
   * GitHub computes mergeability asynchronously, so we poll.
   */
  async getPullRequestWithMergeable(
    userId: string,
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<{ mergeable: boolean | null; mergeable_state: string; state: string }> {
    const octokit = await this.getOctokit(userId);
    const delays = [1000, 2000, 4000, 8000, 16000]; // bounded exponential backoff

    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        const { data: pr } = await octokit.pulls.get({ owner, repo, pull_number: prNumber });

        // mergeable is null while GitHub is still computing
        if (pr.mergeable !== null) {
          return {
            mergeable: pr.mergeable,
            mergeable_state: pr.mergeable_state ?? 'unknown',
            state: pr.state,
          };
        }
      } catch (err: any) {
        if (err.status === 404) throw new Error('GitHub PR not found.');
        throw new Error(`Failed to check PR mergeability: ${err.message}`);
      }

      // Wait before retrying if we have retries left
      if (attempt < delays.length) {
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      }
    }

    throw new Error('GITHUB_TIMEOUT: Could not determine merge status. Try again in a moment.');
  }

  /**
   * Merge a GitHub PR via the merge API.
   */
  async mergeGitHubPR(
    userId: string,
    owner: string,
    repo: string,
    prNumber: number,
    commitTitle?: string,
    mergeMethod: 'merge' | 'squash' | 'rebase' = 'squash'
  ): Promise<{ merged: boolean; message: string }> {
    const octokit = await this.getOctokit(userId);

    try {
      const { data } = await octokit.pulls.merge({
        owner, repo, pull_number: prNumber,
        commit_title: commitTitle,
        merge_method: mergeMethod,
      });
      return { merged: data.merged, message: data.message };
    } catch (err: any) {
      // 405 = method not allowed (branch protection), 409 = merge conflict
      if (err.status === 405 || err.status === 409) {
        throw new Error('MERGE_CONFLICT: Update Sandbox from Dev to resolve conflicts.');
      }
      if (err.status === 403) throw new Error('No write access to this repository.');
      throw new Error(`Failed to merge GitHub PR: ${err.message}`);
    }
  }
}

export const githubService = new GitHubService();
export default githubService;
