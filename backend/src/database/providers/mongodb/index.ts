/**
 * MongoDB Database Provider (Stub)
 *
 * This is a placeholder implementation showing how to implement
 * MongoDB support when you're ready to migrate from SQLite.
 *
 * MongoDB Multi-tenancy Strategy:
 * - Single database with collections prefixed by projectId, OR
 * - Separate database per project (recommended for enterprise)
 *
 * To implement:
 * 1. Install dependencies: npm install mongodb @typegoose/typegoose mongoose
 * 2. Complete the implementation below
 * 3. Update db.initialize() to use 'mongodb' type
 */

import {
  IDatabaseProvider,
  ICatalogDatabaseContext,
  IProjectDatabaseContext,
  DatabaseConfig,
  DatabaseProviderType,
  IUserRepository,
  IProjectRepository,
  IExecutionRepository,
  IScheduleRepository,
  ITestDataSheetRepository,
  ITestDataRowRepository,
  IWorkflowRepository,
  ITestFlowRepository,
  IGlobalVariableRepository,
  IWorkflowVariableRepository,
  IEnvironmentRepository,
} from '../../interfaces';

// Uncomment when implementing:
// import { MongoClient, Db, Collection } from 'mongodb';

/**
 * MongoDB connection configuration
 */
interface MongoConfig {
  uri: string;
  databaseName: string;
  projectsPrefix?: string; // Default: 'project_'
}

/**
 * MongoDB Provider (Stub Implementation)
 *
 * Replace this with actual MongoDB implementation when ready.
 */
export class MongoDBProvider implements IDatabaseProvider {
  readonly type: DatabaseProviderType = 'mongodb';

  private config: MongoConfig | null = null;
  // private client: MongoClient | null = null;
  // private catalogDb: Db | null = null;
  // private projectConnections: Map<string, Db> = new Map();

  async initialize(config: DatabaseConfig): Promise<void> {
    if (!config.mongoUri) {
      throw new Error('MongoDB URI is required');
    }

    this.config = {
      uri: config.mongoUri,
      databaseName: config.mongoDatabaseName || 'vero_catalog',
      projectsPrefix: 'vero_project_',
    };

    // TODO: Implement actual connection
    // this.client = new MongoClient(this.config.uri);
    // await this.client.connect();
    // this.catalogDb = this.client.db(this.config.databaseName);

    throw new Error('MongoDB provider not yet implemented. See comments in this file for guidance.');
  }

  getCatalogContext(): ICatalogDatabaseContext {
    throw new Error('MongoDB provider not yet implemented');
  }

  async getProjectContext(projectId: string): Promise<IProjectDatabaseContext> {
    throw new Error('MongoDB provider not yet implemented');
  }

  async createProjectDatabase(projectId: string): Promise<void> {
    // MongoDB: Create database by simply using it
    // const projectDbName = `${this.config?.projectsPrefix}${projectId}`;
    // const projectDb = this.client?.db(projectDbName);
    // Create indexes for collections
    throw new Error('MongoDB provider not yet implemented');
  }

  async deleteProjectDatabase(projectId: string): Promise<void> {
    // const projectDbName = `${this.config?.projectsPrefix}${projectId}`;
    // await this.client?.db(projectDbName).dropDatabase();
    throw new Error('MongoDB provider not yet implemented');
  }

  async cloneProjectDatabase(sourceProjectId: string, targetProjectId: string): Promise<void> {
    // MongoDB doesn't have native clone, need to copy documents
    // Use aggregation with $out or manual copy
    throw new Error('MongoDB provider not yet implemented');
  }

  async exportProjectDatabase(projectId: string, outputPath: string): Promise<void> {
    // Use mongodump or export documents to JSON
    throw new Error('MongoDB provider not yet implemented');
  }

  async importProjectDatabase(projectId: string, inputPath: string): Promise<void> {
    // Use mongorestore or import from JSON
    throw new Error('MongoDB provider not yet implemented');
  }

  async releaseProjectContext(projectId: string): Promise<void> {
    // this.projectConnections.delete(projectId);
  }

  getActiveConnections(): number {
    return 0; // this.projectConnections.size;
  }

  async shutdown(): Promise<void> {
    // await this.client?.close();
    // this.client = null;
    // this.catalogDb = null;
    // this.projectConnections.clear();
  }
}

/**
 * Example MongoDB Repository Implementation
 *
 * This shows the pattern for implementing repositories with MongoDB.
 * Copy and adapt for each entity type.
 */
/*
class MongoUserRepository implements IUserRepository {
  constructor(private collection: Collection) {}

  async findById(id: string): Promise<IUser | null> {
    const doc = await this.collection.findOne({ _id: id });
    return doc ? this.mapDocument(doc) : null;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const doc = await this.collection.findOne({ email });
    return doc ? this.mapDocument(doc) : null;
  }

  async create(data: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUser> {
    const now = new Date();
    const doc = {
      _id: generateUUID(), // Use uuid or MongoDB ObjectId
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await this.collection.insertOne(doc);
    return this.mapDocument(doc);
  }

  async update(id: string, data: Partial<IUser>): Promise<IUser> {
    const updateDoc = {
      $set: { ...data, updatedAt: new Date() },
    };
    await this.collection.updateOne({ _id: id }, updateDoc);
    return this.findById(id) as Promise<IUser>;
  }

  async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ _id: id });
  }

  // ... implement other methods

  private mapDocument(doc: any): IUser {
    return {
      id: doc._id,
      email: doc.email,
      passwordHash: doc.passwordHash,
      name: doc.name,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
*/

/**
 * MongoDB Collection Indexes
 *
 * Create these indexes for optimal performance:
 */
/*
const CATALOG_INDEXES = {
  users: [
    { key: { email: 1 }, unique: true },
  ],
  projects: [
    { key: { userId: 1 } },
    { key: { userId: 1, name: 1 }, unique: true },
  ],
  executions: [
    { key: { projectId: 1 } },
    { key: { status: 1 } },
    { key: { createdAt: -1 } },
  ],
  schedules: [
    { key: { projectId: 1 } },
    { key: { webhookToken: 1 }, unique: true, sparse: true },
    { key: { isActive: 1, nextRunAt: 1 } },
  ],
};

const PROJECT_INDEXES = {
  testDataSheets: [
    { key: { name: 1 }, unique: true },
  ],
  testDataRows: [
    { key: { sheetId: 1 } },
    { key: { sheetId: 1, scenarioId: 1 }, unique: true },
  ],
  workflows: [
    { key: { name: 1 }, unique: true },
  ],
  testFlows: [
    { key: { workflowId: 1 } },
  ],
  globalVariables: [
    { key: { key: 1 }, unique: true },
  ],
  workflowVariables: [
    { key: { workflowId: 1 } },
    { key: { workflowId: 1, key: 1 }, unique: true },
  ],
  environments: [
    { key: { name: 1 }, unique: true },
    { key: { isActive: 1 } },
  ],
};
*/

export function createMongoDBProvider(): IDatabaseProvider {
  return new MongoDBProvider();
}
