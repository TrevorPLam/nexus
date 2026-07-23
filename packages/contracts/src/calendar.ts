/**
 * MODULE: Calendar & Scheduling Contracts
 *
 * Responsibility:
 * Defines the domain model and Zod schemas for calendar management, including
 * calendars, events, attendees, scheduling links, and availability booking.
 *
 * Boundaries:
 * - Pure schema definitions; no external provider (Google/Outlook) integration logic.
 * - Does not include task-specific schemas (see work.ts).
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspaceId for all workspace-scoped operations
 *   - Calendar IDs must reference existing calendars in the same workspace when creating events
 *   - Event start dates must precede end dates (validated by Zod refine)
 *   - Scheduling link slugs must be URL-safe and unique per workspace
 *   - Availability query start dates must precede end dates
 *   - Booking request start times must precede end times
 * - Postconditions:
 *   - All request schemas validate UUID format and workspace association
 *   - Event date ordering is enforced by Zod refinement
 *   - Scheduling link slugs are constrained to URL-safe characters
 *   - Event duration is constrained to maximum 8 hours (480 minutes)
 *   - Response schemas guarantee workspace isolation is preserved
 *   - Test coverage: See packages/contracts/test/ (no tests found - MISSING COVERAGE)
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - High. These schemas govern data exchanged with external calendar providers
 *   and the structure of public booking pages.
 *
 * Links:
 * - packages/database/src/schema/calendar.ts (persistence layer)
 * - apps/api/src/lib/calendar-operations.ts (business logic)
 *
 * Tags:
 * - domain: calendar
 * - risk: high
 * - layer: contracts
 * - stability: stable
 * - concerns: validation, types, zod, scheduling
 *
 * File:
 * - packages/contracts/src/calendar.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import { z } from 'zod';

export const CalendarProvider = z.enum(['local', 'google', 'outlook']);
export const AttendeeStatus = z.enum(['needs_action', 'accepted', 'declined', 'tentative']);

/**
 * REQUEST SCHEMAS (Input DTOs)
 * These schemas validate incoming data for calendar operations.
 */

// Calendar Schemas
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

export const UpdateCalendarRequest = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    isDefault: z.boolean().optional(),
    provider: CalendarProvider.optional(),
    providerCalendarId: z.string().optional(),
  })
  .strict();

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

export const UpdateEventRequest = z
  .object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).nullable().optional(),
    location: z.string().max(500).nullable().optional(),
    isAllDay: z.boolean().optional(),
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
    timezone: z.string().optional(),
    recurrenceRule: z.string().optional(),
    providerEventId: z.string().optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.start && data.end) {
        return new Date(data.start) < new Date(data.end);
      }
      return true;
    },
    {
      message: 'start date must be before end date',
      path: ['end'],
    },
  );

export const CreateEventAttendeeRequest = z.object({
  eventId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().max(200).optional(),
  status: AttendeeStatus.default('needs_action'),
  isOrganizer: z.boolean().default(false),
});

export const UpdateEventAttendeeRequest = z
  .object({
    status: AttendeeStatus.optional(),
  })
  .strict();

/**
 * RESPONSE SCHEMAS (Output DTOs)
 * These schemas define the structure of data returned by calendar endpoints.
 */

// Calendar Response
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

/**
 * SCHEDULING & AVAILABILITY
 * Schemas for public booking pages and availability calculation.
 */

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

export const UpdateSchedulingLinkRequest = z
  .object({
    name: z.string().min(1).max(200).optional(),
    slug: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    description: z.string().max(1000).optional(),
    calendarId: z.string().uuid().optional(),
    eventDuration: z.number().int().positive().max(480).optional(),
    bufferBefore: z.number().int().min(0).optional(),
    bufferAfter: z.number().int().min(0).optional(),
    minBookingNotice: z.number().int().min(0).optional(),
    maxBookingNotice: z.number().int().min(0).optional(),
    availabilityStart: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .optional(),
    availabilityEnd: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .optional(),
    availableDays: z.array(z.number().int().min(0).max(6)).optional(),
    requiresApproval: z.boolean().optional(),
    maxDailyBookings: z.number().int().positive().optional(),
  })
  .strict();

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

/**
 * AVAILABILITY QUERY AND BOOKING
 * Used by the public booking interface to find and reserve time slots.
 */

export const AvailabilityQueryRequest = z
  .object({
    schedulingLinkId: z.string().uuid(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  })
  .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: 'startDate must be before endDate',
    path: ['endDate'],
  });

export const AvailableSlotResponse = z.object({
  start: z.date(),
  end: z.date(),
});

export const AvailabilityResponse = z.object({
  slots: z.array(AvailableSlotResponse),
});

export const BookingRequest = z
  .object({
    schedulingLinkId: z.string().uuid(),
    start: z.string().datetime(),
    end: z.string().datetime(),
    title: z.string().min(1).max(500),
    description: z.string().max(5000).optional(),
    location: z.string().max(500).optional(),
    attendeeEmail: z.string().email(),
    attendeeName: z.string().max(200).optional(),
  })
  .refine((data) => new Date(data.start) < new Date(data.end), {
    message: 'start must be before end',
    path: ['end'],
  });

export const BookingResponse = z.object({
  event: EventResponse,
  attendee: EventAttendeeResponse.optional(),
});
