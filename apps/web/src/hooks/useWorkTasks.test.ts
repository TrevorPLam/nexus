import { describe, it, expect } from 'vitest';

import { useWorkTasks } from './useWorkTasks';

describe('useWorkTasks', () => {
  it('exports useWorkTasks hook', () => {
    expect(useWorkTasks).toBeDefined();
    expect(typeof useWorkTasks).toBe('function');
  });

  it.todo('fetches tasks for workspace with filters');
  it.todo('creates task and invalidates query');
  it.todo('updates task and invalidates query');
  it.todo('deletes task and invalidates query');
});
