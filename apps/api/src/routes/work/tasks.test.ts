import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import tasksRouter from './tasks.js';

// Mock the work operations module
vi.mock('../../lib/work-operations.js', () => ({
  createTask: vi.fn(() => Promise.resolve({ id: '123', title: 'Test Task' })),
  getTaskById: vi.fn(() => Promise.resolve({ id: '123', title: 'Test Task' })),
  getTasksByWorkspace: vi.fn(() =>
    Promise.resolve({ items: [], hasMore: false, nextCursor: null }),
  ),
  getTasksByProject: vi.fn(() => Promise.resolve([])),
  getFilteredTasks: vi.fn(() => Promise.resolve([])),
  updateTask: vi.fn(() => Promise.resolve({ id: '123', title: 'Updated Task' })),
  deleteTask: vi.fn(() => Promise.resolve({ id: '123' })),
  getSubtasks: vi.fn(() => Promise.resolve([])),
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
  idempotencyMiddleware: async (_c: Context, next: Next) => {
    await next();
  },
}));

describe('Work Tasks Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a task', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(tasksRouter) as any;
    const { createTask } = await import('../../lib/work-operations.js');

    const response = await client.tasks.$post({
      json: {
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Task',
      },
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(createTask).toHaveBeenCalled();
  });

  it('gets task by id', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(tasksRouter) as any;
    const { getTaskById } = await import('../../lib/work-operations.js');

    const response = await client.tasks[':id'].$get({
      param: { id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(getTaskById).toHaveBeenCalled();
  });

  it('gets tasks by workspace', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(tasksRouter) as any;
    const { getTasksByWorkspace } = await import('../../lib/work-operations.js');

    const response = await client.workspaces[':workspaceId'].tasks.$get({
      param: { workspaceId: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('tasks');
    expect(getTasksByWorkspace).toHaveBeenCalled();
  });

  it('gets tasks by project', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(tasksRouter) as any;
    const { getTasksByProject } = await import('../../lib/work-operations.js');

    const response = await client.projects[':projectId'].tasks.$get({
      param: { projectId: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('tasks');
    expect(getTasksByProject).toHaveBeenCalled();
  });

  it('updates a task', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(tasksRouter) as any;
    const { updateTask } = await import('../../lib/work-operations.js');

    const response = await client.tasks[':id'].$put({
      param: { id: '550e8400-e29b-41d4-a716-446655440000' },
      json: { title: 'Updated Task' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(updateTask).toHaveBeenCalled();
  });

  it('deletes a task', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(tasksRouter) as any;
    const { deleteTask } = await import('../../lib/work-operations.js');

    const response = await client.tasks[':id'].$delete({
      param: { id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(deleteTask).toHaveBeenCalled();
  });

  it('gets subtasks', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(tasksRouter) as any;
    const { getSubtasks } = await import('../../lib/work-operations.js');

    const response = await client.tasks[':taskId'].subtasks.$get({
      param: { taskId: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('subtasks');
    expect(getSubtasks).toHaveBeenCalled();
  });
});
