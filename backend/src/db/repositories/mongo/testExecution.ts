import { Collection, Filter, Document } from 'mongodb';
import { getDb, COLLECTIONS, MongoExecution, MongoExecutionLog, MongoExecutionStep, MongoRunConfiguration } from '../../mongodb';
import { v4 as uuidv4 } from 'uuid';

function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

// ============================================
// EXECUTION REPOSITORY
// ============================================

export const executionRepository = {
  async findById(id: string): Promise<MongoExecution | null> {
    return getCollection<MongoExecution>(COLLECTIONS.EXECUTIONS).findOne({ id });
  },

  async findByTestFlowId(testFlowId: string, limit?: number): Promise<MongoExecution[]> {
    const cursor = getCollection<MongoExecution>(COLLECTIONS.EXECUTIONS)
      .find({ testFlowId })
      .sort({ createdAt: -1 });

    if (limit) {
      cursor.limit(limit);
    }

    return cursor.toArray();
  },

  async create(data: Omit<MongoExecution, '_id' | 'id' | 'createdAt'> & { id?: string }): Promise<MongoExecution> {
    const execution: MongoExecution = {
      id: data.id || uuidv4(),
      ...data,
      createdAt: new Date()
    };
    await getCollection<MongoExecution>(COLLECTIONS.EXECUTIONS).insertOne(execution);
    return execution;
  },

  async update(id: string, data: Partial<MongoExecution>): Promise<MongoExecution | null> {
    const result = await getCollection<MongoExecution>(COLLECTIONS.EXECUTIONS).findOneAndUpdate(
      { id },
      { $set: data },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoExecution>(COLLECTIONS.EXECUTIONS).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async findRecent(limit: number = 50): Promise<MongoExecution[]> {
    // Exclude matrix children at query level so limit applies to top-level runs only
    return getCollection<MongoExecution>(COLLECTIONS.EXECUTIONS)
      .find({ matrixParentId: { $exists: false } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  async findByMatrixParentId(parentId: string): Promise<MongoExecution[]> {
    return getCollection<MongoExecution>(COLLECTIONS.EXECUTIONS)
      .find({ matrixParentId: parentId })
      .sort({ createdAt: 1 })
      .toArray();
  },

  async findByMatrixParentIds(parentIds: string[]): Promise<MongoExecution[]> {
    if (parentIds.length === 0) return [];
    return getCollection<MongoExecution>(COLLECTIONS.EXECUTIONS)
      .find({ matrixParentId: { $in: parentIds } })
      .sort({ createdAt: 1 })
      .toArray();
  },

  async updateStatus(id: string, status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled', data: Partial<MongoExecution>): Promise<MongoExecution | null> {
    const filter: Filter<MongoExecution> = { id };

    // Prevent transitioning from terminal states to running
    if (status === 'running') {
      filter.status = { $nin: ['cancelled', 'passed', 'failed'] };
    }

    const updateData = {
      ...data,
      status,
      updatedAt: new Date()
    };

    return getCollection<MongoExecution>(COLLECTIONS.EXECUTIONS).findOneAndUpdate(
      filter,
      { $set: updateData },
      { returnDocument: 'after' }
    );
  }
};

// ============================================
// EXECUTION LOG REPOSITORY
// ============================================

export const executionLogRepository = {
  async findByExecutionId(executionId: string): Promise<MongoExecutionLog[]> {
    return getCollection<MongoExecutionLog>(COLLECTIONS.EXECUTION_LOGS)
      .find({ executionId })
      .sort({ timestamp: 1 })
      .toArray();
  },

  async create(data: Omit<MongoExecutionLog, '_id' | 'id'>): Promise<MongoExecutionLog> {
    const log: MongoExecutionLog = {
      id: uuidv4(),
      ...data
    };
    await getCollection<MongoExecutionLog>(COLLECTIONS.EXECUTION_LOGS).insertOne(log);
    return log;
  },

  async deleteByExecutionId(executionId: string): Promise<number> {
    const result = await getCollection<MongoExecutionLog>(COLLECTIONS.EXECUTION_LOGS).deleteMany({ executionId });
    return result.deletedCount;
  },

  async findByExecutionIds(executionIds: string[]): Promise<MongoExecutionLog[]> {
    return getCollection<MongoExecutionLog>(COLLECTIONS.EXECUTION_LOGS)
      .find({ executionId: { $in: executionIds } })
      .sort({ timestamp: 1 })
      .toArray();
  }
};

// ============================================
// EXECUTION STEP REPOSITORY
// ============================================

export const executionStepRepository = {
  async findById(id: string): Promise<MongoExecutionStep | null> {
    return getCollection<MongoExecutionStep>(COLLECTIONS.EXECUTION_STEPS).findOne({ id });
  },

  async findByExecutionId(executionId: string): Promise<MongoExecutionStep[]> {
    return getCollection<MongoExecutionStep>(COLLECTIONS.EXECUTION_STEPS)
      .find({ executionId })
      .sort({ stepNumber: 1 })
      .toArray();
  },

  async findBySelector(selector: string): Promise<MongoExecutionStep[]> {
    return getCollection<MongoExecutionStep>(COLLECTIONS.EXECUTION_STEPS)
      .find({ selector })
      .sort({ finishedAt: -1 })
      .toArray();
  },

  async create(data: Omit<MongoExecutionStep, '_id' | 'id'>): Promise<MongoExecutionStep> {
    const step: MongoExecutionStep = {
      id: uuidv4(),
      ...data
    };
    await getCollection<MongoExecutionStep>(COLLECTIONS.EXECUTION_STEPS).insertOne(step);
    return step;
  },

  async update(id: string, data: Partial<MongoExecutionStep>): Promise<MongoExecutionStep | null> {
    const result = await getCollection<MongoExecutionStep>(COLLECTIONS.EXECUTION_STEPS).findOneAndUpdate(
      { id },
      { $set: data },
      { returnDocument: 'after' }
    );
    return result;
  },

  async deleteByExecutionId(executionId: string): Promise<number> {
    const result = await getCollection<MongoExecutionStep>(COLLECTIONS.EXECUTION_STEPS).deleteMany({ executionId });
    return result.deletedCount;
  },

  async findByExecutionIds(executionIds: string[]): Promise<MongoExecutionStep[]> {
    return getCollection<MongoExecutionStep>(COLLECTIONS.EXECUTION_STEPS)
      .find({ executionId: { $in: executionIds } })
      .sort({ stepNumber: 1 })
      .toArray();
  }
};

// ============================================
// EXECUTION ENVIRONMENT REPOSITORY
// ============================================

export interface MongoExecutionEnvironment {
  _id?: string;
  id: string;
  workflowId: string;
  name: string;
  slug: string;
  baseUrl: string;
  description?: string;
  variables: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const executionEnvironmentRepository = {
  async findById(id: string): Promise<MongoExecutionEnvironment | null> {
    return getCollection<MongoExecutionEnvironment>(COLLECTIONS.ENVIRONMENTS).findOne({ id });
  },

  async findByWorkflowId(workflowId: string): Promise<MongoExecutionEnvironment[]> {
    return getCollection<MongoExecutionEnvironment>(COLLECTIONS.ENVIRONMENTS)
      .find({ workflowId })
      .sort({ isDefault: -1, name: 1 })
      .toArray();
  },

  async create(data: Omit<MongoExecutionEnvironment, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoExecutionEnvironment> {
    const now = new Date();
    const env: MongoExecutionEnvironment = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoExecutionEnvironment>(COLLECTIONS.ENVIRONMENTS).insertOne(env);
    return env;
  },

  async update(id: string, data: Partial<MongoExecutionEnvironment>): Promise<MongoExecutionEnvironment | null> {
    const result = await getCollection<MongoExecutionEnvironment>(COLLECTIONS.ENVIRONMENTS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async updateManyByWorkflowId(workflowId: string, data: Partial<MongoExecutionEnvironment>): Promise<number> {
    const result = await getCollection<MongoExecutionEnvironment>(COLLECTIONS.ENVIRONMENTS).updateMany(
      { workflowId },
      { $set: { ...data, updatedAt: new Date() } }
    );
    return result.modifiedCount;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoExecutionEnvironment>(COLLECTIONS.ENVIRONMENTS).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// RUN CONFIGURATION REPOSITORY
// ============================================

export const runConfigurationRepository = {
  async findById(id: string): Promise<MongoRunConfiguration | null> {
    return getCollection<MongoRunConfiguration>(COLLECTIONS.RUN_CONFIGURATIONS).findOne({ id });
  },

  async findByWorkflowId(workflowId: string): Promise<MongoRunConfiguration[]> {
    return getCollection<MongoRunConfiguration>(COLLECTIONS.RUN_CONFIGURATIONS)
      .find({ workflowId, ownerType: { $ne: 'schedule' } })
      .toArray();
  },

  async findByWorkflowIdAndProjectId(workflowId: string, projectId: string): Promise<MongoRunConfiguration[]> {
    return getCollection<MongoRunConfiguration>(COLLECTIONS.RUN_CONFIGURATIONS)
      .find({ workflowId, projectId, ownerType: { $ne: 'schedule' } })
      .toArray();
  },

  async findPendingProjectScopeMigration(): Promise<MongoRunConfiguration[]> {
    return getCollection<MongoRunConfiguration>(COLLECTIONS.RUN_CONFIGURATIONS)
      .find({
        $or: [{ projectId: { $exists: false } }, { projectId: null as any }],
        projectScopeMigratedAt: { $exists: false },
      } as any)
      .toArray();
  },

  async findByProjectScopeSource(
    workflowId: string,
    projectId: string,
    sourceConfigId: string
  ): Promise<MongoRunConfiguration | null> {
    return getCollection<MongoRunConfiguration>(COLLECTIONS.RUN_CONFIGURATIONS).findOne({
      workflowId,
      projectId,
      projectScopeSourceConfigId: sourceConfigId,
    });
  },

  async findDefaultByWorkflowId(workflowId: string): Promise<MongoRunConfiguration | null> {
    return getCollection<MongoRunConfiguration>(COLLECTIONS.RUN_CONFIGURATIONS).findOne({ workflowId, isDefault: true });
  },

  async create(data: Omit<MongoRunConfiguration, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoRunConfiguration> {
    const now = new Date();
    const config: MongoRunConfiguration = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoRunConfiguration>(COLLECTIONS.RUN_CONFIGURATIONS).insertOne(config);
    return config;
  },

  async update(id: string, data: Partial<MongoRunConfiguration>): Promise<MongoRunConfiguration | null> {
    const result = await getCollection<MongoRunConfiguration>(COLLECTIONS.RUN_CONFIGURATIONS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoRunConfiguration>(COLLECTIONS.RUN_CONFIGURATIONS).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async findByOwnerScheduleId(scheduleId: string): Promise<MongoRunConfiguration | null> {
    return getCollection<MongoRunConfiguration>(COLLECTIONS.RUN_CONFIGURATIONS)
      .findOne({ ownerType: 'schedule', ownerScheduleId: scheduleId });
  },

  async deleteByOwnerScheduleId(scheduleId: string): Promise<boolean> {
    const result = await getCollection<MongoRunConfiguration>(COLLECTIONS.RUN_CONFIGURATIONS)
      .deleteMany({ ownerType: 'schedule', ownerScheduleId: scheduleId });
    return result.deletedCount > 0;
  },
};
