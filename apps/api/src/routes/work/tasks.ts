/**
 * MODULE: Task Management Endpoints
 *
 * Responsibility:
 * Implementation of API endpoints for task lifecycle management, including
 * creation, retrieval, filtered listing, updates, and deletion.
 *
 * Boundaries:
 * - Handles HTTP request/response cycle and input validation.
 * - Delegates business logic and persistence to lib/work-operations.js.
 * - Authorization is enforced via middleware (requireWorkspaceAccess, requireEntityAccess).
 *
 * Critical invariants:
 * - Preconditions:
 *   - All requests require valid authentication (authMiddleware)
 *   - Create/update/delete operations require workspace access (requireWorkspaceAccess)
 *   - Create/update/delete operations require idempotency middleware
 *   - Get by ID operations require entity access (requireEntityAccess)
 *   - Input data must pass Zod validation from @life-os/contracts
 *   - Task filtering requires valid workspace membership
 * - Postconditions:
 *   - All responses are validated against Zod schemas
 *   - Workspace isolation is enforced by middleware
 *   - Task mutations are idempotent when idempotency key provided
 *   - Task deletion soft-deletes (sets status to 'cancelled')
 *   - Task status 'done' automatically sets completedAt
 *   - Successful operations return 200-201 status codes
 *   - Failed operations return appropriate 4xx/5xx status codes
 *   - Test coverage: See apps/api/src/routes/work/tasks.test.ts (EXISTS)
 *
 * Side effects:
 * - Database writes and outbox event emission via work-operations.js.
 *
 * Change risk:
 * - High. Core application functionality. Changes must be verified with integration tests.
 *
 * Context:
 * - API Specification: @life-os/contracts
 *
 * Links:
 * - apps/api/src/lib/work-operations.ts
 * - packages/contracts/src/work.ts
 * - apps/api/src/lib/middleware.ts
 *
 * Tags:
 * - domain: work
 * - risk: high
 * - layer: api
 * - stability: stable
 * - concerns: tasks, crud, filtering
 *
 * File:
 * - apps/api/src/routes/work/tasks.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { CreateTaskRequest, UpdateTaskRequest, TaskResponse } from '@life-os/contracts';
import { z } from 'zod';

import {
  authMiddleware,
  requireWorkspaceMembership,
  requireEntityAccess,
  requireWorkspaceAccess,
  idempotencyMiddleware,
} from '../../lib/middleware.js';
import * as workOps from '../../lib/work-operations.js';
import { extractCommandContext } from '../../lib/command-context.js';

const tasksRouter = new OpenAPIHono();

const createTaskRoute = createRoute({
  method: 'post',
  path: '/tasks',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateTaskRequest,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: TaskResponse,
        },
      },
      description: 'Task created successfully',
    },
    400: {
      description: 'Invalid request data',
    },
    500: {
      description: 'Failed to create task',
    },
  },
  tags: ['tasks'],
});

const getTaskRoute = createRoute({
  method: 'get',
  path: '/tasks/{id}',
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: TaskResponse,
        },
      },
      description: 'Task retrieved successfully',
    },
    404: {
      description: 'Task not found',
    },
    500: {
      description: 'Failed to fetch task',
    },
  },
  tags: ['tasks'],
});

// Apply authentication middleware to all routes
tasksRouter.use('*', authMiddleware);

tasksRouter.openapi(createTaskRoute, requireWorkspaceAccess, idempotencyMiddleware, async (c) => {
  const data = c.req.valid('json');
  try {
    const context = await extractCommandContext(c);
    const task = await workOps.createTask(
      {
        ...data,
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        completedAt: null,
        metadata: null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        estimatedDuration: data.estimatedDuration,
      },
      context,
    );
    return c.json(task, 201);
  } catch (error) {
    console.error('Error creating task:', error);
    return c.json({ error: 'Failed to create task' }, 500);
  }
});

tasksRouter.openapi(getTaskRoute, requireEntityAccess('tasks'), async (c) => {
  const { id } = c.req.valid('param');
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
  const includeCancelled = c.req.query('includeCancelled') === 'true';

  // Validate cursor format if provided
  let parsedCursor: string | undefined;
  if (cursor) {
    try {
      JSON.parse(cursor);
      parsedCursor = cursor;
    } catch {
      return c.json({ error: 'Invalid cursor format' }, 400);
    }
  }

  try {
    // If any filter parameters are provided, use filtered query with pagination
    if (projectId || status || priority || search || dueBefore || dueAfter) {
      const filterParams: Record<string, unknown> = {
        workspaceId,
        limit,
        includeCancelled,
      };
      if (projectId) filterParams.projectId = projectId;
      if (status) filterParams.status = status;
      if (priority) filterParams.priority = priority;
      if (search) filterParams.searchQuery = search;
      if (dueBefore) filterParams.dueBefore = new Date(dueBefore);
      if (dueAfter) filterParams.dueAfter = new Date(dueAfter);
      if (parsedCursor) filterParams.cursor = parsedCursor;

      const result = await workOps.getFilteredTasks(filterParams as any);
      return c.json({
        tasks: result.items,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      });
    }

    // Otherwise, get paginated tasks for workspace
    const result = await workOps.getTasksByWorkspace(
      workspaceId,
      limit,
      parsedCursor,
      includeCancelled,
    );
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
  const includeCancelled = c.req.query('includeCancelled') === 'true';

  try {
    const tasks = await workOps.getTasksByProject(projectId, includeCancelled);
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
      const context = await extractCommandContext(c);
      const updateData: Record<string, unknown> = { ...data };
      if (data.dueDate) {
        updateData.dueDate = new Date(data.dueDate);
      }
      const task = await workOps.updateTask(id, updateData, context);
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
    const context = await extractCommandContext(c);
    const task = await workOps.deleteTask(id, context);
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
