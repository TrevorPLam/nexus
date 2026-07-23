/**
 * MODULE: Work Tasks TanStack Query Hook
 *
 * Responsibility:
 * Provides TanStack Query hooks for workspace- and project-scoped task data,
 * including filtering, creation, update, and deletion of tasks.
 *
 * Boundaries:
 * - UI-facing data layer. Calls apiClient methods and manages query invalidation.
 * - Filtering parameters are passed to the API as query strings.
 *
 * Critical invariants:
 * - Queries are disabled when workspaceId is null.
 * - Mutations invalidate the ['tasks', workspaceId] query cache on success.
 * - Null values in update payloads are converted to undefined to satisfy API contracts.
 *
 * Side effects:
 * - Performs HTTP requests to the API and updates TanStack Query cache.
 *
 * Change risk:
 * - Medium. Response format assumptions must match apps/api route return shapes.
 *
 * Links:
 * - packages/api-client/src/index.ts
 * - apps/web/src/app/work/page.tsx
 * - apps/api/src/routes/work/tasks.ts
 *
 * Tags:
 * - domain: work
 * - risk: medium
 * - layer: presentation
 * - stability: stable
 * - concerns: react-query, tasks, hooks
 *
 * File:
 * - apps/web/src/hooks/useWorkTasks.ts
 *
 * Last updated:
 * - July 22, 2026
 */

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
