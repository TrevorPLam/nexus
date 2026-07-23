/**
 * Availability calculation for scheduling links
 * Implements interval arithmetic to find available time slots
 */

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
 * Parse HH:MM string to minutes since midnight
 */
function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to HH:MM string
 */
function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Get the date portion of a Date object
 */
function getDateOnly(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Check if a date is within the available days
 */
function isDayAvailable(date: Date, availableDays: number[] | null): boolean {
  if (!availableDays || availableDays.length === 0) {
    return true; // All days available if not specified
  }
  const day = date.getDay();
  return availableDays.includes(day);
}

/**
 * Generate time slots for a specific date based on availability config
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
  const startMinutes = config.availabilityStart
    ? parseTimeToMinutes(config.availabilityStart)
    : 0; // Midnight
  const endMinutes = config.availabilityEnd
    ? parseTimeToMinutes(config.availabilityEnd)
    : 24 * 60; // End of day

  const slotDuration = config.eventDuration;
  const totalDuration = config.bufferBefore + slotDuration + config.bufferAfter;

  // Generate slots
  for (let currentMinutes = startMinutes; currentMinutes + totalDuration <= endMinutes; currentMinutes += slotDuration) {
    const slotStart = new Date(dateMidnight.getTime() + currentMinutes * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + totalDuration * 60 * 1000);

    // Check for conflicts with existing events (considering buffers)
    const hasConflict = existingEvents.some((event) => {
      const eventStartWithBuffer = new Date(
        event.start.getTime() - config.bufferBefore * 60 * 1000,
      );
      const eventEndWithBuffer = new Date(
        event.end.getTime() + config.bufferAfter * 60 * 1000,
      );
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
 * Calculate available time slots for a scheduling link
 * @param schedulingLink - The scheduling link configuration
 * @param existingEvents - Existing events to avoid conflicts
 * @param startDate - Start date for availability calculation
 * @param endDate - End date for availability calculation
 * @param timezone - Timezone for calculations
 * @returns Array of available time slots
 */
export function calculateAvailableSlots(
  schedulingLink: AvailabilityConfig,
  existingEvents: TimeSlot[],
  startDate: Date,
  endDate: Date,
  timezone: string = 'UTC',
): TimeSlot[] {
  const allSlots: TimeSlot[] = [];

  // Apply booking notice constraints
  const now = new Date();
  const minBookingDate = new Date(
    now.getTime() + schedulingLink.minBookingNotice * 60 * 60 * 1000,
  );
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
 * Find the next available slot after a given date
 */
export function findNextAvailableSlot(
  schedulingLink: AvailabilityConfig,
  existingEvents: TimeSlot[],
  afterDate: Date,
  timezone: string = 'UTC',
): TimeSlot | null {
  const searchStartDate = new Date(afterDate);
  const searchEndDate = new Date(afterDate);
  searchEndDate.setDate(searchEndDate.getDate() + 30); // Search up to 30 days ahead

  const slots = calculateAvailableSlots(
    schedulingLink,
    existingEvents,
    searchStartDate,
    searchEndDate,
    timezone,
  );

  return slots.length > 0 ? slots[0] : null;
}
