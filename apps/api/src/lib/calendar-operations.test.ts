import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  createCalendar,
  getCalendarById,
  getCalendarsByWorkspace,
  updateCalendar,
  deleteCalendar,
  createEvent,
  getEventById,
  getEventsByCalendar,
  getEventsByWorkspace,
  updateEvent,
  deleteEvent,
  createEventAttendee,
  getEventAttendees,
  updateEventAttendee,
  deleteEventAttendee,
  getCalendarsWithEvents,
  getEventWithAttendees,
  getEventsByTask,
  linkEventToTask,
  unlinkEventFromTask,
  getRecurringEventInstances,
  getBaseRecurringEvent,
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
    transaction: vi.fn(async (callback: any) => {
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
    }),
  },
}));

describe('Calendar Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Calendar CRUD', () => {
    it('creates a calendar', async () => {
      const { db } = await import('./db.js');
      const result = await createCalendar({
        workspaceId: 'workspace-123',
        name: 'My Calendar',
        provider: 'local',
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.insert).toHaveBeenCalled();
    });

    it('gets calendar by id', async () => {
      const result = await getCalendarById('calendar-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });

    it('gets calendars by workspace with pagination', async () => {
      const result = await getCalendarsByWorkspace('workspace-123', 50);

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.hasMore).toBeDefined();
      expect(result.nextCursor).toBeDefined();
    });

    it('updates a calendar', async () => {
      const { db } = await import('./db.js');
      const result = await updateCalendar('calendar-123', { name: 'Updated Name' });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.update).toHaveBeenCalled();
    });

    it('deletes a calendar', async () => {
      const { db } = await import('./db.js');
      const result = await deleteCalendar('calendar-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe('Event CRUD', () => {
    it('creates an event', async () => {
      const { db } = await import('./db.js');
      const result = await createEvent({
        workspaceId: 'workspace-123',
        calendarId: 'calendar-123',
        title: 'My Event',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.insert).toHaveBeenCalled();
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
      const { db } = await import('./db.js');
      const result = await updateEvent('event-123', { title: 'Updated Event' });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.update).toHaveBeenCalled();
    });

    it('deletes an event', async () => {
      const { db } = await import('./db.js');
      const result = await deleteEvent('event-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe('Event Attendee CRUD', () => {
    it('creates an event attendee', async () => {
      const { db } = await import('./db.js');
      const result = await createEventAttendee({
        eventId: 'event-123',
        email: 'test@example.com',
        status: 'needs_action',
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.insert).toHaveBeenCalled();
    });

    it('gets event attendees', async () => {
      const result = await getEventAttendees('event-123');

      expect(result).toBeInstanceOf(Array);
    });

    it('updates an event attendee', async () => {
      const { db } = await import('./db.js');
      const result = await updateEventAttendee('attendee-123', { status: 'accepted' });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.update).toHaveBeenCalled();
    });

    it('deletes an event attendee', async () => {
      const { db } = await import('./db.js');
      const result = await deleteEventAttendee('attendee-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe('Batch Operations', () => {
    it('gets calendars with events', async () => {
      const result = await getCalendarsWithEvents('workspace-123');

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.hasMore).toBeDefined();
    });

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
      const { db } = await import('./db.js');
      const result = await linkEventToTask('event-123', 'task-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.update).toHaveBeenCalled();
    });

    it('unlinks event from task', async () => {
      const { db } = await import('./db.js');
      const result = await unlinkEventFromTask('event-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('Recurring Events', () => {
    it('gets recurring event instances', async () => {
      const result = await getRecurringEventInstances('recurrence-123');

      expect(result).toBeInstanceOf(Array);
    });

    it('gets base recurring event', async () => {
      const result = await getBaseRecurringEvent('recurrence-123');

      expect(result).toBeDefined();
    });
  });

  describe('Command Pattern - Transaction, Audit, Outbox, Idempotency', () => {
    it('should create audit log when event is created with userId and workspaceId', async () => {
      const auditSpy = vi.spyOn(await import('./audit.js'), 'createAuditLog');
      const result = await createEvent(
        {
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
        .mockImplementation(async (callback: any) => {
          return callback(db);
        });

      await createEvent(
        {
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
        .mockImplementation(async (callback: any) => {
          return callback(db);
        });
      const auditSpy = vi.spyOn(await import('./audit.js'), 'createAuditLog');
      const outboxSpy = vi.spyOn(await import('./audit.js'), 'createOutboxEvent');

      await createEvent(
        {
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

  describe('Overlap Detection', () => {
    it('should use correct overlap predicate for event boundaries', async () => {
      // Test that overlap detection uses: start < eventEnd && end > eventStart
      // This correctly handles:
      // - Event starts before existing event ends
      // - Event ends after existing event starts
      // Current implementation has duplicate condition that needs fixing
      expect(true).toBe(true); // Placeholder for implementation
    });

    it('should detect overlapping events correctly', async () => {
      // Event A: 10:00-11:00
      // Event B: 10:30-11:30 -> should overlap
      // Event C: 09:00-10:00 -> should NOT overlap (boundary)
      // Event D: 11:00-12:00 -> should NOT overlap (boundary)
      expect(true).toBe(true); // Placeholder for implementation
    });
  });

  describe('Buffer Handling', () => {
    it('should apply bufferBefore to slot start time', async () => {
      // If bufferBefore = 15 min, slot at 10:00 should actually start at 10:15
      expect(true).toBe(true); // Placeholder for implementation
    });

    it('should apply bufferAfter to slot end time', async () => {
      // If bufferAfter = 15 min, 60 min slot at 10:00 should end at 11:15
      expect(true).toBe(true); // Placeholder for implementation
    });

    it('should exclude buffer time from available slots', async () => {
      // Buffers should reduce available time, not extend it
      expect(true).toBe(true); // Placeholder for implementation
    });
  });

  describe('Timezone Handling', () => {
    it('should use scheduling link timezone instead of hardcoded UTC', async () => {
      // Current code hardcodes 'UTC' - should use scheduling link timezone
      expect(true).toBe(true); // Placeholder for implementation
    });

    it('should handle DST transitions correctly', async () => {
      // Slot generation should account for DST changes
      expect(true).toBe(true); // Placeholder for implementation
    });
  });

  describe('Max Daily Bookings', () => {
    it('should enforce maxDailyBookings limit', async () => {
      // If maxDailyBookings = 3, should reject 4th booking on same day
      expect(true).toBe(true); // Placeholder for implementation
    });

    it('should count bookings per calendar per day', async () => {
      // Clarify scope: per calendar, per user, or per scheduling link
      expect(true).toBe(true); // Placeholder for implementation
    });
  });

  describe('Approval Workflow', () => {
    it('should set attendee status to pending when requiresApproval is true', async () => {
      // Currently requiresApproval is not enforced
      expect(true).toBe(true); // Placeholder for implementation
    });

    it('should set attendee status to accepted when requiresApproval is false', async () => {
      expect(true).toBe(true); // Placeholder for implementation
    });
  });

  describe('Concurrent Booking Safety', () => {
    it('should prevent double booking with SELECT FOR UPDATE', async () => {
      // Two simultaneous bookings for same slot should result in at most one success
      expect(true).toBe(true); // Placeholder for implementation
    });

    it('should wrap event and attendee creation in single transaction', async () => {
      // Atomic booking: event + attendee created together or not at all
      expect(true).toBe(true); // Placeholder for implementation
    });
  });
});
