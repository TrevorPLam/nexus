import * as schema from '@life-os/database';
import { calendars, events, eventAttendees, schedulingLinks } from '@life-os/database';
import { eq, and, desc, asc, gte, lte, or, isNull, gt } from 'drizzle-orm';

import { db } from './db.js';

// Calendar Operations
export async function createCalendar(data: typeof schema.calendars.$inferInsert) {
  const [calendar] = await db.insert(calendars).values(data).returning();
  return calendar;
}

export async function getCalendarById(id: string) {
  const [calendar] = await db.select().from(calendars).where(eq(calendars.id, id));
  return calendar;
}

export async function getCalendarsByWorkspace(workspaceId: string, limit = 50, cursor?: string) {
  const conditions = [eq(calendars.workspaceId, workspaceId)];

  if (cursor) {
    conditions.push(gt(calendars.createdAt, new Date(cursor)));
  }

  const results = await db
    .select()
    .from(calendars)
    .where(and(...conditions))
    .orderBy(desc(calendars.isDefault), asc(calendars.name), asc(calendars.createdAt))
    .limit(limit + 1);

  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, -1) : results;
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

export async function updateCalendar(
  id: string,
  data: Partial<typeof schema.calendars.$inferInsert>,
) {
  const [calendar] = await db
    .update(calendars)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(calendars.id, id))
    .returning();
  return calendar;
}

export async function deleteCalendar(id: string) {
  const [calendar] = await db.delete(calendars).where(eq(calendars.id, id)).returning();
  return calendar;
}

// Event Operations
export async function createEvent(data: typeof schema.events.$inferInsert) {
  const [event] = await db.insert(events).values(data).returning();
  return event;
}

export async function getEventById(id: string) {
  const [event] = await db.select().from(events).where(eq(events.id, id));
  return event;
}

export async function getEventsByCalendar(calendarId: string, startDate?: Date, endDate?: Date) {
  const conditions = [eq(events.calendarId, calendarId)];

  if (startDate && endDate) {
    conditions.push(
      or(
        and(gte(events.start, startDate), lte(events.start, endDate)),
        and(gte(events.end, startDate), lte(events.end, endDate)),
        and(lte(events.start, startDate), gte(events.end, endDate)),
      ),
    );
  }

  return db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(asc(events.start));
}

export async function getEventsByWorkspace(workspaceId: string, startDate?: Date, endDate?: Date) {
  const conditions = [eq(events.workspaceId, workspaceId)];

  if (startDate && endDate) {
    conditions.push(
      or(
        and(gte(events.start, startDate), lte(events.start, endDate)),
        and(gte(events.end, startDate), lte(events.end, endDate)),
        and(lte(events.start, startDate), gte(events.end, endDate)),
      ),
    );
  }

  return db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(asc(events.start));
}

export async function updateEvent(id: string, data: Partial<typeof schema.events.$inferInsert>) {
  const [event] = await db
    .update(events)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(events.id, id))
    .returning();
  return event;
}

export async function deleteEvent(id: string) {
  const [event] = await db.delete(events).where(eq(events.id, id)).returning();
  return event;
}

// Event Attendee Operations
export async function createEventAttendee(data: typeof schema.eventAttendees.$inferInsert) {
  const [attendee] = await db.insert(eventAttendees).values(data).returning();
  return attendee;
}

export async function getEventAttendees(eventId: string) {
  return db.select().from(eventAttendees).where(eq(eventAttendees.eventId, eventId));
}

export async function updateEventAttendee(
  id: string,
  data: Partial<typeof schema.eventAttendees.$inferInsert>,
) {
  const [attendee] = await db
    .update(eventAttendees)
    .set(data)
    .where(eq(eventAttendees.id, id))
    .returning();
  return attendee;
}

export async function deleteEventAttendee(id: string) {
  const [attendee] = await db.delete(eventAttendees).where(eq(eventAttendees.id, id)).returning();
  return attendee;
}

// Batch operations
export async function getCalendarsWithEvents(
  workspaceId: string,
  startDate?: Date,
  endDate?: Date,
  limit = 50,
  cursor?: string,
) {
  const result = await getCalendarsByWorkspace(workspaceId, limit, cursor);

  const calendarsWithEvents = await Promise.all(
    result.items.map(async (calendar) => {
      const eventList = await getEventsByCalendar(calendar.id, startDate, endDate);
      return {
        ...calendar,
        events: eventList,
      };
    }),
  );

  return {
    items: calendarsWithEvents,
    nextCursor: result.nextCursor,
    hasMore: result.hasMore,
  };
}

export async function getEventWithAttendees(eventId: string) {
  const event = await getEventById(eventId);
  if (!event) return null;

  const attendees = await getEventAttendees(eventId);

  return {
    ...event,
    attendees,
  };
}

// Task-Event Linking Operations
export async function getEventsByTask(taskId: string) {
  return db.select().from(events).where(eq(events.taskId, taskId)).orderBy(asc(events.start));
}

export async function linkEventToTask(eventId: string, taskId: string) {
  const [event] = await db
    .update(events)
    .set({ taskId, updatedAt: new Date() })
    .where(eq(events.id, eventId))
    .returning();
  return event;
}

export async function unlinkEventFromTask(eventId: string) {
  const [event] = await db
    .update(events)
    .set({ taskId: null, updatedAt: new Date() })
    .where(eq(events.id, eventId))
    .returning();
  return event;
}

// Recurring Event Operations
export async function getRecurringEventInstances(recurrenceId: string) {
  return db
    .select()
    .from(events)
    .where(eq(events.recurrenceId, recurrenceId))
    .orderBy(asc(events.start));
}

export async function getBaseRecurringEvent(recurrenceId: string) {
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.recurrenceId, recurrenceId), isNull(events.recurrenceId)));
  return event;
}

// Scheduling Link Operations
export async function createSchedulingLink(data: typeof schema.schedulingLinks.$inferInsert) {
  const [link] = await db.insert(schedulingLinks).values(data).returning();
  return link;
}

export async function getSchedulingLinkById(id: string) {
  const [link] = await db.select().from(schedulingLinks).where(eq(schedulingLinks.id, id));
  return link;
}

export async function getSchedulingLinkBySlug(slug: string) {
  const [link] = await db.select().from(schedulingLinks).where(eq(schedulingLinks.slug, slug));
  return link;
}

export async function getSchedulingLinksByWorkspace(
  workspaceId: string,
  limit = 50,
  cursor?: string,
) {
  const conditions = [eq(schedulingLinks.workspaceId, workspaceId)];

  if (cursor) {
    conditions.push(gt(schedulingLinks.createdAt, new Date(cursor)));
  }

  const results = await db
    .select()
    .from(schedulingLinks)
    .where(and(...conditions))
    .orderBy(desc(schedulingLinks.createdAt))
    .limit(limit + 1);

  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, -1) : results;
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

export async function getSchedulingLinksByUser(userId: string, limit = 50, cursor?: string) {
  const conditions = [eq(schedulingLinks.userId, userId)];

  if (cursor) {
    conditions.push(gt(schedulingLinks.createdAt, new Date(cursor)));
  }

  const results = await db
    .select()
    .from(schedulingLinks)
    .where(and(...conditions))
    .orderBy(desc(schedulingLinks.createdAt))
    .limit(limit + 1);

  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, -1) : results;
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

export async function updateSchedulingLink(
  id: string,
  data: Partial<typeof schema.schedulingLinks.$inferInsert>,
) {
  const [link] = await db
    .update(schedulingLinks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schedulingLinks.id, id))
    .returning();
  return link;
}

export async function deleteSchedulingLink(id: string) {
  const [link] = await db.delete(schedulingLinks).where(eq(schedulingLinks.id, id)).returning();
  return link;
}
