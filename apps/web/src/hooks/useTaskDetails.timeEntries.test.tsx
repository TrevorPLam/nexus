import { apiClient } from '@life-os/api-client';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useTaskDetails } from './useTaskDetails';
import { createQueryClient, createWrapper } from './useTaskDetails.test-helpers';
import type { QueryClient } from '@tanstack/react-query';

describe('useTaskDetails - Time Entries', () => {
  let queryClient: QueryClient;
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    queryClient = createQueryClient();
    wrapper = createWrapper(queryClient);
    vi.clearAllMocks();
  });

  it('fetches time entries when task selected', async () => {
    const mockTimeEntries = [
      {
        id: '1',
        taskId: 'task-1',
        userId: 'user-1',
        description: 'Test work',
        startedAt: '2024-01-01T00:00:00Z',
        stoppedAt: '2024-01-01T01:00:00Z',
        duration: '3600',
        isBillable: true,
        billableRate: '100',
      },
    ];
    vi.mocked(apiClient.getTimeEntries).mockResolvedValue({
      timeEntries: mockTimeEntries,
    } as never);

    const { result } = renderHook(() => useTaskDetails({ id: 'task-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.timeEntries).toEqual(mockTimeEntries);
    });

    expect(apiClient.getTimeEntries).toHaveBeenCalledWith('task-1');
  });

  it('creates time entry and invalidates query', async () => {
    const mockTimeEntries = [
      {
        id: '1',
        taskId: 'task-1',
        userId: 'user-1',
        description: 'Test work',
        startedAt: '2024-01-01T00:00:00Z',
        stoppedAt: '2024-01-01T01:00:00Z',
        duration: '3600',
        isBillable: true,
        billableRate: '100',
      },
    ];
    vi.mocked(apiClient.getTimeEntries).mockResolvedValue({
      timeEntries: mockTimeEntries,
    } as never);
    vi.mocked(apiClient.createTimeEntry).mockResolvedValue({
      id: '2',
      taskId: 'task-1',
      userId: 'user-1',
      description: 'New work',
      startedAt: '2024-01-01T02:00:00Z',
      stoppedAt: null,
      duration: null,
      isBillable: false,
      billableRate: null,
    });

    const { result } = renderHook(() => useTaskDetails({ id: 'task-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.timeEntries).toEqual(mockTimeEntries);
    });

    await result.current.createTimeEntryMutation.mutateAsync({
      taskId: 'task-1',
      description: 'New work',
      startedAt: '2024-01-01T02:00:00Z',
    });

    expect(apiClient.createTimeEntry).toHaveBeenCalledWith({
      taskId: 'task-1',
      description: 'New work',
      startedAt: '2024-01-01T02:00:00Z',
    });
  });

  it('updates time entry and invalidates query', async () => {
    const mockTimeEntries = [
      {
        id: '1',
        taskId: 'task-1',
        userId: 'user-1',
        description: 'Test work',
        startedAt: '2024-01-01T00:00:00Z',
        stoppedAt: null,
        duration: null,
        isBillable: true,
        billableRate: '100',
      },
    ];
    vi.mocked(apiClient.getTimeEntries).mockResolvedValue({
      timeEntries: mockTimeEntries,
    } as never);
    vi.mocked(apiClient.updateTimeEntry).mockResolvedValue({
      id: '1',
      taskId: 'task-1',
      userId: 'user-1',
      description: 'Test work',
      startedAt: '2024-01-01T00:00:00Z',
      stoppedAt: '2024-01-01T01:00:00Z',
      duration: '3600',
      isBillable: true,
      billableRate: '100',
    });

    const { result } = renderHook(() => useTaskDetails({ id: 'task-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.timeEntries).toEqual(mockTimeEntries);
    });

    await result.current.updateTimeEntryMutation.mutateAsync({
      id: '1',
      data: { stoppedAt: '2024-01-01T01:00:00Z', duration: '3600' },
    });

    expect(apiClient.updateTimeEntry).toHaveBeenCalledWith('1', {
      stoppedAt: '2024-01-01T01:00:00Z',
      duration: '3600',
    });
  });

  it('deletes time entry and invalidates query', async () => {
    const mockTimeEntries = [
      {
        id: '1',
        taskId: 'task-1',
        userId: 'user-1',
        description: 'Test work',
        startedAt: '2024-01-01T00:00:00Z',
        stoppedAt: '2024-01-01T01:00:00Z',
        duration: '3600',
        isBillable: true,
        billableRate: '100',
      },
    ];
    vi.mocked(apiClient.getTimeEntries).mockResolvedValue({
      timeEntries: mockTimeEntries,
    } as never);
    vi.mocked(apiClient.deleteTimeEntry).mockResolvedValue(undefined);

    const { result } = renderHook(() => useTaskDetails({ id: 'task-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.timeEntries).toEqual(mockTimeEntries);
    });

    await result.current.deleteTimeEntryMutation.mutateAsync('1');

    expect(apiClient.deleteTimeEntry).toHaveBeenCalledWith('1');
  });
});
