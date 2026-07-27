import { apiClient } from '@life-os/api-client';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useTaskDetails } from './useTaskDetails';
import { createQueryClient, createWrapper } from './useTaskDetails.test-helpers';
import type { QueryClient } from '@tanstack/react-query';

describe('useTaskDetails - Dependencies', () => {
  let queryClient: QueryClient;
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    queryClient = createQueryClient();
    wrapper = createWrapper(queryClient);
    vi.clearAllMocks();
  });

  it('fetches task dependencies when task selected', async () => {
    const mockDependencies = [
      { id: '1', taskId: 'task-1', dependsOnTaskId: 'task-2', type: 'finish_to_start' },
    ];
    vi.mocked(apiClient.getTaskDependencies).mockResolvedValue({
      dependencies: mockDependencies,
    } as never);

    const { result } = renderHook(() => useTaskDetails({ id: 'task-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.dependencies).toEqual(mockDependencies);
    });

    expect(apiClient.getTaskDependencies).toHaveBeenCalledWith('task-1');
  });

  it('creates task dependency and invalidates query', async () => {
    const mockDependencies = [
      { id: '1', taskId: 'task-1', dependsOnTaskId: 'task-2', type: 'finish_to_start' },
    ];
    vi.mocked(apiClient.getTaskDependencies).mockResolvedValue({
      dependencies: mockDependencies,
    } as never);
    vi.mocked(apiClient.createTaskDependency).mockResolvedValue({
      id: '2',
      taskId: 'task-1',
      dependsOnTaskId: 'task-3',
      type: 'start_to_start',
    });

    const { result } = renderHook(() => useTaskDetails({ id: 'task-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.dependencies).toEqual(mockDependencies);
    });

    await result.current.createDependencyMutation.mutateAsync({
      taskId: 'task-1',
      dependsOnTaskId: 'task-3',
      type: 'start_to_start',
    });

    expect(apiClient.createTaskDependency).toHaveBeenCalledWith({
      taskId: 'task-1',
      dependsOnTaskId: 'task-3',
      type: 'start_to_start',
    });
  });

  it('deletes task dependency and invalidates query', async () => {
    const mockDependencies = [
      { id: '1', taskId: 'task-1', dependsOnTaskId: 'task-2', type: 'finish_to_start' },
    ];
    vi.mocked(apiClient.getTaskDependencies).mockResolvedValue({
      dependencies: mockDependencies,
    } as never);
    vi.mocked(apiClient.deleteTaskDependency).mockResolvedValue(undefined);

    const { result } = renderHook(() => useTaskDetails({ id: 'task-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.dependencies).toEqual(mockDependencies);
    });

    await result.current.deleteDependencyMutation.mutateAsync('1');

    expect(apiClient.deleteTaskDependency).toHaveBeenCalledWith('1');
  });
});
