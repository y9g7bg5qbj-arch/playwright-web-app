import { Collection, Document } from 'mongodb';
import { getDb, COLLECTIONS, MongoSandboxFile } from '../../mongodb';
import { v4 as uuidv4 } from 'uuid';

function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

export const sandboxFileRepository = {
  async findBySandboxId(sandboxId: string): Promise<MongoSandboxFile[]> {
    return getCollection<MongoSandboxFile>(COLLECTIONS.SANDBOX_FILES)
      .find({ sandboxId, isDeleted: { $ne: true } })
      .toArray();
  },

  async findBySandboxIdAsMap(sandboxId: string): Promise<Map<string, string>> {
    const files = await this.findBySandboxId(sandboxId);
    const map = new Map<string, string>();
    for (const f of files) {
      map.set(f.filePath, f.content);
    }
    return map;
  },

  async upsert(sandboxId: string, filePath: string, content: string, projectId: string): Promise<MongoSandboxFile> {
    const now = new Date();
    const result = await getCollection<MongoSandboxFile>(COLLECTIONS.SANDBOX_FILES).findOneAndUpdate(
      { sandboxId, filePath },
      {
        $set: { content, isDeleted: false, updatedAt: now },
        $setOnInsert: { id: uuidv4(), sandboxId, projectId, filePath, createdAt: now },
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result!;
  },

  async upsertMany(sandboxId: string, files: Map<string, string>, projectId: string): Promise<void> {
    const now = new Date();
    const ops = Array.from(files.entries()).map(([filePath, content]) => ({
      updateOne: {
        filter: { sandboxId, filePath },
        update: {
          $set: { content, isDeleted: false, updatedAt: now },
          $setOnInsert: { id: uuidv4(), sandboxId, projectId, filePath, createdAt: now },
        },
        upsert: true,
      },
    }));
    if (ops.length > 0) {
      await getCollection<MongoSandboxFile>(COLLECTIONS.SANDBOX_FILES).bulkWrite(ops);
    }
  },

  async softDelete(sandboxId: string, filePath: string): Promise<boolean> {
    const result = await getCollection<MongoSandboxFile>(COLLECTIONS.SANDBOX_FILES)
      .updateOne(
        { sandboxId, filePath },
        { $set: { isDeleted: true, content: '', updatedAt: new Date() } }
      );
    return result.modifiedCount > 0;
  },

  async delete(sandboxId: string, filePath: string): Promise<boolean> {
    const result = await getCollection<MongoSandboxFile>(COLLECTIONS.SANDBOX_FILES)
      .deleteOne({ sandboxId, filePath });
    return result.deletedCount > 0;
  },

  async deleteBySandboxId(sandboxId: string): Promise<number> {
    const result = await getCollection<MongoSandboxFile>(COLLECTIONS.SANDBOX_FILES)
      .deleteMany({ sandboxId });
    return result.deletedCount;
  },
};
