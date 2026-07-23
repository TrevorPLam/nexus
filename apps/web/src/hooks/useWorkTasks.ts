import { apiClient } from '@life-os/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Task } from '../app/work/types';

export function useWorkTasks(
  workspaceId: string | null,
  selectedProject: string | null,
  filterPriority: string | null,
) {
  const queryClient = useQueryClient();

  // Build filters object from state
  const filters: Record<string, string> = {};
  if (selectedProject) {
    filters.projectId = selectedProject;
  }
  if (filterPriority) {
    filters.priority = filterPriority;
  }

  const {
    data: tasksData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['tasks', workspaceId, selectedProject, filterPriority],
    queryFn: () => apiClient.getTasks(workspaceId!, filters),
    enabled: !!workspaceId,
  });

  const tasks = (tasksData || []) as Task[];

  const createTaskMutation = useMutation({
    mutationFn: (data: {
      title: string;
      projectId?: string;
      description?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      dueDate?: string;
      estimatedDuration?: number;
      energyLevel?: 'low' | 'medium' | 'high';
    }) => {
      if (!workspaceId) {
        throw new Error('Workspace ID is required');
      }
      return apiClient.createTask({
        workspaceId,
        title: data.title,
        projectId: data.projectId,
        description: data.description,
        priority: data.priority ?? 'medium',
        dueDate: data.dueDate,
        estimatedDuration: data.estimatedDuration,
        energyLevel: data.energyLevel,
        status: 'todo',
        isMilestone: false,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    },
    onError: (error) => {
      // Error is automatically captured by TanStack Query
      console.error('Failed to create task:', error);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) => {
      // Convert null fields to undefined for the API contract
      const updateData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, value === null ? undefined : value]),
      );
      return apiClient.updateTask(id, updateData);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    },
    onError: (error) => {
      console.error('Failed to update task:', error);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteTask(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    },
    onError: (error) => {
      console.error('Failed to delete task:', error);
    },
  });

  return {
    tasks,
    isLoading,
    isError,
    error,
    createTaskMutation,
    updateTaskMutation,
    deleteTaskMutation,
  };
}
