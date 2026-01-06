/**
 * Audit Service
 * Track changes to schedules, configurations, and executions
 */

import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

export type AuditEntityType = 'schedule' | 'execution' | 'notification' | 'queue' | 'github_webhook';
export type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'triggered'
  | 'paused'
  | 'resumed'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'sent'
  | 'webhook_received';

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface AuditLogCreateInput {
  userId?: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
}

export interface AuditLogQuery {
  userId?: string;
  entityType?: AuditEntityType;
  entityId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

class AuditService {
  /**
   * Create a new audit log entry
   */
  async log(input: AuditLogCreateInput): Promise<AuditLogEntry> {
    try {
      const entry = await prisma.auditLog.create({
        data: {
          userId: input.userId || null,
          entityType: input.entityType,
          entityId: input.entityId,
          action: input.action,
          changes: input.changes ? JSON.stringify(input.changes) : null,
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        },
      });

      logger.debug(`Audit log created: ${input.action} on ${input.entityType}/${input.entityId}`);

      return this.formatEntry(entry);
    } catch (error) {
      logger.error('Failed to create audit log:', error);
      throw error;
    }
  }

  /**
   * Log a schedule action
   */
  async logScheduleAction(
    action: AuditAction,
    scheduleId: string,
    userId?: string,
    changes?: Record<string, { from: unknown; to: unknown }>,
    metadata?: Record<string, unknown>
  ): Promise<AuditLogEntry> {
    return this.log({
      userId,
      entityType: 'schedule',
      entityId: scheduleId,
      action,
      changes,
      metadata,
    });
  }

  /**
   * Log an execution action
   */
  async logExecutionAction(
    action: AuditAction,
    executionId: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditLogEntry> {
    return this.log({
      userId,
      entityType: 'execution',
      entityId: executionId,
      action,
      metadata,
    });
  }

  /**
   * Log a queue action
   */
  async logQueueAction(
    action: AuditAction,
    queueId: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditLogEntry> {
    return this.log({
      userId,
      entityType: 'queue',
      entityId: queueId,
      action,
      metadata,
    });
  }

  /**
   * Log a notification action
   */
  async logNotificationAction(
    action: AuditAction,
    notificationId: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditLogEntry> {
    return this.log({
      userId,
      entityType: 'notification',
      entityId: notificationId,
      action,
      metadata,
    });
  }

  /**
   * Log a GitHub webhook event
   */
  async logGitHubWebhook(
    action: AuditAction,
    webhookId: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditLogEntry> {
    return this.log({
      entityType: 'github_webhook',
      entityId: webhookId,
      action,
      metadata,
    });
  }

  /**
   * Query audit logs
   */
  async query(query: AuditLogQuery): Promise<{
    entries: AuditLogEntry[];
    total: number;
  }> {
    const where: Record<string, unknown> = {};

    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.entityType) {
      where.entityType = query.entityType;
    }
    if (query.entityId) {
      where.entityId = query.entityId;
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        (where.createdAt as Record<string, Date>).gte = query.startDate;
      }
      if (query.endDate) {
        (where.createdAt as Record<string, Date>).lte = query.endDate;
      }
    }

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit || 50,
        skip: query.offset || 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      entries: entries.map(e => this.formatEntry(e)),
      total,
    };
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityLogs(
    entityType: AuditEntityType,
    entityId: string,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    const entries = await prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return entries.map(e => this.formatEntry(e));
  }

  /**
   * Get recent audit logs for a user
   */
  async getUserLogs(userId: string, limit: number = 50): Promise<AuditLogEntry[]> {
    const entries = await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return entries.map(e => this.formatEntry(e));
  }

  /**
   * Clean up old audit logs (for maintenance)
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    logger.info(`Cleaned up ${result.count} audit logs older than ${daysToKeep} days`);
    return result.count;
  }

  /**
   * Format audit log entry for API response
   */
  private formatEntry(entry: any): AuditLogEntry {
    return {
      id: entry.id,
      userId: entry.userId,
      entityType: entry.entityType as AuditEntityType,
      entityId: entry.entityId,
      action: entry.action as AuditAction,
      changes: entry.changes ? JSON.parse(entry.changes) : null,
      metadata: entry.metadata ? JSON.parse(entry.metadata) : null,
      createdAt: entry.createdAt,
    };
  }
}

export const auditService = new AuditService();
export default auditService;
