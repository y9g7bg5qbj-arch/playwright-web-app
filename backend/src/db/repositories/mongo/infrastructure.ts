import { Collection, Document } from 'mongodb';
import { getDb, COLLECTIONS, MongoDataStorageConfig } from '../../mongodb';
import { v4 as uuidv4 } from 'uuid';

function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

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
