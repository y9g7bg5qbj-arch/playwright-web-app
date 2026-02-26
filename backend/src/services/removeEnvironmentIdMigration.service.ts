/**
 * One-time migration: Remove environmentId from run configurations.
 *
 * For each run configuration that has an environmentId set:
 * 1. Look up the referenced environment (user environment or execution environment).
 * 2. Copy its variables (and baseUrl → BASE_URL) into the config's envVars JSON,
 *    preserving existing envVars precedence (existing keys win).
 * 3. Clear the environmentId field.
 *
 * Safe to run multiple times (idempotent): configs with no environmentId are skipped.
 */

import { getDb, COLLECTIONS } from '../db/mongodb';
import {
  executionEnvironmentRepository,
  userEnvironmentRepository,
  environmentVariableRepository,
  runConfigurationRepository,
} from '../db/repositories/mongo';
import { logger } from '../utils/logger';

interface MigrationCounters {
  total: number;
  migrated: number;
  skipped: number;
  missingEnvironment: number;
  errors: number;
}

export async function migrateRemoveEnvironmentId(): Promise<MigrationCounters> {
  const counters: MigrationCounters = {
    total: 0,
    migrated: 0,
    skipped: 0,
    missingEnvironment: 0,
    errors: 0,
  };

  const collection = getDb().collection(COLLECTIONS.RUN_CONFIGURATIONS);

  // Find all configs that still reference an environment.
  const configsWithEnvId = await collection
    .find({ environmentId: { $exists: true, $ne: null } })
    .toArray();

  counters.total = configsWithEnvId.length;

  if (counters.total === 0) {
    logger.info('[Migration:removeEnvironmentId] No run configurations with environmentId found — nothing to migrate.');
    return counters;
  }

  logger.info(`[Migration:removeEnvironmentId] Found ${counters.total} run configurations to migrate.`);

  for (const config of configsWithEnvId) {
    try {
      const envId = config.environmentId as string;
      let migratedVars: Record<string, string> = {};

      // Try user environment first (the scheduler used this system).
      const userEnv = await userEnvironmentRepository.findById(envId);
      if (userEnv) {
        const variables = await environmentVariableRepository.findByEnvironmentId(userEnv.id);
        for (const v of variables) {
          migratedVars[v.key] = String(v.value ?? '');
        }
      } else {
        // Fall back to execution environment (per-workflow, legacy).
        const execEnv = await executionEnvironmentRepository.findById(envId);
        if (execEnv) {
          // Copy baseUrl as BASE_URL.
          if (execEnv.baseUrl) {
            migratedVars['BASE_URL'] = execEnv.baseUrl;
          }
          // Parse variables JSON string.
          if (execEnv.variables) {
            try {
              const parsed = typeof execEnv.variables === 'string'
                ? JSON.parse(execEnv.variables)
                : execEnv.variables;
              if (parsed && typeof parsed === 'object') {
                for (const [k, v] of Object.entries(parsed)) {
                  migratedVars[k] = String(v ?? '');
                }
              }
            } catch {
              logger.warn(`[Migration:removeEnvironmentId] Failed to parse variables JSON for environment ${envId}`);
            }
          }
        } else {
          // Neither system has this environment — drop the reference.
          counters.missingEnvironment++;
          logger.warn(`[Migration:removeEnvironmentId] Environment ${envId} not found for config ${config.id} — clearing environmentId.`);
        }
      }

      // Normalize baseUrl → BASE_URL if BASE_URL isn't already present.
      if (migratedVars['baseUrl'] && !migratedVars['BASE_URL']) {
        migratedVars['BASE_URL'] = migratedVars['baseUrl'];
        delete migratedVars['baseUrl'];
      }

      // Parse existing envVars (existing keys take precedence).
      let existingEnvVars: Record<string, string> = {};
      if (config.envVars) {
        try {
          existingEnvVars = typeof config.envVars === 'string'
            ? JSON.parse(config.envVars)
            : config.envVars;
        } catch {
          existingEnvVars = {};
        }
      }

      // Merge: migrated vars as base, existing vars override.
      const mergedEnvVars = { ...migratedVars, ...existingEnvVars };

      // Update the config: set envVars, clear environmentId.
      await collection.updateOne(
        { id: config.id },
        {
          $set: {
            envVars: JSON.stringify(mergedEnvVars),
            updatedAt: new Date(),
          },
          $unset: { environmentId: '' },
        },
      );

      counters.migrated++;
    } catch (error: any) {
      counters.errors++;
      logger.error(`[Migration:removeEnvironmentId] Error migrating config ${config.id}: ${error.message}`);
    }
  }

  logger.info(
    `[Migration:removeEnvironmentId] Complete: ${counters.migrated} migrated, ${counters.missingEnvironment} missing env, ${counters.skipped} skipped, ${counters.errors} errors.`,
  );

  return counters;
}
