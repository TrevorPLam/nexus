import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import taskNotesRouter from './task-notes.js';

// Mock the work operations module
vi.mock('../../lib/work-operations.js', () => ({
  createTaskNote: vi.fn(() =>
    Promise.resolve({ id: '123', taskId: 'task-123', content: 'Test note' }),
  ),
  getTaskNoteById: vi.fn(() =>
    Promise.resolve({ id: '123', taskId: 'task-123', content: 'Test note' }),
  ),
  getTaskNotesByTask: vi.fn(() => Promise.resolve([])),
  updateTaskNote: vi.fn(() => Promise.resolve({ id: '123', content: 'Updated note' })),
  deleteTaskNote: vi.fn(() => Promise.resolve({ id: '123' })),
}));

// Mock the auth middleware
vi.mock('../../lib/middleware.js', () => ({
  authMiddleware: async (c: Context, next: Next) => {
    c.set('userId', 'test-user-id');
    await next();
  },
}));

describe('Work Task Notes Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a task note', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(taskNotesRouter) as any;
    const { createTaskNote } = await import('../../lib/work-operations.js');

    const response = await client['task-notes'].$post({
      json: {
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        content: 'Test note',
      },
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(createTaskNote).toHaveBeenCalled();
  });

  it('gets task note by id', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(taskNotesRouter) as any;
    const { getTaskNoteById } = await import('../../lib/work-operations.js');

    const response = await client['task-notes'][':id'].$get({
      param: { id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(getTaskNoteById).toHaveBeenCalled();
  });

  it('gets task notes by task', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(taskNotesRouter) as any;
    const { getTaskNotesByTask } = await import('../../lib/work-operations.js');

    const response = await client.tasks[':taskId'].notes.$get({
      param: { taskId: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('notes');
    expect(getTaskNotesByTask).toHaveBeenCalled();
  });

  it('updates a task note', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(taskNotesRouter) as any;
    const { updateTaskNote } = await import('../../lib/work-operations.js');

    const response = await client['task-notes'][':id'].$put({
      param: { id: '550e8400-e29b-41d4-a716-446655440000' },
      json: { content: 'Updated note' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(updateTaskNote).toHaveBeenCalled();
  });

  it('deletes a task note', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = testClient(taskNotesRouter) as any;
    const { deleteTaskNote } = await import('../../lib/work-operations.js');

    const response = await client['task-notes'][':id'].$delete({
      param: { id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(deleteTaskNote).toHaveBeenCalled();
  });
});
