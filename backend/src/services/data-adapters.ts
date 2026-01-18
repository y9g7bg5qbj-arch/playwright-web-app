/**
 * Data Adapters Service
 *
 * Provides database connection testing and adapter management
 * for multiple database providers (SQLite, MongoDB, PostgreSQL, MySQL).
 */

import { MongoClient } from 'mongodb';

// Supported database providers
export const SUPPORTED_PROVIDERS = [
  {
    id: 'sqlite',
    name: 'SQLite',
    description: 'Built-in local database',
    requiresConfig: false,
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    description: 'Document database (supports Atlas)',
    requiresConfig: true,
    defaultPort: 27017,
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    description: 'Relational database',
    requiresConfig: true,
    defaultPort: 5432,
  },
  {
    id: 'mysql',
    name: 'MySQL',
    description: 'Relational database',
    requiresConfig: true,
    defaultPort: 3306,
  },
];

interface DataStorageConfig {
  provider: 'sqlite' | 'mongodb' | 'postgresql' | 'mysql';
  connectionString?: string | null;
  host?: string | null;
  port?: number | null;
  database?: string | null;
  username?: string | null;
  password?: string | null;
  useSSL?: boolean;
  options?: string | null;
}

interface ConnectionTestResult {
  success: boolean;
  error?: string;
  latency?: number;
  serverInfo?: {
    version?: string;
    [key: string]: any;
  };
}

// Cache for database adapters (keyed by applicationId)
const adapterCache = new Map<string, any>();

/**
 * Test database connection
 */
export async function testConnection(config: DataStorageConfig): Promise<ConnectionTestResult> {
  const startTime = Date.now();

  try {
    switch (config.provider) {
      case 'sqlite':
        return testSQLiteConnection();

      case 'mongodb':
        return await testMongoDBConnection(config);

      case 'postgresql':
        return await testPostgreSQLConnection(config);

      case 'mysql':
        return await testMySQLConnection(config);

      default:
        return {
          success: false,
          error: `Unsupported provider: ${config.provider}`,
        };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Connection failed',
    };
  }
}

/**
 * Test SQLite connection (always succeeds as it's built-in)
 */
function testSQLiteConnection(): ConnectionTestResult {
  return {
    success: true,
    latency: 0,
    serverInfo: {
      version: 'Built-in SQLite',
    },
  };
}

/**
 * Test MongoDB connection (supports both Atlas and self-hosted)
 */
async function testMongoDBConnection(config: DataStorageConfig): Promise<ConnectionTestResult> {
  const startTime = Date.now();
  let client: MongoClient | null = null;

  try {
    // Build connection URI
    let uri: string;

    if (config.connectionString) {
      uri = config.connectionString;
    } else {
      const { host, port, database, username, password, useSSL } = config;

      if (!host) {
        return { success: false, error: 'Host is required' };
      }

      // Check if it looks like an Atlas cluster (contains mongodb.net)
      const isAtlas = host.includes('mongodb.net') || host.includes('mongodb+srv');

      if (isAtlas) {
        // Atlas connection string format
        if (username && password) {
          uri = `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}/${database || ''}`;
        } else {
          uri = `mongodb+srv://${host}/${database || ''}`;
        }
      } else {
        // Standard MongoDB connection string
        const auth = username && password
          ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
          : '';
        const portStr = port ? `:${port}` : ':27017';
        const sslParam = useSSL ? '?tls=true' : '';
        uri = `mongodb://${auth}${host}${portStr}/${database || ''}${sslParam}`;
      }
    }

    // Connect with timeout
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    await client.connect();

    // Get server info
    const adminDb = client.db('admin');
    const serverInfo = await adminDb.command({ serverStatus: 1 }).catch(() => ({}));
    const buildInfo = await adminDb.command({ buildInfo: 1 }).catch(() => ({}));

    const latency = Date.now() - startTime;

    return {
      success: true,
      latency,
      serverInfo: {
        version: buildInfo.version || 'Unknown',
        host: serverInfo.host,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'MongoDB connection failed',
      latency: Date.now() - startTime,
    };
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
}

/**
 * Test PostgreSQL connection
 */
async function testPostgreSQLConnection(config: DataStorageConfig): Promise<ConnectionTestResult> {
  const startTime = Date.now();

  try {
    // PostgreSQL requires the 'pg' package
    // For now, return a message to install it
    // In production, you'd use: const { Client } = require('pg');

    // Try to dynamically import pg
    try {
      const pg = await import('pg').catch(() => null);

      if (!pg) {
        return {
          success: false,
          error: 'PostgreSQL driver not installed. Run: npm install pg',
        };
      }

      const { Client } = pg;
      let connectionString: string;

      if (config.connectionString) {
        connectionString = config.connectionString;
      } else {
        const { host, port, database, username, password, useSSL } = config;
        const sslMode = useSSL ? '?sslmode=require' : '';
        connectionString = `postgresql://${username}:${password}@${host}:${port || 5432}/${database}${sslMode}`;
      }

      const client = new Client({ connectionString });
      await client.connect();

      const result = await client.query('SELECT version()');
      await client.end();

      return {
        success: true,
        latency: Date.now() - startTime,
        serverInfo: {
          version: result.rows[0]?.version || 'Unknown',
        },
      };
    } catch (pgError: any) {
      return {
        success: false,
        error: pgError.message || 'PostgreSQL connection failed',
        latency: Date.now() - startTime,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'PostgreSQL connection failed',
      latency: Date.now() - startTime,
    };
  }
}

/**
 * Test MySQL connection
 */
async function testMySQLConnection(config: DataStorageConfig): Promise<ConnectionTestResult> {
  const startTime = Date.now();

  try {
    // MySQL requires the 'mysql2' package
    try {
      const mysql = await import('mysql2/promise').catch(() => null);

      if (!mysql) {
        return {
          success: false,
          error: 'MySQL driver not installed. Run: npm install mysql2',
        };
      }

      let connection;

      if (config.connectionString) {
        connection = await mysql.createConnection(config.connectionString);
      } else {
        const { host, port, database, username, password, useSSL } = config;
        connection = await mysql.createConnection({
          host: host || 'localhost',
          port: port || 3306,
          user: username,
          password: password,
          database: database,
          ssl: useSSL ? {} : undefined,
        });
      }

      const [rows] = await connection.execute('SELECT VERSION() as version');
      await connection.end();

      return {
        success: true,
        latency: Date.now() - startTime,
        serverInfo: {
          version: (rows as any)[0]?.version || 'Unknown',
        },
      };
    } catch (mysqlError: any) {
      return {
        success: false,
        error: mysqlError.message || 'MySQL connection failed',
        latency: Date.now() - startTime,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'MySQL connection failed',
      latency: Date.now() - startTime,
    };
  }
}

/**
 * Clear cached adapter for an application
 */
export async function clearAdapterCache(applicationId: string): Promise<void> {
  const adapter = adapterCache.get(applicationId);
  if (adapter) {
    // Close connection if adapter has a close method
    if (typeof adapter.close === 'function') {
      await adapter.close().catch(() => {});
    }
    adapterCache.delete(applicationId);
  }
}

/**
 * Clear all cached adapters
 */
export async function clearAllAdapterCaches(): Promise<void> {
  for (const [applicationId] of adapterCache) {
    await clearAdapterCache(applicationId);
  }
}
