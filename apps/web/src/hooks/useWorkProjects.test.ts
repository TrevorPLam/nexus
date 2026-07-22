import { describe, it, expect } from 'vitest';

import { useWorkProjects } from './useWorkProjects';

describe('useWorkProjects', () => {
  it('exports useWorkProjects hook', () => {
    expect(useWorkProjects).toBeDefined();
    expect(typeof useWorkProjects).toBe('function');
  });

  it.todo('fetches projects for workspace');
  it.todo('creates project and invalidates query');
  it.todo('updates project and invalidates query');
  it.todo('deletes project and invalidates queries');
});
