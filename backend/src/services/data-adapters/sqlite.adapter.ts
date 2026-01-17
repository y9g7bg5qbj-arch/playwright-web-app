/**
 * SQLite Data Adapter
 *
 * Implements the DataAdapter interface using Prisma with SQLite.
 * This is the default adapter when no external database is configured.
 */

import { prisma } from '../../db/prisma';
import {
  DataAdapter,
  TestDataSheet,
  TestDataSheetCreate,
  TestDataSheetUpdate,
  TestDataRow,
  TestDataRowCreate,
  TestDataRowUpdate,
  QueryOptions,
  QueryResult,
  ConnectionTestResult,
  ColumnDefinition,
} from './types';

// ============================================
// SQLITE ADAPTER
// ============================================

export class SQLiteAdapter implements DataAdapter {
  private connected = false;

  // ============================================
  // LIFECYCLE
  // ============================================

  async connect(): Promise<void> {
    // Prisma manages connections automatically
    // Just verify the connection works
    try {
      await prisma.$queryRaw`SELECT 1`;
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // Prisma manages connection pooling
    // We don't disconnect explicitly
    this.connected = false;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      await prisma.$queryRaw`SELECT sqlite_version()`;

      return {
        success: true,
        latency: Date.now() - startTime,
        serverInfo: {
          version: 'SQLite (Prisma)',
          platform: 'local',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      };
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ============================================
  // SHEET OPERATIONS
  // ============================================

  async createSheet(sheet: TestDataSheetCreate): Promise<TestDataSheet> {
    const created = await prisma.testDataSheet.create({
      data: {
        applicationId: sheet.applicationId,
        name: sheet.name,
        pageObject: sheet.pageObject,
        description: sheet.description,
        columns: JSON.stringify(sheet.columns || []),
      },
    });

    return this.formatSheet(created);
  }

  async getSheet(id: string): Promise<TestDataSheet | null> {
    const sheet = await prisma.testDataSheet.findUnique({
      where: { id },
    });

    return sheet ? this.formatSheet(sheet) : null;
  }

  async getSheetByName(applicationId: string, name: string): Promise<TestDataSheet | null> {
    const sheet = await prisma.testDataSheet.findFirst({
      where: { applicationId, name },
    });

    return sheet ? this.formatSheet(sheet) : null;
  }

  async getAllSheets(applicationId: string): Promise<TestDataSheet[]> {
    const sheets = await prisma.testDataSheet.findMany({
      where: { applicationId },
      orderBy: { name: 'asc' },
    });

    return sheets.map(s => this.formatSheet(s));
  }

  async updateSheet(id: string, data: TestDataSheetUpdate): Promise<TestDataSheet> {
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.pageObject !== undefined) updateData.pageObject = data.pageObject;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.columns !== undefined) updateData.columns = JSON.stringify(data.columns);

    const updated = await prisma.testDataSheet.update({
      where: { id },
      data: updateData,
    });

    return this.formatSheet(updated);
  }

  async deleteSheet(id: string): Promise<void> {
    // Prisma will cascade delete rows due to relation config
    await prisma.testDataSheet.delete({
      where: { id },
    });
  }

  // ============================================
  // ROW OPERATIONS
  // ============================================

  async createRow(row: TestDataRowCreate): Promise<TestDataRow> {
    const created = await prisma.testDataRow.create({
      data: {
        sheetId: row.sheetId,
        scenarioId: row.scenarioId,
        data: JSON.stringify(row.data || {}),
        enabled: row.enabled ?? true,
      },
    });

    return this.formatRow(created);
  }

  async getRow(id: string): Promise<TestDataRow | null> {
    const row = await prisma.testDataRow.findUnique({
      where: { id },
    });

    return row ? this.formatRow(row) : null;
  }

  async getRows(sheetId: string): Promise<TestDataRow[]> {
    const rows = await prisma.testDataRow.findMany({
      where: { sheetId },
      orderBy: { scenarioId: 'asc' },
    });

    return rows.map(r => this.formatRow(r));
  }

  async updateRow(id: string, data: TestDataRowUpdate): Promise<TestDataRow> {
    const updateData: any = {};

    if (data.scenarioId !== undefined) updateData.scenarioId = data.scenarioId;
    if (data.data !== undefined) updateData.data = JSON.stringify(data.data);
    if (data.enabled !== undefined) updateData.enabled = data.enabled;

    const updated = await prisma.testDataRow.update({
      where: { id },
      data: updateData,
    });

    return this.formatRow(updated);
  }

  async deleteRow(id: string): Promise<void> {
    await prisma.testDataRow.delete({
      where: { id },
    });
  }

  async bulkCreateRows(
    sheetId: string,
    rows: Array<Omit<TestDataRowCreate, 'sheetId'>>
  ): Promise<TestDataRow[]> {
    if (rows.length === 0) return [];

    // SQLite doesn't support returning from createMany
    // So we need to create individually or use a transaction
    const created = await prisma.$transaction(
      rows.map(row =>
        prisma.testDataRow.create({
          data: {
            sheetId,
            scenarioId: row.scenarioId,
            data: JSON.stringify(row.data || {}),
            enabled: row.enabled ?? true,
          },
        })
      )
    );

    return created.map(r => this.formatRow(r));
  }

  async bulkDeleteRows(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    await prisma.testDataRow.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async bulkUpdateRows(
    updates: Array<{ id: string; data: TestDataRowUpdate }>
  ): Promise<TestDataRow[]> {
    if (updates.length === 0) return [];

    const updated = await prisma.$transaction(
      updates.map(update => {
        const updateData: any = {};

        if (update.data.scenarioId !== undefined) {
          updateData.scenarioId = update.data.scenarioId;
        }
        if (update.data.data !== undefined) {
          updateData.data = JSON.stringify(update.data.data);
        }
        if (update.data.enabled !== undefined) {
          updateData.enabled = update.data.enabled;
        }

        return prisma.testDataRow.update({
          where: { id: update.id },
          data: updateData,
        });
      })
    );

    return updated.map(r => this.formatRow(r));
  }

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  async queryRows(sheetId: string, options: QueryOptions): Promise<QueryResult<TestDataRow>> {
    const where: any = { sheetId };

    // Apply filters
    if (options.filter) {
      if (options.filter.scenarioId) {
        where.scenarioId = options.filter.scenarioId;
      }
      if (options.filter.enabled !== undefined) {
        where.enabled = options.filter.enabled;
      }
      // Note: SQLite JSON filtering is limited
      // For complex data filters, we'll need to filter in JS
    }

    // Apply search
    if (options.search) {
      where.OR = [
        { scenarioId: { contains: options.search } },
        { data: { contains: options.search } },
      ];
    }

    // Get total count
    const total = await prisma.testDataRow.count({ where });

    // Build orderBy
    let orderBy: any = { scenarioId: 'asc' };
    if (options.sort && options.sort.length > 0) {
      // SQLite/Prisma can only sort on actual columns
      // For data fields, we'd need to sort in JS
      const firstSort = options.sort[0];
      if (firstSort.field === 'scenarioId') {
        orderBy = { scenarioId: firstSort.direction };
      } else if (firstSort.field === 'createdAt') {
        orderBy = { createdAt: firstSort.direction };
      } else if (firstSort.field === 'updatedAt') {
        orderBy = { updatedAt: firstSort.direction };
      }
    }

    // Pagination
    const skip = options.skip || 0;
    const limit = options.limit || 100;

    const rows = await prisma.testDataRow.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    });

    return {
      rows: rows.map(r => this.formatRow(r)),
      total,
      skip,
      limit,
    };
  }

  // ============================================
  // REFERENCE RESOLUTION
  // ============================================

  async resolveReferences(
    sheetId: string,
    rowId: string,
    columns: string[]
  ): Promise<Record<string, any[]>> {
    const sheet = await this.getSheet(sheetId);
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetId}`);
    }

    const row = await this.getRow(rowId);
    if (!row) {
      throw new Error(`Row not found: ${rowId}`);
    }

    const results: Record<string, any[]> = {};

    for (const colName of columns) {
      const column = sheet.columns.find(c => c.name === colName);
      if (!column?.referenceConfig) {
        results[colName] = [];
        continue;
      }

      const value = row.data[colName];
      if (!value) {
        results[colName] = [];
        continue;
      }

      // Parse IDs
      const separator = column.referenceConfig.separator || ',';
      const ids = String(value)
        .split(separator)
        .map(id => id.trim())
        .filter(Boolean);

      if (ids.length === 0) {
        results[colName] = [];
        continue;
      }

      // Get target sheet
      const targetSheet = await this.getSheetByName(
        sheet.applicationId,
        column.referenceConfig.targetSheet
      );

      if (!targetSheet) {
        results[colName] = [];
        continue;
      }

      // Get all rows from target sheet
      const targetRows = await this.getRows(targetSheet.id);

      // Filter to matched rows
      const targetColumn = column.referenceConfig.targetColumn;
      const matchedRows = targetRows.filter(r =>
        ids.includes(String(r.data[targetColumn]))
      );

      results[colName] = matchedRows.map(r => r.data);
    }

    return results;
  }

  async expandRows(
    sheetId: string,
    rowIds: string[],
    columns: string[]
  ): Promise<Map<string, Record<string, any[]>>> {
    const results = new Map<string, Record<string, any[]>>();

    await Promise.all(
      rowIds.map(async rowId => {
        const resolved = await this.resolveReferences(sheetId, rowId, columns);
        results.set(rowId, resolved);
      })
    );

    return results;
  }

  // ============================================
  // FORMAT HELPERS
  // ============================================

  private formatSheet(sheet: any): TestDataSheet {
    let columns: ColumnDefinition[] = [];
    try {
      columns = typeof sheet.columns === 'string'
        ? JSON.parse(sheet.columns)
        : sheet.columns || [];
    } catch {
      columns = [];
    }

    return {
      id: sheet.id,
      applicationId: sheet.applicationId,
      name: sheet.name,
      pageObject: sheet.pageObject || undefined,
      description: sheet.description || undefined,
      columns,
      createdAt: sheet.createdAt,
      updatedAt: sheet.updatedAt,
    };
  }

  private formatRow(row: any): TestDataRow {
    let data: Record<string, any> = {};
    try {
      data = typeof row.data === 'string'
        ? JSON.parse(row.data)
        : row.data || {};
    } catch {
      data = {};
    }

    return {
      id: row.id,
      sheetId: row.sheetId,
      scenarioId: row.scenarioId,
      data,
      enabled: row.enabled ?? true,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export default SQLiteAdapter;
