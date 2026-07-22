import { z } from 'zod';

export const CalendarProvider = z.enum(['local', 'google', 'outlook']);
export const AttendeeStatus = z.enum(['needs_action', 'accepted', 'declined', 'tentative']);

// Request schemas (input DTOs)
export const CreateCalendarRequest = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
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

export const CreateSchedulingLinkRequest = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
  calendarId: z.string().uuid(),
  eventDuration: z.number().int().positive().max(480), // Max 8 hours
  bufferBefore: z.number().int().min(0).default(0),
  bufferAfter: z.number().int().min(0).default(0),
  minBookingNotice: z.number().int().min(0).default(0),
  maxBookingNotice: z.number().int().min(0).default(0),
  availabilityStart: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  availabilityEnd: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  availableDays: z.array(z.number().int().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6]),
  requiresApproval: z.boolean().default(false),
  maxDailyBookings: z.number().int().positive().optional(),
});

export const UpdateSchedulingLinkRequest = CreateSchedulingLinkRequest.partial();

export const SchedulingLinkResponse = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  calendarId: z.string().uuid(),
  eventDuration: z.number().int(),
  bufferBefore: z.number().int(),
  bufferAfter: z.number().int(),
  minBookingNotice: z.number().int(),
  maxBookingNotice: z.number().int(),
  availabilityStart: z.string().nullable(),
  availabilityEnd: z.string().nullable(),
  availableDays: z.array(z.number()).nullable(),
  isActive: z.boolean(),
  requiresApproval: z.boolean(),
  maxDailyBookings: z.number().int().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
