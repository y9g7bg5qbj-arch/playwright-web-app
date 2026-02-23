/**
 * Config Sync Service
 *
 * File-authoritative config sync: JSON files in data/ are the source of truth.
 * MongoDB serves as a read-through cache. On sync, files win over DB.
 */

import { readFile, writeFile, readdir, mkdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename, extname } from 'path';
import { createHash } from 'crypto';
import { runConfigurationRepository, authProfileRepository, configSyncStateRepository } from '../../db/repositories/mongo';
import { serializeRunConfig, deserializeRunConfig, runConfigFileName } from './serializers/runConfigSerializer';
import { serializeAuthProfile, deserializeAuthProfile, authProfileFileName } from './serializers/authProfileSerializer';
import { logger } from '../../utils/logger';
import type { MongoRunConfiguration, MongoAuthProfile } from '../../db/mongodb';

// ─── Constants ──────────────────────────────────────────────────────────────

const DATA_DIR = 'data';
const RUN_CONFIGS_DIR = 'run-configs';
const AUTH_PROFILES_DIR = 'auth-profiles';

// ─── Helpers ────────────────────────────────────────────────────────────────

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

async function readJsonFiles(dir: string): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  if (!existsSync(dir)) return files;

  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && extname(entry.name) === '.json') {
      const content = await readFile(join(dir, entry.name), 'utf-8');
      files.set(entry.name, content);
    }
  }
  return files;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class ConfigSyncService {
  /**
   * Sync files → MongoDB. File content wins on conflict.
   */
  async syncToMongo(
    projectRoot: string,
    projectId: string,
    meta: { workflowId: string; applicationId: string; userId: string },
  ): Promise<{ syncedConfigs: number; syncedProfiles: number; conflicts: string[] }> {
    const conflicts: string[] = [];
    let syncedConfigs = 0;
    let syncedProfiles = 0;
    const fileHashes: Record<string, string> = {};

    // ── Run Configs ──────────────────────────────────────────────────────
    const runConfigDir = join(projectRoot, DATA_DIR, RUN_CONFIGS_DIR);
    const runConfigFiles = await readJsonFiles(runConfigDir);

    for (const [fileName, content] of runConfigFiles) {
      fileHashes[`${RUN_CONFIGS_DIR}/${fileName}`] = sha256(content);

      const deserialized = deserializeRunConfig(content, {
        workflowId: meta.workflowId,
        projectId,
      });
      if (!deserialized || !deserialized.name) {
        conflicts.push(`${RUN_CONFIGS_DIR}/${fileName}: invalid JSON`);
        continue;
      }

      // Find existing by name + projectId
      const existing = (await runConfigurationRepository.findByWorkflowIdAndProjectId(
        meta.workflowId,
        projectId,
      )).find((c) => c.name === deserialized.name);

      if (existing) {
        await runConfigurationRepository.update(existing.id, {
          ...deserialized,
          updatedAt: new Date(),
        });
      } else {
        await runConfigurationRepository.create({
          ...deserialized as any,
          workflowId: meta.workflowId,
          projectId,
          name: deserialized.name,
          isDefault: deserialized.isDefault ?? false,
          tags: deserialized.tags || [],
          tagMode: deserialized.tagMode || 'any',
          excludeTags: deserialized.excludeTags || [],
          testFlowIds: [],
          target: deserialized.target || 'local',
          browser: deserialized.browser || 'chromium',
          headless: deserialized.headless ?? true,
          viewport: deserialized.viewport || '{"width":1280,"height":720}',
          workers: deserialized.workers ?? 1,
          shardCount: deserialized.shardCount ?? 0,
          retries: deserialized.retries ?? 0,
          timeout: deserialized.timeout ?? 30000,
          tracing: deserialized.tracing || 'on',
          screenshot: deserialized.screenshot || 'on-failure',
          video: deserialized.video || 'off',
        });
      }
      syncedConfigs++;
    }

    // ── Auth Profiles ────────────────────────────────────────────────────
    const authProfileDir = join(projectRoot, DATA_DIR, AUTH_PROFILES_DIR);
    const authProfileFiles = await readJsonFiles(authProfileDir);

    for (const [fileName, content] of authProfileFiles) {
      fileHashes[`${AUTH_PROFILES_DIR}/${fileName}`] = sha256(content);

      const deserialized = deserializeAuthProfile(content, {
        applicationId: meta.applicationId,
        projectId,
        createdBy: meta.userId,
      });
      if (!deserialized || !deserialized.name) {
        conflicts.push(`${AUTH_PROFILES_DIR}/${fileName}: invalid JSON`);
        continue;
      }

      const existing = (await authProfileRepository.findByProjectId(projectId))
        .find((p) => p.name === deserialized.name);

      if (existing) {
        await authProfileRepository.update(existing.id, {
          ...deserialized,
          updatedAt: new Date(),
        });
      } else {
        await authProfileRepository.create({
          applicationId: meta.applicationId,
          projectId,
          name: deserialized.name!,
          loginScriptPath: deserialized.loginScriptPath || '',
          status: 'expired',
          createdBy: meta.userId,
          description: deserialized.description,
        });
      }
      syncedProfiles++;
    }

    // ── Update sync state ────────────────────────────────────────────────
    await configSyncStateRepository.upsert(projectId, {
      fileHashes: JSON.stringify(fileHashes),
      status: conflicts.length > 0 ? 'conflict' : 'synced',
      lastConflictAt: conflicts.length > 0 ? new Date() : undefined,
      conflictLog: JSON.stringify(
        conflicts.map((c) => ({ file: c, timestamp: new Date(), resolution: 'file-wins' })),
      ),
    });

    logger.info('[ConfigSync] Sync complete', {
      projectId,
      syncedConfigs,
      syncedProfiles,
      conflicts: conflicts.length,
    });

    return { syncedConfigs, syncedProfiles, conflicts };
  }

  /**
   * Sync MongoDB → files. Serializes DB records to canonical JSON.
   */
  async syncToFiles(
    projectId: string,
    projectRoot: string,
    meta: { workflowId: string },
  ): Promise<{ filesWritten: number }> {
    let filesWritten = 0;

    // ── Run Configs ──────────────────────────────────────────────────────
    const runConfigDir = join(projectRoot, DATA_DIR, RUN_CONFIGS_DIR);
    await mkdir(runConfigDir, { recursive: true });

    const configs = await runConfigurationRepository.findByWorkflowIdAndProjectId(
      meta.workflowId,
      projectId,
    );

    for (const config of configs) {
      const content = serializeRunConfig(config);
      const fileName = runConfigFileName(config);
      await writeFile(join(runConfigDir, fileName), content, 'utf-8');
      filesWritten++;
    }

    // ── Auth Profiles ────────────────────────────────────────────────────
    const authProfileDir = join(projectRoot, DATA_DIR, AUTH_PROFILES_DIR);
    await mkdir(authProfileDir, { recursive: true });

    const profiles = await authProfileRepository.findByProjectId(projectId);
    for (const profile of profiles) {
      const content = serializeAuthProfile(profile);
      const fileName = authProfileFileName(profile);
      await writeFile(join(authProfileDir, fileName), content, 'utf-8');
      filesWritten++;
    }

    return { filesWritten };
  }

  /**
   * Detect drift between file hashes and last-synced state.
   */
  async detectDrift(
    projectRoot: string,
    projectId: string,
  ): Promise<{ drifted: boolean; changedFiles: string[] }> {
    const syncState = await configSyncStateRepository.findByProjectId(projectId);
    if (!syncState) return { drifted: false, changedFiles: [] };

    let previousHashes: Record<string, string> = {};
    try {
      previousHashes = JSON.parse(syncState.fileHashes || '{}');
    } catch { /* empty */ }

    const changedFiles: string[] = [];

    for (const subDir of [RUN_CONFIGS_DIR, AUTH_PROFILES_DIR]) {
      const dir = join(projectRoot, DATA_DIR, subDir);
      const files = await readJsonFiles(dir);

      for (const [fileName, content] of files) {
        const key = `${subDir}/${fileName}`;
        const currentHash = sha256(content);
        if (previousHashes[key] !== currentHash) {
          changedFiles.push(key);
        }
      }

      // Check for deleted files
      for (const key of Object.keys(previousHashes)) {
        if (key.startsWith(`${subDir}/`) && !files.has(key.slice(subDir.length + 1))) {
          changedFiles.push(key);
        }
      }
    }

    return { drifted: changedFiles.length > 0, changedFiles };
  }
}

export const configSyncService = new ConfigSyncService();
