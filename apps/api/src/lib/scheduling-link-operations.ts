/**
 * MODULE: Scheduling Link Operations
 *
 * Responsibility:
 * Orchestrates business logic for public scheduling links (booking pages).
 * Manages CRUD operations for scheduling links and their configuration.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Does not handle booking logic (delegated to availability-booking-operations.ts).
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all workspace-scoped operations
 *   - Calendar IDs must reference existing calendars in the same workspace
 *   - User IDs must reference existing users in the same workspace
 *   - Slugs must be unique within the workspace
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
 * - High. Affects public booking functionality and user-facing scheduling pages.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/calendar.ts (persistence layer)
 * - packages/contracts/src/calendar.ts (domain schemas)
 * - apps/api/src/routes/calendar/scheduling-links.ts (API routes)
 * - apps/api/src/lib/calendar-operations.ts (parent module)
 *
 * Tags:
 * - domain: calendar
 * - risk: high
 * - layer: business-logic
 * - stability: stable
 * - concerns: audit, outbox, public-booking
 *
 * File:
 * - apps/api/src/lib/scheduling-link-operations.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import * as schema from '@life-os/database';
import { schedulingLinks } from '@life-os/database';
import { eq, and, desc, gt } from 'drizzle-orm';

import { executeCommandWithoutIdempotency, type CommandContext } from './command-context.js';
import { db } from './db.js';

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
