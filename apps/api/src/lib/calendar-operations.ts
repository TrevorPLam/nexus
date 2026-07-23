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
  // The base event is the one that has this recurrenceId as its own id (not as recurrenceId)
  // Instances have recurrenceId pointing to the base event's id
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, recurrenceId), isNull(events.recurrenceId)));
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

// Availability Slot Generation
export interface AvailableSlot {
  start: Date;
  end: Date;
}

export async function getAvailableSlots(
  calendarId: string,
  startDate: Date,
  endDate: Date,
  duration: number, // in minutes
  availabilityStart?: string, // HH:MM format
  availabilityEnd?: string, // HH:MM format
  availableDays?: number[], // Array of available days (0-6, Sunday=0)
  bufferBefore?: number, // Buffer time before event in minutes
  bufferAfter?: number, // Buffer time after event in minutes
): Promise<AvailableSlot[]> {
  const slots: AvailableSlot[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  // Parse availability times
  const availStart = availabilityStart ? parseTime(availabilityStart) : { hour: 9, minute: 0 };
  const availEnd = availabilityEnd ? parseTime(availabilityEnd) : { hour: 17, minute: 0 };
  const daysOfWeek = availableDays || [0, 1, 2, 3, 4, 5, 6]; // Default to all days

  // Get existing events for the calendar
  const existingEvents = await getEventsByCalendar(calendarId, startDate, endDate);

  // Iterate through each day in the range
  while (current < end) {
    const dayOfWeek = current.getDay(); // 0-6, Sunday=0

    // Skip if day is not available
    if (!daysOfWeek.includes(dayOfWeek)) {
      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
      continue;
    }

    // Set the start time for this day
    const dayStart = new Date(current);
    dayStart.setHours(availStart.hour, availStart.minute, 0, 0);

    // Set the end time for this day
    const dayEnd = new Date(current);
    dayEnd.setHours(availEnd.hour, availEnd.minute, 0, 0);

    // Generate slots for this day
    let slotStart = new Date(dayStart);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotStart.getMinutes() + duration + (bufferAfter || 0));

    while (slotStart.getTime() + duration * 60000 <= dayEnd.getTime()) {
      // Add buffer before to the actual slot start
      const actualSlotStart = new Date(slotStart);
      actualSlotStart.setMinutes(actualSlotStart.getMinutes() + (bufferBefore || 0));

      const actualSlotEnd = new Date(actualSlotStart);
      actualSlotEnd.setMinutes(actualSlotStart.getMinutes() + duration);

      // Check if this slot conflicts with existing events
      const hasConflict = existingEvents.some((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return (
          (actualSlotStart < eventEnd && actualSlotEnd > eventStart) ||
          (actualSlotStart < eventEnd && actualSlotEnd > eventStart)
        );
      });

      if (!hasConflict) {
        slots.push({
          start: actualSlotStart,
          end: actualSlotEnd,
        });
      }

      // Move to next slot
      slotStart.setMinutes(slotStart.getMinutes() + duration + (bufferAfter || 0));
    }

    // Move to next day
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }

  return slots;
}

function parseTime(timeStr: string): { hour: number; minute: number } {
  const [hour, minute] = timeStr.split(':').map(Number);
  return { hour, minute };
}

// Booking with conflict detection
export async function bookSlot(
  calendarId: string,
  start: Date,
  end: Date,
  eventData: typeof schema.events.$inferInsert,
): Promise<typeof schema.events.$inferSelect> {
  // Check for conflicts
  const existingEvents = await getEventsByCalendar(
    calendarId,
    new Date(start.getTime() - 86400000), // Check one day before
    new Date(end.getTime() + 86400000), // Check one day after
  );

  const hasConflict = existingEvents.some((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return start < eventEnd && end > eventStart;
  });

  if (hasConflict) {
    throw new Error('Slot is no longer available');
  }

  return createEvent(eventData);
}
