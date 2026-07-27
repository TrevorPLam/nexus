import { apiClient } from '@life-os/api-client';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useTaskDetails } from './useTaskDetails';
import { createQueryClient, createWrapper } from './useTaskDetails.test-helpers';
import type { QueryClient } from '@tanstack/react-query';

describe('useTaskDetails - Assignees', () => {
  let queryClient: QueryClient;
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    queryClient = createQueryClient();
    wrapper = createWrapper(queryClient);
    vi.clearAllMocks();
  });

  it('fetches task assignees when task selected', async () => {
    const mockAssignees = [
      {
        id: '1',
        taskId: 'task-1',
        userId: 'user-1',
        assignedBy: 'user-2',
        assignedAt: '2024-01-01T00:00:00Z',
        isPrimary: true,
      },
    ];
    vi.mocked(apiClient.getTaskAssignees).mockResolvedValue({ assignees: mockAssignees } as never);

    const { result } = renderHook(() => useTaskDetails({ id: 'task-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.assignees).toEqual(mockAssignees);
    });

    expect(apiClient.getTaskAssignees).toHaveBeenCalledWith('task-1');
  });

  it('creates task assignee and invalidates query', async () => {
    const mockAssignees = [
      {
        id: '1',
        taskId: 'task-1',
        userId: 'user-1',
        assignedBy: 'user-2',
        assignedAt: '2024-01-01T00:00:00Z',
        isPrimary: true,
      },
    ];
    vi.mocked(apiClient.getTaskAssignees).mockResolvedValue({ assignees: mockAssignees } as never);
    vi.mocked(apiClient.createTaskAssignee).mockResolvedValue({
      id: '2',
      taskId: 'task-1',
      userId: 'user-3',
      assignedBy: 'user-2',
      assignedAt: '2024-01-01T00:00:00Z',
      isPrimary: false,
    });

    const { result } = renderHook(() => useTaskDetails({ id: 'task-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.assignees).toEqual(mockAssignees);
    });

    await result.current.createAssigneeMutation.mutateAsync({
      taskId: 'task-1',
      userId: 'user-3',
      isPrimary: false,
    });

    expect(apiClient.createTaskAssignee).toHaveBeenCalledWith({
      taskId: 'task-1',
      userId: 'user-3',
      isPrimary: false,
    });
  });

  it('deletes task assignee and invalidates query', async () => {
    const mockAssignees = [
      {
        id: '1',
        taskId: 'task-1',
        userId: 'user-1',
        assignedBy: 'user-2',
        assignedAt: '2024-01-01T00:00:00Z',
        isPrimary: true,
      },
    ];
    vi.mocked(apiClient.getTaskAssignees).mockResolvedValue({ assignees: mockAssignees } as never);
    vi.mocked(apiClient.deleteTaskAssignee).mockResolvedValue(undefined);

    const { result } = renderHook(() => useTaskDetails({ id: 'task-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.assignees).toEqual(mockAssignees);
    });

    await result.current.deleteAssigneeMutation.mutateAsync('1');

    expect(apiClient.deleteTaskAssignee).toHaveBeenCalledWith('1');
  });
});
