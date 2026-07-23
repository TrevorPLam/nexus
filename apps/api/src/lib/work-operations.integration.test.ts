import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';

import { db } from './db.js';
import * as schema from '@life-os/database';
import * as workOps from './work-operations.js';

describe('Work Operations - Integration Tests', () => {
  let testWorkspaceId: string;
  let testProjectId: string;
  let testTaskId: string;

  beforeAll(async () => {
    // Create a test workspace
    const [workspace] = await db
      .insert(schema.workspaces)
      .values({
        name: 'Test Workspace',
        ownerId: 'test-user-id',
      })
      .returning();
    testWorkspaceId = workspace.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(schema.tasks).where(eq(schema.tasks.workspaceId, testWorkspaceId));
    await db.delete(schema.projects).where(eq(schema.projects.workspaceId, testWorkspaceId));
    await db.delete(schema.workspaces).where(eq(schema.workspaces.id, testWorkspaceId));
  });

  beforeEach(async () => {
    // Clean up tasks and projects before each test
    await db.delete(schema.tasks).where(eq(schema.tasks.workspaceId, testWorkspaceId));
    await db.delete(schema.projects).where(eq(schema.projects.workspaceId, testWorkspaceId));
  });

  describe('Project CRUD', () => {
    it('creates and retrieves a project', async () => {
      const project = await workOps.createProject({
        workspaceId: testWorkspaceId,
        name: 'Test Project',
        status: 'active',
      });

      expect(project).toBeDefined();
      expect(project.name).toBe('Test Project');

      const retrieved = await workOps.getProjectById(project.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(project.id);
    });

    it('updates a project', async () => {
      const project = await workOps.createProject({
        workspaceId: testWorkspaceId,
        name: 'Test Project',
        status: 'active',
      });

      const updated = await workOps.updateProject(project.id, {
        name: 'Updated Project',
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Project');
    });

    it('deletes a project (soft delete)', async () => {
      const project = await workOps.createProject({
        workspaceId: testWorkspaceId,
        name: 'Test Project',
        status: 'active',
      });

      const deleted = await workOps.deleteProject(project.id);
      expect(deleted).toBeDefined();
      expect(deleted?.status).toBe('deleted');
    });
  });

  describe('Task CRUD', () => {
    beforeEach(async () => {
      // Create a test project for task tests
      const [project] = await db
        .insert(schema.projects)
        .values({
          workspaceId: testWorkspaceId,
          name: 'Test Project',
          status: 'active',
        })
        .returning();
      testProjectId = project.id;
    });

    it('creates and retrieves a task', async () => {
      const task = await workOps.createTask({
        workspaceId: testWorkspaceId,
        projectId: testProjectId,
        title: 'Test Task',
        status: 'todo',
        priority: 'medium',
      });

      expect(task).toBeDefined();
      expect(task.title).toBe('Test Task');

      const retrieved = await workOps.getTaskById(task.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(task.id);
    });

    it('updates a task', async () => {
      const task = await workOps.createTask({
        workspaceId: testWorkspaceId,
        projectId: testProjectId,
        title: 'Test Task',
        status: 'todo',
        priority: 'medium',
      });

      const updated = await workOps.updateTask(task.id, {
        title: 'Updated Task',
        status: 'in_progress',
      });

      expect(updated).toBeDefined();
      expect(updated?.title).toBe('Updated Task');
      expect(updated?.status).toBe('in_progress');
    });

    it('sets completedAt when status is set to done', async () => {
      const task = await workOps.createTask({
        workspaceId: testWorkspaceId,
        projectId: testProjectId,
        title: 'Test Task',
        status: 'todo',
        priority: 'medium',
      });

      const updated = await workOps.updateTask(task.id, {
        status: 'done',
      });

      expect(updated).toBeDefined();
      expect(updated?.status).toBe('done');
      expect(updated?.completedAt).toBeDefined();
    });

    it('deletes a task (soft delete)', async () => {
      const task = await workOps.createTask({
        workspaceId: testWorkspaceId,
        projectId: testProjectId,
        title: 'Test Task',
        status: 'todo',
        priority: 'medium',
      });

      const deleted = await workOps.deleteTask(task.id);
      expect(deleted).toBeDefined();
      expect(deleted?.status).toBe('deleted');
    });

    it('creates subtasks with proper parent-child relationship', async () => {
      const parentTask = await workOps.createTask({
        workspaceId: testWorkspaceId,
        projectId: testProjectId,
        title: 'Parent Task',
        status: 'todo',
        priority: 'medium',
      });

      const subtask = await workOps.createTask({
        workspaceId: testWorkspaceId,
        projectId: testProjectId,
        parentId: parentTask.id,
        title: 'Subtask',
        status: 'todo',
        priority: 'medium',
      });

      expect(subtask).toBeDefined();
      expect(subtask.parentId).toBe(parentTask.id);
    });
  });

  describe('Task Dependencies', () => {
    beforeEach(async () => {
      const [project] = await db
        .insert(schema.projects)
        .values({
          workspaceId: testWorkspaceId,
          name: 'Test Project',
          status: 'active',
        })
        .returning();
      testProjectId = project.id;
    });

    it('creates task dependencies', async () => {
      const task1 = await workOps.createTask({
        workspaceId: testWorkspaceId,
        projectId: testProjectId,
        title: 'Task 1',
        status: 'todo',
        priority: 'medium',
      });

      const task2 = await workOps.createTask({
        workspaceId: testWorkspaceId,
        projectId: testProjectId,
        title: 'Task 2',
        status: 'todo',
        priority: 'medium',
      });

      const dependency = await workOps.createTaskDependency({
        taskId: task2.id,
        dependsOnTaskId: task1.id,
        type: 'finish_to_start',
      });

      expect(dependency).toBeDefined();
      expect(dependency.taskId).toBe(task2.id);
      expect(dependency.dependsOnTaskId).toBe(task1.id);
    });

    it('prevents circular dependencies', async () => {
      const task1 = await workOps.createTask({
        workspaceId: testWorkspaceId,
        projectId: testProjectId,
        title: 'Task 1',
        status: 'todo',
        priority: 'medium',
      });

      const task2 = await workOps.createTask({
        workspaceId: testWorkspaceId,
        projectId: testProjectId,
        title: 'Task 2',
        status: 'todo',
        priority: 'medium',
      });

      await workOps.createTaskDependency({
        taskId: task2.id,
        dependsOnTaskId: task1.id,
        type: 'finish_to_start',
      });

      // Attempting to create a circular dependency should fail
      await expect(
        workOps.createTaskDependency({
          taskId: task1.id,
          dependsOnTaskId: task2.id,
          type: 'finish_to_start',
        }),
      ).rejects.toThrow();
    });
  });

  describe('Batch Operations', () => {
    beforeEach(async () => {
      const [project] = await db
        .insert(schema.projects)
        .values({
          workspaceId: testWorkspaceId,
          name: 'Test Project',
          status: 'active',
        })
        .returning();
      testProjectId = project.id;
    });

    it('batch completes multiple tasks', async () => {
      const task1 = await workOps.createTask({
        workspaceId: testWorkspaceId,
        projectId: testProjectId,
        title: 'Task 1',
        status: 'todo',
        priority: 'medium',
      });

      const task2 = await workOps.createTask({
        workspaceId: testWorkspaceId,
        projectId: testProjectId,
        title: 'Task 2',
        status: 'todo',
        priority: 'medium',
      });

      const completed = await workOps.batchCompleteTasks([task1.id, task2.id]);

      expect(completed).toHaveLength(2);
      expect(completed[0].status).toBe('done');
      expect(completed[1].status).toBe('done');
    });

    it('batch updates task status', async () => {
      const task1 = await workOps.createTask({
        workspaceId: testWorkspaceId,
        projectId: testProjectId,
        title: 'Task 1',
        status: 'todo',
        priority: 'medium',
      });

      const task2 = await workOps.createTask({
        workspaceId: testWorkspaceId,
        projectId: testProjectId,
        title: 'Task 2',
        status: 'todo',
        priority: 'medium',
      });

      const updated = await workOps.batchUpdateTaskStatus([task1.id, task2.id], 'in_progress');

      expect(updated).toHaveLength(2);
      expect(updated[0].status).toBe('in_progress');
      expect(updated[1].status).toBe('in_progress');
    });
  });
});
