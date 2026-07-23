import { Hono } from 'hono';

import * as calendarOps from '../../lib/calendar-operations.js';
import { authMiddleware, requireWorkspaceMembership } from '../../lib/middleware.js';
import { expandRecurringEvent } from '../../lib/recurrence.js';

const recurringRouter = new Hono();

// Apply authentication middleware to all routes
recurringRouter.use('*', authMiddleware);

recurringRouter.get('/recurring/:recurrenceId/instances', requireWorkspaceMembership, async (c) => {
  const recurrenceId = c.req.param('recurrenceId');
  const startDate = c.req.query('start');
  const endDate = c.req.query('end');

  try {
    // Get the base recurring event
    const baseEvent = await calendarOps.getBaseRecurringEvent(recurrenceId);
    if (!baseEvent) {
      return c.json({ error: 'Base recurring event not found' }, 404);
    }

    if (!baseEvent.recurrenceRule) {
      return c.json({ error: 'Event is not recurring' }, 400);
    }

    // Parse date range or use defaults (next 30 days)
    const rangeStart = startDate ? new Date(startDate) : new Date();
    const rangeEnd = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Expand the recurring event using the recurrence utility
    const occurrences = expandRecurringEvent(
      new Date(baseEvent.start),
      baseEvent.recurrenceRule,
      rangeStart,
      rangeEnd,
      baseEvent.timezone || 'UTC',
    );

    // Calculate duration of the base event
    const duration = new Date(baseEvent.end).getTime() - new Date(baseEvent.start).getTime();

    // Generate instance objects from occurrences
    const instances = occurrences.map((occurrence) => ({
      id: `${baseEvent.id}-${occurrence.getTime()}`,
      recurrenceId: baseEvent.id,
      title: baseEvent.title,
      description: baseEvent.description,
      location: baseEvent.location,
      isAllDay: baseEvent.isAllDay,
      start: occurrence,
      end: new Date(occurrence.getTime() + duration),
      timezone: baseEvent.timezone,
      calendarId: baseEvent.calendarId,
      workspaceId: baseEvent.workspaceId,
    }));

    return c.json({ instances });
  } catch (error) {
    console.error('Error fetching recurring event instances:', error);
    return c.json({ error: 'Failed to fetch recurring event instances' }, 500);
  }
});

recurringRouter.get('/recurring/:recurrenceId/base', requireWorkspaceMembership, async (c) => {
  const recurrenceId = c.req.param('recurrenceId');
  try {
    const baseEvent = await calendarOps.getBaseRecurringEvent(recurrenceId);
    if (!baseEvent) {
      return c.json({ error: 'Base recurring event not found' }, 404);
    }
    return c.json(baseEvent);
  } catch (error) {
    console.error('Error fetching base recurring event:', error);
    return c.json({ error: 'Failed to fetch base recurring event' }, 500);
  }
});

export default recurringRouter;
