import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import taskDependenciesRouter from './task-dependencies.js';

// Mock the work operations module
vi.mock('../../lib/work-operations.js', () => ({
  createTaskDependency: vi.fn(() =>
    Promise.resolve({ id: '123', taskId: 'task-123', dependsOnTaskId: 'task-456' }),
  ),
  getTaskDependencies: vi.fn(() => Promise.resolve([])),
  deleteTaskDependency: vi.fn(() => Promise.resolve({ id: '123' })),
}));

// Mock the auth middleware
vi.mock('../../lib/middleware.js', () => ({
  authMiddleware: async (c: Context, next: Next) => {
    c.set('userId', 'test-user-id');
    await next();
  },
}));

describe('Work Task Dependencies Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a task dependency', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(taskDependenciesRouter) as any;
    const { createTaskDependency } = await import('../../lib/work-operations.js');

    const response = await client['task-dependencies'].$post({
      json: {
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        dependsOnTaskId: '550e8400-e29b-41d4-a716-446655440001',
        type: 'finish_to_start',
      },
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(createTaskDependency).toHaveBeenCalled();
  });

  it('gets task dependencies', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(taskDependenciesRouter) as any;
    const { getTaskDependencies } = await import('../../lib/work-operations.js');

    const response = await client.tasks[':taskId'].dependencies.$get({
      param: { taskId: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('dependencies');
    expect(getTaskDependencies).toHaveBeenCalled();
  });

  it('deletes a task dependency', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(taskDependenciesRouter) as any;
    const { deleteTaskDependency } = await import('../../lib/work-operations.js');

    const response = await client['task-dependencies'][':id'].$delete({
      param: { id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(deleteTaskDependency).toHaveBeenCalled();
  });
});
