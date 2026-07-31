import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  createEvent,
  getEventById,
  getEventsByCalendar,
  getEventsByWorkspace,
  updateEvent,
  deleteEvent,
  getEventWithAttendees,
  getEventsByTask,
  linkEventToTask,
  unlinkEventFromTask,
} from './calendar-operations.js';

// Helper to create chainable query builder mock that resolves to array
const createQueryBuilder = () => {
  const mockData = [{ id: '123', createdAt: new Date() }];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queryBuilder = Promise.resolve(mockData) as any;

  // Add chainable methods that return the same promise
  queryBuilder.from = vi.fn(() => queryBuilder);
  queryBuilder.where = vi.fn(() => queryBuilder);
  queryBuilder.orderBy = vi.fn(() => queryBuilder);
  queryBuilder.limit = vi.fn(() => queryBuilder);
  queryBuilder.returning = vi.fn(() => queryBuilder);

  return queryBuilder;
};

// Mock the db module
vi.mock('./db.js', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: '123', createdAt: new Date() }])),
      })),
    })),
    select: vi.fn(() => createQueryBuilder()),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: '123', updatedAt: new Date() }])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: '123' }])),
      })),
    })),
    transaction: vi.fn(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (callback: any) => {
        return callback({
          insert: vi.fn(() => ({
            values: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve([{ id: '123', createdAt: new Date() }])),
            })),
          })),
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn(() => ({
                returning: vi.fn(() => Promise.resolve([{ id: '123', updatedAt: new Date() }])),
              })),
            })),
          })),
          delete: vi.fn(() => ({
            where: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve([{ id: '123' }])),
            })),
          })),
        });
      },
    ),
  },
}));

describe('Event CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Event CRUD', () => {
    it('creates an event', async () => {
      const result = await createEvent({
        workspaceId: 'workspace-123',
        calendarId: 'calendar-123',
        title: 'My Event',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });

    it('gets event by id', async () => {
      const result = await getEventById('event-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });

    it('gets events by calendar', async () => {
      const result = await getEventsByCalendar('calendar-123');

      expect(result).toBeInstanceOf(Array);
    });

    it('gets events by workspace with date range', async () => {
      const { db } = await import('./db.js');
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');
      const result = await getEventsByWorkspace('workspace-123', startDate, endDate);

      // The function returns a Drizzle query builder, not an array directly
      expect(result).toBeDefined();
      expect(db.select).toHaveBeenCalled();
    });

    it('updates an event', async () => {
      const result = await updateEvent('event-123', { title: 'Updated Event' });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });

    it('deletes an event', async () => {
      const result = await deleteEvent('event-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });
  });

  describe('Batch Operations', () => {
    it('gets event with attendees', async () => {
      const result = await getEventWithAttendees('event-123');

      expect(result).toBeDefined();
      expect(result?.attendees).toBeInstanceOf(Array);
    });
  });

  describe('Task-Event Linking', () => {
    it('gets events by task', async () => {
      const result = await getEventsByTask('task-123');

      expect(result).toBeInstanceOf(Array);
    });

    it('links event to task', async () => {
      const result = await linkEventToTask('event-123', 'task-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });

    it('unlinks event from task', async () => {
      const result = await unlinkEventFromTask('event-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });
  });

  describe('Command Pattern - Transaction, Audit, Outbox, Idempotency', () => {
    it('should create audit log when event is created with userId and workspaceId', async () => {
      const auditSpy = vi.spyOn(await import('./audit.js'), 'createAuditLog');
      const result = await createEvent(
        {
          id: '123',
          workspaceId: 'workspace-123',
          calendarId: 'calendar-123',
          title: 'Test Event',
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T11:00:00Z'),
        },
        { userId: 'user-123', workspaceId: 'workspace-123' },
      );

      expect(result).toBeDefined();
      expect(auditSpy).toHaveBeenCalledWith({
        userId: 'user-123',
        workspaceId: 'workspace-123',
        action: 'create',
        entityType: 'event',
        entityId: '123',
        changes: { new: expect.any(Object) },
      });
      auditSpy.mockRestore();
    });

    it('should create outbox event when event is created', async () => {
      const outboxSpy = vi.spyOn(await import('./audit.js'), 'createOutboxEvent');
      const result = await createEvent(
        {
          id: '123',
          workspaceId: 'workspace-123',
          calendarId: 'calendar-123',
          title: 'Test Event',
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T11:00:00Z'),
        },
        { userId: 'user-123', workspaceId: 'workspace-123' },
      );

      expect(result).toBeDefined();
      expect(outboxSpy).toHaveBeenCalledWith({
        eventType: 'event.created',
        aggregateType: 'event',
        aggregateId: '123',
        payload: { event: expect.any(Object) },
      });
      outboxSpy.mockRestore();
    });

    it('should wrap event creation in transaction', async () => {
      const { db } = await import('./db.js');
      const transactionSpy = vi
        .spyOn(db, 'transaction')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockImplementation(async (callback: any) => {
          return callback(db);
        });

      await createEvent(
        {
          id: '123',
          workspaceId: 'workspace-123',
          calendarId: 'calendar-123',
          title: 'Test Event',
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T11:00:00Z'),
        },
        { userId: 'user-123', workspaceId: 'workspace-123' },
      );

      expect(transactionSpy).toHaveBeenCalled();
      transactionSpy.mockRestore();
    });

    it('should rollback transaction on error', async () => {
      const { db } = await import('./db.js');
      const transactionSpy = vi.spyOn(db, 'transaction').mockImplementation(async () => {
        throw new Error('Transaction failed');
      });

      await expect(
        createEvent(
          {
            id: '123',
            workspaceId: 'workspace-123',
            calendarId: 'calendar-123',
            title: 'Test Event',
            start: new Date('2024-01-01T10:00:00Z'),
            end: new Date('2024-01-01T11:00:00Z'),
          },
          { userId: 'user-123', workspaceId: 'workspace-123' },
        ),
      ).rejects.toThrow('Transaction failed');

      expect(transactionSpy).toHaveBeenCalled();
      transactionSpy.mockRestore();
    });

    it('should not create audit log when userId or workspaceId is missing', async () => {
      const auditSpy = vi.spyOn(await import('./audit.js'), 'createAuditLog');
      const result = await createEvent({
        id: '123',
        workspaceId: 'workspace-123',
        calendarId: 'calendar-123',
        title: 'Test Event',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
      });

      expect(result).toBeDefined();
      expect(auditSpy).not.toHaveBeenCalled();
      auditSpy.mockRestore();
    });

    it('should not create outbox event when userId or workspaceId is missing', async () => {
      const outboxSpy = vi.spyOn(await import('./audit.js'), 'createOutboxEvent');
      const result = await createEvent({
        id: '123',
        workspaceId: 'workspace-123',
        calendarId: 'calendar-123',
        title: 'Test Event',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
      });

      expect(result).toBeDefined();
      expect(outboxSpy).not.toHaveBeenCalled();
      outboxSpy.mockRestore();
    });

    it('should commit audit and outbox together with domain write in transaction', async () => {
      const { db } = await import('./db.js');
      const transactionSpy = vi
        .spyOn(db, 'transaction')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockImplementation(async (callback: any) => {
          return callback(db);
        });
      const auditSpy = vi.spyOn(await import('./audit.js'), 'createAuditLog');
      const outboxSpy = vi.spyOn(await import('./audit.js'), 'createOutboxEvent');

      await createEvent(
        {
          id: '123',
          workspaceId: 'workspace-123',
          calendarId: 'calendar-123',
          title: 'Test Event',
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T11:00:00Z'),
        },
        { userId: 'user-123', workspaceId: 'workspace-123' },
      );

      expect(transactionSpy).toHaveBeenCalled();
      expect(auditSpy).toHaveBeenCalled();
      expect(outboxSpy).toHaveBeenCalled();
      transactionSpy.mockRestore();
      auditSpy.mockRestore();
      outboxSpy.mockRestore();
    });

    it('should rollback audit and outbox on domain write failure', async () => {
      const { db } = await import('./db.js');
      const transactionSpy = vi.spyOn(db, 'transaction').mockImplementation(async () => {
        throw new Error('Domain write failed');
      });
      const auditSpy = vi.spyOn(await import('./audit.js'), 'createAuditLog');
      const outboxSpy = vi.spyOn(await import('./audit.js'), 'createOutboxEvent');

      await expect(
        createEvent(
          {
            workspaceId: 'workspace-123',
            calendarId: 'calendar-123',
            title: 'Test Event',
            start: new Date('2024-01-01T10:00:00Z'),
            end: new Date('2024-01-01T11:00:00Z'),
          },
          { userId: 'user-123', workspaceId: 'workspace-123' },
        ),
      ).rejects.toThrow('Domain write failed');

      expect(transactionSpy).toHaveBeenCalled();
      transactionSpy.mockRestore();
      auditSpy.mockRestore();
      outboxSpy.mockRestore();
    });
  });
});
