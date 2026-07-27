import { apiClient } from '@life-os/api-client';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useTaskDetails } from './useTaskDetails';
import { createQueryClient, createWrapper } from './useTaskDetails.test-helpers';
import type { QueryClient } from '@tanstack/react-query';

describe('useTaskDetails - Attachments', () => {
  let queryClient: QueryClient;
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    queryClient = createQueryClient();
    wrapper = createWrapper(queryClient);
    vi.clearAllMocks();
  });

  it('fetches task attachments when task selected', async () => {
    const mockAttachments = [
      {
        id: '1',
        taskId: 'task-1',
        uploadedBy: 'user-1',
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: '1024',
        storagePath: 'path/to/test.pdf',
        storageBucket: 'attachments',
      },
    ];
    vi.mocked(apiClient.getTaskAttachments).mockResolvedValue({
      attachments: mockAttachments,
    } as never);

    const { result } = renderHook(() => useTaskDetails({ id: 'task-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.attachments).toEqual(mockAttachments);
    });

    expect(apiClient.getTaskAttachments).toHaveBeenCalledWith('task-1');
  });

  it('creates task attachment and invalidates query', async () => {
    const mockAttachments = [
      {
        id: '1',
        taskId: 'task-1',
        uploadedBy: 'user-1',
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: '1024',
        storagePath: 'path/to/test.pdf',
        storageBucket: 'attachments',
      },
    ];
    vi.mocked(apiClient.getTaskAttachments).mockResolvedValue({
      attachments: mockAttachments,
    } as never);
    vi.mocked(apiClient.createTaskAttachment).mockResolvedValue({
      id: '2',
      taskId: 'task-1',
      uploadedBy: 'user-1',
      fileName: 'new.pdf',
      fileType: 'application/pdf',
      fileSize: '2048',
      storagePath: 'path/to/new.pdf',
      storageBucket: 'attachments',
    });

    const { result } = renderHook(() => useTaskDetails({ id: 'task-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.attachments).toEqual(mockAttachments);
    });

    await result.current.createAttachmentMutation.mutateAsync({
      taskId: 'task-1',
      fileName: 'new.pdf',
      fileType: 'application/pdf',
      fileSize: '2048',
      storagePath: 'path/to/new.pdf',
    });

    expect(apiClient.createTaskAttachment).toHaveBeenCalledWith({
      taskId: 'task-1',
      fileName: 'new.pdf',
      fileType: 'application/pdf',
      fileSize: '2048',
      storagePath: 'path/to/new.pdf',
    });
  });

  it('deletes task attachment and invalidates query', async () => {
    const mockAttachments = [
      {
        id: '1',
        taskId: 'task-1',
        uploadedBy: 'user-1',
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: '1024',
        storagePath: 'path/to/test.pdf',
        storageBucket: 'attachments',
      },
    ];
    vi.mocked(apiClient.getTaskAttachments).mockResolvedValue({
      attachments: mockAttachments,
    } as never);
    vi.mocked(apiClient.deleteTaskAttachment).mockResolvedValue(undefined);

    const { result } = renderHook(() => useTaskDetails({ id: 'task-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.attachments).toEqual(mockAttachments);
    });

    await result.current.deleteAttachmentMutation.mutateAsync('1');

    expect(apiClient.deleteTaskAttachment).toHaveBeenCalledWith('1');
  });
});
