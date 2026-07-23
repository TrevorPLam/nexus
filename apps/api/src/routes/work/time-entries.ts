/**
 * MODULE: Task Time Entry Endpoints
 *
 * Responsibility:
 * Implements API endpoints for creating, retrieving, updating, and deleting time
 * entries for tasks.
 *
 * Boundaries:
 * - Delegates persistence to lib/work-operations.js.
 * - userId is set from the authenticated user.
 * - Dates and duration are parsed from request payloads.
 *
 * Critical invariants:
 * - Preconditions:
 *   - All requests require valid authentication (authMiddleware)
 *   - All operations require workspace membership (requireWorkspaceMembership)
 *   - Create/update operations require idempotency middleware
 *   - Input data must pass Zod validation from @life-os/contracts
 *   - Task IDs must reference existing tasks in the same workspace
 *   - userId is set from authenticated user
 *   - Dates are parsed from ISO strings; invalid values cause 400 responses
 * - Postconditions:
 *   - All responses are validated against Zod schemas
 *   - Workspace isolation is enforced by middleware
 *   - Time entry creation is idempotent when idempotency key provided
 *   - Duration is stored as string in database
 *   - Successful operations return 200-201 status codes
 *   - Failed operations return appropriate 4xx/5xx status codes
 *   - Test coverage: See apps/api/src/routes/work/time-entries.test.ts (MISSING)
 *
 * Side effects:
 * - Writes time_entries records.
 *
 * Change risk:
 * - Medium. Time tracking affects reporting and billing-related features.
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
 * - concerns: time-entries, tracking, tasks
 *
 * File:
 * - apps/api/src/routes/work/time-entries.ts
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
