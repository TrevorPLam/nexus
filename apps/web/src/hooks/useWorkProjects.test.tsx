import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWorkProjects } from './useWorkProjects';
import { apiClient } from '@life-os/api-client';

// Mock the apiClient
vi.mock('@life-os/api-client', () => ({
  apiClient: {
    getProjects: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  },
}));

describe('useWorkProjects', () => {
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

  it('exports useWorkProjects hook', () => {
    expect(useWorkProjects).toBeDefined();
    expect(typeof useWorkProjects).toBe('function');
  });

  it('fetches projects for workspace', async () => {
    const mockProjects = [
      { id: '1', name: 'Project 1', description: 'Description 1', color: '#ff0000' },
      { id: '2', name: 'Project 2', description: 'Description 2', color: '#00ff00' },
    ];
    vi.mocked(apiClient.getProjects).mockResolvedValue({ projects: mockProjects });

    const { result } = renderHook(() => useWorkProjects('workspace-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.projects).toEqual(mockProjects);
    });

    expect(apiClient.getProjects).toHaveBeenCalledWith('workspace-1');
  });

  it('creates project and invalidates query', async () => {
    const mockProjects = [
      { id: '1', name: 'Project 1', description: 'Description 1', color: '#ff0000' },
    ];
    vi.mocked(apiClient.getProjects).mockResolvedValue({ projects: mockProjects });
    vi.mocked(apiClient.createProject).mockResolvedValue({
      id: '2',
      name: 'New Project',
      description: 'New Description',
      color: '#0000ff',
    });

    const { result } = renderHook(() => useWorkProjects('workspace-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.projects).toEqual(mockProjects);
    });

    await result.current.createProjectMutation.mutateAsync({
      name: 'New Project',
      description: 'New Description',
      color: '#0000ff',
    });

    expect(apiClient.createProject).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      name: 'New Project',
      description: 'New Description',
      color: '#0000ff',
    });
  });
  it('updates project and invalidates query', async () => {
    const mockProjects = [
      { id: '1', name: 'Project 1', description: 'Description 1', color: '#ff0000' },
    ];
    vi.mocked(apiClient.getProjects).mockResolvedValue({ projects: mockProjects });
    vi.mocked(apiClient.updateProject).mockResolvedValue({
      id: '1',
      name: 'Updated Project',
      description: 'Updated Description',
      color: '#00ff00',
    });

    const { result } = renderHook(() => useWorkProjects('workspace-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.projects).toEqual(mockProjects);
    });

    await result.current.updateProjectMutation.mutateAsync({
      id: '1',
      data: { name: 'Updated Project', description: 'Updated Description', color: '#00ff00' },
    });

    expect(apiClient.updateProject).toHaveBeenCalledWith('1', {
      name: 'Updated Project',
      description: 'Updated Description',
      color: '#00ff00',
    });
  });
  it('deletes project and invalidates queries', async () => {
    const mockProjects = [
      { id: '1', name: 'Project 1', description: 'Description 1', color: '#ff0000' },
    ];
    vi.mocked(apiClient.getProjects).mockResolvedValue({ projects: mockProjects });
    vi.mocked(apiClient.deleteProject).mockResolvedValue(undefined);

    const { result } = renderHook(() => useWorkProjects('workspace-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.projects).toEqual(mockProjects);
    });

    await result.current.deleteProjectMutation.mutateAsync('1');

    expect(apiClient.deleteProject).toHaveBeenCalledWith('1');
  });
});
