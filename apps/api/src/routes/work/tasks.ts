import { CreateTaskRequest, UpdateTaskRequest } from '@life-os/contracts';
import { Hono } from 'hono';
import { validator } from 'hono/validator';

import {
  authMiddleware,
  requireWorkspaceMembership,
  requireEntityAccess,
  requireWorkspaceAccess,
  idempotencyMiddleware,
} from '../../lib/middleware.js';
import * as workOps from '../../lib/work-operations.js';

const tasksRouter = new Hono();

// Apply authentication middleware to all routes
tasksRouter.use('*', authMiddleware);

tasksRouter.post(
  '/tasks',
  requireWorkspaceAccess,
  idempotencyMiddleware,
  validator('json', (value, c) => {
    const parsed = CreateTaskRequest.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const data = c.req.valid('json');
    try {
      const task = await workOps.createTask({
        ...data,
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        completedAt: null,
        metadata: null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        estimatedDuration: data.estimatedDuration,
      });
      return c.json(task, 201);
    } catch (error) {
      console.error('Error creating task:', error);
      return c.json({ error: 'Failed to create task' }, 500);
    }
  },
);

tasksRouter.get('/tasks/:id', requireEntityAccess('tasks'), async (c) => {
  const id = c.req.param('id');
  try {
    const task = await workOps.getTaskById(id);
    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }
    return c.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return c.json({ error: 'Failed to fetch task' }, 500);
  }
});

tasksRouter.get('/workspaces/:workspaceId/tasks', requireWorkspaceMembership, async (c) => {
  const workspaceId = c.req.param('workspaceId');
  if (!workspaceId) {
    return c.json({ error: 'Invalid workspace ID' }, 400);
  }
  const projectId = c.req.query('projectId');
  const status = c.req.query('status');
  const priority = c.req.query('priority');
  const search = c.req.query('search');
  const dueBefore = c.req.query('dueBefore');
  const dueAfter = c.req.query('dueAfter');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const cursor = c.req.query('cursor');

  try {
    // If any filter parameters are provided, use filtered query with pagination
    if (projectId || status || priority || search || dueBefore || dueAfter) {
      const result = await workOps.getFilteredTasks({
        workspaceId,
        projectId,
        status,
        priority,
        searchQuery: search,
        dueBefore: dueBefore ? new Date(dueBefore) : undefined,
        dueAfter: dueAfter ? new Date(dueAfter) : undefined,
        limit,
        cursor,
      });
      return c.json({ tasks: result.items, nextCursor: result.nextCursor, hasMore: result.hasMore });
    }

    // Otherwise, get paginated tasks for workspace
    const result = await workOps.getTasksByWorkspace(workspaceId, limit, cursor);
    return c.json({ tasks: result.items, nextCursor: result.nextCursor, hasMore: result.hasMore });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return c.json({ error: 'Failed to fetch tasks' }, 500);
  }
});

tasksRouter.get('/projects/:projectId/tasks', requireWorkspaceMembership, async (c) => {
  const projectId = c.req.param('projectId');
  if (!projectId) {
    return c.json({ error: 'Invalid project ID' }, 400);
  }
  try {
    const tasks = await workOps.getTasksByProject(projectId);
    return c.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return c.json({ error: 'Failed to fetch tasks' }, 500);
  }
});

tasksRouter.put(
  '/tasks/:id',
  requireWorkspaceMembership,
  idempotencyMiddleware,
  validator('json', (value, c) => {
    const parsed = UpdateTaskRequest.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Invalid task ID' }, 400);
    }
    const data = c.req.valid('json');
    try {
      const updateData: Record<string, unknown> = { ...data };
      if (data.dueDate) {
        updateData.dueDate = new Date(data.dueDate);
      }
      const task = await workOps.updateTask(id, updateData);
      if (!task) {
        return c.json({ error: 'Task not found' }, 404);
      }
      return c.json(task);
    } catch (error) {
      console.error('Error updating task:', error);
      return c.json({ error: 'Failed to update task' }, 500);
    }
  },
);

tasksRouter.delete('/tasks/:id', requireWorkspaceMembership, idempotencyMiddleware, async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Invalid task ID' }, 400);
  }
  try {
    const task = await workOps.deleteTask(id, undefined, undefined);
    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return c.json({ error: 'Failed to delete task' }, 500);
  }
});

tasksRouter.get('/tasks/:taskId/subtasks', requireWorkspaceMembership, async (c) => {
  const taskId = c.req.param('taskId');
  if (!taskId) {
    return c.json({ error: 'Invalid task ID' }, 400);
  }
  try {
    const subtasks = await workOps.getSubtasks(taskId);
    return c.json({ subtasks });
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    return c.json({ error: 'Failed to fetch subtasks' }, 500);
  }
});

export default tasksRouter;
