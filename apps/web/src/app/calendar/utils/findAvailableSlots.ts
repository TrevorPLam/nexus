/**
 * MODULE: Find Available Time Slots Utility
 *
 * Responsibility:
 * Calculates available time slots on a given day by iterating at a fixed
 * interval and excluding slots that conflict with existing events.
 *
 * Boundaries:
 * - Pure function; no side effects or API calls.
 * - Operates on already-fetched event arrays.
 *
 * Critical invariants:
 * - Slots are generated between startHour and endHour (default 9–17).
 * - Slot interval defaults to 30 minutes.
 * - A slot is excluded if it overlaps any existing event on the same day.
 * - Slots extending past endHour are excluded.
 *
 * Change risk:
 * - Low. Scheduling display logic only.
 *
 * Links:
 * - apps/web/src/app/calendar/types.ts
 * - apps/web/src/app/calendar/components/modals/FindTimeModal.tsx
 *
 * Tags:
 * - domain: calendar
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: scheduling, time-slots, availability
 *
 * File:
 * - apps/web/src/app/calendar/utils/findAvailableSlots.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import type { Event } from '../types';

export interface AvailableSlot {
  start: Date;
  end: Date;
}

export function findAvailableSlots(
  date: Date,
  durationMinutes: number,
  events: Event[],
  startHour: number = 9,
  endHour: number = 17,
  slotInterval: number = 30,
): AvailableSlot[] {
  const dayEvents = events.filter((event) => {
    const eventDate = new Date(event.start);
    return eventDate.toDateString() === date.toDateString();
  });

  const slots: AvailableSlot[] = [];

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += slotInterval) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

      const hasConflict = dayEvents.some((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return slotStart < eventEnd && slotEnd > eventStart;
      });

      if (!hasConflict && slotEnd.getHours() < endHour) {
        slots.push({
          start: slotStart,
          end: slotEnd,
        });
      }
    }
  }

  return slots;
}
