import { Collection, Document } from 'mongodb';
import { getDb, COLLECTIONS, MongoDataTable, MongoDataRow } from '../../mongodb';
import { v4 as uuidv4 } from 'uuid';

function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

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
