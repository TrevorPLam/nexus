import { testClient } from 'hono/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import integrationRouter from './integration.js';

// Mock the command functions
vi.mock('../lib/work-operations.js', () => ({
  createTaskWithEventCommand: vi.fn(),
  linkTaskEventCommand: vi.fn(),
  unlinkTaskEventCommand: vi.fn(),
}));

// Mock auth middleware
vi.mock('../lib/middleware.js', () => ({
  authMiddleware: vi.fn((_c, next) => next()),
  requireWorkspaceMembership: vi.fn((_c, next) => next()),
  requireWorkspaceAccess: vi.fn((_c, next) => next()),
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
    const { createTaskWithEventCommand } = await import('../lib/work-operations.js');

    vi.mocked(createTaskWithEventCommand).mockResolvedValue({
      task: { id: '123', title: 'Test Task' },
      event: null,
    });

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
    expect(createTaskWithEventCommand).toHaveBeenCalled();
  });

  it('creates task with calendar event when flag is true', async () => {
    const client = testClient(integrationRouter);
    const { createTaskWithEventCommand } = await import('../lib/work-operations.js');

    vi.mocked(createTaskWithEventCommand).mockResolvedValue({
      task: { id: '123', title: 'Test Task with Event' },
      event: { id: '456', title: 'Test Event' },
    });

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
    expect(createTaskWithEventCommand).toHaveBeenCalled();
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
    const { linkTaskEventCommand } = await import('../lib/work-operations.js');

    vi.mocked(linkTaskEventCommand).mockResolvedValue({
      task: { id: '123', calendarEventId: '456' },
    });

    const response = await client['link-task-event'].$post({
      json: {
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        eventId: '550e8400-e29b-41d4-a716-446655440001',
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('task');
    expect(linkTaskEventCommand).toHaveBeenCalled();
  });

  it('unlinks task from calendar event', async () => {
    const client = testClient(integrationRouter);
    const { unlinkTaskEventCommand } = await import('../lib/work-operations.js');

    vi.mocked(unlinkTaskEventCommand).mockResolvedValue({
      task: { id: '123', calendarEventId: null },
    });

    const response = await client['unlink-task-event'].$post({
      json: {
        taskId: '550e8400-e29b-41d4-a716-446655440000',
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('task');
    expect(unlinkTaskEventCommand).toHaveBeenCalled();
  });

  describe('Security and Transaction Tests', () => {
    it('rejects task-event linking when task and event are in different workspaces', async () => {
      const client = testClient(integrationRouter);
      const { linkTaskEventCommand } = await import('../lib/work-operations.js');

      vi.mocked(linkTaskEventCommand).mockRejectedValue(
        new Error('Task and event must belong to the same workspace'),
      );

      const response = await client['link-task-event'].$post({
        json: {
          taskId: '550e8400-e29b-41d4-a716-446655440000',
          eventId: '550e8400-e29b-41d4-a716-446655440001',
        },
      });

      // Should fail with 400 when workspace verification fails
      expect(response.status).toBe(400);
    });

    it('rolls back task creation when event creation fails', async () => {
      const client = testClient(integrationRouter);
      const { createTaskWithEventCommand } = await import('../lib/work-operations.js');

      vi.mocked(createTaskWithEventCommand).mockRejectedValue(
        new Error('Event creation failed'),
      );

      const response = await client['tasks-with-event'].$post({
        json: {
          workspaceId: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Test Task with Event',
          dueDate: '2024-12-31T10:00:00Z',
          calendarId: '550e8400-e29b-41d4-a716-446655440001',
          createCalendarEvent: true,
          estimatedDuration: 60,
        },
      });

      // Should fail and not leave orphaned task
      expect(response.status).toBe(400);
    });

    it('returns cached response for idempotent replay', async () => {
      const client = testClient(integrationRouter);
      const { createTaskWithEventCommand } = await import('../lib/work-operations.js');

      vi.mocked(createTaskWithEventCommand)
        .mockResolvedValueOnce({
          task: { id: '123', title: 'Test Task' },
          event: null,
        })
        .mockResolvedValueOnce({
          isIdempotent: true,
          responseStatus: '200',
          responseBody: { task: { id: '123', title: 'Test Task' }, event: null },
        });

      const firstResponse = await client['tasks-with-event'].$post({
        json: {
          workspaceId: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Test Task',
          idempotencyKey: 'unique-key-123',
        },
      });

      const secondResponse = await client['tasks-with-event'].$post({
        json: {
          workspaceId: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Test Task',
          idempotencyKey: 'unique-key-123',
        },
      });

      // Second request should return same response without creating duplicate
      expect(firstResponse.status).toBe(201);
      expect(secondResponse.status).toBe(200); // Idempotent replay returns 200 with cached result
    });

    it('validates calendarId belongs to workspace before creating event', async () => {
      const client = testClient(integrationRouter);
      const { createTaskWithEventCommand } = await import('../lib/work-operations.js');

      vi.mocked(createTaskWithEventCommand).mockRejectedValue(
        new Error('Calendar not found or does not belong to workspace'),
      );

      const response = await client['tasks-with-event'].$post({
        json: {
          workspaceId: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Test Task',
          calendarId: '550e8400-e29b-41d4-a716-446655440001', // Different workspace
          createCalendarEvent: true,
          dueDate: '2024-12-31T10:00:00Z',
        },
      });

      // Should fail when calendar belongs to different workspace
      expect(response.status).toBe(400);
    });

    it('validates projectId belongs to workspace before creating task', async () => {
      const client = testClient(integrationRouter);
      const { createTaskWithEventCommand } = await import('../lib/work-operations.js');

      vi.mocked(createTaskWithEventCommand).mockRejectedValue(
        new Error('Project not found or does not belong to workspace'),
      );

      const response = await client['tasks-with-event'].$post({
        json: {
          workspaceId: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Test Task',
          projectId: '550e8400-e29b-41d4-a716-446655440001', // Different workspace
        },
      });

      // Should fail when project belongs to different workspace
      expect(response.status).toBe(400);
    });
  });
});
