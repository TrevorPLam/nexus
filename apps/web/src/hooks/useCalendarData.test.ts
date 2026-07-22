import { describe, it, expect } from 'vitest';

import { useCalendarData } from './useCalendarData';

describe('useCalendarData', () => {
  it('exports useCalendarData hook', () => {
    expect(useCalendarData).toBeDefined();
    expect(typeof useCalendarData).toBe('function');
  });

  it.todo('fetches calendars for workspace');
  it.todo('fetches events for workspace');
  it.todo('creates calendar and invalidates query');
  it.todo('updates calendar and invalidates query');
  it.todo('deletes calendar and invalidates queries');
  it.todo('creates event and invalidates query');
  it.todo('updates event and invalidates query');
  it.todo('deletes event and invalidates query');
});
