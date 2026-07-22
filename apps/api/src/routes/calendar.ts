import {
  CreateCalendarSchema,
  UpdateCalendarSchema,
  CreateEventSchema,
  UpdateEventSchema,
  CreateEventAttendeeSchema,
} from '@life-os/contracts';
import { Hono } from 'hono';
import { validator } from 'hono/validator';

import * as calendarOps from '../lib/calendar-operations';
import { authMiddleware, requireWorkspaceMembership } from '../lib/middleware';

const calendarRouter = new Hono();

// Apply authentication middleware to all routes
calendarRouter.use('*', authMiddleware);

// Calendars
calendarRouter.post('/calendars', validator('json', (value, c) => {
  const parsed = CreateCalendarSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
  }
  return parsed.data;
}), async (c) => {
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
});

calendarRouter.get('/calendars/:id', async (c) => {
  const id = c.req.param('id');
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

calendarRouter.get('/workspaces/:workspaceId/calendars', requireWorkspaceMembership, async (c) => {
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

calendarRouter.put('/calendars/:id', validator('json', (value, c) => {
  const parsed = UpdateCalendarSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
  }
  return parsed.data;
}), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  try {
    const calendar = await calendarOps.updateCalendar(id, data);
    if (!calendar) {
      return c.json({ error: 'Calendar not found' }, 404);
    }
    return c.json(calendar);
  } catch (error) {
    console.error('Error updating calendar:', error);
    return c.json({ error: 'Failed to update calendar' }, 500);
  }
});

calendarRouter.delete('/calendars/:id', async (c) => {
  const id = c.req.param('id');
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

// Events
calendarRouter.post('/events', validator('json', (value, c) => {
  const parsed = CreateEventSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
  }
  return parsed.data;
}), async (c) => {
  const data = c.req.valid('json');
  try {
    const event = await calendarOps.createEvent({
      ...data,
      isAllDay: data.isAllDay || false,
      timezone: data.timezone || 'UTC',
      metadata: null,
      start: new Date(data.start),
      end: new Date(data.end),
    });
    return c.json(event, 201);
  } catch (error) {
    console.error('Error creating event:', error);
    return c.json({ error: 'Failed to create event' }, 500);
  }
});

calendarRouter.get('/events/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const event = await calendarOps.getEventWithAttendees(id);
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }
    return c.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return c.json({ error: 'Failed to fetch event' }, 500);
  }
});

calendarRouter.get('/calendars/:calendarId/events', async (c) => {
  const calendarId = c.req.param('calendarId');
  const start = c.req.query('start');
  const end = c.req.query('end');
  try {
    const startDate = start ? new Date(start) : undefined;
    const endDate = end ? new Date(end) : undefined;
    const events = await calendarOps.getEventsByCalendar(calendarId, startDate, endDate);
    return c.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return c.json({ error: 'Failed to fetch events' }, 500);
  }
});

calendarRouter.get('/workspaces/:workspaceId/events', requireWorkspaceMembership, async (c) => {
  const workspaceId = c.req.param('workspaceId');
  const start = c.req.query('start');
  const end = c.req.query('end');
  try {
    const startDate = start ? new Date(start) : undefined;
    const endDate = end ? new Date(end) : undefined;
    const events = await calendarOps.getEventsByWorkspace(workspaceId, startDate, endDate);
    return c.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return c.json({ error: 'Failed to fetch events' }, 500);
  }
});

calendarRouter.put('/events/:id', validator('json', (value, c) => {
  const parsed = UpdateEventSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
  }
  return parsed.data;
}), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  try {
    const updateData: Record<string, unknown> = { ...data };
    if (data.start) {
      updateData.start = new Date(data.start);
    }
    if (data.end) {
      updateData.end = new Date(data.end);
    }
    const event = await calendarOps.updateEvent(id, updateData);
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }
    return c.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    return c.json({ error: 'Failed to update event' }, 500);
  }
});

calendarRouter.delete('/events/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const event = await calendarOps.deleteEvent(id);
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return c.json({ error: 'Failed to delete event' }, 500);
  }
});

// Event Attendees
calendarRouter.post('/event-attendees', validator('json', (value, c) => {
  const parsed = CreateEventAttendeeSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
  }
  return parsed.data;
}), async (c) => {
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
});

calendarRouter.get('/events/:eventId/attendees', async (c) => {
  const eventId = c.req.param('eventId');
  try {
    const attendees = await calendarOps.getEventAttendees(eventId);
    return c.json({ attendees });
  } catch (error) {
    console.error('Error fetching event attendees:', error);
    return c.json({ error: 'Failed to fetch event attendees' }, 500);
  }
});

calendarRouter.put('/event-attendees/:id', async (c) => {
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

calendarRouter.delete('/event-attendees/:id', async (c) => {
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

// Task-Event Linking
calendarRouter.get('/tasks/:taskId/events', async (c) => {
  const taskId = c.req.param('taskId');
  try {
    const events = await calendarOps.getEventsByTask(taskId);
    return c.json({ events });
  } catch (error) {
    console.error('Error fetching events by task:', error);
    return c.json({ error: 'Failed to fetch events by task' }, 500);
  }
});

calendarRouter.post('/events/:eventId/link-task', async (c) => {
  const eventId = c.req.param('eventId');
  const taskId = c.req.query('taskId');
  try {
    if (!taskId) {
      return c.json({ error: 'taskId query parameter is required' }, 400);
    }
    const event = await calendarOps.linkEventToTask(eventId, taskId);
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }
    return c.json(event);
  } catch (error) {
    console.error('Error linking event to task:', error);
    return c.json({ error: 'Failed to link event to task' }, 500);
  }
});

calendarRouter.post('/events/:eventId/unlink-task', async (c) => {
  const eventId = c.req.param('eventId');
  try {
    const event = await calendarOps.unlinkEventFromTask(eventId);
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }
    return c.json(event);
  } catch (error) {
    console.error('Error unlinking event from task:', error);
    return c.json({ error: 'Failed to unlink event from task' }, 500);
  }
});

// Recurring Events
calendarRouter.get('/recurring/:recurrenceId/instances', async (c) => {
  const recurrenceId = c.req.param('recurrenceId');
  try {
    const instances = await calendarOps.getRecurringEventInstances(recurrenceId);
    return c.json({ instances });
  } catch (error) {
    console.error('Error fetching recurring event instances:', error);
    return c.json({ error: 'Failed to fetch recurring event instances' }, 500);
  }
});

calendarRouter.get('/recurring/:recurrenceId/base', async (c) => {
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

export default calendarRouter;
