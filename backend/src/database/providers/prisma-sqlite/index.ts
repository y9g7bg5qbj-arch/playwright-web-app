/**
 * Prisma SQLite Database Provider
 *
 * Implements the database abstraction layer using Prisma with SQLite.
 * - Catalog database: Single SQLite file for users, projects, executions
 * - Project databases: Separate SQLite file per project
 */

import { PrismaClient as CatalogPrismaClient } from '../../../../node_modules/.prisma/catalog-client';
import { PrismaClient as ProjectPrismaClient } from '../../../../node_modules/.prisma/project-client';
import * as path from 'path';
import * as fs from 'fs';
import {
  IDatabaseProvider,
  ICatalogDatabaseContext,
  IProjectDatabaseContext,
  DatabaseConfig,
  DatabaseProviderType,
} from '../../interfaces';
import { PrismaCatalogContext } from './catalog-context';
import { PrismaProjectContext } from './project-context';

/**
 * LRU Cache for project database connections
 */
class ProjectConnectionPool {
  private connections: Map<string, { context: PrismaProjectContext; lastUsed: number }> = new Map();
  private maxConnections: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxConnections = 10) {
    this.maxConnections = maxConnections;
    // Cleanup stale connections every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async get(projectId: string, dbPath: string): Promise<PrismaProjectContext> {
    const existing = this.connections.get(projectId);
    if (existing) {
      existing.lastUsed = Date.now();
      return existing.context;
    }

    // Evict least recently used if at capacity
    if (this.connections.size >= this.maxConnections) {
      await this.evictLRU();
    }

    // Create new connection
    const context = new PrismaProjectContext(projectId, dbPath);
    await context.connect();
    this.connections.set(projectId, { context, lastUsed: Date.now() });
    return context;
  }

  async release(projectId: string): Promise<void> {
    const entry = this.connections.get(projectId);
    if (entry) {
      await entry.context.disconnect();
      this.connections.delete(projectId);
    }
  }

  async releaseAll(): Promise<void> {
    for (const [projectId] of this.connections) {
      await this.release(projectId);
    }
  }

  getActiveCount(): number {
    return this.connections.size;
  }

  private async evictLRU(): Promise<void> {
    let oldest: { projectId: string; lastUsed: number } | null = null;

    for (const [projectId, entry] of this.connections) {
      if (!oldest || entry.lastUsed < oldest.lastUsed) {
        oldest = { projectId, lastUsed: entry.lastUsed };
      }
    }

    if (oldest) {
      await this.release(oldest.projectId);
    }
  }

  private async cleanup(): Promise<void> {
    const staleThreshold = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();

    for (const [projectId, entry] of this.connections) {
      if (now - entry.lastUsed > staleThreshold) {
        await this.release(projectId);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * Prisma SQLite Database Provider
 */
export class PrismaSqliteProvider implements IDatabaseProvider {
  readonly type: DatabaseProviderType = 'prisma-sqlite';

  private config: DatabaseConfig | null = null;
  private catalogContext: PrismaCatalogContext | null = null;
  private projectPool: ProjectConnectionPool | null = null;
  private initialized = false;

  async initialize(config: DatabaseConfig): Promise<void> {
    if (this.initialized) {
      throw new Error('Provider already initialized');
    }

    this.config = config;

    // Ensure directories exist
    const catalogDir = path.dirname(config.catalogDbPath || './databases/catalog/catalog.db');
    const projectsDir = config.projectsDbDir || './databases/projects';

    if (!fs.existsSync(catalogDir)) {
      fs.mkdirSync(catalogDir, { recursive: true });
    }
    if (!fs.existsSync(projectsDir)) {
      fs.mkdirSync(projectsDir, { recursive: true });
    }

    // Initialize catalog connection
    this.catalogContext = new PrismaCatalogContext(
      config.catalogDbPath || './databases/catalog/catalog.db'
    );
    await this.catalogContext.connect();

    // Initialize project connection pool
    this.projectPool = new ProjectConnectionPool(config.connectionPoolSize || 10);

    this.initialized = true;
  }

  getCatalogContext(): ICatalogDatabaseContext {
    if (!this.catalogContext) {
      throw new Error('Provider not initialized');
    }
    return this.catalogContext;
  }

  async getProjectContext(projectId: string): Promise<IProjectDatabaseContext> {
    if (!this.config || !this.projectPool) {
      throw new Error('Provider not initialized');
    }

    // Get project's database path from catalog
    const project = await this.catalogContext!.projects.findById(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    return this.projectPool.get(projectId, project.dbPath);
  }

  async createProjectDatabase(projectId: string): Promise<void> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    const projectsDir = this.config.projectsDbDir || './databases/projects';
    const dbPath = path.join(projectsDir, `${projectId}.db`);

    // Create empty database file
    fs.writeFileSync(dbPath, '');

    // Run migrations on the new database
    // In production, you'd use Prisma migrate or a migration script
    const context = new PrismaProjectContext(projectId, dbPath);
    await context.connect();
    // The Prisma client will create tables on first use with db push
    await context.disconnect();
  }

  async deleteProjectDatabase(projectId: string): Promise<void> {
    if (!this.config || !this.projectPool) {
      throw new Error('Provider not initialized');
    }

    // Release any active connection
    await this.projectPool.release(projectId);

    // Get and delete the database file
    const project = await this.catalogContext!.projects.findById(projectId);
    if (project && fs.existsSync(project.dbPath)) {
      fs.unlinkSync(project.dbPath);
    }
  }

  async cloneProjectDatabase(sourceProjectId: string, targetProjectId: string): Promise<void> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    const sourceProject = await this.catalogContext!.projects.findById(sourceProjectId);
    if (!sourceProject) {
      throw new Error(`Source project not found: ${sourceProjectId}`);
    }

    const projectsDir = this.config.projectsDbDir || './databases/projects';
    const targetDbPath = path.join(projectsDir, `${targetProjectId}.db`);

    // Copy the database file
    fs.copyFileSync(sourceProject.dbPath, targetDbPath);
  }

  async exportProjectDatabase(projectId: string, outputPath: string): Promise<void> {
    const project = await this.catalogContext!.projects.findById(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    fs.copyFileSync(project.dbPath, outputPath);
  }

  async importProjectDatabase(projectId: string, inputPath: string): Promise<void> {
    if (!this.config || !this.projectPool) {
      throw new Error('Provider not initialized');
    }

    // Release any existing connection
    await this.projectPool.release(projectId);

    const project = await this.catalogContext!.projects.findById(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Replace the database file
    fs.copyFileSync(inputPath, project.dbPath);
  }

  async releaseProjectContext(projectId: string): Promise<void> {
    if (this.projectPool) {
      await this.projectPool.release(projectId);
    }
  }

  getActiveConnections(): number {
    return this.projectPool?.getActiveCount() || 0;
  }

  async shutdown(): Promise<void> {
    if (this.projectPool) {
      await this.projectPool.releaseAll();
      this.projectPool.destroy();
      this.projectPool = null;
    }

    if (this.catalogContext) {
      await this.catalogContext.disconnect();
      this.catalogContext = null;
    }

    this.initialized = false;
  }
}

// Export the provider factory
export function createPrismaSqliteProvider(): IDatabaseProvider {
  return new PrismaSqliteProvider();
}
