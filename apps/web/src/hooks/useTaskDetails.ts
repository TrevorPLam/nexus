import { apiClient } from '@life-os/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  type: string;
}

interface TaskAssignee {
  id: string;
  taskId: string;
  userId: string;
  assignedBy: string;
  assignedAt: string;
  isPrimary: boolean;
}

interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  parentId: string | null;
  mentions: string[] | null;
  createdAt: string;
  updatedAt: string;
}

interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  description: string | null;
  startedAt: string;
  stoppedAt: string | null;
  duration: string | null;
  isBillable: boolean;
  billableRate: string | null;
}

interface TaskAttachment {
  id: string;
  taskId: string;
  uploadedBy: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  storagePath: string;
  storageBucket: string;
}

export function useTaskDetails(selectedTask: { id: string } | null) {
  const queryClient = useQueryClient();

  // Task dependencies query
  const { data: dependenciesData } = useQuery({
    queryKey: ['taskDependencies', selectedTask?.id],
    queryFn: () =>
      selectedTask
        ? (apiClient.getTaskDependencies(selectedTask.id) as Promise<{
            dependencies: TaskDependency[];
          }>)
        : Promise.resolve({ dependencies: [] }),
    enabled: !!selectedTask,
  });
  const dependencies = dependenciesData?.dependencies || [];

  const createDependencyMutation = useMutation({
    mutationFn: (data: { taskId: string; dependsOnTaskId: string; type: string }) =>
      apiClient.createTaskDependency(data),
    onSuccess: () => {
      if (selectedTask) {
        void queryClient.invalidateQueries({ queryKey: ['taskDependencies', selectedTask.id] });
      }
    },
  });

  const deleteDependencyMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteTaskDependency(id),
    onSuccess: () => {
      if (selectedTask) {
        void queryClient.invalidateQueries({ queryKey: ['taskDependencies', selectedTask.id] });
      }
    },
  });

  // Task assignees query
  const { data: assigneesData } = useQuery({
    queryKey: ['taskAssignees', selectedTask?.id],
    queryFn: () =>
      selectedTask
        ? (apiClient.getTaskAssignees(selectedTask.id) as Promise<{ assignees: TaskAssignee[] }>)
        : Promise.resolve({ assignees: [] }),
    enabled: !!selectedTask,
  });
  const assignees = assigneesData?.assignees || [];

  const createAssigneeMutation = useMutation({
    mutationFn: (data: { taskId: string; userId: string; isPrimary: boolean }) =>
      apiClient.createTaskAssignee(data),
    onSuccess: () => {
      if (selectedTask) {
        void queryClient.invalidateQueries({ queryKey: ['taskAssignees', selectedTask.id] });
      }
    },
  });

  const deleteAssigneeMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteTaskAssignee(id),
    onSuccess: () => {
      if (selectedTask) {
        void queryClient.invalidateQueries({ queryKey: ['taskAssignees', selectedTask.id] });
      }
    },
  });

  // Task comments query
  const { data: commentsData } = useQuery({
    queryKey: ['taskComments', selectedTask?.id],
    queryFn: () =>
      selectedTask
        ? (apiClient.getTaskComments(selectedTask.id) as Promise<{ comments: TaskComment[] }>)
        : Promise.resolve({ comments: [] }),
    enabled: !!selectedTask,
  });
  const comments = commentsData?.comments || [];

  const createCommentMutation = useMutation({
    mutationFn: (data: { taskId: string; content: string }) => apiClient.createTaskComment(data),
    onSuccess: () => {
      if (selectedTask) {
        void queryClient.invalidateQueries({ queryKey: ['taskComments', selectedTask.id] });
      }
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteTaskComment(id),
    onSuccess: () => {
      if (selectedTask) {
        void queryClient.invalidateQueries({ queryKey: ['taskComments', selectedTask.id] });
      }
    },
  });

  // Time entries query
  const { data: timeEntriesData } = useQuery({
    queryKey: ['timeEntries', selectedTask?.id],
    queryFn: () =>
      selectedTask
        ? (apiClient.getTimeEntries(selectedTask.id) as Promise<{ timeEntries: TimeEntry[] }>)
        : Promise.resolve({ timeEntries: [] }),
    enabled: !!selectedTask,
  });
  const timeEntries = timeEntriesData?.timeEntries || [];

  const createTimeEntryMutation = useMutation({
    mutationFn: (data: { taskId: string; description?: string; startedAt: string }) =>
      apiClient.createTimeEntry(data),
    onSuccess: () => {
      if (selectedTask) {
        void queryClient.invalidateQueries({ queryKey: ['timeEntries', selectedTask.id] });
      }
    },
  });

  const updateTimeEntryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { stoppedAt?: string; duration?: string } }) =>
      apiClient.updateTimeEntry(id, data),
    onSuccess: () => {
      if (selectedTask) {
        void queryClient.invalidateQueries({ queryKey: ['timeEntries', selectedTask.id] });
      }
    },
  });

  const deleteTimeEntryMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteTimeEntry(id),
    onSuccess: () => {
      if (selectedTask) {
        void queryClient.invalidateQueries({ queryKey: ['timeEntries', selectedTask.id] });
      }
    },
  });

  // Task attachments query
  const { data: attachmentsData } = useQuery({
    queryKey: ['taskAttachments', selectedTask?.id],
    queryFn: () =>
      selectedTask
        ? (apiClient.getTaskAttachments(selectedTask.id) as Promise<{
            attachments: TaskAttachment[];
          }>)
        : Promise.resolve({ attachments: [] }),
    enabled: !!selectedTask,
  });
  const attachments = attachmentsData?.attachments || [];

  const createAttachmentMutation = useMutation({
    mutationFn: (data: {
      taskId: string;
      fileName: string;
      fileType: string;
      fileSize: string;
      storagePath: string;
    }) => apiClient.createTaskAttachment(data),
    onSuccess: () => {
      if (selectedTask) {
        void queryClient.invalidateQueries({ queryKey: ['taskAttachments', selectedTask.id] });
      }
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteTaskAttachment(id),
    onSuccess: () => {
      if (selectedTask) {
        void queryClient.invalidateQueries({ queryKey: ['taskAttachments', selectedTask.id] });
      }
    },
  });

  return {
    dependencies,
    createDependencyMutation,
    deleteDependencyMutation,
    assignees,
    createAssigneeMutation,
    deleteAssigneeMutation,
    comments,
    createCommentMutation,
    deleteCommentMutation,
    timeEntries,
    createTimeEntryMutation,
    updateTimeEntryMutation,
    deleteTimeEntryMutation,
    attachments,
    createAttachmentMutation,
    deleteAttachmentMutation,
  };
}
