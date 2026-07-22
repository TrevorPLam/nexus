import { describe, it, expect } from 'vitest';

import { useEventDetails } from './useEventDetails';

describe('useEventDetails', () => {
  it('exports useEventDetails hook', () => {
    expect(useEventDetails).toBeDefined();
    expect(typeof useEventDetails).toBe('function');
  });

  it.todo('fetches event attendees when event selected');
  it.todo('creates event attendee and invalidates query');
  it.todo('deletes event attendee and invalidates query');
  it.todo('fetches scheduling links for workspace');
  it.todo('creates scheduling link and invalidates query');
  it.todo('updates scheduling link and invalidates query');
  it.todo('deletes scheduling link and invalidates query');
});
