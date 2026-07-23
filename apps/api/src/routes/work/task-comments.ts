import { Hono } from 'hono';

import { authMiddleware, idempotencyMiddleware, requireWorkspaceMembership } from '../../lib/middleware.js';
import * as workOps from '../../lib/work-operations.js';
import {
  CreateTaskCommentRequest,
  UpdateTaskCommentRequest,
} from '@life-os/contracts';

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
