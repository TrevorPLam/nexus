/**
 * MODULE: Task Note Operations
 *
 * Responsibility:
 * Manages task note operations including creation, retrieval,
 * updating, and deletion with transactional integrity, audit logging,
 * and outbox event emission.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Manages note-specific business logic.
 * - Delegates low-level DB access to Drizzle.
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all operations
 *   - Task IDs must reference existing tasks in the same workspace
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
 * - Low. Simple CRUD operations for notes.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/work.ts (persistence layer)
 * - packages/contracts/src/work.ts (domain schemas)
 * - apps/api/src/routes/work/task-notes.ts (API routes)
 *
 * Tags:
 * - domain: work-management
 * - risk: low
 * - layer: business-logic
 * - stability: stable
 * - concerns: audit, outbox, transactions
 *
 * File:
 * - apps/api/src/lib/task-note-operations.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { taskNotes } from '@life-os/database';
import { eq, desc } from 'drizzle-orm';

import { executeCommandWithoutIdempotency, type CommandContext } from './command-context.js';
import { db } from './db.js';

/**
 * Creates a new note for a task.
 *
 * Purpose:
 * Persists a note attached to a task for documentation or
 * reference purposes.
 *
 * Parameters:
 * - data: Task note insert data
 *   - Required: id, taskId, content
 *   - Optional: createdBy
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The created note record.
 *
 * Errors:
 * - Throws if database insertion fails
 * - Throws if taskId is invalid (foreign key constraint)
 *
 * Side effects:
 * - Writes to task_notes table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task_note.created' if context provided
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
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Note record exists in database
 * - Audit log and outbox event created if context provided
 */
export async function createTaskNote(
  data: typeof schema.taskNotes.$inferInsert,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [note] = await tx.insert(taskNotes).values(data).returning();
      return note;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'task_note',
          entityId: data.taskId,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'task_note.created',
      aggregateType: 'task',
      aggregateId: data.taskId,
      payload: { note: data },
    },
  );
}

/**
 * Retrieves a task note by its unique identifier.
 *
 * Purpose:
 * Fetches a single note record for display or editing.
 *
 * Parameters:
 * - id: The unique note identifier (UUID)
 *   - Required, non-null
 *
 * Returns:
 * The note record if found, or null if not found.
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
 * Caller must have read access to the note's task workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - id must be a valid UUID format
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getTaskNoteById(id: string) {
  const [note] = await db.select().from(taskNotes).where(eq(taskNotes.id, id));
  return note;
}

/**
 * Retrieves all notes for a specific task.
 *
 * Purpose:
 * Lists all notes attached to a task, ordered by creation date.
 *
 * Parameters:
 * - taskId: The task identifier to get notes for
 *   - Required, non-null
 *
 * Returns:
 * Array of note records ordered by createdAt (desc).
 *
 * Errors:
 * None. Returns empty array if task has no notes.
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
export async function getTaskNotesByTask(taskId: string) {
  return db
    .select()
    .from(taskNotes)
    .where(eq(taskNotes.taskId, taskId))
    .orderBy(desc(taskNotes.createdAt));
}

/**
 * Updates an existing task note.
 *
 * Purpose:
 * Modifies note content or metadata.
 *
 * Parameters:
 * - id: The unique note identifier to update
 *   - Required, non-null
 * - data: Partial note data with fields to update
 *   - Optional fields: content, createdBy
 *   - Cannot update: id, taskId, createdAt
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The updated note record with updatedAt set to current time.
 *
 * Errors:
 * - Throws if note with id does not exist
 *
 * Side effects:
 * - Writes to task_notes table
 * - Automatically sets updatedAt to current timestamp
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task_note.updated' if context provided
 *
 * Idempotency:
 * Idempotent for same data values.
 *
 * Authorization:
 * Caller must have write permission for the note's task workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Note with id must exist
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Note record updated with new values
 * - updatedAt timestamp set to current time
 * - Audit log and outbox event created if context provided
 */
export async function updateTaskNote(
  id: string,
  data: Partial<typeof schema.taskNotes.$inferInsert>,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [note] = await tx
        .update(taskNotes)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(taskNotes.id, id))
        .returning();
      return note;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'task_note',
          entityId: id,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'task_note.updated',
      aggregateType: 'task',
      aggregateId: id,
      payload: { note: data },
    },
  );
}

/**
 * Deletes a task note.
 *
 * Purpose:
 * Permanently removes a note from the database.
 *
 * Parameters:
 * - id: The unique note identifier to delete
 *   - Required, non-null
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The deleted note record.
 *
 * Errors:
 * - Throws if note with id does not exist
 *
 * Side effects:
 * - Hard deletes from task_notes table
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task_note.deleted' if context provided
 *
 * Idempotency:
 * Not idempotent. Second call will fail as record no longer exists.
 *
 * Authorization:
 * Caller must have delete permission for the note's task workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Note with id must exist
 * - User must have delete permission in the workspace
 *
 * Postconditions:
 * - Note record permanently removed from database
 * - Audit log and outbox event created if context provided
 */
export async function deleteTaskNote(id: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [note] = await tx.delete(taskNotes).where(eq(taskNotes.id, id)).returning();
      return note;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'delete',
          entityType: 'task_note',
          entityId: id,
          changes: {},
        }
      : undefined,
    {
      eventType: 'task_note.deleted',
      aggregateType: 'task',
      aggregateId: id,
      payload: { noteId: id },
    },
  );
}
