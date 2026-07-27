/**
 * MODULE: Task Deletion Operations
 *
 * Responsibility:
 * Manages complex task deletion operations including soft deleting
 * projects with tasks and batch deleting tasks with dependencies.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Manages task deletion with related entities.
 * - Delegates low-level DB access to Drizzle.
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all operations
 *   - All referenced IDs must exist in the same workspace
 * - Postconditions:
 *   - All operations are atomic (all succeed or all fail)
 *
 * Side effects:
 * - Performs database writes across multiple tables in transactions.
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
 * - concerns: transactions
 *
 * File:
 * - apps/api/src/lib/task-deletion-operations.ts
 *
 * Last updated:
 * - July 26, 2026
 */

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

import { withTransaction } from './work-operations.js';

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
  return withTransaction(async (tx: unknown) => {
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
  return withTransaction(async (tx: unknown) => {
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
