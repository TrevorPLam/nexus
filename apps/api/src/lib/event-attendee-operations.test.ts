import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  createEventAttendee,
  getEventAttendees,
  updateEventAttendee,
  deleteEventAttendee,
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

describe('Event Attendee CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an event attendee', async () => {
    const result = await createEventAttendee({
      eventId: 'event-123',
      email: 'test@example.com',
      status: 'needs_action',
    });

    expect(result).toBeDefined();
    expect(result?.id).toBe('123');
  });

  it('gets event attendees', async () => {
    const result = await getEventAttendees('event-123');

    expect(result).toBeInstanceOf(Array);
  });

  it('updates an event attendee', async () => {
    const result = await updateEventAttendee('attendee-123', { status: 'accepted' });

    expect(result).toBeDefined();
    expect(result?.id).toBe('123');
  });

  it('deletes an event attendee', async () => {
    const result = await deleteEventAttendee('attendee-123');

    expect(result).toBeDefined();
    expect(result?.id).toBe('123');
  });
});
