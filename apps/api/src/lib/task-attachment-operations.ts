/**
 * MODULE: Task Attachment Operations
 *
 * Responsibility:
 * Manages task attachment operations including creation, retrieval,
 * and deletion with transactional integrity, audit logging,
 * and outbox event emission.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Manages attachment-specific business logic.
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
 * - Low. Simple CRUD operations for attachments.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/work.ts (persistence layer)
 * - packages/contracts/src/work.ts (domain schemas)
 * - apps/api/src/routes/work/task-attachments.ts (API routes)
 *
 * Tags:
 * - domain: work-management
 * - risk: low
 * - layer: business-logic
 * - stability: stable
 * - concerns: audit, outbox, transactions
 *
 * File:
 * - apps/api/src/lib/task-attachment-operations.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { taskAttachments } from '@life-os/database';
import { eq, desc } from 'drizzle-orm';

import { executeCommandWithoutIdempotency, type CommandContext } from './command-context.js';
import { db } from './db.js';

/**
 * Creates a new attachment for a task.
 *
 * Purpose:
 * Persists a file attachment reference for a task.
 *
 * Parameters:
 * - data: Task attachment insert data
 *   - Required: id, taskId, fileName, fileUrl, uploadedBy
 *   - Optional: fileSize, mimeType
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The created attachment record.
 *
 * Errors:
 * - Throws if database insertion fails
 * - Throws if taskId is invalid (foreign key constraint)
 *
 * Side effects:
 * - Writes to task_attachments table
 * - Does NOT manage file storage (file must already be stored)
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task_attachment.created' if context provided
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
 * - File must already be stored in storage service
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Attachment record exists in database
 * - Audit log and outbox event created if context provided
 *
 * Note:
 * This function only stores metadata. File deletion is not handled here.
 */
export async function createTaskAttachment(
  data: typeof schema.taskAttachments.$inferInsert,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [attachment] = await tx.insert(taskAttachments).values(data).returning();
      return attachment;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'task_attachment',
          entityId: data.taskId,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'task_attachment.created',
      aggregateType: 'task',
      aggregateId: data.taskId,
      payload: { attachment: data },
    },
  );
}

/**
 * Retrieves a task attachment by its unique identifier.
 *
 * Purpose:
 * Fetches a single attachment record for display or download.
 *
 * Parameters:
 * - id: The unique attachment identifier (UUID)
 *   - Required, non-null
 *
 * Returns:
 * The attachment record if found, or null if not found.
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
 * Caller must have read access to the attachment's task workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - id must be a valid UUID format
 *
 * Postconditions:
 * - None (read-only)
 */
export async function getTaskAttachmentById(id: string) {
  const [attachment] = await db.select().from(taskAttachments).where(eq(taskAttachments.id, id));
  return attachment;
}

/**
 * Retrieves all attachments for a specific task.
 *
 * Purpose:
 * Lists all file attachments attached to a task.
 *
 * Parameters:
 * - taskId: The task identifier to get attachments for
 *   - Required, non-null
 *
 * Returns:
 * Array of attachment records ordered by createdAt (desc).
 *
 * Errors:
 * None. Returns empty array if task has no attachments.
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
export async function getTaskAttachmentsByTask(taskId: string) {
  return db
    .select()
    .from(taskAttachments)
    .where(eq(taskAttachments.taskId, taskId))
    .orderBy(desc(taskAttachments.createdAt));
}

/**
 * Deletes a task attachment.
 *
 * Purpose:
 * Permanently removes an attachment reference from the database.
 *
 * Parameters:
 * - id: The unique attachment identifier to delete
 *   - Required, non-null
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * The deleted attachment record.
 *
 * Errors:
 * - Throws if attachment with id does not exist
 *
 * Side effects:
 * - Hard deletes from task_attachments table
 * - Does NOT delete the actual file from storage
 * - Emits audit log entry if context provided
 * - Emits outbox event 'task_attachment.deleted' if context provided
 *
 * Idempotency:
 * Not idempotent. Second call will fail as record no longer exists.
 *
 * Authorization:
 * Caller must have delete permission for the attachment's task workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - Attachment with id must exist
 * - User must have delete permission in the workspace
 *
 * Postconditions:
 * - Attachment record permanently removed from database
 * - Audit log and outbox event created if context provided
 *
 * Note:
 * File deletion from storage must be handled separately via storage service.
 */
export async function deleteTaskAttachment(id: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [attachment] = await tx
        .delete(taskAttachments)
        .where(eq(taskAttachments.id, id))
        .returning();
      return attachment;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'delete',
          entityType: 'task_attachment',
          entityId: id,
          changes: {},
        }
      : undefined,
    {
      eventType: 'task_attachment.deleted',
      aggregateType: 'task',
      aggregateId: id,
      payload: { attachmentId: id },
    },
  );
}
