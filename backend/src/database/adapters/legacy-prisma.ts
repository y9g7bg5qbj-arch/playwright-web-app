/**
 * Legacy Prisma Adapter
 *
 * This adapter wraps the existing single-database Prisma client
 * with the new repository interfaces. It allows gradual migration
 * to the multi-database architecture.
 *
 * Usage:
 * - Import this instead of direct Prisma calls
 * - When ready for multi-DB, switch to the full provider
 */

import { prisma } from '../../db/prisma';
import {
  ITestDataSheetRepository,
  ITestDataRowRepository,
  IWorkflowRepository,
  ITestFlowRepository,
  IGlobalVariableRepository,
  IProjectRepository,
  IUserRepository,
  ITestDataSheet,
  ITestDataRow,
  IWorkflow,
  ITestFlow,
  IGlobalVariable,
  IProject,
  IUser,
  QueryFilter,
  PaginationOptions,
  PaginatedResult,
} from '../interfaces';

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseJson<T>(value: string | null | undefined, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return defaultValue;
  }
}

// ============================================
// TEST DATA SHEET REPOSITORY
// ============================================

class LegacyTestDataSheetRepository implements ITestDataSheetRepository {
  constructor(private projectId: string) {}

  async findById(id: string): Promise<ITestDataSheet | null> {
    const sheet = await prisma.testDataSheet.findUnique({ where: { id } });
    return sheet ? this.map(sheet) : null;
  }

  async findByName(name: string): Promise<ITestDataSheet | null> {
    const sheet = await prisma.testDataSheet.findFirst({
      where: { applicationId: this.projectId, name }
    });
    return sheet ? this.map(sheet) : null;
  }

  async findWithRows(id: string): Promise<(ITestDataSheet & { rows: ITestDataRow[] }) | null> {
    const sheet = await prisma.testDataSheet.findUnique({
      where: { id },
      include: { rows: { orderBy: { scenarioId: 'asc' } } }
    });

    if (!sheet) return null;

    return {
      ...this.map(sheet),
      rows: sheet.rows.map(r => ({
        id: r.id,
        sheetId: r.sheetId,
        scenarioId: r.scenarioId,
        data: parseJson(r.data, {}),
        enabled: r.enabled,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }))
    };
  }

  async getSchema(): Promise<Array<{ name: string; columns: Array<{ name: string; type: string }> }>> {
    const sheets = await prisma.testDataSheet.findMany({
      where: { applicationId: this.projectId },
      select: { name: true, columns: true }
    });

    return sheets.map(s => ({
      name: s.name,
      columns: parseJson(s.columns, [])
    }));
  }

  async findMany(filter?: QueryFilter, options?: PaginationOptions): Promise<ITestDataSheet[]> {
    const sheets = await prisma.testDataSheet.findMany({
      where: { applicationId: this.projectId, ...filter as any },
      orderBy: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : { name: 'asc' },
      skip: options?.page && options?.limit ? (options.page - 1) * options.limit : undefined,
      take: options?.limit,
    });
    return sheets.map(s => this.map(s));
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
    const sheet = await prisma.testDataSheet.create({
      data: {
        applicationId: this.projectId,
        name: data.name,
        pageObject: data.pageObject,
        description: data.description,
        columns: JSON.stringify(data.columns)
      }
    });
    return this.map(sheet);
  }

  async update(id: string, data: Partial<Omit<ITestDataSheet, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ITestDataSheet> {
    const updateData: any = { ...data };
    if (data.columns) updateData.columns = JSON.stringify(data.columns);

    const sheet = await prisma.testDataSheet.update({ where: { id }, data: updateData });
    return this.map(sheet);
  }

  async delete(id: string): Promise<void> {
    await prisma.testDataSheet.delete({ where: { id } });
  }

  async count(filter?: QueryFilter): Promise<number> {
    return prisma.testDataSheet.count({
      where: { projectId: this.projectId, ...filter as any }
    });
  }

  private map(sheet: any): ITestDataSheet {
    return {
      id: sheet.id,
      name: sheet.name,
      pageObject: sheet.pageObject,
      description: sheet.description,
      columns: parseJson(sheet.columns, []),
      createdAt: sheet.createdAt,
      updatedAt: sheet.updatedAt,
    };
  }
}

// ============================================
// TEST DATA ROW REPOSITORY
// ============================================

class LegacyTestDataRowRepository implements ITestDataRowRepository {
  async findById(id: string): Promise<ITestDataRow | null> {
    const row = await prisma.testDataRow.findUnique({ where: { id } });
    return row ? this.map(row) : null;
  }

  async findBySheetId(sheetId: string): Promise<ITestDataRow[]> {
    const rows = await prisma.testDataRow.findMany({
      where: { sheetId },
      orderBy: { scenarioId: 'asc' }
    });
    return rows.map(r => this.map(r));
  }

  async findByScenarioId(sheetId: string, scenarioId: string): Promise<ITestDataRow | null> {
    const row = await prisma.testDataRow.findUnique({
      where: { sheetId_scenarioId: { sheetId, scenarioId } }
    });
    return row ? this.map(row) : null;
  }

  async findMany(filter?: QueryFilter, options?: PaginationOptions): Promise<ITestDataRow[]> {
    const rows = await prisma.testDataRow.findMany({
      where: filter as any,
      orderBy: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : { scenarioId: 'asc' },
      skip: options?.page && options?.limit ? (options.page - 1) * options.limit : undefined,
      take: options?.limit,
    });
    return rows.map(r => this.map(r));
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
    const row = await prisma.testDataRow.create({
      data: {
        sheetId: data.sheetId,
        scenarioId: data.scenarioId,
        data: JSON.stringify(data.data),
        enabled: data.enabled
      }
    });
    return this.map(row);
  }

  async bulkCreate(rows: Array<Omit<ITestDataRow, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ITestDataRow[]> {
    const created: ITestDataRow[] = [];
    for (const rowData of rows) {
      created.push(await this.create(rowData));
    }
    return created;
  }

  async update(id: string, data: Partial<Omit<ITestDataRow, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ITestDataRow> {
    const updateData: any = { ...data };
    if (data.data) updateData.data = JSON.stringify(data.data);

    const row = await prisma.testDataRow.update({ where: { id }, data: updateData });
    return this.map(row);
  }

  async delete(id: string): Promise<void> {
    await prisma.testDataRow.delete({ where: { id } });
  }

  async bulkDelete(ids: string[]): Promise<void> {
    await prisma.testDataRow.deleteMany({ where: { id: { in: ids } } });
  }

  async count(filter?: QueryFilter): Promise<number> {
    return prisma.testDataRow.count({ where: filter as any });
  }

  private map(row: any): ITestDataRow {
    return {
      id: row.id,
      sheetId: row.sheetId,
      scenarioId: row.scenarioId,
      data: parseJson(row.data, {}),
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

// ============================================
// PROJECT REPOSITORY
// ============================================

class LegacyProjectRepository implements Partial<IProjectRepository> {
  async findById(id: string): Promise<IProject | null> {
    const project = await prisma.project.findUnique({ where: { id } });
    return project ? this.map(project) : null;
  }

  async findByUserId(userId: string): Promise<IProject[]> {
    // Projects are now nested under Applications, so find via Application
    const projects = await prisma.project.findMany({
      where: {
        application: { userId }
      }
    });
    return projects.map(p => this.map(p));
  }

  async findByMembership(userId: string): Promise<IProject[]> {
    // Projects are accessed via Application membership
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { application: { userId } },
          { application: { members: { some: { userId } } } }
        ]
      }
    });

    const projectMap = new Map<string, any>();
    projects.forEach(p => projectMap.set(p.id, p));
    return Array.from(projectMap.values()).map(p => this.map(p));
  }

  async create(data: any): Promise<IProject> {
    const project = await prisma.project.create({ data });
    return this.map(project);
  }

  async update(id: string, data: any): Promise<IProject> {
    const project = await prisma.project.update({ where: { id }, data });
    return this.map(project);
  }

  async delete(id: string): Promise<void> {
    await prisma.project.delete({ where: { id } });
  }

  private map(project: any): IProject {
    return {
      id: project.id,
      userId: project.applicationId, // Map applicationId to userId for legacy interface
      name: project.name,
      description: project.description,
      dbPath: `projects/${project.id}.db`,
      veroPath: project.veroPath,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}

// ============================================
// USER REPOSITORY
// ============================================

class LegacyUserRepository implements Partial<IUserRepository> {
  async findById(id: string): Promise<IUser | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user || null;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    return user || null;
  }

  async create(data: any): Promise<IUser> {
    return prisma.user.create({ data });
  }

  async update(id: string, data: any): Promise<IUser> {
    return prisma.user.update({ where: { id }, data });
  }
}

// ============================================
// LEGACY DATABASE CONTEXT
// ============================================

/**
 * Project-scoped database context using legacy single-database
 */
export class LegacyProjectContext {
  readonly projectId: string;
  readonly testDataSheets: ITestDataSheetRepository;
  readonly testDataRows: ITestDataRowRepository;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.testDataSheets = new LegacyTestDataSheetRepository(projectId);
    this.testDataRows = new LegacyTestDataRowRepository();
  }
}

/**
 * Catalog context using legacy single-database
 */
export class LegacyCatalogContext {
  readonly users = new LegacyUserRepository();
  readonly projects = new LegacyProjectRepository();
}

// ============================================
// SINGLETON ACCESS
// ============================================

const catalogContext = new LegacyCatalogContext();
const projectContextCache = new Map<string, LegacyProjectContext>();

/**
 * Get catalog repositories (users, projects)
 */
export function getCatalog(): LegacyCatalogContext {
  return catalogContext;
}

/**
 * Get project-scoped repositories
 */
export function getProjectContext(projectId: string): LegacyProjectContext {
  if (!projectContextCache.has(projectId)) {
    projectContextCache.set(projectId, new LegacyProjectContext(projectId));
  }
  return projectContextCache.get(projectId)!;
}

/**
 * Clear project context cache (for memory management)
 */
export function clearProjectContextCache(): void {
  projectContextCache.clear();
}
