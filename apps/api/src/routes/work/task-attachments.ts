/**
 * MODULE: Task Attachment Endpoints
 *
 * Responsibility:
 * Implements API endpoints for creating, retrieving, and deleting task attachment
 * metadata.
 *
 * Boundaries:
 * - Delegates persistence to lib/work-operations.js.
 * - uploadedBy is set from the authenticated user.
 * - This module does not handle binary file upload or storage.
 *
 * Critical invariants:
 * - Preconditions:
 *   - All requests require valid authentication (authMiddleware)
 *   - All operations require workspace membership (requireWorkspaceMembership)
 *   - Create operations require idempotency middleware
 *   - Input data must pass Zod validation from @life-os/contracts
 *   - Task IDs must reference existing tasks in the same workspace
 *   - uploadedBy is set from authenticated user
 *   - This module does not handle binary file upload or storage
 * - Postconditions:
 *   - All responses are validated against Zod schemas
 *   - Workspace isolation is enforced by middleware
 *   - Attachment creation is idempotent when idempotency key provided
 *   - Attachment metadata is stored but binary files handled separately
 *   - Successful operations return 200-201 status codes
 *   - Failed operations return appropriate 4xx/5xx status codes
 *   - Test coverage: See apps/api/src/routes/work/task-attachments.test.ts (MISSING)
 *
 * Side effects:
 * - Writes task_attachments records.
 *
 * Change risk:
 * - Medium. Attachment metadata affects task records and UI.
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
 * - concerns: attachments, tasks
 *
 * File:
 * - apps/api/src/routes/work/task-attachments.ts
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
