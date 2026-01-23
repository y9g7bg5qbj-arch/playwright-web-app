/**
 * Settings Service
 *
 * Manages application settings including database configuration.
 * Settings are stored in MongoDB and can be updated from the UI.
 */

import { getDb, COLLECTIONS } from '../db/mongodb';
import { Collection, ObjectId } from 'mongodb';

// Settings document interface
export interface MongoSettings {
  _id?: ObjectId;
  key: string;
  value: any;
  description?: string;
  category: 'database' | 'general' | 'ai' | 'execution';
  updatedAt: Date;
  createdAt: Date;
}

// Database configuration interface
export interface DatabaseConfig {
  provider: 'mongodb';
  uri: string;
  database: string;
  isConfigured: boolean;
  lastTestedAt?: Date;
  lastError?: string;
}

// Default settings
const DEFAULT_SETTINGS: Omit<MongoSettings, '_id' | 'createdAt' | 'updatedAt'>[] = [
  {
    key: 'database.config',
    value: {
      provider: 'mongodb',
      uri: process.env.MONGODB_URI || '',
      database: process.env.MONGODB_DATABASE || 'vero_ide',
      isConfigured: !!process.env.MONGODB_URI
    } as DatabaseConfig,
    description: 'MongoDB connection configuration',
    category: 'database'
  },
  {
    key: 'general.appName',
    value: 'Vero IDE',
    description: 'Application display name',
    category: 'general'
  },
  {
    key: 'execution.defaultTimeout',
    value: 30000,
    description: 'Default test execution timeout in milliseconds',
    category: 'execution'
  },
  {
    key: 'execution.defaultBrowser',
    value: 'chromium',
    description: 'Default browser for test execution',
    category: 'execution'
  }
];

/**
 * Get the settings collection
 */
function getSettingsCollection(): Collection<MongoSettings> {
  return getDb().collection<MongoSettings>(COLLECTIONS.SETTINGS);
}

/**
 * Initialize default settings if they don't exist
 */
export async function initializeSettings(): Promise<void> {
  const collection = getSettingsCollection();
  const now = new Date();

  for (const setting of DEFAULT_SETTINGS) {
    const exists = await collection.findOne({ key: setting.key });
    if (!exists) {
      await collection.insertOne({
        ...setting,
        createdAt: now,
        updatedAt: now
      });
    }
  }

  console.log('[Settings] Initialized default settings');
}

/**
 * Get a setting by key
 */
export async function getSetting<T = any>(key: string): Promise<T | null> {
  const collection = getSettingsCollection();
  const setting = await collection.findOne({ key });
  return setting?.value as T || null;
}

/**
 * Set a setting value
 */
export async function setSetting(key: string, value: any, description?: string): Promise<void> {
  const collection = getSettingsCollection();
  const now = new Date();

  await collection.updateOne(
    { key },
    {
      $set: {
        value,
        ...(description && { description }),
        updatedAt: now
      },
      $setOnInsert: {
        key,
        category: getCategoryFromKey(key),
        createdAt: now
      }
    },
    { upsert: true }
  );
}

/**
 * Get all settings
 */
export async function getAllSettings(): Promise<MongoSettings[]> {
  const collection = getSettingsCollection();
  return collection.find().toArray();
}

/**
 * Get settings by category
 */
export async function getSettingsByCategory(category: MongoSettings['category']): Promise<MongoSettings[]> {
  const collection = getSettingsCollection();
  return collection.find({ category }).toArray();
}

/**
 * Delete a setting
 */
export async function deleteSetting(key: string): Promise<boolean> {
  const collection = getSettingsCollection();
  const result = await collection.deleteOne({ key });
  return result.deletedCount > 0;
}

/**
 * Get database configuration
 */
export async function getDatabaseConfig(): Promise<DatabaseConfig> {
  const config = await getSetting<DatabaseConfig>('database.config');
  return config || {
    provider: 'mongodb',
    uri: process.env.MONGODB_URI || '',
    database: process.env.MONGODB_DATABASE || 'vero_ide',
    isConfigured: !!process.env.MONGODB_URI
  };
}

/**
 * Update database configuration
 */
export async function updateDatabaseConfig(config: Partial<DatabaseConfig>): Promise<void> {
  const currentConfig = await getDatabaseConfig();
  await setSetting('database.config', {
    ...currentConfig,
    ...config,
    isConfigured: true
  });
}

/**
 * Test database connection
 */
export async function testDatabaseConnection(uri: string, database: string): Promise<{ success: boolean; error?: string }> {
  const { MongoClient } = await import('mongodb');

  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(database);

    // Test with a simple operation
    await db.command({ ping: 1 });

    await client.close();

    // Update the last tested timestamp
    const config = await getDatabaseConfig();
    await setSetting('database.config', {
      ...config,
      uri,
      database,
      lastTestedAt: new Date(),
      lastError: undefined
    });

    return { success: true };
  } catch (error: any) {
    // Store the error
    const config = await getDatabaseConfig();
    await setSetting('database.config', {
      ...config,
      lastTestedAt: new Date(),
      lastError: error.message
    });

    return { success: false, error: error.message };
  }
}

/**
 * Helper to determine category from key
 */
function getCategoryFromKey(key: string): MongoSettings['category'] {
  if (key.startsWith('database.')) return 'database';
  if (key.startsWith('ai.')) return 'ai';
  if (key.startsWith('execution.')) return 'execution';
  return 'general';
}

// Export the service
export const settingsService = {
  initializeSettings,
  getSetting,
  setSetting,
  getAllSettings,
  getSettingsByCategory,
  deleteSetting,
  getDatabaseConfig,
  updateDatabaseConfig,
  testDatabaseConnection
};

export default settingsService;
