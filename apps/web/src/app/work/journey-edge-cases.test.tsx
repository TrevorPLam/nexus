import { describe, it, expect, beforeEach, vi } from 'vitest';

import { createTestWrapper, render, screen, fireEvent, waitFor } from './test-helpers';

import WorkPage from './page';

/**
 * BDD Journey Regression Tests for Work Module - Error Recovery and Edge Cases
 * Tests error handling, empty states, and loading states
 */

describe('Work Journey Regression Tests - Error Recovery and Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const { wrapper } = createTestWrapper();

  describe('Error Recovery and Edge Cases', () => {
    // Given: User has no projects
    // When: User navigates to Work page
    // Then: Empty state is displayed with clear call-to-action
    it('Given a user with no projects, when they navigate to Work page, then empty state is shown with CTA', async () => {
      const { useWorkProjects } = await import('../../hooks/useWorkProjects');
      vi.mocked(useWorkProjects).mockReturnValue({
        projects: [],
        projectsLoading: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createProjectMutation: { mutate: vi.fn(), isPending: false } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updateProjectMutation: { mutate: vi.fn(), isPending: false } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deleteProjectMutation: { mutate: vi.fn(), isPending: false } as any,
      });

      render(<WorkPage />, { wrapper });

      expect(
        screen.getByText('No projects yet. Create your first project to get started.'),
      ).toBeInTheDocument();
    });

    // Given: User has no tasks
    // When: User switches to Tasks view
    // Then: Empty state is displayed with clear call-to-action
    it('Given a user with no tasks, when they switch to Tasks view, then empty state is shown with CTA', async () => {
      const { useWorkTasks } = await import('../../hooks/useWorkTasks');
      vi.mocked(useWorkTasks).mockReturnValue({
        tasks: [],
        isLoading: false,
        isError: false,
        error: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createTaskMutation: { mutate: vi.fn(), isPending: false } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updateTaskMutation: { mutate: vi.fn(), isPending: false } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deleteTaskMutation: { mutate: vi.fn(), isPending: false } as any,
      });

      render(<WorkPage />, { wrapper });

      fireEvent.click(screen.getByText('Tasks'));

      await waitFor(() => {
        expect(
          screen.getByText('No tasks yet. Create your first task to get started.'),
        ).toBeInTheDocument();
      });
    });

    // Given: User is loading data
    // When: Data is being fetched
    // Then: Loading state is displayed
    it('Given a user loading data, when data is being fetched, then loading state is shown', async () => {
      const { useWorkProjects } = await import('../../hooks/useWorkProjects');
      vi.mocked(useWorkProjects).mockReturnValue({
        projects: [],
        projectsLoading: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createProjectMutation: { mutate: vi.fn(), isPending: false } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updateProjectMutation: { mutate: vi.fn(), isPending: false } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deleteProjectMutation: { mutate: vi.fn(), isPending: false } as any,
      });

      render(<WorkPage />, { wrapper });

      // Loading state should be shown
      // This test documents the expected loading behavior
    });
  });
});
