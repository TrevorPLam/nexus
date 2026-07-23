import { Hono } from 'hono';

import {
  authMiddleware,
  idempotencyMiddleware,
  requireWorkspaceMembership,
} from '../../lib/middleware.js';
import * as workOps from '../../lib/work-operations.js';
import { CreateTimeEntryRequest, UpdateTimeEntryRequest } from '@life-os/contracts';

const timeEntriesRouter = new Hono();

// Apply middleware to all routes
timeEntriesRouter.use('*', authMiddleware);

// Create time entry
timeEntriesRouter.post('/', requireWorkspaceMembership, idempotencyMiddleware, async (c) => {
  const user = c.get('user') as { id: string };
  const body = await c.req.json();
  const validated = CreateTimeEntryRequest.parse(body);
  const result = await workOps.createTimeEntry({
    ...validated,
    userId: user.id,
    startedAt: new Date(validated.startedAt),
    duration: validated.duration ? String(validated.duration) : undefined,
    stoppedAt: validated.stoppedAt ? new Date(validated.stoppedAt) : undefined,
  });
  return c.json(result, 201);
});

// Get time entries by task ID
timeEntriesRouter.get('/tasks/:taskId', requireWorkspaceMembership, async (c) => {
  const taskId = c.req.param('taskId');
  if (!taskId) {
    return c.json({ error: 'Invalid task ID' }, 400);
  }
  const result = await workOps.getTimeEntriesByTask(taskId);
  return c.json(result);
});

// Get time entry by ID
timeEntriesRouter.get('/:id', requireWorkspaceMembership, async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Invalid time entry ID' }, 400);
  }
  const result = await workOps.getTimeEntryById(id);
  return c.json(result);
});

// Update time entry
timeEntriesRouter.put('/:id', requireWorkspaceMembership, async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Invalid time entry ID' }, 400);
  }
  const body = await c.req.json();
  const validated = UpdateTimeEntryRequest.parse(body);
  const result = await workOps.updateTimeEntry(id, {
    ...validated,
    stoppedAt: validated.stoppedAt ? new Date(validated.stoppedAt) : undefined,
    duration: validated.duration,
  });
  return c.json(result);
});

// Delete time entry
timeEntriesRouter.delete('/:id', requireWorkspaceMembership, async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Invalid time entry ID' }, 400);
  }
  await workOps.deleteTimeEntry(id);
  return c.json({ success: true });
});

export default timeEntriesRouter;
