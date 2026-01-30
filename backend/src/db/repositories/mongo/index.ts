/**
 * MongoDB Repository Layer
 *
 * Provides database operations using MongoDB.
 * All application data is stored in MongoDB.
 */

import { Collection, Filter, Document } from 'mongodb';
import { getDb, COLLECTIONS, MongoUser, MongoApplication, MongoProject, MongoWorkflow, MongoTestFlow, MongoExecution, MongoExecutionLog, MongoExecutionStep, MongoAgent, MongoAISettings, MongoSchedule, MongoRunConfiguration, MongoRecordingSession, MongoRecordingStep, MongoSandbox, MongoPullRequest, MongoAIRecorderSession, MongoAIRecorderTestCase, MongoAIRecorderStep, MongoScheduledTest, MongoScheduledTestRun, MongoScheduleNotification, MongoCopilotSession, MongoCopilotExploration, MongoCopilotStagedChange, MongoCopilotLearnedSelector, MongoTestDataSheet, MongoTestDataRow, MongoTestDataSavedView, MongoTestDataRelationship, MongoDataStorageConfig, MongoDataTable, MongoDataRow, MongoObjectRepository, MongoPageObject } from '../../mongodb';
import { ObjectRepository, ObjectRepositoryCreate, ObjectRepositoryUpdate, PageObject, PageObjectCreate, PageObjectUpdate, PageElementCreate, PageElementUpdate } from '@playwright-web-app/shared';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// Generic Repository Helpers
// ============================================

function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

// ============================================
// USER REPOSITORY
// ============================================

export const userRepository = {
  async findById(id: string): Promise<MongoUser | null> {
    return getCollection<MongoUser>(COLLECTIONS.USERS).findOne({ id });
  },

  async findByEmail(email: string): Promise<MongoUser | null> {
    return getCollection<MongoUser>(COLLECTIONS.USERS).findOne({ email });
  },

  async create(data: Omit<MongoUser, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoUser> {
    const now = new Date();
    const user: MongoUser = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoUser>(COLLECTIONS.USERS).insertOne(user);
    return user;
  },

  async update(id: string, data: Partial<MongoUser>): Promise<MongoUser | null> {
    const result = await getCollection<MongoUser>(COLLECTIONS.USERS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoUser>(COLLECTIONS.USERS).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async findAll(): Promise<MongoUser[]> {
    return getCollection<MongoUser>(COLLECTIONS.USERS).find({}).toArray();
  }
};

// ============================================
// APPLICATION REPOSITORY
// ============================================

export const applicationRepository = {
  async findById(id: string): Promise<MongoApplication | null> {
    return getCollection<MongoApplication>(COLLECTIONS.APPLICATIONS).findOne({ id });
  },

  async findByUserId(userId: string): Promise<MongoApplication[]> {
    return getCollection<MongoApplication>(COLLECTIONS.APPLICATIONS).find({ userId }).toArray();
  },

  async findByUserIdAndName(userId: string, name: string): Promise<MongoApplication | null> {
    return getCollection<MongoApplication>(COLLECTIONS.APPLICATIONS).findOne({ userId, name });
  },

  async findByIdAndUserId(id: string, userId: string): Promise<MongoApplication | null> {
    return getCollection<MongoApplication>(COLLECTIONS.APPLICATIONS).findOne({ id, userId });
  },

  async create(data: Omit<MongoApplication, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoApplication> {
    const now = new Date();
    const app: MongoApplication = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoApplication>(COLLECTIONS.APPLICATIONS).insertOne(app);
    return app;
  },

  async update(id: string, data: Partial<MongoApplication>): Promise<MongoApplication | null> {
    const result = await getCollection<MongoApplication>(COLLECTIONS.APPLICATIONS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoApplication>(COLLECTIONS.APPLICATIONS).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// PROJECT REPOSITORY
// ============================================

export const projectRepository = {
  async findById(id: string): Promise<MongoProject | null> {
    return getCollection<MongoProject>(COLLECTIONS.PROJECTS).findOne({ id });
  },

  async findByApplicationId(applicationId: string): Promise<MongoProject[]> {
    return getCollection<MongoProject>(COLLECTIONS.PROJECTS).find({ applicationId }).toArray();
  },

  async findByApplicationIdAndName(applicationId: string, name: string): Promise<MongoProject | null> {
    return getCollection<MongoProject>(COLLECTIONS.PROJECTS).findOne({ applicationId, name });
  },

  async create(data: Omit<MongoProject, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoProject> {
    const now = new Date();
    const project: MongoProject = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoProject>(COLLECTIONS.PROJECTS).insertOne(project);
    return project;
  },

  async update(id: string, data: Partial<MongoProject>): Promise<MongoProject | null> {
    const result = await getCollection<MongoProject>(COLLECTIONS.PROJECTS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoProject>(COLLECTIONS.PROJECTS).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// WORKFLOW REPOSITORY
// ============================================

export const workflowRepository = {
  async findById(id: string): Promise<MongoWorkflow | null> {
    return getCollection<MongoWorkflow>(COLLECTIONS.WORKFLOWS).findOne({ id });
  },

  async findByUserId(userId: string): Promise<MongoWorkflow[]> {
    return getCollection<MongoWorkflow>(COLLECTIONS.WORKFLOWS).find({ userId }).toArray();
  },

  async findByApplicationId(applicationId: string): Promise<MongoWorkflow[]> {
    return getCollection<MongoWorkflow>(COLLECTIONS.WORKFLOWS).find({ applicationId }).toArray();
  },

  async create(data: Omit<MongoWorkflow, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoWorkflow> {
    const now = new Date();
    const workflow: MongoWorkflow = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoWorkflow>(COLLECTIONS.WORKFLOWS).insertOne(workflow);
    return workflow;
  },

  async update(id: string, data: Partial<MongoWorkflow>): Promise<MongoWorkflow | null> {
    const result = await getCollection<MongoWorkflow>(COLLECTIONS.WORKFLOWS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoWorkflow>(COLLECTIONS.WORKFLOWS).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async findByUserIdAndName(userId: string, name: string): Promise<MongoWorkflow | null> {
    return getCollection<MongoWorkflow>(COLLECTIONS.WORKFLOWS).findOne({ userId, name });
  }
};

// ============================================
// TEST FLOW REPOSITORY
// ============================================

export const testFlowRepository = {
  async findById(id: string): Promise<MongoTestFlow | null> {
    return getCollection<MongoTestFlow>(COLLECTIONS.TEST_FLOWS).findOne({ id });
  },

  async findByWorkflowId(workflowId: string): Promise<MongoTestFlow[]> {
    return getCollection<MongoTestFlow>(COLLECTIONS.TEST_FLOWS).find({ workflowId }).toArray();
  },

  async create(data: Omit<MongoTestFlow, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoTestFlow> {
    const now = new Date();
    const testFlow: MongoTestFlow = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoTestFlow>(COLLECTIONS.TEST_FLOWS).insertOne(testFlow);
    return testFlow;
  },

  async update(id: string, data: Partial<MongoTestFlow>): Promise<MongoTestFlow | null> {
    const result = await getCollection<MongoTestFlow>(COLLECTIONS.TEST_FLOWS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoTestFlow>(COLLECTIONS.TEST_FLOWS).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async findByWorkflowIdAndName(workflowId: string, name: string): Promise<MongoTestFlow | null> {
    return getCollection<MongoTestFlow>(COLLECTIONS.TEST_FLOWS).findOne({ workflowId, name });
  }
};

// ============================================
// TEST DATA SHEET REPOSITORY
// ============================================

export const testDataSheetRepository = {
  async findById(id: string): Promise<MongoTestDataSheet | null> {
    return getCollection<MongoTestDataSheet>(COLLECTIONS.TEST_DATA_SHEETS).findOne({ id });
  },

  async findByApplicationId(applicationId: string): Promise<MongoTestDataSheet[]> {
    return getCollection<MongoTestDataSheet>(COLLECTIONS.TEST_DATA_SHEETS).find({ applicationId }).toArray();
  },

  async findByApplicationIdAndName(applicationId: string, name: string): Promise<MongoTestDataSheet | null> {
    return getCollection<MongoTestDataSheet>(COLLECTIONS.TEST_DATA_SHEETS).findOne({ applicationId, name });
  },

  async create(data: Omit<MongoTestDataSheet, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoTestDataSheet> {
    const now = new Date();
    const sheet: MongoTestDataSheet = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoTestDataSheet>(COLLECTIONS.TEST_DATA_SHEETS).insertOne(sheet);
    return sheet;
  },

  async update(id: string, data: Partial<MongoTestDataSheet>): Promise<MongoTestDataSheet | null> {
    const result = await getCollection<MongoTestDataSheet>(COLLECTIONS.TEST_DATA_SHEETS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoTestDataSheet>(COLLECTIONS.TEST_DATA_SHEETS).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// TEST DATA ROW REPOSITORY
// ============================================

export const testDataRowRepository = {
  async findById(id: string): Promise<MongoTestDataRow | null> {
    return getCollection<MongoTestDataRow>(COLLECTIONS.TEST_DATA_ROWS).findOne({ id });
  },

  async findBySheetId(sheetId: string): Promise<MongoTestDataRow[]> {
    return getCollection<MongoTestDataRow>(COLLECTIONS.TEST_DATA_ROWS).find({ sheetId }).toArray();
  },

  async findBySheetIdAndScenarioId(sheetId: string, scenarioId: string): Promise<MongoTestDataRow[]> {
    return getCollection<MongoTestDataRow>(COLLECTIONS.TEST_DATA_ROWS).find({ sheetId, scenarioId }).toArray();
  },

  async create(data: Omit<MongoTestDataRow, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoTestDataRow> {
    const now = new Date();
    const row: MongoTestDataRow = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoTestDataRow>(COLLECTIONS.TEST_DATA_ROWS).insertOne(row);
    return row;
  },

  async createMany(data: Array<Omit<MongoTestDataRow, '_id' | 'id' | 'createdAt' | 'updatedAt'>>): Promise<MongoTestDataRow[]> {
    const now = new Date();
    const rows: MongoTestDataRow[] = data.map(d => ({
      id: uuidv4(),
      ...d,
      createdAt: now,
      updatedAt: now
    }));
    if (rows.length > 0) {
      await getCollection<MongoTestDataRow>(COLLECTIONS.TEST_DATA_ROWS).insertMany(rows);
    }
    return rows;
  },

  async update(id: string, data: Partial<MongoTestDataRow>): Promise<MongoTestDataRow | null> {
    const result = await getCollection<MongoTestDataRow>(COLLECTIONS.TEST_DATA_ROWS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async updateMany(filter: Partial<MongoTestDataRow>, data: Partial<MongoTestDataRow>): Promise<number> {
    const result = await getCollection<MongoTestDataRow>(COLLECTIONS.TEST_DATA_ROWS).updateMany(
      filter,
      { $set: { ...data, updatedAt: new Date() } }
    );
    return result.modifiedCount;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoTestDataRow>(COLLECTIONS.TEST_DATA_ROWS).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async deleteBySheetId(sheetId: string): Promise<number> {
    const result = await getCollection<MongoTestDataRow>(COLLECTIONS.TEST_DATA_ROWS).deleteMany({ sheetId });
    return result.deletedCount;
  },

  async upsert(
    sheetId: string,
    scenarioId: string,
    updateData: Partial<MongoTestDataRow>,
    createData: Omit<MongoTestDataRow, '_id' | 'id' | 'createdAt' | 'updatedAt' | 'sheetId' | 'scenarioId'>
  ): Promise<MongoTestDataRow> {
    const now = new Date();
    const result = await getCollection<MongoTestDataRow>(COLLECTIONS.TEST_DATA_ROWS).findOneAndUpdate(
      { sheetId, scenarioId },
      {
        $set: { ...updateData, updatedAt: now },
        $setOnInsert: {
          id: uuidv4(),
          sheetId,
          scenarioId,
          ...createData,
          createdAt: now
        }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result!;
  }
};

// ============================================
// TEST DATA SAVED VIEW REPOSITORY
// ============================================

export const testDataSavedViewRepository = {
  async findById(id: string): Promise<MongoTestDataSavedView | null> {
    return getCollection<MongoTestDataSavedView>(COLLECTIONS.TEST_DATA_SAVED_VIEWS).findOne({ id });
  },

  async findBySheetId(sheetId: string): Promise<MongoTestDataSavedView[]> {
    return getCollection<MongoTestDataSavedView>(COLLECTIONS.TEST_DATA_SAVED_VIEWS).find({ sheetId }).toArray();
  },

  async findBySheetIdAndName(sheetId: string, name: string): Promise<MongoTestDataSavedView | null> {
    return getCollection<MongoTestDataSavedView>(COLLECTIONS.TEST_DATA_SAVED_VIEWS).findOne({ sheetId, name });
  },

  async create(data: Omit<MongoTestDataSavedView, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoTestDataSavedView> {
    const now = new Date();
    const view: MongoTestDataSavedView = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoTestDataSavedView>(COLLECTIONS.TEST_DATA_SAVED_VIEWS).insertOne(view);
    return view;
  },

  async update(id: string, data: Partial<MongoTestDataSavedView>): Promise<MongoTestDataSavedView | null> {
    const result = await getCollection<MongoTestDataSavedView>(COLLECTIONS.TEST_DATA_SAVED_VIEWS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async updateMany(filter: Partial<MongoTestDataSavedView>, data: Partial<MongoTestDataSavedView>): Promise<number> {
    const result = await getCollection<MongoTestDataSavedView>(COLLECTIONS.TEST_DATA_SAVED_VIEWS).updateMany(
      filter,
      { $set: { ...data, updatedAt: new Date() } }
    );
    return result.modifiedCount;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoTestDataSavedView>(COLLECTIONS.TEST_DATA_SAVED_VIEWS).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// TEST DATA RELATIONSHIP REPOSITORY
// ============================================

export const testDataRelationshipRepository = {
  async findById(id: string): Promise<MongoTestDataRelationship | null> {
    return getCollection<MongoTestDataRelationship>(COLLECTIONS.TEST_DATA_RELATIONSHIPS).findOne({ id });
  },

  async findBySourceSheetId(sourceSheetId: string): Promise<MongoTestDataRelationship[]> {
    return getCollection<MongoTestDataRelationship>(COLLECTIONS.TEST_DATA_RELATIONSHIPS).find({ sourceSheetId }).toArray();
  },

  async findByTargetSheetId(targetSheetId: string): Promise<MongoTestDataRelationship[]> {
    return getCollection<MongoTestDataRelationship>(COLLECTIONS.TEST_DATA_RELATIONSHIPS).find({ targetSheetId }).toArray();
  },

  async findBySheetIds(sheetIds: string[]): Promise<MongoTestDataRelationship[]> {
    return getCollection<MongoTestDataRelationship>(COLLECTIONS.TEST_DATA_RELATIONSHIPS).find({
      $or: [
        { sourceSheetId: { $in: sheetIds } },
        { targetSheetId: { $in: sheetIds } }
      ]
    }).toArray();
  },

  async create(data: Omit<MongoTestDataRelationship, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoTestDataRelationship> {
    const now = new Date();
    const relationship: MongoTestDataRelationship = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoTestDataRelationship>(COLLECTIONS.TEST_DATA_RELATIONSHIPS).insertOne(relationship);
    return relationship;
  },

  async update(id: string, data: Partial<MongoTestDataRelationship>): Promise<MongoTestDataRelationship | null> {
    const result = await getCollection<MongoTestDataRelationship>(COLLECTIONS.TEST_DATA_RELATIONSHIPS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoTestDataRelationship>(COLLECTIONS.TEST_DATA_RELATIONSHIPS).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

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

  async create(data: Omit<MongoExecution, '_id' | 'id' | 'createdAt'>): Promise<MongoExecution> {
    const execution: MongoExecution = {
      id: uuidv4(),
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
    return getCollection<MongoExecution>(COLLECTIONS.EXECUTIONS)
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
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
  }
};

// ============================================
// AGENT REPOSITORY
// ============================================

export const agentRepository = {
  async findById(id: string): Promise<MongoAgent | null> {
    return getCollection<MongoAgent>(COLLECTIONS.AGENTS).findOne({ id });
  },

  async findByUserId(userId: string): Promise<MongoAgent[]> {
    return getCollection<MongoAgent>(COLLECTIONS.AGENTS).find({ userId }).toArray();
  },

  async create(data: Omit<MongoAgent, '_id' | 'id' | 'createdAt'>): Promise<MongoAgent> {
    const agent: MongoAgent = {
      id: uuidv4(),
      ...data,
      createdAt: new Date()
    };
    await getCollection<MongoAgent>(COLLECTIONS.AGENTS).insertOne(agent);
    return agent;
  },

  async update(id: string, data: Partial<MongoAgent>): Promise<MongoAgent | null> {
    const result = await getCollection<MongoAgent>(COLLECTIONS.AGENTS).findOneAndUpdate(
      { id },
      { $set: data },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoAgent>(COLLECTIONS.AGENTS).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// AI SETTINGS REPOSITORY
// ============================================

export const aiSettingsRepository = {
  async findByUserId(userId: string): Promise<MongoAISettings | null> {
    return getCollection<MongoAISettings>(COLLECTIONS.AI_SETTINGS).findOne({ userId });
  },

  async upsert(userId: string, data: Partial<MongoAISettings>): Promise<MongoAISettings> {
    const now = new Date();
    const result = await getCollection<MongoAISettings>(COLLECTIONS.AI_SETTINGS).findOneAndUpdate(
      { userId },
      {
        $set: { ...data, updatedAt: now },
        $setOnInsert: { id: uuidv4(), userId, createdAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result!;
  },

  async delete(userId: string): Promise<boolean> {
    const result = await getCollection<MongoAISettings>(COLLECTIONS.AI_SETTINGS).deleteOne({ userId });
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
    return getCollection<MongoRunConfiguration>(COLLECTIONS.RUN_CONFIGURATIONS).find({ workflowId }).toArray();
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
  }
};

// ============================================
// SCHEDULE REPOSITORY
// ============================================

export interface MongoScheduleRun {
  _id?: string;
  id: string;
  scheduleId: string;
  triggerType: 'cron' | 'manual' | 'webhook';
  status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';
  testCount?: number;
  passedCount?: number;
  failedCount?: number;
  skippedCount?: number;
  durationMs?: number;
  artifactsPath?: string;
  errorMessage?: string;
  parameterValues?: string;
  executionConfig?: string;
  triggeredByUser?: string;
  webhookToken?: string;
  githubRunId?: string;
  githubRunUrl?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface MongoScheduleTestResult {
  _id?: string;
  id: string;
  runId: string;
  testName: string;
  testPath?: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs?: number;
  errorMessage?: string;
  errorStack?: string;
  retryCount?: number;
  screenshotPath?: string;
  tracePath?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export const scheduleRepository = {
  async findById(id: string): Promise<MongoSchedule | null> {
    return getCollection<MongoSchedule>(COLLECTIONS.SCHEDULES).findOne({ id });
  },

  async findByUserId(userId: string): Promise<MongoSchedule[]> {
    return getCollection<MongoSchedule>(COLLECTIONS.SCHEDULES).find({ userId }).toArray();
  },

  async findDue(): Promise<MongoSchedule[]> {
    const now = new Date();
    return getCollection<MongoSchedule>(COLLECTIONS.SCHEDULES).find({
      isActive: true,
      nextRunAt: { $lte: now }
    }).toArray();
  },

  async findByWebhookToken(webhookToken: string): Promise<MongoSchedule | null> {
    return getCollection<MongoSchedule>(COLLECTIONS.SCHEDULES).findOne({ webhookToken });
  },

  async create(data: Omit<MongoSchedule, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoSchedule> {
    const now = new Date();
    const schedule: MongoSchedule = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoSchedule>(COLLECTIONS.SCHEDULES).insertOne(schedule);
    return schedule;
  },

  async update(id: string, data: Partial<MongoSchedule>): Promise<MongoSchedule | null> {
    const result = await getCollection<MongoSchedule>(COLLECTIONS.SCHEDULES).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoSchedule>(COLLECTIONS.SCHEDULES).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// SCHEDULE RUN REPOSITORY
// ============================================

export const scheduleRunRepository = {
  async findById(id: string): Promise<MongoScheduleRun | null> {
    return getCollection<MongoScheduleRun>(COLLECTIONS.SCHEDULE_RUNS).findOne({ id });
  },

  async findByScheduleId(scheduleId: string, limit?: number): Promise<MongoScheduleRun[]> {
    const cursor = getCollection<MongoScheduleRun>(COLLECTIONS.SCHEDULE_RUNS)
      .find({ scheduleId })
      .sort({ createdAt: -1 });

    if (limit) {
      cursor.limit(limit);
    }

    return cursor.toArray();
  },

  async create(data: Omit<MongoScheduleRun, '_id' | 'id' | 'createdAt'>): Promise<MongoScheduleRun> {
    const run: MongoScheduleRun = {
      id: uuidv4(),
      ...data,
      createdAt: new Date()
    };
    await getCollection<MongoScheduleRun>(COLLECTIONS.SCHEDULE_RUNS).insertOne(run);
    return run;
  },

  async update(id: string, data: Partial<MongoScheduleRun>): Promise<MongoScheduleRun | null> {
    const result = await getCollection<MongoScheduleRun>(COLLECTIONS.SCHEDULE_RUNS).findOneAndUpdate(
      { id },
      { $set: data },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoScheduleRun>(COLLECTIONS.SCHEDULE_RUNS).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// SCHEDULE TEST RESULT REPOSITORY
// ============================================

export const scheduleTestResultRepository = {
  async findByRunId(runId: string): Promise<MongoScheduleTestResult[]> {
    return getCollection<MongoScheduleTestResult>('schedule_test_results').find({ runId }).toArray();
  },

  async create(data: Omit<MongoScheduleTestResult, '_id' | 'id'>): Promise<MongoScheduleTestResult> {
    const result: MongoScheduleTestResult = {
      id: uuidv4(),
      ...data
    };
    await getCollection<MongoScheduleTestResult>('schedule_test_results').insertOne(result);
    return result;
  },

  async deleteByRunId(runId: string): Promise<number> {
    const result = await getCollection<MongoScheduleTestResult>('schedule_test_results').deleteMany({ runId });
    return result.deletedCount;
  }
};

// ============================================
// AUDIT LOG REPOSITORY
// ============================================

export interface MongoAuditLog {
  _id?: string;
  id: string;
  userId?: string;
  entityType: string;
  entityId: string;
  action: string;
  changes?: string;
  metadata?: string;
  createdAt: Date;
}

export const auditLogRepository = {
  async create(data: Omit<MongoAuditLog, '_id' | 'id' | 'createdAt'>): Promise<MongoAuditLog> {
    const log: MongoAuditLog = {
      id: uuidv4(),
      ...data,
      createdAt: new Date()
    };
    await getCollection<MongoAuditLog>(COLLECTIONS.AUDIT_LOGS).insertOne(log);
    return log;
  },

  async query(filters: {
    userId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }, limit: number = 50, offset: number = 0): Promise<{ entries: MongoAuditLog[]; total: number }> {
    const query: any = {};

    if (filters.userId) query.userId = filters.userId;
    if (filters.entityType) query.entityType = filters.entityType;
    if (filters.entityId) query.entityId = filters.entityId;
    if (filters.action) query.action = filters.action;
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    const [entries, total] = await Promise.all([
      getCollection<MongoAuditLog>(COLLECTIONS.AUDIT_LOGS)
        .find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      getCollection<MongoAuditLog>(COLLECTIONS.AUDIT_LOGS).countDocuments(query)
    ]);

    return { entries, total };
  },

  async findByEntity(entityType: string, entityId: string, limit: number = 50): Promise<MongoAuditLog[]> {
    return getCollection<MongoAuditLog>(COLLECTIONS.AUDIT_LOGS)
      .find({ entityType, entityId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  async findByUserId(userId: string, limit: number = 50): Promise<MongoAuditLog[]> {
    return getCollection<MongoAuditLog>(COLLECTIONS.AUDIT_LOGS)
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await getCollection<MongoAuditLog>(COLLECTIONS.AUDIT_LOGS).deleteMany({
      createdAt: { $lt: date }
    });
    return result.deletedCount;
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
// REMOTE RUNNER REPOSITORY
// ============================================

export interface MongoRemoteRunner {
  _id?: string;
  id: string;
  workflowId: string;
  name: string;
  host: string;
  port: number;
  authType: string;
  credentialId?: string;
  dockerImage?: string;
  maxWorkers: number;
  isHealthy: boolean;
  lastPingAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const remoteRunnerRepository = {
  async findById(id: string): Promise<MongoRemoteRunner | null> {
    return getCollection<MongoRemoteRunner>('remote_runners').findOne({ id });
  },

  async findByWorkflowId(workflowId: string): Promise<MongoRemoteRunner[]> {
    return getCollection<MongoRemoteRunner>('remote_runners')
      .find({ workflowId })
      .sort({ isHealthy: -1, name: 1 })
      .toArray();
  },

  async create(data: Omit<MongoRemoteRunner, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoRemoteRunner> {
    const now = new Date();
    const runner: MongoRemoteRunner = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoRemoteRunner>('remote_runners').insertOne(runner);
    return runner;
  },

  async update(id: string, data: Partial<MongoRemoteRunner>): Promise<MongoRemoteRunner | null> {
    const result = await getCollection<MongoRemoteRunner>('remote_runners').findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoRemoteRunner>('remote_runners').deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// STORED CREDENTIAL REPOSITORY
// ============================================

export interface MongoStoredCredential {
  _id?: string;
  id: string;
  workflowId: string;
  name: string;
  type: string;
  encryptedValue: string;
  createdAt: Date;
  updatedAt: Date;
}

export const storedCredentialRepository = {
  async findById(id: string): Promise<MongoStoredCredential | null> {
    return getCollection<MongoStoredCredential>('stored_credentials').findOne({ id });
  },

  async findByWorkflowId(workflowId: string): Promise<MongoStoredCredential[]> {
    return getCollection<MongoStoredCredential>('stored_credentials')
      .find({ workflowId })
      .sort({ name: 1 })
      .toArray();
  },

  async create(data: Omit<MongoStoredCredential, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoStoredCredential> {
    const now = new Date();
    const credential: MongoStoredCredential = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoStoredCredential>('stored_credentials').insertOne(credential);
    return credential;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoStoredCredential>('stored_credentials').deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// SANDBOX REPOSITORY
// ============================================

export const sandboxRepository = {
  async findById(id: string): Promise<MongoSandbox | null> {
    return getCollection<MongoSandbox>(COLLECTIONS.SANDBOXES).findOne({ id });
  },

  async findByProjectId(projectId: string): Promise<MongoSandbox[]> {
    return getCollection<MongoSandbox>(COLLECTIONS.SANDBOXES)
      .find({ projectId })
      .sort({ createdAt: -1 })
      .toArray();
  },

  async findByOwnerId(ownerId: string, projectId?: string): Promise<MongoSandbox[]> {
    const query: any = { ownerId };
    if (projectId) query.projectId = projectId;
    return getCollection<MongoSandbox>(COLLECTIONS.SANDBOXES)
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
  },

  async countByOwnerAndProject(ownerId: string, projectId: string, status: 'active' | 'merged' | 'archived'): Promise<number> {
    return getCollection<MongoSandbox>(COLLECTIONS.SANDBOXES).countDocuments({
      ownerId,
      projectId,
      status
    });
  },

  async create(data: Omit<MongoSandbox, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoSandbox> {
    const now = new Date();
    const sandbox: MongoSandbox = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoSandbox>(COLLECTIONS.SANDBOXES).insertOne(sandbox);
    return sandbox;
  },

  async update(id: string, data: Partial<MongoSandbox>): Promise<MongoSandbox | null> {
    const result = await getCollection<MongoSandbox>(COLLECTIONS.SANDBOXES).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoSandbox>(COLLECTIONS.SANDBOXES).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// PULL REQUEST REPOSITORY
// ============================================

export const pullRequestRepository = {
  async findById(id: string): Promise<MongoPullRequest | null> {
    return getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS).findOne({ id });
  },

  async findByNumber(projectId: string, number: number): Promise<MongoPullRequest | null> {
    return getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS).findOne({ projectId, number });
  },

  async findBySandboxId(sandboxId: string): Promise<MongoPullRequest[]> {
    return getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS)
      .find({ sandboxId })
      .sort({ createdAt: -1 })
      .toArray();
  },

  async findByProjectId(projectId: string, status?: string): Promise<MongoPullRequest[]> {
    const query: any = { projectId };
    if (status) query.status = status;
    return getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS)
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
  },

  async findOpenBySandboxId(sandboxId: string): Promise<MongoPullRequest[]> {
    return getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS)
      .find({ sandboxId, status: { $in: ['draft', 'open'] } })
      .toArray();
  },

  async countByProjectId(projectId: string): Promise<number> {
    return getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS).countDocuments({ projectId });
  },

  async getNextPRNumber(projectId: string): Promise<number> {
    const lastPR = await getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS)
      .find({ projectId })
      .sort({ number: -1 })
      .limit(1)
      .toArray();
    return lastPR.length > 0 ? lastPR[0].number + 1 : 1;
  },

  async create(data: Omit<MongoPullRequest, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoPullRequest> {
    const now = new Date();
    const pr: MongoPullRequest = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS).insertOne(pr);
    return pr;
  },

  async update(id: string, data: Partial<MongoPullRequest>): Promise<MongoPullRequest | null> {
    const result = await getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async deleteBySandboxId(sandboxId: string): Promise<number> {
    const result = await getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS).deleteMany({ sandboxId });
    return result.deletedCount;
  }
};

// ============================================
// PULL REQUEST REVIEW REPOSITORY
// ============================================

export interface MongoPullRequestReview {
  _id?: string;
  id: string;
  pullRequestId: string;
  reviewerId: string;
  status: 'approved' | 'changes_requested' | 'pending';
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const pullRequestReviewRepository = {
  async findById(id: string): Promise<MongoPullRequestReview | null> {
    return getCollection<MongoPullRequestReview>('pull_request_reviews').findOne({ id });
  },

  async findByPullRequestId(pullRequestId: string): Promise<MongoPullRequestReview[]> {
    return getCollection<MongoPullRequestReview>('pull_request_reviews')
      .find({ pullRequestId })
      .sort({ createdAt: -1 })
      .toArray();
  },

  async findByPullRequestAndReviewer(pullRequestId: string, reviewerId: string): Promise<MongoPullRequestReview | null> {
    return getCollection<MongoPullRequestReview>('pull_request_reviews').findOne({ pullRequestId, reviewerId });
  },

  async countByStatus(pullRequestId: string, status: 'approved' | 'changes_requested' | 'pending'): Promise<number> {
    return getCollection<MongoPullRequestReview>('pull_request_reviews').countDocuments({ pullRequestId, status });
  },

  async create(data: Omit<MongoPullRequestReview, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoPullRequestReview> {
    const now = new Date();
    const review: MongoPullRequestReview = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoPullRequestReview>('pull_request_reviews').insertOne(review);
    return review;
  },

  async upsert(pullRequestId: string, reviewerId: string, data: Partial<MongoPullRequestReview>): Promise<MongoPullRequestReview> {
    const now = new Date();
    const result = await getCollection<MongoPullRequestReview>('pull_request_reviews').findOneAndUpdate(
      { pullRequestId, reviewerId },
      {
        $set: { ...data, updatedAt: now },
        $setOnInsert: { id: uuidv4(), pullRequestId, reviewerId, createdAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result!;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoPullRequestReview>('pull_request_reviews').deleteOne({ id });
    return result.deletedCount > 0;
  },

  async deleteByPullRequestId(pullRequestId: string): Promise<number> {
    const result = await getCollection<MongoPullRequestReview>('pull_request_reviews').deleteMany({ pullRequestId });
    return result.deletedCount;
  }
};

// ============================================
// PULL REQUEST COMMENT REPOSITORY
// ============================================

export interface MongoPullRequestComment {
  _id?: string;
  id: string;
  pullRequestId: string;
  authorId: string;
  body: string;
  filePath?: string;
  lineNumber?: number;
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const pullRequestCommentRepository = {
  async findById(id: string): Promise<MongoPullRequestComment | null> {
    return getCollection<MongoPullRequestComment>('pull_request_comments').findOne({ id });
  },

  async findByPullRequestId(pullRequestId: string): Promise<MongoPullRequestComment[]> {
    return getCollection<MongoPullRequestComment>('pull_request_comments')
      .find({ pullRequestId })
      .sort({ createdAt: 1 })
      .toArray();
  },

  async countByPullRequestId(pullRequestId: string): Promise<number> {
    return getCollection<MongoPullRequestComment>('pull_request_comments').countDocuments({ pullRequestId });
  },

  async create(data: Omit<MongoPullRequestComment, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoPullRequestComment> {
    const now = new Date();
    const comment: MongoPullRequestComment = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoPullRequestComment>('pull_request_comments').insertOne(comment);
    return comment;
  },

  async update(id: string, data: Partial<MongoPullRequestComment>): Promise<MongoPullRequestComment | null> {
    const result = await getCollection<MongoPullRequestComment>('pull_request_comments').findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoPullRequestComment>('pull_request_comments').deleteOne({ id });
    return result.deletedCount > 0;
  },

  async deleteByPullRequestId(pullRequestId: string): Promise<number> {
    const result = await getCollection<MongoPullRequestComment>('pull_request_comments').deleteMany({ pullRequestId });
    return result.deletedCount;
  }
};

// ============================================
// PULL REQUEST FILE REPOSITORY
// ============================================

export interface MongoPullRequestFile {
  _id?: string;
  id: string;
  pullRequestId: string;
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  createdAt: Date;
}

export const pullRequestFileRepository = {
  async findByPullRequestId(pullRequestId: string): Promise<MongoPullRequestFile[]> {
    return getCollection<MongoPullRequestFile>('pull_request_files')
      .find({ pullRequestId })
      .sort({ filePath: 1 })
      .toArray();
  },

  async countByPullRequestId(pullRequestId: string): Promise<number> {
    return getCollection<MongoPullRequestFile>('pull_request_files').countDocuments({ pullRequestId });
  },

  async create(data: Omit<MongoPullRequestFile, '_id' | 'id' | 'createdAt'>): Promise<MongoPullRequestFile> {
    const file: MongoPullRequestFile = {
      id: uuidv4(),
      ...data,
      createdAt: new Date()
    };
    await getCollection<MongoPullRequestFile>('pull_request_files').insertOne(file);
    return file;
  },

  async createMany(pullRequestId: string, files: Array<Omit<MongoPullRequestFile, '_id' | 'id' | 'pullRequestId' | 'createdAt'>>): Promise<MongoPullRequestFile[]> {
    const now = new Date();
    const docs = files.map(f => ({
      id: uuidv4(),
      pullRequestId,
      ...f,
      createdAt: now
    }));
    if (docs.length > 0) {
      await getCollection<MongoPullRequestFile>('pull_request_files').insertMany(docs);
    }
    return docs;
  },

  async deleteByPullRequestId(pullRequestId: string): Promise<number> {
    const result = await getCollection<MongoPullRequestFile>('pull_request_files').deleteMany({ pullRequestId });
    return result.deletedCount;
  }
};

// ============================================
// PROJECT SETTINGS REPOSITORY
// ============================================

export interface MongoProjectSettings {
  _id?: string;
  id: string;
  projectId: string;
  requiredApprovals: number;
  allowSelfApproval: boolean;
  autoDeleteSandbox: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const projectSettingsRepository = {
  async findByProjectId(projectId: string): Promise<MongoProjectSettings | null> {
    return getCollection<MongoProjectSettings>('project_settings').findOne({ projectId });
  },

  async upsert(projectId: string, data: Partial<MongoProjectSettings>): Promise<MongoProjectSettings> {
    const now = new Date();
    const result = await getCollection<MongoProjectSettings>('project_settings').findOneAndUpdate(
      { projectId },
      {
        $set: { ...data, updatedAt: now },
        $setOnInsert: { id: uuidv4(), projectId, createdAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result!;
  },

  async delete(projectId: string): Promise<boolean> {
    const result = await getCollection<MongoProjectSettings>('project_settings').deleteOne({ projectId });
    return result.deletedCount > 0;
  }
};

// ============================================
// GITHUB INTEGRATION REPOSITORY
// ============================================

export interface MongoGitHubIntegration {
  _id?: string;
  id: string;
  userId: string;
  accessToken: string;
  tokenType: 'oauth' | 'pat';
  login: string;
  avatarUrl?: string;
  isValid: boolean;
  lastValidatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const githubIntegrationRepository = {
  async findById(id: string): Promise<MongoGitHubIntegration | null> {
    return getCollection<MongoGitHubIntegration>(COLLECTIONS.GITHUB_INTEGRATIONS).findOne({ id });
  },

  async findByUserId(userId: string): Promise<MongoGitHubIntegration | null> {
    return getCollection<MongoGitHubIntegration>(COLLECTIONS.GITHUB_INTEGRATIONS).findOne({ userId });
  },

  async upsert(userId: string, data: Partial<MongoGitHubIntegration>): Promise<MongoGitHubIntegration> {
    const now = new Date();
    const result = await getCollection<MongoGitHubIntegration>(COLLECTIONS.GITHUB_INTEGRATIONS).findOneAndUpdate(
      { userId },
      {
        $set: { ...data, updatedAt: now },
        $setOnInsert: { id: uuidv4(), userId, createdAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result!;
  },

  async delete(userId: string): Promise<boolean> {
    const result = await getCollection<MongoGitHubIntegration>(COLLECTIONS.GITHUB_INTEGRATIONS).deleteOne({ userId });
    return result.deletedCount > 0;
  }
};

// ============================================
// GITHUB REPOSITORY CONFIG REPOSITORY
// ============================================

export interface MongoGitHubRepositoryConfig {
  _id?: string;
  id: string;
  integrationId: string;
  workflowId: string;
  repoFullName: string;
  repoId: number;
  defaultBranch: string;
  workflowPath: string;
  isActive: boolean;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const githubRepositoryConfigRepository = {
  async findByWorkflowId(workflowId: string): Promise<MongoGitHubRepositoryConfig | null> {
    return getCollection<MongoGitHubRepositoryConfig>('github_repository_configs').findOne({ workflowId, isActive: true });
  },

  async findByWorkflowAndRepo(workflowId: string, repoFullName: string): Promise<MongoGitHubRepositoryConfig | null> {
    return getCollection<MongoGitHubRepositoryConfig>('github_repository_configs').findOne({ workflowId, repoFullName });
  },

  async upsert(workflowId: string, repoFullName: string, data: Partial<MongoGitHubRepositoryConfig>): Promise<MongoGitHubRepositoryConfig> {
    const now = new Date();
    const result = await getCollection<MongoGitHubRepositoryConfig>('github_repository_configs').findOneAndUpdate(
      { workflowId, repoFullName },
      {
        $set: { ...data, updatedAt: now },
        $setOnInsert: { id: uuidv4(), workflowId, repoFullName, createdAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result!;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoGitHubRepositoryConfig>('github_repository_configs').deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// GITHUB WORKFLOW RUN REPOSITORY
// ============================================

export interface MongoGitHubWorkflowRun {
  _id?: string;
  id: string;
  workflowId: string;
  executionId?: string;
  runId: string; // BigInt stored as string
  runNumber: number;
  repoFullName: string;
  status: string;
  conclusion?: string;
  htmlUrl: string;
  event: string;
  headBranch: string;
  headSha: string;
  configSnapshot?: string;
  artifactsUrl?: string;
  logsUrl?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export const githubWorkflowRunRepository = {
  async findById(id: string): Promise<MongoGitHubWorkflowRun | null> {
    return getCollection<MongoGitHubWorkflowRun>(COLLECTIONS.GITHUB_WORKFLOW_RUNS).findOne({ id });
  },

  async findByRunId(runId: string): Promise<MongoGitHubWorkflowRun | null> {
    return getCollection<MongoGitHubWorkflowRun>(COLLECTIONS.GITHUB_WORKFLOW_RUNS).findOne({ runId });
  },

  async findByRunIdAndRepo(runId: bigint | number, repoFullName: string): Promise<MongoGitHubWorkflowRun | null> {
    return getCollection<MongoGitHubWorkflowRun>(COLLECTIONS.GITHUB_WORKFLOW_RUNS).findOne({
      runId: String(runId),
      repoFullName
    });
  },

  async findByWorkflowId(workflowId: string, limit: number = 20): Promise<MongoGitHubWorkflowRun[]> {
    return getCollection<MongoGitHubWorkflowRun>(COLLECTIONS.GITHUB_WORKFLOW_RUNS)
      .find({ workflowId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  async update(id: string, data: Partial<MongoGitHubWorkflowRun>): Promise<MongoGitHubWorkflowRun | null> {
    const result = await getCollection<MongoGitHubWorkflowRun>(COLLECTIONS.GITHUB_WORKFLOW_RUNS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async upsert(runId: string, data: Partial<MongoGitHubWorkflowRun>): Promise<MongoGitHubWorkflowRun> {
    const now = new Date();
    const result = await getCollection<MongoGitHubWorkflowRun>(COLLECTIONS.GITHUB_WORKFLOW_RUNS).findOneAndUpdate(
      { runId },
      {
        $set: data,
        $setOnInsert: { id: uuidv4(), runId, createdAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result!;
  }
};

// ============================================
// GITHUB WORKFLOW JOB REPOSITORY
// ============================================

export interface MongoGitHubWorkflowJob {
  _id?: string;
  id: string;
  runDbId: string;
  jobId: string; // BigInt stored as string
  name: string;
  status: string;
  conclusion?: string;
  htmlUrl: string;
  runnerName?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export const githubWorkflowJobRepository = {
  async findByRunDbId(runDbId: string): Promise<MongoGitHubWorkflowJob[]> {
    return getCollection<MongoGitHubWorkflowJob>('github_workflow_jobs')
      .find({ runDbId })
      .toArray();
  },

  async upsert(jobId: string, data: Partial<MongoGitHubWorkflowJob>): Promise<MongoGitHubWorkflowJob> {
    const now = new Date();
    const result = await getCollection<MongoGitHubWorkflowJob>('github_workflow_jobs').findOneAndUpdate(
      { jobId },
      {
        $set: data,
        $setOnInsert: { id: uuidv4(), jobId, createdAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result!;
  }
};

// ============================================
// USER ENVIRONMENT REPOSITORY
// ============================================

export interface MongoUserEnvironment {
  _id?: string;
  id: string;
  userId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const userEnvironmentRepository = {
  async findById(id: string): Promise<MongoUserEnvironment | null> {
    return getCollection<MongoUserEnvironment>('user_environments').findOne({ id });
  },

  async findByUserId(userId: string): Promise<MongoUserEnvironment[]> {
    return getCollection<MongoUserEnvironment>('user_environments')
      .find({ userId })
      .sort({ name: 1 })
      .toArray();
  },

  async findActiveByUserId(userId: string): Promise<MongoUserEnvironment | null> {
    return getCollection<MongoUserEnvironment>('user_environments').findOne({ userId, isActive: true });
  },

  async create(data: Omit<MongoUserEnvironment, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoUserEnvironment> {
    const now = new Date();
    const env: MongoUserEnvironment = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoUserEnvironment>('user_environments').insertOne(env);
    return env;
  },

  async update(id: string, data: Partial<MongoUserEnvironment>): Promise<MongoUserEnvironment | null> {
    const result = await getCollection<MongoUserEnvironment>('user_environments').findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async deactivateAll(userId: string): Promise<void> {
    await getCollection<MongoUserEnvironment>('user_environments').updateMany(
      { userId },
      { $set: { isActive: false, updatedAt: new Date() } }
    );
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoUserEnvironment>('user_environments').deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// ENVIRONMENT VARIABLE REPOSITORY
// ============================================

export interface MongoEnvironmentVariable {
  _id?: string;
  id: string;
  environmentId: string;
  key: string;
  value: string;
  type: string;
  sensitive: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const environmentVariableRepository = {
  async findByEnvironmentId(environmentId: string): Promise<MongoEnvironmentVariable[]> {
    return getCollection<MongoEnvironmentVariable>('environment_variables')
      .find({ environmentId })
      .sort({ key: 1 })
      .toArray();
  },

  async findByKey(environmentId: string, key: string): Promise<MongoEnvironmentVariable | null> {
    return getCollection<MongoEnvironmentVariable>('environment_variables').findOne({ environmentId, key });
  },

  async countByEnvironmentId(environmentId: string): Promise<number> {
    return getCollection<MongoEnvironmentVariable>('environment_variables').countDocuments({ environmentId });
  },

  async upsert(environmentId: string, key: string, data: Partial<MongoEnvironmentVariable>): Promise<MongoEnvironmentVariable> {
    const now = new Date();
    const result = await getCollection<MongoEnvironmentVariable>('environment_variables').findOneAndUpdate(
      { environmentId, key },
      {
        $set: { ...data, updatedAt: now },
        $setOnInsert: { id: uuidv4(), environmentId, key, createdAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result!;
  },

  async delete(environmentId: string, key: string): Promise<boolean> {
    const result = await getCollection<MongoEnvironmentVariable>('environment_variables').deleteOne({ environmentId, key });
    return result.deletedCount > 0;
  },

  async deleteByEnvironmentId(environmentId: string): Promise<number> {
    const result = await getCollection<MongoEnvironmentVariable>('environment_variables').deleteMany({ environmentId });
    return result.deletedCount;
  }
};

// ============================================
// GLOBAL VARIABLE REPOSITORY
// ============================================

export interface MongoGlobalVariable {
  _id?: string;
  id: string;
  userId: string;
  key: string;
  value: string;
  type: string;
  sensitive: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const globalVariableRepository = {
  async findByUserId(userId: string): Promise<MongoGlobalVariable[]> {
    return getCollection<MongoGlobalVariable>('global_variables')
      .find({ userId })
      .sort({ key: 1 })
      .toArray();
  },

  async findByKey(userId: string, key: string): Promise<MongoGlobalVariable | null> {
    return getCollection<MongoGlobalVariable>('global_variables').findOne({ userId, key });
  },

  async upsert(userId: string, key: string, data: Partial<MongoGlobalVariable>): Promise<MongoGlobalVariable> {
    const now = new Date();
    const result = await getCollection<MongoGlobalVariable>('global_variables').findOneAndUpdate(
      { userId, key },
      {
        $set: { ...data, updatedAt: now },
        $setOnInsert: { id: uuidv4(), userId, key, createdAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result!;
  },

  async delete(userId: string, key: string): Promise<boolean> {
    const result = await getCollection<MongoGlobalVariable>('global_variables').deleteOne({ userId, key });
    return result.deletedCount > 0;
  }
};

// ============================================
// NOTIFICATION HISTORY REPOSITORY
// ============================================

export interface MongoNotificationHistory {
  _id?: string;
  id: string;
  scheduleId: string;
  runId: string;
  type: 'email' | 'slack' | 'webhook';
  recipient: string;
  subject?: string;
  content?: string;
  status: 'pending' | 'sent' | 'failed' | 'bounced';
  errorMessage?: string;
  sentAt?: Date;
  createdAt: Date;
}

export const notificationHistoryRepository = {
  async findById(id: string): Promise<MongoNotificationHistory | null> {
    return getCollection<MongoNotificationHistory>('notification_history').findOne({ id });
  },

  async findByScheduleId(scheduleId: string, limit: number = 50): Promise<MongoNotificationHistory[]> {
    return getCollection<MongoNotificationHistory>('notification_history')
      .find({ scheduleId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  async findByRunId(runId: string): Promise<MongoNotificationHistory[]> {
    return getCollection<MongoNotificationHistory>('notification_history')
      .find({ runId })
      .sort({ createdAt: -1 })
      .toArray();
  },

  async create(data: Omit<MongoNotificationHistory, '_id' | 'id' | 'createdAt'>): Promise<MongoNotificationHistory> {
    const notification: MongoNotificationHistory = {
      id: uuidv4(),
      ...data,
      createdAt: new Date()
    };
    await getCollection<MongoNotificationHistory>('notification_history').insertOne(notification);
    return notification;
  },

  async update(id: string, data: Partial<MongoNotificationHistory>): Promise<MongoNotificationHistory | null> {
    const result = await getCollection<MongoNotificationHistory>('notification_history').findOneAndUpdate(
      { id },
      { $set: data },
      { returnDocument: 'after' }
    );
    return result;
  }
};

// ============================================
// RECORDING SESSION REPOSITORY
// ============================================

export const recordingSessionRepository = {
  async findById(id: string): Promise<MongoRecordingSession | null> {
    return getCollection<MongoRecordingSession>(COLLECTIONS.RECORDING_SESSIONS).findOne({ id });
  },

  async findByUserId(userId: string, status?: MongoRecordingSession['status']): Promise<MongoRecordingSession[]> {
    const filter: any = { userId };
    if (status) filter.status = status;
    return getCollection<MongoRecordingSession>(COLLECTIONS.RECORDING_SESSIONS)
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();
  },

  async findByUserIdWithLimit(userId: string, limit: number): Promise<MongoRecordingSession[]> {
    return getCollection<MongoRecordingSession>(COLLECTIONS.RECORDING_SESSIONS)
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  async findStaleActive(cutoffTime: Date): Promise<MongoRecordingSession[]> {
    return getCollection<MongoRecordingSession>(COLLECTIONS.RECORDING_SESSIONS)
      .find({
        status: 'active',
        updatedAt: { $lt: cutoffTime }
      })
      .toArray();
  },

  async create(data: Omit<MongoRecordingSession, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoRecordingSession> {
    const now = new Date();
    const session: MongoRecordingSession = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoRecordingSession>(COLLECTIONS.RECORDING_SESSIONS).insertOne(session);
    return session;
  },

  async update(id: string, data: Partial<MongoRecordingSession>): Promise<MongoRecordingSession | null> {
    const result = await getCollection<MongoRecordingSession>(COLLECTIONS.RECORDING_SESSIONS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoRecordingSession>(COLLECTIONS.RECORDING_SESSIONS).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async deleteOldCompleted(cutoffTime: Date): Promise<number> {
    const result = await getCollection<MongoRecordingSession>(COLLECTIONS.RECORDING_SESSIONS).deleteMany({
      status: { $in: ['completed', 'failed'] },
      completedAt: { $lt: cutoffTime }
    });
    return result.deletedCount;
  }
};

// ============================================
// RECORDING STEP REPOSITORY
// ============================================

export const recordingStepRepository = {
  async findById(id: string): Promise<MongoRecordingStep | null> {
    return getCollection<MongoRecordingStep>(COLLECTIONS.RECORDING_STEPS).findOne({ id });
  },

  async findBySessionId(sessionId: string): Promise<MongoRecordingStep[]> {
    return getCollection<MongoRecordingStep>(COLLECTIONS.RECORDING_STEPS)
      .find({ sessionId })
      .sort({ stepNumber: 1 })
      .toArray();
  },

  async findLastBySessionId(sessionId: string): Promise<MongoRecordingStep | null> {
    const steps = await getCollection<MongoRecordingStep>(COLLECTIONS.RECORDING_STEPS)
      .find({ sessionId })
      .sort({ stepNumber: -1 })
      .limit(1)
      .toArray();
    return steps.length > 0 ? steps[0] : null;
  },

  async create(data: Omit<MongoRecordingStep, '_id' | 'id' | 'createdAt'>): Promise<MongoRecordingStep> {
    const step: MongoRecordingStep = {
      id: uuidv4(),
      ...data,
      createdAt: new Date()
    };
    await getCollection<MongoRecordingStep>(COLLECTIONS.RECORDING_STEPS).insertOne(step);
    return step;
  },

  async update(id: string, data: Partial<MongoRecordingStep>): Promise<MongoRecordingStep | null> {
    const result = await getCollection<MongoRecordingStep>(COLLECTIONS.RECORDING_STEPS).findOneAndUpdate(
      { id },
      { $set: data },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoRecordingStep>(COLLECTIONS.RECORDING_STEPS).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async deleteBySessionId(sessionId: string): Promise<number> {
    const result = await getCollection<MongoRecordingStep>(COLLECTIONS.RECORDING_STEPS).deleteMany({ sessionId });
    return result.deletedCount;
  }
};

// ============================================
// AI RECORDER SESSION REPOSITORY
// ============================================

export const aiRecorderSessionRepository = {
  async findById(id: string): Promise<MongoAIRecorderSession | null> {
    return getCollection<MongoAIRecorderSession>(COLLECTIONS.AI_RECORDER_SESSIONS).findOne({ id });
  },

  async findByUserId(userId: string): Promise<MongoAIRecorderSession[]> {
    return getCollection<MongoAIRecorderSession>(COLLECTIONS.AI_RECORDER_SESSIONS)
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
  },

  async create(data: Omit<MongoAIRecorderSession, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoAIRecorderSession> {
    const now = new Date();
    const session: MongoAIRecorderSession = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoAIRecorderSession>(COLLECTIONS.AI_RECORDER_SESSIONS).insertOne(session);
    return session;
  },

  async update(id: string, data: Partial<MongoAIRecorderSession>): Promise<MongoAIRecorderSession | null> {
    const result = await getCollection<MongoAIRecorderSession>(COLLECTIONS.AI_RECORDER_SESSIONS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoAIRecorderSession>(COLLECTIONS.AI_RECORDER_SESSIONS).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// AI RECORDER TEST CASE REPOSITORY
// ============================================

export const aiRecorderTestCaseRepository = {
  async findById(id: string): Promise<MongoAIRecorderTestCase | null> {
    return getCollection<MongoAIRecorderTestCase>(COLLECTIONS.AI_RECORDER_TEST_CASES).findOne({ id });
  },

  async findBySessionId(sessionId: string): Promise<MongoAIRecorderTestCase[]> {
    return getCollection<MongoAIRecorderTestCase>(COLLECTIONS.AI_RECORDER_TEST_CASES)
      .find({ sessionId })
      .sort({ order: 1 })
      .toArray();
  },

  async create(data: Omit<MongoAIRecorderTestCase, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoAIRecorderTestCase> {
    const now = new Date();
    const testCase: MongoAIRecorderTestCase = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoAIRecorderTestCase>(COLLECTIONS.AI_RECORDER_TEST_CASES).insertOne(testCase);
    return testCase;
  },

  async update(id: string, data: Partial<MongoAIRecorderTestCase>): Promise<MongoAIRecorderTestCase | null> {
    const result = await getCollection<MongoAIRecorderTestCase>(COLLECTIONS.AI_RECORDER_TEST_CASES).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoAIRecorderTestCase>(COLLECTIONS.AI_RECORDER_TEST_CASES).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async deleteBySessionId(sessionId: string): Promise<number> {
    const result = await getCollection<MongoAIRecorderTestCase>(COLLECTIONS.AI_RECORDER_TEST_CASES).deleteMany({ sessionId });
    return result.deletedCount;
  }
};

// ============================================
// AI RECORDER STEP REPOSITORY
// ============================================

export const aiRecorderStepRepository = {
  async findById(id: string): Promise<MongoAIRecorderStep | null> {
    return getCollection<MongoAIRecorderStep>(COLLECTIONS.AI_RECORDER_STEPS).findOne({ id });
  },

  async findByTestCaseId(testCaseId: string): Promise<MongoAIRecorderStep[]> {
    return getCollection<MongoAIRecorderStep>(COLLECTIONS.AI_RECORDER_STEPS)
      .find({ testCaseId })
      .sort({ stepNumber: 1 })
      .toArray();
  },

  async create(data: Omit<MongoAIRecorderStep, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoAIRecorderStep> {
    const now = new Date();
    const step: MongoAIRecorderStep = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoAIRecorderStep>(COLLECTIONS.AI_RECORDER_STEPS).insertOne(step);
    return step;
  },

  async update(id: string, data: Partial<MongoAIRecorderStep>): Promise<MongoAIRecorderStep | null> {
    const result = await getCollection<MongoAIRecorderStep>(COLLECTIONS.AI_RECORDER_STEPS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async updateMany(filter: { testCaseId: string; stepNumber?: { $gt?: number; $gte?: number; $lt?: number; $lte?: number } }, data: Partial<MongoAIRecorderStep>): Promise<number> {
    const result = await getCollection<MongoAIRecorderStep>(COLLECTIONS.AI_RECORDER_STEPS).updateMany(
      filter as Filter<MongoAIRecorderStep>,
      { $set: { ...data, updatedAt: new Date() } }
    );
    return result.modifiedCount;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoAIRecorderStep>(COLLECTIONS.AI_RECORDER_STEPS).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async deleteByTestCaseId(testCaseId: string): Promise<number> {
    const result = await getCollection<MongoAIRecorderStep>(COLLECTIONS.AI_RECORDER_STEPS).deleteMany({ testCaseId });
    return result.deletedCount;
  },

  async countByTestCaseId(testCaseId: string): Promise<number> {
    return getCollection<MongoAIRecorderStep>(COLLECTIONS.AI_RECORDER_STEPS).countDocuments({ testCaseId });
  },

  async getMaxStepNumber(testCaseId: string): Promise<number> {
    const steps = await getCollection<MongoAIRecorderStep>(COLLECTIONS.AI_RECORDER_STEPS)
      .find({ testCaseId })
      .sort({ stepNumber: -1 })
      .limit(1)
      .toArray();
    return steps.length > 0 ? steps[0].stepNumber : 0;
  }
};

// ============================================
// SCHEDULED TEST REPOSITORY
// ============================================

export const scheduledTestRepository = {
  async findById(id: string): Promise<MongoScheduledTest | null> {
    return getCollection<MongoScheduledTest>(COLLECTIONS.SCHEDULED_TESTS).findOne({ id });
  },

  async findByUserId(userId: string): Promise<MongoScheduledTest[]> {
    return getCollection<MongoScheduledTest>(COLLECTIONS.SCHEDULED_TESTS)
      .find({ userId })
      .sort({ updatedAt: -1 })
      .toArray();
  },

  async findByProjectId(projectId: string): Promise<MongoScheduledTest[]> {
    return getCollection<MongoScheduledTest>(COLLECTIONS.SCHEDULED_TESTS)
      .find({ projectId })
      .sort({ updatedAt: -1 })
      .toArray();
  },

  async findEnabledSchedules(): Promise<MongoScheduledTest[]> {
    return getCollection<MongoScheduledTest>(COLLECTIONS.SCHEDULED_TESTS)
      .find({ enabled: true })
      .toArray();
  },

  async findDueSchedules(now: Date): Promise<MongoScheduledTest[]> {
    return getCollection<MongoScheduledTest>(COLLECTIONS.SCHEDULED_TESTS)
      .find({
        enabled: true,
        nextRunAt: { $lte: now }
      })
      .toArray();
  },

  async create(data: Omit<MongoScheduledTest, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoScheduledTest> {
    const now = new Date();
    const schedule: MongoScheduledTest = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoScheduledTest>(COLLECTIONS.SCHEDULED_TESTS).insertOne(schedule);
    return schedule;
  },

  async update(id: string, data: Partial<MongoScheduledTest>): Promise<MongoScheduledTest | null> {
    const result = await getCollection<MongoScheduledTest>(COLLECTIONS.SCHEDULED_TESTS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoScheduledTest>(COLLECTIONS.SCHEDULED_TESTS).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// SCHEDULED TEST RUN REPOSITORY
// ============================================

export const scheduledTestRunRepository = {
  async findById(id: string): Promise<MongoScheduledTestRun | null> {
    return getCollection<MongoScheduledTestRun>(COLLECTIONS.SCHEDULED_TEST_RUNS).findOne({ id });
  },

  async findByScheduleId(scheduleId: string, limit?: number): Promise<MongoScheduledTestRun[]> {
    const cursor = getCollection<MongoScheduledTestRun>(COLLECTIONS.SCHEDULED_TEST_RUNS)
      .find({ scheduleId })
      .sort({ createdAt: -1 });

    if (limit) {
      cursor.limit(limit);
    }

    return cursor.toArray();
  },

  async create(data: Omit<MongoScheduledTestRun, '_id' | 'id' | 'createdAt'>): Promise<MongoScheduledTestRun> {
    const run: MongoScheduledTestRun = {
      id: uuidv4(),
      ...data,
      createdAt: new Date()
    };
    await getCollection<MongoScheduledTestRun>(COLLECTIONS.SCHEDULED_TEST_RUNS).insertOne(run);
    return run;
  },

  async update(id: string, data: Partial<MongoScheduledTestRun>): Promise<MongoScheduledTestRun | null> {
    const result = await getCollection<MongoScheduledTestRun>(COLLECTIONS.SCHEDULED_TEST_RUNS).findOneAndUpdate(
      { id },
      { $set: data },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoScheduledTestRun>(COLLECTIONS.SCHEDULED_TEST_RUNS).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async deleteByScheduleId(scheduleId: string): Promise<number> {
    const result = await getCollection<MongoScheduledTestRun>(COLLECTIONS.SCHEDULED_TEST_RUNS).deleteMany({ scheduleId });
    return result.deletedCount;
  }
};

// ============================================
// SCHEDULE NOTIFICATION REPOSITORY
// ============================================

export const scheduleNotificationRepository = {
  async findById(id: string): Promise<MongoScheduleNotification | null> {
    return getCollection<MongoScheduleNotification>(COLLECTIONS.SCHEDULE_NOTIFICATIONS).findOne({ id });
  },

  async findByScheduleId(scheduleId: string): Promise<MongoScheduleNotification[]> {
    return getCollection<MongoScheduleNotification>(COLLECTIONS.SCHEDULE_NOTIFICATIONS)
      .find({ scheduleId })
      .toArray();
  },

  async create(data: Omit<MongoScheduleNotification, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoScheduleNotification> {
    const now = new Date();
    const notification: MongoScheduleNotification = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoScheduleNotification>(COLLECTIONS.SCHEDULE_NOTIFICATIONS).insertOne(notification);
    return notification;
  },

  async update(id: string, data: Partial<MongoScheduleNotification>): Promise<MongoScheduleNotification | null> {
    const result = await getCollection<MongoScheduleNotification>(COLLECTIONS.SCHEDULE_NOTIFICATIONS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoScheduleNotification>(COLLECTIONS.SCHEDULE_NOTIFICATIONS).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async deleteByScheduleId(scheduleId: string): Promise<number> {
    const result = await getCollection<MongoScheduleNotification>(COLLECTIONS.SCHEDULE_NOTIFICATIONS).deleteMany({ scheduleId });
    return result.deletedCount;
  }
};

// ============================================
// COPILOT SESSION REPOSITORY
// ============================================

export const copilotSessionRepository = {
  async findById(id: string): Promise<MongoCopilotSession | null> {
    return getCollection<MongoCopilotSession>(COLLECTIONS.COPILOT_SESSIONS).findOne({ id });
  },

  async findByUserId(userId: string): Promise<MongoCopilotSession[]> {
    return getCollection<MongoCopilotSession>(COLLECTIONS.COPILOT_SESSIONS)
      .find({ userId })
      .sort({ updatedAt: -1 })
      .toArray();
  },

  async findByProjectId(projectId: string): Promise<MongoCopilotSession[]> {
    return getCollection<MongoCopilotSession>(COLLECTIONS.COPILOT_SESSIONS)
      .find({ projectId })
      .sort({ updatedAt: -1 })
      .toArray();
  },

  async create(data: Omit<MongoCopilotSession, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoCopilotSession> {
    const now = new Date();
    const session: MongoCopilotSession = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoCopilotSession>(COLLECTIONS.COPILOT_SESSIONS).insertOne(session);
    return session;
  },

  async update(id: string, data: Partial<MongoCopilotSession>): Promise<MongoCopilotSession | null> {
    const result = await getCollection<MongoCopilotSession>(COLLECTIONS.COPILOT_SESSIONS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoCopilotSession>(COLLECTIONS.COPILOT_SESSIONS).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// COPILOT EXPLORATION REPOSITORY
// ============================================

export const copilotExplorationRepository = {
  async findById(id: string): Promise<MongoCopilotExploration | null> {
    return getCollection<MongoCopilotExploration>(COLLECTIONS.COPILOT_EXPLORATIONS).findOne({ id });
  },

  async findBySessionId(sessionId: string): Promise<MongoCopilotExploration[]> {
    return getCollection<MongoCopilotExploration>(COLLECTIONS.COPILOT_EXPLORATIONS)
      .find({ sessionId })
      .sort({ createdAt: -1 })
      .toArray();
  },

  async create(data: Omit<MongoCopilotExploration, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoCopilotExploration> {
    const now = new Date();
    const exploration: MongoCopilotExploration = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoCopilotExploration>(COLLECTIONS.COPILOT_EXPLORATIONS).insertOne(exploration);
    return exploration;
  },

  async update(id: string, data: Partial<MongoCopilotExploration>): Promise<MongoCopilotExploration | null> {
    const result = await getCollection<MongoCopilotExploration>(COLLECTIONS.COPILOT_EXPLORATIONS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoCopilotExploration>(COLLECTIONS.COPILOT_EXPLORATIONS).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async deleteBySessionId(sessionId: string): Promise<number> {
    const result = await getCollection<MongoCopilotExploration>(COLLECTIONS.COPILOT_EXPLORATIONS).deleteMany({ sessionId });
    return result.deletedCount;
  }
};

// ============================================
// COPILOT STAGED CHANGE REPOSITORY
// ============================================

export const copilotStagedChangeRepository = {
  async findById(id: string): Promise<MongoCopilotStagedChange | null> {
    return getCollection<MongoCopilotStagedChange>(COLLECTIONS.COPILOT_STAGED_CHANGES).findOne({ id });
  },

  async findBySessionId(sessionId: string): Promise<MongoCopilotStagedChange[]> {
    return getCollection<MongoCopilotStagedChange>(COLLECTIONS.COPILOT_STAGED_CHANGES)
      .find({ sessionId })
      .sort({ createdAt: 1 })
      .toArray();
  },

  async findBySessionIdAndStatus(sessionId: string, status: MongoCopilotStagedChange['status']): Promise<MongoCopilotStagedChange[]> {
    return getCollection<MongoCopilotStagedChange>(COLLECTIONS.COPILOT_STAGED_CHANGES)
      .find({ sessionId, status })
      .sort({ createdAt: 1 })
      .toArray();
  },

  async countBySessionIdAndStatus(sessionId: string, status: MongoCopilotStagedChange['status']): Promise<number> {
    return getCollection<MongoCopilotStagedChange>(COLLECTIONS.COPILOT_STAGED_CHANGES).countDocuments({ sessionId, status });
  },

  async create(data: Omit<MongoCopilotStagedChange, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoCopilotStagedChange> {
    const now = new Date();
    const change: MongoCopilotStagedChange = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoCopilotStagedChange>(COLLECTIONS.COPILOT_STAGED_CHANGES).insertOne(change);
    return change;
  },

  async update(id: string, data: Partial<MongoCopilotStagedChange>): Promise<MongoCopilotStagedChange | null> {
    const result = await getCollection<MongoCopilotStagedChange>(COLLECTIONS.COPILOT_STAGED_CHANGES).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async updateManyBySessionIdAndStatus(
    sessionId: string,
    status: MongoCopilotStagedChange['status'],
    data: Partial<MongoCopilotStagedChange>
  ): Promise<number> {
    const result = await getCollection<MongoCopilotStagedChange>(COLLECTIONS.COPILOT_STAGED_CHANGES).updateMany(
      { sessionId, status },
      { $set: { ...data, updatedAt: new Date() } }
    );
    return result.modifiedCount;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoCopilotStagedChange>(COLLECTIONS.COPILOT_STAGED_CHANGES).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async deleteBySessionId(sessionId: string): Promise<number> {
    const result = await getCollection<MongoCopilotStagedChange>(COLLECTIONS.COPILOT_STAGED_CHANGES).deleteMany({ sessionId });
    return result.deletedCount;
  }
};

// ============================================
// COPILOT LEARNED SELECTOR REPOSITORY
// ============================================

export const copilotLearnedSelectorRepository = {
  async findById(id: string): Promise<MongoCopilotLearnedSelector | null> {
    return getCollection<MongoCopilotLearnedSelector>(COLLECTIONS.COPILOT_LEARNED_SELECTORS).findOne({ id });
  },

  async findByProjectId(projectId: string, limit?: number): Promise<MongoCopilotLearnedSelector[]> {
    const cursor = getCollection<MongoCopilotLearnedSelector>(COLLECTIONS.COPILOT_LEARNED_SELECTORS)
      .find({ projectId })
      .sort({ usageCount: -1 });

    if (limit) {
      cursor.limit(limit);
    }

    return cursor.toArray();
  },

  async searchByDescription(projectId: string, query: string, limit?: number): Promise<MongoCopilotLearnedSelector[]> {
    const cursor = getCollection<MongoCopilotLearnedSelector>(COLLECTIONS.COPILOT_LEARNED_SELECTORS)
      .find({
        projectId,
        elementDescription: { $regex: query, $options: 'i' }
      })
      .sort({ usageCount: -1 });

    if (limit) {
      cursor.limit(limit);
    }

    return cursor.toArray();
  },

  async create(data: Omit<MongoCopilotLearnedSelector, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoCopilotLearnedSelector> {
    const now = new Date();
    const selector: MongoCopilotLearnedSelector = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoCopilotLearnedSelector>(COLLECTIONS.COPILOT_LEARNED_SELECTORS).insertOne(selector);
    return selector;
  },

  async update(id: string, data: Partial<MongoCopilotLearnedSelector>): Promise<MongoCopilotLearnedSelector | null> {
    const result = await getCollection<MongoCopilotLearnedSelector>(COLLECTIONS.COPILOT_LEARNED_SELECTORS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async incrementUsageCount(id: string): Promise<MongoCopilotLearnedSelector | null> {
    const result = await getCollection<MongoCopilotLearnedSelector>(COLLECTIONS.COPILOT_LEARNED_SELECTORS).findOneAndUpdate(
      { id },
      {
        $inc: { usageCount: 1 },
        $set: { lastUsedAt: new Date(), updatedAt: new Date() }
      },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoCopilotLearnedSelector>(COLLECTIONS.COPILOT_LEARNED_SELECTORS).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// DATA STORAGE CONFIG REPOSITORY
// ============================================

export const dataStorageConfigRepository = {
  async findById(id: string): Promise<MongoDataStorageConfig | null> {
    return getCollection<MongoDataStorageConfig>(COLLECTIONS.DATA_STORAGE_CONFIGS).findOne({ id });
  },

  async findByApplicationId(applicationId: string): Promise<MongoDataStorageConfig | null> {
    return getCollection<MongoDataStorageConfig>(COLLECTIONS.DATA_STORAGE_CONFIGS).findOne({ applicationId });
  },

  async create(data: Omit<MongoDataStorageConfig, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoDataStorageConfig> {
    const now = new Date();
    const config: MongoDataStorageConfig = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoDataStorageConfig>(COLLECTIONS.DATA_STORAGE_CONFIGS).insertOne(config);
    return config;
  },

  async update(applicationId: string, data: Partial<MongoDataStorageConfig>): Promise<MongoDataStorageConfig | null> {
    const result = await getCollection<MongoDataStorageConfig>(COLLECTIONS.DATA_STORAGE_CONFIGS).findOneAndUpdate(
      { applicationId },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async upsert(applicationId: string, updateData: Partial<MongoDataStorageConfig>, createData: Partial<MongoDataStorageConfig>): Promise<MongoDataStorageConfig> {
    const now = new Date();
    const result = await getCollection<MongoDataStorageConfig>(COLLECTIONS.DATA_STORAGE_CONFIGS).findOneAndUpdate(
      { applicationId },
      {
        $set: { ...updateData, updatedAt: now },
        $setOnInsert: {
          id: uuidv4(),
          applicationId,
          ...createData,
          createdAt: now
        }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result!;
  },

  async delete(applicationId: string): Promise<boolean> {
    const result = await getCollection<MongoDataStorageConfig>(COLLECTIONS.DATA_STORAGE_CONFIGS).deleteOne({ applicationId });
    return result.deletedCount > 0;
  }
};

// ============================================
// DATA TABLE REPOSITORY (workflow-scoped test data)
// ============================================

export const dataTableRepository = {
  async findById(id: string): Promise<MongoDataTable | null> {
    return getCollection<MongoDataTable>(COLLECTIONS.DATA_TABLES).findOne({ id });
  },

  async findByWorkflowId(workflowId: string): Promise<MongoDataTable[]> {
    return getCollection<MongoDataTable>(COLLECTIONS.DATA_TABLES).find({ workflowId }).sort({ createdAt: 1 }).toArray();
  },

  async findByWorkflowIdAndName(workflowId: string, name: string): Promise<MongoDataTable | null> {
    return getCollection<MongoDataTable>(COLLECTIONS.DATA_TABLES).findOne({ workflowId, name });
  },

  async create(data: Omit<MongoDataTable, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoDataTable> {
    const now = new Date();
    const table: MongoDataTable = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoDataTable>(COLLECTIONS.DATA_TABLES).insertOne(table);
    return table;
  },

  async update(id: string, data: Partial<MongoDataTable>): Promise<MongoDataTable | null> {
    const result = await getCollection<MongoDataTable>(COLLECTIONS.DATA_TABLES).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    // Also delete related rows
    await getCollection<MongoDataRow>(COLLECTIONS.DATA_ROWS).deleteMany({ tableId: id });
    const result = await getCollection<MongoDataTable>(COLLECTIONS.DATA_TABLES).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// DATA ROW REPOSITORY
// ============================================

export const dataRowRepository = {
  async findById(id: string): Promise<MongoDataRow | null> {
    return getCollection<MongoDataRow>(COLLECTIONS.DATA_ROWS).findOne({ id });
  },

  async findByTableId(tableId: string): Promise<MongoDataRow[]> {
    return getCollection<MongoDataRow>(COLLECTIONS.DATA_ROWS).find({ tableId }).sort({ order: 1 }).toArray();
  },

  async findFirstByTableIdDesc(tableId: string): Promise<MongoDataRow | null> {
    return getCollection<MongoDataRow>(COLLECTIONS.DATA_ROWS).findOne(
      { tableId },
      { sort: { order: -1 } }
    );
  },

  async create(data: Omit<MongoDataRow, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoDataRow> {
    const now = new Date();
    const row: MongoDataRow = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoDataRow>(COLLECTIONS.DATA_ROWS).insertOne(row);
    return row;
  },

  async createMany(rows: Array<Omit<MongoDataRow, '_id' | 'id' | 'createdAt' | 'updatedAt'>>): Promise<number> {
    if (rows.length === 0) return 0;
    const now = new Date();
    const documents = rows.map(data => ({
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    }));
    const result = await getCollection<MongoDataRow>(COLLECTIONS.DATA_ROWS).insertMany(documents);
    return result.insertedCount;
  },

  async update(id: string, data: Partial<MongoDataRow>): Promise<MongoDataRow | null> {
    const result = await getCollection<MongoDataRow>(COLLECTIONS.DATA_ROWS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoDataRow>(COLLECTIONS.DATA_ROWS).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// OBJECT REPOSITORY REPOSITORY
// ============================================

export const objectRepositoryRepository = {
  async findById(id: string): Promise<ObjectRepository | null> {
    const repo = await getCollection<MongoObjectRepository>(COLLECTIONS.OBJECT_REPOSITORIES).findOne({ id });
    if (!repo) return null;
    const pages = await pageObjectRepository.findByRepositoryId(repo.id);
    return { ...repo, pages };
  },

  async findByWorkflowId(workflowId: string): Promise<ObjectRepository | null> {
    const repo = await getCollection<MongoObjectRepository>(COLLECTIONS.OBJECT_REPOSITORIES).findOne({ workflowId });
    if (!repo) return null;
    const pages = await pageObjectRepository.findByRepositoryId(repo.id);
    return { ...repo, pages };
  },

  async create(data: ObjectRepositoryCreate): Promise<ObjectRepository> {
    const now = new Date();
    const repo: MongoObjectRepository = {
      id: uuidv4(),
      workflowId: data.workflowId,
      name: data.name || 'Default Repository',
      description: data.description,
      globalElements: [],
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoObjectRepository>(COLLECTIONS.OBJECT_REPOSITORIES).insertOne(repo);
    return { ...repo, pages: [] };
  },

  async update(id: string, data: ObjectRepositoryUpdate): Promise<ObjectRepository> {
    const result = await getCollection<MongoObjectRepository>(COLLECTIONS.OBJECT_REPOSITORIES).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) throw new Error('Object Repository not found');
    const pages = await pageObjectRepository.findByRepositoryId(result.id);
    return { ...result, pages };
  },

  async delete(id: string): Promise<void> {
    await getCollection<MongoObjectRepository>(COLLECTIONS.OBJECT_REPOSITORIES).deleteOne({ id });
    await getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS).deleteMany({ repositoryId: id });
  },

  async getOrCreateByWorkflowId(workflowId: string): Promise<ObjectRepository> {
    const existing = await this.findByWorkflowId(workflowId);
    if (existing) return existing;
    return this.create({ workflowId });
  }
};

// ============================================
// PAGE OBJECT REPOSITORY
// ============================================

export const pageObjectRepository = {
  async findById(id: string): Promise<PageObject | null> {
    return getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS).findOne({ id }) as Promise<PageObject | null>;
  },

  async findByRepositoryId(repositoryId: string): Promise<PageObject[]> {
    return getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS)
      .find({ repositoryId })
      .sort({ order: 1 })
      .toArray() as Promise<PageObject[]>;
  },

  async create(data: PageObjectCreate): Promise<PageObject> {
    const now = new Date();
    // Get the max order for this repository
    const maxOrderDoc = await getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS)
      .findOne({ repositoryId: data.repositoryId }, { sort: { order: -1 } });
    const maxOrder = maxOrderDoc?.order ?? -1;

    const page: MongoPageObject = {
      id: uuidv4(),
      repositoryId: data.repositoryId,
      name: data.name,
      description: data.description,
      urlPattern: data.urlPattern,
      baseUrl: data.baseUrl,
      elements: data.elements || [],
      order: data.order ?? (maxOrder + 1),
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS).insertOne(page);
    return page as PageObject;
  },

  async update(id: string, data: PageObjectUpdate): Promise<PageObject> {
    const result = await getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) throw new Error('Page Object not found');
    return result as PageObject;
  },

  async delete(id: string): Promise<void> {
    await getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS).deleteOne({ id });
  },

  async reorder(repositoryId: string, pageIds: string[]): Promise<void> {
    const bulkOps = pageIds.map((id, index) => ({
      updateOne: {
        filter: { id, repositoryId },
        update: { $set: { order: index, updatedAt: new Date() } }
      }
    }));
    if (bulkOps.length > 0) {
      await getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS).bulkWrite(bulkOps);
    }
  },

  async addElement(pageId: string, element: PageElementCreate): Promise<PageObject> {
    const elementId = uuidv4();
    const newElement = { id: elementId, ...element };
    const result = await getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS).findOneAndUpdate(
      { id: pageId },
      { $push: { elements: newElement }, $set: { updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) throw new Error('Page Object not found');
    return result as PageObject;
  },

  async updateElement(pageId: string, elementId: string, data: PageElementUpdate): Promise<PageObject> {
    const page = await this.findById(pageId);
    if (!page) throw new Error('Page Object not found');

    const elements = page.elements.map((el: any) =>
      el.id === elementId ? { ...el, ...data } : el
    );

    const result = await getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS).findOneAndUpdate(
      { id: pageId },
      { $set: { elements, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) throw new Error('Page Object not found');
    return result as PageObject;
  },

  async removeElement(pageId: string, elementId: string): Promise<PageObject> {
    const result = await getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS).findOneAndUpdate(
      { id: pageId },
      { $pull: { elements: { id: elementId } }, $set: { updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) throw new Error('Page Object not found');
    return result as PageObject;
  }
};

// Export all repositories
export const mongoRepositories = {
  user: userRepository,
  application: applicationRepository,
  project: projectRepository,
  workflow: workflowRepository,
  testFlow: testFlowRepository,
  execution: executionRepository,
  executionLog: executionLogRepository,
  executionStep: executionStepRepository,
  agent: agentRepository,
  aiSettings: aiSettingsRepository,
  runConfiguration: runConfigurationRepository,
  schedule: scheduleRepository,
  scheduleRun: scheduleRunRepository,
  scheduleTestResult: scheduleTestResultRepository,
  auditLog: auditLogRepository,
  executionEnvironment: executionEnvironmentRepository,
  remoteRunner: remoteRunnerRepository,
  storedCredential: storedCredentialRepository,
  sandbox: sandboxRepository,
  pullRequest: pullRequestRepository,
  pullRequestReview: pullRequestReviewRepository,
  pullRequestComment: pullRequestCommentRepository,
  pullRequestFile: pullRequestFileRepository,
  projectSettings: projectSettingsRepository,
  githubIntegration: githubIntegrationRepository,
  githubRepositoryConfig: githubRepositoryConfigRepository,
  githubWorkflowRun: githubWorkflowRunRepository,
  githubWorkflowJob: githubWorkflowJobRepository,
  userEnvironment: userEnvironmentRepository,
  environmentVariable: environmentVariableRepository,
  globalVariable: globalVariableRepository,
  notificationHistory: notificationHistoryRepository,
  recordingSession: recordingSessionRepository,
  recordingStep: recordingStepRepository,
  aiRecorderSession: aiRecorderSessionRepository,
  aiRecorderTestCase: aiRecorderTestCaseRepository,
  aiRecorderStep: aiRecorderStepRepository,
  scheduledTest: scheduledTestRepository,
  scheduledTestRun: scheduledTestRunRepository,
  scheduleNotification: scheduleNotificationRepository,
  copilotSession: copilotSessionRepository,
  copilotExploration: copilotExplorationRepository,
  copilotStagedChange: copilotStagedChangeRepository,
  copilotLearnedSelector: copilotLearnedSelectorRepository,
  testDataSheet: testDataSheetRepository,
  testDataRow: testDataRowRepository,
  testDataSavedView: testDataSavedViewRepository,
  testDataRelationship: testDataRelationshipRepository,
  dataStorageConfig: dataStorageConfigRepository,
  dataTable: dataTableRepository,
  dataRow: dataRowRepository,
  objectRepository: objectRepositoryRepository,
  pageObject: pageObjectRepository
};

export default mongoRepositories;
