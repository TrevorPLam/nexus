import {
  CreateProjectSchema,
  UpdateProjectSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  CreateTaskDependencySchema,
  CreateTaskNoteSchema,
  UpdateTaskNoteSchema,
} from '@life-os/contracts';
import { Hono } from 'hono';
import { validator } from 'hono/validator';

import { authMiddleware, requireWorkspaceMembership, idempotencyMiddleware } from '../lib/middleware';
import * as workOps from '../lib/work-operations';

const workRouter = new Hono();

// Apply authentication middleware to all routes
workRouter.use('*', authMiddleware);

// Projects
workRouter.post('/projects', idempotencyMiddleware, validator('json', (value, c) => {
  const parsed = CreateProjectSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
  }
  return parsed.data;
}), async (c) => {
  const data = c.req.valid('json');
  try {
    const project = await workOps.createProject({
      ...data,
      status: 'active',
      metadata: null,
    });
    return c.json(project, 201);
  } catch (error) {
    console.error('Error creating project:', error);
    return c.json({ error: 'Failed to create project' }, 500);
  }
});

workRouter.get('/projects/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const project = await workOps.getProjectById(id);
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    return c.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return c.json({ error: 'Failed to fetch project' }, 500);
  }
});

workRouter.get('/workspaces/:workspaceId/projects', requireWorkspaceMembership, async (c) => {
  const workspaceId = c.req.param('workspaceId');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const cursor = c.req.query('cursor');
  
  try {
    const result = await workOps.getProjectsByWorkspace(workspaceId, limit, cursor);
    return c.json(result);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return c.json({ error: 'Failed to fetch projects' }, 500);
  }
});

workRouter.put('/projects/:id', idempotencyMiddleware, validator('json', (value, c) => {
  const parsed = UpdateProjectSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
  }
  return parsed.data;
}), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  try {
    const project = await workOps.updateProject(id, data);
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    return c.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    return c.json({ error: 'Failed to update project' }, 500);
  }
});

workRouter.delete('/projects/:id', idempotencyMiddleware, async (c) => {
  const id = c.req.param('id');
  try {
    const project = await workOps.deleteProject(id);
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return c.json({ error: 'Failed to delete project' }, 500);
  }
});

// Tasks
workRouter.post('/tasks', idempotencyMiddleware, validator('json', (value, c) => {
  const parsed = CreateTaskSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
  }
  return parsed.data;
}), async (c) => {
  const data = c.req.valid('json');
  try {
    const task = await workOps.createTask({
      ...data,
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      completedAt: null,
      metadata: null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      estimatedDuration: data.estimatedDuration ? String(data.estimatedDuration) : null,
    });
    return c.json(task, 201);
  } catch (error) {
    console.error('Error creating task:', error);
    return c.json({ error: 'Failed to create task' }, 500);
  }
});

workRouter.get('/tasks/:id', async (c) => {
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

workRouter.get('/workspaces/:workspaceId/tasks', requireWorkspaceMembership, async (c) => {
  const workspaceId = c.req.param('workspaceId');
  const projectId = c.req.query('projectId');
  const status = c.req.query('status');
  const priority = c.req.query('priority');
  const search = c.req.query('search');
  const dueBefore = c.req.query('dueBefore');
  const dueAfter = c.req.query('dueAfter');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const cursor = c.req.query('cursor');
  
  try {
    // If any filter parameters are provided, use filtered query (without pagination for now)
    if (projectId || status || priority || search || dueBefore || dueAfter) {
      const tasks = await workOps.getFilteredTasks({
        workspaceId,
        projectId,
        status,
        priority,
        searchQuery: search,
        dueBefore: dueBefore ? new Date(dueBefore) : undefined,
        dueAfter: dueAfter ? new Date(dueAfter) : undefined,
      });
      return c.json({ tasks });
    }
    
    // Otherwise, get paginated tasks for workspace
    const result = await workOps.getTasksByWorkspace(workspaceId, limit, cursor);
    return c.json(result);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return c.json({ error: 'Failed to fetch tasks' }, 500);
  }
});

workRouter.get('/projects/:projectId/tasks', async (c) => {
  const projectId = c.req.param('projectId');
  try {
    const tasks = await workOps.getTasksByProject(projectId);
    return c.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return c.json({ error: 'Failed to fetch tasks' }, 500);
  }
});

workRouter.put('/tasks/:id', idempotencyMiddleware, validator('json', (value, c) => {
  const parsed = UpdateTaskSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
  }
  return parsed.data;
}), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  try {
    const updateData: Record<string, unknown> = { ...data };
    if (data.dueDate) {
      updateData.dueDate = new Date(data.dueDate);
    }
    if (data.estimatedDuration !== undefined) {
      updateData.estimatedDuration = data.estimatedDuration ? String(data.estimatedDuration) : null;
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
});

workRouter.delete('/tasks/:id', idempotencyMiddleware, async (c) => {
  const id = c.req.param('id');
  try {
    const task = await workOps.deleteTask(id);
    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return c.json({ error: 'Failed to delete task' }, 500);
  }
});

// Task Dependencies
workRouter.post('/task-dependencies', validator('json', (value, c) => {
  const parsed = CreateTaskDependencySchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
  }
  return parsed.data;
}), async (c) => {
  const data = c.req.valid('json');
  try {
    const dependency = await workOps.createTaskDependency(data);
    return c.json(dependency, 201);
  } catch (error) {
    console.error('Error creating task dependency:', error);
    return c.json({ error: 'Failed to create task dependency' }, 500);
  }
});

workRouter.get('/tasks/:taskId/dependencies', async (c) => {
  const taskId = c.req.param('taskId');
  try {
    const dependencies = await workOps.getTaskDependencies(taskId);
    return c.json({ dependencies });
  } catch (error) {
    console.error('Error fetching task dependencies:', error);
    return c.json({ error: 'Failed to fetch task dependencies' }, 500);
  }
});

workRouter.delete('/task-dependencies/:id', async (c) => {
  const id = c.req.param('id');
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

// Subtasks
workRouter.get('/tasks/:taskId/subtasks', async (c) => {
  const taskId = c.req.param('taskId');
  try {
    const subtasks = await workOps.getSubtasks(taskId);
    return c.json({ subtasks });
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    return c.json({ error: 'Failed to fetch subtasks' }, 500);
  }
});

// Task Notes
workRouter.post('/task-notes', validator('json', (value, c) => {
  const parsed = CreateTaskNoteSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
  }
  return parsed.data;
}), async (c) => {
  const data = c.req.valid('json');
  try {
    const note = await workOps.createTaskNote(data);
    return c.json(note, 201);
  } catch (error) {
    console.error('Error creating task note:', error);
    return c.json({ error: 'Failed to create task note' }, 500);
  }
});

workRouter.get('/task-notes/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const note = await workOps.getTaskNoteById(id);
    if (!note) {
      return c.json({ error: 'Task note not found' }, 404);
    }
    return c.json(note);
  } catch (error) {
    console.error('Error fetching task note:', error);
    return c.json({ error: 'Failed to fetch task note' }, 500);
  }
});

workRouter.get('/tasks/:taskId/notes', async (c) => {
  const taskId = c.req.param('taskId');
  try {
    const notes = await workOps.getTaskNotesByTask(taskId);
    return c.json({ notes });
  } catch (error) {
    console.error('Error fetching task notes:', error);
    return c.json({ error: 'Failed to fetch task notes' }, 500);
  }
});

workRouter.put('/task-notes/:id', validator('json', (value, c) => {
  const parsed = UpdateTaskNoteSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
  }
  return parsed.data;
}), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  try {
    const note = await workOps.updateTaskNote(id, data);
    if (!note) {
      return c.json({ error: 'Task note not found' }, 404);
    }
    return c.json(note);
  } catch (error) {
    console.error('Error updating task note:', error);
    return c.json({ error: 'Failed to update task note' }, 500);
  }
});

workRouter.delete('/task-notes/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const note = await workOps.deleteTaskNote(id);
    if (!note) {
      return c.json({ error: 'Task note not found' }, 404);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting task note:', error);
    return c.json({ error: 'Failed to delete task note' }, 500);
  }
});

// Batch Task Operations
workRouter.post('/tasks/batch/complete', idempotencyMiddleware, async (c) => {
  const { taskIds } = await c.req.json();
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return c.json({ error: 'taskIds must be a non-empty array' }, 400);
  }
  
  try {
    const tasks = await workOps.batchCompleteTasks(taskIds);
    return c.json({ tasks });
  } catch (error) {
    console.error('Error batch completing tasks:', error);
    return c.json({ error: 'Failed to batch complete tasks' }, 500);
  }
});

workRouter.post('/tasks/batch/defer', idempotencyMiddleware, async (c) => {
  const { taskIds, deferToDate } = await c.req.json();
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return c.json({ error: 'taskIds must be a non-empty array' }, 400);
  }
  if (!deferToDate) {
    return c.json({ error: 'deferToDate is required' }, 400);
  }
  
  try {
    const tasks = await workOps.batchDeferTasks(taskIds, new Date(deferToDate));
    return c.json({ tasks });
  } catch (error) {
    console.error('Error batch deferring tasks:', error);
    return c.json({ error: 'Failed to batch defer tasks' }, 500);
  }
});

workRouter.post('/tasks/batch/reschedule', idempotencyMiddleware, async (c) => {
  const { taskIds, newDueDate } = await c.req.json();
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return c.json({ error: 'taskIds must be a non-empty array' }, 400);
  }
  if (!newDueDate) {
    return c.json({ error: 'newDueDate is required' }, 400);
  }
  
  try {
    const tasks = await workOps.batchRescheduleTasks(taskIds, new Date(newDueDate));
    return c.json({ tasks });
  } catch (error) {
    console.error('Error batch rescheduling tasks:', error);
    return c.json({ error: 'Failed to batch reschedule tasks' }, 500);
  }
});

workRouter.post('/tasks/batch/update-status', idempotencyMiddleware, async (c) => {
  const { taskIds, newStatus } = await c.req.json();
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return c.json({ error: 'taskIds must be a non-empty array' }, 400);
  }
  if (!newStatus) {
    return c.json({ error: 'newStatus is required' }, 400);
  }
  
  try {
    const tasks = await workOps.batchUpdateTaskStatus(taskIds, newStatus);
    return c.json({ tasks });
  } catch (error) {
    console.error('Error batch updating task status:', error);
    return c.json({ error: 'Failed to batch update task status' }, 500);
  }
});

export default workRouter;
