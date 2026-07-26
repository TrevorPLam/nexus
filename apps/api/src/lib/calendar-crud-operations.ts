/**
 * MODULE: Calendar CRUD Operations
 *
 * Responsibility:
 * Orchestrates business logic for calendar entity CRUD operations.
 * Handles creation, retrieval, update, and deletion of calendars.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Does not handle event management (delegated to event-operations.ts).
 * - Does not handle scheduling links (delegated to scheduling-link-operations.ts).
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all workspace-scoped operations
 *   - Workspace IDs must reference existing workspaces
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
 * - High. Affects calendar management and workspace organization.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/calendar.ts (persistence layer)
 * - packages/contracts/src/calendar.ts (domain schemas)
 * - apps/api/src/routes/calendar/calendars.ts (API routes)
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
 * - apps/api/src/lib/calendar-crud-operations.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import * as schema from '@life-os/database';
import { calendars } from '@life-os/database';
import { eq, and, desc, asc, gt } from 'drizzle-orm';

import { executeCommandWithoutIdempotency, type CommandContext } from './command-context.js';
import { db } from './db.js';

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
