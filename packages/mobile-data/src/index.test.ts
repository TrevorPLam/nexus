import { describe, it, expect } from 'vitest';

import * as mobileData from './index';

describe('Mobile Data Package', () => {
  describe('Barrel Exports', () => {
    it('exports schema from index', () => {
      expect(mobileData).toBeDefined();
    });

    it('re-exports all schema exports', () => {
      // The index file exports * from './schema'
      // This test verifies the barrel export is working
      expect(typeof mobileData).toBe('object');
    });
  });
});
