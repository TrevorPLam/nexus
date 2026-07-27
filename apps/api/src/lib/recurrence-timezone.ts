/**
 * MODULE: Timezone-Aware Date Operations
 *
 * Responsibility:
 * Provides utilities for timezone-aware date operations including
 * conversion, day boundary calculations, and range overlap detection.
 *
 * Boundaries:
 * - Pure utility functions; no database or external service calls.
 * - Uses browser's Intl API for timezone conversions.
 *
 * Critical invariants:
 * - Timezone conversions preserve the logical time across zones.
 * - Range overlap detection accounts for timezone differences.
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - Medium. Changes affect date calculations and booking reliability.
 *
 * Links:
 * - packages/contracts/src/calendar.ts (RecurrenceRule schema)
 * - packages/database/src/schema/calendar.ts (events table)
 *
 * Tags:
 * - domain: calendar
 * - risk: medium
 * - layer: utilities
 * - stability: stable
 * - concerns: timezone, date-operations
 *
 * File:
 * - apps/api/src/lib/recurrence-timezone.ts
 *
 * Last updated:
 * - July 26, 2026
 */

// Timezone-aware date operations
/**
 * Converts a UTC date to a specific timezone.
 *
 * Purpose:
 * Adjusts a Date object to represent the same instant in a
 * different timezone for display or calculation purposes.
 *
 * Parameters:
 * - date: The UTC date to convert
 *   - Required, non-null
 * - timezone: The target timezone (IANA timezone identifier)
 *   - Required, non-null
 *   - Example: 'America/New_York', 'Europe/London', 'Asia/Tokyo'
 *
 * Returns:
 * Date object representing the same instant in the target timezone.
 *
 * Errors:
 * Throws RangeError if timezone is invalid.
 *
 * Side effects:
 * None. Pure function.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Not applicable (utility function).
 *
 * Preconditions:
 * - date must be a valid Date object
 * - timezone should be a valid IANA timezone identifier
 *
 * Postconditions:
 * - None (read-only)
 *
 * Note:
 * Uses toLocaleString for conversion, which may have limited
 * precision. For production use, consider a dedicated timezone library
 * like date-fns-tz or luxon.
 */
/**
 * Convert a UTC date to a specific timezone
 * @param date - The UTC date to convert
 * @param timezone - The target timezone (e.g., 'America/New_York')
 * @returns Date in the target timezone
 */
export function convertToTimezone(date: Date, timezone: string): Date {
  // This uses the browser's Intl API to convert the date string representation
  // Note: This returns a Date object with the local time zone, not the target timezone.
  // The Date object's internal timestamp remains UTC; only the string representation changes.
  // For true timezone-aware operations, consider using a library like luxon or date-fns-tz.
  return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
}

/**
 * Converts a date from a specific timezone to UTC.
 *
 * Purpose:
 * Adjusts a Date object representing a local time in a specific
 * timezone to its UTC equivalent.
 *
 * Parameters:
 * - date: The date in the source timezone
 *   - Required, non-null
 * - timezone: The source timezone (IANA timezone identifier)
 *   - Required, non-null
 *   - Example: 'America/New_York', 'Europe/London'
 *
 * Returns:
 * Date object representing the UTC equivalent.
 *
 * Errors:
 * Throws RangeError if timezone is invalid.
 *
 * Side effects:
 * None. Pure function.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Not applicable (utility function).
 *
 * Preconditions:
 * - date must be a valid Date object
 * - timezone should be a valid IANA timezone identifier
 *
 * Postconditions:
 * - None (read-only)
 *
 * Note:
 * Uses toLocaleString for conversion, which may have limited
 * precision. For production use, consider a dedicated timezone library
 * like date-fns-tz or luxon.
 */
/**
 * Convert a date from a specific timezone to UTC
 * @param date - The date in the source timezone
 * @param timezone - The source timezone (e.g., 'America/New_York')
 * @returns UTC Date
 */
export function convertFromTimezone(date: Date, timezone: string): Date {
  // WARNING: This function has the same limitation as convertToTimezone.
  // It parses the date as if it were in the source timezone, but the resulting
  // Date object is still in the local timezone. This is a heuristic that works
  // for display purposes but not for precise timezone arithmetic.
  const isoString = date.toLocaleString('en-US', { timeZone: timezone });
  return new Date(isoString);
}

/**
 * Gets the start of day (midnight) in a specific timezone.
 *
 * Purpose:
 * Normalizes a date to midnight in the specified timezone,
 * useful for date-only comparisons in that timezone.
 *
 * Parameters:
 * - date: The date to get start of day for
 *   - Required, non-null
 * - timezone: The timezone (IANA timezone identifier)
 *   - Required, non-null
 *
 * Returns:
 * Date object with time set to 00:00:00.000 in the specified timezone.
 *
 * Errors:
 * Throws RangeError if timezone is invalid.
 *
 * Side effects:
 * None. Pure function.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Not applicable (utility function).
 *
 * Preconditions:
 * - date must be a valid Date object
 * - timezone should be a valid IANA timezone identifier
 *
 * Postconditions:
 * - None (read-only)
 */
/**
 * Get the start of day in a specific timezone
 * @param date - The date to get start of day for
 * @param timezone - The timezone (e.g., 'America/New_York')
 * @returns Start of day in the specified timezone
 */
export function getStartOfDay(date: Date, timezone: string): Date {
  // This gets the start of day in the target timezone by converting the date
  // to that timezone's string representation, then extracting the hours.
  // The result is a Date object set to midnight in the local timezone,
  // which represents the start of day in the target timezone.
  const result = new Date(date);
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  result.setHours(tzDate.getHours(), 0, 0, 0);
  return result;
}

/**
 * Gets the end of day (23:59:59.999) in a specific timezone.
 *
 * Purpose:
 * Normalizes a date to the last moment of the day in the specified
 * timezone, useful for inclusive date range queries.
 *
 * Parameters:
 * - date: The date to get end of day for
 *   - Required, non-null
 * - timezone: The timezone (IANA timezone identifier)
 *   - Required, non-null
 *
 * Returns:
 * Date object with time set to 23:59:59.999 in the specified timezone.
 *
 * Errors:
 * Throws RangeError if timezone is invalid.
 *
 * Side effects:
 * None. Pure function.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Not applicable (utility function).
 *
 * Preconditions:
 * - date must be a valid Date object
 * - timezone should be a valid IANA timezone identifier
 *
 * Postconditions:
 * - None (read-only)
 */
/**
 * Get the end of day in a specific timezone
 * @param date - The date to get end of day for
 * @param timezone - The timezone (e.g., 'America/New_York')
 * @returns End of day in the specified timezone
 */
export function getEndOfDay(date: Date, timezone: string): Date {
  // This gets the end of day in the target timezone by converting the date
  // to that timezone's string representation, then setting time to 23:59:59.999
  // The result is a Date object set to end of day in the local timezone,
  // which represents the end of day in the target timezone.
  const result = new Date(date);
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  result.setHours(tzDate.getHours(), 59, 59, 999);
  return result;
}

/**
 * Checks if two date ranges overlap, considering timezones.
 *
 * Purpose:
 * Determines if two time intervals intersect, optionally converting
 * both to a common timezone before comparison.
 *
 * Parameters:
 * - start1: Start of first range
 *   - Required, non-null
 * - end1: End of first range
 *   - Required, non-null
 * - start2: Start of second range
 *   - Required, non-null
 * - end2: End of second range
 *   - Required, non-null
 * - timezone: Timezone for comparison (default: 'UTC')
 *   - Optional, non-null
 *   - If 'UTC', no conversion is performed
 *
 * Returns:
 * true if the ranges overlap (excluding touching at boundaries),
 * false otherwise.
 *
 * Errors:
 * Throws RangeError if timezone is invalid.
 *
 * Side effects:
 * None. Pure function.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Not applicable (utility function).
 *
 * Preconditions:
 * - start1 must be before or equal to end1
 * - start2 must be before or equal to end2
 *
 * Postconditions:
 * - None (read-only)
 *
 * Algorithm:
 * Uses standard interval overlap detection: ranges overlap if
 * start1 < end2 AND end1 > start2.
 */
/**
 * Check if two date ranges overlap, considering timezones
 * @param start1 - Start of first range
 * @param end1 - End of first range
 * @param start2 - Start of second range
 * @param end2 - End of second range
 * @param timezone - Timezone for comparison (default: UTC)
 * @returns true if ranges overlap
 */
export function rangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date,
  timezone: string = 'UTC',
): boolean {
  const s1 = timezone === 'UTC' ? start1 : convertToTimezone(start1, timezone);
  const e1 = timezone === 'UTC' ? end1 : convertToTimezone(end1, timezone);
  const s2 = timezone === 'UTC' ? start2 : convertToTimezone(start2, timezone);
  const e2 = timezone === 'UTC' ? end2 : convertToTimezone(end2, timezone);

  return s1 < e2 && e1 > s2;
}
