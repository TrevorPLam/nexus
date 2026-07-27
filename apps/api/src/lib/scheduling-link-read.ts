/**
 * MODULE: Scheduling Link Read Operations
 *
 * Responsibility:
 * Provides read-only operations for scheduling links.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Does not handle write operations (delegated to scheduling-link-write.ts).
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
 * - Medium. Affects public booking functionality.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/calendar.ts (persistence layer)
 * - packages/contracts/src/calendar.ts (domain schemas)
 * - apps/api/src/routes/calendar/scheduling-links.ts (API routes)
 *
 * Tags:
 * - domain: calendar
 * - risk: medium
 * - layer: business-logic
 * - stability: stable
 * - concerns: read-operations
 *
 * File:
 * - apps/api/src/lib/scheduling-link-read.ts
 *
 * Last updated:
 * - July 26, 2026
 */

import { schedulingLinks } from '@life-os/database';
import { eq, and, desc, gt } from 'drizzle-orm';

import { db } from './db.js';

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
