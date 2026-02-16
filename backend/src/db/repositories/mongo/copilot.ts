import { Collection, Document } from 'mongodb';
import { getDb, COLLECTIONS, MongoCopilotSession, MongoCopilotExploration, MongoCopilotStagedChange, MongoCopilotLearnedSelector } from '../../mongodb';
import { v4 as uuidv4 } from 'uuid';

function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

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
