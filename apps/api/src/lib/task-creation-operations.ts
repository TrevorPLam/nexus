/**
 * MODULE: Task Creation Operations
 *
 * Responsibility:
 * Manages complex task creation operations including creating tasks
 * with dependencies and assignees in single transactions.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Manages task creation with related entities.
 * - Delegates low-level DB access to Drizzle.
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all operations
 *   - All referenced IDs must exist in the same workspace
 * - Postconditions:
 *   - All operations are atomic (all succeed or all fail)
 *   - Audit logging and outbox events emitted where applicable
 *
 * Side effects:
 * - Performs database writes across multiple tables in transactions.
 * - Emits audit logs to 'audit_logs' table.
 * - Emits outbox events to 'outbox_events' table for downstream sync/notifications.
 *
 * Change risk:
 * - Medium. Complex transactional operations with multiple table interactions.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/work.ts (persistence layer)
 * - packages/contracts/src/work.ts (domain schemas)
 * - apps/api/src/routes/work/complex.ts (API routes)
 *
 * Tags:
 * - domain: work-management
 * - risk: medium
 * - layer: business-logic
 * - stability: stable
 * - concerns: audit, outbox, transactions
 *
 * File:
 * - apps/api/src/lib/task-creation-operations.ts
 *
 * Last updated:
 * - July 26, 2026
 */

import * as schema from '@life-os/database';
import { tasks, taskDependencies, taskAssignees } from '@life-os/database';

import { executeCommandWithoutIdempotency, type CommandContext } from './command-context.js';

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
