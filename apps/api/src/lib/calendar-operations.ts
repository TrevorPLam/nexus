import * as schema from '@life-os/database';
import { calendars, events, eventAttendees, schedulingLinks } from '@life-os/database';
import { eq, and, desc, asc, gte, lte, or, isNull, gt, sql } from 'drizzle-orm';

import { db } from './db.js';
import { executeCommandWithoutIdempotency, type CommandContext } from './command-context.js';

// Calendar Operations
export async function createCalendar(
  data: typeof schema.calendars.$inferInsert,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [calendar] = await tx.insert(calendars).values(data).returning();
      return calendar;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'calendar',
          entityId: data.id || 'pending',
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'calendar.created',
      aggregateType: 'calendar',
      aggregateId: data.id || 'pending',
      payload: { calendar: data },
    },
  );
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
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [calendar] = await tx
        .update(calendars)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(calendars.id, id))
        .returning();
      return calendar;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'calendar',
          entityId: id,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'calendar.updated',
      aggregateType: 'calendar',
      aggregateId: id,
      payload: { calendar: data },
    },
  );
}

export async function deleteCalendar(id: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [calendar] = await tx.delete(calendars).where(eq(calendars.id, id)).returning();
      return calendar;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'delete',
          entityType: 'calendar',
          entityId: id,
          changes: {},
        }
      : undefined,
    {
      eventType: 'calendar.deleted',
      aggregateType: 'calendar',
      aggregateId: id,
      payload: { calendarId: id },
    },
  );
}

// Event Operations
export async function createEvent(
  data: typeof schema.events.$inferInsert,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [event] = await tx.insert(events).values(data).returning();
      return event;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'event',
          entityId: data.id || 'pending',
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'event.created',
      aggregateType: 'event',
      aggregateId: data.id || 'pending',
      payload: { event: data },
    },
  );
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

export async function updateEvent(
  id: string,
  data: Partial<typeof schema.events.$inferInsert>,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [event] = await tx
        .update(events)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(events.id, id))
        .returning();
      return event;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'event',
          entityId: id,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'event.updated',
      aggregateType: 'event',
      aggregateId: id,
      payload: { event: data },
    },
  );
}

export async function deleteEvent(id: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [event] = await tx.delete(events).where(eq(events.id, id)).returning();
      return event;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'delete',
          entityType: 'event',
          entityId: id,
          changes: {},
        }
      : undefined,
    {
      eventType: 'event.deleted',
      aggregateType: 'event',
      aggregateId: id,
      payload: { eventId: id },
    },
  );
}

// Event Attendee Operations
export async function createEventAttendee(
  data: typeof schema.eventAttendees.$inferInsert,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [attendee] = await tx.insert(eventAttendees).values(data).returning();
      return attendee;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'event_attendee',
          entityId: data.eventId,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'event_attendee.created',
      aggregateType: 'event',
      aggregateId: data.eventId,
      payload: { attendee: data },
    },
  );
}

export async function getEventAttendees(eventId: string) {
  return db.select().from(eventAttendees).where(eq(eventAttendees.eventId, eventId));
}

export async function updateEventAttendee(
  id: string,
  data: Partial<typeof schema.eventAttendees.$inferInsert>,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [attendee] = await tx
        .update(eventAttendees)
        .set(data)
        .where(eq(eventAttendees.id, id))
        .returning();
      return attendee;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'event_attendee',
          entityId: id,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'event_attendee.updated',
      aggregateType: 'event',
      aggregateId: id,
      payload: { attendee: data },
    },
  );
}

export async function deleteEventAttendee(id: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [attendee] = await tx
        .delete(eventAttendees)
        .where(eq(eventAttendees.id, id))
        .returning();
      return attendee;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'delete',
          entityType: 'event_attendee',
          entityId: id,
          changes: {},
        }
      : undefined,
    {
      eventType: 'event_attendee.deleted',
      aggregateType: 'event',
      aggregateId: id,
      payload: { attendeeId: id },
    },
  );
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

export async function linkEventToTask(eventId: string, taskId: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [event] = await tx
        .update(events)
        .set({ taskId, updatedAt: new Date() })
        .where(eq(events.id, eventId))
        .returning();
      return event;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'event_task_link',
          entityId: eventId,
          changes: { new: { taskId } },
        }
      : undefined,
    {
      eventType: 'event_task.linked',
      aggregateType: 'event',
      aggregateId: eventId,
      payload: { eventId, taskId },
    },
  );
}

export async function unlinkEventFromTask(eventId: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [event] = await tx
        .update(events)
        .set({ taskId: null, updatedAt: new Date() })
        .where(eq(events.id, eventId))
        .returning();
      return event;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'event_task_link',
          entityId: eventId,
          changes: { new: { taskId: null } },
        }
      : undefined,
    {
      eventType: 'event_task.unlinked',
      aggregateType: 'event',
      aggregateId: eventId,
      payload: { eventId },
    },
  );
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
export async function createSchedulingLink(
  data: typeof schema.schedulingLinks.$inferInsert,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [link] = await tx.insert(schedulingLinks).values(data).returning();
      return link;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'scheduling_link',
          entityId: data.id || 'pending',
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'scheduling_link.created',
      aggregateType: 'scheduling_link',
      aggregateId: data.id || 'pending',
      payload: { link: data },
    },
  );
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
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [link] = await tx
        .update(schedulingLinks)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schedulingLinks.id, id))
        .returning();
      return link;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'scheduling_link',
          entityId: id,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'scheduling_link.updated',
      aggregateType: 'scheduling_link',
      aggregateId: id,
      payload: { link: data },
    },
  );
}

export async function deleteSchedulingLink(id: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [link] = await tx.delete(schedulingLinks).where(eq(schedulingLinks.id, id)).returning();
      return link;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'delete',
          entityType: 'scheduling_link',
          entityId: id,
          changes: {},
        }
      : undefined,
    {
      eventType: 'scheduling_link.deleted',
      aggregateType: 'scheduling_link',
      aggregateId: id,
      payload: { linkId: id },
    },
  );
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
      // Overlap predicate: slotStart < eventEnd && slotEnd > eventStart
      const hasConflict = existingEvents.some((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return actualSlotStart < eventEnd && actualSlotEnd > eventStart;
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
  return { hour: hour || 0, minute: minute || 0 };
}

// Booking with conflict detection and atomic event+attendee creation
export async function bookSlotAtomic(
  calendarId: string,
  start: Date,
  end: Date,
  eventData: typeof schema.events.$inferInsert,
  attendeeData: Omit<typeof schema.eventAttendees.$inferInsert, 'eventId' | 'status'>,
  requiresApproval = false,
  context?: CommandContext,
): Promise<{
  event: typeof schema.events.$inferSelect;
  attendee: typeof schema.eventAttendees.$inferSelect;
}> {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      // Lock overlapping events with SELECT FOR UPDATE to prevent concurrent bookings
      const overlappingEvents = await tx
        .select()
        .from(events)
        .where(
          and(
            eq(events.calendarId, calendarId),
            sql`${events.start} < ${end} AND ${events.end} > ${start}`,
          ),
        )
        .for('update');

      // Check for conflicts
      const hasConflict = overlappingEvents.some((event: typeof schema.events.$inferSelect) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return start < eventEnd && end > eventStart;
      });

      if (hasConflict) {
        throw new Error('Slot is no longer available');
      }

      // Create the event
      const [event] = await tx.insert(events).values(eventData).returning();

      // Create the attendee with appropriate status
      const [attendee] = await tx
        .insert(eventAttendees)
        .values({
          ...attendeeData,
          eventId: event.id,
          status: requiresApproval ? 'pending' : 'accepted',
        })
        .returning();

      return { event, attendee };
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'booking',
          entityId: eventData.id || 'pending',
          changes: { new: { event: eventData, attendee: attendeeData } },
        }
      : undefined,
    {
      eventType: 'booking.created',
      aggregateType: 'event',
      aggregateId: eventData.id || 'pending',
      payload: { event: eventData, attendee: attendeeData, requiresApproval },
    },
  );
}

// Legacy booking function for backward compatibility
export async function bookSlot(
  calendarId: string,
  start: Date,
  end: Date,
  eventData: typeof schema.events.$inferInsert,
  requiresApproval = false,
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
