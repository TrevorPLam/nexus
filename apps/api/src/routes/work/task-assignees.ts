/**
 * MODULE: Task Assignee Endpoints
 *
 * Responsibility:
 * Implements API endpoints for assigning users to tasks, listing assignees for
 * a task, and removing task assignments.
 *
 * Boundaries:
 * - Delegates persistence to lib/work-operations.js.
 * - Relies on middleware for workspace membership checks.
 *
 * Critical invariants:
 * - Preconditions:
 *   - All requests require valid authentication (authMiddleware)
 *   - All operations require workspace membership (requireWorkspaceMembership)
 *   - Create operations require idempotency middleware
 *   - Input data must pass Zod validation from @life-os/contracts
 *   - Task IDs must reference existing tasks in the same workspace
 *   - User IDs must reference existing app_users
 *   - Authenticated user's id is stored as assignedBy
 * - Postconditions:
 *   - All responses are validated against Zod schemas
 *   - Workspace isolation is enforced by middleware
 *   - Assignee creation is idempotent when idempotency key provided
 *   - Deleting an assignee does not delete the underlying task
 *   - Successful operations return 200-201 status codes
 *   - Failed operations return appropriate 4xx/5xx status codes
 *   - Test coverage: See apps/api/src/routes/work/task-assignees.test.ts (MISSING)
 *
 * Side effects:
 * - Writes task_assignees records.
 *
 * Change risk:
 * - Medium. Assignee visibility affects workload and notifications.
 *
 * Links:
 * - apps/api/src/lib/work-operations.ts
 * - packages/contracts/src/work.ts
 * - apps/api/src/lib/middleware.js
 *
 * Tags:
 * - domain: work
 * - risk: medium
 * - layer: api
 * - stability: stable
 * - concerns: assignees, tasks
 *
 * File:
 * - apps/api/src/routes/work/task-assignees.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import { Hono } from 'hono';

import {
  authMiddleware,
  idempotencyMiddleware,
  requireWorkspaceMembership,
} from '../../lib/middleware.js';
import * as workOps from '../../lib/work-operations.js';
import { CreateTaskAssigneeRequest } from '@life-os/contracts';

const taskAssigneesRouter = new Hono();

// Apply middleware to all routes
taskAssigneesRouter.use('*', authMiddleware);

// Create task assignee
taskAssigneesRouter.post('/', requireWorkspaceMembership, idempotencyMiddleware, async (c) => {
  const user = c.get('user') as { id: string };
  const body = await c.req.json();
  const validated = CreateTaskAssigneeRequest.parse(body);
  const result = await workOps.createTaskAssignee({
    ...validated,
    assignedBy: user.id,
  });
  return c.json(result, 201);
});

// Get task assignees by task ID
taskAssigneesRouter.get('/tasks/:taskId', requireWorkspaceMembership, async (c) => {
  const taskId = c.req.param('taskId');
  if (!taskId) {
    return c.json({ error: 'Invalid task ID' }, 400);
  }
  const result = await workOps.getTaskAssignees(taskId);
  return c.json(result);
});

// Delete task assignee
taskAssigneesRouter.delete('/:id', requireWorkspaceMembership, async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Invalid assignee ID' }, 400);
  }
  await workOps.deleteTaskAssignee(id);
  return c.json({ success: true });
});

export default taskAssigneesRouter;
