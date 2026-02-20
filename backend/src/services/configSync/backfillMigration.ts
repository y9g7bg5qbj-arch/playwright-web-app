/**
 * Backfill Migration
 *
 * One-time serialization of existing MongoDB records to data/ JSON files.
 * Idempotent: skips files that already exist with matching content.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { configSyncService } from './configSyncService';
import { logger } from '../../utils/logger';

export async function backfillConfigFiles(
  projectId: string,
  projectRoot: string,
  meta: { workflowId: string },
): Promise<{ filesWritten: number; skipped: number }> {
  // Check if data/ directory already has files
  const dataDir = join(projectRoot, 'data');
  const hasExistingData = existsSync(join(dataDir, 'run-configs'))
    || existsSync(join(dataDir, 'auth-profiles'));

  if (hasExistingData) {
    logger.info('[ConfigSync] Backfill: data/ directory already exists, performing incremental sync', { projectId });
  }

  const result = await configSyncService.syncToFiles(projectId, projectRoot, meta);

  logger.info('[ConfigSync] Backfill complete', {
    projectId,
    filesWritten: result.filesWritten,
  });

  return { filesWritten: result.filesWritten, skipped: 0 };
}
