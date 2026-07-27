/**
 * MODULE: Task Cloning Operations
 *
 * Responsibility:
 * Manages complex task cloning operations including cloning tasks
 * with their dependencies and assignees.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Manages task cloning with related entities.
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
 * - apps/api/src/lib/task-cloning-operations.ts
 *
 * Last updated:
 * - July 26, 2026
 */

import * as schema from '@life-os/database';
import { tasks, taskDependencies, taskAssignees } from '@life-os/database';
import { eq } from 'drizzle-orm';

import { withTransaction } from './work-operations.js';

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
  return withTransaction(async (tx: unknown) => {
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
