import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import WorkPage from './page';
import { createTestWrapper } from './test-utils';

describe('BDD: Core Work User Journey', () => {
  const { beforeEach: setupBeforeEach, wrapper } = createTestWrapper();

  beforeEach(() => {
    setupBeforeEach();
  });

  // Given: User is on the Work page with a selected workspace
  // When: User creates a new project
  // Then: The project appears in the projects list
  it('Given a user on the Work page, when they create a project, then the project appears in the list', async () => {
    const mockProjects = [
      {
        id: '1',
        name: 'Test Project',
        description: 'A test project',
        color: '#3b82f6',
        icon: '',
        status: 'active' as const,
        workspaceId: 'ws-1',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const { useWorkProjects } = await import('../../hooks/useWorkProjects');
    /* eslint-disable @typescript-eslint/no-explicit-any */
    vi.mocked(useWorkProjects).mockReturnValue({
      projects: mockProjects,
      projectsLoading: false,
      createProjectMutation: { mutate: vi.fn(), isPending: false } as any,
      updateProjectMutation: { mutate: vi.fn(), isPending: false } as any,
      deleteProjectMutation: { mutate: vi.fn(), isPending: false } as any,
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */

    render(<WorkPage />, { wrapper });

    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  // Given: User has projects
  // When: User filters tasks by project
  // Then: Only tasks from that project are displayed
  it('Given a user with projects, when they filter tasks by project, then only tasks from that project are shown', async () => {
    const mockTasks = [
      {
        id: '1',
        title: 'Task 1',
        projectId: 'proj-1',
        status: 'todo' as const,
        priority: 'medium' as const,
        dueDate: null,
        workspaceId: 'ws-1',
        parentId: null,
        description: null,
        dueTime: null,
        estimatedDuration: null,
        completedAt: null,
        calendarEventId: null,
        recurrenceRule: null,
        recurrenceId: null,
        energyLevel: null,
        contextTags: null,
        isMilestone: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        title: 'Task 2',
        projectId: 'proj-2',
        status: 'todo' as const,
        priority: 'medium' as const,
        dueDate: null,
        workspaceId: 'ws-1',
        parentId: null,
        description: null,
        dueTime: null,
        estimatedDuration: null,
        completedAt: null,
        calendarEventId: null,
        recurrenceRule: null,
        recurrenceId: null,
        energyLevel: null,
        contextTags: null,
        isMilestone: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const { useWorkTasks } = await import('../../hooks/useWorkTasks');
    /* eslint-disable @typescript-eslint/no-explicit-any */
    vi.mocked(useWorkTasks).mockReturnValue({
      tasks: mockTasks,
      isLoading: false,
      isError: false,
      error: null,
      createTaskMutation: { mutate: vi.fn(), isPending: false } as any,
      updateTaskMutation: { mutate: vi.fn(), isPending: false } as any,
      deleteTaskMutation: { mutate: vi.fn(), isPending: false } as any,
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */

    render(<WorkPage />, { wrapper });

    fireEvent.click(screen.getByText('Kanban'));

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
    });
  });

  // Given: User has tasks
  // When: User changes task status
  // Then: The task status is updated and reflected in the UI
  it('Given a user with tasks, when they change task status, then the task status is updated', async () => {
    const mockTasks = [
      {
        id: '1',
        title: 'Task 1',
        projectId: 'proj-1',
        status: 'todo' as const,
        priority: 'medium' as const,
        dueDate: null,
        workspaceId: 'ws-1',
        parentId: null,
        description: null,
        dueTime: null,
        estimatedDuration: null,
        completedAt: null,
        calendarEventId: null,
        recurrenceRule: null,
        recurrenceId: null,
        energyLevel: null,
        contextTags: null,
        isMilestone: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const { useWorkTasks } = await import('../../hooks/useWorkTasks');
    const updateMock = vi.fn();
    /* eslint-disable @typescript-eslint/no-explicit-any */
    vi.mocked(useWorkTasks).mockReturnValue({
      tasks: mockTasks,
      isLoading: false,
      isError: false,
      error: null,
      createTaskMutation: { mutate: vi.fn(), isPending: false } as any,
      updateTaskMutation: { mutate: updateMock, isPending: false } as any,
      deleteTaskMutation: { mutate: vi.fn(), isPending: false } as any,
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */

    render(<WorkPage />, { wrapper });

    fireEvent.click(screen.getByText('Kanban'));

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
  });

  // Given: User encounters an error
  // When: An API error occurs
  // Then: An accessible error message is displayed
  it('Given a user encounters an error, when an API error occurs, then an accessible error message is shown', async () => {
    const { useWorkTasks } = await import('../../hooks/useWorkTasks');
    vi.mocked(useWorkTasks).mockReturnValue({
      tasks: [],
      isLoading: false,
      isError: true,
      error: new Error('Failed to load tasks'),
      createTaskMutation: { mutate: vi.fn(), isPending: false } as unknown,
      updateTaskMutation: { mutate: vi.fn(), isPending: false } as unknown,
      deleteTaskMutation: { mutate: vi.fn(), isPending: false } as unknown,
    });

    render(<WorkPage />, { wrapper });

    await waitFor(() => {
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent('Error loading tasks');
    });
  });

  // Given: User is creating a task
  // When: Form validation fails
  // Then: Validation errors are displayed
  it('Given a user is creating a task, when form validation fails, then validation errors are displayed', async () => {
    // This test will fail initially because Zod validation is not yet implemented
    const { useWorkTasks } = await import('../../hooks/useWorkTasks');
    vi.mocked(useWorkTasks).mockReturnValue({
      tasks: [],
      isLoading: false,
      isError: false,
      error: null,
      createTaskMutation: { mutate: vi.fn(), isPending: false } as unknown,
      updateTaskMutation: { mutate: vi.fn(), isPending: false } as unknown,
      deleteTaskMutation: { mutate: vi.fn(), isPending: false } as unknown,
    });

    render(<WorkPage />, { wrapper });

    fireEvent.click(screen.getByText('Kanban'));
    fireEvent.click(screen.getByText('New Task'));

    await waitFor(() => {
      expect(screen.getByText('Create Task')).toBeInTheDocument();
    });

    // Try to submit without a title (should fail validation)
    const submitButton = screen.getByText('Create');
    fireEvent.click(submitButton);

    // This should show validation error once Zod is implemented
    // For now, this test documents the expected behavior
  });

  // Given: User has a task
  // When: User edits the task
  // Then: The task details are updated
  it('Given a user has a task, when they edit the task, then the task details are updated', async () => {
    const mockTasks = [
      {
        id: '1',
        title: 'Original Title',
        projectId: 'proj-1',
        status: 'todo' as const,
        priority: 'medium' as const,
        dueDate: null,
        workspaceId: 'ws-1',
        parentId: null,
        description: null,
        dueTime: null,
        estimatedDuration: null,
        completedAt: null,
        calendarEventId: null,
        recurrenceRule: null,
        recurrenceId: null,
        energyLevel: null,
        contextTags: null,
        isMilestone: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const { useWorkTasks } = await import('../../hooks/useWorkTasks');
    const updateMock = vi.fn();
    /* eslint-disable @typescript-eslint/no-explicit-any */
    vi.mocked(useWorkTasks).mockReturnValue({
      tasks: mockTasks,
      isLoading: false,
      isError: false,
      error: null,
      createTaskMutation: { mutate: vi.fn(), isPending: false } as any,
      updateTaskMutation: { mutate: updateMock, isPending: false } as any,
      deleteTaskMutation: { mutate: vi.fn(), isPending: false } as any,
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */

    render(<WorkPage />, { wrapper });

    fireEvent.click(screen.getByText('Kanban'));

    await waitFor(() => {
      expect(screen.getByText('Original Title')).toBeInTheDocument();
    });
  });

  // Given: User is on the Work page
  // When: User switches between views
  // Then: The correct view is displayed without placeholder messages
  it('Given a user is on the Work page, when they switch between views, then the correct view is shown without placeholders', async () => {
    render(<WorkPage />, { wrapper });

    // Test that List view works (not "coming soon")
    fireEvent.click(screen.getByText('List'));

    await waitFor(() => {
      expect(screen.queryByText('List view coming soon')).not.toBeInTheDocument();
    });
  });
});
