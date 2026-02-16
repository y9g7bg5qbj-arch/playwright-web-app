import { Collection, Document } from 'mongodb';
import { getDb, COLLECTIONS } from '../../mongodb';
import { v4 as uuidv4 } from 'uuid';

function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

// ============================================
// RUN PARAMETER DEFINITION REPOSITORY
// ============================================

export interface MongoRunParameterDefinition {
  _id?: string;
  id: string;
  applicationId: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  label: string;
  description?: string;
  defaultValue?: string | number | boolean;
  required: boolean;
  choices?: string[];
  min?: number;
  max?: number;
  parameterize?: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export const runParameterDefinitionRepository = {
  async findByApplicationId(applicationId: string): Promise<MongoRunParameterDefinition[]> {
    return getCollection<MongoRunParameterDefinition>(COLLECTIONS.RUN_PARAMETER_DEFINITIONS)
      .find({ applicationId })
      .sort({ order: 1 })
      .toArray();
  },

  async findById(id: string): Promise<MongoRunParameterDefinition | null> {
    return getCollection<MongoRunParameterDefinition>(COLLECTIONS.RUN_PARAMETER_DEFINITIONS).findOne({ id });
  },

  async create(
    data: Omit<MongoRunParameterDefinition, '_id' | 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MongoRunParameterDefinition> {
    const now = new Date();
    const doc: MongoRunParameterDefinition = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await getCollection<MongoRunParameterDefinition>(COLLECTIONS.RUN_PARAMETER_DEFINITIONS).insertOne(doc);
    return doc;
  },

  async update(
    id: string,
    data: Partial<Omit<MongoRunParameterDefinition, '_id' | 'id' | 'createdAt'>>
  ): Promise<MongoRunParameterDefinition | null> {
    const result = await getCollection<MongoRunParameterDefinition>(
      COLLECTIONS.RUN_PARAMETER_DEFINITIONS
    ).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoRunParameterDefinition>(
      COLLECTIONS.RUN_PARAMETER_DEFINITIONS
    ).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async reorder(applicationId: string, orderedIds: string[]): Promise<void> {
    const bulk = getCollection<MongoRunParameterDefinition>(
      COLLECTIONS.RUN_PARAMETER_DEFINITIONS
    ).initializeUnorderedBulkOp();
    const now = new Date();
    orderedIds.forEach((id, index) => {
      bulk.find({ id, applicationId }).updateOne({ $set: { order: index, updatedAt: now } });
    });
    if (orderedIds.length > 0) {
      await bulk.execute();
    }
  },

  async getMaxOrder(applicationId: string): Promise<number> {
    const result = await getCollection<MongoRunParameterDefinition>(COLLECTIONS.RUN_PARAMETER_DEFINITIONS)
      .find({ applicationId })
      .sort({ order: -1 })
      .limit(1)
      .toArray();
    return result.length > 0 ? result[0].order : -1;
  },
};

// ============================================
// RUN PARAMETER SET REPOSITORY
// ============================================

export interface MongoRunParameterSet {
  _id?: string;
  id: string;
  applicationId: string;
  name: string;
  description?: string;
  values: Record<string, string | number | boolean>;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const runParameterSetRepository = {
  async findByApplicationId(applicationId: string): Promise<MongoRunParameterSet[]> {
    return getCollection<MongoRunParameterSet>(COLLECTIONS.RUN_PARAMETER_SETS)
      .find({ applicationId })
      .sort({ name: 1 })
      .toArray();
  },

  async findById(id: string): Promise<MongoRunParameterSet | null> {
    return getCollection<MongoRunParameterSet>(COLLECTIONS.RUN_PARAMETER_SETS).findOne({ id });
  },

  async create(
    data: Omit<MongoRunParameterSet, '_id' | 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MongoRunParameterSet> {
    const now = new Date();
    const doc: MongoRunParameterSet = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await getCollection<MongoRunParameterSet>(COLLECTIONS.RUN_PARAMETER_SETS).insertOne(doc);
    return doc;
  },

  async update(
    id: string,
    data: Partial<Omit<MongoRunParameterSet, '_id' | 'id' | 'createdAt'>>
  ): Promise<MongoRunParameterSet | null> {
    const result = await getCollection<MongoRunParameterSet>(
      COLLECTIONS.RUN_PARAMETER_SETS
    ).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoRunParameterSet>(COLLECTIONS.RUN_PARAMETER_SETS).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async clearDefault(applicationId: string): Promise<void> {
    await getCollection<MongoRunParameterSet>(COLLECTIONS.RUN_PARAMETER_SETS).updateMany(
      { applicationId, isDefault: true },
      { $set: { isDefault: false, updatedAt: new Date() } }
    );
  },
};
