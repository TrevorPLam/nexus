import { describe, it, expect, vi } from 'vitest';

import {
  expandRecurringEvent,
  validateRRULE,
  generateRRULE,
  convertToTimezone,
  convertFromTimezone,
  getStartOfDay,
  getEndOfDay,
  rangesOverlap,
} from './recurrence.js';

describe('recurrence - RRULE operations', () => {
  describe('expandRecurringEvent', () => {
    it('expands a weekly recurring event', () => {
      const startDate = new Date('2026-01-05T10:00:00Z'); // Monday
      const recurrenceRule = 'FREQ=WEEKLY;BYDAY=MO,WE,FR';
      const rangeStart = new Date('2026-01-05T00:00:00Z');
      const rangeEnd = new Date('2026-01-16T23:59:59Z');

      const occurrences = expandRecurringEvent(
        startDate,
        recurrenceRule,
        rangeStart,
        rangeEnd,
        'UTC',
      );

      expect(occurrences.length).toBeGreaterThan(0);
      expect(occurrences[0]).toEqual(startDate);
    });

    it('returns empty array when range is before start date', () => {
      const startDate = new Date('2026-01-05T10:00:00Z');
      const recurrenceRule = 'FREQ=WEEKLY;BYDAY=MO';
      const rangeStart = new Date('2025-01-01T00:00:00Z');
      const rangeEnd = new Date('2025-12-31T23:59:59Z');

      const occurrences = expandRecurringEvent(
        startDate,
        recurrenceRule,
        rangeStart,
        rangeEnd,
        'UTC',
      );

      expect(occurrences).toEqual([]);
    });

    it('handles invalid RRULE gracefully', () => {
      const startDate = new Date('2026-01-05T10:00:00Z');
      const recurrenceRule = 'INVALID_RRULE';
      const rangeStart = new Date('2026-01-01T00:00:00Z');
      const rangeEnd = new Date('2026-01-31T23:59:59Z');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const occurrences = expandRecurringEvent(
        startDate,
        recurrenceRule,
        rangeStart,
        rangeEnd,
        'UTC',
      );

      expect(consoleSpy).toHaveBeenCalled();
      expect(occurrences).toEqual([startDate]);

      consoleSpy.mockRestore();
    });

    it('respects timezone parameter', () => {
      const startDate = new Date('2026-01-05T10:00:00Z');
      const recurrenceRule = 'FREQ=DAILY';
      const rangeStart = new Date('2026-01-05T00:00:00Z');
      const rangeEnd = new Date('2026-01-06T23:59:59Z');

      const occurrences = expandRecurringEvent(
        startDate,
        recurrenceRule,
        rangeStart,
        rangeEnd,
        'America/New_York',
      );

      expect(occurrences.length).toBeGreaterThan(0);
    });
  });

  describe('validateRRULE', () => {
    it('validates a correct RRULE', () => {
      const validRRULE = 'FREQ=WEEKLY;BYDAY=MO,WE,FR';
      expect(validateRRULE(validRRULE)).toBe(true);
    });

    it('rejects an invalid RRULE', () => {
      const invalidRRULE = 'INVALID_RRULE';
      expect(validateRRULE(invalidRRULE)).toBe(false);
    });

    it('validates daily RRULE', () => {
      expect(validateRRULE('FREQ=DAILY')).toBe(true);
    });

    it('validates monthly RRULE', () => {
      expect(validateRRULE('FREQ=MONTHLY')).toBe(true);
    });

    it('validates yearly RRULE', () => {
      expect(validateRRULE('FREQ=YEARLY')).toBe(true);
    });
  });

  describe('generateRRULE', () => {
    it('generates a simple daily RRULE', () => {
      const rrule = generateRRULE({ frequency: 'DAILY' });
      expect(rrule).toBe('FREQ=DAILY');
    });

    it('generates a weekly RRULE with interval', () => {
      const rrule = generateRRULE({ frequency: 'WEEKLY', interval: 2 });
      expect(rrule).toBe('FREQ=WEEKLY;INTERVAL=2');
    });

    it('generates a weekly RRULE with byDay', () => {
      const rrule = generateRRULE({
        frequency: 'WEEKLY',
        byDay: ['MO', 'WE', 'FR'],
      });
      expect(rrule).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR');
    });

    it('generates an RRULE with count', () => {
      const rrule = generateRRULE({ frequency: 'DAILY', count: 10 });
      expect(rrule).toBe('FREQ=DAILY;COUNT=10');
    });

    it('generates an RRULE with until date', () => {
      const until = new Date('2026-12-31T23:59:59Z');
      const rrule = generateRRULE({ frequency: 'DAILY', until });
      expect(rrule).toContain('FREQ=DAILY');
      expect(rrule).toContain('UNTIL=');
      expect(rrule).toContain('Z');
    });

    it('generates a complex RRULE with all parameters', () => {
      const until = new Date('2026-12-31T23:59:59Z');
      const rrule = generateRRULE({
        frequency: 'WEEKLY',
        interval: 2,
        byDay: ['MO', 'WE'],
        until,
      });
      expect(rrule).toContain('FREQ=WEEKLY');
      expect(rrule).toContain('INTERVAL=2');
      expect(rrule).toContain('BYDAY=MO,WE');
      expect(rrule).toContain('UNTIL=');
    });

    it('does not include interval when it is 1', () => {
      const rrule = generateRRULE({ frequency: 'DAILY', interval: 1 });
      expect(rrule).toBe('FREQ=DAILY');
    });
  });
});

describe('recurrence - Timezone operations', () => {
  describe('convertToTimezone', () => {
    it('converts UTC date to America/New_York', () => {
      const utcDate = new Date('2026-01-15T10:00:00Z');
      const nyDate = convertToTimezone(utcDate, 'America/New_York');
      expect(nyDate).toBeInstanceOf(Date);
    });

    it('converts UTC date to Europe/London', () => {
      const utcDate = new Date('2026-01-15T10:00:00Z');
      const londonDate = convertToTimezone(utcDate, 'Europe/London');
      expect(londonDate).toBeInstanceOf(Date);
    });

    it('throws error on invalid timezone', () => {
      const utcDate = new Date('2026-01-15T10:00:00Z');
      expect(() => convertToTimezone(utcDate, 'Invalid/Timezone')).toThrow(RangeError);
    });
  });

  describe('convertFromTimezone', () => {
    it('converts date from America/New_York to UTC', () => {
      const nyDate = new Date('2026-01-15T10:00:00Z');
      const utcDate = convertFromTimezone(nyDate, 'America/New_York');
      expect(utcDate).toBeInstanceOf(Date);
    });

    it('converts date from Europe/London to UTC', () => {
      const londonDate = new Date('2026-01-15T10:00:00Z');
      const utcDate = convertFromTimezone(londonDate, 'Europe/London');
      expect(utcDate).toBeInstanceOf(Date);
    });

    it('throws error on invalid timezone', () => {
      const date = new Date('2026-01-15T10:00:00Z');
      expect(() => convertFromTimezone(date, 'Invalid/Timezone')).toThrow(RangeError);
    });
  });

  describe('getStartOfDay', () => {
    it('returns a Date object with time components set', () => {
      const date = new Date('2026-01-15T14:30:00Z');
      const startOfDay = getStartOfDay(date, 'UTC');
      expect(startOfDay).toBeInstanceOf(Date);
      expect(startOfDay.getMinutes()).toBe(0);
      expect(startOfDay.getSeconds()).toBe(0);
      expect(startOfDay.getMilliseconds()).toBe(0);
    });

    it('returns start of day in America/New_York', () => {
      const date = new Date('2026-01-15T14:30:00Z');
      const startOfDay = getStartOfDay(date, 'America/New_York');
      expect(startOfDay).toBeInstanceOf(Date);
      expect(startOfDay.getMinutes()).toBe(0);
      expect(startOfDay.getSeconds()).toBe(0);
      expect(startOfDay.getMilliseconds()).toBe(0);
    });
  });

  describe('getEndOfDay', () => {
    it('returns a Date object with time components set', () => {
      const date = new Date('2026-01-15T14:30:00Z');
      const endOfDay = getEndOfDay(date, 'UTC');
      expect(endOfDay).toBeInstanceOf(Date);
      expect(endOfDay.getMinutes()).toBe(59);
      expect(endOfDay.getSeconds()).toBe(59);
      expect(endOfDay.getMilliseconds()).toBe(999);
    });

    it('returns end of day in America/New_York', () => {
      const date = new Date('2026-01-15T14:30:00Z');
      const endOfDay = getEndOfDay(date, 'America/New_York');
      expect(endOfDay).toBeInstanceOf(Date);
      expect(endOfDay.getMinutes()).toBe(59);
      expect(endOfDay.getSeconds()).toBe(59);
      expect(endOfDay.getMilliseconds()).toBe(999);
    });
  });

  describe('rangesOverlap', () => {
    it('detects overlapping ranges', () => {
      const start1 = new Date('2026-01-15T10:00:00Z');
      const end1 = new Date('2026-01-15T12:00:00Z');
      const start2 = new Date('2026-01-15T11:00:00Z');
      const end2 = new Date('2026-01-15T13:00:00Z');

      expect(rangesOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it('detects non-overlapping ranges', () => {
      const start1 = new Date('2026-01-15T10:00:00Z');
      const end1 = new Date('2026-01-15T12:00:00Z');
      const start2 = new Date('2026-01-15T13:00:00Z');
      const end2 = new Date('2026-01-15T14:00:00Z');

      expect(rangesOverlap(start1, end1, start2, end2)).toBe(false);
    });

    it('detects touching ranges as non-overlapping (strict inequality)', () => {
      const start1 = new Date('2026-01-15T10:00:00Z');
      const end1 = new Date('2026-01-15T12:00:00Z');
      const start2 = new Date('2026-01-15T12:00:00Z');
      const end2 = new Date('2026-01-15T14:00:00Z');

      expect(rangesOverlap(start1, end1, start2, end2)).toBe(false);
    });

    it('handles UTC timezone (no conversion)', () => {
      const start1 = new Date('2026-01-15T10:00:00Z');
      const end1 = new Date('2026-01-15T12:00:00Z');
      const start2 = new Date('2026-01-15T11:00:00Z');
      const end2 = new Date('2026-01-15T13:00:00Z');

      expect(rangesOverlap(start1, end1, start2, end2, 'UTC')).toBe(true);
    });

    it('handles timezone conversion', () => {
      const start1 = new Date('2026-01-15T10:00:00Z');
      const end1 = new Date('2026-01-15T12:00:00Z');
      const start2 = new Date('2026-01-15T11:00:00Z');
      const end2 = new Date('2026-01-15T13:00:00Z');

      expect(rangesOverlap(start1, end1, start2, end2, 'America/New_York')).toBe(true);
    });

    it('detects one range containing another', () => {
      const start1 = new Date('2026-01-15T09:00:00Z');
      const end1 = new Date('2026-01-15T15:00:00Z');
      const start2 = new Date('2026-01-15T10:00:00Z');
      const end2 = new Date('2026-01-15T12:00:00Z');

      expect(rangesOverlap(start1, end1, start2, end2)).toBe(true);
    });
  });
});
