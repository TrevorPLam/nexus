import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useWorkTasks } from './useWorkTasks';
import { apiClient } from '@life-os/api-client';

// Mock the API client
vi.mock('@life-os/api-client', () => ({
  apiClient: {
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  },
}));

describe('useWorkTasks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('exports useWorkTasks hook', () => {
    expect(useWorkTasks).toBeDefined();
    expect(typeof useWorkTasks).toBe('function');
  });

  it('fetches tasks for workspace with project filter', async () => {
    const mockTasks = [
      { id: '1', title: 'Task 1', projectId: 'project-1' },
      { id: '2', title: 'Task 2', projectId: 'project-1' },
    ];
    vi.mocked(apiClient.getTasks).mockResolvedValue(mockTasks as any);

    const { result } = renderHook(
      () => useWorkTasks('workspace-1', 'project-1', null),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.tasks).toEqual(mockTasks);
    });

    expect(apiClient.getTasks).toHaveBeenCalledWith('workspace-1', {
      projectId: 'project-1',
    });
  });

  it('fetches tasks for workspace with priority filter', async () => {
    const mockTasks = [
      { id: '1', title: 'Task 1', priority: 'high' },
      { id: '2', title: 'Task 2', priority: 'high' },
    ];
    vi.mocked(apiClient.getTasks).mockResolvedValue(mockTasks as any);

    const { result } = renderHook(
      () => useWorkTasks('workspace-1', null, 'high'),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.tasks).toEqual(mockTasks);
    });

    expect(apiClient.getTasks).toHaveBeenCalledWith('workspace-1', {
      priority: 'high',
    });
  });

  it('fetches tasks for workspace with both project and priority filters', async () => {
    const mockTasks = [
      { id: '1', title: 'Task 1', projectId: 'project-1', priority: 'high' },
    ];
    vi.mocked(apiClient.getTasks).mockResolvedValue(mockTasks as any);

    const { result } = renderHook(
      () => useWorkTasks('workspace-1', 'project-1', 'high'),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.tasks).toEqual(mockTasks);
    });

    expect(apiClient.getTasks).toHaveBeenCalledWith('workspace-1', {
      projectId: 'project-1',
      priority: 'high',
    });
  });

  it('updates query key when filters change', async () => {
    vi.mocked(apiClient.getTasks).mockResolvedValue([] as any);

    const { rerender } = renderHook(
      ({ projectId, priority }) => useWorkTasks('workspace-1', projectId, priority),
      {
        wrapper,
        initialProps: { projectId: 'project-1', priority: null as string | null },
      },
    );

    await waitFor(() => {
      expect(apiClient.getTasks).toHaveBeenCalledWith('workspace-1', {
        projectId: 'project-1',
      });
    });

    rerender({ projectId: 'project-2', priority: 'high' });

    await waitFor(() => {
      expect(apiClient.getTasks).toHaveBeenCalledWith('workspace-1', {
        projectId: 'project-2',
        priority: 'high',
      });
    });
  });

  it('exposes loading state', () => {
    vi.mocked(apiClient.getTasks).mockImplementation(
      () => new Promise(() => {}),
    );

    const { result } = renderHook(
      () => useWorkTasks('workspace-1', null, null),
      { wrapper },
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('exposes error state on fetch failure', async () => {
    vi.mocked(apiClient.getTasks).mockRejectedValue(
      new Error('Failed to fetch tasks'),
    );

    const { result } = renderHook(
      () => useWorkTasks('workspace-1', null, null),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  it('creates task and invalidates query', async () => {
    const mockTask = { id: '1', title: 'New Task' };
    vi.mocked(apiClient.getTasks).mockResolvedValue([] as any);
    vi.mocked(apiClient.createTask).mockResolvedValue(mockTask as any);

    const { result } = renderHook(
      () => useWorkTasks('workspace-1', null, null),
      { wrapper },
    );

    await result.current.createTaskMutation.mutateAsync({
      title: 'New Task',
    });

    expect(apiClient.createTask).toHaveBeenCalledWith({
      title: 'New Task',
      workspaceId: 'workspace-1',
      status: 'todo',
      isMilestone: false,
      priority: 'medium',
      projectId: undefined,
      description: undefined,
      dueDate: undefined,
      estimatedDuration: undefined,
      energyLevel: undefined,
    });
  });

  it('updates task and invalidates query', async () => {
    const mockTask = { id: '1', title: 'Updated Task' };
    vi.mocked(apiClient.getTasks).mockResolvedValue([] as any);
    vi.mocked(apiClient.updateTask).mockResolvedValue(mockTask as any);

    const { result } = renderHook(
      () => useWorkTasks('workspace-1', null, null),
      { wrapper },
    );

    await result.current.updateTaskMutation.mutateAsync({
      id: '1',
      data: { title: 'Updated Task' },
    });

    expect(apiClient.updateTask).toHaveBeenCalledWith('1', {
      title: 'Updated Task',
    });
  });

  it('deletes task and invalidates query', async () => {
    vi.mocked(apiClient.getTasks).mockResolvedValue([] as any);
    vi.mocked(apiClient.deleteTask).mockResolvedValue(undefined);

    const { result } = renderHook(
      () => useWorkTasks('workspace-1', null, null),
      { wrapper },
    );

    await result.current.deleteTaskMutation.mutateAsync('1');

    expect(apiClient.deleteTask).toHaveBeenCalledWith('1');
  });

  it('does not fetch when workspaceId is null', () => {
    const { result } = renderHook(() => useWorkTasks(null, null, null), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(false);
    expect(apiClient.getTasks).not.toHaveBeenCalled();
  });

  it('exposes error state on create task failure', async () => {
    vi.mocked(apiClient.getTasks).mockResolvedValue([] as any);
    vi.mocked(apiClient.createTask).mockRejectedValue(
      new Error('Failed to create task'),
    );

    const { result } = renderHook(
      () => useWorkTasks('workspace-1', null, null),
      { wrapper },
    );

    result.current.createTaskMutation.mutate({
      title: 'New Task',
    });

    await waitFor(() => {
      expect(result.current.createTaskMutation.error).toBeInstanceOf(Error);
    });
  });

  it('exposes error state on update task failure', async () => {
    vi.mocked(apiClient.getTasks).mockResolvedValue([] as any);
    vi.mocked(apiClient.updateTask).mockRejectedValue(
      new Error('Failed to update task'),
    );

    const { result } = renderHook(
      () => useWorkTasks('workspace-1', null, null),
      { wrapper },
    );

    result.current.updateTaskMutation.mutate({
      id: '1',
      data: { title: 'Updated Task' },
    });

    await waitFor(() => {
      expect(result.current.updateTaskMutation.error).toBeInstanceOf(Error);
    });
  });

  it('exposes error state on delete task failure', async () => {
    vi.mocked(apiClient.getTasks).mockResolvedValue([] as any);
    vi.mocked(apiClient.deleteTask).mockRejectedValue(
      new Error('Failed to delete task'),
    );

    const { result } = renderHook(
      () => useWorkTasks('workspace-1', null, null),
      { wrapper },
    );

    result.current.deleteTaskMutation.mutate('1');

    await waitFor(() => {
      expect(result.current.deleteTaskMutation.error).toBeInstanceOf(Error);
    });
  });
});
