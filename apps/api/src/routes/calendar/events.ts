/**
 * MODULE: Event Endpoints
 *
 * Responsibility:
 * Implementation of API endpoints for calendar event management, including creation,
 * retrieval, updates, deletion, and task-event linking.
 *
 * Boundaries:
 * - Handles HTTP request/response cycle and input validation for events and attendees.
 * - Delegates business logic and persistence to lib/calendar-operations.js.
 * - Authorization is enforced via middleware (requireWorkspaceAccess, requireEntityAccess).
 *
 * Critical invariants:
 * - Preconditions:
 *   - All requests require valid authentication (authMiddleware)
 *   - Create/update operations require workspace access (requireWorkspaceAccess)
 *   - Delete operations require workspace membership (requireWorkspaceMembership)
 *   - Get by ID operations require entity access (requireEntityAccess)
 *   - Input data must pass Zod validation from @life-os/contracts
 *   - Task-event linking requires valid eventId and taskId in same workspace
 * - Postconditions:
 *   - All responses are validated against Zod schemas
 *   - Workspace isolation is enforced by middleware
 *   - Event start/end dates are validated by Zod refinement
 *   - Successful operations return 200-201 status codes
 *   - Failed operations return appropriate 4xx/5xx status codes
 *   - Test coverage: See apps/api/src/routes/calendar/events.test.ts (EXISTS)
 *
 * Side effects:
 * - Database writes via calendar-operations.js.
 *
 * Change risk:
 * - High. Core application functionality for scheduling and task integration.
 *
 * Links:
 * - apps/api/src/lib/calendar-operations.ts
 * - packages/contracts/src/calendar.ts
 * - apps/api/src/routes/calendar/attendees.ts
 *
 * Tags:
 * - domain: calendar
 * - risk: high
 * - layer: api
 * - stability: stable
 * - concerns: events, crud, task-linking
 *
 * File:
 * - apps/api/src/routes/calendar/events.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { CreateEventRequest, UpdateEventRequest, EventResponse } from '@life-os/contracts';
import { z } from 'zod';

import * as calendarOps from '../../lib/calendar-operations.js';
import {
  authMiddleware,
  requireWorkspaceMembership,
  requireEntityAccess,
  requireWorkspaceAccess,
} from '../../lib/middleware.js';

const eventsRouter = new OpenAPIHono();

const createEventRoute = createRoute({
  method: 'post',
  path: '/events',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateEventRequest,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: EventResponse,
        },
      },
      description: 'Event created successfully',
    },
    400: {
      description: 'Invalid request data',
    },
    500: {
      description: 'Failed to create event',
    },
  },
  tags: ['events'],
});

const getEventRoute = createRoute({
  method: 'get',
  path: '/events/{id}',
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: EventResponse,
        },
      },
      description: 'Event retrieved successfully',
    },
    404: {
      description: 'Event not found',
    },
    500: {
      description: 'Failed to fetch event',
    },
  },
  tags: ['events'],
});

// Apply authentication middleware to all routes
eventsRouter.use('*', authMiddleware);

eventsRouter.openapi(createEventRoute, requireWorkspaceAccess, async (c) => {
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

eventsRouter.openapi(getEventRoute, requireEntityAccess('events'), async (c) => {
  const { id } = c.req.valid('param');
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

eventsRouter.get('/calendars/:calendarId/events', requireWorkspaceMembership, async (c) => {
  const calendarId = c.req.param('calendarId');
  if (!calendarId) {
    return c.json({ error: 'Calendar ID required' }, 400);
  }
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

eventsRouter.get('/workspaces/:workspaceId/events', requireWorkspaceMembership, async (c) => {
  const workspaceId = c.req.param('workspaceId');
  if (!workspaceId) {
    return c.json({ error: 'Workspace ID required' }, 400);
  }
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

eventsRouter.put(
  '/events/:id',
  requireEntityAccess('events'),
  validator('json', (value, c) => {
    const parsed = UpdateEventRequest.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
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
  },
);

eventsRouter.delete('/events/:id', requireWorkspaceMembership, async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Event ID required' }, 400);
  }
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

// Task-Event Linking
eventsRouter.get('/tasks/:taskId/events', requireWorkspaceMembership, async (c) => {
  const taskId = c.req.param('taskId');
  if (!taskId) {
    return c.json({ error: 'Task ID required' }, 400);
  }
  try {
    const events = await calendarOps.getEventsByTask(taskId);
    return c.json({ events });
  } catch (error) {
    console.error('Error fetching events by task:', error);
    return c.json({ error: 'Failed to fetch events by task' }, 500);
  }
});

eventsRouter.post('/events/:eventId/link-task', requireWorkspaceMembership, async (c) => {
  const eventId = c.req.param('eventId');
  if (!eventId) {
    return c.json({ error: 'Event ID required' }, 400);
  }
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

eventsRouter.post('/events/:eventId/unlink-task', requireWorkspaceMembership, async (c) => {
  const eventId = c.req.param('eventId');
  if (!eventId) {
    return c.json({ error: 'Event ID required' }, 400);
  }
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

export default eventsRouter;
