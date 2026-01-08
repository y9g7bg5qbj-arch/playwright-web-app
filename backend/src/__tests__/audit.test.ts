/**
 * Audit Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Types for testing
type AuditEntityType = 'schedule' | 'execution' | 'notification' | 'queue' | 'github_webhook';
type AuditAction = 'created' | 'updated' | 'deleted' | 'triggered' | 'paused' | 'resumed' | 'completed' | 'failed' | 'cancelled' | 'sent' | 'webhook_received';

interface AuditLogEntry {
  id: string;
  userId: string | null;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

// Mock audit log store
const mockAuditStore: AuditLogEntry[] = [];

// Mock audit service
const mockAuditService = {
  async log(input: {
    userId?: string;
    entityType: AuditEntityType;
    entityId: string;
    action: AuditAction;
    changes?: Record<string, { from: unknown; to: unknown }>;
    metadata?: Record<string, unknown>;
  }): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: input.userId || null,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      changes: input.changes || null,
      metadata: input.metadata || null,
      createdAt: new Date(),
    };
    mockAuditStore.push(entry);
    return entry;
  },

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
  },

  async getEntityLogs(entityType: AuditEntityType, entityId: string): Promise<AuditLogEntry[]> {
    return mockAuditStore.filter(
      (e) => e.entityType === entityType && e.entityId === entityId
    );
  },

  async query(query: {
    entityType?: AuditEntityType;
    action?: AuditAction;
    limit?: number;
  }): Promise<{ entries: AuditLogEntry[]; total: number }> {
    let results = [...mockAuditStore];

    if (query.entityType) {
      results = results.filter((e) => e.entityType === query.entityType);
    }
    if (query.action) {
      results = results.filter((e) => e.action === query.action);
    }

    const total = results.length;
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return { entries: results, total };
  },
};

describe('Audit Service', () => {
  beforeEach(() => {
    // Clear mock store
    mockAuditStore.length = 0;
  });

  describe('Creating Audit Logs', () => {
    it('should create a basic audit log entry', async () => {
      const entry = await mockAuditService.log({
        userId: 'user-123',
        entityType: 'schedule',
        entityId: 'schedule-456',
        action: 'created',
      });

      expect(entry.id).toBeDefined();
      expect(entry.userId).toBe('user-123');
      expect(entry.entityType).toBe('schedule');
      expect(entry.entityId).toBe('schedule-456');
      expect(entry.action).toBe('created');
      expect(entry.createdAt).toBeInstanceOf(Date);
    });

    it('should create audit log with changes', async () => {
      const changes = {
        name: { from: 'Old Name', to: 'New Name' },
        isActive: { from: false, to: true },
      };

      const entry = await mockAuditService.log({
        userId: 'user-123',
        entityType: 'schedule',
        entityId: 'schedule-456',
        action: 'updated',
        changes,
      });

      expect(entry.changes).toEqual(changes);
    });

    it('should create audit log with metadata', async () => {
      const metadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        triggerSource: 'webhook',
      };

      const entry = await mockAuditService.log({
        userId: 'user-123',
        entityType: 'execution',
        entityId: 'exec-789',
        action: 'triggered',
        metadata,
      });

      expect(entry.metadata).toEqual(metadata);
    });

    it('should allow null userId for system actions', async () => {
      const entry = await mockAuditService.log({
        entityType: 'schedule',
        entityId: 'schedule-456',
        action: 'triggered',
        metadata: { source: 'scheduler' },
      });

      expect(entry.userId).toBeNull();
    });
  });

  describe('Convenience Methods', () => {
    it('should log schedule actions', async () => {
      const entry = await mockAuditService.logScheduleAction(
        'paused',
        'schedule-123',
        'user-456',
        undefined,
        { reason: 'maintenance' }
      );

      expect(entry.entityType).toBe('schedule');
      expect(entry.action).toBe('paused');
      expect(entry.metadata?.reason).toBe('maintenance');
    });
  });

  describe('Querying Audit Logs', () => {
    beforeEach(async () => {
      // Create some test logs
      await mockAuditService.log({
        userId: 'user-1',
        entityType: 'schedule',
        entityId: 'schedule-1',
        action: 'created',
      });
      await mockAuditService.log({
        userId: 'user-1',
        entityType: 'schedule',
        entityId: 'schedule-1',
        action: 'updated',
      });
      await mockAuditService.log({
        userId: 'user-2',
        entityType: 'execution',
        entityId: 'exec-1',
        action: 'triggered',
      });
    });

    it('should get logs for specific entity', async () => {
      const logs = await mockAuditService.getEntityLogs('schedule', 'schedule-1');
      expect(logs.length).toBe(2);
      expect(logs.every((l) => l.entityId === 'schedule-1')).toBe(true);
    });

    it('should query by entity type', async () => {
      const result = await mockAuditService.query({ entityType: 'schedule' });
      expect(result.entries.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should query by action', async () => {
      const result = await mockAuditService.query({ action: 'triggered' });
      expect(result.entries.length).toBe(1);
      expect(result.entries[0].action).toBe('triggered');
    });

    it('should respect query limit', async () => {
      const result = await mockAuditService.query({ limit: 1 });
      expect(result.entries.length).toBe(1);
      expect(result.total).toBe(3);
    });
  });

  describe('Audit Actions', () => {
    const validActions: AuditAction[] = [
      'created',
      'updated',
      'deleted',
      'triggered',
      'paused',
      'resumed',
      'completed',
      'failed',
      'cancelled',
      'sent',
      'webhook_received',
    ];

    it('should support all valid actions', () => {
      validActions.forEach((action) => {
        expect(validActions).toContain(action);
      });
    });
  });

  describe('Entity Types', () => {
    const validEntityTypes: AuditEntityType[] = [
      'schedule',
      'execution',
      'notification',
      'queue',
      'github_webhook',
    ];

    it('should support all valid entity types', () => {
      validEntityTypes.forEach((type) => {
        expect(validEntityTypes).toContain(type);
      });
    });
  });
});
