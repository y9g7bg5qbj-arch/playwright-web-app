/**
 * MongoDB Data Adapter
 *
 * Implements the DataAdapter interface for MongoDB storage.
 * Uses the official MongoDB Node.js driver with connection pooling.
 */

import { MongoClient, Db, Collection, ObjectId, Document } from 'mongodb';
import {
  DataAdapter,
  TestDataSheet,
  TestDataSheetCreate,
  TestDataSheetUpdate,
  TestDataRow,
  TestDataRowCreate,
  TestDataRowUpdate,
  QueryOptions,
  QueryResult,
  ConnectionTestResult,
  ColumnDefinition,
} from './types';

// ============================================
// CONFIGURATION
// ============================================

export interface MongoDBAdapterConfig {
  connectionString: string;
  database: string;
  options?: {
    maxPoolSize?: number;
    minPoolSize?: number;
    serverSelectionTimeoutMS?: number;
    socketTimeoutMS?: number;
    connectTimeoutMS?: number;
  };
}

// ============================================
// MONGODB DOCUMENT TYPES
// ============================================

interface SheetDocument extends Document {
  _id: ObjectId;
  applicationId: string;
  name: string;
  pageObject?: string;
  description?: string;
  columns: ColumnDefinition[];
  createdAt: Date;
  updatedAt: Date;
}

interface RowDocument extends Document {
  _id: ObjectId;
  sheetId: string;
  scenarioId: string;
  data: Record<string, any>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// MONGODB ADAPTER
// ============================================

export class MongoDBAdapter implements DataAdapter {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private config: MongoDBAdapterConfig;
  private connected = false;

  // Collection names
  private readonly SHEETS_COLLECTION = 'test_data_sheets';
  private readonly ROWS_COLLECTION = 'test_data_rows';

  constructor(config: MongoDBAdapterConfig) {
    this.config = config;
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  async connect(): Promise<void> {
    if (this.connected && this.client) {
      return;
    }

    this.client = new MongoClient(this.config.connectionString, {
      maxPoolSize: this.config.options?.maxPoolSize || 10,
      minPoolSize: this.config.options?.minPoolSize || 1,
      serverSelectionTimeoutMS: this.config.options?.serverSelectionTimeoutMS || 5000,
      socketTimeoutMS: this.config.options?.socketTimeoutMS || 45000,
      connectTimeoutMS: this.config.options?.connectTimeoutMS || 10000,
    });

    await this.client.connect();
    this.db = this.client.db(this.config.database);
    this.connected = true;

    // Ensure indexes exist
    await this.ensureIndexes();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.connected = false;
    }
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      const tempClient = new MongoClient(this.config.connectionString, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });

      await tempClient.connect();
      const adminDb = tempClient.db('admin');
      const serverInfo = await adminDb.command({ buildInfo: 1 });
      await tempClient.close();

      return {
        success: true,
        latency: Date.now() - startTime,
        serverInfo: {
          version: serverInfo.version,
          platform: serverInfo.buildEnvironment?.distmod,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      };
    }
  }

  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async ensureIndexes(): Promise<void> {
    if (!this.db) return;

    const sheets = this.db.collection(this.SHEETS_COLLECTION);
    const rows = this.db.collection(this.ROWS_COLLECTION);

    // Sheets indexes
    await sheets.createIndex({ applicationId: 1 });
    await sheets.createIndex(
      { applicationId: 1, name: 1 },
      { unique: true }
    );

    // Rows indexes
    await rows.createIndex({ sheetId: 1 });
    await rows.createIndex(
      { sheetId: 1, scenarioId: 1 },
      { unique: true }
    );
    await rows.createIndex({ scenarioId: 1 });
  }

  private getCollection<T extends Document>(name: string): Collection<T> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db.collection<T>(name);
  }

  private removeUndefinedValues(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }

  private toObjectId(id: string): ObjectId {
    try {
      return new ObjectId(id);
    } catch {
      // If not a valid ObjectId, create a new one
      return new ObjectId();
    }
  }

  private sheetFromDoc(doc: SheetDocument | null): TestDataSheet | null {
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      applicationId: doc.applicationId,
      name: doc.name,
      pageObject: doc.pageObject,
      description: doc.description,
      columns: doc.columns || [],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private rowFromDoc(doc: RowDocument | null): TestDataRow | null {
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      sheetId: doc.sheetId,
      scenarioId: doc.scenarioId,
      data: doc.data || {},
      enabled: doc.enabled ?? true,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  // ============================================
  // SHEET OPERATIONS
  // ============================================

  async createSheet(sheet: TestDataSheetCreate): Promise<TestDataSheet> {
    const collection = this.getCollection<SheetDocument>(this.SHEETS_COLLECTION);
    const now = new Date();

    const doc: Omit<SheetDocument, '_id'> = {
      applicationId: sheet.applicationId,
      name: sheet.name,
      pageObject: sheet.pageObject,
      description: sheet.description,
      columns: sheet.columns || [],
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(doc as SheetDocument);

    return {
      id: result.insertedId.toString(),
      applicationId: doc.applicationId,
      name: doc.name,
      pageObject: doc.pageObject,
      description: doc.description,
      columns: doc.columns,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async getSheet(id: string): Promise<TestDataSheet | null> {
    const collection = this.getCollection<SheetDocument>(this.SHEETS_COLLECTION);

    try {
      const doc = await collection.findOne({ _id: this.toObjectId(id) });
      return this.sheetFromDoc(doc);
    } catch {
      return null;
    }
  }

  async getSheetByName(applicationId: string, name: string): Promise<TestDataSheet | null> {
    const collection = this.getCollection<SheetDocument>(this.SHEETS_COLLECTION);
    const doc = await collection.findOne({ applicationId, name });
    return this.sheetFromDoc(doc);
  }

  async getAllSheets(applicationId: string): Promise<TestDataSheet[]> {
    const collection = this.getCollection<SheetDocument>(this.SHEETS_COLLECTION);
    const docs = await collection
      .find({ applicationId })
      .sort({ name: 1 })
      .toArray();

    return docs.map(doc => this.sheetFromDoc(doc)!);
  }

  async updateSheet(id: string, data: TestDataSheetUpdate): Promise<TestDataSheet> {
    const collection = this.getCollection<SheetDocument>(this.SHEETS_COLLECTION);

    const updateData = this.removeUndefinedValues({ ...data, updatedAt: new Date() });

    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new Error(`Sheet not found: ${id}`);
    }

    return this.sheetFromDoc(result)!;
  }

  async deleteSheet(id: string): Promise<void> {
    const sheetsCollection = this.getCollection<SheetDocument>(this.SHEETS_COLLECTION);
    const rowsCollection = this.getCollection<RowDocument>(this.ROWS_COLLECTION);

    // Delete all rows first
    await rowsCollection.deleteMany({ sheetId: id });

    // Delete the sheet
    await sheetsCollection.deleteOne({ _id: this.toObjectId(id) });
  }

  // ============================================
  // ROW OPERATIONS
  // ============================================

  async createRow(row: TestDataRowCreate): Promise<TestDataRow> {
    const collection = this.getCollection<RowDocument>(this.ROWS_COLLECTION);
    const now = new Date();

    const doc: Omit<RowDocument, '_id'> = {
      sheetId: row.sheetId,
      scenarioId: row.scenarioId,
      data: row.data || {},
      enabled: row.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(doc as RowDocument);

    return {
      id: result.insertedId.toString(),
      sheetId: doc.sheetId,
      scenarioId: doc.scenarioId,
      data: doc.data,
      enabled: doc.enabled,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async getRow(id: string): Promise<TestDataRow | null> {
    const collection = this.getCollection<RowDocument>(this.ROWS_COLLECTION);

    try {
      const doc = await collection.findOne({ _id: this.toObjectId(id) });
      return this.rowFromDoc(doc);
    } catch {
      return null;
    }
  }

  async getRows(sheetId: string): Promise<TestDataRow[]> {
    const collection = this.getCollection<RowDocument>(this.ROWS_COLLECTION);
    const docs = await collection.find({ sheetId }).toArray();
    return docs.map(doc => this.rowFromDoc(doc)!);
  }

  async updateRow(id: string, data: TestDataRowUpdate): Promise<TestDataRow> {
    const collection = this.getCollection<RowDocument>(this.ROWS_COLLECTION);

    const updateData = this.removeUndefinedValues({ ...data, updatedAt: new Date() });

    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new Error(`Row not found: ${id}`);
    }

    return this.rowFromDoc(result)!;
  }

  async deleteRow(id: string): Promise<void> {
    const collection = this.getCollection<RowDocument>(this.ROWS_COLLECTION);
    await collection.deleteOne({ _id: this.toObjectId(id) });
  }

  async bulkCreateRows(
    sheetId: string,
    rows: Array<Omit<TestDataRowCreate, 'sheetId'>>
  ): Promise<TestDataRow[]> {
    if (rows.length === 0) return [];

    const collection = this.getCollection<RowDocument>(this.ROWS_COLLECTION);
    const now = new Date();

    const docs: Array<Omit<RowDocument, '_id'>> = rows.map(row => ({
      sheetId,
      scenarioId: row.scenarioId,
      data: row.data || {},
      enabled: row.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    }));

    const result = await collection.insertMany(docs as RowDocument[]);

    return docs.map((doc, index) => ({
      id: result.insertedIds[index].toString(),
      sheetId: doc.sheetId,
      scenarioId: doc.scenarioId,
      data: doc.data,
      enabled: doc.enabled,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  async bulkDeleteRows(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const collection = this.getCollection<RowDocument>(this.ROWS_COLLECTION);
    const objectIds = ids.map(id => this.toObjectId(id));
    await collection.deleteMany({ _id: { $in: objectIds } });
  }

  async bulkUpdateRows(
    updates: Array<{ id: string; data: TestDataRowUpdate }>
  ): Promise<TestDataRow[]> {
    if (updates.length === 0) return [];

    const collection = this.getCollection<RowDocument>(this.ROWS_COLLECTION);
    const now = new Date();
    const results: TestDataRow[] = [];

    // Use bulkWrite for efficiency
    const operations = updates.map(update => ({
      updateOne: {
        filter: { _id: this.toObjectId(update.id) },
        update: {
          $set: {
            ...update.data,
            updatedAt: now,
          },
        },
      },
    }));

    await collection.bulkWrite(operations);

    // Fetch updated documents
    for (const update of updates) {
      const doc = await collection.findOne({ _id: this.toObjectId(update.id) });
      if (doc) {
        results.push(this.rowFromDoc(doc)!);
      }
    }

    return results;
  }

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  async queryRows(sheetId: string, options: QueryOptions): Promise<QueryResult<TestDataRow>> {
    const collection = this.getCollection<RowDocument>(this.ROWS_COLLECTION);

    // Build query
    const query: Record<string, any> = { sheetId };

    // Apply filters
    if (options.filter) {
      for (const [key, value] of Object.entries(options.filter)) {
        if (key === 'scenarioId') {
          query.scenarioId = value;
        } else if (key === 'enabled') {
          query.enabled = value;
        } else {
          // Filter on data fields
          query[`data.${key}`] = value;
        }
      }
    }

    // Apply text search
    if (options.search) {
      const searchRegex = { $regex: options.search, $options: 'i' };
      const searchFields = options.searchFields || ['scenarioId'];

      query.$or = searchFields.map(field => {
        if (field === 'scenarioId') {
          return { scenarioId: searchRegex };
        }
        return { [`data.${field}`]: searchRegex };
      });
    }

    // Get total count
    const total = await collection.countDocuments(query);

    // Build cursor with sort
    let cursor = collection.find(query);

    if (options.sort && options.sort.length > 0) {
      const sortObj: Record<string, 1 | -1> = {};
      for (const sort of options.sort) {
        const field = sort.field === 'scenarioId' ? 'scenarioId' : `data.${sort.field}`;
        sortObj[field] = sort.direction === 'asc' ? 1 : -1;
      }
      cursor = cursor.sort(sortObj);
    } else {
      // Default sort by scenarioId
      cursor = cursor.sort({ scenarioId: 1 });
    }

    // Pagination
    const skip = options.skip || 0;
    const limit = options.limit || 100;

    if (skip > 0) cursor = cursor.skip(skip);
    cursor = cursor.limit(limit);

    const docs = await cursor.toArray();

    return {
      rows: docs.map(doc => this.rowFromDoc(doc)!),
      total,
      skip,
      limit,
    };
  }

  // ============================================
  // REFERENCE RESOLUTION
  // ============================================

  async resolveReferences(
    sheetId: string,
    rowId: string,
    columns: string[]
  ): Promise<Record<string, any[]>> {
    const sheet = await this.getSheet(sheetId);
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetId}`);
    }

    const row = await this.getRow(rowId);
    if (!row) {
      throw new Error(`Row not found: ${rowId}`);
    }

    const results: Record<string, any[]> = {};

    for (const colName of columns) {
      const column = sheet.columns.find(c => c.name === colName);
      if (!column?.referenceConfig) {
        results[colName] = [];
        continue;
      }

      const value = row.data[colName];
      if (!value) {
        results[colName] = [];
        continue;
      }

      // Parse IDs
      const separator = column.referenceConfig.separator || ',';
      const ids = String(value)
        .split(separator)
        .map(id => id.trim())
        .filter(Boolean);

      if (ids.length === 0) {
        results[colName] = [];
        continue;
      }

      // Get target sheet
      const targetSheet = await this.getSheetByName(
        sheet.applicationId,
        column.referenceConfig.targetSheet
      );

      if (!targetSheet) {
        results[colName] = [];
        continue;
      }

      // Get all rows from target sheet
      const targetRows = await this.getRows(targetSheet.id);

      // Filter to matched rows
      const targetColumn = column.referenceConfig.targetColumn;
      const matchedRows = targetRows.filter(r =>
        ids.includes(String(r.data[targetColumn]))
      );

      results[colName] = matchedRows.map(r => r.data);
    }

    return results;
  }

  async expandRows(
    sheetId: string,
    rowIds: string[],
    columns: string[]
  ): Promise<Map<string, Record<string, any[]>>> {
    const results = new Map<string, Record<string, any[]>>();

    // Process in parallel for better performance
    await Promise.all(
      rowIds.map(async rowId => {
        const resolved = await this.resolveReferences(sheetId, rowId, columns);
        results.set(rowId, resolved);
      })
    );

    return results;
  }
}

export default MongoDBAdapter;
