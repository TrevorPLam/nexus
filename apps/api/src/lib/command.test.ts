import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeCommand,
  executeCommandWithoutIdempotency,
  CommandContext,
} from './command-context.js';
import { checkIdempotencyKey, createIdempotencyKey } from './idempotency.js';
import { createAuditLog, createOutboxEvent } from './audit.js';

// Mock the dependencies
vi.mock('./idempotency.js');
vi.mock('./audit.js');
vi.mock('./db.js', () => ({
  db: {
    transaction: vi.fn(),
  },
}));

describe('Command Pattern - Implementation Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Transaction Boundaries', () => {
    it('should wrap task creation in a transaction', async () => {
      const { db } = await import('./db.js');
      const mockCommand = vi.fn().mockResolvedValue({ id: 'task-1' });
      (db.transaction as any).mockImplementation(async (callback) => {
        return callback({}); // Mock transaction object
      });

      const context: CommandContext = {
        userId: 'user-1',
        workspaceId: 'workspace-1',
      };

      await executeCommand(context, mockCommand);

      expect(db.transaction).toHaveBeenCalled();
      expect(mockCommand).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const { db } = await import('./db.js');
      const mockCommand = vi.fn().mockRejectedValue(new Error('Domain write failed'));
      (db.transaction as any).mockImplementation(async (callback) => {
        try {
          return callback({});
        } catch (error) {
          throw error; // Transaction should rollback on error
        }
      });

      const context: CommandContext = {
        userId: 'user-1',
        workspaceId: 'workspace-1',
      };

      await expect(executeCommand(context, mockCommand)).rejects.toThrow('Domain write failed');
    });
  });

  describe('Audit Log Creation', () => {
    it('should create audit log on task creation', async () => {
      const { db } = await import('./db.js');
      const mockCommand = vi.fn().mockResolvedValue({ id: 'task-1' });
      (db.transaction as any).mockImplementation(async (callback) => {
        return callback({});
      });

      const context: CommandContext = {
        userId: 'user-1',
        workspaceId: 'workspace-1',
      };

      await executeCommand(context, mockCommand, {
        action: 'create',
        entityType: 'task',
        entityId: 'task-1',
      });

      expect(createAuditLog).toHaveBeenCalledWith({
        userId: 'user-1',
        workspaceId: 'workspace-1',
        action: 'create',
        entityType: 'task',
        entityId: 'task-1',
        changes: {},
      });
    });

    it('should create audit log on task update', async () => {
      const { db } = await import('./db.js');
      const mockCommand = vi.fn().mockResolvedValue({ id: 'task-1' });
      (db.transaction as any).mockImplementation(async (callback) => {
        return callback({});
      });

      const context: CommandContext = {
        userId: 'user-1',
        workspaceId: 'workspace-1',
      };

      await executeCommand(context, mockCommand, {
        action: 'update',
        entityType: 'task',
        entityId: 'task-1',
        changes: { status: 'done' },
      });

      expect(createAuditLog).toHaveBeenCalledWith({
        userId: 'user-1',
        workspaceId: 'workspace-1',
        action: 'update',
        entityType: 'task',
        entityId: 'task-1',
        changes: { status: 'done' },
      });
    });

    it('should create audit log on task deletion', async () => {
      const { db } = await import('./db.js');
      const mockCommand = vi.fn().mockResolvedValue({ id: 'task-1' });
      (db.transaction as any).mockImplementation(async (callback) => {
        return callback({});
      });

      const context: CommandContext = {
        userId: 'user-1',
        workspaceId: 'workspace-1',
      };

      await executeCommand(context, mockCommand, {
        action: 'delete',
        entityType: 'task',
        entityId: 'task-1',
      });

      expect(createAuditLog).toHaveBeenCalledWith({
        userId: 'user-1',
        workspaceId: 'workspace-1',
        action: 'delete',
        entityType: 'task',
        entityId: 'task-1',
        changes: {},
      });
    });
  });

  describe('Outbox Event Creation', () => {
    it('should create outbox event on task creation', async () => {
      const { db } = await import('./db.js');
      const mockCommand = vi.fn().mockResolvedValue({ id: 'task-1' });
      (db.transaction as any).mockImplementation(async (callback) => {
        return callback({});
      });

      const context: CommandContext = {
        userId: 'user-1',
        workspaceId: 'workspace-1',
      };

      await executeCommand(context, mockCommand, undefined, {
        eventType: 'task.created',
        aggregateType: 'task',
        aggregateId: 'task-1',
        payload: { id: 'task-1' },
      });

      expect(createOutboxEvent).toHaveBeenCalledWith({
        eventType: 'task.created',
        aggregateType: 'task',
        aggregateId: 'task-1',
        payload: { id: 'task-1' },
      });
    });

    it('should create outbox event on task update', async () => {
      const { db } = await import('./db.js');
      const mockCommand = vi.fn().mockResolvedValue({ id: 'task-1' });
      (db.transaction as any).mockImplementation(async (callback) => {
        return callback({});
      });

      const context: CommandContext = {
        userId: 'user-1',
        workspaceId: 'workspace-1',
      };

      await executeCommand(context, mockCommand, undefined, {
        eventType: 'task.updated',
        aggregateType: 'task',
        aggregateId: 'task-1',
        payload: { id: 'task-1', status: 'done' },
      });

      expect(createOutboxEvent).toHaveBeenCalledWith({
        eventType: 'task.updated',
        aggregateType: 'task',
        aggregateId: 'task-1',
        payload: { id: 'task-1', status: 'done' },
      });
    });

    it('should create outbox event on task deletion', async () => {
      const { db } = await import('./db.js');
      const mockCommand = vi.fn().mockResolvedValue({ id: 'task-1' });
      (db.transaction as any).mockImplementation(async (callback) => {
        return callback({});
      });

      const context: CommandContext = {
        userId: 'user-1',
        workspaceId: 'workspace-1',
      };

      await executeCommand(context, mockCommand, undefined, {
        eventType: 'task.deleted',
        aggregateType: 'task',
        aggregateId: 'task-1',
        payload: { id: 'task-1' },
      });

      expect(createOutboxEvent).toHaveBeenCalledWith({
        eventType: 'task.deleted',
        aggregateType: 'task',
        aggregateId: 'task-1',
        payload: { id: 'task-1' },
      });
    });
  });

  describe('Idempotency Key Handling', () => {
    it('should check idempotency key before executing command', async () => {
      const { db } = await import('./db.js');
      const mockCommand = vi.fn().mockResolvedValue({ id: 'task-1' });
      (db.transaction as any).mockImplementation(async (callback) => {
        return callback({});
      });

      const context: CommandContext = {
        userId: 'user-1',
        workspaceId: 'workspace-1',
        idempotencyKey: 'key-123',
        endpoint: '/api/work/tasks',
      };

      vi.mocked(checkIdempotencyKey).mockResolvedValue({ isDuplicate: false });

      await executeCommand(context, mockCommand);

      expect(checkIdempotencyKey).toHaveBeenCalledWith('key-123', 'user-1', '/api/work/tasks');
    });

    it('should return cached response on duplicate idempotency key', async () => {
      const { db } = await import('./db.js');
      const mockCommand = vi.fn().mockResolvedValue({ id: 'task-1' });
      (db.transaction as any).mockImplementation(async (callback) => {
        return callback({});
      });

      const context: CommandContext = {
        userId: 'user-1',
        workspaceId: 'workspace-1',
        idempotencyKey: 'key-123',
        endpoint: '/api/work/tasks',
      };

      vi.mocked(checkIdempotencyKey).mockResolvedValue({
        isDuplicate: true,
        responseStatus: '200',
        responseBody: { id: 'task-1' },
      });

      const result = await executeCommand(context, mockCommand);

      expect(result).toEqual({
        data: { id: 'task-1' },
        isIdempotent: true,
      });
      expect(mockCommand).not.toHaveBeenCalled();
    });

    it('should store idempotency key after successful command', async () => {
      const { db } = await import('./db.js');
      const mockCommand = vi.fn().mockResolvedValue({ id: 'task-1' });
      (db.transaction as any).mockImplementation(async (callback) => {
        return callback({});
      });

      const context: CommandContext = {
        userId: 'user-1',
        workspaceId: 'workspace-1',
        idempotencyKey: 'key-123',
        endpoint: '/api/work/tasks',
      };

      vi.mocked(checkIdempotencyKey).mockResolvedValue({ isDuplicate: false });

      await executeCommand(context, mockCommand);

      expect(createIdempotencyKey).toHaveBeenCalledWith({
        key: 'key-123',
        userId: 'user-1',
        endpoint: '/api/work/tasks',
        responseStatus: '200',
        responseBody: { id: 'task-1' },
      });
    });
  });

  describe('Atomic Audit and Outbox in Transaction', () => {
    it('should commit audit and outbox together with domain write', async () => {
      const { db } = await import('./db.js');
      const mockCommand = vi.fn().mockResolvedValue({ id: 'task-1' });
      (db.transaction as any).mockImplementation(async (callback) => {
        return callback({});
      });

      const context: CommandContext = {
        userId: 'user-1',
        workspaceId: 'workspace-1',
      };

      await executeCommand(
        context,
        mockCommand,
        {
          action: 'create',
          entityType: 'task',
          entityId: 'task-1',
        },
        {
          eventType: 'task.created',
          aggregateType: 'task',
          aggregateId: 'task-1',
          payload: { id: 'task-1' },
        },
      );

      expect(createAuditLog).toHaveBeenCalled();
      expect(createOutboxEvent).toHaveBeenCalled();
      expect(db.transaction).toHaveBeenCalled();
    });

    it('should rollback audit and outbox on domain write failure', async () => {
      const { db } = await import('./db.js');
      const mockCommand = vi.fn().mockRejectedValue(new Error('Domain write failed'));
      (db.transaction as any).mockImplementation(async (callback) => {
        try {
          return callback({});
        } catch (error) {
          throw error;
        }
      });

      const context: CommandContext = {
        userId: 'user-1',
        workspaceId: 'workspace-1',
      };

      await expect(
        executeCommand(
          context,
          mockCommand,
          {
            action: 'create',
            entityType: 'task',
            entityId: 'task-1',
          },
          {
            eventType: 'task.created',
            aggregateType: 'task',
            aggregateId: 'task-1',
            payload: { id: 'task-1' },
          },
        ),
      ).rejects.toThrow('Domain write failed');

      // Transaction should rollback, so audit/outbox should not be committed
      expect(createAuditLog).not.toHaveBeenCalled();
      expect(createOutboxEvent).not.toHaveBeenCalled();
    });
  });

  describe('Calendar Command Pattern', () => {
    it('should wrap event creation in a transaction', async () => {
      const { db } = await import('./db.js');
      const mockCommand = vi.fn().mockResolvedValue({ id: 'event-1' });
      (db.transaction as any).mockImplementation(async (callback) => {
        return callback({});
      });

      const context: CommandContext = {
        userId: 'user-1',
        workspaceId: 'workspace-1',
      };

      await executeCommand(context, mockCommand);

      expect(db.transaction).toHaveBeenCalled();
    });

    it('should create audit log on event creation', async () => {
      const { db } = await import('./db.js');
      const mockCommand = vi.fn().mockResolvedValue({ id: 'event-1' });
      (db.transaction as any).mockImplementation(async (callback) => {
        return callback({});
      });

      const context: CommandContext = {
        userId: 'user-1',
        workspaceId: 'workspace-1',
      };

      await executeCommand(context, mockCommand, {
        action: 'create',
        entityType: 'event',
        entityId: 'event-1',
      });

      expect(createAuditLog).toHaveBeenCalledWith({
        userId: 'user-1',
        workspaceId: 'workspace-1',
        action: 'create',
        entityType: 'event',
        entityId: 'event-1',
        changes: {},
      });
    });

    it('should create outbox event on event creation', async () => {
      const { db } = await import('./db.js');
      const mockCommand = vi.fn().mockResolvedValue({ id: 'event-1' });
      (db.transaction as any).mockImplementation(async (callback) => {
        return callback({});
      });

      const context: CommandContext = {
        userId: 'user-1',
        workspaceId: 'workspace-1',
      };

      await executeCommand(context, mockCommand, undefined, {
        eventType: 'event.created',
        aggregateType: 'event',
        aggregateId: 'event-1',
        payload: { id: 'event-1' },
      });

      expect(createOutboxEvent).toHaveBeenCalledWith({
        eventType: 'event.created',
        aggregateType: 'event',
        aggregateId: 'event-1',
        payload: { id: 'event-1' },
      });
    });
  });
});
