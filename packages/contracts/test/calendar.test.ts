/**
 * Tests for calendar contract schemas.
 * Validates Zod schema parsing, enum constraints, and date ordering rules.
 */

import { describe, it, expect } from 'vitest';

import {
  CreateCalendarRequest,
  CalendarResponse,
  CreateEventRequest,
  EventResponse,
  CreateEventAttendeeRequest,
  EventAttendeeResponse,
  CalendarProvider,
  AttendeeStatus,
} from '../src/calendar';

describe('Calendar Contracts', () => {
  describe('Calendar Contracts', () => {
    it('accepts valid create calendar request', () => {
      const result = CreateCalendarRequest.parse({
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'My Calendar',
        description: 'A test calendar',
        color: '#FF0000',
        isDefault: true,
        provider: CalendarProvider.enum.google,
        providerCalendarId: 'primary',
      });
      expect(result.name).toBe('My Calendar');
      expect(result.provider).toBe(CalendarProvider.enum.google);
    });

    it('applies default provider', () => {
      const result = CreateCalendarRequest.parse({
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'My Calendar',
      });
      expect(result.provider).toBe(CalendarProvider.enum.local);
    });

    it('rejects invalid provider', () => {
      expect(() =>
        CreateCalendarRequest.parse({
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'My Calendar',
          provider: 'invalid' as const,
        }),
      ).toThrow();
    });

    it('rejects empty name', () => {
      expect(() =>
        CreateCalendarRequest.parse({
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          name: '',
        }),
      ).toThrow();
    });

    it('rejects name over max length', () => {
      expect(() =>
        CreateCalendarRequest.parse({
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'a'.repeat(201),
        }),
      ).toThrow();
    });

    it('rejects invalid color format', () => {
      expect(() =>
        CreateCalendarRequest.parse({
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'My Calendar',
          color: 'red',
        }),
      ).toThrow();
    });

    it('accepts valid color format', () => {
      const result = CreateCalendarRequest.parse({
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'My Calendar',
        color: '#FF0000',
      });
      expect(result.color).toBe('#FF0000');
    });

    it('accepts all provider enum values', () => {
      const local = CreateCalendarRequest.parse({
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'My Calendar',
        provider: CalendarProvider.enum.local,
      });
      const google = CreateCalendarRequest.parse({
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'My Calendar',
        provider: CalendarProvider.enum.google,
      });
      const outlook = CreateCalendarRequest.parse({
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'My Calendar',
        provider: CalendarProvider.enum.outlook,
      });
      expect(local.provider).toBe(CalendarProvider.enum.local);
      expect(google.provider).toBe(CalendarProvider.enum.google);
      expect(outlook.provider).toBe(CalendarProvider.enum.outlook);
    });

    it('calendar response uses enum for provider', () => {
      const result = CalendarResponse.parse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'My Calendar',
        description: 'A test calendar',
        color: '#FF0000',
        isDefault: true,
        provider: CalendarProvider.enum.google,
        providerCalendarId: 'primary',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(result.provider).toBe(CalendarProvider.enum.google);
    });
  });

  describe('Event Contracts', () => {
    it('accepts valid create event request', () => {
      const result = CreateEventRequest.parse({
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        calendarId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'My Event',
        start: '2024-01-01T10:00:00Z',
        end: '2024-01-01T11:00:00Z',
        timezone: 'UTC',
      });
      expect(result.title).toBe('My Event');
    });

    it('applies default timezone', () => {
      const result = CreateEventRequest.parse({
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        calendarId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'My Event',
        start: '2024-01-01T10:00:00Z',
        end: '2024-01-01T11:00:00Z',
      });
      expect(result.timezone).toBe('UTC');
    });

    it('rejects start after end', () => {
      expect(() =>
        CreateEventRequest.parse({
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          calendarId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'My Event',
          start: '2024-01-01T11:00:00Z',
          end: '2024-01-01T10:00:00Z',
        }),
      ).toThrow('start date must be before end date');
    });

    it('rejects start equal to end', () => {
      expect(() =>
        CreateEventRequest.parse({
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          calendarId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'My Event',
          start: '2024-01-01T10:00:00Z',
          end: '2024-01-01T10:00:00Z',
        }),
      ).toThrow('start date must be before end date');
    });

    it('rejects empty title', () => {
      expect(() =>
        CreateEventRequest.parse({
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          calendarId: '123e4567-e89b-12d3-a456-426614174000',
          title: '',
          start: '2024-01-01T10:00:00Z',
          end: '2024-01-01T11:00:00Z',
        }),
      ).toThrow();
    });

    it('rejects title over max length', () => {
      expect(() =>
        CreateEventRequest.parse({
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          calendarId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'a'.repeat(501),
          start: '2024-01-01T10:00:00Z',
          end: '2024-01-01T11:00:00Z',
        }),
      ).toThrow();
    });

    it('accepts isAllDay true', () => {
      const result = CreateEventRequest.parse({
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        calendarId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'My Event',
        start: '2024-01-01T10:00:00Z',
        end: '2024-01-01T11:00:00Z',
        isAllDay: true,
      });
      expect(result.isAllDay).toBe(true);
    });

    it('rejects invalid datetime format', () => {
      expect(() =>
        CreateEventRequest.parse({
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          calendarId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'My Event',
          start: 'not-a-date',
          end: '2024-01-01T11:00:00Z',
        }),
      ).toThrow();
    });

    it('event response uses Date objects', () => {
      const startDate = new Date('2024-01-01T10:00:00Z');
      const endDate = new Date('2024-01-01T11:00:00Z');
      const result = EventResponse.parse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        calendarId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'My Event',
        description: null,
        location: null,
        isAllDay: false,
        start: startDate,
        end: endDate,
        timezone: 'UTC',
        recurrenceRule: null,
        recurrenceId: null,
        providerEventId: null,
        taskId: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(result.start).toBeInstanceOf(Date);
      expect(result.end).toBeInstanceOf(Date);
    });
  });

  describe('Event Attendee Contracts', () => {
    it('accepts valid create attendee request', () => {
      const result = CreateEventAttendeeRequest.parse({
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
        status: AttendeeStatus.enum.accepted,
        isOrganizer: true,
      });
      expect(result.email).toBe('test@example.com');
      expect(result.status).toBe(AttendeeStatus.enum.accepted);
    });

    it('applies default status', () => {
      const result = CreateEventAttendeeRequest.parse({
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
      });
      expect(result.status).toBe(AttendeeStatus.enum.needs_action);
    });

    it('rejects invalid email', () => {
      expect(() =>
        CreateEventAttendeeRequest.parse({
          eventId: '123e4567-e89b-12d3-a456-426614174000',
          email: 'not-an-email',
        }),
      ).toThrow();
    });

    it('rejects invalid status', () => {
      expect(() =>
        CreateEventAttendeeRequest.parse({
          eventId: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@example.com',
          status: 'invalid' as const,
        }),
      ).toThrow();
    });

    it('accepts all attendee status enum values', () => {
      const needsAction = CreateEventAttendeeRequest.parse({
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        status: AttendeeStatus.enum.needs_action,
      });
      const accepted = CreateEventAttendeeRequest.parse({
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        status: AttendeeStatus.enum.accepted,
      });
      const declined = CreateEventAttendeeRequest.parse({
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        status: AttendeeStatus.enum.declined,
      });
      const tentative = CreateEventAttendeeRequest.parse({
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        status: AttendeeStatus.enum.tentative,
      });
      expect(needsAction.status).toBe(AttendeeStatus.enum.needs_action);
      expect(accepted.status).toBe(AttendeeStatus.enum.accepted);
      expect(declined.status).toBe(AttendeeStatus.enum.declined);
      expect(tentative.status).toBe(AttendeeStatus.enum.tentative);
    });

    it('accepts isOrganizer true', () => {
      const result = CreateEventAttendeeRequest.parse({
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        isOrganizer: true,
      });
      expect(result.isOrganizer).toBe(true);
    });

    it('attendee response uses enum for status', () => {
      const result = EventAttendeeResponse.parse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
        status: AttendeeStatus.enum.accepted,
        isOrganizer: true,
        createdAt: new Date(),
      });
      expect(result.status).toBe(AttendeeStatus.enum.accepted);
    });
  });
});
