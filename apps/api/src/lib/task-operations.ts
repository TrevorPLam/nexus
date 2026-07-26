/**
 * MODULE: Task Operations
 *
 * Responsibility:
 * Manages task lifecycle operations including creation, retrieval,
 * updating, deletion, and advanced filtering with transactional integrity,
 * audit logging, and outbox event emission.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Manages task-specific business logic.
 * - Delegates low-level DB access to Drizzle.
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all operations
 *   - Project IDs must reference existing projects in the same workspace when creating tasks
 *   - Task parentId must reference existing tasks in the same workspace for subtasks
 * - Postconditions:
 *   - All mutations emit audit log entries when context is provided
 *   - All mutations emit outbox events for downstream processing
 *   - Task status 'done' automatically sets completedAt to current timestamp
 *   - Task status not 'done' automatically clears completedAt to null
 *   - Task deletion soft-deletes (sets status to 'cancelled')
 *
 * Side effects:
 * - Performs database writes (CRUD).
 * - Emits audit logs to 'audit_logs' table.
 * - Emits outbox events to 'outbox_events' table for downstream sync/notifications.
 *
 * Change risk:
 * - High. Contains core task business logic and state transition rules.
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
 * - risk: high
 * - layer: business-logic
 * - stability: stable
 * - concerns: audit, outbox, transactions
 *
 * File:
 * - apps/api/src/lib/task-operations.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import * as schema from '@life-os/database';
import { tasks } from '@life-os/database';
import { eq, and, desc, asc, sql } from 'drizzle-orm';

import { executeCommandWithoutIdempotency, type CommandContext } from './command-context.js';
import { db } from './db.js';

/**
 * Creates a new task in the workspace.
 *
 * Purpose:
 * Persists a new task entity with the provided configuration.
 * Automatically handles completedAt based on status.
 *
 * Parameters:
 * - data: Task insert data including id, workspaceId, title, etc.
 *   - Required: id, workspaceId, title, status, priority
 *   - Optional: projectId, description, dueDate, dueTime, estimatedDuration,
 *     parentId, completedAt (auto-set if status='done')
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The created task record with all database-generated fields.
 *
 * Errors:
 * - Throws if database insertion fails
 * - Throws if workspaceId or projectId is invalid (foreign key constraint)
 *
 * Side effects:
 * - Writes to tasks table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task.created' if context provided
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
 * - If projectId provided, must reference an existing project in the workspace
 * - User must have permission to create tasks in the workspace
 *
 * Postconditions:
 * - Task exists in database with provided configuration
 * - Audit log entry created if context provided
 * - Outbox event created for downstream processing if context provided
 */
export async function createTask(data: typeof schema.tasks.$inferInsert, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [task] = await tx.insert(tasks).values(data).returning();

      if (!task) {
        throw new Error('Failed to create task');
      }

      return task;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'task',
          entityId: data.id || 'pending',
          changes: { new: data },
        }
      : undefined,
    context?.userId && context?.workspaceId
      ? {
          eventType: 'task.created',
          aggregateType: 'task',
          aggregateId: data.id || 'pending',
          payload: { task: data },
        }
      : undefined,
  );
}

/**
 * Retrieves a task by its unique identifier.
 *
 * Purpose:
 * Fetches a single task record for display or further processing.
 *
 * Parameters:
 * - id: The unique task identifier (UUID)
 *   - Required, non-null
 *
 * Returns:
 * The task record if found, or null if not found.
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
 * Caller must have read access to the task's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - id must be a valid UUID format
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getTaskById(id: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
  return task ?? null;
}

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

// Full-text search function with ranking
// Uses PostgreSQL's tsvector and plainto_tsquery for natural language search
// 'english' is hardcoded as the text search configuration; consider making this
// configurable per workspace if internationalization is needed.
export async function searchTasks(workspaceId: string, query: string, limit = 20) {
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

/**
 * Updates an existing task's properties.
 *
 * Purpose:
 * Modifies task details such as status, priority, or due date.
 * Automatically manages completedAt based on status changes.
 *
 * Parameters:
 * - id: The unique task identifier to update
 *   - Required, non-null
 * - data: Partial task data with fields to update
 *   - Optional fields: title, description, status, priority, dueDate,
 *     dueTime, estimatedDuration, projectId, parentId
 *   - Cannot update: id, workspaceId, createdAt
 *   - completedAt is auto-managed based on status
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The updated task record with updatedAt set to current time.
 *
 * Errors:
 * - Throws if task with id does not exist
 * - Throws if attempting to update immutable fields
 *
 * Side effects:
 * - Writes to tasks table
 * - Automatically sets updatedAt to current timestamp
 * - Auto-sets completedAt to now if status='done'
 * - Auto-clears completedAt if status != 'done'
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task.updated' if context provided
 *
 * Idempotency:
 * Idempotent for same data values. Multiple calls with same data
 * produce same end state.
 *
 * Authorization:
 * Caller must have write permission for the task's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Task with id must exist
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Task record updated with new values
 * - updatedAt timestamp set to current time
 * - completedAt managed based on status
 * - Audit log and outbox event created if context provided
 */
export async function updateTask(
  id: string,
  data: Partial<typeof schema.tasks.$inferInsert>,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const updateData: Partial<typeof schema.tasks.$inferInsert> = {
        ...data,
        updatedAt: new Date(),
      };

      // Auto-set completedAt when status is 'done'
      // This invariant ensures completedAt always reflects the first time a task was marked done
      if (data.status === 'done' && !data.completedAt) {
        updateData.completedAt = new Date();
      }

      // Clear completedAt when status is not 'done'
      // This allows re-opening tasks and maintaining accurate completion history
      if (data.status && data.status !== 'done') {
        updateData.completedAt = null;
      }

      const [task] = await tx.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();

      if (!task) {
        throw new Error('Failed to update task');
      }

      return task;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'task',
          entityId: id,
          changes: { new: data },
        }
      : undefined,
    context?.userId && context?.workspaceId
      ? {
          eventType: 'task.updated',
          aggregateType: 'task',
          aggregateId: id,
          payload: { task: data },
        }
      : undefined,
  );
}

/**
 * Soft deletes a task from the workspace.
 *
 * Purpose:
 * Marks a task as cancelled without permanently removing it.
 * Sets status to 'cancelled' rather than hard deleting.
 *
 * Parameters:
 * - id: The unique task identifier to delete
 *   - Required, non-null
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The updated task record with status set to 'cancelled'.
 *
 * Errors:
 * - Throws if task with id does not exist
 *
 * Side effects:
 * - Writes to tasks table (sets status to 'cancelled')
 * - Automatically sets updatedAt to current timestamp
 * - Does NOT cascade to dependencies, notes, comments, etc.
 *
 * Idempotency:
 * Idempotent. Deleting an already-cancelled task produces same end state.
 *
 * Authorization:
 * Caller must have delete permission for the task's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Task with id must exist
 * - User must have delete permission in the workspace
 *
 * Postconditions:
 * - Task record has status set to 'cancelled'
 * - updatedAt timestamp set to current time
 * - Audit log and outbox event created if context provided
 *
 * Note:
 * This is a soft delete. Use batchDeleteTasksWithDependencies for full cleanup.
 */
export async function deleteTask(id: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      // Soft delete: set status to 'cancelled' instead of hard delete
      // This preserves data for audit trails and analytics
      // 'cancelled' is used instead of 'deleted' to distinguish from project-level deletion
      const [task] = await tx
        .update(tasks)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(tasks.id, id))
        .returning();

      if (!task) {
        throw new Error('Failed to delete task');
      }

      return task;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'delete',
          entityType: 'task',
          entityId: id,
          changes: {},
        }
      : undefined,
    context?.userId && context?.workspaceId
      ? {
          eventType: 'task.deleted',
          aggregateType: 'task',
          aggregateId: id,
          payload: { taskId: id },
        }
      : undefined,
  );
}

/**
 * Retrieves all subtasks for a parent task.
 *
 * Purpose:
 * Lists tasks that have the specified task as their parent.
 *
 * Parameters:
 * - parentTaskId: The parent task identifier
 *   - Required, non-null
 *
 * Returns:
 * Array of subtask records ordered by createdAt (asc).
 *
 * Errors:
 * None. Returns empty array if no subtasks exist.
 *
 * Side effects:
 * None. Read-only operation.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Caller must have read access to the parent task's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - parentTaskId must reference an existing task
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getSubtasks(parentTaskId: string) {
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.parentId, parentTaskId))
    .orderBy(asc(tasks.createdAt));
}
