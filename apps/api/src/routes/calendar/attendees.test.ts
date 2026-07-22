import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import attendeesRouter from './attendees.js';

// Mock the calendar operations module
vi.mock('../../lib/calendar-operations.js', () => ({
  createEventAttendee: vi.fn(() =>
    Promise.resolve({ id: '123', eventId: 'event-123', userId: 'user-123' }),
  ),
  getEventAttendees: vi.fn(() =>
    Promise.resolve([{ id: '123', eventId: 'event-123', userId: 'user-123' }]),
  ),
  updateEventAttendee: vi.fn(() => Promise.resolve({ id: '123', status: 'accepted' })),
  deleteEventAttendee: vi.fn(() => Promise.resolve({ id: '123' })),
}));

// Mock the auth middleware
vi.mock('../../lib/middleware.js', () => ({
  authMiddleware: async (c: Context, next: Next) => {
    c.set('userId', 'test-user-id');
    await next();
  },
}));

describe('Calendar Attendees Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an event attendee', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(attendeesRouter) as any;
    const { createEventAttendee } = await import('../../lib/calendar-operations.js');

    const response = await client['event-attendees'].$post({
      json: {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        status: 'needs_action',
        isOrganizer: false,
      },
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(createEventAttendee).toHaveBeenCalled();
  });

  it('gets event attendees', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(attendeesRouter) as any;
    const { getEventAttendees } = await import('../../lib/calendar-operations.js');

    const response = await client.events[':eventId'].attendees.$get({
      param: { eventId: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('attendees');
    expect(getEventAttendees).toHaveBeenCalled();
  });

  it('updates event attendee status', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(attendeesRouter) as any;
    const { updateEventAttendee } = await import('../../lib/calendar-operations.js');

    const response = await client['event-attendees'][':id'].$put({
      param: { id: '550e8400-e29b-41d4-a716-446655440000' },
      query: { status: 'accepted' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.status).toBe('accepted');
    expect(updateEventAttendee).toHaveBeenCalled();
  });

  it('returns 400 when status query parameter is missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(attendeesRouter) as any;

    const response = await client['event-attendees'][':id'].$put({
      param: { id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('deletes an event attendee', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(attendeesRouter) as any;
    const { deleteEventAttendee } = await import('../../lib/calendar-operations.js');

    const response = await client['event-attendees'][':id'].$delete({
      param: { id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(deleteEventAttendee).toHaveBeenCalled();
  });
});
