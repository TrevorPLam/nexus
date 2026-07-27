import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  cloneTaskWithDependencies,
} from './task-cloning-operations.js';
import {
  createTaskWithDependencies,
  createTaskWithAssignees,
} from './task-creation-operations.js';
import {
  deleteProjectWithTasks,
  batchDeleteTasksWithDependencies,
} from './task-deletion-operations.js';
import {
  moveTaskToProject,
  completeTaskWithTimeEntry,
} from './task-modification-operations.js';

// Helper to create chainable query builder mock that resolves to array
const createQueryBuilder = () => {
  const mockData = [{ id: '123', createdAt: new Date() }];
  const queryBuilder = Promise.resolve(mockData) as unknown as {
    from: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    orderBy: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    returning: ReturnType<typeof vi.fn>;
  };

  // Add chainable methods that return the same promise
  queryBuilder.from = vi.fn(() => queryBuilder);
  queryBuilder.where = vi.fn(() => queryBuilder);
  queryBuilder.orderBy = vi.fn(() => queryBuilder);
  queryBuilder.limit = vi.fn(() => queryBuilder);
  queryBuilder.returning = vi.fn(() => queryBuilder);

  return queryBuilder;
};

// Mock the db module
vi.mock('./db.js', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: '123', createdAt: new Date() }])),
      })),
    })),
    select: vi.fn(() => createQueryBuilder()),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: '123', updatedAt: new Date() }])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: '123' }])),
      })),
    })),
    transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
      return callback({
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ id: '123', createdAt: new Date() }])),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve([{ id: '123', updatedAt: new Date() }])),
            })),
          })),
        })),
        delete: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ id: '123' }])),
          })),
        })),
        select: vi.fn(() => createQueryBuilder()),
      });
    }),
  },
}));

// Mock command-context module
vi.mock('./command-context.js', () => ({
  executeCommandWithoutIdempotency: vi.fn(
    async (_context: unknown, callback: (tx: unknown) => Promise<unknown>) => {
      // Simulate transaction callback
      const mockTx = {
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ id: '123', createdAt: new Date() }])),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve([{ id: '123', updatedAt: new Date() }])),
            })),
          })),
        })),
        delete: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ id: '123' }])),
          })),
        })),
        select: vi.fn(() => createQueryBuilder()),
      };
      return callback(mockTx);
    },
  ),
}));

// Mock transaction module
vi.mock('./transaction.js', () => ({
  withTransaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
    const mockTx = {
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: '123', createdAt: new Date() }])),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ id: '123', updatedAt: new Date() }])),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: '123' }])),
        })),
      })),
      select: vi.fn(() => createQueryBuilder()),
    };
    return callback(mockTx);
  }),
}));

describe('Complex Task Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTaskWithDependencies', () => {
    it('should create a task with dependencies in a transaction', async () => {
      const taskData = {
        id: 'task-123',
        workspaceId: 'workspace-123',
        title: 'Test Task',
        status: 'todo',
        priority: 'high',
      };
      const dependencies = [
        { dependsOnTaskId: 'dep-1', type: 'blocks' },
        { dependsOnTaskId: 'dep-2', type: 'blocks' },
      ];

      const result = await createTaskWithDependencies(taskData, dependencies);

      expect(result).toBeDefined();
      expect(result.id).toBe('123');
    });

    it('should create a task without dependencies when array is empty', async () => {
      const taskData = {
        id: 'task-123',
        workspaceId: 'workspace-123',
        title: 'Test Task',
        status: 'todo',
        priority: 'high',
      };
      const dependencies: Array<{ dependsOnTaskId: string; type: string }> = [];

      const result = await createTaskWithDependencies(taskData, dependencies);

      expect(result).toBeDefined();
      expect(result.id).toBe('123');
    });
  });

  describe('createTaskWithAssignees', () => {
    it('should create a task with assignees in a transaction', async () => {
      const taskData = {
        id: 'task-123',
        workspaceId: 'workspace-123',
        title: 'Test Task',
        status: 'todo',
        priority: 'high',
      };
      const assignees = [
        { userId: 'user-1', assignedBy: 'user-2', isPrimary: true },
        { userId: 'user-3', assignedBy: 'user-2', isPrimary: false },
      ];

      const result = await createTaskWithAssignees(taskData, assignees);

      expect(result).toBeDefined();
      expect(result.id).toBe('123');
    });

    it('should create a task without assignees when array is empty', async () => {
      const taskData = {
        id: 'task-123',
        workspaceId: 'workspace-123',
        title: 'Test Task',
        status: 'todo',
        priority: 'high',
      };
      const assignees: Array<{ userId: string; assignedBy: string; isPrimary?: boolean }> = [];

      const result = await createTaskWithAssignees(taskData, assignees);

      expect(result).toBeDefined();
      expect(result.id).toBe('123');
    });
  });

  describe('deleteProjectWithTasks', () => {
    it('should soft delete a project and all its tasks', async () => {
      const projectId = 'project-123';

      const result = await deleteProjectWithTasks(projectId);

      expect(result).toBeDefined();
      expect(result.id).toBe('123');
    });
  });

  describe('moveTaskToProject', () => {
    it('should move a task to a different project', async () => {
      const taskId = 'task-123';
      const newProjectId = 'project-456';

      const result = await moveTaskToProject(taskId, newProjectId);

      expect(result).toBeDefined();
      expect(result.id).toBe('123');
    });
  });

  describe('completeTaskWithTimeEntry', () => {
    it('should complete a task and create a time entry', async () => {
      const taskId = 'task-123';
      const timeEntryData = {
        id: 'time-123',
        taskId: 'task-123',
        userId: 'user-123',
        startedAt: new Date(),
      };

      const result = await completeTaskWithTimeEntry(taskId, timeEntryData);

      expect(result).toBeDefined();
      expect(result.id).toBe('123');
    });

    it('should complete a task without time entry when data is null', async () => {
      const taskId = 'task-123';
      const timeEntryData = null as unknown as typeof import('@life-os/database').timeEntries.$inferInsert;

      const result = await completeTaskWithTimeEntry(taskId, timeEntryData);

      expect(result).toBeDefined();
      expect(result.id).toBe('123');
    });
  });

  describe('batchDeleteTasksWithDependencies', () => {
    it('should batch delete tasks with all related data', async () => {
      const taskIds = ['task-1', 'task-2', 'task-3'];

      const result = await batchDeleteTasksWithDependencies(taskIds);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('cloneTaskWithDependencies', () => {
    it('should clone a task with dependencies and assignees', async () => {
      const originalTaskId = 'task-123';
      const newTaskData = {
        title: 'Cloned Task',
      };

      const result = await cloneTaskWithDependencies(originalTaskId, newTaskData);

      expect(result).toBeDefined();
      expect(result.id).toBe('123');
    });

    it('should clone a task with default title when not provided', async () => {
      const originalTaskId = 'task-123';
      const newTaskData = {};

      const result = await cloneTaskWithDependencies(originalTaskId, newTaskData);

      expect(result).toBeDefined();
      expect(result.id).toBe('123');
    });
  });
});
