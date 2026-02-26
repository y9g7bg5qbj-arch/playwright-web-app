import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  runConfigs: [] as any[],
  userEnvironments: [] as any[],
  applications: [] as any[],
  projectsById: new Map<string, any>(),
  workflowsById: new Map<string, any>(),
  envVarsByEnvironmentId: new Map<string, any[]>(),
  definitionsByApplicationId: new Map<string, any[]>(),
  setsByApplicationId: new Map<string, any[]>(),
  nextId: 1,
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

function applyUpdate(doc: Record<string, any>, update: Record<string, any>) {
  if (update.$set) {
    Object.assign(doc, update.$set);
  }
  if (update.$unset) {
    for (const key of Object.keys(update.$unset)) {
      delete doc[key];
    }
  }
}

vi.mock('../db/mongodb', () => {
  const COLLECTIONS = {
    RUN_CONFIGURATIONS: 'run_configurations',
    USER_ENVIRONMENTS: 'user_environments',
  } as const;

  return {
    COLLECTIONS,
    getDb: () => ({
      collection: (name: string) => {
        if (name === COLLECTIONS.RUN_CONFIGURATIONS) {
          return {
            find: () => ({
              toArray: async () =>
                mockState.runConfigs.filter((config) => config.envVars !== undefined && config.envVars !== null),
            }),
            updateOne: async (filter: { id: string }, update: Record<string, any>) => {
              const doc = mockState.runConfigs.find((config) => config.id === filter.id);
              if (!doc) return { matchedCount: 0, modifiedCount: 0 };
              applyUpdate(doc, update);
              return { matchedCount: 1, modifiedCount: 1 };
            },
          };
        }

        if (name === COLLECTIONS.USER_ENVIRONMENTS) {
          return {
            find: () => ({
              toArray: async () => [...mockState.userEnvironments],
            }),
          };
        }

        throw new Error(`Unexpected collection requested in test: ${name}`);
      },
    }),
  };
});

vi.mock('../db/repositories/mongo', () => ({
  applicationRepository: {
    findAll: vi.fn(async () => mockState.applications),
    findById: vi.fn(async (id: string) => mockState.applications.find((app) => app.id === id) || null),
  },
  projectRepository: {
    findById: vi.fn(async (id: string) => mockState.projectsById.get(id) || null),
  },
  workflowRepository: {
    findById: vi.fn(async (id: string) => mockState.workflowsById.get(id) || null),
  },
  environmentVariableRepository: {
    findByEnvironmentId: vi.fn(async (environmentId: string) => mockState.envVarsByEnvironmentId.get(environmentId) || []),
  },
  runParameterDefinitionRepository: {
    findByApplicationId: vi.fn(async (applicationId: string) => mockState.definitionsByApplicationId.get(applicationId) || []),
    create: vi.fn(async (data: any) => {
      const definition = {
        id: `def-${mockState.nextId++}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const defs = mockState.definitionsByApplicationId.get(data.applicationId) || [];
      defs.push(definition);
      mockState.definitionsByApplicationId.set(data.applicationId, defs);
      return definition;
    }),
  },
  runParameterSetRepository: {
    findByApplicationId: vi.fn(async (applicationId: string) => mockState.setsByApplicationId.get(applicationId) || []),
    create: vi.fn(async (data: any) => {
      const set = {
        id: `set-${mockState.nextId++}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const sets = mockState.setsByApplicationId.get(data.applicationId) || [];
      sets.push(set);
      mockState.setsByApplicationId.set(data.applicationId, sets);
      return set;
    }),
    update: vi.fn(async (id: string, data: any) => {
      for (const [applicationId, sets] of mockState.setsByApplicationId.entries()) {
        const index = sets.findIndex((set) => set.id === id);
        if (index === -1) continue;
        const updated = {
          ...sets[index],
          ...data,
          updatedAt: new Date(),
        };
        sets[index] = updated;
        mockState.setsByApplicationId.set(applicationId, sets);
        return updated;
      }
      return null;
    }),
    clearDefault: vi.fn(async (applicationId: string) => {
      const sets = mockState.setsByApplicationId.get(applicationId) || [];
      for (const set of sets) {
        set.isDefault = false;
      }
      mockState.setsByApplicationId.set(applicationId, sets);
    }),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: mockState.logger,
}));

import { migrateEnvVarsToParameters } from '../services/envVarsToParametersMigration.service';

describe('migrateEnvVarsToParameters', () => {
  beforeEach(() => {
    mockState.runConfigs.length = 0;
    mockState.userEnvironments.length = 0;
    mockState.applications.length = 0;
    mockState.projectsById.clear();
    mockState.workflowsById.clear();
    mockState.envVarsByEnvironmentId.clear();
    mockState.definitionsByApplicationId.clear();
    mockState.setsByApplicationId.clear();
    mockState.nextId = 1;
    vi.clearAllMocks();
  });

  it('migrates run-config envVars to parameterOverrides and creates missing definitions', async () => {
    mockState.runConfigs.push({
      id: 'config-1',
      projectId: 'project-1',
      workflowId: 'workflow-1',
      envVars: JSON.stringify({
        STATE: 'IL',
        BASE_URL: 'https://qa.example.com',
      }),
      parameterOverrides: JSON.stringify({
        STATE: 'OLD',
        BROWSER: 'chromium',
      }),
    });
    mockState.projectsById.set('project-1', { id: 'project-1', applicationId: 'app-1' });
    mockState.definitionsByApplicationId.set('app-1', [
      {
        id: 'def-existing',
        applicationId: 'app-1',
        name: 'BROWSER',
        order: 0,
      },
    ]);

    const stats = await migrateEnvVarsToParameters();

    expect(stats.runConfigsMigrated).toBe(1);
    expect(mockState.runConfigs[0].envVars).toBeUndefined();
    expect(JSON.parse(mockState.runConfigs[0].parameterOverrides)).toEqual({
      STATE: 'IL',
      BROWSER: 'chromium',
      BASE_URL: 'https://qa.example.com',
    });

    const definitionNames = (mockState.definitionsByApplicationId.get('app-1') || []).map((def) => def.name);
    expect(definitionNames).toEqual(expect.arrayContaining(['BROWSER', 'STATE', 'BASE_URL']));
  });

  it('migrates non-secret environment vars to parameter sets and skips secrets', async () => {
    mockState.userEnvironments.push({
      id: 'env-1',
      userId: 'user-1',
      name: 'UAT',
      isActive: true,
    });
    mockState.applications.push(
      { id: 'app-a', userId: 'user-1' },
      { id: 'app-b', userId: 'user-1' },
    );
    mockState.envVarsByEnvironmentId.set('env-1', [
      { key: 'REGION', value: 'us-east-1', sensitive: false },
      { key: 'API_TOKEN', value: 'never-copy-me', sensitive: true },
    ]);
    mockState.setsByApplicationId.set('app-b', [
      {
        id: 'set-default-existing',
        applicationId: 'app-b',
        name: 'Existing Default',
        values: { REGION: 'eu-west-1' },
        isDefault: true,
      },
    ]);

    const stats = await migrateEnvVarsToParameters();

    expect(stats.parameterSetsCreated).toBe(2);
    expect(stats.secretValuesSkipped).toBe(1);

    const appASets = mockState.setsByApplicationId.get('app-a') || [];
    const appASet = appASets.find((set) => set.name === 'Migrated: UAT');
    expect(appASet).toBeDefined();
    expect(appASet?.isDefault).toBe(true);
    expect(appASet?.values).toEqual({ REGION: 'us-east-1' });
    expect(appASet?.values.API_TOKEN).toBeUndefined();

    const appBSets = mockState.setsByApplicationId.get('app-b') || [];
    const appBSet = appBSets.find((set) => set.name === 'Migrated: UAT');
    expect(appBSet).toBeDefined();
    expect(appBSet?.isDefault).toBe(false);
    expect(appBSets.find((set) => set.id === 'set-default-existing')?.isDefault).toBe(true);

    expect(mockState.logger.warn).toHaveBeenCalledWith(
      '[EnvVarsToParametersMigration] Skipping secret environment values during migration',
      expect.objectContaining({
        environmentId: 'env-1',
        skippedKeys: ['API_TOKEN'],
        skippedCount: 1,
      }),
    );
  });

  it('is idempotent on re-run', async () => {
    mockState.runConfigs.push({
      id: 'config-1',
      workflowId: 'workflow-1',
      envVars: JSON.stringify({ STATE: 'CA' }),
    });
    mockState.workflowsById.set('workflow-1', { id: 'workflow-1', applicationId: 'app-1' });

    mockState.userEnvironments.push({
      id: 'env-1',
      userId: 'user-1',
      name: 'QA',
      isActive: true,
    });
    mockState.applications.push({ id: 'app-1', userId: 'user-1' });
    mockState.envVarsByEnvironmentId.set('env-1', [
      { key: 'STATE', value: 'CA', sensitive: false },
    ]);

    const first = await migrateEnvVarsToParameters();
    const second = await migrateEnvVarsToParameters();

    const defs = mockState.definitionsByApplicationId.get('app-1') || [];
    const sets = mockState.setsByApplicationId.get('app-1') || [];
    expect(new Set(defs.map((def) => def.name)).size).toBe(defs.length);
    expect(sets.filter((set) => set.name === 'Migrated: QA')).toHaveLength(1);

    expect(first.runConfigsMigrated).toBe(1);
    expect(second.runConfigsMigrated).toBe(0);
    expect(second.parameterSetsCreated).toBe(0);
    expect(second.definitionsCreated).toBe(0);
  });
});
