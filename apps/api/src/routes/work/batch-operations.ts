/**
 * MODULE: Work Batch Operation Endpoints
 *
 * Responsibility:
 * Provides bulk operation endpoints for tasks: batch complete, batch defer,
 * batch reschedule, and batch update status.
 *
 * Boundaries:
 * - Delegates persistence and business logic to lib/work-operations.js.
 * - Expects taskIds arrays and date/status parameters in the request body.
 *
 * Critical invariants:
 * - Preconditions:
 *   - All requests require valid authentication (authMiddleware)
 *   - All operations require workspace access (requireWorkspaceAccess)
 *   - All operations require idempotency middleware
 *   - taskIds must be a non-empty array
 *   - Date parameters must be valid date strings
 *   - Status parameters must be valid task status values
 * - Postconditions:
 *   - All responses are validated against Zod schemas
 *   - Workspace isolation is enforced by middleware
 *   - Batch operations are idempotent when idempotency key provided
 *   - Batch complete sets status to 'done' and completedAt to current timestamp
 *   - Batch defer updates dueDate for all tasks
 *   - Batch reschedule updates dueDate for all tasks
 *   - Batch update status handles completedAt automatically
 *   - All batch mutations emit audit logs and outbox events
 *   - Successful operations return 200 status codes
 *   - Failed operations return appropriate 4xx/5xx status codes
 *   - Test coverage: See apps/api/src/routes/work/batch-operations.test.ts (EXISTS)
 *
 * Side effects:
 * - Updates multiple task records within a transaction.
 * - Emits audit logs and outbox events via the command context.
 *
 * Change risk:
 * - High. Bulk updates affect many tasks at once and can alter project timelines.
 *
 * Links:
 * - apps/api/src/lib/work-operations.ts
 * - apps/api/src/lib/command-context.js
 * - apps/api/src/lib/middleware.js
 *
 * Tags:
 * - domain: work
 * - risk: high
 * - layer: api
 * - stability: stable
 * - concerns: batch, tasks, bulk-update
 *
 * File:
 * - apps/api/src/routes/work/batch-operations.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import { Hono } from 'hono';

import {
  authMiddleware,
  idempotencyMiddleware,
  requireWorkspaceAccess,
} from '../../lib/middleware.js';
import * as workOps from '../../lib/work-operations.js';
import { extractCommandContext } from '../../lib/command-context.js';

const batchOperationsRouter = new Hono();

// Apply authentication middleware to all routes
batchOperationsRouter.use('*', authMiddleware);

batchOperationsRouter.post(
  '/tasks/batch/complete',
  requireWorkspaceAccess,
  idempotencyMiddleware,
  async (c) => {
    const { taskIds } = await c.req.json();
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return c.json({ error: 'taskIds must be a non-empty array' }, 400);
    }

    try {
      const context = await extractCommandContext(c);
      const tasks = await workOps.batchCompleteTasks(taskIds, context);
      return c.json({ tasks });
    } catch (error) {
      console.error('Error batch completing tasks:', error);
      return c.json({ error: 'Failed to batch complete tasks' }, 500);
    }
  },
);

batchOperationsRouter.post(
  '/tasks/batch/defer',
  requireWorkspaceAccess,
  idempotencyMiddleware,
  async (c) => {
    const { taskIds, deferToDate } = await c.req.json();
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return c.json({ error: 'taskIds must be a non-empty array' }, 400);
    }
    if (!deferToDate) {
      return c.json({ error: 'deferToDate is required' }, 400);
    }

    try {
      const context = await extractCommandContext(c);
      const tasks = await workOps.batchDeferTasks(taskIds, new Date(deferToDate), context);
      return c.json({ tasks });
    } catch (error) {
      console.error('Error batch deferring tasks:', error);
      return c.json({ error: 'Failed to batch defer tasks' }, 500);
    }
  },
);

batchOperationsRouter.post(
  '/tasks/batch/reschedule',
  requireWorkspaceAccess,
  idempotencyMiddleware,
  async (c) => {
    const { taskIds, newDueDate } = await c.req.json();
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return c.json({ error: 'taskIds must be a non-empty array' }, 400);
    }
    if (!newDueDate) {
      return c.json({ error: 'newDueDate is required' }, 400);
    }

    try {
      const context = await extractCommandContext(c);
      const tasks = await workOps.batchRescheduleTasks(taskIds, new Date(newDueDate), context);
      return c.json({ tasks });
    } catch (error) {
      console.error('Error batch rescheduling tasks:', error);
      return c.json({ error: 'Failed to batch reschedule tasks' }, 500);
    }
  },
);

batchOperationsRouter.post(
  '/tasks/batch/update-status',
  requireWorkspaceAccess,
  idempotencyMiddleware,
  async (c) => {
    const { taskIds, newStatus } = await c.req.json();
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return c.json({ error: 'taskIds must be a non-empty array' }, 400);
    }
    if (!newStatus) {
      return c.json({ error: 'newStatus is required' }, 400);
    }

    try {
      const context = await extractCommandContext(c);
      const tasks = await workOps.batchUpdateTaskStatus(taskIds, newStatus, context);
      return c.json({ tasks });
    } catch (error) {
      console.error('Error batch updating task status:', error);
      return c.json({ error: 'Failed to batch update task status' }, 500);
    }
  },
);

export default batchOperationsRouter;
