import { describe, it, expect } from 'vitest';

import { useTaskDetails } from './useTaskDetails';

describe('useTaskDetails', () => {
  it('exports useTaskDetails hook', () => {
    expect(useTaskDetails).toBeDefined();
    expect(typeof useTaskDetails).toBe('function');
  });
});
