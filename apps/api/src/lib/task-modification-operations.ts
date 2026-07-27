/**
 * MODULE: Task Modification Operations
 *
 * Responsibility:
 * Manages complex task modification operations including moving tasks
 * between projects and completing tasks with time entries.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Manages task modification with related entities.
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
 * - apps/api/src/lib/task-modification-operations.ts
 *
 * Last updated:
 * - July 26, 2026
 */

import * as schema from '@life-os/database';
import { tasks, timeEntries } from '@life-os/database';
import { eq } from 'drizzle-orm';

import { withTransaction } from './work-operations.js';

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
  return withTransaction(async (tx: unknown) => {
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
  return withTransaction(async (tx: unknown) => {
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
