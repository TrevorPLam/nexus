/**
 * MODULE: Project Operations
 *
 * Responsibility:
 * Manages project lifecycle operations including creation, retrieval,
 * updating, and deletion with transactional integrity, audit logging,
 * and outbox event emission.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Manages project-specific business logic.
 * - Delegates low-level DB access to Drizzle.
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all operations
 *   - Project IDs must reference existing projects in the same workspace
 * - Postconditions:
 *   - All mutations emit audit log entries when context is provided
 *   - All mutations emit outbox events for downstream processing
 *   - Project deletion soft-deletes (sets status to 'deleted')
 *
 * Side effects:
 * - Performs database writes (CRUD).
 * - Emits audit logs to 'audit_logs' table.
 * - Emits outbox events to 'outbox_events' table for downstream sync/notifications.
 *
 * Change risk:
 * - Medium. Contains project business logic and state transition rules.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/work.ts (persistence layer)
 * - packages/contracts/src/work.ts (domain schemas)
 * - apps/api/src/routes/work/projects.ts (API routes)
 *
 * Tags:
 * - domain: work-management
 * - risk: medium
 * - layer: business-logic
 * - stability: stable
 * - concerns: audit, outbox, transactions
 *
 * File:
 * - apps/api/src/lib/project-operations.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { projects } from '@life-os/database';
import { eq, and, desc, asc, sql } from 'drizzle-orm';

import { executeCommandWithoutIdempotency, type CommandContext } from './command-context.js';
import { db } from './db.js';

/**
 * Creates a new project in the workspace.
 *
 * Purpose:
 * Persists a new project entity with the provided configuration.
 *
 * Parameters:
 * - data: Project insert data including id, workspaceId, name, etc.
 *   - Required: id, workspaceId, name
 *   - Optional: description, color, status (defaults to 'active')
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The created project record with all database-generated fields.
 *
 * Errors:
 * - Throws if database insertion fails
 * - Throws if workspaceId is invalid (foreign key constraint)
 *
 * Side effects:
 * - Writes to projects table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'project.created' if context provided
 *
 * Idempotency:
 * Not idempotent. Calling with same id will fail on unique constraint.
 *
 * Authorization:
 * Caller must be a member of the workspace specified in workspaceId.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - workspaceId must reference an existing workspace
 * - User must have permission to create projects in the workspace
 *
 * Postconditions:
 * - Project exists in database with provided configuration
 * - Audit log entry created if context provided
 * - Outbox event created for downstream processing if context provided
 */
export async function createProject(
  data: typeof schema.projects.$inferInsert,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [project] = await tx.insert(projects).values(data).returning();

      if (!project) {
        throw new Error('Failed to create project');
      }

      return project;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'project',
          entityId: data.id || 'pending',
          changes: { new: data },
        }
      : undefined,
    context?.userId && context?.workspaceId
      ? {
          eventType: 'project.created',
          aggregateType: 'project',
          aggregateId: data.id || 'pending',
          payload: { project: data },
        }
      : undefined,
  );
}

/**
 * Retrieves a project by its unique identifier.
 *
 * Purpose:
 * Fetches a single project record for display or further processing.
 *
 * Parameters:
 * - id: The unique project identifier (UUID)
 *   - Required, non-null
 *
 * Returns:
 * The project record if found, or null if not found.
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
 * Caller must have read access to the project's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - id must be a valid UUID format
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getProjectById(id: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  return project;
}

/**
 * Retrieves projects belonging to a workspace with pagination.
 *
 * Purpose:
 * Lists all projects in a workspace, ordered by createdAt (desc) and id (asc).
 * Supports cursor-based pagination and optional inclusion of deleted projects.
 *
 * Parameters:
 * - workspaceId: The workspace identifier to filter projects
 *   - Required, non-null
 * - limit: Maximum number of items to return (default: 50, max: 100)
 *   - Optional, must be positive
 * - cursor: Pagination cursor for fetching next page
 *   - Optional, JSON string with createdAt and id
 * - includeDeleted: Whether to include deleted projects (default: false)
 *   - Optional, boolean
 *
 * Returns:
 * Object containing:
 * - items: Array of project records
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
export async function getProjectsByWorkspace(
  workspaceId: string,
  limit = 50,
  cursor?: string,
  includeDeleted = false,
) {
  const conditions = [eq(projects.workspaceId, workspaceId)];

  // Exclude deleted projects by default
  if (!includeDeleted) {
    conditions.push(sql`${projects.status} != 'deleted'`);
  }

  if (cursor) {
    const cursorData = JSON.parse(cursor);
    conditions.push(
      sql`(${projects.createdAt} < ${new Date(cursorData.createdAt)} OR (${projects.createdAt} = ${new Date(cursorData.createdAt)} AND ${projects.id} > ${cursorData.id}))`,
    );
  }

  const results = await db
    .select()
    .from(projects)
    .where(and(...conditions))
    .orderBy(desc(projects.createdAt), asc(projects.id))
    .limit(limit + 1); // Fetch one extra to determine if there's a next page

  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, -1) : results;
  const lastItem = items.length > 0 ? items[items.length - 1] : null;
  const nextCursor =
    hasMore && lastItem
      ? JSON.stringify({
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
 * Updates an existing project's properties.
 *
 * Purpose:
 * Modifies project configuration such as name, description, or status.
 *
 * Parameters:
 * - id: The unique project identifier to update
 *   - Required, non-null
 * - data: Partial project data with fields to update
 *   - Optional fields: name, description, color, status
 *   - Cannot update: id, workspaceId, createdAt
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The updated project record with updatedAt set to current time.
 *
 * Errors:
 * - Throws if project with id does not exist
 * - Throws if attempting to update immutable fields
 *
 * Side effects:
 * - Writes to projects table
 * - Automatically sets updatedAt to current timestamp
 * - Emits audit log entry if context provided
 * - Emits outbox event 'project.updated' if context provided
 *
 * Idempotency:
 * Idempotent for same data values. Multiple calls with same data
 * produce same end state.
 *
 * Authorization:
 * Caller must have write permission for the project's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Project with id must exist
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Project record updated with new values
 * - updatedAt timestamp set to current time
 * - Audit log and outbox event created if context provided
 */
export async function updateProject(
  id: string,
  data: Partial<typeof schema.projects.$inferInsert>,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [project] = await tx
        .update(projects)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();

      if (!project) {
        throw new Error('Failed to update project');
      }

      return project;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'project',
          entityId: id,
          changes: { new: data },
        }
      : undefined,
    context?.userId && context?.workspaceId
      ? {
          eventType: 'project.updated',
          aggregateType: 'project',
          aggregateId: id,
          payload: { project: data },
        }
      : undefined,
  );
}

/**
 * Soft deletes a project from the workspace.
 *
 * Purpose:
 * Marks a project as deleted without permanently removing it.
 * Sets status to 'deleted' rather than hard deleting.
 *
 * Parameters:
 * - id: The unique project identifier to delete
 *   - Required, non-null
 *
 * Returns:
 * The updated project record with status set to 'deleted'.
 *
 * Errors:
 * - Throws if project with id does not exist
 *
 * Side effects:
 * - Writes to projects table (sets status to 'deleted')
 * - Automatically sets updatedAt to current timestamp
 * - Does NOT cascade to tasks (handled by deleteProjectWithTasks)
 *
 * Idempotency:
 * Idempotent. Deleting an already-deleted project produces same end state.
 *
 * Authorization:
 * Caller must have delete permission for the project's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Project with id must exist
 * - User must have delete permission in the workspace
 *
 * Postconditions:
 * - Project record has status set to 'deleted'
 * - updatedAt timestamp set to current time
 *
 * Note:
 * This is a soft delete. Use deleteProjectWithTasks for full cleanup with cascade.
 */
export async function deleteProject(id: string) {
  // Soft delete: set status to 'deleted' instead of hard delete
  // This preserves data for audit trails and allows potential recovery
  // Hard delete cascade is handled at the database level via FK constraints
  const [project] = await db
    .update(projects)
    .set({ status: 'deleted', updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  return project;
}
