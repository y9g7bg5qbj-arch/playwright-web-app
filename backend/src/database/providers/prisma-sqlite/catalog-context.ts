/**
 * Prisma Catalog Database Context
 *
 * Implements the catalog database context using Prisma with SQLite.
 * This handles users, projects, executions, and schedules.
 */

import { PrismaClient } from '../../../../node_modules/.prisma/catalog-client';
import {
  ICatalogDatabaseContext,
  IUserRepository,
  IProjectRepository,
  IExecutionRepository,
  IScheduleRepository,
  IUser,
  IProject,
  IProjectMember,
  IExecution,
  ISchedule,
  QueryFilter,
  PaginationOptions,
  PaginatedResult,
} from '../../interfaces';

// ============================================
// USER REPOSITORY
// ============================================

class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<IUser | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findMany(filter?: QueryFilter, options?: PaginationOptions): Promise<IUser[]> {
    return this.prisma.user.findMany({
      where: filter as any,
      orderBy: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : undefined,
      skip: options?.page && options?.limit ? (options.page - 1) * options.limit : undefined,
      take: options?.limit,
    });
  }

  async findManyPaginated(filter?: QueryFilter, options?: PaginationOptions): Promise<PaginatedResult<IUser>> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [data, total] = await Promise.all([
      this.findMany(filter, { ...options, page, limit }),
      this.count(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUser> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Partial<Omit<IUser, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'>>): Promise<IUser> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async count(filter?: QueryFilter): Promise<number> {
    return this.prisma.user.count({ where: filter as any });
  }
}

// ============================================
// PROJECT REPOSITORY
// ============================================

class PrismaProjectRepository implements IProjectRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<IProject | null> {
    return this.prisma.project.findUnique({ where: { id } });
  }

  async findByUserId(userId: string): Promise<IProject[]> {
    return this.prisma.project.findMany({ where: { userId } });
  }

  async findByMembership(userId: string): Promise<IProject[]> {
    // Find projects where user is owner OR member
    const [owned, memberOf] = await Promise.all([
      this.prisma.project.findMany({ where: { userId } }),
      this.prisma.project.findMany({
        where: {
          members: {
            some: { userId },
          },
        },
      }),
    ]);

    // Combine and deduplicate
    const projectMap = new Map<string, IProject>();
    [...owned, ...memberOf].forEach(p => projectMap.set(p.id, p));
    return Array.from(projectMap.values());
  }

  async findWithMembers(id: string): Promise<(IProject & { members: IProjectMember[] }) | null> {
    return this.prisma.project.findUnique({
      where: { id },
      include: { members: true },
    }) as any;
  }

  async findMany(filter?: QueryFilter, options?: PaginationOptions): Promise<IProject[]> {
    return this.prisma.project.findMany({
      where: filter as any,
      orderBy: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : undefined,
      skip: options?.page && options?.limit ? (options.page - 1) * options.limit : undefined,
      take: options?.limit,
    });
  }

  async findManyPaginated(filter?: QueryFilter, options?: PaginationOptions): Promise<PaginatedResult<IProject>> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [data, total] = await Promise.all([
      this.findMany(filter, { ...options, page, limit }),
      this.count(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: Omit<IProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<IProject> {
    return this.prisma.project.create({ data });
  }

  async update(id: string, data: Partial<Omit<IProject, 'id' | 'createdAt' | 'updatedAt'>>): Promise<IProject> {
    return this.prisma.project.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.project.delete({ where: { id } });
  }

  async count(filter?: QueryFilter): Promise<number> {
    return this.prisma.project.count({ where: filter as any });
  }
}

// ============================================
// EXECUTION REPOSITORY
// ============================================

class PrismaExecutionRepository implements IExecutionRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<IExecution | null> {
    return this.prisma.execution.findUnique({ where: { id } }) as any;
  }

  async findByProjectId(projectId: string, options?: PaginationOptions): Promise<IExecution[]> {
    return this.prisma.execution.findMany({
      where: { projectId },
      orderBy: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'desc' } : { createdAt: 'desc' },
      skip: options?.page && options?.limit ? (options.page - 1) * options.limit : undefined,
      take: options?.limit,
    }) as any;
  }

  async findRecent(projectId: string, limit = 10): Promise<IExecution[]> {
    return this.prisma.execution.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as any;
  }

  async findMany(filter?: QueryFilter, options?: PaginationOptions): Promise<IExecution[]> {
    return this.prisma.execution.findMany({
      where: filter as any,
      orderBy: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'desc' } : { createdAt: 'desc' },
      skip: options?.page && options?.limit ? (options.page - 1) * options.limit : undefined,
      take: options?.limit,
    }) as any;
  }

  async findManyPaginated(filter?: QueryFilter, options?: PaginationOptions): Promise<PaginatedResult<IExecution>> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [data, total] = await Promise.all([
      this.findMany(filter, { ...options, page, limit }),
      this.count(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: Omit<IExecution, 'id' | 'createdAt'>): Promise<IExecution> {
    return this.prisma.execution.create({ data }) as any;
  }

  async update(id: string, data: Partial<Omit<IExecution, 'id' | 'createdAt'>>): Promise<IExecution> {
    return this.prisma.execution.update({ where: { id }, data }) as any;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.execution.delete({ where: { id } });
  }

  async count(filter?: QueryFilter): Promise<number> {
    return this.prisma.execution.count({ where: filter as any });
  }
}

// ============================================
// SCHEDULE REPOSITORY
// ============================================

class PrismaScheduleRepository implements IScheduleRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<ISchedule | null> {
    const schedule = await this.prisma.schedule.findUnique({ where: { id } });
    return schedule ? this.mapSchedule(schedule) : null;
  }

  async findByProjectId(projectId: string): Promise<ISchedule[]> {
    const schedules = await this.prisma.schedule.findMany({ where: { projectId } });
    return schedules.map(s => this.mapSchedule(s));
  }

  async findDueSchedules(): Promise<ISchedule[]> {
    const schedules = await this.prisma.schedule.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: new Date() },
      },
    });
    return schedules.map(s => this.mapSchedule(s));
  }

  async findByWebhookToken(token: string): Promise<ISchedule | null> {
    const schedule = await this.prisma.schedule.findUnique({ where: { webhookToken: token } });
    return schedule ? this.mapSchedule(schedule) : null;
  }

  async findMany(filter?: QueryFilter, options?: PaginationOptions): Promise<ISchedule[]> {
    const schedules = await this.prisma.schedule.findMany({
      where: filter as any,
      orderBy: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : undefined,
      skip: options?.page && options?.limit ? (options.page - 1) * options.limit : undefined,
      take: options?.limit,
    });
    return schedules.map(s => this.mapSchedule(s));
  }

  async findManyPaginated(filter?: QueryFilter, options?: PaginationOptions): Promise<PaginatedResult<ISchedule>> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [data, total] = await Promise.all([
      this.findMany(filter, { ...options, page, limit }),
      this.count(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: Omit<ISchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ISchedule> {
    const schedule = await this.prisma.schedule.create({
      data: {
        ...data,
        testSelector: JSON.stringify(data.testSelector),
        notificationConfig: data.notificationConfig ? JSON.stringify(data.notificationConfig) : null,
      },
    });
    return this.mapSchedule(schedule);
  }

  async update(id: string, data: Partial<Omit<ISchedule, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ISchedule> {
    const updateData: any = { ...data };
    if (data.testSelector) {
      updateData.testSelector = JSON.stringify(data.testSelector);
    }
    if (data.notificationConfig !== undefined) {
      updateData.notificationConfig = data.notificationConfig ? JSON.stringify(data.notificationConfig) : null;
    }

    const schedule = await this.prisma.schedule.update({ where: { id }, data: updateData });
    return this.mapSchedule(schedule);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.schedule.delete({ where: { id } });
  }

  async count(filter?: QueryFilter): Promise<number> {
    return this.prisma.schedule.count({ where: filter as any });
  }

  private mapSchedule(schedule: any): ISchedule {
    return {
      ...schedule,
      testSelector: typeof schedule.testSelector === 'string'
        ? JSON.parse(schedule.testSelector)
        : schedule.testSelector,
      notificationConfig: schedule.notificationConfig
        ? (typeof schedule.notificationConfig === 'string'
            ? JSON.parse(schedule.notificationConfig)
            : schedule.notificationConfig)
        : null,
    };
  }
}

// ============================================
// CATALOG CONTEXT
// ============================================

export class PrismaCatalogContext implements ICatalogDatabaseContext {
  private prisma: PrismaClient;
  private connected = false;

  users: IUserRepository;
  projects: IProjectRepository;
  executions: IExecutionRepository;
  schedules: IScheduleRepository;

  constructor(dbPath: string) {
    // Set environment variable for Prisma
    process.env.CATALOG_DATABASE_URL = `file:${dbPath}`;

    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${dbPath}`,
        },
      },
    });

    // Initialize repositories
    this.users = new PrismaUserRepository(this.prisma);
    this.projects = new PrismaProjectRepository(this.prisma);
    this.executions = new PrismaExecutionRepository(this.prisma);
    this.schedules = new PrismaScheduleRepository(this.prisma);
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
