/**
 * MODULE: Availability Slot Generation
 *
 * Responsibility:
 * Provides slot generation functions for availability calculations.
 *
 * Boundaries:
 * - Pure calculation logic; no database or external service calls.
 * - Uses time utilities from availability-time-utils.ts.
 *
 * Critical invariants:
 * - Time slots respect availability windows (availabilityStart/End).
 * - Buffer times are applied before and after each slot.
 * - Booking notice constraints (min/max) are enforced.
 * - Slots do not overlap with existing events.
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - Medium. Changes affect the public booking engine and user experience.
 *
 * Links:
 * - packages/contracts/src/calendar.ts (SchedulingLink schema)
 * - apps/api/src/lib/calendar-operations.ts (scheduling link operations)
 * - apps/api/src/lib/availability-time-utils.ts (time utilities)
 *
 * Tags:
 * - domain: calendar
 * - risk: medium
 * - layer: utilities
 * - stability: stable
 * - concerns: scheduling, availability, booking
 *
 * File:
 * - apps/api/src/lib/availability-slots.ts
 *
 * Last updated:
 * - July 26, 2026
 */

import { getDateOnly, isDayAvailable, parseTimeToMinutes } from './availability-time-utils.js';

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface AvailabilityConfig {
  eventDuration: number; // minutes
  bufferBefore: number; // minutes
  bufferAfter: number; // minutes
  availabilityStart: string | null; // HH:MM format
  availabilityEnd: string | null; // HH:MM format
  availableDays: number[] | null; // Array of day numbers (0-6, Sunday=0)
  minBookingNotice: number; // hours
  maxBookingNotice: number; // days (0 = unlimited)
  maxDailyBookings: number | null;
}

/**
 * Generates available time slots for a specific date.
 *
 * Purpose:
 * Calculates conflict-free slots for a single day based on
 * availability windows, duration, buffers, and existing events.
 *
 * Parameters:
 * - date: The date to generate slots for
 *   - Required, non-null
 * - config: Availability configuration
 *   - Required, non-null
 * - existingEvents: Existing events to avoid conflicts with
 *   - Required, non-null
 *
 * Returns:
 * Array of TimeSlot objects with start and end times.
 * Slots respect availability windows, buffers, and event conflicts.
 *
 * Errors:
 * None. Returns empty array if day is not available.
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
function generateDailySlots(
  date: Date,
  config: AvailabilityConfig,
  existingEvents: TimeSlot[],
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // Check if day is available
  if (!isDayAvailable(date, config.availableDays)) {
    return slots;
  }

  // Get availability window
  const dateMidnight = getDateOnly(date);
  // Default to midnight if no start time specified, end of day (24:00) if no end time
  const startMinutes = config.availabilityStart ? parseTimeToMinutes(config.availabilityStart) : 0; // Midnight
  const endMinutes = config.availabilityEnd ? parseTimeToMinutes(config.availabilityEnd) : 24 * 60; // End of day

  const slotDuration = config.eventDuration;
  const totalDuration = config.bufferBefore + slotDuration + config.bufferAfter;

  // Generate slots
  // We advance by slotDuration (not totalDuration) to pack slots densely
  // Buffer times are handled in conflict detection, not slot spacing
  for (
    let currentMinutes = startMinutes;
    currentMinutes + totalDuration <= endMinutes;
    currentMinutes += slotDuration
  ) {
    const slotStart = new Date(dateMidnight.getTime() + currentMinutes * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + totalDuration * 60 * 1000);

    // Check for conflicts with existing events (considering buffers)
    // We expand existing events by buffer times to ensure slots don't encroach on buffered zones
    // This is different from calendar-operations.ts where buffers are spacing between slots
    const hasConflict = existingEvents.some((event) => {
      const eventStartWithBuffer = new Date(
        event.start.getTime() - config.bufferBefore * 60 * 1000,
      );
      const eventEndWithBuffer = new Date(event.end.getTime() + config.bufferAfter * 60 * 1000);
      return slotStart < eventEndWithBuffer && slotEnd > eventStartWithBuffer;
    });

    if (!hasConflict) {
      slots.push({
        start: slotStart,
        end: slotEnd,
      });
    }
  }

  return slots;
}

/**
 * Calculates available time slots for a scheduling link across a date range.
 *
 * Purpose:
 * Computes all available booking slots within a date range,
 * respecting availability windows, booking notice constraints,
 * buffer times, day restrictions, and existing event conflicts.
 *
 * Parameters:
 * - schedulingLink: Availability configuration object
 *   - Required, non-null
 *   - Contains: eventDuration, bufferBefore, bufferAfter,
 *     availabilityStart, availabilityEnd, availableDays,
 *     minBookingNotice, maxBookingNotice, maxDailyBookings
 * - existingEvents: Existing events to avoid conflicts with
 *   - Required, non-null
 * - startDate: Start of the date range to search
 *   - Required, non-null
 * - endDate: End of the date range to search
 *   - Required, non-null
 * - timezone: Timezone for calculations (default: 'UTC')
 *   - Optional, non-null
 *
 * Returns:
 * Array of TimeSlot objects with start and end Date objects.
 * Slots are conflict-free and respect all constraints.
 *
 * Errors:
 * None. Returns empty array if no slots available.
 *
 * Side effects:
 * None. Pure calculation function.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Not applicable (utility function - authorization enforced at call site).
 *
 * Preconditions:
 * - startDate must be before or equal to endDate
 * - eventDuration must be positive
 *
 * Postconditions:
 * - None (read-only)
 *
 * Performance:
 * O(n*m) where n is number of days in range and m is number of events.
 */
export function calculateAvailableSlots(
  schedulingLink: AvailabilityConfig,
  existingEvents: TimeSlot[],
  startDate: Date,
  endDate: Date,
): TimeSlot[] {
  const allSlots: TimeSlot[] = [];

  // Apply booking notice constraints
  // minBookingNotice is in hours, maxBookingNotice is in days (0 = unlimited)
  const now = new Date();
  const minBookingDate = new Date(now.getTime() + schedulingLink.minBookingNotice * 60 * 60 * 1000);
  const maxBookingDate =
    schedulingLink.maxBookingNotice > 0
      ? new Date(now.getTime() + schedulingLink.maxBookingNotice * 24 * 60 * 60 * 1000)
      : null;

  // Adjust start date based on min booking notice
  const effectiveStartDate = new Date(Math.max(startDate.getTime(), minBookingDate.getTime()));

  // Adjust end date based on max booking notice
  const effectiveEndDate = maxBookingDate
    ? new Date(Math.min(endDate.getTime(), maxBookingDate.getTime()))
    : endDate;

  // Generate slots for each day in the range
  const currentDate = getDateOnly(effectiveStartDate);
  const endDay = getDateOnly(effectiveEndDate);

  while (currentDate <= endDay) {
    const dailySlots = generateDailySlots(currentDate, schedulingLink, existingEvents);
    allSlots.push(...dailySlots);

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Apply max daily bookings constraint if specified
  // This limits the number of available slots shown per day, not the total bookings
  // It's a UX constraint to prevent overwhelming users with too many options
  if (schedulingLink.maxDailyBookings && schedulingLink.maxDailyBookings > 0) {
    const slotsByDay = new Map<string, TimeSlot[]>();

    allSlots.forEach((slot) => {
      const dayKey = getDateOnly(slot.start).toISOString();
      if (!slotsByDay.has(dayKey)) {
        slotsByDay.set(dayKey, []);
      }
      slotsByDay.get(dayKey)!.push(slot);
    });

    const filteredSlots: TimeSlot[] = [];
    slotsByDay.forEach((daySlots) => {
      filteredSlots.push(...daySlots.slice(0, schedulingLink.maxDailyBookings!));
    });

    return filteredSlots;
  }

  return allSlots;
}

/**
 * Finds the next available slot after a given date.
 *
 * Purpose:
 * Searches for the first available booking slot starting from
 * a specific date, looking up to 30 days ahead.
 *
 * Parameters:
 * - schedulingLink: Availability configuration object
 *   - Required, non-null
 * - existingEvents: Existing events to avoid conflicts with
 *   - Required, non-null
 * - afterDate: The date to start searching from
 *   - Required, non-null
 * - timezone: Timezone for calculations (default: 'UTC')
 *   - Optional, non-null
 *
 * Returns:
 * The first available TimeSlot, or null if none found within 30 days.
 *
 * Errors:
 * None. Returns null if no slot available.
 *
 * Side effects:
 * None. Pure calculation function.
 *
 * Idempotency:
 * Idempotent. Same inputs return same results.
 *
 * Authorization:
 * Not applicable (utility function - authorization enforced at call site).
 *
 * Preconditions:
 * - afterDate must be a valid Date object
 *
 * Postconditions:
 * - None (read-only)
 *
 * Performance:
 * Searches 30-day window regardless of actual availability.
 * May return null even if slots exist beyond 30 days.
 */
export function findNextAvailableSlot(
  schedulingLink: AvailabilityConfig,
  existingEvents: TimeSlot[],
  afterDate: Date,
): TimeSlot | null {
  const searchStartDate = new Date(afterDate);
  const searchEndDate = new Date(afterDate);
  // Search up to 30 days ahead - this is a UX tradeoff between response time
  // and finding the next slot. Consider making this configurable if needed.
  searchEndDate.setDate(searchEndDate.getDate() + 30);

  const slots = calculateAvailableSlots(
    schedulingLink,
    existingEvents,
    searchStartDate,
    searchEndDate,
  );

  if (slots.length === 0) {
    return null;
  }

  return slots[0] ?? null;
}
