/**
 * MODULE: Work Projects TanStack Query Hook
 *
 * Responsibility:
 * Provides TanStack Query hooks for workspace-scoped project data, including
 * listing, creation, update, and deletion of projects.
 *
 * Boundaries:
 * - UI-facing data layer. Calls apiClient methods and manages query invalidation.
 * - No direct database or Supabase access.
 *
 * Critical invariants:
 * - Queries are disabled when workspaceId is null.
 * - Mutations invalidate the ['projects', workspaceId] query cache on success.
 *
 * Side effects:
 * - Performs HTTP requests to the API and updates TanStack Query cache.
 *
 * Change risk:
 * - Medium. Mismatched response formats or query keys break the Work page.
 *
 * Links:
 * - packages/api-client/src/index.ts
 * - apps/web/src/app/work/page.tsx
 * - apps/web/src/contexts/AuthContext.tsx
 *
 * Tags:
 * - domain: work
 * - risk: medium
 * - layer: presentation
 * - stability: stable
 * - concerns: react-query, projects, hooks
 *
 * File:
 * - apps/web/src/hooks/useWorkProjects.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import { apiClient } from '@life-os/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Project } from '../app/work/types';

export function useWorkProjects(workspaceId: string | null) {
  const queryClient = useQueryClient();

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => apiClient.getProjects(workspaceId!) as Promise<{ projects: Project[] }>,
    enabled: !!workspaceId,
  });

  const projects = projectsData?.projects || [];

  const createProjectMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; color?: string }) =>
      apiClient.createProject({ workspaceId, ...data }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; description?: string; color?: string };
    }) => apiClient.updateProject(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteProject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    },
  });

  return {
    projects,
    projectsLoading,
    createProjectMutation,
    updateProjectMutation,
    deleteProjectMutation,
  };
}
