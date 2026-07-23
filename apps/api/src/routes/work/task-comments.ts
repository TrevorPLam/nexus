/**
 * MODULE: Task Comment Endpoints
 *
 * Responsibility:
 * Implements API endpoints for creating, retrieving, updating, and deleting
 * comments on tasks.
 *
 * Boundaries:
 * - Delegates persistence to lib/work-operations.js.
 * - userId is set from the authenticated user.
 *
 * Critical invariants:
 * - Preconditions:
 *   - All requests require valid authentication (authMiddleware)
 *   - All operations require workspace membership (requireWorkspaceMembership)
 *   - Create/update operations require idempotency middleware
 *   - Input data must pass Zod validation from @life-os/contracts
 *   - Task IDs must reference existing tasks in the same workspace
 *   - userId is set from authenticated user
 * - Postconditions:
 *   - All responses are validated against Zod schemas
 *   - Workspace isolation is enforced by middleware
 *   - Comments are scoped to workspace through task ownership
 *   - Comment creation is idempotent when idempotency key provided
 *   - Updates only allow modifying comment content
 *   - Successful operations return 200-201 status codes
 *   - Failed operations return appropriate 4xx/5xx status codes
 *   - Test coverage: See apps/api/src/routes/work/task-comments.test.ts (MISSING)
 *
 * Side effects:
 * - Writes task_comments records.
 *
 * Change risk:
 * - Medium. Comment history is user-facing and feeds activity feeds.
 *
 * Links:
 * - apps/api/src/lib/work-operations.ts
 * - packages/contracts/src/work.ts
 *
 * Tags:
 * - domain: work
 * - risk: medium
 * - layer: api
 * - stability: stable
 * - concerns: comments, tasks
 *
 * File:
 * - apps/api/src/routes/work/task-comments.ts
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
import { CreateTaskCommentRequest, UpdateTaskCommentRequest } from '@life-os/contracts';

const taskCommentsRouter = new Hono();

// Apply middleware to all routes
taskCommentsRouter.use('*', authMiddleware);

// Create task comment
taskCommentsRouter.post('/', requireWorkspaceMembership, idempotencyMiddleware, async (c) => {
  const user = c.get('user') as { id: string };
  const body = await c.req.json();
  const validated = CreateTaskCommentRequest.parse(body);
  const result = await workOps.createTaskComment({
    ...validated,
    userId: user.id,
  });
  return c.json(result, 201);
});

// Get task comments by task ID
taskCommentsRouter.get('/tasks/:taskId', requireWorkspaceMembership, async (c) => {
  const taskId = c.req.param('taskId');
  if (!taskId) {
    return c.json({ error: 'Invalid task ID' }, 400);
  }
  const result = await workOps.getTaskCommentsByTask(taskId);
  return c.json(result);
});

// Get task comment by ID
taskCommentsRouter.get('/:id', requireWorkspaceMembership, async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Invalid comment ID' }, 400);
  }
  const result = await workOps.getTaskCommentById(id);
  return c.json(result);
});

// Update task comment
taskCommentsRouter.put('/:id', requireWorkspaceMembership, async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Invalid comment ID' }, 400);
  }
  const body = await c.req.json();
  const validated = UpdateTaskCommentRequest.parse(body);
  const result = await workOps.updateTaskComment(id, {
    content: validated.content,
  });
  return c.json(result);
});

// Delete task comment
taskCommentsRouter.delete('/:id', requireWorkspaceMembership, async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Invalid comment ID' }, 400);
  }
  await workOps.deleteTaskComment(id);
  return c.json({ success: true });
});

export default taskCommentsRouter;
