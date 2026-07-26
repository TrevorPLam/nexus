/**
 * MODULE: Batch Task Operations
 *
 * Responsibility:
 * Manages batch operations on tasks including completing, deferring,
 * rescheduling, and status updates with transactional integrity,
 * audit logging, and outbox event emission.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Manages batch task-specific business logic.
 * - Delegates low-level DB access to Drizzle.
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all operations
 *   - All task IDs must reference existing tasks in the same workspace
 * - Postconditions:
 *   - All mutations emit audit log entries when context is provided
 *   - All mutations emit outbox events for downstream processing
 *
 * Side effects:
 * - Performs database writes (batch updates).
 * - Emits audit logs to 'audit_logs' table.
 * - Emits outbox events to 'outbox_events' table for downstream sync/notifications.
 *
 * Change risk:
 * - Low. Batch update operations for tasks.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/work.ts (persistence layer)
 * - packages/contracts/src/work.ts (domain schemas)
 * - apps/api/src/routes/work/batch.ts (API routes)
 *
 * Tags:
 * - domain: work-management
 * - risk: low
 * - layer: business-logic
 * - stability: stable
 * - concerns: audit, outbox, transactions
 *
 * File:
 * - apps/api/src/lib/batch-task-operations.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { tasks } from '@life-os/database';
import { inArray } from 'drizzle-orm';

import { executeCommandWithoutIdempotency, type CommandContext } from './command-context.js';

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
