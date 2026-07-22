import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ApiClient, apiClient } from './index';

describe('API Client Package', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient('http://test-api.com');
    global.fetch = vi.fn();
  });

  describe('ApiClient Class', () => {
    it('creates client with default base URL', () => {
      const defaultClient = new ApiClient();
      expect(defaultClient).toBeDefined();
    });

    it('creates client with custom base URL', () => {
      const customClient = new ApiClient('http://custom.com');
      expect(customClient).toBeDefined();
    });
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
        json: async () => ({ id: 'project-123' }),
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

      await client.createProject({ name: 'New Project' });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/v1/work/projects',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'New Project' }),
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
        json: async () => ({ id: 'task-123' }),
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

      await client.createTask({ title: 'New Task' });

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

  describe('Error Handling', () => {
    it('throws error on failed request', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Not found' }),
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

  describe('Default Export', () => {
    it('exports default apiClient instance', () => {
      expect(apiClient).toBeInstanceOf(ApiClient);
    });
  });
});
