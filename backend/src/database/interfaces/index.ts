/**
 * Database Abstraction Layer - Interfaces
 *
 * This module defines database-agnostic interfaces that allow
 * swapping between different database backends (SQLite/Prisma, MongoDB, etc.)
 * without changing business logic.
 *
 * Usage:
 * - Current: Prisma with SQLite (separate DB per project)
 * - Future: MongoDB with collections per project
 */

// ============================================
// COMMON TYPES
// ============================================

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryFilter {
  [key: string]: unknown;
}

// ============================================
// ENTITY INTERFACES (Database-agnostic models)
// ============================================

export interface ITestDataSheet {
  id: string;
  name: string;
  pageObject?: string | null;
  description?: string | null;
  columns: Array<{ name: string; type: string; required?: boolean }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITestDataRow {
  id: string;
  sheetId: string;
  scenarioId: string;
  data: Record<string, unknown>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkflow {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITestFlow {
  id: string;
  workflowId: string;
  name: string;
  code?: string | null;
  nodes?: unknown;
  edges?: unknown;
  variables?: unknown;
  dataSource?: unknown;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVariable {
  id: string;
  key: string;
  value: string;
  type: string;
  sensitive: boolean;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkflowVariable extends IVariable {
  workflowId: string;
}

export interface IGlobalVariable extends IVariable {}

export interface IEnvironment {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEnvironmentVariable extends IVariable {
  environmentId: string;
}

export interface IObjectRepository {
  id: string;
  workflowId: string;
  name: string;
  description?: string | null;
  globalElements?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPageObject {
  id: string;
  repositoryId: string;
  name: string;
  description?: string | null;
  urlPattern?: string | null;
  baseUrl?: string | null;
  elements: unknown[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// CATALOG ENTITIES (Central database)
// ============================================

export interface IUser {
  id: string;
  email: string;
  passwordHash: string;
  name?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProject {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  dbPath: string;
  veroPath?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
}

export interface IExecution {
  id: string;
  projectId: string;
  testFlowId?: string | null;
  testName?: string | null;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';
  exitCode?: number | null;
  target: 'local' | 'remote';
  agentId?: string | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  duration?: number | null;
  createdAt: Date;
}

export interface ISchedule {
  id: string;
  userId: string;
  projectId: string;
  name: string;
  description?: string | null;
  cronExpression: string;
  timezone: string;
  testSelector: Record<string, unknown>;
  notificationConfig?: Record<string, unknown> | null;
  isActive: boolean;
  webhookToken?: string | null;
  nextRunAt?: Date | null;
  lastRunAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// REPOSITORY INTERFACES
// ============================================

/**
 * Base repository interface with common CRUD operations
 */
export interface IRepository<T, CreateInput, UpdateInput> {
  findById(id: string): Promise<T | null>;
  findMany(filter?: QueryFilter, options?: PaginationOptions): Promise<T[]>;
  findManyPaginated(filter?: QueryFilter, options?: PaginationOptions): Promise<PaginatedResult<T>>;
  create(data: CreateInput): Promise<T>;
  update(id: string, data: UpdateInput): Promise<T>;
  delete(id: string): Promise<void>;
  count(filter?: QueryFilter): Promise<number>;
}

/**
 * Test Data Sheet Repository
 */
export interface ITestDataSheetRepository extends IRepository<
  ITestDataSheet,
  Omit<ITestDataSheet, 'id' | 'createdAt' | 'updatedAt'>,
  Partial<Omit<ITestDataSheet, 'id' | 'createdAt' | 'updatedAt'>>
> {
  findByName(name: string): Promise<ITestDataSheet | null>;
  findWithRows(id: string): Promise<(ITestDataSheet & { rows: ITestDataRow[] }) | null>;
  getSchema(): Promise<Array<{ name: string; columns: Array<{ name: string; type: string }> }>>;
}

/**
 * Test Data Row Repository
 */
export interface ITestDataRowRepository extends IRepository<
  ITestDataRow,
  Omit<ITestDataRow, 'id' | 'createdAt' | 'updatedAt'>,
  Partial<Omit<ITestDataRow, 'id' | 'createdAt' | 'updatedAt'>>
> {
  findBySheetId(sheetId: string): Promise<ITestDataRow[]>;
  findByScenarioId(sheetId: string, scenarioId: string): Promise<ITestDataRow | null>;
  bulkCreate(rows: Array<Omit<ITestDataRow, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ITestDataRow[]>;
  bulkDelete(ids: string[]): Promise<void>;
}

/**
 * Workflow Repository
 */
export interface IWorkflowRepository extends IRepository<
  IWorkflow,
  Omit<IWorkflow, 'id' | 'createdAt' | 'updatedAt'>,
  Partial<Omit<IWorkflow, 'id' | 'createdAt' | 'updatedAt'>>
> {
  findByName(name: string): Promise<IWorkflow | null>;
  findWithTestFlows(id: string): Promise<(IWorkflow & { testFlows: ITestFlow[] }) | null>;
}

/**
 * Test Flow Repository
 */
export interface ITestFlowRepository extends IRepository<
  ITestFlow,
  Omit<ITestFlow, 'id' | 'createdAt' | 'updatedAt'>,
  Partial<Omit<ITestFlow, 'id' | 'createdAt' | 'updatedAt'>>
> {
  findByWorkflowId(workflowId: string): Promise<ITestFlow[]>;
}

/**
 * Variable Repositories
 */
export interface IGlobalVariableRepository extends IRepository<
  IGlobalVariable,
  Omit<IGlobalVariable, 'id' | 'createdAt' | 'updatedAt'>,
  Partial<Omit<IGlobalVariable, 'id' | 'createdAt' | 'updatedAt'>>
> {
  findByKey(key: string): Promise<IGlobalVariable | null>;
}

export interface IWorkflowVariableRepository extends IRepository<
  IWorkflowVariable,
  Omit<IWorkflowVariable, 'id' | 'createdAt' | 'updatedAt'>,
  Partial<Omit<IWorkflowVariable, 'id' | 'createdAt' | 'updatedAt'>>
> {
  findByWorkflowId(workflowId: string): Promise<IWorkflowVariable[]>;
  findByKey(workflowId: string, key: string): Promise<IWorkflowVariable | null>;
}

/**
 * Environment Repository
 */
export interface IEnvironmentRepository extends IRepository<
  IEnvironment,
  Omit<IEnvironment, 'id' | 'createdAt' | 'updatedAt'>,
  Partial<Omit<IEnvironment, 'id' | 'createdAt' | 'updatedAt'>>
> {
  findActive(): Promise<IEnvironment | null>;
  setActive(id: string): Promise<void>;
}

// ============================================
// CATALOG REPOSITORIES
// ============================================

export interface IUserRepository extends IRepository<
  IUser,
  Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>,
  Partial<Omit<IUser, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'>>
> {
  findByEmail(email: string): Promise<IUser | null>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
}

export interface IProjectRepository extends IRepository<
  IProject,
  Omit<IProject, 'id' | 'createdAt' | 'updatedAt'>,
  Partial<Omit<IProject, 'id' | 'createdAt' | 'updatedAt'>>
> {
  findByUserId(userId: string): Promise<IProject[]>;
  findByMembership(userId: string): Promise<IProject[]>;
  findWithMembers(id: string): Promise<(IProject & { members: IProjectMember[] }) | null>;
}

export interface IExecutionRepository extends IRepository<
  IExecution,
  Omit<IExecution, 'id' | 'createdAt'>,
  Partial<Omit<IExecution, 'id' | 'createdAt'>>
> {
  findByProjectId(projectId: string, options?: PaginationOptions): Promise<IExecution[]>;
  findRecent(projectId: string, limit?: number): Promise<IExecution[]>;
}

export interface IScheduleRepository extends IRepository<
  ISchedule,
  Omit<ISchedule, 'id' | 'createdAt' | 'updatedAt'>,
  Partial<Omit<ISchedule, 'id' | 'createdAt' | 'updatedAt'>>
> {
  findByProjectId(projectId: string): Promise<ISchedule[]>;
  findDueSchedules(): Promise<ISchedule[]>;
  findByWebhookToken(token: string): Promise<ISchedule | null>;
}

// ============================================
// DATABASE PROVIDER INTERFACE
// ============================================

/**
 * Database provider types
 */
export type DatabaseProviderType = 'prisma-sqlite' | 'mongodb' | 'prisma-postgres';

/**
 * Configuration for database providers
 */
export interface DatabaseConfig {
  type: DatabaseProviderType;

  // SQLite specific
  catalogDbPath?: string;
  projectsDbDir?: string;

  // MongoDB specific
  mongoUri?: string;
  mongoDatabaseName?: string;

  // PostgreSQL specific
  postgresUri?: string;

  // Common options
  connectionPoolSize?: number;
  connectionTimeout?: number;
}

/**
 * Project Database Context
 * Provides access to all project-scoped repositories
 */
export interface IProjectDatabaseContext {
  readonly projectId: string;

  // Repositories
  testDataSheets: ITestDataSheetRepository;
  testDataRows: ITestDataRowRepository;
  workflows: IWorkflowRepository;
  testFlows: ITestFlowRepository;
  globalVariables: IGlobalVariableRepository;
  workflowVariables: IWorkflowVariableRepository;
  environments: IEnvironmentRepository;

  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Transactions (if supported)
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

/**
 * Catalog Database Context
 * Provides access to central catalog repositories
 */
export interface ICatalogDatabaseContext {
  // Repositories
  users: IUserRepository;
  projects: IProjectRepository;
  executions: IExecutionRepository;
  schedules: IScheduleRepository;

  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Transactions
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

/**
 * Main Database Provider Interface
 * This is the entry point for database operations
 */
export interface IDatabaseProvider {
  readonly type: DatabaseProviderType;

  // Initialize the provider
  initialize(config: DatabaseConfig): Promise<void>;

  // Get catalog context (central database)
  getCatalogContext(): ICatalogDatabaseContext;

  // Get project-specific context
  getProjectContext(projectId: string): Promise<IProjectDatabaseContext>;

  // Project database lifecycle
  createProjectDatabase(projectId: string): Promise<void>;
  deleteProjectDatabase(projectId: string): Promise<void>;
  cloneProjectDatabase(sourceProjectId: string, targetProjectId: string): Promise<void>;
  exportProjectDatabase(projectId: string, outputPath: string): Promise<void>;
  importProjectDatabase(projectId: string, inputPath: string): Promise<void>;

  // Connection pool management
  releaseProjectContext(projectId: string): Promise<void>;
  getActiveConnections(): number;

  // Cleanup
  shutdown(): Promise<void>;
}

/**
 * Factory function type for creating database providers
 */
export type DatabaseProviderFactory = (config: DatabaseConfig) => IDatabaseProvider;
