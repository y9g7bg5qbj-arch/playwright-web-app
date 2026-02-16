import { Collection, Document } from 'mongodb';
import { getDb, COLLECTIONS, MongoRecordingSession, MongoRecordingStep, MongoAgent } from '../../mongodb';
import { v4 as uuidv4 } from 'uuid';

function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

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
