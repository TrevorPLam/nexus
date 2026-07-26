/**
 * MODULE: Task Dependency Operations
 *
 * Responsibility:
 * Manages task dependency relationships with circular dependency detection
 * to prevent invalid dependency graphs.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Manages dependency-specific business logic.
 * - Delegates low-level DB access to Drizzle.
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all operations
 *   - Task IDs must reference existing tasks in the same workspace
 * - Postconditions:
 *   - Creating dependencies must not create circular references
 *   - Circular dependency creation throws error before database write
 *
 * Side effects:
 * - Performs database writes (CRUD).
 *
 * Change risk:
 * - Medium. Contains dependency validation logic.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/work.ts (persistence layer)
 * - packages/contracts/src/work.ts (domain schemas)
 * - apps/api/src/routes/work/task-dependencies.ts (API routes)
 *
 * Tags:
 * - domain: work-management
 * - risk: medium
 * - layer: business-logic
 * - stability: stable
 * - concerns: circular-dependency-detection
 *
 * File:
 * - apps/api/src/lib/task-dependency-operations.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import * as schema from '@life-os/database';
import { taskDependencies } from '@life-os/database';
import { eq } from 'drizzle-orm';

import { db } from './db.js';

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
