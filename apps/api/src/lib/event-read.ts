/**
 * MODULE: Event Read Operations
 *
 * Responsibility:
 * Provides read-only operations for calendar events.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Does not handle write operations (delegated to event-write.ts).
 * - Does not handle attendee management (delegated to event-attendee-operations.ts).
 * - Does not handle external provider sync (delegated to background jobs/worker).
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all workspace-scoped operations
 * - Postconditions:
 *   - None (read-only)
 *
 * Side effects:
 * - None. Read-only operations.
 *
 * Change risk:
 * - Medium. Affects calendar reliability and event management.
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
 * - risk: medium
 * - layer: business-logic
 * - stability: stable
 * - concerns: read-operations
 *
 * File:
 * - apps/api/src/lib/event-read.ts
 *
 * Last updated:
 * - July 26, 2026
 */

import { events } from '@life-os/database';
import { eq, and, asc, gte, lte, or } from 'drizzle-orm';

import { db } from './db.js';

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
      ) as unknown,
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
      ) as unknown,
    );
  }

  return db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(asc(events.start));
}
