import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// Mock the apiClient
vi.mock('@life-os/api-client', () => ({
  apiClient: {
    getTaskDependencies: vi.fn(),
    createTaskDependency: vi.fn(),
    deleteTaskDependency: vi.fn(),
    getTaskAssignees: vi.fn(),
    createTaskAssignee: vi.fn(),
    deleteTaskAssignee: vi.fn(),
    getTaskComments: vi.fn(),
    createTaskComment: vi.fn(),
    deleteTaskComment: vi.fn(),
    getTimeEntries: vi.fn(),
    createTimeEntry: vi.fn(),
    updateTimeEntry: vi.fn(),
    deleteTimeEntry: vi.fn(),
    getTaskAttachments: vi.fn(),
    createTaskAttachment: vi.fn(),
    deleteTaskAttachment: vi.fn(),
  },
}));

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

export function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
