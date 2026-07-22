import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import batchOperationsRouter from './batch-operations.js';

// Mock the work operations module
vi.mock('../../lib/work-operations.js', () => ({
  batchCompleteTasks: vi.fn(() => Promise.resolve([{ id: '123', status: 'done' }])),
  batchDeferTasks: vi.fn(() => Promise.resolve([{ id: '123', dueDate: new Date() }])),
  batchRescheduleTasks: vi.fn(() => Promise.resolve([{ id: '123', dueDate: new Date() }])),
  batchUpdateTaskStatus: vi.fn(() => Promise.resolve([{ id: '123', status: 'in_progress' }])),
}));

// Mock the auth middleware
vi.mock('../../lib/middleware.js', () => ({
  authMiddleware: async (c: Context, next: Next) => {
    c.set('userId', 'test-user-id');
    await next();
  },
  idempotencyMiddleware: async (_c: Context, next: Next) => {
    await next();
  },
}));

describe('Work Batch Operations Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('batch completes tasks', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(batchOperationsRouter) as any;
    const { batchCompleteTasks } = await import('../../lib/work-operations.js');

    const response = await client.tasks.batch.complete.$post({
      json: {
        taskIds: ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'],
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('tasks');
    expect(batchCompleteTasks).toHaveBeenCalled();
  });

  it('returns 400 when taskIds is empty array', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(batchOperationsRouter) as any;

    const response = await client.tasks.batch.complete.$post({
      json: { taskIds: [] },
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('batch defers tasks', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(batchOperationsRouter) as any;
    const { batchDeferTasks } = await import('../../lib/work-operations.js');

    const response = await client.tasks.batch.defer.$post({
      json: {
        taskIds: ['550e8400-e29b-41d4-a716-446655440000'],
        deferToDate: '2024-12-31T10:00:00Z',
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('tasks');
    expect(batchDeferTasks).toHaveBeenCalled();
  });

  it('returns 400 when deferToDate is missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(batchOperationsRouter) as any;

    const response = await client.tasks.batch.defer.$post({
      json: { taskIds: ['550e8400-e29b-41d4-a716-446655440000'] },
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('batch reschedules tasks', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(batchOperationsRouter) as any;
    const { batchRescheduleTasks } = await import('../../lib/work-operations.js');

    const response = await client.tasks.batch.reschedule.$post({
      json: {
        taskIds: ['550e8400-e29b-41d4-a716-446655440000'],
        newDueDate: '2024-12-31T10:00:00Z',
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('tasks');
    expect(batchRescheduleTasks).toHaveBeenCalled();
  });

  it('returns 400 when newDueDate is missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(batchOperationsRouter) as any;

    const response = await client.tasks.batch.reschedule.$post({
      json: { taskIds: ['550e8400-e29b-41d4-a716-446655440000'] },
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('batch updates task status', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(batchOperationsRouter) as any;
    const { batchUpdateTaskStatus } = await import('../../lib/work-operations.js');

    const response = await client.tasks.batch['update-status'].$post({
      json: {
        taskIds: ['550e8400-e29b-41d4-a716-446655440000'],
        newStatus: 'in_progress',
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('tasks');
    expect(batchUpdateTaskStatus).toHaveBeenCalled();
  });

  it('returns 400 when newStatus is missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(batchOperationsRouter) as any;

    const response = await client.tasks.batch['update-status'].$post({
      json: { taskIds: ['550e8400-e29b-41d4-a716-446655440000'] },
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });
});
