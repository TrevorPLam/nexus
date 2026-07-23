import { rrulestr } from 'rrule';

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
    const occurrences = rule.between(rangeStart, rangeEnd, true);

    return occurrences;
  } catch (error) {
    console.error('Error expanding recurring event:', error);
    // If RRULE parsing fails, return just the original date if it's in range
    if (startDate >= rangeStart && startDate <= rangeEnd) {
      return [startDate];
    }
    return [];
  }
}

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
    parts.push(`UNTIL=${until.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
  }

  return parts.join(';');
}

// Timezone-aware date operations
/**
 * Convert a UTC date to a specific timezone
 * @param date - The UTC date to convert
 * @param timezone - The target timezone (e.g., 'America/New_York')
 * @returns Date in the target timezone
 */
export function convertToTimezone(date: Date, timezone: string): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
}

/**
 * Convert a date from a specific timezone to UTC
 * @param date - The date in the source timezone
 * @param timezone - The source timezone (e.g., 'America/New_York')
 * @returns UTC Date
 */
export function convertFromTimezone(date: Date, timezone: string): Date {
  const isoString = date.toLocaleString('en-US', { timeZone: timezone });
  return new Date(isoString);
}

/**
 * Get the start of day in a specific timezone
 * @param date - The date to get start of day for
 * @param timezone - The timezone (e.g., 'America/New_York')
 * @returns Start of day in the specified timezone
 */
export function getStartOfDay(date: Date, timezone: string): Date {
  const result = new Date(date);
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  result.setHours(tzDate.getHours(), 0, 0, 0);
  return result;
}

/**
 * Get the end of day in a specific timezone
 * @param date - The date to get end of day for
 * @param timezone - The timezone (e.g., 'America/New_York')
 * @returns End of day in the specified timezone
 */
export function getEndOfDay(date: Date, timezone: string): Date {
  const result = new Date(date);
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  result.setHours(tzDate.getHours(), 59, 59, 999);
  return result;
}

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
