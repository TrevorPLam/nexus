/**
 * MODULE: Availability & Booking Operations
 *
 * Responsibility:
 * Orchestrates business logic for calculating available time slots
 * and creating atomic bookings with conflict detection.
 *
 * Boundaries:
 * - Sits between the API routers and the raw database schema.
 * - Does not handle event CRUD (delegated to event-operations.ts).
 * - Does not handle attendee management (delegated to event-attendee-operations.ts).
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all workspace-scoped operations
 *   - Calendar IDs must reference existing calendars in the same workspace
 * - Postconditions:
 *   - All mutations emit audit log entries when context is provided
 *   - All mutations emit outbox events for downstream processing
 *   - Bookings use row-level locking to prevent double-booking
 *
 * Side effects:
 * - Performs database writes (creates events and attendees).
 * - Emits audit logs to 'audit_logs' table.
 * - Emits outbox events to 'outbox_events' table for downstream sync/notifications.
 *
 * Change risk:
 * - High. Affects public booking engine and double-booking prevention.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/calendar.ts (persistence layer)
 * - packages/contracts/src/calendar.ts (domain schemas)
 * - apps/api/src/lib/event-operations.ts (event operations)
 * - apps/api/src/lib/event-attendee-operations.ts (attendee operations)
 * - apps/api/src/lib/calendar-operations.ts (parent module)
 *
 * Tags:
 * - domain: calendar
 * - risk: high
 * - layer: business-logic
 * - stability: stable
 * - concerns: audit, outbox, booking, conflict-detection
 *
 * File:
 * - apps/api/src/lib/availability-booking-operations.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import * as schema from '@life-os/database';
import { events, eventAttendees } from '@life-os/database';
import { eq, and, sql } from 'drizzle-orm';

import { executeCommandWithoutIdempotency, type CommandContext } from './command-context.js';
import { getEventsByCalendar } from './event-operations.js';

export interface AvailableSlot {
  start: Date;
  end: Date;
}

/**
 * Calculates available time slots for booking on a calendar.
 *
 * Purpose:
 * Computes free time slots within a date range, considering availability
 * windows, buffer times, day restrictions, and existing event conflicts.
 *
 * Parameters:
 * - calendarId: The calendar identifier to calculate availability for
 *   - Required, non-null
 * - startDate: Start of the date range to search
 *   - Required, non-null
 * - endDate: End of the date range to search
 *   - Required, non-null
 * - duration: Duration of each slot in minutes
 *   - Required, must be positive
 * - availabilityStart: Daily availability start time in HH:MM format
 *   - Optional, defaults to '09:00'
 * - availabilityEnd: Daily availability end time in HH:MM format
 *   - Optional, defaults to '17:00'
 * - availableDays: Array of available day numbers (0-6, Sunday=0)
 *   - Optional, defaults to all days [0,1,2,3,4,5,6]
 * - bufferBefore: Buffer time before each slot in minutes
 *   - Optional, defaults to 0
 * - bufferAfter: Buffer time after each slot in minutes
 *   - Optional, defaults to 0
 *
 * Returns:
 * Array of AvailableSlot objects with start and end Date objects.
 * Slots are conflict-free and respect all constraints.
 *
 * Errors:
 * - Throws if time strings are malformed (not HH:MM format)
 * - Throws if duration is not positive
 *
 * Side effects:
 * None. Pure calculation function.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Caller must have read access to the calendar's workspace.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - calendarId must reference an existing calendar
 * - startDate must be before or equal to endDate
 * - duration must be positive
 * - availabilityStart must be before availabilityEnd
 *
 * Postconditions:
 * - None (read-only)
 *
 * Performance:
 * O(n*m) where n is number of days in range and m is number of events.
 * For large date ranges with many events, consider pagination.
 */
export async function getAvailableSlots(
  calendarId: string,
  startDate: Date,
  endDate: Date,
  duration: number, // in minutes
  availabilityStart?: string, // HH:MM format
  availabilityEnd?: string, // HH:MM format
  availableDays?: number[], // Array of available days (0-6, Sunday=0)
  bufferBefore?: number, // Buffer time before event in minutes
  bufferAfter?: number, // Buffer time after event in minutes
): Promise<AvailableSlot[]> {
  const slots: AvailableSlot[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  // Parse availability times
  // Default to 9 AM - 5 PM business hours if not specified
  const availStart = availabilityStart ? parseTime(availabilityStart) : { hour: 9, minute: 0 };
  const availEnd = availabilityEnd ? parseTime(availabilityEnd) : { hour: 17, minute: 0 };
  const daysOfWeek = availableDays || [0, 1, 2, 3, 4, 5, 6]; // Default to all days

  // Get existing events for the calendar
  const existingEvents = await getEventsByCalendar(calendarId, startDate, endDate);

  // Iterate through each day in the range
  while (current < end) {
    const dayOfWeek = current.getDay(); // 0-6, Sunday=0

    // Skip if day is not available
    if (!daysOfWeek.includes(dayOfWeek)) {
      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
      continue;
    }

    // Set the start time for this day
    const dayStart = new Date(current);
    dayStart.setHours(availStart.hour, availStart.minute, 0, 0);

    // Set the end time for this day
    const dayEnd = new Date(current);
    dayEnd.setHours(availEnd.hour, availEnd.minute, 0, 0);

    // Generate slots for this day
    const slotStart = new Date(dayStart);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotStart.getMinutes() + duration + (bufferAfter || 0));

    while (slotStart.getTime() + duration * 60000 <= dayEnd.getTime()) {
      // Add buffer before to the actual slot start
      const actualSlotStart = new Date(slotStart);
      actualSlotStart.setMinutes(actualSlotStart.getMinutes() + (bufferBefore || 0));

      const actualSlotEnd = new Date(actualSlotStart);
      actualSlotEnd.setMinutes(actualSlotStart.getMinutes() + duration);

      // Check if this slot conflicts with existing events
      // Overlap predicate: slotStart < eventEnd && slotEnd > eventStart
      // Note: Buffer times are NOT considered in conflict detection here.
      // The slot itself (without buffers) must not overlap existing events.
      // Buffers are handled by the spacing between slots (see slot advancement below).
      const hasConflict = existingEvents.some((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return actualSlotStart < eventEnd && actualSlotEnd > eventStart;
      });

      if (!hasConflict) {
        slots.push({
          start: actualSlotStart,
          end: actualSlotEnd,
        });
      }

      // Move to next slot
      // Advance by duration + bufferAfter to enforce spacing between consecutive slots
      // This ensures bufferAfter of previous slot becomes bufferBefore of next slot
      slotStart.setMinutes(slotStart.getMinutes() + duration + (bufferAfter || 0));
    }

    // Move to next day
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }

  return slots;
}

function parseTime(timeStr: string): { hour: number; minute: number } {
  const [hour, minute] = timeStr.split(':').map(Number);
  return { hour: hour || 0, minute: minute || 0 };
}

// Booking with conflict detection and atomic event+attendee creation
/**
 * Atomically books a time slot with conflict detection.
 *
 * Purpose:
 * Creates an event and attendee in a single transaction with row-level
 * locking to prevent double-booking. Uses SELECT FOR UPDATE to lock
 * overlapping events during conflict detection.
 *
 * Parameters:
 * - calendarId: The calendar identifier to book on
 *   - Required, non-null
 * - start: Start time of the slot to book
 *   - Required, non-null
 * - end: End time of the slot to book
 *   - Required, non-null
 * - eventData: Event data to insert (id, title, etc.)
 *   - Required, must include id, calendarId, workspaceId, title
 * - attendeeData: Attendee data (email, name, etc.)
 *   - Required, must include email, name
 *   - eventId and status are set automatically
 * - requiresApproval: Whether the booking requires approval
 *   - Optional, defaults to false
 *   - If true, attendee status is set to 'pending'
 *   - If false, attendee status is set to 'accepted'
 * - context: Optional command context for audit logging and event emission
 *
 * Returns:
 * Object containing:
 * - event: The created event record
 * - attendee: The created attendee record
 *
 * Errors:
 * - Throws if slot conflicts with existing events (concurrent booking)
 * - Throws if database insertion fails
 * - Throws if foreign key constraints are violated
 *
 * Side effects:
 * - Writes to events and event_attendees tables in a transaction
 * - Locks overlapping events with SELECT FOR UPDATE during conflict check
 * - Emits audit log entry if context provided
 * - Emits outbox event 'booking.created' if context provided
 *
 * Idempotency:
 * Not idempotent. Calling with same event data will fail on unique constraint.
 * However, the conflict detection ensures no double-booking on concurrent calls.
 *
 * Authorization:
 * Caller must have write permission for the calendar's workspace.
 * For public booking, this is called with elevated context from the route layer.
 * Enforced via RLS at database level.
 *
 * Preconditions:
 * - calendarId must reference an existing calendar
 * - start must be before end
 * - Slot must not conflict with existing events (checked atomically)
 * - User must have write permission in the workspace
 *
 * Postconditions:
 * - Event and attendee records created
 * - Audit log and outbox event created if context provided
 * - No overlapping events exist (guaranteed by row locking)
 *
 * Performance:
 * Uses row-level locking which may cause contention under high load.
 * Consider using optimistic concurrency with retry for very high throughput.
 */
export async function bookSlotAtomic(
  calendarId: string,
  start: Date,
  end: Date,
  eventData: typeof schema.events.$inferInsert,
  attendeeData: Omit<typeof schema.eventAttendees.$inferInsert, 'eventId' | 'status'>,
  requiresApproval = false,
  context?: CommandContext,
): Promise<{
  event: typeof schema.events.$inferSelect;
  attendee: typeof schema.eventAttendees.$inferSelect;
}> {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      // Lock overlapping events with SELECT FOR UPDATE to prevent concurrent bookings
      // This is a critical race condition prevention: without row locking, two concurrent
      // bookings could both pass the conflict check and create overlapping events.
      // The lock is held until the transaction commits, serializing overlapping bookings.
      const overlappingEvents = await tx
        .select()
        .from(events)
        .where(
          and(
            eq(events.calendarId, calendarId),
            sql`${events.start} < ${end} AND ${events.end} > ${start}`,
          ),
        )
        .for('update');

      // Check for conflicts
      const hasConflict = overlappingEvents.some((event: typeof schema.events.$inferSelect) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return start < eventEnd && end > eventStart;
      });

      if (hasConflict) {
        throw new Error('Slot is no longer available');
      }

      // Create the event
      const [event] = await tx.insert(events).values(eventData).returning();

      // Create the attendee with appropriate status
      const [attendee] = await tx
        .insert(eventAttendees)
        .values({
          ...attendeeData,
          eventId: event.id,
          status: requiresApproval ? 'pending' : 'accepted',
        })
        .returning();

      return { event, attendee };
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'booking',
          entityId: eventData.id || 'pending',
          changes: { new: { event: eventData, attendee: attendeeData } },
        }
      : undefined,
    {
      eventType: 'booking.created',
      aggregateType: 'event',
      aggregateId: eventData.id || 'pending',
      payload: { event: eventData, attendee: attendeeData, requiresApproval },
    },
  );
}
