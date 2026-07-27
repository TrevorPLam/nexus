/**
 * Tests for API client methods (Project, Task, Calendar).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ApiClient } from './index';

describe('API Client Methods', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient('http://test-api.com');
    global.fetch = vi.fn();
  });

  describe('Project Methods', () => {
    it('getProjects calls correct endpoint', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      await client.getProjects('workspace-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/v1/work/workspaces/workspace-123/projects',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('getProject calls correct endpoint', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: '123e4567-e89b-12d3-a456-426614174000',
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Project',
          description: null,
          color: null,
          icon: null,
          status: 'active',
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      } as Response);

      await client.getProject('project-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/v1/work/projects/project-123',
        expect.any(Object),
      );
    });

    it('createProject sends POST request', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'new-project' }),
      } as Response);

      await client.createProject({
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'New Project',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/v1/work/projects',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            workspaceId: '123e4567-e89b-12d3-a456-426614174000',
            name: 'New Project',
          }),
        }),
      );
    });
  });

  describe('Task Methods', () => {
    it('getTasks calls correct endpoint with filters', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      await client.getTasks('workspace-123', { status: 'active' });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/v1/work/workspaces/workspace-123/tasks?status=active',
        expect.any(Object),
      );
    });

    it('getTask calls correct endpoint', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: '123e4567-e89b-12d3-a456-426614174000',
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Task',
          description: null,
          status: 'todo',
          priority: 'medium',
          dueDate: null,
          dueTime: null,
          estimatedDuration: null,
          completedAt: null,
          projectId: null,
          parentId: null,
          calendarEventId: null,
          recurrenceRule: null,
          recurrenceId: null,
          energyLevel: null,
          contextTags: null,
          isMilestone: false,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      } as Response);

      await client.getTask('task-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/v1/work/tasks/task-123',
        expect.any(Object),
      );
    });

    it('createTask sends POST request', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'new-task' }),
      } as Response);

      await client.createTask({
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'New Task',
        status: 'todo',
        priority: 'medium',
        isMilestone: false,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/v1/work/tasks',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  describe('Calendar Methods', () => {
    it('getCalendars calls correct endpoint', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      await client.getCalendars('workspace-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/v1/calendar/workspaces/workspace-123/calendars',
        expect.any(Object),
      );
    });

    it('getEvents calls correct endpoint with filters', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      await client.getEvents('workspace-123', { start: '2024-01-01' });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/v1/calendar/workspaces/workspace-123/events?start=2024-01-01',
        expect.any(Object),
      );
    });
  });
});
