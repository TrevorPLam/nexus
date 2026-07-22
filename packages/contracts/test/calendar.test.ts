import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  CreateCalendarRequest,
  UpdateCalendarRequest,
  CalendarResponse,
  CreateEventRequest,
  UpdateEventRequest,
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
          provider: 'invalid' as any,
        }),
      ).toThrow();
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
          status: 'invalid' as any,
        }),
      ).toThrow();
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
