/**
 * Event Operations
 *
 * Re-exports all event operations for backward compatibility.
 * This file has been split into:
 * - event-read.ts (read operations)
 * - event-write.ts (write operations)
 */

export {
  getEventById,
  getEventsByCalendar,
  getEventsByWorkspace,
} from './event-read.js';

export {
  createEvent,
  updateEvent,
  deleteEvent,
} from './event-write.js';
