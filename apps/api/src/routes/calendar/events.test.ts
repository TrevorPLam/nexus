import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import eventsRouter from './events.js';

// Mock the calendar operations module
vi.mock('../../lib/calendar-operations.js', () => ({
  createEvent: vi.fn(() => Promise.resolve({ id: '123', title: 'Test Event' })),
  getEventWithAttendees: vi.fn(() => Promise.resolve({ id: '123', title: 'Test Event' })),
  getEventsByCalendar: vi.fn(() => Promise.resolve([])),
  getEventsByWorkspace: vi.fn(() => Promise.resolve([])),
  updateEvent: vi.fn(() => Promise.resolve({ id: '123', title: 'Updated Event' })),
  deleteEvent: vi.fn(() => Promise.resolve({ id: '123' })),
  getEventsByTask: vi.fn(() => Promise.resolve([])),
  linkEventToTask: vi.fn(() => Promise.resolve({ id: '123', taskId: 'task-123' })),
  unlinkEventFromTask: vi.fn(() => Promise.resolve({ id: '123', taskId: null })),
}));

// Mock the auth middleware
vi.mock('../../lib/middleware.js', () => ({
  authMiddleware: async (c: Context, next: Next) => {
    c.set('userId', 'test-user-id');
    await next();
  },
  requireWorkspaceMembership: async (c: Context, next: Next) => {
    c.set('workspaceId', 'test-workspace-id');
    await next();
  },
}));

describe('Calendar Events Routes', () => {
  it('loads the events router with the canonical route set', () => {
    expect(eventsRouter).toBeDefined();
    expect(eventsRouter.routes).toBeDefined();

    const pairs = new Set(
      eventsRouter.routes.map(
        (route) =>
          `${(route as { method: string }).method}:${(route as { path: string }).path}`,
      ),
    );

    const expected = new Set([
      'ALL:/*',
      'POST:/events',
      'GET:/events/:id',
      'GET:/calendars/:calendarId/events',
      'GET:/workspaces/:workspaceId/events',
      'PUT:/events/:id',
      'DELETE:/events/:id',
      'GET:/tasks/:taskId/events',
      'POST:/events/:eventId/link-task',
      'POST:/events/:eventId/unlink-task',
    ]);

    expect([...pairs].sort()).toEqual([...expected].sort());
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an event', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(eventsRouter) as any;
    const { createEvent } = await import('../../lib/calendar-operations.js');

    const response = await client.events.$post({
      json: {
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
        calendarId: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Test Event',
        start: '2024-12-31T10:00:00Z',
        end: '2024-12-31T11:00:00Z',
      },
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(createEvent).toHaveBeenCalled();
  });

  it('gets event by id with attendees', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(eventsRouter) as any;
    const { getEventWithAttendees } = await import('../../lib/calendar-operations.js');

    const response = await client.events[':id'].$get({
      param: { id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(getEventWithAttendees).toHaveBeenCalled();
  });

  it('gets events by calendar', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(eventsRouter) as any;
    const { getEventsByCalendar } = await import('../../lib/calendar-operations.js');

    const response = await client.calendars[':calendarId'].events.$get({
      param: { calendarId: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('events');
    expect(getEventsByCalendar).toHaveBeenCalled();
  });

  it('gets events by workspace', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(eventsRouter) as any;
    const { getEventsByWorkspace } = await import('../../lib/calendar-operations.js');

    const response = await client.workspaces[':workspaceId'].events.$get({
      param: { workspaceId: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('events');
    expect(getEventsByWorkspace).toHaveBeenCalled();
  });

  it('updates an event', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(eventsRouter) as any;
    const { updateEvent } = await import('../../lib/calendar-operations.js');

    const response = await client.events[':id'].$put({
      param: { id: '550e8400-e29b-41d4-a716-446655440000' },
      json: { title: 'Updated Event' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(updateEvent).toHaveBeenCalled();
  });

  it('deletes an event', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(eventsRouter) as any;
    const { deleteEvent } = await import('../../lib/calendar-operations.js');

    const response = await client.events[':id'].$delete({
      param: { id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(deleteEvent).toHaveBeenCalled();
  });

  it('links event to task', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(eventsRouter) as any;
    const { linkEventToTask } = await import('../../lib/calendar-operations.js');

    const response = await client.events[':eventId']['link-task'].$post({
      param: { eventId: '550e8400-e29b-41d4-a716-446655440000' },
      query: { taskId: '550e8400-e29b-41d4-a716-446655440001' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(linkEventToTask).toHaveBeenCalled();
  });

  it('returns 400 when taskId is missing for link-task', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(eventsRouter) as any;

    const response = await client.events[':eventId']['link-task'].$post({
      param: { eventId: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('unlinks event from task', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(eventsRouter) as any;
    const { unlinkEventFromTask } = await import('../../lib/calendar-operations.js');

    const response = await client.events[':eventId']['unlink-task'].$post({
      param: { eventId: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(unlinkEventFromTask).toHaveBeenCalled();
  });
});
