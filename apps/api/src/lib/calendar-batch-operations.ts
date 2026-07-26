/**
 * MODULE: Calendar Batch Operations
 *
 * Responsibility:
 * Orchestrates batch operations for calendar entities.
 * Provides optimized queries that fetch related data together to reduce N+1 problems.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Depends on calendar-crud-operations.ts and event-operations.ts.
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
 * - Medium. Affects query performance but not data integrity.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/calendar.ts (persistence layer)
 * - apps/api/src/lib/calendar-crud-operations.ts (calendar CRUD)
 * - apps/api/src/lib/event-operations.ts (event operations)
 * - apps/api/src/lib/event-attendee-operations.ts (attendee operations)
 * - apps/api/src/lib/calendar-operations.ts (parent module)
 *
 * Tags:
 * - domain: calendar
 * - risk: medium
 * - layer: business-logic
 * - stability: stable
 * - concerns: performance, batch-queries
 *
 * File:
 * - apps/api/src/lib/calendar-batch-operations.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { getCalendarsByWorkspace } from './calendar-crud-operations.js';
import { getEventAttendees } from './event-attendee-operations.js';
import { getEventById } from './event-operations.js';
import { getEventsByCalendar } from './event-operations.js';

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
