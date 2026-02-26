import { COLLECTIONS, getDb, type MongoRunConfiguration } from '../db/mongodb';
import {
  applicationRepository,
  environmentVariableRepository,
  projectRepository,
  runParameterDefinitionRepository,
  runParameterSetRepository,
  workflowRepository,
  type MongoUserEnvironment,
} from '../db/repositories/mongo';
import { logger } from '../utils/logger';

interface DefinitionCacheEntry {
  knownNames: Set<string>;
  nextOrder: number;
}

export interface EnvVarsToParametersMigrationStats {
  runConfigsScanned: number;
  runConfigsMigrated: number;
  runConfigsMissingApplication: number;
  runConfigErrors: number;
  userEnvironmentsScanned: number;
  userEnvironmentsWithoutApplications: number;
  environmentReplications: number;
  parameterSetsCreated: number;
  parameterSetsUpdated: number;
  defaultSetsAssigned: number;
  definitionsCreated: number;
  secretValuesSkipped: number;
}

function parseRecord(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore parse failures and fall back to empty object
  }
  return {};
}

function toStringMap(value: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = rawKey.trim();
    if (!key) continue;
    result[key] = String(rawValue ?? '');
  }
  return result;
}

function normalizeOverrides(value: Record<string, unknown>): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = rawKey.trim();
    if (!key) continue;
    if (typeof rawValue === 'string' || typeof rawValue === 'number' || typeof rawValue === 'boolean') {
      result[key] = rawValue;
    } else {
      result[key] = String(rawValue ?? '');
    }
  }
  return result;
}

function valuesEqual(
  a: Record<string, string | number | boolean>,
  b: Record<string, string | number | boolean>
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (String(a[key]) !== String(b[key])) return false;
  }
  return true;
}

async function loadDefinitionCache(applicationId: string): Promise<DefinitionCacheEntry> {
  const defs = await runParameterDefinitionRepository.findByApplicationId(applicationId);
  return {
    knownNames: new Set(defs.map((def) => def.name)),
    nextOrder: defs.reduce((max, def) => Math.max(max, def.order), -1) + 1,
  };
}

async function ensureDefinitions(
  applicationId: string,
  keys: string[],
  cache: Map<string, DefinitionCacheEntry>
): Promise<number> {
  const normalizedKeys = Array.from(new Set(keys.map((key) => key.trim()).filter(Boolean)));
  if (normalizedKeys.length === 0) return 0;

  let entry = cache.get(applicationId);
  if (!entry) {
    entry = await loadDefinitionCache(applicationId);
    cache.set(applicationId, entry);
  }

  let created = 0;
  for (const key of normalizedKeys) {
    if (entry.knownNames.has(key)) continue;

    await runParameterDefinitionRepository.create({
      applicationId,
      name: key,
      type: 'string',
      label: key,
      required: false,
      order: entry.nextOrder,
    });
    entry.nextOrder += 1;
    entry.knownNames.add(key);
    created += 1;
  }

  return created;
}

async function resolveRunConfigApplicationId(config: MongoRunConfiguration): Promise<string | null> {
  const projectId = typeof config.projectId === 'string' ? config.projectId.trim() : '';
  if (projectId) {
    const project = await projectRepository.findById(projectId);
    if (project?.applicationId) return project.applicationId;

    const application = await applicationRepository.findById(projectId);
    if (application?.id) return application.id;
  }

  const workflowId = typeof config.workflowId === 'string' ? config.workflowId.trim() : '';
  if (workflowId) {
    const workflow = await workflowRepository.findById(workflowId);
    if (workflow?.applicationId) return workflow.applicationId;
  }

  return null;
}

async function migrateRunConfigEnvVars(
  stats: EnvVarsToParametersMigrationStats,
  definitionCache: Map<string, DefinitionCacheEntry>
): Promise<void> {
  const runConfigCollection = getDb().collection<MongoRunConfiguration>(COLLECTIONS.RUN_CONFIGURATIONS);
  const configs = await runConfigCollection
    .find({ envVars: { $exists: true } })
    .toArray();

  stats.runConfigsScanned = configs.length;
  for (const config of configs) {
    try {
      const legacyEnvVars = toStringMap(parseRecord(config.envVars));
      const existingOverrides = normalizeOverrides(parseRecord(config.parameterOverrides));
      const mergedOverrides: Record<string, string | number | boolean> = {
        ...existingOverrides,
        ...legacyEnvVars,
      };

      const updateOps: Record<string, any> = {
        $set: { updatedAt: new Date() },
        $unset: { envVars: '' },
      };

      if (Object.keys(mergedOverrides).length > 0) {
        updateOps.$set.parameterOverrides = JSON.stringify(mergedOverrides);
      } else {
        updateOps.$unset.parameterOverrides = '';
      }

      await runConfigCollection.updateOne({ id: config.id }, updateOps);
      stats.runConfigsMigrated += 1;

      if (Object.keys(legacyEnvVars).length === 0) {
        continue;
      }

      const applicationId = await resolveRunConfigApplicationId(config);
      if (!applicationId) {
        stats.runConfigsMissingApplication += 1;
        logger.warn('[EnvVarsToParametersMigration] Migrated run config overrides but could not resolve application for definition creation', {
          runConfigurationId: config.id,
          workflowId: config.workflowId,
          projectId: config.projectId,
        });
        continue;
      }

      stats.definitionsCreated += await ensureDefinitions(
        applicationId,
        Object.keys(legacyEnvVars),
        definitionCache,
      );
    } catch (error: any) {
      stats.runConfigErrors += 1;
      logger.warn('[EnvVarsToParametersMigration] Failed migrating run config envVars', {
        runConfigurationId: config.id,
        error: error?.message || String(error),
      });
    }
  }
}

async function migrateUserEnvironments(
  stats: EnvVarsToParametersMigrationStats,
  definitionCache: Map<string, DefinitionCacheEntry>
): Promise<void> {
  const userEnvCollection = getDb().collection<MongoUserEnvironment>(COLLECTIONS.USER_ENVIRONMENTS);
  const userEnvironments = await userEnvCollection.find({}).toArray();
  stats.userEnvironmentsScanned = userEnvironments.length;
  if (userEnvironments.length === 0) return;

  const applications = await applicationRepository.findAll();
  const appsByUser = new Map<string, Array<{ id: string }>>();
  for (const app of applications) {
    const existing = appsByUser.get(app.userId) || [];
    existing.push({ id: app.id });
    appsByUser.set(app.userId, existing);
  }

  for (const userEnvironment of userEnvironments) {
    const targetApps = appsByUser.get(userEnvironment.userId) || [];
    if (targetApps.length === 0) {
      stats.userEnvironmentsWithoutApplications += 1;
      continue;
    }

    const variables = await environmentVariableRepository.findByEnvironmentId(userEnvironment.id);
    const migratedValues: Record<string, string | number | boolean> = {};
    const skippedSecretKeys: string[] = [];

    for (const variable of variables) {
      const key = typeof variable.key === 'string' ? variable.key.trim() : '';
      if (!key) continue;

      const isSecret = Boolean((variable as any).isSecret) || Boolean((variable as any).sensitive);
      if (isSecret) {
        skippedSecretKeys.push(key);
        continue;
      }

      migratedValues[key] = String(variable.value ?? '');
    }

    if (skippedSecretKeys.length > 0) {
      stats.secretValuesSkipped += skippedSecretKeys.length;
      logger.warn('[EnvVarsToParametersMigration] Skipping secret environment values during migration', {
        userId: userEnvironment.userId,
        environmentId: userEnvironment.id,
        environmentName: userEnvironment.name,
        skippedKeys: skippedSecretKeys,
        skippedCount: skippedSecretKeys.length,
      });
    }

    for (const app of targetApps) {
      stats.environmentReplications += 1;
      stats.definitionsCreated += await ensureDefinitions(app.id, Object.keys(migratedValues), definitionCache);

      const setName = `Migrated: ${userEnvironment.name}`;
      const allSets = await runParameterSetRepository.findByApplicationId(app.id);
      const existingSet = allSets.find((set) => set.name === setName);
      const hasDefaultSet = allSets.some((set) => set.isDefault);

      if (!existingSet) {
        const created = await runParameterSetRepository.create({
          applicationId: app.id,
          name: setName,
          description: `Auto-migrated from legacy environment "${userEnvironment.name}"`,
          values: migratedValues,
          isDefault: Boolean(userEnvironment.isActive && !hasDefaultSet),
        });
        stats.parameterSetsCreated += 1;
        if (created.isDefault) {
          stats.defaultSetsAssigned += 1;
        }
        continue;
      }

      const mergedValues: Record<string, string | number | boolean> = {
        ...migratedValues,
        ...existingSet.values,
      };
      if (!valuesEqual(existingSet.values, mergedValues)) {
        await runParameterSetRepository.update(existingSet.id, { values: mergedValues });
        stats.parameterSetsUpdated += 1;
      }

      if (userEnvironment.isActive && !hasDefaultSet && !existingSet.isDefault) {
        await runParameterSetRepository.clearDefault(app.id);
        await runParameterSetRepository.update(existingSet.id, { isDefault: true });
        stats.defaultSetsAssigned += 1;
      }
    }
  }
}

export async function migrateEnvVarsToParameters(): Promise<EnvVarsToParametersMigrationStats> {
  const stats: EnvVarsToParametersMigrationStats = {
    runConfigsScanned: 0,
    runConfigsMigrated: 0,
    runConfigsMissingApplication: 0,
    runConfigErrors: 0,
    userEnvironmentsScanned: 0,
    userEnvironmentsWithoutApplications: 0,
    environmentReplications: 0,
    parameterSetsCreated: 0,
    parameterSetsUpdated: 0,
    defaultSetsAssigned: 0,
    definitionsCreated: 0,
    secretValuesSkipped: 0,
  };
  const definitionCache = new Map<string, DefinitionCacheEntry>();

  await migrateRunConfigEnvVars(stats, definitionCache);
  await migrateUserEnvironments(stats, definitionCache);

  logger.info('[EnvVarsToParametersMigration] Completed', stats);
  return stats;
}
