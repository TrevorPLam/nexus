import { CreateTaskDependencyRequest } from '@life-os/contracts';
import { Hono } from 'hono';
import { validator } from 'hono/validator';

import { authMiddleware, requireWorkspaceMembership } from '../../lib/middleware.js';
import * as workOps from '../../lib/work-operations.js';

const taskDependenciesRouter = new Hono();

// Apply authentication middleware to all routes
taskDependenciesRouter.use('*', authMiddleware);

taskDependenciesRouter.post(
  '/task-dependencies',
  requireWorkspaceMembership,
  validator('json', (value, c) => {
    const parsed = CreateTaskDependencyRequest.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const data = c.req.valid('json');
    try {
      const dependency = await workOps.createTaskDependency(data);
      return c.json(dependency, 201);
    } catch (error) {
      console.error('Error creating task dependency:', error);
      return c.json({ error: 'Failed to create task dependency' }, 500);
    }
  },
);

taskDependenciesRouter.get('/tasks/:taskId/dependencies', requireWorkspaceMembership, async (c) => {
  const taskId = c.req.param('taskId');
  if (!taskId) {
    return c.json({ error: 'Invalid task ID' }, 400);
  }
  try {
    const dependencies = await workOps.getTaskDependencies(taskId);
    return c.json({ dependencies });
  } catch (error) {
    console.error('Error fetching task dependencies:', error);
    return c.json({ error: 'Failed to fetch task dependencies' }, 500);
  }
});

taskDependenciesRouter.delete('/task-dependencies/:id', requireWorkspaceMembership, async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Invalid dependency ID' }, 400);
  }
  try {
    const dependency = await workOps.deleteTaskDependency(id);
    if (!dependency) {
      return c.json({ error: 'Task dependency not found' }, 404);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting task dependency:', error);
    return c.json({ error: 'Failed to delete task dependency' }, 500);
  }
});

export default taskDependenciesRouter;
