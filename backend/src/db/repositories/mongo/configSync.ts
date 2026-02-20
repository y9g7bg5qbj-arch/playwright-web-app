import { Collection, Document } from 'mongodb';
import { getDb, COLLECTIONS, MongoConfigSyncState } from '../../mongodb';
import { v4 as uuidv4 } from 'uuid';

function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

export const configSyncStateRepository = {
  async findByProjectId(projectId: string): Promise<MongoConfigSyncState | null> {
    return getCollection<MongoConfigSyncState>(COLLECTIONS.CONFIG_SYNC_STATE).findOne({ projectId });
  },

  async upsert(projectId: string, data: Partial<MongoConfigSyncState>): Promise<MongoConfigSyncState> {
    const result = await getCollection<MongoConfigSyncState>(COLLECTIONS.CONFIG_SYNC_STATE).findOneAndUpdate(
      { projectId },
      {
        $set: { ...data, lastSyncedAt: new Date() },
        $setOnInsert: { id: uuidv4(), projectId },
      },
      { upsert: true, returnDocument: 'after' },
    );
    return result!;
  },

};
