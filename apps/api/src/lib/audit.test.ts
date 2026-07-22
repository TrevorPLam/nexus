import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createAuditLog, createOutboxEvent, markOutboxEventProcessed } from './audit.js';

// Mock the db module
vi.mock('./db.js', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: '123', createdAt: new Date() }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: '123', processedAt: new Date() }])),
        })),
      })),
    })),
  },
}));

describe('Audit Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAuditLog', () => {
    it('creates audit log with correct data', async () => {
      const { db } = await import('./db.js');
      const result = await createAuditLog({
        userId: 'user-123',
        workspaceId: 'workspace-123',
        action: 'create',
        entityType: 'Task',
        entityId: 'task-123',
        changes: { title: 'New Task' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.insert).toHaveBeenCalledWith(expect.anything());
    });

    it('creates audit log with minimal required fields', async () => {
      const result = await createAuditLog({
        action: 'delete',
        entityType: 'Task',
        entityId: 'task-123',
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });

    it('creates audit log with update action', async () => {
      const result = await createAuditLog({
        action: 'update',
        entityType: 'Project',
        entityId: 'project-123',
        changes: { status: 'active' },
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });
  });

  describe('createOutboxEvent', () => {
    it('creates outbox event with correct data', async () => {
      const { db } = await import('./db.js');
      const result = await createOutboxEvent({
        eventType: 'TaskCreated',
        aggregateType: 'Task',
        aggregateId: 'task-123',
        payload: { title: 'New Task' },
        metadata: { source: 'api' },
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.insert).toHaveBeenCalledWith(expect.anything());
    });

    it('creates outbox event without metadata', async () => {
      const result = await createOutboxEvent({
        eventType: 'TaskUpdated',
        aggregateType: 'Task',
        aggregateId: 'task-123',
        payload: { status: 'done' },
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });
  });

  describe('markOutboxEventProcessed', () => {
    it('marks outbox event as processed', async () => {
      const { db } = await import('./db.js');
      const result = await markOutboxEventProcessed('event-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(result?.processedAt).toBeInstanceOf(Date);
      expect(db.update).toHaveBeenCalledWith(expect.anything());
    });
  });
});
