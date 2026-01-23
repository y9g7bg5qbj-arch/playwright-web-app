/**
 * Data Migration Service
 *
 * Handles exporting and importing data between MongoDB databases.
 * Useful when switching from personal DB to enterprise DB.
 */

import { MongoClient, Db } from 'mongodb';
import { getDb, COLLECTIONS } from '../db/mongodb';

// Collections to migrate
const MIGRATABLE_COLLECTIONS = [
  COLLECTIONS.APPLICATIONS,
  COLLECTIONS.PROJECTS,
  COLLECTIONS.TEST_DATA_SHEETS,
  COLLECTIONS.TEST_DATA_ROWS,
  COLLECTIONS.ENVIRONMENTS,
  COLLECTIONS.GLOBAL_VARIABLES,
  COLLECTIONS.VERO_FILES,
  COLLECTIONS.SETTINGS,
] as const;

// Export format
export interface ExportData {
  version: string;
  exportedAt: string;
  sourceDatabase: string;
  collections: {
    [key: string]: any[];
  };
  metadata: {
    totalDocuments: number;
    collectionCounts: { [key: string]: number };
  };
}

// Migration result
export interface MigrationResult {
  success: boolean;
  imported: { [key: string]: number };
  errors: string[];
  warnings: string[];
}

/**
 * Export all data from current MongoDB database
 */
export async function exportData(): Promise<ExportData> {
  const db = getDb();
  const collections: { [key: string]: any[] } = {};
  const collectionCounts: { [key: string]: number } = {};
  let totalDocuments = 0;

  for (const collectionName of MIGRATABLE_COLLECTIONS) {
    try {
      const docs = await db.collection(collectionName).find({}).toArray();
      collections[collectionName] = docs;
      collectionCounts[collectionName] = docs.length;
      totalDocuments += docs.length;
      console.log(`[Migration] Exported ${docs.length} documents from ${collectionName}`);
    } catch (error) {
      console.warn(`[Migration] Failed to export ${collectionName}:`, error);
      collections[collectionName] = [];
      collectionCounts[collectionName] = 0;
    }
  }

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    sourceDatabase: db.databaseName,
    collections,
    metadata: {
      totalDocuments,
      collectionCounts
    }
  };
}

/**
 * Import data into a target MongoDB database
 */
export async function importData(
  targetUri: string,
  targetDatabase: string,
  data: ExportData,
  options: {
    overwrite?: boolean;  // If true, clears existing data before import
    merge?: boolean;      // If true, adds to existing data (may cause duplicates)
  } = {}
): Promise<MigrationResult> {
  const { overwrite = false, merge = false } = options;
  const result: MigrationResult = {
    success: true,
    imported: {},
    errors: [],
    warnings: []
  };

  let client: MongoClient | null = null;

  try {
    // Connect to target database
    client = new MongoClient(targetUri);
    await client.connect();
    const targetDb = client.db(targetDatabase);

    console.log(`[Migration] Connected to target database: ${targetDatabase}`);

    for (const collectionName of MIGRATABLE_COLLECTIONS) {
      const docs = data.collections[collectionName] || [];

      if (docs.length === 0) {
        result.warnings.push(`No documents to import for ${collectionName}`);
        continue;
      }

      try {
        const collection = targetDb.collection(collectionName);

        // Handle overwrite mode
        if (overwrite) {
          await collection.deleteMany({});
          console.log(`[Migration] Cleared existing data from ${collectionName}`);
        }

        // Check for duplicates if not merging
        if (!merge && !overwrite) {
          const existingCount = await collection.countDocuments({});
          if (existingCount > 0) {
            result.warnings.push(
              `${collectionName} already has ${existingCount} documents. Use overwrite or merge option.`
            );
            continue;
          }
        }

        // Remove MongoDB _id fields to avoid conflicts
        const cleanDocs = docs.map(doc => {
          const { _id, ...rest } = doc;
          return rest;
        });

        // Insert documents
        const insertResult = await collection.insertMany(cleanDocs);
        result.imported[collectionName] = insertResult.insertedCount;
        console.log(`[Migration] Imported ${insertResult.insertedCount} documents to ${collectionName}`);

      } catch (error: any) {
        result.errors.push(`Failed to import ${collectionName}: ${error.message}`);
        result.success = false;
      }
    }

  } catch (error: any) {
    result.errors.push(`Connection failed: ${error.message}`);
    result.success = false;
  } finally {
    if (client) {
      await client.close();
    }
  }

  return result;
}

/**
 * Copy data from current database to a target database
 */
export async function copyToDatabase(
  targetUri: string,
  targetDatabase: string,
  options: {
    overwrite?: boolean;
    merge?: boolean;
  } = {}
): Promise<MigrationResult> {
  console.log('[Migration] Starting database copy...');

  // Export from current
  const data = await exportData();
  console.log(`[Migration] Exported ${data.metadata.totalDocuments} total documents`);

  // Import to target
  const result = await importData(targetUri, targetDatabase, data, options);

  if (result.success) {
    console.log('[Migration] Database copy completed successfully');
  } else {
    console.error('[Migration] Database copy completed with errors:', result.errors);
  }

  return result;
}

/**
 * Validate export data format
 */
export function validateExportData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Invalid export data: must be an object');
    return { valid: false, errors };
  }

  if (!data.version) {
    errors.push('Missing version field');
  }

  if (!data.exportedAt) {
    errors.push('Missing exportedAt field');
  }

  if (!data.collections || typeof data.collections !== 'object') {
    errors.push('Missing or invalid collections field');
  }

  if (!data.metadata) {
    errors.push('Missing metadata field');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get migration status/info for current database
 */
export async function getMigrationInfo(): Promise<{
  database: string;
  collections: { name: string; count: number }[];
  totalDocuments: number;
}> {
  const db = getDb();
  const collections: { name: string; count: number }[] = [];
  let totalDocuments = 0;

  for (const collectionName of MIGRATABLE_COLLECTIONS) {
    try {
      const count = await db.collection(collectionName).countDocuments({});
      collections.push({ name: collectionName, count });
      totalDocuments += count;
    } catch {
      collections.push({ name: collectionName, count: 0 });
    }
  }

  return {
    database: db.databaseName,
    collections,
    totalDocuments
  };
}

// Export the service
export const dataMigrationService = {
  exportData,
  importData,
  copyToDatabase,
  validateExportData,
  getMigrationInfo
};

export default dataMigrationService;
