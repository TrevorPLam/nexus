import { testClient } from 'hono/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import integrationRouter from './integration.js';

// Mock the db module
vi.mock('../lib/db.js', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: '123', createdAt: new Date() }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: '123', calendarEventId: null }])),
        })),
      })),
    })),
    query: {
      tasks: {
        findMany: vi.fn(() => Promise.resolve([])),
      },
    },
  },
}));

describe('Integration Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration router', () => {
    expect(integrationRouter).toBeDefined();
  });

  it('is a Hono instance', () => {
    expect(integrationRouter).toHaveProperty('routes');
  });

  it('creates task without calendar event', async () => {
    const client = testClient(integrationRouter);
    const { db } = await import('../lib/db.js');

    const response = await client['tasks-with-event'].$post({
      json: {
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Task',
        status: 'todo',
        priority: 'medium',
        createCalendarEvent: false,
      },
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('task');
    expect(data.task).toHaveProperty('id');
    expect(db.insert).toHaveBeenCalled();
  });

  it('creates task with calendar event when flag is true', async () => {
    const client = testClient(integrationRouter);
    const { db } = await import('../lib/db.js');

    const response = await client['tasks-with-event'].$post({
      json: {
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Task with Event',
        status: 'todo',
        priority: 'medium',
        dueDate: '2024-12-31T10:00:00Z',
        calendarId: '550e8400-e29b-41d4-a716-446655440001',
        createCalendarEvent: true,
        estimatedDuration: 60,
      },
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('task');
    expect(data).toHaveProperty('event');
    expect(db.insert).toHaveBeenCalled();
  });

  it('validates required fields', async () => {
    const client = testClient(integrationRouter);

    const response = await client['tasks-with-event'].$post({
      json: {
        workspaceId: 'invalid-uuid',
        title: '',
      },
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('validates UUID format', async () => {
    const client = testClient(integrationRouter);

    const response = await client['tasks-with-event'].$post({
      json: {
        workspaceId: 'not-a-uuid',
        title: 'Test Task',
      },
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('links task to calendar event', async () => {
    const client = testClient(integrationRouter);
    const { db } = await import('../lib/db.js');

    const response = await client['link-task-event'].$post({
      json: {
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        eventId: '550e8400-e29b-41d4-a716-446655440001',
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('task');
    expect(db.update).toHaveBeenCalled();
  });

  it('unlinks task from calendar event', async () => {
    const client = testClient(integrationRouter);
    const { db } = await import('../lib/db.js');

    const response = await client['unlink-task-event'].$post({
      json: {
        taskId: '550e8400-e29b-41d4-a716-446655440000',
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('task');
    expect(db.update).toHaveBeenCalled();
  });

  it('fetches tasks with linked events', async () => {
    const client = testClient(integrationRouter);
    const { db } = await import('../lib/db.js');

    const response = await client['tasks-with-events'][':workspaceId'].$get({
      param: { workspaceId: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('tasks');
    expect(db.query.tasks.findMany).toHaveBeenCalled();
  });
});
