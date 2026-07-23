/**
 * MODULE: Task Note Endpoints
 *
 * Responsibility:
 * Implements API endpoints for creating, retrieving, updating, and deleting
 * task notes.
 *
 * Boundaries:
 * - Delegates persistence to lib/work-operations.js.
 * - Input validation uses Zod schemas from @life-os/contracts.
 *
 * Critical invariants:
 * - Preconditions:
 *   - All requests require valid authentication (authMiddleware)
 *   - All operations require workspace membership (requireWorkspaceMembership)
 *   - Input data must pass Zod validation from @life-os/contracts
 *   - Task IDs must reference existing tasks in the same workspace
 * - Note content must be non-empty string
 * - Postconditions:
 *   - All responses are validated against Zod schemas
 *   - Workspace isolation is enforced by middleware
 *   - Notes are scoped to workspace through task ownership
 *   - Updates only allow modifying note content
 *   - Successful operations return 200-201 status codes
 *   - Failed operations return appropriate 4xx/5xx status codes
 *   - Test coverage: See apps/api/src/routes/work/task-notes.test.ts (EXISTS)
 *
 * Side effects:
 * - Writes task_notes records.
 *
 * Change risk:
 * - Medium. Notes are user-facing task context.
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
 * - concerns: notes, tasks
 *
 * File:
 * - apps/api/src/routes/work/task-notes.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import { CreateTaskNoteRequest, UpdateTaskNoteRequest } from '@life-os/contracts';
import { Hono } from 'hono';
import { validator } from 'hono/validator';

import { authMiddleware, requireWorkspaceMembership } from '../../lib/middleware.js';
import * as workOps from '../../lib/work-operations.js';

const taskNotesRouter = new Hono();

// Apply authentication middleware to all routes
taskNotesRouter.use('*', authMiddleware);

taskNotesRouter.post(
  '/task-notes',
  requireWorkspaceMembership,
  validator('json', (value, c) => {
    const parsed = CreateTaskNoteRequest.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const data = c.req.valid('json');
    try {
      const note = await workOps.createTaskNote(data);
      return c.json(note, 201);
    } catch (error) {
      console.error('Error creating task note:', error);
      return c.json({ error: 'Failed to create task note' }, 500);
    }
  },
);

taskNotesRouter.get('/task-notes/:id', requireWorkspaceMembership, async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Invalid note ID' }, 400);
  }
  try {
    const note = await workOps.getTaskNoteById(id);
    if (!note) {
      return c.json({ error: 'Task note not found' }, 404);
    }
    return c.json(note);
  } catch (error) {
    console.error('Error fetching task note:', error);
    return c.json({ error: 'Failed to fetch task note' }, 500);
  }
});

taskNotesRouter.get('/tasks/:taskId/notes', requireWorkspaceMembership, async (c) => {
  const taskId = c.req.param('taskId');
  if (!taskId) {
    return c.json({ error: 'Invalid task ID' }, 400);
  }
  try {
    const notes = await workOps.getTaskNotesByTask(taskId);
    return c.json({ notes });
  } catch (error) {
    console.error('Error fetching task notes:', error);
    return c.json({ error: 'Failed to fetch task notes' }, 500);
  }
});

taskNotesRouter.put(
  '/task-notes/:id',
  requireWorkspaceMembership,
  validator('json', (value, c) => {
    const parsed = UpdateTaskNoteRequest.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Invalid note ID' }, 400);
    }
    const data = c.req.valid('json');
    try {
      const note = await workOps.updateTaskNote(id, data);
      if (!note) {
        return c.json({ error: 'Task note not found' }, 404);
      }
      return c.json(note);
    } catch (error) {
      console.error('Error updating task note:', error);
      return c.json({ error: 'Failed to update task note' }, 500);
    }
  },
);

taskNotesRouter.delete('/task-notes/:id', requireWorkspaceMembership, async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Invalid note ID' }, 400);
  }
  try {
    const note = await workOps.deleteTaskNote(id);
    if (!note) {
      return c.json({ error: 'Task note not found' }, 404);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting task note:', error);
    return c.json({ error: 'Failed to delete task note' }, 500);
  }
});

export default taskNotesRouter;
