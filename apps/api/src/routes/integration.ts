import { Hono } from 'hono';
import { validator } from 'hono/validator';
import { z } from 'zod';

import { authMiddleware, requireWorkspaceMembership, requireWorkspaceAccess } from '../lib/middleware.js';
import {
  createTaskWithEventCommand,
  linkTaskEventCommand,
  unlinkTaskEventCommand,
} from '../lib/work-operations.js';
import { CreateTaskWithEventRequest } from '@life-os/contracts';

const integrationRouter = new Hono();

// Apply authentication middleware to all routes
integrationRouter.use('*', authMiddleware);

// Schema for creating a task with calendar event
const CreateTaskWithEventSchema = z.object({
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  dueDate: z.string().datetime().optional(),
  dueTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  estimatedDuration: z.number().int().positive().optional(),
  createCalendarEvent: z.boolean().default(false),
  calendarId: z.string().uuid().optional(),
  idempotencyKey: z.string().optional(),
});

// Create task with optional calendar event
integrationRouter.post(
  '/tasks-with-event',
  requireWorkspaceAccess,
  validator('json', (value, c) => {
    const parsed = CreateTaskWithEventSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const data = c.req.valid('json');
    const user = (c as any).get('user');
    const userId = user?.id;

    try {
      const result = await createTaskWithEventCommand(data, userId);

      // Handle idempotent response
      if ('isIdempotent' in result && result.isIdempotent) {
        return c.json(result.responseBody, parseInt(result.responseStatus || '200') as any);
      }

      return c.json(result, 201);
    } catch (error) {
      console.error('Error creating task with event:', error);
      const message = error instanceof Error ? error.message : 'Failed to create task with event';
      return c.json({ error: message }, 400);
    }
  },
);

// Link existing task to calendar event
integrationRouter.post(
  '/link-task-event',
  requireWorkspaceMembership,
  validator('json', (value, c) => {
    const schema = z.object({
      taskId: z.string().uuid(),
      eventId: z.string().uuid(),
      idempotencyKey: z.string().optional(),
    });
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const data = c.req.valid('json');
    const user = (c as any).get('user');
    const userId = user?.id;

    try {
      const result = await linkTaskEventCommand(data, userId);

      // Handle idempotent response
      if ('isIdempotent' in result && result.isIdempotent) {
        return c.json(result.responseBody, parseInt(result.responseStatus || '200') as any);
      }

      return c.json(result);
    } catch (error) {
      console.error('Error linking task to event:', error);
      const message = error instanceof Error ? error.message : 'Failed to link task to event';
      return c.json({ error: message }, 400);
    }
  },
);

// Unlink task from calendar event
integrationRouter.post(
  '/unlink-task-event',
  requireWorkspaceMembership,
  validator('json', (value, c) => {
    const schema = z.object({
      taskId: z.string().uuid(),
      idempotencyKey: z.string().optional(),
    });
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const data = c.req.valid('json');
    const user = (c as any).get('user');
    const userId = user?.id;

    try {
      const result = await unlinkTaskEventCommand(data, userId);

      // Handle idempotent response
      if ('isIdempotent' in result && result.isIdempotent) {
        return c.json(result.responseBody, parseInt(result.responseStatus || '200') as any);
      }

      return c.json(result);
    } catch (error) {
      console.error('Error unlinking task from event:', error);
      const message = error instanceof Error ? error.message : 'Failed to unlink task from event';
      return c.json({ error: message }, 400);
    }
  },
);

export default integrationRouter;
