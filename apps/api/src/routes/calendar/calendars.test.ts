import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import calendarsRouter from './calendars.js';

// Mock the calendar operations module
vi.mock('../../lib/calendar-operations.js', () => ({
  createCalendar: vi.fn(() => Promise.resolve({ id: '123', name: 'Test Calendar' })),
  getCalendarById: vi.fn(() => Promise.resolve({ id: '123', name: 'Test Calendar' })),
  getCalendarsByWorkspace: vi.fn(() =>
    Promise.resolve({ items: [], hasMore: false, nextCursor: null }),
  ),
  updateCalendar: vi.fn(() => Promise.resolve({ id: '123', name: 'Updated Calendar' })),
  deleteCalendar: vi.fn(() => Promise.resolve({ id: '123' })),
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
  requireEntityAccess: () => async (c: Context, next: Next) => {
    c.set('workspaceId', 'test-workspace-id');
    await next();
  },
  requireWorkspaceAccess: async (c: Context, next: Next) => {
    c.set('workspaceId', 'test-workspace-id');
    await next();
  },
}));

describe('Calendar Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a calendar', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(calendarsRouter) as any;
    const { createCalendar } = await import('../../lib/calendar-operations.js');

    const response = await client.calendars.$post({
      json: {
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Calendar',
        provider: 'local',
      },
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(createCalendar).toHaveBeenCalled();
  });

  it('gets calendar by id', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(calendarsRouter) as any;
    const { getCalendarById } = await import('../../lib/calendar-operations.js');

    const response = await client.calendars[':id'].$get({
      param: { id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(getCalendarById).toHaveBeenCalled();
  });

  it('gets calendars by workspace', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(calendarsRouter) as any;
    const { getCalendarsByWorkspace } = await import('../../lib/calendar-operations.js');

    const response = await client.workspaces[':workspaceId'].calendars.$get({
      param: { workspaceId: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(getCalendarsByWorkspace).toHaveBeenCalled();
  });

  it('updates a calendar', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(calendarsRouter) as any;
    const { updateCalendar } = await import('../../lib/calendar-operations.js');

    const response = await client.calendars[':id'].$put({
      param: { id: '550e8400-e29b-41d4-a716-446655440000' },
      json: { name: 'Updated Calendar' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(updateCalendar).toHaveBeenCalled();
  });

  it('deletes a calendar', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(calendarsRouter) as any;
    const { deleteCalendar } = await import('../../lib/calendar-operations.js');

    const response = await client.calendars[':id'].$delete({
      param: { id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(deleteCalendar).toHaveBeenCalled();
  });
});
