import { CreateEventAttendeeRequest } from '@life-os/contracts';
import { Hono } from 'hono';
import { validator } from 'hono/validator';

import * as calendarOps from '../../lib/calendar-operations.js';
import { authMiddleware, requireWorkspaceMembership } from '../../lib/middleware.js';

const attendeesRouter = new Hono();

// Apply authentication middleware to all routes
attendeesRouter.use('*', authMiddleware);

attendeesRouter.post(
  '/event-attendees',
  requireWorkspaceMembership,
  validator('json', (value, c) => {
    const parsed = CreateEventAttendeeRequest.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const data = c.req.valid('json');
    try {
      const attendee = await calendarOps.createEventAttendee({
        ...data,
        status: data.status || 'needs_action',
        isOrganizer: data.isOrganizer || false,
      });
      return c.json(attendee, 201);
    } catch (error) {
      console.error('Error creating event attendee:', error);
      return c.json({ error: 'Failed to create event attendee' }, 500);
    }
  },
);

attendeesRouter.get('/events/:eventId/attendees', requireWorkspaceMembership, async (c) => {
  const eventId = c.req.param('eventId');
  try {
    const attendees = await calendarOps.getEventAttendees(eventId);
    return c.json({ attendees });
  } catch (error) {
    console.error('Error fetching event attendees:', error);
    return c.json({ error: 'Failed to fetch event attendees' }, 500);
  }
});

attendeesRouter.put('/event-attendees/:id', requireWorkspaceMembership, async (c) => {
  const id = c.req.param('id');
  const status = c.req.query('status');
  try {
    if (!status) {
      return c.json({ error: 'Status query parameter is required' }, 400);
    }
    const attendee = await calendarOps.updateEventAttendee(id, { status });
    if (!attendee) {
      return c.json({ error: 'Event attendee not found' }, 404);
    }
    return c.json(attendee);
  } catch (error) {
    console.error('Error updating event attendee:', error);
    return c.json({ error: 'Failed to update event attendee' }, 500);
  }
});

attendeesRouter.delete('/event-attendees/:id', requireWorkspaceMembership, async (c) => {
  const id = c.req.param('id');
  try {
    const attendee = await calendarOps.deleteEventAttendee(id);
    if (!attendee) {
      return c.json({ error: 'Event attendee not found' }, 404);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting event attendee:', error);
    return c.json({ error: 'Failed to delete event attendee' }, 500);
  }
});

export default attendeesRouter;
