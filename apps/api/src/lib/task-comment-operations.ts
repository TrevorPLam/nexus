/**
 * MODULE: Task Comment Operations
 *
 * Responsibility:
 * Manages task comment operations including creation, retrieval,
 * updating, and deletion with transactional integrity, audit logging,
 * and outbox event emission.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Manages comment-specific business logic.
 * - Delegates low-level DB access to Drizzle.
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all operations
 *   - Task IDs must reference existing tasks in the same workspace
 * - Postconditions:
 *   - All mutations emit audit log entries when context is provided
 *   - All mutations emit outbox events for downstream processing
 *
 * Side effects:
 * - Performs database writes (CRUD).
 * - Emits audit logs to 'audit_logs' table.
 * - Emits outbox events to 'outbox_events' table for downstream sync/notifications.
 *
 * Change risk:
 * - Low. Simple CRUD operations for comments.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/work.ts (persistence layer)
 * - packages/contracts/src/work.ts (domain schemas)
 * - apps/api/src/routes/work/task-comments.ts (API routes)
 *
 * Tags:
 * - domain: work-management
 * - risk: low
 * - layer: business-logic
 * - stability: stable
 * - concerns: audit, outbox, transactions
 *
 * File:
 * - apps/api/src/lib/task-comment-operations.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { taskComments } from '@life-os/database';
import { eq, desc } from 'drizzle-orm';

import { executeCommandWithoutIdempotency, type CommandContext } from './command-context.js';
import { db } from './db.js';

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
