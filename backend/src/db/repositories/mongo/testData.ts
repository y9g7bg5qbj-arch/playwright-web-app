import { Collection, Document } from 'mongodb';
import { getDb, COLLECTIONS, MongoTestFlow, MongoTestDataSheet, MongoTestDataRow, MongoTestDataSavedView, MongoTestDataRelationship } from '../../mongodb';
import { v4 as uuidv4 } from 'uuid';

function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

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

  async findByScope(applicationId: string, projectId?: string): Promise<MongoTestDataSheet[]> {
    const filter: Record<string, unknown> = { applicationId };
    if (projectId) {
      filter.projectId = projectId;
    } else {
      filter.$or = [{ projectId: { $exists: false } }, { projectId: null }, { projectId: '' }];
    }
    return getCollection<MongoTestDataSheet>(COLLECTIONS.TEST_DATA_SHEETS).find(filter).toArray();
  },

  async findByApplicationIdAndName(applicationId: string, name: string): Promise<MongoTestDataSheet | null> {
    return getCollection<MongoTestDataSheet>(COLLECTIONS.TEST_DATA_SHEETS).findOne({ applicationId, name });
  },

  async findByScopeAndName(applicationId: string, name: string, projectId?: string): Promise<MongoTestDataSheet | null> {
    const filter: Record<string, unknown> = { applicationId, name };
    if (projectId) {
      filter.projectId = projectId;
    } else {
      filter.$or = [{ projectId: { $exists: false } }, { projectId: null }, { projectId: '' }];
    }
    return getCollection<MongoTestDataSheet>(COLLECTIONS.TEST_DATA_SHEETS).findOne(filter);
  },

  async findByProjectIdAndName(projectId: string, name: string): Promise<MongoTestDataSheet | null> {
    return getCollection<MongoTestDataSheet>(COLLECTIONS.TEST_DATA_SHEETS).findOne({ projectId, name });
  },

  async create(data: Omit<MongoTestDataSheet, '_id' | 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<MongoTestDataSheet> {
    const now = new Date();
    const sheet: MongoTestDataSheet = {
      id: uuidv4(),
      ...data,
      version: 1,
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

  async update(id: string, data: Partial<MongoTestDataRow>): Promise<MongoTestDataRow | null> {
    const result = await getCollection<MongoTestDataRow>(COLLECTIONS.TEST_DATA_ROWS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
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
