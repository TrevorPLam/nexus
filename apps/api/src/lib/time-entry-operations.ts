/**
 * MODULE: Time Entry Operations
 *
 * Responsibility:
 * Manages time entry operations including creation, retrieval,
 * updating, and deletion with transactional integrity, audit logging,
 * and outbox event emission.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Manages time entry-specific business logic.
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
 * - Low. Simple CRUD operations for time entries.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/work.ts (persistence layer)
 * - packages/contracts/src/work.ts (domain schemas)
 * - apps/api/src/routes/work/time-entries.ts (API routes)
 *
 * Tags:
 * - domain: work-management
 * - risk: low
 * - layer: business-logic
 * - stability: stable
 * - concerns: audit, outbox, transactions
 *
 * File:
 * - apps/api/src/lib/time-entry-operations.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { timeEntries } from '@life-os/database';
import { eq, and, desc, sql } from 'drizzle-orm';

import { executeCommandWithoutIdempotency, type CommandContext } from './command-context.js';
import { db } from './db.js';

/**
 * Creates a new time entry for a task.
 *
 * Purpose:
 * Records time spent working on a task for tracking and billing.
 *
 * Parameters:
 * - data: Time entry insert data
 *   - Required: id, taskId, userId, startedAt
 *   - Optional: endedAt, description
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The created time entry record.
 *
 * Errors:
 * - Throws if database insertion fails
 * - Throws if taskId or userId is invalid (foreign key constraint)
 *
 * Side effects:
 * - Writes to time_entries table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'time_entry.created' if context provided
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
 * - userId must reference an existing user
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Time entry record exists in database
 * - Audit log and outbox event created if context provided
 */
export async function createTimeEntry(
  data: typeof schema.timeEntries.$inferInsert,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [entry] = await tx.insert(timeEntries).values(data).returning();
      return entry;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'time_entry',
          entityId: data.taskId,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'time_entry.created',
      aggregateType: 'task',
      aggregateId: data.taskId,
      payload: { entry: data },
    },
  );
}

/**
 * Retrieves a time entry by its unique identifier.
 *
 * Purpose:
 * Fetches a single time entry record for display or editing.
 *
 * Parameters:
 * - id: The unique time entry identifier (UUID)
 *   - Required, non-null
 *
 * Returns:
 * The time entry record if found, or null if not found.
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
 * Caller must have read access to the time entry's task workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - id must be a valid UUID format
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getTimeEntryById(id: string) {
  const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id));
  return entry;
}

/**
 * Retrieves all time entries for a specific task.
 *
 * Purpose:
 * Lists all time entries for a task, ordered by start time.
 *
 * Parameters:
 * - taskId: The task identifier to get time entries for
 *   - Required, non-null
 *
 * Returns:
 * Array of time entry records ordered by startedAt (desc).
 *
 * Errors:
 * None. Returns empty array if task has no time entries.
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
export async function getTimeEntriesByTask(taskId: string) {
  return db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.taskId, taskId))
    .orderBy(desc(timeEntries.startedAt));
}

/**
 * Retrieves time entries for a user with optional date filtering.
 *
 * Purpose:
 * Lists all time entries for a user, optionally filtered by date range.
 *
 * Parameters:
 * - userId: The user identifier to get time entries for
 *   - Required, non-null
 * - startDate: Optional start date filter (inclusive)
 *   - Optional, non-null
 * - endDate: Optional end date filter (inclusive)
 *   - Optional, non-null
 *
 * Returns:
 * Array of time entry records ordered by startedAt (desc).
 *
 * Errors:
 * None. Returns empty array if user has no time entries.
 *
 * Side effects:
 * None. Read-only operation.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Caller must have read access to the user's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - userId must reference an existing user
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getTimeEntriesByUser(userId: string, startDate?: Date, endDate?: Date) {
  const conditions = [eq(timeEntries.userId, userId)];

  if (startDate) {
    conditions.push(sql`${timeEntries.startedAt} >= ${startDate}`);
  }

  if (endDate) {
    conditions.push(sql`${timeEntries.startedAt} <= ${endDate}`);
  }

  return db
    .select()
    .from(timeEntries)
    .where(and(...conditions))
    .orderBy(desc(timeEntries.startedAt));
}

/**
 * Updates an existing time entry.
 *
 * Purpose:
 * Modifies time entry details such as duration or description.
 *
 * Parameters:
 * - id: The unique time entry identifier to update
 *   - Required, non-null
 * - data: Partial time entry data with fields to update
 *   - Optional fields: startedAt, endedAt, description
 *   - Cannot update: id, taskId, userId, createdAt
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The updated time entry record with updatedAt set to current time.
 *
 * Errors:
 * - Throws if time entry with id does not exist
 *
 * Side effects:
 * - Writes to time_entries table
 * - Automatically sets updatedAt to current timestamp
 * - Emits audit log entry if context provided
 * - Emits outbox event 'time_entry.updated' if context provided
 *
 * Idempotency:
 * Idempotent for same data values.
 *
 * Authorization:
 * Caller must have write permission for the time entry's task workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Time entry with id must exist
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Time entry record updated with new values
 * - updatedAt timestamp set to current time
 * - Audit log and outbox event created if context provided
 */
export async function updateTimeEntry(
  id: string,
  data: Partial<typeof schema.timeEntries.$inferInsert>,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [entry] = await tx
        .update(timeEntries)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(timeEntries.id, id))
        .returning();
      return entry;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'time_entry',
          entityId: id,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'time_entry.updated',
      aggregateType: 'task',
      aggregateId: id,
      payload: { entry: data },
    },
  );
}

/**
 * Deletes a time entry.
 *
 * Purpose:
 * Permanently removes a time entry from the database.
 *
 * Parameters:
 * - id: The unique time entry identifier to delete
 *   - Required, non-null
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The deleted time entry record.
 *
 * Errors:
 * - Throws if time entry with id does not exist
 *
 * Side effects:
 * - Hard deletes from time_entries table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'time_entry.deleted' if context provided
 *
 * Idempotency:
 * Not idempotent. Second call will fail as record no longer exists.
 *
 * Authorization:
 * Caller must have delete permission for the time entry's task workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Time entry with id must exist
 * - User must have delete permission in the workspace
 *
 * Postconditions:
 * - Time entry record permanently removed from database
 * - Audit log and outbox event created if context provided
 */
export async function deleteTimeEntry(id: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [entry] = await tx.delete(timeEntries).where(eq(timeEntries.id, id)).returning();
      return entry;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'delete',
          entityType: 'time_entry',
          entityId: id,
          changes: {},
        }
      : undefined,
    {
      eventType: 'time_entry.deleted',
      aggregateType: 'task',
      aggregateId: id,
      payload: { entryId: id },
    },
  );
}
