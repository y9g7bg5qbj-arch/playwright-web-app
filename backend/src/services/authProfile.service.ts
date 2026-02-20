/**
 * Auth Profile Service
 *
 * Manages browser auth state profiles so QA can run tests with
 * pre-authenticated sessions. SDETs configure login bootstrap scripts;
 * QA selects a profile from a dropdown at run time.
 */

import { existsSync } from 'fs';
import { readFile, writeFile, mkdir, rename, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { spawn } from 'child_process';
import { authProfileRepository } from '../db/repositories/mongo';
import { logger } from '../utils/logger';
import type { MongoAuthProfile } from '../db/mongodb';

const STORAGE_DIR_NAME = 'AuthProfiles';
const REFRESH_TIMEOUT_MS = 60_000;

// ─── Public helpers ──────────────────────────────────────────────────────────

/**
 * Resolve the absolute directory where storage-state JSON files live
 * for a given project environment root.
 */
export function resolveAuthProfileDir(environmentRoot: string): string {
  return join(environmentRoot, 'Resources', STORAGE_DIR_NAME);
}

/**
 * Resolve the absolute path to a profile's storage-state file.
 */
export function resolveStorageStatePath(environmentRoot: string, profileName: string): string {
  const safe = profileName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(resolveAuthProfileDir(environmentRoot), `${safe}.storageState.json`);
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class AuthProfileService {
  /**
   * Create a new auth profile. Validates the login script path exists.
   */
  async create(data: {
    applicationId: string;
    projectId: string;
    name: string;
    description?: string;
    loginScriptPath: string;
    createdBy: string;
    environmentRoot: string;
  }): Promise<MongoAuthProfile> {
    if (!existsSync(data.loginScriptPath)) {
      throw new Error(`Login script not found: ${data.loginScriptPath}`);
    }

    const profile = await authProfileRepository.create({
      applicationId: data.applicationId,
      projectId: data.projectId,
      name: data.name,
      description: data.description,
      loginScriptPath: data.loginScriptPath,
      status: 'expired',
      createdBy: data.createdBy,
    });

    // Ensure the AuthProfiles resource directory exists
    await mkdir(resolveAuthProfileDir(data.environmentRoot), { recursive: true });

    return profile;
  }

  /**
   * Refresh an auth profile by executing its login bootstrap script,
   * capturing the resulting storage state, and persisting it to disk.
   *
   * Uses rename-on-success so a failed refresh preserves the previous file.
   */
  async refresh(profileId: string, environmentRoot: string): Promise<MongoAuthProfile> {
    const profile = await authProfileRepository.findById(profileId);
    if (!profile) throw new Error('Auth profile not found');

    await authProfileRepository.update(profileId, { status: 'refreshing', errorMessage: undefined });

    const targetPath = resolveStorageStatePath(environmentRoot, profile.name);
    const tempPath = `${targetPath}.tmp`;

    try {
      await mkdir(dirname(targetPath), { recursive: true });

      // Execute the login bootstrap script.
      // The script is expected to write a Playwright storageState JSON to stdout
      // or to the file path provided via VERO_STORAGE_STATE_OUTPUT env var.
      const storageState = await this.executeLoginScript(profile.loginScriptPath, tempPath);

      // Write the captured state to the temp file (if the script didn't already)
      if (!existsSync(tempPath)) {
        await writeFile(tempPath, storageState, 'utf-8');
      }

      // Validate JSON before promoting
      const raw = await readFile(tempPath, 'utf-8');
      JSON.parse(raw); // throws on bad JSON

      // Rename-on-success
      await rename(tempPath, targetPath);

      const updated = await authProfileRepository.update(profileId, {
        status: 'ready',
        storageStatePath: targetPath,
        lastRefreshedAt: new Date(),
        errorMessage: undefined,
      });

      return updated!;
    } catch (err: any) {
      // Clean up temp file on failure
      try { await unlink(tempPath); } catch { /* ignore */ }

      logger.error('[AuthProfile] Refresh failed', { profileId, error: err?.message });
      const updated = await authProfileRepository.update(profileId, {
        status: 'error',
        errorMessage: err?.message || 'Unknown refresh error',
      });
      return updated!;
    }
  }

  /**
   * Delete an auth profile and its storage-state file.
   */
  async delete(profileId: string, environmentRoot: string): Promise<void> {
    const profile = await authProfileRepository.findById(profileId);
    if (!profile) throw new Error('Auth profile not found');

    // Remove the storage state file
    const filePath = resolveStorageStatePath(environmentRoot, profile.name);
    try { await unlink(filePath); } catch { /* ignore if missing */ }

    await authProfileRepository.delete(profileId);
  }

  /**
   * Resolve a profile ID to its absolute storage-state file path.
   * Throws if the profile doesn't exist or isn't ready.
   */
  async resolve(profileId: string): Promise<string> {
    const profile = await authProfileRepository.findById(profileId);
    if (!profile) throw new Error('Auth profile not found');
    if (profile.status !== 'ready') {
      throw new Error(`Auth profile "${profile.name}" is not ready (status: ${profile.status})`);
    }
    if (!profile.storageStatePath || !existsSync(profile.storageStatePath)) {
      throw new Error(`Storage state file missing for profile "${profile.name}"`);
    }
    return profile.storageStatePath;
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private executeLoginScript(scriptPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const child = spawn('npx', ['playwright', 'test', scriptPath, '--reporter=list'], {
        env: {
          ...process.env,
          VERO_STORAGE_STATE_OUTPUT: outputPath,
        },
        timeout: REFRESH_TIMEOUT_MS,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      child.stdout.on('data', (data: Buffer) => chunks.push(data));

      let stderr = '';
      child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(Buffer.concat(chunks).toString('utf-8'));
        } else {
          reject(new Error(`Login script exited with code ${code}: ${stderr.slice(0, 500)}`));
        }
      });

      child.on('error', reject);
    });
  }
}

export const authProfileService = new AuthProfileService();
