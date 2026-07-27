/**
 * MODULE: Task Subtask Operations
 *
 * Responsibility:
 * Manages subtask retrieval operations for parent-child task relationships.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Provides read-only operations for subtask data.
 * - Delegates low-level DB access to Drizzle.
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all operations
 * - Postconditions:
 *   - All queries respect RLS policies
 *
 * Side effects:
 * - None. Read-only operations.
 *
 * Change risk:
 * - Low. Contains simple query logic with no mutations.
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
 * - risk: low
 * - layer: business-logic
 * - stability: stable
 * - concerns: queries
 *
 * File:
 * - apps/api/src/lib/task-subtasks.ts
 *
 * Last updated:
 * - July 26, 2026
 */

import { tasks } from '@life-os/database';
import { eq, asc } from 'drizzle-orm';

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
  const { db } = await import('./db.js');
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.parentId, parentTaskId))
    .orderBy(asc(tasks.createdAt));
}
