export interface Calendar {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  isDefault: boolean;
  provider: string | null;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  isAllDay: boolean;
  start: string;
  end: string;
  calendarId: string;
  recurrenceRule?: string | null;
  isFocusTime?: boolean;
}

export interface SchedulingLink {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  slug: string;
  description: string | null;
  calendarId: string;
  eventDuration: number;
  bufferBefore: number;
  bufferAfter: number;
  minBookingNotice: number;
  maxBookingNotice: number;
  availabilityStart: string | null;
  availabilityEnd: string | null;
  availableDays: number[] | null;
  isActive: boolean;
  requiresApproval: boolean;
  maxDailyBookings: number | null;
}

export interface Attendee {
  id: string;
  eventId: string;
  name: string | null;
  email: string;
  status: 'accepted' | 'declined' | 'tentative' | 'pending';
  isOrganizer: boolean;
}

export interface CalendarForm {
  name: string;
  description: string;
  color: string;
}

export interface EventForm {
  title: string;
  calendarId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  isAllDay: boolean;
  isFocusTime: boolean;
  description: string;
  location: string;
  recurrenceRule: string;
}

export interface SchedulingForm {
  name: string;
  slug: string;
  description: string;
  calendarId: string;
  eventDuration: number;
  bufferBefore: number;
  bufferAfter: number;
  minBookingNotice: number;
  maxBookingNotice: number;
  availabilityStart: string;
  availabilityEnd: string;
  availableDays: number[];
  requiresApproval: boolean;
  maxDailyBookings: string;
}
