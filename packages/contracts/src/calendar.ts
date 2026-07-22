import { z } from 'zod';

export const CalendarProvider = z.enum(['local', 'google', 'outlook']);
export const AttendeeStatus = z.enum(['needs_action', 'accepted', 'declined', 'tentative']);

// Request schemas (input DTOs)
export const CreateCalendarRequest = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isDefault: z.boolean().default(false),
  provider: CalendarProvider.default('local'),
  providerCalendarId: z.string().optional(),
});

export const UpdateCalendarRequest = CreateCalendarRequest.partial();

const EventRequestBase = z.object({
  workspaceId: z.string().uuid(),
  calendarId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  location: z.string().max(500).optional(),
  isAllDay: z.boolean().default(false),
  start: z.string().datetime(),
  end: z.string().datetime(),
  timezone: z.string().default('UTC'),
  recurrenceRule: z.string().optional(),
  recurrenceId: z.string().uuid().optional(),
  providerEventId: z.string().optional(),
  taskId: z.string().uuid().optional(),
});

export const CreateEventRequest = EventRequestBase.refine(
  (data) => new Date(data.start) < new Date(data.end),
  {
    message: 'start date must be before end date',
    path: ['end'],
  },
);

export const UpdateEventRequest = EventRequestBase.partial();

export const CreateEventAttendeeRequest = z.object({
  eventId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().max(200).optional(),
  status: AttendeeStatus.default('needs_action'),
  isOrganizer: z.boolean().default(false),
});

// Response schemas (output DTOs)
export const CalendarResponse = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  isDefault: z.boolean(),
  provider: CalendarProvider.nullable(),
  providerCalendarId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const EventResponse = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  calendarId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  isAllDay: z.boolean(),
  start: z.date(),
  end: z.date(),
  timezone: z.string(),
  recurrenceRule: z.string().nullable(),
  recurrenceId: z.string().uuid().nullable(),
  providerEventId: z.string().nullable(),
  taskId: z.string().uuid().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const EventAttendeeResponse = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  email: z.string(),
  name: z.string().nullable(),
  status: AttendeeStatus,
  isOrganizer: z.boolean(),
  createdAt: z.date(),
});

// Legacy exports for backward compatibility (deprecated)
export const CreateCalendarSchema = CreateCalendarRequest;
export const UpdateCalendarSchema = UpdateCalendarRequest;
export const CalendarSchema = CalendarResponse;
export const CreateEventSchema = CreateEventRequest;
export const UpdateEventSchema = UpdateEventRequest;
export const EventSchema = EventResponse;
export const CreateEventAttendeeSchema = CreateEventAttendeeRequest;
export const EventAttendeeSchema = EventAttendeeResponse;
