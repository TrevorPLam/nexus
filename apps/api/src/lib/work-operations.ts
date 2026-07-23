/**
 * MODULE: Work Management Operations
 *
 * Responsibility:
 * Orchestrates business logic for work management entities (projects, tasks, etc.).
 * Handles CRUD operations with transactional integrity, audit logging, and
 * outbox event emission.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Manages cross-entity logic (e.g., circular dependency checks).
 * - Delegates low-level DB access to Drizzle.
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all workspace-scoped operations
 *   - Project IDs must reference existing projects in the same workspace when creating tasks
 *   - Task parentId must reference existing tasks in the same workspace for subtasks
 *   - Task dependencies must not create circular references (validated by DFS check)
 *   - Task calendarEventId must reference existing events in the same workspace
 *   - User IDs must reference existing app_users for assignees and comments
 * - Postconditions:
 *   - All mutations emit audit log entries when context is provided
 *   - All mutations emit outbox events for downstream processing
 *   - Task status 'done' automatically sets completedAt to current timestamp
 *   - Task status not 'done' automatically clears completedAt to null
 *   - Circular dependency creation throws error before database write
 *   - Project deletion soft-deletes (sets status to 'deleted')
 *   - Task deletion soft-deletes (sets status to 'cancelled')
 *   - Test coverage: See apps/api/src/routes/work/*.test.ts (PARTIAL COVERAGE - projects.test.ts, tasks.test.ts, task-dependencies.test.ts, task-notes.test.ts, batch-operations.test.ts exist)
 *
 * Side effects:
 * - Performs database writes (CRUD).
 * - Emits audit logs to 'audit_logs' table.
 * - Emits outbox events to 'outbox_events' table for downstream sync/notifications.
 *
 * Change risk:
 * - High. Contains core business logic and state transition rules.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/work.ts (persistence layer)
 * - packages/contracts/src/work.ts (domain schemas)
 * - apps/api/src/routes/work.ts (API routes)
 *
 * Tags:
 * - domain: work-management
 * - risk: high
 * - layer: business-logic
 * - stability: stable
 * - concerns: audit, outbox, transactions, dependencies
 *
 * File:
 * - apps/api/src/lib/work-operations.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import * as schema from '@life-os/database';
import {
  projects,
  tasks,
  taskDependencies,
  taskNotes,
  taskAssignees,
  taskComments,
  taskAttachments,
  timeEntries,
  events,
  calendars,
} from '@life-os/database';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';

import { createAuditLog, createOutboxEvent } from './audit.js';
import { executeCommandWithoutIdempotency, type CommandContext } from './command-context.js';
import { db } from './db.js';
import { checkIdempotencyKey, createIdempotencyKey } from './idempotency.js';

/**
 * Executes a callback within a database transaction.
 *
 * Purpose:
 * Provides a transaction wrapper for complex operations that require
 * atomicity across multiple database writes.
 *
 * Parameters:
 * - callback: Async function that receives a transaction object
 *   - Required, non-null
 *   - The transaction object (tx) should be used for all DB operations
 *
 * Returns:
 * The return value of the callback function.
 *
 * Errors:
 * - Throws if callback throws (transaction will be rolled back)
 * - Throws if database connection fails
 *
 * Side effects:
 * - Begins a database transaction
 * - Commits transaction if callback succeeds
 * - Rolls back transaction if callback throws
 *
 * Idempotency:
 * Depends on the callback. The wrapper itself is idempotent.
 *
 * Authorization:
 * No authorization checks performed here; caller must enforce.
 *
 * Preconditions:
 * - Database connection must be available
 *
 * Postconditions:
 * - All writes in callback are committed atomically if successful
 * - No writes persist if callback throws
 */
// Transaction wrapper for complex operations
export async function withTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
  return db.transaction(callback);
}

/**
 * PROJECT OPERATIONS
 * Logic for managing projects and their lifecycle.
 */

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

/**
 * TASK OPERATIONS
 * Core logic for task lifecycle, including complex filtering and full-text search.
 */

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
 * TASK DEPENDENCY OPERATIONS
 * Manages relationships between tasks and prevents circularity.
 */

/**
 * Creates a dependency relationship between tasks.
 *
 * Purpose:
 * Establishes that one task depends on another, with circular
 * dependency detection to prevent invalid graphs.
 *
 * Parameters:
 * - data: Task dependency insert data
 *   - Required: taskId, dependsOnTaskId, type
 *   - type values: 'blocked_by', 'related_to', etc.
 *
 * Returns:
 * The created dependency record.
 *
 * Errors:
 * - Throws if database insertion fails
 * - Throws if circular dependency would be created
 * - Throws if taskId or dependsOnTaskId is invalid
 *
 * Side effects:
 * - Writes to task_dependencies table
 * - Performs DFS to check for circular dependencies before insertion
 *
 * Idempotency:
 * Not idempotent. Creating the same dependency twice will fail
 * on unique constraint if one exists.
 *
 * Authorization:
 * Caller must have write permission for both tasks' workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - taskId must reference an existing task
 * - dependsOnTaskId must reference an existing task
 * - Both tasks must belong to the same workspace
 * - Creating the dependency must not create a cycle
 *
 * Postconditions:
 * - Dependency record exists in database
 * - No circular dependencies exist in the graph
 */
export async function createTaskDependency(data: typeof schema.taskDependencies.$inferInsert) {
  // Check for circular dependency before creating
  const hasCycle = await checkCircularDependency(data.taskId, data.dependsOnTaskId);
  if (hasCycle) {
    throw new Error('Cannot create circular dependency');
  }

  const [dependency] = await db.insert(taskDependencies).values(data).returning();
  return dependency;
}

/**
 * Retrieves all dependencies for a specific task.
 *
 * Purpose:
 * Lists all tasks that the specified task depends on.
 *
 * Parameters:
 * - taskId: The task identifier to get dependencies for
 *   - Required, non-null
 *
 * Returns:
 * Array of dependency records showing what this task depends on.
 *
 * Errors:
 * None. Returns empty array if task has no dependencies.
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
 * - taskId must reference an existing task
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getTaskDependencies(taskId: string) {
  return db.select().from(taskDependencies).where(eq(taskDependencies.taskId, taskId));
}

/**
 * Deletes a task dependency relationship.
 *
 * Purpose:
 * Removes a dependency between tasks.
 *
 * Parameters:
 * - id: The unique dependency identifier to delete
 *   - Required, non-null
 *
 * Returns:
 * The deleted dependency record.
 *
 * Errors:
 * - Throws if dependency with id does not exist
 *
 * Side effects:
 * - Hard deletes from task_dependencies table
 *
 * Idempotency:
 * Not idempotent. Second call will fail as record no longer exists.
 *
 * Authorization:
 * Caller must have write permission for the tasks' workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Dependency with id must exist
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Dependency record permanently removed from database
 */
export async function deleteTaskDependency(id: string) {
  const [dependency] = await db
    .delete(taskDependencies)
    .where(eq(taskDependencies.id, id))
    .returning();
  return dependency;
}

// Circular dependency validation using DFS
// We check if adding taskId -> dependsOnTaskId would create a cycle by tracing
// backwards from dependsOnTaskId to see if it eventually leads back to taskId.
async function checkCircularDependency(taskId: string, dependsOnTaskId: string): Promise<boolean> {
  // If dependsOnTaskId depends on taskId (directly or indirectly), we have a cycle
  return hasPath(dependsOnTaskId, taskId, new Set());
}

async function hasPath(from: string, to: string, visited: Set<string>): Promise<boolean> {
  if (from === to) return true;
  if (visited.has(from)) return false;

  visited.add(from);

  // Get all tasks that depend on 'from' (reverse traversal)
  // This finds tasks where dependsOnTaskId = from, i.e., tasks that wait for 'from'
  const dependencies = await db
    .select()
    .from(taskDependencies)
    .where(eq(taskDependencies.dependsOnTaskId, from));

  for (const dep of dependencies) {
    if (await hasPath(dep.taskId, to, visited)) {
      return true;
    }
  }

  return false;
}

/**
 * Retrieves projects with their associated tasks.
 *
 * Purpose:
 * Fetches projects for a workspace and includes their tasks
 * in a single response for efficient frontend rendering.
 *
 * Parameters:
 * - workspaceId: The workspace identifier
 *   - Required, non-null
 * - limit: Maximum number of projects to return (default: 50)
 *   - Optional, must be positive
 * - cursor: Pagination cursor for fetching next page
 *   - Optional, JSON string
 *
 * Returns:
 * Object containing:
 * - items: Array of project records with tasks array added
 * - nextCursor: Cursor for next page or null
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
 *
 * Performance:
 * Makes N+1 queries (one for projects, one per project for tasks).
 * Consider optimizing with a single join query for large workspaces.
 */
// Batch operations
export async function getProjectsWithTasks(workspaceId: string, limit = 50, cursor?: string) {
  const result = await getProjectsByWorkspace(workspaceId, limit, cursor);

  const projectsWithTasks = await Promise.all(
    result.items.map(async (project) => {
      const taskList = await getTasksByProject(project.id);
      return {
        ...project,
        tasks: taskList,
      };
    }),
  );

  return {
    items: projectsWithTasks,
    nextCursor: result.nextCursor,
    hasMore: result.hasMore,
  };
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
// Subtask Operations
export async function getSubtasks(parentTaskId: string) {
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.parentId, parentTaskId))
    .orderBy(asc(tasks.createdAt));
}

/**
 * Creates a new note for a task.
 *
 * Purpose:
 * Persists a note attached to a task for documentation or
 * reference purposes.
 *
 * Parameters:
 * - data: Task note insert data
 *   - Required: id, taskId, content
 *   - Optional: createdBy
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The created note record.
 *
 * Errors:
 * - Throws if database insertion fails
 * - Throws if taskId is invalid (foreign key constraint)
 *
 * Side effects:
 * - Writes to task_notes table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task_note.created' if context provided
 *
 * Idempotency:
 * Not idempotent. Calling with same id will fail on unique constraint.
 *
 * Authorization:
 * Caller must have write permission for the task's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - taskId must reference an existing task
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Note record exists in database
 * - Audit log and outbox event created if context provided
 */
// Task Note Operations
export async function createTaskNote(
  data: typeof schema.taskNotes.$inferInsert,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [note] = await tx.insert(taskNotes).values(data).returning();
      return note;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'task_note',
          entityId: data.taskId,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'task_note.created',
      aggregateType: 'task',
      aggregateId: data.taskId,
      payload: { note: data },
    },
  );
}

/**
 * Retrieves a task note by its unique identifier.
 *
 * Purpose:
 * Fetches a single note record for display or editing.
 *
 * Parameters:
 * - id: The unique note identifier (UUID)
 *   - Required, non-null
 *
 * Returns:
 * The note record if found, or null if not found.
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
 * Caller must have read access to the note's task workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - id must be a valid UUID format
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getTaskNoteById(id: string) {
  const [note] = await db.select().from(taskNotes).where(eq(taskNotes.id, id));
  return note;
}

/**
 * Retrieves all notes for a specific task.
 *
 * Purpose:
 * Lists all notes attached to a task, ordered by creation date.
 *
 * Parameters:
 * - taskId: The task identifier to get notes for
 *   - Required, non-null
 *
 * Returns:
 * Array of note records ordered by createdAt (desc).
 *
 * Errors:
 * None. Returns empty array if task has no notes.
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
 * - taskId must reference an existing task
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getTaskNotesByTask(taskId: string) {
  return db
    .select()
    .from(taskNotes)
    .where(eq(taskNotes.taskId, taskId))
    .orderBy(desc(taskNotes.createdAt));
}

/**
 * Updates an existing task note.
 *
 * Purpose:
 * Modifies note content or metadata.
 *
 * Parameters:
 * - id: The unique note identifier to update
 *   - Required, non-null
 * - data: Partial note data with fields to update
 *   - Optional fields: content, createdBy
 *   - Cannot update: id, taskId, createdAt
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The updated note record with updatedAt set to current time.
 *
 * Errors:
 * - Throws if note with id does not exist
 *
 * Side effects:
 * - Writes to task_notes table
 * - Automatically sets updatedAt to current timestamp
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task_note.updated' if context provided
 *
 * Idempotency:
 * Idempotent for same data values.
 *
 * Authorization:
 * Caller must have write permission for the note's task workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Note with id must exist
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Note record updated with new values
 * - updatedAt timestamp set to current time
 * - Audit log and outbox event created if context provided
 */
export async function updateTaskNote(
  id: string,
  data: Partial<typeof schema.taskNotes.$inferInsert>,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [note] = await tx
        .update(taskNotes)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(taskNotes.id, id))
        .returning();
      return note;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'task_note',
          entityId: id,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'task_note.updated',
      aggregateType: 'task',
      aggregateId: id,
      payload: { note: data },
    },
  );
}

/**
 * Deletes a task note.
 *
 * Purpose:
 * Permanently removes a note from the database.
 *
 * Parameters:
 * - id: The unique note identifier to delete
 *   - Required, non-null
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The deleted note record.
 *
 * Errors:
 * - Throws if note with id does not exist
 *
 * Side effects:
 * - Hard deletes from task_notes table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task_note.deleted' if context provided
 *
 * Idempotency:
 * Not idempotent. Second call will fail as record no longer exists.
 *
 * Authorization:
 * Caller must have delete permission for the note's task workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Note with id must exist
 * - User must have delete permission in the workspace
 *
 * Postconditions:
 * - Note record permanently removed from database
 * - Audit log and outbox event created if context provided
 */
export async function deleteTaskNote(id: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [note] = await tx.delete(taskNotes).where(eq(taskNotes.id, id)).returning();
      return note;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'delete',
          entityType: 'task_note',
          entityId: id,
          changes: {},
        }
      : undefined,
    {
      eventType: 'task_note.deleted',
      aggregateType: 'task',
      aggregateId: id,
      payload: { noteId: id },
    },
  );
}

/**
 * Batch completes multiple tasks in a single operation.
 *
 * Purpose:
 * Sets status to 'done' and completedAt to now for all specified tasks.
 *
 * Parameters:
 * - taskIds: Array of task identifiers to complete
 *   - Required, non-null, non-empty
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * Array of updated task records.
 *
 * Errors:
 * - Throws if database update fails
 *
 * Side effects:
 * - Writes to tasks table (sets status='done', completedAt=now)
 * - Automatically sets updatedAt to current timestamp
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task.batch_completed' if context provided
 *
 * Idempotency:
 * Idempotent. Completing already-done tasks produces same end state.
 *
 * Authorization:
 * Caller must have write permission for all tasks' workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - All taskIds must reference existing tasks
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - All specified tasks have status='done' and completedAt set
 * - Audit log and outbox event created if context provided
 */
// Batch Task Operations
export async function batchCompleteTasks(taskIds: string[], context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      return tx
        .update(tasks)
        .set({
          status: 'done',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(inArray(tasks.id, taskIds))
        .returning();
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'task',
          entityId: 'batch',
          changes: { new: { status: 'done' } },
        }
      : undefined,
    context?.userId && context?.workspaceId
      ? {
          eventType: 'task.batch_completed',
          aggregateType: 'task',
          aggregateId: 'batch',
          payload: { taskIds },
        }
      : undefined,
  );
}

/**
 * Batch defers multiple tasks to a specific date.
 *
 * Purpose:
 * Updates the due date for all specified tasks to a future date.
 *
 * Parameters:
 * - taskIds: Array of task identifiers to defer
 *   - Required, non-null, non-empty
 * - deferToDate: The new due date to set
 *   - Required, non-null
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * Array of updated task records.
 *
 * Errors:
 * - Throws if database update fails
 *
 * Side effects:
 * - Writes to tasks table (sets dueDate)
 * - Automatically sets updatedAt to current timestamp
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task.batch_deferred' if context provided
 *
 * Idempotency:
 * Idempotent for same deferToDate value.
 *
 * Authorization:
 * Caller must have write permission for all tasks' workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - All taskIds must reference existing tasks
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - All specified tasks have dueDate set to deferToDate
 * - Audit log and outbox event created if context provided
 */
export async function batchDeferTasks(
  taskIds: string[],
  deferToDate: Date,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      return tx
        .update(tasks)
        .set({
          dueDate: deferToDate,
          updatedAt: new Date(),
        })
        .where(inArray(tasks.id, taskIds))
        .returning();
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'task',
          entityId: 'batch',
          changes: { new: { dueDate: deferToDate } },
        }
      : undefined,
    context?.userId && context?.workspaceId
      ? {
          eventType: 'task.batch_deferred',
          aggregateType: 'task',
          aggregateId: 'batch',
          payload: { taskIds, deferToDate },
        }
      : undefined,
  );
}

/**
 * Batch reschedules multiple tasks to a new due date.
 *
 * Purpose:
 * Updates the due date for all specified tasks.
 *
 * Parameters:
 * - taskIds: Array of task identifiers to reschedule
 *   - Required, non-null, non-empty
 * - newDueDate: The new due date to set
 *   - Required, non-null
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * Array of updated task records.
 *
 * Errors:
 * - Throws if database update fails
 *
 * Side effects:
 * - Writes to tasks table (sets dueDate)
 * - Automatically sets updatedAt to current timestamp
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task.batch_rescheduled' if context provided
 *
 * Idempotency:
 * Idempotent for same newDueDate value.
 *
 * Authorization:
 * Caller must have write permission for all tasks' workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - All taskIds must reference existing tasks
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - All specified tasks have dueDate set to newDueDate
 * - Audit log and outbox event created if context provided
 */
export async function batchRescheduleTasks(
  taskIds: string[],
  newDueDate: Date,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      return tx
        .update(tasks)
        .set({
          dueDate: newDueDate,
          updatedAt: new Date(),
        })
        .where(inArray(tasks.id, taskIds))
        .returning();
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'task',
          entityId: 'batch',
          changes: { new: { dueDate: newDueDate } },
        }
      : undefined,
    context?.userId && context?.workspaceId
      ? {
          eventType: 'task.batch_rescheduled',
          aggregateType: 'task',
          aggregateId: 'batch',
          payload: { taskIds, newDueDate },
        }
      : undefined,
  );
}

/**
 * Batch updates the status of multiple tasks.
 *
 * Purpose:
 * Sets the status for all specified tasks, automatically managing
 * completedAt based on the new status.
 *
 * Parameters:
 * - taskIds: Array of task identifiers to update
 *   - Required, non-null, non-empty
 * - newStatus: The new status to set
 *   - Required, non-null
 *   - Values: 'todo', 'in_progress', 'done', 'cancelled', etc.
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * Array of updated task records.
 *
 * Errors:
 * - Throws if database update fails
 *
 * Side effects:
 * - Writes to tasks table (sets status)
 * - Auto-sets completedAt to now if newStatus='done'
 * - Auto-clears completedAt if newStatus != 'done'
 * - Automatically sets updatedAt to current timestamp
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task.batch_status_updated' if context provided
 *
 * Idempotency:
 * Idempotent for same newStatus value.
 *
 * Authorization:
 * Caller must have write permission for all tasks' workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - All taskIds must reference existing tasks
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - All specified tasks have status set to newStatus
 * - completedAt managed based on status
 * - Audit log and outbox event created if context provided
 */
export async function batchUpdateTaskStatus(
  taskIds: string[],
  newStatus: string,
  context?: CommandContext,
) {
  const updateData: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };

  if (newStatus === 'done') {
    updateData.completedAt = new Date();
  } else {
    updateData.completedAt = null;
  }

  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      return tx.update(tasks).set(updateData).where(inArray(tasks.id, taskIds)).returning();
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'task',
          entityId: 'batch',
          changes: { new: { status: newStatus } },
        }
      : undefined,
    context?.userId && context?.workspaceId
      ? {
          eventType: 'task.batch_status_updated',
          aggregateType: 'task',
          aggregateId: 'batch',
          payload: { taskIds, newStatus },
        }
      : undefined,
  );
}

/**
 * Creates a task assignee relationship.
 *
 * Purpose:
 * Assigns a user to a task, optionally marking them as primary.
 *
 * Parameters:
 * - data: Task assignee insert data
 *   - Required: id, taskId, userId, assignedBy
 *   - Optional: isPrimary (defaults to false)
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The created assignee record.
 *
 * Errors:
 * - Throws if database insertion fails
 * - Throws if taskId or userId is invalid (foreign key constraint)
 *
 * Side effects:
 * - Writes to task_assignees table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task_assignee.created' if context provided
 *
 * Idempotency:
 * Not idempotent. Creating the same assignment twice will fail
 * on unique constraint if one exists.
 *
 * Authorization:
 * Caller must have write permission for the task's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - taskId must reference an existing task
 * - userId must reference an existing user
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Assignee record exists in database
 * - Audit log and outbox event created if context provided
 */
// Task Assignee Operations
export async function createTaskAssignee(
  data: typeof schema.taskAssignees.$inferInsert,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [assignee] = await tx.insert(taskAssignees).values(data).returning();
      return assignee;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'task_assignee',
          entityId: data.taskId,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'task_assignee.created',
      aggregateType: 'task',
      aggregateId: data.taskId,
      payload: { assignee: data },
    },
  );
}

/**
 * Retrieves all assignees for a specific task.
 *
 * Purpose:
 * Lists all users assigned to a task.
 *
 * Parameters:
 * - taskId: The task identifier to get assignees for
 *   - Required, non-null
 *
 * Returns:
 * Array of assignee records.
 *
 * Errors:
 * None. Returns empty array if task has no assignees.
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
 * - taskId must reference an existing task
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getTaskAssignees(taskId: string) {
  return db.select().from(taskAssignees).where(eq(taskAssignees.taskId, taskId));
}

/**
 * Deletes a task assignee relationship.
 *
 * Purpose:
 * Removes a user's assignment from a task.
 *
 * Parameters:
 * - id: The unique assignee identifier to delete
 *   - Required, non-null
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The deleted assignee record.
 *
 * Errors:
 * - Throws if assignee with id does not exist
 *
 * Side effects:
 * - Hard deletes from task_assignees table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task_assignee.deleted' if context provided
 *
 * Idempotency:
 * Not idempotent. Second call will fail as record no longer exists.
 *
 * Authorization:
 * Caller must have write permission for the task's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Assignee with id must exist
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Assignee record permanently removed from database
 * - Audit log and outbox event created if context provided
 */
export async function deleteTaskAssignee(id: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [assignee] = await tx.delete(taskAssignees).where(eq(taskAssignees.id, id)).returning();
      return assignee;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'delete',
          entityType: 'task_assignee',
          entityId: id,
          changes: {},
        }
      : undefined,
    {
      eventType: 'task_assignee.deleted',
      aggregateType: 'task',
      aggregateId: id,
      payload: { assigneeId: id },
    },
  );
}

/**
 * Creates a new comment for a task.
 *
 * Purpose:
 * Persists a comment attached to a task for collaboration.
 *
 * Parameters:
 * - data: Task comment insert data
 *   - Required: id, taskId, content, createdBy
 *   - Optional: parentId (for threaded replies)
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The created comment record.
 *
 * Errors:
 * - Throws if database insertion fails
 * - Throws if taskId is invalid (foreign key constraint)
 *
 * Side effects:
 * - Writes to task_comments table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task_comment.created' if context provided
 *
 * Idempotency:
 * Not idempotent. Calling with same id will fail on unique constraint.
 *
 * Authorization:
 * Caller must have write permission for the task's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - taskId must reference an existing task
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Comment record exists in database
 * - Audit log and outbox event created if context provided
 */
// Task Comment Operations
export async function createTaskComment(
  data: typeof schema.taskComments.$inferInsert,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [comment] = await tx.insert(taskComments).values(data).returning();
      return comment;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'task_comment',
          entityId: data.taskId,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'task_comment.created',
      aggregateType: 'task',
      aggregateId: data.taskId,
      payload: { comment: data },
    },
  );
}

/**
 * Retrieves a task comment by its unique identifier.
 *
 * Purpose:
 * Fetches a single comment record for display or editing.
 *
 * Parameters:
 * - id: The unique comment identifier (UUID)
 *   - Required, non-null
 *
 * Returns:
 * The comment record if found, or null if not found.
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
 * Caller must have read access to the comment's task workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - id must be a valid UUID format
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getTaskCommentById(id: string) {
  const [comment] = await db.select().from(taskComments).where(eq(taskComments.id, id));
  return comment;
}

/**
 * Retrieves all comments for a specific task.
 *
 * Purpose:
 * Lists all comments attached to a task, ordered by creation date.
 *
 * Parameters:
 * - taskId: The task identifier to get comments for
 *   - Required, non-null
 *
 * Returns:
 * Array of comment records ordered by createdAt (desc).
 *
 * Errors:
 * None. Returns empty array if task has no comments.
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
 * - taskId must reference an existing task
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getTaskCommentsByTask(taskId: string) {
  return db
    .select()
    .from(taskComments)
    .where(eq(taskComments.taskId, taskId))
    .orderBy(desc(taskComments.createdAt));
}

/**
 * Updates an existing task comment.
 *
 * Purpose:
 * Modifies comment content or metadata.
 *
 * Parameters:
 * - id: The unique comment identifier to update
 *   - Required, non-null
 * - data: Partial comment data with fields to update
 *   - Optional fields: content
 *   - Cannot update: id, taskId, createdBy, createdAt
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The updated comment record with updatedAt set to current time.
 *
 * Errors:
 * - Throws if comment with id does not exist
 *
 * Side effects:
 * - Writes to task_comments table
 * - Automatically sets updatedAt to current timestamp
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task_comment.updated' if context provided
 *
 * Idempotency:
 * Idempotent for same data values.
 *
 * Authorization:
 * Caller must have write permission for the comment's task workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Comment with id must exist
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Comment record updated with new values
 * - updatedAt timestamp set to current time
 * - Audit log and outbox event created if context provided
 */
export async function updateTaskComment(
  id: string,
  data: Partial<typeof schema.taskComments.$inferInsert>,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [comment] = await tx
        .update(taskComments)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(taskComments.id, id))
        .returning();
      return comment;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'task_comment',
          entityId: id,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'task_comment.updated',
      aggregateType: 'task',
      aggregateId: id,
      payload: { comment: data },
    },
  );
}

/**
 * Deletes a task comment.
 *
 * Purpose:
 * Permanently removes a comment from the database.
 *
 * Parameters:
 * - id: The unique comment identifier to delete
 *   - Required, non-null
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The deleted comment record.
 *
 * Errors:
 * - Throws if comment with id does not exist
 *
 * Side effects:
 * - Hard deletes from task_comments table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task_comment.deleted' if context provided
 *
 * Idempotency:
 * Not idempotent. Second call will fail as record no longer exists.
 *
 * Authorization:
 * Caller must have delete permission for the comment's task workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Comment with id must exist
 * - User must have delete permission in the workspace
 *
 * Postconditions:
 * - Comment record permanently removed from database
 * - Audit log and outbox event created if context provided
 */
export async function deleteTaskComment(id: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [comment] = await tx.delete(taskComments).where(eq(taskComments.id, id)).returning();
      return comment;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'delete',
          entityType: 'task_comment',
          entityId: id,
          changes: {},
        }
      : undefined,
    {
      eventType: 'task_comment.deleted',
      aggregateType: 'task',
      aggregateId: id,
      payload: { commentId: id },
    },
  );
}

/**
 * Creates a new attachment for a task.
 *
 * Purpose:
 * Persists a file attachment reference for a task.
 *
 * Parameters:
 * - data: Task attachment insert data
 *   - Required: id, taskId, fileName, fileUrl, uploadedBy
 *   - Optional: fileSize, mimeType
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The created attachment record.
 *
 * Errors:
 * - Throws if database insertion fails
 * - Throws if taskId is invalid (foreign key constraint)
 *
 * Side effects:
 * - Writes to task_attachments table
 * - Does NOT manage file storage (file must already be stored)
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task_attachment.created' if context provided
 *
 * Idempotency:
 * Not idempotent. Calling with same id will fail on unique constraint.
 *
 * Authorization:
 * Caller must have write permission for the task's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - taskId must reference an existing task
 * - File must already be stored in storage service
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Attachment record exists in database
 * - Audit log and outbox event created if context provided
 *
 * Note:
 * This function only stores metadata. File deletion is not handled here.
 */
// Task Attachment Operations
export async function createTaskAttachment(
  data: typeof schema.taskAttachments.$inferInsert,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [attachment] = await tx.insert(taskAttachments).values(data).returning();
      return attachment;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'task_attachment',
          entityId: data.taskId,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'task_attachment.created',
      aggregateType: 'task',
      aggregateId: data.taskId,
      payload: { attachment: data },
    },
  );
}

/**
 * Retrieves a task attachment by its unique identifier.
 *
 * Purpose:
 * Fetches a single attachment record for display or download.
 *
 * Parameters:
 * - id: The unique attachment identifier (UUID)
 *   - Required, non-null
 *
 * Returns:
 * The attachment record if found, or null if not found.
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
 * Caller must have read access to the attachment's task workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - id must be a valid UUID format
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getTaskAttachmentById(id: string) {
  const [attachment] = await db.select().from(taskAttachments).where(eq(taskAttachments.id, id));
  return attachment;
}

/**
 * Retrieves all attachments for a specific task.
 *
 * Purpose:
 * Lists all file attachments attached to a task.
 *
 * Parameters:
 * - taskId: The task identifier to get attachments for
 *   - Required, non-null
 *
 * Returns:
 * Array of attachment records ordered by createdAt (desc).
 *
 * Errors:
 * None. Returns empty array if task has no attachments.
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
 * - taskId must reference an existing task
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getTaskAttachmentsByTask(taskId: string) {
  return db
    .select()
    .from(taskAttachments)
    .where(eq(taskAttachments.taskId, taskId))
    .orderBy(desc(taskAttachments.createdAt));
}

/**
 * Deletes a task attachment.
 *
 * Purpose:
 * Permanently removes an attachment reference from the database.
 *
 * Parameters:
 * - id: The unique attachment identifier to delete
 *   - Required, non-null
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The deleted attachment record.
 *
 * Errors:
 * - Throws if attachment with id does not exist
 *
 * Side effects:
 * - Hard deletes from task_attachments table
 * - Does NOT delete the actual file from storage
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task_attachment.deleted' if context provided
 *
 * Idempotency:
 * Not idempotent. Second call will fail as record no longer exists.
 *
 * Authorization:
 * Caller must have delete permission for the attachment's task workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Attachment with id must exist
 * - User must have delete permission in the workspace
 *
 * Postconditions:
 * - Attachment record permanently removed from database
 * - Audit log and outbox event created if context provided
 *
 * Note:
 * File deletion from storage must be handled separately via storage service.
 */
export async function deleteTaskAttachment(id: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [attachment] = await tx
        .delete(taskAttachments)
        .where(eq(taskAttachments.id, id))
        .returning();
      return attachment;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'delete',
          entityType: 'task_attachment',
          entityId: id,
          changes: {},
        }
      : undefined,
    {
      eventType: 'task_attachment.deleted',
      aggregateType: 'task',
      aggregateId: id,
      payload: { attachmentId: id },
    },
  );
}

/**
 * Creates a new time entry for a task.
 *
 * Purpose:
 * Records time spent working on a task for tracking and billing.
 *
 * Parameters:
 * - data: Time entry insert data
 *   - Required: id, taskId, userId, startedAt
 *   - Optional: endedAt, description
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The created time entry record.
 *
 * Errors:
 * - Throws if database insertion fails
 * - Throws if taskId or userId is invalid (foreign key constraint)
 *
 * Side effects:
 * - Writes to time_entries table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'time_entry.created' if context provided
 *
 * Idempotency:
 * Not idempotent. Calling with same id will fail on unique constraint.
 *
 * Authorization:
 * Caller must have write permission for the task's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - taskId must reference an existing task
 * - userId must reference an existing user
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Time entry record exists in database
 * - Audit log and outbox event created if context provided
 */
// Time Entry Operations
export async function createTimeEntry(
  data: typeof schema.timeEntries.$inferInsert,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [entry] = await tx.insert(timeEntries).values(data).returning();
      return entry;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'time_entry',
          entityId: data.taskId,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'time_entry.created',
      aggregateType: 'task',
      aggregateId: data.taskId,
      payload: { entry: data },
    },
  );
}

/**
 * Retrieves a time entry by its unique identifier.
 *
 * Purpose:
 * Fetches a single time entry record for display or editing.
 *
 * Parameters:
 * - id: The unique time entry identifier (UUID)
 *   - Required, non-null
 *
 * Returns:
 * The time entry record if found, or null if not found.
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
 * Caller must have read access to the time entry's task workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - id must be a valid UUID format
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getTimeEntryById(id: string) {
  const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id));
  return entry;
}

/**
 * Retrieves all time entries for a specific task.
 *
 * Purpose:
 * Lists all time entries for a task, ordered by start time.
 *
 * Parameters:
 * - taskId: The task identifier to get time entries for
 *   - Required, non-null
 *
 * Returns:
 * Array of time entry records ordered by startedAt (desc).
 *
 * Errors:
 * None. Returns empty array if task has no time entries.
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
 * - taskId must reference an existing task
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getTimeEntriesByTask(taskId: string) {
  return db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.taskId, taskId))
    .orderBy(desc(timeEntries.startedAt));
}

/**
 * Retrieves time entries for a user with optional date filtering.
 *
 * Purpose:
 * Lists all time entries for a user, optionally filtered by date range.
 *
 * Parameters:
 * - userId: The user identifier to get time entries for
 *   - Required, non-null
 * - startDate: Optional start date filter (inclusive)
 *   - Optional, non-null
 * - endDate: Optional end date filter (inclusive)
 *   - Optional, non-null
 *
 * Returns:
 * Array of time entry records ordered by startedAt (desc).
 *
 * Errors:
 * None. Returns empty array if user has no time entries.
 *
 * Side effects:
 * None. Read-only operation.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Caller must have read access to the user's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - userId must reference an existing user
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getTimeEntriesByUser(userId: string, startDate?: Date, endDate?: Date) {
  const conditions = [eq(timeEntries.userId, userId)];

  if (startDate) {
    conditions.push(sql`${timeEntries.startedAt} >= ${startDate}`);
  }

  if (endDate) {
    conditions.push(sql`${timeEntries.startedAt} <= ${endDate}`);
  }

  return db
    .select()
    .from(timeEntries)
    .where(and(...conditions))
    .orderBy(desc(timeEntries.startedAt));
}

/**
 * Updates an existing time entry.
 *
 * Purpose:
 * Modifies time entry details such as duration or description.
 *
 * Parameters:
 * - id: The unique time entry identifier to update
 *   - Required, non-null
 * - data: Partial time entry data with fields to update
 *   - Optional fields: startedAt, endedAt, description
 *   - Cannot update: id, taskId, userId, createdAt
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The updated time entry record with updatedAt set to current time.
 *
 * Errors:
 * - Throws if time entry with id does not exist
 *
 * Side effects:
 * - Writes to time_entries table
 * - Automatically sets updatedAt to current timestamp
 * - Emits audit log entry if context provided
 * - Emits outbox event 'time_entry.updated' if context provided
 *
 * Idempotency:
 * Idempotent for same data values.
 *
 * Authorization:
 * Caller must have write permission for the time entry's task workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Time entry with id must exist
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Time entry record updated with new values
 * - updatedAt timestamp set to current time
 * - Audit log and outbox event created if context provided
 */
export async function updateTimeEntry(
  id: string,
  data: Partial<typeof schema.timeEntries.$inferInsert>,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [entry] = await tx
        .update(timeEntries)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(timeEntries.id, id))
        .returning();
      return entry;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'time_entry',
          entityId: id,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'time_entry.updated',
      aggregateType: 'task',
      aggregateId: id,
      payload: { entry: data },
    },
  );
}

/**
 * Deletes a time entry.
 *
 * Purpose:
 * Permanently removes a time entry from the database.
 *
 * Parameters:
 * - id: The unique time entry identifier to delete
 *   - Required, non-null
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The deleted time entry record.
 *
 * Errors:
 * - Throws if time entry with id does not exist
 *
 * Side effects:
 * - Hard deletes from time_entries table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'time_entry.deleted' if context provided
 *
 * Idempotency:
 * Not idempotent. Second call will fail as record no longer exists.
 *
 * Authorization:
 * Caller must have delete permission for the time entry's task workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Time entry with id must exist
 * - User must have delete permission in the workspace
 *
 * Postconditions:
 * - Time entry record permanently removed from database
 * - Audit log and outbox event created if context provided
 */
export async function deleteTimeEntry(id: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [entry] = await tx.delete(timeEntries).where(eq(timeEntries.id, id)).returning();
      return entry;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'delete',
          entityType: 'time_entry',
          entityId: id,
          changes: {},
        }
      : undefined,
    {
      eventType: 'time_entry.deleted',
      aggregateType: 'task',
      aggregateId: id,
      payload: { entryId: id },
    },
  );
}

// Transaction-based complex operations

/**
 * Creates a task with dependencies in a single transaction.
 *
 * Purpose:
 * Atomically creates a task and its dependency relationships,
 * ensuring either both succeed or both fail.
 *
 * Parameters:
 * - taskData: Task insert data
 *   - Required: id, workspaceId, title, status, priority
 * - dependencies: Array of dependency objects
 *   - Required fields: dependsOnTaskId, type
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The created task record.
 *
 * Errors:
 * - Throws if database insertion fails
 * - Throws if circular dependency would be created
 * - Throws if foreign key constraints are violated
 *
 * Side effects:
 * - Writes to tasks and task_dependencies tables in a transaction
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task_with_dependencies.created' if context provided
 *
 * Idempotency:
 * Not idempotent. Calling with same task id will fail on unique constraint.
 *
 * Authorization:
 * Caller must have write permission for the task's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - All dependsOnTaskId must reference existing tasks
 * - Creating dependencies must not create circular dependencies
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Task record exists in database
 * - All dependency records exist in database
 * - No circular dependencies exist
 * - Audit log and outbox event created if context provided
 */
// Create task with dependencies in a single transaction
export async function createTaskWithDependencies(
  taskData: typeof schema.tasks.$inferInsert,
  dependencies: Array<{ dependsOnTaskId: string; type: string }>,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [task] = await tx.insert(tasks).values(taskData).returning();

      if (dependencies.length > 0) {
        await tx.insert(taskDependencies).values(
          dependencies.map((dep: { dependsOnTaskId: string; type: string }) => ({
            taskId: task.id,
            dependsOnTaskId: dep.dependsOnTaskId,
            type: dep.type,
          })) as (typeof schema.taskDependencies.$inferInsert)[],
        );
      }

      return task;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'task_with_dependencies',
          entityId: taskData.id || 'pending',
          changes: { new: { taskData, dependencies } },
        }
      : undefined,
    {
      eventType: 'task_with_dependencies.created',
      aggregateType: 'task',
      aggregateId: taskData.id || 'pending',
      payload: { taskData, dependencies },
    },
  );
}

/**
 * Creates a task with assignees in a single transaction.
 *
 * Purpose:
 * Atomically creates a task and its assignee relationships,
 * ensuring either both succeed or both fail.
 *
 * Parameters:
 * - taskData: Task insert data
 *   - Required: id, workspaceId, title, status, priority
 * - assignees: Array of assignee objects
 *   - Required fields: userId, assignedBy
 *   - Optional: isPrimary (defaults to false)
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The created task record.
 *
 * Errors:
 * - Throws if database insertion fails
 * - Throws if foreign key constraints are violated
 *
 * Side effects:
 * - Writes to tasks and task_assignees tables in a transaction
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task_with_assignees.created' if context provided
 *
 * Idempotency:
 * Not idempotent. Calling with same task id will fail on unique constraint.
 *
 * Authorization:
 * Caller must have write permission for the task's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - All userId must reference existing users
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Task record exists in database
 * - All assignee records exist in database
 * - Audit log and outbox event created if context provided
 */
// Create task with assignees in a single transaction
export async function createTaskWithAssignees(
  taskData: typeof schema.tasks.$inferInsert,
  assignees: Array<{ userId: string; assignedBy: string; isPrimary?: boolean }>,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [task] = await tx.insert(tasks).values(taskData).returning();

      if (assignees.length > 0) {
        await tx.insert(taskAssignees).values(
          assignees.map(
            (assignee: { userId: string; assignedBy: string; isPrimary?: boolean }) => ({
              taskId: task.id,
              userId: assignee.userId,
              assignedBy: assignee.assignedBy,
              isPrimary: assignee.isPrimary ?? false,
            }),
          ) as (typeof schema.taskAssignees.$inferInsert)[],
        );
      }

      return task;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'task_with_assignees',
          entityId: taskData.id || 'pending',
          changes: { new: { taskData, assignees } },
        }
      : undefined,
    {
      eventType: 'task_with_assignees.created',
      aggregateType: 'task',
      aggregateId: taskData.id || 'pending',
      payload: { taskData, assignees },
    },
  );
}

/**
 * Soft deletes a project and all its tasks in a single transaction.
 *
 * Purpose:
 * Performs application-level cascade soft delete for a project
 * and its tasks, avoiding hard deletes for audit trail preservation.
 *
 * Parameters:
 * - projectId: The project identifier to delete
 *   - Required, non-null
 *
 * Returns:
 * The deleted project record with status set to 'deleted'.
 *
 * Errors:
 * - Throws if project with id does not exist
 * - Throws if transaction fails
 *
 * Side effects:
 * - Soft deletes all tasks in the project (sets status='cancelled')
 * - Soft deletes the project (sets status='deleted')
 * - All updates happen in a single transaction
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
 * - All tasks in project have status='cancelled'
 * - Project has status='deleted'
 *
 * Note:
 * This is an application-level cascade since we use soft deletes.
 * Database FK cascade would hard-delete, which we want to avoid.
 */
// Delete project with all its tasks (soft delete cascade)
// This is an application-level cascade since we use soft deletes.
// Database FK cascade would hard-delete, which we want to avoid.
export async function deleteProjectWithTasks(projectId: string) {
  return withTransaction(async (tx) => {
    // Soft delete all tasks in the project first
    // Order matters: tasks before project to maintain referential integrity if we ever hard-delete
    await tx
      .update(tasks)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(tasks.projectId, projectId));

    // Soft delete the project
    const [project] = await tx
      .update(projects)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();

    return project;
  });
}

/**
 * Moves a task to a different project.
 *
 * Purpose:
 * Changes the project association of a task while preserving
 * all other task data.
 *
 * Parameters:
 * - taskId: The task identifier to move
 *   - Required, non-null
 * - newProjectId: The target project identifier
 *   - Required, non-null
 *
 * Returns:
 * The updated task record with new projectId.
 *
 * Errors:
 * - Throws if task or project does not exist
 * - Throws if transaction fails
 *
 * Side effects:
 * - Updates tasks table (sets projectId)
 * - Automatically sets updatedAt to current timestamp
 *
 * Idempotency:
 * Idempotent for same newProjectId value.
 *
 * Authorization:
 * Caller must have write permission for both projects' workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Task with taskId must exist
 * - Project with newProjectId must exist
 * - Both must belong to the same workspace
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Task has projectId set to newProjectId
 * - updatedAt timestamp set to current time
 */
// Move task to different project
export async function moveTaskToProject(taskId: string, newProjectId: string) {
  return withTransaction(async (tx) => {
    const [task] = await tx
      .update(tasks)
      .set({ projectId: newProjectId, updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();

    return task;
  });
}

/**
 * Completes a task and creates a time entry in a single transaction.
 *
 * Purpose:
 * Atomically marks a task as done and records the time spent,
 * ensuring both operations succeed or fail together.
 *
 * Parameters:
 * - taskId: The task identifier to complete
 *   - Required, non-null
 * - timeEntryData: Time entry insert data
 *   - Optional, if null/undefined, no time entry is created
 *   - Required if provided: id, userId, startedAt
 *
 * Returns:
 * The completed task record.
 *
 * Errors:
 * - Throws if task does not exist
 * - Throws if time entry insertion fails (if provided)
 * - Throws if transaction fails
 *
 * Side effects:
 * - Updates tasks table (sets status='done', completedAt=now)
 * - Inserts into time_entries table (if timeEntryData provided)
 * - All operations happen in a single transaction
 *
 * Idempotency:
 * Idempotent for task completion. Time entry creation is not idempotent.
 *
 * Authorization:
 * Caller must have write permission for the task's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Task with taskId must exist
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Task has status='done' and completedAt set
 * - Time entry record created if timeEntryData provided
 */
// Complete task with time entry in a single transaction
export async function completeTaskWithTimeEntry(
  taskId: string,
  timeEntryData: typeof schema.timeEntries.$inferInsert,
) {
  return withTransaction(async (tx) => {
    // Update task status
    const [task] = await tx
      .update(tasks)
      .set({ status: 'done', completedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();

    // Create time entry if provided
    if (timeEntryData) {
      await tx.insert(timeEntries).values(timeEntryData);
    }

    return task;
  });
}

/**
 * Batch deletes tasks with all their related data.
 *
 * Purpose:
 * Performs comprehensive cleanup of tasks including dependencies,
 * assignees, comments, attachments, and time entries.
 *
 * Parameters:
 * - taskIds: Array of task identifiers to delete
 *   - Required, non-null, non-empty
 *
 * Returns:
 * Array of deleted task records (soft deleted with status='cancelled').
 *
 * Errors:
 * - Throws if transaction fails
 *
 * Side effects:
 * - Hard deletes from: task_dependencies, task_assignees,
 *   task_comments, task_attachments, time_entries
 * - Soft deletes tasks (sets status='cancelled')
 * - All operations happen in a single transaction
 *
 * Idempotency:
 * Idempotent. Deleting already-cancelled tasks produces same end state.
 *
 * Authorization:
 * Caller must have delete permission for all tasks' workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - All taskIds must reference existing tasks
 * - User must have delete permission in the workspace
 *
 * Postconditions:
 * - All related records permanently deleted from database
 * - All tasks have status='cancelled'
 *
 * Note:
 * This is a hard delete for related data but soft delete for tasks.
 * File storage cleanup for attachments must be handled separately.
 */
// Batch delete tasks with their dependencies
export async function batchDeleteTasksWithDependencies(taskIds: string[]) {
  return withTransaction(async (tx) => {
    // Delete dependencies
    await tx.delete(taskDependencies).where(inArray(taskDependencies.taskId, taskIds));

    // Delete assignees
    await tx.delete(taskAssignees).where(inArray(taskAssignees.taskId, taskIds));

    // Delete comments
    await tx.delete(taskComments).where(inArray(taskComments.taskId, taskIds));

    // Delete attachments
    await tx.delete(taskAttachments).where(inArray(taskAttachments.taskId, taskIds));

    // Delete time entries
    await tx.delete(timeEntries).where(inArray(timeEntries.taskId, taskIds));

    // Soft delete tasks
    const deletedTasks = await tx
      .update(tasks)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(inArray(tasks.id, taskIds))
      .returning();

    return deletedTasks;
  });
}

/**
 * Clones a task with its dependencies and assignees.
 *
 * Purpose:
 * Creates a copy of an existing task with its dependencies
 * and assignees, useful for task templates.
 *
 * Parameters:
 * - originalTaskId: The task identifier to clone
 *   - Required, non-null
 * - newTaskData: Partial task data to override in the clone
 *   - Optional, non-null
 *   - Can override: title, description, dueDate, etc.
 *   - Cannot override: id (new one generated)
 *
 * Returns:
 * The cloned task record.
 *
 * Errors:
 * - Throws if original task does not exist
 * - Throws if database insertion fails
 * - Throws if transaction fails
 *
 * Side effects:
 * - Inserts new task record
 * - Copies dependency records (points to same dependsOnTaskId)
 * - Copies assignee records
 * - All operations happen in a single transaction
 *
 * Idempotency:
 * Not idempotent. Each call creates a new task.
 *
 * Authorization:
 * Caller must have write permission for the task's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Original task must exist
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - New task record exists with copied dependencies and assignees
 * - Original task is unchanged
 */
// Clone task with all its data (for templates)
export async function cloneTaskWithDependencies(
  originalTaskId: string,
  newTaskData: Partial<typeof schema.tasks.$inferInsert>,
) {
  return withTransaction(async (tx) => {
    // Get original task
    const [originalTask] = await tx.select().from(tasks).where(eq(tasks.id, originalTaskId));
    if (!originalTask) {
      throw new Error('Original task not found');
    }

    // Create new task
    const [newTask] = await tx
      .insert(tasks)
      .values({
        ...originalTask,
        ...newTaskData,
        id: undefined, // Generate new ID
        title: newTaskData.title || `${originalTask.title} (Copy)`,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Copy dependencies
    const originalDependencies = await tx
      .select()
      .from(taskDependencies)
      .where(eq(taskDependencies.taskId, originalTaskId));

    if (originalDependencies.length > 0) {
      await tx.insert(taskDependencies).values(
        originalDependencies.map((dep: typeof schema.taskDependencies.$inferSelect) => ({
          taskId: newTask.id,
          dependsOnTaskId: dep.dependsOnTaskId,
          type: dep.type,
        })),
      );
    }

    // Copy assignees
    const originalAssignees = await tx
      .select()
      .from(taskAssignees)
      .where(eq(taskAssignees.taskId, originalTaskId));

    if (originalAssignees.length > 0) {
      await tx.insert(taskAssignees).values(
        originalAssignees.map((assignee: typeof schema.taskAssignees.$inferSelect) => ({
          taskId: newTask.id,
          userId: assignee.userId,
          assignedBy: assignee.assignedBy,
          isPrimary: assignee.isPrimary,
        })),
      );
    }

    return newTask;
  });
}

/**
 * Integration command: Creates a task with optional calendar event.
 *
 * Purpose:
 * Creates a task and optionally creates a linked calendar event
 * in a single transaction with idempotency support.
 *
 * Parameters:
 * - data: Command data object
 *   - Required: workspaceId, title, status, priority, createCalendarEvent
 *   - Optional: projectId, description, dueDate, dueTime, estimatedDuration,
 *     calendarId, idempotencyKey
 * - userId: Optional user identifier for audit logging
 *   - Optional, non-null
 *
 * Returns:
 * Object containing:
 * - task: The created task record
 * - event: The created event record or null
 * - isIdempotent: true if this was a duplicate request
 * - responseStatus: HTTP status code for idempotent responses
 * - responseBody: Cached response for idempotent requests
 *
 * Errors:
 * - Throws if project does not belong to workspace
 * - Throws if calendar does not belong to workspace
 * - Throws if database insertion fails
 *
 * Side effects:
 * - Writes to tasks table
 * - Writes to events table (if createCalendarEvent=true)
 * - Creates audit log entry if userId provided
 * - Creates outbox event 'task_with_event.created'
 * - Stores idempotency key if provided
 *
 * Idempotency:
 * Idempotent when idempotencyKey is provided. Returns cached response
 * for duplicate requests.
 *
 * Authorization:
 * Caller must have write permission for the workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - workspaceId must reference an existing workspace
 * - If projectId provided, must belong to workspace
 * - If calendarId provided with createCalendarEvent=true, must belong to workspace
 *
 * Postconditions:
 * - Task record exists in database
 * - Event record exists if createCalendarEvent=true
 * - Task linked to event via calendarEventId
 * - Audit log and outbox event created
 */
// Integration Command: Create task with optional calendar event
export async function createTaskWithEventCommand(
  data: {
    workspaceId: string;
    projectId?: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    dueDate?: string;
    dueTime?: string;
    estimatedDuration?: number;
    createCalendarEvent: boolean;
    calendarId?: string;
    idempotencyKey?: string;
  },
  userId?: string,
) {
  const endpoint = 'POST /tasks-with-event';

  // Check idempotency if key provided
  if (data.idempotencyKey && userId) {
    const idempotencyCheck = await checkIdempotencyKey(data.idempotencyKey, userId, endpoint);
    if (idempotencyCheck.isDuplicate) {
      return {
        isIdempotent: true,
        responseStatus: idempotencyCheck.responseStatus,
        responseBody: idempotencyCheck.responseBody,
      };
    }
  }

  return withTransaction(async (tx) => {
    // Verify project belongs to workspace if provided
    if (data.projectId) {
      const [project] = await tx
        .select()
        .from(projects)
        .where(and(eq(projects.id, data.projectId), eq(projects.workspaceId, data.workspaceId)))
        .limit(1);

      if (!project) {
        throw new Error('Project not found or does not belong to workspace');
      }
    }

    // Verify calendar belongs to workspace if creating event
    if (data.createCalendarEvent && data.calendarId) {
      const [calendar] = await tx
        .select()
        .from(calendars)
        .where(and(eq(calendars.id, data.calendarId), eq(calendars.workspaceId, data.workspaceId)))
        .limit(1);

      if (!calendar) {
        throw new Error('Calendar not found or does not belong to workspace');
      }
    }

    // Create task
    const [task] = await tx
      .insert(tasks)
      .values({
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        dueTime: data.dueTime,
        estimatedDuration: data.estimatedDuration ? String(data.estimatedDuration) : null,
      })
      .returning();

    if (!task) {
      throw new Error('Failed to create task');
    }

    let event = null;

    // Create calendar event if requested
    if (data.createCalendarEvent && data.dueDate && data.calendarId) {
      const dueDate = new Date(data.dueDate);
      const duration = data.estimatedDuration || 60;
      const startTime = dueDate;
      const endTime = new Date(dueDate.getTime() + duration * 60000);

      const [createdEvent] = await tx
        .insert(events)
        .values({
          workspaceId: data.workspaceId,
          calendarId: data.calendarId,
          title: data.title,
          description: data.description,
          start: startTime,
          end: endTime,
          timezone: 'UTC',
          taskId: task.id,
        })
        .returning();

      if (!createdEvent) {
        throw new Error('Failed to create event');
      }

      // Update task with calendar event ID
      await tx.update(tasks).set({ calendarEventId: createdEvent.id }).where(eq(tasks.id, task.id));

      event = createdEvent;
    }

    // Create audit log
    if (userId) {
      await createAuditLog({
        userId,
        workspaceId: data.workspaceId,
        action: 'create',
        entityType: 'task_with_event',
        entityId: task.id,
        changes: { new: data },
      });
    }

    // Create outbox event
    await createOutboxEvent({
      eventType: 'task_with_event.created',
      aggregateType: 'task',
      aggregateId: task.id,
      payload: { task, event },
    });

    // Store idempotency key if provided
    const responseBody = { task, event };
    if (data.idempotencyKey && userId) {
      await createIdempotencyKey({
        key: data.idempotencyKey,
        userId,
        endpoint,
        responseStatus: '201',
        responseBody,
      });
    }

    return responseBody;
  });
}

/**
 * Integration command: Links a task to a calendar event.
 *
 * Purpose:
 * Associates an existing task with an existing calendar event,
 * updating both records with the cross-reference.
 *
 * Parameters:
 * - data: Command data object
 *   - Required: taskId, eventId
 *   - Optional: idempotencyKey
 * - userId: Optional user identifier for audit logging
 *   - Optional, non-null
 *
 * Returns:
 * Object containing:
 * - task: The updated task record
 * - isIdempotent: true if this was a duplicate request
 * - responseStatus: HTTP status code for idempotent responses
 * - responseBody: Cached response for idempotent requests
 *
 * Errors:
 * - Throws if task or event does not exist
 * - Throws if task and event belong to different workspaces
 * - Throws if database update fails
 *
 * Side effects:
 * - Updates events table (sets taskId)
 * - Updates tasks table (sets calendarEventId)
 * - Creates audit log entry if userId provided
 * - Creates outbox event 'task_event.linked'
 * - Stores idempotency key if provided
 *
 * Idempotency:
 * Idempotent when idempotencyKey is provided. Returns cached response
 * for duplicate requests.
 *
 * Authorization:
 * Caller must have write permission for both entities' workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Task with taskId must exist
 * - Event with eventId must exist
 * - Both must belong to the same workspace
 *
 * Postconditions:
 * - Event has taskId set
 * - Task has calendarEventId set
 * - Audit log and outbox event created
 */
// Integration Command: Link task to calendar event
export async function linkTaskEventCommand(
  data: { taskId: string; eventId: string; idempotencyKey?: string },
  userId?: string,
) {
  const endpoint = 'POST /link-task-event';

  // Check idempotency if key provided
  if (data.idempotencyKey && userId) {
    const idempotencyCheck = await checkIdempotencyKey(data.idempotencyKey, userId, endpoint);
    if (idempotencyCheck.isDuplicate) {
      return {
        isIdempotent: true,
        responseStatus: idempotencyCheck.responseStatus,
        responseBody: idempotencyCheck.responseBody,
      };
    }
  }

  return withTransaction(async (tx) => {
    // Fetch task and event to verify workspace ownership
    const [task] = await tx.select().from(tasks).where(eq(tasks.id, data.taskId)).limit(1);
    const [event] = await tx.select().from(events).where(eq(events.id, data.eventId)).limit(1);

    if (!task || !event) {
      throw new Error('Task or event not found');
    }

    // Verify both belong to same workspace
    if (task.workspaceId !== event.workspaceId) {
      throw new Error('Task and event must belong to the same workspace');
    }

    // Link event to task
    const [updatedEvent] = await tx
      .update(events)
      .set({ taskId: data.taskId, updatedAt: new Date() })
      .where(eq(events.id, data.eventId))
      .returning();

    if (!updatedEvent) {
      throw new Error('Failed to link event to task');
    }

    // Update task with calendar event ID
    const [updatedTask] = await tx
      .update(tasks)
      .set({ calendarEventId: data.eventId, updatedAt: new Date() })
      .where(eq(tasks.id, data.taskId))
      .returning();

    if (!updatedTask) {
      throw new Error('Failed to update task');
    }

    // Create audit log
    if (userId) {
      await createAuditLog({
        userId,
        workspaceId: task.workspaceId,
        action: 'update',
        entityType: 'task_event_link',
        entityId: data.taskId,
        changes: { new: { eventId: data.eventId } },
      });
    }

    // Create outbox event
    await createOutboxEvent({
      eventType: 'task_event.linked',
      aggregateType: 'task',
      aggregateId: data.taskId,
      payload: { task: updatedTask, event: updatedEvent },
    });

    // Store idempotency key if provided
    const responseBody = { task: updatedTask };
    if (data.idempotencyKey && userId) {
      await createIdempotencyKey({
        key: data.idempotencyKey,
        userId,
        endpoint,
        responseStatus: '200',
        responseBody,
      });
    }

    return responseBody;
  });
}

/**
 * Integration command: Unlinks a task from its calendar event.
 *
 * Purpose:
 * Removes the association between a task and its linked calendar event.
 *
 * Parameters:
 * - data: Command data object
 *   - Required: taskId
 *   - Optional: idempotencyKey
 * - userId: Optional user identifier for audit logging
 *   - Optional, non-null
 *
 * Returns:
 * Object containing:
 * - task: The updated task record
 * - isIdempotent: true if this was a duplicate request
 * - responseStatus: HTTP status code for idempotent responses
 * - responseBody: Cached response for idempotent requests
 *
 * Errors:
 * - Throws if task does not exist
 * - Throws if database update fails
 *
 * Side effects:
 * - Updates events table (sets taskId to null)
 * - Updates tasks table (sets calendarEventId to null)
 * - Creates audit log entry if userId provided
 * - Creates outbox event 'task_event.unlinked'
 * - Stores idempotency key if provided
 *
 * Idempotency:
 * Idempotent when idempotencyKey is provided. Returns cached response
 * for duplicate requests. Also idempotent for unlinking already-unlinked task.
 *
 * Authorization:
 * Caller must have write permission for the task's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Task with taskId must exist
 *
 * Postconditions:
 * - Event has taskId set to null (if event existed)
 * - Task has calendarEventId set to null
 * - Audit log and outbox event created
 */
// Integration Command: Unlink task from calendar event
export async function unlinkTaskEventCommand(
  data: { taskId: string; idempotencyKey?: string },
  userId?: string,
) {
  const endpoint = 'POST /unlink-task-event';

  // Check idempotency if key provided
  if (data.idempotencyKey && userId) {
    const idempotencyCheck = await checkIdempotencyKey(data.idempotencyKey, userId, endpoint);
    if (idempotencyCheck.isDuplicate) {
      return {
        isIdempotent: true,
        responseStatus: idempotencyCheck.responseStatus,
        responseBody: idempotencyCheck.responseBody,
      };
    }
  }

  return withTransaction(async (tx) => {
    // Fetch task to get workspace and current event
    const [task] = await tx.select().from(tasks).where(eq(tasks.id, data.taskId)).limit(1);

    if (!task) {
      throw new Error('Task not found');
    }

    const eventId = task.calendarEventId;

    // Unlink event from task
    if (eventId) {
      await tx
        .update(events)
        .set({ taskId: null, updatedAt: new Date() })
        .where(eq(events.id, eventId));
    }

    // Update task to remove calendar event ID
    const [updatedTask] = await tx
      .update(tasks)
      .set({ calendarEventId: null, updatedAt: new Date() })
      .where(eq(tasks.id, data.taskId))
      .returning();

    if (!updatedTask) {
      throw new Error('Failed to update task');
    }

    // Create audit log
    if (userId) {
      await createAuditLog({
        userId,
        workspaceId: task.workspaceId,
        action: 'update',
        entityType: 'task_event_link',
        entityId: data.taskId,
        changes: { old: { eventId }, new: { eventId: null } },
      });
    }

    // Create outbox event
    await createOutboxEvent({
      eventType: 'task_event.unlinked',
      aggregateType: 'task',
      aggregateId: data.taskId,
      payload: { task: updatedTask },
    });

    // Store idempotency key if provided
    const responseBody = { task: updatedTask };
    if (data.idempotencyKey && userId) {
      await createIdempotencyKey({
        key: data.idempotencyKey,
        userId,
        endpoint,
        responseStatus: '200',
        responseBody,
      });
    }

    return responseBody;
  });
}
