import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

import { AuthProvider } from '../../contexts/AuthContext';

// Mock the custom hooks
vi.mock('../../hooks/useWorkProjects', () => ({
  useWorkProjects: vi.fn(() => ({
    projects: [],
    projectsLoading: false,
    createProjectMutation: { mutate: vi.fn(), isPending: false },
    updateProjectMutation: { mutate: vi.fn(), isPending: false },
    deleteProjectMutation: { mutate: vi.fn(), isPending: false },
  })),
}));

vi.mock('../../hooks/useWorkTasks', () => ({
  useWorkTasks: vi.fn(() => ({
    tasks: [],
    isLoading: false,
    isError: false,
    error: null,
    createTaskMutation: { mutate: vi.fn(), isPending: false },
    updateTaskMutation: { mutate: vi.fn(), isPending: false },
    deleteTaskMutation: { mutate: vi.fn(), isPending: false },
  })),
}));

vi.mock('../../hooks/useTaskDetails', () => ({
  useTaskDetails: vi.fn(() => ({
    dependencies: [],
    createDependencyMutation: { mutate: vi.fn() },
    deleteDependencyMutation: { mutate: vi.fn() },
    assignees: [],
    createAssigneeMutation: { mutate: vi.fn() },
    deleteAssigneeMutation: { mutate: vi.fn() },
    comments: [],
    createCommentMutation: { mutate: vi.fn() },
    subtasks: [],
    createSubtaskMutation: { mutate: vi.fn() },
    updateSubtaskMutation: { mutate: vi.fn() },
    deleteSubtaskMutation: { mutate: vi.fn() },
  })),
}));

vi.mock('../../hooks/useTaskHelpers', () => ({
  getPriorityColor: vi.fn(() => '#3b82f6'),
  getTimelineDays: vi.fn(() => []),
  getTaskPosition: vi.fn(() => ({ left: 0, width: 100 })),
}));

// Mock the UI components
vi.mock('@life-os/ui', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, onPress, variant }: any) => (
    <button onClick={onPress} data-variant={variant}>
      {children}
    </button>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Modal: ({ isOpen, onClose, children }: any) =>
    isOpen ? (
      <div role="dialog">
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Badge: ({ children, variant }: any) => <span data-variant={variant}>{children}</span>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Input: ({ placeholder, value, onChange }: any) => (
    <input placeholder={placeholder} value={value} onChange={onChange} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TextArea: ({ placeholder, value, onChange }: any) => (
    <textarea placeholder={placeholder} value={value} onChange={onChange} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Select: ({ value, onChange, children }: any) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {children}
    </select>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

// Mock dnd-kit
vi.mock('@dnd-kit/core', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DndContext: ({ children }: any) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(),
  DragEndEvent: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SortableContext: ({ children }: any) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ''),
    },
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    workspaceId: 'default-workspace',
    workspaceState: 'selected',
  })),
  AuthProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

export function createTestWrapper() {
  let queryClient: QueryClient;

  const beforeEach = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  };

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );

  return { beforeEach, wrapper };
}
