import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTaskDetails } from './useTaskDetails';
import { apiClient } from '@life-os/api-client';

// Mock the apiClient
vi.mock('@life-os/api-client', () => ({
  apiClient: {
    getTaskDependencies: vi.fn(),
    createTaskDependency: vi.fn(),
    deleteTaskDependency: vi.fn(),
    getTaskAssignees: vi.fn(),
    createTaskAssignee: vi.fn(),
    deleteTaskAssignee: vi.fn(),
    getTaskComments: vi.fn(),
    createTaskComment: vi.fn(),
    deleteTaskComment: vi.fn(),
    getTimeEntries: vi.fn(),
    createTimeEntry: vi.fn(),
    updateTimeEntry: vi.fn(),
    deleteTimeEntry: vi.fn(),
    getTaskAttachments: vi.fn(),
    createTaskAttachment: vi.fn(),
    deleteTaskAttachment: vi.fn(),
  },
}));

describe('useTaskDetails', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('exports useTaskDetails hook', () => {
    expect(useTaskDetails).toBeDefined();
    expect(typeof useTaskDetails).toBe('function');
  });

  it('fetches task dependencies when task selected', async () => {
    const mockDependencies = [
      { id: '1', taskId: 'task-1', dependsOnTaskId: 'task-2', type: 'finish_to_start' },
    ];
    vi.mocked(apiClient.getTaskDependencies).mockResolvedValue({ dependencies: mockDependencies });

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
    vi.mocked(apiClient.getTaskDependencies).mockResolvedValue({ dependencies: mockDependencies });
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
    vi.mocked(apiClient.getTaskDependencies).mockResolvedValue({ dependencies: mockDependencies });
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
    vi.mocked(apiClient.getTaskAssignees).mockResolvedValue({ assignees: mockAssignees });

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
    vi.mocked(apiClient.getTaskAssignees).mockResolvedValue({ assignees: mockAssignees });
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
    vi.mocked(apiClient.getTaskAssignees).mockResolvedValue({ assignees: mockAssignees });
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
    vi.mocked(apiClient.getTaskComments).mockResolvedValue({ comments: mockComments });

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
    vi.mocked(apiClient.getTaskComments).mockResolvedValue({ comments: mockComments });
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
    vi.mocked(apiClient.getTaskComments).mockResolvedValue({ comments: mockComments });
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
    vi.mocked(apiClient.getTimeEntries).mockResolvedValue({ timeEntries: mockTimeEntries });

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
    vi.mocked(apiClient.getTimeEntries).mockResolvedValue({ timeEntries: mockTimeEntries });
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
    vi.mocked(apiClient.getTimeEntries).mockResolvedValue({ timeEntries: mockTimeEntries });
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
    vi.mocked(apiClient.getTimeEntries).mockResolvedValue({ timeEntries: mockTimeEntries });
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
    vi.mocked(apiClient.getTaskAttachments).mockResolvedValue({ attachments: mockAttachments });

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
    vi.mocked(apiClient.getTaskAttachments).mockResolvedValue({ attachments: mockAttachments });
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
    vi.mocked(apiClient.getTaskAttachments).mockResolvedValue({ attachments: mockAttachments });
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
