import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  createCalendar,
  getCalendarById,
  getCalendarsByWorkspace,
  updateCalendar,
  deleteCalendar,
  getCalendarsWithEvents,
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

describe('Calendar CRUD Operations', () => {
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
      const result = await updateCalendar('calendar-123', { name: 'Updated Name' });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });

    it('deletes a calendar', async () => {
      const result = await deleteCalendar('calendar-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });
  });

  describe('Batch Operations', () => {
    it('gets calendars with events', async () => {
      const result = await getCalendarsWithEvents('workspace-123');

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.hasMore).toBeDefined();
    });
  });
});
