import { apiClient } from '@life-os/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Project } from '../app/work/types';

export function useWorkProjects(workspaceId: string) {
  const queryClient = useQueryClient();

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => apiClient.getProjects(workspaceId) as Promise<{ projects: Project[] }>,
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
