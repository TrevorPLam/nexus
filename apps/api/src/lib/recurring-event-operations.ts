/**
 * MODULE: Recurring Event Operations
 *
 * Responsibility:
 * Orchestrates business logic for recurring calendar events.
 * Manages retrieval of recurring event instances and base events.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Does not handle event CRUD (delegated to event-operations.ts).
 * - Does not handle recurrence generation (delegated to worker/background jobs).
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all workspace-scoped operations
 * - Postconditions:
 *   - None (read-only operations)
 *
 * Side effects:
 * - None. Read-only operations.
 *
 * Change risk:
 * - Medium. Affects recurring event display and management.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/calendar.ts (persistence layer)
 * - packages/contracts/src/calendar.ts (domain schemas)
 * - apps/api/src/routes/calendar/recurring.ts (API routes)
 * - apps/api/src/lib/event-operations.ts (event operations)
 * - apps/api/src/lib/calendar-operations.ts (parent module)
 *
 * Tags:
 * - domain: calendar
 * - risk: medium
 * - layer: business-logic
 * - stability: stable
 * - concerns: recurring-events
 *
 * File:
 * - apps/api/src/lib/recurring-event-operations.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { events } from '@life-os/database';
import { eq, asc, isNull, and } from 'drizzle-orm';

import { db } from './db.js';

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
