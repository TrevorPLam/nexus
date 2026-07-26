/**
 * MODULE: Task Assignee Operations
 *
 * Responsibility:
 * Manages task assignee operations including creation, retrieval,
 * and deletion with transactional integrity, audit logging,
 * and outbox event emission.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Manages assignee-specific business logic.
 * - Delegates low-level DB access to Drizzle.
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all operations
 *   - Task IDs must reference existing tasks in the same workspace
 *   - User IDs must reference existing users
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
 * - Low. Simple CRUD operations for assignees.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/work.ts (persistence layer)
 * - packages/contracts/src/work.ts (domain schemas)
 * - apps/api/src/routes/work/task-assignees.ts (API routes)
 *
 * Tags:
 * - domain: work-management
 * - risk: low
 * - layer: business-logic
 * - stability: stable
 * - concerns: audit, outbox, transactions
 *
 * File:
 * - apps/api/src/lib/task-assignee-operations.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { taskAssignees } from '@life-os/database';
import { eq } from 'drizzle-orm';

import { executeCommandWithoutIdempotency, type CommandContext } from './command-context.js';
import { db } from './db.js';

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
