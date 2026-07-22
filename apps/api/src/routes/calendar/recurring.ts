import { Hono } from 'hono';

import * as calendarOps from '../../lib/calendar-operations.js';
import { authMiddleware } from '../../lib/middleware.js';

const recurringRouter = new Hono();

// Apply authentication middleware to all routes
recurringRouter.use('*', authMiddleware);

recurringRouter.get('/recurring/:recurrenceId/instances', async (c) => {
  const recurrenceId = c.req.param('recurrenceId');
  try {
    const instances = await calendarOps.getRecurringEventInstances(recurrenceId);
    return c.json({ instances });
  } catch (error) {
    console.error('Error fetching recurring event instances:', error);
    return c.json({ error: 'Failed to fetch recurring event instances' }, 500);
  }
});

recurringRouter.get('/recurring/:recurrenceId/base', async (c) => {
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
