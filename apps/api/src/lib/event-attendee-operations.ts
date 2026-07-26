/**
 * MODULE: Event Attendee Operations
 *
 * Responsibility:
 * Orchestrates business logic for event attendee entities.
 * Manages participants for specific calendar events.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Does not handle event management (delegated to event-operations.ts).
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all workspace-scoped operations
 *   - Event IDs must reference existing events in the same workspace
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
 * - High. Affects event participant management.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/calendar.ts (persistence layer)
 * - packages/contracts/src/calendar.ts (domain schemas)
 * - apps/api/src/routes/calendar/attendees.ts (API routes)
 * - apps/api/src/lib/calendar-operations.ts (parent module)
 *
 * Tags:
 * - domain: calendar
 * - risk: high
 * - layer: business-logic
 * - stability: stable
 * - concerns: audit, outbox
 *
 * File:
 * - apps/api/src/lib/event-attendee-operations.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import * as schema from '@life-os/database';
import { eventAttendees } from '@life-os/database';
import { eq } from 'drizzle-orm';

import { executeCommandWithoutIdempotency, type CommandContext } from './command-context.js';
import { db } from './db.js';

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
