import { CreateCalendarRequest, UpdateCalendarRequest } from '@life-os/contracts';
import { Hono } from 'hono';
import { validator } from 'hono/validator';

import * as calendarOps from '../../lib/calendar-operations.js';
import { authMiddleware, requireWorkspaceMembership } from '../../lib/middleware.js';

const calendarsRouter = new Hono();

// Apply authentication middleware to all routes
calendarsRouter.use('*', authMiddleware);

calendarsRouter.post(
  '/calendars',
  validator('json', (value, c) => {
    const parsed = CreateCalendarRequest.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const data = c.req.valid('json');
    try {
      const calendar = await calendarOps.createCalendar({
        ...data,
        isDefault: data.isDefault || false,
        provider: data.provider || 'local',
        metadata: null,
      });
      return c.json(calendar, 201);
    } catch (error) {
      console.error('Error creating calendar:', error);
      return c.json({ error: 'Failed to create calendar' }, 500);
    }
  },
);

calendarsRouter.get('/calendars/:id', requireWorkspaceMembership, async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Calendar ID required' }, 400);
  }
  try {
    const calendar = await calendarOps.getCalendarById(id);
    if (!calendar) {
      return c.json({ error: 'Calendar not found' }, 404);
    }
    return c.json(calendar);
  } catch (error) {
    console.error('Error fetching calendar:', error);
    return c.json({ error: 'Failed to fetch calendar' }, 500);
  }
});

calendarsRouter.get('/workspaces/:workspaceId/calendars', requireWorkspaceMembership, async (c) => {
  const workspaceId = c.req.param('workspaceId');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const cursor = c.req.query('cursor');

  try {
    const result = await calendarOps.getCalendarsByWorkspace(workspaceId, limit, cursor);
    return c.json(result);
  } catch (error) {
    console.error('Error fetching calendars:', error);
    return c.json({ error: 'Failed to fetch calendars' }, 500);
  }
});

calendarsRouter.put(
  '/calendars/:id',
  requireWorkspaceMembership,
  validator('json', (value, c) => {
    const parsed = UpdateCalendarRequest.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Calendar ID required' }, 400);
    }
    const data = c.req.valid('json');
    // Remove workspaceId from update data as it should not be changed
    const { workspaceId: _, ...updateData } = data;
    try {
      const calendar = await calendarOps.updateCalendar(id, updateData);
      if (!calendar) {
        return c.json({ error: 'Calendar not found' }, 404);
      }
      return c.json(calendar);
    } catch (error) {
      console.error('Error updating calendar:', error);
      return c.json({ error: 'Failed to update calendar' }, 500);
    }
  },
);

calendarsRouter.delete('/calendars/:id', requireWorkspaceMembership, async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Calendar ID required' }, 400);
  }
  try {
    const calendar = await calendarOps.deleteCalendar(id);
    if (!calendar) {
      return c.json({ error: 'Calendar not found' }, 404);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar:', error);
    return c.json({ error: 'Failed to delete calendar' }, 500);
  }
});

export default calendarsRouter;
