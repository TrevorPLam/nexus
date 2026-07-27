/**
 * MODULE: Availability Time Utilities
 *
 * Responsibility:
 * Provides time parsing and utility functions for availability calculations.
 *
 * Boundaries:
 * - Pure calculation logic; no database or external service calls.
 * - Used by availability-slots.ts for slot generation.
 *
 * Critical invariants:
 * - Time parsing handles malformed input gracefully
 * - Date normalization sets time to midnight
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - Low. Pure utility functions.
 *
 * Links:
 * - apps/api/src/lib/availability.ts (parent module)
 *
 * Tags:
 * - domain: calendar
 * - risk: low
 * - layer: utilities
 * - stability: stable
 * - concerns: time-utilities
 *
 * File:
 * - apps/api/src/lib/availability-time-utils.ts
 *
 * Last updated:
 * - July 26, 2026
 */

/**
 * Parses a time string in HH:MM format to minutes since midnight.
 *
 * Purpose:
 * Converts a human-readable time string to a numeric value
 * for time arithmetic.
 *
 * Parameters:
 * - timeStr: Time string in HH:MM format
 *   - Required, non-null
 *   - Hours: 0-23, Minutes: 0-59
 *
 * Returns:
 * Number of minutes since midnight (0-1439).
 *
 * Errors:
 * - Returns 0 for malformed input (graceful degradation)
 *
 * Side effects:
 * None. Pure function.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Not applicable (utility function).
 */
export function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/**
 * Extracts the date portion (midnight) of a Date object.
 *
 * Purpose:
 * Normalizes a date to midnight for date-only comparisons.
 *
 * Parameters:
 * - date: The date to normalize
 *   - Required, non-null
 *
 * Returns:
 * New Date object with time set to 00:00:00.000.
 *
 * Errors:
 * None.
 *
 * Side effects:
 * None. Pure function.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Not applicable (utility function).
 */
export function getDateOnly(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Checks if a date falls on an available day of the week.
 *
 * Purpose:
 * Determines if a date should be included in availability
 * calculations based on day-of-week restrictions.
 *
 * Parameters:
 * - date: The date to check
 *   - Required, non-null
 * - availableDays: Array of available day numbers (0-6, Sunday=0)
 *   - Optional, null means all days are available
 *
 * Returns:
 * True if the date's day is in availableDays or if availableDays is null.
 *
 * Errors:
 * None.
 *
 * Side effects:
 * None. Pure function.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Not applicable (utility function).
 */
export function isDayAvailable(date: Date, availableDays: number[] | null): boolean {
  if (!availableDays || availableDays.length === 0) {
    return true; // All days available if not specified
  }
  const day = date.getDay();
  return availableDays.includes(day);
}
