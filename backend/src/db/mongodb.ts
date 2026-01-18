/**
 * MongoDB Connection for Vero Test Data
 *
 * Uses MongoDB Atlas for test data storage while keeping
 * Prisma/SQLite for other application data.
 */

import { MongoClient, Db, Collection } from 'mongodb';

// MongoDB Atlas connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mikerejp_db_user:YjQGbSExl0J8TzNm@cluster0.tw7ocqu.mongodb.net/?appName=Cluster0';
const DATABASE_NAME = process.env.MONGODB_DATABASE || 'vero_ide';

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Connect to MongoDB Atlas
 */
export async function connectMongoDB(): Promise<Db> {
  if (db) return db;

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DATABASE_NAME);
    console.log('✅ Connected to MongoDB Atlas');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Get the MongoDB database instance
 */
export function getDb(): Db {
  if (!db) {
    throw new Error('MongoDB not connected. Call connectMongoDB() first.');
  }
  return db;
}

/**
 * Get a typed collection
 */
export function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

/**
 * Close MongoDB connection
 */
export async function closeMongoDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}

// Collection names
export const COLLECTIONS = {
  TEST_DATA_SHEETS: 'test_data_sheets',
  TEST_DATA_ROWS: 'test_data_rows',
  PROJECTS: 'projects',
  APPLICATIONS: 'applications',
  ENVIRONMENTS: 'environments',
  GLOBAL_VARIABLES: 'global_variables',
} as const;

// TypeScript interfaces for MongoDB documents
export interface MongoTestDataSheet {
  _id?: string;
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

export interface MongoTestDataRow {
  _id?: string;
  id: string;
  sheetId: string;
  scenarioId: string;
  data: Record<string, any>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoProject {
  _id?: string;
  id: string;
  applicationId: string;
  name: string;
  description?: string;
  veroPath?: string;
  gitInitialized: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoApplication {
  _id?: string;
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
