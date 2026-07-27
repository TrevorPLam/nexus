/**
 * Availability Calculation
 *
 * Re-exports all availability functions for backward compatibility.
 * This file has been split into:
 * - availability-time-utils.ts (time parsing and utilities)
 * - availability-slots.ts (slot generation functions)
 */

export type { TimeSlot, AvailabilityConfig } from './availability-slots.js';
export { calculateAvailableSlots, findNextAvailableSlot } from './availability-slots.js';
export { parseTimeToMinutes, getDateOnly, isDayAvailable } from './availability-time-utils.js';
