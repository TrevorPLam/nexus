/**
 * MODULE: RRULE Operations
 *
 * Responsibility:
 * Provides utilities for expanding recurring events using RRULE format,
 * validating recurrence rules, and generating RRULE strings from parameters.
 *
 * Boundaries:
 * - Pure utility functions; no database or external service calls.
 * - Uses rrule library for RRULE parsing and expansion.
 *
 * Critical invariants:
 * - RRULE strings must conform to RFC 5545 specification.
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - Medium. Changes affect recurring event generation and booking reliability.
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
 * - concerns: recurrence, rfc5545
 *
 * File:
 * - apps/api/src/lib/recurrence-rrule.ts
 *
 * Last updated:
 * - July 26, 2026
 */

import { rrulestr } from 'rrule';

/**
 * Expands a recurring event into instances within a date range.
 *
 * Purpose:
 * Generates all occurrences of a recurring event based on RRULE
 * specification, returning only those within the specified date range.
 *
 * Parameters:
 * - startDate: The start date of the recurring event (base occurrence)
 *   - Required, non-null
 * - recurrenceRule: The RRULE string (RFC 5545 format)
 *   - Required, non-null
 *   - Example: "FREQ=WEEKLY;BYDAY=MO,WE"
 * - rangeStart: Start of the date range to expand
 *   - Required, non-null
 * - rangeEnd: End of the date range to expand
 *   - Required, non-null
 * - timezone: Timezone for the event (default: 'UTC')
 *   - Optional, non-null
 *
 * Returns:
 * Array of Date objects representing each occurrence within the range.
 * Returns empty array if no occurrences fall within range.
 *
 * Errors:
 * - Logs error to console if RRULE parsing fails
 * - Returns original date if in range as fallback on parse failure
 *
 * Side effects:
 * - Logs to console on error (side effect for debugging)
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Not applicable (utility function - authorization enforced at call site).
 *
 * Preconditions:
 * - startDate must be a valid Date object
 * - recurrenceRule must conform to RFC 5545
 * - rangeStart must be before or equal to rangeEnd
 *
 * Postconditions:
 * - None (read-only)
 *
 * Performance:
 * Uses rrule library for efficient recurrence expansion.
 */
/**
 * Expand a recurring event into instances within a date range
 * @param startDate - The start date of the recurring event
 * @param recurrenceRule - The RRULE string (e.g., "FREQ=WEEKLY;BYDAY=MO,WE")
 * @param rangeStart - Start of the date range to expand
 * @param rangeEnd - End of the date range to expand
 * @param timezone - Timezone for the event (default: UTC)
 * @returns Array of Date objects representing each occurrence
 */
export function expandRecurringEvent(
  startDate: Date,
  recurrenceRule: string,
  rangeStart: Date,
  rangeEnd: Date,
  timezone: string = 'UTC',
): Date[] {
  try {
    // Parse the RRULE string
    const rule = rrulestr(recurrenceRule, {
      dtstart: startDate,
      tzid: timezone,
    });

    // Get all occurrences within the date range
    // The third parameter (true) enables inclusive range matching
    const occurrences = rule.between(rangeStart, rangeEnd, true);

    return occurrences;
  } catch (error) {
    console.error('Error expanding recurring event:', error);
    // If RRULE parsing fails, return just the original date if it's in range
    // This is a graceful degradation strategy: better to show one event than none
    if (startDate >= rangeStart && startDate <= rangeEnd) {
      return [startDate];
    }
    return [];
  }
}

/**
 * Validates an RRULE string against RFC 5545 specification.
 *
 * Purpose:
 * Checks if a recurrence rule string is syntactically valid
 * before attempting to use it for event expansion.
 *
 * Parameters:
 * - recurrenceRule: The RRULE string to validate
 *   - Required, non-null
 *
 * Returns:
 * true if the RRULE is valid, false otherwise.
 *
 * Errors:
 * None. Returns false for invalid input.
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
 * - None
 *
 * Postconditions:
 * - None (read-only)
 */
/**
 * Validate an RRULE string
 * @param recurrenceRule - The RRULE string to validate
 * @returns true if valid, false otherwise
 */
export function validateRRULE(recurrenceRule: string): boolean {
  try {
    rrulestr(recurrenceRule);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates an RRULE string from structured parameters.
 *
 * Purpose:
 * Constructs a valid RFC 5545 RRULE string from individual
 * parameters, providing a type-safe alternative to string concatenation.
 *
 * Parameters:
 * - frequency: Recurrence frequency
 *   - Required, non-null
 *   - Values: 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'
 * - interval: Number of periods between occurrences (default: 1)
 *   - Optional, must be positive
 * - byDay: Array of days for weekly recurrence
 *   - Optional, values: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
 * - count: Total number of occurrences
 *   - Optional, mutually exclusive with until
 * - until: End date for recurrence
 *   - Optional, mutually exclusive with count
 *
 * Returns:
 * RRULE string in RFC 5545 format.
 *
 * Errors:
 * None. Always returns a valid RRULE string.
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
 * - frequency must be a valid value
 * - interval must be positive if provided
 * - count and until should not both be provided
 *
 * Postconditions:
 * - None (read-only)
 */
/**
 * Generate a simple RRULE string from parameters
 * @param frequency - 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'
 * @param interval - Number of periods between occurrences (default: 1)
 * @param byDay - Array of days (e.g., ['MO', 'WE', 'FR'] for weekly)
 * @param count - Number of occurrences (optional)
 * @param until - End date for recurrence (optional)
 * @returns RRULE string
 */
export function generateRRULE({
  frequency,
  interval = 1,
  byDay,
  count,
  until,
}: {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  byDay?: string[];
  count?: number;
  until?: Date;
}): string {
  const parts: string[] = [`FREQ=${frequency}`];

  if (interval > 1) {
    parts.push(`INTERVAL=${interval}`);
  }

  if (byDay && byDay.length > 0) {
    parts.push(`BYDAY=${byDay.join(',')}`);
  }

  if (count) {
    parts.push(`COUNT=${count}`);
  }

  if (until) {
    // RRULE UNTIL format must be UTC and in YYYYMMDDTHHMMSSZ format
    // We strip separators and add 'Z' suffix to indicate UTC
    parts.push(`UNTIL=${until.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
  }

  return parts.join(';');
}
