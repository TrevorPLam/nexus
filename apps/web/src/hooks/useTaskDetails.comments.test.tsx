import { apiClient } from '@life-os/api-client';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useTaskDetails } from './useTaskDetails';
import { createQueryClient, createWrapper } from './useTaskDetails.test-helpers';
import type { QueryClient } from '@tanstack/react-query';

describe('useTaskDetails - Comments', () => {
  let queryClient: QueryClient;
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    queryClient = createQueryClient();
    wrapper = createWrapper(queryClient);
    vi.clearAllMocks();
  });

  it('fetches task comments when task selected', async () => {
    const mockComments = [
      {
        id: '1',
        taskId: 'task-1',
        userId: 'user-1',
        content: 'Test comment',
        parentId: null,
        mentions: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];
    vi.mocked(apiClient.getTaskComments).mockResolvedValue({ comments: mockComments } as never);

    const { result } = renderHook(() => useTaskDetails({ id: 'task-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.comments).toEqual(mockComments);
    });

    expect(apiClient.getTaskComments).toHaveBeenCalledWith('task-1');
  });

  it('creates task comment and invalidates query', async () => {
    const mockComments = [
      {
        id: '1',
        taskId: 'task-1',
        userId: 'user-1',
        content: 'Test comment',
        parentId: null,
        mentions: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];
    vi.mocked(apiClient.getTaskComments).mockResolvedValue({ comments: mockComments } as never);
    vi.mocked(apiClient.createTaskComment).mockResolvedValue({
      id: '2',
      taskId: 'task-1',
      userId: 'user-1',
      content: 'New comment',
      parentId: null,
      mentions: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });

    const { result } = renderHook(() => useTaskDetails({ id: 'task-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.comments).toEqual(mockComments);
    });

    await result.current.createCommentMutation.mutateAsync({
      taskId: 'task-1',
      content: 'New comment',
    });

    expect(apiClient.createTaskComment).toHaveBeenCalledWith({
      taskId: 'task-1',
      content: 'New comment',
    });
  });

  it('deletes task comment and invalidates query', async () => {
    const mockComments = [
      {
        id: '1',
        taskId: 'task-1',
        userId: 'user-1',
        content: 'Test comment',
        parentId: null,
        mentions: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];
    vi.mocked(apiClient.getTaskComments).mockResolvedValue({ comments: mockComments } as never);
    vi.mocked(apiClient.deleteTaskComment).mockResolvedValue(undefined);

    const { result } = renderHook(() => useTaskDetails({ id: 'task-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.comments).toEqual(mockComments);
    });

    await result.current.deleteCommentMutation.mutateAsync('1');

    expect(apiClient.deleteTaskComment).toHaveBeenCalledWith('1');
  });
});
