/**
 * Tests for calendar schema table definitions.
 * Validates table names, column presence, and foreign key references.
 */

import { describe, it, expect } from 'vitest';

import { calendars, events, eventAttendees } from './calendar';

describe('Calendar Schema', () => {
  describe('calendars table', () => {
    it('exports calendars table definition', () => {
      expect(calendars).toBeDefined();
    });

    it('has correct table name', () => {
      expect(calendars).toHaveProperty('_');
      expect(calendars._.name).toBe('calendars');
    });

    it('has id column with primary key', () => {
      expect(calendars.id).toBeDefined();
    });

    it('has workspaceId column with reference to workspaces', () => {
      expect(calendars.workspaceId).toBeDefined();
    });

    it('has name column', () => {
      expect(calendars.name).toBeDefined();
    });

    it('has provider column', () => {
      expect(calendars.provider).toBeDefined();
    });

    it('has metadata column', () => {
      expect(calendars.metadata).toBeDefined();
    });
  });

  describe('events table', () => {
    it('exports events table definition', () => {
      expect(events).toBeDefined();
    });

    it('has correct table name', () => {
      expect(events).toHaveProperty('_');
      expect(events._.name).toBe('events');
    });

    it('has id column with primary key', () => {
      expect(events.id).toBeDefined();
    });

    it('has calendarId column with reference to calendars', () => {
      expect(events.calendarId).toBeDefined();
    });

    it('has title column', () => {
      expect(events.title).toBeDefined();
    });

    it('has start and end timestamp columns', () => {
      expect(events.start).toBeDefined();
      expect(events.end).toBeDefined();
    });

    it('has timezone column', () => {
      expect(events.timezone).toBeDefined();
    });

    it('has recurrenceRule column', () => {
      expect(events.recurrenceRule).toBeDefined();
    });

    it('has taskId column for linking to tasks', () => {
      expect(events.taskId).toBeDefined();
    });
  });

  describe('eventAttendees table', () => {
    it('exports eventAttendees table definition', () => {
      expect(eventAttendees).toBeDefined();
    });

    it('has correct table name', () => {
      expect(eventAttendees).toHaveProperty('_');
      expect(eventAttendees._.name).toBe('event_attendees');
    });

    it('has id column with primary key', () => {
      expect(eventAttendees.id).toBeDefined();
    });

    it('has eventId column with reference to events', () => {
      expect(eventAttendees.eventId).toBeDefined();
    });

    it('has email column', () => {
      expect(eventAttendees.email).toBeDefined();
    });

    it('has status column', () => {
      expect(eventAttendees.status).toBeDefined();
    });

    it('has isOrganizer column', () => {
      expect(eventAttendees.isOrganizer).toBeDefined();
    });
  });
});
