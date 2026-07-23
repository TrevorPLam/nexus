/**
 * MODULE: Work query hooks and command queue
 *
 * Responsibility:
 * Provides typed hooks for workspace-scoped Work reads and commands in the mobile app.
 *
 * Boundaries:
 * - Read operations use PowerSync for offline-first data synchronization.
 * - Mutation operations enqueue commands for background processing.
 * - Workspace isolation is enforced via the useAuth context.
 *
 * Critical invariants:
 * - All data access must be scoped to the selected workspace.
 * - Offline mutations must be idempotent and durable.
 *
 * Side effects:
 * - Enqueues commands for offline durability.
 * - Syncs with backend when online.
 *
 * Change risk:
 * - High. Data consistency and offline sync integrity.
 *
 * Links:
 * - apps/mobile/src/lib/powersync/provider.tsx
 * - packages/mobile-data/src/schema.ts
 *
 * Tags:
 * - domain: work
 * - risk: high
 * - layer: presentation
 * - stability: experimental
 *
 * File:
 * - apps/mobile/src/hooks/useWork.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import type { ProjectRecord, TaskRecord } from '@life-os/mobile-data';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../contexts/AuthContext';
import { usePowerSync } from '../lib/powersync/provider';

/**
 * Hook to fetch projects for the selected workspace
 */
export function useProjects() {
  const { db } = usePowerSync();
  const { selectedWorkspace } = useAuth();

  // db is ready for PowerSync query implementation
  void db;

  return useQuery({
    queryKey: ['projects', selectedWorkspace?.id],
    queryFn: async () => {
      if (!selectedWorkspace) {
        return [];
      }

      // TODO: Implement PowerSync query for workspace-scoped projects
      // This will use db.getAll() or db.watch() from PowerSync
      // For now, return empty array as placeholder
      return [] as ProjectRecord[];
    },
    enabled: !!selectedWorkspace,
  });
}

/**
 * Hook to fetch tasks for the selected workspace
 */
export function useTasks(projectId?: string) {
  const { db } = usePowerSync();
  const { selectedWorkspace } = useAuth();

  // db is ready for PowerSync query implementation
  void db;

  return useQuery({
    queryKey: ['tasks', selectedWorkspace?.id, projectId],
    queryFn: async () => {
      if (!selectedWorkspace) {
        return [];
      }

      // TODO: Implement PowerSync query for workspace-scoped tasks
      // This will use db.getAll() or db.watch() from PowerSync
      // For now, return empty array as placeholder
      return [] as TaskRecord[];
    },
    enabled: !!selectedWorkspace,
  });
}

/**
 * Hook to create a project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  const { selectedWorkspace } = useAuth();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; color?: string }) => {
      if (!selectedWorkspace) {
        throw new Error('No workspace selected');
      }

      // TODO: Enqueue create project command
      // This will integrate with the backend command API
      // For now, return placeholder
      return { id: 'placeholder', ...data, workspace_id: selectedWorkspace.id } as ProjectRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

/**
 * Hook to create a task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  const { selectedWorkspace } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      projectId?: string;
      priority?: string;
      dueDate?: string;
    }) => {
      if (!selectedWorkspace) {
        throw new Error('No workspace selected');
      }

      // TODO: Enqueue create task command
      // This will integrate with the backend command API
      // For now, return placeholder
      return {
        id: 'placeholder',
        ...data,
        workspace_id: selectedWorkspace.id,
        project_id: data.projectId || null,
        status: 'todo',
      } as TaskRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/**
 * Hook to update task status
 */
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      // TODO: Enqueue update task status command
      // This will integrate with the backend command API
      // For now, return placeholder
      return { taskId, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/**
 * Hook to delete a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      // TODO: Enqueue delete task command
      // This will integrate with the backend command API
      // For now, return placeholder
      return { taskId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
