/**
 * Database Abstraction Layer - Main Entry Point
 *
 * This module provides a plug-and-play database system that allows
 * switching between different database backends without changing business logic.
 *
 * Current: Prisma with SQLite (separate DB per project)
 * Future: MongoDB, PostgreSQL, etc.
 *
 * Usage:
 * ```typescript
 * import { db } from './database';
 *
 * // Initialize (once at startup)
 * await db.initialize({
 *   type: 'prisma-sqlite',
 *   catalogDbPath: './databases/catalog/catalog.db',
 *   projectsDbDir: './databases/projects'
 * });
 *
 * // Use catalog database (users, projects)
 * const user = await db.catalog.users.findByEmail('test@example.com');
 *
 * // Use project-specific database
 * const projectDb = await db.getProject('project-123');
 * const sheets = await projectDb.testDataSheets.findMany();
 * ```
 */

import {
  IDatabaseProvider,
  ICatalogDatabaseContext,
  IProjectDatabaseContext,
  DatabaseConfig,
  DatabaseProviderType,
} from './interfaces';
import { createPrismaSqliteProvider } from './providers/prisma-sqlite';

// Re-export interfaces for external use
export * from './interfaces';

/**
 * Database Service
 *
 * Singleton service that manages database connections and provides
 * access to repositories through a consistent interface.
 */
class DatabaseService {
  private provider: IDatabaseProvider | null = null;
  private config: DatabaseConfig | null = null;

  /**
   * Initialize the database service with a specific provider
   */
  async initialize(config: DatabaseConfig): Promise<void> {
    if (this.provider) {
      throw new Error('Database service already initialized');
    }

    this.config = config;
    this.provider = this.createProvider(config.type);
    await this.provider.initialize(config);

    console.log(`[Database] Initialized with ${config.type} provider`);
  }

  /**
   * Get the catalog database context
   * Contains: users, projects, executions, schedules
   */
  get catalog(): ICatalogDatabaseContext {
    if (!this.provider) {
      throw new Error('Database service not initialized');
    }
    return this.provider.getCatalogContext();
  }

  /**
   * Get a project-specific database context
   * Contains: test data, workflows, variables, etc.
   */
  async getProject(projectId: string): Promise<IProjectDatabaseContext> {
    if (!this.provider) {
      throw new Error('Database service not initialized');
    }
    return this.provider.getProjectContext(projectId);
  }

  /**
   * Create a new project database
   */
  async createProjectDatabase(projectId: string): Promise<void> {
    if (!this.provider) {
      throw new Error('Database service not initialized');
    }
    await this.provider.createProjectDatabase(projectId);
  }

  /**
   * Delete a project database
   */
  async deleteProjectDatabase(projectId: string): Promise<void> {
    if (!this.provider) {
      throw new Error('Database service not initialized');
    }
    await this.provider.deleteProjectDatabase(projectId);
  }

  /**
   * Clone a project database (for project duplication)
   */
  async cloneProjectDatabase(sourceId: string, targetId: string): Promise<void> {
    if (!this.provider) {
      throw new Error('Database service not initialized');
    }
    await this.provider.cloneProjectDatabase(sourceId, targetId);
  }

  /**
   * Export a project database to a file
   */
  async exportProject(projectId: string, outputPath: string): Promise<void> {
    if (!this.provider) {
      throw new Error('Database service not initialized');
    }
    await this.provider.exportProjectDatabase(projectId, outputPath);
  }

  /**
   * Import a project database from a file
   */
  async importProject(projectId: string, inputPath: string): Promise<void> {
    if (!this.provider) {
      throw new Error('Database service not initialized');
    }
    await this.provider.importProjectDatabase(projectId, inputPath);
  }

  /**
   * Release a project database connection (for memory management)
   */
  async releaseProject(projectId: string): Promise<void> {
    if (!this.provider) {
      throw new Error('Database service not initialized');
    }
    await this.provider.releaseProjectContext(projectId);
  }

  /**
   * Get number of active project connections
   */
  getActiveConnections(): number {
    return this.provider?.getActiveConnections() || 0;
  }

  /**
   * Get the current provider type
   */
  getProviderType(): DatabaseProviderType | null {
    return this.provider?.type || null;
  }

  /**
   * Shutdown the database service
   */
  async shutdown(): Promise<void> {
    if (this.provider) {
      await this.provider.shutdown();
      this.provider = null;
      this.config = null;
      console.log('[Database] Shutdown complete');
    }
  }

  /**
   * Create a provider instance based on type
   */
  private createProvider(type: DatabaseProviderType): IDatabaseProvider {
    switch (type) {
      case 'prisma-sqlite':
        return createPrismaSqliteProvider();

      case 'mongodb':
        // Future: return createMongoDBProvider();
        throw new Error('MongoDB provider not yet implemented. Coming soon!');

      case 'prisma-postgres':
        // Future: return createPostgresProvider();
        throw new Error('PostgreSQL provider not yet implemented. Coming soon!');

      default:
        throw new Error(`Unknown database provider type: ${type}`);
    }
  }
}

// Export singleton instance
export const db = new DatabaseService();

/**
 * Helper function to get a project database context
 * Shorthand for db.getProject()
 */
export async function getProjectDb(projectId: string): Promise<IProjectDatabaseContext> {
  return db.getProject(projectId);
}

/**
 * Middleware helper for Express routes
 * Attaches project database context to request
 */
export function withProjectDb(projectIdParam = 'projectId') {
  return async (req: any, res: any, next: any) => {
    try {
      const projectId = req.params[projectIdParam] || req.query.projectId || req.body?.projectId;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Project ID is required',
        });
      }

      req.projectDb = await db.getProject(projectId);
      next();
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: `Failed to load project database: ${error.message}`,
      });
    }
  };
}
