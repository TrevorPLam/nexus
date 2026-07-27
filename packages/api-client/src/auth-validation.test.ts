/**
 * Tests for API client authentication, error handling, and response validation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ApiClient } from './index';

describe('API Client Auth and Validation', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient('http://test-api.com');
    global.fetch = vi.fn();
  });

  describe('Token Provider', () => {
    it('adds Authorization header when token is available', async () => {
      const mockTokenProvider = {
        getAccessToken: vi.fn().mockResolvedValue('test-token-123'),
      };
      const clientWithToken = new ApiClient('http://test-api.com', mockTokenProvider);

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

      await clientWithToken.getProject('project-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/v1/work/projects/project-123',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token-123',
          },
        }),
      );
    });

    it('does not add Authorization header when token is null', async () => {
      const mockTokenProvider = {
        getAccessToken: vi.fn().mockResolvedValue(null),
      };
      const clientWithToken = new ApiClient('http://test-api.com', mockTokenProvider);

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

      await clientWithToken.getProject('project-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/v1/work/projects/project-123',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/v1/work/projects/project-123',
        expect.not.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.any(String),
          }),
        }),
      );
    });

    it('preserves caller headers alongside Authorization header', async () => {
      const mockTokenProvider = {
        getAccessToken: vi.fn().mockResolvedValue('test-token-123'),
      };
      const clientWithToken = new ApiClient('http://test-api.com', mockTokenProvider);

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

      await clientWithToken.createProject({
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'New Project',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/v1/work/projects',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token-123',
          },
        }),
      );
    });

    it('throws typed authentication error when token is missing for protected endpoint', async () => {
      const mockTokenProvider = {
        getAccessToken: vi.fn().mockResolvedValue(null),
      };
      const clientWithToken = new ApiClient('http://test-api.com', mockTokenProvider);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }),
      } as Response);

      await expect(clientWithToken.getProject('project-123')).rejects.toThrow('Unauthorized');
    });
  });

  describe('Error Handling', () => {
    it('throws error on failed request', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        json: async () => ({ error: { code: 'NOT_FOUND', message: 'Not found' } }),
      } as Response);

      await expect(client.getProject('invalid-id')).rejects.toThrow('Not found');
    });

    it('throws generic error when error message not provided', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        json: async () => ({}),
      } as Response);

      await expect(client.getProject('invalid-id')).rejects.toThrow('API request failed');
    });
  });

  describe('Response Validation', () => {
    it('rejects invalid project response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'invalid-uuid', name: 'Test' }),
      } as Response);

      await expect(client.getProject('123')).rejects.toThrow('Invalid response');
    });

    it('rejects invalid task response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'invalid-uuid', title: 'Test' }),
      } as Response);

      await expect(client.getTask('123')).rejects.toThrow('Invalid response');
    });

    it('rejects invalid calendar response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'invalid-uuid', name: 'Test' }),
      } as Response);

      await expect(client.getCalendar('123')).rejects.toThrow('Invalid response');
    });

    it('rejects invalid event response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'invalid-uuid', title: 'Test' }),
      } as Response);

      await expect(client.getEvent('123')).rejects.toThrow('Invalid response');
    });

    it('rejects task response missing isMilestone field', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: '123e4567-e89b-12d3-a456-426614174000',
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Task',
          status: 'todo',
          priority: 'medium',
          isMilestone: false,
        }),
      } as Response);

      await expect(client.getTask('123')).rejects.toThrow('Invalid response');
    });

    it('rejects task response with invalid UUID', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'not-a-uuid',
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Task',
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

      await expect(client.getTask('123')).rejects.toThrow('Invalid response');
    });

    it('rejects invalid task dependency response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [{ id: 'invalid-uuid', taskId: '123' }],
      } as Response);

      await expect(client.getTaskDependencies('123')).rejects.toThrow('Invalid response');
    });

    it('rejects invalid task assignee response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [{ id: 'invalid-uuid', taskId: '123' }],
      } as Response);

      await expect(client.getTaskAssignees('123')).rejects.toThrow('Invalid response');
    });

    it('rejects invalid task comment response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [{ id: 'invalid-uuid', taskId: '123' }],
      } as Response);

      await expect(client.getTaskComments('123')).rejects.toThrow('Invalid response');
    });

    it('rejects invalid task attachment response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [{ id: 'invalid-uuid', taskId: '123' }],
      } as Response);

      await expect(client.getTaskAttachments('123')).rejects.toThrow('Invalid response');
    });

    it('rejects invalid task note response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [{ id: 'invalid-uuid', taskId: '123' }],
      } as Response);

      await expect(client.getTaskNotes('123')).rejects.toThrow('Invalid response');
    });

    it('rejects invalid time entry response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [{ id: 'invalid-uuid', taskId: '123' }],
      } as Response);

      await expect(client.getTimeEntries('123')).rejects.toThrow('Invalid response');
    });

    it('rejects invalid event attendee response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [{ id: 'invalid-uuid', eventId: '123' }],
      } as Response);

      await expect(client.getEventAttendees('123')).rejects.toThrow('Invalid response');
    });
  });
});
