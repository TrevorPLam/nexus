import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import recurringRouter from './recurring.js';

// Mock the calendar operations module
vi.mock('../../lib/calendar-operations.js', () => ({
  getRecurringEventInstances: vi.fn(() => Promise.resolve([])),
  getBaseRecurringEvent: vi.fn(() => Promise.resolve({ id: '123', title: 'Base Event' })),
}));

// Mock the auth middleware
vi.mock('../../lib/middleware.js', () => ({
  authMiddleware: async (c: Context, next: Next) => {
    c.set('userId', 'test-user-id');
    await next();
  },
}));

describe('Calendar Recurring Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gets recurring event instances', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(recurringRouter) as any;
    const { getRecurringEventInstances } = await import('../../lib/calendar-operations.js');

    const response = await client.recurring[':recurrenceId'].instances.$get({
      param: { recurrenceId: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('instances');
    expect(getRecurringEventInstances).toHaveBeenCalled();
  });

  it('gets base recurring event', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(recurringRouter) as any;
    const { getBaseRecurringEvent } = await import('../../lib/calendar-operations.js');

    const response = await client.recurring[':recurrenceId'].base.$get({
      param: { recurrenceId: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(getBaseRecurringEvent).toHaveBeenCalled();
  });
});
