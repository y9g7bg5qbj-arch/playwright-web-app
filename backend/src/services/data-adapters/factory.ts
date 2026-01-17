/**
 * Data Adapter Factory
 *
 * Creates and manages data adapters based on application configuration.
 * Caches adapters by application ID for efficient reuse.
 */

import { prisma } from '../../db/prisma';
import { DataAdapter, AdapterConfig } from './types';
import { SQLiteAdapter } from './sqlite.adapter';
import { MongoDBAdapter, MongoDBAdapterConfig } from './mongodb.adapter';

// ============================================
// ADAPTER CACHE
// ============================================

const adapterCache = new Map<string, DataAdapter>();

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Get the data adapter for an application.
 * Creates and caches the adapter if not already cached.
 */
export async function getDataAdapter(applicationId: string): Promise<DataAdapter> {
  // Check cache first
  const cached = adapterCache.get(applicationId);
  if (cached && cached.isConnected()) {
    return cached;
  }

  // Get configuration from database
  const config = await prisma.dataStorageConfig.findUnique({
    where: { applicationId },
  });

  // Create appropriate adapter
  let adapter: DataAdapter;

  if (!config || config.provider === 'sqlite') {
    // Default to SQLite
    adapter = new SQLiteAdapter();
  } else {
    adapter = createAdapter(config);
  }

  // Connect and cache
  await adapter.connect();
  adapterCache.set(applicationId, adapter);

  return adapter;
}

/**
 * Create an adapter based on configuration.
 */
function createAdapter(config: {
  provider: string;
  connectionString?: string | null;
  host?: string | null;
  port?: number | null;
  database?: string | null;
  username?: string | null;
  password?: string | null;
  useSSL?: boolean;
  options?: string | null;
}): DataAdapter {
  switch (config.provider) {
    case 'mongodb':
      return createMongoDBAdapter(config);

    case 'postgresql':
      // TODO: Implement PostgreSQL adapter
      throw new Error('PostgreSQL adapter not yet implemented');

    case 'mysql':
      // TODO: Implement MySQL adapter
      throw new Error('MySQL adapter not yet implemented');

    case 'sqlite':
    default:
      return new SQLiteAdapter();
  }
}

/**
 * Create a MongoDB adapter from configuration.
 */
function createMongoDBAdapter(config: {
  connectionString?: string | null;
  host?: string | null;
  port?: number | null;
  database?: string | null;
  username?: string | null;
  password?: string | null;
  useSSL?: boolean;
  options?: string | null;
}): MongoDBAdapter {
  let connectionString: string;

  if (config.connectionString) {
    // Use provided connection string
    connectionString = config.connectionString;
  } else {
    // Build connection string from parts
    const host = config.host || 'localhost';
    const port = config.port || 27017;
    const database = config.database || 'vero_test_data';
    const useSSL = config.useSSL ?? true;

    if (config.username && config.password) {
      const encodedUser = encodeURIComponent(config.username);
      const encodedPass = encodeURIComponent(config.password);
      connectionString = `mongodb://${encodedUser}:${encodedPass}@${host}:${port}/${database}`;
    } else {
      connectionString = `mongodb://${host}:${port}/${database}`;
    }

    if (useSSL) {
      connectionString += '?tls=true';
    }
  }

  // Parse additional options
  let additionalOptions: Record<string, any> = {};
  if (config.options) {
    try {
      additionalOptions = JSON.parse(config.options);
    } catch {
      // Ignore invalid JSON
    }
  }

  const mongoConfig: MongoDBAdapterConfig = {
    connectionString,
    database: config.database || 'vero_test_data',
    options: {
      maxPoolSize: additionalOptions.maxPoolSize || 10,
      minPoolSize: additionalOptions.minPoolSize || 1,
      serverSelectionTimeoutMS: additionalOptions.serverSelectionTimeoutMS || 5000,
      socketTimeoutMS: additionalOptions.socketTimeoutMS || 45000,
      connectTimeoutMS: additionalOptions.connectTimeoutMS || 10000,
    },
  };

  return new MongoDBAdapter(mongoConfig);
}

/**
 * Clear the cached adapter for an application.
 * Call this when configuration changes.
 */
export async function clearAdapterCache(applicationId: string): Promise<void> {
  const adapter = adapterCache.get(applicationId);
  if (adapter) {
    await adapter.disconnect();
    adapterCache.delete(applicationId);
  }
}

/**
 * Clear all cached adapters.
 * Call this on server shutdown.
 */
export async function clearAllAdapters(): Promise<void> {
  const disconnectPromises = Array.from(adapterCache.values()).map(adapter =>
    adapter.disconnect().catch(() => {
      // Ignore disconnect errors during cleanup
    })
  );

  await Promise.all(disconnectPromises);
  adapterCache.clear();
}

/**
 * Test a database connection without caching.
 * Used for the "Test Connection" button in settings UI.
 */
export async function testConnection(config: AdapterConfig): Promise<{
  success: boolean;
  error?: string;
  latency?: number;
  serverInfo?: {
    version?: string;
    platform?: string;
  };
}> {
  let adapter: DataAdapter;

  try {
    switch (config.provider) {
      case 'mongodb':
        adapter = createMongoDBAdapter({
          connectionString: config.connectionString,
          host: config.host,
          port: config.port,
          database: config.database,
          username: config.username,
          password: config.password,
          useSSL: config.useSSL,
          options: config.options ? JSON.stringify(config.options) : undefined,
        });
        break;

      case 'postgresql':
        return {
          success: false,
          error: 'PostgreSQL adapter not yet implemented',
        };

      case 'mysql':
        return {
          success: false,
          error: 'MySQL adapter not yet implemented',
        };

      case 'sqlite':
      default:
        adapter = new SQLiteAdapter();
        break;
    }

    const result = await adapter.testConnection();

    // Clean up test connection
    if (adapter.isConnected()) {
      await adapter.disconnect();
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get the default adapter (SQLite) for system operations.
 */
export function getDefaultAdapter(): DataAdapter {
  return new SQLiteAdapter();
}

// ============================================
// EXPORTS
// ============================================

export default {
  getDataAdapter,
  clearAdapterCache,
  clearAllAdapters,
  testConnection,
  getDefaultAdapter,
};
