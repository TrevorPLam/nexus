/**
 * MODULE: Calendar Operations (Re-exports)
 *
 * Responsibility:
 * This file now serves as a backward compatibility layer, re-exporting all calendar
 * operations from their respective domain-specific modules.
 *
 * The original monolithic calendar-operations.ts has been split into:
 * - calendar-crud-operations.ts: Calendar CRUD operations
 * - event-operations.ts: Event CRUD operations
 * - event-attendee-operations.ts: Event attendee operations
 * - calendar-batch-operations.ts: Batch query operations
 * - event-task-link-operations.ts: Event-task linking operations
 * - recurring-event-operations.ts: Recurring event operations
 * - scheduling-link-operations.ts: Scheduling link operations
 * - availability-booking-operations.ts: Availability and booking operations
 *
 * Migration Guide:
 * New code should import directly from the specific module:
 *   import { createCalendar } from './calendar-crud-operations.js';
 *
 * Legacy imports from this file will continue to work for backward compatibility.
 *
 * Last updated:
 * - July 22, 2026
 */

// Calendar CRUD operations
export {
  createCalendar,
  getCalendarById,
  getCalendarsByWorkspace,
  updateCalendar,
  deleteCalendar,
} from './calendar-crud-operations.js';

// Event operations
export {
  createEvent,
  getEventById,
  getEventsByCalendar,
  getEventsByWorkspace,
  updateEvent,
  deleteEvent,
} from './event-operations.js';

// Event attendee operations
export {
  createEventAttendee,
  getEventAttendees,
  updateEventAttendee,
  deleteEventAttendee,
} from './event-attendee-operations.js';

// Batch operations
export { getCalendarsWithEvents, getEventWithAttendees } from './calendar-batch-operations.js';

// Event-task link operations
export {
  getEventsByTask,
  linkEventToTask,
  unlinkEventFromTask,
} from './event-task-link-operations.js';

// Recurring event operations
export { getRecurringEventInstances, getBaseRecurringEvent } from './recurring-event-operations.js';

// Scheduling link operations
export {
  createSchedulingLink,
  getSchedulingLinkById,
  getSchedulingLinkBySlug,
  getSchedulingLinksByWorkspace,
  getSchedulingLinksByUser,
  updateSchedulingLink,
  deleteSchedulingLink,
} from './scheduling-link-operations.js';

// Availability and booking operations
export {
  getAvailableSlots,
  bookSlotAtomic,
  type AvailableSlot,
} from './availability-booking-operations.js';
