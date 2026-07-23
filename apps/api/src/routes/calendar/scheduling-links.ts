import {
  CreateSchedulingLinkRequest,
  UpdateSchedulingLinkRequest,
  AvailabilityQueryRequest,
  BookingRequest,
} from '@life-os/contracts';
import { Hono } from 'hono';
import { validator } from 'hono/validator';

import * as calendarOps from '../../lib/calendar-operations.js';
import { authMiddleware, requireWorkspaceMembership, requireEntityAccess, requireWorkspaceAccess } from '../../lib/middleware.js';
import { appUsers } from '@life-os/database';
import { eq } from 'drizzle-orm';
import { db } from '../../lib/db.js';

const schedulingLinksRouter = new Hono();

// Apply authentication middleware to all routes
schedulingLinksRouter.use('*', authMiddleware);

schedulingLinksRouter.post(
  '/scheduling-links',
  requireWorkspaceAccess,
  validator('json', (value, c) => {
    const parsed = CreateSchedulingLinkRequest.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user') as any;
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      // Get the app_user record for the authenticated user
      const [appUser] = await db.select().from(appUsers).where(eq(appUsers.supabaseUserId, user.id));

      if (!appUser) {
        return c.json({ error: 'User not found' }, 404);
      }

      const schedulingLink = await calendarOps.createSchedulingLink({
        ...data,
        userId: appUser.id,
        metadata: null,
      });
      return c.json(schedulingLink, 201);
    } catch (error) {
      console.error('Error creating scheduling link:', error);
      return c.json({ error: 'Failed to create scheduling link' }, 500);
    }
  },
);

schedulingLinksRouter.get('/scheduling-links/:id', requireEntityAccess('schedulingLinks'), async (c) => {
  const id = c.req.param('id');
  try {
    const schedulingLink = await calendarOps.getSchedulingLinkById(id);
    if (!schedulingLink) {
      return c.json({ error: 'Scheduling link not found' }, 404);
    }
    return c.json(schedulingLink);
  } catch (error) {
    console.error('Error fetching scheduling link:', error);
    return c.json({ error: 'Failed to fetch scheduling link' }, 500);
  }
});

schedulingLinksRouter.get('/scheduling-links/slug/:slug', async (c) => {
  const slug = c.req.param('slug');
  try {
    const schedulingLink = await calendarOps.getSchedulingLinkBySlug(slug);
    if (!schedulingLink) {
      return c.json({ error: 'Scheduling link not found' }, 404);
    }
    return c.json(schedulingLink);
  } catch (error) {
    console.error('Error fetching scheduling link by slug:', error);
    return c.json({ error: 'Failed to fetch scheduling link' }, 500);
  }
});

schedulingLinksRouter.get('/workspaces/:workspaceId/scheduling-links', requireWorkspaceMembership, async (c) => {
  const workspaceId = c.req.param('workspaceId');
  if (!workspaceId) {
    return c.json({ error: 'Workspace ID required' }, 400);
  }
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const cursor = c.req.query('cursor');

  try {
    const result = await calendarOps.getSchedulingLinksByWorkspace(workspaceId, limit, cursor);
    return c.json(result);
  } catch (error) {
    console.error('Error fetching scheduling links:', error);
    return c.json({ error: 'Failed to fetch scheduling links' }, 500);
  }
});

schedulingLinksRouter.get('/users/:userId/scheduling-links', async (c) => {
  const userId = c.req.param('userId');
  if (!userId) {
    return c.json({ error: 'User ID required' }, 400);
  }
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const cursor = c.req.query('cursor');

  try {
    const result = await calendarOps.getSchedulingLinksByUser(userId, limit, cursor);
    return c.json(result);
  } catch (error) {
    console.error('Error fetching scheduling links by user:', error);
    return c.json({ error: 'Failed to fetch scheduling links' }, 500);
  }
});

schedulingLinksRouter.put(
  '/scheduling-links/:id',
  requireEntityAccess('schedulingLinks'),
  validator('json', (value, c) => {
    const parsed = UpdateSchedulingLinkRequest.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const id = c.req.param('id');
    const data = c.req.valid('json');
    try {
      const schedulingLink = await calendarOps.updateSchedulingLink(id, data);
      if (!schedulingLink) {
        return c.json({ error: 'Scheduling link not found' }, 404);
      }
      return c.json(schedulingLink);
    } catch (error) {
      console.error('Error updating scheduling link:', error);
      return c.json({ error: 'Failed to update scheduling link' }, 500);
    }
  },
);

schedulingLinksRouter.delete('/scheduling-links/:id', requireEntityAccess('schedulingLinks'), async (c) => {
  const id = c.req.param('id');
  try {
    const schedulingLink = await calendarOps.deleteSchedulingLink(id);
    if (!schedulingLink) {
      return c.json({ error: 'Scheduling link not found' }, 404);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting scheduling link:', error);
    return c.json({ error: 'Failed to delete scheduling link' }, 500);
  }
});

// Public availability query endpoint (no auth required for public scheduling links)
schedulingLinksRouter.post(
  '/scheduling-links/availability',
  validator('json', (value, c) => {
    const parsed = AvailabilityQueryRequest.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const data = c.req.valid('json');
    try {
      // Get the scheduling link
      const schedulingLink = await calendarOps.getSchedulingLinkById(data.schedulingLinkId);
      if (!schedulingLink) {
        return c.json({ error: 'Scheduling link not found' }, 404);
      }

      if (!schedulingLink.isActive) {
        return c.json({ error: 'Scheduling link is not active' }, 400);
      }

      // Check booking notice constraints
      const now = new Date();
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      // Min booking notice (in hours)
      if (schedulingLink.minBookingNotice > 0) {
        const minDate = new Date(now.getTime() + schedulingLink.minBookingNotice * 60 * 60 * 1000);
        if (startDate < minDate) {
          return c.json({ error: 'Booking must be made with sufficient notice' }, 400);
        }
      }

      // Max booking notice (in days)
      if (schedulingLink.maxBookingNotice > 0) {
        const maxDate = new Date(now.getTime() + schedulingLink.maxBookingNotice * 24 * 60 * 60 * 1000);
        if (startDate > maxDate) {
          return c.json({ error: 'Booking date is too far in the future' }, 400);
        }
      }

      // Get available slots
      const slots = await calendarOps.getAvailableSlots(
        schedulingLink.calendarId,
        startDate,
        endDate,
        schedulingLink.eventDuration,
        schedulingLink.availabilityStart || undefined,
        schedulingLink.availabilityEnd || undefined,
        schedulingLink.availableDays as number[] || undefined,
        schedulingLink.bufferBefore || undefined,
        schedulingLink.bufferAfter || undefined,
      );

      return c.json({ slots });
    } catch (error) {
      console.error('Error fetching availability:', error);
      return c.json({ error: 'Failed to fetch availability' }, 500);
    }
  },
);

// Public booking endpoint (no auth required for public scheduling links)
schedulingLinksRouter.post(
  '/scheduling-links/book',
  validator('json', (value, c) => {
    const parsed = BookingRequest.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const data = c.req.valid('json');
    try {
      // Get the scheduling link
      const schedulingLink = await calendarOps.getSchedulingLinkById(data.schedulingLinkId);
      if (!schedulingLink) {
        return c.json({ error: 'Scheduling link not found' }, 404);
      }

      if (!schedulingLink.isActive) {
        return c.json({ error: 'Scheduling link is not active' }, 400);
      }

      // Validate booking time matches scheduling link duration
      const start = new Date(data.start);
      const end = new Date(data.end);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60);

      if (duration !== schedulingLink.eventDuration) {
        return c.json({ error: 'Booking duration does not match scheduling link' }, 400);
      }

      // Create the event
      const event = await calendarOps.bookSlot(schedulingLink.calendarId, start, end, {
        workspaceId: schedulingLink.workspaceId,
        calendarId: schedulingLink.calendarId,
        title: data.title,
        description: data.description || null,
        location: data.location || null,
        isAllDay: false,
        start,
        end,
        timezone: 'UTC',
        metadata: null,
      });

      // Create the attendee
      const attendee = await calendarOps.createEventAttendee({
        eventId: event.id,
        email: data.attendeeEmail,
        name: data.attendeeName || null,
        status: 'accepted',
        isOrganizer: false,
      });

      return c.json({ event, attendee }, 201);
    } catch (error) {
      console.error('Error booking slot:', error);
      if (error instanceof Error && error.message === 'Slot is no longer available') {
        return c.json({ error: 'Slot is no longer available' }, 409);
      }
      return c.json({ error: 'Failed to book slot' }, 500);
    }
  },
);

export default schedulingLinksRouter;
