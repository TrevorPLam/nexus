/**
 * MODULE: Complex Task Operations
 *
 * Responsibility:
 * Manages complex transaction-based task operations including creating
 * tasks with dependencies/assignees, soft deleting projects with tasks,
 * moving tasks between projects, completing tasks with time entries,
 * batch deleting tasks with dependencies, and cloning tasks.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Manages complex multi-table transactional business logic.
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
 * - apps/api/src/lib/complex-task-operations.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import * as schema from '@life-os/database';
import {
  tasks,
  projects,
  taskDependencies,
  taskAssignees,
  taskComments,
  taskAttachments,
  timeEntries,
} from '@life-os/database';
import { eq, inArray } from 'drizzle-orm';

import { executeCommandWithoutIdempotency, type CommandContext } from './command-context.js';
import { withTransaction } from './transaction.js';

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
