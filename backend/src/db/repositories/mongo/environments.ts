import { Collection, Document } from 'mongodb';
import { getDb, COLLECTIONS, MongoAISettings } from '../../mongodb';
import { v4 as uuidv4 } from 'uuid';

function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

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
    return getCollection<MongoUserEnvironment>(COLLECTIONS.USER_ENVIRONMENTS).findOne({ id });
  },

  async findByUserId(userId: string): Promise<MongoUserEnvironment[]> {
    return getCollection<MongoUserEnvironment>(COLLECTIONS.USER_ENVIRONMENTS)
      .find({ userId })
      .sort({ name: 1 })
      .toArray();
  },

  async findActiveByUserId(userId: string): Promise<MongoUserEnvironment | null> {
    return getCollection<MongoUserEnvironment>(COLLECTIONS.USER_ENVIRONMENTS).findOne({ userId, isActive: true });
  },

  async create(data: Omit<MongoUserEnvironment, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoUserEnvironment> {
    const now = new Date();
    const env: MongoUserEnvironment = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoUserEnvironment>(COLLECTIONS.USER_ENVIRONMENTS).insertOne(env);
    return env;
  },

  async update(id: string, data: Partial<MongoUserEnvironment>): Promise<MongoUserEnvironment | null> {
    const result = await getCollection<MongoUserEnvironment>(COLLECTIONS.USER_ENVIRONMENTS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async deactivateAll(userId: string): Promise<void> {
    await getCollection<MongoUserEnvironment>(COLLECTIONS.USER_ENVIRONMENTS).updateMany(
      { userId },
      { $set: { isActive: false, updatedAt: new Date() } }
    );
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoUserEnvironment>(COLLECTIONS.USER_ENVIRONMENTS).deleteOne({ id });
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
    return getCollection<MongoEnvironmentVariable>(COLLECTIONS.ENVIRONMENT_VARIABLES)
      .find({ environmentId })
      .sort({ key: 1 })
      .toArray();
  },

  async findByKey(environmentId: string, key: string): Promise<MongoEnvironmentVariable | null> {
    return getCollection<MongoEnvironmentVariable>(COLLECTIONS.ENVIRONMENT_VARIABLES).findOne({ environmentId, key });
  },

  async countByEnvironmentId(environmentId: string): Promise<number> {
    return getCollection<MongoEnvironmentVariable>(COLLECTIONS.ENVIRONMENT_VARIABLES).countDocuments({ environmentId });
  },

  async upsert(environmentId: string, key: string, data: Partial<MongoEnvironmentVariable>): Promise<MongoEnvironmentVariable> {
    const now = new Date();
    const result = await getCollection<MongoEnvironmentVariable>(COLLECTIONS.ENVIRONMENT_VARIABLES).findOneAndUpdate(
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
    const result = await getCollection<MongoEnvironmentVariable>(COLLECTIONS.ENVIRONMENT_VARIABLES).deleteOne({ environmentId, key });
    return result.deletedCount > 0;
  },

  async deleteByEnvironmentId(environmentId: string): Promise<number> {
    const result = await getCollection<MongoEnvironmentVariable>(COLLECTIONS.ENVIRONMENT_VARIABLES).deleteMany({ environmentId });
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
    return getCollection<MongoGlobalVariable>(COLLECTIONS.GLOBAL_VARIABLES)
      .find({ userId })
      .sort({ key: 1 })
      .toArray();
  },

  async findByKey(userId: string, key: string): Promise<MongoGlobalVariable | null> {
    return getCollection<MongoGlobalVariable>(COLLECTIONS.GLOBAL_VARIABLES).findOne({ userId, key });
  },

  async upsert(userId: string, key: string, data: Partial<MongoGlobalVariable>): Promise<MongoGlobalVariable> {
    const now = new Date();
    const result = await getCollection<MongoGlobalVariable>(COLLECTIONS.GLOBAL_VARIABLES).findOneAndUpdate(
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
    const result = await getCollection<MongoGlobalVariable>(COLLECTIONS.GLOBAL_VARIABLES).deleteOne({ userId, key });
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
