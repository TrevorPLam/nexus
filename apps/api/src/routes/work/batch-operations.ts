import { Hono } from 'hono';

import { authMiddleware, idempotencyMiddleware, requireWorkspaceAccess } from '../../lib/middleware.js';
import * as workOps from '../../lib/work-operations.js';

const batchOperationsRouter = new Hono();

// Apply authentication middleware to all routes
batchOperationsRouter.use('*', authMiddleware);

batchOperationsRouter.post('/tasks/batch/complete', requireWorkspaceAccess, idempotencyMiddleware, async (c) => {
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

batchOperationsRouter.post('/tasks/batch/defer', requireWorkspaceAccess, idempotencyMiddleware, async (c) => {
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

batchOperationsRouter.post('/tasks/batch/reschedule', requireWorkspaceAccess, idempotencyMiddleware, async (c) => {
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

batchOperationsRouter.post('/tasks/batch/update-status', requireWorkspaceAccess, idempotencyMiddleware, async (c) => {
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

export default batchOperationsRouter;
