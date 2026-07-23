import { apiClient } from '@life-os/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Task } from '../app/work/types';

export function useWorkTasks(
  workspaceId: string,
  selectedProject: string | null,
  filterPriority: string | null,
) {
  const queryClient = useQueryClient();

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', workspaceId, selectedProject, filterPriority],
    queryFn: () => apiClient.getTasks(workspaceId) as Promise<{ tasks: Task[] }>,
  });

  const tasks = tasksData?.tasks || [];

  const createTaskMutation = useMutation({
    mutationFn: (data: {
      title: string;
      projectId?: string;
      description?: string;
      priority?: string;
      dueDate?: string;
      estimatedDuration?: number;
      energyLevel?: string;
    }) => apiClient.createTask({ workspaceId, ...data }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      apiClient.updateTask(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteTask(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    },
  });

  return {
    tasks,
    createTaskMutation,
    updateTaskMutation,
    deleteTaskMutation,
  };
}
