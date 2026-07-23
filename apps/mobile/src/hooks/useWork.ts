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
import { enqueueCommand } from '../lib/command-queue';

/**
 * Hook to fetch projects for the selected workspace
 */
export function useProjects() {
  const { db } = usePowerSync();
  const { selectedWorkspace } = useAuth();

  return useQuery({
    queryKey: ['projects', selectedWorkspace?.id],
    queryFn: async () => {
      if (!selectedWorkspace) {
        return [];
      }

      // Query projects filtered by workspace_id using PowerSync getAll
      // @ts-ignore - PowerSync getAll method exists but type definitions are incomplete
      const result = await db.getAll(
        'SELECT * FROM projects WHERE workspace_id = ? ORDER BY created_at DESC',
        [selectedWorkspace.id],
      );

      return result as ProjectRecord[];
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

  return useQuery({
    queryKey: ['tasks', selectedWorkspace?.id, projectId],
    queryFn: async () => {
      if (!selectedWorkspace) {
        return [];
      }

      // Query tasks filtered by workspace_id and optionally by project_id
      // @ts-ignore - PowerSync getAll method exists but type definitions are incomplete
      const result = await db.getAll(
        projectId
          ? 'SELECT * FROM tasks WHERE workspace_id = ? AND project_id = ? ORDER BY created_at DESC'
          : 'SELECT * FROM tasks WHERE workspace_id = ? ORDER BY created_at DESC',
        projectId ? [selectedWorkspace.id, projectId] : [selectedWorkspace.id],
      );

      return result as TaskRecord[];
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
  const { db } = usePowerSync();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; color?: string }) => {
      if (!selectedWorkspace) {
        throw new Error('No workspace selected');
      }

      // Enqueue create project command
      const commandId = await enqueueCommand(db, 'create_project', {
        workspaceId: selectedWorkspace.id,
        name: data.name,
        description: data.description,
        color: data.color,
      });

      return { id: commandId, ...data, workspace_id: selectedWorkspace.id } as ProjectRecord;
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
