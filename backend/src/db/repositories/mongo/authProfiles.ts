import { Collection, Document } from 'mongodb';
import { getDb, COLLECTIONS, MongoAuthProfile } from '../../mongodb';
import { v4 as uuidv4 } from 'uuid';

function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

export const authProfileRepository = {
  async findById(id: string): Promise<MongoAuthProfile | null> {
    return getCollection<MongoAuthProfile>(COLLECTIONS.AUTH_PROFILES).findOne({ id });
  },

  async findByProjectId(projectId: string): Promise<MongoAuthProfile[]> {
    return getCollection<MongoAuthProfile>(COLLECTIONS.AUTH_PROFILES)
      .find({ projectId })
      .sort({ name: 1 })
      .toArray();
  },

  async findByApplicationId(applicationId: string): Promise<MongoAuthProfile[]> {
    return getCollection<MongoAuthProfile>(COLLECTIONS.AUTH_PROFILES)
      .find({ applicationId })
      .sort({ name: 1 })
      .toArray();
  },

  async create(data: Omit<MongoAuthProfile, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoAuthProfile> {
    const now = new Date();
    const profile: MongoAuthProfile = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await getCollection<MongoAuthProfile>(COLLECTIONS.AUTH_PROFILES).insertOne(profile);
    return profile;
  },

  async update(id: string, data: Partial<MongoAuthProfile>): Promise<MongoAuthProfile | null> {
    return getCollection<MongoAuthProfile>(COLLECTIONS.AUTH_PROFILES).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' },
    );
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoAuthProfile>(COLLECTIONS.AUTH_PROFILES).deleteOne({ id });
    return result.deletedCount > 0;
  },
};
