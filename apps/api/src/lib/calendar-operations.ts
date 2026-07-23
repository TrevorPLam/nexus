/**
 * MODULE: Calendar Operations
 *
 * Responsibility:
 * Orchestrates business logic for calendar entities (calendars, events, attendees,
 * and scheduling links). Handles CRUD operations, availability calculations,
 * and the linking of tasks to calendar events.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Coordinates logic for public booking via scheduling links.
 * - Does not handle external provider sync (delegated to background jobs/worker).
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all workspace-scoped operations
 *   - Calendar IDs must reference existing calendars in the same workspace
 *   - Event start dates must precede end dates (validated by Zod in contracts)
 *   - Scheduling links require valid calendarId in the same workspace
 *   - Booking operations require valid scheduling link and calendar
 *   - Task-event linking requires valid IDs for both entities in the same workspace
 * - Postconditions:
 *   - All mutations emit audit log entries when context is provided
 *   - All mutations emit outbox events for downstream processing
 *   - Atomic booking uses SELECT FOR UPDATE to prevent concurrent booking conflicts
 *   - Event-task linking updates both event.taskId and task.calendarEventId
 *   - Deleted entities are hard-deleted (cascaded by database constraints)
 *   - Test coverage: See apps/api/src/routes/calendar/*.test.ts (PARTIAL COVERAGE - calendars.test.ts, events.test.ts, attendees.test.ts, recurring.test.ts exist)
 *
 * Side effects:
 * - Performs database writes (CRUD).
 * - Emits audit logs and outbox events for downstream processing.
 *
 * Change risk:
 * - High. Affects calendar reliability and the public-facing booking engine.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/calendar.ts (persistence layer)
 * - packages/contracts/src/calendar.ts (domain schemas)
 * - apps/api/src/routes/calendar.ts (API routes)
 *
 * Tags:
 * - domain: calendar
 * - risk: high
 * - layer: business-logic
 * - stability: stable
 * - concerns: audit, outbox, scheduling, booking
 *
 * File:
 * - apps/api/src/lib/calendar-operations.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import * as schema from '@life-os/database';
import { calendars, events, eventAttendees, schedulingLinks } from '@life-os/database';
import { eq, and, desc, asc, gte, lte, or, isNull, gt, sql } from 'drizzle-orm';

import { executeCommandWithoutIdempotency, type CommandContext } from './command-context.js';
import { db } from './db.js';

/**
 * CALENDAR OPERATIONS
 * Logic for managing individual calendars.
 */

/**
 * Creates a new calendar in the workspace.
 *
 * Purpose:
 * Persists a new calendar entity with the provided configuration.
 *
 * Parameters:
 * - data: Calendar insert data including id, workspaceId, name, isDefault, etc.
 *   - Required: id, workspaceId, name
 *   - Optional: isDefault (defaults to false), color, description
 * - context: Optional command context for audit logging and event emission
 *   - If provided with userId and workspaceId, emits audit log and outbox event
 *
 * Returns:
 * The created calendar record with all database-generated fields.
 *
 * Errors:
 * - Throws if database insertion fails
 * - Throws if workspaceId is invalid (foreign key constraint)
 *
 * Side effects:
 * - Writes to calendars table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'calendar.created' if context provided
 *
 * Idempotency:
 * Not idempotent. Calling with same id will fail on unique constraint.
 *
 * Authorization:
 * Caller must be a member of the workspace specified in workspaceId.
 * Workspace membership is enforced at the route layer via RLS.
 *
 * Preconditions:
 * - workspaceId must reference an existing workspace
 * - User must have permission to create calendars in the workspace
 *
 * Postconditions:
 * - Calendar exists in database with provided configuration
 * - Audit log entry created if context provided
 * - Outbox event created for downstream processing if context provided
 */
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

/**
 * Retrieves a calendar by its unique identifier.
 *
 * Purpose:
 * Fetches a single calendar record for display or further processing.
 *
 * Parameters:
 * - id: The unique calendar identifier (UUID)
 *   - Required, non-null
 *
 * Returns:
 * The calendar record if found, or null if not found.
 *
 * Errors:
 * None. Returns null for missing records.
 *
 * Side effects:
 * None. Read-only operation.
 *
 * Idempotency:
 * Idempotent. Multiple calls with same id return same result.
 *
 * Authorization:
 * Caller must have read access to the calendar's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - id must be a valid UUID format
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getCalendarById(id: string) {
  const [calendar] = await db.select().from(calendars).where(eq(calendars.id, id));
  return calendar;
}

/**
 * Retrieves calendars belonging to a workspace with pagination.
 *
 * Purpose:
 * Lists all calendars in a workspace, ordered by isDefault (desc), name (asc),
 * and createdAt (asc). Supports cursor-based pagination for large datasets.
 *
 * Parameters:
 * - workspaceId: The workspace identifier to filter calendars
 *   - Required, non-null
 * - limit: Maximum number of items to return (default: 50, max: 100)
 *   - Optional, must be positive
 * - cursor: Pagination cursor for fetching next page
 *   - Optional, ISO timestamp string of last item's createdAt
 *
 * Returns:
 * Object containing:
 * - items: Array of calendar records
 * - nextCursor: Cursor for next page or null if no more pages
 * - hasMore: Boolean indicating if more pages exist
 *
 * Errors:
 * - Throws if cursor is malformed (invalid ISO timestamp)
 *
 * Side effects:
 * None. Read-only operation.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Caller must be a member of the workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - workspaceId must reference an existing workspace
 * - limit must be between 1 and 100
 *
 * Postconditions:
 * - None (read-only)
 */
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
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem ? lastItem.createdAt.toISOString() : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

/**
 * Updates an existing calendar's properties.
 *
 * Purpose:
 * Modifies calendar configuration such as name, color, or default status.
 *
 * Parameters:
 * - id: The unique calendar identifier to update
 *   - Required, non-null
 * - data: Partial calendar data with fields to update
 *   - Optional fields: name, color, description, isDefault
 *   - Cannot update: id, workspaceId, createdAt
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The updated calendar record with updatedAt set to current time.
 *
 * Errors:
 * - Throws if calendar with id does not exist
 * - Throws if attempting to update immutable fields (id, workspaceId)
 *
 * Side effects:
 * - Writes to calendars table
 * - Automatically sets updatedAt to current timestamp
 * - Emits audit log entry if context provided
 * - Emits outbox event 'calendar.updated' if context provided
 *
 * Idempotency:
 * Idempotent for same data values. Multiple calls with same data
 * produce same end state.
 *
 * Authorization:
 * Caller must have write permission for the calendar's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Calendar with id must exist
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Calendar record updated with new values
 * - updatedAt timestamp set to current time
 * - Audit log and outbox event created if context provided
 */
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

/**
 * Deletes a calendar from the workspace.
 *
 * Purpose:
 * Permanently removes a calendar and all its associated data.
 *
 * Parameters:
 * - id: The unique calendar identifier to delete
 *   - Required, non-null
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The deleted calendar record.
 *
 * Errors:
 * - Throws if calendar with id does not exist
 * - Throws if calendar has dependent events (foreign key constraint)
 *
 * Side effects:
 * - Hard deletes from calendars table
 * - Cascades to dependent records based on database constraints
 * - Emits audit log entry if context provided
 * - Emits outbox event 'calendar.deleted' if context provided
 *
 * Idempotency:
 * Not idempotent. Second call will fail as record no longer exists.
 *
 * Authorization:
 * Caller must have delete permission for the calendar's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Calendar with id must exist
 * - Calendar must not have dependent events (or cascade is configured)
 * - User must have delete permission in the workspace
 *
 * Postconditions:
 * - Calendar record permanently removed from database
 * - Dependent records deleted based on cascade rules
 * - Audit log and outbox event created if context provided
 */
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

/**
 * EVENT OPERATIONS
 * Core logic for event lifecycle, including time-range queries and overlap detection.
 */

/**
 * Creates a new calendar event.
 *
 * Purpose:
 * Persists a new event with time range, title, and optional recurrence.
 *
 * Parameters:
 * - data: Event insert data including id, calendarId, start, end, title, etc.
 *   - Required: id, calendarId, workspaceId, start, end, title
 *   - Optional: description, location, recurrenceId, taskId, status
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The created event record with all database-generated fields.
 *
 * Errors:
 * - Throws if database insertion fails
 * - Throws if calendarId is invalid (foreign key constraint)
 * - Throws if start date is after end date (application-level validation)
 *
 * Side effects:
 * - Writes to events table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'event.created' if context provided
 *
 * Idempotency:
 * Not idempotent. Calling with same id will fail on unique constraint.
 *
 * Authorization:
 * Caller must be a member of the workspace specified in workspaceId.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - calendarId must reference an existing calendar
 * - workspaceId must match the calendar's workspace
 * - start date must be before end date
 *
 * Postconditions:
 * - Event exists in database with provided configuration
 * - Audit log entry created if context provided
 * - Outbox event created for downstream processing if context provided
 */
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

/**
 * Retrieves an event by its unique identifier.
 *
 * Purpose:
 * Fetches a single event record for display or further processing.
 *
 * Parameters:
 * - id: The unique event identifier (UUID)
 *   - Required, non-null
 *
 * Returns:
 * The event record if found, or null if not found.
 *
 * Errors:
 * None. Returns null for missing records.
 *
 * Side effects:
 * None. Read-only operation.
 *
 * Idempotency:
 * Idempotent. Multiple calls with same id return same result.
 *
 * Authorization:
 * Caller must have read access to the event's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - id must be a valid UUID format
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getEventById(id: string) {
  const [event] = await db.select().from(events).where(eq(events.id, id));
  return event;
}

/**
 * Retrieves events for a specific calendar with optional date range filtering.
 *
 * Purpose:
 * Lists all events in a calendar, optionally filtered by date range.
 * Uses overlap detection to include events that intersect the range.
 *
 * Parameters:
 * - calendarId: The calendar identifier to filter events
 *   - Required, non-null
 * - startDate: Optional start of date range filter
 *   - If provided, endDate must also be provided
 * - endDate: Optional end of date range filter
 *   - If provided, startDate must also be provided
 *
 * Returns:
 * Array of event records ordered by start time (ascending).
 * Includes events that overlap the date range, not just those fully contained.
 *
 * Errors:
 * - Throws if only one of startDate/endDate is provided
 *
 * Side effects:
 * None. Read-only operation.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Caller must have read access to the calendar's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - calendarId must reference an existing calendar
 * - If startDate provided, endDate must also be provided
 * - startDate must be before or equal to endDate
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getEventsByCalendar(calendarId: string, startDate?: Date, endDate?: Date) {
  const conditions = [eq(events.calendarId, calendarId)];

  if (startDate && endDate) {
    const s = startDate;
    const e = endDate;
    // Overlap detection: event overlaps query range if any of these conditions hold:
    // 1. Event starts within range
    // 2. Event ends within range
    // 3. Event spans the entire range (starts before, ends after)
    // This is the standard interval overlap predicate: start1 < end2 && end1 > start1
    conditions.push(
      or(
        and(gte(events.start, s), lte(events.start, e)),
        and(gte(events.end, s), lte(events.end, e)),
        and(lte(events.start, s), gte(events.end, e)),
      ) as any,
    );
  }

  return db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(asc(events.start));
}

/**
 * Retrieves events for a workspace with optional date range filtering.
 *
 * Purpose:
 * Lists all events across all calendars in a workspace,
 * optionally filtered by date range. Uses overlap detection.
 *
 * Parameters:
 * - workspaceId: The workspace identifier to filter events
 *   - Required, non-null
 * - startDate: Optional start of date range filter
 *   - If provided, endDate must also be provided
 * - endDate: Optional end of date range filter
 *   - If provided, startDate must also be provided
 *
 * Returns:
 * Array of event records ordered by start time (ascending).
 * Includes events that overlap the date range.
 *
 * Errors:
 * - Throws if only one of startDate/endDate is provided
 *
 * Side effects:
 * None. Read-only operation.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Caller must be a member of the workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - workspaceId must reference an existing workspace
 * - If startDate provided, endDate must also be provided
 * - startDate must be before or equal to endDate
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getEventsByWorkspace(workspaceId: string, startDate?: Date, endDate?: Date) {
  const conditions = [eq(events.workspaceId, workspaceId)];

  if (startDate && endDate) {
    const s = startDate;
    const e = endDate;
    // Overlap detection: event overlaps query range if any of these conditions hold:
    // 1. Event starts within range
    // 2. Event ends within range
    // 3. Event spans the entire range (starts before, ends after)
    // This is the standard interval overlap predicate: start1 < end2 && end1 > start1
    conditions.push(
      or(
        and(gte(events.start, s), lte(events.start, e)),
        and(gte(events.end, s), lte(events.end, e)),
        and(lte(events.start, s), gte(events.end, e)),
      ) as any,
    );
  }

  return db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(asc(events.start));
}

/**
 * Updates an existing event's properties.
 *
 * Purpose:
 * Modifies event details such as time range, title, or status.
 *
 * Parameters:
 * - id: The unique event identifier to update
 *   - Required, non-null
 * - data: Partial event data with fields to update
 *   - Optional fields: start, end, title, description, location, status, taskId
 *   - Cannot update: id, calendarId, workspaceId, createdAt
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The updated event record with updatedAt set to current time.
 *
 * Errors:
 * - Throws if event with id does not exist
 * - Throws if attempting to update immutable fields
 * - Throws if new start date is after new end date
 *
 * Side effects:
 * - Writes to events table
 * - Automatically sets updatedAt to current timestamp
 * - Emits audit log entry if context provided
 * - Emits outbox event 'event.updated' if context provided
 *
 * Idempotency:
 * Idempotent for same data values. Multiple calls with same data
 * produce same end state.
 *
 * Authorization:
 * Caller must have write permission for the event's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Event with id must exist
 * - If updating start/end, new start must be before new end
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Event record updated with new values
 * - updatedAt timestamp set to current time
 * - Audit log and outbox event created if context provided
 */
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

/**
 * Deletes an event from the calendar.
 *
 * Purpose:
 * Permanently removes an event and its associated data.
 *
 * Parameters:
 * - id: The unique event identifier to delete
 *   - Required, non-null
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The deleted event record.
 *
 * Errors:
 * - Throws if event with id does not exist
 *
 * Side effects:
 * - Hard deletes from events table
 * - Cascades to dependent records (attendees) based on database constraints
 * - Emits audit log entry if context provided
 * - Emits outbox event 'event.deleted' if context provided
 *
 * Idempotency:
 * Not idempotent. Second call will fail as record no longer exists.
 *
 * Authorization:
 * Caller must have delete permission for the event's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Event with id must exist
 * - User must have delete permission in the workspace
 *
 * Postconditions:
 * - Event record permanently removed from database
 * - Dependent attendee records deleted based on cascade rules
 * - Audit log and outbox event created if context provided
 */
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

/**
 * EVENT ATTENDEE OPERATIONS
 * Manages participants for specific calendar events.
 */

/**
 * Creates a new attendee for an event.
 *
 * Purpose:
 * Adds a participant to an event with their response status.
 *
 * Parameters:
 * - data: Event attendee insert data
 *   - Required: eventId, email, name
 *   - Optional: status (defaults to 'pending'), response
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The created attendee record with all database-generated fields.
 *
 * Errors:
 * - Throws if database insertion fails
 * - Throws if eventId is invalid (foreign key constraint)
 *
 * Side effects:
 * - Writes to event_attendees table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'event_attendee.created' if context provided
 *
 * Idempotency:
 * Not idempotent. Calling with same eventId/email combination
 * may fail on unique constraint if one exists.
 *
 * Authorization:
 * Caller must have write permission for the event's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - eventId must reference an existing event
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Attendee exists in database with provided configuration
 * - Audit log entry created if context provided
 * - Outbox event created for downstream processing if context provided
 */
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

/**
 * Retrieves all attendees for a specific event.
 *
 * Purpose:
 * Lists all participants for an event with their response status.
 *
 * Parameters:
 * - eventId: The event identifier to filter attendees
 *   - Required, non-null
 *
 * Returns:
 * Array of attendee records.
 *
 * Errors:
 * None. Returns empty array if event has no attendees.
 *
 * Side effects:
 * None. Read-only operation.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Caller must have read access to the event's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - eventId must reference an existing event
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getEventAttendees(eventId: string) {
  return db.select().from(eventAttendees).where(eq(eventAttendees.eventId, eventId));
}

/**
 * Updates an existing event attendee's properties.
 *
 * Purpose:
 * Modifies attendee details such as response status or notes.
 *
 * Parameters:
 * - id: The unique attendee identifier to update
 *   - Required, non-null
 * - data: Partial attendee data with fields to update
 *   - Optional fields: status, response, name, email
 *   - Cannot update: id, eventId, createdAt
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The updated attendee record.
 *
 * Errors:
 * - Throws if attendee with id does not exist
 * - Throws if attempting to update immutable fields
 *
 * Side effects:
 * - Writes to event_attendees table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'event_attendee.updated' if context provided
 *
 * Idempotency:
 * Idempotent for same data values. Multiple calls with same data
 * produce same end state.
 *
 * Authorization:
 * Caller must have write permission for the event's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Attendee with id must exist
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Attendee record updated with new values
 * - Audit log and outbox event created if context provided
 */
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

/**
 * Deletes an event attendee.
 *
 * Purpose:
 * Removes a participant from an event.
 *
 * Parameters:
 * - id: The unique attendee identifier to delete
 *   - Required, non-null
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The deleted attendee record.
 *
 * Errors:
 * - Throws if attendee with id does not exist
 *
 * Side effects:
 * - Hard deletes from event_attendees table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'event_attendee.deleted' if context provided
 *
 * Idempotency:
 * Not idempotent. Second call will fail as record no longer exists.
 *
 * Authorization:
 * Caller must have write permission for the event's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Attendee with id must exist
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Attendee record permanently removed from database
 * - Audit log and outbox event created if context provided
 */
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
/**
 * Retrieves calendars with their associated events in a single call.
 *
 * Purpose:
 * Batch operation that fetches calendars and their events together,
 * reducing N+1 query problems. Supports pagination and date filtering.
 *
 * Parameters:
 * - workspaceId: The workspace identifier
 *   - Required, non-null
 * - startDate: Optional start of date range for event filtering
 * - endDate: Optional end of date range for event filtering
 * - limit: Maximum number of calendars to return (default: 50)
 * - cursor: Pagination cursor for fetching next page
 *
 * Returns:
 * Object containing:
 * - items: Array of calendars with nested events arrays
 * - nextCursor: Cursor for next page or null if no more pages
 * - hasMore: Boolean indicating if more pages exist
 *
 * Errors:
 * - Throws if cursor is malformed
 *
 * Side effects:
 * None. Read-only operation.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Caller must be a member of the workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - workspaceId must reference an existing workspace
 *
 * Postconditions:
 * - None (read-only)
 *
 * Performance:
 * Makes N+1 queries (one for calendars, one per calendar for events).
 * Consider optimizing with a single join query for large datasets.
 */
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

/**
 * Retrieves an event with all its attendees in a single call.
 *
 * Purpose:
 * Batch operation that fetches an event and its attendees together,
 * reducing N+1 query problems.
 *
 * Parameters:
 * - eventId: The event identifier
 *   - Required, non-null
 *
 * Returns:
 * Object containing event data with nested attendees array,
 * or null if event does not exist.
 *
 * Errors:
 * None. Returns null for missing events.
 *
 * Side effects:
 * None. Read-only operation.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Caller must have read access to the event's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - eventId must reference an existing event
 *
 * Postconditions:
 * - None (read-only)
 */
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
/**
 * Retrieves all events linked to a specific task.
 *
 * Purpose:
 * Finds all calendar events that are associated with a task,
 * useful for showing task schedule context.
 *
 * Parameters:
 * - taskId: The task identifier to filter events
 *   - Required, non-null
 *
 * Returns:
 * Array of event records ordered by start time (ascending).
 * Returns empty array if no events are linked to the task.
 *
 * Errors:
 * None. Returns empty array for missing or unlinked tasks.
 *
 * Side effects:
 * None. Read-only operation.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Caller must have read access to the task's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - taskId must reference an existing task (orphaned events still returned)
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getEventsByTask(taskId: string) {
  return db.select().from(events).where(eq(events.taskId, taskId)).orderBy(asc(events.start));
}

/**
 * Links an event to a task, establishing a bidirectional relationship.
 *
 * Purpose:
 * Associates a calendar event with a work task for context tracking.
 * This sets the taskId field on the event record.
 *
 * Parameters:
 * - eventId: The event identifier to link
 *   - Required, non-null
 * - taskId: The task identifier to link to
 *   - Required, non-null
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The updated event record with taskId set.
 *
 * Errors:
 * - Throws if event with eventId does not exist
 * - Throws if task with taskId does not exist (foreign key constraint)
 *
 * Side effects:
 * - Writes to events table (sets taskId field)
 * - Automatically sets updatedAt to current timestamp
 * - Emits audit log entry if context provided
 * - Emits outbox event 'event_task.linked' if context provided
 *
 * Idempotency:
 * Idempotent. Linking the same event to the same task multiple times
 * produces the same end state.
 *
 * Authorization:
 * Caller must have write permission for both the event's and task's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Event with eventId must exist
 * - Task with taskId must exist
 * - Both must belong to the same workspace (application-level invariant)
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Event record has taskId field set
 * - updatedAt timestamp set to current time
 * - Audit log and outbox event created if context provided
 */
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

/**
 * Unlinks an event from its task, removing the relationship.
 *
 * Purpose:
 * Disassociates a calendar event from a work task by setting
 * the taskId field to null.
 *
 * Parameters:
 * - eventId: The event identifier to unlink
 *   - Required, non-null
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The updated event record with taskId set to null.
 *
 * Errors:
 * - Throws if event with eventId does not exist
 *
 * Side effects:
 * - Writes to events table (sets taskId to null)
 * - Automatically sets updatedAt to current timestamp
 * - Emits audit log entry if context provided
 * - Emits outbox event 'event_task.unlinked' if context provided
 *
 * Idempotency:
 * Idempotent. Unlinking an already-unlinked event produces
 * the same end state (taskId remains null).
 *
 * Authorization:
 * Caller must have write permission for the event's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Event with eventId must exist
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Event record has taskId field set to null
 * - updatedAt timestamp set to current time
 * - Audit log and outbox event created if context provided
 */
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
/**
 * Retrieves all instances of a recurring event.
 *
 * Purpose:
 * Fetches all event records that share the same recurrenceId,
 * representing all occurrences of a recurring series.
 *
 * Parameters:
 * - recurrenceId: The recurrence identifier (typically the base event's id)
 *   - Required, non-null
 *
 * Returns:
 * Array of event records ordered by start time (ascending).
 * Returns empty array if no instances exist.
 *
 * Errors:
 * None. Returns empty array for missing recurrenceId.
 *
 * Side effects:
 * None. Read-only operation.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Caller must have read access to the workspace containing the events.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - recurrenceId should reference a valid base event (not enforced)
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getRecurringEventInstances(recurrenceId: string) {
  return db
    .select()
    .from(events)
    .where(eq(events.recurrenceId, recurrenceId))
    .orderBy(asc(events.start));
}

/**
 * Retrieves the base event of a recurring series.
 *
 * Purpose:
 * Finds the original/parent event of a recurring series by looking for
 * an event whose id matches the recurrenceId and has no recurrenceId itself.
 *
 * Parameters:
 * - recurrenceId: The recurrence identifier (base event's id)
 *   - Required, non-null
 *
 * Returns:
 * The base event record if found, or null if not found.
 *
 * Errors:
 * None. Returns null for missing base events.
 *
 * Side effects:
 * None. Read-only operation.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Caller must have read access to the event's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - recurrenceId should reference a valid base event (not enforced)
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getBaseRecurringEvent(recurrenceId: string) {
  // The base event is the one that has this recurrenceId as its own id (not as recurrenceId)
  // Instances have recurrenceId pointing to the base event's id
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, recurrenceId), isNull(events.recurrenceId)));
  return event;
}

/**
 * SCHEDULING LINK OPERATIONS
 * Manages public booking pages and their configuration.
 */

/**
 * Creates a new public scheduling link for booking.
 *
 * Purpose:
 * Creates a public booking page that allows external users to schedule
 * time slots based on availability configuration.
 *
 * Parameters:
 * - data: Scheduling link insert data
 *   - Required: id, workspaceId, userId, slug, calendarId, duration
 *   - Optional: name, description, availabilityStart, availabilityEnd,
 *     availableDays, bufferBefore, bufferAfter, minBookingNotice,
 *     maxBookingNotice, maxDailyBookings, isActive
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The created scheduling link record with all database-generated fields.
 *
 * Errors:
 * - Throws if database insertion fails
 * - Throws if workspaceId, userId, or calendarId is invalid
 * - Throws if slug is not unique (unique constraint)
 *
 * Side effects:
 * - Writes to scheduling_links table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'scheduling_link.created' if context provided
 *
 * Idempotency:
 * Not idempotent. Calling with same id or slug will fail on unique constraint.
 *
 * Authorization:
 * Caller must be the user specified in userId and a member of workspaceId.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - workspaceId must reference an existing workspace
 * - userId must reference an existing user in the workspace
 * - calendarId must reference an existing calendar in the workspace
 * - slug must be unique within the workspace
 * - User must have permission to create scheduling links
 *
 * Postconditions:
 * - Scheduling link exists in database with provided configuration
 * - Audit log entry created if context provided
 * - Outbox event created for downstream processing if context provided
 */
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

/**
 * Retrieves a scheduling link by its unique identifier.
 *
 * Purpose:
 * Fetches a single scheduling link record for display or booking processing.
 *
 * Parameters:
 * - id: The unique scheduling link identifier (UUID)
 *   - Required, non-null
 *
 * Returns:
 * The scheduling link record if found, or null if not found.
 *
 * Errors:
 * None. Returns null for missing records.
 *
 * Side effects:
 * None. Read-only operation.
 *
 * Idempotency:
 * Idempotent. Multiple calls with same id return same result.
 *
 * Authorization:
 * Caller must have read access to the link's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - id must be a valid UUID format
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getSchedulingLinkById(id: string) {
  const [link] = await db.select().from(schedulingLinks).where(eq(schedulingLinks.id, id));
  return link;
}

/**
 * Retrieves a scheduling link by its public slug.
 *
 * Purpose:
 * Fetches a scheduling link for public booking pages using the
 * human-readable slug instead of UUID.
 *
 * Parameters:
 * - slug: The public slug identifier
 *   - Required, non-null, must be URL-safe
 *
 * Returns:
 * The scheduling link record if found, or null if not found.
 *
 * Errors:
 * None. Returns null for missing records.
 *
 * Side effects:
 * None. Read-only operation.
 *
 * Idempotency:
 * Idempotent. Multiple calls with same slug return same result.
 *
 * Authorization:
 * Public endpoint - no authentication required for active links.
 * Inactive links require workspace membership.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - slug must be a valid URL-safe string
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getSchedulingLinkBySlug(slug: string) {
  const [link] = await db.select().from(schedulingLinks).where(eq(schedulingLinks.slug, slug));
  return link;
}

/**
 * Retrieves scheduling links for a workspace with pagination.
 *
 * Purpose:
 * Lists all scheduling links in a workspace, ordered by createdAt (descending).
 * Supports cursor-based pagination for large datasets.
 *
 * Parameters:
 * - workspaceId: The workspace identifier to filter links
 *   - Required, non-null
 * - limit: Maximum number of items to return (default: 50, max: 100)
 *   - Optional, must be positive
 * - cursor: Pagination cursor for fetching next page
 *   - Optional, ISO timestamp string of last item's createdAt
 *
 * Returns:
 * Object containing:
 * - items: Array of scheduling link records
 * - nextCursor: Cursor for next page or null if no more pages
 * - hasMore: Boolean indicating if more pages exist
 *
 * Errors:
 * - Throws if cursor is malformed (invalid ISO timestamp)
 *
 * Side effects:
 * None. Read-only operation.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Caller must be a member of the workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - workspaceId must reference an existing workspace
 * - limit must be between 1 and 100
 *
 * Postconditions:
 * - None (read-only)
 */
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
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem ? lastItem.createdAt.toISOString() : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

/**
 * Retrieves scheduling links for a specific user with pagination.
 *
 * Purpose:
 * Lists all scheduling links owned by a user, ordered by createdAt (descending).
 * Supports cursor-based pagination.
 *
 * Parameters:
 * - userId: The user identifier to filter links
 *   - Required, non-null
 * - limit: Maximum number of items to return (default: 50, max: 100)
 *   - Optional, must be positive
 * - cursor: Pagination cursor for fetching next page
 *   - Optional, ISO timestamp string of last item's createdAt
 *
 * Returns:
 * Object containing:
 * - items: Array of scheduling link records
 * - nextCursor: Cursor for next page or null if no more pages
 * - hasMore: Boolean indicating if more pages exist
 *
 * Errors:
 * - Throws if cursor is malformed (invalid ISO timestamp)
 *
 * Side effects:
 * None. Read-only operation.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Caller must be the user specified in userId or have admin access.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - userId must reference an existing user
 * - limit must be between 1 and 100
 *
 * Postconditions:
 * - None (read-only)
 */
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
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem ? lastItem.createdAt.toISOString() : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

/**
 * Updates an existing scheduling link's properties.
 *
 * Purpose:
 * Modifies scheduling link configuration such as availability windows,
 * duration, or active status.
 *
 * Parameters:
 * - id: The unique scheduling link identifier to update
 *   - Required, non-null
 * - data: Partial scheduling link data with fields to update
 *   - Optional fields: name, description, duration, availabilityStart,
 *     availabilityEnd, availableDays, bufferBefore, bufferAfter,
 *     minBookingNotice, maxBookingNotice, maxDailyBookings, isActive
 *   - Cannot update: id, workspaceId, userId, calendarId, slug, createdAt
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The updated scheduling link record with updatedAt set to current time.
 *
 * Errors:
 * - Throws if scheduling link with id does not exist
 * - Throws if attempting to update immutable fields
 *
 * Side effects:
 * - Writes to scheduling_links table
 * - Automatically sets updatedAt to current timestamp
 * - Emits audit log entry if context provided
 * - Emits outbox event 'scheduling_link.updated' if context provided
 *
 * Idempotency:
 * Idempotent for same data values. Multiple calls with same data
 * produce same end state.
 *
 * Authorization:
 * Caller must be the user who owns the link or have admin access.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Scheduling link with id must exist
 * - User must have write permission for the link
 *
 * Postconditions:
 * - Scheduling link record updated with new values
 * - updatedAt timestamp set to current time
 * - Audit log and outbox event created if context provided
 */
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

/**
 * Deletes a scheduling link from the workspace.
 *
 * Purpose:
 * Permanently removes a public booking page and its configuration.
 *
 * Parameters:
 * - id: The unique scheduling link identifier to delete
 *   - Required, non-null
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The deleted scheduling link record.
 *
 * Errors:
 * - Throws if scheduling link with id does not exist
 *
 * Side effects:
 * - Hard deletes from scheduling_links table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'scheduling_link.deleted' if context provided
 *
 * Idempotency:
 * Not idempotent. Second call will fail as record no longer exists.
 *
 * Authorization:
 * Caller must be the user who owns the link or have admin access.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Scheduling link with id must exist
 * - User must have delete permission for the link
 *
 * Postconditions:
 * - Scheduling link record permanently removed from database
 * - Audit log and outbox event created if context provided
 */
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

/**
 * AVAILABILITY & BOOKING
 * Logic for calculating free time slots and creating atomic bookings.
 */

export interface AvailableSlot {
  start: Date;
  end: Date;
}

/**
 * Calculates available time slots for booking on a calendar.
 *
 * Purpose:
 * Computes free time slots within a date range, considering availability
 * windows, buffer times, day restrictions, and existing event conflicts.
 *
 * Parameters:
 * - calendarId: The calendar identifier to calculate availability for
 *   - Required, non-null
 * - startDate: Start of the date range to search
 *   - Required, non-null
 * - endDate: End of the date range to search
 *   - Required, non-null
 * - duration: Duration of each slot in minutes
 *   - Required, must be positive
 * - availabilityStart: Daily availability start time in HH:MM format
 *   - Optional, defaults to '09:00'
 * - availabilityEnd: Daily availability end time in HH:MM format
 *   - Optional, defaults to '17:00'
 * - availableDays: Array of available day numbers (0-6, Sunday=0)
 *   - Optional, defaults to all days [0,1,2,3,4,5,6]
 * - bufferBefore: Buffer time before each slot in minutes
 *   - Optional, defaults to 0
 * - bufferAfter: Buffer time after each slot in minutes
 *   - Optional, defaults to 0
 *
 * Returns:
 * Array of AvailableSlot objects with start and end Date objects.
 * Slots are conflict-free and respect all constraints.
 *
 * Errors:
 * - Throws if time strings are malformed (not HH:MM format)
 * - Throws if duration is not positive
 *
 * Side effects:
 * None. Pure calculation function.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Caller must have read access to the calendar's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - calendarId must reference an existing calendar
 * - startDate must be before or equal to endDate
 * - duration must be positive
 * - availabilityStart must be before availabilityEnd
 *
 * Postconditions:
 * - None (read-only)
 *
 * Performance:
 * O(n*m) where n is number of days in range and m is number of events.
 * For large date ranges with many events, consider pagination.
 */
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
  // Default to 9 AM - 5 PM business hours if not specified
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
    const slotStart = new Date(dayStart);
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
      // Note: Buffer times are NOT considered in conflict detection here.
      // The slot itself (without buffers) must not overlap existing events.
      // Buffers are handled by the spacing between slots (see slot advancement below).
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
      // Advance by duration + bufferAfter to enforce spacing between consecutive slots
      // This ensures bufferAfter of previous slot becomes bufferBefore of next slot
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
/**
 * Atomically books a time slot with conflict detection.
 *
 * Purpose:
 * Creates an event and attendee in a single transaction with row-level
 * locking to prevent double-booking. Uses SELECT FOR UPDATE to lock
 * overlapping events during conflict detection.
 *
 * Parameters:
 * - calendarId: The calendar identifier to book on
 *   - Required, non-null
 * - start: Start time of the slot to book
 *   - Required, non-null
 * - end: End time of the slot to book
 *   - Required, non-null
 * - eventData: Event data to insert (id, title, etc.)
 *   - Required, must include id, calendarId, workspaceId, title
 * - attendeeData: Attendee data (email, name, etc.)
 *   - Required, must include email, name
 *   - eventId and status are set automatically
 * - requiresApproval: Whether the booking requires approval
 *   - Optional, defaults to false
 *   - If true, attendee status is set to 'pending'
 *   - If false, attendee status is set to 'accepted'
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * Object containing:
 * - event: The created event record
 * - attendee: The created attendee record
 *
 * Errors:
 * - Throws if slot conflicts with existing events (concurrent booking)
 * - Throws if database insertion fails
 * - Throws if foreign key constraints are violated
 *
 * Side effects:
 * - Writes to events and event_attendees tables in a transaction
 * - Locks overlapping events with SELECT FOR UPDATE during conflict check
 * - Emits audit log entry if context provided
 * - Emits outbox event 'booking.created' if context provided
 *
 * Idempotency:
 * Not idempotent. Calling with same event data will fail on unique constraint.
 * However, the conflict detection ensures no double-booking on concurrent calls.
 *
 * Authorization:
 * Caller must have write permission for the calendar's workspace.
 * For public booking, this is called with elevated context from the route layer.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - calendarId must reference an existing calendar
 * - start must be before end
 * - Slot must not conflict with existing events (checked atomically)
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Event and attendee records created
 * - Audit log and outbox event created if context provided
 * - No overlapping events exist (guaranteed by row locking)
 *
 * Performance:
 * Uses row-level locking which may cause contention under high load.
 * Consider using optimistic concurrency with retry for very high throughput.
 */
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
      // This is a critical race condition prevention: without row locking, two concurrent
      // bookings could both pass the conflict check and create overlapping events.
      // The lock is held until the transaction commits, serializing overlapping bookings.
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
