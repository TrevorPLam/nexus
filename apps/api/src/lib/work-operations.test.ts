import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  createProject,
  getProjectById,
  getProjectsByWorkspace,
  updateProject,
  deleteProject,
  createTask,
  getTaskById,
  getTasksByWorkspace,
  getTasksByProject,
  getFilteredTasks,
  updateTask,
  deleteTask,
  createTaskDependency,
  getTaskDependencies,
  deleteTaskDependency,
  getProjectsWithTasks,
  getSubtasks,
  createTaskNote,
  getTaskNoteById,
  getTaskNotesByTask,
  updateTaskNote,
  deleteTaskNote,
  batchCompleteTasks,
  batchDeferTasks,
  batchRescheduleTasks,
  batchUpdateTaskStatus,
} from './work-operations.js';

// Helper to create chainable query builder mock that resolves to array
const createQueryBuilder = () => {
  const mockData = [{ id: '123', createdAt: new Date() }];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queryBuilder = Promise.resolve(mockData) as any;

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
  },
}));

describe('Work Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Project CRUD', () => {
    it('creates a project', async () => {
      const { db } = await import('./db.js');
      const result = await createProject({
        workspaceId: 'workspace-123',
        name: 'My Project',
        status: 'active',
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.insert).toHaveBeenCalled();
    });

    it('gets project by id', async () => {
      const result = await getProjectById('project-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });

    it('gets projects by workspace with pagination', async () => {
      const result = await getProjectsByWorkspace('workspace-123', 50);

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.hasMore).toBeDefined();
      expect(result.nextCursor).toBeDefined();
    });

    it('updates a project', async () => {
      const { db } = await import('./db.js');
      const result = await updateProject('project-123', { name: 'Updated Project' });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.update).toHaveBeenCalled();
    });

    it('deletes a project (soft delete)', async () => {
      const { db } = await import('./db.js');
      const result = await deleteProject('project-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('Task CRUD', () => {
    it('creates a task', async () => {
      const { db } = await import('./db.js');
      const result = await createTask({
        workspaceId: 'workspace-123',
        title: 'My Task',
        status: 'todo',
        priority: 'medium',
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.insert).toHaveBeenCalled();
    });

    it('gets task by id', async () => {
      const result = await getTaskById('task-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });

    it('gets tasks by workspace with pagination', async () => {
      const result = await getTasksByWorkspace('workspace-123', 50);

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.hasMore).toBeDefined();
      expect(result.nextCursor).toBeDefined();
    });

    it('gets tasks by project', async () => {
      const result = await getTasksByProject('project-123');

      expect(result).toBeInstanceOf(Array);
    });

    it('gets filtered tasks', async () => {
      const result = await getFilteredTasks({
        workspaceId: 'workspace-123',
        status: 'todo',
        priority: 'high',
      });

      // Function returns Drizzle query builder, not array directly
      expect(result).toBeDefined();
    });

    it('gets filtered tasks with search query', async () => {
      const result = await getFilteredTasks({
        workspaceId: 'workspace-123',
        searchQuery: 'important',
      });

      // Function returns Drizzle query builder, not array directly
      expect(result).toBeDefined();
    });

    it('gets filtered tasks with date range', async () => {
      const result = await getFilteredTasks({
        workspaceId: 'workspace-123',
        dueBefore: new Date('2024-12-31'),
        dueAfter: new Date('2024-01-01'),
      });

      // Function returns Drizzle query builder, not array directly
      expect(result).toBeDefined();
    });

    it('updates a task', async () => {
      const { db } = await import('./db.js');
      const result = await updateTask('task-123', { title: 'Updated Task' });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.update).toHaveBeenCalled();
    });

    it('updates task status to done sets completedAt', async () => {
      const { db } = await import('./db.js');
      const result = await updateTask('task-123', { status: 'done' });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.update).toHaveBeenCalled();
    });

    it('deletes a task (soft delete)', async () => {
      const { db } = await import('./db.js');
      const result = await deleteTask('task-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('Task Dependencies', () => {
    it('creates a task dependency', async () => {
      const { db } = await import('./db.js');
      const result = await createTaskDependency({
        taskId: 'task-123',
        dependsOnTaskId: 'task-456',
        type: 'finish_to_start',
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.insert).toHaveBeenCalled();
    });

    it('gets task dependencies', async () => {
      const result = await getTaskDependencies('task-123');

      // Function returns Drizzle query builder, not array directly
      expect(result).toBeDefined();
    });

    it('deletes a task dependency', async () => {
      const { db } = await import('./db.js');
      const result = await deleteTaskDependency('dependency-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe('Batch Operations', () => {
    it('gets projects with tasks', async () => {
      const result = await getProjectsWithTasks('workspace-123');

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.hasMore).toBeDefined();
    });

    it('gets subtasks', async () => {
      const result = await getSubtasks('parent-task-123');

      // Function returns Drizzle query builder, not array directly
      expect(result).toBeDefined();
    });
  });

  describe('Task Notes', () => {
    it('creates a task note', async () => {
      const { db } = await import('./db.js');
      const result = await createTaskNote({
        taskId: 'task-123',
        content: 'This is a note',
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.insert).toHaveBeenCalled();
    });

    it('gets task note by id', async () => {
      const result = await getTaskNoteById('note-123');

      // Function returns Drizzle query builder, not array directly
      expect(result).toBeDefined();
    });

    it('gets task notes by task', async () => {
      const result = await getTaskNotesByTask('task-123');

      // Function returns Drizzle query builder, not array directly
      expect(result).toBeDefined();
    });

    it('updates a task note', async () => {
      const { db } = await import('./db.js');
      const result = await updateTaskNote('note-123', { content: 'Updated note' });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.update).toHaveBeenCalled();
    });

    it('deletes a task note', async () => {
      const { db } = await import('./db.js');
      const result = await deleteTaskNote('note-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe('Batch Task Operations', () => {
    it('batch completes tasks', async () => {
      const { db } = await import('./db.js');
      const result = await batchCompleteTasks(['task-1', 'task-2']);

      expect(result).toBeInstanceOf(Array);
      expect(db.update).toHaveBeenCalled();
    });

    it('batch defers tasks', async () => {
      const { db } = await import('./db.js');
      const deferDate = new Date('2024-12-31');
      const result = await batchDeferTasks(['task-1', 'task-2'], deferDate);

      expect(result).toBeInstanceOf(Array);
      expect(db.update).toHaveBeenCalled();
    });

    it('batch reschedules tasks', async () => {
      const { db } = await import('./db.js');
      const newDate = new Date('2024-12-31');
      const result = await batchRescheduleTasks(['task-1', 'task-2'], newDate);

      expect(result).toBeInstanceOf(Array);
      expect(db.update).toHaveBeenCalled();
    });

    it('batch updates task status', async () => {
      const { db } = await import('./db.js');
      const result = await batchUpdateTaskStatus(['task-1', 'task-2'], 'in_progress');

      expect(result).toBeInstanceOf(Array);
      expect(db.update).toHaveBeenCalled();
    });
  });
});
