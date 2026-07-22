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

// Mock the db module
vi.mock('./db.js', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: '123', createdAt: new Date() }])),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{ id: '123', createdAt: new Date() }])),
          })),
        })),
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
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');
      const result = await getEventsByWorkspace('workspace-123', startDate, endDate);

      expect(result).toBeInstanceOf(Array);
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
});
