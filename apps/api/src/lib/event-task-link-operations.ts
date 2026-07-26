/**
 * MODULE: Event-Task Link Operations
 *
 * Responsibility:
 * Orchestrates business logic for linking calendar events to work tasks.
 * Manages bidirectional relationships between events and tasks.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Does not handle event CRUD (delegated to event-operations.ts).
 * - Does not handle task CRUD (delegated to work-operations.ts).
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all workspace-scoped operations
 *   - Event IDs must reference existing events in the same workspace
 *   - Task IDs must reference existing tasks in the same workspace
 * - Postconditions:
 *   - All mutations emit audit log entries when context is provided
 *   - All mutations emit outbox events for downstream processing
 *
 * Side effects:
 * - Performs database writes (updates events table).
 * - Emits audit logs to 'audit_logs' table.
 * - Emits outbox events to 'outbox_events' table for downstream sync/notifications.
 *
 * Change risk:
 * - High. Affects task-calendar integration.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/calendar.ts (persistence layer)
 * - packages/database/src/schema/work.ts (task persistence)
 * - packages/contracts/src/calendar.ts (domain schemas)
 * - apps/api/src/lib/event-operations.ts (event operations)
 * - apps/api/src/lib/calendar-operations.ts (parent module)
 *
 * Tags:
 * - domain: calendar
 * - risk: high
 * - layer: business-logic
 * - stability: stable
 * - concerns: audit, outbox, task-integration
 *
 * File:
 * - apps/api/src/lib/event-task-link-operations.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { events } from '@life-os/database';
import { eq, asc } from 'drizzle-orm';

import { executeCommandWithoutIdempotency, type CommandContext } from './command-context.js';
import { db } from './db.js';

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
