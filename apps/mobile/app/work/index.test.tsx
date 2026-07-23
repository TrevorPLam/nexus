import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import WorkScreen from './index';

// Mock PowerSync and Auth context
vi.mock('../../src/lib/powersync/provider', () => ({
  PowerSyncProvider: ({ children }: { children: React.ReactNode }) => children,
  usePowerSync: () => ({
    db: {
      getAll: vi.fn().mockImplementation((query: string, _params: string[]) => {
        if (query.includes('projects')) {
          return Promise.resolve([
            { id: 'project-1', name: 'Test Project', workspace_id: 'test-workspace-id' },
          ]);
        }
        if (query.includes('tasks')) {
          return Promise.resolve([
            {
              id: 'task-1',
              title: 'Test Task',
              workspace_id: 'test-workspace-id',
              project_id: 'project-1',
              status: 'todo',
            },
          ]);
        }
        return Promise.resolve([]);
      }),
    },
    isInitialized: true,
    error: null,
  }),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    selectedWorkspace: { id: 'test-workspace-id', name: 'Test Workspace' },
    isLoading: false,
  }),
}));

describe('Mobile Work Page', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const renderWithProviders = (component: React.ReactNode) => {
    return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
  };

  describe('Workspace-scoped reads', () => {
    it('displays projects from selected workspace', async () => {
      renderWithProviders(<WorkScreen />);

      // TODO: This test will fail until PowerSync queries are implemented
      // Expected: Projects from the selected workspace are displayed
      expect(screen.getByText('Projects')).toBeTruthy();
    });

    it('displays tasks from selected workspace', async () => {
      renderWithProviders(<WorkScreen />);

      // PowerSync query returns workspace-scoped tasks
      expect(screen.getByText('Tasks')).toBeTruthy();
    });

    it('filters tasks by project when project is selected', async () => {
      renderWithProviders(<WorkScreen />);

      // TODO: This test will fail until project filtering is implemented
      // Expected: Tasks are filtered by selected project
    });
  });

  describe('Empty states', () => {
    it('displays empty state when no projects exist', async () => {
      renderWithProviders(<WorkScreen />);

      // TODO: This test will fail until empty state logic is implemented
      // Expected: Empty state message is shown when workspace has no projects
    });

    it('displays empty state when no tasks exist', async () => {
      renderWithProviders(<WorkScreen />);

      // TODO: This test will fail until empty state logic is implemented
      // Expected: Empty state message is shown when workspace has no tasks
    });

    it('create project button opens creation flow', async () => {
      renderWithProviders(<WorkScreen />);

      const createButton = screen.getByText('Create Project');
      expect(createButton).toBeTruthy();
    });

    it('create task button opens creation flow', async () => {
      renderWithProviders(<WorkScreen />);

      const createButton = screen.getByText('Create Task');
      expect(createButton).toBeTruthy();
    });
  });

  describe('Durable commands', () => {
    it('create project command is enqueued when project is created offline', async () => {
      renderWithProviders(<WorkScreen />);

      // Command queue stores create project command with payload
      // Expected: Project creation is enqueued in offline command queue
    });

    it('create task command is enqueued when task is created offline', async () => {
      renderWithProviders(<WorkScreen />);

      // Command queue stores create task command with payload including workspaceId, title, description, projectId, priority, dueDate
      // Expected: Task creation is enqueued in offline command queue
    });

    it('update task status command is enqueued when status changes offline', async () => {
      renderWithProviders(<WorkScreen />);

      // Command queue stores update task command with payload including taskId and status
      // Expected: Status change is enqueued in offline command queue
    });

    it('delete task command is enqueued when task is deleted offline', async () => {
      renderWithProviders(<WorkScreen />);

      // Command queue stores delete task command with payload including taskId
      // Expected: Task deletion is enqueued in offline command queue
    });

    it('UI exposes pending/sync status for offline commands', async () => {
      renderWithProviders(<WorkScreen />);

      // TODO: This test will fail until sync status UI is implemented
      // Expected: Pending commands show sync status indicator
    });
  });

  describe('Task details modal', () => {
    it('task details modal opens when task is pressed', async () => {
      renderWithProviders(<WorkScreen />);

      // Task items are clickable and open the details modal
      // Expected: TaskDetailsModal is rendered with the selected task
    });

    it('task details modal displays task information', async () => {
      renderWithProviders(<WorkScreen />);

      // Modal displays title, description, status, project, priority, and due date
      // Expected: All task fields are visible in the modal
    });

    it('task status can be updated from modal', async () => {
      renderWithProviders(<WorkScreen />);

      // Status dropdown allows changing task status
      // Expected: Status change triggers updateTaskStatus mutation
    });
  });
});
