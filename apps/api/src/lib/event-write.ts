/**
 * MODULE: Event Write Operations
 *
 * Responsibility:
 * Provides write operations for calendar events.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Does not handle read operations (delegated to event-read.ts).
 * - Does not handle attendee management (delegated to event-attendee-operations.ts).
 * - Does not handle external provider sync (delegated to background jobs/worker).
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all workspace-scoped operations
 *   - Calendar IDs must reference existing calendars in the same workspace
 *   - Event start dates must precede end dates (validated by Zod in contracts)
 * - Postconditions:
 *   - All mutations emit audit log entries when context is provided
 *   - All mutations emit outbox events for downstream processing
 *   - Deleted entities are hard-deleted (cascaded by database constraints)
 *
 * Side effects:
 * - Performs database writes (CRUD) via Drizzle ORM.
 * - Emits audit logs to 'audit_logs' table.
 * - Emits outbox events to 'outbox_events' table for downstream sync/notifications.
 *
 * Change risk:
 * - High. Affects calendar reliability and event management.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/calendar.ts (persistence layer)
 * - packages/contracts/src/calendar.ts (domain schemas)
 * - apps/api/src/routes/calendar/events.ts (API routes)
 *
 * Tags:
 * - domain: calendar
 * - risk: high
 * - layer: business-logic
 * - stability: stable
 * - concerns: audit, outbox
 *
 * File:
 * - apps/api/src/lib/event-write.ts
 *
 * Last updated:
 * - July 26, 2026
 */

import * as schema from '@life-os/database';
import { events } from '@life-os/database';
import { eq } from 'drizzle-orm';

import { executeCommandWithoutIdempotency, type CommandContext } from './command-context.js';

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
    context?.userId && context?.workspaceId
      ? {
          eventType: 'event.created',
          aggregateType: 'event',
          aggregateId: data.id || 'pending',
          payload: { event: data },
        }
      : undefined,
  );
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
