import { Hono } from 'hono';

import { authMiddleware, idempotencyMiddleware, requireWorkspaceMembership } from '../../lib/middleware.js';
import * as workOps from '../../lib/work-operations.js';
import { CreateTaskAttachmentRequest } from '@life-os/contracts';

const taskAttachmentsRouter = new Hono();

// Apply middleware to all routes
taskAttachmentsRouter.use('*', authMiddleware);

// Create task attachment
taskAttachmentsRouter.post('/', requireWorkspaceMembership, idempotencyMiddleware, async (c) => {
  const user = c.get('user') as { id: string };
  const body = await c.req.json();
  const validated = CreateTaskAttachmentRequest.parse(body);
  const result = await workOps.createTaskAttachment({
    ...validated,
    uploadedBy: user.id,
  });
  return c.json(result, 201);
});

// Get task attachments by task ID
taskAttachmentsRouter.get('/tasks/:taskId', requireWorkspaceMembership, async (c) => {
  const taskId = c.req.param('taskId');
  if (!taskId) {
    return c.json({ error: 'Invalid task ID' }, 400);
  }
  const result = await workOps.getTaskAttachmentsByTask(taskId);
  return c.json(result);
});

// Get task attachment by ID
taskAttachmentsRouter.get('/:id', requireWorkspaceMembership, async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Invalid attachment ID' }, 400);
  }
  const result = await workOps.getTaskAttachmentById(id);
  return c.json(result);
});

// Delete task attachment
taskAttachmentsRouter.delete('/:id', requireWorkspaceMembership, async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Invalid attachment ID' }, 400);
  }
  await workOps.deleteTaskAttachment(id);
  return c.json({ success: true });
});

export default taskAttachmentsRouter;
