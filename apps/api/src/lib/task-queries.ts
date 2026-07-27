/**
 * MODULE: Task Query Operations
 *
 * Responsibility:
 * Manages task retrieval and filtering operations including workspace queries,
 * project queries, advanced filtering, and full-text search.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Provides read-only operations for task data.
 * - Delegates low-level DB access to Drizzle.
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all operations
 * - Postconditions:
 *   - All queries respect RLS policies
 *   - Cancelled tasks excluded by default unless explicitly requested
 *
 * Side effects:
 * - None. Read-only operations.
 *
 * Change risk:
 * - Medium. Contains query logic but no mutations.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/work.ts (persistence layer)
 * - packages/contracts/src/work.ts (domain schemas)
 * - apps/api/src/routes/work/tasks.ts (API routes)
 *
 * Tags:
 * - domain: work-management
 * - risk: medium
 * - layer: business-logic
 * - stability: stable
 * - concerns: queries, pagination, search
 *
 * File:
 * - apps/api/src/lib/task-queries.ts
 *
 * Last updated:
 * - July 26, 2026
 */

import { tasks } from '@life-os/database';
import { eq, and, desc, asc, sql } from 'drizzle-orm';

/**
 * Retrieves tasks for a workspace with pagination.
 *
 * Purpose:
 * Lists all tasks in a workspace, ordered by dueDate (asc), priority (desc),
 * createdAt (asc), and id (asc). Supports cursor-based pagination.
 *
 * Parameters:
 * - workspaceId: The workspace identifier to filter tasks
 *   - Required, non-null
 * - limit: Maximum number of items to return (default: 50, max: 100)
 *   - Optional, must be positive
 * - cursor: Pagination cursor for fetching next page
 *   - Optional, JSON string with dueDate, priority, createdAt, id
 * - includeCancelled: Whether to include cancelled tasks (default: false)
 *   - Optional, boolean
 *
 * Returns:
 * Object containing:
 * - items: Array of task records
 * - nextCursor: Cursor for next page or null if no more pages
 * - hasMore: Boolean indicating if more pages exist
 *
 * Errors:
 * - Throws if cursor is malformed (invalid JSON)
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
export async function getTasksByWorkspace(
  workspaceId: string,
  limit = 50,
  cursor?: string,
  includeCancelled = false,
) {
  const { db } = await import('./db.js');
  const conditions = [eq(tasks.workspaceId, workspaceId)];

  // Exclude cancelled tasks by default
  if (!includeCancelled) {
    conditions.push(sql`${tasks.status} != 'cancelled'`);
  }

  if (cursor) {
    const cursorData = JSON.parse(cursor);
    // Composite cursor matching: asc(dueDate), desc(priority), asc(createdAt), asc(id)
    // For asc: use >, for desc: use <
    // This complex predicate ensures stable pagination when multiple tasks share
    // the same dueDate or priority by falling back to secondary sort keys.
    conditions.push(
      sql`(${tasks.dueDate} > ${cursorData.dueDate ? new Date(cursorData.dueDate) : null} OR 
          (${tasks.dueDate} = ${cursorData.dueDate ? new Date(cursorData.dueDate) : null} AND 
           ${tasks.priority} < ${cursorData.priority}) OR 
          (${tasks.dueDate} = ${cursorData.dueDate ? new Date(cursorData.dueDate) : null} AND 
           ${tasks.priority} = ${cursorData.priority} AND 
           ${tasks.createdAt} > ${new Date(cursorData.createdAt)}) OR
          (${tasks.dueDate} = ${cursorData.dueDate ? new Date(cursorData.dueDate) : null} AND 
           ${tasks.priority} = ${cursorData.priority} AND 
           ${tasks.createdAt} = ${new Date(cursorData.createdAt)} AND 
           ${tasks.id} > ${cursorData.id}))`,
    );
  }

  const results = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.dueDate), desc(tasks.priority), asc(tasks.createdAt), asc(tasks.id))
    .limit(limit + 1); // Fetch one extra to determine if there's a next page

  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, -1) : results;
  const lastItem = items.length > 0 ? items[items.length - 1] : null;
  const nextCursor =
    hasMore && lastItem
      ? JSON.stringify({
          dueDate: lastItem.dueDate?.toISOString() || null,
          priority: lastItem.priority,
          createdAt: lastItem.createdAt.toISOString(),
          id: lastItem.id,
        })
      : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

/**
 * Retrieves tasks for a specific project.
 *
 * Purpose:
 * Lists all tasks in a project, ordered by dueDate (asc), priority (desc),
 * and id (asc).
 *
 * Parameters:
 * - projectId: The project identifier to filter tasks
 *   - Required, non-null
 * - includeCancelled: Whether to include cancelled tasks (default: false)
 *   - Optional, boolean
 *
 * Returns:
 * Array of task records.
 *
 * Errors:
 * None. Returns empty array if project has no tasks.
 *
 * Side effects:
 * None. Read-only operation.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Caller must have read access to the project's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - projectId must reference an existing project
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getTasksByProject(projectId: string, includeCancelled = false) {
  const { db } = await import('./db.js');
  const conditions = [eq(tasks.projectId, projectId)];

  // Exclude cancelled tasks by default
  if (!includeCancelled) {
    conditions.push(sql`${tasks.status} != 'cancelled'`);
  }

  return db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.dueDate), desc(tasks.priority), asc(tasks.id));
}

/**
 * Retrieves tasks with advanced filtering and pagination.
 *
 * Purpose:
 * Lists tasks with flexible filtering by project, status, priority,
 * search query, and date range. Supports cursor-based pagination.
 *
 * Parameters:
 * - filters: Filter object containing:
 *   - workspaceId: Required workspace identifier
 *   - projectId: Optional project filter
 *   - status: Optional status filter (e.g., 'todo', 'in_progress', 'done')
 *   - priority: Optional priority filter (e.g., 'low', 'medium', 'high')
 *   - searchQuery: Optional ILIKE search on title and description
 *   - dueBefore: Optional due date upper bound
 *   - dueAfter: Optional due date lower bound
 *   - limit: Maximum items to return (default: 50)
 *   - cursor: Pagination cursor
 *   - includeCancelled: Whether to include cancelled tasks (default: false)
 *
 * Returns:
 * Object containing:
 * - items: Array of filtered task records
 * - nextCursor: Cursor for next page or null if no more pages
 * - hasMore: Boolean indicating if more pages exist
 *
 * Errors:
 * - Throws if cursor is malformed (invalid JSON)
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
 */
export async function getFilteredTasks(filters: {
  workspaceId: string;
  projectId?: string;
  status?: string;
  priority?: string;
  searchQuery?: string;
  dueBefore?: Date;
  dueAfter?: Date;
  limit?: number;
  cursor?: string;
  includeCancelled?: boolean;
}) {
  const { db } = await import('./db.js');
  const conditions = [eq(tasks.workspaceId, filters.workspaceId)];

  // Exclude cancelled tasks by default unless explicitly requested
  if (!filters.includeCancelled && filters.status !== 'cancelled') {
    conditions.push(sql`${tasks.status} != 'cancelled'`);
  }

  if (filters.projectId) {
    conditions.push(eq(tasks.projectId, filters.projectId));
  }

  if (filters.status) {
    conditions.push(eq(tasks.status, filters.status));
  }

  if (filters.priority) {
    conditions.push(eq(tasks.priority, filters.priority));
  }

  if (filters.searchQuery) {
    // Use ILIKE search for title and description
    conditions.push(
      sql`(${tasks.title} ILIKE ${'%' + filters.searchQuery + '%'} OR ${tasks.description} ILIKE ${'%' + filters.searchQuery + '%'})`,
    );
  }

  if (filters.dueBefore) {
    conditions.push(sql`${tasks.dueDate} <= ${filters.dueBefore}`);
  }

  if (filters.dueAfter) {
    conditions.push(sql`${tasks.dueDate} >= ${filters.dueAfter}`);
  }

  const limit = filters.limit || 50;

  // Add cursor predicate if provided
  if (filters.cursor) {
    const cursorData = JSON.parse(filters.cursor);
    // Composite cursor matching: asc(dueDate), desc(priority), asc(id)
    conditions.push(
      sql`(${tasks.dueDate} > ${cursorData.dueDate ? new Date(cursorData.dueDate) : null} OR 
          (${tasks.dueDate} = ${cursorData.dueDate ? new Date(cursorData.dueDate) : null} AND 
           ${tasks.priority} < ${cursorData.priority}) OR 
          (${tasks.dueDate} = ${cursorData.dueDate ? new Date(cursorData.dueDate) : null} AND 
           ${tasks.priority} = ${cursorData.priority} AND 
           ${tasks.id} > ${cursorData.id}))`,
    );
  }

  const query = db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.dueDate), desc(tasks.priority), asc(tasks.id))
    .limit(limit + 1);

  const results = await query;
  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, -1) : results;
  const lastItem = items.length > 0 ? items[items.length - 1] : null;
  const nextCursor =
    hasMore && lastItem
      ? JSON.stringify({
          dueDate: lastItem.dueDate?.toISOString() || null,
          priority: lastItem.priority,
          id: lastItem.id,
        })
      : null;

  return { items, nextCursor, hasMore };
}

/**
 * Full-text search function with ranking.
 *
 * Purpose:
 * Performs natural language search on tasks using PostgreSQL's full-text search.
 * Returns results ranked by relevance.
 *
 * Parameters:
 * - workspaceId: The workspace identifier to search within
 *   - Required, non-null
 * - query: The search query string
 *   - Required, non-null
 * - limit: Maximum number of results to return (default: 20)
 *   - Optional, must be positive
 *
 * Returns:
 * Array of objects containing:
 * - task: The task record
 * - rank: Relevance score (higher is more relevant)
 *
 * Errors:
 * - Throws if query is invalid for full-text search
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
 * - searchVector column must be populated on tasks table
 *
 * Postconditions:
 * - None (read-only)
 *
 * Note:
 * Uses PostgreSQL's tsvector and plainto_tsquery for natural language search.
 * 'english' is hardcoded as the text search configuration; consider making this
 * configurable per workspace if internationalization is needed.
 */
export async function searchTasks(workspaceId: string, query: string, limit = 20) {
  const { db } = await import('./db.js');
  return db
    .select({
      task: tasks,
      rank: sql<number>`ts_rank(${tasks.searchVector}, plainto_tsquery('english', ${query}))`.as(
        'rank',
      ),
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.workspaceId, workspaceId),
        sql`${tasks.searchVector} @@ plainto_tsquery('english', ${query})`,
      ),
    )
    .orderBy(sql`ts_rank(${tasks.searchVector}, plainto_tsquery('english', ${query})) DESC`)
    .limit(limit);
}
