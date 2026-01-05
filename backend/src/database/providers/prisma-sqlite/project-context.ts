/**
 * Prisma Project Database Context
 *
 * Implements the project-specific database context using Prisma with SQLite.
 * Each project has its own SQLite database file.
 */

import { PrismaClient } from '../../../../node_modules/.prisma/project-client';
import {
  IProjectDatabaseContext,
  ITestDataSheetRepository,
  ITestDataRowRepository,
  IWorkflowRepository,
  ITestFlowRepository,
  IGlobalVariableRepository,
  IWorkflowVariableRepository,
  IEnvironmentRepository,
  ITestDataSheet,
  ITestDataRow,
  IWorkflow,
  ITestFlow,
  IGlobalVariable,
  IWorkflowVariable,
  IEnvironment,
  QueryFilter,
  PaginationOptions,
  PaginatedResult,
} from '../../interfaces';

// ============================================
// TEST DATA SHEET REPOSITORY
// ============================================

class PrismaTestDataSheetRepository implements ITestDataSheetRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<ITestDataSheet | null> {
    const sheet = await this.prisma.testDataSheet.findUnique({ where: { id } });
    return sheet ? this.mapSheet(sheet) : null;
  }

  async findByName(name: string): Promise<ITestDataSheet | null> {
    const sheet = await this.prisma.testDataSheet.findUnique({ where: { name } });
    return sheet ? this.mapSheet(sheet) : null;
  }

  async findWithRows(id: string): Promise<(ITestDataSheet & { rows: ITestDataRow[] }) | null> {
    const sheet = await this.prisma.testDataSheet.findUnique({
      where: { id },
      include: { rows: true },
    });

    if (!sheet) return null;

    return {
      ...this.mapSheet(sheet),
      rows: sheet.rows.map(row => this.mapRow(row)),
    };
  }

  async getSchema(): Promise<Array<{ name: string; columns: Array<{ name: string; type: string }> }>> {
    const sheets = await this.prisma.testDataSheet.findMany({
      select: { name: true, columns: true },
    });

    return sheets.map(sheet => ({
      name: sheet.name,
      columns: typeof sheet.columns === 'string' ? JSON.parse(sheet.columns) : sheet.columns,
    }));
  }

  async findMany(filter?: QueryFilter, options?: PaginationOptions): Promise<ITestDataSheet[]> {
    const sheets = await this.prisma.testDataSheet.findMany({
      where: filter as any,
      orderBy: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : { name: 'asc' },
      skip: options?.page && options?.limit ? (options.page - 1) * options.limit : undefined,
      take: options?.limit,
    });
    return sheets.map(s => this.mapSheet(s));
  }

  async findManyPaginated(filter?: QueryFilter, options?: PaginationOptions): Promise<PaginatedResult<ITestDataSheet>> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [data, total] = await Promise.all([
      this.findMany(filter, { ...options, page, limit }),
      this.count(filter),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(data: Omit<ITestDataSheet, 'id' | 'createdAt' | 'updatedAt'>): Promise<ITestDataSheet> {
    const sheet = await this.prisma.testDataSheet.create({
      data: {
        name: data.name,
        pageObject: data.pageObject,
        description: data.description,
        columns: JSON.stringify(data.columns),
      },
    });
    return this.mapSheet(sheet);
  }

  async update(id: string, data: Partial<Omit<ITestDataSheet, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ITestDataSheet> {
    const updateData: any = { ...data };
    if (data.columns) {
      updateData.columns = JSON.stringify(data.columns);
    }

    const sheet = await this.prisma.testDataSheet.update({ where: { id }, data: updateData });
    return this.mapSheet(sheet);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.testDataSheet.delete({ where: { id } });
  }

  async count(filter?: QueryFilter): Promise<number> {
    return this.prisma.testDataSheet.count({ where: filter as any });
  }

  private mapSheet(sheet: any): ITestDataSheet {
    return {
      ...sheet,
      columns: typeof sheet.columns === 'string' ? JSON.parse(sheet.columns) : sheet.columns,
    };
  }

  private mapRow(row: any): ITestDataRow {
    return {
      ...row,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
    };
  }
}

// ============================================
// TEST DATA ROW REPOSITORY
// ============================================

class PrismaTestDataRowRepository implements ITestDataRowRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<ITestDataRow | null> {
    const row = await this.prisma.testDataRow.findUnique({ where: { id } });
    return row ? this.mapRow(row) : null;
  }

  async findBySheetId(sheetId: string): Promise<ITestDataRow[]> {
    const rows = await this.prisma.testDataRow.findMany({
      where: { sheetId },
      orderBy: { scenarioId: 'asc' },
    });
    return rows.map(r => this.mapRow(r));
  }

  async findByScenarioId(sheetId: string, scenarioId: string): Promise<ITestDataRow | null> {
    const row = await this.prisma.testDataRow.findUnique({
      where: { sheetId_scenarioId: { sheetId, scenarioId } },
    });
    return row ? this.mapRow(row) : null;
  }

  async findMany(filter?: QueryFilter, options?: PaginationOptions): Promise<ITestDataRow[]> {
    const rows = await this.prisma.testDataRow.findMany({
      where: filter as any,
      orderBy: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : { scenarioId: 'asc' },
      skip: options?.page && options?.limit ? (options.page - 1) * options.limit : undefined,
      take: options?.limit,
    });
    return rows.map(r => this.mapRow(r));
  }

  async findManyPaginated(filter?: QueryFilter, options?: PaginationOptions): Promise<PaginatedResult<ITestDataRow>> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [data, total] = await Promise.all([
      this.findMany(filter, { ...options, page, limit }),
      this.count(filter),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(data: Omit<ITestDataRow, 'id' | 'createdAt' | 'updatedAt'>): Promise<ITestDataRow> {
    const row = await this.prisma.testDataRow.create({
      data: {
        sheetId: data.sheetId,
        scenarioId: data.scenarioId,
        data: JSON.stringify(data.data),
        enabled: data.enabled,
      },
    });
    return this.mapRow(row);
  }

  async bulkCreate(rows: Array<Omit<ITestDataRow, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ITestDataRow[]> {
    const created: ITestDataRow[] = [];
    for (const rowData of rows) {
      const row = await this.create(rowData);
      created.push(row);
    }
    return created;
  }

  async update(id: string, data: Partial<Omit<ITestDataRow, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ITestDataRow> {
    const updateData: any = { ...data };
    if (data.data) {
      updateData.data = JSON.stringify(data.data);
    }

    const row = await this.prisma.testDataRow.update({ where: { id }, data: updateData });
    return this.mapRow(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.testDataRow.delete({ where: { id } });
  }

  async bulkDelete(ids: string[]): Promise<void> {
    await this.prisma.testDataRow.deleteMany({ where: { id: { in: ids } } });
  }

  async count(filter?: QueryFilter): Promise<number> {
    return this.prisma.testDataRow.count({ where: filter as any });
  }

  private mapRow(row: any): ITestDataRow {
    return {
      ...row,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
    };
  }
}

// ============================================
// WORKFLOW REPOSITORY
// ============================================

class PrismaWorkflowRepository implements IWorkflowRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<IWorkflow | null> {
    return this.prisma.workflow.findUnique({ where: { id } });
  }

  async findByName(name: string): Promise<IWorkflow | null> {
    return this.prisma.workflow.findUnique({ where: { name } });
  }

  async findWithTestFlows(id: string): Promise<(IWorkflow & { testFlows: ITestFlow[] }) | null> {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: { testFlows: true },
    });

    if (!workflow) return null;

    return {
      ...workflow,
      testFlows: workflow.testFlows.map(tf => this.mapTestFlow(tf)),
    };
  }

  async findMany(filter?: QueryFilter, options?: PaginationOptions): Promise<IWorkflow[]> {
    return this.prisma.workflow.findMany({
      where: filter as any,
      orderBy: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : { name: 'asc' },
      skip: options?.page && options?.limit ? (options.page - 1) * options.limit : undefined,
      take: options?.limit,
    });
  }

  async findManyPaginated(filter?: QueryFilter, options?: PaginationOptions): Promise<PaginatedResult<IWorkflow>> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [data, total] = await Promise.all([
      this.findMany(filter, { ...options, page, limit }),
      this.count(filter),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(data: Omit<IWorkflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<IWorkflow> {
    return this.prisma.workflow.create({ data });
  }

  async update(id: string, data: Partial<Omit<IWorkflow, 'id' | 'createdAt' | 'updatedAt'>>): Promise<IWorkflow> {
    return this.prisma.workflow.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.workflow.delete({ where: { id } });
  }

  async count(filter?: QueryFilter): Promise<number> {
    return this.prisma.workflow.count({ where: filter as any });
  }

  private mapTestFlow(tf: any): ITestFlow {
    return {
      ...tf,
      nodes: tf.nodes ? (typeof tf.nodes === 'string' ? JSON.parse(tf.nodes) : tf.nodes) : null,
      edges: tf.edges ? (typeof tf.edges === 'string' ? JSON.parse(tf.edges) : tf.edges) : null,
      variables: tf.variables ? (typeof tf.variables === 'string' ? JSON.parse(tf.variables) : tf.variables) : null,
      dataSource: tf.dataSource ? (typeof tf.dataSource === 'string' ? JSON.parse(tf.dataSource) : tf.dataSource) : null,
    };
  }
}

// ============================================
// TEST FLOW REPOSITORY
// ============================================

class PrismaTestFlowRepository implements ITestFlowRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<ITestFlow | null> {
    const tf = await this.prisma.testFlow.findUnique({ where: { id } });
    return tf ? this.mapTestFlow(tf) : null;
  }

  async findByWorkflowId(workflowId: string): Promise<ITestFlow[]> {
    const flows = await this.prisma.testFlow.findMany({
      where: { workflowId },
      orderBy: { name: 'asc' },
    });
    return flows.map(tf => this.mapTestFlow(tf));
  }

  async findMany(filter?: QueryFilter, options?: PaginationOptions): Promise<ITestFlow[]> {
    const flows = await this.prisma.testFlow.findMany({
      where: filter as any,
      orderBy: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : { name: 'asc' },
      skip: options?.page && options?.limit ? (options.page - 1) * options.limit : undefined,
      take: options?.limit,
    });
    return flows.map(tf => this.mapTestFlow(tf));
  }

  async findManyPaginated(filter?: QueryFilter, options?: PaginationOptions): Promise<PaginatedResult<ITestFlow>> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [data, total] = await Promise.all([
      this.findMany(filter, { ...options, page, limit }),
      this.count(filter),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(data: Omit<ITestFlow, 'id' | 'createdAt' | 'updatedAt'>): Promise<ITestFlow> {
    const tf = await this.prisma.testFlow.create({
      data: {
        workflowId: data.workflowId,
        name: data.name,
        code: data.code,
        nodes: data.nodes ? JSON.stringify(data.nodes) : null,
        edges: data.edges ? JSON.stringify(data.edges) : null,
        variables: data.variables ? JSON.stringify(data.variables) : null,
        dataSource: data.dataSource ? JSON.stringify(data.dataSource) : null,
        language: data.language,
      },
    });
    return this.mapTestFlow(tf);
  }

  async update(id: string, data: Partial<Omit<ITestFlow, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ITestFlow> {
    const updateData: any = { ...data };
    if (data.nodes !== undefined) updateData.nodes = data.nodes ? JSON.stringify(data.nodes) : null;
    if (data.edges !== undefined) updateData.edges = data.edges ? JSON.stringify(data.edges) : null;
    if (data.variables !== undefined) updateData.variables = data.variables ? JSON.stringify(data.variables) : null;
    if (data.dataSource !== undefined) updateData.dataSource = data.dataSource ? JSON.stringify(data.dataSource) : null;

    const tf = await this.prisma.testFlow.update({ where: { id }, data: updateData });
    return this.mapTestFlow(tf);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.testFlow.delete({ where: { id } });
  }

  async count(filter?: QueryFilter): Promise<number> {
    return this.prisma.testFlow.count({ where: filter as any });
  }

  private mapTestFlow(tf: any): ITestFlow {
    return {
      ...tf,
      nodes: tf.nodes ? (typeof tf.nodes === 'string' ? JSON.parse(tf.nodes) : tf.nodes) : null,
      edges: tf.edges ? (typeof tf.edges === 'string' ? JSON.parse(tf.edges) : tf.edges) : null,
      variables: tf.variables ? (typeof tf.variables === 'string' ? JSON.parse(tf.variables) : tf.variables) : null,
      dataSource: tf.dataSource ? (typeof tf.dataSource === 'string' ? JSON.parse(tf.dataSource) : tf.dataSource) : null,
    };
  }
}

// ============================================
// GLOBAL VARIABLE REPOSITORY
// ============================================

class PrismaGlobalVariableRepository implements IGlobalVariableRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<IGlobalVariable | null> {
    return this.prisma.globalVariable.findUnique({ where: { id } });
  }

  async findByKey(key: string): Promise<IGlobalVariable | null> {
    return this.prisma.globalVariable.findUnique({ where: { key } });
  }

  async findMany(filter?: QueryFilter, options?: PaginationOptions): Promise<IGlobalVariable[]> {
    return this.prisma.globalVariable.findMany({
      where: filter as any,
      orderBy: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : { key: 'asc' },
      skip: options?.page && options?.limit ? (options.page - 1) * options.limit : undefined,
      take: options?.limit,
    });
  }

  async findManyPaginated(filter?: QueryFilter, options?: PaginationOptions): Promise<PaginatedResult<IGlobalVariable>> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [data, total] = await Promise.all([
      this.findMany(filter, { ...options, page, limit }),
      this.count(filter),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(data: Omit<IGlobalVariable, 'id' | 'createdAt' | 'updatedAt'>): Promise<IGlobalVariable> {
    return this.prisma.globalVariable.create({ data });
  }

  async update(id: string, data: Partial<Omit<IGlobalVariable, 'id' | 'createdAt' | 'updatedAt'>>): Promise<IGlobalVariable> {
    return this.prisma.globalVariable.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.globalVariable.delete({ where: { id } });
  }

  async count(filter?: QueryFilter): Promise<number> {
    return this.prisma.globalVariable.count({ where: filter as any });
  }
}

// ============================================
// WORKFLOW VARIABLE REPOSITORY
// ============================================

class PrismaWorkflowVariableRepository implements IWorkflowVariableRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<IWorkflowVariable | null> {
    return this.prisma.workflowVariable.findUnique({ where: { id } });
  }

  async findByWorkflowId(workflowId: string): Promise<IWorkflowVariable[]> {
    return this.prisma.workflowVariable.findMany({
      where: { workflowId },
      orderBy: { key: 'asc' },
    });
  }

  async findByKey(workflowId: string, key: string): Promise<IWorkflowVariable | null> {
    return this.prisma.workflowVariable.findUnique({
      where: { workflowId_key: { workflowId, key } },
    });
  }

  async findMany(filter?: QueryFilter, options?: PaginationOptions): Promise<IWorkflowVariable[]> {
    return this.prisma.workflowVariable.findMany({
      where: filter as any,
      orderBy: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : { key: 'asc' },
      skip: options?.page && options?.limit ? (options.page - 1) * options.limit : undefined,
      take: options?.limit,
    });
  }

  async findManyPaginated(filter?: QueryFilter, options?: PaginationOptions): Promise<PaginatedResult<IWorkflowVariable>> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [data, total] = await Promise.all([
      this.findMany(filter, { ...options, page, limit }),
      this.count(filter),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(data: Omit<IWorkflowVariable, 'id' | 'createdAt' | 'updatedAt'>): Promise<IWorkflowVariable> {
    return this.prisma.workflowVariable.create({ data });
  }

  async update(id: string, data: Partial<Omit<IWorkflowVariable, 'id' | 'createdAt' | 'updatedAt'>>): Promise<IWorkflowVariable> {
    return this.prisma.workflowVariable.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.workflowVariable.delete({ where: { id } });
  }

  async count(filter?: QueryFilter): Promise<number> {
    return this.prisma.workflowVariable.count({ where: filter as any });
  }
}

// ============================================
// ENVIRONMENT REPOSITORY
// ============================================

class PrismaEnvironmentRepository implements IEnvironmentRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<IEnvironment | null> {
    return this.prisma.environment.findUnique({ where: { id } });
  }

  async findActive(): Promise<IEnvironment | null> {
    return this.prisma.environment.findFirst({ where: { isActive: true } });
  }

  async setActive(id: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.environment.updateMany({ data: { isActive: false } }),
      this.prisma.environment.update({ where: { id }, data: { isActive: true } }),
    ]);
  }

  async findMany(filter?: QueryFilter, options?: PaginationOptions): Promise<IEnvironment[]> {
    return this.prisma.environment.findMany({
      where: filter as any,
      orderBy: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : { name: 'asc' },
      skip: options?.page && options?.limit ? (options.page - 1) * options.limit : undefined,
      take: options?.limit,
    });
  }

  async findManyPaginated(filter?: QueryFilter, options?: PaginationOptions): Promise<PaginatedResult<IEnvironment>> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [data, total] = await Promise.all([
      this.findMany(filter, { ...options, page, limit }),
      this.count(filter),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(data: Omit<IEnvironment, 'id' | 'createdAt' | 'updatedAt'>): Promise<IEnvironment> {
    return this.prisma.environment.create({ data });
  }

  async update(id: string, data: Partial<Omit<IEnvironment, 'id' | 'createdAt' | 'updatedAt'>>): Promise<IEnvironment> {
    return this.prisma.environment.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.environment.delete({ where: { id } });
  }

  async count(filter?: QueryFilter): Promise<number> {
    return this.prisma.environment.count({ where: filter as any });
  }
}

// ============================================
// PROJECT CONTEXT
// ============================================

export class PrismaProjectContext implements IProjectDatabaseContext {
  readonly projectId: string;
  private prisma: PrismaClient;
  private connected = false;

  testDataSheets: ITestDataSheetRepository;
  testDataRows: ITestDataRowRepository;
  workflows: IWorkflowRepository;
  testFlows: ITestFlowRepository;
  globalVariables: IGlobalVariableRepository;
  workflowVariables: IWorkflowVariableRepository;
  environments: IEnvironmentRepository;

  constructor(projectId: string, dbPath: string) {
    this.projectId = projectId;

    // Set environment variable for Prisma
    process.env.PROJECT_DATABASE_URL = `file:${dbPath}`;

    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${dbPath}`,
        },
      },
    });

    // Initialize repositories
    this.testDataSheets = new PrismaTestDataSheetRepository(this.prisma);
    this.testDataRows = new PrismaTestDataRowRepository(this.prisma);
    this.workflows = new PrismaWorkflowRepository(this.prisma);
    this.testFlows = new PrismaTestFlowRepository(this.prisma);
    this.globalVariables = new PrismaGlobalVariableRepository(this.prisma);
    this.workflowVariables = new PrismaWorkflowVariableRepository(this.prisma);
    this.environments = new PrismaEnvironmentRepository(this.prisma);
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.prisma.$connect();
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.prisma.$disconnect();
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async () => fn());
  }
}
