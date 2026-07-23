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
