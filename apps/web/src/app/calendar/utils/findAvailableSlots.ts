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
