/**
 * MongoDB Test Data Service
 *
 * Provides CRUD operations for test data using MongoDB Atlas.
 * Replaces the Prisma-based test data operations.
 */

import { ObjectId, WithId, Document } from 'mongodb';
import { connectMongoDB, getDb, COLLECTIONS } from '../db/mongodb';

// Types
export interface TestDataSheet {
  id: string;
  applicationId: string;
  name: string;
  pageObject?: string;
  description?: string;
  columns: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestDataRow {
  id: string;
  sheetId: string;
  scenarioId: string;
  data: Record<string, any>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSheetInput {
  applicationId: string;
  name: string;
  pageObject?: string;
  description?: string;
  columns?: Array<{ name: string; type: string; required: boolean }>;
}

export interface UpdateSheetInput {
  name?: string;
  pageObject?: string;
  description?: string;
  columns?: Array<{ name: string; type: string; required: boolean }>;
}

export interface CreateRowInput {
  sheetId: string;
  scenarioId: string;
  data: Record<string, any>;
  enabled?: boolean;
}

export interface UpdateRowInput {
  scenarioId?: string;
  data?: Record<string, any>;
  enabled?: boolean;
}

class MongoDBTestDataService {
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    await connectMongoDB();
    this.initialized = true;
  }

  // ==================== SHEETS ====================

  async getSheets(applicationId: string): Promise<TestDataSheet[]> {
    await this.init();
    const db = getDb();
    const sheets = await db.collection(COLLECTIONS.TEST_DATA_SHEETS)
      .find({ applicationId })
      .sort({ name: 1 })
      .toArray();
    return sheets as unknown as TestDataSheet[];
  }

  async getSheetById(id: string): Promise<TestDataSheet | null> {
    await this.init();
    const db = getDb();
    const sheet = await db.collection(COLLECTIONS.TEST_DATA_SHEETS)
      .findOne({ id });
    return sheet as unknown as TestDataSheet | null;
  }

  async getSheetByName(applicationId: string, name: string): Promise<TestDataSheet | null> {
    await this.init();
    const db = getDb();
    const sheet = await db.collection(COLLECTIONS.TEST_DATA_SHEETS)
      .findOne({ applicationId, name });
    return sheet as unknown as TestDataSheet | null;
  }

  async createSheet(input: CreateSheetInput): Promise<TestDataSheet> {
    await this.init();
    const db = getDb();

    const now = new Date();
    const sheet: TestDataSheet = {
      id: new ObjectId().toString(),
      applicationId: input.applicationId,
      name: input.name,
      pageObject: input.pageObject,
      description: input.description,
      columns: input.columns || [],
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(COLLECTIONS.TEST_DATA_SHEETS).insertOne(sheet as any);
    return sheet;
  }

  async updateSheet(id: string, input: UpdateSheetInput): Promise<TestDataSheet | null> {
    await this.init();
    const db = getDb();

    const updateData: any = { updatedAt: new Date() };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.pageObject !== undefined) updateData.pageObject = input.pageObject;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.columns !== undefined) updateData.columns = input.columns;

    const result = await db.collection(COLLECTIONS.TEST_DATA_SHEETS)
      .findOneAndUpdate(
        { id },
        { $set: updateData },
        { returnDocument: 'after' }
      );

    return result as unknown as TestDataSheet | null;
  }

  async deleteSheet(id: string): Promise<boolean> {
    await this.init();
    const db = getDb();

    // Delete all rows in this sheet first
    await db.collection(COLLECTIONS.TEST_DATA_ROWS).deleteMany({ sheetId: id });

    // Delete the sheet
    const result = await db.collection(COLLECTIONS.TEST_DATA_SHEETS).deleteOne({ id });
    return result.deletedCount > 0;
  }

  // ==================== ROWS ====================

  async getRows(sheetId: string): Promise<TestDataRow[]> {
    await this.init();
    const db = getDb();
    const rows = await db.collection(COLLECTIONS.TEST_DATA_ROWS)
      .find({ sheetId })
      .sort({ scenarioId: 1 })
      .toArray();
    return rows as unknown as TestDataRow[];
  }

  async getRowById(id: string): Promise<TestDataRow | null> {
    await this.init();
    const db = getDb();
    const row = await db.collection(COLLECTIONS.TEST_DATA_ROWS)
      .findOne({ id });
    return row as unknown as TestDataRow | null;
  }

  async getRowByScenarioId(sheetId: string, scenarioId: string): Promise<TestDataRow | null> {
    await this.init();
    const db = getDb();
    const row = await db.collection(COLLECTIONS.TEST_DATA_ROWS)
      .findOne({ sheetId, scenarioId });
    return row as unknown as TestDataRow | null;
  }

  async createRow(input: CreateRowInput): Promise<TestDataRow> {
    await this.init();
    const db = getDb();

    const now = new Date();
    const row: TestDataRow = {
      id: new ObjectId().toString(),
      sheetId: input.sheetId,
      scenarioId: input.scenarioId,
      data: input.data,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(COLLECTIONS.TEST_DATA_ROWS).insertOne(row as any);
    return row;
  }

  async updateRow(id: string, input: UpdateRowInput): Promise<TestDataRow | null> {
    await this.init();
    const db = getDb();

    const updateData: any = { updatedAt: new Date() };
    if (input.scenarioId !== undefined) updateData.scenarioId = input.scenarioId;
    if (input.data !== undefined) updateData.data = input.data;
    if (input.enabled !== undefined) updateData.enabled = input.enabled;

    const result = await db.collection(COLLECTIONS.TEST_DATA_ROWS)
      .findOneAndUpdate(
        { id },
        { $set: updateData },
        { returnDocument: 'after' }
      );

    return result as unknown as TestDataRow | null;
  }

  async deleteRow(id: string): Promise<boolean> {
    await this.init();
    const db = getDb();
    const result = await db.collection(COLLECTIONS.TEST_DATA_ROWS).deleteOne({ id });
    return result.deletedCount > 0;
  }

  async deleteRowsBySheetId(sheetId: string): Promise<number> {
    await this.init();
    const db = getDb();
    const result = await db.collection(COLLECTIONS.TEST_DATA_ROWS).deleteMany({ sheetId });
    return result.deletedCount;
  }

  // ==================== BULK OPERATIONS ====================

  async bulkCreateRows(rows: CreateRowInput[]): Promise<TestDataRow[]> {
    await this.init();
    const db = getDb();

    const now = new Date();
    const newRows: TestDataRow[] = rows.map(input => ({
      id: new ObjectId().toString(),
      sheetId: input.sheetId,
      scenarioId: input.scenarioId,
      data: input.data,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    }));

    if (newRows.length > 0) {
      await db.collection(COLLECTIONS.TEST_DATA_ROWS).insertMany(newRows as any[]);
    }
    return newRows;
  }

  async bulkUpdateRows(updates: Array<{ id: string; input: UpdateRowInput }>): Promise<number> {
    await this.init();
    const db = getDb();

    const bulkOps = updates.map(({ id, input }) => {
      const updateData: any = { updatedAt: new Date() };
      if (input.scenarioId !== undefined) updateData.scenarioId = input.scenarioId;
      if (input.data !== undefined) updateData.data = input.data;
      if (input.enabled !== undefined) updateData.enabled = input.enabled;

      return {
        updateOne: {
          filter: { id },
          update: { $set: updateData }
        }
      };
    });

    if (bulkOps.length > 0) {
      const result = await db.collection(COLLECTIONS.TEST_DATA_ROWS).bulkWrite(bulkOps);
      return result.modifiedCount;
    }
    return 0;
  }

  // ==================== SEARCH & FILTER ====================

  async searchRows(sheetId: string, query: string): Promise<TestDataRow[]> {
    await this.init();
    const db = getDb();

    // Search in scenarioId and data fields
    const rows = await db.collection(COLLECTIONS.TEST_DATA_ROWS)
      .find({
        sheetId,
        $or: [
          { scenarioId: { $regex: query, $options: 'i' } },
          { 'data': { $regex: query, $options: 'i' } }
        ]
      })
      .toArray();

    return rows as unknown as TestDataRow[];
  }

  async getEnabledRows(sheetId: string): Promise<TestDataRow[]> {
    await this.init();
    const db = getDb();
    const rows = await db.collection(COLLECTIONS.TEST_DATA_ROWS)
      .find({ sheetId, enabled: true })
      .sort({ scenarioId: 1 })
      .toArray();
    return rows as unknown as TestDataRow[];
  }

  // ==================== STATISTICS ====================

  async getSheetStats(sheetId: string): Promise<{ totalRows: number; enabledRows: number }> {
    await this.init();
    const db = getDb();

    const [totalRows, enabledRows] = await Promise.all([
      db.collection(COLLECTIONS.TEST_DATA_ROWS).countDocuments({ sheetId }),
      db.collection(COLLECTIONS.TEST_DATA_ROWS).countDocuments({ sheetId, enabled: true })
    ]);

    return { totalRows, enabledRows };
  }

  async getApplicationStats(applicationId: string): Promise<{ totalSheets: number; totalRows: number }> {
    await this.init();
    const db = getDb();

    const sheets = await db.collection(COLLECTIONS.TEST_DATA_SHEETS)
      .find({ applicationId })
      .toArray();

    const sheetIds = sheets.map(s => (s as any).id);
    const totalRows = sheetIds.length > 0
      ? await db.collection(COLLECTIONS.TEST_DATA_ROWS).countDocuments({ sheetId: { $in: sheetIds } })
      : 0;

    return { totalSheets: sheets.length, totalRows };
  }
}

// Export singleton instance
export const mongoTestDataService = new MongoDBTestDataService();
