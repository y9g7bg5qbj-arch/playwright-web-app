/**
 * Data Adapters
 *
 * Pluggable storage backends for test data management.
 * Allows users to configure MongoDB, PostgreSQL, MySQL, etc.
 */

// Types
export * from './types';

// Adapters
export { SQLiteAdapter } from './sqlite.adapter';
export { MongoDBAdapter, MongoDBAdapterConfig } from './mongodb.adapter';

// Factory
export {
  getDataAdapter,
  clearAdapterCache,
  clearAllAdapters,
  testConnection,
  getDefaultAdapter,
} from './factory';
