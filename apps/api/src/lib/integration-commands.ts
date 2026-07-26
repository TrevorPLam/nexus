/**
 * MODULE: Integration Commands
 *
 * Responsibility:
 * Manages integration-specific commands for creating tasks with
 * calendar events, linking/unlinking tasks to events, with
 * idempotency support for external system integration.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Manages integration-specific business logic.
 * - Delegates low-level DB access to Drizzle.
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all operations
 *   - All referenced IDs must exist in the same workspace
 * - Postconditions:
 *   - All operations are atomic (all succeed or all fail)
 *   - Idempotency keys prevent duplicate operations
 *   - Audit logging and outbox events emitted where applicable
 *
 * Side effects:
 * - Performs database writes across multiple tables in transactions.
 * - Emits audit logs to 'audit_logs' table.
 * - Emits outbox events to 'outbox_events' table for downstream sync/notifications.
 * - Stores idempotency keys for duplicate request detection.
 *
 * Change risk:
 * - Medium. Integration-specific logic with idempotency handling.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/work.ts (persistence layer)
 * - packages/database/src/schema/calendar.ts (calendar events)
 * - packages/contracts/src/work.ts (domain schemas)
 * - apps/api/src/routes/work/integration.ts (API routes)
 *
 * Tags:
 * - domain: work-management
 * - risk: medium
 * - layer: business-logic
 * - stability: stable
 * - concerns: audit, outbox, transactions, idempotency
 *
 * File:
 * - apps/api/src/lib/integration-commands.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { tasks, projects, calendars, events } from '@life-os/database';
import { eq, and } from 'drizzle-orm';

import { createAuditLog, createOutboxEvent } from './audit.js';
import { checkIdempotencyKey, createIdempotencyKey } from './idempotency.js';
import { withTransaction } from './work-operations.js';

/**
 * Integration command: Creates a task with optional calendar event.
 *
 * Purpose:
 * Creates a task and optionally creates a linked calendar event
 * in a single transaction with idempotency support.
 *
 * Parameters:
 * - data: Command data object
 *   - Required: workspaceId, title, status, priority, createCalendarEvent
 *   - Optional: projectId, description, dueDate, dueTime, estimatedDuration,
 *     calendarId, idempotencyKey
 * - userId: Optional user identifier for audit logging
 *   - Optional, non-null
 *
 * Returns:
 * Object containing:
 * - task: The created task record
 * - event: The created event record or null
 * - isIdempotent: true if this was a duplicate request
 * - responseStatus: HTTP status code for idempotent responses
 * - responseBody: Cached response for idempotent requests
 *
 * Errors:
 * - Throws if project does not belong to workspace
 * - Throws if calendar does not belong to workspace
 * - Throws if database insertion fails
 *
 * Side effects:
 * - Writes to tasks table
 * - Writes to events table (if createCalendarEvent=true)
 * - Creates audit log entry if userId provided
 * - Creates outbox event 'task_with_event.created'
 * - Stores idempotency key if provided
 *
 * Idempotency:
 * Idempotent when idempotencyKey is provided. Returns cached response
 * for duplicate requests.
 *
 * Authorization:
 * Caller must have write permission for the workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - workspaceId must reference an existing workspace
 * - If projectId provided, must belong to workspace
 * - If calendarId provided with createCalendarEvent=true, must belong to workspace
 *
 * Postconditions:
 * - Task record exists in database
 * - Event record exists if createCalendarEvent=true
 * - Task linked to event via calendarEventId
 * - Audit log and outbox event created
 */
export async function createTaskWithEventCommand(
  data: {
    workspaceId: string;
    projectId?: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    dueDate?: string;
    dueTime?: string;
    estimatedDuration?: number;
    createCalendarEvent: boolean;
    calendarId?: string;
    idempotencyKey?: string;
  },
  userId?: string,
) {
  const endpoint = 'POST /tasks-with-event';

  // Check idempotency if key provided
  if (data.idempotencyKey && userId) {
    const idempotencyCheck = await checkIdempotencyKey(data.idempotencyKey, userId, endpoint);
    if (idempotencyCheck.isDuplicate) {
      return {
        isIdempotent: true,
        responseStatus: idempotencyCheck.responseStatus,
        responseBody: idempotencyCheck.responseBody,
      };
    }
  }

  return withTransaction(async (tx) => {
    // Verify project belongs to workspace if provided
    if (data.projectId) {
      const [project] = await tx
        .select()
        .from(projects)
        .where(and(eq(projects.id, data.projectId), eq(projects.workspaceId, data.workspaceId)))
        .limit(1);

      if (!project) {
        throw new Error('Project not found or does not belong to workspace');
      }
    }

    // Verify calendar belongs to workspace if creating event
    if (data.createCalendarEvent && data.calendarId) {
      const [calendar] = await tx
        .select()
        .from(calendars)
        .where(and(eq(calendars.id, data.calendarId), eq(calendars.workspaceId, data.workspaceId)))
        .limit(1);

      if (!calendar) {
        throw new Error('Calendar not found or does not belong to workspace');
      }
    }

    // Create task
    const [task] = await tx
      .insert(tasks)
      .values({
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        dueTime: data.dueTime,
        estimatedDuration: data.estimatedDuration ? String(data.estimatedDuration) : null,
      })
      .returning();

    if (!task) {
      throw new Error('Failed to create task');
    }

    let event = null;

    // Create calendar event if requested
    if (data.createCalendarEvent && data.dueDate && data.calendarId) {
      const eventStart = new Date(data.dueDate);
      if (data.dueTime) {
        const [hours, minutes] = data.dueTime.split(':').map(Number);
        eventStart.setHours(hours, minutes, 0, 0);
      }

      const eventEnd = new Date(eventStart);
      if (data.estimatedDuration) {
        eventEnd.setMinutes(eventEnd.getMinutes() + data.estimatedDuration);
      }

      const [newEvent] = await tx
        .insert(events)
        .values({
          calendarId: data.calendarId,
          title: data.title,
          description: data.description,
          start: eventStart,
          end: eventEnd,
          location: null,
        })
        .returning();

      event = newEvent;

      // Update task with calendar event reference
      await tx.update(tasks).set({ calendarEventId: newEvent.id }).where(eq(tasks.id, task.id));
    }

    // Store idempotency key if provided
    if (data.idempotencyKey && userId) {
      await createIdempotencyKey(
        data.idempotencyKey,
        userId,
        endpoint,
        201,
        JSON.stringify({ task, event }),
      );
    }

    // Create audit log and outbox event
    if (userId && data.workspaceId) {
      await createAuditLog(
        {
          action: 'create',
          entityType: 'task_with_event',
          entityId: task.id,
          userId,
          workspaceId: data.workspaceId,
          changes: { new: { task, event } },
        },
        tx,
      );

      await createOutboxEvent(
        {
          eventType: 'task_with_event.created',
          aggregateType: 'task',
          aggregateId: task.id,
          payload: { task, event },
        },
        tx,
      );
    }

    return {
      task,
      event,
      isIdempotent: false,
    };
  });
}
